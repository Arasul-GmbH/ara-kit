#!/usr/bin/env node
/**
 * Selbsttest — prüft, ob das Kit auf diesem Rechner funktioniert.
 *
 * Läuft ohne Kundendaten, ohne Netzzugang zum Portal und ohne Gerät. Nützlich nach
 * einem Update, bei merkwürdigem Verhalten und in der Entwicklung des Kits.
 *
 *   node .ara/tools/selftest.mjs
 */

import { createServer } from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { ROOT, readFrontmatter, writeFrontmatter } from "./lib/kit.mjs";

const results = [];
let failures = 0;

function report(name, ok, hint) {
  // Sofort ausgeben, damit man bei einem hängenden Lauf sieht, wo es klemmt.
  console.log(`${ok ? "ok  " : "FEHL"} ${name}${hint ? ` — ${hint}` : ""}`);
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
 * wo im selben Prozess ein Testserver antworten muss — sonst wartet das Kind auf
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
  // bleiben — sonst landet der Erklärtext als Adresse oder Schlüsselname im Einsatz.
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
    assert(/Ara OS installieren/.test(content), "Phasenname fehlt");

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

    const run = tool("agenda.mjs", []);
    assert(run.status === 0, `Agenda fehlgeschlagen: ${run.stderr}`);
    assert(/Überfällig/.test(run.stdout), "überfällige Wiedervorlage nicht erkannt");
    assert(/nachfassen/.test(run.stdout), "Notiz zur Wiedervorlage fehlt");
    assert(/keine Wartungslaufzeit/.test(run.stdout), "fehlende Wartungslaufzeit nicht bemerkt");

    const json = tool("agenda.mjs", ["--json"]);
    const items = JSON.parse(json.stdout);
    assert(Array.isArray(items) && items.length >= 2, "JSON-Ausgabe unvollständig");
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
    ".env",
    ".ara/mirror/VERSION",
  ];
  const tracked = mustBeIgnored.filter(
    (path) =>
      spawnSync("git", ["check-ignore", "-q", path], { cwd: ROOT }).status !== 0
  );
  assert(
    tracked.length === 0,
    `würde ins Repository wandern: ${tracked.join(", ")} — .gitignore prüfen`
  );

  // Umgekehrt: das Werkzeug selbst muss verfolgt werden, sonst fehlt es nach dem Klonen.
  const mustBeTracked = [".claude/CLAUDE.md", ".ara/tools/selftest.mjs", "README.md"];
  const ignored = mustBeTracked.filter(
    (path) => spawnSync("git", ["check-ignore", "-q", path], { cwd: ROOT }).status === 0
  );
  assert(ignored.length === 0, `fehlt nach dem Klonen: ${ignored.join(", ")}`);

  return `${mustBeIgnored.length} Pfade geprüft`;
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
    for (const match of content.matchAll(/(?:^|[\s`("])(\.(?:ara|claude)\/[A-Za-z0-9._\/-]+)/g)) {
      const target = match[1].replace(/[.,)`]+$/, "");
      if (target.includes("*") || target.endsWith("/")) continue;
      // Alles unter .ara/mirror/ entsteht erst zur Laufzeit.
      if (target.startsWith(".ara/mirror/")) continue;
      if (existsSync(join(ROOT, target))) continue;
      missing.push(`${relative(ROOT, file)} → ${target}`);
    }
  }
  assert(missing.length === 0, `tote Verweise:\n    ${missing.join("\n    ")}`);
  return `${files.length} Dateien`;
});

console.log(
  `\n${results.length - failures} von ${results.length} Prüfungen bestanden.` +
    (failures ? "\n\nDas Kit ist in diesem Zustand nicht verlässlich." : "")
);
process.exit(failures ? 1 : 0);
