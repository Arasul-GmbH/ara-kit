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
 * `@marken` zeigt auf den Spiegel des Designsystems, genau wie in der
 * Oberflaeche des Geraets. Ein Pfad-Alias und kein Paket: die Bibliothek wird
 * mit dieser App uebersetzt, und es gibt kein `dist/`, das jemand vergisst.
 * Der Name ist derselbe wie dort, damit derselbe Quelltext hier und dort laeuft.
 */
export default defineConfig({
  base: "./",
  resolve: {
    alias: { "@marken": fileURLToPath(new URL("./src/marken", import.meta.url)) },
  },
  plugins: [tailwindcss(), react(), ohneCrossOrigin()],
  build: { outDir: "dist", emptyOutDir: true, sourcemap: false },
});
