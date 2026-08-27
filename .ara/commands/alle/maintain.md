---
description: Laufendes Gerät betreuen. Zustand, Diagnose, Update, Erweiterung
argument-hint: <gerät> oder <kunde>/<gerät>
---

Betreuung für: **$1**

Lies `.ara/knowledge/maintenance-flow.md` und arbeite danach. Wissen, das dieser Befehl
lädt: `.ara/knowledge/maintenance-flow.md`, `.ara/knowledge/security.md`,
`.ara/knowledge/diagnostics.md` bei einer Störung, `.ara/knowledge/extensions.md` bei
einer Erweiterung, `.ara/knowledge/live-knowledge.md` für jeden Produktwert. Das Profil
in `business/profile.md` liest du vorher.

**Das Argument.** `zentrale` ist ein Gerät ohne Kunden unter `devices/zentrale/`.
`mueller/zentrale` ist ein Kundengerät unter `customers/mueller/devices/zentrale/`. Nur
ein Kundenname ohne Gerät meint dessen Gerät, und hat er mehrere, fragst du, welches.
Fehlt das Argument: erst der Merker `.ara/state.json`, dann die vorhandenen Akten. Gibt
es genau eine, nimm sie. Sonst frag über das Interview-Werkzeug.

## Zuerst die Statuszeile, dann die Frage

**Bevor du irgendetwas sagst, misst du.**

```
node .ara/tools/maintain.mjs --device <gerät>                       eigenes Gerät
node .ara/tools/maintain.mjs --customer <kunde> --device <gerät>    Kundengerät
```

Das Werkzeug geht zwei Wege und keiner ist Bedingung für den anderen: über SSH den
Zustand des Rechners, über die Schnittstelle mit dem Kit-Schlüssel das, was die
Plattform von sich weiß. Es liest nur.

Die erste Zeile seiner Ausgabe ist die Statuszeile: Version, Apps mit ihren Ständen,
letzte Sicherung, Auffälliges. **Die gibst du weiter, wörtlich oder in einem Satz
zusammengefasst, und dann fragst du, was ansteht.** Kein Vorschlagskatalog, keine
Aufzählung dessen, was alles ginge.

Was das Werkzeug nicht messen konnte, steht in seinem Abschnitt "Was fehlt". **Sag es
dazu.** Ein Bericht ohne diesen Satz liest sich wie ein heiles Gerät, und genau darauf
verlässt sich hinterher jemand.

**Kein Argument angegeben:** Bei einem Partner die Kunden auflisten
(`node .ara/tools/customer.mjs`), je eine Zeile mit Geräten und letztem Kontakt, und
fragen, um welches Gerät es geht. Beim Unternehmen die Geräte aus `devices/`.

## Dann kommt Freitext

Der Mensch sagt in seinen Worten, was los ist. „Der Admin sagt, die Urlaubs-App hängt."
„Nur mal nachsehen." „Wir wollen updaten." Aus dem Anliegen erkennst du, was zu tun ist,
und ziehst das passende Verfahren:

| Anliegen | Verfahren |
|---|---|
| Es klemmt | `.ara/knowledge/diagnostics.md`. Erst feststellen, dann ändern |
| Nur nachsehen | Der Bericht ist die Antwort. Ergebnis in den Verlauf, auch wenn alles in Ordnung war |
| Eine App hängt | Stand aus dem Bericht, dann `/app`: zurückschalten auf die vorige Fassung ist der schnellste Rückweg |
| Update einspielen | `.ara/knowledge/maintenance-flow.md`, Abschnitt "Update einspielen". Erst sichern, dann prüfen, dass die Sicherung existiert |
| Erweiterung | `.ara/knowledge/extensions.md` |

Bei einer Störung gilt: keine Reparatur ohne Befund, keine zwei Änderungen gleichzeitig.

## Der Bericht

```
node .ara/tools/maintain.mjs --device <gerät> --report
```

Legt den Bericht unter `<geräteordner>/reports/JJJJ-MM-TT-wartung.md` ab und schreibt
eine Zeile in den Laufzettel. Nimm das, wenn jemand nachweisen können soll, was wann
gemessen wurde: bei einer Wartung nach Vertrag, vor und nach einem Update, und immer
dann, wenn du selbst etwas verändert hast.

## Was das Werkzeug nicht tut

Es startet nichts neu, spielt nichts ein und räumt nichts auf. **Jeder Eingriff ist eine
eigene Entscheidung**, mit Absicht, Ziel und Rückweg, und bei einem Kundengerät mit einer
Bestätigung davor (`.ara/knowledge/security.md`). Ein Wartungsvertrag erlaubt Wartung, er
ist kein Freibrief für einen Neustart um elf Uhr vormittags.

Es rät auch keinen Pfad. Findet es zu einem Punkt nichts im Kontrakt des Geräts, steht
dort "bietet dieses Gerät nicht an", und das ist die Antwort. Nicht ergänzen.

Jeder Einsatz endet mit einem Eintrag: bei einem Kundengerät unter
`customers/<kunde>/history/`, sonst im Laufzettel des Geräts.
