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
 * Was als Nächstes dran ist, und nur das.
 *
 * Der Lebenslauf einer App ist ein Kreis: planen, bauen, in den Teststand,
 * live, wieder planen. An jeder Stelle gibt es wenige sinnvolle Schritte, und
 * die stehen hier. Ein Schritt, der jetzt nichts bringt, wird nicht angeboten:
 * eine Liste aller Möglichkeiten wäre eine Bedienungsanleitung, kein Vorschlag.
 */
export function nextSteps(app, { device } = {}) {
  const ziel = device ? ` --device ${device}` : " --device <gerät>";
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

  if (!app.build.exists) {
    steps.push({ was: "Gebaut ist noch nichts. Der Bau legt das Paket unter build/ an.", wie: `node .ara/tools/app.mjs --app ${app.name} --build` });
  } else if (app.build.stale) {
    steps.push({
      was: `Der Bau von ${app.build.time} ist älter als der Quelltext. Noch einmal bauen, sonst geht der Stand von vorgestern an das Gerät.`,
      wie: `node .ara/tools/app.mjs --app ${app.name} --build`,
    });
  } else {
    steps.push({
      was: `Gebaut ist ${app.build.id ?? app.name} ${app.build.version ?? "?"}. Halt das Paket gegen den Kontrakt des Geräts, bevor es fliegt.`,
      wie: `node .ara/tools/app.mjs${ziel} --app ${app.name} --check`,
    });
    steps.push({
      was: "Einspielen rollt in den Teststand. Live schaltet danach ein Mensch.",
      wie: `node .ara/tools/app.mjs${ziel} --app ${app.name} --deploy`,
    });
  }

  if (aktiv && app.build.exists && !app.build.stale) {
    steps.push({
      was: `Wenn die Fassung live ist: den Plan "${aktiv.titel}" abschließen und die README fortschreiben.`,
      wie: `node .ara/tools/app.mjs --app ${app.name} --plan-erledigt ${aktiv.file}`,
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
  const target = join(app.dir, "plans", to);
  mkdirSync(target, { recursive: true });
  const path = join(target, file);
  renameSync(join(app.dir, "plans", from, file), path);
  writeFrontmatter(path, { stand: to, ...(to === "erledigt" ? { erledigt: today() } : {}) });
  return { from, to, path };
}
