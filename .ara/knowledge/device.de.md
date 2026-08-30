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
4. erkennt daraus das Gerät, ohne Vorwissen, und sagt, wie gut das belegt ist,
5. fällt das Urteil und schreibt Befund, Profil und Urteil in die Akte, unter „Prüfungen",
6. liest den Kontrakt des Geräts, wenn dort eine Schnittstelle zu erwarten ist, und sagt,
   ob dieses Kit ihn versteht,
7. merkt sich das Gerät in `.ara/state.json`,
8. nennt den nächsten Schritt.

**Schritt 6 ist der, der eine Suche an der falschen Stelle erspart.** Der Kontrakt trägt
die Zahl, auf der das Gerät steht, und das Kit kennt die höchste, die es versteht. Ist das
Gerät weiter, sagt `/device` es beim ersten Kontakt und nennt den einen Weg heraus,
`node .ara/tools/update.mjs`. Bis 0.19.1 kam das erst beim Einspielen heraus, als „Nichts
eingespielt", und am 30.08.2026 suchte ein Partner es drei Stunden in seiner App. Die Zahl
geht als `contract` in die Akte, damit `/init` sie ohne das Gerät wiederfindet. Was nicht
zu lesen war, bleibt ungemessen und wird als solches genannt: eine Plattform, die gerade
hochkommt, sagt nichts über ihre Fassung.

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

## Erkennung, und wie gut sie belegt ist

**Dem Werkzeug muss über das Gerät nichts gesagt werden.** Es liest, was das Gerät über
sich sagt, und gibt fünf Dinge aus, jedes mit der Stelle, die es hergibt: ob es erreichbar
ist, den Hersteller (`/sys/class/dmi/id/sys_vendor`), das Modell
(`/proc/device-tree/model` oder DMI), die Architektur und das laufende System.

Daraus wird das **Geräteprofil**, und das gibt das Werkzeug als eigenen Abschnitt aus:

- **Das Kit-Profil.** Ein Blatt je Gerät unter `.ara/knowledge/devices/`, und das Blatt
  sagt, von wann es ist und woher seine Kenntnis stammt. Das ist eine Aussage über
  Hardware, nicht über das Produkt, und sie steht geschrieben: zur Laufzeit wird nichts
  recherchiert. Passt kein Blatt, sagt das Werkzeug das, statt etwas Ähnliches
  hinzustellen.
- **Das Katalogprofil.** Das Profil, das das Produkt für diese Hardware führt. Es wird
  nur genannt, wenn der Spiegel es wirklich hat, und nur, wenn der Speicher zur Fassung
  passt: `orin-64` auf einem Orin mit 32 GB wäre eine Zusage über Speicher, die dieses
  Gerät nicht hält.
- **Der Verifikationsstand.** Das Feld `verification` aus dem Katalog, aus dem Spiegel
  gelesen. `live` heißt an echter Hardware verifiziert, `emulation` heißt nur unter
  Emulation geprüft, `follow-up` heißt nach Herstellerdoku gebaut und an keinem Gerät
  erprobt.

**Diese Zeile steht vor jedem Eingriff, nicht danach.** Wer auf einem Gerät installiert,
soll vorher gelesen haben, worauf sich das Kit stützt und wie weit das trägt. Ohne Spiegel
gibt es keine Stufe, und dann sagt das Werkzeug, dass es sie nicht lesen kann. Es rät
keine.

Über ein Gerät, das nicht dasteht, lässt sich auch reden:

```
node .ara/tools/device.mjs --name thor --probe <datei mit befunden>
```

Das ist der Trockenlauf. Dieselbe Erkennung, dasselbe Profil, derselbe
Verifikationsstand, Befunde aus einer Datei statt von einem Gerät. **Er schreibt nichts
und verändert nichts**, und er verweigert `--install`, `--deploy-key` und
`--admin-login`. So findet ein Partner heraus, was das Kit über ein Gerät sagen würde,
bevor er es kauft.

## Das Urteil

Drei Antworten, und jede hat eine Folge:

| Urteil | Woran erkannt | Was folgt |
| --- | --- | --- |
| **unterstützt** | ein Blatt unter `.ara/knowledge/devices/`, dessen `support` das sagt | Arasul kann darauf laufen. Weiter unten bei „Nach dem Urteil" |
| **bald** | ein Blatt, das `soon` sagt, oder NVIDIA-Grafik ohne Blatt | Angekündigt. Vorgemerkt in der Akte, weiter, sobald der Spiegel ein Profil dafür führt |
| **nicht unterstützt, wir merken es vor** | alles andere, etwa ein Mac oder ein Rechner ohne NVIDIA-Grafik | Vorgemerkt in der Akte mit Datum. Ohne Arasul endet es hier |

Welche Hardware Arasul trägt, steht in den Blättern und nicht im Quelltext, und es ist
eine Aussage des Kits, kein Produktwert. Ein neues Gerät ist ein neues Blatt. Was auf
einem unterstützten Gerät gilt (Modell, Engine, Speicher), steht weiter nur im Spiegel:
`.ara/knowledge/identify-device.de.md`.

**Vormerken** heißt: `verdict` und `noted_on` stehen in der Akte. Damit bleibt sichtbar,
welche Geräte nachgefragt wurden, und der Mensch kann das ans Produktteam geben.

**Ohne Arasul endet es hier, und es endet hilfreich.** Das Werkzeug schließt mit drei
Dingen, und keines davon ist ein Verkaufsgespräch: was Arasul brächte, in einem Satz
(Anmeldung, Teststand und Live-Schaltung für Apps, Freigaben, Flows, Sicherung und
Wartung), welche Geräte es heute tragen, nach den Blättern, und ein ruhiger Satz zur
Lizenz. Das Kit steht unter der Apache-Lizenz 2.0 und bleibt ohne Arasul brauchbar; was
Arasul kostet, steht unten unter „Das Token", und das Werkzeug sagt es in einem Satz.

**Fragen zu Arasul brauchen kein Gerät.** Wer das Kit auf seinem Rechner ausprobiert und
dann fragt, was das eigentlich ist, bekommt eine Antwort, aus
`.ara/knowledge/sales.de.md` und `.ara/knowledge/extensions.de.md`, und ein ehrliches
„das weiß ich nicht" dort, wo die Antwort ein Produktwert wäre, an den das Kit nicht
herankommt. Sag nicht mehr, als gefragt war, es sei denn, der Mensch fängt an.

## Wenn SSH nicht steht

Das Werkzeug legt die Akte trotzdem an und trägt `ssh: refused` ein. Dann gilt der
Reihe nach:

1. `node .ara/tools/find-device.mjs --host <adresse>`: antwortet dort überhaupt etwas?
2. Schlüssel ausrollen, Verfahren `.ara/knowledge/remote-access.de.md`. Der private
   Schlüssel bleibt in `~/.ssh`, im Kit steht nur sein Name.
3. Noch einmal `node .ara/tools/device.mjs --name <gerät>`.

Ist das Ziel dieser Rechner selbst (`localhost`) und SSH aus, prüft das Werkzeug lokal
und schreibt `ssh: local` in die Akte. Das reicht für die Akte, nicht für Fernzugriff.

## Docker und Ollama

Das Werkzeug erkennt beide und sagt, ob sie da sind. Aufsetzen tut es nur auf Wunsch:

```
node .ara/tools/device.mjs --name <gerät> --install docker,ollama
```

Das ist ein Eingriff der Stufe 2 (`.ara/knowledge/security.de.md`): vorher Absicht, Ziel
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
  Verfahren `.ara/knowledge/boot-and-flash.de.md`, bei einem Jetson AGX Orin
  `.ara/knowledge/flash-orin.de.md` mit Prüfschritt je Abschnitt. Ein Datenträger wird nur
  nach ausdrücklichem Ja beschrieben.
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
  Netzabsicherung, Fernzugriff nach `.ara/knowledge/remote-access.de.md`. Ändert sich Port
  oder Anmeldename: sofort in `device.md` nachziehen.
- **5 Nachweis.** Prüfliste in `.ara/knowledge/handover.de.md`. Dienste gesund auch nach
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

**Ab dem laufenden Linux arbeitet das Kit selbst**, und das Stück nach der Installation ist
die Selbstheilung: läuft etwas von Arasul nicht mehr, startet
`node .ara/tools/heal.mjs --device <gerät>` es wieder, nur im Verzeichnisbaum von Arasul, nie
am Bootloader, mit jedem Schritt in der Geräteakte und einem Weg zurück je Schritt
(`--undo <id>`). Es fragt erst, wenn es aufgibt. Verfahren:
`.ara/knowledge/self-healing.de.md`.

## Arasul installieren

**Zwei Wege führen zu einem Gerät mit Arasul, und beide enden am selben Punkt:** einem
Gerät, dessen Kontrakt das Kit lesen kann, und einem Kit-Schlüssel in der Akte.

| Lage | Was zu tun ist |
| --- | --- |
| Das Gerät läuft schon (`arasul: running`) | Nur der Schlüssel fehlt: `--deploy-key` |
| Das Gerät ist unterstützt, aber leer | `--install arasul`, der Schlüssel kommt danach von selbst |

### Das Token

**Die Token-Frage stellt sich hier und sonst nirgends.** Beim Onboarding gibt es nichts
zu installieren, also braucht `/init` kein Token, und es fragt auch nicht danach. **Einen
Befehl zum Kaufen gibt es nicht.** Keinen, der kaufen heißt, keinen, der lizenz heißt. Der Weg hängt an
`/device`, an der Stelle, an der das Urteil „unterstützt" fällt, und das Werkzeug geht ihn
von selbst.

Was gilt, Stand 2026-08-28, und was du sagen darfst:

- **Konto und Token kommen von <https://www.arasul.de/kaufen>.** Das ist die eine Adresse.
- **Ein Konto ist kostenlos und bringt genau einen kostenlosen Geräte-Token** für den
  persönlichen Gebrauch. Jede weitere Installation wird gekauft. Kommerzieller Einsatz
  braucht die Lizenz, 3.000 Euro netto.
- Der Token hat die Form `ara_` und 32 Hexzeichen dahinter. Er ist eine Schranke vor dem
  Download, keine Lizenzprüfung: am Gerät prüft Arasul kein Token, und das Kit trägt auch
  keines dorthin.

**Wie es läuft, im Interview-Werkzeug, nie im Fließtext:**

1. `/device` liefert das Urteil **unterstützt**, nichts von Arasul läuft, kein Token ist
   hinterlegt. Das Werkzeug sagt das dann unter „Nächste Schritte", mit dem Link. Du fragst
   über das Interview-Werkzeug, ob Arasul auf diesem Gerät installiert werden soll, mit dem
   Link in der Frage und einem Satz dazu, was das Konto bringt und was ein weiteres Gerät
   kostet. Optionen: ja, nein, und die offene.
2. **Ja:** der Mensch öffnet die Seite, legt das Konto an, kopiert den Token und fügt ihn
   hier ein. Mehr muss er nicht tun. Du holst den Token nicht, du öffnest die Seite nicht
   für ihn.
3. **Der eingefügte Token geht über die Leitung hinein, nie als Argument**, und du
   wiederholst ihn nie im Text:

   ```
   printf '%s' "$TOKEN" | node .ara/tools/device.mjs --licence --store
   ```

   Das Werkzeug prüft die Form, fragt das Portal (`GET https://www.arasul.de/api/download?token=<token>&pruefen=1`,
   ohne das Artefakt zu holen), legt ihn unter `ARASUL_TOKEN` in der gewählten Ablage ab und
   sagt, auf welche Akten eine Installation passt: unterstützt, und Arasul läuft dort nicht.
   **Eine Akte:** es nennt den Aufruf. **Mehrere:** du fragst über das Interview-Werkzeug,
   welches Gerät es sein soll. **Keine:** erst `/device <name>`. Ein abgelehnter Token kommt
   mit der Begründung des Portals zurück, und hinterlegt wird nichts.
4. Danach `--install arasul` auf der gewählten Akte, als Eingriff der Stufe 2, weiter unten.
5. **Nein:** es bleibt in der Akte vermerkt, sonst passiert nichts, und du fragst in derselben
   Sitzung kein zweites Mal.

**Fragt jemand von sich aus nach dem Kauf, einer Lizenz oder einem Token**, in beliebigen
Worten und ohne Gerät im Satz: derselbe Weg, und er braucht dafür keinen Befehl.

```
node .ara/tools/device.mjs --licence
```

Das sagt, ob ein Token hinterlegt ist, zeigt den Link und die Sätze von oben und zählt auf,
auf welche Akten eine Installation passen würde. Von dort ist es Schritt 1: über das
Interview-Werkzeug fragen, auf den Token warten, `--licence --store`, dann die Frage nach
dem Gerät, wenn es mehrere gibt.

Du liest das Token nie selbst aus und zeigst seinen Wert nie an. `node .ara/tools/secrets.mjs
--show` sagt, ob eines hinterlegt ist, ohne den Wert.

### Der Ablauf

```
node .ara/tools/device.mjs --name <gerät> --install arasul
node .ara/tools/device.mjs --name <gerät> --install arasul --net-name werk2
```

Das ist ein **Eingriff der Stufe 2**, und er dauert. Vorher Absicht, Ziel und Rückweg
nennen und bestätigen lassen. Das Werkzeug hält vorher an fünf Stellen an, und jede ist
ein Nein und kein Vielleicht: keine Verbindung, kein unterstütztes Gerät, eine laufende
Plattform, kein Docker, kein Token. Dann geht es los:

1. **Der Installer wird geholt**, über `www.arasul.de/api/download` mit dem Token, und landet
   als Spiegel in `.ara/mirror/`, mit Stand und Quelle in `STATE.json`. **Der Spiegel
   entsteht genau hier und sonst nirgends.**
2. **Er wird an das Gerät geschoben**, über die schon geprüfte SSH-Verbindung, nach
   `$HOME/arasul-<fassung>`, und dort ausgepackt. Das Token bleibt auf dem Rechner des
   Partners.
3. **Der Installer läuft auf dem Gerät.** Wie er heißt, sagt das Artefakt selbst in
   `arasul-release.json`; das Kit liest es dort und rät nicht, und es liest dort auch die
   Fassung. Gerufen wird er mit Startpasswort und Netzname, denn **nur dabei entstehen
   Netzname, Fassung, Startpasswort und die Erstausgabe am Gerät**. Seine Ausgabe läuft
   über den Bildschirm, du liest mit, und das Kit liest mit: es maskiert dabei, was wie
   ein Schlüssel oder ein Passwort aussieht. Bricht er ab, wird nichts schöngeredet:
   Ursache lesen, beheben, denselben Befehl noch einmal.
4. **Der Kit-Schlüssel wird angelegt**, siehe unten.

**`tls: selfsigned` trägt die Akte danach von selbst.** Ein frisch installiertes Gerät
stellt sein Zertifikat aus einer eigenen Geräte-CA aus. Ohne diesen Eintrag scheitert der
erste Aufruf gegen die Schnittstelle an `SELF_SIGNED_CERT_IN_CHAIN`, und zwar nach einer
Installation, die das Kit selbst gemacht hat. Bekommt das Gerät später ein Zertifikat, das
sich prüfen lässt, nimmst du den Eintrag von Hand wieder heraus.

**Das Startpasswort würfelt das Kit und legt es sofort in die Geheimnis-Ablage**, unter
dem Namen, den die Akte in `start_password_ref` trägt. Es steht in keinem Protokoll, in
keiner Ausgabe und in keiner Datei des Kits. Am Gerät steht es zusätzlich in der
Erstausgabe, die der Installer schreibt: das ist die Fassung, die dem Administrator des
Geräts gehört. Wer ein eigenes vergeben will, legt es vorher selbst ab:

```
printf '%s' "<passwort>" | node .ara/tools/secrets.mjs --set <eintrag>
```

**Der Netzname** ist ohne Angabe der Name der Akte. `--net-name <name>` setzt einen
anderen. Er landet in `net_name` in der Geräteakte.

### Was der Installer nicht konnte

Der Installer erledigt nicht alles, und er sagt das mitten in mehreren hundert Zeilen. Das
Kit liest seine Ausgabe mit, sammelt diese Zeilen und legt sie am Ende noch einmal hin,
unter **„Was der Installer nicht konnte"**, dazu in die Akte unter Prüfungen.

**„Nicht kritisch" sagt der Installer über seinen eigenen Lauf, nicht über das Gerät beim
Kunden.** Eine fehlgeschlagene SSH-Härtung und eine nicht eingerichtete Firewall sind für
den Installer eine Randnotiz und für ein Gerät im fremden Netz eine offene Tür. Geh die
Liste durch, bevor das Gerät ausgeliefert wird: Zugang härten nach
`.ara/knowledge/remote-access.de.md`, alles andere am Gerät mit Root-Rechten. Was du geholt
hast und was offen bleibt, schreibst du in den Laufzettel.

### Reste, aber nichts läuft

Die Spurensuche kennt drei Antworten, und der Unterschied entscheidet, was als Nächstes
geht:

| `arasul:` in der Akte | Woran erkannt | Was folgt |
| --- | --- | --- |
| `running` | ein Container der Plattform läuft | kein Aufsetzen mehr, das wäre ein Update. Fehlt nur der Schlüssel: `--deploy-key` |
| `traces` | Ordner oder Dienste da, aber nichts läuft | Installieren geht, ausdrücklich: `--install arasul --despite-traces` |
| `none` | nichts gefunden | der normale Weg |

`traces` ist der Zustand nach einem abgebrochenen Versuch oder nach einem Werksreset, bei
dem etwas stehen geblieben ist. **Sieh vorher nach, was da liegt** (`node
.ara/tools/remote.mjs --device <gerät> --command "ls -la ~"`), sag dem Menschen, was du
gefunden hast, und lass dir das Darüberhinweg bestätigen. Eine Installation über Reste
kann auf Vorhandenes treffen, und das ist kein Fall für ein stilles Ja.

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

**Wer einen anlegt, lässt einen liegen.** Ein Gerät sammelt Kit-Schlüssel: jeder Lauf mit
`--deploy-key` legt einen dazu, und am 29.08.2026 lagen acht davon auf einem Orin, drei mit
demselben Namen. Was dort liegt und welcher davon deiner ist:

```
node .ara/tools/device.mjs --name <gerät> --keys
```

Die Liste kommt vom Gerät, Zeile für Zeile so, wie es sie schreibt. Das Kit setzt eine
Marke dazu: der Schlüssel, dessen Präfix zu dem Wert in deiner Ablage passt, ist deiner.
Namen wiederholen sich, Präfixe nicht.

**Widerrufen gilt dem eigenen Schlüssel und nur ihm:**

```
node .ara/tools/device.mjs --name <gerät> --revoke-key
```

Das ist ein Eingriff der Stufe 2, vorher fragen. Widerrufen wird genau der eine Schlüssel,
mit dem das Kit gearbeitet hat, der Eintrag kommt aus der Ablage heraus und `api_key_ref`
in der Akte wird leer: ein Wert, der am Gerät nicht mehr gilt, ist kein Geheimnis, sondern
ein toter Zugang, und der nächste Aufruf damit wäre eine 401, deren Grund niemand sieht.
Danach rollt das Kit nichts mehr auf dieses Gerät, bis `--deploy-key` einen neuen anlegt.
Einen fremden Schlüssel fasst das Kit nie an; wer das will, tut es am Gerät, als der
Administrator, dem er gehört.

### Der Nachweis

Installiert ist nicht abgenommen. Der erste Nachweis ist der Kontrakt:

```
node .ara/tools/app.mjs --device <gerät> --contract
```

Antwortet er, dann steht die Plattform, der Schlüssel gilt und das Kit passt zu diesem
Gerät. Wie ein fertiges Paket dorthin kommt, steht in `.ara/knowledge/deploy.de.md`; wie aus
einem Kundenwunsch überhaupt eine App wird, in `.ara/knowledge/app.de.md`. Der nächste
Befehl ist dann `/app`.

**Antwortet er nicht, obwohl SSH steht**, liegt die Schnittstelle woanders als der Zugang:
hinter einem Tunnel, unter einem anderen Namen, auf einem anderen Port. Dann trägt die
Akte `api_base`, die Adresse mit Vorsatz, unter der die Schnittstelle wirklich antwortet.
Sie sticht `address`, bleibt in der Akte stehen und muss nicht bei jedem Aufruf mitgetippt
werden. `--base <url>` gibt es weiter, für den einen Versuch, der nicht in die Akte gehört.

## Der erste Mitarbeiter und die erste Freigabe

Nach der Installation läuft die Plattform, und **niemand darf hinein außer dem
Administrator**, dessen Startpasswort aus Schritt 3 stammt. Bevor ein Mensch beim Kunden
etwas sieht, braucht es zwei Dinge: einen Mitarbeiter und eine Freigabe für das, was er
benutzen soll. Beides gehört zur Abnahme und nicht zum Nachher.

**Der übliche Weg ist die Oberfläche**, im Browser am Gerät, angemeldet als Administrator.

### Die Sitzung: `--admin-login`

Das Kit hat einen Kit-Schlüssel mit `app:deploy` und keine Sitzung. Eine Sitzung holt es
sich aber, und zwar aus dem Startpasswort, das bei der Installation entstanden ist:

```
node .ara/tools/device.mjs --name <gerät> --admin-login
```

Das meldet sich am Gerät an und gibt den Ausweis aus, mit dem die nächsten Aufrufe gehen.
**Das Passwort wird dabei nicht angezeigt**, es geht aus der Geheimnis-Ablage direkt in
die Anmeldung. Der Weg läuft über die Schnittstelle und nicht über SSH: es braucht dafür
weder einen Anmeldenamen noch einen Schlüssel, nur `address` oder `api_base` in der Akte.
Für ein Skript gibt `--token` nur den Ausweis:

```
SITZUNG=$(node .ara/tools/device.mjs --name <gerät> --admin-login --token)
```

Der Weg dorthin ist `POST /api/auth/login`, und das ist eine Angabe über das Produkt wie
jede andere: **sie gehört an einem Gerät geprüft.** Das tut der Doku-Selbsttest:

```
node .ara/tools/check-docs.mjs --device <gerät>
```

Nennt das Artefakt in `arasul-release.json` einen anderen Weg oder einen anderen Namen für
den Administrator, gilt der. Stimmt beides nicht, gibst du es im Aufruf mit:
`--login-path <weg>` und `--login-user <name>`, und wie die beiden Felder der Anmeldung dort
heißen, sagen `--login-user-field <name>` und `--login-password-field <name>`. Das Werkzeug
schreibt jedes Mal dazu, woher es seine Angaben hat, und seine Absage nennt die Felder, mit
denen es gerufen hat.

Weist das Gerät die Anmeldung ab, hat das meist einen von zwei Gründen: der Administrator
heißt dort anders, oder das Startpasswort wurde am Gerät schon geändert. Dann ist der
Eintrag in der Ablage veraltet, und der Mensch, der es geändert hat, kennt das neue.

**Auf einem Gerät, das das Kit nicht installiert hat, gibt es kein Startpasswort**, und das
Kit kann keines herbeiholen: es entsteht bei der Installation. Das Werkzeug nennt dann drei
Wege, statt aufzuhören, und alle drei führen weiter:

1. **Jemand kennt es**, der Administrator des Geräts oder die Erstausgabe der Installation.
   Dann geht es einmal in die Ablage, und derselbe Aufruf läuft danach durch:
   `printf '%s' "<passwort>" | node .ara/tools/secrets.mjs --set <eintrag>`.
2. **Es wurde am Gerät geändert.** Derselbe Weg, mit dem, das heute gilt.
3. **Niemand kennt es.** Dann tut der Administrator in der Oberfläche, was die Sitzung getan
   hätte: Mitarbeiter, Freigaben und sein eigenes Passwort liegen dort, und für keines davon
   braucht es das Kit. Welche Seite was trägt, steht im Admin-Handbuch des Artefakts,
   `node .ara/tools/mirror.mjs --docs`.

**Sag den dritten Weg laut**, statt nach einem Passwort zu fragen, das niemand hat. Das
Ausrollen von Apps hängt nicht daran: dafür ist der Kit-Schlüssel da, und der kommt über SSH
vom Gerät.

**Welche Namen die Ablage führt**, sagt `node .ara/tools/secrets.mjs --show`. Dort steht
auch der Eintrag mit dem Startpasswort, mit dem Gerät daneben. Werte stehen dort nie.

### Weg und Rumpf stehen im Artefakt

Was du mit der Sitzung dann aufrufst, steht nicht im Kit, sondern im Artefakt. Der Spiegel
bringt die Anleitungen mit, die zu genau dieser Fassung gehören:

```
node .ara/tools/mirror.mjs --docs
```

Zwei davon brauchst du hier, und beide liegen unter `.ara/mirror/`:

- **Das Admin-Handbuch**, Kapitel zu Mitarbeitern und zu Freigaben. Es sagt, was ein
  Mitarbeiter ist, was eine Freigabe erlaubt und in welcher Reihenfolge beides angelegt
  wird.
- **Die API-Referenz.** Sie nennt die Wege dafür, die verlangten Felder und die Antwort.

Der Aufruf hat die Form, die jede Schnittstelle dort hat: ein Ausweis in der Kopfzeile,
sonst nichts.

```
curl -sS -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '<rumpf aus der API-Referenz>' \
  https://<gerät>/<weg aus der API-Referenz>
```

**Drei Dinge, die du dabei nicht rätst:**

1. **Den Weg und den Rumpf.** Beide stehen in der API-Referenz dieser Fassung. Schreib sie
   nicht aus dem Gedächtnis und nicht aus einem älteren Blatt ab.
2. **Den Token.** Er kommt aus `--admin-login`, sonst aus dem Weg, den die API-Referenz
   beschreibt. Der Kit-Schlüssel ist es **nicht**: der trägt `app:deploy` und sonst
   nichts, und das Gerät weist ihn hier ab. Das ist keine Panne, sondern die Trennung, für
   die es ihn gibt.
3. **Das Passwort.** Der Administrator gibt das Startpasswort beim ersten Mal weiter und
   ändert es danach. Es steht in der Erstausgabe am Gerät und in der Geheimnis-Ablage des
   Kits, unter dem Namen aus `start_password_ref`. Du zeigst es nie an, du benutzt es über
   `--admin-login`.

**Was du aufschreibst:** dass ein Mitarbeiter angelegt wurde, wer es war, was ihm
freigegeben ist und auf welchem Weg du es gemacht hast. Das gehört in den Laufzettel,
Phase 6, und es ist der Punkt, an dem ein Kunde nach einem halben Jahr nachfragt.

## Nach dem Urteil: bald

Vorgemerkt. Zugang darf schon gehärtet werden (`.ara/knowledge/remote-access.de.md`),
Docker und Ollama dürfen aufgesetzt werden. Sobald der Spiegel ein Profil für die
Hardware führt, geht es bei Phase 0 weiter. Ein Profil im Katalog heißt noch nicht
erprobt, `.ara/knowledge/identify-device.de.md` sagt, wie du das liest und dem Menschen
ehrlich sagst.
