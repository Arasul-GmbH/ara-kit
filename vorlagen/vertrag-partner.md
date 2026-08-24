> Vorlage fuer den Reseller-Vertrag mit einem Partner.
>
> **Fassung 3 vom 24.08.2026.** Neu gegenueber Fassung 2: Ziffer 3 Zahlung und
> Verzug, Ziffer 8 Eigentumsvorbehalt, Ziffer 9 Entwicklungsstand als
> Beschaffenheitsvereinbarung, Ziffer 12 Erweiterungen, Aufrechnungsverbot und
> salvatorische Klausel in Ziffer 16. Die Betraege in Ziffer 5, 5a und 10 sind
> gesetzt. Die Anlage "Leistungsbeschreibung" existiert seit dem 24.08.2026.
>
> **Anwaltliche Pruefung.** Am 24.08.2026 bewusst zurueckgestellt,
> `company/risks.md` R4. Die Vorlage ist deshalb nicht auf das Maximum gezogen,
> sondern auf das, was ohne Pruefung traegt. Eine Klausel, die zu weit greift,
> wird nach staendiger BGH-Rechtsprechung nicht zurueckgeschnitten, sondern faellt
> ersatzlos weg, und dann gilt § 280 Abs. 1 BGB unbegrenzt.
>
> **Fuenf wortgleiche Bloecke W1 bis W5.** Quelle ist `vorlagen/bausteine/`,
> eingesetzt und geprueft mit `.claude/scripts/vertrag-bausteine.py`. Der Text
> zwischen den Markierungen wird **nicht von Hand geaendert**, sonst weicht er ab,
> und dann gilt nach § 305c Abs. 2 BGB die guenstigere Fassung.

---

# Reseller-Vertrag

zwischen

**Arasul**, Inhaber Kolja Schöpe, Seitenstraße 1, 01097 Dresden
(nachfolgend "Arasul")

und

**{Firma}**, {Rechtsform}, {Straße}, {PLZ Ort}, {Handelsregister}
(nachfolgend "Partner")

## 1 Gegenstand

Arasul räumt dem Partner das Recht ein, die Software Arasul an Endkunden zu
veräußern und bei diesen einzurichten. Der Partner erwirbt dafür eine kommerzielle
Lizenz nach Ziffer 3.

Vertragsbestandteile sind in dieser Rangfolge: dieser Vertrag, die Anlage
"Leistungsbeschreibung", die Anlage "Endkundenbedingungen" (`endkundenbedingungen.md`), die
Anlage "Drittlizenzen" (`drittlizenzen.md`). Bei Widersprüchen geht die
vorrangige Regelung vor.

## 2 Stellung der Parteien

Der Partner handelt in eigenem Namen und auf eigene Rechnung. Er ist kein
Handelsvertreter und kein Erfüllungsgehilfe von Arasul. Er gestaltet seine Preise
gegenüber Endkunden frei.

**Die Kundenbeziehung gehört dem Partner.** Arasul tritt nicht an Endkunden des
Partners heran, außer der Partner bittet darum.

Der Partner ist nicht verpflichtet, Arasul seine Kundendaten zu überlassen, weder
während der Vertragslaufzeit noch bei deren Ende. Arasul erhebt und speichert
keine Endkundendaten des Partners. Der Partner ist in der Gestaltung seines
Vertriebs, seiner Preise, seines Gebiets und seiner Kundenauswahl frei; Arasul
gibt weder Absatzziele noch Berichtspflichten vor. Erhält Arasul im Einzelfall
Kenntnis von Endkundendaten, so sperrt Arasul diese für eigene Zwecke und löscht
sie auf Verlangen des Partners.

Zwischen Arasul und den Endkunden des Partners kommt kein Vertragsverhältnis
zustande. Der Partner schuldet seinen Endkunden die Leistung im eigenen Namen.

## 3 Lizenz, Vergütung, Zahlung und Verzug

| Position | Betrag netto |
| --- | --- |
| Kommerzielle Lizenz, einmalig und unbefristet | {aus pricing.ts} Euro |
| Wartung und Sicherheits-Updates, jährlich | {aus pricing.ts} Euro |

Die Lizenz ist einmalig und unbefristet. Sie erlischt nicht, wenn die Wartung endet.

Rechnungen sind ohne Abzug innerhalb von 14 Tagen ab Zugang zur Zahlung fällig.
Bei Zahlungsverzug gelten die gesetzlichen Regelungen, insbesondere § 288 Abs. 2
und Abs. 5 BGB. Befindet sich der Partner mit einer fälligen Zahlung länger als
30 Tage in Verzug, ruhen die Rechte aus Ziffer 7 bis zum Ausgleich; bereits an
Endkunden ausgelieferte Systeme bleiben davon unberührt.

Ohne laufende Wartung entfällt der Anspruch auf funktionale Updates. Hiervon
unberührt bleibt die Bereitstellung solcher Sicherheitsaktualisierungen, zu denen
Arasul als Hersteller gesetzlich verpflichtet ist; diese werden auch nach Ende der
Wartung im gesetzlich vorgeschriebenen Umfang und Zeitraum bereitgestellt.

## 4 Vergütungsstruktur

**Die Vergütung des Partners entsteht ausschließlich aus dem eigenen Verkauf an
Endkunden.** Es gibt keine Provision, keine Prämie und keinen sonstigen Vorteil für
das Anwerben weiterer Partner. Ein mehrstufiges Vertriebssystem besteht nicht.

## 5 Pflichten des Partners

- Der Partner nutzt die aktuellen Unterlagen und Werkzeuge von Arasul, insbesondere
  das Ara-Kit, für Einrichtung und Betreuung
- Er sichert dem Endkunden nichts zu, was über den dokumentierten Leistungsumfang
  nach der Anlage "Leistungsbeschreibung" hinausgeht. Insbesondere gibt er keine
  Zusagen zu Verfügbarkeit, Reaktionszeiten, Antwortzeiten, Ausgabequalität oder
  zur Eignung für einen bestimmten Zweck ab
- **Er weist den Endkunden vor Vertragsschluss auf den Vorserienstand nach
  Ziffer 9 hin und übergibt ihm die Anlage "Leistungsbeschreibung"**
- Er verwendet die Marke Arasul nach den Vorgaben des Marken-Leitfadens
- Er vertreibt die Software nicht unter eigenem Namen, eigener Marke oder einem
  eigenen Erkennungszeichen und verändert sie nicht. Tut er es dennoch, gilt
  Ziffer 5a
- Er hält für seine Tätigkeit eine Berufs- oder Betriebshaftpflichtversicherung mit
  einer Deckungssumme von mindestens **250.000 Euro** je Schadensfall vor und weist
  sie auf Verlangen nach

### 5a Weitergabe in die Kette

Der Partner ist verpflichtet, mit jedem Endkunden vor Übergabe des Systems in
Textform die Anlage "Endkundenbedingungen" in der jeweils gültigen Fassung zu
vereinbaren, einschließlich der Beschaffenheitsvereinbarung, der Zweckbestimmung,
der ausgeschlossenen Verwendungen und der Haftungsbegrenzung, und die Vereinbarung
Arasul auf Anforderung nachzuweisen.

Für jeden Fall der schuldhaften Zuwiderhandlung gegen Satz 1 verspricht der
Partner eine Vertragsstrafe in Höhe von **5.000 Euro**, insgesamt begrenzt auf
**25.000 Euro** je Kalenderjahr. Die Geltendmachung eines weitergehenden Schadens
bleibt unberührt; die Vertragsstrafe wird angerechnet.

### 5b Freistellung

Der Partner stellt Arasul von allen Ansprüchen Dritter, insbesondere seiner
Endkunden, sowie von Bußgeldern und angemessenen Kosten der Rechtsverteidigung
frei, die darauf beruhen, dass der Partner

- über den in der Anlage "Leistungsbeschreibung" beschriebenen Leistungsumfang
  hinausgehende Zusagen gemacht hat,
- den Endkunden nicht auf den Vorserienstand hingewiesen oder ihm die Anlage
  "Leistungsbeschreibung" nicht übergeben hat,
- von den Vorgaben des Ara-Kit und der Produktdokumentation abgewichen ist,
- die Software verändert oder in eine nicht freigegebene Umgebung eingebracht hat,
- eine Erweiterung nach Ziffer 12 installiert, betrieben oder angebunden hat,
- die Endkundenbedingungen nach Ziffer 5a nicht vereinbart hat, oder
- die Software unter eigenem Namen oder eigener Marke in Verkehr gebracht hat.

Arasul zeigt dem Partner einen geltend gemachten Anspruch unverzüglich an und gibt
ihm Gelegenheit zur Stellungnahme und zur Abwehr.

### 5c Rollen nach der Verordnung (EU) 2024/1689

Ergänzend zu Ziffer 11 Absatz 6 gilt: Versieht der Partner das System mit seinem
Namen, seiner Marke oder einem anderen Erkennungszeichen, nimmt er eine wesentliche
Änderung vor oder ändert er die Zweckbestimmung so, dass das System zu einem
Hochrisiko-System wird, so stellt er Arasul insoweit nach Ziffer 5b frei.

## 6 Pflichten von Arasul

- Bereitstellung der Software zum Download über das Partnerportal
- Bereitstellung funktionaler Updates während der Laufzeit der Wartung
- Bereitstellung von Sicherheitsaktualisierungen nach Ziffer 3
- Bereitstellung von Verkaufs- und Einrichtungsunterlagen, einschließlich der
  Vorlage für die Anlage "Leistungsbeschreibung"

**Eine bestimmte Verfügbarkeit, Reaktions- oder Wiederherstellungszeit wird nicht
geschuldet.** Support erfolgt zu den auf der Partnerseite veröffentlichten Zeiten
nach Eingang. Service Level werden ausschließlich in einer gesonderten,
entgeltlichen Vereinbarung geschuldet.

Die Wartung nach Ziffer 3 ist ein Dienstvertrag über die Bereitstellung von
Updates und die Bereitschaft zur Fehlersuche. Ein bestimmter Erfolg, insbesondere
die Behebung eines konkreten Fehlers innerhalb einer bestimmten Frist, wird nicht
geschuldet.

## 7 Nutzungsrechte und Schutz

Arasul räumt dem Partner das nicht ausschließliche, auf die Laufzeit dieses
Vertrages befristete Recht ein, die Software zu vervielfältigen, soweit dies für
den Vertrieb an Endkunden und deren Einrichtung erforderlich ist, und sie an
Endkunden weiterzugeben.

Der Partner ist nicht berechtigt, den Quellcode weiterzugeben, die Software zu
dekompilieren (§ 69e UrhG bleibt unberührt), sie zu verändern, Schutzvermerke zu
entfernen oder Lizenzmechanismen zu umgehen. Die Auslieferung erfolgt
ausschließlich über den partnergebundenen Download; die Weitergabe des
Download-Tokens ist untersagt.

Arasul kann die Nutzungsrechte nach dieser Ziffer bei einem erheblichen Verstoß
nach vorheriger erfolgloser Abmahnung mit Frist widerrufen. Bereits an Endkunden
ausgelieferte Systeme bleiben davon unberührt.

Die Software enthält Bestandteile Dritter nach der Anlage "Drittlizenzen"; deren
Bedingungen gehen für den jeweiligen Bestandteil dieser Ziffer vor.

## 8 Eigentumsvorbehalt

{Nur aufnehmen, wenn Arasul dem Partner Hardware liefert. Wird ausschließlich die
Lizenz überlassen, entfällt Absatz 1 und 3 bis 6, Absatz 2 bleibt.}

(1) Gelieferte Hardware bleibt bis zur vollständigen Bezahlung aller Forderungen
aus der Geschäftsverbindung Eigentum von Arasul.

(2) Die Einräumung der Nutzungsrechte nach Ziffer 7 erfolgt aufschiebend bedingt
durch die vollständige Zahlung der Lizenzgebühr. Bis dahin gestattet Arasul die
Nutzung widerruflich.

(3) Der Partner ist berechtigt, die Vorbehaltsware im ordentlichen Geschäftsgang
weiterzuveräußern. Er tritt Arasul bereits jetzt die daraus entstehenden
Forderungen gegen seine Endkunden in Höhe des Rechnungswertes der Vorbehaltsware
ab; Arasul nimmt die Abtretung an. Der Partner bleibt zur Einziehung ermächtigt,
solange er seinen Zahlungspflichten nachkommt.

(4) Bei Verarbeitung oder Verbindung der Vorbehaltsware mit anderen Sachen erwirbt
Arasul Miteigentum im Verhältnis des Rechnungswertes.

(5) Der Partner behandelt die Vorbehaltsware pfleglich, hält sie gegen die üblichen
Risiken versichert und zeigt Zugriffe Dritter unverzüglich in Textform an.

(6) Übersteigt der Wert der Sicherheiten die gesicherten Forderungen um mehr als
zehn Prozent, gibt Arasul auf Verlangen des Partners Sicherheiten nach eigener
Wahl frei.

## 9 Entwicklungsstand und vereinbarte Beschaffenheit

**Wortgleicher Block W1.** Steht in `vertrag-endkunde.md` Ziffer 7 und `endkundenbedingungen.md`
Ziffer 4. Nicht von Hand ändern.

<!-- BAUSTEIN W1 -->
(1) Die Software befindet sich im Vorserienstand und wird laufend
weiterentwickelt. Ihre Beschaffenheit ergibt sich abschließend aus der Anlage
"Leistungsbeschreibung" in der bei Vertragsschluss geltenden Fassung. Diese
benennt je Funktionsbereich den Reifegrad sowie die Funktionen, die nicht
Vertragsgegenstand sind.

(2) Der Vertragspartner erwirbt die Software in Kenntnis dieses Standes. Eine
darüber hinausgehende Beschaffenheit wird nicht vereinbart, insbesondere nicht aus
Werbeaussagen, Bildschirmfotos, Vorführungen oder mündlichen Äußerungen.

(3) Die Software ist dafür bestimmt, Arbeitsvorgänge mit menschlicher
Letztentscheidung zu unterstützen. **Sie ist nicht dafür bestimmt, einen
Arbeitsvorgang ohne Rückfallebene zu tragen.** Der Betreiber hält für jeden
Vorgang, den er mit der Software unterstützt, ein Verfahren vor, das auch ohne sie
durchführbar ist.

(4) Für Zielplattformen, die in der Anlage "Leistungsbeschreibung" Abschnitt 2
nicht als erprobt ausgewiesen sind, wird keine Leistungsfähigkeit, Kompatibilität
oder Funktionsfähigkeit zugesichert.

(5) Funktionen, die in der Anlage "Leistungsbeschreibung" als "Vorschau"
ausgewiesen sind, sind nicht Vertragsgegenstand. Sie können ohne Ankündigung
geändert werden oder entfallen.
<!-- /BAUSTEIN W1 -->

## 10 Haftung

**Wortgleicher Block W2.** Steht in `vertrag-endkunde.md` Ziffer 9 und `endkundenbedingungen.md`
Ziffer 6. Nicht von Hand ändern.

Für die Haftung von Arasul gilt:

<!-- BAUSTEIN W2 -->
(1) Es wird unbeschränkt gehaftet für Vorsatz und grobe Fahrlässigkeit, für
Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit, nach dem
Produkthaftungsgesetz sowie im Umfang einer ausdrücklich in Textform übernommenen
Garantie.

(2) Bei leicht fahrlässiger Verletzung einer Pflicht, deren Erfüllung die
ordnungsgemäße Durchführung dieses Vertrages überhaupt erst ermöglicht und auf
deren Einhaltung der Vertragspartner regelmäßig vertrauen darf, ist die Haftung
der Höhe nach auf den bei Vertragsschluss vorhersehbaren, vertragstypischen
Schaden begrenzt, höchstens jedoch auf **50.000 Euro je Schadensfall und
100.000 Euro je Vertragsjahr**.

(3) Im Übrigen ist die Haftung für leicht fahrlässig verursachte Schäden
ausgeschlossen.

(4) Für Datenverlust wird nur in Höhe des Aufwands gehaftet, der bei
ordnungsgemäßer und regelmäßiger Datensicherung durch den Betreiber zur
Wiederherstellung erforderlich gewesen wäre. Der Betreiber ist für die Sicherung
seiner Daten selbst verantwortlich; die im Produkt enthaltene Sicherungsfunktion
entbindet ihn davon nicht.

(5) Ansprüche wegen Mängeln verjähren in zwölf Monaten ab Ablieferung, bei
Werkleistungen ab Abnahme. Absatz 1 bleibt unberührt.

(6) Die vorstehenden Beschränkungen gelten auch zugunsten der gesetzlichen
Vertreter, Mitarbeiter und Erfüllungsgehilfen.
<!-- /BAUSTEIN W2 -->

## 11 Zweckbestimmung und ausgeschlossene Verwendungen

**Wortgleicher Block W3.** Steht in `vertrag-endkunde.md` Ziffer 10 und
`endkundenbedingungen.md` Ziffer 5. Nicht von Hand ändern.

<!-- BAUSTEIN W3 -->
(1) Die Software erzeugt Ausgaben mit statistischen Verfahren. Ausgaben können
unrichtig, unvollständig oder irreführend sein, auch wenn sie plausibel wirken.
Eine Zusicherung der inhaltlichen Richtigkeit wird nicht abgegeben und ist
ausdrücklich nicht Vertragsgegenstand.

(2) Bestimmungsgemäße Zweckbestimmung ist die Unterstützung interner Büro-,
Dokumenten- und Automatisierungsvorgänge mit menschlicher Letztentscheidung.

(3) Der Betreiber ist verpflichtet, vor der Inbetriebnahme die in der Anlage
"Leistungsbeschreibung" Abschnitt 8 aufgeführten Schutzmaßnahmen einzurichten und
jede Ausgabe vor einer Verwendung, die rechtliche oder wirtschaftliche Wirkung
entfaltet, durch eine sachkundige Person zu prüfen. Er weist die Personen, die mit
dem System arbeiten, hierauf nachweislich hin und bestätigt die Einrichtung im
Übergabeprotokoll.

(4) Ausgeschlossen ist insbesondere der Einsatz zur Entscheidung oder Vorbereitung
von Entscheidungen über Einstellung, Beförderung, Kündigung oder Aufgabenzuweisung
von Beschäftigten, über Kreditwürdigkeit, Versicherungstarifierung, Zugang zu
Bildung oder Sozialleistungen, zur Rechtsberatung Dritter, zu medizinischer
Diagnose oder Therapie, sowie in sicherheitskritischen Steuerungen und als
Sicherheitsbauteil im Sinne des Anhangs I der Verordnung (EU) 2024/1689. Ebenfalls
ausgeschlossen sind die in Art. 5 der Verordnung (EU) 2024/1689 genannten
Praktiken.

(5) Bindet der Betreiber externe Modelle oder Dienste an, so ist er hierfür allein
verantwortlich, einschließlich Auswahl, Konfiguration, Rechtsgrundlage,
Drittlandübermittlung, Abschluss einer eigenen Vereinbarung zur
Auftragsverarbeitung und Einhaltung der Nutzungsbedingungen des Anbieters. Eine
Haftung für Verfügbarkeit, Kosten, Inhalte oder Rechtsfolgen solcher Anbindungen
besteht nicht. Diese Funktion ist optional und im Auslieferungszustand nicht
eingerichtet.

(6) Anbieter des KI-Systems im Sinne von Art. 3 Nr. 3 der Verordnung
(EU) 2024/1689 ist Arasul. Betreiber im Sinne von Art. 3 Nr. 4 ist, wer das System
unter eigener Verantwortung verwendet. Versieht ein Vertragspartner oder Betreiber
das System mit eigenem Namen, eigener Marke oder einem anderen Erkennungszeichen,
nimmt er eine wesentliche Änderung vor oder ändert er die Zweckbestimmung so, dass
das System zu einem Hochrisiko-System wird, so gilt er nach Art. 25 Abs. 1 der
Verordnung als Anbieter mit den daraus folgenden Pflichten. Diese Rechtsfolge
tritt kraft Gesetzes und ungeachtet abweichender vertraglicher Vereinbarungen ein.
<!-- /BAUSTEIN W3 -->

## 12 Erweiterungen

**Wortgleicher Block W4.** Steht in `vertrag-endkunde.md` Ziffer 11 und
`endkundenbedingungen.md` Ziffer 7. Nicht von Hand ändern.

<!-- BAUSTEIN W4 -->
(1) Die Plattform sieht vor, dass eigene Erweiterungen und Software Dritter
gebaut, installiert und angebunden werden. **Erweiterungen sind nicht Bestandteil
der Lieferung**, auch dann nicht, wenn die Plattform ihre Installation vorsieht
oder erleichtert. Welche Erweiterungen bei Übergabe installiert sind, weist die
Anlage "Leistungsbeschreibung" Abschnitt 6 aus.

(2) Wer eine Erweiterung installiert, betreibt oder anbindet, ist für sie allein
verantwortlich, einschließlich Auswahl, Lizenzierung, Konfiguration, Betrieb,
Aktualisierung, Datenschutz und Rechtsgrundlage. Für Erweiterungen wird weder
Funktion noch Verfügbarkeit noch Verträglichkeit mit künftigen Fassungen der
Software geschuldet; eine Haftung für sie besteht nicht.

(3) Führt eine Erweiterung zu einem Fehler, ist die Fehlersuche nur im Rahmen
einer gesondert zu vereinbarenden Leistung geschuldet. Es kann verlangt werden,
dass ein Fehler zunächst ohne Erweiterungen nachgestellt wird.

(4) Wer eine Erweiterung installiert, betreibt oder anbindet, stellt Arasul von
Ansprüchen Dritter frei, die darauf beruhen.
<!-- /BAUSTEIN W4 -->

## 13 Komponenten Dritter

**Wortgleicher Block W5.** Steht in `vertrag-endkunde.md` Ziffer 12 und
`endkundenbedingungen.md` Ziffer 8. Nicht von Hand ändern.

<!-- BAUSTEIN W5 -->
Die Software enthält Bestandteile Dritter, die eigenen Lizenzbedingungen
unterliegen. Diese sind in der Anlage "Drittlizenzen" aufgeführt und gehen für den
jeweiligen Bestandteil den Regelungen dieses Vertrages vor. Für Bestandteile
Dritter gelten Gewährleistung und Haftung nur im Umfang der jeweiligen
Drittlizenz; eine darüber hinausgehende Haftung wird nicht übernommen. Der
Quellcode der unter Copyleft-Lizenzen stehenden Bestandteile wird von Arasul auf
Anforderung in Textform bereitgestellt.
<!-- /BAUSTEIN W5 -->

## 14 Laufzeit und Kündigung

Der Vertrag beginnt mit Unterzeichnung und läuft auf unbestimmte Zeit. Die Lizenz
nach Ziffer 3 ist von der Laufzeit unabhängig und bleibt bestehen.

Die Wartung nach Ziffer 3 hat eine Laufzeit von zwölf Monaten ab Vertragsbeginn
und verlängert sich um jeweils zwölf Monate, wenn sie nicht mit einer Frist von
drei Monaten zum Ende der Laufzeit in Textform gekündigt wird.

Der Vertrag im Übrigen kann von beiden Seiten mit einer Frist von drei Monaten zum
Quartalsende in Textform gekündigt werden. Das Recht zur außerordentlichen
Kündigung aus wichtigem Grund nach § 314 BGB bleibt unberührt.

**Folgen für bestehende Endkunden des Partners.** Endet dieser Vertrag, so bleiben
die Lizenzen der Endkunden, die der Partner bis dahin ausgeliefert hat, unberührt
und bestehen fort. Der Partner darf nach Vertragsende keine weiteren Systeme
ausliefern. Auf Wunsch eines Endkunden und mit dessen Zustimmung übernimmt Arasul
die weitere Bereitstellung von Updates gegen die dann geltende Wartungsgebühr; ein
Anspruch des Partners auf Vermittlung oder Vergütung entsteht dadurch nicht.

## 15 Datenschutz

Der Partner verarbeitet keine personenbezogenen Daten im Auftrag von Arasul.
Greift Arasul auf ein System zu, das der Partner betreut, so schließt der
Endkunde als Verantwortlicher mit Arasul die Vereinbarung nach `auftragsverarbeitung.md`.

## 16 Schlussbestimmungen

Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.

Ausschließlicher Gerichtsstand für alle Streitigkeiten aus und im Zusammenhang mit
diesem Vertrag ist Dresden, soweit der Partner Kaufmann, juristische Person des
öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen ist. Arasul bleibt
berechtigt, am allgemeinen Gerichtsstand des Partners zu klagen.

Der Partner kann nur mit unbestrittenen oder rechtskräftig festgestellten
Forderungen aufrechnen. Ein Zurückbehaltungsrecht steht ihm nur zu, soweit sein
Gegenanspruch auf demselben Vertragsverhältnis beruht.

Änderungen und Ergänzungen dieses Vertrages bedürfen der Textform. Das gilt auch
für die Änderung dieser Klausel.

Die Abtretung von Rechten aus diesem Vertrag bedarf der vorherigen Zustimmung der
anderen Partei. § 354a HGB bleibt unberührt.

Keine Partei haftet für die Nichterfüllung von Pflichten, die auf Umständen
außerhalb ihres zumutbaren Einflussbereichs beruhen, solange diese andauern.

Sollte eine Bestimmung dieses Vertrages unwirksam oder undurchführbar sein oder
werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.

---

Ort, Datum: {offen}

Arasul, Kolja Schöpe: ________________

{Firma}, {Vertreter}: ________________

<!--
PRUEFLISTE VOR DEM VERSENDEN:
- [ ] python3 .claude/scripts/vertrag-bausteine.py laeuft ohne Abweichung
- [ ] Anlage "Leistungsbeschreibung" beigefuegt. OHNE SIE SIND ZIFFER 9, 11 UND
      DIE PFLICHTEN IN ZIFFER 5 LEER
- [ ] Anlage "Endkundenbedingungen" (endkundenbedingungen.md) beigefuegt
- [ ] Anlage "Drittlizenzen" beigefuegt, keine Zeile mehr auf "offen"
- [ ] Preise frisch aus arasul-website/apps/web/lib/pricing.ts
- [ ] Ziffer 8: liefert Arasul Hardware an den Partner? Sonst kuerzen wie im
      Hinweis beschrieben

DIE GESETZTEN BETRAEGE, UND WORAUF SIE BERUHEN:
1. ZIFFER 10 ABSATZ 2, 50.000 je Fall und 100.000 je Vertragsjahr. Rund das
   Dreifache des groessten Auftragswerts (17.400 Euro netto laut pricing.ts,
   gelesen 22.08.2026). Niedriger waere angreifbar, weil unter dem
   vertragstypisch vorhersehbaren Schaden. ZWINGENDE VORAUSSETZUNG: die
   IT-Haftpflicht mit ausdruecklicher KI-Deckung ist abgeschlossen und deckt
   mindestens diese Summe. Ohne Police ist die Zahl das, was Kolja privat zahlt.
2. ZIFFER 5, Deckungssumme des Partners 250.000 Euro. Ueblicher Einstiegswert
   einer Betriebshaftpflicht; er soll den Partner tragfaehig machen, ohne kleine
   Systemhaeuser auszuschliessen.
3. ZIFFER 5a, Vertragsstrafe 5.000 Euro je Fall, 25.000 Euro je Kalenderjahr.
   Bewusst massvoll: eine ueberhoehte Vertragsstrafe faellt nach § 307 BGB, und
   dann bleibt gar keine. Der Jahresdeckel ist das, was sie haltbar macht.

WAS BEWUSST NICHT WEITER GEZOGEN WURDE:
- Keine salvatorische Ersetzungsklausel. Der Zusatz "an ihre Stelle tritt die
  Regelung, die dem wirtschaftlich Gewollten am naechsten kommt" ist in AGB der
  Versuch einer geltungserhaltenden Reduktion und kann selbst unwirksam sein
- Kein Mindestabnahmevolumen, keine Absatzziele, kein Reporting, keine
  Kundendatenpflicht. ZIFFER 2 IST BEWUSST SO GESCHNITTEN und bitte nicht
  aufweichen: sie vermeidet den Ausgleichsanspruch analog § 89b HGB
  (BGH VII ZR 315/13, VII ZR 25/08) und die Preisbindung nach Art. 4 lit. a der
  Vertikal-GVO (EU) 2022/720
- Der Begriff "Kardinalpflicht" ist vermieden und ausformuliert, weil er nach
  BGH intransparent ist

OFFEN, WENN SPAETER DOCH EIN FACHANWALT DRAUFSIEHT:
- Ob die Vertragsstrafe in Ziffer 5a in dieser Form im B2B haelt
- Ob zusaetzlich Partner-AGB als eigenes Dokument noetig sind, R4
- Ziffer 3 Absatz 4 betrifft das Geschaeftsmodell: die Pflicht zu
  Sicherheitsupdates haengt nach dem Cyber Resilience Act nicht daran, ob jemand
  die Wartung verlaengert hat. Ob die Formulierung genuegt, ist zu pruefen
-->
