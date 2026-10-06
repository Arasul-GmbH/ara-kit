# Pattern 8: receipts per client at an item

Patterns 2, 6 and 7 together: a receipt hangs at an item, belongs to its client, the device reads
it, and nobody of another client sees it. Index: `.ara/knowledge/app-patterns.md`.

**The files**: the migration `040`, a column `mandant` at documents and readings, `vorgang` at
documents; the stores of patterns 2 and 6 replaced by ones built per request for one view (a name,
or the management that sees every client), with
`nurZugeordnete` in every query; the routes in `backend/wege/belege.mjs`; `mitBeleg` in
`backend/kern/belege.mjs`; `BelegeAmVorgang` for the details of an item. **The client comes from
the item**, never from the request. A reading carries its own: its log stays when the document goes.

**An item without a receipt is not complete**: `mitBeleg` is the `bereit` of pattern 7, replace it
with your list of expected documents. **After submitting the receipts are frozen**: attaching,
removing and reading anew get 409, the decider approves what they saw.

**Wiring**: patterns 2, 6 and 7 first, then this folder over them. The head of
`backend/wege/belege.mjs` replaces the lines of patterns 2 and 6 in `server.mjs` and says the line
for `bereit`, the head of `frontend/src/seiten/belege.tsx` shows the line in `seiten/liste.tsx`.
`sicht: mandantenFall.sicht` in those lines lets the switch `alleSehen` of pattern 7 reach the
receipts too. Then `--build`. **With pattern 9** the account in the approval comes from its list
of accounts, with names, and a changed account is asked back once (`backend/kern/feldlisten.mjs`).

**The device reads the receipt itself** (from contract 14): the route that delivers the file
(the `original` of the flow) must hand out a **PNG, JPEG or PDF**, which
the device tells by the first bytes. Of a PDF it sees the first pages; how large a file may be and
how many pages, the contract says (`--contract`). The paper is the source of the fields: write no
amounts or dates of the item into the `auftrag` of the step. Is the file missing, too large or
unreadable, no model is called and the run stops with an approval that names the reason. With
`--felder` and `ergebnis_bestaetigen` the approval of the reading is the one check, always with the
fields, and the start hands a reference to the item along as the title, so two receipts of one client are told apart.

**Checked by the self-test** against a played device: a foreign document, its bytes, its reading and
its log 404; a receipt without an item 400; no submitting without a receipt; after submitting 409;
the reading reaches the device with its human.
