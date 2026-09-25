# Procedure: building an app, from the first question to live

> **When do you need this?** When somebody wants something the product cannot do out of the box,
> and an app on a device should come out of it. How a finished package gets onto a device stands
> in `.ara/knowledge/deploy.md`; here stands how it comes into being in the first place.

## The life cycle

An app runs in a circle, and `/app` stands at every station:

1. **Plan.** There is no file. Interview along the checklist below, then the file from the
   scaffold and a plan under `plans/offen/`.
2. **Build.** A plan is active. First go through the assumptions in it, then build, then pack the
   package.
3. **Test.** The package goes to a device and lands in staging. The person from the business side
   tries it with a real login.
4. **Live.** A human switches over. The plan moves into `erledigt/`, the app's README gets
   written on.
5. **Next.** No plan open: show the situation, interview about an extension, new plan. The circle
   starts at 1.

**Where in the circle you stand, the tool says, not you:**

```
node .ara/tools/app.mjs --app <name>
```

It reads the file and names the next steps, each with the call for it. It does not list
everything that would be possible: a list of all possibilities is a manual and not a suggestion.
Tell the human what is due, in their words, and then call what the tool named.

**It also knows what it sent to a device itself**: which version stands in staging and which is
live, per app and device, out of the marker `.ara/state.json`. If the built version is already
live, it does not suggest `--check` and `--deploy` again, but the plan and the README. The marker
is the kit's note about its own doing and not information about the device: `--status` gives
that, and it asks there.

**The argument.** `/app <app>` means the app under `apps/<app>/`. If it is
missing: first the marker `.ara/state.json`, then the existing files. If there is exactly one,
take it. Otherwise ask through the interview tool.

## The interview checklist

Asking goes on until every point is answered or explicitly left open. What stays open becomes an
**assumption** and stands as such in the plan. Ask bundled, not one by one, and read
`business/profile.md` beforehand: what the house works with belongs in the first draft.

| What | Why it decides |
| --- | --- |
| **The work step behind it** | Not the wished-for solution. "We want a bot for holidays" means: somebody reads mails and enters them into a table |
| **Who uses it** | Who sees the app the customer decides on the device. But whether it is one, ten or a hundred decides the build |
| **Which data** | What goes in, what stays, what goes out. Name personal data explicitly |
| **The steps** | The sequence from the point of view of the human in front of it, one step per line |
| **Where a flow is needed** | Where a language model really does the work. What only shifts data back and forth is a program and not a flow |
| **Where a human decides** | Every place where a run should stop and wait for an approval, who decides there and who explicitly does not, the submitter for instance |
| **Who may see what** | Who gets into the app the device decides. Whether everybody inside sees everything or only their clients, departments, files, the app decides, and that stands in the plan. See "Visibility inside an app" |
| **What has to stay** | What has to survive a new version, a switch and a year, and what of it gets checked or proven. See "Data that stays" |
| **Which professional standards apply** | An export format, a chart of accounts, a retention rule. They come from their primary source, with the date of retrieval, see "Professional standards" |
| **Which shape it takes** | A form is rarely all of it: a document shown on the device, a mail when something is decided, a lookup in a foreign system, a foreign tool behind the login. The six patterns with code that runs stand in `.ara/knowledge/app-patterns.md`, and the plan names the one it uses |
| **What does not belong to it** | The paragraph that saves the disappointment later |
| **How you see that it is finished** | One sentence you can check |
| **What happens when it is wrong once** | That decides the construction. Something that gets checked is an afternoon. Something that may never be wrong is a project |

Out of the result comes the plan:

```
node .ara/tools/app.mjs --app <name> --new --titel "<display name>"
node .ara/tools/app.mjs --app <name> --plan "<title>"
```

`--new` creates the file from the scaffold: frontend, backend, one flow with an approval step,
README, `app.json`. The appearance comes from the mirror, see below. `--plan` creates the plan
file, and you fill it in during the conversation, section by section. A plan nobody read is a
form.

## The plan

It lies under `apps/<name>/plans/` in three states, and the folder name is the state:

```
node .ara/tools/app.mjs --app <name> --plan-aktiv <file>     open becomes active
node .ara/tools/app.mjs --app <name> --plan-erledigt <file>  active becomes done
```

**At most one is active.** Two active plans mean that nobody can say any more what is currently
being built; the tool does not allow it. A plan is done only when its version stands **live**, not
when the source code is finished.

## Building

```
node .ara/tools/app.mjs --app <name> --build
```

Out of the folder comes the package under `build/`. What does not belong in it, the kit knows from
itself: plans, README and the build itself are the work on the thing, not the thing. A folder with
a build of its own gets built, and its result goes into the package; everything else moves as it
is.

**Locally the build runs, not the app.** What it does you see on the device, with a real login and
a real model. Whoever "just runs it" on their own computer has neither the one nor the other and
still believes they have seen it.

A build older than the source code does not get deployed: the tool says so and stops. Otherwise the
version from the day before yesterday would go to the device and nobody would see it.

**The type checker runs before the bundler.** The scaffold has `tsc --noEmit && vite build` as its
build script: a type error stops the build instead of arriving on the device as an empty page.

**Into the package goes the build, not the source.** That stands as a rule in every device's
contract, and `--check` checks it: if `package.json`, `src/` or a `tsconfig.json` still lie in the
frontend folder, it is the source, and the tool stops. Deployed, the browser would otherwise get an
`index.html` pointing at `/src/main.tsx`, and the human in the frame would see an empty page with no
hint of why.

## Onto a device with Arasul

```
node .ara/tools/app.mjs --device <device> --app <name> --check
node .ara/tools/app.mjs --device <device> --app <name> --deploy
node .ara/tools/app.mjs --device <device> --app <name> --live
```

The device's contract says what applies, and `--check` holds the manifest against it before
anything flies. **A deploy always rolls into staging**, a human switches live, and only after
asking, even if you deployed it yourself a minute ago. The procedure with everything that belongs
to it stands in `.ara/knowledge/deploy.md`.

**What the app gets from the device the kit hands over at deploy.** Under which names the device
puts the address of the interface, the key and the address of its database into the container, in
which header the key travels, what the two login headers are called, which ways it carries for a
flow and for reading a document, and whether a run takes its submitter and a rule for its approval:
all of that is agreed between kit and product, stands in this one device's contract, and goes into
the package as `backend/arasul.json`. `--check` prints it
beforehand and names what this device does not promise. **An app never writes those values into its
own source.** One that does finds nothing on a device that names them differently, takes that for
"no Arasul here" and collects items nobody decides on. That is what happened to the scaffold up to
29.08.2026: the approval step was not refused, it was skipped.

**Deployed is not visible.** An app on a device is visible to a person only once it has been
released for them, and the kit cannot release it: its key carries `app:deploy` and nothing else.
Whoever calls up the staging slot without a release gets a 403, and that is the permission missing
and not the app. `--deploy` says so at the end and names the two ways to an administrator: a
session out of the start password, if one lies in the store (`--admin-login`), otherwise a human in
the device's interface. Which route or which page the release goes stands in the artifact's API
reference and admin handbook, and never in the kit. Both lie on every device with Arasul, in the
version that runs there, and the kit reads them there, without a token and without a mirror:
`node .ara/tools/mirror.mjs --docs --device <device>`, one of them with `--read <path>`. With a
mirror, `node .ara/tools/mirror.mjs --docs` works as well. If manual and contract contradict each
other, the contract holds: it comes from the running backend, the manual from the artifact the
device was installed with.

**Say that before the deploy, not after it.** Somebody who is shown a screen with a 403 on it takes
the kit for broken. Somebody who knows beforehand that a release is still to come waits for it.

**And a release means a slot.** The device carries two per app, and a package that was just deployed
lies in staging only. Somebody released for the live version alone does not see it: the release
stands and the overview stays empty, which is the most confusing of all states. So the release has
to mean staging. What it is called there stands in the admin handbook and not here. A foreign test
on 29.08.2026 got stuck at exactly that point, with the tick set.

**Staging and live each have their own database.** Whoever switches live does not take the data
of staging along: the live version starts empty the first time and afterwards keeps its own over
every version. Say that before the first switch, or the person from the business side wonders
about an empty app. What has to be there live from the start, clients for instance, somebody
creates there, or the app brings it along as a migration.

After the switch: one line into the customer's history or into the device's runsheet, and write on
the app's README. It is the state as it is, in the words of whoever uses the app: what it can do
today, what it cannot do, what you have to know.

## Onto a device without Arasul

```
node .ara/tools/app.mjs --device <device> --app <name> --compose --port 8080
```

The files go to the device over SSH, and there Compose puts up two containers: a web server for
the frontend and one for the backend, built from the build file in the package.

**Say beforehand what is missing there**, and say it in the same words the tool prints afterwards:
no login, no flow, no permission, one slot instead of two, no key and therefore no interface from
Arasul. Whoever reaches the address and the port sees the app. That is a way to demonstrate and to
try out, not a way for an operation with real data.

That is a level 2 intervention: name intent, target and way back, have it confirmed, then call it.
The way back stands at the end of the output.

This way writes into the marker too, as `compose` and not as staging or live. Without that note
the situation said an app had gone nowhere while it was answering on the device.

## The appearance

The scaffold brings Arasul's look with it, so that an app does not stand in the device's frame like
a foreign body. It is **one** piece, and it belongs to the product:
`frontend/src/marken/`, the mirror of the library. It carries all three sets, the values of both
themes (`theme.css`) and the rules of the six blocks (`marken.css`). The folder gets **replaced, not
written on.** The guard `node .ara/tools/marken.mjs` holds it at its source.

Up to 0.17.0 there was a second piece, `frontend/src/design.css`, with the values read out of the
shell. Since the library carries its own tokens, that would be two files setting the same marks, and
the two disagreed about which theme is the default. There is only one now.

What the sets are, how a page comes out of them and what is forbidden while doing so stands in
`.ara/knowledge/design-system.md`. Read that before you build an interface.

Rules of your own belong at the end of `stil.css`, and they use only the names of the tokens, not a
single colour value. Keep to that when you build something on: whatever stands as a colour in a rule
falls behind at the next version.

**The kit builds only apps that stand on the library.** Without that, a partner's apps all look
different after three months, and the uniform picture is gone. The device expressly does not compare,
and the product's guard checks only the shell: held is the standard here, before every build and
before every way onto a device (`--build`, `--check`, `--deploy`, `--compose`). Four findings stop
the tool, each with the sentence that says what belongs there instead:

- **A colour value of your own.** Values live in the library's `theme.css` and nowhere else; a rule
  of the app takes a token. Wrong: `color: #e11d48;` or `background: rgb(225 29 72);` in `stil.css`.
  Right: `color: var(--ara-fehler);`.
- **A Tailwind palette colour.** Only the token classes of the theme apply, they follow the device.
  Wrong: `className="bg-red-500"` or `text-white`. Right: `bg-primary`, `text-muted-foreground`,
  `border-border`.
- **A primitive of your own.** The page title is the block `Kopf`, not an own `<h1>`; a table is the
  primitive `Table` or the pattern `Datenliste`, not an own `<table>`; the same holds for `<dialog>`
  (`Dialog`), `<fieldset>` (`Feldgruppe`) and a hand-built tab bar with `role="tablist"` (`Tabs`).
- **The field `marken` is missing or stale.** The manifest says which version of the design system
  the app stands on, and the copy in the app is the anchor: an app that carries
  `frontend/src/marken/` has to name the field, the field has to name the copy's version, and the
  field without the copy is just as red. `--new` writes it, `marken.mjs --sync` keeps it current.

Measured is the app's own frontend source, not the mirror `src/marken/`: that one belongs to the
product, and whether it is right, `marken.mjs` says over its hashes. **A foreign container is
exempt**: an app without `frontend` in its manifest, with a finished `image` instead of a build of
its own, brings no interface that could stand beside the device's. The self-test holds the scaffold
itself to the same rule.

**The theme comes from the device, not from the app.** The shell writes it into the app's own
document at every change and at every load, and sends the same value as a message; light sets
nothing, because `:root` is light. `frontend/src/rahmen/thema.ts` therefore reads and does not
guess. Without a frame, so directly in a tab, the operating system's setting applies, and only then
does the app write the attribute itself.

When you check that, check it in both themes and in both widths: 390 for the phone, 1440 for the
desk. Below 900 pixels the sidebar becomes a sheet over the page and a data list becomes a card
list, and a page that scrolls sideways there is broken.

## A professional app: data that stays, clients, four eyes, receipts

A tax office, a practice, an office with files: there the scaffold's item is not enough. At six
places an agent without this sheet takes a wrong turn, found in a foreign test on 25.09.2026 in
which an outside agent built an app for a tax office's receipts with nothing but the kit. The six
sections here are the answers.

### Data that stays

**Exactly one place lasts: the database the device gives the app.** The contract says so under
`daten`, and `--contract` prints it word for word. An app with a backend gets its own PostgreSQL
per slot, its address stands in the environment value the contract names under
`umgebung.datenbank`, and the kit writes that name into `arasul.json`. It survives every deploy,
every switch and every restart, and the device backs it up every night, per app and slot. How the
data of a single app comes back the contract names under `daten.wiederherstellen`; an
administrator does that.

**What does not stay:** the container's file system, a `VOLUME` from the Dockerfile included. The
device replaces the container at every deploy. A SQLite file, a folder of uploaded files, a log on
disk: gone after the next update. An uploaded file belongs in a column (`BYTEA`), as in the
documents pattern. Removing the app throws its databases away, the backups of them stay.

**The scaffold does this already.** `backend/ablage/db.mjs` reads the name from the arrangement
and opens the device's database; if the arrangement names one and the value is empty, the app
does not start, instead of writing into a file silently. Without a device it takes SQLite, and
the backend route `lage` then says `dauerhaft: false`. How you see on the device that it holds: `--check` says
"A database of its own comes along", and at start the container's log says it lies in the
device's database.

**The database starts empty**, and the app creates the schema itself, with its migrations.
Staging and live each have their own, see above under "Onto a device with Arasul".

Measured on 25.09.2026 on the Orin with a probe out of the scaffold and the patterns documents and
reading a document: three migrations ran in the device's PostgreSQL; after deploying the next
version the receipts and the log were still there, a file in the container was gone; the live
slot started with a database of its own, empty.

### Visibility inside an app

Two questions, and they have two answers:

1. **Who gets in?** The device decides that. It delivers an app only to the one it is released
   for, per app and slot. A check in the app does not replace that.
2. **What does somebody see inside?** The app decides that. The device knows no clients,
   departments or files, and it should not know them.

The app knows who is there: in front of the container the platform sets two headers, user name
and role, and deletes whatever came from outside. **Their names stand in `arasul.json` under
`koepfe`**, and the scaffold reads them with `geraet.angemeldet(anfrage.headers)`. Write no header
name into the source; the self-test holds scaffold and patterns to that.

**A mapping in the app is allowed**: a table of which account sees which client, keyed by the user
name from the header. That is not a second login, because nobody logs in to the app: there is no
password, no account the app creates, no name somebody types into a form. The app may evaluate
the role from the header, for instance so that only an administrator maintains mappings. What an
administrator sees in the app the plan decides, not the role alone.

**Where the names come from.** An app's key cannot list the device's accounts. So the app
remembers every name it sees in the header, with the first and the last time, and whoever
maintains mappings chooses among those. A name that no longer exists on the device lets nobody
in: it stays in the list and is shown as not seen for a long time.

**Enforced in the store, at every query**, not in the interface: the list, the single thing, its
file, the export, the routes in the field `agent`. A foreign thing answers with 404 and not with
403, otherwise the answer gives away that it exists. It is checked with two accounts and two
clients: every route once as the one who may see nothing. A foreign test on 25.09.2026 found every
route of the app tight that way and exactly one gap outside of it, the approval card; the next
section closes it.

### Approvals in a professional app

Without a rule **everybody the app is released for** decides about an approval, and every one of
them sees the card with its text, also for a client who is not theirs. Since 25.09.2026 the
contract names under `freigaben` how an app draws the circle narrower when it starts a run, never
wider:

- **`einreicher`**: the user name from the header, who triggers the run.
- **`freigabe.ohne_einreicher: true`**: four eyes, the submitter does not decide.
- **`freigabe.entscheider`**: either `{"rolle": "admin"}` or `{"konten": [...]}`. Only these people
  see and decide the request, everybody else does not see it and gets a 403 when deciding.

The exact rules stand in the contract, `--contract` prints them word for word. **For a
professional app that means:** the deciders come from the mapping, the accounts mapped to this
item's client, and the submitter is excluded. If nobody remains, the device refuses the start with
400 instead of creating a request that runs into its deadline, and the app shows that sentence at
the item. That is a case for the plan: who decides when only one person is mapped to a client?

**References belong in the request's text, no content**: "receipt 17, submitted by anna", not the
amount, the client's name and the booking text. What a run gets lies on the device with every
run; what stands in the receipt lies in the app and follows its visibility. Whoever decides reads
the receipt in the app under its number. The scaffold does this already: its flow gets the item's
number and the submitter, nothing else.

**How the scaffold carries it.** `arasul.json` says under `freigaben` whether this device takes
submitter and rule; a device from before refuses a start with a field it does not know, so the
scaffold sends them only then. The submitter it always sends when the device knows it. The rule is
returned by `regel` in the core, out of the item; `VIER_AUGEN` in `server.mjs` switches the
exclusion of the submitter on. If an item demands a rule and the device takes none, no run starts,
and the item says why: an approval anybody could see would be worse than none.

### Reading documents and images

The device reads a document into fields: the app sends the file and a JSON schema, the device takes
the text out and lets a language model fill the fields. **The way stands in `arasul.json` under
`wege.dokument_auslesen`**, written from the contract; the app never writes it into its source. The
pattern with code that ran on the Orin is number 6 in `.ara/knowledge/app-patterns.md`, under
`.ara/templates/app-patterns/extract/`.

**Photos and scanned PDFs.** If a PDF has a text layer, the device reads it directly. A photo or a
scanned PDF goes through the device's text recognition, and the answer says whether it ran; the
pattern writes that into the log. **The model then sees the recognised text, not the image.** How
good a field becomes is therefore decided by the text recognition: a crooked, blurred photo,
handwriting, a stamp over the figure cost fields. Measured on 25.09.2026 on the Orin: an invented
receipt as a PDF with a text layer, six of six fields in 35 seconds; an invented fuel receipt as a
photo, text recognition ran, six of six fields in 13 seconds.

**Whether an image model is loaded does not matter for this way**, because it gives no image to a
model. Read on 25.09.2026 in the contract of version 6: none of its endpoints gives an image to a
model, and `GET /api/v1/external/models` names the models on the device, but not which one
understands images. Whether that still holds, `--contract` says on the device in question. Which models lie there and
what they are meant for the models page in the device's interface shows, and the admin handbook
says where; over SSH you ask with `remote.mjs`. **Promise a customer no image understanding**, no
handwriting, no photo of goods, before you have seen it on their device.

**Which model reads, the answer says** (`model`), and that belongs in the log. The app names none
and takes the device's default. **The field `modelle` in `app.json` is a demand, not a delivery**:
the device installs no model, at the deploy it says which one is missing. Empty, as in the
scaffold, means: the app needs none by name. Enter there only what the app or a flow calls by name
explicitly.

**The model suggests, the app checks, a human decides.** What comes back the app holds against the
schema and against its professional rules, an account that does not exist in the chart of
accounts, a tax rate that does not fit, and writes every finding onto the reading. Every reading is
a new row in the log, with model, duration, text recognition and who triggered it; none gets
changed. Reading waits until the model has answered, half a minute is normal, several minutes it
is when the model gets loaded first. The app's key needs the scope the contract names at the
endpoint; if it is missing, the device answers 403, and that is a decision of the administrator.

### Professional standards

An export format like the DATEV booking batch (EXTF), a chart of accounts like SKR03, the GoBD,
XRechnung: **those are not product values**, and the rule "not the internet" from
`.ara/knowledge/live-knowledge.md` does not hold for them. They stand neither in the contract nor
on the device, and the kit does not carry them. They come from their **primary source**: the
publisher's developer documentation or help centre, the letter of the Federal Ministry of Finance,
the standard. **With address and date of retrieval**, in the plan and in the header of the file
that writes the format. A secondary source, a repository on GitHub, a blog, is good for reading
against and is named as such.

What could not be checked that way stands as an assumption in the plan: a check program of the
publisher that was not at hand, a column two sources spell differently. **Before switching live**
a sample file goes to whoever processes it, the tax adviser with their import for instance, and
their answer is the proof. A check script for the format belongs in the app and runs at every
export in staging. What is promised to a customer is not "GoBD compliant" and not "DATEV
certified", but what the app does: which format, which version, traceable by what.

## What the scaffold already is

The clone brings no app. What an app looks like stands in the scaffold under
`.ara/templates/app/`, and what `--new` makes out of it runs from the first minute: an item is
filed and lies in the device's database, the backend starts the flow `freigabe` with the item's
number and its submitter, the flow stops at its approval step, a human decides in Arasul, and
afterwards the item stands as approved or rejected, with the name of the one who
decided and the sentence the flow wrote. Without Arasul the item is accepted and stays without a
decision, and the page says so.

If somebody asks what such an app looks like, create one and show it, instead of describing it:

```
node .ara/tools/app.mjs --app <name> --new
```

**It describes itself for agents.** `app.json` carries a field `agent`, a list of the routes an
agent may call, and the backend answers the route `agent` with that field, id, name and version.
The CLI of a root, `arasul.mjs`, calls only what is named there, and a route that changes
something needs `--write` from the human. There is no second list: the build puts a copy of
`app.json` next to the backend, and the route reads it. `--check` and `--deploy` hold the field
against the app: over the form the device's schema judges, and the kit does not say its verdict a
second time; what no schema carries it reads the way the CLI reads it. On top of that, every route
named there has to stand in the backend, as a string or as a pattern. How the field looks and what
the CLI does with it stands in `.ara/knowledge/root.md`, "The bridge to the device". **A device whose
schema for `app.json` does not know the field refuses the package**, and `--check` says so: then
take the field out until the device accepts it.

## What the scaffold is built from

It stands on the same stack as the device's interface, so that a partner does not learn two worlds:
**Vite, React, TypeScript, Tailwind, `react-router`, TanStack Query.** Beyond that there are five
places to know, and each exists exactly once:

| Place | What stands there |
| --- | --- |
| `rahmen/basis.ts` | Under which path the app hangs. It does not guess it, it reads it out of the document's address: live `/apps/<id>/`, in staging `/apps/<id>/test/`. It follows from that: **the routes stay one level deep**, whatever wants to go deeper belongs in the query |
| `rahmen/thema.ts` | The theme, read at the app's own document, which the shell writes into |
| `rahmen/schnittstelle.ts` | The app's only `fetch`. Path, login and the envelope around the answer stand there and nowhere else |
| `rahmen/anmeldung.tsx` | Who is there, out of `api/me`, as a context with role |
| `rahmen/async-boundary.tsx` | The three exits of a query: loading, went wrong, is there. Every query goes through it, and the pages get their data ready |

The backend follows the port pattern: `server.mjs` does HTTP, `kern/vorgaenge.mjs` does the cases,
and the core knows **two connections** and nothing else of the world, a store and a device. Both come
in as an argument, so there is no `fetch` in the core, no SQL and no reach into the environment, and
every case can be checked without having a database and a device. One store per entity, and in it
the only SQL for it. A second entity gets a second such file and not a second way to call the
database.

The store is **on the device the database the device gives the app**, PostgreSQL, reached through
`pg`, the backend's one dependency. **Without a device it is SQLite out of Node itself**: in the
self-test, on your own computer, over `--compose`. There is one SQL and not two: it is written the
way PostgreSQL speaks it, with `$1` as placeholder, and `ablage/db.mjs` translates exactly two
things for SQLite, the placeholders and a table's running number. Three rules follow from that:
times stand as text in ISO format, JSON stands as text and the store converts it, bytes stand as
`BYTEA`. The database's state stands inside it, in the table `migrationen`: a migration that has
run does not run again. Under `backend/ablage/migrationen/` lies one file per step, and **what has
run once never gets touched again**: whoever changes it changes the past of databases that already
exist.

## What you do not do while doing this

- **No product values from your head.** Models, paths, endpoints and limits stand in the device's
  contract. That holds for an app too: ask `--contract`, do not guess. In the source of an app that
  holds twice over: what it needs of them it gets in `backend/arasul.json`, and what is not in there
  it does not have. A value it guesses turns into a silent nothing at runtime.
- **Do not invent a second store.** Exactly one place lasts, the database the device gives the
  app. No file in the container, no upload folder, no `VOLUME` in the Dockerfile, no database the
  app puts next to it: all of that is gone after the next deploy. See "Data that stays".
- **No login of your own.** Who is logged in, the platform says: to the interface under `api/me`, to
  the backend over the headers in front of the container. A field in a form somebody types a name
  into is not a login, and a password in the app is a second one. **Who gets in, the device
  decides. What somebody sees inside, the app decides**, by the name and the role from the
  headers; a mapping of accounts to clients is allowed and no second login. See "Visibility inside
  an app".
- **No content in the approval request.** Everybody in the circle of deciders sees the card, and
  the run lies on the device. References belong in the request, the content stays in the app.
- **No approval the app grants itself.** It reads its state and does not decide. Deciding happens
  in Arasul, by a human to whom the app is shared.
- **Deploy nothing you have not checked.** First `--check`, then `--deploy`.

What an app gets from the platform, and how it uses it, stands in
`.ara/knowledge/platform-services.md`: login, permissions, flows, the AI interface with a key and
the way for outside tools. Read it before you rebuild something the device already brings along.
