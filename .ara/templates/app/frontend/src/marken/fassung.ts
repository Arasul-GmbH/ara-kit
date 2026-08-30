/**
 * Die Fassung der Bibliothek.
 *
 * Sie steht in einer eigenen Datei, weil zwei Dinge sie lesen: das Buendel
 * unter `browser/` traegt sie (dort ist sie der einzige Beleg dafuer, aus
 * welchem Stand der Quelle es gebaut wurde), und `scripts/test/marken.py`
 * vergleicht beide. Wer einen der sechs Bausteine aendert, hebt sie und baut
 * neu -- sonst faellt der Waechter.
 *
 * 2.0.0 (Phase H3): die Bibliothek hat einen zweiten Satz bekommen -- die
 * sechsundzwanzig Primitive -- und mit `theme.css` die Tokens, die bis dahin
 * der Shell gehoerten. Der Sprung auf eine neue Hauptzahl steht fuer den
 * Spiegel des Ara-Kits: eine Vorlage, die auf 1.x gebaut ist, kennt
 * `theme.css` nicht.
 *
 * 3.0.0 (Phase H4): der Satz der Primitive ist vollstaendig (46), und daneben
 * steht ein dritter -- die MUSTER, die Formen einer Fachanwendung
 * (`src/muster/`). Wieder eine neue Hauptzahl, und wieder wegen des Spiegels:
 * die Bibliothek hat seither vier Abhaengigkeiten von aussen, die eine
 * Vorlage auf 2.x nicht installiert hat (`cmdk`, `react-day-picker`,
 * `embla-carousel-react`, `input-otp`), und `useSchmalesFenster` ist aus der
 * Shell hierher gezogen. Auch das Buendel traegt ihn: `browser/marken.js`
 * gibt seit H4 einen Namen mehr aus.
 *
 * 3.1.0 (Phase H5): drei Muster kommen dazu -- `Dialogform`, `Bestaetigung`
 * und `Kennzahl`/`Kennzahlen` --, und zwei Bausteine bekommen Eigenschaften:
 * `Liste` kennt jetzt `dicht` (enge Zeilen fuer eine Spalte, die mit der
 * Maus bedient wird), `ListenEintrag` `unterzeile` und `erklaerung`, `Kopf`
 * `mittig`. Alle drei kamen aus der Shell, wo sie als `Modal`,
 * `ConfirmModal` und `StatTile` standen und nichts von Arasul wussten.
 *
 * KEINE neue Hauptzahl: nichts ist weggefallen und nichts hat seine
 * Bedeutung geaendert. Eine Vorlage auf 3.0 laeuft mit dieser Fassung
 * unveraendert weiter -- sie kennt die drei neuen Formen nur nicht.
 *
 * 3.1.1 (Auftrag J31): eine Reparatur, kein neuer Baustein. Drei Dateien
 * schrieben eine Breite aus einer Variablen in der Tailwind-3-Kurzform
 * (eckige Klammern um den Variablennamen). Tailwind 4 packt die nicht mehr
 * in `var()`,
 * sondern schreibt `width: --sidebar-breite` -- ungueltiges CSS, das der
 * Browser wortlos verwirft. Im Rahmen des Orin gemessen: der Platzhalter der
 * Seitenleiste war null breit, und die Leiste lag ueber dem Inhalt. Jetzt
 * `w-(--sidebar-breite)`. Betroffen waren `sidebar`, `calendar` und
 * `Suchauswahl`; die Fassung steigt trotzdem, weil eine App auf 3.1.0 diese
 * drei kaputt bekommt und der Spiegel des Kits an dieser Zahl haengt.
 *
 * Warum die falsche Schreibweise hier nicht ausgeschrieben steht: dieser
 * Ordner ist eine Tailwind-Quelle (`@source` in `index.css`), und der Scanner
 * liest Text, nicht JavaScript -- ein Kommentar ist fuer ihn kein Kommentar.
 * Beim ersten Anlauf stand sie hier, und der fertige Bau trug prompt
 * `.w-\[--sidebar-breite\]{width:--sidebar-breite}` -- eine Regel, die
 * niemand benutzt, aus einem Satz darueber, dass man sie nicht benutzen soll.
 */
export const FASSUNG = '3.1.1';
