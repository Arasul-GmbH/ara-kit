/**
 * Das Aussehen einer App: woher es kommt und wie es in die Vorlage gelangt.
 *
 * Eine App, die ein Partner baut, steht neben der Oberfläche von Arasul. Sie
 * soll dazu passen, und dafür braucht die Vorlage Farben, Radien und Schriften.
 * Das sind Werte des Produkts, also gilt dieselbe Regel wie überall: **die
 * Quelle ist der Spiegel**, nicht das Gedächtnis. `.ara/mirror/` trägt das
 * Artefakt, mit dem installiert wurde, und darin liegt die Datei, in der die
 * Marken des Designs stehen.
 *
 * Findet das Kit dort nichts, erfindet es keine Marke. Dann nimmt es die
 * Vorgabe, die mit dieser Fassung des Kits ausgeliefert wurde, und schreibt in
 * die erzeugte Datei, woher sie stammt und wie alt sie ist. Ein Partner sieht
 * damit im Quelltext seiner App, ob er das Aussehen des Geräts vor sich hat
 * oder den Stand des Kits.
 *
 * Reine Funktionen bis auf `readDesign`, das eine Datei liest.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Die Marken, die eine App braucht, mit der Vorgabe des Kits.
 *
 * Die Namen sind die Aussage dieser Liste: das Kit weiß, **welche** Marken es
 * setzt, und holt sich ihre **Werte** aus dem Spiegel. Die Werte hier sind der
 * Stand bei der Auslieferung dieses Kits, damit eine App auch ohne Spiegel
 * aussieht wie etwas und nicht wie ein unformatiertes Formular.
 */
export const DEFAULT_DARK = Object.freeze({
  background: "#0A0A0A",
  foreground: "#e6e6e6",
  card: "#121212",
  "card-foreground": "#e6e6e6",
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

/** Dasselbe für das helle Thema. */
export const DEFAULT_LIGHT = Object.freeze({
  background: "#F6F6F6",
  foreground: "#1a1a1a",
  card: "#FFFFFF",
  "card-foreground": "#1a1a1a",
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

/** Radien und Schriften. Sie stehen im Design an anderer Stelle als die Farben. */
export const DEFAULT_SHAPE = Object.freeze({
  "radius-sm": "6px",
  "radius-md": "8px",
  "radius-lg": "12px",
  "font-sans": "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
  "font-mono": "'JetBrains Mono', 'Fira Code', Menlo, Monaco, Consolas, monospace",
});

/** Ein Block einer CSS-Datei, vom Anfang des Wählers bis zur schließenden Klammer am Zeilenanfang. */
function block(css, selector) {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return "";
  const end = css.indexOf("\n}", start);
  return end < 0 ? css.slice(start) : css.slice(start, end);
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
 * Wo im Spiegel die Marken des Designs liegen können.
 *
 * Zuerst der Ort, an dem sie im Artefakt liegen, danach eine begrenzte Suche:
 * ein Artefakt kann anders geschnitten sein als das Repository, aus dem es
 * entsteht. Gesucht wird nur unter `apps/`, und nur bis in die zweite Ebene:
 * eine Suche über das ganze Artefakt wäre auf einem vollen Gerät minutenlang
 * unterwegs und fände am Ende irgendein `index.css`.
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
 * Das Design für eine neue App: was gilt, und woher es kommt.
 *
 * `source` ist die Antwort auf die Frage, die der Partner später stellt: sieht
 * meine App aus wie das Gerät oder wie das Kit? Sie steht als Satz im Kopf der
 * erzeugten Datei, nicht als Ja oder Nein in einem Protokoll.
 */
export function readDesign(mirror) {
  const file = mirror ? findCss(mirror) : null;
  if (!file) {
    return {
      source: "kit",
      file: null,
      dark: { ...DEFAULT_DARK },
      light: { ...DEFAULT_LIGHT },
      shape: { ...DEFAULT_SHAPE },
      missing: [],
    };
  }
  const css = readFileSync(file, "utf8");
  const dark = { ...DEFAULT_DARK, ...marks(block(css, ":root"), DEFAULT_DARK) };
  const light = { ...DEFAULT_LIGHT, ...marks(block(css, ".light"), DEFAULT_LIGHT) };
  const shape = { ...DEFAULT_SHAPE, ...marks(css, DEFAULT_SHAPE) };
  const found = marks(block(css, ":root"), DEFAULT_DARK);
  return {
    source: "mirror",
    file,
    dark,
    light,
    shape,
    // Was im Spiegel steht, gilt. Was dort fehlt, kommt aus der Vorgabe des
    // Kits, und genau das wird benannt statt stillschweigend ersetzt.
    missing: Object.keys(DEFAULT_DARK).filter((name) => !(name in found)),
  };
}

/** Die Marken als CSS, mit einem Kopf, der ihre Herkunft nennt. */
export function designCss(design, { date, version }) {
  const line = ([name, value]) => `  --${name}: ${value};`;
  const herkunft =
    design.source === "mirror"
      ? [
          ` * Übernommen aus dem Spiegel am ${date}${version ? `, Produktversion ${version}` : ""}.`,
          " * Das ist das Aussehen des Geräts, mit dem gearbeitet wurde.",
          ...(design.missing.length
            ? [
                ` * Nicht im Spiegel gefunden und aus der Vorgabe des Kits ergänzt:`,
                ` * ${design.missing.join(", ")}.`,
              ]
            : []),
        ]
      : [
          ` * Vorgabe des Kits, Stand ${date}. Es lag kein Spiegel vor.`,
          " * Sobald ein Gerät eingerichtet ist, steht das Aussehen in `.ara/mirror/`;",
          " * eine neue App übernimmt es dann von dort.",
        ];
  return [
    "/**",
    " * Die Marken des Arasul-Aussehens für diese App.",
    " *",
    ...herkunft,
    " *",
    " * Eine Farbe gehört in eine Marke, nicht in eine Regel: was hier steht, wird",
    " * beim nächsten Stand ersetzt, alles andere bleibt.",
    " */",
    "",
    ":root {",
    ...Object.entries(design.shape).map(line),
    "",
    ...Object.entries(design.dark).map(line),
    "}",
    "",
    "@media (prefers-color-scheme: light) {",
    "  :root {",
    ...Object.entries(design.light).map(([name, value]) => `  ${line([name, value])}`),
    "  }",
    "}",
    "",
  ].join("\n");
}
