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

Ein Update ist ein Eingriff, kein Klick. Das Kit führt den Weg mit einem eigenen Werkzeug, damit
niemand eine Zeile Shell schreibt und niemand rät, wie lange es dauert. **Der Weg ist die
Schnittstelle des Geräts, nicht SSH.** Seit das Gerät Updates auf Auftrag annimmt, macht es die
Arbeit selbst: es holt das Paket aus dem Release, prüft die Prüfsumme, sichert zuerst (und hält an,
ohne etwas zu ändern, wenn die Sicherung scheitert), baut die neuen Images, während es weiterläuft,
schaltet um und meldet jeden Schritt. Ein Kunde braucht für die Wartung keinen SSH-Zugang.

```
node .ara/tools/upgrade.mjs --device <gerät> --login-user <konto> --password-ref <NAME>
node .ara/tools/upgrade.mjs --customer <kunde> --device <gerät> ...
```

1. **Zuerst der Plan, und er ändert nichts.** Ohne weitere Optionen nennt das Werkzeug die
   Fassung am Gerät und die neueste, was passiert, wie lange es dauert, den Rückweg und den
   Schlüssel, den es nimmt. Gib es weiter und nenne es dem Kunden vorher; ein Update in der
   Arbeitszeit ist eine Störung.
   - **Die Fassung am Gerät und die neueste** kommen vom Gerät selbst: seine Statusroute und
     seine eigene Frage nach dem Release. Nennt das Gerät keine Fassung, sagt der Plan das.
     Verglichen wird nur die Nummer; ein Stand aus einem Deploy (`20261001-759a2b8`) steht
     daneben und ist keine Release-Nummer.
   - **Wie lange:** der Plan nennt die gemessenen Zahlen mit Datum und Gerät (4 und 19 Minuten
     über diesen Weg, gemessen am 02.10.2026 an einem Jetson AGX Orin, von 0.8.14 auf 0.8.16
     und auf 0.8.15). Eine Zahl, die anderswo gemessen wurde, wird nicht versprochen. Beim
     Umschalten ist das Gerät einige Minuten nicht erreichbar, und das ist keine Störung. Die
     eigene Messung des Kits mit dem nächsten Release ersetzt diese Zahlen.
   - **Der Rückweg:** der Plan zitiert, was der Kontrakt des Geräts zu dem Weg sagt, und ob das
     Gerät gerade eine vorige Fassung kennt. Der Rückweg holt das Programm der vorigen Fassung,
     **nicht die Daten**. Die Sicherung, die das Gerät zuerst macht, liegt bereit, falls auch die
     Daten zurück sollen, und das entscheidet ein Mensch. Sag es dem Kunden.
   - **Eingespielt wird nur, was neuer ist.** Bei gleicher oder älterer Fassung endet der
     Befehl mit einem Satz, bevor er einen Schlüssel anlegt oder das Gerät um etwas bittet.
2. **Der Schlüssel.** Der Bereich `system:update` steckt in keinem Schlüssel von selbst und nicht
   im Kit-Schlüssel (`app:deploy`): wer eine App einspielen darf, darf damit nicht das Gerät
   austauschen. Trägt der Kit-Schlüssel den Bereich, nimmt das Kit ihn. **Sonst legt es einen
   Schlüssel für diesen einen Anlass an**, mit der Sitzung als Administrator (`--login-user` und
   `--password-ref` eines benannten Kontos, nicht `admin`, wenn es ein Lese- oder Probekonto gibt),
   mit genau diesem Bereich, nach drei Stunden von selbst abgelaufen, und widerruft ihn am Ende,
   auch nach einem Lauf, der scheitert. Wer weder einen Kit-Schlüssel mit dem Bereich noch eine
   Sitzung als Administrator hat, bekommt einen Satz, und es wird nichts geändert. Der Schlüssel
   wird nie angezeigt und steht in keinem Bericht.
3. **Der Mensch bestätigt** Absicht (von Fassung zu Fassung), Ziel (das Gerät) und Rückweg (der Satz
   aus dem Plan). Erst dann `--yes`. Das ist eine Bestätigung der Stufe 2, siehe
   `.ara/knowledge/security.de.md`.
4. **`--apply --yes` macht den Rest:**
   - hält den Stand mit der Sitzung als Administrator fest: Konten, Lizenz, Apps mit Daten, Flows,
     Modelle, Firmenordner (ohne Sitzung läuft es weiter und sagt, dass der Vergleich nicht
     gemessen wurde);
   - bittet das Gerät um das Update (`POST` auf den Weg, den sein Kontrakt nennt; das Kit ruft
     nichts, was der Kontrakt nicht nennt);
   - **zeigt den Fortschritt, sobald er kommt:** den Schritt, den das Gerät meldet, und die neuen
     Zeilen seines Protokolls. Beim Umschalten antwortet das Gerät nicht; das Kit sagt es einmal
     und fragt wieder;
   - endet mit dem, was das Gerät meldet: fertig, zurückgerollt, fehlgeschlagen oder abgebrochen.
     Ein Lauf, den das Gerät von selbst zurückgerollt hat, ist nicht sauber, und das Werkzeug
     sagt es;
   - vergleicht Fassung und Stand mit dem von vorher und legt den Bericht (mit dem Protokoll des
     Geräts), den Eintrag im Laufzettel und bei einem Kunden einen Eintrag in `history/` ab.
   Der Rechner selbst wird auf diesem Weg nicht neu gestartet.
5. **`--back --yes` geht zurück** auf die vorige Fassung, wenn das Gerät eine nennt. Nennt es
   keine, gibt es einen Satz und sonst nichts.
6. **Danach der Nachweis aus `.ara/knowledge/handover.de.md`** obendrauf: Dienste gesund, eine Frage
   zur Sache beantwortet, Fernzugang steht. Der Vergleich des Werkzeugs ersetzt das nicht. Er
   vergleicht die Listen, die das Gerät herausgibt; den Inhalt der App-Datenbanken liest er nicht
   Zeile für Zeile. **Fehlt danach etwas, ist das ein Fund und keine Kleinigkeit:** der Lauf endet
   rot, und der Bericht nennt es. Der Spiegel des Kits hält nach dem Lauf noch das frühere
   Artefakt: `node .ara/tools/mirror.mjs --refresh`.

**Der Rückfall ist SSH, und er ist ausdrücklich:** `--ssh` zum Aufruf. Dann holt das Kit das
Artefakt selbst (den Kundenweg über das Portal mit dem Token, oder mit `--github` die öffentliche
Release-Datei samt Prüfsumme, nie still), bittet um eine Sicherung und prüft sie in der Liste
(`--prepare --yes` macht nur das), schiebt das Artefakt hin, startet dessen `install.sh`, startet
den Rechner neu und wartet (`--no-reboot` lässt das aus, der Bericht sagt es). Nimm ihn nur, wenn
der Weg über die Schnittstelle nicht offen ist: ein älteres Gerät ohne den Update-Weg, ein Gerät,
das die Schnittstelle nicht erreicht. Das Werkzeug nennt ihn in dem Satz, an dem der Weg über die
Schnittstelle anhält.

Die Wege für den Vergleich sind dieselben wie zuvor: `GET /api/benutzer`, `GET /api/license/info`,
`GET /api/apps`, `GET /api/flows` (die eigenen Flows der Plattform), `GET /api/apps/:id/flows` (die Flows jeder App, je App und Stand gefragt, so dass ein Flow, den ein Update verliert, den Vergleich rot macht), `GET /api/models/installed`, `GET /api/firmenordner/ordner`,
`GET /api/firmenordner/platz`. Kennt das Gerät einen nicht, steht das Thema als "nicht gemessen",
und der Bericht sagt warum.

### 4. Erweiterung bauen

Der Teil, mit dem der Partner zusätzlich Geld verdient. Verfahren:
`.ara/knowledge/extensions.de.md`

## Ein Mitarbeiter kommt dazu, einer geht

Der häufigste kleine Auftrag nach der Abnahme, und der einzige, für den das Kit keinen
Befehl hat: es hat einen Schlüssel mit `app:deploy` und keine Sitzung als Administrator.

Der übliche Weg ist die Oberfläche, im Browser am Gerät. **Ohne Browser geht es über die
Verwaltungsschnittstelle der Plattform**, ein Aufruf je Handgriff mit der Sitzung eines
Administrators: `node .ara/tools/device.mjs --name <gerät> --admin-call "<VERB> <weg>"`. Der
Ausweis wird nie gezeigt und kommt in keinen eigenen Aufruf. Weg und Rumpf stehen im Artefakt,
nicht im Kit: Admin-Handbuch und API-Referenz, beide im Spiegel und am Gerät selbst.

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

## Das Kit an den Kunden übergeben

Soll der Kunde das Kit von hier an selbst führen, ist das ein Wartungsschritt wie jeder andere: erst ein Plan, vor dem Schreiben ein Ja. Das Verfahren ist `.ara/knowledge/transfer.de.md`: `node .ara/tools/transfer.mjs --prepare --to "<Name>"` bereitet das Repository vor (nur Zweig Unternehmen), der Neue übernimmt mit `/init`, und `--prove` zeigt danach, dass die alten Schlüssel tot sind. Kein Schlüssel wird zurückbehalten. Die Übergabe und das Ergebnis von `--prove` kommen in den Verlauf.

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
