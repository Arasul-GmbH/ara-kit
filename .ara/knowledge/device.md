# Verfahren: /device

> **Wann brauchst du das?** Bei `/device`: ein Gerät anlegen, prüfen, beurteilen, und
> danach wissen, was als Nächstes kommt. Von der Akte bis zur Abnahme.

## Was `/device` tut

Ein Befehl, zwei Lagen. **Ohne Akte** legt er sie an und prüft das Gerät. **Mit Akte**
prüft er erneut und sagt, wo es steht. Beides macht dasselbe Werkzeug:

```
node .ara/tools/device.mjs --host <adresse> --user <name> --name <gerät>   erstes Mal
node .ara/tools/device.mjs --name <gerät>                                  jedes weitere Mal
node .ara/tools/device.mjs --name <gerät> --json                           für die Auswertung
```

Bei einem Kundengerät kommt `--customer <kunde>` dazu. Das Werkzeug:

1. legt die Akte `device.md` aus `.ara/templates/device.md` an, falls sie fehlt,
2. prüft die SSH-Verbindung mit Schlüssel, ohne Passwortabfrage,
3. lässt auf dem Gerät ein Leseskript laufen: Hardware, System, Speicher, Docker,
   Ollama, Hinweise auf Arasul,
4. fällt das Urteil und schreibt Befund und Urteil in die Akte, unter „Prüfungen",
5. merkt sich das Gerät in `.ara/state.json`,
6. nennt den nächsten Schritt.

Es liest nur. Der einzige Eingriff ist `--install`, siehe unten.

## Wo die Akte liegt

| Gerät | Ort | Aufruf |
| --- | --- | --- |
| ohne Kunden, beide Zweige | `devices/<gerät>/` | `--name <gerät>` |
| Kundengerät, nur Partner | `customers/<kunde>/devices/<gerät>/` | `--customer <kunde> --name <gerät>` |

Ein Unternehmen hat nur den ersten Fall. Ein Partner hat beide: die eigenen Geräte
(Vorführung, Übung, eigener Betrieb) liegen unter `devices/`, die der Kunden unter dem
Kunden. Kein Scheinkunde für ein eigenes Gerät, das verfälscht jede Auswertung.

**Gerätename:** klein, Ziffern, Bindestriche. Bei Kundengeräten nach Standort oder Rolle
(`zentrale`, `werk2`, `praxis-eg`), nicht nach Modell: das Modell steht in der Akte und
kann sich ändern, der Standort bleibt. Bei Geräten ohne Kunden ist das Modell ein guter
Name (`orin`, `dgx-spark`), weil der Standort sie nicht unterscheidet.

## Das Urteil

Drei Antworten, und jede hat eine Folge:

| Urteil | Woran erkannt | Was folgt |
| --- | --- | --- |
| **unterstützt** | Jetson Orin oder Jetson Thor | Arasul kann darauf laufen. Weiter unten bei „Nach dem Urteil" |
| **bald** | DGX Spark, andere Rechner mit NVIDIA-Grafik | Angekündigt. Vorgemerkt in der Akte, weiter, sobald der Spiegel ein Profil dafür führt |
| **nicht unterstützt, wir merken es vor** | alles andere, etwa ein Mac oder ein Rechner ohne NVIDIA-Grafik | Vorgemerkt in der Akte mit Datum. Ohne Arasul endet es hier |

Die Regel steht in `.ara/tools/lib/device.mjs`, und sie ist eine Regel des Kits, kein
Produktwert. Was auf einem unterstützten Gerät gilt (Profil, Modell, Engine, Speicher),
steht weiter nur im Spiegel: `.ara/knowledge/identify-device.md`.

**Vormerken** heißt: `verdict` und `noted_on` stehen in der Akte. Damit bleibt sichtbar,
welche Geräte nachgefragt wurden, und der Mensch kann das ans Produktteam geben.

**Ohne Arasul endet es hier.** Das Werkzeug sagt in einem Satz, was Arasul brächte:
Anmeldung, Teststand und Live-Schaltung für Apps, Freigaben, Flows, Sicherung und
Wartung. Das ist die ganze Ansage. Kein Verkaufsgespräch hinterher, es sei denn, der
Mensch fängt eins an.

## Wenn SSH nicht steht

Das Werkzeug legt die Akte trotzdem an und trägt `ssh: refused` ein. Dann gilt der
Reihe nach:

1. `node .ara/tools/find-device.mjs --host <adresse>`: antwortet dort überhaupt etwas?
2. Schlüssel ausrollen, Verfahren `.ara/knowledge/remote-access.md`. Der private
   Schlüssel bleibt in `~/.ssh`, im Kit steht nur sein Name.
3. Noch einmal `node .ara/tools/device.mjs --name <gerät>`.

Ist das Ziel dieser Rechner selbst (`localhost`) und SSH aus, prüft das Werkzeug lokal
und schreibt `ssh: local` in die Akte. Das reicht für die Akte, nicht für Fernzugriff.

## Docker und Ollama

Das Werkzeug erkennt beide und sagt, ob sie da sind. Aufsetzen tut es nur auf Wunsch:

```
node .ara/tools/device.mjs --name <gerät> --install docker,ollama
```

Das ist ein Eingriff der Stufe 2 (`.ara/knowledge/security.md`): vorher Absicht, Ziel
und Rückweg nennen und bestätigen lassen. Es läuft nur auf Linux, braucht Root am Gerät
und nutzt die Installationswege der Hersteller. Auf einem Mac bleibt es Handarbeit, das
sagt das Werkzeug selbst. Nach der Installation prüft es erneut, damit die Akte den
Zustand trägt, nicht die Absicht.

Auf einem Gerät, das nicht unterstützt ist, sind Docker und Ollama trotzdem sinnvoll:
damit lassen sich Apps bauen und Modelle ausprobieren. Was fehlt, ist Arasul.

## Nach dem Urteil: unterstützt

Ab hier gilt die Schleife jeder Einrichtung: **Vorbedingung prüfen, tun, nachweisen, in
den Laufzettel schreiben.** Das Gedächtnis ist der Laufzettel, nicht das Gespräch, weil
eine Einrichtung Stunden dauert und Sitzungen überlebt.

```
node .ara/tools/runsheet.mjs --create --device <gerät>            anlegen
node .ara/tools/runsheet.mjs --device <gerät> --show               Stand lesen
node .ara/tools/runsheet.mjs --device <gerät> --phase <n> --state <done|paused> \
  --entry "Was getan wurde. Nachweis: was du geprüft hast und was dabei herauskam."
```

Bei Kundengeräten mit `--customer <kunde>`. Ein Eintrag ohne Nachweis ist wertlos.
„SSH gehärtet" sagt nichts. „SSH gehärtet, Anmeldung mit Passwort wird jetzt abgelehnt,
mit Schlüssel geht sie" ist ein Nachweis. Klemmt etwas: `--state paused`, sagen, was du
siehst, nicht über den Fehler hinweg weiterprobieren.

Die Phasen des Laufzettels und was in jeder gilt:

- **0 Vorbereitung.** Netzfrage klären mit dem, der das Netz betreut: feste Adresse,
  Internet, Firewall. Spiegel holen (`node .ara/tools/mirror.mjs`), Lizenztoken prüfen.
  Rückfallplan festlegen: was passiert, wenn es nicht fertig wird. Zeit ehrlich schätzen.
- **1 Betriebssystem.** Nur, wenn das Gerät noch keins hat oder ein anderes braucht.
  Verfahren `.ara/knowledge/boot-and-flash.md`. Ein Datenträger wird nur nach
  ausdrücklichem Ja beschrieben.
- **2 Erstkontakt.** Hat `/device` schon erledigt: SSH steht, die Akte hat Adresse,
  Anmeldename, Port und Schlüsselname. Ab jetzt läuft jeder Befehl über
  `node .ara/tools/remote.mjs --device <gerät> --command "…"`.
- **3 Arasul installieren.** Den Installationsweg im Spiegel nachlesen, nicht aus dem
  Gedächtnis. Voraussetzungen prüfen, Ausgabe mitlesen, bei Fehlern anhalten. Das Token
  gehört nicht in die Befehlszeile. Die Installation mit Token über `/device` selbst
  kommt in einer späteren Kit-Fassung, bis dahin gilt das Verfahren im Spiegel.
  Nachweis: die Dienste melden sich gesund, wie man das abfragt, steht im Produkt.
- **4 Nachbereitung.** Erst prüfen, ob etwas fehlt, das Produkt erledigt manches
  selbst. Modell vorhanden, Namensauflösung, Zugang härten (erst wenn die
  Schlüsselanmeldung nachweislich läuft, und die laufende Sitzung offen halten),
  Netzabsicherung, Fernzugriff nach `.ara/knowledge/remote-access.md`. Ändert sich Port
  oder Anmeldename: sofort in `device.md` nachziehen.
- **5 Nachweis.** Prüfliste in `.ara/knowledge/handover.md`. Dienste gesund auch nach
  Neustart, eine echte Anfrage liefert eine sinnvolle Antwort, ein Testdokument wird
  wiedergefunden, Fernzugriff von außerhalb des Netzes. Der letzte Punkt wird am
  häufigsten übersprungen, Mobilfunk reicht zum Prüfen.
- **6 Abnahme.** `handover.md` aus dem Laufzettel, Kurzanleitung aus
  `.ara/templates/quickstart.md`, Zugänge übergeben, Not-Aus zeigen. `status: live` und
  `accepted_on` in `device.md`, Laufzettel auf `done`. Beim eigenen Gerät gibt es
  niemanden, dem übergeben wird: dann bleiben `device.md`, Laufzettel und der Nachweis
  aus Phase 5.

Trägt das Gerät Arasul schon, wenn `/device` es findet, ist das kein Fall für die
Einrichtung, sondern für `/maintain`.

## Nach dem Urteil: bald

Vorgemerkt. Zugang darf schon gehärtet werden (`.ara/knowledge/remote-access.md`),
Docker und Ollama dürfen aufgesetzt werden. Sobald der Spiegel ein Profil für die
Hardware führt, geht es bei Phase 0 weiter. Ein Profil im Katalog heißt noch nicht
erprobt, `.ara/knowledge/identify-device.md` sagt, wie du das liest und dem Menschen
ehrlich sagst.
