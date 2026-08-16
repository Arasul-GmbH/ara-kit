# Ara-Kit

Dein Werkzeugkasten, um Arasul-Geräte bei Kunden aufzusetzen und zu betreuen.

## Loslegen

1. Diesen Ordner in Claude Code öffnen
2. `/start` eingeben

Das war es. Ara führt dich durch alles Weitere und richtet sich dabei selbst ein.

## Was du brauchst

- **Claude Code** (oder Cursor/Codex — am besten läuft es in Claude Code)
- **Node.js** ab Version 20
- **git** und **ssh** (auf macOS und Linux bereits vorhanden)
- Deinen **Arasul-Lizenztoken** aus dem Partner-Portal

Ob dein Rechner soweit ist, prüft `/start` selbst. Du musst nichts davon vorher installieren.

## Was wohin gehört

| Ordner | Inhalt |
|---|---|
| `kunden/` | Deine Kunden, ihre Geräte, Laufzettel und Unterlagen |
| `mein/` | Deine Firmendaten, Preise und Notizen |

Diese beiden Ordner gehören dir. Ein Update des Kits (`git pull`) fasst sie nie an.
Alles andere ist Werkzeug und wird mit Updates erneuert.

## Aktualisieren

```
git pull
```

## Wenn etwas merkwürdig ist

```
node .ara/werkzeuge/selbsttest.mjs
```

Prüft in einer halben Minute, ob das Kit auf deinem Rechner funktioniert. Braucht weder
Netz noch Gerät.

## Wichtig

Das Kit enthält deine Kundendaten und über `.env` deine Zugänge. Beides ist von der
Versionskontrolle ausgenommen und verlässt diesen Rechner nicht von selbst. Aktivier die
Festplattenverschlüsselung deines Rechners, wenn du sie noch nicht anhast.
