/**
 * `@marken` -- das Designsystem des Geraets (Phase D7, 28.08.2026).
 *
 * Die Marken sind Schrift, Farben und Abstaende aus
 * `apps/dashboard-frontend/src/index.css`; sechs Bausteine sind daraus
 * gebaut: Kopf, Liste, Karte, Formular, Meldung, Menue. Kein neues
 * Erscheinungsbild -- ein gemeinsames.
 *
 * ZWEI WEGE HINEIN, EINE QUELLE:
 *
 *   die Shell     `import { Karte } from '@marken'` -- Vite loest den Alias
 *                 auf DIESEN Ordner auf (`vite.config.ts`), genau wie `@` auf
 *                 `src/`. KEIN npm-Paket und kein Eintrag im Lockfile: die
 *                 Bibliothek wird mit der Shell uebersetzt, nicht vor ihr
 *                 gebaut. Ein Paket waere ein `dist/`, das jemand vergisst.
 *   eine App      `import { Karte } from './marken.js'` -- das Buendel unter
 *                 `browser/` bringt React mit und braucht keinen Bau. Eine App
 *                 MIT Bau (die Vorlage des Kits, E5) nimmt stattdessen diese
 *                 Quelle ueber den Spiegel.
 *
 * Das Stylesheet gehoert dazu und wird getrennt geladen: die Shell holt es in
 * `index.css`, eine App ueber ein `<link>`.
 */

export { Kopf } from './Kopf';
export type { KopfProps } from './Kopf';
export { Liste, ListenEintrag } from './Liste';
export type { ListeProps, ListenEintragProps } from './Liste';
export { Karte } from './Karte';
export type { KarteProps } from './Karte';
export { Formular, Feld, Knopf } from './Formular';
export type { FormularProps, FeldProps, KnopfProps, KnopfArt } from './Formular';
export { Meldung } from './Meldung';
export type { MeldungProps, MeldungsArt } from './Meldung';
export { Menue } from './Menue';
export type { MenueProps } from './Menue';
export { FASSUNG } from './fassung';
