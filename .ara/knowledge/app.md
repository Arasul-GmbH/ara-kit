# Procedure: building an app, from the first question to live

> **When do you need this?** When somebody wants something the product cannot do out of the box,
> and an app on a device should come out of it. How a finished package gets onto a device stands
> in `.ara/knowledge/deploy.md`; here stands how it comes into being in the first place.

## The life cycle

An app runs in a circle, and `/app` stands at every station:

1. **Plan.** There is no file. Interview along the checklist below, then the file from the
   scaffold and a plan under `plans/offen/`.
2. **Build.** A plan is active. First go through the assumptions in it, then build, then pack the
   package.
3. **Test.** The package goes to a device and lands in staging. The person from the business side
   tries it with a real login.
4. **Live.** A human switches over. The plan moves into `erledigt/`, the app's README gets
   written on.
5. **Next.** No plan open: show the situation, interview about an extension, new plan. The circle
   starts at 1.

**Where in the circle you stand, the tool says, not you:**

```
node .ara/tools/app.mjs --app <name>
```

It reads the file and names the next steps, each with the call for it. It does not list
everything that would be possible: a list of all possibilities is a manual and not a suggestion.
Tell the human what is due, in their words, and then call what the tool named.

**It also knows what it sent to a device itself**: which version stands in staging and which is
live, per app and device, out of the marker `.ara/state.json`. If the built version is already
live, it does not suggest `--check` and `--deploy` again, but the plan and the README. The marker
is the kit's note about its own doing and not information about the device: `--status` gives
that, and it asks there.

**The argument.** `/app <app>` means the app under `apps/<app>/`. If it is
missing: first the marker `.ara/state.json`, then the existing files. If there is exactly one,
take it. Otherwise ask through the interview tool.

## The interview checklist

Asking goes on until every point is answered or explicitly left open. What stays open becomes an
**assumption** and stands as such in the plan. Ask bundled, not one by one, and read
`business/profile.md` beforehand: what the house works with belongs in the first draft.

| What | Why it decides |
| --- | --- |
| **The work step behind it** | Not the wished-for solution. "We want a bot for holidays" means: somebody reads mails and enters them into a table |
| **Who uses it** | Who sees the app the customer decides on the device. But whether it is one, ten or a hundred decides the build |
| **Which data** | What goes in, what stays, what goes out. Name personal data explicitly |
| **The steps** | The sequence from the point of view of the human in front of it, one step per line |
| **Where a flow is needed** | Where a language model really does the work. What only shifts data back and forth is a program and not a flow |
| **Where a human decides** | Every place where a run should stop and wait for an approval, and what the human has to see while doing it |
| **What does not belong to it** | The paragraph that saves the disappointment later |
| **How you see that it is finished** | One sentence you can check |
| **What happens when it is wrong once** | That decides the construction. Something that gets checked is an afternoon. Something that may never be wrong is a project |

Out of the result comes the plan:

```
node .ara/tools/app.mjs --app <name> --new --titel "<display name>"
node .ara/tools/app.mjs --app <name> --plan "<title>"
```

`--new` creates the file from the scaffold: frontend, backend, one flow with an approval step,
README, `app.json`. The appearance comes from the mirror, see below. `--plan` creates the plan
file, and you fill it in during the conversation, section by section. A plan nobody read is a
form.

## The plan

It lies under `apps/<name>/plans/` in three states, and the folder name is the state:

```
node .ara/tools/app.mjs --app <name> --plan-aktiv <file>     open becomes active
node .ara/tools/app.mjs --app <name> --plan-erledigt <file>  active becomes done
```

**At most one is active.** Two active plans mean that nobody can say any more what is currently
being built; the tool does not allow it. A plan is done only when its version stands **live**, not
when the source code is finished.

## Building

```
node .ara/tools/app.mjs --app <name> --build
```

Out of the folder comes the package under `build/`. What does not belong in it, the kit knows from
itself: plans, README and the build itself are the work on the thing, not the thing. A folder with
a build of its own gets built, and its result goes into the package; everything else moves as it
is.

**Locally the build runs, not the app.** What it does you see on the device, with a real login and
a real model. Whoever "just runs it" on their own computer has neither the one nor the other and
still believes they have seen it.

A build older than the source code does not get deployed: the tool says so and stops. Otherwise the
version from the day before yesterday would go to the device and nobody would see it.

## Onto a device with Arasul

```
node .ara/tools/app.mjs --device <device> --app <name> --check
node .ara/tools/app.mjs --device <device> --app <name> --deploy
node .ara/tools/app.mjs --device <device> --app <name> --live
```

The device's contract says what applies, and `--check` holds the manifest against it before
anything flies. **A deploy always rolls into staging**, a human switches live, and only after
asking, even if you deployed it yourself a minute ago. The procedure with everything that belongs
to it stands in `.ara/knowledge/deploy.md`.

After the switch: one line into the customer's history or into the device's runsheet, and write on
the app's README. It is the state as it is, in the words of whoever uses the app: what it can do
today, what it cannot do, what you have to know.

## Onto a device without Arasul

```
node .ara/tools/app.mjs --device <device> --app <name> --compose --port 8080
```

The files go to the device over SSH, and there Compose puts up two containers: a web server for
the frontend and one for the backend, built from the build file in the package.

**Say beforehand what is missing there**, and say it in the same words the tool prints afterwards:
no login, no flow, no permission, one slot instead of two, no key and therefore no interface from
Arasul. Whoever reaches the address and the port sees the app. That is a way to demonstrate and to
try out, not a way for an operation with real data.

That is a level 2 intervention: name intent, target and way back, have it confirmed, then call it.
The way back stands at the end of the output.

This way writes into the marker too, as `compose` and not as staging or live. Without that note
the situation said an app had gone nowhere while it was answering on the device.

## The appearance

The scaffold brings Arasul's look with it, so that an app does not stand next to the device's
interface like a foreign body. The values for that stand in `frontend/src/design.css`, and they
come **out of the mirror**: `.ara/mirror/` is the artifact that was installed with, and it holds
what applies today. If no mirror is there, the kit writes its own default in, and the file says so
in its header.

The rules next to it in `stil.css` use only the names of the tokens, not a single colour value.
Keep to that when you build something on: whatever stands as a colour in a rule falls behind at the
next version.

## What the scaffold already is

The clone brings no app. What an app looks like stands in the scaffold under
`.ara/templates/app/`, and what `--new` makes out of it runs from the first minute: an item is
filed, the backend starts the flow `freigabe`, the flow stops at its approval step, a human decides
in Arasul, and afterwards the item stands as approved or rejected, with the name of the one who
decided and the sentence the flow wrote. Without Arasul the item is accepted and stays without a
decision, and the page says so.

The interface is built from six building blocks, and they carry the names of Arasul's design
system: head, list, card, form, message, menu. In the scaffold they lie in
`frontend/src/bausteine.jsx` as small components with the rules in `stil.css`. Whoever builds
something on takes these blocks and does not write a second card next to the first. If somebody
asks what such an app looks like, create one and show it, instead of describing it:

```
node .ara/tools/app.mjs --app <name> --new
```

## What you do not do while doing this

- **No product values from your head.** Models, paths, endpoints and limits stand in the device's
  contract. That holds for an app too: ask `--contract`, do not guess.
- **Do not invent a second store.** A data folder of its own per app is not provided for on the
  device yet. What an app holds in memory is gone after a restart, and that belongs in the README
  and in the conversation, before somebody notices it.
- **No login of your own.** Who is logged in the platform says over the headers in front of the
  container. A field in a form somebody types a name into is not a login.
- **No approval the app grants itself.** It reads its state and does not decide. Deciding happens
  in Arasul, by a human to whom the app is shared.
- **Deploy nothing you have not checked.** First `--check`, then `--deploy`.

What an app gets from the platform, and how it uses it, stands in
`.ara/knowledge/platform-services.md`: login, permissions, flows, the AI interface with a key and
the way for outside tools. Read it before you rebuild something the device already brings along.
