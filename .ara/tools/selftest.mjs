#!/usr/bin/env node
/**
 * Selbsttest: prüft, ob das Kit auf diesem Rechner funktioniert.
 *
 * Läuft ohne Kundendaten, ohne Netzzugang zum Portal und ohne Gerät. Nützlich nach
 * einem Update, bei merkwürdigem Verhalten und in der Entwicklung des Kits.
 *
 *   node .ara/tools/selftest.mjs
 */

import { createServer } from "node:http";
import { spawn, spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { judge, parseProbe, services } from "./lib/device.mjs";
import { KIT_CONTRACT_VERSION, checkManifest, checkVersion, findEndpoint } from "./lib/contract.mjs";
import { installerEntry, mirrorState, scrub, ship } from "./lib/install.mjs";
import { ROOT, readFrontmatter, writeFrontmatter } from "./lib/kit.mjs";

const results = [];
let failures = 0;

function report(name, ok, hint) {
  // Sofort ausgeben, damit man bei einem hängenden Lauf sieht, wo es klemmt.
  console.log(`${ok ? "ok  " : "FEHL"} ${name}${hint ? `: ${hint}` : ""}`);
  results.push({ name, ok, hint });
  if (!ok) failures++;
}

function check(name, fn) {
  try {
    const hint = fn();
    report(name, true, typeof hint === "string" ? hint : "");
  } catch (error) {
    report(name, false, error.message);
  }
}

async function checkAsync(name, fn) {
  try {
    const hint = await fn();
    report(name, true, typeof hint === "string" ? hint : "");
  } catch (error) {
    report(name, false, error.message);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function tool(file, args, input) {
  return spawnSync("node", [join(ROOT, ".ara", "tools", file), ...args], {
    encoding: "utf8",
    input,
  });
}

/**
 * Wie tool(), aber ohne die Ereignisschleife zu blockieren. Nötig überall dort,
 * wo im selben Prozess ein Testserver antworten muss: sonst wartet das Kind auf
 * eine Antwort, die der Elternprozess nicht geben kann.
 */
function toolAsync(file, args, env = {}) {
  return new Promise((done) => {
    const child = spawn("node", [join(ROOT, ".ara", "tools", file), ...args], {
      env: { ...process.env, ...env },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (status) => done({ status, stdout, stderr }));
  });
}

// --- Riegel -----------------------------------------------------------------

check("Riegel blockiert zerstörerische Befehle", () => {
  const bad = [
    "rm -rf /",
    "sudo rm -rf ~",
    "mkfs.ext4 /dev/sdb1",
    "dd if=x.iso of=/dev/disk0 bs=4m",
    "diskutil eraseDisk JHFS+ S disk0",
    "cat .env",
    "cat ~/.ssh/id_ed25519",
    "curl https://arasul.de/api/download?token=geheim12345",
  ];
  for (const command of bad) {
    const run = tool("guard.mjs", [], JSON.stringify({ tool_input: { command } }));
    assert(run.status === 2, `nicht blockiert: ${command}`);
  }
  return `${bad.length} Fälle`;
});

check("Riegel lässt normale Arbeit durch", () => {
  const good = [
    "git status",
    "rm -rf .ara/mirror",
    "dd if=ubuntu.iso of=/dev/disk4 bs=4m",
    "git push --force-with-lease origin main",
    "cat .env.example",
    "ssh-keygen -l -f ~/.ssh/id_ed25519.pub",
    "ssh arasul@10.0.0.5 -p 2222 uptime",
    "node .ara/tools/mirror.mjs",
    "node .ara/tools/secrets.mjs --show",
  ];
  for (const command of good) {
    const run = tool("guard.mjs", [], JSON.stringify({ tool_input: { command } }));
    assert(run.status === 0, `fälschlich blockiert: ${command}`);
  }
  return `${good.length} Fälle`;
});

check("Riegel überlebt unbrauchbare Eingaben", () => {
  for (const input of ["", "kein json", "{}", '{"tool_input":{}}']) {
    const run = tool("guard.mjs", [], input);
    assert(run.status === 0, `Riegel bricht bei Eingabe "${input}" ab`);
  }
});

// --- Frontmatter ------------------------------------------------------------

check("Frontmatter lesen und schreiben", () => {
  const dir = mkdtempSync(join(tmpdir(), "ara-test-"));
  const file = join(dir, "probe.md");
  writeFileSync(file, "---\nname: alt\nphase: 0\n---\n\n## Rumpf\n\nText bleibt.\n");
  try {
    writeFrontmatter(file, { phase: 4, state: "running" });
    const { fields, body } = readFrontmatter(file);

    assert(fields.name === "alt", "vorhandenes Feld verloren");
    assert(fields.phase === "4", "Feld nicht aktualisiert");
    assert(fields.state === "running", "neues Feld nicht ergänzt");
    assert(body.includes("Text bleibt."), "Rumpf beschädigt");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

check("Leere Vorlagenfelder liefern keine Kommentartexte", () => {
  // Die Vorlagen erklären ihre Felder mit Kommentaren. Ein leeres Feld muss leer
  // bleiben, sonst landet der Erklärtext als Adresse oder Schlüsselname im Einsatz.
  const templates = join(ROOT, ".ara", "templates");
  for (const name of readdirSync(templates)) {
    const { fields } = readFrontmatter(join(templates, name));
    for (const [key, value] of Object.entries(fields)) {
      assert(!value.startsWith("#"), `${name}: Feld ${key} liest den Kommentar als Wert`);
      assert(!/^\S+\s+#/.test(value), `${name}: Feld ${key} enthält einen Kommentarrest`);
    }
  }
  return `${readdirSync(templates).length} Vorlagen`;
});

// --- Laufzettel -------------------------------------------------------------

check("Laufzettel anlegen, fortschreiben, lesen", () => {
  const customer = "_selftest";
  const dir = join(ROOT, "customers", customer);
  rmSync(dir, { recursive: true, force: true });
  try {
    let run = tool("runsheet.mjs", ["--create", "--customer", customer, "--device", "probe"]);
    assert(run.status === 0, `Anlegen fehlgeschlagen: ${run.stderr || run.stdout}`);

    run = tool("runsheet.mjs", [
      "--customer", customer,
      "--phase", "3",
      "--state", "done",
      "--entry", "Installation gelaufen. Nachweis: Dienste gesund.",
    ]);
    assert(run.status === 0, `Eintrag fehlgeschlagen: ${run.stderr || run.stdout}`);

    run = tool("runsheet.mjs", ["--customer", customer, "--show"]);
    assert(run.status === 0, "Anzeige fehlgeschlagen");
    assert(/Phase 3 von 6/.test(run.stdout), "Anzeige zeigt die falsche Phase");
    assert(/fertig/.test(run.stdout), "Zustand fehlt in der Ausgabe");

    const content = readFileSync(join(dir, "devices", "probe", "runsheet.md"), "utf8");
    assert(/### Phase 3/.test(content), "Eintrag steht nicht im Protokoll");
    assert(/Arasul installieren/.test(content), "Phasenname fehlt");

    // Zweiter Eintrag darf den ersten nicht verdrängen.
    tool("runsheet.mjs", ["--customer", customer, "--phase", "4", "--entry", "Zweiter Schritt."]);
    const after = readFileSync(join(dir, "devices", "probe", "runsheet.md"), "utf8");
    assert(/Installation gelaufen/.test(after), "früherer Eintrag überschrieben");
    assert(/Zweiter Schritt/.test(after), "neuer Eintrag fehlt");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

check("Werkzeuge verweigern fremde und mehrdeutige Ziele", () => {
  let run = tool("runsheet.mjs", ["--customer", "gibt-es-nicht", "--show"]);
  assert(run.status !== 0, "unbekannter Kunde wurde akzeptiert");
  assert(/gibt es nicht/.test(run.stderr), "keine verständliche Meldung");

  run = tool("remote.mjs", ["--customer", "gibt-es-nicht", "--check"]);
  assert(run.status !== 0, "Fernzugriff auf unbekannten Kunden wurde akzeptiert");

  run = tool("remote.mjs", ["--device", "gibt-es-nicht", "--check"]);
  assert(run.status !== 0, "Fernzugriff auf unbekanntes Gerät ohne Kunden wurde akzeptiert");
  assert(/devices\//.test(run.stderr), "die Meldung nennt nicht, wo gesucht wurde");
});

check("Laufzettel für ein Gerät ohne Kunden liegt unter devices/", () => {
  const device = "_selftest-probe";
  const dir = join(ROOT, "devices", device);
  rmSync(dir, { recursive: true, force: true });
  try {
    let run = tool("runsheet.mjs", ["--create", "--device", device]);
    assert(run.status === 0, `Anlegen fehlgeschlagen: ${run.stderr || run.stdout}`);
    assert(existsSync(join(dir, "runsheet.md")), "Laufzettel liegt nicht unter devices/");
    run = tool("runsheet.mjs", ["--device", device, "--phase", "2", "--entry", "SSH steht. Nachweis: echo bereit."]);
    assert(run.status === 0, `Eintrag fehlgeschlagen: ${run.stderr}`);
    run = tool("runsheet.mjs", ["--device", device, "--show"]);
    assert(/Phase 2 von 6/.test(run.stdout), "Anzeige zeigt die falsche Phase");
    assert(!/undefined|null/.test(run.stdout), "ohne Kunden steht Unsinn in der Kopfzeile");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- Gerät -------------------------------------------------------------------

check("Urteil über ein Gerät folgt der Unterstützungsregel", () => {
  // Orin und Thor tragen Arasul, DGX Spark und andere NVIDIA-Rechner sind
  // angekündigt, ein Mac wird vorgemerkt. Die Befunde sind erfunden, aber so
  // geschnitten, wie das Prüfskript sie liefert.
  const cases = [
    ["@uname=Linux 5.15 aarch64\n@dt_model=NVIDIA Jetson AGX Orin Developer Kit\n@tegra=# R36", "supported"],
    ["@uname=Linux 6.8 aarch64\n@dt_model=NVIDIA Jetson AGX Thor Developer Kit", "supported"],
    ["@uname=Linux 6.11 aarch64\n@dmi_model=NVIDIA DGX Spark\n@gpu=NVIDIA GB10", "soon"],
    ["@uname=Linux 6.8 x86_64\n@dmi_model=ThinkStation P3\n@gpu=NVIDIA RTX 6000 Ada Generation", "soon"],
    ["@uname=Darwin 24.6.0 arm64\n@macos=15.6.1\n@hw_model=Mac14,2\n@mem_bytes=17179869184", "unsupported"],
    ["@uname=Linux 6.8 x86_64\n@os_release=Debian GNU/Linux 12\n@dmi_model=OptiPlex 7010", "unsupported"],
  ];
  for (const [probe, expected] of cases) {
    const found = judge(parseProbe(probe));
    assert(found.verdict === expected, `${probe.split("\n")[1]}: ${found.verdict} statt ${expected}`);
    assert(found.verdictText, "Urteil ohne Satz");
  }
  const mac = judge(parseProbe(cases[4][0]));
  assert(mac.os === "macOS 15.6.1" && mac.arch === "arm64" && mac.memoryGb === 16, "Mac-Befund falsch gelesen");
  assert(/orin/i.test(judge(parseProbe(cases[0][0])).hardware), "Hardware nicht aus dem Gerätebaum übernommen");
  return `${cases.length} Befunde`;
});

check("Docker, Ollama und Arasul werden aus dem Befund erkannt", () => {
  const facts = parseProbe(
    "@docker_bin=/usr/bin/docker\n@docker_server=27.1.1\n@docker_names=dashboard-backend arasul-flows-sandbox n8n\n" +
      "@ollama_bin=/usr/local/bin/ollama\n@ollama_version=ollama version is 0.5.1\n@arasul_dir=/opt/arasul\n@arasul_dir=/home/x/arasul\n@sudo=ohne Passwort"
  );
  const svc = services(facts);
  assert(svc.docker.state === "running" && /27\.1\.1/.test(svc.docker.text), "laufendes Docker nicht erkannt");
  assert(svc.ollama.state === "present", "Ollama nicht erkannt");
  assert(svc.arasul.state === "found" && /arasul-flows-sandbox/.test(svc.arasul.text), "Arasul-Container nicht als Hinweis");
  assert(/\/opt\/arasul.*\/home\/x\/arasul/.test(svc.arasul.text), "mehrere Ordner nicht gesammelt");
  assert(svc.sudo === true, "sudo ohne Passwort nicht erkannt");

  const bare = services(parseProbe("@docker_bin=/usr/local/bin/docker\n@user=probe"));
  assert(bare.docker.state === "present", "Docker ohne Dienst gilt nicht als vorhanden");
  assert(bare.ollama.state === "missing" && bare.arasul.state === "none", "leerer Befund liefert Funde");
});

check("device.mjs legt die Akte an, urteilt und merkt sich das Gerät", () => {
  // Zwei Ziele: eines, das nicht antwortet (Akte trotzdem, ssh: refused), und
  // dieser Rechner selbst mit abgelehntem SSH-Port, dann prüft das Werkzeug lokal.
  // Der Merker des Nutzers wird vorher gesichert und danach zurückgelegt.
  const stateFile = join(ROOT, ".ara", "state.json");
  const savedState = existsSync(stateFile) ? readFileSync(stateFile, "utf8") : null;
  const names = ["selftest-stumm", "selftest-lokal"];
  for (const n of names) rmSync(join(ROOT, "devices", n), { recursive: true, force: true });
  try {
    let run = tool("device.mjs", ["--host", "127.0.0.2", "--port", "1", "--user", "probe", "--name", names[0], "--json"]);
    assert(run.status !== 0, "ohne Verbindung endet das Werkzeug mit Erfolg");
    let out = JSON.parse(run.stdout);
    assert(out.transport === "none" && out.fresh === true, "stummes Ziel nicht als solches gemeldet");
    let { fields } = readFrontmatter(join(ROOT, "devices", names[0], "device.md"));
    assert(fields.ssh === "refused" && fields.address === "127.0.0.2", "Akte ohne Verbindung fehlt oder ist unvollständig");
    assert(!fields.verdict, "ohne Befund steht ein Urteil in der Akte");
    assert(out.next.some((s) => /find-device/.test(s)), "der nächste Schritt nennt nicht den Weg zum Zugang");

    run = tool("device.mjs", ["--host", "localhost", "--port", "1", "--name", names[1], "--json"]);
    assert(run.status === 0, `lokale Prüfung fehlgeschlagen: ${run.stderr || run.stdout}`);
    out = JSON.parse(run.stdout);
    assert(out.transport === "local", "lokaler Umweg bei abgelehntem SSH auf localhost fehlt");
    assert(["supported", "soon", "unsupported"].includes(out.verdict), `unbekanntes Urteil ${out.verdict}`);
    assert(out.os && out.os !== "unbekannt", "Betriebssystem nicht erkannt");
    ({ fields } = readFrontmatter(join(ROOT, "devices", names[1], "device.md")));
    assert(fields.ssh === "local" && fields.verdict === out.verdict, "Akte trägt den Befund nicht");
    assert(fields.verdict === "supported" || /^\d{4}-\d{2}-\d{2}$/.test(fields.noted_on), "nicht unterstütztes Gerät wurde nicht vorgemerkt");
    const body = readFileSync(join(ROOT, "devices", names[1], "device.md"), "utf8");
    assert(/## Prüfungen[\s\S]*### .*lokal/.test(body), "Prüfung nicht ins Protokoll geschrieben");
    assert(JSON.parse(readFileSync(stateFile, "utf8")).device === names[1], "Merker nicht gesetzt");
    assert(!/^customer: $/m.test(body), "leeres Feld hinterlässt ein Leerzeichen am Zeilenende");

    // Zweiter Lauf ohne --host: Adresse und Port kommen aus der Akte.
    run = tool("device.mjs", ["--name", names[1], "--json"]);
    out = JSON.parse(run.stdout);
    assert(run.status === 0 && out.fresh === false && out.port === "1", "zweiter Lauf liest die Akte nicht");

    // Ohne --name und mit zwei Akten entscheidet der Merker.
    run = tool("device.mjs", ["--json"]);
    assert(JSON.parse(run.stdout).name === names[1], "ohne Argument greift der Merker nicht");

    run = tool("device.mjs", ["--name", "Falscher Name", "--host", "localhost"]);
    assert(run.status !== 0, "ein unbrauchbarer Gerätename wurde akzeptiert");
    run = tool("device.mjs", ["--name", names[1], "--install", "irgendwas"]);
    assert(run.status !== 0, "--install mit Unbekanntem wurde akzeptiert");
    return `lokal: ${out.verdictText}`;
  } finally {
    for (const n of names) rmSync(join(ROOT, "devices", n), { recursive: true, force: true });
    if (savedState === null) rmSync(stateFile, { force: true });
    else writeFileSync(stateFile, savedState);
  }
});

// --- Agenda -----------------------------------------------------------------

check("Agenda erkennt Termine und Lücken", () => {
  const customer = "_selftest";
  const dir = join(ROOT, "customers", customer);
  rmSync(dir, { recursive: true, force: true });
  try {
    const deviceDir = join(dir, "devices", "probe");
    spawnSync("mkdir", ["-p", deviceDir]);

    const past = new Date(Date.now() - 5 * 86_400_000).toISOString().slice(0, 10);
    writeFileSync(
      join(dir, "customer.md"),
      `---\nid: ${customer}\nlegal_name: Probe GmbH\nstatus: lead\nfollow_up: ${past}\nfollow_up_note: nachfassen\n---\n\nProbe.\n`
    );
    writeFileSync(
      join(deviceDir, "device.md"),
      `---\nname: probe\ncustomer: ${customer}\nstatus: live\n---\n\nProbe.\n`
    );

    // Ein Gerät ohne Kunden mit auslaufender Wartung.
    const ownDir = join(ROOT, "devices", "_selftest-own");
    rmSync(ownDir, { recursive: true, force: true });
    spawnSync("mkdir", ["-p", ownDir]);
    const soon = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    writeFileSync(join(ownDir, "device.md"), `---\nname: _selftest-own\nstatus: live\nmaintenance_until: ${soon}\n---\n`);

    const run = tool("agenda.mjs", []);
    assert(run.status === 0, `Agenda fehlgeschlagen: ${run.stderr}`);
    assert(/Überfällig/.test(run.stdout), "überfällige Wiedervorlage nicht erkannt");
    assert(/nachfassen/.test(run.stdout), "Notiz zur Wiedervorlage fehlt");
    assert(/keine Wartungslaufzeit/.test(run.stdout), "fehlende Wartungslaufzeit nicht bemerkt");
    assert(/Wartung _selftest-own läuft in 10 Tagen/.test(run.stdout), "Gerät ohne Kunden fehlt in der Agenda");

    const json = tool("agenda.mjs", ["--json"]);
    const items = JSON.parse(json.stdout);
    assert(Array.isArray(items) && items.length >= 3, "JSON-Ausgabe unvollständig");
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(join(ROOT, "devices", "_selftest-own"), { recursive: true, force: true });
  }
});

// --- Kalkulation ------------------------------------------------------------

check("Kalkulationsblatt meldet jede fehlende Zahl mit ihrer Folge", () => {
  // Der Zweck des Werkzeugs ist die Meldung, nicht die Liste: "ohne Stundensatz
  // keine Kalkulation" ist brauchbar, "einiges fehlt" nicht. Geprüft wird deshalb
  // beides, die Zählung und dass jede Zahl ihre Folge nennt.
  const dir = mkdtempSync(join(tmpdir(), "ara-kalk-"));
  const file = join(dir, "company.md");
  const day = (offset) =>
    new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

  try {
    // Das leere Blatt, so wie es aus der Vorlage entsteht.
    writeFileSync(file, readFileSync(join(ROOT, ".ara", "templates", "company.md"), "utf8"));

    let run = tool("calculation.mjs", ["--file", file]);
    assert(run.status !== 0, "ein leeres Blatt gilt als ausreichend für ein Angebot");
    assert(/keine Kalkulation/.test(run.stdout), "die Folge des fehlenden Stundensatzes fehlt");
    assert(/Nachtragen mit \/kalkulation/.test(run.stdout), "der Weg zum Nachtragen fehlt");

    const empty = JSON.parse(tool("calculation.mjs", ["--file", file, "--json"]).stdout);
    assert(empty.numbers.length === 10, `${empty.numbers.length} Zahlen statt zehn`);
    assert(empty.missing.length === 10, `${empty.missing.length} von zehn als fehlend erkannt`);
    assert(empty.can_quote === false, "ohne jede Zahl hält sich das Blatt für angebotsreif");
    for (const number of empty.numbers) {
      assert(number.without, `${number.key} nennt keine Folge, "einiges fehlt" reicht nicht`);
    }

    // Das gefüllte Blatt. Ein Einkaufspreis ist absichtlich über ein Jahr alt.
    writeFileSync(
      file,
      [
        "---",
        "hourly_rate: 95",
        "hardware_markup: 12",
        "payment_terms: 14",
        "setup_hours: 12",
        "care_yearly: 1200",
        "travel: 90",
        "minimum_fee: 450",
        `rates_asof: ${day(0)}`,
        "---",
        "",
        "## Einkaufspreise",
        "",
        "| Position | Einkauf netto | Stand |",
        "|---|---|---|",
        `| Lizenz, einmalig | 1400 | ${day(0)} |`,
        `| Wartung, jährlich | 480 | ${day(-400)} |`,
        `| Hardware, Jetson Thor | 3900 | ${day(0)} |`,
        "",
      ].join("\n")
    );

    run = tool("calculation.mjs", ["--file", file]);
    assert(run.status === 0, `gefülltes Blatt wird abgelehnt: ${run.stdout}`);

    const full = JSON.parse(tool("calculation.mjs", ["--file", file, "--json"]).stdout);
    assert(full.complete, `es fehlt noch: ${full.missing.join(", ")}`);
    assert(
      full.stale.includes("maintenance"),
      "ein über ein Jahr alter Einkaufspreis wird nicht als veraltet gemeldet"
    );
    assert(!full.stale.includes("license"), "ein frischer Einkaufspreis gilt als veraltet");
    assert(full.undated.length === 0, `ohne Not als undatiert gemeldet: ${full.undated.join(", ")}`);
    return "leeres und gefülltes Blatt";
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- Datenträger ------------------------------------------------------------

check("Datenträger-Werkzeug schützt interne Datenträger", () => {
  const run = tool("disk.mjs", ["--write", join(ROOT, "README.md"), "--to", "disk0"]);
  assert(run.status !== 0, "Systemdatenträger wurde als Ziel akzeptiert");
});

check("Datenträger-Werkzeug listet ohne Fehler", () => {
  const run = tool("disk.mjs", ["--list"]);
  assert(run.status === 0, `Auflisten fehlgeschlagen: ${run.stderr}`);
});

// --- Geheimnisse ------------------------------------------------------------

check("Geheimnis-Werkzeug meldet Ablage und Stand", () => {
  const run = tool("secrets.mjs", ["--show"]);
  assert(run.status === 0, `Anzeige fehlgeschlagen: ${run.stderr}`);
  assert(/Ablage:/.test(run.stdout), "Ablage wird nicht genannt");
  assert(/ARASUL_TOKEN/.test(run.stdout), "bekannte Geheimnisse fehlen");
  // Kein Wert darf je in der Ausgabe stehen.
  assert(!/=[A-Za-z0-9_\-]{8,}/.test(run.stdout), "Ausgabe enthält etwas, das wie ein Wert aussieht");
});

check("Geheimnis-Werkzeug lehnt unsinnige Ablagen ab", () => {
  const run = tool("secrets.mjs", ["--store", "irgendwas"]);
  assert(run.status !== 0, "unbekannte Ablage wurde akzeptiert");
});

// --- Spiegel ----------------------------------------------------------------

await checkAsync("Spiegel holt und packt aus", async () => {
  const work = mkdtempSync(join(tmpdir(), "ara-mirror-"));
  const source = join(work, "koljaschoepe-arasul-jet-abc1234");
  const targetMirror = join(work, "ziel");

  // Ein Tarball, wie ihn GitHub liefert: genau ein Wurzelordner.
  spawnSync("mkdir", ["-p", join(source, "config", "platforms")]);
  writeFileSync(join(source, "VERSION"), "1.0.0\n");
  writeFileSync(
    join(source, "config", "platforms", "probe.json"),
    JSON.stringify({ id: "probe", default_model: "modell-aus-dem-produkt" }, null, 2)
  );
  const tar = spawnSync("tar", [
    "-czf", join(work, "paket.tar.gz"),
    "-C", work, "koljaschoepe-arasul-jet-abc1234",
  ]);
  assert(tar.status === 0, "Testpaket ließ sich nicht bauen");

  const packet = readFileSync(join(work, "paket.tar.gz"));
  const server = createServer((request, response) => {
    if (!request.url.includes("token=")) {
      response.writeHead(400, { "Content-Type": "text/plain" });
      response.end("Fehlt: token\n");
      return;
    }
    if (request.url.includes("token=abgelaufen")) {
      response.writeHead(403, { "Content-Type": "text/plain" });
      response.end("Dein Wartungs-Abo ist beendet.\n");
      return;
    }
    response.writeHead(200, { "Content-Type": "application/gzip" });
    response.end(packet);
  });

  await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    const env = { ARASUL_BASIS: base, ARA_MIRROR: targetMirror };

    let run = await toolAsync("mirror.mjs", ["--refresh"], { ...env, ARASUL_TOKEN: "gueltig" });
    assert(run.status === 0, `Holen fehlgeschlagen: ${run.stdout}${run.stderr}`);
    assert(existsSync(join(targetMirror, "VERSION")), "Wurzelordner nicht abgeschnitten");
    assert(
      existsSync(join(targetMirror, "config", "platforms", "probe.json")),
      "Plattformprofile fehlen im Spiegel"
    );
    const state = JSON.parse(readFileSync(join(targetMirror, "STATE.json"), "utf8"));
    assert(state.version === "1.0.0", "Produktversion nicht übernommen");

    // Ein zweiter Lauf ohne --refresh darf nichts holen.
    run = await toolAsync("mirror.mjs", [], { ...env, ARASUL_TOKEN: "gueltig" });
    assert(/aktuell/.test(run.stdout), "frischer Spiegel wird unnötig neu geholt");

    // Die Begründung des Portals muss durchgereicht werden.
    run = await toolAsync("mirror.mjs", ["--refresh"], { ...env, ARASUL_TOKEN: "abgelaufen" });
    assert(run.status !== 0, "abgelehnter Token führt nicht zum Fehler");
    assert(/Wartungs-Abo/.test(run.stdout), "Begründung des Portals fehlt in der Meldung");
  } finally {
    server.close();
    rmSync(work, { recursive: true, force: true });
  }
});

// --- Kontrakt und Deploy -----------------------------------------------------

/**
 * Ein erfundener Kontrakt, kein abgeschriebener.
 *
 * Er hat die Form, die ein Gerät liefert, und trägt bewusst keine Produktwerte:
 * geprüft wird die Mechanik des Kits, nicht der Stand von Arasul. Was wirklich
 * gilt, sagt immer das Gerät.
 */
const KONTRAKT = {
  kontrakt: KIT_CONTRACT_VERSION,
  arasul: "0.0.0-selbsttest",
  app_json: {
    schema: {
      type: "object",
      properties: {
        schema: { type: "number", const: 1 },
        id: { type: "string", pattern: "^[a-z0-9][a-z0-9-]*$" },
        name: { type: "string", minLength: 1 },
        version: { type: "string", pattern: "^\\d+\\.\\d+\\.\\d+$" },
        ports: {
          type: "object",
          properties: { backend: { type: "integer", minimum: 1, maximum: 65535 } },
          required: ["backend"],
          additionalProperties: false,
        },
        modelle: { type: "array", maxItems: 2, items: { type: "string", minLength: 1 } },
      },
      required: ["schema", "id", "name", "version"],
      additionalProperties: false,
    },
    regeln: ["Mindestens eines von frontend und backend. Eine App ohne beides ist nichts."],
  },
  koepfe: { benutzer: "X-Arasul-User", rolle: "X-Arasul-Role", rollen: ["admin", "mitarbeiter"] },
  schluessel: { kopf: "X-API-Key", praefix: "aras_", bereiche: ["app:deploy"] },
  paket: { format: "tar.gz", packen: "tar czf paket.tgz -C <ordner> .", max_archiv_bytes: 200 * 1024 * 1024 },
  apps: { basis: "/apps/<id>/", teststand: "/apps/<id>/test/" },
  endpunkte: [
    { verb: "GET", pfad: "/api/v1/external/contract", bereich: null, was: "Dieser Kontrakt" },
    { verb: "POST", pfad: "/api/v1/external/apps", bereich: "app:deploy", was: "Ein Paket einspielen" },
    { verb: "GET", pfad: "/api/v1/external/apps/:id", bereich: "app:deploy", was: "Was das Gerät weiß" },
    { verb: "POST", pfad: "/api/v1/external/apps/:id/schalten", bereich: "app:deploy", was: "Live schalten" },
    { verb: "DELETE", pfad: "/api/v1/external/apps/:id?bestaetigung=<id>", bereich: "app:deploy", was: "App weg" },
  ],
};

const MANIFEST = { schema: 1, id: "probeapp", name: "Probe", version: "1.0.0", ports: { backend: 8080 } };

check("app.json wird gegen das Schema des Geräts geprüft", () => {
  const gut = checkManifest(KONTRAKT, MANIFEST);
  assert(gut.ok, `gültiges Manifest abgelehnt: ${gut.problems.join(" ")}`);
  assert(gut.rules.length === 1, "die Regeln ohne Schema werden nicht durchgereicht");
  assert(gut.unchecked.length === 0, `unnötig ungeprüft: ${gut.unchecked.join(", ")}`);

  const faelle = [
    [{ ...MANIFEST, version: "eins" }, /version.*Muster/],
    [{ ...MANIFEST, id: "Gross" }, /id.*Muster/],
    [{ ...MANIFEST, schema: 2 }, /schema.*muss 1 sein/],
    [{ ...MANIFEST, zusatz: "ja" }, /zusatz.*kennt das Gerät nicht/],
    [{ ...MANIFEST, ports: { backend: 99999 } }, /ports\.backend.*größer/],
    [{ ...MANIFEST, ports: {} }, /ports\.backend.*fehlt/],
    [{ ...MANIFEST, modelle: ["a", "b", "c"] }, /modelle.*mehr als 2/],
    [{ ...MANIFEST, name: "" }, /name.*zu kurz/],
    [{ schema: 1, id: "x" }, /name.*fehlt/],
  ];
  for (const [manifest, muster] of faelle) {
    const result = checkManifest(KONTRAKT, manifest);
    assert(!result.ok, `durchgelassen: ${JSON.stringify(manifest)}`);
    assert(
      result.problems.some((p) => muster.test(p)),
      `falsche Begründung für ${JSON.stringify(manifest)}: ${result.problems.join(" | ")}`
    );
  }

  // Was das Kit nicht prüfen kann, gibt es zu, statt es für gültig zu erklären.
  const fremd = checkManifest(
    { app_json: { schema: { type: "object", properties: { id: { type: "string", contentEncoding: "base64" } } } } },
    { id: "x" }
  );
  assert(fremd.unchecked.includes("contentEncoding"), "unbekannte Schemaangabe wird stillschweigend übergangen");
  return `${faelle.length} Abweichungen erkannt`;
});

check("Das Kit ruft nur, was das Gerät verspricht", () => {
  assert(findEndpoint(KONTRAKT, "POST", "/api/v1/external/apps"), "bekannter Endpunkt nicht gefunden");
  assert(findEndpoint(KONTRAKT, "GET", "/api/v1/external/apps/probeapp"), "Pfad mit Parameter nicht erkannt");
  assert(
    findEndpoint(KONTRAKT, "DELETE", "/api/v1/external/apps/probeapp?bestaetigung=probeapp"),
    "Pfad mit Rückfrage nicht erkannt"
  );
  assert(!findEndpoint(KONTRAKT, "POST", "/api/v1/external/apps/probeapp"), "unbekannter Endpunkt gilt als bekannt");
  assert(!findEndpoint(KONTRAKT, "PUT", "/api/v1/external/apps"), "falsches Verb gilt als bekannt");

  assert(checkVersion(KONTRAKT).ok, "gleiche Kontraktversion gilt nicht als passend");
  const neuer = checkVersion({ ...KONTRAKT, kontrakt: KIT_CONTRACT_VERSION + 1 });
  assert(!neuer.ok && /init/.test(neuer.text), "neueres Gerät führt nicht zum Hinweis auf das Kit-Update");
  const aelter = checkVersion({ ...KONTRAKT, kontrakt: KIT_CONTRACT_VERSION - 1 });
  assert(!aelter.ok && /Gerät braucht ein Update/.test(aelter.text), "älteres Gerät wird nicht benannt");
  assert(!checkVersion({}).ok, "ein Gerät ohne Kontraktversion gilt als passend");
});

check("Kein Schlüssel gerät in eine Ausgabe", () => {
  const text = scrub("  Schluessel  aras_abcdef1234567890\n  Praefix  aras_abcdef1");
  assert(!/aras_[A-Za-z0-9]/.test(text), `Schlüssel steht noch in der Ausgabe: ${text}`);
});

await checkAsync("app.mjs spielt ein Paket ein, schaltet live und wieder zurück", async () => {
  const stateFile = join(ROOT, ".ara", "state.json");
  const savedState = existsSync(stateFile) ? readFileSync(stateFile, "utf8") : null;
  const name = "selftest-arasul";
  const akte = join(ROOT, "devices", name);
  const work = mkdtempSync(join(tmpdir(), "ara-app-"));
  const quelle = join(work, "probeapp");

  mkdirSync(quelle, { recursive: true });
  writeFileSync(join(quelle, "app.json"), JSON.stringify(MANIFEST, null, 2));
  writeFileSync(join(quelle, "index.html"), "<p>Probe</p>\n");

  // Das Gerät, gespielt. Es prüft den Schlüssel in der Kopfzeile, nimmt genau ein
  // Multipart-Feld `paket` an und antwortet im Umschlag, den Arasul benutzt.
  const gesehen = { key: null, paket: false, geschaltet: [], entfernt: null };
  const server = createServer((request, response) => {
    const antwort = (status, body) => {
      response.writeHead(status, { "Content-Type": "application/json" });
      response.end(JSON.stringify(body));
    };
    gesehen.key = request.headers["x-api-key"] || null;
    if (gesehen.key !== "aras_selbsttest") {
      antwort(401, { error: { code: "UNAUTHORIZED", message: "Kein gueltiger Schluessel" } });
      return;
    }
    const [pfad, frage] = request.url.split("?");
    const teile = [];
    request.on("data", (chunk) => teile.push(chunk));
    request.on("end", () => {
      const rumpf = Buffer.concat(teile);
      if (pfad === "/api/v1/external/contract") return antwort(200, { data: KONTRAKT });
      if (pfad === "/api/v1/external/apps" && request.method === "POST") {
        gesehen.paket =
          /name="paket"/.test(rumpf.toString("latin1").slice(0, 400)) && rumpf.includes(Buffer.from([0x1f, 0x8b]));
        return antwort(201, { data: { app_id: "probeapp", version: "1.0.0", stand: "test" } });
      }
      if (pfad === "/api/v1/external/apps/probeapp/schalten") {
        const ziel = JSON.parse(rumpf.toString("utf8")).ziel;
        gesehen.geschaltet.push(ziel);
        return antwort(200, { data: { app_id: "probeapp", stand: "live", version: ziel === "live" ? "1.0.0" : "0.9.0" } });
      }
      if (pfad === "/api/v1/external/apps/probeapp" && request.method === "DELETE") {
        gesehen.entfernt = frage;
        return antwort(200, { data: { app_id: "probeapp", entfernt: true } });
      }
      antwort(404, { error: { code: "NOT_FOUND", message: "Endpoint not found" } });
    });
  });
  await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
  const base = `http://127.0.0.1:${server.address().port}`;
  const env = { ARASUL_KEY_SELFTEST: "aras_selbsttest" };

  mkdirSync(akte, { recursive: true });
  cpSync(join(ROOT, ".ara", "templates", "device.md"), join(akte, "device.md"));
  writeFrontmatter(join(akte, "device.md"), {
    name,
    address: base,
    verdict: "supported",
    arasul: "found",
    api_key_ref: "ARASUL_KEY_SELFTEST",
  });

  try {
    // Ohne hinterlegten Schlüssel geht nichts, und das Werkzeug sagt, wo er herkommt.
    let run = await toolAsync("app.mjs", ["--device", name, "--contract"], {});
    assert(run.status !== 0 && /deploy-key/.test(run.stderr), "fehlender Schlüssel wird nicht erklärt");

    run = await toolAsync("app.mjs", ["--device", name, "--contract"], env);
    assert(run.status === 0, `Kontrakt fehlgeschlagen: ${run.stderr}${run.stdout}`);
    assert(gesehen.key === "aras_selbsttest", "der Schlüssel kam nicht in der Kopfzeile an");
    assert(/Kontraktversion 1/.test(run.stdout), "die Kontraktversion fehlt in der Ausgabe");

    run = await toolAsync("app.mjs", ["--device", name, "--check", quelle], env);
    assert(run.status === 0, `Prüfung des Manifests fehlgeschlagen: ${run.stdout}${run.stderr}`);
    assert(/Regeln, die kein Schema trägt/.test(run.stdout), "die Regeln des Kontrakts fehlen in der Ausgabe");

    run = await toolAsync("app.mjs", ["--device", name, "--deploy", quelle], env);
    assert(run.status === 0, `Einspielen fehlgeschlagen: ${run.stdout}${run.stderr}`);
    assert(gesehen.paket, "am Gerät kam kein gepacktes Paket im Feld paket an");
    assert(/Teststand/.test(run.stdout), "der Teststand wird nicht genannt");

    run = await toolAsync("app.mjs", ["--device", name, "--app", "probeapp", "--live"], env);
    assert(run.status === 0, `Live schalten fehlgeschlagen: ${run.stdout}${run.stderr}`);
    run = await toolAsync("app.mjs", ["--device", name, "--app", "probeapp", "--back"], env);
    assert(run.status === 0, `Zurückschalten fehlgeschlagen: ${run.stdout}${run.stderr}`);
    assert(gesehen.geschaltet.join(",") === "live,zurueck", `falsch geschaltet: ${gesehen.geschaltet}`);

    // Entfernen ist unumkehrbar: ohne die abgetippte Kennung passiert nichts.
    run = await toolAsync("app.mjs", ["--device", name, "--app", "probeapp", "--remove"], env);
    assert(run.status !== 0 && gesehen.entfernt === null, "--remove hat ohne Bestätigung entfernt");
    run = await toolAsync("app.mjs", ["--device", name, "--app", "probeapp", "--remove", "--confirm", "probeapp"], env);
    assert(run.status === 0 && gesehen.entfernt === "bestaetigung=probeapp", "die Rückfrage wird nicht durchgereicht");

    // Ein Manifest, das das Gerät abweisen würde, wird gar nicht erst geschickt.
    writeFileSync(join(quelle, "app.json"), JSON.stringify({ ...MANIFEST, version: "eins" }));
    gesehen.paket = false;
    run = await toolAsync("app.mjs", ["--device", name, "--deploy", quelle], env);
    assert(run.status !== 0 && !gesehen.paket, "ein ungültiges Manifest wurde eingespielt");
    return "Kontrakt, Prüfung, Teststand, live, zurück, entfernen";
  } finally {
    server.close();
    rmSync(work, { recursive: true, force: true });
    rmSync(akte, { recursive: true, force: true });
    if (savedState === null) rmSync(stateFile, { force: true });
    else writeFileSync(stateFile, savedState);
  }
});

await checkAsync("Das Artefakt geht als Ganzes an das Gerät, oder gar nicht", async () => {
  const work = mkdtempSync(join(tmpdir(), "ara-artefakt-"));
  const mirror = join(work, "spiegel");
  const ziel = join(work, "geraet");
  const gemerkt = process.env.ARA_MIRROR;
  mkdirSync(join(mirror, "config", "platforms"), { recursive: true });
  process.env.ARA_MIRROR = mirror;
  try {
    // Ein Artefakt, das nicht sagt, wie es sich installiert: das Kit rät nicht.
    writeFileSync(join(mirror, "README.md"), "# Irgendetwas\n");
    assert(installerEntry() === null, "ohne Einstiegspunkt behauptet das Kit einen Weg");

    // Eines, das es sagt.
    writeFileSync(join(mirror, "arasul"), "#!/bin/sh\n");
    writeFileSync(join(mirror, "config", "platforms", "probe.json"), "{}\n");
    writeFileSync(join(mirror, "STATE.json"), JSON.stringify({ fetched: "2026-08-27T10:00:00.000Z", source: "https://probe", version: "9.9.9" }));
    const entry = installerEntry();
    assert(typeof entry === "string" && entry.length, "Einstiegspunkt nicht erkannt");
    assert(mirrorState().version === "9.9.9", "Stand des Artefakts nicht gelesen");
    assert(mirrorState().source === "https://probe", "Quelle des Artefakts nicht gelesen");

    // Schieben: was im Spiegel liegt, liegt danach am Ziel, samt Unterordnern.
    const geschoben = await ship(null, "local", JSON.stringify(ziel));
    assert(geschoben.ok, `Schieben fehlgeschlagen: ${geschoben.message}`);
    assert(existsSync(join(ziel, "arasul")), "der Einstiegspunkt kam nicht an");
    assert(existsSync(join(ziel, "config", "platforms", "probe.json")), "Unterordner kamen nicht an");
    return `${entry}, Stand 9.9.9`;
  } finally {
    if (gemerkt === undefined) delete process.env.ARA_MIRROR;
    else process.env.ARA_MIRROR = gemerkt;
    rmSync(work, { recursive: true, force: true });
  }
});

check("Auf einem Gerät ohne Urteil wird nichts installiert", () => {
  const stateFile = join(ROOT, ".ara", "state.json");
  const savedState = existsSync(stateFile) ? readFileSync(stateFile, "utf8") : null;
  const name = "selftest-install";
  try {
    // Dieser Rechner selbst, SSH abgelehnt: geprüft wird lokal. Ein Entwicklungsrechner
    // ist kein unterstütztes Gerät, also endet --install arasul vor dem Download.
    let run = tool("device.mjs", ["--host", "localhost", "--port", "1", "--name", name, "--json"]);
    const lage = JSON.parse(run.stdout);
    run = tool("device.mjs", ["--name", name, "--install", "arasul"]);
    if (lage.verdict === "supported") return "übersprungen, dieser Rechner ist ein unterstütztes Gerät";
    assert(run.status !== 0, "auf einem nicht unterstützten Gerät wurde installiert");
    assert(/läuft Arasul nicht/.test(run.stderr), `unerwartete Begründung: ${run.stderr}`);

    // Der Kit-Schlüssel kommt vom Gerät. Ist dort keine Plattform, sagt das Werkzeug das.
    run = tool("device.mjs", ["--name", name, "--deploy-key"]);
    assert(/Kein Kit-Schlüssel/.test(run.stdout), `ohne Plattform kam kein Hinweis: ${run.stdout}`);
    const { fields } = readFrontmatter(join(ROOT, "devices", name, "device.md"));
    assert(!fields.api_key_ref, "ein Schlüsselverweis steht in der Akte, obwohl keiner angelegt wurde");
    return `Urteil ${lage.verdict}`;
  } finally {
    rmSync(join(ROOT, "devices", name), { recursive: true, force: true });
    if (savedState === null) rmSync(stateFile, { force: true });
    else writeFileSync(stateFile, savedState);
  }
});

// --- Trennung von Partnerdaten ----------------------------------------------

check("Partnerdaten bleiben von der Versionskontrolle ausgenommen", () => {
  // Der wichtigste Schutz des Kits: ein Update darf Kundendaten nie berühren.
  // Wenn .gitignore und Ordnernamen auseinanderlaufen, fällt das sonst erst auf,
  // wenn Kundenakten in einem Repository gelandet sind.
  const isRepo = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (isRepo.status !== 0) return "übersprungen, kein Git-Repository";

  const mustBeIgnored = [
    "customers/beispiel/customer.md",
    "customers/beispiel/devices/probe/runsheet.md",
    "business/profile.md",
    "business/company.md",
    "business/notes/gelerntes.md",
    "devices/zentrale/device.md",
    "apps/urlaubsantrag/app.json",
    ".env",
    ".ara/mirror/VERSION",
    ".ara/state.json",
    // Erzeugte Befehle. Nur init.md ist getrackt, siehe unten.
    ".claude/commands/device.md",
    ".claude/commands/eigener.md",
    ".claude/commands/.sources.json",
  ];
  const tracked = mustBeIgnored.filter(
    (path) =>
      spawnSync("git", ["check-ignore", "-q", path], { cwd: ROOT }).status !== 0
  );
  assert(
    tracked.length === 0,
    `würde ins Repository wandern: ${tracked.join(", ")}, .gitignore prüfen`
  );

  // Umgekehrt: das Werkzeug selbst muss verfolgt werden, sonst fehlt es nach dem Klonen.
  const mustBeTracked = [
    ".claude/CLAUDE.md",
    ".claude/settings.json",
    ".claude/commands/init.md",
    ".ara/tools/selftest.mjs",
    ".ara/commands/alle/device.md",
    ".ara/commands/partner/customer.md",
    "README.md",
    "LICENSE",
  ];
  const ignored = mustBeTracked.filter(
    (path) => spawnSync("git", ["check-ignore", "-q", path], { cwd: ROOT }).status === 0
  );
  assert(ignored.length === 0, `fehlt nach dem Klonen: ${ignored.join(", ")}`);

  return `${mustBeIgnored.length} Pfade geprüft`;
});

// --- Das Papier -------------------------------------------------------------

check("Kein Absender von Arasul im Papier des Partners", () => {
  // Am 25.08.2026 trugen vier Vorlagen Arasuls USt-IdNr., Anschrift und
  // Unterschrift. Gefunden hat das ein Mensch von Hand, kein Test. Diese
  // Prüfung ersetzt den Menschen, damit der Fehler nicht mit der nächsten
  // Vorlage zurückkehrt.
  //
  // Sie geht über den Inhalt, nicht über Dateinamen: eine Vorlage, die ein
  // Partner selbst dazulegt, wird genauso geprüft.
  const markers = [
    [/DE352463063/i, "USt-IdNr. von Arasul"],
    [/Seitenstra(?:ss|ß)e\s*1\b/i, "Anschrift von Arasul"],
    [/kolja\.schoepe/i, "E-Mail-Adresse von Kolja Schoepe"],
    [/Kolja\s+Sch/i, "Kolja Schoepe als Unterzeichner"],
  ];

  // Ausgenommen, weil dort Arasul die sprechende Partei ist und beide Orte aus
  // Arasuls Steuerungsordner gespiegelt werden: .ara/vorlagen/bausteine/ und
  // .ara/nachweise/. Letzteres wird hier gar nicht betreten.
  const mirrored = new Set(["bausteine"]);

  // **Die eine begründete Ausnahme.** .ara/vorlagen/endkundenbedingungen.md nennt
  // Arasul samt Inhaber und Anschrift als Hersteller der Software. Das muss
  // dort stehen: sonst weiß der Endkunde nicht, wessen Haftungsbegrenzung für
  // ihn gilt, und Ziffer 6 gilt ausdrücklich auch zugunsten des Herstellers.
  // Die Ausnahme wird benannt, nicht stillschweigend übersprungen, und sie
  // gilt nur für den Satz, der den Hersteller nennt.
  const EXCEPTION_FILE = "endkundenbedingungen.md";
  const EXCEPTION_ANCHOR = /Hersteller der Software ist Arasul/;
  let exceptionUsed = false;

  const offenders = [];
  const scan = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!mirrored.has(entry.name)) scan(join(dir, entry.name));
        continue;
      }
      if (!/\.md$/.test(entry.name)) continue;
      const path = join(dir, entry.name);
      const lines = readFileSync(path, "utf8").split(/\r?\n/);
      lines.forEach((line, index) => {
        for (const [pattern, what] of markers) {
          if (!pattern.test(line)) continue;
          // Der Herstellersatz laeuft ueber mehrere Zeilen, darum das Umfeld.
          const context = lines.slice(Math.max(0, index - 2), index + 1).join(" ");
          if (entry.name === EXCEPTION_FILE && EXCEPTION_ANCHOR.test(context)) {
            exceptionUsed = true;
            continue;
          }
          offenders.push(`${relative(ROOT, path)}:${index + 1} ${what}`);
        }
      });
    }
  };
  scan(join(ROOT, ".ara", "vorlagen"));

  assert(
    offenders.length === 0,
    `Arasuls Absender im Papier des Partners:\n    ${offenders.join("\n    ")}`
  );
  // Eine Ausnahme, die nichts mehr abdeckt, gehoert weg statt stehenzubleiben.
  assert(
    exceptionUsed,
    `die Ausnahme fuer ${EXCEPTION_FILE} greift nicht mehr, entweder ist der ` +
      "Herstellersatz weg oder er ist umformuliert. Pruefen und die Ausnahme anpassen"
  );
  return "1 begruendete Ausnahme: der Hersteller in den Endkundenbedingungen";
});

check("PDF-Werkzeug haelt Platzhalter zurueck und druckt sonst", () => {
  // Der Zweck des Werkzeugs ist, dass kein Angebot mit "{Betrag} Euro" beim
  // Kunden landet. Also wird genau das geprüft.
  let run = tool("pdf.mjs", [join(ROOT, ".ara", "vorlagen", "angebot.md"), "--check"]);
  assert(run.status !== 0, "ungefuellte Platzhalter fuehren nicht zum Abbruch");
  assert(/\{Betrag\}/.test(run.stderr), "die gefundenen Platzhalter werden nicht benannt");

  const dir = mkdtempSync(join(tmpdir(), "ara-pdf-test-"));
  const file = join(dir, "probe.md");
  try {
    // Ein Platzhalter mit Zeilenumbruch darin. Genau diese Sorte sind die
    // laengsten in den Vorlagen, und eine Suche je Zeile findet sie nicht.
    writeFileSync(file, "# Probe\n\n{Ein Platzhalter, der\nueber zwei Zeilen geht}\n");
    run = tool("pdf.mjs", [file, "--check"]);
    assert(run.status !== 0, "umgebrochener Platzhalter wird nicht gefunden");

    // Ohne Platzhalter muss wirklich ein PDF entstehen.
    writeFileSync(
      file,
      "# Probe\n\nEin Satz.\n\nZeile eins\\\nZeile zwei\n\n" +
        "| A | B |\n| --- | --- |\n| 1 | 2 |\n\n```\nein befehl\n```\n"
    );
    const target = join(dir, "probe.pdf");
    run = tool("pdf.mjs", [file, "--out", target]);
    if (/Kein Chromium gefunden/.test(run.stderr)) {
      return "Pruefung lief, gedruckt nicht: kein Chromium auf diesem Rechner";
    }
    assert(run.status === 0, `Druck fehlgeschlagen: ${run.stderr || run.stdout}`);
    assert(existsSync(target), "es ist kein PDF entstanden");
    const head = readFileSync(target).subarray(0, 5).toString("latin1");
    assert(head === "%PDF-", `die erzeugte Datei ist kein PDF, sie beginnt mit "${head}"`);
    return "geprueft und gedruckt";
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

check("PDF-Werkzeug trennt Tabellenzellen nur am unmaskierten Strich", () => {
  // Am 26.08.2026 zerlegte ein unmaskierter Strich in .ara/nachweise/datenverarbeitung.md
  // eine zweispaltige Zeile in vier Spalten. Die Quelle ist berichtigt und schreibt
  // jetzt \|. Das half im Steuerungsordner nichts, weil dessen Druckwerkzeug an jedem
  // Strich trennte. Diese Pruefung haelt fest, dass pdf.mjs das nicht tut.
  const dir = mkdtempSync(join(tmpdir(), "ara-pdf-tabelle-"));
  const file = join(dir, "tabelle.md");
  try {
    writeFileSync(
      file,
      "# Probe\n\n| Feld | Wert |\n| --- | --- |\n" +
        "| Fernwartungszugang | direkt \\| Vermittlungsnetz \\| nicht eingerichtet |\n"
    );
    const html = join(dir, "tabelle.html");
    const run = tool("pdf.mjs", [file, "--html", "--out", html]);
    assert(run.status === 0, `HTML-Ausgabe fehlgeschlagen: ${run.stderr || run.stdout}`);

    const body = readFileSync(html, "utf8").match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? "";
    const columns = (body.match(/<td>/g) || []).length;
    assert(columns === 2, `die Zeile zerfaellt in ${columns} Zellen statt zwei`);
    assert(
      /direkt \| Vermittlungsnetz \| nicht eingerichtet/.test(body),
      "der maskierte Strich steht nicht als Strich in der Zelle"
    );
    assert(!/\\/.test(body), "der Rueckstrich der Maskierung wuerde mitgedruckt");
    return "zwei Zellen, Striche im Text erhalten";
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- Schreibweise -----------------------------------------------------------

check("Keine Gedankenstriche im Kit", () => {
  // Ara soll keine Gedankenstriche setzen. Was im Kit steht, ist ihre Vorlage:
  // steht dort einer, schreibt sie welche.
  const offenders = [];
  const scan = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".git") || entry.name === "node_modules") continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(path);
        continue;
      }
      if (!/\.(md|mjs|json)$/.test(entry.name)) continue;
      const content = readFileSync(path, "utf8");
      content.split(/\r?\n/).forEach((line, index) => {
        if (/[\u2014\u2013]/.test(line)) offenders.push(`${relative(ROOT, path)}:${index + 1}`);
      });
    }
  };
  scan(join(ROOT, ".ara"));
  scan(join(ROOT, ".claude"));
  offenders.push(
    ...(/[\u2014\u2013]/.test(readFileSync(join(ROOT, "README.md"), "utf8")) ? ["README.md"] : [])
  );
  assert(offenders.length === 0, `Gedankenstriche in: ${offenders.slice(0, 8).join(", ")}`);
});

check("Dateinamen sind klein, ohne Umlaute und ohne Leerzeichen", () => {
  // Dateien und Ordner heissen englisch und klein, das steht in CLAUDE.md. Was
  // dagegen verstoesst, faellt erst auf, wenn ein Verweis auf einem Rechner mit
  // anderer Gross- und Kleinschreibung ins Leere zeigt, oder wenn ein Umlaut
  // im Namen auf einem Runner anders kodiert ankommt als auf dem Mac. Geprueft
  // wird, was im Repository liegt, nicht, was der Partner dazulegt.
  const listed = spawnSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" });
  if (listed.status !== 0) return "uebersprungen, kein Git-Repository";
  const files = listed.stdout.split("\0").filter(Boolean);

  // Feste Namen, die Werkzeuge so erwarten: README, CLAUDE.md, SKILL.md.
  const fixed = new Set(["README.md", "CLAUDE.md", "SKILL.md", "LICENSE", ".gitkeep"]);
  // Die Bausteine werden aus Arasuls Steuerungsordner gespiegelt und tragen
  // dessen Nummern (W1 bis W5). Sie heissen hier so, wie sie dort heissen.
  const mirrored = /^\.ara\/vorlagen\/bausteine\//;

  const offenders = files.filter((path) => {
    const parts = path.split("/");
    const name = parts.pop();
    if (parts.some((dir) => !/^[a-z0-9._-]+$/.test(dir))) return true;
    if (fixed.has(name)) return false;
    if (mirrored.test(path)) return /[^A-Za-z0-9._-]/.test(name);
    return !/^[a-z0-9._-]+$/.test(name);
  });
  assert(offenders.length === 0, `passt nicht zur Schreibweise: ${offenders.slice(0, 8).join(", ")}`);
  return `${files.length} Dateien`;
});

check("Browser-Werkzeug ist eingerichtet", () => {
  const file = join(ROOT, ".mcp.json");
  assert(existsSync(file), ".mcp.json fehlt, der Browser steht dann nicht zur Verfügung");
  const config = JSON.parse(readFileSync(file, "utf8"));
  assert(config.mcpServers?.playwright, "kein Browser in .mcp.json eingetragen");

  const settings = JSON.parse(readFileSync(join(ROOT, ".claude", "settings.json"), "utf8"));
  assert(
    settings.permissions?.allow?.includes("mcp__playwright"),
    "Browser ist nicht freigegeben, jeder Aufruf wuerde nachfragen"
  );
});

// --- Verweise ---------------------------------------------------------------

check("Verweise im Kit zeigen auf vorhandene Dateien", () => {
  const files = [];
  const collect = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".git") || entry.name === "node_modules") continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) collect(path);
      else if (/\.(md|json)$/.test(entry.name)) files.push(path);
    }
  };
  collect(join(ROOT, ".ara"));
  collect(join(ROOT, ".claude"));
  files.push(join(ROOT, "README.md"));

  const missing = [];
  for (const file of files) {
    const content = readFileSync(file, "utf8");
    const paths = /(?:^|[\s`("])((?:\.(?:ara|claude)|vorlagen|nachweise)\/[A-Za-z0-9._\/-]+)/g;
    for (const match of content.matchAll(paths)) {
      const target = match[1].replace(/[.,)`]+$/, "");
      if (target.includes("*") || target.endsWith("/")) continue;
      // Der Spiegel und der Merker entstehen erst zur Laufzeit.
      if (target.startsWith(".ara/mirror/") || target === ".ara/state.json") continue;
      if (existsSync(join(ROOT, target))) continue;
      missing.push(`${relative(ROOT, file)} → ${target}`);
    }
  }
  assert(missing.length === 0, `tote Verweise:\n    ${missing.join("\n    ")}`);
  return `${files.length} Dateien`;
});

check("Jeder genannte Befehl hat seine Datei", () => {
  // Die Verweispruefung oben sieht nur Dateipfade in Backticks. Ein Command
  // heisst aber /angebot und nicht .claude/commands/angebot.md, also ist er ihr
  // zweimal durchgerutscht: /angebot stand in CLAUDE.md, im README und in den
  // Vorlagen, und die Datei dazu gab es nie. Ein Partner liest davon, tippt es,
  // und es passiert nichts.
  //
  // Findet die Pruefung einen Befehl, den es absichtlich noch nicht gibt, ist
  // das eine Aussage ueber das Repo und nicht ueber die Pruefung.
  const files = [];
  const collect = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".git") || entry.name === "node_modules") continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) collect(path);
      else if (/\.(md|json)$/.test(entry.name)) files.push(path);
    }
  };
  collect(join(ROOT, ".ara"));
  collect(join(ROOT, ".claude"));
  files.push(join(ROOT, "README.md"));

  // Ein Befehl steht am Wortanfang und hoert vor dem naechsten Schraegstrich
  // auf. Der Lookahead haelt Pfade wie /dev/disk0 und Verhaeltnisse wie
  // "und/oder" heraus, das fuehrende Zeichen die Pfade wie .ara/tools.
  const commandPattern = /(?:^|[\s`("*|,])\/([a-z][a-z0-9-]{2,})(?![\w\/-])/g;
  const found = new Map();
  for (const file of files) {
    for (const match of readFileSync(file, "utf8").matchAll(commandPattern)) {
      const name = match[1];
      if (!found.has(name)) found.set(name, new Set());
      found.get(name).add(relative(ROOT, file));
    }
  }

  // Quelle der Befehle ist .ara/commands/, nur init.md liegt direkt in
  // .claude/commands/. Was dort sonst liegt, ist erzeugt und zaehlt nicht.
  const exists = (name) =>
    (name === "init" && existsSync(join(ROOT, ".claude", "commands", "init.md"))) ||
    ["alle", "partner"].some((group) =>
      existsSync(join(ROOT, ".ara", "commands", group, `${name}.md`))
    );
  const missing = [];
  for (const [name, where] of found) {
    if (exists(name)) continue;
    missing.push(`/${name} fehlt in .ara/commands/, genannt in ${[...where].join(", ")}`);
  }
  assert(missing.length === 0, `Befehle ohne Datei:\n    ${missing.join("\n    ")}`);
  return `${found.size} Befehle genannt, alle vorhanden`;
});

check("Jeder Befehl nennt sein Wissen", () => {
  // Die Wissensdateien sind die Kontextschicht: ein Befehl sagt, welche er laedt,
  // statt dass Ara den ganzen Ordner liest. Wer keine nennt, laedt entweder alles
  // oder nichts, und beides ist falsch.
  const files = [join(ROOT, ".claude", "commands", "init.md")];
  for (const group of ["alle", "partner"]) {
    const dir = join(ROOT, ".ara", "commands", group);
    for (const name of readdirSync(dir)) files.push(join(dir, name));
  }
  const silent = files.filter((file) => {
    const content = readFileSync(file, "utf8");
    return !/Wissen, das dieser Befehl\s+lädt:/.test(content) || !/\.ara\/knowledge\/[a-z-]+\.md/.test(content);
  });
  assert(silent.length === 0, `ohne Wissensangabe: ${silent.map((f) => relative(ROOT, f)).join(", ")}`);
  return `${files.length} Befehle`;
});

// --- Update und Befehle in einem Fork ----------------------------------------

await checkAsync("Update und Befehle laufen in einem Fork ohne Upstream", async () => {
  // Der Grundriss verspricht: ein Update ersetzt nur, was Arasul gehoert, und es
  // braucht dafuer kein git-Remote. Geprueft wird das an einem Wegwerf-Fork:
  // eine Kopie von .ara/ und .claude/, ein eigenes Profil, ein eigener Befehl,
  // ein Spiegel. Dann kommt ein neuer Stand als Archiv von einem Testserver.
  const work = mkdtempSync(join(tmpdir(), "ara-fork-"));
  const fork = join(work, "fork");
  const copy = (from, to) =>
    cpSync(from, to, {
      recursive: true,
      filter: (src) => !/\/(mirror|node_modules)(\/|$)/.test(src),
    });
  copy(join(ROOT, ".ara"), join(fork, ".ara"));
  copy(join(ROOT, ".claude"), join(fork, ".claude"));
  const write = (rel, content) => {
    mkdirSync(join(fork, rel, ".."), { recursive: true });
    writeFileSync(join(fork, rel), content);
  };
  write("business/profile.md", "---\nrole: partner\nname: Probe\n---\n\nMeins.\n");
  write(".claude/commands/eigener.md", "---\ndescription: selbst gebaut\n---\n\nMeiner.\n");
  write(".ara/mirror/STATE.json", '{"version":"probe"}');
  write(".ara/state.json", '{"customer":"probe"}');
  rmSync(join(fork, ".claude", "commands", "device.md"), { force: true });
  spawnSync("git", ["init", "-q"], { cwd: fork });

  const forkTool = (file, args, env = {}) =>
    new Promise((done) => {
      const child = spawn("node", [join(fork, ".ara", "tools", file), ...args], {
        cwd: fork,
        env: { ...process.env, ...env },
      });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (d) => (stdout += d));
      child.stderr.on("data", (d) => (stderr += d));
      child.on("close", (status) => done({ status, stdout, stderr }));
    });
  const has = (rel) => existsSync(join(fork, rel));
  const read = (rel) => readFileSync(join(fork, rel), "utf8");

  // Der neue Stand: eine Datei neu, eine geaendert, eine entfernt, ein Befehl
  // geaendert. Dazu Koeder, die nicht eingespielt werden duerfen.
  const source = join(work, "src", "ara-kit-main");
  copy(join(fork, ".ara"), join(source, ".ara"));
  copy(join(fork, ".claude"), join(source, ".claude"));
  rmSync(join(source, ".ara", "mirror"), { recursive: true, force: true });
  rmSync(join(source, ".ara", "state.json"), { force: true });
  writeFileSync(join(source, ".ara", "knowledge", "probe.md"), "# Probe\n");
  writeFileSync(join(source, ".ara", "persona", "ara.md"), read(".ara/persona/ara.md") + "\nNeu.\n");
  rmSync(join(source, ".ara", "knowledge", "sales.md"));
  writeFileSync(
    join(source, ".ara", "commands", "alle", "device.md"),
    read(".ara/commands/alle/device.md") + "\nNeu im Kit.\n"
  );
  mkdirSync(join(source, "business"), { recursive: true });
  writeFileSync(join(source, "business", "profile.md"), "---\nrole: company\n---\n\nKoeder.\n");
  writeFileSync(join(source, ".claude", "commands", "eigener.md"), "Koeder.\n");
  writeFileSync(join(source, ".ara", "state.json"), "Koeder.\n");
  const tar = spawnSync("tar", ["-czf", join(work, "kit.tar.gz"), "-C", join(work, "src"), "ara-kit-main"]);
  assert(tar.status === 0, "Testarchiv liess sich nicht bauen");
  const packet = readFileSync(join(work, "kit.tar.gz"));
  const server = createServer((request, response) => {
    response.writeHead(200, { "Content-Type": "application/gzip" });
    response.end(packet);
  });
  await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
  const env = { ARA_KIT_SOURCE: `http://127.0.0.1:${server.address().port}/kit.tar.gz` };

  try {
    // 1. Befehle anlegen, Zweig aus dem Profil.
    let run = await forkTool("commands.mjs", []);
    assert(run.status === 0, `Lage fehlgeschlagen: ${run.stderr}`);
    assert(/fehlt\s+\/device/.test(run.stdout), "fehlender Befehl wird nicht gemeldet");
    assert(/eigener\s+\/eigener/.test(run.stdout), "eigener Befehl wird nicht als solcher erkannt");
    run = await forkTool("commands.mjs", ["--apply"]);
    assert(run.status === 0, `Anlegen fehlgeschlagen: ${run.stderr}`);
    assert(has(".claude/commands/device.md"), "Befehl aus alle/ nicht angelegt");
    assert(has(".claude/commands/customer.md"), "Befehl aus partner/ nicht angelegt");
    assert(/Meiner\./.test(read(".claude/commands/eigener.md")), "eigener Befehl ueberschrieben");

    // Ein Unternehmen bekommt die Partnerbefehle nicht.
    run = await forkTool("commands.mjs", ["--json", "--role", "company"]);
    const lage = JSON.parse(run.stdout);
    assert(!lage.commands.some((c) => c.group === "partner"), "Unternehmen bekommt Partnerbefehle");
    assert(lage.commands.some((c) => c.name === "device"), "Unternehmen bekommt alle/ nicht");

    // Ohne Profil und ohne --role wird nicht geraten.
    rmSync(join(fork, "business", "profile.md"));
    run = await forkTool("commands.mjs", []);
    assert(run.status !== 0, "ohne Zweig wird geraten");
    write("business/profile.md", "---\nrole: partner\nname: Probe\n---\n\nMeins.\n");

    // 2. Update nur ansehen: nichts darf sich aendern.
    run = await forkTool("update.mjs", ["--check"], env);
    assert(run.status === 0, `--check fehlgeschlagen: ${run.stderr}`);
    assert(/neu\s+\.ara\/knowledge\/probe\.md/.test(run.stdout), "neue Datei nicht gemeldet");
    assert(/entfernt\s+\.ara\/knowledge\/sales\.md/.test(run.stdout), "entfernte Datei nicht gemeldet");
    assert(!has(".ara/knowledge/probe.md"), "--check hat eingespielt");

    // 3. Einspielen.
    run = await forkTool("update.mjs", [], env);
    assert(run.status === 0, `Update fehlgeschlagen: ${run.stderr}${run.stdout}`);
    assert(has(".ara/knowledge/probe.md"), "neue Datei fehlt");
    assert(!has(".ara/knowledge/sales.md"), "entfernte Datei liegt noch da");
    assert(/Neu\.\s*$/.test(read(".ara/persona/ara.md")), "geaenderte Datei nicht ersetzt");
    assert(/Neu im Kit/.test(read(".ara/commands/alle/device.md")), "Befehlsquelle nicht ersetzt");
    // Die Koeder.
    assert(/Meins\./.test(read("business/profile.md")), "business/ wurde angefasst");
    assert(/Meiner\./.test(read(".claude/commands/eigener.md")), "erzeugter Befehl wurde angefasst");
    assert(!/Neu im Kit/.test(read(".claude/commands/device.md")), "erzeugter Befehl wurde ohne Zustimmung ersetzt");
    assert(/probe/.test(read(".ara/mirror/STATE.json")), "Spiegel wurde angefasst");
    assert(/customer/.test(read(".ara/state.json")), "Merker wurde angefasst");

    // Ein zweiter Lauf hat nichts mehr zu tun.
    run = await forkTool("update.mjs", ["--check"], env);
    assert(/Alles aktuell/.test(run.stdout), "zweiter Lauf meldet Aenderungen");

    // 4. Befehle nachziehen: der im Kit geaenderte wird gemeldet und erst mit --apply ersetzt.
    run = await forkTool("commands.mjs", []);
    assert(/neu im Kit\s+\/device/.test(run.stdout), "im Kit geaenderter Befehl wird nicht gemeldet");
    run = await forkTool("commands.mjs", ["--apply"]);
    assert(/Neu im Kit/.test(read(".claude/commands/device.md")), "geaenderter Befehl nicht ersetzt");

    // 5. Von Hand geaendert: bleibt bei --apply liegen, nur --replace ersetzt.
    write(".claude/commands/customer.md", read(".claude/commands/customer.md") + "\nMeine Zeile.\n");
    run = await forkTool("commands.mjs", []);
    assert(/angepasst\s+\/customer/.test(run.stdout), "von Hand geaenderter Befehl wird nicht erkannt");
    run = await forkTool("commands.mjs", ["--apply"]);
    assert(/Meine Zeile/.test(read(".claude/commands/customer.md")), "--apply hat die eigene Aenderung ueberschrieben");
    // Kit und Mensch haben beide geaendert.
    write(".ara/commands/partner/customer.md", read(".ara/commands/partner/customer.md") + "\nAuch neu im Kit.\n");
    run = await forkTool("commands.mjs", []);
    assert(/beides\s+\/customer/.test(run.stdout), "beidseitige Aenderung wird nicht erkannt");
    run = await forkTool("commands.mjs", ["--apply"]);
    assert(/Meine Zeile/.test(read(".claude/commands/customer.md")), "--apply hat bei beidseitiger Aenderung ersetzt");
    run = await forkTool("commands.mjs", ["--replace", "customer"]);
    assert(run.status === 0, `--replace fehlgeschlagen: ${run.stderr}`);
    assert(/Auch neu im Kit/.test(read(".claude/commands/customer.md")), "--replace hat nicht ersetzt");
    assert(!/Meine Zeile/.test(read(".claude/commands/customer.md")), "--replace hat die alte Kopie gelassen");

    // 6. /init ohne Interview, beide Zweige. Das Profil aus dem Fork weicht dafuer.
    rmSync(join(fork, "business"), { recursive: true, force: true });
    for (const name of readdirSync(join(fork, ".claude", "commands"))) {
      if (name !== "init.md") rmSync(join(fork, ".claude", "commands", name));
    }
    run = await forkTool("init.mjs", ["--answers", join(ROOT, ".ara", "templates", "init-answers-company.json")]);
    assert(run.status === 0, `Unternehmen: init.mjs fehlgeschlagen: ${run.stderr || run.stdout}`);
    assert(has("business/profile.md"), "Unternehmen: kein Profil");
    assert(!has("business/company.md"), "Unternehmen: company.md angelegt, obwohl es keine Angebote gibt");
    assert(/^role: company$/m.test(read("business/profile.md")), "Unternehmen: Zweig fehlt im Profil");
    assert(/^## Was ich vorhabe\n\nDas Geraet/m.test(read("business/profile.md")), "Unternehmen: Prosa nicht eingesetzt");
    assert(!/<!--[\s\S]*Wo du hin willst/.test(read("business/profile.md")), "Unternehmen: Vorlagenkommentar steht noch im Profil");
    assert(/Technikstand dieses Rechners\n\nStand \d{4}-\d{2}-\d{2}:/.test(read("business/profile.md")), "Unternehmen: Technikstand fehlt");
    assert(has(".claude/commands/device.md"), "Unternehmen: Befehle nicht angelegt");
    assert(!has(".claude/commands/customer.md"), "Unternehmen: bekommt den Kundenbefehl");
    run = await forkTool("init.mjs", ["--answers", join(ROOT, ".ara", "templates", "init-answers-partner.json")]);
    assert(run.status !== 0, "zweiter Lauf ueberschreibt das Profil ohne --force");
    run = await forkTool("init.mjs", ["--answers", join(ROOT, ".ara", "templates", "init-answers-partner.json"), "--force"]);
    assert(run.status === 0, `Partner: init.mjs fehlgeschlagen: ${run.stderr || run.stdout}`);
    assert(/^role: partner$/m.test(read("business/profile.md")), "Partner: Zweig fehlt im Profil");
    assert(/^hourly_rate: 95$/m.test(read("business/company.md")), "Partner: Stundensatz nicht in company.md");
    assert(has(".claude/commands/customer.md"), "Partner: bekommt den Kundenbefehl nicht");
    run = await forkTool("init.mjs", ["--json"]);
    const lage2 = JSON.parse(run.stdout);
    assert(lage2.role === "partner" && lage2.consequences.some((c) => c.key === "invoice"), "offene Rechnungsentscheidung wird nicht gemeldet");
    return "anlegen, ansehen, einspielen, nachziehen, Hash-Erkennung, /init in beiden Zweigen";
  } finally {
    server.close();
    rmSync(work, { recursive: true, force: true });
  }
});

console.log(
  `\n${results.length - failures} von ${results.length} Prüfungen bestanden.` +
    (failures ? "\n\nDas Kit ist in diesem Zustand nicht verlässlich." : "")
);
process.exit(failures ? 1 : 0);
