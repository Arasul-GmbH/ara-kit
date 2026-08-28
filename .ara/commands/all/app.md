---
description: Plan an app, build it, bring it onto a device and switch it live
argument-hint: [<app>]
---

App: **$1**

Read `.ara/knowledge/app.md` and work along it. Knowledge this command loads:
`.ara/knowledge/app.md`, `.ara/knowledge/security.md`, plus `.ara/knowledge/deploy.md`
as soon as a package goes to a device, `.ara/knowledge/platform-services.md` as soon as
the app wants something from the platform (login, permission, flow, language model),
`.ara/knowledge/extensions.md` for the first interview with a customer and
`.ara/knowledge/live-knowledge.md` for every product value. You read the profile in
`business/profile.md` beforehand: language, branch, detail level, security level, what
the house works with.

**The argument.** `urlaubsantrag` is the app under `apps/urlaubsantrag/`. Apps sit at the
top, independent of customers: the same app may run at three customers, and where it runs
the device says. No argument: first the marker `.ara/state.json`, then the existing files.
If there is exactly one, take it, otherwise ask through the interview tool.

**First, always:**

```
node .ara/tools/app.mjs --app <app>
```

The tool reads the file and says where the app stands and what is due now, with the call
for every step. Pass that on in three lines and do the first of them, instead of listing
everything that would be possible.

**If the app does not exist yet**, the interview comes before anything is created: the
checklist is in the procedure. Only after that `--new` and the first plan. Whatever stayed
open goes into the plan as an assumption and gets read out next time.

**If a plan is active**, walk through its assumptions first, then build what it says, then
`--build`. The build is the package, not the running app: what it does you see on the
device.

**If it goes to a device**, always `--check` against its contract first, then `--deploy`.
That rolls into **staging**, and there it stays until a human wanted to see it. `--live`
is a level 2 intervention: ask beforehand, even if you deployed it yourself a minute ago,
from that moment on people work with it. After that: plan into `erledigt/`, write on the
app's README, one line into the runsheet or into the customer's history.

**On a device without Arasul** `--compose` goes over SSH. Say beforehand what is missing
there, in the same words the tool prints afterwards: no login, no flow, no permission.
That is a way to demonstrate something, not one for real data.
