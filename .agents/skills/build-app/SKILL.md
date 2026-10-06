---
name: build-app
description: Build an app on the device. Use when somebody wants an app, a tool, a form, an intake for receipts or documents, an approval or sign-off, a list or overview for the office, or says "build me", "bau eine App", "wir brauchen etwas für". Leads into the app procedure, the same as the command /app.
---

This is the command `/app` (under Codex `$app`), reached from free text. Do not build from here,
and not along `.ara/knowledge/extensions.md`.

Read the command's source in the profile's language and work along it, from its first call on:

- `language: en` or no profile: `.ara/commands/all/app.md`
- `language: de`: `.ara/commands/all/app.de.md`

It names the knowledge to load, the interview checklist and the first call,
`node .ara/tools/app.mjs --app <app>`. The name of the app is the argument; without one, the
command says how to find it or ask for it.
