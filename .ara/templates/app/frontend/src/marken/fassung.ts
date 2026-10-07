/**
 * Die Fassung der Bibliothek.
 *
 * Sie steht in einer eigenen Datei, weil zwei Dinge sie lesen: das Buendel
 * unter `browser/` traegt sie (dort ist sie der einzige Beleg dafuer, aus
 * welchem Stand der Quelle es gebaut wurde), und `scripts/test/marken.py`
 * vergleicht beide. Wer einen der sechs Bausteine aendert, hebt sie und baut
 * neu, sonst faellt der Waechter.
 *
 * Eine neue Hauptzahl heisst: eine Vorlage des Ara-Kits, die auf der alten
 * gebaut ist, laeuft nicht mehr unveraendert. Alles andere ist eine Neben-
 * oder Flickzahl.
 *
 * 2.0.0: die Bibliothek hat einen zweiten Satz bekommen, die
 * sechsundzwanzig Primitive, und mit `theme.css` die Tokens, die bis dahin
 * der Shell gehoerten. Neue Hauptzahl: eine Vorlage, die auf 1.x gebaut ist,
 * kennt `theme.css` nicht.
 *
 * 3.0.0: der Satz der Primitive ist vollstaendig (46), und daneben steht ein
 * dritter, die MUSTER, die Formen einer Fachanwendung (`src/muster/`). Neue
 * Hauptzahl: die Bibliothek hat seither vier Abhaengigkeiten von aussen, die
 * eine Vorlage auf 2.x nicht installiert hat (`cmdk`, `react-day-picker`,
 * `embla-carousel-react`, `input-otp`). Dazu ist `useSchmalesFenster` aus der
 * Shell hierher gezogen; auch das Buendel traegt ihn und gibt damit einen
 * Namen mehr aus.
 *
 * 3.1.0: drei Muster kommen dazu (`Dialogform`, `Bestaetigung` und
 * `Kennzahl`/`Kennzahlen`), und zwei Bausteine bekommen Eigenschaften:
 * `Liste` kennt jetzt `dicht` (enge Zeilen fuer eine Spalte, die mit der
 * Maus bedient wird), `ListenEintrag` `unterzeile` und `erklaerung`, `Kopf`
 * `mittig`. Alle drei Muster kamen aus der Shell, wo sie als `Modal`,
 * `ConfirmModal` und `StatTile` standen und nichts von Arasul wussten.
 * Keine neue Hauptzahl: nichts ist weggefallen und nichts hat seine
 * Bedeutung geaendert. Eine Vorlage auf 3.0 laeuft unveraendert weiter, sie
 * kennt die drei neuen Formen nur nicht.
 *
 * 3.1.1: eine Reparatur, kein neuer Baustein. Drei Dateien schrieben eine
 * Breite aus einer Variablen in der Tailwind-3-Kurzform (eckige Klammern um
 * den Variablennamen). Tailwind 4 packt die nicht mehr in `var()`, sondern
 * schreibt `width: --sidebar-breite`, ungueltiges CSS, das der Browser
 * wortlos verwirft. Auf dem Geraet gemessen: der Platzhalter der
 * Seitenleiste war null breit, und die Leiste lag ueber dem Inhalt. Jetzt
 * `w-(--sidebar-breite)`. Betroffen waren `sidebar`, `calendar` und
 * `Suchauswahl`; die Fassung steigt trotzdem, weil eine App auf 3.1.0 diese
 * drei kaputt bekommt und der Spiegel des Kits an dieser Zahl haengt.
 *
 * Warum die falsche Schreibweise hier nicht ausgeschrieben steht: dieser
 * Ordner ist eine Tailwind-Quelle (`@source` in `index.css`), und der Scanner
 * liest Text, nicht JavaScript; ein Kommentar ist fuer ihn kein Kommentar.
 * Beim ersten Anlauf stand sie hier, und der fertige Bau trug prompt
 * `.w-\[--sidebar-breite\]{width:--sidebar-breite}`: eine Regel, die
 * niemand benutzt, aus einem Satz darueber, dass man sie nicht benutzen soll.
 *
 * 4.0.0: die Palette ist kleiner geworden, und das ist ein Bruch. `--success`
 * (Gruen) und `--warning` (Orange) sind aus `theme.css` gestrichen, mit ihnen
 * `--ara-erfolg` und `--ara-warnung` in `marken.css` und die Diagrammpalette
 * `--color-chart-*`. Eine App auf 3.x, die `text-success` oder
 * `var(--ara-warnung)` schreibt, bekommt dafuer nichts mehr, deshalb die neue
 * Hauptzahl. Die Namen der Varianten (`success`, `warning`, `erfolg`,
 * `warnung`) bleiben: sie sagen, WAS es ist; die Farbe folgt daraus. Erfolg
 * ist Blau, eine Warnung Grau, ein Fehler Rot.
 *
 * 4.1.0: die `Dokumentanzeige`, PDF (pdf.js, CSP-konform ohne eval) und
 * Bilder mit Seitenblaettern, Zoom und Vollbild. Sie ist das einzige Muster
 * auf reinem CSS und geht deshalb mit ins Buendel; pdf.js liegt als eigener
 * Brocken `marken-pdf.js` daneben und laedt erst mit der ersten PDF-Quelle,
 * die Stuetzdateien (Worker, WASM, Schriften, CMaps, ICC) im Ordner
 * `browser/pdf-dateien/`. Die `Dateiablage` zeigt seither eine Vorschau der
 * gewaehlten Datei (`vorschau`, abwaehlbar). Keine neue Hauptzahl: eine App
 * auf 4.0.0 laeuft unveraendert, sie kennt das Muster nur nicht.
 *
 * 5.0.0: vier Befunde aus dem Audit des Kit-Geruests, die nur die Bibliothek
 * loesen kann. `Datenliste` nimmt `gewaehlt` (die Zeile traegt
 * `aria-selected` und einen Hintergrund mit Linie) und ist per Tastatur
 * bedienbar (Tab auf die Zeile, Enter oder Leertaste); eine `Spalte` nimmt
 * `kuerzen` und `breite`. Die Farben des hellen Themas halten 4,5:1 auf
 * Seite, Karte und ihrem eigenen Wisch: `--primary`, `--destructive` und
 * `--muted-foreground` sind dunkler geworden, das Rot des dunklen Themas
 * bleibt das alte (`marken.py`, Punkt 9; die Werte stehen in `theme.css`).
 * Und `Chart`, `Sparkline` und `SERIENFARBEN` stehen nicht mehr im
 * Sammelexport, sondern unter `@marken/diagramm`; eine App ohne Diagramm
 * baute sonst 280 kB `recharts` mit. Das ist der Bruch und der Grund fuer
 * die neue Hauptzahl: `import { Chart } from '@marken'` findet nichts mehr,
 * und eine App mit Bau braucht den Pfad `@marken/*` in ihrer `tsconfig.json`.
 *
 * 5.0.1: Zahlen auf Deutsch. Der Tooltip von `Chart` und die Groesse unter
 * der `Dateiablage` schrieben mit `toFixed` „1.5 MB" statt „1,5 MB"; jetzt
 * `toLocaleString('de-DE')`. Keine neue Eigenschaft, kein neuer Name; eine
 * App auf 5.0.0 zeigt nur die Zahlen noch mit Punkt.
 *
 * 5.1.0: die Bibliothek richtet sich nach dem Behaelter, nicht nach dem
 * Fenster. Eine App im Rahmen teilt ihr Fenster mit der eigenen
 * Seitenleiste; bei 1440 px war der Rahmen 1052 px breit, die Datenliste
 * zeigte ihre Tabelle und stand 100 px ueber dem Rand. Neu
 * `useSchmalerBehaelter` (ResizeObserver am eigenen Kasten, auch im
 * Buendel); die `Datenliste` misst damit sich selbst und schaltet unter
 * `LISTE_SCHMAL_AB_PX` (640 px ihres Kastens) auf Karten, und darueber auch
 * dann, wenn ihre Tabelle nicht in den Kasten passt; `SidebarInset` traegt
 * `min-w-0`, damit ein breiter Inhalt in seinem eigenen Rollkasten bleibt;
 * der Kopf der `Karte` bricht um, statt mit einem langen Hinweis die Seite
 * zu verbreitern. Keine neue Hauptzahl: kein Name faellt weg, eine Liste
 * zeigt in einem breiten Fenster mit schmalem Kasten jetzt Karten statt
 * einer abgeschnittenen Tabelle.
 *
 * 5.2.0: ein Muster kommt dazu, die `Freigabe` (Liste, Einzelansicht,
 * Bestaetigen, Ablehnen mit Pflichtgrund, wer entschieden hat, Frist). Eine
 * Freigabe gehoert in die App, in der sie entsteht, und diese Form ist die,
 * die jede App dafuer benutzt; die Shell nimmt dieselbe fuer den
 * Administrator. Keine neue Hauptzahl: nichts faellt weg, eine App auf 5.1.0
 * laeuft unveraendert weiter. Das Muster steht nicht im Buendel (es braucht
 * einen Bau, wie die anderen Muster ausser der `Dokumentanzeige`); das
 * Buendel traegt nur die neue Zahl.
 *
 * 5.2.1: die Auswahl in der `Liste` ist eine getoente Flaeche statt einer
 * Linie am Rand, das Ueberfahren blendet in 120 ms ein, und wer „weniger
 * Bewegung" eingestellt hat, bekommt es ohne Uebergang. Kein Name, keine
 * Eigenschaft aendert sich; eine App auf 5.2.0 sieht nur die Auswahl anders.
 */
/*
 * 5.3.0: die Bibliothek gibt es zur Laufzeit. Das Geraet liefert alle drei
 * Saetze, die Tokens und das fertig uebersetzte Stylesheet unter
 * `/marken/<haupt>/` aus (`laufzeit.config.mjs`), und eine App, die von dort
 * laedt, nennt im Manifest nur die Hauptzahl. Kein Name faellt weg, keine
 * Eigenschaft aendert sich: eine App auf 5.2.1 laeuft unveraendert weiter.
 */
/*
 * 5.3.1: zwei Reparaturen an der Seitenleiste. Die Zahl an einem Eintrag
 * (`SidebarMenuBadge`) steht wieder in seiner Zeile: `SidebarMenuButton`
 * setzte `data-size` nur bei ausdruecklicher Groesse, und ohne das Attribut
 * fand die Zahl ihre Hoehe nicht. Zugeklappt ragt nichts mehr ueber den
 * Inhalt: die Leiste schneidet ab, und die `Seitenleiste` blendet Marke und
 * Fuss aus. Kein Name, keine Eigenschaft aendert sich.
 */
/*
 * 5.4.0: die `Freigabe` kennt erkannte Felder. Eine Freigabe aus einer
 * Erkennung zeigt das Original links, zoombar, und die Felder rechts; was zu
 * pruefen ist, steht oben mit „pruefen", ohne Prozentzahl. Aenderbar ist, was
 * die App erklaert, und `beiBestaetigen` bekommt die geaenderten Werte als
 * zweites Argument. Oben ein Satz, was bisher geschah, die frueheren Stufen
 * klappen auf, und nach der Entscheidung steht wieder die Liste da. Dazu `fuss`
 * je Eintrag. Keine neue Hauptzahl: jede neue Eigenschaft ist freiwillig, eine
 * App auf 5.3.1 laeuft unveraendert weiter.
 */
/*
 * 5.4.1: zwei Texte der `Freigabe`. Ein Feld ohne `bezeichnung` heisst aus
 * seinem Namen abgeleitet („Datum" statt `datum`), auch in der Liste der
 * Aenderungen, und Datum und Uhrzeit stehen auf die Minute, ohne Sekunden.
 * Kein Name, keine Eigenschaft aendert sich.
 */
/*
 * 5.5.0: eine Seitenleiste fuer alles. `Seitenleiste` nimmt `titel` (oben, in
 * der Groesse eines Abschnittstitels), `beschriftung` und `kennzeichen`, ein
 * Eintrag `kennzeichen`; ein Klick schliesst unter 900 px das Blatt. Die Zeilen
 * stehen mit 2 px Abstand statt 4 px, die Auswahl ist eine getoente Flaeche
 * (Akzent zu 12 %) statt des neutralen Wischs, das Ueberfahren blendet in
 * 120 ms ein, und die Leiste ist 240 px breit statt 256 px. Verwaltung,
 * Einstellungen und jede App zeichnen damit dieselbe Leiste. Keine neue
 * Hauptzahl: jede neue Eigenschaft ist freiwillig, eine App auf 5.4.1 laeuft
 * unveraendert weiter und sieht nur ihre Leiste wie die des Geraets.
 */
/*
 * 5.5.1: das Stylesheet zur Laufzeit stuft die Wurzelschrift wie die Shell ab
 * (zwischen 1280 und 1511 px 16,5 px statt 17 px). Eine App im Rahmen zeichnete
 * ihre Leiste sonst 3 % größer als Verwaltung und Einstellungen daneben. Kein
 * Name, keine Eigenschaft ändert sich.
 */
export const FASSUNG = '5.5.1';
