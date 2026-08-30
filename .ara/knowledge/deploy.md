# Procedure: bringing apps onto a device

> **When do you need this?** When an app should land on a device with Arasul: check whether kit
> and device fit together, deploy, switch live, switch back, remove.

## The contract is the source, not this sheet

A device says itself what it promises. One call, and you know:

```
node .ara/tools/app.mjs --device <device> --contract
```

What comes out of it is the **only** source for: the schema of `app.json`, the rules no schema
carries, the header of a flow file, the names of the header lines, the limits of a package, the
paths under `/apps/` and the list of endpoints with the scope each one demands. **Copy none of
it down.** That is why it does not stand here either: what applies today, the device in front of
you says.

The contract carries a **contract version**. The kit does not know one number it was built for,
it knows the highest version it understands. Three situations follow from that:

- **The device carries the same or a lower number.** It goes on. Checking happens against this
  device's schema anyway, and only what stands in its contract gets called. A device nobody has
  touched for half a year is not an error case, it is the normal case in an installed base.
- **The device carries a higher number.** The kit stops and says what it is missing: which
  versions it does not know, and which fields the device names that it does not read. The way out
  is one call, and it is not in the app:

  ```
  node .ara/tools/update.mjs
  ```

  `/init` goes the same way. **The mistake is not in the app**, and every place that runs into it
  says so: `/device` at the first contact with the device, `/init` out of the device file, and
  `--check` and `--deploy` at the end of their output. On 30.08.2026 a workshop stood on contract
  version 3, the Orin carried 5, and three hours went into an app that was fine.
- **The device names none at all.** Then it is older than the contract itself.

Deployment happens only in the first two situations. Sending a package on the off-chance means
looking for the mistake on the device instead of beforehand.

What the app can use on the device afterwards is a different question and stands in
`.ara/knowledge/platform-services.md`: login, permissions, flows, language model, documents.
Here it is only about how it gets there.

**Without the kit key none of these calls work.** It stands in the device file under
`api_key_ref`, its value in the secret store. Where it comes from:
`.ara/knowledge/device.md`, section "Der Kit-Schlüssel".

## What belongs in a package

At the root lies `app.json`, next to it the folders the manifest itself names. **Which fields
name a folder, the contract says** at the root of its package: it writes them as placeholders,
and every placeholder points at the field in the manifest that carries the folder name. The kit
reads them there and does not list them itself. If one is added in the product, it stands in the
contract at the next call.

**Flows are a delivery, not a demand.** If the manifest promises a folder for flows, the package
brings the files along: one file per flow, with a header in the frontmatter and the instruction
as text below it. What belongs in the header and what applies to a flow out of a package stands
in the contract, and `--contract` prints both: the schema of the header and the rules word for
word. Do not copy them down, read them on the device in question.

What the manifest promises the kit checks before packing: that the folder exists and that it is
not empty. That does not replace the contract's rules, it saves the detour through a rejected
package.

## Checking a package before it flies

```
node .ara/tools/app.mjs --device <device> --check <folder>
```

The tool reads `app.json` from the folder and holds it against **this** device's schema. It
reports every deviation with the field in question, and it says what it could not check. It also
checks that the frontend in the package is a **build** and not the source it came out of: every
contract carries that as a rule, and an unbuilt frontend arrives on the device as an empty page
without a hint of why. Two things you have to do yourself:

1. **Read the rules no schema carries.** The tool prints them, word for word out of the contract.
   They are not a footnote: "at least one of frontend and backend", "with a backend a port is
   needed" and whatever else stands there, the device rejects, even when the schema was
   satisfied. Go through them one by one.
2. **Look at what the contract says about the package.** How it is packed, what does not belong
   in it, how big it may be, and what applies to a flow out of the package. Those rules too the
   tool prints word for word, as soon as the device names any.

## Deploying

```
node .ara/tools/app.mjs --device <device> --deploy <folder>
```

The tool first checks the manifest, then packs the **contents** of the folder the way the
contract prescribes, compares the size with the device's limit and sends it. If the manifest does
not fit, nothing gets sent.

**A deploy always rolls into staging.** There is no switch for that, and it is not a question of
convenience: the live slot is what the workforce works with. The device builds the backend itself
from the build file in the package, and that takes a while. Waiting is not a fault.

If the device rejects it, it gives its reason in plain words and the tool passes the reason
through. Read it instead of repeating the call.

**Deployed is not released.** The device delivers the staging slot only to somebody it was
released for; without a release the address answers with a 403. The kit cannot give it: its key
carries `app:deploy`. An administrator does, in the interface or over a session out of the start
password (`node .ara/tools/device.mjs --name <device> --admin-login`). Which route or which page
that is stands in the artifact's API reference and admin handbook, `node .ara/tools/mirror.mjs
--docs`. `--deploy` names both ways at the end of its output.

## Going live and back

```
node .ara/tools/app.mjs --device <device> --app <id> --status   which version stands where
node .ara/tools/app.mjs --device <device> --app <id> --live     staging becomes live
node .ara/tools/app.mjs --device <device> --app <id> --back     the version before
```

**A human switches live.** Ask beforehand, even if you deployed it yourself a minute ago: from
that moment on people work with it. That is a level 2 intervention, see
`.ara/knowledge/security.md`.

`--back` is a **swap**, not a one-way street: what was live becomes the previous version, a
second `--back` stands at the start again. Exactly in the case where somebody switches back in a
hurry, that is the rescue.

After every switch: one line into the customer's history or into the device's runsheet. Which
app, which version, who wanted it, what was checked afterwards.

## Removing

```
node .ara/tools/app.mjs --device <device> --app <id> --remove --confirm <id>
```

**Level 3, irreversible.** Both containers fall together with their volumes, both slots, all
permissions and the app's keys. Without the id typed out nothing happens, and the tool says
beforehand exactly what falls. Say it to the human in the same words and get an explicit yes
before you type it.

## When the device does not answer

- **Certificate cannot be verified.** A device in a customer network usually carries a self-signed
  one. If you are sure it is this device: `tls: selfsigned` into the file, or a one-off
  `--insecure`. Not unasked and not permanently out of convenience. If the kit installed it
  itself, the entry is already there: then it knows which certificate lies there, it watched it
  come into being.
- **401.** The key was revoked on the device or belongs to another device. Look with
  `node .ara/tools/device.mjs --name <device> --keys`: it lists what lies there and marks the one
  this kit uses. Otherwise create a new one (`--deploy-key`).
- **The endpoint does not stand in the contract.** Then the kit does not call it either. That is
  not a fault of the tool, it is the statement that kit and device do not fit together.
- **The interface sits elsewhere than the SSH access.** A device that is only reachable through a
  tunnel or carries its certificate under a different name gets `api_base` in the file: the
  address at which the interface answers, deliberately. It beats `address`, and `--base <url>`
  beats both, for the one attempt that does not belong in the file. What holds permanently belongs
  in the file, not in the call.
- **No answer at all.** First `node .ara/tools/find-device.mjs --host <address>`, then
  `.ara/knowledge/diagnostics.md`.
