# Procedure: the invoice

> **When do you need this?** At `/invoice`: write an invoice, check it and print it as a ZUGFeRD
> PDF. And whenever somebody asks about invoice numbers, mandatory details or the electronic
> invoice.

The invoice itself is German. It is a German tax document, the scaffold in
`.ara/vorlagen/rechnung.md` stays in that language, and section 14 UStG is what it has to satisfy.
The conversation about it runs in the language of the profile.

## The principle

An invoice is the only paper in the kit whose contents a law prescribes. Section 14(4) UStG lists
nine details. If one is missing, the invoice is not wrong in the sense of impolite, it is that the
customer may not deduct the input tax. They notice when their tax adviser checks it, and then it
comes back, with a question the partner does not want to answer.

That is why the same rule as for the offer applies here, only sharper: **nothing gets printed as
long as a mandatory detail is missing.** The tool stops, and it says which.

And a second rule: **the kit is not an accounting system.** It writes the invoice and keeps its
number range. Incoming payments, dunning, VAT returns and the tax adviser keep running where they
run today. Whoever expects more will be disappointed, and you had better say so beforehand.

## Only in the partner branch, and only when it is wanted

In the company branch there are no customers, so there are no outgoing invoices either. And a
partner does not get the command by itself either: `/init` asks whether the kit should produce
invoices, and only `invoice: yes` in `business/profile.md` creates `/invoice`. Whoever keeps writing
their invoices in their accounting software should do that. Two tools that both assign numbers are
worse than one.

To catch up when the decision falls later:

```
node .ara/tools/commands.mjs --apply
```

## The number range

It lies in `business/invoices.md` and belongs to the partner. Structure: `YYYY-NNNN`, every year
starts at `0001`, and there is no gap in between.

Three rules, and they are not up for discussion:

1. **Assignment happens when the document is created**, not when it is printed. A draft that never
   made it to the customer has used up its number nevertheless.
2. **An assigned number never disappears.** Whoever discards a document cancels the number:
   `node .ara/tools/invoice.mjs --void YYYY-NNNN --reason "…"`. The line stays and carries the
   reason.
3. **Nothing gets wound back.** If a smaller number stands in the header than in the list, or if a
   number is missing from the sequence, the tool assigns no number at all until it has been settled
   by hand. A gap in the number range is the first thing a tax audit looks for.

A document with a date from a year that has already been closed gets no number: it would otherwise
stand behind an older one.

## The nine mandatory details

That is the list from section 14(4) UStG, and it is exactly the list
`node .ara/tools/invoice.mjs --check` works through.

| No | What | Where it comes from |
|---|---|---|
| 1 | Name and full address of the supplying trader | `business/company.md` |
| 1 | Name and full address of the recipient | `customers/<customer>/customer.md` |
| 2 | Tax number or VAT ID of the supplier | `business/company.md` |
| 3 | Date of issue | the document |
| 4 | Sequential, uniquely assigned number | `business/invoices.md` |
| 5 | Quantity and kind of the delivery, extent and kind of the service | the line item table |
| 6 | Time of the delivery or the service | gets asked, see below |
| 7 | Consideration, broken down by tax rates | calculated from the table |
| 8 | Tax rate and tax amount, or a notice of the exemption | `tax_mode` in the document |
| 9 | Reductions of the consideration agreed in advance | only if there are any |

Plus, not from section 14 but without it nobody pays: **the payment terms**.

### The two that are missing most often

**The date of supply, no. 6.** It is not the invoice date. That both often fall on the same day does
not make it one detail. Ask for it, and write either one day (`--service-date`) or a period
(`--service-from`, `--service-to`).

**The kind of the service, no. 5.** "Beratung", "Dienstleistung", "wie besprochen" are not enough.
The line has to show what was delivered: which device set up, which maintenance for which period,
which training for how many people.

### Exemption instead of a tax statement

The tool knows three cases, over `tax_mode` in the document's header:

| `tax_mode` | When | What stands on the document |
|---|---|---|
| `standard` | the normal case | tax rate and tax amount per rate |
| `kleinunternehmer` | partner under section 19 UStG | no tax statement, notice of section 19 UStG |
| `reverse_charge` | customer in another EU country with a VAT ID | notice of the recipient's liability for the tax |

With the last two **no** tax amount may be stated. A small business owner who states VAT owes it
under section 14c UStG, even if they never meant to collect it.

## What ZUGFeRD is and why

Since 1 January 2025 every company in Germany has to be able to **receive** an electronic invoice.
The duty to issue one comes in stages from 2027, depending on turnover. A PDF alone is not an
electronic invoice: it is a picture of one.

ZUGFeRD solves that without anybody having to change anything. The invoice is a perfectly ordinary
PDF, and **inside the PDF sits a file** with the same numbers in machine-readable form, under the
standard EN 16931. The human sees the sheet, the accounting reads the file, nobody retypes anything.

**One document, one truth.** The tool reads the numbers for the file out of the same table that gets
printed. There is no second data set next to it that could drift apart. If somebody converts the
total by hand and forgets the table, it shows up before printing.

## The way through the tool

```
node .ara/tools/invoice.mjs                                 number range, open documents
node .ara/tools/invoice.mjs --customer <customer> --new      create a document, assign a number
node .ara/tools/invoice.mjs --check <document.md>            mandatory details under section 14 UStG
node .ara/tools/invoice.mjs --xml <document.md>              only write the invoice data
node .ara/tools/invoice.mjs --pdf <document.md>              print, attach the XML, record it
node .ara/tools/invoice.mjs --validate <file.pdf>            check a finished invoice
node .ara/tools/invoice.mjs --void <number> --reason "…"     cancel a number
```

`--new` takes the line items from the most recent offer in the customer file, from a particular one
(`--from-offer`), from the command line (`--position "Text|Quantity|Unit|Price"`, repeatable) or
none at all (`--empty`). It calculates line totals, tax per rate and the invoice amount, and it fills
the letterhead from `business/company.md` and the address from the customer file.

**What it does not fill stays as a placeholder.** Then `pdf.mjs` stops the print, as with every other
paper.

Filing happens to `customers/<customer>/documents/YYYY-MM-DD-rechnung-YYYY-NNNN.md`, Markdown and PDF
side by side. The Markdown stays: it is the source, the PDF is the printout.

## What stays unchecked

The self-test checks the produced invoice, and in doing so it says what it does **not** check. That
is not fine print, it is the part nobody may rely on:

| Checked | Not checked |
|---|---|
| The XML is readable | against the official XSD of UN/CEFACT. It is not shipped with the kit, and nothing gets fetched at runtime |
| The order of the elements is right against a model in the kit | the Schematron rules of KoSIT and the German additional rules BR-DE-* |
| The business rules of EN 16931, as far as they are checkable on the document: totals, tax per group, mandatory fields, code forms | the code lists in full length |
| The attachment can be read back out of the finished PDF and is the same one | the conformity of the PDF to PDF/A-3. That needs a validator like veraPDF |

**Why not more:** a complete validator for EN 16931 is freely available only as a Java program
(Mustang, KoSIT), and Java does not lie on every computer this kit runs on. Installing something
extra so that a self-test turns green would be the wrong trade. So the kit checks itself what it can
check, and names the rest.

**When it matters**, so before the first real customer receives an invoice: run a produced invoice
through an outside validator once. FeRD's ZUGFeRD validation service and veraPDF are the usual ones.
That is a matter of once, not of every document, and it is the partner's decision, because an invoice
leaves the house in doing so.

## What does not belong in the kit

- **Incoming invoices.** The kit writes outgoing invoices. What comes in belongs in the accounting.
- **Incoming payments and reminders.** The number range carries `entwurf`, `gestellt` and
  `storniert`, nothing more. Whether it was paid, the bank account knows.
- **The partner's purchase prices.** As in the offer: they appear in no customer document, not even
  in a subtotal.

## Related

- Offer and its annexes: `.ara/knowledge/paperwork.md`
- Customer file, where address and contact stand: `.ara/knowledge/customer-file.md`
- History and follow-up after sending: `.ara/knowledge/crm.md`
- Prices and what they yield: `.ara/knowledge/pricing.md`
