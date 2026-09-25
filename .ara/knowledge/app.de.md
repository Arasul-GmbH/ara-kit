# Verfahren: eine App bauen, von der ersten Frage bis live

> **Wann brauchst du das?** Wenn jemand etwas will, das das Produkt nicht ab Werk kann,
> und daraus eine App auf einem Gerät werden soll. Wie ein fertiges Paket auf ein Gerät
> kommt, steht in `.ara/knowledge/deploy.de.md`; hier steht, wie es überhaupt entsteht.

## Der Lebenslauf

Eine App läuft im Kreis, und `/app` steht an jeder Station:

1. **Planen.** Es gibt keine Akte. Interview nach der Prüfliste unten, dann die Akte aus
   der Vorlage und ein Plan unter `plans/offen/`.
2. **Bauen.** Ein Plan ist aktiv. Erst die Annahmen darin durchgehen, dann bauen, dann
   das Paket packen.
3. **Test.** Das Paket geht auf ein Gerät und landet im Teststand. Der Fachmensch
   probiert es mit echter Anmeldung.
4. **Live.** Ein Mensch schaltet um. Der Plan wandert nach `erledigt/`, die README der
   App wird fortgeschrieben.
5. **Weiter.** Kein Plan offen: Lage zeigen, Interview zur Erweiterung, neuer Plan. Der
   Kreis beginnt bei 1.

**Wo im Kreis ihr steht, sagt das Werkzeug, nicht du:**

```
node .ara/tools/app.mjs --app <name>
```

Es liest die Akte und nennt die nächsten Schritte, jeweils mit dem Aufruf dazu. Es zählt
nicht auf, was alles ginge: eine Liste aller Möglichkeiten ist eine Bedienungsanleitung
und kein Vorschlag. Sag dem Menschen, was ansteht, in seinen Worten, und ruf dann das auf,
was das Werkzeug genannt hat.

**Dazu weiß es, was es selbst an ein Gerät geschickt hat**: welche Fassung im Teststand
steht und welche live ist, je App und Gerät, aus dem Merker `.ara/state.json`. Ist die
gebaute Fassung schon live, schlägt es nicht noch einmal `--check` und `--deploy` vor,
sondern den Plan und die README. Der Merker ist die Notiz des Kits über sein eigenes Tun
und keine Auskunft über das Gerät: die gibt `--status`, und die fragt dort nach.

**Das Argument.** `/app <app>` meint die App unter `apps/<app>/`. Fehlt
es: erst der Merker `.ara/state.json`, dann die vorhandenen Akten. Gibt es genau eine,
nimm sie. Sonst frag über das Interview-Werkzeug.

## Die Prüfliste des Interviews

Gefragt wird, bis jeder Punkt beantwortet ist oder ausdrücklich offen bleibt. Was offen
bleibt, wird eine **Annahme** und steht so im Plan. Frag gebündelt, nicht einzeln, und
lies vorher `business/profile.md`: womit das Haus arbeitet, gehört in den ersten Entwurf.

| Was | Warum es entscheidet |
| --- | --- |
| **Der Arbeitsschritt dahinter** | Nicht die gewünschte Lösung. „Wir wollen einen Bot für Urlaub" heißt: jemand liest Mails und trägt sie in eine Tabelle |
| **Wer es benutzt** | Wer die App sieht, entscheidet der Kunde am Gerät. Aber ob es einer, zehn oder hundert sind, entscheidet den Bau |
| **Welche Daten** | Was hinein geht, was liegen bleibt, was hinaus geht. Personenbezogenes ausdrücklich benennen |
| **Die Schritte** | Der Ablauf aus Sicht des Menschen davor, ein Schritt je Zeile |
| **Wo ein Flow gebraucht wird** | Wo wirklich ein Sprachmodell arbeitet. Was nur Daten hin und her schiebt, ist ein Programm und kein Flow |
| **Wo ein Mensch entscheidet** | Jede Stelle, an der ein Lauf anhalten und auf eine Freigabe warten soll, wer dort entscheidet und wer ausdrücklich nicht, etwa der, der eingereicht hat |
| **Wer was sehen darf** | Wer in die App kommt, entscheidet das Gerät. Ob darin jeder alles sieht oder nur seine Mandanten, Abteilungen, Akten, entscheidet die App, und das steht im Plan. Siehe „Sichtbarkeit innerhalb einer App“ |
| **Was bleiben muss** | Was eine neue Fassung, ein Schalten und ein Jahr überleben muss, und was davon geprüft oder nachgewiesen wird. Siehe „Dauerhafte Daten“ |
| **Welche Fachstandards gelten** | Ein Exportformat, ein Kontenrahmen, eine Aufbewahrungsregel. Sie kommen aus ihrer Primärquelle, mit Abrufdatum, siehe „Fachstandards“ |
| **Welche Gestalt sie annimmt** | Ein Formular ist selten alles: ein Dokument, das am Gerät angesehen wird, eine Mail, wenn etwas entschieden ist, ein Nachschlagen in einem fremden System, ein fremdes Werkzeug hinter der Anmeldung. Die sechs Muster mit Code, der läuft, stehen in `.ara/knowledge/app-patterns.de.md`, und der Plan nennt das, das er benutzt |
| **Was nicht dazugehört** | Der Absatz, der später die Enttäuschung erspart |
| **Woran man sieht, dass es fertig ist** | Ein Satz, den man prüfen kann |
| **Was passiert, wenn es einmal falsch ist** | Das entscheidet die Bauweise. Etwas, das geprüft wird, ist ein Nachmittag. Etwas, das nie falsch sein darf, ist ein Projekt |

Aus dem Ergebnis wird der Plan:

```
node .ara/tools/app.mjs --app <name> --new --titel "<Anzeigename>"
node .ara/tools/app.mjs --app <name> --plan "<titel>"
```

`--new` legt die Akte aus der Vorlage an: Oberfläche, Backend, ein Flow mit
Freigabe-Schritt, README, `app.json`. Das Aussehen kommt aus dem Spiegel, siehe unten.
`--plan` legt die Plandatei an, und die füllst du im Gespräch aus, Abschnitt für
Abschnitt. Ein Plan, den niemand gelesen hat, ist ein Formular.

## Der Plan

Er liegt unter `apps/<name>/plans/` in drei Ständen, und der Ordnername ist der Stand:

```
node .ara/tools/app.mjs --app <name> --plan-aktiv <datei>     offen wird aktiv
node .ara/tools/app.mjs --app <name> --plan-erledigt <datei>  aktiv wird erledigt
```

**Aktiv ist höchstens einer.** Zwei aktive Pläne heißen, dass niemand mehr sagen kann,
woran gerade gebaut wird; das Werkzeug lässt es nicht zu. Erledigt wird ein Plan erst,
wenn seine Fassung **live** steht, nicht wenn der Quelltext fertig ist.

## Bauen

```
node .ara/tools/app.mjs --app <name> --build
```

Aus dem Ordner wird das Paket unter `build/`. Was nicht hineingehört, weiß das Kit von
sich selbst: Pläne, README und der Bau selbst sind die Arbeit am Ding, nicht das Ding.
Ein Ordner mit einem eigenen Bau wird gebaut, und ins Paket geht sein Ergebnis; alles
andere wandert, wie es ist.

**Lokal läuft der Bau, nicht die App.** Was sie tut, sieht man am Gerät, mit echter
Anmeldung und echtem Modell. Wer sie auf dem eigenen Rechner „mal laufen lässt", hat
weder das eine noch das andere und glaubt trotzdem, es gesehen zu haben.

Ein Bau, der älter ist als der Quelltext, wird nicht eingespielt: das Werkzeug sagt es
und hört auf. Sonst ginge der Stand von vorgestern an das Gerät, und niemand sähe es.

**Der Typprüfer läuft vor dem Bündler.** In der Vorlage steht `tsc --noEmit && vite build`
als Bauskript: ein Typfehler hält den Bau an, statt am Gerät als leere Seite anzukommen.

**Ins Paket geht der Bau, nicht der Quelltext.** Das steht als Regel im Kontrakt jedes
Geräts, und `--check` prüft es: liegen im Ordner der Oberfläche noch `package.json`, `src/`
oder eine `tsconfig.json`, ist es der Quelltext, und das Werkzeug hört auf. Eingespielt
bekäme der Browser sonst eine `index.html`, die auf `/src/main.tsx` zeigt, und der Mensch
im Rahmen sähe eine leere Seite ohne einen Hinweis darauf, woran es liegt.

## Auf ein Gerät mit Arasul

```
node .ara/tools/app.mjs --device <gerät> --app <name> --check
node .ara/tools/app.mjs --device <gerät> --app <name> --deploy
node .ara/tools/app.mjs --device <gerät> --app <name> --live
```

Der Kontrakt des Geräts sagt, was gilt, und `--check` hält das Manifest dagegen, bevor
etwas fliegt. **Ein Deploy rollt immer in den Teststand**, live schaltet ein Mensch, und
zwar nach einer Rückfrage, auch wenn du gerade selbst eingespielt hast. Das Verfahren mit
allem, was dazugehört, steht in `.ara/knowledge/deploy.de.md`.

**Was die App vom Gerät bekommt, reicht das Kit beim Einspielen durch.** Unter welchen Namen das
Gerät ihr die Adresse der Schnittstelle, den Schlüssel und die Adresse ihrer Datenbank in den
Container legt, in welcher Kopfzeile der Schlüssel mitgeht, wie die beiden Kopfzeilen der
Anmeldung heißen, welche Wege es für einen Flow und für das Auslesen eines Dokuments führt, und
ob ein Lauf seinen Einreicher und eine Regel für die Freigabe annimmt: alles das ist zwischen Kit
und Produkt vereinbart, steht im Kontrakt dieses einen Geräts und geht als `backend/arasul.json`
ins Paket. `--check` gibt es vorher aus und nennt, was dieses Gerät nicht verspricht. **Eine App
schreibt diese Werte nie in ihren eigenen Quelltext.** Eine, die es tut, findet auf einem Gerät,
das sie anders nennt, nichts, hält das für „hier läuft kein Arasul" und sammelt Vorgänge, über die
niemand entscheidet. Genau das ist der Vorlage bis zum 29.08.2026 passiert: der Freigabe-Schritt
wurde nicht abgelehnt, er wurde übersprungen.

**Eingespielt ist nicht sichtbar.** Eine App an einem Gerät sieht ein Mensch erst, wenn sie für
ihn freigegeben ist, und freigeben kann das Kit sie nicht: sein Schlüssel trägt `app:deploy` und
sonst nichts. Wer den Teststand ohne Freigabe aufruft, bekommt eine 403, und das ist die fehlende
Freigabe und nicht die App. `--deploy` sagt das am Ende und nennt die zwei Wege zu einem
Administrator: eine Sitzung aus dem Startpasswort, wenn eines in der Ablage liegt
(`--admin-login`), sonst ein Mensch in der Oberfläche des Geräts. Welchen Weg oder welche Seite
die Freigabe geht, steht in der API-Referenz und im Admin-Handbuch des Artefakts, und nie im
Kit. Beide liegen an jedem Gerät mit Arasul, in der Fassung, die dort läuft, und das Kit liest
sie dort, ohne Token und ohne Spiegel: `node .ara/tools/mirror.mjs --docs --device <gerät>`,
eine davon mit `--read <pfad>`. Mit einem Spiegel geht auch `node .ara/tools/mirror.mjs --docs`.
Widersprechen sich Anleitung und Kontrakt, gilt der Kontrakt: er kommt aus dem laufenden
Backend, die Anleitung aus dem Artefakt, mit dem installiert wurde.

**Sag das vor dem Einspielen, nicht danach.** Wer eine 403 vorgesetzt bekommt, hält das Kit für
kaputt. Wer vorher weiß, dass die Freigabe noch kommt, wartet auf sie.

**Und eine Freigabe gilt einem Stand.** Das Gerät führt je App zwei, und ein gerade eingespieltes
Paket liegt nur im Teststand. Wer allein für den Livestand freigegeben ist, sieht ihn nicht: die
Freigabe steht, die Übersicht bleibt leer, und das ist der verwirrendste aller Zustände. Die
Freigabe muss also den Teststand meinen. Wie das dort heißt, steht im Admin-Handbuch und nicht
hier. Ein Fremdtest am 29.08.2026 ist genau daran hängen geblieben, mit gesetztem Häkchen.

**Test und live haben je eine eigene Datenbank.** Wer live schaltet, nimmt die Daten des
Teststands nicht mit: der Livestand beginnt beim ersten Mal leer und behält danach seine eigenen
über jede Fassung. Sag das vor dem ersten Schalten, sonst wundert sich der Fachmensch über eine
leere App. Was live von Anfang an da sein muss, Mandanten etwa, legt jemand dort an, oder die App
bringt es als Migration mit.

Nach dem Schalten: ein Satz in den Verlauf des Kunden oder in den Laufzettel des Geräts,
und die README der App fortschreiben. Sie ist der Ist-Stand in den Worten dessen, der die
App benutzt: was sie heute kann, was sie nicht kann, was man wissen muss.

## Auf ein Gerät ohne Arasul

```
node .ara/tools/app.mjs --device <gerät> --app <name> --compose --port 8080
```

Die Dateien gehen über SSH an das Gerät, dort stellt Compose zwei Container: einen
Webserver für die Oberfläche und einen für das Backend, gebaut aus dem Bauplan im Paket.

**Sag vorher, was dabei fehlt**, und sag es in denselben Worten, die das Werkzeug
hinterher ausgibt: keine Anmeldung, kein Flow, keine Freigabe, ein Stand statt zwei, kein
Schlüssel und damit keine Schnittstelle von Arasul. Wer die Adresse und den Port erreicht,
sieht die App. Das ist ein Weg zum Vorführen und zum Ausprobieren, kein Weg für einen
Betrieb mit echten Daten.

Das ist ein Eingriff der Stufe 2: Absicht, Ziel und Rückweg nennen, bestätigen lassen,
dann aufrufen. Der Rückweg steht am Ende der Ausgabe.

Auch dieser Weg schreibt in den Merker, als `compose` und nicht als Teststand oder live.
Ohne diese Notiz sagte die Lage, von einer App sei nichts an ein Gerät gegangen, während
sie dort antwortete.

## Das Aussehen

Die Vorlage bringt das Erscheinungsbild von Arasul mit, damit eine App im Rahmen der
Oberfläche nicht wie ein Fremdkörper steht. Es ist **ein** Stück, und es gehört dem Produkt:
`frontend/src/marken/`, der Spiegel der Bibliothek. Er trägt alle drei Sätze, die Werte
beider Themen (`theme.css`) und die Regeln der sechs Bausteine (`marken.css`). Der Ordner
wird **ersetzt, nicht fortgeschrieben.** Der Wächter `node .ara/tools/marken.mjs` hält ihn
an seiner Quelle.

Bis 0.17.0 gab es ein zweites Stück, `frontend/src/design.css`, mit den aus der Shell
abgelesenen Werten. Seit die Bibliothek ihre Marken selbst trägt, wären das zwei Dateien,
die dieselben Marken setzen, und die beiden waren sich nicht einig, welches Thema die
Vorgabe ist. Es gibt jetzt nur noch eines.

Welche Sätze es gibt, wie eine Seite aus ihnen entsteht und was dabei verboten ist,
steht in `.ara/knowledge/design-system.de.md`. Lies das, bevor du an einer Oberfläche baust.

Eigene Regeln gehören ans Ende von `stil.css`, und sie benutzen nur die Namen der Marken,
keinen einzigen Farbwert. Halt dich daran, wenn du etwas dazubaust: was als Farbe in einer
Regel steht, bleibt beim nächsten Stand zurück.

**Das Kit baut nur Apps, die auf der Bibliothek stehen.** Ohne das sehen die Apps eines
Partners nach drei Monaten alle anders aus, und das einheitliche Bild ist weg. Das Gerät
vergleicht ausdrücklich nicht, und der Wächter des Produkts prüft nur die Shell: gehalten
wird der Standard hier, vor jedem Bau und vor jedem Weg auf ein Gerät (`--build`,
`--check`, `--deploy`, `--compose`). Vier Befunde halten das Werkzeug an, jeder mit dem
Satz, was stattdessen dorthin gehört:

- **Ein eigener Farbwert.** Werte stehen in der `theme.css` der Bibliothek und nirgendwo
  sonst, eine Regel der App nimmt eine Marke. Falsch: `color: #e11d48;` oder
  `background: rgb(225 29 72);` in der `stil.css`. Richtig: `color: var(--ara-fehler);`.
- **Eine Tailwind-Palettenfarbe.** Es gelten nur die Token-Klassen des Themas, sie folgen
  dem Gerät. Falsch: `className="bg-red-500"` oder `text-white`. Richtig: `bg-primary`,
  `text-muted-foreground`, `border-border`.
- **Ein eigenes Primitiv.** Der Seitentitel ist der Baustein `Kopf`, kein eigenes `<h1>`;
  eine Tabelle ist das Primitiv `Table` oder das Muster `Datenliste`, kein eigenes
  `<table>`; dasselbe gilt für `<dialog>` (`Dialog`), `<fieldset>` (`Feldgruppe`) und eine
  handgebaute Reiterleiste mit `role="tablist"` (`Tabs`).
- **Das Feld `marken` fehlt oder ist veraltet.** Das Manifest sagt, auf welcher Fassung des
  Designsystems die App steht, und die Kopie in der App ist der Anker: wer
  `frontend/src/marken/` trägt, muss das Feld führen, das Feld muss die Fassung der Kopie
  nennen, und das Feld ohne Kopie ist genauso rot. `--new` schreibt es, `marken.mjs --sync`
  hält es aktuell.

Gemessen wird der eigene Quelltext der Oberfläche, nicht der Spiegel `src/marken/`: der
gehört dem Produkt, und ob er stimmt, sagt `marken.mjs` über seine Hashes. **Ein fremder
Container ist ausgenommen**: eine App ohne `frontend` im Manifest, mit fertigem `image`
statt eines eigenen Baus, bringt keine Oberfläche mit, die neben der des Geräts stehen
könnte. Der Selbsttest hält die Vorlage selbst an dieselbe Regel.

**Das Thema kommt vom Gerät und nicht aus der App.** Die Shell schreibt es in das Dokument
der App selbst, bei jedem Wechsel und bei jedem Laden, und schickt denselben Wert zusätzlich
als Nachricht; Hell setzt nichts, denn `:root` ist hell. `frontend/src/rahmen/thema.ts`
liest deshalb und rät nicht. Ohne Rahmen, also direkt in einem Tab, gilt die Einstellung des
Betriebssystems, und erst dann schreibt die App das Attribut selbst.

Wenn du das prüfst, prüf es in beiden Themen und in beiden Breiten: 390 für das Telefon,
1440 für den Schreibtisch. Unter 900 Pixeln wird die Seitenleiste ein Blatt über der Seite
und eine Datenliste eine Kartenliste, und eine Seite, die dort waagerecht rollt, ist kaputt.

## Eine Fach-App: Daten, die bleiben, Mandanten, vier Augen, Belege

Eine Kanzlei, eine Praxis, ein Büro mit Akten: dort reicht der Vorgang der Vorlage nicht. An
sechs Stellen biegt ein Agent ohne dieses Blatt falsch ab, gefunden in einem Fremdtest am
25.09.2026, bei dem ein fremder Agent mit dem Kit allein eine App für Belege einer Kanzlei baute.
Die sechs Abschnitte hier sind die Antworten.

### Dauerhafte Daten

**Dauerhaft ist genau ein Ort: die Datenbank, die das Gerät der App gibt.** Der Kontrakt sagt es
unter `daten`, und `--contract` gibt es wörtlich aus. Eine App mit Backend bekommt je Stand eine
eigene PostgreSQL, ihre Adresse steht in dem Umgebungswert, den der Kontrakt unter
`umgebung.datenbank` nennt, und das Kit schreibt diesen Namen in `arasul.json`. Sie überlebt
jedes Einspielen, jedes Schalten und jeden Neustart, und das Gerät sichert sie jede Nacht, je App
und Stand. Wie die Daten einer einzelnen App zurückkommen, nennt der Kontrakt unter
`daten.wiederherstellen`; das tut ein Administrator.

**Was nicht bleibt:** das Dateisystem des Containers, auch ein `VOLUME` aus dem Dockerfile. Das
Gerät ersetzt den Container bei jedem Einspielen. Eine SQLite-Datei, ein Ordner mit
hochgeladenen Dateien, ein Protokoll auf der Platte: nach dem nächsten Update weg. Eine
hochgeladene Datei gehört in eine Spalte (`BYTEA`), wie im Muster Dokumente. Entfernen der App
wirft ihre Datenbanken weg, die Sicherungen davon bleiben.

**Die Vorlage tut das schon.** `backend/ablage/db.mjs` liest den Namen aus der Vereinbarung und
öffnet die Datenbank des Geräts; nennt die Vereinbarung einen Namen und der Wert ist leer,
startet die App nicht, statt still in eine Datei zu schreiben. Ohne Gerät nimmt sie SQLite, und
`GET /lage` sagt dann `dauerhaft: false`. Woran du am Gerät siehst, dass es stimmt: `--check`
sagt „Eine eigene Datenbank kommt mit“, und im Protokoll des Containers steht beim Start „Sie
liegt in der Datenbank des Geräts“.

**Die Datenbank beginnt leer**, und das Schema legt die App selbst an, mit ihren Migrationen.
Test und live haben je eine eigene, siehe oben unter „Auf ein Gerät mit Arasul“.

Gemessen am 25.09.2026 am Orin mit einer Probe aus der Vorlage und den Mustern Dokumente und
Dokument auslesen: drei Migrationen liefen in der PostgreSQL des Geräts; nach dem Einspielen der
nächsten Fassung lagen Belege und Protokoll noch da, eine Datei im Container war weg; der
Livestand begann mit einer eigenen, leeren Datenbank.

### Sichtbarkeit innerhalb einer App

Zwei Fragen, und sie haben zwei Antworten:

1. **Wer kommt hinein?** Das entscheidet das Gerät. Es liefert eine App nur dem aus, dem sie
   freigegeben ist, je App und Stand. Eine Prüfung in der App ersetzt das nicht.
2. **Was sieht jemand darin?** Das entscheidet die App. Das Gerät kennt keine Mandanten,
   Abteilungen oder Akten, und es soll sie nicht kennen.

Die App weiß, wer da ist: die Plattform setzt vor dem Container zwei Kopfzeilen, Benutzername und
Rolle, und löscht, was von außen kam. **Ihre Namen stehen in `arasul.json` unter `koepfe`**, und
die Vorlage liest sie mit `geraet.angemeldet(anfrage.headers)`. Schreib keinen Kopfzeilennamen in
den Quelltext; der Selbsttest hält Vorlage und Muster daran.

**Erlaubt ist eine Zuordnung in der App**: eine Tabelle, welches Konto welchen Mandanten sieht,
geschlüsselt am Benutzernamen aus der Kopfzeile. Das ist keine zweite Anmeldung, denn niemand
meldet sich bei der App an: es gibt kein Passwort, kein Konto, das die App anlegt, keinen Namen,
den jemand ins Formular tippt. Die Rolle aus der Kopfzeile darf die App auswerten, etwa so, dass
nur ein Administrator Zuordnungen pflegt. Was ein Administrator in der App sieht, entscheidet der
Plan, nicht die Rolle allein.

**Woher die Namen kommen.** Der Schlüssel einer App kann die Konten des Geräts nicht auflisten.
Die App merkt sich deshalb jeden Namen, den sie in der Kopfzeile sieht, mit dem ersten und dem
letzten Mal, und wer Zuordnungen pflegt, wählt aus diesen. Ein Name, den es am Gerät nicht mehr
gibt, lässt niemanden hinein: er bleibt in der Liste stehen und wird als lange nicht gesehen
gezeigt.

**Durchgesetzt wird in der Ablage, bei jeder Abfrage**, nicht in der Oberfläche: die Liste, das
einzelne Ding, seine Datei, der Export, die Routen im Feld `agent`. Ein fremdes Ding antwortet
mit 404 und nicht mit 403, sonst verrät die Antwort, dass es existiert. Geprüft wird mit zwei
Konten und zwei Mandanten: jeder Weg einmal als der, der nichts sehen darf. Ein Fremdtest am
25.09.2026 fand so alle Wege der App dicht und genau eine Lücke außerhalb von ihr, die Karte der
Freigabe; die schließt der nächste Abschnitt.

### Freigaben in einer Fach-App

Ohne Regel entscheidet über eine Freigabe **jeder, dem die App freigegeben ist**, und jeder davon
sieht die Karte mit ihrem Text, auch für einen Mandanten, der nicht seiner ist. Seit dem
25.09.2026 nennt der Kontrakt unter `freigaben`, wie eine App den Kreis beim Start eines Laufs
enger zieht, nie weiter:

- **`einreicher`**: der Benutzername aus der Kopfzeile, wer den Lauf auslöst.
- **`freigabe.ohne_einreicher: true`**: vier Augen, der Einreicher entscheidet nicht.
- **`freigabe.entscheider`**: entweder `{"rolle": "admin"}` oder `{"konten": [...]}`. Nur diese
  Menschen sehen und entscheiden die Anfrage, jeder andere sieht sie nicht und bekommt beim
  Entscheiden 403.

Die genauen Regeln stehen im Kontrakt, `--contract` gibt sie wörtlich aus. **Für eine Fach-App
heißt das:** die Entscheider kommen aus der Zuordnung, die Konten, die dem Mandanten dieses
Vorgangs zugeordnet sind, und der Einreicher ist ausgeschlossen. Bleibt danach niemand, weist das
Gerät den Start mit 400 ab, statt eine Anfrage anzulegen, die in ihre Frist läuft, und die App
zeigt diesen Satz am Vorgang. Das ist ein Fall für den Plan: wer entscheidet, wenn einem Mandanten
nur eine Person zugeordnet ist?

**In den Text der Anfrage gehören Verweise, keine Inhalte**: „Beleg 17, eingereicht von anna“,
nicht Betrag, Name des Mandanten und Buchungstext. Was ein Lauf bekommt, liegt am Gerät bei jedem
Lauf; was im Beleg steht, liegt in der App und folgt ihrer Sichtbarkeit. Wer entscheidet, liest
den Beleg in der App unter seiner Nummer. Die Vorlage tut das schon: ihr Flow bekommt die Nummer
des Vorgangs und den Einreicher, sonst nichts.

**Wie die Vorlage es trägt.** `arasul.json` sagt unter `freigaben`, ob dieses Gerät Einreicher
und Regel annimmt; ein Gerät davor weist einen Start mit einem Feld, das es nicht kennt, ab, und
die Vorlage schickt sie deshalb nur dann. Den Einreicher schickt sie immer mit, wenn das Gerät ihn
kennt. Die Regel gibt `regel` im Kern zurück, aus dem Vorgang; `VIER_AUGEN` in `server.mjs`
schaltet den Ausschluss des Einreichers ein. Verlangt ein Vorgang eine Regel und das Gerät nimmt
keine an, startet kein Lauf, und der Vorgang sagt warum: eine Freigabe, die jeder sehen könnte,
wäre schlimmer als keine.

### Dokumente und Bilder auslesen

Das Gerät liest ein Dokument in Felder: die App schickt die Datei und ein JSON-Schema, das
Gerät holt den Text heraus und lässt ein Sprachmodell die Felder füllen. **Der Weg steht in
`arasul.json` unter `wege.dokument_auslesen`**, geschrieben aus dem Kontrakt; die App schreibt ihn
nie in ihren Quelltext. Das Muster mit Code, der am Orin lief, ist Nummer 6 in
`.ara/knowledge/app-patterns.de.md`, unter `.ara/templates/app-patterns/extract/`.

**Fotos und gescannte PDFs.** Hat ein PDF eine Textschicht, liest das Gerät sie direkt. Ein Foto
oder ein gescanntes PDF geht durch die Texterkennung des Geräts, und die Antwort sagt, ob sie lief;
das Muster schreibt es ins Protokoll. **Das Modell sieht dann den erkannten Text, nicht das Bild.** Wie gut ein
Feld wird, entscheidet also die Texterkennung: ein schiefes, unscharfes Foto, Handschrift, ein
Stempel über der Zahl kosten Felder. Gemessen am 25.09.2026 am Orin: ein erfundener Beleg als PDF
mit Textschicht, sechs von sechs Feldern in 35 Sekunden; eine erfundene Tankquittung als Foto,
Texterkennung lief, sechs von sechs Feldern in 13 Sekunden.

**Ob ein Bildmodell geladen ist, spielt für diesen Weg keine Rolle**, denn er gibt kein Bild an
ein Modell. Gelesen am 25.09.2026 im Kontrakt der Fassung 6: keiner seiner Endpunkte gibt ein
Bild an ein Modell, und `GET /models` nennt die Modelle am Gerät, aber nicht, welches Bilder
versteht. Ob das noch gilt, sagt `--contract` an dem Gerät, um das es geht.
Welche Modelle dort liegen und wofür sie vorgesehen sind, zeigt die Modellseite in der Oberfläche
des Geräts, und das Admin-Handbuch sagt, wo; über SSH fragst du es mit `remote.mjs`. **Sag einem
Kunden kein Bildverständnis zu**, keine Handschrift, kein Foto einer Ware, bevor du es an seinem
Gerät gesehen hast.

**Welches Modell liest, sagt die Antwort** (`model`), und das gehört ins Protokoll. Die App nennt
keines und nimmt die Vorgabe des Geräts. **Das Feld `modelle` in `app.json` ist eine Forderung,
keine Lieferung**: das Gerät installiert kein Modell nach, es sagt beim Einspielen, welches fehlt.
Leer, wie in der Vorlage, heißt: die App braucht keines beim Namen. Trag dort nur ein, was die App
oder ein Flow ausdrücklich beim Namen ruft.

**Das Modell schlägt vor, die App prüft, ein Mensch entscheidet.** Was zurückkommt, hält die App
gegen das Schema und gegen ihre fachlichen Regeln, ein Konto, das es im Kontenrahmen nicht gibt,
ein Steuersatz, der nicht passt, und schreibt jeden Befund an die Auslesung. Jede Auslesung ist
eine neue Zeile im Protokoll, mit Modell, Dauer, Texterkennung und wer sie anstieß; keine wird
geändert. Das Auslesen wartet, bis das Modell geantwortet hat, eine halbe Minute ist normal,
mehrere Minuten sind es, wenn das Modell erst geladen wird. Der Schlüssel der App braucht dafür
den Bereich, den der Kontrakt am Endpunkt nennt; fehlt er, antwortet das Gerät 403, und das ist
eine Entscheidung des Administrators.

### Fachstandards

Ein Exportformat wie der DATEV-Buchungsstapel (EXTF), ein Kontenrahmen wie SKR03, die GoBD,
XRechnung: **das sind keine Produktwerte**, und die Regel „nicht das Internet“ aus
`.ara/knowledge/live-knowledge.de.md` gilt für sie nicht. Sie stehen weder im Kontrakt noch am
Gerät, und das Kit führt sie nicht. Sie kommen aus ihrer **Primärquelle**: der
Entwicklerdokumentation oder dem Hilfe-Center des Herausgebers, dem Schreiben des
Bundesfinanzministeriums, der Norm. **Mit Adresse und Abrufdatum**, im Plan und im Kopf der
Datei, die das Format schreibt. Eine Sekundärquelle, ein Repository auf GitHub, ein Blog, taugt
zum Gegenlesen und wird als solche genannt.

Was sich so nicht prüfen ließ, steht als Annahme im Plan: ein Prüfprogramm des Herausgebers, das
nicht zur Hand war, eine Spalte, die zwei Quellen verschieden schreiben. **Vor dem Schalten nach
live** geht eine Probedatei an den, der sie verarbeitet, den Steuerberater mit seinem Import
etwa, und seine Antwort ist der Nachweis. Ein Prüfskript für das Format gehört in die App und
läuft bei jedem Export im Test. Zugesagt wird einem Kunden nicht „GoBD-konform“ und nicht
„DATEV-zertifiziert“, sondern was die App tut: welches Format, welche Fassung, nachvollziehbar wodurch.

## Was die Vorlage schon ist

Der Klon bringt keine App mit. Wie eine App aussieht, steht in der Vorlage unter
`.ara/templates/app/`, und was `--new` daraus macht, läuft von der ersten Minute an: ein
Vorgang wird eingereicht und liegt in der Datenbank des Geräts, das Backend startet den Flow
`freigabe` mit der Nummer des Vorgangs und seinem Einreicher, der Flow hält an seinem
Freigabe-Schritt an, ein Mensch entscheidet in Arasul, und danach steht der Vorgang auf
genehmigt oder abgelehnt, mit dem Namen dessen, der entschieden hat, und dem Satz, den der
Flow geschrieben hat. Ohne Arasul wird der Vorgang angenommen und bleibt ohne Entscheidung,
und die Seite sagt das.

Wenn jemand fragt, wie so eine App aussieht, leg eine an und zeig sie, statt es zu
beschreiben:

```
node .ara/tools/app.mjs --app <name> --new
```

**Sie beschreibt sich für Agenten.** `app.json` trägt ein Feld `agent`, eine Liste der Routen,
die ein Agent aufrufen darf, und das Backend beantwortet die Route `agent` mit diesem Feld,
Kennung, Name und Version. Das CLI einer Wurzel, `arasul.mjs`, ruft nur auf, was dort steht, und
eine Route, die etwas ändert, braucht `--write` vom Menschen. Eine zweite Liste gibt es nicht:
der Bau legt eine Kopie der `app.json` neben das Backend, und die Route liest sie. `--check` und
`--deploy` halten das Feld gegen die App: über die Form urteilt das Schema des Geräts, und das Kit
sagt sein Urteil nicht ein zweites Mal; was kein Schema trägt, liest es so, wie das CLI es liest.
Dazu muss jede Route, die dort steht, im Backend stehen, als Zeichenkette oder als Muster. Wie das
Feld aussieht und was das CLI damit tut, steht in `.ara/knowledge/root.de.md`, „Die Brücke zum
Gerät“. **Ein Gerät, dessen Schema für `app.json` das Feld nicht kennt, weist das Paket ab**, und
`--check` sagt es: nimm das Feld dann heraus, bis das Gerät es annimmt.

## Woraus die Vorlage gebaut ist

Sie steht auf demselben Stapel wie die Oberfläche des Geräts, damit ein Partner nicht zwei
Welten lernt: **Vite, React, TypeScript, Tailwind, `react-router`, TanStack Query.** Was
darüber hinaus zu wissen ist, sind fünf Stellen, und jede gibt es genau einmal:

| Stelle | Was dort steht |
| --- | --- |
| `rahmen/basis.ts` | Unter welchem Pfad die App hängt. Sie rät ihn nicht, sie liest ihn aus der Adresse des Dokuments: live `/apps/<kennung>/`, im Teststand `/apps/<kennung>/test/`. Daraus folgt: **die Wege bleiben eine Ebene tief**, was tiefer will, gehört in die Suchanfrage |
| `rahmen/thema.ts` | Das Thema, gelesen am eigenen Dokument, in das die Shell hineinschreibt |
| `rahmen/schnittstelle.ts` | Das einzige `fetch` der App. Pfad, Anmeldung und der Umschlag um die Antwort stehen dort und sonst nirgends |
| `rahmen/anmeldung.tsx` | Wer da ist, aus `api/me`, als Kontext mit Rolle |
| `rahmen/async-boundary.tsx` | Die drei Ausgänge einer Abfrage: lädt, ging schief, ist da. Jede Abfrage geht hindurch, und die Seiten bekommen ihre Daten fertig |

Das Backend folgt dem Port-Muster: `server.mjs` macht HTTP, `kern/vorgaenge.mjs` macht die
Fälle, und der Kern kennt **zwei Anschlüsse** und die Welt sonst nicht, eine Ablage und ein
Gerät. Beide kommen als Argument herein, also steht im Kern kein `fetch`, kein SQL und kein
Griff in die Umgebung, und jeder Fall lässt sich prüfen, ohne eine Datenbank und ein Gerät
zu haben. Je Entität eine Ablage, und in ihr das einzige SQL dazu. Eine zweite Entität
bekommt eine zweite solche Datei und nicht eine zweite Art, die Datenbank zu rufen.

Die Ablage ist **am Gerät die Datenbank, die das Gerät der App gibt**, PostgreSQL, erreicht
über `pg`, die eine Abhängigkeit des Backends. **Ohne Gerät ist es SQLite aus Node selbst**:
im Selbsttest, auf dem eigenen Rechner, über `--compose`. Es gibt ein SQL und nicht zwei: es
wird geschrieben, wie PostgreSQL es spricht, mit `$1` als Platzhalter, und `ablage/db.mjs`
übersetzt für SQLite genau zwei Dinge, die Platzhalter und die laufende Nummer einer
Tabelle. Daraus folgen drei Regeln: Zeiten stehen als Text im ISO-Format, JSON steht als
Text und die Ablage wandelt es, Bytes stehen als `BYTEA`. Der Stand der Datenbank steht in
ihr selbst, in der Tabelle `migrationen`: eine Migration, die gelaufen ist, läuft nicht noch
einmal. Unter `backend/ablage/migrationen/` liegt eine Datei je Schritt, und **was einmal
gelaufen ist, wird nie wieder angefasst**: wer sie ändert, ändert die Vergangenheit von
Datenbanken, die es schon gibt.

## Was du dabei nicht tust

- **Keine Produktwerte aus dem Kopf.** Modelle, Pfade, Endpunkte und Grenzen stehen im
  Kontrakt des Geräts. Auch für eine App gilt das: `--contract` fragen, nicht raten. Im
  Quelltext einer App gilt es doppelt: was sie davon braucht, bekommt sie in
  `backend/arasul.json`, und was dort nicht steht, hat sie nicht. Ein geratener Wert wird
  zur Laufzeit ein stilles Nichts.
- **Keine zweite Ablage erfinden.** Dauerhaft ist genau ein Ort, die Datenbank, die das
  Gerät der App gibt. Keine Datei im Container, kein Upload-Ordner, kein `VOLUME` im
  Dockerfile, keine Datenbank, die die App sich daneben stellt: alles davon ist nach dem
  nächsten Einspielen weg. Siehe „Dauerhafte Daten“.
- **Keine eigene Anmeldung.** Wer angemeldet ist, sagt die Plattform: der Oberfläche unter
  `api/me`, dem Backend über die Kopfzeilen vor dem Container. Ein Feld im Formular, in das
  jemand einen Namen tippt, ist keine Anmeldung, und ein Passwort in der App ist eine zweite.
  **Wer hineinkommt, entscheidet das Gerät. Was jemand darin sieht, entscheidet die App**, am
  Namen und an der Rolle aus den Kopfzeilen; eine Zuordnung von Konten zu Mandanten ist
  erlaubt und keine zweite Anmeldung. Siehe „Sichtbarkeit innerhalb einer App“.
- **Keine Inhalte in die Freigabeanfrage.** Die Karte sieht jeder im Kreis der Entscheider,
  und der Lauf liegt am Gerät. In die Anfrage gehören Verweise, der Inhalt bleibt in der App.
- **Keine Freigabe, die die App selbst erteilt.** Sie liest ihren Stand und entscheidet
  nicht. Entschieden wird in Arasul, von einem Menschen, dem die App freigegeben ist.
- **Nichts einspielen, was du nicht geprüft hast.** Erst `--check`, dann `--deploy`.

Was eine App von der Plattform bekommt, und wie sie es benutzt, steht in
`.ara/knowledge/platform-services.de.md`: Anmeldung, Freigaben, Flows, die KI-Schnittstelle
mit Schlüssel und der Weg für fremde Werkzeuge. Lies es, bevor du etwas nachbaust, was
das Gerät schon mitbringt.
