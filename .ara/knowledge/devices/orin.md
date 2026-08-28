---
id: orin
vendor: NVIDIA
family: Jetson AGX Orin
arch: arm64
system: Linux
support: supported
match: \borin\b
platform: orin-64
platform_min_memory_gb: 40
as_of: 2026-08-28
source: read out on a Jetson AGX Orin Developer Kit over ssh
---

# Device profile: NVIDIA Jetson AGX Orin

As of: 2026-08-28

Source: read out on a Jetson AGX Orin Developer Kit over ssh. The findings below come from
`/proc/device-tree/model`, `/sys/class/dmi/id/sys_vendor`, `/etc/nv_tegra_release`,
`uname -srm` and `/proc/meminfo` on that device.

## What this sheet is and what it is not

It is the signature by which the kit recognises this hardware, plus where that knowledge
comes from and how old it is. **It carries no product value.** Which language model runs on
this device, with which engine and in which memory budget stands in the mirror and only
there, `.ara/knowledge/live-knowledge.md`.

**It says nothing about the state of one particular device.** Users, documents, permissions
and settings are not hardware. A factory reset erases them and leaves the signature
untouched: on 28.08.2026 a reset on the test device removed the users, and afterwards the
device still recognised itself as exactly the same one. Whatever a reset can erase belongs
in the device file and in the runsheet, not here.

## How the kit recognises it

| Finding | What stood there on 28.08.2026 |
| --- | --- |
| `/proc/device-tree/model` | `NVIDIA Jetson AGX Orin Developer Kit` |
| `/sys/class/dmi/id/sys_vendor` | `NVIDIA` |
| `/etc/nv_tegra_release` | the L4T line, there `R36 (release), REVISION: 4.7` |
| `uname -srm` | `Linux 5.15.148-tegra aarch64` |
| `/proc/meminfo` | `64348860` kB, which the kit reports as 61 GB |

The word `orin` in the model or in the graphics line is what the match runs on. That is
enough here: the device tree of a Jetson names the board, and nothing else in the findings
carries that word.

## Which memory sizes exist

The family comes in more than one memory size. **The device tree does not say which one is
fitted**, only the memory does. That matters, because the platform catalogue of the product
carries the profile `orin-64`, and that one is meant for the 64 GB variant. The kit
therefore names that catalogue profile only from 40 GB of recognised memory upwards, and
otherwise says that the catalogue has no profile for this variant. A smaller Orin is not
thereby unsupported, it is unanswered, and that is a question for the product team.

## How it gets its Linux

The way from an empty Orin to a running Linux is not in this sheet, it is a guide of its own
with a check step per section: `.ara/knowledge/flash-orin.md`. Nothing in it is verified by
the kit, and the guide says so itself.

## What the kit does not know here

Whether the profile in the catalogue was verified on real hardware does not stand in this
sheet. It stands in the catalogue itself, in the field `verification`, and `/device` reads
it from the mirror before every run. Without a mirror the kit says that it cannot read the
level, and it does not guess one.
