# Pattern 8: receipts per client at an item

A receipt hangs at an item, belongs to its client, the device reads it, and nobody of another client
sees it. Needs patterns 2 and 7; pattern 6 only for the second way below. Index:
`.ara/knowledge/app-patterns.md`.

**Wiring**: `node .ara/tools/app.mjs --app <app> --add-pattern documents,clients,receipts`, then
`--build`. The tool copies the files, adds migration `040` (and `041` with pattern 6), puts the
routes before those of the clients, sets `bereit` and `argumente` in their lines, adds the receipts
to the details of an item and a page "Alle Belege", and points the flow's original at the receipt.

**Two ways to read a receipt.**

- **In the flow** (contract 14, no pattern 6): the device reads the receipt as the `original` of the
  step `lesen`, and the approval shows it beside the fields. The route `vorgaenge/<id>/beleg.<ending>`
  delivers the first receipt, and the flow argument `endung` (pdf, png or jpg) sets the ending, so a
  PDF and a phone photo both show right. Take this way when a person checks every receipt anyway.
- **In the app** (pattern 6, `--add-pattern extract`): the app reads before submitting, shows
  defects, keeps a log of every reading. Take it when the fields are needed before the approval,
  or on a device before contract 14.

**What holds**: the client comes from the item, never from the request. An item without a receipt
is not complete (`mitBeleg`, replace it with your list of expected documents). After submitting the
receipts are frozen: attaching, removing and reading anew get 409. A receipt is PDF, PNG or JPEG,
another format gets 415 with a sentence. Is the file missing, too large or unreadable, the device
calls no model and the run stops with an approval that names the reason; the limits stand in the
contract. Write no amounts or dates of the item into `auftrag`: the paper is the source.

**The list of receipts** (the page "Alle Belege") shows client and amount; the client wraps instead of ending in
"…". The amount comes from the result the device hands over after the check (`betragFeld` in
`server.mjs`, the field `betrag` by default), so before the check it shows a dash. **With pattern 9**
the account in the approval comes from its list, with names, and a changed account is asked back once.

**Checked by the self-test** against a played device: a foreign receipt, its bytes, its original and
its log 404; a receipt without an item 400; another format 415; PDF and photo reach the flow with
their ending; no submitting without a receipt; after submitting 409.
