---
description: Die Rückmeldungen einer App vom Gerät holen, ordnen, Doppelte erkennen, eine Reihenfolge vorschlagen und nach Freigabe in der Testfassung umsetzen, nie live
argument-hint: [<app>]
---

App: **$1**

Lies `.ara/knowledge/feedback.de.md` und arbeite danach. Wissen, das dieser Befehl lädt:
`.ara/knowledge/feedback.de.md` immer; `.ara/knowledge/nachweis.de.md` erst, wenn du umsetzt;
`.ara/knowledge/app.de.md` nur für die Schritte Plan, Bau und Ausrollen, die dort stehen. Das Profil
in `business/profile.md` liest du vorher: Sprache, Zweig, Detailgrad. Den Befehl gibt es in beiden
Zweigen.

**Was es ist.** Mitarbeiter melden über das Icon über jeder App, was fehlt oder nicht stimmt. Dieser
Befehl holt die offenen Meldungen einer App in die Sitzung, ordnet sie, erkennt Doppelte und schlägt
eine Reihenfolge vor. Der Mensch gibt frei, was umgesetzt wird; geändert wird nur die Testfassung,
über den festen Ablauf mit Plan, Tests und Nachweis. **Live schaltet dieser Befehl nie.** Sag das zu
Beginn in zwei Sätzen, in einfachen Worten.

**Das Argument.** `$1` ist die Kennung der App wie in `app.json`. Ohne Argument: nachsehen (`ls
apps/`, `.ara/state.json`) und einmal mit den Apps als Auswahl fragen. Das Gerät kommt aus der
Akte; bei mehreren fragst du.

**Holen.**

```
node .ara/tools/feedback.mjs --device <gerät> --app <app>
```

Fehlt der Schlüssel für Rückmeldungen, sagt das Werkzeug es; anlegen erst nach einer Bestätigung
(`--key`). Sag einmal, ob Bildschirmfotos für diese App an den Agenten gehen; ist es aus, arbeitest
du ohne Bild und fragst nicht danach.

**Ordnen und fragen**, nach der Liste „Was geklärt sein muss“ in `.ara/knowledge/feedback.de.md`:
jede Meldung selbst lesen, zu Anliegen zusammenfassen, je Anliegen Art, Änderung in einem Satz und
Größe; dann eine Frage je Anliegen im Interview-Werkzeug mit fertigen Entwürfen (umsetzen mit dem
Satz, ablehnen mit dem Grund, später). Die zurückgelesene Entscheidung ist die Freigabe.

**Umsetzen.** `--set <nummern> --to angenommen`, dann Plan, Bau mit Tests und `--deploy` in den
Teststand wie bei `/app`, dann `--set <nummern> --to umgesetzt`. Abgelehnte mit `--to abgelehnt
--reason "<satz>"`. Kein `--live`, kein `--back`. Am Ende: was in der Testfassung steht, wo man es
ansieht, welche Nummern offen bleiben, und dass live der Mensch selbst schaltet.

**Tiefe.** Die Liste „Was geklärt sein muss“ in `.ara/knowledge/feedback.de.md` entscheidet, wann die Fragen enden, nicht das Ende einer Runde. Die Regel steht in `AGENTS.md`, „Every command asks to full depth“: eine vage Antwort mit fertigen Entwürfen nachfragen, „genug“ im Freitext beendet es, Unentschiedenes bleibt `neu`.
