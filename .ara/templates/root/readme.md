# {{name}}

The root of {{name}}: what is true, what is due and where things lie. Laid out on
{{today}} with the Ara-Kit, version {{kit_version}}.

Start your agent here, not in the single places:

```
cd <this folder>
claude
```

The rules stand in `.claude/CLAUDE.md`, the embedded places in `.claude/places.json`.
Whether the root contradicts itself says:

```
node .claude/scripts/check.mjs
```

## First steps

1. Fill `company/core.md` and `company/goal.md`. Everything else refers to them.
2. Write one goal per place into its sheet under `roadmap/`.
3. Put the first three undertakings on cards: `node .claude/scripts/cards.mjs new`.
4. Run the check.
