# The proof of the flow: what a package says about its own build

> **When do you need this?** When an app is built or changed (`/app`), when a package does not go
> out because of its proof, and when you build the check on the device (card J45) against this
> sheet. A person who only builds needs the first two sections.

Since 20.11.2026 the app standard is mandatory: a device takes only an app that stands on the
library's building blocks, carries its picture for the sidebar (`symbol`, since 21.11.2026), brings
tests and was built through the kit's fixed flow. The kit holds
to it already; the device will check it when an app is rolled out. For that every package carries
a file, `nachweis.json`, at its root next to `app.json`.

## What a person does

Nothing extra. The flow writes the proof along the way:

| Step | What happens | The proof gets |
|---|---|---|
| `interview` | The plan is made active: `--plan-aktiv <file>` | The step, with the plan's name and checksum. A new plan starts a new run and drops the earlier steps |
| `bau` | `--build` | The step, the library version, the checksums of source and package |
| `test` | `--build` runs the tests of the app, `--test` alone | The step and the count: files, cases, green or not |
| `ausrollen-test` | `--deploy` into staging | The step, in the app's file at the computer only. A package cannot hold its own roll-out |

**Every later change goes through it again.** Changing a file by hand and deploying does not work:
the checksum of the source no longer matches, the kit says "Build again", and `--build` runs the
tests and writes the proof anew. `--build` does that even with red tests: it writes the proof with
the red result, and the package does not go out until the tests are green.

Ask where an app stands: `node .ara/tools/app.mjs --app <name> --nachweis`. A folder instead of an
app (`--nachweis <folder>`) is judged as the device would judge the unpacked package.

## Where it lies

- **In the package:** `nachweis.json` at the root, the file `--build` writes last. `--deploy`
  then fills `backend/arasul.json` from the device's contract and renews `inhalt.paket` and
  `siegel`, only when the proof held before: the device compares the package as it is sent.
- **At the computer:** the same file in `apps/<name>/`, to which every step adds. It is not source:
  it counts neither in the checksum of the source nor in that of the package, and a change to it
  does not make a build "older than the source".
- **Foreign containers** (no `frontend` in the manifest, a ready `image` instead of an own build)
  bring neither source nor tests. The kit asks no proof of them. Whether the device does is its
  own rule.

## The format, schema 1

```json
{
  "schema": 1,
  "app": "urlaub",
  "version": "0.1.0",
  "kit": { "version": "0.87.0" },
  "bibliothek": { "marken": "5", "kopie": "5.9.3" },
  "symbol": "tree-palm",
  "schritte": [
    { "name": "interview", "zeit": "2026-11-20T10:50:31.683Z", "quelle": "sha256:<hex>", "plan": "2026-11-20-erster-plan.md", "plan_pruefsumme": "sha256:<hex>" },
    { "name": "bau", "zeit": "2026-11-20T10:51:19.008Z", "quelle": "sha256:<hex>" },
    { "name": "test", "zeit": "2026-11-20T10:51:19.274Z", "quelle": "sha256:<hex>", "vorhanden": true, "dateien": 1, "faelle": 6, "gruen": true }
  ],
  "inhalt": { "quelle": "sha256:<hex>", "dateien": 121, "paket": "sha256:<hex>" },
  "tests": { "vorhanden": true, "dateien": 1, "faelle": 6, "lauf": { "zeit": "2026-11-20T10:51:19.274Z", "gruen": true, "quelle": "sha256:<hex>" } },
  "siegel": "sha256:<hex>"
}
```

| Field | Meaning |
|---|---|
| `schema` | Number of the format. This sheet describes 1. Another number: do not guess, refuse and say so |
| `app`, `version` | `id` and `version` of `app.json` at the build. Both must match the manifest in the package |
| `kit.version` | Version of the kit that built it (`.ara/VERSION`). For information; a device may warn when it is older than the one it knows |
| `bibliothek.marken` | The major version of the library, as `app.json` names it in `marken`. Must be the same as in the manifest |
| `bibliothek.kopie` | Full version of the copy under `frontend/src/marken`, or `null` without one. For information |
| `symbol` | The picture of the app in the sidebar, as `app.json` names it in `symbol`: a name from lucide.dev, small letters with hyphens. Must be the same as in the manifest. Since kit 0.87.0; an older proof lacks it and is built again |
| `schritte` | The steps in the order `interview`, `bau`, `test`, each with `zeit` (ISO 8601, UTC) and `quelle`. The times do not fall from step to step |
| `inhalt.quelle` | Checksum of the app's source, see below |
| `inhalt.paket` | Checksum of the package, see below. Only in the package's own file |
| `tests` | `vorhanden` at least one test file, `faelle` the cases counted, `lauf.gruen` the last run, `lauf.quelle` the source it ran against |
| `siegel` | Checksum over the file without this field, see below |

### How the checksums are formed

Every checksum has the shape `sha256:` and 64 hex digits.

- **Of a file list:** for every regular file its path relative to the root, with `/`, a NUL byte, the
  SHA-256 of its bytes as hex, and a line feed. The list sorted by path as strings (code units), the
  lines joined, hashed once more with SHA-256. Names starting with `._` and `.DS_Store` count nowhere.
- **`inhalt.paket`:** every file of the package, except `nachweis.json` at the root and any folder
  called `node_modules`. **The device forms it from the unpacked package** and compares.
- **`inhalt.quelle`:** every file of the app's folder under `apps/<name>/`, except at the top
  level every entry starting with a dot and `plans`, `build`, `README.md`, `node_modules` and
  `nachweis.json`, and at any depth `node_modules` and `dist`. Only the kit can form it, the device
  sees a build and not the source: that is why the proof carries both.
- **`siegel`:** the document without `siegel` as canonical JSON (keys sorted, no blanks, arrays in
  order, scalars as `JSON.stringify` writes them), SHA-256 of its UTF-8 bytes.
- **Tests:** `node --test` in the folder that holds test files (`*.test.mjs`, `.js`, `.cjs`), read
  off its TAP lines `# tests <n>` and `# fail <n>`. A run that counts no case is not green.

## What the check on the device looks at

In this order; the codes are the ones `--nachweis --json` returns, in `funde[].code`.

| Code | The proof is refused when |
|---|---|
| `fehlt` | There is no `nachweis.json`: the app was not built through the flow |
| `unlesbar` | The file is no JSON object |
| `schema` | `schema` is not a number this check knows |
| `siegel` | `siegel` does not match the file: somebody changed it by hand |
| `kennung`, `version` | `app` or `version` is not the manifest's: the proof is from another app or an earlier build, a copied file lands here |
| `paket-fehlt` | `inhalt.paket` is missing |
| `paket-geaendert` | `inhalt.paket` is not the checksum of the package as it arrived: something was changed after the build |
| `schritt-fehlt` | One of `interview`, `bau`, `test` is missing |
| `reihenfolge` | The times of the three steps fall |
| `tests-fehlen` | `tests.vorhanden` is false or no case counted |
| `tests-rot` | `tests.lauf.gruen` is false |
| `tests-veraltet` | `tests.lauf.quelle` is not `inhalt.quelle`: the tests ran against another state |
| `bau-veraltet` | The step `bau` stands on another source than the proof |
| `bibliothek` | `bibliothek.marken` is not the manifest's `marken` |
| `symbol` | The manifest names no `symbol` in the form `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`, or the proof's `symbol` is another. Whether the name stands in the icon set the kit checks before the build; the device checks the form, as it does for the manifest |

At the computer (`--nachweis` without a folder, and before every `--deploy` from `apps/`) two more
cases come from the source: `quelle-geaendert` (`inhalt.quelle` is not the checksum of the folder
today) and `tests-veraltet` against the folder's checksum.

## The cases, in one table

| Situation | What the proof says | What the person does |
|---|---|---|
| App made by hand, folder copied, never built here | `fehlt` | Plan, `--plan-aktiv`, `--build` |
| A file changed after the build | `quelle-geaendert` | `--build` again |
| The package changed after the build | `paket-geaendert` | `--build` again; never edit under `build/` |
| Nachweis copied from another app | `kennung`, `siegel` or `paket-geaendert` | `--build` |
| No tests in the app | `tests-fehlen` | Write a test next to `backend/test/kern.test.mjs` |
| Tests red | `tests-rot`, the package is built and does not go out | Mend, `--build` |
| A demonstration without a plan (`--no-plan`) | `schritt-fehlt` (`interview`) | Make a plan active, build again |
| Only `--test` run after a change | `bau-veraltet` | `--build`, the package carries its result only then |
| No `symbol` in `app.json`, or changed after the build | `symbol`; `--build` does not even start without one | `--app <app> --symbol <name>`, then `--build` |
| A foreign container | Not asked | None |

## What the proof is not

**It is no protection against forgery.** There is no secret in it: whoever knows this sheet can
form the checksums and write a file that passes. It proves that the flow ran, and catches slips: a
file changed afterwards, an app copied, tests forgotten. Whom the device trusts is the named
person in the firm, who answers for what goes live. A version of the check that wants more has to
bring more, a signature of the device, for example. That is a decision of its own and of a later
contract version.

## What the kit does not do here

The kit speaks to the device only through its interface, never through MCP. The proof needs no run
against a device: staging records the fourth step in the app's file, the package does not carry it.
Whoever tests the check on a device takes the staging slot of a trial app.
