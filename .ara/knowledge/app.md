# Verfahren: eine App bauen, von der ersten Frage bis live

> **Wann brauchst du das?** Wenn jemand etwas will, das das Produkt nicht ab Werk kann,
> und daraus eine App auf einem Gerät werden soll. Wie ein fertiges Paket auf ein Gerät
> kommt, steht in `.ara/knowledge/deploy.md`; hier steht, wie es überhaupt entsteht.

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

**Das Argument.** `/app urlaubsantrag` meint die App unter `apps/urlaubsantrag/`. Fehlt
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

## Auf ein Gerät mit Arasul

```
node .ara/tools/app.mjs --device <gerät> --app <name> --check
node .ara/tools/app.mjs --device <gerät> --app <name> --deploy
node .ara/tools/app.mjs --device <gerät> --app <name> --live
```

Der Kontrakt des Geräts sagt, was gilt, und `--check` hält das Manifest dagegen, bevor
etwas fliegt. **Ein Deploy rollt immer in den Teststand**, live schaltet ein Mensch, und
zwar nach einer Rückfrage, auch wenn du gerade selbst eingespielt hast. Das Verfahren mit
allem, was dazugehört, steht in `.ara/knowledge/deploy.md`.

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

## Das Aussehen

Die Vorlage bringt das Erscheinungsbild von Arasul mit, damit eine App neben der
Oberfläche des Geräts nicht wie ein Fremdkörper steht. Die Werte dafür stehen in
`frontend/src/design.css`, und sie kommen **aus dem Spiegel**: `.ara/mirror/` ist das
Artefakt, mit dem installiert wurde, und darin steht, was heute gilt. Liegt kein Spiegel
vor, schreibt das Kit seine eigene Vorgabe hinein, und die Datei sagt das in ihrem Kopf.

Die Regeln daneben in `stil.css` benutzen nur die Namen der Marken, keinen einzigen
Farbwert. Halt dich daran, wenn du etwas dazubaust: was als Farbe in einer Regel steht,
bleibt beim nächsten Stand zurück.

## Wo die Referenz-App hilft

Unter `apps/urlaubsantrag/` liegt eine fertige App zum Ansehen: sie stellt einen Antrag,
hält an einer Freigabe an und steht danach auf genehmigt oder abgelehnt. Wenn jemand
fragt, wie so etwas aussieht, zeig sie, statt es zu beschreiben. Sie ist keine Vorlage,
aus der `/app` etwas erzeugt, sondern ein Beispiel, das läuft.

## Was du dabei nicht tust

- **Keine Produktwerte aus dem Kopf.** Modelle, Pfade, Endpunkte und Grenzen stehen im
  Kontrakt des Geräts. Auch für eine App gilt das: `--contract` fragen, nicht raten.
- **Keine zweite Ablage erfinden.** Ein eigener Datenordner je App ist am Gerät noch
  nicht vorgesehen. Was eine App im Speicher hält, ist nach einem Neustart weg, und das
  gehört in die README und ins Gespräch, bevor es jemand merkt.
- **Keine eigene Anmeldung.** Wer angemeldet ist, sagt die Plattform über die Kopfzeilen
  vor dem Container. Ein Feld im Formular, in das jemand einen Namen tippt, ist keine.
- **Keine Freigabe, die die App selbst erteilt.** Sie liest ihren Stand und entscheidet
  nicht. Entschieden wird in Arasul, von einem Menschen, dem die App freigegeben ist.
- **Nichts einspielen, was du nicht geprüft hast.** Erst `--check`, dann `--deploy`.

Was eine App von der Plattform bekommt, und wie sie es benutzt, steht in
`.ara/knowledge/platform-services.md`: Anmeldung, Freigaben, Flows, die KI-Schnittstelle
mit Schlüssel und der Weg für fremde Werkzeuge. Lies es, bevor du etwas nachbaust, was
das Gerät schon mitbringt.
