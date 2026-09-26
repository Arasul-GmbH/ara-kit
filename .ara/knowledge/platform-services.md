# Procedure: the platform's services, and how an app uses them

> **When do you need this?** When an app wants something from Arasul: a login, a decision by a
> human, a language model, a document, a flow. What is left without Arasul:
> `.ara/knowledge/deploy.md`, "Onto a device without Arasul".

## The rule first

This sheet says **what** a service is for; names, routes and limits on a device its contract says
(`--contract`). The routes here are pointers, named so that
`node .ara/tools/check-docs.mjs --device <device>` can hold them against contract and device before
a partner promises one. A route the contract does not name the kit does not call, usually the device
is older than the kit (`.ara/knowledge/deploy.md`, contract version). A route of this sheet missing
on a current device is feedback for the kit.

| Kind of route | Who identifies themselves | In the contract |
|---|---|---|
| The outer interface | a key in the header, no session | yes, with the scope each demands |
| A route of the interface | the session of a logged-in human | no |

The kit has a key and no session: what needs one a human does in the browser, or the kit over a
session out of the start password. The administration stands in admin handbook and API reference on
the device, `node .ara/tools/mirror.mjs --docs --device <device>`, one with `--read <path>`. The first
employee and permission: `.ara/knowledge/device.md`, "The first employee and the first permission".

## What an app gets: `backend/arasul.json`

The names of the interface's address, the key and the database address in the container, the key's
header, the two login headers, the ways for a flow, for reading a document and for asking a model,
whether a run takes submitter and approval rule, how a model call names its human: this device's contract says them, and at deploy `app.mjs` writes them
into the package as `backend/arasul.json`. `--check` prints it and what this device does not promise.

**An app never writes those values into its source.** One that does finds nothing on a device that
names them differently, takes that for "no Arasul here" and collects items nobody decides on. The
self-test holds scaffold and patterns to that. **Model work of an app runs over a flow, reading a
document or `geraet.fragen`**, and every call names the human it is made for: the device logs it
with them (`protokoll`).

## Login: an app gets none of its own

Whoever is logged in to Arasul and has the app shared with them is logged in to the app, nobody
else, administrators included. The platform enforces that **in front of** the container and sets two
headers, user name and role, after deleting whatever came from outside under those names: they
cannot be forged. **Their names and the roles stand in the contract** under `koepfe`, the kit puts
them into `arasul.json`, the scaffold reads them with `geraet.angemeldet(anfrage.headers)`. For the
interface the platform keeps `GET /apps/<id>/api/me` free: id, slot, user, role, and staging has its
own underneath. Which names under `/apps/<id>/` are the platform's, the contract says under
`apps.vergeben`.

**Not built out of that:** a login form, a name field, accounts with a password. That would be a
second login that holds nobody back. **Built out of that:** a mapping of accounts to clients,
departments, files by the user name, deciding what somebody sees **inside**:
`.ara/knowledge/app-professional.md`, "Clients: who sees what".

## Permissions: a run stops, a human decides

A flow stops with the tool `freigabe_anfordern`, with title, context and deadline, and the run waits:
**without a decision nothing goes further**. A question in the conversation, by contrast, goes to
whoever watches and carries on with an assumption. Approved, the run carries on from the step;
rejected, it ends with the reason; no decision by the deadline, it ends as well.

**Deciding runs over a human's session**, in the device's interface: no contract names those
routes, and the kit does not call them.

**The app reads the state with its own key and never decides**: `GET /api/v1/external/freigaben`,
with the run number.

**The circle.** A flow names no person and no role. Without a rule **everybody the app is shared
with** decides and sees the card with its text, also for a client not theirs. Since 25.09.2026 the
contract names under `freigaben` how an app draws the circle narrower at the start, never wider:
**`einreicher`**, the user name who triggers the run; **`freigabe.ohne_einreicher: true`**, four
eyes; **`freigabe.entscheider`**, `{"rolle": "admin"}` or `{"konten": [...]}`. Outside the circle
nobody sees the request, and deciding gets a 403; if nobody remains, the device refuses the start.
`--contract` prints the rules, `arasul.json` says under `freigaben` whether a device knows them. For
clients: `.ara/knowledge/app-professional.md`, "Approvals in a professional app".

**References in the request, no content.** Title and context stand on every decider's card and at
the run: "receipt 17, submitted by anna", the decider opens it in the app. Amounts, client names,
texts stay in the app and follow its visibility. **Do not promise unchecked** that a run can wait
for days; ask the device first.

## Flows: one file per flow, the model stands in the header

A flow is a task a language model carries out with tools: Markdown, the header says what it needs
and may do, the body is the instruction. **In a package it is a delivery**, registered per app and
slot, so two apps may carry the same name. Header schema and rules: the contract under `flow_frontmatter`. **The model in the header is a
suggestion** the administrator may override per flow on the device, over every update: so no model
name in the README, and a difference in behaviour is not looked for in the package first.

```
GET  /api/v1/external/flows
POST /api/v1/external/flows/<name>/run
GET  /api/v1/external/flows/runs/<id>
```

An app's key sees only its own flows in its slot. Recurring starts come over the same route from a
schedule on a computer that runs anyway. **A flow with an approval step is started without waiting**:
a waiting call runs into its time limit; the run number comes back at once, the rest you ask.

## The AI interface: with a key, without a session

```
POST /api/v1/external/llm/chat
GET  /api/v1/external/llm/job/<id>
GET  /api/v1/external/llm/queue
GET  /api/v1/external/models
POST /api/v1/external/document/extract
POST /api/v1/external/document/extract-structured
POST /api/v1/external/document/analyze
```

**Which of them a device carries, with which scope, its contract says**; a key without the scope is
refused, a decision of the administrator. The two ways to read a document go into `arasul.json`
under `wege`, what they do: `.ara/knowledge/app-professional.md`, "Reading documents and images".
The rest is for the kit and for tools outside an app, which may also speak the libraries' own calls:
`.ara/knowledge/extensions.md`, "The route for outside tools". Key header and prefix stand under `schluessel`, the
names in the container under `umgebung`. The kit's key comes from `--deploy-key`, an app's key the
device puts into the container.

**The chat is stateless**: every call is a job with exactly the history sent along. An app that
builds on a memory on the device builds on nothing.
