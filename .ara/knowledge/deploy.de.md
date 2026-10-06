# Verfahren: Apps auf ein Gerät bringen

> **Wann brauchst du das?** Wenn eine App auf einem Gerät landen soll: bauen, prüfen, einspielen,
> freigeben, live schalten und zurück, entfernen, oder auf ein Gerät ohne Arasul bringen. Was die
> App dort benutzt: `.ara/knowledge/platform-services.de.md`.

## Der Kontrakt ist die Quelle, nicht dieses Blatt

```
node .ara/tools/app.mjs --device <gerät> --contract
```

Die **einzige** Quelle für das Schema von `app.json`, die Regeln, die kein Schema trägt, den Kopf
einer Flow-Datei, die Namen der Kopfzeilen, die Grenzen eines Pakets, die Pfade unter `/apps/` und
die Endpunkte mit ihren Bereichen. **Schreib nichts davon ab.** Ohne den Kit-Schlüssel geht kein
Aufruf: `api_key_ref` in der Akte des Geräts, siehe `.ara/knowledge/device.de.md`, „Der
Kit-Schlüssel".

Das Kit kennt die höchste **Kontraktversion**, die es versteht:

- **Dieselbe oder eine kleinere Zahl.** Es geht weiter und ruft nur, was der Kontrakt dieses Geräts
  nennt.
- **Eine größere Zahl.** Das Kit hält an und nennt, was es nicht kennt. Der Ausweg ist
  `node .ara/tools/update.mjs` oder `/init`: **der Fehler liegt nicht in der App**.
- **Gar keine.** Das Gerät ist älter als der Kontrakt.

Eingespielt wird nur in den ersten beiden Fällen.

## Das Paket bauen

```
node .ara/tools/app.mjs --app <name> --build
```

Das Paket entsteht unter `build/`, ohne Pläne, README und Bau; ein Ordner mit eigenem Bau wird
gebaut (vorher die Typen geprüft), der Rest wandert, wie er ist. Ein Bau, der älter ist als der
Quelltext, wird nicht eingespielt.

## Ein Paket prüfen, bevor es fliegt

```
node .ara/tools/app.mjs --device <gerät> --app <name> --check
```

`app.json` liegt an der Wurzel des Pakets, daneben die Ordner, die das Manifest nennt. **Flows sind
eine Lieferung**: ein versprochener Flow-Ordner ist da und bringt eine Datei je Flow. Das Werkzeug
hält das Manifest gegen das Schema **dieses** Geräts, nennt jede Abweichung und was es nicht prüfen
konnte, prüft, dass die Oberfläche ein **Bau** ist (`package.json`, `src/` oder `tsconfig.json` darin
wären eine leere Seite), und sagt das Ergebnis zuerst und zuletzt, in höchstens 30 Zeilen.
`--verbose` gibt dazu `arasul.json` und Wort für Wort **die Regeln, die kein Schema trägt**, die du
selbst liest: „mindestens eines von frontend und backend",
„mit einem Backend ein Port": ein Manifest, das eine davon bricht, lehnt das Gerät ab, auch wenn das
Schema hält. Und **was der Kontrakt über das Paket sagt**: Packen, was draußen bleibt, Größe, Flows.

## Einspielen, und warum es noch nicht sichtbar ist

```
node .ara/tools/app.mjs --device <gerät> --app <name> --deploy --aenderungstext "<text>"
```

**Ein paar Sätze, was neu ist**, gehen mit, wenn der Kontrakt des Geräts das Feld `aenderungstext`
nennt: 1 bis 1000 Zeichen, neben dem Paket und nicht in der `app.json`. Ohne sie hält das Kit an;
frag in den Worten des Menschen.

Das Werkzeug prüft, packt den **Inhalt** des Ordners, vergleicht mit der Größengrenze und schickt;
eine Ablehnung kommt mit dem Grund des Geräts, lies ihn, statt zu wiederholen. Das Gerät baut das
Backend selbst, Warten ist kein Fehler. **Ein Deploy rollt immer in den Teststand.**

**Eingespielt ist nicht sichtbar, und das sagst du vor dem Einspielen.** Ein Mensch sieht die App
erst, wenn sie für ihn freigegeben ist; ohne das antwortet die Adresse des Teststands mit 403, die
fehlende Freigabe und nicht die App. Hinterher gesagt, hält ein Mensch das Kit für kaputt; vorher
gesagt, wartet er. Der Schlüssel des Kits kann nicht freigeben, er trägt nur `app:deploy`; das Kit
gibt mit der Sitzung eines Administrators frei:

```
node .ara/tools/app.mjs --device <gerät> --app <id> --share <konto>     Teststand, die Vorgabe
node .ara/tools/app.mjs --device <gerät> --app <id> --unshare <konto>
```

Die Sitzung kommt aus dem Startpasswort oder aus einem Eintrag, der schon liegt: `--password-ref
<NAME> --login-user <name>`. Weg und Felder liest es aus der API-Referenz, das Kit kennt keine.
**Eine Freigabe gilt einem Stand**: wer allein für live freigegeben ist, sieht eine leere Übersicht;
`--stand live` nur, wenn das gemeint ist. Ohne Sitzung gibt ein Mensch in der Oberfläche frei, die
Seite steht im Admin-Handbuch: `node .ara/tools/mirror.mjs --docs --device <gerät>`.

## Live schalten und zurück

```
node .ara/tools/app.mjs --device <gerät> --app <id> --status   welche Fassung wo steht
node .ara/tools/app.mjs --device <gerät> --app <id> --live     Teststand wird live
node .ara/tools/app.mjs --device <gerät> --app <id> --back     die Fassung davor
```

**Live schaltet ein Mensch**, Stufe 2: frag vorher, ab dann arbeiten Leute damit. **Test und live
haben je eine eigene Datenbank**: die Fassung geht mit, die Daten nicht. Live beginnt leer und
behält seine eigenen über jede Fassung und `--back`; sag das vor dem ersten Schalten, und plan, was
live von Anfang an da sein muss, Mandanten etwa. `--back` ist ein **Tausch**: ein zweites `--back`
steht wieder am Anfang. Nach jedem Schalten ein Satz in den Verlauf des Kunden oder den Laufzettel
des Geräts: App, Fassung, wer es wollte, was danach geprüft wurde.

**Das Gerät sichert live vorher und fällt selbst zurück.** Kommt die neue Fassung nicht hoch, meist
eine Änderung der Datenbankstruktur, die beim Start scheitert, stellt es Fassung **und** Daten von
vorher wieder her und antwortet `LIVE_ZURUECKGESCHALTET`; der Teststand bleibt unberührt. Eine
gescheiterte Strukturänderung muss den Prozess darum mit einem Exit-Code ungleich 0 beenden, nie
halb weiterlaufen. Das Werkzeug gibt den Hilfesatz des Geräts und die letzten Zeilen des Containers
aus: lies sie, behebe es im Teststand, schalte erneut. Die genaue Regel: `--contract`, `daten`.

## Wenn die App im Teststand nicht läuft

Eine leere Seite, ein 502, ein Bau, der scheitert: der Grund steht am **Ende** der Ausgabe, und das
Werkzeug gibt dieses Ende aus. Darüber hinaus liest du den Container der App am Gerät, nur lesend:
`node .ara/tools/remote.mjs --device <gerät> --command "docker ps -a --filter name=<id>"` nennt
ihn, `--command "docker logs --tail 60 <name>"` zeigt seine letzten Zeilen. Die Vorlage schreibt
beim Start ihre Lage dorthin, und die Route `lage` der App sagt dasselbe.

## Entfernen

```
node .ara/tools/app.mjs --device <gerät> --app <id> --remove --confirm <id>
```

**Stufe 3, unumkehrbar.** Beide Container mit ihren Volumes, beide Stände, alle Freigaben, die
Schlüssel der App und ihre zwei Datenbanken fallen; ihre nächtlichen Sicherungen bleiben, siehe
`daten` im Kontrakt. Das Werkzeug sagt vorher, was fällt: sag es in denselben Worten und hol ein
ausdrückliches Ja.

## Auf ein Gerät ohne Arasul

```
node .ara/tools/app.mjs --device <gerät> --app <name> --compose --port 8080
```

Über SSH stellt Compose einen Webserver für die Oberfläche und das Backend auf, gebaut aus dem
Paket; die Ablage ist das SQLite des Backends, und das überlebt das nächste Einspielen nicht. **Sag
vorher, was fehlt**, in den Worten, die das Werkzeug ausgibt: keine Anmeldung, kein Flow, keine
Freigabe, ein Stand, keine Schnittstelle von Arasul. Wer Adresse und Port erreicht, sieht die App:
ein Weg zum Vorführen, keiner für echte Daten. Stufe 2, der Rückweg steht am Ende der Ausgabe.

Ein Zertifikat, das sich nicht prüfen lässt, eine 401, ein Endpunkt, der im Kontrakt fehlt, gar
keine Antwort: `.ara/knowledge/diagnostics.de.md`, „Wenn die Aufrufe des Kits keine Antwort
bekommen".
