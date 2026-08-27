#!/usr/bin/env node
/**
 * Apps auf ein Arasul-Gerät bringen: Kontrakt, Paket, Teststand, Live.
 *
 *   node .ara/tools/app.mjs --device orin --contract              was dieses Gerät verspricht
 *   node .ara/tools/app.mjs --device orin --check <ordner>        app.json gegen den Kontrakt
 *   node .ara/tools/app.mjs --device orin --deploy <ordner>       packen und in den Teststand
 *   node .ara/tools/app.mjs --device orin --app <id> --status     welche Version steht wo
 *   node .ara/tools/app.mjs --device orin --app <id> --live       Teststand live schalten
 *   node .ara/tools/app.mjs --device orin --app <id> --back       auf die vorige Version zurück
 *   node .ara/tools/app.mjs --device orin --app <id> --remove --confirm <id>   App entfernen
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
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { ROOT, fail, parseArgs, readDevice } from "./lib/kit.mjs";
import { getSecret } from "./lib/secrets.mjs";
import { baseUrl, call, reason } from "./lib/arasul.mjs";
import {
  CONTRACT_PATH,
  checkManifest,
  checkVersion,
  findEndpoint,
  promisedFolders,
  summarize,
} from "./lib/contract.mjs";

const arg = parseArgs();
const str = (v) => (typeof v === "string" ? v : null);

// Eine Angabe ohne Wert ist ein Tippfehler, kein Wunsch. Das faellt auf, bevor
// irgendein Geraet angesprochen wird.
for (const [name, value] of [["check", arg.check], ["deploy", arg.deploy], ["app", arg.app]]) {
  if (value === true) fail(`--${name} braucht eine Angabe: --${name} <${name === "app" ? "id" : "ordner"}>.`);
}


if (arg.help || process.argv.length <= 2) {
  console.log(
    [
      "Apps auf ein Arasul-Gerät bringen.",
      "",
      "  --device <name>        welches Gerät (nur nötig, wenn es mehrere gibt)",
      "  --customer <kunde>     bei einem Kundengerät",
      "  --contract             den Kontrakt des Geräts holen und prüfen",
      "  --check <ordner>       app.json gegen den Kontrakt dieses Geräts prüfen",
      "  --deploy <ordner>      packen und einspielen, rollt immer in den Teststand",
      "  --app <id>             welche App für --status, --live, --back, --remove",
      "  --status               welche Version steht im Teststand, welche live",
      "  --live                 den Teststand live schalten",
      "  --back                 auf die vorige Live-Version zurück",
      "  --remove --confirm <id>  App entfernen, samt Containern und Volumen",
      "  --base <url>           andere Adresse als die aus der Akte (api_base, sonst address)",
      "  --insecure             ein selbst ausgestelltes Zertifikat annehmen",
      "  --json                 Ausgabe für die Auswertung",
    ].join("\n")
  );
  process.exit(0);
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

// Die Schnittstelle liegt nicht immer unter der Adresse, über die SSH läuft: ein
// Gerät kann hinter einem Tunnel hängen oder sein Zertifikat nur unter einem
// Namen führen. Dann trägt die Akte `api_base`, und die bleibt dort stehen,
// statt bei jedem Aufruf mitgetippt zu werden. `--base` sticht beides, für den
// einen Versuch, der nicht in die Akte gehört.
let base;
try {
  base = baseUrl(str(arg.base) || fields.api_base || fields.address || fields.hostname);
} catch (error) {
  fail(
    `${error.message}\nTrag address in ${relative(ROOT, device.file)} ein, ` +
      "oder api_base, wenn die Schnittstelle woanders liegt als der SSH-Zugang."
  );
}

const insecure = Boolean(arg.insecure) || (fields.tls || "").toLowerCase() === "selfsigned";

const keyRef = fields.api_key_ref;
if (!keyRef) {
  fail(
    `Für ${place} ist kein Kit-Schlüssel hinterlegt.\n` +
      "Am Gerät anlegen und in die Ablage legen:\n" +
      `  node .ara/tools/device.mjs${device.customer ? ` --customer ${device.customer}` : ""} --name ${device.device} --deploy-key`
  );
}
const key = getSecret(keyRef);
if (!key) {
  fail(
    `Die Akte nennt den Eintrag ${keyRef}, in der Geheimnis-Ablage steht er nicht.\n` +
      "Entweder wurde er nie gesetzt oder die Ablage wurde gewechselt. Neu anlegen:\n" +
      `  node .ara/tools/device.mjs${device.customer ? ` --customer ${device.customer}` : ""} --name ${device.device} --deploy-key`
  );
}

async function ask(options) {
  try {
    return await call({ base, key, insecure, ...options });
  } catch (error) {
    fail(error.message);
  }
}

// --- Der Kontrakt, immer zuerst ---------------------------------------------

const answer = await ask({ method: "GET", path: CONTRACT_PATH });
if (!answer.ok) {
  if (answer.status === 401) {
    fail(
      `${place} weist den Kit-Schlüssel ab (401). Wurde er am Gerät widerrufen?\n` +
        "Am Gerät nachsehen mit kit-schluessel.sh liste, sonst einen neuen anlegen:\n" +
        `  node .ara/tools/device.mjs${device.customer ? ` --customer ${device.customer}` : ""} --name ${device.device} --deploy-key`
    );
  }
  if (answer.status === 404) {
    fail(
      `${place} kennt ${CONTRACT_PATH} nicht. Die Plattform auf diesem Gerät ist älter als der Kontrakt.\n` +
        "Erst das Gerät aktualisieren, dann noch einmal."
    );
  }
  fail(`Der Kontrakt von ${place} ließ sich nicht lesen.\n${reason(answer)}`);
}
const contract = answer.data;
const version = checkVersion(contract);

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
    "## Regeln für einen Flow aus dem Paket",
    "",
    "Sie gelten, sobald das Paket Flow-Dateien mitbringt. Sie stehen wörtlich im Kontrakt:",
    "",
    ...rules.map((r) => `- ${r}`),
    ...(contract.flow_frontmatter.rumpf ? ["", contract.flow_frontmatter.rumpf] : []),
  ];
}

/** Ruft einen Endpunkt, aber nur, wenn der Kontrakt ihn nennt. */
async function endpoint(verb, path, options = {}) {
  const known = findEndpoint(contract, verb, path);
  if (!known) {
    fail(
      `${place} nennt ${verb} ${path} nicht in seinem Kontrakt. ${version.text}\n` +
        "Das Kit ruft nichts auf, was das Gerät nicht verspricht."
    );
  }
  return ask({ method: verb, path, ...options });
}

// --- --contract --------------------------------------------------------------

if (arg.contract) {
  if (arg.json) {
    console.log(JSON.stringify({ device: place, base, version, contract }, null, 2));
    process.exit(version.ok ? 0 : 1);
  }
  console.log(
    [`# Kontrakt von ${place}`, "", ...summarize(contract), "", "## Endpunkte", ""]
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
  if (!existsSync(dir)) fail(`Den Ordner ${folder} gibt es nicht.`);
  const file = join(dir, "app.json");
  if (!existsSync(file)) {
    fail(
      `In ${folder} liegt keine app.json.\n` +
        "Sie gehört in die Wurzel des Ordners, gepackt wird sein Inhalt."
    );
  }
  try {
    return { dir, file, manifest: JSON.parse(readFileSync(file, "utf8")) };
  } catch (error) {
    fail(`${relative(ROOT, file)} ist kein lesbares JSON: ${error.message}`);
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
      problems.push(`\`${field}\` zeigt mit \`${folder}\` aus dem Paket heraus. In ein Paket geht nur, was darin liegt.`);
      continue;
    }
    const path = join(dir, folder);
    if (!existsSync(path) || !statSync(path).isDirectory()) {
      problems.push(`app.json verspricht unter \`${field}\` den Ordner \`${folder}\`, im Paket gibt es ihn nicht.`);
      continue;
    }
    if (readdirSync(path).filter((name) => !name.startsWith(".")).length === 0) {
      problems.push(`Der Ordner \`${folder}\` aus \`${field}\` ist leer. Ein Versprechen ohne Lieferung weist das Gerät ab.`);
    }
  }
  return problems;
}

function reportManifest(where, result, delivery) {
  const lines = [`# app.json aus ${where} gegen den Kontrakt von ${place}`, "", `- ${version.text}`];
  if (result.ok) {
    lines.push("- Das Schema dieses Geräts nimmt das Manifest an.");
  } else {
    lines.push("", "## Das Gerät würde das abweisen", "", ...result.problems.map((p) => `- ${p}`));
  }
  if (delivery.length) {
    lines.push(
      "",
      "## Das Manifest verspricht mehr, als der Ordner liefert",
      "",
      ...delivery.map((p) => `- ${p}`)
    );
  } else if (result.ok) {
    const versprochen = promisedFolders(contract, result.manifest);
    if (versprochen.length) {
      lines.push(`- Geliefert wird, was das Manifest verspricht: ${versprochen.map((f) => f.folder).join(", ")}.`);
    }
  }
  if (result.unchecked.length) {
    lines.push(
      "",
      `Nicht geprüft, weil dieses Kit die Schemaangabe nicht kennt: ${result.unchecked.join(", ")}.`
    );
  }
  if (result.rules.length) {
    lines.push(
      "",
      "## Regeln, die kein Schema trägt",
      "",
      "Sie stehen so im Kontrakt des Geräts und gelten trotzdem. Geh sie durch:",
      "",
      ...result.rules.map((r) => `- ${r}`)
    );
  }
  lines.push(...flowSection());
  return lines.join("\n");
}

if (typeof arg.check === "string") {
  const { dir, manifest } = readManifest(arg.check);
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

if (typeof arg.deploy === "string") {
  const { dir, manifest } = readManifest(arg.deploy);
  const result = { ...checkManifest(contract, manifest), manifest };
  const delivery = checkDelivery(dir, manifest);
  if (!result.ok || delivery.length) {
    console.log(reportManifest(relative(ROOT, dir) || dir, result, delivery));
    fail("\nNichts eingespielt. Erst das Manifest, dann das Gerät.");
  }
  if (!version.ok) fail(`${version.text}\nNichts eingespielt.`);

  // Gepackt wird, was der Kontrakt sagt: der Inhalt des Ordners, nicht der
  // Ordner. COPYFILE_DISABLE hält die ._-Beiwerkdateien von macOS heraus, sie
  // wären am Gerät unbekannte Einträge im Paket.
  const work = mkdtempSync(join(tmpdir(), "ara-app-"));
  const archive = join(work, "paket.tgz");
  try {
    const packed = spawnSync("tar", ["-czf", archive, "-C", dir, "."], {
      encoding: "utf8",
      env: { ...process.env, COPYFILE_DISABLE: "1" },
    });
    if (packed.status !== 0) fail(`Das Paket ließ sich nicht packen: ${(packed.stderr || "").trim()}`);

    const size = statSync(archive).size;
    const limit = contract?.paket?.max_archiv_bytes;
    if (limit && size > limit) {
      fail(
        `Das Paket ist ${Math.round(size / 1024 / 1024)} MB, dieses Gerät nimmt höchstens ` +
          `${Math.round(limit / 1024 / 1024)} MB. Nichts eingespielt.`
      );
    }

    console.log(
      `Paket aus ${relative(ROOT, dir) || dir}: ${manifest.id} ${manifest.version}, ` +
        `${Math.round(size / 1024)} KB. Wird eingespielt, das Gerät baut das Backend selbst, das dauert.`
    );

    const sent = await endpoint("POST", "/api/v1/external/apps", {
      file: archive,
      fileField: "paket",
      keyHeader: contract?.schluessel?.kopf || undefined,
      // Das Gerät baut das Backend, bevor es antwortet. Das dauert Minuten,
      // und in der Zeit fließt nichts über die Leitung.
      timeout: 30 * 60_000,
    });
    if (!sent.ok) fail(`${place} hat das Paket abgewiesen (Status ${sent.status}).\n${reason(sent)}`);

    if (arg.json) {
      console.log(JSON.stringify({ device: place, eingespielt: sent.data }, null, 2));
    } else {
      const stand = sent.data || {};
      console.log(
        [
          "",
          `Eingespielt: ${stand.app_id ?? manifest.id} ${stand.version ?? manifest.version}, Stand "${stand.stand ?? "test"}".`,
          `Ansehen: ${base}${(contract?.apps?.teststand || "/apps/<id>/test/").replace("<id>", stand.app_id ?? manifest.id)}`,
          "",
          "Live schaltet ein Mensch. Wenn der Teststand überzeugt:",
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

const app = str(arg.app);
if (!app) {
  fail("Für --status, --live, --back und --remove brauche ich --app <id>.");
}
const keyHeader = contract?.schluessel?.kopf || undefined;

function showStand(data) {
  if (arg.json) {
    console.log(JSON.stringify({ device: place, app: data }, null, 2));
    return;
  }
  console.log(
    [
      `# ${app} auf ${place}`,
      "",
      ...Object.entries(data || {}).map(([k, v]) => `- ${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`),
    ].join("\n")
  );
}

if (arg.status) {
  const found = await endpoint("GET", `/api/v1/external/apps/${app}`, { keyHeader });
  if (!found.ok) fail(`${place} sagt zu ${app} nichts.\n${reason(found)}`);
  showStand(found.data);
  process.exit(0);
}

if (arg.live || arg.back) {
  const ziel = arg.live ? "live" : "zurueck";
  const switched = await endpoint("POST", `/api/v1/external/apps/${app}/schalten`, {
    json: { ziel },
    keyHeader,
  });
  if (!switched.ok) fail(`${place} hat nicht geschaltet (Status ${switched.status}).\n${reason(switched)}`);
  if (arg.json) {
    showStand(switched.data);
  } else {
    console.log(
      ziel === "live"
        ? `${app} ist live auf ${place}: Version ${switched.data?.version ?? "?"}. Zurück geht mit --back, die vorige Version bleibt am Gerät.`
        : `${app} auf ${place} steht wieder auf Version ${switched.data?.version ?? "?"}. Noch einmal --back tauscht zurück.`
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
      `Das entfernt ${app} von ${place}: beide Container mitsamt ihren Volumen, beide Stände,\n` +
        "alle Freigaben und die Schlüssel der App. Es gibt keinen Rückweg.\n" +
        `Wenn das so gewollt ist, hängs an: --confirm ${app}`
    );
  }
  const gone = await endpoint("DELETE", `/api/v1/external/apps/${app}?bestaetigung=${app}`, { keyHeader });
  if (!gone.ok) fail(`${place} hat ${app} nicht entfernt (Status ${gone.status}).\n${reason(gone)}`);
  if (arg.json) showStand(gone.data);
  else console.log(`${app} ist von ${place} entfernt.`);
  process.exit(0);
}

fail("Sag, was mit der App geschehen soll: --status, --live, --back oder --remove.");
