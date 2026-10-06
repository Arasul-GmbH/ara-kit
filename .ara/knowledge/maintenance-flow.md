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

The same holds for the apps. As long as the device names no endpoint that lists them, the kit
asks for the ids it knows itself (the folders under `apps/`, or what you pass with `--apps`).
**The device can carry others nevertheless**, and the report says so. A list it would call
complete would be guessed.

### The last backup

**It is measurable nevertheless, just not by the kit.** The question a customer asks after half a
year has two parts: **does the device really back up**, and **when did a copy last lie outside the
device**. Both are answered by a route of the interface:

```
GET /api/backup/status
```

It demands a session as administrator. No kit key opens it, so it does not stand in the contract,
and the report says "das Gerät nennt dafür keinen Endpunkt". That does not mean no backup happens,
it means the kit cannot measure it this way. If a route with a key ever gets added, the tool finds
it by itself at the next run. Two ways, and you say which one you took:

1. **In the browser on the device**, the human is logged in. You see the answer, so do they.
2. **Over SSH**, with whatever is there on the device for it.

A target outside is a disk or a share in the customer network, not a target in a cloud. If it is
missing, the answer gives the reason, and that belongs in the conversation: a backup lying next to
the device is gone too after water damage.

**Into a service description or a handover record goes only what you have seen**, with a date and
with the way you saw it.

## What must be clear

The rule is in `AGENTS.md`, "Every command asks to full depth". After the status line, which you read first.

- Which device, and what the request is: a fault, an update, an extension, a routine check, a customer's report.
- For a fault: what the person saw, since when, what changed before, whether it can be repeated. Ask what they did, not what they suspect.
- Who and what is affected: one user, all, one app, the whole device.
- For an update: the version now and the target, the time window, who must be told, the way back (the plan of `upgrade.mjs` names version, duration and way back; that the human has heard it is the point).
- For an extension: what it should do, then `/app`.
- The level of the intervention (read, change, irreversible) and that the human has confirmed it.
- Whether the customer is to be told, and by whom.

An open point never becomes a permission. A change stays unconfirmed until the human says yes. After "enough" you do only what reads.

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

An update is an intervention, not a click. The kit leads the way with its own tool, so
nobody writes a line of shell and nobody guesses how long it takes. **The way is the interface
of the device, not SSH.** Since the device takes updates on request, it does the work itself:
it fetches the package from the release, checks the checksum, backs up first (and stops without
changing anything if the backup fails), builds the new images while it keeps running, switches
over and reports every step. A customer needs no SSH access for maintenance.

```
node .ara/tools/upgrade.mjs --device <device> --login-user <account> --password-ref <NAME>
node .ara/tools/upgrade.mjs --customer <customer> --device <device> ...
```

1. **The plan first, and it changes nothing.** Without further options the tool names the
   version on the device and the newest one, what happens, how long it takes, the way back and
   the key it will use. Pass it on and name it to the customer beforehand; an update during
   working hours is a disruption.
   - **The version on the device and the newest one** come from the device itself: its
     state route and its own question to the release. The plan says if the device names no
     version. Only the number is compared; a state from a deploy (`20261001-759a2b8`) is named
     next to it and is not a release number.
   - **How long:** the plan states the measured numbers with date and device (4 and 19 minutes
     through this route, measured on 02.10.2026 at a Jetson AGX Orin, from 0.8.14 to 0.8.16
     and to 0.8.15). A number measured elsewhere is not promised. The device is not reachable
     for some minutes while it switches, and that is not a fault. The kit's own measurement
     with the next release replaces these numbers.
   - **The way back:** the plan quotes what the device's contract says about the route and
     whether the device knows a previous version right now. The way back brings the program of
     the previous version, **not the data**. The backup the device takes first lies ready if the
     data should go back too, and that is a person's decision. Tell the customer.
   - **Nothing is deployed that is not newer.** With the same or an older version the
     command ends with one sentence, before it creates a key or asks the device for anything.
2. **The key.** The scope `system:update` lies in no key by itself and not in the kit key
   (`app:deploy`): whoever may roll an app in may not swap the device. If the kit key carries
   the scope, the kit uses it. **Otherwise it creates a key for this one occasion** with the
   session as administrator (`--login-user` and `--password-ref` of a named account, not `admin`
   when a read or probe account exists), with that one scope, running out by itself after three
   hours, and revokes it at the end, also after a failed run. Whoever has neither a kit key with
   the scope nor an administrator session gets one sentence and nothing is changed. The key is
   never shown and stands in no report.
3. **The human confirms** intent (from version to version), target (the device) and way back
   (the sentence from the plan). Only then `--yes`. That is a level 2 confirmation, see
   `.ara/knowledge/security.md`.
4. **`--apply --yes` does the rest:**
   - notes the state with the administrator session: accounts, licence, apps with their data,
     flows, models, company folders (without a session the run goes on and says that the
     comparison was not measured);
   - asks the device to update (`POST` on the update route its contract names; the kit calls
     nothing the contract does not name);
   - **shows the progress as it comes:** the step the device reports and the new lines of its
     log. While the device switches it does not answer; the kit says so once and asks again;
   - ends with what the device reports: done, or rolled back, or failed, or cut off. A run that
     the device rolled back by itself is not clean and the tool says so;
   - compares version and state with the one before and files report (with the device's own log),
     runsheet entry and, for a customer, an entry in `history/`.
   The computer itself is not restarted on this route.
5. **`--back --yes` goes back** to the previous version when the device names one. One
   sentence and nothing else if it names none.
6. **Afterwards the evidence from `.ara/knowledge/handover.md`** on top: services healthy, a
   question about substance answered, remote access stands. The tool's comparison does not
   replace that. What it compares are the lists the device gives out; the contents of the
   app databases it does not read row by row. **Something missing afterwards is a finding,
   not a trifle:** the run ends red and the report names it. The mirror of the kit still holds
   the earlier artifact after the run: `node .ara/tools/mirror.mjs --refresh`.

**The fallback is SSH, and it is explicit:** add `--ssh` to the call. Then the kit fetches the
artifact itself (the customer's way from the portal with the token, or with `--github` the public
release file with its checksum, never silently), asks for a backup and checks it in the list
(`--prepare --yes` does only that), ships the artifact, runs its `install.sh`, restarts the
computer and waits (`--no-reboot` leaves that out, the report says so). Use it only when the
interface route is not open: an older device without the update route, a device the interface does
not reach. The tool names it in the sentence where the interface route stops.

The routes for the comparison are the same as before: `GET /api/benutzer`, `GET /api/license/info`,
`GET /api/apps`, `GET /api/flows` (the platform's own flows), `GET /api/apps/:id/flows` (the flows of each app, asked per app and stand, so a flow an update loses turns the comparison red), `GET /api/models/installed`, `GET /api/firmenordner/ordner`,
`GET /api/firmenordner/platz`. If the device does not know one, the topic stands as "not measured"
and the report says why.

### 4. Build an extension

The part with which the partner earns additional money. Procedure:
`.ara/knowledge/extensions.md`

## An employee joins, one leaves

The most frequent small job after the handover, and the only one for which the kit has no command:
it has a key with `app:deploy` and no session as administrator.

The usual way is the interface, in the browser on the device. **Without a browser it goes through
the platform's admin interface**, one call each with the session of an administrator:
`node .ara/tools/device.mjs --name <device> --admin-call "<VERB> <route>"`. The credential is never
shown and goes into no call of yours. Route and body stand in the artifact, not in the kit: admin
handbook and API reference, both in the mirror and on the device itself.

```
node .ara/tools/mirror.mjs --docs
node .ara/tools/mirror.mjs --docs --device <device>
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

## Handing the kit over to the customer

When the customer is to run the kit themselves from here on, this is a maintenance step like any other, with a plan first and a yes before anything is written. The procedure is `.ara/knowledge/transfer.md`: `node .ara/tools/transfer.mjs --prepare --to "<name>"` prepares the repository (company branch only), the new person takes over with `/init`, and `--prove` shows afterwards that the old keys are dead. Do not hold a key back. Write the handover and the result of `--prove` into the history.

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
