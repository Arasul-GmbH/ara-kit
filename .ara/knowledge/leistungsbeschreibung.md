# Procedure: producing the Leistungsbeschreibung

> **When do you need this?** Before every offer, and once more before every handover.

> **As of 27.08.2026: incomplete.** The binding order and the five annexes stand in
> `.ara/knowledge/paperwork.md`, section "Die Leistungsbeschreibung füllen". This file only goes
> deeper into the trial level per line. If the two contradict each other, `paperwork.md` applies.
> What is missing is the picture evidence per line: `node .ara/tools/evidence.mjs` runs, but the
> steps in the browser are written into no procedure, and that is why `abgenommen` comes about by
> hand on the device until then. It is assigned to no phase.

The document itself is German, like all the paperwork under `.ara/vorlagen/`. This procedure exists
in both languages.

## What this document is

The Leistungsbeschreibung is the annex that fixes **what is owed**. It is not marketing copy and not
a disclaimer. It works in the other direction from an exclusion: an exclusion takes something away
and gets scrutinised, a description fixes what a defect is measured against in the first place.

**What does not stand here is not promised.** That is why it is the paper that protects you most,
and that is why it must not be copied.

## The two points in time

| Point | For what | Ground |
| --- | --- | --- |
| **Before the offer** | That is the promise. It becomes part of the contract | mirror plus a device you know |
| **Before the handover** | That is the evidence. It has to match the Übergabeprotokoll | exactly this device |

Both carry a date. If they diverge, that is an open point or a defect, and both belong on the table,
not under the carpet.

## The three levels, and what they cost

| Level | Meaning | What you promise with it |
| --- | --- | --- |
| **abgenommen** | gets demonstrated and signed off at the handover | full warranty |
| **in Erprobung** | present, but not the subject of the acceptance | nothing. Use at your own risk |
| **Vorschau** | visible, not finished yet | nothing. Can change or fall away |

**Only set a line to "abgenommen" if you are going to demonstrate it.** A line that carries
"abgenommen" here and does not get shown at the handover is a contradiction in your own papers, and
it works against you.

In case of doubt: **in Erprobung**. A function the customer uses and that happens to run well costs
you nothing. A function you promised and that fails does.

## How you go about it

### 1. Fetch the mirror

```
node .ara/tools/mirror.mjs --refresh
```

Out of it come the functional areas and the list of target platforms with their trial level. **Take
the trial level word for word.** If a platform does not stand at `live`, it has never run on real
hardware, and that belongs into the offer and into clause 2a of the contract. Without that notice you
conceal a circumstance the customer would need to know.

### 2. Ask the device

```
node .ara/tools/service-description.mjs --customer <customer> --device <device>
```

The tool creates the annex and enters what the device answers over its interface, with the source per
value:

- The software version and the contract version, out of the device's contract
- Which language models lie there, with their ids
- Which apps stand on it, with their version, for section 6

**What it could not measure stays a placeholder** and gets named in the output. An empty answer to
requested ids does not become a promised "none" in doing so: it says that and leaves the placeholder
standing.

The connections to the outside (section 7) it does not measure. Those stay manual work on the device,
and without them the annex does not go out.

**None of that do you write from memory or from a kit file.** That is the kit's most important rule
and it counts double here, because the document gets signed.

If the device is not there yet because it is only being ordered: take a comparable device you look
after, and write the date and the origin into the header. Then take it again before the handover.

### 3. Set the trial level

Go through the areas one by one and ask yourself exactly one thing per area: **am I going to
demonstrate this at the handover?**

Yes, certainly: `abgenommen`. No or unsure: `in Erprobung`. Not finished yet: `Vorschau`.

If you cannot decide that for an area because you do not know it: **try it out on the device** before
you enter it. That takes minutes and is the difference between a promise and a guess.

### 4. Fill in what is not included

Section 4 of the template is part of the agreement on condition, not trimmings. **Add what was
discussed in this concrete case and is not part of it.** The customer mentioned something in the
conversation that does not stand in the offer? Then it stands here, and in their words.

That is the section that prevents disputes, and it is the one people most like to keep short. Keep it
long.

### 5. Go through the protective measures with the customer

Section 8 is a list of things **the customer** sets up, not you. Go through them with them before you
send the offer, so that they know what is coming.

At the handover they confirm them in the record. Without that confirmation the corresponding clause
of the contract is not fulfilled.

### 6. File it

`customers/<customer>/documents/leistungsbeschreibung-<YYYY-MM-DD>.md`, with the date in the name, as
in `.ara/knowledge/paperwork.md` under "Wohin es abgelegt wird". The tool already puts it there in
step 2; for a device without a customer it lies in that device's file. Old versions stay, and a second
version from the same day replaces the first only with `--force`. In a dispute the version that
applied at the conclusion of the contract is decisive, and you have to be able to find it again.

Plus an entry in `customers/<customer>/history/`: which version went out on which day.

## The most frequent mistake

Copying the annex from the last offer and changing the date.

It then describes a software version, a model and a trial level that no longer exist that way. The
document then states something false, and in a paper the customer has signed. That is exactly the case
in which a liability clause is of no more use.

Twenty minutes on the device are cheaper.
