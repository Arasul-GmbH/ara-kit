# Verfahren: Apps auf ein Gerät bringen

> **Wann brauchst du das?** Wenn auf einem Gerät mit Arasul eine App landen soll: prüfen,
> ob Kit und Gerät zusammenpassen, einspielen, live schalten, zurückschalten, entfernen.

## Der Kontrakt ist die Quelle, nicht dieses Blatt

Ein Gerät sagt selbst, was es verspricht. Ein Aufruf, und du weißt es:

```
node .ara/tools/app.mjs --device <gerät> --contract
```

Was dabei herauskommt, ist die **einzige** Quelle für: das Schema von `app.json`, die
Regeln, die kein Schema trägt, den Kopf einer Flow-Datei, die Namen der Kopfzeilen, die
Grenzen eines Pakets, die Pfade unter `/apps/` und die Liste der Endpunkte mit dem
Bereich, den jeder verlangt. **Schreib nichts davon ab.** Es steht deshalb auch hier
nicht: was heute gilt, sagt das Gerät, das vor dir steht.

Der Kontrakt trägt eine **Kontraktversion**. Sie ist die Zahl, an der das Kit merkt, dass
es zu einem Gerät nicht passt. Weichen sie ab, sagt das Werkzeug in welche Richtung:

- **Das Gerät ist neuer.** Hol den aktuellen Stand des Kits mit `/init`.
- **Das Kit ist neuer.** Das Gerät braucht ein Update, bevor das Kit sich darauf verlässt.

In beiden Fällen wird nichts eingespielt. Ein Paket auf gut Glück zu schicken heißt, den
Fehler am Gerät zu suchen statt vorher.

**Ohne Kit-Schlüssel geht keiner dieser Aufrufe.** Er steht in der Geräteakte unter
`api_key_ref`, sein Wert in der Geheimnis-Ablage. Woher er kommt:
`.ara/knowledge/device.md`, Abschnitt „Der Kit-Schlüssel".

## Ein Paket prüfen, bevor es fliegt

```
node .ara/tools/app.mjs --device <gerät> --check <ordner>
```

Das Werkzeug liest `app.json` aus dem Ordner und hält es gegen das Schema **dieses**
Geräts. Es meldet jede Abweichung mit dem Feld, um das es geht, und es sagt dazu, was es
nicht prüfen konnte. Zwei Dinge musst du dabei selbst tun:

1. **Die Regeln lesen, die kein Schema trägt.** Das Werkzeug gibt sie aus, wörtlich aus
   dem Kontrakt. Sie sind keine Fußnote: „mindestens eines von Frontend und Backend",
   „mit Backend braucht es einen Port" und was sonst dort steht, weist das Gerät ab,
   auch wenn das Schema zufrieden war. Geh sie einzeln durch.
2. **Nachsehen, was der Kontrakt zum Paket sagt.** Wie gepackt wird, was nicht
   hineingehört, wie groß es sein darf.

## Einspielen

```
node .ara/tools/app.mjs --device <gerät> --deploy <ordner>
```

Das Werkzeug prüft erst das Manifest, packt dann den **Inhalt** des Ordners so, wie der
Kontrakt es vorschreibt, vergleicht die Größe mit der Grenze des Geräts und schickt es.
Passt das Manifest nicht, wird nichts geschickt.

**Ein Deploy rollt immer in den Teststand.** Einen Schalter dafür gibt es nicht, und das
ist keine Bequemlichkeitsfrage: der Livestand ist das, womit die Belegschaft arbeitet.
Das Gerät baut das Backend selbst aus dem Bauplan im Paket, und das dauert. Wartezeit ist
kein Fehler.

Weist das Gerät ab, begründet es das im Klartext und das Werkzeug reicht die Begründung
durch. Lies sie, statt den Aufruf zu wiederholen.

## Live schalten und zurück

```
node .ara/tools/app.mjs --device <gerät> --app <id> --status   welche Version steht wo
node .ara/tools/app.mjs --device <gerät> --app <id> --live     Teststand wird Livestand
node .ara/tools/app.mjs --device <gerät> --app <id> --back     die Version davor
```

**Live schaltet ein Mensch.** Frag vorher, auch wenn du gerade selbst eingespielt hast:
ab diesem Moment arbeiten die Leute damit. Das ist ein Eingriff der Stufe 2, siehe
`.ara/knowledge/security.md`.

`--back` ist ein **Tausch**, keine Einbahnstraße: was live war, wird die vorige Version,
ein zweites `--back` steht wieder am Anfang. Genau in dem Fall, in dem jemand hastig
zurückschaltet, ist das die Rettung.

Nach jedem Schalten: ein Satz in den Verlauf des Kunden oder in den Laufzettel des
Geräts. Welche App, welche Version, wer es wollte, was danach geprüft wurde.

## Entfernen

```
node .ara/tools/app.mjs --device <gerät> --app <id> --remove --confirm <id>
```

**Stufe 3, unumkehrbar.** Es fallen beide Container mitsamt ihren Volumen, beide Stände,
alle Freigaben und die Schlüssel der App. Ohne die abgetippte Kennung passiert nichts,
und das Werkzeug sagt vorher genau, was fällt. Sag es dem Menschen mit denselben Worten
und hol ein ausdrückliches Ja, bevor du es tippst.

## Wenn das Gerät nicht antwortet

- **Zertifikat nicht überprüfbar.** Ein Gerät im Kundennetz trägt meist ein selbst
  ausgestelltes. Wenn du sicher bist, dass es dieses Gerät ist: `tls: selfsigned` in die
  Akte, oder einmalig `--insecure`. Nicht ungefragt und nicht dauerhaft aus Bequemlichkeit.
- **401.** Der Schlüssel wurde am Gerät widerrufen oder gehört zu einem anderen Gerät.
  Am Gerät nachsehen, sonst einen neuen anlegen (`/device` mit `--deploy-key`).
- **Der Endpunkt steht nicht im Kontrakt.** Dann ruft das Kit ihn auch nicht. Das ist kein
  Fehler des Werkzeugs, sondern die Aussage, dass Kit und Gerät nicht zusammenpassen.
- **Gar keine Antwort.** Erst `node .ara/tools/find-device.mjs --host <adresse>`, dann
  `.ara/knowledge/diagnostics.md`.
