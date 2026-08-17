#!/usr/bin/env node
/**
 * Kit aktualisieren.
 *
 * Holt den aktuellen Stand und ersetzt nur die mitgelieferten Teile. Deine Arbeit
 * unter customers und business wird nicht angefasst, ebensowenig deine Zugaenge.
 *
 *   node .ara/tools/update.mjs           aktualisieren
 *   node .ara/tools/update.mjs --check   nur nachsehen, ob es etwas Neues gibt
 *
 * Wer das Kit mit git geklont hat, kann stattdessen "git pull" benutzen. Beides
 * fuehrt zum selben Ergebnis.
 */

import { spawn, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { ROOT, parseArgs } from "./lib/kit.mjs";

const SOURCE =
  process.env.ARA_KIT_SOURCE ||
  "https://codeload.github.com/Arasul-GmbH/ara-kit/tar.gz/refs/heads/main";

// Was mitgeliefert wird und beim Update ersetzt werden darf. Alles andere gehoert
// dem Partner und wird nie angefasst.
const MANAGED = [".ara", ".claude", "README.md", ".mcp.json", ".env.example", ".gitignore"];

// Innerhalb von .ara bleibt der Spiegel liegen, er ist nur ein Zwischenspeicher.
const KEEP = [join(".ara", "mirror")];

const arg = parseArgs();

function currentVersion() {
  const file = join(ROOT, ".ara", "VERSION");
  return existsSync(file) ? readFileSync(file, "utf8").trim() : null;
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

const work = mkdtempSync(join(tmpdir(), "ara-kit-update-"));

try {
  console.log("Hole den aktuellen Stand ...");
  await download(work);

  const newVersion = existsSync(join(work, ".ara", "VERSION"))
    ? readFileSync(join(work, ".ara", "VERSION"), "utf8").trim()
    : null;

  // Was aendert sich? Ein Vergleich ueber diff, wenn vorhanden, sonst nur zaehlen.
  const changed = [];
  for (const entry of MANAGED) {
    const from = join(work, entry);
    const to = join(ROOT, entry);
    if (!existsSync(from)) continue;
    const diff = spawnSync("diff", ["-rq", to, from], { encoding: "utf8" });
    if (diff.status !== 0) changed.push(entry);
  }

  if (!changed.length) {
    console.log(
      `Alles aktuell${newVersion ? ` (Stand ${newVersion})` : ""}. Nichts zu tun.`
    );
    process.exit(0);
  }

  if (arg.check) {
    console.log(
      [
        "Es gibt einen neueren Stand.",
        `Betroffen: ${changed.join(", ")}`,
        newVersion ? `Neuer Stand: ${newVersion}` : "",
        "",
        "Aktualisieren mit: node .ara/tools/update.mjs",
      ]
        .filter(Boolean)
        .join("\n")
    );
    process.exit(0);
  }

  // Den Spiegel beiseitelegen, er wird nicht mitgeliefert.
  const parked = [];
  for (const keep of KEEP) {
    const path = join(ROOT, keep);
    if (!existsSync(path)) continue;
    const stash = join(work, `__keep_${keep.replace(/[\\/]/g, "_")}`);
    cpSync(path, stash, { recursive: true });
    parked.push([stash, path]);
  }

  for (const entry of changed) {
    const from = join(work, entry);
    const to = join(ROOT, entry);
    rmSync(to, { recursive: true, force: true });
    cpSync(from, to, { recursive: true });
  }

  for (const [stash, path] of parked) {
    cpSync(stash, path, { recursive: true });
  }

  const before = currentVersion();
  if (newVersion && newVersion !== before) {
    writeFileSync(join(ROOT, ".ara", "VERSION"), `${newVersion}\n`);
  }

  console.log(
    [
      `Aktualisiert: ${changed.join(", ")}`,
      "Deine Kunden, deine Geschäftsdaten und deine Zugänge wurden nicht angefasst.",
      "",
      "Prüf mit: node .ara/tools/selftest.mjs",
    ].join("\n")
  );
} catch (error) {
  console.error(`Update fehlgeschlagen.\n${error.message}`);
  process.exit(1);
} finally {
  rmSync(work, { recursive: true, force: true });
}
