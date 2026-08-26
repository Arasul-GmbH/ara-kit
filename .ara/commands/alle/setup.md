---
description: Gerät einrichten, von der Vorbereitung bis zur Abnahme
argument-hint: <kunde> oder <kunde>/<gerät>
---

Einrichtung für: **$1**

Lies `.ara/knowledge/setup-flow.md` und arbeite danach. Wissen, das dieser Befehl lädt:
`.ara/knowledge/setup-flow.md`, `.ara/knowledge/security.md`, dazu je Schritt
`.ara/knowledge/identify-device.md`, `.ara/knowledge/boot-and-flash.md`,
`.ara/knowledge/remote-access.md`, `.ara/knowledge/handover.md` und
`.ara/knowledge/live-knowledge.md` für jeden Produktwert. Das Profil in
`business/profile.md` liest du vorher: Erklärtiefe, Sicherheitsstufe, SSH-Schlüssel.

**Zuerst, immer:**

```
node .ara/tools/runsheet.mjs --customer <kunde> --show
```

Sag in einem Satz, wo es steht, und mach dort weiter. Fang nicht von vorn an, und lies
nicht das ganze Protokoll vor.

**Kein Laufzettel vorhanden:** Das ist eine neue Einrichtung. Prüf, ob die Kundenakte
existiert (sonst zuerst `/customer`), klär mit dem Menschen, um welches Gerät es geht, und
leg den Laufzettel an.

**Enthält das Argument einen Schrägstrich** (`mueller/werk2`), ist der zweite Teil die
Gerätebezeichnung. Hat der Kunde mehrere Geräte und es fehlt die Angabe, frag, rate nicht.

**Steht `business` vor dem Schrägstrich** (`business/jetson-thor`), geht es um ein eigenes
Gerät des Partners, nicht um ein Kundengerät. Es liegt unter `business/<gerätename>/` und
heißt nach dem Modell. Alle Werkzeuge sprechen es mit `--customer business` an, sonst
ändert sich am Ablauf nichts. Verfahren: `.ara/knowledge/customer-file.md`, Abschnitt „Die
eigenen Geräte des Partners".

Halte dich an die Schleife: Vorbedingung prüfen, tun, nachweisen, eintragen. Nach jedem
abgeschlossenen Schritt schreibst du in den Laufzettel, mit Nachweis. Wenn etwas klemmt,
trägst du `--status unterbrochen` ein und sagst, was du siehst.
