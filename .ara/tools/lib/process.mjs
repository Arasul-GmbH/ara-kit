/**
 * Das Prozessblatt: der Ablauf eines Hauses, bevor eine App daraus wird.
 *
 * Eine Markdown-Datei mit festen Abschnitten und zwei Tabellen. Dieses Modul liest sie, prueft, ob
 * sie vollstaendig ist, und leitet daraus die Angaben ab, die `app.mjs --new` braucht. Es fragt
 * nichts und schreibt nichts: das Gespraech fuehrt `/process`, den Bau `/app`.
 *
 * **Das Blatt steht in der Sprache des Hauses.** Die Ueberschriften gibt es englisch und deutsch,
 * gelesen werden beide, damit ein Blatt nach einem Wechsel der Sprache im Profil nicht unlesbar
 * wird. Reine Funktionen, bis auf `sheetPath` und `findSheet`.
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { BUSINESS, customerPath, readFrontmatter } from "./kit.mjs";
import { t } from "./i18n.mjs";
import { parseAenderbar, parseAusloeser, parseFelder, parseStufen } from "./felder.mjs";
import { validName } from "./appfile.mjs";

/** Abschnitt zu Kennung, mit den Ueberschriften beider Sprachen. */
const SECTIONS = Object.freeze({
  aim: ["Aim", "Ziel"],
  trigger: ["Trigger", "Auslöser"],
  steps: ["Steps", "Schritte"],
  papers: ["Papers", "Papiere"],
  decisions: ["Decisions", "Entscheidungen"],
  exceptions: ["Exceptions", "Ausnahmen"],
  visibility: ["Who sees what", "Wer sieht was"],
  excluded: ["Not part of it", "Gehört nicht dazu"],
  open: ["Open", "Offen"],
});

/** Spalten der beiden Tabellen: Kennung zu den Kopfzeilen beider Sprachen. */
const COLUMNS = Object.freeze({
  steps: { no: ["No", "Nr"], who: ["Who", "Wer"], does: ["Does what", "Tut was"], paper: ["With which paper", "Mit welchem Papier"], when: ["When", "Wann"] },
  papers: {
    paper: ["Paper", "Papier"],
    contents: ["What stands on it", "Was darauf steht"],
    read: ["Fields to read", "Zu lesende Felder"],
    changeable: ["May be corrected", "Änderbar"],
    personal: ["Personal data", "Personenbezogen"],
    lies: ["Lies today", "Liegt heute"],
  },
  decisions: { after: ["After step", "Nach Schritt"], stage: ["Stage", "Stufe"], who: ["Who decides", "Wer entscheidet"], basis: ["Based on what", "Worauf es sich stützt"], no: ["If no", "Bei Nein"] },
});

/** Die Schluessel der Zeilen im Abschnitt Ausloeser. */
const TRIGGER_KEYS = Object.freeze({
  what: ["What sets it off", "Was es anstößt"],
  often: ["How often", "Wie oft"],
  who: ["Who starts it", "Wer es anstößt"],
  kit: ["Starts by", "Startet durch"],
});

const lower = (s) => String(s).trim().toLowerCase();
const is = (names, text) => names.some((n) => lower(n) === lower(text));

/** Eine Zelle ohne Inhalt: leer oder ein Strich. "nein" ist hier eine Antwort, kein Nichts. */
export const isNothing = (cell) => /^\s*(?:-+|\u2013|\u2014|n\/a)?\s*$/i.test(String(cell ?? ""));

/** Eine Zelle, die "keine" sagt, wo eine Liste steht (zu lesende, aenderbare Felder). */
export const isNone = (cell) => isNothing(cell) || /^\s*(?:none|no|keine?r?s?|nein)\s*$/i.test(String(cell));

/** Ein Platzhalter der Vorlage, der stehen geblieben ist. */
const PLACEHOLDER = /<[^<>\n]{2,}>/;

/** Wo Blaetter liegen: im Kundenordner, sonst im Ordner des Hauses. */
export function sheetDir(customer = null) {
  return customer ? join(customerPath(customer), "processes") : join(BUSINESS, "processes");
}

/** Pfad eines Blattes. Prueft nicht, ob es existiert. */
export function sheetPath(name, customer = null) {
  return join(sheetDir(customer), `${name}.md`);
}

/** Alle Blaetter an einem Ort, nach Kennung. */
export function listSheets(customer = null) {
  const dir = sheetDir(customer);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && /^[a-z0-9][a-z0-9-]*\.md$/.test(e.name))
    .map((e) => e.name.replace(/\.md$/, ""))
    .sort();
}

/** Die Zeilen einer Markdown-Tabelle als Zellenlisten, ohne Kopf und Trennzeile. */
function tableRows(lines) {
  const rows = lines
    .filter((l) => l.trim().startsWith("|"))
    .map((l) =>
      l
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim())
    );
  const head = rows[0] ?? [];
  const body = rows.slice(1).filter((r) => !r.every((c) => /^:?-{2,}:?$/.test(c)));
  return { head, body };
}

/** Eine Tabelle als Liste von Objekten nach den Kennungen von `columns`. */
function tableObjects(lines, columns) {
  const { head, body } = tableRows(lines);
  const index = {};
  for (const [key, names] of Object.entries(columns)) {
    const at = head.findIndex((h) => is(names, h));
    if (at >= 0) index[key] = at;
  }
  const missing = Object.keys(columns).filter((k) => !(k in index));
  const rows = body.map((cells) => Object.fromEntries(Object.keys(index).map((k) => [k, cells[index[k]] ?? ""])));
  return { rows, missing, head };
}

/** Zerlegt ein Blatt in Frontmatter, Titel und Abschnitte (Zeilen ohne Zitat- und Leerzeilen am Rand). */
export function parseSheet(path) {
  const { fields, body, exists } = readFrontmatter(path);
  const sections = {};
  const unknown = [];
  let key = null;
  let title = "";
  for (const raw of body.split(/\r?\n/)) {
    const h1 = raw.match(/^#\s+(.+?)\s*$/);
    if (h1 && !title) {
      title = h1[1];
      continue;
    }
    const h2 = raw.match(/^##\s+(.+?)\s*$/);
    if (h2) {
      key = Object.keys(SECTIONS).find((k) => is(SECTIONS[k], h2[1])) ?? null;
      if (key) sections[key] ??= [];
      else unknown.push(h2[1]);
      continue;
    }
    if (key && !raw.trim().startsWith(">")) sections[key].push(raw);
  }
  const text = (k) => (sections[k] ?? []).filter((l) => l.trim()).join("\n");
  const bullets = (k) =>
    (sections[k] ?? [])
      .map((l) => l.match(/^\s*[-*]\s+(.*\S)\s*$/))
      .filter(Boolean)
      .map((m) => m[1]);
  const trigger = {};
  for (const line of bullets("trigger")) {
    const pair = line.match(/^([^:]+):\s*(.*)$/);
    if (!pair) continue;
    const k = Object.keys(TRIGGER_KEYS).find((x) => is(TRIGGER_KEYS[x], pair[1]));
    if (k) trigger[k] = pair[2].trim();
  }
  return {
    exists,
    fields,
    title: title || fields.title || "",
    sections,
    unknown,
    text,
    trigger,
    steps: tableObjects(sections.steps ?? [], COLUMNS.steps),
    papers: tableObjects(sections.papers ?? [], COLUMNS.papers),
    decisions: tableObjects(sections.decisions ?? [], COLUMNS.decisions),
    exceptions: bullets("exceptions"),
    open: bullets("open"),
  };
}

const names = (key) => `"${t(SECTIONS[key][0], SECTIONS[key][1])}"`;

/**
 * Prueft, ob das Blatt vollstaendig ist. Ein Befund hat `level`: `error` stoppt (daraus laesst sich
 * keine App ableiten), `hint` sagt nur etwas. Jeder Satz sagt, was fehlt und wo.
 */
export function checkSheet(sheet) {
  const out = [];
  const err = (en, de) => out.push({ level: "error", message: t(en, de) });
  const hint = (en, de) => out.push({ level: "hint", message: t(en, de) });
  if (!sheet.exists) return [{ level: "error", message: t("The sheet does not exist.", "Das Blatt gibt es nicht.") }];

  if (!validName(sheet.fields.process)) {
    err(
      'The head needs "process:" with an id of lower case letters, digits and hyphens.',
      'Im Kopf fehlt „process:“ mit einer Kennung aus Kleinbuchstaben, Ziffern und Bindestrichen.'
    );
  }
  if (!sheet.title || PLACEHOLDER.test(sheet.title)) err("The sheet has no title.", "Das Blatt hat keinen Titel.");

  for (const key of Object.keys(SECTIONS)) {
    if (key === "open") continue;
    if (!(key in sheet.sections)) {
      err(`The section ${names(key)} is missing.`, `Der Abschnitt ${names(key)} fehlt.`);
    }
  }
  for (const key of Object.keys(SECTIONS)) {
    const body = (sheet.sections[key] ?? []).join("\n");
    if (PLACEHOLDER.test(body)) {
      err(
        `In ${names(key)} a placeholder is still there: ${body.match(PLACEHOLDER)[0]}. Say what the house really does, or move it to Open.`,
        `In ${names(key)} steht noch ein Platzhalter: ${body.match(PLACEHOLDER)[0]}. Sag, was das Haus wirklich tut, oder schieb es nach Offen.`
      );
    }
  }
  for (const key of ["aim", "visibility", "excluded"]) {
    if (key in sheet.sections && !sheet.text(key)) {
      err(`The section ${names(key)} is empty.`, `Der Abschnitt ${names(key)} ist leer.`);
    }
  }
  if ("exceptions" in sheet.sections && !sheet.exceptions.length && !sheet.text("exceptions")) {
    err(`The section ${names("exceptions")} is empty. "None known" is an answer, then write it.`, `Der Abschnitt ${names("exceptions")} ist leer. „Keine bekannt“ ist eine Antwort, dann schreib sie hin.`);
  }

  // Auslöser
  for (const k of ["what", "often", "who"]) {
    if ("trigger" in sheet.sections && !sheet.trigger[k]) {
      err(`The trigger lacks the line "${TRIGGER_KEYS[k][0]}".`, `Beim Auslöser fehlt die Zeile „${TRIGGER_KEYS[k][1]}“.`);
    }
  }
  if (sheet.trigger.kit) {
    const parsed = parseAusloeser(sheet.trigger.kit);
    if (parsed.error) out.push({ level: "error", message: parsed.error });
  }

  // Schritte
  const steps = sheet.steps;
  if ("steps" in sheet.sections) {
    if (steps.missing.length) {
      err(`The table of steps lacks columns: ${steps.missing.join(", ")}.`, `Der Tabelle der Schritte fehlen Spalten: ${steps.missing.join(", ")}.`);
    } else if (steps.rows.length < 2) {
      err("A process has at least two steps, otherwise nobody hands anything on.", "Ein Ablauf hat mindestens zwei Schritte, sonst gibt niemand etwas weiter.");
    }
    steps.rows.forEach((row, i) => {
      if (Number(row.no) !== i + 1) err(`Step ${i + 1} is numbered "${row.no}". Number them 1, 2, 3 without gaps.`, `Schritt ${i + 1} trägt die Nummer „${row.no}“. Nummeriere 1, 2, 3 ohne Lücke.`);
      for (const k of ["who", "does", "when"]) {
        if (isNothing(row[k])) err(`Step ${i + 1} has no "${COLUMNS.steps[k][0]}".`, `Schritt ${i + 1} hat kein „${COLUMNS.steps[k][1]}“.`);
      }
    });
  }

  // Papiere
  const papers = sheet.papers;
  const paperNames = new Set(papers.rows.map((r) => lower(r.paper)));
  if ("papers" in sheet.sections) {
    if (papers.missing.length) {
      err(`The table of papers lacks columns: ${papers.missing.join(", ")}.`, `Der Tabelle der Papiere fehlen Spalten: ${papers.missing.join(", ")}.`);
    }
    for (const row of papers.rows) {
      if (isNothing(row.paper)) {
        err("A row of the papers has no name.", "Eine Zeile der Papiere hat keinen Namen.");
        continue;
      }
      if (isNothing(row.personal)) {
        err(`The paper "${row.paper}": say whether personal data stands on it, yes or no.`, `Das Papier „${row.paper}“: sag, ob personenbezogene Daten darauf stehen, ja oder nein.`);
      }
      if (!isNone(row.read)) {
        const felder = parseFelder(row.read);
        if (felder.error) out.push({ level: "error", message: `${row.paper}: ${felder.error}` });
        else if (!isNone(row.changeable)) {
          const änderbar = parseAenderbar(row.changeable, felder.felder);
          if (änderbar.error) out.push({ level: "error", message: `${row.paper}: ${änderbar.error}` });
        }
      }
    }
    // Jedes Papier, das ein Schritt nennt, steht in der Tabelle.
    for (const [i, row] of steps.rows.entries()) {
      if (isNothing(row.paper)) continue;
      for (const p of row.paper.split(",").map((x) => x.trim()).filter(Boolean)) {
        if (!paperNames.has(lower(p))) {
          err(`Step ${i + 1} names the paper "${p}", which is not in the table of papers.`, `Schritt ${i + 1} nennt das Papier „${p}“, das nicht in der Tabelle der Papiere steht.`);
        }
      }
    }
  }

  // Entscheidungen
  const decisions = sheet.decisions;
  if ("decisions" in sheet.sections) {
    if (decisions.rows.length === 0 && !decisions.missing.length && decisions.head.length === 0 && !sheet.text("decisions")) {
      err(`The section ${names("decisions")} is empty. If nobody decides, write that sentence.`, `Der Abschnitt ${names("decisions")} ist leer. Entscheidet niemand, schreib diesen Satz hin.`);
    }
    if (decisions.head.length && decisions.missing.length) {
      err(`The table of decisions lacks columns: ${decisions.missing.join(", ")}.`, `Der Tabelle der Entscheidungen fehlen Spalten: ${decisions.missing.join(", ")}.`);
    }
    const stages = [];
    for (const [i, row] of decisions.rows.entries()) {
      const after = Number(row.after);
      if (!Number.isInteger(after) || after < 1 || after > steps.rows.length) {
        err(`Decision ${i + 1} follows step "${row.after}", and there is no such step.`, `Entscheidung ${i + 1} folgt auf Schritt „${row.after}“, den es nicht gibt.`);
      }
      for (const k of ["stage", "who"]) {
        if (isNothing(row[k])) err(`Decision ${i + 1} has no "${COLUMNS.decisions[k][0]}".`, `Entscheidung ${i + 1} hat kein „${COLUMNS.decisions[k][1]}“.`);
      }
      stages.push(row.stage);
    }
    if (stages.length) {
      const parsed = parseStufen(stages.filter((s) => !isNothing(s)).join(","));
      if (parsed.error) out.push({ level: "error", message: parsed.error });
    }
    if (!decisions.rows.length) {
      hint("No decision: the app still has the one approval of the scaffold, the plan says so.", "Keine Entscheidung: die App behält die eine Freigabe der Vorlage, der Plan sagt es.");
    }
  }

  if (!sheet.open.length) {
    hint("Nothing under Open. Is everything really clear?", "Unter Offen steht nichts. Ist wirklich alles klar?");
  }
  for (const heading of sheet.unknown) {
    hint(`The heading "${heading}" is not one of the sheet's sections and is not read.`, `Die Überschrift „${heading}“ gehört nicht zu den Abschnitten des Blattes und wird nicht gelesen.`);
  }
  return out;
}

/**
 * Was `app.mjs --new` aus dem Blatt macht. Nur das, was im Blatt steht; ein Wert, den das Blatt nicht
 * traegt, fehlt hier und die Vorlage behaelt ihren.
 *
 * - `stufen`: die Stufen der Entscheidungen, in der Reihenfolge der Schritte.
 * - `felder`, `aenderbar`: die Vereinigung der Papiere, die das Geraet lesen soll.
 * - `arten`: wird gelesen, so bestaetigt ein Mensch das Ergebnis.
 * - `ausloeser`: die Zeile "Startet durch".
 */
export function deriveApp(sheet) {
  const out = { titel: sheet.title };
  const aim = sheet.text("aim").replace(/\s+/g, " ").trim();
  const first = aim.match(/^(.+?[.!?])(\s|$)/);
  out.beschreibung = (first ? first[1] : aim).slice(0, 200);

  if (sheet.trigger.kit) {
    const parsed = parseAusloeser(sheet.trigger.kit);
    if (!parsed.error && !(parsed.ausloeser.length === 1 && parsed.ausloeser[0].typ === "hand")) out.ausloeser = sheet.trigger.kit;
  }

  const stages = [...sheet.decisions.rows]
    .filter((r) => !isNothing(r.stage))
    .sort((a, b) => Number(a.after) - Number(b.after))
    .map((r) => r.stage);
  if (stages.length) out.stufen = stages.join(",");

  const felder = [];
  const aenderbar = [];
  for (const row of sheet.papers.rows) {
    if (isNone(row.read)) continue;
    const parsed = parseFelder(row.read);
    if (parsed.error) continue;
    for (const f of parsed.felder) if (!felder.includes(f)) felder.push(f);
    if (!isNone(row.changeable)) {
      const c = parseAenderbar(row.changeable, parsed.felder);
      if (!c.error) for (const f of c.aenderbar) if (!aenderbar.includes(f)) aenderbar.push(f);
    }
  }
  if (felder.length) {
    out.felder = felder.slice(0, 10).join(",");
    out.aenderbar = aenderbar.length ? aenderbar.filter((f) => felder.slice(0, 10).includes(f)).join(",") : "keine";
    out.arten = "ergebnis_bestaetigen";
  }
  return out;
}

/** Findet ein Blatt: ein Pfad, sonst die Kennung im Ordner des Kunden oder des Hauses. */
export function findSheet(ref, customer = null) {
  if (!ref) return null;
  if (/[\\/]/.test(ref) || /\.md$/.test(ref)) return existsSync(ref) ? ref : null;
  const path = sheetPath(ref, customer);
  return existsSync(path) ? path : null;
}

/**
 * Die Abschnitte des Plans, die das Blatt schon beantwortet: Ueberschrift des Plans (englisch,
 * deutsch) und der Text darunter. Der Rest des Plans bleibt dem Gespraech von `/app`.
 */
export function planSections(sheet, sheetRef) {
  const steps = sheet.steps.rows.map((r) => `${r.no}. ${r.who}: ${r.does}${isNothing(r.paper) ? "" : ` (${r.paper})`}, ${r.when}`);
  const personal = sheet.papers.rows.filter((r) => !isNothing(r.paper));
  const people = [...new Set(sheet.steps.rows.map((r) => r.who).filter((w) => !isNothing(w)))];
  const decisions = sheet.decisions.rows.map((r) => `- ${t("After step", "Nach Schritt")} ${r.after}, ${r.stage}: ${r.who}${isNothing(r.basis) ? "" : `, ${r.basis}`}${isNothing(r.no) ? "" : t(`. If no: ${r.no}`, `. Bei Nein: ${r.no}`)}`);
  const lines = (list) => list.join("\n");
  const from = t(`From the process sheet ${sheetRef}.`, `Aus dem Prozessblatt ${sheetRef}.`);
  return [
    { en: "What for", de: "Wozu", body: `${from}\n\n${sheet.text("aim")}\n\n${t("Trigger", "Auslöser")}: ${sheet.trigger.what}; ${sheet.trigger.often}; ${sheet.trigger.who}.` },
    { en: "Who uses it", de: "Wer es benutzt", body: `${t("Roles in the process", "Rollen im Ablauf")}: ${people.join(", ")}.\n\n${sheet.text("visibility")}` },
    {
      en: "Which data",
      de: "Welche Daten",
      body: lines(personal.map((r) => `- ${r.paper}: ${r.contents}; ${t("personal data", "personenbezogen")}: ${r.personal}; ${t("lies today", "liegt heute")}: ${r.lies}`)),
    },
    { en: "The steps", de: "Die Schritte", body: lines(steps) },
    { en: "Where a flow is needed", de: "Wo ein Flow gebraucht wird", body: flowDraft(sheet) },
    { en: "Where a human decides", de: "Wo ein Mensch entscheidet", body: decisions.length ? lines(decisions) : t("Nobody decides in the process sheet. The scaffold's one approval stays.", "Im Prozessblatt entscheidet niemand. Die eine Freigabe der Vorlage bleibt.") },
    { en: "What expressly does not belong to it", de: "Was ausdrücklich nicht dazugehört", body: sheet.text("excluded") },
    {
      en: "Assumptions",
      de: "Annahmen",
      body: lines([
        ...sheet.open.map((o) => `- ${o}`),
        ...sheet.exceptions.map((e) => `- ${t("Exception, to be handled in the app or by hand", "Ausnahme, in der App oder von Hand zu behandeln")}: ${e}`),
      ]),
    },
  ];
}

/**
 * Der Entwurf des Flows in Worten, aus dem, was das Blatt hergibt. Er ist ein Vorschlag fuer das
 * Gespraech, kein Beschluss: ob ein Sprachmodell hier wirklich arbeitet, entscheidet `/app`.
 */
function flowDraft(sheet) {
  const d = deriveApp(sheet);
  const lines = [t("Draft of the flow `freigabe` out of the process sheet, to be confirmed in the interview:", "Entwurf des Flows `freigabe` aus dem Prozessblatt, im Interview zu bestätigen:")];
  lines.push(`- ${t("Starts by", "Startet durch")}: ${d.ausloeser ?? "hand"}`);
  lines.push(`- ${t("Stages, in this order", "Stufen, in dieser Reihenfolge")}: ${d.stufen ?? t("one, from the scaffold", "eine, aus der Vorlage")}`);
  if (d.stufen?.includes(",")) {
    lines.push(`- ${t("Every stage is asked in every run. A decision that comes only in some cases (an amount, a kind of case) is raised in the interview, not built in silently.", "Jede Stufe wird in jedem Lauf gefragt. Eine Entscheidung, die nur in manchen Fällen kommt (ab einem Betrag, bei einer Art von Fall), wird im Interview angesprochen und nicht stillschweigend eingebaut.")}`);
  }
  if (d.felder) {
    lines.push(`- ${t("The device reads", "Das Gerät liest")}: ${d.felder}; ${t("a person may correct", "ein Mensch darf ändern")}: ${d.aenderbar}`);
    lines.push(`- ${t("A person confirms the reading before it goes on", "Ein Mensch bestätigt die Erkennung, bevor es weitergeht")}`);
  } else {
    lines.push(`- ${t("No paper is read by the device: the flow only waits for the decisions", "Das Gerät liest kein Papier: der Flow wartet nur auf die Entscheidungen")}`);
  }
  return lines.join("\n");
}

/** Ersetzt den Text unter einer Ueberschrift des Plans. Eine fehlende Ueberschrift bleibt fehlend. */
export function putSection(planText, heading, body) {
  const lines = planText.split("\n");
  const at = lines.findIndex((l) => l.trim() === `## ${heading}`);
  if (at < 0 || !body.trim()) return planText;
  let end = lines.findIndex((l, i) => i > at && /^##\s/.test(l));
  if (end < 0) end = lines.length;
  return [...lines.slice(0, at + 1), "", body.trim(), "", ...lines.slice(end)].join("\n");
}
