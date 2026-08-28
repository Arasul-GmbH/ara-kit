# Procedure: the Orin before it has a Linux

> **When do you need this?** In phase 1 of a setup on a Jetson AGX Orin that has no usable
> system yet, or that is to get a fresh one. Case C from `.ara/knowledge/boot-and-flash.md`.

As of: 2026-08-28

Source: NVIDIA Jetson Linux Developer Guide for release 36.4.4, pages "Quick Start" and
"Flashing Support" (docs.nvidia.com/jetson/archives/r36.4.4), read on 2026-08-28, and the
USB device-mode configuration read out on a running Jetson AGX Orin Developer Kit over ssh
on the same day. Each step names which of the two it comes from.

## What this guide is and what it is not

**It is a guide with a check step per section, not an automation.** Everything up to the
running Linux happens at a table with a cable in the hand, on a second computer, and the
kit cannot reach any of it. So it leads, one section at a time, and after every section it
says how you check that you may go on. Only from section 7 onwards does the kit work by
itself.

**Nothing in it is verified by the kit.** The steps are built from NVIDIA's documentation
and from what a running Orin says about itself. The test device of the kit was not flashed
for this guide, and a flash the kit has watched does not exist. Where a check comes from
the running device rather than from the documentation, the step says so. If a step does
not match what you see, the documentation applies, and this guide gets a correction.

**The release number is not a constant.** 36.4.4 is the release this guide was read
against; NVIDIA's download page names a newer line for the Orin family in the meantime,
with a different host Ubuntu, and the running test device of the kit reported `R36`,
revision `4.7` on the same day. Before you download, read the current page and take the
release that names your module. What changes with it are the numbers, not the order of
the steps.

Everything you decide along the way (user name, host name, address) belongs in the
runsheet, phase 1. The device file, and with it the runsheet, comes into being in section 7;
until then write the decisions down beside you and carry them over right after step 1 there:
`node .ara/tools/runsheet.mjs --device <device> --phase 1 --entry "..."`.

## 1. The host computer

The Orin is not installed from a stick. It is put into a recovery mode and written to
from a second computer over a USB-C cable, and that computer has to fit.

- **x86-64 with the Ubuntu the Quick Start of your release names.** For 36.4.4 that is
  "a separate Linux (Ubuntu 22.04 or Ubuntu 20.04) host system", and no architecture; a
  newer release names a newer Ubuntu, and then that one applies. The architecture is
  the kit's rule from `.ara/knowledge/boot-and-flash.md`: a Mac, an ARM computer or a
  virtual machine is not covered by that page, and the kit has not seen one work.
- **Free space.** NVIDIA's requirements page for the SDK Manager names 27 GB on the host
  and 16 GB on the target. The 27 GB are your measure here, the release package and the
  unpacked root file system are of that order; the 16 GB lie on the Orin's own storage.
- **A USB-C cable** that carries data, not only charge, and the Orin's power supply.

Whether such a computer exists stands in `business/profile.md` from onboarding. If there
is none: say it now, before an appointment, along `.ara/knowledge/boot-and-flash.md`.

**Check:** on the host, `uname -m` prints `x86_64`, `lsb_release -rs` prints the Ubuntu
your release names (`22.04` or `20.04` for 36.4.4), and `df -h ~` shows at least 27 GB
free. Only then go on.

## 2. The release package

From `https://developer.nvidia.com/linux-tegra`, the Quick Start names that address: the
Jetson Linux release package and the sample root file system for the release that names
your module. The page names them `Jetson_Linux_<version>_aarch64.tbz2` and
`Tegra_Linux_Sample-Root-Filesystem_<version>_aarch64.tbz2`, and the download needs an
NVIDIA developer account. Then, in the folder where both lie, in this order (Quick Start,
verbatim, with the two file names typed in place of the variables, exactly as `ls` shows
them after the download; they are the page's placeholders and no variables of yours):

```
tar xf ${L4T_RELEASE_PACKAGE}
sudo tar xpf ${SAMPLE_FS_PACKAGE} -C Linux_for_Tegra/rootfs/
cd Linux_for_Tegra/
sudo ./tools/l4t_flash_prerequisites.sh
sudo ./apply_binaries.sh
```

`l4t_flash_prerequisites.sh` installs packages with `apt`, so the host needs internet at
this point. `apply_binaries.sh` copies NVIDIA's drivers into the root file system. Without
it the device boots into a system that does not know its own hardware.

**Check:** `apply_binaries.sh` ends with return code 0 (`echo $?` right after it prints
`0`), and `sudo head -1 rootfs/etc/nv_tegra_release` prints a line that begins with
`# R36 (release), REVISION:` and carries the number of the release you took; on the running
test device it read `# R36 (release), REVISION: 4.7, ...`. That file is what a flashed Orin
carries under `/etc/nv_tegra_release`; the check comes from the running device, not from
the documentation.

## 3. The first user, before the flash

A freshly flashed Orin otherwise starts into a setup wizard on a screen, and there would
have to be somebody with a keyboard. The user is created beforehand instead, on the host,
into the root file system, with NVIDIA's script (Flashing Support, section "Skipping
oem-config"). It runs in `Linux_for_Tegra/`, after `apply_binaries.sh` from section 2:

```
sudo ./tools/l4t_create_default_user.sh -u <name> -p <password> -n <hostname> --accept-license
```

- `-u <name>`: the login name. It becomes `ssh_user` in the device file, keep it
  consistent. Without it the script takes `nvidia`.
- `-p <password>`: without it the script rolls one and you never see it. The password is
  needed exactly once, to roll out the SSH key in section 7. It is not a case for the kit's
  secret store, the kit logs in with the key afterwards: keep it on paper until then, and
  it stands in the host's shell history from now on, which is acceptable for a password that
  has served its purpose after section 7.
- `-n <hostname>`: the name of the device file (`orin`, or the customer device's name).
  Without it the device is called `tegra-ubuntu`.
- `--accept-license`: accepts NVIDIA's licence for the software on the device, so that the
  first boot does not wait for that either.
- **Not `-a`.** That switches automatic login on, and a device that stands at a customer
  does not log anybody in by itself.

**Check:** `sudo grep "^<name>:" rootfs/etc/passwd` prints one line, and `sudo cat
rootfs/etc/hostname` prints the host name. Both files are what the script writes into;
this check is derived from the script's purpose, not quoted from the documentation.

## 4. The recovery handhold

The Orin has to be in Force Recovery mode before the host can write it. On the developer
kit that is three buttons and one cable (Quick Start, "Jetson AGX Orin Developer Kit"):

1. Plug the USB-C cable into **the USB-C port next to the 40-pin header** on the Orin
   and into the host. Connect the power supply.
2. Make sure the developer kit is powered off. Without a screen the sure way is: power
   supply off, ten seconds, power supply back in. If the fan starts by itself at that, the
   kit is set to power on with the supply; then hold Power until it goes quiet.
3. Press and hold the **Force Recovery** button.
4. Press and release the **Power** button.
5. Release the Force Recovery button.

Nothing appears on a screen in this mode, that is normal. The Orin waits for the host.
Whether it was really off in step 2 you cannot see without a screen either, and the
documentation names no sign for it: if the line below does not come, doubt that first.

**Check:** on the host `lsusb` prints a line with `ID 0955:7023 NVIDIA Corp.` or
`ID 0955:7223 NVIDIA Corp.` The Quick Start names `7023` for the AGX Orin with 64 GB and
`7223` for the one with 32 GB; `7323` and above are Orin NX and Orin Nano, not this guide.
If no `0955` line appears: cable, port, or the order of the buttons, then once more from
step 2. Do not start the flash without this line.

## 5. The flash

This is the one irreversible step. Everything on the Orin is gone afterwards, the system
and whatever anybody kept on it. **Ask through the interview tool before you name the
command**, with the consequence in plain words, and take only an explicit yes
(`.ara/knowledge/security.md`, level 3).

For the internal storage (Quick Start):

```
sudo ./flash.sh jetson-agx-orin-devkit internal
```

`internal` is the storage on the module itself, the one the developer kit boots from as
delivered. Only if somebody fitted an NVMe drive and wants to boot from it does the other
way apply. For an NVMe drive the Quick Start names a different tool, `tools/kernel_flash/
l4t_initrd_flash.sh`, with a configuration for exactly that case. Take its line from the
current page, it carries options that belong to the release.

The run takes minutes and writes a lot. Read along. If it aborts, the cause stands in the
last lines; fix it, put the Orin into recovery mode again (section 4, the check with
`lsusb` included) and run the same command once more. After two failed attempts: stop,
write the state into the runsheet, decide whether it needs a second appointment.

**Check:** `flash.sh` ends with return code 0 (`echo $?` right after it), and its last
lines report no error. The restart the Quick Start announces afterwards is not visible
without a screen, so the check that counts follows in the next section: a device that
answers on the USB-C network was flashed.

## 6. The network over the USB-C cable

After the first boot the Orin opens a small network over the same USB-C cable. The Orin is
`192.168.55.1` on it, and it hands the host `192.168.55.100`. That stands in the device's
own configuration, `/opt/nvidia/l4t-usb-device-mode/nv-l4t-usb-device-mode-config.sh`,
lines `net_ip` and `net_dhcp_start`, read on the running Orin on 2026-08-28, where the
service `nv-l4t-usb-device-mode.service` was active. NVIDIA's page on the USB device mode
was not reachable that day, so this section rests on the device alone.

Leave the cable where it is. The Orin needs a minute after the flash; the first boot
resizes the file system and starts the services.

**Check:** on the host `ip -4 addr` shows an interface with `192.168.55.100`, and
`ping -c 3 192.168.55.1` answers. Then the login with the user from section 3:
`ssh <name>@192.168.55.1 'cat /etc/nv_tegra_release'` prints the release line. The first
login asks whether to accept the device's host key, answer yes; after a second flash the key
is a new one, see "When it gets stuck". With that
the Orin has a Linux, a user and an address, and the manual part is over.

## 7. From here the kit works by itself

Everything below runs over the connection from section 6 and is the normal way of
`.ara/knowledge/device.md`. The commands are named here so that nobody has to look for
them at the table:

1. **The key.** The kit logs in with a key only, never with a password, so the key comes
   before the file: `ssh-copy-id -i ~/.ssh/<key>.pub <name>@192.168.55.1`, with the key
   from `business/profile.md`. That is where the password from section 3 is typed, exactly
   once, and then not any more. `ssh <name>@192.168.55.1 true` without a password prompt
   proves it. Whether the device keeps accepting passwords at all is decided along
   `.ara/knowledge/remote-access.md`.
2. **The file and the verdict.**
   `node .ara/tools/device.mjs --host 192.168.55.1 --user <name> --key <key> --name <device>`
   creates the file, reads what the device says about itself and delivers the verdict, with
   the verification level of the profile before anything else. `--customer <customer>` for a
   customer device. The address changes later, see 3.
3. **The real address.** The USB-C network exists only at the table, so this comes after
   the key and before the cable goes. Plug the Orin into the customer network by Ethernet.
   It asks for an address over DHCP and the customer's router hands one out, best as a
   reservation for the Orin's hardware address; that is the customer's network, not the
   kit's. Read the address over the USB-C link, `ssh <name>@192.168.55.1 'ip -4 addr'`
   shows it on the Ethernet interface. Put it into `address` in the frontmatter of the
   device file, `devices/<device>/device.md`, where step 2 wrote `192.168.55.1`, and check
   the connection over the customer network: `node .ara/tools/remote.mjs --device <device>
   --check`. Only when that answers may the USB-C cable go. A fixed address, a VPN or a
   route from outside are `.ara/knowledge/remote-access.md`.
4. **Docker, then Arasul.** `node .ara/tools/device.mjs --name <device> --install docker`
   if it is missing, then `--install arasul` with the device token from
   `https://www.arasul.de/kaufen`; where it comes from and how it gets in, in both branches, stands in `.ara/knowledge/device.md`,
   "Installing Arasul".
   Both are level 2 interventions and get confirmed once, with intent, target and way back.
5. **The self-healing** is what looks after the running device afterwards:
   `node .ara/tools/heal.mjs --device <device>`, procedure `.ara/knowledge/self-healing.md`.
   It acts only inside the Arasul directory tree. Nothing from this guide, not the
   bootloader, not the flash, not the user, is ever touched by it.

**Check:** `node .ara/tools/device.mjs --name <device>` reports the connection over SSH,
the profile with its verification level, and `arasul: running` once step 4 is through.
From here `/device` and `/maintain` say what comes next.

## When it gets stuck

- **`lsusb` shows no `0955` line:** the cable is in the wrong port, does not carry data,
  or the buttons went in the wrong order. Section 4 once more from step 2.
- **`flash.sh` aborts:** the last lines say why. A full host disk and a missing
  `apply_binaries.sh` are the two frequent reasons. Fix, recovery mode again, once more.
- **No `192.168.55.1` after the boot:** wait a minute, then `ip -4 addr` on the host. If
  no `192.168.55.100` appears, unplug the cable and plug it into the same port again. The
  host has to take an address over DHCP on the new interface; NetworkManager does that by
  itself, a host without it has to be told to ask on that interface: `ip link` shows which
  one appeared with the cable, `sudo dhclient <interface>` asks. If the Orin does not
  answer after that, connect a screen: what it shows there belongs in the
  runsheet before anybody flashes a second time.
- **The login is refused:** the user from section 3 does not exist on the device, then the
  script ran before the root file system was unpacked, or after the flash. Section 3 again,
  then section 4 and 5.
- **`ssh` stops with "REMOTE HOST IDENTIFICATION HAS CHANGED":** the Orin was flashed a
  second time and carries a new host key, and the host still knows the old one. Here that is
  expected and no attack: `ssh-keygen -R 192.168.55.1` forgets the old key, then log in again.
