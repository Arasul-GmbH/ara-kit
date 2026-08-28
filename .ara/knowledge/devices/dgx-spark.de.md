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
source: Plattformkatalog des Produkts, config/platforms/dgx-spark.json, dazu die Unterstützungsregel, die das Kit bisher trug
---

# Geräteprofil: NVIDIA DGX Spark

Stand: 2026-08-28

Quelle: der Plattformkatalog des Produkts, `config/platforms/dgx-spark.json`, am 28.08.2026
gelesen, dazu die Unterstützungsregel, die das Kit in `.ara/tools/lib/device.mjs` seit
seiner ersten Fassung trägt.

**Ein solches Gerät wurde nicht ausgelesen.** Es gibt hier keines. Alles unten ist
abgeleitet. Der erste Lauf gegen einen echten Spark bestätigt dieses Blatt oder korrigiert
es, und dann ändern sich Stand und Quelle mit.

## Was dieses Blatt ist und was nicht

Es ist die Signatur, an der das Kit diese Hardware erkennt, dazu die Herkunft dieser
Kenntnis und ihr Alter. **Es trägt keinen Produktwert.** Modell, Engine und Speicherbudget
stehen im Spiegel und nur dort, `.ara/knowledge/live-knowledge.de.md`.

**Es sagt nichts über den Zustand eines einzelnen Geräts.** Benutzer, Dokumente, Freigaben
und Einstellungen sind keine Hardware, und ein Werksreset löscht sie, ohne die Signatur zu
berühren.

## Woran das Kit es erkennt

| Befund | Was erwartet wird |
| --- | --- |
| `/sys/class/dmi/id/product_name` | ein Produktname mit `DGX Spark` darin |
| `/sys/class/dmi/id/sys_vendor` | `NVIDIA` |
| `nvidia-smi` | antwortet und nennt die Grafikeinheit |
| `uname -srm` | `Linux`, Architektur `aarch64` |

Gegriffen werden `dgx spark`, das Wort `spark` und `gb10` im Modell oder in der Grafikzeile.
`gb10` steht dort, weil das Kit diese Zeichenfolge seit seinem ersten Selbsttest mitführt;
an einem Gerät geprüft wurde sie nie.

## Was "bald" hier heißt

Das Urteil für dieses Gerät ist **bald**, nicht unterstützt. Der Katalog führt ein Profil,
und ein Profil ist kein erprobtes Gerät. Was daraus folgt, steht in
`.ara/knowledge/identify-device.de.md`: die Stufe im Feld `verification` entscheidet, und
ein Partner, der ein solches Gerät beim Kunden aufstellt, sagt das vorher und nicht
hinterher.

## Was das Kit hier nicht weiß

Ob das Katalogprofil an echter Hardware verifiziert wurde oder nur nach Herstellerdoku
gebaut ist, steht im Katalog, und `/device` liest es vor jedem Lauf aus dem Spiegel. Dieses
Blatt greift dem nicht vor.
