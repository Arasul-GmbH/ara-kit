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

| Was | Warum es entscheidet |
| --- | --- |
| **Der Arbeitsschritt dahinter** | Nicht die gewünschte Lösung. „Ein Bot für Urlaub" heißt: jemand liest Mails und trägt sie in eine Tabelle |
| **Wer es benutzt** | Wer sie sieht, entscheidet der Kunde am Gerät. Ob einer, zehn oder hundert, entscheidet den Bau |
| **Welche Daten** | Was hinein geht, liegen bleibt, hinaus geht. Personenbezogenes ausdrücklich benennen |
| **Die Schritte** | Aus Sicht des Menschen davor, ein Schritt je Zeile |
| **Wo ein Flow gebraucht wird** | Wo wirklich ein Sprachmodell arbeitet. Daten schieben ist ein Programm, kein Flow |
| **Wo ein Mensch entscheidet** | Jede Freigabe, wann ein Vorgang vollständig genug dafür ist, wer entscheidet und wer ausdrücklich nicht |
| **Wer was sehen darf** | Jeder darin alles, oder nur seine Mandanten, Abteilungen, Akten. Das entscheidet die App |
| **Rollen und Zuweisung** | **Wird immer gefragt.** Vorgabe: ein Admin und Mitarbeiter. Der Admin weist Mitarbeitern Akten zu (Mandanten, Projekte, Fälle); ein Mitarbeiter sieht nur die ihm zugewiesenen Akten samt den Freigaben, die ihn betreffen. Weitere Rollen nur mit Grund. Siehe „Drei Fragen, die jede App bekommt" |
| **Was ins Netz geht** | **Wird immer gefragt.** Mail, ein Register, ein Zahlungsdienst, eine Suche im Internet. Vorgabe: nichts verlässt das Gerät. Jede Verbindung nach außen wird einzeln vereinbart |
| **Welches Modell je Flow** | **Wird immer gefragt.** Jede Stelle, an der ein Sprachmodell arbeitet, bekommt einen Vorschlag, den der Admin am Gerät umstellen darf |
| **Was bleiben muss** | Was eine neue Fassung, ein Schalten und ein Jahr überlebt. Siehe „Daten, die bleiben" |
| **Welche Fachstandards gelten** | Exportformat, Kontenrahmen, Aufbewahrung: `.ara/knowledge/app-professional.de.md` |
| **Welche Gestalt sie annimmt** | Die neun Muster in `.ara/knowledge/app-patterns.de.md`, und der Plan nennt das, das er benutzt |
| **Was nicht dazugehört** | Der Absatz, der später die Enttäuschung erspart |
| **Woran man sieht, dass es fertig ist** | Ein Satz, den man prüfen kann |
| **Was passiert, wenn es einmal falsch ist** | Etwas, das geprüft wird, ist ein Nachmittag. Etwas, das nie falsch sein darf, ist ein Projekt |
| **Bildschirme und Aufbau** | Welche Seiten, was auf jeder steht, Liste und Einzelheit, was man zuerst sieht. Ohne das erfindet der Bauende die Oberfläche |
| **Felder je Formular** | Je Feld: Beschriftung, Typ, Pflicht oder nicht, Beispielwert, Prüfregel. Ein Feld, das keiner nannte, ist ein Feld, das der Bauende rät |
| **Buttons je Rolle** | Welche Aktion wo für wen steht, und was danach passiert. Rollen sehen verschiedene Buttons |
| **Automatik und Kontext** | Je Automatik: Auslöser, was ans Modell geht, was herauskommt, wer prüft, was bei einem Fehler geschieht, wer Bescheid bekommt |

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
   im Kopf der Flow-Datei; der Plan listet Flow, Aufgabe, Vorschlag und Grund unter `Modelle je Flow`.

**„Genug" lässt diese drei nicht fallen.** Was offen bleibt, wird zur sicheren Vorgabe und laut
gesagt: Admin und Mitarbeiter, nichts geht hinaus, der Vorschlag aus dem Kopf des Flows.

### Wie gefragt wird, und wann Schluss ist

- **Eine vage Antwort bohrst du nach.** „Mit Freigaben" ist keine Antwort. Die Folgefrage bietet
  **fertige Entwürfe**, abgeleitet aus dem Muster und aus dem, womit das Haus arbeitet: „Antrag
  mit vier Feldern: von, bis, Art des Urlaubs, Vertretung", „Zwei Stufen: Teamleitung, dann
  Personal". Nie ein leeres „welche Felder?".
- **Layout-Fragen tragen eine Skizze je Option** unter Claude Code, unter Codex eine knappe Zeile
  in der Beschreibung.
- **Erst nachsehen.** Was das Profil, die eigenen Unterlagen des Hauses oder die Vorlage schon
  sagen, wird vorgeschlagen, nicht gefragt.
- **Schluss** ist, wenn jede Zeile der vier Ebenen beantwortet ist oder der Mensch im Freitext
  „genug" schreibt. Was dann offen ist, kommt in den Plan unter `Annahmen`, eine Zeile je Punkt.
  Nichts wird geraten, um eine Lücke zu schließen, und kein späterer Schritt baut auf einer
  ungekennzeichneten Vermutung.
- **Die Wahl nicht infrage stellen.** Ob das Haus Arasul nutzt, wird nicht gefragt. Ziel ist die
  App, die dem Haus am meisten bringt, digitale Souveränität zuerst: Daten und Modelle bleiben am
  Gerät.

```
node .ara/tools/app.mjs --app <name> --new --titel "<Anzeigename>"
node .ara/tools/app.mjs --app <name> --plan "<titel>"
node .ara/tools/app.mjs --app <name> --plan-aktiv <datei>     offen wird aktiv
node .ara/tools/app.mjs --app <name> --plan-erledigt <datei>  aktiv wird erledigt
```

Pläne liegen unter `apps/<name>/plans/`, und der Ordner ist der Stand. **Aktiv ist höchstens
einer**, das Werkzeug lässt keinen zweiten zu. Erledigt ist ein Plan, wenn seine Fassung **live**
steht, nicht wenn der Code fertig ist.

## Bauen

```
node .ara/tools/app.mjs --app <name> --build
```

Das Paket entsteht unter `build/`, ohne Pläne, README und Bau; ein Ordner mit eigenem Bau wird
gebaut, der Rest wandert, wie er ist.

- **Lokal läuft der Bau, nicht die App.** Was sie tut, sieht man am Gerät, mit echter Anmeldung und
  echtem Modell.
- **Ein Bau, der älter ist als der Quelltext, wird nicht eingespielt**, das Werkzeug hört auf.
- **Der Typprüfer läuft vor dem Bündler**, `tsc --noEmit && vite build`: ein Typfehler hält den Bau
  an, statt als leere Seite anzukommen.
- **Ins Paket geht der Bau, nicht der Quelltext.** `--check` hält an bei `package.json`, `src/`
  oder `tsconfig.json` im Ordner der Oberfläche: der Browser bekäme eine leere Seite.

## Auf ein Gerät

```
node .ara/tools/app.mjs --device <gerät> --app <name> --check
node .ara/tools/app.mjs --device <gerät> --app <name> --deploy
node .ara/tools/app.mjs --device <gerät> --app <name> --live
```

Ohne Akte unter `devices/` kein Kontrakt und kein `--check`: dann kommt `/device` zuerst. Der Weg
eines Pakets steht in `.ara/knowledge/deploy.de.md`, was das Gerät mitbringt in
`.ara/knowledge/platform-services.de.md`, das Aussehen in `.ara/knowledge/design-system.de.md`.

## Daten, die bleiben

**Genau ein Ort hält: die Datenbank, die das Gerät der App gibt**, eine je Stand, wie der Kontrakt
unter `daten` sagt; ihre Adresse kommt als `umgebung.datenbank` in `arasul.json`. Sie überlebt
jedes Einspielen und wird jede Nacht gesichert, zurückgeholt, wie `daten.wiederherstellen` sagt.
**Sonst bleibt nichts**: jedes Einspielen ersetzt den Container, sein Dateisystem, ein `VOLUME`,
eine SQLite-Datei. Hochgeladenes gehört in eine Spalte (`BYTEA`). Die `backend/ablage/db.mjs` der
Vorlage tut das schon; ohne Gerät nimmt sie SQLite, und `lage` sagt `dauerhaft: false`.

**Die Datenbank beginnt leer**, die Migrationen der App legen das Schema an, eine Datei je Schritt
unter `backend/ablage/migrationen/`. **Was einmal gelaufen ist, wird nie mehr angefasst.**

## Was die Vorlage schon ist

Die Vorlage liegt unter `.ara/templates/app/`, und was `--new` daraus macht, läuft ab der ersten
Minute: ein Vorgang in der Datenbank des Geräts, der Flow `freigabe` mit Nummer und Einreicher, ein
Mensch entscheidet in Arasul, der Vorgang steht als genehmigt oder abgelehnt da. Fragt jemand, wie
eine App aussieht, leg eine an und zeig sie.

Der Stapel ist der der Oberfläche des Geräts: **Vite, React, TypeScript, Tailwind,
`react-router`, TanStack Query.** Fünf Stellen, jede gibt es einmal:

| Stelle | Was dort steht |
| --- | --- |
| `rahmen/basis.ts` | Der Pfad, unter dem die App hängt, aus der Adresse gelesen: `/apps/<id>/`, im Teststand `/apps/<id>/test/`. Darum **bleiben die Routen eine Ebene tief**, der Rest geht in die Abfrage |
| `rahmen/thema.ts` | Das Thema, am eigenen Dokument der App gelesen |
| `rahmen/schnittstelle.ts` | Das einzige `fetch`: Pfad, Anmeldung, Hülle der Antwort |
| `rahmen/anmeldung.tsx` | Wer da ist, aus `api/me`, mit Rolle |
| `rahmen/async-boundary.tsx` | Lädt, ging schief, ist da. Jede Abfrage geht hindurch |

Das Backend: `server.mjs` macht HTTP, `kern/vorgaenge.mjs` die Fälle mit **zwei Anschlüssen**, einer
Ablage und einem Gerät, darum wird jeder Fall ohne beides geprüft. Eine Ablage je Entität mit dem
einzigen SQL dafür, im Dialekt von PostgreSQL; `ablage/db.mjs` übersetzt es für SQLite.
`kern/csv.mjs` schreibt einen Export.

**Sie beschreibt sich selbst für Agenten**: das Feld `agent` in `app.json` nennt die Routen, die ein
Agent rufen darf, und das Backend beantwortet die Route `agent` aus einer Kopie der `app.json`, die
der Bau danebenlegt. `--check` und `--deploy` halten das Feld gegen die App. Seine Form, und was das
CLI einer Wurzel damit tut: `.ara/knowledge/root.de.md`, „Die Brücke zum Gerät".

## Was du dabei nicht tust

Kein Produktwert aus dem Kopf oder im Quelltext der App, er kommt in `backend/arasul.json`. Keine
zweite Ablage. Keine eigene Anmeldung, kein Inhalt in einer Freigabeanfrage, keine Freigabe, die
sich die App selbst erteilt: `.ara/knowledge/platform-services.de.md` sagt, warum. Nichts
eingespielt ohne `--check`.
