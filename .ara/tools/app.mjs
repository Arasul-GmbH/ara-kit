#!/usr/bin/env node
/**
 * The life of an app: create it, plan it, build it, deploy it, switch it live.
 *
 * The tool has two sides, and you recognise them by the call. Without `--device`
 * it works here on the computer, on the file under `apps/<name>/`:
 *
 *   node .ara/tools/app.mjs --app urlaubsantrag                    situation and next step
 *   node .ara/tools/app.mjs --app urlaubsantrag --new              file from the scaffold
 *   node .ara/tools/app.mjs --app urlaubsantrag --plan "<title>"   new plan, open
 *   node .ara/tools/app.mjs --app urlaubsantrag --plan-aktiv <file>
 *   node .ara/tools/app.mjs --app urlaubsantrag --plan-erledigt <file>
 *   node .ara/tools/app.mjs --app urlaubsantrag --build            package into build/
 *
 * With `--device` it addresses a device, and then that device's contract applies:
 *
 *   node .ara/tools/app.mjs --device orin --contract               what this device promises
 *   node .ara/tools/app.mjs --device orin --app urlaubsantrag --check
 *   node .ara/tools/app.mjs --device orin --app urlaubsantrag --deploy
 *   node .ara/tools/app.mjs --device orin --app urlaubsantrag --live
 *   node .ara/tools/app.mjs --device orin --app urlaubsantrag --back
 *   node .ara/tools/app.mjs --device orin --app urlaubsantrag --remove --confirm urlaubsantrag
 *   node .ara/tools/app.mjs --device rechner --app urlaubsantrag --compose   device without Arasul
 *
 * `--check` and `--deploy` also take a folder: `--deploy <folder>` deploys a
 * package that does not come out of `apps/`.
 *
 * For a customer device `--customer <customer>` comes along. Address and key stand
 * in the device file, not in the command: that way no device can be addressed with
 * another customer's details.
 *
 * **The kit knows exactly one path by heart, the contract.** Every other endpoint it
 * looks up there and calls only when the device names it. Limits, pack command and
 * rules for the package come out of the same answer.
 *
 * === deutsch ===
 *
 * Der Lebenslauf einer App: anlegen, planen, bauen, einspielen, live schalten.
 *
 * Das Werkzeug hat zwei Seiten, und man erkennt sie am Aufruf. Ohne `--device`
 * arbeitet es hier auf dem Rechner, an der Akte unter `apps/<name>/`:
 *
 *   node .ara/tools/app.mjs --app urlaubsantrag                    Lage und nächster Schritt
 *   node .ara/tools/app.mjs --app urlaubsantrag --new              Akte aus der Vorlage
 *   node .ara/tools/app.mjs --app urlaubsantrag --plan "<titel>"   neuer Plan, offen
 *   node .ara/tools/app.mjs --app urlaubsantrag --plan-aktiv <datei>
 *   node .ara/tools/app.mjs --app urlaubsantrag --plan-erledigt <datei>
 *   node .ara/tools/app.mjs --app urlaubsantrag --build            Paket nach build/
 *
 * Mit `--device` spricht es ein Gerät an, und dann gilt dessen Kontrakt:
 *
 *   node .ara/tools/app.mjs --device orin --contract               was dieses Gerät verspricht
 *   node .ara/tools/app.mjs --device orin --app urlaubsantrag --check
 *   node .ara/tools/app.mjs --device orin --app urlaubsantrag --deploy
 *   node .ara/tools/app.mjs --device orin --app urlaubsantrag --live
 *   node .ara/tools/app.mjs --device orin --app urlaubsantrag --back
 *   node .ara/tools/app.mjs --device orin --app urlaubsantrag --remove --confirm urlaubsantrag
 *   node .ara/tools/app.mjs --device rechner --app urlaubsantrag --compose   Gerät ohne Arasul
 *
 * `--check` und `--deploy` nehmen auch einen Ordner: `--deploy <ordner>` spielt
 * ein Paket ein, das nicht aus `apps/` kommt.
 *
 * Bei einem Kundengerät kommt `--customer <kunde>` dazu. Adresse und Schlüssel
 * stehen in der Geräteakte, nicht im Befehl: damit kann kein Gerät mit den Daten
 * eines anderen Kunden angesprochen werden.
 *
 * **Das Kit kennt genau einen Pfad auswendig, den Kontrakt.** Jeden anderen
 * Endpunkt schlägt es dort nach und ruft ihn nur, wenn das Gerät ihn nennt.
 * Grenzen, Packbefehl und Regeln für das Paket kommen aus derselben Antwort.
 */

import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { ROOT, ensureDir, fail, helpOnly, now, parseArgs, readDevice, sshArgs, today } from "./lib/kit.mjs";
import { localized, t } from "./lib/i18n.mjs";
import { reason } from "./lib/arasul.mjs";
import { connect, withContract } from "./lib/link.mjs";
import { checkManifest, promisedFolders, summarize } from "./lib/contract.mjs";
import {
  NOT_IN_PACKAGE,
  appPath,
  lastStand,
  listApps,
  movePlan,
  nextSteps,
  planFileName,
  readApp,
  validName,
} from "./lib/appfile.mjs";
import { REMOTE_BASE, WAS_FEHLT, composeFile, nginxConf } from "./lib/compose.mjs";
import { designCss, readDesign } from "./lib/design.mjs";
import { APPLEDOUBLE, mirrorState, packEnv, ship } from "./lib/install.mjs";

helpOnly(import.meta.url);
const arg = parseArgs();
const str = (v) => (typeof v === "string" ? v : null);
const TEMPLATE = join(ROOT, ".ara", "templates", "app");
const PLAN_TEMPLATE = localized(join(ROOT, ".ara", "templates", "plan.md"));
const STATE = join(ROOT, ".ara", "state.json");

// Ohne jedes Argument die Liste der Schalter. --help beantwortet der Kopf der
// Datei, wie bei jedem Werkzeug des Kits.
if (process.argv.length <= 2) {
  console.log(
    t(
      [
        "The life of an app: create it, plan it, build it, deploy it, switch it live.",
        "",
        "On the computer:",
        "  --app <name>             which app. Alone: situation and next step",
        "  --new                    create the file from the scaffold",
        '  --titel "<title>"        display name of the app, otherwise the id',
        '  --beschreibung "<line>"  what the app is for',
        '  --plan "<title>"         new plan file under plans/offen/',
        "  --plan-aktiv <file>      plan from open to active, at most one",
        "  --plan-erledigt <file>   plan from active to done",
        "  --build                  build the package, result under build/",
        "",
        "On the device:",
        "  --device <name>          which device (only needed when there are several)",
        "  --customer <customer>    for a customer device",
        "  --contract               fetch the device's contract and check it",
        "  --check [<folder>]       check app.json against this device's contract",
        "  --deploy [<folder>]      pack and deploy, always rolls into staging",
        "  --status                 which version stands in staging, which is live",
        "  --live                   switch staging live",
        "  --back                   back to the previous live version",
        "  --remove --confirm <id>  remove the app, with containers and volumes",
        "  --compose                set it up on a device without Arasul",
        "  --port <number>          port on the device for --compose, otherwise 8080",
        "  --base <url>             a different address from the file (api_base, otherwise address)",
        "  --insecure               accept a self-signed certificate",
        "  --json                   output for the evaluation",
      ].join("\n"),
      [
        "Der Lebenslauf einer App: anlegen, planen, bauen, einspielen, live schalten.",
        "",
        "Am Rechner:",
        "  --app <name>             welche App. Allein: Lage und nächster Schritt",
        "  --new                    Akte aus der Vorlage anlegen",
        '  --titel "<titel>"        Anzeigename der App, sonst die Kennung',
        '  --beschreibung "<satz>"  wozu die App da ist',
        '  --plan "<titel>"         neue Plandatei unter plans/offen/',
        "  --plan-aktiv <datei>     Plan von offen nach aktiv, höchstens einer",
        "  --plan-erledigt <datei>  Plan von aktiv nach erledigt",
        "  --build                  Paket bauen, Ergebnis unter build/",
        "",
        "Am Gerät:",
        "  --device <name>          welches Gerät (nur nötig, wenn es mehrere gibt)",
        "  --customer <kunde>       bei einem Kundengerät",
        "  --contract               den Kontrakt des Geräts holen und prüfen",
        "  --check [<ordner>]       app.json gegen den Kontrakt dieses Geräts prüfen",
        "  --deploy [<ordner>]      packen und einspielen, rollt immer in den Teststand",
        "  --status                 welche Version steht im Teststand, welche live",
        "  --live                   den Teststand live schalten",
        "  --back                   auf die vorige Live-Version zurück",
        "  --remove --confirm <id>  App entfernen, samt Containern und Volumen",
        "  --compose                auf einem Gerät ohne Arasul aufsetzen",
        "  --port <nummer>          Port am Gerät für --compose, sonst 8080",
        "  --base <url>             andere Adresse als die aus der Akte (api_base, sonst address)",
        "  --insecure               ein selbst ausgestelltes Zertifikat annehmen",
        "  --json                   Ausgabe für die Auswertung",
      ].join("\n")
    )
  );
  process.exit(0);
}

// Eine Angabe ohne Wert ist ein Tippfehler, kein Wunsch. Das faellt auf, bevor
// irgendein Geraet angesprochen wird. `--check` und `--deploy` fehlen hier: sie
// duerfen ohne Ordner stehen, dann gilt der Bau der App aus `--app`.
for (const [name, value] of [
  ["app", arg.app],
  ["plan", arg.plan],
  ["plan-aktiv", arg["plan-aktiv"]],
  ["plan-erledigt", arg["plan-erledigt"]],
  ["titel", arg.titel],
]) {
  if (value === true) {
    fail(
      t(
        `--${name} needs a value: --${name} <${name === "app" ? "name" : "value"}>.`,
        `--${name} braucht eine Angabe: --${name} <${name === "app" ? "name" : "wert"}>.`
      )
    );
  }
}

// --- Welche App -------------------------------------------------------------

/** Der Merker. Er hält fest, woran zuletzt gearbeitet wurde, mehr nicht. */
function readState() {
  try {
    return JSON.parse(readFileSync(STATE, "utf8"));
  } catch {
    return {};
  }
}

function writeState(changes) {
  writeFileSync(STATE, JSON.stringify({ ...readState(), ...changes }, null, 2) + "\n");
}

/**
 * Ohne Angabe gilt die Reihenfolge des Grundrisses: der Merker, dann die
 * vorhandenen Akten. Gibt es genau eine, wird nicht gefragt; gibt es mehrere,
 * wird nicht geraten.
 */
function whichApp() {
  const named = str(arg.app);
  if (named) return named;
  const apps = listApps();
  const state = readState();
  if (state.app && apps.includes(state.app)) return state.app;
  if (apps.length === 1) return apps[0];
  return null;
}

const DEVICE_ACTIONS = ["contract", "check", "deploy", "status", "live", "back", "remove", "compose"];
const wantsDevice = DEVICE_ACTIONS.some((name) => arg[name] !== undefined);

// --- Am Rechner: die Akte ----------------------------------------------------

/** Eine Textdatei aus der Vorlage, mit den Werten dieser App darin. */
function fill(text, values) {
  return text.replace(/\{\{([a-z]+)\}\}/g, (whole, key) => (key in values ? values[key] : whole));
}

const TEXT_FILE = /\.(json|md|css|js|jsx|mjs|html|conf|txt)$|^Dockerfile$|^\.gitignore$/;

/** Die Vorlage in den Ordner der App kopieren, Platzhalter ersetzt. */
function copyTemplate(from, to, values) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    // Was in der Vorlage einmal gebaut wurde, gehört nicht in eine neue App.
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const source = join(from, entry.name);
    const target = join(to, entry.name);
    if (entry.isDirectory()) {
      copyTemplate(source, target, values);
      continue;
    }
    if (TEXT_FILE.test(entry.name)) {
      writeFileSync(target, fill(readFileSync(source, "utf8"), values));
    } else {
      cpSync(source, target);
    }
  }
}

function createApp(name) {
  if (!validName(name)) {
    fail(
      t(
        `The id "${name}" does not fit: lower case letters, digits and hyphens, nothing else.\n` +
          "It stands later in the app's path on the device and in the name of its container.",
        `Die Kennung "${name}" passt nicht: Kleinbuchstaben, Ziffern und Bindestriche, sonst nichts.\n` +
          "Sie steht später im Pfad der App am Gerät und im Namen ihres Containers."
      )
    );
  }
  const dir = appPath(name);
  if (existsSync(dir)) {
    fail(
      t(
        `The app ${name} already exists: ${relative(ROOT, dir)}. Look at it with --app ${name}.`,
        `Die App ${name} gibt es schon: ${relative(ROOT, dir)}. Ansehen mit --app ${name}.`
      )
    );
  }
  if (!existsSync(TEMPLATE)) {
    fail(t(`The scaffold is missing: ${relative(ROOT, TEMPLATE)}`, `Die Vorlage fehlt: ${relative(ROOT, TEMPLATE)}`));
  }

  const titel = str(arg.titel) || name;
  const beschreibung =
    str(arg.beschreibung) || t(`${titel}, built with the Ara-Kit.`, `${titel}, gebaut mit dem Ara-Kit.`);
  copyTemplate(TEMPLATE, dir, { id: name, name: titel, beschreibung, datum: today() });
  for (const state of ["offen", "aktiv", "erledigt"]) ensureDir(join(dir, "plans", state));

  // Das Aussehen kommt aus dem Spiegel, wenn einer da ist. Sonst steht die
  // Vorgabe des Kits in der Datei, und sie sagt selbst, dass sie es ist.
  const mirror = process.env.ARA_MIRROR || join(ROOT, ".ara", "mirror");
  const design = readDesign(existsSync(mirror) ? mirror : null);
  const styles = join(dir, "frontend", "src", "design.css");
  if (existsSync(join(dir, "frontend", "src"))) {
    writeFileSync(styles, designCss(design, { date: today(), version: mirrorState()?.version || null }));
  }

  writeState({ app: name });
  console.log(
    [
      t(`Created: ${relative(ROOT, dir)}`, `Angelegt: ${relative(ROOT, dir)}`),
      `- app.json: ${name} 0.1.0`,
      t(
        "- frontend, backend and one flow with an approval lie in it as a scaffold",
        "- Oberfläche, Backend und ein Flow mit Freigabe liegen als Vorlage darin"
      ),
      t(
        `- Appearance: ${design.source === "mirror" ? `out of the mirror (${relative(ROOT, design.file)})` : "the kit's default, no mirror was there"}`,
        `- Aussehen: ${design.source === "mirror" ? `aus dem Spiegel (${relative(ROOT, design.file)})` : "Vorgabe des Kits, es lag kein Spiegel vor"}`
      ),
      "",
      t(
        "Next: write the plan that says what this app should do.",
        "Als Nächstes: den Plan schreiben, der sagt, was diese App tun soll."
      ),
      `  node .ara/tools/app.mjs --app ${name} --plan "<titel>"`,
    ].join("\n")
  );
}

function createPlan(app, titel) {
  if (!app.exists) {
    fail(t(`The app ${app.name} does not exist yet. First --new.`, `Die App ${app.name} gibt es noch nicht. Zuerst --new.`));
  }
  if (!existsSync(PLAN_TEMPLATE)) {
    fail(
      t(
        `The plan scaffold is missing: ${relative(ROOT, PLAN_TEMPLATE)}`,
        `Die Planvorlage fehlt: ${relative(ROOT, PLAN_TEMPLATE)}`
      )
    );
  }
  const file = planFileName(titel);
  const dir = ensureDir(join(app.dir, "plans", "offen"));
  const path = join(dir, file);
  if (existsSync(path)) fail(t(`${relative(ROOT, path)} already exists.`, `${relative(ROOT, path)} gibt es schon.`));
  writeFileSync(
    path,
    fill(readFileSync(PLAN_TEMPLATE, "utf8"), { id: app.name, titel, datum: today() })
  );
  writeState({ app: app.name });
  console.log(
    [
      t(`Plan created: ${relative(ROOT, path)}`, `Plan angelegt: ${relative(ROOT, path)}`),
      "",
      ...t(
        [
          "It is a scaffold with questions, not an answer. Fill it in during the conversation, and write",
          "under Assumptions what stayed open. Then:",
        ],
        [
          "Er ist eine Vorlage mit Fragen, keine Antwort. Füll ihn im Gespräch aus, und schreib",
          "unter Annahmen, was offen geblieben ist. Dann:",
        ]
      ),
      `  node .ara/tools/app.mjs --app ${app.name} --plan-aktiv ${file}`,
    ].join("\n")
  );
}

function shiftPlan(app, file, to) {
  if (!app.exists) fail(t(`The app ${app.name} does not exist yet.`, `Die App ${app.name} gibt es noch nicht.`));
  let moved;
  try {
    moved = movePlan(app, file, to);
  } catch (error) {
    fail(error.message);
  }
  writeState({ app: app.name });
  console.log(
    [
      `${file}: ${moved.from} → ${moved.to}`,
      to === "aktiv"
        ? t(
            `Now it gets built. When it stands: node .ara/tools/app.mjs --app ${app.name} --build`,
            `Jetzt wird gebaut. Wenn es steht: node .ara/tools/app.mjs --app ${app.name} --build`
          )
        : t(
            "Write on the app's README: what can it do now, in the words of whoever uses it.",
            "Schreib die README der App fort: was kann sie jetzt, in den Worten dessen, der sie benutzt."
          ),
    ].join("\n")
  );
}

// --- Am Rechner: bauen -------------------------------------------------------

/**
 * Die Beiwerkdateien von macOS gehören in kein Paket. Sie entstehen, wenn eine
 * Datei mit erweiterten Attributen auf ein Dateisystem wandert, das keine kennt,
 * und sie sehen am Gerät aus wie halbe Dateien: eine davon hat am 28.08.2026
 * Traefik angehalten.
 */
const noAppleDouble = (path) => !/(^|\/)\._/.test(path);

/**
 * Bauen heißt: aus dem Ordner der App wird das Paket.
 *
 * Was **nicht** hineingehört, weiß das Kit von sich selbst: Pläne und die
 * Beschreibung sind die Arbeit am Ding, nicht das Ding. Alles andere wandert
 * mit, ohne dass hier eine Liste von Feldern gepflegt wird. Welche Ordner das
 * Manifest verspricht, sagt der Kontrakt des Geräts, und geprüft wird es dort:
 * `--check` gegen das Gerät, vor dem Einspielen noch einmal.
 *
 * Eine Oberfläche mit eigenem Bau (`package.json` mit einem Skript `build`)
 * wird gebaut, und ins Paket geht ihr Ergebnis aus `dist/`. Eine ohne wandert,
 * wie sie ist: sie ist dann schon fertig.
 */
function buildApp(app) {
  if (!app.exists) {
    fail(t(`The app ${app.name} does not exist yet. First --new.`, `Die App ${app.name} gibt es noch nicht. Zuerst --new.`));
  }
  if (app.manifestProblem) fail(app.manifestProblem);

  const buildDir = join(app.dir, "build");
  rmSync(buildDir, { recursive: true, force: true });
  mkdirSync(buildDir, { recursive: true });

  const gebaut = [];
  for (const entry of readdirSync(app.dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || NOT_IN_PACKAGE.includes(entry.name)) continue;
    const source = join(app.dir, entry.name);
    const target = join(buildDir, entry.name);
    if (!entry.isDirectory()) {
      cpSync(source, target);
      continue;
    }
    const packageFile = join(source, "package.json");
    let script = null;
    if (existsSync(packageFile)) {
      try {
        script = JSON.parse(readFileSync(packageFile, "utf8")).scripts?.build || null;
      } catch (error) {
        fail(
          t(
            `${relative(ROOT, packageFile)} is not readable JSON: ${error.message}`,
            `${relative(ROOT, packageFile)} ist kein lesbares JSON: ${error.message}`
          )
        );
      }
    }
    if (!script) {
      cpSync(source, target, {
        recursive: true,
        filter: (path) => !path.includes("node_modules") && noAppleDouble(path),
      });
      continue;
    }

    if (!existsSync(join(source, "node_modules"))) {
      console.log(
        t(
          `${entry.name}: the dependencies are missing, npm install ...`,
          `${entry.name}: die Abhängigkeiten fehlen, npm install ...`
        )
      );
      const installed = spawnSync("npm", ["install"], { cwd: source, stdio: "inherit" });
      if (installed.status !== 0) {
        fail(
          t(
            `npm install in ${relative(ROOT, source)} ended with return code ${installed.status}.\n` +
              "Without the dependencies the frontend cannot be built.",
            `npm install in ${relative(ROOT, source)} ist mit Rückgabecode ${installed.status} beendet.\n` +
              "Ohne die Abhängigkeiten lässt sich die Oberfläche nicht bauen."
          )
        );
      }
    }
    console.log(`${entry.name}: npm run build ...`);
    const built = spawnSync("npm", ["run", "build"], { cwd: source, stdio: "inherit" });
    if (built.status !== 0) {
      fail(
        t(
          `The build of ${entry.name} ended with return code ${built.status}.`,
          `Der Bau von ${entry.name} ist mit Rückgabecode ${built.status} beendet.`
        )
      );
    }
    const dist = join(source, "dist");
    if (!existsSync(dist)) {
      fail(
        t(
          `${relative(ROOT, source)} built, but there is no dist/.\n` +
            "What goes into the package is the result of the build. Set the build up so that it writes into dist/.",
          `${relative(ROOT, source)} hat gebaut, aber es gibt kein dist/.\n` +
            "Ins Paket geht das Ergebnis des Baus. Stell den Bau so ein, dass er nach dist/ schreibt."
        )
      );
    }
    cpSync(dist, target, { recursive: true, filter: noAppleDouble });
    gebaut.push(entry.name);
  }

  const size = (function messen(path) {
    const stat = statSync(path);
    if (stat.isFile()) return stat.size;
    return readdirSync(path).reduce((sum, name) => sum + messen(join(path, name)), 0);
  })(buildDir);

  console.log(
    [
      "",
      t(
        `Built: ${relative(ROOT, buildDir)}, ${Math.max(1, Math.round(size / 1024))} KB.`,
        `Gebaut: ${relative(ROOT, buildDir)}, ${Math.max(1, Math.round(size / 1024))} KB.`
      ),
      gebaut.length
        ? t(`Built from source: ${gebaut.join(", ")}.`, `Aus dem Quelltext gebaut: ${gebaut.join(", ")}.`)
        : t("Nothing to build, everything was ready.", "Nichts zu bauen, alles lag fertig vor."),
      "",
      t(
        "Checking and deploying only works against a device whose contract says what applies:",
        "Prüfen und einspielen geht nur gegen ein Gerät, dessen Kontrakt sagt, was gilt:"
      ),
      `  node .ara/tools/app.mjs --device <device> --app ${app.name} --check`,
    ].join("\n")
  );
}

// --- Am Rechner: die Lage ----------------------------------------------------

function showApp(app) {
  const stand = lastStand(readState().apps?.[app.name], str(arg.device));
  const steps = nextSteps(app, { device: str(arg.device), stand });
  if (arg.json) {
    console.log(JSON.stringify({ ...app, stand, steps }, null, 2));
    return app.exists && !app.manifestProblem ? 0 : 1;
  }
  const lines = [`# ${app.name}`, ""];
  if (!app.exists) {
    lines.push(t(`Nothing lies under apps/${app.name}/ yet.`, `Unter apps/${app.name}/ liegt noch nichts.`));
  } else {
    lines.push(
      t(`- Folder: ${relative(ROOT, app.dir)}`, `- Ordner: ${relative(ROOT, app.dir)}`),
      app.manifest
        ? `- Manifest: ${app.manifest.name ?? app.name} ${app.manifest.version ?? "?"}${app.manifest.beschreibung ? `, ${app.manifest.beschreibung}` : ""}`
        : `- Manifest: ${app.manifestProblem}`,
      `- README: ${app.readme ? t("present", "vorhanden") : t("missing", "fehlt")}`,
      t(
        `- Plans: ${app.plans.aktiv.length ? `active "${app.plans.aktiv[0].titel}"` : "none active"}, ` +
          `${app.plans.offen.length} open, ${app.plans.erledigt.length} done`,
        `- Pläne: ${app.plans.aktiv.length ? `aktiv "${app.plans.aktiv[0].titel}"` : "keiner aktiv"}, ` +
          `${app.plans.offen.length} offen, ${app.plans.erledigt.length} erledigt`
      ),
      t(
        `- Build: ${
          app.build.exists
            ? `${app.build.version ?? "?"} of ${app.build.time}${app.build.stale ? ", older than the source" : ""}`
            : "none yet"
        }`,
        `- Bau: ${
          app.build.exists
            ? `${app.build.version ?? "?"} vom ${app.build.time}${app.build.stale ? ", älter als der Quelltext" : ""}`
            : "noch keiner"
        }`
      ),
      // Was das Kit selbst an ein Gerät geschickt hat. Es ist der Merker und
      // nicht das Gerät: gefragt wird dort, sobald jemand --status ruft.
      t("- On the device: ", "- Am Gerät: ") +
        (stand
          ? [
              `${stand.place}`,
              stand.deployed
                ? t(
                    `staging ${stand.deployed.version ?? "?"} of ${stand.deployed.time}`,
                    `Teststand ${stand.deployed.version ?? "?"} vom ${stand.deployed.time}`
                  )
                : null,
              stand.live
                ? t(
                    `live ${stand.live.version ?? "?"} since ${stand.live.time}`,
                    `live ${stand.live.version ?? "?"} seit ${stand.live.time}`
                  )
                : null,
            ]
              .filter(Boolean)
              .join(", ") +
            t(" (out of the marker, not asked on the device)", " (aus dem Merker, nicht vom Gerät gefragt)")
          : t("the kit has deployed nothing yet", "vom Kit ist noch nichts eingespielt worden"))
    );
  }
  lines.push("", t("## What is due now", "## Was jetzt dran ist"), "");
  for (const step of steps) {
    lines.push(`- ${step.was}`, ...(step.wie ? ["", `      ${step.wie}`, ""] : []));
  }
  console.log(lines.join("\n"));
  return app.exists && !app.manifestProblem ? 0 : 1;
}

// --- Am Rechner: hier ist Schluss, wenn kein Gerät gemeint ist ----------------

if (!wantsDevice) {
  // Eine neue App bekommt ihren Namen gesagt. Der Merker zeigt auf die letzte,
  // und die noch einmal anzulegen wäre nie gemeint.
  if (arg.new && !str(arg.app)) {
    fail(t("Say what the new app should be called: --app <name> --new.", "Sag, wie die neue App heißen soll: --app <name> --new."));
  }
  const name = whichApp();
  if (!name) {
    const apps = listApps();
    console.log(
      apps.length
        ? t(
            `Which app? Known: ${apps.join(", ")}. Name it with --app <name>.`,
            `Welche App? Vorhanden: ${apps.join(", ")}. Angeben mit --app <name>.`
          )
        : t(
            "No app yet. The first one: node .ara/tools/app.mjs --app <name> --new",
            "Noch keine App. Die erste: node .ara/tools/app.mjs --app <name> --new"
          )
    );
    process.exit(apps.length ? 1 : 0);
  }
  if (arg.new) {
    createApp(name);
    process.exit(0);
  }
  const app = readApp(name);
  if (typeof arg.plan === "string") {
    createPlan(app, arg.plan);
    process.exit(0);
  }
  if (typeof arg["plan-aktiv"] === "string") {
    shiftPlan(app, arg["plan-aktiv"], "aktiv");
    process.exit(0);
  }
  if (typeof arg["plan-erledigt"] === "string") {
    shiftPlan(app, arg["plan-erledigt"], "erledigt");
    process.exit(0);
  }
  if (arg.build) {
    buildApp(app);
    process.exit(0);
  }
  if (app.exists) writeState({ app: name });
  process.exit(showApp(app));
}

// --- Gerät, Adresse, Schlüssel ----------------------------------------------

let device;
try {
  device = readDevice(str(arg.customer), str(arg.device));
} catch (error) {
  fail(error.message);
}

const place = device.customer ? `${device.customer}/${device.device}` : device.device;
const fields = device.fields;

/**
 * Was an dieses Gerät ging, in den Merker.
 *
 * Ohne diese Notiz kennt die Seite ohne `--device` nur die Platte: sie sah am
 * 28.08.2026 einen frischen Bau und schlug `--check` und `--deploy` vor,
 * obwohl dieselbe Fassung längst live war. Notiert wird, was das Kit selbst
 * getan hat, je App und Gerät. Es ist ein Merker und keine Auskunft über das
 * Gerät: die gibt `--status`, und die fragt dort nach.
 */
function noteStand(appId, changes) {
  const apps = { ...(readState().apps || {}) };
  const record = { ...(apps[appId] || {}) };
  record[place] = { ...(record[place] || {}), ...changes };
  apps[appId] = record;
  writeState({ apps });
}

/**
 * Welcher Ordner eingespielt wird.
 *
 * `--deploy <ordner>` nimmt genau den. `--app <name>` ohne Ordner nimmt den Bau
 * dieser App, und einen veralteten nimmt es nicht: eingespielt würde sonst der
 * Stand von vorgestern, und niemand sähe es dem Gerät an.
 */
function folderFor(value) {
  if (typeof value === "string") return value;
  const name = whichApp();
  if (!name) {
    fail(
      t(
        "Say which app: --app <name>, or name the folder: --deploy <folder>.",
        "Sag, welche App: --app <name>, oder gib den Ordner an: --deploy <ordner>."
      )
    );
  }
  const app = readApp(name);
  if (!app.exists) {
    fail(t(`The app ${name} does not exist yet. First --new.`, `Die App ${name} gibt es noch nicht. Zuerst --new.`));
  }
  if (!app.build.exists) {
    fail(
      t(
        `Nothing of ${name} is built. Build first, then deploy:\n`,
        `Von ${name} ist nichts gebaut. Erst bauen, dann einspielen:\n`
      ) + `  node .ara/tools/app.mjs --app ${name} --build`
    );
  }
  if (app.build.stale) {
    fail(
      t(
        `The build of ${name} is older than the source (${app.build.time}).\nBuild again: `,
        `Der Bau von ${name} ist älter als der Quelltext (${app.build.time}).\nNoch einmal bauen: `
      ) + `node .ara/tools/app.mjs --app ${name} --build`
    );
  }
  writeState({ app: name });
  return join(app.dir, "build");
}

// --- Ohne Arasul: Compose über SSH ------------------------------------------

/**
 * Eine App auf einem Gerät ohne Arasul.
 *
 * Der Weg ist bewusst der kleinere: die Dateien gehen über dieselbe
 * SSH-Verbindung wie alles andere, am Gerät stellt Compose zwei Container, und
 * was dabei fehlt, steht danach im Klartext auf dem Bildschirm und im Kopf der
 * erzeugten Datei. Das Kit baut keine Anmeldung nach, die niemand geprüft hat.
 */
async function compose() {
  const folder = resolve(folderFor(arg.deploy));
  const { manifest } = readManifest(folder);
  const port = Number(str(arg.port) || 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    fail(t(`--port ${arg.port} is not a port number.`, `--port ${arg.port} ist keine Portnummer.`));
  }

  let connection;
  try {
    connection = sshArgs(fields);
  } catch (error) {
    fail(`${error.message}\n` + t(`Look in ${relative(ROOT, device.file)}.`, `Nachsehen in ${relative(ROOT, device.file)}.`));
  }

  // Gestellt wird aus einer Kopie, nicht aus dem Bau selbst: die Compose-Datei
  // gehört zu diesem einen Gerät, und das Paket, das an ein Gerät mit Arasul
  // geht, soll sie nicht mit sich herumtragen.
  const work = mkdtempSync(join(tmpdir(), "ara-compose-"));
  const target = `${REMOTE_BASE}/${manifest.id}`;
  try {
    cpSync(folder, work, { recursive: true });
    writeFileSync(join(work, "docker-compose.yml"), composeFile(manifest, { port }));
    if (manifest.frontend) writeFileSync(join(work, "nginx.conf"), nginxConf(manifest));

    console.log(
      t(
        `${manifest.id} ${manifest.version} goes to ${connection.label}, target ${target}. The device builds the backend itself.`,
        `${manifest.id} ${manifest.version} geht nach ${connection.label}, Ziel ${target}. Das Gerät baut das Backend selbst.`
      )
    );
    const shipped = await ship(connection.args, "ssh", target, work);
    if (!shipped.ok) {
      fail(
        t(
          `The files did not arrive: ${shipped.message || "no reason named"}`,
          `Die Dateien kamen nicht an: ${shipped.message || "kein Grund genannt"}`
        )
      );
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }

  const up = spawnSync(
    "ssh",
    [...connection.args, `cd ${target} && docker compose up -d --build`],
    { stdio: "inherit" }
  );
  if (up.status !== 0) {
    fail(
      t(
        `Compose ended on the device with return code ${up.status}.\n` +
          "Does Docker run there? Setting it up works with /device and --install docker.\n" +
          `Look there: cd ${target} && docker compose logs --tail 50`,
        `Compose ist am Gerät mit Rückgabecode ${up.status} beendet.\n` +
          "Läuft dort Docker? Aufsetzen geht mit /device und --install docker.\n" +
          `Nachsehen dort: cd ${target} && docker compose logs --tail 50`
      )
    );
  }

  const host = (fields.address || fields.hostname || "").replace(/^https?:\/\//, "").split(":")[0];
  console.log(
    [
      "",
      t(
        `${manifest.name ?? manifest.id} runs: http://${host}:${port}/`,
        `${manifest.name ?? manifest.id} läuft: http://${host}:${port}/`
      ),
      "",
      t("This is a device without Arasul. What is missing here:", "Das ist ein Gerät ohne Arasul. Was hier fehlt:"),
      ...WAS_FEHLT.map((satz) => `- ${satz}`),
      "",
      t(`Stop it on the device: cd ${target} && docker compose down`, `Anhalten am Gerät: cd ${target} && docker compose down`),
    ].join("\n")
  );
}

if (arg.compose) {
  await compose();
  process.exit(0);
}

// --- Mit Arasul: die Schnittstelle -------------------------------------------

// Adresse, Schlüssel und Kontrakt stehen in lib/link.mjs, weil maintain.mjs
// dieselben vier Schritte braucht. `--base` sticht die Akte, für den einen
// Versuch, der nicht in sie gehört.
let link;
try {
  link = await withContract(
    connect(device, { base: str(arg.base), insecure: Boolean(arg.insecure) }),
    device
  );
} catch (error) {
  fail(error.message);
}

const { base, contract, version } = link;

/**
 * Die Regeln für einen Flow aus dem Paket, wörtlich aus dem Kontrakt.
 *
 * Ein Flow im Paket ist eine Datei mit einem Kopf, und was darin gilt, prüft
 * kein Schema des Manifests. Das Kit baut die Regeln nicht nach, es zeigt sie:
 * so, wie das Gerät sie ausgibt. Ein Gerät, das keine kennt, bekommt hier auch
 * keinen Abschnitt.
 */
function flowSection() {
  const rules = contract?.flow_frontmatter?.regeln || [];
  if (!rules.length) return [];
  return [
    "",
    t("## Rules for a flow out of the package", "## Regeln für einen Flow aus dem Paket"),
    "",
    t(
      "They apply as soon as the package brings flow files along. They stand word for word in the contract:",
      "Sie gelten, sobald das Paket Flow-Dateien mitbringt. Sie stehen wörtlich im Kontrakt:"
    ),
    "",
    ...rules.map((r) => `- ${r}`),
    ...(contract.flow_frontmatter.rumpf ? ["", contract.flow_frontmatter.rumpf] : []),
  ];
}

/** Ruft einen Endpunkt, aber nur, wenn der Kontrakt ihn nennt. */
async function endpoint(verb, path, options = {}) {
  try {
    return await link.endpoint(verb, path, options);
  } catch (error) {
    fail(error.message);
  }
}

// --- --contract --------------------------------------------------------------

if (arg.contract) {
  if (arg.json) {
    console.log(JSON.stringify({ device: place, base, version, contract }, null, 2));
    process.exit(version.ok ? 0 : 1);
  }
  console.log(
    [
      t(`# Contract of ${place}`, `# Kontrakt von ${place}`),
      "",
      ...summarize(contract),
      "",
      t("## Endpoints", "## Endpunkte"),
      "",
    ]
      .concat(
        (contract.endpunkte || []).map(
          (e) => `- ${e.verb} ${e.pfad}${e.bereich ? ` (${e.bereich})` : ""}: ${e.was}`
        )
      )
      .concat(flowSection())
      .join("\n")
  );
  process.exit(version.ok ? 0 : 1);
}

// --- Das Manifest ------------------------------------------------------------

function readManifest(folder) {
  const dir = resolve(folder);
  if (!existsSync(dir)) fail(t(`The folder ${folder} does not exist.`, `Den Ordner ${folder} gibt es nicht.`));
  const file = join(dir, "app.json");
  if (!existsSync(file)) {
    fail(
      t(
        `There is no app.json in ${folder}.\n` +
          "It belongs at the root of the folder, what gets packed is its contents.",
        `In ${folder} liegt keine app.json.\n` +
          "Sie gehört in die Wurzel des Ordners, gepackt wird sein Inhalt."
      )
    );
  }
  try {
    return { dir, file, manifest: JSON.parse(readFileSync(file, "utf8")) };
  } catch (error) {
    fail(
      t(
        `${relative(ROOT, file)} is not readable JSON: ${error.message}`,
        `${relative(ROOT, file)} ist kein lesbares JSON: ${error.message}`
      )
    );
  }
}

/**
 * Was das Manifest an Ordnern verspricht, muss auch im Ordner liegen.
 *
 * Welche Felder Ordner benennen, sagt der Kontrakt in der Wurzel seines Pakets,
 * das Kit zählt sie nicht auf. Geprüft wird hier trotzdem, und zwar vor dem
 * Packen: ein Manifest, das einen Ordner verspricht, den es nicht gibt, wird am
 * Gerät abgewiesen, und dann hat jemand Minuten auf einen Bau gewartet, der nie
 * begonnen hat.
 */
function checkDelivery(dir, manifest) {
  const problems = [];
  for (const { field, folder } of promisedFolders(contract, manifest)) {
    if (folder.startsWith("/") || folder.split("/").includes("..")) {
      problems.push(
        t(
          `\`${field}\` points out of the package with \`${folder}\`. Into a package goes only what lies in it.`,
          `\`${field}\` zeigt mit \`${folder}\` aus dem Paket heraus. In ein Paket geht nur, was darin liegt.`
        )
      );
      continue;
    }
    const path = join(dir, folder);
    if (!existsSync(path) || !statSync(path).isDirectory()) {
      problems.push(
        t(
          `app.json promises the folder \`${folder}\` under \`${field}\`, it does not exist in the package.`,
          `app.json verspricht unter \`${field}\` den Ordner \`${folder}\`, im Paket gibt es ihn nicht.`
        )
      );
      continue;
    }
    if (readdirSync(path).filter((name) => !name.startsWith(".")).length === 0) {
      problems.push(
        t(
          `The folder \`${folder}\` from \`${field}\` is empty. A promise without a delivery gets refused by the device.`,
          `Der Ordner \`${folder}\` aus \`${field}\` ist leer. Ein Versprechen ohne Lieferung weist das Gerät ab.`
        )
      );
    }
  }
  return problems;
}

function reportManifest(where, result, delivery) {
  const lines = [
    t(`# app.json from ${where} against the contract of ${place}`, `# app.json aus ${where} gegen den Kontrakt von ${place}`),
    "",
    `- ${version.text}`,
  ];
  if (result.ok) {
    lines.push(t("- This device's schema accepts the manifest.", "- Das Schema dieses Geräts nimmt das Manifest an."));
  } else {
    lines.push(
      "",
      t("## The device would refuse this", "## Das Gerät würde das abweisen"),
      "",
      ...result.problems.map((p) => `- ${p}`)
    );
  }
  if (delivery.length) {
    lines.push(
      "",
      t(
        "## The manifest promises more than the folder delivers",
        "## Das Manifest verspricht mehr, als der Ordner liefert"
      ),
      "",
      ...delivery.map((p) => `- ${p}`)
    );
  } else if (result.ok) {
    const versprochen = promisedFolders(contract, result.manifest);
    if (versprochen.length) {
      lines.push(
        t(
          `- What the manifest promises is delivered: ${versprochen.map((f) => f.folder).join(", ")}.`,
          `- Geliefert wird, was das Manifest verspricht: ${versprochen.map((f) => f.folder).join(", ")}.`
        )
      );
    }
  }
  if (result.unchecked.length) {
    lines.push(
      "",
      t(
        `Not checked, because this kit does not know the schema keyword: ${result.unchecked.join(", ")}.`,
        `Nicht geprüft, weil dieses Kit die Schemaangabe nicht kennt: ${result.unchecked.join(", ")}.`
      )
    );
  }
  if (result.rules.length) {
    lines.push(
      "",
      t("## Rules no schema carries", "## Regeln, die kein Schema trägt"),
      "",
      t(
        "They stand like this in the device's contract and apply nevertheless. Go through them:",
        "Sie stehen so im Kontrakt des Geräts und gelten trotzdem. Geh sie durch:"
      ),
      "",
      ...result.rules.map((r) => `- ${r}`)
    );
  }
  lines.push(...flowSection());
  return lines.join("\n");
}

if (arg.check !== undefined) {
  const { dir, manifest } = readManifest(folderFor(arg.check));
  const result = { ...checkManifest(contract, manifest), manifest };
  const delivery = checkDelivery(dir, manifest);
  if (arg.json) {
    console.log(JSON.stringify({ device: place, folder: dir, version, delivery, ...result }, null, 2));
  } else {
    console.log(reportManifest(relative(ROOT, dir) || dir, result, delivery));
  }
  process.exit(result.ok && !delivery.length && version.ok ? 0 : 1);
}

// --- --deploy ----------------------------------------------------------------

if (arg.deploy !== undefined) {
  const { dir, manifest } = readManifest(folderFor(arg.deploy));
  const result = { ...checkManifest(contract, manifest), manifest };
  const delivery = checkDelivery(dir, manifest);
  if (!result.ok || delivery.length) {
    console.log(reportManifest(relative(ROOT, dir) || dir, result, delivery));
    fail(t("\nNothing deployed. First the manifest, then the device.", "\nNichts eingespielt. Erst das Manifest, dann das Gerät."));
  }
  if (!version.ok) fail(`${version.text}\n` + t("Nothing deployed.", "Nichts eingespielt."));

  // Gepackt wird, was der Kontrakt sagt: der Inhalt des Ordners, nicht der
  // Ordner. Die ._-Beiwerkdateien von macOS bleiben doppelt draußen:
  // COPYFILE_DISABLE hält tar davon ab, sie zu erzeugen, --exclude fängt die,
  // die schon auf der Platte liegen. Am Gerät wären sie unbekannte Einträge im
  // Paket, und im Artefakt haben sie am 28.08.2026 Traefik angehalten.
  const work = mkdtempSync(join(tmpdir(), "ara-app-"));
  const archive = join(work, "paket.tgz");
  try {
    const packed = spawnSync("tar", ["-czf", archive, "--exclude", APPLEDOUBLE, "-C", dir, "."], {
      encoding: "utf8",
      env: packEnv(),
    });
    if (packed.status !== 0) {
      fail(
        t(
          `The package could not be packed: ${(packed.stderr || "").trim()}`,
          `Das Paket ließ sich nicht packen: ${(packed.stderr || "").trim()}`
        )
      );
    }

    const size = statSync(archive).size;
    const limit = contract?.paket?.max_archiv_bytes;
    if (limit && size > limit) {
      fail(
        t(
          `The package is ${Math.round(size / 1024 / 1024)} MB, this device takes at most ` +
            `${Math.round(limit / 1024 / 1024)} MB. Nothing deployed.`,
          `Das Paket ist ${Math.round(size / 1024 / 1024)} MB, dieses Gerät nimmt höchstens ` +
            `${Math.round(limit / 1024 / 1024)} MB. Nichts eingespielt.`
        )
      );
    }

    console.log(
      t(
        `Package from ${relative(ROOT, dir) || dir}: ${manifest.id} ${manifest.version}, ` +
          `${Math.round(size / 1024)} KB. Getting deployed, the device builds the backend itself, that takes a while.`,
        `Paket aus ${relative(ROOT, dir) || dir}: ${manifest.id} ${manifest.version}, ` +
          `${Math.round(size / 1024)} KB. Wird eingespielt, das Gerät baut das Backend selbst, das dauert.`
      )
    );

    const sent = await endpoint("POST", "/api/v1/external/apps", {
      file: archive,
      fileField: "paket",
      // Das Gerät baut das Backend, bevor es antwortet. Das dauert Minuten,
      // und in der Zeit fließt nichts über die Leitung.
      timeout: 30 * 60_000,
    });
    if (!sent.ok) {
      fail(
        t(
          `${place} refused the package (status ${sent.status}).\n`,
          `${place} hat das Paket abgewiesen (Status ${sent.status}).\n`
        ) + reason(sent)
      );
    }

    noteStand(sent.data?.app_id ?? manifest.id, {
      deployed: {
        version: sent.data?.version ?? manifest.version ?? null,
        stand: sent.data?.stand ?? "test",
        time: now(),
      },
    });

    if (arg.json) {
      console.log(JSON.stringify({ device: place, eingespielt: sent.data }, null, 2));
    } else {
      const stand = sent.data || {};
      console.log(
        [
          "",
          t(
            `Deployed: ${stand.app_id ?? manifest.id} ${stand.version ?? manifest.version}, slot "${stand.stand ?? "test"}".`,
            `Eingespielt: ${stand.app_id ?? manifest.id} ${stand.version ?? manifest.version}, Stand "${stand.stand ?? "test"}".`
          ),
          t(
            `Look at it: ${base}${(contract?.apps?.teststand || "/apps/<id>/test/").replace("<id>", stand.app_id ?? manifest.id)}`,
            `Ansehen: ${base}${(contract?.apps?.teststand || "/apps/<id>/test/").replace("<id>", stand.app_id ?? manifest.id)}`
          ),
          "",
          t("A human switches live. When staging convinces:", "Live schaltet ein Mensch. Wenn der Teststand überzeugt:"),
          `  node .ara/tools/app.mjs${device.customer ? ` --customer ${device.customer}` : ""} --device ${device.device} --app ${stand.app_id ?? manifest.id} --live`,
        ].join("\n")
      );
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
  process.exit(0);
}

// --- Was mit einer App, die schon am Gerät ist -------------------------------

const app = whichApp();
if (!app) {
  fail(
    t(
      "For --status, --live, --back and --remove I need --app <id>.",
      "Für --status, --live, --back und --remove brauche ich --app <id>."
    )
  );
}

function showStand(data) {
  if (arg.json) {
    console.log(JSON.stringify({ device: place, app: data }, null, 2));
    return;
  }
  console.log(
    [
      t(`# ${app} on ${place}`, `# ${app} auf ${place}`),
      "",
      ...Object.entries(data || {}).map(([k, v]) => `- ${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`),
    ].join("\n")
  );
}

if (arg.status) {
  const found = await endpoint("GET", `/api/v1/external/apps/${app}`);
  if (!found.ok) fail(t(`${place} says nothing about ${app}.\n`, `${place} sagt zu ${app} nichts.\n`) + reason(found));
  showStand(found.data);
  process.exit(0);
}

if (arg.live || arg.back) {
  const ziel = arg.live ? "live" : "zurueck";
  const switched = await endpoint("POST", `/api/v1/external/apps/${app}/schalten`, {
    json: { ziel },
  });
  if (!switched.ok) {
    fail(
      t(
        `${place} did not switch (status ${switched.status}).\n`,
        `${place} hat nicht geschaltet (Status ${switched.status}).\n`
      ) + reason(switched)
    );
  }
  // Auch --back ändert, was live ist. Beides ist dieselbe Notiz.
  noteStand(app, { live: { version: switched.data?.version ?? null, time: now() } });
  if (arg.json) {
    showStand(switched.data);
  } else {
    console.log(
      ziel === "live"
        ? t(
            `${app} is live on ${place}: version ${switched.data?.version ?? "?"}. Back works with --back, the previous version stays on the device.`,
            `${app} ist live auf ${place}: Version ${switched.data?.version ?? "?"}. Zurück geht mit --back, die vorige Version bleibt am Gerät.`
          )
        : t(
            `${app} on ${place} stands at version ${switched.data?.version ?? "?"} again. Another --back swaps back.`,
            `${app} auf ${place} steht wieder auf Version ${switched.data?.version ?? "?"}. Noch einmal --back tauscht zurück.`
          )
    );
  }
  process.exit(0);
}

if (arg.remove) {
  // Stufe 3: unumkehrbar. Das Gerät verlangt die Kennung als Rückfrage, das Kit
  // reicht sie durch und erfindet keine eigene. Wer sie nicht hinschreibt, hat
  // nicht gelesen, was fällt.
  if (str(arg.confirm) !== app) {
    fail(
      t(
        `That removes ${app} from ${place}: both containers with their volumes, both slots,\n` +
          "all permissions and the app's keys. There is no way back.\n" +
          `If that is what you want, append it: --confirm ${app}`,
        `Das entfernt ${app} von ${place}: beide Container mitsamt ihren Volumen, beide Stände,\n` +
          "alle Freigaben und die Schlüssel der App. Es gibt keinen Rückweg.\n" +
          `Wenn das so gewollt ist, hängs an: --confirm ${app}`
      )
    );
  }
  const gone = await endpoint("DELETE", `/api/v1/external/apps/${app}?bestaetigung=${app}`);
  if (!gone.ok) {
    fail(
      t(
        `${place} did not remove ${app} (status ${gone.status}).\n`,
        `${place} hat ${app} nicht entfernt (Status ${gone.status}).\n`
      ) + reason(gone)
    );
  }
  // Was es dort nicht mehr gibt, steht auch nicht mehr im Merker.
  noteStand(app, { deployed: null, live: null });
  if (arg.json) showStand(gone.data);
  else console.log(t(`${app} is removed from ${place}.`, `${app} ist von ${place} entfernt.`));
  process.exit(0);
}

fail(
  t(
    "Say what should happen with the app: --status, --live, --back or --remove.",
    "Sag, was mit der App geschehen soll: --status, --live, --back oder --remove."
  )
);
