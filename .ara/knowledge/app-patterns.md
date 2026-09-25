# Procedure: seven shapes of an app beyond the form

> **When do you need this?** In the interview, while the idea is still forming, and whenever
> somebody takes Arasul for a form tool. Whoever knows only the scaffold's item with its
> approval step builds forms. An app can do everything a program can do: the device brings
> the login, the permissions, the flows and the models, and the app brings the rest. Here are
> seven shapes that come up at almost every customer, each with code that runs.

## The rule first

**Arasul is the infrastructure underneath, not the app.** Showing a PDF, sending a mail,
calling a foreign service, putting a foreign tool behind the login: that is the app's own
doing, built by the partner. The product provides no service for it, and that is a decision
and not a gap. Everything an app is meant to cover in the long run, it covers itself.

Every pattern on this sheet points to code in the kit under `.ara/templates/app-patterns/`.
The files are dropped into an app that came from `--new`, and each says in its head where it
goes and how it is wired in. They were checked against the scaffold on 15.09.2026 and the
self-test runs them: the mail goes through a local relay, the foreign service is a local stub,
the documents go into the scaffold's backend, the manifest of the foreign container goes
through the manifest check. What they need from outside, a mail relay, a foreign address, a
registry, the **device** has to reach, and that is checked there and not assumed.

**Product values stay where they are.** None of these files carries a route, a header name or
an environment name of the device. What they need of it they get the way the scaffold does,
out of the arrangement the kit writes at deploy. Whatever the pattern needs from a foreign
tool, its documentation says, not this sheet.

| Pattern | What it shows | Where the code lies |
| --- | --- | --- |
| 1. Several routes with a sidebar | A page per area, the areas in the sidebar | The scaffold itself, `.ara/templates/app/frontend/src/app.tsx` and `rahmen/seitenleiste.tsx` |
| 2. Upload a document and show it | File in, bytes stored, PDF or image shown in the library's viewer | `.ara/templates/app-patterns/documents/` |
| 3. Send a mail from the backend | A mail to the customer's relay, values from the manifest | `.ara/templates/app-patterns/mail/backend/post.mjs` |
| 4. Call a foreign API from the backend | An address outside the device, with timeout and sentences for what went wrong | `.ara/templates/app-patterns/foreign-api/backend/fremd.mjs` |
| 5. A foreign container as an app | A finished image behind the device's login, no code of your own | `.ara/templates/app-patterns/foreign-container/` |
| 6. Read a document | A receipt goes to the device, fields come back, the app checks them, a log keeps every reading | `.ara/templates/app-patterns/extract/` |
| 7. Clients | Which account sees which client, a filter in every query, the deciders of an approval out of the mapping | `.ara/templates/app-patterns/clients/` |

## 1. Several routes with a sidebar

**That is the scaffold already.** An app from `--new` has two pages, the list and the form,
and the sidebar on the left names them. The pieces:

| Where | What |
| --- | --- |
| `frontend/src/app.tsx`, `Wege()` | One `Route` per page. The router hangs under the path the device gives, read in `rahmen/basis.ts` |
| `frontend/src/rahmen/seitenleiste.tsx` | The pattern `Seitenleiste` of the library: groups of entries, which one is active the app says, because it knows its router |
| `frontend/src/seiten/` | One file per page. A page draws, the data comes from a file next to it (`vorgaenge.ts`) |

**A new area is three steps**: a file under `seiten/`, a `Route` in `Wege()`, an entry in the
sidebar's groups. The documents page of pattern 2 is exactly those three steps, worked out.

Two rules hold while doing that, and both come from the scaffold:

- **The routes stay one level deep.** `/apps/<id>/dokumente`, not `/apps/<id>/dokumente/17`.
  The page refers to its bundles relatively, and a second level would send the browser one
  folder too deep. What points at a single thing belongs in the query: `dokumente?nr=17`.
  That is also why
  the selected row of a list stands in the address and not in the page's state: a link to it
  stays a link.
- **Below 900 pixels the sidebar becomes a sheet over the page**, and an entry closes it
  after the click. The pattern does that; the app only names the entries.

## 2. Upload a document and show it in the viewer

Since library version 4.1.0 the pattern `Dokumentanzeige` exists: a PDF with pages, zoom and
full screen, an image the same way. With it a document somebody uploaded is looked at on the
device instead of downloaded. The kit's scaffold carries that version, and `--new` lays it
down.

The code lies under `.ara/templates/app-patterns/documents/`, split the way the scaffold is:

| File | What it is |
| --- | --- |
| `backend/ablage/migrationen/002-dokumente.sql` | The table. Second migration, runs by itself at the next start |
| `backend/ablage/dokumente.mjs` | The store: the only SQL for documents. The list carries no bytes |
| `backend/kern/dokumente.mjs` | What is accepted: PDF and images, up to a limit. Sentences for what is not |
| `backend/wege/dokumente.mjs` | The routes. A file goes in raw as the body, the name in a header, the bytes come back with their type |
| `frontend/src/dokumente.ts` | Types and queries: list, upload, remove, the address of the bytes |
| `frontend/src/seiten/dokumente.tsx` | The page: `Dateiablage` takes the file, `Datenliste` shows what is there, `Dokumentanzeige` shows the chosen one |

**Wiring it in**: copy `backend/` and `frontend/` over the app's folders, three lines in
`server.mjs` (the head of `wege/dokumente.mjs` shows them), a `Route` and a sidebar entry
(the head of `seiten/dokumente.tsx` shows them), then `--build`.

What you have to know about the viewer, read in the library on 15.09.2026:

- `Dokumentanzeige` comes out of `@marken` like everything else. Its `quelle` is a `File`, a
  `Blob` or an address of the same origin. Without a source it shows its empty state.
- **Give it the `art`**, `pdf` or `bild`, when the source is an address: the viewer reads the
  kind off a file's type or an address's extension, and the address of the app's own bytes
  has none. The page takes the kind from the type the backend stored.
- `name` stands in the viewer's head, `hoehe` is the height of the box as a CSS value, and
  `kennzeichen` is the mark for a test.
- **The PDF library needs support files next to the built JavaScript**, a folder
  `pdf-dateien/` with worker, fonts and more. The scaffold's `vite.config.ts` lays it there
  at every build. Without it an image still shows, and a PDF ends in the error state. An app
  created before that version gets the library with `marken.mjs --sync` and needs the
  dependency and that plugin from the scaffold on top; both are named in the scaffold's
  `frontend/package.json` and `frontend/vite.config.ts`.
- `Dateiablage` shows a preview of the chosen file since 4.1.0 (`vorschau`). The documents
  page switches it off, because it shows what is stored, and two viewers on one page would
  be one too many.

**The bytes lie in the app's database**, next to the items, in a column of type `BYTEA`. On
the device that is the database the device gives the app, and it is the one place that
survives the next deploy; a folder in the container would be empty afterwards. Without a
device it is the scaffold's SQLite file, and that does not survive the next deploy. The limit is ten megabytes per file, set in the core and told to
the page; it hangs on the memory of the container in the manifest, and whoever raises the one
raises the other.

**What the device does with a document is a different matter.** Pulling text out of it,
reading it into fields: that the platform offers over the app's key, and pattern 6 builds on
it. The pattern here is the way to and from the human.

When you check it, check it in both themes and both widths, like every interface.

## 3. Send a mail from the backend

**There is no mail service on the device.** An app that wants to write to somebody speaks
to the customer's outgoing mail server itself, like every other program in their network.
The code lies under `.ara/templates/app-patterns/mail/backend/post.mjs`: SMTP in its plainest
form, without a package, enough for a text message to a relay. Its head shows how the core
gets it as a third connection next to the store and the device, and how a decided item
becomes a mail.

**The values stand in the manifest**, under `backend.umgebung`, and the device puts them into
the container: the host, the port, whether TLS is used and how, the sender address. The
file's head names them.

**The password does not.** The manifest lies in the package and in the partner's repository,
and a password there would lie in two places it does not belong. The way that works today
is a relay in the customer's network that accepts the device without a login, recognised by
its address; that is the usual case with a mail server in the house. If the outgoing server
demands a login, the app keeps the login in its own store, entered over a settings page of
its own, and hands it to the module; the device gives an app no place for a secret today.
A login without TLS the module refuses, because it would send the password in plain text.

Three things you settle in the interview and write into the plan:

- **Who gets the mail.** The login gives the app a name and no address. Either the app keeps
  a list of names and addresses, or the form asks for the address, or the mail goes to one
  fixed address. That is a decision of the customer.
- **When it goes.** After a decision, after a deadline, at the end of a run. The core knows
  the moment; the module only sends.
- **What happens when it does not go.** The module never throws: a mail that did not go out
  is a sentence at the item and not a crash of the app. The page shows the sentence.

**What was checked and what was not.** The self-test sends through a local relay and reads
the mail back. TLS and a login ran against nobody here: the first mail at the customer goes
to yourself, before a process hangs on it. Whether the device reaches the relay you check on
the device, over `remote.mjs`, not from your own computer.

For attachments, HTML or other login methods take a package such as `nodemailer`, put an
`npm ci` into the Dockerfile for it, and keep the module's interface: `senden` with
recipients, subject and text, back comes whether it went and otherwise the sentence.

## 4. Call a foreign API from the backend

An app looks something up outside the device: a postcode, an exchange rate, an order in a
foreign system. The code lies under `.ara/templates/app-patterns/foreign-api/backend/fremd.mjs`,
built like the scaffold's connection to the device: the core gets it handed in, calls
`rufen` with verb, path and body, and gets back the status, the content as JSON, or a
sentence about what went wrong. It never throws, and it waits ten seconds at most.

**From the backend, not from the browser.** The interface of an app runs in the device's
frame, and the device's security policy lets no call out of it. Besides, a key in the browser
is a key for everybody who opens the developer tools. The backend calls, the browser asks the
backend.

**The address stands in the manifest**, under `backend.umgebung`; the file's head names the
variable. **The key does not**, for the same reason as the password of pattern 3: the app
keeps it in its own store, or the service does without one. What the foreign service wants
in which header its documentation says, and the app builds that header; the module only
carries it.

Two things you check before you promise it:

- **Does the device reach the address.** A device in a customer's network does not always
  reach the internet, and a service does not always answer. Both are a sentence at the item.
  Check it on the device, over `remote.mjs`.
- **What leaves the device.** A postcode is nothing, a name with an order is personal data.
  That is the row "which data" in the interview checklist, and it stands in the plan and in
  the customer's file.

## 5. A foreign container as an app behind the login

A customer wants a tool that exists already, a small web application from a registry, and
they want it behind the device's login instead of open in the network. That is an app with
a backend and without an interface of its own: the tool is the backend. The example lies
under `.ara/templates/app-patterns/foreign-container/`, a manifest and a build plan of one
line.

**The device builds, it takes no finished image.** That stands in the rules of its contract,
and `--check` prints them; the kit refuses a manifest with `backend` and without `bauen`. An
image built elsewhere would be built for one architecture, and nobody would notice until it
does not start on the device. So the build plan for a foreign image is one line, `FROM` and
the image, and the device pulls it itself, for its own architecture. For that the device
has to reach the registry, and that you check there.

**In front of the container hangs the device's login.** Everything under the app's `api`
path goes through it: whoever has not been released for the app does not get through, and
whoever has arrives with their name and role in two headers, whose names stand in the
contract under `koepfe`. That is the whole point of the pattern: the tool gets a login it
never had, and the customer gets one login for everything.

Three things you read in the tool's documentation and write into the manifest, and this
sheet does not know them:

- **The port** the tool listens on, `ports.backend`.
- **A path that answers with 200 when it runs**, `backend.gesundheit`. The device's health
  check asks it.
- **Its settings**, `backend.umgebung`. Two matter here. The container sees its paths without
  the device's prefix: a request to `/apps/<id>/api/hallo` arrives as `hallo` at the root.
  A tool that has to know its public path gets it through its own setting. And a tool with
  a login of its own: pick one that trusts a header or needs none, otherwise the human logs
  in twice.

Add the memory under `ressourcen`: the example gets by with little, a tool with a database
of its own does not.

**Without an interface of its own the app has no page under `/apps/<id>/`.** Its address is
the `api` path. What the device's overview shows for such an app, and how the human gets
there, you check on the device. The design standard does not apply to it: it brings no
interface that could stand beside the device's. And to the licence it is an app like any
other: it takes a slot, the rules of the contract say so.

**What was checked and what was not.** The manifest went through the kit's manifest check
against a contract-shaped schema, and the build plan is a build plan. No foreign container
was deployed to a device for this sheet: the first one is a proof to write down in the
device's runsheet, with the tool, the version and what the overview showed.

## 6. Read a document

A receipt, an invoice, a form comes in as a PDF or a photo, and the app is to make fields out of
it: date, amount, issuer. **The device reads, the app checks, a human decides.** The pattern
presupposes pattern 2, its table and routes, and lays itself on top. The code lies under
`.ara/templates/app-patterns/extract/`:

| File | What it is |
| --- | --- |
| `backend/ablage/migrationen/003-auslesungen.sql` | The log: every reading one row, append only |
| `backend/ablage/auslesungen.mjs` | The store for it. It can create and read, it cannot change or delete |
| `backend/kern/auslesen.mjs` | `SCHEMA` and `ANWEISUNG` for the device, `pruefen` against the schema, `fachlich` for your own rules, and the sequence |
| `backend/wege/auslesen.mjs` | The routes: can the device read, trigger a reading, the log of a document |
| `frontend/src/auslesen.ts` | Types and queries |
| `frontend/src/seiten/auslesen.tsx` | The page: the document in the viewer, the fields next to it, the defects above, the log below |

**Wiring it in** works like pattern 2: copy the folders over the app's, the lines from the head of
`wege/auslesen.mjs` into `server.mjs`, **before** the routes of the documents, a `Route` and an
entry in the sidebar, then `--build`. The call to the device stands in the scaffold already,
`geraet.auslesen` in `backend/arasul.mjs`: it takes the way from `arasul.json`, sends the file as a
form with the schema and returns fields, model, duration and whether the text recognition ran.
**No route and no model name stands in the pattern**; the self-test holds it to that.

**Replace `SCHEMA`, `ANWEISUNG` and `fachlich`** with what your customer reads. The example reads a
receipt. A flat schema with `required` is the most reliable; a field the model would have to
guess is better left out, and the instruction tells it so.

What you need to know about it, measured on 25.09.2026 on the Orin with a probe out of the
scaffold, pattern 2 and this one:

- **A PDF with a text layer** the device reads directly: an invented receipt, six of six fields,
  35 seconds.
- **A photo or a scanned PDF** goes through the device's text recognition, and the model gets the
  recognised text, not the image: an invented fuel receipt as a photo, six of six fields,
  13 seconds. Handwriting and bad photos cost fields.
- **How long it takes** hangs on the model: if it is not loaded right now, the first reading takes
  minutes. The page says that the model is reading, and a second click starts no second reading.
- **The log is the traceability.** Every reading stays, also the one that did not succeed, also when
  the document goes: who triggered it, which model, how long, which fields, which defects. Whoever
  discards a reading triggers a new one.

What the field `modelle` in `app.json` is for, whether an image model has to be loaded and what you
promise a customer stands in `.ara/knowledge/app.md` under "Reading documents and images". In a
professional app fields become a suggestion, and a human decides about it: then the app starts a
flow with an approval, with a reference to the receipt and not with its content, see
"Approvals in a professional app" there.

**What was checked and what was not.** The self-test runs the pattern against a played device that
takes the file as a form: fields, a defect at the tax rate, an answer without fields, an error of
the device, the log after the document was removed. On the Orin it ran on 25.09.2026 as described
above. A reading with a model the customer chose themselves, and their real receipts, you check on
their device.

## 7. Clients: who sees what, and who decides

A tax office, a practice, an agency: several clients, and every employee sees only their own.
**The device decides who gets into the app, the app decides what somebody sees inside.** The
device knows no clients and should not know them. That separation is the one thing such an app
must not get wrong, and built from a description it comes out different every time. So it lies
here as code, and the plan takes it instead of describing it anew. The code lies under
`.ara/templates/app-patterns/clients/`:

| File | What it is |
| --- | --- |
| `backend/ablage/migrationen/004-mandanten.sql` | Clients, seen accounts, mappings, and a column `mandant` at the items |
| `backend/ablage/mandanten.mjs` | The store for all three, and `nurZugeordnete`, the filter as SQL for every other store |
| `backend/ablage/vorgaenge.mjs` | Replaces the scaffold's store of items: the same fields, and every query carries the filter |
| `backend/kern/mandanten.mjs` | Who manages, creating and mapping, the rule for the approval, whether a decider is still responsible |
| `backend/wege/mandanten.mjs` | The routes: clients, mappings, and the items with their client |
| `frontend/src/mandanten.ts` | Types and queries |
| `frontend/src/seiten/mandanten.tsx` | The management page, and `MandantWahl` for the form |

**Wiring it in**: copy the folders over the app's, the lines from the head of
`wege/mandanten.mjs` into `server.mjs`, **before** the routes of the items, a `Route` and an
entry in the sidebar that only the management sees, `MandantWahl` into `seiten/neu.tsx`; the
head of `seiten/mandanten.tsx` shows those lines. Then `--build`.

What the pattern decides, and why:

- **A mapping, not a second login.** Nobody logs in to the app. It keeps, for a name from the
  login header, which clients it sees. The header names stand in `arasul.json` under `koepfe`.
- **Only a name the app has seen can be mapped.** An app's key cannot list the device's accounts.
  The app notes every name that comes by, with the first and the last time, and the management
  chooses among those. A new employee opens the app once, then they can be mapped.
- **The filter stands in the WHERE, not in a check afterwards.** `nurZugeordnete` gives the
  condition as SQL, and the store of the items is built per request for one name. The list, the
  single item, the waiting ones, the writing: what belongs to a foreign client does not exist in
  it. Without a name it sees nothing.
- **Foreign means 404, not 403.** A 403 would say that the item exists. A 403 goes only to
  whoever calls the management without having it.
- **Management only for a role the contract names.** `verwaltungsRolle` takes the role that a
  rule may name as decider (`freigaben.rollen`), provided it can stand in the role header
  (`koepfe.rollen`). Whoever wants another names it, and that one too has to stand in
  `koepfe.rollen`. If none fits, nobody manages, and the app says so. The pattern types no role
  name.
- **The management sees items only of clients it is mapped to.** Maintaining mappings is not
  reading files. If the plan wants something else, it says so, and the store changes in one
  place.
- **The deciders come from the mapping.** `regel` gives the device four eyes and the accounts
  mapped to the item's client, without the submitter. If nobody remains, no run starts, and the
  item says why. Every account named there has to have the app released, otherwise the device
  refuses the start with 400, and that sentence stands at the item.
- **A decision counts only from somebody still responsible.** If a mapping ends while a run
  waits, the device keeps deciding by the circle from the start. When catching up, the app
  checks the name of the decider against the mapping, and a decision from outside it does not
  count.

**Patterns 2 and 6 know no clients.** In an app with clients their tables get a column
`mandant` in a migration of their own, and every query of their stores takes
`nurZugeordnete`, the log of a reading included. The self-test holds the store of the items to
that: every query that reads or writes items carries the filter.

**What was checked and what was not.** The self-test runs the pattern in the scaffold's backend
against a played device whose roles are called differently from the Orin's: two accounts, two
clients, the foreign item 404 in the list and alone, the management 403 for everybody without
the role, the rule with the deciders from the mapping, a decision from somebody no longer
responsible that does not count.

On 26.09.2026 a probe out of the scaffold and this pattern ran on the Orin, in staging, in the
device's PostgreSQL. Measured with two real account names in the headers the platform sets, asked
directly at the container, because nobody was released for the probe: each saw only their client,
the foreign item answered 404 in the list and alone, a submission for a foreign client 404, the
management 403 for the role `mitarbeiter` and open for `admin`, which the pattern took from the
contract. A client with only the submitter mapped started no run and said why. A start with a
decider from the mapping reached the device, and the device refused it with 400, because the
submitter did not have the app released; that sentence stood at the item. **A run that a mapped
decider approves was not seen on the device**: it needs a release for two accounts, and so a
session as administrator. That is the first proof on the customer's device, written into its
runsheet.

## What `/app` does with this

In the interview the wish is often small: "a form for the holiday request". Then name what
lies next to it, once and briefly: the request as a document, a mail when it is decided, a
lookup in the time-keeping, the tool the office uses anyway, a receipt the device reads, the
clients that must not see each other. The human says what they want,
and the plan names the pattern it uses, so the next one who opens it knows what to look for.
After `--new` the tool names this sheet for the same reason.
