# Procedure: a professional app, clients, four eyes, receipts, standards

> **When do you need this?** Next to `.ara/knowledge/app.md`, as soon as an app has clients or
> files, reads receipts, needs an approval the submitter does not give, or writes an export format
> of another vendor. Each section belongs in the plan as an answer or as an assumption.

## Clients: who sees what

**Who gets in** the device decides, **what somebody sees inside** the app: the device knows no
clients. **Clients are pattern 7**, under `.ara/templates/app-patterns/clients/`. **Take the
pattern, do not design it anew**: from a description the separation comes out different every time.
**Every table with client data carries the filter**, the log of a reading included: for patterns 2
and 6 pattern 8 does it. Checked with two accounts and two clients: every route once as the one who
may see nothing.

## Approvals in a professional app

**Two questions belong in the plan: when is an item complete, and who approves.** An office releases
a closing only when all documents are there, and only a partner releases it, not every colleague who
sees the client. An item comes into being **in work**, and `einreichen(id)` in the scaffold's core
asks `bereit` first: an item that is not complete stays in work without a run, with the sentence
what is missing. **After submitting nothing changes**: `darfAendern` holds only in work, patterns 2,
7 and 8 answer 409 to attaching, changing, deleting and reading anew.

**Seeing is not deciding.** Pattern 7 marks at each mapping whether the account decides, `regel`
returns four eyes and only the deciders of the item's client. If nobody remains, no run starts and
the item says why. The circle stands in `.ara/knowledge/platform-services.md`, "Permissions: a run
stops, a human decides". An account named there without the app released makes the device refuse
the start with 400, that sentence stands at the item. **A decision counts only from somebody still
deciding**: the device keeps the circle from the start, so the app checks the decider against the
mapping when catching up.

**How the scaffold carries it.** Submitter and rule go only when `arasul.json` says under `freigaben`
that the device takes them. `regel` returns the rule, a sentence starts no run; `zustaendig` checks a
decision; `VIER_AUGEN` in `server.mjs` excludes the submitter. The flow gets the item's number and
the submitter, nothing else. After the approval the app asks for the flow's sentence until the run
is finished.

## Reading documents and images

The app sends the file and a JSON schema, the device lets a language model fill the fields: pattern
6 under `.ara/templates/app-patterns/extract/`. **The model sees text, not the image**: a photo or a
scan goes through the device's text recognition, and a blurred photo, handwriting, a stamp over the
figure cost fields.

**The form of the answer stands in the contract**: `--contract` lists under "What
`document/extract-structured` answers" every field with its type; `data` is an object or null, not
checked against your schema. For a photo the app may also ask an image model itself ("An image to a
model" in the contract); image models differ widely, so measure both ways. **Promise no image
understanding**, no handwriting, no photo of goods, before you have seen it on the customer's device.

**Which model reads, the answer says** (`model`). **The field `modelle` in `app.json` is a demand,
not a delivery**: the device installs no model, at the deploy it says which one is missing. Empty,
as in the scaffold, means none by name.

**The model suggests, the app checks, a human decides.** The app holds the fields against the
schema and its professional rules, a tax rate that does not fit, writes every finding onto the
reading, and starts a flow with an approval about it. Every reading is a new row in the log, never
changed. **The device logs these calls, with the human only if the app names them**: `nutzer`, the
name from `angemeldet`; `auftrag` ties a reading to that line. Half a minute is normal, minutes when
the model loads first.

## Professional standards

The DATEV booking batch (EXTF), a chart of accounts like SKR03, the GoBD, XRechnung: **not product
values**, so "not the internet" (`.ara/knowledge/live-knowledge.md`) does not hold, and neither
contract, device nor kit carries them. They come from their **primary source**, the publisher's
developer documentation, the letter of the Federal Ministry of Finance, the standard, **with address
and date of retrieval**, in the plan and in the header of the file that writes the format. A
repository or a blog serves for reading against. A source that loads in the browser only:
`.ara/knowledge/browser.md`.

**A CSV for Excel or the tax adviser** goes through `backend/kern/csv.mjs` of the scaffold: BOM,
semicolon, decimal comma, and a cell beginning with `=`, `+`, `-`, `@`, tab or CR gets an apostrophe
in front. **Retention duties**: a receipt that has to stay for years gets no deletion (pattern 2
brings one, take it out). How long the device keeps its backups stands in the admin handbook.

Whatever could not be checked stands as an assumption in the plan. **Before switching live** a
sample file goes to whoever processes it, the tax adviser with their import, and their answer is the
proof. A check script for the format lives in the app and runs at every export in staging. Promised
is not "GoBD compliant" or "DATEV certified", but what the app does: which format, which version,
traceable by what.
