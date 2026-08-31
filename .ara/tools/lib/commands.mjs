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

/** Zweig zu Quellordner der Befehle. `all/` gilt immer. */
export const BRANCHES = Object.freeze({ partner: ["all", "partner"], company: ["all"] });

/**
 * Was nur der Partner bekommt, als Pfade relativ zur Wurzel des Kits.
 *
 * Befehle schneidet `BRANCHES` seit jeher nach Zweig. Skills, Vorlagen und
 * Wissen kamen bis 0.20.2 zweigblind mit dem Klon, und `update.mjs` spielte
 * sie jedem wieder ein: ein Unternehmen sah nach `/init` die Skills sales,
 * pricing und customers, die Angebots- und Rechnungsvorlage und einen Ordner
 * customers/, hielt das Kit fuer ein Haendlerwerkzeug und brach ab.
 *
 * Die Liste ist an drei Stellen dieselbe: `commands.mjs --apply` raeumt sie
 * fuer ein Unternehmen weg, `update.mjs` laesst sie fuer ein Unternehmen aus,
 * der Selbsttest prueft beides dagegen. Ein Ordner endet mit `/`.
 *
 * Der Weg zurueck, wenn aus einem Unternehmen ein Partner wird: Zweig im
 * Profil aendern, dann `node .ara/tools/update.mjs`, das holt alles wieder.
 */
export const PARTNER_ONLY = Object.freeze([
  ".claude/skills/customers/",
  ".claude/skills/sales/",
  ".claude/skills/pricing/",
  ".ara/vorlagen/angebot.md",
  ".ara/vorlagen/rechnung.md",
  ".ara/vorlagen/endkundenbedingungen.md",
  ".ara/knowledge/crm.md",
  ".ara/knowledge/crm.de.md",
  ".ara/knowledge/sales.md",
  ".ara/knowledge/sales.de.md",
  ".ara/knowledge/pricing.md",
  ".ara/knowledge/pricing.de.md",
  ".ara/knowledge/invoicing.md",
  ".ara/knowledge/invoicing.de.md",
]);

/** Gehoert dieser Pfad (relativ zur Wurzel, mit `/`) nur dem Partner? */
export function partnerOnly(rel) {
  const path = rel.split("\\").join("/");
  return PARTNER_ONLY.some((entry) =>
    entry.endsWith("/") ? path === entry.slice(0, -1) || path.startsWith(entry) : path === entry
  );
}
