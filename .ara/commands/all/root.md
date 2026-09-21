---
description: Lay out the root folder of a whole house as a scaffold. Rules, skills, agents, the folders of level 1, check script, embedded places as references. The method and the enrolment of a proposal for boundary and rights are separate steps
argument-hint: [<path>]
---

Root: **$1**

Read `.ara/knowledge/root.md` and work along it. Knowledge this command loads:
`.ara/knowledge/root.md`, plus `.ara/knowledge/security.md` for the confirmation. You read the profile in `business/profile.md`
beforehand: language, branch. The command exists in both branches.

**What it is.** A root is the one folder above the projects of a house: what is true and where
things lie. It lies outside of the kit and runs without it afterwards. Laid out without a
switch it is a scaffold: rules, skills, agents, the list of places, a check script and the
folders of level 1 that the house names. **Nothing in the tree runs by itself**, there is no
`settings.json` and no active hook. The places where the work happens, GitHub repositories and
foreign folders such as SharePoint, are referred to and never copied.

**First you look, then you ask once.** Does `$1` exist, is it empty, is it a root already:

```
node .ara/tools/root.mjs --path <path> --show
```

If it is a root, say what stands there and ask what is due: add a place, add the method, enrol
the proposal, check it. If not, ask through the interview tool in one bundle: where, what the
house is called, which language, **the folders of level 1** (the house names them, you suggest
none), which places with kind, address, local path, purpose and whether the root may write into
them (default is no), and whether the method is wanted as an addition (default is no). What
you can find out yourself, a path, a remote, you look up instead of asking. **In the places you
only read.**

**Then the tool lays out:**

```
node .ara/tools/root.mjs --path <path> --name "<house>" --folders "<a,b=what for>" --places <file.json> [--method]
```

The bundle of questions is the confirmation, so it names the three things: the intent is a
new root, the target is the one folder that is empty or missing and nothing outside of it,
the way back is deleting that folder. The list of places for `--places` you write into the
temporary folder of the system, not into the kit. Read out what the tool says: the places, the
result of the check script, the duration. A finding in a fresh root you name, you do not talk
it away. An unknown switch stops the tool, and you say which one.

**The proposal for boundary and rights** lies in `.claude/proposal/` and does nothing until
the human consents. Offer the step, do not do it unasked: `--enroll` shows what would go into
their own settings and the checksum, you put that text to them through the interview tool, and
only their yes lets you run `--enroll --consent <checksum>`. The way back is `--unenroll`.
Details in the procedure.

**After that** offer to write the three sentences at the top of `.claude/CLAUDE.md` together,
and with the method `company/core.md` and `company/goal.md`, in a second bundle of questions,
and write only what the human said. Then name the step that counts: from now on the agent
starts in the root or in a folder of level 1.

**Somebody only wants to see one:** `node .ara/tools/root.mjs --path <folder> --example`
lays out the showcase, an invented company with the method and filled sheets.
