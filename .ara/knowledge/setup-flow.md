# Verfahren: Gerät einrichten

> **Wann brauchst du das?** Bei `/setup`: von der Vorbereitung bis zur Abnahme.

## Wie dieser Ablauf funktioniert

Sieben Phasen. Jede Phase folgt derselben Schleife:

**Vorbedingung prüfen → tun → nachweisen → in den Laufzettel schreiben.**

Der Ablauf dauert Stunden, wird unterbrochen und überlebt mehrere Sitzungen. Das Gedächtnis
ist der Laufzettel, nicht das Gespräch.

### Immer zuerst: Stand lesen

```
node .ara/tools/runsheet.mjs --customer <k> --show
```

Sag in **einem** Satz, wo es steht, und mach weiter. Nicht das ganze Protokoll vorlesen.

Gibt es noch keinen Laufzettel, leg ihn an:

```
node .ara/tools/runsheet.mjs --create --customer <k> --device <g>
```

### Immer nach jedem Schritt: eintragen

```
node .ara/tools/runsheet.mjs --customer <k> --phase <n> --status <fertig|unterbrochen> \
  --entry "Was getan wurde. Nachweis: was du geprüft hast und was dabei herauskam."
```

Ein Eintrag ohne Nachweis ist wertlos. „SSH gehärtet" sagt nichts. „SSH gehärtet, Anmeldung
mit Passwort wird jetzt abgelehnt, mit Schlüssel geht sie" ist ein Nachweis.

### Wenn etwas schiefgeht

Halt an, trag den Stand mit `--status unterbrochen` ein und sag, was du siehst und was du
vorschlägst. Kein Weiterprobieren über den Fehler hinweg. Der Laufzettel muss ehrlich sein,
gerade wenn es klemmt.

---

## Phase 0. Vorbereitung am Schreibtisch

**Ziel:** Vor der Fahrt ist klar, was passieren wird und was schiefgehen kann.

- **Geräteakte anlegen**, falls es sie noch nicht gibt: `.ara/templates/device.md` nach
  `customers/<k>/devices/<g>/device.md` kopieren und ausfüllen, soweit bekannt. Die
  Gerätebezeichnung benennt Standort oder Rolle, nicht das Modell.
- **Laufzettel anlegen:**
  `node .ara/tools/runsheet.mjs --create --customer <k> --device <g>`
- Gerät bestimmen und Reifegrad prüfen (`.ara/knowledge/identify-device.md`). Ist das Profil
  im Produkt noch nicht an echter Hardware bestätigt, **sag das jetzt**: nicht beim Kunden.
- Spiegel holen und Produktstand notieren.
- Lizenztoken prüfen: `node .ara/tools/mirror.mjs --show`. Ein abgelaufener Token
  fällt sonst erst beim Kunden auf.
- Netzfrage klären, mit dem, der das Kundennetz betreut: feste Adresse? Kommt das Gerät ins
  Internet? Darf es dauerhaft erreichbar sein? Gibt es eine Firewall dazwischen?
- Voraussetzungen gegen das Profil prüfen: Speicherplatz, Stromversorgung, Kabel,
  Bildschirm für den Erstboot, Netzwerkdose.
- **Rückfallplan festlegen.** Was passiert, wenn es nicht fertig wird? Bleibt das Gerät da?
  Wann ist der zweite Termin? Das ist eine Absprache, keine Formalie.
- Zeitbedarf ehrlich einschätzen und sagen. Eine Ersteinrichtung an neuer Hardware ist kein
  Termin über Mittag.

**Nachweis:** Der Laufzettel enthält Gerät, Profilstand, Netzplan, Voraussetzungen und
Rückfallplan, so, dass der Mensch ihn vor der Fahrt in zwei Minuten überfliegen kann.

---

## Phase 1. Betriebssystem

**Ziel:** Das Gerät läuft mit einem Betriebssystem und ist im Netz.

Verfahren steht in `.ara/knowledge/boot-and-flash.md`. Kurz:

- Fall klären: Werksystem bleibt, Standard-Linux vom Stick, oder Flashen über Kabel.
- Bei Bedarf Abbild prüfen und Boot-Medium schreiben (unumkehrbarer Schritt, volle
  Bestätigung).
- Erstboot mit **einer Anweisung nach der anderen** begleiten.
- Benutzername, Netzeinstellung und Verschlüsselung bewusst entscheiden.

**Nachweis:** Das Gerät startet eigenständig durch und ist unter einer bekannten Adresse
im Netz.

---

## Phase 2. Erstkontakt über das Netz

**Ziel:** Du kommst ohne Bildschirm und Tastatur auf das Gerät.

- Erreichbarkeit prüfen: `node .ara/tools/find-device.mjs --host <adresse>`
- Ist nichts erreichbar: `--neighbors` zeigt, was im Netz überhaupt antwortet.
- Öffentlichen Schlüssel ausrollen. Der private Schlüssel bleibt in `~/.ssh`.
- Anmeldung mit Schlüssel prüfen, **bevor** irgendetwas gehärtet wird.
- Adresse, Anmeldename, Port und Schlüsselname in `device.md` eintragen.
- Ab jetzt läuft jeder Befehl über `node .ara/tools/remote.mjs --customer <k> --command "…"`,
  damit stimmt das Ziel immer und die Ausführung ist protokollierbar.

**Nachweis:** `node .ara/tools/remote.mjs --customer <k> --check` meldet, dass die
Verbindung steht.

**Vorsicht:** Erst wenn die Anmeldung mit Schlüssel nachweislich funktioniert, darf in
Phase 4 die Passwortanmeldung abgeschaltet werden. Diese Reihenfolge ist nicht verhandelbar.
Sonst sperrst du dich aus einem Gerät aus, das beim Kunden im Schrank steht.

---

## Phase 3. Ara OS installieren

**Ziel:** Das Produkt läuft auf dem Gerät.

- Den aktuellen Installationsweg im Spiegel nachlesen. Er ist tokengeschützt und zieht den
  jeweils aktuellen Stand; die Einzelheiten stehen in der Produktdokumentation und im
  Kommandozeilenwerkzeug im Wurzelverzeichnis des Spiegels. **Nicht aus dem Gedächtnis.**
- Vor dem Start prüfen, was die Installation voraussetzt (Speicherplatz, Rechte, Netz).
- Installation begleiten, nicht blind starten: Ausgabe mitlesen, bei Fehlern anhalten.
  Eine Installation, die durchläuft und am Ende nichts tut, ist schlimmer als eine, die
  sichtbar abbricht.
- Das Token gehört nicht in die Befehlszeile, wo es in der Prozessliste und im Protokoll
  landet. Der Riegel weist dich darauf hin, wenn du es doch versuchst.

**Nachweis:** Die Dienste laufen und melden sich gesund. Wie man das abfragt, steht im
Produkt, lies es dort nach.

---

## Phase 4. Nachbereitung

**Ziel:** Das Gerät ist abgesichert, vollständig und aus der Ferne erreichbar.

**Wichtig: Erst prüfen, ob überhaupt etwas fehlt.** Das Produkt entwickelt sich; manche
Nacharbeit von früher erledigt es inzwischen selbst. Ungefragt nachzuarbeiten schafft
Zustände, die niemand erwartet.

Für jeden Punkt: **erst feststellen, dann handeln, dann nachweisen.**

- **Modell vorhanden?** Antwortet die Sprachverarbeitung mit echtem Inhalt? Wenn nicht,
  fehlt in der Regel das Modell. Welches für dieses Gerät gilt, steht im Plattformprofil.
- **Namensauflösung im Netz.** Ist das Gerät unter seinem Namen erreichbar oder nur über
  die Adresse? Wenn der Kunde später den Namen benutzen soll, muss er auch funktionieren.
- **Zugang härten.** Anmeldung nur mit Schlüssel, kein Passwort, eingeschränkter
  Benutzerkreis. **Erst nachdem die Schlüsselanmeldung nachweislich läuft**: und die
  bestehende Sitzung offen lassen, bis die neue geprüft ist.
- **Netzabsicherung.** Nur die Dienste erreichbar, die erreichbar sein sollen.
- **Fernzugriff einrichten** (`.ara/knowledge/remote-access.md`).

Ändert sich dabei der Zugangsport oder der Anmeldename, **sofort in `device.md` nachziehen**.
Sonst greift das nächste `remote.mjs` ins Leere.

**Nachweis:** Für jeden Punkt ein geprüfter Zustand, nicht eine ausgeführte Handlung.

---

## Phase 5. Nachweis

**Ziel:** Nachgewiesen ist, dass es wirklich funktioniert. Nicht „müsste jetzt".

Die Prüfliste steht in `.ara/knowledge/handover.md`. Kern:

- Dienste gesund, auch nach einem Neustart des Geräts
- Eine echte fachliche Anfrage liefert eine sinnvolle Antwort
- Ein Testdokument wird aufgenommen und wiedergefunden
- **Fernzugriff funktioniert von außerhalb des Kundennetzes**

Der letzte Punkt ist der wichtigste und wird am häufigsten übersprungen. Im Kundennetz
funktioniert fast immer alles. Prüf ihn über eine Verbindung, die nicht im Kundennetz
hängt. Mobilfunk reicht.

**Nachweis:** Jeder Punkt mit Ergebnis im Laufzettel. Ein nicht geprüfter Punkt wird als
nicht geprüft eingetragen, nicht weggelassen.

---

## Phase 6. Abnahme

**Ziel:** Der Kunde hat, was er braucht, und weiß, was er hat.

- `handover.md` aus dem Laufzettel erzeugen (Vorlage: `.ara/templates/handover.md`).
  Sie entsteht aus dem Protokoll, deshalb kann sie nicht veralten.
- Kurzanleitung für die Mitarbeiter (Vorlage: `.ara/templates/quickstart.md`). Eine
  Seite, in der Sprache der Anwender, ohne Fachbegriffe.
- Zugangsdaten übergeben. Der Kunde bekommt seine Zugänge, der Partner behält seine
  Wartungszugänge. Geheimnisse gehören in die `.env`, nicht in die Übergabedatei.
- **Not-Aus zeigen.** Der Kunde muss die Fernwartung jederzeit abschalten können und wissen,
  wie. Das gehört vorgeführt, nicht erwähnt.
- Status in `customer.md` und `device.md` auf den Betriebszustand setzen,
  Abnahmedatum eintragen, Laufzettel auf `fertig`.

**Nachweis:** Der Kunde kann in eigenen Worten sagen, was das Gerät für ihn tut und an wen
er sich wendet, wenn es klemmt.
