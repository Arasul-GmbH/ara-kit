#!/usr/bin/env node
/**
 * Cases for .claude/hooks/boundary.mjs. Exit code 0 means: every case holds.
 *
 * The test brings its own list of places, so it says the same in every root. Every case
 * that is allowed stands here because a guard once refused it wrongly somewhere. Whoever
 * changes the hook adds the case first and watches it fail.
 *
 *   node .claude/scripts/boundary-test.mjs
 *
 * === deutsch ===
 *
 * Fälle für .claude/hooks/boundary.mjs. Rückgabe 0 heißt: jeder Fall hält.
 *
 * Der Test bringt seine eigene Liste von Orten mit, er sagt also in jeder Wurzel dasselbe.
 * Jeder erlaubte Fall steht hier, weil ein Wächter ihn irgendwo einmal zu Unrecht
 * abgewiesen hat. Wer den Hook ändert, ergänzt zuerst den Fall und sieht ihn fallen.
 *
 *   node .claude/scripts/boundary-test.mjs
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const HOOK = join(ROOT, ".claude", "hooks", "boundary.mjs");

const dir = mkdtempSync(join(tmpdir(), "boundary-"));
process.on("exit", () => rmSync(dir, { recursive: true, force: true }));

const closed = join(dir, "closed-repo");
const open = join(dir, "open folder");
const link = join(dir, "link-to-closed");
mkdirSync(closed);
mkdirSync(open);
symlinkSync(closed, link);
const list = join(dir, "places.json");
writeFileSync(list, JSON.stringify({
  places: [
    { name: "closed-repo", kind: "github", where: "https://github.com/example/closed-repo", local: closed, purpose: "test" },
    { name: "open-folder", kind: "folder", where: open, local: open, write: "yes", purpose: "test" },
    { name: "far-away", kind: "folder", where: "https://example.sharepoint.com/sites/far", purpose: "test" },
  ],
}));

const write = (path) => ({ tool_name: "Write", tool_input: { file_path: path } });
const bash = (command) => ({ tool_name: "Bash", tool_input: { command } });

const BLOCKED = 2;
const FREE = 0;
const CASES = [
  ["write into a closed place", write(join(closed, "src", "x.md")), BLOCKED],
  ["write through a link into a closed place", write(join(link, "x.md")), BLOCKED],
  ["edit in a closed place", { tool_name: "Edit", tool_input: { file_path: join(closed, "README.md") } }, BLOCKED],
  ["write in this root", write(join(ROOT, "company", "core.md")), FREE],
  ["write into a place with write: yes", write(join(open, "note.md")), FREE],
  ["read in a closed place", { tool_name: "Read", tool_input: { file_path: join(closed, "README.md") } }, FREE],
  ["rm in a closed place", bash(`rm -rf ${closed}/build`), BLOCKED],
  ["cp into a closed place", bash(`cp company/core.md ${closed}/docs/`), BLOCKED],
  ["redirect into a closed place", bash(`echo x > ${closed}/x.txt`), BLOCKED],
  ["append after a write command", bash(`touch company/x.md >> ${closed}/log.txt`), BLOCKED],
  ["heredoc into a closed place", bash(`cat <<EOF > ${closed}/x.md\nit's text\nEOF`), BLOCKED],
  ["cd into a closed place, then touch", bash(`cd ${closed} && touch x.md`), BLOCKED],
  ["git commit in a closed place", bash(`git -C ${closed} commit -m "x"`), BLOCKED],
  ["cd, then git push", bash(`cd ${closed} && git push`), BLOCKED],
  ["git log in a closed place", bash(`git -C ${closed} log --oneline`), FREE],
  ["ls and cat in a closed place", bash(`ls ${closed} && cat ${closed}/README.md`), FREE],
  ["cd into a closed place, then git status", bash(`cd ${closed} && git status`), FREE],
  ["the place in a sed script, the target in this root", bash(`sed -i '' 's|${closed}/x|y|' company/core.md`), FREE],
  ["the place in a commit message", bash(`git commit -m "goal for ${closed}/api moved > next week"`), FREE],
  ["the place in an address", bash(`curl -s https://example.com${closed}/x`), FREE],
  ["a script gets the place as an argument", bash(`node .claude/scripts/cards.mjs list ${closed}`), FREE],
  ["heredoc with an apostrophe, target in this root", bash(`cat <<EOF > company/note.md\nit's about ${closed}\nEOF`), FREE],
  ["rm in a place with write: yes", bash(`rm "${open}/old.md"`), FREE],
  ["stderr into stdout", bash(`ls ${closed} 2>&1`), FREE],
];

let failed = 0;
for (const [name, event, expected] of CASES) {
  const run = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(event),
    encoding: "utf8",
    cwd: ROOT,
    env: { ...process.env, BOUNDARY_PLACES: list },
  });
  if (run.status !== expected) {
    failed += 1;
    console.error(`FAIL ${name}: ${run.status} instead of ${expected}`);
  }
}

if (failed) {
  console.error(`${failed} of ${CASES.length} cases fail.`);
  process.exit(1);
}
console.log(`${CASES.length} cases, the boundary holds.`);
