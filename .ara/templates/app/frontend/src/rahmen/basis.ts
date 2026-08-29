/**
 * Wo diese App im Fenster haengt.
 *
 * Das Geraet stellt sie unter `/apps/<kennung>/` bereit und den Teststand
 * unter `/apps/<kennung>/test/`. **Beides steht nicht im Quelltext**, und es
 * darf auch nicht: eine App, die ihren eigenen Pfad kennt, kennt einen der
 * beiden und liegt im anderen falsch. Gelesen wird er deshalb zur Laufzeit aus
 * der Adresse des Dokuments.
 *
 * Der Router bekommt den Pfad als `basename`, jeder Aufruf der Schnittstelle
 * geht durch `weg()`. Damit gibt es genau eine Stelle, an der der Pfad
 * entsteht.
 *
 * **Die Wege dieser App bleiben eine Ebene tief**, also `/vorgaenge` und nicht
 * `/vorgaenge/17`. Das haengt an derselben Entscheidung: die Seite verweist
 * relativ auf ihre Buendel, das Geraet liefert fuer jeden Pfad ohne Punkt im
 * letzten Stueck dieselbe `index.html` aus, und bei zwei Ebenen suchte der
 * Browser die Buendel dann eine Ebene zu tief. Was ein Verweis auf ein
 * einzelnes Ding braucht, gehoert in die Suchanfrage: `/vorgaenge?nr=17`.
 */

/**
 * Der Ordner, aus dem dieses Dokument kam.
 *
 * `document.baseURI` ist die Adresse der Seite, und `new URL(".", …)` schneidet
 * das letzte Stueck ab. Aus `/apps/urlaub/vorgaenge` wird `/apps/urlaub/`, aus
 * `/apps/urlaub/test/` bleibt `/apps/urlaub/test/`.
 */
export function basisAdresse(baseURI: string = document.baseURI): URL {
  return new URL(".", baseURI);
}

/** Derselbe Ort als Pfad, so wie `react-router` ihn als `basename` will. */
export function basisPfad(baseURI: string = document.baseURI): string {
  return basisAdresse(baseURI).pathname;
}

/**
 * Ein Weg der eigenen Schnittstelle, absolut.
 *
 * Absolut und nicht relativ: ein relativer Aufruf ginge von der Adresse aus,
 * die gerade im Fenster steht, und die aendert der Router bei jedem Klick.
 * `weg("api/me")` zeigt immer auf die App, egal auf welcher Seite man steht.
 */
export function weg(pfad: string, basis: URL = basisAdresse()): string {
  return new URL(pfad.replace(/^\/+/, ""), basis).toString();
}
