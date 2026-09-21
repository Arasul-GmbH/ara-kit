# {{name}}

Die Wurzel von {{name}}: was stimmt, was ansteht und wo etwas liegt. Angelegt am
{{today}} mit dem Ara-Kit, Version {{kit_version}}.

Starte deinen Agenten hier, nicht in den einzelnen Orten:

```
cd <dieser Ordner>
claude
```

Die Regeln stehen in `.claude/CLAUDE.md`, die eingebetteten Orte in
`.claude/places.json`. Ob die Wurzel sich widerspricht, sagt:

```
node .claude/scripts/check.mjs
```

## Erste Schritte

1. Fülle `company/core.md` und `company/goal.md`. Alles andere verweist darauf.
2. Schreibe je Ort ein Ziel in sein Blatt unter `roadmap/`.
3. Lege die ersten drei Vorhaben auf Karten: `node .claude/scripts/cards.mjs new`.
4. Lass die Prüfung laufen.
