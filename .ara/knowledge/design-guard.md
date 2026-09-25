# The guard over the design system

> **When do you need this?** When `node .ara/tools/marken.mjs` reports a finding, when `/init`
> brings the kit up to date, or when a copy of the library in an app is to be pulled up. What the
> library is and how an app uses it: `.ara/knowledge/design-system.md`.

## The chain: one source, two mirrors

| Where | What | Whose it is |
| --- | --- | --- |
| `packages/marken` in the product | the source | the product's |
| `.ara/mirror/packages/marken/` | the fetched package, with its stamp | the product's, filed here |
| `.ara/templates/app/frontend/src/marken/` | the scaffold's mirror | the kit's |
| `apps/<app>/frontend/src/marken/` | one app's copy | the user's |

The scaffold's mirror is there so that a fresh clone can build an app that looks like the
device, even on a computer that has never seen an Arasul. If a mirror of the product is
there when an app is created, `--new` takes the library from there instead of from the
scaffold: the device's is the right one.

**The package is what `marken.json` names**, and all of it goes into the mirror but one file.
`browser/marken.js` stays out: it is the bundle for an app **without** a build,
it brings React-DOM along and hangs an app on a node. An app out of the scaffold has a
build and an entry of its own. The stamp of the mirror says so under `nicht_gespiegelt`,
with the reason, because "complete" does not mean "everything", it means "everything whose
absence is stated".

Next to every mirror lies `mirror.json`: version, source, date, the dependencies and a hash
per file. It is the answer to the question nobody else can answer, namely whether a file was
pulled up or edited by hand.

## The guard

A copy ages silently. Whoever changes a part and does not pull up sees the new one in the
device's interface and the old one in every app, and nothing about a running app would go
red.

```
node .ara/tools/marken.mjs                 the picture, and 1 on a finding
node .ara/tools/marken.mjs --sync          pull the apps up to the source
node .ara/tools/marken.mjs --source <folder>   name a source by hand
```

It asks four questions: does every file match its hash, does the mirror stand at the
source's version, is it complete (no class without a rule, no file no path leads to), and
does the app's `package.json` carry every dependency the library needs. The last
one exists because the library is compiled **with** the app: without that question the build
only falls at the import that points into nothing, and the message then names a primitive
instead of the missing package.

**Which source applies**, in this order: the folder behind `--source`, otherwise the package
in the mirror of the product, otherwise the kit's scaffold. `--source` names what
`scripts/deploy/marken-paket.py --ausgabe <folder>` lays down in the product: a folder with
`marken.json` and `src/` in it. The third is the weakest, and it stands there all the same:
for an app the scaffold is exactly the right answer, because it is what `--new` would have
laid down. The scaffold is never its own source, a mirror that measures itself always says
yes.

`--sync` writes only into `apps/`. The scaffold belongs to the kit and is version
controlled; pulling it up is a matter for the kit and not a handgrip in a partner's clone.
It also writes `marken` into the app's `app.json`: since contract 4 the app says in its
manifest which version it stands on, and a number left standing after a pull is exactly the
answer the device uses to spot an ageing copy.

**`/init` asks it.** Whoever brings the kit up to date sees while doing so whether their
apps still stand at the library, and pulls them up in one step. Afterwards the app is built
anew: the copy is source and not a bundle.

## When a finding comes

| What stands there | What it means | What you do |
| --- | --- | --- |
| `... was edited by hand` | Somebody changed something in the mirror | Ask why. Whatever is needed belongs in the product. Then `--sync` |
| `... is gone from the mirror` | A file is missing | `--sync` |
| `the source stands at X, this mirror at Y` | The library has moved on | `--sync`, then build and deploy the app anew |
| `... differs from the source at the same version` | The source moved without raising the version | That is a fault in the product. Say so, and pull up anyway |
| `... has no rule in marken.css` | A block without an appearance | The mirror is incomplete. Fetch it anew |
| `no path leads from index.ts to ...` | A file no app finds, and the build compiles it anyway | The mirror is incomplete. Fetch it anew |
| `the library needs X, the package.json does not know it` | The app cannot be built | Enter the version out of `mirror.json` into `frontend/package.json`, then `npm install` |
| `there is no mirror.json` | The mirror does not say where it comes from | `--sync` creates it |
