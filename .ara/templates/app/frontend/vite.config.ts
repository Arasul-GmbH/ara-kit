import { cpSync, copyFileSync, mkdirSync, rmSync } from "node:fs";
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
 * `@marken` zeigt auf den Spiegel des Designsystems, genau wie in der
 * Oberfläche des Geräts. Ein Pfad-Alias und kein Paket: die Bibliothek wird
 * mit dieser App übersetzt, und es gibt kein `dist/`, das jemand vergisst.
 * Der Name ist derselbe wie dort, damit derselbe Quelltext hier und dort läuft.
 *
 * `@marken/diagramm` ist derselbe Alias mit einem Pfad dahinter: seit Marken
 * 5.0.0 stehen `Chart` und `Sparkline` nicht mehr im Sammelexport, und
 * Recharts kommt nur in eine App, die ein Diagramm zeigt.
 *
 * **`memo` gilt dem Bau als rein.** `Ladezustand` und andere Teile der
 * Bibliothek sind `memo(...)` auf oberster Ebene, und einen Aufruf dort hält
 * der Bau für eine Nebenwirkung. Bis Marken 4.1.0 kam so `chart.tsx` samt
 * Recharts in jede App. Das JavaScript hält seit 5.0.0 auch ohne diese Zeile,
 * das CSS nicht: ohne sie wuchs es am 26.09.2026 von 95 auf 106 KB, weil
 * Tailwind die Klassen jedes Moduls liest, das der Bau behält.
 */
export default defineConfig({
  base: "./",
  resolve: {
    alias: { "@marken": hier("./src/marken") },
  },
  plugins: [tailwindcss(), react(), ohneCrossOrigin(), pdfDateienBeilegen(() => hier("./dist/assets"))],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    rolldownOptions: { treeshake: { manualPureFunctions: ["memo"] } },
  },
});
