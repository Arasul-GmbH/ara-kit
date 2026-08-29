/**
 * Das Aussehen einer App: woher es kommt und wie es in die Vorlage gelangt.
 *
 * Eine App, die ein Partner baut, laeuft im Rahmen der Oberflaeche von Arasul.
 * Sie soll dazu passen, und dafuer braucht die Vorlage Farben, Radien und
 * Schriften. Das sind Werte des Produkts, also gilt dieselbe Regel wie
 * ueberall: **die Quelle ist der Spiegel**, nicht das Gedaechtnis.
 * `.ara/mirror/` traegt das Artefakt, mit dem installiert wurde, und darin
 * liegt eine Datei, die diese Werte fuehrt:
 *
 *   `apps/*\/src/index.css`   die Werte, je Thema
 *
 * Die Bausteine, die diese Werte benutzen, liegen daneben unter
 * `packages/marken/src/`; um sie kuemmert sich `lib/marken.mjs`. Hier stehen
 * nur die Werte.
 *
 * Findet das Kit dort nichts, erfindet es keine Marke. Dann nimmt es die
 * Vorgabe, die mit dieser Fassung des Kits ausgeliefert wurde, und schreibt in
 * die erzeugte Datei, woher sie stammt und wie alt sie ist. Ein Partner sieht
 * damit im Quelltext seiner App, ob er das Aussehen des Geraets vor sich hat
 * oder den Stand des Kits.
 *
 * **Drei Themen, nicht zwei.** Das Geraet kennt heute Schwarz, Dunkel und
 * Hell und sagt das dem Rahmen ueber `data-theme` am `<html>` des
 * Elternfensters. Die App liest es dort und setzt es an ihrem eigenen `<html>`;
 * darum steht jedes Thema hier als eigener Block und nicht als Medienabfrage.
 * Die Medienabfrage bleibt trotzdem, fuer den Fall ohne Rahmen: dann sagt
 * niemand etwas, und die Einstellung des Betriebssystems ist die beste
 * Auskunft, die es gibt.
 *
 * Reine Funktionen bis auf `readDesign`, das eine Datei liest.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Die Marken, die eine App braucht, mit der Vorgabe des Kits.
 *
 * Die Namen sind die Aussage dieser Liste: das Kit weiss, **welche** Marken es
 * setzt, und holt sich ihre **Werte** aus dem Spiegel. Die Werte hier sind der
 * Stand bei der Auslieferung dieses Kits, damit eine App auch ohne Spiegel
 * aussieht wie etwas und nicht wie ein unformatiertes Formular.
 *
 * Das ist das Thema "Schwarz", die Vorgabe des Geraets.
 */
export const DEFAULT_DARK = Object.freeze({
  background: "#0A0A0A",
  foreground: "#e6e6e6",
  card: "#121212",
  "card-foreground": "#e6e6e6",
  popover: "#161616",
  muted: "#161616",
  "muted-foreground": "rgba(228, 228, 228, 0.55)",
  primary: "#81A1C1",
  "primary-foreground": "#0A0A0A",
  accent: "rgba(228, 228, 228, 0.07)",
  border: "rgba(228, 228, 228, 0.08)",
  input: "rgba(228, 228, 228, 0.1)",
  ring: "#81A1C1",
  destructive: "#EF4444",
  success: "#10B981",
  warning: "#F59E0B",
});

/**
 * Das Thema "Dunkel": dasselbe System, hellere Flaechen.
 *
 * Es traegt nur die Marken, die sich von Schwarz unterscheiden. Alles andere
 * erbt es, und genau so steht es auch im Geraet: ein Thema, das alle Werte
 * wiederholte, liefe beim naechsten Stand an einer Stelle auseinander.
 */
export const DEFAULT_DIM = Object.freeze({
  background: "#141414",
  card: "#181818",
  popover: "#1c1c1c",
  muted: "#181818",
});

/** Dasselbe fuer das helle Thema. Es setzt jede Marke, es kehrt alles um. */
export const DEFAULT_LIGHT = Object.freeze({
  background: "#F6F6F6",
  foreground: "#1a1a1a",
  card: "#FFFFFF",
  "card-foreground": "#1a1a1a",
  popover: "#FFFFFF",
  muted: "#ECECEC",
  "muted-foreground": "#6b6b6b",
  primary: "#2D8FD9",
  "primary-foreground": "#FFFFFF",
  accent: "rgba(16, 16, 16, 0.05)",
  border: "rgba(16, 16, 16, 0.10)",
  input: "rgba(16, 16, 16, 0.10)",
  ring: "#2D8FD9",
  destructive: "#EF4444",
  success: "#10B981",
  warning: "#F59E0B",
});

/**
 * Was nicht am Thema haengt: Radien, Schriften, Groessen, Abstaende, Zeit.
 *
 * Die Groessen und Abstaende sind die Dichteskala der Shell. Ohne sie faellt
 * `marken.css` auf seine eigenen Rueckfaelle zurueck, und die App stuende
 * neben einer Oberflaeche, die eine Stufe enger gesetzt ist.
 */
export const DEFAULT_SHAPE = Object.freeze({
  "radius-sm": "6px",
  "radius-md": "8px",
  "radius-lg": "12px",
  "font-sans": "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
  "font-mono": "'JetBrains Mono', 'Fira Code', Menlo, Monaco, Consolas, monospace",
  "text-ui-xs": "0.75rem",
  "text-ui-sm": "0.8125rem",
  "text-ui": "0.875rem",
  "text-ui-lg": "1rem",
  "text-3xl": "1.5rem",
  "spacing-ui-1": "0.3125rem",
  "spacing-ui-2": "0.625rem",
  "spacing-ui-3": "0.875rem",
  "spacing-ui-4": "1.125rem",
  "transition-base": "0.2s ease",
});

/** Die Themen, die eine erzeugte `design.css` traegt, in der Reihenfolge der Datei. */
export const THEMES = Object.freeze(["black", "dim", "light"]);

/**
 * Ein Block einer CSS-Datei, vom Anfang des Waehlers bis zur schliessenden
 * Klammer am Zeilenanfang. Der Waehler darf in beiden Anfuehrungszeichen
 * stehen: `[data-theme='dark']` und `[data-theme="dark"]` sind dasselbe, und
 * welche das Produkt gerade schreibt, ist keine Aussage.
 */
function block(css, selector) {
  const both = [selector, selector.replace(/'/g, '"')];
  for (const variant of both) {
    const start = css.indexOf(`${variant} {`);
    if (start < 0) continue;
    const end = css.indexOf("\n}", start);
    return end < 0 ? css.slice(start) : css.slice(start, end);
  }
  return "";
}

/** Die Marken aus einem Block, jeweils die erste Nennung. Kommentare fallen weg. */
function marks(text, wanted) {
  const found = {};
  for (const name of Object.keys(wanted)) {
    const match = text.match(new RegExp(`--${name.replace(/[-]/g, "\\-")}\\s*:\\s*([^;]+);`));
    if (!match) continue;
    const value = match[1].replace(/\/\*[\s\S]*?\*\//g, "").trim();
    if (value && !value.startsWith("var(")) found[name] = value;
  }
  return found;
}

/**
 * Wo im Spiegel die Marken des Designs liegen koennen.
 *
 * Zuerst der Ort, an dem sie im Artefakt liegen, danach eine begrenzte Suche:
 * ein Artefakt kann anders geschnitten sein als das Repository, aus dem es
 * entsteht. Gesucht wird nur unter `apps/`, und nur bis in die zweite Ebene:
 * eine Suche ueber das ganze Artefakt waere auf einem vollen Geraet
 * minutenlang unterwegs und faende am Ende irgendein `index.css`.
 */
function findCss(mirror) {
  const direct = join(mirror, "apps", "dashboard-frontend", "src", "index.css");
  if (existsSync(direct)) return direct;
  const apps = join(mirror, "apps");
  if (!existsSync(apps)) return null;
  for (const entry of readdirSync(apps, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const candidate = join(apps, entry.name, "src", "index.css");
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/**
 * Das Design fuer eine neue App: was gilt, und woher es kommt.
 *
 * `source` ist die Antwort auf die Frage, die der Partner spaeter stellt:
 * sieht meine App aus wie das Geraet oder wie das Kit? Sie steht als Satz im
 * Kopf der erzeugten Datei, nicht als Ja oder Nein in einem Protokoll.
 */
export function readDesign(mirror) {
  const file = mirror ? findCss(mirror) : null;
  if (!file) {
    return {
      source: "kit",
      file: null,
      dark: { ...DEFAULT_DARK },
      dim: { ...DEFAULT_DIM },
      light: { ...DEFAULT_LIGHT },
      shape: { ...DEFAULT_SHAPE },
      missing: [],
    };
  }
  const css = readFileSync(file, "utf8");
  const found = marks(block(css, ":root"), DEFAULT_DARK);
  return {
    source: "mirror",
    file,
    dark: { ...DEFAULT_DARK, ...found },
    // Dunkel und Hell sind Ueberschreibungen. Was das Geraet dort nicht nennt,
    // erbt es von Schwarz, und diese Datei tut dasselbe.
    dim: { ...DEFAULT_DIM, ...marks(block(css, "[data-theme='dark']"), DEFAULT_DARK) },
    light: { ...DEFAULT_LIGHT, ...marks(block(css, ".light"), DEFAULT_LIGHT) },
    shape: { ...DEFAULT_SHAPE, ...marks(css, DEFAULT_SHAPE) },
    // Was im Spiegel steht, gilt. Was dort fehlt, kommt aus der Vorgabe des
    // Kits, und genau das wird benannt statt stillschweigend ersetzt.
    missing: Object.keys(DEFAULT_DARK).filter((name) => !(name in found)),
  };
}

/** Die Marken als CSS, mit einem Kopf, der ihre Herkunft nennt. */
export function designCss(design, { date, version }) {
  const line = ([name, value]) => `  --${name}: ${value};`;
  const indented = (entry) => `  ${line(entry)}`;
  const herkunft =
    design.source === "mirror"
      ? [
          ` * Uebernommen aus dem Spiegel am ${date}${version ? `, Produktversion ${version}` : ""}.`,
          " * Das ist das Aussehen des Geraets, mit dem gearbeitet wurde.",
          ...(design.missing.length
            ? [
                ` * Nicht im Spiegel gefunden und aus der Vorgabe des Kits ergaenzt:`,
                ` * ${design.missing.join(", ")}.`,
              ]
            : []),
        ]
      : [
          ` * Vorgabe des Kits, Stand ${date}. Es lag kein Spiegel vor.`,
          " * Der Spiegel steht in `.ara/mirror/`, und dorthin holt ihn",
          " * `node .ara/tools/mirror.mjs --refresh`, auch ohne Installation.",
          " * Eine neue App uebernimmt das Aussehen dann von dort.",
        ];
  return [
    "/**",
    " * Die Marken des Arasul-Aussehens fuer diese App.",
    " *",
    ...herkunft,
    " *",
    " * Ein Thema je Block, gewaehlt ueber `data-theme` am `<html>`. Wer es",
    " * setzt, ist `rahmen/thema.ts`: es liest das Thema am Elternfenster ab.",
    " * Ohne Rahmen steht dort nichts, und dann gilt die Medienabfrage unten.",
    " *",
    " * Eine Farbe gehoert in eine Marke, nicht in eine Regel: was hier steht,",
    " * wird beim naechsten Stand ersetzt, alles andere bleibt.",
    " */",
    "",
    "/* Schwarz: die Vorgabe des Geraets. Alles andere ueberschreibt nur. */",
    ":root {",
    ...Object.entries(design.shape).map(line),
    "",
    ...Object.entries(design.dark).map(line),
    "}",
    "",
    "/* Dunkel: dasselbe System, hellere Flaechen. */",
    '[data-theme="dark"] {',
    ...Object.entries(design.dim).map(line),
    "}",
    "",
    "/* Hell. */",
    '[data-theme="light"] {',
    ...Object.entries(design.light).map(line),
    "}",
    "",
    "/* Ohne Rahmen sagt niemand, welches Thema gilt: dann entscheidet das",
    "   Betriebssystem. Sobald `data-theme` steht, greift dieser Block nicht",
    "   mehr, und die App folgt dem Geraet. */",
    "@media (prefers-color-scheme: light) {",
    "  :root:not([data-theme]) {",
    ...Object.entries(design.light).map(indented),
    "  }",
    "}",
    "",
  ].join("\n");
}
