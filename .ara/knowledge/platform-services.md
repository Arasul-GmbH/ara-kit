# Procedure: the platform's services, and how an app uses them

> **When do you need this?** When an app wants something from Arasul: a login, a decision by a
> human, a language model, a document, a flow. And when somebody asks what of all that is left
> without Arasul.

## The rule first

This sheet says **what** a service is for and how it is used. What it is called on a particular
device, at which route it answers and which limits apply there, the device says:

```
node .ara/tools/app.mjs --device <device> --contract
```

Every route standing here stands as a pointer to what has to be looked up in the contract, not as
a promise. It is named nevertheless, because otherwise nobody could check whether this sheet is
still right. That is exactly what the tool is for:

```
node .ara/tools/check-docs.mjs --device <device>
```

It reads every route that stands in the kit's knowledge, holds it against the contract's endpoint
list and calls on the device. What no longer exists there shows up before a partner works along
it or promises it to a customer.

**Two kinds of route, and the difference decides who can walk it:**

| Kind | Who identifies themselves | Stands in the contract |
|---|---|---|
| The outer interface | a key in the header, no session | yes, with the scope each one demands |
| A route of the interface | the session of a logged-in human | no |

The kit has a key and no session. Everything that needs a session is therefore done by a human, in
the browser on the device, and you watch and write along. A kit that walked such a route itself
would need an administrator's password.

**Without a browser that is not the end.** The platform has an interface of its own for its
administration, and how it works stands in the artifact: admin handbook and API reference, both in
the mirror, to be found with `node .ara/tools/mirror.mjs --docs`. The first employee and the first
permission are the case that otherwise leaves you stuck, and it stands in
`.ara/knowledge/device.md` under "Der erste Mitarbeiter und die erste Freigabe".

## Login: an app gets none of its own

Whoever is logged in to Arasul and has the app shared with them is logged in to the app. Whoever is
not does not get in. There is no special rule for administrators.

That is enforced **in front of** the container: the platform checks the request and sets two
headers, one with the user name and one with the role. **What they are called and which roles
there are stands in the contract** under `koepfe`, together with the note on how the name is to be
read. Do not copy the names down, read them there.

They cannot be forged: whatever comes in from outside in the request gets deleted before the
platform sets its own.

More convenient than the headers is the route the platform keeps free for the app:

```
GET /apps/<id>/api/me
```

It answers with the id, the slot, the user and the role. Staging has its own one underneath. Which
names under `/apps/<id>/` belong to the platform and which to the app stands in the contract under
`apps.vergeben`.

**What you do not build out of that:** no login form in the app, no field somebody types their name
into, no user list of your own. That would be a second login next to the real one, and it would
hold nobody back.

## Permissions: a run stops, a human decides

A flow can stop and ask for approval. The tool for that is called `freigabe_anfordern` and stands
in the flow's step chain, with a title, the context and a deadline. The run then stands as waiting,
and without a decision nothing goes further.

That is something other than a question in the conversation: a question goes to whoever is watching
right now, and without an answer the flow carries on with an assumption. An approval goes to
everybody the app is shared with, and **without an answer nothing goes further at all**.

Three outcomes, and they stand on the run: approved, then it carries on from the stopped step.
Rejected, then it ends, and the reason is its reason. Nobody decides by the deadline, then it ends
as well.

**Deciding happens over a human's session**, not over a key:

```
GET  /api/freigabe-anfragen
POST /api/freigabe-anfragen/<id>/bestaetigen
POST /api/freigabe-anfragen/<id>/ablehnen
```

Those three routes therefore do not stand in the contract, and the kit does not call them. Whoever
wants to decide is logged in, and that is the customer.

**The app reads its state and does not decide:**

```
GET /api/v1/external/freigaben
```

With its own key, with the run number as the question behind it. An app that could grant its own
approval would not be one.

**Who may decide the customer says, not the flow.** A flow names no person and no role, it
describes the matter. The responsibility is the same permission with which somebody may use the app
at all.

What you do **not** promise the customer unchecked: that a waiting run stands for an arbitrarily
long time. Ask that on the device before a process is built on it in which an approval lies open
for days.

## Flows: one file per flow, the model stands in the header

A flow is a task a language model carries out with tools. As a file it is Markdown with a header:
the header says what the flow needs and may do, the text below is the instruction.

**A flow in a package is a delivery.** The package brings the files along, the device registers
them per app and slot. The namespace is the app: two apps may carry the same flow name.

**The schema of the header and the rules for a flow out of a package stand in the contract** under
`flow_frontmatter`: the schema as a schema, plus the rules as sentences and the note that the
instruction is the body and not a field in the header. `--contract` prints both word for word. Do
not copy it down, read it on the device in question.

**The model in the header is the partner's suggestion.** The administrator on the device may
override it per flow; their decision lies on the device and not in the file and therefore survives
every app update. Two consequences for you: do not write in an app's README which model it runs on,
and do not look for a difference in behaviour in the package first.

A flow is triggered from outside over the outer interface:

```
GET  /api/v1/external/flows
POST /api/v1/external/flows/<name>/run
GET  /api/v1/external/flows/runs/<id>
```

What a key sees in doing so the key decides: an app's key sees only its own flows in its own slot.
Recurring starts you trigger from outside over the same route, from a schedule on a computer that
runs anyway.

**A flow with an approval step is started without waiting for the result.** It stops until a human
decides, and that can take a while; a waiting call runs into its time limit before that. The run
number comes back immediately, the rest you ask for.

## The AI interface: with a key, without a session

Ask a language model, read the state of a job, see which models are on the device, get text out of a
file and have it evaluated:

```
POST /api/v1/external/llm/chat
GET  /api/v1/external/llm/job/<id>
GET  /api/v1/external/llm/queue
GET  /api/v1/external/models
POST /api/v1/external/document/extract
POST /api/v1/external/document/extract-structured
POST /api/v1/external/document/analyze
```

**Which of those this one device carries stands in its contract**, and there stands too which scope
a key has to carry for it. The kit calls nothing the device does not promise. If a key lacks the
scope, the device rejects it, and that is not a fault of the kit but a decision of the
administrator.

The header for the key and its prefix likewise stand in the contract, under `schluessel`. The kit's
key comes from `/device` with `--deploy-key`; an app's key the device puts into the container
itself at deployment, together with the address of the interface. Which names the two values carry
the contract says under `umgebung`.

**The chat is stateless.** Every call is a job of its own with exactly the history that is sent
along. Whoever wants a conversation keeps it themselves and sends it along. An app that builds on a
memory on the device builds on something that does not exist.

## The route for outside tools

Next to its own interface the device answers the calls that widespread AI libraries speak:

```
POST /v1/chat/completions
POST /v1/embeddings
GET  /v1/models
```

Authentication is with the same key, in the key header or as `Authorization: Bearer`. What that is
good for: an app's backend takes a ready-made library and points it at the device instead of
building a client of its own.

**These routes do not stand in the contract.** The contract describes what is agreed between kit
and device, and this route is there for outside tools. Two things follow from that: the kit does not
call it of its own accord, and **before you promise it to a customer, you check it on their
device.** `node .ara/tools/check-docs.mjs --device <device>` asks without a key and says whether the
route exists there.

## `app.json` and the flow header: the schema lies on the device

What belongs in a manifest is not a matter for this sheet. The device prints its schema, and next to
it the rules no schema can carry. The kit checks both for you:

```
node .ara/tools/app.mjs --device <device> --check <folder>
```

**The rules without a schema are not trimmings.** A manifest can be valid against the schema and
still be rejected. The tool prints them word for word, and you go through them one by one. The whole
way of a package stands in `.ara/knowledge/deploy.md`.

## The backup

The question a customer asks after half a year has two parts: **does the device really back up**,
and **when did a copy last lie outside the device**. Both are answered by a route of the interface:

```
GET /api/backup/status
```

It demands a session as administrator. No kit key opens it, so it does not stand in the contract,
and `/maintain` in that case says "das Gerät nennt dafür keinen Endpunkt". That does not mean no
backup happens, it means the kit cannot measure it this way.

Two ways, and you say which one you took:

1. **In the browser on the device**, the human is logged in. You see the answer, so do they.
2. **Over SSH**, with whatever is there on the device for it.

A target outside is a disk or a share in the customer network, not a target in a cloud. If it is
missing, the answer gives the reason, and that belongs in the conversation: a backup lying next to
the device is gone too after water damage.

**Into a service description or a handover record goes only what you have seen**, with a date and
with the way you saw it.

## What is missing without Arasul

The same app also runs on a device without Arasul, over Compose:

```
node .ara/tools/app.mjs --device <device> --app <name> --compose --port 8080
```

Then everything on this sheet falls away: the login, the flows, the permissions, the second slot and
the key with which an app reaches the interface. The tool lists it at setup and writes it into the
header of the generated file. **Say it beforehand and in the same words**, instead of leaving it
standing in the output afterwards.

That is a way to demonstrate and to try out. For an operation with real data it is not: whoever
reaches the address and the port sees the app.

## When a route is missing

If the contract does not name a route, the kit does not call it. That is not a fault of the tool but
the statement that this device does not offer it, and usually that means: it is older than the kit.
What applies then stands in `.ara/knowledge/deploy.md` under the contract version.

If you notice that this sheet names a route that no longer exists on a current device, that is
feedback for the kit and not a trifle. `check-docs.mjs` with `--device` tells you with one sentence
per route.
