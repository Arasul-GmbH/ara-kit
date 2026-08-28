---
id: dgx-spark
vendor: NVIDIA
family: DGX Spark
arch: arm64
system: Linux
support: soon
match: dgx[ -]?spark|\bspark\b|\bgb10\b
platform: dgx-spark
as_of: 2026-08-28
source: platform catalogue of the product, config/platforms/dgx-spark.json, plus the support rule the kit has carried so far
---

# Device profile: NVIDIA DGX Spark

As of: 2026-08-28

Source: the platform catalogue of the product, `config/platforms/dgx-spark.json`, read on
28.08.2026, plus the support rule the kit has carried in `.ara/tools/lib/device.mjs` since
its first version.

**No such device was read out.** There is none here. Everything below is derived. The first
run against a real Spark either confirms this sheet or corrects it, and then `As of` and
`Source` change with it.

## What this sheet is and what it is not

It is the signature by which the kit recognises this hardware, plus where that knowledge
comes from and how old it is. **It carries no product value.** Model, engine and memory
budget stand in the mirror and only there, `.ara/knowledge/live-knowledge.md`.

**It says nothing about the state of one particular device.** Users, documents, permissions
and settings are not hardware, and a factory reset erases them without touching the
signature.

## How the kit recognises it

| Finding | What is expected |
| --- | --- |
| `/sys/class/dmi/id/product_name` | a product name with `DGX Spark` in it |
| `/sys/class/dmi/id/sys_vendor` | `NVIDIA` |
| `nvidia-smi` | answers, and names the graphics unit |
| `uname -srm` | `Linux`, architecture `aarch64` |

The match runs on `dgx spark`, on the word `spark` and on `gb10` in the model or in the
graphics line. `gb10` is in there because the kit has been carrying that string since its
first self-test; it has never been checked against a device.

## What "soon" means here

The verdict for this device is **soon**, not supported. The catalogue carries a profile, and
a profile is not a tried device. What follows from that stands in
`.ara/knowledge/identify-device.md`: the level in the field `verification` decides, and a
partner who puts such a device up at a customer says that beforehand and not afterwards.

## What the kit does not know here

Whether the catalogue profile was verified on real hardware or only built from manufacturer
documentation stands in the catalogue, and `/device` reads it from the mirror before every
run. This sheet does not anticipate it.
