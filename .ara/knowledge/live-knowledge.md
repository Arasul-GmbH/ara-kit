# Live knowledge: where values come from

> **When do you need this?** Whenever you want to say, check or run something concrete about
> the product. Models, ports, commands, paths, device profiles, versions.

## Why this rule exists

The product `arasul-jet` develops fast. Models, engines, device profiles and commands have
changed several times within a few weeks. A kit that ships such values as text is wrong on the
day it ships, and then somebody reads them out in front of a customer.

Therefore: **the kit knows how to go about things. The product knows what applies.**

## Source 1: the device's contract

Everything **agreed** between kit and product the device says itself:

```
node .ara/tools/app.mjs --device <device> --contract
```

From there come the schema for `app.json`, the rules no schema carries, the header of a flow
file, the names of the header lines, the limits of a package, the paths under `/apps/` and the
list of endpoints with the scope each one demands. Plus the **contract version**: the number by
which the kit notices that it does not fit this device.

**The kit writes none of these values down.** It reads them per device. Two rebuilds of the
same contract drift apart, and the only question is when somebody notices. Procedure:
`.ara/knowledge/deploy.md` for the way of a package, `.ara/knowledge/platform-services.md` for
the services an app finds there.

**The procedures name routes, and that is on purpose.** A sheet that names none cannot be held
against a device by anyone. They are checked with
`node .ara/tools/check-docs.mjs --device <device>`: it reads every route out of the knowledge,
holds it against the contract's endpoint list and asks on the device. What is missing there it
says with one sentence per route.

## Source 2: the device

As soon as a device is reachable over SSH, it is the more precise source, it tells you what
**actually** runs there, not what was intended.

Ask the device instead of deriving from the mirror when it is about this one device: which
platform was recognised, which profile applies, which services run, which model is loaded,
which version is installed. The matching commands are in the artifact (command line tool in the
root directory, help section). Read them up there instead of using them from memory.

## Source 3: the mirror, that is the artifact

Under `.ara/mirror/` lies the installation artifact: what `arasul.de/api/download` delivered
with the token, together with version and source in `STATE.json`.

```
node .ara/tools/mirror.mjs --show      # what is there, from when, from which source
node .ara/tools/mirror.mjs --docs      # which manuals came along
node .ara/tools/mirror.mjs --refresh   # fetch again
```

**It comes into being at the installation** (`/device` with `--install arasul`) and not
otherwise. Without a token no artifact, then you say so and carry on without product statements.

What you look up there:

| Question | Where in the artifact |
|---|---|
| Which devices does the product know, with what key data? | `config/platforms/*.json` |
| What is used to install, and what is the entry point called? | `arasul-release.json` |
| How does the setup run, which steps are there? | `scripts/` and the command line tools in the root directory |
| What does the product documentation say? | `docs/`, listed by `mirror.mjs --docs` |
| How do you create an employee, how do you share an app? | Admin handbook and API reference, both under `docs/` |
| Which version is this, where does it come from? | `.ara/mirror/STATE.json` |

**Careful with `docs/`:** the product documentation is in places older than the code. If
documentation and script contradict each other, the script applies. Tell the human when you
notice such a contradiction, that is useful feedback for the product team.

If a device is available, it is the more precise source. The artifact says what was delivered,
the device says what runs there.

## Source 4: does not exist

There is no fourth source. In particular:

- **Not your memory.** Even when you are sure.
- **Not an older note in the kit** or in a customer folder. Notes record what was the case then.
- **Not the internet.** Public guides describe other systems.

## When no source is available

Say it clearly and offer what works without it:

> "For the model name I need access to the device or the artifact. I have neither right now. We
> can finish the file and catch up on that as soon as the device is reachable."

Never write an unchecked value into a customer file. A gap with a note is better than a number
somebody believes.

## What the kit knows instead

Procedures. Orders. What comes before what and why. How you recognise that a step really
worked. Which mistakes happen often and how you establish them. What has to be evidenced at a
handover. That changes slowly. Values change fast.
