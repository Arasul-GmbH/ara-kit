---
description: Plan an app, build it, bring it onto a device and switch it live
argument-hint: [<app>]
---

App: **$1**

Read `.ara/knowledge/app.md` and work along it. Knowledge this command loads: each file only when
its moment comes.

- `.ara/knowledge/app.md` always, the core.
- `.ara/knowledge/app-patterns.md` as soon as an idea is being formed, and the sheet of the pattern
  the plan takes, which it names.
- `.ara/knowledge/app-professional.md` before the plan of a professional app: clients or files,
  data that lasts for years, receipts the device reads, an approval without the submitter, an
  export format of another vendor.
- `.ara/knowledge/platform-services.md` as soon as the app wants something from the platform:
  login, approval, flow, reading a document.
- `.ara/knowledge/design-system.md` as soon as you touch an interface.
- `.ara/knowledge/deploy.md` as soon as a package goes to a device.

Security levels and product values: `.claude/CLAUDE.md`. Beforehand you read
`business/profile.md`: language, branch, detail level, security level, what the house works with.

**The argument.** `<app>` is the app under `apps/<app>/`; apps sit at the top, independent of
customers, and where one runs the device says. No argument: first the marker `.ara/state.json`,
then the existing folders. Exactly one, take it, otherwise ask through the interview tool.

**First, always:**

```
node .ara/tools/app.mjs --app <app>
```

It says where the app stands and what is due, with the calls. Pass that on in three lines and do the
first, instead of listing everything possible.

**No app yet**: the interview along the checklist comes before anything is created, then `--new`
and the first plan. Whatever stayed open goes into the plan as an assumption and gets read out next
time. **A plan is active**: its assumptions first, then build, then `--build`. **To a device**:
without a file under `devices/`, `/device` first; then `--check`, then `--deploy` into staging.
Before the deploy you say that the app is not yet visible, and why, as `.ara/knowledge/deploy.md`
says. `--live` is a level 2 intervention: ask, even if you deployed a minute ago. **Without Arasul**
`--compose` goes over SSH, and beforehand you say what is missing there.
