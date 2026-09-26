#!/usr/bin/env node
/**
 * Self-test: checks whether the kit works on this computer.
 *
 * Runs without customer data, without network access to the portal and without a
 * device. Useful after an update, at odd behaviour and while developing the kit.
 *
 *   node .ara/tools/selftest.mjs
 *
 * The test itself runs in German and starts every tool in German. That is
 * deliberate: the acceptances of the control folder grip German lines, and this is
 * the place where that wording is nailed down. The English side is checked by the
 * section "Sprache" against the same tools.
 *
 * === deutsch ===
 *
 * Selbsttest: prüft, ob das Kit auf diesem Rechner funktioniert.
 *
 * Läuft ohne Kundendaten, ohne Netzzugang zum Portal und ohne Gerät. Nützlich nach
 * einem Update, bei merkwürdigem Verhalten und in der Entwicklung des Kits.
 *
 *   node .ara/tools/selftest.mjs
 *
 * Der Test selbst läuft auf Deutsch und startet jedes Werkzeug auf Deutsch. Das ist
 * Absicht: die Abnahmen des Steuerungsordners greifen deutsche Zeilen, und hier ist
 * dieser Wortlaut festgenagelt. Die englische Seite prüft der Abschnitt "Sprache"
 * gegen dieselben Werkzeuge.
 */

import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { spawn, spawnSync } from "node:child_process";
import {
  appendFileSync,
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { platform, tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PROBE,
  arasulRunning,
  deployKeyName,
  judge,
  parseProbe,
  services,
  startPasswordRef,
} from "./lib/device.mjs";
import { findFaults, insideTree, nextId, parseHealProbe, planFor as healPlan, reached, readVerify } from "./lib/heal.mjs";
import {
  matchProfile,
  platformOf,
  readProfiles,
  supportedDevices,
  verificationLine,
  verificationOf,
} from "./lib/platform.mjs";
import {
  KIT_CONTRACT_VERSION,
  checkManifest,
  checkVersion,
  findEndpoint,
  promisedFolders,
} from "./lib/contract.mjs";
import { PARTNER_ONLY, RETIRED, partnerOnly } from "./lib/commands.mjs";
import { agentFindings } from "./lib/agentfield.mjs";
import { EXAMPLE as ROOT_EXAMPLE, METHOD as ROOT_METHOD, METHOD_FOLDERS as ROOT_FOLDERS, METHOD_TARGETS, ROOT_TARGETS, TEMPLATE as ROOT_TEMPLATE } from "./lib/root.mjs";
import {
  EXTERNAL_PREFIX,
  bareApiPaths,
  callable,
  collectRoutes,
  judgeRoute,
  planFor,
  undocumented,
} from "./lib/docroutes.mjs";
import {
  createMasker,
  findKeys,
  hardeningNotice,
  hardeningPort,
  installCommand,
  installTarget,
  KEY_ONLY,
  installerEntry,
  keyLogin,
  mirrorState,
  modelFrom,
  movePort,
  releaseVersion,
  runInstaller,
  scrub,
  settleDeployKey,
  ship,
  sshPortFrom,
  stripAnsi,
  troubles,
  validLine,
} from "./lib/install.mjs";
import { lastStand, movePlan, nextSteps } from "./lib/appfile.mjs";
import { APP_WAYS, ARRANGEMENT_FILE, appArrangement, arrangementFile, arrangementLines, releaseLines } from "./lib/appways.mjs";
import { loginSpec, pickToken } from "./lib/session.mjs";
import { WAS_FEHLT, composeFile, nginxConf } from "./lib/compose.mjs";
import {
  classesWithoutRule,
  dependencyFindings,
  hashOf,
  libraryInMirror,
  readLibrary,
  readPackage,
  readSource,
  sets,
  stampOf,
  unreachable,
  writeLibrary,
} from "./lib/marken.mjs";
import { addressFindings, addressSection, standardExempt, standardFindings } from "./lib/standard.mjs";
import { CLOSED_FIELDS } from "./lib/profile.mjs";
import {
  needsParameter,
  parseHealth,
  readHealth,
  statusLine,
  topicEndpoints,
} from "./lib/maintain.mjs";
import {
  auditLedger,
  checkVat14,
  computePositions,
  formatAmount,
  parseAmount,
  peekNumber,
  readInvoice,
  totals,
} from "./lib/invoice.mjs";
import { buildXml, validateXml } from "./lib/zugferd.mjs";
import { embed, inspect, sRgbProfile } from "./lib/pdfa.mjs";
import {
  HELP_SPLIT,
  ROOT,
  USER_FOLDERS,
  day,
  daysUntil,
  fromKit,
  headerHelp,
  helpOnly,
  inOwnFolder,
  now,
  ownFolders,
  readFrontmatter,
  sshArgs as sshArgsFrom,
  today,
  tracked,
  writeFrontmatter,
} from "./lib/kit.mjs";
import { isVariant } from "./lib/i18n.mjs";
import { compareVersions, contractOf, entriesSince, parseChangelog, standBlock } from "./lib/version.mjs";
import { ISSUE_PATH, TOKEN_SHAPE, cleanToken, tokenShape, unlock, unlockLines } from "./lib/licence.mjs";
import { keychainAvailable } from "./lib/secrets.mjs";

helpOnly(import.meta.url);

const results = [];
let failures = 0;

/**
 * Nur die Prüfungen, deren Name auf dieses Muster passt. Für die Arbeit an
 * einer Stelle: der ganze Lauf dauert Minuten, eine Prüfung Sekunden. Ein
 * gefilterter Lauf ist kein Nachweis vor einem Merge, und er sagt das am Ende.
 */
const ONLY = process.env.ARA_SELFTEST_ONLY ? new RegExp(process.env.ARA_SELFTEST_ONLY, "i") : null;

function report(name, ok, hint) {
  // Sofort ausgeben, damit man bei einem hängenden Lauf sieht, wo es klemmt.
  console.log(`${ok ? "ok  " : "FEHL"} ${name}${hint ? `: ${hint}` : ""}`);
  results.push({ name, ok, hint });
  if (!ok) failures++;
}

function check(name, fn) {
  if (ONLY && !ONLY.test(name)) return;
  try {
    const hint = fn();
    report(name, true, typeof hint === "string" ? hint : "");
  } catch (error) {
    report(name, false, error.message);
  }
}

async function checkAsync(name, fn) {
  if (ONLY && !ONLY.test(name)) return;
  try {
    const hint = await fn();
    report(name, true, typeof hint === "string" ? hint : "");
  } catch (error) {
    report(name, false, error.message);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/**
 * Was beim Durchgehen der Dateien liegen bleibt.
 *
 * Der Spiegel ist fremdes Gut: das Artefakt des Produkts, geholt und nie vom
 * Kit geschrieben. Am 28.08.2026 stand er nach der ersten echten Installation
 * im Ordner, und drei Pruefungen wurden rot, weil ein anderes Haus in seinen
 * Dokumenten Gedankenstriche setzt, auf eigene Dateien verweist und eigene
 * Befehle nennt. Gemessen war der Arbeitsordner und nicht das Kit.
 */
const MIRROR_DIR = join(ROOT, ".ara", "mirror");

function skipEntry(path, name) {
  return name.startsWith(".git") || name === "node_modules" || path === MIRROR_DIR;
}

/**
 * Ein Trockenlauf laesst die Akten, wie sie waren. Das ist seine Zusage.
 *
 * Hier stand vorher ein `rmSync` auf `devices/<name>`, aufgeraeumt nach einem
 * Lauf, der nichts anlegt. Die Namen waren `orin`, `mac`, `thor`,
 * `dgx-spark`, und genau so heisst ein echtes Geraet: das Wissen des Kits
 * empfiehlt, ein Geraet ohne Kunden nach seinem Modell zu benennen. Am
 * 28.08.2026 loeschte ein Selbsttestlauf deshalb zweimal die Akte eines
 * frisch installierten Orin samt Laufzettel. Ein Selbsttest fasst die Ordner
 * des Nutzers nicht an, er prueft sie: der Stand vorher gegen den Stand
 * danach. Ob dort schon eine Akte lag, entscheidet der Nutzer und nicht der
 * Test.
 */
function akteStand(name) {
  const akte = join(ROOT, "devices", name, "device.md");
  return {
    ordner: existsSync(join(ROOT, "devices", name)),
    inhalt: existsSync(akte) ? readFileSync(akte, "utf8") : null,
  };
}

function pruefeAkteUnveraendert(name, vorher) {
  const nachher = akteStand(name);
  assert(
    nachher.ordner === vorher.ordner,
    vorher.ordner
      ? `der Trockenlauf hat die Akte devices/${name} entfernt`
      : `der Trockenlauf hat eine Akte devices/${name} angelegt`
  );
  assert(nachher.inhalt === vorher.inhalt, `der Trockenlauf hat devices/${name}/device.md geaendert`);
}

/**
 * Werkzeuge laufen hier auf Deutsch, wenn nichts anderes dabeisteht.
 *
 * Der Ueberordner greift in seinen Abnahmen deutsche Zeilen ("Eingespielt",
 * "ist live auf", "Kontraktversion"). Dieser Selbsttest ist die Stelle, an der
 * dieser Wortlaut festgenagelt ist: was hier steht, hat das Kit vor der
 * Zweisprachigkeit auch gesagt. Die englische Fassung prueft der Abschnitt
 * "Sprache" weiter unten, gegen dieselben Werkzeuge.
 */
const TOOL_LANGUAGE = "de";

/**
 * Auch die Funktionen, die dieser Lauf selbst aufruft, sollen Deutsch sprechen.
 *
 * Eine Umgebungsvariable hier zu setzen kaeme zu spaet: die Module sind da schon
 * geladen, und was in ihnen auf oberster Ebene steht (`VERDICTS`, `STATUS`) hat
 * seine Sprache dann bereits gewaehlt. Der Lauf startet sich darum einmal neu,
 * mit gesetzter Sprache, und der erste Prozess tut sonst nichts.
 */
if (!process.env.ARA_LANGUAGE) {
  const again = spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    stdio: "inherit",
    env: { ...process.env, ARA_LANGUAGE: TOOL_LANGUAGE },
  });
  process.exit(again.status ?? 1);
}

/**
 * Die Kundenakten dieses Laufs liegen in einem Wegwerfordner, nicht im Kit.
 *
 * Bis 0.20.2 legte der Selbsttest `customers/_selftest` unter der Wurzel an und
 * raeumte danach nur den Unterordner: uebrig blieb ein leerer Ordner
 * customers/ in jedem Klon, auch dem eines Unternehmens, das keine Kunden
 * fuehrt. Jedes Werkzeug liest `ARA_CUSTOMERS`, siehe lib/kit.mjs, und der
 * Lauf hier zeigt damit auf einen Ordner unter os.tmpdir(), der am Ende weg ist.
 */
const CUSTOMERS_TMP = mkdtempSync(join(tmpdir(), "ara-customers-"));
process.on("exit", () => rmSync(CUSTOMERS_TMP, { recursive: true, force: true }));

/**
 * Bringt dieser Klon die Partnerware mit? Ein Unternehmen hat sie nach /init
 * nicht mehr, und die Pruefungen, die sie brauchen, sagen dann "uebersprungen"
 * statt "rot": gemessen wird das Kit dieses Zweigs, nicht das des anderen.
 */
const PARTNER_MATERIAL = PARTNER_ONLY.every((rel) => existsSync(join(ROOT, rel)));
const OHNE_PARTNERWARE = "übersprungen, Zweig Unternehmen ohne Partnerware";

function tool(file, args, input, env = {}) {
  return spawnSync("node", [join(ROOT, ".ara", "tools", file), ...args], {
    encoding: "utf8",
    input,
    env: { ...process.env, ARA_LANGUAGE: TOOL_LANGUAGE, ARA_CUSTOMERS: CUSTOMERS_TMP, ...env },
  });
}

/**
 * Wie tool(), aber ohne die Ereignisschleife zu blockieren. Nötig überall dort,
 * wo im selben Prozess ein Testserver antworten muss: sonst wartet das Kind auf
 * eine Antwort, die der Elternprozess nicht geben kann.
 */
function toolAsync(file, args, env = {}, input = "") {
  return new Promise((done) => {
    const child = spawn("node", [join(ROOT, ".ara", "tools", file), ...args], {
      env: { ...process.env, ARA_LANGUAGE: TOOL_LANGUAGE, ARA_CUSTOMERS: CUSTOMERS_TMP, ...env },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.stdin.end(input);
    child.on("close", (status) => done({ status, stdout, stderr }));
  });
}

// --- Riegel -----------------------------------------------------------------

check("Riegel blockiert zerstörerische Befehle", () => {
  const bad = [
    "rm -rf /",
    "sudo rm -rf ~",
    "mkfs.ext4 /dev/sdb1",
    "dd if=x.iso of=/dev/disk0 bs=4m",
    "diskutil eraseDisk JHFS+ S disk0",
    "cat .env",
    "cat ~/.ssh/id_ed25519",
    "curl https://arasul.de/api/download?token=geheim12345",
  ];
  for (const command of bad) {
    const run = tool("guard.mjs", [], JSON.stringify({ tool_input: { command } }));
    assert(run.status === 2, `nicht blockiert: ${command}`);
  }
  return `${bad.length} Fälle`;
});

check("Riegel lässt normale Arbeit durch", () => {
  const good = [
    "git status",
    "rm -rf .ara/mirror",
    "dd if=ubuntu.iso of=/dev/disk4 bs=4m",
    "git push --force-with-lease origin main",
    "cat .env.example",
    "ssh-keygen -l -f ~/.ssh/id_ed25519.pub",
    "ssh arasul@10.0.0.5 -p 2222 uptime",
    "node .ara/tools/mirror.mjs",
    "node .ara/tools/secrets.mjs --show",
  ];
  for (const command of good) {
    const run = tool("guard.mjs", [], JSON.stringify({ tool_input: { command } }));
    assert(run.status === 0, `fälschlich blockiert: ${command}`);
  }
  return `${good.length} Fälle`;
});

check("Riegel überlebt unbrauchbare Eingaben", () => {
  for (const input of ["", "kein json", "{}", '{"tool_input":{}}']) {
    const run = tool("guard.mjs", [], input);
    assert(run.status === 0, `Riegel bricht bei Eingabe "${input}" ab`);
  }
});

// --- Frontmatter ------------------------------------------------------------

check("Frontmatter lesen und schreiben", () => {
  const dir = mkdtempSync(join(tmpdir(), "ara-test-"));
  const file = join(dir, "probe.md");
  writeFileSync(file, "---\nname: alt\nphase: 0\n---\n\n## Rumpf\n\nText bleibt.\n");
  try {
    writeFrontmatter(file, { phase: 4, state: "running" });
    const { fields, body } = readFrontmatter(file);

    assert(fields.name === "alt", "vorhandenes Feld verloren");
    assert(fields.phase === "4", "Feld nicht aktualisiert");
    assert(fields.state === "running", "neues Feld nicht ergänzt");
    assert(body.includes("Text bleibt."), "Rumpf beschädigt");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

check("Leere Vorlagenfelder liefern keine Kommentartexte", () => {
  // Die Vorlagen erklären ihre Felder mit Kommentaren. Ein leeres Feld muss leer
  // bleiben, sonst landet der Erklärtext als Adresse oder Schlüsselname im Einsatz.
  const templates = join(ROOT, ".ara", "templates");
  // Nur die Vorlagen mit Frontmatter. Die Vorlage einer App ist ein Ordner mit
  // Quelltext darin, kein Formular.
  const files = readdirSync(templates).filter((name) => name.endsWith(".md"));
  for (const name of files) {
    const { fields } = readFrontmatter(join(templates, name));
    for (const [key, value] of Object.entries(fields)) {
      assert(!value.startsWith("#"), `${name}: Feld ${key} liest den Kommentar als Wert`);
      assert(!/^\S+\s+#/.test(value), `${name}: Feld ${key} enthält einen Kommentarrest`);
    }
  }
  return `${files.length} Vorlagen`;
});

// --- Laufzettel -------------------------------------------------------------

check("Laufzettel anlegen, fortschreiben, lesen", () => {
  const customer = "_selftest";
  const dir = join(CUSTOMERS_TMP, customer);
  rmSync(dir, { recursive: true, force: true });
  try {
    let run = tool("runsheet.mjs", ["--create", "--customer", customer, "--device", "probe"]);
    assert(run.status === 0, `Anlegen fehlgeschlagen: ${run.stderr || run.stdout}`);

    run = tool("runsheet.mjs", [
      "--customer", customer,
      "--phase", "3",
      "--state", "done",
      "--entry", "Installation gelaufen. Nachweis: Dienste gesund.",
    ]);
    assert(run.status === 0, `Eintrag fehlgeschlagen: ${run.stderr || run.stdout}`);

    run = tool("runsheet.mjs", ["--customer", customer, "--show"]);
    assert(run.status === 0, "Anzeige fehlgeschlagen");
    assert(/Phase 3 von 6/.test(run.stdout), "Anzeige zeigt die falsche Phase");
    assert(/fertig/.test(run.stdout), "Zustand fehlt in der Ausgabe");

    const content = readFileSync(join(dir, "devices", "probe", "runsheet.md"), "utf8");
    assert(/### Phase 3/.test(content), "Eintrag steht nicht im Protokoll");
    assert(/Arasul installieren/.test(content), "Phasenname fehlt");

    // Zweiter Eintrag darf den ersten nicht verdrängen.
    tool("runsheet.mjs", ["--customer", customer, "--phase", "4", "--entry", "Zweiter Schritt."]);
    const after = readFileSync(join(dir, "devices", "probe", "runsheet.md"), "utf8");
    assert(/Installation gelaufen/.test(after), "früherer Eintrag überschrieben");
    assert(/Zweiter Schritt/.test(after), "neuer Eintrag fehlt");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

check("Werkzeuge verweigern fremde und mehrdeutige Ziele", () => {
  let run = tool("runsheet.mjs", ["--customer", "gibt-es-nicht", "--show"]);
  assert(run.status !== 0, "unbekannter Kunde wurde akzeptiert");
  assert(/gibt es nicht/.test(run.stderr), "keine verständliche Meldung");

  run = tool("remote.mjs", ["--customer", "gibt-es-nicht", "--check"]);
  assert(run.status !== 0, "Fernzugriff auf unbekannten Kunden wurde akzeptiert");

  run = tool("remote.mjs", ["--device", "gibt-es-nicht", "--check"]);
  assert(run.status !== 0, "Fernzugriff auf unbekanntes Gerät ohne Kunden wurde akzeptiert");
  assert(/devices\//.test(run.stderr), "die Meldung nennt nicht, wo gesucht wurde");
});

check("Laufzettel für ein Gerät ohne Kunden liegt unter devices/", () => {
  const device = "_selftest-probe";
  const dir = join(ROOT, "devices", device);
  rmSync(dir, { recursive: true, force: true });
  try {
    let run = tool("runsheet.mjs", ["--create", "--device", device]);
    assert(run.status === 0, `Anlegen fehlgeschlagen: ${run.stderr || run.stdout}`);
    assert(existsSync(join(dir, "runsheet.md")), "Laufzettel liegt nicht unter devices/");
    run = tool("runsheet.mjs", ["--device", device, "--phase", "2", "--entry", "SSH steht. Nachweis: echo bereit."]);
    assert(run.status === 0, `Eintrag fehlgeschlagen: ${run.stderr}`);
    run = tool("runsheet.mjs", ["--device", device, "--show"]);
    assert(/Phase 2 von 6/.test(run.stdout), "Anzeige zeigt die falsche Phase");
    assert(!/undefined|null/.test(run.stdout), "ohne Kunden steht Unsinn in der Kopfzeile");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- Gerät -------------------------------------------------------------------

/**
 * Die Attrappen: Befunde, wie das Prüfskript sie liefert, für Geräte, die hier
 * nicht stehen. Thor und DGX Spark gibt es nirgends zum Anfassen, und der Orin
 * steht nicht in jedem Klon. Erfunden sind die Zeilen, ihr Schnitt ist es nicht.
 */
const ATTRAPPEN = {
  orin:
    "@uname=Linux 5.15.148-tegra aarch64\n@dt_model=NVIDIA Jetson AGX Orin Developer Kit\n" +
    "@dmi_vendor=NVIDIA\n@tegra=R36 (release), REVISION: 4.7\n@gpu=Orin (nvgpu)\n@mem_kb=64348860\n@done=ja",
  thor:
    "@uname=Linux 6.8.12-tegra aarch64\n@os_release=Ubuntu 24.04 LTS\n" +
    "@dt_model=NVIDIA Jetson AGX Thor Developer Kit\n@dmi_vendor=NVIDIA\n@gpu=Thor (nvgpu)\n" +
    "@mem_kb=131072000\n@done=ja",
  spark:
    "@uname=Linux 6.11.0 aarch64\n@os_release=Ubuntu 24.04 LTS\n@dmi_model=NVIDIA DGX Spark\n" +
    "@dmi_vendor=NVIDIA\n@gpu=NVIDIA GB10\n@mem_kb=134217728\n@done=ja",
  fremd: "@uname=Linux 6.8 x86_64\n@dmi_model=ThinkStation P3\n@gpu=NVIDIA RTX 6000 Ada Generation\n@done=ja",
  mac: "@uname=Darwin 24.6.0 arm64\n@macos=15.6.1\n@hw_model=Mac14,2\n@mem_bytes=17179869184\n@done=ja",
  buero: "@uname=Linux 6.8 x86_64\n@os_release=Debian GNU/Linux 12\n@dmi_model=OptiPlex 7010\n@done=ja",
};

/** Ein Spiegel aus Attrappen: nur die Katalogprofile, nur das Feld, um das es geht. */
function attrappenSpiegel(stufen) {
  const dir = mkdtempSync(join(tmpdir(), "ara-katalog-"));
  mkdirSync(join(dir, "config", "platforms"), { recursive: true });
  for (const [id, verification] of Object.entries(stufen)) {
    writeFileSync(
      join(dir, "config", "platforms", `${id}.json`),
      JSON.stringify({ id, verification }, null, 2) + "\n"
    );
  }
  return dir;
}

check("Die Geräteprofile im Wissen sind vollständig und greifen eindeutig", () => {
  // Erkennung ohne Vorwissen heißt: die Hardware, die das Kit kennt, steht in
  // den Blättern und nicht im Quelltext. Ein Blatt ohne Pflichtfeld wird vom
  // Leser übergangen, und dann erkennt das Kit still ein Gerät nicht mehr.
  const dir = join(ROOT, ".ara", "knowledge", "devices");
  const blaetter = readdirSync(dir).filter((n) => n.endsWith(".md") && !isVariant(n));
  const profile = readProfiles();
  assert(
    profile.length === blaetter.length,
    `${blaetter.length} Blätter, aber nur ${profile.length} lesbare Profile: ein Pflichtfeld fehlt`
  );
  assert(profile.length >= 3, `nur ${profile.length} Geräteprofile, Orin, Thor und Spark müssen da sein`);
  for (const p of profile) {
    assert(/^\d{4}-\d{2}-\d{2}$/.test(p.as_of), `${p.sheet} hat keinen Stand als Datum: ${p.as_of}`);
    assert(p.source.length > 10, `${p.sheet} nennt keine Quelle`);
    assert(["supported", "soon"].includes(p.support), `${p.sheet} trägt ein unbekanntes support: ${p.support}`);
    // Stand und Quelle stehen auch im Text, in beiden Sprachen, damit sie liest,
    // wer das Blatt aufmacht, und nicht nur, wer das Frontmatter parst.
    assert(
      /^As of: /m.test(readFileSync(join(dir, `${p.id}.md`), "utf8")),
      `${p.sheet} sagt im Text nicht, von wann es ist`
    );
    assert(
      /^Stand: /m.test(readFileSync(join(dir, `${p.id}.de.md`), "utf8")),
      `${p.sheet} sagt auf Deutsch im Text nicht, von wann es ist`
    );
  }

  // Jede Attrappe trifft genau ein Blatt. Zwei Treffer heißen, dass eines der
  // Muster zu weit ist, und dann hinge das Urteil an der Reihenfolge im Ordner.
  for (const [name, id] of [["orin", "orin"], ["thor", "thor"], ["spark", "dgx-spark"]]) {
    const treffer = profile.filter((p) => matchProfile(parseProbe(ATTRAPPEN[name]), [p]));
    assert(treffer.length === 1, `${name} trifft ${treffer.length} Blätter: ${treffer.map((p) => p.id).join(", ")}`);
    assert(treffer[0].id === id, `${name} trifft ${treffer[0].id} statt ${id}`);
  }
  for (const name of ["mac", "buero"]) {
    assert(!matchProfile(parseProbe(ATTRAPPEN[name]), profile), `${name} trifft ein Geräteprofil`);
  }
  // Der Rechnername gehört nicht zur Signatur: ein Gerät, das jemand "spark"
  // genannt hat, ist kein DGX Spark.
  assert(
    !matchProfile(parseProbe("@uname=Linux 6.8 x86_64\n@hostname=spark\n@done=ja"), profile),
    "der Rechnername entscheidet über das Geräteprofil"
  );
  return `${profile.length} Blätter`;
});

check("Urteil über ein Gerät folgt den Blättern, nicht dem Quelltext", () => {
  // Orin und Thor tragen Arasul, DGX Spark ist angekündigt, ein Mac wird
  // vorgemerkt. Woher das kommt, steht in den Blättern: nimmt man sie weg,
  // bleibt nur noch die Regel für alles, wozu es keines gibt.
  const profile = readProfiles();
  const cases = [
    ["orin", "supported"],
    ["thor", "supported"],
    ["spark", "soon"],
    ["fremd", "soon"],
    ["mac", "unsupported"],
    ["buero", "unsupported"],
  ];
  for (const [name, expected] of cases) {
    const found = judge(parseProbe(ATTRAPPEN[name]), profile);
    assert(found.verdict === expected, `${name}: ${found.verdict} statt ${expected}`);
    assert(found.verdictText, "Urteil ohne Satz");
  }
  const orin = judge(parseProbe(ATTRAPPEN.orin), profile);
  assert(orin.profile?.id === "orin", "das Blatt steht nicht im Befund");
  assert(orin.reason.includes(".ara/knowledge/devices/orin.md"), `die Begründung nennt das Blatt nicht: ${orin.reason}`);
  assert(orin.vendor === "NVIDIA" && /dmi/.test(orin.vendorSource), "Hersteller nicht vom Gerät gelesen");
  assert(/orin/i.test(orin.hardware), "Hardware nicht aus dem Gerätebaum übernommen");

  const mac = judge(parseProbe(ATTRAPPEN.mac), profile);
  assert(mac.os === "macOS 15.6.1" && mac.arch === "arm64" && mac.memoryGb === 16, "Mac-Befund falsch gelesen");
  assert(mac.vendor === "Apple", `Hersteller des Macs: ${mac.vendor}`);
  assert(mac.profile === null, "der Mac trifft ein Geräteprofil");

  // Ohne Blätter bleibt die Regel für den Rest: NVIDIA ist angekündigt, sonst
  // vorgemerkt. Ein Orin ohne sein Blatt ist deshalb nicht mehr unterstützt.
  const ohne = judge(parseProbe(ATTRAPPEN.orin), []);
  assert(ohne.verdict === "soon", `ohne Blätter urteilt das Kit ${ohne.verdict} statt soon`);
  return `${cases.length} Befunde`;
});

check("Der Verifikationsstand kommt aus dem Spiegel und wird nicht geraten", () => {
  // Das Feld verification aus config/platforms/<id>.json ist die einzige
  // Auskunft darüber, ob ein Profil am Gerät verifiziert oder nur nach
  // Herstellerdoku gebaut ist. Fehlt sie, sagt das Kit das, statt eine Stufe
  // zu erfinden: eine ausgelassene Zeile läse sich wie eine Bestätigung.
  const spiegel = attrappenSpiegel({ "orin-64": "live", "thor-128": "emulation", "dgx-spark": "follow-up" });
  try {
    const live = verificationOf("orin-64", spiegel);
    assert(live.level === "live" && /verifiziert/.test(live.text), `live falsch gelesen: ${JSON.stringify(live)}`);
    assert(/config\/platforms\/orin-64\.json/.test(verificationLine(live)), "die Zeile nennt ihre Quelle nicht");
    assert(/Emulation/.test(verificationOf("thor-128", spiegel).text), "emulation falsch übersetzt");
    assert(/Herstellerdoku/.test(verificationOf("dgx-spark", spiegel).text), "follow-up falsch übersetzt");

    const fehlt = verificationOf("gibt-es-nicht", spiegel);
    assert(fehlt.level === null && fehlt.reason, "ein fehlendes Katalogprofil liefert eine Stufe");
    assert(/unbekannt/.test(verificationLine(fehlt)), `die Zeile behauptet etwas: ${verificationLine(fehlt)}`);

    const leer = mkdtempSync(join(tmpdir(), "ara-leer-"));
    try {
      const ohne = verificationOf("orin-64", leer);
      assert(ohne.level === null && /Spiegel/.test(ohne.reason), `ohne Spiegel: ${JSON.stringify(ohne)}`);
      // Fund 2 der Werkstatt am 29.08.2026: der Satz sagte, es gebe keinen
      // Spiegel, und nicht, wie man an einen kommt.
      assert(
        /mirror\.mjs --refresh/.test(verificationLine(ohne)),
        `ohne Spiegel fehlt der Weg zu einem: ${verificationLine(ohne)}`
      );
      assert(
        !/mirror\.mjs --refresh/.test(verificationLine(fehlt)),
        "der Weg zum Spiegel steht da, wo der Spiegel gar nicht fehlt"
      );
    } finally {
      rmSync(leer, { recursive: true, force: true });
    }

    // Eine Stufe, die das Kit nicht kennt, wird weitergereicht und nicht gedeutet.
    const neu = attrappenSpiegel({ "orin-64": "teilweise" });
    try {
      const stufe = verificationOf("orin-64", neu);
      assert(stufe.level === "teilweise" && stufe.text === null, "eine unbekannte Stufe wird gedeutet");
      assert(/teilweise/.test(verificationLine(stufe)), "eine unbekannte Stufe fällt aus der Zeile");
    } finally {
      rmSync(neu, { recursive: true, force: true });
    }
  } finally {
    rmSync(spiegel, { recursive: true, force: true });
  }
});

check("Der Kit-Schluessel und das Startpasswort stehen in beiden Zweigen richtig", () => {
  // Fund 3 der Werkstatt am 29.08.2026: business/company.md legt /init nur im
  // Partner-Zweig an. Im Unternehmens-Zweig fiel der Ausdruck auf seinen
  // letzten Zweig zurueck, und der Schluessel hiess am Geraet "Ara-Kit
  // Partner". Den Namen liest dort spaeter ein Mensch.
  assert(
    deployKeyName({ name: "Muster GmbH" }, { company: "Andere GmbH" }) === "Ara-Kit Muster GmbH",
    "der Firmenkopf des Partners gilt nicht zuerst"
  );
  assert(
    deployKeyName({}, { company: "Arasul GmbH", name: "Kolja" }) === "Ara-Kit Arasul GmbH",
    "im Unternehmens-Zweig kommt der Name nicht aus dem Profil"
  );
  assert(deployKeyName({}, { name: "Kolja" }) === "Ara-Kit Kolja", "ohne Firma gilt der Name nicht");
  assert(deployKeyName({}, {}) === "Ara-Kit", "ohne jede Angabe wird ein Name erfunden");

  // Fund 4: das Feld wurde nur beim Installieren gesetzt. Ein Geraet, auf dem
  // Arasul schon lief, bekam es nie, obwohl --admin-login sich mit genau
  // diesem Eintrag anmeldete.
  const ref = "ARASUL_START_ORIN";
  assert(
    startPasswordRef({ noted: "", installed: ref, ref, stored: false }) === ref,
    "nach der Installation steht der Name nicht in der Akte"
  );
  assert(
    startPasswordRef({ noted: "", installed: null, ref, stored: true }) === ref,
    "ein Eintrag in der Ablage kommt ohne Installation nicht in die Akte"
  );
  assert(
    startPasswordRef({ noted: "", installed: null, ref, stored: false }) === null,
    "ein Name wird in die Akte geschrieben, zu dem es keinen Eintrag gibt"
  );
  assert(
    startPasswordRef({ noted: "ARASUL_START_EIGEN", installed: null, ref, stored: true }) === null,
    "ein Name, der schon in der Akte steht, wird ueberschrieben"
  );
  return "Firmenkopf, Profil, kein erfundener Name, Startpasswort auch ohne Installation";
});

check("Das Katalogprofil wird nur genannt, wenn der Speicher dazu passt", () => {
  // Der Gerätebaum sagt nicht, wieviel Speicher verbaut ist. orin-64 auf einem
  // Orin mit 32 GB wäre eine Zusage über Speicher, die dieses Gerät nicht hält.
  const orin = readProfiles().find((p) => p.id === "orin");
  assert(orin, "das Blatt für den Orin fehlt");
  assert(platformOf(orin, 61).id === "orin-64", "der große Orin bekommt kein Katalogprofil");
  const klein = platformOf(orin, 30);
  assert(klein.id === null, "der kleine Orin bekommt orin-64 zugesprochen");
  assert(/30 GB/.test(klein.reason) && /40 GB/.test(klein.reason), `der Grund sagt zu wenig: ${klein.reason}`);
  assert(platformOf(orin, null).id === null, "ohne gelesenen Speicher wird ein Katalogprofil genannt");
});

check("Docker, Ollama und Arasul werden aus dem Befund erkannt", () => {
  const facts = parseProbe(
    "@docker_bin=/usr/bin/docker\n@docker_server=27.1.1\n@docker_names=dashboard-backend arasul-flows-sandbox n8n\n" +
      "@ollama_bin=/usr/local/bin/ollama\n@ollama_version=ollama version is 0.5.1\n@arasul_dir=/opt/arasul\n@arasul_dir=/home/x/arasul\n@sudo=ohne Passwort"
  );
  const svc = services(facts);
  assert(svc.docker.state === "running" && /27\.1\.1/.test(svc.docker.text), "laufendes Docker nicht erkannt");
  assert(svc.ollama.state === "present", "Ollama nicht erkannt");
  assert(svc.arasul.state === "running" && /arasul-flows-sandbox/.test(svc.arasul.text), "laufende Plattform nicht erkannt");
  assert(/\/opt\/arasul.*\/home\/x\/arasul/.test(svc.arasul.text), "mehrere Ordner nicht gesammelt");
  assert(svc.sudo === true, "sudo ohne Passwort nicht erkannt");

  const bare = services(parseProbe("@docker_bin=/usr/local/bin/docker\n@user=probe"));
  assert(bare.docker.state === "present", "Docker ohne Dienst gilt nicht als vorhanden");
  assert(bare.ollama.state === "missing" && bare.arasul.state === "none", "leerer Befund liefert Funde");

  // Ein Gerät mit Arasul fährt das Sprachmodell im Container und hat kein
  // Programm im Pfad. "fehlt" wäre dort falsch, und der nächste Schritt hieße,
  // etwas aufzusetzen, das längst läuft.
  const imContainer = services(
    parseProbe("@docker_bin=/usr/bin/docker\n@docker_server=27.1.1\n@docker_names=llm-service traefik dashboard-backend")
  );
  assert(imContainer.ollama.state === "container", "das Modell im Container gilt als fehlend");
  assert(/llm-service/.test(imContainer.ollama.text), "der gefundene Container wird nicht genannt");
});

check("Die Spurensuche trennt eine laufende Plattform von liegengebliebenen Resten", () => {
  // Der Fund vom 28.08.2026: das Kit schob sein Artefakt nach $HOME/arasul,
  // fand beim nächsten Lauf genau diesen Ordner und hielt ihn für eine
  // Installation. Danach ging auf einem frisch zurückgesetzten Gerät nichts
  // mehr, obwohl dort nichts lief. Ein Ordner ist kein laufender Dienst.
  const laeuft = services(
    parseProbe("@docker_bin=/usr/bin/docker\n@docker_server=27.1.1\n@docker_names=dashboard-backend traefik")
  );
  assert(laeuft.arasul.state === "running", `eine laufende Plattform gilt als ${laeuft.arasul.state}`);
  assert(/dashboard-backend/.test(laeuft.arasul.text), "der gefundene Container wird nicht genannt");

  const reste = services(
    parseProbe("@docker_bin=/usr/bin/docker\n@docker_server=27.1.1\n@docker_names=n8n\n@arasul_dir=/home/x/arasul-9.9.9")
  );
  assert(reste.arasul.state === "traces", `Reste ohne laufenden Container gelten als ${reste.arasul.state}`);
  assert(/nichts läuft/.test(reste.arasul.text), `der Satz sagt nicht, dass nichts läuft: ${reste.arasul.text}`);

  const dienst = services(parseProbe("@arasul_units=arasul.service"));
  assert(dienst.arasul.state === "traces", "ein Dienst ohne laufenden Container gilt nicht als Rest");

  // K21, am Orin am 25.09.2026: der Actions-Runner von GitHub heißt nach dem
  // Repo, für das er baut, und die Installation brauchte seinetwegen
  // --despite-traces. Er ist kein Rest der Plattform.
  const runner = services(parseProbe("@arasul_units=actions.runner.koljaschoepe-arasul-jet.jetson-agx.service"));
  assert(runner.arasul.state === "none", `der Actions-Runner gilt als Rest: ${runner.arasul.text}`);
  const beide = services(
    parseProbe("@arasul_units=actions.runner.koljaschoepe-arasul-jet.jetson-agx.service arasul-platform.service")
  );
  assert(beide.arasul.state === "traces", "neben dem Runner wird der echte Dienst übersehen");
  assert(!/actions\.runner/.test(beide.arasul.text), `der Runner steht in den Resten: ${beide.arasul.text}`);

  const nichts = services(parseProbe("@docker_bin=/usr/bin/docker\n@docker_names=n8n traefik"));
  assert(nichts.arasul.state === "none", "ein fremder Container gilt als Arasul");

  // Eine Akte aus der Zeit vor dieser Trennung trägt "found". Sie darf nicht
  // stillschweigend als leeres Gerät gelesen werden.
  assert(arasulRunning("found") && arasulRunning("running"), "eine alte Akte wird nicht mehr gelesen");
  assert(!arasulRunning("traces") && !arasulRunning("none"), "Reste gelten als laufende Plattform");

  // Das Prüfskript muss den Ordner, in den das Kit selbst auspackt, überhaupt
  // finden. Sonst bleibt der Rest unsichtbar, statt "Reste da" zu heißen.
  assert(/arasul-\*/.test(PROBE), "das Prüfskript sieht im Ordner des Artefakts nicht nach");
  return "läuft, Reste, nichts";
});

check("device.mjs legt die Akte an, urteilt und merkt sich das Gerät", () => {
  // Zwei Ziele: eines, das nicht antwortet (Akte trotzdem, ssh: refused), und
  // dieser Rechner selbst mit abgelehntem SSH-Port, dann prüft das Werkzeug lokal.
  // Der Merker des Nutzers wird vorher gesichert und danach zurückgelegt.
  const stateFile = join(ROOT, ".ara", "state.json");
  const savedState = existsSync(stateFile) ? readFileSync(stateFile, "utf8") : null;
  const names = ["selftest-stumm", "selftest-lokal"];
  for (const n of names) rmSync(join(ROOT, "devices", n), { recursive: true, force: true });
  try {
    let run = tool("device.mjs", ["--host", "127.0.0.2", "--port", "1", "--user", "probe", "--name", names[0], "--json"]);
    assert(run.status !== 0, "ohne Verbindung endet das Werkzeug mit Erfolg");
    let out = JSON.parse(run.stdout);
    assert(out.transport === "none" && out.fresh === true, "stummes Ziel nicht als solches gemeldet");
    let { fields } = readFrontmatter(join(ROOT, "devices", names[0], "device.md"));
    assert(fields.ssh === "refused" && fields.address === "127.0.0.2", "Akte ohne Verbindung fehlt oder ist unvollständig");
    assert(!fields.verdict, "ohne Befund steht ein Urteil in der Akte");
    assert(out.next.some((s) => /find-device/.test(s)), "der nächste Schritt nennt nicht den Weg zum Zugang");

    run = tool("device.mjs", ["--host", "localhost", "--port", "1", "--name", names[1], "--json"]);
    assert(run.status === 0, `lokale Prüfung fehlgeschlagen: ${run.stderr || run.stdout}`);
    out = JSON.parse(run.stdout);
    assert(out.transport === "local", "lokaler Umweg bei abgelehntem SSH auf localhost fehlt");
    assert(["supported", "soon", "unsupported"].includes(out.verdict), `unbekanntes Urteil ${out.verdict}`);
    assert(out.os && out.os !== "unbekannt", "Betriebssystem nicht erkannt");
    ({ fields } = readFrontmatter(join(ROOT, "devices", names[1], "device.md")));
    assert(fields.ssh === "local" && fields.verdict === out.verdict, "Akte trägt den Befund nicht");
    assert(fields.verdict === "supported" || /^\d{4}-\d{2}-\d{2}$/.test(fields.noted_on), "nicht unterstütztes Gerät wurde nicht vorgemerkt");
    const body = readFileSync(join(ROOT, "devices", names[1], "device.md"), "utf8");
    assert(/## Prüfungen[\s\S]*### .*lokal/.test(body), "Prüfung nicht ins Protokoll geschrieben");
    assert(JSON.parse(readFileSync(stateFile, "utf8")).device === names[1], "Merker nicht gesetzt");
    assert(!/^customer: $/m.test(body), "leeres Feld hinterlässt ein Leerzeichen am Zeilenende");

    // Zweiter Lauf ohne --host: Adresse und Port kommen aus der Akte.
    run = tool("device.mjs", ["--name", names[1], "--json"]);
    out = JSON.parse(run.stdout);
    assert(run.status === 0 && out.fresh === false && out.port === "1", "zweiter Lauf liest die Akte nicht");

    // Ohne --name und mit zwei Akten entscheidet der Merker.
    run = tool("device.mjs", ["--json"]);
    assert(JSON.parse(run.stdout).name === names[1], "ohne Argument greift der Merker nicht");

    run = tool("device.mjs", ["--name", "Falscher Name", "--host", "localhost"]);
    assert(run.status !== 0, "ein unbrauchbarer Gerätename wurde akzeptiert");
    run = tool("device.mjs", ["--name", names[1], "--install", "irgendwas"]);
    assert(run.status !== 0, "--install mit Unbekanntem wurde akzeptiert");
    return `lokal: ${out.verdictText}`;
  } finally {
    for (const n of names) rmSync(join(ROOT, "devices", n), { recursive: true, force: true });
    if (savedState === null) rmSync(stateFile, { force: true });
    else writeFileSync(stateFile, savedState);
  }
});

check("Trockenlauf: Thor und DGX Spark laufen ohne Gerät durch", () => {
  // Beide Geräte gibt es hier nicht, und es wird auch keines geben. Der Lauf
  // bekommt darum Befunde aus einer Attrappe, sonst nimmt er denselben Weg wie
  // an echter Hardware: Erkennung, Blatt, Katalogprofil, Verifikationsstand.
  // Verifiziert wird dabei nichts, und der Lauf sagt das auch.
  const spiegel = attrappenSpiegel({ "thor-128": "emulation", "dgx-spark": "follow-up" });
  const work = mkdtempSync(join(tmpdir(), "ara-trocken-"));
  const vorher = { thor: akteStand("thor"), "dgx-spark": akteStand("dgx-spark") };
  const stateFile = join(ROOT, ".ara", "state.json");
  const savedState = existsSync(stateFile) ? readFileSync(stateFile, "utf8") : null;
  try {
    const faelle = [
      { name: "thor", attrappe: "thor", blatt: "thor", katalog: "thor-128", stufe: "emulation", urteil: "supported" },
      { name: "dgx-spark", attrappe: "spark", blatt: "dgx-spark", katalog: "dgx-spark", stufe: "follow-up", urteil: "soon" },
    ];
    for (const fall of faelle) {
      const datei = join(work, `${fall.name}.txt`);
      writeFileSync(datei, ATTRAPPEN[fall.attrappe] + "\n");
      const run = tool("device.mjs", ["--name", fall.name, "--probe", datei, "--json"], "", { ARA_MIRROR: spiegel });
      assert(run.status === 0, `${fall.name}: Trockenlauf fehlgeschlagen: ${run.stderr || run.stdout}`);
      const out = JSON.parse(run.stdout);
      assert(out.transport === "dry-run" && out.dry_run === datei, `${fall.name}: kein Trockenlauf`);
      assert(out.vendor === "NVIDIA", `${fall.name}: Hersteller ${out.vendor}`);
      assert(out.arch === "aarch64", `${fall.name}: Architektur ${out.arch}`);
      assert(out.os && out.os !== "unbekannt", `${fall.name}: kein laufendes System erkannt`);
      assert(out.profile?.id === fall.blatt, `${fall.name}: Blatt ${out.profile?.id} statt ${fall.blatt}`);
      assert(out.profile.as_of && out.profile.source, `${fall.name}: Blatt ohne Stand oder Quelle`);
      assert(out.platform === fall.katalog, `${fall.name}: Katalogprofil ${out.platform}`);
      assert(out.verification === fall.stufe, `${fall.name}: Verifikationsstand ${out.verification}`);
      assert(out.verdict === fall.urteil, `${fall.name}: Urteil ${out.verdict} statt ${fall.urteil}`);
      // Keine Verifikation: nichts an diesen beiden Geräten wurde je gemessen,
      // und der Lauf behauptet das auch an keiner Stelle.
      assert(out.verification !== "live", `${fall.name}: der Trockenlauf meldet eine Verifikation am Gerät`);

      // Ein Trockenlauf schreibt nichts. Eine Akte für ein Gerät, das es nicht
      // gibt, wäre eine Behauptung, und der Merker zeigte danach darauf.
      assert(out.file === null, `${fall.name}: der Trockenlauf nennt eine Akte`);
      assert(!existsSync(join(ROOT, "devices", fall.name)), `${fall.name}: der Trockenlauf hat eine Akte angelegt`);

      const text = tool("device.mjs", ["--name", fall.name, "--probe", datei], "", { ARA_MIRROR: spiegel });
      assert(/^## Erkennung$/m.test(text.stdout), `${fall.name}: kein Abschnitt Erkennung`);
      assert(/^## Geräteprofil$/m.test(text.stdout), `${fall.name}: kein Abschnitt Geräteprofil`);
      assert(
        new RegExp(`Verifikationsstand: ${fall.stufe}`).test(text.stdout),
        `${fall.name}: der Verifikationsstand steht nicht im Bericht:\n${text.stdout}`
      );
    }

    // Ohne Spiegel gibt es keine Stufe, und dann sagt der Lauf genau das.
    const datei = join(work, "thor.txt");
    const leer = mkdtempSync(join(tmpdir(), "ara-ohne-"));
    try {
      const run = tool("device.mjs", ["--name", "thor", "--probe", datei], "", { ARA_MIRROR: leer });
      assert(/Verifikationsstand: unbekannt/.test(run.stdout), `ohne Spiegel wird eine Stufe gemeldet:\n${run.stdout}`);
      assert(/kein Spiegel|keinen Spiegel|es gibt keinen Spiegel/.test(run.stdout), "der Grund fehlt");
    } finally {
      rmSync(leer, { recursive: true, force: true });
    }

    // Ein Trockenlauf greift nicht ein, und er sagt nicht nur, dass er es nicht tut.
    for (const eingriff of [["--install", "docker"], ["--deploy-key"], ["--admin-login"]]) {
      const run = tool("device.mjs", ["--name", "thor", "--probe", datei, ...eingriff]);
      assert(run.status !== 0, `--probe zusammen mit ${eingriff[0]} lief durch`);
    }
    const fehlt = tool("device.mjs", ["--name", "thor", "--probe", join(work, "gibt-es-nicht.txt")]);
    assert(fehlt.status !== 0, "eine fehlende Befunddatei wurde angenommen");
    return "thor, dgx-spark";
  } finally {
    rmSync(work, { recursive: true, force: true });
    rmSync(spiegel, { recursive: true, force: true });
    for (const n of ["thor", "dgx-spark"]) pruefeAkteUnveraendert(n, vorher[n]);
    if (savedState === null) rmSync(stateFile, { force: true });
    else writeFileSync(stateFile, savedState);
  }
});

check("Ein Rechner ohne passendes Gerät endet hilfreich", () => {
  // Wer das Kit zum ersten Mal auf seinem Arbeitsrechner ausprobiert, bekommt
  // hier ein Nein. Ein Nein allein ist keine Auskunft: es gehört dazu, welche
  // Geräte es heute tragen, dass Fragen auch ohne Gerät beantwortet werden, und
  // ein ruhiger Satz zur Lizenz.
  const work = mkdtempSync(join(tmpdir(), "ara-mac-"));
  const vorher = { mac: akteStand("mac"), orin: akteStand("orin") };
  const stateFile = join(ROOT, ".ara", "state.json");
  const savedState = existsSync(stateFile) ? readFileSync(stateFile, "utf8") : null;
  try {
    const datei = join(work, "mac.txt");
    writeFileSync(datei, ATTRAPPEN.mac + "\n");
    const run = tool("device.mjs", ["--name", "mac", "--probe", datei]);
    assert(run.status === 0, `Lauf fehlgeschlagen: ${run.stderr || run.stdout}`);
    assert(/^## Ohne passendes Gerät$/m.test(run.stdout), `kein Abschluss:\n${run.stdout}`);
    for (const geraet of supportedDevices(readProfiles())) {
      assert(run.stdout.includes(geraet.family), `${geraet.family} wird nicht genannt`);
      assert(run.stdout.includes(geraet.sheet), `das Blatt zu ${geraet.family} wird nicht genannt`);
    }
    assert(/Fragen zu Arasul/.test(run.stdout), "Fragen zu Arasul werden nicht angeboten");
    assert(/Apache-Lizenz 2\.0/.test(run.stdout), "die Lizenz des Kits wird nicht genannt");
    assert(/ein Gerät damit läuft auf community/.test(run.stdout), "der Satz zum Token fehlt");
    // Ruhig heißt: kein zweiter Anlauf. Was Arasul brächte, steht genau einmal da.
    const werbung = run.stdout.split("Mit Arasul bekäme").length - 1;
    assert(werbung === 1, `der Satz über Arasul steht ${werbung} mal da`);

    // Ein unterstütztes Gerät bekommt diesen Abschluss nicht.
    writeFileSync(join(work, "orin.txt"), ATTRAPPEN.orin + "\n");
    const orin = tool("device.mjs", ["--name", "orin", "--probe", join(work, "orin.txt")]);
    assert(!/Ohne passendes Gerät/.test(orin.stdout), "ein unterstütztes Gerät bekommt den Abschluss auch");
  } finally {
    rmSync(work, { recursive: true, force: true });
    for (const n of ["mac", "orin"]) pruefeAkteUnveraendert(n, vorher[n]);
    if (savedState === null) rmSync(stateFile, { force: true });
    else writeFileSync(stateFile, savedState);
  }
});

check("Der Kaufweg hängt an /device: Form, Portal, Ablage, Gerät", () => {
  // Kolja am 28.08.2026: kein Befehl, der /kaufen heißt. Der Weg hängt dort, wo
  // das Urteil „unterstützt" fällt, und der eingefügte Token geht über die
  // Leitung hinein, nie als Argument. Geprüft wird gegen ein gespieltes Portal
  // und eine eigene .env, damit die echte Ablage unberührt bleibt.
  assert(TOKEN_SHAPE.test("ara_" + "0123456789abcdef".repeat(2)), "die Form nimmt einen richtigen Token nicht an");
  assert(!tokenShape("ara_kaputt").ok, "ein zu kurzer Token gilt als richtig");
  assert(!tokenShape("xyz_" + "a".repeat(32)).ok, "ein Token ohne ara_ gilt als richtig");
  assert(!tokenShape("ara_" + "g".repeat(32)).ok, "ein Token mit Zeichen außerhalb von hex gilt als richtig");
  assert(tokenShape("ara_" + "a".repeat(32)).ok, "ein Token der richtigen Form wird abgewiesen");
  assert(cleanToken(`  "token=ARA_${"A".repeat(32)}"\n`) === "ara_" + "a".repeat(32), "Eingefügtes wird nicht bereinigt");
  assert(!/ara_kaputt/.test(tokenShape("ara_kaputt").reason), "die Begründung wiederholt den Token");
  return "Form geprüft";
});

await checkAsync("Der Kaufweg: eingefügter Token wird geprüft, hinterlegt, und dann kommt das Gerät", async () => {
  const gueltig = "ara_" + "0123456789abcdef".repeat(2);
  const widerrufen = "ara_" + "f".repeat(32);
  const gesehen = [];
  const server = createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    gesehen.push({ pruefen: url.searchParams.get("pruefen"), token: url.searchParams.get("token") });
    if (url.searchParams.get("token") === gueltig) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ ok: true, typ: "device", artefakt: "bereit" }));
      return;
    }
    response.writeHead(403, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: false, fehler: "token_ungueltig", meldung: "Ungueltiger Token. Kaufen unter arasul.de/kaufen." }));
  });
  await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
  const base = `http://127.0.0.1:${server.address().port}`;
  const work = mkdtempSync(join(tmpdir(), "ara-kauf-"));
  const envFile = join(work, "env");
  writeFileSync(envFile, `ARASUL_BASIS=${base}\n`);
  const env = { ARA_ENV_FILE: envFile };
  const akten = ["_selftest-kauf-a", "_selftest-kauf-b"];
  const anlegen = (name, arasul) => {
    mkdirSync(join(ROOT, "devices", name), { recursive: true });
    writeFileSync(join(ROOT, "devices", name, "device.md"), `---\nname: ${name}\nverdict: supported\narasul: ${arasul}\n---\n`);
  };
  const store = (token) =>
    new Promise((done) => {
      const child = spawn("node", [join(ROOT, ".ara", "tools", "device.mjs"), "--licence", "--store"], {
        env: { ...process.env, ARA_LANGUAGE: TOOL_LANGUAGE, ...env },
      });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (d) => (stdout += d));
      child.stderr.on("data", (d) => (stderr += d));
      child.on("close", (status) => done({ status, stdout, stderr }));
      child.stdin.end(`${token}\n`);
    });
  try {
    // Ohne Token: der Link, die Sätze, und die Aufforderung, im Interview zu fragen.
    let run = await toolAsync("device.mjs", ["--licence"], env);
    assert(run.status === 0, `--licence fehlgeschlagen: ${run.stderr}`);
    assert(/keiner hinterlegt/.test(run.stdout), `es wird nicht gesagt, dass kein Token liegt:\n${run.stdout}`);
    assert(run.stdout.includes("https://www.arasul.de/kaufen"), "der Link zu Konto und Token fehlt");
    assert(/genau einen kostenlosen Geräte-Token/.test(run.stdout), "was das Konto bringt, fehlt");
    // K21: keine Preise im Kit, die stehen auf der Seite.
    assert(!/Euro netto/.test(run.stdout), `das Kit nennt einen Preis:\n${run.stdout}`);
    assert(/Was das kostet, steht auf der Seite/.test(run.stdout), "wo der Preis steht, fehlt");
    assert(/zugleich der Lizenzcode/.test(run.stdout), "dass ein gekaufter Token der Lizenzcode ist, fehlt");
    assert(/Interview-Werkzeug/.test(run.stdout), "die Frage läuft nicht über das Interview-Werkzeug");
    assert(/--licence --store/.test(run.stdout), "der Weg für den eingefügten Token fehlt");
    assert(gesehen.length === 0, "ohne Token wurde das Portal gefragt");

    // Falsche Form: kein Portal, keine Ablage.
    run = await store("ara_kaputt");
    assert(run.status !== 0, "ein Token falscher Form wurde angenommen");
    assert(/kein Geräte-Token/.test(run.stderr), `die Form wird nicht benannt: ${run.stderr}`);
    assert(gesehen.length === 0, "bei falscher Form wurde das Portal gefragt");
    assert(!/ARASUL_TOKEN/.test(readFileSync(envFile, "utf8")), "ein Token falscher Form wurde hinterlegt");

    // Abgelehnt: die Begründung des Portals, und nichts hinterlegt.
    run = await store(widerrufen);
    assert(run.status !== 0, "ein abgelehnter Token wurde angenommen");
    assert(/token_ungueltig/.test(run.stderr), `die Begründung des Portals fehlt: ${run.stderr}`);
    assert(gesehen.length === 1 && gesehen[0].pruefen === "1", "die Prüfung lief nicht mit pruefen=1");
    assert(!/ARASUL_TOKEN/.test(readFileSync(envFile, "utf8")), "ein abgelehnter Token wurde hinterlegt");

    // Gültig, ohne Akte: hinterlegt, und der Hinweis auf /device.
    run = await store(gueltig);
    assert(run.status === 0, `ein gültiger Token wurde abgewiesen: ${run.stderr}`);
    assert(new RegExp(`^ARASUL_TOKEN=${gueltig}$`, "m").test(readFileSync(envFile, "utf8")), "der Token liegt nicht in der Ablage");
    assert(!run.stdout.includes(gueltig) && !run.stderr.includes(gueltig), "der Token steht in der Ausgabe");
    assert(/geprüft und hinterlegt/.test(run.stdout), `es wird nicht gesagt, dass er liegt:\n${run.stdout}`);
    assert(/Typ device.*Artefakt bereit/.test(run.stdout), "die Antwort des Portals wird nicht wiedergegeben");
    assert(/noch keine Akte/.test(run.stdout), "ohne Akte fehlt der Hinweis auf /device");

    // Eine passende Akte: das Werkzeug nennt sie und den Aufruf.
    anlegen(akten[0], "none");
    run = await store(gueltig);
    assert(/Eine Akte passt: _selftest-kauf-a/.test(run.stdout), `die eine Akte wird nicht genannt:\n${run.stdout}`);
    assert(/--name _selftest-kauf-a --install arasul/.test(run.stdout), "der Aufruf zur Installation fehlt");

    // Zwei passende Akten: die Frage, welches Gerät, über das Interview-Werkzeug.
    anlegen(akten[1], "none");
    run = await store(gueltig);
    assert(/2 Akten passen/.test(run.stdout), `zwei Akten werden nicht gezählt:\n${run.stdout}`);
    assert(/Interview-Werkzeug, welches Gerät/.test(run.stdout), "bei mehreren Akten wird nicht gefragt");
    // Eine Akte, auf der Arasul läuft, ist kein Ziel.
    anlegen(akten[1], "running");
    run = await toolAsync("device.mjs", ["--licence", "--json"], env);
    const out = JSON.parse(run.stdout);
    assert(out.stored === true, "mit Token sagt --licence, es liege keiner");
    assert(out.targets.length === 1 && out.targets[0].name === akten[0], "ein laufendes Gerät gilt als Ziel");

    // Mit Token: kein Kaufweg mehr, nur der Aufruf.
    run = await toolAsync("device.mjs", ["--licence"], env);
    assert(/hinterlegt\. Für diese Installation ist nichts zu kaufen/.test(run.stdout), `mit Token wird weiter verkauft:\n${run.stdout}`);
    assert(!run.stdout.includes("https://www.arasul.de/kaufen"), "mit Token steht der Kauflink noch da");
    return "Form, Portal, Ablage, eine Akte, zwei Akten";
  } finally {
    server.close();
    rmSync(work, { recursive: true, force: true });
    for (const n of akten) rmSync(join(ROOT, "devices", n), { recursive: true, force: true });
  }
});

await checkAsync("Die Freischaltung: Fingerabdruck, Portal, einspielen, Stufe, und nie Code oder Lizenz", async () => {
  // K21, gegen die Verträge aus arasul-website (docs/api-license.md) und
  // arasul-jet (scripts/util/lizenz-geraet.sh). Das Gerät ist eine Attrappe, die
  // genau eine Zeile JSON je Aufruf gibt, das Portal ein gespielter Server.
  const bezahlt = "ara_" + "a".repeat(32);
  const kostenlos = "ara_" + "b".repeat(32);
  const gebunden = "ara_" + "c".repeat(32);
  const lizenz = "eyJ0aWVyIjoicHJvZmVzc2lvbmFsIn0.c2lnbmF0dXJfZ2VoZWlt";
  const fingerabdruck = "0123456789abcdef0123456789abcdef";
  const anfragen = [];
  const server = createServer((request, response) => {
    let body = "";
    request.on("data", (d) => (body += d));
    request.on("end", () => {
      const daten = JSON.parse(body || "{}");
      anfragen.push({ method: request.method, path: request.url, ...daten });
      const antworte = (status, objekt) => {
        response.writeHead(status, { "Content-Type": "application/json" });
        response.end(JSON.stringify(objekt));
      };
      if (daten.token === bezahlt) return antworte(200, { license: lizenz, tier: "professional", customer: "Muster GmbH" });
      if (daten.token === kostenlos) return antworte(403, { ok: false, fehler: "nicht_bezahlt", meldung: "Kostenloser Token." });
      if (daten.token === gebunden) return antworte(409, { ok: false, fehler: "anderes_geraet", meldung: "Anderes Gerät." });
      return antworte(401, { ok: false, fehler: "token_unbekannt", meldung: "Unbekannt." });
    });
  });
  await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
  const base = `http://127.0.0.1:${server.address().port}`;
  const geraet = ({ stufe = "community", ablehnen = false, ohneFingerabdruck = false } = {}) => {
    const aufrufe = [];
    let jetzt = stufe;
    const run = (befehl, eingabe) => {
      aufrufe.push({ befehl, eingabe });
      const zeile = (o, status = 0) => ({ status, stdout: `Rauschen davor\n${JSON.stringify(o)}\n`, stderr: "" });
      if (befehl === "fingerabdruck") {
        return ohneFingerabdruck ? zeile({ fehler: "Der Container dashboard-backend laeuft nicht." }, 1) : zeile({ fingerabdruck });
      }
      if (befehl === "einspielen") {
        if (ablehnen) return zeile({ ok: false, fehler: "Signatur ungueltig" }, 1);
        jetzt = "professional";
        return zeile({ ok: true, stufe: "professional" });
      }
      const grenze = jetzt === "community" ? 3 : -1;
      return zeile({ stufe: jetzt, konten: { belegt: 2, grenze }, apps: { belegt: 1, grenze } });
    };
    return { run, aufrufe };
  };
  const again = "node .ara/tools/device.mjs --name orin --license";
  const sauber = (text, ...werte) => werte.every((w) => !text.includes(w));
  try {
    // Bezahlt: Lizenz über die Standardeingabe ans Gerät, Stufe und Grenzen zurück.
    let g = geraet();
    let r = await unlock({ run: g.run, token: bezahlt, again, base });
    assert(r.ok && r.outcome === "professional", `bezahlt, aber nicht freigeschaltet: ${JSON.stringify(r)}`);
    const anfrage = anfragen.at(-1);
    assert(anfrage.method === "POST" && anfrage.path === ISSUE_PATH, `falscher Aufruf am Portal: ${anfrage.method} ${anfrage.path}`);
    assert(anfrage.fingerprint === fingerabdruck, "der Fingerabdruck des Geräts kam nicht beim Portal an");
    const einspielen = g.aufrufe.find((a) => a.befehl === "einspielen");
    assert(einspielen && einspielen.eingabe === lizenz, "die Lizenz ging nicht über die Standardeingabe ans Gerät");
    assert(g.aufrufe.at(-1).befehl === "status", "nach dem Einspielen wird der Stand nicht gelesen");
    let zeilen = unlockLines(r, { place: "orin", again }).join("\n");
    assert(/freigeschaltet, Stufe professional, für Muster GmbH/.test(zeilen), `Stufe fehlt:\n${zeilen}`);
    assert(/Konten 2 belegt, ohne Grenze, Apps 1 belegt, ohne Grenze/.test(zeilen), `Grenzen fehlen:\n${zeilen}`);
    assert(sauber(JSON.stringify(r) + zeilen, bezahlt, lizenz), "Code oder Lizenz stehen im Ergebnis");

    // Kostenlos: kein Fehler, community, ein Satz dazu, nichts eingespielt.
    g = geraet();
    r = await unlock({ run: g.run, token: kostenlos, again, base });
    assert(r.ok && r.outcome === "community" && r.reason === "not_paid", `kostenlos endet nicht auf community: ${JSON.stringify(r)}`);
    assert(!g.aufrufe.some((a) => a.befehl === "einspielen"), "ein kostenloser Token hat etwas eingespielt");
    zeilen = unlockLines(r, { place: "orin", again }).join("\n");
    assert(/läuft auf community\. Der Code ist ein kostenloser/.test(zeilen), `kostenlos wird nicht benannt:\n${zeilen}`);
    assert(/Community heißt: dieses Gerät trägt bis zu 3 Konten und 3 Apps/.test(zeilen), `was community heißt, fehlt:\n${zeilen}`);
    assert(/Interview-Werkzeug/.test(zeilen) && /--license --pipe/.test(zeilen), "der Weg zum gekauften Code fehlt");
    assert(sauber(zeilen, kostenlos), "der Code steht in der Ausgabe");

    // Kein Code: das Portal wird nicht gefragt, das Gerät bleibt, was es ist.
    const vorher = anfragen.length;
    r = await unlock({ run: geraet().run, token: null, again, base });
    assert(r.ok && r.outcome === "community" && r.reason === "no_code", "ohne Code nicht community");
    assert(anfragen.length === vorher, "ohne Code wurde das Portal gefragt");

    // Anderes Gerät: ein Fehler mit dem Weg über das Portal, nichts eingespielt.
    g = geraet();
    r = await unlock({ run: g.run, token: gebunden, again, base });
    assert(!r.ok && r.step === "portal" && r.portal.error === "anderes_geraet", `409 nicht erkannt: ${JSON.stringify(r)}`);
    assert(/Gerätewechsel freigeben/.test(r.message), "der Weg über das Portal fehlt");
    assert(!g.aufrufe.some((a) => a.befehl === "einspielen"), "bei 409 wurde eingespielt");

    // Unbekannt: 401 mit Meldung.
    r = await unlock({ run: geraet().run, token: "ara_" + "d".repeat(32), again, base });
    assert(!r.ok && r.portal.error === "token_unbekannt", "401 nicht erkannt");

    // Das Gerät lehnt ab: Fehler, und die Lizenz steht nicht in der Meldung.
    r = await unlock({ run: geraet({ ablehnen: true }).run, token: bezahlt, again, base });
    assert(!r.ok && r.step === "install" && /Signatur ungueltig/.test(r.message), `Ablehnung am Gerät nicht erkannt: ${JSON.stringify(r)}`);
    assert(sauber(JSON.stringify(r), lizenz, bezahlt), "Code oder Lizenz stehen in der Ablehnung");

    // Kein Fingerabdruck: das Portal wird nicht gefragt.
    const davor = anfragen.length;
    r = await unlock({ run: geraet({ ohneFingerabdruck: true }).run, token: bezahlt, again, base });
    assert(!r.ok && r.step === "fingerprint" && /laeuft nicht/.test(r.message), "fehlender Fingerabdruck nicht erkannt");
    assert(anfragen.length === davor, "ohne Fingerabdruck wurde das Portal gefragt");

    // Portal aus: kein abgelehnter Code, sondern keine Antwort.
    r = await unlock({ run: geraet().run, token: bezahlt, again, base: "http://127.0.0.1:9" });
    assert(!r.ok && r.portal.reachable === false, "ein schweigendes Portal gilt als Ablehnung");
    return "bezahlt, kostenlos, ohne Code, 409, 401, Ablehnung, kein Fingerabdruck, Portal aus";
  } finally {
    server.close();
  }
});

check("--license mit --name gilt dem Gerät, ohne --name bleibt es der Kaufweg", () => {
  const work = mkdtempSync(join(tmpdir(), "ara-lizenz-"));
  try {
    const datei = join(work, "orin.txt");
    writeFileSync(datei, ATTRAPPEN.orin + "\n");
    const run = tool("device.mjs", ["--name", "orin", "--probe", datei, "--license"]);
    assert(run.status !== 0 && /Trockenlauf/.test(run.stderr), `ein Trockenlauf schaltet frei:\n${run.stdout}${run.stderr}`);
    const hilfe = readFileSync(join(ROOT, ".ara", "tools", "device.mjs"), "utf8");
    assert(/--license --pipe/.test(hilfe), "die Hilfe nennt den eingefügten Code nicht");
    return "Trockenlauf abgewiesen, Hilfe nennt den Weg";
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

check("Ein unterstütztes Gerät ohne Token zeigt den Kaufweg, mit Token nicht mehr", () => {
  // Dort, wo /device ein unterstütztes Gerät erkennt und kein Token liegt, steht
  // der Kaufweg unter den nächsten Schritten: Link, Frage im Interview, und wie
  // der eingefügte Token hineinkommt. Liegt ein Token, steht dort der Aufruf.
  const work = mkdtempSync(join(tmpdir(), "ara-kauf-orin-"));
  const vorher = { orin: akteStand("orin"), mac: akteStand("mac") };
  const stateFile = join(ROOT, ".ara", "state.json");
  const savedState = existsSync(stateFile) ? readFileSync(stateFile, "utf8") : null;
  try {
    const datei = join(work, "orin.txt");
    writeFileSync(datei, ATTRAPPEN.orin + "\n");
    const ohne = join(work, "ohne.env");
    writeFileSync(ohne, "");
    let run = tool("device.mjs", ["--name", "orin", "--probe", datei], "", { ARA_ENV_FILE: ohne });
    assert(run.status === 0, `Trockenlauf fehlgeschlagen: ${run.stderr}`);
    assert(run.stdout.includes("https://www.arasul.de/kaufen"), `der Kaufweg fehlt:\n${run.stdout}`);
    assert(/kein Token hinterlegt/.test(run.stdout), "es wird nicht gesagt, dass kein Token liegt");
    assert(/Interview-Werkzeug/.test(run.stdout), "die Frage läuft nicht über das Interview-Werkzeug");
    assert(/--licence --store/.test(run.stdout), "der Weg für den eingefügten Token fehlt");
    assert(/Nein heißt/.test(run.stdout), "was ein Nein bedeutet, fehlt");
    assert(!/--install arasul/.test(run.stdout), "ohne Token wird die Installation angeboten");
    run = tool("device.mjs", ["--name", "orin", "--probe", datei, "--json"], "", { ARA_ENV_FILE: ohne });
    assert(JSON.parse(run.stdout).licence?.token_stored === false, "das JSON sagt nicht, dass kein Token liegt");

    const mit = join(work, "mit.env");
    writeFileSync(mit, `ARASUL_TOKEN=ara_${"1".repeat(32)}\n`);
    run = tool("device.mjs", ["--name", "orin", "--probe", datei], "", { ARA_ENV_FILE: mit });
    // Ein Trockenlauf installiert nie, also nennt er auch mit Token keinen Aufruf. Der Kaufweg ist weg.
    assert(run.status === 0, `Trockenlauf mit Token fehlgeschlagen: ${run.stderr}`);
    assert(!run.stdout.includes("https://www.arasul.de/kaufen"), `mit Token steht der Kauflink noch da:\n${run.stdout}`);
    assert(!/Interview-Werkzeug/.test(run.stdout), "mit Token wird noch gefragt");
    assert(!run.stdout.includes("1".repeat(32)), "der Token steht in der Ausgabe");

    // Ein Gerät, das Arasul nicht trägt, bekommt keinen Kaufweg, nur den ruhigen Satz.
    writeFileSync(join(work, "mac.txt"), ATTRAPPEN.mac + "\n");
    run = tool("device.mjs", ["--name", "mac", "--probe", join(work, "mac.txt")], "", { ARA_ENV_FILE: ohne });
    assert(!/Interview-Werkzeug/.test(run.stdout), "ein nicht unterstütztes Gerät bekommt die Kauffrage");
    assert(!/Euro netto/.test(run.stdout), "der Satz zur Lizenz nennt einen Preis");
    assert(/steht auf der\s+Seite, nicht im Kit/.test(run.stdout), "der Satz zur Lizenz sagt nicht, wo der Preis steht");
    return "ohne Token Kaufweg, mit Token keiner";
  } finally {
    rmSync(work, { recursive: true, force: true });
    for (const n of ["orin", "mac"]) pruefeAkteUnveraendert(n, vorher[n]);
    if (savedState === null) rmSync(stateFile, { force: true });
    else writeFileSync(stateFile, savedState);
  }
});

check("Vor dem Eingriff steht der Verifikationsstand im Protokoll", () => {
  // Wer an einem Gerät etwas verändert, soll vorher gelesen haben, worauf sich
  // das Kit stützt und wie belastbar das ist. Der Block steht deshalb vor dem
  // ersten Schritt und nicht im Bericht danach.
  const stateFile = join(ROOT, ".ara", "state.json");
  const savedState = existsSync(stateFile) ? readFileSync(stateFile, "utf8") : null;
  const name = "selftest-eingriff";
  const spiegel = attrappenSpiegel({ "orin-64": "live" });
  rmSync(join(ROOT, "devices", name), { recursive: true, force: true });
  try {
    const run = tool(
      "device.mjs",
      ["--host", "127.0.0.2", "--port", "1", "--user", "probe", "--name", name, "--install", "docker"],
      "",
      { ARA_MIRROR: spiegel }
    );
    assert(run.status !== 0, "ohne Verbindung wurde aufgesetzt");
    const block = run.stdout.indexOf("Geräteprofil, vor dem Start");
    assert(block !== -1, `der Block vor dem Start fehlt:\n${run.stdout}`);
    assert(/Verifikationsstand:/.test(run.stdout), "der Verifikationsstand fehlt vor dem Eingriff");
    // Der Lauf bricht ab, bevor irgendetwas aufgesetzt wird, und der Block steht
    // trotzdem da: also stand er vor dem ersten Schritt und nicht im Bericht.
    assert(!/aufsetzen auf/.test(run.stdout), `es wurde doch aufgesetzt:\n${run.stdout}`);
    assert(block < run.stdout.length, "der Block steht nicht in der Ausgabe");
  } finally {
    rmSync(spiegel, { recursive: true, force: true });
    rmSync(join(ROOT, "devices", name), { recursive: true, force: true });
    if (savedState === null) rmSync(stateFile, { force: true });
    else writeFileSync(stateFile, savedState);
  }
});

// --- Selbstheilung -----------------------------------------------------------

/**
 * Eine Attrappe von Docker: ein Shell-Skript im PATH, das `ps`, `inspect`,
 * `start`, `stop` und `logs` beantwortet und seinen Zustand in Dateien hält.
 * Ein Container namens `flattert` geht bei `start` sofort wieder aus: das ist
 * der Fall, in dem das Kit aufgeben und fragen muss.
 */
function dockerAttrappe(dir, containers) {
  const state = join(dir, "state");
  mkdirSync(state, { recursive: true });
  for (const [name, line] of Object.entries(containers)) writeFileSync(join(state, name), line);
  const script = `#!/bin/sh
S="${state}"
cmd="$1"; shift
case "$cmd" in
  ps)
    [ "$1" = "-a" ] || exit 0
    for f in "$S"/*; do n=$(basename "$f"); printf '%s|%s\\n' "$n" "$(cat "$f")"; done ;;
  inspect)
    n="$3"; IFS='|' read -r st status rest < "$S/$n"
    h=""; case "$status" in *"(healthy)"*) h=healthy;; *"(unhealthy)"*) h=unhealthy;; esac
    printf '%s|%s\\n' "$st" "$h" ;;
  start)
    n="$1"; IFS='|' read -r st status rest < "$S/$n"
    if [ "$n" = flattert ]; then printf 'exited|Exited (1)|%s\\n' "$rest" > "$S/$n"; else printf 'running|Up 1 second (healthy)|%s\\n' "$rest" > "$S/$n"; fi ;;
  stop)
    n="$1"; IFS='|' read -r st status rest < "$S/$n"
    printf 'exited|Exited (0)|%s\\n' "$rest" > "$S/$n" ;;
  logs) echo "attrappe: letzte zeile" ;;
  *) exit 1 ;;
esac
`;
  writeFileSync(join(dir, "docker"), script, { mode: 0o755 });
  return {
    stateOf: (name) => readFileSync(join(state, name), "utf8").split("|")[0],
  };
}

check("Selbstheilung: Baum, Grenzen und Plan aus den Befunden", () => {
  const facts = parseHealProbe(
    "@tree=/home/x/arasul\n@docker=docker\n" +
      "@container=dashboard-backend|exited|Exited (1)|arasul-platform|dashboard-backend|/home/x/arasul/arasul-jet\n" +
      "@container=jetcam|exited|Exited (0)|jetcam|jetcam|/home/x/jetcam\n" +
      "@container=arasul-app-urlaub-test|exited|Exited (0)|||\n" +
      "@container=llm-service|running|Up 3 hours (unhealthy)|arasul-platform|llm-service|/home/x/arasul/arasul-jet\n" +
      "@container=postgres-db|running|Up 3 hours (healthy)|arasul-platform|postgres-db|/home/x/arasul/arasul-jet\n@done=ja"
  );
  assert(insideTree("/home/x/arasul/arasul-jet", ["/home/x/arasul"]), "Unterordner nicht im Baum");
  assert(!insideTree("/home/x/arasul-jet", ["/home/x/arasul"]), "Namensvetter zählt als im Baum");
  assert(!insideTree("", ["/home/x/arasul"]), "leerer Pfad zählt als im Baum");
  const { faults, outside } = findFaults(facts);
  assert(faults.map((f) => f.name).join(",") === "dashboard-backend,arasul-app-urlaub-test,llm-service", `falsche Befunde im Baum: ${faults.map((f) => f.name)}`);
  assert(outside.length === 1 && outside[0].name === "jetcam", "jetcam liegt außerhalb und wurde trotzdem geplant");
  const start = healPlan(faults[0], "sudo -n docker");
  assert(start.ok && /^sudo -n docker start 'dashboard-backend'$/.test(start.fix), `Plan falsch: ${start.fix}`);
  assert(/stop 'dashboard-backend'/.test(start.undo), "kein Weg zurück im Plan");
  const unhealthy = healPlan(faults[2]);
  assert(!unhealthy.ok && /Neustart/.test(unhealthy.reason), "unhealthy bekam einen Plan, ein Neustart hat aber keinen Weg zurück");
  assert(reached(readVerify("running|healthy\n"), "running") && !reached(readVerify("running|unhealthy"), "running"), "Nachweis liest falsch");
  assert(!readVerify("running|starting").settled, "ein laufender Healthcheck gilt als fertig");
  assert(nextId([]) === "H-0001" && nextId([{ id: "H-0007" }, { id: "H-0002" }]) === "H-0008", "Nummern nicht fortlaufend");
});

check("Selbstheilung: der Fehler steht im Protokoll, wird behoben, die Rücknahme stellt den Stand her", () => {
  const name = "_selftest-heil";
  const dir = join(ROOT, "devices", name);
  const home = mkdtempSync(join(tmpdir(), "ara-heil-"));
  const fake = join(home, "bin");
  mkdirSync(join(home, "arasul", "arasul-jet"), { recursive: true });
  mkdirSync(join(home, "jetcam"), { recursive: true });
  const tree = join(home, "arasul", "arasul-jet");
  const docker = dockerAttrappe(fake, {
    "dashboard-backend": `exited|Exited (1)|arasul-platform|dashboard-backend|${tree}`,
    "postgres-db": `running|Up 3 hours (healthy)|arasul-platform|postgres-db|${tree}`,
    "llm-service": `running|Up 3 hours (unhealthy)|arasul-platform|llm-service|${tree}`,
    "arasul-app-urlaub-test": "exited|Exited (0)|||",
    jetcam: `exited|Exited (0)|jetcam|jetcam|${join(home, "jetcam")}`,
    flattert: `exited|Exited (1)|arasul-platform|flattert|${tree}`,
  });
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "device.md"), "---\nname: _selftest-heil\naddress: localhost\nssh_user: probe\nssh_port: 1\n---\n\n## Prüfungen\n");
  const env = { HOME: home, PATH: `${fake}:${process.env.PATH}` };
  try {
    // Erst der Plan: er ändert nichts, und es entsteht kein Protokoll.
    let run = tool("heal.mjs", ["--device", name, "--plan", "--wait", "0"], "", env);
    assert(/Was es täte/.test(run.stdout) && /Geändert wurde nichts/.test(run.stdout), `Plan fehlt: ${run.stdout}`);
    assert(!existsSync(join(dir, "interventions.json")), "der Plan hat protokolliert");
    assert(docker.stateOf("dashboard-backend") === "exited", "der Plan hat gestartet");

    // Dann der Lauf. Rückgabe 1, weil es zwei Fragen gibt: unhealthy und flattert.
    run = tool("heal.mjs", ["--device", name, "--wait", "0", "--json"], "", env);
    assert(run.status === 1, `Rückgabecode ${run.status}: ${run.stderr || run.stdout}`);
    const out = JSON.parse(run.stdout);
    assert(out.transport === "local", "lief nicht lokal");
    assert(docker.stateOf("dashboard-backend") === "running", "dashboard-backend nicht gestartet");
    assert(docker.stateOf("arasul-app-urlaub-test") === "running", "die App der Plattform ohne Compose-Marke wurde nicht als Teil des Baums erkannt");
    assert(docker.stateOf("jetcam") === "exited", "jetcam außerhalb des Baums wurde angefasst");
    assert(out.outside.some((o) => o.name === "jetcam"), "jetcam steht nicht als außerhalb im Bericht");
    assert(out.done.length === 2 && out.done.every((d) => d.result === "fixed"), `erledigt: ${JSON.stringify(out.done)}`);
    assert(out.questions.length === 2, `Fragen: ${JSON.stringify(out.questions)}`);
    assert(out.questions.some((q) => q.target === "llm-service" && /Neustart/.test(q.reason)), "unhealthy wurde nicht als Frage gemeldet");
    const gaveUp = out.questions.find((q) => q.target === "flattert");
    assert(gaveUp && /^H-000\d$/.test(gaveUp.id) && /gibt hier auf/.test(gaveUp.reason) && /letzte zeile/.test(gaveUp.logs), "flattert: kein Aufgeben mit Protokoll und Logzeilen");

    // Die Nummern folgen der Reihenfolge, in der Docker die Container nennt, und
    // die ist hier nicht festgelegt. Gesucht wird darum nach dem Ziel.
    const ledger = JSON.parse(readFileSync(join(dir, "interventions.json"), "utf8"));
    const dash = ledger.find((e) => e.target === "dashboard-backend");
    assert(ledger.length === 3 && ledger[0].id === "H-0001" && dash && dash.before.status === "exited", "Protokoll unvollständig");
    assert(ledger.every((e) => e.undo && e.verify), "ein Eintrag ohne Weg zurück oder Nachweis");
    let body = readFileSync(join(dir, "device.md"), "utf8");
    assert(new RegExp(`### .* · Eingriff ${dash.id}\\n.*dashboard-backend`).test(body), "Eingriff steht nicht in der Akte");
    assert(new RegExp(`Weg zurück: node \\.ara/tools/heal\\.mjs --device _selftest-heil --undo ${dash.id}`).test(body), "der Weg zurück steht nicht als Befehl in der Akte");
    assert(new RegExp(`Eingriff ${gaveUp.id}.*\\n.*Ergebnis: failed`).test(body), "der gescheiterte Eingriff fehlt in der Akte");

    // Die Rücknahme: der Stand davor ist exited, und danach ist er es wieder.
    run = tool("heal.mjs", ["--device", name, "--undo", dash.id, "--wait", "0"], "", env);
    assert(run.status === 0, `Rücknahme fehlgeschlagen: ${run.stderr || run.stdout}`);
    assert(/Der Stand davor ist wiederhergestellt/.test(run.stdout), "kein Nachweis der Rücknahme");
    assert(docker.stateOf("dashboard-backend") === "exited", "die Rücknahme hat den Stand davor nicht hergestellt");
    assert(docker.stateOf("arasul-app-urlaub-test") === "running", "die Rücknahme hat einen anderen Eingriff mitgenommen");
    body = readFileSync(join(dir, "device.md"), "utf8");
    assert(new RegExp(`Rücknahme ${dash.id}`).test(body), "die Rücknahme steht nicht in der Akte");
    run = tool("heal.mjs", ["--device", name, "--undo", dash.id], "", env);
    assert(run.status !== 0 && /schon/.test(run.stderr), "eine zweite Rücknahme wurde angenommen");
    run = tool("heal.mjs", ["--device", name, "--undo", "H-0099"], "", env);
    assert(run.status !== 0, "eine Rücknahme ohne Eintrag wurde angenommen");
    run = tool("heal.mjs", ["--device", name, "--list"], "", env);
    assert(new RegExp(`${dash.id} .*zurückgenommen`).test(run.stdout) && /H-0001/.test(run.stdout) && /H-0003/.test(run.stdout), `Liste unvollständig: ${run.stdout}`);
    return "3 Eingriffe, 2 Fragen, 1 Rücknahme";
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  }
});

check("Die Orin-Anleitung hat je Abschnitt einen Prüfschritt", () => {
  // Die Anleitung ist Text, nicht Automatik. Was sie leisten muss: nach jedem
  // Abschnitt weiß der Mensch, ob er weitergehen darf. Ein Abschnitt ohne
  // Prüfschritt ist eine Lücke, und genau die soll eine Fremdlesung nicht finden.
  const files = { "flash-orin.md": /^\*\*Check:\*\*/m, "flash-orin.de.md": /^\*\*Prüfschritt:\*\*/m };
  const missing = [];
  let sections = 0;
  for (const [file, marker] of Object.entries(files)) {
    const text = readFileSync(join(ROOT, ".ara", "knowledge", file), "utf8");
    const parts = text.split(/^## /m).slice(1);
    for (const part of parts) {
      const title = part.split("\n")[0].trim();
      // Nur die Schritte tragen Nummern. Der Rahmen davor und danach hat keinen.
      if (!/^\d+\. /.test(title)) continue;
      sections++;
      if (!marker.test(part)) missing.push(`${file}: ${title}`);
    }
    assert(/^As of: |^Stand: /m.test(text) && /^Source: |^Quelle: /m.test(text), `${file} nennt Stand oder Quelle nicht`);
  }
  assert(missing.length === 0, `ohne Prüfschritt: ${missing.join("; ")}`);
  assert(sections >= 12, `nur ${sections} Schritte in beiden Fassungen, das kann nicht stimmen`);
  return `${sections / 2} Schritte je Fassung`;
});

// --- Agenda -----------------------------------------------------------------

check("Agenda erkennt Termine und Lücken", () => {
  const customer = "_selftest";
  const dir = join(CUSTOMERS_TMP, customer);
  rmSync(dir, { recursive: true, force: true });
  try {
    const deviceDir = join(dir, "devices", "probe");
    spawnSync("mkdir", ["-p", deviceDir]);

    const past = day(-5);
    writeFileSync(
      join(dir, "customer.md"),
      `---\nid: ${customer}\nlegal_name: Probe GmbH\nstatus: lead\nfollow_up: ${past}\nfollow_up_note: nachfassen\n---\n\nProbe.\n`
    );
    writeFileSync(
      join(deviceDir, "device.md"),
      `---\nname: probe\ncustomer: ${customer}\nstatus: live\n---\n\nProbe.\n`
    );

    // Ein Gerät ohne Kunden mit auslaufender Wartung.
    const ownDir = join(ROOT, "devices", "_selftest-own");
    rmSync(ownDir, { recursive: true, force: true });
    spawnSync("mkdir", ["-p", ownDir]);
    const soon = day(10);
    writeFileSync(join(ownDir, "device.md"), `---\nname: _selftest-own\nstatus: live\nmaintenance_until: ${soon}\n---\n`);

    const run = tool("agenda.mjs", []);
    assert(run.status === 0, `Agenda fehlgeschlagen: ${run.stderr}`);
    assert(/Überfällig/.test(run.stdout), "überfällige Wiedervorlage nicht erkannt");
    assert(/nachfassen/.test(run.stdout), "Notiz zur Wiedervorlage fehlt");
    assert(/keine Wartungslaufzeit/.test(run.stdout), "fehlende Wartungslaufzeit nicht bemerkt");
    assert(/Wartung _selftest-own läuft in 10 Tagen/.test(run.stdout), "Gerät ohne Kunden fehlt in der Agenda");

    const json = tool("agenda.mjs", ["--json"]);
    const items = JSON.parse(json.stdout);
    assert(Array.isArray(items) && items.length >= 3, "JSON-Ausgabe unvollständig");
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(join(ROOT, "devices", "_selftest-own"), { recursive: true, force: true });
  }
});

// --- Kalkulation ------------------------------------------------------------

check("Kalkulationsblatt meldet jede fehlende Zahl mit ihrer Folge", () => {
  // Der Zweck des Werkzeugs ist die Meldung, nicht die Liste: "ohne Stundensatz
  // keine Kalkulation" ist brauchbar, "einiges fehlt" nicht. Geprüft wird deshalb
  // beides, die Zählung und dass jede Zahl ihre Folge nennt.
  const dir = mkdtempSync(join(tmpdir(), "ara-kalk-"));
  const file = join(dir, "company.md");
  try {
    // Das leere Blatt, so wie es aus der Vorlage entsteht.
    writeFileSync(file, readFileSync(join(ROOT, ".ara", "templates", "company.md"), "utf8"));

    let run = tool("calculation.mjs", ["--file", file]);
    assert(run.status !== 0, "ein leeres Blatt gilt als ausreichend für ein Angebot");
    assert(/keine Kalkulation/.test(run.stdout), "die Folge des fehlenden Stundensatzes fehlt");
    assert(/Nachtragen mit \/calculation/.test(run.stdout), "der Weg zum Nachtragen fehlt");

    const empty = JSON.parse(tool("calculation.mjs", ["--file", file, "--json"]).stdout);
    assert(empty.numbers.length === 10, `${empty.numbers.length} Zahlen statt zehn`);
    assert(empty.missing.length === 10, `${empty.missing.length} von zehn als fehlend erkannt`);
    assert(empty.can_quote === false, "ohne jede Zahl hält sich das Blatt für angebotsreif");
    for (const number of empty.numbers) {
      assert(number.without, `${number.key} nennt keine Folge, "einiges fehlt" reicht nicht`);
    }

    // Das gefüllte Blatt. Ein Einkaufspreis ist absichtlich über ein Jahr alt.
    writeFileSync(
      file,
      [
        "---",
        "hourly_rate: 95",
        "hardware_markup: 12",
        "payment_terms: 14",
        "setup_hours: 12",
        "care_yearly: 1200",
        "travel: 90",
        "minimum_fee: 450",
        `rates_asof: ${day(0)}`,
        "---",
        "",
        "## Einkaufspreise",
        "",
        "| Position | Einkauf netto | Stand |",
        "|---|---|---|",
        `| Lizenz, einmalig | 1400 | ${day(0)} |`,
        `| Wartung, jährlich | 480 | ${day(-400)} |`,
        `| Hardware, Jetson Thor | 3900 | ${day(0)} |`,
        "",
      ].join("\n")
    );

    run = tool("calculation.mjs", ["--file", file]);
    assert(run.status === 0, `gefülltes Blatt wird abgelehnt: ${run.stdout}`);

    const full = JSON.parse(tool("calculation.mjs", ["--file", file, "--json"]).stdout);
    assert(full.complete, `es fehlt noch: ${full.missing.join(", ")}`);
    assert(
      full.stale.includes("maintenance"),
      "ein über ein Jahr alter Einkaufspreis wird nicht als veraltet gemeldet"
    );
    assert(!full.stale.includes("license"), "ein frischer Einkaufspreis gilt als veraltet");
    assert(full.undated.length === 0, `ohne Not als undatiert gemeldet: ${full.undated.join(", ")}`);
    return "leeres und gefülltes Blatt";
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- Datenträger ------------------------------------------------------------

check("Datenträger-Werkzeug schützt interne Datenträger", () => {
  const run = tool("disk.mjs", ["--write", join(ROOT, "README.md"), "--to", "disk0"]);
  assert(run.status !== 0, "Systemdatenträger wurde als Ziel akzeptiert");
});

check("Datenträger-Werkzeug listet ohne Fehler", () => {
  const run = tool("disk.mjs", ["--list"]);
  assert(run.status === 0, `Auflisten fehlgeschlagen: ${run.stderr}`);
});

// --- Geheimnisse ------------------------------------------------------------

check("Geheimnis-Werkzeug meldet Ablage und Stand", () => {
  const run = tool("secrets.mjs", ["--show"]);
  assert(run.status === 0, `Anzeige fehlgeschlagen: ${run.stderr}`);
  assert(/Ablage:/.test(run.stdout), "Ablage wird nicht genannt");
  assert(/ARASUL_TOKEN/.test(run.stdout), "bekannte Geheimnisse fehlen");
  // Kein Wert darf je in der Ausgabe stehen.
  assert(!/=[A-Za-z0-9_\-]{8,}/.test(run.stdout), "Ausgabe enthält etwas, das wie ein Wert aussieht");
});

check("Die Antwortdateien nennen den Wertevorrat, und zwar denselben", () => {
  // Fund des Fremdtests am 29.08.2026: die Beispieldatei nannte
  // `first_device_state: ordered`, und was sonst noch erlaubt ist, stand
  // nirgends, wo jemand es beim Ausfuellen sieht. Abgewiesen wurde er
  // trotzdem, also erst beim dritten Versuch.
  //
  // Zwei Listen an zwei Stellen laufen auseinander, deshalb wird hier gefragt,
  // ob sie noch dieselben sind: die Pruefung in `lib/profile.mjs` und das, was
  // in den vier Beispieldateien steht.
  const dateien = [
    ["init-answers-partner.json", "_values"],
    ["init-answers-company.json", "_values"],
    ["init-answers-partner.de.json", "_werte"],
    ["init-answers-company.de.json", "_werte"],
  ];
  for (const [name, schluessel] of dateien) {
    const inhalt = JSON.parse(readFileSync(join(ROOT, ".ara", "templates", name), "utf8"));
    const genannt = inhalt[schluessel];
    assert(genannt, `${name} nennt den Wertevorrat nicht unter ${schluessel}`);
    assert(typeof genannt._ === "string" && genannt._.length > 20, `${name}: ${schluessel} sagt nicht, wozu es da ist`);
    for (const [feld, werte] of Object.entries(CLOSED_FIELDS)) {
      assert(
        JSON.stringify(genannt[feld]) === JSON.stringify([...werte]),
        `${name} nennt fuer ${feld} ${JSON.stringify(genannt[feld])}, erlaubt ist ${JSON.stringify([...werte])}`
      );
      // Und der Beispielwert selbst muss einer davon sein, sonst faellt die
      // Datei ueber ihre eigene Pruefung.
      if (inhalt[feld]) {
        assert(werte.includes(inhalt[feld]), `${name} setzt ${feld} auf ${inhalt[feld]}, das steht nicht im Vorrat`);
      }
    }
    for (const feld of Object.keys(genannt)) {
      assert(feld === "_" || feld in CLOSED_FIELDS, `${name} nennt ${feld}, das ist kein Feld mit festem Vorrat`);
    }
  }
  return `${Object.keys(CLOSED_FIELDS).length} Felder, in 4 Antwortdateien gleich`;
});

check("Bei env gilt env, und der Schluesselbund gilt nicht", () => {
  // Fund des Fremdtests am 29.08.2026: `getSecret` sah bei `secrets_store: env`
  // trotzdem im Schluesselbund nach, wenn die .env den Namen nicht kannte. Auf
  // einem Rechner, auf dem schon einmal ein anderer Klon gearbeitet hat, stand
  // damit ein fremder Eintrag als "hinterlegt" da -- und ein Kit, das ein
  // Geheimnis findet, das ihm nicht gehoert, arbeitet mit dem Zugang eines
  // anderen, ohne dass es jemand sieht.
  //
  // Geprueft wird an einem Wegwerf-Kit mit einem eigenen Profil. Angefasst wird
  // dabei kein Schluesselbund: der andere Speicher ist hier die .env, und die
  // gewaehlte Ablage ist der Schluesselbund.
  const work = mkdtempSync(join(tmpdir(), "ara-store-"));
  const fork = join(work, "kit");
  cpSync(join(ROOT, ".ara", "tools"), join(fork, ".ara", "tools"), { recursive: true });
  mkdirSync(join(fork, "business"), { recursive: true });
  const profil = (store) =>
    writeFileSync(join(fork, "business", "profile.md"), `---\nsecrets_store: ${store}\n---\n`);
  const forkTool = (args) =>
    spawnSync("node", [join(fork, ".ara", "tools", "secrets.mjs"), ...args], { encoding: "utf8" });
  try {
    writeFileSync(join(fork, ".env"), "ARA_SELFTEST_FREMD=aus-der-env\n");

    // Gewaehlt ist env: der Wert gilt.
    profil("env");
    let run = forkTool(["--get", "ARA_SELFTEST_FREMD"]);
    assert(run.status === 0 && run.stdout === "aus-der-env", `die eigene Ablage wird nicht gelesen: ${run.stdout}`);

    // Gewaehlt ist der Schluesselbund: derselbe Wert liegt in der .env und
    // gilt nicht mehr. Frueher kam er hier zurueck.
    profil("keychain");
    run = forkTool(["--get", "ARA_SELFTEST_FREMD"]);
    assert(run.status !== 0, `die andere Ablage wurde gelesen: ${run.stdout}`);

    // Verschwiegen wird er trotzdem nicht: wer gerade umgestellt hat, soll
    // wissen, wo sein Wert liegt.
    run = spawnSync(
      "node",
      [join(fork, ".ara", "tools", "secrets.mjs"), "--show"],
      { encoding: "utf8", env: { ...process.env, ARA_SELFTEST_FREMD: "" } }
    );
    assert(run.status === 0, `--show fiel um: ${run.stderr}`);
    return "eigene Ablage gilt, die andere nicht, und sie wird trotzdem genannt";
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

check("Vergessen trifft nur die eigene Ablage", () => {
  // Derselbe Fund wie bei getSecret in 0.18.0, eine Stufe schaerfer: was dieses
  // Kit aus der ANDEREN Ablage entfernt, ist weg, und dort liegt es, weil ein
  // anderer Klon auf diesem Rechner es abgelegt hat. Am 29.08.2026 nahm der
  // erste Entwurf von --revoke-key den Eintrag aus beiden.
  //
  // Angefasst wird auch hier kein Schluesselbund: gewaehlt ist der
  // Schluesselbund, und die andere Ablage ist die .env.
  const work = mkdtempSync(join(tmpdir(), "ara-vergessen-"));
  const fork = join(work, "kit");
  cpSync(join(ROOT, ".ara", "tools"), join(fork, ".ara", "tools"), { recursive: true });
  mkdirSync(join(fork, "business"), { recursive: true });
  writeFileSync(join(fork, "business", "profile.md"), "---\nsecrets_store: keychain\n---\n");
  writeFileSync(join(fork, ".env"), "ARA_SELFTEST_FREMD=aus-der-env\n");
  const lib = JSON.stringify(join(fork, ".ara", "tools", "lib", "secrets.mjs"));
  try {
    const run = spawnSync(
      "node",
      ["-e", `import(${lib}).then((m) => process.stdout.write(String(m.forgetSecret("ARA_SELFTEST_FREMD")) + "|" + String(m.otherStore("ARA_SELFTEST_FREMD"))))`],
      { encoding: "utf8" }
    );
    assert(run.status === 0, `Vergessen fiel um: ${run.stderr}`);
    assert(run.stdout.startsWith("null|"), `die andere Ablage wurde angefasst: ${run.stdout}`);
    assert(readFileSync(join(fork, ".env"), "utf8").includes("aus-der-env"), "der fremde Eintrag ist aus der .env verschwunden");
    assert(run.stdout.endsWith("|env"), `die andere Ablage wird verschwiegen: ${run.stdout}`);
    return "andere Ablage genannt, nicht angefasst";
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

check("Geheimnis-Werkzeug lehnt unsinnige Ablagen ab", () => {
  const run = tool("secrets.mjs", ["--store", "irgendwas"]);
  assert(run.status !== 0, "unbekannte Ablage wurde akzeptiert");
});

check("Ein Geheimnis lässt sich auch ohne Terminal hinterlegen", () => {
  // Der Fremdtest am 28.08.2026 lief ohne Terminal. Das Werkzeug fragte in eine
  // Leitung hinein, an deren Ende niemand saß, und das Token blieb "fehlt":
  // damit war die Installation von vornherein nicht erreichbar.
  //
  // Geprüft wird an einem Wegwerf-Kit, damit die echte .env unberührt bleibt.
  const work = mkdtempSync(join(tmpdir(), "ara-secret-"));
  const fork = join(work, "kit");
  cpSync(join(ROOT, ".ara", "tools"), join(fork, ".ara", "tools"), { recursive: true });
  const forkTool = (args, input) =>
    spawnSync("node", [join(fork, ".ara", "tools", "secrets.mjs"), ...args], { encoding: "utf8", input });
  try {
    const wert = "geheim-aus-der-leitung";
    let run = forkTool(["--set", "ARA_SELFTEST_PROBE"], `${wert}\n`);
    assert(run.status === 0, `Hinterlegen ohne Terminal fehlgeschlagen: ${run.stderr || run.stdout}`);
    assert(/hinterlegt in/.test(run.stdout), `es wird nicht gesagt, wo der Wert liegt: ${run.stdout}`);
    assert(!new RegExp(wert).test(`${run.stdout}${run.stderr}`), "der Wert steht in der Ausgabe");

    const env = readFileSync(join(fork, ".env"), "utf8");
    assert(new RegExp(`^ARA_SELFTEST_PROBE=${wert}$`, "m").test(env), `der Wert kam nicht an: ${env}`);

    // Und das Werkzeug findet ihn danach wieder, ohne ihn vorzulesen.
    run = forkTool(["--show"], "");
    assert(run.status === 0, `Anzeige fehlgeschlagen: ${run.stderr}`);
    assert(!new RegExp(wert).test(run.stdout), "die Übersicht zeigt den Wert");

    // Eine leere Leitung ist kein Wert, und das Werkzeug tut nicht so.
    run = forkTool(["--set", "ARA_SELFTEST_LEER"], "\n");
    assert(run.status !== 0, "ein leerer Wert wurde hinterlegt");
    assert(/kein Wert/.test(run.stderr), `der leere Wert wird nicht benannt: ${run.stderr}`);
    assert(!/ARA_SELFTEST_LEER/.test(readFileSync(join(fork, ".env"), "utf8")), "der leere Eintrag steht in der .env");
    return "gesetzt, gefunden, leer abgewiesen";
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

check("Was in den Schlüsselbund geht, kommt gleich wieder heraus", () => {
  // Der Fehler, an dem der erste Anlauf von G1 hing, am 28.08.2026. Das Kit
  // legte das Token im Schlüsselbund ab, `security` meldete Erfolg, und der
  // Eintrag war leer: `add-generic-password -w` fragt den Wert zweimal ab, zur
  // Bestätigung, und wer ihn einmal über die Leitung schickt, bekommt
  // "passwords don't match", einen leeren Eintrag und trotzdem Status 0.
  // Getroffen hätte es das Startpasswort und den Kit-Schlüssel: beide werden
  // einmal genannt, und danach wäre der Zugang zum Gerät weg gewesen.
  //
  // Ein Eintrag, der existiert, ist kein Eintrag, der stimmt. Deshalb wird hier
  // wirklich geschrieben und wirklich zurückgelesen, an einem Wegwerf-Kit,
  // dessen Profil den Schlüsselbund wählt, unter einem eigenen Namen.
  if (!keychainAvailable()) return "übersprungen, hier gibt es keinen Schlüsselbund";
  const name = "ARA_SELFTEST_BUND";
  const wert = "sehr-geheim-0123456789";
  const work = mkdtempSync(join(tmpdir(), "ara-bund-"));
  const fork = join(work, "kit");
  cpSync(join(ROOT, ".ara", "tools"), join(fork, ".ara", "tools"), { recursive: true });
  mkdirSync(join(fork, "business"), { recursive: true });
  writeFileSync(join(fork, "business", "profile.md"), "---\nlanguage: de\nsecrets_store: keychain\n---\n");
  try {
    const run = spawnSync("node", [join(fork, ".ara", "tools", "secrets.mjs"), "--set", name], {
      encoding: "utf8",
      input: `${wert}\n`,
    });
    assert(run.status === 0, `Hinterlegen im Schlüsselbund fehlgeschlagen: ${run.stderr || run.stdout}`);
    assert(!existsSync(join(fork, ".env")), "der Wert landete in der .env statt im Schlüsselbund");
    assert(!new RegExp(wert).test(`${run.stdout}${run.stderr}`), "der Wert steht in der Ausgabe");

    const zurueck = spawnSync("node", ["-e", `import(${JSON.stringify(join(fork, ".ara", "tools", "lib", "secrets.mjs"))}).then((m) => process.stdout.write(String((m.getSecret(${JSON.stringify(name)}) || "").length)))`], {
      encoding: "utf8",
    });
    assert(zurueck.status === 0, `Zurücklesen fehlgeschlagen: ${zurueck.stderr}`);
    assert(
      zurueck.stdout === String(wert.length),
      `der Schlüsselbund gibt ${zurueck.stdout} Zeichen zurück, hinein gingen ${wert.length}`
    );
    return `${wert.length} Zeichen hinein, ${zurueck.stdout} zurück`;
  } finally {
    if (platform() === "darwin") {
      spawnSync("security", ["delete-generic-password", "-a", name, "-s", "ara-kit"], { encoding: "utf8" });
    } else {
      spawnSync("secret-tool", ["clear", "service", "ara-kit", "account", name], { encoding: "utf8" });
    }
    rmSync(work, { recursive: true, force: true });
  }
});

await checkAsync("Das Startpasswort kommt aus dem Kit heraus, ohne sichtbar zu werden", async () => {
  // Fund 1 des zweiten Fremdtests am 28.08.2026. Die Installation legte das
  // Startpasswort des Administrators ordentlich unter ARASUL_START_<gerät> ab,
  // und dann kam es dort nie wieder heraus: `secrets.mjs --show` nannte nur die
  // Kit-Schlüssel, und kein Werkzeug reichte es für die erste Anmeldung weiter.
  // Ein Geheimnis, an das niemand herankommt, ist ein verlorener Zugang.
  //
  // Zuerst die Mechanik für sich: was das Artefakt sagt, sticht den Rückfall des
  // Kits, und was im Aufruf steht, sticht beides. Das Kit behauptet hier nichts,
  // ohne dazuzusagen, woher es das hat.
  assert(loginSpec(null).sources.path === "kit", "der Rückfall gibt sich nicht als solcher zu erkennen");
  const ausArtefakt = loginSpec({ anmeldung: { pfad: "/api/sitzung", benutzer: "chef" } });
  assert(ausArtefakt.path === "/api/sitzung" && ausArtefakt.sources.path === "artefakt", "das Artefakt sticht nicht");
  assert(ausArtefakt.user === "chef" && ausArtefakt.sources.user === "artefakt", "der Benutzername aus dem Artefakt gilt nicht");
  const ausAufruf = loginSpec({ anmeldung: { pfad: "/api/sitzung" } }, { path: "/api/anders" });
  assert(ausAufruf.path === "/api/anders" && ausAufruf.sources.path === "aufruf", "der Aufruf sticht nicht");
  assert(pickToken({ token: "ey.abc" }) === "ey.abc", "der Ausweis wird nicht gefunden");
  assert(pickToken({ sitzung: { access_token: "ey.tief" } }) === "ey.tief", "ein Ausweis im Umschlag wird nicht gefunden");
  assert(pickToken({ irgendwas: 1 }) === null, "es wird ein Ausweis behauptet, wo keiner steht");

  const name = "selftest-login";
  const akte = join(ROOT, "devices", name);
  const ref = "ARASUL_START_SELFTEST_LOGIN";
  const passwort = "start-geheim-4711";
  const work = mkdtempSync(join(tmpdir(), "ara-login-"));
  const mirror = join(work, "spiegel");

  // Das Gerät, gespielt: es nimmt genau eine Anmeldung an und gibt einen Ausweis.
  const gesehen = [];
  const server = createServer((request, response) => {
    const teile = [];
    request.on("data", (chunk) => teile.push(chunk));
    request.on("end", () => {
      const antwort = (status, body) => {
        response.writeHead(status, { "Content-Type": "application/json" });
        response.end(JSON.stringify(body));
      };
      let rumpf = null;
      try {
        rumpf = JSON.parse(Buffer.concat(teile).toString("utf8") || "null");
      } catch {
        rumpf = null;
      }
      gesehen.push({ pfad: request.url, method: request.method, rumpf });
      if (request.method !== "POST" || !["/api/auth/login", "/api/sitzung"].includes(request.url)) {
        return antwort(404, { error: { message: "Diesen Weg gibt es hier nicht" } });
      }
      const nutzer = rumpf?.username ?? rumpf?.benutzer ?? rumpf?.konto;
      const wort = rumpf?.password ?? rumpf?.passwort;
      if (wort !== passwort || !["admin", "chef"].includes(nutzer)) {
        return antwort(401, { error: { message: "Anmeldung abgelehnt" } });
      }
      // Ohne Umschlag, so wie das Geraet am 28.08.2026 wirklich antwortete. Die
      // Attrappe legte den Ausweis vorher in ein `data`, und genau darum fiel
      // nicht auf, dass das Kit alles wegwarf, was nicht in `data` steht.
      antwort(200, { success: true, token: "ey.selbsttest.sitzung", expiresAt: "2026-08-29T00:00:00Z" });
    });
  });
  await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
  const base = `http://127.0.0.1:${server.address().port}`;

  mkdirSync(akte, { recursive: true });
  cpSync(join(ROOT, ".ara", "templates", "device.md"), join(akte, "device.md"));
  writeFrontmatter(join(akte, "device.md"), {
    name,
    address: "127.0.0.1:1",
    api_base: base,
    verdict: "supported",
    arasul: "found",
    start_password_ref: ref,
  });
  // Das Geheimnis kommt aus der Umgebung: der Selbsttest fasst die echte
  // Geheimnis-Ablage des Partners nicht an.
  const env = { [ref]: passwort, ARA_MIRROR: mirror };

  try {
    // 1. Das Blatt nennt den Namen. Vorher stand dort nur ARASUL_KEY_...
    let run = await toolAsync("secrets.mjs", ["--show"], env);
    assert(run.status === 0, `Anzeige fehlgeschlagen: ${run.stderr}`);
    assert(new RegExp(ref).test(run.stdout), `der Name des Startpassworts fehlt: ${run.stdout}`);
    assert(/--admin-login/.test(run.stdout), "es wird nicht gesagt, wozu das Startpasswort da ist");
    assert(!new RegExp(passwort).test(run.stdout), "das Startpasswort steht in der Übersicht");

    // 2. Aus dem Passwort wird eine Sitzung, und zwar ohne das Passwort zu zeigen.
    run = await toolAsync("device.mjs", ["--name", name, "--admin-login"], env);
    assert(run.status === 0, `Anmeldung fehlgeschlagen: ${run.stdout}${run.stderr}`);
    assert(/ey\.selbsttest\.sitzung/.test(run.stdout), `der Ausweis fehlt in der Ausgabe: ${run.stdout}`);
    assert(!new RegExp(passwort).test(`${run.stdout}${run.stderr}`), "das Startpasswort steht in der Ausgabe");
    const angemeldet = gesehen.find((eintrag) => eintrag.pfad === "/api/auth/login");
    assert(angemeldet, `es wurde nicht angemeldet: ${JSON.stringify(gesehen)}`);
    assert(angemeldet.rumpf?.password === passwort, "das Passwort kam nicht am Gerät an");
    assert(
      angemeldet.rumpf?.username === "admin",
      `der Benutzername kam unter dem falschen Feld an: ${JSON.stringify(Object.keys(angemeldet.rumpf || {}))}`
    );

    // 3. Für ein Skript: nur der Ausweis, ohne Satz drumherum.
    run = await toolAsync("device.mjs", ["--name", name, "--admin-login", "--token"], env);
    assert(run.stdout === "ey.selbsttest.sitzung", `--token gibt nicht nur den Ausweis: ${run.stdout}`);

    // 3b. Heißen die Felder am Gerät anders, gibt der Mensch sie im Aufruf mit.
    //     Ohne diesen Weg blieb ihm am 28.08.2026 nur, den Fehler zu lesen: die
    //     Meldung nannte die Felder, mit denen gerufen wurde, und keinen Schalter,
    //     mit dem er andere hätte mitgeben können.
    run = await toolAsync(
      "device.mjs",
      ["--name", name, "--admin-login", "--login-user-field", "benutzer", "--login-password-field", "passwort"],
      env
    );
    assert(run.status === 0, `Anmeldung mit eigenen Feldnamen fehlgeschlagen: ${run.stdout}${run.stderr}`);
    const mitFeldern = gesehen.at(-1);
    assert(
      mitFeldern.rumpf?.benutzer === "admin" && mitFeldern.rumpf?.passwort === passwort,
      `die Feldnamen aus dem Aufruf kamen nicht an: ${JSON.stringify(Object.keys(mitFeldern.rumpf || {}))}`
    );

    // 3c. Und ein Gerät, das seine Auskunft doch in einen Umschlag legt, wird
    //     weiter verstanden: der Ausweis wird in beidem gefunden.
    assert(pickToken({ data: { token: "ey.im.umschlag" } }) === "ey.im.umschlag", "der Ausweis im Umschlag geht verloren");

    // 4. Sagt das Artefakt einen anderen Weg, gilt der und nicht der Rückfall.
    mkdirSync(mirror, { recursive: true });
    writeFileSync(
      join(mirror, "arasul-release.json"),
      JSON.stringify({
        fassung: "9.9.9",
        einstiegspunkt: "install.sh",
        anmeldung: { pfad: "/api/sitzung", benutzer: "chef", benutzerfeld: "benutzer", passwortfeld: "passwort" },
      })
    );
    run = await toolAsync("device.mjs", ["--name", name, "--admin-login"], env);
    assert(run.status === 0, `Anmeldung über den Weg aus dem Artefakt fehlgeschlagen: ${run.stdout}${run.stderr}`);
    assert(/aus dem Artefakt/.test(run.stdout), `es wird nicht gesagt, woher der Weg kommt: ${run.stdout}`);
    assert(gesehen.some((e) => e.pfad === "/api/sitzung" && e.rumpf?.benutzer === "chef"), "der Weg aus dem Artefakt wurde nicht genommen");

    // 5. Einen Weg, den es nicht gibt, behauptet das Kit nicht: es schickt zur
    //    API-Referenz im Artefakt, denn dort steht der richtige.
    run = await toolAsync("device.mjs", ["--name", name, "--admin-login", "--login-path", "/api/nirgendwo"], env);
    assert(run.status !== 0, "ein Weg, den es nicht gibt, endet mit Erfolg");
    assert(/mirror\.mjs --docs/.test(run.stderr), `es wird nicht zur API-Referenz geschickt: ${run.stderr}`);

    // 6. Ohne hinterlegtes Passwort sagt das Werkzeug, wie es dorthin kommt.
    run = await toolAsync("device.mjs", ["--name", name, "--admin-login"], { ARA_MIRROR: mirror });
    assert(run.status !== 0, "ohne Startpasswort wurde angemeldet");
    assert(new RegExp(`secrets\\.mjs --set ${ref}`).test(run.stderr), `der Weg zum Hinterlegen fehlt: ${run.stderr}`);
    return "Name genannt, Sitzung geholt, Passwort nie gezeigt";
  } finally {
    server.close();
    rmSync(akte, { recursive: true, force: true });
    rmSync(work, { recursive: true, force: true });
  }
});

// --- Spiegel ----------------------------------------------------------------

await checkAsync("Spiegel holt und packt aus", async () => {
  const work = mkdtempSync(join(tmpdir(), "ara-mirror-"));
  const source = join(work, "koljaschoepe-arasul-jet-abc1234");
  const targetMirror = join(work, "ziel");

  // Ein Tarball, wie ihn GitHub liefert: genau ein Wurzelordner.
  spawnSync("mkdir", ["-p", join(source, "config", "platforms")]);
  writeFileSync(join(source, "VERSION"), "1.0.0\n");
  writeFileSync(
    join(source, "config", "platforms", "probe.json"),
    JSON.stringify({ id: "probe", default_model: "modell-aus-dem-produkt" }, null, 2)
  );
  const tar = spawnSync("tar", [
    "-czf", join(work, "paket.tar.gz"),
    "-C", work, "koljaschoepe-arasul-jet-abc1234",
  ]);
  assert(tar.status === 0, "Testpaket ließ sich nicht bauen");

  const packet = readFileSync(join(work, "paket.tar.gz"));
  const server = createServer((request, response) => {
    if (!request.url.includes("token=")) {
      response.writeHead(400, { "Content-Type": "text/plain" });
      response.end("Fehlt: token\n");
      return;
    }
    if (request.url.includes("token=abgelaufen")) {
      response.writeHead(403, { "Content-Type": "text/plain" });
      response.end("Dein Wartungs-Abo ist beendet.\n");
      return;
    }
    response.writeHead(200, { "Content-Type": "application/gzip" });
    response.end(packet);
  });

  await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    // Das Token kommt aus einer umgelenkten .env, und dann zaehlt nur sie: kein
    // Schluesselbund, keine Prozessumgebung. Vorher stand es in der Umgebung,
    // und die kommt in `getSecret` zuletzt: auf einem Rechner, der einmal
    // wirklich installiert hat, lag im Schluesselbund ein echtes Token, das
    // stach, und der Fall "abgelehnt" trat nie ein. Gemessen war dann der
    // Rechner und nicht das Kit.
    const envFile = join(work, "token.env");
    const mitToken = (wert) => {
      // Die Adresse des Portals ist selbst ein hinterlegter Wert, also gehoert
      // sie in dieselbe Datei: sonst fragt das Werkzeug beim echten Portal.
      writeFileSync(envFile, `ARASUL_TOKEN=${wert}\nARASUL_BASIS=${base}\n`);
      return { ARA_MIRROR: targetMirror, ARA_ENV_FILE: envFile };
    };

    let run = await toolAsync("mirror.mjs", ["--refresh"], mitToken("gueltig"));
    assert(run.status === 0, `Holen fehlgeschlagen: ${run.stdout}${run.stderr}`);
    assert(existsSync(join(targetMirror, "VERSION")), "Wurzelordner nicht abgeschnitten");
    assert(
      existsSync(join(targetMirror, "config", "platforms", "probe.json")),
      "Plattformprofile fehlen im Spiegel"
    );
    const state = JSON.parse(readFileSync(join(targetMirror, "STATE.json"), "utf8"));
    assert(state.version === "1.0.0", "Produktversion nicht übernommen");

    // Ein zweiter Lauf ohne --refresh darf nichts holen.
    run = await toolAsync("mirror.mjs", [], mitToken("gueltig"));
    assert(/aktuell/.test(run.stdout), "frischer Spiegel wird unnötig neu geholt");

    // Die Begründung des Portals muss durchgereicht werden.
    run = await toolAsync("mirror.mjs", ["--refresh"], mitToken("abgelaufen"));
    assert(run.status !== 0, "abgelehnter Token führt nicht zum Fehler");
    assert(/Wartungs-Abo/.test(run.stdout), "Begründung des Portals fehlt in der Meldung");
  } finally {
    server.close();
    rmSync(work, { recursive: true, force: true });
  }
});

await checkAsync("Die Fassung steht im Artefakt, also nennt der Spiegel sie", async () => {
  // Fund 4 des zweiten Fremdtests am 28.08.2026. Der Spiegel lag da, in ihm lag
  // arasul-release.json mit der Fassung, und trotzdem sagten `--show` und die
  // Geräteakte „Fassung unbekannt": das Kit las die Zahl nur aus einer Datei
  // VERSION, und die bringt das Artefakt nicht mit.
  const work = mkdtempSync(join(tmpdir(), "ara-fassung-"));
  const source = join(work, "arasul-jet-abc1234");
  const targetMirror = join(work, "ziel");
  const gemerkt = process.env.ARA_MIRROR;

  mkdirSync(source, { recursive: true });
  // Ein Artefakt ohne VERSION, so wie es wirklich kommt.
  writeFileSync(
    join(source, "arasul-release.json"),
    JSON.stringify({ fassung: "2.4.1", einstiegspunkt: "install.sh" }, null, 2)
  );
  writeFileSync(join(source, "install.sh"), "#!/bin/sh\n");
  const tar = spawnSync("tar", ["-czf", join(work, "paket.tar.gz"), "-C", work, "arasul-jet-abc1234"]);
  assert(tar.status === 0, "Testpaket ließ sich nicht bauen");
  const packet = readFileSync(join(work, "paket.tar.gz"));

  const server = createServer((request, response) => {
    response.writeHead(200, { "Content-Type": "application/gzip" });
    response.end(packet);
  });
  await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    const env = { ARASUL_BASIS: base, ARA_MIRROR: targetMirror, ARASUL_TOKEN: "gueltig" };
    let run = await toolAsync("mirror.mjs", ["--refresh"], env);
    assert(run.status === 0, `Holen fehlgeschlagen: ${run.stdout}${run.stderr}`);
    assert(/2\.4\.1/.test(run.stdout), `die Fassung fehlt in der Meldung: ${run.stdout}`);

    const state = JSON.parse(readFileSync(join(targetMirror, "STATE.json"), "utf8"));
    assert(state.version === "2.4.1", `die Fassung kam nicht in den Stand: ${state.version}`);

    // Der Platzhalter, der den Ordner im Repository hält, überlebt das
    // Auspacken. Ohne ihn meldete `git status` im frischen Klon nach der ersten
    // Installation eine gelöschte Datei, die niemand angefasst hatte.
    assert(existsSync(join(targetMirror, ".gitkeep")), ".gitkeep ist beim Auspacken verschwunden");

    run = await toolAsync("mirror.mjs", ["--show"], env);
    assert(/Produktversion: 2\.4\.1/.test(run.stdout), `--show nennt die Fassung nicht: ${run.stdout}`);

    // Ein Spiegel aus der Zeit davor trägt im Stand keine Zahl. Sie liegt
    // trotzdem daneben, also wird sie gelesen statt „unbekannt" gesagt.
    writeFileSync(
      join(targetMirror, "STATE.json"),
      JSON.stringify({ fetched: new Date().toISOString(), source: base, version: null })
    );
    run = await toolAsync("mirror.mjs", ["--show"], env);
    assert(/Produktversion: 2\.4\.1/.test(run.stdout), `ein alter Stand bleibt unbekannt: ${run.stdout}`);
    assert(/arasul-release\.json/.test(run.stdout), "es wird nicht gesagt, woher die Fassung kommt");

    // Und dieselbe Zahl geht in den Ordnernamen am Gerät, statt „installer".
    process.env.ARA_MIRROR = targetMirror;
    assert(releaseVersion(targetMirror) === "2.4.1", "die Fassung wird aus dem Artefakt nicht gelesen");
    assert(mirrorState().version === "2.4.1", "der Stand liefert die Fassung nicht nach");
    assert(/arasul-2\.4\.1/.test(installTarget(mirrorState().version)), "das Ziel am Gerät trägt die Fassung nicht");
    return "2.4.1 aus arasul-release.json";
  } finally {
    if (gemerkt === undefined) delete process.env.ARA_MIRROR;
    else process.env.ARA_MIRROR = gemerkt;
    server.close();
    rmSync(work, { recursive: true, force: true });
  }
});

// --- Stand des Kits ----------------------------------------------------------

check("Der Stand des Kits ist lesbar und die Aenderungsliste passt dazu", () => {
  const version = readFileSync(join(ROOT, ".ara", "VERSION"), "utf8").trim();
  assert(/^\d+\.\d+\.\d+$/.test(version), `.ara/VERSION ist keine Nummer: ${version}`);

  const entries = parseChangelog(readFileSync(join(ROOT, ".ara", "CHANGELOG.md"), "utf8"));
  assert(entries.length > 0, "die Aenderungsliste hat keinen einzigen Eintrag in der erwarteten Form");
  assert(entries[0].version === version, `oberster Eintrag ${entries[0].version}, .ara/VERSION sagt ${version}`);
  assert(entries[0].lines.length > 0, "der oberste Eintrag nennt keine einzige Aenderung");

  // Die Zeile im Text und die Fassungen im Code sind zwei Aussagen ueber
  // dasselbe. Laufen sie auseinander, liest ein Partner die falsche.
  assert(
    entries[0].contract === KIT_CONTRACT_VERSION,
    `die Aenderungsliste sagt Kontrakt bis ${entries[0].contract}, der Code versteht bis ${KIT_CONTRACT_VERSION}`
  );

  // Die Eintraege stehen absteigend, sonst zeigt "neu seit" das Falsche.
  for (let i = 1; i < entries.length; i++) {
    assert(
      compareVersions(entries[i - 1].version, entries[i].version) > 0,
      `die Aenderungsliste steht nicht absteigend: ${entries[i - 1].version} vor ${entries[i].version}`
    );
  }
  return `${version}, ${entries.length} Eintrag${entries.length === 1 ? "" : "e"}`;
});

check("Was neu ist, richtet sich nach dem Stand, von dem jemand kommt", () => {
  const changelog = [
    "# Kopf, der kein Eintrag ist",
    "",
    "## 0.9.0 (2026-09-02)",
    "",
    "Kontrakt: bis 4",
    "",
    "- Das Neueste.",
    "",
    "## 0.8.0 (2026-09-01)",
    "",
    "- Das davor.",
    "",
    "## Vor 0.8.0",
    "",
    "- Diese Zeile ist kein Eintrag.",
    "",
  ].join("\n");
  const entries = parseChangelog(changelog);
  assert(entries.length === 2, `falsch gelesen: ${entries.map((e) => e.version).join(", ")}`);
  assert(entries[0].contract === 4 && entries[1].contract === null, "die Kontraktzeile wird nicht je Eintrag gelesen");
  assert(entriesSince(entries, "0.8.0").length === 1, "ein bekannter Stand bekommt zu viele Eintraege");
  assert(entriesSince(entries, "0.9.0").length === 0, "der eigene Stand gilt als neu");
  assert(entriesSince(entries, "").length === 2, "ohne bekannten Stand fehlt etwas");
  assert(compareVersions("0.10.0", "0.9.0") > 0, "0.10.0 gilt als aelter als 0.9.0");

  const block = standBlock({ version: "0.9.0", changelog, since: "0.8.0" });
  assert(block.some((z) => /Neu seit 0\.8\.0/.test(z)), "der Herkunftsstand fehlt");
  assert(block.some((z) => /Das Neueste/.test(z)), "das Neue fehlt");
  assert(!block.some((z) => /Das davor/.test(z)), "Bekanntes wird noch einmal erzaehlt");
  assert(block.some((z) => /Kontraktfassungen bis/.test(z)), "die Vertraeglichkeit zum Geraet fehlt");
  const ohne = standBlock({ version: "0.9.0", changelog, since: "0.9.0" });
  assert(ohne.some((z) => /nichts/.test(z)), "ohne Neues wird das nicht gesagt");

  // Die Kontraktzahl gehoert dem Stand, ueber den geredet wird. Fuer den
  // laufenden ist der Code die Quelle, fuer einen geholten seine eigene
  // Aenderungsliste: der Code dieses Laufs weiss ueber ihn nichts.
  assert(contractOf(changelog, "0.9.0") === 4, "die Kontraktzeile wird zum Eintrag nicht gefunden");
  assert(contractOf(changelog, "0.8.0") === null, "ein Eintrag ohne Kontraktzeile bekommt eine Zahl");
  assert(contractOf(changelog, "0.7.0") === null, "ein Stand ohne Eintrag bekommt eine Zahl");

  const fremdeGrenze = KIT_CONTRACT_VERSION + 1;
  const fremd = standBlock({ version: "0.9.0", changelog, since: "0.8.0", contract: fremdeGrenze });
  assert(
    fremd.some((z) => z.includes(`Kontraktfassungen bis ${fremdeGrenze}`)),
    "die hereingereichte Fassung wird nicht vorgelesen"
  );
  assert(
    !fremd.some((z) => z.includes(`Kontraktfassungen bis ${KIT_CONTRACT_VERSION}`)),
    "der Block liest die Grenze des laufenden Kits vor"
  );

  // Nennt ein Stand seine Grenze nicht, wird die Luecke gesagt und nicht mit
  // der eigenen Zahl gefuellt.
  const stumm = standBlock({ version: "0.9.0", changelog, since: "0.8.0", contract: null });
  assert(
    stumm.some((z) => /Bis zu welcher Kontraktfassung/.test(z)),
    "ein Stand ohne Kontraktzeile bekommt trotzdem eine Zahl"
  );
  assert(!stumm.some((z) => /Kontraktfassungen bis/.test(z)), "eine Luecke wird als Zahl vorgelesen");
});

// --- Kontrakt und Deploy -----------------------------------------------------

/**
 * Ein erfundener Kontrakt, kein abgeschriebener.
 *
 * Er hat die Form, die ein Gerät liefert, und trägt bewusst keine Produktwerte:
 * geprüft wird die Mechanik des Kits, nicht der Stand von Arasul. Was wirklich
 * gilt, sagt immer das Gerät.
 */
const KONTRAKT = {
  kontrakt: KIT_CONTRACT_VERSION,
  arasul: "0.0.0-selbsttest",
  app_json: {
    schema: {
      type: "object",
      properties: {
        schema: { type: "number", const: 1 },
        id: { type: "string", pattern: "^[a-z0-9][a-z0-9-]*$" },
        name: { type: "string", minLength: 1 },
        version: { type: "string", pattern: "^\\d+\\.\\d+\\.\\d+$" },
        ports: {
          type: "object",
          properties: { backend: { type: "integer", minimum: 1, maximum: 65535 } },
          required: ["backend"],
          additionalProperties: false,
        },
        modelle: { type: "array", maxItems: 2, items: { type: "string", minLength: 1 } },
        frontend: {
          type: "object",
          properties: { verzeichnis: { type: "string", minLength: 1 } },
          required: ["verzeichnis"],
          additionalProperties: false,
        },
        flows: {
          type: "object",
          properties: { verzeichnis: { type: "string", minLength: 1 } },
          required: ["verzeichnis"],
          additionalProperties: false,
        },
        backend: {
          type: "object",
          properties: {
            image: { type: "string", minLength: 1 },
            gesundheit: { type: "string", minLength: 1 },
            umgebung: { type: "object" },
            bauen: {
              type: "object",
              properties: { verzeichnis: { type: "string", minLength: 1 }, dockerfile: { type: "string" } },
              required: ["verzeichnis"],
              additionalProperties: false,
            },
          },
          required: ["image"],
          additionalProperties: false,
        },
      },
      required: ["schema", "id", "name", "version"],
      additionalProperties: false,
    },
    regeln: ["Mindestens eines von frontend und backend. Eine App ohne beides ist nichts."],
  },
  flow_frontmatter: {
    schema: { type: "object", properties: { name: { type: "string" } } },
    rumpf: "Der Auftrag steht als Text unter dem Kopf, nicht im Kopf.",
    regeln: ["Eine Datei je Flow, der Dateiname ist der Name."],
  },
  koepfe: { benutzer: "X-Arasul-User", rolle: "X-Arasul-Role", rollen: ["admin", "mitarbeiter"] },
  schluessel: { kopf: "X-API-Key", praefix: "aras_", bereiche: ["app:deploy"] },
  // Unter diesen Namen legt das gespielte Geraet einer App Adresse und
  // Schluessel in den Container. Sie sind bewusst NICHT die, die bis zum
  // 29.08.2026 in der Vorlage standen: eine Vorlage, die die Namen raet, muss
  // hier auffallen und nicht beim Kunden.
  umgebung: { basis: "ARASUL_BASIS_URL", schluessel: "ARASUL_APP_KEY" },
  paket: {
    format: "tar.gz",
    packen: "tar czf paket.tgz -C <ordner> .",
    // Die Wurzel nennt die Ordner als Platzhalter. Daran und an nichts anderem
    // erkennt das Kit, welche Felder des Manifests einen Ordner versprechen.
    wurzel: ["app.json", "<frontend.verzeichnis>/", "<flows.verzeichnis>/", "<backend.bauen.verzeichnis>/"],
    max_archiv_bytes: 200 * 1024 * 1024,
  },
  apps: { basis: "/apps/<id>/", teststand: "/apps/<id>/test/" },
  // Seit dem 26.09.2026 nennt das Gerät die Antwort des Auslesens und wie ein
  // Bild an ein Modell geht. Die Namen der Felder sind die des Geräts; ein
  // Satz steht hier mit Absicht anders als am Gerät, damit die Ausgabe
  // nachweislich aus dem Kontrakt kommt und nicht aus dem Kit.
  auslesen: {
    weg: "document/extract-structured",
    antwort: {
      type: "object",
      properties: {
        data: { anyOf: [{ type: "object" }, { type: "null" }], description: "Die Felder, nicht gegen schema geprüft" },
        job_id: { type: "string" },
      },
      required: ["data", "job_id"],
    },
    regeln: ["Probe: data kann null sein."],
  },
  bilder: { weg: "llm/chat", feld: "images", regeln: ["Probe: ein Textmodell mit Bild ist ein 400."] },
  endpunkte: [
    { verb: "GET", pfad: "/api/v1/external/contract", bereich: null, was: "Dieser Kontrakt" },
    { verb: "POST", pfad: "/api/v1/external/apps", bereich: "app:deploy", was: "Ein Paket einspielen" },
    { verb: "GET", pfad: "/api/v1/external/apps/:id", bereich: "app:deploy", was: "Was das Gerät weiß" },
    { verb: "POST", pfad: "/api/v1/external/apps/:id/schalten", bereich: "app:deploy", was: "Live schalten" },
    { verb: "DELETE", pfad: "/api/v1/external/apps/:id?bestaetigung=<id>", bereich: "app:deploy", was: "App weg" },
    { verb: "POST", pfad: "/api/v1/external/flows/:name/run", bereich: "flow:run", was: "Einen Flow starten" },
    { verb: "GET", pfad: "/api/v1/external/flows/runs/:id", bereich: "flow:run", was: "Einen Lauf lesen" },
    { verb: "GET", pfad: "/api/v1/external/freigaben", bereich: "flow:run", was: "Freigaben dieser App" },
  ],
};

const MANIFEST = { schema: 1, id: "probeapp", name: "Probe", version: "1.0.0", ports: { backend: 8080 } };

check("app.json wird gegen das Schema des Geräts geprüft", () => {
  const gut = checkManifest(KONTRAKT, MANIFEST);
  assert(gut.ok, `gültiges Manifest abgelehnt: ${gut.problems.join(" ")}`);
  assert(gut.rules.length === 1, "die Regeln ohne Schema werden nicht durchgereicht");
  assert(gut.unchecked.length === 0, `unnötig ungeprüft: ${gut.unchecked.join(", ")}`);

  const faelle = [
    [{ ...MANIFEST, version: "eins" }, /version.*Muster/],
    [{ ...MANIFEST, id: "Gross" }, /id.*Muster/],
    [{ ...MANIFEST, schema: 2 }, /schema.*muss 1 sein/],
    [{ ...MANIFEST, zusatz: "ja" }, /zusatz.*kennt das Gerät nicht/],
    [{ ...MANIFEST, ports: { backend: 99999 } }, /ports\.backend.*größer/],
    [{ ...MANIFEST, ports: {} }, /ports\.backend.*fehlt/],
    [{ ...MANIFEST, modelle: ["a", "b", "c"] }, /modelle.*mehr als 2/],
    [{ ...MANIFEST, name: "" }, /name.*zu kurz/],
    [{ schema: 1, id: "x" }, /name.*fehlt/],
  ];
  for (const [manifest, muster] of faelle) {
    const result = checkManifest(KONTRAKT, manifest);
    assert(!result.ok, `durchgelassen: ${JSON.stringify(manifest)}`);
    assert(
      result.problems.some((p) => muster.test(p)),
      `falsche Begründung für ${JSON.stringify(manifest)}: ${result.problems.join(" | ")}`
    );
  }

  // Was das Kit nicht prüfen kann, gibt es zu, statt es für gültig zu erklären.
  const fremd = checkManifest(
    { app_json: { schema: { type: "object", properties: { id: { type: "string", contentEncoding: "base64" } } } } },
    { id: "x" }
  );
  assert(fremd.unchecked.includes("contentEncoding"), "unbekannte Schemaangabe wird stillschweigend übergangen");
  return `${faelle.length} Abweichungen erkannt`;
});

check("Das Kit ruft nur, was das Gerät verspricht", () => {
  assert(findEndpoint(KONTRAKT, "POST", "/api/v1/external/apps"), "bekannter Endpunkt nicht gefunden");
  assert(findEndpoint(KONTRAKT, "GET", "/api/v1/external/apps/probeapp"), "Pfad mit Parameter nicht erkannt");
  assert(
    findEndpoint(KONTRAKT, "DELETE", "/api/v1/external/apps/probeapp?bestaetigung=probeapp"),
    "Pfad mit Rückfrage nicht erkannt"
  );
  assert(!findEndpoint(KONTRAKT, "POST", "/api/v1/external/apps/probeapp"), "unbekannter Endpunkt gilt als bekannt");
  assert(!findEndpoint(KONTRAKT, "PUT", "/api/v1/external/apps"), "falsches Verb gilt als bekannt");

  assert(checkVersion(KONTRAKT).ok, "gleiche Kontraktversion gilt nicht als passend");
  assert(!checkVersion({}).ok, "ein Gerät ohne Kontraktversion gilt als passend");
});

check("Das Kit kennt die höchste Fassung, die es versteht", () => {
  // Ein neueres Gerät ist ein Halt, und das Kit sagt, was ihm fehlt: die
  // Fassung, die es nicht kennt, und die Felder, die es nicht liest. Ein
  // älteres ist kein Halt: geprüft wird ohnehin gegen dessen Schema.
  const neuer = checkVersion({ ...KONTRAKT, kontrakt: KIT_CONTRACT_VERSION + 1, sonderfeld: { x: 1 } });
  assert(!neuer.ok && neuer.state === "device-newer", "neueres Gerät gilt als passend");
  // Der Weg ist ein Aufruf und nicht nur ein Befehl im Gespraech: /init fuehrt
  // daran vorbei, aber wer gerade abgebrochen ist, liest eine Zeile.
  assert(/update\.mjs/.test(neuer.text), "neueres Gerät führt nicht zum Aufruf, der das Kit nachzieht");
  assert(/init/.test(neuer.text), "neueres Gerät führt nicht zum Hinweis auf das Kit-Update");
  assert(neuer.device === KIT_CONTRACT_VERSION + 1 && neuer.kit === KIT_CONTRACT_VERSION, "die beiden Zahlen fehlen als Zahlen");
  assert(new RegExp(`Fassung ${KIT_CONTRACT_VERSION + 1}`).test(neuer.text), "die unbekannte Fassung wird nicht benannt");
  assert(/sonderfeld/.test(neuer.text), "das Kit sagt nicht, welches Feld es nicht liest");

  const aelter = checkVersion({ ...KONTRAKT, kontrakt: KIT_CONTRACT_VERSION - 1 });
  assert(aelter.ok && aelter.state === "device-older", "ein älteres Gerät wird nicht mehr bedient");
  assert(new RegExp(`versteht bis ${KIT_CONTRACT_VERSION}`).test(aelter.text), "das Kit nennt seine höchste Fassung nicht");

  const weiter = checkVersion({ ...KONTRAKT, kontrakt: KIT_CONTRACT_VERSION + 5 });
  assert(new RegExp(`Fassungen ${KIT_CONTRACT_VERSION + 1} bis ${KIT_CONTRACT_VERSION + 5}`).test(weiter.text), "mehrere unbekannte Fassungen werden nicht als Spanne genannt");
  return `Kit versteht bis ${KIT_CONTRACT_VERSION}`;
});

check("Welche Ordner ein Manifest verspricht, sagt der Kontrakt", () => {
  // Das Kit zählt die Felder nicht auf, es liest die Platzhalter aus der Wurzel
  // des Pakets. Kommt dort einer dazu, muss im Kit nichts nachgezogen werden.
  const mit = promisedFolders(KONTRAKT, {
    ...MANIFEST,
    frontend: { verzeichnis: "frontend" },
    flows: { verzeichnis: "flows" },
  });
  assert(mit.map((f) => f.folder).join(",") === "frontend,flows", `falsch gelesen: ${JSON.stringify(mit)}`);
  assert(mit[1].field === "flows.verzeichnis", "das Feld wird nicht mitgenannt");
  assert(promisedFolders(KONTRAKT, MANIFEST).length === 0, "ein Manifest ohne Ordner verspricht welche");
  assert(promisedFolders({}, MANIFEST).length === 0, "ohne Wurzel im Kontrakt rät das Kit");
});

check("Kein Schlüssel gerät in eine Ausgabe", () => {
  const text = scrub("  Schluessel  aras_abcdef1234567890\n  Praefix  aras_abcdef1");
  assert(!/aras_[A-Za-z0-9]/.test(text), `Schlüssel steht noch in der Ausgabe: ${text}`);
});

await checkAsync("app.mjs spielt ein Paket ein, schaltet live und wieder zurück", async () => {
  const stateFile = join(ROOT, ".ara", "state.json");
  const savedState = existsSync(stateFile) ? readFileSync(stateFile, "utf8") : null;
  const name = "selftest-arasul";
  const akte = join(ROOT, "devices", name);
  const appDir = join(ROOT, "apps", "probeapp");
  const work = mkdtempSync(join(tmpdir(), "ara-app-"));
  const quelle = join(work, "probeapp");

  mkdirSync(quelle, { recursive: true });
  writeFileSync(join(quelle, "app.json"), JSON.stringify(MANIFEST, null, 2));
  writeFileSync(join(quelle, "index.html"), "<p>Probe</p>\n");

  // Das Gerät, gespielt. Es prüft den Schlüssel in der Kopfzeile, nimmt genau ein
  // Multipart-Feld `paket` an und antwortet im Umschlag, den Arasul benutzt.
  const gesehen = { key: null, paket: false, inhalt: [], geschaltet: [], entfernt: null };
  const server = createServer((request, response) => {
    const antwort = (status, body) => {
      response.writeHead(status, { "Content-Type": "application/json" });
      response.end(JSON.stringify(body));
    };
    gesehen.key = request.headers["x-api-key"] || null;
    if (gesehen.key !== "aras_selbsttest") {
      antwort(401, { error: { code: "UNAUTHORIZED", message: "Kein gueltiger Schluessel" } });
      return;
    }
    const [pfad, frage] = request.url.split("?");
    const teile = [];
    request.on("data", (chunk) => teile.push(chunk));
    request.on("end", () => {
      const rumpf = Buffer.concat(teile);
      if (pfad === "/api/v1/external/contract") return antwort(200, { data: KONTRAKT });
      if (pfad === "/api/v1/external/apps" && request.method === "POST") {
        gesehen.paket =
          /name="paket"/.test(rumpf.toString("latin1").slice(0, 400)) && rumpf.includes(Buffer.from([0x1f, 0x8b]));
        // Was im Paket liegt, wird ausgepackt und nicht geglaubt: der Umschlag
        // des Multipart fällt weg, der Rest ist das Archiv.
        gesehen.inhalt = [];
        const anfang = rumpf.indexOf(Buffer.from([0x1f, 0x8b]));
        const ende = rumpf.lastIndexOf(Buffer.from("\r\n--"));
        if (anfang >= 0 && ende > anfang) {
          const liste = spawnSync("tar", ["-tzf", "-"], { input: rumpf.subarray(anfang, ende), encoding: "utf8" });
          gesehen.inhalt = liste.stdout.split(/\r?\n/).map((z) => z.trim()).filter(Boolean);
        }
        return antwort(201, { data: { app_id: "probeapp", version: "1.0.0", stand: "test" } });
      }
      if (pfad === "/api/v1/external/apps/probeapp/schalten") {
        const ziel = JSON.parse(rumpf.toString("utf8")).ziel;
        gesehen.geschaltet.push(ziel);
        return antwort(200, { data: { app_id: "probeapp", stand: "live", version: ziel === "live" ? "1.0.0" : "0.9.0" } });
      }
      if (pfad === "/api/v1/external/apps/probeapp" && request.method === "DELETE") {
        gesehen.entfernt = frage;
        return antwort(200, { data: { app_id: "probeapp", entfernt: true } });
      }
      antwort(404, { error: { code: "NOT_FOUND", message: "Endpoint not found" } });
    });
  });
  await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
  const base = `http://127.0.0.1:${server.address().port}`;
  const env = { ARASUL_KEY_SELFTEST: "aras_selbsttest" };

  mkdirSync(akte, { recursive: true });
  cpSync(join(ROOT, ".ara", "templates", "device.md"), join(akte, "device.md"));
  // Die Adresse führt bewusst ins Leere, die Schnittstelle steht in api_base:
  // so wie bei einem Gerät, das nur über einen Tunnel erreichbar ist. Wird
  // api_base nicht gelesen, scheitert unten jeder einzelne Aufruf.
  writeFrontmatter(join(akte, "device.md"), {
    name,
    address: "127.0.0.1:1",
    api_base: base,
    verdict: "supported",
    arasul: "found",
    api_key_ref: "ARASUL_KEY_SELFTEST",
  });

  try {
    // Ohne hinterlegten Schlüssel geht nichts, und das Werkzeug sagt, wo er herkommt.
    let run = await toolAsync("app.mjs", ["--device", name, "--contract"], {});
    assert(run.status !== 0 && /deploy-key/.test(run.stderr), "fehlender Schlüssel wird nicht erklärt");

    run = await toolAsync("app.mjs", ["--device", name, "--contract"], env);
    assert(run.status === 0, `Kontrakt fehlgeschlagen: ${run.stderr}${run.stdout}`);
    assert(gesehen.key === "aras_selbsttest", "der Schlüssel kam nicht in der Kopfzeile an");
    assert(
      new RegExp(`Kontraktversion ${KIT_CONTRACT_VERSION}`).test(run.stdout),
      "die Kontraktversion fehlt in der Ausgabe"
    );
    assert(/Regeln für einen Flow/.test(run.stdout), "die Flow-Regeln des Kontrakts fehlen in der Ausgabe");
    // Die Antwort des Auslesens und der Weg für Bilder, wörtlich aus dem Kontrakt.
    assert(
      /document\/extract-structured` antwortet/.test(run.stdout) &&
        /- `data` \(object \| null\): Die Felder, nicht gegen schema geprüft/.test(run.stdout),
      `die Antwort des Auslesens fehlt in der Ausgabe: ${run.stdout}`
    );
    assert(/Probe: data kann null sein\./.test(run.stdout), "die Sätze zum Auslesen fehlen in der Ausgabe");
    assert(
      /## Ein Bild an ein Modell/.test(run.stdout) && /Probe: ein Textmodell mit Bild ist ein 400\./.test(run.stdout),
      "der Weg für Bilder fehlt in der Ausgabe"
    );

    run = await toolAsync("app.mjs", ["--device", name, "--check", quelle], env);
    assert(run.status === 0, `Prüfung des Manifests fehlgeschlagen: ${run.stdout}${run.stderr}`);
    assert(/Regeln, die kein Schema trägt/.test(run.stdout), "die Regeln des Kontrakts fehlen in der Ausgabe");
    assert(!/Anrede:/.test(run.stdout), `eine App ohne du bekommt einen Befund zur Anrede: ${run.stdout}`);

    // Ein Flow, der duzt: --check meldet es mit Datei und Zeile, und es hält
    // nichts an, denn es ist ein Ton und kein Bruch des Kontrakts.
    const flowsNeu = !existsSync(join(quelle, "flows"));
    mkdirSync(join(quelle, "flows"), { recursive: true });
    writeFileSync(join(quelle, "flows", "anrede-probe.md"), "---\nzusammenhang: Was darin steht, liest du dort.\n---\n");
    run = await toolAsync("app.mjs", ["--device", name, "--check", quelle], env);
    if (flowsNeu) rmSync(join(quelle, "flows"), { recursive: true, force: true });
    else rmSync(join(quelle, "flows", "anrede-probe.md"), { force: true });
    assert(
      run.status === 0 && /Anrede: .*duzt an 1 Stelle/.test(run.stdout) && /flows\/anrede-probe\.md:2 „du"/.test(run.stdout),
      `--check meldet das Duzen nicht, oder es hält an: ${run.status} ${run.stdout}`
    );

    run = await toolAsync("app.mjs", ["--device", name, "--deploy", quelle], env);
    assert(run.status === 0, `Einspielen fehlgeschlagen: ${run.stdout}${run.stderr}`);
    assert(gesehen.paket, "am Gerät kam kein gepacktes Paket im Feld paket an");
    assert(/Teststand/.test(run.stdout), "der Teststand wird nicht genannt");
    // Fund 1 des zweiten Fremdtests: eingespielt ist nicht sichtbar. Ohne
    // Startpasswort in der Ablage ist der Weg die Oberflaeche, nicht die Sitzung.
    assert(/freigegeben/.test(run.stdout), `die fehlende Freigabe wird nicht genannt: ${run.stdout}`);
    assert(/ARASUL_START_SELFTEST_ARASUL/.test(run.stdout), "der Eintrag fuer das Startpasswort wird nicht benannt");
    assert(/Oberfläche/.test(run.stdout), "der Weg ueber die Oberflaeche fehlt");

    // Ein zweites Einspielen derselben App: die Freigabe gilt der App und ihrem
    // Stand, nicht der Fassung, und das Kit sagt nicht wieder, niemand habe sie
    // gesehen. Der Fremdtest am 25.09.2026 las genau das, mit freigegebenen Testern.
    run = await toolAsync("app.mjs", ["--device", name, "--deploy", quelle], env);
    assert(run.status === 0, `zweites Einspielen fehlgeschlagen: ${run.stdout}${run.stderr}`);
    assert(/Davor lag hier Fassung/.test(run.stdout) && /Freigaben bleiben stehen/.test(run.stdout), `das zweite Einspielen sagt nicht, dass Freigaben bleiben: ${run.stdout}`);
    assert(!/Gesehen hat es noch niemand/.test(run.stdout), "nach dem zweiten Einspielen heißt es wieder, niemand habe die App gesehen");

    // Und mit Startpasswort in der Ablage nennt ein erstes Einspielen die
    // Sitzung. Erstes heißt: der Merker weiß von dieser App an diesem Gerät nichts.
    const merkerJetzt = JSON.parse(readFileSync(join(ROOT, ".ara", "state.json"), "utf8"));
    for (const eintrag of Object.values(merkerJetzt.apps || {})) delete eintrag[name];
    writeFileSync(join(ROOT, ".ara", "state.json"), JSON.stringify(merkerJetzt, null, 2));
    run = await toolAsync("app.mjs", ["--device", name, "--deploy", quelle], {
      ...env,
      ARASUL_START_SELFTEST_ARASUL: "probe-passwort",
    });
    assert(run.status === 0, `Einspielen mit Startpasswort fehlgeschlagen: ${run.stdout}${run.stderr}`);
    assert(/--admin-login/.test(run.stdout), `mit Startpasswort fehlt die Sitzung: ${run.stdout}`);

    run = await toolAsync("app.mjs", ["--device", name, "--app", "probeapp", "--live"], env);
    assert(run.status === 0, `Live schalten fehlgeschlagen: ${run.stdout}${run.stderr}`);
    run = await toolAsync("app.mjs", ["--device", name, "--app", "probeapp", "--back"], env);
    assert(run.status === 0, `Zurückschalten fehlgeschlagen: ${run.stdout}${run.stderr}`);
    assert(gesehen.geschaltet.join(",") === "live,zurueck", `falsch geschaltet: ${gesehen.geschaltet}`);

    // Das Kit merkt sich, was es selbst an dieses Gerät geschickt hat. Ohne diese
    // Notiz schlug die Seite ohne --device danach wieder --check und --deploy vor.
    let merker = JSON.parse(readFileSync(stateFile, "utf8")).apps?.probeapp?.[name];
    assert(merker?.deployed?.version === "1.0.0", `der Teststand steht nicht im Merker: ${JSON.stringify(merker)}`);
    assert(merker?.live?.version === "0.9.0", `das Zurückschalten steht nicht im Merker: ${JSON.stringify(merker)}`);

    // Entfernen ist unumkehrbar: ohne die abgetippte Kennung passiert nichts.
    run = await toolAsync("app.mjs", ["--device", name, "--app", "probeapp", "--remove"], env);
    assert(run.status !== 0 && gesehen.entfernt === null, "--remove hat ohne Bestätigung entfernt");
    run = await toolAsync("app.mjs", ["--device", name, "--app", "probeapp", "--remove", "--confirm", "probeapp"], env);
    assert(run.status === 0 && gesehen.entfernt === "bestaetigung=probeapp", "die Rückfrage wird nicht durchgereicht");
    // Was es dort nicht mehr gibt, steht auch nicht mehr im Merker.
    merker = JSON.parse(readFileSync(stateFile, "utf8")).apps?.probeapp?.[name];
    assert(!merker?.deployed && !merker?.live, `die entfernte App steht noch im Merker: ${JSON.stringify(merker)}`);

    // Ein Manifest, das einen Ordner verspricht, den es nicht gibt: das Gerät
    // würde es abweisen, und das Kit sieht es vorher, ohne Paket und ohne Bau.
    const mitFlows = { ...MANIFEST, version: "1.1.0", flows: { verzeichnis: "flows" } };
    writeFileSync(join(quelle, "app.json"), JSON.stringify(mitFlows, null, 2));
    gesehen.paket = false;
    run = await toolAsync("app.mjs", ["--device", name, "--check", quelle], env);
    assert(run.status !== 0 && /verspricht/.test(run.stdout), "der versprochene Ordner fehlt und fällt nicht auf");
    run = await toolAsync("app.mjs", ["--device", name, "--deploy", quelle], env);
    assert(run.status !== 0 && !gesehen.paket, "ein Manifest ohne den versprochenen Ordner wurde eingespielt");

    // Ein leerer Ordner ist auch keine Lieferung.
    mkdirSync(join(quelle, "flows"), { recursive: true });
    run = await toolAsync("app.mjs", ["--device", name, "--check", quelle], env);
    assert(run.status !== 0 && /leer/.test(run.stdout), "ein leerer Ordner gilt als Lieferung");

    // Mit der Datei darin geht es durch, und sie liegt im Paket.
    writeFileSync(join(quelle, "flows", "bericht.md"), "---\nname: bericht\n---\n\nFasse zusammen.\n");
    run = await toolAsync("app.mjs", ["--device", name, "--check", quelle], env);
    assert(run.status === 0, `Manifest mit Flows abgelehnt: ${run.stdout}${run.stderr}`);
    run = await toolAsync("app.mjs", ["--device", name, "--deploy", quelle], env);
    assert(run.status === 0 && gesehen.paket, `Einspielen mit Flows fehlgeschlagen: ${run.stdout}${run.stderr}`);
    assert(gesehen.inhalt.includes("./flows/bericht.md"), `die Flow-Datei fehlt im Paket: ${gesehen.inhalt.join(", ")}`);

    // --base sticht die Akte: für den einen Versuch, der nicht hineingehört.
    writeFrontmatter(join(akte, "device.md"), { api_base: "https://127.0.0.1:1" });
    run = await toolAsync("app.mjs", ["--device", name, "--contract"], env);
    assert(run.status !== 0, "eine tote api_base wird nicht bemerkt");
    run = await toolAsync("app.mjs", ["--device", name, "--contract", "--base", base], env);
    assert(run.status === 0, `--base sticht die Akte nicht: ${run.stderr}${run.stdout}`);

    // Ein Manifest, das das Gerät abweisen würde, wird gar nicht erst geschickt.
    writeFileSync(join(quelle, "app.json"), JSON.stringify({ ...MANIFEST, version: "eins" }));
    gesehen.paket = false;
    run = await toolAsync("app.mjs", ["--device", name, "--deploy", quelle, "--base", base], env);
    assert(run.status !== 0 && !gesehen.paket, "ein ungültiges Manifest wurde eingespielt");

    // Der Weg, den /app geht: nicht ein Ordner, sondern eine App aus apps/.
    // Geschickt wird ihr Bau, und nichts, was daneben liegt.
    mkdirSync(join(appDir, "frontend"), { recursive: true });
    mkdirSync(join(appDir, "plans", "offen"), { recursive: true });
    writeFileSync(join(appDir, "app.json"), JSON.stringify({ ...MANIFEST, frontend: { verzeichnis: "frontend" } }, null, 2));
    writeFileSync(join(appDir, "README.md"), "# Probe\n");
    writeFileSync(join(appDir, "frontend", "index.html"), "<p>Probe</p>\n");
    writeFileSync(join(appDir, "plans", "offen", "2026-01-01-probe.md"), "---\nstand: offen\n---\n");
    // Ohne aktiven Plan baut das Werkzeug nicht, und es sagt, welcher Plan
    // offen liegt und wie er aktiv wird. Das Wissen verlangt es so.
    const ohnePlan = await toolAsync("app.mjs", ["--app", "probeapp", "--build"], env);
    assert(
      ohnePlan.status !== 0 && /--plan-aktiv 2026-01-01-probe\.md/.test(ohnePlan.stderr + ohnePlan.stdout) && /--no-plan/.test(ohnePlan.stderr + ohnePlan.stdout),
      `ein Bau ohne aktiven Plan lief oder sagt nicht, wie weiter: ${ohnePlan.stdout}${ohnePlan.stderr}`
    );
    assert(!existsSync(join(appDir, "build")), "ohne Plan entstand trotzdem ein Bau");
    assert((await toolAsync("app.mjs", ["--app", "probeapp", "--build", "--no-plan"], env)).status === 0, "Bau der App fehlgeschlagen");
    gesehen.paket = false;
    gesehen.inhalt = [];
    run = await toolAsync("app.mjs", ["--device", name, "--app", "probeapp", "--deploy", "--base", base], env);
    assert(run.status === 0 && gesehen.paket, `Einspielen aus der App-Akte fehlgeschlagen: ${run.stdout}${run.stderr}`);
    assert(gesehen.inhalt.includes("./frontend/index.html"), `die Oberfläche fehlt im Paket: ${gesehen.inhalt.join(", ")}`);
    assert(
      !gesehen.inhalt.some((eintrag) => /plans|README/.test(eintrag)),
      `die Arbeit an der App ging mit ins Paket: ${gesehen.inhalt.join(", ")}`
    );

    // Ins Paket geht der BAU der Oberfläche und nicht ihr Quelltext. Der
    // Kontrakt sagt es als Regel ("Das Frontend ist fertig gebaut, das Gerät
    // liefert aus"), geprüft hat es bis E13 niemand: am Gerät bekam der Browser
    // dann eine index.html, die auf /src/main.tsx zeigt, und der Mensch im
    // Rahmen sah eine leere Seite.
    writeFileSync(join(appDir, "frontend", "package.json"), JSON.stringify({ name: "probe-frontend" }));
    mkdirSync(join(appDir, "frontend", "src"), { recursive: true });
    writeFileSync(join(appDir, "frontend", "src", "main.tsx"), "// Quelltext\n");
    assert((await toolAsync("app.mjs", ["--app", "probeapp", "--build", "--no-plan"], env)).status === 0, "Bau ohne Bauskript fehlgeschlagen");
    run = await toolAsync("app.mjs", ["--device", name, "--app", "probeapp", "--check", "--base", base], env);
    assert(run.status !== 0, "der Quelltext im Paket ging als Bau durch");
    assert(/package.json/.test(run.stdout), `--check sagt nicht, woran es liegt: ${run.stdout}`);
    gesehen.paket = false;
    run = await toolAsync("app.mjs", ["--device", name, "--app", "probeapp", "--deploy", "--base", base], env);
    assert(run.status !== 0 && !gesehen.paket, "der Quelltext wurde eingespielt");
    rmSync(join(appDir, "frontend", "package.json"), { force: true });
    rmSync(join(appDir, "frontend", "src"), { recursive: true, force: true });
    assert((await toolAsync("app.mjs", ["--app", "probeapp", "--build", "--no-plan"], env)).status === 0, "Bau nach dem Aufräumen fehlgeschlagen");

    // Eine App mit Backend bekommt die Vereinbarung dieses Geraets ins Paket:
    // unter welchen Namen es ihr Adresse und Schluessel in den Container legt,
    // in welcher Kopfzeile der Schluessel mitgeht, welche Wege es dafuer fuehrt.
    // Ohne sie muesste die App raten, und geraten hat sie bis zum 29.08.2026.
    mkdirSync(join(appDir, "backend"), { recursive: true });
    writeFileSync(join(appDir, "backend", "server.mjs"), "// Probe\n");
    cpSync(
      join(ROOT, ".ara", "templates", "app", "backend", "arasul.json"),
      join(appDir, "backend", "arasul.json")
    );
    writeFileSync(
      join(appDir, "app.json"),
      JSON.stringify(
        {
          ...MANIFEST,
          frontend: { verzeichnis: "frontend" },
          backend: { image: "arasul-probeapp:1.0.0", bauen: { verzeichnis: "backend" } },
        },
        null,
        2
      )
    );
    assert((await toolAsync("app.mjs", ["--app", "probeapp", "--build", "--no-plan"], env)).status === 0, "Bau mit Backend fehlgeschlagen");

    // --check sagt es vorher, ohne irgendetwas zu schreiben.
    run = await toolAsync("app.mjs", ["--device", name, "--app", "probeapp", "--check", "--base", base], env);
    assert(run.status === 0, `Pruefung mit Backend fehlgeschlagen: ${run.stdout}${run.stderr}`);
    assert(/ARASUL_BASIS_URL/.test(run.stdout), `--check nennt die Umgebungsnamen des Geraets nicht: ${run.stdout}`);
    const vorDemEinspielen = JSON.parse(readFileSync(join(appDir, "build", "backend", "arasul.json"), "utf8"));
    assert(vorDemEinspielen.kopf === null, "--check hat die Vereinbarung schon geschrieben");

    gesehen.paket = false;
    gesehen.inhalt = [];
    run = await toolAsync("app.mjs", ["--device", name, "--app", "probeapp", "--deploy", "--base", base], env);
    assert(run.status === 0 && gesehen.paket, `Einspielen mit Backend fehlgeschlagen: ${run.stdout}${run.stderr}`);
    assert(
      gesehen.inhalt.includes("./backend/arasul.json"),
      `die Vereinbarung fehlt im Paket: ${gesehen.inhalt.join(", ")}`
    );
    const vereinbarung = JSON.parse(readFileSync(join(appDir, "build", "backend", "arasul.json"), "utf8"));
    assert(
      vereinbarung.umgebung.basis === "ARASUL_BASIS_URL" && vereinbarung.umgebung.schluessel === "ARASUL_APP_KEY",
      `die Umgebungsnamen kommen nicht aus dem Kontrakt: ${JSON.stringify(vereinbarung.umgebung)}`
    );
    assert(vereinbarung.kopf === "X-API-Key", `der Schluesselkopf kommt nicht aus dem Kontrakt: ${vereinbarung.kopf}`);
    assert(
      vereinbarung.wege.flow_starten?.pfad === "/api/v1/external/flows/{flow}/run",
      `der Weg zum Flow fehlt in der Vereinbarung: ${JSON.stringify(vereinbarung.wege)}`
    );
    assert(!JSON.stringify(vereinbarung).includes("aras_"), "in der Vereinbarung steht ein Schluessel");

    return "Kontrakt, Prüfung, Flows im Paket, Bau einer App, Vereinbarung im Paket, Teststand, live, zurück, entfernen";
  } finally {
    server.close();
    rmSync(work, { recursive: true, force: true });
    rmSync(akte, { recursive: true, force: true });
    rmSync(appDir, { recursive: true, force: true });
    if (savedState === null) rmSync(stateFile, { force: true });
    else writeFileSync(stateFile, savedState);
  }
});

await checkAsync("Ein selbst installiertes Gerät kennt sein eigenes Zertifikat", async () => {
  // Fund 3 des zweiten Fremdtests am 28.08.2026. Nach `--install arasul` trug
  // die Akte `tls:` leer, und der erste Aufruf gegen die Schnittstelle scheiterte
  // an SELF_SIGNED_CERT_IN_CHAIN. Das Gerät trägt eine eigene Geräte-CA, und das
  // Kit hat zugesehen, wie sie entstanden ist: es weiß hier Bescheid.
  const work = mkdtempSync(join(tmpdir(), "ara-tls-"));
  const keyFile = join(work, "schluessel.pem");
  const certFile = join(work, "zertifikat.pem");
  const gemacht = spawnSync(
    "openssl",
    ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", keyFile, "-out", certFile,
      "-days", "1", "-subj", "/CN=127.0.0.1", "-addext", "subjectAltName=IP:127.0.0.1"],
    { encoding: "utf8" }
  );
  if (gemacht.status !== 0) {
    rmSync(work, { recursive: true, force: true });
    return "übersprungen, openssl stellt hier kein Zertifikat aus";
  }

  const name = "selftest-tls";
  const akte = join(ROOT, "devices", name);
  const server = createHttpsServer(
    { key: readFileSync(keyFile), cert: readFileSync(certFile) },
    (request, response) => {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ data: KONTRAKT }));
    }
  );
  await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
  const base = `https://127.0.0.1:${server.address().port}`;
  const env = { ARASUL_KEY_SELFTEST_TLS: "aras_selbsttest" };

  mkdirSync(akte, { recursive: true });
  cpSync(join(ROOT, ".ara", "templates", "device.md"), join(akte, "device.md"));
  writeFrontmatter(join(akte, "device.md"), {
    name,
    address: "127.0.0.1:1",
    api_base: base,
    verdict: "supported",
    arasul: "found",
    api_key_ref: "ARASUL_KEY_SELFTEST_TLS",
  });

  try {
    // So sah es beim Fremdtest aus: die Akte schweigt zum Zertifikat.
    let run = await toolAsync("app.mjs", ["--device", name, "--contract"], env);
    assert(run.status !== 0, "ein selbst ausgestelltes Zertifikat wurde stillschweigend angenommen");
    assert(/tls: selfsigned/.test(run.stderr), `der Weg heraus fehlt in der Meldung: ${run.stderr}`);

    // Mit dem Eintrag geht es, und nur für dieses eine Gerät.
    writeFrontmatter(join(akte, "device.md"), { tls: "selfsigned" });
    run = await toolAsync("app.mjs", ["--device", name, "--contract"], env);
    assert(run.status === 0, `mit tls: selfsigned scheitert der Kontrakt: ${run.stdout}${run.stderr}`);

    // Und das Werkzeug trägt den Eintrag nach der eigenen Installation selbst
    // ein, statt den Partner in diesen Fehler laufen zu lassen.
    const werkzeug = readFileSync(join(ROOT, ".ara", "tools", "device.mjs"), "utf8");
    assert(/changes\.tls = "selfsigned"/.test(werkzeug), "device.mjs setzt tls nach der Installation nicht");
    const vorlage = readFrontmatter(join(ROOT, ".ara", "templates", "device.md"));
    assert("tls" in vorlage.fields, "die Vorlage der Geräteakte kennt das Feld tls nicht");
    return "ohne Eintrag abgewiesen, mit Eintrag angenommen";
  } finally {
    server.close();
    rmSync(akte, { recursive: true, force: true });
    rmSync(work, { recursive: true, force: true });
  }
});

// --- Doku-Selbsttest ---------------------------------------------------------

check("Routen im Wissen werden gefunden, auch die ohne Verb", () => {
  const files = [
    {
      file: "probe.md",
      text: [
        "Ein Satz mit `GET /api/v1/external/models` darin.",
        "",
        "```",
        "POST /api/v1/external/flows/<name>/run",
        "GET  /apps/<id>/api/me",
        "DELETE /api/v1/external/apps/:id?bestaetigung=<id>",
        "```",
        "",
        "Und ein Weg ohne Verb: `/api/backup/status`.",
        "Kein Weg: /etc/hosts und /arasul/flows.",
      ].join("\n"),
    },
    { file: "zweite.md", text: "Noch einmal `GET /api/v1/external/models`, andere Datei." },
  ];
  const routes = collectRoutes(files);
  const pfade = routes.map((r) => `${r.verb} ${r.path}`);
  assert(pfade.includes("GET /api/v1/external/models"), `nicht gefunden: ${pfade.join(", ")}`);
  assert(pfade.includes("POST /api/v1/external/flows/:wert/run"), "der Platzhalter wird nicht vereinheitlicht");
  assert(pfade.includes("GET /apps/:wert/api/me"), "ein Weg unter /apps fehlt");
  assert(pfade.includes("DELETE /api/v1/external/apps/:id"), "die Frage am Pfad wird nicht abgeschnitten");
  assert(!pfade.some((p) => /etc\/hosts|arasul\/flows/.test(p)), `ein Dateipfad gilt als Route: ${pfade.join(", ")}`);
  assert(routes.find((r) => r.path === "/api/v1/external/models").files.length === 2, "die zweite Fundstelle fehlt");

  const bare = bareApiPaths(files);
  assert(bare.length === 1 && bare[0].path === "/api/backup/status", `ohne Verb falsch gelesen: ${JSON.stringify(bare)}`);
  assert(callable("/apps/:wert/api/me").split("/")[2].length > 0, "ein Platzhalter wird nicht gefuellt");
  return `${routes.length} Routen, 1 ohne Verb`;
});

check("Jede Route bekommt den Weg, auf dem sie zu pruefen ist", () => {
  const lesen = planFor({ verb: "GET", path: "/api/v1/external/apps/:id" }, KONTRAKT);
  assert(lesen.how === "kontrakt", "ein Weg mit einem Wert darin wird trotzdem gerufen");
  const schreiben = planFor({ verb: "POST", path: "/api/v1/external/apps" }, KONTRAKT);
  assert(schreiben.how === "kontrakt", "ein veraendernder Weg wird gerufen");
  const kontrakt = planFor({ verb: "GET", path: "/api/v1/external/contract" }, KONTRAKT);
  assert(kontrakt.how === "gerufen", "ein lesender Weg ohne Wert wird nicht gerufen");
  const sitzung = planFor({ verb: "GET", path: "/api/irgendwas" }, KONTRAKT);
  assert(sitzung.how === "ohne-schluessel", "ein Weg der Oberflaeche wird mit Schluessel gerufen");
  const fremd = planFor({ verb: "GET", path: `${EXTERNAL_PREFIX}/gibtsnicht` }, KONTRAKT);
  assert(fremd.kind === "extern-unbekannt", "ein unbekannter aeusserer Weg faellt nicht auf");

  assert(judgeRoute(kontrakt, { status: 200 }).state === "ok", "200 gilt nicht als Beleg");
  assert(judgeRoute(kontrakt, { status: 404 }).state === "fehlt", "404 gilt nicht als Gegenbeleg");
  assert(judgeRoute(kontrakt, { status: 0, error: { message: "tot" } }).state === "unklar", "keine Antwort gilt als Urteil");
  assert(judgeRoute(sitzung, { status: 401 }).state === "ok", "eine Abweisung gilt nicht als Beleg");
  assert(judgeRoute(fremd, null).state === "fehlt", "ein Weg ausserhalb des Kontrakts gilt als vorhanden");
  assert(judgeRoute(schreiben, null).state === "ok", "der Kontrakt selbst gilt nicht als Beleg");

  // Der Kontrakt selbst ist nie "nicht beschrieben": ihn kennt das Kit
  // auswendig, und kein Verfahren fuehrt ihn als Route auf.
  const offen = undocumented(KONTRAKT, []);
  assert(offen.length === KONTRAKT.endpunkte.length - 1, `nicht beschriebene Endpunkte falsch gezaehlt: ${offen.length}`);
  assert(!offen.some((e) => /contract/.test(e.path)), "der Kontrakt selbst gilt als nicht beschrieben");
});

await checkAsync("check-docs.mjs prueft jede Route des Wissens am Geraet", async () => {
  // Gegen ein gespieltes Geraet, dessen Kontrakt genau die aeusseren Routen
  // nennt, die im Wissen dieses Kits stehen. Damit haengt der Test an keinem
  // Produktwert: was das Wissen nennt, wird hier zur Erwartung, und das
  // Werkzeug muss beides zur Deckung bringen.
  const name = "selftest-doku";
  const akte = join(ROOT, "devices", name);
  const knowledge = join(ROOT, ".ara", "knowledge");
  const files = readdirSync(knowledge)
    .filter((datei) => datei.endsWith(".md"))
    .map((datei) => ({ file: datei, text: readFileSync(join(knowledge, datei), "utf8") }));
  const routes = collectRoutes(files);
  const aussen = routes.filter((route) => route.path.startsWith(`${EXTERNAL_PREFIX}/`));
  const innen = routes.filter((route) => !route.path.startsWith(`${EXTERNAL_PREFIX}/`));
  assert(aussen.length > 0 && innen.length > 0, "das Wissen nennt nicht beide Arten von Weg");

  // Was das Geraet weglaesst: ein aeusserer Weg fehlt in seinem Kontrakt, ein
  // Weg der Oberflaeche antwortet mit 404. Beides muss auffallen, und nur das.
  const fehltAussen = aussen[aussen.length - 1];
  const fehltInnen = innen[innen.length - 1];
  // Die beiden Luecken sind umschaltbar: derselbe Server spielt erst das Geraet
  // mit zwei Luecken und danach das heile.
  const luecke = { aussen: fehltAussen, innen: fehltInnen };
  const kontrakt = { ...KONTRAKT, endpunkte: [] };
  const kontraktSchreiben = () => {
    kontrakt.endpunkte = [
      { verb: "GET", pfad: "/api/v1/external/contract", bereich: null, was: "Dieser Kontrakt" },
      ...aussen
        .filter((route) => route !== luecke.aussen)
        .map((route) => ({ verb: route.verb, pfad: route.path, bereich: null, was: "aus dem Wissen des Kits" })),
    ];
  };
  kontraktSchreiben();

  const gesehen = [];
  const server = createServer((request, response) => {
    const pfad = request.url.split("?")[0];
    gesehen.push(`${request.method} ${pfad}${request.headers["x-api-key"] ? " +schluessel" : ""}`);
    const antwort = (status, body) => {
      response.writeHead(status, { "Content-Type": "application/json" });
      response.end(JSON.stringify(body));
    };
    if (pfad === "/api/v1/external/contract") {
      if (request.headers["x-api-key"] !== "aras_selbsttest") return antwort(401, { error: { message: "kein Schluessel" } });
      return antwort(200, { data: kontrakt });
    }
    // Ein Weg der Oberflaeche weist ohne Ausweis ab, das ist der Beleg.
    if (innen.some((route) => callable(route.path) === pfad && route !== luecke.innen)) {
      return antwort(401, { error: { message: "Anmeldung noetig" } });
    }
    if (aussen.some((route) => callable(route.path) === pfad && route !== luecke.aussen)) {
      return antwort(200, { data: {} });
    }
    antwort(404, { error: { message: "kennt dieses Geraet nicht" } });
  });
  await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
  const base = `http://127.0.0.1:${server.address().port}`;
  const env = { ARASUL_KEY_SELFTEST: "aras_selbsttest" };

  mkdirSync(akte, { recursive: true });
  cpSync(join(ROOT, ".ara", "templates", "device.md"), join(akte, "device.md"));
  writeFrontmatter(join(akte, "device.md"), {
    name,
    address: "127.0.0.1:1",
    api_base: base,
    verdict: "supported",
    arasul: "found",
    api_key_ref: "ARASUL_KEY_SELFTEST",
  });

  try {
    // Ohne Geraet: die Liste, und kein Aufruf.
    let run = await toolAsync("check-docs.mjs", [], env);
    assert(run.status === 0, `Liste fehlgeschlagen: ${run.stderr}`);
    assert(new RegExp(`${routes.length} Routen`).test(run.stdout), `die Zahl stimmt nicht: ${run.stdout.split("\n")[0]}`);

    run = await toolAsync("check-docs.mjs", ["--device", name, "--json"], env);
    const lage = JSON.parse(run.stdout);
    const urteil = new Map(lage.results.map((r) => [`${r.verb} ${r.path}`, r]));
    assert(urteil.size === routes.length, `nicht jede Route wurde geprueft: ${urteil.size} von ${routes.length}`);

    const fehlend = lage.results.filter((r) => r.state === "fehlt").map((r) => `${r.verb} ${r.path}`);
    assert(
      fehlend.length === 2 &&
        fehlend.includes(`${fehltAussen.verb} ${fehltAussen.path}`) &&
        fehlend.includes(`${fehltInnen.verb} ${fehltInnen.path}`),
      `falsch beurteilt, gemeldet fehlen: ${fehlend.join(", ")}`
    );
    assert(run.status === 1, "eine fehlende Route beendet den Lauf nicht mit einem Fehler");

    // An der aeusseren Schnittstelle wurde nichts gerufen, was etwas veraendert:
    // dort haelt das Kit den Schluessel, und ein Deploy oder ein Entfernen als
    // Nebenwirkung einer Doku-Pruefung waere ein Schaden.
    const mitSchluessel = gesehen.filter((zeile) => zeile.includes("+schluessel"));
    assert(
      mitSchluessel.every((zeile) => zeile.startsWith("GET ")),
      `mit Schluessel wurde etwas Veraenderndes gerufen: ${mitSchluessel.join(", ")}`
    );
    assert(
      !gesehen.some((zeile) => !zeile.startsWith("GET ") && zeile.includes(EXTERNAL_PREFIX)),
      `an der aeusseren Schnittstelle wurde veraendernd gerufen: ${gesehen.join(", ")}`
    );
    // Ein Weg der Oberflaeche bekommt keinen Schluessel: das Kit hat dort keine
    // Sitzung, und die Abweisung ist genau der Beleg, den es sucht.
    for (const route of innen) {
      const zeile = gesehen.find((z) => z.startsWith(`${route.verb} ${callable(route.path)}`));
      assert(zeile, `${route.verb} ${route.path} wurde gar nicht gerufen`);
      assert(!zeile.includes("+schluessel"), `${route.path} wurde mit Schluessel gerufen: ${zeile}`);
    }

    // Ohne die beiden Luecken ist alles gruen.
    luecke.aussen = null;
    luecke.innen = null;
    kontraktSchreiben();
    run = await toolAsync("check-docs.mjs", ["--device", name], env);
    assert(run.status === 0, `heiles Geraet wird gemeldet: ${run.stdout}`);
    assert(/Alle \d+ Routen gibt es an diesem Gerät/.test(run.stdout), `kein gruener Satz: ${run.stdout}`);
    return `${routes.length} Routen, ${aussen.length} ueber den Kontrakt, ${innen.length} ohne Ausweis`;
  } finally {
    server.close();
    rmSync(akte, { recursive: true, force: true });
  }
});

// --- Leistungsbeschreibung am Geraet -----------------------------------------

await checkAsync("Die Leistungsbeschreibung bekommt ihre Werte vom Geraet", async () => {
  // Das Papier wird unterschrieben. Geprueft wird darum zweierlei: dass die
  // gemessenen Werte wirklich hineinkommen, und dass ein Feld, zu dem das Geraet
  // nichts sagt, leer bleibt und mit einer Begruendung genannt wird.
  const name = "selftest-papier";
  const akte = join(ROOT, "devices", name);
  const datei = join(akte, `leistungsbeschreibung-${today()}.md`);

  // Zwei Geraete in einem: erst eines, das Modelle und Apps aufzaehlt, dann
  // eines, das beides nicht kennt.
  const reich = {
    ...KONTRAKT,
    arasul: "9.9.9-gespielt",
    endpunkte: [
      ...KONTRAKT.endpunkte,
      { verb: "GET", pfad: "/api/v1/external/apps", bereich: "app:deploy", was: "Welche Apps stehen auf dem Geraet" },
      { verb: "GET", pfad: "/api/v1/external/models", bereich: "llm:status", was: "Welche Modelle am Geraet sind" },
    ],
  };
  const arm = { ...KONTRAKT, arasul: "9.9.9-gespielt" };
  const lage = { kontrakt: reich };

  const server = createServer((request, response) => {
    const pfad = request.url.split("?")[0];
    const antwort = (status, body) => {
      response.writeHead(status, { "Content-Type": "application/json" });
      response.end(JSON.stringify(body));
    };
    if (request.headers["x-api-key"] !== "aras_selbsttest") {
      return antwort(401, { error: { message: "kein Schluessel" } });
    }
    if (pfad === "/api/v1/external/contract") return antwort(200, { data: lage.kontrakt });
    if (pfad === "/api/v1/external/models" && lage.kontrakt === reich) {
      return antwort(200, { data: { models: [{ name: "modell-gross:q4" }, "modell-klein:q8"] } });
    }
    if (pfad === "/api/v1/external/apps" && lage.kontrakt === reich) {
      return antwort(200, { data: [{ id: "probeapp", live: { version: "1.2.0" }, test: { version: "1.3.0" } }] });
    }
    antwort(404, { error: { message: "kennt dieses Geraet nicht" } });
  });
  await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
  const base = `http://127.0.0.1:${server.address().port}`;
  const env = { ARASUL_KEY_SELFTEST: "aras_selbsttest" };

  mkdirSync(akte, { recursive: true });
  cpSync(join(ROOT, ".ara", "templates", "device.md"), join(akte, "device.md"));
  writeFrontmatter(join(akte, "device.md"), {
    name,
    model: "Gespieltes Geraet A1",
    serial: "SN-0815",
    address: "127.0.0.1:1",
    api_base: base,
    verdict: "supported",
    arasul: "found",
    api_key_ref: "ARASUL_KEY_SELFTEST",
  });

  try {
    let run = await toolAsync("service-description.mjs", ["--device", name, "--json"], env);
    assert(run.status === 0, `Erhebung fehlgeschlagen: ${run.stderr}${run.stdout}`);
    const ergebnis = JSON.parse(run.stdout);
    assert(ergebnis.measured.arasul === "9.9.9-gespielt", "der Softwarestand kommt nicht vom Geraet");
    assert(ergebnis.measured.kontrakt === KIT_CONTRACT_VERSION, "die Kontraktfassung fehlt");
    assert(ergebnis.measured.models.join(",") === "modell-gross:q4,modell-klein:q8", `Modelle falsch gelesen: ${ergebnis.measured.models}`);
    assert(ergebnis.open.length === 0, `unnoetig offen: ${ergebnis.open.map((o) => o.name).join(", ")}`);

    const papier = readFileSync(datei, "utf8");
    assert(/Softwarestand: 9\.9\.9-gespielt/.test(papier), "der Softwarestand steht nicht im Papier");
    assert(new RegExp(`Kontraktfassung des Geräts: ${KIT_CONTRACT_VERSION}`).test(papier), "die Kontraktfassung steht nicht im Papier");
    assert(/Sprachmodell bei der Übergabe: \*\*modell-gross:q4/.test(papier), "das Modell steht nicht in Abschnitt 5");
    assert(/installierte Erweiterungen: \*\*probeapp \(live 1\.2\.0\)/.test(papier), "die App steht nicht in Abschnitt 6");
    assert(/Gemessen am \d{4}-\d{2}-\d{2}/.test(papier), "im Papier steht nicht, wann gemessen wurde");
    assert(/ERHEBUNG .*Kit-Schlüssel ARASUL_KEY_SELFTEST/.test(papier), "die Herkunft der Werte fehlt");
    assert(!/aras_selbsttest/.test(papier), "der Schluessel steht im Papier");
    assert(/\{Stufe\}/.test(papier), "der Reifegrad wurde gefuellt, obwohl ihn niemand gemessen hat");

    // Eine zweite Fassung desselben Tages ersetzt die erste nicht von allein:
    // in einem Streit zaehlt die Fassung, die bei Vertragsschluss galt.
    run = await toolAsync("service-description.mjs", ["--device", name], env);
    assert(run.status !== 0 && /liegt schon/.test(run.stderr), "eine vorhandene Fassung wird ueberschrieben");

    // Ein Geraet, das weder Modelle noch Apps aufzaehlt: beide Felder bleiben
    // Platzhalter, und es steht dabei, warum.
    lage.kontrakt = arm;
    run = await toolAsync("service-description.mjs", ["--device", name, "--json", "--force"], env);
    assert(run.status === 0, `zweite Erhebung fehlgeschlagen: ${run.stderr}`);
    const knapp = JSON.parse(run.stdout);
    const offen = new Map(knapp.open.map((o) => [o.name, o.why]));
    assert(offen.has("Sprachmodell"), "ohne Modellauskunft wird trotzdem etwas eingetragen");
    assert(offen.has("Installierte Erweiterungen"), "ohne Auskunft ueber Apps wird trotzdem etwas eingetragen");
    assert(/keinen Endpunkt|nicht/.test(offen.get("Sprachmodell")), `keine Begruendung: ${offen.get("Sprachmodell")}`);
    const knappesPapier = readFileSync(datei, "utf8");
    assert(/\{Kennung und Fassung\}/.test(knappesPapier), "ein ungemessener Wert wurde erfunden");
    assert(!/\*\*keine\*\*/.test(knappesPapier), "eine leere Antwort wurde zu einem zugesagten keine");
    return "gemessen, geschrieben, Herkunft je Wert, Ungemessenes bleibt offen";
  } finally {
    server.close();
    rmSync(akte, { recursive: true, force: true });
  }
});

// --- Die Akte einer App ------------------------------------------------------

check("Eine App entsteht aus der Vorlage und kennt ihren nächsten Schritt", () => {
  const stateFile = join(ROOT, ".ara", "state.json");
  const savedState = existsSync(stateFile) ? readFileSync(stateFile, "utf8") : null;
  const name = "selftest-app";
  const dir = join(ROOT, "apps", name);
  try {
    let run = tool("app.mjs", ["--app", name, "--new", "--titel", "Probe"]);
    assert(run.status === 0, `Anlegen fehlgeschlagen: ${run.stderr}${run.stdout}`);
    for (const datei of [
      "app.json",
      "README.md",
      "backend/Dockerfile",
      "backend/kern/vorgaenge.mjs",
      "backend/ablage/vorgaenge.mjs",
      "backend/ablage/migrationen/001-vorgaenge.sql",
      "flows/freigabe.md",
      "frontend/package.json",
      "frontend/tsconfig.json",
      "frontend/src/app.tsx",
      // Gespiegelt: die Bibliothek, ihre Werte und ihr Stempel. Alle drei
      // Saetze, und nicht nur die oberste Ebene.
      "frontend/src/marken/index.ts",
      "frontend/src/marken/marken.css",
      "frontend/src/marken/theme.css",
      "frontend/src/marken/primitive/button.tsx",
      "frontend/src/marken/muster/Datenliste.tsx",
      "frontend/src/marken/mirror.json",
    ]) {
      assert(existsSync(join(dir, datei)), `aus der Vorlage fehlt: ${datei}`);
    }

    // Die Bibliothek kommt vollstaendig mit, und der Waechter erkennt sie
    // wieder. Eine App, die nur die Haelfte der Bausteine traegt, faellt sonst
    // erst beim Bau auf, und der laeuft nicht in jedem Klon.
    const bibliothek = readLibrary(join(dir, "frontend", "src", "marken"));
    assert(bibliothek?.fassung, "die Kopie der Bibliothek nennt keine Fassung");
    const satz = sets(bibliothek);
    assert(satz.bausteine >= 6, `nur ${satz.bausteine} Bausteine in der Kopie`);
    assert(satz.primitive >= 40, `nur ${satz.primitive} Primitive in der Kopie`);
    assert(satz.muster >= 9, `nur ${satz.muster} Muster in der Kopie`);
    assert(classesWithoutRule(bibliothek).length === 0, "ein Baustein benutzt eine Klasse ohne Regel");
    assert(unreachable(bibliothek).length === 0, `von index.ts fuehrt kein Weg zu ${unreachable(bibliothek).join(", ")}`);
    const stempel = stampOf(join(dir, "frontend", "src", "marken"));
    assert(stempel?.fassung === bibliothek.fassung, "der Stempel nennt eine andere Fassung als die Bibliothek");
    for (const [datei, text] of bibliothek.files) {
      assert(stempel.dateien[datei] === hashOf(text), `der Stempel passt nicht zu ${datei}`);
    }
    // Die Bibliothek wird mit der App uebersetzt, also muss die App holen, was
    // sie braucht. Sonst faellt der Bau erst an dem Import, der ins Leere zeigt.
    const paket = JSON.parse(readFileSync(join(dir, "frontend", "package.json"), "utf8"));
    assert(
      dependencyFindings(bibliothek, paket).length === 0,
      `die package.json der App kennt nicht alles: ${dependencyFindings(bibliothek, paket).join(" | ")}`
    );
    assert(tool("marken.mjs", []).status === 0, "der Waechter faellt ueber die frisch angelegte App");
    const manifest = JSON.parse(readFileSync(join(dir, "app.json"), "utf8"));
    assert(manifest.id === name && manifest.name === "Probe", "die Platzhalter der Vorlage wurden nicht ersetzt");
    // Auf welcher Fassung die App steht, sagt sie im Manifest (Kontrakt 4).
    assert(
      manifest.marken === bibliothek.fassung,
      `app.json nennt marken ${manifest.marken}, die Bibliothek steht auf ${bibliothek.fassung}`
    );
    assert(
      !/\{\{[a-z]+\}\}/.test(readFileSync(join(dir, "README.md"), "utf8")),
      "in der README steht noch ein Platzhalter"
    );

    // Zweimal dieselbe App gibt es nicht, und der Ordner bleibt, wie er ist.
    run = tool("app.mjs", ["--app", name, "--new"]);
    assert(run.status !== 0 && /gibt es schon/.test(run.stderr), "eine App wurde zweimal angelegt");

    // Der Plan: einer aktiv, nicht zwei.
    assert(tool("app.mjs", ["--app", name, "--plan", "Erste Fassung"]).status === 0, "Plan nicht angelegt");
    assert(tool("app.mjs", ["--app", name, "--plan", "Zweite Fassung"]).status === 0, "zweiter Plan nicht angelegt");
    const offen = readdirSync(join(dir, "plans", "offen"));
    assert(offen.length === 2, `Pläne liegen nicht unter offen/: ${offen.join(", ")}`);
    assert(tool("app.mjs", ["--app", name, "--plan-aktiv", offen[0]]).status === 0, "Plan nicht aktiv gesetzt");
    run = tool("app.mjs", ["--app", name, "--plan-aktiv", offen[1]]);
    assert(run.status !== 0 && /Höchstens ein Plan/.test(run.stderr), "zwei Pläne wurden aktiv");
    const { fields } = readFrontmatter(join(dir, "plans", "aktiv", offen[0]));
    assert(fields.stand === "aktiv", "der Stand im Frontmatter wandert nicht mit");

    // Die Lage: der nächste Schritt ist der Bau, und die Vorlage taugt für keinen
    // Vorschlag, den es nicht gibt.
    run = tool("app.mjs", ["--app", name, "--json"]);
    const lage = JSON.parse(run.stdout);
    assert(lage.plans.aktiv.length === 1 && lage.plans.offen.length === 1, "die Lage zählt die Pläne falsch");
    assert(!lage.build.exists, "ein Bau ohne Bau");
    assert(
      lage.steps.some((s) => /--build/.test(s.wie || "")),
      `der Bau wird nicht vorgeschlagen: ${JSON.stringify(lage.steps)}`
    );

    // Ohne Bau wird nichts eingespielt, auch nicht an ein Gerät, das antwortet.
    run = tool("app.mjs", ["--device", "gibtsnicht", "--app", name, "--deploy"]);
    assert(run.status !== 0, "ohne Bau wurde eingespielt");
    return "anlegen, Pläne, Lage";
  } finally {
    rmSync(dir, { recursive: true, force: true });
    if (savedState === null) rmSync(stateFile, { force: true });
    else writeFileSync(stateFile, savedState);
  }
});

check("Die Vorlage der App hält den Standard der Bibliothek", () => {
  // Die Regel, die das Kit an jede App hält, muss die Vorlage selbst halten:
  // eine Vorlage mit eigener Farbe wäre die Anleitung zum Verstoß. `scaffold`
  // erlaubt genau eines, den Platzhalter {{marken}}, den --new füllt.
  const template = join(ROOT, ".ara", "templates", "app");
  const befunde = standardFindings(template, { scaffold: true });
  assert(befunde.length === 0, `die Vorlage steht neben der Bibliothek: ${befunde.join(" | ")}`);
  return "keine eigene Farbe, keine Palettenklasse, kein eigenes Primitiv";
});

check("Eine App neben der Bibliothek wird rot, ein fremder Container nicht", () => {
  // Ohne Zwang sehen die Apps eines Partners nach drei Monaten alle anders
  // aus. Das Gerät vergleicht das Feld `marken` ausdrücklich nicht, der
  // Wächter des Produkts prüft nur die Shell: gehalten wird der Standard beim
  // Bauen mit dem Kit, und dass er hält, steht hier. Jede Verstoßart einmal,
  // an einer Kopie der Vorlage, und die Verdrahtung über --build.
  const stateFile = join(ROOT, ".ara", "state.json");
  const savedState = existsSync(stateFile) ? readFileSync(stateFile, "utf8") : null;
  const name = "selftest-standard";
  const dir = join(ROOT, "apps", name);
  try {
    let run = tool("app.mjs", ["--app", name, "--new", "--titel", "Standardprobe"]);
    assert(run.status === 0, `Anlegen fehlgeschlagen: ${run.stderr}${run.stdout}`);
    assert(standardFindings(dir).length === 0, `die frische App verstößt schon: ${standardFindings(dir).join(" | ")}`);

    // Ein Hex-Wert außerhalb von theme.css, in einer eigenen Regel der App.
    const stil = join(dir, "frontend", "src", "stil.css");
    const stilVorher = readFileSync(stil, "utf8");
    writeFileSync(stil, `${stilVorher}\n.eigene { color: #e11d48; }\n`);
    let befunde = standardFindings(dir);
    assert(befunde.some((b) => /#e11d48/.test(b) && /theme\.css/.test(b)), `der Hex-Wert fällt nicht auf: ${befunde.join(" | ")}`);
    // Im Kommentar ist derselbe Wert ein Beispiel und kein Verstoß.
    writeFileSync(stil, `${stilVorher}\n/* kein Verstoß: #e11d48 */\n`);
    assert(standardFindings(dir).length === 0, "ein Hex-Wert im Kommentar wird rot");
    writeFileSync(stil, stilVorher);

    // Palettenklasse, eigene Primitive: eine Seite, wie sie jemand schreibt,
    // der die Bibliothek nicht kennt.
    const seite = join(dir, "frontend", "src", "seiten", "fremd.tsx");
    writeFileSync(
      seite,
      [
        "export function Fremd() {",
        "  return (",
        "    <div className=\"bg-red-500\">",
        "      <h1>Titel</h1>",
        "      <div role=\"tablist\" />",
        "      <fieldset />",
        "      <dialog />",
        "      <table />",
        "    </div>",
        "  );",
        "}",
        "",
      ].join("\n")
    );
    befunde = standardFindings(dir);
    assert(befunde.some((b) => /bg-red-500/.test(b)), `die Palettenklasse fällt nicht auf: ${befunde.join(" | ")}`);
    for (const [teil, statt] of [["<h1>", "Kopf"], ["<table>", "Datenliste"], ["<dialog>", "Dialog"], ["<fieldset>", "Feldgruppe"], ['role="tablist"', "Tabs"]]) {
      assert(
        befunde.some((b) => b.includes(teil) && b.includes(statt)),
        `das eigene ${teil} fällt nicht auf oder nennt nicht ${statt}: ${befunde.join(" | ")}`
      );
    }

    // Die Verdrahtung: --build hält an, bevor irgendetwas gebaut ist.
    run = tool("app.mjs", ["--app", name, "--build", "--no-plan"]);
    assert(run.status !== 0, "trotz Verstoß wurde gebaut");
    assert(/steht nicht auf der Bibliothek/.test(run.stderr), `der Grund fehlt: ${run.stderr}`);
    assert(/design-system\.de\.md/.test(run.stderr), "der Weg zur Regel im Wissen fehlt");
    assert(!existsSync(join(dir, "build")), "trotz Verstoß liegt ein Bau da");
    rmSync(seite);

    // Das Feld marken: fehlt es, rot; nennt es eine andere Fassung, rot.
    const manifestPfad = join(dir, "app.json");
    const manifest = JSON.parse(readFileSync(manifestPfad, "utf8"));
    const { marken, ...ohneMarken } = manifest;
    writeFileSync(manifestPfad, `${JSON.stringify(ohneMarken, null, 2)}\n`);
    befunde = standardFindings(dir);
    assert(befunde.some((b) => /marken/.test(b)), `das fehlende Feld marken fällt nicht auf: ${befunde.join(" | ")}`);
    writeFileSync(manifestPfad, `${JSON.stringify({ ...manifest, marken: "0.0.0-alt" }, null, 2)}\n`);
    befunde = standardFindings(dir);
    assert(befunde.some((b) => /0\.0\.0-alt/.test(b)), `die veraltete Fassung fällt nicht auf: ${befunde.join(" | ")}`);
    run = tool("app.mjs", ["--app", name, "--build", "--no-plan"]);
    assert(run.status !== 0 && /marken/.test(run.stderr), "ein veraltetes marken hält den Bau nicht an");

    // Der fremde Container: kein Frontend, fertiges Image, kein eigener Bau.
    // Er ist ausgenommen, auch ohne marken.
    const fremd = { schema: 1, id: name, name: "Fremd", version: "1.0.0", backend: { image: "fremd:1.0.0" } };
    assert(standardExempt(fremd), "ein fremder Container gilt nicht als ausgenommen");
    assert(!standardExempt(manifest), "die App aus der Vorlage gilt als ausgenommen");
    writeFileSync(manifestPfad, `${JSON.stringify(fremd, null, 2)}\n`);
    assert(standardFindings(dir).length === 0, "ein fremder Container wird am Standard gemessen");
    return "Farbe, Klasse, fünf Primitive, marken, Ausnahme";
  } finally {
    rmSync(dir, { recursive: true, force: true });
    if (savedState === null) rmSync(stateFile, { force: true });
    else writeFileSync(stateFile, savedState);
  }
});

check("Was live ist, wird nicht noch einmal vorgeschlagen", () => {
  // Fund 5 des zweiten Fremdtests am 28.08.2026. `--app <name>` ohne `--device`
  // kannte nur die Platte: es sah einen frischen Bau und schlug `--check` und
  // `--deploy` vor, obwohl dieselbe Fassung längst live war. Ein Vorschlag, der
  // einen erledigten Schritt wiederholt, ist keiner.
  const app = {
    name: "probeapp",
    dir: join(ROOT, "apps", "probeapp"),
    exists: true,
    manifest: { id: "probeapp", version: "1.0.0" },
    manifestProblem: null,
    readme: true,
    plans: {
      offen: [],
      aktiv: [{ file: "2026-08-27-erste.md", state: "aktiv", path: "", titel: "Erste Fassung" }],
      erledigt: [],
    },
    build: { exists: true, version: "1.0.0", id: "probeapp", stale: false, time: "2026-08-28 09:00" },
  };
  const wie = (steps) => steps.map((s) => s.wie || "").join(" ");
  const was = (steps) => steps.map((s) => s.was).join(" ");

  // Ohne Merker bleibt alles, wie es war: prüfen, dann einspielen.
  const ohne = nextSteps(app, {});
  assert(/--check/.test(wie(ohne)) && /--deploy/.test(wie(ohne)), `ohne Merker fehlt der Weg an das Gerät: ${wie(ohne)}`);

  // Im Teststand: live schalten, und nicht noch einmal einspielen.
  const teststand = {
    place: "orin",
    deployed: { version: "1.0.0", stand: "test", time: "2026-08-28 10:00" },
  };
  const imTest = nextSteps(app, { stand: teststand });
  assert(/--live/.test(wie(imTest)), `der nächste Schritt ist nicht das Schalten: ${wie(imTest)}`);
  assert(!/--deploy/.test(wie(imTest)), `es wird noch einmal eingespielt: ${wie(imTest)}`);
  assert(/ --device orin/.test(wie(imTest)), `das Gerät aus dem Merker fehlt im Aufruf: ${wie(imTest)}`);

  // Live: am Gerät ist nichts offen, dran ist der Plan.
  const live = { ...teststand, live: { version: "1.0.0", time: "2026-08-28 10:30" } };
  const istLive = nextSteps(app, { stand: live });
  assert(!/--deploy|--check|--live/.test(wie(istLive)), `nach live wird weiter geschaltet: ${wie(istLive)}`);
  assert(/live/.test(was(istLive)), `es wird nicht gesagt, dass die Fassung live ist: ${was(istLive)}`);
  assert(/--plan-erledigt/.test(wie(istLive)), `der Plan wird nicht zum Abschluss gebracht: ${wie(istLive)}`);

  // Eine ältere Fassung am Gerät sagt über die neue nichts.
  const alt = { place: "orin", live: { version: "0.9.0", time: "2026-08-20 08:00" } };
  assert(/--deploy/.test(wie(nextSteps(app, { stand: alt }))), "eine alte Live-Fassung hält den neuen Bau auf");

  // Und der Merker wählt das Gerät: ohne Angabe das jüngste, mit Angabe genau das.
  const merker = {
    orin: { live: { version: "1.0.0", time: "2026-08-20 08:00" } },
    "kunde/werk2": { deployed: { version: "1.0.0", stand: "test", time: "2026-08-28 12:00" } },
  };
  assert(lastStand(merker)?.place === "kunde/werk2", "ohne Angabe gilt nicht der jüngste Eintrag");
  assert(lastStand(merker, "orin")?.place === "orin", "mit Angabe wird das falsche Gerät genommen");
  assert(lastStand(merker, "werk2")?.place === "kunde/werk2", "ein Kundengerät wird über seinen Namen nicht gefunden");
  assert(lastStand({}, null) === null, "ein leerer Merker liefert einen Stand");
  const beiKunde = nextSteps(app, { stand: lastStand(merker) });
  assert(/--customer kunde --device werk2/.test(wie(beiKunde)), `das Kundengerät fehlt im Aufruf: ${wie(beiKunde)}`);

  // Fund der Abnahme A3 am 28.08.2026: eine App lief über --compose auf dem
  // Orin, und die Lage sagte, vom Kit sei noch nichts eingespielt worden.
  // Compose ist der einzige Weg auf ein Gerät ohne Arasul, also zählt er mit.
  const ohneArasul = {
    orin: { compose: { version: "0.1.0", time: "2026-08-28 20:35", url: "http://10.0.0.5:8080/" } },
  };
  assert(lastStand(ohneArasul)?.place === "orin", "ein Compose-Stand gilt dem Merker als nichts");
  assert(lastStand(ohneArasul, "orin")?.compose?.version === "0.1.0", "die Fassung des Compose-Standes fehlt");
  assert(lastStand({ orin: {} }) === null, "ein entfernter Eintrag gilt weiter als Stand");
  return "ohne Merker, im Teststand, live, veraltet, über Compose";
});

check("Ein Plan aus dem Klon bleibt liegen, ein eigener nicht", () => {
  // Fund 6 des zweiten Fremdtests am 28.08.2026. `--plan-erledigt` verschob den
  // Plan der damaligen Referenz-App, und der kam mit dem Klon: der frische Klon
  // war danach schmutzig, und das nächste Update stolperte darüber. Die
  // Referenz-App gibt es seit 0.13.0 nicht mehr, der Klon bringt keine App mit.
  //
  // Fund 1 der Werkstatt am 29.08.2026: geprüft wurde "verfolgt git die Datei",
  // gemeint war "kam sie mit dem Kit". Für einen Partnerklon ist das dasselbe,
  // für einen Betrieb, der seine eigenen Apps versioniert, nicht: dort verweigerte
  // `--plan-aktiv` mitten in der Arbeit. Das Feld `versioned:` im Profil trennt
  // die beiden Fragen, und ohne das Feld bleibt der Schutz, wie er war.
  const listed = spawnSync("git", ["ls-files", "-z", "apps"], { cwd: ROOT, encoding: "utf8" });
  if (listed.status !== 0) return "übersprungen, kein Git-Repository";
  const versionierte = listed.stdout.split("\0").filter(Boolean);
  assert(
    versionierte.length === 0 || ownFolders().includes("apps"),
    `der Klon bringt eine App mit, ohne dass das Profil apps unter versioned nennt: ${versionierte.slice(0, 3).join(", ")}`
  );

  assert(tracked(join(ROOT, ".ara", "templates", "plan.md")), "eine verfolgte Datei wird nicht als solche erkannt");
  assert(!tracked(join(ROOT, ".ara", "state.json")), "eine Datei außerhalb der Versionsverwaltung gilt als verfolgt");
  assert(fromKit(join(ROOT, ".ara", "templates", "plan.md")), "eine Datei des Kits gilt nicht als solche");

  // Die Trennung selbst, an einem gespielten Profil: dieselbe verfolgte Datei,
  // einmal mit und einmal ohne das Feld.
  const profil = mkdtempSync(join(tmpdir(), "ara-profil-"));
  try {
    const datei = join(profil, "profile.md");
    writeFileSync(datei, "---\nrole: company\nversioned: business, devices, apps\n---\n");
    const eigene = ownFolders(datei);
    assert(eigene.join(",") === "business,devices,apps", `das Feld wird falsch gelesen: ${eigene.join(",")}`);
    assert(inOwnFolder(join(ROOT, "apps", "eigen", "app.json"), eigene), "eine eigene App gilt nicht als eigen");
    assert(!inOwnFolder(join(ROOT, ".ara", "templates", "plan.md"), eigene), ".ara/ gilt als Ordner des Nutzers");
    assert(!inOwnFolder(join(ROOT, "customers", "x", "y.md"), eigene), "ein nicht genannter Ordner gilt als eigen");

    writeFileSync(datei, "---\nrole: partner\nversioned:\n---\n");
    assert(ownFolders(datei).length === 0, "ohne Feld gilt trotzdem etwas als eigen");
    writeFileSync(datei, "---\nrole: partner\nversioned: /etc, apps\n---\n");
    assert(ownFolders(datei).join(",") === "apps", "ein fremder Name kommt durch das Feld");
  } finally {
    rmSync(profil, { recursive: true, force: true });
  }

  // Der Platzhalter des Spiegels ist die zweite Stelle, an der der Fremdtest den
  // Arbeitsordner schmutzig gemacht hat. Er bleibt, wie er ist.
  const status = spawnSync("git", ["status", "--porcelain", "--", ".ara/mirror/.gitkeep"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert(status.stdout.trim() === "", `der Arbeitsordner ist schmutzig: ${status.stdout}`);
  assert(existsSync(join(ROOT, ".ara", "mirror", ".gitkeep")), "der Platzhalter des Spiegels fehlt");

  // Für eine eigene App bleibt der Weg offen.
  const eigen = {
    name: "selftest-eigen",
    dir: mkdtempSync(join(tmpdir(), "ara-plan-")),
    plans: { offen: [], aktiv: [], erledigt: [] },
  };
  try {
    mkdirSync(join(eigen.dir, "plans", "aktiv"), { recursive: true });
    const datei = "2026-08-28-eigener-plan.md";
    writeFileSync(join(eigen.dir, "plans", "aktiv", datei), "---\nstand: aktiv\n---\n\nText\n");
    eigen.plans.aktiv = [{ file: datei, state: "aktiv", path: join(eigen.dir, "plans", "aktiv", datei), titel: "Eigen" }];
    const bewegt = movePlan(eigen, datei, "erledigt");
    assert(bewegt.to === "erledigt" && existsSync(bewegt.path), "ein eigener Plan lässt sich nicht abschließen");
  } finally {
    rmSync(eigen.dir, { recursive: true, force: true });
  }
  return "keine App im Klon, ein eigener Plan beweglich";
});

check("Der Bau nimmt das Paket und lässt die Arbeit daran liegen", () => {
  const stateFile = join(ROOT, ".ara", "state.json");
  const savedState = existsSync(stateFile) ? readFileSync(stateFile, "utf8") : null;
  const name = "selftest-bau";
  const dir = join(ROOT, "apps", name);
  try {
    // Eine App ohne eigenen Bau: das Frontend liegt fertig vor. So läuft der
    // Selbsttest ohne Netz, und geprüft wird genau der Schnitt des Ordners.
    mkdirSync(join(dir, "frontend"), { recursive: true });
    mkdirSync(join(dir, "flows"), { recursive: true });
    mkdirSync(join(dir, "plans", "offen"), { recursive: true });
    writeFileSync(join(dir, "app.json"), JSON.stringify({ schema: 1, id: name, name: "Bau", version: "1.0.0" }, null, 2));
    writeFileSync(join(dir, "README.md"), "# Bau\n");
    writeFileSync(join(dir, "frontend", "index.html"), "<p>fertig</p>\n");
    writeFileSync(join(dir, "flows", "probe.md"), "---\nname: probe\n---\n\nTu etwas.\n");
    writeFileSync(join(dir, "plans", "offen", "2026-01-01-probe.md"), "---\nstand: offen\n---\n");

    const run = tool("app.mjs", ["--app", name, "--build", "--no-plan"]);
    assert(run.status === 0, `Bau fehlgeschlagen: ${run.stderr}${run.stdout}`);
    // Der Bau sagt, dass die Designprüfung lief und worüber, auch ohne Befund.
    assert(
      /(Design check|Designprüfung): 1 (file|Datei) .*(no finding|kein Befund)/.test(run.stdout),
      `der Bau sagt nicht, dass die Designprüfung lief: ${run.stdout}`
    );
    const build = join(dir, "build");
    for (const datei of ["app.json", "frontend/index.html", "flows/probe.md"]) {
      assert(existsSync(join(build, datei)), `im Paket fehlt: ${datei}`);
    }
    for (const draussen of ["plans", "README.md", "build"]) {
      assert(!existsSync(join(build, draussen)), `im Paket liegt, was nicht hineingehört: ${draussen}`);
    }

    // Ein Bau, der älter ist als die Quelle, wird als solcher erkannt und nicht
    // eingespielt: sonst ginge der Stand von vorgestern an das Gerät.
    writeFileSync(join(dir, "frontend", "index.html"), "<p>neuer</p>\n");
    const lage = JSON.parse(tool("app.mjs", ["--app", name, "--json"]).stdout);
    assert(lage.build.stale, "ein veralteter Bau fällt nicht auf");
    const abgewiesen = tool("app.mjs", ["--device", "gibtsnicht", "--app", name, "--deploy"]);
    assert(abgewiesen.status !== 0, "ein veralteter Bau wurde eingespielt");
    return "app.json, frontend, flows im Paket, Pläne und README draußen";
  } finally {
    rmSync(dir, { recursive: true, force: true });
    if (savedState === null) rmSync(stateFile, { force: true });
    else writeFileSync(stateFile, savedState);
  }
});

check("Ein Gerät ohne Arasul bekommt zwei Container und den Satz, was fehlt", () => {
  const manifest = {
    schema: 1,
    id: "probeapp",
    name: "Probe",
    version: "1.0.0",
    frontend: { verzeichnis: "frontend" },
    backend: { image: "arasul-probeapp:1.0.0", bauen: { verzeichnis: "backend" }, umgebung: { ARASUL_APP_NAME: "Probe" } },
    ports: { backend: 8080 },
  };
  const datei = composeFile(manifest, { port: 8081 });
  assert(/build:\s*\n\s+context: \.\/backend/.test(datei), "das Backend wird nicht am Gerät gebaut");
  assert(/PORT: "8080"/.test(datei), "der Port aus dem Manifest steht nicht im Container");
  assert(/- "8081:80"/.test(datei), "der Port am Gerät fehlt");
  assert(!/8080:8080/.test(datei), "das Backend hängt am Gerät, obwohl ein Webserver davor steht");
  for (const satz of WAS_FEHLT) {
    assert(datei.includes(satz), `im Kopf der Datei fehlt: ${satz.slice(0, 30)}`);
  }
  assert(/Anmeldung/.test(WAS_FEHLT.join(" ")) && /Freigaben/.test(WAS_FEHLT.join(" ")), "der Satz nennt nicht, was fehlt");

  const conf = nginxConf(manifest);
  assert(/proxy_pass http:\/\/backend:8080\//.test(conf), "die Schnittstelle wird nicht weitergereicht");
  assert(/location \/api\//.test(conf), "die App findet ihre Schnittstelle nicht unter /api/");

  // Ohne Backend gibt es nichts weiterzureichen, und keinen zweiten Container.
  const nurSeite = composeFile({ ...manifest, backend: undefined, ports: undefined });
  assert(!/backend:/.test(nurSeite), "eine App ohne Backend bekommt trotzdem einen Container dafür");
  assert(!/location \/api\//.test(nginxConf({ ...manifest, backend: undefined })), "ohne Backend wird weitergereicht");
});

/**
 * Die Vorlage gegen ein gespieltes Gerät.
 *
 * Gefahren wird die Vorlage selbst, nicht eine Kopie ihres Quelltextes: der
 * Platzhalter {{name}} steht nur in einer Zeichenkette und stört den Start
 * nicht, und der Name kommt hier ohnehin aus der Umgebung. Was daneben liegt,
 * ist die Vereinbarung, und die entsteht wie beim Einspielen aus dem Kontrakt.
 *
 * **Das gespielte Gerät antwortet nicht so, wie die Vorlage es gern hätte.** Es
 * nennt seine Umgebungswerte anders, seine Schlüsselkopfzeile anders, es legt
 * seine Wege unter den Vorsatz der äußeren Schnittstelle, es antwortet 200 statt
 * 202 und legt die Nummer des Laufs in einen Umschlag. Bis zum 29.08.2026 spielte
 * der Selbsttest hier ein Gerät, das genau das antwortete, was die Vorlage riet,
 * und bewies damit nur, dass die Vorlage mit sich selbst einig ist.
 */
async function mitVorlage(kontrakt, geraetAntwort, arbeit) {
  const template = join(ROOT, ".ara", "templates", "app", "backend");
  const geraet = createServer((anfrage, antwort) => {
    const teile = [];
    anfrage.on("data", (s) => teile.push(s));
    anfrage.on("end", () => {
      const url = new URL(anfrage.url, "http://x");
      geraetAntwort(anfrage, url, teile.length ? JSON.parse(Buffer.concat(teile).toString("utf8")) : null, (code, daten) => {
        antwort.writeHead(code, { "content-type": "application/json" });
        antwort.end(JSON.stringify(daten));
      });
    });
  });
  await new Promise((ready) => geraet.listen(0, "127.0.0.1", ready));
  const basis = `http://127.0.0.1:${geraet.address().port}`;

  // So, wie --deploy es tut: die Vereinbarung aus dem Kontrakt ins Paket.
  const paket = mkdtempSync(join(tmpdir(), "ara-vorlage-"));
  cpSync(template, paket, { recursive: true });
  if (kontrakt) {
    writeFileSync(
      join(paket, ARRANGEMENT_FILE),
      arrangementFile(appArrangement(kontrakt, { device: "selbsttest", date: today() }))
    );
  }

  const umgebung = { ...process.env, PORT: "0", ARASUL_APP_NAME: "Probe" };
  if (kontrakt?.umgebung?.basis) umgebung[kontrakt.umgebung.basis] = basis;
  if (kontrakt?.umgebung?.schluessel) umgebung[kontrakt.umgebung.schluessel] = "aras_selbsttest";
  const app = spawn("node", [join(paket, "server.mjs")], { env: umgebung, stdio: ["ignore", "pipe", "pipe"] });
  // Der Port kommt vom Betriebssystem, damit zwei Läufe sich nicht ins Gehege
  // kommen. Die App sagt ihn beim Start, also wird zugehört statt geraten.
  let ausgabe = "";
  // Die technische Zeile eines Fehlers geht nach stderr, ins Protokoll des
  // Containers: auch das gehört zu dem, was die Prüfungen lesen.
  app.stderr.on("data", (chunk) => (ausgabe += String(chunk)));
  const appUrl = await new Promise((done, failed) => {
    const zeit = setTimeout(() => failed(new Error("die App hat nicht gestartet")), 10_000);
    app.stdout.on("data", (chunk) => {
      ausgabe += String(chunk);
      const treffer = ausgabe.match(/auf (\d+)/);
      if (treffer) {
        clearTimeout(zeit);
        done(`http://127.0.0.1:${treffer[1]}`);
      }
    });
  });

  // So legt die Plattform einen Namen in die Kopfzeile: als UTF-8, das auf der
  // Leitung wie Latin-1 aussieht. Wer hier schlicht "Jürgen" schickt, prüft den
  // Umweg nicht, den die App genau dafür geht.
  const alsKopfzeile = (text) => Buffer.from(text, "utf8").toString("latin1");
  const koepfe = kontrakt?.koepfe ?? { benutzer: "x-arasul-user", rolle: "x-arasul-role" };
  const ruf = async (pfad, optionen) => {
    const antwort = await fetch(`${appUrl}${pfad}`, {
      headers: {
        "content-type": "application/json",
        [koepfe.benutzer]: alsKopfzeile("Jürgen"),
        [koepfe.rolle]: "mitarbeiter",
      },
      ...optionen,
    });
    return { code: antwort.status, daten: await antwort.json() };
  };
  const einreichen = (titel, text) =>
    ruf("/vorgaenge", { method: "POST", body: JSON.stringify({ titel, ...(text ? { text } : {}) }) });

  try {
    return await arbeit({ ruf, einreichen, protokoll: () => ausgabe });
  } finally {
    app.kill();
    geraet.close();
    rmSync(paket, { recursive: true, force: true });
  }
}

/**
 * Ein Gerät, das seine Werte selbst vergibt.
 *
 * Kein Wert daraus steht in der Vorlage, und keiner davon ist der, den sie
 * früher geraten hat. Ändert jemand die Vorlage zurück auf einen festen Namen,
 * geht diese Prüfung rot.
 */
const VORLAGE_KONTRAKT = {
  kontrakt: KIT_CONTRACT_VERSION,
  arasul: "0.0.0-selbsttest",
  schluessel: { kopf: "x-arasul-app-key", praefix: "aras_" },
  // Auch die Kopfzeilen der Anmeldung heißen hier anders als am Orin: eine
  // Vorlage, die `x-arasul-user` fest im Quelltext trägt, findet hier niemanden.
  koepfe: { benutzer: "x-geraet-wer", rolle: "x-geraet-rolle", rollen: ["admin", "mitarbeiter"] },
  umgebung: { basis: "ARASUL_BASIS_URL", schluessel: "ARASUL_APP_KEY" },
  freigaben: { start: { properties: { args: {}, einreicher: { type: "string" }, freigabe: { type: "object" } } } },
  endpunkte: [
    { verb: "GET", pfad: "/api/v1/external/contract", was: "Dieser Kontrakt" },
    { verb: "POST", pfad: "/api/v1/external/flows/:name/run", was: "Einen Flow starten" },
    { verb: "GET", pfad: "/api/v1/external/flows/runs/:id", was: "Einen Lauf lesen" },
    { verb: "GET", pfad: "/api/v1/external/freigaben", was: "Freigaben dieser App" },
    { verb: "POST", pfad: "/api/v1/external/document/extract-structured", was: "Ein Dokument auslesen" },
    { verb: "POST", pfad: "/api/v1/external/llm/chat", was: "Ein Modell fragen" },
  ],
  // Wer einen Modellaufruf ausgelöst hat, seit dem 26.09.2026. Auch diese
  // Kopfzeile heißt hier anders als am Orin: eine Vorlage, die sie fest im
  // Quelltext trägt, reicht hier niemanden weiter.
  protokoll: {
    wege: ["llm/chat", "document/analyze", "document/extract-structured", "v1/chat/completions", "v1/embeddings"],
    einreicher: { kopf: "x-geraet-fuer", feld: "einreicher", feld_openai: "user" },
    regeln: ["Jeder Modellaufruf steht im Protokoll des Geraets."],
  },
};

/** Dasselbe Gerät vor dem 25.09.2026: es kennt `freigaben` nicht und weist jedes unbekannte Feld ab. */
const VORLAGE_KONTRAKT_ALT = (() => {
  const { freigaben, ...rest } = VORLAGE_KONTRAKT;
  return rest;
})();

await checkAsync("Ein Vorgang der Vorlage hält an, ein Mensch entscheidet, er ist genehmigt", async () => {
  // Geprüft wird der Weg, um den es in jeder App aus der Vorlage geht: sie
  // startet einen Flow, der Lauf hält an, ein MENSCH entscheidet, und erst
  // danach steht der Vorgang auf genehmigt. Die App entscheidet dabei nichts:
  // sie liest nur.
  const freigabe = { run_id: 7, status: "offen", begruendung: null, entschieden_von: null };
  const gesehen = { start: null, key: null, wege: [] };
  // Nach der Bestätigung läuft der Flow noch ein Stück, bevor er seinen Satz
  // schreibt. Die App sieht die Freigabe, bevor der Lauf fertig ist.
  let laufFertig = false;
  return await mitVorlage(
    VORLAGE_KONTRAKT,
    (anfrage, url, rumpf, json) => {
      gesehen.key = anfrage.headers["x-arasul-app-key"] || null;
      gesehen.wege.push(`${anfrage.method} ${url.pathname}`);
      if (gesehen.key !== "aras_selbsttest") return json(401, { error: { message: "kein Schlüssel" } });
      if (url.pathname === "/api/v1/external/flows/freigabe/run") {
        gesehen.start = rumpf.args;
        gesehen.rumpf = rumpf;
        // 200 und die Nummer im Umschlag: die Vorlage darf sich weder auf 202
        // noch auf eine nackte Antwort festlegen.
        return json(200, { success: true, data: { run_id: 7 } });
      }
      if (url.pathname === "/api/v1/external/freigaben") {
        return json(200, { data: { freigaben: [freigabe] } });
      }
      if (url.pathname === "/api/v1/external/flows/runs/7") {
        return json(200, {
          data: {
            status: laufFertig ? "fertig" : freigabe.status === "bestaetigt" ? "laeuft" : "wartend",
            result: laufFertig ? "Anna hat den Vorgang genehmigt." : null,
          },
        });
      }
      json(404, { error: { message: url.pathname } });
    },
    async ({ ruf, einreichen, protokoll }) => {
      const lage = await ruf("/lage");
      // Wer angemeldet ist, sagt `api/me`, und das beantwortet die Plattform.
      // Das Backend der App liest denselben Menschen aus den Kopfzeilen, und
      // sichtbar wird das am Einreicher weiter unten.
      assert(!("nutzer" in lage.daten), "das Backend gibt den Angemeldeten zurück, statt ihn der Plattform zu lassen");
      assert(lage.daten.arasul === true, `die App sieht die Schnittstelle des Geräts nicht: ${lage.daten.hinweis}`);
      assert(/ARASUL_BASIS_URL/.test(protokoll()), `die App sagt beim Start nicht, woran sie hängt: ${protokoll()}`);

      const gestellt = await einreichen("Neuer Monitor", "Der alte flackert.");
      assert(gestellt.code === 201, `Vorgang abgewiesen: ${JSON.stringify(gestellt.daten)}`);
      assert(gestellt.daten.vorgang.von === "Jürgen", "der Einreicher kommt nicht aus der Anmeldung");
      // Als Zeichenkette und nicht als Zahl: welche Form die Nummer eines
      // Laufs hat, ist ein Wert des Geraets. Die Ablage der Vorlage legt sich
      // deshalb nicht auf INTEGER fest, und die App vergleicht sie als Text.
      assert(
        String(gestellt.daten.vorgang.lauf) === "7",
        `der Flow wurde nicht gestartet: ${JSON.stringify(gestellt.daten.vorgang)}`
      );
      assert(gestellt.daten.vorgang.status === "wartet", `der Vorgang wartet nicht: ${gestellt.daten.vorgang.status}`);
      assert(
        gesehen.start?.von === "Jürgen" && gesehen.start?.vorgang === String(gestellt.daten.vorgang.id),
        `der Flow bekam falsche Angaben: ${JSON.stringify(gesehen.start)}`
      );
      // In die Freigabeanfrage gehen Verweise, keine Inhalte: die Karte sieht
      // jeder, der entscheiden darf, und der Lauf liegt am Gerät.
      assert(
        !/Neuer Monitor|flackert/.test(JSON.stringify(gesehen.rumpf)),
        `Titel oder Text des Vorgangs stehen im Lauf: ${JSON.stringify(gesehen.rumpf)}`
      );
      // Das Gerät nimmt den Einreicher an, also geht er mit, aus der Anmeldung.
      assert(gesehen.rumpf?.einreicher === "Jürgen", `der Einreicher geht nicht mit: ${JSON.stringify(gesehen.rumpf)}`);
      assert(gesehen.rumpf?.freigabe === undefined, "die Vorlage zieht den Kreis enger, ohne dass jemand es verlangt");

      // Ohne Titel gibt es keinen Vorgang, und die App sagt es.
      const leer = await ruf("/vorgaenge", { method: "POST", body: JSON.stringify({ text: "nur Text" }) });
      assert(leer.code === 400, "ein Vorgang ohne Titel wurde angenommen");

      // Solange niemand entschieden hat, ändert sich nichts. Die App wartet, sie
      // hilft nicht nach.
      let liste = await ruf("/vorgaenge");
      assert(liste.daten.vorgaenge[0].status === "wartet", "der Vorgang entscheidet sich selbst");
      // Wer wartet, erfährt, auf wen: die Vorlage zieht den Kreis nicht enger,
      // also jeder mit Zugang, und das steht so da und nicht als Lücke.
      const wer = liste.daten.vorgaenge[0].entscheidet;
      assert(
        wer && wer.konten === null && wer.ohne === null,
        `der wartende Vorgang sagt nicht, wer entscheidet: ${JSON.stringify(wer)}`
      );

      // Jetzt der Mensch, in der Oberfläche von Arasul.
      freigabe.status = "bestaetigt";
      freigabe.entschieden_von = "Anna";
      liste = await ruf("/vorgaenge");
      const vorgang = liste.daten.vorgaenge.find((v) => v.id === 1);
      assert(vorgang.status === "genehmigt", `nach der Bestätigung: ${vorgang.status}`);
      assert(vorgang.entscheidet === undefined, "ein entschiedener Vorgang nennt noch, wer entscheidet");
      assert(vorgang.entschieden_von === "Anna", "der Name des Entscheiders fehlt am Vorgang");
      assert(vorgang.bemerkung === null, `ein Satz steht da, bevor der Lauf fertig ist: ${vorgang.bemerkung}`);
      // Der Lauf wird fertig. Bis 0.41.0 fragte die App nur beim ersten
      // Nachziehen, und der Satz fehlte für immer.
      laufFertig = true;
      liste = await ruf("/vorgaenge");
      const spaeter = liste.daten.vorgaenge.find((v) => v.id === 1);
      assert(/genehmigt/.test(spaeter.bemerkung || ""), `der Satz des Laufs wird nicht nachgezogen: ${spaeter.bemerkung}`);
      const laeufe = gesehen.wege.filter((weg) => weg.endsWith("/flows/runs/7")).length;
      await ruf("/vorgaenge");
      assert(
        gesehen.wege.filter((weg) => weg.endsWith("/flows/runs/7")).length === laeufe,
        "die App fragt den Lauf weiter, obwohl der Satz schon dasteht"
      );
      assert(
        gesehen.wege.every((weg) => weg.includes("/api/v1/external/")),
        `die App ruft Wege, die nicht aus dem Kontrakt kommen: ${gesehen.wege.join(", ")}`
      );
      return "eingereicht, gewartet, bestätigt, genehmigt, der Satz nachgezogen, sobald der Lauf fertig ist, jeder Wert aus dem Kontrakt";
    }
  );
});

await checkAsync("Steht der Rahmen und der Lauf kommt trotzdem nicht, sagt die App genau das", async () => {
  // Der teuerste Fall: das Gerät ist da, die App erreicht es, und der Lauf
  // kommt trotzdem nicht zustande. Bis zum 29.08.2026 stand am Vorgang dann
  // „ohne Arasul", und danach hat drei Erklärungen lang niemand mehr am
  // richtigen Ort gesucht.
  // Das Gerät ist eines von vor dem 25.09.2026: es kennt `einreicher` nicht
  // und weist einen Start mit einem Feld, das es nicht kennt, ab. Die Vorlage
  // darf es ihm also nicht schicken.
  let antwortet = "leer";
  return await mitVorlage(
    VORLAGE_KONTRAKT_ALT,
    (anfrage, url, rumpf, json) => {
      if (url.pathname !== "/api/v1/external/flows/freigabe/run") return json(404, { error: { message: url.pathname } });
      if ("einreicher" in (rumpf || {}) || "freigabe" in (rumpf || {})) {
        return json(400, { error: { message: "Unrecognized key: einreicher" } });
      }
      if (antwortet === "leer") return json(200, { success: true, data: {} });
      return json(500, { error: { message: "der Flow-Dienst antwortet nicht" } });
    },
    async ({ ruf, einreichen, protokoll }) => {
      const lage = await ruf("/lage");
      assert(lage.daten.arasul === true, "die App sieht den Rahmen nicht, obwohl er steht");

      let vorgang = (await einreichen("Ohne Nummer")).daten.vorgang;
      assert(vorgang.lauf === null && vorgang.status === "ohne lauf", `falscher Stand: ${JSON.stringify(vorgang)}`);
      assert(/Nummer/.test(vorgang.hinweis || ""), `die App sagt nicht, was fehlte: ${vorgang.hinweis}`);
      assert(!/ohne Arasul/i.test(vorgang.hinweis || ""), `die App schiebt es auf Arasul: ${vorgang.hinweis}`);
      assert(/Nummer des Laufs/.test(protokoll()), `die technische Zeile fehlt im Protokoll: ${protokoll()}`);

      // Der Mensch liest einen Satz, wer die App betreut, die Zeile mit Weg
      // und Status: am 26.09.2026 stand „POST ... wurde mit Status 408
      // beantwortet" auf dem Bildschirm einer Steuerfachangestellten.
      antwortet = "fehler";
      vorgang = (await einreichen("Mit Fehler")).daten.vorgang;
      assert(vorgang.status === "ohne lauf", `falscher Stand: ${JSON.stringify(vorgang)}`);
      assert(/Fehler gemeldet/.test(vorgang.hinweis || ""), `kein Satz für den Menschen am Vorgang: ${vorgang.hinweis}`);
      assert(!/\b500\b|POST|\/api\/|Status/.test(vorgang.hinweis || ""), `die HTTP-Zeile steht am Vorgang: ${vorgang.hinweis}`);
      assert(
        /wurde mit Status 500 beantwortet: der Flow-Dienst antwortet nicht/.test(protokoll()) && !/aras_selbsttest/.test(protokoll()),
        `die technische Zeile steht nicht im Protokoll, oder der Schlüssel steht darin: ${protokoll()}`
      );
      return "keine Nummer und ein Fehler, beide als Satz am Vorgang, die Zeile im Protokoll, keiner als „ohne Arasul“";
    }
  );
});

await checkAsync("Ohne Arasul entscheidet niemand, und die App sagt es", async () => {
  // Ohne Vereinbarung neben dem Backend: so kommt die Vorlage aus dem Klon, und
  // so läuft sie auf einem Gerät ohne Arasul über Compose.
  return await mitVorlage(
    null,
    (anfrage, url, rumpf, json) => json(500, { error: { message: "hier ist niemand" } }),
    async ({ ruf, einreichen }) => {
      const lage = await ruf("/lage");
      assert(lage.daten.arasul === false, "die App behauptet eine Schnittstelle, die sie nicht hat");
      const vorgang = (await einreichen("Neuer Monitor")).daten.vorgang;
      assert(vorgang.status === "ohne entscheidung", `ohne Freigabe: ${vorgang.status}`);
      assert(vorgang.status !== "genehmigt", "ohne Freigabe gilt der Vorgang als genehmigt");
      assert(
        /Arasul/.test(vorgang.hinweis || ""),
        `der Vorgang sagt nicht, warum niemand entscheidet: ${vorgang.hinweis}`
      );
      return "Vorgang angenommen, ohne Entscheidung, mit Begründung";
    }
  );
});

await checkAsync("Ein Vorgang entsteht in Arbeit, wird erst eingereicht, wenn er bereit ist, und ändert sich danach nicht mehr", async () => {
  // Der Kern der Vorlage ohne Server, mit einer Ablage im Speicher und einem
  // gespielten Gerät: eine Kanzlei gibt einen Abschluss erst frei, wenn alle
  // Unterlagen da sind. Bis 0.41.0 startete schon das Anlegen den Lauf.
  const { vorgaenge, darfAendern } = await import(join(ROOT, ".ara", "templates", "app", "backend", "kern", "vorgaenge.mjs"));
  const zeilen = new Map();
  const ablage = {
    async anlegen(v) {
      const id = zeilen.size + 1;
      zeilen.set(id, { ...v, id, lauf: v.lauf ?? null, bemerkung: null, entschieden_von: null, begruendung: null });
      return { ...zeilen.get(id) };
    },
    async eines(id) {
      return zeilen.has(id) ? { ...zeilen.get(id) } : null;
    },
    async alle() {
      return [...zeilen.values()].map((v) => ({ ...v }));
    },
    async wartende() {
      return [...zeilen.values()].filter((v) => v.lauf !== null && v.status === "wartet").map((v) => ({ ...v }));
    },
    async fortschreiben(id, felder) {
      const alt = zeilen.get(id);
      zeilen.set(id, { ...alt, ...felder, lauf: alt.lauf ?? felder.lauf ?? null, titel: alt.titel, text: alt.text });
      return { ...zeilen.get(id) };
    },
    async aendern(id, { titel, text }) {
      if (zeilen.get(id)?.status !== "in arbeit") return null;
      zeilen.set(id, { ...zeilen.get(id), titel, text });
      return { ...zeilen.get(id) };
    },
  };
  const starts = [];
  const geraet = {
    warumKeinRahmen: () => null,
    async flowStarten(argumente, zusatz) {
      starts.push({ argumente, zusatz });
      return { lauf: String(starts.length), fehler: null };
    },
    freigaben: async () => ({ eintraege: [], fehler: null }),
    lauf: async () => null,
  };
  let fehlt = "Es fehlt die Inventurliste.";
  const kern = vorgaenge({ ablage, geraet, name: "Probe", bereit: async () => fehlt ?? true });

  const angelegt = await kern.anlegen({ titel: "Abschluss 2025", von: "anna" });
  assert(angelegt.status === "in arbeit" && angelegt.lauf === null, `ein neuer Vorgang ist nicht in Arbeit: ${JSON.stringify(angelegt)}`);
  assert(starts.length === 0, "schon das Anlegen fordert einen Lauf an");
  assert(darfAendern(angelegt), "ein Vorgang in Arbeit darf sich nicht ändern");

  let r = await kern.einreichen(angelegt.id);
  assert(r.status === 409 && r.vorgang.status === "in arbeit" && r.vorgang.lauf === null, `ein Vorgang, der nicht bereit ist, wurde eingereicht: ${JSON.stringify(r)}`);
  assert(r.fehler === fehlt && r.vorgang.hinweis === fehlt, `der Satz, was fehlt, steht nicht am Vorgang: ${JSON.stringify(r)}`);
  assert(starts.length === 0, "für einen Vorgang, der nicht bereit ist, wurde ein Lauf angefordert");
  r = await kern.aendern(angelegt.id, { titel: "Abschluss 2025, Müller Bau GmbH" });
  assert(r.status === 200 && r.vorgang.titel === "Abschluss 2025, Müller Bau GmbH", `ein Vorgang in Arbeit ließ sich nicht ändern: ${JSON.stringify(r)}`);

  fehlt = null;
  r = await kern.einreichen(angelegt.id);
  assert(r.status === 200 && r.vorgang.status === "wartet" && r.vorgang.lauf === "1" && r.vorgang.hinweis === null, `bereit, und trotzdem nicht eingereicht: ${JSON.stringify(r)}`);
  assert(starts.length === 1 && starts[0].argumente.vorgang === String(angelegt.id) && starts[0].zusatz.einreicher === "anna", `der Lauf bekam falsche Angaben: ${JSON.stringify(starts)}`);
  assert(!darfAendern(r.vorgang), "ein eingereichter Vorgang darf sich noch ändern");

  r = await kern.einreichen(angelegt.id);
  assert(r.status === 409 && starts.length === 1, `ein Vorgang ließ sich zweimal einreichen: ${JSON.stringify(r)}`);
  r = await kern.aendern(angelegt.id, { titel: "Nachgeschoben" });
  assert(r.status === 409 && (await ablage.eines(angelegt.id)).titel === "Abschluss 2025, Müller Bau GmbH", `ein eingereichter Vorgang ließ sich ändern: ${JSON.stringify(r)}`);
  r = await kern.einreichen(99);
  assert(r.status === 404 && r.vorgang === null, `ein Vorgang, den es nicht gibt: ${JSON.stringify(r)}`);
  for (const stand of ["wartet", "genehmigt", "abgelehnt", "abgelaufen", "ohne entscheidung", "ohne lauf"]) {
    assert(!darfAendern({ status: stand }), `darfAendern lässt einen Vorgang auf "${stand}" ändern`);
  }
  assert(!darfAendern(null), "darfAendern lässt einen Vorgang ändern, den es nicht gibt");
  return "angelegt in Arbeit ohne Lauf, nicht bereit 409 mit Satz, bereit eingereicht, danach 409 für Einreichen und Ändern";
});

await checkAsync("Die CSV-Hilfe der Vorlage schreibt BOM, Semikolon und Dezimalkomma und führt keine Formel aus", async () => {
  // Ein Export geht an Excel oder den Steuerberater. Eine Zelle, die mit = + -
  // @ Tab oder CR beginnt, liest die Tabellenkalkulation als Formel; ein
  // Mandantenname wie =HYPERLINK(...) liefe sonst beim Empfänger.
  const { csv, zelle, csvKopfzeilen } = await import(join(ROOT, ".ara", "templates", "app", "backend", "kern", "csv.mjs"));
  const text = csv(
    [
      { name: "Müller; \"Bau\" GmbH", betrag: 1234.5, notiz: "zwei\nZeilen" },
      { name: "=HYPERLINK(\"http://x\")", betrag: -12.5, notiz: "@SUMME(A1)" },
      { name: "+49 30 123", betrag: 0.1, notiz: "-5" },
      { name: "\tTab", betrag: 7, notiz: "\rCR" },
    ],
    [
      { titel: "Name", wert: (z) => z.name },
      { titel: "Betrag", wert: (z) => z.betrag, stellen: 2 },
      { titel: "Notiz", wert: (z) => z.notiz },
    ]
  );
  assert(text.startsWith("\uFEFF"), "die CSV beginnt ohne BOM, Excel liest Umlaute dann falsch");
  const zeilenTeile = text.slice(1).split("\r\n");
  assert(zeilenTeile[0] === "Name;Betrag;Notiz", `die Kopfzeile trennt nicht mit Semikolon: ${JSON.stringify(zeilenTeile[0])}`);
  assert(zeilenTeile[1] === '"Müller; ""Bau"" GmbH";1234,50;"zwei\nZeilen"', `Quoting oder Dezimalkomma stimmen nicht: ${JSON.stringify(zeilenTeile[1])}`);
  assert(zeilenTeile[2] === '"\'=HYPERLINK(""http://x"")";-12,50;\'@SUMME(A1)', `eine Formel bleibt ausführbar: ${JSON.stringify(zeilenTeile[2])}`);
  assert(zeilenTeile[3] === "'+49 30 123;0,10;'-5", `+ oder - als Text bleibt eine Formel: ${JSON.stringify(zeilenTeile[3])}`);
  assert(zeilenTeile[4] === "'\tTab;7,00;\"'\rCR\"", `Tab oder CR vorn bleibt ungeschützt: ${JSON.stringify(zeilenTeile[4])}`);
  assert(text.endsWith("\r\n"), "die letzte Zeile endet ohne CRLF");
  assert(zelle(1234567.891) === "1234567,891" && zelle(1e21) === "1000000000000000000000", `Zahlen tragen Tausenderpunkt oder Exponent: ${zelle(1234567.891)} ${zelle(1e21)}`);
  assert(zelle(null) === "" && zelle(undefined) === "", "eine leere Zelle ist nicht leer");
  assert(/text\/csv; charset=utf-8/.test(csvKopfzeilen("a.csv")["content-type"]) && /attachment/.test(csvKopfzeilen("Ä.csv")["content-disposition"]), "die Kopfzeilen der Antwort stimmen nicht");
  return "BOM, Semikolon, Dezimalkomma, Quoting, Formelschutz für = + - @ Tab CR, eine Zahl bleibt eine Zahl";
});

// --- Die Muster jenseits des Formulars ---------------------------------------

/** Der Ordner der Muster, und die Vorlage daneben. */
const PATTERNS = join(ROOT, ".ara", "templates", "app-patterns");

check("Das Wissen kennt acht Muster jenseits des Formulars, und jeder Verweis trifft", () => {
  // Ein Partner, der im Wissen nur den Urlaubsantrag findet, baut nur Formulare
  // und hält Arasul für ein Formularwerkzeug. Das Blatt nennt acht Muster, und
  // jedes zeigt auf Code, der im Kit liegt. Ein Verweis, der ins Leere zeigt,
  // ist ein Muster ohne Beleg.
  // Seit 0.37.0 ist das Blatt der Überblick, und das Blatt jedes Musters liegt
  // neben seinem Code: gelesen wird nur das, das der Plan nimmt.
  for (const [blatt, endung] of [[".ara/knowledge/app-patterns.md", ".md"], [".ara/knowledge/app-patterns.de.md", ".de.md"]]) {
    const text = readFileSync(join(ROOT, blatt), "utf8");
    for (const nummer of [1, 2, 3, 4, 5, 6, 7, 8]) {
      assert(new RegExp(`^\\| ${nummer}\\. `, "m").test(text), `${blatt} trägt kein Muster ${nummer}`);
    }
    const pfade = [...text.matchAll(/`(\.ara\/templates\/[^`\s]+)`/g)].map((m) => m[1]);
    assert(pfade.length >= 7, `${blatt} nennt nur ${pfade.length} Dateien im Kit`);
    for (const pfad of pfade) assert(existsSync(join(ROOT, pfad)), `${blatt} nennt ${pfad}, die Datei fehlt`);
    const blaetter = pfade.filter((pfad) => pfad.endsWith(`/README${endung}`));
    assert(blaetter.length === 7, `${blatt} nennt ${blaetter.length} Blätter der Muster, erwartet sind sieben`);
    // Was das Blatt der Dokumente über die Bibliothek sagt, steht so in der Bibliothek.
    const dokumente = readFileSync(join(PATTERNS, "documents", `README${endung}`), "utf8");
    for (const wort of ["quelle", "art", "hoehe", "pdf-dateien", "Dokumentanzeige", "Dateiablage"]) {
      assert(dokumente.includes(wort), `documents/README${endung} nennt ${wort} nicht`);
    }
  }
  // Und /app kennt sie in der Ideenphase: der Befehl lädt das Blatt, die
  // Prüfliste fragt danach, --new nennt es.
  for (const [datei, muster] of [
    [".ara/commands/all/app.md", /app-patterns\.md/],
    [".ara/commands/all/app.de.md", /app-patterns\.de\.md/],
    [".ara/knowledge/app.md", /app-patterns\.md/],
    [".ara/knowledge/app.de.md", /app-patterns\.de\.md/],
    [".ara/tools/app.mjs", /app-patterns\.md[\s\S]*app-patterns\.de\.md/],
  ]) {
    assert(muster.test(readFileSync(join(ROOT, datei), "utf8")), `${datei} nennt das Blatt der Muster nicht`);
  }
  return "acht Muster, beide Fassungen, Befehl, Prüfliste und --new";
});

check("Die Vorlage trägt die Dokumentanzeige, und das Muster Dokumente benutzt sie richtig", () => {
  // Muster 2 stützt sich auf einen Baustein, der erst seit Fassung 4.1.0 in der
  // Bibliothek liegt. Die Namen der Eigenschaften kommen aus der Bibliothek und
  // nicht aus dem Gedächtnis: `quelle` und `art` müssen dort stehen, und die
  // Seite des Musters muss genau die übergeben.
  const spiegel = join(ROOT, ".ara", "templates", "app", "frontend", "src", "marken");
  const bibliothek = readLibrary(spiegel);
  assert(bibliothek?.fassung, "die Vorlage trägt keine Bibliothek");
  const [gross, klein] = bibliothek.fassung.split(".").map(Number);
  assert(gross > 4 || (gross === 4 && klein >= 1), `die Bibliothek der Vorlage steht auf ${bibliothek.fassung}, die Dokumentanzeige kam mit 4.1.0`);
  const anzeige = join(spiegel, "muster", "Dokumentanzeige.tsx");
  assert(existsSync(anzeige), "muster/Dokumentanzeige.tsx fehlt im Spiegel der Vorlage");
  const quelle = readFileSync(anzeige, "utf8");
  for (const eigenschaft of ["quelle?:", "art?:", "name?:", "hoehe?:", "kennzeichen?:"]) {
    assert(quelle.includes(eigenschaft), `die Dokumentanzeige kennt ${eigenschaft.replace("?:", "")} nicht mehr`);
  }
  assert(/export \{ Dokumentanzeige \}/.test(readFileSync(join(spiegel, "muster", "index.ts"), "utf8")), "muster/index.ts führt die Dokumentanzeige nicht");

  const seite = readFileSync(join(PATTERNS, "documents", "frontend", "src", "seiten", "dokumente.tsx"), "utf8");
  assert(/import \{[^}]*Dokumentanzeige[^}]*\} from "@marken"/.test(seite), "die Seite holt die Dokumentanzeige nicht aus @marken");
  assert(/<Dokumentanzeige[\s\S]*?quelle=\{[\s\S]*?art=\{/.test(seite), "die Seite übergibt der Dokumentanzeige nicht quelle und art");
  assert(/vorschau=\{false\}/.test(seite), "die Dateiablage der Seite zeigt eine zweite Vorschau");

  // Der Bau der Vorlage legt die Stützdateien von pdf.js neben die Chunks, und
  // die Abhängigkeit steht in der package.json: ohne beides endet ein PDF im
  // Fehlerzustand, und das sähe man erst am Gerät.
  const paket = JSON.parse(readFileSync(join(ROOT, ".ara", "templates", "app", "frontend", "package.json"), "utf8"));
  assert(paket.dependencies["pdfjs-dist"], "pdfjs-dist fehlt in der package.json der Vorlage");
  assert(/pdf-dateien/.test(readFileSync(join(ROOT, ".ara", "templates", "app", "frontend", "vite.config.ts"), "utf8")), "die vite.config.ts der Vorlage legt pdf-dateien nicht bei");

  // In eine App aus der Vorlage gelegt, hält das Muster den Standard.
  const kopie = mkdtempSync(join(tmpdir(), "ara-muster-"));
  try {
    cpSync(join(ROOT, ".ara", "templates", "app"), kopie, { recursive: true });
    cpSync(join(PATTERNS, "documents"), kopie, { recursive: true });
    const befunde = standardFindings(kopie, { scaffold: true });
    assert(befunde.length === 0, `das Muster Dokumente steht neben der Bibliothek: ${befunde.join(" | ")}`);
  } finally {
    rmSync(kopie, { recursive: true, force: true });
  }
  return `Bibliothek ${bibliothek.fassung}, quelle und art, pdf-dateien, Standard gehalten`;
});

await checkAsync("Das Muster Dokumente läuft im Backend der Vorlage: hochladen, zeigen, entfernen", async () => {
  // So, wie das Blatt es sagt: die Dateien des Musters über die Vorlage, drei
  // Zeilen in server.mjs, und dann läuft es. Geprüft wird an einer Kopie der
  // Vorlage, ohne Gerät: die Dokumente brauchen keines.
  const paket = mkdtempSync(join(tmpdir(), "ara-dokumente-"));
  let app = null;
  try {
    cpSync(join(ROOT, ".ara", "templates", "app", "backend"), paket, { recursive: true });
    cpSync(join(PATTERNS, "documents", "backend"), paket, { recursive: true });
    const server = join(paket, "server.mjs");
    let quelle = readFileSync(server, "utf8");
    const naehte = [
      [
        'import { geraet as anschluss, vereinbarungLesen } from "./arasul.mjs";\n',
        'import { geraet as anschluss, vereinbarungLesen } from "./arasul.mjs";\n' +
          'import { dokumentAblage } from "./ablage/dokumente.mjs";\n' +
          'import { dokumente as dokumentKern } from "./kern/dokumente.mjs";\n' +
          'import { dokumentWege } from "./wege/dokumente.mjs";\n',
      ],
      [
        "  regel: () => (VIER_AUGEN ? { ohne_einreicher: true } : null),\n});\n",
        "  regel: () => (VIER_AUGEN ? { ohne_einreicher: true } : null),\n});\n" +
          "const dokumente = dokumentWege({\n" +
          "  kern: dokumentKern({ ablage: dokumentAblage(db) }),\n" +
          "  von: (anfrage) => geraet.angemeldet(anfrage.headers).benutzer,\n" +
          "});\n",
      ],
      [
        "  json(antwort, 404, { fehler: `${NAME} kennt ${pfad} nicht.` });",
        "  if (await dokumente(anfrage, antwort, pfad)) return;\n\n  json(antwort, 404, { fehler: `${NAME} kennt ${pfad} nicht.` });",
      ],
    ];
    for (const [alt, neu] of naehte) {
      assert(quelle.includes(alt), `die Naht in server.mjs, an der das Muster hängt, gibt es nicht mehr: ${alt.split("\n")[0]}`);
      quelle = quelle.replace(alt, neu);
    }
    writeFileSync(server, quelle);
    // Kein Gerät, aber die Namen der Kopfzeilen, so wie ein Kontrakt sie nennt:
    // wer hochlädt, liest die App aus der Anmeldung und nicht aus ihrem Quelltext.
    const vereinbarung = appArrangement({ koepfe: VORLAGE_KONTRAKT.koepfe, endpunkte: [] }, { device: "selbsttest" });
    writeFileSync(join(paket, ARRANGEMENT_FILE), arrangementFile(vereinbarung));

    app = spawn("node", [server], {
      env: { ...process.env, PORT: "0", ARASUL_APP_NAME: "Probe", APP_DATEN: join(paket, "daten") },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let ausgabe = "";
    let fehlerausgabe = "";
    app.stderr.on("data", (stueck) => (fehlerausgabe += String(stueck)));
    const basis = await new Promise((fertig, gescheitert) => {
      const zeit = setTimeout(() => gescheitert(new Error(`die App hat nicht gestartet: ${fehlerausgabe}`)), 10_000);
      app.stdout.on("data", (stueck) => {
        ausgabe += String(stueck);
        const treffer = ausgabe.match(/auf (\d+)/);
        if (treffer) {
          clearTimeout(zeit);
          fertig(`http://127.0.0.1:${treffer[1]}`);
        }
      });
    });
    await new Promise((fertig) => setTimeout(fertig, 300));
    assert(/002-dokumente\.sql/.test(ausgabe), `die zweite Migration lief nicht: ${ausgabe}`);

    const kopf = {
      [VORLAGE_KONTRAKT.koepfe.benutzer]: Buffer.from("Jürgen", "utf8").toString("latin1"),
      [VORLAGE_KONTRAKT.koepfe.rolle]: "mitarbeiter",
    };
    const hoch = (name, art, bytes) =>
      fetch(`${basis}/dokumente`, {
        method: "POST",
        body: bytes,
        headers: { ...kopf, "content-type": art, "x-dateiname": encodeURIComponent(name) },
      });
    const pdf = Buffer.from("%PDF-1.4\n%selbsttest\n%%EOF\n");
    let antwort = await hoch("Angebot Müller.pdf", "application/pdf", pdf);
    let daten = await antwort.json();
    assert(antwort.status === 201, `PDF abgewiesen: ${JSON.stringify(daten)}`);
    assert(daten.dokument.name === "Angebot Müller.pdf" && daten.dokument.von === "Jürgen", `Name oder Einreicher kommen nicht an: ${JSON.stringify(daten.dokument)}`);
    assert(daten.dokument.art === "application/pdf" && daten.dokument.groesse === pdf.length, "Art oder Größe stimmen nicht");
    assert(!("inhalt" in daten.dokument), "die Antwort trägt die Bytes mit");

    antwort = await hoch("tabelle.xlsx", "application/vnd.ms-excel", Buffer.from("x"));
    daten = await antwort.json();
    assert(antwort.status === 400 && /PDF und Bilder/.test(daten.fehler), `eine Tabelle wurde angenommen: ${antwort.status} ${JSON.stringify(daten)}`);

    antwort = await hoch("gross.pdf", "application/pdf", Buffer.alloc(10 * 1024 * 1024 + 1));
    daten = await antwort.json();
    assert(antwort.status === 413 && /Bytes/.test(daten.fehler), `über der Grenze kam kein 413 mit Satz: ${antwort.status} ${JSON.stringify(daten)}`);

    antwort = await fetch(`${basis}/dokumente`, { headers: kopf });
    daten = await antwort.json();
    assert(daten.dokumente.length === 1 && daten.grenze_bytes > 0, `die Liste stimmt nicht: ${JSON.stringify(daten)}`);
    assert(!("inhalt" in daten.dokumente[0]), "die Liste trägt die Bytes mit");

    antwort = await fetch(`${basis}/dokumente/${daten.dokumente[0].id}/datei`, { headers: kopf });
    const bytes = Buffer.from(await antwort.arrayBuffer());
    assert(antwort.status === 200 && bytes.equals(pdf), "die Bytes kommen nicht so zurück, wie sie hineingingen");
    assert(antwort.headers.get("content-type") === "application/pdf", `falscher Typ: ${antwort.headers.get("content-type")}`);
    assert(/inline; filename\*=UTF-8''Angebot%20M%C3%BCller\.pdf/.test(antwort.headers.get("content-disposition") || ""), "der Name steht nicht kodiert in der Antwort");
    assert(/no-store/.test(antwort.headers.get("cache-control") || ""), "ein Dokument darf in keinem Zwischenspeicher liegen");

    antwort = await fetch(`${basis}/dokumente/99/datei`, { headers: kopf });
    assert(antwort.status === 404, "ein Dokument, das es nicht gibt, antwortet nicht mit 404");
    antwort = await fetch(`${basis}/dokumente/1`, { method: "DELETE", headers: kopf });
    assert(antwort.status === 200, "Entfernen ging nicht");
    antwort = await fetch(`${basis}/dokumente/1`, { method: "DELETE", headers: kopf });
    assert(antwort.status === 404, "ein zweites Entfernen antwortet nicht mit 404");
    // Die Wege der Vorlage bleiben, wie sie sind.
    antwort = await fetch(`${basis}/vorgaenge`, { headers: kopf });
    assert(antwort.status === 200, "die Vorgänge der Vorlage antworten nicht mehr");
    antwort = await fetch(`${basis}/nix`, { headers: kopf });
    assert(antwort.status === 404, "ein fremder Weg antwortet nicht mehr mit 404");
    return "Migration, PDF angenommen, Tabelle abgewiesen, 413 über der Grenze, Bytes zurück, entfernt";
  } finally {
    app?.kill("SIGTERM");
    rmSync(paket, { recursive: true, force: true });
  }
});

await checkAsync("Das Muster Dokument auslesen spricht mit einem gespielten Gerät: Felder, Mängel, Protokoll", async () => {
  // So, wie das Blatt es sagt: Vorlage, darüber das Muster Dokumente, darüber
  // dieses. Das Gerät ist gespielt und nennt seine Werte anders als der Orin;
  // es nimmt die Datei als Formular, wie das echte, und antwortet in dessen Form.
  const paket = mkdtempSync(join(tmpdir(), "ara-auslesen-"));
  let app = null;
  const gesehen = [];
  let modus = "gut";
  const geraet = createServer((anfrage, antwort) => {
    const teile = [];
    anfrage.on("data", (s) => teile.push(s));
    anfrage.on("end", async () => {
      const url = new URL(anfrage.url, "http://x");
      const json = (code, daten) => {
        antwort.writeHead(code, { "content-type": "application/json" });
        antwort.end(JSON.stringify(daten));
      };
      if (anfrage.headers["x-arasul-app-key"] !== "aras_selbsttest") return json(401, { error: { message: "kein Schlüssel" } });
      if (anfrage.method !== "POST" || url.pathname !== "/api/v1/external/document/extract-structured") {
        return json(404, { error: { message: url.pathname } });
      }
      const formular = await new Request("http://x", {
        method: "POST",
        headers: { "content-type": anfrage.headers["content-type"] },
        body: Buffer.concat(teile),
      }).formData();
      const datei = formular.get("file");
      gesehen.push({
        name: datei?.name,
        bytes: datei ? Buffer.from(await datei.arrayBuffer()) : null,
        schema: JSON.parse(formular.get("schema") || "null"),
        anweisung: formular.get("instructions"),
        modell: formular.get("model"),
        fuer: anfrage.headers[VORLAGE_KONTRAKT.protokoll.einreicher.kopf] ?? null,
      });
      if (modus === "fehler") return json(500, { success: false, error: "Client disconnected" });
      if (modus === "ausgelastet") return json(408, { error: { message: "Request timeout" } });
      if (modus === "voll") return json(504, { error: { message: "Gateway Timeout" } });
      if (modus === "verboten") return json(403, { error: { message: "Scope document:extract missing" } });
      const gemeinsam = { model: "probe-modell:1b", processing_time_ms: 1234, metadata: { ocr_used: true }, char_count: 321, job_id: "auftrag-1" };
      if (modus === "roh") return json(200, { success: true, data: null, raw_response: "Das kann ich nicht lesen.", ...gemeinsam });
      return json(200, {
        success: true,
        data: { belegdatum: "2026-09-01", betrag_brutto: 208.85, waehrung: "EUR", aussteller: "Bürobedarf Probe GmbH", steuersatz: 16 },
        ...gemeinsam,
      });
    });
  });
  await new Promise((fertig) => geraet.listen(0, "127.0.0.1", fertig));
  try {
    cpSync(join(ROOT, ".ara", "templates", "app", "backend"), paket, { recursive: true });
    cpSync(join(PATTERNS, "documents", "backend"), paket, { recursive: true });
    cpSync(join(PATTERNS, "extract", "backend"), paket, { recursive: true });
    const server = join(paket, "server.mjs");
    let quelle = readFileSync(server, "utf8");
    for (const [alt, neu] of [
      [
        'import { geraet as anschluss, vereinbarungLesen } from "./arasul.mjs";\n',
        'import { geraet as anschluss, vereinbarungLesen } from "./arasul.mjs";\n' +
          'import { dokumentAblage } from "./ablage/dokumente.mjs";\n' +
          'import { dokumente as dokumentKern } from "./kern/dokumente.mjs";\n' +
          'import { dokumentWege } from "./wege/dokumente.mjs";\n' +
          'import { auslesungsAblage } from "./ablage/auslesungen.mjs";\n' +
          'import { auslesen as auslesenKern } from "./kern/auslesen.mjs";\n' +
          'import { auslesenWege } from "./wege/auslesen.mjs";\n',
      ],
      [
        "  regel: () => (VIER_AUGEN ? { ohne_einreicher: true } : null),\n});\n",
        "  regel: () => (VIER_AUGEN ? { ohne_einreicher: true } : null),\n});\n" +
          "const dokumente = dokumentWege({\n" +
          "  kern: dokumentKern({ ablage: dokumentAblage(db) }),\n" +
          "  von: (anfrage) => geraet.angemeldet(anfrage.headers).benutzer,\n" +
          "});\n" +
          "const auslesen = auslesenWege({\n" +
          "  kern: auslesenKern({ dokumente: dokumentAblage(db), auslesungen: auslesungsAblage(db), geraet }),\n" +
          "  von: (anfrage) => geraet.angemeldet(anfrage.headers).benutzer,\n" +
          "});\n",
      ],
      [
        "  json(antwort, 404, { fehler: `${NAME} kennt ${pfad} nicht.` });",
        "  if (await auslesen(anfrage, antwort, pfad)) return;\n  if (await dokumente(anfrage, antwort, pfad)) return;\n\n  json(antwort, 404, { fehler: `${NAME} kennt ${pfad} nicht.` });",
      ],
    ]) {
      assert(quelle.includes(alt), `die Naht in server.mjs, an der das Muster hängt, gibt es nicht mehr: ${alt.split("\n")[0]}`);
      quelle = quelle.replace(alt, neu);
    }
    writeFileSync(server, quelle);
    writeFileSync(join(paket, ARRANGEMENT_FILE), arrangementFile(appArrangement(VORLAGE_KONTRAKT, { device: "selbsttest", date: today() })));

    app = spawn("node", [server], {
      env: {
        ...process.env,
        PORT: "0",
        ARASUL_APP_NAME: "Probe",
        APP_DATEN: join(paket, "daten"),
        ARASUL_BASIS_URL: `http://127.0.0.1:${geraet.address().port}`,
        ARASUL_APP_KEY: "aras_selbsttest",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let ausgabe = "";
    let fehlerausgabe = "";
    app.stderr.on("data", (stueck) => (fehlerausgabe += String(stueck)));
    const basis = await new Promise((fertig, gescheitert) => {
      const zeit = setTimeout(() => gescheitert(new Error(`die App hat nicht gestartet: ${fehlerausgabe}`)), 10_000);
      app.stdout.on("data", (stueck) => {
        ausgabe += String(stueck);
        const treffer = ausgabe.match(/auf (\d+)/);
        if (treffer) {
          clearTimeout(zeit);
          fertig(`http://127.0.0.1:${treffer[1]}`);
        }
      });
    });
    await new Promise((fertig) => setTimeout(fertig, 300));
    assert(/003-auslesungen\.sql/.test(ausgabe), `die dritte Migration lief nicht: ${ausgabe}`);

    const kopf = { [VORLAGE_KONTRAKT.koepfe.benutzer]: Buffer.from("Jürgen", "utf8").toString("latin1") };
    const ruf = async (pfad, optionen = {}) => {
      const antwort = await fetch(`${basis}${pfad}`, { ...optionen, headers: { ...kopf, ...(optionen.headers || {}) } });
      return { code: antwort.status, daten: await antwort.json() };
    };
    let r = await ruf("/auslesen");
    assert(r.daten.kann === true, `das Muster sieht das Auslesen nicht, obwohl das Gerät es anbietet: ${JSON.stringify(r.daten)}`);
    // Die Seite beschriftet mit `title` und liest Datum und Betrag in de-DE:
    // Beschriftung und Art kommen mit der Lage.
    const felder = Object.fromEntries((r.daten.felder || []).map((f) => [f.name, f]));
    assert(
      felder.betrag_brutto?.titel === "Betrag brutto" && felder.betrag_brutto.art === "betrag" && felder.belegdatum?.art === "datum",
      `die Lage nennt Beschriftung und Art der Felder nicht: ${JSON.stringify(r.daten.felder)}`
    );

    const bild = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
    r = await ruf("/dokumente", { method: "POST", body: bild, headers: { "content-type": "image/png", "x-dateiname": encodeURIComponent("Quittung Büro.png") } });
    assert(r.code === 201, `das Foto wurde nicht angenommen: ${JSON.stringify(r.daten)}`);
    const id = r.daten.dokument.id;

    r = await ruf(`/dokumente/${id}/auslesen`, { method: "POST" });
    assert(r.code === 201, `Auslesen: ${r.code} ${JSON.stringify(r.daten)}`);
    const erste = r.daten.auslesung;
    assert(erste.felder?.aussteller === "Bürobedarf Probe GmbH" && erste.felder.betrag_brutto === 208.85, `die Felder kamen nicht an: ${JSON.stringify(erste)}`);
    assert(erste.modell === "probe-modell:1b" && erste.texterkennung === true && erste.dauer_ms === 1234, `das Protokoll fehlt: ${JSON.stringify(erste)}`);
    assert(erste.von === "Jürgen", `wer auslesen ließ, kommt nicht aus der Anmeldung: ${erste.von}`);
    assert(erste.maengel.some((satz) => /^Steuersatz 16 %/.test(satz)) && !erste.maengel.some((satz) => /steuersatz|betrag_brutto|belegdatum/.test(satz)), `ein Steuersatz, den es nicht gibt, fiel nicht auf: ${JSON.stringify(erste.maengel)}`);
    const ankunft = gesehen[0];
    assert(ankunft.name === "Quittung Büro.png" && ankunft.bytes?.equals(bild), `die Datei kam am Gerät anders an: ${ankunft.name}`);
    assert(ankunft.schema?.required?.includes("belegdatum") && ankunft.anweisung, "Schema oder Anweisung kamen am Gerät nicht an");
    const ohneTitel = Object.entries(ankunft.schema.properties).filter(([, regel]) => !regel.title).map(([name]) => name);
    assert(ohneTitel.length === 0, `das Schema der Vorlage trägt kein title an: ${ohneTitel.join(", ")}`);
    assert(ankunft.modell === null, "die App nennt ein Modell, statt die Vorgabe des Geräts zu nehmen");
    // Für wen gelesen wurde, kommt am Gerät in der Kopfzeile aus `protokoll`
    // an, mit denselben Bytes, die die Plattform der App gegeben hat.
    assert(
      ankunft.fuer === Buffer.from("Jürgen", "utf8").toString("latin1"),
      `der Mensch kam am Gerät nicht in der Kopfzeile aus dem Kontrakt an: ${JSON.stringify(ankunft.fuer)}`
    );
    assert(erste.auftrag === "auftrag-1", `der Auftrag des Geräts steht nicht an der Auslesung: ${erste.auftrag}`);

    modus = "roh";
    r = await ruf(`/dokumente/${id}/auslesen`, { method: "POST" });
    assert(r.code === 201 && r.daten.auslesung.felder === null && /keine Felder/.test(r.daten.auslesung.fehler || ""), `eine Antwort ohne Felder wurde nicht benannt: ${JSON.stringify(r.daten)}`);
    assert(/nicht lesen/.test(r.daten.auslesung.roh || ""), "die rohe Antwort des Modells fehlt im Protokoll");

    // Jeder Fehler des Geräts kommt als Satz je Klasse an, die Zeile mit Weg
    // und Status steht im Protokoll des Containers und nirgends sonst.
    for (const [art, satz, zeile] of [
      ["fehler", /Modell ist am Gerät gescheitert/, /Status 500 beantwortet: Client disconnected/],
      ["ausgelastet", /ausgelastet.*Bitte erneut auslesen/, /Status 408 beantwortet: Request timeout/],
      ["voll", /ausgelastet.*Bitte erneut auslesen/, /Status 504 beantwortet/],
      ["verboten", /Administrator hat das Auslesen .*nicht freigegeben/, /Status 403 beantwortet: Scope/],
    ]) {
      modus = art;
      r = await ruf(`/dokumente/${id}/auslesen`, { method: "POST" });
      const fehler = r.daten.auslesung?.fehler || "";
      assert(r.code === 201 && satz.test(fehler), `${art}: kein Satz für den Menschen: ${JSON.stringify(r.daten)}`);
      assert(!/\b(408|403|500|504)\b|POST|extract-structured|Status/.test(fehler), `${art}: die HTTP-Zeile steht an der Auslesung: ${fehler}`);
      assert(zeile.test(fehlerausgabe), `${art}: die technische Zeile fehlt im Protokoll: ${fehlerausgabe}`);
    }
    assert(!/aras_selbsttest/.test(fehlerausgabe + ausgabe), "der Schlüssel steht im Protokoll");

    // Das Protokoll bleibt, auch wenn das Dokument geht.
    r = await ruf(`/dokumente/${id}`, { method: "DELETE" });
    assert(r.code === 200, "das Dokument ließ sich nicht entfernen");
    r = await ruf(`/dokumente/${id}/auslesungen`);
    assert(r.daten.auslesungen.length === 6 && r.daten.auslesungen[0].fehler && r.daten.auslesungen[5].felder, `das Protokoll ist nicht vollständig oder nicht neueste zuerst: ${JSON.stringify(r.daten)}`);
    r = await ruf(`/dokumente/${id}/auslesen`, { method: "POST" });
    assert(r.code === 404, "ein entferntes Dokument wurde ausgelesen");

    // Ohne den Weg im Kontrakt sagt der Kern, dass es hier nicht geht.
    const { auslesen } = await import(join(PATTERNS, "extract", "backend", "kern", "auslesen.mjs"));
    const ohne = auslesen({ dokumente: {}, auslesungen: {}, geraet: { warumKeinRahmen: () => null, kannAuslesen: () => false } }).lage();
    assert(!ohne.kann && /nicht an/.test(ohne.grund), `ohne den Weg: ${JSON.stringify(ohne)}`);
    return "Formular am Gerät, Felder, Mangel am Steuersatz, Modell und Texterkennung im Protokoll, rohe Antwort und Fehler benannt, Protokoll bleibt";
  } finally {
    app?.kill("SIGTERM");
    geraet.close();
    rmSync(paket, { recursive: true, force: true });
  }
});

await checkAsync("Die Vorlage nennt jedem Modellaufruf seinen Menschen, wie der Kontrakt es sagt, und sonst keinem Weg", async () => {
  // Das Gerät protokolliert jeden Modellaufruf einer App, den Menschen aber nur,
  // wenn die App ihn nennt. Geprüft an `arasul.mjs` der Vorlage selbst, gegen
  // ein gespieltes Gerät, dessen Kopfzeile anders heißt als am Orin.
  const { geraet: anschluss } = await import(join(ROOT, ".ara", "templates", "app", "backend", "arasul.mjs"));
  const gesehen = [];
  const geraet = createServer((anfrage, antwort) => {
    const teile = [];
    anfrage.on("data", (s) => teile.push(s));
    anfrage.on("end", () => {
      const url = new URL(anfrage.url, "http://x");
      const rumpf = Buffer.concat(teile);
      gesehen.push({ weg: url.pathname, fuer: anfrage.headers["x-geraet-fuer"] ?? null, roh: rumpf });
      antwort.writeHead(200, { "content-type": "application/json" });
      if (url.pathname.endsWith("/llm/chat")) {
        return antwort.end(JSON.stringify({ success: true, response: "Ein Satz.", model: "probe-modell:1b", job_id: "auftrag-9", processing_time_ms: 5 }));
      }
      if (url.pathname.endsWith("/document/extract-structured")) {
        return antwort.end(JSON.stringify({ success: true, data: { a: 1 }, model: "probe-modell:1b", job_id: "auftrag-8" }));
      }
      antwort.end(JSON.stringify({ data: { run_id: 3 } }));
    });
  });
  await new Promise((fertig) => geraet.listen(0, "127.0.0.1", fertig));
  try {
    const umgebung = { ARASUL_BASIS_URL: `http://127.0.0.1:${geraet.address().port}`, ARASUL_APP_KEY: "aras_selbsttest" };
    const vereinbarung = JSON.parse(arrangementFile(appArrangement(VORLAGE_KONTRAKT, { device: "selbsttest", date: today() })));
    const g = anschluss(vereinbarung, umgebung, { name: "Probe", flow: "freigabe" });
    const roh = Buffer.from("Jürgen", "utf8").toString("latin1");

    const gelesen = await g.auslesen({ datei: Buffer.from("%PDF-1.4"), name: "a.pdf", art: "application/pdf", schema: { type: "object" }, anweisung: "x", nutzer: "Jürgen" });
    assert(gelesen.felder?.a === 1 && gelesen.auftrag === "auftrag-8", `das Auslesen kam nicht an: ${JSON.stringify(gelesen)}`);
    assert(g.kannFragen(), "die Vorlage sieht den Weg zu einem Modell nicht, obwohl das Gerät ihn nennt");
    const gefragt = await g.fragen({ prompt: "Wie heißt das?", bilder: ["aGFsbG8="], nutzer: "Jürgen" });
    assert(gefragt.antwort === "Ein Satz." && gefragt.auftrag === "auftrag-9" && gefragt.modell === "probe-modell:1b", `die Frage kam nicht an: ${JSON.stringify(gefragt)}`);
    const frage = JSON.parse(gesehen[1].roh.toString("utf8"));
    assert(frage.images?.[0] === "aGFsbG8=" && !("model" in frage), `Bild oder Modell gingen anders an das Gerät: ${JSON.stringify(frage)}`);
    await g.flowStarten({ vorgang: "1" }, { einreicher: "Jürgen" });

    assert(gesehen[0].fuer === roh, `beim Auslesen fehlte der Mensch oder kam verändert an: ${gesehen[0].fuer}`);
    assert(gesehen[1].fuer === roh, `bei der Frage an ein Modell fehlte der Mensch: ${gesehen[1].fuer}`);
    assert(gesehen[2].fuer === null, "der Start eines Laufs bekam die Kopfzeile, obwohl er kein Modellaufruf ist");

    // Ohne `nutzer` geht keine Kopfzeile mit; der Aufruf steht dann ohne Menschen im Protokoll.
    await g.fragen({ prompt: "Ohne" });
    assert(gesehen[3].fuer === null, "ohne Namen ging trotzdem eine Kopfzeile mit");

    // Für einen eigenen Aufruf, etwa an `/v1`: Kopfzeile und Feld aus der Vereinbarung.
    const fuer = g.fuer("Jürgen");
    assert(fuer.kopfzeilen["x-geraet-fuer"] === roh && fuer.openai.user === "Jürgen", `fuer() nennt nicht, was der Kontrakt sagt: ${JSON.stringify(fuer)}`);

    // Ein Gerät vor dem 26.09.2026 nennt kein `protokoll`: dann geht keine Kopfzeile mit.
    const { protokoll, ...ohneProtokoll } = VORLAGE_KONTRAKT;
    const alt = anschluss(JSON.parse(arrangementFile(appArrangement(ohneProtokoll, {}))), umgebung, { name: "Probe", flow: "freigabe" });
    await alt.fragen({ prompt: "Alt", nutzer: "Jürgen" });
    assert(gesehen[4].fuer === null, "ein Gerät ohne `protokoll` bekam eine Kopfzeile, die es nicht erwartet");
    assert(JSON.stringify(alt.fuer("Jürgen")) === JSON.stringify({ kopfzeilen: {}, openai: {} }), "fuer() erfindet ohne `protokoll` Namen");

    // Und der Name der Kopfzeile steht nirgends in der Vorlage: er kommt aus der Vereinbarung.
    const quelle = readFileSync(join(ROOT, ".ara", "templates", "app", "backend", "arasul.mjs"), "utf8");
    assert(!/x-arasul-user/i.test(quelle.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")), "die Vorlage trägt den Namen der Kopfzeile im Code");
    return "Auslesen und Frage mit dem Menschen in denselben Bytes, Lauf ohne, ohne Namen ohne, fuer() für /v1, altes Gerät ohne";
  } finally {
    geraet.close();
  }
});

await checkAsync("Das Muster Mandanten trennt zwei Konten und zwei Mandanten, und entscheiden darf nur, wer als Entscheider zugeordnet ist", async () => {
  // So, wie das Blatt es sagt: die Vorlage, darüber das Muster, die Zeilen aus
  // dem Kopf von wege/mandanten.mjs in server.mjs. Das Gerät ist gespielt, und
  // seine Rollen heißen nicht so wie am Orin: ein Muster, das eine Rolle fest
  // im Quelltext trägt, findet hier keine Verwaltung.
  const kontrakt = {
    ...VORLAGE_KONTRAKT,
    koepfe: { benutzer: "x-geraet-wer", rolle: "x-geraet-rolle", rollen: ["leitung", "team"] },
    freigaben: { ...VORLAGE_KONTRAKT.freigaben, rollen: ["leitung"] },
  };
  const paket = mkdtempSync(join(tmpdir(), "ara-mandanten-"));
  let app = null;
  const starts = [];
  let freigaben = [];
  const geraet = createServer((anfrage, antwort) => {
    const teile = [];
    anfrage.on("data", (s) => teile.push(s));
    anfrage.on("end", () => {
      const url = new URL(anfrage.url, "http://x");
      const json = (code, daten) => {
        antwort.writeHead(code, { "content-type": "application/json" });
        antwort.end(JSON.stringify(daten));
      };
      if (anfrage.headers["x-arasul-app-key"] !== "aras_selbsttest") return json(401, { error: { message: "kein Schlüssel" } });
      if (anfrage.method === "POST" && url.pathname === "/api/v1/external/flows/freigabe/run") {
        starts.push(JSON.parse(Buffer.concat(teile).toString("utf8")));
        return json(202, { data: { run_id: starts.length } });
      }
      if (url.pathname === "/api/v1/external/freigaben") return json(200, { data: { freigaben } });
      if (url.pathname.startsWith("/api/v1/external/flows/runs/")) return json(200, { data: { status: "fertig", result: "genehmigt" } });
      json(404, { error: { message: url.pathname } });
    });
  });
  await new Promise((fertig) => geraet.listen(0, "127.0.0.1", fertig));
  try {
    cpSync(join(ROOT, ".ara", "templates", "app", "backend"), paket, { recursive: true });
    cpSync(join(PATTERNS, "clients", "backend"), paket, { recursive: true });
    // Die Zeilen, die der Kopf der Wege nennt, genau so eingesetzt.
    const kopfDerWege = readFileSync(join(PATTERNS, "clients", "backend", "wege", "mandanten.mjs"), "utf8");
    const zeilen = kopfDerWege
      .split("\n")
      .filter((zeile) => zeile.startsWith(" *   "))
      .map((zeile) => zeile.slice(5));
    const importe = zeilen.filter((zeile) => zeile.startsWith("import ")).join("\n") + "\n";
    const beginn = zeilen.findIndex((zeile) => zeile.startsWith("const mandantenFall"));
    const ende = zeilen.findIndex((zeile, i) => i > beginn && zeile === "});");
    const aufbau = zeilen.slice(beginn, ende + 1).join("\n") + "\n";
    assert(importe.includes("mandantenWege") && aufbau.includes("regel: mandantenFall.regel"), `der Kopf von wege/mandanten.mjs nennt die Zeilen nicht mehr: ${aufbau}`);
    const server = join(paket, "server.mjs");
    let quelle = readFileSync(server, "utf8");
    for (const [alt, neu] of [
      [
        'import { geraet as anschluss, vereinbarungLesen } from "./arasul.mjs";\n',
        'import { geraet as anschluss, vereinbarungLesen } from "./arasul.mjs";\n' + importe,
      ],
      ["  regel: () => (VIER_AUGEN ? { ohne_einreicher: true } : null),\n});\n", "  regel: () => (VIER_AUGEN ? { ohne_einreicher: true } : null),\n});\n" + aufbau],
      ['  if (pfad === "/vorgaenge" && anfrage.method === "GET") {', '  if (await mandanten(anfrage, antwort, pfad)) return;\n\n  if (pfad === "/vorgaenge" && anfrage.method === "GET") {'],
    ]) {
      assert(quelle.includes(alt), `die Naht in server.mjs, an der das Muster hängt, gibt es nicht mehr: ${alt.split("\n")[0]}`);
      quelle = quelle.replace(alt, neu);
    }
    writeFileSync(server, quelle);
    writeFileSync(join(paket, ARRANGEMENT_FILE), arrangementFile(appArrangement(kontrakt, { device: "selbsttest", date: today() })));

    app = spawn("node", [server], {
      env: {
        ...process.env,
        PORT: "0",
        ARASUL_APP_NAME: "Probe",
        APP_DATEN: join(paket, "daten"),
        ARASUL_BASIS_URL: `http://127.0.0.1:${geraet.address().port}`,
        ARASUL_APP_KEY: "aras_selbsttest",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let ausgabe = "";
    let fehlerausgabe = "";
    app.stderr.on("data", (stueck) => (fehlerausgabe += String(stueck)));
    const basis = await new Promise((fertig, gescheitert) => {
      const zeit = setTimeout(() => gescheitert(new Error(`die App hat nicht gestartet: ${fehlerausgabe}`)), 10_000);
      app.stdout.on("data", (stueck) => {
        ausgabe += String(stueck);
        const treffer = ausgabe.match(/auf (\d+)/);
        if (treffer) {
          clearTimeout(zeit);
          fertig(`http://127.0.0.1:${treffer[1]}`);
        }
      });
    });
    await new Promise((fertig) => setTimeout(fertig, 300));
    assert(/004-mandanten\.sql/.test(ausgabe), `die Migration der Mandanten lief nicht: ${ausgabe} ${fehlerausgabe}`);

    // Wer fragt, steht in den Kopfzeilen, als UTF-8 wie am Gerät.
    const ruf = async (wer, rolle, pfad, optionen = {}) => {
      const kopf = { "content-type": "application/json" };
      if (wer) kopf[kontrakt.koepfe.benutzer] = Buffer.from(wer, "utf8").toString("latin1");
      if (rolle) kopf[kontrakt.koepfe.rolle] = rolle;
      const antwort = await fetch(`${basis}${pfad}`, { ...optionen, headers: kopf });
      return { code: antwort.status, daten: await antwort.json() };
    };
    const post = (wer, rolle, pfad, rumpf) => ruf(wer, rolle, pfad, { method: "POST", body: JSON.stringify(rumpf) });

    // Jeder öffnet die App einmal, sonst kann ihn niemand zuordnen.
    for (const wer of ["Änne", "bernd", "carla", "emil"]) {
      const r = await ruf(wer, "team", "/mandanten");
      assert(r.code === 200 && r.daten.mandanten.length === 0 && r.daten.verwaltung === false, `${wer} sieht vor jeder Zuordnung etwas: ${JSON.stringify(r.daten)}`);
    }
    let r = await ruf("chefin", "leitung", "/mandanten");
    assert(r.daten.verwaltung === true, "die Rolle aus dem Kontrakt verwaltet nicht");
    r = await post("Änne", "team", "/mandanten", { name: "Eigenmächtig" });
    assert(r.code === 403, `ein Konto ohne die Rolle legt Mandanten an: ${r.code}`);
    r = await ruf("Änne", "team", "/zuordnungen");
    assert(r.code === 403, `ein Konto ohne die Rolle sieht die Zuordnungen: ${r.code}`);

    r = await post("chefin", "leitung", "/mandanten", { name: "Müller GmbH" });
    assert(r.code === 201, `Mandant A: ${JSON.stringify(r.daten)}`);
    const a = r.daten.mandant.id;
    r = await post("chefin", "leitung", "/mandanten", { name: "Schmidt KG" });
    const b = r.daten.mandant.id;
    r = await post("chefin", "leitung", "/mandanten", { name: "Schmidt KG" });
    assert(r.code === 409, "ein Mandant ließ sich zweimal anlegen");
    r = await post("chefin", "leitung", "/zuordnungen", { benutzer: "dora", mandant: a });
    assert(r.code === 400 && /noch nie/.test(r.daten.fehler), `ein nie gesehener Name wurde zugeordnet: ${JSON.stringify(r.daten)}`);
    // Sehen heißt nicht entscheiden: carla ist Partnerin bei A, Änne und emil
    // sehen A nur, bernd entscheidet bei B und ist dort allein.
    for (const [wer, mandant, entscheidet] of [["Änne", a, false], ["carla", a, true], ["emil", a, false], ["bernd", b, true]]) {
      r = await post("chefin", "leitung", "/zuordnungen", { benutzer: wer, mandant, entscheidet });
      assert(r.code === 201, `Zuordnung ${wer}: ${JSON.stringify(r.daten)}`);
    }
    r = await ruf("chefin", "leitung", "/zuordnungen");
    assert(r.daten.zuordnungen.length === 4 && r.daten.konten.some((k) => k.benutzer === "Änne"), `die Verwaltung sieht nicht alles: ${JSON.stringify(r.daten)}`);
    assert(
      r.daten.zuordnungen.filter((z) => z.entscheidet).map((z) => z.benutzer).sort().join(",") === "bernd,carla",
      `die Zuordnung sagt nicht, wer entscheidet: ${JSON.stringify(r.daten.zuordnungen)}`
    );
    assert(/006-entscheider\.sql/.test(ausgabe), `die Migration der Entscheider lief nicht: ${ausgabe}`);

    r = await ruf("Änne", "team", "/mandanten");
    assert(r.daten.mandanten.length === 1 && r.daten.mandanten[0].id === a, `Änne sieht mehr als ihren Mandanten: ${JSON.stringify(r.daten)}`);

    // Anlegen ist nicht einreichen: der Vorgang liegt in Arbeit, ohne Lauf.
    r = await post("Änne", "team", "/vorgaenge", { titel: "Beleg Müller", text: "Tankquittung", mandant: a });
    assert(r.code === 201 && r.daten.vorgang.mandant === a && r.daten.vorgang.status === "in arbeit" && r.daten.vorgang.lauf === null, `Vorgang in A: ${JSON.stringify(r.daten)}`);
    assert(starts.length === 0, "schon das Anlegen startet die Freigabe");
    const va = r.daten.vorgang.id;
    r = await ruf("Änne", "team", `/vorgaenge/${va}`, { method: "PUT", body: JSON.stringify({ titel: "Beleg Müller GmbH", text: "Tankquittung" }) });
    assert(r.code === 200 && r.daten.vorgang.titel === "Beleg Müller GmbH", `ein Vorgang in Arbeit ließ sich nicht ändern: ${r.code} ${JSON.stringify(r.daten)}`);
    r = await post("bernd", "team", `/vorgaenge/${va}/einreichen`, {});
    assert(r.code === 404 && starts.length === 0, `bernd reicht einen fremden Vorgang ein: ${r.code}`);

    // Einreichen: vier Augen, und entscheiden darf nur, wer bei diesem Mandanten entscheidet.
    r = await post("Änne", "team", `/vorgaenge/${va}/einreichen`, {});
    assert(r.code === 200 && r.daten.vorgang.status === "wartet" && String(r.daten.vorgang.lauf) === "1", `Einreichen in A: ${r.code} ${JSON.stringify(r.daten)}`);
    const start = starts[0];
    assert(start?.einreicher === "Änne", `der Einreicher fehlt am Start: ${JSON.stringify(start)}`);
    assert(
      JSON.stringify(start.freigabe) === JSON.stringify({ ohne_einreicher: true, entscheider: { konten: ["carla"] } }),
      `die Regel kommt nicht aus der Zuordnung: ${JSON.stringify(start.freigabe)}`
    );
    assert(!/Müller|Tankquittung/.test(JSON.stringify(start)), "Inhalt des Vorgangs steht im Lauf");
    // Nach dem Einreichen ändert sich nichts mehr.
    r = await post("Änne", "team", `/vorgaenge/${va}/einreichen`, {});
    assert(r.code === 409 && starts.length === 1, `ein Vorgang ließ sich zweimal einreichen: ${r.code}`);
    r = await ruf("Änne", "team", `/vorgaenge/${va}`, { method: "PUT", body: JSON.stringify({ titel: "Nachgeschoben" }) });
    assert(r.code === 409, `ein eingereichter Vorgang ließ sich ändern: ${r.code}`);

    r = await post("Änne", "team", "/vorgaenge", { titel: "Fremd", mandant: b });
    assert(r.code === 404, `Änne reicht bei einem fremden Mandanten ein: ${r.code}`);

    // Der fremde Mandant: nichts in der Liste, 404 am einzelnen Vorgang.
    r = await ruf("bernd", "team", "/vorgaenge");
    assert(r.code === 200 && r.daten.vorgaenge.length === 0, `bernd sieht Vorgänge von A: ${JSON.stringify(r.daten)}`);
    r = await ruf("bernd", "team", `/vorgaenge/${va}`);
    assert(r.code === 404 && !/Müller/.test(JSON.stringify(r.daten)), `bernd bekommt den Vorgang von A: ${r.code} ${JSON.stringify(r.daten)}`);
    r = await ruf("chefin", "leitung", `/vorgaenge/${va}`);
    assert(r.code === 404, "die Verwaltung sieht Vorgänge eines Mandanten, dem sie nicht zugeordnet ist");
    r = await ruf(null, null, "/vorgaenge");
    assert(r.code === 200 && r.daten.vorgaenge.length === 0, "ohne Anmeldung ist die Liste nicht leer");
    r = await ruf("carla", "team", `/vorgaenge/${va}`);
    assert(r.code === 200 && r.daten.vorgang.titel === "Beleg Müller GmbH", "carla sieht den Vorgang ihres Mandanten nicht");
    // Die Liste nennt, auf wen der Vorgang wartet, aus derselben Zuordnung.
    r = await ruf("Änne", "team", "/vorgaenge");
    const wartend = r.daten.vorgaenge.find((v) => v.id === va);
    assert(
      JSON.stringify(wartend?.entscheidet) === JSON.stringify({ konten: ["carla"], ohne: "Änne" }),
      `der wartende Vorgang nennt nicht, wer entscheidet: ${JSON.stringify(wartend?.entscheidet)}`
    );

    // Allein Entscheider: kein Lauf, der Vorgang bleibt in Arbeit, und der Satz sagt, warum.
    r = await post("bernd", "team", "/vorgaenge", { titel: "Beleg Schmidt", mandant: b });
    const vb = r.daten.vorgang.id;
    r = await post("bernd", "team", `/vorgaenge/${vb}/einreichen`, {});
    assert(r.code === 409 && /niemand/.test(r.daten.fehler), `allein Entscheider: ${r.code} ${JSON.stringify(r.daten)}`);
    r = await ruf("bernd", "team", `/vorgaenge/${vb}`);
    assert(r.daten.vorgang.status === "in arbeit" && /niemand/.test(r.daten.vorgang.hinweis), `der Satz steht nicht am Vorgang: ${JSON.stringify(r.daten)}`);
    assert(starts.length === 1, "für einen Vorgang ohne Entscheider wurde ein Lauf angefordert");

    // Entscheidet jemand, der nicht zuständig ist, zählt es nicht.
    freigaben = [{ run_id: 1, status: "bestaetigt", entschieden_von: "bernd" }];
    r = await ruf("Änne", "team", "/vorgaenge");
    let vorgang = r.daten.vorgaenge.find((v) => v.id === va);
    assert(vorgang.status === "ohne entscheidung" && /nicht mehr zuständig|nicht mehr zustaendig/.test(vorgang.hinweis), `eine fremde Entscheidung zählt: ${JSON.stringify(vorgang)}`);
    // Wer den Mandanten nur sieht, entscheidet nicht, auch wenn das Gerät ihn ließe.
    r = await post("Änne", "team", "/vorgaenge", { titel: "Beleg Müller 2", mandant: a });
    await post("Änne", "team", `/vorgaenge/${r.daten.vorgang.id}/einreichen`, {});
    freigaben = [{ run_id: 2, status: "bestaetigt", entschieden_von: "emil" }];
    r = await ruf("Änne", "team", "/vorgaenge");
    vorgang = r.daten.vorgaenge.find((v) => String(v.lauf) === "2");
    assert(vorgang?.status === "ohne entscheidung", `die Freigabe von emil, der A nur sieht, zählt: ${JSON.stringify(vorgang)}`);
    r = await post("Änne", "team", "/vorgaenge", { titel: "Beleg Müller 3", mandant: a });
    await post("Änne", "team", `/vorgaenge/${r.daten.vorgang.id}/einreichen`, {});
    freigaben = [{ run_id: 3, status: "bestaetigt", entschieden_von: "carla" }];
    r = await ruf("Änne", "team", "/vorgaenge");
    vorgang = r.daten.vorgaenge.find((v) => String(v.lauf) === "3");
    assert(vorgang?.status === "genehmigt" && vorgang.entschieden_von === "carla", `die zuständige Entscheidung zählt nicht: ${JSON.stringify(vorgang)}`);
    // Eine Zuordnung auf nur sehen gestellt: carla entscheidet nicht mehr, sieht aber weiter.
    r = await post("chefin", "leitung", "/zuordnungen", { benutzer: "carla", mandant: a, entscheidet: false });
    assert(r.code === 200, `die Zuordnung ließ sich nicht umstellen: ${r.code}`);
    r = await post("Änne", "team", "/vorgaenge", { titel: "Beleg Müller 4", mandant: a });
    r = await post("Änne", "team", `/vorgaenge/${r.daten.vorgang.id}/einreichen`, {});
    assert(r.code === 409 && starts.length === 3, `nach dem Umstellen entscheidet noch jemand: ${r.code} ${JSON.stringify(r.daten)}`);
    r = await ruf("carla", "team", `/vorgaenge/${va}`);
    assert(r.code === 200, "wer nur sieht, sieht nicht mehr");

    // Eine Zuordnung lösen: danach entscheidet niemand mehr über Ännes Vorgänge in A.
    r = await ruf("chefin", "leitung", `/zuordnungen?benutzer=carla&mandant=${a}`, { method: "DELETE" });
    assert(r.code === 200, "die Zuordnung ließ sich nicht lösen");
    r = await ruf("chefin", "leitung", `/zuordnungen?benutzer=carla&mandant=${a}`, { method: "DELETE" });
    assert(r.code === 404, "eine gelöste Zuordnung ließ sich noch einmal lösen");
    r = await ruf("carla", "team", `/vorgaenge/${va}`);
    assert(r.code === 404, "nach dem Lösen sieht carla den Vorgang noch");

    // Die Rolle kommt aus dem Kontrakt, nicht aus dem Quelltext.
    const { verwaltungsRolle } = await import(join(PATTERNS, "clients", "backend", "kern", "mandanten.mjs"));
    assert(verwaltungsRolle(kontrakt) === "leitung", "die Rolle wird nicht aus freigaben.rollen und koepfe.rollen gelesen");
    assert(verwaltungsRolle(kontrakt, "team") === "team", "eine gewählte Rolle aus koepfe.rollen gilt nicht");
    assert(verwaltungsRolle(kontrakt, "admin") === null, "eine Rolle, die der Kontrakt nicht nennt, verwaltet");
    assert(verwaltungsRolle({ koepfe: kontrakt.koepfe }) === null, "ohne freigaben.rollen verwaltet trotzdem jemand");

    // Jede Abfrage der Ablage trägt den Filter. Gezählt am Quelltext: eine
    // Abfrage über die Vorgänge ohne die Bedingung ist eine, die alle zeigt.
    const ablage = readFileSync(join(PATTERNS, "clients", "backend", "ablage", "vorgaenge.mjs"), "utf8");
    const abfragen = [...ablage.matchAll(/`((?:SELECT|UPDATE)[^`]*vorgaenge[^`]*)`/g)].map((m) => m[1]);
    assert(abfragen.length >= 5, `die Ablage der Vorgänge fragt nur ${abfragen.length} Mal`);
    for (const sql of abfragen) assert(/nurZugeordnete/.test(sql), `eine Abfrage ohne Filter: ${sql.replace(/\s+/g, " ").slice(0, 80)}`);
    // Und sie hält die Felder der Vorlage: sie ersetzt deren Ablage.
    const vorlageFelder = readFileSync(join(ROOT, ".ara", "templates", "app", "backend", "ablage", "vorgaenge.mjs"), "utf8").match(/const FELDER = "([^"]+)"/)[1];
    for (const feld of vorlageFelder.split(", ")) assert(ablage.includes(feld), `die Ablage des Musters kennt ${feld} der Vorlage nicht`);

    // In eine App aus der Vorlage gelegt, hält die Oberfläche den Standard.
    const kopie = mkdtempSync(join(tmpdir(), "ara-muster-"));
    try {
      cpSync(join(ROOT, ".ara", "templates", "app"), kopie, { recursive: true });
      cpSync(join(PATTERNS, "clients"), kopie, { recursive: true });
      const befunde = standardFindings(kopie, { scaffold: true });
      assert(befunde.length === 0, `das Muster Mandanten steht neben der Bibliothek: ${befunde.join(" | ")}`);
    } finally {
      rmSync(kopie, { recursive: true, force: true });
    }
    return "zwei Konten, zwei Mandanten, fremder Vorgang 404, Verwaltung nur für die Rolle aus dem Kontrakt, angelegt in Arbeit, eingereicht erst auf Wunsch, danach 409, nur Entscheider ohne Einreicher, wer nur sieht entscheidet nicht, jede Abfrage gefiltert";
  } finally {
    app?.kill("SIGTERM");
    geraet.close();
    rmSync(paket, { recursive: true, force: true });
  }
});

await checkAsync("Das Muster Belege trennt Dokumente und Auslesungen je Mandant, ein Beleg hängt am Vorgang, nach dem Einreichen ändert sich nichts", async () => {
  // Die Muster 2, 6 und 7 zusammen, so wie das Blatt es sagt: die Vorlage,
  // darüber die drei, darüber dieses, die Zeilen aus den Köpfen der Wege in
  // server.mjs. Das Gerät ist gespielt, seine Kopfzeilen heißen anders als am Orin.
  const kontrakt = {
    ...VORLAGE_KONTRAKT,
    koepfe: { benutzer: "x-geraet-wer", rolle: "x-geraet-rolle", rollen: ["leitung", "team"] },
    freigaben: { ...VORLAGE_KONTRAKT.freigaben, rollen: ["leitung"] },
  };
  const paket = mkdtempSync(join(tmpdir(), "ara-belege-"));
  let app = null;
  const gelesen = [];
  const starts = [];
  const geraet = createServer((anfrage, antwort) => {
    const teile = [];
    anfrage.on("data", (s) => teile.push(s));
    anfrage.on("end", () => {
      const url = new URL(anfrage.url, "http://x");
      const json = (code, daten) => {
        antwort.writeHead(code, { "content-type": "application/json" });
        antwort.end(JSON.stringify(daten));
      };
      if (anfrage.headers["x-arasul-app-key"] !== "aras_selbsttest") return json(401, { error: { message: "kein Schlüssel" } });
      if (url.pathname === "/api/v1/external/document/extract-structured") {
        gelesen.push(anfrage.headers[kontrakt.protokoll.einreicher.kopf] ?? null);
        return json(200, { success: true, data: { belegdatum: "2026-09-01", betrag_brutto: 12.5, aussteller: "Probe" }, model: "probe-modell:1b", job_id: `auftrag-${gelesen.length}` });
      }
      if (anfrage.method === "POST" && url.pathname === "/api/v1/external/flows/freigabe/run") {
        starts.push(JSON.parse(Buffer.concat(teile).toString("utf8")));
        return json(202, { data: { run_id: starts.length } });
      }
      if (url.pathname === "/api/v1/external/freigaben") return json(200, { data: { freigaben: [] } });
      if (url.pathname.startsWith("/api/v1/external/flows/runs/")) return json(200, { data: { status: "wartend" } });
      json(404, { error: { message: url.pathname } });
    });
  });
  await new Promise((fertig) => geraet.listen(0, "127.0.0.1", fertig));
  try {
    cpSync(join(ROOT, ".ara", "templates", "app", "backend"), paket, { recursive: true });
    for (const muster of ["documents", "extract", "clients", "receipts"]) cpSync(join(PATTERNS, muster, "backend"), paket, { recursive: true });
    // Die Zeilen aus den Köpfen der Wege, genau so eingesetzt.
    const kopfzeilen = (datei, anfang) => {
      const zeilen = readFileSync(join(PATTERNS, datei), "utf8")
        .split("\n")
        .filter((zeile) => zeile.startsWith(" *   "))
        .map((zeile) => zeile.slice(5));
      const importe = zeilen.filter((zeile) => zeile.startsWith("import ")).join("\n") + "\n";
      const beginn = zeilen.findIndex((zeile) => zeile.startsWith(anfang));
      const ende = zeilen.findIndex((zeile, i) => i > beginn && zeile === "});");
      assert(beginn >= 0 && ende > beginn, `der Kopf von ${datei} nennt die Zeilen nicht mehr`);
      return { importe, aufbau: zeilen.slice(beginn, ende + 1).join("\n") + "\n" };
    };
    const mandantenKopf = kopfzeilen("clients/backend/wege/mandanten.mjs", "const mandantenFall");
    const belegeKopf = kopfzeilen("receipts/backend/wege/belege.mjs", "const belege");
    // Der Kopf der Belege sagt, was in den Zeilen der Mandanten aus `bereit` wird.
    const bereitZeile = readFileSync(join(PATTERNS, "receipts", "backend", "wege", "belege.mjs"), "utf8")
      .split("\n")
      .find((zeile) => zeile.startsWith(" *   bereit: "));
    assert(bereitZeile && mandantenKopf.aufbau.includes("bereit: () => true,"), "die Köpfe nennen nicht mehr, wie ein Vorgang mit Beleg bereit wird");
    mandantenKopf.aufbau = mandantenKopf.aufbau.replace("bereit: () => true,", bereitZeile.slice(5).trim());
    const server = join(paket, "server.mjs");
    let quelle = readFileSync(server, "utf8");
    for (const [alt, neu] of [
      [
        'import { geraet as anschluss, vereinbarungLesen } from "./arasul.mjs";\n',
        'import { geraet as anschluss, vereinbarungLesen } from "./arasul.mjs";\n' + mandantenKopf.importe + belegeKopf.importe,
      ],
      [
        "  regel: () => (VIER_AUGEN ? { ohne_einreicher: true } : null),\n});\n",
        "  regel: () => (VIER_AUGEN ? { ohne_einreicher: true } : null),\n});\n" + mandantenKopf.aufbau + belegeKopf.aufbau,
      ],
      [
        '  if (pfad === "/vorgaenge" && anfrage.method === "GET") {',
        '  if (await belege(anfrage, antwort, pfad)) return;\n  if (await mandanten(anfrage, antwort, pfad)) return;\n\n  if (pfad === "/vorgaenge" && anfrage.method === "GET") {',
      ],
    ]) {
      assert(quelle.includes(alt), `die Naht in server.mjs, an der das Muster hängt, gibt es nicht mehr: ${alt.split("\n")[0]}`);
      quelle = quelle.replace(alt, neu);
    }
    writeFileSync(server, quelle);
    writeFileSync(join(paket, ARRANGEMENT_FILE), arrangementFile(appArrangement(kontrakt, { device: "selbsttest", date: today() })));

    app = spawn("node", [server], {
      env: {
        ...process.env,
        PORT: "0",
        ARASUL_APP_NAME: "Probe",
        APP_DATEN: join(paket, "daten"),
        ARASUL_BASIS_URL: `http://127.0.0.1:${geraet.address().port}`,
        ARASUL_APP_KEY: "aras_selbsttest",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let ausgabe = "";
    let fehlerausgabe = "";
    app.stderr.on("data", (stueck) => (fehlerausgabe += String(stueck)));
    const basis = await new Promise((fertig, gescheitert) => {
      const zeit = setTimeout(() => gescheitert(new Error(`die App hat nicht gestartet: ${fehlerausgabe}`)), 10_000);
      app.stdout.on("data", (stueck) => {
        ausgabe += String(stueck);
        const treffer = ausgabe.match(/auf (\d+)/);
        if (treffer) {
          clearTimeout(zeit);
          fertig(`http://127.0.0.1:${treffer[1]}`);
        }
      });
    });
    await new Promise((fertig) => setTimeout(fertig, 300));
    assert(/005-belege\.sql/.test(ausgabe), `die Migration der Belege lief nicht: ${ausgabe} ${fehlerausgabe}`);

    const alsKopf = (text) => Buffer.from(text, "utf8").toString("latin1");
    const ruf = async (wer, rolle, pfad, optionen = {}) => {
      const kopf = { ...(optionen.headers || {}) };
      if (wer) kopf[kontrakt.koepfe.benutzer] = alsKopf(wer);
      if (rolle) kopf[kontrakt.koepfe.rolle] = rolle;
      const antwort = await fetch(`${basis}${pfad}`, { ...optionen, headers: kopf });
      const art = antwort.headers.get("content-type") || "";
      return { code: antwort.status, daten: art.includes("json") ? await antwort.json() : Buffer.from(await antwort.arrayBuffer()) };
    };
    const post = (wer, rolle, pfad, rumpf) =>
      ruf(wer, rolle, pfad, { method: "POST", body: JSON.stringify(rumpf), headers: { "content-type": "application/json" } });
    const hochladen = (wer, pfad, bytes) =>
      ruf(wer, "team", pfad, { method: "POST", body: bytes, headers: { "content-type": "application/pdf", "x-dateiname": encodeURIComponent("Quittung Müller.pdf") } });

    for (const wer of ["Änne", "bernd", "carla"]) await ruf(wer, "team", "/mandanten");
    const a = (await post("chefin", "leitung", "/mandanten", { name: "Müller GmbH" })).daten.mandant.id;
    const b = (await post("chefin", "leitung", "/mandanten", { name: "Schmidt KG" })).daten.mandant.id;
    for (const [wer, mandant, entscheidet] of [["Änne", a, false], ["carla", a, true], ["bernd", b, true]]) {
      await post("chefin", "leitung", "/zuordnungen", { benutzer: wer, mandant, entscheidet });
    }
    let r = await post("Änne", "team", "/vorgaenge", { titel: "Tankbeleg", mandant: a });
    assert(r.code === 201, `Vorgang in A: ${JSON.stringify(r.daten)}`);
    const va = r.daten.vorgang.id;
    // Ohne Beleg ist der Vorgang nicht vollständig und bleibt in Arbeit.
    r = await post("Änne", "team", `/vorgaenge/${va}/einreichen`, {});
    assert(r.code === 409 && /Beleg/.test(r.daten.fehler) && starts.length === 0, `ein Vorgang ohne Beleg wurde eingereicht: ${r.code} ${JSON.stringify(r.daten)}`);

    // Ein Beleg hängt an einem Vorgang und erbt dessen Mandanten.
    const pdf = Buffer.from("%PDF-1.4 Probe");
    r = await hochladen("Änne", "/dokumente", pdf);
    assert(r.code === 400 && /Vorgang/.test(r.daten.fehler), `ein Beleg ohne Vorgang wurde angenommen: ${r.code} ${JSON.stringify(r.daten)}`);
    r = await hochladen("bernd", `/dokumente?vorgang=${va}`, pdf);
    assert(r.code === 404, `bernd hängt einen Beleg an einen fremden Vorgang: ${r.code}`);
    r = await hochladen("Änne", `/dokumente?vorgang=${va}`, pdf);
    assert(r.code === 201 && r.daten.dokument.mandant === a && r.daten.dokument.vorgang === va, `der Beleg erbt Vorgang und Mandant nicht: ${JSON.stringify(r.daten)}`);
    const id = r.daten.dokument.id;

    r = await ruf("Änne", "team", `/vorgaenge/${va}/belege`);
    assert(r.code === 200 && r.daten.belege.length === 1 && r.daten.belege[0].name === "Quittung Müller.pdf", `die Belege am Vorgang fehlen: ${JSON.stringify(r.daten)}`);
    r = await ruf("bernd", "team", `/vorgaenge/${va}/belege`);
    assert(r.code === 404, `bernd sieht die Belege eines fremden Vorgangs: ${r.code}`);

    // Der fremde Mandant sieht weder Liste noch Bytes noch Auslesung.
    r = await ruf("bernd", "team", "/dokumente");
    assert(r.code === 200 && r.daten.dokumente.length === 0, `bernd sieht Dokumente von A: ${JSON.stringify(r.daten)}`);
    r = await ruf("carla", "team", "/dokumente");
    assert(r.daten.dokumente.length === 1, "carla sieht das Dokument ihres Mandanten nicht");
    r = await ruf("bernd", "team", `/dokumente/${id}/datei`);
    assert(r.code === 404, `bernd bekommt die Bytes eines fremden Belegs: ${r.code}`);
    r = await ruf("carla", "team", `/dokumente/${id}/datei`);
    assert(r.code === 200 && Buffer.compare(r.daten, pdf) === 0, "carla bekommt die Bytes ihres Belegs nicht");
    r = await ruf("bernd", "team", `/dokumente/${id}/auslesen`, { method: "POST" });
    assert(r.code === 404 && gelesen.length === 0, `bernd lässt einen fremden Beleg auslesen: ${r.code}`);

    r = await ruf("Änne", "team", `/dokumente/${id}/auslesen`, { method: "POST" });
    assert(r.code === 201 && r.daten.auslesung.mandant === a && r.daten.auslesung.auftrag === "auftrag-1", `die Auslesung trägt Mandant oder Auftrag nicht: ${JSON.stringify(r.daten)}`);
    assert(gelesen[0] === alsKopf("Änne"), `das Gerät bekam den Menschen zur Auslesung nicht: ${gelesen[0]}`);
    r = await ruf("bernd", "team", `/dokumente/${id}/auslesungen`);
    assert(r.code === 404 && !r.daten.auslesungen, `das Protokoll eines fremden Belegs antwortet ${r.code}: ${JSON.stringify(r.daten)}`);
    r = await ruf("carla", "team", `/dokumente/${id}/auslesungen`);
    assert(r.code === 200 && r.daten.auslesungen.length === 1, `carla sieht das Protokoll ihres Belegs nicht: ${JSON.stringify(r.daten)}`);
    r = await ruf("bernd", "team", `/dokumente/${id}`, { method: "DELETE" });
    assert(r.code === 404, `bernd entfernt einen fremden Beleg: ${r.code}`);

    // Das Protokoll bleibt, wenn der Beleg geht, und bleibt getrennt.
    r = await ruf("Änne", "team", `/dokumente/${id}`, { method: "DELETE" });
    assert(r.code === 200, "Änne kann ihren Beleg nicht entfernen");
    r = await ruf("carla", "team", `/dokumente/${id}/auslesungen`);
    assert(r.daten.auslesungen.length === 1, "nach dem Entfernen fehlt das Protokoll für den eigenen Mandanten");
    r = await ruf("bernd", "team", `/dokumente/${id}/auslesungen`);
    assert(r.code === 404, `nach dem Entfernen antwortet das fremde Protokoll ${r.code}`);

    // Jetzt vollständig: ein Beleg, eingereicht, und danach ändert sich nichts mehr.
    r = await hochladen("Änne", `/dokumente?vorgang=${va}`, pdf);
    const zweiter = r.daten.dokument.id;
    r = await post("Änne", "team", `/vorgaenge/${va}/einreichen`, {});
    assert(r.code === 200 && r.daten.vorgang.status === "wartet" && starts.length === 1, `ein vollständiger Vorgang wurde nicht eingereicht: ${r.code} ${JSON.stringify(r.daten)}`);
    assert(JSON.stringify(starts[0].freigabe?.entscheider) === JSON.stringify({ konten: ["carla"] }), `die Freigabe geht nicht an die Entscheiderin: ${JSON.stringify(starts[0])}`);
    const vorher = gelesen.length;
    r = await hochladen("Änne", `/dokumente?vorgang=${va}`, pdf);
    assert(r.code === 409, `nach dem Einreichen hängt noch ein Beleg an: ${r.code} ${JSON.stringify(r.daten)}`);
    r = await ruf("Änne", "team", `/dokumente/${zweiter}`, { method: "DELETE" });
    assert(r.code === 409, `nach dem Einreichen geht ein Beleg: ${r.code} ${JSON.stringify(r.daten)}`);
    r = await ruf("Änne", "team", `/dokumente/${zweiter}/auslesen`, { method: "POST" });
    assert(r.code === 409 && gelesen.length === vorher, `nach dem Einreichen wird ein Beleg neu ausgelesen: ${r.code}`);
    r = await ruf("Änne", "team", `/vorgaenge/${va}/belege`);
    assert(r.daten.belege.length === 1 && r.daten.belege[0].id === zweiter, `die Belege am eingereichten Vorgang haben sich geändert: ${JSON.stringify(r.daten)}`);

    // Jede lesende Abfrage der beiden Ablagen trägt den Filter.
    for (const [datei, mindestens] of [["dokumente.mjs", 5], ["auslesungen.mjs", 1]]) {
      const text = readFileSync(join(PATTERNS, "receipts", "backend", "ablage", datei), "utf8");
      const abfragen = [...text.matchAll(/`((?:SELECT|DELETE)[^`]*)`/g)].map((m) => m[1]);
      assert(abfragen.length >= mindestens, `${datei} fragt nur ${abfragen.length} Mal`);
      for (const sql of abfragen) assert(/nurZugeordnete/.test(sql), `${datei}: eine Abfrage ohne Filter: ${sql.replace(/\s+/g, " ").slice(0, 80)}`);
    }

    // In eine App aus der Vorlage gelegt, hält die Oberfläche aller vier den Standard.
    const kopie = mkdtempSync(join(tmpdir(), "ara-muster-"));
    try {
      cpSync(join(ROOT, ".ara", "templates", "app"), kopie, { recursive: true });
      for (const muster of ["documents", "extract", "clients", "receipts"]) cpSync(join(PATTERNS, muster), kopie, { recursive: true });
      const befunde = standardFindings(kopie, { scaffold: true });
      assert(befunde.length === 0, `das Muster Belege steht neben der Bibliothek: ${befunde.join(" | ")}`);
    } finally {
      rmSync(kopie, { recursive: true, force: true });
    }
    return "Beleg ohne Vorgang 400, fremder Vorgang 404, Mandant vom Vorgang, fremde Liste leer, Bytes, Auslesen, Entfernen und Protokoll 404, Protokoll bleibt getrennt, der Mensch geht ans Gerät, ohne Beleg kein Einreichen, danach Anhängen, Entfernen und Auslesen 409";
  } finally {
    app?.kill("SIGTERM");
    geraet.close();
    rmSync(paket, { recursive: true, force: true });
  }
});

await checkAsync("Das Muster Post sendet über SMTP, und das Passwort bleibt im Prozess", async () => {
  // Ein lokales Relais spielt den Postausgang des Kunden. Geprüft wird das
  // Gespräch, wie es auf der Leitung steht, und dass eine Post, die nicht
  // rausgeht, ein Satz ist und kein Absturz.
  const { createServer: netServer } = await import("node:net");
  const { post, postAusUmgebung, nachricht } = await import(join(PATTERNS, "mail", "backend", "post.mjs"));
  const gesehen = [];
  let brief = "";
  const relais = netServer((s) => {
    s.write("220 selbsttest bereit\r\n");
    let rumpf = false;
    let rest = "";
    s.on("data", (stueck) => {
      rest += stueck;
      let i;
      while ((i = rest.indexOf("\r\n")) >= 0) {
        const zeile = rest.slice(0, i);
        rest = rest.slice(i + 2);
        if (rumpf) {
          if (zeile === ".") {
            rumpf = false;
            s.write("250 angenommen als 42\r\n");
          } else brief += `${zeile}\n`;
          continue;
        }
        gesehen.push(zeile);
        if (/^EHLO/i.test(zeile)) s.write("250-selbsttest\r\n250 8BITMIME\r\n");
        else if (/^MAIL FROM/i.test(zeile)) s.write("250 ok\r\n");
        else if (/^RCPT TO/i.test(zeile)) s.write(/niemand@/.test(zeile) ? "550 kennt niemand\r\n" : "250 ok\r\n");
        else if (/^DATA/i.test(zeile)) {
          rumpf = true;
          s.write("354 los\r\n");
        } else if (/^QUIT/i.test(zeile)) {
          s.write("221 tschüss\r\n");
          s.end();
        } else s.write("500 was\r\n");
      }
    });
  });
  await new Promise((fertig) => relais.listen(0, "127.0.0.1", fertig));
  try {
    const umgebung = { SMTP_HOST: "127.0.0.1", SMTP_PORT: String(relais.address().port), SMTP_VON: "app@beispiel.de" };
    const anschluss = post(postAusUmgebung(umgebung), { zeitlimit: 5000 });
    const ergebnis = await anschluss.senden({ an: ["anna@beispiel.de", "bernd@beispiel.de"], betreff: "Prüfung: genehmigt", text: "Anna hat entschieden.\nGrüße" });
    assert(ergebnis.gesendet, `die Mail ging nicht raus: ${ergebnis.fehler}`);
    assert(gesehen.some((z) => z === "MAIL FROM:<app@beispiel.de>"), `der Absender kommt nicht aus SMTP_VON: ${gesehen.join(" | ")}`);
    assert(gesehen.filter((z) => /^RCPT TO/.test(z)).length === 2, "nicht jeder Empfänger bekam ein RCPT TO");
    assert(/^Subject: =\?UTF-8\?B\?/m.test(brief), "ein Betreff mit Umlaut steht unkodiert in der Kopfzeile");
    const inhalt = Buffer.from(brief.split("\n\n")[1].replace(/\n/g, ""), "base64").toString("utf8");
    assert(/Grüße/.test(inhalt), `der Rumpf kommt nicht als UTF-8 an: ${inhalt}`);

    const abgelehnt = await anschluss.senden({ an: "niemand@beispiel.de", betreff: "x", text: "y" });
    assert(!abgelehnt.gesendet && /RCPT TO niemand@beispiel\.de.*550/.test(abgelehnt.fehler), `eine Ablehnung ist kein Satz: ${JSON.stringify(abgelehnt)}`);
    const ohne = await post(postAusUmgebung({})).senden({ an: "a@b.de", betreff: "x", text: "y" });
    assert(!ohne.gesendet && /SMTP_HOST/.test(ohne.fehler), `ohne Host fehlt der Satz: ${ohne.fehler}`);
    const zu = await post(postAusUmgebung({ SMTP_HOST: "127.0.0.1", SMTP_PORT: "1", SMTP_VON: "a@b.de" }), { zeitlimit: 2000 }).senden({ an: "a@b.de", betreff: "x", text: "y" });
    assert(!zu.gesendet && /nicht erreichbar/.test(zu.fehler), `ein Postausgang, der nicht antwortet, ist kein Satz: ${zu.fehler}`);
    // Eine Anmeldung ohne TLS schickte das Passwort im Klartext: das Modul weist sie ab.
    const klartext = await post(postAusUmgebung({ ...umgebung, SMTP_BENUTZER: "u", SMTP_PASSWORT: "streng-geheim" })).senden({ an: "a@b.de", betreff: "x", text: "y" });
    assert(!klartext.gesendet && /TLS/.test(klartext.fehler) && !/streng-geheim/.test(klartext.fehler), `Anmeldung ohne TLS: ${klartext.fehler}`);
    assert(!nachricht({ von: "a@b.de", an: ["c@d.de"], betreff: "x", text: "y" }).includes("streng-geheim"), "das Passwort steht in der Nachricht");
    return "EHLO, MAIL FROM, zwei RCPT TO, DATA, QUIT; Ablehnung, kein Host, nicht erreichbar, kein Klartext";
  } finally {
    relais.close();
  }
});

await checkAsync("Das Muster fremde Schnittstelle antwortet in Sätzen und verrät den Schlüssel nicht", async () => {
  const { fremd, fremdAusUmgebung } = await import(join(PATTERNS, "foreign-api", "backend", "fremd.mjs"));
  const gesehen = [];
  const dienst = createServer((anfrage, antwort) => {
    gesehen.push(`${anfrage.method} ${anfrage.url} ${anfrage.headers.authorization || "-"}`);
    const json = (code, daten) => {
      antwort.writeHead(code, { "content-type": "application/json" });
      antwort.end(JSON.stringify(daten));
    };
    if (anfrage.url.startsWith("/orte")) return json(200, { data: { ort: "Musterstadt" } });
    if (anfrage.url === "/langsam") return setTimeout(() => json(200, {}), 3000);
    if (anfrage.url === "/text") {
      antwort.writeHead(200, { "content-type": "text/html" });
      return antwort.end("<html>");
    }
    json(404, { error: { message: "kennt dieser Dienst nicht" } });
  });
  await new Promise((fertig) => dienst.listen(0, "127.0.0.1", fertig));
  try {
    const auskunft = fremdAusUmgebung({ FREMD_BASIS: `http://127.0.0.1:${dienst.address().port}/`, FREMD_SCHLUESSEL: "streng-geheim" });
    assert(!auskunft.basis.endsWith("/"), "die Basis behält ihren Schrägstrich");
    const anschluss = fremd({ name: "die Adressauskunft", basis: auskunft.basis, kopfzeilen: { authorization: `Bearer ${auskunft.schluessel}` }, zeitlimit: 800 });
    const gut = await anschluss.rufen("GET", "/orte?plz=12345");
    assert(gut.code === 200 && gut.daten?.ort === "Musterstadt" && gut.fehler === null, `die gute Antwort: ${JSON.stringify(gut)}`);
    const fehlt = await anschluss.rufen("GET", "/nix");
    assert(fehlt.code === 404 && /die Adressauskunft antwortete auf GET \/nix mit 404: kennt dieser Dienst nicht/.test(fehlt.fehler), `404: ${JSON.stringify(fehlt)}`);
    const zeit = await anschluss.rufen("GET", "/langsam");
    assert(zeit.code === 0 && /nicht geantwortet/.test(zeit.fehler), `Zeitlimit: ${JSON.stringify(zeit)}`);
    const text = await anschluss.rufen("GET", "/text");
    assert(text.daten === null && /nicht mit JSON/.test(text.fehler), `kein JSON: ${JSON.stringify(text)}`);
    const ohne = await fremd({ basis: null }).rufen("GET", "/x");
    assert(/FREMD_BASIS/.test(ohne.fehler), `ohne Basis: ${ohne.fehler}`);
    assert(gesehen.every((z) => / Bearer streng-geheim$/.test(z)), `der Schlüssel fährt nicht mit: ${gesehen.join(" | ")}`);
    assert(!JSON.stringify([fehlt, zeit, text]).includes("streng-geheim"), "der Schlüssel steht in einem Fehlersatz");
    return "gut, 404, Zeitlimit, kein JSON, ohne Basis";
  } finally {
    dienst.close();
  }
});

check("Das Muster fremder Container hält den Kontrakt: ein Bauplan aus einer Zeile, keine eigene Oberfläche", () => {
  // Das Gerät nimmt kein fertiges Image, es baut aus dem Paket: mit `backend`
  // braucht das Manifest `bauen`. Der Weg für ein fremdes Image ist deshalb ein
  // Bauplan aus einer Zeile. Geprüft gegen ein Schema in der Form des
  // Kontrakts, mit den Feldern, die die Vorlage selbst benutzt.
  const ordner = join(PATTERNS, "foreign-container");
  const manifest = JSON.parse(readFileSync(join(ordner, "app.json"), "utf8"));
  const schema = {
    ...KONTRAKT.app_json.schema,
    properties: {
      ...KONTRAKT.app_json.schema.properties,
      beschreibung: { type: "string", maxLength: 500 },
      ressourcen: { type: "object", properties: { speicher: { type: "string" }, cpus: { type: "number" } }, additionalProperties: false },
      marken: { type: "string" },
    },
  };
  const ergebnis = checkManifest({ app_json: { schema, regeln: KONTRAKT.app_json.regeln } }, manifest);
  assert(ergebnis.ok, `das Manifest fällt am Schema: ${ergebnis.problems.join(" | ")}`);
  assert(!manifest.frontend, "der fremde Container bringt eine Oberfläche mit");
  assert(manifest.backend?.image && manifest.backend?.bauen?.verzeichnis === "backend", "ohne Bauplan nimmt das Gerät das Paket nicht");
  assert(manifest.backend.gesundheit && manifest.ports?.backend, "Gesundheitsweg oder Port fehlen");
  const bauplan = readFileSync(join(ordner, "backend", "Dockerfile"), "utf8")
    .split("\n")
    .filter((zeile) => zeile.trim() && !zeile.startsWith("#"));
  assert(bauplan.length === 1 && /^FROM \S+$/.test(bauplan[0]), `der Bauplan ist nicht eine Zeile FROM: ${bauplan.join(" | ")}`);
  assert(standardFindings(ordner).length === 0, "der Standard der Bibliothek meldet etwas an einer App ohne Oberfläche");
  return `${bauplan[0]}, Manifest gültig, kein frontend`;
});

check("Die Vorlage rät keinen Wert, den das Gerät vergibt", () => {
  // Der eigentliche Fund vom 29.08.2026. Im Backend der Vorlage standen sechs
  // Werte, die zwischen Kit und Produkt vereinbart sind: zwei Namen von
  // Umgebungswerten, eine Kopfzeile, drei Pfade. Keiner davon stand im
  // Kontrakt, keiner im Spiegel, und der Selbsttest spielte ein Gerät, das
  // genau sie beantwortete. Trifft eine so gebaute App auf ein Gerät, das seine
  // Werte anders nennt, findet sie nichts, hält das für „hier läuft kein
  // Arasul" und legt jeden Vorgang ohne Lauf ab.
  const backend = join(ROOT, ".ara", "templates", "app", "backend");
  // Das ganze Backend und nicht nur der Einstieg: seit E13 liegt die Naht zum
  // Gerät in `arasul.mjs`, und eine Prüfung, die nur `server.mjs` liest, sähe
  // genau dort nicht hin, wo die Werte heute stünden.
  const quellen = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? quellen(join(dir, entry.name))
        : /\.mjs$/.test(entry.name)
          ? [join(dir, entry.name)]
          : []
    );
  const dateien = quellen(backend);
  assert(dateien.length >= 4, `das Backend der Vorlage besteht aus zu wenigen Dateien: ${dateien.length}`);
  const quelle = dateien.map((datei) => readFileSync(datei, "utf8")).join("\n");
  const verboten = [
    [/ARASUL_API_URL|ARASUL_API_SCHLUESSEL/, "der Name eines Umgebungswerts, den das Gerät vergibt"],
    [/["'`]x-api-key["'`]/i, "die Kopfzeile des Schlüssels"],
    [/["'`\/]api\/v\d/, "ein Pfad der Schnittstelle"],
    [/["'`]\/(flows|freigaben)/, "ein Pfad der Schnittstelle"],
    [/code === 20\d/, "ein Statuscode des Geräts"],
  ];
  for (const [muster, was] of verboten) {
    const treffer = quelle.match(muster);
    assert(!treffer, `im Backend der Vorlage steht ${was}: ${treffer?.[0]}`);
  }

  // Die Oberfläche genauso: sie kennt ihren eigenen Pfad nicht und ruft ihre
  // Schnittstelle relativ zu dem, was das Gerät ihr als Adresse gegeben hat.
  const frontend = join(ROOT, ".ara", "templates", "app", "frontend", "src");
  const seiten = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? seiten(join(dir, entry.name)) : /\.tsx?$/.test(entry.name) ? [join(dir, entry.name)] : []
    );
  for (const datei of seiten(frontend)) {
    // Ohne Kommentare: dort steht der Pfad als Erklärung, und genau dort gehört
    // er auch hin.
    const code = readFileSync(datei, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    const treffer = code.match(/["'`]\/apps\//);
    assert(!treffer, `${relative(ROOT, datei)} schreibt den Pfad der Plattform in den Quelltext: ${treffer?.[0]}`);
  }

  // Leer kommt sie aus dem Klon: gefüllt wird sie beim Einspielen, aus dem
  // Kontrakt des einen Geräts, auf das die App geht.
  const leer = JSON.parse(readFileSync(join(backend, ARRANGEMENT_FILE), "utf8"));
  assert(leer.kopf === null && leer.umgebung.basis === null, "die Vereinbarung im Klon ist nicht leer");
  for (const weg of Object.values(leer.wege)) assert(weg === null, "im Klon steht schon ein Weg");

  // Und sie kommt ins Image: was nur im Paket liegt, sieht der Container nicht.
  const dockerfile = readFileSync(join(backend, "Dockerfile"), "utf8");
  assert(
    /^COPY \. \.$/m.test(dockerfile) || new RegExp(`COPY[^\\n]*${ARRANGEMENT_FILE}`).test(dockerfile),
    "die Vereinbarung geht nicht ins Image"
  );
  assert(leer.koepfe?.benutzer === null, "im Klon steht schon der Name einer Kopfzeile");

  // Die Kopfzeilen der Anmeldung und die Wege zu einem Dokument: am 25.09.2026
  // stand der eine Name fest in der Vorlage und im Muster Dokumente, der andere
  // Weg als Zeichenkette in der App eines Fremdtests. Geprüft wird der Code
  // ohne Kommentare, in der Vorlage und in jedem Muster.
  const ohneKommentar = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const muster = join(ROOT, ".ara", "templates", "app-patterns");
  const alle = [...dateien, ...quellen(muster)];
  for (const datei of alle) {
    const code = ohneKommentar(readFileSync(datei, "utf8"));
    for (const [verboten, was] of [
      [/x-arasul-(user|role)/i, "der Name einer Kopfzeile der Anmeldung"],
      [/document\/extract/, "ein Weg der Schnittstelle"],
      [/ARASUL_(API|DB)_/, "der Name eines Umgebungswerts, den das Gerät vergibt"],
    ]) {
      const treffer = code.match(verboten);
      assert(!treffer, `${relative(ROOT, datei)} trägt ${was}: ${treffer?.[0]}`);
    }
  }
  return `sechs geratene Werte, keiner mehr in der Vorlage, keine Kopfzeile und kein Dokumentweg in ${alle.length} Dateien der Vorlage und der Muster, kein Plattformpfad in der Oberfläche`;
});

check("Die Vorlage hält ihre Nähte auseinander", () => {
  // Das Backend folgt dem Port-Muster: der Kern kennt zwei Anschlüsse und die
  // Welt sonst nicht. Steht in ihm ein `fetch` oder ein SQL, ist die Trennung
  // weg, und mit ihr die Möglichkeit, einen Fall zu prüfen, ohne eine Datenbank
  // und ein Gerät zu haben.
  const vorlage = join(ROOT, ".ara", "templates", "app");
  // Ohne Kommentare: dort stehen die drei Namen als Erklaerung, und genau dort
  // gehoeren sie auch hin.
  const ohneKommentar = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const kern = ohneKommentar(readFileSync(join(vorlage, "backend", "kern", "vorgaenge.mjs"), "utf8"));
  for (const [muster, was] of [
    [/\bfetch\s*\(/, "ein Aufruf ans Netz"],
    [/node:sqlite|db\.prepare|\b(SELECT|INSERT INTO|UPDATE|DELETE FROM)\s/i, "eine Abfrage an die Datenbank"],
    [/process\.env/, "ein Griff in die Umgebung"],
  ]) {
    const treffer = kern.match(muster);
    assert(!treffer, `im Kern der Vorlage steht ${was}: ${treffer?.[0]}`);
  }

  // Und umgekehrt: die Abfragen ueber die Vorgaenge stehen an genau einer
  // Stelle. Zwei Ablagen zu derselben Entität laufen auseinander, sobald jemand
  // eine Spalte dazunimmt. Gemeint sind Anweisungen ueber Tabellen: `db.mjs`
  // legt die Datenbank an und wendet Migrationen an, das ist ihre Aufgabe.
  const backendDateien = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((eintrag) =>
      eintrag.isDirectory()
        ? backendDateien(join(dir, eintrag.name))
        : /\.mjs$/.test(eintrag.name)
          ? [join(dir, eintrag.name)]
          : []
    );
  // `db.mjs` führt den Stand der Migrationen in einer eigenen Tabelle, und nur
  // die darf sie anfassen.
  const naht = join(vorlage, "backend", "ablage", "db.mjs");
  const mitSql = backendDateien(join(vorlage, "backend")).filter(
    (datei) => datei !== naht && /\b(SELECT|INSERT INTO|UPDATE|DELETE FROM)\s/i.test(ohneKommentar(readFileSync(datei, "utf8")))
  );
  assert(
    mitSql.length === 1 && mitSql[0].endsWith(join("ablage", "vorgaenge.mjs")),
    `das SQL der Vorlage liegt an ${mitSql.length} Stellen: ${mitSql.map((d) => relative(ROOT, d)).join(", ")}`
  );
  const tabellenDerNaht = [...ohneKommentar(readFileSync(naht, "utf8")).matchAll(/\b(?:FROM|INSERT INTO|UPDATE|DELETE FROM|TABLE IF NOT EXISTS)\s+(\w+)/gi)].map((m) => m[1]);
  assert(
    tabellenDerNaht.length && tabellenDerNaht.every((name) => name === "migrationen"),
    `db.mjs fasst andere Tabellen an als ihre eigene: ${tabellenDerNaht.join(", ")}`
  );

  // Die Oberfläche hat dieselbe Regel: ein `fetch`, und es steht in der Datei,
  // die dafür da ist. Jedes weitere baute seinen eigenen Pfad und seine eigene
  // Fehlerbehandlung, und beim dritten stimmte eines von beiden nicht mehr.
  const oberflaeche = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((eintrag) =>
      eintrag.isDirectory()
        ? oberflaeche(join(dir, eintrag.name))
        : /\.tsx?$/.test(eintrag.name)
          ? [join(dir, eintrag.name)]
          : []
    );
  const mitFetch = oberflaeche(join(vorlage, "frontend", "src")).filter((datei) =>
    /\bfetch\s*\(/.test(ohneKommentar(readFileSync(datei, "utf8")))
  );
  assert(
    mitFetch.length === 1 && mitFetch[0].endsWith("schnittstelle.ts"),
    `die Oberfläche holt an ${mitFetch.length} Stellen: ${mitFetch.map((d) => relative(ROOT, d)).join(", ")}`
  );
  return "Kern ohne Netz und ohne SQL, ein SQL, ein fetch";
});

await checkAsync("Die Ablage der Vorlage wandert mit ihren Migrationen", async () => {
  // Der Stand steht in der Datenbank selbst. Eine Migration, die gelaufen ist,
  // läuft nicht noch einmal; sonst legte der zweite Start dieselbe Tabelle an
  // und der Container käme nicht hoch. Geprüft wird der Weg ohne Gerät, SQLite:
  // dasselbe SQL, das am Gerät in PostgreSQL läuft, durch die Übersetzung in
  // `db.mjs`.
  const { oeffnen } = await import(
    new URL("../templates/app/backend/ablage/db.mjs", import.meta.url).href
  );
  const { vorgangsAblage } = await import(
    new URL("../templates/app/backend/ablage/vorgaenge.mjs", import.meta.url).href
  );
  const ordner = mkdtempSync(join(tmpdir(), "ara-ablage-"));
  try {
    const datei = join(ordner, "tief", "probe.db");
    const erst = await oeffnen({ datei });
    assert(erst.db.art === "sqlite" && erst.db.dauerhaft === false, "ohne Adresse gilt die Datei als dauerhaft");
    assert(erst.angewandt.length >= 1, "beim ersten Öffnen wurde keine Migration angewandt");
    assert(erst.stand === erst.angewandt.length, `der Stand passt nicht zur Zahl: ${erst.stand}`);

    const ablage = vorgangsAblage(erst.db);
    const angelegt = await ablage.anlegen({
      titel: "Neuer Monitor",
      text: "Der alte flackert.",
      von: "Jürgen",
      gestellt: "2026-08-29T08:00:00.000Z",
      status: "wartet",
      lauf: null,
      hinweis: null,
    });
    assert(angelegt.id === 1 && angelegt.lauf === null, `der Vorgang kam anders zurück: ${JSON.stringify(angelegt)}`);
    const mitLauf = await ablage.fortschreiben(angelegt.id, { ...angelegt, lauf: 7 });
    assert(mitLauf.lauf === "7", `die Nummer des Laufs kam nicht als Text an: ${JSON.stringify(mitLauf)}`);
    assert((await ablage.wartende()).length === 1, "ein wartender Vorgang wird nicht als wartend gefunden");
    const fortgeschrieben = await ablage.fortschreiben(angelegt.id, {
      status: "genehmigt",
      entschieden_von: "Anna",
      begruendung: null,
      bemerkung: "Anna hat genehmigt.",
      hinweis: null,
    });
    assert(fortgeschrieben.status === "genehmigt" && fortgeschrieben.titel === "Neuer Monitor", "der Vorgang verlor seinen Titel");
    assert(fortgeschrieben.lauf === "7", "das Fortschreiben hat die Nummer des Laufs verloren");
    assert((await ablage.wartende()).length === 0, "ein entschiedener Vorgang wartet weiter");
    await erst.db.schliessen();

    const zweit = await oeffnen({ datei });
    assert(zweit.angewandt.length === 0, `beim zweiten Öffnen lief eine Migration erneut: ${zweit.angewandt.join(", ")}`);
    assert(zweit.stand === erst.stand, "der Stand ist beim zweiten Öffnen ein anderer");
    assert((await vorgangsAblage(zweit.db).alle()).length === 1, "der Vorgang hat den Neustart nicht überlebt");
    await zweit.db.schliessen();

    // Eine Migration, die nicht durchläuft, hält an und sagt, welche es war.
    const kaputt = join(ordner, "kaputt");
    mkdirSync(kaputt);
    writeFileSync(join(kaputt, "001-gut.sql"), "CREATE TABLE a (id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, b BYTEA);\n");
    writeFileSync(join(kaputt, "002-schlecht.sql"), "CREATE TABL b (id INTEGER);\n");
    let fehler = null;
    try {
      await oeffnen({ datei: join(ordner, "kaputt.db"), ordner: kaputt });
    } catch (e) {
      fehler = e.message;
    }
    assert(/002-schlecht\.sql/.test(fehler || ""), `eine kaputte Migration wird nicht benannt: ${fehler}`);
    const danach = await oeffnen({ datei: join(ordner, "kaputt.db"), ordner: join(ordner, "tief", "..", "leer-gibt-es-nicht") }).catch((e) => e);
    assert(danach instanceof Error, "ein Ordner ohne Migrationen wird stillschweigend angenommen");
    return `${erst.angewandt.join(", ")} einmal angewandt, beim zweiten Start nichts, eine kaputte benannt`;
  } finally {
    rmSync(ordner, { recursive: true, force: true });
  }
});

check("Der Waechter meldet einen verstellten Spiegel", () => {
  // Der Spiegel des Designsystems ist eine Kopie, und eine Kopie veraltet
  // lautlos: wer einen Baustein aendert und die Fassung nicht hebt, sieht in
  // der Oberflaeche des Geraets das Neue und in jeder App das Alte. Genau die
  // zwei Erscheinungsbilder, gegen die die Bibliothek gebaut wurde. Nichts an
  // einer laufenden App wuerde davon rot.
  const dir = join(ROOT, ".ara", "templates", "app", "frontend", "src", "marken");
  const bibliothek = readLibrary(dir);
  assert(bibliothek?.fassung, "die Vorlage traegt keine Bibliothek");
  const satz = sets(bibliothek);
  assert(satz.bausteine >= 6, `nur ${satz.bausteine} Bausteine in der Vorlage`);
  assert(satz.primitive >= 40, `nur ${satz.primitive} Primitive in der Vorlage`);
  assert(satz.muster >= 9, `nur ${satz.muster} Muster in der Vorlage`);
  assert(tool("marken.mjs", []).status === 0, "der Waechter faellt ueber den unveraenderten Spiegel");

  // Der Eingriff sitzt in einem Unterordner. Ein Waechter, der nur die oberste
  // Ebene liest, kam bis zum 29.08.2026 hier durch -- und genau dort liegen
  // fuenfundfuenfzig der einundsiebzig Dateien.
  const opfer = join(dir, "primitive", "button.tsx");
  const heil = readFileSync(opfer, "utf8");
  try {
    // Von Hand verstellt: dieselbe Fassung, anderer Inhalt.
    writeFileSync(opfer, `${heil}\n// eine Zeile, die niemand nachgezogen hat\n`);
    const verstellt = tool("marken.mjs", []);
    assert(verstellt.status === 1, "eine verstellte Datei kam durch");
    assert(/primitive\/button\.tsx/.test(verstellt.stdout), `der Befund nennt die Datei nicht: ${verstellt.stdout}`);
    assert(/von Hand verstellt/.test(verstellt.stdout), `der Befund sagt nicht, was ist: ${verstellt.stdout}`);

    // Weg ist auch ein Befund: eine Datei, die im Stempel steht und im Ordner fehlt.
    rmSync(opfer);
    const fehlt = tool("marken.mjs", []);
    assert(fehlt.status === 1, "eine fehlende Datei kam durch");
    assert(/fehlt im Spiegel/.test(fehlt.stdout), `der Befund zur fehlenden Datei fehlt: ${fehlt.stdout}`);
  } finally {
    writeFileSync(opfer, heil);
  }
  assert(tool("marken.mjs", []).status === 0, "der Spiegel wurde nicht wiederhergestellt");

  // Ohne Spiegel des Produkts tritt die Vorlage als Quelle an. Sonst sagte der
  // Waechter "zieh nach", und --sync antwortete, es gebe nichts, woraus: genau
  // die Sackgasse, in der das Kit am 29.08.2026 stand, denn die Auslieferung
  // 0.3.0 traegt packages/marken noch nicht. Ihre eigene Quelle ist die
  // Vorlage nie.
  const ausSichSelbst = tool("marken.mjs", ["--sync", "--scaffold"]);
  assert(ausSichSelbst.status === 1, "die Vorlage wurde aus sich selbst nachgezogen");
  assert(
    /eigene Quelle/.test(ausSichSelbst.stderr + ausSichSelbst.stdout),
    `der Grund fehlt: ${ausSichSelbst.stderr}${ausSichSelbst.stdout}`
  );

  // Eine Quelle, die weiter ist als der Spiegel: dann ist er veraltet und
  // nicht verstellt, und der Waechter sagt beides verschieden. Sie tritt als
  // PAKET an, so wie das Produkt sie ausliefert: Stempel und `src/`.
  const quelle = mkdtempSync(join(tmpdir(), "ara-marken-"));
  try {
    const dateien = {};
    for (const [name, text] of bibliothek.files) {
      const ziel = join(quelle, "src", name);
      mkdirSync(dirname(ziel), { recursive: true });
      writeFileSync(ziel, name === "fassung.ts" ? "export const FASSUNG = '99.0.0';\n" : text);
      dateien[`src/${name}`] = hashOf(readFileSync(ziel, "utf8"));
    }
    writeFileSync(
      join(quelle, "marken.json"),
      JSON.stringify({ fassung: "99.0.0", abhaengigkeiten: bibliothek.abhaengigkeiten, dateien }, null, 2)
    );
    const alt = tool("marken.mjs", ["--source", quelle]);
    assert(alt.status === 1, "ein veralteter Spiegel kam durch");
    assert(/99\.0\.0/.test(alt.stdout), `die Fassung der Quelle wird nicht genannt: ${alt.stdout}`);

    // Das Paket wird an seinem eigenen Stempel gemessen. Eine Datei, die nicht
    // zu ihrem Hash passt, ist keine Quelle: was daraus in eine App ginge,
    // waere nicht das, was ausgeliefert wurde.
    const geleseneQuelle = readPackage(quelle);
    assert(geleseneQuelle?.befunde.length === 0, `das erfundene Paket ist schon schief: ${geleseneQuelle?.befunde}`);
    writeFileSync(join(quelle, "src", "cn.ts"), "// verstellt\n");
    assert(readPackage(quelle).befunde.length === 1, "ein verstelltes Paket kam durch");
    const verstelltesPaket = tool("marken.mjs", ["--source", quelle]);
    assert(verstelltesPaket.status !== 0, "der Waechter nahm ein verstelltes Paket als Quelle");
    assert(
      /cn\.ts/.test(verstelltesPaket.stderr + verstelltesPaket.stdout),
      `der Befund nennt die Datei nicht: ${verstelltesPaket.stderr}${verstelltesPaket.stdout}`
    );
  } finally {
    rmSync(quelle, { recursive: true, force: true });
  }
  return `${bibliothek.files.size} Dateien (${satz.primitive} Primitive, ${satz.muster} Muster, ${satz.bausteine} Bausteine), Fassung ${bibliothek.fassung}, verstellt, fehlend, veraltet, Paket am eigenen Stempel und die Vorlage als eigene Quelle`;
});

check("Das Aussehen einer App kommt aus der Bibliothek und aus sonst nichts", () => {
  // Bis zum 29.08.2026 schrieb das Kit die Werte beim Anlegen als `design.css`
  // daneben, aus der `index.css` der Shell abgelesen. Seit die Bibliothek als
  // Paket kommt, traegt sie ihre Tokens selbst -- und zwei Dateien, die
  // dieselben Marken setzen, sind die zweite Wahrheit: die eine sagte, Hell
  // sei die Vorgabe, die andere Schwarz. Also gibt es nur noch eine.
  const dir = join(ROOT, ".ara", "templates", "app", "frontend", "src", "marken");
  const bibliothek = readLibrary(dir);
  assert(bibliothek, "die Vorlage traegt keine Bibliothek");
  for (const datei of ["theme.css", "marken.css"]) {
    assert(bibliothek.files.has(datei), `im Spiegel fehlt ${datei}`);
  }

  // Die Reihenfolge und die Schichten stehen so in der EINBAU.md des Pakets,
  // und beide Angaben sind Bedingungen: `@theme` in einer Schicht ist keins
  // mehr, und ungeschichtetes CSS gewinnt gegen jede Utility.
  const stil = readFileSync(join(ROOT, ".ara", "templates", "app", "frontend", "src", "stil.css"), "utf8");
  const reihe = ['@import "tailwindcss"', '@import "tw-animate-css"', './marken/theme.css";', './marken/marken.css" layer(components);'];
  let zuletzt = -1;
  for (const stueck of reihe) {
    const stelle = stil.indexOf(stueck);
    assert(stelle > zuletzt, `in stil.css steht ${stueck} nicht nach dem davor`);
    zuletzt = stelle;
  }
  assert(!stil.includes("design.css\""), "stil.css laedt noch eine design.css");
  assert(!existsSync(join(ROOT, ".ara", "tools", "lib", "design.mjs")), "lib/design.mjs liegt noch da");

  // Zwei Themen, und Hell setzt nichts. Das ist der Vertrag des Geraets, und
  // die Vorlage hielt bis zum 29.08.2026 einen anderen: sie kannte drei Werte
  // und schrieb ihren Rueckfall `black` an ihr eigenes `<html>` -- in einer
  // hellen Oberflaeche stand damit ein schwarzer Rahmen.
  const thema = readFileSync(join(ROOT, ".ara", "templates", "app", "frontend", "src", "rahmen", "thema.ts"), "utf8");
  assert(/THEMEN = \["light", "dark"\]/.test(thema), "die Vorlage kennt nicht genau die zwei Themen des Geraets");
  assert(!/"black"/.test(thema), "die Vorlage kennt noch das Thema black");
  const theme = bibliothek.files.get("theme.css");
  assert(theme.includes(":root {"), "theme.css traegt keinen :root-Block");
  assert(/\[data-theme=['"]dark['"]\]/.test(theme), "theme.css traegt keinen Block fuer Dunkel");

  return `theme.css und marken.css im Spiegel, stil.css in der Reihenfolge der EINBAU.md, zwei Themen`;
});

check("Die Vorlage steht auf Marken 5.0.0, ein Diagramm kommt nur über @marken/diagramm", () => {
  // Eine App aus dem Kit sieht erst dann aus wie das Geraet, wenn ihr Spiegel
  // auf derselben Fassung steht. 5.0.0 bringt das Blau mit 4,5:1, die
  // Auswahl und die Kuerzung der Datenliste und das Diagramm ausserhalb des
  // Sammelexports; eine aeltere Fassung hat davon nichts.
  const vorlage = join(ROOT, ".ara", "templates", "app", "frontend");
  const bibliothek = readLibrary(join(vorlage, "src", "marken"));
  const [haupt] = String(bibliothek?.fassung).split(".").map(Number);
  assert(haupt >= 5, `der Spiegel der Vorlage steht auf ${bibliothek?.fassung}, nicht auf 5.0.0 oder neuer`);
  assert(bibliothek.files.has("diagramm.ts"), "der Spiegel trägt kein diagramm.ts");
  assert(!/from ['"]\.\/chart['"]/.test(bibliothek.files.get("primitive/index.ts")), "primitive/index.ts gibt das Diagramm wieder im Sammelexport aus");
  assert(/"@marken\/\*"\s*:\s*\[\s*"\.\/src\/marken\/\*"\s*\]/.test(readFileSync(join(vorlage, "tsconfig.json"), "utf8")), "die tsconfig der Vorlage kennt @marken/* nicht");

  // Wer `Chart` aus `@marken` holt, findet dort seit 5.0.0 nichts, und der
  // Bau faellt erst beim Uebersetzen. Gefragt werden Vorlage und Muster.
  const falsch = [];
  for (const wurzel of [join(vorlage, "src"), join(ROOT, ".ara", "templates", "app-patterns")]) {
    for (const name of readdirSync(wurzel, { recursive: true })) {
      if (!/\.tsx?$/.test(name) || /(^|[\\/])marken[\\/]/.test(name)) continue;
      const text = readFileSync(join(wurzel, name), "utf8");
      for (const [, namen] of text.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']@marken["']/g)) {
        if (/\b(Chart|Sparkline|SERIENFARBEN)\b/.test(namen)) falsch.push(name);
      }
    }
  }
  assert(falsch.length === 0, `holt ein Diagramm aus @marken statt aus @marken/diagramm: ${falsch.join(", ")}`);
  return `Spiegel ${bibliothek.fassung}, diagramm.ts eigener Einstieg, @marken/* in der tsconfig`;
});

check("Vorlage und Muster reden wie das Gerät, mit Sie oder ohne Anrede, und --check meldet du und dir", () => {
  // Am 26.09.2026 stand auf der Freigabekarte eines Partners „Eine Freigabe
  // wartet auf Ihre Entscheidung" und darunter „liest du in Abschluss": das
  // Gerät siezt, die Flow-Vorlage duzte, Muster 7 auch. Ein Bauender übernimmt
  // den Ton der Muster.
  const befunde = [];
  for (const ordner of [join(ROOT, ".ara", "templates", "app"), ...readdirSync(PATTERNS).map((n) => join(PATTERNS, n))]) {
    if (!statSync(ordner).isDirectory()) continue;
    for (const b of addressFindings(ordner)) befunde.push(`${relative(ROOT, ordner)}/${b.datei}:${b.zeile} ${b.text}`);
  }
  assert(befunde.length === 0, `Vorlage oder Muster duzen:\n    ${befunde.join("\n    ")}`);

  // Die Prüfung selbst: sie findet du und dir in Oberfläche, Backend und Flow,
  // und sie hält Namen im Code und Pfade heraus.
  const dir = mkdtempSync(join(tmpdir(), "ara-anrede-"));
  try {
    mkdirSync(join(dir, "frontend", "src"), { recursive: true });
    mkdirSync(join(dir, "backend", "kern"), { recursive: true });
    mkdirSync(join(dir, "flows"), { recursive: true });
    writeFileSync(
      join(dir, "frontend", "src", "seite.tsx"),
      'import { x } from "./dir/x";\nconst dir = 1;\n// Hier steht du im Kommentar.\nexport const S = () => <p titel="Welche Mandanten Sie sehen">Dir ist nichts zugeordnet.</p>;\n'
    );
    writeFileSync(join(dir, "backend", "kern", "satz.mjs"), 'const dir = "/tmp";\nexport const satz = `Das kannst du nicht.`;\n');
    writeFileSync(join(dir, "flows", "freigabe.md"), "---\ntitel: x\nzusammenhang: Bitte lies du das.\n---\n");
    const gefunden = addressFindings(dir).map((b) => `${b.datei}:${b.zeile}:${b.wort}`);
    assert(
      gefunden.length === 3 &&
        gefunden.includes("frontend/src/seite.tsx:4:Dir") &&
        gefunden.includes("backend/kern/satz.mjs:2:du") &&
        gefunden.includes("flows/freigabe.md:3:du"),
      `die Prüfung der Anrede trifft daneben: ${gefunden.join(", ")}`
    );
    assert(addressSection(dir).some((z) => /Anrede|Address/.test(z)), "der Abschnitt für --check nennt die Anrede nicht");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return "Vorlage und alle Muster ohne du und dir, die Prüfung trifft Oberfläche, Backend und Flow und lässt Code und Pfade";
});

await checkAsync("Das gebaute Gerüst hält bei 1280 px jede Spalte, mit 120 Zeichen Titel und 200 Zeilen", async () => {
  // Am 26.09.2026 gemessen: mit einem langen Titel war die Tabelle 1309 px
  // breit in einem Kasten von 860, die Spalte Stand lag draussen, und die
  // Einzelheiten standen unsichtbar unter 200 Zeilen. Das sieht man nur am
  // gebauten Gerüst in einem Browser, also baut diese Prüfung es und misst.
  if (process.env.ARA_SELFTEST_KLON) return "übersprungen, im Klon liegt dieselbe Vorlage, der Worktree misst sie";
  if (spawnSync("npm", ["--version"], { encoding: "utf8" }).status !== 0) return "übersprungen, hier gibt es kein npm";
  const browser = tool("pdf.mjs", ["--browser"]);
  if (browser.status !== 0) return "übersprungen, kein Chromium auf diesem Rechner";
  const chromium = browser.stdout.split("\n")[0].trim();

  const work = mkdtempSync(join(tmpdir(), "ara-geruest-"));
  const front = join(work, "frontend");
  const laufen = (befehl, args, cwd) =>
    new Promise((fertig) => {
      const kind = spawn(befehl, args, { cwd });
      let ausgabe = "";
      kind.stdout.on("data", (d) => (ausgabe += d));
      kind.stderr.on("data", (d) => (ausgabe += d));
      kind.on("close", (status) => fertig({ status, ausgabe }));
    });
  let server;
  try {
    cpSync(join(ROOT, ".ara", "templates", "app", "frontend"), front, {
      recursive: true,
      filter: (quelle) => !/node_modules|[\\/]dist$/.test(quelle),
    });
    for (const datei of ["package.json", "index.html", join("src", "app.tsx")]) {
      const pfad = join(front, datei);
      writeFileSync(pfad, readFileSync(pfad, "utf8").replace(/\{\{id\}\}/g, "geruest").replace(/\{\{name\}\}/g, "Gerüst"));
    }
    const geholt = await laufen("npm", ["install", "--no-audit", "--no-fund", "--prefer-offline"], front);
    if (geholt.status !== 0) return `übersprungen, npm install ging nicht: ${geholt.ausgabe.trim().split("\n").pop()}`;
    const gebaut = await laufen("npm", ["run", "build"], front);
    assert(gebaut.status === 0, `das Gerüst baut nicht:\n${gebaut.ausgabe.split("\n").slice(-12).join("\n")}`);

    // Der Diagrammcode gehört nicht in eine App, die kein Diagramm zeigt.
    const skripte = readdirSync(join(front, "dist", "assets")).filter((name) => name.endsWith(".js"));
    const buendel = skripte.map((name) => readFileSync(join(front, "dist", "assets", name), "utf8")).join("");
    assert(!/recharts/.test(buendel), "Recharts steckt im Bündel, obwohl keine Seite ein Diagramm zeigt");
    // 5.0.0 mit dem Diagramm ausserhalb des Sammelexports: 415 KB roh am
    // 26.09.2026, mit dem Diagramm darin waren es 690. Die Grenze liegt
    // dazwischen und faengt ein Diagramm, das zurueck ins Buendel rutscht.
    const kb = Math.round(Buffer.byteLength(buendel) / 1024);
    assert(kb < 500, `das Bündel des Gerüsts hat ${kb} KB, mehr als 500`);

    const TITEL = "Rahmenvertrag Wartung und Bereitschaft für die Filiale Nord, verlängert um zwölf Monate mit neuer Preisstaffel ab Januar 2027";
    assert(TITEL.length >= 120, `der Probetitel hat nur ${TITEL.length} Zeichen`);
    const staende = ["wartet", "genehmigt", "abgelehnt", "abgelaufen", "ohne entscheidung", "ohne lauf"];
    const vorgaenge = Array.from({ length: 200 }, (_, i) => ({
      id: 200 - i,
      titel: i % 3 === 0 ? TITEL : `Bestellung ${200 - i}`,
      text: "ohne Angabe",
      von: i % 2 ? "Dora Langername-Doppelname" : "Anna Beispiel",
      gestellt: new Date(Date.now() - i * 3_600_000).toISOString(),
      status: staende[i % staende.length],
      entschieden_von: null,
      begruendung: null,
      bemerkung: null,
      hinweis: null,
      ...(i % staende.length === 0 ? { entscheidet: { konten: null, ohne: "Anna Beispiel" } } : {}),
    }));

    // Die Messung laeuft in der Seite und schreibt ihr Ergebnis hinein;
    // `--dump-dom` gibt es heraus. Sie wartet, bis 200 Zeilen stehen; die
    // Einzelheiten zeichnet derselbe Durchgang.
    const messung = `<script>
      const lum = (c) => c.slice(0, 3).map((v) => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
        .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
      const farbe = (s) => { const t = (s.match(/rgba?\\(([^)]+)\\)/) || [, "0 0 0 0"])[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [t[0], t[1], t[2], t[3] ?? 1]; };
      const mischen = (o, u) => [0, 1, 2].map((i) => o[i] * o[3] + u[i] * (1 - o[3])).concat(1);
      const grund = (el) => { const s = []; for (let e = el; e; e = e.parentElement) { const f = farbe(getComputedStyle(e).backgroundColor); if (f[3] > 0) s.push(f); if (f[3] === 1) break; } return s.reverse().reduce((g, f) => mischen(f, g), [255, 255, 255, 1]); };
      const warten = setInterval(() => {
        if (document.querySelectorAll('tbody tr').length < 200) return;
        clearInterval(warten);
        const aside = document.querySelector('aside');
        const befunde = [];
        const d = document.documentElement;
        if (d.scrollWidth > d.clientWidth + 1) befunde.push('die Seite ist ' + d.scrollWidth + ' px breit bei ' + d.clientWidth);
        for (const k of document.querySelectorAll('[data-slot="table-container"]')) {
          if (k.scrollWidth > k.clientWidth + 1) befunde.push('die Tabelle ist ' + k.scrollWidth + ' px breit in einem Kasten von ' + k.clientWidth);
          for (const th of k.querySelectorAll('th')) if (th.getBoundingClientRect().right > k.getBoundingClientRect().right + 1) befunde.push('die Spalte ' + th.textContent + ' liegt draussen');
        }
        const r = aside ? aside.getBoundingClientRect() : { top: innerHeight };
        if (r.top >= innerHeight || r.bottom <= 0 || r.left >= innerWidth) befunde.push('die Einzelheiten stehen nicht im Fenster neben der Liste');
        else if (!aside.textContent.includes(${JSON.stringify(TITEL)})) befunde.push('die Einzelheiten zeigen den Titel nicht ganz');
        // Auswahl und Kuerzung sind die der Datenliste (Marken 5.0.0), keine
        // eigene Loesung: jede Zeile in der Tab-Reihenfolge, die gewaehlte
        // traegt aria-selected, der lange Titel steht ganz im title.
        if (document.querySelector('.vorgang-wahl, .zeile-wahl')) befunde.push('die Liste waehlt noch mit einer eigenen Loesung');
        const zeilen = [...document.querySelectorAll('tbody tr[tabindex="0"]')];
        if (zeilen.length !== 200) befunde.push('nur ' + zeilen.length + ' Zeilen sind per Tastatur erreichbar');
        if (document.querySelectorAll('tbody tr[aria-selected="true"]').length !== 1) befunde.push('die gewaehlte Zeile traegt kein aria-selected');
        if (![...document.querySelectorAll('tbody [title]')].some((el) => el.title === ${JSON.stringify(TITEL)})) befunde.push('der lange Titel ist nicht gekuerzt oder steht nicht ganz im title');
        zeilen[0]?.focus();
        zeilen[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        if (document.activeElement !== zeilen[1]) befunde.push('der Pfeil nach unten fuehrt nicht zur naechsten Zeile');
        let k = Infinity;
        for (const el of document.querySelectorAll('.stand, .stand__wort, .stand__wer')) {
          const g = grund(el); const v = mischen(farbe(getComputedStyle(el).color), g);
          const [h, n] = [lum(v), lum(g)].sort((a, b) => b - a); k = Math.min(k, (h + 0.05) / (n + 0.05));
        }
        if (!(k >= 4.5)) befunde.push('der Stand haelt nur ' + k.toFixed(2) + ':1');
        const pre = document.createElement('pre'); pre.id = 'messung';
        pre.textContent = JSON.stringify({ breite: innerWidth, kontrast: Number(k.toFixed(2)), befunde });
        document.body.append(pre);
      }, 100);
    </script>`;
    const seite = readFileSync(join(front, "dist", "index.html"), "utf8").replace("</body>", `${messung}</body>`);
    const TYPEN = { ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".html": "text/html" };
    server = createServer((anfrage, antwort) => {
      const weg = new URL(anfrage.url, "http://x").pathname;
      const json = (daten) => {
        antwort.writeHead(200, { "content-type": "application/json" });
        antwort.end(JSON.stringify(daten));
      };
      if (weg === "/api/me") return json({ benutzer: "Anna Beispiel", rolle: "admin" });
      if (weg === "/api/lage") return json({ app: "geruest", arasul: true, hinweis: null, geraet: "gespielt" });
      if (weg === "/api/vorgaenge") return json({ vorgaenge });
      const datei = join(front, "dist", weg);
      if (weg.startsWith("/assets/") && existsSync(datei) && statSync(datei).isFile()) {
        antwort.writeHead(200, { "content-type": TYPEN[datei.slice(datei.lastIndexOf("."))] || "application/octet-stream" });
        return antwort.end(readFileSync(datei));
      }
      antwort.writeHead(200, { "content-type": "text/html" });
      antwort.end(seite);
    });
    await new Promise((bereit) => server.listen(0, "127.0.0.1", bereit));
    const adresse = `http://127.0.0.1:${server.address().port}/?nr=200`;

    const lauf = await laufen(
      chromium,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--no-first-run",
        `--user-data-dir=${join(work, "profil")}`,
        "--window-size=1280,800",
        "--virtual-time-budget=20000",
        "--dump-dom",
        adresse,
      ],
      work
    );
    const treffer = lauf.ausgabe.match(/<pre id="messung">([^<]*)<\/pre>/);
    assert(treffer, `die Seite hat nicht zu Ende gezeichnet: ${lauf.ausgabe.split("\n").slice(-3).join(" | ").slice(0, 300)}`);
    const ergebnis = JSON.parse(treffer[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
    assert(ergebnis.breite === 1280, `gemessen bei ${ergebnis.breite} px statt 1280`);
    assert(ergebnis.befunde.length === 0, ergebnis.befunde.join(" | "));
    return `1280 px, 200 Zeilen, Titel mit ${TITEL.length} Zeichen: nichts ragt hinaus, Einzelheiten sichtbar, Auswahl der Datenliste, Stand ${ergebnis.kontrast}:1, Bündel ${kb} KB`;
  } finally {
    server?.close();
    rmSync(work, { recursive: true, force: true });
  }
});

check("Die Vereinbarung für eine App kommt aus dem Kontrakt, und was fehlt, wird gesagt", () => {
  const voll = appArrangement(KONTRAKT, { device: "probe", date: "2026-08-29" });
  assert(voll.missing.length === 0, `am vollständigen Kontrakt fehlt etwas: ${voll.missing.join(" | ")}`);
  assert(voll.umgebung.basis === "ARASUL_BASIS_URL", "der Name der Adresse kommt nicht aus dem Kontrakt");
  assert(voll.kopf === KONTRAKT.schluessel.kopf, "der Schlüsselkopf kommt nicht aus dem Kontrakt");
  for (const weg of APP_WAYS.filter((w) => w.pflicht)) assert(voll.wege[weg.key], `der Weg ${weg.key} wurde nicht gefunden`);
  // Die Wege zu einem Dokument nennt dieser Kontrakt nicht, und das ist kein
  // Mangel: das Gerät bietet sie nicht an, und die Vereinbarung sagt es anders.
  assert(voll.wege.dokument_auslesen === null && voll.unangeboten.includes("dokument_auslesen"), "ein Weg, den das Gerät nicht anbietet, wurde erfunden oder als Mangel gezählt");
  assert(voll.koepfe.benutzer === KONTRAKT.koepfe.benutzer && voll.koepfe.rolle === KONTRAKT.koepfe.rolle, "die Namen der Kopfzeilen kommen nicht aus dem Kontrakt");
  assert(voll.freigaben.einreicher === false && voll.daten === null, "ein Gerät ohne `freigaben` und `daten` bekommt sie angedichtet");
  assert(voll.protokoll === null, "ein Gerät ohne `protokoll` bekommt eine Kopfzeile für den Menschen angedichtet");
  assert(
    arrangementLines(voll).some((zeile) => /(does not say how a model call names its human|sagt nicht, wie ein Modellaufruf seinen Menschen nennt)/.test(zeile)),
    "die Vereinbarung sagt nicht, dass dieses Gerät keinen Menschen zum Modellaufruf nimmt"
  );

  // Ein Gerät vom 25.09.2026: Datenbank, Einreicher, Regel, Auslesen.
  const neu = appArrangement(
    {
      ...KONTRAKT,
      umgebung: { ...KONTRAKT.umgebung, datenbank: "ARASUL_DATENBANK" },
      daten: { ort: "datenbank", je_stand: true },
      freigaben: { start: { properties: { args: {}, einreicher: { type: "string" }, freigabe: { type: "object" } } } },
      endpunkte: [...KONTRAKT.endpunkte, { verb: "POST", pfad: "/api/v1/external/document/extract-structured", bereich: "document:extract" }],
    },
    {}
  );
  assert(neu.umgebung.datenbank === "ARASUL_DATENBANK", "der Name der Datenbank kommt nicht aus dem Kontrakt");
  assert(neu.freigaben.einreicher && neu.freigaben.regel, "Einreicher und Regel werden am Schema des Starts nicht erkannt");
  assert(neu.daten?.je_stand === true, "`daten` wird nicht gelesen");
  assert(neu.wege.dokument_auslesen?.pfad.endsWith("/document/extract-structured"), "der Weg zum Auslesen fehlt, obwohl das Gerät ihn nennt");

  // Ein Gerät vom 26.09.2026: es nennt, wie ein Modellaufruf seinen Menschen nennt.
  const mitProtokoll = appArrangement(VORLAGE_KONTRAKT, {});
  assert(
    JSON.stringify(mitProtokoll.protokoll) ===
      JSON.stringify({ wege: VORLAGE_KONTRAKT.protokoll.wege, kopf: "x-geraet-fuer", feld: "einreicher", feld_openai: "user" }),
    `\`protokoll\` kommt nicht so aus dem Kontrakt, wie er es nennt: ${JSON.stringify(mitProtokoll.protokoll)}`
  );
  assert(mitProtokoll.wege.modell_fragen?.pfad.endsWith("/llm/chat"), "der Weg, ein Modell zu fragen, fehlt, obwohl das Gerät ihn nennt");
  assert(arrangementLines(mitProtokoll).some((zeile) => zeile.includes("x-geraet-fuer")), "die Vereinbarung nennt die Kopfzeile für den Menschen nicht");

  // Ein Gerät, das nichts davon verspricht: das Kit erfindet nichts, es zählt
  // auf, was fehlt, und jeder Weg steht als null in der Datei.
  const leer = appArrangement({ kontrakt: 1, endpunkte: [] }, {});
  assert(leer.missing.length === 6, `unvollständige Mängelliste: ${leer.missing.join(" | ")}`);
  for (const weg of APP_WAYS) assert(leer.wege[weg.key] === null, `${weg.key} wurde erfunden`);
  assert(leer.koepfe.benutzer === null, "der Name der Benutzerkopfzeile wurde erfunden");
  const datei = JSON.parse(arrangementFile(leer));
  assert(datei.missing === undefined && datei.unangeboten === undefined, "die Mängelliste geht mit ins Paket");

  // Ein Kontrakt, der die Namen als Einträge führt statt als Zeichenketten.
  const alsEintrag = appArrangement(
    { ...KONTRAKT, umgebung: { basis: { name: "A" }, schluessel: { was: "kein Name" } } },
    {}
  );
  assert(alsEintrag.umgebung.basis === "A", "ein Name unter `name` wird nicht gelesen");
  assert(alsEintrag.umgebung.schluessel === null, "ein Eintrag ohne Namen wird für einen gehalten");
  assert(alsEintrag.missing.some((satz) => /schluessel/.test(satz)), "der fehlende Name wird nicht genannt");
  return "voller Kontrakt, einer vom 25.09.2026, leerer Kontrakt, Namen als Einträge";
});
await checkAsync("Das Artefakt sagt selbst, wie es installiert wird, und geht sauber an das Gerät", async () => {
  const work = mkdtempSync(join(tmpdir(), "ara-artefakt-"));
  const mirror = join(work, "spiegel");
  const ziel = join(work, "geraet");
  const gemerkt = process.env.ARA_MIRROR;
  mkdirSync(join(mirror, "config", "platforms"), { recursive: true });
  process.env.ARA_MIRROR = mirror;
  try {
    // 1. Ein Artefakt, das nicht sagt, wie es sich installiert: das Kit rät nicht.
    writeFileSync(join(mirror, "README.md"), "# Irgendetwas\n");
    let entry = installerEntry();
    assert(!entry.ok && /arasul-release\.json/.test(entry.reason), `ohne die Datei behauptet das Kit einen Weg: ${entry.reason}`);

    // 2. Eine Datei, die eine Datei nennt, die es nicht gibt: auch dann nicht.
    //    Genau hier lag der Fund vom 28.08.2026: das Kit rief einen Namen auf,
    //    den es auswendig kannte, und den es im Artefakt nie gab.
    writeFileSync(
      join(mirror, "arasul-release.json"),
      JSON.stringify({ fassung: "9.9.9", einstiegspunkt: "install.sh" })
    );
    entry = installerEntry();
    assert(!entry.ok && /liegt aber nicht/.test(entry.reason), `ein Einstiegspunkt ohne Datei wird angenommen: ${entry.reason}`);

    // 3. Mit Datei: der Name kommt aus der JSON und nicht aus dem Kit.
    writeFileSync(join(mirror, "install.sh"), "#!/bin/sh\n");
    writeFileSync(join(mirror, "config", "platforms", "probe.json"), "{}\n");
    writeFileSync(join(mirror, "STATE.json"), JSON.stringify({ fetched: "2026-08-27T10:00:00.000Z", source: "https://probe", version: "9.9.9" }));
    entry = installerEntry();
    assert(entry.ok && entry.file === "install.sh", `Einstiegspunkt nicht aus der Datei gelesen: ${JSON.stringify(entry)}`);
    assert(mirrorState().version === "9.9.9", "Stand des Artefakts nicht gelesen");
    assert(mirrorState().source === "https://probe", "Quelle des Artefakts nicht gelesen");

    // 4. Gerufen wird er mit Startpasswort und Netzname, denn nur dabei
    //    entstehen Netzname, Fassung, Startpasswort und die Erstausgabe. Der
    //    Aufruf wird angezeigt, das Passwort darin nicht.
    const call = installCommand(entry, { password: "geheim-123", netName: "werk2" });
    assert(/^\.\/install\.sh /.test(call.command), `der Aufruf beginnt nicht mit dem Einstiegspunkt: ${call.command}`);
    assert(/--passwort 'geheim-123'/.test(call.command), `das Startpasswort fehlt im Aufruf: ${call.command}`);
    assert(/--name 'werk2'/.test(call.command), `der Netzname fehlt im Aufruf: ${call.command}`);
    assert(!/geheim-123/.test(call.shown), `das Startpasswort steht in der Anzeige: ${call.shown}`);
    assert(!/geheim-123/.test(scrub(`cd x && ${call.command}`)), "scrub lässt das Startpasswort stehen");
    assert(/werk2/.test(call.shown), "die Anzeige verschweigt auch den Netznamen");

    // 5. Das Ziel am Gerät ist nicht der Ordner, den die Spurensuche als
    //    laufende Plattform wertet. Sonst findet das Kit beim nächsten Lauf
    //    sich selbst.
    const target = installTarget("9.9.9");
    assert(/arasul-9\.9\.9/.test(target), `das Ziel trägt die Fassung nicht: ${target}`);
    assert(services(parseProbe("@arasul_dir=/home/x/arasul-9.9.9")).arasul.state === "traces", "das eigene Artefakt gilt als laufende Plattform");

    // 6. Schieben: was im Spiegel liegt, liegt danach am Ziel, samt
    //    Unterordnern. Die Beiwerkdateien von macOS bleiben draußen: am
    //    28.08.2026 kamen 1124 davon am Orin an, und Traefik stieg an einer aus.
    writeFileSync(join(mirror, "config", "._middlewares.yml"), "Beiwerk\n");
    writeFileSync(join(mirror, "._install.sh"), "Beiwerk\n");
    const geschoben = await ship(null, "local", JSON.stringify(ziel));
    assert(geschoben.ok, `Schieben fehlgeschlagen: ${geschoben.message}`);
    assert(existsSync(join(ziel, "install.sh")), "der Einstiegspunkt kam nicht an");
    assert(existsSync(join(ziel, "config", "platforms", "probe.json")), "Unterordner kamen nicht an");
    assert(!existsSync(join(ziel, "._install.sh")), "eine ._-Datei aus der Wurzel kam am Gerät an");
    assert(!existsSync(join(ziel, "config", "._middlewares.yml")), "eine ._-Datei aus einem Unterordner kam am Gerät an");
    return `${entry.file}, Ziel ${target}, Stand 9.9.9`;
  } finally {
    if (gemerkt === undefined) delete process.env.ARA_MIRROR;
    else process.env.ARA_MIRROR = gemerkt;
    rmSync(work, { recursive: true, force: true });
  }
});

await checkAsync("Aus der Erstausgabe des Installers kommt kein Klartext", async () => {
  // Fund 2 des zweiten Fremdtests am 28.08.2026. Der Installer druckt den
  // Kit-Schlüssel in seine Erstausgabe, das Kit reichte diese Ausgabe
  // unverändert durch und schrieb danach „Klartext wird nicht angezeigt". Der
  // Schlüssel stand da schon auf dem Bildschirm.
  const schluessel = "aras_9Zk3mQx7BvT2Lw";
  const passwort = "start-geheim-4711";

  // Zuerst das Stück für sich: ein Geheimnis, das über zwei Stücke des Stroms
  // verteilt ankommt, darf nicht durchrutschen.
  const masker = createMasker([passwort]);
  let gesehen = "";
  gesehen += masker.push("Kit-Schluessel: ara");
  gesehen += masker.push("s_9Zk3mQx7BvT2Lw\nPasswort: start-");
  gesehen += masker.push("geheim-4711\n");
  gesehen += masker.flush();
  assert(!gesehen.includes(schluessel), `der Schlüssel kam über zwei Stücke durch: ${gesehen}`);
  assert(!gesehen.includes(passwort), `das Passwort kam über zwei Stücke durch: ${gesehen}`);
  assert(/aras_…/.test(gesehen), `der Schlüssel wurde nicht als solcher benannt: ${gesehen}`);

  // Eine angefangene Zeile, aus der kein Geheimnis mehr werden kann, wartet
  // nicht: sonst bliebe die Frage des Installers nach dem sudo-Passwort
  // unsichtbar, bis jemand blind Enter drückt.
  const frage = createMasker([passwort]);
  assert(
    frage.push("[sudo] password for arasul: ").includes("password for arasul:"),
    "eine Eingabeaufforderung ohne Zeilenende wird zurückgehalten"
  );

  // Und dann der ganze Weg: ein Installer, der beides ausgibt, lokal gerufen.
  const skript = [
    `echo "Arasul eingerichtet."`,
    `echo "Kit-Schluessel: ${schluessel}"`,
    `echo "Administrator: admin / ${passwort}"`,
    `echo "Oberflaeche: https://werk2.local/"`,
  ].join("; ");

  const original = process.stdout.write.bind(process.stdout);
  let bildschirm = "";
  process.stdout.write = (chunk) => {
    bildschirm += String(chunk);
    return true;
  };
  let lauf;
  try {
    lauf = await runInstaller(null, "local", skript, { secrets: [passwort] });
  } finally {
    process.stdout.write = original;
  }

  assert(lauf.status === 0, `der gespielte Installer ist mit ${lauf.status} beendet`);
  assert(!bildschirm.includes(schluessel), `der Kit-Schlüssel stand auf dem Bildschirm: ${bildschirm}`);
  assert(!bildschirm.includes(passwort), `das Startpasswort stand auf dem Bildschirm: ${bildschirm}`);
  assert(!lauf.output.includes(schluessel), "der Kit-Schlüssel steht in dem, was das Kit behält");
  assert(!lauf.output.includes(passwort), "das Startpasswort steht in dem, was das Kit behält");
  // Mitgelesen heißt nicht verschluckt: alles andere kommt an.
  assert(/Arasul eingerichtet/.test(bildschirm), `die Ausgabe des Installers fehlt: ${bildschirm}`);
  assert(/werk2\.local/.test(bildschirm), "die Adresse der Oberfläche kam nicht durch");
  return "Schlüssel und Passwort maskiert, der Rest kam durch";
});

await checkAsync("Ein fett oder farbig gedruckter Schlüssel wird trotzdem maskiert", async () => {
  // K21, am Orin am 25.09.2026: die Erstausgabe druckt den Kit-Schlüssel mit
  // ESC[1m davor. Das `m` ist ein Wortzeichen, die Wortgrenze vor aras_ fiel
  // weg, und der Schlüssel stand im Klartext zwei Zeilen unter dem Satz, dass
  // sein Klartext nicht angezeigt wird.
  const schluessel = "aras_Q7fettK2xY9pLm4Nw";
  const passwort = "Ara-start-8812";
  const fett = "\x1b[1m";
  const aus = "\x1b[0m";

  assert(!scrub(`  ${fett}${schluessel}${aus}`).includes(schluessel), "scrub lässt den fetten Schlüssel stehen");
  assert(!scrub(`\x1b[1;32m${schluessel}\x1b[0m`).includes(schluessel), "scrub lässt den farbigen Schlüssel stehen");
  assert(stripAnsi(`${fett}x${aus}`) === "x", "die Steuerzeichen bleiben stehen");
  assert(findKeys(`${fett}${schluessel}${aus}`)[0] === schluessel, "der fette Schlüssel wird nicht gefunden");

  // Über Stücke verteilt, das Steuerzeichen mitten durchgeschnitten.
  const masker = createMasker([passwort]);
  let gesehen = "";
  for (const stueck of ["  Schluessel fuer das Ara-Kit\n  \x1b", "[1m", "ar", "as_Q7fett", `K2xY9pLm4Nw${aus}\n`]) {
    gesehen += masker.push(stueck);
  }
  gesehen += masker.flush();
  assert(!gesehen.includes(schluessel), `der Schlüssel kam über zerschnittene Steuerzeichen durch: ${JSON.stringify(gesehen)}`);
  assert(masker.keys().includes(schluessel), "der Masker hat sich den Schlüssel nicht gemerkt");

  // Und der ganze Weg mit einer Installer-Zeile, wie die Erstausgabe sie schreibt.
  const skript = [
    `printf '  ${fett}Startpasswort %s${aus}\\n' '${passwort}'`,
    `printf '  Schluessel fuer das Ara-Kit (Bereich app:deploy)\\n'`,
    `printf '  ${fett}%s${aus}\\n' '${schluessel}'`,
    `printf '  Oberflaeche   https://werk2/\\n'`,
  ].join("; ");
  const original = process.stdout.write.bind(process.stdout);
  let bildschirm = "";
  process.stdout.write = (chunk) => {
    bildschirm += String(chunk);
    return true;
  };
  let lauf;
  try {
    lauf = await runInstaller(null, "local", skript, { secrets: [passwort] });
  } finally {
    process.stdout.write = original;
  }
  assert(lauf.status === 0, `der gespielte Installer ist mit ${lauf.status} beendet`);
  assert(!bildschirm.includes(schluessel), `der fette Kit-Schlüssel stand auf dem Bildschirm: ${JSON.stringify(bildschirm)}`);
  assert(!bildschirm.includes(passwort), "das fette Startpasswort stand auf dem Bildschirm");
  assert(!lauf.output.includes(schluessel), "der Kit-Schlüssel steht in dem, was das Kit behält");
  assert(/aras_…/.test(bildschirm), "an der Stelle des Schlüssels steht nicht, dass einer da war");
  assert(/werk2/.test(bildschirm), "der Rest der Erstausgabe kam nicht durch");
  assert(lauf.keys.includes(schluessel), "der Schlüssel des Installers wird nicht weitergereicht");
  return "fett, farbig, zerschnitten";
});

await checkAsync("Nach einer Installation gilt genau ein Kit-Schlüssel", async () => {
  // K21: der Installer legt "Ara-Kit (Erstinstallation)" an, das Kit legte
  // seinen eigenen daneben, und der erste blieb gültig und ungenutzt liegen.
  const work = mkdtempSync(join(tmpdir(), "ara-ein-schluessel-"));
  const home = join(work, "home");
  const skriptOrdner = join(home, "arasul-9.9.9", "scripts", "util");
  const liste = join(work, "liste.txt");
  const installer = "aras_inst1234secretsecret";
  const eigen = "aras_kit5678secretsecret";
  mkdirSync(skriptOrdner, { recursive: true });
  // Die Attrappe: liste gibt die Datei aus, widerrufen schreibt die Zeile um.
  writeFileSync(
    join(skriptOrdner, "kit-schluessel.sh"),
    `#!/bin/sh\ncase "$1" in\n  liste) cat ${JSON.stringify(liste)} ;;\n` +
      `  widerrufen) sed -i.alt "s/^gueltig \\(.*$2 \\)/widerrufen\\1/" ${JSON.stringify(liste)} && echo "widerrufen $2" ;;\n` +
      `  *) exit 2 ;;\nesac\n`,
    { mode: 0o755 }
  );
  const anfang =
    "gueltig      41  aras_inst123  Ara-Kit (Erstinstallation)    angelegt 2026-09-25 20:01  nie benutzt\n";
  writeFileSync(liste, anfang);
  const anlegen = () => {
    writeFileSync(liste, `gueltig      42  aras_kit567  Ara-Kit Probe                 angelegt 2026-09-25 20:05  nie benutzt\n${readFileSync(liste, "utf8")}`);
    return { ok: true, key: eigen, script: "attrappe" };
  };
  const gemerkt = process.env.HOME;
  process.env.HOME = home;
  try {
    assert(validLine("gueltig  41 aras_x") && !validLine("widerrufen 41 aras_x"), "gültig und widerrufen werden verwechselt");

    let ergebnis = settleDeployKey(null, "local", { name: "Ara-Kit Probe", found: [installer], create: anlegen });
    assert(ergebnis.ok && ergebnis.key === eigen, "der eigene Schlüssel ist nicht der, der hinterlegt wird");
    assert(ergebnis.revoked === "aras_inst123", `der Schlüssel des Installers wurde nicht widerrufen: ${ergebnis.revoked}`);
    assert(/^widerrufen\s+41/m.test(readFileSync(liste, "utf8")), "am Gerät gilt der des Installers noch");
    assert(ergebnis.valid.length === 1 && ergebnis.mineValid, `am Gerät gelten ${ergebnis.valid?.length} Kit-Schlüssel`);

    // Kann das Kit keinen eigenen anlegen, übernimmt es den des Installers.
    writeFileSync(liste, anfang);
    ergebnis = settleDeployKey(null, "local", {
      name: "Ara-Kit Probe",
      found: [installer],
      create: () => ({ ok: false, message: "kein Administrator" }),
    });
    assert(ergebnis.ok && ergebnis.adopted && ergebnis.key === installer, "der Schlüssel des Installers wurde nicht übernommen");
    assert(!ergebnis.revoked && /^gueltig/m.test(readFileSync(liste, "utf8")), "der übernommene Schlüssel wurde widerrufen");
    assert(ergebnis.valid.length === 1, "nach dem Übernehmen gilt nicht genau einer");

    // Ohne Schlüssel aus der Installation bleibt es beim Anlegen, und nichts wird widerrufen.
    writeFileSync(liste, anfang);
    ergebnis = settleDeployKey(null, "local", { name: "Ara-Kit Probe", found: [], create: anlegen });
    assert(ergebnis.ok && !ergebnis.revoked, "ohne Schlüssel des Installers wurde trotzdem widerrufen");
    assert(ergebnis.valid.length === 2, "ein fremder Schlüssel wurde angefasst");
    return "widerrufen, übernommen, unberührt";
  } finally {
    if (gemerkt === undefined) delete process.env.HOME;
    else process.env.HOME = gemerkt;
    rmSync(work, { recursive: true, force: true });
  }
});

check("Kein Preis für Arasul steht im Kit", () => {
  // K21, B2: bis PR 46 nannten lib/licence.mjs, device.mjs und das Blatt einen
  // Preis, und der war am 25.09.2026 schon falsch. Der Preis steht auf der
  // Seite, das Kit zeigt dorthin.
  const dateien = [
    ".ara/tools/lib/licence.mjs",
    ".ara/tools/device.mjs",
    ".ara/tools/mirror.mjs",
    ".ara/tools/secrets.mjs",
    ".ara/knowledge/device.md",
    ".ara/knowledge/device.de.md",
    ".ara/knowledge/sales.md",
    ".ara/knowledge/sales.de.md",
  ];
  const betrag = /\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?\s*(?:Euro|EUR|€)|(?:Euro|EUR|€)\s*\d/;
  for (const datei of dateien) {
    const text = readFileSync(join(ROOT, datei), "utf8");
    const treffer = text.match(betrag);
    assert(!treffer, `${datei} nennt einen Betrag: ${treffer?.[0]}`);
  }
  const blatt = readFileSync(join(ROOT, ".ara", "knowledge", "device.md"), "utf8");
  assert(/arasul\.de\/kaufen/.test(blatt), "das Blatt zeigt nicht auf die Seite mit dem Preis");
  return `${dateien.length} Dateien`;
});

await checkAsync("Was der Installer nicht konnte, sagt das Kit noch einmal", async () => {
  // Fund 7 des zweiten Fremdtests am 28.08.2026. „SSH-Hardening fehlgeschlagen"
  // und „Firewall-Setup fehlgeschlagen (nicht kritisch), must be run as root"
  // liefen durch das Kit hindurch, mitten in mehreren hundert Zeilen. Danach
  // galt das Gerät als fertig, ohne Härtung und ohne Firewall.
  const ausgabe = [
    "Docker gefunden.",
    "Container gestartet: 7 von 7.",
    "WARNUNG: SSH-Hardening fehlgeschlagen",
    "Firewall-Setup fehlgeschlagen (nicht kritisch), must be run as root",
    "WARNUNG: SSH-Hardening fehlgeschlagen",
    "Fertig.",
  ].join("\n");
  const gefunden = troubles(ausgabe);
  assert(gefunden.length === 2, `falsch gesammelt: ${JSON.stringify(gefunden)}`);
  assert(gefunden.some((zeile) => /SSH-Hardening/.test(zeile)), "die Härtung fehlt in der Liste");
  assert(gefunden.some((zeile) => /Firewall/.test(zeile)), "die Firewall fehlt in der Liste");
  assert(!gefunden.some((zeile) => /Container gestartet/.test(zeile)), "eine gelungene Zeile steht in der Liste");

  // Und dasselbe noch einmal in der Menge, in der es wirklich vorkommt. Am
  // 28.08.2026 lief die Installation auf einem Orin durch, und die beiden
  // Absagen standen wieder nicht in der Liste: davor lagen zwölf Warnungen,
  // dieselbe achtmal mit wechselndem Zeitstempel, und die Grenze war erreicht,
  // bevor die Absagen an der Reihe waren. Eine Liste, die abschneidet, muss die
  // Absage vor der Warnung nehmen, sonst misst sie das Falsche.
  const laut = [
    "[0;34m[INFO][0m Docker gefunden.",
    "[] Configuration has 2 warning(s)",
    "⚠ 2 warning(s) found",
    ...Array.from(
      { length: 8 },
      (_, i) => `time="2026-08-28T20:5${i}:33+02:00" level=warning msg="No services to build"`
    ),
    "[1;33m[WARNING][0m Der Browser warnt, bis das CA-Zertifikat verteilt ist",
    "[0;34m[INFO][0m SSH-Hardening wird angewendet...",
    "ERROR: This script must be run as root (sudo)",
    "[1;33m[WARNING][0m SSH-Hardening fehlgeschlagen (nicht kritisch)",
    "[0;34m[INFO][0m Firewall wird konfiguriert...",
    "ERROR: This script must be run as root (sudo)",
    "[1;33m[WARNING][0m Firewall-Setup fehlgeschlagen (nicht kritisch)",
    "[0;32m[SUCCESS][0m Fertig.",
  ].join("\n");
  const ausDerMenge = troubles(laut);
  assert(
    ausDerMenge.some((zeile) => /SSH-Hardening fehlgeschlagen/.test(zeile)),
    `die Härtung faellt aus der Liste: ${JSON.stringify(ausDerMenge)}`
  );
  assert(
    ausDerMenge.some((zeile) => /Firewall-Setup fehlgeschlagen/.test(zeile)),
    `die Firewall faellt aus der Liste: ${JSON.stringify(ausDerMenge)}`
  );
  assert(
    ausDerMenge.some((zeile) => /must be run as root/.test(zeile)),
    `der Grund faellt aus der Liste: ${JSON.stringify(ausDerMenge)}`
  );
  assert(
    ausDerMenge.filter((zeile) => /No services to build/.test(zeile)).length === 1,
    `dieselbe Warnung steht mehrfach in der Liste: ${JSON.stringify(ausDerMenge)}`
  );
  assert(
    !ausDerMenge.some((zeile) => /\x1B\[/.test(zeile)),
    "Farbcodes stehen in der Liste"
  );
  // Abgeschnitten wird nicht verschwiegen.
  const eng = troubles(laut, { limit: 3 });
  assert(eng.length === 4 && /4 weitere Zeilen/.test(eng[3]), `das Abschneiden wird nicht gesagt: ${JSON.stringify(eng)}`);

  // Am laufenden Installer, nicht nur am Text.
  const original = process.stdout.write.bind(process.stdout);
  process.stdout.write = () => true;
  let lauf;
  try {
    lauf = await runInstaller(null, "local", ausgabe.split("\n").map((z) => `echo ${JSON.stringify(z)}`).join("; "));
  } finally {
    process.stdout.write = original;
  }
  assert(lauf.troubles.length === 2, `der Lauf sammelt nicht: ${JSON.stringify(lauf.troubles)}`);

  // Und das Werkzeug legt sie am Ende noch einmal hin, unter dieser Überschrift.
  const werkzeug = readFileSync(join(ROOT, ".ara", "tools", "device.mjs"), "utf8");
  assert(/Was der Installer nicht konnte/.test(werkzeug), "device.mjs kennt den Abschnitt nicht");
  assert(/arasul\.troubles/.test(werkzeug), "device.mjs nimmt die gesammelten Zeilen nicht auf");
  const wissen = readFileSync(join(ROOT, ".ara", "knowledge", "device.md"), "utf8");
  assert(/Was der Installer nicht konnte/.test(wissen), "das Verfahren sagt nichts über die Absagen des Installers");
  return `${gefunden.length} Absagen aus ${ausgabe.split("\n").length} Zeilen, und aus ${laut.split("\n").length} lauten Zeilen die drei, auf die es ankommt`;
});

await checkAsync("Ein geänderter SSH-Port landet in der Akte, der nächste Befehl nimmt ihn", async () => {
  // Seit dem 25.09.2026 härtet der Installer SSH mit `sudo -n` (J35). Gelingt
  // das, liegt SSH auf einem anderen Port, und bis 0.32.0 legte das Kit nur die
  // Warnung ab und klopfte weiter auf 22: die zweite Prüfung, der Kit-Schlüssel
  // und jeder spätere Befehl standen vor einer Wand. Die Zeilen hier sind die
  // von `scripts/security/haerten.sh`, wörtlich.
  const ausgabe = [
    "[INFO] SSH-Haertung (Port 2222, nur Schluessel, fail2ban)...",
    "[OK] SSH gehaertet",
    "[WARNUNG] SSH-Port geaendert: 22 -> 2222. Das Ara-Kit erreicht dieses Geraet ab jetzt nur noch mit --port 2222.",
    "[WARNUNG]   Von Hand: ssh -p 2222 arasul@<geraet>. Die laufende Sitzung bleibt bestehen.",
    "ARASUL_SSH_PORT=2222",
    "[INFO] Firewall (ufw: SSH 2222, 80, 443, mDNS, Tailscale)...",
    "[OK] Firewall aktiv",
  ].join("\n");

  // 1. Am laufenden Installer, nicht nur am Text.
  const original = process.stdout.write.bind(process.stdout);
  process.stdout.write = () => true;
  let lauf;
  try {
    lauf = await runInstaller(null, "local", ausgabe.split("\n").map((z) => `echo ${JSON.stringify(z)}`).join("; "));
  } finally {
    process.stdout.write = original;
  }
  assert(lauf.sshPort === "2222", `der Port kam nicht an: ${lauf.sshPort}`);
  assert(lauf.troubles.some((z) => /SSH-Port geaendert/.test(z)), "die Warnung fehlt in der Liste");

  // 2. Nur die Zeile selbst zählt, so wie der Installer sie schreibt. Über SSH
  // mit -t kommt sie mit \r und manchmal in Farbe an.
  assert(sshPortFrom("ARASUL_SSH_PORT=2222\r\n") === "2222", "\\r stört das Lesen");
  assert(sshPortFrom("\x1B[0mARASUL_SSH_PORT=2222\x1B[0m") === "2222", "Farbcodes stören das Lesen");
  assert(sshPortFrom("ARASUL_SSH_PORT=22\nARASUL_SSH_PORT=2222") === "2222", "es gilt nicht die letzte Zeile");
  assert(sshPortFrom("Fertig.") === null, "ohne Zeile wird ein Port erfunden");
  assert(sshPortFrom("ARASUL_SSH_PORT=99999") === null, "ein Port außerhalb des Bereichs gilt");
  assert(sshPortFrom("ARASUL_SSH_PORT=") === null, "eine leere Zeile gilt als Port");
  assert(sshPortFrom("echo ARASUL_SSH_PORT=2222 in einem Satz") === null, "ein Satz gilt als Zeile");

  // 3. Die laufende Aufrufzeile zieht um, so wie device.mjs sie nach dem
  // Installer weiterbenutzt.
  const felder = { address: "127.0.0.1", ssh_user: "probe", ssh_port: "22" };
  const { args } = sshArgsFrom(felder);
  assert(movePort(args, lauf.sshPort) === "22", "umgelegt wird nicht, oder der alte Port geht verloren");
  assert(args[args.indexOf("-p") + 1] === "2222", `die Zeile zeigt auf ${args[args.indexOf("-p") + 1]}`);
  assert(movePort(args, "2222") === null, "ein Umzug auf denselben Port gilt als Umzug");
  assert(movePort(args, null) === null, "ohne Meldung wird umgelegt");

  // 4. Die Akte trägt ihn, und der nächste Befehl verbindet sich darüber.
  const name = "selftest-sshport";
  const dir = join(ROOT, "devices", name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  cpSync(join(ROOT, ".ara", "templates", "device.md"), join(dir, "device.md"));
  try {
    writeFrontmatter(join(dir, "device.md"), { name, ...felder, ssh_port: lauf.sshPort });
    const { fields } = readFrontmatter(join(dir, "device.md"));
    assert(String(fields.ssh_port) === "2222", `in der Akte steht ssh_port ${fields.ssh_port}`);
    const run = await toolAsync("remote.mjs", ["--device", name, "--check"]);
    const text = `${run.stdout}${run.stderr}`;
    assert(/probe@127\.0\.0\.1:2222\b/.test(text), `remote.mjs nimmt nicht den neuen Port: ${text}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  // 5. device.mjs legt um, bevor es noch einmal ans Gerät geht, und schreibt
  // den Port in die Akte, den es dann benutzt.
  const werkzeug = readFileSync(join(ROOT, ".ara", "tools", "device.mjs"), "utf8");
  const umzug = werkzeug.indexOf("movePort(sshArgs, arasul.sshPort)");
  const zweitePruefung = werkzeug.indexOf("const again = probe();", umzug);
  assert(umzug > 0 && zweitePruefung > umzug, "device.mjs prüft nach der Installation über den alten Port");
  assert(/ssh_port: port,/.test(werkzeug), "device.mjs schreibt den benutzten Port nicht in die Akte");
  for (const blatt of ["device.md", "device.de.md"]) {
    const wissen = readFileSync(join(ROOT, ".ara", "knowledge", blatt), "utf8");
    assert(/ARASUL_SSH_PORT=/.test(wissen), `.ara/knowledge/${blatt} sagt nichts über den Portwechsel`);
  }
  return "ARASUL_SSH_PORT=2222 aus dem Installer, ssh_port 2222 in der Akte, remote.mjs verbindet über 2222";
});

check("Vor der Härtung prüft das Kit, dass der Schlüssel hereinkommt", () => {
  // Der Installer härtet SSH, danach geht nur noch der Schlüssel. Wer bisher mit
  // Passwort aufs Gerät kam, sperrte sich mit der Installation aus. Die Prüfung
  // muss eine eigene Verbindung sein: eine offene Master-Sitzung, mit Passwort
  // angemeldet, trüge sonst auch die Probe des Kits.

  // 1. Die Probe selbst: nur der Schlüssel, keine geteilte Sitzung, und die
  // Optionen vor der Zeile des Kits, weil SSH je Option den ersten Wert nimmt.
  let gerufen;
  const zeile = ["-o", "BatchMode=yes", "-p", "22", "probe@10.0.0.9"];
  let probe = keyLogin(zeile, { run: (bin, args) => ((gerufen = args), { status: 0, stderr: "" }) });
  assert(probe.ok, "eine gelungene Anmeldung gilt nicht");
  for (const option of ["PreferredAuthentications=publickey", "PasswordAuthentication=no", "ControlPath=none"]) {
    assert(gerufen.indexOf(option) > -1 && gerufen.indexOf(option) < gerufen.indexOf("BatchMode=yes"), `${option} fehlt oder steht hinter der Zeile des Kits`);
  }
  assert(gerufen.at(-1) === "true" && gerufen.at(-2) === "probe@10.0.0.9", `die Probe tut mehr als sich anmelden: ${gerufen.slice(-2)}`);
  probe = keyLogin(zeile, { run: () => ({ status: 255, stderr: "probe@10.0.0.9: Permission denied (password).\n" }) });
  assert(!probe.ok && /Permission denied/.test(probe.message), "eine abgelehnte Anmeldung gilt");

  // 2. Am Werkzeug: ein unterstütztes Gerät, das nur ein Passwort annimmt. Die
  // Attrappe von ssh lässt jede Verbindung durch, außer der, die nur den
  // Schlüssel zulässt, und schreibt mit, was gerufen wurde.
  const name = "selftest-haertung";
  const home = mkdtempSync(join(tmpdir(), "ara-haertung-"));
  const fake = join(home, "bin");
  mkdirSync(fake, { recursive: true });
  const befund = join(home, "befund.txt");
  const protokoll = join(home, "ssh.log");
  writeFileSync(befund, ATTRAPPEN.thor.replace("@done=ja", "@docker_bin=/usr/bin/docker\n@docker_server=27.0\n@done=ja") + "\n");
  writeFileSync(
    join(fake, "ssh"),
    `#!/bin/sh\necho "$*" >> ${JSON.stringify(protokoll)}\n` +
      `case "$*" in *PreferredAuthentications=publickey*) echo "probe@10.0.0.9: Permission denied (password)." >&2; exit 255 ;; esac\n` +
      `cat >/dev/null\ncat ${JSON.stringify(befund)}\n`,
    { mode: 0o755 }
  );
  const spiegel = attrappenSpiegel({ "thor-128": "emulation" });
  const stateFile = join(ROOT, ".ara", "state.json");
  const savedState = existsSync(stateFile) ? readFileSync(stateFile, "utf8") : null;
  try {
    const env = { PATH: `${fake}:${process.env.PATH}`, ARA_MIRROR: spiegel };
    const run = tool("device.mjs", ["--host", "10.0.0.9", "--user", "probe", "--name", name, "--install", "arasul"], "", env);
    assert(run.status !== 0, `trotz Passwort-Zugang wurde installiert: ${run.stdout}`);
    const satz = run.stderr.trim();
    assert(/nur mit Schlüssel/.test(satz) && /hält es hier an/.test(satz), `unerwartete Begründung: ${satz}`);
    assert(satz.split("\n").length === 1, `mehr als ein Satz: ${satz}`);
    const aufrufe = readFileSync(protokoll, "utf8").trim().split("\n");
    assert(aufrufe.some((a) => /sh -s$/.test(a)), "das Gerät wurde gar nicht geprüft, das Urteil stammt woanders her");
    assert(aufrufe.length === 2, `nach der abgelehnten Probe ging noch etwas ans Gerät: ${aufrufe.join(" | ")}`);
    return "Probe nur mit Schlüssel, ein Satz, nichts ans Gerät";
  } finally {
    rmSync(join(ROOT, "devices", name), { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
    rmSync(spiegel, { recursive: true, force: true });
    if (savedState === null) rmSync(stateFile, { force: true });
    else writeFileSync(stateFile, savedState);
  }
});

await checkAsync("Die Härtung wird angesagt, lässt sich abwählen, und das Modell kommt im Hintergrund", async () => {
  // Am Orin lag SSH nach einem Durchlauf sieben Minuten auf dem neuen Port,
  // ohne dass vorher jemand davon gehört hätte, und das Kit hatte keinen Weg,
  // die Härtung auszulassen. Zwölf Zeilen unter dem Satz des Installers, er
  // hole das Standardmodell im Hintergrund, empfahl es einen zweiten Download.

  // 1. Der Aufruf: mit --keep-ssh stehen beide Schalter vor dem Einstiegspunkt,
  // so erbt der Bootstrap sie und mit ihm haerten.sh. Ohne steht keiner da.
  const entry = { file: "install.sh" };
  let call = installCommand(entry, { password: "geheim-123", netName: "werk2", keepSsh: true });
  assert(/^ENABLE_SSH_HARDENING=false ENABLE_FIREWALL=false \.\/install\.sh /.test(call.command), `die Schalter stehen nicht vor dem Einstiegspunkt: ${call.command}`);
  assert(/ENABLE_FIREWALL=false/.test(call.shown) && !/geheim-123/.test(call.shown), `die Anzeige verschweigt die Schalter oder zeigt das Passwort: ${call.shown}`);
  call = installCommand(entry, { password: "geheim-123", netName: "werk2" });
  assert(!/ENABLE_/.test(call.command), `ohne --keep-ssh wird die Härtung trotzdem abgewählt: ${call.command}`);

  // 2. Der Port kommt aus dem Artefakt, nicht aus dem Kit.
  const work = mkdtempSync(join(tmpdir(), "ara-ansage-"));
  try {
    assert(hardeningPort(work) === null, "ohne haerten.sh wird ein Port erfunden");
    mkdirSync(join(work, "scripts", "security"), { recursive: true });
    writeFileSync(join(work, "scripts", "security", "haerten.sh"), 'SSH_PORT_SOLL="$(env_wert SSH_PORT 4711)"\n');
    const port = hardeningPort(work);
    assert(port?.port === "4711", `der Port aus dem Artefakt wurde nicht gelesen: ${JSON.stringify(port)}`);
    let satz = hardeningNotice({ port });
    for (const [muster, was] of [[/Port 4711/, "den Port"], [/Schlüssel/, "den Schlüssel"], [/Firewall/, "die Firewall"], [/--keep-ssh/, "den Weg, sie auszulassen"]]) {
      assert(muster.test(satz), `die Ansage nennt ${was} nicht: ${satz}`);
    }
    assert(/anderen Port/.test(hardeningNotice({ port: null })), "ohne Artefakt wird ein Port behauptet");
    satz = hardeningNotice({ keepSsh: true, port });
    assert(/ENABLE_SSH_HARDENING=false/.test(satz) && /keine Firewall/.test(satz), `die Ansage mit --keep-ssh sagt nicht, was bleibt: ${satz}`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }

  // 3. Die Zeilen des Installers zum Modell, wörtlich aus `./arasul`, in Farbe.
  const hinten = "\x1B[0;34m[INFO]\x1B[0m Standardmodell qwen-probe:27b wird im Hintergrund geholt -- Fortschritt: tail -f /home/x/arasul-9.9.9/logs/modell-holen.log\r";
  let modell = modelFrom(`Fertig.\n${hinten}\n`);
  assert(modell?.state === "background" && modell.model === "qwen-probe:27b", `die Zeile zum Hintergrund wurde nicht gelesen: ${JSON.stringify(modell)}`);
  assert(modell.log === "/home/x/arasul-9.9.9/logs/modell-holen.log", `das Protokoll fehlt: ${modell.log}`);
  modell = modelFrom("[OK] Standardmodell qwen-probe:27b liegt schon am Geraet (Digest stimmt)");
  assert(modell?.state === "present", `ein vorhandenes Modell gilt nicht: ${JSON.stringify(modell)}`);
  assert(modelFrom("[INFO] Standardmodell wird nicht geholt (MODELL_HOLEN=false)")?.state === "skipped", "ein ausgelassenes Modell gilt nicht");
  assert(modelFrom("Fertig.") === null, "ohne Zeile wird ein Modell behauptet");
  const original = process.stdout.write.bind(process.stdout);
  process.stdout.write = () => true;
  let lauf;
  try {
    lauf = await runInstaller(null, "local", `printf '%s\\n' ${JSON.stringify(hinten)}`);
  } finally {
    process.stdout.write = original;
  }
  assert(lauf.model?.state === "background", `der laufende Installer gibt das Modell nicht weiter: ${JSON.stringify(lauf.model)}`);

  // 4. Das Werkzeug: kein Satz mehr, dass kein Modell liege, und --keep-ssh
  // geht als Schalter an den Installer.
  const werkzeug = readFileSync(join(ROOT, ".ara", "tools", "device.mjs"), "utf8");
  assert(!/Auf einem frisch installierten Gerät liegt kein Modell/.test(werkzeug), "device.mjs sagt noch, auf einem frischen Gerät liege kein Modell");
  assert(/modelStep\(arasul\.model\)/.test(werkzeug), "device.mjs liest die Zeile des Installers nicht");
  assert(/installCommand\(entry, \{[^}]*keepSsh/.test(werkzeug), "device.mjs gibt --keep-ssh nicht an den Installer");

  // 5. Am Werkzeug gegen die Attrappe: ein Gerät, das nur ein Passwort nimmt,
  // hält mit --keep-ssh nicht an der Schlüsselprobe an, sondern erst am
  // fehlenden Token. Und ohne --install steht die Ansage in den nächsten
  // Schritten, mit dem Port aus dem Spiegel.
  const name = "selftest-keepssh";
  const home = mkdtempSync(join(tmpdir(), "ara-keepssh-"));
  const fake = join(home, "bin");
  mkdirSync(fake, { recursive: true });
  const befund = join(home, "befund.txt");
  const protokoll = join(home, "ssh.log");
  writeFileSync(befund, ATTRAPPEN.thor.replace("@done=ja", "@docker_bin=/usr/bin/docker\n@docker_server=27.0\n@done=ja") + "\n");
  writeFileSync(
    join(fake, "ssh"),
    `#!/bin/sh\necho "$*" >> ${JSON.stringify(protokoll)}\n` +
      `case "$*" in *PreferredAuthentications=publickey*) echo "probe@10.0.0.9: Permission denied (password)." >&2; exit 255 ;; esac\n` +
      `cat >/dev/null\ncat ${JSON.stringify(befund)}\n`,
    { mode: 0o755 }
  );
  const ohne = join(home, "ohne.env");
  const mit = join(home, "mit.env");
  writeFileSync(ohne, "");
  writeFileSync(mit, `ARASUL_TOKEN=ara_${"1".repeat(32)}\n`);
  const spiegel = attrappenSpiegel({ "thor-128": "emulation" });
  mkdirSync(join(spiegel, "scripts", "security"), { recursive: true });
  writeFileSync(join(spiegel, "scripts", "security", "haerten.sh"), 'SSH_PORT_SOLL="$(env_wert SSH_PORT 4711)"\n');
  const stateFile = join(ROOT, ".ara", "state.json");
  const savedState = existsSync(stateFile) ? readFileSync(stateFile, "utf8") : null;
  try {
    const env = { PATH: `${fake}:${process.env.PATH}`, ARA_MIRROR: spiegel };
    let run = tool("device.mjs", ["--host", "10.0.0.9", "--user", "probe", "--name", name, "--install", "arasul", "--keep-ssh"], "", { ...env, ARA_ENV_FILE: ohne });
    assert(run.status !== 0, `ohne Token wurde installiert: ${run.stdout}`);
    assert(!/nur mit Schlüssel/.test(run.stderr) && /Token/.test(run.stderr), `mit --keep-ssh hält es an der falschen Stelle: ${run.stderr}`);
    assert(!/PreferredAuthentications/.test(readFileSync(protokoll, "utf8")), "mit --keep-ssh wurde die Schlüsselprobe trotzdem gerufen");
    run = tool("device.mjs", ["--host", "10.0.0.9", "--user", "probe", "--name", name], "", { ...env, ARA_ENV_FILE: mit });
    assert(run.status === 0, `der Blick aufs Gerät scheitert: ${run.stderr}`);
    assert(/--install arasul/.test(run.stdout) && /Port 4711/.test(run.stdout) && /--keep-ssh/.test(run.stdout), `die nächsten Schritte sagen die Härtung nicht an: ${run.stdout}`);
    return "Schalter vor dem Einstiegspunkt, Port aus dem Artefakt, Modell aus der Zeile, keine Schlüsselprobe mit --keep-ssh";
  } finally {
    rmSync(join(ROOT, "devices", name), { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
    rmSync(spiegel, { recursive: true, force: true });
    if (savedState === null) rmSync(stateFile, { force: true });
    else writeFileSync(stateFile, savedState);
  }
});

await checkAsync("Ohne Browser führt ein Weg zu Mitarbeiter und Freigabe", async () => {
  // Der Fremdtest am 28.08.2026 stand nach der Installation still: die
  // Plattform lief, aber der erste Mitarbeiter und seine Freigabe entstehen in
  // der Oberfläche, und der Prüfer hatte keinen Browser. Das Wissen muss den
  // zweiten Weg nennen, und das Kit muss zeigen, wo er beschrieben steht.
  // Beide Fassungen des Blattes muessen den Weg nennen. Eine Uebersetzung, die
  // ihn verliert, laesst genau den Pruefer stehen, fuer den der Absatz da ist.
  for (const blatt of ["device.md", "device.de.md"]) {
    const wissen = readFileSync(join(ROOT, ".ara", "knowledge", blatt), "utf8");
    for (const [muster, was] of [
      [/Mitarbeiter|employee/, "der Fall selbst"],
      [/Freigabe|permission/, "die Freigabe"],
      [/Admin-Handbuch|admin handbook/, "das Admin-Handbuch im Artefakt"],
      [/API-Referenz|API reference/, "die API-Referenz im Artefakt"],
      [/Authorization: Bearer/, "die Form des Aufrufs"],
      [/mirror\.mjs --docs/, "der Weg zu den Anleitungen"],
      [/--despite-traces/, "der benannte Weg über liegengebliebene Reste"],
    ]) {
      assert(muster.test(wissen), `in .ara/knowledge/${blatt} fehlt ${was}`);
    }
  }
  // Und das Werkzeug tut, was das Blatt verspricht.
  const werkzeug = readFileSync(join(ROOT, ".ara", "tools", "device.mjs"), "utf8");
  assert(/--despite-traces/.test(werkzeug), "device.mjs kennt den Weg nicht, den das Blatt nennt");

  const work = mkdtempSync(join(tmpdir(), "ara-docs-"));
  const mirror = join(work, "spiegel");
  try {
    // Ohne Spiegel gibt es nichts zu zeigen, und das Werkzeug sagt es.
    let run = await toolAsync("mirror.mjs", ["--docs"], { ARA_MIRROR: mirror });
    assert(run.status !== 0, "ohne Spiegel meldet --docs Erfolg");
    assert(/kein/i.test(run.stdout), `der fehlende Spiegel wird nicht benannt: ${run.stdout}`);
    // Und er nennt den Weg, der ohne Token geht: die Anleitungen am Gerät.
    assert(/--docs --device/.test(run.stdout), `ohne Spiegel fehlt der Weg zu den Anleitungen am Gerät: ${run.stdout}`);

    // Am Gerät: gesucht wird der Ordner der Plattform, gelesen wird darunter
    // und nirgends sonst. Das Gerät ist hier dieser Rechner, sein Zuhause ein
    // Wegwerfordner mit zwei Fassungen.
    const zuhause = join(work, "zuhause");
    mkdirSync(join(zuhause, "arasul-0.3.0", "docs"), { recursive: true });
    mkdirSync(join(zuhause, "arasul-0.8.0", "docs", "api"), { recursive: true });
    writeFileSync(join(zuhause, "arasul-0.8.0", "docs", "api", "API_REFERENCE.md"), "# Referenz\n" + "x".repeat(200_000) + "\nENDE\n");
    writeFileSync(join(zuhause, "geheim.txt"), "nicht lesen\n");
    const geraetName = "selftest-doku";
    const geraetDir = join(ROOT, "devices", geraetName);
    mkdirSync(geraetDir, { recursive: true });
    writeFileSync(join(geraetDir, "device.md"), `---\nname: ${geraetName}\naddress: localhost\n---\n`);
    try {
      run = await toolAsync("mirror.mjs", ["--docs", "--device", geraetName], { ARA_MIRROR: mirror, HOME: zuhause });
      assert(run.status === 0 && /arasul-0\.8\.0\/docs/.test(run.stdout) && /api\/API_REFERENCE\.md/.test(run.stdout), `die Anleitungen am Gerät fehlen: ${run.stdout}${run.stderr}`);
      run = await toolAsync("mirror.mjs", ["--docs", "--device", geraetName, "--read", "api/API_REFERENCE.md"], { ARA_MIRROR: mirror, HOME: zuhause });
      assert(run.status === 0 && /ENDE\s*$/.test(run.stdout), `eine lange Anleitung kommt nicht ganz an: ${run.stdout.length} Zeichen`);
      // So wie das Gerät den Pfad nennt, mit docs/ davor.
      run = await toolAsync("mirror.mjs", ["--docs", "--device", geraetName, "--read", "docs/api/API_REFERENCE.md"], { ARA_MIRROR: mirror, HOME: zuhause });
      assert(run.status === 0 && /ENDE\s*$/.test(run.stdout), `ein Pfad mit docs/ davor wird nicht gelesen: ${run.stdout}${run.stderr}`);
      run = await toolAsync("mirror.mjs", ["--docs", "--device", geraetName, "--read", "../../geheim.txt"], { ARA_MIRROR: mirror, HOME: zuhause });
      assert(run.status !== 0 && !/nicht lesen/.test(run.stdout), "ein Pfad aus docs/ heraus wurde gelesen");
    } finally {
      rmSync(geraetDir, { recursive: true, force: true });
    }

    mkdirSync(join(mirror, "docs", "ops"), { recursive: true });
    writeFileSync(join(mirror, "STATE.json"), JSON.stringify({ fetched: "2026-08-27T10:00:00.000Z", source: "https://probe", version: "9.9.9" }));
    writeFileSync(join(mirror, "docs", "admin-handbuch.md"), "# Handbuch\n");
    writeFileSync(join(mirror, "docs", "ops", "auslieferung.md"), "# Auslieferung\n");
    writeFileSync(join(mirror, "install.sh"), "#!/bin/sh\n");

    run = await toolAsync("mirror.mjs", ["--docs"], { ARA_MIRROR: mirror });
    assert(run.status === 0, `--docs fehlgeschlagen: ${run.stderr || run.stdout}`);
    assert(/admin-handbuch\.md/.test(run.stdout), `die Anleitung fehlt in der Liste: ${run.stdout}`);
    assert(/ops\/auslieferung\.md/.test(run.stdout), "eine Anleitung aus einem Unterordner fehlt");
    assert(!/install\.sh/.test(run.stdout), "ein Skript wird als Anleitung ausgegeben");
    assert(/9\.9\.9/.test(run.stdout), "es wird nicht gesagt, zu welcher Fassung die Anleitungen gehören");
    return "Blatt und Werkzeug, Spiegel und Anleitungen am Gerät, eine lange ganz, keine außerhalb von docs/";
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

check("Auf einem Gerät ohne Urteil wird nichts installiert", () => {
  const stateFile = join(ROOT, ".ara", "state.json");
  const savedState = existsSync(stateFile) ? readFileSync(stateFile, "utf8") : null;
  const name = "selftest-install";
  try {
    // Dieser Rechner selbst, SSH abgelehnt: geprüft wird lokal. Ein Entwicklungsrechner
    // ist kein unterstütztes Gerät, also endet --install arasul vor dem Download.
    let run = tool("device.mjs", ["--host", "localhost", "--port", "1", "--name", name, "--json"]);
    const lage = JSON.parse(run.stdout);
    run = tool("device.mjs", ["--name", name, "--install", "arasul"]);
    if (lage.verdict === "supported") return "übersprungen, dieser Rechner ist ein unterstütztes Gerät";
    assert(run.status !== 0, "auf einem nicht unterstützten Gerät wurde installiert");
    assert(/läuft Arasul nicht/.test(run.stderr), `unerwartete Begründung: ${run.stderr}`);

    // Der Kit-Schlüssel kommt vom Gerät. Ist dort keine Plattform, sagt das Werkzeug das.
    run = tool("device.mjs", ["--name", name, "--deploy-key"]);
    assert(/Kein Kit-Schlüssel/.test(run.stdout), `ohne Plattform kam kein Hinweis: ${run.stdout}`);
    assert(run.status !== 0, "ein Schlüssel, den es nicht gibt, endet mit Erfolg");
    const { fields } = readFrontmatter(join(ROOT, "devices", name, "device.md"));
    assert(!fields.api_key_ref, "ein Schlüsselverweis steht in der Akte, obwohl keiner angelegt wurde");
    return `Urteil ${lage.verdict}`;
  } finally {
    rmSync(join(ROOT, "devices", name), { recursive: true, force: true });
    if (savedState === null) rmSync(stateFile, { force: true });
    else writeFileSync(stateFile, savedState);
  }
});

// --- Freigabe und Schluessel -------------------------------------------------
//
// Die fuenf Funde des zweiten Fremdtests vom 29.08.2026, je Fund eine Pruefung.

check("Nach dem Einspielen steht da, dass ein Admin freigeben muss, und wie", () => {
  const ohne = releaseLines({
    place: "orin",
    base: "https://192.0.2.10",
    testUrl: "https://192.0.2.10/apps/probe/test/",
    deviceCall: "node .ara/tools/device.mjs --name orin",
    startRef: "ARASUL_START_ORIN",
    startPassword: false,
  }).join("\n");
  assert(/freigegeben/.test(ohne), `die Freigabe wird nicht genannt: ${ohne}`);
  assert(/app:deploy/.test(ohne), "es steht nicht da, warum das Kit sie nicht erteilen kann");
  assert(/403/.test(ohne), "die 403 am Teststand wird nicht erklaert");
  assert(/secrets\.mjs --set ARASUL_START_ORIN/.test(ohne), `ohne Startpasswort fehlt der Weg dorthin: ${ohne}`);
  assert(!/--admin-login/.test(ohne), "ohne Startpasswort wird eine Sitzung angeboten, die es nicht gibt");
  assert(/https:\/\/192\.0\.2\.10/.test(ohne), "die Oberflaeche wird nicht genannt");

  const mit = releaseLines({
    place: "orin",
    base: "https://192.0.2.10",
    deviceCall: "node .ara/tools/device.mjs --name orin",
    startRef: "ARASUL_START_ORIN",
    startPassword: true,
  }).join("\n");
  assert(/--admin-login/.test(mit), `mit Startpasswort fehlt die Sitzung: ${mit}`);
  // Ohne Spiegel liegen die Anleitungen trotzdem am Gerät, und das Kit liest
  // sie dort. Bis 0.31.0 stand hier --refresh, und das verlangt einen Token.
  assert(/mirror\.mjs --docs --device/.test(mit), `ohne Spiegel fehlt der Weg zu den Anleitungen am Gerät: ${mit}`);
  assert(!/--refresh/.test(mit), "ohne Spiegel wird ein Weg genannt, der einen Token verlangt");
  assert(!/secrets\.mjs --set/.test(mit), "es wird nach einem Passwort gefragt, das schon liegt");

  // Kein Produktwert: die Seite und der Weg der Freigabe stehen im Artefakt.
  for (const text of [ohne, mit]) {
    assert(!/\/api\/(freigaben|permissions)/.test(text), "das Kit nennt einen Weg, den es nicht wissen kann");
    assert(/Admin-Handbuch|admin handbook/.test(text), "das Artefakt wird nicht als Quelle genannt");
    // Fund 1 des Fremdtests am 29.08.2026: das Haekchen allein gibt den
    // Livestand frei, und eine frisch eingespielte App hat keinen.
    assert(/Teststand meinen|mean staging/.test(text), `der Stand der Freigabe fehlt: ${text}`);
  }
  // Fund 2: ohne Spiegel zeigt der Text nicht auf den Spiegel, den es hier
  // nicht gibt, sondern auf die Anleitungen am Gerät. Der Fremdtest am
  // 29.08.2026 lief von --docs auf --refresh in die Tokenfrage.
  assert(!/mirror\.mjs --docs\s*$/m.test(ohne) && /--docs --device/.test(ohne), `ohne Spiegel wird auf den Spiegel gezeigt: ${ohne}`);
  const mitSpiegel = releaseLines({
    place: "orin",
    base: "https://192.0.2.10",
    deviceCall: "node .ara/tools/device.mjs --name orin",
    startRef: "ARASUL_START_ORIN",
    startPassword: true,
    docs: true,
  }).join("\n");
  assert(/mirror\.mjs --docs/.test(mitSpiegel), "mit Spiegel fehlt der Weg zu den Anleitungen");
  return "mit und ohne Startpasswort, mit und ohne Spiegel";
});

await checkAsync("Ohne Startpasswort fuehrt --admin-login zu einem Weg", async () => {
  const name = "selftest-anmeldung";
  const dir = join(ROOT, "devices", name);
  const work = mkdtempSync(join(tmpdir(), "ara-anmeldung-"));
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  cpSync(join(ROOT, ".ara", "templates", "device.md"), join(dir, "device.md"));
  // TEST-NET-1: eine Adresse, die es gibt und die niemandem gehoert.
  writeFrontmatter(join(dir, "device.md"), { name, address: "192.0.2.10", arasul: "found", verdict: "supported" });
  try {
    const run = await toolAsync("device.mjs", ["--name", name, "--admin-login"], {
      ARA_ENV_FILE: join(work, ".env"),
    });
    const text = `${run.stdout}${run.stderr}`;
    assert(run.status !== 0, "ohne Startpasswort meldet die Anmeldung Erfolg");
    assert(/ARASUL_START_SELFTEST_ANMELDUNG/.test(text), `der Eintrag wird nicht benannt: ${text}`);
    // Drei Wege, und der dritte kommt ohne das Kit aus.
    assert(/secrets\.mjs --set/.test(text), "der Weg ueber die Ablage fehlt");
    assert(/geändert/.test(text), "der Fall 'am Geraet geaendert' fehlt");
    assert(/https:\/\/192\.0\.2\.10/.test(text), "die Oberflaeche des Geraets wird nicht genannt");
    assert(/Mitarbeiter/.test(text) && /Freigaben/.test(text), "es steht nicht da, was der Admin dort tut");
    assert(/mirror\.mjs --docs/.test(text), "das Admin-Handbuch wird nicht genannt");
    assert(/--deploy-key/.test(text), "es fehlt der Satz, dass das Ausrollen nicht daran haengt");
    // Und der alte Satz, der nur fuer eigene Installationen stimmte, ist weg.
    assert(!/Erstausgabe am Gerät/.test(text), `die Behauptung ueber die Erstausgabe steht noch da: ${text}`);
    return "drei Wege";
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(work, { recursive: true, force: true });
  }
});

await checkAsync("--keys markiert den eigenen Schluessel, --revoke-key widerruft nur ihn", async () => {
  const name = "selftest-schluessel";
  const dir = join(ROOT, "devices", name);
  const work = mkdtempSync(join(tmpdir(), "ara-schluessel-"));
  const home = join(work, "home");
  const skriptOrdner = join(home, "arasul", "arasul-jet", "scripts", "util");
  const liste = join(work, "liste.txt");
  const widerrufen = join(work, "widerrufen.txt");
  const envDatei = join(work, ".env");
  const eigen = "aras_abc1234deadbeef";
  mkdirSync(skriptOrdner, { recursive: true });
  // Die Attrappe des Geraets: dieselben drei Befehle, dieselbe Form der Liste.
  // Der eigene Schluessel steht darin nicht als solcher, er ist nur an seinem
  // Praefix zu erkennen, und zwei Zeilen tragen denselben Namen.
  writeFileSync(
    join(skriptOrdner, "kit-schluessel.sh"),
    `#!/bin/sh\ncase "$1" in\n  liste) cat ${JSON.stringify(liste)} ;;\n` +
      `  widerrufen) echo "widerrufen  $2" ; echo "$2" >> ${JSON.stringify(widerrufen)} ;;\n` +
      `  *) exit 2 ;;\nesac\n`,
    { mode: 0o755 }
  );
  writeFileSync(
    liste,
    "gueltig      40  aras_abc1234  Ara-Kit Probe                 angelegt 2026-08-29 14:02  nie benutzt\n" +
      "gueltig      39  aras_zzz9999  Ara-Kit Probe                 angelegt 2026-08-29 09:10  zuletzt 2026-08-29 10:00\n"
  );
  writeFileSync(envDatei, `ARASUL_KEY_SELFTEST_SCHLUESSEL=${eigen}\n`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  cpSync(join(ROOT, ".ara", "templates", "device.md"), join(dir, "device.md"));
  writeFrontmatter(join(dir, "device.md"), {
    name,
    address: "localhost",
    ssh_port: "1",
    ssh_user: "probe",
    arasul: "found",
    verdict: "supported",
    api_key_ref: "ARASUL_KEY_SELFTEST_SCHLUESSEL",
  });
  const env = { HOME: home, ARA_ENV_FILE: envDatei };
  try {
    let run = await toolAsync("device.mjs", ["--name", name, "--keys"], env);
    assert(run.status === 0, `--keys fehlgeschlagen: ${run.stderr}${run.stdout}`);
    assert(/aras_abc1234.*dieses Kit/.test(run.stdout), `der eigene Schluessel ist nicht markiert: ${run.stdout}`);
    assert(!/aras_zzz9999.*dieses Kit/.test(run.stdout), "ein fremder Schluessel gilt als eigener");
    assert(/14:02/.test(run.stdout), "die Zeile des Geraets wird umgeschrieben statt durchgereicht");

    run = await toolAsync("device.mjs", ["--name", name, "--revoke-key"], env);
    assert(run.status === 0, `--revoke-key fehlgeschlagen: ${run.stderr}${run.stdout}`);
    assert(readFileSync(widerrufen, "utf8").trim() === "aras_abc1234", "widerrufen wurde nicht genau der eigene");
    assert(!readFileSync(envDatei, "utf8").includes(eigen), "der widerrufene Schluessel liegt noch in der Ablage");
    assert(/aus der Ablage heraus \(env\)/.test(run.stdout), `es steht nicht da, aus welcher Ablage: ${run.stdout}`);
    const akte = readFileSync(join(dir, "device.md"), "utf8");
    assert(/^api_key_ref:\s*$/m.test(akte), `api_key_ref steht noch in der Akte: ${readFrontmatter(join(dir, "device.md")).fields.api_key_ref}`);
    assert(/widerrufen/.test(akte), "der Widerruf steht nicht im Protokoll der Akte");

    // Ein zweiter Lauf hat nichts mehr zu widerrufen und sagt das, statt zu raten.
    run = await toolAsync("device.mjs", ["--name", name, "--revoke-key"], env);
    assert(run.status !== 0 && /--keys/.test(run.stderr), `ohne Eintrag fehlt der Weg: ${run.stderr}`);

    // Und ohne Verbindung wird gar nichts gelesen: `runRemote` faellt sonst auf
    // die lokale Shell zurueck, und dann suchte das Kit das Skript hier.
    writeFrontmatter(join(dir, "device.md"), { address: "192.0.2.10", api_key_ref: "ARASUL_KEY_SELFTEST_SCHLUESSEL" });
    run = await toolAsync("device.mjs", ["--name", name, "--keys"], env);
    assert(run.status !== 0 && /Verbindung/.test(run.stderr), `ohne Verbindung wird trotzdem gelistet: ${run.stdout}${run.stderr}`);
    return "eigener markiert, fremder unberuehrt";
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(work, { recursive: true, force: true });
  }
});

await checkAsync("Ein Geraet, das weiter ist als das Kit, faellt beim ersten Kontakt auf", async () => {
  // Der Befund vom 30.08.2026: die Werkstatt stand auf Kontrakt 3, der Orin
  // fuehrte 5. `--check` nahm das Manifest an und gab trotzdem 1 zurueck,
  // `--deploy` brach mit "Nichts eingespielt" ab, und gesucht wurde danach in
  // der App. Drei Stellen muessen es sagen und alle drei denselben Weg nennen:
  // der erste Kontakt mit dem Geraet, /init und jede Pruefung einer App.
  const name = "selftest-voraus";
  const dir = join(ROOT, "devices", name);
  const work = mkdtempSync(join(tmpdir(), "ara-voraus-"));
  const quelle = join(work, "probeapp");
  const stateFile = join(ROOT, ".ara", "state.json");
  const savedState = existsSync(stateFile) ? readFileSync(stateFile, "utf8") : null;
  const voraus = KIT_CONTRACT_VERSION + 1;

  mkdirSync(quelle, { recursive: true });
  writeFileSync(join(quelle, "app.json"), JSON.stringify(MANIFEST, null, 2));
  writeFileSync(join(quelle, "index.html"), "<p>Probe</p>\n");
  writeFileSync(join(work, ".env"), "ARASUL_KEY_SELFTEST_VORAUS=aras_selbsttest\n");

  // Das gespielte Geraet: derselbe Kontrakt, nur eine Fassung weiter, als
  // dieses Kit versteht. Ein Produktwert steht darin nicht.
  const server = createServer((request, response) => {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ data: { ...KONTRAKT, kontrakt: voraus } }));
  });
  await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
  const base = `http://127.0.0.1:${server.address().port}`;

  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  cpSync(join(ROOT, ".ara", "templates", "device.md"), join(dir, "device.md"));
  // SSH auf Port 1 wird abgelehnt, geprueft wird darum lokal. Die
  // Schnittstelle steht in api_base, und der Kit-Schluessel in der Akte sagt,
  // dass dieses Kit dort schon einmal war.
  writeFrontmatter(join(dir, "device.md"), {
    name,
    address: "localhost",
    ssh_port: "1",
    api_base: base,
    verdict: "supported",
    api_key_ref: "ARASUL_KEY_SELFTEST_VORAUS",
  });
  const env = { ARA_ENV_FILE: join(work, ".env") };

  try {
    // 1. Der erste Kontakt mit dem Geraet.
    let run = await toolAsync("device.mjs", ["--name", name], env);
    const text = `${run.stdout}${run.stderr}`;
    assert(/versteht den Kontrakt/.test(text), `/device sagt nicht, dass das Kit den Kontrakt nicht versteht: ${text}`);
    assert(new RegExp(`Fassung ${voraus}`).test(text), `die Fassung des Geraets wird nicht genannt: ${text}`);
    assert(/update\.mjs/.test(text), `der Weg heraus fehlt beim ersten Kontakt: ${text}`);
    assert(/nicht die App/.test(text), `es steht nicht da, wo der Fehler nicht liegt: ${text}`);
    const naechste = text.split("Nächste Schritte")[1] || "";
    assert(/update\.mjs/.test(naechste), `der naechste Schritt nennt das Nachziehen nicht: ${naechste}`);

    // Und die Zahl steht in der Akte, gelesen am Geraet, nicht behauptet.
    const { fields } = readFrontmatter(join(dir, "device.md"));
    assert(fields.contract === String(voraus), `die Kontraktfassung steht nicht in der Akte: ${fields.contract}`);
    assert(/Kontrakt gelesen/.test(readFileSync(join(dir, "device.md"), "utf8")), "der Kontrakt steht nicht im Protokoll");

    // 2. /init, ohne Geraet vor sich: es liest die Akte.
    run = await toolAsync("init.mjs", ["--show"], env);
    assert(new RegExp(`${name} führt Kontraktfassung ${voraus}`).test(run.stdout), `/init nennt das Geraet nicht: ${run.stdout}`);
    assert(/update\.mjs/.test(run.stdout), `/init nennt den Weg nicht: ${run.stdout}`);
    const lage = JSON.parse((await toolAsync("init.mjs", ["--show", "--json"], env)).stdout);
    assert(lage.stand.ahead.some((e) => e.place === name && e.contract === voraus), "die Auswertung findet das Geraet nicht");

    // 3. --check nimmt das Manifest an und endet trotzdem mit 1. Dann muss die
    // Ursache dastehen, und zwar dort, wo jemand aufhoert zu lesen: am Schluss.
    run = await toolAsync("app.mjs", ["--device", name, "--check", quelle], env);
    assert(run.status === 1, `--check endet nicht mit 1: ${run.status}`);
    assert(/nimmt das Manifest an/.test(run.stdout), "das Manifest wurde gar nicht angenommen, der Fall ist ein anderer");
    assert(/Rückgabecode 1/.test(run.stdout), `--check nennt die Ursache des Rueckgabecodes nicht: ${run.stdout}`);
    assert(/update\.mjs/.test(run.stdout), `--check nennt den Weg nicht: ${run.stdout}`);
    const schluss = run.stdout.trimEnd().split("\n").slice(-4).join("\n");
    assert(/update\.mjs/.test(schluss), `der Weg steht nicht am Schluss: ${schluss}`);

    // 4. Und --deploy laesst niemanden mit "Nichts eingespielt" allein.
    run = await toolAsync("app.mjs", ["--device", name, "--deploy", quelle], env);
    assert(run.status !== 0, "ein Geraet, das weiter ist, bekam ein Paket");
    assert(/Nichts eingespielt/.test(run.stderr), `die Absage fehlt: ${run.stderr}`);
    assert(/update\.mjs/.test(run.stderr), `die Absage nennt den Weg nicht: ${run.stderr}`);
    return `Geraet ${voraus}, Kit ${KIT_CONTRACT_VERSION}`;
  } finally {
    server.close();
    rmSync(dir, { recursive: true, force: true });
    rmSync(work, { recursive: true, force: true });
    if (savedState === null) rmSync(stateFile, { force: true });
    else writeFileSync(stateFile, savedState);
  }
});

check("Die Antwortdatei erklaert ssh_key", () => {
  for (const [datei, feld] of [
    ["init-answers-partner.json", "_fields"],
    ["init-answers-company.json", "_fields"],
    ["init-answers-partner.de.json", "_felder"],
    ["init-answers-company.de.json", "_felder"],
  ]) {
    const antworten = JSON.parse(readFileSync(join(ROOT, ".ara", "templates", datei), "utf8"));
    const text = antworten[feld]?.ssh_key;
    assert(text, `${datei}: ${feld}.ssh_key fehlt`);
    assert(/~\/\.ssh/.test(text), `${datei}: es steht nicht da, wo der Schluessel liegt`);
    assert(/id_ed25519/.test(text), `${datei}: kein Beispiel fuer den Namen`);
    assert("ssh_key" in antworten, `${datei}: das Feld selbst fehlt`);
  }
  return "vier Dateien";
});

check("Das Blatt zum Browser nennt den Weg am Zertifikat vorbei", () => {
  // Fund 3 des Fremdtests am 29.08.2026: der Browser kam an
  // ERR_CERT_AUTHORITY_INVALID nicht vorbei, und kein Blatt sagte, dass das
  // erwartet ist. Das Kit weiss an anderer Stelle genau, dass ein Geraet ein
  // selbst ausgestelltes Zertifikat traegt (`tls: selfsigned`).
  //
  // Befund vom 30.08.2026: das Blatt nannte die Warnseite und riet zum
  // Hindurchklicken, aber es gibt nichts zum Klicken. `browser_navigate`
  // bricht ab, bevor eine Seite da ist. Der Weg ist der Schalter beim Start,
  // und der steht in `.mcp.json`.
  for (const [datei, muster] of [
    [".ara/knowledge/browser.md", /ERR_CERT_AUTHORITY_INVALID/],
    [".ara/knowledge/browser.de.md", /ERR_CERT_AUTHORITY_INVALID/],
  ]) {
    const text = readFileSync(join(ROOT, datei), "utf8");
    assert(muster.test(text), `${datei} nennt die Warnseite nicht`);
    assert(/tls: selfsigned/.test(text), `${datei} verbindet sie nicht mit dem Eintrag in der Akte`);
    assert(/sicher|sure/.test(text), `${datei} sagt nicht, wann man eine Adresse NICHT oeffnet`);
    assert(/--ignore-https-errors/.test(text), `${datei} nennt den Schalter nicht`);
    assert(/\.mcp\.json/.test(text), `${datei} sagt nicht, wo der Schalter steht`);
  }
  return "beide Fassungen";
});

check("README und Wissen tragen die Saetze zur Freigabe", () => {
  const stellen = [
    ["README.md", /released/],
    [".ara/README.de.md", /freigegeben|Freigabe/],
    // Die Heimat ist deploy.md; der Befehl sagt, dass es vor dem Einspielen gesagt wird.
    [".ara/commands/all/app.md", /not yet visible/],
    [".ara/commands/all/app.de.md", /noch nicht sichtbar/],
    [".ara/knowledge/deploy.md", /released/],
    [".ara/knowledge/deploy.de.md", /freigegeben/],
  ];
  for (const [datei, muster] of stellen) {
    const text = readFileSync(join(ROOT, datei), "utf8");
    assert(muster.test(text), `${datei} sagt nicht, dass eine Freigabe fehlt`);
  }
  // Und der Widerruf steht in beiden Fassungen des Geraeteblattes und der README.
  for (const datei of [".ara/knowledge/device.md", ".ara/knowledge/device.de.md", "README.md", ".ara/README.de.md"]) {
    const text = readFileSync(join(ROOT, datei), "utf8");
    assert(/--revoke-key/.test(text), `${datei} nennt den Widerruf nicht`);
    assert(/--keys/.test(text), `${datei} nennt die Liste nicht`);
  }
  return "sechs Blaetter";
});

// --- Kundenakte --------------------------------------------------------------

check("customer.mjs legt die Akte an und gibt das Lagebild samt Geräten", () => {
  const name = "selftest-kunde";
  const dir = join(CUSTOMERS_TMP, name);
  try {
    rmSync(dir, { recursive: true, force: true });

    let run = tool("customer.mjs", ["--customer", name, "--new", "--legal-name", "Selbsttest GmbH"]);
    assert(run.status === 0, `Anlegen fehlgeschlagen: ${run.stderr}`);
    const { fields } = readFrontmatter(join(dir, "customer.md"));
    assert(fields.id === name, `id nicht gesetzt: ${JSON.stringify(fields)}`);
    assert(fields.legal_name === "Selbsttest GmbH", "die Firmierung steht nicht im Frontmatter");
    assert(fields.status === "lead", "der Stand steht nicht im Frontmatter");
    assert(existsSync(join(dir, "history")) && existsSync(join(dir, "documents")), "Ordner fehlen");

    // Zweimal dieselbe Akte gibt es nicht.
    run = tool("customer.mjs", ["--customer", name, "--new"]);
    assert(run.status !== 0 && /gibt es schon/.test(run.stderr), "eine zweite Akte wurde angelegt");

    // Und ein aehnlicher Name ist meist derselbe Kunde. Das haelt an, bis
    // jemand --force sagt: zwei halbe Akten desselben Kunden sind der Fall,
    // den niemand mehr zusammenfuehrt.
    run = tool("customer.mjs", ["--customer", `${name}-gmbh`, "--new"]);
    assert(run.status !== 0 && /ähnlichem Namen/.test(run.stderr), `aehnlicher Name faellt nicht auf: ${run.stdout}`);

    // Ein Geraet des Kunden, mit allem, was seit E4 in seiner Akte steht.
    const geraet = join(dir, "devices", "zentrale");
    mkdirSync(geraet, { recursive: true });
    cpSync(join(ROOT, ".ara", "templates", "device.md"), join(geraet, "device.md"));
    writeFrontmatter(join(geraet, "device.md"), {
      name: "zentrale",
      customer: name,
      status: "live",
      verdict: "supported",
      address: "10.0.0.5",
      api_base: "https://tunnel.example:8443",
      tls: "selfsigned",
      arasul: "found",
      api_key_ref: "ARASUL_KEY_GIBTESNICHT",
    });

    run = tool("customer.mjs", ["--customer", name, "--json"]);
    assert(run.status === 0, `Lagebild fehlgeschlagen: ${run.stderr}`);
    const lage = JSON.parse(run.stdout);
    assert(lage.devices.length === 1, "das Gerät des Kunden fehlt im Lagebild");
    assert(lage.devices[0].api_base === "https://tunnel.example:8443", "die Schnittstelle fehlt");
    assert(lage.devices[0].tls === "selfsigned", "das Zertifikat fehlt");
    // Ein Name in der Akte ohne Eintrag dahinter ist der Fall, der sonst erst
    // beim ersten Deploy auffaellt.
    assert(lage.devices[0].key_ref && lage.devices[0].key_present === false, "der fehlende Schlüssel fällt nicht auf");
    assert(
      lage.open.some((satz) => /Geheimnis-Ablage steht er nicht/.test(satz)),
      `der fehlende Schlüssel steht nicht unter "was ansteht": ${lage.open.join(" | ")}`
    );
    assert(
      lage.open.some((satz) => /keine Wartungslaufzeit/.test(satz)),
      "ein laufendes Gerät ohne Wartungsende fällt nicht auf"
    );

    run = tool("customer.mjs", ["--customer", name]);
    assert(/zentrale/.test(run.stdout) && /Selbsttest GmbH/.test(run.stdout), "das Lagebild nennt Kunde oder Gerät nicht");
    assert(!/ARASUL_KEY_GIBTESNICHT=|aras_/.test(run.stdout), "im Lagebild steht ein Schlüsselwert");

    run = tool("customer.mjs", []);
    assert(new RegExp(name).test(run.stdout), "die Übersicht führt den Kunden nicht");

    // Wer alte Jahrgaenge wegraeumt, verliert sie nicht: aus history/archive/
    // wird mitgelesen, nur als Archiv gekennzeichnet.
    mkdirSync(join(dir, "history", "archive", "2025"), { recursive: true });
    writeFileSync(join(dir, "history", "2026-08-01-anruf.md"), "---\ndate: 2026-08-01\ntype: call\n---\n\n# Anruf\n");
    writeFileSync(join(dir, "history", "archive", "2025", "2025-03-04-erstkontakt.md"), "---\ndate: 2025-03-04\ntype: call\n---\n\n# Erstkontakt\n");
    run = tool("customer.mjs", ["--customer", name, "--json"]);
    const verlauf = JSON.parse(run.stdout).history;
    assert(verlauf.length === 2, `der Verlauf hat ${verlauf.length} statt zwei Einträge`);
    assert(verlauf[0].date === "2026-08-01", "der Verlauf steht nicht mit dem Neuesten zuerst");
    assert(verlauf[1].archived === true, "der archivierte Eintrag ist nicht als solcher gekennzeichnet");
    assert(/davon 1 im Archiv/.test(tool("customer.mjs", ["--customer", name]).stdout), "das Archiv wird nicht mitgezählt");
    return "anlegen, ähnlicher Name, Lagebild mit Gerät, Übersicht, Archiv";
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- Wartung -----------------------------------------------------------------

check("Aus dem Befund am Gerät wird ein Zustand und ein Urteil", () => {
  const befund = [
    "@uptime=up 12 days",
    "@disk_total_kb=100000000",
    "@disk_free_kb=4000000",
    "@disk_used_pct=96%",
    "@mem_total_kb=32000000",
    "@mem_available_kb=8000000",
    "@docker_server=27.1.1",
    "@container=eine-app|running|Up 3 days",
    "@container=andere-app|exited|Exited (1) 2 hours ago",
    "@unit_source=systemd",
    "@failed_unit=probe.service",
    "@log_source=journalctl",
    "@log_read=ja",
    "@log=Aug 27 03:00 probe: ERROR keine Verbindung",
    "@done=ja",
  ].join("\n");

  const facts = parseHealth(befund);
  assert(facts.container.length === 2, "mehrfache Schlüssel werden nicht zur Liste");
  const health = readHealth(facts);
  assert(health.complete, "ein durchgelaufenes Skript gilt als abgebrochen");
  assert(health.disk.usedPct === 96 && health.disk.freeGb === 3.8, `Platte falsch gelesen: ${JSON.stringify(health.disk)}`);
  assert(health.stopped.length === 1 && health.stopped[0].name === "andere-app", "der ausgefallene Container fällt nicht auf");

  const achtung = health.findings.filter((f) => f.level === "achtung");
  assert(achtung.length === 3, `erwartet drei Mal Achtung, bekommen: ${JSON.stringify(health.findings)}`);
  assert(achtung.some((f) => /96 Prozent/.test(f.text)), "die volle Platte wird nicht genannt");
  assert(achtung.some((f) => /probe.service/.test(f.text)), "der fehlgeschlagene Dienst wird nicht genannt");

  // Ein gesundes Gerät bekommt keinen Befund angedichtet.
  const heil = readHealth(parseHealth("@disk_used_pct=23%\n@container=eine-app|running|Up 1 day\n@done=ja"));
  assert(heil.findings.length === 0, `heiles Gerät bekommt Befunde: ${JSON.stringify(heil.findings)}`);

  // Nicht lesbar ist etwas anderes als nichts gefunden. Ein Gerät, dessen
  // Protokolle der Anmeldename nicht lesen darf, hat nicht null Fehler.
  const ohneRechte = readHealth(parseHealth("@log_source=journalctl\n@log_read=nein\n@done=ja"));
  assert(
    ohneRechte.findings.some((f) => /Rechte/.test(f.text)),
    "unlesbare Protokolle gelten als leere Protokolle"
  );
  return "Platte, Container, Dienste, Protokolle, und ein heiles Gerät bleibt heil";
});

check("Die Statuszeile verschweigt nicht, was ungemessen blieb", () => {
  const health = readHealth(parseHealth("@disk_used_pct=20%\n@done=ja"));
  const voll = statusLine({
    place: "probe",
    platform: { text: "Arasul X, Kontrakt 3" },
    apps: { state: "gelesen", found: [{ id: "eineapp", live: "1.0.0", test: "1.1.0" }] },
    backup: { text: "datum 2026-08-26" },
    health,
    unmeasured: [],
  });
  assert(/Arasul X/.test(voll) && /eineapp live 1.0.0, Test 1.1.0/.test(voll), `Statuszeile unvollständig: ${voll}`);
  assert(/Sicherung: datum 2026-08-26/.test(voll), "die Sicherung fehlt in der Statuszeile");
  assert(/nichts auffällig/.test(voll), "ein heiles Gerät wird nicht als solches genannt");

  // Ohne Messung steht das da, statt wegzufallen: eine Zeile ohne Sicherung
  // liest sich sonst wie eine Zeile mit einer heilen Sicherung.
  const leer = statusLine({ place: "probe", platform: null, apps: null, backup: null, health: null, unmeasured: ["Plattform"] });
  assert(/Plattform ungemessen/.test(leer), `ungemessene Plattform fehlt: ${leer}`);
  assert(/Apps ungemessen/.test(leer), "ungemessene Apps fehlen");
  assert(/Sicherung: ungemessen/.test(leer), "ungemessene Sicherung fehlt");
  assert(/ungemessen: Plattform/.test(leer), "die Liste des Ungemessenen fehlt");
  return "voll und leer";
});

check("Zu einem Thema wird im Kontrakt nachgesehen, nicht geraten", () => {
  // Fuer die Sicherung kennt das Kit keinen Pfad. Es sucht in der Liste, die
  // das Geraet selbst veroeffentlicht, in dessen Worten.
  const ohne = topicEndpoints(KONTRAKT, ["sicherung", "backup"]);
  assert(ohne.length === 0, "in einem Kontrakt ohne Sicherung wird eine gefunden");

  const mit = {
    ...KONTRAKT,
    endpunkte: [
      ...KONTRAKT.endpunkte,
      { verb: "GET", pfad: "/api/v1/external/sicherung", bereich: "betrieb", was: "Datum und Groesse der letzten Sicherung" },
    ],
  };
  const gefunden = topicEndpoints(mit, ["sicherung", "backup"]);
  assert(gefunden.length === 1 && gefunden[0].pfad === "/api/v1/external/sicherung", `falsch gefunden: ${JSON.stringify(gefunden)}`);
  assert(topicEndpoints(mit, ["sicherung"], "POST").length === 0, "das Verb wird nicht beachtet");

  // Ein Pfad mit Platzhalter ist nicht aufrufbar: was dort hineingehoert, weiss
  // das Kit nicht, und es fuellt es auch nicht auf gut Glueck.
  assert(needsParameter("/api/v1/external/apps/:id"), "ein Parameter im Pfad fällt nicht auf");
  assert(needsParameter("/api/v1/external/freigaben?lauf=<id>"), "eine Rückfrage mit Platzhalter fällt nicht auf");
  assert(!needsParameter("/api/v1/external/sicherung"), "ein vollständiger Pfad gilt als unvollständig");
  return "kein Endpunkt, ein Endpunkt, einer mit Platzhalter";
});

await checkAsync("maintain.mjs berichtet auch ohne SSH und sagt, was fehlt", async () => {
  const name = "selftest-wartung";
  const akte = join(ROOT, "devices", name);
  const stateFile = join(ROOT, ".ara", "state.json");
  const savedState = existsSync(stateFile) ? readFileSync(stateFile, "utf8") : null;

  // Das Geraet, gespielt. Der Kontrakt kennt den Weg zu einer App, aber keinen
  // zur Sicherung: genau der Stand, in dem dieses Kit gebaut wurde.
  const gesehen = { pfade: [], key: null };
  let mitSicherung = false;
  const server = createServer((request, response) => {
    const antwort = (status, body) => {
      response.writeHead(status, { "Content-Type": "application/json" });
      response.end(JSON.stringify(body));
    };
    gesehen.key = request.headers["x-api-key"] || null;
    if (gesehen.key !== "aras_wartung") return antwort(401, { error: { message: "Kein gueltiger Schluessel" } });
    const pfad = request.url.split("?")[0];
    gesehen.pfade.push(pfad);
    if (pfad === "/api/v1/external/contract") {
      return antwort(200, {
        data: {
          ...KONTRAKT,
          arasul: "Vorserie",
          endpunkte: mitSicherung
            ? [
                ...KONTRAKT.endpunkte,
                { verb: "GET", pfad: "/api/v1/external/sicherung", bereich: "betrieb", was: "Letzte Sicherung ausserhalb" },
              ]
            : KONTRAKT.endpunkte,
        },
      });
    }
    if (pfad === "/api/v1/external/apps/probeapp") {
      return antwort(200, { data: { id: "probeapp", live: { version: "1.2.0" }, test: { version: "1.3.0" } } });
    }
    if (pfad === "/api/v1/external/sicherung") {
      return antwort(200, { data: { ziel: "USB", datum: "2026-08-26 03:00", groesse_mb: 812 } });
    }
    antwort(404, { error: { message: "Endpoint not found" } });
  });
  await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
  const base = `http://127.0.0.1:${server.address().port}`;
  const env = { ARASUL_KEY_WARTUNG: "aras_wartung" };

  mkdirSync(akte, { recursive: true });
  cpSync(join(ROOT, ".ara", "templates", "device.md"), join(akte, "device.md"));
  // Die Adresse fuehrt ins Leere: so wie ein Geraet, das gerade nur ueber einen
  // Tunnel erreichbar ist und dessen SSH nicht steht.
  writeFrontmatter(join(akte, "device.md"), {
    name,
    address: "127.0.0.1",
    ssh_port: "1",
    api_base: base,
    verdict: "supported",
    arasul: "found",
    api_key_ref: "ARASUL_KEY_WARTUNG",
  });

  try {
    let run = await toolAsync("maintain.mjs", ["--device", name, "--apps", "probeapp"], env);
    assert(run.status === 0, `Bericht fehlgeschlagen: ${run.stderr}${run.stdout}`);
    assert(gesehen.key === "aras_wartung", "der Kit-Schlüssel kam nicht in der Kopfzeile an");
    assert(/Arasul Vorserie/.test(run.stdout), "die Systemversion aus dem Kontrakt fehlt");
    assert(/probeapp: live 1.2.0, Test 1.3.0/.test(run.stdout), `die Stände der App fehlen: ${run.stdout}`);

    // Ohne SSH entsteht der Bericht trotzdem, und was fehlt, steht darin.
    assert(/Zustand am Gerät/.test(run.stdout), "der Abschnitt zum Zustand fehlt");
    assert(/Was fehlt/.test(run.stdout), "der Abschnitt über das Ungemessene fehlt");
    assert(/Kein SSH/.test(run.stdout), `das fehlende SSH wird nicht benannt: ${run.stdout}`);

    // Die Sicherung steht nicht im Kontrakt dieses Geraets. Dann wird kein Pfad
    // geraten, und der Punkt heisst "noch nicht am Geraet".
    assert(/noch nicht am Gerät/.test(run.stdout), "die fehlende Sicherung wird nicht als solche ausgewiesen");
    assert(
      !gesehen.pfade.some((p) => /sicherung|backup/i.test(p)),
      `das Kit hat einen Pfad geraten: ${gesehen.pfade.join(", ")}`
    );

    // Die Statuszeile ist die erste Zeile, damit sie ein Mensch zuerst liest.
    const erste = run.stdout.split("\n")[0];
    assert(new RegExp(`^${name}: `).test(erste), `die Statuszeile steht nicht zuerst: ${erste}`);
    assert(/Sicherung:/.test(erste), "die Sicherung fehlt in der Statuszeile");

    run = await toolAsync("maintain.mjs", ["--device", name, "--line", "--apps", "probeapp"], env);
    assert(run.stdout.trim().split("\n").length === 1, `--line gibt mehr als eine Zeile: ${run.stdout}`);

    // Kommt der Endpunkt am Geraet dazu, findet ihn das Kit von selbst, ohne
    // dass hier etwas nachgezogen wird.
    mitSicherung = true;
    gesehen.pfade = [];
    run = await toolAsync("maintain.mjs", ["--device", name, "--apps", "probeapp"], env);
    assert(gesehen.pfade.includes("/api/v1/external/sicherung"), "der neue Endpunkt wird nicht gerufen");
    assert(/2026-08-26 03:00/.test(run.stdout), `die Sicherung steht nicht im Bericht: ${run.stdout}`);

    // Nach einer App, die das Geraet nicht kennt, wird gefragt, und die Antwort
    // ist "nicht auf diesem Gerät", keine erfundene Version.
    run = await toolAsync("maintain.mjs", ["--device", name, "--apps", "gibtesnicht"], env);
    assert(/Nicht auf diesem Gerät: gibtesnicht/.test(run.stdout), `unbekannte App falsch behandelt: ${run.stdout}`);

    // --report legt den Bericht in die Akte und schreibt in den Laufzettel.
    assert(
      tool("runsheet.mjs", ["--create", "--device", name]).status === 0,
      "der Laufzettel für die Prüfung ließ sich nicht anlegen"
    );
    run = await toolAsync("maintain.mjs", ["--device", name, "--report", "--apps", "probeapp"], env);
    const berichte = readdirSync(join(akte, "reports"));
    assert(berichte.length === 1, `erwartet einen Bericht, gefunden: ${berichte.join(", ")}`);
    assert(/wartung\.md$/.test(berichte[0]), `der Bericht heißt ${berichte[0]}`);
    assert(/Wartungsbericht/.test(readFileSync(join(akte, "reports", berichte[0]), "utf8")), "der Bericht ist leer");
    assert(/Wartungsbericht aufgenommen/.test(readFileSync(join(akte, "runsheet.md"), "utf8")), "der Laufzettel bekam nichts");

    // Zwei Berichte an einem Tag ueberschreiben sich nicht: wer nach einer
    // Reparatur nachmisst, will beide Staende sehen.
    await toolAsync("maintain.mjs", ["--device", name, "--report", "--apps", "probeapp"], env);
    assert(readdirSync(join(akte, "reports")).length === 2, "der zweite Bericht hat den ersten überschrieben");

    // Geht kein Weg, wird kein Bericht erfunden.
    run = await toolAsync("maintain.mjs", ["--device", name, "--no-api"], env);
    assert(run.status !== 0 && /nichts zu messen/i.test(run.stderr), `ohne beide Wege kam ein Bericht: ${run.stdout}`);
    return "Version, Apps, fehlende und vorhandene Sicherung, Statuszeile, Bericht, Laufzettel";
  } finally {
    server.close();
    rmSync(akte, { recursive: true, force: true });
    if (savedState === null) rmSync(stateFile, { force: true });
    else writeFileSync(stateFile, savedState);
  }
});

// --- Trennung von Partnerdaten ----------------------------------------------

check("Partnerdaten bleiben von der Versionskontrolle ausgenommen", () => {
  // Der wichtigste Schutz des Kits: ein Update darf Kundendaten nie berühren.
  // Wenn .gitignore und Ordnernamen auseinanderlaufen, fällt das sonst erst auf,
  // wenn Kundenakten in einem Repository gelandet sind.
  const isRepo = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (isRepo.status !== 0) return "übersprungen, kein Git-Repository";

  const mustBeIgnored = [
    "customers/beispiel/customer.md",
    "customers/beispiel/devices/probe/runsheet.md",
    "business/profile.md",
    "business/company.md",
    "business/notes/gelerntes.md",
    "devices/zentrale/device.md",
    "apps/eigene-app/app.json",
    // Der Auftrag eines Zweigs lebt im Worktree und wird nie committet.
    "AUFTRAG.md",
    ".env",
    ".ara/mirror/VERSION",
    ".ara/state.json",
    // Erzeugte Befehle. Nur init.md ist getrackt, siehe unten.
    ".claude/commands/device.md",
    ".claude/commands/eigener.md",
    ".claude/commands/.sources.json",
  ];
  // Fund 1 der Werkstatt am 29.08.2026: ein Klon, der seinen EIGENEN Betrieb
  // fuehrt, verfolgt business/, devices/ und apps/ mit Absicht. Was das Profil
  // unter `versioned:` nennt, ist darum kein Fehler und wird hier nicht
  // gemessen. Alles andere schon, und ohne das Feld ist alles andere alles.
  const eigen = ownFolders();
  const zuPruefen = mustBeIgnored.filter((path) => !eigen.includes(path.split("/")[0]));
  const offen = zuPruefen.filter(
    (path) =>
      spawnSync("git", ["check-ignore", "-q", path], { cwd: ROOT }).status !== 0
  );
  assert(
    offen.length === 0,
    `würde ins Repository wandern: ${offen.join(", ")}, .gitignore prüfen`
  );
  for (const name of eigen) {
    assert(USER_FOLDERS.includes(name), `versioned nennt ${name}, das ist kein Ordner des Nutzers`);
  }

  // Umgekehrt: das Werkzeug selbst muss verfolgt werden, sonst fehlt es nach dem Klonen.
  const mustBeTracked = [
    ".claude/CLAUDE.md",
    ".claude/settings.json",
    ".claude/commands/init.md",
    ".ara/tools/selftest.mjs",
    ".ara/commands/all/device.md",
    ".ara/commands/partner/customer.md",
    // Die Geraeteprofile liegen unter .ara/knowledge/devices/, und `devices/`
    // stand in .gitignore ohne fuehrenden Schraegstrich: sie waeren im Klon
    // nicht angekommen, und ohne sie erkennt /device kein Geraet mehr.
    ".ara/knowledge/devices/orin.md",
    ".ara/knowledge/devices/orin.de.md",
    // Die Vorlage einer App ist alles, was ein Fremder zum Ansehen hat: der
    // Klon bringt keine App mehr mit, apps/ gehoert ganz dem Nutzer.
    ".ara/templates/app/app.json",
    ".ara/templates/app/backend/server.mjs",
    // Ohne die leere Vereinbarung neben dem Backend startet eine App aus der
    // Vorlage keinen Flow: sie ist die Stelle, an der das Kit beim Einspielen
    // hineinschreibt, was das Geraet vergibt.
    ".ara/templates/app/backend/arasul.json",
    // Und der Rest der Vorlage: ohne den Kern, die Ablage und die Oberflaeche
    // legt `--new` eine App an, die nicht baut.
    ".ara/templates/app/backend/kern/vorgaenge.mjs",
    ".ara/templates/app/backend/ablage/migrationen/001-vorgaenge.sql",
    ".ara/templates/app/frontend/package.json",
    ".ara/templates/app/frontend/src/app.tsx",
    // Der Spiegel des Designsystems, alle drei Saetze. Ohne ihn hat eine neue
    // App keine Bausteine, und `--new` legt eine an, die nicht baut.
    ".ara/templates/app/frontend/src/marken/index.ts",
    ".ara/templates/app/frontend/src/marken/marken.css",
    ".ara/templates/app/frontend/src/marken/theme.css",
    ".ara/templates/app/frontend/src/marken/primitive/button.tsx",
    ".ara/templates/app/frontend/src/marken/muster/Datenliste.tsx",
    ".ara/templates/app/frontend/src/marken/mirror.json",
    // Die deutsche README und die Lint-Regeln liegen unter .ara/, damit die
    // Wurzel klein bleibt. Beide muessen trotzdem mitkommen.
    ".ara/README.de.md",
    ".ara/.markdownlint-cli2.jsonc",
    "README.md",
    "LICENSE",
  ];
  const ignored = mustBeTracked.filter(
    (path) => spawnSync("git", ["check-ignore", "-q", path], { cwd: ROOT }).status === 0
  );
  assert(ignored.length === 0, `fehlt nach dem Klonen: ${ignored.join(", ")}`);

  return eigen.length
    ? `${zuPruefen.length} Pfade geprüft, ${eigen.join(", ")} gehören laut Profil diesem Klon`
    : `${zuPruefen.length} Pfade geprüft`;
});

// --- Die Rechnung -------------------------------------------------------------

check("Betraege werden in ganzen Cent gelesen und geschrieben", () => {
  // Eine Rechnung, die aus Gleitkommazahlen entsteht, ist irgendwann einen Cent
  // daneben, und der Cent steht dann in der Buchhaltung des Kunden.
  const cases = [
    ["1.234,56", 123456],
    ["95", 9500],
    ["24,90 Euro", 2490],
    ["24.90", 2490],
    ["1.560", 156000],
    ["0,01", 1],
    ["", null],
    ["{Betrag}", null],
  ];
  for (const [text, expected] of cases) {
    const got = parseAmount(text);
    assert(got === expected, `"${text}" wird als ${got} gelesen, erwartet ${expected}`);
  }
  for (const cents of [1, 99, 100, 123456, 100000000]) {
    assert(
      parseAmount(formatAmount(cents)) === cents,
      `${cents} ueberlebt den Weg durch das Papier nicht: ${formatAmount(cents)}`
    );
  }
  return `${cases.length} Schreibweisen`;
});

check("Der Nummernkreis ist fortlaufend und laesst sich nicht zurueckdrehen", () => {
  // Eine Luecke im Nummernkreis ist das Erste, wonach eine Betriebspruefung
  // sucht. Also faellt sie hier auf und nicht dort.
  const ledger = (year, last, numbers) => ({
    exists: true,
    year,
    last,
    format: "JJJJ-NNNN",
    rows: numbers.map((n) => ({ Number: n, Date: "", Customer: "", State: "gestellt" })),
  });

  const heil = ledger(2026, 2, ["2026-0001", "2026-0002"]);
  assert(auditLedger(heil).length === 0, `ein heiler Kreis wird beanstandet: ${auditLedger(heil)}`);
  assert(peekNumber("2026-09-01", heil).number === "2026-0003", "die naechste Nummer stimmt nicht");
  assert(peekNumber("2027-01-02", heil).number === "2027-0001", "das neue Jahr faengt nicht bei 0001 an");

  const luecke = ledger(2026, 3, ["2026-0001", "2026-0003"]);
  assert(auditLedger(luecke).some((p) => /Lücke/.test(p)), "eine Luecke faellt nicht auf");

  const doppelt = ledger(2026, 2, ["2026-0001", "2026-0001", "2026-0002"]);
  assert(auditLedger(doppelt).some((p) => /zweimal/.test(p)), "eine doppelte Nummer faellt nicht auf");

  const gedreht = ledger(2026, 1, ["2026-0001", "2026-0002"]);
  assert(auditLedger(gedreht).some((p) => /zurückgedreht/.test(p)), "ein gedrehter Kopf faellt nicht auf");

  let refused = false;
  try {
    peekNumber("2025-12-30", heil);
  } catch {
    refused = true;
  }
  assert(refused, "ein Beleg aus einem abgeschlossenen Jahr bekommt trotzdem eine Nummer");
  return "Luecke, Dublette, gedrehter Kopf und altes Jahr werden erkannt";
});

check("Die Steuer wird je Satz gerechnet, nicht je Zeile", () => {
  // Je Zeile gerundet weicht die Summe bei vielen Positionen um Cents von der
  // ab, die das Finanzamt rechnet.
  const rows = [
    { text: "Beratung", quantity: "3", unit: "Stunden", price: "95,00", rate: "" },
    { text: "Fahrt", quantity: "1", unit: "Stueck", price: "0,33", rate: "" },
    { text: "Buch", quantity: "3", unit: "Stueck", price: "24,90", rate: "7 Prozent" },
  ];
  const { positions, problems } = computePositions(rows, 19);
  assert(problems.length === 0, `lesbare Zeilen werden beanstandet: ${problems.join(" ")}`);
  const sums = totals(positions, "standard");
  // 3 mal 95,00 plus 0,33 plus 3 mal 24,90 sind 360,03.
  assert(sums.net === 36003, `die Nettosumme ist ${formatAmount(sums.net)}, erwartet 360,03`);
  assert(sums.taxes.length === 2, `es entstehen ${sums.taxes.length} Steuergruppen statt zwei`);
  const neunzehn = sums.taxes.find((group) => group.rate === 19);
  assert(neunzehn.basis === 28533, `die Grundlage zu 19 Prozent ist ${formatAmount(neunzehn.basis)}`);
  // Je Zeile gerundet kaeme 54,15 plus 0,06 heraus, auf die Summe sind es 54,21.
  assert(neunzehn.tax === 5421, `19 Prozent auf 285,33 sind ${formatAmount(neunzehn.tax)}, erwartet 54,21`);
  const sieben = sums.taxes.find((group) => group.rate === 7);
  assert(sieben.tax === 523, `7 Prozent auf 74,70 sind ${formatAmount(sieben.tax)}, erwartet 5,23`);
  assert(sums.gross === sums.net + sums.tax, "brutto ist nicht netto plus Steuer");

  // Ohne Steuerausweis darf kein Steuerbetrag entstehen.
  const klein = totals(positions, "kleinunternehmer");
  assert(klein.tax === 0, "ein Kleinunternehmer weist Steuer aus");
  assert(klein.taxes.every((group) => group.category === "E" && group.reason), "der Grund der Befreiung fehlt");
  return `netto ${formatAmount(sums.net)}, Steuer ${formatAmount(sums.tax)}`;
});

check("Die Pflichtangaben nach § 14 UStG werden einzeln geprueft", () => {
  // Fehlt eine, berechtigt die Rechnung den Kunden nicht zum Vorsteuerabzug.
  // Das faellt bei ihm auf, nicht beim Partner.
  const dir = mkdtempSync(join(tmpdir(), "ara-rechnung-"));
  try {
    const seller = {
      exists: true,
      legal_name: "Beispiel IT-Service e. K.",
      address: "Musterweg 3, 48143 Muenster",
      street: "Musterweg 3",
      postcode: "48143",
      city: "Muenster",
      address_ok: true,
      country: "DE",
      phone: "",
      email: "",
      website: "",
      tax_number: "",
      vat_id: "DE123456789",
      iban: "",
      payment_terms: "14",
    };
    const ledger = {
      exists: true,
      year: 2026,
      last: 1,
      format: "JJJJ-NNNN",
      rows: [{ Number: "2026-0001", Date: "2026-08-27", Customer: "probe", State: "entwurf" }],
    };
    const beleg = (changes = {}, body = "") => {
      const fields = {
        invoice_number: "2026-0001",
        invoice_date: "2026-08-27",
        due_date: "2026-09-10",
        service_date: "2026-08-20",
        buyer_name: "Probe GmbH",
        buyer_street: "Industriestrasse 14",
        buyer_postcode: "48155",
        buyer_city: "Muenster",
        buyer_country: "DE",
        currency: "EUR",
        tax_mode: "standard",
        tax_rate: "19",
        ...changes,
      };
      const file = join(dir, "beleg.md");
      writeFileSync(
        file,
        `---\n${Object.entries(fields)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n")}\n---\n\nFaellig am: ${fields.due_date}\n\n## Leistungen\n\n` +
          "| Pos | Leistung | Menge | Einheit | Einzelpreis netto | Gesamt netto |\n" +
          "| --- | --- | --- | --- | --- | --- |\n" +
          "| 1 | Einrichtung des Geraets in der Zentrale | 2 | Tage | 780,00 Euro | 1.560,00 Euro |\n" +
          `${body}\n`
      );
      return checkVat14(readInvoice(file), seller, ledger);
    };

    const heil = beleg();
    const offen = heil.filter((check) => !check.ok);
    assert(offen.length === 0, `ein vollstaendiger Beleg wird beanstandet: ${offen.map((c) => c.label).join(", ")}`);
    assert(heil.length === 11, `es werden ${heil.length} Angaben geprueft, erwartet 11`);

    // Jede Luecke muss genau ihre Zeile rot machen.
    const luecken = [
      [{ service_date: "" }, /Zeitpunkt der Lieferung/],
      [{ invoice_date: "" }, /Ausstellungsdatum/],
      [{ invoice_number: "2026-0099" }, /Rechnungsnummer/],
      [{ buyer_city: "" }, /Leistungsempfaengers/],
      [{ due_date: "" }, /Faelligkeit/],
    ];
    for (const [change, pattern] of luecken) {
      const rot = beleg(change).filter((check) => !check.ok);
      assert(rot.length >= 1, `${JSON.stringify(change)} macht keine Zeile rot`);
      assert(rot.some((check) => pattern.test(check.label)), `${JSON.stringify(change)} macht die falsche Zeile rot`);
    }

    // Ohne Steuerausweis braucht es den Hinweis auf die Befreiung, sonst nicht.
    const ohneHinweis = beleg({ tax_mode: "kleinunternehmer", tax_rate: "0" }).filter((c) => !c.ok);
    assert(
      ohneHinweis.some((check) => /Steuerbefreiung/.test(check.label)),
      "ein Kleinunternehmer ohne Hinweis auf § 19 UStG faellt nicht auf"
    );
    const mitHinweis = beleg({ tax_mode: "kleinunternehmer", tax_rate: "0" }, "\nKleinunternehmer nach § 19 UStG.\n");
    assert(
      mitHinweis.every((check) => check.ok),
      `mit Hinweis bleibt offen: ${mitHinweis.filter((c) => !c.ok).map((c) => c.label).join(", ")}`
    );

    // Ein Platzhalter im Text ist eine eigene Zeile, nicht nur ein Problem des Drucks.
    const platzhalter = beleg({}, "\n{Noch zu fuellen}\n").filter((check) => !check.ok);
    assert(platzhalter.some((check) => /Platzhalter/.test(check.label)), "ein Platzhalter faellt nicht auf");
    return "11 Angaben, jede einzeln nachgewiesen";
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

check("Die Rechnungsdaten halten die Regeln der EN 16931 ein", () => {
  // Das XML ist das, was die Buchhaltung des Kunden liest. Was hier durchgeht,
  // geht dort ein.
  const dir = mkdtempSync(join(tmpdir(), "ara-cii-"));
  try {
    const file = join(dir, "beleg.md");
    writeFileSync(
      file,
      "---\ninvoice_number: 2026-0001\ninvoice_date: 2026-08-27\ndue_date: 2026-09-10\n" +
        "service_date: 2026-08-20\nbuyer_name: Probe GmbH\nbuyer_street: Industriestrasse 14\n" +
        "buyer_postcode: 48155\nbuyer_city: Muenster\nbuyer_country: DE\ncurrency: EUR\n" +
        "tax_mode: standard\ntax_rate: 19\n---\n\n## Leistungen\n\n" +
        "| Pos | Leistung | Menge | Einheit | Einzelpreis netto | Gesamt netto |\n" +
        "| --- | --- | --- | --- | --- | --- |\n" +
        "| 1 | Einrichtung des Geraets | 2 | Tage | 780,00 Euro | 1.560,00 Euro |\n"
    );
    const seller = {
      legal_name: "Beispiel IT-Service e. K.",
      street: "Musterweg 3",
      postcode: "48143",
      city: "Muenster",
      country: "DE",
      phone: "",
      email: "",
      vat_id: "DE123456789",
      tax_number: "",
      iban: "DE02120300000000202051",
    };
    const xml = buildXml(readInvoice(file), seller);
    const result = validateXml(xml);
    assert(result.ok, `saubere Daten werden beanstandet:\n    ${result.problems.join("\n    ")}`);
    assert(result.unchecked.length > 0, "es wird nicht gesagt, was ungeprueft bleibt");

    // Jede Verfaelschung muss ihre Regel finden.
    const faelle = [
      [xml.replace("<ram:GrandTotalAmount>1856.40", "<ram:GrandTotalAmount>1856.00"), /BR-CO-15/],
      [xml.replace("<ram:CalculatedAmount>296.40", "<ram:CalculatedAmount>300.00"), /BR-CO-1[47]/],
      [xml.replace("<ram:LineTotalAmount>1560.00</ram:LineTotalAmount>\n        ", ""), /BR-24|fehlt/],
      [xml.replace("urn:cen.eu:en16931:2017", "urn:etwas:anderes"), /BR-01/],
      [xml.replace("<ram:CountryID>DE</ram:CountryID>", "<ram:CountryID>Deutschland</ram:CountryID>"), /BR-09/],
      [xml.replace("<ram:TypeCode>380", "<ram:TypeCode>381"), /BR-CL-01/],
      [xml.replace(/<ram:InvoiceCurrencyCode>EUR<\/ram:InvoiceCurrencyCode>\n\s*/, ""), /BR-05|fehlt/],
    ];
    for (const [broken, pattern] of faelle) {
      assert(broken !== xml, "eine Verfaelschung hat gar nichts geaendert, der Test misst nichts");
      const judged = validateXml(broken);
      assert(!judged.ok, `eine Verfaelschung geht durch: ${pattern}`);
      assert(
        judged.problems.some((problem) => pattern.test(problem)),
        `erwartet wurde ${pattern}, gefunden: ${judged.problems.join(" | ")}`
      );
    }

    // Ein vertauschtes Element faellt gegen das Modell der Schemaordnung auf.
    const vertauscht = xml.replace(
      /( *)<ram:TypeCode>VAT<\/ram:TypeCode>\n( *)<ram:CategoryCode>S<\/ram:CategoryCode>/,
      "$1<ram:CategoryCode>S</ram:CategoryCode>\n$2<ram:TypeCode>VAT</ram:TypeCode>"
    );
    assert(vertauscht !== xml, "die Vertauschung hat nichts geaendert, der Test misst nichts");
    assert(
      validateXml(vertauscht).problems.some((problem) => /Reihenfolge/.test(problem)),
      "eine vertauschte Reihenfolge faellt nicht auf"
    );
    return `${faelle.length} Verfaelschungen, jede gefunden`;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

check("Das PDF traegt die Rechnungsdaten und gibt sie unveraendert zurueck", () => {
  // ZUGFeRD lebt davon, dass das XML wirklich im PDF steckt. Eine Datei
  // daneben geht auf dem Weg zum Kunden verloren.
  const dir = mkdtempSync(join(tmpdir(), "ara-zugferd-"));
  try {
    const quelle = join(dir, "blatt.md");
    const ziel = join(dir, "blatt.pdf");
    writeFileSync(quelle, "---\nprobe: ja\n---\n\n# Rechnung\n\nEin Satz.\n");
    const run = tool("pdf.mjs", [quelle, "--out", ziel]);
    if (/Kein Chromium gefunden/.test(run.stderr)) return "uebersprungen: kein Chromium auf diesem Rechner";
    assert(run.status === 0, `Druck fehlgeschlagen: ${run.stderr || run.stdout}`);

    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<probe>Ümläute und &amp; dazu</probe>\n';
    const fertig = embed(readFileSync(ziel), {
      xml,
      attachment: "factur-x.xml",
      profile: "EN 16931",
      description: "Rechnung 2026-0001 als Datensatz",
      author: "Beispiel IT-Service e. K.",
    });
    writeFileSync(ziel, fertig);

    const lage = inspect(readFileSync(ziel));
    assert(lage.attachment, "im PDF steckt keine angehaengte Datei");
    assert(lage.attachment.name === "factur-x.xml", `der Anhang heisst ${lage.attachment.name}`);
    assert(lage.attachment.xml === xml, "der Anhang kommt veraendert zurueck");
    assert(lage.attachment.relationship === "Alternative", "die Beziehung des Anhangs ist nicht Alternative");
    assert(lage.pdfa, "die Kennzeichnung als PDF/A-3B fehlt");
    assert(lage.outputIntent, "das Ausgabeprofil fehlt");
    assert(lage.associated, "der Verweis /AF im Katalog fehlt");
    assert(lage.embeddedFiles, "der Namensbaum der eingebetteten Dateien fehlt");
    assert(lage.facturx, "die Factur-X-Metadaten fehlen");
    assert(lage.header === "%PDF-1.7", `die Kopfzeile ist ${lage.header}`);

    // Die Querverweise des Nachtrags muessen auf ihre Objekte zeigen, sonst
    // ist die Datei fuer jeden Leser kaputt.
    const text = fertig.toString("latin1");
    const start = Number([...text.matchAll(/startxref\s+(\d+)/g)].pop()[1]);
    const zeilen = text.slice(start).split("\n");
    let geprueft = 0;
    for (let i = 1; i < zeilen.length; i++) {
      const abschnitt = zeilen[i].trim().match(/^(\d+) (\d+)$/);
      if (!abschnitt) {
        if (zeilen[i].startsWith("trailer")) break;
        continue;
      }
      const ersteNummer = Number(abschnitt[1]);
      for (let k = 0; k < Number(abschnitt[2]); k++) {
        const stelle = Number(zeilen[i + 1 + k].trim().split(/\s+/)[0]);
        assert(
          text.startsWith(`${ersteNummer + k} 0 obj`, stelle),
          `der Querverweis auf Objekt ${ersteNummer + k} zeigt auf die falsche Stelle`
        );
        geprueft++;
      }
      i += Number(abschnitt[2]);
    }
    assert(geprueft > 0, "der Nachtrag hat keine Querverweistabelle");
    return `${geprueft} Querverweise, Anhang unveraendert`;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

check("Das Ausgabeprofil ist ein lesbares ICC-Profil", () => {
  // Ohne Ausgabeprofil ist bei PDF/A nicht festgelegt, welche Farbe ein Wert
  // bedeutet. Gebaut wird es im Kit, also wird auch hier nachgesehen.
  const profile = sRgbProfile();
  assert(profile.readUInt32BE(0) === profile.length, "die Groesse im Kopf stimmt nicht mit der Datei ueberein");
  assert(profile.subarray(36, 40).toString("latin1") === "acsp", "die Kennung acsp fehlt");
  assert(profile.subarray(12, 16).toString("latin1") === "mntr", "es ist kein Bildschirmprofil");
  assert(profile.subarray(16, 20).toString("latin1") === "RGB ", "der Farbraum ist nicht RGB");
  const count = profile.readUInt32BE(128);
  const tags = [];
  for (let i = 0; i < count; i++) {
    const at = 132 + i * 12;
    const name = profile.subarray(at, at + 4).toString("latin1");
    const offset = profile.readUInt32BE(at + 4);
    const size = profile.readUInt32BE(at + 8);
    assert(offset + size <= profile.length, `der Eintrag ${name} zeigt ueber das Profil hinaus`);
    tags.push(name);
  }
  for (const needed of ["desc", "cprt", "wtpt", "rXYZ", "gXYZ", "bXYZ", "rTRC", "gTRC", "bTRC"]) {
    assert(tags.includes(needed), `im Profil fehlt der Eintrag ${needed}`);
  }
  return `${tags.length} Eintraege, ${profile.length} Byte`;
});

check("pdf.mjs druckt kein Frontmatter", () => {
  // Ein Beleg traegt seine maschinenlesbaren Felder im Kopf. Gedruckt saehe der
  // Kunde zuerst eine Liste von Feldnamen.
  const dir = mkdtempSync(join(tmpdir(), "ara-kopf-"));
  try {
    const quelle = join(dir, "beleg.md");
    const ziel = join(dir, "beleg.html");
    writeFileSync(
      quelle,
      "---\ninvoice_number: 2026-0001\ntax_mode: standard\n---\n\n> Hinweis der Vorlage.\n\n---\n\n# Rechnung\n\nEin Satz.\n"
    );
    const run = tool("pdf.mjs", [quelle, "--html", "--out", ziel]);
    assert(run.status === 0, `HTML-Ausgabe fehlgeschlagen: ${run.stderr || run.stdout}`);
    const html = readFileSync(ziel, "utf8");
    assert(!/invoice_number/.test(html), "das Frontmatter landet im Papier");
    assert(!/Hinweis der Vorlage/.test(html), "der Hinweisblock der Vorlage landet im Papier");
    assert(/<h1>Rechnung<\/h1>/.test(html), "der Inhalt fehlt");
    return "Kopf und Hinweisblock bleiben draussen";
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

await checkAsync("Eine Rechnung entsteht aus einer Kundenakte, mit Nummer und Anhang", async () => {
  // Der ganze Weg an einem Wegwerf-Kit: Firmenkopf, Kundenakte, Angebot,
  // Rechnung, Pruefliste, Druck. Nichts davon fasst die echten Ordner an.
  // Der Weg beginnt bei der Rechnungsvorlage, und die gehoert dem Partner.
  if (!PARTNER_MATERIAL) return OHNE_PARTNERWARE;
  const work = mkdtempSync(join(tmpdir(), "ara-invoice-"));
  const fork = join(work, "kit");
  cpSync(join(ROOT, ".ara"), join(fork, ".ara"), {
    recursive: true,
    filter: (src) => !/\/(mirror|node_modules)(\/|$)/.test(src),
  });
  const write = (rel, content) => {
    mkdirSync(join(fork, rel, ".."), { recursive: true });
    writeFileSync(join(fork, rel), content);
  };
  const read = (rel) => readFileSync(join(fork, rel), "utf8");
  const forkTool = (args) =>
    new Promise((done) => {
      const child = spawn("node", [join(fork, ".ara", "tools", "invoice.mjs"), ...args], { cwd: fork });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (d) => (stdout += d));
      child.stderr.on("data", (d) => (stderr += d));
      child.on("close", (status) => done({ status, stdout, stderr }));
    });

  try {
    write("business/profile.md", "---\nrole: partner\nname: Probe\ninvoice: yes\n---\n\nMeins.\n");
    write(
      "business/company.md",
      "---\nlegal_name: Beispiel IT-Service e. K.\naddress: Musterweg 3, 48143 Muenster\n" +
        "country: DE\nphone: 0251 000000\nemail: post@beispiel-it.example\nwebsite:\n" +
        "tax_number:\nvat_id: DE123456789\niban: DE02120300000000202051\npayment_terms: 14\nlogo:\n---\n\nMeins.\n"
    );
    write(
      "customers/probe/customer.md",
      "---\nid: probe\nlegal_name: Probe Metallbau GmbH\nstatus: won\ncontact_person: Frau Berger\n" +
        "street: Industriestrasse 14\npostcode: 48155\ncity: Muenster\ncountry: DE\nvat_id:\n---\n\nMeins.\n"
    );
    write(
      "customers/probe/documents/2026-08-10-angebot.md",
      "# Angebot\n\n## Leistungen\n\n| Pos | Leistung | Menge | Einzelpreis netto | Gesamt netto |\n" +
        "| --- | --- | --- | --- | --- |\n" +
        "| 1 | Einrichtung des Geraets in der Zentrale | 2 | 780,00 Euro | 1.560,00 Euro |\n" +
        "| 2 | Wartung, erstes Jahr | 1 | 960,00 Euro | 960,00 Euro |\n" +
        "| | **Summe netto** | | | **2.520,00 Euro** |\n"
    );

    // 1. Ohne Nummernkreis sagt die Uebersicht, wie einer entsteht.
    let run = await forkTool([]);
    assert(run.status === 0, `Uebersicht fehlgeschlagen: ${run.stderr}`);
    assert(/noch keinen Nummernkreis/.test(run.stdout), "der fehlende Nummernkreis wird nicht benannt");

    // 2. Die erste Rechnung nimmt die Positionen aus dem Angebot der Akte.
    run = await forkTool(["--customer", "probe", "--new", "--date", "2026-08-27", "--service-date", "2026-08-20"]);
    assert(run.status === 0, `Anlegen fehlgeschlagen: ${run.stderr}`);
    assert(/2026-0001/.test(run.stdout), "die erste Nummer ist nicht 2026-0001");
    assert(/2 Positionen aus/.test(run.stdout), `die Positionen kommen nicht aus dem Angebot: ${run.stdout}`);
    assert(/Alle Pflichtangaben stehen/.test(run.stdout), `es fehlt etwas: ${run.stdout}`);
    const beleg = "customers/probe/documents/2026-08-27-rechnung-2026-0001.md";
    assert(existsSync(join(fork, beleg)), "der Beleg ist nicht abgelegt worden");
    assert(/2\.520,00/.test(read(beleg)), "die Summe aus dem Angebot steht nicht im Beleg");
    assert(/478,80/.test(read(beleg)), "die Umsatzsteuer steht nicht im Beleg");
    assert(/2\.998,80/.test(read(beleg)), "der Rechnungsbetrag steht nicht im Beleg");
    assert(/\| 2026-0001 \|/.test(read("business/invoices.md")), "die Nummer steht nicht im Nummernkreis");

    // 3. Die Pruefliste ist gruen und nennt, was sie nicht geprueft hat.
    run = await forkTool(["--check", beleg]);
    assert(run.status === 0, `die Pruefliste ist rot:\n${run.stdout}`);
    assert(!/FEHL/.test(run.stdout), `die Pruefliste ist rot:\n${run.stdout}`);
    assert(/Ungeprüft:/.test(run.stdout), "es wird nicht gesagt, was ungeprueft bleibt");

    // 4. Die zweite Rechnung bekommt die naechste Nummer.
    run = await forkTool([
      "--customer", "probe", "--new", "--date", "2026-08-28", "--service-date", "2026-08-28",
      "--position", "Stoerungsbehebung, Fernwartung|1,5|Stunden|95,00",
    ]);
    assert(run.status === 0, `die zweite Rechnung scheitert: ${run.stderr}`);
    assert(/2026-0002/.test(run.stdout), `die zweite Nummer ist nicht 2026-0002: ${run.stdout}`);
    assert(/142,50/.test(run.stdout), "eine halbe Stunde wird nicht gerechnet");

    // 5. Ein Beleg ohne Pflichtangabe wird nicht gedruckt.
    write(
      "customers/luecke/customer.md",
      "---\nid: luecke\nlegal_name: Ohne Anschrift GmbH\nstatus: won\n---\n\nMeins.\n"
    );
    run = await forkTool(["--customer", "luecke", "--new", "--date", "2026-08-29", "--empty"]);
    assert(run.status === 0, `Anlegen fehlgeschlagen: ${run.stderr}`);
    assert(/Pflichtangaben fehlen noch/.test(run.stdout), "der unvollstaendige Beleg gilt als fertig");
    const halb = "customers/luecke/documents/2026-08-29-rechnung-2026-0003.md";
    run = await forkTool(["--pdf", halb]);
    assert(run.status !== 0, "ein Beleg ohne Pflichtangaben wird gedruckt");
    assert(/wird nicht gedruckt/.test(run.stderr), "es wird nicht gesagt, warum nicht gedruckt wird");
    assert(!existsSync(join(fork, halb.replace(/\.md$/, ".pdf"))), "es ist trotzdem ein PDF entstanden");

    // 6. Eine verworfene Nummer bleibt vergeben.
    run = await forkTool(["--void", "2026-0003", "--reason", "Kunde springt ab"]);
    assert(run.status === 0, `Stornieren fehlgeschlagen: ${run.stderr}`);
    assert(/storniert/.test(read("business/invoices.md")), "die Stornierung steht nicht im Nummernkreis");
    assert(/Kunde springt ab/.test(read("business/invoices.md")), "der Grund fehlt");
    run = await forkTool([]);
    assert(!/Lücke/.test(run.stdout), `der Kreis meldet eine Luecke: ${run.stdout}`);
    assert(/Nächste wäre 2026-0004/.test(run.stdout), "nach einer Stornierung wird die Nummer neu vergeben");

    // 7. Drucken, und der Anhang muss aus dem fertigen PDF zurueckkommen.
    run = await forkTool(["--pdf", beleg]);
    if (/Kein Chromium gefunden/.test(run.stdout + run.stderr)) {
      return "ohne Druck geprueft: kein Chromium auf diesem Rechner";
    }
    assert(run.status === 0, `Druck fehlgeschlagen: ${run.stdout}\n${run.stderr}`);
    const pdf = join(fork, beleg.replace(/\.md$/, ".pdf"));
    assert(existsSync(pdf), "es ist kein PDF entstanden");
    const lage = inspect(readFileSync(pdf));
    assert(lage.attachment?.name === "factur-x.xml", "im PDF steckt keine Rechnungsdatei");
    const geprueft = validateXml(lage.attachment.xml);
    assert(geprueft.ok, `der Anhang im PDF wird beanstandet:\n    ${geprueft.problems.join("\n    ")}`);
    assert(/2026-0001/.test(lage.attachment.xml), "im Anhang steht die Rechnungsnummer nicht");
    assert(/2998.80/.test(lage.attachment.xml), "im Anhang steht der Rechnungsbetrag nicht");
    assert(/gestellt/.test(read("business/invoices.md")), "der Nummernkreis fuehrt den Beleg nicht als gestellt");

    // Das Papier und der Anhang muessen dieselbe Zahl nennen. Genau dafuer gibt
    // es nur eine Tabelle und keinen zweiten Datensatz daneben.
    run = await forkTool(["--validate", beleg.replace(/\.md$/, ".pdf")]);
    assert(run.status === 0, `die fertige Rechnung wird beanstandet:\n${run.stdout}`);
    assert(/PDF\/A-3B gesetzt/.test(run.stdout), "die Kennzeichnung als PDF/A-3B fehlt");
    return "zwei Nummern, eine Stornierung, ein PDF mit Anhang";
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

// --- Das Papier -------------------------------------------------------------

check("Kein Absender von Arasul im Papier des Partners", () => {
  // Am 25.08.2026 trugen vier Vorlagen Arasuls USt-IdNr., Anschrift und
  // Unterschrift. Gefunden hat das ein Mensch von Hand, kein Test. Diese
  // Prüfung ersetzt den Menschen, damit der Fehler nicht mit der nächsten
  // Vorlage zurückkehrt.
  //
  // Sie geht über den Inhalt, nicht über Dateinamen: eine Vorlage, die ein
  // Partner selbst dazulegt, wird genauso geprüft.
  const markers = [
    [/DE352463063/i, "USt-IdNr. von Arasul"],
    [/Seitenstra(?:ss|ß)e\s*1\b/i, "Anschrift von Arasul"],
    [/kolja\.schoepe/i, "E-Mail-Adresse von Kolja Schoepe"],
    [/Kolja\s+Sch/i, "Kolja Schoepe als Unterzeichner"],
  ];

  // Ausgenommen, weil dort Arasul die sprechende Partei ist und beide Orte aus
  // Arasuls Steuerungsordner gespiegelt werden: .ara/vorlagen/bausteine/ und
  // .ara/nachweise/. Letzteres wird hier gar nicht betreten.
  const mirrored = new Set(["bausteine"]);

  // **Die eine begründete Ausnahme.** .ara/vorlagen/endkundenbedingungen.md nennt
  // Arasul samt Inhaber und Anschrift als Hersteller der Software. Das muss
  // dort stehen: sonst weiß der Endkunde nicht, wessen Haftungsbegrenzung für
  // ihn gilt, und Ziffer 6 gilt ausdrücklich auch zugunsten des Herstellers.
  // Die Ausnahme wird benannt, nicht stillschweigend übersprungen, und sie
  // gilt nur für den Satz, der den Hersteller nennt.
  const EXCEPTION_FILE = "endkundenbedingungen.md";
  const EXCEPTION_ANCHOR = /Hersteller der Software ist Arasul/;
  let exceptionUsed = false;
  if (!PARTNER_MATERIAL) return OHNE_PARTNERWARE;

  const offenders = [];
  const scan = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!mirrored.has(entry.name)) scan(join(dir, entry.name));
        continue;
      }
      if (!/\.md$/.test(entry.name)) continue;
      const path = join(dir, entry.name);
      // Blockkommentare fallen weg, ihre Zeilen bleiben leer stehen: sonst
      // zieht der Kopf einer Funktion die Ausgabezeile darueber mit hinein.
      const source = readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, (block) =>
        block.replace(/[^\n]/g, " ")
      );
      const lines = source.split(/\r?\n/);
      lines.forEach((line, index) => {
        for (const [pattern, what] of markers) {
          if (!pattern.test(line)) continue;
          // Der Herstellersatz laeuft ueber mehrere Zeilen, darum das Umfeld.
          const context = lines.slice(Math.max(0, index - 2), index + 1).join(" ");
          if (entry.name === EXCEPTION_FILE && EXCEPTION_ANCHOR.test(context)) {
            exceptionUsed = true;
            continue;
          }
          offenders.push(`${relative(ROOT, path)}:${index + 1} ${what}`);
        }
      });
    }
  };
  scan(join(ROOT, ".ara", "vorlagen"));

  assert(
    offenders.length === 0,
    `Arasuls Absender im Papier des Partners:\n    ${offenders.join("\n    ")}`
  );
  // Eine Ausnahme, die nichts mehr abdeckt, gehoert weg statt stehenzubleiben.
  assert(
    exceptionUsed,
    `die Ausnahme fuer ${EXCEPTION_FILE} greift nicht mehr, entweder ist der ` +
      "Herstellersatz weg oder er ist umformuliert. Pruefen und die Ausnahme anpassen"
  );
  return "1 begruendete Ausnahme: der Hersteller in den Endkundenbedingungen";
});

check("PDF-Werkzeug haelt Platzhalter zurueck und druckt sonst", () => {
  // Der Zweck des Werkzeugs ist, dass kein Angebot mit "{Betrag} Euro" beim
  // Kunden landet. Also wird genau das geprüft.
  if (!PARTNER_MATERIAL) return OHNE_PARTNERWARE;
  let run = tool("pdf.mjs", [join(ROOT, ".ara", "vorlagen", "angebot.md"), "--check"]);
  assert(run.status !== 0, "ungefuellte Platzhalter fuehren nicht zum Abbruch");
  assert(/\{Betrag\}/.test(run.stderr), "die gefundenen Platzhalter werden nicht benannt");

  const dir = mkdtempSync(join(tmpdir(), "ara-pdf-test-"));
  const file = join(dir, "probe.md");
  try {
    // Ein Platzhalter mit Zeilenumbruch darin. Genau diese Sorte sind die
    // laengsten in den Vorlagen, und eine Suche je Zeile findet sie nicht.
    writeFileSync(file, "# Probe\n\n{Ein Platzhalter, der\nueber zwei Zeilen geht}\n");
    run = tool("pdf.mjs", [file, "--check"]);
    assert(run.status !== 0, "umgebrochener Platzhalter wird nicht gefunden");

    // Ohne Platzhalter muss wirklich ein PDF entstehen.
    writeFileSync(
      file,
      "# Probe\n\nEin Satz.\n\nZeile eins\\\nZeile zwei\n\n" +
        "| A | B |\n| --- | --- |\n| 1 | 2 |\n\n```\nein befehl\n```\n"
    );
    const target = join(dir, "probe.pdf");
    run = tool("pdf.mjs", [file, "--out", target]);
    if (/Kein Chromium gefunden/.test(run.stderr)) {
      return "Pruefung lief, gedruckt nicht: kein Chromium auf diesem Rechner";
    }
    assert(run.status === 0, `Druck fehlgeschlagen: ${run.stderr || run.stdout}`);
    assert(existsSync(target), "es ist kein PDF entstanden");
    const head = readFileSync(target).subarray(0, 5).toString("latin1");
    assert(head === "%PDF-", `die erzeugte Datei ist kein PDF, sie beginnt mit "${head}"`);
    return "geprueft und gedruckt";
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

check("PDF-Werkzeug trennt Tabellenzellen nur am unmaskierten Strich", () => {
  // Am 26.08.2026 zerlegte ein unmaskierter Strich in .ara/nachweise/datenverarbeitung.md
  // eine zweispaltige Zeile in vier Spalten. Die Quelle ist berichtigt und schreibt
  // jetzt \|. Das half im Steuerungsordner nichts, weil dessen Druckwerkzeug an jedem
  // Strich trennte. Diese Pruefung haelt fest, dass pdf.mjs das nicht tut.
  const dir = mkdtempSync(join(tmpdir(), "ara-pdf-tabelle-"));
  const file = join(dir, "tabelle.md");
  try {
    writeFileSync(
      file,
      "# Probe\n\n| Feld | Wert |\n| --- | --- |\n" +
        "| Fernwartungszugang | direkt \\| Vermittlungsnetz \\| nicht eingerichtet |\n"
    );
    const html = join(dir, "tabelle.html");
    const run = tool("pdf.mjs", [file, "--html", "--out", html]);
    assert(run.status === 0, `HTML-Ausgabe fehlgeschlagen: ${run.stderr || run.stdout}`);

    const body = readFileSync(html, "utf8").match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? "";
    const columns = (body.match(/<td>/g) || []).length;
    assert(columns === 2, `die Zeile zerfaellt in ${columns} Zellen statt zwei`);
    assert(
      /direkt \| Vermittlungsnetz \| nicht eingerichtet/.test(body),
      "der maskierte Strich steht nicht als Strich in der Zelle"
    );
    assert(!/\\/.test(body), "der Rueckstrich der Maskierung wuerde mitgedruckt");
    return "zwei Zellen, Striche im Text erhalten";
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- Die Firmenwurzel ----------------------------------------------------------

/**
 * Eine Wurzel entsteht ausserhalb des Kits, also in einem Wegwerfordner. Was hier
 * laeuft, ist das Werkzeug selbst und danach die Skripte der Wurzel, mit ihrem
 * eigenen Node-Aufruf: genau so, wie ein Mensch sie nach dem Anlegen aufruft.
 */
const WURZEL_ORDNER = [];
process.on("exit", () => WURZEL_ORDNER.forEach((dir) => rmSync(dir, { recursive: true, force: true })));
function wegwerfordner(vorsilbe) {
  const dir = mkdtempSync(join(tmpdir(), vorsilbe));
  WURZEL_ORDNER.push(dir);
  return dir;
}

function wurzel(args, { git = false } = {}) {
  const dir = wegwerfordner("ara-root-");
  const root = join(dir, "haus");
  const run = tool("root.mjs", ["--path", root, ...args, ...(git ? [] : ["--no-git"])], "");
  return { dir, root, run };
}

function inWurzel(root, script, args = [], input) {
  return spawnSync("node", [join(root, ".claude", script), ...args], { cwd: root, encoding: "utf8", input });
}

/** Alle Dateien eines Baums, relativ, ohne .git. */
function dateien(dir, base = dir) {
  const out = [];
  for (const eintrag of readdirSync(dir, { withFileTypes: true })) {
    if (eintrag.name === ".git") continue;
    const pfad = join(dir, eintrag.name);
    if (eintrag.isDirectory()) out.push(...dateien(pfad, base));
    else out.push(relative(base, pfad));
  }
  return out.sort();
}

for (const lang of ["en", "de"]) {
  check(`Eine frische Firmenwurzel ist nur das Gerüst und ohne Befund (${lang})`, () => {
    const lokal = wegwerfordner("ara-ort-");
    const start = Date.now();
    const { root, run } = wurzel([
      "--name", "Probehaus", "--language", lang, "--folders", "sales,product=what we build",
      "--place", "api", "--kind", "github", "--where", "https://github.com/example/api",
      "--local", lokal, "--purpose", "probe",
    ]);
    assert(run.status === 0, `root.mjs endet mit ${run.status}: ${run.stderr || run.stdout}`);
    const sekunden = (Date.now() - start) / 1000;
    // Die Abnahme sagt "unter 30 Minuten". Das Werkzeug ist davon der kleinste
    // Teil, der Rest ist das Interview. Braucht es selbst laenger als eine
    // halbe Minute, stimmt etwas nicht.
    assert(sekunden < 30, `das Anlegen hat ${sekunden.toFixed(1)} Sekunden gedauert`);

    const fehlt = [...ROOT_TARGETS].filter((ziel) => !existsSync(join(root, ziel)));
    assert(fehlt.length === 0, `in der frischen Wurzel fehlt: ${fehlt.join(", ")}`);
    for (const ziel of ["CLAUDE.md", "skills", "agents", "places.json", "scripts/check.mjs"]) {
      assert(existsSync(join(root, ".claude", ziel)), `.claude/${ziel} fehlt im Gerüst`);
    }
    // Die Ebene 1 nennt das Haus, das Gerüst bringt keinen eigenen Ordner mit.
    const oben = readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory() && e.name !== ".git" && e.name !== ".claude").map((e) => e.name).sort();
    assert(oben.join() === "product,sales", `Ordner oben: ${oben.join()}, erwartet sind genau die genannten`);
    for (const ordner of ROOT_FOLDERS) {
      assert(!existsSync(join(root, ordner)), `Ordner ${ordner}/ der Methode liegt im Gerüst`);
    }
    assert(!existsSync(join(root, ".claude", "scripts", "cards.mjs")), "das Kartenwerkzeug liegt im Gerüst");

    // Nichts im Baum wirkt von selbst: keine settings.json, kein scharfer Hook.
    const alle = dateien(root);
    const scharf = alle.filter((datei) => /(^|\/)settings(\.local)?\.json$/.test(datei) || /^\.claude\/hooks\//.test(datei));
    assert(scharf.length === 0, `im Baum liegt etwas, das von selbst wirken kann: ${scharf.join(", ")}`);
    for (const datei of alle.filter((d) => d.endsWith(".json"))) {
      assert(!/"hooks"\s*:/.test(readFileSync(join(root, datei), "utf8")), `${datei} trägt einen Hook, der von selbst wirken könnte`);
    }

    const regeln = readFileSync(join(root, ".claude", "CLAUDE.md"), "utf8");
    assert(/^# Probehaus$/m.test(regeln), "die Regeln tragen den Namen des Hauses nicht");
    assert(
      lang === "de" ? /## Wo die Wahrheit steht/.test(regeln) && /## Wohin Neues gehört/.test(regeln)
        : /## Where the truth stands/.test(regeln) && /## Where new things go/.test(regeln),
      "die Wahrheitstabelle oder die Tabelle für Neues fehlt in den Regeln"
    );
    assert(/\| what we build \| `product\/` \|/.test(regeln) && /`sales\/`/.test(regeln), "die Ordner der Ebene 1 stehen nicht in der Tabelle");
    assert(!/\{\{[a-z_+\-0-9]+\}\}/.test(regeln), "in den Regeln steht ein ungefüllter Platzhalter");
    assert(!/company\/|roadmap\/|cards\.mjs/.test(regeln), "das Gerüst spricht von der Methode");

    // Der Vorschlag: Regeln mit {root}, kein ./ (eine Regel im Nutzerordner gilt von jedem Ordner aus).
    const vorschlag = JSON.parse(readFileSync(join(root, ".claude", "proposal", "proposal.json"), "utf8"));
    const regelListe = [...vorschlag.permissions.allow, ...vorschlag.permissions.deny];
    assert(!regelListe.some((r) => /\(\.\//.test(r)), "eine Regel des Vorschlags hängt an ./ und gilt nur aus dem Wurzelordner");
    assert(vorschlag.permissions.deny.includes(`Edit(/${lokal}/**)`), "der Ort ist im Vorschlag nicht gegen Schreiben gesperrt");
    assert(vorschlag.permissions.additionalDirectories.includes(lokal), "der Ort steht nicht unter additionalDirectories");
    assert(!vorschlag.permissions.deny.some((r) => /archive/.test(r)), "das Gerüst friert ein Archiv ein, das es nicht hat");
    assert(vorschlag.hook.script === "boundary.mjs" && /Bash/.test(vorschlag.hook.matcher), "der Hook im Vorschlag hängt nicht vor Shell und Schreiben");

    const orte = JSON.parse(readFileSync(join(root, ".claude", "places.json"), "utf8")).places;
    assert(orte.length === 1 && orte[0].name === "api" && orte[0].where.startsWith("https://"), "die Liste der Orte stimmt nicht");
    // Ein Verweis, nie eine Kopie: vom Ort liegt in der Wurzel nichts.
    assert(!existsSync(join(root, "api")) && !existsSync(join(root, "roadmap")), "der Ort liegt in der Wurzel");

    const pruefung = inWurzel(root, "scripts/check.mjs");
    assert(pruefung.status === 0, `das Prüfskript der frischen Wurzel meldet:\n${pruefung.stdout}`);
    assert(
      (lang === "de" ? /17 Prüfungen, kein Befund/ : /17 checks, no finding/).test(pruefung.stdout),
      `das Prüfskript spricht nicht ${lang}: ${pruefung.stdout}`
    );
    const faelle = inWurzel(root, "proposal/boundary-test.mjs");
    assert(faelle.status === 0, `die Fälle der Grenze fallen im Gerüst:\n${faelle.stderr || faelle.stdout}`);
    return `${ROOT_TARGETS.size} Dateien, ${sekunden.toFixed(1)} s, 17 Prüfungen ohne Befund`;
  });
}

for (const lang of ["en", "de"]) {
  check(`Die Methode ist ein Zusatz: mit dem Gerüst oder später, ohne dass etwas bricht (${lang})`, () => {
    // Angelegt mit --method, und nachgerüstet in ein Gerüst: dieselben Dateien.
    const fresh = wurzel(["--name", "Probehaus", "--language", lang, "--folders", "sales", "--method"]);
    assert(fresh.run.status === 0, `mit --method: ${fresh.run.stderr || fresh.run.stdout}`);
    const fehlt = [...ROOT_TARGETS, ...METHOD_TARGETS].filter((ziel) => !existsSync(join(fresh.root, ziel)));
    assert(fehlt.length === 0, `mit der Methode fehlt: ${fehlt.join(", ")}`);
    for (const ordner of ROOT_FOLDERS) assert(existsSync(join(fresh.root, ordner)), `Ordner ${ordner}/ fehlt`);
    for (const spalte of ["new", "ready", "running", "done"]) {
      assert(existsSync(join(fresh.root, "roadmap", "backlog", spalte)), `Spalte ${spalte}/ des Kartenstapels fehlt`);
    }
    const settings = dateien(fresh.root).filter((d) => /(^|\/)settings(\.local)?\.json$/.test(d));
    assert(settings.length === 0, `mit der Methode liegt eine settings.json im Baum: ${settings.join(", ")}`);
    const vorschlag = JSON.parse(readFileSync(join(fresh.root, ".claude", "proposal", "proposal.json"), "utf8"));
    assert(vorschlag.permissions.deny.includes("Edit({root}/archive/**)"), "das Archiv ist mit der Methode nicht eingefroren");
    const lauf = inWurzel(fresh.root, "scripts/check.mjs");
    assert(lauf.status === 0, `das Prüfskript mit der Methode meldet:\n${lauf.stdout}`);

    const spaeter = wurzel(["--name", "Probehaus", "--language", lang, "--folders", "sales"]);
    assert(spaeter.run.status === 0, `Gerüst: ${spaeter.run.stderr || spaeter.run.stdout}`);
    const ort = wegwerfordner("ara-ort-");
    const nach = tool("root.mjs", ["--path", spaeter.root, "--place", "api", "--kind", "folder", "--where", ort, "--local", ort, "--purpose", "probe"], "");
    assert(nach.status === 0, `Ort ins Gerüst: ${nach.stderr || nach.stdout}`);
    assert(!existsSync(join(spaeter.root, "roadmap")), "ein Ort im Gerüst legt ein Blatt unter roadmap/ an");
    const eigen = "Eigener Satz des Hauses in den Regeln.\n";
    appendFileSync(join(spaeter.root, ".claude", "CLAUDE.md"), eigen);
    const dazu = tool("root.mjs", ["--path", spaeter.root, "--method"], "");
    assert(dazu.status === 0, `--method an einer bestehenden Wurzel endet mit ${dazu.status}: ${dazu.stderr || dazu.stdout}`);
    const regeln = readFileSync(join(spaeter.root, ".claude", "CLAUDE.md"), "utf8");
    assert(regeln.includes(eigen), "das Nachrüsten hat einen Satz des Hauses in den Regeln überschrieben");
    assert(/company\//.test(regeln), "die Regeln der Methode sind nicht angehängt");
    assert(existsSync(join(spaeter.root, "roadmap", "api.md")), "der Ort hat nach dem Nachrüsten kein Blatt");
    const vorher = [...ROOT_TARGETS, ...METHOD_TARGETS].filter((ziel) => !existsSync(join(spaeter.root, ziel)));
    assert(vorher.length === 0, `nach dem Nachrüsten fehlt: ${vorher.join(", ")}`);
    const nachher = inWurzel(spaeter.root, "scripts/check.mjs");
    assert(nachher.status === 0, `das Prüfskript nach dem Nachrüsten meldet:\n${nachher.stdout}`);
    assert(tool("root.mjs", ["--path", spaeter.root, "--method"], "").status !== 0, "die Methode lässt sich zweimal anlegen");

    // Ein Ordner des Hauses, der so heißt wie ein Ordner der Methode, wird nicht überschrieben.
    const belegt = wurzel(["--name", "Probehaus", "--language", lang]);
    mkdirSync(join(belegt.root, "customers"));
    writeFileSync(join(belegt.root, "customers", "meins.md"), "bleibt");
    const kollision = tool("root.mjs", ["--path", belegt.root, "--method"], "");
    assert(kollision.status !== 0 && !existsSync(join(belegt.root, "roadmap")), "die Methode wird in eine Wurzel gelegt, deren Ordner sie überschriebe");
    assert(readFileSync(join(belegt.root, "customers", "meins.md"), "utf8") === "bleibt", "ein Ordner des Hauses wurde überschrieben");
    return "mit --method und später nachgerüstet, dieselben Dateien, Prüfskript ohne Befund";
  });
}

check("Nichts Arasul-Eigenes steckt in einer Firmenwurzel", () => {
  // Die Vorlage soll eine zweite Organisation tragen. Steht in ihr ein Name,
  // ein Preis oder ein Ziel des Hauses, aus dem sie stammt, traegt sie nur das.
  // Der Name des Werkzeugs, mit dem sie angelegt wurde, darf in der README stehen.
  const eigen = /arasul|kolja|schöpe|lissabon|\borin\b|jetson|dresden|unit.?ix|\b\d[\d.]*\s*(euro|eur|€)/i;
  const funde = [];
  for (const lang of ["en", "de"]) {
    for (const args of [["--name", "Probehaus", "--folders", "sales"], ["--name", "Probehaus", "--method"], ["--example"]]) {
      const { root, run } = wurzel([...args, "--language", lang]);
      assert(run.status === 0, `root.mjs ${args.join(" ")} endet mit ${run.status}: ${run.stderr || run.stdout}`);
      const scan = (dir) => {
        for (const eintrag of readdirSync(dir, { withFileTypes: true })) {
          const pfad = join(dir, eintrag.name);
          if (eintrag.isDirectory()) scan(pfad);
          else {
            readFileSync(pfad, "utf8").split(/\r?\n/).forEach((zeile, i) => {
              // Die Brücke zu den Apps trägt den Namen des Produkts, das ist ihr Zweck: die Datei, ihr
              // Skill und jede Nennung von beiden in Regeln, Vorschlag und Prüfskript.
              if (/^arasul\.mjs$|^\.claude\/skills\/arasul\//.test(relative(root, pfad))) return;
              if (eigen.test(zeile.replace(/arasul\.mjs|`arasul`|skills\/arasul|\.config\/arasul/g, ""))) funde.push(`${lang} ${relative(root, pfad)}:${i + 1}: ${zeile.trim().slice(0, 80)}`);
            });
          }
        }
      };
      scan(root);
    }
  }
  assert(funde.length === 0, `Arasul-Eigenes in der Wurzel:\n    ${funde.slice(0, 8).join("\n    ")}`);
});

for (const lang of ["en", "de"]) {
  check(`Die Vorzeigefassung liegt bei, und ihr Prüfskript findet nichts (${lang})`, () => {
    const { root, run } = wurzel(["--example", "--language", lang], { git: true });
    assert(run.status === 0, `root.mjs --example endet mit ${run.status}: ${run.stderr || run.stdout}`);
    const pruefung = inWurzel(root, "scripts/check.mjs");
    assert(pruefung.status === 0, `das Prüfskript meldet in der Vorzeigefassung:\n${pruefung.stdout}`);

    // Gefuellt, nicht nur angelegt: Meilensteine, Ziele, Karten in jeder
    // Spalte, ein Experiment, ein Kunde, Orte beider Arten.
    const ziel = readFileSync(join(root, "company", "goal.md"), "utf8");
    assert((ziel.match(/^\| M\d+ \|/gm) || []).length >= 3, "die Vorzeigefassung hat keine drei Meilensteine");
    assert(!/<[^>\n]+>/.test(ziel.replace(/<!--[\s\S]*?-->/g, "")), "im Nordziel der Vorzeigefassung steht noch ein Platzhalter");
    for (const spalte of ["new", "ready", "running", "done"]) {
      const karten = readdirSync(join(root, "roadmap", "backlog", spalte)).filter((n) => n.endsWith(".md"));
      assert(karten.length >= 1, `in ${spalte}/ der Vorzeigefassung liegt keine Karte`);
    }
    // Die Vorzeigefassung folgt dem Gerüst: Ordner der Ebene 1, nichts, das von selbst wirkt.
    for (const ordner of ["sales", "quality"]) assert(existsSync(join(root, ordner)), `Ordner ${ordner}/ der Ebene 1 fehlt in der Vorzeigefassung`);
    const regelnZeigen = readFileSync(join(root, ".claude", "CLAUDE.md"), "utf8");
    assert(/`sales\/`/.test(regelnZeigen) && /`quality\/`/.test(regelnZeigen), "die Ordner der Ebene 1 stehen nicht in der Tabelle der Vorzeigefassung");
    assert(!dateien(root).some((d) => /(^|\/)settings(\.local)?\.json$/.test(d)), "in der Vorzeigefassung liegt eine settings.json");
    const orte = JSON.parse(readFileSync(join(root, ".claude", "places.json"), "utf8")).places;
    assert(orte.some((o) => o.kind === "github") && orte.some((o) => o.kind === "folder" && /sharepoint/.test(o.where)),
      "die Vorzeigefassung zeigt nicht beide Arten von Orten");
    assert(orte.some((o) => o.write === "yes") && orte.some((o) => o.local && o.write !== "yes"),
      "die Vorzeigefassung zeigt nicht beide Fälle des Schreibrechts");
    // Kein Datum steht fest im Geruest: sonst ist sie in sechzig Tagen ein
    // Befund ihres eigenen Pruefskripts.
    const fest = [];
    const scan = (dir) => {
      for (const eintrag of readdirSync(dir, { withFileTypes: true })) {
        const pfad = join(dir, eintrag.name);
        if (eintrag.isDirectory()) scan(pfad);
        else if (/\b20\d\d-\d\d-\d\d\b/.test(readFileSync(pfad, "utf8"))) fest.push(relative(ROOT, pfad));
      }
    };
    scan(ROOT_EXAMPLE);
    assert(fest.length === 0, `festes Datum in der Vorzeigefassung: ${fest.join(", ")}`);

    const log = spawnSync("git", ["log", "--oneline"], { cwd: root, encoding: "utf8" });
    const status = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });
    // Ohne eingerichtetes Git (kein Name, keine Adresse) gibt es keinen Commit,
    // und das Werkzeug sagt es. Das ist kein Fehler des Geruests.
    if (log.status === 0 && log.stdout.trim()) {
      assert(status.stdout.trim() === "", `nach dem ersten Commit ist die Wurzel nicht sauber:\n${status.stdout}`);
    } else {
      assert(/git/.test(run.stdout), "kein Commit, und das Werkzeug sagt nichts dazu");
    }
    return `${orte.length} Orte, Karten in vier Spalten`;
  });
}

check("Das Prüfskript einer Wurzel ist scharf: jeder eingebaute Fehler wird ein Befund", () => {
  // Ein Pruefskript, das nichts findet, beweist allein nichts: es koennte
  // auch blind sein. Je Pruefung ein Fehler, wie er in einer Wurzel wirklich
  // entsteht, und genau diese Pruefung muss ihn melden.
  const { root, run } = wurzel(["--example", "--language", "de"]);
  assert(run.status === 0, `root.mjs --example endet mit ${run.status}: ${run.stderr || run.stdout}`);
  const datei = (...teile) => join(root, ...teile);
  const ersetze = (pfad, von, nach) => {
    const text = readFileSync(pfad, "utf8");
    assert(von instanceof RegExp ? von.test(text) : text.includes(von), `${relative(root, pfad)} enthält ${von} nicht, der Testfall greift ins Leere`);
    writeFileSync(pfad, text.replace(von, nach));
  };
  const faelle = [
    [1, () => appendFileSync(datei("company", "core.md"), "\nSiehe `company/gibt-es-nicht.md`.\n")],
    [3, () => ersetze(datei("company", "risks.md"), /Stand: \d{4}-\d\d-\d\d/, "Stand: 2020-01-01")],
    [4, () => appendFileSync(datei("company", "follow-ups.md"), `| ${day(3)} | Zeile mit falschem Status | x | vielleicht |\n`)],
    [5, () => appendFileSync(datei("company", "core.md"), "\nPasswort: hunter2-geheim\n")],
    [6, () => ersetze(datei("roadmap", "shop-floor-app.md"), /\| M2 \| \d{4}-\d\d-\d\d \|/, "| M9 | bald |")],
    [7, () => ersetze(datei("company", "follow-ups.md"), "H1:", "Ohne Bezug:")],
    [8, () => cpSync(datei("roadmap", "backlog", "ready", "calculation-by-a-third-person.md"), datei("roadmap", "backlog", "running", "zweite-karte.md"))],
    [9, () => mkdirSync(datei("experiments", "002-ohne-blatt"))],
    [10, () => mkdirSync(datei("notizen"))],
    [11, () => {
      // Ein Ort, der als Kopie in der Wurzel liegt, und einer, dessen Sperre
      // jemand aus den Rechten genommen hat.
      const liste = JSON.parse(readFileSync(datei(".claude", "places.json"), "utf8"));
      liste.places.push({ name: "kopie", kind: "folder", where: "https://example.sharepoint.com/sites/kopie", local: "templates/kopie", purpose: "probe" });
      writeFileSync(datei(".claude", "places.json"), JSON.stringify(liste, null, 2));
      mkdirSync(datei("templates", "kopie"));
    }],
    [12, () => appendFileSync(datei("customers", "lindholm-pumps", "customer.md"), "\n[Protokoll](documents/fehlt.md)\n")],
    [13, () => ersetze(datei(".claude", "proposal", "boundary.mjs"), "if (place) {", "if (false) {")],
    [14, () => {
      // Eine settings.json in einem Ordner der Ebene 1, und eine lokale in der Wurzel selbst.
      mkdirSync(datei("sales", ".claude"), { recursive: true });
      writeFileSync(datei("sales", ".claude", "settings.json"), "{}\n");
      writeFileSync(datei(".claude", "settings.local.json"), "{}\n");
    }],
    [15, () => writeFileSync(datei("sales", ".env"), "TOKEN=abc\n")],
    [16, () => {
      // Ein Ordner der Ebene 1 verweist auf seinen Nachbarn.
      writeFileSync(datei("sales", "notes.md"), "Siehe [Prüfung](../quality/README.md).\n");
      writeFileSync(datei("quality", "README.md"), "Prüfungen des Hauses.\n");
      // Und die Regeln der Wurzel nennen etwas in einem Ordner, statt den Ordner.
      appendFileSync(datei(".claude", "CLAUDE.md"), "\nDas Verfahren steht in `quality/README.md`.\n");
    }],
    [17, () => {
      mkdirSync(datei("quality", "tool"), { recursive: true });
      writeFileSync(datei("quality", "tool", "package.json"), "{}\n");
    }],
  ];
  for (const [nr, fehler] of faelle) {
    const sicherung = mkdtempSync(join(tmpdir(), "ara-root-stand-"));
    cpSync(root, sicherung, { recursive: true });
    fehler();
    const lauf = inWurzel(root, "scripts/check.mjs");
    rmSync(root, { recursive: true, force: true });
    cpSync(sicherung, root, { recursive: true });
    rmSync(sicherung, { recursive: true, force: true });
    assert(lauf.status === 1, `Fehler für Prüfung ${nr} eingebaut, das Prüfskript endet mit ${lauf.status}`);
    assert(new RegExp(`Prüfung ${nr}: \\d+ Befund`).test(lauf.stdout), `Fehler für Prüfung ${nr} eingebaut, gemeldet wird:\n${lauf.stdout}`);
  }
  const danach = inWurzel(root, "scripts/check.mjs");
  assert(danach.status === 0, `nach dem Zurücksetzen meldet das Prüfskript:\n${danach.stdout}`);
  return `${faelle.length} eingebaute Fehler, jeder von seiner Prüfung gemeldet`;
});

check("Die Grenze einer Wurzel hält, und ein Ort lässt sich nachtragen", () => {
  const lokal = wegwerfordner("ara-ort-");
  const { root, run } = wurzel(["--name", "Probehaus", "--language", "de"]);
  assert(run.status === 0, `root.mjs endet mit ${run.status}: ${run.stderr || run.stdout}`);

  const faelle = inWurzel(root, "proposal/boundary-test.mjs");
  assert(faelle.status === 0, `die Fälle der Grenze fallen:\n${faelle.stderr || faelle.stdout}`);
  const anzahl = Number((faelle.stdout.match(/^(\d+) cases/m) || [])[1]);
  assert(anzahl >= 30, `die Grenze hat nur ${anzahl} Fälle`);

  // Von Hand eingetragene Regeln im Vorschlag ueberleben das Nachtragen eines Ortes.
  const vorschlagDatei = join(root, ".claude", "proposal", "proposal.json");
  const vorschlag = JSON.parse(readFileSync(vorschlagDatei, "utf8"));
  vorschlag.permissions.allow.push("Bash(make:*)");
  writeFileSync(vorschlagDatei, JSON.stringify(vorschlag, null, 2));

  const nach = tool("root.mjs", ["--path", root, "--place", "docs", "--kind", "folder", "--where", lokal, "--local", lokal, "--purpose", "probe"], "");
  assert(nach.status === 0, `--place an einer bestehenden Wurzel endet mit ${nach.status}: ${nach.stderr || nach.stdout}`);
  assert(/Ort 'docs' eingetragen/.test(nach.stdout), `die Wurzel ist deutsch, das Werkzeug antwortet: ${nach.stdout}`);
  const neu = JSON.parse(readFileSync(vorschlagDatei, "utf8"));
  assert(neu.permissions.allow.includes("Bash(make:*)"), "das Nachtragen hat eine von Hand eingetragene Regel entfernt");
  assert(neu.permissions.deny.includes(`Edit(/${lokal}/**)`), "der nachgetragene Ort ist nicht gesperrt");
  assert(!existsSync(join(root, ".claude", "settings.json")), "das Nachtragen hat eine settings.json angelegt");

  // Und die Grenze kennt ihn sofort, ohne dass jemand den Hook anfasst.
  const hook = (ereignis) => inWurzel(root, "proposal/boundary.mjs", [], JSON.stringify(ereignis));
  const zu = hook({ tool_name: "Write", tool_input: { file_path: join(lokal, "x.md") } });
  assert(zu.status === 2 && /docs/.test(zu.stderr), `Schreiben in den Ort geht durch: ${zu.status} ${zu.stderr}`);
  assert(!/roadmap/.test(zu.stderr), "der Hinweis nennt ein Blatt unter roadmap/, das ohne die Methode nicht existiert");
  const shell = hook({ tool_name: "Bash", tool_input: { command: `cd ${lokal} && touch x.md` } });
  assert(shell.status === 2, "cd in den Ort und dann touch geht durch");
  const lesen = hook({ tool_name: "Bash", tool_input: { command: `ls ${lokal} && git -C ${lokal} log` } });
  assert(lesen.status === 0, `Lesen im Ort wird abgewiesen: ${lesen.stderr}`);
  const hier = hook({ tool_name: "Write", tool_input: { file_path: join(root, "README.md") } });
  assert(hier.status === 0, "Schreiben in der Wurzel selbst wird abgewiesen");
  // Wo die Sitzung gestartet ist, entscheidet: im Ort selbst und anderswo ist der Hook still.
  const imOrt = hook({ tool_name: "Write", tool_input: { file_path: join(lokal, "x.md") }, cwd: lokal });
  assert(imOrt.status === 0, "eine Sitzung im Ort selbst wird an ihrem eigenen Schreiben gehindert");
  const anderswo = hook({ tool_name: "Write", tool_input: { file_path: join(lokal, "x.md") }, cwd: tmpdir() });
  assert(anderswo.status === 0, "eine Sitzung in einem fremden Ordner wird vom Hook der Wurzel angehalten");
  const eineTiefer = hook({ tool_name: "Write", tool_input: { file_path: join(lokal, "x.md") }, cwd: join(root, ".claude") });
  assert(eineTiefer.status === 2, "eine Sitzung eine Ebene tiefer wird nicht angehalten");

  const doppelt = tool("root.mjs", ["--path", root, "--place", "docs", "--kind", "folder", "--where", lokal, "--purpose", "probe"], "");
  assert(doppelt.status !== 0, "derselbe Ort lässt sich zweimal eintragen");
  return `${anzahl} Fälle, Ort nachgetragen, Regeln von Hand bleiben`;
});

check("Skripte sind überall erlaubt und kein Befund, ein Projekt schon", () => {
  const { root, run } = wurzel(["--name", "Probehaus", "--language", "en", "--folders", "sales,quality"]);
  assert(run.status === 0, `root.mjs endet mit ${run.status}: ${run.stderr || run.stdout}`);
  // Einzelne Skripte in jeder Ebene und Sprache, auch tief, auch mit einer Lieferdatei daneben.
  mkdirSync(join(root, "sales", "tools", "deep"), { recursive: true });
  writeFileSync(join(root, "sales", "export.py"), "print('x')\n");
  writeFileSync(join(root, "sales", "run.sh"), "echo x\n");
  writeFileSync(join(root, "sales", "tools", "deep", "sync.mjs"), "console.log(1);\n");
  writeFileSync(join(root, "quality", "report.js"), "console.log(2);\n");
  writeFileSync(join(root, "quality", "notes.md"), "Notizen.\n");
  writeFileSync(join(root, "quality", ".env.example"), "KEY=\n");
  const still = inWurzel(root, "scripts/check.mjs");
  assert(still.status === 0, `Skripte und eine .env.example sind ein Befund:\n${still.stdout}`);
  // Ein Projekt daneben ist einer.
  mkdirSync(join(root, "quality", "app", "src"), { recursive: true });
  writeFileSync(join(root, "quality", "app", "src", "main.py"), "print(3)\n");
  const laut = inWurzel(root, "scripts/check.mjs");
  assert(laut.status === 1 && /Prüfung 17|Check 17/.test(laut.stdout), `ein Quelltextbaum ist kein Befund:\n${laut.stdout}`);
  assert(!/export\.py|run\.sh|sync\.mjs|report\.js/.test(laut.stdout), `ein Skript wird gemeldet:\n${laut.stdout}`);
  return "vier Skripte in drei Tiefen ohne Befund, ein Quelltextbaum ein Befund";
});

check("root.mjs legt nichts ins Kit und überschreibt nichts", () => {
  const imKit = tool("root.mjs", ["--path", join(ROOT, "apps", "wurzel-probe"), "--name", "Probehaus", "--no-git"], "");
  assert(imKit.status !== 0, "eine Wurzel im Kit wird angelegt");
  assert(!existsSync(join(ROOT, "apps", "wurzel-probe")), "root.mjs hat im Kit einen Ordner angelegt");

  const dir = wegwerfordner("ara-root-voll-");
  writeFileSync(join(dir, "wichtig.txt"), "bleibt");
  const voll = tool("root.mjs", ["--path", dir, "--name", "Probehaus", "--no-git"], "");
  assert(voll.status !== 0, "eine Wurzel wird in einen Ordner gelegt, der nicht leer ist");
  assert(readdirSync(dir).join() === "wichtig.txt", "root.mjs hat in einem vollen Ordner etwas angelegt");

  const falsch = tool("root.mjs", ["--path", join(dir, "neu"), "--name", "Probehaus", "--no-git", "--place", "Mit Leerzeichen", "--kind", "cloud", "--where", "x"], "");
  assert(falsch.status !== 0 && !existsSync(join(dir, "neu")), "ein Ort mit falschem Namen und falscher Art geht durch");
});

check("root.mjs meldet einen unbekannten Schalter, statt ihn zu überlesen", () => {
  const dir = wegwerfordner("ara-root-schalter-");
  const ziel = join(dir, "haus");
  const lang = tool("root.mjs", ["--path", ziel, "--name", "Probehaus", "--lang", "de", "--no-git"], "");
  assert(lang.status !== 0, "--lang wird stillschweigend überlesen");
  assert(/--lang/.test(lang.stderr + lang.stdout) && /--language/.test(lang.stderr + lang.stdout), `die Meldung nennt den Schalter und den richtigen nicht: ${lang.stderr}${lang.stdout}`);
  assert(!existsSync(ziel), "trotz des unbekannten Schalters wurde eine Wurzel angelegt");
  const sprache = tool("root.mjs", ["--path", ziel, "--name", "Probehaus", "--language", "fr", "--no-git"], "");
  assert(sprache.status !== 0 && !existsSync(ziel), "eine unbekannte Sprache wird hingenommen");
  const lose = tool("root.mjs", ["--path", ziel, "--name", "Probehaus", "--folders", "sales", "und", "product", "--no-git"], "");
  assert(lose.status !== 0 && !existsSync(ziel), "ein loses Argument wird überlesen");
  for (const falsch of ["Sales", "company", "a b", "sales,sales"]) {
    const lauf = tool("root.mjs", ["--path", ziel, "--name", "Probehaus", "--folders", falsch, "--no-git"], "");
    assert(lauf.status !== 0 && !existsSync(ziel), `der Ordner '${falsch}' der Ebene 1 wird angelegt`);
  }
  // Auch an einer bestehenden Wurzel: Ordner der Ebene 1 werden beim Anlegen genannt.
  const { root } = wurzel(["--name", "Probehaus", "--no-git"]);
  const spaeter = tool("root.mjs", ["--path", root, "--folders", "sales"], "");
  assert(spaeter.status !== 0 && !existsSync(join(root, "sales")), "--folders an einer bestehenden Wurzel legt Ordner an");
});

check("Die Anmeldung schreibt nur nach Zustimmung mit Prüfsumme, und eine Änderung verlangt sie neu", () => {
  const lokal = wegwerfordner("ara-ort-");
  const { root, run } = wurzel(["--name", "Probehaus", "--language", "de", "--folders", "sales", "--place", "api", "--kind", "folder", "--where", lokal, "--local", lokal, "--purpose", "probe"]);
  assert(run.status === 0, `root.mjs endet mit ${run.status}: ${run.stderr || run.stdout}`);
  const einstellungen = join(wegwerfordner("ara-nutzer-"), "settings.json");
  const eigene = { model: "x", permissions: { allow: ["Bash(ls:*)"], deny: ["Read(./geheim)"] }, hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "echo fremd" }] }] } };
  writeFileSync(einstellungen, JSON.stringify(eigene, null, 2));
  const anmelden = (...args) => tool("root.mjs", ["--path", root, "--settings", einstellungen, ...args], "");
  const inhalt = () => readFileSync(einstellungen, "utf8");
  const vorher = inhalt();

  // Ansehen schreibt nichts, und nennt die Summe und jede Zeile.
  const ansehen = anmelden("--enroll");
  assert(ansehen.status === 0, `--enroll endet mit ${ansehen.status}: ${ansehen.stderr}`);
  assert(inhalt() === vorher, "--enroll ohne Zustimmung hat die Einstellungen verändert");
  const summe = (ansehen.stdout.match(/Prüfsumme: ([0-9a-f]{64})/) || [])[1];
  assert(summe, `--enroll nennt keine Prüfsumme:\n${ansehen.stdout}`);
  assert(ansehen.stdout.includes("boundary.mjs") && ansehen.stdout.includes(`Edit(/${lokal}/**)`), "--enroll nennt den Hook oder die Regeln nicht");
  assert(/nicht angemeldet/.test(anmelden("--show").stdout), "--show sagt nicht, dass nichts angemeldet ist");

  // Eine falsche Summe schreibt nichts.
  const falsch = anmelden("--enroll", "--consent", "0123456789abcdef0123");
  assert(falsch.status !== 0 && inhalt() === vorher, "eine falsche Prüfsumme wird hingenommen");
  assert(anmelden("--enroll", "--consent", summe.slice(0, 8)).status !== 0, "eine zu kurze Prüfsumme wird hingenommen");

  // Kaputte Einstellungen werden nicht überschrieben.
  const kaputt = wegwerfordner("ara-nutzer-");
  writeFileSync(join(kaputt, "settings.json"), "{ nicht json");
  const zerstoert = tool("root.mjs", ["--path", root, "--settings", join(kaputt, "settings.json"), "--enroll", "--consent", summe], "");
  assert(zerstoert.status !== 0 && readFileSync(join(kaputt, "settings.json"), "utf8") === "{ nicht json", "kaputte Einstellungen werden überschrieben");

  // Mit der Summe wird geschrieben, und was dem Nutzer gehört, bleibt.
  const gut = anmelden("--enroll", "--consent", summe.slice(0, 16));
  assert(gut.status === 0, `mit der Summe endet --enroll mit ${gut.status}: ${gut.stderr}${gut.stdout}`);
  const nach = JSON.parse(inhalt());
  assert(nach.model === "x" && nach.permissions.allow.includes("Bash(ls:*)") && nach.permissions.deny.includes("Read(./geheim)"), "die eigenen Einstellungen des Nutzers sind weg");
  assert(nach.hooks.PreToolUse.some((e) => e.hooks.some((h) => h.command === "echo fremd")), "der fremde Hook des Nutzers ist weg");
  const unserer = nach.hooks.PreToolUse.flatMap((e) => e.hooks).filter((h) => /boundary\.mjs/.test(h.command));
  assert(unserer.length === 1, `der Grenz-Hook hängt ${unserer.length} Mal davor`);
  assert(nach.permissions.deny.includes(`Edit(/${lokal}/**)`), "der Ort ist in den Einstellungen des Nutzers nicht gesperrt");
  assert(!inhalt().includes("{root}"), "ein {root} blieb in den Einstellungen stehen");
  const kopie = unserer[0].command.match(/node "([^"]+)"/)[1];
  assert(existsSync(kopie), "die Kopie des Hooks neben den Einstellungen fehlt");
  assert(readFileSync(kopie, "utf8") === readFileSync(join(root, ".claude", "proposal", "boundary.mjs"), "utf8"), "die Kopie ist nicht der Hook, dem zugestimmt wurde");
  assert(!existsSync(join(root, ".claude", "settings.json")), "das Anmelden hat eine settings.json in den Baum gelegt");
  assert(inWurzel(root, "scripts/check.mjs").status === 0, "das Prüfskript hat nach dem Anmelden einen Befund");
  assert(/angemeldet am/.test(anmelden("--show").stdout), "--show sagt nicht, dass angemeldet ist");

  // Der angemeldete Hook wirkt aus jedem Ordner nur da, wo er soll.
  const wirkt = (ereignis) => spawnSync("node", [kopie, "--root", root], { input: JSON.stringify(ereignis), encoding: "utf8" }).status;
  assert(wirkt({ tool_name: "Write", tool_input: { file_path: join(lokal, "x.md") }, cwd: join(root, "sales") }) === 2, "der angemeldete Hook hält eine Sitzung eine Ebene tiefer nicht an");
  assert(wirkt({ tool_name: "Write", tool_input: { file_path: join(lokal, "x.md") }, cwd: lokal }) === 0, "der angemeldete Hook hält eine Sitzung im Ort an");
  assert(wirkt({ tool_name: "Write", tool_input: { file_path: join(lokal, "x.md") }, cwd: tmpdir() }) === 0, "der angemeldete Hook hält eine fremde Sitzung an");

  // Ändert sich der Vorschlag, gilt die Zustimmung nicht mehr für ihn.
  appendFileSync(join(root, ".claude", "proposal", "boundary.mjs"), "\n// geändert\n");
  assert(/geändert seit der Zustimmung|sich seit der Zustimmung geändert/.test(anmelden("--show").stdout), "--show meldet die geänderte Prüfsumme nicht");
  assert(anmelden("--enroll", "--consent", summe.slice(0, 16)).status !== 0, "die alte Zustimmung gilt für den geänderten Vorschlag");
  assert(readFileSync(kopie, "utf8") !== readFileSync(join(root, ".claude", "proposal", "boundary.mjs"), "utf8"), "der geänderte Hook liegt schon in den Einstellungen des Nutzers");
  const neu = (anmelden("--enroll").stdout.match(/Prüfsumme: ([0-9a-f]{64})/) || [])[1];
  assert(neu && neu !== summe, "die geänderte Datei hat dieselbe Prüfsumme");
  const erneut = anmelden("--enroll", "--consent", neu.slice(0, 16));
  assert(erneut.status === 0 && /Neu angemeldet/.test(erneut.stdout), `neue Zustimmung: ${erneut.stderr}${erneut.stdout}`);
  const dann = JSON.parse(inhalt());
  assert(dann.hooks.PreToolUse.flatMap((e) => e.hooks).filter((h) => /boundary\.mjs/.test(h.command)).length === 1, "nach der neuen Zustimmung hängt der Hook doppelt davor");
  assert(dann.permissions.deny.filter((r) => r === `Edit(/${lokal}/**)`).length === 1, "nach der neuen Zustimmung steht eine Regel doppelt");

  // Zurück: genau das Eigene bleibt.
  const zurueck = anmelden("--unenroll");
  assert(zurueck.status === 0, `--unenroll endet mit ${zurueck.status}: ${zurueck.stderr}`);
  assert(JSON.stringify(JSON.parse(inhalt())) === JSON.stringify(eigene), `nach --unenroll sind die Einstellungen nicht wie vorher:\n${inhalt()}`);
  assert(!existsSync(kopie), "die Kopie des Hooks bleibt nach --unenroll liegen");
  assert(/nichts zurückzunehmen/.test(anmelden("--unenroll").stdout), "--unenroll an einer nicht angemeldeten Wurzel sagt nichts");
  return "ansehen schreibt nichts, falsche Summe nichts, Änderung verlangt neu, zurück ist genau zurück";
});

// --- Die Brücke: arasul.mjs in der Wurzel ------------------------------------
//
// Ein Agent im Firmenordner fragt die Apps eines Geräts über eine Datei, die mit Node
// allein läuft. Hier läuft sie gegen ein nachgestelltes Gerät, das nur tut, was die
// API-Referenz des Produkts sagt, und einmal gegen das Backend der Vorlage selbst. Nichts
// davon fasst die echten Einstellungen unter ~/.claude oder ~/.config/arasul an: jeder
// Aufruf bekommt ein eigenes Verzeichnis dafür.

const BRUECKE_PASSWORT = "geheim-passwort-42";
const base64url = (wert) => Buffer.from(JSON.stringify(wert)).toString("base64url");
const brueckeToken = (exp = Math.floor(Date.now() / 1000) + 3600) => `${base64url({ alg: "none" })}.${base64url({ sub: "anna", exp })}.unterschrift`;
/** Die Sitzung, die die Anmeldung mit Passwort zurueckgibt. Sie wird nicht abgelegt. */
const BRUECKE_TOKEN = brueckeToken();
/** Der Ausweis, den das nachgestellte Geraet auf `POST /api/ausweise` ausstellt. */
const BRUECKE_AUSWEIS = "ausweis_0123456789abcdef0123456789abcdef";

const BRUECKE_AGENT = {
  id: "urlaub",
  name: "Urlaubsantrag",
  version: "1.2.0",
  agent: [
    { method: "GET", path: "antraege", purpose: "Alle Anträge der Person, neueste zuerst.", params: [{ name: "limit", type: "integer", required: false }], writes: false },
    { method: "POST", path: "antraege", purpose: "Einen Antrag stellen.", params: [{ name: "von", type: "string", required: true }, { name: "tage", type: "integer", required: true }], writes: true },
    { method: "GET", path: "../../api/admin", purpose: "Eine Route, die aus der Schnittstelle der App hinauszeigt.", params: [], writes: false },
  ],
};

/**
 * Das nachgestellte Gerät. `weiter` ist die Adresse eines echten Backends, an das
 * `/apps/selftest-bruecke/api/…` durchgereicht wird, wie es Traefik hinter der Forward-Auth tut.
 */
async function brueckeGeraet({ tls = null, weiter = null, firmenordner = null, ausweisNamen = [], rolle = "mitarbeiter", alleOrdner = [], sicht = null } = {}) {
  const gesehen = [];
  const handler = (anfrage, antwort) => {
    const teile = [];
    anfrage.on("data", (stueck) => teile.push(stueck));
    anfrage.on("end", async () => {
      const rumpf = Buffer.concat(teile).toString("utf8");
      const [pfad, frage = ""] = anfrage.url.split("?");
      const ausweis = anfrage.headers.authorization || null;
      gesehen.push({ verb: anfrage.method, pfad, frage, rumpf, ausweis });
      const senden = (status, inhalt) => {
        antwort.writeHead(status, { "Content-Type": "application/json" });
        antwort.end(JSON.stringify(inhalt));
      };
      if (pfad === "/api/auth/login") {
        const eingabe = JSON.parse(rumpf || "{}");
        return eingabe.username === "anna" && eingabe.password === BRUECKE_PASSWORT
          ? senden(200, { token: BRUECKE_TOKEN, user: { id: 7, username: "anna", role: rolle } })
          : senden(401, { error: { message: "Anmeldung abgewiesen" } });
      }
      // Die Sitzung stellt einen Ausweis aus, und nur der kommt danach wieder.
      const sitzung = ausweis === `Bearer ${BRUECKE_TOKEN}`;
      const gueltig = sitzung || ausweis === `Bearer ${BRUECKE_AUSWEIS}`;
      if (pfad === "/api/auth/session") return senden(200, gueltig ? { authenticated: true, user: { username: "anna" } } : { authenticated: false, user: null });
      if (!gueltig) return senden(401, { error: { message: "Kein gültiger Ausweis" } });
      if (pfad === "/api/ausweise" && anfrage.method === "POST") {
        if (!sitzung) return senden(401, { error: { message: "Ein Ausweis stellt keinen Ausweis aus" } });
        const name = JSON.parse(rumpf || "{}").name;
        if (!name || typeof name !== "string") return senden(400, { error: { message: "Name fehlt" } });
        if (ausweisNamen.includes(name)) return senden(409, { error: { message: `Es gibt schon einen Ausweis mit dem Namen „${name}"` } });
        ausweisNamen.push(name);
        return senden(201, { data: { id: ausweisNamen.length, name, praefix: BRUECKE_AUSWEIS.slice(0, 14), ausweis: BRUECKE_AUSWEIS } });
      }
      if (pfad === "/api/auth/logout" && anfrage.method === "POST") return senden(200, { success: true });
      if (pfad === "/api/auth/me") return senden(200, { user: { id: 7, username: "anna", role: rolle } });
      if (pfad === "/api/firmenordner") {
        // 503 heisst „auf diesem Geraet laeuft kein Dateidienst" und ist etwas anderes
        // als eine leere Ordnerliste. Das CLI muss beides auseinanderhalten.
        return firmenordner
          ? senden(200, { data: { benutzer: "anna", erreichbar: true, nicht_abgeglichen: [{ art: "symlink", text: "Ein Symlink im Baum wird nicht übertragen." }], ...firmenordner } })
          : senden(503, { error: { message: "Auf diesem Geraet laeuft kein Firmenordner." } });
      }
      // Die Sicht eines Menschen, wie das Geraet sie eines Tages liefert. Bis dahin 404.
      if (pfad === "/api/firmenordner/sicht") {
        if (!sicht?.text) return senden(404, { error: { message: "Weg nicht bekannt" } });
        antwort.writeHead(200, { "Content-Type": "text/markdown; charset=utf-8" });
        return antwort.end(sicht.text);
      }
      // Die Verwaltung des Firmenordners: eine Sitzung und die Rolle admin, ein Ausweis oeffnet sie nie.
      if (pfad === "/api/firmenordner/ordner" || pfad === "/api/firmenordner/rechte") {
        if (!sitzung) return senden(401, { error: { message: "Ein Ausweis öffnet keine Verwaltung" } });
        if (rolle !== "admin") return senden(403, { error: { message: "Nur für Administratoren" } });
        const eingabe = JSON.parse(rumpf || "{}");
        if (pfad === "/api/firmenordner/ordner" && anfrage.method === "GET") return senden(200, { data: alleOrdner });
        if (pfad === "/api/firmenordner/ordner" && anfrage.method === "POST") {
          if (alleOrdner.some((o) => o.kennung === eingabe.kennung)) return senden(409, { error: { message: "Kennung vergeben" } });
          // Die Wurzel, wie das Gerät sie seit dem 22.09.2026 kennt: Ebene 0, Art wurzel, genau eine,
          // und jeder Aktive bekommt sie in seine Liste, nach Rolle, ohne Rechte-Zeile.
          if (eingabe.art === "wurzel") {
            if (eingabe.ebene !== undefined && eingabe.ebene !== 0) return senden(400, { error: { message: "Die Wurzel ist Ebene 0" } });
            const vorhanden = alleOrdner.find((o) => o.art === "wurzel");
            if (vorhanden) return senden(409, { error: { message: `Dieses Geraet hat schon eine Wurzel („${vorhanden.kennung}"). Es gibt genau eine.` } });
            const neu = { id: 100 + alleOrdner.length, kennung: eingabe.kennung, name: eingabe.name, ebene: 0, art: "wurzel", eltern_kennung: null, raum_id: `raum-${eingabe.kennung}` };
            alleOrdner.push(neu);
            if (firmenordner) firmenordner.ordner.unshift({ kennung: neu.kennung, name: neu.name, ebene: 0, art: "wurzel", eltern: null, pfad: "", recht: rolle === "admin" ? "schreiben" : "lesen" });
            return senden(201, { data: neu });
          }
          if (eingabe.ebene === 0) return senden(400, { error: { message: "Ebene 0 ist die Wurzel, und die hat die Art wurzel" } });
          const neu = { id: 100 + alleOrdner.length, kennung: eingabe.kennung, name: eingabe.name, ebene: eingabe.ebene, art: eingabe.art || "geteilt", eltern_kennung: eingabe.eltern || null, raum_id: `raum-${eingabe.kennung}` };
          alleOrdner.push(neu);
          return senden(201, { data: neu });
        }
        if (pfad === "/api/firmenordner/rechte" && anfrage.method === "POST") {
          const ordner = alleOrdner.find((o) => o.id === eingabe.ordner_id);
          if (!ordner) return senden(404, { error: { message: "Diesen Ordner gibt es nicht" } });
          if (ordner.art === "wurzel") return senden(400, { error: { message: "Auf der Wurzel gibt es kein Recht je Mensch: jeder Aktive liest, Administratoren schreiben" } });
          if (eingabe.benutzer_id === 7 && firmenordner) {
            firmenordner.ordner = firmenordner.ordner.filter((o) => o.kennung !== ordner.kennung);
            firmenordner.ordner.push({ kennung: ordner.kennung, name: ordner.name, ebene: ordner.ebene, eltern: ordner.eltern_kennung, pfad: ordner.ebene === 1 ? ordner.kennung : `${ordner.eltern_kennung}/${ordner.kennung}`, recht: eingabe.recht });
          }
          return senden(201, { data: { neu: true, recht: eingabe.recht, ordner: ordner.kennung, benutzer: "anna" } });
        }
        return senden(404, { error: { message: "Weg nicht bekannt" } });
      }
      if (pfad === "/api/apps/meine") {
        return senden(200, {
          data: [
            { id: "urlaub", name: "Urlaubsantrag", live: { version: "1.2.0", pfad: "/apps/urlaub/" }, test: null },
            ...(weiter ? [{ id: "selftest-bruecke", name: "Vorlage", live: { version: "0.1.0", pfad: "/apps/selftest-bruecke/" }, test: null }] : []),
            { id: "nur-test", name: "Nur Teststand", live: null, test: { version: "0.1.0" } },
            { id: "stumm", name: "Ohne Beschreibung", live: { version: "1.0.0", pfad: "/apps/stumm/" }, test: null },
            { id: "../boese", name: "Ungültige Kennung", live: { version: "1.0.0", pfad: "/apps/x/" }, test: null },
          ],
        });
      }
      if (pfad === "/apps/urlaub/api/agent") return senden(200, BRUECKE_AGENT);
      if (pfad === "/apps/urlaub/api/antraege") return senden(200, { data: anfrage.method === "GET" ? [{ von: "2026-10-01", frage }] : { angelegt: JSON.parse(rumpf || "{}") } });
      if (weiter && pfad.startsWith("/apps/selftest-bruecke/api/")) {
        const ziel = `${weiter}/${pfad.slice("/apps/selftest-bruecke/api/".length)}${frage ? `?${frage}` : ""}`;
        const antwortDurch = await fetch(ziel, { method: anfrage.method, headers: { "content-type": "application/json", "x-arasul-user": "anna" }, body: ["GET", "HEAD"].includes(anfrage.method) ? undefined : rumpf });
        antwort.writeHead(antwortDurch.status, { "Content-Type": "application/json" });
        return antwort.end(await antwortDurch.text());
      }
      return senden(404, { error: { message: "Weg nicht bekannt" } });
    });
  };
  const server = tls ? createHttpsServer(tls, handler) : createServer(handler);
  await new Promise((bereit) => server.listen(tls?.port || 0, "127.0.0.1", bereit));
  const adresse = `${tls ? "https" : "http"}://127.0.0.1:${server.address().port}`;
  return { adresse, gesehen, port: server.address().port, schliessen: () => new Promise((fertig) => server.close(fertig)) };
}

/** Ruft `arasul.mjs` in der Wurzel so auf, wie ein Mensch es tut: mit Node, im Ordner der Wurzel. */
function bruecke(wurzel, args, { input = "", env = {} } = {}) {
  return new Promise((fertig) => {
    const kind = spawn("node", [join(wurzel.root, "arasul.mjs"), ...args], {
      cwd: wurzel.root,
      env: { ...process.env, ...wurzel.env, ...env },
    });
    let stdout = "";
    let stderr = "";
    kind.stdout.on("data", (stueck) => (stdout += stueck));
    kind.stderr.on("data", (stueck) => (stderr += stueck));
    kind.stdin.end(input);
    kind.on("close", (status) => fertig({ status, stdout, stderr }));
  });
}

/** Eine Wurzel samt eigenem Ausweis- und Einstellungsordner: nichts davon ist das des Nutzers. */
function brueckeWurzel(args = ["--name", "Probehaus", "--language", "de", "--folders", "sales,product"]) {
  const { root, run } = wurzel(args);
  assert(run.status === 0, `root.mjs endet mit ${run.status}: ${run.stderr || run.stdout}`);
  const eigen = wegwerfordner("ara-bruecke-");
  const settings = join(eigen, "claude", "settings.json");
  return { root, ausweise: join(eigen, "ausweis"), settings, env: { ARASUL_CONFIG_DIR: join(eigen, "ausweis"), CLAUDE_CONFIG_DIR: join(eigen, "claude") }, eigen };
}

await checkAsync("Die Brücke meldet an, legt den Ausweis mit 0600 ab und zeigt das Passwort nie", async () => {
  const w = brueckeWurzel();
  const geraet = await brueckeGeraet();
  try {
    const anmelden = (...args) => bruecke(w, ["login", geraet.adresse, "--user", "anna", ...args], { input: `${BRUECKE_PASSWORT}\n` });

    // Falsches Passwort: nichts wird abgelegt, und das Passwort steht nirgends.
    let lauf = await bruecke(w, ["login", geraet.adresse, "--user", "anna", "--password-stdin"], { input: "falsch-und-geheim\n" });
    assert(lauf.status !== 0 && /weist die Anmeldung ab/.test(lauf.stderr), `falsches Passwort wird nicht abgewiesen: ${lauf.stderr}`);
    assert(!existsSync(join(w.ausweise, "credentials.json")), "nach einer abgewiesenen Anmeldung liegt ein Ausweis da");
    assert(!(lauf.stdout + lauf.stderr).includes("falsch-und-geheim"), "das eingegebene Passwort steht in der Ausgabe");

    // Ein Passwort als Argument gibt es nicht: es stünde in der Prozessliste.
    lauf = await bruecke(w, ["login", geraet.adresse, "--user", "anna", "--password", "x"]);
    assert(lauf.status !== 0 && /Unbekannter Schalter/.test(lauf.stderr), "ein Passwort als Argument wird angenommen");
    // Ohne Terminal und ohne --password-stdin kommt es von nirgends, und es hängt nichts.
    lauf = await bruecke(w, ["login", geraet.adresse, "--user", "anna"]);
    assert(lauf.status !== 0 && /Terminal/.test(lauf.stderr), `ohne Terminal wird nicht erklärt, woher das Passwort kommt: ${lauf.stderr}`);

    lauf = await anmelden("--password-stdin");
    assert(lauf.status === 0, `Anmeldung endet mit ${lauf.status}: ${lauf.stderr}${lauf.stdout}`);
    const datei = join(w.ausweise, "credentials.json");
    assert((statSync(datei).mode & 0o777) === 0o600, `der Ausweis hat die Rechte ${(statSync(datei).mode & 0o777).toString(8)}`);
    const inhalt = readFileSync(datei, "utf8");
    const eintrag = JSON.parse(inhalt).devices[new URL(geraet.adresse).hostname];
    assert(eintrag?.address === geraet.adresse && eintrag.user === "anna", `der Eintrag ist unvollständig: ${inhalt}`);
    // Die Anmeldung mit Passwort legt den AUSWEIS ab und nicht die Sitzung.
    assert(eintrag.token === BRUECKE_AUSWEIS, `abgelegt wurde nicht der ausgestellte Ausweis: ${inhalt}`);
    assert(!inhalt.includes(BRUECKE_TOKEN), "die Sitzung der Anmeldung liegt in der Ausweisdatei");
    assert(eintrag.kind === "issued", `die Art des Ausweises steht nicht im Eintrag: ${inhalt}`);
    assert(geraet.gesehen.some((f) => f.verb === "POST" && f.pfad === "/api/ausweise" && f.ausweis === `Bearer ${BRUECKE_TOKEN}`), "der Ausweis wurde nicht mit der Sitzung ausgestellt");
    assert(!inhalt.includes(BRUECKE_PASSWORT), "das Passwort liegt in der Ausweisdatei");
    const ausgabe = lauf.stdout + lauf.stderr;
    assert(!ausgabe.includes(BRUECKE_PASSWORT) && !ausgabe.includes(BRUECKE_TOKEN) && !ausgabe.includes(BRUECKE_AUSWEIS), "das Passwort, die Sitzung oder der Ausweis steht in der Ausgabe");
    assert(!readdirSync(w.root, { recursive: true }).some((eintragName) => /credentials|ausweis/i.test(eintragName)), "im Firmenordner liegt ein Ausweis");

    // Eine Datei mit weiteren Rechten wird beim Lesen zugezogen.
    chmodSync(datei, 0o644);
    lauf = await bruecke(w, ["status"]);
    assert((statSync(datei).mode & 0o777) === 0o600, "eine zu offene Ausweisdatei bleibt offen");

    // status und sync sagen, dass es an diesem Gerät keinen Firmenordner gibt, und das ist
    // etwas anderes als „du hast keine Ordner".
    assert(lauf.status !== 0 && /angenommen/.test(lauf.stdout), `status meldet den Ausweis nicht als angenommen: ${lauf.stdout}`);
    assert(/kein Firmenordner/.test(lauf.stdout), `status sagt nicht, dass es hier keinen Firmenordner gibt: ${lauf.stdout}`);
    lauf = await bruecke(w, ["sync"]);
    assert(lauf.status !== 0 && /kein Firmenordner/.test(lauf.stdout), `sync sagt nicht, dass es hier keinen Firmenordner gibt: ${lauf.stdout}`);

    // Ein zweiter Ausweis mit demselben Namen: das Gerät weist ihn ab, und nichts wird abgelegt.
    lauf = await bruecke(w, ["login", geraet.adresse, "--user", "anna", "--password-stdin", "--credential-name", "probe-rechner"], { input: `${BRUECKE_PASSWORT}\n` });
    assert(lauf.status === 0, `Anmeldung mit eigenem Ausweisnamen scheitert: ${lauf.stderr}`);
    lauf = await bruecke(w, ["login", geraet.adresse, "--user", "anna", "--password-stdin", "--credential-name", "probe-rechner", "--name", "zweimal"], { input: `${BRUECKE_PASSWORT}\n` });
    assert(lauf.status !== 0 && /schon einen Ausweis|--credential-name/.test(lauf.stderr), `ein doppelter Ausweisname wird nicht gesagt: ${lauf.stderr}`);
    assert(!JSON.parse(readFileSync(datei, "utf8")).devices["zweimal"], "nach einem abgewiesenen Ausweis liegt ein Eintrag da");

    // Ein eingefügter Ausweis statt Name und Passwort: dieselbe Datei, andere Art.
    lauf = await bruecke(w, ["login", geraet.adresse, "--token-stdin", "--name", "mit-token"], { input: "ein-widerrufenes-token\n" });
    assert(lauf.status !== 0 && !JSON.parse(readFileSync(datei, "utf8")).devices["mit-token"], "ein Ausweis, den das Gerät nicht kennt, wird abgelegt");
    lauf = await bruecke(w, ["login", geraet.adresse, "--token-stdin", "--name", "mit-token"], { input: `${BRUECKE_TOKEN}\n` });
    assert(lauf.status === 0 && JSON.parse(readFileSync(datei, "utf8")).devices["mit-token"].kind === "pasted", `die Anmeldung mit einem eingefügten Ausweis scheitert: ${lauf.stderr}${lauf.stdout}`);

    // Eine Sitzung, die zu Ende ist, sagt es, ohne das Gerät zu fragen.
    const daten = JSON.parse(readFileSync(datei, "utf8"));
    daten.devices["mit-token"].token = brueckeToken(Math.floor(Date.now() / 1000) - 60);
    writeFileSync(datei, JSON.stringify(daten));
    const vorher = geraet.gesehen.length;
    lauf = await bruecke(w, ["apps", "--device", "mit-token"]);
    assert(lauf.status !== 0 && /zu Ende/.test(lauf.stderr) && geraet.gesehen.length === vorher, `eine abgelaufene Sitzung wird nicht vor dem Aufruf erkannt: ${lauf.stderr}`);
    return "0600, Ausweis statt Sitzung abgelegt, kein Passwort in Datei und Ausgabe, doppelter Name abgewiesen, Ablauf erkannt";
  } finally {
    await geraet.schliessen();
  }
});

await checkAsync("Die Brücke listet Apps mit Routen, schreibt APP.md nur für zugewiesene und ruft nur, was die App nennt", async () => {
  const w = brueckeWurzel();
  const geraet = await brueckeGeraet();
  try {
    let lauf = await bruecke(w, ["login", geraet.adresse, "--user", "anna", "--password-stdin"], { input: `${BRUECKE_PASSWORT}\n` });
    assert(lauf.status === 0, `Anmeldung: ${lauf.stderr}`);
    const gerufen = () => geraet.gesehen.filter((f) => f.pfad.startsWith("/apps/")).map((f) => `${f.verb} ${f.pfad}`);

    lauf = await bruecke(w, ["apps"]);
    assert(lauf.status === 0, `apps endet mit ${lauf.status}: ${lauf.stderr}`);
    assert(/urlaub \(Urlaubsantrag\), 1\.2\.0/.test(lauf.stdout) && /GET\s+antraege/.test(lauf.stdout) && /POST\s+antraege\s+\[ändert etwas\]/.test(lauf.stdout), `apps zeigt Apps und Routen nicht:\n${lauf.stdout}`);
    assert(/Nicht aufgeführt, fehlerhaft/.test(lauf.stdout), "eine Route, die aus der Schnittstelle hinauszeigt, wird nicht als fehlerhaft gemeldet");
    assert(/nur der Teststand|nur der Teststand ist|Nur der Teststand/i.test(lauf.stdout) && /beschreibt sich nicht/.test(lauf.stdout), `Teststand und stumme App fehlen in der Ausgabe:\n${lauf.stdout}`);

    // APP.md nur für zugewiesene Apps mit Beschreibung, nie außerhalb von apps/.
    const md = join(w.root, "apps", "urlaub", "APP.md");
    assert(existsSync(md), "für die zugewiesene App liegt keine APP.md da");
    const text = readFileSync(md, "utf8");
    assert(/### POST antraege/.test(text) && /Ändert etwas: ja, braucht --write/.test(text) && /`von` \(string, Pflicht\)/.test(text), `APP.md trägt die Route nicht: ${text}`);
    assert(!/admin/.test(text), "die hinauszeigende Route steht in APP.md");
    for (const keine of ["nur-test", "stumm", "boese"]) assert(!existsSync(join(w.root, "apps", keine)), `für ${keine} liegt ein Ordner da`);
    assert(!existsSync(join(w.root, "boese")) && !existsSync(join(w.root, "..", "boese")), "eine ungültige Kennung hat außerhalb von apps/ geschrieben");
    assert(readdirSync(join(w.root, "apps")).join() === "urlaub", `apps/ trägt mehr als die zugewiesene App: ${readdirSync(join(w.root, "apps"))}`);
    assert(inWurzel(w.root, "scripts/check.mjs").status === 0, `das Prüfskript der Wurzel meldet nach apps/ einen Befund: ${inWurzel(w.root, "scripts/check.mjs").stdout}`);

    // sync schreibt dieselbe Datei, auch an einem Gerät ohne Firmenordner.
    rmSync(md);
    lauf = await bruecke(w, ["sync"]);
    assert(existsSync(md) && /APP\.md geschrieben für 1 von 3/.test(lauf.stdout), `sync schreibt APP.md nicht: ${lauf.stdout}`);
    assert(/kein Firmenordner/.test(lauf.stdout), `sync sagt nicht, warum es keinen Ordner abgleicht: ${lauf.stdout}`);

    // Lesen geht, mit einem Parameter, und das Gerät sieht den Ausweis.
    lauf = await bruecke(w, ["call", "urlaub", "antraege", "limit=2"]);
    assert(lauf.status === 0 && JSON.parse(lauf.stdout).data[0].frage === "limit=2", `lesendes call: ${lauf.stdout}${lauf.stderr}`);
    assert(geraet.gesehen.at(-1).ausweis === `Bearer ${BRUECKE_AUSWEIS}`, "der ausgestellte Ausweis geht nicht als Bearer mit");

    // Was etwas ändert, geht nur mit --write, und ohne es geht nichts hinaus.
    const vorPost = gerufen().filter((z) => z.startsWith("POST")).length;
    lauf = await bruecke(w, ["call", "urlaub", "antraege", "von=2026-10-01", "tage=3", "--method", "POST"]);
    assert(lauf.status !== 0 && /--write/.test(lauf.stderr), `eine ändernde Route läuft ohne --write: ${lauf.stdout}${lauf.stderr}`);
    assert(gerufen().filter((z) => z.startsWith("POST")).length === vorPost, "ohne --write ist ein POST hinausgegangen");
    lauf = await bruecke(w, ["call", "urlaub", "antraege", "von=2026-10-01", "tage=3", "--write"]);
    assert(lauf.status === 0, `ändernder Aufruf mit --write: ${lauf.stderr}${lauf.stdout}`);
    const post = geraet.gesehen.filter((f) => f.verb === "POST" && f.pfad === "/apps/urlaub/api/antraege").at(-1);
    assert(post && JSON.parse(post.rumpf).tage === 3 && JSON.parse(post.rumpf).von === "2026-10-01", `der Rumpf ist nicht nach der Art der Parameter gebaut: ${post?.rumpf}`);

    // Nur was die App nennt. Nichts davon erreicht das Gerät.
    const vorher = geraet.gesehen.length;
    for (const [args, was] of [
      [["urlaub", "geheim"], "eine Route, die die App nicht nennt"],
      [["urlaub", "../../api/admin"], "eine Route mit .."],
      [["urlaub", "/api/apps/meine"], "ein Weg des Geräts"],
      [["urlaub", "antraege?x=1"], "eine Route mit Anfrage"],
      [["stumm", "irgendwas"], "eine App ohne Beschreibung"],
      [["urlaub", "antraege", "unbekannt=1"], "ein Parameter, den die Route nicht nennt"],
      [["urlaub", "antraege", "limit=abc"], "ein Parameter der falschen Art"],
      [["urlaub", "antraege", "--write", "--method", "POST"], "eine ändernde Route ohne ihre Pflichtparameter"],
      [["../boese", "antraege"], "eine App mit ungültiger Kennung"],
    ]) {
      lauf = await bruecke(w, ["call", ...args]);
      assert(lauf.status !== 0, `${was} wird aufgerufen`);
    }
    const hinaus = geraet.gesehen.slice(vorher).map((f) => `${f.verb} ${f.pfad}`).filter((z) => !/\/agent$/.test(z));
    assert(hinaus.length === 0, `dabei ging etwas an das Gerät, das kein Aufruf sein durfte: ${hinaus.join(", ")}`);
    assert(!geraet.gesehen.some((f) => f.pfad === "/api/admin"), "die Route mit .. hat das Gerät erreicht");

    // Ein Ausweis, den das Gerät nicht mehr annimmt, wird gesagt und nicht überspielt.
    const daten = JSON.parse(readFileSync(join(w.ausweise, "credentials.json"), "utf8"));
    for (const eintrag of Object.values(daten.devices)) eintrag.token = brueckeToken(Math.floor(Date.now() / 1000) + 7200);
    writeFileSync(join(w.ausweise, "credentials.json"), JSON.stringify(daten));
    lauf = await bruecke(w, ["call", "urlaub", "antraege"]);
    assert(lauf.status !== 0 && /weist den Ausweis ab/.test(lauf.stderr), `ein widerrufener Ausweis wird nicht gesagt: ${lauf.stderr}`);
    return "apps, APP.md nur zugewiesen, lesen ohne, ändern nur mit --write, neun Aufrufe ohne Weg hinaus";
  } finally {
    await geraet.schliessen();
  }
});

/**
 * Die Attrappe des Kommandozeilen-Klienten.
 *
 * Sie schreibt auf, womit sie gerufen wurde, und legt eine Datei in das Ziel, so wie der
 * echte Klient eine herunterlaedt. Was der echte Klient mit der Ausschlussliste macht,
 * prueft sie NICHT: das ist sein Verhalten und nicht das dieses Kits. Geprueft wird hier,
 * was das CLI ihm uebergibt -- die Schalter, die Liste, der Ort, das Passwort in der
 * Umgebung und nicht im Argument.
 */
function attrappenKlient() {
  const dir = wegwerfordner("ara-klient-");
  const pfad = join(dir, "opencloudcmd");
  writeFileSync(pfad, `#!/usr/bin/env node
const { appendFileSync, cpSync, mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const argv = process.argv.slice(2);
// Die Ausschlussliste liegt in einem Wegwerfordner, den sync danach wegraeumt. Wer sie
// pruefen will, muss sie lesen, solange der Klient laeuft -- also hier.
const liste = argv.includes("--exclude") ? readFileSync(argv[argv.indexOf("--exclude") + 1], "utf8") : null;
appendFileSync(process.env.ARA_PROBE_PROTOKOLL, JSON.stringify({ argv, liste, token: process.env.OPENCLOUD_TOKEN || null }) + "\\n");
const ziel = argv[2];
mkdirSync(ziel, { recursive: true });
writeFileSync(join(ziel, "vom-dienst.txt"), "aus dem Firmenordner\\n");
if (process.env.ARA_PROBE_FEHLER && argv[1] === process.env.ARA_PROBE_FEHLER) {
  process.stderr.write("Der Dienst antwortet nicht\\n");
  process.exit(3);
}
// Was der echte Klient sagt, wenn der Dienst das Passwort nicht kennt (gemessen am 22.09.2026).
if (process.env.ARA_PROBE_AUTH && argv[1] === process.env.ARA_PROBE_AUTH) {
  process.stderr.write("Fatal: Authentication failed please verify your credentials\\n");
  process.exit(1);
}
// Mit einem Lager je Raum geht es in beide Richtungen: was hier liegt, geht in den Raum, und was
// im Raum liegt, kommt hierher. So laesst sich messen, dass das Ausgerollte wieder herunterkommt.
if (process.env.ARA_PROBE_LAGER) {
  const raum = join(process.env.ARA_PROBE_LAGER, argv.includes("--remote-folder") ? argv[argv.indexOf("--remote-folder") + 1] : argv[1]);
  mkdirSync(raum, { recursive: true });
  cpSync(ziel, raum, { recursive: true });
  cpSync(raum, ziel, { recursive: true });
}
process.exit(0);
`);
  chmodSync(pfad, 0o755);
  return { pfad, protokoll: join(dir, "protokoll.jsonl") };
}

/** Was die Attrappe des Klienten aufgeschrieben hat, ein Aufruf je Zeile. */
function klientRufe(protokoll) {
  if (!existsSync(protokoll)) return [];
  return readFileSync(protokoll, "utf8").split("\n").filter(Boolean).map((zeile) => JSON.parse(zeile));
}

const FO_ADRESSE = "https://dateidienst.probe:8443";
/** Was ein Gerät freigibt: ein Ordner der Ebene 1 und einer der Ebene 2 unter einem fremden Eltern. */
const FO_ORDNER = [
  { kennung: "buchhaltung", name: "Buchhaltung", ebene: 1, eltern: null, pfad: "buchhaltung", recht: "lesen" },
  { kennung: "vicona", name: "Vicona", ebene: 2, eltern: "projekte", pfad: "projekte/vicona", recht: "schreiben" },
];
/** Die Wurzel des Geräts: Ebene 0 mit der Art wurzel, unter der Kennung, die das Gerät nennt (gemessen am 22.09.2026: firma). */
const FO_WURZEL = { kennung: "firma", name: "Firma", ebene: 0, art: "wurzel", eltern: null, pfad: "", recht: "lesen" };
/** Was ein Kit vor 0.29.0 anlegte: ein geteilter Ordner der Ebene 1 mit der Kennung wurzel. Heute ein Ordner wie jeder. */
const FO_ALTER_RAUM = { kennung: "wurzel", name: "Probehaus", ebene: 1, art: "geteilt", eltern: null, pfad: "wurzel", recht: "lesen" };
/** Ebene 0 mit einer anderen Art: eine Form, die das CLI nicht kennt und benennt, ohne etwas anzulegen. */
const FO_UNBEKANNT = { kennung: "haus", name: "Haus", ebene: 0, art: "geteilt", eltern: null, pfad: "", recht: "lesen" };
/** Zwei, die das CLI abweisen muss: einer zeigt hinaus, einer heißt wie ein Ordner der Wurzel. */
const FO_UNFUG = [
  { kennung: "../boese", name: "Hinaus", ebene: 1, eltern: null, pfad: "../boese", recht: "schreiben" },
  { kennung: "apps", name: "Apps", ebene: 1, eltern: null, pfad: "apps", recht: "schreiben" },
];
const firmenordnerPlan = (ordner = FO_ORDNER) => ({ adresse: FO_ADRESSE, ordner: [...ordner] });

await checkAsync("Die Brücke gleicht den Firmenordner an die echte Stelle im Baum ab und meldet Konflikte", async () => {
  const w = brueckeWurzel();
  const klient = attrappenKlient();
  const plan = firmenordnerPlan();
  const geraet = await brueckeGeraet({ firmenordner: plan });
  const umgebung = { ARA_PROBE_PROTOKOLL: klient.protokoll };
  const abgleichen = (args = [], input = `${BRUECKE_PASSWORT}\n`, mehr = {}) =>
    bruecke(w, ["sync", "--client", klient.pfad, "--password-stdin", ...args], { input, env: { ...umgebung, ...mehr } });
  try {
    let lauf = await bruecke(w, ["login", geraet.adresse, "--user", "anna", "--password-stdin"], { input: `${BRUECKE_PASSWORT}\n` });
    assert(lauf.status === 0, `Anmeldung: ${lauf.stderr}`);

    // Vor dem ersten Abgleich sagt status, dass noch nie abgeglichen wurde.
    lauf = await bruecke(w, ["status"], { env: umgebung });
    assert(/noch nie abgeglichen/.test(lauf.stdout), `status sagt vor dem ersten Abgleich nichts: ${lauf.stdout}`);
    assert(lauf.stdout.includes(FO_ADRESSE), `status nennt die Adresse des Dienstes nicht: ${lauf.stdout}`);

    lauf = await abgleichen();
    assert(lauf.status === 0, `sync endet mit ${lauf.status}: ${lauf.stderr}${lauf.stdout}`);

    // Der Ordner der Ebene 2 liegt an seiner echten Stelle, und die Kette darüber
    // wurde lokal angelegt, obwohl der Mensch auf dem Elternordner kein Recht hat.
    assert(existsSync(join(w.root, "projekte", "vicona", "vom-dienst.txt")), "der Ordner der Ebene 2 liegt nicht an seiner echten Stelle");
    assert(existsSync(join(w.root, "buchhaltung", "vom-dienst.txt")), "der Ordner der Ebene 1 liegt nicht da");

    assert(!/Nicht abgeglichen/.test(lauf.stdout), `ein sauberer Abgleich meldet etwas als nicht abgeglichen: ${lauf.stdout}`);

    // Zwei Aufrufe des Klienten, Ebene 1 zuerst, jeder mit den Schaltern und der Liste.
    const rufe = klientRufe(klient.protokoll);
    assert(rufe.length === 2, `der Klient wurde ${rufe.length} mal gerufen, nicht zweimal: ${JSON.stringify(rufe)}`);
    assert(rufe[0].argv[1] === "buchhaltung" && rufe[1].argv[1] === "Shares", `die Räume stimmen nicht: ${JSON.stringify(rufe.map((r) => r.argv[1]))}`);
    assert(rufe[0].argv[0] === FO_ADRESSE, `die Adresse des Dienstes geht nicht mit: ${rufe[0].argv[0]}`);
    // Die Wurzel kennt sich unter ihrem echten Pfad, der Wegwerfordner liegt unter einem Verweis.
    const echt = realpathSync(w.root);
    assert(rufe[0].argv[2] === join(echt, "buchhaltung"), `der Ort der Ebene 1 stimmt nicht: ${rufe[0].argv[2]}`);
    assert(rufe[1].argv[2] === join(echt, "projekte", "vicona"), `der Ort der Ebene 2 stimmt nicht: ${rufe[1].argv[2]}`);
    const paar = (argv, name) => argv[argv.indexOf(name) + 1];
    assert(paar(rufe[1].argv, "--remote-folder") === "vicona", `Ebene 2 geht nicht mit --remote-folder auf die Kennung: ${JSON.stringify(rufe[1].argv)}`);
    assert(!rufe[0].argv.includes("--remote-folder"), "Ebene 1 geht mit --remote-folder");
    for (const ruf of rufe) {
      for (const schalter of ["--trust", "--non-interactive", "--sync-hidden-files", "--user", "--exclude"]) {
        assert(ruf.argv.includes(schalter), `${schalter} fehlt im Aufruf: ${JSON.stringify(ruf.argv)}`);
      }
      assert(paar(ruf.argv, "--user") === "anna", `der Benutzer des Geräts geht nicht mit: ${JSON.stringify(ruf.argv)}`);
      // Das Passwort geht über die Umgebung, nie als Argument: sonst stünde es in der
      // Prozessliste jedes Menschen an diesem Rechner.
      assert(ruf.token === BRUECKE_PASSWORT, "das Passwort kommt nicht über die Umgebungsvariable des Klienten an");
      assert(!ruf.argv.some((teil) => teil.includes(BRUECKE_PASSWORT)), `das Passwort steht in einem Argument: ${JSON.stringify(ruf.argv)}`);
    }

    // Die Ausschlussliste trägt, was nie in den Firmenordner geht, und die Journaldatei
    // des Klienten selbst: ohne sie meldet er Konflikte an sich.
    const liste = rufe[0].liste;
    for (const muster of [".git", "node_modules", "dist", "build", ".claude/hooks", "settings.json"]) {
      assert(liste.split("\n").includes(muster), `${muster} steht nicht in der Ausschlussliste:\n${liste}`);
    }
    assert(/^\.sync_\*\.db$/m.test(liste), `die Journaldatei des Klienten steht nicht in der Ausschlussliste:\n${liste}`);

    // Weder Passwort noch Ausweis stehen in der Ausgabe oder im abgelegten Stand.
    const ausgabe = lauf.stdout + lauf.stderr;
    assert(!ausgabe.includes(BRUECKE_PASSWORT) && !ausgabe.includes(BRUECKE_AUSWEIS), "das Passwort oder der Ausweis steht in der Ausgabe von sync");
    const stand = readFileSync(join(w.ausweise, "firmenordner.json"), "utf8");
    assert(!stand.includes(BRUECKE_PASSWORT) && !stand.includes(BRUECKE_AUSWEIS), "das Passwort oder der Ausweis liegt im Stand des Abgleichs");
    assert(JSON.parse(stand).roots[realpathSync(w.root)].folders["projekte/vicona"].result === "ok", `der Stand des Abgleichs fehlt: ${stand}`);

    // status zeigt danach je Ordner den Stand und null Konflikte.
    lauf = await bruecke(w, ["status"], { env: umgebung });
    assert(lauf.status === 0, `status endet mit ${lauf.status}: ${lauf.stdout}${lauf.stderr}`);
    assert(/projekte\/vicona.*abgeglichen.*0 Konflikte/.test(lauf.stdout), `status zeigt den Stand des Ordners nicht: ${lauf.stdout}`);
    assert(/Dienst erreichbar: ja/.test(lauf.stdout), `status sagt nicht, ob der Dienst erreichbar ist: ${lauf.stdout}`);

    // Ein Ordner der Ebene 1, den es vorher nicht gab, steht in keiner Zeile der Tabelle
    // der Wurzel. sync schreibt die Zeile nicht selbst, es sagt sie -- und das Prüfskript
    // der Wurzel meldet genau diese Ordner und keinen anderen.
    const befund = inWurzel(w.root, "scripts/check.mjs");
    const gemeldet = [...befund.stdout.matchAll(/^ {2}([^/\s]+)\/: Ordner auf oberster Ebene/gm)].map((treffer) => treffer[1]).sort();
    assert(JSON.stringify(gemeldet) === JSON.stringify(["buchhaltung", "projekte"]), `das Prüfskript meldet andere Ordner als die abgeglichenen: ${befund.stdout}`);
    assert(/Neu auf Ebene 1/.test(ausgabe) && /buchhaltung\/, projekte\//.test(ausgabe), `sync sagt nicht, welche Ordner der Ebene 1 neu sind: ${ausgabe}`);

    // Ein Ordner, der aus der Wurzel hinauszeigt, und einer, der heißt wie ein Ordner der
    // Wurzel selbst: beide werden benannt und nicht angelegt, und sync wird rot.
    const vorUnfug = klientRufe(klient.protokoll).length;
    plan.ordner = [...FO_ORDNER, ...FO_UNFUG];
    lauf = await abgleichen();
    assert(lauf.status !== 0, "ein Ordner, den das CLI abweist, lässt sync grün");
    assert(/Nicht abgeglichen/.test(lauf.stdout) && /boese/.test(lauf.stdout) && /apps/.test(lauf.stdout), `sync meldet die abgewiesenen Ordner nicht: ${lauf.stdout}`);
    assert(!existsSync(join(w.root, "boese")) && !existsSync(join(w.root, "..", "boese")), "eine ungültige Kennung hat außerhalb der Wurzel geschrieben");
    assert(!existsSync(join(w.root, "apps", "vom-dienst.txt")), "ein Ordner der Ebene 1 hat den eigenen Ordner apps der Wurzel überschrieben");
    assert(klientRufe(klient.protokoll).length === vorUnfug + 2, "für einen abgewiesenen Ordner wurde der Klient gerufen");
    plan.ordner = [...FO_ORDNER];

    // Ein Konflikt und ein Symlink: beide werden gemeldet, und status wird rot.
    writeFileSync(join(w.root, "projekte", "vicona", "plan_conflict-20260922-101500.md"), "zweimal geändert\n");
    symlinkSync(join(w.root, "buchhaltung"), join(w.root, "projekte", "vicona", "verweis"));
    lauf = await abgleichen();
    assert(lauf.status !== 0, "sync bleibt grün, obwohl ein Konflikt und ein Symlink daliegen");
    assert(/1 Konflikte/.test(lauf.stdout) && /plan_conflict/.test(lauf.stdout), `sync meldet den Konflikt nicht: ${lauf.stdout}`);
    assert(/1 Symlinks/.test(lauf.stdout) && /verweis/.test(lauf.stdout), `sync meldet den nicht abgeglichenen Symlink nicht: ${lauf.stdout}`);
    lauf = await bruecke(w, ["status"], { env: umgebung });
    assert(lauf.status !== 0 && /1 Konflikte/.test(lauf.stdout) && /1 Symlinks nicht abgeglichen/.test(lauf.stdout), `status meldet Konflikt und Symlink nicht: ${lauf.stdout}`);

    // Ein Ordner, an dem der Klient scheitert: der Grund steht da, und der andere Ordner
    // wird trotzdem abgeglichen.
    const vorher = klientRufe(klient.protokoll).length;
    lauf = await abgleichen([], `${BRUECKE_PASSWORT}\n`, { ARA_PROBE_FEHLER: "buchhaltung" });
    assert(lauf.status !== 0 && /Der Dienst antwortet nicht/.test(lauf.stdout), `der Grund des gescheiterten Abgleichs fehlt: ${lauf.stdout}${lauf.stderr}`);
    assert(klientRufe(klient.protokoll).length === vorher + 2, "nach einem gescheiterten Ordner hört sync auf");
    assert(JSON.parse(readFileSync(join(w.ausweise, "firmenordner.json"), "utf8")).roots[realpathSync(w.root)].folders.buchhaltung.result === "error", "der gescheiterte Abgleich steht nicht im Stand");

    // Ein Klient, den es nicht gibt, und ein Passwort, das von nirgends kommt: beides wird
    // gesagt, und es geht nichts hinaus.
    const fehlt = join(wegwerfordner("ara-leer-"), "opencloudcmd");
    const vorFehler = klientRufe(klient.protokoll).length;
    lauf = await bruecke(w, ["sync", "--client", fehlt, "--password-stdin"], { input: `${BRUECKE_PASSWORT}\n`, env: umgebung });
    assert(lauf.status !== 0 && lauf.stderr.includes(fehlt), `ein fehlender Klient wird nicht benannt: ${lauf.stderr}`);
    lauf = await bruecke(w, ["sync", "--client", klient.pfad], { input: "", env: umgebung });
    assert(lauf.status !== 0 && /--password-stdin/.test(lauf.stderr), `ohne Terminal wird nicht erklärt, woher das Passwort kommt: ${lauf.stderr}`);
    assert(klientRufe(klient.protokoll).length === vorFehler, "ohne Klient oder ohne Passwort wurde abgeglichen");
    return "Ebene 1 als Raum, Ebene 2 über Shares mit --remote-folder, Kette lokal angelegt, Liste und Schalter geprüft, Passwort nur in der Umgebung, Konflikt und Symlink gemeldet";
  } finally {
    await geraet.schliessen();
  }
});

await checkAsync("Die Brücke räumt den Baum nicht leer, wenn das Gerät keinen Firmenordner hat", async () => {
  const w = brueckeWurzel();
  const klient = attrappenKlient();
  const umgebung = { ARA_PROBE_PROTOKOLL: klient.protokoll };
  let geraet = await brueckeGeraet({ firmenordner: firmenordnerPlan() });
  try {
    let lauf = await bruecke(w, ["login", geraet.adresse, "--user", "anna", "--password-stdin"], { input: `${BRUECKE_PASSWORT}\n` });
    assert(lauf.status === 0, `Anmeldung: ${lauf.stderr}`);
    lauf = await bruecke(w, ["sync", "--client", klient.pfad, "--password-stdin"], { input: `${BRUECKE_PASSWORT}\n`, env: umgebung });
    assert(lauf.status === 0 && existsSync(join(w.root, "buchhaltung", "vom-dienst.txt")), `der erste Abgleich geht nicht: ${lauf.stdout}${lauf.stderr}`);
    writeFileSync(join(w.root, "buchhaltung", "eigene-notiz.md"), "von Hand\n");

    // Dasselbe Gerät ohne Dienst: 503. Es wird nichts weggeräumt und nichts gerufen.
    const port = geraet.port;
    await geraet.schliessen();
    geraet = await brueckeGeraet({ firmenordner: null, tls: null });
    // Ein neuer Port: der Eintrag zeigt auf den alten, also neu anmelden.
    lauf = await bruecke(w, ["login", geraet.adresse, "--user", "anna", "--password-stdin", "--name", "ohne-dienst"], { input: `${BRUECKE_PASSWORT}\n` });
    assert(lauf.status === 0, `Anmeldung am Gerät ohne Dienst: ${lauf.stderr}`);
    const vorher = klientRufe(klient.protokoll).length;
    lauf = await bruecke(w, ["sync", "--client", klient.pfad, "--device", "ohne-dienst"], { env: umgebung });
    assert(lauf.status !== 0 && /kein Firmenordner/.test(lauf.stdout), `503 wird nicht als „kein Dienst" gemeldet: ${lauf.stdout}${lauf.stderr}`);
    assert(klientRufe(klient.protokoll).length === vorher, "bei 503 wurde der Klient gerufen");
    assert(existsSync(join(w.root, "buchhaltung", "eigene-notiz.md")) && existsSync(join(w.root, "projekte", "vicona")), "bei 503 wurde im Baum aufgeräumt");

    // Und ein Gerät, das gar keine Ordner freigibt: auch das räumt nichts weg.
    await geraet.schliessen();
    geraet = await brueckeGeraet({ firmenordner: { adresse: FO_ADRESSE, ordner: [] } });
    lauf = await bruecke(w, ["login", geraet.adresse, "--user", "anna", "--password-stdin", "--name", "ohne-ordner"], { input: `${BRUECKE_PASSWORT}\n` });
    assert(lauf.status === 0, `Anmeldung am Gerät ohne Ordner: ${lauf.stderr}`);
    lauf = await bruecke(w, ["sync", "--client", klient.pfad, "--device", "ohne-ordner"], { env: umgebung });
    assert(lauf.status === 0 && /kein Ordner freigegeben/.test(lauf.stdout), `eine leere Ordnerliste wird nicht gesagt: ${lauf.stdout}${lauf.stderr}`);
    assert(klientRufe(klient.protokoll).length === vorher, "ohne Ordner wurde der Klient gerufen");
    assert(existsSync(join(w.root, "buchhaltung", "eigene-notiz.md")), "ohne Ordner wurde im Baum aufgeräumt");
    void port;
    return "503 und leere Liste sind zwei Auskünfte, beide räumen nichts weg und rufen den Klienten nicht";
  } finally {
    await geraet.schliessen();
  }
});

await checkAsync("Die Brücke legt die Wurzel des Geräts, Ebene 0, oben in die Wurzel und schreibt sicht.md, vom Gerät oder aus dem, was es sagt", async () => {
  const w = brueckeWurzel();
  const klient = attrappenKlient();
  const sicht = { text: null };
  // Die Wurzel des Geräts, zwei Ordner darunter, und der Raum, den ein Kit vor 0.29.0 als Wurzel
  // anlegte: der ist heute ein Ordner der Ebene 1 wie jeder andere und landet unter seinem Namen.
  const plan = firmenordnerPlan([FO_WURZEL, ...FO_ORDNER, FO_ALTER_RAUM]);
  const geraet = await brueckeGeraet({ firmenordner: plan, sicht });
  const umgebung = { ARA_PROBE_PROTOKOLL: klient.protokoll };
  const abgleichen = () => bruecke(w, ["sync", "--client", klient.pfad, "--password-stdin"], { input: `${BRUECKE_PASSWORT}\n`, env: umgebung });
  try {
    let lauf = await bruecke(w, ["login", geraet.adresse, "--user", "anna", "--password-stdin"], { input: `${BRUECKE_PASSWORT}\n` });
    assert(lauf.status === 0, `Anmeldung: ${lauf.stderr}`);
    lauf = await abgleichen();
    assert(lauf.status === 0, `sync endet mit ${lauf.status}: ${lauf.stderr}${lauf.stdout}`);

    // Der Raum wurzel zuerst, und sein Ort ist die Wurzel selbst, kein Unterordner darin.
    const echt = realpathSync(w.root);
    const rufe = klientRufe(klient.protokoll);
    assert(rufe.length === 4, `der Klient wurde ${rufe.length} mal gerufen, nicht viermal`);
    assert(rufe[0].argv[1] === "firma" && rufe[0].argv[2] === echt, `die Wurzel des Geräts liegt nicht oben in der Wurzel, unter ihrer Kennung: ${JSON.stringify(rufe[0].argv)}`);
    assert(!rufe[0].argv.includes("--remote-folder"), "die Wurzel des Geräts geht mit --remote-folder");
    assert(!existsSync(join(w.root, "firma")), "die Wurzel des Geräts liegt in einem Unterordner");
    assert(existsSync(join(w.root, "vom-dienst.txt")), "was in der Wurzel des Geräts liegt, kam nicht oben in der Wurzel an");
    assert(rufe[1].argv[2] === join(echt, "buchhaltung") && rufe[2].argv[2] === join(echt, "wurzel") && rufe[3].argv[2] === join(echt, "projekte", "vicona"), `die Räume darunter liegen nicht an ihrer Stelle: ${rufe.map((r) => r.argv[2]).join(", ")}`);
    assert(rufe[2].argv[1] === "wurzel", "der alte Raum wurzel der Ebene 1 wird nicht als Ordner unter seinem Namen abgeglichen");

    // Die Liste der Wurzel: das Allgemeine, dazu die Räume der Ebene 1, apps und sicht.md, als
    // bloße Namen, weil der Klient kein Muster oben verankert. Die anderen Räume gehen ohne die Namen.
    const liste = rufe[0].liste.split("\n");
    for (const muster of [".git", "node_modules", ".claude/hooks", "settings.json", ".DS_Store", "buchhaltung", "projekte", "wurzel", "apps", "sicht.md"]) {
      assert(liste.includes(muster), `${muster} steht nicht in der Liste der Wurzel:\n${rufe[0].liste}`);
    }
    assert(!liste.includes("firma") && !liste.includes("vicona"), `die Liste der Wurzel schließt die Wurzel selbst oder einen Ordner der Ebene 2 aus:\n${rufe[0].liste}`);
    assert(!rufe[1].liste.split("\n").includes("buchhaltung") && rufe[1].liste.split("\n").includes(".DS_Store"), `die Liste eines Raums der Ebene 1 stimmt nicht:\n${rufe[1].liste}`);

    // sicht.md: aus dem, was das Gerät sagt, solange es keine liefert. Ohne Geheimnis.
    const sichtDatei = join(w.root, "sicht.md");
    assert(existsSync(sichtDatei), "sicht.md wurde nicht geschrieben");
    const text = readFileSync(sichtDatei, "utf8");
    for (const erwartet of ["firma, diese Wurzel, oben", "projekte/vicona", "schreiben", "urlaub", "apps/urlaub/APP.md", "Symlink"]) {
      assert(text.includes(erwartet), `sicht.md nennt „${erwartet}" nicht:\n${text}`);
    }
    assert(!text.includes(BRUECKE_PASSWORT) && !text.includes(BRUECKE_AUSWEIS), "sicht.md trägt das Passwort oder den Ausweis");
    assert(/sicht\.md: geschrieben aus dem, was das Gerät/.test(lauf.stdout), `sync sagt nicht, woher sicht.md kommt: ${lauf.stdout}`);
    assert(/Neu auf Ebene 1/.test(lauf.stdout) && /buchhaltung\/, projekte\/, wurzel\//.test(lauf.stdout) && !/firma\//.test(lauf.stdout), `die Wurzel des Geräts gilt als neuer Ordner der Ebene 1, oder der alte Raum wurzel nicht: ${lauf.stdout}`);
    assert(/firma \(diese Wurzel, oben\).*Ebene 0, lesen.*abgeglichen/.test(lauf.stdout), `sync nennt die Wurzel des Geräts nicht als die Wurzel: ${lauf.stdout}`);
    assert(/^  wurzel\s+Ebene 1, lesen\s+abgeglichen/m.test(lauf.stdout), `der alte Raum wurzel gilt nicht als Ordner der Ebene 1: ${lauf.stdout}`);

    // status kennt die Zeile der Wurzel und sicht.md.
    lauf = await bruecke(w, ["status"], { env: umgebung });
    assert(lauf.status === 0 && /firma \(diese Wurzel, oben\).*Ebene 0, lesen.*abgeglichen.*0 Konflikte/.test(lauf.stdout) && /sicht\.md: da/.test(lauf.stdout), `status zeigt die Wurzel nicht: ${lauf.stdout}${lauf.stderr}`);

    // Ebene 0 mit einer anderen Art ist eine Form, die diese Datei nicht kennt: benannt, nichts angelegt, nicht grün.
    plan.ordner.push(FO_UNBEKANNT);
    lauf = await bruecke(w, ["status"], { env: umgebung });
    assert(lauf.status !== 0 && /Nicht abgeglichen: .*"haus".*Form, die diese Datei nicht kennt/.test(lauf.stdout), `Ebene 0 ohne die Art wurzel wird nicht benannt: ${lauf.stdout}${lauf.stderr}`);
    lauf = await abgleichen();
    assert(lauf.status !== 0 && !existsSync(join(w.root, "haus")) && klientRufe(klient.protokoll).length === 8, `Ebene 0 ohne die Art wurzel wurde angelegt oder abgeglichen: ${lauf.stdout}${lauf.stderr}`);
    plan.ordner.pop();

    // Liefert das Gerät die Sicht, gilt seine, Wort für Wort.
    sicht.text = "# Sicht vom Gerät\n\nAlles gut.\n";
    lauf = await abgleichen();
    assert(lauf.status === 0 && /das Gerät hat sie geliefert/.test(lauf.stdout), `die Sicht des Geräts wird nicht genommen: ${lauf.stdout}${lauf.stderr}`);
    assert(readFileSync(sichtDatei, "utf8") === sicht.text, "sicht.md ist nicht die des Geräts");

    // Ein Konflikt, wie dieser Klient ihn benennt (gemessen am 22.09.2026), zählt für die Wurzel.
    writeFileSync(join(w.root, "README (conflicted copy 2026-09-22 201200).md"), "zweimal\n");
    lauf = await bruecke(w, ["status"], { env: umgebung });
    assert(lauf.status !== 0 && /firma \(diese Wurzel, oben\).*1 Konflikte/.test(lauf.stdout), `ein Konflikt in der Wurzel wird nicht gezählt: ${lauf.stdout}`);
    assert(!/buchhaltung.*1 Konflikte/.test(lauf.stdout), "ein Konflikt oben in der Wurzel wird einem Raum darunter zugerechnet");
    return "Wurzel firma (Ebene 0) oben, Räume darunter an ihrer Stelle, der alte Raum wurzel ein Ordner der Ebene 1, Ebene 0 anderer Art benannt, Liste der Wurzel mit den Namen der Räume, sicht.md selbst geschrieben und vom Gerät genommen, Konfliktkopie gezählt";
  } finally {
    await geraet.schliessen();
  }
});

await checkAsync("Ein leerer Ordner mit der Brücke allein wird mit sync eine Wurzel, und die Bootstrap-Datei tritt beiseite", async () => {
  // Was im Raum liegt: eine Wurzel, wie das Kit sie anlegt, mit einer Brücke, die das Haus ausgerollt hat.
  const lager = wegwerfordner("ara-lager-");
  const quelle = wurzel(["--name", "Probehaus", "--language", "de"]);
  assert(quelle.run.status === 0, `root.mjs endet mit ${quelle.run.status}: ${quelle.run.stderr || quelle.run.stdout}`);
  cpSync(quelle.root, join(lager, "firma"), { recursive: true });
  const desHauses = `${readFileSync(join(quelle.root, "arasul.mjs"), "utf8")}\n// die Brücke, die das Haus ausgerollt hat\n`;
  writeFileSync(join(lager, "firma", "arasul.mjs"), desHauses);

  const eigen = wegwerfordner("ara-bruecke-");
  const root = join(wegwerfordner("ara-bootstrap-"), "haus");
  mkdirSync(root);
  cpSync(join(ROOT_TEMPLATE, "arasul.mjs"), join(root, "arasul.mjs"));
  const w = { root, env: { ARASUL_CONFIG_DIR: join(eigen, "ausweis"), CLAUDE_CONFIG_DIR: join(eigen, "claude"), LANG: "de_DE.UTF-8" } };
  const klient = attrappenKlient();
  const umgebung = { ARA_PROBE_PROTOKOLL: klient.protokoll, ARA_PROBE_LAGER: lager };
  const geraet = await brueckeGeraet({ firmenordner: firmenordnerPlan([FO_WURZEL, FO_ORDNER[1]]) });
  try {
    // Ohne Wurzel gehen login, status und sync, und sonst nichts.
    let lauf = await bruecke(w, ["apps"]);
    assert(lauf.status !== 0 && /keine Wurzel/.test(lauf.stderr), `apps läuft in einem Ordner ohne Wurzel: ${lauf.stdout}${lauf.stderr}`);
    lauf = await bruecke(w, ["login", geraet.adresse, "--user", "anna", "--password-stdin"], { input: `${BRUECKE_PASSWORT}\n` });
    assert(lauf.status === 0, `Anmeldung im leeren Ordner: ${lauf.stderr}`);
    lauf = await bruecke(w, ["sync", "--client", klient.pfad, "--password-stdin"], { input: `${BRUECKE_PASSWORT}\n`, env: umgebung });
    assert(lauf.status === 0, `sync im leeren Ordner endet mit ${lauf.status}: ${lauf.stderr}${lauf.stdout}`);

    // Danach ist der Ordner die Wurzel aus dem Raum: oben, mit der Brücke des Hauses und ohne Konfliktkopie.
    assert(existsSync(join(root, ".claude", "root.json")) && existsSync(join(root, ".claude", "CLAUDE.md")), "die Wurzel kam nicht aus dem Raum herunter");
    assert(readFileSync(join(root, "arasul.mjs"), "utf8") === desHauses, "die Brücke des Hauses hat nicht gewonnen");
    assert(!readdirSync(root).some((name) => /conflict/i.test(name)), `eine Konfliktkopie liegt da: ${readdirSync(root).join(", ")}`);
    assert(existsSync(join(root, "projekte", "vicona")), "der Ordner der Ebene 2 liegt nicht an seiner Stelle");
    assert(existsSync(join(root, "sicht.md")), "sicht.md fehlt");
    const rufe = klientRufe(klient.protokoll);
    assert(rufe[0].argv[1] === "firma" && rufe[0].argv[2] === realpathSync(root), `die Wurzel des Geräts ging nicht in den Ordner selbst: ${JSON.stringify(rufe[0].argv)}`);

    // Ein Ordner, in dem anderes liegt, ist keine Wurzel und wird auch keine.
    const fremd = join(wegwerfordner("ara-fremd-"), "notizen");
    mkdirSync(fremd);
    cpSync(join(ROOT_TEMPLATE, "arasul.mjs"), join(fremd, "arasul.mjs"));
    writeFileSync(join(fremd, "notiz.md"), "meins\n");
    const vorher = klientRufe(klient.protokoll).length;
    lauf = await bruecke({ root: fremd, env: w.env }, ["sync", "--client", klient.pfad, "--password-stdin"], { input: `${BRUECKE_PASSWORT}\n`, env: umgebung });
    assert(lauf.status !== 0 && /keine Wurzel/.test(lauf.stderr), `ein Ordner mit fremdem Inhalt wird abgeglichen: ${lauf.stdout}${lauf.stderr}`);
    assert(klientRufe(klient.protokoll).length === vorher && !existsSync(join(fremd, ".claude")), "in einen fremden Ordner wurde die Wurzel gelegt");
    return "leerer Ordner plus Brücke wird die Wurzel aus dem Raum, die Brücke des Hauses gewinnt ohne Konflikt, ein Ordner mit Inhalt bleibt keine";
  } finally {
    await geraet.schliessen();
  }
});

await checkAsync("root.mjs --deploy legt die Wurzel in die Wurzel des Geräts: Prüfskript zuerst, Wurzel als Administrator angelegt, nur wenn das Gerät keine führt, nichts Rechnereigenes, gegengeprüft", async () => {
  const w = brueckeWurzel();
  const klient = attrappenKlient();
  const lager = wegwerfordner("ara-lager-");
  const plan = firmenordnerPlan([FO_ORDNER[0]]);
  const alle = [{ id: 1, kennung: "buchhaltung", name: "Buchhaltung", ebene: 1, art: "geteilt", eltern_kennung: null }];
  const geraet = await brueckeGeraet({ firmenordner: plan, rolle: "admin", alleOrdner: alle });
  const umgebung = { ...w.env, ARA_PROBE_PROTOKOLL: klient.protokoll, ARA_PROBE_LAGER: lager };
  const ausrollen = (...mehr) => toolAsync("root.mjs", ["--path", w.root, "--deploy", "--client", klient.pfad, "--password-stdin", ...mehr], umgebung, `${BRUECKE_PASSWORT}\n`);
  const echt = realpathSync(w.root);
  try {
    let lauf = await bruecke(w, ["login", geraet.adresse, "--user", "anna", "--password-stdin"], { input: `${BRUECKE_PASSWORT}\n` });
    assert(lauf.status === 0, `Anmeldung: ${lauf.stderr}`);

    // Ein Befund hält an: nichts geht hinaus, nichts wird angelegt.
    mkdirSync(join(w.root, "sales", ".claude"), { recursive: true });
    writeFileSync(join(w.root, "sales", ".claude", "settings.json"), "{}\n");
    lauf = await ausrollen();
    assert(lauf.status !== 0 && /Befund/.test(lauf.stderr + lauf.stdout), `ein Befund hält --deploy nicht an: ${lauf.stdout}${lauf.stderr}`);
    assert(klientRufe(klient.protokoll).length === 0, "trotz Befund wurde der Klient gerufen");
    assert(!geraet.gesehen.some((g) => g.pfad === "/api/firmenordner/ordner"), "trotz Befund wurde am Gerät ein Raum angelegt");
    rmSync(join(w.root, "sales", ".claude"), { recursive: true, force: true });

    // Der Raum fehlt: er wird mit einer Sitzung angelegt, das Recht vergeben, die Sitzung beendet.
    mkdirSync(join(w.root, ".claude", "hooks"), { recursive: true });
    writeFileSync(join(w.root, ".claude", "hooks", "eigen.mjs"), "// nur hier\n");
    lauf = await ausrollen();
    assert(lauf.status === 0, `--deploy endet mit ${lauf.status}: ${lauf.stderr}${lauf.stdout}`);
    const anlegen = geraet.gesehen.find((g) => g.verb === "POST" && g.pfad === "/api/firmenordner/ordner");
    assert(anlegen && anlegen.ausweis === `Bearer ${BRUECKE_TOKEN}`, "der Raum wurde nicht mit der Sitzung angelegt");
    const rumpf = JSON.parse(anlegen.rumpf);
    assert(rumpf.kennung === "firma" && rumpf.art === "wurzel" && rumpf.ebene === 0 && rumpf.name === "Probehaus", `die Wurzel wurde falsch angelegt: ${anlegen.rumpf}`);
    assert(!geraet.gesehen.some((g) => g.verb === "POST" && g.pfad === "/api/firmenordner/rechte"), "auf der Wurzel wurde ein Recht je Mensch vergeben, das gibt es dort nicht");
    assert(geraet.gesehen.some((g) => g.pfad === "/api/auth/logout"), "die geliehene Sitzung wurde nicht beendet");
    assert(!geraet.gesehen.some((g) => g.pfad.startsWith("/api/firmenordner/") && g.ausweis === `Bearer ${BRUECKE_AUSWEIS}`), "der Ausweis ging an die Verwaltung");
    // Zwei Rufe des Klienten: hinauf in die Wurzel selbst, herunter in einen Wegwerfordner, der danach weg ist.
    const rufe = klientRufe(klient.protokoll);
    assert(rufe.length === 2, `der Klient wurde ${rufe.length} mal gerufen, nicht zweimal`);
    assert(rufe[0].argv[1] === "firma" && rufe[0].argv[2] === echt, `hinauf ging es nicht aus der Wurzel in den Raum firma: ${JSON.stringify(rufe[0].argv)}`);
    assert(rufe[1].argv[1] === "firma" && rufe[1].argv[2] !== echt && !existsSync(rufe[1].argv[2]), `die Gegenprüfung lief nicht in einen Wegwerfordner, oder er blieb liegen: ${JSON.stringify(rufe[1].argv)}`);
    const liste = rufe[0].liste.split("\n");
    for (const muster of [".git", "node_modules", ".claude/hooks", "settings.json", "buchhaltung", "apps", "sicht.md"]) {
      assert(liste.includes(muster), `${muster} steht nicht in der Liste des Ausrollens:\n${rufe[0].liste}`);
    }
    assert(/Prüfskript: kein Befund/.test(lauf.stdout) && /Wurzel firma: auf .* angelegt, Ebene 0/.test(lauf.stdout) && /alle \d+ liegen dort/.test(lauf.stdout), `--deploy sagt nicht, was es tat: ${lauf.stdout}`);
    assert(!(lauf.stdout + lauf.stderr).includes(BRUECKE_PASSWORT), "das Passwort steht in der Ausgabe");
    // Was im Raum liegt, ist das Gerüst, und nichts Rechnereigenes.
    const imRaum = dateien(join(lager, "firma"));
    assert(imRaum.includes(".claude/CLAUDE.md") && imRaum.includes("arasul.mjs") && imRaum.includes(".claude/scripts/check.mjs"), `das Gerüst liegt nicht im Raum: ${imRaum.join(", ")}`);

    // Ein zweites Mal: der Raum ist da, nichts wird angelegt.
    const gesehen = geraet.gesehen.length;
    lauf = await ausrollen();
    assert(lauf.status === 0 && /Wurzel firma: das Gerät führt sie, anna hat schreiben/.test(lauf.stdout), `der zweite Lauf: ${lauf.stdout}${lauf.stderr}`);
    assert(!geraet.gesehen.slice(gesehen).some((g) => g.verb === "POST" && g.pfad.startsWith("/api/firmenordner")), "beim zweiten Lauf wurde wieder angelegt");

    // Nur lesen: Ausrollen geht nicht, und der Klient wird nicht gerufen.
    const zeile = plan.ordner.find((o) => o.kennung === "firma");
    zeile.recht = "lesen";
    const vorLesen = klientRufe(klient.protokoll).length;
    lauf = await ausrollen();
    assert(lauf.status !== 0 && /schreiben/.test(lauf.stderr) && klientRufe(klient.protokoll).length === vorLesen, `mit lesen wird ausgerollt: ${lauf.stdout}${lauf.stderr}`);
    zeile.recht = "schreiben";

    // Eine ältere Brücke ohne deploy wird durch die des Kits ersetzt, dann geht es weiter.
    writeFileSync(join(w.root, "arasul.mjs"), "// eine Brücke von 0.27.0, ohne deploy\n");
    lauf = await ausrollen();
    assert(lauf.status === 0 && /ersetzt/.test(lauf.stdout), `eine alte Brücke wird nicht ersetzt: ${lauf.stdout}${lauf.stderr}`);
    assert(readFileSync(join(w.root, "arasul.mjs"), "utf8") === readFileSync(join(ROOT_TEMPLATE, "arasul.mjs"), "utf8"), "die ersetzte Brücke ist nicht die des Kits");

    // Der Dienst kennt das Passwort nicht: der Klient sagt Fatal: Authentication, und deploy sagt in
    // einem Satz, woran das liegt, ohne dass etwas angelegt wird.
    const vorAuth = geraet.gesehen.length;
    lauf = await toolAsync("root.mjs", ["--path", w.root, "--deploy", "--client", klient.pfad, "--password-stdin"], { ...umgebung, ARA_PROBE_AUTH: "firma" }, `${BRUECKE_PASSWORT}\n`);
    assert(lauf.status !== 0 && /Fatal: Authentication/.test(lauf.stderr) && /Passwortwechsel/.test(lauf.stderr), `ein nicht gespiegeltes Passwort bekommt keinen Satz: ${lauf.stdout}${lauf.stderr}`);
    assert(!geraet.gesehen.slice(vorAuth).some((g) => g.verb === "POST" && g.pfad.startsWith("/api/firmenordner")), "bei Fatal: Authentication wurde etwas angelegt");
  } finally {
    await geraet.schliessen();
  }

  // Das Gerät führt eine Wurzel und nennt sie diesem Menschen nicht: es wird nie eine zweite angelegt.
  const fremd = await brueckeGeraet({ firmenordner: firmenordnerPlan([FO_ORDNER[0]]), rolle: "admin", alleOrdner: [{ id: 5, kennung: "firma", name: "Firma", ebene: 0, art: "wurzel", eltern_kennung: null, raum_id: "raum-firma" }] });
  try {
    let lauf = await bruecke(w, ["login", fremd.adresse, "--user", "anna", "--password-stdin", "--name", "fremd"], { input: `${BRUECKE_PASSWORT}\n` });
    assert(lauf.status === 0, `Anmeldung am Gerät mit Wurzel: ${lauf.stderr}`);
    const vorher = klientRufe(klient.protokoll).length;
    lauf = await ausrollen("--device", "fremd");
    assert(lauf.status !== 0 && /Wurzel 'firma'/.test(lauf.stderr) && /zweite Wurzel/.test(lauf.stderr), `eine Wurzel, die das Gerät führt und nicht nennt, bekommt keinen Satz: ${lauf.stdout}${lauf.stderr}`);
    assert(!fremd.gesehen.some((g) => g.verb === "POST" && g.pfad === "/api/firmenordner/ordner") && klientRufe(klient.protokoll).length === vorher, "neben der Wurzel des Geräts wurde eine zweite angelegt oder der Klient gerufen");
    assert(fremd.gesehen.some((g) => g.pfad === "/api/auth/logout"), "die Sitzung wurde nicht beendet");
  } finally {
    await fremd.schliessen();
  }

  // Ein Mitarbeiter, dem der Raum fehlt: es wird gesagt, nichts angelegt, nichts gerufen.
  const mitarbeiter = await brueckeGeraet({ firmenordner: firmenordnerPlan([FO_ORDNER[0]]), rolle: "mitarbeiter", alleOrdner: [] });
  try {
    let lauf = await bruecke(w, ["login", mitarbeiter.adresse, "--user", "anna", "--password-stdin", "--name", "zweites"], { input: `${BRUECKE_PASSWORT}\n` });
    assert(lauf.status === 0, `Anmeldung als Mitarbeiter: ${lauf.stderr}`);
    const vorher = klientRufe(klient.protokoll).length;
    lauf = await ausrollen("--device", "zweites");
    assert(lauf.status !== 0 && /kein Administrator/.test(lauf.stderr), `ein Mitarbeiter ohne Raum bekommt keinen Satz: ${lauf.stdout}${lauf.stderr}`);
    assert(!mitarbeiter.gesehen.some((g) => g.verb === "POST" && g.pfad === "/api/firmenordner/ordner") && klientRufe(klient.protokoll).length === vorher, "als Mitarbeiter wurde angelegt oder gerufen");
    assert(mitarbeiter.gesehen.some((g) => g.pfad === "/api/auth/logout"), "die Sitzung des Mitarbeiters wurde nicht beendet");
  } finally {
    await mitarbeiter.schliessen();
  }
  return "Befund hält an, Raum mit Sitzung angelegt und Recht vergeben, Sitzung beendet, hinauf aus der Wurzel und herunter zur Probe, alte Brücke ersetzt, Mitarbeiter ohne Raum hört es";
});

await checkAsync("Die Brücke spricht mit dem Backend der Vorlage: agent kommt aus app.json, call liest und schreibt", async () => {
  const stateFile = join(ROOT, ".ara", "state.json");
  const merker = existsSync(stateFile) ? readFileSync(stateFile, "utf8") : null;
  const appName = "selftest-bruecke";
  const appDir = join(ROOT, "apps", appName);
  const daten = wegwerfordner("ara-daten-");
  let backend = null;
  let geraet = null;
  try {
    const neu = tool("app.mjs", ["--app", appName, "--new"], "");
    assert(neu.status === 0, `app.mjs --new endet mit ${neu.status}: ${neu.stderr}`);
    backend = spawn("node", [join(appDir, "backend", "server.mjs")], { env: { ...process.env, PORT: "0", APP_DATEN: daten } });
    const port = await new Promise((fertig, fehler) => {
      let gelesen = "";
      backend.stdout.on("data", (stueck) => {
        gelesen += stueck;
        const treffer = gelesen.match(/hört auf (\d+)/);
        if (treffer) fertig(Number(treffer[1]));
      });
      backend.on("exit", () => fehler(new Error(`das Backend der Vorlage startet nicht: ${gelesen}`)));
      setTimeout(() => fehler(new Error("das Backend der Vorlage meldet keinen Port")), 15_000);
    });

    // Die Route agent liefert das Feld aus app.json, mit Kennung, Name und Version.
    const antwort = await (await fetch(`http://127.0.0.1:${port}/agent`)).json();
    const manifest = JSON.parse(readFileSync(join(appDir, "app.json"), "utf8"));
    assert(antwort.id === appName && antwort.version === manifest.version && JSON.stringify(antwort.agent) === JSON.stringify(manifest.agent), `GET agent liefert nicht das Feld aus app.json: ${JSON.stringify(antwort)}`);
    assert(manifest.agent.length >= 2 && manifest.agent.some((route) => route.writes === true), "das Gerüst nennt keine ändernde Route, an der sich --write zeigen ließe");
    assert(agentFindings(appDir, manifest).length === 0, `das Gerüst besteht die eigene Prüfung nicht: ${agentFindings(appDir, manifest).join("; ")}`);

    // Und die Brücke liest es hinter der Weiterleitung, wie hinter Traefik.
    geraet = await brueckeGeraet({ weiter: `http://127.0.0.1:${port}` });
    const w = brueckeWurzel();
    let lauf = await bruecke(w, ["login", geraet.adresse, "--user", "anna", "--password-stdin"], { input: `${BRUECKE_PASSWORT}\n` });
    assert(lauf.status === 0, `Anmeldung: ${lauf.stderr}`);
    lauf = await bruecke(w, ["apps"]);
    assert(/^selftest-bruecke, 0\.1\.0/m.test(lauf.stdout) && /GET\s+vorgaenge/.test(lauf.stdout) && /POST\s+vorgaenge/.test(lauf.stdout), `apps zeigt die Routen der Vorlage nicht:\n${lauf.stdout}`);
    lauf = await bruecke(w, ["call", appName, "vorgaenge"]);
    assert(lauf.status === 0 && JSON.parse(lauf.stdout).vorgaenge.length === 0, `GET vorgaenge der Vorlage: ${lauf.stdout}${lauf.stderr}`);
    lauf = await bruecke(w, ["call", appName, "vorgaenge", "titel=Erster Vorgang", "--write"]);
    assert(lauf.status === 0 && JSON.parse(lauf.stdout).vorgang?.titel === "Erster Vorgang", `POST vorgaenge der Vorlage: ${lauf.stdout}${lauf.stderr}`);
    lauf = await bruecke(w, ["call", appName, "vorgaenge"]);
    assert(JSON.parse(lauf.stdout).vorgaenge.length === 1, `der eingereichte Vorgang steht nicht in der Liste: ${lauf.stdout}`);
    assert(existsSync(join(w.root, "apps", appName, "APP.md")), "für die Vorlage liegt keine APP.md da");
    return "GET agent aus app.json, apps, lesen, einreichen mit --write, wieder lesen";
  } finally {
    backend?.kill();
    await geraet?.schliessen();
    rmSync(appDir, { recursive: true, force: true });
    if (merker === null) rmSync(stateFile, { force: true });
    else writeFileSync(stateFile, merker);
  }
});

await checkAsync("Die Brücke hält ein eigenes Zertifikat einmal fest und schaltet die Prüfung nie ab", async () => {
  const erzeugt = (name) => {
    const dir = wegwerfordner("ara-zert-");
    const lauf = spawnSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", join(dir, "k.pem"), "-out", join(dir, "z.pem"), "-days", "1", "-subj", `/CN=${name}`], { encoding: "utf8" });
    return lauf.status === 0 ? { key: readFileSync(join(dir, "k.pem")), cert: readFileSync(join(dir, "z.pem")) } : null;
  };
  const erstes = erzeugt("geraet-a");
  const zweites = erzeugt("geraet-b");
  if (!erstes || !zweites) return "übersprungen, openssl stellt hier kein Zertifikat aus";
  const w = brueckeWurzel();
  let geraet = await brueckeGeraet({ tls: erstes });
  try {
    let lauf = await bruecke(w, ["login", geraet.adresse, "--user", "anna", "--password-stdin"], { input: `${BRUECKE_PASSWORT}\n` });
    assert(lauf.status !== 0 && /--insecure/.test(lauf.stderr), `ein eigenes Zertifikat wird nicht benannt: ${lauf.stderr}`);
    assert(!existsSync(join(w.ausweise, "credentials.json")), "nach der Zertifikatsabweisung liegt ein Ausweis da");
    assert(!geraet.gesehen.some((f) => f.pfad === "/api/auth/login"), "das Passwort ist an ein Gerät gegangen, dessen Zertifikat nicht geprüft war");

    lauf = await bruecke(w, ["login", geraet.adresse, "--user", "anna", "--password-stdin", "--insecure"], { input: `${BRUECKE_PASSWORT}\n` });
    assert(lauf.status === 0 && /SHA-256 [0-9A-F:]{95}/.test(lauf.stdout), `--insecure hält das Zertifikat nicht fest: ${lauf.stdout}${lauf.stderr}`);
    const eintrag = Object.values(JSON.parse(readFileSync(join(w.ausweise, "credentials.json"), "utf8")).devices)[0];
    assert(/BEGIN CERTIFICATE/.test(eintrag.ca || ""), "das festgehaltene Zertifikat liegt nicht im Eintrag");
    lauf = await bruecke(w, ["apps"]);
    assert(lauf.status === 0, `mit dem festgehaltenen Zertifikat geht apps nicht: ${lauf.stderr}`);

    // Am selben Port antwortet jetzt ein Gerät mit einem anderen Zertifikat: das geht nicht durch.
    const port = geraet.port;
    await geraet.schliessen();
    geraet = await brueckeGeraet({ tls: { ...zweites, port } });
    const vorher = geraet.gesehen.length;
    lauf = await bruecke(w, ["apps"]);
    assert(lauf.status !== 0 && geraet.gesehen.length === vorher, `ein anderes Zertifikat am selben Port wird angenommen: ${lauf.stdout}${lauf.stderr}`);
    assert(!(lauf.stdout + lauf.stderr).includes(BRUECKE_TOKEN), "das Token steht in der Ausgabe");
    return "ohne --insecure abgewiesen, ohne dass das Passwort hinausging, einmal festgehalten, ein anderes Zertifikat abgewiesen";
  } finally {
    await geraet.schliessen();
  }
});

await checkAsync("Die Brücke zeigt Vorschläge aus der Wurzel und den Ordnern der Ebene 2 und gibt jeden mit seiner Prüfsumme frei", async () => {
  const lokal = wegwerfordner("ara-ort-");
  const orte = join(wegwerfordner("ara-orte-"), "orte.json");
  writeFileSync(orte, JSON.stringify([
    { name: "api", kind: "folder", where: lokal, local: lokal, purpose: "probe" },
    { name: "fern", kind: "github", where: "https://github.com/x/y", local: "~/gibt-es-nicht-auf-diesem-rechner/fern", purpose: "nicht hier" },
    { name: "nur-verweis", kind: "github", where: "https://github.com/x/z", purpose: "nur ein Verweis" },
  ]));
  const w = brueckeWurzel(["--name", "Probehaus", "--language", "de", "--folders", "sales,product", "--places", orte]);
  // Ein Vorschlag im Ordner der Ebene 2, einer in Ebene 1 und einer in Ebene 3: nur der erste zählt.
  const vorschlagIn = (pfad, wache = null) => {
    mkdirSync(join(w.root, pfad, ".claude", "proposal"), { recursive: true });
    writeFileSync(join(w.root, pfad, ".claude", "proposal", "proposal.json"), JSON.stringify({
      permissions: { allow: ["Read({root}/**)"], deny: ["Edit({root}/fest/**)"] },
      ...(wache ? { hook: { event: "PreToolUse", matcher: "Bash", script: wache } } : {}),
    }, null, 2));
    if (wache) writeFileSync(join(w.root, pfad, ".claude", "proposal", wache), "process.exit(0);\n");
  };
  vorschlagIn(join("sales", "team"), "wache.mjs");
  vorschlagIn("product");
  vorschlagIn(join("sales", "team", "tief"));
  const eigene = { model: "x", permissions: { allow: ["Bash(ls:*)"] } };
  mkdirSync(join(w.eigen, "claude"), { recursive: true });
  writeFileSync(w.settings, JSON.stringify(eigene, null, 2));
  const einstellungen = () => readFileSync(w.settings, "utf8");
  const login = (...args) => bruecke(w, ["login", ...args, "--settings", w.settings]);

  let lauf = await login();
  assert(lauf.status === 0, `login ohne Adresse endet mit ${lauf.status}: ${lauf.stderr}`);
  const summen = [...lauf.stdout.matchAll(/Prüfsumme: ([0-9a-f]{64})/g)].map((treffer) => treffer[1]);
  assert(summen.length === 2 && summen[0] !== summen[1], `zwei Vorschläge mit je eigener Prüfsumme erwartet, gefunden ${summen.length}:\n${lauf.stdout}`);
  assert(/Vorschlag 1 von 2: diese Wurzel/.test(lauf.stdout) && /Vorschlag 2 von 2: sales\/team/.test(lauf.stdout), `die beiden Vorschläge tragen ihre Orte nicht:\n${lauf.stdout}`);
  assert(!/Vorschlag \d von \d: (product|sales\/team\/tief)/.test(lauf.stdout), "ein Vorschlag aus Ebene 1 oder 3 wird gezeigt");
  assert(/Bash\(node [^)]*arasul\.mjs apps:\*\)/.test(lauf.stdout) && /Bash\(node [^)]*arasul\.mjs call:\*\)/.test(lauf.stdout) && /ask:\s+Bash\(node [^)]*arasul\.mjs call\*--write\*\)/.test(lauf.stdout), `der Vorschlag der Wurzel nennt apps, call und --write nicht:\n${lauf.stdout}`);
  assert(einstellungen() === JSON.stringify(eigene, null, 2), "das Zeigen hat die Einstellungen verändert");
  assert(/Orte auf diesem Rechner/.test(lauf.stdout) && lauf.stdout.includes(lokal) && /fern\s+.*\(nicht auf diesem Rechner\)/.test(lauf.stdout) && /nur-verweis\s+nur Verweis/.test(lauf.stdout), `die Orte werden nicht aufgelöst:\n${lauf.stdout}`);

  // Die Summe der Wurzel ist die, die das Kit für sie nennt: ein Freigabeschritt, zwei Wege.
  const kit = tool("root.mjs", ["--path", w.root, "--settings", w.settings, "--enroll"], "");
  assert(kit.stdout.includes(summen[0]), `das Kit nennt für die Wurzel eine andere Prüfsumme:\n${kit.stdout}`);

  // Falsche, zu kurze und fremde Summen schreiben nichts.
  for (const falsch of ["0123456789abcdef0123", summen[0].slice(0, 8), "x".repeat(16)]) {
    lauf = await login("--approve", falsch);
    assert(lauf.status !== 0 && einstellungen() === JSON.stringify(eigene, null, 2), `die Summe ${falsch} wird hingenommen`);
  }
  // Ein Vorschlag mit einem Hook, der ein Skript nennt, das nicht daneben liegt, lässt sich nicht freigeben.
  const kaputt = join(w.root, "sales", "team", ".claude", "proposal", "wache.mjs");
  const gutesSkript = readFileSync(kaputt, "utf8");
  rmSync(kaputt);
  lauf = await login();
  assert(/nicht freigebbar/.test(lauf.stdout), "ein Hook ohne Skript gilt als freigebbar");
  writeFileSync(kaputt, gutesSkript);

  // Freigeben: nur die Wurzel, und was dem Nutzer gehört, bleibt.
  lauf = await login("--approve", summen[0].slice(0, 16));
  assert(lauf.status === 0 && /Freigegeben: diese Wurzel/.test(lauf.stdout), `Freigabe der Wurzel: ${lauf.stdout}${lauf.stderr}`);
  let nach = JSON.parse(einstellungen());
  const echt = realpathSync(w.root);
  assert(nach.model === "x" && nach.permissions.allow.includes("Bash(ls:*)"), "die eigenen Einstellungen des Nutzers sind weg");
  assert(nach.permissions.allow.includes(`Bash(node ${echt}/arasul.mjs apps:*)`) && nach.permissions.allow.includes(`Bash(node ${echt}/arasul.mjs call:*)`), `apps und call stehen nicht als Erlaubnis da: ${JSON.stringify(nach.permissions.allow)}`);
  assert(nach.permissions.ask.includes(`Bash(node ${echt}/arasul.mjs call*--write*)`), "die ändernde Form von call wird nicht zurückgegeben");
  assert(!JSON.stringify(nach).includes("{root}") && !JSON.stringify(nach.permissions.allow.filter((r) => r.startsWith("Bash("))).includes("//"), "ein {root} oder ein Doppelstrich in einer Shell-Regel blieb stehen");
  assert(!existsSync(join(w.root, ".claude", "settings.json")), "die Freigabe hat eine settings.json in den Baum gelegt");
  assert(!nach.permissions.deny?.some((r) => r.includes("/fest/")), "der Vorschlag aus Ebene 2 ist ohne Freigabe in den Einstellungen");
  assert(inWurzel(w.root, "scripts/check.mjs").status === 0, "das Prüfskript hat nach der Freigabe einen Befund");
  lauf = await bruecke(w, ["status", "--settings", w.settings]);
  assert(/freigegeben 1, nicht freigegeben 1/.test(lauf.stdout), `status zählt die Vorschläge nicht: ${lauf.stdout}`);

  // Das Kit nimmt zurück, was die Brücke eintrug, und umgekehrt.
  const zurueck = tool("root.mjs", ["--path", w.root, "--settings", w.settings, "--unenroll"], "");
  assert(zurueck.status === 0 && JSON.stringify(JSON.parse(einstellungen())) === JSON.stringify(eigene), `das Kit nimmt die Freigabe der Brücke nicht zurück:\n${zurueck.stdout}\n${einstellungen()}`);
  const vomKit = tool("root.mjs", ["--path", w.root, "--settings", w.settings, "--enroll", "--consent", summen[0].slice(0, 16)], "");
  assert(vomKit.status === 0, `das Kit gibt nicht frei: ${vomKit.stderr}`);
  lauf = await login("--approve", summen[0].slice(0, 16));
  assert(/Neu freigegeben/.test(lauf.stdout), `die Brücke erkennt die Freigabe des Kits nicht: ${lauf.stdout}`);
  assert(JSON.parse(einstellungen()).hooks.PreToolUse.length === 1, "der Hook hängt nach der zweiten Freigabe doppelt davor");

  // Der Ordner der Ebene 2 mit eigenem Hook: eigene Kopie, eigene Summe.
  lauf = await login("--approve", summen[1].slice(0, 16));
  assert(/Freigegeben: sales\/team/.test(lauf.stdout), `Freigabe des Ordners der Ebene 2: ${lauf.stdout}${lauf.stderr}`);
  nach = JSON.parse(einstellungen());
  const kopien = nach.hooks.PreToolUse.flatMap((e) => e.hooks).map((h) => h.command.match(/node "([^"]+)"/)[1]);
  assert(kopien.length === 2 && kopien.every((k) => existsSync(k)) && kopien.some((k) => /wache\.mjs$/.test(k)), `die Kopien der beiden Hooks fehlen: ${kopien}`);

  // Ändert sich ein Vorschlag, gilt die Freigabe nicht mehr für ihn.
  appendFileSync(join(w.root, "sales", "team", ".claude", "proposal", "wache.mjs"), "// anders\n");
  lauf = await login();
  assert(/hat sich seither geändert/.test(lauf.stdout), `ein geänderter Vorschlag wird nicht gemeldet:\n${lauf.stdout}`);
  lauf = await login("--approve", summen[1].slice(0, 16));
  assert(lauf.status !== 0, "die alte Summe gilt für den geänderten Vorschlag");
  lauf = await bruecke(w, ["status", "--settings", w.settings]);
  assert(/seit der Freigabe geändert 1/.test(lauf.stdout), `status meldet die Änderung nicht: ${lauf.stdout}`);

  // Zurücknehmen: genau das Eigene bleibt, die Kopien der Hooks sind weg.
  lauf = await login("--withdraw");
  assert(lauf.status === 0 && JSON.stringify(JSON.parse(einstellungen())) === JSON.stringify(eigene), `nach --withdraw sind die Einstellungen nicht wie vorher:\n${einstellungen()}`);
  assert(kopien.every((k) => !existsSync(k)), "die Kopien der Hooks bleiben nach --withdraw liegen");

  // Kaputte Einstellungen werden nicht überschrieben.
  writeFileSync(w.settings, "{ nicht json");
  lauf = await login("--approve", summen[0].slice(0, 16));
  assert(lauf.status !== 0 && einstellungen() === "{ nicht json", "kaputte Einstellungen werden überschrieben");
  return "Wurzel und Ebene 2, nichts aus Ebene 1 und 3, je Summe, Kit und Brücke nehmen einander zurück";
});

check("Der Vorschlag der Wurzel erlaubt apps und die lesende Form von call, und sonst nichts der Brücke", () => {
  const { root } = wurzel(["--name", "Probehaus", "--language", "de"]);
  const vorschlag = JSON.parse(readFileSync(join(root, ".claude", "proposal", "proposal.json"), "utf8"));
  const brueckenRegeln = vorschlag.permissions.allow.filter((regel) => /arasul\.mjs/.test(regel));
  assert(brueckenRegeln.length === 2 && brueckenRegeln.some((r) => /arasul\.mjs apps:\*/.test(r)) && brueckenRegeln.some((r) => /arasul\.mjs call:\*/.test(r)), `Erlaubnis für apps und call: ${brueckenRegeln}`);
  assert(!brueckenRegeln.some((r) => /login|sync|status/.test(r)), "der Vorschlag erlaubt login, sync oder status ohne Rückfrage");
  assert(vorschlag.permissions.ask?.some((r) => /call\*--write\*/.test(r)), "die ändernde Form von call fehlt unter ask");
  assert(existsSync(join(root, "arasul.mjs")) && existsSync(join(root, ".claude", "skills", "arasul", "SKILL.md")), "arasul.mjs oder sein Skill fehlt in der Wurzel");
  const skill = readFileSync(join(root, ".claude", "skills", "arasul", "SKILL.md"), "utf8");
  for (const wort of ["apps", "call", "--write", "APP.md", "login"]) assert(skill.includes(wort), `der Skill nennt ${wort} nicht`);
  assert(/^---\nname: arasul\ndescription: .+\n---/.test(skill), "der Skill hat keinen Kopf");
  // Ein Haus darf keinen Ordner der Ebene 1 `apps` nennen: er gehört der Brücke.
  const laut = tool("root.mjs", ["--path", join(wegwerfordner("ara-root-"), "haus"), "--name", "Probehaus", "--folders", "apps", "--no-git"], "");
  assert(laut.status !== 0, "ein Ordner der Ebene 1 namens apps wird angelegt");
  return `${brueckenRegeln.length} Erlaubnisse, ask für --write, Skill da`;
});

await checkAsync("app.mjs --check hält das Feld agent gegen die App: Form, jede Route im Backend, und was das Gerät dazu sagt", async () => {
  const name = "selftest-agent";
  const akte = join(ROOT, "devices", name);
  const stateFile = join(ROOT, ".ara", "state.json");
  const merker = existsSync(stateFile) ? readFileSync(stateFile, "utf8") : null;
  const appDir = join(ROOT, "apps", "selftest-agent-bau");
  const work = mkdtempSync(join(tmpdir(), "ara-agent-"));
  const quelle = join(work, "probe");
  const agent = [
    { method: "GET", path: "antraege", purpose: "Alle Anträge.", params: [], writes: false },
    { method: "POST", path: "antraege", purpose: "Einen Antrag stellen.", params: [{ name: "von", type: "string", required: true }], writes: true },
  ];
  const manifest = { ...MANIFEST, backend: { image: "arasul-probeapp:1.0.0", bauen: { verzeichnis: "backend" } }, agent };
  const kennt = JSON.parse(JSON.stringify(KONTRAKT));
  kennt.app_json.schema.properties.agent = { type: "array" };
  let kontrakt = kennt;
  const server = createServer((anfrage, antwort) => {
    antwort.writeHead(anfrage.url.split("?")[0] === "/api/v1/external/contract" ? 200 : 404, { "Content-Type": "application/json" });
    antwort.end(JSON.stringify({ data: kontrakt }));
  });
  await new Promise((bereit) => server.listen(0, "127.0.0.1", bereit));
  const base = `http://127.0.0.1:${server.address().port}`;
  const env = { ARASUL_KEY_SELFTEST_AGENT: "aras_selbsttest" };
  const server_mjs = ['const wege = ["/agent", "/antraege"];', 'const verb = ["GET", "POST"];', ""].join("\n");
  const schreiben = (aenderung = {}, backend = server_mjs) => {
    mkdirSync(join(quelle, "backend"), { recursive: true });
    writeFileSync(join(quelle, "app.json"), JSON.stringify({ ...manifest, ...aenderung }, null, 2));
    writeFileSync(join(quelle, "backend", "server.mjs"), backend);
  };
  mkdirSync(akte, { recursive: true });
  cpSync(join(ROOT, ".ara", "templates", "device.md"), join(akte, "device.md"));
  writeFrontmatter(join(akte, "device.md"), { name, address: "127.0.0.1:1", api_base: base, verdict: "supported", arasul: "found", api_key_ref: "ARASUL_KEY_SELFTEST_AGENT" });
  const pruefen = () => toolAsync("app.mjs", ["--device", name, "--check", quelle], env);

  try {
    // Ein App-Ordner, dessen Backend jede genannte Route trägt, und ein Gerät, das das Feld kennt.
    schreiben();
    let lauf = await pruefen();
    assert(lauf.status === 0, `ein wohlgeformtes Feld mit vorhandenen Routen besteht nicht: ${lauf.stdout}${lauf.stderr}`);

    // Eine Route, die das Backend nicht hat, und eine ändernde ohne ihr Verb im Quelltext.
    schreiben({ agent: [...agent, { method: "GET", path: "gibtsnicht", purpose: "Fehlt im Backend.", params: [], writes: false }] });
    lauf = await pruefen();
    assert(lauf.status !== 0 && /agent nennt GET gibtsnicht, und das Backend hat sie nicht/.test(lauf.stdout), `eine fehlende Route fällt nicht auf: ${lauf.stdout}`);
    schreiben({}, 'const wege = ["/agent", "/antraege"];\n');
    lauf = await pruefen();
    assert(lauf.status !== 0 && /agent nennt POST antraege/.test(lauf.stdout), `ein POST ohne sein Verb im Quelltext fällt nicht auf: ${lauf.stdout}`);
    schreiben({}, 'const wege = ["/antraege"];\nconst verb = ["GET", "POST"];\n');
    lauf = await pruefen();
    assert(lauf.status !== 0 && /keine Route agent/.test(lauf.stdout), `eine App ohne Route agent fällt nicht auf: ${lauf.stdout}`);

    // Die Form: jede Regel des Vertrags hat einen Fall, und jeder fällt.
    const formfehler = [
      [{ method: "TRACE", path: "antraege", purpose: "x", params: [], writes: false }, /method muss eines von/],
      [{ method: "GET", path: "../antraege", purpose: "x", params: [], writes: false }, /path muss relativ/],
      [{ method: "GET", path: "antraege?x=1", purpose: "x", params: [], writes: false }, /path muss relativ/],
      [{ method: "GET", path: "antraege", purpose: "Zwei\nZeilen", params: [], writes: false }, /purpose muss ein Satz/],
      [{ method: "GET", path: "antraege", purpose: "x", writes: false }, /params muss eine Liste/],
      [{ method: "GET", path: "antraege", purpose: "x", params: [{ name: "a", type: "datum", required: true }], writes: false }, /type muss eines von/],
      [{ method: "GET", path: "antraege", purpose: "x", params: [{ name: "a", type: "string" }], writes: false }, /required muss true oder false/],
      [{ method: "GET", path: "antraege", purpose: "x", params: [], writes: "nein" }, /writes muss true oder false/],
      [{ method: "DELETE", path: "antraege", purpose: "x", params: [], writes: false }, /DELETE ändert etwas/],
      [{ method: "GET", path: "antraege", purpose: "x", params: [], writes: false, extra: 1 }, /unbekanntes Feld extra/],
    ];
    for (const [route, muster] of formfehler) {
      schreiben({ agent: [route] });
      lauf = await pruefen();
      assert(lauf.status !== 0 && muster.test(lauf.stdout), `${JSON.stringify(route)} fällt nicht auf (${muster}): ${lauf.stdout}`);
    }
    schreiben({ agent: "keine Liste" });
    assert((await pruefen()).status !== 0, "ein Feld agent, das keine Liste ist, besteht");
    schreiben({ agent: [agent[0], agent[0]] });
    lauf = await pruefen();
    assert(lauf.status !== 0 && /steht doppelt da/.test(lauf.stdout), "dieselbe Route zweimal besteht");

    // Ein Backend, das seine Wege als Muster schreibt und nicht als Zeichenkette.
    schreiben({}, 'const wege = [/^\\/agent$/, /^\\/antraege$/];\nconst verb = ["GET", "POST"];\n');
    lauf = await pruefen();
    assert(lauf.status === 0, `ein Backend mit einer Tabelle von Mustern besteht nicht: ${lauf.stdout}`);

    // Ein Gerät, dessen Schema die Einträge selbst beschreibt: seine Worte gelten, und das Kit
    // sagt denselben Fehler nicht ein zweites Mal. Was kein Schema trägt, fällt weiterhin auf.
    const genau = JSON.parse(JSON.stringify(kennt));
    genau.app_json.schema.properties.agent = {
      type: "array",
      items: {
        type: "object",
        properties: {
          method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] },
          path: { type: "string" },
          purpose: { type: "string", minLength: 1 },
          params: { type: "array" },
          writes: { type: "boolean" },
        },
        required: ["method", "path", "purpose", "params", "writes"],
        additionalProperties: false,
      },
    };
    kontrakt = genau;
    schreiben({ agent: [{ ...agent[0], extra: 1 }] });
    lauf = await pruefen();
    assert(lauf.status !== 0 && /`agent\[0\]\.extra`/.test(lauf.stdout), `das Gerät weist das unbekannte Feld nicht ab: ${lauf.stdout}`);
    assert(!/agent: agent\[0\]/.test(lauf.stdout), `das Kit wiederholt den Befund des Geräts in eigenen Worten: ${lauf.stdout}`);
    schreiben({ agent: [...agent, { method: "DELETE", path: "antraege", purpose: "Einen Antrag zurückziehen.", params: [], writes: false }] });
    lauf = await pruefen();
    assert(lauf.status !== 0 && /DELETE ändert etwas/.test(lauf.stdout), `eine Regel, die kein Schema trägt, fällt nicht mehr auf: ${lauf.stdout}`);
    kontrakt = kennt;

    // Fehlt das Feld ganz, beschreibt die App sich nicht, und das ist kein Fehler des Pakets.
    schreiben();
    const ohne = JSON.parse(readFileSync(join(quelle, "app.json"), "utf8"));
    delete ohne.agent;
    writeFileSync(join(quelle, "app.json"), JSON.stringify(ohne));
    lauf = await pruefen();
    assert(lauf.status === 0, `eine App ohne Feld agent besteht nicht: ${lauf.stdout}`);

    // Das Gerät sagt seine eigene Wahrheit: kennt sein Schema das Feld nicht, weist es das Paket ab.
    schreiben();
    kontrakt = KONTRAKT;
    lauf = await pruefen();
    assert(lauf.status !== 0 && /Gerät würde das abweisen/.test(lauf.stdout) && /agent/.test(lauf.stdout), `ein Gerät, das agent nicht kennt, wird nicht als abweisend gemeldet: ${lauf.stdout}`);
    kontrakt = kennt;

    // Der Bau legt app.json neben das Backend: die Route agent liest sie dort, und das Dockerfile kopiert sie.
    mkdirSync(join(appDir, "backend"), { recursive: true });
    writeFileSync(join(appDir, "app.json"), JSON.stringify({ ...manifest, id: "selftest-agent-bau" }, null, 2));
    writeFileSync(join(appDir, "backend", "server.mjs"), server_mjs);
    writeFileSync(join(appDir, "backend", "Dockerfile"), "FROM scratch\nCOPY server.mjs app.json ./\n");
    lauf = await toolAsync("app.mjs", ["--app", "selftest-agent-bau", "--build", "--no-plan"], env);
    assert(lauf.status === 0, `der Bau schlägt fehl: ${lauf.stdout}${lauf.stderr}`);
    const kopie = join(appDir, "build", "backend", "app.json");
    assert(existsSync(kopie) && readFileSync(kopie, "utf8") === readFileSync(join(appDir, "app.json"), "utf8"), "der Bau legt app.json nicht neben das Backend");
    lauf = await toolAsync("app.mjs", ["--device", name, "--app", "selftest-agent-bau", "--check", "--base", base], env);
    assert(lauf.status === 0, `der Bau besteht die Prüfung nicht: ${lauf.stdout}${lauf.stderr}`);
    rmSync(kopie);
    lauf = await toolAsync("app.mjs", ["--device", name, "--app", "selftest-agent-bau", "--check", "--base", base], env);
    assert(lauf.status !== 0 && /kopiert app\.json/.test(lauf.stdout), `ein Paket, dessen Dockerfile app.json kopiert und ohne sie: ${lauf.stdout}`);
    return "Form in zehn Fällen, Routen als Zeichenkette und als Muster, ein Gerät, das die Einträge selbst beurteilt, GET agent, Gerät ohne das Feld, Kopie neben dem Backend";
  } finally {
    server.close();
    rmSync(akte, { recursive: true, force: true });
    rmSync(appDir, { recursive: true, force: true });
    rmSync(work, { recursive: true, force: true });
    if (merker === null) rmSync(stateFile, { force: true });
    else writeFileSync(stateFile, merker);
  }
});

check("Der Kartenstapel einer Wurzel bewegt sich nach seinen Regeln", () => {
  const { root, run } = wurzel(["--example", "--language", "de"], { git: true });
  assert(run.status === 0, `root.mjs --example endet mit ${run.status}: ${run.stderr || run.stdout}`);
  const karten = (...args) => inWurzel(root, "scripts/cards.mjs", args);

  const neu = karten("new", "--title", "Prüfkarte für den Selbsttest", "--place", "website");
  assert(neu.status === 0, `new endet mit ${neu.status}: ${neu.stderr}`);
  const karte = join(root, "roadmap", "backlog", "new", "pruefkarte-fuer-den-selbsttest.md");
  assert(existsSync(karte), "die Karte liegt nicht in new/, oder ihr Name trägt einen Umlaut");

  assert(karten("new", "--title", "Fremder Ort", "--place", "gibt-es-nicht").status !== 0, "eine Karte für einen unbekannten Ort entsteht");
  assert(karten("move", "pruefkarte-fuer-den-selbsttest", "ready").status !== 0, "eine Karte ohne Pflichtfelder kommt nach ready/");
  assert(
    karten("move", "calculation-by-a-third-person", "running").status !== 0,
    "eine zweite Karte desselben Ortes kommt nach running/"
  );
  assert(karten("move", "table-of-ten-calculations", "done").status !== 0, "eine Karte kommt ohne Ergebnis nach done/");
  const fertig = karten("move", "table-of-ten-calculations", "done", "--result", "green");
  assert(fertig.status === 0, `done mit Ergebnis endet mit ${fertig.status}: ${fertig.stderr}`);
  const text = readFileSync(join(root, "roadmap", "backlog", "done", "table-of-ten-calculations.md"), "utf8");
  assert(/\nResult: green\n$/.test(text), "die letzte Zeile der erledigten Karte ist nicht ihr Ergebnis");
  const nach = karten("move", "calculation-by-a-third-person", "running");
  assert(nach.status === 0, `nach dem Abschluss kommt die nächste Karte nicht nach running/: ${nach.stderr}`);

  const pruefung = inWurzel(root, "scripts/check.mjs");
  assert(pruefung.status === 0, `nach den Bewegungen meldet das Prüfskript:\n${pruefung.stdout}`);
});

check("Das Gerüst der Firmenwurzel liegt in beiden Sprachen vor", () => {
  // Die Paarpruefung weiter unten sieht nur flache Ordner. Das Geruest ist ein
  // Baum, und eine Wurzel, die halb deutsch und halb englisch ausgelegt wird,
  // faellt erst dem auf, der sie liest.
  const ohne = [];
  const gleich = [];
  let paare = 0;
  const scan = (dir) => {
    for (const eintrag of readdirSync(dir, { withFileTypes: true })) {
      const pfad = join(dir, eintrag.name);
      if (eintrag.isDirectory()) {
        scan(pfad);
        continue;
      }
      if (!/\.(md|json)$/.test(eintrag.name)) continue;
      const englisch = pfad.replace(/\.de\.(md|json)$/, ".$1");
      const deutsch = englisch.replace(/\.(md|json)$/, ".de.$1");
      if (!existsSync(englisch) || !existsSync(deutsch)) {
        ohne.push(relative(ROOT, pfad));
        continue;
      }
      if (pfad !== englisch) continue;
      paare++;
      if (readFileSync(englisch, "utf8") === readFileSync(deutsch, "utf8")) gleich.push(relative(ROOT, pfad));
    }
  };
  scan(ROOT_TEMPLATE);
  scan(ROOT_METHOD);
  scan(ROOT_EXAMPLE);
  assert(ohne.length === 0, `ohne Gegenstück: ${ohne.join(", ")}`);
  assert(gleich.length === 0, `englisch und deutsch sind dieselbe Datei: ${gleich.join(", ")}`);
  assert(paare >= 30, `nur ${paare} Paare im Gerüst, das kann nicht stimmen`);
  for (const wurzel of [ROOT_TEMPLATE, ROOT_METHOD]) {
    assert(!existsSync(join(wurzel, "CLAUDE.md")), "im Gerüst liegt eine CLAUDE.md, der Agent lädt sie beim Lesen des Ordners mit");
    assert(!existsSync(join(wurzel, ".claude")), "im Gerüst liegt ein .claude, der Agent lädt daraus beim Lesen des Ordners");
  }
  return `${paare} Paare`;
});

// --- Schreibweise -----------------------------------------------------------

check("Keine Gedankenstriche im Kit", () => {
  // Ara soll keine Gedankenstriche setzen. Was im Kit steht, ist ihre Vorlage:
  // steht dort einer, schreibt sie welche.
  const offenders = [];
  const scan = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (skipEntry(path, entry.name)) continue;
      if (entry.isDirectory()) {
        scan(path);
        continue;
      }
      if (!/\.(md|mjs|json)$/.test(entry.name)) continue;
      const content = readFileSync(path, "utf8");
      content.split(/\r?\n/).forEach((line, index) => {
        if (/[\u2014\u2013]/.test(line)) offenders.push(`${relative(ROOT, path)}:${index + 1}`);
      });
    }
  };
  scan(join(ROOT, ".ara"));
  scan(join(ROOT, ".claude"));
  offenders.push(
    ...(/[\u2014\u2013]/.test(readFileSync(join(ROOT, "README.md"), "utf8")) ? ["README.md"] : [])
  );
  assert(offenders.length === 0, `Gedankenstriche in: ${offenders.slice(0, 8).join(", ")}`);
});

check("Dateinamen sind klein, ohne Umlaute und ohne Leerzeichen", () => {
  // Dateien und Ordner heissen englisch und klein, das steht in CLAUDE.md. Was
  // dagegen verstoesst, faellt erst auf, wenn ein Verweis auf einem Rechner mit
  // anderer Gross- und Kleinschreibung ins Leere zeigt, oder wenn ein Umlaut
  // im Namen auf einem Runner anders kodiert ankommt als auf dem Mac. Geprueft
  // wird, was im Repository liegt, nicht, was der Partner dazulegt.
  const listed = spawnSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" });
  if (listed.status !== 0) return "uebersprungen, kein Git-Repository";
  const files = listed.stdout.split("\0").filter(Boolean);

  // Feste Namen, die Werkzeuge so erwarten: README, CLAUDE.md, SKILL.md.
  // `Dockerfile` heisst so, weil Docker es so erwartet: es steht im Paket einer
  // App und wird am Geraet gebaut, nicht von einem Kit-Werkzeug gelesen.
  // `VERSION` und `CHANGELOG.md` sind ueberall im Handwerk grossgeschrieben;
  // ein Partner sucht sie unter diesem Namen und nicht unter einem eigenen.
  const fixed = new Set([
    "README.md",
    "CLAUDE.md",
    "SKILL.md",
    "LICENSE",
    "VERSION",
    "CHANGELOG.md",
    ".gitkeep",
    "Dockerfile",
  ]);
  // Gespiegelte Ordner tragen die Namen ihrer Quelle. Die Textbausteine kommen
  // aus Arasuls Steuerungsordner und tragen dessen Nummern (W1 bis W5); die
  // Bibliothek des Designsystems kommt aus `packages/marken` des Produkts, in
  // die Vorlage und von dort in jede App, und ihre Dateien heissen wie die
  // Bausteine, die darin stehen. Umbenennen hiesse hier: den Spiegel
  // verstellen, und danach kann kein Vergleich mit der Quelle mehr sagen, ob
  // eine Datei nachgezogen wurde oder von Hand geaendert.
  const mirrored =
    /^(\.ara\/(vorlagen\/bausteine|templates\/app\/frontend\/src\/marken)|apps\/[^/]+\/frontend\/src\/marken)\//;

  const offenders = files.filter((path) => {
    const parts = path.split("/");
    const name = parts.pop();
    if (parts.some((dir) => !/^[a-z0-9._-]+$/.test(dir))) return true;
    // README.de.md ist die deutsche Fassung von README.md und darf darum so
    // heissen wie sie. Der Sprachteil steht vor der Endung, nicht im Namen.
    if (fixed.has(name.replace(/\.[a-z]{2}\.md$/, ".md"))) return false;
    if (fixed.has(name)) return false;
    if (mirrored.test(path)) return /[^A-Za-z0-9._-]/.test(name);
    return !/^[a-z0-9._-]+$/.test(name);
  });
  assert(offenders.length === 0, `passt nicht zur Schreibweise: ${offenders.slice(0, 8).join(", ")}`);
  return `${files.length} Dateien`;
});

check("Jedes Werkzeug beantwortet --help und tut sonst nichts", () => {
  // Am 28.08.2026 führte `device.mjs --help` eine Geräteprüfung aus und
  // `mirror.mjs --help` lud den Spiegel. Wer fragt, was ein Werkzeug tut, hat
  // sich gerade nicht dafür entschieden, dass es etwas tut.
  //
  // `guard.mjs` steht nicht in der Liste: es ist der Riegel, bekommt seine
  // Eingabe von einem Hook auf der Standardeingabe und wird von keinem Menschen
  // aufgerufen.
  const dir = join(ROOT, ".ara", "tools");
  const tools = readdirSync(dir)
    .filter((name) => name.endsWith(".mjs") && name !== "guard.mjs")
    .sort();
  assert(tools.length >= 20, `nur ${tools.length} Werkzeuge gefunden, das kann nicht stimmen`);

  // Nichts darf sich dabei ändern. Der Merker ist der Zeuge: er ist die Datei,
  // die eine Geräteprüfung als Erstes anfasst.
  const stateFile = join(ROOT, ".ara", "state.json");
  const before = existsSync(stateFile) ? readFileSync(stateFile, "utf8") : null;

  for (const name of tools) {
    const run = tool(name, ["--help"], "");
    assert(run.status === 0, `${name} --help endet mit ${run.status}: ${run.stderr || run.stdout}`);
    const expected = headerHelp(new URL(`./${name}`, import.meta.url).href, TOOL_LANGUAGE).trim();
    assert(expected.length > 40, `${name} hat keinen brauchbaren Kopf, aus dem eine Hilfe würde`);
    assert(
      run.stdout.trim() === expected,
      `${name} --help antwortet nicht mit seiner Kopfhilfe:\n${run.stdout.slice(0, 200)}`
    );
    assert(!/error/i.test(run.stderr), `${name} --help meldet einen Fehler: ${run.stderr}`);
  }

  const after = existsSync(stateFile) ? readFileSync(stateFile, "utf8") : null;
  assert(after === before, "ein --help hat den Merker angefasst, also hat ein Werkzeug gearbeitet");
  return `${tools.length} Werkzeuge`;
});

check("Browser-Werkzeug ist eingerichtet", () => {
  const file = join(ROOT, ".mcp.json");
  assert(existsSync(file), ".mcp.json fehlt, der Browser steht dann nicht zur Verfügung");
  const config = JSON.parse(readFileSync(file, "utf8"));
  const browser = config.mcpServers?.playwright;
  assert(browser, "kein Browser in .mcp.json eingetragen");

  // Ein Geraet stellt sein Zertifikat aus der eigenen Geraete-CA aus. Ohne
  // diesen Schalter bricht `browser_navigate` mit ERR_CERT_AUTHORITY_INVALID
  // ab, bevor eine Seite da ist, und niemand sieht seine App im Rahmen.
  assert(
    (browser.args || []).includes("--ignore-https-errors"),
    "der Browser startet ohne --ignore-https-errors, ein Geraet mit tls: selfsigned bleibt ihm zu"
  );

  const settings = JSON.parse(readFileSync(join(ROOT, ".claude", "settings.json"), "utf8"));
  assert(
    settings.permissions?.allow?.includes("mcp__playwright"),
    "Browser ist nicht freigegeben, jeder Aufruf wuerde nachfragen"
  );
});

check("Kit laeuft ohne Rueckfragen", () => {
  // Ein Fremder bricht ab, wenn er jeden node-Aufruf einzeln freigeben muss.
  // Nach dem Vertrauensschritt beim ersten Start uebernimmt darum dieser
  // Modus, und der Riegel guard.mjs bleibt als PreToolUse-Hook davor: er
  // blockt die Handgriffe ohne Rueckweg, egal in welchem Modus.
  const settings = JSON.parse(readFileSync(join(ROOT, ".claude", "settings.json"), "utf8"));
  assert(
    settings.permissions?.defaultMode === "bypassPermissions",
    "defaultMode ist nicht bypassPermissions, ein frischer Klon fragt dann bei jedem Werkzeug nach"
  );
  assert(
    settings.enableAllProjectMcpServers === true,
    "enableAllProjectMcpServers fehlt, der Browser aus .mcp.json loest sonst einen eigenen Dialog aus"
  );
  const hooks = settings.hooks?.PreToolUse ?? [];
  const guarded = hooks.some((eintrag) =>
    (eintrag.hooks ?? []).some((h) => /guard\.mjs/.test(h.command ?? ""))
  );
  assert(guarded, "guard.mjs haengt nicht mehr als PreToolUse-Hook vor Bash, der letzte Halt fehlt");
});

// --- Sprache ----------------------------------------------------------------

/**
 * Was paarweise vorliegen muss, und was ausdruecklich nicht.
 *
 * Englisch ist die Grundfassung (`x.md`), Deutsch steht daneben (`x.de.md`).
 * Ausgenommen ist nur, was einen Grund dafuer hat, und der steht hier, damit
 * niemand ihn spaeter erraten muss.
 */
const PAIRED = [
  // Die Wurzel traegt eine README, die, die GitHub zeigt. Ihre deutsche Haelfte
  // liegt unter .ara/, damit oben so wenig wie moeglich steht. Das Paar bleibt
  // ein Paar, nur der Ort der zweiten Haelfte steht hier ausdruecklich.
  { file: "README.md", german: ".ara/README.de.md" },
  { file: ".ara/CHANGELOG.md" },
  { dir: ".ara/persona" },
  { dir: ".ara/knowledge" },
  // Die Geraeteprofile liegen einen Ordner tiefer und faellen sonst durch: der
  // Leser oben nimmt nur Dateien, keine Unterordner.
  { dir: ".ara/knowledge/devices" },
  { dir: ".ara/commands/all" },
  { dir: ".ara/commands/partner" },
  // Nur die Gerueste direkt darin. `app/` ist Quelltext einer App und keine
  // Anleitung, es wird gebaut und nicht gelesen.
  { dir: ".ara/templates", flat: true, extensions: [".md", ".json"] },
  // Jedes Muster traegt sein Blatt neben dem Code, und das ist eine Anleitung:
  // sie wird gelesen und nicht gebaut, also gibt es sie in beiden Sprachen.
  ...["documents", "mail", "foreign-api", "foreign-container", "extract", "clients"].map((muster) => ({
    dir: `.ara/templates/app-patterns/${muster}`,
  })),
];

check("Jede Datei gibt es in beiden Sprachen", () => {
  // Kein Halbzustand: was es auf Englisch gibt, gibt es auf Deutsch und
  // umgekehrt. Ohne diese Pruefung faellt eine Sprache still zurueck, und zwar
  // genau bei dem Blatt, das seit dem letzten Mal geaendert wurde.
  const missing = [];
  const copies = [];
  let pairs = 0;

  const files = (entry) => {
    if (entry.file) return [entry.file];
    const dir = join(ROOT, entry.dir);
    if (!existsSync(dir)) return [];
    const extensions = entry.extensions || [".md"];
    return readdirSync(dir, { withFileTypes: true })
      .filter((e) => (entry.flat ? e.isFile() : e.isFile()) && extensions.some((x) => e.name.endsWith(x)))
      .map((e) => `${entry.dir}/${e.name}`);
  };

  for (const entry of PAIRED) {
    for (const path of files(entry)) {
      const name = path.split("/").pop();
      const base = isVariant(name) ? path.replace(/\.de\.(md|json)$/, ".$1") : path;
      const german = entry.german || base.replace(/\.(md|json)$/, ".de.$1");
      if (!existsSync(join(ROOT, base))) {
        missing.push(`${german} ohne englische Fassung ${base}`);
        continue;
      }
      if (!existsSync(join(ROOT, german))) {
        missing.push(`${base} ohne deutsche Fassung ${german}`);
        continue;
      }
      if (isVariant(name)) continue;
      pairs++;
      // Ein Paar, das zweimal denselben Text traegt, ist kein Paar, sondern
      // eine Behauptung. Die Vorlage einer App ist der einzige Fall, in dem
      // derselbe Quelltext zweimal richtig waere, und die steht nicht in dieser
      // Liste.
      if (readFileSync(join(ROOT, base), "utf8") === readFileSync(join(ROOT, german), "utf8")) {
        copies.push(base);
      }
    }
  }
  assert(missing.length === 0, `ohne Gegenstueck:\n    ${missing.join("\n    ")}`);
  assert(copies.length === 0, `englisch und deutsch sind dieselbe Datei: ${copies.join(", ")}`);
  assert(pairs >= 40, `nur ${pairs} Paare gefunden, das kann nicht stimmen`);
  return `${pairs} Paare`;
});

check("Deutscher Inhalt trägt echte Umlaute", () => {
  // Deutsch schreibt sich mit ä, ö, ü und ß. Die Umschrift ae/oe/ue/ss gehört
  // nur in Datei- und Ordnernamen und in Bezeichner im Code. Ein Kunde, der
  // "Geraet" und "Uebergabe" in einem Angebot liest, hält das Papier für
  // unfertig. Geprüft werden die deutschen Blätter (ohne Codeblöcke,
  // Codespannen und Adressen) und die deutschen Zweige von t() in den
  // Werkzeugen (ohne ${}-Einschübe und ohne Codespannen).

  // Wörter, die die Muster tragen und trotzdem richtig sind: Fremdnamen,
  // Bezeichner aus Kontrakt und Vorlage, Beispiel-Slugs und Fugen wie zuerst.
  const erlaubt =
    /^(?:issues?|true|traefik|bluetooth|due|oem(?:-config)?|mueller(?:-metallbau)?|ohne-schluessel|menue|(?:akt|event|man|individ|virt|vis|punkt)uell\w*|\w*zu(?:ent|erkenn|eign|erst|einander)\w*)$/;

  const verdaechtig = (text) => {
    const funde = [];
    for (const treffer of text.matchAll(/[A-Za-zÄÖÜäöüß]+(?:-[A-Za-zÄÖÜäöüß]+)*/g)) {
      const wort = treffer[0];
      const klein = wort.toLowerCase();
      if (erlaubt.test(klein)) continue;
      const ersatz =
        /(?<![aeouq])ue/.test(klein) ||
        /(?<![aeou])ae/.test(klein) ||
        /(?<![aeou])oe/.test(klein) ||
        // Fugen wie Quellcodeueberlassung und geaendert: nach Vokal oder
        // Vorsilbe ge- sind die Paare trotzdem Ersatz.
        /ueb|geae|geoe|geue/.test(klein) ||
        // ss, das ein ß war. Nach ie immer, nach ei fast immer (weissagen
        // nicht), der Rest sind einzelne Stämme.
        /iess|eiss(?!ag)/.test(klein) ||
        /^(?:ausser|aussen$|draussen$|gross|weiss)|strasse$|massnahme|massgeb|massstab/.test(klein);
      if (ersatz) funde.push(wort);
    }
    return funde;
  };

  // Markdown ohne Codebloecke, Codespannen und Adressen: dort stehen
  // Dateinamen, Befehle und Bezeichner, und die sind ASCII mit Absicht.
  const prosa = (blatt) =>
    blatt
      .replace(/^```[\s\S]*?^```/gm, "")
      .replace(/`[^`\n]*`/g, "")
      .replace(/\bhttps?:\/\/\S+/g, "");

  // Ein String oder Template ab `start`, mitsamt ${}-Einschueben.
  const stringEnde = (quelle, start) => {
    const zeichen = quelle[start];
    let i = start + 1;
    while (i < quelle.length) {
      if (quelle[i] === "\\") { i += 2; continue; }
      if (zeichen === "`" && quelle[i] === "$" && quelle[i + 1] === "{") {
        let tiefe = 1;
        i += 2;
        while (i < quelle.length && tiefe > 0) {
          if (quelle[i] === "{") tiefe += 1;
          if (quelle[i] === "}") tiefe -= 1;
          i += 1;
        }
        continue;
      }
      if (quelle[i] === zeichen) return i + 1;
      i += 1;
    }
    return i;
  };

  // Das zweite Argument jedes t()-Aufrufs, als roher Ausdruck.
  const zweiteArgumente = (quelle) => {
    const raus = [];
    const aufruf = /(?<![A-Za-z0-9_$.])t\(/g;
    let treffer;
    while ((treffer = aufruf.exec(quelle))) {
      const argumente = [];
      let tiefe = 1;
      let stueck = "";
      let i = treffer.index + treffer[0].length;
      while (i < quelle.length && tiefe > 0) {
        const c = quelle[i];
        if (c === '"' || c === "'" || c === "`") {
          const ende = stringEnde(quelle, i);
          stueck += quelle.slice(i, ende);
          i = ende;
          continue;
        }
        if (c === "(" || c === "[" || c === "{") tiefe += 1;
        if (c === ")" || c === "]" || c === "}") {
          tiefe -= 1;
          if (tiefe === 0) break;
        }
        if (c === "," && tiefe === 1) {
          argumente.push(stueck);
          stueck = "";
          i += 1;
          continue;
        }
        stueck += c;
        i += 1;
      }
      argumente.push(stueck);
      if (argumente[1]) raus.push(argumente[1]);
    }
    return raus;
  };

  // Aus einem Ausdruck die String-Inhalte, ohne ${}-Einschuebe und ohne
  // Codespannen: dort stehen Kontraktfelder wie `umgebung.schluessel`.
  const deutscheZweige = (quelle) => {
    const teile = [];
    for (const ausdruck of zweiteArgumente(quelle)) {
      let i = 0;
      while (i < ausdruck.length) {
        const c = ausdruck[i];
        if (c === '"' || c === "'" || c === "`") {
          const ende = stringEnde(ausdruck, i);
          let inhalt = ausdruck.slice(i + 1, ende - 1);
          if (c === "`") inhalt = inhalt.replace(/\$\{[\s\S]*?\}/g, " ");
          teile.push(inhalt);
          i = ende;
          continue;
        }
        i += 1;
      }
    }
    return teile.join("\n").replace(/`[^`\n]*`/g, "");
  };

  const sammeln = (dir, passt) => {
    if (!existsSync(dir)) return [];
    const raus = [];
    for (const eintrag of readdirSync(dir, { withFileTypes: true })) {
      const pfad = join(dir, eintrag.name);
      if (eintrag.isDirectory()) raus.push(...sammeln(pfad, passt));
      else if (passt(eintrag.name)) raus.push(pfad);
    }
    return raus;
  };

  const blaetter = [
    ...sammeln(join(ROOT, ".ara", "vorlagen"), (n) => n.endsWith(".md")),
    ...sammeln(join(ROOT, ".ara", "nachweise"), (n) => n.endsWith(".md")),
    ...readdirSync(join(ROOT, ".ara", "templates"))
      .filter((n) => /\.de\.(md|json)$/.test(n))
      .map((n) => join(ROOT, ".ara", "templates", n)),
    ...sammeln(join(ROOT, ".ara", "knowledge"), (n) => n.endsWith(".de.md")),
    ...sammeln(join(ROOT, ".ara", "commands"), (n) => n.endsWith(".de.md")),
    ...sammeln(join(ROOT, ".ara", "templates", "app-patterns"), (n) => n.endsWith(".de.md")),
    ...sammeln(ROOT_TEMPLATE, (n) => /\.de\.(md|json)$/.test(n)),
    ...sammeln(ROOT_EXAMPLE, (n) => /\.de\.(md|json)$/.test(n)),
    join(ROOT, ".ara", "persona", "ara.de.md"),
    join(ROOT, ".ara", "README.de.md"),
    join(ROOT, ".ara", "CHANGELOG.de.md"),
  ];
  const werkzeuge = [
    ...sammeln(join(ROOT, ".ara", "tools"), (n) => n.endsWith(".mjs")),
    // Die Skripte einer Firmenwurzel sprechen mit demselben t(en, de).
    ...sammeln(ROOT_TEMPLATE, (n) => n.endsWith(".mjs")),
  ];

  const funde = [];
  for (const pfad of blaetter) {
    const woerter = verdaechtig(prosa(readFileSync(pfad, "utf8")));
    if (woerter.length) funde.push(`${relative(ROOT, pfad)}: ${[...new Set(woerter)].join(", ")}`);
  }
  for (const pfad of werkzeuge) {
    const woerter = verdaechtig(deutscheZweige(readFileSync(pfad, "utf8")));
    if (woerter.length) funde.push(`${relative(ROOT, pfad)}: ${[...new Set(woerter)].join(", ")}`);
  }

  // Die Vorlage der App und die Muster: deutscher Inhalt steht dort in
  // Kommentaren, in Sätzen zwischen Anführungszeichen und als Text zwischen
  // JSX-Tags. Bezeichner bleiben ASCII (`geraet`, `vorgaenge`), und ein Wort,
  // das im Code als Name vorkommt, ist ein Name und kein Ersatz. Die Kopie der
  // Bibliothek unter `marken/` gehört dem Produkt und nicht dem Kit.
  const quellen = [
    ...sammeln(join(ROOT, ".ara", "templates", "app"), (n) => /\.(mjs|ts|tsx|sql|css|json|md|html)$|^Dockerfile$/.test(n)),
    ...sammeln(join(ROOT, ".ara", "templates", "app-patterns"), (n) => /\.(mjs|ts|tsx|sql|css|json)$|^Dockerfile$/.test(n)),
  ].filter((pfad) => !/[\\/](marken|node_modules|dist)[\\/]/.test(pfad) && !pfad.endsWith("package-lock.json"));
  const namen = new Set();
  const stuecke = quellen.map((pfad) => {
    const quelle = readFileSync(pfad, "utf8");
    const bereiche = prosaBereiche(quelle, pfad);
    let code = quelle;
    for (const [von, bis] of bereiche) code = code.slice(0, von) + " ".repeat(bis - von) + code.slice(bis);
    for (const name of code.match(/[a-z_][a-z0-9_]*/g) || []) namen.add(name);
    return { pfad, text: bereiche.map(([von, bis]) => quelle.slice(von, bis)).join("\n") };
  });
  for (const { pfad, text } of stuecke) {
    const woerter = verdaechtig(text).filter((wort) => {
      if (wort === wort.toLowerCase() && namen.has(wort)) return false;
      // In Großbuchstaben ist SS richtig, nur ae, oe, ue wären Ersatz.
      if (wort === wort.toUpperCase()) return /(?<![AEOUQ])(AE|OE|UE)/.test(wort);
      return true;
    });
    if (woerter.length) funde.push(`${relative(ROOT, pfad)}: ${[...new Set(woerter)].join(", ")}`);
  }

  assert(funde.length === 0, `ASCII-Ersatz statt Umlaut:\n    ${funde.join("\n    ")}`);
  return `${blaetter.length} Blätter, ${werkzeuge.length} Werkzeuge, ${quellen.length} Dateien der Vorlage und der Muster`;
});

/**
 * Wo in einer Datei der Vorlage deutscher Inhalt steht, als Bereiche
 * `[von, bis]`: Kommentare, Zeichenketten mit Leerraum (ohne SQL und ohne
 * `${}`-Einschübe), Text zwischen JSX-Tags, in Markdown alles außerhalb von
 * Codeblöcken. Codespannen in Backticks bleiben draußen: dort stehen Namen.
 */
function prosaBereiche(quelle, pfad) {
  const raus = [];
  const ohneSpannen = (von, bis) => {
    let anfang = von;
    let offen = false;
    for (let i = von; i < bis; i++) {
      if (quelle[i] === "\n") offen = false;
      if (quelle[i] !== "`") continue;
      if (!offen) raus.push([anfang, i]);
      else anfang = i + 1;
      offen = !offen;
    }
    if (!offen) raus.push([anfang, bis]);
  };
  const name = pfad.split(/[\\/]/).pop();
  const muster = (re, vorn, hinten) => {
    for (const m of quelle.matchAll(re)) ohneSpannen(m.index + vorn, m.index + m[0].length - hinten);
    return raus;
  };
  if (name.endsWith(".sql")) return muster(/--.*/g, 2, 0);
  if (name.endsWith(".css")) return muster(/\/\*[\s\S]*?\*\//g, 2, 2);
  if (name === "Dockerfile") return muster(/#.*/g, 1, 0);
  if (name.endsWith(".html")) return muster(/<!--[\s\S]*?-->/g, 4, 3);
  if (name.endsWith(".json")) {
    for (const m of quelle.matchAll(/"((?:[^"\\]|\\.)*)"/g)) {
      if (/\s/.test(m[1]) && !/--|&&/.test(m[1])) ohneSpannen(m.index + 1, m.index + m[0].length - 1);
    }
    return raus;
  }
  if (name.endsWith(".md")) {
    let pos = 0;
    for (const m of quelle.matchAll(/^```[\s\S]*?^```/gm)) {
      ohneSpannen(pos, m.index);
      pos = m.index + m[0].length;
    }
    ohneSpannen(pos, quelle.length);
    return raus;
  }
  const code = [];
  let codeAnfang = 0;
  let letztes = "";
  let i = 0;
  while (i < quelle.length) {
    const c = quelle[i];
    const d = quelle[i + 1];
    if (c === "/" && (d === "/" || d === "*")) {
      code.push([codeAnfang, i]);
      const ende = d === "/" ? quelle.indexOf("\n", i) : quelle.indexOf("*/", i + 2);
      const bis = ende < 0 ? quelle.length : ende;
      ohneSpannen(i + 2, bis);
      i = d === "/" ? bis : bis + 2;
      codeAnfang = i;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      code.push([codeAnfang, i]);
      let j = i + 1;
      let tiefe = 0;
      let start = i + 1;
      const teile = [];
      while (j < quelle.length) {
        const z = quelle[j];
        if (z === "\\") { j += 2; continue; }
        if (c === "`" && !tiefe && z === "$" && quelle[j + 1] === "{") { teile.push([start, j]); tiefe = 1; j += 2; continue; }
        if (tiefe) {
          if (z === "{") tiefe += 1;
          else if (z === "}" && --tiefe === 0) start = j + 1;
          j += 1;
          continue;
        }
        if (z === c || (c !== "`" && z === "\n")) break;
        j += 1;
      }
      teile.push([start, j]);
      const inhalt = teile.map(([von, bis]) => quelle.slice(von, bis)).join(" ");
      const sql = /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|VALUES)\b/.test(inhalt);
      if (!sql && /\s/.test(inhalt.trim())) {
        if (c === "`") raus.push(...teile);
        else ohneSpannen(i + 1, j);
      }
      i = j + 1;
      codeAnfang = i;
      letztes = c;
      continue;
    }
    // Ein regulärer Ausdruck ist Code, auch wenn er Buchstaben trägt.
    if (c === "/" && (letztes === "" || "(,=:[!&|?{};".includes(letztes))) {
      let j = i + 1;
      let klasse = false;
      while (j < quelle.length && quelle[j] !== "\n") {
        if (quelle[j] === "\\") { j += 2; continue; }
        if (quelle[j] === "[") klasse = true;
        else if (quelle[j] === "]") klasse = false;
        else if (quelle[j] === "/" && !klasse) break;
        j += 1;
      }
      i = j + 1;
      letztes = "/";
      continue;
    }
    if (!/\s/.test(c)) letztes = c;
    i += 1;
  }
  code.push([codeAnfang, quelle.length]);
  if (name.endsWith(".tsx")) {
    for (const [von, bis] of code) {
      for (const m of quelle.slice(von, bis).matchAll(/>([^<>{}=;()]*[A-Za-zÄÖÜäöüß][^<>{}=;()]*)(?=[<{])/g)) {
        raus.push([von + m.index + 1, von + m.index + 1 + m[1].length]);
      }
    }
  }
  return raus;
}

check("Jede Route steht in beiden Fassungen des Blattes", () => {
  // Eine Uebersetzung, die eine Route verliert, faellt sonst erst am Geraet auf,
  // und dann nur in einer Sprache. Geprueft wird Blatt gegen Blatt: dieselben
  // Routen, egal in welcher Sprache der Absatz geschrieben ist.
  const dir = join(ROOT, ".ara", "knowledge");
  const abweichend = [];
  for (const name of readdirSync(dir).filter((n) => n.endsWith(".md") && !isVariant(n))) {
    const german = name.replace(/\.md$/, ".de.md");
    if (!existsSync(join(dir, german))) continue;
    const routes = (file) =>
      new Set(
        collectRoutes([{ file, text: readFileSync(join(dir, file), "utf8") }]).map((r) => `${r.verb} ${r.path}`)
      );
    const links = routes(name);
    const rechts = routes(german);
    const nurEnglisch = [...links].filter((r) => !rechts.has(r));
    const nurDeutsch = [...rechts].filter((r) => !links.has(r));
    if (nurEnglisch.length) abweichend.push(`${german} fehlt: ${nurEnglisch.join(", ")}`);
    if (nurDeutsch.length) abweichend.push(`${name} fehlt: ${nurDeutsch.join(", ")}`);
  }
  assert(abweichend.length === 0, `Routen nur in einer Sprache:\n    ${abweichend.join("\n    ")}`);
});

check("Der Selbsttest loescht keine Akte, die ihm nicht gehoert", () => {
  // Am 28.08.2026 raeumte dieser Selbsttest nach einem Trockenlauf `devices/orin`
  // und `devices/mac` weg, obwohl ein Trockenlauf nichts anlegt. Auf dem Rechner,
  // auf dem ein Orin wirklich stand, loeschte jeder Lauf dessen Akte samt
  // Laufzettel. Wer hier einen Namen loescht, der nicht dem Selbsttest gehoert,
  // loescht die Arbeit eines Menschen.
  const quelle = readFileSync(join(ROOT, ".ara", "tools", "selftest.mjs"), "utf8");
  const treffer = [];
  const muster = /rmSync\(\s*join\(\s*ROOT\s*,\s*"(devices|customers|apps)"\s*,\s*"([^"]+)"/g;
  for (const fund of quelle.matchAll(muster)) {
    const [, ordner, name] = fund;
    if (/^_?selftest-/.test(name)) continue;
    treffer.push(`${ordner}/${name}`);
  }
  assert(treffer.length === 0, `geloescht wird, was dem Nutzer gehoert: ${treffer.join(", ")}`);
  return "devices, customers und apps bleiben dem Nutzer";
});

check("Ein frischer Klon spricht Englisch, das Profil stellt um", () => {
  // Vor `/init` gibt es kein Profil, und dann gilt Englisch. Geprueft an einem
  // Werkzeug, das ohne alles laeuft: die Lage der Befehle.
  //
  // Beide Faelle laufen in einem Wegwerf-Klon, und zwar seit dem 28.08.2026:
  // vorher lief der englische Fall im echten Kit, und der hat dort ein Profil,
  // sobald jemand einmal `/init` gerufen hat. Dann war die Zeile deutsch, die
  // Pruefung rot, und gemessen war nicht das Kit, sondern der Arbeitsordner.
  const fall = (profil) => {
    const dir = mkdtempSync(join(tmpdir(), "ara-lang-"));
    try {
      cpSync(join(ROOT, ".ara"), join(dir, ".ara"), { recursive: true });
      if (profil) {
        mkdirSync(join(dir, "business"), { recursive: true });
        writeFileSync(join(dir, "business", "profile.md"), profil);
      }
      const run = spawnSync("node", [join(dir, ".ara", "tools", "commands.mjs"), "--role", "partner"], {
        encoding: "utf8",
        cwd: dir,
        env: { ...process.env, ARA_LANGUAGE: "" },
      });
      assert(run.status === 0, `Lauf fehlgeschlagen: ${run.stderr}`);
      return run.stdout;
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };

  const englisch = fall(null);
  assert(/^Branch: partner, language: en$/m.test(englisch), `keine englische Ausgabe:\n${englisch}`);

  // Und die Sprache steht wirklich im Profil, nicht nur in der Umgebung.
  const deutsch = fall("---\nrole: partner\nlanguage: de\n---\n\nMeins.\n");
  assert(/^Zweig: Partner, Sprache: de$/m.test(deutsch), `das Profil stellt nicht um:\n${deutsch}`);
});

check("Keine Ausgabe steht nur auf Deutsch da", () => {
  // Eine Zeile, die ohne `t()` deutsche Woerter ausgibt, ist eine Zeile, die ein
  // englischer Nutzer nicht liest. Gesucht wird an der Ausgabestelle: console,
  // fail, new Error, und ein Block ohne `t(` darum herum.
  //
  // Der Selbsttest selbst ist ausgenommen: er ist einsprachig, siehe sein Kopf.
  const german =
    /\b(nicht|kein|keine|keinen|eine|einen|und|oder|das|der|die|dem|den|ist|sind|wird|wurde|noch|schon|steht|gibt|von|fuer|für|Gerät|Geraet|Datei|Akte)\b/;
  const emitting = /(console\.(log|error)\(|fail\(|new Error\()/;
  const offenders = [];

  const scan = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(path);
        continue;
      }
      if (!entry.name.endsWith(".mjs") || entry.name === "selftest.mjs") continue;
      // Blockkommentare fallen weg, ihre Zeilen bleiben leer stehen: sonst
      // zieht der Kopf einer Funktion die Ausgabezeile darueber mit hinein.
      const source = readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, (block) =>
        block.replace(/[^\n]/g, " ")
      );
      const lines = source.split(/\r?\n/);
      lines.forEach((line, index) => {
        // Der Kommentar hinter dem Code zaehlt nicht: dort steht die Begruendung.
        if (!emitting.test(line.split("//")[0])) return;
        const block = lines.slice(index, index + 10).join("\n");
        if (/\bt\(/.test(block)) return;
        const strings = [...block.matchAll(/(["`])((?:(?!\1).){6,})\1/g)].map((m) => m[2]).join(" ");
        if (german.test(strings)) offenders.push(`${relative(ROOT, path)}:${index + 1}`);
      });
    }
  };
  scan(join(ROOT, ".ara", "tools"));

  assert(offenders.length === 0, `nur auf Deutsch: ${offenders.slice(0, 10).join(", ")}`);
});

check("Jede Kopfhilfe traegt beide Sprachen", () => {
  // `--help` ist der Kommentarblock am Anfang der Datei, und darin stehen beide
  // Sprachen untereinander. Fehlt die Trennlinie, antwortet das Werkzeug auf
  // Deutsch mit englischem Text, ohne dass es jemandem auffaellt.
  const dir = join(ROOT, ".ara", "tools");
  const tools = readdirSync(dir)
    .filter((name) => name.endsWith(".mjs") && name !== "guard.mjs")
    .sort();
  const einsprachig = [];
  for (const name of tools) {
    const url = new URL(`./${name}`, import.meta.url).href;
    const en = headerHelp(url, "en");
    const de = headerHelp(url, "de");
    if (en === de) einsprachig.push(name);
  }
  assert(
    einsprachig.length === 0,
    `Kopfhilfe nur in einer Sprache (${HELP_SPLIT} fehlt): ${einsprachig.join(", ")}`
  );
  return `${tools.length} Werkzeuge`;
});

check("Die Befehle werden in der Sprache des Profils angelegt", () => {
  const dir = mkdtempSync(join(tmpdir(), "ara-cmd-lang-"));
  try {
    cpSync(join(ROOT, ".ara"), join(dir, ".ara"), { recursive: true });
    cpSync(join(ROOT, ".claude"), join(dir, ".claude"), { recursive: true });
    for (const name of readdirSync(join(dir, ".claude", "commands"))) {
      if (name !== "init.md") rmSync(join(dir, ".claude", "commands", name));
    }
    const laufen = (lang) =>
      spawnSync("node", [join(dir, ".ara", "tools", "commands.mjs"), "--apply", "--role", "partner", "--language", lang], {
        encoding: "utf8",
        cwd: dir,
        env: { ...process.env, ARA_LANGUAGE: "" },
      });

    let run = laufen("de");
    assert(run.status === 0, `deutscher Lauf fehlgeschlagen: ${run.stderr}`);
    let angelegt = readFileSync(join(dir, ".claude", "commands", "offer.md"), "utf8");
    assert(/^description: Angebot mit allen/m.test(angelegt), `nicht die deutsche Fassung:\n${angelegt.slice(0, 120)}`);

    run = laufen("en");
    assert(run.status === 0, `englischer Lauf fehlgeschlagen: ${run.stderr}`);
    angelegt = readFileSync(join(dir, ".claude", "commands", "offer.md"), "utf8");
    assert(/^description: Offer with all/m.test(angelegt), `nicht die englische Fassung:\n${angelegt.slice(0, 120)}`);
    assert(!existsSync(join(dir, ".claude", "commands", "offer.de.md")), "die Sprachfassung landet unter ihrem eigenen Namen");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

check("Ein Unternehmen bekommt bei /init keine Partnerware, ein Partner alles", () => {
  // Befund vom 30.08.2026: BRANCHES schnitt nur die Befehle nach Zweig. Skills,
  // Vorlagen und Wissen kamen zweigblind mit dem Klon, und ein Unternehmen, das
  // nach /init die Skills sales, pricing und customers und einen Ordner
  // customers/ sah, hielt das Kit fuer ein Haendlerwerkzeug. Geprueft wird in
  // einer Wegwerfkopie: der Schnitt fuer das Unternehmen, und dass der Partner
  // nichts davon verliert.
  if (!PARTNER_MATERIAL) return OHNE_PARTNERWARE;
  // Die Liste muss auf Dateien zeigen, die es gibt: ein Eintrag ins Leere
  // schneidet nichts und faellt sonst nie auf.
  for (const rel of PARTNER_ONLY) assert(existsSync(join(ROOT, rel)), `PARTNER_ONLY nennt ${rel}, das gibt es nicht`);
  assert(partnerOnly(".claude/skills/sales/SKILL.md") && !partnerOnly(".claude/skills/salesx/SKILL.md"), "partnerOnly trifft daneben");

  const fall = (role) => {
    const dir = mkdtempSync(join(tmpdir(), `ara-zweig-${role}-`));
    try {
      cpSync(join(ROOT, ".ara"), join(dir, ".ara"), {
        recursive: true,
        filter: (src) => !/\/(mirror|node_modules)(\/|$)/.test(src),
      });
      cpSync(join(ROOT, ".claude"), join(dir, ".claude"), { recursive: true });
      // Ein Repository wie der Klon: der Schnitt darf ihn nicht schmutzig machen.
      const git = (...args) =>
        spawnSync("git", ["-c", "user.name=Selbsttest", "-c", "user.email=selbsttest@example.invalid", ...args], { cwd: dir, encoding: "utf8" });
      git("init", "-q", "-b", "main");
      git("add", "-A");
      git("commit", "-q", "--no-gpg-sign", "-m", "klon");
      mkdirSync(join(dir, "customers"), { recursive: true });
      const run = spawnSync("node", [join(dir, ".ara", "tools", "commands.mjs"), "--apply", "--role", role, "--language", "de"], {
        encoding: "utf8",
        cwd: dir,
        env: { ...process.env, ARA_LANGUAGE: "" },
      });
      assert(run.status === 0, `${role}: --apply fehlgeschlagen: ${run.stderr}`);
      const da = PARTNER_ONLY.filter((rel) => existsSync(join(dir, rel)));
      const schmutzig = git("status", "--porcelain", "--untracked-files=no").stdout.trim();
      return { run, da, customers: existsSync(join(dir, "customers")), schmutzig };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };

  const firma = fall("company");
  assert(firma.da.length === 0, `Unternehmen behaelt Partnerware: ${firma.da.join(", ")}`);
  assert(!firma.customers, "Unternehmen behaelt den leeren Ordner customers/");
  assert(/removed because|weggeräumt/.test(firma.run.stdout), `der Schnitt wird nicht genannt: ${firma.run.stdout}`);
  assert(/update\.mjs/.test(firma.run.stdout), "der Weg zurueck zum Partner wird nicht genannt");
  assert(!firma.schmutzig, `nach dem Schnitt ist der Klon schmutzig:\n${firma.schmutzig}`);
  assert(/skip-worktree/.test(firma.run.stdout), "es steht nicht da, dass Git die Dateien als abwesend zählt");

  const partner = fall("partner");
  assert(partner.da.length === PARTNER_ONLY.length, `Partner verliert: ${PARTNER_ONLY.filter((r) => !partner.da.includes(r)).join(", ")}`);
  assert(partner.customers, "Partner verliert den Ordner customers/");
  assert(!partner.schmutzig, `beim Partner ist der Klon schmutzig:\n${partner.schmutzig}`);
  return `${PARTNER_ONLY.length} Eintraege, Unternehmen ohne und Klon sauber, Partner mit`;
});

check("Der Selbsttest laesst kein customers/ im Kit zurueck", () => {
  // Der Wegwerfordner liegt unter os.tmpdir(), und alles, was diese Datei an
  // Kunden anlegt, geht dorthin. Ein `join(ROOT, "customers"` in einer
  // Pruefung waere der Rueckfall.
  const quelle = readFileSync(join(ROOT, ".ara", "tools", "selftest.mjs"), "utf8");
  const treffer = quelle
    .split("\n")
    .filter((zeile) => /join\(ROOT, "customers"/.test(zeile) && !/inOwnFolder/.test(zeile) && !/^\s*\/\//.test(zeile));
  assert(treffer.length === 0, `Kunden im Kit statt im Wegwerfordner:\n    ${treffer.join("\n    ")}`);
  assert(CUSTOMERS_TMP.startsWith(tmpdir()), `der Wegwerfordner liegt nicht unter tmpdir: ${CUSTOMERS_TMP}`);
  return relative(tmpdir(), CUSTOMERS_TMP);
});

// --- Verweise ---------------------------------------------------------------

check("Verweise im Kit zeigen auf vorhandene Dateien", () => {
  const files = [];
  const rootSheet = (file) =>
    /^\.ara\/(knowledge|commands\/all)\/root(\.de)?\.md$/.test(relative(ROOT, file).split("\\").join("/")) ||
    file.startsWith(ROOT_TEMPLATE) ||
    file.startsWith(ROOT_METHOD) ||
    file.startsWith(ROOT_EXAMPLE);
  const collect = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (skipEntry(path, entry.name)) continue;
      if (entry.isDirectory()) collect(path);
      else if (/\.(md|json)$/.test(entry.name)) files.push(path);
    }
  };
  collect(join(ROOT, ".ara"));
  collect(join(ROOT, ".claude"));
  files.push(join(ROOT, "README.md"));

  const missing = [];
  for (const file of files) {
    const content = readFileSync(file, "utf8");
    const paths = /(?:^|[\s`("])((?:\.(?:ara|claude)|vorlagen|nachweise)\/[A-Za-z0-9._\/-]+)/g;
    for (const match of content.matchAll(paths)) {
      const target = match[1].replace(/[.,)`]+$/, "");
      if (target.includes("*") || target.endsWith("/")) continue;
      // Der Spiegel und der Merker entstehen erst zur Laufzeit.
      if (target.startsWith(".ara/mirror/") || target === ".ara/state.json") continue;
      // Der Schnitt eines Unternehmens nimmt die Partnerware heraus. Die
      // Verweise darauf stehen weiter in CLAUDE.md und in den Befehlsquellen,
      // denn die sind in beiden Zweigen dieselben Dateien: hier kein Rost.
      if (!PARTNER_MATERIAL && partnerOnly(target)) continue;
      if (existsSync(join(ROOT, target))) continue;
      // Das Wissen zur Firmenwurzel nennt Dateien, die in der WURZEL liegen und
      // nicht im Kit. Gegen die Liste dessen, was das Werkzeug wirklich anlegt,
      // und nur in den Blaettern, die davon handeln: sonst waere es ein Freibrief.
      if (rootSheet(file) && (ROOT_TARGETS.has(target) || METHOD_TARGETS.has(target))) continue;
      missing.push(`${relative(ROOT, file)} → ${target}`);
    }
  }
  assert(missing.length === 0, `tote Verweise:\n    ${missing.join("\n    ")}`);
  return `${files.length} Dateien`;
});

check("Jeder genannte Befehl hat seine Datei", () => {
  // Die Verweispruefung oben sieht nur Dateipfade in Backticks. Ein Command
  // heisst aber /offer und nicht .claude/commands/offer.md, also ist er ihr
  // zweimal durchgerutscht: der Angebotsbefehl stand in CLAUDE.md, im README und in den
  // Vorlagen, und die Datei dazu gab es nie. Ein Partner liest davon, tippt es,
  // und es passiert nichts.
  //
  // Findet die Pruefung einen Befehl, den es absichtlich noch nicht gibt, ist
  // das eine Aussage ueber das Repo und nicht ueber die Pruefung.
  const files = [];
  // Die Vorlage einer App ist Quelltext und keine Anleitung: ein Pfad wie
  // /gesund im Manifest ist ein Weg in ihrem Backend und kein Befehl.
  const template = join(ROOT, ".ara", "templates", "app");
  const collect = (dir) => {
    if (dir === template) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (skipEntry(path, entry.name)) continue;
      if (entry.isDirectory()) collect(path);
      else if (/\.(md|json)$/.test(entry.name)) files.push(path);
    }
  };
  collect(join(ROOT, ".ara"));
  collect(join(ROOT, ".claude"));
  files.push(join(ROOT, "README.md"));
  // .env.example ist kein Markdown und stand darum nie in dieser Pruefung. Sie
  // nannte bis zum 28.08.2026 /start, den es seit E1 nicht mehr gibt, und sie
  // ist genau die Datei, die ein Fremder als Erstes aufmacht.
  files.push(join(ROOT, ".env.example"));

  // Ein Befehl steht am Wortanfang und hoert vor dem naechsten Schraegstrich
  // auf. Der Lookahead haelt Pfade wie /dev/disk0 und Verhaeltnisse wie
  // "und/oder" heraus, das fuehrende Zeichen die Pfade wie .ara/tools.
  const commandPattern = /(?:^|[\s`("*|,])\/([a-z][a-z0-9-]{2,})(?![\w\/-])/g;
  const found = new Map();
  for (const file of files) {
    for (const match of readFileSync(file, "utf8").matchAll(commandPattern)) {
      const name = match[1];
      if (!found.has(name)) found.set(name, new Set());
      found.get(name).add(relative(ROOT, file));
    }
  }

  // Quelle der Befehle ist .ara/commands/, nur init.md liegt direkt in
  // .claude/commands/. Was dort sonst liegt, ist erzeugt und zaehlt nicht.
  const exists = (name) =>
    (name === "init" && existsSync(join(ROOT, ".claude", "commands", "init.md"))) ||
    ["all", "partner"].some((group) =>
      existsSync(join(ROOT, ".ara", "commands", group, `${name}.md`))
    );
  const missing = [];
  for (const [name, where] of found) {
    if (exists(name)) continue;
    // Ein abgeloester Befehl hat absichtlich keine Datei. Genannt werden darf er
    // trotzdem, aber nur zusammen mit dem Namen, unter dem es ihn heute gibt:
    // sonst liest jemand von einem Befehl, den er nicht aufrufen kann.
    if (RETIRED[name]) {
      const ohneNachfolger = [...where].filter(
        (file) => !new RegExp(`/${RETIRED[name]}\\b`).test(readFileSync(join(ROOT, file), "utf8"))
      );
      if (ohneNachfolger.length) {
        missing.push(
          `/${name} ist abgeloest durch /${RETIRED[name]}, aber in ${ohneNachfolger.join(", ")} ` +
            "steht der neue Name nicht daneben"
        );
      }
      continue;
    }
    missing.push(`/${name} fehlt in .ara/commands/, genannt in ${[...where].join(", ")}`);
  }
  assert(missing.length === 0, `Befehle ohne Datei:\n    ${missing.join("\n    ")}`);
  const abgeloest = [...found.keys()].filter((name) => RETIRED[name]).length;
  return `${found.size} Befehle genannt, alle vorhanden${abgeloest ? `, ${abgeloest} abgeloest und mit Nachfolger genannt` : ""}`;
});

check("Die Vorlage der .env nennt einen Befehl, den es gibt", () => {
  // Sie ist die erste Datei, die ein Fremder aufmacht, und sie schickte ihn bis
  // zum 28.08.2026 zu /start. Den Befehl gibt es seit E1 nicht mehr.
  const text = readFileSync(join(ROOT, ".env.example"), "utf8");
  for (const [alt, neu] of Object.entries(RETIRED)) {
    assert(
      !new RegExp(`/${alt}\\b`).test(text) || new RegExp(`/${neu}\\b`).test(text),
      `.env.example nennt /${alt}, den Befehl gibt es nicht mehr, er heisst /${neu}`
    );
  }
  assert(/\/init\b/.test(text), ".env.example sagt nicht, welcher Befehl daraus die echte .env macht");
  assert(/secrets\.mjs --set/.test(text), ".env.example sagt nicht, wie man einen Wert einträgt, ohne sie zu öffnen");
});

check("Jeder Befehl nennt sein Wissen", () => {
  // Die Wissensdateien sind die Kontextschicht: ein Befehl sagt, welche er laedt,
  // statt dass Ara den ganzen Ordner liest. Wer keine nennt, laedt entweder alles
  // oder nichts, und beides ist falsch.
  const files = [join(ROOT, ".claude", "commands", "init.md")];
  for (const group of ["all", "partner"]) {
    const dir = join(ROOT, ".ara", "commands", group);
    for (const name of readdirSync(dir)) files.push(join(dir, name));
  }
  // Der Satz heisst in beiden Sprachen anders und meint dasselbe. Geprueft wird
  // jede Fassung: eine Uebersetzung, die den Satz verliert, laedt entweder alles
  // oder nichts, und dann faellt es nur in einer Sprache auf.
  const names = /(Wissen, das dieser Befehl\s+lädt:|Knowledge this command\s+loads:)/;
  const silent = files.filter((file) => {
    const content = readFileSync(file, "utf8");
    return !names.test(content) || !/\.ara\/knowledge\/[a-z.-]+\.md/.test(content);
  });
  assert(silent.length === 0, `ohne Wissensangabe: ${silent.map((f) => relative(ROOT, f)).join(", ")}`);
  return `${files.length} Befehle`;
});

/**
 * Was /app fuer eine Fach-App liest, in der Reihenfolge, in der es dazukommt.
 * Der Befehl nennt jede Wissensdatei selbst; die Blaetter der Muster nennt das
 * Blatt der Muster, und eine Fach-App mit Belegen und Mandanten nimmt drei davon.
 */
const FACH_APP_LADESATZ = {
  immer: [".claude/CLAUDE.md"],
  sprache: [
    ".ara/persona/ara",
    ".ara/commands/all/app",
    ".ara/knowledge/app",
    ".ara/knowledge/app-patterns",
    ".ara/knowledge/app-professional",
    ".ara/knowledge/platform-services",
    ".ara/knowledge/design-system",
    ".ara/knowledge/deploy",
    ".ara/templates/app-patterns/documents/README",
    ".ara/templates/app-patterns/extract/README",
    ".ara/templates/app-patterns/clients/README",
    ".ara/templates/app-patterns/receipts/README",
  ],
};
/** Die Grenze aus dem Auftrag K17: gemessen wie `wc -w`, mal 1,4. */
const FACH_APP_GRENZE = 15000;

check("Der Ladesatz von /app fuer eine Fach-App bleibt unter 15.000 Tokens, in beiden Sprachen", () => {
  // Bis 0.36.0 las /app fuer eine Fach-App rund 31.000 Tokens, davon ein
  // Zehntel doppelt. Ein Agent mit einem schlanken Kern und gezielt
  // nachgeladenem Fachwissen baut besser und billiger. Gezaehlt wird wie mit
  // `wc -w`: alles zwischen Leerraum ist ein Wort.
  const woerter = (datei) => readFileSync(join(ROOT, datei), "utf8").split(/\s+/).filter(Boolean).length;
  const messung = [];
  for (const [sprache, endung] of [["en", ".md"], ["de", ".de.md"]]) {
    const dateien = [...FACH_APP_LADESATZ.immer, ...FACH_APP_LADESATZ.sprache.map((d) => d + endung)];
    for (const datei of dateien) assert(existsSync(join(ROOT, datei)), `${datei} fehlt im Ladesatz`);
    const summe = dateien.reduce((n, datei) => n + woerter(datei), 0);
    const tokens = Math.round(summe * 1.4);
    assert(tokens <= FACH_APP_GRENZE, `${sprache}: ${summe} Wörter, ${tokens} Tokens, erlaubt sind ${FACH_APP_GRENZE}`);
    messung.push(`${sprache} ${tokens}`);
  }
  // Der Satz ist nur so gut wie der Befehl, der ihn nennt: jede Wissensdatei
  // steht im Befehl, das Blatt der Muster nennt die Blaetter, und extensions.md
  // gehoert nicht mehr dazu.
  for (const [befehl, muster, endung] of [
    [".ara/commands/all/app.md", ".ara/knowledge/app-patterns.md", ".md"],
    [".ara/commands/all/app.de.md", ".ara/knowledge/app-patterns.de.md", ".de.md"],
  ]) {
    const text = readFileSync(join(ROOT, befehl), "utf8");
    for (const datei of FACH_APP_LADESATZ.sprache.filter((d) => d.startsWith(".ara/knowledge/"))) {
      assert(text.includes(datei + endung), `${befehl} nennt ${datei + endung} nicht`);
    }
    assert(!/knowledge\/extensions/.test(text), `${befehl} lädt extensions noch mit`);
    const blatt = readFileSync(join(ROOT, muster), "utf8");
    for (const datei of FACH_APP_LADESATZ.sprache.filter((d) => d.startsWith(".ara/templates/"))) {
      assert(blatt.includes(datei + endung), `${muster} nennt ${datei + endung} nicht`);
    }
  }
  return messung.join(", ");
});

check("Verweise auf Abschnitte treffen eine Ueberschrift in der Sprache des Blattes", () => {
  // Ein englisches Blatt schickte nach „Der Kit-Schlüssel", ein Abschnitt,
  // den es nur im deutschen Blatt gibt. Wer Englisch liest, sucht ihn dort
  // vergeblich. Geprueft wird jeder Verweis der Form `datei.md`, "Titel" (auch
  // mit section, under, unter, Abschnitt dazwischen) gegen die Ueberschriften
  // des Blattes in der Sprache dessen, der verweist, und jedes „siehe" auf
  // einen Abschnitt desselben Blattes. Das Aenderungsprotokoll ist Geschichte
  // und bleibt draussen.
  const dateien = [];
  const sammle = (dir, passt) => {
    for (const eintrag of readdirSync(dir, { withFileTypes: true })) {
      const pfad = join(dir, eintrag.name);
      if (skipEntry(pfad, eintrag.name) || eintrag.name === "node_modules") continue;
      if (eintrag.isDirectory()) sammle(pfad, passt);
      else if (passt.test(eintrag.name)) dateien.push(pfad);
    }
  };
  sammle(join(ROOT, ".ara"), /\.(md|mjs)$/);
  sammle(join(ROOT, ".claude"), /\.md$/);
  dateien.push(join(ROOT, "README.md"));
  const titel = (pfad) =>
    new Set(
      readFileSync(pfad, "utf8")
        .split("\n")
        .filter((zeile) => /^#{1,6} /.test(zeile))
        .flatMap((zeile) => {
          const text = zeile.replace(/^#+ /, "").trim();
          return [text, text.replace(/^\d+\. /, "")];
        })
    );
  // Deutsch ist, was .de.md heisst, das Papier, und die Vorlage einer App,
  // deren Quelltext und README deutsch sind.
  const deutsch = (rel) => /\.de\.md$/.test(rel) || /^\.ara\/(vorlagen|nachweise|templates\/app)\//.test(rel);
  const verweis = /(\.ara\/knowledge\/[a-z0-9\/-]+?)(\.de)?\.md`?,?\s+(?:(?:section|under|unter|Abschnitt|im Abschnitt)\s+)?["„]([^"“”\n]{2,80})["“”]/g;
  const siehe = /\b(?:[Ss]ee|[Ss]iehe)\s+["„]([^"“”\n]{2,80})["“”]/g;
  const falsch = [];
  let gezaehlt = 0;
  for (const datei of dateien) {
    const rel = relative(ROOT, datei).split("\\").join("/");
    if (/CHANGELOG/.test(rel) || rel === ".ara/tools/selftest.mjs") continue;
    const text = readFileSync(datei, "utf8").replace(/\\"/g, '"');
    for (const treffer of text.matchAll(verweis)) {
      const [, basis, de, gesucht] = treffer;
      // Im Code steht die Sprache am Pfad, in einem Blatt am Blatt selbst.
      const sprache = datei.endsWith(".mjs") ? (de ? "de" : "en") : deutsch(rel) ? "de" : "en";
      const ziel = basis + (sprache === "de" ? ".de.md" : ".md");
      gezaehlt++;
      if (!existsSync(join(ROOT, ziel))) falsch.push(`${rel} → ${ziel} gibt es nicht`);
      else if (!titel(join(ROOT, ziel)).has(gesucht)) falsch.push(`${rel} → ${ziel} hat keinen Abschnitt "${gesucht}"`);
    }
    if (!datei.endsWith(".md")) continue;
    for (const treffer of text.matchAll(siehe)) {
      if (/\.md`?,?\s*$/.test(text.slice(Math.max(0, treffer.index - 80), treffer.index))) continue;
      gezaehlt++;
      if (!titel(datei).has(treffer[1])) falsch.push(`${rel} verweist auf "${treffer[1]}", das Blatt hat keinen solchen Abschnitt`);
    }
  }
  assert(gezaehlt >= 20, `nur ${gezaehlt} Verweise gefunden, das Muster greift nicht`);
  assert(falsch.length === 0, `Verweise ins Leere:\n    ${falsch.join("\n    ")}`);
  return `${gezaehlt} Verweise`;
});

/**
 * In welcher Sprache eine Zeichenkette eines Werkzeugs steht, an ihren Wörtern.
 * `null`, wenn sie es nicht verrät: dann entscheiden die Zeilen davor.
 */
function spracheDesSatzes(text) {
  const de = (text.match(/[äöüßÄÖÜ]|\b(und|der|die|das|nach|steht|stehen|Verfahren|nicht|eine?|dann|noch|Weg|mit|für|aus|sie|Zugang|Schlüssel|Kit beantwortet)\b/g) || []).length;
  const en = (text.match(/\b(the|and|along|stands|then|with|procedure|of|from|them|Way|Harden|Roll|Establish|Procedure)\b/g) || []).length;
  if (de > en) return "de";
  if (en > de) return "en";
  return null;
}

check("Jeder genannte Wissenspfad existiert nach jedem init-Zweig und in jeder Sprache", () => {
  // Befund vom 26.09.2026: device.de.md schickte ein Unternehmen nach
  // sales.de.md, das /init im Firmenzweig wegräumt, und device.mjs nannte bei
  // language de das englische device.md. Beides fiel keiner Prüfung auf: die
  // Verweisprüfung oben sieht den ganzen Klon in beiden Sprachen, nicht das,
  // was ein Zweig in seiner Sprache nach /init liest. Hier wird jeder Zweig in
  // jeder Sprache wirklich angelegt, und von seinen Befehlen, der Persona und
  // den Skills aus wird jedem genannten Wissenspfad gefolgt, so weit er führt.
  if (!PARTNER_MATERIAL) return OHNE_PARTNERWARE;
  const pfad = /\.ara\/knowledge\/[a-z0-9\/-]+?(?:\.de)?\.md/g;
  const deutsch = (rel) => /\.de\.md$/.test(rel);
  // SKILL.md und CLAUDE.md stehen in einer Sprache für beide Zweige.
  const sprachlos = (rel) => /^\.claude\//.test(rel);
  const befunde = new Set();
  let gefolgt = 0;

  // Die Werkzeuge: jede Zeichenkette, die ein Wissensblatt nennt, in der
  // Sprache ihres Satzes. Kommentare zählen nicht, sie gibt kein Werkzeug aus.
  // Die Liste der Partnerware nennt die Dateien, die der Schnitt wegnimmt.
  const werkzeugPfade = [];
  const werkzeuge = [join(ROOT, ".ara", "tools"), join(ROOT, ".ara", "tools", "lib")];
  for (const ordner of werkzeuge) {
    for (const name of readdirSync(ordner)) {
      if (!name.endsWith(".mjs") || name === "selftest.mjs" || name === "commands.mjs") continue;
      const zeilen = readFileSync(join(ordner, name), "utf8").split("\n");
      zeilen.forEach((zeile, i) => {
        if (/^\s*(\*|\/\/|\/\*)/.test(zeile)) return;
        // Was nur beim Partner ausgegeben wird, steht hinter `partnerMaterial ?`
        // und fragt vorher, ob das Blatt da ist.
        const nurPartner = /partnerMaterial \?/.test(zeile);
        for (const lit of zeile.matchAll(/"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`|'((?:[^'\\]|\\.)*)'/g)) {
          const inhalt = lit[1] ?? lit[2] ?? lit[3] ?? "";
          const genannt = inhalt.match(pfad);
          if (!genannt) continue;
          const sprache = spracheDesSatzes(inhalt) ?? spracheDesSatzes(zeilen.slice(Math.max(0, i - 3), i + 1).join(" "));
          for (const ziel of genannt) werkzeugPfade.push({ wo: `${relative(ROOT, join(ordner, name))}:${i + 1}`, ziel, sprache, nurPartner });
        }
      });
    }
  }
  assert(werkzeugPfade.length >= 10, `nur ${werkzeugPfade.length} Wissenspfade in den Werkzeugen gefunden, das Muster greift nicht`);

  for (const role of ["company", "partner"]) {
    for (const lang of ["de", "en"]) {
      const dir = mkdtempSync(join(tmpdir(), `ara-pfade-${role}-${lang}-`));
      try {
        cpSync(join(ROOT, ".ara"), join(dir, ".ara"), { recursive: true, filter: (src) => !/\/(mirror|node_modules|templates\/app\/frontend\/src\/marken)(\/|$)/.test(src) });
        cpSync(join(ROOT, ".claude"), join(dir, ".claude"), { recursive: true });
        const run = spawnSync("node", [join(dir, ".ara", "tools", "commands.mjs"), "--apply", "--role", role, "--language", lang], {
          encoding: "utf8",
          cwd: dir,
          env: { ...process.env, ARA_LANGUAGE: "" },
        });
        assert(run.status === 0, `${role}/${lang}: --apply fehlgeschlagen: ${run.stderr}`);
        const da = (rel) => existsSync(join(dir, rel));

        // Was dieser Zweig in dieser Sprache liest: seine Befehle, die Persona
        // in seiner Sprache, die Skills, die ihm bleiben.
        const offen = [];
        const befehle = join(dir, ".claude", "commands");
        for (const name of readdirSync(befehle)) if (name.endsWith(".md")) offen.push(`.claude/commands/${name}`);
        offen.push(lang === "de" ? ".ara/persona/ara.de.md" : ".ara/persona/ara.md");
        const skills = join(dir, ".claude", "skills");
        for (const name of readdirSync(skills)) if (da(`.claude/skills/${name}/SKILL.md`)) offen.push(`.claude/skills/${name}/SKILL.md`);

        const gesehen = new Set();
        while (offen.length) {
          const rel = offen.shift();
          if (gesehen.has(rel)) continue;
          gesehen.add(rel);
          // Ein erzeugter Befehl hat die Sprache des Laufs, ein Blatt die seines
          // Namens. /init ist englisch, in jedem Zweig: es steht vor jedem Profil.
          const sprache =
            rel === ".claude/commands/init.md" ? "en" : rel.startsWith(".claude/commands/") ? lang : sprachlos(rel) ? null : deutsch(rel) ? "de" : "en";
          for (const ziel of new Set(readFileSync(join(dir, rel), "utf8").match(pfad) || [])) {
            gefolgt++;
            if (!da(ziel)) {
              befunde.add(`${role}/${lang}: ${rel} nennt ${ziel}, das es in diesem Zweig nicht gibt`);
              continue;
            }
            if (sprache === "de" && !deutsch(ziel) && da(ziel.replace(/\.md$/, ".de.md"))) {
              befunde.add(`${role}/${lang}: ${rel} ist deutsch und nennt das englische ${ziel}`);
            } else if (sprache === "en" && deutsch(ziel)) {
              befunde.add(`${role}/${lang}: ${rel} ist englisch und nennt das deutsche ${ziel}`);
            }
            offen.push(ziel);
          }
        }

        // Was die Werkzeuge ausgeben, in der Sprache des Laufs.
        for (const { wo, ziel, sprache, nurPartner } of werkzeugPfade) {
          if (sprache !== lang || (nurPartner && role !== "partner")) continue;
          gefolgt++;
          if (!da(ziel)) befunde.add(`${role}/${lang}: ${wo} gibt ${ziel} aus, das es in diesem Zweig nicht gibt`);
          else if (lang === "de" && !deutsch(ziel) && da(ziel.replace(/\.md$/, ".de.md"))) befunde.add(`${role}/${lang}: ${wo} nennt bei language de das englische ${ziel}`);
          else if (lang === "en" && deutsch(ziel)) befunde.add(`${role}/${lang}: ${wo} nennt bei language en das deutsche ${ziel}`);
        }
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  }
  assert(befunde.size === 0, `Wissenspfade ins Leere oder in der falschen Sprache:\n    ${[...befunde].join("\n    ")}`);
  return `zwei Zweige, zwei Sprachen, ${gefolgt} Verweisen gefolgt, ${werkzeugPfade.length} in den Werkzeugen`;
});

// --- Update und Befehle in einem Fork ----------------------------------------

await checkAsync("Update und Befehle laufen in einem Fork ohne Upstream", async () => {
  // Der Grundriss verspricht: ein Update ersetzt nur, was Arasul gehoert, und es
  // braucht dafuer kein git-Remote. Geprueft wird das an einem Wegwerf-Fork:
  // eine Kopie von .ara/ und .claude/, ein eigenes Profil, ein eigener Befehl,
  // ein Spiegel. Dann kommt ein neuer Stand als Archiv von einem Testserver.
  const work = mkdtempSync(join(tmpdir(), "ara-fork-"));
  const fork = join(work, "fork");
  const copy = (from, to) =>
    cpSync(from, to, {
      recursive: true,
      filter: (src) => !/\/(mirror|node_modules)(\/|$)/.test(src),
    });
  copy(join(ROOT, ".ara"), join(fork, ".ara"));
  copy(join(ROOT, ".claude"), join(fork, ".claude"));
  const write = (rel, content) => {
    mkdirSync(join(fork, rel, ".."), { recursive: true });
    writeFileSync(join(fork, rel), content);
  };
  write("business/profile.md", "---\nrole: partner\nname: Probe\n---\n\nMeins.\n");
  write(".claude/commands/eigener.md", "---\ndescription: selbst gebaut\n---\n\nMeiner.\n");
  write(".ara/mirror/STATE.json", '{"version":"probe"}');
  write(".ara/state.json", '{"customer":"probe"}');
  rmSync(join(fork, ".claude", "commands", "device.md"), { force: true });
  spawnSync("git", ["init", "-q"], { cwd: fork });

  const forkTool = (file, args, env = {}) =>
    new Promise((done) => {
      const child = spawn("node", [join(fork, ".ara", "tools", file), ...args], {
        cwd: fork,
        env: { ...process.env, ...env },
      });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (d) => (stdout += d));
      child.stderr.on("data", (d) => (stderr += d));
      child.on("close", (status) => done({ status, stdout, stderr }));
    });
  const has = (rel) => existsSync(join(fork, rel));
  const read = (rel) => readFileSync(join(fork, rel), "utf8");

  // Der neue Stand: eine Datei neu, eine geaendert, eine entfernt, ein Befehl
  // geaendert. Dazu Koeder, die nicht eingespielt werden duerfen.
  const source = join(work, "src", "ara-kit-main");
  copy(join(fork, ".ara"), join(source, ".ara"));
  copy(join(fork, ".claude"), join(source, ".claude"));
  rmSync(join(source, ".ara", "mirror"), { recursive: true, force: true });
  rmSync(join(source, ".ara", "state.json"), { force: true });
  writeFileSync(join(source, ".ara", "knowledge", "probe.md"), "# Probe\n");
  // Ein neuer Stand mit einer neuen Nummer und einem Eintrag dazu: /init soll
  // vor dem Einspielen sagen koennen, was dazukommt, und nicht nur, welche
  // Dateien sich aendern.
  //
  // Beide Nummern kommen aus dem Kit selbst. Stuenden sie hier fest, waere
  // dieser Test bei jedem Standwechsel rot, ohne dass am Update etwas fehlt.
  const stand = read(".ara/VERSION").trim();
  const neuerStand = stand.replace(/^(\d+)\.(\d+)\.\d+$/, (_, major, minor) => `${major}.${Number(minor) + 1}.0`);
  assert(neuerStand !== stand, `aus "${stand}" laesst sich keine naechste Nummer bilden`);
  writeFileSync(join(source, ".ara", "VERSION"), `${neuerStand}\n`);
  // Beide Fassungen der Aenderungsliste bekommen den neuen Eintrag: welche
  // gelesen wird, entscheidet die Sprache, und dieser Test soll in beiden gruen
  // sein. Die Kontraktzeile heisst je Fassung anders, gelesen werden beide.
  //
  // Ihre Zahl liegt ueber der des laufenden Kits, und daran haengt der ganze
  // Fall: `--check` redet ueber den geholten Stand, also muss es dessen Grenze
  // vorlesen. Nimmt es die eigene, steht unter "Neu seit" die kleinere Zahl,
  // und wer sie liest zieht nicht nach, weil er glaubt, es bringe nichts. Genau
  // so las es sich am 30.08.2026 an einem Klon auf 0.15.0.
  const fremdeGrenze = KIT_CONTRACT_VERSION + 1;
  for (const [datei, kontrakt] of [
    ["CHANGELOG.md", `Contract: up to ${fremdeGrenze}`],
    ["CHANGELOG.de.md", `Kontrakt: bis ${fremdeGrenze}`],
  ]) {
    writeFileSync(
      join(source, ".ara", datei),
      read(`.ara/${datei}`).replace(
        `## ${stand} (`,
        `## ${neuerStand} (2026-09-01)\n\n${kontrakt}\n\n- Ein erfundener Punkt fuer den Selbsttest.\n\n## ${stand} (`
      )
    );
  }
  writeFileSync(join(source, ".ara", "persona", "ara.md"), read(".ara/persona/ara.md") + "\nNeu.\n");
  // Die Entfernt-Probe: der neue Stand hat eine Datei nicht mehr. Im
  // Partnerzweig ist das sales.md. Einem Unternehmens-Klon fehlt sie schon,
  // dort weicht die Probe auf eine Datei beider Zweige aus.
  const entfernteDatei = PARTNER_MATERIAL ? ".ara/knowledge/sales.md" : ".ara/knowledge/browser.md";
  rmSync(join(source, ...entfernteDatei.split("/")));
  // Auch hier beide Sprachen: kopiert wird die Fassung, die zur Sprache passt.
  for (const datei of ["device.md", "device.de.md"]) {
    writeFileSync(
      join(source, ".ara", "commands", "all", datei),
      read(`.ara/commands/all/${datei}`) + "\nNeu im Kit.\n"
    );
  }
  mkdirSync(join(source, "business"), { recursive: true });
  writeFileSync(join(source, "business", "profile.md"), "---\nrole: company\n---\n\nKoeder.\n");
  writeFileSync(join(source, ".claude", "commands", "eigener.md"), "Koeder.\n");
  writeFileSync(join(source, ".ara", "state.json"), "Koeder.\n");
  const tar = spawnSync("tar", ["-czf", join(work, "kit.tar.gz"), "-C", join(work, "src"), "ara-kit-main"]);
  assert(tar.status === 0, "Testarchiv liess sich nicht bauen");
  const packet = readFileSync(join(work, "kit.tar.gz"));
  const server = createServer((request, response) => {
    response.writeHead(200, { "Content-Type": "application/gzip" });
    response.end(packet);
  });
  await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
  const env = { ARA_KIT_SOURCE: `http://127.0.0.1:${server.address().port}/kit.tar.gz` };

  try {
    // 1. Befehle anlegen, Zweig aus dem Profil.
    let run = await forkTool("commands.mjs", []);
    assert(run.status === 0, `Lage fehlgeschlagen: ${run.stderr}`);
    assert(/fehlt\s+\/device/.test(run.stdout), "fehlender Befehl wird nicht gemeldet");
    assert(/eigener\s+\/eigener/.test(run.stdout), "eigener Befehl wird nicht als solcher erkannt");
    run = await forkTool("commands.mjs", ["--apply"]);
    assert(run.status === 0, `Anlegen fehlgeschlagen: ${run.stderr}`);
    assert(has(".claude/commands/device.md"), "Befehl aus all/ nicht angelegt");
    assert(has(".claude/commands/customer.md"), "Befehl aus partner/ nicht angelegt");
    assert(/Meiner\./.test(read(".claude/commands/eigener.md")), "eigener Befehl ueberschrieben");

    // Ein Unternehmen bekommt die Partnerbefehle nicht.
    run = await forkTool("commands.mjs", ["--json", "--role", "company"]);
    const lage = JSON.parse(run.stdout);
    assert(!lage.commands.some((c) => c.group === "partner"), "Unternehmen bekommt Partnerbefehle");
    assert(lage.commands.some((c) => c.name === "device"), "Unternehmen bekommt all/ nicht");

    // Ohne Profil und ohne --role wird nicht geraten.
    rmSync(join(fork, "business", "profile.md"));
    run = await forkTool("commands.mjs", []);
    assert(run.status !== 0, "ohne Zweig wird geraten");
    write("business/profile.md", "---\nrole: partner\nname: Probe\n---\n\nMeins.\n");

    // 2. Update nur ansehen: nichts darf sich aendern.
    run = await forkTool("update.mjs", ["--check"], env);
    assert(run.status === 0, `--check fehlgeschlagen: ${run.stderr}`);
    assert(/neu\s+\.ara\/knowledge\/probe\.md/.test(run.stdout), "neue Datei nicht gemeldet");
    assert(new RegExp(`entfernt\\s+${entfernteDatei.replace(/\./g, "\\.")}`).test(run.stdout), "entfernte Datei nicht gemeldet");
    assert(!has(".ara/knowledge/probe.md"), "--check hat eingespielt");
    assert(run.stdout.includes(`Stand: ${neuerStand}`), `der neue Stand wird nicht genannt: ${run.stdout}`);
    assert(run.stdout.includes(`Neu seit ${stand}`), "es wird nicht gesagt, von welchem Stand es kommt");
    assert(/erfundener Punkt/.test(run.stdout), "der Eintrag der Aenderungsliste fehlt");
    assert(
      run.stdout.includes(`Kontraktfassungen bis ${fremdeGrenze}`),
      `die Vertraeglichkeit ist nicht die des geholten Standes (bis ${fremdeGrenze}): ${run.stdout}`
    );
    assert(
      !run.stdout.includes(`Kontraktfassungen bis ${KIT_CONTRACT_VERSION}`),
      `--check liest die Grenze des laufenden Kits vor: ${run.stdout}`
    );
    // Dieselbe Aussage maschinenlesbar, fuer die Auswertung.
    run = await forkTool("update.mjs", ["--check", "--json"], env);
    const lageJson = JSON.parse(run.stdout);
    assert(lageJson.contract.dort === fremdeGrenze, `--json nennt dort ${lageJson.contract.dort}`);
    assert(lageJson.contract.hier === KIT_CONTRACT_VERSION, `--json nennt hier ${lageJson.contract.hier}`);
    assert(!has(".ara/knowledge/probe.md"), "--check --json hat eingespielt");

    // 3. Einspielen.
    run = await forkTool("update.mjs", [], env);
    assert(run.status === 0, `Update fehlgeschlagen: ${run.stderr}${run.stdout}`);
    assert(has(".ara/knowledge/probe.md"), "neue Datei fehlt");
    assert(!has(entfernteDatei), "entfernte Datei liegt noch da");
    assert(/Neu\.\s*$/.test(read(".ara/persona/ara.md")), "geaenderte Datei nicht ersetzt");
    assert(/Neu im Kit/.test(read(".ara/commands/all/device.md")), "Befehlsquelle nicht ersetzt");
    // Die Koeder.
    assert(/Meins\./.test(read("business/profile.md")), "business/ wurde angefasst");
    assert(/Meiner\./.test(read(".claude/commands/eigener.md")), "erzeugter Befehl wurde angefasst");
    assert(!/Neu im Kit/.test(read(".claude/commands/device.md")), "erzeugter Befehl wurde ohne Zustimmung ersetzt");
    assert(/probe/.test(read(".ara/mirror/STATE.json")), "Spiegel wurde angefasst");
    assert(/customer/.test(read(".ara/state.json")), "Merker wurde angefasst");

    // Ein zweiter Lauf hat nichts mehr zu tun.
    run = await forkTool("update.mjs", ["--check"], env);
    assert(/Alles aktuell/.test(run.stdout), "zweiter Lauf meldet Aenderungen");

    // 4. Befehle nachziehen: der im Kit geaenderte wird gemeldet und erst mit --apply ersetzt.
    run = await forkTool("commands.mjs", []);
    assert(/neu im Kit\s+\/device/.test(run.stdout), "im Kit geaenderter Befehl wird nicht gemeldet");
    run = await forkTool("commands.mjs", ["--apply"]);
    assert(/Neu im Kit/.test(read(".claude/commands/device.md")), "geaenderter Befehl nicht ersetzt");

    // 5. Von Hand geaendert: bleibt bei --apply liegen, nur --replace ersetzt.
    write(".claude/commands/customer.md", read(".claude/commands/customer.md") + "\nMeine Zeile.\n");
    run = await forkTool("commands.mjs", []);
    assert(/angepasst\s+\/customer/.test(run.stdout), "von Hand geaenderter Befehl wird nicht erkannt");
    run = await forkTool("commands.mjs", ["--apply"]);
    assert(/Meine Zeile/.test(read(".claude/commands/customer.md")), "--apply hat die eigene Aenderung ueberschrieben");
    // Kit und Mensch haben beide geaendert.
    // Geaendert wird die Quelle, aus der der Befehl kopiert wurde, und das ist
    // die Fassung in der Sprache dieses Laufs.
    const quelle = `.ara/commands/partner/customer${TOOL_LANGUAGE === "en" ? "" : `.${TOOL_LANGUAGE}`}.md`;
    write(quelle, read(quelle) + "\nAuch neu im Kit.\n");
    run = await forkTool("commands.mjs", []);
    assert(/beides\s+\/customer/.test(run.stdout), "beidseitige Aenderung wird nicht erkannt");
    run = await forkTool("commands.mjs", ["--apply"]);
    assert(/Meine Zeile/.test(read(".claude/commands/customer.md")), "--apply hat bei beidseitiger Aenderung ersetzt");
    run = await forkTool("commands.mjs", ["--replace", "customer"]);
    assert(run.status === 0, `--replace fehlgeschlagen: ${run.stderr}`);
    assert(/Auch neu im Kit/.test(read(".claude/commands/customer.md")), "--replace hat nicht ersetzt");
    assert(!/Meine Zeile/.test(read(".claude/commands/customer.md")), "--replace hat die alte Kopie gelassen");

    // 5b. Ein abgeloester Befehl: die unveraenderte Kopie raeumt --apply weg,
    // eine angepasste bleibt liegen. Sonst haette der Partner nach dem Update
    // /angebot und /offer nebeneinander, und der alte fuehrt durch ein
    // Verfahren, das es nicht mehr gibt.
    const [alterName, nachfolger] = Object.entries(RETIRED)[0];
    const merker = JSON.parse(read(".claude/commands/.sources.json"));
    const merkeAls = (inhalt) => {
      write(`.claude/commands/${alterName}.md`, inhalt);
      merker[alterName] = createHash("sha256").update(inhalt).digest("hex");
      write(".claude/commands/.sources.json", JSON.stringify(merker, null, 2) + "\n");
    };

    merkeAls("Der alte Befehl, wie ihn das Kit hingelegt hat.\n");
    run = await forkTool("commands.mjs", []);
    assert(
      new RegExp(`abgelöst\\s+/${alterName}`).test(run.stdout),
      `abgeloester Befehl wird nicht gemeldet: ${run.stdout}`
    );
    assert(new RegExp(`/${nachfolger}`).test(run.stdout), "der neue Name wird nicht genannt");
    assert(!new RegExp(`eigener\\s+/${alterName}`).test(run.stdout), "der abgeloeste gilt als eigener Befehl");
    run = await forkTool("commands.mjs", ["--apply"]);
    assert(!has(`.claude/commands/${alterName}.md`), "die unveraenderte Kopie blieb liegen");
    assert(
      JSON.parse(read(".claude/commands/.sources.json"))[alterName] === undefined,
      "der Merker zum abgeloesten Befehl blieb stehen"
    );

    merkeAls("Der alte Befehl, wie ihn das Kit hingelegt hat.\n");
    write(`.claude/commands/${alterName}.md`, "Der alte Befehl, von Hand geaendert.\n");
    run = await forkTool("commands.mjs", ["--apply"]);
    assert(has(`.claude/commands/${alterName}.md`), "eine von Hand geaenderte Kopie wurde geloescht");
    assert(/liegen geblieben/.test(run.stdout), `das Liegenbleiben wird nicht erklaert: ${run.stdout}`);
    rmSync(join(fork, ".claude", "commands", `${alterName}.md`));

    // 6. /init ohne Interview, beide Zweige. Das Profil aus dem Fork weicht dafuer.
    rmSync(join(fork, "business"), { recursive: true, force: true });
    for (const name of readdirSync(join(fork, ".claude", "commands"))) {
      if (name !== "init.md") rmSync(join(fork, ".claude", "commands", name));
    }
    // Die Antwortdatei gibt es in beiden Sprachen, und sie entscheidet, in
    // welcher das Profil geschrieben wird. Geprueft wird die deutsche, weil ihre
    // Ueberschriften hier belegt sind; die englische kommt gleich danach.
    run = await forkTool("init.mjs", ["--answers", join(ROOT, ".ara", "templates", "init-answers-company.de.json")]);
    assert(run.status === 0, `Unternehmen: init.mjs fehlgeschlagen: ${run.stderr || run.stdout}`);
    assert(has("business/profile.md"), "Unternehmen: kein Profil");
    assert(!has("business/company.md"), "Unternehmen: company.md angelegt, obwohl es keine Angebote gibt");
    assert(/^role: company$/m.test(read("business/profile.md")), "Unternehmen: Zweig fehlt im Profil");
    assert(/^language: de$/m.test(read("business/profile.md")), "Unternehmen: Sprache fehlt im Profil");
    assert(/^## Was ich vorhabe\n\nDas Gerät/m.test(read("business/profile.md")), "Unternehmen: Prosa nicht eingesetzt");
    assert(!/<!--[\s\S]*Wo du hin willst/.test(read("business/profile.md")), "Unternehmen: Vorlagenkommentar steht noch im Profil");
    assert(/Technikstand dieses Rechners\n\nStand \d{4}-\d{2}-\d{2}:/.test(read("business/profile.md")), "Unternehmen: Technikstand fehlt");
    assert(has(".claude/commands/device.md"), "Unternehmen: Befehle nicht angelegt");
    assert(!has(".claude/commands/customer.md"), "Unternehmen: bekommt den Kundenbefehl");
    // /init hat die Partnerware weggeraeumt, und ein Update bringt sie einem
    // Unternehmen nicht zurueck: weder als "neu" gemeldet noch eingespielt.
    assert(!has(".claude/skills/sales/SKILL.md"), "Unternehmen: der Skill sales blieb liegen");
    assert(!has(".ara/knowledge/pricing.md"), "Unternehmen: das Wissen pricing blieb liegen");
    let nachziehen = await forkTool("update.mjs", ["--check"], env);
    assert(nachziehen.status === 0, `Unternehmen: --check fehlgeschlagen: ${nachziehen.stderr}`);
    assert(
      !/skills\/sales|knowledge\/pricing|vorlagen\/angebot/.test(nachziehen.stdout),
      `Unternehmen: Partnerware gilt als neu: ${nachziehen.stdout}`
    );
    nachziehen = await forkTool("update.mjs", [], env);
    assert(nachziehen.status === 0, `Unternehmen: Update fehlgeschlagen: ${nachziehen.stderr}`);
    assert(!has(".claude/skills/sales/SKILL.md"), "Unternehmen: update.mjs spielt den Skill sales wieder ein");
    assert(!has(".ara/knowledge/pricing.md"), "Unternehmen: update.mjs spielt das Wissen pricing wieder ein");
    assert(!has(".ara/vorlagen/angebot.md"), "Unternehmen: update.mjs spielt die Angebotsvorlage wieder ein");

    // Fund 7 der Werkstatt am 29.08.2026: invoice und invoice_tool gehoeren nur
    // dem Partner, /init leert sie fuer ein Unternehmen mit Absicht, und der
    // Zaehler meldete sie trotzdem als Luecke. Zwei, die keine sind, und echte
    // gehen darin unter.
    assert(!/leer \([^)]*invoice/.test(run.stdout), `Unternehmen: Partnerfelder zaehlen als Luecke: ${run.stdout}`);
    // Fund 8: derselbe Lauf sagte "Es fehlt nichts", obwohl Felder leer
    // blieben. Genannt hat sie nur --show, und nur, wenn jemand es aufrief.
    assert(/Felder gesetzt, \d+ leer/.test(run.stdout), `der Lauf mit --answers nennt die Luecken nicht: ${run.stdout}`);
    const leereFelder = readFrontmatter(join(fork, "business", "profile.md"));
    for (const feld of ["ssh_key", "backup_repo"]) {
      assert(leereFelder.fields[feld] === "", `${feld} ist nicht leer, die Pruefung misst nichts`);
      assert(new RegExp(`leer \\([^)]*${feld}`).test(run.stdout), `${feld} fehlt in der Zeile: ${run.stdout}`);
    }
    // `versioned` ist leer und trotzdem keine Luecke: leer heisst "keinen der
    // vier Ordner", und das ist der Normalfall.
    assert(!/leer \([^)]*versioned/.test(run.stdout), `versioned zaehlt als Luecke: ${run.stdout}`);

    // Dieselbe Antwortdatei auf Englisch: englisches Geruest, englische
    // Ueberschriften, englische Befehle. Sonst waere die zweite Sprache eine
    // Behauptung.
    run = await forkTool("init.mjs", [
      "--answers",
      join(ROOT, ".ara", "templates", "init-answers-company.json"),
      "--force",
    ]);
    assert(run.status === 0, `Englisch: init.mjs fehlgeschlagen: ${run.stderr || run.stdout}`);
    assert(/^language: en$/m.test(read("business/profile.md")), "Englisch: Sprache fehlt im Profil");
    assert(/^## What I intend\n\nThe device/m.test(read("business/profile.md")), "Englisch: Prosa nicht eingesetzt");
    assert(
      /Technical state of this computer\n\nAs of \d{4}-\d{2}-\d{2}:/.test(read("business/profile.md")),
      "Englisch: Technikstand fehlt"
    );
    assert(/Read `\.ara\/knowledge\/device\.md`/.test(read(".claude/commands/device.md")), "Englisch: deutscher Befehl angelegt");

    run = await forkTool("init.mjs", ["--answers", join(ROOT, ".ara", "templates", "init-answers-partner.de.json")]);
    assert(run.status !== 0, "zweiter Lauf ueberschreibt das Profil ohne --force");
    run = await forkTool("init.mjs", ["--answers", join(ROOT, ".ara", "templates", "init-answers-partner.de.json"), "--force"]);
    assert(run.status === 0, `Partner: init.mjs fehlgeschlagen: ${run.stderr || run.stdout}`);
    assert(/^role: partner$/m.test(read("business/profile.md")), "Partner: Zweig fehlt im Profil");
    assert(/^hourly_rate: 95$/m.test(read("business/company.md")), "Partner: Stundensatz nicht in company.md");
    assert(has(".claude/commands/customer.md"), "Partner: bekommt den Kundenbefehl nicht");
    // Der Weg zurueck: aus dem Unternehmen wurde ein Partner, das Update holt
    // die Partnerware wieder. Messbar ist das nur, wo der neue Stand sie
    // mitbringt, und der kommt hier aus diesem Klon.
    if (PARTNER_MATERIAL) {
      nachziehen = await forkTool("update.mjs", [], env);
      assert(nachziehen.status === 0, `Partner: Update fehlgeschlagen: ${nachziehen.stderr}`);
      assert(has(".claude/skills/sales/SKILL.md") && has(".ara/vorlagen/angebot.md"), "Partner: bekommt die Partnerware nicht zurueck");
    }
    run = await forkTool("init.mjs", ["--json"]);
    const lage2 = JSON.parse(run.stdout);
    assert(lage2.role === "partner" && lage2.consequences.some((c) => c.key === "invoice"), "offene Rechnungsentscheidung wird nicht gemeldet");
    return PARTNER_MATERIAL
      ? "anlegen, ansehen, einspielen, nachziehen, Hash-Erkennung, /init in beiden Zweigen"
      : "anlegen, ansehen, einspielen, nachziehen, Hash-Erkennung, /init in beiden Zweigen, Weg zurueck ohne Partnerware nicht messbar";
  } finally {
    server.close();
    rmSync(work, { recursive: true, force: true });
  }
});

// --- Datum und blanker Klon ---------------------------------------------------

check("Ein Datum im Kit ist der Tag vor Ort", () => {
  // Der Fehler, an dem ein frischer Klon am 29.08.2026 um 01:05 durchfiel.
  // `toISOString()` rechnet in UTC. In Mitteleuropa ist es zwischen 22 Uhr und
  // Mitternacht dort schon der naechste Tag noch nicht, sondern immer noch der
  // vorige: der Selbsttest legte eine Wartung "in zehn Tagen" an, `daysUntil`
  // las neun daraus, und die Leistungsbeschreibung suchte ihr Papier unter dem
  // Datum des Vortags. Im Worktree fiel es nie auf, weil dort niemand nachts
  // gemessen hat, und die Uhrzeit steht in keinem Klon anders als im Worktree.
  assert(day(0) === today(), "day(0) und today() sind nicht derselbe Tag");
  for (const versatz of [-400, -5, -1, 0, 1, 10, 90]) {
    assert(daysUntil(day(versatz)) === versatz, `day(${versatz}) liegt ${daysUntil(day(versatz))} Tage entfernt`);
  }

  // Feste Zeitpunkte, damit die Pruefung nicht davon abhaengt, wann sie laeuft.
  // Der erste ist der gemessene Fehlschlag selbst.
  const fest = [
    [[10, new Date(2026, 7, 29, 1, 5)], "2026-09-08"],
    [[0, new Date(2026, 7, 29, 1, 5)], "2026-08-29"],
    [[-5, new Date(2026, 7, 29, 23, 59)], "2026-08-24"],
    // Zeitumstellung: an diesen Tagen hat der Tag 23 oder 25 Stunden, und wer
    // 86_400_000 Millisekunden addiert, landet daneben.
    [[1, new Date(2026, 2, 28, 23, 30)], "2026-03-29"],
    [[1, new Date(2026, 9, 24, 23, 30)], "2026-10-25"],
    // Ueber Monat und Jahr hinweg.
    [[1, new Date(2026, 11, 31, 12, 0)], "2027-01-01"],
    [[-1, new Date(2026, 0, 1, 0, 30)], "2025-12-31"],
  ];
  for (const [[versatz, von], erwartet] of fest) {
    assert(day(versatz, von) === erwartet, `day(${versatz}) auf ${von} gibt ${day(versatz, von)} statt ${erwartet}`);
  }
  assert(now(new Date(2026, 7, 29, 1, 5)) === "2026-08-29 01:05", `Zeitstempel falsch: ${now(new Date(2026, 7, 29, 1, 5))}`);

  // Und die Stelle selbst: kein Werkzeug schneidet sich ein Datum aus einer
  // UTC-Zeichenkette. Ein voller Zeitstempel mit Z darf bleiben, der ist ehrlich.
  const treffer = [];
  const scan = (dir) => {
    for (const eintrag of readdirSync(dir, { withFileTypes: true })) {
      const pfad = join(dir, eintrag.name);
      if (eintrag.isDirectory()) {
        scan(pfad);
        continue;
      }
      if (!eintrag.name.endsWith(".mjs")) continue;
      const text = readFileSync(pfad, "utf8");
      for (const zeile of text.split("\n")) {
        if (/toISOString\(\)\s*\.slice\(/.test(zeile)) treffer.push(`${relative(ROOT, pfad)}: ${zeile.trim()}`);
      }
    }
  };
  scan(join(ROOT, ".ara", "tools"));
  assert(
    treffer.length === 0,
    `ein Datum kommt aus UTC statt aus dem Kalender vor Ort, day() oder today() nehmen:\n    ${treffer.join("\n    ")}`
  );
  return `${fest.length} feste Zeitpunkte, Zeitumstellung, Jahreswechsel`;
});

check("Der Selbsttest ist in einem blanken Klon gruen", () => {
  // Gemessen am 29.08.2026: `git clone` von GitHub, dann dieser Selbsttest, und
  // er sagte einem Fremden beim ersten Befehl, das Kit sei nicht verlaesslich.
  // Im Worktree lief derselbe Stand gruen, denn dort liegt ein Profil, ein
  // Spiegel und eine echte Geraeteakte. Wer nur im Worktree misst, misst seinen
  // Arbeitsordner. Diese Pruefung baut den Klon nach: nur was in der
  // Versionsverwaltung liegt, keine Akte, kein Profil, kein Spiegel.
  if (process.env.ARA_SELFTEST_KLON) return "übersprungen, dies ist der Lauf im Klon";

  const listed = spawnSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (listed.status !== 0) return "übersprungen, kein Git-Repository";
  // Was der Klon eines Partners bekommt, ist das Kit und nicht die Arbeit
  // dieses Rechners. Ein Klon, der seinen eigenen Betrieb fuehrt, verfolgt
  // business/, devices/ und apps/ mit Absicht (Fund 1 der Werkstatt am
  // 29.08.2026); die gehoeren trotzdem nicht in den nachgebauten Klon, sonst
  // misst diese Pruefung wieder den Arbeitsordner statt das Kit.
  const eigen = ownFolders();
  const dateien = listed.stdout
    .split("\0")
    .filter(Boolean)
    .filter((datei) => !eigen.includes(datei.split("/")[0]))
    // Ein Unternehmen hat die Partnerware nach /init nicht mehr, git fuehrt
    // sie trotzdem noch. Was nicht da ist, kommt auch nicht in den Klon.
    .filter((datei) => existsSync(join(ROOT, datei)));
  assert(dateien.length > 100, `nur ${dateien.length} Dateien im Klon, das kann nicht das Kit sein`);

  const work = mkdtempSync(join(tmpdir(), "ara-klon-"));
  const klon = join(work, "ara-kit");
  try {
    for (const datei of dateien) {
      const ziel = join(klon, datei);
      mkdirSync(dirname(ziel), { recursive: true });
      cpSync(join(ROOT, datei), ziel);
    }

    // Die Ordner des Nutzers gibt es im Klon nicht. Das ist der Unterschied,
    // an dem es haengt, und er wird hier ausgesprochen statt vorausgesetzt.
    for (const name of [...USER_FOLDERS, ".env", ".ara/state.json"]) {
      assert(!existsSync(join(klon, name)), `der nachgebaute Klon bringt ${name} mit`);
    }
    assert(existsSync(join(klon, ".ara", "tools", "selftest.mjs")), "im Klon fehlt der Selbsttest");
    assert(readdirSync(join(klon, ".ara", "mirror")).join(",") === ".gitkeep", "der Spiegel ist mitgekommen");

    // Was dieser Betrieb mit Absicht verfolgt, gehoert einem Partner nicht:
    // seine .gitignore traegt dafuer Ausnahmen, und die kommen mit der Kopie
    // mit. Im nachgebauten Klon werden sie zurueckgenommen, denn er soll das
    // Kit sein und nicht dieser Arbeitsordner. Die letzte passende Zeile
    // gewinnt, darum reicht das Anhaengen.
    if (eigen.length) {
      appendFileSync(
        join(klon, ".gitignore"),
        `\n# Nachgebauter Klon: was dieser Betrieb verfolgt, gehoert einem Partner nicht.\n${eigen
          .map((name) => `/${name}/`)
          .join("\n")}\n`
      );
    }

    // Ein Repository muss es sein: mehrere Pruefungen fragen git nach
    // .gitignore und nach dem, was verfolgt wird.
    const git = (...args) =>
      spawnSync("git", ["-c", "user.name=Selbsttest", "-c", "user.email=selbsttest@example.invalid", ...args], {
        cwd: klon,
        encoding: "utf8",
      });
    assert(git("init", "-q", "-b", "main").status === 0, "im Klon laesst sich kein Repository anlegen");
    assert(git("add", "-A").status === 0, "im Klon laesst sich nichts eintragen");
    assert(git("commit", "-q", "--no-gpg-sign", "-m", "klon").status === 0, "im Klon laesst sich nichts festschreiben");

    const run = spawnSync(process.execPath, [join(klon, ".ara", "tools", "selftest.mjs")], {
      cwd: klon,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, ARA_SELFTEST_KLON: "1", ARA_LANGUAGE: TOOL_LANGUAGE },
    });
    const ausgabe = `${run.stdout}${run.stderr}`;
    const gefallen = ausgabe.split("\n").filter((zeile) => /^FEHL/.test(zeile));
    assert(
      run.status === 0,
      `im blanken Klon fallen ${gefallen.length || "?"} Prüfungen:\n    ${(gefallen.length ? gefallen : ausgabe.split("\n").slice(-5)).join("\n    ")}`
    );
    const zahl = ausgabe.match(/^(\d+) von (\d+) Prüfungen bestanden\.$/m);
    assert(zahl, `der Lauf im Klon nennt kein Ergebnis: ${ausgabe.split("\n").slice(-5).join(" | ")}`);
    assert(zahl[1] === zahl[2], `im Klon bestanden nur ${zahl[1]} von ${zahl[2]}`);
    return `${dateien.length} Dateien, ${zahl[2]} Prüfungen, alle grün`;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

console.log(
  `\n${results.length - failures} von ${results.length} Prüfungen bestanden.` +
    (failures ? "\n\nDas Kit ist in diesem Zustand nicht verlässlich." : "") +
    (ONLY ? `\n\nNur die Prüfungen zu /${ONLY.source}/ liefen. Das ist kein Nachweis vor einem Merge.` : "")
);
process.exit(failures ? 1 : 0);
