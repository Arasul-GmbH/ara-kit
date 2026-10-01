/**
 * Muster Buchungsstapel: der Schreiber. Aus freigegebenen Buchungen wird die
 * Datei, die die Kanzlei in DATEV einliest. Rein wie der Kern: kein HTTP, kein
 * SQL, kein `process.env`.
 *
 * Das Format und seine Quelle stehen in `extf-format.mjs`: Versionsnummer 700,
 * Formatversion 13, Windows-1252, Semikolon, Dezimalkomma, CR LF, Text in
 * Anführungszeichen, Belegdatum als TTMM mit dem Jahr aus dem Kopf. Die
 * Spaltenzeile steht ohne Anführungszeichen, wie in der Musterdatei der Quelle.
 *
 *   import { buchungsstapel } from "./kern/datev.mjs";
 *
 *   const { datei, bytes, ids, abgelehnt } = buchungsstapel(
 *     { mandant: { beraternummer: 29098, nummer: 55003, wjBeginn: "2026-01-01" }, buchungen },
 *     { exportiertVon: "Kanzlei" }
 *   );
 *
 * Eine Buchung: `{ id, betrag, soll_haben, konto, gegenkonto, bu_schluessel,
 * belegdatum, belegnummer, buchungstext }`, `betrag` positiv, `belegdatum` als
 * JJJJ-MM-TT. Der Vorschlag aus `skr03.mjs` hat genau diese Form.
 *
 * **Eine Buchung, die nicht passt, kommt nicht still in die Datei und nicht
 * still heraus.** Sie steht in `abgelehnt`, mit Nummer und Grund, und die Seite
 * zeigt sie an. Das gilt für einen Betrag ohne Wert, ein Datum, das es nicht
 * gibt, und ein Datum außerhalb des Wirtschaftsjahres: das Jahr steht im Kopf
 * und nicht in der Zeile, ein Beleg aus dem Vorjahr bekäme sonst das falsche.
 *
 * **Festschreibung: nein.** Die Kanzlei schreibt in DATEV selbst fest. Die
 * Quelle sagt: ohne Angabe wird der Stapel nach dem Einlesen festgeschrieben,
 * deshalb steht eine 0 in Kopf und Zeile.
 *
 * **Zeitstempel in UTC**, denn der Container kennt keine Ortszeit. Die Datei
 * trägt ihn in "Erzeugt am" und im Dateinamen; ein Datum der Buchungen ist
 * davon nicht berührt, das kommt unverändert aus der Buchung.
 */

import { SPALTEN, QUELLE } from "./extf-format.mjs";

export { SPALTEN };

/** Windows-1252 oberhalb von 0x7F, soweit nicht Latin-1: Zeichen und Byte. */
const CP1252 = new Map(
  Object.entries({
    "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85, "†": 0x86, "‡": 0x87, "ˆ": 0x88, "‰": 0x89, "Š": 0x8a,
    "‹": 0x8b, "Œ": 0x8c, "Ž": 0x8e, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "\u2013": 0x96, "\u2014": 0x97,
    "˜": 0x98, "™": 0x99, "š": 0x9a, "›": 0x9b, "œ": 0x9c, "ž": 0x9e, "Ÿ": 0x9f,
  })
);

/** Nach Windows-1252. Was der Zeichensatz nicht hat, wird ein Fragezeichen und nicht verfälscht. */
export function cp1252(text) {
  const bytes = [];
  for (const zeichen of text) {
    const code = zeichen.codePointAt(0);
    if (code < 0x80 || (code >= 0xa0 && code <= 0xff)) bytes.push(code);
    else bytes.push(CP1252.get(zeichen) ?? 0x3f);
  }
  return Buffer.from(bytes);
}

/** Ein Textfeld: ohne Steuerzeichen, Anführungszeichen verdoppelt, in Anführungszeichen. */
function text(wert, laenge) {
  let s = String(wert ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").trim();
  // Eine Zelle, die mit = + - @ beginnt, liest Excel als Formel. Ein Leerzeichen davor genügt.
  if (/^[=+\-@]/.test(s)) s = ` ${s}`;
  if (laenge) s = s.slice(0, laenge);
  return `"${s.replace(/"/g, '""')}"`;
}

function geld(betrag) {
  return Number(betrag).toFixed(2).replace(".", ",");
}

function tag(d) {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

/** JJJJ-MM-TT: gibt es den Tag? Ein 31.02. gibt es nicht, auch wenn die Form stimmt. */
export function istDatum(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s ?? ""));
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

function jahrPlus(datum) {
  const d = new Date(`${datum}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function pruefeMandant(m) {
  const berater = String(m?.beraternummer ?? "");
  const nummer = String(m?.nummer ?? "");
  if (!/^\d{4,7}$/.test(berater) || Number(berater) < 1001) throw new Error(`Beraternummer ${berater || "fehlt"}: erlaubt sind 1001 bis 9999999.`);
  if (!/^\d{1,5}$/.test(nummer) || Number(nummer) < 1) throw new Error(`Mandantennummer ${nummer || "fehlt"}: erlaubt sind 1 bis 99999.`);
  if (m.wjBeginn != null && !istDatum(m.wjBeginn)) throw new Error(`Wirtschaftsjahresbeginn ${m.wjBeginn} ist kein Datum (JJJJ-MM-TT).`);
  return { berater, nummer };
}

/**
 * @param {{ mandant: { beraternummer, nummer, wjBeginn?, sachkontenlaenge? }, buchungen: object[] }} eingabe
 * @param {{ exportiertVon?: string, diktatkuerzel?: string, bezeichnung?: string, jetzt?: Date }} [optionen]
 * @returns {{ datei: string, bytes: Buffer, ids: any[], abgelehnt: { id: any, grund: string }[] }}
 */
export function buchungsstapel({ mandant, buchungen }, { exportiertVon = "", diktatkuerzel = "", bezeichnung, jetzt = new Date() } = {}) {
  const { berater, nummer } = pruefeMandant(mandant);
  const laenge = mandant.sachkontenlaenge ?? 4;
  if (!Number.isInteger(laenge) || laenge < 4 || laenge > 8) throw new Error(`Sachkontenlänge ${laenge}: erlaubt sind 4 bis 8.`);

  const roh = (buchungen || []).filter((b) => b && typeof b === "object");
  // Ohne Angabe beginnt das Wirtschaftsjahr am 1. Januar des Jahres der ersten Buchung.
  const erstes = roh.map((b) => b.belegdatum).filter(istDatum).sort()[0];
  const wjBeginn = mandant.wjBeginn || `${(erstes || tag(jetzt).replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3")).slice(0, 4)}-01-01`;
  const wjEnde = jahrPlus(wjBeginn);

  const gut = [];
  const abgelehnt = [];
  for (const b of roh) {
    const grund = (() => {
      if (!(Number(b.betrag) > 0) || Math.round(Number(b.betrag) * 100) < 1) return "Kein Betrag über 0,00.";
      if (!istDatum(b.belegdatum)) return `Belegdatum ${b.belegdatum || "fehlt"} ist kein Datum.`;
      if (b.belegdatum < wjBeginn || b.belegdatum > wjEnde) return `Belegdatum ${b.belegdatum} liegt außerhalb des Wirtschaftsjahres ${wjBeginn} bis ${wjEnde}.`;
      for (const [name, wert] of [["Konto", b.konto], ["Gegenkonto", b.gegenkonto]]) {
        const s = String(wert ?? "");
        if (!/^\d+$/.test(s) || Number(s) === 0 || s.length > laenge + 1) return `${name} ${s || "fehlt"} passt nicht zur Sachkontenlänge ${laenge}.`;
      }
      if (b.bu_schluessel && !/^\d{1,4}$/.test(String(b.bu_schluessel))) return `BU-Schlüssel ${b.bu_schluessel} ist keine Zahl bis vier Stellen.`;
      if (b.soll_haben && !["S", "H"].includes(b.soll_haben)) return `Soll/Haben ${b.soll_haben}: erlaubt sind S und H.`;
      return null;
    })();
    if (grund) abgelehnt.push({ id: b.id, grund });
    else gut.push(b);
  }

  const daten = gut.map((b) => b.belegdatum).sort();
  const vom = (daten[0] || wjBeginn).replace(/-/g, "");
  const bis = (daten[daten.length - 1] || wjBeginn).replace(/-/g, "");
  const erzeugt = jetzt.toISOString().replace(/[-:TZ.]/g, "").slice(0, 17);

  const kopf = [
    '"EXTF"', QUELLE.versionsnummer, QUELLE.formatkategorie, '"Buchungsstapel"', QUELLE.formatversion, erzeugt, "", '"RE"',
    text(String(exportiertVon).replace(/[^\w .-]/g, "_"), 25), '""',
    berater, nummer, wjBeginn.replace(/-/g, ""), laenge, vom, bis,
    text(String(bezeichnung ?? `Buchungsstapel ${nummer}`).replace(/[^\w.\/ -]/g, "_"), 30),
    text(String(diktatkuerzel).toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4)),
    1, 0, 0, '"EUR"', "", '""', "", "", '"03"', "", "", '""', '""',
  ];
  if (kopf.length !== 31) throw new Error(`Kopfzeile hat ${kopf.length} statt 31 Felder.`);

  const zeilen = [kopf.join(";"), SPALTEN.join(";")];
  for (const b of gut) {
    const z = new Array(SPALTEN.length).fill("");
    z[0] = geld(b.betrag);
    z[1] = text(b.soll_haben || "S");
    z[2] = text("EUR");
    z[6] = String(b.konto);
    z[7] = String(b.gegenkonto);
    z[8] = b.bu_schluessel ? text(b.bu_schluessel) : "";
    z[9] = b.belegdatum.slice(8, 10) + b.belegdatum.slice(5, 7);
    z[10] = text(String(b.belegnummer || `B${b.id}`).replace(/[^A-Za-z0-9$&%*+\-/]/g, ""), 36);
    z[13] = text(b.buchungstext, 60);
    z[113] = 0;
    zeilen.push(z.join(";"));
  }

  const datei = `EXTF_Buchungsstapel_${nummer}_${erzeugt.slice(0, 14)}.csv`;
  return { datei, bytes: cp1252(zeilen.join("\r\n") + "\r\n"), ids: gut.map((b) => b.id), abgelehnt };
}
