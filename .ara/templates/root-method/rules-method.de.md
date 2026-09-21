## Die Methode: company, roadmap, Karten

Ein Zusatz zum Gerüst oben. Sie bringt einen Ort für den Stand des Hauses, ein Ziel je Ort
und eine Arbeitsliste. Die Regeln oben gelten auch ohne sie.

**Nordziel:** steht in `company/goal.md`, mit Datum und Meilensteinen. Nie aus dem
Gedächtnis.

**Engpass:** der Kartenstapel `roadmap/backlog/`, die eine Arbeitsliste über alle Orte. Eine
Karte je Ort gleichzeitig. Was nicht als Karte in `ready/` liegt, ist nicht begonnen.

### Wo die Wahrheit steht, mit der Methode

| Wenn es um … geht | lies |
| --- | --- |
| Lage, Ziel, Engpass, Annahmen | `company/core.md`, von dort weiter |
| das Nordziel und seine Meilensteine | `company/goal.md` |
| was über den Einzelfall hinaus bindet | `company/decisions.md` |
| Termine und Zusagen | `company/follow-ups.md` |
| was ein Ort bis wann können muss | `roadmap/`, ein Blatt je Ort |
| Ideen und Vorhaben in Reihenfolge | `roadmap/backlog/`, eine Datei je Karte, der Ordner ist der Status |

### Harte Regeln der Methode

5. **Ziele hier, Umsetzung dort.** Diese Wurzel legt fest, *was* ein Ort bis wann können
   muss, in seinem Blatt unter `roadmap/`, mit Meilenstein und Frist. *Wie* er es baut,
   entscheidet der Ort. Ein Ziel ohne Meilenstein ist eine Idee und gehört auf eine Karte in
   `roadmap/backlog/new/`.
6. **Kein Pflegelauf.** Die Historie der Versionsverwaltung ist das Journal, der Grund
   gehört in den Commit. In `company/` kommt nur, was über den Einzelfall hinaus bindet.
   Nichts wird zurückgeschrieben, nur damit es geschrieben ist.

### Wohin Neues gehört, mit der Methode

| Was entsteht | wohin |
| --- | --- |
| eine Tatsache über das Haus | `company/<thema>.md`, ein Thema je Datei, mit `Stand:` und `Quelle:` |
| ein Beschluss, der über den Einzelfall hinaus bindet | eine Zeile oben in `company/decisions.md` |
| ein Termin oder eine Zusage | eine Zeile in `company/follow-ups.md`, Betreff höchstens 80 Zeichen |
| ein Ziel für einen Ort | `roadmap/<ort>.md`, mit Meilenstein und Frist |
| eine Idee oder ein Vorhaben | eine Karte in `roadmap/backlog/new/`, über `node .claude/scripts/cards.mjs new` |
| ein großes Vorhaben | mehrere Karten mit gemeinsamem `ref`, der Rang gibt die Reihenfolge |
| die Prüfung einer Annahme | `experiments/NNN-<slug>/`, mit einer `experiment.md` |
| eine Kundenakte | `customers/<slug>/`, fertige Dokumente darin unter `documents/` |
| eine Vorlage für ein Papier, das das Haus selbst verschickt | `templates/` |
| fertig und eingefroren | `archive/<jahr>/` |
