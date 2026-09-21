---
description: Den Wurzelordner eines ganzen Hauses anlegen. Regeln, company, Roadmap mit Kartenstapel, Prüfskript, Grenze, Rechte je Ordner, eingebettete Orte als Verweis
argument-hint: [<pfad>]
---

Wurzel: **$1**

Lies `.ara/knowledge/root.de.md` und arbeite danach. Wissen, das dieser Befehl lädt:
`.ara/knowledge/root.de.md`, dazu `.ara/knowledge/security.de.md` für die Bestätigung. Das
Profil in `business/profile.md` liest du vorher: Sprache, Zweig. Den Befehl gibt es in beiden
Zweigen.

**Was es ist.** Eine Wurzel ist der eine Ordner über den Projekten eines Hauses: was stimmt,
was ansteht, wo etwas liegt. Sie liegt außerhalb des Kits und läuft danach ohne es. Auf die
Orte, an denen gearbeitet wird, GitHub-Repositories und fremde Ordner wie SharePoint, wird
verwiesen, kopiert werden sie nie.

**Erst siehst du nach, dann fragst du einmal.** Gibt es `$1`, ist es leer, ist es schon eine
Wurzel:

```
node .ara/tools/root.mjs --path <pfad> --show
```

Ist es eine Wurzel, sag, was dort steht, und frag, was ansteht: einen Ort nachtragen, sie
prüfen. Wenn nicht, frag über das Interview-Werkzeug in einem Bündel: wo, wie das Haus heißt,
welche Sprache, welche Orte mit Art, Adresse, lokalem Pfad, Zweck und ob die Wurzel in sie
schreiben darf. Vorgabe ist nein. Was du selbst herausfinden kannst, einen Pfad, ein Remote,
schlägst du nach, statt zu fragen. **In den Orten liest du nur.**

**Dann legt das Werkzeug aus:**

```
node .ara/tools/root.mjs --path <pfad> --name "<haus>" --places <datei.json>
```

Das Bündel von Fragen ist die Bestätigung, es nennt also die drei Dinge: die Absicht ist eine
neue Wurzel, das Ziel ist der eine Ordner, der leer ist oder fehlt, und nichts daneben, der
Rückweg ist, diesen Ordner zu löschen. Die Liste der Orte für `--places` schreibst du in den
temporären Ordner des Systems, nicht ins Kit. Lies vor, was das Werkzeug sagt: die Orte, das
Ergebnis des Prüfskripts, die Dauer. Einen Befund in einer frischen Wurzel nennst du, du
redest ihn nicht weg.

**Danach** biete an, `company/core.md` und `company/goal.md` gemeinsam zu füllen, in einem
zweiten Bündel von Fragen, und schreib nur, was der Mensch gesagt hat. Dann nenn den Schritt,
auf den es ankommt: von jetzt an startet der Agent in der Wurzel.

**Jemand will nur eine sehen:** `node .ara/tools/root.mjs --path <ordner> --example` legt die
Vorzeigefassung aus, eine erfundene Firma mit gefüllten Blättern.
