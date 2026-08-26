---
description: Kit einrichten oder auf den aktuellen Stand bringen
argument-hint: [antwortdatei]
---

Lies zuerst `.ara/persona/ara.md`, dann `.ara/knowledge/init.md`, und arbeite das
Verfahren dort ab. Wissen, das dieser Befehl lädt: `.ara/knowledge/init.md`, dazu
`.ara/knowledge/security.md` für die Sicherheitsstufen und `.ara/knowledge/browser.md`
für den Browser. Sonst nichts.

Es gibt drei Wege, und welcher gilt, entscheiden eine Datei und das Argument:

**Ein Argument steht da (`$1`): eine Antwortdatei, kein Interview.**

```
node .ara/tools/init.mjs --answers $1
```

Das Werkzeug schreibt das Profil, legt die Befehle des Zweigs an und sagt, was fehlt.
Du berichtest das Ergebnis und nennst den nächsten Schritt, mehr nicht. Beispiele für
die Datei: `.ara/templates/init-answers-partner.json`, `init-answers-company.json`.

**`business/profile.md` fehlt: das erste Mal.** Interview nach dem Verfahren, zehn
Runden, jede gebündelt im Interview-Werkzeug. Die erste Frage ist die Weiche: Partner
oder Unternehmen. Sobald sie beantwortet ist, legst du die Befehle an:

```
node .ara/tools/commands.mjs --apply --role <partner|company>
```

Kein Token, kein Konto: das Onboarding braucht beides nicht.

**`business/profile.md` existiert: jedes weitere Mal.** Dann geht es um den Stand des
Kits, nicht um den Menschen.

1. `node .ara/tools/update.mjs --check` zeigt, was sich ändern würde. Nichts Neues:
   sag das in einer Zeile und hör auf.
2. Gibt es etwas Neues, zeig die Liste und lass das Einspielen bestätigen. Dann
   `node .ara/tools/update.mjs`. Es ersetzt nur `.ara/` und das Minimum von `.claude/`,
   deine Ordner fasst es nicht an.
3. `node .ara/tools/commands.mjs` zeigt je Befehl, ob er fehlt, im Kit neuer ist, von
   Hand angepasst wurde oder beides. Fehlende und im Kit neuere: Unterschied zeigen,
   dann `node .ara/tools/commands.mjs --apply`. Angepasste bleiben liegen, es sei denn,
   der Mensch will die Kit-Fassung: `--replace <name>`.
4. `node .ara/tools/init.mjs --show` nennt die Lücken im Profil. Fehlt etwas, das ein
   neuer Befehl braucht, frag genau das nach, nicht das ganze Profil noch einmal.
5. `node .ara/tools/selftest.mjs`, damit der neue Stand auf diesem Rechner nachweislich
   läuft.

Kurz zur Haltung: mach so viel wie möglich selbst, prüf statt zu fragen, und stell
Rückfragen gebündelt mit dem Interview-Werkzeug, nicht einzeln nacheinander.
