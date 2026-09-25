# Procedure: building an app, from the first question to live

> **When do you need this?** When an app on a device should come out of a wish. This is the core.
> A professional app, with clients, receipts the device reads or an export format of another
> vendor, also reads `.ara/knowledge/app-professional.md`.

## The life cycle

An app runs in a circle, and `/app` stands at every station:

1. **Plan.** There is no file. Interview along the checklist below, then the file from the
   scaffold and a plan under `plans/offen/`.
2. **Build.** A plan is active. First go through its assumptions, then build, then pack.
3. **Test.** The package lands in staging on a device. The person from the business side tries it
   with a real login.
4. **Live.** A human switches over. The plan moves into `erledigt/`, the app's README gets written
   on: what it can do today, what not, what you have to know, in the words of whoever uses it.
5. **Next.** No plan open: show the situation, interview about an extension, new plan.

**Where in the circle you stand, the tool says, not you:** `node .ara/tools/app.mjs --app <name>`
names the next steps with their calls, not everything possible. What it sent to a device it knows
from the marker `.ara/state.json`, the kit's note about its own doing: a version already live gets
plan and README suggested instead of `--check` and `--deploy`. What stands on the device, `--status`
asks there.

## The interview checklist

Ask, bundled, until every point is answered or left open as an **assumption** in the plan. What
the house works with (`business/profile.md`) belongs in the first draft.

| What | Why it decides |
| --- | --- |
| **The work step behind it** | Not the wished-for solution. "A bot for holidays" means: somebody reads mails and enters them into a table |
| **Who uses it** | Who sees it the customer decides on the device. Whether one, ten or a hundred decides the build |
| **Which data** | What goes in, stays, goes out. Name personal data explicitly |
| **The steps** | From the point of view of the human in front of it, one step per line |
| **Where a flow is needed** | Where a language model really does the work. Shifting data is a program, not a flow |
| **Where a human decides** | Every approval, who decides there and who explicitly not, the submitter for instance |
| **Who may see what** | Everything for everybody inside, or only their clients, departments, files. The app decides that |
| **What has to stay** | What survives a new version, a switch and a year, and what of it gets proven. See "Data that stays" |
| **Which professional standards apply** | Export format, chart of accounts, retention, from their primary source: `.ara/knowledge/app-professional.md` |
| **Which shape it takes** | A form is rarely all of it: the seven patterns in `.ara/knowledge/app-patterns.md`, and the plan names the one it uses |
| **What does not belong to it** | The paragraph that saves the disappointment later |
| **How you see that it is finished** | One sentence you can check |
| **What happens when it is wrong once** | Something that gets checked is an afternoon. Something that may never be wrong is a project |

```
node .ara/tools/app.mjs --app <name> --new --titel "<display name>"
node .ara/tools/app.mjs --app <name> --plan "<title>"
node .ara/tools/app.mjs --app <name> --plan-aktiv <file>     open becomes active
node .ara/tools/app.mjs --app <name> --plan-erledigt <file>  active becomes done
```

`--new` creates the file from the scaffold, `--plan` the plan, which you fill in during the
conversation. Plans lie under `apps/<name>/plans/`, and the folder is the state. **At most one is
active**, the tool allows no second. A plan is done when its version stands **live**, not when the
code is finished.

## Building

```
node .ara/tools/app.mjs --app <name> --build
```

The package comes under `build/`, without plans, README and build; a folder with a build of its own
gets built, the rest moves as it is.

- **Locally the build runs, not the app.** What it does you see on the device, with a real login and
  a real model.
- **A build older than the source does not get deployed**, the tool stops: otherwise the version
  from the day before yesterday would go to the device.
- **The type checker runs before the bundler**, `tsc --noEmit && vite build`: a type error stops the
  build instead of arriving as an empty page.
- **Into the package goes the build, not the source.** Every contract says so, and `--check` stops
  at `package.json`, `src/` or `tsconfig.json` in the frontend folder: the browser would get an
  `index.html` pointing at `/src/main.tsx`, an empty page with no hint of why.

## Onto a device

```
node .ara/tools/app.mjs --device <device> --app <name> --check
node .ara/tools/app.mjs --device <device> --app <name> --deploy
node .ara/tools/app.mjs --device <device> --app <name> --live
```

Without a file under `devices/` no contract and no `--check`: `/device` comes first. The way of a
package stands in `.ara/knowledge/deploy.md`, what the device brings in
`.ara/knowledge/platform-services.md`, the look in `.ara/knowledge/design-system.md`.

## Data that stays

**Exactly one place lasts: the database the device gives the app**, its own PostgreSQL per slot,
as the contract says under `daten`. Its address comes in the environment value named under
`umgebung.datenbank`, which the kit writes into `arasul.json`. It survives every deploy, switch and
restart and is backed up every night; an administrator brings one app's data back as
`daten.wiederherstellen` says. Staging and live each have their own, see `.ara/knowledge/deploy.md`.

**What does not stay**, because every deploy replaces the container: its file system, a `VOLUME`
from the Dockerfile included, a SQLite file, an upload folder, a log on disk, a database next to it.
An uploaded file belongs in a column (`BYTEA`). Removing the app throws its databases away, their
backups stay.

**The scaffold does this already**: `backend/ablage/db.mjs` opens the device's database, and an
empty value stops the start instead of writing into a file. Without a device it takes SQLite, and
the route `lage` says `dauerhaft: false`. On the device `--check` says "A database of its own comes
along", and so does the container's log at start.

**The database starts empty**, and the app creates the schema with its migrations, one file per step
under `backend/ablage/migrationen/`, noted in the table `migrationen`. **What has run once never gets
touched again**: that would change the past of databases that already exist.

Measured on 25.09.2026 on the Orin with the scaffold and patterns 2 and 6: three migrations ran in
the device's PostgreSQL, the next deploy kept receipts and log and lost a file in the container, and
live started with its own empty database.

## What the scaffold already is

The clone brings no app; the scaffold lies under `.ara/templates/app/`, and what `--new` makes of
it runs from the first minute: an item lies in the device's database, the backend starts the flow
`freigabe` with its number and submitter, a human decides in Arasul, and the item stands approved or
rejected, with the decider and the flow's sentence. Without Arasul it stays undecided, and the page
says so. Asked what an app looks like, create one and show it.

The stack is the device interface's: **Vite, React, TypeScript, Tailwind, `react-router`, TanStack
Query.** Five places, each exists once:

| Place | What stands there |
| --- | --- |
| `rahmen/basis.ts` | The path the app hangs under, read from the address: `/apps/<id>/`, staging `/apps/<id>/test/`. So **routes stay one level deep**, the rest goes into the query |
| `rahmen/thema.ts` | The theme, read at the app's own document |
| `rahmen/schnittstelle.ts` | The only `fetch`: path, login, envelope of the answer |
| `rahmen/anmeldung.tsx` | Who is there, out of `api/me`, with role |
| `rahmen/async-boundary.tsx` | Loading, went wrong, is there. Every query goes through it |

The backend: `server.mjs` does HTTP, `kern/vorgaenge.mjs` the cases, and the core gets **two
connections** handed in, a store and a device, so it holds no `fetch`, no SQL, no environment, and
every case is checked without either. One store per entity, with the only SQL for it: PostgreSQL
through `pg` on the device, SQLite out of Node without one. One SQL in PostgreSQL's dialect, `$1` as
placeholder, which `ablage/db.mjs` translates for SQLite with the running numbers; so times and JSON
stand as text, bytes as `BYTEA`.

**It describes itself for agents**: the field `agent` in `app.json` lists the routes an agent may
call, and the backend answers the route `agent` out of a copy of `app.json` the build lays beside
it, so there is no second list. `--check` and `--deploy` hold the field against the app. Its form,
and what the CLI of a root does with it: `.ara/knowledge/root.md`, "The bridge to the device".

## What you do not do while doing this

No product value from your head or in the app's source, it comes in `backend/arasul.json`. No
second store. No login of your own, no content in an approval request, no approval the app grants
itself: `.ara/knowledge/platform-services.md` says why. Nothing deployed without `--check`.
