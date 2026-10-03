# Procedure: building an app, from the first question to live

> **When do you need this?** When an app on a device should come out of a wish. This is the core.
> A professional app, with clients, receipts the device reads or an export format of another
> vendor, also reads `.ara/knowledge/app-professional.md`.

## The life cycle

An app runs in a circle, and `/app` stands at every station:

1. **Plan.** There is no file. Interview along the checklist below, then the file from the
   scaffold and a plan under `plans/offen/`.
2. **Build.** A plan is active. First go through its assumptions, then build, then pack.
3. **Test.** The package lands in staging; the person from the business side tries it with a real
   login.
4. **Live.** A human switches over. The plan moves into `erledigt/`, the app's README says what it
   can do today, in the words of whoever uses it.
5. **Next.** No plan open: situation, interview about an extension, new plan.

**Where you stand, the tool says:** `node .ara/tools/app.mjs --app <name>` names the next steps;
what stands on the device, `--status` asks there.

## The interview checklist

Ask, bundled, until every point is answered or left open as an **assumption** in the plan. What
the house works with (`business/profile.md`) belongs in the first draft. **At least three rounds**
before the first plan is written. The rule on how deep to ask is in `AGENTS.md`, "Every command
asks to full depth"; the four levels below are what it means for an app.

| What | Why it decides |
| --- | --- |
| **The work step behind it** | Not the wished-for solution. "A bot for holidays" means: somebody reads mails and enters them into a table |
| **Who uses it** | Who sees it the customer decides on the device. Whether one, ten or a hundred decides the build |
| **Which data** | What goes in, stays, goes out. Name personal data explicitly |
| **The steps** | From the point of view of the human in front of it, one step per line |
| **Where a flow is needed** | Where a language model really does the work. Shifting data is a program, not a flow |
| **Where a human decides** | Every approval, when an item is complete enough for it, who decides and who explicitly not |
| **Who may see what** | Everything for everybody inside, or only their clients, departments, files. The app decides that |
| **Roles and assignment** | **Always asked.** Default: an administrator and employees. The administrator hands files (clients, projects, cases) to employees; an employee sees only the files handed to them, with the approvals that concern them. Another role only with a reason. See "Three questions every app gets" |
| **What leaves the device** | **Always asked.** Mail, a register, a payment service, a search on the internet. Default: nothing leaves. Every outside connection is agreed one by one |
| **Which model per flow** | **Always asked.** Each place where a language model works gets a suggestion the administrator may switch on the device |
| **Picture, approval stages** | The sidebar symbol, and one or several people in a row per approval. See "Two more questions" |
| **What has to stay** | What survives a new version, a switch and a year. See "Data that stays" |
| **Which professional standards apply** | Export format, chart of accounts, retention: `.ara/knowledge/app-professional.md` |
| **Which shape it takes** | The nine patterns in `.ara/knowledge/app-patterns.md`, and the plan names the one it uses |
| **What does not belong to it** | The paragraph that saves the disappointment later |
| **How you see that it is finished** | One sentence you can check |
| **What happens when it is wrong once** | Something that gets checked is an afternoon. Something that may never be wrong is a project |
| **Screens and layout** | Which pages, what stands on each, list and single item, what you see first. Without it the builder invents the interface |
| **Fields per form** | Per field: label, type, required or not, example value, check rule. A field nobody named is a field the builder guesses |
| **Buttons per role** | Which action stands where for whom, and what happens after it. Roles see different buttons |
| **Automation and context** | Per automation: trigger, what goes to the model, what comes out, who checks, what happens on failure, who is told |

### The four levels, point by point

A level is clear when every line below is answered. Each answer lands in the plan's own section
(`Screens`, `Fields per form`, `Buttons per role`, `Automation`), and nothing in those sections
was guessed.

1. **Screens and layout.** Per page: its name and its route (one level deep), what stands on it,
   whether it is a list or a single item, what the human sees first, what an empty page says,
   where the sidebar leads.
2. **Fields per form.** Per form, per field: the label as the human knows it, the type (text,
   number, date, choice, file, person), required or optional, an example value, the check rule
   (range, format, "end not before start"). Which fields the approver sees, and which the
   submitter may no longer change after sending.
3. **Buttons per role.** A grid of role by page: which button is there, what it does, what state
   the item has afterwards, who is told. Include the buttons nobody asked for but that a round
   needs: withdraw, send back, comment.
4. **Automation and context.** Per automation, six lines: the **trigger** (an item is sent, a
   time passes, a button), the **context** that goes to the model (which fields, which
   documents, personal data named), the **result** (what it produces and where it lands), the
   **checker** (which human looks, and what they see), the **failure** (the model does not
   answer, the checker is away, the result is wrong), and the **notification** (who, by which way).

### Three questions every app gets

These three are asked in **every** `/app` interview, in the human's words, whatever else the app
does. They are on the list because a person without programming experience will not raise them
and cannot repair them later. Each gets finished drafts as options, never a blank "which roles?".
Speak plainly (`AGENTS.md`, "Plain language"): a technical word gets one sentence the first time.

1. **Roles and assignment.** Ask: "Who works with the app? Suggestion: you as administrator, all
   others as employees. As administrator you hand each employee the files they work on, a client,
   a project, a case. An employee sees only their own files, and the approvals that concern them,
   never somebody else's." Options: *Administrator and employees (suggested)*; *Everybody sees
   everything* (only with the reason written into the plan, and said aloud that a wrong click then
   shows a client's file to everybody); *More roles* (see below). **A further role needs a reason in
   the human's words**: ask "what may this person do that an employee may not?" If the answer is
   nothing, no role is made. Then ask who the administrators are and what a "file" is called in the
   house (client, project, case), and use that word on every screen. **The build is pattern 7**
   (`.ara/knowledge/app-patterns.md`): a page where the administrator hands files to employees, and
   the test `backend/probe/fremde-akte.mjs`, "somebody else's file answers 404". The plan names
   both, and **the app does not go live before that test passed in staging**; its output goes into the
   plan. Tell the human plainly that a new employee opens the app once before they can be handed
   files.
2. **What goes out to the internet.** Run
   `node .ara/tools/app.mjs --connections "<the description so far>"`: it names the outside services
   and any research on the internet the description points to. Ask per entry: "Is this needed? From
   the start, or only when somebody asks for it? May personal data go with it?" and say what leaves
   the device in one sentence ("the text of the mails goes to your mail provider"). The answers go
   into the plan under `Connections`. **Nothing goes out that was not agreed.** When the device's
   contract names the field `verbindungen`, the entries go into `app.json` and `--check` holds them
   against the contract; until it does, the plan holds them, `--check` says the field is not
   checked, and the app calls nothing outside by itself. Do not invent the shape of an entry.
   **Say it plainly, once, in the conversation:** "An app without an entry does not get onto the
   internet. It runs in a network of its own that has no way out. Whatever it should reach outside
   needs the name of that site on a list, and only those names get through." On a device whose
   contract carries version 7 or more that is a fact, `--contract` says it under "The network of an
   app". A font from the web, a web service, a package manager at start: all of that fails without
   an entry, so what the app needs is built into it beforehand. Models and documents the app gets
   through the device, they need no entry. The entry is only the name of the site, in small
   letters, without `https://`, without port and path; `--check` says in one sentence what is
   wrong with an entry that does not fit, and which sites the app reaches.
3. **Which model per flow.** Say first what a model is: "the program that reads and writes text.
   A bigger one is slower and more careful, a small one is quick." Per place where a model works,
   propose a kind of model for the task and say why, and say the administrator can switch it on the
   device later without the app breaking. **No model name from memory**: what the device has
   comes from `--contract`, the catalogue from the mirror. The suggestion stands in the header of
   the flow file; the plan lists flow, task, suggestion and reason under `Models per flow`.

**"Enough" does not drop these three.** What stays open becomes the safe default and is said aloud:
administrator and employees, nothing goes out, the suggestion of the flow's header.

### Two more questions

Asked in **every** `/app` interview, with drafts as options. **The kit writes the fields and does
not promise that the device acts on them yet**: `--contract` says what each does today.

1. **The picture of the app.** "Which small picture for the sidebar? Suggestion: the letters of its
   name, BE for Belege, or an icon." Goes to `--symbol`: an icon name
   (`file-text`) or one to three capitals or digits. No answer: the device uses the letters itself.
2. **Who approves, in which steps.** Only where the app has an approval. "One person, or two in a
   row, first the colleague who checks, then management?" Names go to `--stufen "Check,Management"`,
   at most five. **Who** decides in each step the administrator sets on the device, not the app.
3. **Only where a flow needs it.** "Does it start by hand, at a time of the week, or when something
   happens?" (`--ausloeser`: `hand`, `zeitplan:<five cron fields>`, `ereignis:<name>`) and "by
   itself, or a person confirms the result?" (`--arten`: `autonom`, `ergebnis_bestaetigen`). Say
   aloud that schedule and kinds may not act yet.

"Enough" drops these. `faehigkeiten` belong to model steps only, `--check` stops a tool step with them.

### How to ask, and when to stop

- **Probe a vague answer.** "With approvals" is not an answer. The follow-up question offers
  **finished drafts**, derived from the pattern and from what the house works with: "Request with
  four fields: from, to, kind of leave, substitute", "Two steps: team lead, then personnel".
  Never a blank "which fields?".
- **Layout questions carry a sketch per option** under Claude Code, a short line in the
  description under Codex.
- **Look first.** What the profile, the house's own documents or the scaffold already say is
  proposed, not asked.
- **Stop** when every line of the four levels is answered or the human writes "enough" in free
  text. What is still open goes into the plan under `Assumptions`, one line each. Nothing is
  guessed to close a gap, and no later step builds on an unmarked guess.
- **Do not question the choice.** Whether the house uses Arasul is not asked. The aim is the app
  that brings the house most, with digital sovereignty first: data and models stay on the device.

```
node .ara/tools/app.mjs --app <name> --new --titel "<display name>"
node .ara/tools/app.mjs --app <name> --plan "<title>"
node .ara/tools/app.mjs --app <name> --plan-aktiv <file>     open becomes active
node .ara/tools/app.mjs --app <name> --plan-erledigt <file>  active becomes done
```

Plans lie under `apps/<name>/plans/`, and the folder is the state. **At most one is active**, the
tool allows no second. A plan is done when its version stands **live**, not when the code is
finished.

## Building

```
node .ara/tools/app.mjs --app <name> --build
```

The package comes under `build/`, without plans, README and build; a folder with a build of its own
gets built, the rest moves as it is.

- **Locally the build runs, not the app.** What it does you see on the device, with a real login and
  a real model.
- **A build older than the source does not get deployed**, the tool stops.
- **The type checker runs before the bundler**, `tsc --noEmit && vite build`: a type error stops the
  build instead of arriving as an empty page.
- **Into the package goes the build, not the source.** `--check` stops at `package.json`, `src/` or
  `tsconfig.json` in the frontend folder: the browser would get an empty page.

## Onto a device

```
node .ara/tools/app.mjs --device <device> --app <name> --check
node .ara/tools/app.mjs --device <device> --app <name> --deploy
node .ara/tools/app.mjs --device <device> --app <name> --live
```

**A deploy needs a few sentences on what is new** from contract 8 on:
`--deploy --aenderungstext "<text>"`, 1 to 1000 characters. Ask in the human's words ("What is new for the people who use
it?"); the kit stops without it, and it goes next to the package, not into `app.json`.

Without a file under `devices/` no contract and no `--check`: `/device` comes first. The way of a
package stands in `.ara/knowledge/deploy.md`, what the device brings in
`.ara/knowledge/platform-services.md`, the look in `.ara/knowledge/design-system.md`.

## Data that stays

**Exactly one place lasts: the database the device gives the app**, one per slot, as the contract
says under `daten`; its address arrives as `umgebung.datenbank` in `arasul.json`. It survives every
deploy and is backed up every night, restored as `daten.wiederherstellen` says. **Nothing else
stays**: every deploy replaces the container, its file system, a `VOLUME`, a SQLite file. An upload
belongs in a column (`BYTEA`). The scaffold's `backend/ablage/db.mjs` does this already; without a
device it takes SQLite, and `lage` says `dauerhaft: false`.

**The database starts empty**, the app's migrations create the schema, one file per step under
`backend/ablage/migrationen/`. **What has run once never gets touched again.**

## What the scaffold already is

The scaffold lies under `.ara/templates/app/`, and what `--new` makes of it runs from the first
minute: an item in the device's database, the flow `freigabe` with number and submitter, a human
decides in Arasul, the item stands approved or rejected. Asked what an app looks like, create one
and show it.

The stack is the device interface's: **Vite, React, TypeScript, Tailwind, `react-router`, TanStack
Query.** Five places, each exists once:

| Place | What stands there |
| --- | --- |
| `rahmen/basis.ts` | The path the app hangs under, read from the address: `/apps/<id>/`, staging `/apps/<id>/test/`. So **routes stay one level deep**, the rest goes into the query |
| `rahmen/thema.ts` | The theme, read at the app's own document |
| `rahmen/schnittstelle.ts` | The only `fetch`: path, login, envelope of the answer |
| `rahmen/anmeldung.tsx` | Who is there, out of `api/me`, with role |
| `rahmen/async-boundary.tsx` | Loading, went wrong, is there. Every query goes through it |

The backend: `server.mjs` does HTTP, `kern/vorgaenge.mjs` the cases with **two connections** handed
in, a store and a device, so every case is checked without either. One store per entity with the
only SQL for it, in PostgreSQL's dialect; `ablage/db.mjs` translates it for SQLite. `kern/csv.mjs`
writes an export.

**It describes itself for agents**: the field `agent` in `app.json` lists the routes an agent may
call, and the backend answers the route `agent` out of a copy of `app.json` the build lays beside
it. `--check` and `--deploy` hold the field against the app. Its form, and what the CLI of a root
does with it: `.ara/knowledge/root.md`, "The bridge to the device".

## What you do not do while doing this

No product value from your head or in the app's source, it comes in `backend/arasul.json`. No
second store. No login of your own, no content in an approval request, no approval the app grants
itself: `.ara/knowledge/platform-services.md` says why. Nothing deployed without `--check`.
