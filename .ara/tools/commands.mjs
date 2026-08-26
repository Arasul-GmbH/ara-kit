#!/usr/bin/env node
/**
 * Befehle anlegen und nachziehen.
 *
 * Die Quelle der Befehle liegt in .ara/commands/: `alle/` fuer jeden Zweig,
 * `partner/` nur fuer Partner. Claude Code liest Befehle aber nur aus
 * .claude/commands/. Dieses Werkzeug legt die passenden dorthin, und nach einem
 * Update sagt es, welche neu sind und welche sich geaendert haben.
 *
 *   node .ara/tools/commands.mjs                 Lage: was liegt, was fehlt, was abweicht
 *   node .ara/tools/commands.mjs --apply         fehlende anlegen, abweichende ersetzen
 *   node .ara/tools/commands.mjs --role partner  Zweig vorgeben, sonst aus business/profile.md
 *   node .ara/tools/commands.mjs --json          Lage als JSON
 *
 * Getrackt ist nur init.md. Alles andere in .claude/commands/ ist erzeugt und im
 * .gitignore, damit ein Update es nicht ueberschreibt und ein Fork es nicht
 * mitschleppt. Was ein Nutzer dort selbst dazulegt, bleibt unangetastet.
 */

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { BUSINESS, ROOT, fail, parseArgs, readFrontmatter } from "./lib/kit.mjs";

const SOURCE = join(ROOT, ".ara", "commands");
const TARGET = join(ROOT, ".claude", "commands");
const ROLES = ["partner", "company"];

// Zweig zu Quellordner. `alle/` gilt immer.
const BRANCHES = { partner: ["alle", "partner"], company: ["alle"] };

const arg = parseArgs();

function role() {
  if (arg.role) {
    if (!ROLES.includes(arg.role)) fail(`Unbekannter Zweig "${arg.role}". Es gibt: ${ROLES.join(", ")}.`);
    return arg.role;
  }
  const profile = readFrontmatter(join(BUSINESS, "profile.md"));
  if (!profile.exists) {
    fail(
      "Der Zweig steht noch nicht fest: business/profile.md fehlt. Entweder /init durchlaufen " +
        "oder den Zweig angeben: --role partner oder --role company."
    );
  }
  if (!ROLES.includes(profile.fields.role)) {
    fail(
      `business/profile.md nennt als Zweig "${profile.fields.role || ""}", erwartet wird ` +
        `${ROLES.join(" oder ")}. Im Profil berichtigen oder --role angeben.`
    );
  }
  return profile.fields.role;
}

function list(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => name.endsWith(".md")).sort();
}

/** Lage je Befehl: fehlt, aktuell, weicht ab. Dazu, was im Ziel liegt und nicht aus dem Kit stammt. */
export function survey(branch) {
  const expected = [];
  for (const group of BRANCHES[branch]) {
    for (const name of list(join(SOURCE, group))) {
      const from = join(SOURCE, group, name);
      const to = join(TARGET, name);
      let state = "missing";
      if (existsSync(to)) {
        state = readFileSync(from).equals(readFileSync(to)) ? "current" : "differs";
      }
      expected.push({ name: name.replace(/\.md$/, ""), group, from, to, state });
    }
  }
  const known = new Set(expected.map((e) => e.name));
  const foreign = list(TARGET)
    .map((name) => name.replace(/\.md$/, ""))
    .filter((name) => name !== "init" && !known.has(name));
  return { role: branch, commands: expected, foreign };
}

const branch = role();
const lage = survey(branch);
const missing = lage.commands.filter((c) => c.state === "missing");
const differs = lage.commands.filter((c) => c.state === "differs");

if (arg.apply) {
  mkdirSync(TARGET, { recursive: true });
  for (const c of [...missing, ...differs]) cpSync(c.from, c.to);
  for (const c of lage.commands) c.state = "current";
}

if (arg.json) {
  console.log(JSON.stringify({ ...lage, applied: Boolean(arg.apply) }, null, 2));
  process.exit(0);
}

const label = { missing: "fehlt     ", current: "aktuell   ", differs: "weicht ab " };
console.log(`Zweig: ${branch === "partner" ? "Partner" : "Unternehmen"}`);
for (const c of lage.commands) console.log(`${label[c.state]} /${c.name}  (${c.group})`);
for (const name of lage.foreign) console.log(`eigener    /${name}  (nicht aus dem Kit, bleibt liegen)`);

if (arg.apply) {
  const n = missing.length + differs.length;
  console.log(
    n
      ? `\n${missing.length} angelegt, ${differs.length} ersetzt. Erkennt Claude Code einen Befehl noch nicht, hilft ein Neustart der Sitzung.`
      : "\nNichts zu tun, alle Befehle sind aktuell."
  );
} else if (missing.length || differs.length) {
  console.log(
    `\n${missing.length} fehlen, ${differs.length} weichen ab. Anlegen und ersetzen mit: ` +
      "node .ara/tools/commands.mjs --apply"
  );
  if (differs.length) {
    console.log(
      "Ein abweichender Befehl ist entweder im Kit neuer oder hier von Hand geaendert. " +
        "Vor dem Ersetzen vergleichen, sonst geht die eigene Aenderung verloren."
    );
  }
}
