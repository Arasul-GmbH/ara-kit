# Verfahren: Wartung und Betreuung

> **Wann brauchst du das?** Bei `/maintain` — alles, was nach der Abnahme passiert.

## Einstieg

Ein Command, mehrere Anliegen. Erkenn am Anliegen, worum es geht, und frag nicht ab, was du
sehen kannst.

Zuerst immer: **Lagebild in drei Zeilen.** Wer der Kunde ist, welches Gerät, wann zuletzt
etwas passiert ist (letzter Eintrag im Verlauf), ob es erreichbar ist. Dann die Frage, was
ansteht — kein Vorschlagskatalog.

Bevor du etwas am Gerät tust: `node .ara/tools/remote.mjs --customer <k> --check`.
Steht die Verbindung nicht, ist das die erste Aufgabe, nicht die zweite.

## Die vier Anliegen

### 1. Es klemmt

Verfahren in `.ara/knowledge/diagnostics.md`. Erst feststellen, dann ändern.

### 2. Regelmäßiger Blick

Wenn niemand ein konkretes Problem hat, aber jemand wissen will, ob alles in Ordnung ist:

- Dienste gesund? Läuft das Gerät seit dem letzten geplanten Start durch?
- Speicherplatz — der einzige Wert, der still wächst, bis nichts mehr geht
- Fehler in den Protokollen seit dem letzten Blick
- Sicherungen: laufen sie, und ist eine davon je zurückgespielt worden?
- Produktstand gegen den aktuellen Stand im Spiegel
- Fernzugriff **von außen** — nicht nur, ob deine bestehende Sitzung noch offen ist

Ergebnis in den Verlauf, auch wenn alles in Ordnung war. Ein Verlauf mit regelmäßigen
Einträgen ist bei einer Verlängerung mehr wert als jedes Verkaufsgespräch.

### 3. Update einspielen

Ein Update ist ein Eingriff, kein Klick.

1. **Vorher:** Was ändert sich? Gibt es Hinweise im Produkt dazu? Ist der Zeitpunkt mit dem
   Kunden abgesprochen? Ein Update während der Arbeitszeit ist eine Störung.
2. **Sicherung anlegen und prüfen, dass sie existiert.** Nicht „läuft ja automatisch".
3. **Einspielen**, dem Weg des Produkts folgend (im Spiegel nachlesen).
4. **Danach die Nachweise aus `.ara/knowledge/handover.md`** — mindestens: Dienste gesund,
   fachliche Anfrage beantwortet, Fernzugriff steht. Ein Update, das durchläuft und danach
   ein totes System hinterlässt, ist der Normalfall bei ungeprüften Updates.
5. **Rückweg kennen**, bevor du anfängst. Wenn es keinen gibt, ist das eine Information für
   den Kunden, keine Kleinigkeit.

### 4. Erweiterung bauen

Der Teil, mit dem der Partner zusätzlich Geld verdient. Verfahren:
`.ara/knowledge/extensions.md`

## Wenn der Kunde anruft, weil etwas nicht geht

Das Kit überwacht nichts (bewusst). Der übliche Weg ist: Der Kunde meldet sich.

Dann gilt: **erst zuhören, dann nachsehen.** Was der Kunde beschreibt, ist ein Symptom aus
seiner Sicht — „das Ding ist kaputt" kann ein abgelaufenes Zertifikat, ein volles
Dateisystem oder ein gezogener Netzstecker sein. Frag nach dem, was er gemacht hat, nicht
nach dem, was er vermutet.

## Grenzen

- **Nichts anfassen, was nicht zur Aufgabe gehört.**
- **Nichts vom Gerät kopieren** außer Protokollauszügen, die du für die Diagnose brauchst.
- **Bei größeren Eingriffen den Kunden fragen**, auch wenn ein Wartungsvertrag besteht. Ein
  Vertrag erlaubt Wartung, er ist kein Freibrief für einen Neustart um elf Uhr vormittags.

## Mitschreiben

Jeder Einsatz erzeugt einen Eintrag unter `customers/<k>/history/JJJJ-MM-TT-thema.md`
(Vorlage: `.ara/templates/history-entry.md`). Das ist die Nachweisführung, wenn ein Kunde
fragt, was wann gemacht wurde — und die Grundlage dafür, dass beim nächsten Mal niemand bei
null anfängt.
