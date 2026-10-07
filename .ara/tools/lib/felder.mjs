/**
 * Die Felder, die eine App und ihre Flows seit Kontrakt 8 tragen können: `symbol`, `arten`, `ausloeser`,
 * `stufen`, `faehigkeiten` und der `aenderungstext` beim Ausrollen; dazu die erkannten Felder einer
 * Freigabe (`rollen[].ergebnis.felder`, `ergebnis.aenderbar`, `original` an einem erkennenden Schritt),
 * die Abschluss-Route (`abschluss`), und `routen` mit dem Werkzeug `route_aufrufen`. Ab welcher Fassung
 * ein Gerät welches Feld kennt, steht in `FELD_SEIT`.
 *
 * **Die Form steht im Kontrakt des Geräts, nicht hier.** `checkManifest` hält `app.json` gegen dessen
 * Schema, und was ein Flow-Kopf tragen darf, sagt `flow_frontmatter` im selben Kontrakt. Dieses Modul
 * schreibt die Felder beim Anlegen einer App in diese Form und prüft, was kein Schema trägt: einen
 * Werkzeug-Schritt ohne `faehigkeiten`, eine Stufe, die im Kopf steht, eine Deklaration, die zur
 * Erkennung passt, einen Pfad, wie der Kontrakt ihn verlangt, und ein Gerät, das ein Feld noch nicht kennt.
 *
 * **Die Felder sind geschrieben, nicht versprochen.** Ob das Gerät sie schon wirken lässt, sagt sein
 * Kontrakt (`--contract`, Abschnitt Regeln für einen Flow). Das Kit sagt es nie von sich aus.
 *
 * Reine Funktionen, ohne Netz und ohne Dateien.
 */

import { t } from "./i18n.mjs";

/**
 * Ab welcher Fassung des Kontrakts ein Gerät ein Feld kennt. Ein älteres weist den Flow oder das Paket ab,
 * deshalb hält `--check` das Feld dort an. Eine Tabelle für alle Felder, die nach Kontrakt 8 kamen.
 */
export const FELD_SEIT = Object.freeze({
  aenderbar: 10,
  original: 10,
  abschluss: 11,
  zeigt_freigaben: 12,
  routen: 13,
  route_aufrufen: 13,
});

/** Kennt ein Gerät mit dieser Kontraktzahl das Feld noch nicht? Ohne Zahl des Geräts wird nichts behauptet. */
export function geraetZuAlt(feld, deviceContract) {
  return Number.isFinite(deviceContract) && deviceContract < FELD_SEIT[feld];
}

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

export { parseSymbol } from "./symbole.mjs";

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
          `Die Stufe „${label}“ passt nicht: sie braucht mindestens einen Buchstaben.`
        ),
      };
    }
    if (stufen.some((s) => s.name === name)) {
      return { error: t(`The stage "${label}" stands twice.`, `Die Stufe „${label}“ steht zweimal.`) };
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
          `Die Art „${word}“ kennt das Kit nicht. Möglich: autonom (läuft von allein), \`ergebnis_bestaetigen\` (ein Mensch bestätigt das Ergebnis).`
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
            `Der Zeitplan „${rest}“ braucht fünf Felder wie bei cron, zum Beispiel „0 6 * * 1-5“. Ein Komma darin geht hier nicht, schreib die Tage als Bereich.`
          ),
        };
      }
      item = { typ: "zeitplan", zeitplan: rest };
    } else if (typ === "ereignis") {
      if (!/^[a-z][a-z0-9_.-]{0,59}$/.test(rest)) {
        return {
          error: t(
            `The event name "${rest}" does not fit: small letters, digits, dot, hyphen, underscore.`,
            `Der Name des Ereignisses „${rest}“ passt nicht: Kleinbuchstaben, Ziffern, Punkt, Bindestrich, Unterstrich.`
          ),
        };
      }
      item = { typ: "ereignis", ereignis: rest };
    } else {
      return {
        error: t(
          `The trigger "${entry}" is not known. Possible: hand, zeitplan:<five fields>, ereignis:<name>.`,
          `Den Auslöser „${entry}“ kennt das Kit nicht. Möglich: hand, zeitplan:<fünf Felder>, ereignis:<name>.`
        ),
      };
    }
    if (list.some((o) => JSON.stringify(o) === JSON.stringify(item))) {
      return { error: t(`The trigger "${entry}" stands twice.`, `Der Auslöser „${entry}“ steht zweimal.`) };
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
 * Schluessel, deshalb sucht das Kit das Wort und nicht `"aenderungstext"` in Anführungszeichen. Ein
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

/** Ein Name, wie der Kontrakt ihn für ein Feld einer Rolle verlangt: klein, Ziffern, `_`, höchstens 31 Zeichen. */
const FELD_NAME = /^[a-z][a-z0-9_]{0,30}$/;

/**
 * `--felder "Betrag,Datum"`: die Angaben, die die KI aus dem Dokument erkennt, als Namen des
 * Kontrakts. Höchstens zehn, keine doppelt. Ein Anzeigename wird zur Kennung.
 */
export function parseFelder(value) {
  const felder = [];
  for (const word of split(value)) {
    const name = slug(word);
    if (!FELD_NAME.test(name)) {
      return {
        error: t(
          `The field "${word}" does not fit: it needs a letter at the start, then letters, digits or underscores.`,
          `Das Feld „${word}“ passt nicht: es braucht vorn einen Buchstaben, dann Buchstaben, Ziffern oder Unterstriche.`
        ),
      };
    }
    if (felder.includes(name)) {
      return { error: t(`The field "${word}" stands twice.`, `Das Feld „${word}“ steht zweimal.`) };
    }
    felder.push(name);
  }
  if (!felder.length) return { error: t("At least one field is needed.", "Es braucht mindestens ein Feld.") };
  if (felder.length > 10) {
    return { error: t("At most ten fields fit into one reading.", "In eine Erkennung passen höchstens zehn Felder.") };
  }
  return { felder };
}

/**
 * `--aenderbar "Datum"`: welche der erkannten Felder ein Mensch in der Freigabe ändern darf. Nur
 * Namen aus `--felder`; ein Feld, das dort nicht steht, weist das Gerät beim Bestätigen mit 400 ab.
 * `keine` heißt: alle bleiben unveränderlich, ein Mensch bestätigt oder lehnt ab.
 */
export function parseAenderbar(value, felder) {
  if (/^\s*(keine?|none)\s*$/i.test(String(value ?? ""))) return { aenderbar: [] };
  const aenderbar = [];
  for (const word of split(value)) {
    const name = slug(word);
    if (!(felder ?? []).includes(name)) {
      return {
        error: t(
          `"${word}" is not among the recognised fields (${(felder ?? []).join(", ") || "none given"}). A person can only change a field the device reads out of the document.`,
          `„${word}“ steht nicht unter den erkannten Feldern (${(felder ?? []).join(", ") || "keine genannt"}). Ändern lässt sich nur ein Feld, das das Gerät aus dem Dokument liest.`
        ),
      };
    }
    if (!aenderbar.includes(name)) aenderbar.push(name);
  }
  return { aenderbar };
}

/**
 * Der Pfad des Originals, wie der Kontrakt ihn beschreibt: relativ zur Adresse der App, ohne `/` am
 * Anfang, ohne `..`, ohne Schema, ohne `%`, `?` und `#`, höchstens 500 Zeichen. Platzhalter wie
 * `{{vorgang}}` setzt das Gerät beim Lauf ein.
 */
export function originalProblem(path) {
  const value = String(path ?? "");
  if (!value.trim() || value.length > 500) {
    return t("The path of the original must be between 1 and 500 characters.", "Der Pfad des Originals muss 1 bis 500 Zeichen lang sein.");
  }
  if (value.startsWith("/") || /^[a-z][a-z0-9+.-]*:/i.test(value) || value.split("/").includes("..") || /[%?#]/.test(value)) {
    return t(
      `The path of the original "${value}" does not fit: relative to the app, without a slash at the start, without "..", without a scheme and without % ? #.`,
      `Der Pfad des Originals „${value}“ passt nicht: relativ zur App, ohne Schrägstrich am Anfang, ohne „..“, ohne Schema und ohne % ? #.`
    );
  }
  // Die Anzeige erkennt Bild und PDF am Ende des Pfades und nicht am Inhalt: ohne Endung steht dort
  // „Dieses Format kann hier nicht angezeigt werden“. Endet der Pfad auf einen Platzhalter, kann die
  // Endung im eingesetzten Wert stehen (`4711.pdf`), dann ist er nicht zu beurteilen.
  if (!value.endsWith("}}") && !ORIGINAL_ENDUNG.test(value)) {
    return t(
      `The path of the original "${value}" has no ending the approval can read: it shows an image or a PDF by the end of the path (.png, .jpg, .pdf). Without one it says that it cannot show the format.`,
      `Der Pfad des Originals „${value}“ hat keine Endung, die die Freigabe lesen kann: sie zeigt ein Bild oder ein PDF am Ende des Pfades (.png, .jpg, .pdf). Ohne sie steht dort, dass sie das Format nicht anzeigen kann.`
    );
  }
  if (/\.svg$/i.test(value)) {
    return t(
      `The path of the original "${value}" ends in .svg: the display shows it, but from contract 14 the image model reads the original itself and cannot read an SVG, so the run stops with "Original nicht lesbar". Deliver a PNG, JPEG or PDF (.png, .jpg, .pdf).`,
      `Der Pfad des Originals „${value}“ endet auf .svg: die Anzeige zeigt es, aber ab Kontrakt 14 liest das Bildmodell das Original selbst und kann kein SVG lesen, der Lauf hielte mit „Original nicht lesbar“. Liefere ein PNG, JPEG oder PDF (.png, .jpg, .pdf).`
    );
  }
  return null;
}

/** Die Endungen, an denen die Anzeige der Freigabe ein Bild oder ein PDF erkennt. */
const ORIGINAL_ENDUNG = /\.(png|jpe?g|gif|webp|avif|bmp|svg|pdf)$/i;

/** Der Pfad des Originals, den das Gerüst vorgibt: das Blatt, das das Backend zu einem Vorgang zeichnet (ein PNG: das Bildmodell liest kein SVG). */
export const ORIGINAL_STANDARD = "api/vorgaenge/{{vorgang}}/original.png";

/**
 * Die Erkennung in den Flow `freigabe` schreiben: eine Rolle `leser` mit den Feldern und ihrer
 * Deklaration, und ein Schritt `lesen` vor der Freigabe, der das Original nennt. Die Freigabe zeigt
 * dann Original links und Felder rechts, und `ergebnis.aenderbar` sagt, was ein Mensch ändern darf.
 */
export function applyRecognition(text, { felder, aenderbar = [], original = ORIGINAL_STANDARD } = {}) {
  if (!felder?.length) return text;
  const list = (names) => `[${names.join(", ")}]`;
  const rolle = [
    "rollen:",
    "  - name: leser",
    '    beschreibung: "Liest die Angaben aus dem Dokument des Vorgangs."',
    `    ergebnis: { felder: ${list(felder)}${aenderbar.length ? `, aenderbar: ${list(aenderbar)}` : ""} }`,
    `    prompt: ${quote(`Aufgabe: ein Dokument lesen und genau diese Angaben als JSON ausgeben: ${felder.join(", ")}. Eine Angabe, die nicht zu finden ist, bleibt leer. Unter "unsicher" stehen die Namen der Angaben, bei denen die Erkennung nicht sicher ist.`)}`,
    "",
  ].join("\n");
  const schritt = [
    "  - name: lesen",
    "    typ: subagent",
    "    rolle: leser",
    `    auftrag: ${quote("Lies das Dokument zum Vorgang {{vorgang}} und gib die Angaben als JSON aus.")}`,
    "    faehigkeiten: { text: true, bild: true }",
    `    original: ${quote(original)}`,
  ].join("\n");
  return text
    .replace(/^werkzeuge: \[freigabe_anfordern\]/m, /^ {4}werkzeug:\s*freigabe_anfordern/m.test(text) ? "werkzeuge: [subagent, freigabe_anfordern]" : "werkzeuge: [subagent]")
    .replace(/^schritte:\n/m, `${rolle}schritte:\n${schritt}\n`);
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
 * Ist die Freigabe der Erkennung die Prüfung des Flows? Seit Kontrakt 14 legt ein erkennender Schritt
 * in der Art `ergebnis_bestaetigen` sie immer an, mit den Feldern; dann braucht der Flow keinen
 * eigenen Schritt `entscheiden` in der ersten Stufe.
 */
export function erkennungIstPruefung({ felder, arten } = {}) {
  return Boolean(felder?.length) && Boolean(arten?.includes("ergebnis_bestaetigen"));
}

/** Der Text unter dem Kopf, wenn kein Schritt mehr fragt: die Prüfung ist die Freigabe der Erkennung. */
const KEIN_SCHRITT_TEXT = [
  "Über den Vorgang {{vorgang}} von {{von}} sind die erkannten Angaben bestätigt worden.",
  "Gesucht ist genau ein Satz darüber, was erkannt wurde und ob ein Mensch etwas geändert hat.",
  "Keine Anrede, keine Erfindungen, keine Empfehlung.",
].join("\n");

/**
 * Die Felder in die Datei des Flows `freigabe` schreiben. Die Vorlage hat einen Schritt
 * `entscheiden`: mit mehr als einer Stufe wird daraus ein Schritt je Stufe, der die Stufe in
 * `parameter.stufe` nennt, wie der Kontrakt es verlangt.
 */
export function applyFlowFields(text, { arten, ausloeser, stufen, felder } = {}) {
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

  // Liest der Flow ein Dokument und bestätigt ein Mensch sein Ergebnis (seit Kontrakt 14), legt das
  // Gerät die Freigabe der Erkennung immer an, mit den Feldern, in der ersten Stufe: sie ist die
  // Prüfung, und ein Schritt `entscheiden` danach gäbe zwei. Bei unsicherer Erkennung allein
  // (`autonom`) legt es sie nur dann an; dort bleibt der Schritt.
  const block = out.match(/^ {2}- name: entscheiden\n[\s\S]*?(?=^grenzen:)/m);
  if (block && (stufen?.length || erkennungIstPruefung({ felder, arten }))) {
    const liste = stufen?.length ? stufen : [null];
    const many = liste.length > 1;
    const eigene = erkennungIstPruefung({ felder, arten }) || (felder?.length && many) ? liste.slice(1) : liste;
    const steps = eigene.map((s) => {
      let step = s ? block[0].replace(/ {6}titel:/, `      stufe: ${s.name}\n      titel:`) : block[0];
      if (many) step = step.replace("- name: entscheiden", `- name: entscheiden_${s.name}`);
      return step;
    });
    out = out.replace(block[0], steps.join(""));
    if (!steps.length) {
      out = out.replace(/\n---\n[\s\S]*$/, `\n---\n\n${KEIN_SCHRITT_TEXT}\n`);
    } else if (many) {
      const nennt = eigene.length === 1 ? `„entscheiden_${eigene[0].name}“` : "„entscheiden_…“";
      out = out.replace("der Schritt „entscheiden“", eigene.length === 1 ? `der Schritt ${nennt}` : `die Schritte ${nennt}`);
    }
  }
  return out;
}

/** Der Teil des Flow-Kopfes unter einem Schlüssel der obersten Ebene, bis zum nächsten. */
function section(header, key) {
  const match = header.match(new RegExp(`^${key}:[^\\n]*\\n((?: {2,}.*\\n|\\n)*)`, "m"));
  return match ? match[0] : "";
}

/** Die Einträge `  - name: …` eines Abschnitts: je Eintrag sein Name und sein Text. */
function items(block) {
  return block
    .split(/^ {2}- name:/m)
    .slice(1)
    .map((body) => ({ name: body.split("\n")[0].trim().replace(/^"|"$/g, ""), body }));
}

/** Eine Liste hinter einem Schlüssel, in Klammern (`[a, b]`) oder als Zeilen (`- a`). `null`, wenn es den Schlüssel nicht gibt. */
function listAfter(body, key) {
  const inline = body.match(new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`));
  if (inline) return inline[1].split(",").map((x) => x.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
  const block = body.match(new RegExp(`^\\s*${key}:\\s*\\n((?:\\s+- .*\\n?)+)`, "m"));
  if (block) return [...block[1].matchAll(/-\s*"?([^"\n]+)"?/g)].map((m) => m[1].trim());
  return null;
}

/**
 * Was kein Schema trägt an der Erkennung (Kontrakt 10): ein änderbares Feld, das die Rolle nicht
 * liest, ein `original` an einem Schritt, der nichts erkennt oder dessen Pfad nicht passt, ein
 * Schritt mit einer Rolle, die es nicht gibt, und eine Deklaration, die niemand zeigen kann.
 */
function recognitionFindings(name, header) {
  const findings = [];
  const roles = items(section(header, "rollen"));
  const steps = items(section(header, "schritte"));
  for (const role of roles) {
    const felder = listAfter(role.body, "felder") ?? [];
    const aenderbar = listAfter(role.body, "aenderbar") ?? [];
    const fremd = aenderbar.filter((feld) => !felder.includes(feld));
    if (fremd.length) {
      findings.push(
        t(
          `Flow ${name}, role ${role.name}: \`aenderbar\` names ${fremd.join(", ")}, and the role does not read ${fremd.length === 1 ? "that field" : "those fields"} (\`felder\`: ${felder.join(", ") || "none"}). The device refuses a change to a field that is not declared.`,
          `Flow ${name}, Rolle ${role.name}: \`aenderbar\` nennt ${fremd.join(", ")}, und die Rolle liest ${fremd.length === 1 ? "dieses Feld" : "diese Felder"} nicht (\`felder\`: ${felder.join(", ") || "keine"}). Eine Änderung an einem Feld, das nicht deklariert ist, weist das Gerät ab.`
        )
      );
    }
    const gezeigt = steps.some(
      (step) => /^ {4}rolle:\s*"?([a-z0-9_]+)"?/m.exec(step.body)?.[1] === role.name && /bild:\s*true/.test(step.body)
    );
    if (aenderbar.length && !gezeigt) {
      findings.push(
        t(
          `Flow ${name}, role ${role.name}: it declares changeable fields, but no step with \`faehigkeiten.bild: true\` uses it. Only an approval that comes out of a reading shows fields, so nobody could change them.`,
          `Flow ${name}, Rolle ${role.name}: sie erklärt Felder für änderbar, aber kein Schritt mit \`faehigkeiten.bild: true\` benutzt sie. Nur eine Freigabe aus einer Erkennung zeigt Felder, also könnte niemand sie ändern.`
        )
      );
    }
  }
  for (const step of steps) {
    const rolle = /^ {4}rolle:\s*"?([a-z0-9_]+)"?/m.exec(step.body)?.[1];
    if (rolle && roles.length && !roles.some((r) => r.name === rolle)) {
      findings.push(
        t(
          `Flow ${name}, step ${step.name}: it names the role "${rolle}", and the header of the flow does not declare it under \`rollen\`.`,
          `Flow ${name}, Schritt ${step.name}: er nennt die Rolle „${rolle}“, und der Kopf des Flows führt sie nicht unter \`rollen\` auf.`
        )
      );
    }
    const original = /^ {4}original:\s*(.+)$/m.exec(step.body)?.[1]?.trim().replace(/^["']|["']$/g, "");
    if (original === undefined) continue;
    if (!/^ {4}typ:\s*subagent\b/m.test(step.body) || !/bild:\s*true/.test(step.body)) {
      findings.push(
        t(
          `Flow ${name}, step ${step.name}: \`original\` belongs to a step that reads (\`typ: subagent\` with \`faehigkeiten.bild: true\`). The device refuses the flow otherwise.`,
          `Flow ${name}, Schritt ${step.name}: \`original\` gehört an einen Schritt, der liest (\`typ: subagent\` mit \`faehigkeiten.bild: true\`). Sonst weist das Gerät den Flow ab.`
        )
      );
    }
    const problem = originalProblem(original);
    if (problem) findings.push(`Flow ${name}, ${step.name}: ${problem}`);
  }
  return findings;
}

/**
 * Nennt ein Flow `aenderbar` oder `original`, braucht er ein Gerät mit Kontrakt 10: ein älteres
 * kennt beide Schlüssel nicht und weist den Flow ab. Gefragt wird die Zahl, die das Gerät nennt.
 */
export function contractTenFindings(name, text, deviceContract) {
  if (!geraetZuAlt("aenderbar", deviceContract)) return [];
  const header = text.split(/^---\s*$/m)[1] ?? text;
  const nennt = [/\baenderbar:/.test(header) && "ergebnis.aenderbar", /^ {4}original:/m.test(header) && "original"].filter(Boolean);
  if (!nennt.length) return [];
  return [
    t(
      `Flow ${name} names ${nennt.join(" and ")}, and this device carries contract ${deviceContract}: the fields came with contract ${FELD_SEIT.aenderbar}, an older device refuses the flow.`,
      `Flow ${name} nennt ${nennt.join(" und ")}, und dieses Gerät trägt Kontrakt ${deviceContract}: die Felder kamen mit Kontrakt ${FELD_SEIT.aenderbar}, ein älteres Gerät weist den Flow ab.`
    ),
  ];
}

/** Der Anfang jeder Abschluss-Route, die das Gerüst schreibt: je Flow eine, `/abschluss/<flow>`. */
const ABSCHLUSS_VORSATZ = "/abschluss/";

/** Der Pfad, den das Backend der Vorlage für den Abschluss des Flows `freigabe` anbietet. */
export const ABSCHLUSS_STANDARD = `${ABSCHLUSS_VORSATZ}freigabe`;

/**
 * Was ein Flow ist, der ein Ergebnis liefert, und deshalb eine Abschluss-Route bekommt: einer, der
 * ein Dokument liest (`--felder`), oder einer, dessen Ergebnis ein Mensch bestätigt
 * (`ergebnis_bestaetigen`). Ein Flow, der nur eine Entscheidung festhält, braucht keine.
 */
export function liefertErgebnis({ felder, arten } = {}) {
  return Boolean(felder?.length) || Boolean(arten?.includes("ergebnis_bestaetigen"));
}

/**
 * Die Abschluss-Route in den Kopf des Flows schreiben, vor `werkzeuge:`. Ohne Route bleibt der Text, wie
 * er ist: ein Flow ohne `abschluss` wird fertig wie bisher.
 */
export function applyAbschluss(text, { route } = {}) {
  if (!route) return text;
  return text.replace(/^werkzeuge:/m, `abschluss: { route: ${quote(route)} }\nwerkzeuge:`);
}

/** Die Route, die der Kopf eines Flows nennt, oder `null`. Beide Schreibweisen: in Klammern und als Zeilen. */
export function abschlussRoute(header) {
  const m = /^abschluss:\s*(?:\{[^}\n]*\broute:\s*|\n\s+route:\s*)(?:"([^"\n]*)"|'([^'\n]*)'|([^\s,}]+))/m.exec(header);
  return m ? (m[1] ?? m[2] ?? m[3]) : null;
}

/**
 * Was der Kontrakt an einem Pfad des Backends verlangt, wie die App ihn sieht: führender `/`, Buchstaben,
 * Ziffern und `. _ ~ - /`, ohne Host, Schema, Abfrage, `..` und `//`. Mit `platzhalter` gilt dazu `{name}`
 * für ein Wegstück, wie bei `routen`. Der Grund, warum der Pfad nicht gilt, oder `null`.
 */
export function pfadProblem(wert, { platzhalter = false } = {}) {
  const pfad = String(wert ?? "");
  if (!pfad) return t("the path is missing", "der Pfad fehlt");
  if (!pfad.startsWith("/")) return t("it has to start with `/`", "der Pfad muss mit `/` beginnen");
  if (/[^A-Za-z0-9._~\-/]/.test(platzhalter ? pfad.replace(/\{[A-Za-z0-9_]+\}/g, "") : pfad)) {
    return platzhalter
      ? t("only letters, digits, `. _ ~ - /` and `{name}` for one segment are allowed (no host, scheme or query)", "erlaubt sind nur Buchstaben, Ziffern, `. _ ~ - /` und `{name}` für ein Wegstück (ohne Host, Schema und Abfrage)")
      : t("only letters, digits and `. _ ~ - /` are allowed (no host, scheme or query)", "erlaubt sind nur Buchstaben, Ziffern und `. _ ~ - /` (ohne Host, Schema und Abfrage)");
  }
  if (pfad.includes("//") || pfad.split("/").includes("..")) return t("`//` and `..` are not allowed", "`//` und `..` sind nicht erlaubt");
  return null;
}

/** Was der Kontrakt an der Abschluss-Route verlangt, als Satz: `pfadProblem` ohne Platzhalter. `null`, wenn sie gilt. */
export function abschlussProblem(route) {
  const wert = String(route ?? "");
  if (!wert) return t("The route of the closing is empty.", "Die Abschluss-Route ist leer.");
  const grund = pfadProblem(wert);
  return grund ? t(`The route of the closing "${wert}" is not valid: ${grund}.`, `Die Abschluss-Route „${wert}“ gilt nicht: ${grund}.`) : null;
}

/**
 * Was kein Schema trägt am Abschluss (Kontrakt 11). `backend` sagt, ob die App eines hat, `imQuelltext`
 * (Route zu wahr/falsch), ob der Quelltext des Backends den Pfad nennt, `deviceContract` die Zahl des
 * Geräts. Ohne Backend weist das Gerät das Paket ab; ohne Route im Quelltext käme die Antwort 404 und der
 * Lauf bliebe auf „nicht übergeben“.
 */
export function abschlussFindings(name, text, { backend = true, imQuelltext = () => true, deviceContract } = {}) {
  const header = text.split(/^---\s*$/m)[1] ?? text;
  const route = abschlussRoute(header);
  if (route === null) return [];
  const findings = [];
  const problem = abschlussProblem(route);
  if (problem) findings.push(`Flow ${name}: ${problem}`);
  if (!backend) {
    findings.push(
      t(
        `Flow ${name} hands its result to the route ${route}, and the app has no \`backend\`. A route needs a backend of the app, and the device refuses the package.`,
        `Flow ${name} übergibt sein Ergebnis an die Route ${route}, und die App hat kein \`backend\`. Eine Route braucht ein Backend der App, und das Gerät weist das Paket ab.`
      )
    );
  } else if (!problem && !imQuelltext(route)) {
    findings.push(
      t(
        `Flow ${name} hands its result to the route ${route}, and no file of the backend names it. The device would call it, get 404, and the run would stay on "not handed over".`,
        `Flow ${name} übergibt sein Ergebnis an die Route ${route}, und keine Datei des Backends nennt sie. Das Gerät riefe sie, bekäme 404, und der Lauf bliebe auf „nicht übergeben“.`
      )
    );
  }
  if (geraetZuAlt("abschluss", deviceContract)) {
    findings.push(
      t(
        `Flow ${name} names \`abschluss\`, and this device carries contract ${deviceContract}: the closing came with contract ${FELD_SEIT.abschluss}, an older device refuses the flow.`,
        `Flow ${name} nennt \`abschluss\`, und dieses Gerät trägt Kontrakt ${deviceContract}: der Abschluss kam mit Kontrakt ${FELD_SEIT.abschluss}, ein älteres Gerät weist den Flow ab.`
      )
    );
  }
  return findings;
}

/** Teilt den Inhalt einer Klammer (`a, {b, c}, "d,e"`) an den Kommas der obersten Ebene. */
function teileFlussform(inhalt) {
  const teile = [];
  let tiefe = 0;
  let zitat = null;
  let anfang = 0;
  for (let i = 0; i < inhalt.length; i += 1) {
    const c = inhalt[i];
    if (zitat) {
      if (c === zitat) zitat = null;
    } else if (c === '"' || c === "'") zitat = c;
    else if (c === "{" || c === "[") tiefe += 1;
    else if (c === "}" || c === "]") tiefe -= 1;
    else if (c === "," && tiefe === 0) {
      teile.push(inhalt.slice(anfang, i));
      anfang = i + 1;
    }
  }
  teile.push(inhalt.slice(anfang));
  return teile.map((teil) => teil.trim()).filter(Boolean);
}

/** Ein Eintrag in Klammerform (`{ methode: GET, pfad: "/a" }`) als Zeilen `feld: wert`. */
function flussZeilen(eintrag) {
  const inhalt = eintrag.trim().replace(/^\{/, "").replace(/\}$/, "");
  return teileFlussform(inhalt);
}

/**
 * Die Einträge von `routen` im Kopf eines Flows: je Eintrag `methode`, `pfad`, `app`, `zweck` (fehlende als
 * `undefined`). Beide Schreibweisen wie bei `listAfter`: als Zeilen (`- methode: GET`, auch `- { … }`) und in
 * Klammern (`routen: [{ … }, { … }]`).
 */
export function routenEintraege(header) {
  const wert = (zeile, feld) => {
    const m = new RegExp(`^\\s*(?:-\\s+)?${feld}:\\s*(?:"([^"\\n]*)"|'([^'\\n]*)'|([^\\s#][^\\n#]*?))\\s*$`).exec(zeile);
    return m ? (m[1] ?? m[2] ?? m[3]) : undefined;
  };
  const eintrag = (zeilen) => {
    const aus = (feld) => zeilen.map((z) => wert(z, feld)).find((v) => v !== undefined);
    return { methode: aus("methode"), pfad: aus("pfad"), app: aus("app"), zweck: aus("zweck") };
  };
  const inline = /^routen:[ \t]*\[(.*)\][ \t]*$/m.exec(header);
  if (inline) return teileFlussform(inline[1]).map((teil) => eintrag(flussZeilen(teil)));
  const block = /^routen:[ \t]*\n((?: {2,}.*\n|[ \t]*\n)*)/m.exec(`${header}\n`);
  if (!block) return null;
  return block[1]
    .split(/^ {2,}- /m)
    .slice(1)
    .map((teil) => (teil.trimStart().startsWith("{") ? eintrag(flussZeilen(teil.trim())) : eintrag(`- ${teil}`.split("\n"))));
}

/** Ruft der Flow das Werkzeug `route_aufrufen`, als Schritt oder in der Liste `werkzeuge` (in Klammern oder als Zeilen)? */
function nenntRouteAufrufen(header) {
  return (listAfter(section(`${header}\n`, "werkzeuge"), "werkzeuge") ?? []).includes("route_aufrufen") || /^ {4}werkzeug:\s*["']?route_aufrufen\b/m.test(header);
}

/**
 * Was kein Schema trägt an `routen` und `route_aufrufen` (Kontrakt 13). Das Gerät prüft Methode und Pfad
 * beim Aufruf; hier steht, was sich vorher sagen lässt: Feld und Werkzeug gehören zusammen, höchstens
 * 20 Einträge, keiner doppelt, der Pfad wie bei der Abschluss-Route (dazu `{name}` für ein Wegstück),
 * eine eigene Route braucht ein Backend, und ein Gerät vor Kontrakt 13 weist den Flow ab.
 */
export function contractThirteenFindings(name, text, { backend = true, deviceContract } = {}) {
  const header = text.split(/^---\s*$/m)[1] ?? text;
  const eintraege = routenEintraege(header);
  const werkzeug = nenntRouteAufrufen(header);
  if (!eintraege && !werkzeug) return [];
  const findings = [];
  if (eintraege && !werkzeug) {
    findings.push(
      t(
        `Flow ${name} names \`routen\` and no step calls the tool \`route_aufrufen\`: the field is only valid with the tool, and the device refuses the flow.`,
        `Flow ${name} nennt \`routen\`, und kein Schritt ruft das Werkzeug \`route_aufrufen\`: das Feld gilt nur mit dem Werkzeug, und das Gerät weist den Flow ab.`
      )
    );
  }
  if (werkzeug && !eintraege?.length) {
    findings.push(
      t(
        `Flow ${name} uses the tool \`route_aufrufen\` and names no \`routen\`: the tool only calls what the header lists, and the device refuses the flow.`,
        `Flow ${name} nutzt das Werkzeug \`route_aufrufen\` und nennt keine \`routen\`: das Werkzeug ruft nur, was der Kopf aufführt, und das Gerät weist den Flow ab.`
      )
    );
  }
  const gesehen = new Set();
  for (const { methode, pfad, app } of eintraege ?? []) {
    if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(methode)) {
      findings.push(
        t(
          `Flow ${name}, route ${pfad ?? "?"}: the method "${methode ?? ""}" is not valid. Possible: GET, POST, PUT, PATCH, DELETE.`,
          `Flow ${name}, Route ${pfad ?? "?"}: die Methode „${methode ?? ""}“ gilt nicht. Möglich: GET, POST, PUT, PATCH, DELETE.`
        )
      );
    }
    const wert = pfad ?? "";
    const grund = pfadProblem(wert, { platzhalter: true });
    if (grund) findings.push(t(`Flow ${name}, route "${wert}": ${grund}.`, `Flow ${name}, Route „${wert}“: ${grund}.`));
    const schluessel = `${app ?? ""} ${methode} ${wert}`;
    if (gesehen.has(schluessel)) {
      findings.push(t(`Flow ${name}: the route ${methode} ${wert} stands twice in \`routen\`.`, `Flow ${name}: die Route ${methode} ${wert} steht zweimal unter \`routen\`.`));
    }
    gesehen.add(schluessel);
    if (!app && !backend) {
      findings.push(
        t(
          `Flow ${name} calls the route ${methode} ${wert} of its own app, and the app has no \`backend\`. The device refuses the package.`,
          `Flow ${name} ruft die Route ${methode} ${wert} der eigenen App, und die App hat kein \`backend\`. Das Gerät weist das Paket ab.`
        )
      );
    }
  }
  if ((eintraege?.length ?? 0) > 20) {
    findings.push(t(`Flow ${name} names ${eintraege.length} \`routen\`, at most 20 fit.`, `Flow ${name} nennt ${eintraege.length} \`routen\`, es passen höchstens 20.`));
  }
  if (geraetZuAlt("routen", deviceContract)) {
    findings.push(
      t(
        `Flow ${name} names \`routen\` or the tool \`route_aufrufen\`, and this device carries contract ${deviceContract}: both came with contract ${FELD_SEIT.routen}, an older device refuses the flow.`,
        `Flow ${name} nennt \`routen\` oder das Werkzeug \`route_aufrufen\`, und dieses Gerät trägt Kontrakt ${deviceContract}: beides kam mit Kontrakt ${FELD_SEIT.routen}, ein älteres Gerät weist den Flow ab.`
      )
    );
  }
  return findings;
}

/**
 * Die Form, die ein Flow-Name haben muss, aus dem Kontrakt: `flow_frontmatter.schema.properties.name.pattern`.
 * Der Dateiname IST der Name (Regel des Kontrakts), also gilt die Form auch für ihn. `null`, wenn das Gerät
 * keine nennt oder sie sich nicht lesen lässt: dann sagt das Kit nichts, statt eine Form zu raten.
 */
export function flowNamePattern(contract) {
  const pattern = contract?.flow_frontmatter?.schema?.properties?.name?.pattern;
  if (typeof pattern !== "string") return null;
  try {
    return new RegExp(pattern);
  } catch {
    return null;
  }
}

/** Ein Dateiname, der der Form näher kommt: klein, ohne Umlaut, `-` statt allem Anderen. */
function flowNameSuggestion(name, regex) {
  const suggestion = name
    .replace(/[äöüßÄÖÜ]/g, (c) => UMLAUTE[c])
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return regex.test(suggestion) ? suggestion : null;
}

/**
 * Weist das Gerät den Namen der Flow-Datei ab? `name` ist der Dateiname ohne `.md`. Der Satz sagt, wie er
 * richtig heißt, wenn sich das aus der Form des Kontrakts ableiten lässt.
 */
export function flowNameFindings(name, contract) {
  const regex = flowNamePattern(contract);
  if (!regex || regex.test(name)) return [];
  const right = flowNameSuggestion(name, regex);
  return [
    t(
      `The flow file \`${name}.md\` has a name the device refuses: the file name is the name of the flow.` +
        (right ? ` Rename the file to \`${right}.md\`, and a \`name:\` in its header with it.` : "") +
        ` The form the contract allows: ${regex.source}`,
      `Die Flow-Datei \`${name}.md\` hat einen Namen, den das Gerät abweist: der Dateiname ist der Name des Flows.` +
        (right ? ` Nenne die Datei \`${right}.md\`, und ein \`name:\` in ihrem Kopf gleich mit.` : "") +
        ` Die Form, die der Kontrakt erlaubt: ${regex.source}`
    ),
  ];
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
  findings.push(...recognitionFindings(name, header));
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
          `Flow ${name}, Schritt ${stepName}: er nennt die Stufe „${stufe[1]}“, und der Kopf des Flows führt sie nicht unter \`stufen\` auf.`
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
