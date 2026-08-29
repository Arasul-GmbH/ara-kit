/**
 * `@marken` -- das Designsystem des Geraets (Phase D7, erweitert in H3).
 *
 * DREI SAETZE, EINE QUELLE, ZWEI LAUFZEITEN:
 *
 *   die Primitive (H3, H4)
 *                        Sechsundvierzig Grundbausteine auf Radix und
 *                        Tailwind: Button, Input, Dialog, Tabs, Badge,
 *                        Tabelle, Kalender, Suchliste … Sie brauchen einen
 *                        Bau und die Tokens aus `theme.css`. Wer einen Bau
 *                        hat, nimmt sie.
 *   die Muster (H4)      Datenliste, Suchauswahl, Dateiablage, Seitenleiste,
 *                        Formularseite mit Feldgruppen, Leerzustand,
 *                        Ladezustand -- die Formen, die eine Fachanwendung
 *                        wiederkehrend braucht, aus Primitiven gebaut. Auch
 *                        sie brauchen einen Bau.
 *   die Bausteine (D7)   Kopf, Liste, Karte, Formular, Meldung, Menue --
 *                        auf reinem CSS (`marken.css`, Klassen `ara-*`).
 *                        Sie laufen in einer App OHNE Bau, die nur
 *                        `browser/marken.js` laedt.
 *
 * ZWEI WEGE HINEIN:
 *
 *   die Shell     `import { Button } from '@marken'` -- Vite loest den Alias
 *                 auf DIESEN Ordner auf (`vite.config.ts`), genau wie `@` auf
 *                 `src/`. KEIN npm-Paket und kein Eintrag im Lockfile: die
 *                 Bibliothek wird mit der Shell uebersetzt, nicht vor ihr
 *                 gebaut. Ein Paket waere ein `dist/`, das jemand vergisst.
 *   eine App      MIT Bau (die Vorlage des Kits, E5) nimmt diese Quelle ueber
 *                 den Spiegel und hat alle drei Saetze. OHNE Bau laedt sie
 *                 `browser/marken.js` und hat die sechs Bausteine.
 *
 * Die Stylesheets gehoeren dazu und werden getrennt geladen: `theme.css`
 * (die Tokens, Pflicht fuer die Primitive) und `marken.css` (die Regeln der
 * sechs Bausteine). Die Shell holt beide in `index.css`, eine App ueber ein
 * `<link>` beziehungsweise ein `@import`.
 */

export * from './bausteine';
export * from './primitive';
export * from './muster';
export { cn } from './cn';
