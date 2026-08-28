---
description: Eine App planen, bauen, auf ein Gerät bringen und live schalten
argument-hint: [<app>]
---

App: **$1**

Lies `.ara/knowledge/app.de.md` und arbeite danach. Wissen, das dieser Befehl lädt:
`.ara/knowledge/app.de.md`, `.ara/knowledge/security.de.md`, dazu `.ara/knowledge/deploy.de.md`,
sobald ein Paket an ein Gerät geht, `.ara/knowledge/platform-services.de.md`, sobald die App
etwas von der Plattform will (Anmeldung, Freigabe, Flow, Sprachmodell),
`.ara/knowledge/extensions.de.md` beim ersten Interview mit einem Kunden und
`.ara/knowledge/live-knowledge.de.md` für jeden Produktwert. Das Profil
in `business/profile.md` liest du vorher: Zweig, Erklärtiefe, Sicherheitsstufe, womit das
Haus arbeitet.

**Das Argument.** `<app>` ist die App unter `apps/<app>/`. Apps liegen
kundenunabhängig oben: dieselbe App läuft vielleicht bei drei Kunden, und wo sie läuft,
sagt das Gerät. Fehlt das Argument: erst der Merker `.ara/state.json`, dann die
vorhandenen Akten. Gibt es genau eine, nimm sie, sonst frag über das Interview-Werkzeug.

**Zuerst, immer:**

```
node .ara/tools/app.mjs --app <app>
```

Das Werkzeug liest die Akte und sagt, wo die App steht und was jetzt ansteht, mit dem
Aufruf zu jedem Schritt. Sag das in drei Zeilen weiter und mach den ersten davon, statt
alles aufzuzählen, was ginge.

**Gibt es die App noch nicht**, ist das Interview dran, bevor irgendetwas angelegt wird:
die Prüfliste steht im Verfahren. Erst danach `--new` und der erste Plan. Was offen
geblieben ist, steht als Annahme im Plan und wird beim nächsten Mal vorgelesen.

**Ist ein Plan aktiv**, geh zuerst seine Annahmen durch, dann bau, was darin steht, dann
`--build`. Der Bau ist das Paket, nicht die laufende App: was sie tut, sieht man am Gerät.

**Geht es an ein Gerät**, immer erst `--check` gegen dessen Kontrakt, dann `--deploy`.
Das rollt in den **Teststand**, und dort bleibt es, bis ein Mensch es sehen wollte.
`--live` ist ein Eingriff der Stufe 2: frag vorher, auch wenn du gerade selbst eingespielt
hast, ab dem Moment arbeiten die Leute damit. Danach: Plan nach `erledigt/`, README der
App fortschreiben, ein Satz in den Laufzettel oder in den Verlauf des Kunden.

**Auf einem Gerät ohne Arasul** geht `--compose` über SSH. Sag vorher, was dabei fehlt,
mit denselben Worten, die das Werkzeug hinterher ausgibt: keine Anmeldung, kein Flow,
keine Freigabe. Das ist ein Weg zum Vorführen, keiner für echte Daten.
