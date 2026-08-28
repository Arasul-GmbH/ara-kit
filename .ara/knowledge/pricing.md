# Procedure: calculation

> **When do you need this?** When somebody wants to know what something costs, for the customer
> or for the partner themselves.

## Where the numbers come from

**Not from the kit.** Prices change, and a wrong price in an offer is more expensive than a
question.

| What | Where it stands |
|---|---|
| Purchase prices (licence, maintenance, hardware) | Partner portal, the partner sees their own |
| The partner's own rates | `business/company.md`, calculation sheet |
| What this customer needs | `customers/<c>/customer.md` |

If a number is missing from the calculation sheet, it gets added **once** and is not asked for
again at every calculation. That is what `/calculation` is for.

If you do not know a purchase price, say so and have it named. Do not guess, and do not take a
number from an old offer as a current price.

## The calculation sheet

A complete offer needs ten numbers. They stand in `business/company.md`, the own rates in the
frontmatter, the purchase prices in the table under "Einkaufspreise".

| Number | From | Without it, this does not work |
|---|---|---|
| Hourly rate | the partner | the calculation, neither setup nor care |
| Hours for a first setup | the partner | a consistent setup line item |
| Markup on hardware | the partner | the hardware price |
| Own care, yearly | the partner | the recurring item that carries the business |
| Payment terms | the partner | the offer, it stands in the letterhead |
| Travel | the partner | it falls off the table when calculating |
| Minimum fee | the partner | small jobs go out below value |
| Purchase licence, one-off | Partner portal | the licence line item |
| Purchase maintenance, yearly | Partner portal | maintenance year 1 and from year 2 |
| Purchase hardware, per type | Partner portal | hardware price and margin |

What is there and what is missing:

```
node .ara/tools/calculation.mjs
node .ara/tools/calculation.mjs --json
```

The tool only reads, it enters nothing. It reports every missing number **individually with its
consequence**, and it reports which as-of date has gone stale. Call it before you calculate,
instead of remembering what was stored.

**Every number carries an as-of date.** The own rates together under `rates_asof`, every purchase
price in its own line. Without a date it cannot be said later whether a number still holds, and
with prices that is exactly the only question that counts. Two periods, after which the tool
reports "nachsehen":

- **Purchase prices after six months.** They are Arasul's numbers, they change, and the partner
  does not find out by themselves.
- **Own rates after a year.** Whoever has not touched their hourly rate for three years works
  with the rate from the day before yesterday.

## The procedure `/calculation`

Keeping the sheet, separate from onboarding. Two rounds, each bundled in the interview tool,
each with an open option.

1. **Look first, ask second.** `node .ara/tools/calculation.mjs`. What is already there is not
   asked for, it is read out for confirmation. Ask only about what is missing or stale.

2. **The own rates**, in one round. The partner knows them by heart, they need to look nowhere.
   Say what each one is for, otherwise it feels like a form. Afterwards `rates_asof` to today.

3. **The purchase prices**, in a second round. They stand in the partner portal, so they have to
   look. If they do not have the portal at hand right now, that is fine: the own rates stay
   entered anyway, and you say at the end what is therefore not yet possible. One line per
   hardware type they offer. **Guess no purchase price and take none from an old offer.**

4. **Enter, with a date.** Every number into `business/company.md`, every purchase price with the
   date on which it stood in the portal, not with today's if it is from yesterday.

5. **Report once more.** `node .ara/tools/calculation.mjs`, and then in two or three lines: what
   is there now, what is still missing and what is therefore not possible. Concretely, not "some
   things are missing".

**The purchase prices stay in `business/company.md`.** They go into no customer file, into no
offer and into no history entry, not even as a subtotal from which the margin can be worked back.
The partner's margin is their own business.

## The line items

A complete offer consists of four parts. If one is missing, it gets renegotiated, and always to
the partner's cost.

1. **Hardware.** Purchase plus markup. Name the delivery time, with this kind of device it is
   often the determining factor.
2. **Licence.** One-off, purchase plus margin.
3. **Setup.** Hours times rate, and the number of hours comes from `setup_hours` in the
   calculation sheet, not from a fresh estimate. Otherwise two offers for the same device type
   land on different numbers, and none of them can be justified. Be honest: a first setup on a
   device type you are setting up for the first time takes longer than the second. Whoever does
   not price that in works the first customer for free. If the partner has their own rule for
   that case, it stands under "Notizen zur Kalkulation".
4. **Recurring.** Maintenance of the product plus your own care (`care_yearly`). That is the part
   that carries the business, it belongs in the first offer, not in a later conversation.

Plus, where applicable: travel (`travel`), training, extensions, data migration. And whatever
ends up under the minimum fee (`minimum_fee`) becomes the flat rate, not a friendship price.

## How you calculate

- **Calculate net**, show VAT at the end.
- **Estimate effort honestly**, not optimistically. A second appointment nobody pays for costs
  more than an open line item.
- **A range instead of false precision**, as long as something is unclear. "Between X and Y,
  depending on whether the network is prepared" is more honest than an exact number that does not
  hold.
- **Show recurring separately** from one-off. The customer has to see both.

## What you say alongside

The number is not the end of it. Two things belong with it:

- **What is not included.** Extensions, data migration, training beyond what was agreed.
- **What the price hangs on.** If the customer network is not prepared or the device is a type
  nobody has worked with yet, it gets more laborious. That belongs said beforehand.

## For the partner themselves

Sometimes the question is not "what does this cost the customer" but "what stays with me". Then
work out the margin and the yield per hour. Purchase against sale, effort against rate. If
something comes out of it that is not worth it, say so. A job that does not add up is not a
success.

The purchase prices are confidential. They belong into an internal calculation, never into a
customer offer.
