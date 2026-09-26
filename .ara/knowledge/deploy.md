# Procedure: bringing apps onto a device

> **When do you need this?** When an app should land on a device: check, deploy, release, switch
> live and back, remove, or put it onto a device without Arasul. What the app uses there:
> `.ara/knowledge/platform-services.md`.

## The contract is the source, not this sheet

```
node .ara/tools/app.mjs --device <device> --contract
```

The **only** source for the schema of `app.json`, the rules no schema carries, the header of a flow
file, header names, package limits, the paths under `/apps/` and the endpoints with their scopes.
**Copy none of it down.** Without the kit key no call works: `api_key_ref` in the device file, see
`.ara/knowledge/device.md`, "The kit key".

The kit knows the highest **contract version** it understands:

- **The same or a lower number.** It goes on, calling only what this device's contract names.
- **A higher number.** The kit stops and names what it does not know. The way out is
  `node .ara/tools/update.mjs` or `/init`: **the mistake is not in the app**.
- **None at all.** The device is older than the contract.

Deployment happens only in the first two cases.

## Checking a package before it flies

```
node .ara/tools/app.mjs --device <device> --app <name> --check
```

`app.json` lies at the package's root, next to the folders the manifest names. **Flows are a
delivery**: a promised flow folder exists and brings one file per flow. The tool holds the manifest
against **this** device's schema, names every deviation and what it could not check, checks that
the frontend is a **build**, and prints `arasul.json`. Yourself you read, word for word, **the rules
no schema carries**, "at least one of frontend and backend", "with a backend a port": the device
rejects a manifest that breaks one even when the schema holds. And **what the contract says about
the package**: packing, what stays out, size, flows.

## Deploying, and why it is not yet visible

```
node .ara/tools/app.mjs --device <device> --app <name> --deploy
```

The tool checks, packs the folder's **contents**, compares with the size limit and sends; a
rejection comes with the device's reason, read it instead of repeating. The device builds the
backend itself, waiting is not a fault. **A deploy always rolls into staging.**

**Deployed is not visible, and you say so before the deploy.** A person sees the app only once it is
released for them; without that the staging address answers 403, the permission missing and not the
app. Told afterwards, a human takes the kit for broken; told before, they wait. The kit's key
cannot release, it carries `app:deploy` only; the kit releases with an administrator's session:

```
node .ara/tools/app.mjs --device <device> --app <id> --share <account>     staging, the default
node .ara/tools/app.mjs --device <device> --app <id> --unshare <account>
```

The session comes from the start password, or from an entry already stored: `--password-ref <NAME>
--login-user <name>`. Route and fields it reads from the API reference, the kit knows none. **A
release means a slot**: released for live alone, somebody sees an empty overview; `--stand live`
only when that is meant. Without a session a human releases in the interface, the page stands in
the admin handbook: `node .ara/tools/mirror.mjs --docs --device <device>`.

## Going live and back

```
node .ara/tools/app.mjs --device <device> --app <id> --status   which version stands where
node .ara/tools/app.mjs --device <device> --app <id> --live     staging becomes live
node .ara/tools/app.mjs --device <device> --app <id> --back     the version before
```

**A human switches live**, level 2: ask beforehand, from then on people work with it. **Staging and
live each have their own database**: the version goes along, the data does not. Live starts empty
and keeps its own over every version and `--back`; say so before the first switch, and plan what
has to be there live from the start, clients for instance. `--back` is a **swap**: a second `--back`
stands at the start again. After every switch one line into the customer's history or the device's
runsheet: app, version, who wanted it, what was checked afterwards.

## Removing

```
node .ara/tools/app.mjs --device <device> --app <id> --remove --confirm <id>
```

**Level 3, irreversible.** Both containers with their volumes, both slots, all permissions, the
app's keys and its two databases fall; their nightly backups stay, see `daten` in the contract. The
tool says beforehand what falls: say it in the same words and get an explicit yes.

## Onto a device without Arasul

```
node .ara/tools/app.mjs --device <device> --app <name> --compose --port 8080
```

Over SSH, Compose puts up a web server for the frontend and the backend built from the package; the
store is the backend's SQLite, which does not survive the next deploy. **Say beforehand what is
missing**, in the words the tool prints: no login, no flow, no permission, one slot, no interface
from Arasul. Whoever reaches address and port sees the app: a way to demonstrate, not one for real
data. Level 2, the way back stands at the end of the output.

A certificate that cannot be verified, a 401, an endpoint the contract lacks, no answer at all:
`.ara/knowledge/diagnostics.md`, "When the kit's calls get no answer".
