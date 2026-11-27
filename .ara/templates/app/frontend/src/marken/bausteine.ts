/**
 * Die sechs Bausteine: die Sorte, die OHNE Bau laeuft.
 *
 * Sie sind auf reinem CSS geschrieben (`marken.css`, Klassen `ara-*`) und
 * brauchen weder Tailwind noch einen Buendler. Genau darum stehen sie in
 * einer eigenen Datei: `browser.ts` gibt DIESE Liste aus und nicht die ganze
 * Bibliothek. Das Buendel `browser/marken.js` traegt damit weiter nur das,
 * was in einer App ohne Bau auch wirklich aussieht wie etwas.
 *
 * Die Primitive und die Muster sind die anderen Saetze:
 * Tailwind, ein Bau, die Tokens aus `theme.css`. Wer beides in einer App hat,
 * hat einen Bau, und dann nimmt er die Primitive.
 *
 * `useSchmalesFenster` steht mit hier drin und nicht bei den
 * Primitiven: er ist reines React, braucht keinen Bau, und er traegt die EINE
 * Schwelle des Produkts (900 px). Eine App ohne Bau, die unter 900 px eine
 * Spalte zeigen soll, kann sie damit lesen, statt sich eine zweite auszudenken;
 * und `Sidebar` liest dieselbe.
 *
 * `useSchmalerBehaelter` (seit 5.1.0) ist sein Geschwister fuer die Frage
 * „passt es in MEINEN Kasten?": eine App im Rahmen teilt ihr Fenster noch
 * einmal mit der eigenen Seitenleiste, und dort luegt jede Fensterschwelle.
 */

export { Kopf, KopfVorne, Werkzeug } from './Kopf';
export type { KopfProps, WerkzeugProps } from './Kopf';
export { Liste, ListenEintrag } from './Liste';
export type { ListeProps, ListenEintragProps } from './Liste';
export { Karte } from './Karte';
export type { KarteProps } from './Karte';
export { Formular, Feld, Knopf } from './Formular';
export type { FormularProps, FeldProps, KnopfProps, KnopfArt } from './Formular';
export { Meldung, RUECKGAENGIG_FRIST_MS } from './Meldung';
export type { MeldungProps, MeldungsArt } from './Meldung';
export { Menue } from './Menue';
export { Linie, AppIcon, LINIEN_NAMEN } from './Linien';
export type { LinieProps, AppIconProps, LinienName, LinienGroesse } from './Linien';
export { Glas, IconKnopf, Hauptkapsel, TextKnopf } from './Glas';
export type { GlasProps, IconKnopfProps, HauptkapselProps, TextKnopfProps } from './Glas';
export { Glasleiste, Dock, DockEintrag } from './Leiste';
export type { GlasleisteProps, DockProps, DockEintragProps } from './Leiste';
export { Popup, PopupGruppe, PopupEintrag } from './Popup';
export type { PopupProps, PopupGruppeProps, PopupEintragProps } from './Popup';
export { Ebene } from './Ebene';
export type { EbeneProps } from './Ebene';
export { Fenster } from './Fenster';
export type { FensterProps } from './Fenster';
export { Board, ZIEHEN_NACH_MS } from './Board';
export type { BoardProps, BoardStufe, BoardKarte } from './Board';
export { Stufenleiste, Reiter, Segmente } from './Stufen';
export type {
  StufenleisteProps,
  ReiterProps,
  ReiterEintrag,
  SegmenteProps,
  SegmentEintrag,
} from './Stufen';
export { Wischzeile } from './Wischzeile';
export type { WischzeileProps } from './Wischzeile';
export type { MenueProps } from './Menue';
export { useSchmalesFenster, SCHMAL_AB_PX } from './useSchmalesFenster';
export { useSchmalerBehaelter } from './useSchmalerBehaelter';
export { FASSUNG } from './fassung';
