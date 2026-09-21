# {{name}}

<!-- Drei Sätze: was diese Organisation tut, für wen, und wer hier entscheidet.
     Ersetze diesen Kommentar. Alles andere in dieser Datei gilt schon. -->

Dieser Ordner ist die Wurzel von {{name}}. Er sagt, was stimmt, was ansteht und wo etwas
liegt. Die Arbeit selbst geschieht in den eingebetteten Orten: Repositories und geteilte
Ordner, die diese Wurzel nennt und nie kopiert.

**Nordziel:** steht in `company/goal.md`, mit Datum und Meilensteinen. Nie aus dem
Gedächtnis.

**Engpass:** der Kartenstapel `roadmap/backlog/`, die eine Arbeitsliste über alle Orte.
Eine Karte je Ort gleichzeitig. Was nicht als Karte in `ready/` liegt, wird nicht
angefangen.

## Wo die Wahrheit steht

| Wenn es um X geht | lies |
| --- | --- |
| Lage, Ziel, Engpass, Annahmen | `company/core.md`, dann gezielt weiter |
| das Nordziel und seine Meilensteine | `company/goal.md` |
| was über den Einzelfall hinaus bindet | `company/decisions.md` |
| Termine und Zusagen | `company/follow-ups.md` |
| welche Orte zu dieser Wurzel gehören, wo sie leben, wer schreiben darf | `.claude/places.json` |
| was ein Ort bis wann können muss | `roadmap/`, ein Blatt je Ort |
| Ideen und Vorhaben in Reihenfolge | `roadmap/backlog/`, eine Datei je Karte, der Ordner ist der Status |
| wer hier was lesen und ändern darf | `.claude/settings.json`, eine Zeile je Ordner |
| ob diese Wurzel sich widerspricht | `node .claude/scripts/check.mjs` |

**Derselbe Fakt an zwei Orten ist ein Fehler, keine Sicherung.** Was in einem Ort lebt,
bleibt dort, diese Wurzel verweist darauf. Was Sache des ganzen Hauses ist, lebt hier.

## Harte Regeln

1. **Keine Fakten aus dem Gedächtnis.** Namen, Preise, Versionen, Zahlen und Termine
   kommen aus der Quelle. Ein gespiegelter Wert trägt `Stand:` und `Quelle:`. Bei
   Widerspruch gewinnt die Quelle.
2. **Nichts abschreiben, was hergeleitet werden kann.** Der Stand eines Repositories,
   offene Pull Requests und Fristen entstehen zur Laufzeit. Eine abgeschriebene Zahl ist
   am Tag danach falsch.
3. **Aus einer Sitzung in dieser Wurzel wird in keinen eingebetteten Ort geschrieben.**
   Lesen ist frei. Ein Ort hat seine eigenen Regeln, und eine Sitzung in der Wurzel lädt
   sie nicht. Wer dort etwas ändern will, startet dort eine Sitzung.
   `.claude/hooks/boundary.mjs` hält die Grenze, seine Fälle stehen in
   `.claude/scripts/boundary-test.mjs`. Ein Ort mit `write: yes` in `.claude/places.json`
   ist ausgenommen, per Beschluss des Hauses.
4. **Ziele hier, Umsetzung dort.** Diese Wurzel legt fest, *was* ein Ort bis wann können
   muss, in seinem Blatt unter `roadmap/`, mit Meilenstein und Frist. *Wie* gebaut wird,
   entscheidet der Ort. Ein Ziel ohne Meilenstein ist eine Idee und gehört auf eine Karte
   in `roadmap/backlog/new/`.
5. **Kein Pflegelauf.** Die Historie der Versionsverwaltung ist das Journal, die
   Begründung gehört in den Commit. Nach `company/` wandert nur, was über den Einzelfall
   hinaus bindet. Nichts wird zurückgeschrieben, nur damit es geschrieben ist.
6. **Nach einer Änderung läuft die Prüfung.** `node .claude/scripts/check.mjs` endet ohne
   Befund, oder der Befund ist behoben, bevor die nächste Arbeit beginnt.

## Wohin Neues gehört

| Was entsteht | wohin |
| --- | --- |
| ein Fakt über das Haus | `company/<thema>.md`, ein Thema je Datei, mit `Stand:` und `Quelle:` |
| eine Entscheidung, die über den Einzelfall hinaus bindet | eine Zeile oben in `company/decisions.md` |
| ein Termin oder eine Zusage | eine Zeile in `company/follow-ups.md`, Betreff höchstens 80 Zeichen |
| ein Ziel für einen Ort | `roadmap/<ort>.md`, mit Meilenstein und Frist |
| eine Idee oder ein Vorhaben | eine Karte in `roadmap/backlog/new/`, über `node .claude/scripts/cards.mjs new` |
| ein großes Vorhaben | mehrere Karten mit gemeinsamem `ref`, der Rang gibt die Reihenfolge |
| die Prüfung einer Annahme | `experiments/NNN-<slug>/`, mit einer `experiment.md` |
| eine Kundenakte | `customers/<slug>/`, fertige Dokumente darin unter `documents/` |
| eine Vorlage für ein Papier, das das Haus selbst verschickt | `templates/` |
| abgeschlossen und eingefroren | `archive/<jahr>/` |
| ein neuer Ort | eine Zeile in `.claude/places.json`, über das Kit oder von Hand, nie eine Kopie hier drin |

**Ein neuer Ordner auf oberster Ebene entsteht nur mit einer Zeile in dieser Tabelle,
Rechten in `.claude/settings.json` und einem Blick in `.claude/scripts/check.mjs`.** Ohne
das wächst der Ordner wieder zu, und die Prüfung sagt es.
