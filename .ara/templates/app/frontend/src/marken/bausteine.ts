/**
 * Die sechs Bausteine aus D7 -- die Sorte, die OHNE Bau laeuft.
 *
 * Sie sind auf reinem CSS geschrieben (`marken.css`, Klassen `ara-*`) und
 * brauchen weder Tailwind noch einen Buendler. Genau darum stehen sie in
 * einer eigenen Datei: `browser.ts` gibt DIESE Liste aus und nicht die ganze
 * Bibliothek. Das Buendel `browser/marken.js` traegt damit weiter nur das,
 * was in einer App ohne Bau auch wirklich aussieht wie etwas.
 *
 * Die Primitive (Phase H3) und die Muster (H4) sind die anderen Saetze:
 * Tailwind, ein Bau, die Tokens aus `theme.css`. Wer beides in einer App hat,
 * hat einen Bau -- dann nimmt er die Primitive.
 *
 * `useSchmalesFenster` steht seit H4 mit hier drin und nicht bei den
 * Primitiven: er ist reines React, braucht keinen Bau, und er traegt die EINE
 * Schwelle des Produkts (900 px). Eine App ohne Bau, die unter 900 px eine
 * Spalte zeigen soll, kann sie damit lesen, statt sich eine zweite auszudenken
 * -- und `Sidebar` und `Datenliste` lesen dieselbe.
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
export { useSchmalesFenster, SCHMAL_AB_PX } from './useSchmalesFenster';
export { FASSUNG } from './fassung';
