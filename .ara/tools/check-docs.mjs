#!/usr/bin/env node
/**
 * Documentation self-test: is what the kit's knowledge says about the routes of a
 * device still right?
 *
 *   node .ara/tools/check-docs.mjs                     which routes stand in the knowledge
 *   node .ara/tools/check-docs.mjs --device orin       check every one of them live on the device
 *   node .ara/tools/check-docs.mjs --customer m --device werk2
 *   node .ara/tools/check-docs.mjs --device orin --json
 *   node .ara/tools/check-docs.mjs --device orin --base <url> --insecure
 *
 * **Why this exists.** The kit copies no product values, but its procedures name
 * routes: without a named route nobody can look up whether the sheet is still
 * right. So they get named, and here they get checked, against exactly one device
 * and with its own endpoint list as the yardstick.
 *
 * Both language versions of a sheet get read. A route that stands in only one of
 * them shows up in the list of files next to it.
 *
 * **It changes nothing.** Only reading routes from the contract get called. What
 * changes something counts as evidenced when the device names it in its contract
 * itself: a check that removes an app is not one. Routes of the interface get a
 * knock without a credential, and the refusal is the evidence.
 *
 * === deutsch ===
 *
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
 *
 * Gelesen werden beide Sprachfassungen eines Blattes. Eine Route, die nur in einer
 * davon steht, faellt in der Dateiliste daneben auf.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { t } from "./lib/i18n.mjs";
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
    t(
      `${routes.length} routes stand in the kit's knowledge, from ${files.length} files.`,
      `${routes.length} Routen stehen im Wissen des Kits, aus ${files.length} Dateien.`
    ),
    "",
    ...routes.map((route) => `  ${route.verb.padEnd(6)} ${route.path}   (${route.files.join(", ")})`),
  ];
  if (bare.length) {
    lines.push(
      "",
      t("Named without a verb and therefore not checkable:", "Ohne Verb genannt und darum nicht prüfbar:"),
      ...bare.map((entry) => `  ${entry.path}   (${entry.files.join(", ")})`)
    );
  }
  lines.push(
    "",
    t(
      "Check live: node .ara/tools/check-docs.mjs --device <device>",
      "Live prüfen: node .ara/tools/check-docs.mjs --device <gerät>"
    )
  );
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

const label = t(
  { gerufen: "called", kontrakt: "per contract", "ohne-schluessel": "without a credential" },
  { gerufen: "gerufen", kontrakt: "laut Kontrakt", "ohne-schluessel": "ohne Ausweis" }
);
const mark = t(
  { ok: "ok   ", fehlt: "GONE ", unklar: "?    " },
  { ok: "ok   ", fehlt: "FEHLT", unklar: "?    " }
);

console.log(
  t(
    `${link.place}: Arasul ${link.contract?.arasul ?? "without a statement"}, contract ${link.contract?.kontrakt ?? "?"}. ` +
      `${routes.length} routes from ${files.length} knowledge files.`,
    `${link.place}: Arasul ${link.contract?.arasul ?? "ohne Angabe"}, Kontrakt ${link.contract?.kontrakt ?? "?"}. ` +
      `${routes.length} Routen aus ${files.length} Wissensdateien.`
  )
);
console.log("");
for (const result of results) {
  console.log(`${mark[result.state]} ${result.verb.padEnd(6)} ${result.path}`);
  console.log(`      ${label[result.how]}: ${result.text}`);
}

if (bare.length) {
  console.log("");
  console.log(t("Named without a verb and therefore not checkable:", "Ohne Verb genannt und darum nicht prüfbar:"));
  for (const entry of bare) console.log(`  ${entry.path}   (${entry.files.join(", ")})`);
}

if (extra.length) {
  console.log("");
  console.log(
    t(
      `This device names ${extra.length} endpoints that no procedure describes:`,
      `${extra.length} Endpunkte nennt dieses Gerät, ohne dass ein Verfahren sie beschreibt:`
    )
  );
  for (const entry of extra) console.log(`  ${entry.verb.padEnd(6)} ${entry.path}   ${entry.was}`);
}

console.log("");
if (missing.length) {
  console.log(
    t(
      `${missing.length} of ${routes.length} routes do not exist on this device. ` +
        "The kit's knowledge is wrong in these places, and whoever works along it runs into nothing:",
      `${missing.length} von ${routes.length} Routen gibt es an diesem Gerät nicht. ` +
        "Das Wissen des Kits ist an diesen Stellen falsch, und wer danach arbeitet, läuft ins Leere:"
    )
  );
  for (const result of missing) {
    console.log(
      `  ${result.verb} ${result.path}   ` +
        t(`named in ${result.files.join(", ")}`, `genannt in ${result.files.join(", ")}`)
    );
  }
} else {
  console.log(t(`All ${routes.length} routes exist on this device.`, `Alle ${routes.length} Routen gibt es an diesem Gerät.`));
}
if (unclear.length) {
  console.log(
    t(
      `${unclear.length} routes stayed unclear, the device said nothing usable about them. No evidence in the one direction and none in the other.`,
      `${unclear.length} Routen blieben unklar, das Gerät hat dazu nichts Verwertbares gesagt. Kein Beleg in die eine und keiner in die andere Richtung.`
    )
  );
}
process.exit(missing.length ? 1 : 0);
