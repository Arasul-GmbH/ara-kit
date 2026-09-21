---
description: Den Wurzelordner eines ganzen Hauses als Gerüst anlegen. Regeln, Skills, Agents, die Ordner der Ebene 1, Prüfskript, eingebettete Orte als Verweis. Die Methode und das Anmelden eines Vorschlags für Grenze und Rechte sind eigene Schritte
argument-hint: [<pfad>]
---

Wurzel: **$1**

Lies `.ara/knowledge/root.de.md` und arbeite danach. Wissen, das dieser Befehl lädt:
`.ara/knowledge/root.de.md`, dazu `.ara/knowledge/security.de.md` für die Bestätigung. Das
Profil in `business/profile.md` liest du vorher: Sprache, Zweig. Den Befehl gibt es in beiden
Zweigen.

**Was es ist.** Eine Wurzel ist der eine Ordner über den Projekten eines Hauses: was stimmt und
wo etwas liegt. Sie liegt außerhalb des Kits und läuft danach ohne es. Ohne Schalter angelegt
ist sie ein Gerüst: Regeln, Skills, Agents, die Liste der Orte, ein Prüfskript und die Ordner
der Ebene 1, die das Haus nennt. **Nichts im Baum läuft von selbst**, es gibt keine
`settings.json` und keinen scharfen Hook. Auf die Orte, an denen gearbeitet wird,
GitHub-Repositories und fremde Ordner wie SharePoint, wird verwiesen, kopiert werden sie nie.

**Erst siehst du nach, dann fragst du einmal.** Gibt es `$1`, ist es leer, ist es schon eine
Wurzel:

```
node .ara/tools/root.mjs --path <pfad> --show
```

Ist es eine Wurzel, sag, was dort steht, und frag, was ansteht: einen Ort nachtragen, die
Methode dazulegen, den Vorschlag anmelden, sie prüfen. Wenn nicht, frag über das
Interview-Werkzeug in einem Bündel: wo, wie das Haus heißt, welche Sprache, **die Ordner der
Ebene 1** (das Haus nennt sie, du schlägst keine vor), welche Orte mit Art, Adresse, lokalem
Pfad, Zweck und ob die Wurzel in sie schreiben darf (Vorgabe ist nein), und ob die Methode als
Zusatz gewünscht ist (Vorgabe ist nein). Was du selbst herausfinden kannst, einen Pfad, ein
Remote, schlägst du nach, statt zu fragen. **In den Orten liest du nur.**

**Dann legt das Werkzeug aus:**

```
node .ara/tools/root.mjs --path <pfad> --name "<haus>" --folders "<a,b=wofür>" --places <datei.json> [--method]
```

Das Bündel von Fragen ist die Bestätigung, es nennt also die drei Dinge: die Absicht ist eine
neue Wurzel, das Ziel ist der eine Ordner, der leer ist oder fehlt, und nichts daneben, der
Rückweg ist, diesen Ordner zu löschen. Die Liste der Orte für `--places` schreibst du in den
temporären Ordner des Systems, nicht ins Kit. Lies vor, was das Werkzeug sagt: die Orte, das
Ergebnis des Prüfskripts, die Dauer. Einen Befund in einer frischen Wurzel nennst du, du
redest ihn nicht weg. Ein unbekannter Schalter hält das Werkzeug an, und du sagst, welcher.

**Der Vorschlag für Grenze und Rechte** liegt in `.claude/proposal/` und tut nichts, bis der
Mensch zustimmt. Biete den Schritt an, mach ihn nicht ungefragt: `--enroll` zeigt, was in die
eigenen Einstellungen käme, dazu die Prüfsumme, du legst ihm diesen Text über das
Interview-Werkzeug vor, und erst sein Ja lässt dich `--enroll --consent <prüfsumme>`
ausführen. Der Rückweg ist `--unenroll`. Einzelheiten im Verfahren.

**Danach** biete an, die drei Sätze oben in `.claude/CLAUDE.md` gemeinsam zu schreiben, und mit
der Methode `company/core.md` und `company/goal.md`, in einem zweiten Bündel von Fragen, und
schreib nur, was der Mensch gesagt hat. Dann nenn den Schritt, auf den es ankommt: von jetzt an
startet der Agent in der Wurzel oder in einem Ordner der Ebene 1.

**Jemand will nur eine sehen:** `node .ara/tools/root.mjs --path <ordner> --example` legt die
Vorzeigefassung aus, eine erfundene Firma mit der Methode und gefüllten Blättern.
