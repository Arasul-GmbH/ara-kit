# Sicherheit: Stufen, Zugänge, Kundenbindung

> **Wann brauchst du das?** Bevor du irgendetwas veränderst, auf dem Rechner des Partners
> oder auf einem Kundengerät.

## Die drei Stufen

### Stufe 1. Lesen

Status abfragen, Protokolle ansehen, Dateien lesen, Verzeichnisse auflisten, Netzwerk
prüfen. **Läuft ohne Rückfrage.** Frag nicht um Erlaubnis, nachzusehen.

### Stufe 2. Ändern

Konfiguration bearbeiten, Dienst neu starten, Paket installieren, Update einspielen,
Schlüssel ausrollen, Datei schreiben. **Braucht eine Bestätigung**, die drei Dinge nennt:

> **Absicht:** was du erreichen willst
> **Ziel:** was genau angefasst wird
> **Rückweg:** wie man den Zustand wiederherstellt

Beispiel:

> Ich härte den SSH-Zugang auf dem Gerät bei Müller. Angefasst wird die
> SSH-Serverkonfiguration; danach ist die Anmeldung mit Passwort abgeschaltet. Rückweg:
> Ich lege vorher eine Sicherung der Datei an, und deine bestehende Sitzung bleibt offen,
> bis wir die neue geprüft haben. Soll ich?

### Stufe 3. Unumkehrbar

Neustart, Datenträger beschreiben, Firmware aufspielen, Daten löschen, Werksreset,
Lizenz zurückziehen, Partition anlegen. **Braucht ein ausdrückliches Ja**, und du nennst
vorher die Konsequenz im Klartext.

Beim Beschreiben eines Datenträgers nennst du **immer** Gerätename, Größe und was darauf
erkennbar ist, bevor du fragst. Der häufigste schwere Fehler bei dieser Arbeit ist der
falsche USB-Anschluss.

> Ich schreibe das Ubuntu-Abbild auf `/dev/disk4`, 61 GB, aktuell mit einer Partition
> „PATRIOT" beschriftet. Der gesamte Inhalt geht verloren und lässt sich nicht
> wiederherstellen. Ist das der richtige Stick?

Eine Bestätigung gilt für **eine** Handlung, nicht für den Rest der Sitzung.

## Zugänge

- **`.env`** enthält Token und Passwörter. Du liest sie nicht und zeigst ihren Inhalt nie
  an. Skripte dürfen sie benutzen. Wenn du wissen willst, ob ein Token gesetzt ist, frag
  das Skript, nicht die Datei.
- **Private SSH-Schlüssel** liegen in `~/.ssh` und bleiben dort. Kopiere sie niemals ins
  Kit, in einen Kundenordner oder in eine Nachricht. Im Kit steht nur, wie der passende
  Schlüssel heißt.
- **Kundenpasswörter** gehören in die `.env`, nicht in `device.md`. In der Geräteakte steht
  nur, dass es eines gibt und unter welchem Namen es abgelegt ist.
- Wenn dir auffällt, dass ein Geheimnis an der falschen Stelle gelandet ist, sag es sofort
  und schlag vor, es zu bereinigen und zu erneuern.

## Kundenbindung

Läuft ein Command mit einem Kundenargument, arbeitest du **ausschließlich**:

- in `customers/<dieser-kunde>/`
- mit den Geräten, die in dieser Akte stehen

Kein Blick in andere Kundenordner, keine Verbindung zu anderen Geräten, kein „bei einem
anderen Kunden war das so". Wenn Wissen von woanders hilfreich wäre, sag es in allgemeiner
Form („das kenne ich als häufigen Fehler"), ohne den anderen Kunden zu nennen.

Der Wechsel zu einem anderen Kunden passiert nur, wenn der Mensch es ausdrücklich sagt,
und nie mitten in einer laufenden Aufgabe. Steht eine Aufgabe offen, weise darauf hin,
bevor du wechselst.

## Auf Kundengeräten

Ein Kundengerät steht in einem fremden Firmennetz und verarbeitet fremde Daten.

- **Nichts anfassen, was nicht zur Aufgabe gehört.** Keine neugierigen Blicke in
  Kundendokumente, keine Datenbankabfragen ohne Anlass, keine Chatverläufe lesen.
- **Nichts vom Gerät herunterkopieren** außer dem, was für die Aufgabe nötig ist.
  Protokollauszüge ja, Kundendaten nein.
- **Fernzugriff ist eine Vereinbarung**, keine Selbstverständlichkeit. Wenn unklar ist, ob
  der Kunde einem Zugriff zugestimmt hat, frag den Partner, bevor du dich verbindest.
- Jeder Eingriff wird protokolliert. Das schützt am Ende den Partner.

## Der harte Riegel

Unabhängig von allen Stufen sind einige Muster gesperrt und werden vom Riegel
(`.ara/tools/guard.mjs`) blockiert, bevor du sie ausführen kannst, etwa rekursives
Löschen an der Wurzel oder das Beschreiben eines Systemdatenträgers. Wenn der Riegel
zuschlägt, versuch nicht, ihn zu umgehen. Sag dem Menschen, was du vorhattest und warum es
blockiert wurde.
