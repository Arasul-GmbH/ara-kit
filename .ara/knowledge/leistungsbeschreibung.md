# Verfahren: Leistungsbeschreibung erstellen

> **Wann brauchst du das?** Vor jedem Angebot, und noch einmal vor jeder Übergabe.

> **Stand 27.08.2026: unvollständig.** Die verbindliche Reihenfolge und die fünf Anlagen
> stehen in `.ara/knowledge/paperwork.md`, Abschnitt „Die Leistungsbeschreibung füllen".
> Diese Datei vertieft nur den Reifegrad je Zeile. Widersprechen sich beide, gilt
> `paperwork.md`. Was fehlt, ist der Bildnachweis je Zeile: `node .ara/tools/evidence.mjs`
> läuft, aber die Schritte im Browser sind in kein Verfahren geschrieben, und darum
> entsteht `abgenommen` bis dahin von Hand am Gerät. Es ist keiner Phase zugeordnet.

## Was dieses Dokument ist

Die Leistungsbeschreibung ist die Anlage, die festlegt, **was geschuldet ist**. Sie ist
kein Werbetext und kein Haftungsausschluss. Sie wirkt in die andere Richtung als ein
Ausschluss: ein Ausschluss nimmt etwas weg und wird geprüft, eine Beschreibung legt fest,
woran ein Mangel überhaupt gemessen wird.

**Was hier nicht steht, ist nicht zugesagt.** Deshalb ist sie das Papier, das dich am
meisten schützt, und deshalb darf sie nicht abgeschrieben werden.

## Die zwei Zeitpunkte

| Zeitpunkt | Wofür | Grundlage |
| --- | --- | --- |
| **Vor dem Angebot** | Das ist die Zusage. Sie wird Vertragsbestandteil | Spiegel plus ein Gerät, das du kennst |
| **Vor der Übergabe** | Das ist der Nachweis. Sie muss zum Übergabeprotokoll passen | genau dieses Gerät |

Beide tragen ein Datum. Weichen sie voneinander ab, ist das ein offener Punkt oder ein
Mangel, und beides gehört auf den Tisch, nicht unter den Teppich.

## Die drei Stufen, und was sie kosten

| Stufe | Bedeutung | Was du damit zusagst |
| --- | --- | --- |
| **abgenommen** | wird bei der Übergabe vorgeführt und abgezeichnet | volle Gewährleistung |
| **in Erprobung** | vorhanden, aber nicht Gegenstand der Abnahme | nichts. Nutzung auf eigenes Risiko |
| **Vorschau** | sichtbar, noch nicht fertig | nichts. Kann sich ändern oder entfallen |

**Setz eine Zeile nur dann auf "abgenommen", wenn du sie vorführen wirst.** Eine Zeile,
die hier "abgenommen" trägt und bei der Übergabe nicht gezeigt wird, ist ein Widerspruch
in deinen eigenen Papieren, und er geht zu deinen Lasten.

Im Zweifel: **in Erprobung**. Eine Funktion, die der Kunde nutzt und die zufällig gut
läuft, kostet dich nichts. Eine Funktion, die du zugesagt hast und die ausfällt, schon.

## So gehst du vor

### 1. Den Spiegel holen

```
node .ara/tools/mirror.mjs --refresh
```

Daraus kommen die Funktionsbereiche und die Liste der Zielplattformen mit ihrem Stand
der Erprobung. **Übernimm den Stand der Erprobung wörtlich.** Steht eine Plattform nicht
auf `live`, hat sie nie auf echter Hardware gelaufen, und das gehört in das Angebot und
in Ziffer 2a des Vertrages. Ohne diesen Hinweis verschweigst du einen Umstand, den der
Kunde kennen müsste.

### 2. Das Gerät befragen

```
node .ara/tools/service-description.mjs --customer <kunde> --device <gerät>
```

Das Werkzeug legt die Anlage an und trägt ein, was das Gerät über seine Schnittstelle
beantwortet, mit der Quelle je Wert:

- Der Softwarestand und die Kontraktfassung, aus dem Kontrakt des Geräts
- Welche Sprachmodelle dort liegen, mit ihrer Kennung
- Welche Apps darauf stehen, mit ihrem Stand, für Abschnitt 6

**Was es nicht messen konnte, bleibt Platzhalter** und wird in der Ausgabe genannt. Eine
leere Antwort auf gefragte Kennungen wird dabei nicht zu einem zugesagten „keine": das
sagt es und lässt den Platzhalter stehen.

Die Verbindungen nach außen (Abschnitt 7) misst es nicht. Die bleiben Handarbeit am
Gerät, und ohne sie geht die Anlage nicht raus.

**Nichts davon schreibst du aus dem Gedächtnis oder aus einer Kit-Datei.** Das ist die
wichtigste Regel des Kits und sie gilt hier doppelt, weil das Dokument unterschrieben
wird.

Steht das Gerät noch nicht, weil es erst bestellt wird: nimm ein vergleichbares Gerät,
das du betreust, und schreib das Datum und die Herkunft in den Kopf. Danach vor der
Übergabe neu erheben.

### 3. Den Reifegrad setzen

Geh die Bereiche einzeln durch und frag dich je Bereich genau eine Sache: **Werde ich
das bei der Übergabe vorführen?**

Ja, sicher: `abgenommen`. Nein oder unsicher: `in Erprobung`. Noch nicht fertig:
`Vorschau`.

Wenn du das für einen Bereich nicht entscheiden kannst, weil du ihn nicht kennst:
**probier ihn auf dem Gerät aus**, bevor du ihn einträgst. Das dauert Minuten und ist
der Unterschied zwischen einer Zusage und einer Vermutung.

### 4. Was nicht enthalten ist, ausfüllen

Abschnitt 4 der Vorlage ist Teil der Beschaffenheitsvereinbarung, nicht Beiwerk.
**Ergänze, was in diesem konkreten Fall besprochen wurde und nicht dabei ist.** Der
Kunde hat im Gespräch etwas erwähnt, das nicht im Angebot steht? Dann steht es hier,
und zwar mit seinen Worten.

Das ist der Abschnitt, der Streit verhindert, und es ist der, den man am liebsten kurz
hält. Halt ihn lang.

### 5. Die Schutzmaßnahmen mit dem Kunden durchgehen

Abschnitt 8 ist eine Liste von Dingen, die **der Kunde** einrichtet, nicht du. Geh sie
mit ihm durch, bevor du das Angebot schickst, damit er weiß, was auf ihn zukommt.

Bei der Übergabe bestätigt er sie im Protokoll. Ohne diese Bestätigung ist die
entsprechende Ziffer des Vertrages nicht erfüllt.

### 6. Ablegen

`customers/<kunde>/documents/leistungsbeschreibung-<JJJJ-MM-TT>.md`, mit Datum im
Namen, wie in `.ara/knowledge/paperwork.md` unter „Wohin es abgelegt wird". Dorthin legt
das Werkzeug sie schon in Schritt 2; bei einem Gerät ohne Kunden liegt sie in dessen
Akte. Alte Fassungen bleiben liegen, und eine zweite Fassung desselben Tages ersetzt die
erste nur mit `--force`. In einem Streit ist die Fassung entscheidend, die bei
Vertragsschluss galt, und die musst du wiederfinden können.

Dazu ein Eintrag in `customers/<kunde>/history/`: welche Fassung an welchem Tag rausging.

## Der häufigste Fehler

Die Anlage aus dem letzten Angebot kopieren und das Datum ändern.

Sie beschreibt dann einen Softwarestand, ein Modell und einen Erprobungsstand, die es so
nicht mehr gibt. Das Dokument sagt dann etwas Falsches aus, und zwar in einem Papier,
das der Kunde unterschrieben hat. Genau das ist der Fall, in dem eine Haftungsklausel
nichts mehr nützt.

Zwanzig Minuten am Gerät sind billiger.
