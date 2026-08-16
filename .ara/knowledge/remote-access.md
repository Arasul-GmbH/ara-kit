# Verfahren: Fernzugriff

> **Wann brauchst du das?** In Phase 4 einer Einrichtung und immer, wenn ein Gerät später
> nicht mehr erreichbar ist.

## Die Reihenfolge

**Erst der direkte Weg, dann das Vermittlungsnetz.** Nicht umgekehrt.

Ein direkter, abgesicherter Zugang ist einfacher, schneller, hat weniger bewegliche Teile
und hängt von keinem fremden Dienst ab. Ein Vermittlungsnetz löst genau ein Problem: dass
das Gerät von außen nicht erreichbar ist. Wenn dieses Problem nicht besteht, schafft es nur
zusätzliche Abhängigkeit.

### Schritt 1: Prüfen, ob der direkte Weg geht

Von außerhalb des Kundennetzes: ist das Gerät erreichbar?
`node .ara/tools/find-device.mjs --host <adresse>`

Das setzt voraus, dass der Anschluss eine erreichbare Adresse hat und die Weiterleitung
eingerichtet ist. Beides klärt man mit dem, der das Kundennetz betreut — nicht im
Alleingang. Eine Portfreigabe ist ein Eingriff in fremde Infrastruktur.

### Schritt 2: Absichern

Egal welcher Weg: Anmeldung nur mit Schlüssel, kein Passwort, nur die Benutzer, die es
brauchen. Die konkreten Einstellungen und Werkzeuge dafür bringt das Produkt mit — lies im
Spiegel nach, was es tut, statt eigene Konfiguration zu erfinden.

**Reihenfolge beachten:** Schlüsselanmeldung nachweisen, *dann* Passwort abschalten, und
die laufende Sitzung offen halten, bis die neue geprüft ist.

### Schritt 3: Vermittlungsnetz, wenn es nicht anders geht

Wenn der Anschluss keine erreichbare Adresse hat, hilft ein Vermittlungsnetz — das Gerät
baut die Verbindung von innen auf. Das Produkt bringt eine solche Anbindung mit; die
Einzelheiten stehen im Spiegel.

Drei Dinge, die dabei regelmäßig übersehen werden:

1. **Ablaufende Anmeldungen.** Solche Netze arbeiten mit Anmeldungen, die nach einiger Zeit
   verfallen. Ein Gerät, das dauerhaft erreichbar sein soll, muss so eingetragen sein, dass
   das nicht passiert. Sonst verschwindet es Monate später lautlos aus dem Netz — meist
   genau dann, wenn man es braucht.
2. **Fremder Dienst in der Kette.** Bei Kunden mit Berufsgeheimnis (Kanzlei, Praxis,
   Steuerberatung) ist das erklärungsbedürftig. Sag es von dir aus, bevor der Kunde fragt.
3. **Es bleibt eine Vereinbarung.** Kein Dauerzugriff ohne Wissen des Kunden.

### Schritt 4: Not-Aus

Der Kunde muss die Fernwartung **jederzeit selbst abschalten** können. Das ist keine
Höflichkeit, sondern Voraussetzung dafür, dass er die Kontrolle behält.

Bei der Abnahme wird der Schalter **gezeigt**, nicht erwähnt, und in `handover.md`
beschrieben. Dazu gehört auch, was danach nicht mehr geht — sonst schaltet jemand ab und
wundert sich, warum niemand hilft.

## Dokumentieren

In `device.md`:
- unter welcher Adresse und welchem Port,
- mit welchem Anmeldenamen und welchem Schlüssel (Name, nicht Schlüssel),
- welcher Weg (direkt oder Vermittlungsnetz),
- wie der Not-Aus geht.

Nichts davon ist geheim. Die Geheimnisse liegen in der `.env`.

## Wenn ein Gerät nicht mehr erreichbar ist

Der Reihe nach, nicht durcheinander:

1. Antwortet die Adresse überhaupt? (`find-device.mjs`)
2. Hat sie sich geändert? Automatisch vergebene Adressen wandern nach einem Stromausfall.
3. Ist der Dienst da, aber der Port ein anderer? Nach einer Härtung ist das erwartbar.
4. Ist der Schlüssel noch der richtige? Ist er im Agenten geladen?
5. Wurde beim Kunden etwas am Netz geändert? Neuer Router, neue Firewall, neuer
   Dienstleister — der häufigste Grund, wenn es monatelang lief und plötzlich nicht mehr.
6. Ist der Not-Aus betätigt worden? Dann war das eine Entscheidung, keine Störung — anrufen.

Erst wenn all das ausscheidet, ist es ein Problem am Gerät selbst. Dann braucht es jemanden
vor Ort.
