# The design system: the blocks an app is built from

An app runs in a frame in the middle of Arasul's interface. The human in front of it does
not see two programs, they see one screen. Two appearances on it are not a matter of taste,
they are a fault.

So there is exactly one library for both sides. In the product it is called
`packages/marken`, and the kit mirrors it into the app scaffold. Whoever builds an app
builds out of its blocks, and then the app looks like the device without anybody having
copied a colour.

## The chain: one source, two mirrors

| Where | What | Whose it is |
| --- | --- | --- |
| `packages/marken` in the product | the source | the product's |
| `.ara/mirror/packages/marken/src/` | the fetched artifact | the product's, filed here |
| `.ara/templates/app/frontend/src/marken/` | the scaffold's mirror | the kit's |
| `apps/<app>/frontend/src/marken/` | one app's copy | the user's |

The scaffold's mirror is there so that a fresh clone can build an app that looks like the
device, even on a computer that has never seen an Arasul. If a mirror of the product is
there when an app is created, `--new` takes the library from there instead of from the
scaffold: the device's is the right one.

Next to every mirror lies `mirror.json`: version, source, date and a hash per file. It is
the answer to the question nobody else can answer, namely whether a file was pulled up or
edited by hand.

## The six blocks

They carry German names, because that is what they are called in the product. Everything
they draw carries classes with the prefix `ara-`, and the rules for them stand in
`marken.css` beside them.

| Block | What for | What you have to know |
| --- | --- | --- |
| `Kopf` | The head of a page: title, a sentence below, actions on the right | The title is the page's only `h1`. Below 900 pixels the actions slide under the title |
| `Liste` with `ListenEintrag` | A row of entries: a data list, an app's areas, whatever it enumerates | An entry with `onKlick` is a button and thereby takes keyboard and screen reader along. `aktiv` marks the row you are standing on |
| `Karte` | The raised surface for a thing that stands on its own | With `onKlick` it becomes a button, without it a box. A card that looks clickable and is not is a trap |
| `Formular` with `Feld` and `Knopf` | An input | It is a `form`: the enter key in the last field submits. `Feld` demands an id, otherwise label and input do not find each other. `Knopf` knows `still`, `haupt` and `gefahr` |
| `Meldung` | What the device says to the human | The kind (`hinweis`, `erfolg`, `warnung`, `fehler`) settles the colour **and** the role for the screen reader. The kind always stands in the text too: a message you can only tell by its colour is none for some people |
| `Menue` | The surface over the page, below 900 pixels | Escape closes, a click on the veil closes, the focus jumps in and afterwards back, and nobody gets behind it with Tab. Every view that comes closes it |

What there is **not** today: a table, a dialog, a tab bar, a footer, an indicator for
progress. Whoever needs one of those builds it in their app out of what is there, keeps to
the tokens, and says in the plan that it is a thing of their own. The product follows with
more blocks; when one of them arrives, the thing of your own is swapped for it.

## How an app uses them

The import goes through `@marken`, the same alias under which the device's interface knows
the library. The same source runs there and here:

```tsx
import { Karte, Kopf, Liste, ListenEintrag, Meldung } from "@marken";
```

A page is a `Kopf` and blocks below it. What the sequence is stands in the page; what the
appearance is stands in the block. The scaffold shows three cases, and you can work your
way along them:

- **Data list** (`seiten/liste.tsx`): `Liste` with a `ListenEintrag` per row, below it the
  one selected as a `Karte`. Which one is selected stands in the search query (`?nr=17`)
  and not in the page's state: a link to one item stays one, and the app's paths stay one
  level deep.
- **Form page** (`seiten/neu.tsx`): `Formular` with a `Feld` per input and `Knopf` in the
  actions. The one main button carries `art="haupt"`.
- **Sidebar** (`rahmen/seitenleiste.tsx`): `Liste` with the areas, above 900 pixels as a
  column, below it the same content in the `Menue`. The threshold stands in
  `rahmen/fenster.ts` and is the same one as in `marken.css`.

The layout of the page belongs to the app and not to the library: a grid, a column, a gap
stand as a rule of your own at the end of `stil.css`. Colours, fonts and radii do not stand
there, that is what the tokens are for.

## What is forbidden

Four things, and each has the same reason: they run away from the interface the app hangs
in at the device's next version.

1. **No colour of your own.** No `#1a1a1a`, no `rgba(...)` in a rule of this app. Whatever
   needs a colour takes a token: `var(--ara-kante)`, `var(--ara-akzent)`,
   `var(--ara-text-leise)`. A colour you write down is one that is wrong at the next theme.
2. **No block of your own beside an existing one.** No `<div className="karte">` that looks
   like a `Karte`. In four weeks the difference between the two is no longer a decision, it
   is an accident.
3. **Change nothing in the mirror.** The folder `frontend/src/marken/` gets **replaced**,
   not written on. Whoever changes a line in it loses it at the next pull, and until then
   the guard reports it. Whatever you miss in a block belongs in the product and not in the
   copy.
4. **No second threshold.** Below 900 pixels one column, above it the layout. Whoever
   introduces a second number has one more state in which the app stands beside the
   interface.

## The guard

A copy ages silently. Whoever changes a block and does not pull up sees the new one in the
device's interface and the old one in every app, and nothing about a running app would go
red.

```
node .ara/tools/marken.mjs                 the picture, and 1 on a finding
node .ara/tools/marken.mjs --sync          pull the apps up to the source
node .ara/tools/marken.mjs --source <folder>   name a source by hand
```

It asks three questions: does every file match its hash, does the mirror stand at the
source's version, and is it complete (no class without a rule, no block without an export).
Without a mirror of the product there is no source, and then it only asks the questions it
can answer here, and says so.

`--sync` writes only into `apps/`. The scaffold belongs to the kit and is version
controlled; pulling it up is a matter for the kit and not a handgrip in a partner's clone.

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
| `there is no mirror.json` | The mirror does not say where it comes from | `--sync` creates it |
