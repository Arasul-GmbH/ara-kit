# Verfahren: Selbstheilung

> **Wann brauchst du das?** Am laufenden Gerät, wenn etwas von Arasul nicht mehr läuft, bei
> `/maintain` oder wenn ein Kunde sagt, dass etwas hängt.

## Was das ist

Ab dem laufenden Linux arbeitet das Kit selbst: Akte, Urteil, Installation, Schlüssel. Die
Selbstheilung ist das Stück danach. **Wenn im Verzeichnisbaum von Arasul etwas kaputt ist,
versucht das Kit alles, was es selbst kann, protokolliert jeden Schritt, und fragt erst, wenn
es aufgibt.**

```
node .ara/tools/heal.mjs --device <gerät>                     feststellen, beheben, nachweisen, protokollieren
node .ara/tools/heal.mjs --customer <kunde> --device <gerät>
node .ara/tools/heal.mjs --device <gerät> --plan              nur sagen, was es täte
node .ara/tools/heal.mjs --device <gerät> --list              die bisherigen Eingriffe
node .ara/tools/heal.mjs --device <gerät> --undo H-0003       den Stand vor H-0003 herstellen
```

Das Werkzeug liest zuerst, wie jedes andere: welche Ordner am Gerät wie Arasul aussehen,
welche Container es gibt, welche davon aus diesem Baum kommen, und welche davon nicht laufen.
Dann handelt es, ein Container nach dem anderen, und nach jedem Schritt prüft es, dass der
Schritt gewirkt hat. **Es startet nicht neu, es löscht nichts, es ändert keine Datei.**

## Die drei Grenzen

Sie stehen in `.ara/tools/lib/heal.mjs`, nicht nur hier, und der Selbsttest hält sie fest.

1. **Nur im Verzeichnisbaum von Arasul.** Ein Container gehört dazu, wenn sein
   Compose-Projekt aus einem Arasul-Ordner am Gerät kommt, oder wenn er nach der Regel des
   Kits ein Container der Plattform ist (dieselbe Regel, an der `/device` eine laufende
   Plattform erkennt). Alles andere bleibt, wie es ist, auch wenn es nicht läuft: es steht
   als „außerhalb des Baums, bleibt liegen" im Bericht, und das ist ein Befund für den
   Menschen, keine Aufgabe für das Kit.
2. **Nie am Bootloader, nie am System.** Das Werkzeug hat keinen Befehl für etwas anderes
   als Container: starten, anhalten, ansehen. Wovon das Gerät bootet, was `systemd` führt,
   was in der Systemkonfiguration steht, und alles aus
   `.ara/knowledge/flash-orin.de.md`, liegt von Bauart her außerhalb seiner Reichweite.
3. **Nur, was einen Weg zurück hat.** Jeder Eingriff wird mit Zustand davor, Zustand danach
   und dem Befehl protokolliert, der ihn zurücknimmt, und `--undo` führt genau diesen Befehl
   aus und weist nach, dass der Stand davor wieder da ist. Was keinen Weg zurück hat, wird
   nicht getan: ein Container, der läuft und unhealthy meldet, bräuchte einen Neustart, und
   nach einem Neustart gibt es den Zustand davor nicht mehr. Das ist eine Frage, und das
   Werkzeug stellt sie dir mit den letzten Protokollzeilen des Containers, statt zu handeln.

## Warum es ohne Nachfrage handeln darf

`.ara/knowledge/security.de.md` sagt, dass Ändern eine Bestätigung braucht, mit Absicht, Ziel
und Weg zurück. Die Selbstheilung bricht diese Regel nicht, sie erfüllt sie einmal für den
ganzen Lauf: die Absicht ist „alles von Arasul läuft wieder", das Ziel ist der Baum und
nichts außerhalb, und der Weg zurück steht je Schritt in der Akte. **Der Aufruf des
Werkzeugs ist die Bestätigung.** Bei einem Kundengerät nennst du das vor dem Aufruf, in einem
Satz, und lässt es über das Interview-Werkzeug bestätigen wie jeden Eingriff der Stufe 2.
Innerhalb des Laufs wird niemand mehr gefragt, das ist der Sinn davon.

`--plan` ist der Trockenlauf. Er gibt aus, was das Werkzeug täte, und ändert nichts. Nimm ihn,
wenn du den Plan vor der Bestätigung sehen willst.

## Was in der Akte steht

Jeder Eingriff bekommt eine Nummer, `H-0001`, `H-0002`, fortlaufend je Gerät, und zwei Orte:

- **`device.md`, unter Prüfungen.** Ein Eintrag je Eingriff mit dem, was getan wurde, dem
  Ziel, dem Zustand davor und danach, dem Befehl, der am Gerät lief, und dem Weg zurück als
  dem Befehl, den du tippst. Jede Rücknahme bekommt ebenfalls ihren eigenen Eintrag, wenn sie
  läuft.
- **`interventions.json`** daneben. Dasselbe, maschinenlesbar; `--undo` und `--list` lesen
  sie. Nicht von Hand bearbeiten.

Ein Eingriff, der nicht gewirkt hat, steht ebenfalls dort, mit `failed`, und bleibt
zurücknehmbar: ein Container, der gestartet wurde und wieder ausging, lässt sich anhalten, und
dann ist der Stand davor wieder da. Nichts wird schöngeredet: was das Werkzeug nicht konnte,
steht unter „Wo das Kit aufgibt und fragt", mit den letzten Zeilen des Containers, und der
Rückgabecode des Laufs ist 1.

## Wo es aufgibt

- Ein Container im Baum bleibt nach dem Start nicht oben.
- Ein Container im Baum läuft, meldet aber `unhealthy`.
- Docker antwortet nicht, oder kein Ordner am Gerät sieht wie Arasul aus.

Dann bist du dran, nach `.ara/knowledge/diagnostics.de.md`: erst feststellen, dann ändern.
Was als Nächstes käme, ist ein Neustart oder eine Änderung an einer Datei, und beides braucht
eine eigene Bestätigung, mit Absicht, Ziel und Weg zurück. Das Protokoll der Selbstheilung ist
dann das Erste, was du liest: es sagt, was schon versucht wurde.

## Zurücknehmen

```
node .ara/tools/heal.mjs --device <gerät> --undo H-0002
```

Führt den protokollierten Weg zurück aus, wartet auf den Zustand, vergleicht ihn mit dem
Zustand vor dem Eingriff und schreibt das Ergebnis in die Akte. Jeder Eingriff wird für sich
zurückgenommen; die Rücknahme des einen fasst keinen anderen an. Ein Eingriff, der schon
zurückgenommen wurde, wird abgelehnt, eine Nummer, die es nicht gibt, ebenso.

Nach einem Lauf, bei einem Kundengerät: ein Eintrag in `customers/<kunde>/history/`, mit den
Nummern der Eingriffe. Laufzettel und Historie sind, was jemand in einem halben Jahr liest,
und die Akte ist, wogegen er es prüft.
