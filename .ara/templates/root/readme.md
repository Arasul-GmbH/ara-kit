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

## The bridge to the device

`arasul.mjs` in this folder runs with Node alone. `node arasul.mjs login <address> --user
<name>` has the device issue a credential for this computer, keeps it in `~/.config/arasul/`,
shows the proposals for hooks and rules and lets you approve each one by its checksum. After
that `apps` lists the apps that are assigned to you and `call <app> <route>` asks one of
them. What the agent may do without asking is in the proposal, and the skill `arasul` in
`.claude/skills/` tells it how to use the two.

`node arasul.mjs sync` lays the folders the device shares with you at their real place in
this tree, and `status` says per folder when it was last synced and how many conflicts lie
in it. The syncing is done by the command line client of the file service, which asks for
your password and keeps it nowhere. A folder that arrives new at the top of this root wants
a line in the table of `.claude/CLAUDE.md`, and `sync` says which ones.

## First steps

1. Replace the comment at the top of `.claude/CLAUDE.md` with three sentences about the house.
2. Name the places that are missing in `.claude/places.json`.
3. Run the check.
