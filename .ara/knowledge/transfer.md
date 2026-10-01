# Procedure: hand the kit over to a customer

> **When do you need this?** When the kit was set up for a customer who runs the machines
> themselves, and the repository now goes to them (`/maintain`, step "hand over"). And on the other
> side: when `/init` finds that this kit was handed over to you.

## The principle

The repository belongs to the customer afterwards, and so does every key. Nobody keeps a key "for
emergencies": a key that is still valid on the device after the handover is an access the customer
did not choose. So the handover ends with two things you can show: the new person's keys work, and
the old ones do not.

## Giving it over (company branch)

Reads `business/profile.md` first. A partner profile has no handover: customer files never travel in
a repository. If the profile says `partner` and the customer should run their own kit, the customer
needs their own clone with their own profile (branch company), not this one.

```
node .ara/tools/transfer.mjs --prepare --to "<name>"          the plan, nothing is written
node .ara/tools/transfer.mjs --prepare --to "<name>" --yes    write it
```

What it does, in the clone, and nothing on the device:

- `versioned: business, devices, apps` into the profile and the matching exceptions into
  `.gitignore`, so these three folders travel with the repository.
- A scan of the three folders. A file that looks like a secret (kit key, private key, access token,
  password, a `.env`) stops the whole preparation, with the place and the kind but never the value.
  Move the secret into the secret store and leave its name in the file.
- `business/handover.md`: the sheet for the person taking over, in plain words, and the three things
  the kit needs later: per device the fingerprint of the old login key, the start of the old kit key
  and an empty `done_` field. None of these is a secret, the device prints them in its own lists.

Then, by hand, because it is outward facing: commit the three folders, push to a **private**
repository, share it with the new person. Ask first whether that is what they want, and name the
repository.

## What must be clear (before you prepare)

- Who takes over, by name, and whether they work with Claude Code or Codex (the sheet is the same).
- Which devices go over. Default: all under `devices/`.
- Where the repository lives and who may read it. Private, named accounts only.
- How the new person gets their first way onto each device: the password of the login on the device,
  handed over **outside** the repository. If nobody knows it and the device takes keys only, the
  handover needs the one handing over once more, see `--authorize` below.
- Whether other people or Arasul itself hold keys that should go as well (the list at the end of the
  taking over shows them).

"enough" ends the questions: what stays open becomes a line in the sheet.

## Taking over (the new person)

`/init` runs `node .ara/tools/init.mjs --show` first. If the first line says that the kit was handed
over, that comes before everything else: say in two sentences what has happened (the files are
theirs, the keys are not yet) and go on.

```
node .ara/tools/transfer.mjs --accept                     the plan per device
node .ara/tools/transfer.mjs --accept --yes               do it
node .ara/tools/transfer.mjs --accept --yes --revoke-others   also revoke other valid kit keys
```

Per device, in this order, and the order is the point:

1. An own login key (Ed25519, with a passphrase, in `~/.ssh`, named `ara-<device>`).
2. Its public half onto the device, through the way into the device that still works today.
3. Proof: a login with the new key alone.
4. An own kit key, issued by the device and stored in the secret store. Its text is shown nowhere.
5. Only now: the old kit key is revoked, the old login key is taken out of the device.
6. Counted on the device: which kit keys and which login keys are still valid. Others are listed
   and stay unless `--revoke-others` is given. Revoking those is irreversible, so it is its own yes.

If step 2 has no way in (the device takes keys only and the new person has none), the tool stops,
prints the **public** half and says what to do: the one handing over runs

```
node .ara/tools/transfer.mjs --authorize <file with the public key> --device <device> --yes
```

and the new person runs `--accept` again. That is the only case in which the new person needs the
old one.

**The product publishes no interface for login keys.** The kit does not invent one: the login key
goes over the way into the device that exists, the kit key over the key script of the platform on
the device, the same one `device.mjs --keys` and `--revoke-key` use. If the device offers an
interface route later, it belongs into the contract and then here.

## Proving that the old keys are dead

The one who handed over runs, in their own clone:

```
node .ara/tools/transfer.mjs --prove
```

It tries his login key (key only, no password) and his kit key against the device. Exit 0 means both
are refused. Exit 1 means one still works, and the handover is not finished. Exit 2 means a test
could not be made (no network, no address): that is not a proof, say so. Afterwards he may forget the
dead entries from his secret store.

## What you write down

For the person taking over: the device file gets the entry (the tool writes it), and
`business/handover.md` gets `status: accepted`. For the one handing over: a line in
`customers/` or the history that the handover happened and when `--prove` came out closed.
