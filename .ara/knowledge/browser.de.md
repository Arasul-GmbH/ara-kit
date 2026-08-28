# Verfahren: Browser und weitere Werkzeuge

> **Wann brauchst du das?** Immer wenn etwas nur über eine Weboberfläche geht, und bei der
> Frage, welches Werkzeug für eine Aufgabe das richtige ist.

## Der Browser

Das Kit bringt einen Browser mit, den du selbst bedienen kannst: Seiten öffnen, lesen,
klicken, Formulare ausfüllen, Bildschirmfotos machen. Er startet beim ersten Zugriff und
braucht keine Einrichtung.

**Du darfst ihn selbstständig benutzen.** Kein Nachfragen vor dem Öffnen einer Seite, kein
Nachfragen vor einem Klick. Was du im Browser tust, gehört zur Arbeit, nicht zur
Entscheidung.

Die Grenzen bleiben trotzdem dieselben wie überall sonst (`.ara/knowledge/security.de.md`):
Was auf einem Kundengerät etwas **verändert**, ist eine Änderung, egal ob du sie über die
Kommandozeile oder über eine Schaltfläche auslöst. Ein Neustart über das Dashboard bleibt
ein Neustart. Erst fragen, dann klicken.

## Wofür du ihn benutzt

**Die Oberfläche eines Kundengeräts prüfen und bedienen.** Nach der Installation
nachsehen, ob wirklich alles läuft. Den Chat mit einer echten Frage testen, statt nur die
Dienste abzufragen. Einstellungen vornehmen, die es nur dort gibt.

**Belege für die Abnahme sammeln.** Ein Bildschirmfoto vom laufenden System sagt bei einer
späteren Rückfrage mehr als ein Protokolleintrag. Leg sie neben das Abnahmedokument.

**Kundenwebsites lesen.** Beim Anlegen einer Akte selbst nachsehen, statt zu fragen, was
öffentlich dasteht.

**Das Partnerportal bedienen.** Download-Token holen, Bestellungen und Einkaufspreise
nachsehen. Dort liegen echte Geschäftsdaten, also nur, wenn es zur Aufgabe gehört.

## Welches Werkzeug wofür

Der Browser ist mächtig, aber nicht immer das richtige Mittel. Die Reihenfolge:

1. **Ein eigenes Werkzeug des Kits**, wenn es eines gibt. `remote.mjs` für Befehle auf dem
   Gerät, `find-device.mjs` für Erreichbarkeit, `agenda.mjs` für Termine. Sie kennen die
   Verbindungsdaten, protokollieren mit und können nicht das falsche Gerät erwischen.
2. **Die Kommandozeile auf dem Gerät** über `remote.mjs`, wenn es dort einen Befehl gibt.
   Nachvollziehbar, schnell, protokollierbar.
3. **Der Browser**, wenn es nur über die Oberfläche geht oder wenn du sehen musst, was ein
   Mensch sieht.

Wenn ein Weg nicht funktioniert, nimm den nächsten, statt aufzugeben. Sag dabei, welchen
Weg du genommen hast.

## GitHub

Für alles, was mit Repositories zu tun hat, ist die Kommandozeile `gh` da. Sie ist auf den
meisten Rechnern schon angemeldet und braucht kein Token im Kit.

Wofür du sie benutzt:

- **Die Arbeit des Partners sichern.** Das private Repository für `customers` und
  `business` anlegen und pflegen, ohne dass er Git-Befehle lernen muss.
- **Erweiterungen versionieren.** Was für einen Kunden gebaut wurde, bekommt eine
  Historie und kann beim nächsten wiederverwendet werden.
- **Rückmeldung ans Kit geben.** Wenn dem Partner etwas fehlt oder etwas falsch ist, kannst
  du daraus einen Vorgang im Kit-Repository machen. Frag vorher, was genau gemeldet werden
  soll, und zeig ihm den Text.

Ist `gh` nicht angemeldet, sag es und nenn den Anmeldebefehl. Richte keine Zugänge
heimlich ein.
