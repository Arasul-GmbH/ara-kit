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
| **Wo ein Mensch entscheidet** | Jede Stelle, an der ein Lauf anhalten und auf eine Freigabe warten soll, und was der Mensch dabei sehen muss |
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
Gerät ihr die Adresse der Schnittstelle und den Schlüssel in den Container legt, in welcher
Kopfzeile der Schlüssel mitgeht, welche Wege es für einen Flow führt: alles das ist zwischen Kit
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
die Freigabe geht, steht in der API-Referenz und im Admin-Handbuch des Artefakts,
`node .ara/tools/mirror.mjs --docs`, und nie im Kit.

**Sag das vor dem Einspielen, nicht danach.** Wer eine 403 vorgesetzt bekommt, hält das Kit für
kaputt. Wer vorher weiß, dass die Freigabe noch kommt, wartet auf sie.

**Und eine Freigabe gilt einem Stand.** Das Gerät führt je App zwei, und ein gerade eingespieltes
Paket liegt nur im Teststand. Wer allein für den Livestand freigegeben ist, sieht ihn nicht: die
Freigabe steht, die Übersicht bleibt leer, und das ist der verwirrendste aller Zustände. Die
Freigabe muss also den Teststand meinen. Wie das dort heißt, steht im Admin-Handbuch und nicht
hier. Ein Fremdtest am 29.08.2026 ist genau daran hängen geblieben, mit gesetztem Häkchen.

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

## Was die Vorlage schon ist

Der Klon bringt keine App mit. Wie eine App aussieht, steht in der Vorlage unter
`.ara/templates/app/`, und was `--new` daraus macht, läuft von der ersten Minute an: ein
Vorgang wird eingereicht, das Backend startet den Flow `freigabe`, der Flow hält an seinem
Freigabe-Schritt an, ein Mensch entscheidet in Arasul, und danach steht der Vorgang auf
genehmigt oder abgelehnt, mit dem Namen dessen, der entschieden hat, und dem Satz, den der
Flow geschrieben hat. Ohne Arasul wird der Vorgang angenommen und bleibt ohne Entscheidung,
und die Seite sagt das.

Wenn jemand fragt, wie so eine App aussieht, leg eine an und zeig sie, statt es zu
beschreiben:

```
node .ara/tools/app.mjs --app <name> --new
```

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

Die Ablage ist SQLite aus Node selbst, ohne ein Paket daneben, und ihr Stand steht in ihr:
eine Migration, die gelaufen ist, läuft nicht noch einmal. Unter
`backend/ablage/migrationen/` liegt eine Datei je Schritt, und **was einmal gelaufen ist,
wird nie wieder angefasst**: wer sie ändert, ändert die Vergangenheit von Datenbanken, die
es schon gibt.

## Was du dabei nicht tust

- **Keine Produktwerte aus dem Kopf.** Modelle, Pfade, Endpunkte und Grenzen stehen im
  Kontrakt des Geräts. Auch für eine App gilt das: `--contract` fragen, nicht raten. Im
  Quelltext einer App gilt es doppelt: was sie davon braucht, bekommt sie in
  `backend/arasul.json`, und was dort nicht steht, hat sie nicht. Ein geratener Wert wird
  zur Laufzeit ein stilles Nichts.
- **Keine zweite Ablage erfinden.** Ein eigener Datenordner je App ist am Gerät noch nicht
  vorgesehen. Die Datenbank der Vorlage liegt deshalb in der schreibbaren Schicht des
  Containers: sie überlebt einen Neustart und **nicht das nächste Einspielen**. Das gehört
  in die README und ins Gespräch, bevor es jemand merkt. Eine App, die sich dafür eine
  eigene Datenbank daneben stellt, hätte eine zweite Ablage neben der, die das Produkt
  später vorsieht.
- **Keine eigene Anmeldung.** Wer angemeldet ist, sagt die Plattform: der Oberfläche unter
  `api/me`, dem Backend über die Kopfzeilen vor dem Container. Ein Feld im Formular, in das
  jemand einen Namen tippt, ist keine Anmeldung. Die Rolle steht dabei und entscheidet
  nichts: **was ein Mensch darf, entscheidet das Gerät**, es liefert eine App nur dem aus,
  dem sie freigegeben ist.
- **Keine Freigabe, die die App selbst erteilt.** Sie liest ihren Stand und entscheidet
  nicht. Entschieden wird in Arasul, von einem Menschen, dem die App freigegeben ist.
- **Nichts einspielen, was du nicht geprüft hast.** Erst `--check`, dann `--deploy`.

Was eine App von der Plattform bekommt, und wie sie es benutzt, steht in
`.ara/knowledge/platform-services.de.md`: Anmeldung, Freigaben, Flows, die KI-Schnittstelle
mit Schlüssel und der Weg für fremde Werkzeuge. Lies es, bevor du etwas nachbaust, was
das Gerät schon mitbringt.
