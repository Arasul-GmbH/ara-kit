---
id: thor
vendor: NVIDIA
family: Jetson Thor
arch: arm64
system: Linux
support: supported
match: \bthor\b
platform: thor-128
platform_min_memory_gb: 80
as_of: 2026-08-28
source: platform catalogue of the product, config/platforms/thor-128.json, plus the support rule the kit has carried so far
---

# Device profile: NVIDIA Jetson Thor

As of: 2026-08-28

Source: the platform catalogue of the product, `config/platforms/thor-128.json`, read on
28.08.2026, plus the support rule the kit has carried in `.ara/tools/lib/device.mjs` since
its first version.

**No such device was read out.** There is none here. Everything below is derived, and where
it says what a Thor reports about itself, that is an expectation and not a finding. The
first run against a real Thor either confirms this sheet or corrects it, and then `As of`
and `Source` change with it.

## What this sheet is and what it is not

It is the signature by which the kit recognises this hardware, plus where that knowledge
comes from and how old it is. **It carries no product value.** Model, engine and memory
budget stand in the mirror and only there, `.ara/knowledge/live-knowledge.md`.

**It says nothing about the state of one particular device.** Users, documents, permissions
and settings are not hardware, and a factory reset erases them without touching the
signature. They belong in the device file and in the runsheet.

## How the kit recognises it

| Finding | What is expected |
| --- | --- |
| `/proc/device-tree/model` | the board name of a Jetson, with the word `Thor` in it |
| `/sys/class/dmi/id/sys_vendor` | `NVIDIA` |
| `/etc/nv_tegra_release` | present, a Jetson runs on L4T |
| `uname -srm` | `Linux`, architecture `aarch64` |

The match runs on the word `thor` in the model or in the graphics line. If a real device
reports itself differently, this sheet is wrong and not the device.

## Which memory sizes exist

The catalogue carries the profile `thor-128`, and that one is meant for the 128 GB variant.
The kit therefore names that catalogue profile only from 80 GB of recognised memory upwards.
Below that it says that the catalogue has no profile for this variant, which is a question
for the product team and not a verdict about the device.

## What the kit does not know here

Whether the catalogue profile was verified on real hardware or only built from manufacturer
documentation stands in the catalogue, in the field `verification`, and `/device` reads it
from the mirror before every run. For a device that is not here, that field is the whole
answer, and this sheet does not anticipate it.
