---
name: card-stack
description: Work with the card stack of this root. Use when an idea or undertaking is to be written down, ranked, started or closed, or when somebody asks what is next.
---

# The card stack

One file per card in `roadmap/backlog/`, the folder is the state: `new/`, `ready/`,
`running/`, `done/`. `roadmap/backlog/README.md` says what each column demands.

1. **What is next:** `node .claude/scripts/cards.mjs list`. The card in front in `ready/`
   is next, per place. Nothing that does not lie in `ready/` is started.
2. **A new idea:** `node .claude/scripts/cards.mjs new --title "..." --place <place>`. It
   lands in `new/`. Do not rank it and do not fill the fields yet.
3. **Ranking it:** the fields `ref`, `rank`, `assumption` and `done` have to be filled
   before it moves to `ready/`. The riskiest assumption goes in `assumption`, and what is
   observable when it is finished goes in `done`. Ask the human for both, do not invent them.
4. **Starting:** `cards.mjs move <slug> running`. One running card per place, the script
   refuses a second.
5. **Closing:** `cards.mjs move <slug> done --result green|red|dropped`. A red or dropped
   card is a result too, and it stays.

Never move a file by hand: the script checks what the column demands and makes the move a
commit of its own.
