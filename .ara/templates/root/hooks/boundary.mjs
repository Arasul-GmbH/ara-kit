#!/usr/bin/env node
/**
 * PreToolUse: from a session in this root nothing is written into an embedded place.
 *
 * The reason is always the same: a session in the root does not load the rules of the
 * place. A repository has its own CLAUDE.md, its skills and its hooks, a shared folder
 * has people who work in it. Whoever wants to change something there starts a session
 * there. Reading is free. A place that carries `write: yes` in .claude/places.json is
 * exempt, that is a decision of the house and stands there for everybody to read.
 *
 * REACH, expressly: a hook does not see into a process. `node script.mjs <place>` is
 * invisible here. The boundary works against tool and shell writes, not against the
 * house's own scripts. Whoever takes it for tighter is wrong.
 *
 * Checked is not whether a place occurs SOMEWHERE in the command, but whether it is the
 * OPERAND of a writing command. A guard that is regularly wrong stops working.
 * Cases in .claude/scripts/boundary-test.mjs.
 *
 * === deutsch ===
 *
 * PreToolUse: aus einer Sitzung in dieser Wurzel wird in keinen eingebetteten Ort
 * geschrieben.
 *
 * Der Grund ist immer derselbe: eine Sitzung in der Wurzel lädt die Regeln des Ortes
 * nicht. Ein Repository hat seine eigene CLAUDE.md, seine Skills und seine Hooks, ein
 * geteilter Ordner hat Menschen, die darin arbeiten. Wer dort etwas ändern will, startet
 * dort eine Sitzung. Lesen ist frei. Ein Ort, der in .claude/places.json `write: yes`
 * trägt, ist ausgenommen, das ist eine Entscheidung des Hauses und steht dort für alle
 * lesbar.
 *
 * REICHWEITE, ausdrücklich: ein Hook sieht nicht in einen Prozess. `node skript.mjs <ort>`
 * ist hier unsichtbar. Die Grenze wirkt gegen Werkzeug- und Shell-Schreibzugriffe, nicht
 * gegen die eigenen Skripte des Hauses. Wer sie für dichter hält, irrt.
 *
 * Geprüft wird nicht, ob ein Ort IRGENDWO im Befehl vorkommt, sondern ob er der OPERAND
 * eines schreibenden Befehls ist. Ein Wächter, der regelmäßig falsch liegt, hört auf zu
 * wirken. Fälle in .claude/scripts/boundary-test.mjs.
 */

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

const GERMAN = readJson(join(ROOT, ".claude", "root.json"), {}).language === "de";
const t = (en, de) => (GERMAN ? de : en);

function expand(path, base = ROOT) {
  if (path === "~" || path.startsWith("~/")) return join(homedir(), path.slice(1));
  return isAbsolute(path) ? path : resolve(base, path);
}

/**
 * The path behind every link. A place that hangs in this root as a link is the
 * same place, and a write through the link is a write into it. What does not
 * exist yet is resolved from its nearest existing parent.
 */
function real(path) {
  const rest = [];
  let at = path;
  while (!existsSync(at) && dirname(at) !== at) {
    rest.unshift(basename(at));
    at = dirname(at);
  }
  try {
    return join(realpathSync(at), ...rest);
  } catch {
    return path;
  }
}

// BOUNDARY_PLACES lets the test bring its own list, so that it does not depend
// on the places of this root.
const LIST = readJson(process.env.BOUNDARY_PLACES || join(ROOT, ".claude", "places.json"), { places: [] });
const CLOSED = (LIST.places || [])
  .filter((place) => place.local && place.write !== "yes")
  .map((place) => ({ name: place.name, path: real(expand(place.local)) }));

function placeOf(given) {
  const path = real(given);
  for (const place of CLOSED) {
    const inside = relative(place.path, path);
    if (inside === "" || (!inside.startsWith("..") && !isAbsolute(inside))) return place.name;
  }
  return null;
}

/** Does this operand point into a closed place? */
function hits(value, cwd) {
  if (!value || value.startsWith("-")) return null;
  // An address contains the name of a repository and is no path. A sed script
  // like s|place/x|y| contains pipes and is no path.
  if (value.includes("://") || value.includes("|")) return null;
  return placeOf(expand(value, cwd));
}

// Per command: how many leading operands are NO target. With sed and perl the
// first one is the script, with chmod and chown the mode.
const TARGETS_FROM = {
  rm: 0, mv: 0, cp: 0, mkdir: 0, rmdir: 0, touch: 0, chmod: 1, chown: 1, dd: 0,
  truncate: 1, tee: 0, ln: 0, patch: 0, install: 0, rsync: 0, sed: 1, perl: 1,
};
// Expressly NOT here: node, python3, awk. Their arguments are no targets, and
// a hook does not see into their process anyway, see REACH above.
const GIT_WRITES = new Set([
  "add", "commit", "push", "pull", "merge", "rebase", "reset", "revert", "checkout", "switch",
  "restore", "cherry-pick", "apply", "am", "stash", "worktree", "tag", "clean", "rm", "mv",
]);
const REDIRECT = "\u0000>";
const BREAKS = new Set([";", "&&", "||", "|", "&", REDIRECT]);

/** Words of a shell line. `null` on unbalanced quotes, practically always a heredoc. */
function split(command) {
  const words = [];
  let word = "";
  let open = false;
  let quote = null;
  const push = () => {
    if (open) words.push(word);
    word = "";
    open = false;
  };
  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    if (quote) {
      if (c === quote) quote = null;
      else if (c === "\\" && quote === '"' && i + 1 < command.length) word += command[++i];
      else word += c;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      open = true;
    } else if (c === "\\" && i + 1 < command.length) {
      word += command[++i];
      open = true;
    } else if (/\s/.test(c)) {
      push();
    } else if (c === ">") {
      // A redirect outside of quotes. Inside of quotes it is text: a commit
      // message may say "a > b" without anything being written anywhere.
      push();
      if (command[i + 1] === ">") i += 1;
      if (command[i + 1] === "&") i += 1;
      words.push(REDIRECT);
    } else if (c === ";" || c === "|" || c === "&") {
      push();
      const two = command.slice(i, i + 2);
      if (two === "&&" || two === "||") {
        words.push(two);
        i += 1;
      } else {
        words.push(c);
      }
    } else {
      word += c;
      open = true;
    }
  }
  if (quote) return null;
  push();
  return words;
}

function bashBlocked(command) {
  let cwd = ROOT;
  const words = split(command);
  if (!words) {
    // Unbalanced quotes, practically always a heredoc. Its body is text, no
    // command. What can honestly be had here is the redirect in front of it,
    // `cat <<EOF > place/x`, more not, see REACH.
    for (const match of command.matchAll(/>>?\s*([^\s;|&]+)/g)) {
      const place = hits(match[1].replace(/^["']|["']$/g, ""), cwd);
      if (place) return place;
    }
    return null;
  }

  let i = 0;
  while (i < words.length) {
    const word = words[i].replace(/^\(+/, "");
    if (["sudo", "command", "env", "nohup", "time", "then", "do"].includes(word)) {
      i += 1;
      continue;
    }
    if (word === REDIRECT) {
      const place = hits(words[i + 1] || "", cwd);
      if (place) return place;
      i += 2;
      continue;
    }
    if (word === "cd") {
      const target = words[i + 1];
      if (target && !BREAKS.has(target)) cwd = expand(target, cwd);
      i += 2;
      continue;
    }
    if (word === "git") {
      let j = i + 1;
      let at = cwd;
      while (j < words.length) {
        if (words[j] === "-C") {
          at = expand(words[j + 1] || "", at);
          j += 2;
          continue;
        }
        if (words[j].startsWith("-")) {
          j += 1;
          continue;
        }
        break;
      }
      const place = placeOf(at);
      if (place && GIT_WRITES.has(words[j] || "")) return place;
      i = j + 1;
      continue;
    }
    if (word in TARGETS_FROM) {
      const operands = [];
      let j = i + 1;
      // Eight operands at most: a real write command never has eight targets,
      // a commit message split into words easily has twenty.
      while (j < words.length && operands.length < 8 && !BREAKS.has(words[j])) {
        if (words[j] && !words[j].startsWith("-")) operands.push(words[j]);
        j += 1;
      }
      for (const operand of operands.slice(TARGETS_FROM[word])) {
        const place = hits(operand, cwd);
        if (place) return place;
      }
      // Not past the word that ended the operands: it may be a redirect.
      i = j;
      continue;
    }
    i += 1;
  }
  return null;
}

function hint(place) {
  return t(
    `From this root nothing is written into the place '${place}'. Start a session in the place itself, its own rules apply there. What the place has to be able to do stands here, in roadmap/${place}.md and on a card.`,
    `Aus dieser Wurzel wird nicht in den Ort '${place}' geschrieben. Starte eine Sitzung im Ort selbst, dort gelten seine eigenen Regeln. Was der Ort können muss, steht hier, in roadmap/${place}.md und auf einer Karte.`
  );
}

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);

let event;
try {
  event = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
} catch {
  process.exit(0);
}

const tool = event.tool_name || "";
const input = event.tool_input || {};
let place = null;
if (["Write", "Edit", "NotebookEdit"].includes(tool)) {
  const path = input.file_path || input.notebook_path || "";
  place = path ? placeOf(expand(path)) : null;
} else if (tool === "Bash") {
  place = bashBlocked(String(input.command || ""));
}

if (place) {
  console.error(hint(place));
  process.exit(2);
}
process.exit(0);
