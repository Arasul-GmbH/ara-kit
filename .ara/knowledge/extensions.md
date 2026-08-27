# Verfahren: Erweiterungen bauen

> **Wann brauchst du das?** Wenn ein Kunde etwas will, das das Produkt nicht ab Werk kann.

## Wo gebaut wird: auf dem Gerät

Das Produkt bringt eine Arbeitsumgebung auf dem Gerät selbst mit, mit Terminal, Ablage und
Zugang zu den internen Diensten. **Dort wird gebaut, nicht auf dem Partner-Laptop.**

Drei Gründe:

1. **Die Daten bleiben beim Kunden.** Eine Erweiterung, die man lokal gegen Kundendaten
   entwickelt, holt diese Daten auf den Laptop des Partners. Das ist genau das, was das
   Produkt verhindern soll.
2. **Dieselbe Umgebung.** Was auf dem Gerät gebaut wird, läuft auf dem Gerät. Kein „bei mir
   ging es".
3. **Es bleibt beim Kunden.** Auch wenn der Partner wechselt.

Das Kit ist die Ebene darüber: es öffnet die Umgebung, führt die Arbeit, hält fest, was
gebaut wurde. Es hält keinen Kundencode.

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
muss und welche Endpunkte es gibt. Wie eine App dann auf das Gerät kommt, steht in
`.ara/knowledge/apps.md`.

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
Weitergabe durch Dritte ausschliessen. Wenn du so etwas für einen Kunden installierst,
schließt **er** die Lizenz mit dem Anbieter, nicht du und nicht Arasul.

Prüf vor der Installation zwei Dinge und schreib das Ergebnis in den Verlauf:

1. **Unter welcher Lizenz steht sie**, und erlaubt die Lizenz den Einsatz, den der Kunde
   vorhat. Kommerzieller Einsatz im eigenen Betrieb ist meist erlaubt, Weitergabe an
   Dritte oft nicht.
2. **Wer laut Lizenz Lizenznehmer ist.** Trag das in die Leistungsbeschreibung
   Abschnitt 6 ein, damit später klar ist, was bei der Übergabe drauf war und wer
   dafür einsteht.

Für den Betrieb einer Erweiterung wird weder Funktion noch Verfuegbarkeit noch
Verträglichkeit mit kuenftigen Fassungen geschuldet. Sag das dem Kunden, bevor du
etwas installierst, nicht danach.

Verfahren für das Papier: `.ara/knowledge/paperwork.md`

## Abrechnung

Erweiterungen sind Dienstleistung, keine Lizenz. Sie werden getrennt angeboten und
abgerechnet. Der Kunde soll vorher wissen, was ihn erwartet, auch, dass eine Erweiterung
Pflege braucht, wenn sich das Produkt weiterentwickelt.
