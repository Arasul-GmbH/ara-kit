/**
 * Die Suchroute einer App, geprüft: hat eine App mit Listen die Route `suche`, damit die Suche in
 * der Kopfleiste des Geräts ihre Datensätze findet?
 *
 * Der Vertrag (`.ara/knowledge/search.md`): die App beantwortet `GET suche?q=<text>&limit=<n>` mit
 * `{ data: [{ titel, unterzeile, art, pfad }] }`, höchstens zehn Treffer, und nennt die Route im
 * Feld `agent` ihrer `app.json`. Daran erkennt das Gerät, dass es sie fragen kann; ein neues Feld
 * im Manifest gibt es dafür nicht.
 *
 * **Ein Hinweis, nie ein Befund, der anhält.** Eine App ohne Suchroute bleibt gültig, das Gerät
 * zeigt sie dann nur als App und nicht ihre Datensätze. Ob eine App Listen hat, liest diese Prüfung
 * aus zwei Stellen: eine lesende Route im Feld `agent` (außer `agent` und `suche`), oder eine Liste
 * der Bibliothek in der Oberfläche (`Datenliste`, `Liste`). Hat sie keine von beiden, gibt es nichts
 * zu finden, und es kommt kein Hinweis.
 *
 * Ob die Route im Backend steht, prüft schon `agentfield.mjs` wie jede andere genannte Route; hier
 * steht nur, was der Vertrag darüber hinaus verlangt: der Parameter `q`.
 *
 * Reine Funktionen bis auf das Lesen des Frontend-Ordners.
 */

import { existsSync, readFileSync } from "node:fs";
import { safeFolder, walkFiles } from "./files.mjs";
import { t } from "./i18n.mjs";
import { readAgent } from "../../templates/root/arasul.mjs";

/** Der Pfad der Route, wie das Feld `agent` ihn nennt. */
export const SEARCH_PATH = "suche";

/** Zeichnet die Oberfläche eine Liste der Bibliothek? */
function frontendHasList(dir, manifest) {
  const folder = safeFolder(dir, manifest, "frontend.verzeichnis");
  if (!folder || !existsSync(folder)) return false;
  const files = walkFiles(folder, { match: /\.(tsx|jsx)$/, skip: ["node_modules", "marken", "dist"], maxBytes: 500_000, limit: 300 });
  return files.some((path) => /<(Datenliste|Liste)\b/.test(readFileSync(path, "utf8")));
}

/**
 * Was die App über ihre Suche wissen sollte, als Hinweise. Leer heißt: entweder sucht sie nach
 * Vertrag, oder sie hat nichts, was sich finden ließe.
 */
export function searchHints(dir, manifest) {
  if (!manifest) return [];
  const { routes } = readAgent(Array.isArray(manifest.agent) ? manifest.agent : []);
  const search = routes.find((route) => route.method === "GET" && route.path === SEARCH_PATH);
  if (search) {
    if (search.params.some((param) => param.name === "q")) return [];
    return [
      t(
        `Search: agent names GET ${SEARCH_PATH} without q (.ara/knowledge/search.md): q string required, limit integer optional.`,
        `Suche: agent nennt GET ${SEARCH_PATH} ohne q (.ara/knowledge/search.de.md): q string Pflicht, limit integer frei.`
      ),
    ];
  }
  const reading = routes.filter((route) => route.method === "GET" && !route.writes && !["agent", SEARCH_PATH].includes(route.path));
  if (!reading.length && !frontendHasList(dir, manifest)) return [];
  return [
    t(
      `Search: the app has lists but no search for the device's search bar (.ara/knowledge/search.md). It stays valid, but nobody finds its entries there.`,
      `Suche: die App hat Listen, aber keine Suche für die Kopfleiste des Geräts (.ara/knowledge/search.de.md). Gültig bleibt sie, nur findet dort niemand ihre Einträge.`
    ),
  ];
}
