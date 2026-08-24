> **Fassung 2 vom 24.08.2026.** Neu: Ziffer 7 Absatz 2 und Ziffer 11 sind
> gefuellt, mit Beleg statt mit einer Behauptung. Die anwaltliche Pruefung ist am
> 24.08.2026 bewusst zurueckgestellt worden, `company/risks.md` R4.
>
> **Diese Datei ist ab dem 22.08.2026 die einzige Quelle fuer die AVV.**
> Die Vorlage unter `arasul-jet/docs/legal/AVV_TEMPLATE.md` wird auf diese Fassung
> zurueckgeschnitten, nicht umgekehrt. Bis das geschehen ist, existieren zwei
> einander widersprechende Fassungen, und nach § 305c Abs. 2 BGB gilt dann die
> fuer den Kunden guenstigere, also die weitere.
>
> **Der Widerspruch, um den es geht.** Die dortige Fassung machte Arasul in ihrem
> § 2 zum Auftragsverarbeiter fuer den gesamten Regelbetrieb, einschliesslich
> Inferenz, Indexierung und Speicherung von Verlaeufen, auf Hardware, zu der
> Arasul im Regelfall keinen Zugang hat. Damit uebernahm Arasul Pflichten nach
> Art. 28, 32 DSGVO fuer einen Betrieb, den es weder steuert noch ueberwacht, und
> trat nach Art. 82 Abs. 4 DSGVO in die gesamtschuldnerische Haftung gegenueber
> Betroffenen ein. Diese Haftung ist im Aussenverhaeltnis weder abdingbar noch
> deckelbar. Richtig und zugleich guenstig ist die enge Fassung: wer eine Anlage
> verkauft, die der Kunde selbst betreibt, ist Lieferant, nicht
> Auftragsverarbeiter.
>
> Das Zurueckschneiden der dortigen Vorlage ist Aufgabe einer eigenen Sitzung im
> Produktrepo, nicht von hier aus. Siehe `../plans/2026-08-22-vertragswerk.md`.

---

# Vereinbarung zur Auftragsverarbeitung

nach Artikel 28 DSGVO

zwischen

**{Firma}**, {Straße}, {PLZ Ort} (nachfolgend "Verantwortlicher")

und

**Arasul**, Inhaber Kolja Schöpe, Seitenstraße 1, 01097 Dresden
(nachfolgend "Auftragsverarbeiter")

## 1 Gegenstand, Abgrenzung und Dauer

(1) Der Verantwortliche betreibt die Arasul-Anlage eigenverantwortlich auf eigener
Hardware in eigenen Räumen und eigenem Netz. **Arasul erbringt insoweit keine
Verarbeitung im Auftrag.** Für Verarbeitungen im Regelbetrieb, insbesondere für
Inferenz, Indexierung, Speicherung von Verläufen, Abläufen und Zugangsdaten, ist
Arasul weder Verantwortlicher noch Auftragsverarbeiter.

(2) Gegenstand dieser Vereinbarung ist ausschließlich die Verarbeitung, die
anlässlich eines vom Verantwortlichen im Einzelfall angeforderten Fernwartungs-,
Fehlersuch- oder Supportzugriffs anfällt. Jeder Zugriff wird vom Verantwortlichen
in Textform angefordert, technisch protokolliert und nach Abschluss beendet.

(3) Diese Vereinbarung gilt für die Laufzeit des Wartungsvertrages.

## 2 Art und Zweck der Verarbeitung

Zweck ist allein die Fehlersuche und Wiederherstellung des ordnungsgemäßen
Betriebs. Umfasst sind: Einsicht in Protokolldateien, Einsicht in
Konfigurationsdaten, Prüfung von Index- und Datenbankbeständen, Ausführung von
Diagnosebefehlen.

Nicht umfasst sind: Export von Inhaltsdaten, dauerhafte Speicherung außerhalb der
Infrastruktur des Verantwortlichen, Auswertung zu eigenen Zwecken, Training von
Modellen.

## 3 Art der Daten und Kategorien betroffener Personen

{Aus dem konkreten Fall ableiten. Bei Kanzleien, Praxen und Steuerberatungen
ausdrücklich benennen, dass besondere Kategorien nach Artikel 9 DSGVO und
Berufsgeheimnisse nach Paragraf 203 StGB betroffen sein können.}

Betroffene: {Beschäftigte des Verantwortlichen, dessen Kunden, dessen Lieferanten}

## 4 Weisungsbindung

Arasul verarbeitet die Daten ausschließlich auf dokumentierte Weisung des
Verantwortlichen. Die Anforderung eines Zugriffs nach Ziffer 1 Absatz 2 ist die
Weisung. Hält Arasul eine Weisung für rechtswidrig, teilt es dies unverzüglich mit.

## 5 Vertraulichkeit

Arasul verpflichtet die zur Verarbeitung befugten Personen auf Vertraulichkeit,
soweit sie nicht bereits einer gesetzlichen Verschwiegenheitspflicht unterliegen.
Derzeit ist dies ausschließlich der Inhaber.

## 6 Technische und organisatorische Maßnahmen (Art. 32 DSGVO)

Der Zugriff erfolgt verschlüsselt über {Zugriffsweg}. Zugriffe werden protokolliert
mit Zeitpunkt, Dauer und Anlass. Zugangsdaten werden in einem Schlüsselbund
gehalten und nicht im Klartext abgelegt. Nach Abschluss werden lokale Kopien und
Diagnoseausgaben gelöscht.

{Die vollständige Beschreibung ist als Anlage beizufügen. Sie beschreibt
Verfahren, keine Erfolgsgarantie. Werte werden aus der Live-Quelle geholt, nicht
abgeschrieben.}

## 7 Unterauftragsverarbeiter (Art. 28 Abs. 2 und 4 DSGVO)

(1) Arasul darf Unterauftragsverarbeiter nur mit vorheriger Genehmigung des
Verantwortlichen in Textform einsetzen.

(2) Derzeit eingesetzte Unterauftragsverarbeiter:

| Name | Leistung | Verarbeitung in | Grundlage |
| --- | --- | --- | --- |
| Tailscale Inc. | Vermittlungsnetz für den Fernwartungszugang. Verarbeitet Verbindungs- und Metadaten (Gerätekennungen, Adressen, Zeitpunkte der Verbindung), nicht die Inhaltsdaten der Anlage | Kanada, Vereinigte Staaten, Vereinigtes Königreich, Europäische Union | Standardvertragsklauseln nach Art. 46 Abs. 2 lit. c DSGVO, Bestandteil des Data Processing Addendum des Anbieters |

**Wird der Fernzugriff ohne Vermittlungsnetz eingerichtet**, also über eine
direkte, schlüsselbasierte Verbindung im Netz des Verantwortlichen, entfällt diese
Zeile ersatzlos und es wird kein Unterauftragsverarbeiter eingesetzt. Welcher Weg
im konkreten Fall gewählt wurde, ist im Übergabeprotokoll festgehalten.

Gewählter Weg in diesem Fall: **{direkt | Vermittlungsnetz}**.

Quelle für die Angaben zu Tailscale Inc.: `tailscale.com/legal/dpa`, abgerufen am
24.08.2026. Vor dem Versenden erneut prüfen, ob die Angaben noch stimmen.

(3) Arasul legt einem Unterauftragsverarbeiter durch Vertrag dieselben
Datenschutzpflichten auf, die in dieser Vereinbarung festgelegt sind, insbesondere
hinreichende Garantien für geeignete technische und organisatorische Maßnahmen.
**Kommt der Unterauftragsverarbeiter seinen Datenschutzpflichten nicht nach, haftet
Arasul gegenüber dem Verantwortlichen für dessen Verstöße in vollem Umfang.**

## 8 Unterstützung des Verantwortlichen (Art. 28 Abs. 3 lit. e und f DSGVO)

(1) Arasul unterstützt den Verantwortlichen mit geeigneten technischen und
organisatorischen Maßnahmen bei der Erfüllung von Anträgen betroffener Personen
auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und
Widerspruch nach Kapitel III DSGVO.

(2) Arasul unterstützt den Verantwortlichen bei der Einhaltung der Pflichten aus
Art. 32 bis 36 DSGVO, unter Berücksichtigung der Art der Verarbeitung und der
Arasul zur Verfügung stehenden Informationen.

(3) Arasul meldet dem Verantwortlichen jede Verletzung des Schutzes
personenbezogener Daten, die im Rahmen der Verarbeitung nach dieser Vereinbarung
eintritt, unverzüglich nach Kenntnisnahme, in der Regel innerhalb von 48 Stunden
an Werktagen.

## 9 Kontrollrechte (Art. 28 Abs. 3 lit. h DSGVO)

Arasul stellt dem Verantwortlichen alle Informationen zur Verfügung, die zum
Nachweis der Einhaltung der Pflichten aus Art. 28 DSGVO erforderlich sind, und
ermöglicht Überprüfungen einschließlich Inspektionen, die vom Verantwortlichen
oder einem von diesem beauftragten Prüfer durchgeführt werden, und trägt zu
diesen bei.

Überprüfungen werden mit angemessener Vorankündigung zu den üblichen
Geschäftszeiten durchgeführt und dürfen den Geschäftsbetrieb nicht unangemessen
beeinträchtigen.

## 10 Löschung und Rückgabe (Art. 28 Abs. 3 lit. g DSGVO)

Nach Beendigung dieser Vereinbarung löscht Arasul alle bei ihm im Rahmen des
Supports angefallenen Kopien, Protokolle, Diagnoseausgaben und Zugangsdaten
innerhalb von 30 Tagen, soweit keine gesetzliche Aufbewahrungspflicht besteht, und
weist dies auf Verlangen nach.

**Die Daten auf der Anlage des Verantwortlichen bleiben davon unberührt.** Sie
liegen in dessen Verfügungsgewalt. Arasul hat darauf nach Beendigung keinen
Zugriff und kann sie weder zurückgeben noch löschen. Für die Löschung stellt
Arasul das dokumentierte Werksreset-Verfahren bereit; die Durchführung obliegt dem
Verantwortlichen.

## 11 Drittlandübermittlung

Eine Übermittlung in ein Drittland findet im Rahmen der Verarbeitung nach dieser
Vereinbarung nur statt, soweit sie in Ziffer 7 Absatz 2 ausgewiesen ist.

Wird der Fernzugriff über das dort genannte Vermittlungsnetz geführt, werden dabei
Verbindungs- und Metadaten in die dort genannten Staaten übermittelt. Grundlage
sind die Standardvertragsklauseln nach Art. 46 Abs. 2 lit. c DSGVO. **Inhaltsdaten
der Anlage werden dabei nicht übermittelt**, weil sie die Anlage nicht verlassen.

Arasul selbst übermittelt keine Daten des Verantwortlichen in ein Drittland.

**Der Verantwortliche kann den Fernwartungszugang jederzeit selbst abschalten.**
Der Schalter wird bei der Übergabe gezeigt und im Übergabeprotokoll festgehalten.
Nach dem Abschalten findet keine Übermittlung mehr statt; Fernwartung ist dann
nicht mehr möglich.

## 12 Schlussbestimmungen

Es gilt das Recht der Bundesrepublik Deutschland. Änderungen bedürfen der
Textform. Bei Widerspruch zwischen dieser Vereinbarung und dem Hauptvertrag gehen
die Regelungen dieser Vereinbarung vor.

---

Ort, Datum: {offen}

{Firma}: ________________

Arasul, Kolja Schöpe: ________________

<!--
VOR DEM AUSFUELLEN:
- [ ] Ziffer 7 Absatz 2: den im konkreten Fall gewaehlten Weg eingetragen. Die
      Liste in der Fassung vor dem 22.08.2026 stand wortwoertlich auf "(keine)",
      und das war falsch. Steht das Vermittlungsnetz, bleibt die Tailscale-Zeile
      und ihre Angaben werden gegen tailscale.com/legal/dpa nachgeprueft. Steht
      der direkte Weg, faellt die Zeile ersatzlos
- [ ] Ziffer 11 stimmt zu Ziffer 7 Absatz 2. Eine absolute Negativaussage ist mit
      einem einzigen Gegenbeispiel widerlegt; danach ist die AVV falsch und der
      Kunde hat einen Anknuepfungspunkt fuer § 444 BGB
- [ ] Ziffer 3 aus dem konkreten Fall ausgefuellt
- [ ] Ziffer 6 Anlage beigefuegt, Werte aus der Live-Quelle
- [ ] Bei Berufsgeheimnistraegern zusaetzlich Verschwiegenheitsvereinbarung

WAS DER FACHANWALT ENTSCHEIDEN MUSS:
1. Ob die enge Fassung in Ziffer 1 traegt. Eine Quelle verneint das
   Auftragsverarbeitungsverhaeltnis bei On-Premise grundsaetzlich, eine andere
   bejaht es bereits bei blosser ZUGRIFFSMOEGLICHKEIT. Der Unterschied liegt am
   Fernwartungszugang. Fundstellen in ../plans/2026-08-22-vertragswerk.md.
2. Ob Einzelgenehmigung (Ziffer 7 Abs. 1) oder allgemeine Genehmigung mit
   Widerspruchsrecht gewaehlt wird. Die aeltere Fassung hatte beides
   nebeneinander, das geht nicht.
3. Ob die 48-Stunden-Frist in Ziffer 8 Abs. 3 richtig gewaehlt ist. Art. 33
   Abs. 2 DSGVO verlangt nur "unverzueglich". Die aeltere Fassung sagte 24
   Stunden und verschaerfte damit freiwillig gegenueber dem Gesetz, ohne
   Bereitschaft und ohne Vertretung.
-->
