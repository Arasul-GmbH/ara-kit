# Procedure: the customer file

> **When do you need this?** At `/customer`: creating, opening and keeping a customer file.

## Structure

```
customers/mueller-metallbau/
├── customer.md                    Who that is, what they intend, where it stands
├── devices/
│   └── zentrale/
│       ├── device.md              One device: type, network, access, interface, maintenance
│       ├── runsheet.md            Progress state of the setup (at /device)
│       ├── handover.md            Handover document (at the end of /device)
│       └── reports/
│           └── YYYY-MM-DD-wartung.md   Maintenance reports (at /maintain)
├── documents/
│   ├── YYYY-MM-DD-angebot.md      The paperwork: offer, annexes, records
│   └── YYYY-MM-DD-rechnung-YYYY-NNNN.md   Invoices, Markdown and PDF side by side
└── history/
    └── YYYY-MM-DD-topic.md        Conversations, faults, maintenance
```

**Look, instead of reading the file.** What lies scattered here a tool collects in one place:

```
node .ara/tools/customer.mjs                          which customers there are
node .ara/tools/customer.mjs --customer mueller       the picture of one customer
node .ara/tools/customer.mjs --customer mueller --json
```

It only reads, except with `--new`. It passes no judgement on the customer and writes nothing
into their file: what was discussed belongs into the history, and the status moves into the
frontmatter by hand.

**`documents/` against `history/`:** in `documents/` lies the paperwork the customer receives,
Markdown and PDF side by side. In `history/` stands what happened, including that an offer went
out. One gets signed, the other gets read. Procedure: `.ara/knowledge/paperwork.md`.

**The address belongs in the frontmatter, in three fields.** `street`, `postcode` and `city`,
plus `country` and `vat_id` if there is one. An invoice needs them individually and completely,
section 14(4) no. 1 UStG, and an offer without an address does not go out either. Write them down
as soon as you have them, not only when a document is waiting on them.

**Folder name:** speaking, lower case, with hyphens, without the legal form.
`mueller-metallbau`, not `Müller Metallbau GmbH` and not `kunde-01`. The full legal name stands
in the frontmatter under `legal_name`.

**The partner's own devices** (demonstration, practice, own operation) belong to no customer and
therefore do not lie here, but under `devices/<device>/`, as with a company. No dummy customer
for them: an invented customer falsifies every evaluation, every agenda and every answer to "how
is my business doing". They are created with `/device <device>`, addressed without `--customer`:

```
node .ara/tools/device.mjs --name orin
node .ara/tools/remote.mjs --device orin --check
```

Procedure: `.ara/knowledge/device.md`.

## Creating

Check first whether the file already exists, including under a similar name. If yes: open it.

**Before asking: look.** If a website is named or you find one, read it. Industry, size,
locations, contacts, that usually stands there publicly. Do not ask about what you can read.

Then **one** interview round with bundled questions:

1. **Contact.** Name, role, how to reach them.
2. **Who decides.** Who signs, who uses it, who can prevent it. In small firms often the same
   person, and then that is exactly what stands there.
3. **What they intend.** In their words, one or two sentences. That is later the ground for
   handover and training.
4. **Status.** First conversation, offer out, ordered, device already there?
5. **Device.** Already clear which one? Ordered, delivered, set up?
6. **Place and network.** Where should it stand, who looks after the network there?
7. **Particularities.** An industry with special requirements (law firm, practice, authority)?
   Existing IT support you have to coordinate with?

Ask only what you need. For an early prospect the first four points are enough. An empty field is
better than an invented answer.

**At the end of the round always:** when do you want to get back in touch, and what will it be
about then? → `follow_up` and `follow_up_note`. A conversation without a next date is a customer
forgotten in three months (`.ara/knowledge/crm.md`).

## Creating: what you write

```
node .ara/tools/customer.mjs --customer <folder name> --new --legal-name "<legal name>"
```

That creates `customer.md` from the template, plus `history/` and `documents/`, and sets `id`,
`status`, `created` and `last_contact`. If a file with a similar name already exists, it stops
and names it: the same customer a second time is the most frequent way to two half files. If it
really is a different one, `--force` carries on.

After that by hand, out of the conversation:

- **Fill the frontmatter** and write the free text in your own words, readable, not as a bullet
  list of the interview answers.
- `history/YYYY-MM-DD-erstgespraech.md` with what was discussed. Even if it is short: the first
  entry sets the frame.
- `devices/<name>/device.md` **only when it is already clear which device it will be**, and it
  gets created with `/device <customer>/<device>`, not by hand. Otherwise not at all: an empty
  device folder suggests a state that does not exist.

After that in three lines: what was created, what is still missing, what the next step is.

## Opening

```
node .ara/tools/customer.mjs --customer <name>
```

That is your ground, not your text. **Do not read it out.** Give a picture:

- who that is, in one line
- where it stands (status, last contact, how long ago)
- which devices there are and in what state
- what is due (follow-up, end of maintenance, interrupted setup, missing paperwork)

Then ask what to do. No catalogue of suggestions.

## The customer and their devices

A customer device lies under `customers/<customer>/devices/<device>/`. What stands in its file
decides whether the kit can address it at all:

| Field | For what |
|---|---|
| `address` | the address in the customer network, SSH runs over it |
| `api_base` | the interface, when it sits elsewhere than the SSH access, behind a tunnel for instance |
| `tls` | `selfsigned`, when the device carries a self-signed certificate |
| `api_key_ref` | the name of the kit key in the secret store, never its value |
| `maintenance_until` | end of the maintenance contract, the follow-up comes out of it |

**What the tool prints about that is a statement about the file and not one about the device.**
Whether it answers, how it is doing and which apps stand on it, the device says itself:
`/maintain <customer>/<device>`.

A device without `api_key_ref` cannot receive an app, and one with a name behind which no entry
stands in the store cannot either. Both show up in the picture before the first deploy fails on
them.

## Keeping it

After **every** contact three things, that is the minute that makes the difference:

1. Entry under `history/` (template: `.ara/templates/history-entry.md`)
2. Update `last_contact`
3. Set `follow_up` or change `status`

If something fundamental changes (contact, legal name), keep it in the frontmatter, not only in
the history entry.

**When a folder gets renamed**, pull the references along. The `id` stays unchanged, so that
older documents keep their reference.

## What does not belong in the file

- **Passwords and tokens.** Those belong in the secret store (`node .ara/tools/secrets.mjs`). The
  device file only says under `secret_ref` under which name the secret is stored.
- **Unchecked product values.** Only enter model names, ports and versions once they are
  confirmed by the device (`.ara/knowledge/live-knowledge.md`).
- **Customer data from the device.** Documents, chat histories and database contents stay with
  the customer.
