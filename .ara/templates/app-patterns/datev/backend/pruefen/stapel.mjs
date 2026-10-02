/**
 * Muster Buchungsstapel: das Prüfskript. Liest die Bytes einer Datei und sagt,
 * ob sie dem Format der Quelle entspricht. Es liest nichts außer der Datei, es
 * ändert nichts, und es kennt den Schreiber nicht: die Datei muss bestehen,
 * gleich wer sie gemacht hat.
 *
 * Als Skript, an jeder Datei:
 *
 *   node pruefen/stapel.mjs EXTF_Buchungsstapel_55003_20261002120000.csv
 *
 * Ausgang 0: keine Abweichung. 1: mindestens ein Fehler, jeder mit Zeile und
 * Feld. 2: die Datei ließ sich nicht lesen. Als Baustein:
 *
 *   import { pruefen } from "./pruefen/stapel.mjs";
 *   const { ok, fehler, hinweise, buchungen } = pruefen(bytes);
 *
 * **Was geprüft wird**: Zeichensatz (Windows-1252, kein BOM, nicht UTF-8 ohne
 * BOM), Zeilenende CR LF, die 31 Felder der Kopfzeile gegen die Ausdrücke der
 * Quelle und die Formatversion 13, die Spaltenzeile Wort für Wort, jede Zeile
 * mit 125 Feldern und jedes Feld gegen den Ausdruck der Quelle, die Pflichtfelder
 * einer Buchung, ein Belegdatum, das es gibt und im Zeitraum des Kopfes liegt,
 * Konten, die zur Sachkontenlänge passen, und die Festschreibung.
 *
 * **Was nicht geprüft wird**, weil nur DATEV es sagen kann: ob das Konto im
 * Bestand der Kanzlei angelegt ist, ob der BU-Schlüssel zum Konto passt, ob die
 * Berater- und Mandantennummer stimmen. Das zeigt der Einlesetest beim
 * Steuerberater, und seine Antwort ist der Beweis, nicht dieses Skript.
 *
 * **Abweichungen von der Quelle, mit Grund** (sie erscheinen unter `hinweise`
 * und nicht als Fehler):
 *   - BU-Schlüssel: der Ausdruck der Quelle verlangt vier Ziffern in
 *     Anführungszeichen, ihre eigene Musterdatei lässt das Feld leer. Hier gilt
 *     leer oder eine bis vier Ziffern in Anführungszeichen; was DATEV beim
 *     Einlesen davon annimmt, zeigt der Einlesetest.
 *   - Kopf "Exportiert von": der Ausdruck der Quelle lässt kein Leerzeichen zu,
 *     ihr Beispiel hat eines. Hier sind Leerzeichen, Punkt und Bindestrich erlaubt.
 */

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { KOPF, SPALTEN, AUSDRUECKE, QUELLE } from "../kern/extf-format.mjs";

/** Eine Zeile in rohe Felder, mit den Anführungszeichen. Null, wenn sie nicht schließt. */
function felder(zeile) {
  const aus = [];
  let aktuell = "";
  let drin = false;
  for (let i = 0; i < zeile.length; i++) {
    const c = zeile[i];
    if (c === '"') {
      if (drin && zeile[i + 1] === '"') {
        aktuell += '""';
        i++;
        continue;
      }
      drin = !drin;
      aktuell += c;
    } else if (c === ";" && !drin) {
      aus.push(aktuell);
      aktuell = "";
    } else aktuell += c;
  }
  if (drin) return null;
  aus.push(aktuell);
  return aus;
}

const text = (roh) => (roh.startsWith('"') && roh.endsWith('"') && roh.length >= 2 ? roh.slice(1, -1).replace(/""/g, '"') : roh);

function datum(s) {
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? d : null;
}

const WINDOWS_1252_OBEN = "€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008dŽ\u008f\u0090‘’“”•\u2013\u2014˜™š›œ\u009džŸ";

function decodieren(bytes) {
  let s = "";
  for (const b of bytes) s += b < 0x80 || b >= 0xa0 ? String.fromCharCode(b) : WINDOWS_1252_OBEN[b - 0x80];
  return s;
}

/**
 * @param {Buffer|Uint8Array} bytes
 * @returns {{ ok: boolean, fehler: string[], hinweise: string[], buchungen: number, kopf: string[]|null }}
 */
export function pruefen(bytes) {
  const fehler = [];
  const hinweise = [];
  const roh = Buffer.from(bytes);

  if (roh.length === 0) return { ok: false, fehler: ["Die Datei ist leer."], hinweise, buchungen: 0, kopf: null };
  if (roh[0] === 0xef && roh[1] === 0xbb && roh[2] === 0xbf) fehler.push("Zeichensatz: die Datei beginnt mit einem UTF-8-BOM, das Muster schreibt Windows-1252.");
  if (roh[0] === 0xff && roh[1] === 0xfe || roh[0] === 0xfe && roh[1] === 0xff) fehler.push("Zeichensatz: die Datei ist UTF-16, das Muster schreibt Windows-1252.");
  // UTF-8 ohne BOM erkennt man daran, dass es streng als UTF-8 lesbar ist und über ASCII hinausgeht.
  if (roh.some((b) => b > 0x7f)) {
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(roh);
      fehler.push("Zeichensatz: die Datei ist UTF-8 ohne BOM, DATEV liest das als Windows-1252 und macht aus Umlauten Zeichenmüll.");
    } catch {
      /* kein UTF-8: dann ist es Windows-1252, wie verlangt */
    }
  }
  const text_ = decodieren(roh);

  if (/(?<!\r)\n/.test(text_)) fehler.push("Zeilenende: ein LF ohne CR, verlangt ist CR LF am Ende jeder Zeile.");
  if (!text_.endsWith("\r\n")) fehler.push("Zeilenende: die letzte Zeile endet nicht mit CR LF.");
  const zeilen = text_.split("\r\n");
  if (zeilen[zeilen.length - 1] === "") zeilen.pop();
  if (zeilen.length < 2) {
    fehler.push("Es fehlen Kopfzeile oder Spaltenzeile.");
    return { ok: false, fehler, hinweise, buchungen: 0, kopf: null };
  }

  // Kopfzeile
  const kopf = felder(zeilen[0]);
  if (!kopf) {
    fehler.push("Zeile 1: ein Anführungszeichen schließt nicht.");
    return { ok: false, fehler, hinweise, buchungen: 0, kopf: null };
  }
  if (kopf.length !== KOPF.length) fehler.push(`Zeile 1: Kopfzeile hat ${kopf.length} Felder, verlangt sind ${KOPF.length}.`);
  else {
    KOPF.forEach(([name, ausdruck], i) => {
      const wert = kopf[i];
      let ok;
      if (ausdruck === "^[]$") ok = wert === "";
      else if (i === 8) ok = /^"[\w .-]{0,25}"$/.test(wert);
      else ok = new RegExp(ausdruck).test(wert);
      if (!ok) fehler.push(`Zeile 1, Feld ${i + 1} (${name}): "${wert}" passt nicht zum Ausdruck der Quelle ${ausdruck}.`);
    });
    if (Number(kopf[1]) !== QUELLE.versionsnummer) fehler.push(`Zeile 1, Feld 2: Versionsnummer ${kopf[1]}, die Quelle (${QUELLE.abgerufen}) nennt ${QUELLE.versionsnummer}.`);
    if (Number(kopf[2]) !== QUELLE.formatkategorie) fehler.push(`Zeile 1, Feld 3: Formatkategorie ${kopf[2]}, ein Buchungsstapel hat ${QUELLE.formatkategorie}.`);
    if (Number(kopf[4]) !== QUELLE.formatversion) fehler.push(`Zeile 1, Feld 5: Formatversion ${kopf[4]}, die Quelle (${QUELLE.abgerufen}) nennt für den Buchungsstapel ${QUELLE.formatversion}.`);
    if (kopf[26] !== '"03"') hinweise.push(`Zeile 1, Feld 27: Sachkontenrahmen ${kopf[26]}, das Muster ist für SKR03 ("03").`);
  }

  // Spaltenzeile
  const spalten = zeilen[1].split(";");
  if (spalten.length !== SPALTEN.length) fehler.push(`Zeile 2: ${spalten.length} Spalten, verlangt sind ${SPALTEN.length}.`);
  else {
    const abweichend = spalten.map((s, i) => [i + 1, s, SPALTEN[i]]).filter(([, a, b]) => a !== b);
    for (const [nr, ist, soll] of abweichend.slice(0, 3)) fehler.push(`Zeile 2, Spalte ${nr}: "${ist}" statt "${soll}".`);
    if (abweichend.length > 3) fehler.push(`Zeile 2: weitere ${abweichend.length - 3} Spalten weichen ab.`);
  }

  // Buchungen
  const wjBeginn = kopf.length === KOPF.length ? datum(kopf[12]) : null;
  const von = kopf.length === KOPF.length ? kopf[14] : "";
  const bis = kopf.length === KOPF.length ? kopf[15] : "";
  const laenge = kopf.length === KOPF.length ? Number(kopf[13]) : 4;
  if (von && bis && von > bis) fehler.push(`Zeile 1: Datum von ${von} liegt nach Datum bis ${bis}.`);
  if (wjBeginn && von && datum(von) && datum(von) < wjBeginn) fehler.push(`Zeile 1: Datum von ${von} liegt vor dem Wirtschaftsjahresbeginn ${kopf[12]}.`);

  let buchungen = 0;
  for (let n = 2; n < zeilen.length; n++) {
    const nr = n + 1;
    const f = felder(zeilen[n]);
    if (!f) {
      fehler.push(`Zeile ${nr}: ein Anführungszeichen schließt nicht.`);
      continue;
    }
    if (f.length !== SPALTEN.length) {
      fehler.push(`Zeile ${nr}: ${f.length} Felder, verlangt sind ${SPALTEN.length}.`);
      continue;
    }
    buchungen++;
    f.forEach((wert, i) => {
      if (wert === "" || wert === '""') return;
      const ausdruck = AUSDRUECKE[i];
      if (!ausdruck) return;
      let ok;
      if (i === 8) {
        ok = /^"\d{1,4}"$/.test(wert);
        if (ok && !/^"\d{4}"$/.test(wert)) hinweise.push(`Zeile ${nr}, Feld 9 (BU-Schlüssel): ${wert} hat keine vier Ziffern wie der Ausdruck der Quelle, Einlesetest beim Steuerberater abwarten.`);
      } else ok = new RegExp(ausdruck).test(wert);
      if (!ok) fehler.push(`Zeile ${nr}, Feld ${i + 1} (${SPALTEN[i]}): "${wert}" passt nicht zum Ausdruck der Quelle ${ausdruck}.`);
    });

    if (f[0] === "") fehler.push(`Zeile ${nr}, Feld 1 (Umsatz): fehlt.`);
    if (f[1] === "") fehler.push(`Zeile ${nr}, Feld 2 (Soll/Haben): fehlt, die Quelle setzt S, das Muster schreibt es immer.`);
    if (f[1] !== "" && !/^"[SH]"$/.test(f[1])) fehler.push(`Zeile ${nr}, Feld 2 (Soll/Haben): ${f[1]}.`);
    for (const i of [6, 7]) {
      if (!/^\d+$/.test(f[i])) fehler.push(`Zeile ${nr}, Feld ${i + 1} (${SPALTEN[i]}): "${f[i]}" ist keine Kontonummer.`);
      else if (f[i].length > laenge + 1) fehler.push(`Zeile ${nr}, Feld ${i + 1} (${SPALTEN[i]}): ${f[i]} hat mehr Stellen als Sachkontenlänge ${laenge} plus eine Stelle für Personenkonten.`);
    }
    if (f[6] !== "" && f[6] === f[7]) fehler.push(`Zeile ${nr}: Konto und Gegenkonto sind beide ${f[6]}.`);
    if (f[113] !== "0") fehler.push(`Zeile ${nr}, Feld 114 (Festschreibung): "${f[113]}", das Muster schreibt 0, die Kanzlei schreibt in DATEV selbst fest.`);

    // Belegdatum: TTMM, das Jahr kommt aus dem Wirtschaftsjahr des Kopfes
    const tm = /^(\d{2})(\d{2})$/.exec(f[9]);
    if (!tm) fehler.push(`Zeile ${nr}, Feld 10 (Belegdatum): "${f[9]}" ist nicht TTMM.`);
    else if (wjBeginn && datum(von) && datum(bis)) {
      const kandidaten = [wjBeginn.getUTCFullYear(), wjBeginn.getUTCFullYear() + 1]
        .map((j) => datum(`${j}${tm[2]}${tm[1]}`))
        .filter((d) => d && d >= wjBeginn && d < new Date(Date.UTC(wjBeginn.getUTCFullYear() + 1, wjBeginn.getUTCMonth(), wjBeginn.getUTCDate())));
      if (!kandidaten.length) fehler.push(`Zeile ${nr}, Feld 10 (Belegdatum): ${tm[1]}.${tm[2]}. gibt es im Wirtschaftsjahr ab ${kopf[12]} nicht.`);
      else {
        const s = kandidaten[0].toISOString().slice(0, 10).replace(/-/g, "");
        if (s < von || s > bis) fehler.push(`Zeile ${nr}, Feld 10 (Belegdatum): ${tm[1]}.${tm[2]}. liegt außerhalb von ${von} bis ${bis} im Kopf.`);
      }
    }
    if (f[13] !== "" && text(f[13]) === "") hinweise.push(`Zeile ${nr}: der Buchungstext ist leer.`);
  }
  if (buchungen === 0) hinweise.push("Die Datei enthält keine Buchung.");

  return { ok: fehler.length === 0, fehler, hinweise: [...new Set(hinweise)], buchungen, kopf: kopf.length === KOPF.length ? kopf : null };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const pfad = process.argv[2];
  if (!pfad) {
    console.error("Aufruf: node pruefen/stapel.mjs <Datei>");
    process.exit(2);
  }
  let bytes;
  try {
    bytes = readFileSync(pfad);
  } catch (e) {
    console.error(`Die Datei ließ sich nicht lesen: ${e.message}`);
    process.exit(2);
  }
  const r = pruefen(bytes);
  for (const h of r.hinweise) console.log(`Hinweis: ${h}`);
  for (const f of r.fehler) console.log(`FEHLER: ${f}`);
  console.log(
    r.ok
      ? `OK: ${r.buchungen} Buchungen, keine Abweichung vom Format (Quelle abgerufen ${QUELLE.abgerufen}, Formatversion ${QUELLE.formatversion}).`
      : `${r.fehler.length} Fehler in ${r.buchungen} Buchungen.`
  );
  process.exit(r.ok ? 0 : 1);
}
