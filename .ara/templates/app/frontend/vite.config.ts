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

export default defineConfig({
  base: "./",
  plugins: [tailwindcss(), react(), ohneCrossOrigin()],
  build: { outDir: "dist", emptyOutDir: true, sourcemap: false },
});
