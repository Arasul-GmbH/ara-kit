# The design system: the blocks an app is built from

An app runs in a frame in the middle of Arasul's interface, and the human sees one screen. Two
appearances on it are not a matter of taste, they are a fault. So there is exactly one library for
both sides, `packages/marken` in the product, shipped as a **package**: `marken.json` names the
version, the dependencies and every file with its sha256. The kit mirrors it into the app scaffold,
every app carries a copy under `frontend/src/marken/`, and an app built from its parts looks like the
device without anybody copying a colour. How the copies hang together and who holds them at their
source: `.ara/knowledge/design-guard.md`.

## Three sets, two stylesheets, one theme source

| Set | Where | What they are |
| --- | --- | --- |
| Primitives | `marken/primitive/` | Button, Input, Dialog, Table, Tabs, Badge and the like. You put them together |
| Patterns | `marken/muster/` | Datenliste, Formularseite, Seitenleiste, Dateiablage, Dokumentanzeige and more, made **of** primitives for a task every application has |
| Blocks | `marken/*.tsx` | Kopf, Meldung, Karte and the like. Pure CSS (`ara-*`), they run **without** a build |

With a build you take primitives and patterns, the blocks for a page head and a message. A whole
form is a pattern: rebuilt, it is two hundred lines the next app writes differently. What the
current version carries, `marken.json` says.

`marken/theme.css` carries the values of both themes and the `@theme` block Tailwind builds
`bg-primary` or `rounded-md` from; it is loaded **without a layer**, inside `layer(...)` a `@theme`
is none. `marken/marken.css` carries the blocks' rules, loaded **with** `layer(components)`, or it
would beat every Tailwind class. Both stand in this order in the scaffold's `stil.css`, with no second
file of values: up to 0.17.0 the kit wrote `design.css` out of the shell, a second truth that
disagreed about the default theme.

**The theme comes from the device.** Light is `:root` and sets nothing; dark is the class `dark`
plus `data-theme="dark"` at `<html>`. The shell writes both into the app's own document at every
change and load, and sends `{typ: "arasul:theme", theme}`, the only thing naming light explicitly.
`rahmen/thema.ts` reads and does not guess; only without a frame, directly in a tab, does it follow
the operating system and write the attribute itself.

## How an app uses them

```tsx
import { Button, Datenliste, Kopf, Meldung, Seitenleiste } from "@marken";
```

`@marken` is the device interface's alias too. The scaffold shows `Datenliste` in
`seiten/liste.tsx`, its columns as data (`zelle` shows, `wert` sorts and searches: "3 days ago" sorts
by a timestamp), `Formularseite` with a `Feldgruppe` per section in `seiten/neu.tsx`, and
`Seitenleiste` inside `SidebarProvider` and `SidebarInset` in `rahmen/seitenleiste.tsx`, where the
app names the active entry. The page layout belongs to the library. Rules of your own stand at the
end of `stil.css`, with token names only, no colour, font or radius.

## What every page keeps

- **Nothing falls out.** A long title gets two lines in the list and stands whole beside it; at
  1280 pixels no column leaves the table. The self-test builds the scaffold and measures it.
- **List and details side by side** from 900 pixels, the details following along, below as a sheet
  from the bottom. Never under the list.
- **Every row by keyboard**: the title is a button, the chosen row carries `aria-current`.
- **Every field has a label** and beside it whether it must be filled. The button stays active, a
  click says at the field what is missing.
- **Waiting names who decides and since when**, from `entscheidet` of the backend.
- **Loading has the shape of the result, an error a button to try again, an empty list an action.**
- **Status in the text colour**, 4.5:1 in both themes, the colour on a mark beside it: the library's
  blue and red stay under 4.5:1 as text in light.

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
- **The field `marken` in `app.json` missing or stale.** An app carrying `frontend/src/marken/` names
  the copy's version there, the field without the copy is red too. `--new` writes it,
  `marken.mjs --sync` keeps it.

Measured is the app's own source, not the mirror. **A foreign container is exempt**: without
`frontend`, with a finished `image`, it brings no interface. The self-test holds the scaffold to the
same rule. Beyond that: **change nothing in the mirror**, it gets replaced, and what a part lacks
belongs in the product; and **no second threshold**, 900 pixels is the one (`useSchmalesFenster`).

**Check an interface in both themes and three widths**, 390 for the phone, 1280 and 1440 for the
desk. Below 900 the sidebar is a sheet and a data list a card list, and a page scrolling sideways is
broken.
