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
/*
 * 5.6.0: das Gesicht. Der Hauptknopf (`Button` solid, `Knopf` haupt) traegt
 * einen leichten Blauverlauf aus `--gradient-primary`, Ueberfahren hellt ihn
 * auf. Eine `Karte` mit `symbol` steht als Zeile: das Symbol auf einem blau
 * getoenten Quadrat, Titel und Inhalt daneben; eine Karte, die ein Knopf ist,
 * hebt sich beim Ueberfahren zwei Pixel an und bekommt einen Schatten, bei
 * „weniger Bewegung" nur den Schatten. Neu in `marken.css` sind
 * `--ara-verlauf-haupt` und `--ara-schatten-hoch`. Kein Name faellt weg,
 * keine Eigenschaft aendert ihre Bedeutung; eine App auf 5.5.1 sieht nur ihre
 * Hauptknoepfe und Karten mit Symbol anders.
 */
/*
 * 5.6.1: eine Karte hebt sich nur dort an, wo es einen Zeiger gibt
 * (`@media (hover: hover)`); auf einem Touch-Geraet blieb sie nach dem Tippen
 * angehoben stehen. Kein Name, keine Eigenschaft aendert sich.
 */
/*
 * 5.7.0: der Grundton der Marke. Die Farben sind die der Marke (Creme, Panel,
 * Tinte, Linie, Blau; dunkel Navy), hinter dem Rahmen liegt ein ruhiger
 * Verlauf (`--verlauf-grund`), die Schrift Inter kommt mit der Bibliothek
 * (`schrift/`, auch fuer eine App zur Laufzeit). Menues, Aufklappfelder,
 * kurze Meldungen und der Schleier unter einem Dialog sind Glas (`.glas`,
 * `--glas-*`, `--ara-glas*`), deckend, wo der Browser keine Unschaerfe kann,
 * der Mensch „Transparenz reduzieren“ gewaehlt hat
 * (`data-transparenz="reduziert"`) oder das System weniger Transparenz
 * oder mehr Kontrast wuenscht. Knoepfe sind kompakt (32 px mit Text, 28 px
 * als Icon-Knopf, bei grobem Zeiger 44 px Trefferflaeche), der Hauptknopf
 * ist flach blau. Neu: `Icon` mit drei Groessen und einer Strichstaerke,
 * dazu der Ausgang `@marken/symbole` fuer den Bau. `--gradient-primary` und
 * `--ara-verlauf-haupt` bleiben als Namen und sind jetzt flach. Kein Name
 * faellt weg; eine App auf 5.6.1 sieht nur das neue Aussehen.
 */
/*
 * 5.7.1: das Blau des hellen Themas (`--primary`) eine Stufe tiefer und
 * das Ende des Verlaufs heller. Ein Abzeichen mit seinem
 * Wisch stand in einer App direkt auf dem Verlauf und hielt dort nur 4,2:1.
 * Die Karten der `Datenliste` am Handy sind deckend (`bg-card`), wie jede
 * Karte. Kein Name, keine Eigenschaft aendert sich.
 */
/*
 * 5.8.0: der Grund des Rahmens. Neu sind `--verlauf-rahmen` (aus
 * `--rahmen-stufe-1` bis `-3` und `--rahmen-schein`), ein sichtbarer Verlauf,
 * auf dem kein Text steht, nur Glas, und dazu `.glas-grund` mit
 * `--glas-anteil-grund`: dasselbe Glas, duenner gefuellt, fuer schwebende
 * Leisten, unter denen nur dieser Verlauf liegt. Kein Name faellt weg, nichts
 * aendert seine Bedeutung.
 */
/*
 * 5.8.1: die Kante des Glases traegt mehr: eine Haarlinie aussen und ein
 * Lichtsaum oben innen in `--glas-schatten`, `--glas-anteil-grund` 66 %, der
 * Verlauf des Rahmens hell kraeftiger und dunkel ruhiger. Kein Name, keine
 * Eigenschaft aendert sich.
 */
/*
 * 5.8.2: Glas auf dem Grund ist neutral (`--glas-grund-basis`: hell Weiss
 * zu 62 %, dunkel Creme zu 6 %), dazu `--schatten-flaeche` fuer die Flaeche
 * der Ansicht. Kein Name, keine Eigenschaft aendert sich.
 */
/*
 * 5.8.3: der Verlauf des Rahmens laeuft diagonal (135 Grad), damit jeder
 * Rand Farbe traegt; dazu `--glas-schatten-klein` fuer Glas ueber Inhalt.
 * Kein Name, keine Eigenschaft aendert sich.
 */
/*
 * 5.9.0: das Innere der Flaeche. Der `Kopf` beginnt jede Seite gleich: links
 * Titel und ein Satz, rechts `werkzeuge` (neu `Werkzeug`, ein Icon-Button von
 * 28 px), davor der Knopf der Seitenleiste (neu `KopfVorne`); keine
 * Trennlinie, kein Symbol vor dem Titel (`symbol` bleibt als Name und zeichnet
 * nichts), rechts frei fuer `--ara-kapsel-platz`; dazu `ebene`. Die Tabelle
 * ist kompakt (Kopfzeile 32 px, Zeile 40 px), die `Datenliste` liegt deckend
 * auf `--card` mit Radius 12 px, ihre Beschriftung ist nur fuer
 * Vorlesewerkzeuge, neu `zeilenKennzeichen`; der `Leerzustand` ist kompakt,
 * `Kennzahl` deckend und mit `verlauf`, `Chart` mit `art` Linie oder Balken
 * in einem Stil; das Feld eines `Formular` ist am Rechner 32 px hoch, der
 * `SidebarTrigger` 28 px. Neu zur Laufzeit `symbole.js`. Kein Name faellt
 * weg; eine App auf 5.8.3 sieht ohne Neubau den neuen Kopf und die neue
 * Tabelle, nur `Werkzeug`, `KopfVorne`, `verlauf`, `art` und `symbole.js`
 * bekommt sie erst mit einem Neubau.
 */
/*
 * 5.9.1: Befunde der ersten unbeteiligten Durchsicht. Der Knopf der
 * Seitenleiste steht im `Kopf` als letztes Werkzeug (Titel und Inhalt haben
 * eine linke Kante), der Titel 20 px; der Titel einer `Karte` in Textgroesse,
 * damit er nicht groesser ist als der Seitentitel; die Karte der
 * `Datenliste` am Handy zeigt die erste Spalte in bis zu zwei Zeilen und den
 * Rest in einer Zeile; `Kennzahl` mit groesserer Zahl, `Kennzahlen` am Handy
 * zwei Spalten. Kein Name, keine Eigenschaft aendert sich.
 */
/*
 * 5.9.2: Befunde der zweiten unbeteiligten Durchsicht. Eine App zur Laufzeit
 * steht deckend auf `--background` ohne eigenen Verlauf (der liegt draussen
 * im Rahmen). Der `Kopf` haelt fuer die Kapsel nur so viel frei, wie er in
 * sie hineinreicht. `Spalte` kennt `kartenText` und `inKarteOben` fuer die
 * Karte am Handy; die Tabelle setzt Ziffern gleicher Breite. Kein Name
 * faellt weg; eine App auf 5.9.1 laeuft unveraendert.
 */
/*
 * 5.9.3: zwei Reparaturen aus der dritten Durchsicht. Die Tabelle setzt keine
 * Ziffern gleicher Breite mehr fuer alles (Inter verbreiterte damit den
 * Bindestrich), und die Karte der `Datenliste` am Handy zeigt lange Texte in
 * einer eigenen Zeile, auf zwei Zeilen begrenzt. Kein Name aendert sich.
 */
/*
 * 5.10.0: die Befehlspalette. `CommandDialog` schwebt als Glas im oberen
 * Drittel (Fuellung, Rand und Schatten aus `--glas-*`), mit schlichtem
 * Schleier, und nimmt `inhaltKennzeichen`; `DialogContent` nimmt `schleier`
 * (`glas` wie bisher oder `schlicht`). Kein Name faellt weg, nichts aendert
 * seine Bedeutung; eine App auf 5.9.3 laeuft unveraendert. Die Kennzahl legt
 * ihre Verlaufslinie in einer schmalen Kachel unter die Zahl statt ueber sie.
 */
/*
 * 5.11.0: die Felder bekommen bei grobem Zeiger die Trefferflaeche von
 * 44 px, die der Knopf schon hatte. `Input` und der Ausloeser von `Select`
 * werden dort 44 px hoch (ein `<input>` hat kein `::before`), `Checkbox`,
 * `RadioGroupItem` und `Switch` behalten ihre Groesse und bekommen die
 * unsichtbare Flaeche darueber (`TREFFER`, jetzt in `primitive/treffer.ts`).
 * Am Rechner mit Maus aendert sich nichts. Dazu sucht die Befehlspalette
 * scharf: `CommandDialog` nimmt `filter`, Vorgabe ist das neue
 * `wortanfangFilter` (jedes Wort der Eingabe beginnt ein Wort des Eintrags,
 * ab drei Zeichen auch mitten im Wort); `Command` allein und damit die
 * `Suchauswahl` suchen wie bisher. Kein Name faellt weg; eine App auf 5.10.0
 * laeuft unveraendert.
 */
/*
 * 5.11.1: der Seitenkopf bricht um, statt den Titel zu quetschen. Reicht
 * die Zeile nicht für Titel, Werkzeuge und Aktionen (am Handy neben der
 * Kapsel, auf der Startseite mit „N Freigaben warten auf Sie"), stehen
 * Werkzeuge und Aktionen in der nächsten Zeile; der Titel behält mindestens
 * 12rem. Am Rechner ändert sich nichts. Gefunden an der Demo am Handy.
 */
/*
 * 5.12.0: die gemeinsame Linie. Neu ist das Muster `Blatt`: Einzelheiten und
 * Formulare am Rechner als Flaeche daneben, rechts mit 8 px Abstand und
 * 20 px Radius, unter 900 px von unten mit Griff, das sich wegwischen laesst;
 * Escape, ein Tipp daneben und das Kreuz schliessen es, der Rumpf rollt in
 * sich, die Aktionen stehen unten. Dazu die Tokens `--radius-blatt`,
 * `--backdrop-leicht` (`bg-backdrop-leicht`) und `--schatten-blatt`. Der
 * Verlauf des Rahmens ist kraeftiger (hell bis in ein deutliches Blau,
 * dunkel ein tiefes Blau oben links), das Glas auf dem Grund duenner im
 * Dunkeln, `--radius-2xl` 18 statt 14 px. Kein Name faellt weg, nichts
 * aendert seine Bedeutung; eine App auf 5.11.1 laeuft unveraendert weiter
 * und sieht nur den neuen Grund und die groesseren Radien.
 */
/*
 * 5.12.1: der helle Verlauf des Rahmens beginnt nicht mehr in Creme, dem Ton
 * der Flaeche, sondern in einem hellen Blau und geht in ein deutliches Blau;
 * sonst war er nur in einer Ecke zu sehen. Die Flaeche der Ansicht wirft
 * einen tieferen Schatten. Kein Name, keine Eigenschaft aendert sich.
 */
/*
 * 5.12.2: der dunkle Verlauf des Rahmens spreizt weiter, ein tiefes Blau
 * ueber den groesseren Teil und unten rechts ein klares Anthrazit; die
 * unbeteiligte Durchsicht sah dunkel kaum einen Unterschied. Kein Name,
 * keine Eigenschaft aendert sich.
 */
/*
 * 6.0.0: die Hauptfassung des Klickentwurfs. Neue Hauptzahl, weil sich ihre
 * Adresse aendert (`/marken/6/`) und der Grundton mit ihr: der Grund ist ein
 * warmes Off-White, Karten sind weiss, das Blau der Marke steht als `--blau`
 * in `theme.css`, dazu `--verlauf-blau` (tiefes bis helles Ende; als
 * Schrift gilt `--primary`, eine Spur tiefer, damit Text auf Wisch 4,5:1
 * haelt), Inter bleibt selbst gehostet. Der Hauptknopf ist eine Kapsel.
 * Neu, alle auf reinem CSS und im Buendel: der Linien-Satz (`Linie`, Strich
 * 1,5) und das `AppIcon` auf zartem Squircle; `Glas`, `IconKnopf` (Glaskreis
 * oder flach, mit Hinweis), `Hauptkapsel`, `TextKnopf`; die `Glasleiste` mit
 * Teststreifen und das `Dock` mit Plus und Zahl; die `Popup`-Kapsel mit
 * Suchfeld und Gruppen; die `Ebene` als Blatt oder Vollbild; das `Fenster`;
 * das `Board` mit Ziehen ueber Zeiger-Ereignisse; `Stufenleiste`, `Reiter`,
 * `Segmente` und die `Wischzeile`. Die `Meldung` nimmt `beiRueckgaengig`
 * (Frist 5 Sekunden). Die Karte hat Radius 12 und einen Hauch Schatten, die
 * Listenzeile ist 48 Pixel hoch. Das Geraet liefert nur die aktuelle
 * Hauptzahl aus: eine App nennt im Manifest die 6 und laedt von `/marken/6/`;
 * kein Name der 5.x faellt weg.
 */
export const FASSUNG = '6.0.0';
