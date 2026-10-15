---
process: {{id}}
title: {{title}}
customer: {{customer}}
created: {{date}}
---

# {{title}}

> A process sheet says how the work runs today, in the words of the people who do it: who does
> what, when, with which paper. It is not the wish for an app. `/app` builds from it and does not
> ask again what stands here. Replace every `<...>` with what the house really does. What nobody
> knows yet goes under Open, not into a guess.

## Aim

<What comes out at the end, who needs it, and what happens when it comes late or wrong>

## Trigger

- What sets it off: <an event, a paper arriving, a date>
- How often: <per day, per week, per month, roughly how many cases>
- Who starts it: <a role, not a name>
- Starts by: hand

## Steps

One row per step, in the order they happen. A step is one person doing one thing.

| No | Who | Does what | With which paper | When |
| --- | --- | --- | --- | --- |
| 1 | <role> | <what they do> | <paper or "-"> | <how soon, how long> |
| 2 | <role> | <what they do> | <paper or "-"> | <how soon, how long> |

## Papers

Every paper or file that appears in a step. "Fields to read" are the details the device should read
off the paper by itself, "May be corrected" the ones a person may still change.

| Paper | What stands on it | Fields to read | May be corrected | Personal data | Lies today |
| --- | --- | --- | --- | --- | --- |
| <paper> | <what stands on it> | <details or "-"> | <details or "none"> | <yes or no> | <folder, mailbox, drawer> |

## Decisions

Where somebody has to say yes or no before it goes on. One row per decision.

| After step | Stage | Who decides | Based on what | If no |
| --- | --- | --- | --- | --- |
| 1 | <short name> | <role> | <what they look at> | <what happens> |

## Exceptions

What goes wrong or deviates, and what people do then.

- <exception and what happens>

## Who sees what

<Does everybody see everything, or only their own cases, clients, departments? Who hands them out?>

## Not part of it

<What this process expressly does not cover>

## Open

What nobody could say yet. Every line is a place where somebody may object.

- <open point>
