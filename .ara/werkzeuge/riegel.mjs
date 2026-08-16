#!/usr/bin/env node
/**
 * Riegel — letzter Halt vor gefährlichen Befehlen.
 *
 * Läuft als PreToolUse-Hook vor jedem Bash-Aufruf. Bekommt den geplanten Befehl auf der
 * Standardeingabe und beendet sich mit Code 2, wenn er blockiert wird. Die Begründung
 * geht an die Standardfehlerausgabe und damit zurück an den Agenten.
 *
 * Der Riegel ersetzt keine Bestätigung. Er fängt nur die Handgriffe ab, die niemand
 * bestätigen sollte, weil es keinen Rückweg gibt.
 */

const REGELN = [
  {
    muster: /\brm\s+(-[a-zA-Z]*\s+)*-[a-zA-Z]*[rR][a-zA-Z]*f|rm\s+-f[a-zA-Z]*[rR]/,
    zusatz: /\s(\/|~|\$HOME|\/\*|\.\s|\.\.)\s*$|\s(\/|~)\s/,
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
    muster: /\b(cat|less|more|head|tail|bat|xxd|strings)\b[^\n]*\.env(\s|$|\|)/,
    grund: "Die .env enthält Zugänge und wird nicht in den Kontext gelesen. Nutz die Werkzeuge unter .ara/werkzeuge/, die sie verwenden, ohne sie anzuzeigen.",
  },
  {
    muster: /\b(cat|less|more|head|tail|bat|xxd|strings|cp|scp)\b[^\n]*[~/][.]ssh\/id_/,
    grund: "Private SSH-Schlüssel werden nicht gelesen und nicht kopiert.",
  },
  {
    muster: /\b(printenv|env)\b\s*(\||$)/,
    grund: "Vollständige Umgebungsausgabe kann Zugänge enthalten.",
  },
  {
    muster: /token=[A-Za-z0-9_\-.]{8,}/i,
    grund: "Ein Zugangstoken steht im Klartext im Befehl und landet damit in der Prozessliste und im Protokoll. Nutz stattdessen node .ara/werkzeuge/spiegel.mjs.",
  },
];

function pruefe(befehl) {
  for (const regel of REGELN) {
    if (!regel.muster.test(befehl)) continue;
    if (regel.zusatz && !regel.zusatz.test(befehl)) continue;
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

const befehl = eingabe?.tool_input?.command;
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
