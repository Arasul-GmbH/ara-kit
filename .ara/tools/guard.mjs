#!/usr/bin/env node
/**
 * Riegel: letzter Halt vor gefährlichen Befehlen.
 *
 * Läuft als PreToolUse-Hook vor jedem Bash-Aufruf, unter Claude Code aus
 * .claude/settings.json und unter Codex aus .codex/hooks.json. Beide schicken denselben
 * Umschlag mit `tool_input.command`, Codex dazu den Namen des Werkzeugs und manchmal den
 * Befehl als Liste. Der Riegel liest beides und beendet sich mit Code 2, wenn er blockiert.
 * Die Begründung geht an die Standardfehlerausgabe und damit zurück an den Agenten.
 *
 * Er ist eine Textsuche und keine Grenze: wer den Befehl umbaut, kommt vorbei. Er fängt
 * die Handgriffe ab, die ein Agent von sich aus macht, und das auch dann, wenn der Befehl
 * als Text in einem Werkzeugaufruf steht (`remote.mjs --command "rm -rf /"`).
 *
 * Der Riegel ersetzt keine Bestätigung. Er fängt nur die Handgriffe ab, die niemand
 * bestätigen sollte, weil es keinen Rückweg gibt.
 */

/**
 * Steht die Wurzel oder das Benutzerverzeichnis als Ziel im Befehl? Gelesen wird in
 * Wörtern ohne Anführungszeichen, damit `--command "rm -rf /"` nicht an dem Zeichen
 * hinter dem Schrägstrich vorbeigeht. `/` und `~` zählen überall, `.`, `..`, `/*` und
 * `$HOME` nur als letztes Wort, wie bisher.
 */
function wurzelAlsZiel(befehl) {
  const woerter = befehl
    .split(/[\s;&|]+/)
    .map((wort) => wort.replace(/^["'`(]+|["'`)]+$/g, ""))
    .filter(Boolean);
  if (woerter.some((wort) => wort === "/" || wort === "~")) return true;
  return ["$HOME", "/*", ".", ".."].includes(woerter[woerter.length - 1]);
}

const REGELN = [
  {
    muster: /\brm\s+(-[a-zA-Z]*\s+)*-[a-zA-Z]*[rR][a-zA-Z]*f|rm\s+-f[a-zA-Z]*[rR]/,
    zusatz: wurzelAlsZiel,
    grund: "Rekursives Löschen an der Wurzel oder im Benutzerverzeichnis.",
  },
  {
    muster: /\bmkfs(\.\w+)?\b/,
    grund: "Dateisystem anlegen zerstört den kompletten Datenträger.",
  },
  {
    muster: /\bdd\b[^|]*\bof=\/dev\/(disk0|sda|nvme0n1|vda)\b/,
    grund: "Beschreiben des Systemdatenträgers. Das ist mit hoher Wahrscheinlichkeit der falsche Datenträger.",
  },
  {
    muster: /diskutil\s+(eraseDisk|partitionDisk|zeroDisk)[^\n]*\bdisk0\b/,
    grund: "Löschen des Systemdatenträgers.",
  },
  {
    muster: /:\(\)\s*\{\s*:\|:&\s*\}\s*;:/,
    grund: "Rekursive Prozessbombe.",
  },
  {
    muster: /\bchmod\s+(-R\s+)?777\s+\/(\s|$)/,
    grund: "Rechte am Wurzelverzeichnis aufreißen.",
  },
  {
    muster: /git\s+push\s+.*--force(?!-with-lease)/,
    grund: "Erzwungenes Überschreiben eines entfernten Zweigs.",
  },
  {
    muster: /\b(node|python3?|ruby|perl|php|deno|bun)\b[^\n]*\s(-e|-c|-p|--eval|--print)\b[^\n]*\.env(?!\.example)\b/,
    grund: "Die .env enthält Zugänge und wird auch nicht über einen Einzeiler gelesen. Nutz die Werkzeuge unter .ara/tools/, die sie verwenden, ohne sie anzuzeigen.",
  },
  {
    muster: /\b(grep|egrep|rg|awk|sed|cut|sort|od|hexdump|base64|diff|cmp|nl|tee|source)\b[^\n;&|]*(^|\s)(\.\/)?\.env(\s|$|\||;)/,
    grund: "Die .env enthält Zugänge und wird nicht in den Kontext gelesen. Nutz die Werkzeuge unter .ara/tools/, die sie verwenden, ohne sie anzuzeigen.",
  },
  {
    // Im selben einfachen Befehl: `git log | head; cp .env.example .env` liest nichts.
    muster: /\b(cat|less|more|head|tail|bat|xxd|strings)\b[^\n;&|]*\.env(\s|$|\|)/,
    grund: "Die .env enthält Zugänge und wird nicht in den Kontext gelesen. Nutz die Werkzeuge unter .ara/tools/, die sie verwenden, ohne sie anzuzeigen.",
  },
  {
    muster: /\b(cat|less|more|head|tail|bat|xxd|strings|cp|scp)\b[^\n]*[~/][.]ssh\/id_/,
    grund: "Private SSH-Schlüssel werden nicht gelesen und nicht kopiert.",
  },
  {
    // Nicht nach einem Punkt: `cp .env.example .env` endet auf `env` und ist kein Aufruf.
    muster: /(?<![.\w/-])(printenv|env)\b\s*(\||$)/,
    grund: "Vollständige Umgebungsausgabe kann Zugänge enthalten.",
  },
  {
    muster: /token=[A-Za-z0-9_\-.]{8,}/i,
    grund: "Ein Zugangstoken steht im Klartext im Befehl und landet damit in der Prozessliste und im Protokoll. Nutz stattdessen node .ara/tools/mirror.mjs.",
  },
];

function pruefe(befehl) {
  for (const regel of REGELN) {
    if (!regel.muster.test(befehl)) continue;
    if (regel.zusatz && !regel.zusatz(befehl)) continue;
    return regel.grund;
  }
  return null;
}

async function lieseEingabe() {
  const teile = [];
  for await (const stueck of process.stdin) teile.push(stueck);
  return Buffer.concat(teile).toString("utf8");
}

const roh = await lieseEingabe();

let eingabe;
try {
  eingabe = JSON.parse(roh || "{}");
} catch {
  // Unlesbare Eingabe darf den Agenten nicht lahmlegen.
  process.exit(0);
}

// Codex gibt den Befehl manchmal als Liste, `["bash", "-lc", "..."]`.
const rohBefehl = eingabe?.tool_input?.command;
const befehl = Array.isArray(rohBefehl) ? rohBefehl.join(" ") : rohBefehl;
if (typeof befehl !== "string" || befehl.length === 0) process.exit(0);

const grund = pruefe(befehl);
if (grund) {
  process.stderr.write(
    `Riegel: Befehl blockiert.\n${grund}\n\n` +
      `Versuch nicht, den Riegel zu umgehen. Sag dem Menschen, was du vorhattest, ` +
      `und such einen Weg, der ohne diesen Befehl auskommt.\n`
  );
  process.exit(2);
}

process.exit(0);
