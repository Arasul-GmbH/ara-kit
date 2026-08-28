#!/usr/bin/env node
/**
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
 * .ara/templates/init-answers-partner.json und init-answers-company.json.
 *
 * Was es schreibt: business/profile.md, business/company.md (nur Partner), den
 * Technikstand aus check-environment.mjs, und es legt die Befehle des Zweigs an.
 * Was es nicht tut: Geheimnisse hinterlegen, SSH-Schluessel anlegen, eine Sicherung
 * einrichten. Das bleibt Handarbeit und wird am Ende als offen genannt.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { BUSINESS, ROOT, fail, helpOnly, parseArgs, readFrontmatter, today } from "./lib/kit.mjs";
import { compatibility, parseChangelog, standBlock } from "./lib/version.mjs";

const TEMPLATES = join(ROOT, ".ara", "templates");
const VERSION_FILE = join(ROOT, ".ara", "VERSION");
const CHANGELOG = join(ROOT, ".ara", "CHANGELOG.md");
const PROFILE = join(BUSINESS, "profile.md");
const COMPANY = join(BUSINESS, "company.md");
const ROLES = ["partner", "company"];

/** Prosa-Abschnitte des Profils: Ueberschrift zu Feld in der Antwortdatei. */
const SECTIONS = [
  ["Wer ich bin und was ich kann", "about"],
  ["Wie ich arbeiten möchte", "working"],
  ["Womit mein Haus arbeitet", "house"],
  ["Was ich vorhabe", "plans"],
  ["Abweichungen von den Standardregeln", "deviations"],
  ["Technikstand dieses Rechners", "environment"],
];

/** Felder von company.md, die /init abfragt. Der Rest ist Sache von /kalkulation. */
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
    ["ssh_key", "profile", "ohne benannten SSH-Schlüssel kein Zugang zu Kundengeräten über remote.mjs"],
    ["legal_name", "company", "ohne Firmierung kein Angebot"],
    ["address", "company", "ohne Anschrift kein Angebot"],
    ["hourly_rate", "company", "ohne Stundensatz keine Kalkulation"],
  ],
  company: [
    ["ssh_key", "profile", "ohne benannten SSH-Schlüssel kein Zugang zum Gerät über remote.mjs"],
    ["first_app", "profile", "ohne Ziel für die erste App fängt /app bei null an"],
  ],
};

helpOnly(import.meta.url);
const arg = parseArgs();

function run(tool, args) {
  return spawnSync("node", [join(ROOT, ".ara", "tools", tool), ...args], { encoding: "utf8" });
}

/** Technikstand als Absatz, aus check-environment.mjs. Werte, keine Wertung. */
function environment() {
  const probe = run("check-environment.mjs", ["--json"]);
  let e;
  try {
    e = JSON.parse(probe.stdout);
  } catch {
    return { text: `Stand ${today()}: check-environment.mjs lieferte kein Ergebnis.`, flash: "unknown" };
  }
  const keys = e.ssh_schluessel?.length
    ? `SSH-Schlüssel in ~/.ssh: ${e.ssh_schluessel.join(", ")}`
    : "kein SSH-Schlüssel in ~/.ssh";
  const missing = [];
  if (!e.node_ausreichend) missing.push("Node ist zu alt");
  if (!e.git) missing.push("git fehlt");
  if (!e.ssh) missing.push("ssh fehlt");
  const text =
    `Stand ${today()}: ${e.betriebssystem}, ${e.architektur}, ${e.arbeitsspeicher_gb} GB Arbeitsspeicher, ` +
    `${e.freier_speicher_gb} GB frei. Node ${e.node}, ${e.git || "kein git"}, ${e.ssh || "kein ssh"}. ` +
    `${keys}. ` +
    (e.flash_host_geeignet
      ? "Der Rechner taugt zum Flashen eingebetteter Geräte."
      : "Zum Flashen eingebetteter Geräte taugt der Rechner nicht, dafür braucht es ein x86-Linux.") +
    (missing.length ? ` Offen: ${missing.join(", ")}.` : "");
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
    const section = SECTIONS.find(([title]) => title === heading);
    if (!section) {
      // Der Kopfkommentar der Vorlage bleibt, er sagt, wem die Datei gehoert.
      out.push(part.trimEnd());
      continue;
    }
    const text = (prose[section[1]] || "").trim();
    out.push(`## ${heading}\n\n${text || "Noch offen."}`);
  }
  return out.join("\n\n") + "\n";
}

function readAnswers(path) {
  const file = resolve(path);
  if (!existsSync(file)) fail(`Antwortdatei nicht gefunden: ${path}`);
  let answers;
  try {
    answers = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    fail(`Antwortdatei ist kein gültiges JSON: ${error.message}`);
  }
  if (!ROLES.includes(answers.role)) {
    fail(`"role" muss ${ROLES.join(" oder ")} sein, in der Antwortdatei steht "${answers.role || ""}".`);
  }
  if (!answers.name) fail('"name" fehlt in der Antwortdatei.');
  for (const [key, allowed] of [
    ["detail_level", ["low", "medium", "high"]],
    ["security_level", ["standard", "relaxed"]],
    ["secrets_store", ["env", "keychain"]],
    ["browser", ["yes", "no"]],
    ["invoice", ["yes", "no", "later"]],
    ["first_device_state", ["present", "ordered", "none"]],
  ]) {
    if (answers[key] && !allowed.includes(answers[key])) {
      fail(`"${key}" kennt nur ${allowed.join(", ")}, nicht "${answers[key]}".`);
    }
  }
  return answers;
}

function apply(answers) {
  if (existsSync(PROFILE) && !arg.force) {
    fail(
      "business/profile.md gibt es schon. /init fragt dann nur nach, was fehlt. " +
        "Wer das Profil wirklich neu schreiben will: --force."
    );
  }
  mkdirSync(BUSINESS, { recursive: true });
  const probe = environment();

  const values = {
    ...answers,
    flash_host: probe.flash,
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
  const profile = fillFrontmatter(readFileSync(join(TEMPLATES, "profile.md"), "utf8"), values);
  const deviations = answers.deviations?.trim() || "Keine. Es gelten die Standardregeln aus .ara/knowledge/security.md.";
  writeFileSync(
    PROFILE,
    profile.head + fillSections(profile.body, { ...answers, deviations, environment: probe.text })
  );

  const written = ["business/profile.md"];
  if (answers.role === "partner") {
    const given = answers.company_file || {};
    const company = fillFrontmatter(readFileSync(join(TEMPLATES, "company.md"), "utf8"), {
      ...Object.fromEntries(COMPANY_FIELDS.map((k) => [k, given[k] ?? ""])),
      rates_asof: given.hourly_rate ? today() : "",
    });
    if (!existsSync(COMPANY) || arg.force) {
      writeFileSync(COMPANY, company.head + company.body);
      written.push("business/company.md");
    }
  }

  const commands = run("commands.mjs", ["--apply", "--role", answers.role]);
  if (commands.status !== 0) fail(`Befehle anlegen fehlgeschlagen:\n${commands.stderr || commands.stdout}`);

  return { written, commands: commands.stdout.trim() };
}

/** Was im Profil steht und was fehlt, mit Folge. */
function status() {
  const profile = readFrontmatter(PROFILE);
  if (!profile.exists) {
    return { exists: false, role: null, set: [], missing: [], consequences: [] };
  }
  const company = readFrontmatter(COMPANY);
  const role = profile.fields.role;
  const set = Object.entries(profile.fields).filter(([, v]) => v).map(([k]) => k);
  const missing = Object.entries(profile.fields).filter(([, v]) => !v).map(([k]) => k);
  const consequences = (CONSEQUENCES[role] || [])
    .filter(([key, where]) => !(where === "company" ? company.fields : profile.fields)[key])
    .map(([key, where, why]) => ({ key, file: where === "company" ? "business/company.md" : "business/profile.md", why }));
  if (role === "partner" && profile.fields.invoice !== "no" && profile.fields.invoice !== "yes") {
    consequences.push({
      key: "invoice",
      file: "business/profile.md",
      why: "solange nicht yes dasteht, legt das Kit den Rechnungsbefehl nicht an",
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
function stand() {
  const version = existsSync(VERSION_FILE) ? readFileSync(VERSION_FILE, "utf8").trim() : "";
  const changelog = existsSync(CHANGELOG) ? readFileSync(CHANGELOG, "utf8") : "";
  const entries = parseChangelog(changelog);
  return {
    version,
    date: entries[0]?.version === version ? entries[0].date : "",
    news: entries[0]?.version === version ? entries[0].lines : [],
    contract: compatibility(),
    lines: standBlock({ version, changelog }),
  };
}

if (arg.answers) {
  const answers = readAnswers(arg.answers);
  const result = apply(answers);
  const lage = { ...status(), stand: stand() };
  if (arg.json) {
    console.log(JSON.stringify({ ...lage, written: result.written }, null, 2));
    process.exit(0);
  }
  console.log(`Geschrieben: ${result.written.join(", ")}`);
  console.log(result.commands);
  console.log("");
  printConsequences(lage);
  console.log(
    "\nNicht in der Antwortdatei, bleibt Handarbeit: Geheimnisablage prüfen (secrets.mjs --show), " +
      "SSH-Schlüssel anlegen, falls keiner da ist, Sicherung einrichten. Ein Token braucht " +
      "erst die Installation von Arasul, nicht das Profil."
  );
  process.exit(0);
}

const lage = { ...status(), stand: stand() };
if (arg.json) {
  console.log(JSON.stringify(lage, null, 2));
  process.exit(0);
}
for (const line of lage.stand.lines) console.log(line);
console.log("");
if (!lage.exists) {
  console.log("Kein Profil. Das ist das erste Mal: /init führt das Interview, oder eine Antwortdatei mit --answers.");
  process.exit(0);
}
console.log(
  `Profil: ${lage.name || "ohne Namen"}, Zweig ${lage.role === "partner" ? "Partner" : "Unternehmen"}, ` +
    `${lage.set.length} Felder gesetzt, ${lage.missing.length} leer` +
    (lage.missing.length ? ` (${lage.missing.join(", ")})` : "") +
    "."
);
if (lage.role === "partner") console.log(`Firmenkopf: ${lage.company ? "business/company.md liegt" : "business/company.md fehlt"}.`);
printConsequences(lage);

function printConsequences(lage) {
  if (!lage.consequences.length) {
    console.log("Es fehlt nichts, was ein Befehl braucht.");
    return;
  }
  console.log("Es fehlt, und das heißt:");
  for (const c of lage.consequences) console.log(`  ${c.key} in ${c.file}: ${c.why}`);
}
