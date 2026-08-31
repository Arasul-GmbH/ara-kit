#!/usr/bin/env node
/**
 * Paper to PDF: Markdown in, PDF in the house style out.
 *
 * A customer gets their offer as a PDF, not as Markdown. This tool makes a
 * sendable document out of a filled-in template.
 *
 * **It refuses as long as a placeholder is still in it.** An offer with
 * "{Betrag} Euro" at the customer is the mistake this tool prevents.
 *
 * Printing happens with the Chromium that Playwright brings along anyway. No new
 * dependency, no npm install.
 *
 *   node .ara/tools/pdf.mjs .ara/vorlagen/angebot.md
 *   node .ara/tools/pdf.mjs <file.md> --out <file.pdf>
 *   node .ara/tools/pdf.mjs <file.md> --check      only check, do not print
 *   node .ara/tools/pdf.mjs <file.md> --force      print despite placeholders
 *   node .ara/tools/pdf.mjs <file.md> --keep-notes print the template notes too
 *   node .ara/tools/pdf.mjs <file.md> --html       write HTML instead of printing
 *   node .ara/tools/pdf.mjs --browser              which Chromium gets used
 *
 * What never lands in the PDF:
 *   - HTML comments. The checklists stand there, and nobody but you reads them.
 *   - The frontmatter. That is the machine-readable side of a document, an invoice
 *     for instance, and not a line for the customer.
 *   - The note blocks of the template, so every quote line before the first
 *     heading. With --keep-notes they stay in.
 *
 * === deutsch ===
 *
 * Papier zu PDF: Markdown rein, PDF im Hausstil raus.
 *
 * Ein Kunde bekommt sein Angebot als PDF, nicht als Markdown. Dieses Werkzeug
 * macht aus einer gefuellten Vorlage ein versandfaehiges Dokument.
 *
 * **Es weigert sich, solange noch ein Platzhalter drinsteht.** Ein Angebot mit
 * "{Betrag} Euro" beim Kunden ist der Fehler, den dieses Werkzeug verhindert.
 *
 * Gedruckt wird mit dem Chromium, das Playwright ohnehin mitbringt. Keine neue
 * Abhaengigkeit, kein npm install.
 *
 *   node .ara/tools/pdf.mjs .ara/vorlagen/angebot.md
 *   node .ara/tools/pdf.mjs <datei.md> --out <datei.pdf>
 *   node .ara/tools/pdf.mjs <datei.md> --check      nur pruefen, nicht drucken
 *   node .ara/tools/pdf.mjs <datei.md> --force      trotz Platzhalter drucken
 *   node .ara/tools/pdf.mjs <datei.md> --keep-notes Vorlagenhinweise mitdrucken
 *   node .ara/tools/pdf.mjs <datei.md> --html       HTML schreiben statt drucken
 *   node .ara/tools/pdf.mjs --browser              welcher Chromium wird genommen
 *
 * Was nie im PDF landet:
 *   - HTML-Kommentare. Dort stehen die Prueflisten, die niemand ausser dir liest.
 *   - Das Frontmatter. Das ist die maschinenlesbare Seite eines Belegs, etwa
 *     einer Rechnung, und keine Zeile fuer den Kunden.
 *   - Die Hinweisbloecke der Vorlage, also alle Zitatzeilen vor der ersten
 *     Ueberschrift. Mit --keep-notes bleiben sie drin.
 */

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, extname, join, resolve } from "node:path";
import { t } from "./lib/i18n.mjs";
import { BUSINESS, ROOT, helpOnly, parseArgs, readFrontmatter } from "./lib/kit.mjs";

helpOnly(import.meta.url);
const arg = parseArgs();

// parseArgs() kann nicht wissen, welche Schalter einen Wert nehmen. Steht die
// Datei hinter einem Schalter ohne Wert, landet sie sonst als dessen Wert.
for (const flag of ["check", "force", "keep-notes", "browser", "html"]) {
  if (typeof arg[flag] === "string") {
    arg._.push(arg[flag]);
    arg[flag] = true;
  }
}

// --- Chromium finden --------------------------------------------------------

/** Alle Unterordner, die zu einem Muster passen, neueste Fassung zuerst. */
function matchingDirs(parent, prefix) {
  if (!existsSync(parent)) return [];
  return readdirSync(parent, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix))
    .map((entry) => join(parent, entry.name))
    .sort()
    .reverse();
}

/**
 * Sucht den Chromium, mit dem gedruckt wird. Reihenfolge mit Absicht:
 * erst die ausdrueckliche Vorgabe, dann der von Playwright mitgebrachte,
 * dann ein im System vorhandener Browser.
 */
function findBrowser() {
  if (process.env.ARA_CHROMIUM) {
    if (!existsSync(process.env.ARA_CHROMIUM)) {
      throw new Error(
        t(
          `ARA_CHROMIUM points at ${process.env.ARA_CHROMIUM}, nothing lies there.`,
          `ARA_CHROMIUM zeigt auf ${process.env.ARA_CHROMIUM}, dort liegt nichts.`
        )
      );
    }
    return { path: process.env.ARA_CHROMIUM, source: "ARA_CHROMIUM" };
  }

  const home = homedir();
  const caches = [
    join(home, "Library", "Caches", "ms-playwright"), // macOS
    join(home, ".cache", "ms-playwright"), // Linux
    process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "ms-playwright") : null,
    process.env.PLAYWRIGHT_BROWSERS_PATH || null,
  ].filter(Boolean);

  // Playwright legt je Fassung einen eigenen Ordner an. Der headless-shell ist
  // schlanker und startet schneller, taugt fuer den Druck genauso.
  const inside = [
    join("chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"),
    join("chrome-mac-arm64", "Chromium.app", "Contents", "MacOS", "Chromium"),
    join("chrome-linux", "chrome"),
    join("chrome-linux", "headless_shell"),
    join("chrome-win", "chrome.exe"),
    join("chrome-headless-shell-mac", "chrome-headless-shell"),
    join("chrome-headless-shell-mac-arm64", "chrome-headless-shell"),
    join("chrome-headless-shell-linux", "chrome-headless-shell"),
    join("chrome-headless-shell-win", "chrome-headless-shell.exe"),
  ];

  for (const cache of caches) {
    for (const prefix of ["chromium-", "chromium_headless_shell-", "chrome-headless-shell-"]) {
      for (const dir of matchingDirs(cache, prefix)) {
        for (const tail of inside) {
          const candidate = join(dir, tail);
          if (existsSync(candidate)) return { path: candidate, source: "Playwright" };
        }
      }
    }
  }

  const system = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/microsoft-edge",
  ];
  for (const candidate of system) {
    if (existsSync(candidate)) return { path: candidate, source: "System" };
  }

  throw new Error(
    t(
      "No Chromium found. Playwright brings one along, it has only not been fetched " +
        "here yet:\n    npx playwright install chromium\n" +
        "Or set the path to an existing Chrome: ARA_CHROMIUM=/path/to/browser",
      "Kein Chromium gefunden. Playwright bringt einen mit, er ist hier nur noch nicht " +
        "geholt worden:\n    npx playwright install chromium\n" +
        "Oder den Pfad zu einem vorhandenen Chrome setzen: ARA_CHROMIUM=/pfad/zum/browser"
    )
  );
}

if (arg.browser) {
  try {
    const found = findBrowser();
    console.log(`${found.path}\n` + t(`Origin: ${found.source}`, `Herkunft: ${found.source}`));
    process.exit(0);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

// --- Eingabe ----------------------------------------------------------------

const source = arg._[0];
if (!source) {
  console.error(
    t(
      "The file is missing. Example:\n" +
        "    node .ara/tools/pdf.mjs customers/mueller/documents/2026-08-25-angebot.md",
      "Es fehlt die Datei. Beispiel:\n" +
        "    node .ara/tools/pdf.mjs customers/mueller/documents/2026-08-25-angebot.md"
    )
  );
  process.exit(1);
}

const sourcePath = resolve(source);
if (!existsSync(sourcePath)) {
  console.error(t(`${source} does not exist.`, `${source} gibt es nicht.`));
  process.exit(1);
}

const raw = readFileSync(sourcePath, "utf8");

// --- Aufraeumen: was nicht zum Kunden gehoert -------------------------------

/** HTML-Kommentare weg. Dort stehen die Prueflisten. */
function stripComments(text) {
  return text.replace(/<!--[\s\S]*?-->/g, "");
}

/**
 * Das Frontmatter weg. Es ist die maschinenlesbare Seite eines Belegs und
 * gehoert nicht ins Papier: gedruckt saehe der Kunde sonst zuerst eine Liste
 * von Feldnamen. Ohne diesen Schnitt wuerde auch der Hinweisblock der Vorlage
 * stehenbleiben, denn der steht dann nicht mehr am Anfang der Datei.
 */
function stripFrontmatter(text) {
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---[ \t]*(\r?\n|$)/, "");
}

/**
 * Die Hinweisbloecke der Vorlage weg: alle Zitatzeilen vor der ersten
 * Ueberschrift, samt der Trennlinie, die sie abschliesst. Zitate mitten im
 * Dokument bleiben stehen, das sind echte Zitate.
 */
function stripPreambleNotes(text) {
  const lines = text.split(/\r?\n/);
  let cut = 0;
  let sawNote = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^#{1,6}\s/.test(line)) break;
    if (line.startsWith(">")) {
      sawNote = true;
      cut = i + 1;
      continue;
    }
    if (sawNote && (line === "" || /^(---+|\*\*\*+)$/.test(line))) {
      cut = i + 1;
      continue;
    }
    if (line === "") continue;
    break;
  }
  return sawNote ? lines.slice(cut).join("\n") : text;
}

let content = stripFrontmatter(stripComments(raw));
if (!arg["keep-notes"]) content = stripPreambleNotes(content);
content = content.replace(/^\s*\n+/, "");

// --- Platzhalter: der eigentliche Zweck der Pruefung ------------------------

/**
 * Sucht {...} in dem Text, der wirklich gedruckt wird. Was in einem
 * HTML-Kommentar oder im Hinweisblock stand, ist hier schon weg und zaehlt
 * darum nicht als Platzhalter.
 *
 * **Ueber Zeilengrenzen hinweg**, denn die laengsten Platzhalter der Vorlagen
 * sind ganze Anweisungssaetze und stehen darum umgebrochen da. Eine Suche je
 * Zeile findet genau die nicht und laesst sie beim Kunden landen.
 */
function findPlaceholders(text) {
  const found = [];
  for (const match of text.matchAll(/\{[^{}]+\}/g)) {
    const line = text.slice(0, match.index).split(/\r?\n/).length;
    // Umgebrochene Platzhalter einzeilig zeigen, sonst zerfaellt die Meldung.
    const flat = match[0].replace(/\s+/g, " ");
    found.push({
      line,
      text: flat.length > 72 ? `${flat.slice(0, 69)}...` : flat,
    });
  }
  return found;
}

const placeholders = findPlaceholders(content);

if (placeholders.length > 0) {
  console.error(
    t(
      `${placeholders.length} unfilled placeholders in ${basename(sourcePath)}:`,
      `${placeholders.length} ungefüllte Platzhalter in ${basename(sourcePath)}:`
    )
  );
  for (const hit of placeholders) {
    console.error(t(`  line ${hit.line}: ${hit.text}`, `  Zeile ${hit.line}: ${hit.text}`));
  }
  console.error(
    t(
      "\nEvery one of them would land at the customer like that. Fill them in, then try again.",
      "\nJeder davon würde so beim Kunden landen. Füllen, dann noch einmal."
    )
  );
  if (!arg.force) {
    console.error(
      t("If a placeholder stays on purpose: --force.", "Wenn ein Platzhalter absichtlich stehen bleibt: --force.")
    );
    process.exit(1);
  }
  console.error(t("--force is set, it gets printed anyway.\n", "--force gesetzt, es wird trotzdem gedruckt.\n"));
} else {
  console.log(t(`No placeholders in ${basename(sourcePath)}.`, `Keine Platzhalter in ${basename(sourcePath)}.`));
}

if (arg.check) {
  process.exit(placeholders.length > 0 ? 1 : 0);
}

// --- Markdown zu HTML -------------------------------------------------------

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Auszeichnung innerhalb einer Zeile. Code zuerst, damit darin nichts wirkt. */
function inline(text) {
  const codes = [];
  let out = text.replace(/`([^`]+)`/g, (_, code) => {
    codes.push(code);
    return ` ${codes.length - 1} `;
  });

  out = escapeHtml(out);
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^\w*])\*([^*\n]+)\*(?=[^\w*]|$)/g, "$1<em>$2</em>");
  out = out.replace(/(^|[^\w_])_([^_\n]+)_(?=[^\w_]|$)/g, "$1<em>$2</em>");
  out = out.replace(
    / (\d+) /g,
    (_, index) => `<code>${escapeHtml(codes[Number(index)])}</code>`
  );
  return out;
}

/**
 * Harter Zeilenumbruch innerhalb eines Absatzes: Rueckstrich oder zwei
 * Leerzeichen am Zeilenende. Ohne ihn wird der Briefkopf und die Anschrift des
 * Empfaengers zu einer durchlaufenden Zeile, und der Brief ist keiner mehr.
 * Der Rueckstrich ist die verlaessliche Form, zwei Leerzeichen entfernt jeder
 * zweite Editor beim Speichern.
 */
const HARD_BREAK = "";
const isHardBreak = (raw) => /(\\|[ \t]{2})$/.test(raw.replace(/\r$/, ""));

/**
 * Eine Tabellenzeile in Zellen zerlegen, aussere Striche weg.
 *
 * **Getrennt wird nur am unmaskierten Strich.** Ein Strich, der zum Text
 * gehoert, wird in Markdown als `\|` geschrieben, und das ist die einzige
 * Schreibweise, mit der er ueberhaupt in einer Tabelle stehen kann. Wer hier
 * naiv an jedem Strich trennt, macht aus
 * `{direkt \| Vermittlungsnetz \| nicht eingerichtet}` vier Spalten in einer
 * zweispaltigen Tabelle: dann hilft dem Schreibenden die richtige Schreibweise
 * nichts mehr. Genau dieser Fehler stand am 26.08.2026 in
 * `.ara/nachweise/datenverarbeitung.md` und in Arasuls `dokument-pdf.py`.
 *
 * Die Maskierung faellt dabei weg, im Papier steht der Strich selbst.
 */
function cells(line) {
  return line
    .replace(/^\s*\|/, "")
    .replace(/(?<!\\)\|\s*$/, "")
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replace(/\\\|/g, "|"));
}

const isTableRow = (line) => /^\s*\|/.test(line);
const isTableRule = (line) => /^\s*\|[\s:|-]+\|?\s*$/.test(line) && line.includes("-");

/** Kaestchen aus "- [ ]" und "- [x]" als Zeichen, damit sie im PDF sichtbar sind. */
function checkbox(text) {
  const match = text.match(/^\[( |x|X)\]\s*(.*)$/);
  if (!match) return null;
  const mark = match[1] === " " ? "☐" : "☑";
  return `<span class="box">${mark}</span> ${inline(match[2])}`;
}

function renderMarkdown(text) {
  const lines = text.split(/\r?\n/);
  const html = [];
  let i = 0;

  // Rohzeilen, damit der harte Umbruch am Zeilenende noch erkennbar ist.
  const paragraph = [];
  const flush = () => {
    if (paragraph.length === 0) return;
    const joined = paragraph
      .map((raw, index) => {
        const text = raw.trim().replace(/\\$/, "");
        if (index === paragraph.length - 1) return text;
        return text + (isHardBreak(raw) ? HARD_BREAK : " ");
      })
      .join("");
    html.push(`<p>${inline(joined).replaceAll(HARD_BREAK, "<br>")}</p>`);
    paragraph.length = 0;
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") {
      flush();
      i++;
      continue;
    }

    // Abgezaeunter Codeblock. Muss vor allem anderen stehen, sonst wird sein
    // Inhalt als Markdown gelesen. Ein Messbefehl in einer Anlage gehoert Zeile
    // fuer Zeile ins Papier, nicht zu einer Zeile zusammengezogen.
    const fence = trimmed.match(/^(```+|~~~+)(.*)$/);
    if (fence) {
      flush();
      const marker = fence[1][0].repeat(3);
      const block = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(marker)) {
        block.push(lines[i]);
        i++;
      }
      i++; // schliessende Zaunzeile
      html.push(`<pre><code>${escapeHtml(block.join("\n"))}</code></pre>`);
      continue;
    }

    // Trennlinie
    if (/^(---+|\*\*\*+|___+)$/.test(trimmed)) {
      flush();
      html.push("<hr>");
      i++;
      continue;
    }

    // Ueberschrift
    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flush();
      const level = heading[1].length;
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    // Tabelle
    if (isTableRow(line)) {
      flush();
      const block = [];
      while (i < lines.length && isTableRow(lines[i])) block.push(lines[i++]);

      const hasHead = block.length > 1 && isTableRule(block[1]);
      const head = hasHead ? cells(block[0]) : null;
      const body = block.slice(hasHead ? 2 : 0).filter((row) => !isTableRule(row));

      html.push("<table>");
      if (head) {
        html.push(
          `<thead><tr>${head.map((cell) => `<th>${inline(cell)}</th>`).join("")}</tr></thead>`
        );
      }
      html.push("<tbody>");
      for (const row of body) {
        html.push(
          `<tr>${cells(row).map((cell) => `<td>${inline(cell)}</td>`).join("")}</tr>`
        );
      }
      html.push("</tbody></table>");
      continue;
    }

    // Zitat
    if (/^\s*>/.test(line)) {
      flush();
      const block = [];
      while (i < lines.length && (/^\s*>/.test(lines[i]) || (block.length && lines[i].trim() !== "" && !/^\s*>/.test(lines[i]) === false))) {
        if (!/^\s*>/.test(lines[i])) break;
        block.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      html.push(`<blockquote>${renderMarkdown(block.join("\n"))}</blockquote>`);
      continue;
    }

    // Liste, geordnet oder nicht
    const bullet = trimmed.match(/^([-*+]|\d+\.)\s+(.*)$/);
    if (bullet) {
      flush();
      const ordered = /^\d+\./.test(bullet[1]);
      const items = [];
      while (i < lines.length) {
        const item = lines[i].trim().match(/^([-*+]|\d+\.)\s+(.*)$/);
        if (!item) {
          // Fortsetzungszeile einer eingerueckten Listenzeile
          if (items.length && /^\s{2,}\S/.test(lines[i])) {
            items[items.length - 1] += ` ${lines[i].trim()}`;
            i++;
            continue;
          }
          break;
        }
        if (/^\d+\./.test(item[1]) !== ordered) break;
        items.push(item[2]);
        i++;
      }
      const tag = ordered ? "ol" : "ul";
      const rendered = items.map((item) => {
        const box = checkbox(item);
        return box ? `<li class="task">${box}</li>` : `<li>${inline(item)}</li>`;
      });
      html.push(`<${tag}>${rendered.join("")}</${tag}>`);
      continue;
    }

    paragraph.push(trimmed);
    i++;
  }

  flush();
  return html.join("\n");
}

// --- Hausstil ---------------------------------------------------------------

/** Logo aus business/company.md, falls eines hinterlegt und vorhanden ist. */
function logoTag() {
  const companyFile = join(BUSINESS, "company.md");
  const { fields } = readFrontmatter(companyFile);
  if (!fields.logo) return "";

  const path = resolve(fields.logo.startsWith("/") ? fields.logo : join(ROOT, fields.logo));
  if (!existsSync(path) || !statSync(path).isFile()) {
    console.error(
      t(
        `Note: logo in business/company.md points at ${fields.logo}, nothing lies there. Printed without a logo.`,
        `Hinweis: logo in business/company.md zeigt auf ${fields.logo}, dort liegt nichts. Ohne Logo gedruckt.`
      )
    );
    return "";
  }

  const types = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".webp": "image/webp" };
  const type = types[extname(path).toLowerCase()];
  if (!type) {
    console.error(
      t(
        `Note: ${extname(path)} as a logo is not supported. Printed without a logo.`,
        `Hinweis: ${extname(path)} als Logo wird nicht unterstützt. Ohne Logo gedruckt.`
      )
    );
    return "";
  }
  const data = readFileSync(path).toString("base64");
  return `<img class="logo" src="data:${type};base64,${data}" alt="">`;
}

const STYLE = `
@page { size: A4; margin: 20mm 18mm 18mm 18mm; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body {
  margin: 0;
  font-family: "Helvetica Neue", Helvetica, Arial, "Liberation Sans", sans-serif;
  font-size: 10.5pt;
  line-height: 1.55;
  color: #1a1a1a;
}
.logo { float: right; max-height: 18mm; max-width: 55mm; margin: 0 0 6mm 6mm; }
h1, h2, h3, h4, h5, h6 { line-height: 1.25; page-break-after: avoid; break-after: avoid; }
h1 { font-size: 17pt; margin: 0 0 5mm; letter-spacing: -0.01em; }
h2 { font-size: 12.5pt; margin: 8mm 0 2.5mm; padding-bottom: 1.2mm; border-bottom: 0.4pt solid #c8c8c8; }
h3 { font-size: 11pt; margin: 6mm 0 2mm; }
h4, h5, h6 { font-size: 10.5pt; margin: 5mm 0 1.5mm; }
p { margin: 0 0 3mm; orphans: 2; widows: 2; }
strong { font-weight: 600; }
a { color: #1a1a1a; text-decoration: none; border-bottom: 0.4pt solid #9a9a9a; }
code {
  font-family: "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 9pt;
  background: #f2f2f2;
  padding: 0 0.6mm;
  border-radius: 0.6mm;
}
pre {
  margin: 0 0 3.5mm;
  padding: 2mm 2.5mm;
  background: #f2f2f2;
  border-radius: 0.8mm;
  white-space: pre-wrap;
  page-break-inside: avoid;
  break-inside: avoid;
}
pre code { background: none; padding: 0; font-size: 8.8pt; }
ul, ol { margin: 0 0 3mm; padding-left: 6mm; }
li { margin-bottom: 1.2mm; }
li.task { list-style: none; margin-left: -5mm; }
.box { font-size: 11pt; margin-right: 1mm; }
table {
  width: 100%;
  border-collapse: collapse;
  margin: 0 0 4mm;
  font-size: 9.5pt;
  page-break-inside: avoid;
  break-inside: avoid;
}
th, td { border-bottom: 0.4pt solid #d4d4d4; padding: 1.6mm 2mm; text-align: left; vertical-align: top; }
th { background: #f2f2f2; font-weight: 600; border-bottom-width: 0.7pt; }
tbody tr:last-child td { border-bottom: none; }
blockquote {
  margin: 0 0 4mm;
  padding: 0 0 0 4mm;
  border-left: 1pt solid #c8c8c8;
  color: #3a3a3a;
}
blockquote p:last-child { margin-bottom: 0; }
hr { border: none; border-top: 0.4pt solid #c8c8c8; margin: 6mm 0; }
`;

const title = arg.title || basename(sourcePath, extname(sourcePath));
const document = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>${STYLE}</style>
</head>
<body>
${logoTag()}
${renderMarkdown(content)}
</body>
</html>
`;

// --- Drucken ----------------------------------------------------------------

const target = resolve(
  arg.out ||
    join(
      dirname(sourcePath),
      `${basename(sourcePath, extname(sourcePath))}.${arg.html ? "html" : "pdf"}`
    )
);

// --html: das Zwischenergebnis sichtbar machen, ohne Chromium. Dafuer da, dass
// man nachsehen kann, was gedruckt wuerde, statt es aus dem PDF zu erraten.
if (arg.html) {
  writeFileSync(target, document);
  console.log(
    t(
      `HTML written: ${target}\nNot printed, --html was set.`,
      `HTML geschrieben: ${target}\nNicht gedruckt, --html war gesetzt.`
    )
  );
  process.exit(0);
}

let browser;
try {
  browser = findBrowser();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const work = mkdtempSync(join(tmpdir(), "ara-pdf-"));
const page = join(work, "dokument.html");
writeFileSync(page, document);

try {
  const run = spawnSync(
    browser.path,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      `--user-data-dir=${join(work, "profil")}`,
      // Beide Schreibweisen: aeltere und neuere Chromium-Faelle kennen je eine.
      "--no-pdf-header-footer",
      "--print-to-pdf-no-header",
      "--run-all-compositor-stages-before-draw",
      "--virtual-time-budget=3000",
      `--print-to-pdf=${target}`,
      `file://${page}`,
    ],
    { encoding: "utf8", timeout: 120_000 }
  );

  if (run.error) {
    throw new Error(
      t(`Chromium could not be started: ${run.error.message}`, `Chromium ließ sich nicht starten: ${run.error.message}`)
    );
  }
  if (!existsSync(target)) {
    throw new Error(
      t(
        `Chromium wrote no PDF (status ${run.status}).`,
        `Chromium hat kein PDF geschrieben (Status ${run.status}).`
      ) + `${run.stderr ? `\n${run.stderr.trim()}` : ""}`
    );
  }

  const size = statSync(target).size;
  if (size === 0) throw new Error(t("The produced PDF is empty.", "Das erzeugte PDF ist leer."));

  console.log(
    t(
      `PDF written: ${target}\n${Math.round(size / 1024)} kB, printed with ${browser.source} Chromium.`,
      `PDF geschrieben: ${target}\n${Math.round(size / 1024)} kB, gedruckt mit ${browser.source}-Chromium.`
    )
  );
} catch (error) {
  console.error(error.message);
  process.exit(1);
} finally {
  rmSync(work, { recursive: true, force: true });
}
