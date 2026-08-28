---
description: Create and check a device. File, SSH, hardware, verdict, state and next steps
argument-hint: [<device> or <customer>/<device>]
---

Device: **$1**

Read `.ara/knowledge/device.md` and work along it. Knowledge this command loads:
`.ara/knowledge/device.md`, `.ara/knowledge/security.md`, plus, only after the verdict and
only when needed, `.ara/knowledge/remote-access.md`, `.ara/knowledge/boot-and-flash.md`,
`.ara/knowledge/identify-device.md`, `.ara/knowledge/handover.md`,
`.ara/knowledge/deploy.md` once Arasul runs on the device, and
`.ara/knowledge/live-knowledge.md` for every product value. You read the profile in
`business/profile.md` beforehand: language, branch, detail level, security level, SSH key.

**The argument.** `zentrale` is a device without a customer, it sits under
`devices/zentrale/`. That holds in both branches: for a company it is the normal case, for
a partner these are their own devices. `mueller/zentrale` is a customer device, it sits
under `customers/mueller/devices/zentrale/`, and the customer already exists by then
(otherwise `/customer` first). No argument: first the marker `.ara/state.json`, then the
existing files. If there is exactly one, take it. Otherwise ask through the interview tool.

**First, always:**

```
node .ara/tools/device.mjs --name <device>
```

With `--customer <customer>` for a customer device. If the file already exists, the tool
checks again and says where things stand. If it does not exist yet, it needs the address
and the login name: `--host <address> --user <name>`, plus `--port` and `--key` if they
differ from the usual. What you do not know of that, you ask in one bundle before you call
the tool, not afterwards.

The tool creates the file, checks SSH, recognises hardware and system, finds Docker,
Ollama and traces of Arasul and delivers the verdict: **supported**, **soon** or **not
supported, we note it down**. It only reads. Say the result in three lines and the next
step it names.

**Docker and Ollama** it only sets up on request, with `--install docker,ollama`. That is
a level 2 intervention: name intent, target and way back, have it confirmed, then call it.
Linux only.

**Installing Arasul** works with `--install arasul`, on a supported device that has none
yet. For that it needs a token from the portal the first time: five per partner free of
charge, a gate in front of the download, not a licence check. If it is missing, the tool
says how to store it. That is level 2 as well, it takes a while, and the installer's
output is read along. The installer gets a start password and a network name, because only
then do they come into being on the device; the kit rolls the password and puts it into the
secret store, the network name is set by `--net-name <name>`, otherwise the name of the
file applies.

**After that you read out two things**, and both stand at the end of the output: what the
installer could not do, and that the file now carries `tls: selfsigned`. The installer's
refusals are not trimmings: a failed hardening is a footnote to it and an open door for a
device in a customer network.

**If traces are lying around but nothing runs** (`arasul: traces`), first look at what is
there, tell the human, and have going ahead anyway confirmed. Then
`--install arasul --despite-traces`. If the platform really runs, this is no longer a
setup but an update, and that is a different path.

**If Arasul already runs**, only the kit key for the deploy is missing: `--deploy-key`
creates it on the device and stores it. The file only carries its name, never its value.
After that the first piece of evidence is the contract:
`node .ara/tools/app.mjs --device <device> --contract`.

**The first employee and the first permission** still belong to the handover. Without a
browser this goes through the platform's admin interface. The session for it is fetched by
`--admin-login`: the start password from the installation goes from the secret store
straight into the login, back comes a credential, and the password is never displayed. What
you call with it, `node .ara/tools/mirror.mjs --docs` says. Procedure in
`.ara/knowledge/device.md`.

**Without Arasul it ends here.** The tool says in one sentence what Arasul would bring.
Nothing more, no sales pitch. With Arasul on a supported device it continues along the
procedure.
