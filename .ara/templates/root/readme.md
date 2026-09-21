# {{name}}

The root of {{name}}: what is true and where things lie. Laid out on {{today}} with the
Ara-Kit, version {{kit_version}}.

Start your agent here, or in one of the folders directly below:

```
cd <this folder>
claude
```

The rules stand in `.claude/CLAUDE.md`, the embedded places in `.claude/places.json`.
Whether the root contradicts itself says:

```
node .claude/scripts/check.mjs
```

Nothing in this folder runs by itself. The boundary to the places and the permission rules
lie in `.claude/proposal/` as a proposal. They take effect only when a person has looked at
them and enrolled them into their own settings.

## First steps

1. Replace the comment at the top of `.claude/CLAUDE.md` with three sentences about the house.
2. Name the places that are missing in `.claude/places.json`.
3. Run the check.
