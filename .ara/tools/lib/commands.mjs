/**
 * Was das Kit ueber seine eigenen Befehle weiss.
 *
 * Nur Daten, keine Dateien und kein Netz: `commands.mjs` raeumt danach auf, der
 * Selbsttest prueft dagegen, und beide lesen dieselbe Liste. Zwei Listen liefen
 * auseinander, und dann faende die Pruefung genau den Fall nicht mehr, fuer den
 * es sie gibt.
 */

/**
 * Befehle, die es im Kit nicht mehr gibt, und wie sie heute heissen.
 *
 * Ein umbenannter Befehl verschwindet nicht von allein: seine Kopie liegt in
 * `.claude/commands/` und im `.gitignore`, ein Update fasst sie nicht an. Ohne
 * diese Liste haette der Partner nach dem Update beide, den alten mit dem alten
 * Verfahren und den neuen daneben.
 *
 * Ein Eintrag hier ist eine Zusage: wer den alten Namen aufschreibt, schreibt
 * den neuen daneben. Sonst liest jemand von einem Befehl, den es nicht gibt.
 */
export const RETIRED = Object.freeze({
  // Phase E1, 26.08.2026: /start und /update sind in /init aufgegangen. Das
  // erste Mal und jedes weitere Mal ist derselbe Befehl, er sieht selbst nach,
  // welcher der beiden Faelle vorliegt.
  start: "init",
  update: "init",
  // Phase E6, 27.08.2026: /offer nach kit-grundriss.md, englisch wie die
  // uebrigen Befehle.
  angebot: "offer",
  // Phase E10, 28.08.2026: Englisch ist die Hauptsprache des Kits, und ein
  // Befehlsname ist keine Ausnahme. Er heisst wie sein Werkzeug.
  kalkulation: "calculation",
});
