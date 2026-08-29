---
description: Set up the kit or bring it up to date
argument-hint: [answer file]
---

This is the one command that exists before there is a profile, so it is the one that is
always English. Read `business/profile.md` if it is there: `language` says whether you
speak English or German from here on. If it is not there, this is the first time, and the
language is the first thing you ask.

Read `.ara/persona/ara.md` first, then `.ara/knowledge/init.md`, and work along the
procedure there. In German, read the `.de.md` next to each of them. Knowledge this command
loads: `.ara/knowledge/init.md`, plus `.ara/knowledge/security.md` for the security levels
and `.ara/knowledge/browser.md` for the browser. Nothing else.

There are three ways, and which one applies a file and the argument decide:

**An argument is there (`$1`): an answer file, no interview.**

```
node .ara/tools/init.mjs --answers $1
```

The tool writes the profile, creates the commands of the branch and says what is missing.
You report the result and name the next step, nothing more. Examples for the file:
`.ara/templates/init-answers-partner.json`, `init-answers-company.json`.

**`business/profile.md` is missing: the first time.** Interview along the procedure, ten
rounds, each one bundled in the interview tool. The first round with questions asks two
things at once: the language, and the fork between partner and company. As soon as both
are answered, you create the commands:

```
node .ara/tools/commands.mjs --apply --role <partner|company> --language <de|en>
```

`--language` stands there because the profile does not exist yet; from then on the tools
read it from the profile.

No token, no account: the onboarding needs neither.

**`business/profile.md` exists: every further time.** Then it is about the version of the
kit, not about the human.

1. `node .ara/tools/init.mjs --show` names the version of the kit first, what is new about
   it and up to which contract version it works together with a device. Pass that on in two
   sentences.
2. `node .ara/tools/update.mjs --check` shows what would change, and names the version it
   would go to. Nothing new: say so in one line and stop.
3. If there is something new, show the list and have the deployment confirmed. Then
   `node .ara/tools/update.mjs`. It replaces only `.ara/` and the minimum of `.claude/`, it
   does not touch your folders.
4. `node .ara/tools/commands.mjs` shows per command whether it is missing, newer in the
   kit, adapted by hand or both. Missing and newer in the kit: show the difference, then
   `node .ara/tools/commands.mjs --apply`. Adapted ones stay, unless the human wants the
   kit's version: `--replace <name>`.
5. `node .ara/tools/marken.mjs` says whether the design system's mirror still stands at its
   source. Apps that are behind: `--sync`, and afterwards they have to be built and
   deployed anew.
6. If the human wants a different language, set `language` in `business/profile.md` and run
   `--apply` again. Every command then shows as "newer in kit", because its source has
   become a different file. Do not switch unasked.
7. `node .ara/tools/init.mjs --show` also names the gaps in the profile. If something is
   missing that a new command needs, ask exactly that, not the whole profile again.
8. `node .ara/tools/selftest.mjs`, so that the new version demonstrably runs on this
   computer.

Briefly on stance: do as much as possible yourself, check instead of asking, and put
questions bundled into the interview tool, not one after another.
