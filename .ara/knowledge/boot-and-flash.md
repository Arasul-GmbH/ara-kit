# Procedure: operating system and boot medium

> **When do you need this?** In phase 1 of a setup, before the device is reachable on the
> network for the first time.

## The basic question: what does this device actually need?

Not every device needs a new operating system. Clarify first which of the three cases applies.
If it is not unambiguous, ask the human instead of guessing. An unnecessary flash costs half a
day.

### Case A. The factory system stays

Devices that come with a suitable operating system from the factory. Nothing is installed anew
here. The human starts the device, goes through the manufacturer's initial setup (language,
keyboard, user, network) and reports back.

Your job: a short announcement of what to expect, and after that the first contact over the
network. Nothing more.

### Case B. A standard Linux on a computer with ordinary hardware

Here you really help: get the image, compare the checksum, write the boot medium, lead through
the boot menu and the installer.

### Case C. An embedded device that has to be flashed

The most laborious case. Such devices are not installed from a stick, they are put into a
recovery mode over a cable connection from another computer and written to. The manufacturer's
tools and prerequisites apply for that.

**This prerequisite is hard:** the writing computer has to have the architecture and operating
system version the manufacturer demands. A computer with a different architecture cannot do it,
not even in a container, because the connection to the device in recovery mode would have to be
passed through.

What you do:

1. **Check whether a suitable computer is available.** The technical check from onboarding
   records that in `business/profile.md`.
2. **If there is none:** say it clearly and early. Not "that will be difficult", but:

   > This device cannot be written from your computer. That needs a computer with the
   > architecture the manufacturer demands. Two ways: you get hold of one, or the device comes
   > to you prepared. Settle that before you fix an appointment at the customer.

3. **If there is one:** the manufacturer's steps apply. Read them up in the current version
   instead of naming them from memory, the tools change with every generation.

## Writing the boot medium (case B)

The only irreversible step of the whole setup. Order:

1. **Get the image.** From the official source, in the version that fits the device.
2. **Compare the checksum.**
   `node .ara/tools/disk.mjs --checksum <file>`
   Compare with the published checksum. If it does not match: **do not write.** A half-loaded
   image leads to a computer that boots halfway, and costs you an on-site appointment.
3. **Show the disks.**
   `node .ara/tools/disk.mjs --list`
   The tool shows external disks only. Read the **label and size** out to the human and have
   them confirm it against the stick in their hand. Two sticks of the same size are the most
   frequent serious mistake.
4. **Preview.**
   `node .ara/tools/disk.mjs --write <image> --to <id>`
   Shows what would happen without doing anything. That is the confirmation stage.
5. **Write.** With `--yes --execute`. Needs administrative rights; if the password does not get
   through, print the two commands shown and let the human run them in their own terminal. That
   is not a failure, that is the normal way.

## Accompanying the first boot

What you cannot do yourself, so plugging in the stick, pressing a key, moving a cable, becomes
**one short instruction, not a manual**. One step, then wait, then the next:

> Plug in the stick and restart the device. While it comes up, press the key for the boot menu,
> depending on the manufacturer F11, F12 or Del. Tell me when you see the menu.

Not six steps at once. The human is standing in front of the device and cannot read along.

At the installer you lead through the points that count later:

- **User name**: that becomes the login name for remote maintenance. Keep it consistent.
- **Network**: fixed address or automatic? A fixed address is almost always the better choice
  for a device that is meant to stay reachable. Agree that with whoever looks after the customer
  network.
- **Disk encryption**: consider that an encrypted device does not boot through after a power cut
  without an entry. For a device in a server cabinet that is a deliberate decision, not a side
  matter.
- **Automatic login**: off.

Everything decided here belongs in the runsheet. In six months nobody knows any more why the
device is called what it is called.

## When it gets stuck

- **Device does not boot from the stick:** boot order, secure boot, change the port.
- **Boots but aborts:** usually a damaged image. Check the checksum.
- **No picture:** other port, other screen, a device sometimes needs a connected screen at boot.

After two unsuccessful attempts: stop, write the state into the runsheet and decide together
whether it needs a second appointment. Hours of trying in front of the customer cost more than
a second visit.
