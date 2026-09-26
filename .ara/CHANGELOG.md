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

## 0.42.0 (2026-09-26)

Contract: up to 6

- **An item comes into being in work and is submitted when it is complete.** The scaffold's core splits `anlegen` from `einreichen(id)`, and `bereit(vorgang)` says `true` or the sentence what is missing: an item that is not ready stays in work without a run, the sentence at it. The scaffold's form still submits right after creating, its title makes it complete.
- **What is submitted no longer changes.** `darfAendern(vorgang)` holds only in work. Pattern 7 has `PUT vorgaenge/<id>` and `POST vorgaenge/<id>/einreichen`, pattern 2 checks at attaching and removing once it knows the items, pattern 8 at attaching and reading anew: after submitting 409. `mitBeleg` in pattern 8 is the `bereit` for "no submitting without a receipt".
- **Seeing is not deciding.** Pattern 7 marks at each mapping whether the account decides (`006-entscheider.sql`, default no), `regel` and `zustaendig` take only deciders. An app that gets the migration later has no decider until the management marks one, and its items stay in work with the sentence. `app-professional.md` puts the plan questions "when is an item complete" and "who approves" with the example of an office.
- **The flow's sentence after the approval is caught up** until the run is finished. Up to 0.41.0 the app asked once, and when the run was not finished at that moment, the sentence never came.
- **The log of a foreign document is 404**, no longer 200 with an empty list; the log of an own document that went stays.
- **`backend/kern/csv.mjs`** writes a CSV for Excel and the tax adviser: BOM, semicolon, decimal comma, CRLF, and a cell beginning with `=`, `+`, `-`, `@`, tab or CR gets an apostrophe in front.
- **The load set of `/app` stays under 15,000 tokens**: what pattern 7 decides stands in its sheet and no longer in the knowledge as well, measurement history left the knowledge.
- **Measured on the Orin on 26.09.2026** with two accounts, a probe with patterns 2, 6, 7 and 8 in staging: created in work without a run, submitting without a receipt 409, the rule named only the decider, the submitter got 403 at the device and did not see the request, the decider approved, attaching, removing, reading anew, changing and submitting again got 409, the log of a foreign document 404, the flow's sentence arrived 22 seconds after the approval and was caught up.

## 0.41.0 (2026-09-26)

Contract: up to 6

- **The scaffold carries design library 5.0.0**, out of the product's package (`marken-paket.py --ausgabe`, product commit of 26.09.2026). Blue `--primary` is now `#1e6aa4`, red `#c42020` in light, grey `#666666`: coloured text holds 4.5:1 on the light ground. An app out of the kit looks like the device only when its mirror stands at the same version; `marken.mjs --sync` pulls existing apps up.
- **The list uses the library's selection and shortening.** `gewaehlt` of the `Datenliste` marks the chosen row with `aria-selected` and a bar, `kuerzen` at the column keeps a long title on one line with "…" and puts it whole into `title`. The button in the title cell and the own rules in `stil.css` are gone, in the scaffold and in patterns 2 and 6. Tab reaches every row, Enter and space choose, the arrows go on through `rahmen/pfeile.ts`.
- **A chart comes only through `@marken/diagramm`.** `Chart`, `Sparkline` and `SERIENFARBEN` are no longer in the barrel; `tsconfig.json` of the scaffold knows `@marken/*`. `design-system.md` says it in one line, the self-test goes red on a chart imported from `@marken`.
- **The guard knows the second entry.** `marken.mjs` counts `diagramm.ts` as an entry of its own and no longer reports it as a file no path leads to.
- **Measured on 26.09.2026**, the scaffold with patterns 2 and 6 built: entry 414.7 KB raw, 130.2 KB gzip, no Recharts, as with 4.1.0. A page with a lazily loaded chart gets Recharts in a part of its own of 367 KB, the entry stays at 415 KB. Without the `memo` line in `vite.config.ts` the JavaScript stays the same and the CSS grows from 95 to 106 KB, so the line stays. The self-test measures at 1280 pixels: no column outside, one row with `aria-selected`, 200 rows in the tab order, the title whole in `title`, arrow down to the next row, bundle under 500 KB.

## 0.40.0 (2026-09-26)

Contract: up to 6

- **Every model call of the scaffold names its human.** A device from 26.09.2026 logs every model call of an app and names the human only if the app does; how, it says under `protokoll`. The kit writes that into `arasul.json`, and `backend/arasul.mjs` passes the logged-in name in the same bytes to `document/extract-structured` and `llm/chat`, never to another way. `geraet.fragen` asks a model, with images too, `geraet.fuer` gives header and field for an own call to `/v1`. A device without the section gets no header. `--contract` prints the section.
- **Pattern 8, receipts per client at an item**, shows patterns 2, 6 and 7 together: a column `mandant` at documents and readings, a receipt hangs at an item and takes its client, every reading query carries the filter, the log stays separated after the document goes. `BelegeAmVorgang` puts the receipts into the details of an item.
- **Pattern 6 keeps the device's job** (`auftrag`) at every reading, the same number stands in the device's log, and points to `bilder` for a photo.
- **The pages of patterns 2 and 6 split like the list**: side by side from 900 pixels, below as a sheet, every row selectable by keyboard.
- **German content of the scaffold carries real umlauts**, in comments, sentences and JSX text; names in code stay ASCII. The self-test checks the scaffold and the patterns too.
- **`--build` says that the design check ran**, over how many files, also without a finding. English output shows `<device>` instead of `<gerät>`.
- On the Orin on 26.09.2026 a probe out of the scaffold with patterns 2 and 6, in staging: released for one account, a reading as that human stood in the device's log with their name and the same job as at the reading, six of six fields in 11 seconds. Without a name the call stood there without a human; a name the app is not released for was refused with 400 and left no line.

## 0.39.0 (2026-09-26)

Contract: up to 6

- **`--contract` says what reading a document answers.** A device from 26.09.2026 names in its contract under `auslesen` the answer of `document/extract-structured` as a schema; `--contract` prints every field with type and description and the sentences next to it, `--json` the whole schema with request and failure. `data` is an object or null and not checked against the app's schema. A device without the section gets none here.
- **`--contract` says how an image goes to a model.** Under `bilder` stands how an app gives a photo to an image model itself through `llm/chat`; `--contract` prints the sentences word for word.
- **`app-professional.md` points to both sections** instead of saying that no way gives a model an image. With it the measurement of 26.09.2026 on the Orin on a fuel receipt as a photo: one image model six of six fields, text recognition five, another image model two. For photos the app names the model itself and measures both ways.

## 0.38.0 (2026-09-26)

Contract: up to 6

- **The app scaffold keeps its columns.** A title of 120 characters pushed the table of the list to 1309 pixels in a box of 860 at 1280, and the column Stand lay outside. Now the title gets two lines, name and date break, and the page that shows list and details gets more than the reading width. Measured from 900 to 1920 pixels: no table scrolls sideways.
- **List and details stand side by side from 900 pixels**, the details following along; below they open as a sheet from the bottom. Before, they stood under the list, and with 200 rows nobody saw that a click had done anything.
- **Every row is selectable by keyboard**: the title is a button, Tab leads there, Enter chooses, the arrows go one row on. The chosen row is marked with `aria-current` and drawn with a bar in the text colour.
- **A waiting item says who decides and since when.** The backend adds `entscheidet` to every waiting item, out of the same `regel` the run started with: everybody with access, everybody except the submitter, or the accounts of the clients pattern. `wartet` is no longer the palest status.
- **The form has a label at every field** and says beside it whether the field must be filled. The button is no longer grey without a reason: a click on an empty title says at the field what is missing and puts the focus there.
- **Loading, error and empty are states with an action.** The list loads in its own shape, an error carries "Erneut versuchen", an empty list offers the first item or the way back to all.
- **Status text holds 4.5:1 in both themes.** The word stands in the text colour, blue and red sit on a mark beside it. As text the library's blue came to 3.22:1 and its red to 3.48:1 in light.
- **Recharts no longer comes into every app.** `memo` counts as pure for the build, so the charts leave the bundle as long as no page shows one: 408 instead of 690 KB.
- **The self-test builds the scaffold and measures it in Chromium at 1280 pixels**, with 200 rows and a title of 125 characters: no column outside, details in the window, every row a button, status at least 4.5:1, no Recharts in the bundle. `design-system.md` names the rules in seven lines.

## 0.37.0 (2026-09-26)

Contract: up to 6

- **`/app` loads half as much for a professional app.** Command, `CLAUDE.md`, persona and the knowledge a professional app with receipts and clients reads came to some 31,000 tokens, a tenth of it twice. Now it is under 15,000 in both languages, measured like `wc -w` times 1.4, and the self-test holds that line. The command says for every file when its moment comes; `extensions.md`, `security.md` and `live-knowledge.md` are no longer part of it, `CLAUDE.md` carries the rules they would have added.
- **`app.md` is split into a core and a professional part.** `app-professional.md` holds clients, approvals with four eyes, reading documents and professional standards, and is read only for clients, receipts or an export format.
- **Every topic has one home.** Deployed is not visible, the release per slot, the separate databases of staging and live and Compose without Arasul stand in `deploy.md`; login with its headers, the circle of deciders and `arasul.json` in `platform-services.md`; data that stays and the life cycle in `app.md`; reading documents with the measurements of 25.09.2026 and the decisions of the clients pattern in `app-professional.md`; the appearance in `design-system.md`, the history of `design.css` once. The backup moved to `maintenance-flow.md`, the route for outside tools to `extensions.md`, the errors of the interface to `diagnostics.md`.
- **The patterns carry their sheets next to their code.** `.ara/templates/app-patterns/<pattern>/README.md` says what you settle, what the device has to reach and what was checked; `app-patterns.md` is the overview, and you read only the sheet of the pattern the plan takes.
- **`design-system.md` names no counts any more.** Its counts of files, primitives, patterns and dependencies had gone stale, the mirror of 0.36.0 carries 71 files and 15 dependencies; `marken.json` says what the current version carries. The guard and its findings stand in `design-guard.md`.
- **The tool table in `CLAUDE.md` has one line per tool**, the flags stand in the procedures.
- **English references point to English section titles**, and the self-test checks every reference of the form `file.md`, "Title" against the headings in the language of the sheet that refers.

## 0.36.0 (2026-09-26)

Contract: up to 6

- **Clients are a pattern with code, not prose.** Pattern 7 under `.ara/templates/app-patterns/clients/` maps accounts to clients by the name from the login header, puts the filter `nurZugeordnete` into every query of the store, answers a foreign item with 404, opens the management page only to the role the contract names under `freigaben.rollen` and `koepfe.rollen`, and hands the device the rule for an approval: four eyes, the deciders out of the mapping. A decision from somebody no longer responsible does not count when catching up. The self-test runs it with two accounts and two clients against a device whose roles are called differently. `app.md` points to it instead of describing it on some 600 words; an agent that designed it from the description built it differently every time.
- **The scaffold's core carries it**: `regel` may answer asynchronously and with a sentence instead of a rule, then no run starts; `zustaendig` checks a decision when catching up; `einreichen` passes further fields to the store; `holen` reads one item.
- **Model work of an app runs over a flow or over reading a document.** `app.md` says so in one sentence, `platform-services.md` no longer names the chat as a way for an app's backend.

## 0.35.0 (2026-09-26)

Contract: up to 6

- **The kit announces the hardening and lets it be left out.** Before the installer runs, `device.mjs --install arasul` says in one sentence what the hardening does: SSH moves to the port the fetched artifact names in `scripts/security/haerten.sh`, only a key gets in afterwards, a firewall goes up. The next steps say the same before anybody installs. With `--keep-ssh` the installer gets `ENABLE_SSH_HARDENING=false` and `ENABLE_FIREWALL=false`, SSH stays on its port with its login, the key check falls away, and the skipped hardening stands in the history as a decision, not under "What the installer could not do". On the Orin SSH had lain on the new port for seven minutes after a run, without warning; a customer whose other services need port 22, a password login or open ports lost access that way.
- **The default model comes in the background, and the kit says so.** The installer fetches it itself since 25.09.2026 and says so in one line. Up to 0.34.0 the kit said twelve lines below that no model lay on a fresh device and sent the human into the interface for a second download. Now it reads the line and names model and progress, or says that the installer fetched none or said nothing.
- **`mirror.mjs --read` takes paths with a leading `docs/`**, the way the device names its manuals, for example `docs/features/FIRMENORDNER.md`.

## 0.34.0 (2026-09-25)

Contract: up to 6

- **Before the hardening the kit checks that a key gets in.** The installer hardens SSH so that only a key is let in afterwards. Whoever reached the device with a password until now locked themselves out with the installation. Now `device.mjs --install arasul` first tries a connection of its own that allows nothing but the key and does not ride on an open session, and if that fails it stops with one sentence, before anything goes onto the device. When the kit runs on the device itself, the check falls away. The self-test runs it against a device that only takes a password.
- **The README names one free token per account**, no longer five per partner, as decided on 28.08.2026.

## 0.33.0 (2026-09-25)

Contract: up to 6

- **The kit follows a changed SSH port.** Since 25.09.2026 the installer hardens SSH with `sudo -n`, and when that succeeds SSH lies on another port afterwards. The installer says so in the line `ARASUL_SSH_PORT=<port>`. Up to 0.32.0 the kit only put its warning under "What the installer could not do", knocked on the old port for the second check, the kit key and the unlocking, and wrote the old port into the file: the next command stood in front of a wall. Now `device.mjs --install arasul` reads the line, connects over the new port from there on, writes it into the file as `ssh_port` and names old and new port in the history. The self-test runs exactly this line through the installer's output and a device file.

## 0.32.0 (2026-09-25)

Contract: up to 6

- **The scaffold puts its data into the device's database.** Since contract 5 the device gives every app with a backend its own PostgreSQL per slot, and since 25.09.2026 the contract says under `daten` that it is the only place that survives a deploy. Up to 0.31.0 the scaffold wrote into a SQLite file in the container that the next deploy deleted, and the knowledge advised against inventing another store. Now `backend/ablage/db.mjs` reads the name from `arasul.json` and opens the device's database through `pg`; without a device it takes SQLite, with the same SQL, and the backend route `lage` says whether what it stores stays. The documents pattern puts the bytes into the same database. Measured on 25.09.2026 on the Orin: after deploying the next version receipts and log were still there, a file in the container was gone, the live slot started with a database of its own, empty.
- **`arasul.json` carries what a professional app lacked**: the names of the headers for user and role, the way to read a document, whether a run takes submitter and rule, and what the contract says under `daten`. No header name and no document route stands in the source of the scaffold or a pattern any more; the self-test holds both to that.
- **Approvals with four eyes and named deciders.** The scaffold sends the submitter along as soon as the device takes it, and its core can set a rule (`ohne_einreicher`, `entscheider`), but only on a device whose contract names `freigaben`; an older device does not get the fields. Only references go into the approval request now, the item's number and the submitter, no title and no text.
- **New pattern 6, reading a document**, under `.ara/templates/app-patterns/extract/`: a receipt goes to the device, fields come back, the app checks them against the schema and rules of its own, every reading is a row in a log that only grows. Measured on 25.09.2026 on the Orin: an invented receipt as a PDF six of six fields in 35 seconds, an invented fuel receipt as a photo through the device's text recognition six of six fields in 13 seconds.
- **The knowledge guides through a professional app.** `app.md` has a section on data that stays, on visibility inside an app (a mapping of accounts to clients by the header name is allowed and no second login), on approvals in a professional app, on photos, scanned PDFs, image models and the field `modelle`, and on professional standards like DATEV EXTF, SKR03 and GoBD, which come from their primary source with a date of retrieval. Service description and end customer terms now say: one account per person, release per app, a separation by clients only where the app's description names it.
- **The manuals on the device, without a token.** `node .ara/tools/mirror.mjs --docs --device <device>` lists them from the folder the running platform was started from, `--read <path>` prints one of them. The note after `--deploy` and the knowledge point there instead of at a mirror that does not exist.
- **Smaller findings from the foreign test on 25.09.2026:** `--status` prints the slots readably instead of raw JSON; after the second deploy `--deploy` says that releases stay instead of "Nobody sees it yet" again; `--build` asks for an active plan (`--no-plan` for building without one on purpose); the company branch marks the removed files with `skip-worktree`, and the clone stays clean; the self-test can be narrowed to single checks with `ARA_SELFTEST_ONLY`, and the README says how long the whole run takes.
- `drittlizenzen.md` carries the version of ollama with its date and source.

## 0.31.0 (2026-09-25)

Contract: up to 6

- **No key on the screen during an installation, also not a bold one.** The installer prints the kit key with a bold escape code directly in front of it, and the mask did not catch it: the key stood in plain text two lines below the sentence that its plain text is not displayed. Colour and cursor codes now come out before masking, also when a code arrives cut in two pieces of the stream. Measured on 2026-09-25 on the Orin with the product's own first output script and a stamped fake key: 0.30.0 showed it, 0.31.0 shows `aras_…`.
- **After an installation exactly one kit key is valid.** The installer creates its own key, and the kit used to create a second one next to it and leave the first valid and unused. Now the kit remembers the installer's key without showing it, creates its own under the partner's name, revokes the installer's by its prefix and counts on the device afterwards. If it cannot create its own, it takes over the installer's. Measured on 2026-09-25 on the Orin with two stamped keys: the installer's revoked, the kit's valid, both revoked again afterwards.
- **The GitHub Actions runner is no trace of Arasul any more.** Its service carries the repository's name, and an installation needed `--despite-traces` because of it.
- **The report names the mirror fetched in the same run** and reads the verification level from it, instead of saying there is no mirror.
- **The knowledge says how the default model gets onto the device and how long that takes**: in the interface, on the models page, the default of the short list; not with a pull on the container's command line. Measured on the Orin on 2026-09-25: about 40 minutes for 14.25 GB at about 6 MB/s, the first answer after 12 seconds. `/device` names the step after an installation.

## 0.30.0 (2026-09-25)

Contract: up to 6

- **The kit unlocks the device.** A bought token is at the same time the licence code. After `--install arasul` the tool fetches the fingerprint from the device with `lizenz-geraet.sh fingerabdruck`, exchanges token and fingerprint at `POST https://www.arasul.de/api/license/issue` for a licence bound to this device, plays it in with `lizenz-geraet.sh einspielen` over standard input and reads level and limits back with `status`. The level lands in the file under `license`, the step in its log. Neither token nor licence appear on the screen, in the file, in the JSON or as an argument on the device.
- **A free token ends on community without an error**, with one sentence on what community means and the limits the device reports, and the way to a bought code. The portal's refusals (`token_unbekannt`, `anderes_geraet`, `zu_viele_anfragen`, `dienst_aus`) come back with the way out the website's contract names.
- **`--license --name <device>` unlocks a device that already runs**, with the stored token or with a code over the pipe (`--pipe`), which is not stored. Without `--name`, `--licence` stays the buying way. `/device` names the step when Arasul runs and the file carries no level or community.
- **No price in the kit any more.** What further devices and commercial use cost stands on the page at arasul.de, not in the tool, the knowledge or the commands. The knowledge says what community allows (3 accounts, 3 apps) and that the bought licence has no limits.

## 0.29.0 (2026-09-22)

Contract: up to 6

- **The bridge knows the root of the device.** Since 2026-09-22 a device carries one root of its own, level 0 with the kind `wurzel`, and names it first in its list of folders for every active person, with an empty path and the right that follows from the role: everybody reads, administrators write, no right per person. `sync` and `status` recognise it by level and kind and by nothing else, take its id out of the answer, `firma` on the device measured, and lay that room at the top of the tree, the rooms of level 1 and 2 below it at their real place. The bridge of 0.28.0 named that root a shape it did not know and synced nothing. A folder of level 1 with the id `wurzel`, which 0.28.0 made as the root, is a folder of level 1 today and lands under its name. Level 0 with another kind is named and not laid down.
- **`deploy` takes the root the device names and makes one only when the device carries none**: id `firma`, the name of the house, kind `wurzel`, level 0, the shape the device's front end proposes as well, with a session borrowed for exactly those requests. No right per person is given on it. When the device carries a root and does not list it for this person, that is said and nothing is made: 0.28.0 made a second room `wurzel` next to the device's root, this version never does. A device that does not take the kind `wurzel` is named as one from before 2026-09-22, and nothing is deployed in its place.
- **`Fatal: Authentication` from the client gets one sentence more**, in `deploy` and in `sync`: the file service has no password for this person, because the device mirrors a password into the service when it is set, so an account whose password was set before the company folder was switched on gets in only after a password change. Measured on 2026-09-22 with a password the service did not know.
- Measured on 2026-09-22 at a device that carries its root `firma`, from a test root with two throwaway accounts: `--deploy` as an administrator took that root, made nothing, all 16 files lay in the room afterwards and the device still carried exactly one root; an employee with `lesen` on the root by role and `schreiben` on one folder of level 2 got, out of an empty folder, the root at the top, the folder at its place, the chain above it made locally and `sicht.md` from the device; Claude Code started two levels below loaded the root's `.claude/CLAUDE.md` and its skills, and the skill `arasul` ran `arasul.mjs apps` against the device.

## 0.28.0 (2026-09-22)

Contract: up to 6

- **The root goes onto the device and lives there.** `node .ara/tools/root.mjs --path <root> --deploy` hands over to the bridge of the root, `arasul.mjs deploy`: the check script of the root runs first and a finding stops everything, the room of the root is found in what the device shares with this person, and when it is missing it is made as an administrator, as a shared folder of level 1 with the id `wurzel` until the device knows the kind, with a session borrowed for exactly those requests and ended afterwards, and the right `schreiben` on it goes to the person who made it. Then the tree goes into the room through the command line client of the file service, and the room comes down again into a throwaway folder as the proof: `deploy` says how many files went, how many lie in the room and which did not arrive. `settings.json`, hooks, `.git`, `node_modules`, `.DS_Store`, the journal of the client, `apps/`, `sicht.md` and the rooms the device shares separately never go along. A root laid out with an older kit gets the kit's bridge first, because the old one knows no `deploy`.
- **`sync` lays the room of the root at the top of the tree**, not into a folder below it, and the rooms of level 1 and 2 below it at their real place, as before. A room of level 1 is recognised as the root by the kind `wurzel` where the device names one, else by the id `wurzel`. The root's own sync leaves the names of the other rooms, `apps` and `sicht.md` out at every depth, because the client anchors no pattern at the top of a tree: measured, a name with a leading slash in the list kept nothing out, and read in the client's source. An empty folder with `arasul.mjs` alone becomes the root with `login` and `sync`: the bootstrapping file steps aside before the client runs, because the room carries the house's one and the client cannot merge two versions, it kept both and named the second a conflicted copy. `sync` and `status` count that spelling of a conflict now as well.
- **`sync` writes `sicht.md`**, the view of this person, at the top of the root: the file service, every folder with level, right and last sync, what passes the sync by as the device says it, and the assigned apps with their routes. The device delivers it itself as soon as it answers on the route `sicht` below the company folder's route; until then the tool writes the sheet out of what the device says about folders and apps, and says so. Per person, never synced, left out by the root's `.gitignore`.
- Measured on 2026-09-22 at a device, from a test root with two throwaway accounts: after `--deploy` the scaffold lay in the room `wurzel`, all 16 files and nothing of this computer, checked by a download without any list; a second account with `lesen` on the room and `schreiben` on one folder of level 2 got, out of an empty folder, the root at the top, the folder at its place and the chain above it made locally; Claude Code started two levels below loaded the root's `.claude/CLAUDE.md` and its skills, and a call of the skill `arasul` ran `arasul.mjs apps` against the device.

## 0.27.0 (2026-09-22)

Contract: up to 6

- The root's CLI syncs the company folder. `node arasul.mjs sync` asks the device with the credential `GET /api/firmenordner`, gets the address of the file service, the person's name there and, per folder, id, level, parent, path and right, and lays every shared folder at its real place in the tree: a folder of level 1 as a room named by its id, one of level 2 through the room `Shares` with `--remote-folder`, and the chain above it locally, even where the person has no right on the parent. The syncing is done by the command line client of the file service out of the vendor's desktop package, which runs unpacked; `--client` names where it lies. What a machine makes, what belongs to this computer (`.claude/hooks/`, `settings.json`) and what the client writes itself stays out, its own journal included, without which it reports conflicts about itself. `503` from the device means there is no file service on it and is never taken for an empty list of folders. Conflicts and symbolic links are counted out of the tree and named, and both make `sync` and `status` red.
- `node arasul.mjs status` says per folder when it was last synced, whether it worked out and how many conflicts and unsynced symbolic links lie in it, on top of the device, the credential and the proposals. The state lies next to the credential in `firmenordner.json`, keyed by root, and holds no secret.
- The login with a password keeps no session any more. It uses the session for exactly one request, `POST /api/ausweise`, and stores only the credential the device issues there: a session has an end and carries everything the human may do, a credential says who somebody is and opens no administration. `--credential-name` says what the device files it under, by default the name of this computer; a name that is taken is said, and nothing is stored. The password goes to the file service's client in its environment variable and never as an argument, and it is stored nowhere.

## 0.26.0 (2026-09-22)

Contract: up to 6

- The kit understands contract version 6. An app names the routes it offers an agent in the manifest (`agent`): the kit reads the field, passes it to the device unchanged and holds every route it names against the source of the backend. Until now a device with version 6 got the sentence about what the kit is missing, and nothing could be deployed onto it, no matter what the app looked like.
- **The source of the form is the schema of the device.** What the device has already refused in its own words, `--check` does not say a second time in the words of the kit. What stays is what no schema carries and what decides the call: `writes` on a method that changes something, the same route twice. That reading is the one the CLI of the root uses, and a route it does not accept the CLI does not call.
- The search for a route in the backend also finds a path that stands in a regular expression (`/^\/journal$/`), not only one in quotes. A backend with a table of patterns used to get the finding that its route does not exist.
- Measured against a device carrying contract version 6: reading the contract ends with return code 0, the check of an app with the field ends without a finding, and one without the field ends as it did before.

## 0.25.0 (2026-09-21)

Contract: up to 5

- The root carries a bridge to the apps of a device: `arasul.mjs` next to `.claude/`, one file that runs with Node alone. `login` holds a credential in `~/.config/arasul/credentials.json` (0600, one entry per device with address and token; until the device issues tokens with name and password, the session is kept and neither the password nor anything of it is stored, and it is never shown), shows the proposals for hooks and rules of the root and of every folder of level 2, approves them one by one with their checksum, and says where each place lies on this computer. `apps` lists the assigned apps with their routes and writes `apps/<id>/APP.md`, `call <app> <route>` calls only routes that the app names in its field `agent`, and one that changes something needs `--write`. `sync` and `status` say that the service for company knowledge is not decided yet. A device with a certificate of its own is pinned once with `--insecure`, the check is never switched off. The skill `arasul` in the root tells the agent how to use it. No MCP server, no file access for apps: the way back goes through the agent.
- The proposal of the root allows `apps` and the reading form of `call` without asking and holds `call ... --write` back under the new side `ask`. Measured with `claude -p` 2.1.278: the reading calls ran, the writing one was held back.
- **Fixed:** a rule for a shell command in the proposal carried `//` before the path, the notation for reading rules, and never matched a command. The rule for the check script of the root did not work in 0.24.0. It stands with the path as it is typed now. A root enrolled with 0.24.0 shows the proposal as changed and wants the approval anew.
- The app scaffold carries the field `agent` in `app.json` and answers the route `agent` with it, id, name and version. The build puts a copy of `app.json` next to the backend. `app.mjs --check` and `--deploy` hold the field against the app: its form, and that every route it names is in the backend. **A device whose schema for `app.json` does not know the field refuses the package**, and `--check` says so.
- The check script of the root knows the folder `apps/` and does not read `arasul.mjs` for fields with values. A house cannot name a folder of level 1 `apps`.
- `root.mjs --enroll` and `arasul.mjs login` write the same files and take each other's approval back, the self-test holds them together.

## 0.24.0 (2026-09-21)

Contract: up to 5

- `/root` lays out a scaffold, not a way of working. Without a switch the root holds `.claude/CLAUDE.md` with the rules, `.claude/skills/` (place, where-things-go) and `.claude/agents/` (place-reader, root-checker), the list of places, the check script and the folders of level 1 that the house names with `--folders` or in the interview. The kit brings none of its own. Everything of 0.23.0 that steers work, `company/`, `roadmap/` with the card stack, `experiments/`, `customers/`, `templates/`, `archive/`, the card tool and its skill, is an addition now: `--method` lays it out with the scaffold or into an existing root, appends its rules and overwrites nothing. Its checks run unchanged. The scaffold lies under `.ara/templates/root/`, the addition under `.ara/templates/root-method/`.
- Nothing in the laid out tree runs by itself. There is no `settings.json` and no active hook. The boundary hook and the permission rules lie in `.claude/proposal/` as a proposal. `--enroll` shows what would go into the user's own settings and a checksum over the proposal and the hook, `--enroll --consent <checksum>` writes it, `--unenroll` takes back exactly that. The hook that runs is a copy next to the settings, so a change in the tree takes effect only after new consent, and `--show` says that the proposal has changed. The hook acts only in a session that started in the root or below it, not in a place and not elsewhere, because enrolled it hangs in front of every session on the computer. Logging in to a device, comparing and querying apps are not part of it, that stays with the CLI of the root.
- The check script has 17 checks. New: no `settings.json` in the tree (14), confidential things by pattern in the root and in level 1 (15), references only upward, no sibling and no contents of a folder named in a rule of the root (16), no `.git` that the list does not name and no source tree in the tree (17). Single scripts are allowed everywhere and are no finding. A folder that carries the name of a place without a local path counts as its copy (11).
- An unknown switch of `root.mjs` is reported and stops the tool, and so are a loose argument and an unknown `--language`. `--lang` used to be skipped, and the root came out in the language of the profile.
- The showcase follows the scaffold: two folders of level 1 and nothing that runs by itself, and it comes with the method.
- Measured in a real session, `claude -p` 2.1.278 with a settings file through `--settings`: a session one level below the root loads the rules, skills and agents of the root, with and without `.git`. The tilde in `additionalDirectories` is resolved. With consent the hook stops a write into a closed place by tool and by shell, from the level below and from the root, and leaves a session in the place alone. Without consent it does not act. Not measured: the same through `~/.claude/settings.json` itself and in an interactive session.

## 0.23.0 (2026-09-21)

Contract: up to 5

- The kit lays out the root folder of a whole house. `/root` and `node .ara/tools/root.mjs --path <folder> --name "<house>"` create, outside of the kit, a tree with rules and a truth table, `company/`, a roadmap with one sheet per place and a card stack, `experiments/`, `customers/`, `templates/`, `archive/`, a check script with 13 checks, a boundary hook with its cases, a card tool and rights per folder in `settings.json` after the kit's own pattern. The scaffold lies under `.ara/templates/root/` in both languages. After laying out the root needs the kit no more, its scripts run with Node alone.
- Embedded places are a reference, never a copy. A place is a GitHub repository or a foreign folder such as SharePoint, it stands in a list with where it lives and at most where it lies on this computer. The hook keeps a session in the root from writing into a place, through the tools and through the shell, also through a link, because such a session does not load the rules of the place. `write: yes` opens a place by decision of the house. `--place` adds one to an existing root and leaves rights entered by hand alone.
- An invented company comes along as a showcase: `--example` lays it out with filled sheets, cards in every column, an experiment, a customer and four places. Its dates count from the day of laying out, so its own check script finds nothing in it, today and in a year.
- The scaffold carries its rules as `rules.md` and not under the name the agent loads: a rules file in a subfolder is read along as soon as a file next to it is read, and whoever worked on the scaffold worked by the rules of a foreign root.
- The self-test lays out a root in both languages and runs its check script, builds twelve mistakes into the showcase and expects each from its own check, runs the cases of the boundary, moves cards by their rules, and looks for anything of Arasul's own in what was laid out.

## 0.22.0 (2026-09-15)

Contract: up to 5

- The knowledge shows what an app is beyond a form. `.ara/knowledge/app-patterns.md` carries five patterns with code that runs: several routes with a sidebar (the scaffold itself), a document uploaded and shown in the library's viewer, a mail out of the app's backend over SMTP with the values from the manifest, a foreign API called from the backend, and a foreign container as an app behind the device's login. A partner who found only the item with its approval step took Arasul for a form tool. The code lies under `.ara/templates/app-patterns/`, split the way the scaffold is, and each file says in its head where it goes.
- `/app` knows the patterns in the idea phase: the command loads the sheet as soon as an idea is being formed, the interview checklist asks which shape the app takes, and `--new` names the sheet.
- The scaffold's mirror of the design system stands on 4.1.0: the pattern `Dokumentanzeige` for PDF and images, and `Dateiablage` with a preview. The scaffold's build lays the support files of the PDF library next to its chunks (`pdf-dateien/`), and `pdfjs-dist` stands in its `package.json`. Since 4.0.0 the library knows only blue, grey and red, so the scaffold's `stil.css` colours a state with the accent and the quiet text instead of the tokens that fell away.
- Mail and a foreign API are the app's own doing, not a service of the platform; the sheet says so and says where a password and a key do not go: not into the manifest. A foreign container goes in with a build plan of one line, because the device builds and takes no finished image, as its contract rules say.
- The self-test runs the patterns: the documents in the scaffold's backend, the mail through a local relay, the foreign API against a local stub, the manifest of the foreign container through the manifest check, and every path the sheet names against the files.

## 0.21.0 (2026-08-30)

Contract: up to 5

- A company gets no partner goods at `/init`. `BRANCHES` in `commands.mjs` cut only the commands by branch; the skills `customers`, `sales` and `pricing`, the templates for offer, invoice and end customer terms and the knowledge on crm, sales, pricing and invoicing came with the clone regardless of the branch, and `update.mjs` deployed them to everybody again. A company that saw that after `/init` took the kit for a dealer's tool. Now `commands.mjs --apply --role company` clears them away, together with an empty folder `customers/`, and says what went and how it comes back: `role` in the profile, then `update.mjs`.
- The list is one, `PARTNER_ONLY` in `lib/commands.mjs`. `update.mjs` reads it and leaves the partner goods out for a company, on both sides of the comparison: neither "new" nor deployed. The partner branch is unchanged.
- The self-test keeps its customers in a throwaway folder under `os.tmpdir()`, not under `customers/` in the kit. Until now it created `customers/_selftest` at the root and cleared only the subfolder, and every run left an empty `customers/` behind, also in a company's clone. Every tool reads `ARA_CUSTOMERS` for that, see `lib/kit.mjs`. Without the variable `customers/` in the kit applies, as before.
- The self-test checks the cut in a throwaway copy for both branches, holds the update against a company that ran `/init`, and skips the checks that need partner goods in a clone that has none, named as such instead of red.

## 0.20.2 (2026-08-30)

Contract: up to 5

- `node .ara/tools/update.mjs --check` names the compatibility of the fetched version, not that of the running one. The number comes out of the contract line of the fetched change list, in the entry to its number. Until now `standBlock()` asked the code of the process that was running, and that is the old kit: on 30.08.2026 a clone on 0.15.0 read "up to 3" under "New since 0.15.0" while the version it would have got understood up to 5. That is the wrong way round for the one decision the line exists for. Whoever reads that the number does not move does not deploy, because they believe it brings nothing.
- Does a fetched version not name a contract line, the tool says so instead of filling the gap with its own number. A gap is to be named, not to be guessed at.
- `--json` carries the same statement machine-readable: `contract.hier` out of the code of this run, `contract.dort` out of the change list of the fetched folder.
- The compatibility of a foreign version comes out of its change list and not out of its code. The code lies in a folder that has not been deployed, and running it of all things while only looking would be the opposite of looking. Its own self-test held that line against its code before it was shipped.
- The self-test holds the two apart. The version in the test archive carries a contract line above the limit of the running kit, and `--check` has to read that one out; up to now both numbers were the same in the test, and the swap could not be seen.

## 0.20.1 (2026-08-30)

Contract: up to 5

- The kit's browser gets past the self-issued certificate of a device. `.mcp.json` starts it with `--ignore-https-errors`, so `browser_navigate` reaches the interface of a device with `tls: selfsigned` at the first call. Up to now it broke off with `ERR_CERT_AUTHORITY_INVALID`, before a page was even there, and a partner never saw their app in the frame.
- The sheet on the browser no longer sends anybody to a warning page that does not appear. Since 0.19.0 it said to click through it, in Chromium "Advanced" and then the link below; through the kit's browser there is nothing to click, the call breaks off in front of the page. In its place stands the switch, where it is entered, and the sentence that a context of your own over `browser_run_code_unsafe` carries you one page far and no further.
- Both sheets say why a device that opens without the switch proves nothing: the browser keeps a decision per profile, and that profile lies on one computer. Measured on 30.08.2026 against the Orin, twice with the same server and the same arguments, once with a profile of its own: without the switch `ERR_CERT_AUTHORITY_INVALID`, with it the login page.
- The self-test holds both together. `.mcp.json` has to carry the switch, and both sheets have to name it together with the file it stands in.

## 0.20.0 (2026-08-30)

Contract: up to 5

- A clone that is behind its device finds out at the first contact and not at a deploy. `/device` reads the device's contract after the check, says whether this kit understands the version it carries, and names the one way out: `node .ara/tools/update.mjs`. On 30.08.2026 a workshop stood on contract version 3 and the Orin carried 5; `--check` accepted the manifest and returned 1 anyway, `--deploy` broke off with "Nothing deployed", and the search went into the app. That was already the reason a stranger got stuck on 29.08.
- The number the device carries goes into its file as `contract`, read on the device and not claimed. `/init` finds it there without a device: `node .ara/tools/init.mjs --show` names every device that is ahead of this kit, with the device and the way, before anything else gets started. What could not be read stays unmeasured and gets named as such, because a platform that is just coming up says nothing about its version.
- `--check` no longer ends with return code 1 without a sentence. The reason stands at the end of the report, where somebody stops reading, with both numbers and the way. Its first line says that the manifest has nothing to do with it: the report above it can say in the same breath that the device's schema accepts the manifest, and out of those two an app looks like the culprit.
- `--deploy` says "Nothing deployed" first and the reason right after it, in one line. Up to 0.19.1 the reason stood in front of the refusal, and the last line a person reads is the one they act on.
- The way is a call and no longer only a command in the chat. Every place names `node .ara/tools/update.mjs` and says that `/init` goes the same way: `/init` leads past it, but somebody whose deploy has just broken off reads one line and not a procedure.

## 0.19.1 (2026-08-30)

Contract: up to 5

- The mirror of the design system stands at version 3.1.1. In three files the library wrote a width out of a variable in Tailwind 3's short form (`sidebar`, `calendar`, `Suchauswahl`); Tailwind 4 no longer wraps those in a `var()`, it writes `width: --name`, and the browser drops the rule. In the Orin's frame you saw it as a sidebar lying over the content, because the placeholder that keeps its column open was zero wide. The library changed the spelling in 3.1.1, the kit follows.
- The emergency lines in the scaffold's `stil.css` are gone. They had stood there since 29.08.2026 with a date and the sentence that they disappear again as soon as the library changes the spelling, and they set the sidebar's four widths a second time by hand. That case has now happened. An app out of the scaffold therefore carries no rule any more that catches a cause which no longer exists.
- Measured on the Orin, in the frame at 1440 pixels, in light and in dark: the app's frame 1042 pixels wide, the sidebar's placeholder 256 pixels, the content starts at 256. Without the emergency lines.

## 0.19.0 (2026-08-29)

Contract: up to 5

- After a deploy the kit says who is allowed to see the staging slot. A stranger reached staging in three and a half minutes on 29.08.2026 and got a 403 there, because the app was released for nobody, and the kit said nothing about it. It now names the release at the end of the deploy, plus the two ways to an administrator: a session out of the start password if one lies in the store, otherwise a human in the device's interface. Which route or which page that is stands in the artifact and not in the kit: its key carries `app:deploy`, and the contract of the device names no way for a release.
- `--admin-login` leads to a way instead of to an end. On a device that somebody else installed there is no start password, and the kit cannot fetch one. Until 0.18.0 the tool said so and stopped, with a sentence that only held for its own installations ("it stands in the first output on the device"). It now names three ways, and none of them needs the kit: somebody hands the password over once, or it was changed and the one that holds today goes in, or the administrator does in the interface what the session would have done. Employees, permissions and their own password live there anyway.
- The kit can revoke its own key. `--keys` lists what lies on the device, line for line as the device writes it, and marks the one this kit uses; recognised is it by its prefix, because names repeat and prefixes do not. `--revoke-key` revokes exactly that one, takes the entry out of the secret store and empties `api_key_ref` in the file: a value that no longer holds on the device is not a secret but a dead access. A foreign key the kit never touches. On 29.08.2026 eight kit keys lay on one Orin, three of them with the same name, and there was no way in the kit to take one back.
- `forgetSecret` in the secret store: it takes an entry out of the **chosen** store. Up to now the kit could only write, and a revoked key would have stayed as a valid-looking access. Out of the other store it takes nothing: the same name lies there because another clone on this computer put it there, and the rule that has held for reading since 0.18.0 weighs more heavily when deleting. What lies where is named, not removed. The first draft of `--revoke-key` cleared both, and a foreign test proved on the same evening what that costs.
- The answer files for `/init` explain `ssh_key`. It is the name of the private key in `~/.ssh` on this computer, without a path; the kit holds the name, the key stays where it lies, and the device has to know the matching public one.
- A release means a slot, and `--deploy` says so. A package that was just deployed lies in staging only; whoever is released for the live version alone does not see it, and then the release stands and the overview stays empty. The foreign test on 29.08.2026 got stuck at exactly that point, with the tick set.
- Without a mirror the kit no longer points at manuals that are not here. Up to now `--deploy` and `--admin-login` sent everybody to `mirror.mjs --docs`, that answered "there is no mirror", `--refresh` answered "no token stored", and somebody who takes over an existing device stood in front of a purchase question after three hops. Where there is no mirror, that is now said in the same sentence.
- `/device` names `--keys` among the next steps. That a device collects kit keys and that you have to be able to find your own again stood only in the sheet.
- The sheet on the browser names the warning page of a device with `tls: selfsigned`, and that clicking through it is expected on a device you are sure of. The browser refused with `ERR_CERT_AUTHORITY_INVALID`, and no procedure said a word about it.
- The device's runtime no longer talks into the evidence of a revoke: a `DeprecationWarning` out of the container stood in the middle of it. Taken out is only what is recognisably the runtime's; every other line stays, even an unexpected one.

## 0.18.0 (2026-08-29)

Contract: up to 5

- The kit understands contract versions 4 and 5. Up to 0.17.0 it understood up to 3, and the Orin has carried 5 since 29.08.2026: `--check` still took a manifest, `--deploy` refused, and a stranger got no further. Version 4 brings `marken` in the manifest, version 5 the three environment values in their role (`umgebung.basis`, `umgebung.schluessel`, `umgebung.datenbank`) and, per endpoint, its path relative to the address.
- An app out of the scaffold now calls its ways relative to the address the device puts into its container. `ARASUL_API_URL` ends on the prefix of the external interface, and the endpoints' paths begin with it: whoever joins the two calls it twice and gets a 404. Which of the two applies is not the scaffold's decision but the contract's: the kit writes both into the `arasul.json` next to the backend.
- The mirror of the design system comes out of the product's package. `marken.json` names the version, fourteen dependencies and seventy-one files with their sha256; seventy of them go into the scaffold, all three sets including `primitive/` and `muster/`. Up to 0.17.0 the kit read a flat folder and took what lay on top: six blocks, and the `index.ts` in it pointed at two folders the mirror did not have.
- The guard asks a fourth question: does the app have what the library needs. The library is compiled with the app, so its `package.json` has to carry the fourteen packages; without this question the build only falls at the import that points into nothing, and the message then names a primitive instead of the missing package. The completeness question has moved along: instead of "does `index.ts` give out every block" it now reads "does a path lead from `index.ts` to every file", because the library has three levels.
- The scaffold builds from the full set. The list of cases is the pattern `Datenliste` (sorting, searching, an empty state, and below 900 pixels a card list instead of a table), the form is `Formularseite` with `Feldgruppe`, and the navigation is the pattern `Seitenleiste`. Around two hundred lines of rebuild fell away with it, plus `rahmen/fenster.ts`: the product's one threshold stands in the library.
- `design.css` is gone. The device's values have stood in the library itself since H3 (`theme.css`), and two files that set the same marks are the second truth: one said light is the default, the other black. An app's `stil.css` now loads the four parts in the order the package names, with the two layer statements that are conditions.
- The scaffold knows two themes instead of three, and light sets nothing. That is the device's contract since H1; the scaffold held a different one and wrote its fallback `black` at its own `<html>`: in a light interface that put a black frame on the screen. It now reads at its own document, which the shell writes into, plus the message `arasul:theme`, which names the value explicitly.
- An app says in its manifest which version of the design system it stands on (`marken`, contract 4). It is written when the app is created and when the mirror is pulled up, so exactly when it changes.
- `secrets.mjs` looked in the keychain anyway with `secrets_store: env` when the `.env` did not know the name. On a computer where another clone has worked before, `--list` showed foreign values as stored. Now the store named in the profile applies.
- A device on which Arasul was already running needed `tls: selfsigned` by hand in its file, otherwise every call over the interface broke off at the self-issued certificate. `/device` now enters it itself when that is exactly what it fails at.
- The answer files for `/init` name the value range of the fields that only know certain values. `first_device_state` was the finding; all seven are named.

## 0.17.0 (2026-08-29)

Contract: up to 3

- The device's library now lies in the app scaffold. Up to 0.16.0 it brought a `bausteine.tsx` of its own: four blocks, rebuilt after the design system's names, with an expiry date in the header. Now the mirror of `packages/marken` lies in it, file for file: Kopf, Liste, Karte, Formular, Meldung and Menue, plus `index.ts`, `fassung.ts` and `marken.css`. Word for word, because a mirror whose header somebody rewrites can no longer be held against its source. The import goes through `@marken`, the same alias under which the device's interface knows the library: the same source runs here and there.
- Next to the mirror lies `mirror.json` with version, source, date and a hash per file, and `node .ara/tools/marken.mjs` watches over it. It asks three questions: does every file match its hash, does the mirror stand at the source's version, and is it complete. `--sync` pulls the apps up, and only those: the scaffold is version controlled, and a tool that changed it in a partner's clone would leave a dirty working folder behind. `/init` asks the guard, from this version on as a step of its own. The source is the mirror of the product; as long as that does not bring `packages/marken` along, the kit's scaffold takes its place, because it is what `--new` would have laid down. The scaffold is never its own source.
- The scaffold uses all six blocks. The list of items is a data list out of `Liste` and `ListenEintrag`, the selected item stands as a `Karte` below it, and which one that is stands in the search query instead of in the page's state. Beside it a sidebar with the views and paths: above 900 pixels a column, below it the same content in the `Menue` over the page.
- New in the knowledge: `.ara/knowledge/design-system.md`. Which six blocks there are and what matters about each, how a page comes out of them, and what is forbidden: no colour of your own, no block of your own beside an existing one, change nothing in the mirror, no second threshold. Plus a table of what each of the guard's findings means.
- A clone that versions its own work was not foreseen. In four places the kit asked "does git track this file" and meant "did it come with the kit". For a partner's clone that is the same thing, for an operation that keeps its own devices and apps it is not: three checks of the self-test fell, and `--plan-aktiv` refused in the middle of the work. The new field `versioned:` in the profile names the folders that belong to this clone and separates the two questions. Empty still means: none, and then everything is as it was.
- Without a mirror nobody said how to get one. The sentence about the verification level and the header of the generated `design.css` now name `node .ara/tools/mirror.mjs --refresh`.
- In the company branch the kit key was called "Ara-Kit Partner" on the device: `business/company.md` does not exist there, and the expression fell back to its last branch. The name now comes out of the profile if there is no company head, and without any statement at all the key is called "Ara-Kit" instead of something invented.
- `start_password_ref` only stood in the file after an installation. A device on which Arasul was already running never got it, although `--admin-login` logged in with exactly that entry. If the entry lies in the store, the name now stands in the file.
- In the company branch `/init` counted `invoice` and `invoice_tool` as a gap although it empties them itself, and the answer-file path said "nothing is missing" although fields stayed empty. Both stand right now: the other branch's fields do not count, and the run with `--answers` ends with the same line as `--show`.

## 0.16.0 (2026-08-29)

Contract: up to 3

- The scaffold of an app now stands on the same stack as the device's interface: Vite, React 19, TypeScript, Tailwind 4, `react-router`, TanStack Query. Until now it was React out of a script tag with hand-written CSS, and a partner who had seen Arasul's interface found nothing in it that he recognised. `npm run build` runs `tsc --noEmit` before the bundler, so a type error stops the build instead of arriving on the device as an empty page.
- The scaffold does not know its own path and must not. A device delivers an app live under `/apps/<id>/` and in staging under `/apps/<id>/test/`, so `react-router` gets its base at runtime out of the document's address, and the assets stay relative. An absolute build pointed from staging at the live version, and nobody would see it on the page. It follows from that that the routes stay one level deep; that stands in the header of `rahmen/basis.ts` and in the app's README.
- Who is logged in the app now reads out of `api/me` and holds it as a context with the role. That way is the platform's and stands in its contract, so that even an app without a backend can show its user. The backend of the scaffold no longer returns the logged-in person in its own situation route: two sources for the same thing were one too many.
- The theme comes from the device. The app reads `data-theme` on the parent window and listens for changes, so whoever switches in Arasul sees the app go along; without a frame the operating system's setting applies. `design.css` therefore now carries one block per theme instead of only a media query, and the values for all three come out of the mirror. Next to it lies `marken.css`, mirrored from the product's design system: it gets replaced, not written on, and rules of your own belong at the end of `stil.css`.
- The backend of the scaffold follows the port pattern. `server.mjs` does HTTP, `kern/vorgaenge.mjs` does the cases and knows two connections and nothing else of the world, a store and a device. One store per entity, and in it the only SQL for it. The store is SQLite out of Node itself, without a package next to it, with its state in `pragma user_version` and one file per migration; a migration that has run does not run again. What lies in it survives a restart of the container and not the next deploy, because a device gives an app no data folder of its own, and that stands in the app's README.
- `--check` now also checks the build. Into the package goes the result of `npm run build` and not the folder in front of it; that stands as a rule in every device's contract and was checked by nobody. If `package.json`, `src/` or a `tsconfig.json` still lie in the frontend of the package, the tool stops before the device: deployed, the browser would get an `index.html` pointing at `/src/main.tsx`, and the human in the frame would see an empty page with no hint of why.
- Placeholders were replaced in nine kinds of file and not in `.ts` and `.tsx`. Every app out of the scaffold would have carried `{{name}}` in its interface. Now they are in the list too.
- What the browser leaves behind, `.playwright-mcp/`, is out of version control. It comes into being as soon as Ara uses the browser, and without that line the working folder of every kit repository was dirty afterwards.

## 0.15.0 (2026-08-29)

Contract: up to 3

- An app out of the scaffold started no run. Measured on 29.08.2026 against a played device that names its values in its contract: the POST on the app's item route answered 201, `vorgang.lauf` stood at `null`, the item at "ohne entscheidung" with the sentence "this device has given the app no interface", and the device had not heard a single call in all that time. The approval step was not refused, it was skipped, and because the item looked like one without Arasul, nobody looked in the right place for three explanations.
- The cause stood in the scaffold's backend: six values that are agreed between kit and product stood there out of somebody's head. `ARASUL_API_URL` and `ARASUL_API_SCHLUESSEL` as the names of the two values the device puts into the container, `x-api-key` as the header for the key, three paths without the prefix of the outer interface. None of them stands in the contract, none in the mirror. If the app does not find the two names, address and key stay empty, it never calls at all, and it takes that result for a device without Arasul.
- The scaffold now knows none of those values. The kit reads them at deployment out of the one device's contract and puts them into the package as `backend/arasul.json`: the names of the two environment values, the header for the key and the three ways, each one only after the device names it in its own endpoints. `--check` prints that beforehand and lists what this device does not promise. In the clone the file lies empty, and it goes into the image, otherwise the container would not see it.
- No silent `null` any more. If an item stays without a run, the reason stands at it, and "without Arasul" stands there only when the device really gave the app nothing. An empty environment value, a way the contract does not carry, a status the device returns, an answer without a number: every case gets its own sentence, at the item, in the app's situation route and once in the container's log at start.
- The scaffold no longer pins itself to one shape of answer either. Any answer of the 2xx class is accepted instead of exactly 202, the run number is read whether it stands bare or in an envelope, and the approval for a run the app looks for in the list of its own approvals instead of over a query parameter no contract names.
- The self-test carried the fault along. The played device answered exactly what the scaffold guessed: the same names, the same header, the same paths, 202 and the number without an envelope. What that proved was that the scaffold agrees with itself. It now hands out names of its own, a header of its own, puts its ways under the prefix of the outer interface and answers 200 with an envelope; next to that come three checks: that none of those values stands in the scaffold's source any more, that the arrangement arrives in the package, and that a frame that stands but yields no run does not pass as "without Arasul".

## 0.14.6 (2026-08-29)

Contract: up to 3

- A fresh clone from GitHub failed its own self-test. Measured on 29.08.2026 at 01:05: `git clone`, then `node .ara/tools/selftest.mjs`, and the first command a stranger runs said "the kit is not reliable in this state". Two checks were red, both because the self-test read a calendar date out of `toISOString()`, and that counts in UTC. In Central Europe between 22:00 and midnight UTC is still on the day before: a maintenance contract set up "in ten days" was read back as nine, and the service description looked for its paper under yesterday's date. In the worktree the same state was green, because nobody measured there at night.
- A calendar date in the kit is now the day the human in front of the computer sees. `day(offset)` in `.ara/tools/lib/kit.mjs` is the one place where a date comes into being, `today()` is `day(0)`, and both count in local time. The step over the date parts instead of over milliseconds also holds on the days of the clock change, when a day does not have 24 hours.
- `addDays` in the invoice and the build time of an app went the same way through UTC. Both now count locally, like every other date in the kit.
- Two checks against it happening again. One nails the dates down at fixed points in time, among them the measured failure itself, so that it does not depend on when the self-test runs. The other rebuilds a blank clone in a throwaway folder, only what is in version control, without profile, mirror or device file, and runs the whole self-test there.

## 0.14.5 (2026-08-28)

Contract: up to 3

- A refused login because of too many attempts (429) read as if the field names were wrong. The device counts logins, ten per fifteen minutes, and every run of `check-docs.mjs` knocks there once as well. It now gets its own answer: wait, then the same call again.
- The portal route in `device.md` stood there without its host, as `GET /api/download`. The documentation self-test therefore held it against the device, where it does not exist, and reported the kit's knowledge as wrong. It now names its host, and all 20 routes of the knowledge exist at a device with 0.3.0.

## 0.14.4 (2026-08-28)

Contract: up to 3

- The self-test deleted device files that were not its own. After dry runs, which create nothing, it removed `devices/orin`, `devices/mac`, `devices/thor` and `devices/dgx-spark`, and those are exactly the names the kit's own knowledge recommends for a device without a customer. On 28.08.2026 every self-test run deleted the file and the runsheet of a freshly installed Jetson AGX Orin. It now compares the state before against the state after instead of cleaning up, and a check of its own forbids deleting anything under `devices/`, `customers/` or `apps/` that the self-test did not create itself.
- `--admin-login` could not work against a real device. Every answer without a `data` envelope was thrown away in `call()`, and the login of product 0.3.0 answers without one: the kit said "no credential in the answer" while it stood there. The answer now carries `body` next to `data`.
- The fields of the login were called `benutzer` and `passwort` in the kit's fallback. Measured on a Jetson AGX Orin with 0.3.0: the device refuses those with a validation error and takes `username` and `password`. The fallback now says what was measured. What the artifact says still beats it, and what stands in the call beats both.
- `--login-user-field` and `--login-password-field` pass the two field names in the call, and the refusal names them. Before, the error said which fields it had called with and offered no way to pass different ones.
- The fake device in the self-test answered the way the kit hoped, with the credential inside a `data` envelope. It now answers the way the real one does, and the envelope case is checked next to it.

## 0.14.3 (2026-08-28)

Contract: up to 3

- "What the installer could not do" left out exactly what it exists for. Measured on a Jetson AGX Orin, first real installation: the list stopped at twelve lines, and the twelve were the noise. `SSH-Hardening fehlgeschlagen`, `Firewall-Setup fehlgeschlagen` and `must be run as root` came later in the output and fell off the end, and the device went through as finished, without hardening and without a firewall. The same warning with a changing timestamp now counts as one line, refusals come before warnings when the list has to cut, colour codes are stripped, and what was cut off is said with its number.
- The self-test measured that on six lines of made-up output, where nothing can crowd anything out. It now measures it a second time on the volume in which it really occurs.
- Three checks measured the working directory instead of the kit, and they went red on any computer that had installed once: the mirror is the product's artifact, fetched and never written by the kit, and it carries dashes, links to its own files and commands of its own. Dashes, links and commands now stop at `.ara/mirror/`.
- `Spiegel holt und packt aus` passed its token through the process environment, and that comes last in `getSecret`. With a real token in the keychain the refused case never happened. It now runs against a redirected `.env`, and then only that counts.

## 0.14.2 (2026-08-28)

Contract: up to 3

- A secret went into the macOS keychain and was not there afterwards. `security add-generic-password -w` asks for the value twice, for confirmation, and whoever sends it once over the pipe gets "passwords don't match", an empty entry and status 0 nevertheless: the kit reported success and had stored nothing. Found while measuring acceptance A2 on a Jetson AGX Orin, where the download token was the empty entry and the installation was unreachable because of it. The value now goes in twice and is read back afterwards, and a value that does not read back the same is an error and not a stored secret. It would have hit the start password and the kit key too, and both are named exactly once.
- The self-test writes into the real keychain once and reads back, under a name of its own that it clears away again, because an entry that exists is not an entry that is right.
- `Ein frischer Klon spricht Englisch` measured the working directory instead of the kit: the English case ran in the real kit, and that has a profile as soon as somebody has called `/init` once. Both cases now run in a throwaway clone.

## 0.14.1 (2026-08-28)

Contract: up to 3

- `--compose`, the way onto a device without Arasul, writes into the marker like every other way to a device, as `compose` and not as staging or live. Found while measuring acceptance A3 on a Jetson AGX Orin: the app was answering at `http://<device>:8080/`, and `node .ara/tools/app.mjs --app <name>` said the kit had deployed nothing yet. `lastStand` counts a compose slot, the situation line names it with its version, its time, its address and the sentence that Arasul is not there. The steps stay as they were: `--check` and `--deploy` are still what comes when the device gets Arasul.

## 0.14.0 (2026-08-28)

Contract: up to 3

- The way to buy Arasul hangs on `/device`, and there is no command for it: no command called kaufen or licence. When the verdict is supported, nothing of Arasul runs and no token is stored, the tool says so under "Next steps", with the link `https://www.arasul.de/kaufen`, and the question whether to install runs through the interview tool. Account and token the human fetches there themselves: an account is free and brings exactly one free device token for personal use, every further installation is bought, commercial use needs the licence at 3,000 euros net. The facts stand in one place, `.ara/tools/lib/licence.mjs`, and in `.ara/knowledge/device.md` under "The token"; the story of five tokens per partner from the portal is gone from every sheet and every tool.
- The pasted token goes in over the pipe, never as an argument: `printf '%s' "$TOKEN" | node .ara/tools/device.mjs --licence --store`. The tool checks the form, `ara_` and 32 hexadecimal characters, asks the portal with `pruefen=1` without fetching the artifact, stores it under `ARASUL_TOKEN` and says which file to install on: one fitting file is named with its call, with several the tool asks for the interview, with none it points to `/device`. A refused token comes back with the portal's reason and nothing is stored. Somebody who asks about buying without a device gets the same way, `node .ara/tools/device.mjs --licence`, and `sales.md` says as much.
- The self-test plays the portal and holds all of it: the form, the refused token, the stored one, one file, two files, a running device that is no target, the buy block on a supported device without a token and the plain call with one. `ARA_ENV_FILE` redirects the `.env` for exactly that, then only it counts.

## 0.13.0 (2026-08-28)

Contract: up to 3

- The root of the repository holds one README, the one GitHub shows. Its German half lies under `.ara/README.de.md`, linked in the first line, and the self-test knows the place: the pair is still counted, only the second half's location stands in the list explicitly. The rules for the document check moved to `.ara/.markdownlint-cli2.jsonc`, the call carries the path: `npx --yes markdownlint-cli2@0.18.1 --config .ara/.markdownlint-cli2.jsonc "**/*.md"`.
- The clone brings no app any more. The reference app under `apps/urlaubsantrag/` is gone, together with its exception in `.gitignore` and its plan; `apps/` belongs to the user entirely. What it showed now stands in the scaffold under `.ara/templates/app/`: an app made with `--new` files an item, starts the flow `freigabe`, stops at the approval, a human decides in Arasul, and afterwards the item stands as approved or rejected with the name of the one who decided and the sentence the flow wrote. Without Arasul the item stays without decision and the page says so. The self-test runs exactly that against the scaffold's backend, with a played device.
- The scaffold's interface is built from six building blocks with the names of Arasul's design system, head, list, card, form, message, menu, in `frontend/src/bausteine.jsx`, with the rules in `stil.css` and the values in `design.css` from the mirror. The page in `app.jsx` is only assembled from them, so that whoever builds on takes a block and does not write a second card next to the first. The blocks from the product itself, `packages/marken` from phase D7, are not enclosed yet: that needs the mirror and is the open item after this version.

## 0.12.0 (2026-08-28)

Contract: up to 3

- The Orin before it has a Linux is a guide with a check step per section, `.ara/knowledge/flash-orin.md`: the x86-64 host, the release package, the first user before the flash with `l4t_create_default_user.sh`, the recovery handhold, the flash, the network over the USB-C cable at `192.168.55.1`, and from there the kit by itself. Documented, not automated. Every step names whether it comes from NVIDIA's documentation for release 36.4.4 or from a running Orin, and nothing in it is claimed as verified: the test device was not flashed for it. The self-test holds that every section carries a check step.
- From the running Linux onwards the kit works by itself, and the piece after the installation is the self-healing: `node .ara/tools/heal.mjs --device <device>` starts what of Arasul does not run, one container at a time, checks that it took effect and records every step in the device file under Prüfungen and in `interventions.json` next to it, with the state before, the state after and the way back as a command. `--undo <id>` runs exactly that way back and proves that the state before is there again. `--plan` says what it would do and changes nothing.
- Three limits, in the code and in the self-test: only containers of the Arasul directory tree, never the bootloader or the system, and only what has a way back. A container outside the tree stays as it is and stands in the report as such. A container that runs but reports unhealthy would need a restart, and a restart has no way back: the kit asks instead, with the container's last log lines. It asks only when it gives up.

## 0.11.0 (2026-08-28)

Contract: up to 3

- `/device` recognises a device without being told anything about it. It reads what the device says about itself, vendor from `/sys/class/dmi/id/sys_vendor`, model, architecture, running system, reachability, and prints every one of them with the place that gives it.
- Which hardware the kit knows now stands under `.ara/knowledge/devices/`, one sheet per device, in both languages, for Orin, Thor and DGX Spark. Every sheet carries the date it is from and where its knowledge came from, and nothing is researched at runtime. A new device is a new sheet and no longer a new line in `lib/device.mjs`.
- Before every run, and a second time before every intervention, `/device` says how well the profile is backed: the field `verification` from the platform catalogue of the product, read from the mirror. `live` means verified on real hardware, `emulation` means only checked under emulation, `follow-up` means built from manufacturer documentation. Without a mirror the kit says that it cannot read the level, and it guesses none.
- The catalogue profile lands in `device.md` only when the mirror really carries it and the memory fits the variant. `orin-64` on an Orin with 32 GB would be a promise about memory this device does not keep.
- `--probe <file>` is the dry run: findings from a file instead of from a device, same recognition, same profile, same verification level, but nothing gets written and nothing gets changed. It refuses `--install`, `--deploy-key` and `--admin-login`. That is how the self-test carries Thor and DGX Spark, and neither of them is thereby verified.
- On a computer that does not carry Arasul the run ends helpfully: which devices carry it today according to the sheets, that questions about Arasul need no device, and a calm sentence on the licence. The kit is under the Apache licence 2.0 and stays usable without Arasul.
- `.gitignore` anchors the user folders at the repository root. Without the leading slash `devices/` also excluded `.ara/knowledge/devices/`, and then the device profiles would not have arrived in a clone.

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
