# Procedure: bringing apps onto a device

> **When do you need this?** When an app should land on a device: check that kit and device fit,
> deploy, release, switch live and back, remove, or put it onto a device without Arasul. What the app
> uses there: `.ara/knowledge/platform-services.md`.

## The contract is the source, not this sheet

```
node .ara/tools/app.mjs --device <device> --contract
```

The **only** source for the schema of `app.json`, the rules no schema carries, the header of a flow
file, the header names, the package limits, the paths under `/apps/` and the endpoints with their
scopes. **Copy none of it down**, not even here. Without the kit key no call works: it stands in the
device file under `api_key_ref`, its value in the secret store, see `.ara/knowledge/device.md`,
"The kit key".

The contract carries a **contract version**, and the kit knows the highest it understands:

- **The same or a lower number.** It goes on, against this device's schema, calling only what its
  contract names. An untouched device of half a year is the normal case.
- **A higher number.** The kit stops and names the versions and fields it does not know. The way out
  is `node .ara/tools/update.mjs` or `/init`: **the mistake is not in the app**, and `/device`,
  `/init`, `--check` and `--deploy` say so.
- **None at all.** The device is older than the contract.

Deployment happens only in the first two cases.

## Checking a package before it flies

```
node .ara/tools/app.mjs --device <device> --app <name> --check
```

`app.json` lies at the package's root, next to the folders the manifest names; which fields name a
folder the contract says as placeholders. **Flows are a delivery**: a promised flow folder brings one
file per flow, and the kit checks that a promised folder exists and is not empty. The tool holds the
manifest against **this** device's schema, names every deviation and what it could not check, checks
that the frontend is a **build**, and prints `arasul.json`. Yourself you read, word for word as the
tool prints them, **the rules no schema carries**, "at least one of frontend and backend", "with a
backend a port": the device rejects a manifest that breaks one even when the schema holds. And **what
the contract says about the package**: packing, what stays out, size, flows.

## Deploying, and why it is not yet visible

```
node .ara/tools/app.mjs --device <device> --app <name> --deploy
```

Check, pack the folder's **contents** as the contract prescribes, compare with the size limit, send;
a rejection comes with the device's reason, read it instead of repeating. The device builds the
backend itself, waiting is not a fault. **A deploy always rolls into staging**, without a switch:
live is what the workforce works with.

**Deployed is not visible, and you say so before the deploy.** A person sees the app only once it is
released for them; without that the staging address answers 403, the permission missing and not the
app. Told afterwards, a human takes the kit for broken; told before, they wait. The kit cannot
release, its key carries `app:deploy` and nothing else. `--deploy` names the two ways at its end: a
session out of the start password, if it lies in the store
(`node .ara/tools/device.mjs --name <device> --admin-login`), or a human in the device's interface.
Route and page stand in the admin handbook and API reference, never in the kit:
`node .ara/tools/mirror.mjs --docs --device <device>`. If manual and contract disagree, the contract
holds, it comes from the running backend.

**A release means a slot.** Released for live alone, somebody sees an empty overview although the
release stands, the most confusing state: the release has to mean staging, whatever the admin
handbook calls it.

## Going live and back

```
node .ara/tools/app.mjs --device <device> --app <id> --status   which version stands where
node .ara/tools/app.mjs --device <device> --app <id> --live     staging becomes live
node .ara/tools/app.mjs --device <device> --app <id> --back     the version before
```

**A human switches live**, level 2: ask beforehand, even if you deployed a minute ago, from then on
people work with it. **Staging and live each have their own database**: the version goes along, the
data does not. Live starts empty the first time and keeps its own over every version and `--back`.
Say so before the first switch, and plan what has to be there live from the start, clients for
instance: somebody creates it there, or a migration brings it.
`--status` says it too. `--back` is a **swap**: a second `--back` stands at the start again, the
rescue for whoever switched back in a hurry. After every switch one line into the customer's history
or the device's runsheet: app, version, who wanted it, what was checked afterwards.

## Removing

```
node .ara/tools/app.mjs --device <device> --app <id> --remove --confirm <id>
```

**Level 3, irreversible.** Both containers with their volumes, both slots, all permissions, the
app's keys and its two databases fall; their nightly backups stay, an administrator brings them back
as the contract says under `daten`. Without the id typed out nothing happens, and the tool says
beforehand what falls: say it in the same words and get an explicit yes.

## Onto a device without Arasul

```
node .ara/tools/app.mjs --device <device> --app <name> --compose --port 8080
```

Over SSH, Compose puts up a web server for the frontend and the backend built from the package; the
store is the backend's SQLite, which does not survive the next deploy. **Say beforehand what is
missing**, in the words the tool prints and writes into the generated file's header: no login, no
flow, no permission, one slot instead of two, no key and so no interface from Arasul. Whoever reaches
address and port sees the app: a way to demonstrate, not one for real data. Level 2, with intent,
target and way back, which stands at the end of the output. The marker notes it as `compose`, or the
situation would say the app went nowhere while it answers on the device.

A certificate that cannot be verified, a 401, an endpoint the contract lacks, an interface elsewhere
than SSH, no answer at all: `.ara/knowledge/diagnostics.md`, "When the kit's calls get no answer".
