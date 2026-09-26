# Procedure: a professional app, clients, four eyes, receipts, standards

> **When do you need this?** Next to `.ara/knowledge/app.md`, as soon as an app has clients or
> files, reads receipts, needs an approval the submitter does not give, or writes an export format
> of another vendor. Each section belongs in the plan as an answer or as an assumption.

## Clients: who sees what

**Who gets in** the device decides, **what somebody sees inside** the app: the device knows no
clients. **Clients are pattern 7**, under `.ara/templates/app-patterns/clients/`, its sheet says
what it decides. **Take the pattern, do not design it anew**: from a description the separation
comes out different every time. **Every table with client data carries the filter**, the log of a
reading included: for patterns 2 and 6 pattern 8 does it. Checked with two accounts and two clients:
every route once as the one who may see nothing.

## Approvals in a professional app

**Two questions belong in the plan: when is an item complete, and who approves.** An office releases
a closing only when all documents are there, and only a partner releases it, not every colleague who
sees the client. An item comes into being **in work**, documents come and go, and `einreichen(id)`
in the scaffold's core asks `bereit` first: an item that is not complete stays in work without a
run, with the sentence what is missing. **After submitting nothing changes**: `darfAendern` holds
only in work, patterns 2, 7 and 8 answer 409 to attaching, changing, deleting and reading anew.

**Seeing is not deciding.** Pattern 7 marks at each mapping whether the account decides, `regel`
returns four eyes and only the deciders of the item's client, without the submitter. If nobody
remains, no run starts and the item says why. The circle stands in
`.ara/knowledge/platform-services.md`, "Permissions: a run stops, a human decides". An account named
there without the app released makes the device refuse the start with 400, that sentence stands at
the item. **A decision counts only from somebody still deciding**: the device keeps the circle from
the start, so the app checks the decider against the mapping when catching up.

**How the scaffold carries it.** Submitter and rule go only when `arasul.json` says under `freigaben`
that the device takes them. `regel` returns the rule, a sentence starts no run; `zustaendig` checks a
decision; `VIER_AUGEN` in `server.mjs` excludes the submitter. The flow gets the item's number and
the submitter, nothing else. After the approval the app asks for the flow's sentence until the run
is finished.

## Reading documents and images

The app sends the file and a JSON schema, the device takes the text out and lets a language model
fill the fields. The way stands in `arasul.json` under `wege.dokument_auslesen`, the code is pattern
6 under `.ara/templates/app-patterns/extract/`.

**The model sees text, not the image.** A PDF with a text layer the device reads directly, a photo
or a scanned PDF goes through its text recognition, and the answer says whether that ran. A
crooked, blurred photo, handwriting, a stamp over the figure cost fields.

**The form of the answer and the way for an image stand in the contract.** `--contract` lists
under "What `document/extract-structured` answers" every field with its type; `data` is an object
or null, not checked against your schema. "An image to a model" says how the app hands a photo to
an image model itself, in the scaffold `geraet.fragen` with `bilder`. For a photo the app names the
model and measures both ways: on the Orin one image model read six of six fields, another two. **Promise no image understanding**, no handwriting, no photo of goods, before
you have seen it on the customer's device.

**Which model reads, the answer says** (`model`), and when reading a document the app names none. **The field `modelle` in
`app.json` is a demand, not a delivery**: the device installs no model, at the deploy it says which
one is missing. Empty, as in the scaffold, means none by name.

**The model suggests, the app checks, a human decides.** The app holds the fields against the
schema and its professional rules, an account missing from the chart, a tax rate that does not fit,
writes every finding onto the reading, and starts a flow with an approval about it. Every reading is
a new row in the log, with model, duration, text recognition and who triggered it, never changed,
also when the document goes. **The device logs every model call as well, with the human only if
the app names them**: `geraet.auslesen` and `geraet.fragen` take `nutzer`, the name from
`angemeldet`, and pass it on as `--contract` says under "Who triggered a model call"; `auftrag`
ties a reading to that line. Half a minute is normal, minutes when the model loads first. Without the
scope the contract names the key gets a 403, a decision of the administrator.

## Professional standards

The DATEV booking batch (EXTF), a chart of accounts like SKR03, the GoBD, XRechnung: **not product
values**, so "not the internet" (`.ara/knowledge/live-knowledge.md`) does not hold, and neither
contract, device nor kit carries them. They come from their **primary source**, the publisher's developer documentation or
help centre, the letter of the Federal Ministry of Finance, the standard, **with address and date of
retrieval**, in the plan and in the header of the file that writes the format. A repository or a
blog serves for reading against and is named as such. A source that loads in the browser only:
`.ara/knowledge/browser.md`.

**A CSV for Excel or the tax adviser** goes through `backend/kern/csv.mjs` of the scaffold: BOM,
semicolon, decimal comma, and a cell beginning with `=`, `+`, `-`, `@`, tab or CR gets an apostrophe
in front, so it stays text. **Retention duties**: a receipt that has to stay for years gets no
deletion (pattern 2 brings one, take it out). How long the device keeps its backups stands in the admin handbook on the device.

Whatever could not be checked, a check program not at hand, a column two sources spell differently,
stands as an assumption in the plan. **Before switching live** a sample file goes to whoever
processes it, the tax adviser with their import, and their answer is the proof. A check script for
the format lives in the app and runs at every export in staging. Promised is not "GoBD compliant"
or "DATEV certified", but what the app does: which format, which version, traceable by what.
