# Backlog

Eine Datei je Karte, **der Ordner ist der Status**. Die eine Arbeitsliste über alle Orte.

| Ordner | Bedeutung | Regel |
| --- | --- | --- |
| `new/` | eingegangen, noch nicht gereiht | `ref` darf `open` sein |
| `ready/` | gereiht, kann gestartet werden | `ref`, `rank`, `assumption` und `done` sind Pflicht, `rank` ist eindeutig je Ort |
| `running/` | jemand arbeitet daran | genau eine Karte je Ort |
| `done/` | fertig oder verworfen, eingefroren | letzte Zeile `Result: green`, `red` oder `dropped` |

Anlegen und Verschieben geht über `node .claude/scripts/cards.mjs`. In einem
Git-Repository ist jede Bewegung ein eigener Commit.

**Bilder als Nachweis** liegen in einem Ordner neben der Karte mit demselben Namen,
`done/<slug>/`, flach. Die Karte nennt sie unter `Evidence:`.

**Ein großes Vorhaben** sind mehrere Karten mit gemeinsamem `ref`, der Rang gibt die
Reihenfolge. Jede Karte hat ihr eigenes `done`.

## Kopf einer Karte

Die Felder heißen englisch, wie alle Namen in dieser Wurzel. Der Inhalt ist deutsch.

```
---
title: ein Satz, was es wäre
place: ein Name aus .claude/places.json, oder root
ref: ein Meilenstein, ein Ziel, ein Experiment, oder open
rank: ganze Zahl, klein ist vorne, je Ort eindeutig
assumption: die riskanteste Annahme, die stimmen muss, damit es sich lohnt
done: was beobachtbar ist, wenn es fertig ist
created: JJJJ-MM-TT
source: woher die Karte kommt
---
```

Darunter frei: was daran trägt, was dagegen spricht, Bedingung für den Start.
