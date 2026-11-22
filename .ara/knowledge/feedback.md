# Procedure: putting the feedback on an app into practice

> **When do you need this?** For `/feedback`, and whenever somebody says "what have people
> reported?", "look at what came in for the receipts app" or "work through the feedback".

## What it is, in plain words

Above every app on a device with Arasul sits a small icon at the top right. With it a member of
staff says in free words what is missing or wrong, and marks the spot on a screenshot. That is a
**feedback item** (in short: an item). The device itself adds app, page, person and time. Only the
developer may read the items, the person who builds the apps in the firm. The member of staff sees
their item with its state in the Werkstatt (the workshop of the device) under "My reports"; nothing
is sent to them.

`/feedback` fetches the open items of one app into this session, orders them, spots duplicates and
proposes an order. **The human decides** what gets done. Changes go only into the **test
version**: the second version every app has on the device, which only chosen people see before it
applies to everybody. **This command never switches live**; the human does that once they have
looked at the test version.

Every item has a state on the device: `neu` (new), `angenommen` (accepted), `umgesetzt`
(implemented) or `abgelehnt` (rejected). The device names them in German, and the tool takes them
as they are. The command sets them along, so the developer and the member of staff see in the Werkstatt what became of each.

## The rules that never fall

1. **Nothing changes without the human.** You propose, they release. An item they said nothing
   about stays `neu`.
2. **Only the test version, only through the fixed procedure.** Every change goes through plan,
   build with tests and rollout into staging, as with `/app` (`.ara/knowledge/nachweis.md`). No file
   by hand onto the device, no `--live`, no `--back` from this command.
3. **Images only with permission.** Whether screenshots go to the agent is set by the administrator
   per app on the device, off by default. If it is off, you work without an image and say so once at
   the start. You do not ask for the image and do not guess what is on it.
4. **Rejected only with a reason.** One sentence the developer still understands in half a year.
5. **Implemented only after the rollout.** The tool sets `umgesetzt` only if this kit rolled the app
   into staging on this device after the item was accepted.
6. **Names stay in the conversation.** The items carry names of staff. You write them into no plan,
   no commit and no file of the app; the plan carries the number of the item.

## Before you start: look

- **Which device:** `node .ara/tools/device.mjs` lists the files. With a single device you take it.
- **Which app:** the argument, otherwise `ls apps/` and the marker in `.ara/state.json` (which app
  last went where). With several, you ask once with the apps as options.
- **The key:** the kit reads items with a key of its own, not the deploy key; items carry names,
  and whoever may deploy shall not read them. If the device file has no `feedback_key_ref`, you
  create it after a confirmation (change on the device, way back: `--revoke-key`):

  ```
  node .ara/tools/feedback.mjs --device <device> --key
  node .ara/tools/feedback.mjs --device <device> --key --via https --password-ref <NAME> --login-user <account>
  ```

  The first way goes over SSH and the device's script, the second over an account with the role
  admin, without SSH. The kit reads the key's scope from the device's contract, so it needs the
  deploy key already (`device.mjs --deploy-key`).
- **The app on this computer:** you can only change what lies here as `apps/<app>/` and was built
  with the kit. If the folder is missing, say so before the first question: reading, ordering and
  rejecting work, implementing does not. Then you accept no item nobody can implement.

## Fetching the items

```
node .ara/tools/feedback.mjs --device <device> --app <app>
node .ara/tools/feedback.mjs --device <device> --app <app> --json
```

Without a switch the open ones come (`neu` and `angenommen`), oldest first, already put into an
order: bugs first, then unclear ones, then wishes; within that first what several people reported,
then what came from the live version, then the older. Items that sound alike stand together as
"probably the same as". **That is a sorting by words, nothing more.** You read every text yourself
and reorder where it is off. `--all` shows finished ones too, `--reported-in test` only what came
from staging.

The first line says whether screenshots of this app go to the agent. **If it is off**, you tell the
human in one sentence: "The administrator has not released images for this app, I work with text,
page and app." **If it is on** and a text alone is not enough, you fetch the image:

```
node .ara/tools/feedback.mjs --device <device> --app <app> --image <nr>
```

It then lies under `apps/<app>/.rueckmeldungen/<nr>.png`, goes into no package, and you delete it
once the item is done. It can show names and amounts from the app.

## Ordering and proposing

Read every item and turn them into **topics**: one per thing to do, with all the numbers that mean
the same. Per topic you note:

- **Kind:** bug (something does not work as it should), wish (something is missing) or unclear (you
  do not understand what is meant).
- **What you would change**, in one sentence for somebody who never built software: "On the overview
  a month selector above the list, preset to the current month." For a bug, first whether you find
  it in the source (read `apps/<app>/`, run the tests).
- **Whether it already exists:** if what is wanted is already there, that is a reason to reject,
  with the way to it ("Exists already: filter top right").
- **How big:** small (one place), medium (one screen), large (a new process, then it is a plan of
  its own with `/app`, not a topic of this round).

You propose the order: bugs before wishes, what hits many before single cases, small things that
bring a lot early. What breaks a rule of the house or of the platform (an app that should read a
foreign database, say) you do not propose for implementing, but for rejecting, with the reason.

## What must be clear

The rule is in `AGENTS.md`, "Every command asks to full depth". Every point is answered, readable
from a file or from the device, or open. The list ends the questions, not a round.

- **Which device and which app**, and whether the app lies here as `apps/<app>/`.
- **Whether a feedback key is there**, or the confirmation to create it.
- **Whether images are allowed for this app**: read from the device and said once, never asked.
- **Per topic the decision:** implement, reject or later (stays `neu`).
- **Per topic to implement, what exactly changes**, proposed as a draft and confirmed: screen,
  field, button, text. For an unclear topic a draft of what might be meant, or "later, ask the
  member of staff" if none holds.
- **Per topic to reject, the reason**, proposed as a sentence and confirmed.
- **The order** of the topics that get implemented.
- **That the human switches live**: said, not asked.

## How you ask

Through the interview tool, bundled, with the free answer always open (persona, "How you ask").
**One question per topic**, up to four at once under Claude Code, up to three under Codex; more
topics go into the next round. The options are finished drafts:

- "Implement: month selector above the list, preset to the current month (items 1 to 4)"
- "Reject: exists already, filter top right"
- "Later, stays open"

For a bug whose cause you found, it stands next to it in half a sentence. A round after that reads
the decisions back ("I accept 1 to 4 and implement them in the test version, I reject 5 with this
reason, 6 stays open. Does that fit?"). **This confirmation is the release for the change on the
device:** it names what changes (state of the items, test version of the app), where (this device,
this app) and the way back (state back to `neu`, the previous version stays live).

**"enough"** in the free text ends the questions: what is not decided stays `neu`, and you say which
numbers those are. **No questions wanted:** you implement nothing and accept nothing, you show the
ordered overview with your proposals and stop there. Without a release this command changes nothing.

## Implementing

1. **Accept**, once released:

   ```
   node .ara/tools/feedback.mjs --device <device> --app <app> --set 1,2,3,4 --to angenommen
   ```

2. **Reject**, with the confirmed reason:

   ```
   node .ara/tools/feedback.mjs --device <device> --app <app> --set 5 --to abgelehnt --reason "Exists already: filter top right."
   ```

3. **Change through the fixed procedure**, as with `/app`: a plan that names the accepted numbers
   and per topic the confirmed sentence (no names), then set it active, change, build, roll out.

   ```
   node .ara/tools/app.mjs --app <app> --plan "Feedback 1 to 4"
   node .ara/tools/app.mjs --app <app> --plan-aktiv <file>
   node .ara/tools/app.mjs --app <app> --build
   node .ara/tools/app.mjs --app <app> --device <device> --check
   node .ara/tools/app.mjs --app <app> --device <device> --deploy --aenderungstext "<what is new>"
   ```

   A bug gets a test that shows it before and no longer after. The building blocks of the library
   stay as `/app` demands them. If a test is red, nothing goes out, and the item stays `angenommen`.

4. **Set implemented**, after the rollout into staging succeeded:

   ```
   node .ara/tools/feedback.mjs --device <device> --app <app> --set 1,2,3,4 --to umgesetzt
   ```

   The tool refuses if the rollout is older than the acceptance.

5. **Close:** you say what now stands in the test version and where to look at it, which numbers are
   implemented, rejected and open, and **that the human switches live themselves** once they have
   looked at the test version. Images fetched under `apps/<app>/.rueckmeldungen/` you delete.

The tool writes every state it sets, with the time, into the device file. The app's plan says what
was changed; the evidence in the package says it went through the procedure.

## When something does not work

| What the tool says | What it means | What you do |
|---|---|---|
| No feedback key is stored | There is none for this device yet | Have it confirmed, then `--key` |
| Refuses the key (401) | It was revoked on the device or has expired | Create a new one with `--key` |
| Refuses (403) | The key lacks the scope, or it belongs to another app | Create a new one with `--key`, do not take the deploy key |
| Does not know this (404) | The app does not exist on this device, or the number does not | Check the id in `app.json`, `--all` shows every number |
| Wants a break (429) | Too many calls in one minute | Wait the time named, do not ask in a loop |
| Names no feedback in its contract | The platform is older than the interface | First `/maintain` and an update of the device |
| Images not allowed | The administrator has not released them for this app | Work without an image; only the administrator can release them on the device |

## What you do not do

- Switch no app live and none back, not even "just briefly".
- Accept no item nobody can implement, reject none without a release.
- Set no state to get a list empty.
- No names from items in plan, code, commit or file.
- Do not flip the switch for images and do not ask for it to be flipped. That is the
  administrator's decision, and it has a reason (personal data on the image).

## Claude Code and Codex

The same procedure, the same tools. Under Codex the command is called `$feedback`, and the
interview tool takes at most three questions with three options each; the same topics then go
over more rounds. Claude Code reads the images with its tool for reading files, Codex with its
image viewer; both only from `apps/<app>/.rueckmeldungen/`.
