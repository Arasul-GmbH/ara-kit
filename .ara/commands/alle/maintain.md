---
description: Laufendes Gerät betreuen. Diagnose, Update, Reparatur, Erweiterung
argument-hint: <kunde> oder <kunde>/<gerät>
---

Betreuung für: **$1**

Lies `.ara/knowledge/maintenance-flow.md` und arbeite danach. Wissen, das dieser Befehl
lädt: `.ara/knowledge/maintenance-flow.md`, `.ara/knowledge/security.md`,
`.ara/knowledge/diagnostics.md` bei einer Störung, `.ara/knowledge/extensions.md` bei
einer Erweiterung, `.ara/knowledge/live-knowledge.md` für jeden Produktwert. Das Profil
in `business/profile.md` liest du vorher.

**Zuerst:** Lagebild in drei Zeilen, wer, welches Gerät, wann zuletzt etwas passiert ist,
ob es erreichbar ist (`node .ara/tools/remote.mjs --customer <kunde> --check`). Dann fragen,
was ansteht. Kein Vorschlagskatalog.

**Kein Argument angegeben:** Kunden auflisten, je eine Zeile mit letztem Verlaufseintrag.

Bei einer Störung gilt `.ara/knowledge/diagnostics.md`: erst feststellen, dann ändern. Keine
Reparatur ohne Befund, keine zwei Änderungen gleichzeitig.

Jeder Einsatz endet mit einem Eintrag unter `customers/<kunde>/history/`.
