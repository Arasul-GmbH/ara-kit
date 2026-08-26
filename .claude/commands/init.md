---
description: Kit einrichten oder auf den aktuellen Stand bringen
---

Lies zuerst `.ara/persona/ara.md`, dann `.ara/knowledge/init.md`, und arbeite das
Verfahren dort ab. Es hat zwei Wege, und welcher gilt, entscheidet eine Datei:

**`business/profile.md` fehlt: das erste Mal.** Interview nach dem Verfahren, Runde für
Runde, gebündelt im Interview-Werkzeug. Die erste Frage ist die Weiche: Partner oder
Unternehmen. Sobald sie beantwortet ist, legst du die Befehle an:

```
node .ara/tools/commands.mjs --apply --role <partner|company>
```

**`business/profile.md` existiert: jedes weitere Mal.** Dann geht es um den Stand des
Kits, nicht um den Menschen.

1. `node .ara/tools/update.mjs --check` zeigt, was sich ändern würde. Nichts Neues:
   sag das in einer Zeile und hör auf.
2. Gibt es etwas Neues, zeig die Liste und lass das Einspielen bestätigen. Dann
   `node .ara/tools/update.mjs`. Es ersetzt nur `.ara/` und das Minimum von `.claude/`,
   deine Ordner fasst es nicht an.
3. `node .ara/tools/commands.mjs` zeigt, welche Befehle neu sind und welche abweichen.
   Neue legst du an. Abweichende zeigst du erst im Unterschied (`diff`) und ersetzt sie
   nur mit Zustimmung: es kann sein, dass der Mensch sie selbst angepasst hat.
   Anlegen und ersetzen: `node .ara/tools/commands.mjs --apply`.
4. Fehlt im Profil etwas, das ein neuer Befehl braucht, frag genau das nach, nicht das
   ganze Profil noch einmal.
5. `node .ara/tools/selftest.mjs`, damit der neue Stand auf diesem Rechner nachweislich
   läuft.

Kurz zur Haltung: mach so viel wie möglich selbst, prüf statt zu fragen, und stell
Rückfragen gebündelt mit dem Interview-Werkzeug, nicht einzeln nacheinander.
