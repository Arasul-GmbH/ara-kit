# Procedure: /init

> **When do you need this?** At `/init`. If `business/profile.md` is missing, it is the first time,
> and the long part applies: the onboarding in ten rounds. If the file exists, the short part at the
> end applies: bring the kit up to date, offer commands, complete the profile.
>
> **Knowledge for it:** `.ara/knowledge/security.md` for the three levels in round 5,
> `.ara/knowledge/browser.md` for round 8. Nothing else, the rest stands here.

## The first time

### Goal

After `/init` this holds: the kit knows who works with it, what they can do, what their house works
with and what they intend. The computer can do what it has to. The commands for their branch are in
place. There is a concrete next step.

The profile is the context every other command reads. What stands here never has to be asked again.
Reckon with a good half hour.

**No token, no account.** The onboarding needs no token and no portal. That is only asked for when
Arasul gets installed on a device, see `.ara/knowledge/device.md`. Whoever already has one can store
it with `node .ara/tools/secrets.mjs --set ARASUL_TOKEN`, that is not a round here.

### Three rules that carry this procedure

**1. Write the files in `business/` to the human, not about them.**
They belong to them. So "You want to be kept brief", not "Kolja wants to be kept brief" or "he can
read it up in the runsheet". Notes about the human in the third person are a mistake, even when they
are true.

**2. Let nothing slip through silently.**
If somebody skips a round, that is fine, but it gets named at the end, with the consequence:
"Without an hourly rate I cannot calculate anything." A kit that is half set up and acts as if
everything were finished shows up at the first customer conversation.

**3. Every round is one bundled question in the interview tool.** With one open option per question.
What the human writes there freely holds.

### The second way: the answer file

Whoever would rather not click fills in an answer file and hands it over: `/init <file>`. Then there
is no interview, and you call:

```
node .ara/tools/init.mjs --answers <file>
```

The tool writes `business/profile.md`, for partners `business/company.md`, enters the technical state
and creates the commands. Examples with all fields, in both branches:
`.ara/templates/init-answers-partner.json` and `.ara/templates/init-answers-company.json`. What the
tool cannot do it says at the end: secret store, SSH key, backup stay manual work. After that
continue at round 10, the closing applies here too.

### Beforehand

If `business/profile.md` already exists, the onboarding has run. Then the part "Every further time"
below applies. `node .ara/tools/init.mjs --show` says in three lines what is stored and what is
missing.

### Round 1: technical check, without asking

```
node .ara/tools/check-environment.mjs
```

Reports operating system, Node, git, ssh, existing SSH keys, free disk space and whether the computer
is fit for flashing embedded devices.

Say in two or three lines what that means. Fix silently what you are allowed to fix. If something
fundamental is missing, name the installation route for the recognised system and carry on.

Remember the result, it goes into `business/profile.md` in round 10.

### Round 2: language and branch

The first round with questions, and it asks two. Both decide what the kit looks like, and both belong
in the same bundled question.

**1. English or German?** English is the kit's main language, German is equivalent and complete: the
same commands, the same knowledge, the same tools. What is chosen is which language Ara speaks and
writes in and which the tools print in. **The contract paperwork under `.ara/vorlagen/` and the
Nachweise stay German**, in both cases: it is legally binding text for the DACH market. Say that
alongside, otherwise somebody expects an English offer.

Until this question is answered English applies, because a fresh clone has no profile. If the human
addressed you in German of their own accord, ask in German: what they write beats the default.

**2. Partner or company?** A partner sets up devices for other people's customers, several. A company
runs a device of its own for its own firm. Say in one sentence per option what it means: partners get
customer files, offers and calculation on top. Companies get only what an own device needs, and are
never asked about customers.

As soon as both are answered, you create the commands, so that everything else already works in this
session:

```
node .ara/tools/commands.mjs --apply --role <partner|company> --language <de|en>
```

`--language` stands there because the profile is not written yet: otherwise the tool reads the
language there. Partners get `all/` and `partner/` from `.ara/commands/`, companies only `all/`. If
Claude Code does not know a command yet, restarting the session helps.

From now on you speak the chosen language. `language` goes into the frontmatter, and out of that
field every tool reads which language it prints in.

### Round 3: who you are and what you can do

Bundled:

1. **Name** and how you should address them (first name? surname? something else?).
2. **Company and region.**
3. **Strengths**, multiple choice: software development, administration, the business side (you know
   the processes in the house), sales. How much every command explains follows from that: whoever
   builds containers needs no explanation of what a container is. Whoever knows the business side
   gets the business questions first with an app.

From now on you address them the way they said. `skills` goes into the frontmatter as a list
(`development, administration, domain, sales`), the prose into the section "Who I am and what I can
do".

### Round 4: what your house works with

For a company that is the list of what apps will dock onto later. For a partner it is the stack they
know at customers. Ask per area what is in use today, and allow free text:

- Accounting and invoicing
- CRM or customer list
- Ticketing or tasks
- File storage
- Communication (mail, chat)
- ERP or industry software

**Partners only, in the same round:** which tool do you write invoices with, and should the kit be
able to produce invoices? Three answers: yes, no, later. With no and later the invoice command stays
away, with later the next `/init` asks again. Plus one sentence on the electronic invoicing duty:
receiving is mandatory for the customer since 2025, issuing comes in stages from 2027. Into the
frontmatter: `invoice` and `invoice_tool`. With yes the kit creates `/invoice`: invoice as a ZUGFeRD
PDF, with a number range of its own in `business/`. What belongs to it and what expressly does not
stands in `.ara/knowledge/invoicing.md`.

Answers into `tools` in the frontmatter (comma separated) and in prose into "What my house works
with".

### Round 5: how you work

1. **Experience:** set up Linux servers, worked with SSH, installed hardware at a customer? An honest
   answer helps, it is not about judgement.
2. **Depth of explanation:** low, medium or high. Steers your tone from now on.
3. **Security level:** explain the three levels in four lines (`.ara/knowledge/security.md`) and have
   the default confirmed. Whoever wants to relax it can, and then you record **what exactly** was
   relaxed and since when.

### Round 6: what you intend

This round is the reason the kit makes usable suggestions later. The questions hang on the branch:

**Partner:**

1. Main or side business? Somebody with two customers on the side needs something different from
   somebody who lives off it.
2. How many customers do you have in mind, over what period?
3. Which industries do you have in view or already look after?
4. What is your bottleneck: finding customers, technology, time?

**Company:**

1. What should the device be there for: search in your own documents, processes in the house,
   assistance for individual departments?
2. Who should use it, which departments first?
3. What is your bottleneck: time, knowledge about Linux, backing in the house?

Answers in prose into "What I intend". Not as a bullet list of the questions, but as a connected
paragraph addressed to them.

### Round 7: business details

Partner role only. In company mode skip it without mentioning it.

Legal name, address, phone, mail, website, tax number, VAT ID, bank details, logo path, hourly rate,
markup on hardware, payment terms. Into `business/company.md`.

**Say beforehand what that is for**, otherwise it feels like a form:

> I need this to calculate and write offers for you. Without an hourly rate I cannot calculate
> anything, without an address I cannot produce an offer. What you do not have at hand now we catch up
> on later.

**The remaining prices are not asked for here.** A complete offer needs ten numbers, three of them
stand there now. The other seven, among them the three purchase prices, `/calculation` fetches, and
for one reason: the purchase prices are Arasul's numbers, they change, and in an onboarding that
happens exactly once they would quietly go stale. Say that in one sentence and name `/calculation` as
the next step when offers are coming up.

### Round 8: access and tools

1. **Where should secrets lie?** Two possibilities, briefly explained:
   - **`.env` file in the kit**: visible, easy to back up, lies in the kit folder.
   - **The operating system's keychain**: stored encrypted, cannot be copied along by accident, but
     less tangible.

   Check beforehand with `node .ara/tools/secrets.mjs --show` whether the keychain is usable here at
   all, and offer only what works. Without a clear preference: `.env`. Set it with
   `node .ara/tools/secrets.mjs --store <env|keychain>`.

2. **SSH key.** From round 1 you know which ones exist.
   - None there: offer to create one (Ed25519, with a passphrase, stays in `~/.ssh`).
   - Several there: **ask which one is meant for devices**: do not pick it yourself. A key that is
     already used elsewhere is a deliberate decision.
   - Only the **name** goes into the profile, never the key itself.

3. **Browser.** The kit brings one along, so that you can operate web interfaces yourself: check a
   device's dashboard, test the chat with a real question, take screenshots for the handover. It
   starts by itself on first access. Explain that in two sentences and ask whether that is all right.
   Whoever does not want it says so once, `browser: no` in the profile, and you do not ask again.
   Procedure: `.ara/knowledge/browser.md`

4. **GitHub.** Check with `gh auth status` whether the command line is logged in. With it you can
   later set up the backup, version extensions and send feedback to the kit. If it is not logged in,
   name the login command and let them run it themselves. Without GitHub everything else still works.

### Round 9: backup and first device

1. **Backup.** `business/`, `customers/`, `devices/` and `apps/` deliberately lie outside the kit
   repo, so an update cannot touch them. But that also means they have no history. Ask whether the kit
   should be backed up, and offer to set up a private repository of its own for it. **One repository,
   not several.** If yes: where, GitHub or elsewhere. Set it up and explain in two lines how backing
   up works. Into the profile: `backup_repo`.

2. **First device.**
   - **Partner:** are you setting up a device of your own, to demonstrate or to practise, or are you
     starting straight with customer devices? If yes: which model, is it already there or is it on
     order? An own device gets its place under `devices/<device>/`, not under `customers/`: a dummy
     customer for it falsifies every evaluation. The name here is usually the model, customer devices
     are named after the location (`.ara/knowledge/device.md`).
   - **Company:** here the own device is the normal case. Which model, is it already there or is it on
     order?

   If the device is not there yet, create nothing now. Into the profile: `first_device` and
   `first_device_state` (`present`, `ordered`, `none`).

3. **First app**, one sentence: what should it do, for whom? It does not have to be anything finished,
   "holiday request with approval by the foreman" is enough. With that the app command has a start
   later. Whoever has no idea yet says so, and it stays empty. Into the profile: `first_app`.

### Round 10: write the profile, confirm, close honestly

Now create `business/profile.md` from `.ara/templates/profile.md` and fill it in: frontmatter
complete, `language` from round 2, prose sections **addressed to them**, technical state from round 1
with a date. Partners plus `business/company.md` from `.ara/templates/company.md`. Both scaffolds
exist in both languages: with `.de` they are German, and those are the ones you take when German was
chosen in round 2.

Read the two or three most important points out to them ("This is how I work with you from now on")
and have them confirmed. What is not right gets corrected right away.

Then `node .ara/tools/init.mjs --show`: the tool names what is missing and what is therefore not
possible. What is missing from the calculation sheet you read off with
`node .ara/tools/calculation.mjs`, instead of listing it from your head.

At the end, short and without sugar-coating:

- what is set up (two lines)
- **what is missing and what is therefore not possible**: concretely, not "some things are still
  missing"
- the next sensible step:
  - **Partner with a concrete customer:** `/customer <name>`. The best closing, they see straight away
    how the kit feels.
  - **Own device is there:** `/device <device>`.
  - **Device on order:** say what can be prepared until then.
  - **None of that:** say what would make sense next.

Example:

> Set up: profile, security level, SSH key, commands for the partner branch.
> Missing: hourly rate (without it no calculation) and the decision on invoicing (as long as that is
> open, no invoice command).
> Next step: create your first customer with /customer.

No summary of the whole conversation. No enthusiasm.

## Every further time

`business/profile.md` exists. Then it is not about the human but about the version of the kit. Seven
steps, in this order:

1. **Say what they are sitting on.** `node .ara/tools/init.mjs --show` begins with three statements:
   the version from `.ara/VERSION`, what is new in this version, and up to which contract version this
   kit works together with a device. Pass them on in two sentences before anything gets fetched. The
   compatibility is a statement about the kit, not about a device: which version a device carries its
   contract says.
2. **Look.** `node .ara/tools/update.mjs --check` fetches the version from the Arasul repo and shows
   per file what would be new, changed or removed. It names the version it would go to, and out of the
   change list `.ara/CHANGELOG.md` every point that has been added since their own. Nothing new: one
   line, done. That also runs in a fork without an upstream remote, the source is an archive.
3. **Deploy**, with a confirmation. `node .ara/tools/update.mjs` replaces `.ara/` and the minimum of
   `.claude/` (`CLAUDE.md`, `settings.json`, `skills/`, `commands/init.md`). `business/`, `customers/`,
   `devices/`, `apps/`, the mirror, the marker `.ara/state.json` and the generated commands stay as
   they are. Whoever keeps the kit in git sees the change in `git status` afterwards and commits it.
4. **Pull the commands along.** `node .ara/tools/commands.mjs` shows, for the branch from the profile,
   one of five states per command. The tool remembers the hash of the source when creating it and
   therefore knows who changed it:

   | State | What it means | What you do |
   |---|---|---|
   | missing | new in the kit or never created | offer it, create with `--apply` |
   | newer in kit | source changed, copy untouched | show the difference, replace with `--apply` |
   | adapted | the human changed the copy themselves | stays, only on request `--replace <name>` |
   | both | kit newer **and** changed themselves | show the difference, they decide, `--replace <name>` |
   | unclear | copy from the time before the marker | like "newer in kit", compare first |
   | retired | renamed in the kit, the old copy still lies there | `--apply` clears the unchanged one away, an adapted one stays |

   Before every replacement show the difference (`diff`). What lies in the target and does not come
   from the kit stays.

   **A retired command is the only case in which the tool deletes something.** `/angebot` has been
   called `/offer` since phase E6, `/kalkulation` has been called `/calculation` since phase E10. If
   both stayed, the old one would keep leading through a procedure that no longer exists. Only the
   unchanged copy gets deleted, recognisable by the remembered hash; one the human has touched gets
   named and stays. Tell them in that case what the command is called today, and that they may delete
   the old one themselves.
5. **Switch the language**, if the human wants that. `language` in `business/profile.md` to `de` or
   `en`, then `node .ara/tools/commands.mjs --apply`. After that the tool shows every command as
   "newer in kit", because its source has become a different file. That is not a fault, say it
   alongside. You do not switch unasked.
6. **Complete the profile**, only where it has gaps. `node .ara/tools/init.mjs --show` names the empty
   fields. If a new command needs a detail that is missing from the profile, ask exactly that,
   bundled. If a partner has `invoice: later`, ask again. Do not repeat the whole onboarding.
7. **Prove it.** `node .ara/tools/selftest.mjs`. Only when it runs through is the new version proven
   on this computer. If a device with Arasul is reachable,
   `node .ara/tools/check-docs.mjs --device <device>` belongs to it: it holds every route that stands
   in the knowledge against this device's contract. A new version of the kit at an old device is
   exactly the case in which that should show up.
