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

## Die Brücke zum Gerät

`arasul.mjs` in diesem Ordner läuft mit Node allein. `node arasul.mjs login <adresse> --user
<name>` lässt sich vom Gerät einen Ausweis für diesen Rechner ausstellen, hält ihn in
`~/.config/arasul/`, zeigt die Vorschläge für Hooks und Regeln und lässt dich jeden mit
seiner Prüfsumme freigeben. Danach listet `apps` die Apps, die dir zugewiesen sind, und
`call <app> <route>` fragt eine davon. Was der Agent ohne Rückfrage darf, steht im Vorschlag,
und der Skill `arasul` in `.claude/skills/` sagt ihm, wie er die beiden benutzt.

`node arasul.mjs sync` legt die Ordner, die das Gerät dir freigibt, an ihre echte Stelle in
diesem Baum, und `status` sagt je Ordner, wann zuletzt abgeglichen wurde und wie viele
Konflikte darin liegen. Das Abgleichen tut der Kommandozeilen-Klient des Dateidienstes, der
nach deinem Passwort fragt und es nirgends behält. Ein Ordner, der neu oben in dieser Wurzel
ankommt, will eine Zeile in der Tabelle der `.claude/CLAUDE.md`, und `sync` sagt, welche.

## Erste Schritte

1. Den Kommentar oben in `.claude/CLAUDE.md` durch drei Sätze über das Haus ersetzen.
2. Die fehlenden Orte in `.claude/places.json` nennen.
3. Die Prüfung laufen lassen.
