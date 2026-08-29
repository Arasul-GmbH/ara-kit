# The design system: the blocks an app is built from

An app runs in a frame in the middle of Arasul's interface. The human in front of it does
not see two programs, they see one screen. Two appearances on it are not a matter of taste,
they are a fault.

So there is exactly one library for both sides. In the product it is called
`packages/marken`, and it leaves there as a **package**: `marken.json` names the version,
the dependencies and every file with its sha256. The kit mirrors that package into the app
scaffold. Whoever builds an app builds out of its parts, and then the app looks like the
device without anybody having copied a colour.

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

**The package is what `marken.json` names.** Seventy-one files, and seventy of them go into
the mirror. `browser/marken.js` stays out: it is the bundle for an app **without** a build,
it brings React-DOM along and hangs an app on a node. An app out of the scaffold has a
build and an entry of its own. The stamp of the mirror says so under `nicht_gespiegelt`,
with the reason, because "complete" does not mean "everything", it means "everything whose
absence is stated".

Next to every mirror lies `mirror.json`: version, source, date, the dependencies and a hash
per file. It is the answer to the question nobody else can answer, namely whether a file was
pulled up or edited by hand.

## Three sets, and each has its height

| Set | Where | How many | What they are |
| --- | --- | --- | --- |
| Primitives | `marken/primitive/` | 46 | Button, Input, Dialog, Table, Calendar, Tabs, Badge. They know nothing but themselves, and you put them together |
| Patterns | `marken/muster/` | 9 | Datenliste, Suchauswahl, Seitenleiste, Formularseite, Dateiablage, Kennzahl, Leerzustand, Ladezustand, Dialogform. They are made **of** primitives and solve a task that comes back in every application |
| Blocks | `marken/*.tsx` | 6 | Kopf, Liste, Karte, Formular, Meldung, Menue. Pure CSS (classes `ara-*`), they run in an app **without** a build |

Whoever has a build takes the primitives and the patterns. The six blocks stay useful for
the head of a page and for a message; whatever is a whole form, however, is a pattern, and
rebuilding it is two hundred lines that the next application writes differently.

**Two stylesheets belong to it**, and they are loaded separately:

- `marken/theme.css` carries the values, both themes, and the `@theme` block out of which
  Tailwind builds `bg-primary`, `text-muted-foreground`, `rounded-md`. It is loaded
  **without a layer**: a `@theme` inside a `layer(...)` import is not one any more.
- `marken/marken.css` carries the rules of the six blocks. It is loaded **with**
  `layer(components)`: unlayered CSS beats every layer, also the utilities, and a Tailwind
  class on a block would otherwise have no effect.

Both stand in this order in the scaffold's `stil.css`, and there is no second file with
values beside them. Up to 0.17.0 the kit wrote one (`design.css`, read out of the shell's
`index.css`); since the library carries its own tokens, that would be a second truth, and
the two disagreed about which theme is the default.

## Two themes, and light sets nothing

The device knows light and dark. Light is `:root` and needs no selector; dark is the class
`dark` plus `data-theme="dark"` at the `<html>`. The shell writes both **into the app's own
document** at every change and at every load, and sends the same value as a message
(`{typ: "arasul:theme", theme}`), which is the only route that names light explicitly.

An app therefore has to do nothing. `rahmen/thema.ts` in the scaffold reads and does not
guess: it listens to the message, watches its own `<html>`, and only writes when there is no
frame at all, because then nobody else does.

## How an app uses them

The import goes through `@marken`, the same alias under which the device's interface knows
the library. The same source runs there and here:

```tsx
import { Button, Datenliste, Kopf, Meldung, Seitenleiste } from "@marken";
```

The scaffold shows three cases, and you can work your way along them:

- **Data list** (`seiten/liste.tsx`): the pattern `Datenliste`. Sorting, searching, an empty
  state, and below 900 pixels a card list instead of a table. The columns are data and not
  markup: `zelle` says what stands there, `wert` says what is sorted and searched by, and
  the two are separate because "3 days ago" sorts by a timestamp.
- **Form page** (`seiten/neu.tsx`): `Formularseite` with a `Feldgruppe` per section. The
  group carries heading, description and the dividing line; `Formularseite` takes the line
  off the last one again. The inputs are the primitives `Label`, `Input`, `Textarea`,
  `Button`.
- **Sidebar** (`rahmen/seitenleiste.tsx`): the pattern `Seitenleiste`, inside a
  `SidebarProvider` with `SidebarInset` and `SidebarTrigger` around it. Entries go in as a
  list; which one is active the app says, because it knows its router and the pattern knows
  none.

The layout of the page belongs to the library, not to the app: `SidebarProvider` holds the
column, `SidebarInset` carries the content. What is left over as a rule of your own stands
at the end of `stil.css`, and no colour, no font and no radius stands there.

## What is forbidden

Four things, and each has the same reason: they run away from the interface the app hangs
in at the device's next version.

1. **No colour of your own.** No `#1a1a1a`, no `rgba(...)` in a rule of this app. Whatever
   needs a colour takes a token: `var(--ara-kante)`, `bg-card`, `text-muted-foreground`.
   A colour you write down is one that is wrong at the next theme.
2. **No part of your own beside an existing one.** No `<div className="karte">` that looks
   like a `Karte`, and no list with a search field beside `Datenliste`. In four weeks the
   difference between the two is no longer a decision, it is an accident.
3. **Change nothing in the mirror.** The folder `frontend/src/marken/` gets **replaced**,
   not written on. Whoever changes a line in it loses it at the next pull, and until then
   the guard reports it. Whatever you miss in a part belongs in the product and not in the
   copy.
4. **No second threshold.** Below 900 pixels one column, above it the layout. The library
   carries the one threshold (`useSchmalesFenster`); whoever introduces a second number has
   one more state in which the app stands beside the interface.

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
does the app's `package.json` carry the fourteen dependencies the library needs. The last
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
