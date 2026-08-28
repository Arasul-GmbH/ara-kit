---
description: Look after a running device. State, diagnosis, update, extension
argument-hint: <device> or <customer>/<device>
---

Care for: **$1**

Read `.ara/knowledge/maintenance-flow.md` and work along it. Knowledge this command loads:
`.ara/knowledge/maintenance-flow.md`, `.ara/knowledge/security.md`,
`.ara/knowledge/self-healing.md` when something of Arasul does not run,
`.ara/knowledge/diagnostics.md` for a fault, `.ara/knowledge/extensions.md` for an
extension, `.ara/knowledge/platform-services.md` when it is about the backup or a service
of the platform, `.ara/knowledge/live-knowledge.md` for every product value. You read the
profile in `business/profile.md` beforehand.

**The argument.** `zentrale` is a device without a customer under `devices/zentrale/`.
`mueller/zentrale` is a customer device under `customers/mueller/devices/zentrale/`. A
customer name alone without a device means their device, and if they have several, you ask
which one. No argument: first the marker `.ara/state.json`, then the existing files. If
there is exactly one, take it. Otherwise ask through the interview tool.

## First the status line, then the question

**Before you say anything, you measure.**

```
node .ara/tools/maintain.mjs --device <device>                       own device
node .ara/tools/maintain.mjs --customer <customer> --device <device> customer device
```

The tool goes two ways and neither is a condition for the other: over SSH the state of the
computer, over the interface with the kit key what the platform knows about itself. It only
reads.

The first line of its output is the status line: version, apps with their versions, last
backup, anything conspicuous. **You pass that on, word for word or summed up in one
sentence, and then you ask what is due.** No catalogue of suggestions, no list of
everything that would be possible.

What the tool could not measure stands in its section "What is missing". **Say it too.** A
report without that sentence reads like a healthy device, and that is exactly what someone
relies on afterwards.

**No argument given:** for a partner list the customers
(`node .ara/tools/customer.mjs`), one line each with devices and last contact, and ask
which device it is about. For a company the devices from `devices/`.

## Then comes free text

The human says in their own words what is going on. "The admin says the holiday app is
stuck." "Just having a look." "We want to update." From the request you recognise what
needs doing, and you pull the matching procedure:

| Request | Procedure |
|---|---|
| Something is stuck | `.ara/knowledge/diagnostics.md`. Establish first, change second |
| Just having a look | The report is the answer. Result into the history, even if everything was fine |
| An app is stuck | Version from the report, then `/app`: switching back to the previous version is the fastest way back |
| Deploy an update | `.ara/knowledge/maintenance-flow.md`, section "Update einspielen". Back up first, then check that the backup exists |
| Extension | `.ara/knowledge/extensions.md` |

For a fault the rule is: no repair without a finding, never two changes at once.

## The report

```
node .ara/tools/maintain.mjs --device <device> --report
```

Puts the report under `<device folder>/reports/YYYY-MM-DD-wartung.md` and writes a line
into the runsheet. Take that when someone should be able to prove what was measured when:
for maintenance under contract, before and after an update, and always when you changed
something yourself.

## What the tool does not do

It restarts nothing, deploys nothing and cleans up nothing. **Every intervention is a
decision of its own**, with intent, target and way back, and for a customer device with a
confirmation in front of it (`.ara/knowledge/security.md`). A maintenance contract permits
maintenance, it is not a licence for a restart at eleven in the morning.

**One exception, with limits: the self-healing.** When the status line says that a
container of Arasul does not run, `node .ara/tools/heal.mjs --device <device>` is the
first step, not the diagnosis: it starts what does not run, only inside the Arasul
directory tree, records every step in the device file and takes each one back on request
(`--undo <id>`). It asks only when it gives up. Calling it is the level 2 confirmation, so
on a customer device you name it beforehand. Procedure: `.ara/knowledge/self-healing.md`.

It also guesses no path. If it finds nothing in the device's contract on a point, it says
"the device does not offer this", and that is the answer. Do not fill it in.

Every visit ends with an entry: for a customer device under `customers/<customer>/history/`,
otherwise in the device's runsheet.
