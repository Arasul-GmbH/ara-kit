## The method: company, roadmap, cards

An addition to the scaffold above. It brings a place for the state of the house, a goal per
place and one work list. The rules above hold without it.

**North goal:** stands in `company/goal.md`, with date and milestones. Never from memory.

**Bottleneck:** the card stack `roadmap/backlog/`, the one work list over all places. One
card per place at a time. What does not lie as a card in `ready/` is not started.

### Where the truth stands, with the method

| When it is about | read |
| --- | --- |
| situation, goal, bottleneck, assumptions | `company/core.md`, then on from there |
| the north goal and its milestones | `company/goal.md` |
| what binds beyond the single case | `company/decisions.md` |
| dates and promises | `company/follow-ups.md` |
| what a place has to be able to do by when | `roadmap/`, one sheet per place |
| ideas and undertakings in order | `roadmap/backlog/`, one file per card, the folder is the state |

### Hard rules of the method

5. **Goals here, implementation there.** This root lays down *what* a place has to be
   able to do by when, in its sheet under `roadmap/`, with milestone and deadline. *How*
   it is built the place decides. A goal without a milestone is an idea and belongs on a
   card in `roadmap/backlog/new/`.
6. **No maintenance run.** The history of version control is the journal, the reason
   belongs in the commit. Into `company/` goes only what binds beyond the single case.
   Nothing is written back just so that it is written.

### Where new things go, with the method

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
