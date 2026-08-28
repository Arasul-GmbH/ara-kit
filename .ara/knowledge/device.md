# Procedure: /device

> **When do you need this?** At `/device`: create a device, check it, judge it, and then know
> what comes next. From the file to the handover.

## What `/device` does

One command, two situations. **Without a file** it creates one and checks the device. **With a
file** it checks again and says where things stand. The same tool does both:

```
node .ara/tools/device.mjs --host <address> --user <name> --name <device>   first time
node .ara/tools/device.mjs --name <device>                                  every further time
node .ara/tools/device.mjs --name <device> --json                           for evaluation
```

For a customer device `--customer <customer>` comes along. The tool:

1. creates the file `device.md` from `.ara/templates/device.md` if it is missing,
2. checks the SSH connection with a key, without a password prompt,
3. runs a reading script on the device: hardware, system, memory, Docker, Ollama as a program or
   as a container, traces of Arasul,
4. recognises the device from that, without prior knowledge, and says how well backed that is,
5. delivers the verdict and writes finding, profile and verdict into the file, under "Prüfungen",
6. remembers the device in `.ara/state.json`,
7. names the next step.

It only reads. The interventions are `--install` and `--deploy-key`, both further down, both only
on request and after confirmation.

## Where the file lies

| Device | Place | Call |
| --- | --- | --- |
| without a customer, both branches | `devices/<device>/` | `--name <device>` |
| customer device, partner only | `customers/<customer>/devices/<device>/` | `--customer <customer> --name <device>` |

A company has only the first case. A partner has both: their own devices (demonstration, practice,
own operation) lie under `devices/`, the customers' under the customer. No dummy customer for an
own device, that falsifies every evaluation.

**Device name:** lower case, digits, hyphens. For customer devices after location or role
(`zentrale`, `werk2`, `praxis-eg`), not after the model: the model stands in the file and can
change, the location stays. For devices without a customer the model is a good name (`orin`,
`dgx-spark`), because the location does not tell them apart.

## Recognition, and how well backed it is

**The tool needs to be told nothing about the device.** It reads what the device says about
itself and prints five things, each with the place that gives it: whether it is reachable, the
vendor (`/sys/class/dmi/id/sys_vendor`), the model (`/proc/device-tree/model` or DMI), the
architecture and the running system.

Out of that comes the **device profile**, and the tool prints that as its own section:

- **The kit profile.** One sheet per device under `.ara/knowledge/devices/`, and the sheet says
  what date it is from and where its knowledge came from. That is a statement about hardware,
  not about the product, and it is written down: nothing is researched at runtime. If no sheet
  fits, the tool says so instead of putting up something similar.
- **The catalogue profile.** The profile the product carries for this hardware. It only gets
  named when the mirror really has it, and only when the memory fits the variant: `orin-64` on
  an Orin with 32 GB would be a promise about memory this device does not keep.
- **The verification level.** The field `verification` from the catalogue, read from the mirror.
  `live` means verified on real hardware, `emulation` means only checked under emulation,
  `follow-up` means built from manufacturer documentation and tried on no device.

**This line stands before every intervention, not after it.** Whoever installs on a device
should have read beforehand what the kit is going by and how far that carries. Without a mirror
there is no level, and then the tool says that it cannot read it. It guesses none.

A device that is not here can be talked about too:

```
node .ara/tools/device.mjs --name thor --probe <file with findings>
```

That is the dry run. Same recognition, same profile, same verification level, findings from a
file instead of from a device. **It writes nothing and changes nothing**, and it refuses
`--install`, `--deploy-key` and `--admin-login`. That is how a partner finds out what the kit
would say about a device before they buy it.

## The verdict

Three answers, and each has a consequence:

| Verdict | Recognised by | What follows |
| --- | --- | --- |
| **supported** | a sheet under `.ara/knowledge/devices/` whose `support` says so | Arasul can run on it. Continue below at "After the verdict" |
| **soon** | a sheet that says `soon`, or NVIDIA graphics without a sheet | Announced. Noted in the file, continue as soon as the mirror carries a profile for it |
| **not supported, we note it down** | everything else, a Mac for instance or a computer without NVIDIA graphics | Noted in the file with a date. Without Arasul it ends here |

Which hardware carries Arasul stands in the sheets and not in the code, and it is a statement of
the kit, not a product value. A new device is a new sheet. What applies on a supported device
(model, engine, memory) still stands only in the mirror:
`.ara/knowledge/identify-device.md`.

**Noting down** means: `verdict` and `noted_on` stand in the file. That keeps it visible which
devices were asked about, and the human can pass that to the product team.

**Without Arasul it ends here, and it ends helpfully.** The tool closes with three things, and
none of them is a sales pitch: what Arasul would bring in one sentence (login, staging and going
live for apps, permissions, flows, backup and maintenance), which devices carry it today
according to the sheets, and a calm sentence on the licence. The kit is under the Apache licence
2.0 and stays usable without Arasul; what Arasul costs stands under "The token" below, and the
tool says it in one sentence.

**Questions about Arasul need no device.** Somebody who tries the kit on their laptop and then
asks what it actually is gets an answer, from `.ara/knowledge/sales.md` and
`.ara/knowledge/extensions.md`, and an honest "I do not know that" where the answer would be a
product value the kit cannot reach. Say nothing more than was asked, unless the human starts.

## When SSH does not stand

The tool creates the file anyway and enters `ssh: refused`. Then, in this order:

1. `node .ara/tools/find-device.mjs --host <address>`: does anything answer there at all?
2. Roll out a key, procedure `.ara/knowledge/remote-access.md`. The private key stays in `~/.ssh`,
   the kit only holds its name.
3. Once more `node .ara/tools/device.mjs --name <device>`.

If the target is this computer itself (`localhost`) and SSH is off, the tool checks locally and
writes `ssh: local` into the file. That is enough for the file, not for remote access.

## Docker and Ollama

The tool recognises both and says whether they are there. It sets them up only on request:

```
node .ara/tools/device.mjs --name <device> --install docker,ollama
```

That is a level 2 intervention (`.ara/knowledge/security.md`): name intent, target and way back
beforehand and have it confirmed. It runs on Linux only, needs root on the device and uses the
manufacturers' installation routes. On a Mac it stays manual work, the tool says so itself. After
the installation it checks again, so that the file carries the state and not the intention.

**Ollama can lie on the device as a program or run in a container.** The tool recognises both and
says what it found: `present` for the program, `container` with the name of the container,
`missing` for neither. On a device with Arasul the container is the normal case, and "missing"
would be wrong there: putting a second Ollama next to it would mean putting a second model into the
same memory. That is why the tool only offers to set it up where nothing really runs.

On a device that is not supported, Docker and Ollama still make sense: apps can be built and models
tried out with them. What is missing is Arasul.

## After the verdict: supported

From here on the loop of every setup applies: **check the precondition, do it, prove it, write it
into the runsheet.** The memory is the runsheet, not the conversation, because a setup takes hours
and survives sessions.

```
node .ara/tools/runsheet.mjs --create --device <device>            create
node .ara/tools/runsheet.mjs --device <device> --show               read the state
node .ara/tools/runsheet.mjs --device <device> --phase <n> --state <done|paused> \
  --entry "What was done. Evidence: what you checked and what came out of it."
```

For customer devices with `--customer <customer>`. An entry without evidence is worthless. "SSH
hardened" says nothing. "SSH hardened, login with a password is now refused, with a key it works"
is evidence. If something is stuck: `--state paused`, say what you see, do not keep trying past
the fault.

The phases of the runsheet and what applies in each:

- **0 Preparation.** Settle the network question with whoever looks after the network: fixed
  address, internet, firewall. Token stored? `node .ara/tools/secrets.mjs --show` says so without
  showing the value. Fix a fallback plan: what happens if it does not get finished. Estimate the
  time honestly.
- **1 Operating system.** Only if the device has none yet or needs a different one. Procedure
  `.ara/knowledge/boot-and-flash.md`, for a Jetson AGX Orin `.ara/knowledge/flash-orin.md`
  with a check step per section. A disk gets written only after an explicit yes.
- **2 First contact.** `/device` has already done that: SSH stands, the file has address, login
  name, port and key name. From now on every command runs through
  `node .ara/tools/remote.mjs --device <device> --command "…"`.
- **3 Install Arasul.** One call, see "Installing Arasul" further down:
  `node .ara/tools/device.mjs --name <device> --install arasul`. Read the output along, stop at
  errors. Evidence: the device's contract can be read and fits the kit,
  `node .ara/tools/app.mjs --device <device> --contract`.
- **4 Follow-up.** First check whether something is missing, the product handles some of it
  itself. Model present, name resolution, harden access (only once key login demonstrably works,
  and keep the running session open), network hardening, remote access along
  `.ara/knowledge/remote-access.md`. If port or login name change: pull them into `device.md`
  immediately.
- **5 Evidence.** Checklist in `.ara/knowledge/handover.md`. Services healthy also after a restart,
  a real question delivers a sensible answer, a test document is found again, remote access from
  outside the network. The last point is skipped most often, a mobile connection is enough to
  check.
- **6 Handover.** `handover.md` out of the runsheet, short guide from
  `.ara/templates/quickstart.md`, hand over the access, show the emergency off. `status: live` and
  `accepted_on` in `device.md`, runsheet to `done`. With an own device there is nobody to hand over
  to: then `device.md`, the runsheet and the evidence from phase 5 remain.

If the device already carries Arasul when `/device` finds it, that is not a case for a setup but
for the kit key and afterwards for `/maintain`.

**From the running Linux onwards the kit works by itself**, and the piece after the
installation is the self-healing: when something of Arasul does not run any more,
`node .ara/tools/heal.mjs --device <device>` starts it again, only inside the Arasul
directory tree, never the bootloader, with every step in the device file and a way back per
step (`--undo <id>`). It asks only when it gives up. Procedure:
`.ara/knowledge/self-healing.md`.

## Installing Arasul

**Two ways lead to a device with Arasul, and both end at the same point:** a device whose contract
the kit can read, and a kit key in the file.

| Situation | What to do |
| --- | --- |
| The device already runs (`arasul: running`) | Only the key is missing: `--deploy-key` |
| The device is supported but empty | `--install arasul`, the key comes afterwards by itself |

### The token

**The token question comes up here and nowhere else.** At onboarding there is nothing to install,
so `/init` needs no token, and it does not ask for one either. **There is no command for buying.**
Not one called kaufen, not one called licence. The way hangs on `/device`, at the place where the verdict
"supported" falls, and the tool takes it by itself.

What holds, as of 2026-08-28, and what you may say:

- **Account and token come from <https://www.arasul.de/kaufen>.** That is the one address.
- **An account is free of charge and brings exactly one free device token** for personal use.
  Every further installation is bought. Commercial use needs the licence, 3,000 euros net.
- The token has the form `ara_` followed by 32 hexadecimal characters. It is a gate in front of
  the download, not a licence check: on the device Arasul checks no token, and the kit carries
  none there either.

**How it runs, in the interview tool, never in running text:**

1. `/device` delivers the verdict **supported**, nothing of Arasul runs, no token is stored. The
   tool then says so under "Next steps", with the link. You ask through the interview tool
   whether Arasul should be installed on this device, with the link in the question and one
   sentence on what the account brings and what a further device costs. Options: yes, no, and
   the open one.
2. **Yes:** the human opens the page, creates the account, copies the token and pastes it here.
   That is all they have to do. You do not fetch the token, you do not open the page for them.
3. **The pasted token goes in over the pipe, never as an argument**, and you never repeat it in
   text:

   ```
   printf '%s' "$TOKEN" | node .ara/tools/device.mjs --licence --store
   ```

   The tool checks the form, asks the portal (`GET /api/download?token=<token>&pruefen=1`,
   without fetching the artifact), stores it under `ARASUL_TOKEN` in the chosen secret store,
   and says which files an installation fits: supported, and Arasul does not run there. **One
   file:** it names the call. **Several:** you ask through the interview tool which device it
   should be. **None:** `/device <name>` first. A refused token comes back with the portal's
   reason, and nothing is stored.
4. Then `--install arasul` on the chosen file, as a level 2 intervention, further down.
5. **No:** it stays noted in the file, nothing else happens, and you do not ask a second time in
   the same session.

**Somebody asks by themselves about buying, a licence or a token**, in any words and without a
device in the sentence: the same way, and they need no command for it.

```
node .ara/tools/device.mjs --licence
```

That says whether a token is stored, shows the link and the sentences from above, and lists
which files an installation would fit. From there it is step 1: ask through the interview tool,
wait for the token, `--licence --store`, then the question which device, when there are several.

You never read the token out yourself and never display its value. `node .ara/tools/secrets.mjs
--show` says whether one is stored, without the value.

### The sequence

```
node .ara/tools/device.mjs --name <device> --install arasul
node .ara/tools/device.mjs --name <device> --install arasul --net-name werk2
```

That is a **level 2 intervention**, and it takes a while. Name intent, target and way back
beforehand and have it confirmed. The tool stops at five points beforehand, and each is a no and
not a maybe: no connection, no supported device, a running platform, no Docker, no token. Then it
starts:

1. **The installer is fetched**, over `www.arasul.de/api/download` with the token, and lands as a
   mirror in `.ara/mirror/`, with version and source in `STATE.json`. **The mirror comes into being
   exactly here and nowhere else.**
2. **It is pushed to the device**, over the already checked SSH connection, to
   `$HOME/arasul-<version>`, and unpacked there. The token stays on the partner's computer.
3. **The installer runs on the device.** What it is called the artifact says itself in
   `arasul-release.json`; the kit reads it there and does not guess, and it reads the version there
   too. It is called with a start password and a network name, because **only then do network name,
   version, start password and the first output come into being on the device**. Its output runs
   across the screen, you read along, and the kit reads along: it masks whatever looks like a key or
   a password. If it aborts, nothing gets talked up: read the cause, fix it, the same command again.
4. **The kit key is created**, see below.

**`tls: selfsigned` the file carries afterwards by itself.** A freshly installed device issues its
certificate from a device CA of its own. Without that entry the first call against the interface
fails at `SELF_SIGNED_CERT_IN_CHAIN`, and that after an installation the kit did itself. If the
device gets a certificate later that can be verified, you take the entry out again by hand.

**The kit rolls the start password and puts it into the secret store immediately**, under the name
the file carries in `start_password_ref`. It stands in no log, in no output and in no file of the
kit. On the device it additionally stands in the first output the installer writes: that is the
version that belongs to the device's administrator. Whoever wants to assign their own puts it there
themselves beforehand:

```
printf '%s' "<password>" | node .ara/tools/secrets.mjs --set <entry>
```

**The network name** is, without an entry, the name of the file. `--net-name <name>` sets a
different one. It lands in `net_name` in the device file.

### What the installer could not do

The installer does not do everything, and it says so in the middle of several hundred lines. The
kit reads its output along, collects those lines and lays them down once more at the end, under
**"Was der Installer nicht konnte"**, and into the file under Prüfungen.

**"Not critical" the installer says about its own run, not about the device at the customer.** A
failed SSH hardening and a firewall that was not set up are a footnote to the installer and an open
door for a device in somebody else's network. Go through the list before the device is delivered:
harden access along `.ara/knowledge/remote-access.md`, everything else on the device with root
rights. What you caught up on and what stays open you write into the runsheet.

### Traces, but nothing runs

The trace search knows three answers, and the difference decides what goes next:

| `arasul:` in the file | Recognised by | What follows |
| --- | --- | --- |
| `running` | a container of the platform runs | no setup any more, that would be an update. If only the key is missing: `--deploy-key` |
| `traces` | folders or services there, but nothing runs | installing works, explicitly: `--install arasul --despite-traces` |
| `none` | nothing found | the normal way |

`traces` is the state after an aborted attempt or after a factory reset where something stayed
behind. **Look first at what lies there** (`node .ara/tools/remote.mjs --device <device> --command
"ls -la ~"`), tell the human what you found, and have going ahead confirmed. An installation over
traces can meet what is already there, and that is not a case for a silent yes.

### The kit key

With it the kit later rolls apps onto the device: **no SSH, no password, no session, only a key
with the scope `app:deploy`.** It comes into being on the device, belongs to the administrator there
and can be revoked by them at any time.

```
node .ara/tools/device.mjs --name <device> --deploy-key
```

On a device that already runs, that is the only step. After `--install arasul` it happens by itself.

**The plain text appears exactly once.** The tool puts it into the secret store and writes only the
name of the entry into the file, under `api_key_ref`. It stands in no file of the kit, in no log and
**never in the portal**: the portal issues download tokens, not device keys. If it is lost, you
create a new one and have the old one revoked on the device, looking it up is not possible.

### The evidence

Installed is not handed over. The first piece of evidence is the contract:

```
node .ara/tools/app.mjs --device <device> --contract
```

If it answers, the platform stands, the key holds and the kit fits this device. How a finished
package gets there stands in `.ara/knowledge/deploy.md`; how a customer wish becomes an app at all,
in `.ara/knowledge/app.md`. The next command is then `/app`.

**If it does not answer although SSH stands**, the interface sits elsewhere than the access: behind
a tunnel, under a different name, on a different port. Then the file carries `api_base`, the address
with a prefix at which the interface really answers. It beats `address`, stays in the file and does
not have to be typed along at every call. `--base <url>` still exists, for the one attempt that does
not belong in the file.

## The first employee and the first permission

After the installation the platform runs, and **nobody may get in except the administrator**, whose
start password comes from step 3. Before a human at the customer sees anything, two things are
needed: an employee and a permission for what they should use. Both belong to the handover and not
to afterwards.

**The usual way is the interface**, in the browser on the device, logged in as the administrator.

### The session: `--admin-login`

The kit has a kit key with `app:deploy` and no session. But it can fetch a session, and out of the
start password that came into being at the installation:

```
node .ara/tools/device.mjs --name <device> --admin-login
```

That logs in on the device and prints the credential the next calls go with. **The password is not
displayed in doing so**, it goes from the secret store straight into the login. The route runs over
the interface and not over SSH: it needs neither a login name nor a key for that, only `address` or
`api_base` in the file. For a script `--token` gives only the credential:

```
SESSION=$(node .ara/tools/device.mjs --name <device> --admin-login --token)
```

The route there is `POST /api/auth/login`, and that is a statement about the product like any other:
**it belongs checked on a device.** The documentation self-test does that:

```
node .ara/tools/check-docs.mjs --device <device>
```

If the artifact in `arasul-release.json` names a different route or a different name for the
administrator, that one applies. If neither is right, you pass it in the call: `--login-path
<route>` and `--login-user <name>`. The tool writes down every time where it got its details from.

If the device refuses the login, that usually has one of two reasons: the administrator is called
something else there, or the start password has already been changed on the device. Then the entry
in the store is stale, and the human who changed it knows the new one.

**Which names the store holds**, `node .ara/tools/secrets.mjs --show` says. There stands the entry
with the start password too, with the device next to it. Values never stand there.

### Route and body stand in the artifact

What you then call with the session does not stand in the kit but in the artifact. The mirror brings
the manuals that belong to exactly this version:

```
node .ara/tools/mirror.mjs --docs
```

Two of them you need here, and both lie under `.ara/mirror/`:

- **The admin handbook**, chapters on employees and on permissions. It says what an employee is,
  what a permission allows and in which order both are created.
- **The API reference.** It names the routes for it, the required fields and the answer.

The call has the shape every interface there has: a credential in the header, nothing else.

```
curl -sS -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '<body from the API reference>' \
  https://<device>/<route from the API reference>
```

**Three things you do not guess while doing this:**

1. **The route and the body.** Both stand in this version's API reference. Do not write them from
   memory and do not copy them from an older sheet.
2. **The token.** It comes from `--admin-login`, otherwise from the route the API reference
   describes. The kit key it is **not**: that carries `app:deploy` and nothing else, and the device
   refuses it here. That is not a mishap but the separation it exists for.
3. **The password.** The administrator passes the start password on the first time and changes it
   afterwards. It stands in the first output on the device and in the kit's secret store, under the
   name from `start_password_ref`. You never display it, you use it through `--admin-login`.

**What you write down:** that an employee was created, who it was, what is shared with them and by
which route you did it. That belongs into the runsheet, phase 6, and it is the point a customer asks
about after half a year.

## After the verdict: soon

Noted. Access may already be hardened (`.ara/knowledge/remote-access.md`), Docker and Ollama may be
set up. As soon as the mirror carries a profile for the hardware, it continues at phase 0. A profile
in the catalogue does not yet mean tried, `.ara/knowledge/identify-device.md` says how you read that
and tell the human honestly.
