> **Vorlage: Angebot des Partners.**
>
> **Der Absender ist dein Unternehmen, nicht Arasul.** Alles im Briefkopf kommt aus
> `business/company.md`, das `/init` gefuellt hat: `legal_name`, `address`,
> `phone`, `email`, `website`, `vat_id`, `iban`, `payment_terms`, `hourly_rate`,
> `hardware_markup`, `logo`. Der Name unter der Unterschrift ist `name` aus
> `business/profile.md`. Kein Wert davon wird aus dem Gedaechtnis geschrieben.
> Fehlt ein Feld, wird es dort nachgetragen und nicht hier erfunden.
>
> **Preise kommen aus deiner Kalkulation.** Deine Einkaufspreise stehen im
> Abschnitt "Einkaufspreise" von `business/company.md` und die verbindliche
> Quelle dafuer ist das Partnerportal. Rechnen macht der Skill `pricing`.
> **Deine Einkaufspreise und deine Marge duerfen in diesem Dokument nirgends
> auftauchen**, auch nicht in einem Kommentar, auch nicht in einer Zwischenzeile.
> Was der Kunde sieht, sind deine Verkaufspreise.
>
> **Produktwerte kommen aus dem Spiegel oder vom Geraet**, nie aus dieser
> Vorlage: `node .ara/tools/mirror.mjs`. Modellnamen, Plattformbezeichnungen,
> Fassungen und Erprobungsstaende gehoeren dazu.
>
> Platzhalter in geschweiften Klammern werden ersetzt. `node .ara/tools/pdf.mjs`
> weigert sich, ein PDF zu erzeugen, solange noch einer drinsteht.
>
> Das Verfahren, in welcher Reihenfolge welches Papier entsteht:
> `.ara/knowledge/paperwork.md`.

---

**{legal_name}** · {address}\
{phone} · {email} · {website} · USt-IdNr. {vat_id}

**Angebot {Angebotsnummer}**\
Datum: {JJJJ-MM-TT} · Gueltig bis: {JJJJ-MM-TT, Vorschlag 30 Tage}

An\
{Firma}\
{Ansprechpartner}\
{Strasse}\
{PLZ Ort}

## Worum es geht

{Zwei bis drei Saetze. Was der Kunde erreichen will, in seinen Worten, nicht in
Produktsprache. Kommt aus dem Gespraech und steht in seiner Akte und in
customers/<kunde>/history/.}

## Leistungen

| Pos | Leistung | Menge | Einzelpreis netto | Gesamt netto |
| --- | --- | --- | --- | --- |
| 1 | {Hardware, falls ueber mich beschafft} | 1 | {Betrag} Euro | {Betrag} Euro |
| 2 | Arasul-Lizenz, einmalig und unbefristet, an das Geraet gebunden | 1 | {Betrag} Euro | {Betrag} Euro |
| 3 | Installation und Datenanbindung, {n} Tage vor Ort | 1 | {Betrag} Euro | {Betrag} Euro |
| 4 | Schulung, ein Tag vor Ort | {0 oder 1} | {Betrag} Euro | {Betrag} Euro |
| 5 | Wartung und Sicherheits-Updates, erstes Jahr | 1 | {Betrag} Euro | {Betrag} Euro |
| | **Summe netto** | | | **{Betrag} Euro** |

Die Wartung im ersten Jahr ist im Paketpreis enthalten (Position 5). Ab dem
zweiten Jahr betraegt sie {Betrag} Euro netto pro Jahr, jaehrlich mit einer Frist
von drei Monaten zum Ende der Laufzeit kuendbar.

Alle Betraege netto. Die Umsatzsteuer wird nach den geltenden Saetzen
hinzugerechnet. Bei Unternehmen aus dem EU-Ausland mit gueltiger USt-IdNr. gilt
das Reverse-Charge-Verfahren.

## Was enthalten ist

- {Konkret. Was der Kunde nach der Installation tun kann}
- {Was mit seinen Daten passiert und wo sie liegen}
- {Wie er Updates bekommt und von wem}
- Meine Betreuung als sein Ansprechpartner. Er hat mit dem Hersteller keinen
  Vertrag, sondern mit mir

## Was nicht enthalten ist

- {Ehrlich und vollstaendig. Diese Liste verhindert Streit}
- Bauliche oder netzwerkseitige Vorbereitungen beim Kunden
- Laufender Betrieb und Weiterentwicklung eigener Ablaeufe
- Erweiterungen und Software Dritter, siehe Ziffer 7 der Endkundenbedingungen

## Voraussetzungen beim Kunden

- {Strom, Netzwerk, Stellplatz, Kuehlung}
- Ein Ansprechpartner mit Entscheidungsbefugnis
- {Zugang zu den anzubindenden Systemen}

## Zeitplan

| Schritt | Wann |
| --- | --- |
| Auftragsbestaetigung | nach Annahme dieses Angebots |
| {Hardwarelieferung} | {Frist} |
| Installation vor Ort | {Frist} |
| Uebergabe und Abnahme | {Frist} |

## Anlagen

Diesem Angebot liegen bei und werden Vertragsbestandteil:

1. **Leistungsbeschreibung**, erhoben am {JJJJ-MM-TT} gegen {den Spiegelstand
   oder das angebotene Geraet}. Sie beschreibt abschliessend, was die Software
   zum Zeitpunkt der Uebergabe kann und was nicht Vertragsgegenstand ist
2. **Endkundenbedingungen**. Sie muessen dem Kunden **vor** Vertragsschluss
   vorliegen, sonst sind sie nach § 305 Abs. 2 BGB nicht einbezogen
3. **Drittlizenzen**
4. **Nachweis: Einstufung nach der KI-Verordnung.** Wer nach
   VO (EU) 2024/1689 Anbieter, Betreiber und Haendler ist, und welche Pflichten
   daraus folgen
5. **Nachweis: was das Geraet verarbeitet und was es nach aussen gibt.**
   {Gemessen am {JJJJ-MM-TT} am gelieferten Geraet. | Die Messung nach
   Abschnitt 3 des Nachweises erfolgt bei der Uebergabe, das Ergebnis wird
   nachgereicht.}

## Vorbehalte

Dieses Angebot ist freibleibend, soweit einzelne Positionen nicht ausdruecklich
als verbindlich bezeichnet sind. Termine im Zeitplan sind unverbindliche
Zielangaben, sofern sie nicht ausdruecklich als verbindlich vereinbart wurden.

**Entwicklungsstand.** Die Software befindet sich im Vorserienstand und wird
laufend weiterentwickelt. Was sie zum Zeitpunkt der Uebergabe kann, steht
abschliessend in der Anlage "Leistungsbeschreibung" und wird bei der Uebergabe
vorgefuehrt. Funktionen, die dort als "Vorschau" ausgewiesen sind, sind nicht
Vertragsgegenstand. Die Software ist dafuer bestimmt, Arbeitsvorgaenge mit
menschlicher Letztentscheidung zu unterstuetzen, nicht dafuer, einen
Arbeitsvorgang ohne Rueckfallebene zu tragen. Naeheres regelt Ziffer 4 der
Endkundenbedingungen.

Die gelieferte Hardware bleibt bis zur vollstaendigen Bezahlung mein Eigentum.

Die Lieferung von Hardware steht unter dem Vorbehalt richtiger und rechtzeitiger
Selbstbelieferung. Ich informiere den Kunden unverzueglich ueber eine
Nichtverfuegbarkeit und erstatte bereits geleistete Zahlungen. Erhoehen sich
zwischen Angebot und Auftragsbestaetigung meine Bezugskosten der Hardware um mehr
als fuenf Prozent, bin ich berechtigt, den Preis entsprechend anzupassen; der
Kunde kann in diesem Fall vom Vertrag zuruecktreten.

{Nur wenn Position 1 eine Plattform enthaelt, die in der Anlage
"Leistungsbeschreibung" Abschnitt 2 nicht als erprobt ausgewiesen ist, sonst
streichen:}
Die Plattform "{Plattform}" ist bislang nicht auf echter Hardware erprobt worden.
Fuer diese Plattform wird keine bestimmte Leistungsfaehigkeit, Kompatibilitaet
oder Funktionsfaehigkeit der Arasul-Software zugesichert. Der Kunde erwirbt sie
in Kenntnis dieses Umstands. Derselbe Vorbehalt gehoert in den Kaufvertrag, den
du mit dem Kunden schliesst.

Die Software erzeugt Ausgaben mit statistischen Verfahren. Ausgaben koennen
unrichtig sein, auch wenn sie plausibel wirken. Eine Zusicherung der inhaltlichen
Richtigkeit wird nicht abgegeben. Eine bestimmte Verfuegbarkeit, Antwortzeit oder
Reaktionszeit wird nicht zugesagt. Es gelten die Zweckbestimmung und die
ausgeschlossenen Verwendungen nach Ziffer 5 der Endkundenbedingungen.

## Zahlung

{Zahlungsziel und Aufteilung. Vorschlag: 50 Prozent bei Auftrag, 50 Prozent nach
Abnahme. Zahlungsziel aus `payment_terms` in business/company.md.}

Rechnungen sind ohne Abzug innerhalb von {payment_terms} Tagen ab Zugang zur
Zahlung faellig. Bei Zahlungsverzug gelten die gesetzlichen Regelungen.

Bankverbindung: {iban}

---

Mit freundlichen Gruessen\
{Unterschriftsname}\
{legal_name}

<!--
PRUEFLISTE, VOR DEM VERSENDEN ABARBEITEN:
- [ ] Briefkopf, USt-IdNr., IBAN und Unterschrift aus business/company.md
      gelesen, nicht aus dieser Vorlage und nicht aus dem Gedaechtnis
- [ ] Kein Einkaufspreis und keine Marge im Dokument. Auch nicht in einer
      Zwischensumme, aus der sich beides zurueckrechnen laesst
- [ ] Anlage 1 "Leistungsbeschreibung" erzeugt, gegen den Spiegel dieser
      Sitzung, mit Datum. Ohne sie ist das Angebot unvollstaendig und die
      Beschaffenheit nicht vereinbart
- [ ] Anlage 2 "Endkundenbedingungen" beigefuegt UND der Kunde ausdruecklich
      darauf hingewiesen, vor Vertragsschluss. § 305 Abs. 2 BGB
- [ ] Anlage 3 "Drittlizenzen" beigefuegt und ihre Sperre beachtet
- [ ] Anlage 4 "Nachweis KI-Einstufung" beigefuegt und das Abrufdatum der
      Rechtsquellen am Ende des Blattes geprueft. Recht aendert sich, das Blatt
      nicht von allein
- [ ] Anlage 5 "Nachweis Datenverarbeitung" beigefuegt und Abschnitt 3 entweder
      am Geraet gemessen oder ausdruecklich als noch zu messen gekennzeichnet.
      Unausgefuellt und unkommentiert beigelegt ist er ein leeres Blatt, dem
      geglaubt wird
- [ ] Plattform und Erprobungsstand frisch aus dem Spiegel, nicht abgeschrieben
- [ ] Steht eine Plattform drin, die in der Leistungsbeschreibung nicht als
      erprobt gefuehrt wird? Dann ist der Vorbehaltsabsatz unter "Vorbehalte"
      ZWINGEND drin und derselbe Vorbehalt im Kaufvertrag mit dem Kunden ebenso.
      Ohne beides ist der Verkauf das Verschweigen eines
      offenbarungspflichtigen Umstands, § 444 BGB
- [ ] Wartungspreis Jahr 1 und ab Jahr 2 einzeln gerechnet. Sie sind
      verschieden, und in der Tabelle steht nur der erste
- [ ] Gueltigkeitsdatum gesetzt und als Wiedervorlage in customer.md eingetragen
- [ ] Kein {Platzhalter} mehr im Text. node .ara/tools/pdf.mjs prueft das
- [ ] Keine Gedankenstriche als Trenner, keine Emojis
-->
