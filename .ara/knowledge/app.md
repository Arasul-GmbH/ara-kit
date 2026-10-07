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

**If the human expressly wants no questions** ("don't ask", "no questions", or the briefing says
so in writing, as in the Codex test of 06.10.2026), the three rounds do not apply: that wish
beats the minimum. Work with what is written down, ask nothing, and write every point still open as
an assumption in the plan, each line as a place where somebody may object later. What is not
assumed even then: a price, a product value, a legal fact (they stay open and are named as open),
and anything that would send personal data off the device. Say in one sentence at the start that
you are going on without questions and that the assumptions stand in the plan.

| What | Why it decides |
| --- | --- |
| **The work step behind it** | Not the wished-for solution. "A bot for holidays" means: somebody reads mails and enters them into a table |
| **Who uses it** | Who sees it the customer decides on the device. Whether one, ten or a hundred decides the build |
| **Which data** | What goes in, stays, goes out. Name personal data explicitly |
| **The steps** | From the point of view of the human in front of it, one step per line |
| **Where a flow is needed** | Where a language model really does the work. Shifting data is a program, not a flow |
| **Where a human decides** | Every approval, when an item is complete enough for it, who decides and who explicitly not |
| **Who may see what** | Everything for everybody inside, or only their clients, departments, files. The app decides that. With clients (pattern 7) also: does the management see every client, or only those handed to it (`alleSehen`)? In a tax office the partners usually see all. Who is handed which client may be set before that person ever opened the app |
| **Roles, what leaves the device, which model per flow** | **Always asked**, because nobody without programming experience raises them. Defaults: an administrator and employees who see only their files, nothing leaves, a model suggestion per flow. See "Three questions every app gets" |
| **Picture, approval stages, what is read** | See "More questions" |
| **What has to stay** | What survives a new version, a switch and a year. See "Data that stays" |
| **Which professional standards apply** | Export format, chart of accounts, retention: `.ara/knowledge/app-professional.md` |
| **Which shape it takes** | The ten patterns in `.ara/knowledge/app-patterns.md`, and the plan names the one it uses |
| **What does not belong to it** | The paragraph that saves the disappointment later |
| **How you see that it is finished** | One sentence you can check |
| **What happens when it is wrong once** | Something that gets checked is an afternoon. Something that may never be wrong is a project |
| **Screens and layout, fields per form, buttons per role, automation and context** | Without them the builder invents the interface, guesses fields and buttons, and nobody knows what goes to the model. See "The four levels, point by point" |

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
   the flow file; the plan lists flow, task, suggestion and reason under `Models per flow`. How long
   a request waits when many ask at once, `--contract` says under `last`: say it in seconds.

**"Enough" does not drop the three questions above.** What stays open becomes the safe default and is said aloud:
administrator and employees, nothing goes out, the suggestion of the flow's header.

### More questions

Asked in **every** `/app` interview, with drafts as options. The kit writes the fields, `--contract`
says what each does on this device.

1. **The picture of the app.** Every app has one; a bare "AB" in the sidebar is not enough. "Which
   small picture for the sidebar? Suggestion: a receipt for Belege, a calculator for the annual
   accounts." Offer two or three finished drafts from https://lucide.dev/icons. Goes to `--symbol`:
   the name of an icon, small, with hyphens (`file-text`); capitals are not accepted. No answer:
   `--new` picks one from the words of the app and says which, and `--check` stops an app whose
   `app.json` has no `symbol` or one that is not in the icon set, with a suggestion. Existing apps
   get the field in `app.json` by hand, nothing else changes.
2. **Who approves, in which steps.** Only where the app has an approval. "One person, or two in a
   row, first the colleague who checks, then management?" Names go to `--stufen "Check,Management"`,
   at most five. **Who** decides in each step the administrator sets on the device, not the app: ask
   who the default person per step is and write it into the plan for the administrator. Who
   submitted never decides.
3. **Only where a flow needs it.** "Does it start by hand, at a time of the week, or when something
   happens?" (`--ausloeser`: `hand`, `zeitplan:<five cron fields>`, `ereignis:<name>`) and "by
   itself, or a person confirms the result?" (`--arten`: `autonom`, `ergebnis_bestaetigen`). The device acts
   on all of them itself: a schedule starts the flow in the live slot without arguments and without a
   submitter, an event the app reports. Below contract 13 an event does not start anything yet.

4. **Only where the device reads a document** (receipt, form, scan). Say what that is: "the device
   reads the paper and fills in the fields; where it is unsure, a person sees the paper next to the
   fields first." Ask with drafts: which details it reads (`--felder "Amount,Date"`, at most ten) and
   which of them the person may correct, suggesting only the often misread ones (`--aenderbar
   "Date"`, or `keine`). **Never all by habit**: a changeable field can be changed by mistake. The
   paper on the left is `--original`: by default a sheet drawn from the submitted text, with real
   documents the route that delivers them, **ending in .png, .jpg or .pdf** (the approval tells
   image from PDF by the end of the path; pattern 8 takes the ending from the receipt).
   **From contract 14 the model reads the original itself.** The device fetches the file through the
   route of the app and hands it to the image model: a PNG or JPEG as it is, a PDF as its first pages.
   It tells by the first bytes, not by the name, and an SVG sheet is only a display, the model
   cannot read it. How many pages and how large a file may be, the contract says (`--contract`);
   say none of it from memory. If the file is missing, too large or unreadable, the device calls
   no model: the run stops with an approval that names the reason ("Original fehlt"), and a person
   sees it. So for real documents the route must deliver a PNG, JPEG or PDF. Put nothing about the
   details of the item into `auftrag` any more: the paper is the source, and the details of the
   form would only be copied from it.
   **One check, with the fields.** With `--felder` and the kind `ergebnis_bestaetigen` the approval
   of the reading is the check: it always comes, with the fields, also when everything is read
   surely, and no second one follows at the end. So `--new` writes no step `entscheiden` there; a
   further stage still gets its own step. With `autonom` alone the reading asks only when unsure,
   and the step stays. On a device before contract 14 this does not hold: the model reads
   only the `auftrag`, and a sure reading asks nobody. There, add the step `entscheiden` by hand and
   say in the plan that an unsure reading asks twice.
   With several stages the first belongs to the reading. Say that aloud.
   **A title for the run.** The scaffold hands a reference to the item with the start as `titel` ("Vorgang 7 von anna", never its text, at
   most what the contract allows) when the device takes it; it stands in front of every approval of
   the run, so two cards can be told apart. Without it the device forms one from the first
   recognised values.

"Enough" drops these four questions: what stays open the kit does not write. `--check` stops
`faehigkeiten` at a tool step (they belong to model steps only) and holds the declaration against the
reading: a changeable field the role does not read, an original at a step that reads nothing, a
forbidden path, a device before contract 10.

**Ask nothing about where the result goes.** A flow that delivers a result hands it to a route of the
app, which `--new` writes and the scaffold's backend brings; what to say when asked, and what `--check`
holds, stands in `.ara/templates/app/README.md`, "Das Ergebnis eines Flows geht an die App zurück".

### How to ask, and when to stop

How deep to ask, drafts instead of a blank "which fields?", a sketch per layout option, "enough" and
never questioning Arasul stand in `AGENTS.md`, "Every command asks to full depth". For `/app` in
addition:

- **Probe from the pattern.** "With approvals" is not an answer; the drafts come from the pattern
  and from what the house works with: "Two steps: team lead, then personnel".
- **Look first.** What the profile, the house's own documents or the scaffold already say is
  proposed, not asked.
- **Stop** when every line of the four levels is answered or the human writes "enough". What is
  still open goes into the plan under `Assumptions`, one line each, and no later step builds on an
  unmarked guess. The aim is the app that brings the house most: data and models stay on the device.

```
node .ara/tools/app.mjs --app <name> --new --titel "<display name>"
node .ara/tools/app.mjs --app <name> --plan "<title>"
node .ara/tools/app.mjs --app <name> --plan-aktiv <file>     open becomes active
node .ara/tools/app.mjs --app <name> --plan-erledigt <file>  active becomes done
```

Plans lie under `apps/<name>/plans/`, and the folder is the state. **At most one is active**, the
tool allows no second. A plan is done when its version stands **live**, not when the code is
finished.

## Building and onto a device

`--build`, then `--check`, `--deploy` and `--live` against the device. **Locally the build runs, not the app**: what it does you see on the device, with a real login and a
real model. **A deploy needs a few sentences on what is new**: ask in the human's words ("What is new
for the people who use it?"). Without a file under `devices/` no contract and no `--check`: `/device`
comes first. What the build does and the way of a package stand in `.ara/knowledge/deploy.md`, what
the device brings in `.ara/knowledge/platform-services.md`, the look in
`.ara/knowledge/design-system.md`.

## Data that stays

**Exactly one place lasts: the database the device gives the app**, one per slot, as the contract
says under `daten`; its address arrives as `umgebung.datenbank` in `arasul.json`. It survives every
deploy and is backed up every night, restored as `daten.wiederherstellen` says. **Nothing else
stays**: every deploy replaces the container, its file system, a `VOLUME`, a SQLite file. An upload
belongs in a column (`BYTEA`). **The database starts empty**, the app's migrations create the
schema. Their numbers never collide: the scaffold holds 001 to 009, every pattern a ten of its own
from 010, and the app's own begin at 100. How the scaffold does both, and what it keeps without a
device: its README.

## What the scaffold already is

The scaffold lies under `.ara/templates/app/`, and what `--new` makes of it runs from the first
minute: an item in the device's database, the flow `freigabe` with number and submitter, a human
decides on the app's own page `Freigaben` (or in Arasul, which shows the same request), the item
stands approved or rejected. Asked what an app looks like, create one and show it. Its stack, the
five places that each exist once, the backend's two connections, how it describes itself for agents
and how it takes a flow's result: `.ara/templates/app/README.md`. **Routes stay one level deep**, the
rest goes into the query.

## What you do not do while doing this

No product value from your head or in the app's source, it comes in `backend/arasul.json`. No
second store. No login of your own, no content in an approval request, no approval the app grants
itself: `.ara/knowledge/platform-services.md` says why. Nothing deployed without `--check`.
