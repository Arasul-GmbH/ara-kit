/**
 * Der Stand des Kits: welche Nummer, was neu ist, und wozu es passt.
 *
 * Bis hierher hatte das Kit keine Nummer. Ein Partner, der `/init` aufrief,
 * bekam eine Liste geänderter Dateien und daraus keine Antwort auf die zwei
 * Fragen, die er wirklich hat: was kann es jetzt, und arbeitet es noch mit
 * meinem Gerät zusammen. Beides steht ab jetzt an einer Stelle: die Nummer in
 * `.ara/VERSION`, das Neue in `.ara/CHANGELOG.md`.
 *
 * **Die Verträglichkeit steht nicht im Text, sondern im Code.** Welche
 * Kontraktfassungen das Kit versteht, sagt `KIT_CONTRACT_VERSIONS`; ein Satz
 * darüber in einer Markdown-Datei wäre eine zweite Wahrheit, die beim ersten
 * Nachziehen zurückbleibt. Die Änderungsliste nennt die Zahl trotzdem je Stand,
 * und der Selbsttest hält den obersten Eintrag gegen den Code.
 *
 * Reine Funktionen: kein Netz, keine Dateien außer der, die hereingereicht wird.
 */

import { KIT_CONTRACT_VERSION } from "./contract.mjs";

/** Zerlegt eine Nummer der Form 1.2.3 in Zahlen. Was nicht passt, wird zu null. */
function parts(version) {
  const match = String(version || "").trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

/** Vergleicht zwei Nummern: negativ heißt, a ist älter. Unbekanntes gilt als älter. */
export function compareVersions(a, b) {
  const left = parts(a);
  const right = parts(b);
  if (!left && !right) return 0;
  if (!left) return -1;
  if (!right) return 1;
  for (let i = 0; i < 3; i++) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  return 0;
}

/**
 * Die Einträge der Änderungsliste.
 *
 * Ein Eintrag beginnt mit `## <nummer> (<datum>)`, darunter steht optional die
 * Zeile `Kontrakt: bis <zahl>` und danach die Punkte als Aufzählung. Alles
 * andere im Text wird überlesen: die Datei hat oben eine Erklärung für
 * Menschen, und die soll nicht als Änderung durchgehen.
 */
export function parseChangelog(text) {
  const entries = [];
  let current = null;
  for (const line of String(text || "").split(/\r?\n/)) {
    const head = line.match(/^##\s+(\d+\.\d+\.\d+)\s+\((\d{4}-\d{2}-\d{2})\)\s*$/);
    if (head) {
      current = { version: head[1], date: head[2], contract: null, lines: [] };
      entries.push(current);
      continue;
    }
    if (/^##\s/.test(line)) {
      current = null;
      continue;
    }
    if (!current) continue;
    const contract = line.match(/^Kontrakt:\s*bis\s+(\d+)\s*$/);
    if (contract) {
      current.contract = Number(contract[1]);
      continue;
    }
    const point = line.match(/^[-*]\s+(.*\S)\s*$/);
    if (point) current.lines.push(point[1]);
  }
  return entries;
}

/** Die Einträge, die neuer sind als ein Stand. Ohne bekannten Stand: alle. */
export function entriesSince(entries, version) {
  if (!parts(version)) return entries;
  return entries.filter((entry) => compareVersions(entry.version, version) > 0);
}

/**
 * Die Verträglichkeit zum Gerät, in Sätzen und aus dem Code.
 *
 * Sie sagt, was das Kit versteht, und nicht, was ein Gerät kann: welche Fassung
 * dort läuft, sagt der Kontrakt dieses einen Geräts. Das ist derselbe
 * Unterschied, der `KIT_CONTRACT_VERSIONS` ehrlich hält.
 */
export function compatibility() {
  return [
    `Versteht Kontraktfassungen bis ${KIT_CONTRACT_VERSION}.`,
    "Ein Gerät mit einer kleineren Fassung wird bedient, bei einer größeren sagt das Kit, was ihm fehlt.",
    "Welche Fassung ein Gerät führt, sagt sein Kontrakt: node .ara/tools/app.mjs --device <gerät> --contract",
  ];
}

/**
 * Stand, Neues und Verträglichkeit in einem Block, so wie `/init` es vorliest.
 *
 * `since` ist der Stand, von dem jemand kommt. Ohne ihn wird nur der oberste
 * Eintrag gezeigt: das ist der Fall „was ist gerade drin", nicht „was kam dazu".
 */
export function standBlock({ version, changelog, since = null }) {
  const entries = parseChangelog(changelog);
  const relevant = since ? entriesSince(entries, since) : entries.slice(0, 1);
  const lines = [];
  const top = entries[0];
  lines.push(
    `Stand: ${version || "ohne Nummer"}${top && top.version === version ? ` vom ${top.date}` : ""}`
  );
  if (!relevant.length) {
    lines.push(since ? `Neues seit ${since}: nichts.` : "Neues: die Änderungsliste nennt nichts.");
  } else {
    lines.push(since ? `Neu seit ${since}:` : "Neu in diesem Stand:");
    for (const entry of relevant) {
      for (const point of entry.lines) lines.push(`  ${point}`);
    }
  }
  lines.push(`Verträglichkeit: ${compatibility()[0]} ${compatibility()[1]}`);
  return lines;
}
