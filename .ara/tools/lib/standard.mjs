/**
 * Der Standard: eine App steht auf der Bibliothek, nicht neben ihr.
 *
 * Ohne Zwang sehen die Apps eines Partners nach drei Monaten alle anders aus,
 * und das einheitliche Bild ist weg. Der Wächter des Produkts prüft nur die
 * Shell, das Gerät vergleicht das Manifestfeld `marken` ausdrücklich nicht:
 * wenn der Standard irgendwo gehalten wird, dann hier, beim Bauen mit dem Kit.
 *
 * Gemessen wird der eigene Quelltext der Oberfläche, also `frontend/` ohne den
 * Spiegel `src/marken/`: der gehört dem Produkt, und ob er stimmt, sagt
 * `marken.mjs` über seine Hashes. Vier Fragen:
 *
 *   eigene Farben        Hex, rgb(), hsl(), oklch() außerhalb von theme.css
 *   Palettenklassen      bg-red-500 statt der Tokens bg-primary, border-border
 *   eigene Primitive     <h1>, <table>, <dialog>, <fieldset>, role="tab..."
 *                        statt Kopf, Table/Datenliste, Dialog, Feldgruppe, Tabs
 *   das Feld `marken`    trägt die App die Kopie der Bibliothek, muss das
 *                        Manifest das Feld führen, und es muss die Fassung
 *                        der Kopie nennen. Das Feld ohne Kopie ist ebenso rot
 *
 * **Ein fremder Container ist ausgenommen.** Eine App ohne `frontend` im
 * Manifest, mit fertigem `image` statt eines eigenen Baus, bringt keine
 * Oberfläche mit, die neben der des Geräts stehen könnte.
 *
 * Was hier steht, liest und urteilt in Sätzen, mehr nicht. Rot machen die
 * Aufrufer daraus: `app.mjs` vor Bau und Einspielen, der Selbsttest an der
 * Vorlage.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, posix, relative, sep } from "node:path";
import { t } from "./i18n.mjs";
import { readLibrary } from "./marken.mjs";

/** Woran gemessen wird: die Quelldateien der Oberfläche. */
const SOURCE = /\.(ts|tsx|js|jsx|css|html)$/;

/** Was beim Sammeln übersprungen wird: fremdes Gut und Ergebnisse. */
const SKIP_DIRS = new Set(["node_modules", "dist", "build"]);

/** Der Spiegel der Bibliothek, relativ zum Frontendordner. Er gehört dem Produkt. */
const LIBRARY_MIRROR = "src/marken";

/** Ein Farbwert, wie er nur in theme.css stehen darf. */
const COLOR_VALUE = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![0-9a-zA-Z_-])|\b(?:rgba?|hsla?|oklch|oklab)\(/g;

/** Eine Tailwind-Farbklasse aus der Palette, keine aus den Tokens. */
const PALETTE_CLASS =
  /\b(?:bg|text|border|ring|outline|fill|stroke|divide|decoration|accent|caret|placeholder|shadow|from|via|to)-(?:(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}|white|black)\b/g;

/**
 * Die eigenen Primitive, jedes mit dem Teil der Bibliothek, das an seine
 * Stelle gehört. Die Muster stehen so im Markup, wie jemand sie hinschriebe,
 * der die Bibliothek nicht kennt.
 */
const OWN_PRIMITIVES = [
  { muster: /<h1[\s>/]/, was: "<h1>", statt: "Kopf" },
  { muster: /<table[\s>/]/, was: "<table>", statt: "Table, Datenliste" },
  { muster: /<dialog[\s>/]|role=["']dialog["']/, was: "<dialog>", statt: "Dialog" },
  { muster: /<fieldset[\s>/]/, was: "<fieldset>", statt: "Feldgruppe" },
  { muster: /role=["']tab(?:list)?["']/, was: 'role="tablist"', statt: "Tabs" },
];

/**
 * Fremder Container: kein Frontend im Manifest, ein fertiges Image, kein
 * eigener Bau. So eine App bringt keine Oberfläche mit, und der Standard der
 * Oberfläche sagt über sie nichts.
 */
export function standardExempt(manifest) {
  return Boolean(
    manifest &&
      typeof manifest === "object" &&
      !manifest.frontend &&
      manifest.backend?.image &&
      !manifest.backend?.bauen?.verzeichnis
  );
}

/**
 * Kommentare raus, bevor gemessen wird. In einem Kommentar ist `#e11d48` ein
 * Beispiel und kein Verstoß, und die Vorlage selbst erklärt die Regel in
 * ihren Kommentaren mit genau solchen Werten.
 */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/gm, "$1");
}

/** Jede eigene Quelldatei der Oberfläche, als Pfad relativ zum App-Ordner. */
function sourceFiles(front) {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith(".")) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        if (relative(front, path).split(sep).join(posix.sep) === LIBRARY_MIRROR) continue;
        walk(path);
        continue;
      }
      if (entry.isFile() && SOURCE.test(entry.name)) out.push(path);
    }
  };
  if (existsSync(front) && statSync(front).isDirectory()) walk(front);
  return out;
}

/**
 * Was die Prüfung am Standard bei dieser App misst: wie viele Quelldateien der
 * Oberfläche, und ob sie ganz ausgenommen ist. Damit sagt `--build`, dass sie
 * lief und worüber, statt still nichts zu finden.
 */
export function standardScope(dir, { manifest = undefined } = {}) {
  const found = manifest === undefined ? readManifest(dir) : manifest;
  if (standardExempt(found)) return { exempt: true, files: 0 };
  return { exempt: false, files: sourceFiles(join(dir, "frontend")).length };
}

/** Das Manifest neben dem Ordner, oder `null`. Unlesbares meldet eine andere Stelle. */
function readManifest(dir) {
  const path = join(dir, "app.json");
  if (!existsSync(path)) return null;
  try {
    const manifest = JSON.parse(readFileSync(path, "utf8"));
    return manifest && typeof manifest === "object" ? manifest : null;
  } catch {
    return null;
  }
}

/**
 * Was an einer App am Standard vorbeigeht. Eine Liste von Sätzen, leer heißt gut.
 *
 * `scaffold` sagt, dass die Vorlage selbst gemessen wird: in ihr ist
 * `{{marken}}` der Platzhalter, den `--new` mit der Fassung der Kopie füllt,
 * und genau so gehört er dort hin.
 */
export function standardFindings(dir, { manifest = undefined, scaffold = false } = {}) {
  const found = manifest === undefined ? readManifest(dir) : manifest;
  if (standardExempt(found)) return [];

  const out = [];
  const front = join(dir, "frontend");

  for (const path of sourceFiles(front)) {
    const name = relative(dir, path).split(sep).join(posix.sep);
    const text = stripComments(readFileSync(path, "utf8"));

    const farben = [...new Set((text.match(COLOR_VALUE) || []).map((wert) => wert.replace(/\($/, "(...)")))];
    if (farben.length) {
      out.push(
        t(
          `\`${name}\` carries its own colour value: ${farben.join(", ")}. Values live in the library's theme.css, a rule of the app takes a token: var(--ara-...) or a token class like bg-primary.`,
          `\`${name}\` trägt einen eigenen Farbwert: ${farben.join(", ")}. Werte stehen in der theme.css der Bibliothek, eine Regel der App nimmt eine Marke: var(--ara-...) oder eine Token-Klasse wie bg-primary.`
        )
      );
    }

    const klassen = [...new Set(text.match(PALETTE_CLASS) || [])];
    if (klassen.length) {
      out.push(
        t(
          `\`${name}\` uses a Tailwind palette colour: ${klassen.join(", ")}. Only the tokens of the theme apply: bg-primary, text-muted-foreground, border-border. A palette value stands still at the next theme.`,
          `\`${name}\` benutzt eine Tailwind-Palettenfarbe: ${klassen.join(", ")}. Es gelten nur die Tokens des Themas: bg-primary, text-muted-foreground, border-border. Ein Palettenwert bleibt beim nächsten Thema stehen.`
        )
      );
    }

    if (/\.(tsx|jsx|html)$/.test(name)) {
      for (const { muster, was, statt } of OWN_PRIMITIVES) {
        if (muster.test(text)) {
          out.push(
            t(
              `\`${name}\` builds its own ${was}. That is a part of the library: ${statt} out of @marken.`,
              `\`${name}\` baut ein eigenes ${was}. Das ist ein Teil der Bibliothek: ${statt} aus @marken.`
            )
          );
        }
      }
    }
  }

  // Das Feld `marken` (Kontrakt 4): das Gerät vergleicht es ausdrücklich
  // nicht, also hält das Kit es hier an der Kopie in der App fest. Die Kopie
  // ist das Zeichen, dass die App auf dem Designsystem steht: wer sie trägt,
  // führt das Feld, und wer das Feld führt, trägt die Kopie. Ein fertiges
  // Frontend ohne beides bleibt außen vor, es ist nicht mit dem Kit gebaut.
  if (found?.frontend) {
    const mirror = join(front, "src", "marken");
    const hasMirror = existsSync(mirror) && statSync(mirror).isDirectory();
    const fassung = hasMirror ? readLibrary(mirror)?.fassung || null : null;
    const feld = typeof found.marken === "string" && found.marken ? found.marken : null;
    if (hasMirror && !feld) {
      out.push(
        t(
          "app.json carries no field `marken`. An app on the design system says which version it stands on; --new writes the field, marken.mjs --sync keeps it current.",
          "app.json trägt kein Feld `marken`. Eine App auf dem Designsystem sagt, auf welcher Fassung sie steht; --new schreibt das Feld, marken.mjs --sync hält es aktuell."
        )
      );
    } else if (feld && !(scaffold && feld === "{{marken}}")) {
      if (!fassung) {
        out.push(
          t(
            `app.json names marken ${feld}, but under frontend/src/marken lies no library. --new lays the copy down, marken.mjs --sync pulls it up.`,
            `app.json nennt marken ${feld}, aber unter frontend/src/marken liegt keine Bibliothek. --new legt die Kopie hin, marken.mjs --sync zieht sie nach.`
          )
        );
      } else if (feld !== fassung) {
        out.push(
          t(
            `app.json names marken ${feld}, the library's copy in the app stands at ${fassung}. node .ara/tools/marken.mjs --sync pulls both together.`,
            `app.json nennt marken ${feld}, die Kopie der Bibliothek in der App steht auf ${fassung}. node .ara/tools/marken.mjs --sync zieht beides zusammen.`
          )
        );
      }
    }
  }

  return out;
}

// --- Anrede ------------------------------------------------------------------

/**
 * Das Gerät redet seine Menschen mit Sie an. Eine App, die duzt, steht damit
 * auf derselben Karte neben ihm: „Eine Freigabe wartet auf Ihre Entscheidung",
 * darunter „liest du in Abschluss". So stand es am 26.09.2026 auf der
 * Freigabekarte eines Partners einer Steuerkanzlei. Eine App redet an wie das
 * Gerät, mit Sie, oder sie formuliert ohne Anrede.
 */
const DUZEN = /\b(du|dir|dich|dein|deine|deinem|deinen|deiner|deines)\b/i;

/**
 * Die Texte, die ein Mensch zu sehen bekommt, aus einer Quelldatei: Text in
 * JSX und Zeichenketten mit einem Leerzeichen darin. Ein Pfad, eine Klasse, ein
 * Schlüssel hat keines, und `dir` als Name einer Variablen steht in keiner
 * Zeichenkette.
 */
function surfaceTexts(text, jsx) {
  const out = [];
  const zeile = (index) => text.slice(0, index).split("\n").length;
  for (const treffer of text.matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)) {
    const inhalt = treffer[1] ?? treffer[2] ?? treffer[3] ?? "";
    if (/\s/.test(inhalt.trim())) out.push({ zeile: zeile(treffer.index), inhalt });
  }
  if (jsx) {
    for (const treffer of text.matchAll(/>([^<>{}]*[A-Za-zÄÖÜäöüß][^<>{}]*)</g)) {
      out.push({ zeile: zeile(treffer.index), inhalt: treffer[1] });
    }
  }
  return out;
}

/**
 * Wo eine App ihre Menschen duzt: in der Oberfläche, in den Sätzen des Backends,
 * die dort ankommen, und in ihren Flows, deren Titel und Kontext auf der
 * Freigabekarte des Geräts stehen. Eine Liste von Sätzen, leer heißt gut. Der
 * Spiegel der Bibliothek zählt nicht mit, er gehört dem Produkt.
 */
export function addressFindings(dir) {
  const out = [];
  const dateien = [...sourceFiles(join(dir, "frontend"))];
  const back = join(dir, "backend");
  if (existsSync(back) && statSync(back).isDirectory()) {
    for (const name of readdirSync(back, { recursive: true })) {
      const pfad = join(back, String(name));
      if (/(^|[\\/])(node_modules|dist|build)([\\/]|$)/.test(String(name))) continue;
      if (/\.(mjs|js|ts)$/.test(String(name)) && statSync(pfad).isFile()) dateien.push(pfad);
    }
  }
  for (const pfad of dateien) {
    const name = relative(dir, pfad).split(sep).join(posix.sep);
    const text = stripComments(readFileSync(pfad, "utf8"));
    for (const { zeile, inhalt } of surfaceTexts(text, /\.(tsx|jsx|html)$/.test(name))) {
      const wort = inhalt.match(DUZEN);
      if (wort) out.push({ datei: name, zeile, wort: wort[0], text: inhalt.trim().replace(/\s+/g, " ").slice(0, 90) });
    }
  }
  const flows = join(dir, "flows");
  if (existsSync(flows) && statSync(flows).isDirectory()) {
    for (const eintrag of readdirSync(flows).filter((n) => n.endsWith(".md")).sort()) {
      const zeilen = readFileSync(join(flows, eintrag), "utf8").split("\n");
      zeilen.forEach((inhalt, i) => {
        const wort = inhalt.match(DUZEN);
        if (wort) out.push({ datei: `flows/${eintrag}`, zeile: i + 1, wort: wort[0], text: inhalt.trim().slice(0, 90) });
      });
    }
  }
  return out;
}

/** Die Befunde zur Anrede als Abschnitt für `--check` und `--build`, leer, wenn nichts auffiel. */
export function addressSection(dir) {
  const befunde = addressFindings(dir);
  if (!befunde.length) return [];
  return [
    "",
    t(
      `Address: the device says Sie to its people, this app says du in ${befunde.length} ${befunde.length === 1 ? "place" : "places"}. Write Sie, or phrase it without address:`,
      `Anrede: das Gerät siezt seine Menschen, diese App duzt an ${befunde.length} ${befunde.length === 1 ? "Stelle" : "Stellen"}. Mit Sie schreiben, oder ohne Anrede:`
    ),
    ...befunde.map((b) => `- ${b.datei}:${b.zeile} „${b.wort}": ${b.text}`),
  ];
}
