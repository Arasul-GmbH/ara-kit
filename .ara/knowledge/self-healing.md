# Procedure: self-healing

> **When do you need this?** On a running device, when something of Arasul does not run
> any more, at `/maintain` or when a customer says that something is stuck.

## What it is

From the running Linux onwards the kit works by itself: file, verdict, installation, key. The
self-healing is the piece after that. **When something in the Arasul directory tree is
broken, the kit tries everything it can itself, records every step, and asks only when it
gives up.**

```
node .ara/tools/heal.mjs --device <device>                    establish, fix, verify, record
node .ara/tools/heal.mjs --customer <customer> --device <device>
node .ara/tools/heal.mjs --device <device> --plan             only say what it would do
node .ara/tools/heal.mjs --device <device> --list             the interventions so far
node .ara/tools/heal.mjs --device <device> --undo H-0003      restore the state before H-0003
```

The tool reads first, like every other one: which folders on the device look like Arasul,
which containers there are, which of them come from that tree, and which of them do not
run. Then it acts, one container at a time, and after every step it checks that the step
took effect. **It does not restart, it does not delete, it does not change a file.**

## The three limits

They stand in `.ara/tools/lib/heal.mjs`, not only here, and the self-test holds them.

1. **Only inside the Arasul directory tree.** A container belongs to it when its Compose
   project comes from an Arasul folder on the device, or when it is a container of the
   platform by the kit's rule (the same rule `/device` recognises a running platform by).
   Everything else stays as it is, even when it does not run: it stands in the report as
   "outside the tree, stays as it is", and that is a finding for the human, not a job for
   the kit.
2. **Never the bootloader, never the system.** The tool has no command for anything but
   containers: start, stop, look. What the device boots from, what `systemd` runs, what
   stands in `/etc`, and everything from `.ara/knowledge/flash-orin.md`, is out of its
   reach by construction.
3. **Only what has a way back.** Every intervention is recorded with the state before, the
   state after and the command that takes it back, and `--undo` runs exactly that command
   and proves that the state before is there again. What has no way back is not done: a
   container that runs but reports unhealthy would need a restart, and after a restart the
   state before does not exist any more. That is a question, and the tool puts it to you
   with the container's last log lines instead of acting.

## Why it may act without asking

`.ara/knowledge/security.md` says that changing needs a confirmation with intent, target
and way back. The self-healing does not break that rule, it satisfies it once for the whole
run: the intent is "everything of Arasul runs again", the target is the tree and nothing
outside it, and the way back stands per step in the file. **Calling the tool is the
confirmation.** On a customer device you name that before the call, in one sentence, and
have it confirmed through the interview tool like any level 2 intervention. Inside the run
nobody gets asked again, that is the point of it.

`--plan` is the dry run. It prints what the tool would do and changes nothing. Take it
when you want to see the plan before the confirmation.

## What stands in the file

Every intervention gets a number, `H-0001`, `H-0002`, continuous per device, and two
places:

- **`device.md`, under Prüfungen.** One entry per intervention with what was done, the
  target, the state before and after, the command that ran on the device, and the way back
  as the command you type. Every way back also gets its own entry when it runs.
- **`interventions.json`** next to it. The same, machine readable; `--undo` and `--list`
  read it. Do not edit it by hand.

An intervention that did not take effect stands there too, with `failed`, and remains
revertible: a container that was started and went out again can be stopped, and then the
state before is there again. Nothing gets talked up: what the tool could not do stands under
"Where the kit gives up and asks", with the last lines of the container, and the return code
of the run is 1.

## Where it gives up

- A container in the tree does not stay up after the start.
- A container in the tree runs but reports `unhealthy`.
- Docker does not answer, or no folder on the device looks like Arasul.

Then it is your turn, along `.ara/knowledge/diagnostics.md`: establish first, change
second. What would come next is a restart or a change to a file, and both need a
confirmation of their own, with intent, target and way back. The record of the self-healing
is the first thing you read then: it says what was already tried.

## Taking back

```
node .ara/tools/heal.mjs --device <device> --undo H-0002
```

Runs the recorded way back, waits for the state, compares it with the state before the
intervention, and writes the result into the file. Every intervention is taken back on its
own; taking one back does not touch another. An intervention that was already taken back
is refused, and so is a number that does not exist.

After a run, for a customer device: an entry in `customers/<customer>/history/`, with the
numbers of the interventions. The runsheet and the history are what somebody reads in half
a year, and the file is what they check it against.
