/**
 * Das Blatt zu einem Vorgang: was eingereicht wurde, als Bild.
 *
 * Eine Freigabe aus einer Erkennung zeigt links das Original (Kontrakt 10,
 * `original` am Schritt `lesen`), und ab Kontrakt 14 liest das Bildmodell
 * dasselbe Original. Es liest PNG, JPEG und PDF, kein SVG. Die Vorlage hat
 * kein hochgeladenes Dokument, also zeichnet sie das Blatt aus dem, was der
 * Vorgang hat (Titel, Einreicher und Text), als PNG mit einer eingebauten
 * Punktschrift, ohne Abhängigkeit. Eine App mit echten Dokumenten ersetzt
 * diese Datei und die Zeile in `server.mjs` durch die Bytes ihres Dokuments
 * (PNG, JPEG oder PDF) und lässt den Pfad im Flow auf diesen Weg zeigen.
 *
 * Rein: ein Vorgang hinein, die Bytes eines PNG heraus.
 */

import { deflateSync } from "node:zlib";

const BREITE = 600;
const RAND = 32;
const ZEICHEN_JE_ZEILE = 44;
const ZEILEN = 22;
const FARBE_PAPIER = 0xfb;
const FARBE_TINTE = 0x22;
const FARBE_GRAU = 0x88;

// Die Punktschrift 5x7, je Zeichen fünf Spalten, das niedrigste Bit oben; ab dem Leerzeichen bis zur Tilde.
const SCHRIFT = [
  "0000000000", "00005F0000", "0007000700", "147F147F14", "242A7F2A12", "2313086462",
  "3649562050", "0005030000", "001C224100", "0041221C00", "2A1C7F1C2A", "08083E0808",
  "0050300000", "0808080808", "0060600000", "2010080402", "3E5149453E", "00427F4000",
  "4261514946", "2141454B31", "1814127F10", "2745454539", "3C4A494930", "0171090503",
  "3649494936", "064949291E", "0036360000", "0056360000", "0814224100", "1414141414",
  "0041221408", "0201510906", "324979413E", "7E1111117E", "7F49494936", "3E41414122",
  "7F4141221C", "7F49494941", "7F09090901", "3E4149497A", "7F0808087F", "00417F4100",
  "2040413F01", "7F08142241", "7F40404040", "7F020C027F", "7F0408107F", "3E4141413E",
  "7F09090906", "3E4151215E", "7F09192946", "4649494931", "01017F0101", "3F4040403F",
  "1F2040201F", "3F4038403F", "6314081463", "0708700807", "6151494543", "007F414100",
  "0204081020", "0041417F00", "0402010204", "4040404040", "0001020400", "2054545478",
  "7F48444438", "3844444420", "384444487F", "3854545418", "087E090102", "18A4A4A47C",
  "7F08040478", "00447D4000", "4080847D00", "7F10284400", "00417F4000", "7C04180478",
  "7C08040478", "3844444438", "FC24242418", "18242418FC", "7C08040408", "4854545420",
  "043F444020", "3C4040207C", "1C2040201C", "3C4030403C", "4428102844", "1CA0A0A07C",
  "4464544C44", "0008364100", "00007F0000", "0041360800", "08082A1C08",
];
const SZ = { ß: "7F01494936" };

/** Die fünf Spalten eines Zeichens, mit dem Grundbuchstaben und zwei Punkten für einen Umlaut. */
function glyphe(zeichen) {
  const umlaut = "äöüÄÖÜ".indexOf(zeichen);
  const grund = umlaut >= 0 ? "aouAOU"[umlaut] : zeichen;
  const rohe = SZ[grund] ?? SCHRIFT[(grund.codePointAt(0) ?? 63) - 32] ?? SCHRIFT[31];
  const spalten = Array.from({ length: 5 }, (_, i) => parseInt(rohe.slice(i * 2, i * 2 + 2), 16));
  return { spalten, punkte: umlaut >= 0 ? (umlaut < 3 ? 2 : 0) : -1 };
}

/** Zeichen, die die Punktschrift nicht hat, auf das Nächstliegende abbilden. */
function lesbar(text) {
  return String(text)
    .replace(/[„“”]/g, '"')
    .replace(/[‚‘’]/g, "'")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/…/g, "...")
    .replace(/\t/g, " ")
    .replace(/€/g, "EUR")
    .replace(/[^\n\r\x20-\x7e äöüÄÖÜß]/g, "?");
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

const TABELLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = TABELLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(art, daten) {
  const kopf = Buffer.alloc(8);
  kopf.writeUInt32BE(daten.length, 0);
  kopf.write(art, 4, "latin1");
  const fuss = Buffer.alloc(4);
  fuss.writeUInt32BE(crc(Buffer.concat([kopf.subarray(4), daten])), 0);
  return Buffer.concat([kopf, daten, fuss]);
}

/** Die Bytes eines PNG in Graustufen aus einem Raster von Bytes. */
function png(breite, hoehe, punkte) {
  const roh = Buffer.alloc((breite + 1) * hoehe);
  for (let y = 0; y < hoehe; y++) punkte.copy(roh, y * (breite + 1) + 1, y * breite, (y + 1) * breite);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(breite, 0);
  ihdr.writeUInt32BE(hoehe, 4);
  ihdr[8] = 8; // Bits je Wert
  ihdr[9] = 0; // Graustufen
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(roh)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Eine Zeile Text ins Raster setzen, `y` ist die obere Kante der Zeile, `grad` die Vergrößerung. */
function zeichnen(raster, text, x, y, grad, farbe) {
  const hoehe = raster.length / BREITE;
  let links = x;
  for (const zeichen of lesbar(text)) {
    const { spalten, punkte } = glyphe(zeichen);
    spalten.forEach((spalte, sx) => {
      for (let sy = 0; sy < 8; sy++) {
        if (spalte & (1 << sy)) füllen(sx, sy + 2);
      }
    });
    if (punkte >= 0) {
      füllen(1, punkte);
      füllen(3, punkte);
    }
    function füllen(sx, sy) {
      for (let dy = 0; dy < grad; dy++) {
        for (let dx = 0; dx < grad; dx++) {
          const px = links + sx * grad + dx;
          const py = y + sy * grad + dy;
          if (px >= 0 && px < BREITE && py >= 0 && py < hoehe) raster[py * BREITE + px] = farbe;
        }
      }
    }
    links += 6 * grad;
  }
}

export function blatt(vorgang) {
  const text = vorgang.text && vorgang.text !== "ohne Angabe" ? vorgang.text : "";
  const zeilen = umbrechen(lesbar(text));
  const sichtbar = zeilen.slice(0, ZEILEN);
  const kopf = umbrechen(lesbar(vorgang.titel), 28).slice(0, 2);
  const abstandText = 22;
  const hoehe = 150 + kopf.length * 30 + Math.max(sichtbar.length, 1) * abstandText + (zeilen.length > ZEILEN ? abstandText : 0);
  const raster = Buffer.alloc(BREITE * hoehe, FARBE_PAPIER);
  // Rahmen
  for (let x = 0; x < BREITE; x++) raster[x] = raster[(hoehe - 1) * BREITE + x] = 0xc9;
  for (let y = 0; y < hoehe; y++) raster[y * BREITE] = raster[y * BREITE + BREITE - 1] = 0xc9;
  let y = RAND;
  for (const zeile of kopf) {
    zeichnen(raster, zeile, RAND, y, 3, FARBE_TINTE);
    y += 30;
  }
  y += 6;
  zeichnen(raster, `Vorgang ${vorgang.id}, eingereicht von ${vorgang.von}`, RAND, y, 1, FARBE_GRAU);
  y += 22;
  for (let x = RAND; x < BREITE - RAND; x++) raster[y * BREITE + x] = 0xc9;
  y += 18;
  for (const zeile of sichtbar) {
    zeichnen(raster, zeile, RAND, y, 2, FARBE_TINTE);
    y += abstandText;
  }
  if (zeilen.length > ZEILEN) zeichnen(raster, "... der Text geht weiter.", RAND, y, 1, FARBE_GRAU);
  return png(BREITE, hoehe, raster);
}
