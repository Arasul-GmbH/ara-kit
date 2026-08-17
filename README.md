# Ara-Kit

Dein Werkzeugkasten, um Arasul-Geräte bei Kunden aufzusetzen und zu betreuen.

## Loslegen

1. Diesen Ordner in Claude Code öffnen
2. `/start` eingeben

Das war es. Ara führt dich durch alles Weitere und richtet sich dabei selbst ein.

## Was du brauchst

- **Claude Code** (oder Cursor/Codex, am besten läuft es in Claude Code)
- **Node.js** ab Version 20
- **git** und **ssh** (auf macOS und Linux bereits vorhanden)
- Deinen **Arasul-Lizenztoken** aus dem Partner-Portal

Ob dein Rechner soweit ist, prüft `/start` selbst. Du musst nichts davon vorher
installieren.

## Was du damit tust

| Command | Wofür |
|---|---|
| `/start` | Einmalig einrichten |
| `/customer <name>` | Kunde anlegen oder öffnen |
| `/setup <kunde>` | Gerät einrichten, von der Vorbereitung bis zur Abnahme |
| `/maintain <kunde>` | Laufendes Gerät betreuen |

Alles andere sagst du in normaler Sprache: „was steht an", „rechne mir das für zwölf
Leute", „bei Müller antwortet der Chat nicht".

## Was wohin gehört

| Ordner | Inhalt |
|---|---|
| `customers/` | Deine Kunden, ihre Geräte, Laufzettel und Unterlagen |
| `business/` | Dein Profil, Firmendaten, Preise und Notizen |

Diese beiden Ordner gehören dir. Ein Update des Kits (`git pull`) fasst sie nie an, sie
sind von der Versionskontrolle ausgenommen. Alles andere ist Werkzeug und wird mit
Updates erneuert.

## Aktualisieren

```
git pull
```

## Wenn etwas merkwürdig ist

```
node .ara/tools/selftest.mjs
```

Prüft in einer halben Minute, ob das Kit auf deinem Rechner funktioniert. Braucht weder
Netz noch Gerät.

## Deine Daten

Das Kit enthält deine Kundendaten und deine Zugänge. Beides verlässt diesen Rechner nicht
von selbst. Zwei Dinge sind trotzdem deine Verantwortung:

- **Festplattenverschlüsselung** einschalten, falls noch nicht geschehen.
- **Sicherung** einrichten, `/start` bietet dir dafür ein eigenes privates Repository an.
  Ohne läuft deine Arbeit ohne Historie und ohne Rückweg.

Geheimnisse (Lizenztoken, Passwörter) liegen wahlweise in einer `.env` im Kit oder im
Schlüsselbund deines Betriebssystems. Deine SSH-Schlüssel bleiben immer dort, wo sie
hingehören: in `~/.ssh`. Das Kit merkt sich nur, wie sie heißen.
