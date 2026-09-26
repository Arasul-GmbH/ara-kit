# {{name}}

<!-- Three sentences: what this organisation does, for whom, and who decides here.
     Replace this comment. Everything else in this file already holds. -->

This folder is the root of {{name}}. It says what is true and where things lie. The work
itself happens in the embedded places: repositories and shared folders that this root names
and never copies.

Start the agent here or in one of the folders directly below. It loads these rules from
both, and the skills and agents in `.claude/`.

## Where the truth stands

| When it is about | read |
| --- | --- |
| which places belong to this root, where they live, who may write | `.claude/places.json` |
| the boundary and the permission rules that are proposed | `.claude/proposal/proposal.json` |
| the skills and agents of this root | `.claude/skills/`, `.claude/agents/` |
| whether this root contradicts itself | `node .claude/scripts/check.mjs` |
| which apps a person may ask, and what each says about itself | `arasul.mjs`, and `apps/<id>/APP.md` that it writes |

**The same fact in two places is a mistake, not a backup.** What lives in a place stays
there, this root refers to it. What is business of the whole house lives here.

## Hard rules

1. **No facts from memory.** Names, prices, versions, numbers and dates come from the
   source. A mirrored value carries `As of:` and `Source:`. On a contradiction the source
   wins.
2. **Do not write down what can be derived.** The state of a repository, open pull
   requests and deadlines come into being at run time. A number that is copied is wrong
   the day after.
3. **From a session in this root nothing is written into an embedded place.** Reading is
   free. A place has its own rules, and a session in the root does not load them. Whoever
   wants to change something there starts a session there. The boundary is a proposal in
   `.claude/proposal/`. Nothing in this folder is active by itself: it takes effect only
   once a person has consented and enrolled it into their own settings. A place with
   `write: yes` in `.claude/places.json` is exempt, by decision of the house.
4. **Apps get no file access.** Every file in this root has a human as its author. What an
   app says about itself comes into `apps/<id>/APP.md` through `arasul.mjs` and by nothing
   else. The way back goes through the agent: it fetches data with `arasul.mjs call` and
   writes the file itself. Only routes that an app names for agents are called, and one that
   changes something needs `--write`.
5. **After a change the check runs.** `node .claude/scripts/check.mjs` ends without a
   finding, or the finding is fixed before the next piece of work starts.

## Where new things go

| What comes into being | where to |
| --- | --- |
| {{folder_rows}} | |
| what an app says about itself | `apps/<id>/APP.md`, written by `arasul.mjs`, never by hand |
| a new place | a line in `.claude/places.json`, never a copy in here |
| a script the house uses | anywhere it is needed, scripts are allowed everywhere |

**A new folder at the top comes into being only with a line in this table.** Without that
the folder grows over again, and the check says so. Code does not lie here: it lies in a
place, and this root refers to it.
