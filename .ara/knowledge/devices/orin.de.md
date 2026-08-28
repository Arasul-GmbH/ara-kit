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
source: an einem Jetson AGX Orin Developer Kit über ssh ausgelesen
---

# Geräteprofil: NVIDIA Jetson AGX Orin

Stand: 2026-08-28

Quelle: an einem Jetson AGX Orin Developer Kit über ssh ausgelesen. Die Befunde unten
stammen von `/proc/device-tree/model`, `/sys/class/dmi/id/sys_vendor`,
`/etc/nv_tegra_release`, `uname -srm` und `/proc/meminfo` auf diesem Gerät.

## Was dieses Blatt ist und was nicht

Es ist die Signatur, an der das Kit diese Hardware erkennt, dazu die Herkunft dieser
Kenntnis und ihr Alter. **Es trägt keinen Produktwert.** Welches Sprachmodell auf diesem
Gerät läuft, mit welcher Engine und in welchem Speicherbudget, steht im Spiegel und nur
dort, `.ara/knowledge/live-knowledge.de.md`.

**Es sagt nichts über den Zustand eines einzelnen Geräts.** Benutzer, Dokumente, Freigaben
und Einstellungen sind keine Hardware. Ein Werksreset löscht sie und lässt die Signatur
unberührt: am 28.08.2026 hat ein Reset am Testgerät die Benutzer entfernt, und danach
erkannte sich das Gerät weiter als genau dasselbe. Was ein Reset löschen kann, gehört in
die Geräteakte und in den Laufzettel, nicht hierher.

## Woran das Kit es erkennt

| Befund | Was am 28.08.2026 dort stand |
| --- | --- |
| `/proc/device-tree/model` | `NVIDIA Jetson AGX Orin Developer Kit` |
| `/sys/class/dmi/id/sys_vendor` | `NVIDIA` |
| `/etc/nv_tegra_release` | die L4T-Zeile, dort `R36 (release), REVISION: 4.7` |
| `uname -srm` | `Linux 5.15.148-tegra aarch64` |
| `/proc/meminfo` | `64348860` kB, vom Kit als 61 GB gemeldet |

Gegriffen wird das Wort `orin` im Modell oder in der Grafikzeile. Das reicht hier: der
Gerätebaum eines Jetson nennt das Board, und sonst trägt kein Befund dieses Wort.

## Welche Speichergrößen es gibt

Die Familie gibt es in mehr als einer Speichergröße. **Der Gerätebaum sagt nicht, welche
verbaut ist**, das sagt nur der Speicher. Das ist wichtig, weil der Plattformkatalog des
Produkts das Profil `orin-64` führt, und das ist für die 64-GB-Fassung gedacht. Das Kit
nennt dieses Katalogprofil darum erst ab 40 GB erkanntem Speicher und sagt sonst, dass der
Katalog für diese Fassung kein Profil hat. Ein kleinerer Orin ist damit nicht nicht
unterstützt, er ist unbeantwortet, und das ist eine Frage an das Produktteam.

## Was das Kit hier nicht weiß

Ob das Profil im Katalog an echter Hardware verifiziert wurde, steht nicht in diesem Blatt.
Es steht im Katalog selbst, im Feld `verification`, und `/device` liest es vor jedem Lauf
aus dem Spiegel. Ohne Spiegel sagt das Kit, dass es die Stufe nicht lesen kann, und es rät
keine.
