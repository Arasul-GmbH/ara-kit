import { cpSync, copyFileSync, mkdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Der Bau der Oberflaeche.
 *
 * `base: "./"` macht jeden Verweis auf eine Datei relativ. Eine App haengt am
 * Geraet unter einem Pfad, den sie beim Bauen nicht kennt: live unter
 * `/apps/<kennung>/`, im Teststand unter `/apps/<kennung>/test/`. Ein
 * absoluter Verweis zeigte im Teststand auf den Livestand, und niemand saehe
 * es der Seite an. Woher der Router seinen Basispfad nimmt, steht in
 * `src/rahmen/basis.ts`.
 */

/**
 * `crossorigin` aus den erzeugten `<script>`- und `<link>`-Zeilen nehmen.
 *
 * Ein Geraet stellt sein Zertifikat selbst aus. Chrome laedt ein Modul mit
 * `crossorigin` dann im CORS-Modus, und der scheitert an einem Zertifikat, dem
 * der Browser nicht traut: die Seite bleibt leer, ohne Fehler in der Konsole.
 * Die Shell des Geraets nimmt das Attribut aus demselben Grund heraus.
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
 * Die Stuetzdateien von pdf.js neben das uebersetzte JavaScript legen.
 *
 * Die `Dokumentanzeige` der Bibliothek loest Worker, WASM, Schriften, CMaps
 * und ICC-Profile zur Laufzeit relativ zu `import.meta.url` auf, absichtlich
 * ohne Vite-Asset-Import: im Bau der Bibliothek bettet Vite jedes Asset als
 * data:-URI ein, und einen data:-Worker laesst die Content-Security-Policy des
 * Geraets nicht zu. Also legt jeder Bau, der die Bibliothek uebersetzt, den
 * Ordner `pdf-dateien/` neben seine Chunks, hier unter `dist/assets/`. Das ist
 * `pdf-dateien.mjs` aus dem Paket der Bibliothek, in TypeScript, damit
 * `tsc --noEmit` diese Datei weiter mitprueft. Ohne den Ordner zeigt die
 * Dokumentanzeige Bilder, und ein PDF endet im Fehlerzustand.
 *
 * Der Worker heisst `.js` und nicht `.mjs`: fuer `.mjs` kennt der Webserver
 * am Geraet keinen JavaScript-Typ, und einen Module-Worker mit
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
 * Oberflaeche des Geraets. Ein Pfad-Alias und kein Paket: die Bibliothek wird
 * mit dieser App uebersetzt, und es gibt kein `dist/`, das jemand vergisst.
 * Der Name ist derselbe wie dort, damit derselbe Quelltext hier und dort laeuft.
 *
 * **`memo` gilt dem Bau als rein.** `Sparkline` und `Ladezustand` der
 * Bibliothek sind `memo(...)` auf oberster Ebene, und einen Aufruf dort haelt
 * der Bau fuer eine Nebenwirkung. Weil `@marken` alles ueber einen Sammelexport
 * ausgibt, kam so `chart.tsx` samt Recharts in jede App, ob sie ein Diagramm
 * zeigt oder nicht: 282 KB von 690 KB, gemessen am 26.09.2026. Mit dieser Zeile
 * bleibt Recharts nur, wo eine Seite `Chart` oder `Sparkline` wirklich benutzt.
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
