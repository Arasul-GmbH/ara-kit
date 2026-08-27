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

**Sie ist trotzdem messbar, nur nicht vom Kit.** Das Gerät beantwortet die zwei Fragen
dazu über einen Weg seiner Oberfläche, und der verlangt eine Sitzung als Administrator,
kein Schlüssel öffnet ihn. Wie du trotzdem herankommst und was in der Antwort steht,
steht in `.ara/knowledge/platform-services.md` unter "Die Sicherung". Kommt einmal ein
Weg mit Schlüssel dazu, findet ihn das Werkzeug beim nächsten Lauf von selbst.

Dasselbe gilt für die Apps. Solange das Gerät keinen Endpunkt nennt, der sie aufzählt,
fragt das Kit nach den Kennungen, die es selbst kennt (die Ordner unter `apps/`, oder was
du mit `--apps` angibst). **Andere kann das Gerät trotzdem tragen**, und der Bericht sagt
das. Eine Liste, die er vollständig nennen würde, wäre geraten.

## Die vier Anliegen

### 1. Es klemmt

Verfahren in `.ara/knowledge/diagnostics.md`. Erst feststellen, dann ändern.

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

Ein Update ist ein Eingriff, kein Klick.

1. **Vorher:** Was ändert sich? Gibt es Hinweise im Produkt dazu? Ist der Zeitpunkt mit dem
   Kunden abgesprochen? Ein Update während der Arbeitszeit ist eine Störung.
2. **Sicherung anlegen und prüfen, dass sie existiert.** Nicht „läuft ja automatisch".
3. **Einspielen**, dem Weg des Produkts folgend (im Spiegel nachlesen).
4. **Danach die Nachweise aus `.ara/knowledge/handover.md`**: mindestens: Dienste gesund,
   fachliche Anfrage beantwortet, Fernzugriff steht. Ein Update, das durchläuft und danach
   ein totes System hinterlässt, ist der Normalfall bei ungeprüften Updates.
5. **Rückweg kennen**, bevor du anfängst. Wenn es keinen gibt, ist das eine Information für
   den Kunden, keine Kleinigkeit.

### 4. Erweiterung bauen

Der Teil, mit dem der Partner zusätzlich Geld verdient. Verfahren:
`.ara/knowledge/extensions.md`

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
