#!/usr/bin/env node
/**
 * Picture evidence: backs every line of the Leistungsbeschreibung with a picture from the device.
 *
 * Section 3 of the Leistungsbeschreibung fixes what is owed. Setting a line to
 * "abgenommen" means demonstrating it at the handover and being liable for it. This
 * tool therefore only allows "abgenommen" when a checked picture from the real device
 * lies next to it. Every other line falls back to "in Erprobung", with the reason.
 *
 * The tool does not take the pictures itself. Ara does that with the browser
 * (`.ara/knowledge/browser.md`). The tool says what has to be recorded, checks the
 * result and writes the document.
 *
 *   node .ara/tools/evidence.mjs --customer mueller --views-init
 *   node .ara/tools/evidence.mjs --customer mueller --plan
 *   node .ara/tools/evidence.mjs --customer mueller --record --line 1 \
 *        --image /tmp/shot.png --snapshot /tmp/shot.md \
 *        --url https://10.0.0.5/... --marker "Angemeldet als"
 *   node .ara/tools/evidence.mjs --customer mueller --miss --line 4 \
 *        --reason "the view answers with error 502"
 *   node .ara/tools/evidence.mjs --customer mueller --render
 *
 * Values about the product come from the mirror or from the device, never from this
 * script (`.ara/knowledge/live-knowledge.md`). Which view backs which line therefore
 * stands in `evidence/views.json` at the customer and gets established on the device.
 *
 * The document it writes is German, like all the paperwork under `.ara/vorlagen/`.
 * The level names ("abgenommen", "in Erprobung") are its vocabulary and stay in it.
 *
 * === deutsch ===
 *
 * Bildnachweis: belegt jede Zeile der Leistungsbeschreibung mit einem Bild vom Gerät.
 *
 * Abschnitt 3 der Leistungsbeschreibung legt fest, was geschuldet ist. Eine Zeile auf
 * "abgenommen" zu setzen heisst, sie bei der Übergabe vorzuführen und dafür zu haften.
 * Dieses Werkzeug lässt "abgenommen" deshalb nur zu, wenn ein geprüftes Bild vom
 * echten Gerät daneben liegt. Jede andere Zeile fällt auf "in Erprobung" zurück, mit
 * dem Grund dabei.
 *
 * Das Werkzeug macht die Bilder nicht selbst. Das tut Ara mit dem Browser
 * (`.ara/knowledge/browser.md`). Das Werkzeug sagt, was aufzunehmen ist, prüft das
 * Ergebnis und schreibt das Dokument.
 *
 *   node .ara/tools/evidence.mjs --customer mueller --views-init
 *   node .ara/tools/evidence.mjs --customer mueller --plan
 *   node .ara/tools/evidence.mjs --customer mueller --record --line 1 \
 *        --image /tmp/schuss.png --snapshot /tmp/schuss.md \
 *        --url https://10.0.0.5/... --marker "Angemeldet als"
 *   node .ara/tools/evidence.mjs --customer mueller --miss --line 4 \
 *        --reason "Ansicht antwortet mit Fehler 502"
 *   node .ara/tools/evidence.mjs --customer mueller --render
 *
 * Werte über das Produkt kommen aus dem Spiegel oder vom Gerät, nie aus diesem Skript
 * (`.ara/knowledge/live-knowledge.md`). Welche Ansicht welche Zeile belegt, steht
 * deshalb in `evidence/views.json` beim Kunden und wird am Gerät festgestellt.
 *
 * Das Dokument, das es schreibt, ist deutsch, wie alles Papier unter
 * `.ara/vorlagen/`. Die Namen der Stufen ("abgenommen", "in Erprobung") sind sein
 * Vokabular und bleiben darin.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  ROOT,
  customerPath,
  ensureDir,
  fail,
  helpOnly,
  now,
  parseArgs,
  readFrontmatter,
  resolveDevice,
  today,
} from "./lib/kit.mjs";
import { t } from "./lib/i18n.mjs";

const VORLAGE = join(ROOT, ".ara", "vorlagen", "leistungsbeschreibung.md");
const MIRROR = process.env.ARA_MIRROR || join(ROOT, ".ara", "mirror");

/** Die drei Stufen aus Abschnitt 3. Argumente englisch, Dokument deutsch. */
const STUFEN = {
  accepted: "abgenommen",
  trial: "in Erprobung",
  preview: "Vorschau",
};

/**
 * Ein Bild von 40 mal 20 Bildpunkten belegt nichts. Ein Bildschirmfoto der
 * Weboberfläche ist so gross wie das Fenster, im Kit sind das 1400 mal 900.
 * Geprüft wird die Grösse aus dem PNG-Kopf, nicht die Dateigrösse: ein leeres
 * Bild kann klein sein, ein Bild mit Rauschen gross, beides sagt nichts.
 */
const MIN_BREITE = 800;
const MIN_HOEHE = 500;

helpOnly(import.meta.url);
const arg = parseArgs();

// --- Hilfen -----------------------------------------------------------------

function slugify(label) {
  return label
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Für den Textvergleich: Grossschreibung und Zeilenumbrüche sind egal. */
function normalize(text) {
  return String(text).replace(/\s+/g, " ").trim().toLowerCase();
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

/** Zeitstempel für Dateinamen: 2026-08-25-1432 */
function stamp() {
  return now().replace(" ", "-").replace(":", "");
}

/**
 * Die Funktionsbereiche stehen in der Vorlage, nicht in diesem Skript. Wer dort
 * eine Zeile ergänzt, bekommt sie hier ohne Codeänderung. Gelesen wird genau die
 * Tabelle, deren Kopf mit "Funktionsbereich" beginnt: die Stufentabelle darüber
 * hat dieselbe Form.
 */
function readSpecLines() {
  if (!existsSync(VORLAGE)) {
    fail(
      t(
        `The template is missing: ${VORLAGE}. Without it, which lines have to be backed is unknown.`,
        `Die Vorlage fehlt: ${VORLAGE}. Ohne sie ist nicht bekannt, welche Zeilen zu belegen sind.`
      )
    );
  }
  const rows = [];
  let inTable = false;
  for (const line of readFileSync(VORLAGE, "utf8").split(/\r?\n/)) {
    if (/^\|\s*Funktionsbereich\s*\|/.test(line)) {
      inTable = true;
      continue;
    }
    if (!inTable) continue;
    if (!line.startsWith("|")) break;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 2) continue;
    if (/^:?-+:?$/.test(cells[0])) continue;
    rows.push({ label: cells[0], slug: slugify(cells[0]), note: cells[cells.length - 1] });
  }
  if (rows.length === 0) {
    fail(
      t(
        "The table of functional areas cannot be found in the template.\n" +
          'Expected in section 3 is a table whose first column is called "Funktionsbereich".',
        "In der Vorlage ist die Tabelle der Funktionsbereiche nicht auffindbar.\n" +
          'Erwartet wird in Abschnitt 3 eine Tabelle, deren erste Spalte "Funktionsbereich" heißt.'
      )
    );
  }
  return rows;
}

function target() {
  try {
    return resolveDevice(arg.customer, typeof arg.device === "string" ? arg.device : null);
  } catch (error) {
    return fail(error.message);
  }
}

function evidenceDir(place) {
  return join(place.path, "evidence");
}

function ledgerFile(place) {
  return join(evidenceDir(place), "ledger.json");
}

function viewsFile(place) {
  return join(evidenceDir(place), "views.json");
}

/** Die Kennung, die im Bild und im Seitentitel steht. Ohne sie ist ein Bild kein Nachweis. */
function stampText(place) {
  return `Nachweis ${place.customer}/${place.device}`;
}

/**
 * Der Beleg-Stand. Neue Zeilen der Vorlage kommen als "in Erprobung" dazu, nie als
 * "abgenommen": eine Zusage entsteht nur durch --record.
 */
function readLedger(place, lines) {
  let stored = { lines: {} };
  if (existsSync(ledgerFile(place))) {
    try {
      stored = JSON.parse(readFileSync(ledgerFile(place), "utf8"));
    } catch (error) {
      fail(t(`${ledgerFile(place)} is not readable: ${error.message}`, `${ledgerFile(place)} ist unlesbar: ${error.message}`));
    }
  }
  const merged = {};
  for (const line of lines) {
    merged[line.slug] = stored.lines?.[line.slug] ?? {
      label: line.label,
      state: "trial",
      reason: t("not backed on the device yet", "noch nicht am Gerät belegt"),
      evidence: null,
    };
    merged[line.slug].label = line.label;
    const zweifel = doubt(place, merged[line.slug]);
    if (zweifel) {
      merged[line.slug] = {
        label: line.label,
        state: "trial",
        reason: zweifel,
        evidence: null,
        checked: now(),
      };
    }
  }
  const retired = Object.keys(stored.lines ?? {}).filter((slug) => !merged[slug]);
  return {
    customer: place.customer,
    device: place.device,
    source: ".ara/vorlagen/leistungsbeschreibung.md, Abschnitt 3",
    lines: merged,
    retired: retired.length ? retired : undefined,
    updated: stored.updated ?? null,
  };
}

function writeLedger(place, ledger) {
  ensureDir(evidenceDir(place));
  ledger.updated = now();
  writeFileSync(ledgerFile(place), JSON.stringify(ledger, null, 2) + "\n");
}

function readViews(place) {
  if (!existsSync(viewsFile(place))) return null;
  try {
    return JSON.parse(readFileSync(viewsFile(place), "utf8"));
  } catch (error) {
    fail(t(`${viewsFile(place)} is not readable: ${error.message}`, `${viewsFile(place)} ist unlesbar: ${error.message}`));
  }
}

/** Findet eine Zeile über Nummer, Kennung oder Beschriftung. */
function resolveLine(lines, wanted) {
  if (wanted === undefined || wanted === true) {
    fail(
      t(
        "--line is missing. Take the number from --plan, the id or the label.",
        "--line fehlt. Nimm die Nummer aus --plan, die Kennung oder die Beschriftung."
      )
    );
  }
  const text = String(wanted).trim();
  if (/^\d+$/.test(text)) {
    const line = lines[Number(text) - 1];
    if (!line) {
      fail(
        t(
          `There is no line ${text}. The template has ${lines.length} lines.`,
          `Es gibt keine Zeile ${text}. Die Vorlage hat ${lines.length} Zeilen.`
        )
      );
    }
    return line;
  }
  const wantedSlug = slugify(text);
  const line = lines.find((entry) => entry.slug === wantedSlug || slugify(entry.label) === wantedSlug);
  if (!line) {
    fail(
      t(`No line matches "${text}".\nKnown: `, `Keine Zeile passt zu "${text}".\nVorhanden: `) +
        lines.map((entry, index) => `${index + 1} ${entry.slug}`).join(", ")
    );
  }
  return line;
}

/** Grösse aus dem PNG-Kopf. Wirft, wenn es kein PNG ist. */
function pngSize(path) {
  const buffer = readFileSync(path);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature)) {
    throw new Error(t("the file is not a PNG", "die Datei ist kein PNG"));
  }
  if (buffer.subarray(12, 16).toString("latin1") !== "IHDR") {
    throw new Error(t("the PNG has no header (IHDR)", "dem PNG fehlt der Kopf (IHDR)"));
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function mirrorVersion() {
  const file = join(MIRROR, "STATE.json");
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")).version ?? null;
  } catch {
    return null;
  }
}

/**
 * Abschnitt 2 aus dem Spiegel. Fehlt der Spiegel oder fehlt das Feld verification,
 * bleibt die Mustertabelle der Vorlage stehen und der Lauf sagt es. Geraten wird nicht.
 */
function mirrorPlatforms() {
  const dir = join(MIRROR, "config", "platforms");
  if (!existsSync(dir)) return { rows: null, reason: "kein Spiegel vorhanden" };
  const rows = [];
  for (const name of readdirSync(dir).filter((entry) => entry.endsWith(".json")).sort()) {
    let profile;
    try {
      profile = JSON.parse(readFileSync(join(dir, name), "utf8"));
    } catch {
      return { rows: null, reason: `${name} im Spiegel ist unlesbar` };
    }
    if (!profile.verification) {
      return { rows: null, reason: `${name} im Spiegel hat kein Feld verification` };
    }
    rows.push({
      id: profile.id ?? name.replace(/\.json$/, ""),
      name: profile.name ?? profile.id ?? name.replace(/\.json$/, ""),
      verification: String(profile.verification),
    });
  }
  if (rows.length === 0) return { rows: null, reason: "der Spiegel kennt keine Plattformprofile" };
  return { rows, reason: null };
}

// --- Der Aufnahmestempel ----------------------------------------------------

/**
 * Ein Bild ohne Zeitstempel und ohne Gerätekennung ist kein Nachweis. Deshalb wird
 * vor jeder Aufnahme ein Streifen in die Seite gelegt: Kennung, Adresse, Adresszeile
 * und Uhrzeit. Er landet in den Bildpunkten, nicht nur im Dateinamen.
 *
 * Derselbe Text geht in den Seitentitel. Der Titel steht im Textabbild des Browsers,
 * damit ist beim Prüfen nachweisbar, dass der Streifen zur Aufnahmezeit wirklich da
 * war, und nicht nur behauptet wird.
 *
 * Das verändert nichts auf dem Gerät. Es ist die Seite im eigenen Browser, kein Klick
 * auf dem Kundengerät (`.ara/knowledge/security.md`).
 */
function stampSnippet(place, fields) {
  const kennung = stampText(place);
  const geraet = [fields.model, fields.serial].filter(Boolean).join(", ");
  const adresse = fields.address || fields.hostname || "Adresse nicht in der Geräteakte";
  const zeile = [kennung, geraet, adresse].filter(Boolean).join(" · ");
  return `() => {
  const alt = document.getElementById("ara-nachweis");
  if (alt) alt.remove();
  const zeit = new Date().toLocaleString("de-DE");
  const text = ${JSON.stringify(zeile)} + " · " + location.href + " · " + zeit;
  const band = document.createElement("div");
  band.id = "ara-nachweis";
  band.setAttribute("role", "note");
  band.textContent = text;
  band.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:2147483647;" +
    "background:#111;color:#fff;font:13px/1.6 monospace;padding:6px 10px;" +
    "text-align:left;white-space:nowrap;overflow:hidden";
  document.body.appendChild(band);
  document.title = ${JSON.stringify(kennung)} + " · " + zeit + " · " + document.title;
  return text;
}`;
}

// --- Unterbefehle -----------------------------------------------------------

function commandHelp() {
  console.log(
    t(
      [
        "Picture evidence for the Leistungsbeschreibung",
        "",
        "  --customer <name>       which customer (mandatory)",
        "  --device <name>         which device (only needed when there are several)",
        "",
        "  --views-init            create the mapping of view to line, gets filled on the device",
        "  --plan                  what has to be recorded, with the browser steps",
        "  --show                  state of the evidence",
        "  --record --line <n>     check a recorded picture and enter it",
        '      --image <path> --snapshot <path> --url <address> --marker "<text>"',
        '  --miss --line <n> --reason "<reason>"',
        "                          view not reachable, the line stays in Erprobung",
        '  --set --line <n> --state trial|preview --reason "<reason>"',
        "                          set the level by hand. accepted only works over --record",
        '  --render [--model "<id>"] [--force]',
        "                          write the Leistungsbeschreibung into the customer file",
        "",
        "The pictures lie at the customer under devices/<device>/evidence/ and never in the kit repo.",
      ].join("\n"),
      [
        "Bildnachweis für die Leistungsbeschreibung",
        "",
        "  --customer <name>       welcher Kunde (Pflicht)",
        "  --device <name>         welches Gerät (nur nötig, wenn es mehrere gibt)",
        "",
        "  --views-init            Zuordnung Ansicht zu Zeile anlegen, wird am Gerät gefüllt",
        "  --plan                  was aufzunehmen ist, mit den Browserschritten",
        "  --show                  Stand der Belege",
        "  --record --line <n>     ein aufgenommenes Bild prüfen und eintragen",
        "      --image <pfad> --snapshot <pfad> --url <adresse> --marker \"<text>\"",
        "  --miss --line <n> --reason \"<grund>\"",
        "                          Ansicht nicht erreichbar, Zeile bleibt in Erprobung",
        "  --set --line <n> --state trial|preview --reason \"<grund>\"",
        "                          Stufe von Hand setzen. accepted geht nur über --record",
        "  --render [--model \"<kennung>\"] [--force]",
        "                          Leistungsbeschreibung in die Kundenakte schreiben",
        "",
        "Die Bilder liegen beim Kunden unter devices/<gerät>/evidence/ und nie im Kit-Repo.",
      ].join("\n")
    )
  );
}

function commandViewsInit(place, lines) {
  const file = viewsFile(place);
  if (existsSync(file) && !arg.force) {
    fail(
      t(
        `There is already a mapping: ${file}\nOverwrite with --force, that discards the existing one.`,
        `Es gibt schon eine Zuordnung: ${file}\nÜberschreiben mit --force, das verwirft die bisherige.`
      )
    );
  }
  const { fields } = readFrontmatter(join(place.path, "device.md"));
  const views = {};
  for (const line of lines) {
    views[line.slug] = { label: line.label, path: "", marker: "", note: "" };
  }
  ensureDir(evidenceDir(place));
  writeFileSync(
    file,
    JSON.stringify(
      {
        _hinweis:
          "Welche Ansicht welche Zeile belegt, ist ein Produktwert und steht nicht im Kit. " +
          "Fülle path und marker am Gerät: Oberfläche öffnen, Navigation durchgehen, " +
          "je Zeile die Ansicht suchen, die sie wirklich zeigt. Eine Zeile ohne Zuordnung " +
          "bleibt in Erprobung, das ist richtig und nicht schlimm.",
        customer: place.customer,
        device: place.device,
        base: fields.address ? `https://${fields.address}` : "",
        established: "",
        source: "",
        views,
      },
      null,
      2
    ) + "\n"
  );
  console.log(
    [
      t(`Mapping created: ${file.replace(ROOT + "/", "")}`, `Zuordnung angelegt: ${file.replace(ROOT + "/", "")}`),
      t(`${lines.length} lines, all still without a view.`, `${lines.length} Zeilen, alle noch ohne Ansicht.`),
      "",
      ...t(
        [
          "Next step: open the device's interface, go through the navigation and enter path and",
          "marker per line. marker is a text that stands on exactly this view and on no other.",
          "It is the proof that the picture shows what the line claims.",
        ],
        [
          "Nächster Schritt: Oberfläche des Geräts öffnen, Navigation durchgehen und je Zeile",
          "path und marker eintragen. marker ist ein Text, der auf genau dieser Ansicht steht",
          "und auf keiner anderen. Er ist die Probe, dass das Bild zeigt, was die Zeile behauptet.",
        ]
      ),
    ].join("\n")
  );
}

function commandPlan(place, lines, ledger) {
  const { fields } = readFrontmatter(join(place.path, "device.md"));
  const views = readViews(place);
  const out = [
    t(
      `# Recording plan: ${place.customer} / ${place.device}`,
      `# Aufnahmeplan: ${place.customer} / ${place.device}`
    ),
    "",
    t(`Lines in section 3: ${lines.length}`, `Zeilen in Abschnitt 3: ${lines.length}`),
  ];

  if (!views) {
    out.push(
      "",
      ...t(
        [
          "There is no mapping of view to line yet. Without it no picture can be recorded",
          "that backs its line, and every line stays in Erprobung.",
        ],
        [
          "Es gibt noch keine Zuordnung von Ansicht zu Zeile. Ohne sie kann kein Bild",
          "aufgenommen werden, das seine Zeile belegt, und jede Zeile bleibt in Erprobung.",
        ]
      ),
      "",
      t("Create it: ", "Anlegen: ") + `node .ara/tools/evidence.mjs --customer ${place.customer} --views-init`
    );
    console.log(out.join("\n"));
    return 1;
  }

  out.push(
    "",
    t("## Before every recording", "## Vor jeder Aufnahme"),
    "",
    ...t(
      [
        "Run this expression over browser_evaluate. It puts the id, the address and the time",
        "into the page and into the page title. Without it the picture gets refused.",
      ],
      [
        "Diesen Ausdruck über browser_evaluate laufen lassen. Er legt Kennung, Adresse und",
        "Uhrzeit in die Seite und in den Seitentitel. Ohne ihn wird das Bild abgelehnt.",
      ]
    ),
    "",
    "```js",
    stampSnippet(place, fields),
    "```",
    "",
    t("## Per line", "## Je Zeile")
  );

  let offen = 0;
  lines.forEach((line, index) => {
    const view = views.views?.[line.slug];
    const state = ledger.lines[line.slug];
    const nummer = index + 1;
    if (state?.state === "accepted") {
      out.push(
        "",
        t(
          `${nummer}. ${line.label}: backed on ${state.evidence?.captured}, nothing to do.`,
          `${nummer}. ${line.label}: belegt am ${state.evidence?.captured}, nichts zu tun.`
        )
      );
      return;
    }
    if (!view?.path || !view?.marker) {
      offen++;
      out.push(
        "",
        t(`${nummer}. ${line.label}: no view assigned.`, `${nummer}. ${line.label}: keine Ansicht zugeordnet.`),
        t(
          "   Stays in Erprobung as long as path and marker are missing from views.json.",
          "   Bleibt in Erprobung, solange path und marker in views.json fehlen."
        )
      );
      return;
    }
    offen++;
    let ziel;
    try {
      ziel = views.base ? new URL(view.path, views.base).toString() : new URL(view.path).toString();
    } catch {
      out.push(
        "",
        t(
          `${nummer}. ${line.label}: the view "${view.path}" does not yield an address.`,
          `${nummer}. ${line.label}: die Ansicht "${view.path}" ergibt keine Adresse.`
        ),
        t(
          "   base is missing from views.json, or path is not a valid address.",
          "   In views.json fehlt base, oder path ist keine gültige Adresse."
        )
      );
      return;
    }
    out.push(
      "",
      `${nummer}. ${line.label}`,
      t(`   View: ${ziel}`, `   Ansicht: ${ziel}`),
      t(`   Proof: "${view.marker}"`, `   Probe: "${view.marker}"`),
      `   1. browser_navigate ${ziel}`,
      t("   2. browser_evaluate with the expression from above", "   2. browser_evaluate mit dem Ausdruck von oben"),
      `   3. browser_snapshot --filename /tmp/${place.device}-${line.slug}.md`,
      `   4. browser_take_screenshot --filename /tmp/${place.device}-${line.slug}.png`,
      `   5. node .ara/tools/evidence.mjs --customer ${place.customer} --device ${place.device} \\`,
      `        --record --line ${nummer} \\`,
      `        --image /tmp/${place.device}-${line.slug}.png \\`,
      `        --snapshot /tmp/${place.device}-${line.slug}.md \\`,
      `        --url ${ziel} --marker ${JSON.stringify(view.marker)}`
    );
  });

  out.push(
    "",
    t(`Open: ${offen} of ${lines.length}.`, `Offen: ${offen} von ${lines.length}.`),
    ...t(
      [
        'What stays open in the end stands as "in Erprobung" with a reason in the document.',
        "A line without a picture does not get promised.",
      ],
      [
        'Was am Ende offen bleibt, steht als "in Erprobung" mit Grund im Dokument.',
        "Eine Zeile ohne Bild wird nicht zugesagt.",
      ]
    )
  );
  console.log(out.join("\n"));
  return 0;
}

function commandShow(place, lines, ledger) {
  const out = [t(`# Evidence: ${place.customer} / ${place.device}`, `# Belege: ${place.customer} / ${place.device}`), ""];
  let belegt = 0;
  lines.forEach((line, index) => {
    const entry = ledger.lines[line.slug];
    const stufe = STUFEN[entry.state] ?? entry.state;
    if (entry.state === "accepted") belegt++;
    out.push(
      `${String(index + 1).padStart(2)} ${line.label}: ${stufe}` +
        (entry.state === "accepted" && entry.evidence
          ? t(
              `\n     Picture: ${entry.evidence.image}, recorded ${entry.evidence.captured}`,
              `\n     Bild: ${entry.evidence.image}, aufgenommen ${entry.evidence.captured}`
            )
          : t(
              `\n     Reason: ${entry.reason || "no reason noted"}`,
              `\n     Grund: ${entry.reason || "kein Grund vermerkt"}`
            ))
    );
  });
  out.push(
    "",
    t(
      `${belegt} of ${lines.length} lines with picture evidence.`,
      `${belegt} von ${lines.length} Zeilen mit Bildnachweis.`
    )
  );
  if (ledger.retired) {
    out.push(
      "",
      t(
        `No longer in the template, but still in the evidence record: ${ledger.retired.join(", ")}`,
        `Nicht mehr in der Vorlage, bleibt aber im Beleg-Stand: ${ledger.retired.join(", ")}`
      )
    );
  }
  console.log(out.join("\n"));
}

function commandRecord(place, lines, ledger) {
  const line = resolveLine(lines, arg.line);
  const kennung = stampText(place);

  const bild = typeof arg.image === "string" ? arg.image : null;
  const abbild = typeof arg.snapshot === "string" ? arg.snapshot : null;
  const url = typeof arg.url === "string" ? arg.url : null;
  const marker = typeof arg.marker === "string" ? arg.marker : null;
  if (!bild || !abbild || !url || !marker) {
    fail(
      t(
        "To enter it I need --image, --snapshot, --url and --marker.\n" +
          "--marker is the text that stands on exactly this view. It is the proof\n" +
          "that the picture shows what the line claims.",
        "Zum Eintragen brauche ich --image, --snapshot, --url und --marker.\n" +
          "--marker ist der Text, der auf genau dieser Ansicht steht. Er ist die Probe,\n" +
          "dass das Bild zeigt, was die Zeile behauptet."
      )
    );
  }

  // Erst prüfen, dann eintragen. Was durchfällt, macht die Zeile nicht "abgenommen",
  // sondern schreibt den Grund hin.
  const ablehnen = (grund) => {
    ledger.lines[line.slug] = {
      label: line.label,
      state: "trial",
      reason: grund,
      evidence: null,
      checked: now(),
    };
    writeLedger(place, ledger);
    console.log(
      [
        t(`Refused: ${line.label}`, `Abgelehnt: ${line.label}`),
        grund,
        "",
        ...t(
          [
            'The line stands at "in Erprobung", the reason lies in the evidence record and goes',
            "into the document that way. A picture that does not show what the line claims is worse",
            "than none.",
          ],
          [
            'Die Zeile steht auf "in Erprobung", der Grund liegt im Beleg-Stand und kommt so',
            "ins Dokument. Ein Bild, das nicht zeigt, was die Zeile behauptet, ist schlimmer",
            "als keins.",
          ]
        ),
      ].join("\n")
    );
    process.exit(1);
  };

  if (!existsSync(bild)) ablehnen(t(`The picture ${bild} is not there.`, `Das Bild ${bild} ist nicht da.`));
  if (!existsSync(abbild)) {
    ablehnen(t(`The text snapshot ${abbild} is not there.`, `Das Textabbild ${abbild} ist nicht da.`));
  }

  let groesse;
  try {
    groesse = pngSize(bild);
  } catch (error) {
    ablehnen(`${bild}: ${error.message}.`);
  }
  if (groesse.width < MIN_BREITE || groesse.height < MIN_HOEHE) {
    ablehnen(
      t(
        `The picture is ${groesse.width} by ${groesse.height} pixels. ` +
          `A screenshot of the interface has at least ${MIN_BREITE} by ${MIN_HOEHE}.`,
        `Das Bild ist ${groesse.width} mal ${groesse.height} Bildpunkte groß. ` +
          `Ein Bildschirmfoto der Oberfläche hat mindestens ${MIN_BREITE} mal ${MIN_HOEHE}.`
      )
    );
  }

  const text = normalize(readFileSync(abbild, "utf8"));
  if (!text.includes(normalize(kennung))) {
    ablehnen(
      t(
        `The id "${kennung}" is missing from the text snapshot. That does not back that the ` +
          "recording stamp lay in the page at recording time. Run the expression from --plan " +
          "before the recording, not after.",
        `Im Textabbild fehlt die Kennung "${kennung}". Damit ist nicht belegt, dass der ` +
          "Aufnahmestempel zur Aufnahmezeit in der Seite lag. Lauf den Ausdruck aus --plan " +
          "vor der Aufnahme, nicht danach."
      )
    );
  }
  // Ohne Verfahren und ohne Schlussschrägstrich vergleichen: der Browser schreibt die
  // Adresse nicht immer buchstabengleich zurück, und daran soll ein echter Beleg nicht
  // scheitern.
  const adressprobe = normalize(url.replace(/^https?:\/\//, "").replace(/\/+$/, ""));
  if (adressprobe && !text.includes(adressprobe)) {
    ablehnen(
      t(
        `The address ${url} does not stand in the text snapshot. Either the snapshot is from a ` +
          "different page, or the recording came about elsewhere.",
        `Im Textabbild steht nicht die Adresse ${url}. Entweder ist das Abbild von einer ` +
          "anderen Seite, oder die Aufnahme ist woanders entstanden."
      )
    );
  }
  if (!text.includes(normalize(marker))) {
    ablehnen(
      t(
        `"${marker}" does not stand on the page. The view does not show what the line ` +
          `"${line.label}" claims, or it did not load.`,
        `Auf der Seite steht "${marker}" nicht. Die Ansicht zeigt nicht, was die Zeile ` +
          `"${line.label}" behauptet, oder sie hat nicht geladen.`
      )
    );
  }

  const ordner = ensureDir(evidenceDir(place));
  const basis = `${stamp()}-${place.device}-${line.slug}`;
  const bildZiel = join(ordner, `${basis}.png`);
  const abbildZiel = join(ordner, `${basis}.md`);
  const belegZiel = join(ordner, `${basis}.json`);

  writeFileSync(bildZiel, readFileSync(bild));
  writeFileSync(abbildZiel, readFileSync(abbild));

  const { fields } = readFrontmatter(join(place.path, "device.md"));
  const beleg = {
    customer: place.customer,
    device: place.device,
    line: line.slug,
    label: line.label,
    url,
    marker,
    captured: now(),
    image: `${basis}.png`,
    snapshot: `${basis}.md`,
    sha256_image: sha256(bildZiel),
    sha256_snapshot: sha256(abbildZiel),
    pixels: `${groesse.width}x${groesse.height}`,
    device_model: fields.model || "",
    device_serial: fields.serial || "",
    device_address: fields.address || fields.hostname || "",
    software_version: mirrorVersion() || "",
  };
  writeFileSync(belegZiel, JSON.stringify(beleg, null, 2) + "\n");

  ledger.lines[line.slug] = {
    label: line.label,
    state: "accepted",
    reason: "",
    evidence: {
      image: beleg.image,
      snapshot: beleg.snapshot,
      sidecar: `${basis}.json`,
      url,
      marker,
      captured: beleg.captured,
      sha256: beleg.sha256_image,
    },
    checked: now(),
  };
  writeLedger(place, ledger);

  console.log(
    [
      t(`Backed: ${line.label}`, `Belegt: ${line.label}`),
      t(`  Picture: evidence/${beleg.image} (${beleg.pixels})`, `  Bild: evidence/${beleg.image} (${beleg.pixels})`),
      t(`  Recorded: ${beleg.captured}`, `  Aufgenommen: ${beleg.captured}`),
      t(`  View: ${url}`, `  Ansicht: ${url}`),
      t(`  Proof found: "${marker}"`, `  Probe gefunden: "${marker}"`),
      t(`  Checksum: ${beleg.sha256_image.slice(0, 16)}`, `  Prüfsumme: ${beleg.sha256_image.slice(0, 16)}`),
      "",
      t(
        'The line stands at "abgenommen". It has to be demonstrated at the handover.',
        'Die Zeile steht auf "abgenommen". Sie muss bei der Übergabe vorgeführt werden.'
      ),
    ].join("\n")
  );
}

function commandMiss(place, lines, ledger) {
  const line = resolveLine(lines, arg.line);
  const grund = typeof arg.reason === "string" ? arg.reason.trim() : "";
  if (!grund) {
    fail(
      t(
        "--reason is missing. Without a reason a gap cannot be followed.\n" +
          'Example: --reason "the view answers with error 502, the service does not run"',
        "--reason fehlt. Ohne Grund ist eine Lücke nicht nachvollziehbar.\n" +
          'Beispiel: --reason "Ansicht antwortet mit Fehler 502, Dienst läuft nicht"'
      )
    );
  }
  ledger.lines[line.slug] = {
    label: line.label,
    state: "trial",
    reason: grund,
    evidence: null,
    checked: now(),
  };
  writeLedger(place, ledger);
  console.log(
    t(
      `${line.label}: in Erprobung.\nReason: ${grund}\nThe reason stands like that in the document, it is not kept quiet.`,
      `${line.label}: in Erprobung.\nGrund: ${grund}\nDer Grund steht so im Dokument, er wird nicht verschwiegen.`
    )
  );
}

function commandSet(place, lines, ledger) {
  const line = resolveLine(lines, arg.line);
  const state = typeof arg.state === "string" ? arg.state : "";
  if (state === "accepted" || state === "abgenommen") {
    fail(
      t(
        '"abgenommen" cannot be set by hand. The level comes out of a checked\n' +
          "picture from the device, otherwise a promise stands on an estimate.\n" +
          `The way there: node .ara/tools/evidence.mjs --customer ${place.customer} --plan`,
        '"abgenommen" lässt sich nicht von Hand setzen. Die Stufe entsteht aus einem geprüften\n' +
          "Bild vom Gerät, sonst steht eine Zusage auf einer Einschätzung.\n" +
          `Weg dorthin: node .ara/tools/evidence.mjs --customer ${place.customer} --plan`
      )
    );
  }
  if (!STUFEN[state]) {
    fail(
      t(
        `--state has to be trial or preview. Got: "${state || "nothing"}".`,
        `--state muss trial oder preview sein. Bekommen: "${state || "nichts"}".`
      )
    );
  }
  const grund = typeof arg.reason === "string" ? arg.reason.trim() : "";
  if (!grund) {
    fail(
      t(
        '--reason is missing. Every level below "abgenommen" needs a reason.',
        '--reason fehlt. Jede Stufe unter "abgenommen" braucht einen Grund.'
      )
    );
  }
  ledger.lines[line.slug] = {
    label: line.label,
    state,
    reason: grund,
    evidence: null,
    checked: now(),
  };
  writeLedger(place, ledger);
  console.log(`${line.label}: ${STUFEN[state]}.\n` + t(`Reason: ${grund}`, `Grund: ${grund}`));
}

function commandRender(place, lines, ledger) {
  const { fields } = readFrontmatter(join(place.path, "device.md"));
  const kunde = readFrontmatter(join(customerPath(place.customer), "customer.md"));
  const version = mirrorVersion();
  const platforms = mirrorPlatforms();
  const offen = [];

  let text = readFileSync(VORLAGE, "utf8");

  // Der Vorlagenkopf mit dem Hinweis an den Partner gehört nicht ins Kundendokument.
  const trenner = text.indexOf("\n---\n\n# Anlage: Leistungsbeschreibung");
  if (trenner !== -1) text = text.slice(trenner + 5);

  const ersetze = (platzhalter, wert, was) => {
    if (!wert) {
      offen.push(was);
      return;
    }
    text = text.split(platzhalter).join(wert);
  };

  ersetze("{Firma}", kunde.fields.legal_name, "Firmierung des Kunden, aus customer.md");
  ersetze(
    "{Modell, Seriennummer}",
    [fields.model, fields.serial].filter(Boolean).join(", "),
    "Modell und Seriennummer, aus device.md"
  );
  ersetze("{Fassung aus `VERSION`}", version, "Softwarestand, aus dem Spiegel");
  text = text.split("{JJJJ-MM-TT}").join(today());
  text = text
    .split("{das gelieferte Gerät}")
    .join(`${place.customer}/${place.device}${fields.address ? `, ${fields.address}` : ""}`);
  if (typeof arg.model === "string" && arg.model.trim()) {
    text = text.split("{Kennung und Fassung}").join(arg.model.trim());
  } else {
    offen.push("Abschnitt 5: Sprachmodell mit Fassung, vom Gerät zu lesen, dann --model mitgeben");
  }

  // Abschnitt 2: Plattformen aus dem Spiegel, sonst bleibt die Mustertabelle stehen.
  if (platforms.rows) {
    const alt = text.match(/\| Plattform \| Stand der Erprobung \| Bedeutung \|[\s\S]*?\n\n/);
    if (alt) {
      const kopf = ["| Plattform | Stand der Erprobung | Quelle |", "| --- | --- | --- |"];
      const zeilen = platforms.rows.map(
        (row) => `| ${row.name} | ${row.verification} | Spiegel, config/platforms/${row.id}.json |`
      );
      text = text.replace(alt[0], [...kopf, ...zeilen].join("\n") + "\n\n");
      text = text.replace(
        /Die Tabelle unten ist\nder Stand vom [0-9.]+ und dient nur als Muster\. \*\*Vor jedem Angebot neu holen\.\*\*/,
        `Die Tabelle unten ist der Stand des Spiegels vom ${today()}.`
      );
    }
  } else {
    offen.push(`Abschnitt 2: Plattformtabelle bleibt Muster (${platforms.reason})`);
  }

  const profil = fields.profile;
  if (profil) {
    const row = platforms.rows?.find((entry) => entry.id === profil || entry.name === profil);
    text = text.split("{Plattform}").join(profil);
    if (row) {
      text = text.split("{live | emulation | follow-up}").join(row.verification);
    } else {
      offen.push(`Abschnitt 2: Stand der Erprobung für "${profil}" nicht im Spiegel gefunden`);
    }
  } else {
    offen.push("Abschnitt 2: Plattformprofil fehlt in device.md, es wird nur vom Gerät bestätigt");
  }

  // Abschnitt 3: die Stufen und die Bildnachweise aus dem Beleg-Stand.
  const belege = [];
  for (const line of lines) {
    const entry = ledger.lines[line.slug];
    const stufe = STUFEN[entry.state] ?? entry.state;
    const nachweis =
      entry.state === "accepted"
        ? `evidence/${entry.evidence.image}, ${entry.evidence.captured}`
        : `kein Bildnachweis: ${entry.reason || "kein Grund vermerkt"}`;

    const muster = new RegExp(
      `^\\| ${line.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\|[^\\n]*$`,
      "m"
    );
    const treffer = text.match(muster);
    if (!treffer) {
      offen.push(`Abschnitt 3: Zeile "${line.label}" in der Vorlage nicht gefunden`);
      continue;
    }
    const cells = treffer[0].split("|").slice(1, -1).map((cell) => cell.trim());
    const anmerkung = cells[cells.length - 1];
    text = text.replace(treffer[0], `| ${line.label} | ${stufe} | ${nachweis} | ${anmerkung} |`);

    if (entry.state === "accepted") {
      belege.push(
        `| ${line.label} | ${entry.evidence.captured} | \`${entry.evidence.image}\` | ` +
          `${entry.evidence.url} | ${entry.evidence.sha256.slice(0, 16)} |`
      );
    }
  }

  const ohneBeleg = lines.filter((line) => ledger.lines[line.slug].state !== "accepted");
  const abschnitt = [
    "",
    "### 3a Bildnachweise",
    "",
    "Jede Zeile, die oben \"abgenommen\" trägt, ist am Gerät aufgenommen worden. Die Bilder",
    "liegen beim Betreiber der Akte und werden auf Verlangen vorgelegt. Jedes Bild trägt",
    "Gerätekennung, Adresse der Ansicht und Aufnahmezeit in den Bildpunkten.",
    "",
  ];
  if (belege.length) {
    abschnitt.push(
      "| Funktionsbereich | Aufgenommen | Datei | Ansicht | Prüfsumme (Anfang) |",
      "| --- | --- | --- | --- | --- |",
      ...belege,
      ""
    );
  } else {
    abschnitt.push("**Es liegt kein Bildnachweis vor.** Keine Zeile trägt \"abgenommen\".", "");
  }
  if (ohneBeleg.length) {
    abschnitt.push(
      "**Ohne Bildnachweis und deshalb nicht abgenommen:**",
      "",
      ...ohneBeleg.map(
        (line) =>
          `- ${line.label}: ${ledger.lines[line.slug].reason || "kein Grund vermerkt"}`
      ),
      "",
      "Diese Funktionsbereiche sind vorhanden, aber nicht Gegenstand der Abnahme. Sie werden",
      "nicht zugesichert. Wer sie nutzt, tut das auf eigenes Risiko, siehe die Stufentabelle",
      "oben.",
      ""
    );
  }

  const ankerIndex = text.indexOf("## 4 Was ausdruecklich nicht Vertragsgegenstand ist");
  if (ankerIndex === -1) {
    offen.push("Abschnitt 3a konnte nicht eingefügt werden, Abschnitt 4 nicht gefunden");
  } else {
    text = text.slice(0, ankerIndex) + abschnitt.join("\n") + "\n" + text.slice(ankerIndex);
  }

  // Was noch offen ist, steht im Dokument, nicht nur auf dem Bildschirm. Der Kommentar
  // am Ende der Vorlage nennt selbst einen {Platzhalter} und wird deshalb ausgenommen.
  const koerper = text.split("\n<!--")[0];
  const reste = [...new Set((koerper.match(/\{[^}\n]{2,60}\}/g) ?? []))];
  const fussnote = [
    "",
    "<!--",
    `ERZEUGT: node .ara/tools/evidence.mjs --render, ${now()}`,
    `Kunde ${place.customer}, Gerät ${place.device}.`,
    `Bildnachweise: ${belege.length} von ${lines.length} Zeilen.`,
    "",
    offen.length ? "OFFEN, VOR DEM VERSENDEN VON HAND ZU FÜLLEN:" : "Nichts offen gemeldet.",
    ...offen.map((item) => `- ${item}`),
    reste.length ? `\nNoch als Platzhalter im Text: ${reste.join(", ")}` : "",
    "-->",
    "",
  ];
  text = text.trimEnd() + "\n" + fussnote.join("\n");

  const ziel = join(place.path, `leistungsbeschreibung-${today()}.md`);
  if (existsSync(ziel) && !arg.force) {
    fail(
      t(
        `${ziel.replace(ROOT + "/", "")} already exists.\n` +
          "A signed document does not get overwritten. Overwrite with --force\n" +
          "if it has not gone out yet.",
        `Es gibt schon ${ziel.replace(ROOT + "/", "")}.\n` +
          "Ein unterschriebenes Dokument wird nicht überschrieben. Mit --force überschreiben,\n" +
          "wenn es noch nicht heraus ist."
      )
    );
  }
  writeFileSync(ziel, text);

  console.log(
    [
      t(`Written: ${ziel.replace(ROOT + "/", "")}`, `Geschrieben: ${ziel.replace(ROOT + "/", "")}`),
      t(
        `Picture evidence: ${belege.length} of ${lines.length} lines.`,
        `Bildnachweise: ${belege.length} von ${lines.length} Zeilen.`
      ),
      ohneBeleg.length
        ? t(
            `Without evidence and therefore "in Erprobung": ${ohneBeleg.map((line) => line.label).join(", ")}`,
            `Ohne Beleg und deshalb "in Erprobung": ${ohneBeleg.map((line) => line.label).join(", ")}`
          )
        : t("All lines backed.", "Alle Zeilen belegt."),
      "",
      offen.length ? t("To fill in by hand:", "Von Hand zu füllen:") : t("Nothing open.", "Nichts offen."),
      ...offen.map((item) => `  - ${item}`),
      reste.length
        ? t(`\nStill placeholders in the text: ${reste.join(", ")}`, `\nNoch Platzhalter im Text: ${reste.join(", ")}`)
        : "",
      "",
      ...t(
        [
          'Every line with "abgenommen" has to be demonstrated and signed off in the Übergabeprotokoll',
          "(.ara/vorlagen/uebergabeprotokoll.md). Otherwise it is a contradiction at Arasul's expense.",
        ],
        [
          'Jede Zeile mit "abgenommen" muss im Übergabeprotokoll vorgeführt und abgezeichnet',
          "werden (.ara/vorlagen/uebergabeprotokoll.md). Sonst ist es ein Widerspruch zu Lasten von Arasul.",
        ]
      ),
    ].join("\n")
  );
}

// --- Ablauf -----------------------------------------------------------------

if (!arg.customer) {
  commandHelp();
  process.exit(0);
}

const place = target();
const lines = readSpecLines();
const ledger = readLedger(place, lines);

if (arg["views-init"]) {
  commandViewsInit(place, lines);
} else if (arg.record) {
  commandRecord(place, lines, ledger);
} else if (arg.miss) {
  commandMiss(place, lines, ledger);
} else if (arg.set) {
  commandSet(place, lines, ledger);
} else if (arg.render) {
  commandRender(place, lines, ledger);
} else if (arg.plan) {
  process.exit(commandPlan(place, lines, ledger));
} else {
  commandShow(place, lines, ledger);
}
