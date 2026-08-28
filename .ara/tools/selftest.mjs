#!/usr/bin/env node
/**
 * Selbsttest: prüft, ob das Kit auf diesem Rechner funktioniert.
 *
 * Läuft ohne Kundendaten, ohne Netzzugang zum Portal und ohne Gerät. Nützlich nach
 * einem Update, bei merkwürdigem Verhalten und in der Entwicklung des Kits.
 *
 *   node .ara/tools/selftest.mjs
 */

import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
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
import { PROBE, arasulRunning, judge, parseProbe, services } from "./lib/device.mjs";
import {
  KIT_CONTRACT_VERSION,
  checkManifest,
  checkVersion,
  findEndpoint,
  promisedFolders,
} from "./lib/contract.mjs";
import { RETIRED } from "./lib/commands.mjs";
import {
  EXTERNAL_PREFIX,
  bareApiPaths,
  callable,
  collectRoutes,
  judgeRoute,
  planFor,
  undocumented,
} from "./lib/docroutes.mjs";
import {
  createMasker,
  installCommand,
  installTarget,
  installerEntry,
  mirrorState,
  releaseVersion,
  runInstaller,
  scrub,
  ship,
  troubles,
} from "./lib/install.mjs";
import { lastStand, movePlan, nextSteps, readApp, versioned } from "./lib/appfile.mjs";
import { loginSpec, pickToken } from "./lib/session.mjs";
import { WAS_FEHLT, composeFile, nginxConf } from "./lib/compose.mjs";
import {
  needsParameter,
  parseHealth,
  readHealth,
  statusLine,
  topicEndpoints,
} from "./lib/maintain.mjs";
import {
  auditLedger,
  checkVat14,
  computePositions,
  formatAmount,
  parseAmount,
  peekNumber,
  readInvoice,
  totals,
} from "./lib/invoice.mjs";
import { buildXml, validateXml } from "./lib/zugferd.mjs";
import { embed, inspect, sRgbProfile } from "./lib/pdfa.mjs";
import { ROOT, headerHelp, helpOnly, readFrontmatter, writeFrontmatter } from "./lib/kit.mjs";
import { compareVersions, entriesSince, parseChangelog, standBlock } from "./lib/version.mjs";

helpOnly(import.meta.url);

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
  // Nur die Vorlagen mit Frontmatter. Die Vorlage einer App ist ein Ordner mit
  // Quelltext darin, kein Formular.
  const files = readdirSync(templates).filter((name) => name.endsWith(".md"));
  for (const name of files) {
    const { fields } = readFrontmatter(join(templates, name));
    for (const [key, value] of Object.entries(fields)) {
      assert(!value.startsWith("#"), `${name}: Feld ${key} liest den Kommentar als Wert`);
      assert(!/^\S+\s+#/.test(value), `${name}: Feld ${key} enthält einen Kommentarrest`);
    }
  }
  return `${files.length} Vorlagen`;
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
  assert(svc.arasul.state === "running" && /arasul-flows-sandbox/.test(svc.arasul.text), "laufende Plattform nicht erkannt");
  assert(/\/opt\/arasul.*\/home\/x\/arasul/.test(svc.arasul.text), "mehrere Ordner nicht gesammelt");
  assert(svc.sudo === true, "sudo ohne Passwort nicht erkannt");

  const bare = services(parseProbe("@docker_bin=/usr/local/bin/docker\n@user=probe"));
  assert(bare.docker.state === "present", "Docker ohne Dienst gilt nicht als vorhanden");
  assert(bare.ollama.state === "missing" && bare.arasul.state === "none", "leerer Befund liefert Funde");

  // Ein Gerät mit Arasul fährt das Sprachmodell im Container und hat kein
  // Programm im Pfad. "fehlt" wäre dort falsch, und der nächste Schritt hieße,
  // etwas aufzusetzen, das längst läuft.
  const imContainer = services(
    parseProbe("@docker_bin=/usr/bin/docker\n@docker_server=27.1.1\n@docker_names=llm-service traefik dashboard-backend")
  );
  assert(imContainer.ollama.state === "container", "das Modell im Container gilt als fehlend");
  assert(/llm-service/.test(imContainer.ollama.text), "der gefundene Container wird nicht genannt");
});

check("Die Spurensuche trennt eine laufende Plattform von liegengebliebenen Resten", () => {
  // Der Fund vom 28.08.2026: das Kit schob sein Artefakt nach $HOME/arasul,
  // fand beim nächsten Lauf genau diesen Ordner und hielt ihn für eine
  // Installation. Danach ging auf einem frisch zurückgesetzten Gerät nichts
  // mehr, obwohl dort nichts lief. Ein Ordner ist kein laufender Dienst.
  const laeuft = services(
    parseProbe("@docker_bin=/usr/bin/docker\n@docker_server=27.1.1\n@docker_names=dashboard-backend traefik")
  );
  assert(laeuft.arasul.state === "running", `eine laufende Plattform gilt als ${laeuft.arasul.state}`);
  assert(/dashboard-backend/.test(laeuft.arasul.text), "der gefundene Container wird nicht genannt");

  const reste = services(
    parseProbe("@docker_bin=/usr/bin/docker\n@docker_server=27.1.1\n@docker_names=n8n\n@arasul_dir=/home/x/arasul-9.9.9")
  );
  assert(reste.arasul.state === "traces", `Reste ohne laufenden Container gelten als ${reste.arasul.state}`);
  assert(/nichts läuft/.test(reste.arasul.text), `der Satz sagt nicht, dass nichts läuft: ${reste.arasul.text}`);

  const dienst = services(parseProbe("@arasul_units=arasul.service"));
  assert(dienst.arasul.state === "traces", "ein Dienst ohne laufenden Container gilt nicht als Rest");

  const nichts = services(parseProbe("@docker_bin=/usr/bin/docker\n@docker_names=n8n traefik"));
  assert(nichts.arasul.state === "none", "ein fremder Container gilt als Arasul");

  // Eine Akte aus der Zeit vor dieser Trennung trägt "found". Sie darf nicht
  // stillschweigend als leeres Gerät gelesen werden.
  assert(arasulRunning("found") && arasulRunning("running"), "eine alte Akte wird nicht mehr gelesen");
  assert(!arasulRunning("traces") && !arasulRunning("none"), "Reste gelten als laufende Plattform");

  // Das Prüfskript muss den Ordner, in den das Kit selbst auspackt, überhaupt
  // finden. Sonst bleibt der Rest unsichtbar, statt "Reste da" zu heißen.
  assert(/arasul-\*/.test(PROBE), "das Prüfskript sieht im Ordner des Artefakts nicht nach");
  return "läuft, Reste, nichts";
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

check("Ein Geheimnis lässt sich auch ohne Terminal hinterlegen", () => {
  // Der Fremdtest am 28.08.2026 lief ohne Terminal. Das Werkzeug fragte in eine
  // Leitung hinein, an deren Ende niemand saß, und das Token blieb "fehlt":
  // damit war die Installation von vornherein nicht erreichbar.
  //
  // Geprüft wird an einem Wegwerf-Kit, damit die echte .env unberührt bleibt.
  const work = mkdtempSync(join(tmpdir(), "ara-secret-"));
  const fork = join(work, "kit");
  cpSync(join(ROOT, ".ara", "tools"), join(fork, ".ara", "tools"), { recursive: true });
  const forkTool = (args, input) =>
    spawnSync("node", [join(fork, ".ara", "tools", "secrets.mjs"), ...args], { encoding: "utf8", input });
  try {
    const wert = "geheim-aus-der-leitung";
    let run = forkTool(["--set", "ARA_SELFTEST_PROBE"], `${wert}\n`);
    assert(run.status === 0, `Hinterlegen ohne Terminal fehlgeschlagen: ${run.stderr || run.stdout}`);
    assert(/hinterlegt in/.test(run.stdout), `es wird nicht gesagt, wo der Wert liegt: ${run.stdout}`);
    assert(!new RegExp(wert).test(`${run.stdout}${run.stderr}`), "der Wert steht in der Ausgabe");

    const env = readFileSync(join(fork, ".env"), "utf8");
    assert(new RegExp(`^ARA_SELFTEST_PROBE=${wert}$`, "m").test(env), `der Wert kam nicht an: ${env}`);

    // Und das Werkzeug findet ihn danach wieder, ohne ihn vorzulesen.
    run = forkTool(["--show"], "");
    assert(run.status === 0, `Anzeige fehlgeschlagen: ${run.stderr}`);
    assert(!new RegExp(wert).test(run.stdout), "die Übersicht zeigt den Wert");

    // Eine leere Leitung ist kein Wert, und das Werkzeug tut nicht so.
    run = forkTool(["--set", "ARA_SELFTEST_LEER"], "\n");
    assert(run.status !== 0, "ein leerer Wert wurde hinterlegt");
    assert(/kein Wert/.test(run.stderr), `der leere Wert wird nicht benannt: ${run.stderr}`);
    assert(!/ARA_SELFTEST_LEER/.test(readFileSync(join(fork, ".env"), "utf8")), "der leere Eintrag steht in der .env");
    return "gesetzt, gefunden, leer abgewiesen";
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

await checkAsync("Das Startpasswort kommt aus dem Kit heraus, ohne sichtbar zu werden", async () => {
  // Fund 1 des zweiten Fremdtests am 28.08.2026. Die Installation legte das
  // Startpasswort des Administrators ordentlich unter ARASUL_START_<gerät> ab,
  // und dann kam es dort nie wieder heraus: `secrets.mjs --show` nannte nur die
  // Kit-Schlüssel, und kein Werkzeug reichte es für die erste Anmeldung weiter.
  // Ein Geheimnis, an das niemand herankommt, ist ein verlorener Zugang.
  //
  // Zuerst die Mechanik für sich: was das Artefakt sagt, sticht den Rückfall des
  // Kits, und was im Aufruf steht, sticht beides. Das Kit behauptet hier nichts,
  // ohne dazuzusagen, woher es das hat.
  assert(loginSpec(null).sources.path === "kit", "der Rückfall gibt sich nicht als solcher zu erkennen");
  const ausArtefakt = loginSpec({ anmeldung: { pfad: "/api/sitzung", benutzer: "chef" } });
  assert(ausArtefakt.path === "/api/sitzung" && ausArtefakt.sources.path === "artefakt", "das Artefakt sticht nicht");
  assert(ausArtefakt.user === "chef" && ausArtefakt.sources.user === "artefakt", "der Benutzername aus dem Artefakt gilt nicht");
  const ausAufruf = loginSpec({ anmeldung: { pfad: "/api/sitzung" } }, { path: "/api/anders" });
  assert(ausAufruf.path === "/api/anders" && ausAufruf.sources.path === "aufruf", "der Aufruf sticht nicht");
  assert(pickToken({ token: "ey.abc" }) === "ey.abc", "der Ausweis wird nicht gefunden");
  assert(pickToken({ sitzung: { access_token: "ey.tief" } }) === "ey.tief", "ein Ausweis im Umschlag wird nicht gefunden");
  assert(pickToken({ irgendwas: 1 }) === null, "es wird ein Ausweis behauptet, wo keiner steht");

  const name = "selftest-login";
  const akte = join(ROOT, "devices", name);
  const ref = "ARASUL_START_SELFTEST_LOGIN";
  const passwort = "start-geheim-4711";
  const work = mkdtempSync(join(tmpdir(), "ara-login-"));
  const mirror = join(work, "spiegel");

  // Das Gerät, gespielt: es nimmt genau eine Anmeldung an und gibt einen Ausweis.
  const gesehen = [];
  const server = createServer((request, response) => {
    const teile = [];
    request.on("data", (chunk) => teile.push(chunk));
    request.on("end", () => {
      const antwort = (status, body) => {
        response.writeHead(status, { "Content-Type": "application/json" });
        response.end(JSON.stringify(body));
      };
      let rumpf = null;
      try {
        rumpf = JSON.parse(Buffer.concat(teile).toString("utf8") || "null");
      } catch {
        rumpf = null;
      }
      gesehen.push({ pfad: request.url, method: request.method, rumpf });
      if (request.method !== "POST" || !["/api/auth/login", "/api/sitzung"].includes(request.url)) {
        return antwort(404, { error: { message: "Diesen Weg gibt es hier nicht" } });
      }
      const nutzer = rumpf?.benutzer ?? rumpf?.konto;
      if (rumpf?.passwort !== passwort || !["admin", "chef"].includes(nutzer)) {
        return antwort(401, { error: { message: "Anmeldung abgelehnt" } });
      }
      antwort(200, { data: { token: "ey.selbsttest.sitzung", gilt_bis: "2026-08-29T00:00:00Z" } });
    });
  });
  await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
  const base = `http://127.0.0.1:${server.address().port}`;

  mkdirSync(akte, { recursive: true });
  cpSync(join(ROOT, ".ara", "templates", "device.md"), join(akte, "device.md"));
  writeFrontmatter(join(akte, "device.md"), {
    name,
    address: "127.0.0.1:1",
    api_base: base,
    verdict: "supported",
    arasul: "found",
    start_password_ref: ref,
  });
  // Das Geheimnis kommt aus der Umgebung: der Selbsttest fasst die echte
  // Geheimnis-Ablage des Partners nicht an.
  const env = { [ref]: passwort, ARA_MIRROR: mirror };

  try {
    // 1. Das Blatt nennt den Namen. Vorher stand dort nur ARASUL_KEY_...
    let run = await toolAsync("secrets.mjs", ["--show"], env);
    assert(run.status === 0, `Anzeige fehlgeschlagen: ${run.stderr}`);
    assert(new RegExp(ref).test(run.stdout), `der Name des Startpassworts fehlt: ${run.stdout}`);
    assert(/--admin-login/.test(run.stdout), "es wird nicht gesagt, wozu das Startpasswort da ist");
    assert(!new RegExp(passwort).test(run.stdout), "das Startpasswort steht in der Übersicht");

    // 2. Aus dem Passwort wird eine Sitzung, und zwar ohne das Passwort zu zeigen.
    run = await toolAsync("device.mjs", ["--name", name, "--admin-login"], env);
    assert(run.status === 0, `Anmeldung fehlgeschlagen: ${run.stdout}${run.stderr}`);
    assert(/ey\.selbsttest\.sitzung/.test(run.stdout), `der Ausweis fehlt in der Ausgabe: ${run.stdout}`);
    assert(!new RegExp(passwort).test(`${run.stdout}${run.stderr}`), "das Startpasswort steht in der Ausgabe");
    const angemeldet = gesehen.find((eintrag) => eintrag.pfad === "/api/auth/login");
    assert(angemeldet, `es wurde nicht angemeldet: ${JSON.stringify(gesehen)}`);
    assert(angemeldet.rumpf?.passwort === passwort, "das Passwort kam nicht am Gerät an");

    // 3. Für ein Skript: nur der Ausweis, ohne Satz drumherum.
    run = await toolAsync("device.mjs", ["--name", name, "--admin-login", "--token"], env);
    assert(run.stdout === "ey.selbsttest.sitzung", `--token gibt nicht nur den Ausweis: ${run.stdout}`);

    // 4. Sagt das Artefakt einen anderen Weg, gilt der und nicht der Rückfall.
    mkdirSync(mirror, { recursive: true });
    writeFileSync(
      join(mirror, "arasul-release.json"),
      JSON.stringify({ fassung: "9.9.9", einstiegspunkt: "install.sh", anmeldung: { pfad: "/api/sitzung", benutzer: "chef" } })
    );
    run = await toolAsync("device.mjs", ["--name", name, "--admin-login"], env);
    assert(run.status === 0, `Anmeldung über den Weg aus dem Artefakt fehlgeschlagen: ${run.stdout}${run.stderr}`);
    assert(/aus dem Artefakt/.test(run.stdout), `es wird nicht gesagt, woher der Weg kommt: ${run.stdout}`);
    assert(gesehen.some((e) => e.pfad === "/api/sitzung" && e.rumpf?.benutzer === "chef"), "der Weg aus dem Artefakt wurde nicht genommen");

    // 5. Einen Weg, den es nicht gibt, behauptet das Kit nicht: es schickt zur
    //    API-Referenz im Artefakt, denn dort steht der richtige.
    run = await toolAsync("device.mjs", ["--name", name, "--admin-login", "--login-path", "/api/nirgendwo"], env);
    assert(run.status !== 0, "ein Weg, den es nicht gibt, endet mit Erfolg");
    assert(/mirror\.mjs --docs/.test(run.stderr), `es wird nicht zur API-Referenz geschickt: ${run.stderr}`);

    // 6. Ohne hinterlegtes Passwort sagt das Werkzeug, wie es dorthin kommt.
    run = await toolAsync("device.mjs", ["--name", name, "--admin-login"], { ARA_MIRROR: mirror });
    assert(run.status !== 0, "ohne Startpasswort wurde angemeldet");
    assert(new RegExp(`secrets\\.mjs --set ${ref}`).test(run.stderr), `der Weg zum Hinterlegen fehlt: ${run.stderr}`);
    return "Name genannt, Sitzung geholt, Passwort nie gezeigt";
  } finally {
    server.close();
    rmSync(akte, { recursive: true, force: true });
    rmSync(work, { recursive: true, force: true });
  }
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

await checkAsync("Die Fassung steht im Artefakt, also nennt der Spiegel sie", async () => {
  // Fund 4 des zweiten Fremdtests am 28.08.2026. Der Spiegel lag da, in ihm lag
  // arasul-release.json mit der Fassung, und trotzdem sagten `--show` und die
  // Geräteakte „Fassung unbekannt": das Kit las die Zahl nur aus einer Datei
  // VERSION, und die bringt das Artefakt nicht mit.
  const work = mkdtempSync(join(tmpdir(), "ara-fassung-"));
  const source = join(work, "arasul-jet-abc1234");
  const targetMirror = join(work, "ziel");
  const gemerkt = process.env.ARA_MIRROR;

  mkdirSync(source, { recursive: true });
  // Ein Artefakt ohne VERSION, so wie es wirklich kommt.
  writeFileSync(
    join(source, "arasul-release.json"),
    JSON.stringify({ fassung: "2.4.1", einstiegspunkt: "install.sh" }, null, 2)
  );
  writeFileSync(join(source, "install.sh"), "#!/bin/sh\n");
  const tar = spawnSync("tar", ["-czf", join(work, "paket.tar.gz"), "-C", work, "arasul-jet-abc1234"]);
  assert(tar.status === 0, "Testpaket ließ sich nicht bauen");
  const packet = readFileSync(join(work, "paket.tar.gz"));

  const server = createServer((request, response) => {
    response.writeHead(200, { "Content-Type": "application/gzip" });
    response.end(packet);
  });
  await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    const env = { ARASUL_BASIS: base, ARA_MIRROR: targetMirror, ARASUL_TOKEN: "gueltig" };
    let run = await toolAsync("mirror.mjs", ["--refresh"], env);
    assert(run.status === 0, `Holen fehlgeschlagen: ${run.stdout}${run.stderr}`);
    assert(/2\.4\.1/.test(run.stdout), `die Fassung fehlt in der Meldung: ${run.stdout}`);

    const state = JSON.parse(readFileSync(join(targetMirror, "STATE.json"), "utf8"));
    assert(state.version === "2.4.1", `die Fassung kam nicht in den Stand: ${state.version}`);

    // Der Platzhalter, der den Ordner im Repository hält, überlebt das
    // Auspacken. Ohne ihn meldete `git status` im frischen Klon nach der ersten
    // Installation eine gelöschte Datei, die niemand angefasst hatte.
    assert(existsSync(join(targetMirror, ".gitkeep")), ".gitkeep ist beim Auspacken verschwunden");

    run = await toolAsync("mirror.mjs", ["--show"], env);
    assert(/Produktversion: 2\.4\.1/.test(run.stdout), `--show nennt die Fassung nicht: ${run.stdout}`);

    // Ein Spiegel aus der Zeit davor trägt im Stand keine Zahl. Sie liegt
    // trotzdem daneben, also wird sie gelesen statt „unbekannt" gesagt.
    writeFileSync(
      join(targetMirror, "STATE.json"),
      JSON.stringify({ fetched: new Date().toISOString(), source: base, version: null })
    );
    run = await toolAsync("mirror.mjs", ["--show"], env);
    assert(/Produktversion: 2\.4\.1/.test(run.stdout), `ein alter Stand bleibt unbekannt: ${run.stdout}`);
    assert(/arasul-release\.json/.test(run.stdout), "es wird nicht gesagt, woher die Fassung kommt");

    // Und dieselbe Zahl geht in den Ordnernamen am Gerät, statt „installer".
    process.env.ARA_MIRROR = targetMirror;
    assert(releaseVersion(targetMirror) === "2.4.1", "die Fassung wird aus dem Artefakt nicht gelesen");
    assert(mirrorState().version === "2.4.1", "der Stand liefert die Fassung nicht nach");
    assert(/arasul-2\.4\.1/.test(installTarget(mirrorState().version)), "das Ziel am Gerät trägt die Fassung nicht");
    return "2.4.1 aus arasul-release.json";
  } finally {
    if (gemerkt === undefined) delete process.env.ARA_MIRROR;
    else process.env.ARA_MIRROR = gemerkt;
    server.close();
    rmSync(work, { recursive: true, force: true });
  }
});

// --- Stand des Kits ----------------------------------------------------------

check("Der Stand des Kits ist lesbar und die Aenderungsliste passt dazu", () => {
  const version = readFileSync(join(ROOT, ".ara", "VERSION"), "utf8").trim();
  assert(/^\d+\.\d+\.\d+$/.test(version), `.ara/VERSION ist keine Nummer: ${version}`);

  const entries = parseChangelog(readFileSync(join(ROOT, ".ara", "CHANGELOG.md"), "utf8"));
  assert(entries.length > 0, "die Aenderungsliste hat keinen einzigen Eintrag in der erwarteten Form");
  assert(entries[0].version === version, `oberster Eintrag ${entries[0].version}, .ara/VERSION sagt ${version}`);
  assert(entries[0].lines.length > 0, "der oberste Eintrag nennt keine einzige Aenderung");

  // Die Zeile im Text und die Fassungen im Code sind zwei Aussagen ueber
  // dasselbe. Laufen sie auseinander, liest ein Partner die falsche.
  assert(
    entries[0].contract === KIT_CONTRACT_VERSION,
    `die Aenderungsliste sagt Kontrakt bis ${entries[0].contract}, der Code versteht bis ${KIT_CONTRACT_VERSION}`
  );

  // Die Eintraege stehen absteigend, sonst zeigt "neu seit" das Falsche.
  for (let i = 1; i < entries.length; i++) {
    assert(
      compareVersions(entries[i - 1].version, entries[i].version) > 0,
      `die Aenderungsliste steht nicht absteigend: ${entries[i - 1].version} vor ${entries[i].version}`
    );
  }
  return `${version}, ${entries.length} Eintrag${entries.length === 1 ? "" : "e"}`;
});

check("Was neu ist, richtet sich nach dem Stand, von dem jemand kommt", () => {
  const changelog = [
    "# Kopf, der kein Eintrag ist",
    "",
    "## 0.9.0 (2026-09-02)",
    "",
    "Kontrakt: bis 4",
    "",
    "- Das Neueste.",
    "",
    "## 0.8.0 (2026-09-01)",
    "",
    "- Das davor.",
    "",
    "## Vor 0.8.0",
    "",
    "- Diese Zeile ist kein Eintrag.",
    "",
  ].join("\n");
  const entries = parseChangelog(changelog);
  assert(entries.length === 2, `falsch gelesen: ${entries.map((e) => e.version).join(", ")}`);
  assert(entries[0].contract === 4 && entries[1].contract === null, "die Kontraktzeile wird nicht je Eintrag gelesen");
  assert(entriesSince(entries, "0.8.0").length === 1, "ein bekannter Stand bekommt zu viele Eintraege");
  assert(entriesSince(entries, "0.9.0").length === 0, "der eigene Stand gilt als neu");
  assert(entriesSince(entries, "").length === 2, "ohne bekannten Stand fehlt etwas");
  assert(compareVersions("0.10.0", "0.9.0") > 0, "0.10.0 gilt als aelter als 0.9.0");

  const block = standBlock({ version: "0.9.0", changelog, since: "0.8.0" });
  assert(block.some((z) => /Neu seit 0\.8\.0/.test(z)), "der Herkunftsstand fehlt");
  assert(block.some((z) => /Das Neueste/.test(z)), "das Neue fehlt");
  assert(!block.some((z) => /Das davor/.test(z)), "Bekanntes wird noch einmal erzaehlt");
  assert(block.some((z) => /Kontraktfassungen bis/.test(z)), "die Vertraeglichkeit zum Geraet fehlt");
  const ohne = standBlock({ version: "0.9.0", changelog, since: "0.9.0" });
  assert(ohne.some((z) => /nichts/.test(z)), "ohne Neues wird das nicht gesagt");
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
        frontend: {
          type: "object",
          properties: { verzeichnis: { type: "string", minLength: 1 } },
          required: ["verzeichnis"],
          additionalProperties: false,
        },
        flows: {
          type: "object",
          properties: { verzeichnis: { type: "string", minLength: 1 } },
          required: ["verzeichnis"],
          additionalProperties: false,
        },
      },
      required: ["schema", "id", "name", "version"],
      additionalProperties: false,
    },
    regeln: ["Mindestens eines von frontend und backend. Eine App ohne beides ist nichts."],
  },
  flow_frontmatter: {
    schema: { type: "object", properties: { name: { type: "string" } } },
    rumpf: "Der Auftrag steht als Text unter dem Kopf, nicht im Kopf.",
    regeln: ["Eine Datei je Flow, der Dateiname ist der Name."],
  },
  koepfe: { benutzer: "X-Arasul-User", rolle: "X-Arasul-Role", rollen: ["admin", "mitarbeiter"] },
  schluessel: { kopf: "X-API-Key", praefix: "aras_", bereiche: ["app:deploy"] },
  paket: {
    format: "tar.gz",
    packen: "tar czf paket.tgz -C <ordner> .",
    // Die Wurzel nennt die Ordner als Platzhalter. Daran und an nichts anderem
    // erkennt das Kit, welche Felder des Manifests einen Ordner versprechen.
    wurzel: ["app.json", "<frontend.verzeichnis>/", "<flows.verzeichnis>/"],
    max_archiv_bytes: 200 * 1024 * 1024,
  },
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
  assert(!checkVersion({}).ok, "ein Gerät ohne Kontraktversion gilt als passend");
});

check("Das Kit kennt die höchste Fassung, die es versteht", () => {
  // Ein neueres Gerät ist ein Halt, und das Kit sagt, was ihm fehlt: die
  // Fassung, die es nicht kennt, und die Felder, die es nicht liest. Ein
  // älteres ist kein Halt: geprüft wird ohnehin gegen dessen Schema.
  const neuer = checkVersion({ ...KONTRAKT, kontrakt: KIT_CONTRACT_VERSION + 1, sonderfeld: { x: 1 } });
  assert(!neuer.ok && neuer.state === "device-newer", "neueres Gerät gilt als passend");
  assert(/init/.test(neuer.text), "neueres Gerät führt nicht zum Hinweis auf das Kit-Update");
  assert(new RegExp(`Fassung ${KIT_CONTRACT_VERSION + 1}`).test(neuer.text), "die unbekannte Fassung wird nicht benannt");
  assert(/sonderfeld/.test(neuer.text), "das Kit sagt nicht, welches Feld es nicht liest");

  const aelter = checkVersion({ ...KONTRAKT, kontrakt: KIT_CONTRACT_VERSION - 1 });
  assert(aelter.ok && aelter.state === "device-older", "ein älteres Gerät wird nicht mehr bedient");
  assert(new RegExp(`versteht bis ${KIT_CONTRACT_VERSION}`).test(aelter.text), "das Kit nennt seine höchste Fassung nicht");

  const weiter = checkVersion({ ...KONTRAKT, kontrakt: KIT_CONTRACT_VERSION + 5 });
  assert(new RegExp(`Fassungen ${KIT_CONTRACT_VERSION + 1} bis ${KIT_CONTRACT_VERSION + 5}`).test(weiter.text), "mehrere unbekannte Fassungen werden nicht als Spanne genannt");
  return `Kit versteht bis ${KIT_CONTRACT_VERSION}`;
});

check("Welche Ordner ein Manifest verspricht, sagt der Kontrakt", () => {
  // Das Kit zählt die Felder nicht auf, es liest die Platzhalter aus der Wurzel
  // des Pakets. Kommt dort einer dazu, muss im Kit nichts nachgezogen werden.
  const mit = promisedFolders(KONTRAKT, {
    ...MANIFEST,
    frontend: { verzeichnis: "frontend" },
    flows: { verzeichnis: "flows" },
  });
  assert(mit.map((f) => f.folder).join(",") === "frontend,flows", `falsch gelesen: ${JSON.stringify(mit)}`);
  assert(mit[1].field === "flows.verzeichnis", "das Feld wird nicht mitgenannt");
  assert(promisedFolders(KONTRAKT, MANIFEST).length === 0, "ein Manifest ohne Ordner verspricht welche");
  assert(promisedFolders({}, MANIFEST).length === 0, "ohne Wurzel im Kontrakt rät das Kit");
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
  const appDir = join(ROOT, "apps", "probeapp");
  const work = mkdtempSync(join(tmpdir(), "ara-app-"));
  const quelle = join(work, "probeapp");

  mkdirSync(quelle, { recursive: true });
  writeFileSync(join(quelle, "app.json"), JSON.stringify(MANIFEST, null, 2));
  writeFileSync(join(quelle, "index.html"), "<p>Probe</p>\n");

  // Das Gerät, gespielt. Es prüft den Schlüssel in der Kopfzeile, nimmt genau ein
  // Multipart-Feld `paket` an und antwortet im Umschlag, den Arasul benutzt.
  const gesehen = { key: null, paket: false, inhalt: [], geschaltet: [], entfernt: null };
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
        // Was im Paket liegt, wird ausgepackt und nicht geglaubt: der Umschlag
        // des Multipart fällt weg, der Rest ist das Archiv.
        gesehen.inhalt = [];
        const anfang = rumpf.indexOf(Buffer.from([0x1f, 0x8b]));
        const ende = rumpf.lastIndexOf(Buffer.from("\r\n--"));
        if (anfang >= 0 && ende > anfang) {
          const liste = spawnSync("tar", ["-tzf", "-"], { input: rumpf.subarray(anfang, ende), encoding: "utf8" });
          gesehen.inhalt = liste.stdout.split(/\r?\n/).map((z) => z.trim()).filter(Boolean);
        }
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
  // Die Adresse führt bewusst ins Leere, die Schnittstelle steht in api_base:
  // so wie bei einem Gerät, das nur über einen Tunnel erreichbar ist. Wird
  // api_base nicht gelesen, scheitert unten jeder einzelne Aufruf.
  writeFrontmatter(join(akte, "device.md"), {
    name,
    address: "127.0.0.1:1",
    api_base: base,
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
    assert(
      new RegExp(`Kontraktversion ${KIT_CONTRACT_VERSION}`).test(run.stdout),
      "die Kontraktversion fehlt in der Ausgabe"
    );
    assert(/Regeln für einen Flow/.test(run.stdout), "die Flow-Regeln des Kontrakts fehlen in der Ausgabe");

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

    // Das Kit merkt sich, was es selbst an dieses Gerät geschickt hat. Ohne diese
    // Notiz schlug die Seite ohne --device danach wieder --check und --deploy vor.
    let merker = JSON.parse(readFileSync(stateFile, "utf8")).apps?.probeapp?.[name];
    assert(merker?.deployed?.version === "1.0.0", `der Teststand steht nicht im Merker: ${JSON.stringify(merker)}`);
    assert(merker?.live?.version === "0.9.0", `das Zurückschalten steht nicht im Merker: ${JSON.stringify(merker)}`);

    // Entfernen ist unumkehrbar: ohne die abgetippte Kennung passiert nichts.
    run = await toolAsync("app.mjs", ["--device", name, "--app", "probeapp", "--remove"], env);
    assert(run.status !== 0 && gesehen.entfernt === null, "--remove hat ohne Bestätigung entfernt");
    run = await toolAsync("app.mjs", ["--device", name, "--app", "probeapp", "--remove", "--confirm", "probeapp"], env);
    assert(run.status === 0 && gesehen.entfernt === "bestaetigung=probeapp", "die Rückfrage wird nicht durchgereicht");
    // Was es dort nicht mehr gibt, steht auch nicht mehr im Merker.
    merker = JSON.parse(readFileSync(stateFile, "utf8")).apps?.probeapp?.[name];
    assert(!merker?.deployed && !merker?.live, `die entfernte App steht noch im Merker: ${JSON.stringify(merker)}`);

    // Ein Manifest, das einen Ordner verspricht, den es nicht gibt: das Gerät
    // würde es abweisen, und das Kit sieht es vorher, ohne Paket und ohne Bau.
    const mitFlows = { ...MANIFEST, version: "1.1.0", flows: { verzeichnis: "flows" } };
    writeFileSync(join(quelle, "app.json"), JSON.stringify(mitFlows, null, 2));
    gesehen.paket = false;
    run = await toolAsync("app.mjs", ["--device", name, "--check", quelle], env);
    assert(run.status !== 0 && /verspricht/.test(run.stdout), "der versprochene Ordner fehlt und fällt nicht auf");
    run = await toolAsync("app.mjs", ["--device", name, "--deploy", quelle], env);
    assert(run.status !== 0 && !gesehen.paket, "ein Manifest ohne den versprochenen Ordner wurde eingespielt");

    // Ein leerer Ordner ist auch keine Lieferung.
    mkdirSync(join(quelle, "flows"), { recursive: true });
    run = await toolAsync("app.mjs", ["--device", name, "--check", quelle], env);
    assert(run.status !== 0 && /leer/.test(run.stdout), "ein leerer Ordner gilt als Lieferung");

    // Mit der Datei darin geht es durch, und sie liegt im Paket.
    writeFileSync(join(quelle, "flows", "bericht.md"), "---\nname: bericht\n---\n\nFasse zusammen.\n");
    run = await toolAsync("app.mjs", ["--device", name, "--check", quelle], env);
    assert(run.status === 0, `Manifest mit Flows abgelehnt: ${run.stdout}${run.stderr}`);
    run = await toolAsync("app.mjs", ["--device", name, "--deploy", quelle], env);
    assert(run.status === 0 && gesehen.paket, `Einspielen mit Flows fehlgeschlagen: ${run.stdout}${run.stderr}`);
    assert(gesehen.inhalt.includes("./flows/bericht.md"), `die Flow-Datei fehlt im Paket: ${gesehen.inhalt.join(", ")}`);

    // --base sticht die Akte: für den einen Versuch, der nicht hineingehört.
    writeFrontmatter(join(akte, "device.md"), { api_base: "https://127.0.0.1:1" });
    run = await toolAsync("app.mjs", ["--device", name, "--contract"], env);
    assert(run.status !== 0, "eine tote api_base wird nicht bemerkt");
    run = await toolAsync("app.mjs", ["--device", name, "--contract", "--base", base], env);
    assert(run.status === 0, `--base sticht die Akte nicht: ${run.stderr}${run.stdout}`);

    // Ein Manifest, das das Gerät abweisen würde, wird gar nicht erst geschickt.
    writeFileSync(join(quelle, "app.json"), JSON.stringify({ ...MANIFEST, version: "eins" }));
    gesehen.paket = false;
    run = await toolAsync("app.mjs", ["--device", name, "--deploy", quelle, "--base", base], env);
    assert(run.status !== 0 && !gesehen.paket, "ein ungültiges Manifest wurde eingespielt");

    // Der Weg, den /app geht: nicht ein Ordner, sondern eine App aus apps/.
    // Geschickt wird ihr Bau, und nichts, was daneben liegt.
    mkdirSync(join(appDir, "frontend"), { recursive: true });
    mkdirSync(join(appDir, "plans", "offen"), { recursive: true });
    writeFileSync(join(appDir, "app.json"), JSON.stringify({ ...MANIFEST, frontend: { verzeichnis: "frontend" } }, null, 2));
    writeFileSync(join(appDir, "README.md"), "# Probe\n");
    writeFileSync(join(appDir, "frontend", "index.html"), "<p>Probe</p>\n");
    writeFileSync(join(appDir, "plans", "offen", "2026-01-01-probe.md"), "---\nstand: offen\n---\n");
    assert((await toolAsync("app.mjs", ["--app", "probeapp", "--build"], env)).status === 0, "Bau der App fehlgeschlagen");
    gesehen.paket = false;
    gesehen.inhalt = [];
    run = await toolAsync("app.mjs", ["--device", name, "--app", "probeapp", "--deploy", "--base", base], env);
    assert(run.status === 0 && gesehen.paket, `Einspielen aus der App-Akte fehlgeschlagen: ${run.stdout}${run.stderr}`);
    assert(gesehen.inhalt.includes("./frontend/index.html"), `die Oberfläche fehlt im Paket: ${gesehen.inhalt.join(", ")}`);
    assert(
      !gesehen.inhalt.some((eintrag) => /plans|README/.test(eintrag)),
      `die Arbeit an der App ging mit ins Paket: ${gesehen.inhalt.join(", ")}`
    );
    return "Kontrakt, Prüfung, Flows im Paket, Bau einer App, Teststand, live, zurück, entfernen";
  } finally {
    server.close();
    rmSync(work, { recursive: true, force: true });
    rmSync(akte, { recursive: true, force: true });
    rmSync(appDir, { recursive: true, force: true });
    if (savedState === null) rmSync(stateFile, { force: true });
    else writeFileSync(stateFile, savedState);
  }
});

await checkAsync("Ein selbst installiertes Gerät kennt sein eigenes Zertifikat", async () => {
  // Fund 3 des zweiten Fremdtests am 28.08.2026. Nach `--install arasul` trug
  // die Akte `tls:` leer, und der erste Aufruf gegen die Schnittstelle scheiterte
  // an SELF_SIGNED_CERT_IN_CHAIN. Das Gerät trägt eine eigene Geräte-CA, und das
  // Kit hat zugesehen, wie sie entstanden ist: es weiß hier Bescheid.
  const work = mkdtempSync(join(tmpdir(), "ara-tls-"));
  const keyFile = join(work, "schluessel.pem");
  const certFile = join(work, "zertifikat.pem");
  const gemacht = spawnSync(
    "openssl",
    ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", keyFile, "-out", certFile,
      "-days", "1", "-subj", "/CN=127.0.0.1", "-addext", "subjectAltName=IP:127.0.0.1"],
    { encoding: "utf8" }
  );
  if (gemacht.status !== 0) {
    rmSync(work, { recursive: true, force: true });
    return "übersprungen, openssl stellt hier kein Zertifikat aus";
  }

  const name = "selftest-tls";
  const akte = join(ROOT, "devices", name);
  const server = createHttpsServer(
    { key: readFileSync(keyFile), cert: readFileSync(certFile) },
    (request, response) => {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ data: KONTRAKT }));
    }
  );
  await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
  const base = `https://127.0.0.1:${server.address().port}`;
  const env = { ARASUL_KEY_SELFTEST_TLS: "aras_selbsttest" };

  mkdirSync(akte, { recursive: true });
  cpSync(join(ROOT, ".ara", "templates", "device.md"), join(akte, "device.md"));
  writeFrontmatter(join(akte, "device.md"), {
    name,
    address: "127.0.0.1:1",
    api_base: base,
    verdict: "supported",
    arasul: "found",
    api_key_ref: "ARASUL_KEY_SELFTEST_TLS",
  });

  try {
    // So sah es beim Fremdtest aus: die Akte schweigt zum Zertifikat.
    let run = await toolAsync("app.mjs", ["--device", name, "--contract"], env);
    assert(run.status !== 0, "ein selbst ausgestelltes Zertifikat wurde stillschweigend angenommen");
    assert(/tls: selfsigned/.test(run.stderr), `der Weg heraus fehlt in der Meldung: ${run.stderr}`);

    // Mit dem Eintrag geht es, und nur für dieses eine Gerät.
    writeFrontmatter(join(akte, "device.md"), { tls: "selfsigned" });
    run = await toolAsync("app.mjs", ["--device", name, "--contract"], env);
    assert(run.status === 0, `mit tls: selfsigned scheitert der Kontrakt: ${run.stdout}${run.stderr}`);

    // Und das Werkzeug trägt den Eintrag nach der eigenen Installation selbst
    // ein, statt den Partner in diesen Fehler laufen zu lassen.
    const werkzeug = readFileSync(join(ROOT, ".ara", "tools", "device.mjs"), "utf8");
    assert(/changes\.tls = "selfsigned"/.test(werkzeug), "device.mjs setzt tls nach der Installation nicht");
    const vorlage = readFrontmatter(join(ROOT, ".ara", "templates", "device.md"));
    assert("tls" in vorlage.fields, "die Vorlage der Geräteakte kennt das Feld tls nicht");
    return "ohne Eintrag abgewiesen, mit Eintrag angenommen";
  } finally {
    server.close();
    rmSync(akte, { recursive: true, force: true });
    rmSync(work, { recursive: true, force: true });
  }
});

// --- Doku-Selbsttest ---------------------------------------------------------

check("Routen im Wissen werden gefunden, auch die ohne Verb", () => {
  const files = [
    {
      file: "probe.md",
      text: [
        "Ein Satz mit `GET /api/v1/external/models` darin.",
        "",
        "```",
        "POST /api/v1/external/flows/<name>/run",
        "GET  /apps/<id>/api/me",
        "DELETE /api/v1/external/apps/:id?bestaetigung=<id>",
        "```",
        "",
        "Und ein Weg ohne Verb: `/api/backup/status`.",
        "Kein Weg: /etc/hosts und /arasul/flows.",
      ].join("\n"),
    },
    { file: "zweite.md", text: "Noch einmal `GET /api/v1/external/models`, andere Datei." },
  ];
  const routes = collectRoutes(files);
  const pfade = routes.map((r) => `${r.verb} ${r.path}`);
  assert(pfade.includes("GET /api/v1/external/models"), `nicht gefunden: ${pfade.join(", ")}`);
  assert(pfade.includes("POST /api/v1/external/flows/:wert/run"), "der Platzhalter wird nicht vereinheitlicht");
  assert(pfade.includes("GET /apps/:wert/api/me"), "ein Weg unter /apps fehlt");
  assert(pfade.includes("DELETE /api/v1/external/apps/:id"), "die Frage am Pfad wird nicht abgeschnitten");
  assert(!pfade.some((p) => /etc\/hosts|arasul\/flows/.test(p)), `ein Dateipfad gilt als Route: ${pfade.join(", ")}`);
  assert(routes.find((r) => r.path === "/api/v1/external/models").files.length === 2, "die zweite Fundstelle fehlt");

  const bare = bareApiPaths(files);
  assert(bare.length === 1 && bare[0].path === "/api/backup/status", `ohne Verb falsch gelesen: ${JSON.stringify(bare)}`);
  assert(callable("/apps/:wert/api/me").split("/")[2].length > 0, "ein Platzhalter wird nicht gefuellt");
  return `${routes.length} Routen, 1 ohne Verb`;
});

check("Jede Route bekommt den Weg, auf dem sie zu pruefen ist", () => {
  const lesen = planFor({ verb: "GET", path: "/api/v1/external/apps/:id" }, KONTRAKT);
  assert(lesen.how === "kontrakt", "ein Weg mit einem Wert darin wird trotzdem gerufen");
  const schreiben = planFor({ verb: "POST", path: "/api/v1/external/apps" }, KONTRAKT);
  assert(schreiben.how === "kontrakt", "ein veraendernder Weg wird gerufen");
  const kontrakt = planFor({ verb: "GET", path: "/api/v1/external/contract" }, KONTRAKT);
  assert(kontrakt.how === "gerufen", "ein lesender Weg ohne Wert wird nicht gerufen");
  const sitzung = planFor({ verb: "GET", path: "/api/irgendwas" }, KONTRAKT);
  assert(sitzung.how === "ohne-schluessel", "ein Weg der Oberflaeche wird mit Schluessel gerufen");
  const fremd = planFor({ verb: "GET", path: `${EXTERNAL_PREFIX}/gibtsnicht` }, KONTRAKT);
  assert(fremd.kind === "extern-unbekannt", "ein unbekannter aeusserer Weg faellt nicht auf");

  assert(judgeRoute(kontrakt, { status: 200 }).state === "ok", "200 gilt nicht als Beleg");
  assert(judgeRoute(kontrakt, { status: 404 }).state === "fehlt", "404 gilt nicht als Gegenbeleg");
  assert(judgeRoute(kontrakt, { status: 0, error: { message: "tot" } }).state === "unklar", "keine Antwort gilt als Urteil");
  assert(judgeRoute(sitzung, { status: 401 }).state === "ok", "eine Abweisung gilt nicht als Beleg");
  assert(judgeRoute(fremd, null).state === "fehlt", "ein Weg ausserhalb des Kontrakts gilt als vorhanden");
  assert(judgeRoute(schreiben, null).state === "ok", "der Kontrakt selbst gilt nicht als Beleg");

  // Der Kontrakt selbst ist nie "nicht beschrieben": ihn kennt das Kit
  // auswendig, und kein Verfahren fuehrt ihn als Route auf.
  const offen = undocumented(KONTRAKT, []);
  assert(offen.length === KONTRAKT.endpunkte.length - 1, `nicht beschriebene Endpunkte falsch gezaehlt: ${offen.length}`);
  assert(!offen.some((e) => /contract/.test(e.path)), "der Kontrakt selbst gilt als nicht beschrieben");
});

await checkAsync("check-docs.mjs prueft jede Route des Wissens am Geraet", async () => {
  // Gegen ein gespieltes Geraet, dessen Kontrakt genau die aeusseren Routen
  // nennt, die im Wissen dieses Kits stehen. Damit haengt der Test an keinem
  // Produktwert: was das Wissen nennt, wird hier zur Erwartung, und das
  // Werkzeug muss beides zur Deckung bringen.
  const name = "selftest-doku";
  const akte = join(ROOT, "devices", name);
  const knowledge = join(ROOT, ".ara", "knowledge");
  const files = readdirSync(knowledge)
    .filter((datei) => datei.endsWith(".md"))
    .map((datei) => ({ file: datei, text: readFileSync(join(knowledge, datei), "utf8") }));
  const routes = collectRoutes(files);
  const aussen = routes.filter((route) => route.path.startsWith(`${EXTERNAL_PREFIX}/`));
  const innen = routes.filter((route) => !route.path.startsWith(`${EXTERNAL_PREFIX}/`));
  assert(aussen.length > 0 && innen.length > 0, "das Wissen nennt nicht beide Arten von Weg");

  // Was das Geraet weglaesst: ein aeusserer Weg fehlt in seinem Kontrakt, ein
  // Weg der Oberflaeche antwortet mit 404. Beides muss auffallen, und nur das.
  const fehltAussen = aussen[aussen.length - 1];
  const fehltInnen = innen[innen.length - 1];
  // Die beiden Luecken sind umschaltbar: derselbe Server spielt erst das Geraet
  // mit zwei Luecken und danach das heile.
  const luecke = { aussen: fehltAussen, innen: fehltInnen };
  const kontrakt = { ...KONTRAKT, endpunkte: [] };
  const kontraktSchreiben = () => {
    kontrakt.endpunkte = [
      { verb: "GET", pfad: "/api/v1/external/contract", bereich: null, was: "Dieser Kontrakt" },
      ...aussen
        .filter((route) => route !== luecke.aussen)
        .map((route) => ({ verb: route.verb, pfad: route.path, bereich: null, was: "aus dem Wissen des Kits" })),
    ];
  };
  kontraktSchreiben();

  const gesehen = [];
  const server = createServer((request, response) => {
    const pfad = request.url.split("?")[0];
    gesehen.push(`${request.method} ${pfad}${request.headers["x-api-key"] ? " +schluessel" : ""}`);
    const antwort = (status, body) => {
      response.writeHead(status, { "Content-Type": "application/json" });
      response.end(JSON.stringify(body));
    };
    if (pfad === "/api/v1/external/contract") {
      if (request.headers["x-api-key"] !== "aras_selbsttest") return antwort(401, { error: { message: "kein Schluessel" } });
      return antwort(200, { data: kontrakt });
    }
    // Ein Weg der Oberflaeche weist ohne Ausweis ab, das ist der Beleg.
    if (innen.some((route) => callable(route.path) === pfad && route !== luecke.innen)) {
      return antwort(401, { error: { message: "Anmeldung noetig" } });
    }
    if (aussen.some((route) => callable(route.path) === pfad && route !== luecke.aussen)) {
      return antwort(200, { data: {} });
    }
    antwort(404, { error: { message: "kennt dieses Geraet nicht" } });
  });
  await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
  const base = `http://127.0.0.1:${server.address().port}`;
  const env = { ARASUL_KEY_SELFTEST: "aras_selbsttest" };

  mkdirSync(akte, { recursive: true });
  cpSync(join(ROOT, ".ara", "templates", "device.md"), join(akte, "device.md"));
  writeFrontmatter(join(akte, "device.md"), {
    name,
    address: "127.0.0.1:1",
    api_base: base,
    verdict: "supported",
    arasul: "found",
    api_key_ref: "ARASUL_KEY_SELFTEST",
  });

  try {
    // Ohne Geraet: die Liste, und kein Aufruf.
    let run = await toolAsync("check-docs.mjs", [], env);
    assert(run.status === 0, `Liste fehlgeschlagen: ${run.stderr}`);
    assert(new RegExp(`${routes.length} Routen`).test(run.stdout), `die Zahl stimmt nicht: ${run.stdout.split("\n")[0]}`);

    run = await toolAsync("check-docs.mjs", ["--device", name, "--json"], env);
    const lage = JSON.parse(run.stdout);
    const urteil = new Map(lage.results.map((r) => [`${r.verb} ${r.path}`, r]));
    assert(urteil.size === routes.length, `nicht jede Route wurde geprueft: ${urteil.size} von ${routes.length}`);

    const fehlend = lage.results.filter((r) => r.state === "fehlt").map((r) => `${r.verb} ${r.path}`);
    assert(
      fehlend.length === 2 &&
        fehlend.includes(`${fehltAussen.verb} ${fehltAussen.path}`) &&
        fehlend.includes(`${fehltInnen.verb} ${fehltInnen.path}`),
      `falsch beurteilt, gemeldet fehlen: ${fehlend.join(", ")}`
    );
    assert(run.status === 1, "eine fehlende Route beendet den Lauf nicht mit einem Fehler");

    // An der aeusseren Schnittstelle wurde nichts gerufen, was etwas veraendert:
    // dort haelt das Kit den Schluessel, und ein Deploy oder ein Entfernen als
    // Nebenwirkung einer Doku-Pruefung waere ein Schaden.
    const mitSchluessel = gesehen.filter((zeile) => zeile.includes("+schluessel"));
    assert(
      mitSchluessel.every((zeile) => zeile.startsWith("GET ")),
      `mit Schluessel wurde etwas Veraenderndes gerufen: ${mitSchluessel.join(", ")}`
    );
    assert(
      !gesehen.some((zeile) => !zeile.startsWith("GET ") && zeile.includes(EXTERNAL_PREFIX)),
      `an der aeusseren Schnittstelle wurde veraendernd gerufen: ${gesehen.join(", ")}`
    );
    // Ein Weg der Oberflaeche bekommt keinen Schluessel: das Kit hat dort keine
    // Sitzung, und die Abweisung ist genau der Beleg, den es sucht.
    for (const route of innen) {
      const zeile = gesehen.find((z) => z.startsWith(`${route.verb} ${callable(route.path)}`));
      assert(zeile, `${route.verb} ${route.path} wurde gar nicht gerufen`);
      assert(!zeile.includes("+schluessel"), `${route.path} wurde mit Schluessel gerufen: ${zeile}`);
    }

    // Ohne die beiden Luecken ist alles gruen.
    luecke.aussen = null;
    luecke.innen = null;
    kontraktSchreiben();
    run = await toolAsync("check-docs.mjs", ["--device", name], env);
    assert(run.status === 0, `heiles Geraet wird gemeldet: ${run.stdout}`);
    assert(/Alle \d+ Routen gibt es an diesem Gerät/.test(run.stdout), `kein gruener Satz: ${run.stdout}`);
    return `${routes.length} Routen, ${aussen.length} ueber den Kontrakt, ${innen.length} ohne Ausweis`;
  } finally {
    server.close();
    rmSync(akte, { recursive: true, force: true });
  }
});

// --- Leistungsbeschreibung am Geraet -----------------------------------------

await checkAsync("Die Leistungsbeschreibung bekommt ihre Werte vom Geraet", async () => {
  // Das Papier wird unterschrieben. Geprueft wird darum zweierlei: dass die
  // gemessenen Werte wirklich hineinkommen, und dass ein Feld, zu dem das Geraet
  // nichts sagt, leer bleibt und mit einer Begruendung genannt wird.
  const name = "selftest-papier";
  const akte = join(ROOT, "devices", name);
  const datei = join(akte, `leistungsbeschreibung-${new Date().toISOString().slice(0, 10)}.md`);

  // Zwei Geraete in einem: erst eines, das Modelle und Apps aufzaehlt, dann
  // eines, das beides nicht kennt.
  const reich = {
    ...KONTRAKT,
    arasul: "9.9.9-gespielt",
    endpunkte: [
      ...KONTRAKT.endpunkte,
      { verb: "GET", pfad: "/api/v1/external/apps", bereich: "app:deploy", was: "Welche Apps stehen auf dem Geraet" },
      { verb: "GET", pfad: "/api/v1/external/models", bereich: "llm:status", was: "Welche Modelle am Geraet sind" },
    ],
  };
  const arm = { ...KONTRAKT, arasul: "9.9.9-gespielt" };
  const lage = { kontrakt: reich };

  const server = createServer((request, response) => {
    const pfad = request.url.split("?")[0];
    const antwort = (status, body) => {
      response.writeHead(status, { "Content-Type": "application/json" });
      response.end(JSON.stringify(body));
    };
    if (request.headers["x-api-key"] !== "aras_selbsttest") {
      return antwort(401, { error: { message: "kein Schluessel" } });
    }
    if (pfad === "/api/v1/external/contract") return antwort(200, { data: lage.kontrakt });
    if (pfad === "/api/v1/external/models" && lage.kontrakt === reich) {
      return antwort(200, { data: { models: [{ name: "modell-gross:q4" }, "modell-klein:q8"] } });
    }
    if (pfad === "/api/v1/external/apps" && lage.kontrakt === reich) {
      return antwort(200, { data: [{ id: "probeapp", live: { version: "1.2.0" }, test: { version: "1.3.0" } }] });
    }
    antwort(404, { error: { message: "kennt dieses Geraet nicht" } });
  });
  await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
  const base = `http://127.0.0.1:${server.address().port}`;
  const env = { ARASUL_KEY_SELFTEST: "aras_selbsttest" };

  mkdirSync(akte, { recursive: true });
  cpSync(join(ROOT, ".ara", "templates", "device.md"), join(akte, "device.md"));
  writeFrontmatter(join(akte, "device.md"), {
    name,
    model: "Gespieltes Geraet A1",
    serial: "SN-0815",
    address: "127.0.0.1:1",
    api_base: base,
    verdict: "supported",
    arasul: "found",
    api_key_ref: "ARASUL_KEY_SELFTEST",
  });

  try {
    let run = await toolAsync("service-description.mjs", ["--device", name, "--json"], env);
    assert(run.status === 0, `Erhebung fehlgeschlagen: ${run.stderr}${run.stdout}`);
    const ergebnis = JSON.parse(run.stdout);
    assert(ergebnis.measured.arasul === "9.9.9-gespielt", "der Softwarestand kommt nicht vom Geraet");
    assert(ergebnis.measured.kontrakt === KIT_CONTRACT_VERSION, "die Kontraktfassung fehlt");
    assert(ergebnis.measured.models.join(",") === "modell-gross:q4,modell-klein:q8", `Modelle falsch gelesen: ${ergebnis.measured.models}`);
    assert(ergebnis.open.length === 0, `unnoetig offen: ${ergebnis.open.map((o) => o.name).join(", ")}`);

    const papier = readFileSync(datei, "utf8");
    assert(/Softwarestand: 9\.9\.9-gespielt/.test(papier), "der Softwarestand steht nicht im Papier");
    assert(new RegExp(`Kontraktfassung des Geräts: ${KIT_CONTRACT_VERSION}`).test(papier), "die Kontraktfassung steht nicht im Papier");
    assert(/Sprachmodell bei der Übergabe: \*\*modell-gross:q4/.test(papier), "das Modell steht nicht in Abschnitt 5");
    assert(/installierte Erweiterungen: \*\*probeapp \(live 1\.2\.0\)/.test(papier), "die App steht nicht in Abschnitt 6");
    assert(/Gemessen am \d{4}-\d{2}-\d{2}/.test(papier), "im Papier steht nicht, wann gemessen wurde");
    assert(/ERHEBUNG .*Kit-Schlüssel ARASUL_KEY_SELFTEST/.test(papier), "die Herkunft der Werte fehlt");
    assert(!/aras_selbsttest/.test(papier), "der Schluessel steht im Papier");
    assert(/\{Stufe\}/.test(papier), "der Reifegrad wurde gefuellt, obwohl ihn niemand gemessen hat");

    // Eine zweite Fassung desselben Tages ersetzt die erste nicht von allein:
    // in einem Streit zaehlt die Fassung, die bei Vertragsschluss galt.
    run = await toolAsync("service-description.mjs", ["--device", name], env);
    assert(run.status !== 0 && /liegt schon/.test(run.stderr), "eine vorhandene Fassung wird ueberschrieben");

    // Ein Geraet, das weder Modelle noch Apps aufzaehlt: beide Felder bleiben
    // Platzhalter, und es steht dabei, warum.
    lage.kontrakt = arm;
    run = await toolAsync("service-description.mjs", ["--device", name, "--json", "--force"], env);
    assert(run.status === 0, `zweite Erhebung fehlgeschlagen: ${run.stderr}`);
    const knapp = JSON.parse(run.stdout);
    const offen = new Map(knapp.open.map((o) => [o.name, o.why]));
    assert(offen.has("Sprachmodell"), "ohne Modellauskunft wird trotzdem etwas eingetragen");
    assert(offen.has("Installierte Erweiterungen"), "ohne Auskunft ueber Apps wird trotzdem etwas eingetragen");
    assert(/keinen Endpunkt|nicht/.test(offen.get("Sprachmodell")), `keine Begruendung: ${offen.get("Sprachmodell")}`);
    const knappesPapier = readFileSync(datei, "utf8");
    assert(/\{Kennung und Fassung\}/.test(knappesPapier), "ein ungemessener Wert wurde erfunden");
    assert(!/\*\*keine\*\*/.test(knappesPapier), "eine leere Antwort wurde zu einem zugesagten keine");
    return "gemessen, geschrieben, Herkunft je Wert, Ungemessenes bleibt offen";
  } finally {
    server.close();
    rmSync(akte, { recursive: true, force: true });
  }
});

// --- Die Akte einer App ------------------------------------------------------

check("Eine App entsteht aus der Vorlage und kennt ihren nächsten Schritt", () => {
  const stateFile = join(ROOT, ".ara", "state.json");
  const savedState = existsSync(stateFile) ? readFileSync(stateFile, "utf8") : null;
  const name = "selftest-app";
  const dir = join(ROOT, "apps", name);
  try {
    let run = tool("app.mjs", ["--app", name, "--new", "--titel", "Probe"]);
    assert(run.status === 0, `Anlegen fehlgeschlagen: ${run.stderr}${run.stdout}`);
    for (const datei of ["app.json", "README.md", "backend/Dockerfile", "flows/freigabe.md", "frontend/src/design.css"]) {
      assert(existsSync(join(dir, datei)), `aus der Vorlage fehlt: ${datei}`);
    }
    const manifest = JSON.parse(readFileSync(join(dir, "app.json"), "utf8"));
    assert(manifest.id === name && manifest.name === "Probe", "die Platzhalter der Vorlage wurden nicht ersetzt");
    assert(
      !/\{\{[a-z]+\}\}/.test(readFileSync(join(dir, "README.md"), "utf8")),
      "in der README steht noch ein Platzhalter"
    );

    // Zweimal dieselbe App gibt es nicht, und der Ordner bleibt, wie er ist.
    run = tool("app.mjs", ["--app", name, "--new"]);
    assert(run.status !== 0 && /gibt es schon/.test(run.stderr), "eine App wurde zweimal angelegt");

    // Der Plan: einer aktiv, nicht zwei.
    assert(tool("app.mjs", ["--app", name, "--plan", "Erste Fassung"]).status === 0, "Plan nicht angelegt");
    assert(tool("app.mjs", ["--app", name, "--plan", "Zweite Fassung"]).status === 0, "zweiter Plan nicht angelegt");
    const offen = readdirSync(join(dir, "plans", "offen"));
    assert(offen.length === 2, `Pläne liegen nicht unter offen/: ${offen.join(", ")}`);
    assert(tool("app.mjs", ["--app", name, "--plan-aktiv", offen[0]]).status === 0, "Plan nicht aktiv gesetzt");
    run = tool("app.mjs", ["--app", name, "--plan-aktiv", offen[1]]);
    assert(run.status !== 0 && /Höchstens ein Plan/.test(run.stderr), "zwei Pläne wurden aktiv");
    const { fields } = readFrontmatter(join(dir, "plans", "aktiv", offen[0]));
    assert(fields.stand === "aktiv", "der Stand im Frontmatter wandert nicht mit");

    // Die Lage: der nächste Schritt ist der Bau, und die Vorlage taugt für keinen
    // Vorschlag, den es nicht gibt.
    run = tool("app.mjs", ["--app", name, "--json"]);
    const lage = JSON.parse(run.stdout);
    assert(lage.plans.aktiv.length === 1 && lage.plans.offen.length === 1, "die Lage zählt die Pläne falsch");
    assert(!lage.build.exists, "ein Bau ohne Bau");
    assert(
      lage.steps.some((s) => /--build/.test(s.wie || "")),
      `der Bau wird nicht vorgeschlagen: ${JSON.stringify(lage.steps)}`
    );

    // Ohne Bau wird nichts eingespielt, auch nicht an ein Gerät, das antwortet.
    run = tool("app.mjs", ["--device", "gibtsnicht", "--app", name, "--deploy"]);
    assert(run.status !== 0, "ohne Bau wurde eingespielt");
    return "anlegen, Pläne, Lage";
  } finally {
    rmSync(dir, { recursive: true, force: true });
    if (savedState === null) rmSync(stateFile, { force: true });
    else writeFileSync(stateFile, savedState);
  }
});

check("Was live ist, wird nicht noch einmal vorgeschlagen", () => {
  // Fund 5 des zweiten Fremdtests am 28.08.2026. `--app <name>` ohne `--device`
  // kannte nur die Platte: es sah einen frischen Bau und schlug `--check` und
  // `--deploy` vor, obwohl dieselbe Fassung längst live war. Ein Vorschlag, der
  // einen erledigten Schritt wiederholt, ist keiner.
  const app = {
    name: "probeapp",
    dir: join(ROOT, "apps", "probeapp"),
    exists: true,
    manifest: { id: "probeapp", version: "1.0.0" },
    manifestProblem: null,
    readme: true,
    plans: {
      offen: [],
      aktiv: [{ file: "2026-08-27-erste.md", state: "aktiv", path: "", titel: "Erste Fassung" }],
      erledigt: [],
    },
    build: { exists: true, version: "1.0.0", id: "probeapp", stale: false, time: "2026-08-28 09:00" },
  };
  const wie = (steps) => steps.map((s) => s.wie || "").join(" ");
  const was = (steps) => steps.map((s) => s.was).join(" ");

  // Ohne Merker bleibt alles, wie es war: prüfen, dann einspielen.
  const ohne = nextSteps(app, {});
  assert(/--check/.test(wie(ohne)) && /--deploy/.test(wie(ohne)), `ohne Merker fehlt der Weg an das Gerät: ${wie(ohne)}`);

  // Im Teststand: live schalten, und nicht noch einmal einspielen.
  const teststand = {
    place: "orin",
    deployed: { version: "1.0.0", stand: "test", time: "2026-08-28 10:00" },
  };
  const imTest = nextSteps(app, { stand: teststand });
  assert(/--live/.test(wie(imTest)), `der nächste Schritt ist nicht das Schalten: ${wie(imTest)}`);
  assert(!/--deploy/.test(wie(imTest)), `es wird noch einmal eingespielt: ${wie(imTest)}`);
  assert(/ --device orin/.test(wie(imTest)), `das Gerät aus dem Merker fehlt im Aufruf: ${wie(imTest)}`);

  // Live: am Gerät ist nichts offen, dran ist der Plan.
  const live = { ...teststand, live: { version: "1.0.0", time: "2026-08-28 10:30" } };
  const istLive = nextSteps(app, { stand: live });
  assert(!/--deploy|--check|--live/.test(wie(istLive)), `nach live wird weiter geschaltet: ${wie(istLive)}`);
  assert(/live/.test(was(istLive)), `es wird nicht gesagt, dass die Fassung live ist: ${was(istLive)}`);
  assert(/--plan-erledigt/.test(wie(istLive)), `der Plan wird nicht zum Abschluss gebracht: ${wie(istLive)}`);

  // Eine ältere Fassung am Gerät sagt über die neue nichts.
  const alt = { place: "orin", live: { version: "0.9.0", time: "2026-08-20 08:00" } };
  assert(/--deploy/.test(wie(nextSteps(app, { stand: alt }))), "eine alte Live-Fassung hält den neuen Bau auf");

  // Und der Merker wählt das Gerät: ohne Angabe das jüngste, mit Angabe genau das.
  const merker = {
    orin: { live: { version: "1.0.0", time: "2026-08-20 08:00" } },
    "kunde/werk2": { deployed: { version: "1.0.0", stand: "test", time: "2026-08-28 12:00" } },
  };
  assert(lastStand(merker)?.place === "kunde/werk2", "ohne Angabe gilt nicht der jüngste Eintrag");
  assert(lastStand(merker, "orin")?.place === "orin", "mit Angabe wird das falsche Gerät genommen");
  assert(lastStand(merker, "werk2")?.place === "kunde/werk2", "ein Kundengerät wird über seinen Namen nicht gefunden");
  assert(lastStand({}, null) === null, "ein leerer Merker liefert einen Stand");
  const beiKunde = nextSteps(app, { stand: lastStand(merker) });
  assert(/--customer kunde --device werk2/.test(wie(beiKunde)), `das Kundengerät fehlt im Aufruf: ${wie(beiKunde)}`);
  return "ohne Merker, im Teststand, live, veraltet";
});

check("Der Plan der Referenz-App bleibt liegen", () => {
  // Fund 6 des zweiten Fremdtests am 28.08.2026. `--plan-erledigt` verschob den
  // Plan der Referenz-App, und der war versioniert: der frische Klon war danach
  // schmutzig, und das nächste Update stolperte darüber. Die Referenz-App gehört
  // dem Kit und ist zum Ansehen da.
  const listed = spawnSync("git", ["ls-files", "-z", "apps/urlaubsantrag/plans"], { cwd: ROOT, encoding: "utf8" });
  if (listed.status !== 0) return "übersprungen, kein Git-Repository";
  const versionierte = listed.stdout.split("\0").filter(Boolean);
  assert(versionierte.length > 0, "die Referenz-App bringt keinen Plan mehr mit");

  assert(versioned(join(ROOT, versionierte[0])), "eine versionierte Datei wird nicht als solche erkannt");
  assert(!versioned(join(ROOT, ".ara", "state.json")), "eine Datei außerhalb der Versionsverwaltung gilt als versioniert");

  const app = readApp("urlaubsantrag");
  const plan = app.plans.aktiv[0] || app.plans.offen[0];
  assert(plan, "die Referenz-App hat keinen Plan, an dem sich das prüfen ließe");
  let abgelehnt = null;
  try {
    movePlan(app, plan.file, "erledigt");
  } catch (error) {
    abgelehnt = error.message;
  }
  assert(abgelehnt, "der Plan der Referenz-App wurde verschoben");
  assert(/Versionsverwaltung/.test(abgelehnt), `die Begründung nennt den Grund nicht: ${abgelehnt}`);
  assert(existsSync(plan.path), "der Plan liegt nicht mehr da, wo er lag");

  // Der Arbeitsordner bleibt sauber, an genau den zwei Stellen, an denen ihn der
  // Fremdtest schmutzig gemacht hat. Der Rest der Referenz-App ist nicht gemeint:
  // wer dort etwas ändert, tut es absichtlich.
  const status = spawnSync("git", ["status", "--porcelain", "--", "apps/urlaubsantrag/plans", ".ara/mirror/.gitkeep"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert(status.stdout.trim() === "", `der Arbeitsordner ist schmutzig: ${status.stdout}`);
  assert(existsSync(join(ROOT, ".ara", "mirror", ".gitkeep")), "der Platzhalter des Spiegels fehlt");

  // Für eine eigene App bleibt der Weg offen.
  const eigen = {
    name: "selftest-eigen",
    dir: mkdtempSync(join(tmpdir(), "ara-plan-")),
    plans: { offen: [], aktiv: [], erledigt: [] },
  };
  try {
    mkdirSync(join(eigen.dir, "plans", "aktiv"), { recursive: true });
    const datei = "2026-08-28-eigener-plan.md";
    writeFileSync(join(eigen.dir, "plans", "aktiv", datei), "---\nstand: aktiv\n---\n\nText\n");
    eigen.plans.aktiv = [{ file: datei, state: "aktiv", path: join(eigen.dir, "plans", "aktiv", datei), titel: "Eigen" }];
    const bewegt = movePlan(eigen, datei, "erledigt");
    assert(bewegt.to === "erledigt" && existsSync(bewegt.path), "ein eigener Plan lässt sich nicht abschließen");
  } finally {
    rmSync(eigen.dir, { recursive: true, force: true });
  }
  return `${versionierte.length} versionierte Pläne, keiner beweglich`;
});

check("Der Bau nimmt das Paket und lässt die Arbeit daran liegen", () => {
  const stateFile = join(ROOT, ".ara", "state.json");
  const savedState = existsSync(stateFile) ? readFileSync(stateFile, "utf8") : null;
  const name = "selftest-bau";
  const dir = join(ROOT, "apps", name);
  try {
    // Eine App ohne eigenen Bau: das Frontend liegt fertig vor. So läuft der
    // Selbsttest ohne Netz, und geprüft wird genau der Schnitt des Ordners.
    mkdirSync(join(dir, "frontend"), { recursive: true });
    mkdirSync(join(dir, "flows"), { recursive: true });
    mkdirSync(join(dir, "plans", "offen"), { recursive: true });
    writeFileSync(join(dir, "app.json"), JSON.stringify({ schema: 1, id: name, name: "Bau", version: "1.0.0" }, null, 2));
    writeFileSync(join(dir, "README.md"), "# Bau\n");
    writeFileSync(join(dir, "frontend", "index.html"), "<p>fertig</p>\n");
    writeFileSync(join(dir, "flows", "probe.md"), "---\nname: probe\n---\n\nTu etwas.\n");
    writeFileSync(join(dir, "plans", "offen", "2026-01-01-probe.md"), "---\nstand: offen\n---\n");

    const run = tool("app.mjs", ["--app", name, "--build"]);
    assert(run.status === 0, `Bau fehlgeschlagen: ${run.stderr}${run.stdout}`);
    const build = join(dir, "build");
    for (const datei of ["app.json", "frontend/index.html", "flows/probe.md"]) {
      assert(existsSync(join(build, datei)), `im Paket fehlt: ${datei}`);
    }
    for (const draussen of ["plans", "README.md", "build"]) {
      assert(!existsSync(join(build, draussen)), `im Paket liegt, was nicht hineingehört: ${draussen}`);
    }

    // Ein Bau, der älter ist als die Quelle, wird als solcher erkannt und nicht
    // eingespielt: sonst ginge der Stand von vorgestern an das Gerät.
    writeFileSync(join(dir, "frontend", "index.html"), "<p>neuer</p>\n");
    const lage = JSON.parse(tool("app.mjs", ["--app", name, "--json"]).stdout);
    assert(lage.build.stale, "ein veralteter Bau fällt nicht auf");
    const abgewiesen = tool("app.mjs", ["--device", "gibtsnicht", "--app", name, "--deploy"]);
    assert(abgewiesen.status !== 0, "ein veralteter Bau wurde eingespielt");
    return "app.json, frontend, flows im Paket, Pläne und README draußen";
  } finally {
    rmSync(dir, { recursive: true, force: true });
    if (savedState === null) rmSync(stateFile, { force: true });
    else writeFileSync(stateFile, savedState);
  }
});

check("Ein Gerät ohne Arasul bekommt zwei Container und den Satz, was fehlt", () => {
  const manifest = {
    schema: 1,
    id: "probeapp",
    name: "Probe",
    version: "1.0.0",
    frontend: { verzeichnis: "frontend" },
    backend: { image: "arasul-probeapp:1.0.0", bauen: { verzeichnis: "backend" }, umgebung: { ARASUL_APP_NAME: "Probe" } },
    ports: { backend: 8080 },
  };
  const datei = composeFile(manifest, { port: 8081 });
  assert(/build:\s*\n\s+context: \.\/backend/.test(datei), "das Backend wird nicht am Gerät gebaut");
  assert(/PORT: "8080"/.test(datei), "der Port aus dem Manifest steht nicht im Container");
  assert(/- "8081:80"/.test(datei), "der Port am Gerät fehlt");
  assert(!/8080:8080/.test(datei), "das Backend hängt am Gerät, obwohl ein Webserver davor steht");
  for (const satz of WAS_FEHLT) {
    assert(datei.includes(satz), `im Kopf der Datei fehlt: ${satz.slice(0, 30)}`);
  }
  assert(/Anmeldung/.test(WAS_FEHLT.join(" ")) && /Freigaben/.test(WAS_FEHLT.join(" ")), "der Satz nennt nicht, was fehlt");

  const conf = nginxConf(manifest);
  assert(/proxy_pass http:\/\/backend:8080\//.test(conf), "die Schnittstelle wird nicht weitergereicht");
  assert(/location \/api\//.test(conf), "die App findet ihre Schnittstelle nicht unter /api/");

  // Ohne Backend gibt es nichts weiterzureichen, und keinen zweiten Container.
  const nurSeite = composeFile({ ...manifest, backend: undefined, ports: undefined });
  assert(!/backend:/.test(nurSeite), "eine App ohne Backend bekommt trotzdem einen Container dafür");
  assert(!/location \/api\//.test(nginxConf({ ...manifest, backend: undefined })), "ohne Backend wird weitergereicht");
});

await checkAsync("Ein Urlaubsantrag hält an, ein Mensch entscheidet, er ist genehmigt", async () => {
  // Die Referenz-App, gegen ein Gerät, das gespielt wird. Geprüft wird der Weg,
  // um den es in dieser App geht: sie startet einen Flow, der Lauf hält an, ein
  // MENSCH entscheidet, und erst danach steht der Antrag auf genehmigt. Die App
  // entscheidet dabei nichts: sie liest nur.
  const backend = join(ROOT, "apps", "urlaubsantrag", "backend", "server.mjs");
  if (!existsSync(backend)) return "übersprungen, die Referenz-App liegt nicht in diesem Klon";

  const freigabe = {
    id: 7,
    run_id: 7,
    flow_name: "antrag",
    titel: "Urlaub",
    status: "offen",
    begruendung: null,
    entschieden_von: null,
  };
  const gesehen = { start: null, key: null };
  const geraet = createServer((anfrage, antwort) => {
    const url = new URL(anfrage.url, "http://x");
    const teile = [];
    anfrage.on("data", (s) => teile.push(s));
    anfrage.on("end", () => {
      const json = (code, daten) => {
        antwort.writeHead(code, { "content-type": "application/json" });
        antwort.end(JSON.stringify(daten));
      };
      gesehen.key = anfrage.headers["x-api-key"] || null;
      if (gesehen.key !== "aras_selbsttest") return json(401, { error: { message: "kein Schlüssel" } });
      if (url.pathname === "/flows/antrag/run") {
        gesehen.start = JSON.parse(Buffer.concat(teile).toString("utf8")).args;
        return json(202, { success: true, run_id: 7 });
      }
      if (url.pathname === "/freigaben") {
        return json(200, { success: true, freigaben: url.searchParams.get("lauf") === "7" ? [freigabe] : [] });
      }
      if (url.pathname === "/flows/runs/7") {
        return json(200, {
          success: true,
          status: freigabe.status === "bestaetigt" ? "fertig" : "wartend",
          result: freigabe.status === "bestaetigt" ? "Anna hat den Urlaub genehmigt." : null,
        });
      }
      json(404, { error: { message: url.pathname } });
    });
  });
  await new Promise((ready) => geraet.listen(0, "127.0.0.1", ready));
  const api = `http://127.0.0.1:${geraet.address().port}`;

  const app = spawn("node", [backend], {
    env: {
      ...process.env,
      PORT: "0",
      ARASUL_API_URL: api,
      ARASUL_API_SCHLUESSEL: "aras_selbsttest",
      ARASUL_APP_NAME: "Urlaubsantrag",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  // Der Port kommt vom Betriebssystem, damit zwei Läufe sich nicht ins Gehege
  // kommen. Die App sagt ihn beim Start, also wird zugehört statt geraten.
  const appUrl = await new Promise((done, failed) => {
    const zeit = setTimeout(() => failed(new Error("die App hat nicht gestartet")), 10_000);
    app.stdout.on("data", (chunk) => {
      const treffer = String(chunk).match(/auf (\d+)/);
      if (treffer) {
        clearTimeout(zeit);
        done(`http://127.0.0.1:${treffer[1]}`);
      }
    });
  });

  // So legt die Plattform einen Namen in die Kopfzeile: als UTF-8, das auf der
  // Leitung wie Latin-1 aussieht. Wer hier schlicht "Jürgen" schickt, prüft den
  // Umweg nicht, den die App genau dafür geht.
  const alsKopfzeile = (text) => Buffer.from(text, "utf8").toString("latin1");
  const ruf = async (pfad, optionen) => {
    const antwort = await fetch(`${appUrl}${pfad}`, {
      headers: {
        "content-type": "application/json",
        "x-arasul-user": alsKopfzeile("Jürgen"),
        "x-arasul-role": "mitarbeiter",
      },
      ...optionen,
    });
    return { code: antwort.status, daten: await antwort.json() };
  };

  try {
    const lage = await ruf("/lage");
    assert(lage.daten.nutzer === "Jürgen", `die App liest den Angemeldeten nicht: ${JSON.stringify(lage.daten)}`);
    assert(lage.daten.arasul === true, "die App sieht die Schnittstelle des Geräts nicht");

    const gestellt = await ruf("/antraege", {
      method: "POST",
      body: JSON.stringify({ von: "2026-09-07", bis: "2026-09-11", grund: "Familie" }),
    });
    assert(gestellt.code === 201, `Antrag abgewiesen: ${JSON.stringify(gestellt.daten)}`);
    assert(gestellt.daten.antrag.tage === 5, `Arbeitstage falsch gezählt: ${gestellt.daten.antrag.tage}`);
    assert(gestellt.daten.antrag.antragsteller === "Jürgen", "der Antragsteller kommt nicht aus der Anmeldung");
    assert(gestellt.daten.antrag.status === "wartet", `der Antrag wartet nicht: ${gestellt.daten.antrag.status}`);
    assert(gestellt.daten.antrag.lauf === 7, "der Flow wurde nicht gestartet");
    assert(gesehen.start?.antragsteller === "Jürgen", `der Flow bekam falsche Angaben: ${JSON.stringify(gesehen.start)}`);

    // Ein Wochenende zählt nicht mit, und ein Zeitraum ohne Arbeitstag ist keiner.
    const wochenende = await ruf("/antraege", {
      method: "POST",
      body: JSON.stringify({ von: "2026-09-05", bis: "2026-09-06" }),
    });
    assert(wochenende.code === 400, "ein Zeitraum ohne Arbeitstag wurde angenommen");

    // Solange niemand entschieden hat, ändert sich nichts. Die App wartet, sie
    // hilft nicht nach.
    let liste = await ruf("/antraege");
    assert(liste.daten.antraege[0].status === "wartet", "der Antrag entscheidet sich selbst");

    // Jetzt der Mensch, in der Oberfläche von Arasul.
    freigabe.status = "bestaetigt";
    freigabe.entschieden_von = "Anna";
    liste = await ruf("/antraege");
    const antrag = liste.daten.antraege.find((a) => a.id === 1);
    assert(antrag.status === "genehmigt", `nach der Bestätigung: ${antrag.status}`);
    assert(antrag.entschieden_von === "Anna", "der Name des Entscheiders fehlt am Antrag");
    assert(/genehmigt/.test(antrag.bemerkung || ""), `der Satz des Laufs fehlt: ${antrag.bemerkung}`);
    return "gestellt, gewartet, bestätigt, genehmigt";
  } finally {
    app.kill();
    geraet.close();
  }
});

await checkAsync("Ohne Arasul entscheidet niemand, und die App sagt es", async () => {
  const backend = join(ROOT, "apps", "urlaubsantrag", "backend", "server.mjs");
  if (!existsSync(backend)) return "übersprungen, die Referenz-App liegt nicht in diesem Klon";
  const app = spawn("node", [backend], {
    env: { ...process.env, PORT: "0", ARASUL_API_URL: "", ARASUL_API_SCHLUESSEL: "" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const appUrl = await new Promise((done, failed) => {
    const zeit = setTimeout(() => failed(new Error("die App hat nicht gestartet")), 10_000);
    app.stdout.on("data", (chunk) => {
      const treffer = String(chunk).match(/auf (\d+)/);
      if (treffer) {
        clearTimeout(zeit);
        done(`http://127.0.0.1:${treffer[1]}`);
      }
    });
  });
  try {
    const lage = await (await fetch(`${appUrl}/lage`)).json();
    assert(lage.arasul === false, "die App behauptet eine Schnittstelle, die sie nicht hat");
    const gestellt = await fetch(`${appUrl}/antraege`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ von: "2026-09-07", bis: "2026-09-08" }),
    });
    const daten = await gestellt.json();
    assert(daten.antrag.status !== "genehmigt", "ohne Freigabe gilt der Antrag als genehmigt");
    assert(/Arasul|Flow/.test(daten.antrag.hinweis || ""), `der Antrag sagt nicht, warum niemand entscheidet: ${daten.antrag.hinweis}`);
    return "Antrag angenommen, ohne Entscheidung, mit Begründung";
  } finally {
    app.kill();
  }
});

await checkAsync("Das Artefakt sagt selbst, wie es installiert wird, und geht sauber an das Gerät", async () => {
  const work = mkdtempSync(join(tmpdir(), "ara-artefakt-"));
  const mirror = join(work, "spiegel");
  const ziel = join(work, "geraet");
  const gemerkt = process.env.ARA_MIRROR;
  mkdirSync(join(mirror, "config", "platforms"), { recursive: true });
  process.env.ARA_MIRROR = mirror;
  try {
    // 1. Ein Artefakt, das nicht sagt, wie es sich installiert: das Kit rät nicht.
    writeFileSync(join(mirror, "README.md"), "# Irgendetwas\n");
    let entry = installerEntry();
    assert(!entry.ok && /arasul-release\.json/.test(entry.reason), `ohne die Datei behauptet das Kit einen Weg: ${entry.reason}`);

    // 2. Eine Datei, die eine Datei nennt, die es nicht gibt: auch dann nicht.
    //    Genau hier lag der Fund vom 28.08.2026: das Kit rief einen Namen auf,
    //    den es auswendig kannte, und den es im Artefakt nie gab.
    writeFileSync(
      join(mirror, "arasul-release.json"),
      JSON.stringify({ fassung: "9.9.9", einstiegspunkt: "install.sh" })
    );
    entry = installerEntry();
    assert(!entry.ok && /liegt aber nicht/.test(entry.reason), `ein Einstiegspunkt ohne Datei wird angenommen: ${entry.reason}`);

    // 3. Mit Datei: der Name kommt aus der JSON und nicht aus dem Kit.
    writeFileSync(join(mirror, "install.sh"), "#!/bin/sh\n");
    writeFileSync(join(mirror, "config", "platforms", "probe.json"), "{}\n");
    writeFileSync(join(mirror, "STATE.json"), JSON.stringify({ fetched: "2026-08-27T10:00:00.000Z", source: "https://probe", version: "9.9.9" }));
    entry = installerEntry();
    assert(entry.ok && entry.file === "install.sh", `Einstiegspunkt nicht aus der Datei gelesen: ${JSON.stringify(entry)}`);
    assert(mirrorState().version === "9.9.9", "Stand des Artefakts nicht gelesen");
    assert(mirrorState().source === "https://probe", "Quelle des Artefakts nicht gelesen");

    // 4. Gerufen wird er mit Startpasswort und Netzname, denn nur dabei
    //    entstehen Netzname, Fassung, Startpasswort und die Erstausgabe. Der
    //    Aufruf wird angezeigt, das Passwort darin nicht.
    const call = installCommand(entry, { password: "geheim-123", netName: "werk2" });
    assert(/^\.\/install\.sh /.test(call.command), `der Aufruf beginnt nicht mit dem Einstiegspunkt: ${call.command}`);
    assert(/--passwort 'geheim-123'/.test(call.command), `das Startpasswort fehlt im Aufruf: ${call.command}`);
    assert(/--name 'werk2'/.test(call.command), `der Netzname fehlt im Aufruf: ${call.command}`);
    assert(!/geheim-123/.test(call.shown), `das Startpasswort steht in der Anzeige: ${call.shown}`);
    assert(!/geheim-123/.test(scrub(`cd x && ${call.command}`)), "scrub lässt das Startpasswort stehen");
    assert(/werk2/.test(call.shown), "die Anzeige verschweigt auch den Netznamen");

    // 5. Das Ziel am Gerät ist nicht der Ordner, den die Spurensuche als
    //    laufende Plattform wertet. Sonst findet das Kit beim nächsten Lauf
    //    sich selbst.
    const target = installTarget("9.9.9");
    assert(/arasul-9\.9\.9/.test(target), `das Ziel trägt die Fassung nicht: ${target}`);
    assert(services(parseProbe("@arasul_dir=/home/x/arasul-9.9.9")).arasul.state === "traces", "das eigene Artefakt gilt als laufende Plattform");

    // 6. Schieben: was im Spiegel liegt, liegt danach am Ziel, samt
    //    Unterordnern. Die Beiwerkdateien von macOS bleiben draußen: am
    //    28.08.2026 kamen 1124 davon am Orin an, und Traefik stieg an einer aus.
    writeFileSync(join(mirror, "config", "._middlewares.yml"), "Beiwerk\n");
    writeFileSync(join(mirror, "._install.sh"), "Beiwerk\n");
    const geschoben = await ship(null, "local", JSON.stringify(ziel));
    assert(geschoben.ok, `Schieben fehlgeschlagen: ${geschoben.message}`);
    assert(existsSync(join(ziel, "install.sh")), "der Einstiegspunkt kam nicht an");
    assert(existsSync(join(ziel, "config", "platforms", "probe.json")), "Unterordner kamen nicht an");
    assert(!existsSync(join(ziel, "._install.sh")), "eine ._-Datei aus der Wurzel kam am Gerät an");
    assert(!existsSync(join(ziel, "config", "._middlewares.yml")), "eine ._-Datei aus einem Unterordner kam am Gerät an");
    return `${entry.file}, Ziel ${target}, Stand 9.9.9`;
  } finally {
    if (gemerkt === undefined) delete process.env.ARA_MIRROR;
    else process.env.ARA_MIRROR = gemerkt;
    rmSync(work, { recursive: true, force: true });
  }
});

await checkAsync("Aus der Erstausgabe des Installers kommt kein Klartext", async () => {
  // Fund 2 des zweiten Fremdtests am 28.08.2026. Der Installer druckt den
  // Kit-Schlüssel in seine Erstausgabe, das Kit reichte diese Ausgabe
  // unverändert durch und schrieb danach „Klartext wird nicht angezeigt". Der
  // Schlüssel stand da schon auf dem Bildschirm.
  const schluessel = "aras_9Zk3mQx7BvT2Lw";
  const passwort = "start-geheim-4711";

  // Zuerst das Stück für sich: ein Geheimnis, das über zwei Stücke des Stroms
  // verteilt ankommt, darf nicht durchrutschen.
  const masker = createMasker([passwort]);
  let gesehen = "";
  gesehen += masker.push("Kit-Schluessel: ara");
  gesehen += masker.push("s_9Zk3mQx7BvT2Lw\nPasswort: start-");
  gesehen += masker.push("geheim-4711\n");
  gesehen += masker.flush();
  assert(!gesehen.includes(schluessel), `der Schlüssel kam über zwei Stücke durch: ${gesehen}`);
  assert(!gesehen.includes(passwort), `das Passwort kam über zwei Stücke durch: ${gesehen}`);
  assert(/aras_…/.test(gesehen), `der Schlüssel wurde nicht als solcher benannt: ${gesehen}`);

  // Eine angefangene Zeile, aus der kein Geheimnis mehr werden kann, wartet
  // nicht: sonst bliebe die Frage des Installers nach dem sudo-Passwort
  // unsichtbar, bis jemand blind Enter drückt.
  const frage = createMasker([passwort]);
  assert(
    frage.push("[sudo] password for arasul: ").includes("password for arasul:"),
    "eine Eingabeaufforderung ohne Zeilenende wird zurückgehalten"
  );

  // Und dann der ganze Weg: ein Installer, der beides ausgibt, lokal gerufen.
  const skript = [
    `echo "Arasul eingerichtet."`,
    `echo "Kit-Schluessel: ${schluessel}"`,
    `echo "Administrator: admin / ${passwort}"`,
    `echo "Oberflaeche: https://werk2.local/"`,
  ].join("; ");

  const original = process.stdout.write.bind(process.stdout);
  let bildschirm = "";
  process.stdout.write = (chunk) => {
    bildschirm += String(chunk);
    return true;
  };
  let lauf;
  try {
    lauf = await runInstaller(null, "local", skript, { secrets: [passwort] });
  } finally {
    process.stdout.write = original;
  }

  assert(lauf.status === 0, `der gespielte Installer ist mit ${lauf.status} beendet`);
  assert(!bildschirm.includes(schluessel), `der Kit-Schlüssel stand auf dem Bildschirm: ${bildschirm}`);
  assert(!bildschirm.includes(passwort), `das Startpasswort stand auf dem Bildschirm: ${bildschirm}`);
  assert(!lauf.output.includes(schluessel), "der Kit-Schlüssel steht in dem, was das Kit behält");
  assert(!lauf.output.includes(passwort), "das Startpasswort steht in dem, was das Kit behält");
  // Mitgelesen heißt nicht verschluckt: alles andere kommt an.
  assert(/Arasul eingerichtet/.test(bildschirm), `die Ausgabe des Installers fehlt: ${bildschirm}`);
  assert(/werk2\.local/.test(bildschirm), "die Adresse der Oberfläche kam nicht durch");
  return "Schlüssel und Passwort maskiert, der Rest kam durch";
});

await checkAsync("Was der Installer nicht konnte, sagt das Kit noch einmal", async () => {
  // Fund 7 des zweiten Fremdtests am 28.08.2026. „SSH-Hardening fehlgeschlagen"
  // und „Firewall-Setup fehlgeschlagen (nicht kritisch), must be run as root"
  // liefen durch das Kit hindurch, mitten in mehreren hundert Zeilen. Danach
  // galt das Gerät als fertig, ohne Härtung und ohne Firewall.
  const ausgabe = [
    "Docker gefunden.",
    "Container gestartet: 7 von 7.",
    "WARNUNG: SSH-Hardening fehlgeschlagen",
    "Firewall-Setup fehlgeschlagen (nicht kritisch), must be run as root",
    "WARNUNG: SSH-Hardening fehlgeschlagen",
    "Fertig.",
  ].join("\n");
  const gefunden = troubles(ausgabe);
  assert(gefunden.length === 2, `falsch gesammelt: ${JSON.stringify(gefunden)}`);
  assert(gefunden.some((zeile) => /SSH-Hardening/.test(zeile)), "die Härtung fehlt in der Liste");
  assert(gefunden.some((zeile) => /Firewall/.test(zeile)), "die Firewall fehlt in der Liste");
  assert(!gefunden.some((zeile) => /Container gestartet/.test(zeile)), "eine gelungene Zeile steht in der Liste");

  // Am laufenden Installer, nicht nur am Text.
  const original = process.stdout.write.bind(process.stdout);
  process.stdout.write = () => true;
  let lauf;
  try {
    lauf = await runInstaller(null, "local", ausgabe.split("\n").map((z) => `echo ${JSON.stringify(z)}`).join("; "));
  } finally {
    process.stdout.write = original;
  }
  assert(lauf.troubles.length === 2, `der Lauf sammelt nicht: ${JSON.stringify(lauf.troubles)}`);

  // Und das Werkzeug legt sie am Ende noch einmal hin, unter dieser Überschrift.
  const werkzeug = readFileSync(join(ROOT, ".ara", "tools", "device.mjs"), "utf8");
  assert(/Was der Installer nicht konnte/.test(werkzeug), "device.mjs kennt den Abschnitt nicht");
  assert(/arasul\.troubles/.test(werkzeug), "device.mjs nimmt die gesammelten Zeilen nicht auf");
  const wissen = readFileSync(join(ROOT, ".ara", "knowledge", "device.md"), "utf8");
  assert(/Was der Installer nicht konnte/.test(wissen), "das Verfahren sagt nichts über die Absagen des Installers");
  return `${gefunden.length} Absagen aus ${ausgabe.split("\n").length} Zeilen`;
});

await checkAsync("Ohne Browser führt ein Weg zu Mitarbeiter und Freigabe", async () => {
  // Der Fremdtest am 28.08.2026 stand nach der Installation still: die
  // Plattform lief, aber der erste Mitarbeiter und seine Freigabe entstehen in
  // der Oberfläche, und der Prüfer hatte keinen Browser. Das Wissen muss den
  // zweiten Weg nennen, und das Kit muss zeigen, wo er beschrieben steht.
  const wissen = readFileSync(join(ROOT, ".ara", "knowledge", "device.md"), "utf8");
  for (const [muster, was] of [
    [/Mitarbeiter/, "der Fall selbst"],
    [/Freigabe/, "die Freigabe"],
    [/Admin-Handbuch/, "das Admin-Handbuch im Artefakt"],
    [/API-Referenz/, "die API-Referenz im Artefakt"],
    [/Authorization: Bearer/, "die Form des Aufrufs"],
    [/mirror\.mjs --docs/, "der Weg zu den Anleitungen"],
    [/--despite-traces/, "der benannte Weg über liegengebliebene Reste"],
  ]) {
    assert(muster.test(wissen), `in .ara/knowledge/device.md fehlt ${was}`);
  }
  // Und das Werkzeug tut, was das Blatt verspricht.
  const werkzeug = readFileSync(join(ROOT, ".ara", "tools", "device.mjs"), "utf8");
  assert(/--despite-traces/.test(werkzeug), "device.mjs kennt den Weg nicht, den das Blatt nennt");

  const work = mkdtempSync(join(tmpdir(), "ara-docs-"));
  const mirror = join(work, "spiegel");
  try {
    // Ohne Spiegel gibt es nichts zu zeigen, und das Werkzeug sagt es.
    let run = await toolAsync("mirror.mjs", ["--docs"], { ARA_MIRROR: mirror });
    assert(run.status !== 0, "ohne Spiegel meldet --docs Erfolg");
    assert(/kein/i.test(run.stdout), `der fehlende Spiegel wird nicht benannt: ${run.stdout}`);

    mkdirSync(join(mirror, "docs", "ops"), { recursive: true });
    writeFileSync(join(mirror, "STATE.json"), JSON.stringify({ fetched: "2026-08-27T10:00:00.000Z", source: "https://probe", version: "9.9.9" }));
    writeFileSync(join(mirror, "docs", "admin-handbuch.md"), "# Handbuch\n");
    writeFileSync(join(mirror, "docs", "ops", "auslieferung.md"), "# Auslieferung\n");
    writeFileSync(join(mirror, "install.sh"), "#!/bin/sh\n");

    run = await toolAsync("mirror.mjs", ["--docs"], { ARA_MIRROR: mirror });
    assert(run.status === 0, `--docs fehlgeschlagen: ${run.stderr || run.stdout}`);
    assert(/admin-handbuch\.md/.test(run.stdout), `die Anleitung fehlt in der Liste: ${run.stdout}`);
    assert(/ops\/auslieferung\.md/.test(run.stdout), "eine Anleitung aus einem Unterordner fehlt");
    assert(!/install\.sh/.test(run.stdout), "ein Skript wird als Anleitung ausgegeben");
    assert(/9\.9\.9/.test(run.stdout), "es wird nicht gesagt, zu welcher Fassung die Anleitungen gehören");
    return "Blatt und Werkzeug";
  } finally {
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
    assert(run.status !== 0, "ein Schlüssel, den es nicht gibt, endet mit Erfolg");
    const { fields } = readFrontmatter(join(ROOT, "devices", name, "device.md"));
    assert(!fields.api_key_ref, "ein Schlüsselverweis steht in der Akte, obwohl keiner angelegt wurde");
    return `Urteil ${lage.verdict}`;
  } finally {
    rmSync(join(ROOT, "devices", name), { recursive: true, force: true });
    if (savedState === null) rmSync(stateFile, { force: true });
    else writeFileSync(stateFile, savedState);
  }
});

// --- Kundenakte --------------------------------------------------------------

check("customer.mjs legt die Akte an und gibt das Lagebild samt Geräten", () => {
  const name = "selftest-kunde";
  const dir = join(ROOT, "customers", name);
  try {
    rmSync(dir, { recursive: true, force: true });

    let run = tool("customer.mjs", ["--customer", name, "--new", "--legal-name", "Selbsttest GmbH"]);
    assert(run.status === 0, `Anlegen fehlgeschlagen: ${run.stderr}`);
    const { fields } = readFrontmatter(join(dir, "customer.md"));
    assert(fields.id === name, `id nicht gesetzt: ${JSON.stringify(fields)}`);
    assert(fields.legal_name === "Selbsttest GmbH", "die Firmierung steht nicht im Frontmatter");
    assert(fields.status === "lead", "der Stand steht nicht im Frontmatter");
    assert(existsSync(join(dir, "history")) && existsSync(join(dir, "documents")), "Ordner fehlen");

    // Zweimal dieselbe Akte gibt es nicht.
    run = tool("customer.mjs", ["--customer", name, "--new"]);
    assert(run.status !== 0 && /gibt es schon/.test(run.stderr), "eine zweite Akte wurde angelegt");

    // Und ein aehnlicher Name ist meist derselbe Kunde. Das haelt an, bis
    // jemand --force sagt: zwei halbe Akten desselben Kunden sind der Fall,
    // den niemand mehr zusammenfuehrt.
    run = tool("customer.mjs", ["--customer", `${name}-gmbh`, "--new"]);
    assert(run.status !== 0 && /ähnlichem Namen/.test(run.stderr), `aehnlicher Name faellt nicht auf: ${run.stdout}`);

    // Ein Geraet des Kunden, mit allem, was seit E4 in seiner Akte steht.
    const geraet = join(dir, "devices", "zentrale");
    mkdirSync(geraet, { recursive: true });
    cpSync(join(ROOT, ".ara", "templates", "device.md"), join(geraet, "device.md"));
    writeFrontmatter(join(geraet, "device.md"), {
      name: "zentrale",
      customer: name,
      status: "live",
      verdict: "supported",
      address: "10.0.0.5",
      api_base: "https://tunnel.example:8443",
      tls: "selfsigned",
      arasul: "found",
      api_key_ref: "ARASUL_KEY_GIBTESNICHT",
    });

    run = tool("customer.mjs", ["--customer", name, "--json"]);
    assert(run.status === 0, `Lagebild fehlgeschlagen: ${run.stderr}`);
    const lage = JSON.parse(run.stdout);
    assert(lage.devices.length === 1, "das Gerät des Kunden fehlt im Lagebild");
    assert(lage.devices[0].api_base === "https://tunnel.example:8443", "die Schnittstelle fehlt");
    assert(lage.devices[0].tls === "selfsigned", "das Zertifikat fehlt");
    // Ein Name in der Akte ohne Eintrag dahinter ist der Fall, der sonst erst
    // beim ersten Deploy auffaellt.
    assert(lage.devices[0].key_ref && lage.devices[0].key_present === false, "der fehlende Schlüssel fällt nicht auf");
    assert(
      lage.open.some((satz) => /Geheimnis-Ablage steht er nicht/.test(satz)),
      `der fehlende Schlüssel steht nicht unter "was ansteht": ${lage.open.join(" | ")}`
    );
    assert(
      lage.open.some((satz) => /keine Wartungslaufzeit/.test(satz)),
      "ein laufendes Gerät ohne Wartungsende fällt nicht auf"
    );

    run = tool("customer.mjs", ["--customer", name]);
    assert(/zentrale/.test(run.stdout) && /Selbsttest GmbH/.test(run.stdout), "das Lagebild nennt Kunde oder Gerät nicht");
    assert(!/ARASUL_KEY_GIBTESNICHT=|aras_/.test(run.stdout), "im Lagebild steht ein Schlüsselwert");

    run = tool("customer.mjs", []);
    assert(new RegExp(name).test(run.stdout), "die Übersicht führt den Kunden nicht");

    // Wer alte Jahrgaenge wegraeumt, verliert sie nicht: aus history/archive/
    // wird mitgelesen, nur als Archiv gekennzeichnet.
    mkdirSync(join(dir, "history", "archive", "2025"), { recursive: true });
    writeFileSync(join(dir, "history", "2026-08-01-anruf.md"), "---\ndate: 2026-08-01\ntype: call\n---\n\n# Anruf\n");
    writeFileSync(join(dir, "history", "archive", "2025", "2025-03-04-erstkontakt.md"), "---\ndate: 2025-03-04\ntype: call\n---\n\n# Erstkontakt\n");
    run = tool("customer.mjs", ["--customer", name, "--json"]);
    const verlauf = JSON.parse(run.stdout).history;
    assert(verlauf.length === 2, `der Verlauf hat ${verlauf.length} statt zwei Einträge`);
    assert(verlauf[0].date === "2026-08-01", "der Verlauf steht nicht mit dem Neuesten zuerst");
    assert(verlauf[1].archived === true, "der archivierte Eintrag ist nicht als solcher gekennzeichnet");
    assert(/davon 1 im Archiv/.test(tool("customer.mjs", ["--customer", name]).stdout), "das Archiv wird nicht mitgezählt");
    return "anlegen, ähnlicher Name, Lagebild mit Gerät, Übersicht, Archiv";
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- Wartung -----------------------------------------------------------------

check("Aus dem Befund am Gerät wird ein Zustand und ein Urteil", () => {
  const befund = [
    "@uptime=up 12 days",
    "@disk_total_kb=100000000",
    "@disk_free_kb=4000000",
    "@disk_used_pct=96%",
    "@mem_total_kb=32000000",
    "@mem_available_kb=8000000",
    "@docker_server=27.1.1",
    "@container=eine-app|running|Up 3 days",
    "@container=andere-app|exited|Exited (1) 2 hours ago",
    "@unit_source=systemd",
    "@failed_unit=probe.service",
    "@log_source=journalctl",
    "@log_read=ja",
    "@log=Aug 27 03:00 probe: ERROR keine Verbindung",
    "@done=ja",
  ].join("\n");

  const facts = parseHealth(befund);
  assert(facts.container.length === 2, "mehrfache Schlüssel werden nicht zur Liste");
  const health = readHealth(facts);
  assert(health.complete, "ein durchgelaufenes Skript gilt als abgebrochen");
  assert(health.disk.usedPct === 96 && health.disk.freeGb === 3.8, `Platte falsch gelesen: ${JSON.stringify(health.disk)}`);
  assert(health.stopped.length === 1 && health.stopped[0].name === "andere-app", "der ausgefallene Container fällt nicht auf");

  const achtung = health.findings.filter((f) => f.level === "achtung");
  assert(achtung.length === 3, `erwartet drei Mal Achtung, bekommen: ${JSON.stringify(health.findings)}`);
  assert(achtung.some((f) => /96 Prozent/.test(f.text)), "die volle Platte wird nicht genannt");
  assert(achtung.some((f) => /probe.service/.test(f.text)), "der fehlgeschlagene Dienst wird nicht genannt");

  // Ein gesundes Gerät bekommt keinen Befund angedichtet.
  const heil = readHealth(parseHealth("@disk_used_pct=23%\n@container=eine-app|running|Up 1 day\n@done=ja"));
  assert(heil.findings.length === 0, `heiles Gerät bekommt Befunde: ${JSON.stringify(heil.findings)}`);

  // Nicht lesbar ist etwas anderes als nichts gefunden. Ein Gerät, dessen
  // Protokolle der Anmeldename nicht lesen darf, hat nicht null Fehler.
  const ohneRechte = readHealth(parseHealth("@log_source=journalctl\n@log_read=nein\n@done=ja"));
  assert(
    ohneRechte.findings.some((f) => /Rechte/.test(f.text)),
    "unlesbare Protokolle gelten als leere Protokolle"
  );
  return "Platte, Container, Dienste, Protokolle, und ein heiles Gerät bleibt heil";
});

check("Die Statuszeile verschweigt nicht, was ungemessen blieb", () => {
  const health = readHealth(parseHealth("@disk_used_pct=20%\n@done=ja"));
  const voll = statusLine({
    place: "probe",
    platform: { text: "Arasul X, Kontrakt 3" },
    apps: { state: "gelesen", found: [{ id: "eineapp", live: "1.0.0", test: "1.1.0" }] },
    backup: { text: "datum 2026-08-26" },
    health,
    unmeasured: [],
  });
  assert(/Arasul X/.test(voll) && /eineapp live 1.0.0, Test 1.1.0/.test(voll), `Statuszeile unvollständig: ${voll}`);
  assert(/Sicherung: datum 2026-08-26/.test(voll), "die Sicherung fehlt in der Statuszeile");
  assert(/nichts auffällig/.test(voll), "ein heiles Gerät wird nicht als solches genannt");

  // Ohne Messung steht das da, statt wegzufallen: eine Zeile ohne Sicherung
  // liest sich sonst wie eine Zeile mit einer heilen Sicherung.
  const leer = statusLine({ place: "probe", platform: null, apps: null, backup: null, health: null, unmeasured: ["Plattform"] });
  assert(/Plattform ungemessen/.test(leer), `ungemessene Plattform fehlt: ${leer}`);
  assert(/Apps ungemessen/.test(leer), "ungemessene Apps fehlen");
  assert(/Sicherung: ungemessen/.test(leer), "ungemessene Sicherung fehlt");
  assert(/ungemessen: Plattform/.test(leer), "die Liste des Ungemessenen fehlt");
  return "voll und leer";
});

check("Zu einem Thema wird im Kontrakt nachgesehen, nicht geraten", () => {
  // Fuer die Sicherung kennt das Kit keinen Pfad. Es sucht in der Liste, die
  // das Geraet selbst veroeffentlicht, in dessen Worten.
  const ohne = topicEndpoints(KONTRAKT, ["sicherung", "backup"]);
  assert(ohne.length === 0, "in einem Kontrakt ohne Sicherung wird eine gefunden");

  const mit = {
    ...KONTRAKT,
    endpunkte: [
      ...KONTRAKT.endpunkte,
      { verb: "GET", pfad: "/api/v1/external/sicherung", bereich: "betrieb", was: "Datum und Groesse der letzten Sicherung" },
    ],
  };
  const gefunden = topicEndpoints(mit, ["sicherung", "backup"]);
  assert(gefunden.length === 1 && gefunden[0].pfad === "/api/v1/external/sicherung", `falsch gefunden: ${JSON.stringify(gefunden)}`);
  assert(topicEndpoints(mit, ["sicherung"], "POST").length === 0, "das Verb wird nicht beachtet");

  // Ein Pfad mit Platzhalter ist nicht aufrufbar: was dort hineingehoert, weiss
  // das Kit nicht, und es fuellt es auch nicht auf gut Glueck.
  assert(needsParameter("/api/v1/external/apps/:id"), "ein Parameter im Pfad fällt nicht auf");
  assert(needsParameter("/api/v1/external/freigaben?lauf=<id>"), "eine Rückfrage mit Platzhalter fällt nicht auf");
  assert(!needsParameter("/api/v1/external/sicherung"), "ein vollständiger Pfad gilt als unvollständig");
  return "kein Endpunkt, ein Endpunkt, einer mit Platzhalter";
});

await checkAsync("maintain.mjs berichtet auch ohne SSH und sagt, was fehlt", async () => {
  const name = "selftest-wartung";
  const akte = join(ROOT, "devices", name);
  const stateFile = join(ROOT, ".ara", "state.json");
  const savedState = existsSync(stateFile) ? readFileSync(stateFile, "utf8") : null;

  // Das Geraet, gespielt. Der Kontrakt kennt den Weg zu einer App, aber keinen
  // zur Sicherung: genau der Stand, in dem dieses Kit gebaut wurde.
  const gesehen = { pfade: [], key: null };
  let mitSicherung = false;
  const server = createServer((request, response) => {
    const antwort = (status, body) => {
      response.writeHead(status, { "Content-Type": "application/json" });
      response.end(JSON.stringify(body));
    };
    gesehen.key = request.headers["x-api-key"] || null;
    if (gesehen.key !== "aras_wartung") return antwort(401, { error: { message: "Kein gueltiger Schluessel" } });
    const pfad = request.url.split("?")[0];
    gesehen.pfade.push(pfad);
    if (pfad === "/api/v1/external/contract") {
      return antwort(200, {
        data: {
          ...KONTRAKT,
          arasul: "Vorserie",
          endpunkte: mitSicherung
            ? [
                ...KONTRAKT.endpunkte,
                { verb: "GET", pfad: "/api/v1/external/sicherung", bereich: "betrieb", was: "Letzte Sicherung ausserhalb" },
              ]
            : KONTRAKT.endpunkte,
        },
      });
    }
    if (pfad === "/api/v1/external/apps/probeapp") {
      return antwort(200, { data: { id: "probeapp", live: { version: "1.2.0" }, test: { version: "1.3.0" } } });
    }
    if (pfad === "/api/v1/external/sicherung") {
      return antwort(200, { data: { ziel: "USB", datum: "2026-08-26 03:00", groesse_mb: 812 } });
    }
    antwort(404, { error: { message: "Endpoint not found" } });
  });
  await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
  const base = `http://127.0.0.1:${server.address().port}`;
  const env = { ARASUL_KEY_WARTUNG: "aras_wartung" };

  mkdirSync(akte, { recursive: true });
  cpSync(join(ROOT, ".ara", "templates", "device.md"), join(akte, "device.md"));
  // Die Adresse fuehrt ins Leere: so wie ein Geraet, das gerade nur ueber einen
  // Tunnel erreichbar ist und dessen SSH nicht steht.
  writeFrontmatter(join(akte, "device.md"), {
    name,
    address: "127.0.0.1",
    ssh_port: "1",
    api_base: base,
    verdict: "supported",
    arasul: "found",
    api_key_ref: "ARASUL_KEY_WARTUNG",
  });

  try {
    let run = await toolAsync("maintain.mjs", ["--device", name, "--apps", "probeapp"], env);
    assert(run.status === 0, `Bericht fehlgeschlagen: ${run.stderr}${run.stdout}`);
    assert(gesehen.key === "aras_wartung", "der Kit-Schlüssel kam nicht in der Kopfzeile an");
    assert(/Arasul Vorserie/.test(run.stdout), "die Systemversion aus dem Kontrakt fehlt");
    assert(/probeapp: live 1.2.0, Test 1.3.0/.test(run.stdout), `die Stände der App fehlen: ${run.stdout}`);

    // Ohne SSH entsteht der Bericht trotzdem, und was fehlt, steht darin.
    assert(/Zustand am Gerät/.test(run.stdout), "der Abschnitt zum Zustand fehlt");
    assert(/Was fehlt/.test(run.stdout), "der Abschnitt über das Ungemessene fehlt");
    assert(/Kein SSH/.test(run.stdout), `das fehlende SSH wird nicht benannt: ${run.stdout}`);

    // Die Sicherung steht nicht im Kontrakt dieses Geraets. Dann wird kein Pfad
    // geraten, und der Punkt heisst "noch nicht am Geraet".
    assert(/noch nicht am Gerät/.test(run.stdout), "die fehlende Sicherung wird nicht als solche ausgewiesen");
    assert(
      !gesehen.pfade.some((p) => /sicherung|backup/i.test(p)),
      `das Kit hat einen Pfad geraten: ${gesehen.pfade.join(", ")}`
    );

    // Die Statuszeile ist die erste Zeile, damit sie ein Mensch zuerst liest.
    const erste = run.stdout.split("\n")[0];
    assert(new RegExp(`^${name}: `).test(erste), `die Statuszeile steht nicht zuerst: ${erste}`);
    assert(/Sicherung:/.test(erste), "die Sicherung fehlt in der Statuszeile");

    run = await toolAsync("maintain.mjs", ["--device", name, "--line", "--apps", "probeapp"], env);
    assert(run.stdout.trim().split("\n").length === 1, `--line gibt mehr als eine Zeile: ${run.stdout}`);

    // Kommt der Endpunkt am Geraet dazu, findet ihn das Kit von selbst, ohne
    // dass hier etwas nachgezogen wird.
    mitSicherung = true;
    gesehen.pfade = [];
    run = await toolAsync("maintain.mjs", ["--device", name, "--apps", "probeapp"], env);
    assert(gesehen.pfade.includes("/api/v1/external/sicherung"), "der neue Endpunkt wird nicht gerufen");
    assert(/2026-08-26 03:00/.test(run.stdout), `die Sicherung steht nicht im Bericht: ${run.stdout}`);

    // Nach einer App, die das Geraet nicht kennt, wird gefragt, und die Antwort
    // ist "nicht auf diesem Gerät", keine erfundene Version.
    run = await toolAsync("maintain.mjs", ["--device", name, "--apps", "gibtesnicht"], env);
    assert(/Nicht auf diesem Gerät: gibtesnicht/.test(run.stdout), `unbekannte App falsch behandelt: ${run.stdout}`);

    // --report legt den Bericht in die Akte und schreibt in den Laufzettel.
    assert(
      tool("runsheet.mjs", ["--create", "--device", name]).status === 0,
      "der Laufzettel für die Prüfung ließ sich nicht anlegen"
    );
    run = await toolAsync("maintain.mjs", ["--device", name, "--report", "--apps", "probeapp"], env);
    const berichte = readdirSync(join(akte, "reports"));
    assert(berichte.length === 1, `erwartet einen Bericht, gefunden: ${berichte.join(", ")}`);
    assert(/wartung\.md$/.test(berichte[0]), `der Bericht heißt ${berichte[0]}`);
    assert(/Wartungsbericht/.test(readFileSync(join(akte, "reports", berichte[0]), "utf8")), "der Bericht ist leer");
    assert(/Wartungsbericht aufgenommen/.test(readFileSync(join(akte, "runsheet.md"), "utf8")), "der Laufzettel bekam nichts");

    // Zwei Berichte an einem Tag ueberschreiben sich nicht: wer nach einer
    // Reparatur nachmisst, will beide Staende sehen.
    await toolAsync("maintain.mjs", ["--device", name, "--report", "--apps", "probeapp"], env);
    assert(readdirSync(join(akte, "reports")).length === 2, "der zweite Bericht hat den ersten überschrieben");

    // Geht kein Weg, wird kein Bericht erfunden.
    run = await toolAsync("maintain.mjs", ["--device", name, "--no-api"], env);
    assert(run.status !== 0 && /nichts zu messen/i.test(run.stderr), `ohne beide Wege kam ein Bericht: ${run.stdout}`);
    return "Version, Apps, fehlende und vorhandene Sicherung, Statuszeile, Bericht, Laufzettel";
  } finally {
    server.close();
    rmSync(akte, { recursive: true, force: true });
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
    "apps/eigene-app/app.json",
    // Der Bau einer App gehoert niemandem: er entsteht beim Bauen, auch bei der
    // Referenz-App, die sonst als Einzige unter apps/ verfolgt wird.
    "apps/urlaubsantrag/build/app.json",
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
    // Die eine Ausnahme unter apps/: die Referenz-App gehoert dem Kit und kommt
    // mit dem Klon mit. Ohne sie haette ein Fremder nichts zum Ansehen.
    "apps/urlaubsantrag/app.json",
    "apps/urlaubsantrag/flows/antrag.md",
    "README.md",
    "LICENSE",
  ];
  const ignored = mustBeTracked.filter(
    (path) => spawnSync("git", ["check-ignore", "-q", path], { cwd: ROOT }).status === 0
  );
  assert(ignored.length === 0, `fehlt nach dem Klonen: ${ignored.join(", ")}`);

  return `${mustBeIgnored.length} Pfade geprüft`;
});

// --- Die Rechnung -------------------------------------------------------------

check("Betraege werden in ganzen Cent gelesen und geschrieben", () => {
  // Eine Rechnung, die aus Gleitkommazahlen entsteht, ist irgendwann einen Cent
  // daneben, und der Cent steht dann in der Buchhaltung des Kunden.
  const cases = [
    ["1.234,56", 123456],
    ["95", 9500],
    ["24,90 Euro", 2490],
    ["24.90", 2490],
    ["1.560", 156000],
    ["0,01", 1],
    ["", null],
    ["{Betrag}", null],
  ];
  for (const [text, expected] of cases) {
    const got = parseAmount(text);
    assert(got === expected, `"${text}" wird als ${got} gelesen, erwartet ${expected}`);
  }
  for (const cents of [1, 99, 100, 123456, 100000000]) {
    assert(
      parseAmount(formatAmount(cents)) === cents,
      `${cents} ueberlebt den Weg durch das Papier nicht: ${formatAmount(cents)}`
    );
  }
  return `${cases.length} Schreibweisen`;
});

check("Der Nummernkreis ist fortlaufend und laesst sich nicht zurueckdrehen", () => {
  // Eine Luecke im Nummernkreis ist das Erste, wonach eine Betriebspruefung
  // sucht. Also faellt sie hier auf und nicht dort.
  const ledger = (year, last, numbers) => ({
    exists: true,
    year,
    last,
    format: "JJJJ-NNNN",
    rows: numbers.map((n) => ({ Number: n, Date: "", Customer: "", State: "gestellt" })),
  });

  const heil = ledger(2026, 2, ["2026-0001", "2026-0002"]);
  assert(auditLedger(heil).length === 0, `ein heiler Kreis wird beanstandet: ${auditLedger(heil)}`);
  assert(peekNumber("2026-09-01", heil).number === "2026-0003", "die naechste Nummer stimmt nicht");
  assert(peekNumber("2027-01-02", heil).number === "2027-0001", "das neue Jahr faengt nicht bei 0001 an");

  const luecke = ledger(2026, 3, ["2026-0001", "2026-0003"]);
  assert(auditLedger(luecke).some((p) => /Luecke/.test(p)), "eine Luecke faellt nicht auf");

  const doppelt = ledger(2026, 2, ["2026-0001", "2026-0001", "2026-0002"]);
  assert(auditLedger(doppelt).some((p) => /zweimal/.test(p)), "eine doppelte Nummer faellt nicht auf");

  const gedreht = ledger(2026, 1, ["2026-0001", "2026-0002"]);
  assert(auditLedger(gedreht).some((p) => /zurueckgedreht/.test(p)), "ein gedrehter Kopf faellt nicht auf");

  let refused = false;
  try {
    peekNumber("2025-12-30", heil);
  } catch {
    refused = true;
  }
  assert(refused, "ein Beleg aus einem abgeschlossenen Jahr bekommt trotzdem eine Nummer");
  return "Luecke, Dublette, gedrehter Kopf und altes Jahr werden erkannt";
});

check("Die Steuer wird je Satz gerechnet, nicht je Zeile", () => {
  // Je Zeile gerundet weicht die Summe bei vielen Positionen um Cents von der
  // ab, die das Finanzamt rechnet.
  const rows = [
    { text: "Beratung", quantity: "3", unit: "Stunden", price: "95,00", rate: "" },
    { text: "Fahrt", quantity: "1", unit: "Stueck", price: "0,33", rate: "" },
    { text: "Buch", quantity: "3", unit: "Stueck", price: "24,90", rate: "7 Prozent" },
  ];
  const { positions, problems } = computePositions(rows, 19);
  assert(problems.length === 0, `lesbare Zeilen werden beanstandet: ${problems.join(" ")}`);
  const sums = totals(positions, "standard");
  // 3 mal 95,00 plus 0,33 plus 3 mal 24,90 sind 360,03.
  assert(sums.net === 36003, `die Nettosumme ist ${formatAmount(sums.net)}, erwartet 360,03`);
  assert(sums.taxes.length === 2, `es entstehen ${sums.taxes.length} Steuergruppen statt zwei`);
  const neunzehn = sums.taxes.find((group) => group.rate === 19);
  assert(neunzehn.basis === 28533, `die Grundlage zu 19 Prozent ist ${formatAmount(neunzehn.basis)}`);
  // Je Zeile gerundet kaeme 54,15 plus 0,06 heraus, auf die Summe sind es 54,21.
  assert(neunzehn.tax === 5421, `19 Prozent auf 285,33 sind ${formatAmount(neunzehn.tax)}, erwartet 54,21`);
  const sieben = sums.taxes.find((group) => group.rate === 7);
  assert(sieben.tax === 523, `7 Prozent auf 74,70 sind ${formatAmount(sieben.tax)}, erwartet 5,23`);
  assert(sums.gross === sums.net + sums.tax, "brutto ist nicht netto plus Steuer");

  // Ohne Steuerausweis darf kein Steuerbetrag entstehen.
  const klein = totals(positions, "kleinunternehmer");
  assert(klein.tax === 0, "ein Kleinunternehmer weist Steuer aus");
  assert(klein.taxes.every((group) => group.category === "E" && group.reason), "der Grund der Befreiung fehlt");
  return `netto ${formatAmount(sums.net)}, Steuer ${formatAmount(sums.tax)}`;
});

check("Die Pflichtangaben nach § 14 UStG werden einzeln geprueft", () => {
  // Fehlt eine, berechtigt die Rechnung den Kunden nicht zum Vorsteuerabzug.
  // Das faellt bei ihm auf, nicht beim Partner.
  const dir = mkdtempSync(join(tmpdir(), "ara-rechnung-"));
  try {
    const seller = {
      exists: true,
      legal_name: "Beispiel IT-Service e. K.",
      address: "Musterweg 3, 48143 Muenster",
      street: "Musterweg 3",
      postcode: "48143",
      city: "Muenster",
      address_ok: true,
      country: "DE",
      phone: "",
      email: "",
      website: "",
      tax_number: "",
      vat_id: "DE123456789",
      iban: "",
      payment_terms: "14",
    };
    const ledger = {
      exists: true,
      year: 2026,
      last: 1,
      format: "JJJJ-NNNN",
      rows: [{ Number: "2026-0001", Date: "2026-08-27", Customer: "probe", State: "entwurf" }],
    };
    const beleg = (changes = {}, body = "") => {
      const fields = {
        invoice_number: "2026-0001",
        invoice_date: "2026-08-27",
        due_date: "2026-09-10",
        service_date: "2026-08-20",
        buyer_name: "Probe GmbH",
        buyer_street: "Industriestrasse 14",
        buyer_postcode: "48155",
        buyer_city: "Muenster",
        buyer_country: "DE",
        currency: "EUR",
        tax_mode: "standard",
        tax_rate: "19",
        ...changes,
      };
      const file = join(dir, "beleg.md");
      writeFileSync(
        file,
        `---\n${Object.entries(fields)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n")}\n---\n\nFaellig am: ${fields.due_date}\n\n## Leistungen\n\n` +
          "| Pos | Leistung | Menge | Einheit | Einzelpreis netto | Gesamt netto |\n" +
          "| --- | --- | --- | --- | --- | --- |\n" +
          "| 1 | Einrichtung des Geraets in der Zentrale | 2 | Tage | 780,00 Euro | 1.560,00 Euro |\n" +
          `${body}\n`
      );
      return checkVat14(readInvoice(file), seller, ledger);
    };

    const heil = beleg();
    const offen = heil.filter((check) => !check.ok);
    assert(offen.length === 0, `ein vollstaendiger Beleg wird beanstandet: ${offen.map((c) => c.label).join(", ")}`);
    assert(heil.length === 11, `es werden ${heil.length} Angaben geprueft, erwartet 11`);

    // Jede Luecke muss genau ihre Zeile rot machen.
    const luecken = [
      [{ service_date: "" }, /Zeitpunkt der Lieferung/],
      [{ invoice_date: "" }, /Ausstellungsdatum/],
      [{ invoice_number: "2026-0099" }, /Rechnungsnummer/],
      [{ buyer_city: "" }, /Leistungsempfaengers/],
      [{ due_date: "" }, /Faelligkeit/],
    ];
    for (const [change, pattern] of luecken) {
      const rot = beleg(change).filter((check) => !check.ok);
      assert(rot.length >= 1, `${JSON.stringify(change)} macht keine Zeile rot`);
      assert(rot.some((check) => pattern.test(check.label)), `${JSON.stringify(change)} macht die falsche Zeile rot`);
    }

    // Ohne Steuerausweis braucht es den Hinweis auf die Befreiung, sonst nicht.
    const ohneHinweis = beleg({ tax_mode: "kleinunternehmer", tax_rate: "0" }).filter((c) => !c.ok);
    assert(
      ohneHinweis.some((check) => /Steuerbefreiung/.test(check.label)),
      "ein Kleinunternehmer ohne Hinweis auf § 19 UStG faellt nicht auf"
    );
    const mitHinweis = beleg({ tax_mode: "kleinunternehmer", tax_rate: "0" }, "\nKleinunternehmer nach § 19 UStG.\n");
    assert(
      mitHinweis.every((check) => check.ok),
      `mit Hinweis bleibt offen: ${mitHinweis.filter((c) => !c.ok).map((c) => c.label).join(", ")}`
    );

    // Ein Platzhalter im Text ist eine eigene Zeile, nicht nur ein Problem des Drucks.
    const platzhalter = beleg({}, "\n{Noch zu fuellen}\n").filter((check) => !check.ok);
    assert(platzhalter.some((check) => /Platzhalter/.test(check.label)), "ein Platzhalter faellt nicht auf");
    return "11 Angaben, jede einzeln nachgewiesen";
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

check("Die Rechnungsdaten halten die Regeln der EN 16931 ein", () => {
  // Das XML ist das, was die Buchhaltung des Kunden liest. Was hier durchgeht,
  // geht dort ein.
  const dir = mkdtempSync(join(tmpdir(), "ara-cii-"));
  try {
    const file = join(dir, "beleg.md");
    writeFileSync(
      file,
      "---\ninvoice_number: 2026-0001\ninvoice_date: 2026-08-27\ndue_date: 2026-09-10\n" +
        "service_date: 2026-08-20\nbuyer_name: Probe GmbH\nbuyer_street: Industriestrasse 14\n" +
        "buyer_postcode: 48155\nbuyer_city: Muenster\nbuyer_country: DE\ncurrency: EUR\n" +
        "tax_mode: standard\ntax_rate: 19\n---\n\n## Leistungen\n\n" +
        "| Pos | Leistung | Menge | Einheit | Einzelpreis netto | Gesamt netto |\n" +
        "| --- | --- | --- | --- | --- | --- |\n" +
        "| 1 | Einrichtung des Geraets | 2 | Tage | 780,00 Euro | 1.560,00 Euro |\n"
    );
    const seller = {
      legal_name: "Beispiel IT-Service e. K.",
      street: "Musterweg 3",
      postcode: "48143",
      city: "Muenster",
      country: "DE",
      phone: "",
      email: "",
      vat_id: "DE123456789",
      tax_number: "",
      iban: "DE02120300000000202051",
    };
    const xml = buildXml(readInvoice(file), seller);
    const result = validateXml(xml);
    assert(result.ok, `saubere Daten werden beanstandet:\n    ${result.problems.join("\n    ")}`);
    assert(result.unchecked.length > 0, "es wird nicht gesagt, was ungeprueft bleibt");

    // Jede Verfaelschung muss ihre Regel finden.
    const faelle = [
      [xml.replace("<ram:GrandTotalAmount>1856.40", "<ram:GrandTotalAmount>1856.00"), /BR-CO-15/],
      [xml.replace("<ram:CalculatedAmount>296.40", "<ram:CalculatedAmount>300.00"), /BR-CO-1[47]/],
      [xml.replace("<ram:LineTotalAmount>1560.00</ram:LineTotalAmount>\n        ", ""), /BR-24|fehlt/],
      [xml.replace("urn:cen.eu:en16931:2017", "urn:etwas:anderes"), /BR-01/],
      [xml.replace("<ram:CountryID>DE</ram:CountryID>", "<ram:CountryID>Deutschland</ram:CountryID>"), /BR-09/],
      [xml.replace("<ram:TypeCode>380", "<ram:TypeCode>381"), /BR-CL-01/],
      [xml.replace(/<ram:InvoiceCurrencyCode>EUR<\/ram:InvoiceCurrencyCode>\n\s*/, ""), /BR-05|fehlt/],
    ];
    for (const [broken, pattern] of faelle) {
      assert(broken !== xml, "eine Verfaelschung hat gar nichts geaendert, der Test misst nichts");
      const judged = validateXml(broken);
      assert(!judged.ok, `eine Verfaelschung geht durch: ${pattern}`);
      assert(
        judged.problems.some((problem) => pattern.test(problem)),
        `erwartet wurde ${pattern}, gefunden: ${judged.problems.join(" | ")}`
      );
    }

    // Ein vertauschtes Element faellt gegen das Modell der Schemaordnung auf.
    const vertauscht = xml.replace(
      /( *)<ram:TypeCode>VAT<\/ram:TypeCode>\n( *)<ram:CategoryCode>S<\/ram:CategoryCode>/,
      "$1<ram:CategoryCode>S</ram:CategoryCode>\n$2<ram:TypeCode>VAT</ram:TypeCode>"
    );
    assert(vertauscht !== xml, "die Vertauschung hat nichts geaendert, der Test misst nichts");
    assert(
      validateXml(vertauscht).problems.some((problem) => /Reihenfolge/.test(problem)),
      "eine vertauschte Reihenfolge faellt nicht auf"
    );
    return `${faelle.length} Verfaelschungen, jede gefunden`;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

check("Das PDF traegt die Rechnungsdaten und gibt sie unveraendert zurueck", () => {
  // ZUGFeRD lebt davon, dass das XML wirklich im PDF steckt. Eine Datei
  // daneben geht auf dem Weg zum Kunden verloren.
  const dir = mkdtempSync(join(tmpdir(), "ara-zugferd-"));
  try {
    const quelle = join(dir, "blatt.md");
    const ziel = join(dir, "blatt.pdf");
    writeFileSync(quelle, "---\nprobe: ja\n---\n\n# Rechnung\n\nEin Satz.\n");
    const run = tool("pdf.mjs", [quelle, "--out", ziel]);
    if (/Kein Chromium gefunden/.test(run.stderr)) return "uebersprungen: kein Chromium auf diesem Rechner";
    assert(run.status === 0, `Druck fehlgeschlagen: ${run.stderr || run.stdout}`);

    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<probe>Ümläute und &amp; dazu</probe>\n';
    const fertig = embed(readFileSync(ziel), {
      xml,
      attachment: "factur-x.xml",
      profile: "EN 16931",
      description: "Rechnung 2026-0001 als Datensatz",
      author: "Beispiel IT-Service e. K.",
    });
    writeFileSync(ziel, fertig);

    const lage = inspect(readFileSync(ziel));
    assert(lage.attachment, "im PDF steckt keine angehaengte Datei");
    assert(lage.attachment.name === "factur-x.xml", `der Anhang heisst ${lage.attachment.name}`);
    assert(lage.attachment.xml === xml, "der Anhang kommt veraendert zurueck");
    assert(lage.attachment.relationship === "Alternative", "die Beziehung des Anhangs ist nicht Alternative");
    assert(lage.pdfa, "die Kennzeichnung als PDF/A-3B fehlt");
    assert(lage.outputIntent, "das Ausgabeprofil fehlt");
    assert(lage.associated, "der Verweis /AF im Katalog fehlt");
    assert(lage.embeddedFiles, "der Namensbaum der eingebetteten Dateien fehlt");
    assert(lage.facturx, "die Factur-X-Metadaten fehlen");
    assert(lage.header === "%PDF-1.7", `die Kopfzeile ist ${lage.header}`);

    // Die Querverweise des Nachtrags muessen auf ihre Objekte zeigen, sonst
    // ist die Datei fuer jeden Leser kaputt.
    const text = fertig.toString("latin1");
    const start = Number([...text.matchAll(/startxref\s+(\d+)/g)].pop()[1]);
    const zeilen = text.slice(start).split("\n");
    let geprueft = 0;
    for (let i = 1; i < zeilen.length; i++) {
      const abschnitt = zeilen[i].trim().match(/^(\d+) (\d+)$/);
      if (!abschnitt) {
        if (zeilen[i].startsWith("trailer")) break;
        continue;
      }
      const ersteNummer = Number(abschnitt[1]);
      for (let k = 0; k < Number(abschnitt[2]); k++) {
        const stelle = Number(zeilen[i + 1 + k].trim().split(/\s+/)[0]);
        assert(
          text.startsWith(`${ersteNummer + k} 0 obj`, stelle),
          `der Querverweis auf Objekt ${ersteNummer + k} zeigt auf die falsche Stelle`
        );
        geprueft++;
      }
      i += Number(abschnitt[2]);
    }
    assert(geprueft > 0, "der Nachtrag hat keine Querverweistabelle");
    return `${geprueft} Querverweise, Anhang unveraendert`;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

check("Das Ausgabeprofil ist ein lesbares ICC-Profil", () => {
  // Ohne Ausgabeprofil ist bei PDF/A nicht festgelegt, welche Farbe ein Wert
  // bedeutet. Gebaut wird es im Kit, also wird auch hier nachgesehen.
  const profile = sRgbProfile();
  assert(profile.readUInt32BE(0) === profile.length, "die Groesse im Kopf stimmt nicht mit der Datei ueberein");
  assert(profile.subarray(36, 40).toString("latin1") === "acsp", "die Kennung acsp fehlt");
  assert(profile.subarray(12, 16).toString("latin1") === "mntr", "es ist kein Bildschirmprofil");
  assert(profile.subarray(16, 20).toString("latin1") === "RGB ", "der Farbraum ist nicht RGB");
  const count = profile.readUInt32BE(128);
  const tags = [];
  for (let i = 0; i < count; i++) {
    const at = 132 + i * 12;
    const name = profile.subarray(at, at + 4).toString("latin1");
    const offset = profile.readUInt32BE(at + 4);
    const size = profile.readUInt32BE(at + 8);
    assert(offset + size <= profile.length, `der Eintrag ${name} zeigt ueber das Profil hinaus`);
    tags.push(name);
  }
  for (const needed of ["desc", "cprt", "wtpt", "rXYZ", "gXYZ", "bXYZ", "rTRC", "gTRC", "bTRC"]) {
    assert(tags.includes(needed), `im Profil fehlt der Eintrag ${needed}`);
  }
  return `${tags.length} Eintraege, ${profile.length} Byte`;
});

check("pdf.mjs druckt kein Frontmatter", () => {
  // Ein Beleg traegt seine maschinenlesbaren Felder im Kopf. Gedruckt saehe der
  // Kunde zuerst eine Liste von Feldnamen.
  const dir = mkdtempSync(join(tmpdir(), "ara-kopf-"));
  try {
    const quelle = join(dir, "beleg.md");
    const ziel = join(dir, "beleg.html");
    writeFileSync(
      quelle,
      "---\ninvoice_number: 2026-0001\ntax_mode: standard\n---\n\n> Hinweis der Vorlage.\n\n---\n\n# Rechnung\n\nEin Satz.\n"
    );
    const run = tool("pdf.mjs", [quelle, "--html", "--out", ziel]);
    assert(run.status === 0, `HTML-Ausgabe fehlgeschlagen: ${run.stderr || run.stdout}`);
    const html = readFileSync(ziel, "utf8");
    assert(!/invoice_number/.test(html), "das Frontmatter landet im Papier");
    assert(!/Hinweis der Vorlage/.test(html), "der Hinweisblock der Vorlage landet im Papier");
    assert(/<h1>Rechnung<\/h1>/.test(html), "der Inhalt fehlt");
    return "Kopf und Hinweisblock bleiben draussen";
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

await checkAsync("Eine Rechnung entsteht aus einer Kundenakte, mit Nummer und Anhang", async () => {
  // Der ganze Weg an einem Wegwerf-Kit: Firmenkopf, Kundenakte, Angebot,
  // Rechnung, Pruefliste, Druck. Nichts davon fasst die echten Ordner an.
  const work = mkdtempSync(join(tmpdir(), "ara-invoice-"));
  const fork = join(work, "kit");
  cpSync(join(ROOT, ".ara"), join(fork, ".ara"), {
    recursive: true,
    filter: (src) => !/\/(mirror|node_modules)(\/|$)/.test(src),
  });
  const write = (rel, content) => {
    mkdirSync(join(fork, rel, ".."), { recursive: true });
    writeFileSync(join(fork, rel), content);
  };
  const read = (rel) => readFileSync(join(fork, rel), "utf8");
  const forkTool = (args) =>
    new Promise((done) => {
      const child = spawn("node", [join(fork, ".ara", "tools", "invoice.mjs"), ...args], { cwd: fork });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (d) => (stdout += d));
      child.stderr.on("data", (d) => (stderr += d));
      child.on("close", (status) => done({ status, stdout, stderr }));
    });

  try {
    write("business/profile.md", "---\nrole: partner\nname: Probe\ninvoice: yes\n---\n\nMeins.\n");
    write(
      "business/company.md",
      "---\nlegal_name: Beispiel IT-Service e. K.\naddress: Musterweg 3, 48143 Muenster\n" +
        "country: DE\nphone: 0251 000000\nemail: post@beispiel-it.example\nwebsite:\n" +
        "tax_number:\nvat_id: DE123456789\niban: DE02120300000000202051\npayment_terms: 14\nlogo:\n---\n\nMeins.\n"
    );
    write(
      "customers/probe/customer.md",
      "---\nid: probe\nlegal_name: Probe Metallbau GmbH\nstatus: won\ncontact_person: Frau Berger\n" +
        "street: Industriestrasse 14\npostcode: 48155\ncity: Muenster\ncountry: DE\nvat_id:\n---\n\nMeins.\n"
    );
    write(
      "customers/probe/documents/2026-08-10-angebot.md",
      "# Angebot\n\n## Leistungen\n\n| Pos | Leistung | Menge | Einzelpreis netto | Gesamt netto |\n" +
        "| --- | --- | --- | --- | --- |\n" +
        "| 1 | Einrichtung des Geraets in der Zentrale | 2 | 780,00 Euro | 1.560,00 Euro |\n" +
        "| 2 | Wartung, erstes Jahr | 1 | 960,00 Euro | 960,00 Euro |\n" +
        "| | **Summe netto** | | | **2.520,00 Euro** |\n"
    );

    // 1. Ohne Nummernkreis sagt die Uebersicht, wie einer entsteht.
    let run = await forkTool([]);
    assert(run.status === 0, `Uebersicht fehlgeschlagen: ${run.stderr}`);
    assert(/noch keinen Nummernkreis/.test(run.stdout), "der fehlende Nummernkreis wird nicht benannt");

    // 2. Die erste Rechnung nimmt die Positionen aus dem Angebot der Akte.
    run = await forkTool(["--customer", "probe", "--new", "--date", "2026-08-27", "--service-date", "2026-08-20"]);
    assert(run.status === 0, `Anlegen fehlgeschlagen: ${run.stderr}`);
    assert(/2026-0001/.test(run.stdout), "die erste Nummer ist nicht 2026-0001");
    assert(/2 Positionen aus/.test(run.stdout), `die Positionen kommen nicht aus dem Angebot: ${run.stdout}`);
    assert(/Alle Pflichtangaben stehen/.test(run.stdout), `es fehlt etwas: ${run.stdout}`);
    const beleg = "customers/probe/documents/2026-08-27-rechnung-2026-0001.md";
    assert(existsSync(join(fork, beleg)), "der Beleg ist nicht abgelegt worden");
    assert(/2\.520,00/.test(read(beleg)), "die Summe aus dem Angebot steht nicht im Beleg");
    assert(/478,80/.test(read(beleg)), "die Umsatzsteuer steht nicht im Beleg");
    assert(/2\.998,80/.test(read(beleg)), "der Rechnungsbetrag steht nicht im Beleg");
    assert(/\| 2026-0001 \|/.test(read("business/invoices.md")), "die Nummer steht nicht im Nummernkreis");

    // 3. Die Pruefliste ist gruen und nennt, was sie nicht geprueft hat.
    run = await forkTool(["--check", beleg]);
    assert(run.status === 0, `die Pruefliste ist rot:\n${run.stdout}`);
    assert(!/FEHL/.test(run.stdout), `die Pruefliste ist rot:\n${run.stdout}`);
    assert(/Ungeprueft:/.test(run.stdout), "es wird nicht gesagt, was ungeprueft bleibt");

    // 4. Die zweite Rechnung bekommt die naechste Nummer.
    run = await forkTool([
      "--customer", "probe", "--new", "--date", "2026-08-28", "--service-date", "2026-08-28",
      "--position", "Stoerungsbehebung, Fernwartung|1,5|Stunden|95,00",
    ]);
    assert(run.status === 0, `die zweite Rechnung scheitert: ${run.stderr}`);
    assert(/2026-0002/.test(run.stdout), `die zweite Nummer ist nicht 2026-0002: ${run.stdout}`);
    assert(/142,50/.test(run.stdout), "eine halbe Stunde wird nicht gerechnet");

    // 5. Ein Beleg ohne Pflichtangabe wird nicht gedruckt.
    write(
      "customers/luecke/customer.md",
      "---\nid: luecke\nlegal_name: Ohne Anschrift GmbH\nstatus: won\n---\n\nMeins.\n"
    );
    run = await forkTool(["--customer", "luecke", "--new", "--date", "2026-08-29", "--empty"]);
    assert(run.status === 0, `Anlegen fehlgeschlagen: ${run.stderr}`);
    assert(/Pflichtangaben fehlen noch/.test(run.stdout), "der unvollstaendige Beleg gilt als fertig");
    const halb = "customers/luecke/documents/2026-08-29-rechnung-2026-0003.md";
    run = await forkTool(["--pdf", halb]);
    assert(run.status !== 0, "ein Beleg ohne Pflichtangaben wird gedruckt");
    assert(/wird nicht gedruckt/.test(run.stderr), "es wird nicht gesagt, warum nicht gedruckt wird");
    assert(!existsSync(join(fork, halb.replace(/\.md$/, ".pdf"))), "es ist trotzdem ein PDF entstanden");

    // 6. Eine verworfene Nummer bleibt vergeben.
    run = await forkTool(["--void", "2026-0003", "--reason", "Kunde springt ab"]);
    assert(run.status === 0, `Stornieren fehlgeschlagen: ${run.stderr}`);
    assert(/storniert/.test(read("business/invoices.md")), "die Stornierung steht nicht im Nummernkreis");
    assert(/Kunde springt ab/.test(read("business/invoices.md")), "der Grund fehlt");
    run = await forkTool([]);
    assert(!/Luecke/.test(run.stdout), `der Kreis meldet eine Luecke: ${run.stdout}`);
    assert(/Naechste waere 2026-0004/.test(run.stdout), "nach einer Stornierung wird die Nummer neu vergeben");

    // 7. Drucken, und der Anhang muss aus dem fertigen PDF zurueckkommen.
    run = await forkTool(["--pdf", beleg]);
    if (/Kein Chromium gefunden/.test(run.stdout + run.stderr)) {
      return "ohne Druck geprueft: kein Chromium auf diesem Rechner";
    }
    assert(run.status === 0, `Druck fehlgeschlagen: ${run.stdout}\n${run.stderr}`);
    const pdf = join(fork, beleg.replace(/\.md$/, ".pdf"));
    assert(existsSync(pdf), "es ist kein PDF entstanden");
    const lage = inspect(readFileSync(pdf));
    assert(lage.attachment?.name === "factur-x.xml", "im PDF steckt keine Rechnungsdatei");
    const geprueft = validateXml(lage.attachment.xml);
    assert(geprueft.ok, `der Anhang im PDF wird beanstandet:\n    ${geprueft.problems.join("\n    ")}`);
    assert(/2026-0001/.test(lage.attachment.xml), "im Anhang steht die Rechnungsnummer nicht");
    assert(/2998.80/.test(lage.attachment.xml), "im Anhang steht der Rechnungsbetrag nicht");
    assert(/gestellt/.test(read("business/invoices.md")), "der Nummernkreis fuehrt den Beleg nicht als gestellt");

    // Das Papier und der Anhang muessen dieselbe Zahl nennen. Genau dafuer gibt
    // es nur eine Tabelle und keinen zweiten Datensatz daneben.
    run = await forkTool(["--validate", beleg.replace(/\.md$/, ".pdf")]);
    assert(run.status === 0, `die fertige Rechnung wird beanstandet:\n${run.stdout}`);
    assert(/PDF\/A-3B gesetzt/.test(run.stdout), "die Kennzeichnung als PDF/A-3B fehlt");
    return "zwei Nummern, eine Stornierung, ein PDF mit Anhang";
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
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
  // `Dockerfile` heisst so, weil Docker es so erwartet: es steht im Paket einer
  // App und wird am Geraet gebaut, nicht von einem Kit-Werkzeug gelesen.
  // `VERSION` und `CHANGELOG.md` sind ueberall im Handwerk grossgeschrieben;
  // ein Partner sucht sie unter diesem Namen und nicht unter einem eigenen.
  const fixed = new Set([
    "README.md",
    "CLAUDE.md",
    "SKILL.md",
    "LICENSE",
    "VERSION",
    "CHANGELOG.md",
    ".gitkeep",
    "Dockerfile",
  ]);
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

check("Jedes Werkzeug beantwortet --help und tut sonst nichts", () => {
  // Am 28.08.2026 führte `device.mjs --help` eine Geräteprüfung aus und
  // `mirror.mjs --help` lud den Spiegel. Wer fragt, was ein Werkzeug tut, hat
  // sich gerade nicht dafür entschieden, dass es etwas tut.
  //
  // `guard.mjs` steht nicht in der Liste: es ist der Riegel, bekommt seine
  // Eingabe von einem Hook auf der Standardeingabe und wird von keinem Menschen
  // aufgerufen.
  const dir = join(ROOT, ".ara", "tools");
  const tools = readdirSync(dir)
    .filter((name) => name.endsWith(".mjs") && name !== "guard.mjs")
    .sort();
  assert(tools.length >= 20, `nur ${tools.length} Werkzeuge gefunden, das kann nicht stimmen`);

  // Nichts darf sich dabei ändern. Der Merker ist der Zeuge: er ist die Datei,
  // die eine Geräteprüfung als Erstes anfasst.
  const stateFile = join(ROOT, ".ara", "state.json");
  const before = existsSync(stateFile) ? readFileSync(stateFile, "utf8") : null;

  for (const name of tools) {
    const run = tool(name, ["--help"], "");
    assert(run.status === 0, `${name} --help endet mit ${run.status}: ${run.stderr || run.stdout}`);
    const expected = headerHelp(new URL(`./${name}`, import.meta.url).href).trim();
    assert(expected.length > 40, `${name} hat keinen brauchbaren Kopf, aus dem eine Hilfe würde`);
    assert(
      run.stdout.trim() === expected,
      `${name} --help antwortet nicht mit seiner Kopfhilfe:\n${run.stdout.slice(0, 200)}`
    );
    assert(!/error/i.test(run.stderr), `${name} --help meldet einen Fehler: ${run.stderr}`);
  }

  const after = existsSync(stateFile) ? readFileSync(stateFile, "utf8") : null;
  assert(after === before, "ein --help hat den Merker angefasst, also hat ein Werkzeug gearbeitet");
  return `${tools.length} Werkzeuge`;
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
  // heisst aber /offer und nicht .claude/commands/offer.md, also ist er ihr
  // zweimal durchgerutscht: der Angebotsbefehl stand in CLAUDE.md, im README und in den
  // Vorlagen, und die Datei dazu gab es nie. Ein Partner liest davon, tippt es,
  // und es passiert nichts.
  //
  // Findet die Pruefung einen Befehl, den es absichtlich noch nicht gibt, ist
  // das eine Aussage ueber das Repo und nicht ueber die Pruefung.
  const files = [];
  // Die Vorlage einer App ist Quelltext und keine Anleitung: ein Pfad wie
  // /gesund im Manifest ist ein Weg in ihrem Backend und kein Befehl.
  const template = join(ROOT, ".ara", "templates", "app");
  const collect = (dir) => {
    if (dir === template) return;
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
  // .env.example ist kein Markdown und stand darum nie in dieser Pruefung. Sie
  // nannte bis zum 28.08.2026 /start, den es seit E1 nicht mehr gibt, und sie
  // ist genau die Datei, die ein Fremder als Erstes aufmacht.
  files.push(join(ROOT, ".env.example"));

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
    // Ein abgeloester Befehl hat absichtlich keine Datei. Genannt werden darf er
    // trotzdem, aber nur zusammen mit dem Namen, unter dem es ihn heute gibt:
    // sonst liest jemand von einem Befehl, den er nicht aufrufen kann.
    if (RETIRED[name]) {
      const ohneNachfolger = [...where].filter(
        (file) => !new RegExp(`/${RETIRED[name]}\\b`).test(readFileSync(join(ROOT, file), "utf8"))
      );
      if (ohneNachfolger.length) {
        missing.push(
          `/${name} ist abgeloest durch /${RETIRED[name]}, aber in ${ohneNachfolger.join(", ")} ` +
            "steht der neue Name nicht daneben"
        );
      }
      continue;
    }
    missing.push(`/${name} fehlt in .ara/commands/, genannt in ${[...where].join(", ")}`);
  }
  assert(missing.length === 0, `Befehle ohne Datei:\n    ${missing.join("\n    ")}`);
  const abgeloest = [...found.keys()].filter((name) => RETIRED[name]).length;
  return `${found.size} Befehle genannt, alle vorhanden${abgeloest ? `, ${abgeloest} abgeloest und mit Nachfolger genannt` : ""}`;
});

check("Die Vorlage der .env nennt einen Befehl, den es gibt", () => {
  // Sie ist die erste Datei, die ein Fremder aufmacht, und sie schickte ihn bis
  // zum 28.08.2026 zu /start. Den Befehl gibt es seit E1 nicht mehr.
  const text = readFileSync(join(ROOT, ".env.example"), "utf8");
  for (const [alt, neu] of Object.entries(RETIRED)) {
    assert(
      !new RegExp(`/${alt}\\b`).test(text) || new RegExp(`/${neu}\\b`).test(text),
      `.env.example nennt /${alt}, den Befehl gibt es nicht mehr, er heisst /${neu}`
    );
  }
  assert(/\/init\b/.test(text), ".env.example sagt nicht, welcher Befehl daraus die echte .env macht");
  assert(/secrets\.mjs --set/.test(text), ".env.example sagt nicht, wie man einen Wert einträgt, ohne sie zu öffnen");
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
  // Ein neuer Stand mit einer neuen Nummer und einem Eintrag dazu: /init soll
  // vor dem Einspielen sagen koennen, was dazukommt, und nicht nur, welche
  // Dateien sich aendern.
  //
  // Beide Nummern kommen aus dem Kit selbst. Stuenden sie hier fest, waere
  // dieser Test bei jedem Standwechsel rot, ohne dass am Update etwas fehlt.
  const stand = read(".ara/VERSION").trim();
  const neuerStand = stand.replace(/^(\d+)\.(\d+)\.\d+$/, (_, major, minor) => `${major}.${Number(minor) + 1}.0`);
  assert(neuerStand !== stand, `aus "${stand}" laesst sich keine naechste Nummer bilden`);
  writeFileSync(join(source, ".ara", "VERSION"), `${neuerStand}\n`);
  writeFileSync(
    join(source, ".ara", "CHANGELOG.md"),
    read(".ara/CHANGELOG.md").replace(
      `## ${stand} (`,
      `## ${neuerStand} (2026-09-01)\n\nKontrakt: bis 3\n\n- Ein erfundener Punkt fuer den Selbsttest.\n\n## ${stand} (`
    )
  );
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
    assert(run.stdout.includes(`Stand: ${neuerStand}`), `der neue Stand wird nicht genannt: ${run.stdout}`);
    assert(run.stdout.includes(`Neu seit ${stand}`), "es wird nicht gesagt, von welchem Stand es kommt");
    assert(/erfundener Punkt/.test(run.stdout), "der Eintrag der Aenderungsliste fehlt");
    assert(/Kontraktfassungen bis/.test(run.stdout), "die Vertraeglichkeit zum Geraet fehlt");

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

    // 5b. Ein abgeloester Befehl: die unveraenderte Kopie raeumt --apply weg,
    // eine angepasste bleibt liegen. Sonst haette der Partner nach dem Update
    // /angebot und /offer nebeneinander, und der alte fuehrt durch ein
    // Verfahren, das es nicht mehr gibt.
    const [alterName, nachfolger] = Object.entries(RETIRED)[0];
    const merker = JSON.parse(read(".claude/commands/.sources.json"));
    const merkeAls = (inhalt) => {
      write(`.claude/commands/${alterName}.md`, inhalt);
      merker[alterName] = createHash("sha256").update(inhalt).digest("hex");
      write(".claude/commands/.sources.json", JSON.stringify(merker, null, 2) + "\n");
    };

    merkeAls("Der alte Befehl, wie ihn das Kit hingelegt hat.\n");
    run = await forkTool("commands.mjs", []);
    assert(
      new RegExp(`abgeloest\\s+/${alterName}`).test(run.stdout),
      `abgeloester Befehl wird nicht gemeldet: ${run.stdout}`
    );
    assert(new RegExp(`/${nachfolger}`).test(run.stdout), "der neue Name wird nicht genannt");
    assert(!new RegExp(`eigener\\s+/${alterName}`).test(run.stdout), "der abgeloeste gilt als eigener Befehl");
    run = await forkTool("commands.mjs", ["--apply"]);
    assert(!has(`.claude/commands/${alterName}.md`), "die unveraenderte Kopie blieb liegen");
    assert(
      JSON.parse(read(".claude/commands/.sources.json"))[alterName] === undefined,
      "der Merker zum abgeloesten Befehl blieb stehen"
    );

    merkeAls("Der alte Befehl, wie ihn das Kit hingelegt hat.\n");
    write(`.claude/commands/${alterName}.md`, "Der alte Befehl, von Hand geaendert.\n");
    run = await forkTool("commands.mjs", ["--apply"]);
    assert(has(`.claude/commands/${alterName}.md`), "eine von Hand geaenderte Kopie wurde geloescht");
    assert(/liegen geblieben/.test(run.stdout), `das Liegenbleiben wird nicht erklaert: ${run.stdout}`);
    rmSync(join(fork, ".claude", "commands", `${alterName}.md`));

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
