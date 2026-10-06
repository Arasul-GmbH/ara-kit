# Verfahren: eine App bauen, von der ersten Frage bis live

> **Wann brauchst du das?** Wenn aus einem Wunsch eine App auf einem Gerät werden soll. Das hier
> ist der Kern. Eine Fach-App, mit Mandanten, Belegen, die das Gerät ausliest, oder einem
> Exportformat eines anderen Herstellers, liest dazu `.ara/knowledge/app-professional.de.md`.

## Der Lebenslauf

Eine App läuft im Kreis, und `/app` steht an jeder Station:

1. **Planen.** Es gibt keine Akte. Interview nach der Prüfliste unten, dann die Akte aus der
   Vorlage und ein Plan unter `plans/offen/`.
2. **Bauen.** Ein Plan ist aktiv. Erst seine Annahmen durchgehen, dann bauen, dann packen.
3. **Test.** Das Paket landet im Teststand; der Fachmensch probiert es mit echter Anmeldung.
4. **Live.** Ein Mensch schaltet um. Der Plan wandert nach `erledigt/`, die README der App sagt, was
   sie heute kann, in den Worten dessen, der sie benutzt.
5. **Weiter.** Kein Plan offen: Lage, Interview zur Erweiterung, neuer Plan.

**Wo ihr steht, sagt das Werkzeug:** `node .ara/tools/app.mjs --app <name>` nennt die nächsten
Schritte; was am Gerät steht, fragt `--status` dort.

## Die Prüfliste des Interviews

Frag gebündelt, bis jeder Punkt beantwortet ist oder als **Annahme** offen im Plan steht. Womit das
Haus arbeitet (`business/profile.md`), gehört in den ersten Entwurf. **Mindestens drei Runden**,
bevor der erste Plan geschrieben wird. Die Regel, wie tief gefragt wird, steht in `AGENTS.md`,
„Every command asks to full depth"; die vier Ebenen unten sind, was sie für eine App heißt.

**Will der Mensch ausdrücklich keine Fragen** („frag nicht", „keine Fragen", oder die Aufgabe sagt
es schriftlich, wie im Codex-Test vom 06.10.2026), gelten die drei Runden nicht: der Wunsch geht
dem Mindestmaß vor. Arbeite mit dem, was aufgeschrieben ist, frag nichts, und schreib jeden noch
offenen Punkt als Annahme in den Plan, jede Zeile als Stelle, an der später jemand widersprechen
darf. Auch dann nicht angenommen werden ein Preis, ein Produktwert und eine Rechtstatsache (sie
bleiben offen und werden als offen genannt) und alles, was personenbezogene Daten vom Gerät schickte.
Sag zu Beginn in einem Satz, dass du ohne Fragen weitermachst und die Annahmen im Plan stehen.

| Was | Warum es entscheidet |
| --- | --- |
| **Der Arbeitsschritt dahinter** | Nicht die gewünschte Lösung. „Ein Bot für Urlaub" heißt: jemand liest Mails und trägt sie in eine Tabelle |
| **Wer es benutzt** | Wer sie sieht, entscheidet der Kunde am Gerät. Ob einer, zehn oder hundert, entscheidet den Bau |
| **Welche Daten** | Was hinein geht, liegen bleibt, hinaus geht. Personenbezogenes ausdrücklich benennen |
| **Die Schritte** | Aus Sicht des Menschen davor, ein Schritt je Zeile |
| **Wo ein Flow gebraucht wird** | Wo wirklich ein Sprachmodell arbeitet. Daten schieben ist ein Programm, kein Flow |
| **Wo ein Mensch entscheidet** | Jede Freigabe, wann ein Vorgang vollständig genug dafür ist, wer entscheidet und wer ausdrücklich nicht |
| **Wer was sehen darf** | Jeder darin alles, oder nur seine Mandanten, Abteilungen, Akten. Das entscheidet die App. Mit Mandanten (Muster 7) außerdem: sieht die Verwaltung alle Mandanten oder nur die ihr zugeordneten (`alleSehen`)? In einer Kanzlei sehen die Partner meist alle. Wer welchen Mandanten bekommt, lässt sich festlegen, bevor die Person die App je geöffnet hat |
| **Rollen, was ins Netz geht, welches Modell je Flow** | **Wird immer gefragt**, weil niemand ohne Programmiererfahrung es von selbst anspricht. Vorgaben: ein Admin und Mitarbeiter, die nur ihre Akten sehen, nichts verlässt das Gerät, ein Modellvorschlag je Flow. Siehe „Drei Fragen, die jede App bekommt" |
| **Bild, Freigabestufen, was gelesen wird** | Siehe „Weitere Fragen" |
| **Was bleiben muss** | Was eine neue Fassung, ein Schalten und ein Jahr überlebt. Siehe „Daten, die bleiben" |
| **Welche Fachstandards gelten** | Exportformat, Kontenrahmen, Aufbewahrung: `.ara/knowledge/app-professional.de.md` |
| **Welche Gestalt sie annimmt** | Die zehn Muster in `.ara/knowledge/app-patterns.de.md`, und der Plan nennt das, das er benutzt |
| **Was nicht dazugehört** | Der Absatz, der später die Enttäuschung erspart |
| **Woran man sieht, dass es fertig ist** | Ein Satz, den man prüfen kann |
| **Was passiert, wenn es einmal falsch ist** | Etwas, das geprüft wird, ist ein Nachmittag. Etwas, das nie falsch sein darf, ist ein Projekt |
| **Bildschirme und Aufbau, Felder je Formular, Buttons je Rolle, Automatik und Kontext** | Ohne sie erfindet der Bauende die Oberfläche, rät Felder und Buttons, und niemand weiß, was ans Modell geht. Siehe „Die vier Ebenen, Punkt für Punkt" |

### Die vier Ebenen, Punkt für Punkt

Eine Ebene ist geklärt, wenn jede Zeile darunter beantwortet ist. Jede Antwort landet im eigenen
Abschnitt des Plans (`Bildschirme`, `Felder je Formular`, `Buttons je Rolle`, `Automatik`), und
nichts darin wurde geraten.

1. **Bildschirme und Aufbau.** Je Seite: ihr Name und ihr Weg (eine Ebene tief), was darauf steht,
   ob Liste oder Einzelheit, was der Mensch zuerst sieht, was eine leere Seite sagt, wohin die
   Seitenleiste führt.
2. **Felder je Formular.** Je Formular, je Feld: die Beschriftung, wie der Mensch sie kennt, der
   Typ (Text, Zahl, Datum, Auswahl, Datei, Person), Pflicht oder freiwillig, ein Beispielwert,
   die Prüfregel (Bereich, Format, „Ende nicht vor Beginn"). Welche Felder der Freigebende sieht
   und welche der Einreichende nach dem Absenden nicht mehr ändern darf.
3. **Buttons je Rolle.** Ein Raster aus Rolle und Seite: welcher Button da ist, was er tut, in
   welchem Zustand der Vorgang danach steht, wer Bescheid bekommt. Auch die Buttons, nach denen
   keiner fragte und die eine Runde braucht: zurückziehen, zurückgeben, kommentieren.
4. **Automatik und Kontext.** Je Automatik sechs Zeilen: der **Auslöser** (ein Vorgang wird
   abgeschickt, Zeit vergeht, ein Button), der **Kontext**, der ans Modell geht (welche Felder,
   welche Dokumente, Personenbezogenes benannt), das **Ergebnis** (was entsteht und wo es landet),
   der **Prüfer** (welcher Mensch schaut hin, und was er sieht), der **Fehlerfall** (das Modell
   antwortet nicht, der Prüfer ist weg, das Ergebnis ist falsch) und die **Benachrichtigung**
   (wer, auf welchem Weg).

### Drei Fragen, die jede App bekommt

Diese drei werden in **jedem** `/app`-Interview gestellt, in den Worten des Menschen, was die App
sonst auch tut. Sie stehen auf der Liste, weil ein Mensch ohne Programmiererfahrung sie nicht von
sich aus anspricht und später nicht reparieren kann. Jede bekommt fertige Entwürfe als Optionen,
nie ein leeres „welche Rollen?". Sprich einfach (`AGENTS.md`, „Plain language"): ein Fachwort
bekommt beim ersten Mal einen Satz.

1. **Rollen und Zuweisung.** Frag: „Wer arbeitet mit der App? Vorschlag: Sie als Admin, alle
   anderen als Mitarbeiter. Als Admin weisen Sie jedem Mitarbeiter die Akten zu, an denen er
   arbeitet, einen Mandanten, ein Projekt, einen Fall. Ein Mitarbeiter sieht nur seine eigenen
   Akten und die Freigaben, die ihn betreffen, nie die eines anderen." Optionen: *Admin und
   Mitarbeiter (Vorschlag)*; *Alle sehen alles* (nur mit dem Grund im Plan, und laut gesagt, dass ein
   falscher Klick dann die Akte eines Mandanten allen zeigt); *Weitere Rollen* (siehe unten). **Eine
   weitere Rolle braucht einen Grund in den Worten des Menschen**: frag „Was darf diese Person, was
   ein Mitarbeiter nicht darf?" Lautet die Antwort „nichts", entsteht keine Rolle. Dann frag, wer
   Admin ist und wie die „Akte" im Haus heißt (Mandant, Projekt, Fall), und nimm dieses Wort für
   jede Seite. **Gebaut wird Muster 7** (`.ara/knowledge/app-patterns.de.md`): eine Seite, auf der der
   Admin Mitarbeitern Akten zuweist, und der Test `backend/probe/fremde-akte.mjs`, „eine fremde Akte
   gibt 404". Der Plan nennt beides, und **die App geht nicht live, bevor dieser Test im Teststand
   bestanden ist**; seine Ausgabe kommt in den Plan. Sag dem Menschen klar, dass ein neuer
   Mitarbeiter die App einmal öffnet, bevor man ihm Akten zuweisen kann.
2. **Was ins Internet geht.** Ruf
   `node .ara/tools/app.mjs --connections "<die Beschreibung bisher>"` auf: es nennt die Dienste von
   außen und jede Recherche im Internet, auf die die Beschreibung hindeutet. Frag je Eintrag: „Wird
   das gebraucht? Von Anfang an oder nur, wenn jemand es verlangt? Dürfen personenbezogene Daten
   mit?" und sag in einem Satz, was das Gerät verlässt („der Text der Mails geht an Ihren
   Mail-Anbieter"). Die Antworten kommen in den Plan unter `Verbindungen`. **Nichts geht hinaus, was
   nicht vereinbart wurde.** Nennt der Kontrakt des Geräts das Feld `verbindungen`, kommen die
   Einträge in die `app.json`, und `--check` hält sie gegen den Kontrakt; bis dahin hält der Plan sie,
   `--check` sagt, dass das Feld ungeprüft ist, und die App ruft von sich aus nichts nach außen auf.
   Die Form eines Eintrags wird nicht erfunden.
   **Sag es einmal im Gespräch in einfachen Worten:** „Eine App ohne Eintrag kommt nicht ins
   Internet. Sie läuft in einem eigenen Netz, das keinen Weg nach draußen hat. Was sie draußen
   erreichen soll, braucht den Namen dieser Seite auf einer Liste, und nur diese Namen kommen
   durch." Auf einem Gerät, dessen Kontrakt Fassung 7 oder mehr trägt, ist das eine Tatsache,
   `--contract` sagt sie unter „Das Netz einer App". Eine Schriftart aus dem Netz, ein Webdienst, ein
   Paketmanager beim Start: all das scheitert ohne Eintrag, was die App braucht, wird also vorher
   in sie eingebaut. Modelle und Dokumente bekommt die App über das Gerät, dafür braucht es keinen
   Eintrag. Der Eintrag ist nur der Name der Seite, klein geschrieben, ohne `https://`, ohne Port
   und Pfad; `--check` sagt in einem Satz, was an einem Eintrag nicht passt, und welche Seiten die
   App erreicht.
3. **Welches Modell je Flow.** Sag zuerst, was ein Modell ist: „das Programm, das Texte liest und
   schreibt. Ein größeres ist langsamer und gründlicher, ein kleines ist flink." Schlag je Stelle,
   an der ein Modell arbeitet, eine Art Modell für die Aufgabe vor, mit Grund, und sag, dass der
   Admin es später am Gerät umstellen kann, ohne dass die App kaputtgeht. **Kein Modellname aus dem
   Kopf**: was das Gerät hat, kommt aus `--contract`, der Katalog aus dem Spiegel. Der Vorschlag steht
   im Kopf der Flow-Datei; der Plan listet Flow, Aufgabe, Vorschlag und Grund unter `Modelle je Flow`. Wie lange eine
   Anfrage wartet, wenn viele zugleich fragen, sagt `--contract` unter `last`: sag es in Sekunden.

**„Genug" lässt die drei Fragen oben nicht fallen.** Was offen bleibt, wird zur sicheren Vorgabe und laut
gesagt: Admin und Mitarbeiter, nichts geht hinaus, der Vorschlag aus dem Kopf des Flows.

### Weitere Fragen

In **jedem** Interview von `/app` gestellt, mit Entwürfen als Auswahl. Das Kit schreibt die Felder,
`--contract` sagt, was jedes an diesem Gerät tut.

1. **Das Bild der App.** „Welches kleine Bild für die Seitenleiste? Vorschlag: die Buchstaben des
   Namens, BE für Belege, oder ein Symbol." Geht an `--symbol`: ein Bildname
   (`file-text`) oder ein bis drei Großbuchstaben oder Ziffern. Ohne Antwort nimmt das Gerät die
   Buchstaben selbst.
2. **Wer freigibt, in welchen Schritten.** Nur, wo die App eine Freigabe hat. „Eine Person, oder zwei
   hintereinander, erst die Kollegin, die prüft, dann die Leitung?" Die Namen gehen an
   `--stufen "Prüfung,Leitung"`, höchstens fünf. **Wer** je Schritt entscheidet, legt der
   Administrator am Gerät fest, nicht die App: frag, wer je Schritt die Standardperson ist, und
   schreib es für den Administrator in den Plan. Wer eingereicht hat, entscheidet nie.
3. **Nur, wo ein Flow es braucht.** „Beginnt er von Hand, zu einer Zeit der Woche oder wenn etwas
   geschieht?" (`--ausloeser`: `hand`, `zeitplan:<fünf Felder wie bei cron>`, `ereignis:<name>`) und
   „von allein, oder bestätigt ein Mensch das Ergebnis?" (`--arten`: `autonom`,
   `ergebnis_bestaetigen`). Das Gerät handelt nach allen selbst: ein Zeitplan startet den Flow im
   Livestand ohne Argumente und ohne Einreicher, ein Ereignis meldet die App. Unter Kontrakt 13
   startet ein Ereignis noch nichts.

4. **Nur, wo das Gerät ein Dokument liest** (Beleg, Formular, Scan). Sag, was das ist: „Das Gerät liest
   das Blatt und füllt die Felder aus; wo es unsicher ist, sieht ein Mensch zuerst das Blatt neben
   den Feldern an." Frag mit Entwürfen: welche Angaben es liest (`--felder "Betrag,Datum"`, höchstens
   zehn) und welche davon der Mensch verbessern darf, vorgeschlagen nur die oft falsch gelesenen
   (`--aenderbar "Datum"`, oder `keine`). **Nie alle aus Gewohnheit**: ein änderbares Feld lässt sich
   auch aus Versehen ändern. Das Blatt links ist `--original`: vorgabemäßig ein Blatt aus dem
   eingereichten Text, bei echten Dokumenten der Weg, der sie liefert, **mit der Endung .png, .jpg
   oder .pdf** (die Freigabe erkennt Bild und PDF am Ende des Pfades).
   **Ab Kontrakt 14 liest das Modell das Original selbst.** Das Gerät holt die Datei über den Weg
   der App und gibt sie dem Bildmodell: ein PNG oder JPEG unverändert, ein PDF als seine ersten
   Seiten. Es erkennt sie an den ersten Bytes, nicht am Namen, und ein Blatt als SVG ist nur eine
   Anzeige, das Modell kann es nicht lesen. Wie viele Seiten und wie groß eine Datei sein darf,
   sagt der Kontrakt (`--contract`); nenne nichts davon aus dem Kopf. Fehlt die Datei, ist sie zu
   groß oder nicht lesbar, ruft das Gerät kein Modell auf: der Lauf hält mit einer Freigabe an, die
   den Grund nennt („Original fehlt“), und ein Mensch sieht sie. Für echte Dokumente muss der Weg
   also ein PNG, JPEG oder PDF liefern. Schreib die Angaben des Vorgangs nicht mehr in `auftrag`:
   das Blatt ist die Quelle, und die Angaben des Formulars würden nur davon abgeschrieben.
   **Eine Prüfung, mit den Feldern.** Mit `--felder` und der Art `ergebnis_bestaetigen` ist die
   Freigabe der Erkennung die Prüfung: sie kommt immer, mit den Feldern, auch wenn alles sicher
   erkannt ist, und am Ende folgt keine zweite. Darum schreibt `--new` dort keinen Schritt
   `entscheiden`; eine weitere Stufe bekommt weiter ihren eigenen Schritt. Bei `autonom` allein fragt
   die Erkennung nur bei Unsicherheit, und der Schritt bleibt. An einem Gerät vor Kontrakt 14 gilt das nicht: das
   Modell liest nur den `auftrag`, und eine sichere Erkennung fragt niemanden. Dort hängst du den
   Schritt `entscheiden` von Hand an und schreibst in den Plan, dass eine unsichere Erkennung zweimal fragt.
   Bei mehreren Stufen gehört die erste der Erkennung. Sag das laut.
   **Ein Titel für den Lauf.** Das Gerüst gibt beim Start einen Verweis auf den Vorgang als `titel` mit („Vorgang 7 von anna“, nie dessen Text,
   höchstens so lang, wie der Kontrakt es erlaubt), wenn das Gerät ihn annimmt; er steht vorn an jeder
   Freigabe des Laufs, damit zwei Karten zu unterscheiden sind. Ohne ihn bildet das Gerät einen aus
   den ersten erkannten Werten.

„Genug" lässt diese vier Fragen fallen: was offen bleibt, schreibt das Kit nicht. `--check` hält
`faehigkeiten` an einem Werkzeug-Schritt an (sie gehören nur an Modell-Schritte) und hält die Deklaration
gegen die Erkennung: ein änderbares Feld, das die Rolle nicht liest, ein Original an einem Schritt, der
nichts liest, ein verbotener Pfad, ein Gerät vor Kontrakt 10.

**Wohin das Ergebnis geht, wird nicht gefragt.** Ein Flow, der ein Ergebnis liefert, gibt es an eine Route
der App, die `--new` schreibt und das Backend der Vorlage mitbringt; was zu sagen ist, wenn jemand fragt,
und was `--check` hält, steht in `.ara/templates/app/README.md`, „Das Ergebnis eines Flows geht an die App
zurück".

### Wie gefragt wird, und wann Schluss ist

Wie tief gefragt wird, Entwürfe statt eines leeren „welche Felder?", eine Skizze je Layout-Option,
„genug" und dass Arasul nie infrage gestellt wird, steht in `AGENTS.md`, „Every command asks to full
depth". Für `/app` dazu:

- **Aus dem Muster nachbohren.** „Mit Freigaben" ist keine Antwort; die Entwürfe kommen aus dem Muster
  und aus dem, womit das Haus arbeitet: „Zwei Stufen: Teamleitung, dann Personal".
- **Erst nachsehen.** Was das Profil, die eigenen Unterlagen des Hauses oder die Vorlage schon
  sagen, wird vorgeschlagen, nicht gefragt.
- **Schluss** ist, wenn jede Zeile der vier Ebenen beantwortet ist oder der Mensch „genug" schreibt.
  Was dann offen ist, kommt in den Plan unter `Annahmen`, eine Zeile je Punkt, und kein späterer
  Schritt baut auf einer ungekennzeichneten Vermutung. Ziel ist die App, die dem Haus am meisten
  bringt: Daten und Modelle bleiben am Gerät.

```
node .ara/tools/app.mjs --app <name> --new --titel "<Anzeigename>"
node .ara/tools/app.mjs --app <name> --plan "<titel>"
node .ara/tools/app.mjs --app <name> --plan-aktiv <datei>     offen wird aktiv
node .ara/tools/app.mjs --app <name> --plan-erledigt <datei>  aktiv wird erledigt
```

Pläne liegen unter `apps/<name>/plans/`, und der Ordner ist der Stand. **Aktiv ist höchstens
einer**, das Werkzeug lässt keinen zweiten zu. Erledigt ist ein Plan, wenn seine Fassung **live**
steht, nicht wenn der Code fertig ist.

## Bauen und auf ein Gerät

`--build`, dann `--check`, `--deploy` und `--live` am Gerät. **Lokal läuft der Bau, nicht die App**: was sie tut, sieht man am Gerät, mit echter Anmeldung und
echtem Modell. **Ein Einspielen braucht ein paar Sätze, was neu ist**: frag in den Worten des Menschen
(„Was ist neu für die, die damit arbeiten?"). Ohne Akte unter `devices/` kein Kontrakt und kein
`--check`: dann kommt `/device` zuerst. Was der Bau tut und der Weg eines Pakets stehen in
`.ara/knowledge/deploy.de.md`, was das Gerät mitbringt in `.ara/knowledge/platform-services.de.md`,
das Aussehen in `.ara/knowledge/design-system.de.md`.

## Daten, die bleiben

**Genau ein Ort hält: die Datenbank, die das Gerät der App gibt**, eine je Stand, wie der Kontrakt
unter `daten` sagt; ihre Adresse kommt als `umgebung.datenbank` in `arasul.json`. Sie überlebt
jedes Einspielen und wird jede Nacht gesichert, zurückgeholt, wie `daten.wiederherstellen` sagt.
**Sonst bleibt nichts**: jedes Einspielen ersetzt den Container, sein Dateisystem, ein `VOLUME`,
eine SQLite-Datei. Hochgeladenes gehört in eine Spalte (`BYTEA`). **Die Datenbank beginnt leer**, die
Migrationen der App legen das Schema an. Ihre Nummern kollidieren nie: die Vorlage hält 001 bis 009,
jedes Muster einen eigenen Zehner ab 010, und die eigenen der App beginnen bei 100. Wie die Vorlage
beides tut, und was sie ohne Gerät behält: ihre README.

## Was die Vorlage schon ist

Die Vorlage liegt unter `.ara/templates/app/`, und was `--new` daraus macht, läuft ab der ersten
Minute: ein Vorgang in der Datenbank des Geräts, der Flow `freigabe` mit Nummer und Einreicher, ein
Mensch entscheidet auf der eigenen Seite `Freigaben` der App (oder in Arasul, das dieselbe Anfrage
zeigt), der Vorgang steht als genehmigt oder abgelehnt da. Fragt jemand, wie eine App aussieht, leg
eine an und zeig sie. Ihr Stapel, die fünf Stellen, die es je einmal gibt, die zwei Anschlüsse des
Backends, wie sie sich für Agenten beschreibt und wie sie das Ergebnis eines Flows annimmt:
`.ara/templates/app/README.md`. **Die Routen bleiben eine Ebene tief**, der Rest geht in die Abfrage.

## Was du dabei nicht tust

Kein Produktwert aus dem Kopf oder im Quelltext der App, er kommt in `backend/arasul.json`. Keine
zweite Ablage. Keine eigene Anmeldung, kein Inhalt in einer Freigabeanfrage, keine Freigabe, die
sich die App selbst erteilt: `.ara/knowledge/platform-services.de.md` sagt, warum. Nichts
eingespielt ohne `--check`.
