---
description: Laufendes Gerät betreuen — Diagnose, Update, Reparatur, Erweiterung
argument-hint: <kunde> oder <kunde>/<gerät>
---

Betreuung für: **$1**

Lies `.ara/wissen/ablauf-wartung.md` und arbeite danach.

**Zuerst:** Lagebild in drei Zeilen — wer, welches Gerät, wann zuletzt etwas passiert ist,
ob es erreichbar ist (`node .ara/werkzeuge/fern.mjs --kunde <kunde> --pruefen`). Dann fragen,
was ansteht. Kein Vorschlagskatalog.

**Kein Argument angegeben:** Kunden auflisten, je eine Zeile mit letztem Verlaufseintrag.

Bei einer Störung gilt `.ara/wissen/diagnose.md`: erst feststellen, dann ändern. Keine
Reparatur ohne Befund, keine zwei Änderungen gleichzeitig.

Jeder Einsatz endet mit einem Eintrag unter `kunden/<kunde>/verlauf/`.
