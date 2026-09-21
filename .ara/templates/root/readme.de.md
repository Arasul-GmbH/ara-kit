# {{name}}

Die Wurzel von {{name}}: was stimmt und wo etwas liegt. Angelegt am {{today}} mit dem
Ara-Kit, Version {{kit_version}}.

Starte deinen Agenten hier, oder in einem der Ordner direkt darunter:

```
cd <dieser Ordner>
claude
```

Die Regeln stehen in `.claude/CLAUDE.md`, die eingebetteten Orte in `.claude/places.json`.
Ob die Wurzel sich widerspricht, sagt:

```
node .claude/scripts/check.mjs
```

Nichts in diesem Ordner läuft von selbst. Die Grenze zu den Orten und die Erlaubnisregeln
liegen in `.claude/proposal/` als Vorschlag. Sie wirken erst, wenn ein Mensch sie angesehen
und in seine eigenen Einstellungen angemeldet hat.

## Erste Schritte

1. Den Kommentar oben in `.claude/CLAUDE.md` durch drei Sätze über das Haus ersetzen.
2. Die fehlenden Orte in `.claude/places.json` nennen.
3. Die Prüfung laufen lassen.
