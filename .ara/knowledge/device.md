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
   Ollama als Programm oder als Container, Hinweise auf Arasul,
4. fällt das Urteil und schreibt Befund und Urteil in die Akte, unter „Prüfungen",
5. merkt sich das Gerät in `.ara/state.json`,
6. nennt den nächsten Schritt.

Es liest nur. Eingriffe sind `--install` und `--deploy-key`, beide weiter unten, beide
nur auf Wunsch und nach Bestätigung.

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

**Ollama kann als Programm auf dem Gerät liegen oder in einem Container fahren.** Das
Werkzeug erkennt beides und sagt, was es gefunden hat: `present` für das Programm,
`container` mit dem Namen des Containers, `missing` für nichts davon. Auf einem Gerät mit
Arasul ist der Container der Normalfall, und dort wäre „fehlt" falsch: ein zweites Ollama
danebenzusetzen hieße, ein zweites Modell in denselben Speicher zu legen. Aufsetzen bietet
das Werkzeug deshalb nur an, wo wirklich nichts läuft.

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
  Internet, Firewall. Token hinterlegt? `node .ara/tools/secrets.mjs --show` sagt es, ohne
  den Wert zu zeigen. Rückfallplan festlegen: was passiert, wenn es nicht fertig wird.
  Zeit ehrlich schätzen.
- **1 Betriebssystem.** Nur, wenn das Gerät noch keins hat oder ein anderes braucht.
  Verfahren `.ara/knowledge/boot-and-flash.md`. Ein Datenträger wird nur nach
  ausdrücklichem Ja beschrieben.
- **2 Erstkontakt.** Hat `/device` schon erledigt: SSH steht, die Akte hat Adresse,
  Anmeldename, Port und Schlüsselname. Ab jetzt läuft jeder Befehl über
  `node .ara/tools/remote.mjs --device <gerät> --command "…"`.
- **3 Arasul installieren.** Ein Aufruf, siehe „Arasul installieren" weiter unten:
  `node .ara/tools/device.mjs --name <gerät> --install arasul`. Ausgabe mitlesen, bei
  Fehlern anhalten. Nachweis: der Kontrakt des Geräts lässt sich lesen und passt zum Kit,
  `node .ara/tools/app.mjs --device <gerät> --contract`.
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
Einrichtung, sondern für den Kit-Schlüssel und danach für `/maintain`.

## Arasul installieren

**Zwei Wege führen zu einem Gerät mit Arasul, und beide enden am selben Punkt:** einem
Gerät, dessen Kontrakt das Kit lesen kann, und einem Kit-Schlüssel in der Akte.

| Lage | Was zu tun ist |
| --- | --- |
| Das Gerät läuft schon (`arasul: found`) | Nur der Schlüssel fehlt: `--deploy-key` |
| Das Gerät ist unterstützt, aber leer | `--install arasul`, der Schlüssel kommt danach von selbst |

### Das Token

**Die Token-Frage stellt sich hier und sonst nirgends.** Beim Onboarding gibt es nichts
zu installieren, also braucht `/init` kein Token, und es fragt auch nicht danach.

Das Token kommt aus dem Partnerportal. **Jeder Partner bekommt dort fünf Download-Token
kostenlos**, weitere auf Nachfrage per Mail. Es ist eine Schranke vor dem Download, keine
Lizenzprüfung: am Gerät prüft Arasul kein Token, und das Kit trägt auch keines dorthin.
Wer also nach dem Preis fragt: das Token kostet nichts, die Lizenz regelt der Vertrag.

```
node .ara/tools/secrets.mjs --set ARASUL_TOKEN
```

Du liest es nie selbst aus und zeigst seinen Wert nie an.

### Der Ablauf

```
node .ara/tools/device.mjs --name <gerät> --install arasul
```

Das ist ein **Eingriff der Stufe 2**, und er dauert. Vorher Absicht, Ziel und Rückweg
nennen und bestätigen lassen. Das Werkzeug hält vorher an vier Stellen an, und jede ist
ein Nein und kein Vielleicht: keine Verbindung, kein unterstütztes Gerät, kein Docker,
kein Token. Dann geht es los:

1. **Der Installer wird geholt**, über `arasul.de/api/download` mit dem Token, und landet
   als Spiegel in `.ara/mirror/`, mit Stand und Quelle in `STATE.json`. **Der Spiegel
   entsteht genau hier und sonst nirgends.**
2. **Er wird an das Gerät geschoben**, über die schon geprüfte SSH-Verbindung, und dort
   ausgepackt. Das Token bleibt auf dem Rechner des Partners.
3. **Der Installer läuft auf dem Gerät.** Seine Ausgabe läuft durch, du liest mit. Bricht
   er ab, wird nichts schöngeredet: Ursache lesen, beheben, denselben Befehl noch einmal.
4. **Der Kit-Schlüssel wird angelegt**, siehe unten.

### Der Kit-Schlüssel

Damit rollt das Kit später Apps auf das Gerät: **kein SSH, kein Passwort, keine Sitzung,
nur ein Schlüssel mit dem Bereich `app:deploy`.** Er entsteht am Gerät, gehört dem
Administrator dort und ist von ihm jederzeit widerrufbar.

```
node .ara/tools/device.mjs --name <gerät> --deploy-key
```

Auf einem Gerät, das schon läuft, ist das der einzige Schritt. Nach `--install arasul`
passiert es von selbst.

**Der Klartext erscheint genau einmal.** Das Werkzeug legt ihn in die Geheimnis-Ablage
und schreibt nur den Namen des Eintrags in die Akte, unter `api_key_ref`. Er steht in
keiner Datei des Kits, in keinem Protokoll und **nie im Portal**: das Portal gibt
Download-Token aus, keine Geräteschlüssel. Ist er verloren, legst du einen neuen an und
lässt den alten am Gerät widerrufen, nachschlagen geht nicht.

### Der Nachweis

Installiert ist nicht abgenommen. Der erste Nachweis ist der Kontrakt:

```
node .ara/tools/app.mjs --device <gerät> --contract
```

Antwortet er, dann steht die Plattform, der Schlüssel gilt und das Kit passt zu diesem
Gerät. Was dann noch kommt, steht in `.ara/knowledge/deploy.md`.

**Antwortet er nicht, obwohl SSH steht**, liegt die Schnittstelle woanders als der Zugang:
hinter einem Tunnel, unter einem anderen Namen, auf einem anderen Port. Dann trägt die
Akte `api_base`, die Adresse mit Vorsatz, unter der die Schnittstelle wirklich antwortet.
Sie sticht `address`, bleibt in der Akte stehen und muss nicht bei jedem Aufruf mitgetippt
werden. `--base <url>` gibt es weiter, für den einen Versuch, der nicht in die Akte gehört.

## Nach dem Urteil: bald

Vorgemerkt. Zugang darf schon gehärtet werden (`.ara/knowledge/remote-access.md`),
Docker und Ollama dürfen aufgesetzt werden. Sobald der Spiegel ein Profil für die
Hardware führt, geht es bei Phase 0 weiter. Ein Profil im Katalog heißt noch nicht
erprobt, `.ara/knowledge/identify-device.md` sagt, wie du das liest und dem Menschen
ehrlich sagst.
