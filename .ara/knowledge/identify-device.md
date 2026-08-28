# Procedure: determine the device

> **When do you need this?** At the start of every setup, and whenever you have to know what
> applies on this device. Model, engine, memory budget, particularities.

## The principle

There is **no device list in the kit**. Which devices the product knows and what applies on
them stands in the product itself, in the platform catalogue. That changes, so the kit reads
it instead of rebuilding it.

## Step 1: open the catalogue

Fetch the mirror (`node .ara/tools/mirror.mjs`) and look under
`.ara/mirror/config/platforms/`. There is one profile per device type, plus a description of
the fields.

Read the description file in the same folder first, it explains what the fields mean. Do not
invent the meaning.

## Step 2: check the maturity, that is the important part

A profile in the catalogue does **not** mean the device is tried. The profiles carry
statements about how well they are backed: whether the compute capability of the graphics
unit has been confirmed, and at which level the check stands (on real hardware, only
emulated, or planned as a follow-up).

**Read those fields and tell the human honestly what you see.** A profile whose values are
marked as unconfirmed is a declaration of intent, not a promise. If a partner wants to put
such a device up at a customer, this sentence belongs before the installation, not after:

> The profile for this device is stored in the product, but according to the catalogue it has
> not been confirmed on real hardware yet. We are the first here. Reckon with rework and plan
> a second appointment.

If catalogue entries and sales promises diverge, that is a question for the product team, and
the partner should ask it before promising an appointment.

## Step 3: confirm on the device

As soon as the device runs and is reachable, **ask it yourself**. The product recognises its
platform and can print the recognised profile; the matching commands are in the help of the
command line tool in the root directory of the mirror.

Only that value goes into `device.md` and into the runsheet. Before that, nothing stands
there, or an entry explicitly marked as provisional.

**Why so strict:** a device can be recognised differently from what the delivery note
suggests, different memory fitted, a different build, a previous model in the same case. The
setup follows what the device says about itself.

## Step 4: what you derive from it

Out of the confirmed profile follow memory budget, default model, engine and particularities.
**Take these values from the profile, not from memory**, and write them into the runsheet if
they matter for the setup.

If you notice something that does not fit together, a model the engine cannot load, a memory
budget above what is actually fitted, stop and say so. Such contradictions are the most
frequent reason why an installation ends up not answering.

## When no device is known

When creating a customer file it is often still open which device it will be. That is fine.
Enter nothing you do not know, and plan the device only once it is settled. An offer can work
with a device category, a setup cannot.
