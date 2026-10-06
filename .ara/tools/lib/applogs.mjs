/**
 * Das Protokoll einer App, ohne SSH.
 *
 * Bei einer leeren Seite oder einem 502 im Teststand sagt nur das Protokoll des
 * Containers, was los ist. Das Gerät gibt es her (seit Jet PR 932), und der
 * Kontrakt nennt den Weg unter `endpunkte`. **Hier steht kein Weg des
 * Produkts:** der Weg und die Namen seiner Angaben werden aus dem Eintrag
 * gelesen, den der Kontrakt dafür hat. Nennt er keinen, sagt das Werkzeug das.
 *
 * Reine Funktionen, ohne Netz, damit der Selbsttest sie mit erfundenem Kontrakt prüft.
 */

import { stripAnsi } from "./install.mjs";
import { fillPath } from "./adminways.mjs";

const PROTOKOLL = /\/apps\/[:<][A-Za-z_]+>?\/protokoll$/;

/**
 * Der Eintrag des Kontrakts, der das Protokoll einer App liest, oder null.
 * Zurück kommen der Weg ohne Angaben, die Namen der Angaben und, wo der Kontrakt
 * eine Spanne `<1..1000>` nennt, deren Grenzen.
 */
export function logsWay(contract) {
  for (const entry of Array.isArray(contract?.endpunkte) ? contract.endpunkte : []) {
    if (String(entry?.verb).toUpperCase() !== "GET" || typeof entry.pfad !== "string") continue;
    const [path, query = ""] = entry.pfad.split("?");
    if (!PROTOKOLL.test(path)) continue;
    const params = Object.fromEntries(
      query
        .split("&")
        .filter(Boolean)
        .map((part) => [part.split("=")[0], part.split("=").slice(1).join("=")])
    );
    const spanne = Object.entries(params).map(([name, wert]) => [name, wert.match(/(\d+)\.\.(\d+)/)]).find(([, m]) => m);
    return {
      path,
      scope: entry.bereich || null,
      stand: "stand" in params ? "stand" : null,
      lines: spanne ? spanne[0] : "zeilen" in params ? "zeilen" : null,
      range: spanne ? [Number(spanne[1][1]), Number(spanne[1][2])] : null,
    };
  }
  return null;
}

/** Der Weg einer App mit den Angaben, die der Kontrakt nennt. */
export function logsPath(way, app, { stand, lines } = {}) {
  const query = [];
  if (way.stand && stand) query.push(`${way.stand}=${encodeURIComponent(stand)}`);
  if (way.lines && lines) query.push(`${way.lines}=${encodeURIComponent(String(lines))}`);
  const base = fillPath(way.path, { id: app });
  return query.length ? `${base}?${query.join("&")}` : base;
}

/** Zeilen ohne Steuerzeichen: Farben, Docker-Vorspann, alles unter Leerzeichen außer Tab. */
export function cleanLine(text) {
  return stripAnsi(String(text ?? "")).replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "");
}

export function cleanLines(lines) {
  return (Array.isArray(lines) ? lines : String(lines ?? "").split(/\r?\n/)).map(cleanLine);
}
