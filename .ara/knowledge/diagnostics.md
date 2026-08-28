# Procedure: diagnosis

> **When do you need this?** When something does not work, at `/maintain` or when somebody
> says "the chat at Müller is broken".

## The principle

**Establish first, change second.** No repair without a finding. No "try a restart" as the
first action.

The reason is not tidiness: a restart wipes the trail. If you do not know beforehand what was
going on, you never know afterwards, and in three weeks the same problem stands there again
and you start over.

**The one thing that may act before the finding is the self-healing**,
`.ara/knowledge/self-healing.md`, and it may because it wipes no trail: it starts what
does not run, only inside the Arasul directory tree, restarts nothing, deletes nothing, and
writes every step with its way back into the device file. Where it gives up, this chain
begins, and its record is the first thing you read.

## The chain

Work from the outside in. Every stage answers one question before you go to the next.

1. **What exactly happens?** Not "does not work". What did who do, what should have happened,
   what happened instead, when was it last good? If the customer does not know, have them
   show you.
2. **Is the device reachable?** `node .ara/tools/find-device.mjs --host <address>`, then
   `node .ara/tools/remote.mjs --customer <c> --check`. If not: procedure in
   `.ara/knowledge/remote-access.md`, section "Wenn ein Gerät nicht mehr erreichbar ist".
3. **Is the device itself alive?** Has it been running since the last boot? Is there disk
   space? Is the system time right? A full file system and a wrong clock are the two causes
   that disguise themselves as anything at all.
4. **Are the services running?** Which run, which do not, which keep restarting. A service
   restarting in a loop is the most frequent cause of "answers sometimes, sometimes not".
5. **What do the logs say?** From the time of the fault, not the last thousand lines. If the
   customer says "since yesterday afternoon", look there.
6. **What has changed?** Update, power cut, new router, new firewall, somebody set something
   up. A system that ran for months and suddenly does not almost always has a cause outside
   itself.

How each of those is queried stands in the product. Read it up in the mirror instead of using
commands from memory.

## Frequent patterns

| Symptom | Where you look first |
|---|---|
| Answers not at all | Is the language processing running? Is a model loaded? |
| Answers empty or nonsensical | Usually no model loaded, looks like a reasoning fault, is a missing model |
| Answers very slowly | Is the computation running on the graphics unit or on the main processor? |
| Does not find documents | Was the document ingested? Is the format readable at all? |
| Web interface unreachable | Network path, certificate, or the service behind it |
| Worked yesterday | Update, restart, change in the customer network |

The table does not replace the chain. It only says where to look first.

## Before you change anything

Say the finding in two sentences: what you established and what you conclude from it. Then the
suggestion, with a way back. Only then act.

> The service for the language processing has been restarting every two minutes since 2 pm
> yesterday, the log holds a memory error. That fits with a larger model having been loaded
> yesterday. Suggestion: back to the model from the device profile. Way back: the larger one
> can be loaded again at any time. Shall I?

## What you do not do

- **Do not change several things at once.** Then you do not know what helped.
- **Do not rummage in customer data.** Logs yes, documents and conversation histories no.
- **Do not guess and then check whether it helped.** That is not diagnosis, that is throwing
  dice with somebody else's infrastructure.

## Afterwards

What was, what you did, what it achieved, into `customers/<c>/history/`. Next time that is the
first place you look. If the same cause comes up a second time, it is no longer a fault but a
design defect, and that belongs reported.
