#!/usr/bin/env node
/**
 * Selbsttest — prüft, ob das Kit auf diesem Rechner funktioniert.
 *
 * Läuft ohne Kundendaten, ohne Netzzugang zum Portal und ohne Gerät. Nützlich nach
 * einem Update, bei merkwürdigem Verhalten und in der Entwicklung des Kits.
 *
 *   node .ara/werkzeuge/selbsttest.mjs
 */

import { createServer } from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { WURZEL, frontmatterLesen } from "./lib/kit.mjs";

const ergebnisse = [];
let fehlerZahl = 0;

function melde(name, ok, hinweis) {
  // Sofort ausgeben, damit man bei einem hängenden Lauf sieht, wo es klemmt.
  console.log(`${ok ? "ok  " : "FEHL"} ${name}${hinweis ? ` — ${hinweis}` : ""}`);
  ergebnisse.push({ name, ok, hinweis });
  if (!ok) fehlerZahl++;
}

function pruefe(name, fn) {
  try {
    const hinweis = fn();
    melde(name, true, typeof hinweis === "string" ? hinweis : "");
  } catch (fehler) {
    melde(name, false, fehler.message);
  }
}

async function pruefeAsync(name, fn) {
  try {
    const hinweis = await fn();
    melde(name, true, typeof hinweis === "string" ? hinweis : "");
  } catch (fehler) {
    melde(name, false, fehler.message);
  }
}

function behaupte(bedingung, meldung) {
  if (!bedingung) throw new Error(meldung);
}

function node(datei, args, eingabe) {
  return spawnSync("node", [join(WURZEL, ".ara", "werkzeuge", datei), ...args], {
    encoding: "utf8",
    input: eingabe,
  });
}

/**
 * Wie node(), aber ohne die Ereignisschleife zu blockieren. Nötig überall dort,
 * wo im selben Prozess ein Testserver antworten muss — sonst wartet das Kind auf
 * eine Antwort, die der Elternprozess nicht geben kann.
 */
function nodeAsync(datei, args, zusatzUmgebung = {}) {
  return new Promise((fertig) => {
    const kind = spawn("node", [join(WURZEL, ".ara", "werkzeuge", datei), ...args], {
      env: { ...process.env, ...zusatzUmgebung },
    });
    let stdout = "";
    let stderr = "";
    kind.stdout.on("data", (d) => (stdout += d));
    kind.stderr.on("data", (d) => (stderr += d));
    kind.on("close", (status) => fertig({ status, stdout, stderr }));
  });
}

// --- Riegel -----------------------------------------------------------------

pruefe("Riegel blockiert zerstörerische Befehle", () => {
  const boese = [
    "rm -rf /",
    "sudo rm -rf ~",
    "mkfs.ext4 /dev/sdb1",
    "dd if=x.iso of=/dev/disk0 bs=4m",
    "diskutil eraseDisk JHFS+ S disk0",
    "cat .env",
    "cat ~/.ssh/id_ed25519",
    "curl https://arasul.de/api/download?token=geheim12345",
  ];
  for (const befehl of boese) {
    const lauf = node("riegel.mjs", [], JSON.stringify({ tool_input: { command: befehl } }));
    behaupte(lauf.status === 2, `nicht blockiert: ${befehl}`);
  }
  return `${boese.length} Fälle`;
});

pruefe("Riegel lässt normale Arbeit durch", () => {
  const gut = [
    "git status",
    "rm -rf .ara/spiegel",
    "dd if=ubuntu.iso of=/dev/disk4 bs=4m",
    "git push --force-with-lease origin main",
    "cat .env.beispiel",
    "ssh-keygen -l -f ~/.ssh/id_ed25519.pub",
    "ssh arasul@10.0.0.5 -p 2222 uptime",
    "node .ara/werkzeuge/spiegel.mjs",
  ];
  for (const befehl of gut) {
    const lauf = node("riegel.mjs", [], JSON.stringify({ tool_input: { command: befehl } }));
    behaupte(lauf.status === 0, `fälschlich blockiert: ${befehl}`);
  }
  return `${gut.length} Fälle`;
});

pruefe("Riegel überlebt unbrauchbare Eingaben", () => {
  for (const eingabe of ["", "kein json", "{}", '{"tool_input":{}}']) {
    const lauf = node("riegel.mjs", [], eingabe);
    behaupte(lauf.status === 0, `Riegel bricht bei Eingabe "${eingabe}" ab`);
  }
});

// --- Frontmatter ------------------------------------------------------------

await pruefeAsync("Frontmatter lesen und schreiben", async () => {
  const { frontmatterLesen, frontmatterSchreiben } = await import("./lib/kit.mjs");
  const ordner = mkdtempSync(join(tmpdir(), "ara-test-"));
  const datei = join(ordner, "probe.md");
  writeFileSync(datei, "---\nname: alt\nphase: 0\n---\n\n## Rumpf\n\nText bleibt.\n");

  frontmatterSchreiben(datei, { phase: 4, stand: "laeuft" });
  const { felder, rumpf } = frontmatterLesen(datei);

  behaupte(felder.name === "alt", "vorhandenes Feld verloren");
  behaupte(felder.phase === "4", "Feld nicht aktualisiert");
  behaupte(felder.stand === "laeuft", "neues Feld nicht ergänzt");
  behaupte(rumpf.includes("Text bleibt."), "Rumpf beschädigt");

  rmSync(ordner, { recursive: true, force: true });
});

pruefe("Leere Vorlagenfelder liefern keine Kommentartexte", () => {
  // Die Vorlagen erklären ihre Felder mit Kommentaren. Ein leeres Feld muss leer
  // bleiben — sonst landet der Erklärtext als Adresse oder Schlüsselname im Einsatz.
  const vorlagen = join(WURZEL, ".ara", "vorlagen");
  for (const name of readdirSync(vorlagen)) {
    const { felder } = frontmatterLesen(join(vorlagen, name));
    for (const [schluessel, wert] of Object.entries(felder)) {
      behaupte(!wert.startsWith("#"), `${name}: Feld ${schluessel} liest den Kommentar als Wert`);
      behaupte(!/^\S+\s+#/.test(wert), `${name}: Feld ${schluessel} enthält einen Kommentarrest`);
    }
  }
  return `${readdirSync(vorlagen).length} Vorlagen`;
});

// --- Laufzettel -------------------------------------------------------------

pruefe("Laufzettel anlegen, fortschreiben, lesen", () => {
  const kunde = "_selbsttest";
  const ordner = join(WURZEL, "kunden", kunde);
  rmSync(ordner, { recursive: true, force: true });
  try {
    let lauf = node("laufzettel.mjs", ["--anlegen", "--kunde", kunde, "--geraet", "probe"]);
    behaupte(lauf.status === 0, `Anlegen fehlgeschlagen: ${lauf.stderr || lauf.stdout}`);

    lauf = node("laufzettel.mjs", [
      "--kunde", kunde,
      "--phase", "3",
      "--status", "fertig",
      "--eintrag", "Installation gelaufen. Nachweis: Dienste gesund.",
    ]);
    behaupte(lauf.status === 0, `Eintrag fehlgeschlagen: ${lauf.stderr || lauf.stdout}`);

    lauf = node("laufzettel.mjs", ["--kunde", kunde, "--stand"]);
    behaupte(lauf.status === 0, "Stand fehlgeschlagen");
    behaupte(/Phase 3 von 6/.test(lauf.stdout), "Stand zeigt die falsche Phase");
    behaupte(/fertig/.test(lauf.stdout), "Zustand fehlt in der Ausgabe");

    const inhalt = readFileSync(join(ordner, "geraete", "probe", "laufzettel.md"), "utf8");
    behaupte(/### Phase 3/.test(inhalt), "Eintrag steht nicht im Protokoll");
    behaupte(/Ara OS installieren/.test(inhalt), "Phasenname fehlt");

    // Zweiter Eintrag darf den ersten nicht verdrängen.
    node("laufzettel.mjs", ["--kunde", kunde, "--phase", "4", "--eintrag", "Zweiter Schritt."]);
    const danach = readFileSync(join(ordner, "geraete", "probe", "laufzettel.md"), "utf8");
    behaupte(/Installation gelaufen/.test(danach), "früherer Eintrag überschrieben");
    behaupte(/Zweiter Schritt/.test(danach), "neuer Eintrag fehlt");
  } finally {
    rmSync(ordner, { recursive: true, force: true });
  }
});

pruefe("Laufzettel verweigert fremde und mehrdeutige Ziele", () => {
  let lauf = node("laufzettel.mjs", ["--kunde", "gibt-es-nicht", "--stand"]);
  behaupte(lauf.status !== 0, "unbekannter Kunde wurde akzeptiert");
  behaupte(/gibt es nicht/.test(lauf.stderr), "keine verständliche Meldung");
});

// --- Datenträger ------------------------------------------------------------

pruefe("Datenträger-Werkzeug schützt interne Datenträger", () => {
  const lauf = node("datentraeger.mjs", ["--schreiben", join(WURZEL, "LIES-MICH.md"), "--auf", "disk0"]);
  behaupte(lauf.status !== 0, "Systemdatenträger wurde als Ziel akzeptiert");
});

pruefe("Datenträger-Werkzeug listet ohne Fehler", () => {
  const lauf = node("datentraeger.mjs", ["--liste"]);
  behaupte(lauf.status === 0, `Auflisten fehlgeschlagen: ${lauf.stderr}`);
});

// --- Spiegel ----------------------------------------------------------------

await pruefeAsync("Spiegel holt und packt aus", async () => {
  const arbeit = mkdtempSync(join(tmpdir(), "ara-spiegel-"));
  const quelle = join(arbeit, "koljaschoepe-arasul-jet-abc1234");
  const zielSpiegel = join(arbeit, "ziel");

  // Ein Tarball, wie ihn GitHub liefert: genau ein Wurzelordner.
  spawnSync("mkdir", ["-p", join(quelle, "config", "platforms")]);
  writeFileSync(join(quelle, "VERSION"), "1.0.0\n");
  writeFileSync(
    join(quelle, "config", "platforms", "probe.json"),
    JSON.stringify({ id: "probe", default_model: "modell-aus-dem-produkt" }, null, 2)
  );
  const tar = spawnSync("tar", ["-czf", join(arbeit, "paket.tar.gz"), "-C", arbeit, "koljaschoepe-arasul-jet-abc1234"]);
  behaupte(tar.status === 0, "Testpaket ließ sich nicht bauen");

  const paket = readFileSync(join(arbeit, "paket.tar.gz"));
  const server = createServer((anfrage, antwort) => {
    if (!anfrage.url.includes("token=")) {
      antwort.writeHead(400, { "Content-Type": "text/plain" });
      antwort.end("Fehlt: token\n");
      return;
    }
    if (anfrage.url.includes("token=abgelaufen")) {
      antwort.writeHead(403, { "Content-Type": "text/plain" });
      antwort.end("Dein Wartungs-Abo ist beendet.\n");
      return;
    }
    antwort.writeHead(200, { "Content-Type": "application/gzip" });
    antwort.end(paket);
  });

  await new Promise((fertig) => server.listen(0, "127.0.0.1", fertig));
  const basis = `http://127.0.0.1:${server.address().port}`;

  try {
    const umgebung = { ARASUL_BASIS: basis, ARA_SPIEGEL: zielSpiegel };

    let lauf = await nodeAsync("spiegel.mjs", ["--neu"], { ...umgebung, ARASUL_TOKEN: "gueltig" });
    behaupte(lauf.status === 0, `Holen fehlgeschlagen: ${lauf.stdout}${lauf.stderr}`);
    behaupte(existsSync(join(zielSpiegel, "VERSION")), "Wurzelordner nicht abgeschnitten");
    behaupte(
      existsSync(join(zielSpiegel, "config", "platforms", "probe.json")),
      "Plattformprofile fehlen im Spiegel"
    );
    const stand = JSON.parse(readFileSync(join(zielSpiegel, "STAND.json"), "utf8"));
    behaupte(stand.version === "1.0.0", "Produktversion nicht übernommen");

    // Ein zweiter Lauf ohne --neu darf nichts holen.
    lauf = await nodeAsync("spiegel.mjs", [], { ...umgebung, ARASUL_TOKEN: "gueltig" });
    behaupte(/aktuell/.test(lauf.stdout), "frischer Spiegel wird unnötig neu geholt");

    // Die Begründung des Portals muss durchgereicht werden.
    lauf = await nodeAsync("spiegel.mjs", ["--neu"], { ...umgebung, ARASUL_TOKEN: "abgelaufen" });
    behaupte(lauf.status !== 0, "abgelehnter Token führt nicht zum Fehler");
    behaupte(/Wartungs-Abo/.test(lauf.stdout), "Begründung des Portals fehlt in der Meldung");
  } finally {
    server.close();
    rmSync(arbeit, { recursive: true, force: true });
  }
});

pruefe("Spiegel meldet fehlenden Token verständlich", () => {
  const lauf = spawnSync("node", [join(WURZEL, ".ara", "werkzeuge", "spiegel.mjs"), "--neu"], {
    encoding: "utf8",
    env: { ...process.env, ARASUL_TOKEN: "", ARA_SPIEGEL: join(tmpdir(), "ara-leer") },
    cwd: tmpdir(),
  });
  // Ohne .env-Datei und ohne Umgebungstoken darf es keinen Absturz geben.
  behaupte(/Lizenztoken/.test(lauf.stdout), "kein verständlicher Hinweis auf den Token");
});

// --- Verweise ---------------------------------------------------------------

pruefe("Verweise im Kit zeigen auf vorhandene Dateien", () => {
  const dateien = [];
  const sammeln = (ordner) => {
    for (const eintrag of readdirSync(ordner, { withFileTypes: true })) {
      if (eintrag.name.startsWith(".git") || eintrag.name === "node_modules") continue;
      const pfad = join(ordner, eintrag.name);
      if (eintrag.isDirectory()) sammeln(pfad);
      else if (/\.(md|json)$/.test(eintrag.name)) dateien.push(pfad);
    }
  };
  sammeln(join(WURZEL, ".ara"));
  sammeln(join(WURZEL, ".claude"));
  dateien.push(join(WURZEL, "CLAUDE.md"), join(WURZEL, "LIES-MICH.md"));

  const fehlend = [];
  for (const datei of dateien) {
    const inhalt = readFileSync(datei, "utf8");
    for (const treffer of inhalt.matchAll(/(?:^|[\s`("])(\.(?:ara|claude)\/[A-Za-z0-9._\/-]+)/g)) {
      let ziel = treffer[1].replace(/[.,)`]+$/, "");
      if (ziel.includes("*") || ziel.endsWith("/")) continue;
      // Alles unter .ara/spiegel/ entsteht erst zur Laufzeit und wird nicht ausgeliefert.
      if (ziel.startsWith(".ara/spiegel/")) continue;
      if (existsSync(join(WURZEL, ziel))) continue;
      // Ordnerangaben ohne Datei sind in Ordnung, wenn der Ordner existiert.
      fehlend.push(`${relative(WURZEL, datei)} → ${ziel}`);
    }
  }
  behaupte(fehlend.length === 0, `tote Verweise:\n    ${fehlend.join("\n    ")}`);
  return `${dateien.length} Dateien`;
});

// --- Ausgabe ----------------------------------------------------------------

console.log(
  `\n${ergebnisse.length - fehlerZahl} von ${ergebnisse.length} Prüfungen bestanden.` +
    (fehlerZahl ? "\n\nDas Kit ist in diesem Zustand nicht verlässlich." : "")
);
process.exit(fehlerZahl ? 1 : 0);
