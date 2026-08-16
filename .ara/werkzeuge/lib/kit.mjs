/**
 * Gemeinsame Grundlagen der Kit-Werkzeuge.
 * Keine Abhängigkeiten außer der Node-Standardbibliothek.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
export const KUNDEN = join(WURZEL, "kunden");

/** Zeitstempel in lesbarer lokaler Form: 2026-08-16 15:42 */
export function jetzt() {
  const d = new Date();
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`;
}

/** Datum allein: 2026-08-16 */
export function heute() {
  return jetzt().slice(0, 10);
}

/**
 * Zerlegt eine Markdown-Datei mit YAML-Frontmatter.
 * Bewusst einfach gehalten: flache Schlüssel-Wert-Paare, keine Listen, keine
 * verschachtelten Strukturen. Genau das nutzen die Vorlagen des Kits.
 */
export function frontmatterLesen(pfad) {
  if (!existsSync(pfad)) return { felder: {}, rumpf: "", vorhanden: false };
  const inhalt = readFileSync(pfad, "utf8");
  const treffer = inhalt.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!treffer) return { felder: {}, rumpf: inhalt, vorhanden: true };

  const felder = {};
  for (const zeile of treffer[1].split(/\r?\n/)) {
    const paar = zeile.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (!paar) continue;
    // Erläuternde Kommentare abschneiden — auch dann, wenn das Feld leer ist und
    // der Kommentar direkt hinter dem Doppelpunkt steht. Sonst wird der
    // Erklärtext der Vorlage als Wert gelesen.
    let wert = paar[2].trim().replace(/(^|\s+)#.*$/, "").trim();
    wert = wert.replace(/^["']|["']$/g, "");
    felder[paar[1]] = wert;
  }
  return { felder, rumpf: treffer[2], vorhanden: true };
}

/** Schreibt Frontmatter-Felder zurück, ohne Reihenfolge oder Rumpf zu verlieren. */
export function frontmatterSchreiben(pfad, aenderungen) {
  const inhalt = readFileSync(pfad, "utf8");
  const treffer = inhalt.match(/^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n?)([\s\S]*)$/);
  if (!treffer) throw new Error(`${pfad} hat keinen Frontmatter-Block.`);

  const zeilen = treffer[2].split(/\r?\n/);
  const offen = new Set(Object.keys(aenderungen));

  const neu = zeilen.map((zeile) => {
    const paar = zeile.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (!paar || !offen.has(paar[1])) return zeile;
    offen.delete(paar[1]);
    return `${paar[1]}: ${aenderungen[paar[1]]}`;
  });

  for (const schluessel of offen) neu.push(`${schluessel}: ${aenderungen[schluessel]}`);

  writeFileSync(pfad, treffer[1] + neu.join("\n") + treffer[3] + treffer[4]);
}

/** Pfad zum Kundenordner. Prüft nicht, ob er existiert. */
export function kundenPfad(kunde) {
  return join(KUNDEN, kunde);
}

/** Alle angelegten Kunden. */
export function kundenListe() {
  if (!existsSync(KUNDEN)) return [];
  return readdirSync(KUNDEN, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
}

/** Alle Geräte eines Kunden. */
export function geraeteListe(kunde) {
  const ordner = join(kundenPfad(kunde), "geraete");
  if (!existsSync(ordner)) return [];
  return readdirSync(ordner, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
}

/**
 * Löst Kunde und Gerät auf. Fehlt die Gerätebezeichnung und es gibt genau eines,
 * wird dieses genommen — bei mehreren ist Raten nicht erlaubt.
 */
export function geraetAufloesen(kunde, geraet) {
  if (!kunde) throw new Error("Es fehlt die Angabe, um welchen Kunden es geht.");
  if (!existsSync(kundenPfad(kunde))) {
    const vorhanden = kundenListe();
    throw new Error(
      `Den Kunden "${kunde}" gibt es nicht.` +
        (vorhanden.length ? ` Vorhanden: ${vorhanden.join(", ")}` : " Es ist noch kein Kunde angelegt.")
    );
  }

  const geraete = geraeteListe(kunde);
  if (geraet) {
    if (!geraete.includes(geraet)) {
      throw new Error(
        `Bei "${kunde}" gibt es kein Gerät "${geraet}".` +
          (geraete.length ? ` Vorhanden: ${geraete.join(", ")}` : " Es ist noch kein Gerät angelegt.")
      );
    }
    return { kunde, geraet, pfad: join(kundenPfad(kunde), "geraete", geraet) };
  }

  if (geraete.length === 0) throw new Error(`Bei "${kunde}" ist noch kein Gerät angelegt.`);
  if (geraete.length > 1) {
    throw new Error(
      `"${kunde}" hat mehrere Geräte (${geraete.join(", ")}). Sag, um welches es geht.`
    );
  }
  return { kunde, geraet: geraete[0], pfad: join(kundenPfad(kunde), "geraete", geraete[0]) };
}

/** Liest die Gerätedaten und ergänzt den Pfad zum Laufzettel. */
export function geraetLesen(kunde, geraet) {
  const ziel = geraetAufloesen(kunde, geraet);
  const akte = join(ziel.pfad, "geraet.md");
  const { felder } = frontmatterLesen(akte);
  return { ...ziel, akte, laufzettel: join(ziel.pfad, "laufzettel.md"), felder };
}

/** Einfache Auswertung von --schluessel wert und --schalter. */
export function argumente(argv = process.argv.slice(2)) {
  const werte = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const teil = argv[i];
    if (!teil.startsWith("--")) {
      werte._.push(teil);
      continue;
    }
    const name = teil.slice(2);
    const naechstes = argv[i + 1];
    if (naechstes === undefined || naechstes.startsWith("--")) {
      werte[name] = true;
    } else {
      werte[name] = naechstes;
      i++;
    }
  }
  return werte;
}

/** Legt einen Ordner an, falls er fehlt. */
export function ordnerSichern(pfad) {
  mkdirSync(pfad, { recursive: true });
  return pfad;
}

/** Bricht mit einer verständlichen Meldung ab. */
export function abbruch(text) {
  console.error(text);
  process.exit(1);
}
