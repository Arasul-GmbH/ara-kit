---
description: Ask how the work of a house runs, who does what, when, with which paper, and write it down as a process sheet that /app builds from
argument-hint: [<process>] (partner: <customer>/<process>)
---

Process: **$1**

Read `.ara/knowledge/process.md` and work along it. Knowledge this command loads:
`.ara/knowledge/process.md` always; `.ara/knowledge/customer-file.md` for a partner, to find the
customer's folder. You read the profile in `business/profile.md` beforehand: language, branch,
detail level, what the house works with. The command exists in both branches.

**What it is.** The interview that comes before `/app`: not "what should the app look like" but
"how does the work run today". Its result is a process sheet, one page with who does what, when,
with which paper and where somebody decides. `/app` reads it and does not ask again what stands
there. Say that in one sentence at the start, in plain words.

**The argument.** `$1` is the id of a sheet. **In the partner branch** it is `<customer>/<process>`
and the sheet lies in that customer's folder; one customer at a time, never switched silently
(`AGENTS.md`). In the company branch there are no customers, the sheet lies under
`business/processes/`. Without an argument: look first.

```
node .ara/tools/process.mjs --list [--customer <customer>]
```

A sheet that exists you open and continue, the check says what is missing. If there is none,
you ask once which process is meant and create it. **One sheet is one process.**

**Then you interview**, by the list "What must be clear" in `.ara/knowledge/process.md`: the
last real case, the steps, the papers, the decisions, what goes wrong, who sees what, what is
open. Bundled in the interview tool, with finished rows as options, never a blank "what are your
steps?". Ask about the work as it runs today, not about screens and not about an app: that is
`/app`.

**Write and prove.**

```
node .ara/tools/process.mjs --new <id> [--customer <customer>] --title "<title>"
node .ara/tools/process.mjs --check <id> [--customer <customer>]
node .ara/tools/process.mjs --derive <id> [--customer <customer>]
```

Fill the sheet with what was said, in the house's words and with real umlauts. Close every gap
`--check` names, then read the result back in plain words through the interview tool and ask what
is missing. Only a confirmed and checked sheet is done. Name the next step:
`/app <app>`, which takes the sheet with `--prozess <id>`.

**Depth.** The list "What must be clear" in `.ara/knowledge/process.md` decides when the questions end, not the end of a round. The rule is in `AGENTS.md`, "Every command asks to full depth": probe vague answers with finished drafts, "enough" in the free text ends it, the rest goes under "Open".
