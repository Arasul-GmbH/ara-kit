/**
 * Das Blatt zu einem Vorgang: was eingereicht wurde, als Bild.
 *
 * Eine Freigabe aus einer Erkennung zeigt links das Original (Kontrakt 10,
 * `original` am Schritt `lesen`). Die Vorlage hat kein hochgeladenes
 * Dokument, also zeichnet sie das Blatt aus dem, was der Vorgang hat: Titel,
 * Einreicher und Text. Eine App mit echten Dokumenten ersetzt diese Datei
 * und die Zeile in `server.mjs` durch die Bytes ihres Dokuments (Bild oder
 * PDF) und lässt den Pfad im Flow auf diesen Weg zeigen.
 *
 * Rein: ein Vorgang hinein, ein Text im SVG-Format heraus. Jeder Wert wird
 * für XML entschärft, denn der Text kommt von Menschen.
 */

const BREITE = 420;
const ZEICHEN_JE_ZEILE = 44;
const ZEILEN = 22;

/** Einen Text für XML entschärfen. */
function xml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Einen Text auf Zeilen umbrechen, an Wortgrenzen, ein zu langes Wort wird zerteilt. */
export function umbrechen(text, breite = ZEICHEN_JE_ZEILE) {
  const zeilen = [];
  for (const absatz of String(text).split(/\r?\n/)) {
    let zeile = "";
    for (let wort of absatz.split(/\s+/).filter(Boolean)) {
      while (wort.length > breite) {
        if (zeile) {
          zeilen.push(zeile);
          zeile = "";
        }
        zeilen.push(wort.slice(0, breite));
        wort = wort.slice(breite);
      }
      if (zeile && zeile.length + 1 + wort.length > breite) {
        zeilen.push(zeile);
        zeile = wort;
      } else {
        zeile = zeile ? `${zeile} ${wort}` : wort;
      }
    }
    zeilen.push(zeile);
  }
  return zeilen;
}

export function blatt(vorgang) {
  const text = vorgang.text && vorgang.text !== "ohne Angabe" ? vorgang.text : "";
  const zeilen = umbrechen(text);
  const sichtbar = zeilen.slice(0, ZEILEN);
  const hoehe = 190 + Math.max(sichtbar.length, 1) * 22 + (zeilen.length > ZEILEN ? 22 : 0);
  const kopf = umbrechen(vorgang.titel, 30).slice(0, 2);
  const schrift = 'font-family="sans-serif"';
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${BREITE}" height="${hoehe}" viewBox="0 0 ${BREITE} ${hoehe}">`,
    `  <rect width="${BREITE}" height="${hoehe}" fill="#fbfaf7" stroke="#c9c4b8"/>`,
    ...kopf.map((zeile, i) => `  <text x="32" y="${58 + i * 28}" ${schrift} font-size="22" font-weight="700" fill="#222">${xml(zeile)}</text>`),
    `  <text x="32" y="${58 + kopf.length * 28 + 4}" ${schrift} font-size="13" fill="#555">Vorgang ${xml(vorgang.id)}, eingereicht von ${xml(vorgang.von)}</text>`,
    `  <line x1="32" y1="${58 + kopf.length * 28 + 20}" x2="${BREITE - 32}" y2="${58 + kopf.length * 28 + 20}" stroke="#c9c4b8"/>`,
    ...sichtbar.map((zeile, i) => `  <text x="32" y="${58 + kopf.length * 28 + 52 + i * 22}" ${schrift} font-size="15" fill="#222" xml:space="preserve">${xml(zeile)}</text>`),
    ...(zeilen.length > ZEILEN ? [`  <text x="32" y="${hoehe - 24}" ${schrift} font-size="13" fill="#555">… der Text geht weiter.</text>`] : []),
    `</svg>`,
    ``,
  ].join("\n");
}
