# Procedure: the process interview and the process sheet

> **When do you need this?** At `/process`, and whenever somebody wants an app but has not said how
> the work runs today. The interview comes before `/app`: **how the work runs** first, **which
> screens** only afterwards.

## What it is, in plain words

A **process sheet** is one page in which the house says how a piece of work runs today: who does
what, when, with which paper, and where somebody says yes or no. It is not the wish for an app.
Building has become cheap, understanding the house has not, and this page is the understanding.
`/app` reads it and does not ask again what stands there.

It lies, as a Markdown file with fixed sections:

- **partner:** `customers/<customer>/processes/<id>.md`, one customer at a time (`AGENTS.md`).
- **company, or the partner's own house:** `business/processes/<id>.md`.

The id is lower case with hyphens (`leave-request`). The tool that makes, checks and reads it is
`node .ara/tools/process.mjs`, listed at the bottom.

## Who this is for

Whoever builds with this kit is mostly a tax clerk or an office manager, not a consultant. Nobody
is asked "what are your requirements". They are asked about **the last time it happened**: that
is a thing everybody can remember, and a real case holds steps nobody would think to list.
Plain language (`AGENTS.md`): a technical word gets one sentence the first time.

## Before you ask: look

Read what is there instead of asking it: `business/profile.md` (industry, tools of the house), the
customer file, a website, documents the human hands you, `process.mjs --list` for sheets that
exist. Open a sheet that exists instead of starting a second one for the same work. **One sheet is
one process**: if the human names three, write the one that hurts most first and put the others
under "Open" of it as the next ones.

## What must be clear

The rule is in `AGENTS.md`, "Every command asks to full depth". Every point below is answered, readable
from a file, or open, and **the list ends the interview, not a round**. At least three rounds
with questions unless the human wants none (see below). Each point lands in its section of the sheet.

| Point | Section | What you ask, as a draft and not as a blank |
| --- | --- | --- |
| **Which process, and what comes out** | Aim | "The last time a leave request came in: what was there at the end, and who needed it?" Drafts from the industry |
| **What sets it off, how often, who starts it** | Trigger | "A paper arrives, a date comes round, somebody asks?" and "roughly how many a week?" |
| **The steps, in order, along a real case** | Steps | "Take the last case. What was the very first thing that happened? Who touched it next?" One step is one person doing one thing |
| **Who does each step and how soon** | Steps | A role, not a name. "Within the day, or when somebody gets to it?" |
| **Which paper or file each step uses** | Steps, Papers | "What lay on the desk, or was open on the screen?" Every named paper gets a row in Papers |
| **What stands on the paper, whether it holds personal data, where it lies today** | Papers | Name personal data explicitly. "Folder in the office, mailbox, Excel file?" |
| **What the device should read off a paper itself, and what a person may still correct** | Papers | Only for a paper that is typed off or filed by hand today. Suggest the often misread details as changeable, **never all by habit** |
| **Where somebody says yes or no, who, in which cases, based on what, and what happens on no** | Decisions | "Who looks at it before it goes on? Every time, or only in some cases (above an amount, for one kind of case)? What do they look at? And if the answer is no?" A short name per stage, at most five. Nobody decides is an answer |
| **What goes wrong or deviates** | Exceptions | "The last time something did not fit the usual way: what happened?" "None known" is an answer |
| **Who may see what** | Who sees what | Everybody everything, or only their own cases, clients, departments, and who hands them out |
| **What it expressly does not cover** | Not part of it | The paragraph that saves the disappointment later |
| **What nobody could say** | Open | One line each, a place where somebody may object |

Two more points are not asked in words of "requirements" but read off the steps: **how the start
looks to the kit**, one of `hand`, `zeitplan:<five fields>`, `ereignis:<name>` (line "Starts by"
in the sheet, default `hand`), and **whether a human or a program does a step** (a step of pure
shifting of data is a program, not a flow: `/app` decides that, you only record who does what today).

## How you ask

Through the interview tool, bundled, free answer always open (persona, "How you ask"):

1. **Round 1, the case and the aim:** which process, the last real case in two sentences, what
   came out, how often, what sets it off.
2. **Round 2, the steps:** walk the case step by step. **Propose the steps you heard as finished
   rows** ("1 Clerk: types off the invoice, with the invoice, the same day; 2 Team lead: ...")
   and let the human correct, instead of asking "what are the steps?".
3. **Round 3, papers and decisions:** per paper what stands on it and where it lies, per decision
   who and based on what, and what the device could read.
4. **Round 4, around it:** exceptions, who sees what, what is not part of it, what is open.

A vague answer is probed with a draft ("somebody checks it" -> "The team lead, comparing it with
the duty roster, within three days?"). **Never guess** a step, a role or a number to close the list.

**"enough"** in the free text ends the interview at once. What is open goes under "Open" as a
line, and in the section where it belongs you write "not said, see Open" so the check finds no
hole. A price, a product value or a legal fact is not assumed.

**No questions wanted.** If the human hands over material (a description, documents, an old
process list) and says they want no questions: write the sheet from it, mark every inferred point
under "Open" with "assumed from <material>", and say it in one sentence at the start.

## Writing the sheet

```
node .ara/tools/process.mjs --new <id> [--customer <customer>] [--title "<title>"]
```

writes the scaffold. Replace every `<...>` with what the human said, in the human's words and in
the language of the house, with real umlauts. Then:

```
node .ara/tools/process.mjs --check <id> [--customer <customer>]
node .ara/tools/process.mjs --derive <id> [--customer <customer>]
```

`--check` says what is missing and where, and stops while an app cannot be derived: a step without
a person, a paper named in a step but absent from Papers, a decision after a step that does not
exist, a placeholder left over, a field list the device cannot take. Close the gaps, in the
conversation if they need an answer. `--derive` shows what the sheet gives an app: title,
one-line description, approval stages, fields to read, which may be corrected, the kind of the
flow, the trigger.

**Read it back in plain words** before you call it done, through the interview tool: "This is how
it runs: ... Is that right? What is missing?" A sheet nobody confirmed is a guess. For a partner, write
what you did into the customer's history; for a company the sheet is the record.

## Then /app

Name the next step: `/app <app>`. `/app` runs

```
node .ara/tools/app.mjs --app <app> --new --prozess <id> [--customer <customer>]
```

which takes title, description, approval stages, fields, trigger and the flow's kind from the
sheet and writes the plan prefilled: what for, who uses it, which data, the steps, the flow draft,
where a human decides, what does not belong, the assumptions (every "Open" line and every
exception). What the sheet does not say, `/app` asks: screens, forms, buttons, the three questions
on roles, outside connections and models. See `.ara/knowledge/app.md`, "A process sheet comes first".

## What you do not do

No app, no screen and no field of a form in the interview: that is `/app`. No wish put into the
process: "an app for leave" is a wish; "a clerk types the slip into a list" is the process. No
product value (a port, a model name) in a sheet: it is about the house, not the device.

## The tool

```
node .ara/tools/process.mjs --new <id> [--customer <c>] [--title "<t>"]   scaffold
node .ara/tools/process.mjs --list [--customer <c>]                      sheets, and whether /app can build from each
node .ara/tools/process.mjs --check <id> [--customer <c>] [--json]       what is missing, where
node .ara/tools/process.mjs --derive <id> [--customer <c>] [--json]      what an app takes from it
```

An `<id>` can also be a path to a file. The sheet is read in either language: its section
headings exist in English and German, the file keeps the language it was written in.
