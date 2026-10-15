---
description: Fragen, wie die Arbeit eines Hauses läuft, wer tut was, wann, mit welchem Papier, und es als Prozessblatt aufschreiben, aus dem /app baut
argument-hint: [<ablauf>] (Partner: <kunde>/<ablauf>)
---

Ablauf: **$1**

Lies `.ara/knowledge/process.de.md` und arbeite danach. Wissen, das dieser Befehl lädt:
`.ara/knowledge/process.de.md` immer; `.ara/knowledge/customer-file.de.md` beim Partner, um den
Ordner des Kunden zu finden. Das Profil in `business/profile.md` liest du vorher: Sprache, Zweig,
Detailgrad, womit das Haus arbeitet. Den Befehl gibt es in beiden Zweigen.

**Was es ist.** Das Interview, das vor `/app` kommt: nicht „wie soll die App aussehen“, sondern
„wie läuft die Arbeit heute“. Sein Ergebnis ist ein Prozessblatt, eine Seite mit: wer tut was,
wann, mit welchem Papier und wo jemand entscheidet. `/app` liest es und fragt nicht noch einmal,
was dort steht. Sag das zu Beginn in einem Satz, in einfachen Worten.

**Das Argument.** `$1` ist die Kennung eines Blattes. **Im Partnerzweig** ist es
`<kunde>/<ablauf>`, und das Blatt liegt im Ordner dieses Kunden; ein Kunde nach dem anderen, nie
stillschweigend gewechselt (`AGENTS.md`). Im Unternehmenszweig gibt es keine Kunden, das Blatt
liegt unter `business/processes/`. Ohne Argument: erst nachsehen.

```
node .ara/tools/process.mjs --list [--customer <kunde>]
```

Ein Blatt, das es gibt, öffnest du und führst es weiter, die Prüfung sagt, was fehlt. Gibt es
keines, fragst du einmal, welcher Ablauf gemeint ist, und legst es an. **Ein Blatt ist ein
Ablauf.**

**Dann interviewst du**, nach der Liste „Was klar sein muss“ in `.ara/knowledge/process.de.md`:
der letzte wirkliche Fall, die Schritte, die Papiere, die Entscheidungen, was schiefgeht, wer was
sieht, was offen ist. Gebündelt im Interview-Werkzeug, mit fertigen Zeilen als Auswahl, nie mit
einem leeren „was sind Ihre Schritte?“. Frag nach der Arbeit, wie sie heute läuft, nicht nach
Bildschirmen und nicht nach einer App: das ist `/app`.

**Schreiben und beweisen.**

```
node .ara/tools/process.mjs --new <kennung> [--customer <kunde>] --title "<titel>"
node .ara/tools/process.mjs --check <kennung> [--customer <kunde>]
node .ara/tools/process.mjs --derive <kennung> [--customer <kunde>]
```

Füll das Blatt mit dem, was gesagt wurde, in den Worten des Hauses und mit echten Umlauten.
Schließ jede Lücke, die `--check` nennt, lies dann das Ergebnis in einfachen Worten über das
Interview-Werkzeug zurück und frag, was fehlt. Erst ein bestätigtes und geprüftes Blatt ist
fertig. Nenne den nächsten Schritt: `/app <app>`, das das Blatt mit `--prozess <kennung>` nimmt.

**Tiefe.** Die Liste „Was klar sein muss“ in `.ara/knowledge/process.de.md` entscheidet, wann die Fragen enden, nicht das Ende einer Runde. Die Regel steht in `AGENTS.md`, „Every command asks to full depth“: eine vage Antwort mit fertigen Entwürfen nachfragen, „genug“ im Freitext beendet es, der Rest kommt unter „Offen“.
