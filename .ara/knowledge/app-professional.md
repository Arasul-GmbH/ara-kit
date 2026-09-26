# Procedure: a professional app, clients, four eyes, receipts, standards

> **When do you need this?** Next to `.ara/knowledge/app.md`, as soon as an app has clients or
> files, reads receipts, needs an approval the submitter does not give, or writes an export format
> of another vendor. Each section belongs in the plan as an answer or as an assumption.

In a foreign test on 25.09.2026 an outside agent built an app for a tax office's receipts with
nothing but the kit and took a wrong turn at six places: data that stays, the header names fixed in
the source, and the four sections here.

## Clients: who sees what

**Who gets in** the device decides, **what somebody sees inside** the app: the device knows no
clients. **Clients are pattern 7**, under `.ara/templates/app-patterns/clients/`. **Take the
pattern, do not design it anew**: from a description the separation comes out different every time.
What it decides:

- **A mapping, not a second login**: per name from the login header, which clients it sees.
- **Only a name the app has seen can be mapped**, an app's key cannot list the device's accounts: a
  new employee opens the app once, then the management can map them.
- **The filter stands in the WHERE, not in a check afterwards.** The store is built per request for
  one name, a foreign client's item does not exist in it, and without a name it sees nothing.
- **Foreign means 404, not 403**, which would say that it exists. 403 only for the management.
- **Management only for a role the contract names**, one a rule may name as decider
  (`freigaben.rollen`) and the role header can carry (`koepfe.rollen`). If none fits, nobody
  manages, and the app says so.
- **The management sees items only of clients it is mapped to**, unless the plan says otherwise.
- **Every table with client data carries the filter.** Patterns 2 and 6 know no clients: in an app
  with clients their tables, the log of a reading included, get a column `mandant` in a migration
  of their own.

Checked with two accounts and two clients: every route once as the one who may see nothing.

## Approvals in a professional app

The circle of deciders stands in `.ara/knowledge/platform-services.md`, "Permissions: a run stops,
a human decides". **For a professional app pattern 7 returns the rule**: four eyes, the deciders
are the accounts mapped to the item's client, without the submitter. If nobody remains, no run
starts and the item says why. An account named there without the app released makes the device
refuse the start with 400, and that sentence stands at the item. **A decision counts only from
somebody still responsible**: the device keeps the circle from the start, so the app checks the
decider against the mapping when catching up. Who decides when only one person is mapped to a
client is a case for the plan.

**How the scaffold carries it.** It sends submitter and rule only when `arasul.json` says under
`freigaben` that the device takes them: an older device refuses unknown fields. `regel` in the core
returns the rule, a sentence instead starts no run; `zustaendig` checks a decision when catching up;
`VIER_AUGEN` in `server.mjs` excludes the submitter. An item demanding a rule the device cannot take
starts no run and says why: an approval anybody could see is worse than none. The flow gets the
item's number and the submitter, nothing else.

## Reading documents and images

The app sends the file and a JSON schema, the device takes the text out and lets a language model
fill the fields. The way stands in `arasul.json` under `wege.dokument_auslesen`, the code is pattern
6 under `.ara/templates/app-patterns/extract/`.

**The model sees text, not the image.** A PDF with a text layer the device reads directly, a photo
or a scanned PDF goes through its text recognition, and the answer says whether that ran. A
crooked, blurred photo, handwriting, a stamp over the figure cost fields. Measured on 25.09.2026 on
the Orin: an invented receipt as a PDF with a text layer, six of six fields in 35 seconds; an
invented fuel receipt as a photo, text recognition ran, six of six fields in 13 seconds.

**The form of the answer and the way for an image stand in the contract.** `--contract` lists
under "What `document/extract-structured` answers" every field with its type; `data` is an object
or null, not checked against your schema. "An image to a model" says how the app hands a photo to
an image model itself. On 26.09.2026 on the Orin, a fuel receipt as a photo: one image model six of
six fields, text recognition five, another image model two. For photos the app names the model and
measures both ways. **Promise no image understanding**, no handwriting, no photo of goods, before
you have seen it on the customer's device.

**Which model reads, the answer says** (`model`), and when reading a document the app names none. **The field `modelle` in
`app.json` is a demand, not a delivery**: the device installs no model, at the deploy it says which
one is missing. Empty, as in the scaffold, means none by name.

**The model suggests, the app checks, a human decides.** The app holds the fields against the
schema and its professional rules, an account missing from the chart, a tax rate that does not fit,
writes every finding onto the reading, and starts a flow with an approval about it. Every reading is
a new row in the log, with model, duration, text recognition and who triggered it, never changed,
also when the document goes. Half a minute is normal, minutes when the model loads first. Without the
scope the contract names the key gets a 403, a decision of the administrator.

## Professional standards

The DATEV booking batch (EXTF), a chart of accounts like SKR03, the GoBD, XRechnung: **not product
values**, so "not the internet" (`.ara/knowledge/live-knowledge.md`) does not hold, and neither
contract, device nor kit carries them. They come from their **primary source**, the publisher's developer documentation or
help centre, the letter of the Federal Ministry of Finance, the standard, **with address and date of
retrieval**, in the plan and in the header of the file that writes the format. A repository or a
blog serves for reading against and is named as such. A source that loads in the browser only:
`.ara/knowledge/browser.md`.

**Retention duties**: a receipt that has to stay for years gets no deletion (pattern 2 brings one,
take it out). How long the device keeps its backups stands in the admin handbook on the device.

Whatever could not be checked, a check program not at hand, a column two sources spell differently,
stands as an assumption in the plan. **Before switching live** a sample file goes to whoever
processes it, the tax adviser with their import, and their answer is the proof. A check script for
the format lives in the app and runs at every export in staging. Promised is not "GoBD compliant"
or "DATEV certified", but what the app does: which format, which version, traceable by what.
