---
name: place
description: Work with an embedded place of this root. Use when somebody asks what a place holds, how it is doing, where something lies in it, or wants to change something in it.
---

# Working with a place

A place is a GitHub repository or a foreign folder such as SharePoint. This root names it
in `.claude/places.json` and never holds a copy.

## Reading

1. Look the place up in `.claude/places.json`: where it lives, where it lies on this
   computer (`local`), what it is for, whether this root may write into it.
2. No `local`: the place is a reference only. Say so and ask the human where it lies, or
   read it through its address if a tool for that exists. Do not guess a path.
3. Read in the place itself. State, open pull requests and versions come from there at run
   time, not from this root. Whatever you say about a place carries the file or command it
   came from.
4. A long look through many files goes to the agent `place-reader`. It reads and writes
   nothing.

## Changing

1. If `write: yes` stands for the place, changing from here is a decision of the house. Say
   in the answer that you do.
2. Otherwise nothing is written into the place from this root. A session in the root does
   not load the place's own rules, and a place has its own `CLAUDE.md`, skills and hooks.
   Tell the human to start a session in the place, and say what has to happen there in a
   few sentences they can carry over.

## What does not go here

A copy of a place. The same file in two places is a mistake, not a backup, and the check
reports it. If you catch yourself copying, stop and refer instead.
