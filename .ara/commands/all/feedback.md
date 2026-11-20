---
description: Fetch the feedback on an app from the device, order it, spot duplicates, propose an order and, once released, implement it in the test version, never live
argument-hint: [<app>]
---

App: **$1**

Read `.ara/knowledge/feedback.md` and work along it. Knowledge this command loads:
`.ara/knowledge/feedback.md` always; `.ara/knowledge/nachweis.md` only once you implement;
`.ara/knowledge/app.md` only for the steps plan, build and rollout that stand there. You read the
profile in `business/profile.md` beforehand: language, branch, detail level. The command exists in
both branches.

**What it is.** Staff report through the icon above every app what is missing or wrong. This
command fetches the open items of one app into the session, orders them, spots duplicates and
proposes an order. The human releases what gets done; only the test version changes, through the
fixed procedure with plan, tests and evidence. **This command never switches live.** Say that at the
start in two sentences, in plain words.

**The argument.** `$1` is the app's id as in `app.json`. Without an argument: look (`ls apps/`,
`.ara/state.json`) and ask once with the apps as options. The device comes from the device file;
with several you ask.

**Fetch.**

```
node .ara/tools/feedback.mjs --device <device> --app <app>
```

If the feedback key is missing, the tool says so; create it only after a confirmation (`--key`).
Say once whether screenshots of this app go to the agent; if not, you work without an image and do
not ask for one.

**Order and ask**, by the list "What must be clear" in `.ara/knowledge/feedback.md`: read every
item yourself, group them into topics, per topic kind, the change in one sentence and size; then
one question per topic in the interview tool with finished drafts (implement with the sentence,
reject with the reason, later). The decision read back is the release.

**Implement.** `--set <numbers> --to angenommen`, then plan, build with tests and `--deploy` into
staging as with `/app`, then `--set <numbers> --to umgesetzt`. Rejected ones with `--to abgelehnt
--reason "<sentence>"`. No `--live`, no `--back`. At the end: what stands in the test version,
where to look at it, which numbers stay open, and that the human switches live themselves.

**Depth.** The list "What must be clear" in `.ara/knowledge/feedback.md` decides when the questions end, not the end of a round. The rule is in `AGENTS.md`, "Every command asks to full depth": probe vague answers with finished drafts, "enough" in the free text ends it, what is undecided stays `neu`.
