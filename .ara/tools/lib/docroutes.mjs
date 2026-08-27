/**
 * Die Routen, die im Wissen des Kits stehen, und wie man sie prüft.
 *
 * Das Kit schreibt keine Produktwerte ab, aber seine Verfahren **nennen** Wege:
 * ein Blatt, das keinen nennt, kann niemand gegen ein Gerät halten, und dann
 * merkt der Partner erst beim Kunden, dass es einen davon nicht mehr gibt.
 * Genannt wird also, und geprüft wird auch.
 *
 * Hier steht die Mechanik dazu und kein einziger Pfad des Produkts. Den einen,
 * den das Kit auswendig kennt, den Kontrakt, holt es aus `contract.mjs`; alles
 * andere kommt aus den Wissensdateien und aus der Antwort des Geräts.
 *
 * Reine Funktionen: kein Netz, keine Dateien. Der Selbsttest prüft sie mit
 * erfundenem Text und einem erfundenen Kontrakt.
 */

import { CONTRACT_PATH, findEndpoint } from "./contract.mjs";

/** Verben, die eine Route benennen. Alles andere ist Fließtext. */
const VERBS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

/**
 * Der Vorsatz der äußeren Schnittstelle, abgeleitet aus dem einen Pfad, den das
 * Kit kennt. Nicht abgeschrieben: ändert sich der Kontraktpfad, wandert er mit.
 */
export const EXTERNAL_PREFIX = CONTRACT_PATH.slice(0, CONTRACT_PATH.lastIndexOf("/"));

/** Ein Platzhalter, den ein Gerät sicher nicht kennt. Für Wege mit einem Wert darin. */
export const PROBE = "ara-kit-doku-probe";

/** Wege, die zwar mit einem Schrägstrich beginnen, aber keine Route sind. */
const NOT_A_ROUTE = /^\/(dev|etc|usr|var|opt|home|tmp|proc|arasul)\b/;

/** Schneidet Anführung, Klammern und Satzzeichen ab, die am Pfad kleben. */
function tidy(path) {
  return String(path).replace(/[`"'.,;:)\]]+$/, "");
}

/**
 * Ein Pfad in vergleichbarer Form: jeder Wert darin wird zu `:wert`.
 *
 * Das Wissen schreibt `<id>`, der Kontrakt schreibt `:id`, und gemeint ist
 * dasselbe. Verglichen wird über `findEndpoint`, und das erwartet die Form des
 * Kontrakts.
 */
export function normalize(path) {
  return tidy(path)
    .split("?")[0]
    .replace(/<[^>]+>/g, ":wert")
    .replace(/\/+$/, "");
}

/** Derselbe Pfad, aber aufrufbar: aus jedem Platzhalter wird ein Wert. */
export function callable(path) {
  return normalize(path)
    .split("/")
    .map((part) => (part.startsWith(":") ? PROBE : part))
    .join("/");
}

/** Trägt dieser Pfad einen Platzhalter, den das Kit nicht füllen kann? */
export function hasPlaceholder(path) {
  return normalize(path)
    .split("/")
    .some((part) => part.startsWith(":"));
}

/**
 * Jede Route, die in einem Text genannt wird.
 *
 * Gesucht wird nach `VERB /pfad`, in Codeblöcken wie im Fließtext: wer einen Weg
 * aufschreibt, behauptet ihn, und der Ort im Text ändert daran nichts. Dieselbe
 * Route in mehreren Dateien wird ein Eintrag mit mehreren Fundstellen.
 */
export function collectRoutes(files) {
  const found = new Map();
  const pattern = new RegExp(`\\b(${VERBS.join("|")})\\s+(/[A-Za-z0-9_/:<>?=&.-]+)`, "g");
  for (const { file, text } of files) {
    for (const match of String(text).matchAll(pattern)) {
      const verb = match[1];
      const path = tidy(match[2]);
      if (NOT_A_ROUTE.test(path)) continue;
      const key = `${verb} ${normalize(path)}`;
      if (!found.has(key)) found.set(key, { verb, path: normalize(path), files: [] });
      const entry = found.get(key);
      if (!entry.files.includes(file)) entry.files.push(file);
    }
  }
  return [...found.values()].sort((a, b) => `${a.path} ${a.verb}`.localeCompare(`${b.path} ${b.verb}`));
}

/**
 * Wege, die ohne Verb genannt werden.
 *
 * Sie sind der stille Fall: `/api/irgendwas` mitten im Satz sieht aus wie eine
 * Aussage, ist aber nicht prüfbar, weil niemand weiß, womit man dort anklopft.
 * Das Werkzeug nennt sie, damit sie ein Verb bekommen oder verschwinden.
 */
export function bareApiPaths(files) {
  const found = new Map();
  const pattern = /(^|[\s`("|])(\/(?:api|v1)\/[A-Za-z0-9_/:<>?=&.-]+)/g;
  for (const { file, text } of files) {
    for (const match of String(text).matchAll(pattern)) {
      // Der Treffer beginnt beim Zeichen VOR dem Pfad, nicht beim Pfad selbst.
      // Ohne diesen Versatz staende das Verb noch im Text davor und jede
      // ordentlich genannte Route liefe hier als Fund auf.
      const start = match.index + match[1].length;
      const before = String(text).slice(Math.max(0, start - 12), start);
      if (new RegExp(`(${VERBS.join("|")})\\s+$`).test(before)) continue;
      const path = normalize(match[2]);
      if (!found.has(path)) found.set(path, { path, files: [] });
      if (!found.get(path).files.includes(file)) found.get(path).files.push(file);
    }
  }
  return [...found.values()].sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Wie diese Route zu prüfen ist, und warum so.
 *
 * Drei Wege, und jeder ist eine ehrliche Aussage über das Gerät:
 *
 * - **gerufen**: eine lesende Route aus dem Kontrakt, ohne Platzhalter. Sie wird
 *   mit dem Kit-Schlüssel wirklich aufgerufen.
 * - **kontrakt**: eine Route, die etwas verändert, oder eine mit einem Wert
 *   darin. Sie wird **nicht** gerufen: eine Prüfung, die eine App entfernt, ist
 *   keine. Beleg ist, dass das Gerät sie in seinem Kontrakt selbst nennt, und
 *   der kommt live von diesem Gerät.
 * - **ohne-schluessel**: ein Weg der Oberfläche. Das Kit hat keine Sitzung, also
 *   klopft es ohne Ausweis an. Eine Abweisung ist der Beleg, dass es den Weg
 *   gibt; eine 404 der Beleg, dass es ihn nicht gibt. Verändern kann so ein
 *   Aufruf nichts, die Anmeldung kommt vor allem anderen.
 */
export function planFor(route, contract) {
  const entry = findEndpoint(contract, route.verb, route.path);
  if (entry) {
    if (route.verb === "GET" && !hasPlaceholder(route.path)) {
      return { kind: "kontrakt", how: "gerufen", entry, why: "steht im Kontrakt, wird mit dem Schlüssel gerufen" };
    }
    return {
      kind: "kontrakt",
      how: "kontrakt",
      entry,
      why: hasPlaceholder(route.path)
        ? "steht im Kontrakt, trägt einen Wert, den das Kit nicht kennt"
        : "steht im Kontrakt, verändert etwas und wird darum nicht gerufen",
    };
  }
  if (normalize(route.path).startsWith(`${EXTERNAL_PREFIX}/`)) {
    return {
      kind: "extern-unbekannt",
      how: "kontrakt",
      entry: null,
      why: "gehört zur äußeren Schnittstelle, das Gerät nennt ihn dort aber nicht",
    };
  }
  return {
    kind: "sitzung",
    how: "ohne-schluessel",
    entry: null,
    why: "ein Weg der Oberfläche, das Kit klopft ohne Ausweis an",
  };
}

/** Antworten, die belegen, dass es den Weg gibt. Sie sagen nichts über den Inhalt. */
const EXISTS = new Set([200, 201, 202, 204, 302, 400, 401, 403, 405, 409, 415, 422, 429]);

/** Antworten, die belegen, dass es den Weg nicht gibt. */
const ABSENT = new Set([404, 501]);

/**
 * Aus einem Plan und der Antwort des Geräts wird ein Urteil.
 *
 * Drei Werte, und „unklar" ist einer davon: ein Gerät, das gar nicht geantwortet
 * hat, ist kein Beleg für das eine und keiner für das andere.
 */
export function judgeRoute(plan, answer) {
  if (plan.how === "kontrakt") {
    return plan.entry
      ? { state: "ok", text: `Das Gerät nennt ${plan.entry.verb} ${plan.entry.pfad} in seinem Kontrakt.` }
      : {
          state: "fehlt",
          text: "Das Gerät nennt diesen Weg nicht in seinem Kontrakt. Das Kit würde ihn nicht aufrufen.",
        };
  }
  const status = answer?.status ?? 0;
  if (!status) {
    return { state: "unklar", text: `Keine Antwort: ${answer?.error?.message || "die Verbindung kam nicht zustande"}` };
  }
  if (ABSENT.has(status)) {
    return { state: "fehlt", text: `Das Gerät antwortet mit ${status}: diesen Weg gibt es dort nicht.` };
  }
  if (EXISTS.has(status)) {
    return {
      state: "ok",
      text:
        `Das Gerät antwortet mit ${status}` +
        (plan.how === "ohne-schluessel" && status < 400
          ? ". Der Weg ist da und antwortet ohne Ausweis, das gehört ins Gespräch."
          : ": den Weg gibt es."),
    };
  }
  return { state: "unklar", text: `Das Gerät antwortet mit ${status}, daraus folgt weder das eine noch das andere.` };
}

/**
 * Endpunkte, die das Gerät nennt und kein Verfahren beschreibt.
 *
 * Kein Fehler: das Wissen ist eine Anleitung und keine Liste. Aber es ist die
 * Antwort auf „was kann das Gerät noch", und die will man einmal gesehen haben.
 */
export function undocumented(contract, routes) {
  const known = new Set(routes.map((route) => `${route.verb} ${normalize(route.path)}`));
  // Der Kontrakt selbst zaehlt nicht dazu: er ist der eine Weg, den das Kit
  // auswendig kennt, und ein Verfahren, das ihn als Route auffuehrte, waere
  // genau die abgeschriebene Stelle, die es nicht geben soll.
  known.add(`GET ${CONTRACT_PATH}`);
  return (contract?.endpunkte || [])
    .filter((entry) => !known.has(`${String(entry.verb).toUpperCase()} ${normalize(entry.pfad)}`))
    .map((entry) => ({ verb: String(entry.verb).toUpperCase(), path: normalize(entry.pfad), was: entry.was || "" }));
}
