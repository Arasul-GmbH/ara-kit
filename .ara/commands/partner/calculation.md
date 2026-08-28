---
description: Store prices and keep the calculation sheet
---

Read `.ara/knowledge/pricing.md`, sections "Das Kalkulationsblatt" and "Das Verfahren
`/calculation`", and work along them. Knowledge this command loads:
`.ara/knowledge/pricing.md`, nothing else. The numbers sit in `business/company.md`.

**First, always:**

```
node .ara/tools/calculation.mjs
```

That is the start of every run. What is already there is not asked for, it is read out for
confirmation. Asked for is only what is missing or has gone stale.

Ten numbers belong in the sheet. Seven the partner knows themselves, three are in the
partner portal. Hence two separate rounds, each bundled in the interview tool: for their
own rates they need to look nowhere, for the purchase prices they do.

**Without the portal half the round still works.** If they do not have the purchase prices
at hand, you enter their own rates and say at the end what is therefore not yet possible. A
half-filled sheet is better than an aborted round.

**Every number gets an as-of date.** The own rates together under `rates_asof`, every
purchase price in its own line, and with the date on which it stood in the portal.

## Two limits

**Guess no number.** No purchase price, no hourly rate, no number of hours. Not from an old
offer either, not from another customer either. If a number is missing, it is missing, and
you say what is therefore not possible.

**The purchase prices stay in `business/company.md`.** They go into no customer file, into
no offer and into no history entry, not even as a subtotal from which the margin can be
worked back.

## At the end

Once more `node .ara/tools/calculation.mjs`, then in two or three lines: what is there now,
what is missing and what is therefore not possible. Concretely. "Without the purchase price
of the maintenance no maintenance line item" is usable, "some things are missing" is not.

If something is to be calculated straight afterwards, the next step is `/offer <customer>`.
