# Evidence: the purchase path, step by step

> **When do you need this?** When somebody asks how a sale runs through the kit from the first
> request to the money, or when a step of it is changed and has to be proven again.

It is the path of a partner who sells an Arasul device to a customer. Every step names the
command, what it leaves behind and what the trial run showed. **The trial customer was PROBE-KW14**,
on 2026-10-14, in a throwaway house with invented numbers and a test bank number. No mail went out,
no account was created anywhere, the device was not touched. The self-test plays the same path
without a network: `node .ara/tools/selftest.mjs`, the check "Der Kaufweg ohne Netz".

## The steps

| No | Step | Command | What it leaves behind |
|---|---|---|---|
| 1 | The request arrives | by hand, in your words | nothing yet: the contact form of the website is the business of the website, not of the kit |
| 2 | Customer file | `node .ara/tools/customer.mjs --customer probe-kw14 --new --legal-name "PROBE-KW14 GmbH"` | `customers/probe-kw14/customer.md`. Street, postcode and city are filled in by hand, the invoice needs them |
| 3 | Is every price there | `node .ara/tools/calculation.mjs` | ten numbers or the list of missing ones |
| 4 | Offer as PDF | fill `.ara/vorlagen/angebot.md`, then `node .ara/tools/pdf.mjs <offer>.md` | the offer as PDF. It refuses while a placeholder stands in it |
| 5 | Licence code | see "The licence code" below | the level the device reports |
| 6 | Invoice as PDF | `node .ara/tools/invoice.mjs --customer probe-kw14 --new --from-offer <offer>.md`, `--check`, `--pdf` | invoice 2026-0001 with the data file inside, state `gestellt` |
| 7 | Payment received | `node .ara/tools/invoice.mjs --paid 2026-0001 --on <date>` | state `bezahlt` in `business/invoices.md`, with the date |
| 8 | Write along | a line in `customers/<customer>/history/`, status in the file | the history |

## What the trial run showed

- **Step 2.** The folder name has to be lower case: `PROBE-KW14` is refused, `probe-kw14` works,
  and `PROBE-KW14 GmbH` stays the legal name.
- **Step 4.** The offer is filled by Ara from the template, there is no command that writes it from
  the calculation sheet. That is on purpose, a person reads it before it goes out. The annexes 1 and
  5 need the mirror and the device (`.ara/knowledge/paperwork.md`), which a throwaway house does not
  have: they stayed open, and the trial offer says so in its own text.
- **Step 6.** An invoice made from the offer was complete after the customer's address was filled
  in. `--check` and `--validate` were green, the PDF carries the data file.
- **Step 7.** **This step was missing.** The number range knew `entwurf`, `gestellt` and
  `storniert`, and nothing for money. `--paid` is new: it only works on a number that stands as
  `gestellt`, takes the day of the receipt, and sets the state `bezahlt`. **The kit does not look
  at a bank account.** You note what you saw on your statement.

## The licence code

A bought code is the token from the portal (`ara_` and 32 characters). The kit trades it for a
licence that is bound to one device and plays it in: `node .ara/tools/device.mjs --name <device>
--license`, see `.ara/knowledge/device.md`, "The licence". That is a level 2 change on a real
device and was **not** done in the trial run.

What the trial run proved offline, in the self-test: the portal and the device are stand-ins, the
keys are made for the run. The portal hands out a licence for a fingerprint, the stand-in device
checks its signature itself and reports the level from it, and the kit's `unlock` says
"professional" and shows neither code nor licence. A licence changed afterwards (level
`enterprise` instead of `professional`) fails the check.

**What the kit cannot do:** make a real licence. Only the manufacturer has the private key, and it
lies in their keychain. A partner gets the code from the portal after buying.

## Open

- **A line in the history after a payment.** `--paid` reminds you, but writes nothing into
  `customers/<customer>/history/`. By hand for now.
- **The offer has no tool.** Fill in, check, print are three separate hands.
- **The unit in the invoice reads `Stueck`** with the ASCII spelling in the printed table. Not part
  of this job, noted.
