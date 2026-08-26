#!/usr/bin/env node
/**
 * Kit auf den aktuellen Stand bringen.
 *
 * Holt den Stand aus dem Arasul-Repo und ersetzt nur, was Arasul gehoert: `.ara/`
 * und das Minimum von `.claude/` (CLAUDE.md, settings.json, commands/init.md,
 * skills/). Alles andere bleibt liegen: business/, customers/, devices/, apps/,
 * die erzeugten Befehle unter .claude/commands/, der Spiegel, der Merker, die .env.
 *
 *   node .ara/tools/update.mjs           Stand holen, Aenderung zeigen, einspielen
 *   node .ara/tools/update.mjs --check   nur zeigen, was sich aendern wuerde
 *   node .ara/tools/update.mjs --json    dasselbe als JSON, fuer die Auswertung
 *
 * Braucht kein git und kein Upstream-Remote: die Quelle ist ein Tarball ueber
 * HTTPS. Darum laeuft es auch in einem Fork, der von Arasuls Repo nichts weiss.
 * Wer das Kit mit git fuehrt, sieht die Aenderung danach in `git status` und
 * committet sie wie jede andere.
 *
 * Nach dem Einspielen: `node .ara/tools/commands.mjs`, damit neue oder geaenderte
 * Befehle aus .ara/commands/ nach .claude/commands/ kommen. Das macht /init.
 */

import { spawn } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { Readable } from "node:stream";
import { ROOT, parseArgs } from "./lib/kit.mjs";

const SOURCE =
  process.env.ARA_KIT_SOURCE ||
  "https://codeload.github.com/Arasul-GmbH/ara-kit/tar.gz/refs/heads/main";

// Was Arasul gehoert und beim Update ersetzt wird. Alles andere gehoert dem
// Nutzer und wird nie angefasst.
const MANAGED = [
  ".ara",
  join(".claude", "CLAUDE.md"),
  join(".claude", "settings.json"),
  join(".claude", "commands", "init.md"),
  join(".claude", "skills"),
];

// Innerhalb von .ara entsteht das hier erst beim Nutzer und wird nicht mitgeliefert.
const SKIP = [join(".ara", "mirror"), join(".ara", "state.json")];

const arg = parseArgs();

function skipped(rel) {
  return SKIP.some((s) => rel === s || rel.startsWith(s + "/"));
}

/** Alle Dateien unter einem Pfad, relativ zur Wurzel. Eine Datei zaehlt als sich selbst. */
function listFiles(root, rel) {
  const abs = join(root, rel);
  if (!existsSync(abs)) return [];
  if (statSync(abs).isFile()) return skipped(rel) ? [] : [rel];
  const out = [];
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    const child = join(rel, entry.name);
    if (skipped(child)) continue;
    if (entry.isDirectory()) out.push(...listFiles(root, child));
    else out.push(child);
  }
  return out;
}

function same(a, b) {
  return readFileSync(a).equals(readFileSync(b));
}

/** Was sich zwischen dem geholten Stand und dem Kit unterscheidet. */
export function compare(fresh, kit) {
  const added = [];
  const changed = [];
  const removed = [];
  for (const entry of MANAGED) {
    const here = new Set(listFiles(kit, entry));
    const there = listFiles(fresh, entry);
    for (const rel of there) {
      if (!here.has(rel)) added.push(rel);
      else if (!same(join(fresh, rel), join(kit, rel))) changed.push(rel);
      here.delete(rel);
    }
    removed.push(...here);
  }
  return { added: added.sort(), changed: changed.sort(), removed: removed.sort() };
}

/** Spielt den Unterschied ein. Nur die genannten Dateien, nichts daneben. */
export function apply(fresh, kit, diff) {
  for (const rel of [...diff.added, ...diff.changed]) {
    mkdirSync(dirname(join(kit, rel)), { recursive: true });
    cpSync(join(fresh, rel), join(kit, rel));
  }
  for (const rel of diff.removed) {
    rmSync(join(kit, rel), { force: true });
    // Leere Ordner, die nur wegen dieser Datei da waren, gehen mit.
    let dir = dirname(join(kit, rel));
    while (dir !== kit && existsSync(dir) && readdirSync(dir).length === 0) {
      rmSync(dir, { recursive: true });
      dir = dirname(dir);
    }
  }
}

async function download(target) {
  const response = await fetch(SOURCE, {
    redirect: "follow",
    headers: { "User-Agent": "ara-kit-update" },
  });
  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? "Die Quelle wurde nicht gefunden. Ist die Adresse noch richtig?"
        : `Die Quelle antwortet mit Status ${response.status}.`
    );
  }
  if (!response.body) throw new Error("Die Antwort war leer.");

  await new Promise((done, failed) => {
    const tar = spawn("tar", ["-xzf", "-", "-C", target, "--strip-components=1"], {
      stdio: ["pipe", "ignore", "pipe"],
    });
    let message = "";
    tar.stderr.on("data", (chunk) => (message += chunk.toString()));
    tar.on("error", failed);
    tar.on("close", (code) =>
      code === 0
        ? done()
        : failed(new Error(`Das Auspacken ist fehlgeschlagen: ${message.trim() || `Code ${code}`}`))
    );
    Readable.fromWeb(response.body).pipe(tar.stdin);
  });
}

function describe(diff) {
  const lines = [];
  for (const rel of diff.added) lines.push(`neu        ${rel}`);
  for (const rel of diff.changed) lines.push(`geaendert  ${rel}`);
  for (const rel of diff.removed) lines.push(`entfernt   ${rel}`);
  return lines.join("\n");
}

const work = mkdtempSync(join(tmpdir(), "ara-kit-update-"));

try {
  if (!arg.json) console.log("Hole den aktuellen Stand ...");
  await download(work);

  if (!existsSync(join(work, ".ara", "tools", "update.mjs"))) {
    throw new Error("Der geholte Stand sieht nicht wie das Ara-Kit aus, es fehlt .ara/tools/. Nichts eingespielt.");
  }

  const diff = compare(work, ROOT);
  const total = diff.added.length + diff.changed.length + diff.removed.length;

  if (arg.json) {
    console.log(JSON.stringify({ source: SOURCE, applied: !arg.check && total > 0, ...diff }, null, 2));
    if (arg.check || total === 0) process.exit(0);
  } else if (total === 0) {
    console.log("Alles aktuell. Nichts zu tun.");
    process.exit(0);
  } else if (arg.check) {
    console.log(
      [
        `Es gibt einen neueren Stand, ${total} Datei(en) betroffen:`,
        describe(diff),
        "",
        "Einspielen mit: node .ara/tools/update.mjs",
      ].join("\n")
    );
    process.exit(0);
  }

  apply(work, ROOT, diff);

  if (!arg.json) {
    console.log(
      [
        `Eingespielt, ${total} Datei(en):`,
        describe(diff),
        "",
        "Nicht angefasst: business/, customers/, devices/, apps/, deine Zugaenge,",
        "der Spiegel und die erzeugten Befehle unter .claude/commands/.",
        "",
        "Weiter mit: node .ara/tools/commands.mjs   (neue oder geaenderte Befehle)",
        "Pruefen mit: node .ara/tools/selftest.mjs",
      ].join("\n")
    );
  }
} catch (error) {
  console.error(`Update fehlgeschlagen.\n${error.message}`);
  process.exit(1);
} finally {
  rmSync(work, { recursive: true, force: true });
}
