#!/usr/bin/env node
/**
 * Wartung: den Zustand eines Geräts lesen und einen Bericht daraus machen.
 *
 *   node .ara/tools/maintain.mjs --device orin                    Statuszeile und Bericht
 *   node .ara/tools/maintain.mjs --customer mueller --device werk2
 *   node .ara/tools/maintain.mjs --device orin --line             nur die Statuszeile
 *   node .ara/tools/maintain.mjs --device orin --report           Bericht in die Akte legen
 *   node .ara/tools/maintain.mjs --device orin --json             maschinenlesbar
 *   node .ara/tools/maintain.mjs --device orin --no-ssh           nur über die Schnittstelle
 *   node .ara/tools/maintain.mjs --device orin --apps a,b         nach diesen Apps fragen
 *   node .ara/tools/maintain.mjs --device orin --base <url> --insecure
 *
 * **Zwei Wege, und keiner davon ist Bedingung für den anderen.** Über SSH kommt
 * der Zustand des Rechners (Platte, Container, Dienste, Protokolle), über die
 * Schnittstelle kommt, was die Plattform von sich weiß (Version, Apps mit
 * Ständen, Sicherung). Geht einer der beiden nicht, entsteht der Bericht aus dem
 * anderen, und was fehlt, steht als eigener Abschnitt darin. Ein Bericht, der
 * verschweigt, was nicht gemessen wurde, liest sich wie ein heiles Gerät.
 *
 * **Das Werkzeug liest nur.** Es startet nichts neu, spielt nichts ein und
 * räumt nichts auf. Ein Eingriff ist eine eigene Entscheidung, siehe
 * `.ara/knowledge/maintenance-flow.md` und `.ara/knowledge/security.md`.
 *
 * **Kein Pfad aus dem Gedächtnis.** Der einzige, den das Kit auswendig kennt,
 * ist der Kontrakt. Alles andere schlägt es dort nach, und was das Gerät nicht
 * nennt, wird nicht gerufen und nicht geraten: es steht als „bietet dieses Gerät
 * nicht an" im Bericht.
 */

import { spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { listApps } from "./lib/appfile.mjs";
import { ROOT, ensureDir, fail, now, parseArgs, readDevice, sshArgs, today } from "./lib/kit.mjs";
import { connect, withContract } from "./lib/link.mjs";
import { reason } from "./lib/arasul.mjs";
import {
  HEALTH_PROBE,
  needsParameter,
  parseHealth,
  readHealth,
  statusLine,
  topicEndpoints,
} from "./lib/maintain.mjs";

const arg = parseArgs();
const str = (v) => (typeof v === "string" ? v : null);

if (!str(arg.device) && !str(arg.customer)) {
  console.log(
    [
      "Wartung: Zustand eines Geräts lesen",
      "",
      "  --device <name>        welches Gerät",
      "  --customer <name>      bei einem Kundengerät",
      "  --line                 nur die Statuszeile",
      "  --report               Bericht in die Akte des Geräts legen",
      "  --json                 maschinenlesbar",
      "  --no-ssh, --no-api     einen der beiden Wege auslassen",
      "  --apps a,b             nach diesen Apps fragen statt nach denen aus apps/",
      "  --base <url>           andere Adresse als die aus der Akte",
      "  --insecure             ein selbst ausgestelltes Zertifikat annehmen",
    ].join("\n")
  );
  process.exit(0);
}

let device;
try {
  device = readDevice(str(arg.customer), str(arg.device));
} catch (error) {
  fail(error.message);
}
const place = device.customer ? `${device.customer}/${device.device}` : device.device;

/** Was nicht gemessen werden konnte, mit dem Grund. Steht am Ende im Bericht. */
const missing = [];
const unmeasured = [];

// --- Der Rechner: über SSH ---------------------------------------------------

let health = null;
let sshInfo = { used: false, label: "", error: "" };

if (!arg["no-ssh"]) {
  let connection = null;
  try {
    connection = sshArgs(device.fields, { batch: true });
  } catch (error) {
    sshInfo.error = error.message;
  }
  if (connection) {
    sshInfo = { used: true, label: connection.label, error: "" };
    const run = spawnSync("ssh", [...connection.args, "sh -s"], {
      input: HEALTH_PROBE,
      encoding: "utf8",
    });
    if (run.status === 0) {
      health = readHealth(parseHealth(run.stdout));
      if (!health.complete) {
        missing.push("Das Prüfskript ist am Gerät nicht durchgelaufen, der Befund ist ein Ausschnitt.");
      }
    } else {
      sshInfo.error = (run.stderr || "").trim().split("\n").slice(0, 3).join(" ") || `Rückgabecode ${run.status}`;
    }
  }
  if (!health) {
    unmeasured.push("Zustand am Gerät");
    missing.push(
      `Kein SSH zu ${place}: ${sshInfo.error || "keine Verbindungsdaten in der Akte"}. ` +
        "Ohne SSH fehlen Platte, Container, Dienste und Protokolle."
    );
  }
} else {
  unmeasured.push("Zustand am Gerät");
  missing.push("SSH wurde ausgelassen (--no-ssh). Platte, Container, Dienste und Protokolle fehlen darum.");
}

// --- Die Plattform: über die Schnittstelle -----------------------------------

let link = null;
let platform = null;
let apps = { state: "ungemessen", source: "", asked: [], found: [], unknown: [], note: "" };
let backup = { state: "ungemessen", text: "ungemessen" };
let apiLogs = null;

if (!arg["no-api"]) {
  try {
    link = await withContract(
      connect(device, { base: str(arg.base), insecure: Boolean(arg.insecure) }),
      device
    );
  } catch (error) {
    unmeasured.push("Plattform");
    missing.push(`Keine Schnittstelle zu ${place}: ${error.message}`);
  }
} else {
  unmeasured.push("Plattform");
  missing.push("Die Schnittstelle wurde ausgelassen (--no-api). Version, Apps und Sicherung fehlen darum.");
}

if (link) {
  // Version und Kontraktstand stehen im Kontrakt selbst. Das ist die Auskunft
  // des Geraets ueber sich, kein Wert aus dem Kit.
  platform = {
    arasul: link.contract?.arasul ?? "",
    version: link.version,
    text: `Arasul ${link.contract?.arasul ?? "ohne Angabe"}, Kontrakt ${link.contract?.kontrakt ?? "?"}`,
  };
  if (!link.version.ok) missing.push(link.version.text);

  // --- Apps mit ihren Ständen ---
  //
  // Welche Apps auf dem Geraet stehen, sagt es nur, wenn sein Kontrakt einen Weg
  // dafuer nennt. Tut er das nicht, fragt das Kit nach den Kennungen, die es
  // selbst kennt, und schreibt genau das in den Bericht: eine Liste, die es
  // vollstaendig nennen wuerde, waere geraten.
  const listPath = "/api/v1/external/apps";
  if (link.has("GET", listPath)) {
    const listed = await tryEndpoint(link, "GET", listPath);
    if (listed.ok) {
      const rows = Array.isArray(listed.data) ? listed.data : listed.data?.apps || [];
      apps = {
        state: "gelesen",
        source: "kontrakt",
        asked: [],
        found: rows.map((row) => shapeApp(row.id ?? row.app_id, row)),
        unknown: [],
        note: `Das Gerät zählt seine Apps selbst auf (GET ${listPath}).`,
      };
    } else {
      apps.note = `${place} hat die Liste seiner Apps nicht herausgegeben. ${reason(listed)}`;
      missing.push(apps.note);
    }
  }

  if (apps.state === "ungemessen") {
    const asked = str(arg.apps)
      ? String(arg.apps).split(",").map((s) => s.trim()).filter(Boolean)
      : listApps();
    const detailPath = (id) => `/api/v1/external/apps/${id}`;
    if (!asked.length) {
      apps = {
        state: "gelesen",
        source: "kit",
        asked: [],
        found: [],
        unknown: [],
        note:
          "Das Gerät nennt keinen Endpunkt, der seine Apps aufzählt, und im Kit liegt keine App. " +
          "Gefragt wurde darum nach keiner. Mit --apps <kennung> gezielt nachfragen.",
      };
    } else if (!link.has("GET", detailPath("x"))) {
      apps = {
        state: "ungemessen",
        source: "",
        asked,
        found: [],
        unknown: [],
        note: `${place} nennt in seinem Kontrakt keinen Weg, nach einer App zu fragen.`,
      };
      unmeasured.push("Apps");
      missing.push(apps.note);
    } else {
      const found = [];
      const unknown = [];
      for (const id of asked) {
        const answer = await tryEndpoint(link, "GET", detailPath(id));
        if (answer.ok) found.push(shapeApp(id, answer.data));
        else if (answer.status === 404) unknown.push(id);
        else missing.push(`Zu ${id} sagt ${place} nichts Brauchbares. ${reason(answer)}`);
      }
      apps = {
        state: "gelesen",
        source: "kit",
        asked,
        found,
        unknown,
        note:
          "Das Gerät nennt keinen Endpunkt, der seine Apps aufzählt. Gefragt wurde darum nach den " +
          `Kennungen, die das Kit kennt (${asked.join(", ")}). Andere kann das Gerät trotzdem tragen.`,
      };
    }
  }

  // --- Die letzte Sicherung ---
  //
  // Fuer die Sicherung kennt das Kit keinen Pfad. Es sucht in der Liste, die das
  // Geraet selbst veroeffentlicht, und ruft nur, was dort steht.
  backup = await fromTopic(link, ["sicherung", "backup"], "Sicherung");

  // --- Protokolle ueber die Schnittstelle, falls das Geraet einen Weg nennt ---
  //
  // Protokolle kommen im Normalfall ueber SSH. Nennt das Geraet daneben einen
  // Weg, wird er genommen; nennt es keinen und SSH hat gelesen, fehlt nichts,
  // und dann gehoert das auch nicht unter „Was fehlt".
  apiLogs = await fromTopic(link, ["protokoll", "log"], "Protokolle", {
    quiet: Boolean(health?.logSource),
  });
}

/**
 * Ein Aufruf, der nicht abstürzt.
 *
 * Ein Gerät antwortet mit einem Status, oder die Leitung bricht, oder das
 * Zertifikat passt nicht. Für den Bericht ist das derselbe Fall: dieser Punkt
 * konnte nicht gemessen werden, und der Rest des Berichts entsteht trotzdem.
 */
async function tryEndpoint(active, verb, path, options = {}) {
  try {
    return await active.endpoint(verb, path, options);
  } catch (error) {
    return { ok: false, status: 0, error: { message: error.message }, data: null };
  }
}

/** Ein Eintrag zu einer App, so wie das Gerät ihn nennt. Umbenannt wird nichts. */
function shapeApp(id, data) {
  const stand = data?.staende || data?.stands || {};
  return {
    id: id ?? data?.id ?? data?.app_id ?? "",
    live: data?.live?.version ?? stand?.live?.version ?? data?.live ?? "",
    test: data?.test?.version ?? stand?.test?.version ?? data?.test ?? "",
    raw: data ?? null,
  };
}

/**
 * Ein Thema über den Kontrakt suchen und, wenn es dort steht, abfragen.
 *
 * Drei Ausgänge, und jeder ist eine ehrliche Antwort: das Gerät nennt keinen
 * Weg, es nennt mehrere (dann wird keiner geraten), oder es nennt genau einen
 * und der wird gerufen. Ein Pfad mit Platzhalter (`:id`) wird nicht gefüllt: was
 * dort hineingehört, weiß das Kit nicht.
 */
async function fromTopic(active, stems, label, { quiet = false } = {}) {
  const note = (satz) => {
    if (!quiet) missing.push(satz);
  };
  const candidates = topicEndpoints(active.contract, stems, "GET");
  if (!candidates.length) {
    const text = `${place} nennt in seinem Kontrakt keinen Endpunkt dafür, noch nicht am Gerät`;
    note(`${label}: ${text}. Das Kit rät keinen Pfad. Kommt einer dazu, findet es ihn beim nächsten Lauf.`);
    return { state: "kein-endpunkt", text, endpoint: "" };
  }
  const usable = candidates.filter((entry) => !needsParameter(entry.pfad));
  if (usable.length !== 1) {
    const text =
      candidates.length > 1
        ? `${place} nennt dafür mehrere Wege (${candidates.map((e) => e.pfad).join(", ")}), keiner davon eindeutig`
        : `${place} nennt dafür ${candidates[0].pfad}, dort fehlt ein Wert, den das Kit nicht kennt`;
    note(`${label}: ${text}. Es wurde keiner gerufen.`);
    return { state: "unklar", text, endpoint: candidates.map((e) => e.pfad).join(", ") };
  }

  const entry = usable[0];
  const answer = await tryEndpoint(active, "GET", entry.pfad);
  if (!answer.ok) {
    const text = `${entry.pfad} hat nicht geantwortet (Status ${answer.status})`;
    note(`${label}: ${text}. ${reason(answer)}`);
    return { state: "fehler", text, endpoint: entry.pfad };
  }
  return {
    state: "gelesen",
    text: describe(answer.data),
    endpoint: entry.pfad,
    data: answer.data ?? null,
  };
}

/** Die Antwort des Geräts in einer Zeile. Umbenannt und gedeutet wird nichts. */
function describe(data) {
  if (data === null || data === undefined) return "das Gerät antwortet ohne Inhalt";
  if (typeof data !== "object") return String(data);
  const entries = Object.entries(data).filter(([, v]) => v !== null && typeof v !== "object");
  if (!entries.length) return Array.isArray(data) ? `${data.length} Einträge` : "gelesen, siehe Bericht";
  return entries.map(([k, v]) => `${k} ${v}`).join(", ");
}

// --- Ergebnis ----------------------------------------------------------------

const line = statusLine({ place, platform, apps, backup, health, unmeasured });

if (!health && !link) {
  console.error(
    [line, "", "Es war nichts zu messen:", ...missing.map((m) => `- ${m}`)].join("\n")
  );
  process.exit(1);
}

const state = {
  device: place,
  when: now(),
  line,
  ssh: sshInfo,
  api: link ? { base: link.base, key_ref: link.keyRef, contract: link.contract?.kontrakt ?? null } : null,
  platform,
  apps,
  backup,
  logs: apiLogs,
  health,
  missing,
};

if (arg.json) {
  console.log(JSON.stringify(state, null, 2));
  process.exit(0);
}

if (arg.line) {
  console.log(line);
  process.exit(0);
}

/** Der Bericht. Was nicht gemessen wurde, steht darin und fehlt nicht still. */
function render() {
  const out = [`# Wartungsbericht ${place}`, "", `Aufgenommen: ${state.when}`, ""];

  out.push("## Gemessen über", "");
  out.push(
    link
      ? `- Schnittstelle ${link.base}, Kit-Schlüssel ${link.keyRef}`
      : "- Schnittstelle: nicht gemessen"
  );
  out.push(health ? `- SSH ${sshInfo.label}` : "- SSH: nicht gemessen");

  out.push("", "## Plattform", "");
  if (platform) {
    out.push(`- Systemversion: ${platform.arasul || "das Gerät nennt keine"}`);
    out.push(`- ${platform.version.text}`);
  } else {
    out.push("- Ungemessen, die Schnittstelle war nicht erreichbar.");
  }

  out.push("", "## Apps", "");
  if (apps.state !== "gelesen") {
    out.push(`- Ungemessen. ${apps.note || ""}`.trimEnd());
  } else {
    if (!apps.found.length) out.push("- Keine der gefragten Apps steht auf diesem Gerät.");
    for (const app of apps.found) {
      const stand = [app.live && `live ${app.live}`, app.test && `Test ${app.test}`].filter(Boolean);
      out.push(`- ${app.id}: ${stand.join(", ") || "steht am Gerät, ohne genannten Stand"}`);
    }
    if (apps.unknown.length) out.push(`- Nicht auf diesem Gerät: ${apps.unknown.join(", ")}`);
    if (apps.note) out.push(`- ${apps.note}`);
  }

  out.push("", "## Letzte Sicherung", "");
  out.push(`- ${backup.text}${backup.endpoint ? ` (${backup.endpoint})` : ""}`);
  // Was das Geraet verschachtelt antwortet, faellt aus der Zeile heraus. Es
  // wird nicht gedeutet, sondern angehaengt, wie es kam.
  for (const [key, value] of Object.entries(backup.data || {})) {
    if (value && typeof value === "object") out.push(`  - ${key}: ${JSON.stringify(value)}`);
  }

  out.push("", "## Zustand am Gerät", "");
  if (!health) {
    out.push("- Ungemessen, es bestand keine SSH-Verbindung.");
  } else {
    if (health.uptime) out.push(`- Laufzeit: ${health.uptime}`);
    if (health.disk.usedPct !== null) {
      out.push(
        `- Platte: ${health.disk.usedPct} Prozent belegt, ${health.disk.freeGb ?? "?"} von ` +
          `${health.disk.totalGb ?? "?"} GB frei`
      );
    }
    if (health.memory.totalGb) {
      out.push(`- Speicher: ${health.memory.availableGb ?? "?"} von ${health.memory.totalGb} GB verfügbar`);
    }
    if (health.dockerServer) out.push(`- Docker: Server ${health.dockerServer}`);
    if (health.containers.length) {
      out.push(
        `- Container: ${health.containers.length - health.stopped.length} von ${health.containers.length} laufen` +
          (health.stopped.length ? `, aus: ${health.stopped.map((c) => c.name).join(", ")}` : "")
      );
    } else {
      out.push("- Container: keiner gefunden, oder der Anmeldename darf Docker nicht fragen");
    }
    out.push(`- Fehlgeschlagene Dienste: ${health.failedUnits.length ? health.failedUnits.join(", ") : "keine"}`);
  }

  out.push("", "## Protokolle", "");
  if (health?.logSource) {
    if (health.logRead === "nein") out.push("- Nicht lesbar, dem Anmeldenamen fehlen die Rechte.");
    else if (!health.logs.length) out.push(`- Keine Fehlerzeile in den letzten 24 Stunden (${health.logSource}).`);
    else {
      out.push(`- ${health.logs.length} Fehlerzeilen in den letzten 24 Stunden (${health.logSource}):`, "", "```");
      out.push(...health.logs.slice(0, 20));
      out.push("```");
    }
  } else if (health) {
    out.push("- Auf diesem Gerät gibt es kein journalctl, es wurde nichts gelesen.");
  } else {
    out.push("- Ungemessen, es bestand keine SSH-Verbindung.");
  }
  if (apiLogs && apiLogs.state === "gelesen") {
    out.push(`- Über die Schnittstelle: ${apiLogs.text} (${apiLogs.endpoint})`);
  }

  if (health?.findings.length) {
    out.push("", "## Aufgefallen", "");
    for (const finding of health.findings) {
      out.push(`- ${finding.level === "achtung" ? "**Achtung**" : "Hinweis"}: ${finding.text}`);
    }
  }

  out.push("", "## Was fehlt", "");
  if (!missing.length) out.push("- Nichts, beide Wege haben geantwortet.");
  else out.push(...missing.map((m) => `- ${m}`));

  out.push(
    "",
    "Gelesen, nicht verändert. Ein Eingriff ist eine eigene Entscheidung.",
    ""
  );
  return out.join("\n");
}

const report = render();
console.log(line);
console.log("");
console.log(report);

if (arg.report) {
  const dir = ensureDir(join(device.path, "reports"));
  // Zwei Berichte an einem Tag sind der Normalfall, wenn zwischendurch etwas
  // repariert wurde. Der zweite ueberschreibt den ersten nicht.
  let file = join(dir, `${today()}-wartung.md`);
  let n = 2;
  while (existsSync(file)) file = join(dir, `${today()}-wartung-${n++}.md`);
  writeFileSync(file, report);
  console.log(`Bericht abgelegt: ${relative(ROOT, file)}`);
  const zettel = spawnSync(
    "node",
    [
      join(ROOT, ".ara", "tools", "runsheet.mjs"),
      ...(device.customer ? ["--customer", device.customer] : []),
      "--device",
      device.device,
      "--entry",
      `Wartungsbericht aufgenommen: ${relative(ROOT, file)}\n\n${line}`,
    ],
    { encoding: "utf8" }
  );
  if (zettel.status !== 0) {
    console.log(
      "Hinweis: Der Eintrag im Laufzettel hat nicht geklappt " +
        `(${(zettel.stderr || "").trim() || "kein Laufzettel vorhanden"}).`
    );
  }
}
