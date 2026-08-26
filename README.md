# Ara-Kit

Das Kit wird ab dem 26.08.2026 umgebaut: Es wird offen unter Apache 2.0 und arbeitet künftig auch ohne Arasul auf dem Gerät. Bis dahin gilt dieses README mit Vorbehalt.

Dein Werkzeugkasten, um Arasul-Geräte bei Kunden aufzusetzen und zu betreuen.

## Loslegen

**1. Terminal öffnen und in diesen Ordner wechseln.**

```
cd ~/Downloads/ara-kit
```

Auf dem Mac findest du das Terminal über die Spotlight-Suche, unter Windows heißt es
Eingabeaufforderung oder PowerShell. Liegt der Ordner woanders, pass den Pfad an.

**2. Claude Code starten.**

```
claude
```

Noch nicht installiert? Einmalig `npm install -g @anthropic-ai/claude-code`, danach steht
der Befehl überall zur Verfügung.

Wenn du lieber in VS Code arbeitest: dort **Datei, Ordner öffnen** wählen, diesen Ordner
auswählen, das eingebaute Terminal öffnen und `claude` eingeben. Cursor und Codex
funktionieren ebenfalls, am rundesten läuft es in Claude Code.

**3. `/start` eingeben.**

Ara stellt dir Fragen zu dir, deinem Rechner und deinen Zugängen. Du klickst die Antworten
an, tippen musst du fast nichts. Rechne mit einer knappen halben Stunde. Danach ist das Kit
auf dich eingerichtet, und du legst deinen ersten Kunden an.

## Was du brauchst

- **Claude Code** (oder Cursor/Codex, am besten läuft es in Claude Code)
- **Node.js** ab Version 20
- **ssh** (auf macOS und Linux bereits vorhanden)
- Deinen **Arasul-Lizenztoken** aus dem Partner-Portal

Ob dein Rechner soweit ist, prüft `/start` selbst. Du musst nichts davon vorher
installieren.

## Was du damit tust

| Command | Wofür |
|---|---|
| `/start` | Einmalig einrichten |
| `/customer <name>` | Kunde anlegen oder öffnen |
| `/kalkulation` | Deine Preise hinterlegen, einmal, danach rechnet Ara ohne Rückfrage |
| `/angebot <kunde>` | Angebot mit allen fünf Anlagen, als PDF in deinem Namen |
| `/setup <kunde>` | Gerät einrichten, von der Vorbereitung bis zur Abnahme |
| `/maintain <kunde>` | Laufendes Gerät betreuen |

Alles andere sagst du in normaler Sprache: „was steht an", „rechne mir das für zwölf
Leute", „bei Müller antwortet der Chat nicht".

## Was wohin gehört

| Ordner | Inhalt |
|---|---|
| `customers/` | Deine Kunden, ihre Geräte, Laufzettel und Unterlagen |
| `business/` | Dein Profil, Firmendaten, Preise, Notizen und deine eigenen Geräte |

Diese beiden Ordner gehören dir. Ein Update des Kits (`git pull`) fasst sie nie an, sie
sind von der Versionskontrolle ausgenommen. Alles andere ist Werkzeug und wird mit
Updates erneuert.

Zwei Ordner solltest du kennen, auch wenn du sie nicht bearbeitest:

| Ordner | Inhalt |
|---|---|
| `.ara/vorlagen/` | Das Papier, das du deinem Kunden gibst: Angebot, Anlagen, Übergabeprotokoll |
| `.ara/nachweise/` | Nachweise zu KI-Einstufung und Datenverarbeitung. Anlagen 4 und 5 zu jedem Angebot |

Der Absender im Angebot ist immer deine Firma. Was `/angebot` daraus macht, wird mit
`node .ara/tools/pdf.mjs` zum PDF, und das weigert sich, solange noch ein ungefüllter
Platzhalter im Text steht.

## Aktualisieren

```
node .ara/tools/update.mjs
```

Holt den aktuellen Stand und ersetzt nur die mitgelieferten Teile. Deine Kunden, deine
Geschäftsdaten und deine Zugänge bleiben unberührt. Vorher nachsehen, ob es überhaupt
etwas Neues gibt, geht mit `node .ara/tools/update.mjs --check`.

Wer das Kit mit git geklont hat, kann stattdessen `git pull` benutzen. Beides führt zum
selben Ergebnis.

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
