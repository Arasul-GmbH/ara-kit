# Backlog

One file per card, **the folder is the state**. The one work list over all places.

| Folder | Meaning | Rule |
| --- | --- | --- |
| `new/` | come in, not ranked yet | `ref` may be `open` |
| `ready/` | ranked, can be started | `ref`, `rank`, `assumption` and `done` are mandatory, `rank` is unique per place |
| `running/` | somebody works on it | exactly one card per place |
| `done/` | finished or dropped, frozen | last line `Result: green`, `red` or `dropped` |

Creating and moving goes through `node .claude/scripts/cards.mjs`. In a git repository
every move is a commit of its own.

**Pictures as evidence** lie in a folder next to the card with the same name,
`done/<slug>/`, flat. The card names them under `Evidence:`.

**A large undertaking** is several cards with a common `ref`, the rank gives the order.
Every card has its own `done`.

## Head of a card

```
---
title: one sentence, what it would be
place: a name out of .claude/places.json, or root
ref: a milestone, a goal, an experiment, or open
rank: whole number, small is in front, unique per place
assumption: the riskiest assumption that has to be true for it to be worth it
done: what is observable when it is finished
created: YYYY-MM-DD
source: where the card comes from
---
```

Below that freely: what carries it, what speaks against it, condition for the start.
