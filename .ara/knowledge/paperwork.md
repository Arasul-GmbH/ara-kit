# Procedure: the paperwork

> **When do you need this?** When an offer comes into being, when an annex gets filled in and when
> somebody asks which paper has to be at the customer at which point in time.

The paperwork itself is German. `.ara/vorlagen/` and `.ara/nachweise/` are contract text for the
DACH market and stay in that language, whatever language you speak with the human. This procedure
exists in both.

## The principle

What comes into being here gets signed. A number that is wrong in an offer is not an imprecision,
it is a promise that does not hold. That is why in every paper the rule from
`.ara/knowledge/live-knowledge.md` counts double: **no product value from memory and none because
it stands in a template.** Model names, platforms, versions and trial levels come from the mirror or
from the device.

And a second rule that only holds here: **the partner's purchase prices appear in no customer
document**, not even in a subtotal from which the margin can be worked back.

## Whose paper is whose

Two companies write paper, and they are easily mixed up.

| Paper | Sender | Where it lies |
|---|---|---|
| Offer to the end customer | **the partner** | `.ara/vorlagen/angebot.md` |
| Leistungsbeschreibung, Endkundenbedingungen, Drittlizenzen | the partner passes them on | `.ara/vorlagen/` |
| Nachweise on AI classification and data processing | Arasul writes them, the partner attaches them | `.ara/nachweise/` |
| Übergabeprotokoll | partner and customer sign | `.ara/vorlagen/uebergabeprotokoll.md` |
| Invoice to the end customer | **the partner** | `.ara/vorlagen/rechnung.md`, procedure in `.ara/knowledge/invoicing.md` |
| Partner contract, sales contract, data processing agreement | **Arasul** | not in the kit |

The last three lines are the most frequent mistake. **The partner contract is a paper the partner
receives from Arasul, not a template they fill in.** The same holds for the sales contract between
Arasul and a direct customer and for the data processing agreement under Art. 28 GDPR: there Arasul
is the processor, not the partner. Whoever looks for one of those in the kit is looking in the wrong
place and should ask Arasul.

The sales contract between the **partner** and their customer is the partner's business. The kit
does not deliver it, because it does not know under which terms the partner sells. What has to
appear in it from the offer stands below under "Reservations that travel on".

## The order

1. **Understand and calculate.** What the customer wants to achieve stands in their file and in
   `customers/<customer>/history/`. Calculating happens along `.ara/knowledge/pricing.md`, structure
   and tone along `.ara/knowledge/sales.md`.
2. **Fetch the mirror.** `node .ara/tools/mirror.mjs --refresh`. Without a fresh mirror no offer
   comes into being, because platform and trial level would otherwise be guessed.
3. **Fill in the Leistungsbeschreibung.** It comes before the offer, not after. It fixes what is
   owed, and the offer refers to it. Procedure below.
4. **Write the offer.** `.ara/vorlagen/angebot.md` as the scaffold, sender from
   `business/company.md`.
5. **Assemble the annexes.** Five, see below. All five, or the offer does not go out.
6. **Work through the checklists.** Every template carries an HTML comment with its own list at the
   end. The comment does not land in the PDF, the list is binding nevertheless.
7. **Produce the PDF.** `node .ara/tools/pdf.mjs <file>`. It refuses as long as a placeholder in
   curly braces still stands in the text.
8. **File and follow up.** Everything into `customers/<customer>/documents/`, status to `quoted`,
   validity date as a follow-up. See `.ara/knowledge/crm.md`.

Later, at the handover: Übergabeprotokoll and technical acceptance, see
`.ara/knowledge/handover.md`. And after that the invoice, see `.ara/knowledge/invoicing.md`: it is
the only paper in the kit that a law prescribes the contents of, and that is why it has a procedure
of its own.

## The five annexes to the offer

They become part of the contract. In this order, because the first fixes what is owed, and the last
two answer what the customer will ask.

| No | Annex | From | New per customer? |
|---|---|---|---|
| 1 | Leistungsbeschreibung | `.ara/vorlagen/leistungsbeschreibung.md` | yes, against mirror and device |
| 2 | Endkundenbedingungen | `.ara/vorlagen/endkundenbedingungen.md` | no, pass on unchanged |
| 3 | Drittlizenzen | `.ara/vorlagen/drittlizenzen.md` | no, pass on unchanged |
| 4 | Nachweis KI-Einstufung | `.ara/nachweise/ki-einstufung.md` | no, but check the retrieval date |
| 5 | Nachweis Datenverarbeitung | `.ara/nachweise/datenverarbeitung.md` | **yes, section 3 gets measured** |

**The two Nachweise are not trimmings.** In the partner survey of 24.08.2026 five out of six
respondents demand data protection documents and four out of six evidence on the AI Act. An offer
without them comes back with exactly those two questions, and then the partner is no longer
negotiating about benefit but about a gap.

`.ara/nachweise/` and `.ara/vorlagen/bausteine/` are mirrored from Arasul's control folder. **Do not
edit them here.** Whoever finds a mistake in them tells Arasul.

### What happens if one is missing

No formalities. What stands in this column is the consequence that actually occurs.

| Missing | What follows from it |
|---|---|
| Leistungsbeschreibung | The condition is not agreed. Then under section 434(2) no. 2 BGB what the customer was entitled to expect applies, in case of doubt what they saw in the demonstration. Four clauses of the contracts point into nothing |
| Endkundenbedingungen | They are not incorporated under section 305(2) BGB. With that the whole limitation of liability falls away, including the one in Arasul's favour. Supplying it afterwards does not help, the notice has to be given **before** the contract is concluded |
| Drittlizenzen | The clause on third-party components refers to an annex that does not exist. Third-party code under copyleft is delivered, and passing it on without the licence texts violates their terms |
| Nachweis KI-Einstufung | The customer asks their lawyer who is provider and who is deployer under Regulation (EU) 2024/1689. Until the answer comes, the offer lies there. And the partner does not learn that under Art. 25(1) they become the provider themselves if they sell under their own brand |
| Nachweis Datenverarbeitung | The customer's data protection officer asks where the data goes. Without the sheet there is only an assertion. That is the point at which a sovereign device looks like any cloud |

### The Nachweis Datenverarbeitung is a scaffold

`.ara/nachweise/datenverarbeitung.md` is **not a filled-in sheet.** Section 3 carries placeholders,
because the numbers are measured per delivery on the concrete device, with the commands that stand
there, and with a date and time.

**Whoever attaches the sheet unfilled attaches an empty sheet.** Worse still: it looks like evidence
and gets believed. Two ways, and you tell the partner which one you take:

- **Before the delivery**, there is no device yet: sections 1, 2, 4, 5 and 6 already apply, they
  describe the delivery state. Section 3 stays empty and gets marked with a line: measuring happens
  at the handover, the result will be supplied afterwards. That line is otherwise missing, and then
  the customer reads a placeholder as a statement.
- **At the handover**, the device stands there: section 3 gets measured and filled in. The result
  belongs into the Übergabeprotokoll, where it also stands whether remote access is set up directly
  or over the relay network. Section 5 depends on that answer.

## Filling in the Leistungsbeschreibung

It is the paper that protects the partner most, and the one with the most work. **It is never copied
out of an old offer.** An old trial level is a false promise at the next product version.

Two points in time, and they are different:

- **For the offer** it is taken against the mirror. In the header stands against what: the mirror
  version with a date, and the offered platform.
- **For the handover** it is checked against the delivered device. If something has shifted, a new
  version comes into being and it is attached to the Übergabeprotokoll. The version that is signed
  off is the one that is owed.

Seven steps:

1. **Take it on the device**, if there is one:

   ```
   node .ara/tools/service-description.mjs --customer <customer> --device <device>
   ```

   The tool creates the annex from the template and enters what the device answers: software
   version, contract version, the models that lie there, and the apps that stand on it. For every
   value it writes the source alongside, and what it could not measure stays a placeholder and gets
   named. **It fills in nothing that is a decision**: trial level, platform, connections to the
   outside and everything from the concrete case stay your work, and those are the steps after it.

   If no device stands there yet because it is only ordered, you create the annex by hand from
   `.ara/vorlagen/leistungsbeschreibung.md` and write into the header against what it was taken.
   Before the handover it gets taken again on the delivered device.
2. **Fetch the mirror**, `node .ara/tools/mirror.mjs --refresh`. Section 2 gets replaced completely
   out of it, the table in the template is a specimen with a date.
3. **Enter the platform** and read its trial level out of the mirror. If it does not say `live`
   there, the reservation is mandatory, see below.
4. **Set the trial level per functional area**, section 3. Every line gets one of the three levels,
   none stays empty. **`abgenommen` only for what really gets demonstrated at the handover.** A line
   that carries `abgenommen` here and does not appear there is a contradiction, and it works against
   whoever wrote it. What you cannot back on the device or in the mirror is `in Erprobung`, not
   `abgenommen`.
   For that there is `node .ara/tools/evidence.mjs`: it allows `abgenommen` only with a checked
   picture from the device and writes the annex into the customer file. As of 27.08.2026 incomplete:
   the tool runs, the steps in the browser are not described as a procedure, and it is assigned to no
   phase. Until then you back `abgenommen` by hand on the device and write down with what.
5. **Fill sections 4 and 6 from the concrete case**: what this customer explicitly does not get, and
   which extensions are installed at the handover. If none stands there, you write `keine`, not
   nothing.
6. **Measure section 7**, do not copy it. An absolute statement about connections to the outside is
   refuted by a single counter-example.
7. **Go through section 8 with the customer.** Those are duties they set up themselves, and they
   confirm them in the Übergabeprotokoll. A list they never read does not hold at the acceptance.

If you are missing the source for a value because the mirror is not reachable and no device answers:
**say so and write nothing down.** An empty field in a draft can be repaired, an invented version
number in the signed paper cannot.

## Reservations that travel on

Two things stand in the offer and have to stand once more in the partner's sales contract. Only in
the offer is not enough, because the offer is absorbed by the acceptance and the contract applies
afterwards.

- **Untried platform.** If the offered platform is not marked as `live` in the
  Leistungsbeschreibung, the reservation belongs into the offer **and** into the sales contract.
  Without both the sale is the concealment of a circumstance subject to disclosure, section 444 BGB,
  and the limitation of liability does not carry then.
- **Pre-series state.** That the software is being developed continuously and what applies at the
  time of the handover stands conclusively in the Leistungsbeschreibung. The reference to it belongs
  into the contract, not only into the offer.

## Markdown becomes PDF

A customer gets their offer as a PDF.

```
node .ara/tools/pdf.mjs customers/<customer>/documents/YYYY-MM-DD-angebot.md
node .ara/tools/pdf.mjs <file> --check      only check, print nothing
```

The tool takes the logo from `business/company.md`, throws away the HTML comments with the
checklists, throws away the template's note blocks and **stops as long as a placeholder in curly
braces still stands in the text.** That is its real purpose: an offer with `{Betrag} Euro` at the
customer is the mistake it prevents.

If a curly brace stays on purpose, `--force` works. Then you decided it, and the warning stands in
the log nevertheless.

**Every annex gets printed separately.** They are part of the contract individually, are versioned
individually and the customer files them individually.

## Where it gets filed

Everything under `customers/<customer>/documents/`, a date in the file name, Markdown and PDF side by
side. Structure of the customer file: `.ara/knowledge/customer-file.md`.

The Markdown stays. Half a year later somebody asks what was promised, and then the source is worth
more than the PDF.

## Two papers are called almost the same

`.ara/vorlagen/uebergabeprotokoll.md` is the legal paper with a signature.
`.ara/templates/handover.md` is the technical acceptance out of the runsheet. Both come into being at
the same handover, neither replaces the other. More in `.ara/vorlagen/README.md`.
