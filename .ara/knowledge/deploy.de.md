# Verfahren: Apps auf ein Gerät bringen

> **Wann brauchst du das?** Wenn eine App auf einem Gerät landen soll: prüfen, dass Kit und Gerät
> zusammenpassen, einspielen, freigeben, live schalten und zurück, entfernen, oder auf ein Gerät
> ohne Arasul bringen. Was die App dort benutzt: `.ara/knowledge/platform-services.de.md`.

## Der Kontrakt ist die Quelle, nicht dieses Blatt

```
node .ara/tools/app.mjs --device <gerät> --contract
```

Die **einzige** Quelle für das Schema von `app.json`, die Regeln, die kein Schema trägt, den Kopf
einer Flow-Datei, die Namen der Kopfzeilen, die Grenzen eines Pakets, die Pfade unter `/apps/` und
die Endpunkte mit ihren Bereichen. **Schreib nichts davon ab**, auch hier nicht. Ohne den
Kit-Schlüssel geht kein Aufruf: er steht in der Akte des Geräts unter `api_key_ref`, sein Wert in
der Ablage für Geheimnisse, woher er kommt, steht in `.ara/knowledge/device.de.md`, „Der
Kit-Schlüssel".

Der Kontrakt trägt eine **Kontraktversion**, und das Kit kennt die höchste, die es versteht:

- **Dieselbe oder eine kleinere Zahl.** Es geht weiter, gegen das Schema dieses Geräts, und gerufen
  wird nur, was sein Kontrakt nennt. Ein Gerät, das ein halbes Jahr niemand angefasst hat, ist der
  Normalfall.
- **Eine größere Zahl.** Das Kit hält an und nennt die Fassungen und Felder, die es nicht kennt. Der
  Ausweg ist `node .ara/tools/update.mjs` oder `/init`: **der Fehler liegt nicht in der App**, und
  `/device`, `/init`, `--check` und `--deploy` sagen es.
- **Gar keine.** Das Gerät ist älter als der Kontrakt.

Eingespielt wird nur in den ersten beiden Fällen.

## Ein Paket prüfen, bevor es fliegt

```
node .ara/tools/app.mjs --device <gerät> --app <name> --check
```

`app.json` liegt an der Wurzel des Pakets, daneben die Ordner, die das Manifest nennt; welche Felder
einen Ordner nennen, sagt der Kontrakt als Platzhalter. **Flows sind eine Lieferung**: ein
versprochener Flow-Ordner bringt eine Datei je Flow, und das Kit prüft, dass ein versprochener
Ordner da und nicht leer ist. Das Werkzeug hält das Manifest gegen das Schema **dieses** Geräts,
nennt jede Abweichung und was es nicht prüfen konnte, prüft, dass die Oberfläche ein **Bau** ist,
und gibt `arasul.json` aus. Selbst liest du, Wort für Wort, wie das Werkzeug sie ausgibt, **die
Regeln, die kein Schema trägt**, „mindestens eines von frontend und backend", „mit einem Backend ein
Port": ein Manifest, das eine davon bricht, lehnt das Gerät ab, auch wenn das Schema hält. Und **was
der Kontrakt über das Paket sagt**: Packen, was draußen bleibt, Größe, Flows.

## Einspielen, und warum es noch nicht sichtbar ist

```
node .ara/tools/app.mjs --device <gerät> --app <name> --deploy
```

Prüfen, den **Inhalt** des Ordners packen, wie der Kontrakt es vorschreibt, mit der Größengrenze
vergleichen, schicken; eine Ablehnung kommt mit dem Grund des Geräts, lies ihn, statt zu
wiederholen. Das Gerät baut das Backend selbst, Warten ist kein Fehler. **Ein Deploy rollt immer in
den Teststand**, ohne Schalter: live ist das, womit die Belegschaft arbeitet.

**Eingespielt ist nicht sichtbar, und das sagst du vor dem Einspielen.** Ein Mensch sieht die App
erst, wenn sie für ihn freigegeben ist; ohne das antwortet die Adresse des Teststands mit 403, die
fehlende Freigabe und nicht die App. Hinterher gesagt, hält ein Mensch das Kit für kaputt; vorher
gesagt, wartet er. Freigeben kann das Kit nicht, sein Schlüssel trägt `app:deploy` und sonst
nichts. `--deploy` nennt an seinem Ende die zwei Wege: eine Sitzung aus dem Startpasswort, wenn es
in der Ablage liegt (`node .ara/tools/device.mjs --name <gerät> --admin-login`), oder ein Mensch in
der Oberfläche des Geräts. Weg und Seite stehen in Admin-Handbuch und API-Referenz, nie im Kit:
`node .ara/tools/mirror.mjs --docs --device <gerät>`. Widersprechen sich Anleitung und Kontrakt,
gilt der Kontrakt, er kommt aus dem laufenden Backend.

**Eine Freigabe gilt einem Stand.** Wer allein für den Livestand freigegeben ist, sieht eine leere
Übersicht, obwohl die Freigabe steht, der verwirrendste Zustand: die Freigabe muss den Teststand
meinen, wie auch immer das Admin-Handbuch ihn nennt.

## Live schalten und zurück

```
node .ara/tools/app.mjs --device <gerät> --app <id> --status   welche Fassung wo steht
node .ara/tools/app.mjs --device <gerät> --app <id> --live     Teststand wird live
node .ara/tools/app.mjs --device <gerät> --app <id> --back     die Fassung davor
```

**Live schaltet ein Mensch**, Stufe 2: frag vorher, auch wenn du vor einer Minute eingespielt hast,
ab dann arbeiten Leute damit. **Test und live haben je eine eigene Datenbank**: die Fassung geht
mit, die Daten nicht. Live beginnt beim ersten Mal leer und behält seine eigenen über jede Fassung
und `--back`. Sag das vor dem ersten Schalten, und plan, was live von Anfang an da sein muss,
Mandanten etwa: jemand legt es dort an, oder eine Migration bringt es mit.
`--status` sagt es auch. `--back` ist ein **Tausch**: ein zweites `--back` steht wieder am
Anfang, die Rettung für den, der in Eile zurückgeschaltet hat. Nach jedem Schalten ein Satz in den
Verlauf des Kunden oder den Laufzettel des Geräts: App, Fassung, wer es wollte, was danach geprüft
wurde.

## Entfernen

```
node .ara/tools/app.mjs --device <gerät> --app <id> --remove --confirm <id>
```

**Stufe 3, unumkehrbar.** Beide Container mit ihren Volumes, beide Stände, alle Freigaben, die
Schlüssel der App und ihre zwei Datenbanken fallen; ihre nächtlichen Sicherungen bleiben, ein
Administrator holt sie zurück, wie der Kontrakt unter `daten` sagt. Ohne ausgeschriebene Kennung
passiert nichts, und das Werkzeug sagt vorher, was fällt: sag es in denselben Worten und hol ein
ausdrückliches Ja.

## Auf ein Gerät ohne Arasul

```
node .ara/tools/app.mjs --device <gerät> --app <name> --compose --port 8080
```

Über SSH stellt Compose einen Webserver für die Oberfläche und das Backend auf, gebaut aus dem
Paket; die Ablage ist das SQLite des Backends, und das überlebt das nächste Einspielen nicht. **Sag
vorher, was fehlt**, in den Worten, die das Werkzeug ausgibt und in den Kopf der erzeugten Datei
schreibt: keine Anmeldung, kein Flow, keine Freigabe, ein Stand statt zwei, kein Schlüssel und damit
keine Schnittstelle von Arasul. Wer Adresse und Port erreicht, sieht die App: ein Weg zum Vorführen,
keiner für echte Daten. Stufe 2, mit Absicht, Ziel und Rückweg, der am Ende der Ausgabe steht. Der
Merker vermerkt es als `compose`, sonst sagte die Lage, die App sei nirgends hingegangen, während
sie am Gerät antwortet.

Ein Zertifikat, das sich nicht prüfen lässt, eine 401, ein Endpunkt, der im Kontrakt fehlt, eine
Schnittstelle woanders als SSH, gar keine Antwort: `.ara/knowledge/diagnostics.de.md`, „Wenn die
Aufrufe des Kits keine Antwort bekommen".
