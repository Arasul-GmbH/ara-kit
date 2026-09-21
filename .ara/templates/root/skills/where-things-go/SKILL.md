---
name: where-things-go
description: Decide where something new belongs in this root. Use when a file, a note, a folder or a place is about to be created and it is not clear where it goes.
---

# Where something new goes

1. Read the table "Where new things go" in `.claude/CLAUDE.md`. It is the only answer. Do
   not rely on what other roots do.
2. One line fits: put it there, in one file per topic.
3. No line fits: do not create a folder at the top on your own. Say what is missing, and
   propose a line for the table and a name for the folder. The human decides, and then the
   folder and the line come into being together. Without the line the check reports the
   folder.
4. It is code: it does not belong in this root at all. It belongs in a place. Name the
   place, or ask whether one has to be entered in `.claude/places.json`.
5. It is a secret: not in this root, not in a folder directly below it. Keychain or
   password manager, and a line saying where it is kept.
6. A fact that lives in a place stays there. Refer to it instead of copying it, and refer to
   the folder, not to what lies inside it.

After the change run `node .claude/scripts/check.mjs`.
