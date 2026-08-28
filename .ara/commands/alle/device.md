---
description: Gerät anlegen und prüfen. Akte, SSH, Hardware, Urteil, Zustand und nächste Schritte
argument-hint: [<gerät> oder <kunde>/<gerät>]
---

Gerät: **$1**

Lies `.ara/knowledge/device.md` und arbeite danach. Wissen, das dieser Befehl lädt:
`.ara/knowledge/device.md`, `.ara/knowledge/security.md`, dazu erst nach dem Urteil
und nur bei Bedarf `.ara/knowledge/remote-access.md`, `.ara/knowledge/boot-and-flash.md`,
`.ara/knowledge/identify-device.md`, `.ara/knowledge/handover.md`,
`.ara/knowledge/deploy.md`, sobald Arasul auf dem Gerät läuft, und
`.ara/knowledge/live-knowledge.md` für jeden Produktwert. Das Profil in
`business/profile.md` liest du vorher: Zweig, Erklärtiefe, Sicherheitsstufe, SSH-Schlüssel.

**Das Argument.** `zentrale` ist ein Gerät ohne Kunden, es liegt unter `devices/zentrale/`.
Das gilt in beiden Zweigen: beim Unternehmen ist es der Normalfall, beim Partner sind es
die eigenen Geräte. `mueller/zentrale` ist ein Kundengerät, es liegt unter
`customers/mueller/devices/zentrale/`, und den Kunden gibt es dann schon (sonst zuerst
`/customer`). Fehlt das Argument: erst der Merker `.ara/state.json`, dann die vorhandenen
Akten. Gibt es genau eine, nimm sie. Sonst frag über das Interview-Werkzeug.

**Zuerst, immer:**

```
node .ara/tools/device.mjs --name <gerät>
```

Mit `--customer <kunde>` bei einem Kundengerät. Gibt es die Akte schon, prüft das
Werkzeug erneut und sagt, wo es steht. Gibt es sie noch nicht, braucht es die Adresse
und den Anmeldenamen: `--host <adresse> --user <name>`, dazu `--port` und `--key`, wenn
sie vom Üblichen abweichen. Was du davon nicht weißt, fragst du gebündelt, bevor du
das Werkzeug aufrufst, nicht danach.

Das Werkzeug legt die Akte an, prüft SSH, erkennt Hardware und System, findet Docker,
Ollama und Hinweise auf Arasul und fällt das Urteil: **unterstützt**, **bald** oder
**nicht unterstützt, wir merken es vor**. Es liest nur. Sag das Ergebnis in drei Zeilen
und den nächsten Schritt, den es nennt.

**Docker und Ollama** setzt es nur auf Wunsch auf, mit `--install docker,ollama`. Das
ist ein Eingriff der Stufe 2: Absicht, Ziel und Rückweg nennen, bestätigen lassen, dann
aufrufen. Nur auf Linux.

**Arasul installieren** geht mit `--install arasul`, auf einem unterstützten Gerät, das
noch keins hat. Dafür braucht es zum ersten Mal ein Token aus dem Portal: fünf je Partner
kostenlos, eine Schranke vor dem Download, keine Lizenzprüfung. Fehlt es, sagt das
Werkzeug, wie es hinterlegt wird. Auch das ist Stufe 2, es dauert, und die Ausgabe des
Installers wird mitgelesen. Der Installer bekommt Startpasswort und Netzname mit, denn
nur dabei entstehen sie am Gerät; das Passwort würfelt das Kit und legt es in die
Geheimnis-Ablage, den Netznamen setzt `--net-name <name>`, sonst gilt der Name der Akte.

**Liegen Reste da, läuft aber nichts** (`arasul: traces`), sieh erst nach, was dort liegt,
sag es dem Menschen und lass dir das Darüberhinweg bestätigen. Dann
`--install arasul --despite-traces`. Läuft die Plattform dagegen wirklich, ist das kein
Aufsetzen mehr, sondern ein Update, und das ist ein anderer Weg.

**Läuft Arasul schon**, fehlt nur der Kit-Schlüssel für den Deploy: `--deploy-key` legt
ihn am Gerät an und hinterlegt ihn. In der Akte steht nur sein Name, nie sein Wert.
Danach ist der erste Nachweis der Kontrakt:
`node .ara/tools/app.mjs --device <gerät> --contract`.

**Der erste Mitarbeiter und die erste Freigabe** gehören noch zur Abnahme. Ohne Browser
geht das über die Verwaltungsschnittstelle der Plattform; wo das beschrieben steht, sagt
`node .ara/tools/mirror.mjs --docs`. Verfahren in `.ara/knowledge/device.md`.

**Ohne Arasul endet es hier.** Das Werkzeug sagt in einem Satz, was Arasul brächte. Mehr
nicht, kein Verkaufsgespräch. Mit Arasul auf einem unterstützten Gerät geht es nach dem
Verfahren weiter.
