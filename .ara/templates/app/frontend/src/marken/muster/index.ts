/**
 * Die Muster (Phase H4, 29.08.2026) -- die Zusammensetzungen, die eine
 * Fachanwendung braucht.
 *
 * DREI SAETZE, UND JEDER HAT SEINE HOEHE:
 *
 *   die Primitive     Ein Knopf, ein Feld, eine Tabelle. Sie wissen nichts
 *                     ausser sich selbst, und man setzt sie zusammen.
 *   die Muster        Eine Datenliste, eine Suchauswahl, eine Seitenleiste.
 *                     Sie sind AUS Primitiven gemacht und loesen eine
 *                     Aufgabe, die in jeder Anwendung wiederkommt.
 *   die Bausteine     Kopf, Liste, Karte, Formular, Meldung, Menue: reines
 *                     CSS, laufen OHNE Bau (`browser/marken.js`).
 *
 * WARUM ES DIE MITTLERE EBENE GIBT. Bis H3 hatte die Bibliothek nur Teile.
 * Wer damit eine Fachanwendung baute, schrieb fuer eine sortierbare Liste
 * mit Suchfeld und Leerzustand rund zweihundert Zeilen -- und die naechste
 * Anwendung schrieb zweihundert andere. Genau daraus sind vor Plan 023 die
 * zwanzig Kopfstellen mit derselben Klassenkette entstanden. Ein Muster ist
 * die Antwort darauf: EINE Form, an EINER Stelle, mit einer Liste als
 * Eingabe.
 *
 * SIE WISSEN TROTZDEM NICHTS VON ARASUL. Kein Muster kennt eine Route, einen
 * Endpunkt oder einen Benutzer -- `Datenliste` bekommt Zeilen, `Seitenleiste`
 * bekommt Eintraege. Was ueber DIESES Geraet Bescheid weiss (`AuthCard` mit
 * dem Maskottchen und dem Produktnamen, `SkeletonList` mit der Form einer
 * Zeile auf diesem Geraet), bleibt in der Shell.
 *
 * DREI EINTRAEGE DIESER LISTE WAREN FALSCH, und H5 hat sie geholt. `Modal`,
 * `ConfirmModal` und `StatTile` standen bis dahin in `components/ui/` der
 * Shell und wussten nichts von Arasul -- ein Titel mit einem Rumpf, eine
 * Frage mit zwei Knoepfen, eine Zahl mit ihrer Beschriftung. Die Folge waere
 * gewesen, dass die erste Fachanwendung mit einem Dialog sich diese Zeilen
 * noch einmal schreibt. Sie heissen jetzt `Dialogform`, `Bestaetigung` und
 * `Kennzahl`. Und `FilterBar` ist ganz gefallen: es war eine zweite
 * Tab-Leiste neben dem Primitiv `Tabs`, mit derselben Form und eigener
 * Tastaturmechanik -- zwei Dinge unter einer Sache sind die Verwechslung
 * selbst (`marken.py`, Punkt 7).
 *
 * SIE BRAUCHEN EINEN BAU, wie die Primitive: sie sind auf Tailwind
 * geschrieben. `browser.ts` gibt sie deshalb nicht aus.
 */

export { Datenliste } from './Datenliste';
export type { DatenlisteProps, Spalte } from './Datenliste';
export { Bestaetigung, Dialogform } from './Dialogform';
export type { BestaetigungProps, DialogformProps } from './Dialogform';
export { Dateiablage } from './Dateiablage';
export type { DateiablageProps } from './Dateiablage';
export { Feldgruppe, Formularseite } from './Feldgruppe';
export type { FeldgruppeProps, FormularseiteProps } from './Feldgruppe';
export { Kennzahl, Kennzahlen } from './Kennzahl';
export type { KennzahlProps, KennzahlenProps } from './Kennzahl';
export { Ladezustand } from './Ladezustand';
export type { LadezustandProps } from './Ladezustand';
export { Leerzustand } from './Leerzustand';
export type { LeerzustandProps } from './Leerzustand';
export { Seitenleiste } from './Seitenleiste';
export type { SeitenleisteProps, SeitenleistenEintrag, SeitenleistenGruppe } from './Seitenleiste';
export { Suchauswahl } from './Suchauswahl';
export type { SuchauswahlMoeglichkeit, SuchauswahlProps } from './Suchauswahl';
