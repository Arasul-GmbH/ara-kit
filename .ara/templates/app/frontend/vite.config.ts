import { cpSync, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Der Bau der Oberfläche.
 *
 * `base: "./"` macht jeden Verweis auf eine Datei relativ. Eine App hängt am
 * Gerät unter einem Pfad, den sie beim Bauen nicht kennt: live unter
 * `/apps/<kennung>/`, im Teststand unter `/apps/<kennung>/test/`. Ein
 * absoluter Verweis zeigte im Teststand auf den Livestand, und niemand sähe
 * es der Seite an. Woher der Router seinen Basispfad nimmt, steht in
 * `src/rahmen/basis.ts`.
 */

/**
 * `crossorigin` aus den erzeugten `<script>`- und `<link>`-Zeilen nehmen.
 *
 * Ein Gerät stellt sein Zertifikat selbst aus. Chrome lädt ein Modul mit
 * `crossorigin` dann im CORS-Modus, und der scheitert an einem Zertifikat, dem
 * der Browser nicht traut: die Seite bleibt leer, ohne Fehler in der Konsole.
 * Die Shell des Geräts nimmt das Attribut aus demselben Grund heraus.
 */
function ohneCrossOrigin(): Plugin {
  return {
    name: "ohne-crossorigin",
    enforce: "post",
    transformIndexHtml(html) {
      return html.replace(/ crossorigin/g, "");
    },
  };
}

/**
 * Die Stützdateien von pdf.js neben das übersetzte JavaScript legen.
 *
 * Die `Dokumentanzeige` der Bibliothek löst Worker, WASM, Schriften, CMaps
 * und ICC-Profile zur Laufzeit relativ zu `import.meta.url` auf, absichtlich
 * ohne Vite-Asset-Import: im Bau der Bibliothek bettet Vite jedes Asset als
 * data:-URI ein, und einen data:-Worker lässt die Content-Security-Policy des
 * Geräts nicht zu. Also legt jeder Bau, der die Bibliothek übersetzt, den
 * Ordner `pdf-dateien/` neben seine Chunks, hier unter `dist/assets/`. Das ist
 * `pdf-dateien.mjs` aus dem Paket der Bibliothek, in TypeScript, damit
 * `tsc --noEmit` diese Datei weiter mitprüft. Ohne den Ordner zeigt die
 * Dokumentanzeige Bilder, und ein PDF endet im Fehlerzustand.
 *
 * Der Worker heißt `.js` und nicht `.mjs`: für `.mjs` kennt der Webserver
 * am Gerät keinen JavaScript-Typ, und einen Module-Worker mit
 * `application/octet-stream` verwirft der Browser wortlos.
 */
function pdfDateienBeilegen(zielOrdner: () => string): Plugin {
  return {
    name: "pdf-dateien-beilegen",
    apply: "build",
    closeBundle() {
      const quelle = dirname(createRequire(import.meta.url).resolve("pdfjs-dist/package.json"));
      const ordner = join(zielOrdner(), "pdf-dateien");
      rmSync(ordner, { recursive: true, force: true });
      mkdirSync(ordner, { recursive: true });
      copyFileSync(join(quelle, "build", "pdf.worker.min.mjs"), join(ordner, "pdf.worker.min.js"));
      for (const teil of ["wasm", "standard_fonts", "cmaps", "iccs"]) {
        cpSync(join(quelle, teil), join(ordner, teil), { recursive: true });
      }
    },
  };
}

const hier = (weg: string): string => fileURLToPath(new URL(weg, import.meta.url));

/**
 * Woher die Bausteine kommen: vom Gerät oder aus einer Kopie.
 *
 * **Vom Gerät** ist der Weg dieser Vorlage. Das Gerät liefert die Bibliothek
 * des Designsystems selbst aus, unter `/marken/<haupt>/` auf derselben Herkunft
 * wie die App. Die App bringt dann keine Kopie mit: ihr Bündel bleibt klein,
 * sie braucht für die Bibliothek kein Tailwind, und mit jedem Update des
 * Geräts steht dort die neue Fassung, ohne dass jemand neu baut. Im Manifest
 * steht dafür nur die Hauptzahl (`"marken": "5"`).
 *
 * **Aus einer Kopie** gilt, wo es kein Gerät gibt: in `npm run dev`, im
 * Selbsttest des Kits und in einer lokalen Vorschau. Dann wird die Bibliothek
 * aus `src/marken/` mit der App übersetzt, wie es früher überall war. Auch eine
 * App, deren Manifest eine ganze Fassung nennt (`"marken": "5.2.1"`), baut so.
 * `npm run build:kopie` erzwingt es.
 *
 * Gelesen wird das Manifest neben diesem Ordner. Fehlt es (der Bau läuft
 * außerhalb einer App), gilt die Kopie: ohne Angabe wird nichts vom Gerät
 * erwartet.
 */
function hauptzahlVomGeraet(): string | null {
  if (process.env.MARKEN_KOPIE) return null;
  const manifest = hier("../app.json");
  if (!existsSync(manifest)) return null;
  try {
    const feld = (JSON.parse(readFileSync(manifest, "utf8")) as { marken?: unknown }).marken;
    return typeof feld === "string" && /^\d+$/.test(feld) ? feld : null;
  } catch {
    return null;
  }
}

const haupt = hauptzahlVomGeraet();

/**
 * Was vom Gerät kommt, und unter welchem Namen.
 *
 * React gibt es dann genau einmal, das des Geräts: ein zweites bräche jeden
 * Hook, und zwar erst im Browser. Alles, was `react` laden will, auch
 * `react-router-dom` und `@tanstack/react-query` in diesem Bündel, bekommt
 * deshalb dieselbe Adresse. Die Namen der Dateien nennt der Kontrakt des
 * Geräts im Abschnitt `marken`, Eintrag `eingaenge`.
 */
function vomGeraet(hauptzahl: string): Array<{ find: RegExp; replacement: string }> {
  const adresse = `/marken/${hauptzahl}/`;
  const namen: Array<[string, string]> = [
    ["react", "react.js"],
    ["react-dom", "react-dom.js"],
    ["react-dom/client", "react-dom-client.js"],
    ["react/jsx-runtime", "jsx-runtime.js"],
    ["@marken/diagramm", "diagramm.js"],
    ["@marken", "marken.js"],
  ];
  return namen.map(([name, datei]) => ({
    find: new RegExp(`^${name.replace(/[/@]/g, "\\$&")}$`),
    replacement: adresse + datei,
  }));
}

/**
 * Die Stylesheets der Bibliothek vom Gerät laden, vor allen eigenen.
 *
 * `marken.css` ist beim Gerät fertig übersetzt: Tokens beider Themes, Regeln
 * der Bausteine und die Klassen, die die Bibliothek selbst benutzt. Der Link
 * steht vor dem eigenen Stylesheet, damit die eigenen Regeln gewinnen.
 */
function stilVomGeraet(hauptzahl: string): Plugin {
  return {
    name: "stil-vom-geraet",
    transformIndexHtml() {
      return [
        { tag: "link", attrs: { rel: "stylesheet", href: `/marken/${hauptzahl}/marken.css` }, injectTo: "head-prepend" },
      ];
    },
  };
}

/**
 * `@marken` zeigt in der Kopie auf den Spiegel des Designsystems, genau wie in
 * der Oberfläche des Geräts. Ein Pfad-Alias und kein Paket: die Bibliothek wird
 * mit dieser App übersetzt, und es gibt kein `dist/`, das jemand vergisst.
 * Der Name ist derselbe wie dort, damit derselbe Quelltext hier und dort läuft.
 * Vom Gerät zeigt er auf die Adresse des Geräts, und der Bau lässt sie draußen.
 * Die Typen kommen in beiden Fällen aus `src/marken/` (`tsconfig.json`).
 *
 * `@marken/diagramm` ist derselbe Alias mit einem Pfad dahinter: seit Marken
 * 5.0.0 stehen `Chart` und `Sparkline` nicht mehr im Sammelexport, und
 * Recharts kommt nur in eine App, die ein Diagramm zeigt.
 *
 * `@stil` ist das Stylesheet der App, in zwei Fassungen: `kopie.css` übersetzt
 * die Bibliothek mit, `geraet.css` nur die eigenen Klassen der App.
 *
 * **`memo` gilt dem Bau als rein.** `Ladezustand` und andere Teile der
 * Bibliothek sind `memo(...)` auf oberster Ebene, und einen Aufruf dort hält
 * der Bau für eine Nebenwirkung. Bis Marken 4.1.0 kam so `chart.tsx` samt
 * Recharts in jede App. Das JavaScript hält seit 5.0.0 auch ohne diese Zeile,
 * das CSS nicht: ohne sie wuchs es von 95 auf 106 KB, weil Tailwind die
 * Klassen jedes Moduls liest, das der Bau behält.
 */
export default defineConfig({
  base: "./",
  resolve: {
    alias: haupt
      ? [...vomGeraet(haupt), { find: /^@stil$/, replacement: hier("./src/geraet.css") }]
      : [
          { find: /^@marken\/(.+)$/, replacement: `${hier("./src/marken")}/$1` },
          { find: /^@marken$/, replacement: hier("./src/marken") },
          { find: /^@stil$/, replacement: hier("./src/kopie.css") },
        ],
  },
  plugins: haupt
    ? [tailwindcss(), react(), ohneCrossOrigin(), stilVomGeraet(haupt)]
    : [tailwindcss(), react(), ohneCrossOrigin(), pdfDateienBeilegen(() => hier("./dist/assets"))],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    rolldownOptions: {
      treeshake: { manualPureFunctions: ["memo"] },
      external: haupt ? [/^\/marken\//] : [],
    },
  },
});
