---
name: place
description: Mit einem eingebetteten Ort dieser Wurzel arbeiten. Nutze es, wenn jemand fragt, was ein Ort enthält, wie es ihm geht, wo darin etwas liegt, oder wenn etwas darin geändert werden soll.
---

# Mit einem Ort arbeiten

Ein Ort ist ein GitHub-Repository oder ein fremder Ordner wie SharePoint. Diese Wurzel
nennt ihn in `.claude/places.json` und hält nie eine Kopie.

## Lesen

1. Schlag den Ort in `.claude/places.json` nach: wo er lebt, wo er auf diesem Rechner liegt
   (`local`), wofür er da ist, ob diese Wurzel in ihn schreiben darf.
2. Kein `local`: der Ort ist nur ein Verweis. Sag das und frag den Menschen, wo er liegt,
   oder lies ihn über seine Adresse, falls es dafür ein Werkzeug gibt. Rate keinen Pfad.
3. Lies im Ort selbst. Stand, offene Pull Requests und Versionen kommen von dort, zur
   Laufzeit, nicht aus dieser Wurzel. Was du über einen Ort sagst, trägt die Datei oder den
   Befehl, aus dem es kam.
4. Ein langer Blick durch viele Dateien geht an den Agenten `place-reader`. Er liest und
   schreibt nichts.

## Ändern

1. Steht `write: yes` für den Ort, ist das Ändern von hier eine Entscheidung des Hauses.
   Sag in der Antwort, dass du es tust.
2. Sonst wird aus dieser Wurzel nichts in den Ort geschrieben. Eine Sitzung in der Wurzel
   lädt die eigenen Regeln des Ortes nicht, und ein Ort hat seine eigene `CLAUDE.md`, seine
   Skills und Hooks. Sag dem Menschen, er soll eine Sitzung im Ort starten, und sag in
   wenigen Sätzen, was dort geschehen muss, damit er sie mitnehmen kann.

## Was nicht hierher gehört

Eine Kopie eines Ortes. Dieselbe Datei an zwei Stellen ist ein Fehler, keine Sicherung, und
die Prüfung meldet sie. Ertappst du dich beim Kopieren, hör auf und verweise stattdessen.
