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
 * **Über einen fremden Stand sagt der eigene Code nichts.** Wer nachsieht, was
 * ein Update brächte, redet über ein Kit, das noch nicht läuft:
 * `KIT_CONTRACT_VERSIONS` gehört dann dem falschen von beiden, und die Antwort
 * wäre die eigene Grenze im Gewand der fremden. Dafür steht die Zahl je Stand in
 * der Änderungsliste. `contractOf` liest sie dort, `compatibility` nimmt sie
 * entgegen, und ohne Angabe bleibt es beim Code des laufenden Kits.
 *
 * Reine Funktionen: kein Netz, keine Dateien außer der, die hereingereicht wird.
 */

import { KIT_CONTRACT_VERSION } from "./contract.mjs";
import { t } from "./i18n.mjs";

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
 * Zeile `Contract: up to <zahl>` (deutsch: `Kontrakt: bis <zahl>`) und danach die
 * Punkte als Aufzählung. Alles andere im Text wird überlesen: die Datei hat oben
 * eine Erklärung für Menschen, und die soll nicht als Änderung durchgehen.
 *
 * Beide Fassungen der Änderungsliste tragen dieselben Nummern und dieselben
 * Punkte, nur in ihrer Sprache. Gelesen wird die, die zur Sprache passt.
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
    const contract = line.match(/^(?:Contract:\s*up\s+to|Kontrakt:\s*bis)\s+(\d+)\s*$/);
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
 * Die Kontraktfassung, die ein Stand für sich nennt.
 *
 * Für den laufenden Stand ist der Code die Quelle. Für einen geholten gibt es
 * ihn nicht: er liegt in einem Ordner, der noch nicht eingespielt ist, und ihn
 * ausgerechnet beim Nachsehen laufen zu lassen wäre das Gegenteil von nachsehen.
 * Was bleibt, ist die Zeile, die dieser Stand selbst in seine Änderungsliste
 * geschrieben hat, im Eintrag zu seiner Nummer. Sein eigener Selbsttest hat sie
 * dort gegen seinen Code gehalten, bevor er ausgeliefert wurde.
 *
 * Nennt er sie nicht, ist die Antwort `null` und nicht die eigene Zahl: eine
 * Lücke ist zu sagen, nicht zu füllen.
 */
export function contractOf(changelog, version) {
  const entry = parseChangelog(changelog).find((item) => item.version === version);
  return entry && entry.contract !== null ? entry.contract : null;
}

/**
 * Die Verträglichkeit zum Gerät, in Sätzen.
 *
 * Sie sagt, was ein Kit versteht, und nicht, was ein Gerät kann: welche Fassung
 * dort läuft, sagt der Kontrakt dieses einen Geräts. Das ist derselbe
 * Unterschied, der `KIT_CONTRACT_VERSIONS` ehrlich hält.
 *
 * `contract` ist die Zahl, über die geredet wird. Ohne Angabe ist es die des
 * laufenden Kits, aus dem Code; über einen geholten Stand reicht der Aufrufer
 * dessen Zahl herein. `null` heißt, dieser Stand nennt sie nicht.
 */
export function compatibility(contract = KIT_CONTRACT_VERSION) {
  return [
    contract === null
      ? t(
          "Up to which contract version it understands, its change list does not say.",
          "Bis zu welcher Kontraktfassung es versteht, sagt seine Änderungsliste nicht."
        )
      : t(`Understands contract versions up to ${contract}.`, `Versteht Kontraktfassungen bis ${contract}.`),
    t(
      "A device with a lower version is served, with a higher one the kit says what it is missing.",
      "Ein Gerät mit einer kleineren Fassung wird bedient, bei einer größeren sagt das Kit, was ihm fehlt."
    ),
    t(
      "Which version a device carries its contract says: node .ara/tools/app.mjs --device <device> --contract",
      "Welche Fassung ein Gerät führt, sagt sein Kontrakt: node .ara/tools/app.mjs --device <gerät> --contract"
    ),
  ];
}

/**
 * Stand, Neues und Verträglichkeit in einem Block, so wie `/init` es vorliest.
 *
 * `since` ist der Stand, von dem jemand kommt. Ohne ihn wird nur der oberste
 * Eintrag gezeigt: das ist der Fall „was ist gerade drin", nicht „was kam dazu".
 *
 * `contract` gehört zu dem Stand, über den der Block redet. Ohne Angabe ist das
 * der laufende, und dann ist der eigene Code die Quelle. Wer einen geholten
 * Stand vorliest, reicht `contractOf(changelog, version)` herein.
 */
export function standBlock({ version, changelog, since = null, contract = KIT_CONTRACT_VERSION }) {
  const entries = parseChangelog(changelog);
  const relevant = since ? entriesSince(entries, since) : entries.slice(0, 1);
  const lines = [];
  const top = entries[0];
  lines.push(
    t(
      `Version: ${version || "without a number"}${top && top.version === version ? ` of ${top.date}` : ""}`,
      `Stand: ${version || "ohne Nummer"}${top && top.version === version ? ` vom ${top.date}` : ""}`
    )
  );
  if (!relevant.length) {
    lines.push(
      since
        ? t(`New since ${since}: nothing.`, `Neues seit ${since}: nichts.`)
        : t("New: the change list names nothing.", "Neues: die Änderungsliste nennt nichts.")
    );
  } else {
    lines.push(
      since ? t(`New since ${since}:`, `Neu seit ${since}:`) : t("New in this version:", "Neu in diesem Stand:")
    );
    for (const entry of relevant) {
      for (const point of entry.lines) lines.push(`  ${point}`);
    }
  }
  const sentences = compatibility(contract);
  lines.push(
    t(`Compatibility: ${sentences[0]} ${sentences[1]}`, `Verträglichkeit: ${sentences[0]} ${sentences[1]}`)
  );
  return lines;
}
