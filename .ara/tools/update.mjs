#!/usr/bin/env node
/**
 * Bring the kit up to date.
 *
 * Fetches the version from the Arasul repo and replaces only what belongs to
 * Arasul: `.ara/` and the minimum of `.claude/` (CLAUDE.md, settings.json,
 * commands/init.md, skills/). In the company branch what belongs to partners
 * only stays out, see PARTNER_ONLY in lib/commands.mjs. Everything else stays: business/, customers/,
 * devices/, apps/, the generated commands under .claude/commands/, the mirror, the
 * marker, the .env.
 *
 *   node .ara/tools/update.mjs           fetch the version, show the change, deploy it
 *   node .ara/tools/update.mjs --check   only show what would change
 *   node .ara/tools/update.mjs --json    the same as JSON, for the evaluation
 *
 * Needs no git and no upstream remote: the source is a tarball over HTTPS. That is
 * why it also runs in a fork that knows nothing about Arasul's repo. Whoever keeps
 * the kit in git sees the change in `git status` afterwards and commits it like any
 * other.
 *
 * After deploying: `node .ara/tools/commands.mjs`, so that new or changed commands
 * come from .ara/commands/ into .claude/commands/. /init does that.
 *
 * === deutsch ===
 *
 * Kit auf den aktuellen Stand bringen.
 *
 * Holt den Stand aus dem Arasul-Repo und ersetzt nur, was Arasul gehoert: `.ara/`
 * und das Minimum von `.claude/` (CLAUDE.md, settings.json, commands/init.md,
 * skills/). Im Zweig Unternehmen bleibt draussen, was nur Partnern gehoert,
 * siehe PARTNER_ONLY in lib/commands.mjs. Alles andere bleibt liegen: business/, customers/, devices/, apps/,
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
import { basename, dirname, join, relative } from "node:path";
import { Readable } from "node:stream";
import { language, t, variantOf } from "./lib/i18n.mjs";
import { BUSINESS, ROOT, helpOnly, parseArgs, readFrontmatter } from "./lib/kit.mjs";
import { partnerOnly } from "./lib/commands.mjs";
import { KIT_CONTRACT_VERSION } from "./lib/contract.mjs";
import { APPLEDOUBLE, packEnv } from "./lib/install.mjs";
import { contractOf, standBlock } from "./lib/version.mjs";

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

helpOnly(import.meta.url);
const arg = parseArgs();

// Ein Unternehmen bekommt die Partnerware nicht wieder eingespielt, die
// `commands.mjs --apply` bei /init weggeraeumt hat. Die Liste steht in
// lib/commands.mjs, damit beide Werkzeuge dieselbe lesen.
const company = readFrontmatter(join(BUSINESS, "profile.md")).fields.role === "company";

function skipped(rel) {
  if (company && partnerOnly(rel)) return true;
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
        ? t(
            "The source was not found. Is the address still right?",
            "Die Quelle wurde nicht gefunden. Ist die Adresse noch richtig?"
          )
        : t(`The source answers with status ${response.status}.`, `Die Quelle antwortet mit Status ${response.status}.`)
    );
  }
  if (!response.body) throw new Error(t("The answer was empty.", "Die Antwort war leer."));

  await new Promise((done, failed) => {
    // Die ._-Beiwerkdateien von macOS bleiben draußen, hier wie überall, wo das
    // Kit packt oder auspackt.
    const tar = spawn("tar", ["-xzf", "-", "--exclude", APPLEDOUBLE, "-C", target, "--strip-components=1"], {
      stdio: ["pipe", "ignore", "pipe"],
      env: packEnv(),
    });
    let message = "";
    tar.stderr.on("data", (chunk) => (message += chunk.toString()));
    tar.on("error", failed);
    tar.on("close", (code) =>
      code === 0
        ? done()
        : failed(
            new Error(
              t(
                `Unpacking failed: ${message.trim() || `code ${code}`}`,
                `Das Auspacken ist fehlgeschlagen: ${message.trim() || `Code ${code}`}`
              )
            )
          )
    );
    Readable.fromWeb(response.body).pipe(tar.stdin);
  });
}

/** Der Stand eines Kits: die Nummer und die Änderungsliste, aus einem Ordner. */
function stand(root) {
  const read = (...parts) => {
    const file = join(root, ...parts);
    return existsSync(file) ? readFileSync(file, "utf8") : "";
  };
  // Die Aenderungsliste gibt es in beiden Sprachen. Gelesen wird die, in der
  // vorgelesen wird: `variantOf` baut den Namen, `read` gibt leer zurueck, wenn
  // ein fremder Stand sie noch nicht mitbringt.
  const changelog = read(".ara", basename(variantOf("CHANGELOG.md", language())));
  return {
    version: read(".ara", "VERSION").trim(),
    changelog: changelog || read(".ara", "CHANGELOG.md"),
  };
}

/**
 * Was der neue Stand mitbringt, in Sätzen.
 *
 * Eine Liste geänderter Dateien beantwortet die Frage nicht, die ein Partner
 * vor dem Einspielen hat: was kann es jetzt, und passt es noch zu meinem Gerät.
 * Beides steht in der Änderungsliste des geholten Standes.
 *
 * **Die Verträglichkeit gehört dem geholten Stand, nicht dem laufenden.** Hier
 * läuft das alte Kit und redet über das neue; nähme es seine eigene Grenze aus
 * `KIT_CONTRACT_VERSION`, stünde unter „Neu seit 0.15.0" die Zahl, die gerade
 * das Problem ist. Am 30.08.2026 las sich das an einem Klon auf 0.15.0 als
 * „bis 3", während der geholte Stand bis 5 verstand, und genau die Zahl ist der
 * Grund nachzuziehen. Sie kommt darum aus der Änderungsliste des geholten
 * Ordners, `contractOf` liest sie im Eintrag zu dessen Nummer.
 */
function news(fresh, here) {
  if (!fresh.version) return [];
  if (fresh.version === here.version) {
    return [t(`Version: ${here.version}, unchanged.`, `Stand: ${here.version}, unverändert.`)];
  }
  return standBlock({
    version: fresh.version,
    changelog: fresh.changelog,
    since: here.version || null,
    contract: contractOf(fresh.changelog, fresh.version),
  });
}

function describe(diff) {
  const label = t(
    { added: "new        ", changed: "changed    ", removed: "removed    " },
    { added: "neu        ", changed: "geändert   ", removed: "entfernt   " }
  );
  const lines = [];
  for (const rel of diff.added) lines.push(`${label.added}${rel}`);
  for (const rel of diff.changed) lines.push(`${label.changed}${rel}`);
  for (const rel of diff.removed) lines.push(`${label.removed}${rel}`);
  return lines.join("\n");
}

const work = mkdtempSync(join(tmpdir(), "ara-kit-update-"));

try {
  if (!arg.json) console.log(t("Fetching the current version ...", "Hole den aktuellen Stand ..."));
  await download(work);

  if (!existsSync(join(work, ".ara", "tools", "update.mjs"))) {
    throw new Error(
      t(
        "The fetched version does not look like the Ara-Kit, .ara/tools/ is missing. Nothing deployed.",
        "Der geholte Stand sieht nicht wie das Ara-Kit aus, es fehlt .ara/tools/. Nichts eingespielt."
      )
    );
  }

  const diff = compare(work, ROOT);
  const total = diff.added.length + diff.changed.length + diff.removed.length;
  const here = stand(ROOT);
  const fresh = stand(work);
  const zeilen = news(fresh, here);

  if (arg.json) {
    console.log(
      JSON.stringify(
        {
          source: SOURCE,
          version: { hier: here.version, dort: fresh.version },
          // Dieselbe Frage in maschinenlesbar: `hier` kommt aus dem Code dieses
          // Laufs, `dort` aus der Aenderungsliste des geholten Ordners. null
          // heisst, der geholte Stand nennt seine Grenze nicht.
          contract: { hier: KIT_CONTRACT_VERSION, dort: contractOf(fresh.changelog, fresh.version) },
          applied: !arg.check && total > 0,
          ...diff,
        },
        null,
        2
      )
    );
    if (arg.check || total === 0) process.exit(0);
  } else if (total === 0) {
    console.log(t("Everything current. Nothing to do.", "Alles aktuell. Nichts zu tun."));
    process.exit(0);
  } else if (arg.check) {
    console.log(
      [
        ...zeilen,
        zeilen.length ? "" : null,
        t(
          `There is a newer version, ${total} file(s) affected:`,
          `Es gibt einen neueren Stand, ${total} Datei(en) betroffen:`
        ),
        describe(diff),
        "",
        t("Deploy with: node .ara/tools/update.mjs", "Einspielen mit: node .ara/tools/update.mjs"),
      ]
        .filter((line) => line !== null)
        .join("\n")
    );
    process.exit(0);
  }

  apply(work, ROOT, diff);

  if (!arg.json) {
    console.log(
      [
        ...zeilen,
        zeilen.length ? "" : null,
        t(`Deployed, ${total} file(s):`, `Eingespielt, ${total} Datei(en):`),
        describe(diff),
        "",
        ...t(
          [
            "Not touched: business/, customers/, devices/, apps/, your credentials,",
            "the mirror and the generated commands under .claude/commands/.",
            "",
            "Next: node .ara/tools/commands.mjs   (new or changed commands)",
            "Check with: node .ara/tools/selftest.mjs",
          ],
          [
            "Nicht angefasst: business/, customers/, devices/, apps/, deine Zugaenge,",
            "der Spiegel und die erzeugten Befehle unter .claude/commands/.",
            "",
            "Weiter mit: node .ara/tools/commands.mjs   (neue oder geänderte Befehle)",
            "Pruefen mit: node .ara/tools/selftest.mjs",
          ]
        ),
      ]
        .filter((line) => line !== null)
        .join("\n")
    );
  }
} catch (error) {
  console.error(t(`Update failed.\n${error.message}`, `Update fehlgeschlagen.\n${error.message}`));
  process.exit(1);
} finally {
  rmSync(work, { recursive: true, force: true });
}
