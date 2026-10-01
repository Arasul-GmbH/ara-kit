# Verfahren: Wartung und Betreuung

> **Wann brauchst du das?** Bei `/maintain`: alles, was nach der Abnahme passiert.

## Einstieg: erst messen, dann fragen

Ein Command, mehrere Anliegen. Erkenn am Anliegen, worum es geht, und frag nicht ab, was du
sehen kannst.

**Zuerst immer die Statuszeile.** Sie entsteht nicht im Gespräch, sondern am Gerät:

```
node .ara/tools/maintain.mjs --device <gerät>
node .ara/tools/maintain.mjs --customer <kunde> --device <gerät>
node .ara/tools/maintain.mjs --device <gerät> --report     Bericht in die Akte
```

Sie nennt vier Dinge, in dieser Reihenfolge, weil sie in dieser Reihenfolge entscheiden,
ob überhaupt etwas zu tun ist: **Version, Apps mit ihren Ständen, letzte Sicherung,
Auffälliges.** Dahinter steht, was nicht gemessen werden konnte.

Gib sie weiter und frag dann, was ansteht. Kein Vorschlagskatalog: der Mensch sagt im
Freitext, was los ist, und daraus erkennst du, welches der vier Anliegen unten es ist.

### Zwei Wege, und keiner ist Bedingung für den anderen

| Weg | Was er bringt | Was ohne ihn fehlt |
|---|---|---|
| SSH, mit den Daten aus der Geräteakte | Platte, Speicher, Container, fehlgeschlagene Dienste, Protokolle | der ganze Zustand des Rechners |
| Die Schnittstelle, mit dem Kit-Schlüssel | Systemversion und Kontraktstand, Apps mit Test- und Livestand, letzte Sicherung | alles, was die Plattform von sich weiß |

Geht einer nicht, entsteht der Bericht aus dem anderen. **Was fehlt, steht als eigener
Abschnitt darin, und den sagst du dazu.** Ein Bericht, der verschweigt, was nicht gemessen
wurde, liest sich wie ein heiles Gerät, und darauf verlässt sich hinterher jemand.

Steht die Verbindung gar nicht, weder so noch so, ist das die erste Aufgabe und nicht die
zweite. Für einen einzelnen Befehl auf dem Gerät bleibt
`node .ara/tools/remote.mjs --customer <k> --check` der Weg.

### Kein Pfad aus dem Gedächtnis

Das Werkzeug kennt genau einen Pfad, den Kontrakt. Jeden anderen schlägt es dort nach.
Findet es zu einem Punkt nichts, steht im Bericht "dieses Gerät nennt dafür keinen
Endpunkt, noch nicht am Gerät", und **das ist die Antwort, nicht eine Lücke, die du
füllst.** Die letzte Sicherung ist heute genau so ein Punkt.

Dasselbe gilt für die Apps. Solange das Gerät keinen Endpunkt nennt, der sie aufzählt,
fragt das Kit nach den Kennungen, die es selbst kennt (die Ordner unter `apps/`, oder was
du mit `--apps` angibst). **Andere kann das Gerät trotzdem tragen**, und der Bericht sagt
das. Eine Liste, die er vollständig nennen würde, wäre geraten.

### Die letzte Sicherung

**Sie ist trotzdem messbar, nur nicht vom Kit.** Die Frage, die ein Kunde nach einem halben
Jahr stellt, hat zwei Teile: **sichert das Gerät wirklich**, und **wann lag zuletzt eine Kopie
außerhalb des Geräts**. Beide beantwortet ein Weg der Oberfläche:

```
GET /api/backup/status
```

Er verlangt eine Sitzung als Administrator. Kein Kit-Schlüssel öffnet ihn, er steht darum
nicht im Kontrakt, und der Bericht sagt „das Gerät nennt dafür keinen Endpunkt". Das heißt
nicht, dass nicht gesichert wird, sondern dass das Kit es auf diesem Weg nicht messen kann.
Kommt einmal ein Weg mit Schlüssel dazu, findet ihn das Werkzeug beim nächsten Lauf von
selbst. Zwei Wege, und du sagst, welchen du gegangen bist:

1. **Im Browser am Gerät**, der Mensch ist angemeldet. Du siehst die Antwort, er auch.
2. **Über SSH**, mit dem, was am Gerät dafür da ist.

Ein Ziel außerhalb ist eine Platte oder eine Freigabe im Kundennetz, kein Ziel in einer
Cloud. Fehlt es, sagt die Antwort den Grund, und der gehört ins Gespräch: eine Sicherung,
die neben dem Gerät liegt, ist nach einem Wasserschaden auch weg.

**In eine Leistungsbeschreibung oder ein Übergabeprotokoll kommt nur, was du gesehen
hast**, mit Datum und mit dem Weg, auf dem du es gesehen hast.

## Was geklärt sein muss

Die Regel steht in `AGENTS.md`, „Every command asks to full depth". Nach der Statuszeile, die du zuerst liest.

- Welches Gerät, und was das Anliegen ist: eine Störung, ein Update, eine Erweiterung, eine Routineprüfung, die Meldung eines Kunden.
- Bei einer Störung: was die Person gesehen hat, seit wann, was sich vorher geändert hat, ob es sich wiederholen lässt. Frag, was sie getan haben, nicht, was sie vermuten.
- Wer und was betroffen ist: ein Nutzer, alle, eine App, das ganze Gerät.
- Bei einem Update: die Fassung jetzt und das Ziel, das Zeitfenster, wer Bescheid wissen muss, der Weg zurück (der Plan von `upgrade.mjs` nennt Fassung, Dauer und Rückweg; dass der Mensch es gehört hat, ist der Punkt).
- Bei einer Erweiterung: was sie tun soll, dann `/app`.
- Die Stufe des Eingriffs (lesen, ändern, unumkehrbar) und dass der Mensch sie bestätigt hat.
- Ob der Kunde Bescheid bekommt, und von wem.

Ein offener Punkt wird nie zur Erlaubnis. Eine Änderung bleibt unbestätigt, bis der Mensch Ja sagt. Nach „genug" tust du nur, was liest.

## Die vier Anliegen

### 1. Es klemmt

Sagt die Statuszeile, dass ein Container von Arasul nicht läuft, geht die Selbstheilung
vor: `node .ara/tools/heal.mjs --device <gerät>`, Verfahren
`.ara/knowledge/self-healing.de.md`. Sie startet, was nicht läuft, nur im Verzeichnisbaum
von Arasul, protokolliert jeden Schritt in der Geräteakte mit seinem Weg zurück, und fragt
erst, wenn sie aufgibt. Wo sie aufgibt, beginnt die Diagnose.

Für alles andere gilt `.ara/knowledge/diagnostics.de.md`. Erst feststellen, dann ändern.

### 2. Regelmäßiger Blick

Wenn niemand ein konkretes Problem hat, aber jemand wissen will, ob alles in Ordnung ist,
ist der Bericht schon die Antwort. Nimm ihn mit `--report`, dann liegt er in der Akte:

```
node .ara/tools/maintain.mjs --customer <kunde> --device <gerät> --report
```

Er misst Dienste und Container, den Speicherplatz (den einzigen Wert, der still wächst,
bis nichts mehr geht), die Fehler in den Protokollen der letzten 24 Stunden, die Apps mit
ihren Ständen und die letzte Sicherung.

Drei Dinge misst er **nicht**, und die bleiben deine Aufgabe:

- **Ist eine Sicherung je zurückgespielt worden?** Eine Sicherung, die nie
  wiederhergestellt wurde, ist eine Vermutung. Das ist eine Übung, kein Messwert.
- **Der Produktstand gegen den Spiegel.** `node .ara/tools/mirror.mjs --show` sagt, womit
  installiert wurde. Ob es einen neueren gibt, sagt `--refresh`.
- **Fernzugriff von außen**, nicht nur, ob deine bestehende Sitzung noch offen ist.

Ergebnis in den Verlauf, auch wenn alles in Ordnung war. Ein Verlauf mit regelmäßigen
Einträgen ist bei einer Verlängerung mehr wert als jedes Verkaufsgespräch.

### 3. Update einspielen

Ein Update ist ein Eingriff, kein Klick. Das Kit führt den Weg mit einem eigenen Werkzeug,
damit niemand eine Zeile Shell schreibt und niemand die Dauer rät:

```
node .ara/tools/upgrade.mjs --device <gerät> --login-user <konto> --password-ref <NAME>
node .ara/tools/upgrade.mjs --customer <kunde> --device <gerät> ...
```

1. **Erst der Plan, und er ändert nichts.** Ohne weitere Optionen nennt das Werkzeug die
   Fassung am Gerät und die neueste, woher das Artefakt käme, was passiert, wie lange es
   dauert und den Rückweg. Gib das weiter und sag es dem Kunden vorher; ein Update während
   der Arbeitszeit ist eine Störung.
   - **Die Fassung am Gerät** wird an drei Stellen gelesen, und der Plan sagt, an welcher:
     der Kontrakt, der Ordner, den `install.sh` zuletzt eingerichtet hat, und die Statusroute.
     Die Statusroute kann statt einer Release-Nummer einen Stand aus einem Deploy nennen
     (`20261001-759a2b8`); verglichen wird nur die Nummer, der Stand steht daneben.
   - **Die neueste Fassung** kommt vom Portal (`GET /api/download?token=<token>&pruefen=1`),
     wenn der Kunden-Token hinterlegt ist, sonst aus der öffentlichen Release-Datei. In
     welchem Repository sie liegt, sagt der Spiegel oder die Auslieferung am Gerät, oder
     `--repo <inhaber/name>`.
   - **Wie lange:** der Plan nennt die gemessenen Zahlen mit Datum und Gerät (2,5 Minuten
     Einspielen und 3 Minuten nach einem Neustart, bis alle Container gesund sind, gemessen am
     01.10.2026 an einem Jetson AGX Orin von 0.8.12 auf 0.8.14), dazu die Sicherung. Eine
     Zahl, die anderswo gemessen wurde, wird nicht versprochen. Solange die Plattform neu
     startet, ist sie nicht erreichbar.
   - **Der Rückweg:** das Werkzeug liest `ops/AUSLIEFERUNG.md` und `ops/BACKUP_SYSTEM.md` am
     Gerät und zeigt, was dort über das Zurückgehen auf die vorige Fassung steht. **Steht dort
     nichts, sagt der Plan genau das: das Produkt nennt keinen Weg zurück.** Was die Sicherung
     zurückbringt, sind die Daten (`POST /api/backup/wiederherstellung`) und nicht die
     Fassung, und das Kit verkauft das eine nicht als das andere. Sag dem Kunden: das Update
     ist ein Schritt nach vorn, und ist die neue Fassung schlecht, ist der Weg ein behobenes
     Release. Das ist ein Befund für das Produkt, keine Kleinigkeit.
   - **Eingespielt wird nur, was neuer ist.** Bei gleicher oder älterer Fassung endet der
     Befehl mit einem Satz, bevor er etwas sichert.
2. **Die Sitzung als Administrator.** Die Sicherung und der Vergleich brauchen eine, und der
   Kit-Schlüssel öffnet sie nicht. Das Werkzeug holt sie über `device.mjs --admin-login`, gib
   also `--login-user` und `--password-ref` eines benannten Kontos an. Nicht als `admin`, wenn
   es ein Lese- oder Probekonto gibt. Das Passwort wird nie angezeigt.
3. **Der Mensch bestätigt** Absicht (von Fassung zu Fassung), Ziel (das Gerät) und Rückweg (den
   Satz aus dem Plan). Erst dann `--yes`. Das ist eine Bestätigung der Stufe 2, siehe
   `.ara/knowledge/security.de.md`.
4. **`--prepare --yes` ist der Probelauf, der trotzdem echt ist:** er hält den Stand fest und
   sichert, spielt nichts ein. Nimm ihn einen Tag vorher, wenn das Fenster eng ist.
5. **`--apply --yes` macht den Rest:**
   - hält den Stand fest: Konten, Lizenz, Apps mit Daten, Flows, Modelle, Firmenordner;
   - holt das Artefakt **auf dem Kundenweg**, von `arasul.de/api/download` mit dem Token aus
     der Geheimnis-Ablage, und hält es gegen die Prüfsumme der Release-Datei. Eine falsche
     Summe beendet den Lauf, bevor das Gerät berührt wird. **Ohne Kunden-Token sagt das
     Werkzeug das in einem Satz und hält an.** Die öffentliche Release-Datei samt Prüfsumme
     ist der andere Weg, genommen nur mit `--github`, als ausdrückliche Wahl und nie still;
   - bittet das Gerät um eine Sicherung (`POST /api/backup/sicherung`, es antwortet erst, wenn
     sie fertig ist) und **prüft**, dass neue Sicherungen in der Liste liegen
     (`GET /api/backup/sicherungen`). Keine neue Sicherung, kein Update;
   - legt das Artefakt auf das Gerät und führt dort dessen `install.sh` aus;
   - wartet, bis die Container, die vorher bereit waren, wieder bereit sind;
   - **startet den Rechner neu** und wartet wieder. Der Neustart gehört zum Nachweis: eine
     Plattform, die nur läuft, weil sie niemand neu gestartet hat, hat nicht gezeigt, dass sie
     anläuft. `--no-reboot` lässt ihn aus, wenn das Fenster des Kunden ihn nicht erlaubt, und
     der Bericht sagt es;
   - vergleicht den Stand mit dem von vorher und legt Bericht, Eintrag im Laufzettel und bei
     einem Kunden einen Eintrag in `history/` ab.
6. **Danach die Nachweise aus `.ara/knowledge/handover.de.md`** obendrauf: Dienste gesund,
   fachliche Anfrage beantwortet, Fernzugriff steht. Der Vergleich des Werkzeugs ersetzt das
   nicht. Er vergleicht die Listen, die das Gerät herausgibt; den Inhalt der App-Datenbanken
   liest er nicht Zeile für Zeile, er vergleicht, welche die Sicherung führt. **Fehlt nachher
   etwas, ist das ein Befund und keine Kleinigkeit:** der Lauf endet rot, und der Bericht
   nennt es.

Welche Wege das Werkzeug fragt, nimmt es aus der API-Referenz des Geräts selbst, und es ruft
keinen, den die Referenz nicht aufführt: `GET /api/update/status`, `GET /api/benutzer`,
`GET /api/license/info`, `GET /api/apps`, `GET /api/flows`, `GET /api/models/installed`,
`GET /api/firmenordner/ordner`, `GET /api/firmenordner/platz`, `GET /api/backup/sicherungen`,
`POST /api/backup/sicherung`. Fehlt dort einer, steht das Thema als „nicht gemessen" da, und
der Bericht sagt, warum.

### 4. Erweiterung bauen

Der Teil, mit dem der Partner zusätzlich Geld verdient. Verfahren:
`.ara/knowledge/extensions.de.md`

## Ein Mitarbeiter kommt dazu, einer geht

Der häufigste kleine Auftrag nach der Abnahme, und der einzige, für den das Kit keinen
Befehl hat: es hat einen Schlüssel mit `app:deploy` und keine Sitzung als Administrator.

Der übliche Weg ist die Oberfläche, im Browser am Gerät. **Ohne Browser geht es über die
Verwaltungsschnittstelle der Plattform**, mit einem Ausweis in der Kopfzeile
(`Authorization: Bearer`). Weg, Rumpf und der Weg zum Token stehen im Artefakt, nicht im
Kit: Admin-Handbuch und API-Referenz, beide im Spiegel und am Gerät selbst.

```
node .ara/tools/mirror.mjs --docs
node .ara/tools/mirror.mjs --docs --device <gerät>
```

Der ganze Ablauf mit der Form des Aufrufs steht in `.ara/knowledge/device.de.md` unter
"Der erste Mitarbeiter und die erste Freigabe". **Wer geht, verliert seine Freigaben
sofort und nicht beim nächsten Besuch**, und das schreibst du in den Verlauf, mit Datum
und mit dem Weg, auf dem du es gemacht hast.

## Wenn der Kunde anruft, weil etwas nicht geht

Das Kit überwacht nichts (bewusst). Der übliche Weg ist: Der Kunde meldet sich.

Dann gilt: **erst zuhören, dann nachsehen.** Was der Kunde beschreibt, ist ein Symptom aus
seiner Sicht, „das Ding ist kaputt" kann ein abgelaufenes Zertifikat, ein volles
Dateisystem oder ein gezogener Netzstecker sein. Frag nach dem, was er gemacht hat, nicht
nach dem, was er vermutet.

## Grenzen

- **Nichts anfassen, was nicht zur Aufgabe gehört.**
- **Nichts vom Gerät kopieren** außer Protokollauszügen, die du für die Diagnose brauchst.
- **Bei größeren Eingriffen den Kunden fragen**, auch wenn ein Wartungsvertrag besteht. Ein
  Vertrag erlaubt Wartung, er ist kein Freibrief für einen Neustart um elf Uhr vormittags.

## Mitschreiben

Jeder Einsatz erzeugt einen Eintrag unter `customers/<k>/history/JJJJ-MM-TT-thema.md`
(Vorlage: `.ara/templates/history-entry.md`). Das ist die Nachweisführung, wenn ein Kunde
fragt, was wann gemacht wurde, und die Grundlage dafür, dass beim nächsten Mal niemand bei
null anfängt.

Der Wartungsbericht ist etwas anderes und liegt woanders: er ist der **Messwert** und
liegt beim Gerät, unter `<geräteordner>/reports/JJJJ-MM-TT-wartung.md`, geschrieben von
`--report`. Der Verlaufseintrag ist das, was **passiert ist**, in deinen Worten, mit
Anlass, Befund, Getanem und Nachweis. Zwei Berichte an einem Tag überschreiben sich nicht.

Vor und nach einem Eingriff je einen Bericht aufzunehmen ist die einfachste Art, den
Nachweis zu führen: was vorher galt, was hinterher gilt, beides gemessen und nicht
behauptet.
