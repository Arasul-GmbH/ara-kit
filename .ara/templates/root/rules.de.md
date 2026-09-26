# {{name}}

<!-- Drei Sätze: was diese Organisation tut, für wen, und wer hier entscheidet.
     Diesen Kommentar ersetzen. Alles andere in dieser Datei gilt schon. -->

Dieser Ordner ist die Wurzel von {{name}}. Er sagt, was stimmt und wo etwas liegt. Die
Arbeit selbst geschieht in den eingebetteten Orten: Repositories und geteilte Ordner, die
diese Wurzel nennt und nie kopiert.

Starte den Agenten hier oder in einem der Ordner direkt darunter. Er lädt diese Regeln aus
beiden, dazu die Skills und Agents in `.claude/`.

## Wo die Wahrheit steht

| Wenn es um … geht | lies |
| --- | --- |
| welche Orte zu dieser Wurzel gehören, wo sie leben, wer schreiben darf | `.claude/places.json` |
| die Grenze und die Erlaubnisregeln, die vorgeschlagen sind | `.claude/proposal/proposal.json` |
| die Skills und Agents dieser Wurzel | `.claude/skills/`, `.claude/agents/` |
| ob diese Wurzel sich widerspricht | `node .claude/scripts/check.mjs` |
| welche Apps ein Mensch fragen darf und was jede über sich sagt | `arasul.mjs`, und `apps/<id>/APP.md`, die es schreibt |

**Dieselbe Tatsache an zwei Stellen ist ein Fehler, keine Sicherung.** Was in einem Ort
lebt, bleibt dort, diese Wurzel verweist darauf. Was das Geschäft des ganzen Hauses ist,
lebt hier.

## Harte Regeln

1. **Keine Fakten aus dem Gedächtnis.** Namen, Preise, Versionen, Zahlen und Daten kommen
   aus der Quelle. Ein gespiegelter Wert trägt `Stand:` und `Quelle:`. Bei einem
   Widerspruch gewinnt die Quelle.
2. **Schreib nicht auf, was sich herleiten lässt.** Der Stand eines Repositorys, offene
   Pull Requests und Fristen entstehen zur Laufzeit. Eine abgeschriebene Zahl ist am
   nächsten Tag falsch.
3. **Aus einer Sitzung in dieser Wurzel wird in keinen eingebetteten Ort geschrieben.**
   Lesen ist frei. Ein Ort hat seine eigenen Regeln, und eine Sitzung in der Wurzel lädt sie
   nicht. Wer dort etwas ändern will, startet dort eine Sitzung. Die Grenze ist ein
   Vorschlag in `.claude/proposal/`. Nichts in diesem Ordner wirkt von selbst: es wirkt erst,
   wenn ein Mensch zugestimmt und es in seine eigenen Einstellungen angemeldet hat. Ein Ort
   mit `write: yes` in `.claude/places.json` ist ausgenommen, per Entscheidung des Hauses.
4. **Apps bekommen keinen Dateizugriff.** Jede Datei in dieser Wurzel hat einen Menschen
   als Urheber. Was eine App über sich sagt, kommt durch `arasul.mjs` nach
   `apps/<id>/APP.md` und durch nichts sonst. Der Rückweg geht über den Agenten: er holt
   Daten mit `arasul.mjs call` und schreibt die Datei selbst. Aufgerufen werden nur Routen,
   die eine App für Agenten nennt, und eine, die etwas ändert, braucht `--write`.
5. **Nach einer Änderung läuft die Prüfung.** `node .claude/scripts/check.mjs` endet ohne
   Befund, oder der Befund ist behoben, bevor die nächste Arbeit beginnt.

## Wohin Neues gehört

| Was entsteht | wohin |
| --- | --- |
| {{folder_rows}} | |
| was eine App über sich sagt | `apps/<id>/APP.md`, von `arasul.mjs` geschrieben, nie von Hand |
| ein neuer Ort | eine Zeile in `.claude/places.json`, nie eine Kopie hier drin |
| ein Skript, das das Haus nutzt | dorthin, wo es gebraucht wird, Skripte sind überall erlaubt |

**Ein neuer Ordner oben entsteht nur mit einer Zeile in dieser Tabelle.** Ohne sie wächst
der Ordner wieder zu, und die Prüfung sagt es. Code liegt hier nicht: er liegt in einem
Ort, und diese Wurzel verweist darauf.
