/**
 * Der Bau der Oberfläche.
 *
 * Zwei Einstellungen tragen eine Entscheidung, der Rest ist Vorgabe:
 *
 * `base: "./"` macht jeden Verweis auf eine Datei relativ. Eine App hängt am
 * Gerät unter einem Pfad, den sie nicht kennt, und im Teststand unter einem
 * anderen als live. Ein absoluter Verweis zeigte im Teststand auf den
 * Livestand, und niemand sähe es der Seite an.
 *
 * `jsx: "automatic"` baut JSX ohne ein weiteres Paket: das kann esbuild, das in
 * Vite ohnehin steckt. Eine Abhängigkeit weniger ist eine weniger, die in einem
 * Jahr nicht mehr zum Rest passt.
 */
export default {
  base: "./",
  esbuild: { jsx: "automatic" },
  build: { outDir: "dist", emptyOutDir: true },
};
