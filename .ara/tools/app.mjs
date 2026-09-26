#!/usr/bin/env node
/**
 * The life of an app: create it, plan it, build it, deploy it, switch it live.
 *
 * The tool has two sides, and you recognise them by the call. Without `--device`
 * it works here on the computer, on the file under `apps/<name>/`:
 *
 *   node .ara/tools/app.mjs --app beispiel                    situation and next step
 *   node .ara/tools/app.mjs --app beispiel --new              file from the scaffold
 *   node .ara/tools/app.mjs --app beispiel --plan "<title>"   new plan, open
 *   node .ara/tools/app.mjs --app beispiel --plan-aktiv <file>
 *   node .ara/tools/app.mjs --app beispiel --plan-erledigt <file>
 *   node .ara/tools/app.mjs --app beispiel --build            package into build/
 *
 * With `--device` it addresses a device, and then that device's contract applies:
 *
 *   node .ara/tools/app.mjs --device orin --contract               what this device promises
 *   node .ara/tools/app.mjs --device orin --app beispiel --check
 *   node .ara/tools/app.mjs --device orin --app beispiel --deploy
 *   node .ara/tools/app.mjs --device orin --app beispiel --live
 *   node .ara/tools/app.mjs --device orin --app beispiel --back
 *   node .ara/tools/app.mjs --device orin --app beispiel --remove --confirm beispiel
 *   node .ara/tools/app.mjs --device orin --app beispiel --share anna   share it with an account, staging
 *   node .ara/tools/app.mjs --device orin --app beispiel --unshare anna
 *   node .ara/tools/app.mjs --device rechner --app beispiel --compose   device without Arasul
 *
 * `--check` and `--deploy` also take a folder: `--deploy <folder>` deploys a
 * package that does not come out of `apps/`.
 *
 * `--check` and `--deploy` also hold the field `agent` of `app.json` against the app. Over its
 * form the device's schema judges, and what the device has already refused the kit does not say
 * a second time. Beyond that every route it names has to exist in the backend, `GET agent`
 * included. The build puts a copy of `app.json` next to the backend so that the route can answer.
 *
 * `--check` and `--build` also report where the interface, the sentences of the backend or a
 * flow say du or dir: the device says Sie, and an app speaks like it or without address.
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
 *   node .ara/tools/app.mjs --app beispiel                    Lage und nächster Schritt
 *   node .ara/tools/app.mjs --app beispiel --new              Akte aus der Vorlage
 *   node .ara/tools/app.mjs --app beispiel --plan "<titel>"   neuer Plan, offen
 *   node .ara/tools/app.mjs --app beispiel --plan-aktiv <datei>
 *   node .ara/tools/app.mjs --app beispiel --plan-erledigt <datei>
 *   node .ara/tools/app.mjs --app beispiel --build            Paket nach build/
 *
 * Mit `--device` spricht es ein Gerät an, und dann gilt dessen Kontrakt:
 *
 *   node .ara/tools/app.mjs --device orin --contract               was dieses Gerät verspricht
 *   node .ara/tools/app.mjs --device orin --app beispiel --check
 *   node .ara/tools/app.mjs --device orin --app beispiel --deploy
 *   node .ara/tools/app.mjs --device orin --app beispiel --live
 *   node .ara/tools/app.mjs --device orin --app beispiel --back
 *   node .ara/tools/app.mjs --device orin --app beispiel --remove --confirm beispiel
 *   node .ara/tools/app.mjs --device orin --app beispiel --share anna   einem Konto freigeben, Teststand
 *   node .ara/tools/app.mjs --device orin --app beispiel --unshare anna
 *   node .ara/tools/app.mjs --device rechner --app beispiel --compose   Gerät ohne Arasul
 *
 * `--check` und `--deploy` nehmen auch einen Ordner: `--deploy <ordner>` spielt
 * ein Paket ein, das nicht aus `apps/` kommt.
 *
 * `--check` und `--deploy` halten auch das Feld `agent` der `app.json` gegen die App. Über seine
 * Form urteilt das Schema des Geräts, und was das Gerät schon abgewiesen hat, sagt das Kit nicht
 * ein zweites Mal. Darüber hinaus muss jede Route, die es nennt, im Backend stehen, `GET agent`
 * eingeschlossen. Der Bau legt eine Kopie der `app.json` neben das Backend, damit die Route
 * antworten kann.
 *
 * `--check` und `--build` melden auch, wo Oberfläche, Sätze des Backends oder ein Flow du oder
 * dir sagen: das Gerät siezt, und eine App redet wie das Gerät oder ohne Anrede.
 *
 * Bei einem Kundengerät kommt `--customer <kunde>` dazu. Adresse und Schlüssel
 * stehen in der Geräteakte, nicht im Befehl: damit kann kein Gerät mit den Daten
 * eines anderen Kunden angesprochen werden.
 *
 * **Das Kit kennt genau einen Pfad auswendig, den Kontrakt.** Jeden anderen
 * Endpunkt schlägt es dort nach und ruft ihn nur, wenn das Gerät ihn nennt.
 * Grenzen, Packbefehl und Regeln für das Paket kommen aus derselben Antwort.
 */

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
import { spawnSync } from "node:child_process";
import { join, relative, resolve } from "node:path";
import { ROOT, ensureDir, fail, helpOnly, now, parseArgs, readDevice, sshArgs, today } from "./lib/kit.mjs";
import { localized, t } from "./lib/i18n.mjs";
import { call, reason } from "./lib/arasul.mjs";
import { connect, withContract } from "./lib/link.mjs";
import { catchUpLines, checkManifest, promisedFolders, summarize } from "./lib/contract.mjs";
import { ARRANGEMENT_FILE, appArrangement, arrangementFile, arrangementLines, redeployLines, releaseLines } from "./lib/appways.mjs";
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
import { libraryInMirror, noteVersion, readLibrary, readSource, writeLibrary } from "./lib/marken.mjs";
import { addressSection, standardFindings, standardScope } from "./lib/standard.mjs";
import { agentFindings } from "./lib/agentfield.mjs";
import { APPLEDOUBLE, mirrorState, packEnv, ship } from "./lib/install.mjs";
import { startRefName } from "./lib/device.mjs";
import { hasSecret } from "./lib/secrets.mjs";
import { contractRows, fillPath, listOf, routeRows, shareWays } from "./lib/adminways.mjs";

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
        "  --build                  build the package, result under build/. Needs an active plan",
        "  --no-plan                with --build: build without an active plan, on purpose",
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
        "  --share <account>        share the app with an account, as administrator",
        "  --stand test|live        with --share: which slot, otherwise test",
        "  --unshare <account>      take the share back",
        "  --password-ref <name>    with --share: the stored entry for the login, otherwise the start password",
        "  --login-user <name>      with --share: the administrator who logs in, otherwise the device's default",
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
        "  --build                  Paket bauen, Ergebnis unter build/. Braucht einen aktiven Plan",
        "  --no-plan                mit --build: ohne aktiven Plan bauen, bewusst",
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
        "  --share <konto>          die App einem Konto freigeben, als Administrator",
        "  --stand test|live        mit --share: welcher Stand, sonst test",
        "  --unshare <konto>        die Freigabe zurücknehmen",
        "  --password-ref <name>    mit --share: der Eintrag für die Anmeldung, sonst das Startpasswort",
        "  --login-user <name>      mit --share: der Administrator, der sich anmeldet, sonst die Vorgabe des Geräts",
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

const DEVICE_ACTIONS = ["contract", "check", "deploy", "status", "live", "back", "remove", "compose", "share", "unshare"];
const wantsDevice = DEVICE_ACTIONS.some((name) => arg[name] !== undefined);

// --- Am Rechner: die Akte ----------------------------------------------------

/** Eine Textdatei aus der Vorlage, mit den Werten dieser App darin. */
function fill(text, values) {
  return text.replace(/\{\{([a-z]+)\}\}/g, (whole, key) => (key in values ? values[key] : whole));
}

// Was Platzhalter tragen darf. Eine Datei, die hier fehlt, wandert unveraendert
// mit, und ein `{{name}}` darin bliebe stehen: `.tsx` fehlte bis E13, und die
// Oberflaeche der Vorlage hiess in jeder neuen App "{{name}}".
const TEXT_FILE = /\.(json|md|css|js|jsx|mjs|ts|tsx|sql|html|conf|txt)$|^Dockerfile$|^\.gitignore$/;

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
  // `marken` nennt die Fassung des Designsystems, auf der die App steht
  // (Kontrakt 4, freiwillig). Hier steht die der Vorlage; liegt ein Spiegel
  // vor, wird sie gleich darauf berichtigt.
  const scaffoldLibrary = readLibrary(join(TEMPLATE, "frontend", "src", "marken"));
  copyTemplate(TEMPLATE, dir, {
    id: name,
    name: titel,
    beschreibung,
    datum: today(),
    marken: scaffoldLibrary?.fassung || "",
  });
  for (const state of ["offen", "aktiv", "erledigt"]) ensureDir(join(dir, "plans", state));

  // Das Aussehen kommt aus dem Spiegel, wenn einer da ist. Es ist EIN Stueck:
  // der Ordner `marken/`, das Paket der Bibliothek. Er traegt die Bausteine,
  // ihre Regeln und seit dem 29.08.2026 auch die Werte (`theme.css`).
  //
  // Bis dahin schrieb das Kit die Werte daneben als `design.css`, aus der
  // `index.css` der Shell abgelesen. Seit die Bibliothek als Paket kommt,
  // waeren das zwei Dateien, die dieselben Marken setzen: die eine sagte,
  // Hell sei die Vorgabe, die andere Schwarz.
  const mirror = process.env.ARA_MIRROR || join(ROOT, ".ara", "mirror");
  const source = readSource(libraryInMirror(existsSync(mirror) ? mirror : null));
  const srcDir = join(dir, "frontend", "src");
  // Die Vorlage bringt eine Kopie der Bibliothek mit. Liegt im Spiegel eine,
  // gilt die: sie ist die des Geraets, mit dem hier gearbeitet wird. Danach
  // haelt `marken.mjs` beide aneinander.
  if (existsSync(srcDir) && source) {
    writeLibrary(join(srcDir, "marken"), source, {
      date: today(),
      version: mirrorState()?.version || null,
    });
  }
  const library = readLibrary(join(srcDir, "marken"));
  // Auf welcher Fassung des Designsystems diese App steht, sagt sie im
  // Manifest (Kontrakt 4, freiwillig). Nicht in der Vorlage als Platzhalter:
  // welche Fassung hier landet, entscheidet sich erst eine Zeile darueber.
  noteVersion(dir, library?.fassung || null);

  writeState({ app: name });
  console.log(
    [
      t(`Created: ${relative(ROOT, dir)}`, `Angelegt: ${relative(ROOT, dir)}`),
      `- app.json: ${name} 0.1.0`,
      t(
        "- frontend, backend and one flow with an approval lie in it as a scaffold",
        "- Oberfläche, Backend und ein Flow mit Freigabe liegen als Vorlage darin"
      ),
      library
        ? t(
            `- Design system: version ${library.fassung}, ${library.files.size} files, ` +
              `${source ? "out of the mirror" : "the copy of the scaffold.\n  node .ara/tools/mirror.mjs --refresh fetches the artifact"}`,
            `- Designsystem: Fassung ${library.fassung}, ${library.files.size} Dateien, ` +
              `${source ? "aus dem Spiegel" : "die Kopie der Vorlage.\n  node .ara/tools/mirror.mjs --refresh holt das Artefakt"}`
          )
        : t("- Design system: none, the scaffold carries no library", "- Designsystem: keines, die Vorlage trägt keine Bibliothek"),
      "",
      t(
        "Next: write the plan that says what this app should do.",
        "Als Nächstes: den Plan schreiben, der sagt, was diese App tun soll."
      ),
      `  node .ara/tools/app.mjs --app ${name} --plan "<titel>"`,
      t(
        "What an app can do beyond a form, with code that runs: .ara/knowledge/app-patterns.md",
        "Was eine App jenseits des Formulars kann, mit Code, der läuft: .ara/knowledge/app-patterns.de.md"
      ),
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
 * Der Standard: gebaut und eingespielt wird nur, was auf der Bibliothek steht.
 *
 * Eigene Farben, Palettenklassen, eigene Primitive und ein fehlendes oder
 * veraltetes Feld `marken` halten hier an, vor dem Bau und vor jedem Weg an
 * ein Gerät. Das Gerät vergleicht das Feld ausdrücklich nicht, und der
 * Wächter des Produkts prüft nur die Shell: wenn der Standard gehalten wird,
 * dann beim Bauen mit dem Kit. Ein fremder Container ohne Frontend ist
 * ausgenommen, das entscheidet `standardFindings` am Manifest.
 */
function failOnStandard(app) {
  const findings = standardFindings(app.dir, { manifest: app.manifest });
  if (!findings.length) {
    // Gesagt wird es auch, wenn nichts auffiel: eine Prüfung, die schweigt,
    // sieht aus wie eine, die nicht lief.
    const scope = standardScope(app.dir, { manifest: app.manifest });
    return scope.exempt
      ? t(
          "Design check: not needed, a foreign container brings no interface of its own.",
          "Designprüfung: entfällt, ein fremder Container bringt keine eigene Oberfläche mit."
        )
      : t(
          `Design check: ${scope.files} ${scope.files === 1 ? "file" : "files"} of the interface held against the library (own colours, palette colours, own primitives, the field marken), no finding.`,
          `Designprüfung: ${scope.files} ${scope.files === 1 ? "Datei" : "Dateien"} der Oberfläche gegen die Bibliothek gehalten (eigene Farben, Palettenfarben, eigene Primitive, Feld marken), kein Befund.`
        );
  }
  fail(
    [
      t(
        `${app.name} does not stand on the library. Nothing gets built or deployed like that:`,
        `${app.name} steht nicht auf der Bibliothek. So wird nichts gebaut und nichts eingespielt:`
      ),
      ...findings.map((line) => `- ${line}`),
      "",
      t(
        'The rule with examples stands in .ara/knowledge/design-system.md under "What stops the kit, and what else is forbidden".',
        'Die Regel mit Beispielen steht in .ara/knowledge/design-system.de.md unter „Was das Kit anhält, und was sonst verboten ist".'
      ),
    ].join("\n")
  );
}

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
  // Gebaut wird, was ein Plan sagt. Das Wissen verlangt es (`app.md`, der
  // Lebenslauf), und bis 0.31.0 ließ das Werkzeug den Bau trotzdem zu: ein
  // Fremdtest am 25.09.2026 baute, spielte ein und setzte den Plan erst danach
  // aktiv. `--no-plan` bleibt für den bewussten Bau ohne, etwa zum Vorführen.
  if (!app.plans.aktiv.length && !arg["no-plan"]) {
    const offen = app.plans.offen[0];
    fail(
      t(
        `No plan of ${app.name} is active, and a build builds what a plan says.\n` +
          (offen
            ? `The plan "${offen.titel}" lies open. Go through its assumptions, then:\n  node .ara/tools/app.mjs --app ${app.name} --plan-aktiv ${offen.file}\n`
            : `Write one first:\n  node .ara/tools/app.mjs --app ${app.name} --plan "<title>"\n`) +
          "A build without a plan, on purpose, for a demonstration: --no-plan",
        `Kein Plan von ${app.name} ist aktiv, und ein Bau baut, was ein Plan sagt.\n` +
          (offen
            ? `Der Plan "${offen.titel}" liegt offen. Geh seine Annahmen durch, dann:\n  node .ara/tools/app.mjs --app ${app.name} --plan-aktiv ${offen.file}\n`
            : `Schreib zuerst einen:\n  node .ara/tools/app.mjs --app ${app.name} --plan "<titel>"\n`) +
          "Ein Bau ohne Plan, bewusst, zum Vorführen: --no-plan"
      )
    );
  }
  const designCheck = failOnStandard(app);

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

  // Die App beschreibt sich selbst, aus ihrem Manifest: die Route `agent` liefert das Feld aus
  // `app.json`. Im Container liegt nur der Backend-Ordner, also legt der Bau eine Kopie hinein.
  const backendFolder = app.manifest?.backend?.bauen?.verzeichnis;
  if (backendFolder && !backendFolder.startsWith("/") && !backendFolder.split("/").includes("..") && existsSync(join(buildDir, backendFolder))) {
    cpSync(join(app.dir, "app.json"), join(buildDir, backendFolder, "app.json"));
  }

  const size = (function messen(path) {
    const stat = statSync(path);
    if (stat.isFile()) return stat.size;
    return readdirSync(path).reduce((sum, name) => sum + messen(join(path, name)), 0);
  })(buildDir);

  console.log(
    [
      "",
      designCheck,
      ...addressSection(app.dir).slice(1),
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
              // Compose ist weder Teststand noch live: ein Stand, von Hand
              // gestellt, ohne Anmeldung. Er wird als das benannt, was er ist.
              stand.compose
                ? t(
                    `compose ${stand.compose.version ?? "?"} of ${stand.compose.time}, ${stand.compose.url}, without Arasul`,
                    `Compose ${stand.compose.version ?? "?"} vom ${stand.compose.time}, ${stand.compose.url}, ohne Arasul`
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
 * Unter welchem Namen das Startpasswort dieses Geraets laege.
 *
 * Steht es in der Akte, gilt das; sonst der Name, den `device.mjs` vergaebe.
 * Eine Akte, die das Kit nicht selbst angelegt hat, traegt das Feld naemlich
 * nicht, und der Satz nach dem Einspielen soll den Eintrag trotzdem benennen
 * koennen.
 */
const startRef = fields.start_password_ref || startRefName(device.customer, device.device);

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
  // Auch mit frischem Bau noch einmal: der Standard gilt vor jedem Weg an ein
  // Gerät, und ein Bau aus einer älteren Fassung des Kits hat ihn nie gesehen.
  failOnStandard(app);
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
  const url = `http://${host}:${port}/`;
  // Auch dieser Weg hinterlaesst eine Notiz. Ohne sie stand am 28.08.2026 eine
  // App auf einem Geraet, und die Seite ohne `--device` sagte, vom Kit sei noch
  // nichts eingespielt worden.
  noteStand(manifest.id, { compose: { version: manifest.version ?? null, time: now(), url } });
  console.log(
    [
      "",
      t(
        `${manifest.name ?? manifest.id} runs: ${url}`,
        `${manifest.name ?? manifest.id} läuft: ${url}`
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

/**
 * Was eine App behält und wer ihre Freigaben entscheidet, wörtlich aus dem
 * Kontrakt (`daten` und `freigaben`, seit dem 25.09.2026).
 *
 * Beides trägt kein Schema des Manifests, und beides entscheidet den Bau einer
 * Fach-App: wo die Daten liegen, die ein Update überleben müssen, und wie der
 * Kreis der Entscheider enger wird. Das Wissen sagt, `--contract` gebe es
 * wörtlich aus, und das tut es hier. Ein Gerät, das die Abschnitte nicht
 * kennt, bekommt hier auch keinen.
 */
function contractRuleSections() {
  const sections = [];
  const daten = contract?.daten?.regeln || [];
  if (daten.length) {
    sections.push(
      "",
      t("## What an app keeps", "## Was eine App behält"),
      "",
      t("They stand word for word in the contract, under `daten`:", "Sie stehen wörtlich im Kontrakt, unter `daten`:"),
      "",
      ...daten.map((r) => `- ${r}`)
    );
  }
  const freigaben = contract?.freigaben?.regeln || [];
  if (freigaben.length) {
    sections.push(
      "",
      t("## Who decides the approvals of a run", "## Wer die Freigaben eines Laufs entscheidet"),
      "",
      t("They stand word for word in the contract, under `freigaben`:", "Sie stehen wörtlich im Kontrakt, unter `freigaben`:"),
      "",
      ...freigaben.map((r) => `- ${r}`)
    );
  }
  return sections.concat(readingSections());
}

/** Der Typ eines Feldes aus einem JSON-Schema, lesbar: `object | null`. */
function schemaType(field) {
  if (field?.type) return field.const !== undefined ? `${field.type} ${JSON.stringify(field.const)}` : field.type;
  if (Array.isArray(field?.anyOf)) return field.anyOf.map((f) => f.type || "?").join(" | ");
  return t("any", "beliebig");
}

/**
 * Was das Auslesen zurückgibt und wie ein Bild an ein Modell geht, wörtlich aus
 * dem Kontrakt (`auslesen` und `bilder`, seit dem 26.09.2026).
 *
 * Bis dahin stand die Form der Antwort nirgends, und eine App las `data`, weil
 * sie es so erwartete. Ausgegeben werden die Felder der Antwort mit Typ und
 * Beschreibung und die Sätze daneben; das ganze Schema steht in `--json`. Ein
 * Gerät, das die Abschnitte nicht kennt, bekommt hier auch keinen.
 */
function readingSections() {
  const sections = [];
  const auslesen = contract?.auslesen;
  const antwort = auslesen?.antwort?.properties;
  if (antwort) {
    const pflicht = new Set(auslesen.antwort.required || []);
    sections.push(
      "",
      t(`## What \`${auslesen.weg}\` answers`, `## Was \`${auslesen.weg}\` antwortet`),
      "",
      t(
        "Word for word from the contract, under `auslesen.antwort` (the whole schema, with request and failure: `--json`):",
        "Wörtlich aus dem Kontrakt, unter `auslesen.antwort` (das ganze Schema, mit Anfrage und Fehlschlag: `--json`):"
      ),
      "",
      ...Object.entries(antwort).map(
        ([name, feld]) =>
          `- \`${name}\` (${schemaType(feld)}${pflicht.has(name) ? "" : t(", optional", ", freiwillig")})` +
          (feld.description ? `: ${feld.description}` : "")
      ),
      ...(auslesen.regeln?.length ? ["", ...auslesen.regeln.map((r) => `- ${r}`)] : [])
    );
  }
  const bilder = contract?.bilder?.regeln || [];
  if (bilder.length) {
    sections.push(
      "",
      t("## An image to a model", "## Ein Bild an ein Modell"),
      "",
      t(
        `They stand word for word in the contract, under \`bilder\` (\`${contract.bilder.weg}\`, field \`${contract.bilder.feld}\`):`,
        `Sie stehen wörtlich im Kontrakt, unter \`bilder\` (\`${contract.bilder.weg}\`, Feld \`${contract.bilder.feld}\`):`
      ),
      "",
      ...bilder.map((r) => `- ${r}`)
    );
  }
  return sections.concat(logSection());
}

/**
 * Wer einen Modellaufruf ausgelöst hat, wörtlich aus dem Kontrakt (`protokoll`,
 * seit dem 26.09.2026).
 *
 * Das Gerät schreibt jeden Modellaufruf einer App in sein Protokoll, den
 * Menschen dazu aber nur, wenn die App ihn nennt. Ohne diesen Abschnitt stand
 * im Protokoll einer Kanzlei „App X hat gefragt" und nicht, für wen. Die
 * Vorlage liest die Namen aus `arasul.json`, das Kit schreibt sie aus diesem
 * Abschnitt dorthin.
 */
function logSection() {
  const protokoll = contract?.protokoll;
  if (!protokoll?.regeln?.length) return [];
  const wer = protokoll.einreicher || {};
  return [
    "",
    t("## Who triggered a model call", "## Wer einen Modellaufruf ausgelöst hat"),
    "",
    t(
      `They stand word for word in the contract, under \`protokoll\`. Logged ways: ${(protokoll.wege || []).map((w) => `\`${w}\``).join(", ")}. ` +
        `The human goes in the header \`${wer.kopf ?? "?"}\`, the field \`${wer.feld ?? "?"}\`, at \`/v1\` in \`${wer.feld_openai ?? "?"}\`:`,
      `Sie stehen wörtlich im Kontrakt, unter \`protokoll\`. Protokollierte Wege: ${(protokoll.wege || []).map((w) => `\`${w}\``).join(", ")}. ` +
        `Der Mensch geht in der Kopfzeile \`${wer.kopf ?? "?"}\` mit, im Feld \`${wer.feld ?? "?"}\`, an \`/v1\` in \`${wer.feld_openai ?? "?"}\`:`
    ),
    "",
    ...protokoll.regeln.map((r) => `- ${r}`),
  ];
}

/**
 * Warum dieser Lauf mit 1 endet, wenn das Manifest in Ordnung war.
 *
 * `--check` gab bis 0.19.1 den Rückgabecode 1 aus, ohne dass die Ursache am
 * Ende stand: die Kontraktzeile stand als dritter Punkt oben, direkt darunter
 * „Das Schema dieses Geräts nimmt das Manifest an", und wer den Bericht von
 * unten liest, sieht ein angenommenes Manifest und eine 1. Am 30.08.2026 war
 * das der Grund, aus dem in einer App gesucht wurde, was im Kit lag.
 *
 * Der Abschnitt steht darum ganz am Schluss, mit der Ursache und dem Weg.
 */
function versionSection() {
  if (version.ok) return [];
  return [
    "",
    "",
    t(`## Return code 1: ${place} is ahead of this kit`, `## Rückgabecode 1: ${place} ist weiter als dieses Kit`),
    "",
    version.device === null
      ? version.text
      : t(
          `The device carries contract version ${version.device}, this kit understands up to ${version.kit}. ` +
            "The manifest has nothing to do with it.",
          `Das Gerät führt Kontraktfassung ${version.device}, dieses Kit versteht bis ${version.kit}. ` +
            "Das Manifest hat damit nichts zu tun."
        ),
    catchUpLines()[1],
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
    spaced([
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
      .concat(contractRuleSections())
      .concat(versionSection()))
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

/**
 * Ist im Paket die Oberflaeche, oder ist es ihr Quelltext?
 *
 * Die Vorlage baut mit Vite, TypeScript und Tailwind; was ins Paket gehoert,
 * ist das Ergebnis aus `dist/`, nicht der Ordner davor. Der Unterschied faellt
 * sonst erst am Geraet auf, und dann sieht der Mensch im Rahmen eine leere
 * Seite: der Browser bekommt eine `index.html`, die auf `/src/main.tsx` zeigt,
 * und die gibt es dort nicht.
 *
 * Geprueft wird an dem, was ein Bau immer hat und ein Quellordner nie: eine
 * `index.html` direkt im Ordner. Und an dem, was ein Quellordner immer hat und
 * ein Bau nie: ein `package.json` oder ein `src/` daneben. Beides zusammen,
 * damit weder eine Oberflaeche ohne Bau (die es geben darf, sie ist dann schon
 * fertig) noch ein vergessener Bau durchrutscht.
 */
function checkBuild(dir, manifest) {
  const folder = manifest?.frontend?.verzeichnis;
  if (!folder || folder.startsWith("/") || folder.split("/").includes("..")) return [];
  const path = join(dir, folder);
  if (!existsSync(path) || !statSync(path).isDirectory()) return [];

  const problems = [];
  const quelle = ["package.json", "tsconfig.json", "src", "vite.config.ts", "vite.config.js"].filter((name) =>
    existsSync(join(path, name))
  );
  if (quelle.length) {
    problems.push(
      t(
        `\`${folder}\` in the package is the source, not the build: ${quelle.join(", ")} lie in it. ` +
          "What goes to the device is the result of `npm run build`, out of `dist/`.",
        `\`${folder}\` im Paket ist der Quelltext und nicht der Bau: darin liegen ${quelle.join(", ")}. ` +
          "An das Gerät geht das Ergebnis von `npm run build`, aus `dist/`."
      )
    );
  }
  if (!existsSync(join(path, "index.html"))) {
    problems.push(
      t(
        `\`${folder}\` has no index.html. Without it the device has nothing to deliver under the app's path.`,
        `In \`${folder}\` gibt es keine index.html. Ohne sie hat das Gerät unter dem Pfad der App nichts auszuliefern.`
      )
    );
  }
  return problems;
}

/**
 * Wo die Vereinbarung mit dem Gerät im Paket liegt, wenn die App eine will.
 *
 * Sie liegt im Bauordner des Backends, denn nur was dort liegt, kommt in das
 * Image, das das Gerät baut. Das Kit legt sie **nicht** neu an: eine App, die
 * `arasul.json` nicht mitbringt, will keine, und in ihren Bauordner schreibt
 * das Kit nichts hinein.
 */
function arrangementPath(dir, manifest) {
  const folder = manifest?.backend?.bauen?.verzeichnis;
  if (!folder || folder.startsWith("/") || folder.split("/").includes("..")) return null;
  const file = join(dir, folder, ARRANGEMENT_FILE);
  return existsSync(file) ? file : null;
}

/**
 * Was diese App von diesem Gerät bekommt, in Sätzen.
 *
 * Der Abschnitt steht bei `--check` und beim Einspielen, und er nennt zuerst
 * das, was fehlt. Eine App, der ein Weg fehlt, wird trotzdem eingespielt: sie
 * läuft, sie sammelt Vorgänge, und niemand entscheidet über sie. Das darf
 * niemand erst am Kunden merken.
 */
function arrangementSection(dir, manifest) {
  if (!arrangementPath(dir, manifest)) return [];
  const arrangement = appArrangement(contract, { device: place, date: today() });
  const lines = [
    "",
    t(`## What the app gets from ${place}`, `## Was die App von ${place} bekommt`),
    "",
    t(
      `It goes into the package as \`${ARRANGEMENT_FILE}\`, out of this device's contract. The app guesses none of it.`,
      `Sie geht als \`${ARRANGEMENT_FILE}\` ins Paket, aus dem Kontrakt dieses Geräts. Die App rät davon nichts.`
    ),
    "",
    ...arrangementLines(arrangement),
  ];
  if (arrangement.missing.length) {
    lines.push(
      "",
      t(
        "**This device does not promise all of it.** What is missing here, the app cannot do, and it says so at every item:",
        "**Dieses Gerät verspricht nicht alles davon.** Was hier fehlt, kann die App nicht, und sie sagt es an jedem Vorgang:"
      ),
      "",
      ...arrangement.missing.map((sentence) => `- ${sentence}`)
    );
  }
  return lines;
}

/**
 * Zeilen eines Berichts, vor jeder Überschrift genau eine Leerzeile.
 *
 * Die Abschnitte kommen aus verschiedenen Händen, und der Kontrakt entscheidet,
 * welche es gibt. Am 26.09.2026 stand „What the app gets from" ohne Leerzeile
 * direkt unter der letzten Regel des Kontrakts, und Markdown las die
 * Überschrift als Fortsetzung der Liste. Hier wird das einmal geregelt statt in
 * jedem Abschnitt.
 */
function spaced(lines) {
  const out = [];
  for (const line of lines) {
    if (line === "" && (out.length === 0 || out[out.length - 1] === "")) continue;
    if (/^#{1,6} /.test(line) && out.length && out[out.length - 1] !== "") out.push("");
    out.push(line);
  }
  while (out[out.length - 1] === "") out.pop();
  return out.join("\n");
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
        "## What lies in the package does not fit the manifest",
        "## Was im Paket liegt, passt nicht zum Manifest"
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
  lines.push(...flowSection(), ...contractRuleSections());
  return lines.join("\n");
}

if (arg.check !== undefined) {
  const { dir, manifest } = readManifest(folderFor(arg.check));
  const result = { ...checkManifest(contract, manifest), manifest };
  const delivery = [...checkDelivery(dir, manifest), ...checkBuild(dir, manifest), ...agentFindings(dir, manifest, result.problems)];
  if (arg.json) {
    const arrangement = arrangementPath(dir, manifest)
      ? appArrangement(contract, { device: place, date: today() })
      : null;
    console.log(JSON.stringify({ device: place, folder: dir, version, delivery, arrangement, ...result }, null, 2));
  } else {
    console.log(
      spaced([
        ...reportManifest(relative(ROOT, dir) || dir, result, delivery).split("\n"),
        ...arrangementSection(dir, manifest),
        ...addressSection(dir),
        ...versionSection(),
      ])
    );
  }
  process.exit(result.ok && !delivery.length && version.ok ? 0 : 1);
}

// --- --deploy ----------------------------------------------------------------

if (arg.deploy !== undefined) {
  const { dir, manifest } = readManifest(folderFor(arg.deploy));
  const result = { ...checkManifest(contract, manifest), manifest };
  const delivery = [...checkDelivery(dir, manifest), ...checkBuild(dir, manifest), ...agentFindings(dir, manifest, result.problems)];
  if (!result.ok || delivery.length) {
    console.log(reportManifest(relative(ROOT, dir) || dir, result, delivery));
    fail(t("\nNothing deployed. First the manifest, then the device.", "\nNichts eingespielt. Erst das Manifest, dann das Gerät."));
  }
  // „Nichts eingespielt" allein schickt den Menschen in seine App. Der Grund
  // liegt hier im Kit, und der Weg heraus steht in derselben Meldung.
  // „Nichts eingespielt" zuerst, der Grund gleich dahinter und der Weg zuletzt:
  // wer eine Absage liest, liest ihre letzte Zeile. Am 30.08.2026 stand dort
  // nichts, und gesucht wurde danach in der App.
  if (!version.ok) fail(`${t("Nothing deployed.", "Nichts eingespielt.")} ${version.text}`);

  // Bevor gepackt wird, bekommt die App die Vereinbarung dieses Geräts: unter
  // welchen Namen es ihr Adresse und Schlüssel in den Container legt, in
  // welcher Kopfzeile der Schlüssel mitgeht, welche Wege es dafür führt. Ohne
  // das müsste die App raten, und eine App, die rät, findet auf einem Gerät mit
  // anderen Namen nichts und hält das für „hier läuft kein Arasul".
  const arrangementTarget = arrangementPath(dir, manifest);
  if (arrangementTarget) {
    const arrangement = appArrangement(contract, { device: place, date: today() });
    writeFileSync(arrangementTarget, arrangementFile(arrangement));
    console.log(arrangementSection(dir, manifest).join("\n").replace(/^\n/, ""));
  }

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

    // War diese App schon einmal hier? Dann steht die Freigabe womöglich
    // längst: sie gilt der App und ihrem Stand, nicht der Fassung. Das Kit weiß
    // es aus seinem Merker oder aus der Antwort des Geräts, das eine vorige
    // Fassung nennt. Am 25.09.2026 sagte es nach der zweiten Fassung wieder
    // „Gesehen hat es noch niemand", während die Tester sie längst sahen.
    const vorher = readState().apps?.[sent.data?.app_id ?? manifest.id]?.[place]?.deployed || null;
    const frueher = vorher?.version || sent.data?.vorige_version || null;

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
          "",
          ...(frueher
            ? redeployLines({ place, previous: frueher, database: Boolean(contract?.umgebung?.datenbank) })
            : releaseLines({
                place,
                base,
                testUrl: `${base}${(contract?.apps?.teststand || "/apps/<id>/test/").replace("<id>", stand.app_id ?? manifest.id)}`,
                deviceCall: `node .ara/tools/device.mjs${device.customer ? ` --customer ${device.customer}` : ""} --name ${device.device}`,
                shareCall: `node .ara/tools/app.mjs${device.customer ? ` --customer ${device.customer}` : ""} --device ${device.device} --app ${stand.app_id ?? manifest.id}`,
                startRef,
                startPassword: hasSecret(startRef),
                docs: Boolean(mirrorState()),
                docsCall: `node .ara/tools/mirror.mjs --docs${device.customer ? ` --customer ${device.customer}` : ""} --device ${device.device}`,
              })),
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
      "For --status, --live, --back, --remove, --share and --unshare I need --app <id>.",
      "Für --status, --live, --back, --remove, --share und --unshare brauche ich --app <id>."
    )
  );
}

/**
 * Was das Gerät über eine App weiß, in Sätzen.
 *
 * Bis 0.31.0 stand hier jedes Feld der Antwort als Zeile, die Stände als
 * rohes JSON darin: ein Fremdtest am 25.09.2026 las darin nichts. Jetzt je
 * Stand die Fassung, seit wann, ob das Backend läuft, ob das Gerät einen Mangel
 * nennt, und die Flows. Was die Antwort sonst trägt, gibt `--json` ganz aus.
 */
function standLines(name, stand) {
  if (!stand) return [t(`## ${name}: empty`, `## ${name}: leer`)];
  const backend = stand.backend;
  const lines = [
    t(
      `## ${name}: version ${stand.version ?? "?"}${stand.vorige_version ? `, before that ${stand.vorige_version}` : ""}`,
      `## ${name}: Fassung ${stand.version ?? "?"}${stand.vorige_version ? `, davor ${stand.vorige_version}` : ""}`
    ),
    "",
    t(`- Deployed: ${stand.eingespielt_am ?? "?"}`, `- Eingespielt: ${stand.eingespielt_am ?? "?"}`),
    ...(stand.pfad ? [t(`- Address: ${base}${stand.pfad}`, `- Adresse: ${base}${stand.pfad}`)] : []),
  ];
  if (backend) {
    lines.push(
      backend.laeuft
        ? t(
            `- Backend: runs${backend.gesundheit ? `, health ${backend.gesundheit}` : ""}${backend.seit ? `, since ${backend.seit}` : ""}`,
            `- Backend: läuft${backend.gesundheit ? `, Gesundheit ${backend.gesundheit}` : ""}${backend.seit ? `, seit ${backend.seit}` : ""}`
          )
        : t(`- Backend: does not run (${backend.status ?? "no status"})`, `- Backend: läuft nicht (${backend.status ?? "ohne Status"})`)
    );
  }
  if (stand.mangel) lines.push(t(`- The device names a defect: ${stand.mangel}`, `- Das Gerät nennt einen Mangel: ${stand.mangel}`));
  else if (stand.lieferbar === false) lines.push(t("- The device does not deliver it.", "- Das Gerät liefert sie nicht aus."));
  if (Array.isArray(stand.modelle) && stand.modelle.length) {
    lines.push(t(`- Models it asks for: ${stand.modelle.join(", ")}`, `- Modelle, die sie verlangt: ${stand.modelle.join(", ")}`));
  }
  for (const flow of stand.flows || []) {
    lines.push(
      t(
        `- Flow ${flow.name}${flow.modell ? `, model ${flow.modell}` : ", the device's default model"}${flow.modell_ueberschrieben ? " (overridden by the administrator)" : ""}`,
        `- Flow ${flow.name}${flow.modell ? `, Modell ${flow.modell}` : ", Vorgabemodell des Geräts"}${flow.modell_ueberschrieben ? " (vom Administrator überschrieben)" : ""}`
      )
    );
  }
  if (stand.marken) lines.push(t(`- Design system: ${stand.marken}`, `- Designsystem: ${stand.marken}`));
  return lines;
}

function showStand(data) {
  if (arg.json) {
    console.log(JSON.stringify({ device: place, app: data }, null, 2));
    return;
  }
  const staende = data?.staende;
  if (!staende || typeof staende !== "object") {
    // Eine Antwort ohne Stände, etwa nach dem Schalten: was da ist, schlicht.
    console.log(
      [
        t(`# ${app} on ${place}`, `# ${app} auf ${place}`),
        "",
        ...Object.entries(data || {}).map(([k, v]) => `- ${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`),
      ].join("\n")
    );
    return;
  }
  console.log(
    [
      t(`# ${data.name ?? app} on ${place}`, `# ${data.name ?? app} auf ${place}`),
      "",
      ...(Array.isArray(data.versionen) && data.versionen.length
        ? [t(`Versions the device keeps: ${data.versionen.join(", ")}`, `Fassungen, die das Gerät hält: ${data.versionen.join(", ")}`), ""]
        : []),
      ...standLines(t("Staging", "Teststand"), staende.test),
      "",
      ...standLines("Live", staende.live),
      "",
      t("Who is released for it, the kit's key does not see.", "Wer dafür freigegeben ist, sieht der Schlüssel des Kits nicht."),
      ...(contract?.umgebung?.datenbank && (staende.test?.backend || staende.live?.backend)
        ? [
            t(
              "Staging and live each have their own database: switching live does not take the data of staging along.",
              "Teststand und live haben je eine eigene Datenbank: wer live schaltet, nimmt die Daten des Teststands nicht mit."
            ),
          ]
        : []),
      t(`Everything the device answered: --json`, `Alles, was das Gerät geantwortet hat: --json`),
    ].join("\n")
  );
}

// --- --share und --unshare ---------------------------------------------------

/**
 * Wo die Wege zum Freigeben beschrieben sind, der Reihe nach: im Kontrakt,
 * im Spiegel, in den Anleitungen am Gerät. Zurück kommen die Wege und die
 * Quelle, oder die Liste dessen, was an keiner Stelle stand.
 *
 * Der Kontrakt nennt sie heute nicht, er beschreibt die äußere Schnittstelle
 * und nicht die Verwaltung. Die API-Referenz tut es, im Spiegel und am Gerät;
 * dort ist sie die Fassung, die läuft.
 */
function shareSource() {
  const tried = [];
  const fromContract = shareWays(contractRows(contract));
  if (fromContract.ways && !fromContract.missing.length) return { ...fromContract.ways, source: t("the contract", "dem Kontrakt") };
  tried.push(t("the contract names no way to share an app", "der Kontrakt nennt keinen Weg, eine App freizugeben"));

  const referenz = (datei) => /(^|\/)api\/|referen/i.test(datei) && /\.md$/i.test(datei);
  const mirror = process.env.ARA_MIRROR || join(ROOT, ".ara", "mirror");
  if (existsSync(mirror)) {
    const files = [];
    const walk = (dir, depth = 0) => {
      if (depth > 6) return;
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path, depth + 1);
        else if (referenz(relative(mirror, path))) files.push(path);
      }
    };
    walk(mirror);
    const found = shareWays(files.flatMap((file) => routeRows(readFileSync(file, "utf8"))));
    if (found.ways && !found.missing.length) {
      return { ...found.ways, source: t(`the mirror (${files.map((f) => relative(ROOT, f)).join(", ")})`, `dem Spiegel (${files.map((f) => relative(ROOT, f)).join(", ")})`) };
    }
    tried.push(t(`the mirror: ${found.missing.join("; ")}`, `der Spiegel: ${found.missing.join("; ")}`));
  }

  const docs = ["--docs", ...(device.customer ? ["--customer", device.customer] : []), "--device", device.device];
  const mirrorTool = join(ROOT, ".ara", "tools", "mirror.mjs");
  const list = spawnSync(process.execPath, [mirrorTool, ...docs], { encoding: "utf8" });
  const files = (list.stdout || "").split("\n").map((z) => z.match(/^- (\S+)$/)?.[1]).filter((f) => f && referenz(f));
  if (files.length) {
    const rows = [];
    for (const file of files) {
      const read = spawnSync(process.execPath, [mirrorTool, ...docs, "--read", file], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
      if (read.status === 0) rows.push(...routeRows(read.stdout));
    }
    const found = shareWays(rows);
    if (found.ways && !found.missing.length) {
      return { ...found.ways, source: t(`the manuals on ${place} (${files.join(", ")})`, `den Anleitungen auf ${place} (${files.join(", ")})`) };
    }
    tried.push(t(`the manuals on ${place}: ${found.missing.join("; ")}`, `die Anleitungen auf ${place}: ${found.missing.join("; ")}`));
  } else {
    tried.push(
      t(
        `no API reference among the manuals on ${place}${list.status ? `: ${(list.stdout || list.stderr || "").trim().split("\n")[0]}` : ""}`,
        `keine API-Referenz unter den Anleitungen auf ${place}${list.status ? `: ${(list.stdout || list.stderr || "").trim().split("\n")[0]}` : ""}`
      )
    );
  }
  return { tried };
}

/**
 * Eine Sitzung als Administrator, aus `device.mjs --admin-login`.
 *
 * Nicht nachgebaut: die Anmeldung, ihre Quelle für Weg und Felder und die
 * Sätze bei einer Abweisung stehen dort. `--password-ref` und `--login-user`
 * gehen durch, das Passwort bleibt im anderen Prozess, und zurück kommt nur
 * der Ausweis.
 */
function adminSession() {
  const args = [join(ROOT, ".ara", "tools", "device.mjs"), ...(device.customer ? ["--customer", device.customer] : []), "--name", device.device, "--admin-login", "--token"];
  for (const name of ["password-ref", "login-user", "login-path", "login-user-field", "login-password-field"]) {
    if (str(arg[name])) args.push(`--${name}`, str(arg[name]));
  }
  if (arg.insecure) args.push("--insecure");
  const run = spawnSync(process.execPath, args, { encoding: "utf8" });
  if (run.status !== 0 || !run.stdout.trim()) {
    fail(t("No session as administrator, so no share:\n", "Keine Sitzung als Administrator, also keine Freigabe:\n") + (run.stderr || run.stdout).trim());
  }
  return run.stdout.trim();
}

async function share() {
  const revoking = arg.unshare !== undefined;
  const konto = str(revoking ? arg.unshare : arg.share);
  if (!konto) {
    fail(t(`--${revoking ? "unshare" : "share"} needs the name of an account.`, `--${revoking ? "unshare" : "share"} braucht den Namen eines Kontos.`));
  }
  const stand = str(arg.stand) || "test";
  if (!["test", "live"].includes(stand)) {
    fail(t(`--stand is test or live, not ${stand}.`, `--stand ist test oder live, nicht ${stand}.`));
  }
  const ways = shareSource();
  if (!ways.share) {
    fail(
      [
        t(`${place} says nowhere the kit can read it how an app is shared:`, `${place} sagt nirgends, wo das Kit es lesen kann, wie eine App freigegeben wird:`),
        ...ways.tried.map((z) => `- ${z}`),
        "",
        t(
          "An administrator does it in the interface. Which page, stands in the admin handbook: ",
          "Ein Administrator tut es in der Oberfläche. Welche Seite, steht im Admin-Handbuch: "
        ) + `node .ara/tools/mirror.mjs --docs${device.customer ? ` --customer ${device.customer}` : ""} --device ${device.device}`,
      ].join("\n")
    );
  }
  if (!revoking && stand === "test" && !ways.share.slot) {
    fail(
      t(
        `The way to share on ${place} (${ways.share.path}) takes no slot, so a share would fall on live and the account would not see staging. Share with --stand live, or in the interface.`,
        `Der Weg zum Freigeben auf ${place} (${ways.share.path}) nimmt keinen Stand, eine Freigabe fiele also auf live, und das Konto sähe den Teststand nicht. Mit --stand live freigeben, oder in der Oberfläche.`
      )
    );
  }

  const token = adminSession();
  const ask = (method, path, json = null) =>
    call({ base, method, path, json, key: `Bearer ${token}`, keyHeader: "Authorization", insecure: link.insecure }).catch((error) => fail(error.message));

  const konten = await ask(ways.accounts.verb, ways.accounts.path);
  if (!konten.ok) fail(t(`${place} does not list its accounts.\n`, `${place} listet seine Konten nicht.\n`) + reason(konten));
  const eintrag = listOf(konten.data).find((k) => k?.[ways.accounts.name] === konto);
  if (!eintrag) {
    fail(
      t(
        `There is no account "${konto}" on ${place}. Which ones there are: ${listOf(konten.data).map((k) => k?.[ways.accounts.name]).filter(Boolean).join(", ")}`,
        `Auf ${place} gibt es kein Konto "${konto}". Welche es gibt: ${listOf(konten.data).map((k) => k?.[ways.accounts.name]).filter(Boolean).join(", ")}`
      )
    );
  }
  const kennung = eintrag[ways.accounts.id];

  let answer;
  if (revoking) {
    answer = await ask("DELETE", fillPath(ways.revoke.path, { [ways.revoke.app]: app, [ways.revoke.account]: kennung }));
    if (answer.status === 404) {
      console.log(t(`${app} was not shared with ${konto} on ${place}. Nothing to take back.`, `${app} war auf ${place} nicht für ${konto} freigegeben. Nichts zurückzunehmen.`));
      process.exit(0);
    }
  } else {
    answer = await ask("POST", ways.share.path, {
      [ways.share.app]: app,
      [ways.share.account]: kennung,
      ...(ways.share.slot ? { [ways.share.slot]: stand } : {}),
    });
  }
  if (!answer.ok) {
    fail(
      t(
        `${place} did not ${revoking ? "take back" : "accept"} the share.\n`,
        `${place} hat die Freigabe nicht ${revoking ? "zurückgenommen" : "angenommen"}.\n`
      ) + reason(answer)
    );
  }
  if (arg.json) {
    console.log(JSON.stringify({ device: place, app, konto, stand: revoking ? null : stand, geteilt: !revoking, antwort: answer.data, quelle: ways.source }, null, 2));
    process.exit(0);
  }
  const pfad = (stand === "test" ? contract?.apps?.teststand : contract?.apps?.basis) || null;
  console.log(
    [
      revoking
        ? t(`${app} is no longer shared with ${konto} on ${place}.`, `${app} ist auf ${place} nicht mehr für ${konto} freigegeben.`)
        : t(`${app} is shared with ${konto} on ${place}, slot ${stand}.`, `${app} ist auf ${place} für ${konto} freigegeben, Stand ${stand}.`),
      ...(!revoking && pfad ? [t(`${konto} opens it at ${base}${pfad.replace("<id>", app)}`, `${konto} öffnet sie unter ${base}${pfad.replace("<id>", app)}`)] : []),
      t(`Ways and fields from ${ways.source}.`, `Wege und Felder aus ${ways.source}.`),
      ...(revoking ? [] : [t(`Take it back: --unshare ${konto}`, `Zurücknehmen: --unshare ${konto}`)]),
    ].join("\n")
  );
  process.exit(0);
}

if (arg.share !== undefined || arg.unshare !== undefined) await share();

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
          "all permissions, the app's keys and its databases. The device's backups of them stay,\n" +
          "an administrator can bring them back; from the kit there is no way back.\n" +
          `If that is what you want, append it: --confirm ${app}`,
        `Das entfernt ${app} von ${place}: beide Container mitsamt ihren Volumen, beide Stände,\n` +
          "alle Freigaben, die Schlüssel der App und ihre Datenbanken. Die Sicherungen des Geräts davon\n" +
          "bleiben, ein Administrator kann sie zurückholen; vom Kit aus gibt es keinen Rückweg.\n" +
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
