# Verfahren: Erweiterungen bauen

> **Wann brauchst du das?** Wenn ein Kunde etwas will, das das Produkt nicht ab Werk kann.

## Wo gebaut wird, und wo nicht

**Geschrieben wird beim Partner, gebaut wird am Gerät, und beides hat einen Grund.**

Der Quelltext einer App liegt beim Partner, nicht beim Kunden: dieselbe App läuft
vielleicht bei drei Kunden, und dreimal derselbe Code unter drei Geräteakten ist
dreimal dasselbe Ding, das auseinanderläuft. Das Paket geht als Archiv an das Gerät,
und **das Gerät baut den Container selbst** aus dem Bauplan darin. Ein fertiges Image
wäre für eine Architektur gebaut, und niemand merkt es, bis es dort nicht startet.

Was daraus folgt, gilt weiter:

1. **Die Daten bleiben beim Kunden.** Entwickle nicht gegen Kundendaten auf deinem
   Laptop. Was du zum Ausprobieren brauchst, sind erfundene Daten; das Echte sieht die
   App erst am Gerät. Genau das soll das Produkt verhindern.
2. **Dieselbe Umgebung.** Gebaut wird dort, wo es läuft. Kein „bei mir ging es".
3. **Es bleibt beim Kunden.** Das Gerät trägt die App, auch wenn der Partner wechselt.

Wie ein Paket auf ein Gerät kommt, in den Teststand und von dort live, steht in
`.ara/knowledge/deploy.de.md`, und dort auch, was hineingehört: `app.json` in der Wurzel und
die Ordner, die das Manifest benennt. **Flows gehören dazu, als Lieferung**: das Paket
bringt je Flow eine Datei mit Kopf mit, statt einen Namen zu fordern, den jemand am Gerät
angelegt haben muss. Welche Felder in den Kopf gehören, sagt der Kontrakt des Geräts,
nicht dieses Blatt.

## Vorgehen

### 1. Verstehen, was gebraucht wird

Nicht die gewünschte Lösung, sondern den Arbeitsschritt dahinter. „Wir wollen einen Bot für
Rechnungen" heißt meist: jemand tippt Rechnungsdaten aus PDFs ab. Das ist die Aufgabe.

Frag nach: Wie läuft es heute? Wie oft? Was passiert danach mit dem Ergebnis? Wer macht es?
Was passiert, wenn es einmal falsch ist?

Der letzte Punkt entscheidet über die Bauweise. Etwas, das falsch sein darf und geprüft
wird, ist ein Nachmittag. Etwas, das nie falsch sein darf, ist ein Projekt.

### 2. Nachsehen, was das Produkt schon kann

Bevor irgendetwas gebaut wird: Was gibt es bereits? Die Beschreibung der Schnittstelle
liefert das Gerät selbst, in einem Aufruf:
`node .ara/tools/app.mjs --device <gerät> --contract`. Dort steht, was eine App mitbringen
muss und welche Endpunkte es gibt. Wozu die einzelnen Dienste da sind, Anmeldung,
Freigaben, Flows, Sprachmodell und Dokumente, steht in
`.ara/knowledge/platform-services.de.md`. Wie eine App dann auf das Gerät kommt, steht in
`.ara/knowledge/deploy.de.md`.

Die meisten Kundenwünsche brauchen keine neue Entwicklung, sondern eine Einrichtung.

### 3. Klein anfangen

Der erste Schritt ist immer: **ein Beispiel, das durchläuft.** Ein Dokument, ein Ergebnis,
vom Kunden angesehen. Erst wenn das steht, wird es breiter.

Nicht: drei Wochen bauen und dann vorführen.

### 4. Übergeben

Eine Erweiterung, die nur der Partner starten kann, ist keine Lösung. Zur Übergabe gehört:
wie man sie benutzt, wie man sieht, dass sie läuft, was zu tun ist, wenn sie nicht läuft.

Das gehört in den Verlauf des Kunden, was gebaut wurde, warum, und wo es liegt. In einem
Jahr fragt jemand danach.

## Wer die Erweiterung lizenziert

**Erweiterungen sind nicht Bestandteil der Lieferung.** Auch dann nicht, wenn die
Plattform ihre Installation vorsieht oder erleichtert. Das steht so in den Verträgen,
und es hat eine Folge, die du kennen musst:

**Wer eine Erweiterung installiert, lizenziert sie selbst.** Das gilt für eigene
Erweiterungen genauso wie für fremde Software, die der Kunde dazuhaben will. Viele
verbreitete Automatisierungswerkzeuge stehen unter Lizenzen, die eine entgeltliche
Weitergabe durch Dritte ausschließen. Wenn du so etwas für einen Kunden installierst,
schließt **er** die Lizenz mit dem Anbieter, nicht du und nicht Arasul.

Prüf vor der Installation zwei Dinge und schreib das Ergebnis in den Verlauf:

1. **Unter welcher Lizenz steht sie**, und erlaubt die Lizenz den Einsatz, den der Kunde
   vorhat. Kommerzieller Einsatz im eigenen Betrieb ist meist erlaubt, Weitergabe an
   Dritte oft nicht.
2. **Wer laut Lizenz Lizenznehmer ist.** Trag das in die Leistungsbeschreibung
   Abschnitt 6 ein, damit später klar ist, was bei der Übergabe drauf war und wer
   dafür einsteht.

Für den Betrieb einer Erweiterung wird weder Funktion noch Verfügbarkeit noch
Verträglichkeit mit künftigen Fassungen geschuldet. Sag das dem Kunden, bevor du
etwas installierst, nicht danach.

Verfahren für das Papier: `.ara/knowledge/paperwork.de.md`

## Abrechnung

Erweiterungen sind Dienstleistung, keine Lizenz. Sie werden getrennt angeboten und
abgerechnet. Der Kunde soll vorher wissen, was ihn erwartet, auch, dass eine Erweiterung
Pflege braucht, wenn sich das Produkt weiterentwickelt.
