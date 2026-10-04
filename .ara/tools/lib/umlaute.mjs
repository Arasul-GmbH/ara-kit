/**
 * Echte Umlaute in allem, was ein Mensch liest.
 *
 * Deutsch schreibt sich mit ae-Umlaut, oe-Umlaut, ue-Umlaut und scharfem s. Die
 * Umschrift (ae, oe, ue, ss) gehoert nur in Dateinamen und Bezeichner. Wer in
 * der Beschreibung einer App "Messgeraet fuer" liest, haelt sie fuer unfertig.
 *
 * Zwei Dinge liegen hier, beide reine Funktionen bis auf das Lesen der Dateien:
 *
 *   ersatzwoerter(text)      die Woerter, die nach Umschrift aussehen, ohne
 *                            Fremdwoerter und Namen (Queue, Michael, true)
 *   sichtbareErsatzfunde()   dasselbe an einer App: sichtbare Felder der
 *                            app.json, Texte der Flows, sichtbarer Text des
 *                            Frontends
 *
 * Es ist eine Warnung und kein Halt: ein Muster rät, und ein Wort, das es
 * falsch trifft, soll keine Auslieferung sperren. Der Selbsttest belegt, was
 * anschlaegt und was nicht.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Woerter, die ein Muster tragen und trotzdem richtig sind: Fremdwoerter,
 * Namen und deutsche Woerter, in denen ue, oe oder ae ein eigener Laut ist.
 * Alles in Kleinschreibung.
 */
const ERLAUBT = new RegExp(
  "^(?:" +
    [
      // Englisch, jeweils nur die Formen des Wortes selbst: ein Praefix wie
      // "blue" liesse sonst das deutsche "Blueten" (Blüten) durch.
      "true", "dues?", "overdue", "(?:blue|clue|glue|value|issue|argue|rescue|pursue|continue|subdue)(?:s|d)?", "valuable", "tissues?",
      "(?:revenue|venue|statue|virtue)s?", "unique(?:ly|ness)?", "tuesdays?", "(?:dialogue|catalogue)s?",
      "fuel(?:s|ed|ing)?", "duel(?:s|ed|ing)?", "duets?", "cruel(?:ty)?", "(?:in)?fluen(?:t|ce|ces|cer|cers|cing|ced|tial)",
      "\\w*gue", "\\w*gues", "gue(?:ss|st|rr|ril)\\w*", "bluetooth", "traefik", "oem(?:-config)?",
      "does", "goes", "doe", "joe", "shoes?", "toes?", "foes?", "poems?", "poets?", "goethe", "phoenix", "aloe", "canoe",
      "oboe", "woe", "(?:co|ko)e(?:x|ff|rc)\\w*",
      "daemons?", "poesie", "caesar", "maestro", "paella", "aeon", "aegis", "aesop", "aesth\\w*", "aero\\w*", "aerial\\w*",
      // Namen
      "\\w*(?:michael|raphael|rafael|israel|nathanael|ismael|manuel|samuel|emanuel|joel|noel)\\w*",
      // Deutsch mit eigenem Laut
      "(?:akt|event|man|individ|virt|vis|punkt|konzept|sex|intellekt)uell\\w*", "\\w*zu(?:ent|erkenn|eign|erst|einander)\\w*",
    ].join("|") +
    ")$"
);

/** Das Muster, das ein Wort nach Umschrift aussehen laesst. Kleinschreibung. */
const ERSATZ = [
  /(?<![aeouq])ue/,
  /(?<![aeou])ae/,
  /(?<![aeou])oe/,
  // Fugen wie Quellcodeueberlassung und geaendert
  /ueb|geae|geoe|geue/,
  // ss, das ein scharfes s war: nach ie immer, nach ei fast immer
  /iess|eiss(?!ag)/,
  /^(?:ausser|aussen$|draussen$|gross(?:e[rsnm]?|artig|teil)|weiss|heiss|spass|gruss)|strasse$|massnahme|massgeb|massstab/,
];

/** Kein Wort, sondern Bezeichner, Pfad, Adresse: dort steht ASCII mit Absicht. */
const TECHNISCH = [
  /`[^`\n]*`/g,
  /\{\{[^}]*\}\}/g,
  /\bhttps?:\/\/\S+/g,
  /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g,
  /[\w.$-]*[_/\\][\w./\\$-]*/g,
  /\b[\w-]+\.(?:json|md|mjs|cjs|js|ts|tsx|css|html|sql|yml|yaml|env)\b/g,
];

/** Die verdaechtigen Woerter eines Textes, jedes einmal, in der Schreibweise des Textes. */
export function ersatzwoerter(text) {
  let rein = String(text ?? "");
  for (const muster of TECHNISCH) rein = rein.replace(muster, " ");
  const funde = new Set();
  for (const treffer of rein.matchAll(/[A-Za-zÄÖÜäöüß]+/g)) {
    const wort = treffer[0];
    // camelCase ist ein Bezeichner
    if (/[a-zäöüß][A-ZÄÖÜ]/.test(wort)) continue;
    const klein = wort.toLowerCase();
    if (ERLAUBT.test(klein)) continue;
    if (ERSATZ.some((muster) => muster.test(klein))) funde.add(wort);
  }
  return [...funde];
}

/** Schluessel in der app.json, deren Text ein Mensch liest. */
const SICHTBAR = new Set([
  "name", "beschreibung", "purpose", "titel", "text", "label", "beschriftung", "zusammenhang", "hinweis", "description", "frage",
]);

/** Jeder sichtbare Text der app.json als `{ feld, text }`. */
function manifestTexte(wert, pfad = "", schluessel = "") {
  if (typeof wert === "string") return SICHTBAR.has(schluessel) ? [{ feld: pfad, text: wert }] : [];
  if (Array.isArray(wert)) return wert.flatMap((v, i) => manifestTexte(v, `${pfad}[${i}]`, schluessel));
  if (wert && typeof wert === "object") {
    return Object.entries(wert).flatMap(([k, v]) => manifestTexte(v, pfad ? `${pfad}.${k}` : k, k));
  }
  return [];
}

/** Zeilen eines Flows, deren Wert ein Bezeichner ist und kein Text. */
const FLOW_BEZEICHNER = /^\s*-?\s*(?:name|typ|werkzeug|werkzeuge|modell|methode|pfad|quelle|ziel|arten|ausloeser|stufen|stufe|zeitplan|ereignis|faehigkeiten|rolle|ergebnis|original|aenderbar):.*$/gm;

function dateien(ordner, passt) {
  const raus = [];
  const gehe = (dir) => {
    if (!existsSync(dir) || !statSync(dir).isDirectory()) return;
    for (const eintrag of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (eintrag.name.startsWith(".") || ["node_modules", "dist", "build", "marken"].includes(eintrag.name)) continue;
      const pfad = join(dir, eintrag.name);
      if (eintrag.isDirectory()) gehe(pfad);
      else if (passt(eintrag.name)) raus.push(pfad);
    }
  };
  gehe(ordner);
  return raus;
}

/** Eine Zeile über 1000 Zeichen: Quelltext, den ein Mensch schreibt, sieht anders aus. */
function gebaut(quelle) {
  return quelle.split("\n").some((zeile) => zeile.length > 1000);
}

/**
 * Ersatzschreibungen in dem, was Menschen an einer App lesen. Eine Liste von
 * `{ wo, woerter }`, leer heisst gut.
 *
 * `manifest` ist die gelesene app.json, `dir` der Ordner der App.
 */
export function sichtbareErsatzfunde(dir, manifest) {
  const funde = [];
  const melde = (wo, woerter) => {
    if (woerter.length) funde.push({ wo, woerter });
  };
  if (manifest && typeof manifest === "object") {
    for (const { feld, text } of manifestTexte(manifest)) melde(`app.json, ${feld}`, ersatzwoerter(text));
  }
  const flowsOrdner = typeof manifest?.flows?.verzeichnis === "string" ? manifest.flows.verzeichnis : "flows";
  for (const pfad of dateien(join(dir, flowsOrdner), (n) => /\.(md|ya?ml)$/.test(n))) {
    melde(relative(dir, pfad), ersatzwoerter(readFileSync(pfad, "utf8").replace(FLOW_BEZEICHNER, "")));
  }
  const front = typeof manifest?.frontend?.verzeichnis === "string" ? manifest.frontend.verzeichnis : "frontend";
  // Gebaute Dateien (pdf.worker.min.js, ein Bundle in assets/) sind keine Prosa: sie tragen
  // Bezeichner und Fremdtext, und niemand schreibt sie von Hand.
  for (const pfad of dateien(join(dir, front), (n) => /\.(tsx|jsx|ts|js|html)$/.test(n) && !/\.min\.[a-z]+$/.test(n))) {
    const quelle = readFileSync(pfad, "utf8");
    if (gebaut(quelle)) continue;
    const text = prosaBereiche(quelle, pfad, { sichtbar: true })
      .map(([von, bis]) => quelle.slice(von, bis))
      .join("\n");
    melde(relative(dir, pfad), ersatzwoerter(text));
  }
  return funde;
}

/** Die Warnung als Zeilen, leer wenn nichts auffiel. */
export function umlautWarnung(funde, t) {
  if (!funde.length) return [];
  return [
    t(
      "Warning: these texts carry a spelling without umlauts. What a person reads should have the real letters (ä, ö, ü, ß). Nothing is stopped, but look at them:",
      "Warnung: diese Texte tragen eine Schreibweise ohne Umlaute. Was ein Mensch liest, trägt die echten Buchstaben (ä, ö, ü, ß). Nichts wird angehalten, aber schau sie an:"
    ),
    ...funde.map((f) => `- ${f.wo}: ${f.woerter.join(", ")}`),
  ];
}

/**
 * Wo in einer Datei der Vorlage deutscher Inhalt steht, als Bereiche
 * `[von, bis]`: Kommentare, Zeichenketten mit Leerraum (ohne SQL und ohne
 * `${}`-Einschübe), Text zwischen JSX-Tags, in Markdown alles außerhalb von
 * Codeblöcken. Codespannen in Backticks bleiben draußen: dort stehen Namen.
 */
export function prosaBereiche(quelle, pfad, { sichtbar = false } = {}) {
  const raus = [];
  const ohneSpannen = (von, bis) => {
    let anfang = von;
    let offen = false;
    for (let i = von; i < bis; i++) {
      if (quelle[i] === "\n") offen = false;
      if (quelle[i] !== "`") continue;
      if (!offen) raus.push([anfang, i]);
      else anfang = i + 1;
      offen = !offen;
    }
    if (!offen) raus.push([anfang, bis]);
  };
  const name = pfad.split(/[\\/]/).pop();
  const muster = (re, vorn, hinten) => {
    for (const m of quelle.matchAll(re)) ohneSpannen(m.index + vorn, m.index + m[0].length - hinten);
    return raus;
  };
  // `sichtbar`: nur, was ein Mensch auf dem Bildschirm liest. Kommentare,
  // SQL, Dockerfile und CSS fallen dann weg, Text zwischen HTML-Tags kommt dazu.
  if (sichtbar && /\.(sql|css)$|^Dockerfile$/.test(name)) return raus;
  if (sichtbar && name.endsWith(".html")) return muster(/>([^<>]*[A-Za-zÄÖÜäöüß][^<>]*)(?=<)/g, 1, 0);
  if (name.endsWith(".sql")) return muster(/--.*/g, 2, 0);
  if (name.endsWith(".css")) return muster(/\/\*[\s\S]*?\*\//g, 2, 2);
  if (name === "Dockerfile") return muster(/#.*/g, 1, 0);
  if (name.endsWith(".html")) return muster(/<!--[\s\S]*?-->/g, 4, 3);
  if (name.endsWith(".json")) {
    for (const m of quelle.matchAll(/"((?:[^"\\]|\\.)*)"/g)) {
      if (/\s/.test(m[1]) && !/--|&&/.test(m[1])) ohneSpannen(m.index + 1, m.index + m[0].length - 1);
    }
    return raus;
  }
  if (name.endsWith(".md")) {
    let pos = 0;
    for (const m of quelle.matchAll(/^```[\s\S]*?^```/gm)) {
      ohneSpannen(pos, m.index);
      pos = m.index + m[0].length;
    }
    ohneSpannen(pos, quelle.length);
    return raus;
  }
  const code = [];
  let codeAnfang = 0;
  let letztes = "";
  let i = 0;
  while (i < quelle.length) {
    const c = quelle[i];
    const d = quelle[i + 1];
    if (c === "/" && (d === "/" || d === "*")) {
      code.push([codeAnfang, i]);
      const ende = d === "/" ? quelle.indexOf("\n", i) : quelle.indexOf("*/", i + 2);
      const bis = ende < 0 ? quelle.length : ende;
      if (!sichtbar) ohneSpannen(i + 2, bis);
      i = d === "/" ? bis : bis + 2;
      codeAnfang = i;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      code.push([codeAnfang, i]);
      let j = i + 1;
      let tiefe = 0;
      let start = i + 1;
      const teile = [];
      while (j < quelle.length) {
        const z = quelle[j];
        if (z === "\\") { j += 2; continue; }
        if (c === "`" && !tiefe && z === "$" && quelle[j + 1] === "{") { teile.push([start, j]); tiefe = 1; j += 2; continue; }
        if (tiefe) {
          if (z === "{") tiefe += 1;
          else if (z === "}" && --tiefe === 0) start = j + 1;
          j += 1;
          continue;
        }
        if (z === c || (c !== "`" && z === "\n")) break;
        j += 1;
      }
      teile.push([start, j]);
      const inhalt = teile.map(([von, bis]) => quelle.slice(von, bis)).join(" ");
      const sql = /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|VALUES)\b/.test(inhalt);
      const einWort = sichtbar && /^[A-ZÄÖÜ][a-zäöüß]+$/.test(inhalt.trim());
      if (!sql && (/\s/.test(inhalt.trim()) || einWort)) {
        if (c === "`") raus.push(...teile);
        else ohneSpannen(i + 1, j);
      }
      i = j + 1;
      codeAnfang = i;
      letztes = c;
      continue;
    }
    // Ein regulärer Ausdruck ist Code, auch wenn er Buchstaben trägt.
    if (c === "/" && (letztes === "" || "(,=:[!&|?{};".includes(letztes))) {
      let j = i + 1;
      let klasse = false;
      while (j < quelle.length && quelle[j] !== "\n") {
        if (quelle[j] === "\\") { j += 2; continue; }
        if (quelle[j] === "[") klasse = true;
        else if (quelle[j] === "]") klasse = false;
        else if (quelle[j] === "/" && !klasse) break;
        j += 1;
      }
      i = j + 1;
      letztes = "/";
      continue;
    }
    if (!/\s/.test(c)) letztes = c;
    i += 1;
  }
  code.push([codeAnfang, quelle.length]);
  if (name.endsWith(".tsx") || name.endsWith(".jsx")) {
    for (const [von, bis] of code) {
      for (const m of quelle.slice(von, bis).matchAll(/>([^<>{}=;()]*[A-Za-zÄÖÜäöüß][^<>{}=;()]*)(?=[<{])/g)) {
        raus.push([von + m.index + 1, von + m.index + 1 + m[1].length]);
      }
    }
  }
  return raus;
}

