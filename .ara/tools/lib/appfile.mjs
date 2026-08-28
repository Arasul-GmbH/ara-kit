/**
 * Die Akte einer App: Ordner, Manifest, Pläne, Bau.
 *
 * Eine App gehört dem Nutzer und liegt unter `apps/<name>/`, kundenunabhängig:
 * derselbe Urlaubsantrag läuft vielleicht bei drei Kunden, und dreimal
 * derselbe Quelltext unter drei Geräteakten wäre dreimal dasselbe Ding, das
 * auseinanderläuft. Wo eine App läuft, sagt das Gerät, nicht dieser Ordner.
 *
 * **Hier steht kein Produktwert.** Was in ein Paket gehört, sagt der Kontrakt
 * des Geräts; dieses Modul kennt nur den Schnitt des Ordners, den das Kit selbst
 * anlegt: Plan, Beschreibung und Bau liegen neben dem Paket, nicht darin.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync } from "node:fs";
import { join } from "node:path";
import { ROOT, readFrontmatter, today, writeFrontmatter } from "./kit.mjs";

export const APPS = join(ROOT, "apps");

/** Die drei Stände eines Plans. Aktiv ist höchstens einer. */
export const PLAN_STATES = Object.freeze(["offen", "aktiv", "erledigt"]);

/**
 * Was im App-Ordner liegt und **nicht** ins Paket gehört.
 *
 * Das ist der Schnitt des Kits und keine Aussage über das Produkt: Pläne und
 * die Beschreibung sind die Arbeit am Ding, das Paket ist das Ding. Alles
 * andere im Ordner wandert mit, damit ein Feld, das im Kontrakt dazukommt,
 * nicht hier nachgezogen werden muss.
 */
export const NOT_IN_PACKAGE = Object.freeze(["plans", "build", "README.md", "node_modules"]);

/** Der Ordner einer App. Prüft nicht, ob es ihn gibt. */
export function appPath(name) {
  return join(APPS, name);
}

/** Alle angelegten Apps. */
export function listApps() {
  if (!existsSync(APPS)) return [];
  return readdirSync(APPS, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
}

/** Eine Kennung, die als Ordnername, Pfad und Containername taugt. */
export function validName(name) {
  return typeof name === "string" && /^[a-z0-9][a-z0-9-]*$/.test(name);
}

/** Jüngste Änderung unter einem Pfad, in Millisekunden. Fehlt er, ist es 0. */
function newest(path, skip = []) {
  if (!existsSync(path)) return 0;
  const stat = statSync(path);
  if (stat.isFile()) return stat.mtimeMs;
  let latest = 0;
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || skip.includes(entry.name)) continue;
    latest = Math.max(latest, newest(join(path, entry.name), skip));
  }
  return latest;
}

/** Die Plandateien eines Standes, neueste zuerst. */
function plans(dir, state) {
  const path = join(dir, "plans", state);
  if (!existsSync(path)) return [];
  return readdirSync(path)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .reverse()
    .map((name) => {
      const { fields } = readFrontmatter(join(path, name));
      return { file: name, state, path: join(path, name), titel: fields.titel || name.replace(/\.md$/, "") };
    });
}

/**
 * Der Stand einer App, wie er auf der Platte liegt.
 *
 * Liest und urteilt nicht: was daraus folgt, entscheidet `nextSteps`.
 */
export function readApp(name) {
  const dir = appPath(name);
  const manifestFile = join(dir, "app.json");
  const app = {
    name,
    dir,
    exists: existsSync(dir),
    manifest: null,
    manifestProblem: null,
    readme: existsSync(join(dir, "README.md")),
    plans: Object.fromEntries(PLAN_STATES.map((state) => [state, plans(dir, state)])),
    build: { exists: false, version: null, id: null, stale: false, time: null },
  };
  if (!app.exists) return app;

  if (!existsSync(manifestFile)) {
    app.manifestProblem = "Es gibt keine app.json. Ohne Manifest ist der Ordner kein Paket.";
  } else {
    try {
      app.manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
    } catch (error) {
      app.manifestProblem = `app.json ist kein lesbares JSON: ${error.message}`;
    }
  }
  if (app.manifest && app.manifest.id && app.manifest.id !== name) {
    app.manifestProblem =
      `app.json nennt die Kennung "${app.manifest.id}", der Ordner heißt "${name}". ` +
      "Beide müssen dasselbe sagen, sonst liegt die App am Gerät unter einem anderen Namen als hier.";
  }

  const buildDir = join(dir, "build");
  const buildManifest = join(buildDir, "app.json");
  if (existsSync(buildManifest)) {
    let manifest = null;
    try {
      manifest = JSON.parse(readFileSync(buildManifest, "utf8"));
    } catch {
      manifest = null;
    }
    app.build = {
      exists: true,
      version: manifest?.version ?? null,
      id: manifest?.id ?? null,
      // Ein Bau, der älter ist als die Quelle, ist kein Bau, sondern ein
      // Missverständnis: eingespielt würde der Stand von vorgestern.
      stale: newest(dir, NOT_IN_PACKAGE) > newest(buildDir),
      time: new Date(statSync(buildManifest).mtimeMs).toISOString().slice(0, 16).replace("T", " "),
    };
  }
  return app;
}

/**
 * Was zuletzt an ein Gerät ging, aus dem Merker.
 *
 * Der Merker hält je App und Gerät fest, welche Fassung eingespielt und welche
 * live geschaltet wurde. Er liegt in `.ara/state.json` und nicht im Ordner der
 * App: dieser Ordner ist das Paket, und der Stand am Gerät gehört nicht hinein.
 *
 * Ohne Gerät im Aufruf gilt der jüngste Eintrag. Wer `--app x` ohne `--device`
 * ruft, meint das Gerät, an dem er zuletzt war.
 */
export function lastStand(record, device = null) {
  // Ein Eintrag ohne Teststand und ohne Live ist einer, der entfernt wurde.
  const entries = Object.entries(record || {}).filter(([, stand]) => stand && (stand.deployed || stand.live));
  const fitting = device
    ? entries.filter(([place]) => place === device || place.endsWith(`/${device}`))
    : entries;
  if (!fitting.length) return null;
  const when = (stand) => String(stand.live?.time || stand.deployed?.time || "");
  const [place, stand] = fitting.sort((a, b) => when(b[1]).localeCompare(when(a[1])))[0];
  return { place, ...stand };
}

/** Die Schalter, mit denen genau dieses Gerät gemeint ist. */
function deviceFlags(device, stand) {
  const place = device || stand?.place || null;
  if (!place) return " --device <gerät>";
  const [first, second] = place.split("/");
  return second ? ` --customer ${first} --device ${second}` : ` --device ${first}`;
}

/**
 * Was als Nächstes dran ist, und nur das.
 *
 * Der Lebenslauf einer App ist ein Kreis: planen, bauen, in den Teststand,
 * live, wieder planen. An jeder Stelle gibt es wenige sinnvolle Schritte, und
 * die stehen hier. Ein Schritt, der jetzt nichts bringt, wird nicht angeboten:
 * eine Liste aller Möglichkeiten wäre eine Bedienungsanleitung, kein Vorschlag.
 *
 * `stand` ist der Merker zu dieser App: was zuletzt eingespielt und was live
 * geschaltet wurde. Ohne ihn kannte das Werkzeug nur die Platte und schlug am
 * 28.08.2026 noch `--check` und `--deploy` vor, nachdem die Fassung längst live
 * war. Ein Vorschlag, der einen erledigten Schritt wiederholt, ist keiner.
 */
export function nextSteps(app, { device, stand = null } = {}) {
  const ziel = deviceFlags(device, stand);
  const steps = [];
  if (!app.exists) {
    steps.push({
      was: "Die App gibt es noch nicht. Zuerst das Interview, dann die Akte aus der Vorlage.",
      wie: `node .ara/tools/app.mjs --app ${app.name} --new`,
    });
    return steps;
  }
  if (app.manifestProblem) {
    steps.push({ was: app.manifestProblem, wie: null });
    return steps;
  }
  const aktiv = app.plans.aktiv[0];
  const offen = app.plans.offen[0];

  if (!aktiv && !offen && !app.plans.erledigt.length) {
    steps.push({
      was: "Es gibt keinen Plan. Führ das Interview und schreib auf, was gebaut werden soll.",
      wie: `node .ara/tools/app.mjs --app ${app.name} --plan "<titel>"`,
    });
  } else if (!aktiv && offen) {
    steps.push({
      was: `Der Plan "${offen.titel}" liegt offen. Geh die Annahmen darin durch und setz ihn dann aktiv.`,
      wie: `node .ara/tools/app.mjs --app ${app.name} --plan-aktiv ${offen.file}`,
    });
  } else if (aktiv) {
    steps.push({ was: `Aktiv ist der Plan "${aktiv.titel}". Bau, was darin steht.`, wie: null });
  }

  const fertig = app.build.exists && !app.build.stale;
  const gebaut = fertig ? app.build.version ?? null : null;
  // Nur was zu dieser gebauten Fassung passt, zählt. Eine ältere Fassung am
  // Gerät sagt über die neue nichts.
  const imTeststand = Boolean(gebaut && stand?.deployed?.version === gebaut);
  const istLive = Boolean(gebaut && stand?.live?.version === gebaut);

  if (!app.build.exists) {
    steps.push({ was: "Gebaut ist noch nichts. Der Bau legt das Paket unter build/ an.", wie: `node .ara/tools/app.mjs --app ${app.name} --build` });
  } else if (app.build.stale) {
    steps.push({
      was: `Der Bau von ${app.build.time} ist älter als der Quelltext. Noch einmal bauen, sonst geht der Stand von vorgestern an das Gerät.`,
      wie: `node .ara/tools/app.mjs --app ${app.name} --build`,
    });
  } else if (istLive) {
    steps.push({
      was:
        `${app.build.id ?? app.name} ${gebaut} ist auf ${stand.place} live, seit ${stand.live.time}. ` +
        "Am Gerät ist nichts offen. Zurück auf die vorige Fassung ginge mit --back.",
      wie: null,
    });
  } else if (imTeststand) {
    steps.push({
      was: `${gebaut} steht im Teststand von ${stand.place}, seit ${stand.deployed.time}. Live schaltet ein Mensch, wenn der Teststand überzeugt.`,
      wie: `node .ara/tools/app.mjs${ziel} --app ${app.name} --live`,
    });
  } else {
    steps.push({
      was: `Gebaut ist ${app.build.id ?? app.name} ${gebaut ?? "?"}. Halt das Paket gegen den Kontrakt des Geräts, bevor es fliegt.`,
      wie: `node .ara/tools/app.mjs${ziel} --app ${app.name} --check`,
    });
    steps.push({
      was: "Einspielen rollt in den Teststand. Live schaltet danach ein Mensch.",
      wie: `node .ara/tools/app.mjs${ziel} --app ${app.name} --deploy`,
    });
  }

  if (aktiv && fertig) {
    steps.push({
      was: istLive
        ? `${gebaut} ist live. Schließ den Plan "${aktiv.titel}" ab und schreib die README fort.`
        : `Wenn die Fassung live ist: den Plan "${aktiv.titel}" abschließen und die README fortschreiben.`,
      wie: `node .ara/tools/app.mjs --app ${app.name} --plan-erledigt ${aktiv.file}`,
    });
  }
  // Nur, wenn oben nicht schon nach einem ersten Plan gefragt wurde: eine App
  // mit erledigten Plänen und ohne offenen ist am Ende eines Kreises.
  if (!aktiv && !offen && istLive && app.plans.erledigt.length) {
    steps.push({
      was: "Die Fassung ist live und kein Plan ist offen. Der nächste Kreis beginnt mit dem nächsten Plan.",
      wie: `node .ara/tools/app.mjs --app ${app.name} --plan "<titel>"`,
    });
  }
  return steps;
}

/** Aus einem Titel wird ein Dateiname: klein, ohne Umlaute, ohne Leerzeichen. */
export function slug(title) {
  return String(title)
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "plan";
}

/** Der Dateiname eines Plans: das Datum vorn, damit die Reihenfolge stimmt. */
export function planFileName(title, date = today()) {
  return `${date}-${slug(title)}.md`;
}

/**
 * Einen Plan in einen anderen Stand schieben.
 *
 * Verschoben wird die Datei, nicht ihr Inhalt: der Stand steht im Ordnernamen
 * und im Frontmatter, und beide sagen dasselbe. Höchstens ein Plan ist aktiv,
 * sonst weiß niemand mehr, woran gerade gebaut wird.
 */
export function movePlan(app, file, to) {
  if (!PLAN_STATES.includes(to)) throw new Error(`Den Stand "${to}" gibt es nicht.`);
  const from = PLAN_STATES.find((state) => app.plans[state].some((plan) => plan.file === file));
  if (!from) throw new Error(`Unter apps/${app.name}/plans/ gibt es keine Datei ${file}.`);
  if (from === to) throw new Error(`${file} steht schon auf "${to}".`);
  if (to === "aktiv" && app.plans.aktiv.length) {
    throw new Error(
      `Aktiv ist schon "${app.plans.aktiv[0].titel}" (${app.plans.aktiv[0].file}). ` +
        "Höchstens ein Plan ist aktiv: erst den abschließen, dann den nächsten."
    );
  }
  const source = join(app.dir, "plans", from, file);
  if (versioned(source)) {
    throw new Error(
      `${file} gehört zum Kit: die Datei liegt in seiner Versionsverwaltung.\n` +
        "Das ist der Plan der Referenz-App, und die ist zum Ansehen da, nicht zum Bearbeiten.\n" +
        "Verschoben würde eine Datei, die mit dem Klon kam: der Arbeitsordner wäre danach\n" +
        "schmutzig, und das nächste Update stolperte darüber.\n" +
        "Für eine eigene App: node .ara/tools/app.mjs --app <name> --new"
    );
  }
  const target = join(app.dir, "plans", to);
  mkdirSync(target, { recursive: true });
  const path = join(target, file);
  renameSync(source, path);
  writeFrontmatter(path, { stand: to, ...(to === "erledigt" ? { erledigt: today() } : {}) });
  return { from, to, path };
}

/**
 * Liegt diese Datei in der Versionsverwaltung des Kits?
 *
 * Der Fremdtest am 28.08.2026 schob den Plan der Referenz-App auf „erledigt",
 * und danach meldete `git status` im frischen Klon eine verschobene Datei. Was
 * dem Nutzer gehört, verfolgt das Kit-Repo nicht; die Referenz-App ist die eine
 * Ausnahme, und genau darum darf an ihr nichts verschoben werden.
 *
 * Gefragt wird git selbst und keine Liste im Kit: eine Liste liefe auseinander,
 * sobald jemand die Referenz-App umbenennt. Ohne Repository ist nichts
 * versioniert, dann läuft alles wie bisher.
 */
export function versioned(path) {
  const run = spawnSync("git", ["ls-files", "--error-unmatch", "--", path], {
    cwd: ROOT,
    stdio: ["ignore", "ignore", "ignore"],
  });
  return run.status === 0;
}
