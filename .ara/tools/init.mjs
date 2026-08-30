#!/usr/bin/env node
/**
 * /init without an interview: write the profile from an answer file and create the commands.
 *
 *   node .ara/tools/init.mjs --answers <file.json>    profile and commands from the answers
 *   node .ara/tools/init.mjs --answers <file> --force overwrite an existing profile
 *   node .ara/tools/init.mjs --show                   version of the kit, what is in the profile and what is missing
 *   node .ara/tools/init.mjs --json                   the same as JSON
 *
 * Ara runs the interview along .ara/knowledge/init.md. This tool is the second way
 * to the same result: an answer file whose fields are named like the frontmatter of
 * business/profile.md, plus the prose sections and, for partners, the fields of
 * business/company.md. Examples with all fields lie in
 * .ara/templates/init-answers-partner.json and init-answers-company.json, and next
 * to each of them the German version with `.de.json`.
 *
 * `language` in the answer file decides in which language the profile gets written
 * and which scaffold gets used. Without it, the language of the environment applies,
 * and in a fresh clone that is English.
 *
 * What it writes: business/profile.md, business/company.md (partners only), the
 * technical state from check-environment.mjs, and it creates the commands of the
 * branch. What it does not do: store secrets, create an SSH key, set up a backup.
 * That stays manual work and gets named as open at the end.
 *
 * === deutsch ===
 *
 * /init ohne Interview: Profil aus einer Antwortdatei schreiben und die Befehle anlegen.
 *
 *   node .ara/tools/init.mjs --answers <datei.json>   Profil und Befehle aus den Antworten
 *   node .ara/tools/init.mjs --answers <datei> --force vorhandenes Profil ueberschreiben
 *   node .ara/tools/init.mjs --show                    Stand des Kits, was im Profil steht und was fehlt
 *   node .ara/tools/init.mjs --json                    dasselbe als JSON
 *
 * Das Interview fuehrt Ara nach .ara/knowledge/init.md. Dieses Werkzeug ist der
 * zweite Weg zum selben Ergebnis: eine Antwortdatei, deren Felder heissen wie das
 * Frontmatter von business/profile.md, dazu die Prosa-Abschnitte und fuer Partner
 * die Felder von business/company.md. Beispiele mit allen Feldern liegen in
 * .ara/templates/init-answers-partner.json und init-answers-company.json, daneben
 * je die deutsche Fassung mit `.de.json`.
 *
 * `language` in der Antwortdatei entscheidet, in welcher Sprache das Profil
 * geschrieben wird und welches Geruest genommen wird. Ohne Angabe gilt die Sprache
 * der Umgebung, und im frischen Klon ist das Englisch.
 *
 * Was es schreibt: business/profile.md, business/company.md (nur Partner), den
 * Technikstand aus check-environment.mjs, und es legt die Befehle des Zweigs an.
 * Was es nicht tut: Geheimnisse hinterlegen, SSH-Schluessel anlegen, eine Sicherung
 * einrichten. Das bleibt Handarbeit und wird am Ende als offen genannt.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { LANGUAGES, language, localized, setLanguage, t } from "./lib/i18n.mjs";
import {
  BUSINESS,
  ROOT,
  devicePath,
  fail,
  helpOnly,
  listCustomers,
  listDevices,
  parseArgs,
  readFrontmatter,
  today,
} from "./lib/kit.mjs";
import { KIT_CONTRACT_VERSION, catchUpLines } from "./lib/contract.mjs";
import { compatibility, parseChangelog, standBlock } from "./lib/version.mjs";
import { CLOSED_FIELDS, ROLES } from "./lib/profile.mjs";

const TEMPLATES = join(ROOT, ".ara", "templates");
const VERSION_FILE = join(ROOT, ".ara", "VERSION");
const CHANGELOG = localized(join(ROOT, ".ara", "CHANGELOG.md"));
const PROFILE = join(BUSINESS, "profile.md");
const COMPANY = join(BUSINESS, "company.md");

/**
 * Prosa-Abschnitte des Profils: Ueberschrift zu Feld in der Antwortdatei.
 *
 * Die Ueberschriften stehen so in der Vorlage, und die Vorlage gibt es in beiden
 * Sprachen. Gesucht wird darum in beiden Listen: welche Vorlage genommen wurde,
 * entscheidet `language` in der Antwortdatei, und ein Profil, das jemand von Hand
 * umgestellt hat, soll trotzdem gefunden werden.
 */
const SECTIONS = {
  en: [
    ["Who I am and what I can do", "about"],
    ["How I want to work", "working"],
    ["What my house works with", "house"],
    ["What I intend", "plans"],
    ["Deviations from the standard rules", "deviations"],
    ["Technical state of this computer", "environment"],
  ],
  de: [
    ["Wer ich bin und was ich kann", "about"],
    ["Wie ich arbeiten möchte", "working"],
    ["Womit mein Haus arbeitet", "house"],
    ["Was ich vorhabe", "plans"],
    ["Abweichungen von den Standardregeln", "deviations"],
    ["Technikstand dieses Rechners", "environment"],
  ],
};

/** Felder von company.md, die /init abfragt. Der Rest ist Sache von /calculation. */
const COMPANY_FIELDS = [
  "legal_name", "address", "phone", "email", "website", "tax_number", "vat_id", "iban",
  "hourly_rate", "hardware_markup", "payment_terms", "logo",
];

/**
 * Was fehlt und was deshalb nicht geht. Nur, was ein Befehl wirklich braucht.
 * Die Zahlen des Kalkulationsblatts meldet calculation.mjs selbst.
 */
const CONSEQUENCES = {
  partner: [
    ["ssh_key", "profile", () => t(
      "without a named SSH key no access to customer devices over remote.mjs",
      "ohne benannten SSH-Schlüssel kein Zugang zu Kundengeräten über remote.mjs")],
    ["legal_name", "company", () => t("without a legal name no offer", "ohne Firmierung kein Angebot")],
    ["address", "company", () => t("without an address no offer", "ohne Anschrift kein Angebot")],
    ["hourly_rate", "company", () => t(
      "without an hourly rate no calculation", "ohne Stundensatz keine Kalkulation")],
  ],
  company: [
    ["ssh_key", "profile", () => t(
      "without a named SSH key no access to the device over remote.mjs",
      "ohne benannten SSH-Schlüssel kein Zugang zum Gerät über remote.mjs")],
    ["first_app", "profile", () => t(
      "without a goal for the first app /app starts from zero",
      "ohne Ziel für die erste App fängt /app bei null an")],
  ],
};

helpOnly(import.meta.url);
const arg = parseArgs();

function run(tool, args) {
  return spawnSync("node", [join(ROOT, ".ara", "tools", tool), ...args], { encoding: "utf8" });
}

/** Technikstand als Absatz, aus check-environment.mjs. Werte, keine Wertung. */
function environment(lang) {
  const probe = run("check-environment.mjs", ["--json"]);
  let e;
  try {
    e = JSON.parse(probe.stdout);
  } catch {
    return {
      text: t(
        `As of ${today()}: check-environment.mjs returned no result.`,
        `Stand ${today()}: check-environment.mjs lieferte kein Ergebnis.`,
        lang
      ),
      flash: "unknown",
    };
  }
  const keys = e.ssh_schluessel?.length
    ? t(`SSH keys in ~/.ssh: ${e.ssh_schluessel.join(", ")}`, `SSH-Schlüssel in ~/.ssh: ${e.ssh_schluessel.join(", ")}`, lang)
    : t("no SSH key in ~/.ssh", "kein SSH-Schlüssel in ~/.ssh", lang);
  const missing = [];
  if (!e.node_ausreichend) missing.push(t("Node is too old", "Node ist zu alt", lang));
  if (!e.git) missing.push(t("git is missing", "git fehlt", lang));
  if (!e.ssh) missing.push(t("ssh is missing", "ssh fehlt", lang));
  const text =
    t(
      `As of ${today()}: ${e.betriebssystem}, ${e.architektur}, ${e.arbeitsspeicher_gb} GB memory, ` +
        `${e.freier_speicher_gb} GB free. Node ${e.node}, ${e.git || "no git"}, ${e.ssh || "no ssh"}. `,
      `Stand ${today()}: ${e.betriebssystem}, ${e.architektur}, ${e.arbeitsspeicher_gb} GB Arbeitsspeicher, ` +
        `${e.freier_speicher_gb} GB frei. Node ${e.node}, ${e.git || "kein git"}, ${e.ssh || "kein ssh"}. `,
      lang
    ) +
    `${keys}. ` +
    (e.flash_host_geeignet
      ? t(
          "The computer is fit for flashing embedded devices.",
          "Der Rechner taugt zum Flashen eingebetteter Geräte.",
          lang
        )
      : t(
          "The computer is not fit for flashing embedded devices, that needs an x86 Linux.",
          "Zum Flashen eingebetteter Geräte taugt der Rechner nicht, dafür braucht es ein x86-Linux.",
          lang
        )) +
    (missing.length ? t(` Open: ${missing.join(", ")}.`, ` Offen: ${missing.join(", ")}.`, lang) : "");
  return { text, flash: e.flash_host_geeignet ? "yes" : "no" };
}

/** Fuellt die Frontmatter-Zeilen der Vorlage. Kommentare fallen weg, die Reihenfolge bleibt. */
function fillFrontmatter(template, values) {
  const match = template.match(/^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n?)([\s\S]*)$/);
  const lines = match[2].split(/\r?\n/).map((line) => {
    const pair = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:/);
    if (!pair) return line;
    const key = pair[1];
    if (values[key] === undefined || values[key] === "") return `${key}:`;
    return `${key}: ${values[key]}`;
  });
  return { head: match[1] + lines.join("\n") + match[3], body: match[4] };
}

/** Ersetzt je Abschnitt den Hinweiskommentar der Vorlage durch die Prosa. */
function fillSections(body, prose) {
  const parts = body.split(/^(?=## )/m);
  const out = [];
  for (const part of parts) {
    const heading = part.match(/^## (.+)$/m)?.[1];
    const section = [...SECTIONS.en, ...SECTIONS.de].find(([title]) => title === heading);
    if (!section) {
      // Der Kopfkommentar der Vorlage bleibt, er sagt, wem die Datei gehoert.
      out.push(part.trimEnd());
      continue;
    }
    const text = (prose[section[1]] || "").trim();
    out.push(`## ${heading}\n\n${text || t("Still open.", "Noch offen.")}`);
  }
  return out.join("\n\n") + "\n";
}

function readAnswers(path) {
  const file = resolve(path);
  if (!existsSync(file)) fail(t(`Answer file not found: ${path}`, `Antwortdatei nicht gefunden: ${path}`));
  let answers;
  try {
    answers = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    fail(t(`The answer file is not valid JSON: ${error.message}`, `Antwortdatei ist kein gültiges JSON: ${error.message}`));
  }
  if (!ROLES.includes(answers.role)) {
    fail(
      t(
        `"role" has to be ${ROLES.join(" or ")}, the answer file says "${answers.role || ""}".`,
        `"role" muss ${ROLES.join(" oder ")} sein, in der Antwortdatei steht "${answers.role || ""}".`
      )
    );
  }
  if (!answers.name) fail(t('"name" is missing from the answer file.', '"name" fehlt in der Antwortdatei.'));
  for (const [key, allowed] of Object.entries(CLOSED_FIELDS)) {
    if (key === "role") continue;
    if (answers[key] && !allowed.includes(answers[key])) {
      fail(
        t(
          `"${key}" only knows ${allowed.join(", ")}, not "${answers[key]}".`,
          `"${key}" kennt nur ${allowed.join(", ")}, nicht "${answers[key]}".`
        )
      );
    }
  }
  return answers;
}

function apply(answers) {
  if (existsSync(PROFILE) && !arg.force) {
    fail(
      t(
        "business/profile.md already exists. /init then only asks about what is missing. " +
          "If you really want to write the profile anew: --force.",
        "business/profile.md gibt es schon. /init fragt dann nur nach, was fehlt. " +
          "Wer das Profil wirklich neu schreiben will: --force."
      )
    );
  }
  mkdirSync(BUSINESS, { recursive: true });
  const probe = environment(answers.language || language());

  const values = {
    ...answers,
    flash_host: probe.flash,
    language: answers.language || language(),
    detail_level: answers.detail_level || "medium",
    security_level: answers.security_level || "standard",
    secrets_store: answers.secrets_store || "env",
    browser: answers.browser || "yes",
    first_device_state: answers.first_device_state || (answers.first_device ? "present" : "none"),
    created: today(),
  };
  if (answers.role === "company") {
    values.invoice = "";
    values.invoice_tool = "";
  }
  const profile = fillFrontmatter(
    readFileSync(localized(join(TEMPLATES, "profile.md"), values.language), "utf8"),
    values
  );
  const deviations =
    answers.deviations?.trim() ||
    t(
      "None. The standard rules from .ara/knowledge/security.md apply.",
      "Keine. Es gelten die Standardregeln aus .ara/knowledge/security.md.",
      values.language
    );
  writeFileSync(
    PROFILE,
    profile.head + fillSections(profile.body, { ...answers, deviations, environment: probe.text })
  );

  const written = ["business/profile.md"];
  if (answers.role === "partner") {
    const given = answers.company_file || {};
    const company = fillFrontmatter(readFileSync(localized(join(TEMPLATES, "company.md"), answers.language), "utf8"), {
      ...Object.fromEntries(COMPANY_FIELDS.map((k) => [k, given[k] ?? ""])),
      rates_asof: given.hourly_rate ? today() : "",
    });
    if (!existsSync(COMPANY) || arg.force) {
      writeFileSync(COMPANY, company.head + company.body);
      written.push("business/company.md");
    }
  }

  // Ab hier spricht dieser Lauf die Sprache, die gerade ins Profil geschrieben
  // wurde. Sonst berichtete /init auf Englisch ueber ein deutsches Profil.
  setLanguage(values.language);
  const commands = run("commands.mjs", ["--apply", "--role", answers.role, "--language", values.language]);
  if (commands.status !== 0) {
    fail(
      t(
        `Creating the commands failed:\n${commands.stderr || commands.stdout}`,
        `Befehle anlegen fehlgeschlagen:\n${commands.stderr || commands.stdout}`
      )
    );
  }

  return { written, commands: commands.stdout.trim() };
}

/** Was im Profil steht und was fehlt, mit Folge. */
/**
 * Felder, die dem anderen Zweig gehoeren und in diesem keine Luecke sind.
 *
 * Die Vorlage sagt an ihnen "nur Partner", und beim Schreiben leert `/init`
 * sie fuer ein Unternehmen. Wer sie danach mitzaehlt, zaehlt seine eigene
 * Entscheidung als Mangel.
 */
const OTHER_BRANCH = Object.freeze({ company: ["invoice", "invoice_tool"] });

/**
 * Felder, deren leerer Wert eine Antwort ist und keine Luecke.
 *
 * `versioned` sagt, welche der vier eigenen Ordner dieser Klon mit Absicht
 * verfolgt. Leer heisst: keinen, und das ist der Normalfall. Wer es als Luecke
 * zaehlt, meldet jedem Partner dauerhaft eine, die keine ist.
 */
const NOT_A_GAP = Object.freeze(["versioned"]);

function status() {
  const profile = readFrontmatter(PROFILE);
  if (!profile.exists) {
    return { exists: false, role: null, set: [], missing: [], consequences: [] };
  }
  const company = readFrontmatter(COMPANY);
  const role = profile.fields.role;
  // Fund 7 der Werkstatt am 29.08.2026: `invoice` und `invoice_tool` gehoeren
  // nur dem Partner, und /init leert sie fuer ein Unternehmen mit Absicht.
  // Trotzdem zaehlte der Zaehler sie als Luecke, und ein sauber ausgefuelltes
  // Unternehmensprofil meldete dauerhaft zwei, die keine sind. Echte Luecken
  // gehen darin unter.
  const foreign = OTHER_BRANCH[role] || [];
  const own = Object.entries(profile.fields).filter(([k]) => !foreign.includes(k));
  const set = own.filter(([, v]) => v).map(([k]) => k);
  const missing = own.filter(([k, v]) => !v && !NOT_A_GAP.includes(k)).map(([k]) => k);
  const consequences = (CONSEQUENCES[role] || [])
    .filter(([key, where]) => !(where === "company" ? company.fields : profile.fields)[key])
    .map(([key, where, why]) => ({ key, file: where === "company" ? "business/company.md" : "business/profile.md", why: why() }));
  if (role === "partner" && profile.fields.invoice !== "no" && profile.fields.invoice !== "yes") {
    consequences.push({
      key: "invoice",
      file: "business/profile.md",
      why: t(
        "as long as it does not say yes, the kit does not create the invoice command",
        "solange nicht yes dasteht, legt das Kit den Rechnungsbefehl nicht an"
      ),
    });
  }
  return { exists: true, role, name: profile.fields.name, set, missing, consequences, company: company.exists };
}

/**
 * Der Stand des Kits: Nummer, das Neue daran, die Verträglichkeit zum Gerät.
 *
 * `/init` sagt das vor allem anderen. Ein Partner, der nur eine Liste geänderter
 * Dateien sieht, weiß danach nicht, ob sein Gerät noch dazu passt.
 */
/**
 * Geräte, die weiter sind als dieses Kit.
 *
 * `/init` hat kein Gerät vor sich, aber die Akten stehen da: `device.mjs`
 * schreibt die Kontraktfassung hinein, die es beim Kontakt am Gerät gelesen
 * hat. Ein Klon, der hinter seinem Gerät liegt, erfährt es damit hier, vor der
 * ersten App, und nicht erst an einem Deploy, der mit „Nichts eingespielt"
 * abbricht.
 *
 * Behauptet wird nichts. Gelesen wird nur, was einmal am Gerät gemessen wurde,
 * und eine Akte ohne diese Zahl kommt nicht vor.
 */
function devicesAhead() {
  const places = [
    ...listDevices(null).map((device) => ({ customer: null, device })),
    ...listCustomers().flatMap((customer) => listDevices(customer).map((device) => ({ customer, device }))),
  ];
  const ahead = [];
  for (const { customer, device } of places) {
    const value = readFrontmatter(join(devicePath(customer, device), "device.md")).fields.contract;
    const carried = Number(value);
    if (!value || !Number.isInteger(carried)) continue;
    if (carried > KIT_CONTRACT_VERSION) {
      ahead.push({ place: customer ? `${customer}/${device}` : device, contract: carried });
    }
  }
  return ahead;
}

function stand() {
  const version = existsSync(VERSION_FILE) ? readFileSync(VERSION_FILE, "utf8").trim() : "";
  const changelog = existsSync(CHANGELOG) ? readFileSync(CHANGELOG, "utf8") : "";
  const entries = parseChangelog(changelog);
  return {
    version,
    date: entries[0]?.version === version ? entries[0].date : "",
    news: entries[0]?.version === version ? entries[0].lines : [],
    contract: compatibility(),
    ahead: devicesAhead(),
    lines: standBlock({ version, changelog }),
  };
}

/**
 * Die Zeilen für den Fall, dass ein Gerät weiter ist als dieses Kit.
 *
 * Sie stehen ganz oben, direkt hinter dem Stand: wer sie liest, hat noch nichts
 * angefangen, was gleich abbricht.
 */
function printAhead(lage) {
  if (!lage.stand.ahead.length) return;
  for (const { place, contract } of lage.stand.ahead) {
    console.log(
      t(
        `${place} carries contract version ${contract}, this kit understands up to ${KIT_CONTRACT_VERSION}.`,
        `${place} führt Kontraktfassung ${contract}, dieses Kit versteht bis ${KIT_CONTRACT_VERSION}.`
      )
    );
  }
  for (const line of catchUpLines()) console.log(line);
}

if (arg.answers) {
  const answers = readAnswers(arg.answers);
  const result = apply(answers);
  const lage = { ...status(), stand: stand() };
  if (arg.json) {
    console.log(JSON.stringify({ ...lage, written: result.written }, null, 2));
    process.exit(0);
  }
  console.log(t(`Written: ${result.written.join(", ")}`, `Geschrieben: ${result.written.join(", ")}`));
  console.log(result.commands);
  console.log("");
  // Fund 8 der Werkstatt am 29.08.2026: der Weg ueber die Antwortdatei sagte
  // "Es fehlt nichts, was ein Befehl braucht", obwohl zwei Felder leer
  // geblieben waren. Die zweite Regel dieses Verfahrens heisst "nichts
  // stillschweigend durchgehen lassen", und sie griff hier nicht: die Luecken
  // nannte nur `--show`, und nur, wenn jemand es aufrief. Jetzt endet der Lauf
  // mit derselben Zeile.
  printAhead(lage);
  printGaps(lage);
  printConsequences(lage);
  console.log(
    t(
      "\nNot in the answer file, stays manual work: check the secret store (secrets.mjs --show), " +
        "create an SSH key if there is none, set up a backup. A token is only needed for " +
        "installing Arasul, not for the profile.",
      "\nNicht in der Antwortdatei, bleibt Handarbeit: Geheimnisablage prüfen (secrets.mjs --show), " +
        "SSH-Schlüssel anlegen, falls keiner da ist, Sicherung einrichten. Ein Token braucht " +
        "erst die Installation von Arasul, nicht das Profil."
    )
  );
  process.exit(0);
}

const lage = { ...status(), stand: stand() };
if (arg.json) {
  console.log(JSON.stringify(lage, null, 2));
  process.exit(0);
}
for (const line of lage.stand.lines) console.log(line);
printAhead(lage);
console.log("");
if (!lage.exists) {
  console.log(
    t(
      "No profile. This is the first time: /init runs the interview, or an answer file with --answers.",
      "Kein Profil. Das ist das erste Mal: /init führt das Interview, oder eine Antwortdatei mit --answers."
    )
  );
  process.exit(0);
}
printGaps(lage);
if (lage.role === "partner") {
  console.log(
    t(
      `Company head: ${lage.company ? "business/company.md is there" : "business/company.md is missing"}.`,
      `Firmenkopf: ${lage.company ? "business/company.md liegt" : "business/company.md fehlt"}.`
    )
  );
}
printConsequences(lage);

/** Eine Zeile: wer im Profil steht, wie viel darin steht und was leer blieb. */
function printGaps(lage) {
  console.log(
    t(
      `Profile: ${lage.name || "without a name"}, branch ${lage.role === "partner" ? "partner" : "company"}, ` +
        `${lage.set.length} fields set, ${lage.missing.length} empty`,
      `Profil: ${lage.name || "ohne Namen"}, Zweig ${lage.role === "partner" ? "Partner" : "Unternehmen"}, ` +
        `${lage.set.length} Felder gesetzt, ${lage.missing.length} leer`
    ) +
      (lage.missing.length ? ` (${lage.missing.join(", ")})` : "") +
      "."
  );
}

function printConsequences(lage) {
  if (!lage.consequences.length) {
    console.log(t("Nothing is missing that a command needs.", "Es fehlt nichts, was ein Befehl braucht."));
    return;
  }
  console.log(t("What is missing, and what that means:", "Es fehlt, und das heißt:"));
  for (const c of lage.consequences) console.log(`  ${c.key} in ${c.file}: ${c.why}`);
}
