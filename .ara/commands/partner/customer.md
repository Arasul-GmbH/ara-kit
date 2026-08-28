---
description: Create or open a customer
argument-hint: <customer name>
---

Customer: **$1**

Read `.ara/knowledge/customer-file.md` and work along it. Knowledge this command loads:
`.ara/knowledge/customer-file.md`, `.ara/knowledge/crm.md` for history and follow-up,
`.ara/knowledge/sales.md` for a first contact. You read the profile in
`business/profile.md` beforehand, it tells you the language and how much you explain.

**Look first, talk second.** The tool reads the file, the customer's devices, their
paperwork and their history in one place:

```
node .ara/tools/customer.mjs                       which customers there are
node .ara/tools/customer.mjs --customer $1         the picture
```

- **No argument given:** show the overview, one line each with status, devices and last
  contact, and ask which one it is about.
- **File exists (also under a similar name):** open it. What the tool prints is your
  ground, not your text. Say in your own words where the customer stands, which devices
  they have and in what state, and what is due. **Do not read it out.**
- **File does not exist:** create it. First look up what you can find out yourself
  (website), then one bundled interview round, then write:

  ```
  node .ara/tools/customer.mjs --customer $1 --new --legal-name "<legal name>"
  ```

  That creates the folder and the frontmatter, the rest you fill from the conversation. If
  it warns about a similar name, that is usually the same customer a second time: look,
  instead of appending `--force`.

## The devices hang off the customer

A customer device sits under `customers/$1/devices/<device>/`, it is created with
`/device $1/<device>`. Its file says whether the kit can address it at all: `address` for
SSH, `api_base` for the interface if it sits elsewhere, `tls` for a self-signed
certificate, `api_key_ref` for the kit key. What the tool prints about that is a statement
about the **file**. Whether the device answers and how it is doing, `/maintain $1/<device>`
says.

The partner's own devices belong to no customer and sit under `devices/`. Do not create a
dummy customer for them.

## After the conversation

Entry under `customers/$1/history/`, `last_contact` to today, `follow_up` with half a
sentence on what it will be about then. That is three lines and the difference between a
customer file and a folder full of files.

From now on you work exclusively in `customers/$1/`. No look into other customer folders.
