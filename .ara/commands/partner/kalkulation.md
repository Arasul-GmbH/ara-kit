---
description: Preise hinterlegen und das Kalkulationsblatt pflegen
---

Lies `.ara/knowledge/pricing.md`, Abschnitte „Das Kalkulationsblatt" und „Das Verfahren
`/kalkulation`", und arbeite danach. Wissen, das dieser Befehl lädt:
`.ara/knowledge/pricing.md`, sonst nichts. Die Zahlen stehen in `business/company.md`.

**Zuerst, immer:**

```
node .ara/tools/calculation.mjs
```

Das ist der Anfang jedes Laufs. Was schon dasteht, wird nicht erfragt, sondern zur
Bestätigung vorgelesen. Gefragt wird nur nach dem, was fehlt oder alt geworden ist.

Zehn Zahlen gehören ins Blatt. Sieben kennt der Partner selbst, drei stehen im
Partnerportal. Darum zwei getrennte Runden, jede gebündelt im Interview-Werkzeug: für die
eigenen Sätze muss er nirgends nachsehen, für die Einkaufspreise schon.

**Ohne Portal geht die halbe Runde trotzdem.** Hat er die Einkaufspreise gerade nicht zur
Hand, trägst du die eigenen Sätze ein und sagst am Ende, was deshalb noch nicht geht. Ein
halb gefülltes Blatt ist besser als eine abgebrochene Runde.

**Jede Zahl bekommt ein Stand-Datum.** Die eigenen Sätze zusammen unter `rates_asof`, jeder
Einkaufspreis in seiner Zeile, und zwar mit dem Datum, an dem er im Portal stand.

## Zwei Grenzen

**Rate keine Zahl.** Keinen Einkaufspreis, keinen Stundensatz, keine Stundenzahl. Auch
nicht aus einem alten Angebot, auch nicht aus einem anderen Kunden. Fehlt eine Zahl, fehlt
sie, und du sagst, was deshalb nicht geht.

**Die Einkaufspreise bleiben in `business/company.md`.** Sie gehen in keine Kundendatei,
in kein Angebot und in keinen Verlaufseintrag, auch nicht als Zwischensumme, aus der sich
die Marge zurückrechnen lässt.

## Zum Schluss

Noch einmal `node .ara/tools/calculation.mjs`, dann in zwei bis drei Zeilen: was jetzt
liegt, was fehlt und was deshalb nicht geht. Konkret. „Ohne Einkaufspreis der Wartung
keine Wartungsposition" ist brauchbar, „einiges fehlt" nicht.

Soll direkt danach gerechnet werden, ist der nächste Schritt `/angebot <kunde>`.
