#!/usr/bin/env node
/**
 * The card stack: one file per card, the folder is the state.
 *
 *   node .claude/scripts/cards.mjs list
 *   node .claude/scripts/cards.mjs new --title "One sentence, what it would be" --place <place>
 *   node .claude/scripts/cards.mjs move <slug> ready|running|done [--result green|red|dropped]
 *
 * `new` puts a card into new/. `move` checks what the target column demands: from ready
 * on the fields ref, rank, assumption and done, in running one card per place at a time,
 * in done a result. In a git repository a move is a `git mv` and a commit of its own, so
 * the history says when a card went where.
 *
 * === deutsch ===
 *
 * Der Kartenstapel: eine Datei je Karte, der Ordner ist der Status.
 *
 *   node .claude/scripts/cards.mjs list
 *   node .claude/scripts/cards.mjs new --title "Ein Satz, was es wäre" --place <ort>
 *   node .claude/scripts/cards.mjs move <slug> ready|running|done [--result green|red|dropped]
 *
 * `new` legt eine Karte nach new/. `move` prüft, was die Zielspalte verlangt: ab ready die
 * Felder ref, rank, assumption und done, in running eine Karte je Ort gleichzeitig, in
 * done ein Ergebnis. In einem Git-Repository ist eine Bewegung ein `git mv` und ein
 * eigener Commit, damit die Historie sagt, wann eine Karte wohin ging.
 */

import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const STACK = join(ROOT, "roadmap", "backlog");
const COLUMNS = ["new", "ready", "running", "done"];
const RESULTS = ["green", "red", "dropped"];

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

const GERMAN = readJson(join(ROOT, ".claude", "root.json"), {}).language === "de";
const t = (en, de) => (GERMAN ? de : en);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function head(text) {
  const fields = {};
  const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  for (const line of block ? block[1].split(/\r?\n/) : []) {
    const pair = line.match(/^([a-z_]+)\s*:\s*(.*)$/);
    if (pair) fields[pair[1]] = pair[2].trim();
  }
  return fields;
}

function cards() {
  const out = [];
  for (const column of COLUMNS) {
    const dir = join(STACK, column);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir).filter((n) => n.endsWith(".md")).sort()) {
      out.push({ column, slug: name.slice(0, -3), path: join(dir, name), ...head(readFileSync(join(dir, name), "utf8")) });
    }
  }
  return out;
}

function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function option(argv, name) {
  const at = argv.indexOf(`--${name}`);
  return at >= 0 ? argv[at + 1] : undefined;
}

function places() {
  const list = readJson(join(ROOT, ".claude", "places.json"), { places: [] }).places || [];
  return ["root", ...list.map((place) => place.name)];
}

const [verb, ...rest] = process.argv.slice(2);

if (!verb || verb === "--help" || verb === "-h" || verb === "list") {
  if (verb !== "list") {
    console.log(t(
      "cards.mjs list | new --title <sentence> --place <place> | move <slug> <column> [--result green|red|dropped]",
      "cards.mjs list | new --title <Satz> --place <Ort> | move <slug> <Spalte> [--result green|red|dropped]"
    ));
    process.exit(0);
  }
  const all = cards();
  for (const column of COLUMNS) {
    const here = all
      .filter((card) => card.column === column)
      .sort((a, b) => (a.place || "").localeCompare(b.place || "") || Number(a.rank || 1e9) - Number(b.rank || 1e9));
    console.log(`${column} (${here.length})`);
    for (const card of here) {
      console.log(`  ${(card.place || "?").padEnd(16)} ${String(card.rank || "").padStart(3)}  ${card.slug}: ${card.title || ""}`);
    }
  }
  process.exit(0);
}

if (verb === "new") {
  const title = option(rest, "title");
  const place = option(rest, "place");
  if (!title || !place) fail(t("new needs --title and --place.", "new braucht --title und --place."));
  if (!places().includes(place)) {
    fail(t(
      `The place '${place}' stands neither in .claude/places.json nor is it root. Known: ${places().join(", ")}`,
      `Der Ort '${place}' steht weder in .claude/places.json noch ist er root. Bekannt: ${places().join(", ")}`
    ));
  }
  const slug = (option(rest, "slug") || title)
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  if (cards().some((card) => card.slug === slug)) fail(t(`A card ${slug} exists already.`, `Eine Karte ${slug} gibt es schon.`));
  const path = join(STACK, "new", `${slug}.md`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, [
    "---",
    `title: ${title}`,
    `place: ${place}`,
    `ref: ${option(rest, "ref") || "open"}`,
    "rank:",
    "assumption:",
    "done:",
    `created: ${today()}`,
    `source: ${option(rest, "source") || ""}`.trimEnd(),
    "---",
    "",
    t(
      "What carries it, what speaks against it, condition for the start.",
      "Was daran trägt, was dagegen spricht, Bedingung für den Start."
    ),
    "",
  ].join("\n"));
  console.log(t(`Card created: roadmap/backlog/new/${slug}.md`, `Karte angelegt: roadmap/backlog/new/${slug}.md`));
  process.exit(0);
}

if (verb === "move") {
  const [slug, column] = rest;
  if (!slug || !COLUMNS.includes(column)) fail(t(`move needs a slug and one of ${COLUMNS.join(", ")}.`, `move braucht einen Slug und eine von ${COLUMNS.join(", ")}.`));
  const all = cards();
  const card = all.find((entry) => entry.slug === slug);
  if (!card) fail(t(`No card ${slug}.`, `Keine Karte ${slug}.`));
  if (card.column === column) fail(t(`${slug} lies in ${column} already.`, `${slug} liegt schon in ${column}.`));
  if (card.column === "done") fail(t("A card in done is frozen.", "Eine Karte in done ist eingefroren."));

  if (column === "ready" || column === "running") {
    const missing = ["ref", "rank", "assumption", "done"].filter((field) => !card[field] || (field === "ref" && card.ref === "open"));
    if (missing.length) fail(t(`Missing in the head of ${slug}: ${missing.join(", ")}`, `Im Kopf von ${slug} fehlt: ${missing.join(", ")}`));
  }
  if (column === "ready") {
    const twin = all.find((entry) => entry.column === "ready" && entry.place === card.place && entry.rank === card.rank);
    if (twin) fail(t(`Rank ${card.rank} in ${card.place} is taken by ${twin.slug}.`, `Rang ${card.rank} in ${card.place} hat schon ${twin.slug}.`));
  }
  if (column === "running") {
    const busy = all.find((entry) => entry.column === "running" && entry.place === card.place);
    if (busy) fail(t(`In ${card.place} ${busy.slug} is running already. One card per place at a time.`, `In ${card.place} läuft schon ${busy.slug}. Eine Karte je Ort gleichzeitig.`));
  }
  const result = option(rest, "result");
  if (column === "done" && !RESULTS.includes(result)) fail(t(`done needs --result ${RESULTS.join("|")}.`, `done braucht --result ${RESULTS.join("|")}.`));

  const target = join(STACK, column, `${slug}.md`);
  mkdirSync(dirname(target), { recursive: true });
  const inGit = spawnSync("git", ["ls-files", "--error-unmatch", card.path], { cwd: ROOT, stdio: "ignore" }).status === 0;
  if (inGit) {
    const moved = spawnSync("git", ["mv", card.path, target], { cwd: ROOT, encoding: "utf8" });
    if (moved.status !== 0) fail(moved.stderr);
  } else {
    renameSync(card.path, target);
  }
  if (column === "done") {
    const text = readFileSync(target, "utf8");
    appendFileSync(target, `${text.endsWith("\n") ? "" : "\n"}\nResult: ${result}\n`);
  }
  if (inGit) {
    spawnSync("git", ["add", target], { cwd: ROOT, stdio: "ignore" });
    const commit = spawnSync("git", ["commit", "-m", `card ${slug}: ${card.column} to ${column}`, "--", card.path, target], { cwd: ROOT, encoding: "utf8" });
    if (commit.status !== 0) {
      console.error(t("Moved, but the commit did not go through:", "Verschoben, aber der Commit ging nicht durch:"), commit.stderr.trim());
    }
  }
  console.log(t(`${slug}: ${card.column} to ${column}`, `${slug}: ${card.column} nach ${column}`));
  process.exit(0);
}

fail(t(`Unknown: ${verb}. Known are list, new and move.`, `Unbekannt: ${verb}. Bekannt sind list, new und move.`));
