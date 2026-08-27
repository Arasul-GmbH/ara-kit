> **Vorlage: Rechnung des Partners.**
>
> **Der Absender ist dein Unternehmen, nicht Arasul.** Alles im Briefkopf kommt
> aus `business/company.md`: `legal_name`, `address`, `phone`, `email`,
> `website`, `tax_number` oder `vat_id`, `iban`, `payment_terms`, `logo`. Kein
> Wert davon wird aus dem Gedaechtnis geschrieben. Fehlt einer, wird er dort
> nachgetragen und hier nicht erfunden.
>
> **Diese Vorlage fuellst du nicht von Hand.** Sie ist das Geruest, aus dem
> `node .ara/tools/invoice.mjs --customer <kunde> --new` einen Beleg macht: mit
> Nummer aus dem Nummernkreis, Positionen aus dem Angebot und gerechneten
> Summen. Von Hand bleibt, was nur du weisst, und das steht danach als
> Platzhalter drin.
>
> **Die Pflichtangaben nach § 14 UStG stehen unten als Pruefliste.** Sie wird
> vor dem Druck geprueft: `node .ara/tools/invoice.mjs --check <beleg.md>`.
> Fehlt eine Angabe, wird nicht gedruckt. Eine unvollstaendige Rechnung
> berechtigt den Kunden nicht zum Vorsteuerabzug, und das faellt bei ihm auf.
>
> Das Verfahren steht in `.ara/knowledge/invoicing.md`.

---

**{seller_legal_name}** · {seller_address}\
{seller_contact_line}\
{seller_tax_line}

**Rechnung {invoice_number}**\
Rechnungsdatum: {invoice_date} · Leistungszeitpunkt: {service_period}\
Faellig am: {due_date}

An\
{buyer_name}\
{buyer_contact}\
{buyer_street}\
{buyer_place}

## Leistungen

{positions}

{tax_lines}

{total_line}

{tax_note}

## Zahlung

{payment_note}

Bankverbindung: {seller_iban}

Bei Zahlungsverzug gelten die gesetzlichen Regelungen. Bitte gib die
Rechnungsnummer als Verwendungszweck an.

---

Mit freundlichen Gruessen\
{closing}

<!--
PFLICHTANGABEN NACH § 14 ABS. 4 UStG, VOR DEM DRUCK ABARBEITEN.
Geprueft wird das mit: node .ara/tools/invoice.mjs --check <beleg.md>

- [ ] Nr. 1: vollstaendiger Name und vollstaendige Anschrift des leistenden
      Unternehmers, aus business/company.md
- [ ] Nr. 1: vollstaendiger Name und vollstaendige Anschrift des
      Leistungsempfaengers, aus der Kundenakte
- [ ] Nr. 2: Steuernummer oder Umsatzsteuer-Identifikationsnummer
- [ ] Nr. 3: Ausstellungsdatum
- [ ] Nr. 4: fortlaufende Nummer, einmalig vergeben, aus dem Nummernkreis in
      business/invoices.md
- [ ] Nr. 5: Menge und Art der gelieferten Gegenstaende oder Umfang und Art der
      Leistung. "Beratung" allein genuegt nicht, es muss hervorgehen, was
      geleistet wurde
- [ ] Nr. 6: Zeitpunkt der Lieferung oder Leistung. Nicht dasselbe wie das
      Rechnungsdatum, auch wenn beides oft auf denselben Tag faellt
- [ ] Nr. 7: das Entgelt, aufgeschluesselt nach Steuersaetzen, und im Voraus
      vereinbarte Minderungen
- [ ] Nr. 8: Steuersatz und Steuerbetrag, ODER der Hinweis auf die
      Steuerbefreiung. Bei Kleinunternehmern: § 19 UStG. Bei Reverse Charge:
      Steuerschuldnerschaft des Leistungsempfaengers
- [ ] Zahlungsziel steht auf dem Beleg
- [ ] Kein {Platzhalter} mehr im Text
- [ ] Keine Gedankenstriche als Trenner, keine Emojis
-->
