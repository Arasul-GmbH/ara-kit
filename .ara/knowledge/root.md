# Procedure: the root of a whole house

> **When do you need this?** At `/root`: laying out a root folder for a whole organisation,
> adding a place to it, checking it, showing the showcase.

## What a root is, and what it is not

A house that works with agents over several projects has its knowledge in islands: one
repository with rules and skills, a shared folder without any, a second repository with its
own. No island knows the goal of the house, and an agent started in one of them knows nothing
of the others. A root is the one folder above them. It says **what is true, what is due and
where things lie**, and it names the places where the work happens.

**A root lies outside of the kit.** The kit is a tool and at most one of its places, not its
home. The tool refuses a path inside the kit. After laying out the root needs the kit no more:
its check script, its boundary and its card tool lie in it and run with Node alone.

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
│   ├── settings.json          Rights per folder, the places, the boundary as a hook
│   ├── places.json            The list of embedded places
│   ├── root.json              Name, language, day of laying out, version of the kit
│   ├── hooks/boundary.mjs     Nothing is written into a place out of the root
│   └── scripts/
│       ├── check.mjs          13 checks, exit code 0 means no finding
│       ├── boundary-test.mjs  The cases of the boundary
│       └── cards.mjs          The card stack: list, new, move
├── company/                   core, goal, decisions, follow-ups, assumptions, risks
├── roadmap/                   One sheet per place, plus root.md for the root itself
│   └── backlog/               new/ ready/ running/ done/, the folder is the state
├── experiments/
├── customers/
├── templates/
└── archive/
```

Folders, fields and columns are named in English in both languages, as everywhere in the
kit. The content of the sheets follows `--language`, otherwise the profile.

## The interview, in one bundle

Ask through the interview tool, everything at once, and then work through:

1. **Where** the root is to lie. A path next to the projects, not in a synced folder if it
   is to carry version control: file sync and an active `.git` do not get along.
2. **What the house is called.** That goes into the headline of the rules and the README.
3. **Which language.** Default is the profile.
4. **Which places**, and per place: a short name in lower case, `github` or `folder`, where
   it lives (address or path), where it lies on this computer if it does, what it is for,
   and whether the root may write into it. **Default is no.**

**You look before you ask.** Whether a path exists, whether it is a repository, what its
remote is called: `ls` and `git remote -v` say that, the human does not have to. You only
read. **In the places you change nothing**, not at laying out and not afterwards: no file,
no link, no configuration. That holds in particular for a house that is not the user's own.

**Why writing is closed by default.** A session in the root does not load the rules of the
place. A repository has its own `CLAUDE.md`, its skills and its hooks, a shared folder has
people working in it. Whoever wants to change something there starts a session there. The
root says *what* the place has to be able to do by when, the place decides *how*. If the
house wants it differently for a place, `write: yes` stands in the list for everybody to
read, and a line in `company/decisions.md` says why.

## Laying out

```
node .ara/tools/root.mjs --path <folder> --name "<house>" --places <file.json>
```

With one place `--place <name> --kind github|folder --where <address> [--local <path>]
[--write yes] --purpose "<what for>"` is enough. For several you write the list into a
file outside of the kit, in the temporary folder of the system, and hand it over with
`--places`:

```
[
  { "name": "api", "kind": "github", "where": "https://github.com/acme/api",
    "local": "~/Code/acme/api", "purpose": "the product" },
  { "name": "projects", "kind": "folder", "where": "https://acme.sharepoint.com/sites/projects",
    "local": "~/Library/CloudStorage/OneDrive-Acme/Projects", "purpose": "one folder per project" }
]
```

The target has to be empty or missing, the tool overwrites nothing. It lays out the tree,
writes the rights and the list, creates one sheet per place under `roadmap/`, runs the check
script of the fresh root, creates a repository with a first commit (`--no-git` leaves that
out) and says how long it took. **The check ends without a finding, or you say what it
found.** A finding in a fresh root is a fault of the scaffold, not of the human: report it
with `gh issue create` against the kit if the human agrees.

## After laying out

Say in three lines what lies where, and then the next steps the tool names: fill
`company/core.md` and `company/goal.md`, one goal per place, the first undertakings on
cards, and from then on **start the agent in the root**, not in the kit and not in a place.
Offer to fill the two sheets together right away, in a second bundle of questions: what the
house does, where it stands, the bottleneck, what is expressly not done, the north goal as
one checkable sentence, the milestones with deadlines. You write into the root only what
the human said. **No number from memory, no invented goal.**

**The first start in the root is interactive.** The agent asks once whether it trusts the
folder, and until that yes it ignores the rights the root allows. What the root forbids
holds from the first second, and so does the boundary.

```
node .ara/tools/root.mjs --path <root> --place <name> --kind ... --where ... --purpose ...
node .ara/tools/root.mjs --path <root> --show
node .ara/tools/root.mjs --path <root> --check
```

`--place` with an existing root adds a place: a line in the list, the rights, its sheet.
Rights the house entered by hand stay. `--show` names the root and its places and says which
of them lie on this computer. `--check` runs the check script of the root.

## The showcase

```
node .ara/tools/root.mjs --path <folder> --example
```

lays out the root of an invented company with filled sheets: a north goal with three
milestones, goals per place, cards in every column, an experiment with a criterion, a
customer, a template, four places of which one may be written. The company does not exist
and neither do its places. Its dates are counted from the day of laying out, so its own
check script finds nothing in it, today and in a year. Use it when somebody asks what such a
root looks like before they lay out their own.

## What the check script of a root checks

Every check stands for something that went wrong in a root like this. The rule above all:
no check that gives a false alarm on a well kept root, an alarm that is regularly wrong
stops working.

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
| 10 | no folder at the top without a line in the rules and without rights |
| 11 | places: complete, no copy in the root, rights in step with the list, the boundary hangs in front of the tools |
| 12 | no empty sheet, no dead link |
| 13 | the cases of the boundary hold |

**What the boundary does not do** its head says itself: a hook does not see into a process.
It works against tool and shell writes, not against a script that writes. Do not sell it as
tighter than it is.
