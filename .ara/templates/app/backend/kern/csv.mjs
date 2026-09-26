/**
 * Eine CSV, die ein deutsches Excel richtig öffnet und die keine Formel
 * ausführt. Rein wie der Kern: kein HTTP, kein SQL, kein `process.env`.
 *
 * **Was ein Export braucht, damit er im Büro ankommt:**
 *
 *   - ein BOM vorn, sonst liest Excel UTF-8 als Latin-1, und aus Müller wird
 *     MÃ¼ller
 *   - Semikolon als Trenner, denn das Komma ist das Dezimalzeichen
 *   - Zahlen mit Dezimalkomma und ohne Tausenderpunkt, `12,5` und nicht
 *     `12.5`: sonst wird aus einem Betrag ein Datum
 *   - Zeilenende CRLF, Anführungszeichen um jede Zelle mit Trenner,
 *     Anführungszeichen oder Zeilenumbruch, ein Anführungszeichen darin
 *     verdoppelt
 *
 * **Formelschutz.** Eine Zelle, die mit `=`, `+`, `-`, `@`, Tab oder CR
 * beginnt, liest eine Tabellenkalkulation als Formel. Ein Mandant, der als
 * Namen `=HYPERLINK(...)` einträgt, führte sie beim Steuerberater aus. Jeder
 * Text, der so beginnt, bekommt deshalb ein Hochkomma davor: in der Zelle
 * steht dann der Text, keine Formel. Eine Zahl aus dieser App bekommt keines,
 * `-12,5` ist ein Betrag; eine Zahl, die als Text kommt, schon.
 *
 * Ein Format mit eigener Vorschrift, der Buchungsstapel von DATEV etwa, hat
 * eigene Regeln für Kopfzeile, Felder und Zeichensatz. Die stehen in seiner
 * Quelle, nicht hier: `.ara/knowledge/app-professional.md`.
 *
 *   import { csv, csvKoepfe } from "./kern/csv.mjs";
 *
 *   const text = csv(vorgaenge, [
 *     { titel: "Nummer", wert: (v) => v.id },
 *     { titel: "Titel", wert: (v) => v.titel },
 *     { titel: "Betrag", wert: (v) => v.betrag, stellen: 2 },
 *   ]);
 *   antwort.writeHead(200, csvKoepfe("vorgaenge.csv"));
 *   antwort.end(text);
 */

export const TRENNER = ";";
export const BOM = "﻿";

/** Womit eine Zelle nicht beginnen darf, wenn sie Text bleiben soll. */
const FORMEL = /^[=+\-@\t\r]/;

/** Eine Zahl mit Dezimalkomma, ohne Tausenderpunkt, auf Wunsch mit festen Stellen. */
export function zahl(wert, stellen = null) {
  if (!Number.isFinite(wert)) return "";
  return wert.toLocaleString("de-DE", {
    useGrouping: false,
    minimumFractionDigits: stellen ?? 0,
    maximumFractionDigits: stellen ?? 20,
  });
}

/** Eine Zelle: Zahl mit Komma, Text mit Formelschutz, gequotet, wo es nötig ist. */
export function zelle(wert, stellen = null) {
  if (wert === null || wert === undefined) return "";
  let text;
  if (typeof wert === "number") text = zahl(wert, stellen);
  else {
    text = String(wert);
    if (FORMEL.test(text)) text = `'${text}`;
  }
  return /[";\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * Die ganze Datei als Text: BOM, die Titel als erste Zeile, dann eine Zeile je
 * Eintrag. `spalten` ist eine Liste von `{ titel, wert, stellen }`; `wert`
 * bekommt den Eintrag und gibt, was in der Zelle stehen soll.
 */
export function csv(zeilen, spalten) {
  const kopf = spalten.map((spalte) => zelle(spalte.titel)).join(TRENNER);
  const rumpf = zeilen.map((eintrag) => spalten.map((spalte) => zelle(spalte.wert(eintrag), spalte.stellen)).join(TRENNER));
  return BOM + [kopf, ...rumpf].join("\r\n") + "\r\n";
}

/** Die Kopfzeilen einer Antwort mit einer CSV: als Datei zum Speichern, nie zwischengespeichert. */
export function csvKoepfe(dateiname) {
  return {
    "content-type": "text/csv; charset=utf-8",
    "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(dateiname)}`,
    "cache-control": "private, no-store",
  };
}
