# Security: levels, access, customer binding

> **When do you need this?** Before you change anything, on the partner's computer or on a
> customer device.

## The three levels

### Level 1. Reading

Query status, look at logs, read files, list directories, check the network. **Runs without
asking.** Do not ask permission to look.

### Level 2. Changing

Edit configuration, restart a service, install a package, deploy an update, roll out a key,
write a file. **Needs a confirmation** that names three things:

> **Intent:** what you want to achieve
> **Target:** what exactly gets touched
> **Way back:** how the state is restored

Example:

> I am hardening SSH access on the device at Müller. What gets touched is the SSH server
> configuration; afterwards password login is switched off. Way back: I make a backup of the
> file beforehand, and your existing session stays open until we have checked the new one.
> Shall I?

**One exception, with limits: the self-healing** (`.ara/knowledge/self-healing.md`). It
acts inside one run without asking again, because the three things are fixed beforehand:
the intent is that everything of Arasul runs again, the target is the Arasul directory
tree and nothing outside it, never the bootloader, and the way back stands per step in the
device file and runs with `--undo`. Calling it is the confirmation, and on a customer
device you name it beforehand like any level 2 intervention. It asks only when it gives up.

### Level 3. Irreversible

Restart, write to a disk, flash firmware, delete data, factory reset, withdraw a licence,
create a partition. **Needs an explicit yes**, and you name the consequence in plain words
beforehand.

When writing to a disk you **always** name the device name, the size and what is
recognisable on it before you ask. The most frequent serious mistake in this work is the
wrong USB port.

> I am writing the Ubuntu image to `/dev/disk4`, 61 GB, currently labelled with a partition
> "PATRIOT". The entire contents will be lost and cannot be recovered. Is that the right
> stick?

A confirmation holds for **one** action, not for the rest of the session.

## Access

- **`.env`** contains tokens and passwords. You do not read it and you never display its
  contents. Scripts may use it. If you want to know whether a token is set, ask the script,
  not the file.
- **Private SSH keys** live in `~/.ssh` and stay there. Never copy them into the kit, into a
  customer folder or into a message. The kit only holds the name of the matching key.
- **Customer passwords** belong in the `.env`, not in `device.md`. The device file only says
  that one exists and under which name it is stored.
- If you notice that a secret has landed in the wrong place, say so immediately and suggest
  cleaning it up and rotating it.

## Customer binding

When a command runs with a customer argument, you work **exclusively**:

- in `customers/<this-customer>/`
- with the devices that stand in that file

No look into other customer folders, no connection to other devices, no "at another customer
it was like this". If knowledge from elsewhere would help, say it in general form ("I know
that as a frequent mistake") without naming the other customer.

Switching to another customer happens only when the human says so explicitly, and never in
the middle of a running task. If a task is still open, point that out before you switch.

## On customer devices

A customer device stands in somebody else's company network and processes somebody else's
data.

- **Touch nothing that does not belong to the task.** No curious looks into customer
  documents, no database queries without cause, no reading chat histories.
- **Copy nothing off the device** apart from what the task needs. Log excerpts yes, customer
  data no.
- **Remote access is an agreement**, not a given. If it is unclear whether the customer has
  consented to access, ask the partner before you connect.
- Every intervention is logged. In the end that protects the partner.

## The hard guard

Independently of all levels, some patterns are barred and get blocked by the guard
(`.ara/tools/guard.mjs`) before you can run them, for instance recursive deletion at the
root or writing to a system disk. If the guard strikes, do not try to get around it. Tell
the human what you were about to do and why it was blocked.
