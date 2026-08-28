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

Der Kontrakt trägt eine **Kontraktversion**. Das Kit kennt nicht eine Zahl, für die es
gebaut wäre, sondern die höchste Fassung, die es versteht. Daraus folgen drei Lagen:

- **Das Gerät führt dieselbe oder eine kleinere Zahl.** Es geht weiter. Geprüft wird
  ohnehin gegen das Schema dieses Geräts, und gerufen wird nur, was in dessen Kontrakt
  steht. Ein Gerät, das seit einem halben Jahr niemand angefasst hat, ist kein Fehlerfall,
  sondern der Normalfall in einem Bestand.
- **Das Gerät führt eine größere Zahl.** Das Kit hört auf und sagt, was ihm fehlt: welche
  Fassungen es nicht kennt, und welche Felder das Gerät nennt, die es nicht liest. Hol den
  aktuellen Stand des Kits mit `/init`, dann noch einmal.
- **Das Gerät nennt gar keine.** Dann ist es älter als der Kontrakt selbst.

Eingespielt wird nur in den ersten beiden Lagen. Ein Paket auf gut Glück zu schicken
heißt, den Fehler am Gerät zu suchen statt vorher.

Was die App danach am Gerät benutzen kann, ist eine andere Frage und steht in
`.ara/knowledge/platform-services.de.md`: Anmeldung, Freigaben, Flows, Sprachmodell,
Dokumente. Hier geht es nur darum, wie sie dorthin kommt.

**Ohne Kit-Schlüssel geht keiner dieser Aufrufe.** Er steht in der Geräteakte unter
`api_key_ref`, sein Wert in der Geheimnis-Ablage. Woher er kommt:
`.ara/knowledge/device.de.md`, Abschnitt „Der Kit-Schlüssel".

## Was in ein Paket gehört

In der Wurzel liegt `app.json`, daneben die Ordner, die das Manifest selbst benennt.
**Welche Felder einen Ordner benennen, sagt der Kontrakt** in der Wurzel seines Pakets: er
schreibt sie als Platzhalter, und jeder Platzhalter zeigt auf das Feld im Manifest, das
den Ordnernamen trägt. Das Kit liest sie dort und zählt sie nicht selbst auf. Kommt im
Produkt einer dazu, steht er beim nächsten Aufruf mit im Kontrakt.

**Flows sind eine Lieferung, keine Forderung.** Verspricht das Manifest einen Ordner für
Flows, bringt das Paket die Dateien mit: eine Datei je Flow, mit einem Kopf im Frontmatter
und dem Auftrag als Text darunter. Was in den Kopf gehört und was für einen Flow aus einem
Paket gilt, steht im Kontrakt, und `--contract` gibt beides aus: das Schema des Kopfes und
die Regeln wörtlich. Schreib sie nicht ab, lies sie an dem Gerät, um das es geht.

Was das Manifest verspricht, prüft das Kit vor dem Packen: dass es den Ordner gibt und
dass er nicht leer ist. Das ersetzt die Regeln des Kontrakts nicht, es spart den Weg
über ein abgewiesenes Paket.

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
   hineingehört, wie groß es sein darf, und was für einen Flow aus dem Paket gilt. Auch
   diese Regeln gibt das Werkzeug wörtlich aus, sobald das Gerät welche nennt.

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
`.ara/knowledge/security.de.md`.

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
  Hat das Kit selbst installiert, steht der Eintrag schon da: dann weiß es, welches
  Zertifikat dort liegt, es hat zugesehen, wie es entstanden ist.
- **401.** Der Schlüssel wurde am Gerät widerrufen oder gehört zu einem anderen Gerät.
  Am Gerät nachsehen, sonst einen neuen anlegen (`/device` mit `--deploy-key`).
- **Der Endpunkt steht nicht im Kontrakt.** Dann ruft das Kit ihn auch nicht. Das ist kein
  Fehler des Werkzeugs, sondern die Aussage, dass Kit und Gerät nicht zusammenpassen.
- **Die Schnittstelle liegt woanders als der SSH-Zugang.** Ein Gerät, das nur über einen
  Tunnel erreichbar ist oder sein Zertifikat unter einem anderen Namen führt, bekommt
  `api_base` in die Akte: die Adresse, unter der die Schnittstelle antwortet, mit Vorsatz.
  Sie sticht `address`, und `--base <url>` sticht beide, für den einen Versuch, der nicht
  in die Akte gehört. Was dauerhaft gilt, gehört in die Akte, nicht in den Aufruf.
- **Gar keine Antwort.** Erst `node .ara/tools/find-device.mjs --host <adresse>`, dann
  `.ara/knowledge/diagnostics.de.md`.
