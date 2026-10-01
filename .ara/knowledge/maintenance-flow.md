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
nobody writes a line of shell and nobody guesses how long it takes:

```
node .ara/tools/upgrade.mjs --device <device> --login-user <account> --password-ref <NAME>
node .ara/tools/upgrade.mjs --customer <customer> --device <device> ...
```

1. **The plan first, and it changes nothing.** Without further options the tool names the
   version on the device and the newest one, where the artifact would come from, what
   happens, how long it takes and the way back. Pass it on and name it to the customer
   beforehand; an update during working hours is a disruption.
   - **The version on the device** is read from three places and the plan says which: the
     contract, the folder `install.sh` set up last, and the status route. The status route
     can name a state from a deploy (`20261001-759a2b8`) instead of a release number; only
     the number is compared, the state is named next to it.
   - **The newest version** comes from the portal (`GET /api/download?token=<token>&pruefen=1`)
     when the customer token is stored, otherwise from the public release file. Which
     repository holds it, the mirror or the delivery manual on the device says, or
     `--repo <owner/name>`.
   - **How long:** the plan states the measured numbers with date and device (2.5 minutes to
     deploy and 3 minutes after a restart until all containers are healthy, measured on
     01.10.2026 at a Jetson AGX Orin from 0.8.12 to 0.8.14), plus the backup. A number
     measured elsewhere is not promised. The platform is not reachable while it restarts.
   - **The way back:** the tool reads `ops/AUSLIEFERUNG.md` and `ops/BACKUP_SYSTEM.md` on the
     device and shows what they say about going back to the previous version. **If they say
     nothing, the plan says exactly that: the product names no way back.** What the backup
     restores is the data (`POST /api/backup/wiederherstellung`), not the version, and the
     kit does not sell the one as the other. Tell the customer: the update is a step
     forward, and if the new version is bad the way is a fixed release. That is a finding
     for the product, not a trifle.
   - **Nothing is deployed that is not newer.** With the same or an older version the
     command ends with one sentence, before it backs anything up.
2. **The session as administrator.** The backup and the comparison need one, and the kit key
   does not open them. The tool takes it from `device.mjs --admin-login`, so pass
   `--login-user` and `--password-ref` of a named account. Not as `admin` when a read or
   probe account exists. The password is never shown.
3. **The human confirms** intent (from version to version), target (the device) and way back
   (the sentence from the plan). Only then `--yes`. That is a level 2 confirmation, see
   `.ara/knowledge/security.md`.
4. **`--prepare --yes` is the dry run that is still real:** it notes the state and makes the
   backup, deploys nothing. Use it a day ahead when the window is tight.
5. **`--apply --yes` does the rest:**
   - notes the state: accounts, licence, apps with their data, flows, models, company
     folders;
   - fetches the artifact **the customer's way**, from `arasul.de/api/download` with the
     token from the secret store, and holds it against the checksum of the release file. A
     wrong sum ends the run before the device is touched. **Without a customer token the
     tool says so in one sentence and stops.** The public release file with its checksum is
     the other way, taken only with `--github`, as an explicit choice and never silently;
   - asks the device for a backup (`POST /api/backup/sicherung`, it answers only when done)
     and **checks** that new backups lie in the list (`GET /api/backup/sicherungen`). No
     new backup, no update;
   - puts the artifact onto the device and runs its `install.sh` there;
   - waits until the containers that were ready before are ready again;
   - **restarts the computer** and waits again. The restart belongs to the evidence: a
     platform that only runs because nothing restarted it has not been shown to start.
     `--no-reboot` leaves it out when the customer's window does not allow it, and the
     report says so;
   - compares the state with the one before and files report, runsheet entry and, for a
     customer, an entry in `history/`.
6. **Afterwards the evidence from `.ara/knowledge/handover.md`** on top: services healthy, a
   question about substance answered, remote access stands. The tool's comparison does not
   replace that. What it compares are the lists the device gives out; the contents of the
   app databases it does not read row by row, it compares which ones the backup keeps.
   **Something missing afterwards is a finding, not a trifle:** the run ends red and the
   report names it.

Which routes the tool asks for it takes from the device's own API reference, and it calls
none that the reference does not list: `GET /api/update/status`, `GET /api/benutzer`,
`GET /api/license/info`, `GET /api/apps`, `GET /api/flows`, `GET /api/models/installed`,
`GET /api/firmenordner/ordner`, `GET /api/firmenordner/platz`, `GET /api/backup/sicherungen`,
`POST /api/backup/sicherung`. If one is missing there, the topic stands as "not measured" and
the report says why.

### 4. Build an extension

The part with which the partner earns additional money. Procedure:
`.ara/knowledge/extensions.md`

## An employee joins, one leaves

The most frequent small job after the handover, and the only one for which the kit has no command:
it has a key with `app:deploy` and no session as administrator.

The usual way is the interface, in the browser on the device. **Without a browser it goes through
the platform's admin interface**, with a credential in the header (`Authorization: Bearer`). Route,
body and the way to the token stand in the artifact, not in the kit: admin handbook and API
reference, both in the mirror and on the device itself.

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
