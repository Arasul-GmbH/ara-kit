# Pattern 6: read a document

A receipt comes in as a PDF or a photo, and the app makes fields of it: date, amount, issuer. What
the device reads, what a model sees and what you may promise stands in
`.ara/knowledge/app-professional.md`, "Reading documents and images"; here stand code and wiring.
It lays itself on pattern 2 next door under `documents/`. Index: `.ara/knowledge/app-patterns.md`.

**The files**: the log as third migration, one row per reading, its store can create and read, never
change or delete; the core `backend/kern/auslesen.mjs` with `SCHEMA` and `ANWEISUNG`, `pruefen`
against the schema, `fachlich` for your own rules; the routes; the page with the document in the
viewer, the fields beside it, the defects above, the log below.

**Wiring** like pattern 2: copy the folders, the lines from the head of `backend/wege/auslesen.mjs`
into `server.mjs` **before** the routes of the documents, a `Route` and a sidebar entry, then
`--build`. The call to the device stands in the scaffold, `geraet.auslesen` in `backend/arasul.mjs`:
the way out of `arasul.json`, the file as a form with the schema, back come fields, model, duration
and whether the text recognition ran, and the human goes along for the device's log. **No route and
no model name stands in the pattern**, the self-test holds it to that. A photo can also go to an
image model itself: `geraet.fragen` with `bilder`, how stands in `--contract` under `bilder`.

**Replace `SCHEMA`, `ANWEISUNG` and `fachlich`** with what your customer reads. A flat schema with
`required` is the most reliable; a field the model would have to guess is better left out, and the
instruction says so. The page says that the model is reading, and a second click starts no second
reading. Whoever discards a reading triggers a new one: the log keeps every one.

**Checked**: the self-test against a played device, fields, a defect at the tax rate, no fields, a
device error, the log after the document went; the Orin on 25.09.2026 with a probe out of the
scaffold, pattern 2 and this one. The customer's model and real receipts you check on their device.
