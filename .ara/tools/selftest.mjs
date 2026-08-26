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
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
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
    `würde ins Repository wandern: ${tracked.join(", ")}, .gitignore prüfen`
  );

  // Umgekehrt: das Werkzeug selbst muss verfolgt werden, sonst fehlt es nach dem Klonen.
  const mustBeTracked = [".claude/CLAUDE.md", ".ara/tools/selftest.mjs", "README.md"];
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
  // Arasuls Steuerungsordner gespiegelt werden: vorlagen/bausteine/ und
  // nachweise/. Letzteres wird hier gar nicht betreten.
  const mirrored = new Set(["bausteine"]);

  // **Die eine begründete Ausnahme.** vorlagen/endkundenbedingungen.md nennt
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
  scan(join(ROOT, "vorlagen"));

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
  let run = tool("pdf.mjs", [join(ROOT, "vorlagen", "angebot.md"), "--check"]);
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
  // Am 26.08.2026 zerlegte ein unmaskierter Strich in nachweise/datenverarbeitung.md
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
  const mirrored = /^vorlagen\/bausteine\//;

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
  // Das Papier gehoert mitgeprueft: dort zeigen tote Verweise auf einen
  // Vertragsbestandteil, den es nicht gibt, und das faellt erst beim Kunden auf.
  collect(join(ROOT, "vorlagen"));
  collect(join(ROOT, "nachweise"));
  files.push(join(ROOT, "README.md"));

  const missing = [];
  for (const file of files) {
    const content = readFileSync(file, "utf8");
    const paths = /(?:^|[\s`("])((?:\.(?:ara|claude)|vorlagen|nachweise)\/[A-Za-z0-9._\/-]+)/g;
    for (const match of content.matchAll(paths)) {
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
  collect(join(ROOT, "vorlagen"));
  collect(join(ROOT, "nachweise"));
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

  const missing = [];
  for (const [name, where] of found) {
    if (existsSync(join(ROOT, ".claude", "commands", `${name}.md`))) continue;
    missing.push(`/${name} fehlt als .claude/commands/${name}.md, genannt in ${[...where].join(", ")}`);
  }
  assert(missing.length === 0, `Befehle ohne Datei:\n    ${missing.join("\n    ")}`);
  return `${found.size} Befehle genannt, alle vorhanden`;
});

console.log(
  `\n${results.length - failures} von ${results.length} Prüfungen bestanden.` +
    (failures ? "\n\nDas Kit ist in diesem Zustand nicht verlässlich." : "")
);
process.exit(failures ? 1 : 0);
