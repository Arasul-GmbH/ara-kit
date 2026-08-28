# Verfahren: das Papier

> **Wann brauchst du das?** Wenn ein Angebot entsteht, wenn eine Anlage gefüllt wird und
> wenn jemand fragt, welches Papier zu welchem Zeitpunkt beim Kunden liegen muss.

## Der Grundsatz

Was hier entsteht, wird unterschrieben. Eine Zahl, die in einem Angebot falsch ist, ist
keine Ungenauigkeit, sondern eine Zusage, die nicht stimmt. Deshalb gilt in jedem Papier
die Regel aus `.ara/knowledge/live-knowledge.md` doppelt: **kein Produktwert aus dem
Gedächtnis und keiner, weil er in einer Vorlage steht.** Modellnamen, Plattformen,
Fassungen und Erprobungsstände kommen aus dem Spiegel oder vom Gerät.

Und eine zweite Regel, die nur hier gilt: **die Einkaufspreise des Partners tauchen in
keinem Kundendokument auf**, auch nicht in einer Zwischensumme, aus der sich die Marge
zurückrechnen lässt.

## Wessen Papier ist wessen

Zwei Unternehmen schreiben Papier, und sie werden leicht verwechselt.

| Papier | Absender | Wo es liegt |
|---|---|---|
| Angebot an den Endkunden | **der Partner** | `.ara/vorlagen/angebot.md` |
| Leistungsbeschreibung, Endkundenbedingungen, Drittlizenzen | der Partner gibt sie weiter | `.ara/vorlagen/` |
| Nachweise zu KI-Einstufung und Datenverarbeitung | Arasul verfasst, der Partner legt sie bei | `.ara/nachweise/` |
| Übergabeprotokoll | Partner und Kunde zeichnen | `.ara/vorlagen/uebergabeprotokoll.md` |
| Rechnung an den Endkunden | **der Partner** | `.ara/vorlagen/rechnung.md`, Verfahren in `.ara/knowledge/invoicing.md` |
| Partnervertrag, Kaufvertrag, Vereinbarung zur Auftragsverarbeitung | **Arasul** | nicht im Kit |

Die drei letzten Zeilen sind der häufigste Irrtum. **Der Partnervertrag ist ein Papier,
das der Partner von Arasul bekommt, keine Vorlage, die er ausfüllt.** Dasselbe gilt für
den Kaufvertrag zwischen Arasul und einem Direktkunden und für die Vereinbarung zur
Auftragsverarbeitung nach Art. 28 DSGVO: dort ist Arasul der Auftragsverarbeiter, nicht
der Partner. Wer eines davon im Kit sucht, sucht am falschen Ort und soll bei Arasul
fragen.

Der Kaufvertrag zwischen dem **Partner** und seinem Kunden ist Sache des Partners. Das
Kit liefert ihn nicht, weil es nicht weiß, unter welchen Bedingungen der Partner
verkauft. Was aus dem Angebot zwingend darin auftauchen muss, steht unten unter
"Vorbehalte, die weiterwandern".

## Die Reihenfolge

1. **Verstehen und rechnen.** Was der Kunde erreichen will, steht in seiner Akte und in
   `customers/<kunde>/history/`. Gerechnet wird nach `.ara/knowledge/pricing.md`,
   Aufbau und Ton nach `.ara/knowledge/sales.md`.
2. **Spiegel holen.** `node .ara/tools/mirror.mjs --refresh`. Ohne frischen Spiegel
   entsteht kein Angebot, weil sonst Plattform und Erprobungsstand geraten wären.
3. **Leistungsbeschreibung füllen.** Sie kommt vor dem Angebot, nicht danach. Sie legt
   fest, was geschuldet ist, und das Angebot verweist auf sie. Verfahren unten.
4. **Angebot schreiben.** `.ara/vorlagen/angebot.md` als Gerüst, Absender aus
   `business/company.md`.
5. **Anlagen zusammenstellen.** Fünf, siehe unten. Alle fünf, oder das Angebot geht nicht
   raus.
6. **Prüflisten abarbeiten.** Jede Vorlage trägt am Ende einen HTML-Kommentar mit ihrer
   eigenen Liste. Der Kommentar landet nicht im PDF, die Liste ist trotzdem verbindlich.
7. **PDF erzeugen.** `node .ara/tools/pdf.mjs <datei>`. Es weigert sich, solange noch ein
   Platzhalter in geschweiften Klammern im Text steht.
8. **Ablegen und nachhalten.** Alles nach `customers/<kunde>/documents/`, Status auf
   `quoted`, Gültigkeitsdatum als Wiedervorlage. Siehe `.ara/knowledge/crm.md`.

Später, bei der Übergabe: Übergabeprotokoll und technische Abnahme, siehe
`.ara/knowledge/handover.md`. Und danach die Rechnung, siehe
`.ara/knowledge/invoicing.md`: sie ist das einzige Papier im Kit, dem ein Gesetz
vorschreibt, was drinstehen muss, und darum hat sie ein eigenes Verfahren.

## Die fünf Anlagen zum Angebot

Sie werden Vertragsbestandteil. In dieser Reihenfolge, weil die erste festlegt, was
geschuldet ist, und die letzten beiden beantworten, was der Kunde fragen wird.

| Nr | Anlage | Woher | Je Kunde neu? |
|---|---|---|---|
| 1 | Leistungsbeschreibung | `.ara/vorlagen/leistungsbeschreibung.md` | ja, gegen Spiegel und Gerät |
| 2 | Endkundenbedingungen | `.ara/vorlagen/endkundenbedingungen.md` | nein, unverändert weitergeben |
| 3 | Drittlizenzen | `.ara/vorlagen/drittlizenzen.md` | nein, unverändert weitergeben |
| 4 | Nachweis KI-Einstufung | `.ara/nachweise/ki-einstufung.md` | nein, aber Abrufdatum prüfen |
| 5 | Nachweis Datenverarbeitung | `.ara/nachweise/datenverarbeitung.md` | **ja, Abschnitt 3 wird gemessen** |

**Die beiden Nachweise sind nicht Beiwerk.** In der Partnerumfrage vom 24.08.2026
verlangen fünf von sechs Befragten Datenschutzunterlagen und vier von sechs Nachweise zum
AI Act. Ein Angebot ohne sie kommt mit genau diesen zwei Fragen zurück, und dann
verhandelt der Partner nicht mehr über Nutzen, sondern über eine Lücke.

`.ara/nachweise/` und `.ara/vorlagen/bausteine/` werden aus dem Steuerungsordner von Arasul
gespiegelt. **Hier nicht bearbeiten.** Wer darin einen Fehler findet, sagt es Arasul.

### Was passiert, wenn eines fehlt

Keine Formalien. Was in dieser Spalte steht, ist die Folge, die tatsächlich eintritt.

| Fehlt | Was daraus folgt |
|---|---|
| Leistungsbeschreibung | Die Beschaffenheit ist nicht vereinbart. Dann gilt nach § 434 Abs. 2 Nr. 2 BGB, was der Kunde erwarten durfte, im Zweifel also das, was er in der Vorführung gesehen hat. Vier Klauseln der Verträge verweisen ins Leere |
| Endkundenbedingungen | Sie sind nach § 305 Abs. 2 BGB nicht einbezogen. Damit fällt die gesamte Haftungsbegrenzung weg, auch die zugunsten von Arasul. Nachreichen hilft nicht, der Hinweis muss **vor** Vertragsschluss erfolgen |
| Drittlizenzen | Die Ziffer zu den Komponenten Dritter verweist auf eine Anlage, die es nicht gibt. Ausgeliefert wird fremder Code unter Copyleft, und die Weitergabe ohne die Lizenztexte verletzt deren Bedingungen |
| Nachweis KI-Einstufung | Der Kunde fragt seinen Anwalt, wer nach VO (EU) 2024/1689 Anbieter und wer Betreiber ist. Bis die Antwort kommt, liegt das Angebot. Und der Partner erfährt nicht, dass er nach Art. 25 Abs. 1 selbst zum Anbieter wird, wenn er unter eigener Marke verkauft |
| Nachweis Datenverarbeitung | Der Datenschutz des Kunden fragt, wohin die Daten gehen. Ohne Blatt gibt es darauf nur eine Behauptung. Das ist der Punkt, an dem ein souveränes Gerät wie jede Cloud aussieht |

### Der Nachweis Datenverarbeitung ist ein Gerüst

`.ara/nachweise/datenverarbeitung.md` ist **kein ausgefülltes Blatt.** Abschnitt 3 trägt
Platzhalter, weil die Zahlen je Auslieferung am konkreten Gerät gemessen werden, mit den
Befehlen, die dort stehen, und mit Datum und Uhrzeit.

**Wer das Blatt unausgefüllt beilegt, legt ein leeres Blatt bei.** Schlimmer noch: es
sieht wie ein Nachweis aus und wird geglaubt. Zwei Wege, und du sagst dem Partner, welchen
du gehst:

- **Vor der Lieferung**, es gibt noch kein Gerät: Abschnitt 1, 2, 4, 5 und 6 gelten schon,
  sie beschreiben den Auslieferungszustand. Abschnitt 3 bleibt leer und wird mit einer
  Zeile gekennzeichnet: gemessen wird bei der Übergabe, das Ergebnis wird nachgereicht.
  Diese Zeile fehlt sonst, und dann liest der Kunde einen Platzhalter als Aussage.
- **Bei der Übergabe**, das Gerät steht: Abschnitt 3 wird gemessen und ausgefüllt. Das
  Ergebnis gehört ins Übergabeprotokoll, dort steht auch, ob der Fernzugriff direkt oder
  über das Vermittlungsnetz eingerichtet ist. Von dieser Antwort hängt Abschnitt 5 ab.

## Die Leistungsbeschreibung füllen

Sie ist das Papier, das den Partner am meisten schützt, und das mit der meisten Arbeit.
**Sie wird nie aus einem alten Angebot kopiert.** Ein alter Reifegrad ist beim nächsten
Produktstand eine falsche Zusage.

Zwei Zeitpunkte, und sie sind verschieden:

- **Zum Angebot** wird sie gegen den Spiegel erhoben. Im Kopf steht, wogegen: der
  Spiegelstand mit Datum, und die angebotene Plattform.
- **Zur Übergabe** wird sie gegen das gelieferte Gerät geprüft. Hat sich etwas verschoben,
  entsteht eine neue Fassung und die liegt dem Übergabeprotokoll bei. Die Fassung, die
  abgezeichnet wird, ist die geschuldete.

Sieben Schritte:

1. **Am Gerät erheben**, wenn es eines gibt:

   ```
   node .ara/tools/service-description.mjs --customer <kunde> --device <gerät>
   ```

   Das Werkzeug legt die Anlage aus der Vorlage an und trägt ein, was das Gerät
   beantwortet: Softwarestand, Kontraktfassung, die Modelle, die dort liegen, und die
   Apps, die darauf stehen. Zu jedem Wert schreibt es die Quelle dazu, und was es nicht
   messen konnte, bleibt Platzhalter und wird genannt. **Es füllt nichts, was eine
   Entscheidung ist**: Reifegrad, Plattform, Verbindungen nach außen und alles aus dem
   konkreten Fall bleiben deine Arbeit, und das sind die Schritte danach.

   Steht noch kein Gerät, weil es erst bestellt ist, legst du die Anlage von Hand aus
   `.ara/vorlagen/leistungsbeschreibung.md` an und schreibst in den Kopf, wogegen erhoben
   wurde. Vor der Übergabe wird sie am gelieferten Gerät neu erhoben.
2. **Spiegel holen**, `node .ara/tools/mirror.mjs --refresh`. Abschnitt 2 wird komplett
   daraus ersetzt, die Tabelle in der Vorlage ist ein Muster mit Datum.
3. **Plattform eintragen** und ihren Erprobungsstand aus dem Spiegel lesen. Steht dort
   nicht `live`, ist der Vorbehalt zwingend, siehe unten.
4. **Reifegrad je Funktionsbereich setzen**, Abschnitt 3. Jede Zeile bekommt eine der drei
   Stufen, keine bleibt leer. **`abgenommen` nur, was bei der Übergabe wirklich vorgeführt
   wird.** Eine Zeile, die hier `abgenommen` trägt und dort nicht vorkommt, ist ein
   Widerspruch, und er geht gegen den, der ihn geschrieben hat. Was du nicht am Gerät oder
   im Spiegel belegen kannst, ist `in Erprobung`, nicht `abgenommen`.
   Dafür gibt es `node .ara/tools/evidence.mjs`: es lässt `abgenommen` nur mit einem
   geprüften Bild vom Gerät zu und schreibt die Anlage in die Kundenakte. Stand
   27.08.2026 unvollständig: das Werkzeug läuft, die Schritte im Browser sind nicht als
   Verfahren beschrieben, und es ist keiner Phase zugeordnet. Bis dahin belegst du
   `abgenommen` von Hand am Gerät und schreibst dazu, womit.
5. **Abschnitt 4 und 6 aus dem konkreten Fall füllen**: was dieser Kunde ausdrücklich
   nicht bekommt, und welche Erweiterungen bei der Übergabe installiert sind. Steht keine
   drin, schreibst du `keine`, nicht nichts.
6. **Abschnitt 7 messen**, nicht abschreiben. Eine absolute Aussage über Verbindungen nach
   außen ist mit einem einzigen Gegenbeispiel widerlegt.
7. **Abschnitt 8 mit dem Kunden durchgehen.** Das sind Pflichten, die er selbst einrichtet,
   und er bestätigt sie im Übergabeprotokoll. Eine Liste, die er nie gelesen hat, hält bei
   der Abnahme nicht.

Fehlt dir für einen Wert die Quelle, weil der Spiegel nicht erreichbar ist und kein Gerät
antwortet: **sag es und schreib nichts hin.** Ein leeres Feld im Entwurf ist reparabel,
eine erfundene Fassungsnummer im unterschriebenen Papier nicht.

## Vorbehalte, die weiterwandern

Zwei Dinge stehen im Angebot und müssen im Kaufvertrag des Partners noch einmal stehen.
Nur im Angebot genügt nicht, weil das Angebot mit der Annahme aufgeht und der Vertrag
danach gilt.

- **Nicht erprobte Plattform.** Ist die angebotene Plattform in der Leistungsbeschreibung
  nicht als `live` ausgewiesen, gehört der Vorbehalt in das Angebot **und** in den
  Kaufvertrag. Ohne beides ist der Verkauf das Verschweigen eines offenbarungspflichtigen
  Umstands, § 444 BGB, und die Haftungsbegrenzung trägt dann nicht.
- **Vorserienstand.** Dass die Software laufend weiterentwickelt wird und was zum
  Zeitpunkt der Übergabe gilt, steht abschließend in der Leistungsbeschreibung. Der
  Verweis darauf gehört in den Vertrag, nicht nur ins Angebot.

## Aus Markdown wird PDF

Ein Kunde bekommt sein Angebot als PDF.

```
node .ara/tools/pdf.mjs customers/<kunde>/documents/JJJJ-MM-TT-angebot.md
node .ara/tools/pdf.mjs <datei> --check      nur prüfen, nichts drucken
```

Das Werkzeug nimmt das Logo aus `business/company.md`, wirft die HTML-Kommentare mit den
Prüflisten weg, wirft die Hinweisblöcke der Vorlage weg und **bricht ab, solange noch ein
Platzhalter in geschweiften Klammern im Text steht.** Das ist sein eigentlicher Zweck: ein
Angebot mit `{Betrag} Euro` beim Kunden ist der Fehler, den es verhindert.

Bleibt eine geschweifte Klammer mit Absicht stehen, geht `--force`. Dann hast du es
entschieden, und die Warnung steht trotzdem im Protokoll.

**Jede Anlage wird einzeln gedruckt.** Sie sind einzeln Vertragsbestandteil, werden
einzeln versioniert und der Kunde legt sie einzeln ab.

## Wohin es abgelegt wird

Alles unter `customers/<kunde>/documents/`, ein Datum im Dateinamen, Markdown und PDF
nebeneinander. Aufbau der Kundenakte: `.ara/knowledge/customer-file.md`.

Das Markdown bleibt liegen. Ein halbes Jahr später fragt jemand, was zugesagt wurde, und
dann ist die Quelle mehr wert als das PDF.

## Zwei Papiere heißen fast gleich

`.ara/vorlagen/uebergabeprotokoll.md` ist das rechtliche Papier mit Unterschrift.
`.ara/templates/handover.md` ist die technische Abnahme aus dem Laufzettel. Beide
entstehen bei derselben Übergabe, keines ersetzt das andere. Näheres in
`.ara/vorlagen/README.md`.
