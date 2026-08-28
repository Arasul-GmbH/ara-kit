---
description: Invoice as a ZUGFeRD PDF, with a number from the number range
argument-hint: <customer>
---

Invoice for: **$1**

Read `.ara/knowledge/invoicing.md` and work along it. What stands here is the way through
that procedure, not a second one beside it. Knowledge this command loads:
`.ara/knowledge/invoicing.md`, `.ara/knowledge/crm.md`, `.ara/knowledge/customer-file.md`.
Plus `business/profile.md` and `business/company.md` for the sender.

The invoice itself is German: it is a German tax document, and section 14 UStG is what it
has to satisfy. The conversation about it runs in the language of the profile.

From now on you work exclusively in `customers/$1/`. No look into other customer folders,
not even to take an old invoice as a pattern.

**No argument given:** first show the number range (`node .ara/tools/invoice.mjs`), then the
customers (`node .ara/tools/customer.mjs`), then ask who the invoice is for.

## The principle

An invoice is not a covering letter. If one of the mandatory details under section 14(4)
UStG is missing, it does not entitle the customer to deduct input tax. That shows up at
their end, not at yours, and then it comes back. That is why the checklist goes red
**before** the print, not after.

The number is assigned on creation and never wound back. A discarded draft is cancelled, not
deleted: otherwise the number range has a gap, and that is the first thing a tax auditor
looks for.

## The six steps

1. **Look at what is already there.**

   ```
   node .ara/tools/invoice.mjs --customer $1
   node .ara/tools/customer.mjs --customer $1
   ```

   The first says which numbers are assigned for this customer and which document is not
   printed yet. The second gives the picture: status, devices, paperwork, history. If an
   offer sits in `customers/$1/documents/`, that is the source of the line items.

2. **Clarify what is being billed**, in **one** interview round. What you can read from the
   file you do not ask. What only the human knows:

   - What the invoice is for: the whole offer, a part of it, a maintenance, hours.
   - **The date of supply.** The day on which delivery happened or the service was rendered,
     or the period. That is not the invoice date, even if both often fall on the same day.
     Section 14(4) no. 6 UStG demands it separately.
   - Whether a down payment has already been made.

3. **Create the document.** The number comes from the number range, the line items from the
   offer or from the command line:

   ```
   node .ara/tools/invoice.mjs --customer $1 --new --service-date YYYY-MM-DD
   node .ara/tools/invoice.mjs --customer $1 --new --from-offer customers/$1/documents/<file>.md
   node .ara/tools/invoice.mjs --customer $1 --new --position "Wartung 2026|1|Jahr|960,00"
   ```

   Without `--from-offer` the tool takes the most recent offer in the file. With `--empty` it
   takes none and creates one line to fill in. Small business rule and reverse charge over
   `--tax-mode`, payment terms over `--due` or `--terms`.

   **After that you read the document and fill in what only you know.** The tool calculates
   and enters what stands in the files. It invents no description of the service: "Beratung"
   alone does not satisfy the tax office, the line has to show what was delivered.

4. **Work through the checklist.**

   ```
   node .ara/tools/invoice.mjs --check customers/$1/documents/<document>.md
   ```

   Every line names its paragraph from section 14 UStG and, when it is red, what exactly is
   missing and where it belongs. If the customer's address is missing, it belongs into
   `customers/$1/customer.md` and not into the document: there it will be there next time.

5. **Print.** Only once the checklist is green:

   ```
   node .ara/tools/invoice.mjs --pdf customers/$1/documents/<document>.md
   ```

   That produces the PDF and hangs the invoice data into it as `factur-x.xml`, which is
   ZUGFeRD. Afterwards the tool reads the attachment back out of the finished PDF and checks
   it once more. What stays unchecked it says itself, and you pass that on instead of keeping
   quiet about it.

6. **Follow up.** Along `.ara/knowledge/crm.md`: entry in `customers/$1/history/` with
   `type: invoice`, `last_contact` to today, `follow_up` to the due date with half a sentence
   on what it is about. The number range then carries the document as `gestellt`.

## Nothing gets sent

Producing is free. **Sending is the partner's decision.** You present the finished PDF and
say what is still open. You send no mail and upload nothing.

## What this kit is not

Not an accounting system. It writes the invoice and keeps its number range, nothing more.
Incoming payments, dunning, VAT returns and the tax adviser keep running where they run
today. If somebody asks about that, say exactly this.

## The checklist

Present it to the human before anything goes out. Every line you did not check yourself, you
announce as unchecked.

- [ ] `node .ara/tools/invoice.mjs --check <document>` ran green, without `--force`
- [ ] The date of supply is the day of the service, not the invoice date
- [ ] Every line item says what was delivered, not just which pot it comes out of
- [ ] The amounts come from the offer or from a recorded service, none is estimated
- [ ] The customer's address from `customers/$1/customer.md`, not from memory
- [ ] Sender, tax number or VAT ID and IBAN from `business/company.md`
- [ ] The number stands in the number range, and it has no gap
- [ ] The PDF carries the attachment, and it could be read back
- [ ] History entry written, `follow_up` set to the due date
- [ ] No dashes as separators, no emojis
