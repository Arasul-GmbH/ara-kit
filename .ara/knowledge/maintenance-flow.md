# Procedure: maintenance and care

> **When do you need this?** At `/maintain`: everything that happens after the handover.

## Entry: measure first, ask second

One command, several requests. Recognise from the request what it is about, and do not ask about
what you can see.

**Always the status line first.** It does not come into being in the conversation but on the
device:

```
node .ara/tools/maintain.mjs --device <device>
node .ara/tools/maintain.mjs --customer <customer> --device <device>
node .ara/tools/maintain.mjs --device <device> --report     report into the file
```

It names four things, in this order, because in this order they decide whether there is anything
to do at all: **version, apps with their versions, last backup, anything conspicuous.** Behind
that stands what could not be measured.

Pass it on and then ask what is due. No catalogue of suggestions: the human says in free text
what is going on, and from that you recognise which of the four requests below it is.

### Two ways, and neither is a condition for the other

| Way | What it brings | What is missing without it |
|---|---|---|
| SSH, with the details from the device file | disk, memory, containers, failed services, logs | the whole state of the computer |
| The interface, with the kit key | system version and contract version, apps with staging and live version, last backup | everything the platform knows about itself |

If one does not work, the report comes out of the other. **What is missing stands in it as a
section of its own, and you say it along.** A report that keeps quiet about what was not measured
reads like a healthy device, and somebody relies on that afterwards.

If there is no connection at all, neither way, that is the first task and not the second. For a
single command on the device `node .ara/tools/remote.mjs --customer <c> --check` remains the way.

### No path from memory

The tool knows exactly one path, the contract. Every other one it looks up there. If it finds
nothing on a point, the report says "dieses Gerät nennt dafür keinen Endpunkt, noch nicht am
Gerät", and **that is the answer, not a gap you fill.** The last backup is exactly such a point
today.

**It is measurable nevertheless, just not by the kit.** The device answers the two questions
about it over a route of its interface, and that demands a session as administrator, no key opens
it. How you get there anyway and what stands in the answer is in
`.ara/knowledge/platform-services.md` under "Die Sicherung". If a route with a key ever gets
added, the tool finds it by itself at the next run.

The same holds for the apps. As long as the device names no endpoint that lists them, the kit
asks for the ids it knows itself (the folders under `apps/`, or what you pass with `--apps`).
**The device can carry others nevertheless**, and the report says so. A list it would call
complete would be guessed.

## The four requests

### 1. Something is stuck

If the status line says that a container of Arasul does not run, the self-healing goes
first: `node .ara/tools/heal.mjs --device <device>`, procedure
`.ara/knowledge/self-healing.md`. It starts what does not run, only inside the Arasul
directory tree, records every step in the device file with its way back, and asks only when
it gives up. Where it gives up, the diagnosis begins.

For everything else the procedure is `.ara/knowledge/diagnostics.md`. Establish first,
change second.

### 2. Regular look

When nobody has a concrete problem but somebody wants to know whether everything is in order, the
report is already the answer. Take it with `--report`, then it lies in the file:

```
node .ara/tools/maintain.mjs --customer <customer> --device <device> --report
```

It measures services and containers, the disk space (the one value that grows silently until
nothing works any more), the errors in the logs of the last 24 hours, the apps with their
versions and the last backup.

Three things it does **not** measure, and those stay your job:

- **Has a backup ever been restored?** A backup that was never restored is a guess. That is an
  exercise, not a measurement.
- **The product version against the mirror.** `node .ara/tools/mirror.mjs --show` says what was
  installed with. Whether there is a newer one, `--refresh` says.
- **Remote access from outside**, not just whether your existing session is still open.

Result into the history, even if everything was in order. A history with regular entries is worth
more at an extension than any sales conversation.

### 3. Deploy an update

An update is an intervention, not a click.

1. **Beforehand:** what changes? Are there notes in the product about it? Is the time agreed with
   the customer? An update during working hours is a disruption.
2. **Make a backup and check that it exists.** Not "it runs automatically anyway".
3. **Deploy**, following the product's way (read up in the mirror).
4. **Afterwards the evidence from `.ara/knowledge/handover.md`**: at minimum: services healthy, a
   question about substance answered, remote access stands. An update that runs through and leaves
   a dead system behind is the normal case with unchecked updates.
5. **Know the way back**, before you start. If there is none, that is information for the
   customer, not a trifle.

### 4. Build an extension

The part with which the partner earns additional money. Procedure:
`.ara/knowledge/extensions.md`

## An employee joins, one leaves

The most frequent small job after the handover, and the only one for which the kit has no command:
it has a key with `app:deploy` and no session as administrator.

The usual way is the interface, in the browser on the device. **Without a browser it goes through
the platform's admin interface**, with a credential in the header (`Authorization: Bearer`). Route,
body and the way to the token stand in the artifact, not in the kit: admin handbook and API
reference, both in the mirror.

```
node .ara/tools/mirror.mjs --docs
```

The whole sequence with the shape of the call stands in `.ara/knowledge/device.md` under "Der
erste Mitarbeiter und die erste Freigabe". **Whoever leaves loses their permissions immediately
and not at the next visit**, and you write that into the history, with a date and with the way you
did it.

## When the customer calls because something does not work

The kit monitors nothing (on purpose). The usual way is: the customer gets in touch.

Then: **listen first, look second.** What the customer describes is a symptom from their point of
view, "the thing is broken" can be an expired certificate, a full file system or a pulled power
plug. Ask about what they did, not about what they suspect.

## Limits

- **Touch nothing that does not belong to the task.**
- **Copy nothing off the device** apart from log excerpts you need for the diagnosis.
- **For larger interventions ask the customer**, even when there is a maintenance contract. A
  contract permits maintenance, it is not a licence for a restart at eleven in the morning.

## Writing along

Every visit produces an entry under `customers/<c>/history/YYYY-MM-DD-topic.md` (template:
`.ara/templates/history-entry.md`). That is the record when a customer asks what was done when,
and the ground for nobody starting from zero next time.

The maintenance report is something else and lies elsewhere: it is the **measurement** and lies
with the device, under `<device folder>/reports/YYYY-MM-DD-wartung.md`, written by `--report`. The
history entry is what **happened**, in your words, with occasion, finding, what was done and the
evidence. Two reports on one day do not overwrite each other.

Recording one report before and one after an intervention is the simplest way to keep the record:
what held before, what holds after, both measured and not claimed.
