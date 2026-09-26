---
description: Eine App planen, bauen, auf ein Gerät bringen und live schalten
argument-hint: [<app>]
---

App: **$1**

Lies `.ara/knowledge/app.de.md` und arbeite danach. Wissen, das dieser Befehl lädt: jede Datei erst,
wenn ihr Moment kommt.

- `.ara/knowledge/app.de.md` immer, der Kern.
- `.ara/knowledge/app-patterns.de.md`, sobald eine Idee entsteht, und das Blatt des Musters, das
  der Plan nimmt, der es nennt.
- `.ara/knowledge/app-professional.de.md` vor dem Plan einer Fach-App: Mandanten oder Akten, Daten,
  die Jahre halten, Belege, die das Gerät ausliest, eine Freigabe ohne den Einreicher, ein
  Exportformat eines anderen Herstellers.
- `.ara/knowledge/platform-services.de.md`, sobald die App etwas von der Plattform will: Anmeldung,
  Freigabe, Flow, Auslesen eines Dokuments.
- `.ara/knowledge/design-system.de.md`, sobald du eine Oberfläche anfasst.
- `.ara/knowledge/deploy.de.md`, sobald ein Paket an ein Gerät geht.

Sicherheitsstufen und Produktwerte: `.claude/CLAUDE.md`. Vorher liest du `business/profile.md`:
Sprache, Zweig, Detailtiefe, Sicherheitsstufe, womit das Haus arbeitet.

**Das Argument.** `<app>` ist die App unter `apps/<app>/`. Kein Argument: erst der Merker `.ara/state.json`, dann
die vorhandenen Ordner. Genau einer, nimm ihn, sonst frag über das Interview-Werkzeug.

**Zuerst, immer:**

```
node .ara/tools/app.mjs --app <app>
```

Es sagt, wo die App steht und was ansteht, mit den Aufrufen. Gib das in drei Zeilen weiter und tu
das Erste, statt aufzuzählen, was alles ginge.

**Noch keine App**: das Interview kommt, bevor etwas angelegt wird; was offen blieb, kommt als
Annahme in den Plan. **An ein Gerät**: ohne Akte unter `devices/` zuerst `/device`. Vor dem
Einspielen sagst du, dass die App noch nicht sichtbar ist, und warum (`.ara/knowledge/deploy.de.md`).
`--live` ist Stufe 2: frag.
