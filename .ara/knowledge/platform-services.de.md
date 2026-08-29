# Verfahren: die Dienste der Plattform, und wie eine App sie benutzt

> **Wann brauchst du das?** Wenn eine App etwas von Arasul will: eine Anmeldung, eine
> Entscheidung durch einen Menschen, ein Sprachmodell, ein Dokument, einen Flow. Und
> wenn jemand fragt, was von alldem ohne Arasul übrig bleibt.

## Die Regel zuerst

Dieses Blatt sagt, **wozu** ein Dienst da ist und wie man ihn benutzt. Was er auf einem
bestimmten Gerät heißt, unter welchem Weg er antwortet und welche Grenzen dort gelten,
sagt das Gerät:

```
node .ara/tools/app.mjs --device <gerät> --contract
```

Jeder Weg, der hier steht, steht als Verweis darauf, was im Kontrakt nachzuschlagen ist,
und nicht als Zusage. Genannt wird er trotzdem, denn sonst könnte niemand prüfen, ob
dieses Blatt noch stimmt. Genau dafür gibt es das Werkzeug:

```
node .ara/tools/check-docs.mjs --device <gerät>
```

Es liest jede Route, die im Wissen des Kits steht, hält sie gegen die Endpunktliste des
Kontrakts und ruft am Gerät an. Was dort nicht mehr existiert, fällt auf, bevor ein
Partner danach arbeitet oder es einem Kunden zusagt.

**Zwei Arten von Weg, und der Unterschied entscheidet, wer ihn gehen kann:**

| Art | Wer sich ausweist | Steht im Kontrakt |
|---|---|---|
| Die äußere Schnittstelle | ein Schlüssel in der Kopfzeile, keine Sitzung | ja, mit dem Bereich, den jeder verlangt |
| Ein Weg der Oberfläche | die Sitzung eines angemeldeten Menschen | nein |

Das Kit hat einen Schlüssel und keine Sitzung. Alles, was eine Sitzung braucht, macht
also ein Mensch, im Browser am Gerät, und du siehst zu und schreibst mit. Ein Kit, das
so einen Weg selbst ginge, bräuchte das Passwort eines Administrators.

**Ohne Browser ist das kein Ende.** Die Plattform hat für ihre Verwaltung eine eigene
Schnittstelle, und wie sie geht, steht im Artefakt: Admin-Handbuch und API-Referenz,
beide im Spiegel, zu finden mit `node .ara/tools/mirror.mjs --docs`. Der erste
Mitarbeiter und die erste Freigabe sind der Fall, der einen sonst hängen lässt, und er
steht in `.ara/knowledge/device.de.md` unter "Der erste Mitarbeiter und die erste Freigabe".

## Anmeldung: eine App bekommt keine eigene

Wer an Arasul angemeldet ist und die App freigegeben hat, ist in der App angemeldet. Wer
nicht, kommt nicht hinein. Es gibt keine Sonderregel für Administratoren.

Durchgesetzt wird das **vor** dem Container: die Plattform prüft die Anfrage und setzt
zwei Kopfzeilen, eine mit dem Benutzernamen und eine mit der Rolle. **Wie sie heißen und
welche Rollen es gibt, steht im Kontrakt** unter `koepfe`, samt dem Hinweis, wie der Name
zu lesen ist. Schreib die Namen nicht ab, lies sie dort.

Sie sind nicht fälschbar: was von außen in der Anfrage steht, wird gelöscht, bevor die
Plattform ihre eigenen setzt.

Bequemer als die Kopfzeilen ist der Weg, den die Plattform der App dafür freihält:

```
GET /apps/<id>/api/me
```

Er antwortet mit Kennung, Stand, Benutzer und Rolle. Der Teststand hat seinen eigenen
darunter. Welche Namen unter `/apps/<id>/` der Plattform gehören und welche der App,
steht im Kontrakt unter `apps.vergeben`.

**Was du daraus nicht baust:** kein Anmeldeformular in der App, kein Feld, in das jemand
seinen Namen tippt, keine eigene Benutzerliste. Das wäre eine zweite Anmeldung neben der
echten, und sie würde niemanden abhalten.

## Freigaben: ein Lauf hält an, ein Mensch entscheidet

Ein Flow kann anhalten und um Freigabe bitten. Das Werkzeug dafür heißt
`freigabe_anfordern` und steht in der Schritt-Kette des Flows, mit einem Titel, dem
Zusammenhang und einer Frist. Der Lauf steht danach auf wartend, und ohne Entscheidung
läuft nichts weiter.

Das ist etwas anderes als eine Rückfrage im Gespräch: eine Rückfrage geht an den, der
gerade zusieht, und ohne Antwort läuft der Flow mit einer Annahme weiter. Eine Freigabe
geht an jeden, dem die App freigegeben ist, und **ohne Antwort läuft gar nichts weiter**.

Drei Ausgänge, und sie stehen am Lauf: bestätigt, dann läuft er ab dem angehaltenen
Schritt weiter. Abgelehnt, dann endet er, und die Begründung ist sein Grund. Niemand
entscheidet bis zur Frist, dann endet er ebenfalls.

**Entschieden wird über die Sitzung eines Menschen**, nicht über einen Schlüssel:

```
GET  /api/freigabe-anfragen
POST /api/freigabe-anfragen/<id>/bestaetigen
POST /api/freigabe-anfragen/<id>/ablehnen
```

Diese drei Wege stehen darum nicht im Kontrakt, und das Kit ruft sie nicht. Wer
entscheiden will, ist angemeldet, und das ist der Kunde.

**Die App liest ihren Stand und entscheidet nicht:**

```
GET /api/v1/external/freigaben
```

Mit ihrem eigenen Schlüssel, mit der Lauf-Nummer als Frage dahinter. Eine App, die ihre
eigene Freigabe erteilen könnte, wäre keine.

**Wer entscheiden darf, sagt der Kunde, nicht der Flow.** Ein Flow nennt keine Person und
keine Rolle, er beschreibt die Sache. Die Zuständigkeit ist dieselbe Freigabe, mit der
jemand die App überhaupt benutzen darf.

Was du dem Kunden **nicht** ungeprüft zusagst: dass ein wartender Lauf beliebig lange
steht. Frag das am Gerät nach, bevor ein Ablauf darauf gebaut wird, in dem eine Freigabe
tagelang offen liegt.

## Flows: eine Datei je Flow, das Modell steht im Kopf

Ein Flow ist eine Aufgabe, die ein Sprachmodell mit Werkzeugen erledigt. Als Datei ist er
Markdown mit einem Kopf: der Kopf sagt, was der Flow braucht und darf, der Text darunter
ist der Auftrag.

**Ein Flow im Paket ist eine Lieferung.** Das Paket bringt die Dateien mit, das Gerät
registriert sie je App und Stand. Der Namensraum ist die App: zwei Apps dürfen denselben
Flow-Namen tragen.

**Das Schema des Kopfes und die Regeln für einen Flow aus einem Paket stehen im
Kontrakt** unter `flow_frontmatter`: das Schema als Schema, dazu die Regeln als Sätze und
der Hinweis, dass der Auftrag der Rumpf ist und kein Feld im Kopf. `--contract` gibt
beides wörtlich aus. Schreib es nicht ab, lies es an dem Gerät, um das es geht.

**Das Modell im Kopf ist der Vorschlag des Partners.** Der Administrator am Gerät darf es
je Flow überschreiben; seine Entscheidung liegt am Gerät und nicht in der Datei und
überlebt darum jedes App-Update. Zwei Folgen für dich: schreib in die README einer App
nicht, mit welchem Modell sie läuft, und such einen Unterschied im Verhalten nicht zuerst
im Paket.

Von außen angestoßen wird ein Flow über die äußere Schnittstelle:

```
GET  /api/v1/external/flows
POST /api/v1/external/flows/<name>/run
GET  /api/v1/external/flows/runs/<id>
```

Was ein Schlüssel dabei sieht, entscheidet der Schlüssel: der einer App sieht nur ihre
eigenen Flows in ihrem Stand. Wiederkehrende Starts löst du von außen über denselben Weg
aus, aus einem Zeitplan auf einem Rechner, der ohnehin läuft.

**Ein Flow mit Freigabe-Schritt wird gestartet, ohne auf das Ergebnis zu warten.** Er
hält an, bis ein Mensch entscheidet, und das kann dauern; ein wartender Aufruf läuft
vorher in sein Zeitlimit. Die Lauf-Nummer kommt sofort, den Rest fragst du nach.

## Die KI-Schnittstelle: mit Schlüssel, ohne Sitzung

Ein Sprachmodell fragen, den Stand eines Auftrags lesen, sehen, welche Modelle am Gerät
sind, Text aus einer Datei holen und sie auswerten lassen:

```
POST /api/v1/external/llm/chat
GET  /api/v1/external/llm/job/<id>
GET  /api/v1/external/llm/queue
GET  /api/v1/external/models
POST /api/v1/external/document/extract
POST /api/v1/external/document/extract-structured
POST /api/v1/external/document/analyze
```

**Welche davon dieses eine Gerät führt, steht in seinem Kontrakt**, und dort steht auch,
welchen Bereich ein Schlüssel dafür tragen muss. Das Kit ruft nichts auf, was das Gerät
nicht verspricht. Fehlt einem Schlüssel der Bereich, weist das Gerät ab, und das ist kein
Fehler des Kits, sondern eine Entscheidung des Administrators.

Die Kopfzeile für den Schlüssel und sein Vorsatz stehen ebenfalls im Kontrakt, unter
`schluessel`. Der Schlüssel des Kits kommt aus `/device` mit `--deploy-key`; den Schlüssel
einer App legt das Gerät beim Einspielen selbst in den Container, zusammen mit der
Adresse der Schnittstelle. Welche Namen die beiden Werte tragen, sagt der Kontrakt unter
`umgebung`.

**Die App erfährt diese Namen vom Kit und nicht aus ihrem eigenen Quelltext.** Beim
Einspielen liest `app.mjs` sie aus dem Kontrakt des Geräts und legt sie zusammen mit der
Kopfzeile und den Wegen als `backend/arasul.json` ins Paket. Eine App, die stattdessen
einen Namen errät, findet auf einem Gerät, das ihn anders nennt, nichts und hält das für
ein Gerät ohne Arasul.

**Der Chat ist zustandslos.** Jeder Aufruf ist ein eigener Auftrag mit genau der
Vorgeschichte, die mitgeschickt wird. Wer einen Verlauf will, führt ihn selbst und schickt
ihn mit. Eine App, die auf ein Gedächtnis am Gerät baut, baut auf etwas, das es nicht
gibt.

## Der Weg für fremde Werkzeuge

Neben der eigenen Schnittstelle beantwortet das Gerät die Aufrufe, die verbreitete
KI-Bibliotheken sprechen:

```
POST /v1/chat/completions
POST /v1/embeddings
GET  /v1/models
```

Angemeldet wird mit demselben Schlüssel, in der Schlüsselkopfzeile oder als
`Authorization: Bearer`. Wofür das gut ist: das Backend einer App nimmt eine fertige
Bibliothek und richtet sie auf das Gerät, statt einen eigenen Client zu bauen.

**Diese Wege stehen nicht im Kontrakt.** Der Kontrakt beschreibt, was zwischen Kit und
Gerät vereinbart ist, und dieser Weg ist für fremde Werkzeuge da. Daraus folgt zweierlei:
das Kit ruft ihn nicht von sich aus, und **bevor du ihn einem Kunden zusagst, prüfst du
ihn an seinem Gerät.** `node .ara/tools/check-docs.mjs --device <gerät>` fragt ohne
Schlüssel an und sagt, ob es den Weg dort gibt.

## `app.json` und der Flow-Kopf: das Schema liegt am Gerät

Was in ein Manifest gehört, ist keine Sache dieses Blattes. Das Gerät gibt sein Schema
aus, und daneben die Regeln, die kein Schema tragen kann. Beides prüft das Kit für dich:

```
node .ara/tools/app.mjs --device <gerät> --check <ordner>
```

**Die Regeln ohne Schema sind kein Beiwerk.** Ein Manifest kann gegen das Schema gültig
sein und trotzdem abgewiesen werden. Das Werkzeug gibt sie wörtlich aus, und du gehst sie
einzeln durch. Der ganze Weg eines Pakets steht in `.ara/knowledge/deploy.de.md`.

## Die Sicherung

Die Frage, die ein Kunde nach einem halben Jahr stellt, hat zwei Teile: **sichert das
Gerät wirklich**, und **wann lag zuletzt eine Kopie außerhalb des Geräts**. Beide
beantwortet ein Weg der Oberfläche:

```
GET /api/backup/status
```

Er verlangt eine Sitzung als Administrator. Kein Kit-Schlüssel öffnet ihn, er steht darum
nicht im Kontrakt, und `/maintain` sagt in diesem Fall „das Gerät nennt dafür keinen
Endpunkt". Das heißt nicht, dass nicht gesichert wird, sondern dass das Kit es auf diesem
Weg nicht messen kann.

Zwei Wege, und du sagst, welchen du gegangen bist:

1. **Im Browser am Gerät**, der Mensch ist angemeldet. Du siehst die Antwort, er auch.
2. **Über SSH**, mit dem, was am Gerät dafür da ist.

Ein Ziel außerhalb ist eine Platte oder eine Freigabe im Kundennetz, kein Ziel in einer
Cloud. Fehlt es, sagt die Antwort den Grund, und der gehört ins Gespräch: eine Sicherung,
die neben dem Gerät liegt, ist nach einem Wasserschaden auch weg.

**In eine Leistungsbeschreibung oder ein Übergabeprotokoll kommt nur, was du gesehen
hast**, mit Datum und mit dem Weg, auf dem du es gesehen hast.

## Was ohne Arasul fehlt

Dieselbe App läuft auch auf einem Gerät ohne Arasul, über Compose:

```
node .ara/tools/app.mjs --device <gerät> --app <name> --compose --port 8080
```

Dann fällt alles weg, was auf diesem Blatt steht: die Anmeldung, die Flows, die
Freigaben, der zweite Stand und der Schlüssel, mit dem eine App die Schnittstelle
erreicht. Das Werkzeug zählt es beim Aufsetzen auf und schreibt es in den Kopf der
erzeugten Datei. **Sag es vorher und mit denselben Worten**, statt es hinterher in der
Ausgabe stehen zu lassen.

Das ist ein Weg zum Vorführen und zum Ausprobieren. Für einen Betrieb mit echten Daten
ist er keiner: wer die Adresse und den Port erreicht, sieht die App.

## Wenn ein Weg fehlt

Nennt der Kontrakt einen Weg nicht, ruft das Kit ihn nicht auf. Das ist kein Fehler des
Werkzeugs, sondern die Aussage, dass dieses Gerät ihn nicht anbietet, und meistens heißt
das: es ist älter als das Kit. Was dann gilt, steht in `.ara/knowledge/deploy.de.md` unter
der Kontraktversion.

Fällt dir auf, dass dieses Blatt einen Weg nennt, den es an einem aktuellen Gerät nicht
mehr gibt, ist das eine Rückmeldung ans Kit und keine Kleinigkeit. `check-docs.mjs` mit
`--device` sagt es dir mit einem Satz je Route.
