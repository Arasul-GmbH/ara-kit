# The kit under Codex

The kit runs in Codex and in Claude Code from the same files. This sheet is for the moments when
something under Codex does not work as the other sheets write it. **As of 2026-10-01, measured
with Codex 0.159.3** in a fresh clone, interactive, in the normal mode. The stage of a Codex
feature can change; the self-test checks the one that matters most (`codex features list`).

## How the kit is wired

| What | Where | Why it is there |
|---|---|---|
| The rules | `AGENTS.md` | Codex reads it by itself. `.claude/CLAUDE.md` holds only `@../AGENTS.md`. |
| The commands | `.agents/skills/<name>/SKILL.md`, called `$name` | Codex knows no commands of its own, only skills. `init` is tracked, the others `commands.mjs` writes from `.ara/commands/`. |
| The other skills | `.agents/skills/`, linked from `.claude/skills/` | One copy for both agents. |
| The guard | `.codex/hooks.json` | Runs `guard.mjs` before every shell call, like the hook in `.claude/settings.json`. |
| Network, interview tool, browser | `.codex/config.toml` | Sandbox with network, `request_user_input` in the normal mode, the browser of `.mcp.json`. |
| One exception to the sandbox | `.codex/rules/ara.rules` | `commands.mjs` may write `.agents/skills` outside it. |

## The first start

Codex asks two things once, and the kit needs both answers to be yes:

1. **Trust this folder.** Before that Codex loads the skills and nothing else: no `config.toml`,
   no hook, no rule. The warning says so.
2. **Hooks need review.** The guard is new to Codex. Choose "Trust all and continue", or open
   the review and press `t`. Without it the guard does not run, and the only thing between an
   agent and `cat .env` is its own care. Codex asks again when `.codex/hooks.json` changes.

A Git worktree of the kit is no clone for this: in the test, Codex did not run the hooks of a
worktree whose main checkout had none. Use a plain clone.

## The interview tool

`request_user_input`, at most three questions with two or three options each, no multiple choice.
Codex adds "None of the above" with a notes field itself, that is the free text, and what is
written there holds. The persona says how to split a round and how to ask multiple choice.

In the normal mode the tool needs `features.default_mode_request_user_input = true`, which
`.codex/config.toml` sets. Stage "under development". If a call fails or the tool is not offered:

1. Say so in one sentence, and ask the human to run this phase in the plan mode of Codex. There
   the tool is stable.
2. If that does not work either: numbered options in the text, one block, and the human answers
   with a number or in their own words.

A sub-agent cannot ask under Codex, only the main thread can. In `codex exec` there is no tool
at all, a call is refused: `/init` goes there through `node .ara/tools/init.mjs --answers <file>`,
everything else stops and says what is missing.

## What the sandbox changes

Codex runs the shell in a sandbox that writes only into the kit folder.

- **Network** is off by default. `.codex/config.toml` switches it on, so `ssh`, `gh`, the
  installer download and the browser work. Measured: `remote.mjs` reached a device over SSH, and
  without the switch `ssh` stopped with "Operation not permitted".
- **`.agents/`, `.codex/` and `.git/` are read-only** inside the sandbox, whatever the switches
  say. `commands.mjs` writes the commands as skills into `.agents/skills`, and `.codex/rules/ara.rules`
  lets that one call run outside the sandbox. `update.mjs` replaces files in all three folders:
  it checks first, stops with "Nothing deployed" and leaves the kit as it was, and Codex can then
  ask the human whether it may run outside the sandbox. The answer is a yes to that one call.
- **`~/.ssh/known_hosts` cannot be written.** A device that is new to this computer connects, but
  SSH prints "Failed to add the host to the list of known hosts" every time and remembers nothing.
  One `ssh <device>` in the human's own terminal fixes it. The private key is only read.
- **The browser** is the same Playwright server as under Claude Code, set in `.codex/config.toml`
  with `default_tools_approval_mode = "approve"`. Without that line every browser call asks.

## What is narrower than under Claude Code

Say it as it is when somebody asks.

- The questions: three per round instead of four, two or three options instead of four, no
  multiple choice, no preview sketch. The lists "What must be clear" are the same, so an
  interview takes more rounds here, and the sketch of a layout option stands in a line of its
  description.
- The permissions: Claude Code has a deny list in `.claude/settings.json` (it starts without
  asking, `.ara/knowledge/security.md`, "The hard guard"), Codex has none of it. The guard is the one fence against reading `.env` and private keys, and it is a text
  search on shell calls. It also stops `remote.mjs --command "rm -rf /"`, but a call built around
  it gets past.
- The first start asks two questions more, and `update.mjs` asks for one more approval.
- `/root` and its enrolment into `~/.claude` are Claude Code only for now.
- The interview tool in the normal mode and the guard rest on a stage and on a review that Codex
  can change.
