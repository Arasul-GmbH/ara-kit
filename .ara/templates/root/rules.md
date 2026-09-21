# {{name}}

<!-- Three sentences: what this organisation does, for whom, and who decides here.
     Replace this comment. Everything else in this file already holds. -->

This folder is the root of {{name}}. It says what is true, what is due and where things
lie. The work itself happens in the embedded places: repositories and shared folders that
this root names and never copies.

**North goal:** stands in `company/goal.md`, with date and milestones. Never from memory.

**Bottleneck:** the card stack `roadmap/backlog/`, the one work list over all places. One
card per place at a time. What does not lie as a card in `ready/` is not started.

## Where the truth stands

| When it is about | read |
| --- | --- |
| situation, goal, bottleneck, assumptions | `company/core.md`, then on from there |
| the north goal and its milestones | `company/goal.md` |
| what binds beyond the single case | `company/decisions.md` |
| dates and promises | `company/follow-ups.md` |
| which places belong to this root, where they live, who may write | `.claude/places.json` |
| what a place has to be able to do by when | `roadmap/`, one sheet per place |
| ideas and undertakings in order | `roadmap/backlog/`, one file per card, the folder is the state |
| who may read and change what in here | `.claude/settings.json`, one line per folder |
| whether this root contradicts itself | `node .claude/scripts/check.mjs` |

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
   wants to change something there starts a session there. `.claude/hooks/boundary.mjs`
   holds the boundary, its cases stand in `.claude/scripts/boundary-test.mjs`. A place
   with `write: yes` in `.claude/places.json` is exempt, by decision of the house.
4. **Goals here, implementation there.** This root lays down *what* a place has to be
   able to do by when, in its sheet under `roadmap/`, with milestone and deadline. *How*
   it is built the place decides. A goal without a milestone is an idea and belongs on a
   card in `roadmap/backlog/new/`.
5. **No maintenance run.** The history of version control is the journal, the reason
   belongs in the commit. Into `company/` goes only what binds beyond the single case.
   Nothing is written back just so that it is written.
6. **After a change the check runs.** `node .claude/scripts/check.mjs` ends without a
   finding, or the finding is fixed before the next piece of work starts.

## Where new things go

| What comes into being | where to |
| --- | --- |
| a fact about the house | `company/<topic>.md`, one topic per file, with `As of:` and `Source:` |
| a decision that binds beyond the single case | one line at the top of `company/decisions.md` |
| a date or a promise | one line in `company/follow-ups.md`, subject 80 characters at most |
| a goal for a place | `roadmap/<place>.md`, with milestone and deadline |
| an idea or an undertaking | a card in `roadmap/backlog/new/`, through `node .claude/scripts/cards.mjs new` |
| a large undertaking | several cards with a common `ref`, the rank gives the order |
| the test of an assumption | `experiments/NNN-<slug>/`, with an `experiment.md` |
| a customer file | `customers/<slug>/`, finished documents in it under `documents/` |
| a template for a paper the house sends out itself | `templates/` |
| finished and frozen | `archive/<year>/` |
| a new place | a line in `.claude/places.json`, through the kit or by hand, never a copy in here |

**A new folder at the top comes into being only with a line in this table, rights in
`.claude/settings.json` and a look at `.claude/scripts/check.mjs`.** Without that the
folder grows over again, and the check says so.
