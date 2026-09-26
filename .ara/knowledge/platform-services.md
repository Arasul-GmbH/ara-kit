# Procedure: the platform's services, and how an app uses them

> **When do you need this?** When an app wants something from Arasul: a login, a decision by a
> human, a language model, a document, a flow. What is left without Arasul:
> `.ara/knowledge/deploy.md`, "Onto a device without Arasul".

## The rule first

This sheet says **what** a service is for; names, routes and limits stand in the device's contract
(`--contract`). The routes here are pointers, `node .ara/tools/check-docs.mjs --device <device>`
holds them against the device. A route the contract does not name the kit does not call.

| Kind of route | Who identifies themselves | In the contract |
|---|---|---|
| The outer interface | a key in the header, no session | yes, with the scope each demands |
| A route of the interface | the session of a logged-in human | no |

The kit has a key and no session: what needs one a human does in the browser, or the kit over an
administrator's session (`--admin-login`, `app.mjs --share`). The administration stands in the
manuals on the device, `node .ara/tools/mirror.mjs --docs --device <device>`. The first employee:
`.ara/knowledge/device.md`, "The first employee and the first permission".

## What an app gets: `backend/arasul.json`

Names in the container, headers, the ways for flows, reading and asking a model, the approval
rules, how a model call names its human: this device's contract says them, and at deploy `app.mjs`
writes them into the package as `backend/arasul.json`; `--check` prints it. **An app never writes
those values into its source.** **Model work of an app runs over a
flow, reading a document or `geraet.fragen`.** The AI log holds the routes `protokoll.wege` names,
with the human the app passes; a flow's model step stands at the run, with its submitter.

## Login: an app gets none of its own

Whoever is logged in to Arasul and has the app shared with them is logged in to the app, nobody
else. The platform enforces that **in front of** the container and sets two headers, user name and
role, that cannot be forged; their names stand in the contract under `koepfe`, the scaffold reads
them with `geraet.angemeldet(anfrage.headers)`. The interface asks `GET /apps/<id>/api/me`; which
names under `/apps/<id>/` are the platform's, the contract says under `apps.vergeben`.

**Not built out of that:** a login form, a name field, accounts with a password, a second login that
holds nobody back. **Built out of that:** a mapping of accounts to clients, departments, files by the
user name, deciding what somebody sees **inside**: `.ara/knowledge/app-professional.md`, "Clients:
who sees what".

## Permissions: a run stops, a human decides

A flow stops with the tool `freigabe_anfordern`, with title, context and deadline, and the run waits:
**without a decision nothing goes further**. Approved, the run carries on from the step; rejected,
it ends with the reason; no decision by the deadline, it ends as well.

**Deciding runs over a human's session**, in the device's interface: no contract names those
routes, and the kit does not call them. **The app reads the state with its own key and never
decides**: `GET /api/v1/external/freigaben`, with the run number.

**The circle.** A flow names no person and no role. Without a rule **everybody the app is shared
with** decides and sees the card with its text, also for a client not theirs. The contract names
under `freigaben` how an app draws the circle narrower at the start, never wider: **`einreicher`**,
the user name who triggers the run; **`freigabe.ohne_einreicher: true`**, four eyes;
**`freigabe.entscheider`**, `{"rolle": "admin"}` or `{"konten": [...]}`. Outside the circle nobody
sees the request, and deciding gets a 403; if nobody remains, the device refuses the start.
`--contract` prints the rules, `arasul.json` says under `freigaben` whether a device knows them. For
clients: `.ara/knowledge/app-professional.md`, "Approvals in a professional app".

**References in the request, no content.** Title and context stand on every decider's card: "receipt
17, submitted by anna", the decider opens it in the app. Amounts, client names, texts stay in the app
and follow its visibility. **Do not promise unchecked** that a run can wait for days; ask the device.

## Flows: one file per flow, the model stands in the header

A flow is Markdown: the header says what it needs and may do, the body is the instruction. **In a
package it is a delivery**, registered per app and slot. Header schema and rules: the contract under
`flow_frontmatter`. **The model in the header is a suggestion** the administrator may override on the
device: so no model name in the README.

```
GET  /api/v1/external/flows
POST /api/v1/external/flows/<name>/run
GET  /api/v1/external/flows/runs/<id>
```

An app's key sees only its own flows in its slot. Recurring starts come over the same route from a
schedule on a computer that runs anyway. **A flow with an approval step is started without waiting**:
the run number comes back at once, the rest you ask.

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
refused. Reading a document: `.ara/knowledge/app-professional.md`, "Reading documents and images".
The rest is for the kit and for tools outside an app: `.ara/knowledge/extensions.md`, "The route
for outside tools". The kit's key comes from `--deploy-key`, an app's key the device puts into the
container.

**The chat is stateless**: every call is a job with exactly the history sent along. An app that
builds on a memory on the device builds on nothing.
