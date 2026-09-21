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
the apps" below. It carries the same approval step in a version of its own, because it runs
with Node alone, and it writes the same files: what one enters, the other takes back.

## The bridge to the apps

`arasul.mjs` lies in every root, next to `.claude/`. It runs with Node alone and comes out of
the kit like the check script. An agent in the root cannot hold a credential for a device, ask
which apps a person is assigned to or call what an app offers. This file does that, and
nothing else.

| Command | What it does |
| --- | --- |
| `login <address> --user <name>` | Logs in, then shows the proposals and the places. The password is asked for at the terminal and never shown, `--password-stdin` takes it from the first line of the input, an argument never |
| `login <address> --token-stdin` | The same with a token instead of name and password. The token is issued in the device's front end |
| `login`, `login --approve <checksum>`, `login --withdraw` | Show the proposals, approve one by its checksum, take back everything the approving entered |
| `apps` | The apps assigned to the person, with their routes. Writes `apps/<id>/APP.md` for each |
| `sync` | Writes the same files and says that the service for company knowledge is not decided yet |
| `status` | The device, the credential, whether the device accepts it, the proposals. States the same about the service |
| `call <app> <route> [name=value ...]` | Calls one route of one app and writes the answer to the standard output. `--write` for a route that changes something, `--method` where a path exists for two methods |

**The credential** lies in `~/.config/arasul/credentials.json`, mode 0600, one entry per device
with its address and token. Never in the root, never in the keychain. Until the device issues
tokens the login sends name and password to the login route, keeps the session it gets in
return and stores neither the password nor anything of it. A session has an end, and the
tool says so before it calls. A device with a certificate of its own is pinned once with
`--insecure`, which stores that certificate as the trust anchor for this one device; the check
is not switched off.

**What the tool assumes about the device** stands in one block at its head, with the date it is
from: `POST /api/auth/login`, `GET /api/auth/session` and `GET /api/apps/meine`, out of the API
reference of the product. They are statements about the product like any other, and
`check-docs.mjs` knocks at them. The route each app answers with its description is called
`agent` and lies in the app's own interface.

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
