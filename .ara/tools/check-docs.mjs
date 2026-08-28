#!/usr/bin/env node
/**
 * Doku-Selbsttest: stimmt noch, was im Wissen des Kits über die Wege eines
 * Geräts steht?
 *
 *   node .ara/tools/check-docs.mjs                     welche Routen stehen im Wissen
 *   node .ara/tools/check-docs.mjs --device orin       jede davon live am Gerät prüfen
 *   node .ara/tools/check-docs.mjs --customer m --device werk2
 *   node .ara/tools/check-docs.mjs --device orin --json
 *   node .ara/tools/check-docs.mjs --device orin --base <url> --insecure
 *
 * **Warum es das gibt.** Das Kit schreibt keine Produktwerte ab, aber seine
 * Verfahren nennen Wege: ohne einen genannten Weg kann niemand nachsehen, ob
 * das Blatt noch stimmt. Genannt wird also, und geprüft wird hier, gegen genau
 * ein Gerät und mit dessen eigener Endpunktliste als Maßstab.
 *
 * **Es verändert nichts.** Gerufen werden nur lesende Wege aus dem Kontrakt.
 * Was etwas verändert, gilt als belegt, wenn das Gerät es selbst in seinem
 * Kontrakt nennt: eine Prüfung, die eine App entfernt, ist keine. Wege der
 * Oberfläche bekommen ein Anklopfen ohne Ausweis, und die Abweisung ist der
 * Beleg.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { ROOT, fail, helpOnly, parseArgs, readDevice } from "./lib/kit.mjs";
import { connect, withContract } from "./lib/link.mjs";
import {
  bareApiPaths,
  callable,
  collectRoutes,
  judgeRoute,
  planFor,
  undocumented,
} from "./lib/docroutes.mjs";

const KNOWLEDGE = join(ROOT, ".ara", "knowledge");
helpOnly(import.meta.url);
const arg = parseArgs();
const str = (v) => (typeof v === "string" ? v : null);

/** Die Wissensdateien, mit ihrem Pfad relativ zur Wurzel. */
function knowledgeFiles() {
  return readdirSync(KNOWLEDGE)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => ({
      file: relative(ROOT, join(KNOWLEDGE, name)),
      text: readFileSync(join(KNOWLEDGE, name), "utf8"),
    }));
}

const files = knowledgeFiles();
const routes = collectRoutes(files);
const bare = bareApiPaths(files);

if (!str(arg.device) && !str(arg.customer)) {
  const lines = [
    `${routes.length} Routen stehen im Wissen des Kits, aus ${files.length} Dateien.`,
    "",
    ...routes.map((route) => `  ${route.verb.padEnd(6)} ${route.path}   (${route.files.join(", ")})`),
  ];
  if (bare.length) {
    lines.push(
      "",
      "Ohne Verb genannt und darum nicht prüfbar:",
      ...bare.map((entry) => `  ${entry.path}   (${entry.files.join(", ")})`)
    );
  }
  lines.push("", "Live prüfen: node .ara/tools/check-docs.mjs --device <gerät>");
  if (arg.json) console.log(JSON.stringify({ routes, bare }, null, 2));
  else console.log(lines.join("\n"));
  process.exit(0);
}

let device;
try {
  device = readDevice(str(arg.customer), str(arg.device));
} catch (error) {
  fail(error.message);
}

let link;
try {
  link = await withContract(
    connect(device, { base: str(arg.base), insecure: Boolean(arg.insecure) }),
    device
  );
} catch (error) {
  fail(error.message);
}

/** Ein Aufruf, der nicht abstürzt: eine tote Leitung ist ein Befund, kein Ende. */
async function ask(options) {
  try {
    return await link.ask(options);
  } catch (error) {
    return { ok: false, status: 0, error: { message: error.message }, data: null };
  }
}

const results = [];
for (const route of routes) {
  const plan = planFor(route, link.contract);
  let answer = null;
  if (plan.how === "gerufen") {
    answer = await ask({ method: route.verb, path: callable(route.path), keyHeader: link.keyHeader });
  } else if (plan.how === "ohne-schluessel") {
    // Ohne Schluessel und ohne Sitzung. Die Anmeldung kommt am Geraet vor allem
    // anderen, ein solcher Aufruf kann darum nichts veraendern.
    answer = await ask({ method: route.verb, path: callable(route.path), key: null, keyHeader: undefined });
  }
  results.push({ ...route, ...plan, answer: answer ? { status: answer.status } : null, ...judgeRoute(plan, answer) });
}

const missing = results.filter((r) => r.state === "fehlt");
const unclear = results.filter((r) => r.state === "unklar");
const extra = undocumented(link.contract, routes);

if (arg.json) {
  console.log(
    JSON.stringify(
      {
        device: link.place,
        arasul: link.contract?.arasul ?? null,
        kontrakt: link.contract?.kontrakt ?? null,
        results: results.map(({ entry, ...rest }) => rest),
        bare,
        undocumented: extra,
      },
      null,
      2
    )
  );
  process.exit(missing.length ? 1 : 0);
}

const label = { gerufen: "gerufen", kontrakt: "laut Kontrakt", "ohne-schluessel": "ohne Ausweis" };
const mark = { ok: "ok   ", fehlt: "FEHLT", unklar: "?    " };

console.log(
  `${link.place}: Arasul ${link.contract?.arasul ?? "ohne Angabe"}, Kontrakt ${link.contract?.kontrakt ?? "?"}. ` +
    `${routes.length} Routen aus ${files.length} Wissensdateien.`
);
console.log("");
for (const result of results) {
  console.log(`${mark[result.state]} ${result.verb.padEnd(6)} ${result.path}`);
  console.log(`      ${label[result.how]}: ${result.text}`);
}

if (bare.length) {
  console.log("");
  console.log("Ohne Verb genannt und darum nicht prüfbar:");
  for (const entry of bare) console.log(`  ${entry.path}   (${entry.files.join(", ")})`);
}

if (extra.length) {
  console.log("");
  console.log(`${extra.length} Endpunkte nennt dieses Gerät, ohne dass ein Verfahren sie beschreibt:`);
  for (const entry of extra) console.log(`  ${entry.verb.padEnd(6)} ${entry.path}   ${entry.was}`);
}

console.log("");
if (missing.length) {
  console.log(
    `${missing.length} von ${routes.length} Routen gibt es an diesem Gerät nicht. ` +
      "Das Wissen des Kits ist an diesen Stellen falsch, und wer danach arbeitet, läuft ins Leere:"
  );
  for (const result of missing) {
    console.log(`  ${result.verb} ${result.path}   genannt in ${result.files.join(", ")}`);
  }
} else {
  console.log(`Alle ${routes.length} Routen gibt es an diesem Gerät.`);
}
if (unclear.length) {
  console.log(
    `${unclear.length} Routen blieben unklar, das Gerät hat dazu nichts Verwertbares gesagt. Kein Beleg in die eine und keiner in die andere Richtung.`
  );
}
process.exit(missing.length ? 1 : 0);
