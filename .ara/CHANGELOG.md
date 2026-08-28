# What has changed in the Ara-Kit

The version of this kit stands in `.ara/VERSION`. This file says what has been added between two
versions and up to which contract version a version works together with a device. `/init` reads both
out before it deploys, and `node .ara/tools/update.mjs --check` says from which version to which it
would go.

**The line `Contract: up to <number>` is not a statement about a device.** It says which versions
this kit understands. Which version a device carries its contract says, and only that:
`node .ara/tools/app.mjs --device <device> --contract`.

Structure of an entry: `## <number> (<date>)`, below it the contract line and the points as a list.
The tool reads exactly this shape, see `.ara/tools/lib/version.mjs`. The German version of this file
is `.ara/CHANGELOG.de.md` and carries the same numbers and the same points.

## 0.10.0 (2026-08-28)

Contract: up to 3

- English is the kit's main language, German is equivalent and complete. Every document exists as a pair: `x.md` is English, `x.de.md` is German, for the README, the persona, the knowledge, the commands and the scaffolds under `.ara/templates/`. The self-test counts the pairs, so neither language can quietly fall behind.
- `/init` asks the language in the first round with questions, together with the fork between partner and company. The answer stands in `business/profile.md` as `language: de|en`, and out of that field every tool reads which language it prints in. In a fresh clone, before there is a profile, English applies.
- `commands.mjs` copies the command in the language of the profile, `--language` overrides that for `/init`, which creates the commands before the answer stands in the profile. What lands in `.claude/commands/` always keeps the plain name.
- Tool output stands as an `t(en, de)` pair at the place where it comes into being. The German branch carries the wording the kit had before, word for word.
- `--help` carries both languages in one header block, separated by `=== deutsch ===`. That keeps the property the header help exists for: it cannot drift away from the explanation.
- The kit positions itself as a self-hosting tool for any machine reachable over SSH. Arasul is a section of its own in the README instead of a precondition.
- Legal notice under section 5 DDG in the README, linked from the first line. The paperwork under `.ara/vorlagen/` and the evidence under `.ara/nachweise/` stay German: they are legally binding text for the DACH market.
- `.ara/commands/alle/` is now called `all/`, and `/kalkulation` is now called `/calculation`. The retired command stands in `RETIRED` and gets cleared away at the next `--apply`.
- The number range in `business/invoices.md` carries its schema in English (`## Assigned numbers`, columns `Number | Date | ...`). A range that was created earlier keeps its German names, both are read, and the tool writes into the heading that stands in the file.
- The skills under `.claude/skills/` and `.env.example` are English. They are instructions to Ara or to whoever opens the clone, they get loaded under exactly one name, and they stay in one language like `CLAUDE.md`. The skills were also still called `kalkulation`, `diagnose`, `erweiterungen` and `verkauf`; now each is called like its folder.

## 0.9.1 (2026-08-28)

Contract: up to 3

- The administrator's start password comes back out of the kit without becoming visible. `node .ara/tools/device.mjs --name <device> --admin-login` logs in on the device and prints the session, `--token` gives only the credential. Route and user name come from `arasul-release.json` when the artifact names them, otherwise from `--login-path` and `--login-user`, and the tool says every time where it got them from. The route runs along the interface and not over SSH, so it needs neither a login name nor a key and takes the address from `address` or `api_base`.
- `secrets.mjs --show` lists every name the kit assigns, not only the kit keys. The start password used to sit there under `ARASUL_START_<device>`, and this sheet did not name it.
- The installer's output is read along instead of passed through, and masked while doing so: kit keys and start passwords no longer cross the screen in plain text. The sentence "plain text is not displayed" is true again.
- New at the end of `/device`: **what the installer could not do.** Its refusals, a failed SSH hardening or a firewall setup without root rights for instance, stand together afterwards and in the file, instead of drowning in several hundred lines.
- After an installation of its own the file carries `tls: selfsigned`. The device issues its certificate from a device CA of its own, and the first call against the interface otherwise failed at `SELF_SIGNED_CERT_IN_CHAIN`.
- The kit reads the version of the artifact out of `arasul-release.json` when no `VERSION` file comes with it. Mirror, device file and the folder name on the device otherwise said "unknown" although the number lay next to it.
- `/app` knows without `--device` what it sent to a device itself: which version stands in staging and which is live, per app and device. If the built version is live, `--check` and `--deploy` do not get suggested again, but the plan and the README.
- The reference app's plan can no longer be moved: `--plan-aktiv` and `--plan-erledigt` refuse every plan that lies in version control. The mirror keeps its `.gitkeep` when unpacked. Both made the fresh clone dirty.

## 0.9.0 (2026-08-28)

Contract: up to 3

- The installer is called the way the artifact says: the entry point comes from `arasul-release.json`, not out of the kit's memory, and it gets a start password and a network name. Only then do network name, version, start password and the first output come into being on the device. If the artifact names no entry point, the kit stops instead of guessing.
- The kit rolls the start password and puts it into the secret store. The device file carries only the name of the entry, in `start_password_ref`, and the network name in `net_name`.
- The artifact gets pushed to `$HOME/arasul-<version>` and no longer to `$HOME/arasul`. Otherwise the kit found its own package at the next run and took it for an installation.
- The trace search distinguishes three situations instead of two: the platform runs, only remains lie there, or there is nothing. Installing over remains happens only with `--despite-traces`, and that belongs confirmed beforehand.
- Everywhere the kit packs or unpacks, macOS's `._` companion files stay out. 1124 of them went to a device with an artifact, and Traefik fell over one of them.
- `secrets.mjs --set` takes the value from standard input when no terminal is attached. Without that a token stayed "missing" in a non-interactive session.
- Every tool answers `--help` with its header help and does nothing else. Before that `device.mjs --help` ran a device check and `mirror.mjs --help` loaded the mirror.
- New: `node .ara/tools/mirror.mjs --docs` shows which manuals came with the artifact. The knowledge for `/device` and `/maintain` names the way to the first employee and the first permission through it, without a browser too.
- `.env.example` no longer sends anybody to `/start`. That command has not existed since E1.

## 0.8.0 (2026-08-27)

Contract: up to 3

- New command `/invoice`, in the partner branch only and only with `invoice: yes` in the profile: the invoice comes into being out of the offer in the customer file, gets its number from the number range and is printed as a ZUGFeRD PDF. Inside the PDF the invoice sits once more as `factur-x.xml` under EN 16931, so that the customer's accounting reads it in instead of retyping it.
- The mandatory details under section 14(4) UStG are a checklist that goes red before the print. If one is missing, nothing gets printed: an incomplete invoice does not entitle the customer to deduct input tax, and that shows up at their end.
- The number range lies in `business/invoices.md` and belongs to the partner. Sequential per year, without a gap, without winding back. A discarded invoice is cancelled, not deleted, and its number stays assigned.
- One document, one truth: the numbers in the XML come out of the same table that gets printed. The result is checked against the business rules of EN 16931, and the self-test says what stays unchecked.
- The customer file now carries the address in `street`, `postcode` and `city`, plus `country` and `vat_id`. An invoice needs them individually, an offer anyway.
- `pdf.mjs` no longer prints frontmatter. A document carries its machine-readable fields in the header, and those are not a line for the customer.

## 0.7.0 (2026-08-27)

Contract: up to 3

- The knowledge is cut to the platform services: `.ara/knowledge/platform-services.md` describes login, permissions, flows, the AI interface with a key and the route for outside tools, plus the backup and what is missing without Arasul. As a procedure, without a single copied product value.
- New tool `check-docs.mjs`: it reads every route that stands in the kit's knowledge and checks it live on the device with `--device`, with the device's own endpoint list as the yardstick. What no longer exists there shows up before a partner works along it.
- New tool `service-description.mjs`: the service description comes into being with values from the device, software version, contract version, models and apps, every value with its source in the document. What stayed unmeasured stays a placeholder and gets named.
- `/maintain` reads along which models lie on the device, found through the contract and not through a guessed path.
- The version of the kit has a number. `/init` names version, what is new and the compatibility with a device, instead of only showing a list of changed files.

## Before 0.7.0

Earlier versions carried no number. What happened before 0.7.0 stands in the kit's git history, here
the sequence of the finished phases:

| Date | Phase |
|---|---|
| 2026-08-27 | E6: the customer has devices, the offer calculates from the sheet, maintenance measures on the device |
| 2026-08-27 | E5: `/app` builds an app from the scaffold and stops it until a human decides |
| 2026-08-27 | E4: the kit understands contract versions, packs flows along, finds the interface behind a tunnel |
| 2026-08-26 | E3: `/device` creates the file, checks SSH, recognises hardware and delivers a verdict |
| 2026-08-26 | E2: `/init` with the fork between partner and company |
| 2026-08-26 | E1: layout, `/init` instead of `/start` and `/update`, the paperwork under `.ara/` |
