---
format: JJJJ-NNNN
year:
last: 0
created:
---

<!-- Diese Datei gehoert dir. Sie ist der Nummernkreis deiner Rechnungen und
     wird von node .ara/tools/invoice.mjs fortgeschrieben. Ein Update des Kits
     fasst sie nie an, sie liegt unter business/. -->

# Nummernkreis der Rechnungen

Jede Rechnung bekommt eine Nummer, jede Nummer gibt es genau einmal, und
zwischen zwei Nummern liegt keine Luecke. Das ist keine Ordnungsliebe, sondern
§ 14 Abs. 4 Nr. 4 UStG: eine Rechnung ohne fortlaufende Nummer berechtigt den
Kunden nicht zum Vorsteuerabzug.

Die Nummer hat die Form `JJJJ-NNNN`. Jedes Jahr faengt bei `0001` an. `last` im
Kopf ist die zuletzt vergebene Zahl des Jahres, das unter `year` steht.

**Vergeben wird beim Anlegen des Belegs, nicht beim Drucken.** Ein Entwurf, der
nie verschickt wurde, hat trotzdem seine Nummer verbraucht. Wer ihn verwirft,
storniert die Nummer, statt die Zeile zu loeschen:

```
node .ara/tools/invoice.mjs --void JJJJ-NNNN --reason "Grund"
```

**Von Hand wird hier nichts zurueckgedreht.** Eine kleinere Zahl unter `last`
als in der Liste steht, faellt beim naechsten Aufruf auf, und dann vergibt das
Werkzeug gar keine Nummer mehr, bis es geklaert ist.

## Vergebene Nummern

| Nummer | Datum | Kunde | Netto | Brutto | Stand | Grund | Datei |
| --- | --- | --- | --- | --- | --- | --- | --- |

Noch keine Nummer vergeben.

## Staende

| Stand | Was er heisst |
| --- | --- |
| `entwurf` | geschrieben, noch nicht gedruckt |
| `gestellt` | gedruckt und beim Kunden |
| `storniert` | zurueckgenommen, die Nummer bleibt vergeben |
