/**
 * Links, also where a computer does not allow them.
 *
 * Two files in the kit are linked: `.claude/skills/<name>` points to `.agents/skills/<name>`, so
 * that Claude Code and Codex read one text. On a Mac and on Linux that is a symlink. On Windows a
 * symlink needs a right an ordinary user does not have, and git writes a link it cannot make as a
 * small file that holds the target as text. Then the skill is simply not there. A junction (a
 * folder link) needs no right; where even that fails, the folder is copied.
 *
 * === deutsch ===
 *
 * Links, auch dort, wo ein Rechner sie nicht erlaubt.
 *
 * Im Kit sind zwei Dinge verlinkt: `.claude/skills/<name>` zeigt auf `.agents/skills/<name>`,
 * damit Claude Code und Codex einen Text lesen. Auf dem Mac und unter Linux ist das ein Symlink.
 * Unter Windows braucht ein Symlink ein Recht, das ein gewöhnlicher Benutzer nicht hat, und git
 * schreibt einen Link, den es nicht machen kann, als kleine Datei, die das Ziel als Text trägt.
 * Dann ist die Fähigkeit schlicht nicht da. Ein Junction (ein Ordnerlink) braucht kein Recht; wo
 * auch das scheitert, wird der Ordner kopiert.
 */
import { cpSync, existsSync, lstatSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

/**
 * Put a link at `path` that points to `target` (as written in a symlink, relative to the folder of
 * `path`). Returns how it was made: "symlink", "junction" or "copy".
 */
export function linkOrCopy(target, path) {
  try {
    symlinkSync(target, path);
    return "symlink";
  } catch (error) {
    if (!["EPERM", "EACCES", "ENOTSUP", "UNKNOWN"].includes(error.code)) throw error;
    const absolute = isAbsolute(target) ? target : resolve(dirname(path), target);
    if (!existsSync(absolute)) throw error;
    try {
      symlinkSync(absolute, path, "junction");
      return "junction";
    } catch {
      cpSync(absolute, path, { recursive: true });
      return "copy";
    }
  }
}

/**
 * Find the links git could not make: a small file in `folder` whose text is the relative path of a
 * folder that exists. Returns the ones it found as `{ path, target }`.
 */
export function brokenLinks(folder) {
  if (!existsSync(folder)) return [];
  const found = [];
  for (const name of readdirSync(folder)) {
    const path = join(folder, name);
    const info = lstatSync(path);
    if (!info.isFile() || info.size > 300) continue;
    const target = readFileSync(path, "utf8").trim();
    if (!target || /[\r\n]/.test(target)) continue;
    const absolute = resolve(folder, target);
    if (existsSync(absolute) && statSync(absolute).isDirectory()) found.push({ path, target });
  }
  return found;
}

/** Make the links again that git left as files. Returns what was made, `{ path, how }`. */
export function repairLinks(folder) {
  const made = [];
  for (const { path, target } of brokenLinks(folder)) {
    rmSync(path, { force: true });
    made.push({ path, how: linkOrCopy(target, path) });
  }
  return made;
}
