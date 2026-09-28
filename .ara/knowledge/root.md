# Procedure: the root of a whole house

> **When do you need this?** At `/root`: laying out a root folder for a whole organisation,
> adding a place or the method to it, enrolling its proposal, checking it, showing the
> showcase.

## What a root is, and what it is not

A house that works with agents over several projects has its knowledge in islands: one
repository with rules and skills, a shared folder without any, a second repository with its
own. No island knows the rest, and an agent started in one of them knows nothing of the
others. A root is the one folder above them. It says **what is true and where things lie**,
and it names the places where the work happens.

**A root is a scaffold, not a way of working.** Laid out without a switch it holds rules,
skills, agents, the list of places, a check script and the folders of level 1 that the house
names. How the house steers its work, with cards, experiments or something else, is its own
business. The kit offers one way as an addition, the method, and the root works without it.

**Nothing in the tree runs by itself.** There is no `settings.json` in it and no active hook.
A file like that in a folder that is cloned or shared is a decision taken for everybody who
opens the folder, and a hook in it runs without anybody having agreed. What the house wants
as boundary and rights lies in `.claude/proposal/` as a proposal and becomes active only
through the enrolment step, after consent, in the user's own settings.

**A root lies outside of the kit.** The kit is a tool and at most one of its places, not its
home. The tool refuses a path inside the kit. After laying out the root needs the kit no more:
its check script lies in it and runs with Node alone.

**A root copies nothing.** A place is a GitHub repository or a foreign folder such as
SharePoint or OneDrive. It stands in the list with where it lives, and at most with where it
lies on this computer: a clone, a synced folder. The same file in two places is a mistake,
not a backup, and the check script of the root reports a copy as a finding.

## What comes into being

```
<root>/
├── README.md
├── .gitignore
├── .claude/
│   ├── CLAUDE.md              The rules: truth table, hard rules, where new things go
│   ├── skills/                place, where-things-go
│   ├── agents/                place-reader (reads only), root-checker
│   ├── places.json            The list of embedded places
│   ├── root.json              Name, language, day of laying out, version of the kit, method yes or no
│   ├── proposal/
│   │   ├── proposal.json      Permission rules and the hook, as a proposal
│   │   ├── boundary.mjs       The hook: nothing is written into a place out of the root
│   │   └── boundary-test.mjs  The cases of the boundary
│   └── scripts/
│       └── check.mjs          17 checks, exit code 0 means no finding
└── <the folders of level 1, as the house names them>/
```

**With the method** there is more: `company/` (core, goal, decisions, follow-ups,
assumptions, risks), `roadmap/` with one sheet per place and `backlog/` (new, ready, running,
done, the folder is the state), `experiments/`, `customers/`, `templates/`, `archive/`, the
card tool `.claude/scripts/cards.mjs`, the skill `card-stack` and a section "The method" at
the end of the rules.

Folders, fields and columns are named in English in both languages, as everywhere in the
kit. The content of the sheets follows `--language`, otherwise the profile. An unknown
switch is reported and stops the tool: `--lang` used to be skipped, and the root came out in
the language of the profile without anybody having chosen it.

## The interview, in one bundle

Ask through the interview tool, everything at once, and then work through:

1. **Where** the root is to lie. A path next to the projects, not in a synced folder if it
   is to carry version control: file sync and an active `.git` do not get along.
2. **What the house is called.** That goes into the headline of the rules and the README.
3. **Which language.** Default is the profile.
4. **The folders of level 1.** What the house calls the top level of its work: `sales`,
   `product`, `finance`. Names in lower case, and per folder at most one phrase on what
   belongs there. The kit brings none of its own and does not suggest any. A house that does
   not know yet names none, a folder is easy to add later, by hand.
5. **Which places**, and per place: a short name in lower case, `github` or `folder`, where
   it lives (address or path), where it lies on this computer if it does, what it is for,
   and whether the root may write into it. **Default is no.**
6. **The method or not.** Offer it as an addition, with one sentence: company sheets, one
   sheet per place with goals and deadlines, a card stack as the one work list, experiments.
   Default is no. Whoever says no can still add it later.

**You look before you ask.** Whether a path exists, whether it is a repository, what its
remote is called: `ls` and `git remote -v` say that, the human does not have to. You only
read. **In the places you change nothing**, not at laying out and not afterwards: no file,
no link, no configuration. That holds in particular for a house that is not the user's own.

**Why writing is closed by default.** A session in the root does not load the rules of the
place. A repository has its own `CLAUDE.md`, its skills and its hooks, a shared folder has
people working in it. Whoever wants to change something there starts a session there. The
root says *what* the place has to be able to do by when, the place decides *how*. If the
house wants it differently for a place, `write: yes` stands in the list for everybody to
read, and a line in the rules or, with the method, in `company/decisions.md` says why.

## Laying out

```
node .ara/tools/root.mjs --path <folder> --name "<house>" --folders "sales,product=what we build" --places <file.json>
```

Add `--method` for the addition. `--folders` takes `name` or `name=what for`, separated by
commas. A value with a space belongs in quotes. With one place `--place <name> --kind
github|folder --where <address> [--local <path>] [--write yes] --purpose "<what for>"` is
enough. For several you write the list into a file outside of the kit, in the temporary
folder of the system, and hand it over with `--places`:

```
[
  { "name": "api", "kind": "github", "where": "https://github.com/acme/api",
    "local": "~/Code/acme/api", "purpose": "the product" },
  { "name": "projects", "kind": "folder", "where": "https://acme.sharepoint.com/sites/projects",
    "local": "~/Library/CloudStorage/OneDrive-Acme/Projects", "purpose": "one folder per project" }
]
```

The target has to be empty or missing, the tool overwrites nothing. It lays out the tree,
writes the list and the proposal, runs the check script of the fresh root, creates a
repository with a first commit (`--no-git` leaves that out) and says how long it took.
**The check ends without a finding, or you say what it found.** A finding in a fresh root is
a fault of the scaffold, not of the human: report it with `gh issue create` against the kit
if the human agrees.

## Taking over a grown folder

```
node .ara/tools/root.mjs --adopt <folder> [--name "<house>"] [--language de|en]
```

A house that has worked in one folder for weeks does not want a fresh empty root next to it: the
north goal comes only when exactly that folder goes to the device. `--adopt` makes a root of it
and **overwrites nothing**. Exactly four files come into being, `.claude/root.json`,
`.claude/places.json`, `arasul.mjs` and the proposal `.claude/proposal/proposal.json`; when one
of them lies there already, nothing is written
and the tool says which one. The house's `.claude/CLAUDE.md`, its skills, hooks and settings,
its `.gitignore` and its version control stay as they are. The name is the folder's unless
`--name` says another. **The language is the one its `.claude/CLAUDE.md` speaks** (or a
`CLAUDE.md` at the top), not the kit profile's; if that cannot be told, the profile's applies, and
`--language` overrules both.

What it finds, it says, and it writes nothing of that:

- **A clone that the `.gitignore` at the top leaves out** is a place that lies here, and it is
  entered as one: `github` with the address of its remote when that is GitHub, otherwise
  `folder`, `local` as `./<path>`, read only. The purpose says that it was taken over; the
  house writes a better sentence.
- **A clone the `.gitignore` does not leave out** would go into the company folder as a copy.
  It is not entered, and the tool proposes the line for the `.gitignore` and the `--place`
  command.
- **A source tree**, marked as check 17 marks one, goes into the company folder without what a
  machine makes and without `.env`. The tool proposes either a repository and a place for it,
  or a line in the `.gitignore` that keeps it home.
- **Files of the kind `.env`** at any depth are named: they stay home at every sync.
- **Every folder of level 1** that a sync of the root would take along is named, because every
  account of the device reads the root: measured on 2026-09-27, a second account read `kunden/`
  and `company/core.md` of an adopted root. Folders whose names look like data of customers or
  like the inside of the company stand first. The tool proposes, before the first sync, to make
  each folder not everybody should read an area on the device, with the folder's name as its id,
  and names the way there (front end, Settings, Company folder, Create folder, kind area). An
  area is synced on its own, only to the people with a right on it, and the root leaves it out.
  A name that is no id of the device is said with it.
- **Inside `.claude/`, the scripts and the runtime files** that a sync would take along are named
  one by one, because every account reads them too: measured on 2026-09-28, every account read
  `.claude/scripts/mail.py`, `.claude/app/serve.py` and `.claude/state.json` of an adopted root.
  A runtime file is what a running program writes, a log, a state, a lock, a database, an agent
  of launchd; it belongs to this computer, and the tool prints the lines for the `.gitignore`
  that keep it home. A script is the house's tool: one that holds addresses, access or what not
  everybody should know stays home with a line in the `.gitignore` or moves into a folder of
  level 1 that becomes an area. What the `.gitignore` leaves out, the hooks and the settings are
  not named, they stay home anyway. The rules, skills and agents are counted: they are what the
  root is for.

A root taken over carries no check script of the kit, because it would lie where the house has
its own. **Its proposal carries no hook**, only what the bridge needs: `apps` and the reading
form of `call` without asking, `call ... --write` asks, and two lines for the house's
`CLAUDE.md`, one on `sicht.md` and one on `apps/<id>/APP.md`, so that a new session finds both
without a word. `login` shows it with its checksum, `login --approve <checksum>` writes the rules
into the user's own settings and appends the two lines, `login --withdraw` takes both back.

**The bridge's rules stand in both forms**, with the written-out path, which holds from any
folder, and as the command is typed in the root, `node arasul.mjs call ...`. The two lines name
that second form, the real command, and no placeholder: the `CLAUDE.md` goes to every computer
of the house, so it names no path of one. Measured on 2026-09-28 with `claude -p` 2.1.283: with
the placeholder `<wurzel>` in the line, the agent tried `node arasul.mjs call` first, twice, and
was refused each time. A rule without a path would hold in every folder of this computer if it
stood in the user's settings, and any `arasul.mjs` anywhere would run without asking. So
approving writes it into the root's own `.claude/settings.local.json`, which a session reads only
there, even in a folder never trusted (measured the same day), and `--withdraw` takes exactly
that out again; a file approving made for it alone goes with it. A sync never takes
`settings.local.json` along.
`root.mjs --enroll` points to the bridge for it. `--show` and `--place` work, `--check` says that
there is no check script. What comes next is the bridge: `login`, then `sync --plan`, then
`sync`.

## After laying out

Say in three lines what lies where, and then the next steps the tool names. Offer to write
the three sentences at the top of `.claude/CLAUDE.md` together: what the house does, for
whom, who decides. With the method offer the two sheets `company/core.md` and
`company/goal.md`: where the house stands, the bottleneck, what is expressly not done, the
north goal as one checkable sentence, the milestones with deadlines. You write into the root
only what the human said. **No number from memory, no invented goal.**

From then on **the agent starts in the root or in a folder of level 1**, not in the kit and
not in a place. A session one level down loads the rules, skills and agents of the root as
well.

```
node .ara/tools/root.mjs --path <root> --place <name> --kind ... --where ... --purpose ...
node .ara/tools/root.mjs --path <root> --method
node .ara/tools/root.mjs --path <root> --show
node .ara/tools/root.mjs --path <root> --check
```

`--place` with an existing root adds a place: a line in the list, the rules of the proposal
and, with the method, its sheet. Rules the house entered by hand stay. `--method` lays the
addition into a root that has none: files and folders that are not there yet, the rules
appended to `.claude/CLAUDE.md`, a sheet per place. Nothing is overwritten, and a folder of
the house that is called like one of the method stops it until the house has renamed it. A
new folder of level 1 later is made by hand, with a line in the table "Where new things go"
of `.claude/CLAUDE.md`, and the check says if that line is missing. `--show` names the root,
its places, whether the method lies there and how it stands with the enrolment. `--check`
runs the check script of the root.

## The proposal and the enrolment

`.claude/proposal/proposal.json` holds the permission rules (`allow`, `deny`,
`additionalDirectories`) and the hook, `boundary.mjs` next to it. **It is a proposal.** Every
rule carries a path, `{root}` stands for the folder of the root, because a rule in the user's
own settings applies to every session on the computer and a relative `./` would mean the
folder of each session.

The enrolment step is the one place where a proposal becomes a setting:

```
node .ara/tools/root.mjs --path <root> --enroll
node .ara/tools/root.mjs --path <root> --enroll --consent <checksum>
node .ara/tools/root.mjs --path <root> --unenroll
```

1. `--enroll` alone shows and writes nothing: the settings file it would go into, the hook
   with its full command, every rule, and the **checksum** over `proposal.json` and
   `boundary.mjs`.
2. Ask the human through the interview tool, with that text. The question names the intent
   (hang the boundary and the rules into their own settings), the target (that settings file
   and a copy of the hook next to it) and the way back (`--unenroll`). The answer is the
   consent.
3. Only then `--enroll --consent <first 16 characters of the checksum>`. A checksum that does
   not fit the proposal as it is now writes nothing. The previous state of the settings lies
   next to them as `.ara-backup`.
4. **The hook that runs is a copy** next to the settings, not the file in the tree. A change
   in the tree, say through a pull, takes effect only after new consent: `--show` says that
   the proposal has changed, what was consented to keeps running, and `--enroll` shows the
   new checksum. Anything the root enters into the user's settings is recorded, and
   `--unenroll` takes back exactly that and nothing else.

`--settings <file>` names another settings file than the agent's own. Logging in to a
device is not part of this: that is the CLI of the root, `arasul.mjs`, see "The bridge to
the device" below. It carries the same approval step in a version of its own, because it runs
with Node alone, and it writes the same files: what one enters, the other takes back.

## The bridge to the device

`arasul.mjs` lies in every root, next to `.claude/`. It runs with Node alone and comes out of
the kit like the check script. An agent in the root cannot hold a credential for a device, ask
which apps a person is assigned to, sync the folders a device shares with them or call what an
app offers. This file does that, and nothing else.

| Command | What it does |
| --- | --- |
| `login <address> --user <name>` | Logs in, has a credential issued, then shows the proposals and the places. The password is asked for at the terminal and never shown, `--password-stdin` takes it from the first line of the input, an argument never. `--credential-name` says what the device files the credential under, by default the name of this computer |
| `login <address> --token-stdin` | The same with a credential instead of name and password. It is issued in the device's front end |
| `login`, `login --approve <checksum>`, `login --withdraw` | Show the proposals, approve one by its checksum, take back everything the approving entered |
| `apps` | The apps assigned to the person, with their routes. Writes `apps/<id>/APP.md` for each |
| `sync` | Syncs the company folder, the root of the device at the top of this folder included, writes the same files and `sicht.md`, the view of this person. `--client` names the command line client of the file service |
| `sync --plan` | Shows per folder what a sync would move: up and down with count and size, conflicts, what was deleted on one side, what stays home. Writes nothing and starts no client |
| `sync --keep-mine` | Moves the device's version of every file that differs, and at the first sync of a root that is one here also every file only the device has, on the device into `.claude/device-old/<time>/` (`geraet-alt` in a German root) and syncs this root's. Without it `sync` stops at the files that make the root |
| `sync --install` | On a Mac: the sync in the background. Lets launchd run a check once and stops with one line when launchd's node does not reach the device. Checks the password against the file service, has it issue an app token for this computer, puts the token into the keychain and hands an agent to launchd that syncs every five minutes, `--every <minutes>` another interval |
| `sync --uninstall` | Takes the agent out of launchd, revokes the app token and takes it out of the keychain. What was synced stays |
| `status` | First one line: when the last sync went through, how much is open here, how many conflicts, whether it runs in the background. Then the device, the credential, whether the device accepts it, the company folder per folder with the root first, `sicht.md`, the proposals |
| `deploy` | Puts this root into the root of the device: the check script first, the root made as an administrator only when the device carries none, a download afterwards as the proof. `root.mjs --deploy` calls it |
| `call <app> <route> [name=value ...]` | Calls one route of one app and writes the answer to the standard output. `--write` for a route that changes something, `--method` where a path exists for two methods |

**The language of the output** is the root's, out of `.claude/root.json`. In a folder that has
none yet, such as the empty folder an employee's root comes down into, it is the language this
computer remembered from the last root it logged in or synced in, or from the last `login
--language`, and only then the system's `LANG`. Before its first line, `sync --plan` and `sync`
read the `root.json` in the room of the root, when this person may read it, and speak its
language from then on. `--language de|en` or `ARASUL_LANGUAGE` overrule it.

**The credential** lies in `~/.config/arasul/credentials.json`, mode 0600, one entry per device
with its address and credential. Never in the root, never in the keychain. The login sends name
and password to the login route, and what it gets back is a session: it has an end and carries
everything the human may do, an administrator's session included. So it is used for exactly one
request, `POST /api/ausweise`, and then dropped. What is stored is the credential the device
issues there: it has no end, it says who somebody is, and it opens the three ways this file
walks and no administration. The device shows its value once, in the answer to that request;
whoever loses it issues a new one. Neither the password nor anything of it is stored. A device
with a certificate of its own is pinned once with `--insecure`, which stores that certificate as
the trust anchor for this one device; the check is not switched off.

**What the tool assumes about the device** stands in one block at its head, with the date it is
from: `POST /api/auth/login`, `POST /api/ausweise`, `GET /api/auth/session`,
`GET /api/apps/meine` and `GET /api/firmenordner`, out of the API reference of the product, and
for deploying, with a session and never with the credential, `GET /api/auth/me`,
`POST /api/auth/logout`, `GET /api/firmenordner/ordner`, `POST /api/firmenordner/ordner` and
`POST /api/firmenordner/rechte`. They are statements about the product like any other, and
`check-docs.mjs` knocks at them. One more the tool asks and no device knows yet as of
2026-09-22: the route `sicht` below the company folder's route, the view of a person. A 404
there means: not yet. The route each app answers with its description is called `agent` and lies
in the app's own interface.

## The company folder

`sync` asks `GET /api/firmenordner` with the credential. The device answers with the address of
its file service, the person's name there and, per folder, its id, its level, its parent, its
path and the right on it. **`503` is not an empty list**: the first says there is no file service
on this device, the second says this person has no folder. A tool that mixes up the two empties
somebody's tree.

**Switching the company folder on** is a step on the device, and the kit does not carry it: the
product's manual on the company folder says it, in the mirror, read from the device:
`node .ara/tools/mirror.mjs --docs --device <device> --read docs/features/FIRMENORDNER.md`,
right at the top and in the procedure for setting one up. Measured on 2026-09-26: one switch in
the device's configuration, and both containers the manual names are recreated, not only the
first. It is a change: confirmation with intent, target and the way back (the switch out again).
Afterwards the people who exist already are synced into the file service along the route of the
API reference, and the proof is `GET /api/firmenordner` no longer answering `503`.

**Every folder lands at its real place in this tree.** A folder of level 1 becomes a folder at
the top of the root, one of level 2 becomes `<parent>/<id>`, and the chain above it is made
locally even when the person has no right on the parent and cannot see it in the service. A
folder of level 1 that is named like a folder the root carries itself is not laid down, and one
whose id is not an id is not either; both are named.

**The room of the root is the root itself.** The device carries one root of its own, level 0
with the kind `wurzel`, exactly one per device, and names it first in its list of folders for
every active person, with an empty path and the right that follows from the role: everybody
reads, administrators write, no right per person (as of 2026-09-22, measured at a device whose
root has the id `firma`). The tool recognises it by level and kind and by nothing else, and
takes the id out of the answer: the room in the file service is named by that id. That room is
not laid into a folder below the root, it is synced onto the root's own folder: `.claude/`,
`arasul.mjs`, the README and everything else of the scaffold arrive at the top, and whoever has
`lesen` on the root gets them read-only. So an employee's tree has the root at the top and their
folders below it, at their real place, and Claude Code started in any of those folders loads the
rules, skills and agents of the root. Measured on 2026-09-22 at a device: a session two levels
below the root, in a folder of level 2 that the person may write, named the root's
`.claude/CLAUDE.md` and its skills, and a call of the skill `arasul` ran `arasul.mjs apps`
against the device. A folder of level 1 with the id `wurzel`, which a kit before 0.29.0 made as
the root, is a folder of level 1 today and lands under its name. Level 0 with another kind is a
shape the tool does not know: it names the folder and lays nothing down.

**A root comes down into an empty folder.** Whoever is given the room of the root puts
`arasul.mjs` alone into an empty folder, logs in and syncs: `login`, `status` and `sync` run in
a folder that holds nothing but that file and what the file makes, and the root lies there
afterwards. The bootstrapping file steps aside before the client runs, because the room carries
the file too, the one the house deployed, and the client cannot merge two versions of it:
measured on 2026-09-22, it kept both and named the second one a conflicted copy. The house's
one wins, and should the room carry none, the file is put back. A folder with anything else in
it is no root and does not become one.

**The syncing itself is done by the command line client of the file service**, `opencloudcmd`,
out of the vendor's desktop package for macOS. It runs unpacked, without installing. `sync`
looks for it in `/Applications/OpenCloud.app/Contents/MacOS/`, below the home folder, and on the
path; `--client` names another place. Measured as of 2026-09-22: a folder of level 1 is a room
named by the folder's **id** and not by its display name, and a folder of level 2 hangs in the
room `Shares` and is reached with `--remote-folder <id>`. The switches are `--trust`,
`--non-interactive`, `--sync-hidden-files` and `--exclude`.

**The client logs in with the same password as the device**, because the device mirrors it into
the service. `sync` therefore asks for it at every run, at the terminal or with
`--password-stdin`, hands it to the client in the environment variable `OPENCLOUD_TOKEN` and
stores it nowhere. Never as an argument: an argument stands in the process list of every person
at this computer.

**Not pinned.** The client knows one switch for a certificate, `--trust`, and none that names a
single one. The connection to the file service is therefore not held to one certificate the way
the connection to the device's interface is. That is the client's doing and not the kit's, and
it is written here so that nobody takes it for a decision.

**What never goes into the company folder** stands in one list and goes to the client as a file:
what a machine makes (`.git`, `node_modules`, `.next`, `.venv`, `__pycache__`),
what belongs to this computer (`.claude/hooks/`, `settings.json`, `.DS_Store`), what holds a
secret (`.env` and every `.env.*`, at every depth) and what the client writes itself. The last
one is not a nicety: without its journal in the list the client reports conflicts about
itself. **`build` and `dist` are made by a machine only in a source tree**, a folder with a
manifest such as `package.json` next to them. There they go into the list as their paths; a
folder of the house with that name elsewhere, a skill called `build` for instance, goes along.
Up to 0.46.0 both stood in the list as names and kept every such folder home at every depth.

**The `.gitignore` at the top of the root counts as well.** What the house keeps out of its
version control, the clones of its products, what runs, its secrets, it keeps out of the company
folder. The tool reads the file as git does and hands the client what it reads the same way: a
name at every depth, a path with a slash inside from the top. A rule anchored with a leading
slash, one with `**` and every rule of a file with a `!` go to the client as the paths they hit
in the tree right now, because the client anchors no name and takes nothing back. A
`.gitignore` further down does not count: it often keeps big media out of git that the house
still shares. Measured as of 2026-09-22 against the client, with a folder that carried every one of
these: everything on the list stayed out, at the top of the folder and three levels down, and
`.claude/skills/` went through. The journal was called `.sync_journal.db`.

**The root's own sync leaves more out**: the folders the device shares separately, which lie in
the root at their place and are synced on their own, `apps/`, where the tool writes what the
apps say, and `sicht.md`. They stand in the list as bare names and not as paths, because the
client anchors no pattern at the top of a tree: a pattern with a slash is matched from the
beginning of the relative path, and a bare name at the top has no slash to match. Measured on
2026-09-22, a name with a leading slash in the list kept nothing out, and read in the client's source. So the name
of a room is kept out of the root's sync at every depth: a folder deep in the root that is named
like a room stays home, and `sync` names what stayed home.

**A plan before a sync.** `sync --plan` asks the device for the folders and the file service
for what lies in each room, one folder deep per `PROPFIND`, and looks at this tree through the
same list the client gets. It asks for the password, because the service shows its rooms to no
one else, and it writes nothing: no file in the tree, no `APP.md`, no view, no state. Per
folder it says how many files of what size would go up and down, which ones differ on both
sides, what was deleted on one side, and what stays home, weighed per line of the list. What
stays on the device because of the list is said too. **Without a state of the last sync
nothing counts as deleted**: what lies on one side only goes to the other, and what lies on
both and differs is a conflict. After every sync the tool lists the room again and keeps, next to
the credential, size and time of every file per folder on both sides (`firmenordner-stand/`), so
the next plan tells a new file from one that was deleted on the other side. Both sides, because
the client sets the time of a file it moves to the other side's, but an empty file carries the
time of its upload on the device. Names are compared composed (NFC): the client writes an
umlaut decomposed on a Mac, the service answers it composed. Both measured on 2026-09-27.

**The files that make the root win only when somebody says so.** Where a file differs on both
sides, the client puts the device's version at its name and the house's next to it as a
conflicted copy. For content that is a visible conflict. For `.gitignore`, `.claude/CLAUDE.md`,
`.claude/root.json`, `.claude/places.json` and `arasul.mjs` it changes what holds: measured on
2026-09-26 at a device whose root carried another house's scaffold, the first sync of a grown
folder left the house's `.gitignore` as a conflicted copy, and the second one took the clones
of four products up that the house's own `.gitignore` had kept home. So before the client runs,
`sync` and `deploy` list the room and compare as the plan does, and when one of these files
differs and this person writes the root, they stop for the root and name the files; the other
folders are synced. `--keep-mine` moves the device's version on the device into one folder,
`.claude/device-old/<date> <time>/` (`geraet-alt` in a German root), at its path below it, with
WebDAV `MOVE` that overwrites nothing; a folder whose files all go moves as a whole. It moves
every file that differs, and at the first sync of a root that is one here already also every file
only the device has, the root of another house for instance. The house's takes the names, and the
device's comes down in that one folder and nowhere else. Measured on 2026-09-27: moved next to
each file, the device's rules and nine files of another root came into the house's `.claude/`,
and a conflicted copy of the README counted at every run. **`sync --plan` names every such file
beforehand**, one per line. Whoever only reads the root gets the device's version, and that is
right: the plan says "sync stops here" only to a person who writes the root.

**A newer bridge takes the place of an older one by itself.** `arasul.mjs` carries the kit version
it came with. Where it differs on both sides and one is newer, the newer one goes to the other
side before the client runs, with its time, and nothing stops: up with a WebDAV `PUT`, down by
writing the room's version here. So a new bridge comes into an existing room when one
administrator syncs with it, and everybody else gets it at their next sync; nobody deploys by
hand. The same holds in an empty folder that holds the bridge alone. A bridge from before 0.51.0
carries no version and counts as the older one.

**A name anchored at the top reaches further.** A rule with a leading slash, for a `notes.log`, means only
the one at the top; the client keeps the name out at every depth. The plan names what that keeps home
beyond what the `.gitignore` meant.

**Nothing the client deletes here is lost.** The client deletes here what was deleted on the
device, that is how a sync works. Before it runs, every file it may touch gets a second name in a
trash next to the credential, `~/.config/arasul/papierkorb/`: a hard link, not a copy, so it
costs no space. What still lies at its place afterwards loses that name again, what the client
took away keeps it, and `sync` says how many and where. Where the computer cannot link into that
folder, the trash lies in the root as `.arasul-papierkorb/`, which is never synced.

**A long sync goes through, and one folder that fails stops no other.** The first sync of a grown
folder, or a person with many areas, runs for minutes in the client. Meanwhile the proxy in front of
the file service closes the connection the bridge kept open, after 180 seconds of idle, without
saying so beforehand. Measured on 2026-09-28: the next request after a client run of five minutes
broke off with `write EPIPE`, and the other folders were not synced. So a request the device may
take twice (`GET`, `PUT`, `DELETE`, `PROPFIND`, `MKCOL`) is sent once more on a fresh connection
after `EPIPE`, `ECONNRESET` or a socket hang up, and a request that changes something otherwise
(`POST`, `MOVE`) always takes a fresh one. Should a folder fail anyway, its reason is written
down for it and the next one is synced; `status` names it under "not through". Measured on
2026-09-28 at the same device with the bridge of 0.52.0: a client run of ten minutes in the
foreground and one of twelve minutes from the launchd agent, 500 MB up each, both went through,
and `status` showed every folder synced.

**A withdrawn or thrown away folder never goes into the root.** A folder of level 1 or 2 lies in
the tree at its place, and the root's sync leaves its name out as long as the device names it.
Once it is thrown away in the front end or withdrawn from a person, the device names it no more.
`sync` knows it anyway, out of the state of the last syncs and out of the client's journal
`.sync_*.db` in the folder, keeps its name out of the root and moves it next to the root before
any client runs, into `<root>-withdrawn/<time>/` (`<root>-entzogen/` in a German root). Moved, not
deleted: what was changed here and never went up is still there to be read. `sync --plan` names
such a folder with its files and moves nothing, `status` says in one sentence where it went.
Where the computer cannot move it there, it goes into `.arasul-papierkorb/`. An empty list of
folders, or a state of another file service, moves nothing. Measured on 2026-09-27 at a device
with an administrator and a reader: one folder thrown away in the front end, one withdrawn from
the reader. The bridge of 0.49.0 would have taken one file of each into the root; this one showed
0 files up for both, both syncs went through twice, and the root's room stayed the same byte for byte.

**Measured on 2026-09-27 at a device** whose root carried the scaffold of a customer run, with a
copy of a grown folder of about 800 files of the house's own and four product clones: `--adopt`
wrote three files; the plan took 3 seconds and wrote nothing; `sync` stopped at the root over
the five files that make it; `sync --keep-mine` took 122 MB up in under two minutes. On the Mac
none of the 796 contents was missing, on the device none of the 15 files the room carried: ten
at their name, five moved aside and equal byte for byte. On the device lay no `.git`, no `.env`,
no `node_modules`, `.venv` or `.next`, no settings or hooks and no product clone, and the skill
`build` did. A change on each side arrived on the other, a file changed on both sides came out
as a conflicted copy with both versions, and a file deleted on the device lay in the trash on the
Mac.

**A probe never goes into a room that stays.** What a client deletes in a room lies afterwards in
that room's trash on the file service, not gone, and Arasul's administrator may not empty it: the
file service answered `403` on 2026-09-27, and neither kit nor product names a way for an
administrator of Arasul. After the measurement above, 78 entries of the probe stayed in the trash
of the root's room. So a probe of your own client goes into a room of its own, level 1, which you
throw away as a whole afterwards along the device's route for that: it empties exactly what it
throws away (the manual on the company folder, section on throwing away).

**The sync in the background.** Working out of the company folder every day means the sync runs
without anybody thinking of it; a command with a password per run is forgotten after three days.
`sync --install` asks for the password once, checks it against the file service and has the
service issue an app token for this computer with it, valid for a year. Only the token goes into
the keychain of the Mac, service `Arasul Firmenordner`, one entry per root and through the input
of `security`, never as an argument; the password is stored nowhere and stands in no file. Where
the service issues no token, the password goes there instead, and `--install` says so. Measured
on 2026-09-27 at a device: the service issued the token for a year, took it wherever it takes the
password, the client included, and refused it after revoking. Then it writes an agent for launchd to
`~/Library/LaunchAgents/de.arasul.abgleich.<folder>-<checksum>.plist` and loads it into the
session of the person logged in: it runs at once and then every five minutes, and launchd starts
it again at every login. The agent runs `sync --background`, which takes the password out of the
keychain and works like `sync`; its output goes to `~/.config/arasul/abgleich/<agent>.log`.
One sync of a root at a time: the agent and a terminal share a lock, and whoever comes second
starts nothing. A conflict or an error comes as a notification of macOS, once when it comes
about and once when it is over, not at every run. A device that does not answer is said only
after a quarter of an hour, because a restart takes minutes; that holds as well when the client
loses the service in the middle of a sync. Measured on 2026-09-27 with a restart of the device four
seconds into a sync that took 60 MB up: the client stopped with `Connection timed out`, the next
run after the restart took everything up and down, and the 60 MB were equal byte for byte. **Revoking** the credential in the
device's front end stops the sync at its next run with one sentence, before the client starts:
the credential is asked first at every run. An app token revoked, ended or a password
changed stops it as well, and `sync --install` issues a new one. `sync --uninstall` takes agent
and token back and revokes the token at the service. A
root under Desktop, Documents, Downloads or iCloud is guarded by macOS: a program in the
background gets in only with full disk access for node, and `--install` says so.

**Checked from where it runs.** Measured on 2026-09-27 at a Mac: node started by launchd did not
reach the device under its LAN address (`EHOSTUNREACH`), from the terminal it did, and the
device's Tailscale address answered from both; it showed only in the agent's log. macOS lets a
program into the local network only with the approval Local Network, and node in launchd does not
get it. So before `--install` stores anything, it lets launchd run `sync --reach` once as an agent
of its own (`<agent>.pruefung`), reads which addresses answered and removes that agent again.
When the device or every address of the file service does not answer from there, it stops with
one line: the cause and the way out, `login` under an address that answered from the background.

**Every address of the file service.** Since 2026-09-27 the device names `adressen` next to
`adresse`, the one to take first; the bridge takes the first that answers from here, in the plan,
the sync and the background, and says which it skipped.

**The client is offered, not presupposed.** When the vendor's command line client is missing,
`login` and `sync --install` offer it, at a terminal with a question, otherwise with one sentence.
`--fetch-client` fetches the macOS package from the vendor's releases on GitHub, checks it against
the SHA-256 published next to it, unpacks it with `pkgutil` and keeps only the app in
`~/.config/arasul/klient/`; nothing is installed, deleting that folder takes it back. Measured on
2026-09-27 with version 4.0.0: the client runs out of the unpacked package.

**Times in `status`** are the clock of this computer, not UTC.

**A folder named like a person** has two spaces of that name in the file service: the person's own
and the folder's. The tool takes the project space. Measured on 2026-09-27: the service listed the
empty personal space first, and the plan compared with it.

**Open** in the line of `status` counts what changed here since the last sync, against the state
kept per folder; what changed on the device only the next sync sees. A `+` behind it means a
folder has no state yet.

**Conflicts and symbolic links** are counted out of the tree and not out of the client's report,
because both also come into being between two syncs. A file the client could not merge carries
`_conflict-` in its name, or, as this client wrote it on 2026-09-22 at a device, `(conflicted
copy <date> <time>)` before the ending; the client follows no symbolic link. `sync` and `status`
name both, and both go red on them. For the root, what lies in a room at its top is not counted
twice.

**The view, `sicht.md`,** lies at the top of the root and says what this person has on the
device: the file service, every folder with level, right and last sync, what passes the sync by
as the device names it, and the assigned apps with their routes. `sync` writes it at every run.
The device is meant to deliver it one day on the route `sicht` below the company folder's route;
until it answers there, the tool writes the sheet out of `GET /api/firmenordner` and the apps
and says so. When the device delivers one, its text is taken as it comes. The sheet is per
person: it is never synced, and the root's `.gitignore` leaves it out.

**The state of the last sync** lies next to the credential, in `firmenordner.json`, keyed by the
root: per folder when it was last synced, whether it worked out and how many conflicts and links
were lying there. No secret is in it. `status` reads it and counts the conflicts afresh.

**A folder that arrives new at the top of the root wants a line** in the table "Where new things
go" of its `.claude/CLAUDE.md`, otherwise the root's own check script reports it at every run.
`sync` says which ones and writes no line itself: the column next to the name says what belongs
in the folder, and that is a sentence of the house and not of a file service.

**An app describes itself** in the field `agent` of its `app.json`: a list of routes, each with
`method`, `path` relative to the app's interface, `purpose` as one sentence, `params` (each
with `name`, `type` of `string`, `number`, `integer` or `boolean`, and `required`) and
`writes`. The app delivers the field itself on the route `agent`, and `call` fetches it afresh
with every call. **What is not in it, the tool does not call**, and a route with `..` or a
query is not one. `app.mjs --check` holds the field against the app: its form, and that every
route it names is in the backend. What a device's schema for `app.json` says about the field
is the device's business: one that does not know it refuses the package, and `--check` says so.

**What the proposal allows.** `apps` and the reading form of `call` run without asking. What
changes something needs `--write`, and the proposal holds exactly that form back under `ask`, so
Claude Code asks the human at every change. `login`, `sync` and `status` are not allowed
without asking. Measured as of 2026-09-21 with `claude -p` 2.1.278 and the proposal enrolled
through `--settings`: `apps` and a reading `call` ran without a question, `call ... --write`
was held back, with the flag at the end and in the middle. **Not measured:** the same in an
interactive session. A rule for a shell command stands with the path as it is typed: the
`//` that a rule for reading takes for an absolute path never matches a command, and the
first version of the proposal (0.24.0) carried it in its rule for the check script.

**The proposals** come from this root and from every folder of level 2, that is a folder
directly in a folder of level 1. Each has its own checksum and is approved one by one: on a
terminal the tool asks per proposal, in a script `--approve` takes the first 16 characters of
that proposal's checksum. A proposal that has changed since the approval is shown as changed,
what was approved keeps running and the new one needs the approval anew. `login` also lists
where each place lies on this computer and which ones are not here.

**The way back is through the agent.** An app gets no file access: every file in the root has a
human as its author. The agent fetches data with `call` and writes the file itself. `APP.md`
is written by the tool alone, only for assigned apps, and is overwritten by the next run. Text
in it comes from the app: the tool cuts it to one line and does not let it become a heading,
and the skill `arasul` tells the agent to read it as data. There is no MCP server before the
north goal; it would be a second cover around the same credential and can be put over this
one later.

**Give the agent the command, not the credential.** The skill `arasul` in the root tells it
the order: `apps`, read the route, `call`, and never `login`.

**The hook acts only where it should.** Enrolled, it hangs in front of the tools of every
session on the computer. So it looks at where the session started: in this root or a folder
of it it acts, in a place and anywhere else it does not. Whoever starts a session in a place
is exactly who the boundary sends people to.

**What was measured.** As of 2026-09-21, Claude Code 2.1.278, `claude -p` with a settings
file passed through `--settings`. A session started one level below the root loads the rules
of the root and its skills and agents, with and without a `.git` in the root. The tilde in
`additionalDirectories` is resolved. With consent the hook stops a write into a closed place
from the level below and from the root, by tool and by shell, and does not stop a session
started in the place itself. Without consent it does not act. **Not measured:** the same
through `~/.claude/settings.json` itself and in an interactive session, only through
`--settings`.

## Deploying the root onto the device

```
node .ara/tools/root.mjs --path <root> --deploy --client <path to opencloudcmd>
```

After that the root lives on the device. `--deploy` hands over to the bridge of the root,
`arasul.mjs deploy`, and replaces the bridge first when it is one of an older kit that knows no
`deploy`: it is a file of the kit, nothing of the house stands in it. Then, in this order:

1. **The check script runs, and a finding stops everything.** What goes onto the device goes to
   everybody who has the room, so a root with a finding does not go.
2. **The root of the device has to be one this person writes.** The device names it in its
   list of folders, level 0 with the kind `wurzel`, and the tool takes that one, under the id
   the device names. When the device names none, the tool logs in with the password, as the
   credential opens no administration, looks at the device's list of all folders and makes the
   root only when the device carries none: id `firma`, the name of the house, kind `wurzel`,
   level 0, the shape the device's front end proposes as well. Then it ends that session. When
   the device carries a root and does not list it for this person, that is said and nothing is
   made: a second root is never made. Only an administrator makes the root: an employee without
   one is told to ask an administrator. With `lesen` alone nothing is deployed: on the root,
   writing is the administrators' right, by role, and no right per person is given on it.
3. **The tree goes up through the client**, with the general list and the root's own list of
   what stays home: `.git`, `node_modules`, `.env` at every depth, what the `.gitignore` at the
   top leaves out, `.claude/hooks/`, `settings.json`, `.DS_Store`, the
   journal of the client, `apps/`, `sicht.md` and the rooms the device shares separately.
4. **The room comes down again into a throwaway folder**, and what lies there is compared with
   what was meant to go: `deploy` says how many files went, how many lie in the room and which
   ones did not arrive. The folder is removed afterwards.

The password is asked for at the terminal or comes with `--password-stdin`; so the human runs
this command themselves, like `sync`. `deploy` is not in the proposal's allow list.

**When the client says `Fatal: Authentication`**, the file service has no password for this
person, and `deploy` says so in one sentence, `sync` as well: the device mirrors a password into
the service when the password is set, so an account whose password was set before the company
folder was switched on gets in only after a password change. Measured on 2026-09-22 with a
password the service did not know.

**Who gets the root:** everybody active on the device, with `lesen`, without anybody sharing
anything. Their next `sync` lays the root at the top of their tree. Administrators have
`schreiben` by role, and their `sync` carries their changes up.

**Measured on 2026-09-22 at a device that carries its root `firma`**, from a test root with two
throwaway accounts: `--deploy` as an administrator took the root the device named, made
nothing, and the scaffold lay in the room `firma`, all 16 files, checked by the download;
afterwards the device still carried exactly one root. The second account, an employee with
`lesen` on the root by role and `schreiben` on one folder of level 2 only, put `arasul.mjs` into
an empty folder, logged in and synced: the root lay at the top, the folder of level 2 at its
place, the chain above it made locally, and `sicht.md` came from the device. Claude Code started
two levels below loaded the root's `.claude/CLAUDE.md` and its skills, and the skill `arasul`
ran `arasul.mjs apps` against the device. Making a root was measured at the kit's own mock
device only: the device's root was not thrown away for the measurement.

## The showcase

```
node .ara/tools/root.mjs --path <folder> --example
```

lays out the root of an invented company: the scaffold with two folders of level 1, and the
method with filled sheets. A north goal with three milestones, goals per place, cards in every
column, an experiment with a criterion, a customer, a template, four places of which one may
be written. The company does not exist and neither do its places. Its dates are counted from
the day of laying out, so its own check script finds nothing in it, today and in a year. Use
it when somebody asks what such a root looks like before they lay out their own.

## What the check script of a root checks

Every check stands for something that went wrong in a root like this. The rule above all:
no check that gives a false alarm on a well kept root, an alarm that is regularly wrong
stops working. Checks 2 to 4 and 6 to 9 find nothing where the method is not laid out.

| Nr | What |
| --- | --- |
| 1 | paths in backticks exist |
| 2 | no sheet under `company/` over 300 lines |
| 3 | every sheet under `company/` carries `As of:`, not older than 60 days |
| 4 | the registers keep their shape: follow-ups line by line, 50 open at most, 100 decisions at most |
| 5 | no secrets in plain text, by named fields only |
| 6 | every goal has a milestone that `company/goal.md` knows, and a deadline |
| 7 | a deadline within 14 days stands in the follow-ups |
| 8 | the card stack: mandatory fields from ready on, rank unique per place, one running card per place, a result in done, a known place |
| 9 | experiments carry an `experiment.md`, no third sublevel |
| 10 | no folder at the top without a line in the table "Where new things go" |
| 11 | places: complete, no copy in the root (also a folder of the name of a place without a local path), the rules of the proposal in step with the list |
| 12 | no empty sheet, no dead link |
| 13 | the cases of the boundary hold |
| 14 | no `settings.json` and no `settings.local.json` in the tree |
| 15 | confidential things by pattern in the root or in level 1: files of the kind `.env`, keys and credentials by name, private keys and tokens by their marker. `.env.example` is none |
| 16 | references go up: a folder of level 1 does not point at a sibling, a rule of the root does not name something inside a folder of the house. The folders of the method refer to each other by design |
| 17 | no `.git` that `places.json` does not name and no source tree (a project file such as `package.json`, or `src/` with code, or `node_modules/`) in the tree |

**Scripts are allowed everywhere and are no finding.** A single script in any folder, at any
depth, in any language: check 17 wants a project, not a script.

**What the boundary does not do** its head says itself: a hook does not see into a process.
It works against tool and shell writes, not against a script that writes. Do not sell it as
tighter than it is.
