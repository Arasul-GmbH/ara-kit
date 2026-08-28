# Procedure: customer care

> **When do you need this?** When somebody asks "what is due", when a contact or a contract
> should be followed up, and after every conversation with a customer.

## Why this stands here

A one-person business does not lose deals through bad work, it loses them through forgetting.
The prospect you wanted to chase up in March. The maintenance that ran out before anybody
extended it. Both are dates that fall between two customer appointments.

The kit monitors nothing by itself (that would need something running all the time). But it
answers the question of what is due at any moment:

```
node .ara/tools/agenda.mjs
node .ara/tools/agenda.mjs --days 30
```

**Ask that question on your own initiative** when a session starts without a concrete request or
when somebody asks about the state of their business. Not at every opportunity, once at the
start is enough.

## The four dates that count

### 1. Follow-up (`follow_up` in `customer.md`)

Whenever a conversation ends without a conclusion, a date belongs in the file. "Will get back to
us" is not a state, it is a lost customer.

```
follow_up: 2026-09-15
follow_up_note: chase up after the trade fair, wanted to clarify internally
```

The half sentence is more important than the date. In six weeks nobody knows what it was about.

### 2. Maintenance contract (`maintenance_until` in `device.md`)

The extension is recurring revenue and the reason the business carries itself. It is discussed
**before** the expiry, not after; the agenda reports it two months in advance.

A device in operation without a stored term is a gap. The agenda points that out.

### 3. Contact gone quiet (`last_contact`)

For running sales processes: whoever has not heard anything for more than three months is no
longer a prospect. Either chase up or set them to `inactive`. Both are better than leaving a
file in limbo.

Keep `last_contact` up to date after every conversation. That is one line and it makes the
agenda usable.

### 4. Interrupted setup

A runsheet in state "unterbrochen" means: a half-configured device is standing at a customer.
That is the most urgent entry of all.

## The life of a customer

The status in `customer.md` reflects where somebody stands:

| Status | Meaning | What counts next |
|---|---|---|
| `lead` | Interest, nothing concrete | Set a follow-up |
| `quoted` | Offer is out | Chase-up date, keep an eye on validity |
| `won` | Ordered | Plan the appointment, order the device |
| `installed` | Runs, handover done | Store the maintenance term |
| `maintenance` | Under care | Extension, regular look |
| `inactive` | Over or lost | Nothing, but the file stays |

**Lost customers do not get deleted.** In two years somebody asks again, and then the history is
worth more than any offer.

## After every customer contact

Three things, every time:

1. Entry under `customers/<customer>/history/YYYY-MM-DD-topic.md`. The folder grows, and that is
   fine: `node .ara/tools/customer.mjs --customer <name>` names the last five entries and counts
   the rest, so a picture comes out instead of a lecture. If it gets too crowded for you, move
   old years by hand into `history/archive/<year>/`. From there they are read along and counted
   along, just as an archive. **Nothing is moved by itself**, that is customer data.
2. Update `last_contact`
3. Set `follow_up` or change the status

That takes a minute and is the difference between a customer file and a folder full of files.

## What was learned: `business/notes/`

Here belongs what holds **beyond one customer** and saves time at the next offer or the next
setup: which objection was countered with what, how long a device type really took the first
time, which supplier delivers, which flat rate was too tight. One file per topic,
`business/notes/<topic>.md`, one sentence and a date are enough.

Here does not belong what belongs to **one** customer, because that stands in their file, and
nothing that comes out of the product. A model name or a version number is wrong here tomorrow
and gets copied from here. Product values come from the mirror or from the device, see
`.ara/knowledge/live-knowledge.md`.

The folder belongs to the partner and is excluded from version control, like everything under
`business/`.

## What the kit is not

Not accounting and not time tracking. Most people have had a tool for that for a long time, and
the tax adviser wants it differently anyway. The kit records what happens with customers and
their devices.

**The one exception is the outgoing invoice**, and even that only when the partner has enabled
it in the profile. Then `/invoice` writes the invoice, keeps its number range and prints it as a
ZUGFeRD PDF, see `.ara/knowledge/invoicing.md`. Everything after that stays out: incoming
payments, dunning, VAT returns, incoming invoices. Whoever asks about that gets exactly this
answer and no excuse.
