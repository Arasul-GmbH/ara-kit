---
format: YYYY-NNNN
year:
last: 0
created:
---

<!-- This file belongs to you. It is the number range of your invoices and is
     written on by node .ara/tools/invoice.mjs. An update of the kit never
     touches it, it lies under business/. -->

# Number range of the invoices

Every invoice gets a number, every number exists exactly once, and between two
numbers there is no gap. That is not tidiness, it is section 14(4) no. 4 UStG: an
invoice without a sequential number does not entitle the customer to deduct input
tax.

The number has the form `YYYY-NNNN`. Every year starts at `0001`. `last` in the
header is the last number assigned in the year that stands under `year`.

**Assignment happens when the document is created, not when it is printed.** A
draft that was never sent has used up its number nevertheless. Whoever discards
one cancels the number instead of deleting the line:

```
node .ara/tools/invoice.mjs --void YYYY-NNNN --reason "reason"
```

**Nothing gets wound back here by hand.** A smaller number under `last` than in
the list shows up at the next call, and then the tool assigns no number at all
until it has been settled.

## Assigned numbers

| Number | Date | Customer | Net | Gross | State | Reason | File |
| --- | --- | --- | --- | --- | --- | --- | --- |

No number assigned yet.

## States

| State | What it means |
| --- | --- |
| `entwurf` | written, not printed yet |
| `gestellt` | printed and with the customer |
| `storniert` | withdrawn, the number stays assigned |
