---
format: JJJJ-NNNN
year:
last: 0
created:
---

<!-- Diese Datei gehört dir. Sie ist der Nummernkreis deiner Rechnungen und
     wird von node .ara/tools/invoice.mjs fortgeschrieben. Ein Update des Kits
     fasst sie nie an, sie liegt unter business/. -->

# Nummernkreis der Rechnungen

Jede Rechnung bekommt eine Nummer, jede Nummer gibt es genau einmal, und
zwischen zwei Nummern liegt keine Lücke. Das ist keine Ordnungsliebe, sondern
§ 14 Abs. 4 Nr. 4 UStG: eine Rechnung ohne fortlaufende Nummer berechtigt den
Kunden nicht zum Vorsteuerabzug.

Die Nummer hat die Form `JJJJ-NNNN`. Jedes Jahr fängt bei `0001` an. `last` im
Kopf ist die zuletzt vergebene Zahl des Jahres, das unter `year` steht.

**Vergeben wird beim Anlegen des Belegs, nicht beim Drucken.** Ein Entwurf, der
nie verschickt wurde, hat trotzdem seine Nummer verbraucht. Wer ihn verwirft,
storniert die Nummer, statt die Zeile zu löschen:

```
node .ara/tools/invoice.mjs --void JJJJ-NNNN --reason "Grund"
```

**Von Hand wird hier nichts zurückgedreht.** Eine kleinere Zahl unter `last`
als in der Liste steht, fällt beim nächsten Aufruf auf, und dann vergibt das
Werkzeug gar keine Nummer mehr, bis es geklärt ist.

## Vergebene Nummern

| Nummer | Datum | Kunde | Netto | Brutto | Stand | Grund | Datei |
| --- | --- | --- | --- | --- | --- | --- | --- |

Noch keine Nummer vergeben.

## Stände

| Stand | Was er heißt |
| --- | --- |
| `entwurf` | geschrieben, noch nicht gedruckt |
| `gestellt` | gedruckt und beim Kunden |
| `storniert` | zurückgenommen, die Nummer bleibt vergeben |
