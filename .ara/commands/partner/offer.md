---
description: Offer with all five annexes, as Markdown and as PDF
argument-hint: <customer>
---

Offer for: **$1**

Read `.ara/knowledge/paperwork.md` and work along it. What stands here is the way through
that procedure, not a second one beside it. Knowledge this command loads:
`.ara/knowledge/paperwork.md`, `.ara/knowledge/leistungsbeschreibung.md`,
`.ara/knowledge/pricing.md`, `.ara/knowledge/sales.md`, `.ara/knowledge/crm.md`,
`.ara/knowledge/live-knowledge.md` for every product value. Plus `business/profile.md` and
`business/company.md` for sender and rates.

The paperwork itself is German. `.ara/vorlagen/` is contract text for the DACH market and
stays in that language, whatever language you speak with the human.

From now on you work exclusively in `customers/$1/`. No look into other customer folders,
not even to take an old offer as a pattern.

**No argument given:** list the customers, one line each with status and last contact
(`node .ara/tools/customer.mjs`), and ask who the offer is for. No file present: `/customer`
first.

## The principle, before the first number falls

What comes into being here gets signed. No product value from memory and none because it
stands in a template. Model names, platforms, versions and trial levels come from the mirror
or from the device.

**The partner's purchase prices appear in no customer document**, not even in a subtotal
from which the margin can be worked back.

## The nine steps

1. **Read the calculation sheet before you ask.**

   ```
   node .ara/tools/calculation.mjs
   ```

   It says which of the ten numbers are there, which are missing and what is not possible
   without them. If all are there, not a single one is asked for, and two offers by the same
   partner for the same device type land on the same numbers. If a blocking number is
   missing, the tool stops with return code 1: then it belongs **into the same interview
   round as step 2** and afterwards into the sheet via `/calculation`, with the date on
   which it was confirmed. A number that only stands in this one offer is gone again at the
   next.

   If the tool reports a number as stale, that is a hint and not a halt. Ask once whether it
   still holds, and write the answer into the sheet.

2. **Read the file.** `node .ara/tools/customer.mjs --customer $1` gives the picture:
   status, devices with their state, existing paperwork, last history entry. What the
   customer wants to achieve stands in `customers/$1/customer.md` and in the latest entries
   from `customers/$1/history/` in their own words, and exactly those belong later into the
   section "Worum es geht". If you are missing something only the human knows, ask it
   bundled in one round, not step by step.

   **What the offer is for, the file says along.** Setting up a device, an app, several
   apps, maintenance, or several of those together. If the file already holds a device, the
   setup for it is the normal case and you do not ask whether there should be one.

3. **Fetch the mirror.** `node .ara/tools/mirror.mjs --refresh`. Without a fresh mirror no
   offer comes into being, because platform and trial level would otherwise be guessed. If
   the mirror is not reachable, say so and write nothing down.

4. **Fill in the service description.** It comes **before** the offer, not after. It fixes
   what is owed, and the offer only refers to it. Without it no offer. It comes into being
   on the device and against the mirror, not at the desk, and never copied out of an old
   offer: an old trial level is a false promise at the next product version. The six steps
   are in `.ara/knowledge/paperwork.md` under "Die Leistungsbeschreibung füllen". Scaffold:
   `.ara/vorlagen/leistungsbeschreibung.md`.

5. **Calculate.** Along `.ara/knowledge/pricing.md`, with the numbers from step 1 and in the
   tone from `.ara/knowledge/sales.md`. **What is in the sheet is what gets calculated, and
   nothing is estimated.** The binding source for a purchase price is the partner portal.
   Maintenance year 1 and from year 2 are two different numbers, calculate both.

6. **Write the offer.** Scaffold `.ara/vorlagen/angebot.md`. Letterhead, VAT ID, IBAN and
   payment terms come from `business/company.md`, the name under the signature from
   `business/profile.md`. **The sender is the partner, not Arasul.** If a field is missing,
   it gets added in `business/company.md` and not invented in the offer.

7. **Assemble five annexes**, not three. They become part of the contract and are named one
   by one in the offer's section "Anlagen":

   | No | Annex | From |
   |---|---|---|
   | 1 | Leistungsbeschreibung | `.ara/vorlagen/leistungsbeschreibung.md`, new per customer |
   | 2 | Endkundenbedingungen | `.ara/vorlagen/endkundenbedingungen.md`, unchanged |
   | 3 | Drittlizenzen | `.ara/vorlagen/drittlizenzen.md`, unchanged |
   | 4 | Nachweis KI-Einstufung | `.ara/nachweise/ki-einstufung.md`, check the retrieval date |
   | 5 | Nachweis Datenverarbeitung | `.ara/nachweise/datenverarbeitung.md`, section 3 |

   `.ara/nachweise/` and `.ara/vorlagen/bausteine/` are mirrored from Arasul's control
   folder. **Do not edit them here.** Whoever finds a mistake in them tells Arasul.

   The Nachweis Datenverarbeitung is a **scaffold**, not a filled-in sheet. Section 3 is
   measured on the device per delivery. If no device stands there yet, it stays empty and
   gets a line saying that it will be measured at handover and the result supplied
   afterwards. Without that line the customer reads a placeholder as a statement.

8. **Produce PDFs**, for the offer and for **every annex separately**. They are part of the
   contract individually and are filed individually.

   ```
   node .ara/tools/pdf.mjs customers/$1/documents/YYYY-MM-DD-angebot.md
   node .ara/tools/pdf.mjs <file> --check      only check, print nothing
   ```

   The tool stops as long as a placeholder in curly braces still stands in the text. That is
   its purpose: `{Betrag} Euro` at the customer is the mistake it prevents.

9. **Present the checklist, file, follow up.** The checklist is below, and only after it is
   anything ready to send. Markdown and PDF sit next to each other in
   `customers/$1/documents/`, with the date in the file name. The Markdown stays: in half a
   year someone asks what was promised, and then the source is worth more than the PDF. Then
   along `.ara/knowledge/crm.md`: entry in `customers/$1/history/`, `last_contact` to today,
   `status` to `quoted`, `follow_up` to the validity date with half a sentence on what it is
   about.

## Nothing gets sent

Producing is free. **Sending is the partner's decision.** You present the finished paper and
say what is still open. You send no mail and upload nothing.

## The checklist

Present it to the human before anything goes out. Every line you did not check yourself, you
announce as unchecked.

- [ ] `node .ara/tools/calculation.mjs` ran, and every number in the offer comes from the
      sheet. None estimated, none invented for this one offer
- [ ] Letterhead, VAT ID, IBAN and signature read from `business/company.md`, not from the
      template and not from memory
- [ ] No purchase price and no margin in the document, not even in a subtotal
- [ ] Platform and trial level fresh from this session's mirror
- [ ] Annex 1 Leistungsbeschreibung produced, with date, against mirror or device. Without
      it the condition is not agreed, section 434(2) no. 2 BGB
- [ ] Annex 2 Endkundenbedingungen attached **and** the customer pointed to it before the
      contract was concluded. Supplying it afterwards does not help, section 305(2) BGB
- [ ] Annex 3 Drittlizenzen attached and its restriction observed
- [ ] Annex 4 Nachweis KI-Einstufung attached and the retrieval date of the legal sources at
      the end of the sheet checked. Law changes, the sheet does not change by itself
- [ ] Annex 5 Nachweis Datenverarbeitung attached and section 3 either measured on the
      device or explicitly marked as still to be measured
- [ ] Is a platform named in it that the service description does not carry as tried? Then
      the reservation paragraph is mandatory, in the offer **and** in the sales contract,
      section 444 BGB
- [ ] Maintenance year 1 and from year 2 calculated separately
- [ ] Validity date set and entered as `follow_up` in `customer.md`
- [ ] **`node .ara/tools/pdf.mjs` ran through without `--force`.** An offer that only prints
      with `--force` still contains a placeholder and does not get sent
- [ ] No dashes as separators, no emojis
