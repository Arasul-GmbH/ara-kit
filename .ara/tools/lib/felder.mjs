/**
 * Die Felder, die Kontrakt 8 einer App und ihren Flows gibt: `symbol`, `arten`, `ausloeser`,
 * `stufen`, `faehigkeiten`, und der `aenderungstext` beim Ausrollen.
 *
 * **Die Form steht im Kontrakt des Geraets, nicht hier.** `checkManifest` haelt `app.json` gegen
 * dessen Schema, und was ein Flow-Kopf tragen darf, sagt `flow_frontmatter` im selben Kontrakt.
 * Dieses Modul schreibt die Felder beim Anlegen einer App in die Form, die der Kontrakt dieses
 * Geraets beschreibt (Stand beim Bau: Kontrakt 8 am Orin), und es prueft zwei Dinge, die kein
 * Schema traegt: dass ein Werkzeug-Schritt keine `faehigkeiten` hat und dass eine Stufe, die ein
 * Schritt nennt, im Kopf des Flows steht.
 *
 * **Die Felder sind geschrieben, nicht versprochen.** Dass das Geraet sie schon wirken laesst,
 * sagt sein Kontrakt (`--contract`, Abschnitt Regeln fuer einen Flow). Das Kit sagt es nie von
 * sich aus: Stufen mit Standardperson, der Zeitplaner und die Arten kommen im Geraet spaeter.
 *
 * Reine Funktionen, ohne Netz und ohne Dateien.
 */

import { t } from "./i18n.mjs";

/** Das Kuerzel einer App im Namen der App: ein Lucide-Name oder 1 bis 3 Grossbuchstaben oder Ziffern. */
const SYMBOL_NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const SYMBOL_SHORT = /^[A-Z0-9]{1,3}$/;

/** Die Arten, die ein Flow nennen darf, wie der Kontrakt sie schreibt. */
export const ARTEN = Object.freeze(["autonom", "ergebnis_bestaetigen"]);

/** Was ein Mensch dafuer sagt, auf die Namen des Kontrakts abgebildet. */
const ARTEN_WORTE = {
  autonom: "autonom",
  alleine: "autonom",
  allein: "autonom",
  ergebnis_bestaetigen: "ergebnis_bestaetigen",
  bestaetigen: "ergebnis_bestaetigen",
  "bestätigen": "ergebnis_bestaetigen",
  pruefen: "ergebnis_bestaetigen",
  "prüfen": "ergebnis_bestaetigen",
};

const UMLAUTE = { "ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss", "Ä": "ae", "Ö": "oe", "Ü": "ue" };

/** Ein Anzeigename als Kennung: klein, ohne Umlaut, `_` statt allem Anderen. */
export function slug(text) {
  return String(text)
    .replace(/[äöüßÄÖÜ]/g, (c) => UMLAUTE[c])
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^[^a-z]+/, "")
    .slice(0, 31);
}

function split(value) {
  return String(value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/** `--symbol`: gut oder ein Satz, was nicht passt. */
export function parseSymbol(value) {
  const symbol = String(value ?? "").trim();
  if (SYMBOL_NAME.test(symbol) || SYMBOL_SHORT.test(symbol)) return { symbol };
  return {
    error: t(
      `The symbol "${symbol}" does not fit. Write the name of an icon in small letters with hyphens (file-text), or a short mark of one to three capital letters or digits (BE).`,
      `Das Symbol „${symbol}" passt nicht. Schreib den Namen eines Bildes klein und mit Bindestrichen (file-text) oder ein Kürzel aus einem bis drei Großbuchstaben oder Ziffern (BE).`
    ),
  };
}

/** `--stufen "Prüfung,Leitung"`: je Stufe Kennung und Anzeigename. Höchstens fünf, keine doppelt. */
export function parseStufen(value) {
  const labels = split(value);
  const stufen = [];
  for (const label of labels) {
    const name = slug(label);
    if (!name) {
      return {
        error: t(
          `The stage "${label}" does not fit: it needs at least one letter.`,
          `Die Stufe „${label}" passt nicht: sie braucht mindestens einen Buchstaben.`
        ),
      };
    }
    if (stufen.some((s) => s.name === name)) {
      return { error: t(`The stage "${label}" stands twice.`, `Die Stufe „${label}" steht zweimal.`) };
    }
    stufen.push({ name, bezeichnung: label.slice(0, 60) });
  }
  if (!stufen.length) return { error: t("At least one stage is needed.", "Es braucht mindestens eine Stufe.") };
  if (stufen.length > 5) {
    return { error: t("At most five stages fit into a flow.", "In einen Flow passen höchstens fünf Stufen.") };
  }
  return { stufen };
}

/** `--arten autonom,bestaetigen`: die Namen des Kontrakts, mindestens eine, keine doppelt. */
export function parseArten(value) {
  const arten = [];
  for (const word of split(value)) {
    const art = ARTEN_WORTE[word.toLowerCase()];
    if (!art) {
      return {
        error: t(
          `The kind "${word}" is not known. Possible: autonom (it runs by itself), ergebnis_bestaetigen (a person confirms the result).`,
          `Die Art „${word}" kennt das Kit nicht. Möglich: autonom (läuft von allein), \`ergebnis_bestaetigen\` (ein Mensch bestätigt das Ergebnis).`
        ),
      };
    }
    if (!arten.includes(art)) arten.push(art);
  }
  if (!arten.length) return { error: t("At least one kind is needed.", "Es braucht mindestens eine Art.") };
  return { arten };
}

/**
 * `--ausloeser "hand,zeitplan:0 6 * * 1-5,ereignis:vorgang.neu"`: eine Liste von Objekten, wie der
 * Kontrakt sie beschreibt. Höchstens fünf, keiner doppelt. Der Zeitplan hat fünf Felder wie cron.
 */
export function parseAusloeser(value) {
  const entries = split(value);
  const list = [];
  for (const entry of entries) {
    const colon = entry.indexOf(":");
    const typ = (colon < 0 ? entry : entry.slice(0, colon)).trim().toLowerCase();
    const rest = colon < 0 ? "" : entry.slice(colon + 1).trim();
    let item;
    if (typ === "hand") {
      item = { typ: "hand" };
    } else if (typ === "zeitplan") {
      if (rest.split(/\s+/).length !== 5) {
        return {
          error: t(
            `The schedule "${rest}" needs five fields like cron, for example "0 6 * * 1-5". A comma inside it does not work here, write the days as a range.`,
            `Der Zeitplan „${rest}" braucht fünf Felder wie bei cron, zum Beispiel „0 6 * * 1-5". Ein Komma darin geht hier nicht, schreib die Tage als Bereich.`
          ),
        };
      }
      item = { typ: "zeitplan", zeitplan: rest };
    } else if (typ === "ereignis") {
      if (!/^[a-z][a-z0-9_.-]{0,59}$/.test(rest)) {
        return {
          error: t(
            `The event name "${rest}" does not fit: small letters, digits, dot, hyphen, underscore.`,
            `Der Name des Ereignisses „${rest}" passt nicht: Kleinbuchstaben, Ziffern, Punkt, Bindestrich, Unterstrich.`
          ),
        };
      }
      item = { typ: "ereignis", ereignis: rest };
    } else {
      return {
        error: t(
          `The trigger "${entry}" is not known. Possible: hand, zeitplan:<five fields>, ereignis:<name>.`,
          `Den Auslöser „${entry}" kennt das Kit nicht. Möglich: hand, zeitplan:<fünf Felder>, ereignis:<name>.`
        ),
      };
    }
    if (list.some((o) => JSON.stringify(o) === JSON.stringify(item))) {
      return { error: t(`The trigger "${entry}" stands twice.`, `Der Auslöser „${entry}" steht zweimal.`) };
    }
    list.push(item);
  }
  if (!list.length) return { error: t("At least one trigger is needed.", "Es braucht mindestens einen Auslöser.") };
  if (list.length > 5) return { error: t("At most five triggers fit into a flow.", "In einen Flow passen höchstens fünf Auslöser.") };
  return { ausloeser: list };
}

/**
 * Kennt der Kontrakt des Geraets das Feld `aenderungstext`? Das Kit fragt den Kontrakt, nicht eine
 * Versionsnummer. Zwei Stellen gelten: der Schluessel unter `paket.felder` und der Satz am
 * Deploy-Endpunkt (POST auf `/apps`, ohne `:id`). Der Satz nennt das Feld mit Backticks, nicht als
 * Schluessel: am 03.10.2026 fand die Suche nach `"aenderungstext"` ihn am echten Geraet nicht. Ein
 * Satz an einem anderen Endpunkt zaehlt nicht, er sagt nichts darueber, was der Deploy annimmt.
 */
export function contractKnowsChangeText(contract) {
  const wort = /(^|[^a-z0-9_])aenderungstext($|[^a-z0-9_])/i;
  if (Object.hasOwn(contract?.paket?.felder ?? {}, "aenderungstext")) return true;
  const deploy = (contract?.endpunkte ?? []).filter(
    (e) => String(e?.verb).toUpperCase() === "POST" && /\/apps\/?$/.test(String(e?.pfad ?? ""))
  );
  return deploy.some((e) => wort.test(JSON.stringify(e)));
}

/** Der `aenderungstext` beim Ausrollen: ein paar Sätze, 1 bis 1000 Zeichen. */
export function parseAenderungstext(value) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return { missing: true };
  if (text.length > 1000) {
    return {
      error: t(
        `The text of the change is ${text.length} characters long, the device takes at most 1000. Say it in fewer sentences.`,
        `Der Änderungstext ist ${text.length} Zeichen lang, das Gerät nimmt höchstens 1000. Sag es in weniger Sätzen.`
      ),
    };
  }
  return { text };
}

/** Das Feld `symbol` in app.json, hinter `beschreibung`. */
export function setSymbol(manifest, symbol) {
  const out = {};
  for (const [key, value] of Object.entries(manifest)) {
    out[key] = value;
    if (key === "beschreibung") out.symbol = symbol;
  }
  if (!("symbol" in out)) out.symbol = symbol;
  return out;
}

const quote = (s) => JSON.stringify(s);

/**
 * Die Felder in die Datei des Flows `freigabe` schreiben. Die Vorlage hat einen Schritt
 * `entscheiden`: mit mehr als einer Stufe wird daraus ein Schritt je Stufe, der die Stufe in
 * `parameter.stufe` nennt, wie der Kontrakt es verlangt.
 */
export function applyFlowFields(text, { arten, ausloeser, stufen } = {}) {
  let out = text;
  const head = [];
  if (arten?.length) head.push(`arten: [${arten.join(", ")}]`);
  if (ausloeser?.length) {
    head.push("ausloeser:");
    for (const o of ausloeser) {
      const [first, ...more] = Object.entries(o);
      head.push(`  - ${first[0]}: ${quote(first[1])}`);
      for (const [k, v] of more) head.push(`    ${k}: ${quote(v)}`);
    }
  }
  if (stufen?.length) {
    head.push("stufen:");
    for (const s of stufen) {
      head.push(`  - name: ${s.name}`);
      if (s.bezeichnung) head.push(`    bezeichnung: ${quote(s.bezeichnung)}`);
    }
  }
  if (head.length) out = out.replace(/^werkzeuge:/m, `${head.join("\n")}\nwerkzeuge:`);

  if (stufen?.length) {
    const block = out.match(/^ {2}- name: entscheiden\n[\s\S]*?(?=^grenzen:)/m);
    if (block) {
      const many = stufen.length > 1;
      const steps = stufen.map((s) => {
        let step = block[0].replace(/ {6}titel:/, `      stufe: ${s.name}\n      titel:`);
        if (many) step = step.replace("- name: entscheiden", `- name: entscheiden_${s.name}`);
        return step;
      });
      out = out.replace(block[0], steps.join(""));
      if (many) out = out.replace("der Schritt „entscheiden\"", "die Schritte „entscheiden_…\"");
    }
  }
  return out;
}

/** Eine Zeile je Flow-Datei: was kein Schema traegt. Der Text ist die Datei, `name` ihr Name. */
export function flowFieldFindings(name, text) {
  const findings = [];
  const declared = new Set();
  const stufenBlock = text.match(/^stufen:\n((?: {2,}.*\n|\n)*)/m);
  if (stufenBlock) {
    for (const m of stufenBlock[1].matchAll(/^ {2}- name:\s*"?([a-z0-9_]+)"?/gm)) declared.add(m[1]);
  }
  const header = text.split(/^---\s*$/m)[1] ?? text;
  const steps = header.split(/^ {2}- name:/m).slice(1);
  for (const step of steps) {
    const stepName = step.split("\n")[0].trim();
    if (/^ {4}typ:\s*werkzeug\b/m.test(step) && /^ {4}faehigkeiten:/m.test(step)) {
      findings.push(
        t(
          `Flow ${name}, step ${stepName}: a tool step calls no model, so it has no \`faehigkeiten\`. The device refuses the flow.`,
          `Flow ${name}, Schritt ${stepName}: ein Werkzeug-Schritt ruft kein Modell und hat deshalb keine \`faehigkeiten\`. Das Gerät weist den Flow ab.`
        )
      );
    }
    const stufe = step.match(/^ {6}stufe:\s*"?([a-z0-9_]+)"?/m);
    if (stufe && !declared.has(stufe[1])) {
      findings.push(
        t(
          `Flow ${name}, step ${stepName}: it names the stage "${stufe[1]}", and the header of the flow does not declare it under \`stufen\`.`,
          `Flow ${name}, Schritt ${stepName}: er nennt die Stufe „${stufe[1]}", und der Kopf des Flows führt sie nicht unter \`stufen\` auf.`
        )
      );
    }
  }
  return findings;
}

/** Der Satz, der dem Menschen sagt, dass die Felder geschrieben sind und nicht schon wirken. */
export function writtenNotPromised() {
  return t(
    "The kit has written the fields into the files. Whether the device already lets them take effect, its contract says (node .ara/tools/app.mjs --contract), not the kit.",
    "Das Kit hat die Felder in die Dateien geschrieben. Ob das Gerät sie schon wirken lässt, sagt sein Kontrakt (node .ara/tools/app.mjs --contract), nicht das Kit."
  );
}
