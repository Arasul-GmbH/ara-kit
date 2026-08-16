# Verfahren: Betriebssystem und Boot-Medium

> **Wann brauchst du das?** In Phase 1 einer Einrichtung — bevor das Gerät zum ersten Mal
> im Netz erreichbar ist.

## Die Grundfrage: was muss dieses Gerät überhaupt bekommen?

Nicht jedes Gerät braucht ein neues Betriebssystem. Klär als Erstes, welcher der drei Fälle
vorliegt. Steht es nicht eindeutig fest, frag den Menschen, statt zu raten — ein
unnötiger Flash-Vorgang kostet einen halben Tag.

### Fall A — Werksystem bleibt

Geräte, die mit einem passenden Betriebssystem ab Werk kommen. Hier wird nichts
neu installiert. Der Mensch startet das Gerät, durchläuft die Ersteinrichtung des
Herstellers (Sprache, Tastatur, Benutzer, Netz) und meldet sich zurück.

Deine Aufgabe: eine kurze Ansage, was ihn erwartet, und danach der Erstkontakt über das
Netz. Nicht mehr.

### Fall B — Ein Standard-Linux auf einen Rechner mit üblicher Ausstattung

Hier hilfst du wirklich: Abbild besorgen, Prüfsumme vergleichen, Boot-Medium schreiben,
durch das Startmenü und den Installationsassistenten führen.

### Fall C — Ein eingebettetes Gerät, das geflasht werden muss

Der aufwendigste Fall. Solche Geräte werden nicht von einem Stick installiert, sondern über
eine Kabelverbindung von einem anderen Rechner aus in einen Wiederherstellungsmodus versetzt
und beschrieben. Dafür gelten die Werkzeuge und Voraussetzungen des Herstellers.

**Diese Voraussetzung ist hart:** Der schreibende Rechner muss die vom Hersteller verlangte
Architektur und Betriebssystemversion haben. Ein Rechner mit anderer Architektur kann das
nicht — auch nicht in einem Container, weil die Verbindung zum Gerät im
Wiederherstellungsmodus durchgereicht werden müsste.

Was du tust:

1. **Prüf, ob ein geeigneter Rechner verfügbar ist.** Der Technikcheck aus dem Onboarding
   hält das in `business/profile.md` fest.
2. **Ist keiner da:** sag es klar und früh. Nicht „das wird schwierig", sondern:

   > Dieses Gerät lässt sich von deinem Rechner aus nicht beschreiben. Dafür braucht es
   > einen Rechner mit der vom Hersteller verlangten Architektur. Zwei Wege: du besorgst dir
   > einen, oder das Gerät kommt vorbereitet zu dir. Klär das, bevor du einen Termin beim
   > Kunden machst.

3. **Ist einer da:** die Schritte des Herstellers gelten. Lies sie in der aktuellen Fassung
   nach, statt sie aus dem Gedächtnis zu nennen — die Werkzeuge ändern sich mit jeder
   Generation.

## Boot-Medium schreiben (Fall B)

Der einzige unumkehrbare Schritt der ganzen Einrichtung. Reihenfolge:

1. **Abbild besorgen.** Von der offiziellen Quelle, in der Fassung, die zum Gerät passt.
2. **Prüfsumme vergleichen.**
   `node .ara/tools/disk.mjs --checksum <datei>`
   Vergleich mit der veröffentlichten Prüfsumme. Stimmt sie nicht: **nicht schreiben.**
   Ein halb geladenes Abbild führt zu einem Rechner, der bis zur Hälfte startet, und kostet
   dich einen Vor-Ort-Termin.
3. **Datenträger anzeigen.**
   `node .ara/tools/disk.mjs --list`
   Das Werkzeug zeigt nur externe Datenträger. Lies dem Menschen **Bezeichnung und Größe**
   vor und lass ihn gegen den Stick in seiner Hand bestätigen. Zwei Sticks gleicher Größe
   sind der häufigste schwere Fehler.
4. **Vorschau.**
   `node .ara/tools/disk.mjs --write <abbild> --to <kennung>`
   Zeigt, was passieren würde, ohne etwas zu tun. Das ist die Bestätigungsstufe.
5. **Schreiben.** Mit `--yes --execute`. Braucht Verwaltungsrechte; wenn das Passwort
   nicht durchkommt, gib die beiden angezeigten Befehle aus und lass den Menschen sie in
   seinem Terminal ausführen. Das ist kein Scheitern, das ist der normale Weg.

## Erstboot begleiten

Was du nicht selbst tun kannst — Stick einstecken, Taste drücken, Kabel umstecken —, wird
**eine kurze Anweisung, keine Anleitung**. Ein Schritt, dann warten, dann der nächste:

> Steck den Stick ein und starte das Gerät neu. Beim Hochfahren die Taste für das Startmenü
> drücken — je nach Hersteller F11, F12 oder Entf. Sag mir, wenn du das Menü siehst.

Nicht sechs Schritte auf einmal. Der Mensch steht dabei vor dem Gerät und kann nicht
mitlesen.

Beim Installationsassistenten führst du durch die Punkte, die später zählen:

- **Benutzername** — der wird zum Anmeldenamen für die Fernwartung. Einheitlich halten.
- **Netz** — feste Adresse oder automatisch? Feste Adresse ist für ein Gerät, das dauerhaft
  erreichbar sein soll, fast immer die bessere Wahl. Sprich das mit dem ab, der das
  Kundennetz betreut.
- **Verschlüsselung der Festplatte** — bedenken: ein verschlüsseltes Gerät startet nach
  einem Stromausfall nicht ohne Eingabe durch. Für ein Gerät im Serverschrank ist das
  eine bewusste Entscheidung, keine Nebensache.
- **Automatische Anmeldung** — aus.

Alles, was hier entschieden wird, gehört in den Laufzettel. In sechs Monaten weiß niemand
mehr, warum das Gerät so heißt, wie es heißt.

## Wenn es klemmt

- **Gerät startet nicht vom Stick:** Startreihenfolge, sicherer Start, Anschluss wechseln.
- **Startet, bricht aber ab:** meist ein beschädigtes Abbild — Prüfsumme kontrollieren.
- **Kein Bild:** anderer Anschluss, anderer Bildschirm, Gerät braucht manchmal einen
  angeschlossenen Bildschirm beim Start.

Nach zwei erfolglosen Versuchen: anhalten, den Stand in den Laufzettel schreiben und
gemeinsam entscheiden, ob es einen zweiten Termin braucht. Stundenlanges Probieren vor dem
Kunden kostet mehr als ein zweiter Besuch.
