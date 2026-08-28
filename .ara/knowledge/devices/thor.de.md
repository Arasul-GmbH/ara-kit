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
source: Plattformkatalog des Produkts, config/platforms/thor-128.json, dazu die Unterstützungsregel, die das Kit bisher trug
---

# Geräteprofil: NVIDIA Jetson Thor

Stand: 2026-08-28

Quelle: der Plattformkatalog des Produkts, `config/platforms/thor-128.json`, am 28.08.2026
gelesen, dazu die Unterstützungsregel, die das Kit in `.ara/tools/lib/device.mjs` seit
seiner ersten Fassung trägt.

**Ein solches Gerät wurde nicht ausgelesen.** Es gibt hier keines. Alles unten ist
abgeleitet, und wo dort steht, was ein Thor über sich meldet, ist das eine Erwartung und
kein Befund. Der erste Lauf gegen einen echten Thor bestätigt dieses Blatt oder korrigiert
es, und dann ändern sich Stand und Quelle mit.

## Was dieses Blatt ist und was nicht

Es ist die Signatur, an der das Kit diese Hardware erkennt, dazu die Herkunft dieser
Kenntnis und ihr Alter. **Es trägt keinen Produktwert.** Modell, Engine und Speicherbudget
stehen im Spiegel und nur dort, `.ara/knowledge/live-knowledge.de.md`.

**Es sagt nichts über den Zustand eines einzelnen Geräts.** Benutzer, Dokumente, Freigaben
und Einstellungen sind keine Hardware, und ein Werksreset löscht sie, ohne die Signatur zu
berühren. Sie gehören in die Geräteakte und in den Laufzettel.

## Woran das Kit es erkennt

| Befund | Was erwartet wird |
| --- | --- |
| `/proc/device-tree/model` | der Boardname eines Jetson, mit dem Wort `Thor` darin |
| `/sys/class/dmi/id/sys_vendor` | `NVIDIA` |
| `/etc/nv_tegra_release` | vorhanden, ein Jetson läuft auf L4T |
| `uname -srm` | `Linux`, Architektur `aarch64` |

Gegriffen wird das Wort `thor` im Modell oder in der Grafikzeile. Meldet sich ein echtes
Gerät anders, ist dieses Blatt falsch und nicht das Gerät.

## Welche Speichergrößen es gibt

Der Katalog führt das Profil `thor-128`, und das ist für die 128-GB-Fassung gedacht. Das Kit
nennt dieses Katalogprofil darum erst ab 80 GB erkanntem Speicher. Darunter sagt es, dass
der Katalog für diese Fassung kein Profil hat, und das ist eine Frage an das Produktteam und
kein Urteil über das Gerät.

## Was das Kit hier nicht weiß

Ob das Katalogprofil an echter Hardware verifiziert wurde oder nur nach Herstellerdoku
gebaut ist, steht im Katalog, im Feld `verification`, und `/device` liest es vor jedem Lauf
aus dem Spiegel. Für ein Gerät, das nicht hier steht, ist dieses Feld die ganze Auskunft,
und dieses Blatt greift ihr nicht vor.
