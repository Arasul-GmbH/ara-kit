# The design system: the blocks an app is built from

An app runs in a frame inside Arasul's interface, and two appearances on one screen are a fault.
So there is one library for both sides, shipped as a **package**: `marken.json` names the version,
the dependencies and every file with its sha256. Every app has a copy under `frontend/src/marken/`,
only as source for types, `npm run dev` and a preview without a device. **At the device the library
comes from the device**: `app.json` says `"marken": "<major>"`, the page loads it from the address
the contract's section `marken` names, the package carries no copy, and a device update needs no
rebuild. Three numbers in `marken` or `npm run build:kopie` bundle the copy instead.
Copies: `.ara/knowledge/design-guard.md`.

## Three sets, two stylesheets, one theme source

| Set | Where | What they are |
| --- | --- | --- |
| Primitives | `marken/primitive/` | Button, Input, Dialog, Table, Tabs, Badge and the like. You put them together |
| Patterns | `marken/muster/` | Datenliste, Formularseite, Seitenleiste, Dateiablage, Dokumentanzeige and more, made **of** primitives for a task every application has |
| Blocks | `marken/*.tsx` | Kopf, Meldung, Karte and the like. Pure CSS (`ara-*`), they run **without** a build |

A whole form is a pattern: rebuilt, it is two hundred lines the next app writes differently.
`marken/theme.css` (both themes, the `@theme` block) is loaded **without a layer**, `marken/marken.css`
**with** `layer(components)`; the scaffold's `kopie.css` does both, keep it that way. The `geraet.css` leaves the library to the
device and reads only your own classes.

**The theme comes from the device**: `rahmen/thema.ts` reads what the shell sets and does not guess,
see the scaffold's README.

## How an app uses them

```tsx
import { Button, Datenliste, Kopf, Meldung, Seitenleiste } from "@marken";
```

`@marken` is the device interface's alias too; where the scaffold uses which pattern, its README
says. A `Datenliste` takes its columns as data (`zelle` shows, `wert` sorts and searches: "3 days
ago" sorts by a timestamp), a `Seitenleiste` lives inside `SidebarProvider` and `SidebarInset`, and
the app names the active entry. The page layout belongs to the library. Rules of your own stand at
the end of `stil.css`, with token names only, no colour, font or radius. At the device the library's
classes come only from its `marken.css`: what you style yourself, write there with tokens.

**An approval is the pattern `Freigabe`, never an imitation**: `seiten/freigaben.tsx`
shows it, `freigaben.ts` brings the entries from the device. Which fields a person may change the flow
declares (`ergebnis.aenderbar`). The original is shown as image or PDF **by the end of its path**.

## What every page keeps

- **Nothing falls out.** A long title ends with "…" (`kuerzen`) and stands whole beside it; at desk
  width no column leaves the table. `Datenliste` measures its own box, not the window: when it gets
  narrow, or its table does not fit, it shows cards. The self-test builds the scaffold and measures it.
- **List and details side by side** from 900 pixels, the details following along, below as a sheet
  from the bottom. Never under the list.
- **Selection is the library's**: `gewaehlt` marks the row, Tab and Enter reach it, arrows via
  `rahmen/pfeile.ts`.
- **Every field has a label** and beside it whether it must be filled. The button stays active, a
  click says at the field what is missing.
- **Waiting names who decides and since when**, from `entscheidet` of the backend.
- **Loading has the shape of the result, an empty list an action.** An error is a sentence, never an
  HTTP line: 404 and 403 a hint with "Zur Übersicht", network and 5xx red with "Erneut versuchen".
- **A card's `hinweis` holds a few words**: status, version, deadline. A sentence goes into the card.
- **The app speaks like the device**: Sie, or without address. `--check` reports du and dir.
- **Status in the text colour**, 4.5:1 in both themes, the colour on a mark beside it.
- **A chart only from `@marken/diagramm`**, best with `lazy`: the barrel carries none.

## What stops the kit, and what else is forbidden

Otherwise a partner's apps look different after three months. The device does not compare and the
product's guard checks only the shell, so the kit stops `--build`, `--check`, `--deploy` and
`--compose` at four findings:

- **A colour value of your own.** Wrong: `color: #e11d48;`, `rgb(225 29 72)`. Right:
  `color: var(--ara-fehler);`, `bg-card`.
- **A Tailwind palette colour.** Wrong: `bg-red-500`, `text-white`. Right: `bg-primary`,
  `text-muted-foreground`, `border-border`.
- **A primitive of your own**: an own `<h1>` for the block `Kopf`, `<table>` for `Table` or
  `Datenliste`, `<dialog>` for `Dialog`, `<fieldset>` for `Feldgruppe`, a tab bar with
  `role="tablist"` for `Tabs`. Just as forbidden: a `<div className="karte">` beside `Karte`, a list
  with a search field beside `Datenliste`.
- **The field `marken` in `app.json` missing or stale.** The major number alone needs no copy to
  match; three numbers must match the copy. `--new` writes it, `marken.mjs --sync` keeps it.
  `--check` against a device stops a major number it does not serve, and only hints at an aged copy.

Measured is the app's own source, not the mirror. **A foreign container is exempt**: without
`frontend`, with a finished `image`, it brings no interface. The self-test holds the scaffold to the
same rule. Beyond that: **change nothing in the mirror**, it gets replaced, and what a part lacks
belongs in the product; and **no threshold of your own**: 900 pixels of the window is the page's
(`useSchmalesFenster`), the box of a data list the library measures itself.

**Check an interface in both themes and three widths**, 390 for the phone, 1280 and 1440 for the
desk. Below 900 the sidebar is a sheet and a data list a card list, and a page scrolling sideways is
broken.
