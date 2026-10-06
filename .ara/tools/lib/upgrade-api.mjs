/**
 * Eine neue Fassung über die Schnittstelle des Geräts einspielen (K28).
 *
 * Bis 0.64.5 ging jedes Update des Kits über SSH: Artefakt hinschieben, `install.sh`
 * dort starten, den Rechner neu starten. Seit das Gerät Updates auf Auftrag annimmt
 * (J39), tut es das alles selbst: es holt das Paket, prüft die Prüfsumme, sichert,
 * baut neu und schaltet um. Das Kit sagt vorher, was kommt, löst es aus, schaut zu
 * und misst vorher und nachher. SSH bleibt als ausdrücklicher Rückfall (`--ssh`).
 *
 * **Kein Pfad und kein Wert des Produkts steht hier ohne Quelle.** Welche Wege das
 * Gerät anbietet, sagt sein Kontrakt; was sie tun, sagt ihre Beschreibung dort.
 * Die Zahlen für die Dauer sind Messungen mit Datum und Gerät.
 *
 * **Der Schlüssel.** Der Bereich `system:update` steckt in keinem Schlüssel von selbst
 * und nicht im Kit-Schlüssel (`app:deploy`): wer eine App einspielen darf, darf damit
 * nicht das Gerät austauschen. Trägt der Kit-Schlüssel den Bereich doch, nimmt das Kit
 * ihn. Sonst legt es mit der Sitzung als Administrator einen Schlüssel für den Anlass
 * an, der nur diesen Bereich trägt und nach ein paar Stunden von selbst abläuft, und
 * widerruft ihn am Ende. Ein Kunde braucht dafür keinen SSH-Zugang, aber ein Konto
 * als Administrator oder einen Kit-Schlüssel mit dem Bereich.
 */

import { spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { t } from "./i18n.mjs";
import { ROOT, adminSession, customerPath, ensureDir, now, today } from "./kit.mjs";
import { baseUrl, call, reason } from "./arasul.mjs";
import { CONTRACT_PATH, findEndpoint } from "./contract.mjs";
import { getSecret } from "./secrets.mjs";
import { TOPICS, compareSnapshots, readTopic, installedVersion, lostAnything, minutes, verdict, verdictSentence, versionIn } from "./upgrade.mjs";

/** Die Wege, die dieses Werkzeug ruft. Ob das Gerät sie anbietet, sagt sein Kontrakt. */
export const WAYS = Object.freeze({
  stand: ["GET", "/api/v1/external/update"],
  newest: ["GET", "/api/v1/external/update/neueste"],
  start: ["POST", "/api/v1/external/update"],
  back: ["POST", "/api/v1/external/update/zurueck"],
});

/** Dieselben Auskünfte für einen Administrator mit Sitzung, nur lesend. */
const SESSION_READ = Object.freeze({ stand: "/api/update/fassung", newest: "/api/update/fassung/neueste" });

/**
 * Gemessen über diesen Weg am 02.10.2026 am Jetson AGX Orin, von der Entwicklung der
 * Plattform (docs/ops/AUSLIEFERUNG.md der Fassung 0.8.16, Abschnitt "Das Gerät
 * aktualisiert sich selbst"). Eine eigene Messung des Kits mit dem nächsten Release
 * kommt dazu und ersetzt diese.
 */
export const MEASURED_API = Object.freeze({
  date: "02.10.2026",
  device: "Jetson AGX Orin",
  runs: Object.freeze([
    Object.freeze({ from: "0.8.14", to: "0.8.16", minutes: 4 }),
    Object.freeze({ from: "0.8.14", to: "0.8.15", minutes: 19 }),
  ]),
});

export function durationSentenceApi(measured = MEASURED_API) {
  const runs = measured.runs.map((r) => ({ ...r }));
  return t(
    `Measured on ${measured.date} at a ${measured.device} through this route: ` +
      runs.map((r) => `${r.minutes} minutes from ${r.from} to ${r.to}`).join(", ") +
      ". The device builds the new images while it keeps running, then switches; while it switches it is not reachable " +
      "for some minutes, which is not a fault. Another device or a bigger update can differ.",
    `Gemessen am ${measured.date} an einem ${measured.device} über diesen Weg: ` +
      runs.map((r) => `${r.minutes} Minuten von ${r.from} auf ${r.to}`).join(", ") +
      ". Das Gerät baut die neuen Images, während es weiterläuft, und schaltet dann um; beim Umschalten ist es einige " +
      "Minuten nicht erreichbar, das ist keine Störung. Ein anderes Gerät oder ein größeres Update kann abweichen."
  );
}

/** Welche Zeilen des Protokolls noch nicht gezeigt wurden. Das Gerät nennt immer die letzten 40. */
export function newLines(printed, lines) {
  const max = Math.min(printed.length, lines.length);
  for (let k = max; k > 0; k--) {
    if (printed.slice(-k).every((line, i) => line === lines[i])) return lines.slice(k);
  }
  return lines;
}

/**
 * Wie der Lauf steht, nach dem, was das Gerät meldet. Ein Lauf mit anderem Ziel ist ein
 * alter und zählt nicht: gleich nach dem Start kann noch der letzte Lauf im Stand liegen.
 */
export function judgeRun(lauf, nach) {
  if (!lauf || (lauf.nach && nach && lauf.nach !== nach)) return { state: "waiting" };
  const status = String(lauf.status || "");
  if (status === "laeuft") return { state: "running" };
  if (status === "fertig") return { state: "done" };
  const text = {
    zurueckgerollt: t("The new version did not come up healthy; the device went back to the previous one by itself.", "Die neue Fassung wurde nicht gesund; das Gerät ist von selbst auf die vorige zurückgegangen."),
    rueckweg_fehlgeschlagen: t("The new version did not come up healthy, and the way back failed too. The device needs a person at it.", "Die neue Fassung wurde nicht gesund, und der Rückweg ist auch fehlgeschlagen. Das Gerät braucht einen Menschen vor Ort."),
    fehlgeschlagen: t("The run failed.", "Der Lauf ist fehlgeschlagen."),
    abgebrochen: t("The run was cut off without a result.", "Der Lauf ist abgebrochen, ohne ein Ergebnis zu melden."),
  }[status];
  return { state: "failed", status, text: [text || t(`The device reports the status ${status || "none"}.`, `Das Gerät meldet den Status ${status || "keinen"}.`), lauf.meldung].filter(Boolean).join(" ") };
}

const str = (v) => (typeof v === "string" ? v : null);
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const REVOKE_TRIES = 6;

/**
 * Der ganze Ablauf. Rückgabe ist der Exit-Code.
 *
 * `mode`: `plan`, `prepare`, `apply` oder `back`. Ohne `--yes` kommt nur `plan` hierher.
 */
export async function runViaInterface({ device, arg, mode, place, call_ }) {
  const say = (text) => console.log(text);
  const step = (text) => say(`\n== ${text}`);
  const pollMs = Number(process.env.ARA_UPDATE_POLL_MS) || 10_000;
  const revokeWaitMs = Number(process.env.ARA_UPDATE_POLL_MS) || 10_000;
  const limitMs = (Number(process.env.ARA_UPDATE_LIMIT_MIN) || 45) * 60_000;

  const ssh = `${call_} --ssh`;
  const sshHint = t(`The explicit fallback is over SSH: ${ssh}`, `Der ausdrückliche Rückfall geht über SSH: ${ssh}`);
  const stop = (text) => {
    say(text);
    return 1;
  };

  if (mode === "prepare") {
    say(
      t(
        "Nothing to prepare on this route: the device backs up by itself as the first step of its run, and stops without changing anything if the backup fails. " +
          `A backup made from the kit is part of the SSH route: ${ssh} --prepare --yes`,
        "Hier gibt es nichts vorzubereiten: das Gerät sichert von selbst als ersten Schritt seines Laufs und hält an, ohne etwas zu ändern, wenn die Sicherung scheitert. " +
          `Eine Sicherung aus dem Kit gehört zum Weg über SSH: ${ssh} --prepare --yes`
      )
    );
    return 0;
  }

  const address = String(device.fields.address || device.fields.hostname || "");
  let base;
  try {
    base = baseUrl(device.fields.api_base || str(arg.base) || address);
  } catch (error) {
    return stop(`${error.message}\n${sshHint}`);
  }
  const insecure = Boolean(arg.insecure) || String(device.fields.tls || "").toLowerCase() === "selfsigned";

  // --- Die Sitzung als Administrator, nur wenn sie gebraucht wird -----------------
  let sessionMemo = null;
  // Die Anmeldung steht in `device.mjs --admin-login`; der Ausweis kommt über `adminSession`.
  const login = () => adminSession(device, arg);
  const session = () => (sessionMemo ||= login());

  const guarded = async (options) => {
    try {
      return await call({ base, insecure, ...options });
    } catch (error) {
      return { ok: false, status: 0, error: { message: error.message }, data: null, body: null };
    }
  };
  const asAdmin = async (method, path, options = {}) => {
    const s = session();
    if (!s.ok) return { ok: false, status: 0, error: { message: s.reason }, data: null, body: null };
    return guarded({ key: `Bearer ${s.bearer}`, keyHeader: "Authorization", method, path, ...options });
  };

  // --- Welcher Schlüssel, und was er sieht ---------------------------------------
  let keyHeader; // der Kontrakt nennt ihn; bis dahin gilt die Vorgabe des Aufrufs
  let contract = null;
  const withKey = (key) => (method, path, options = {}) => guarded({ key, keyHeader, method, path, ...options });

  const kitKeyRef = device.fields.api_key_ref;
  const kitKey = kitKeyRef ? getSecret(kitKeyRef) : null;
  let updateKey = null; // { ask, minted }

  async function readContract(ask) {
    const answer = await ask("GET", CONTRACT_PATH);
    if (!answer.ok) return null;
    keyHeader = answer.data?.schluessel?.kopf || undefined;
    return answer.data;
  }

  if (kitKey) {
    const ask = withKey(kitKey);
    const c = await readContract(ask);
    if (c) {
      const ask2 = withKey(kitKey);
      const probe = await ask2(...WAYS.stand);
      if (probe.ok) {
        updateKey = { ask: ask2, minted: null, source: "kit" };
        contract = c;
      } else {
        contract = c;
      }
    }
  }

  /** Eine Auskunft über den Stand: mit dem Schlüssel, sonst lesend mit der Sitzung. */
  async function read(which) {
    if (updateKey) return updateKey.ask(...WAYS[which]);
    return asAdmin("GET", SESSION_READ[which]);
  }

  const stand = await read("stand");
  if (!stand.ok) {
    const s = updateKey ? null : session();
    return stop(
      t(
        `The state of the update could not be read from ${place}: ${stand.status === 0 && s && !s.ok ? `no key with the scope system:update and no administrator session (${s.reason}). Pass --login-user and --password-ref, or let the kit key carry the scope.` : reason(stand)}\n${sshHint}`,
        `Der Stand der Aktualisierung ließ sich von ${place} nicht lesen: ${stand.status === 0 && s && !s.ok ? `kein Schlüssel mit dem Bereich system:update und keine Sitzung als Administrator (${s.reason}). --login-user und --password-ref angeben, oder den Kit-Schlüssel den Bereich tragen lassen.` : reason(stand)}\n${sshHint}`
      )
    );
  }
  const state = stand.data ?? stand.body?.data ?? {};
  const newestAnswer = await read("newest");
  const newest = newestAnswer.ok ? versionIn(newestAnswer.data?.fassung ?? newestAnswer.body?.fassung) : null;
  const wantedVersion = str(arg.version) ? versionIn(str(arg.version)) : null;
  const target = wantedVersion || newest;

  const installed = installedVersion({ installation: state.fassung?.nummer ?? null, status: state.fassung?.version ?? null });
  const kind = verdict(installed.version, target);

  // --- Der Rückweg-Modus ---------------------------------------------------------
  if (mode === "back") {
    if (!state.zurueckMoeglich) {
      return stop(
        t(
          "Nothing to go back to: the device names no previous version it could return to.",
          "Nichts, wohin zurückzugehen wäre: das Gerät nennt keine vorige Fassung, auf die es zurück könnte."
        )
      );
    }
  }

  const snapshot = async () => {
    if (!session().ok) return null;
    const out = {};
    for (const topic of TOPICS) out[topic.key] = await readTopic(topic, asAdmin, out);
    return out;
  };

  // --- Der Plan ------------------------------------------------------------------
  const backEntry = contract ? findEndpoint(contract, ...WAYS.back) : null;
  const startEntry = contract ? findEndpoint(contract, ...WAYS.start) : null;
  const plan = [t(`# Update plan for ${place}`, `# Plan für das Einspielen auf ${place}`), ""];
  plan.push(t("## Versions", "## Fassungen"), "");
  plan.push(installed.version ? t(`- On the device: ${installed.version}`, `- Am Gerät: ${installed.version}`) : t("- On the device: not established", "- Am Gerät: nicht festgestellt"));
  if (installed.stamp) {
    plan.push(
      t(
        `- What runs now is reported as ${installed.stamp}. That is a state, not a release number; only the number is compared.`,
        `- Was gerade läuft, meldet das Gerät als ${installed.stamp}. Das ist ein Stand und keine Release-Nummer; verglichen wird nur die Nummer.`
      )
    );
  }
  plan.push(
    target
      ? t(`- Newest: ${target} (${wantedVersion ? "named with --version" : "the device asked for it itself"})`, `- Neueste: ${target} (${wantedVersion ? "mit --version genannt" : "das Gerät hat selbst gefragt"})`)
      : t(
          `- Newest: not established (${newestAnswer.ok ? "the device named no version" : reason(newestAnswer)})`,
          `- Neueste: nicht festgestellt (${newestAnswer.ok ? "das Gerät nannte keine Fassung" : reason(newestAnswer)})`
        )
  );
  plan.push("", mode === "back" ? "" : verdictSentence(kind, installed.version, target), "");
  if (state.einspielenMoeglich === false) {
    plan.push(t(`- The device says an update cannot run now: ${state.einspielenGrund || "no reason given"}`, `- Das Gerät sagt, dass jetzt kein Update laufen kann: ${state.einspielenGrund || "ohne Begründung"}`), "");
  }
  if (state.laeuft) {
    plan.push(t("- A run is under way on the device right now.", "- Am Gerät läuft gerade schon ein Lauf."), "");
  }

  // Was das Gerät jetzt hat, gezählt wie beim Lauf: der Stand, gegen den nachher verglichen würde.
  const now_ = await snapshot();
  if (now_) {
    plan.push(t("## What the device has now", "## Was das Gerät jetzt hat"), "");
    for (const topic of TOPICS) {
      const row = now_[topic.key];
      plan.push(`- ${topic.label()}: ${row.state === "gelesen" ? row.entries.length : t(`not measured (${row.text})`, `nicht gemessen (${row.text})`)}`);
    }
    const perApp = {};
    for (const entry of now_["app-flows"]?.entries || []) {
      const app = entry.key.split(" ")[0];
      perApp[app] = (perApp[app] || 0) + 1;
    }
    if (Object.keys(perApp).length) {
      plan.push(t(`- Flows per app: ${Object.entries(perApp).map(([app, n]) => `${app} ${n}`).join(", ")}`, `- Flows je App: ${Object.entries(perApp).map(([app, n]) => `${app} ${n}`).join(", ")}`));
    }
    plan.push("");
  }

  plan.push(t("## What happens", "## Was passiert"), "");
  [
    t(
      "The kit notes the state: accounts, licence, apps with their data, flows, models, company folders.",
      "Das Kit hält den Stand fest: Konten, Lizenz, Apps mit Daten, Flows, Modelle, Firmenordner."
    ),
    startEntry
      ? t(`The kit asks the device to update. What the device says about this route: ${startEntry.was}`, `Das Kit bittet das Gerät um das Update. Was das Gerät zu diesem Weg sagt: ${startEntry.was}`)
      : t("The kit asks the device to update. The device does the rest itself: fetching, checking the checksum, backing up, building, switching.", "Das Kit bittet das Gerät um das Update. Den Rest macht das Gerät selbst: holen, Prüfsumme prüfen, sichern, bauen, umschalten."),
    t("The kit watches the steps and the log of the device and says each one as it comes. No file goes from this computer to the device.", "Das Kit schaut den Schritten und dem Protokoll des Geräts zu und sagt jeden, sobald er kommt. Es geht keine Datei von diesem Computer zum Gerät."),
    t("The device is not reachable for some minutes while it switches. The kit waits and asks again.", "Beim Umschalten ist das Gerät einige Minuten nicht erreichbar. Das Kit wartet und fragt wieder."),
    t("The computer itself is not restarted.", "Der Rechner selbst wird nicht neu gestartet."),
    t("The kit compares the state with the one before, files the report and the entry in the runsheet.", "Das Kit vergleicht den Stand mit dem von vorher, legt den Bericht und den Eintrag im Laufzettel ab."),
  ].forEach((s, i) => plan.push(`${i + 1}. ${s}`));

  plan.push("", t("## How long", "## Wie lange"), "", `- ${durationSentenceApi()}`);

  plan.push("", t("## The way back", "## Der Rückweg"), "");
  if (backEntry) {
    plan.push(t(`- The device's contract names it: ${backEntry.was}`, `- Der Kontrakt des Geräts nennt ihn: ${backEntry.was}`));
  } else {
    plan.push(t("- The device's contract was not read for this plan (no key with the scope system:update yet), so the way back is named at the run, from the contract.", "- Der Kontrakt des Geräts wurde für diesen Plan nicht gelesen (noch kein Schlüssel mit dem Bereich system:update), der Rückweg wird darum beim Lauf aus dem Kontrakt genannt."));
  }
  plan.push(
    state.zurueckMoeglich
      ? t(`- The device knows a previous version right now: ${state.vorige?.fassung ?? "?"}. ${call_} --back --yes asks it to go back.`, `- Das Gerät kennt gerade eine vorige Fassung: ${state.vorige?.fassung ?? "?"}. ${call_} --back --yes bittet es, dorthin zurückzugehen.`)
      : t("- The device names no previous version to go back to right now. After the run its answer shows whether it keeps one, and the report says so.", "- Das Gerät nennt gerade keine vorige Fassung, auf die es zurück könnte. Nach dem Lauf zeigt seine Antwort, ob es eine behält, und der Bericht sagt es."),
    t("- The way back brings the program of the previous version, not the data. The backup the device takes first lies ready if the data should go back too, and that is a person's decision.", "- Der Rückweg holt das Programm der vorigen Fassung, nicht die Daten. Die Sicherung, die das Gerät zuerst macht, liegt bereit, falls auch die Daten zurück sollen, und das entscheidet ein Mensch.")
  );

  plan.push("", t("## The key", "## Der Schlüssel"), "");
  plan.push(
    updateKey
      ? t("- The kit key carries the scope system:update; the kit uses it.", "- Der Kit-Schlüssel trägt den Bereich system:update; das Kit nimmt ihn.")
      : t(
          "- No key with the scope system:update is at hand: the kit key carries app:deploy, and that is on purpose. For the run the kit creates a key for this occasion with an administrator session, with that one scope, running out by itself after three hours, and revokes it at the end.",
          "- Kein Schlüssel mit dem Bereich system:update zur Hand: der Kit-Schlüssel trägt app:deploy, und das ist Absicht. Für den Lauf legt das Kit mit einer Sitzung als Administrator einen Schlüssel für diesen Anlass an, mit genau diesem einen Bereich, nach drei Stunden von selbst abgelaufen, und widerruft ihn am Ende."
        ),
    t("- No SSH access is needed on this route.", "- Auf diesem Weg braucht es keinen SSH-Zugang.")
  );

  // --- Entscheidung vor dem Plan: gleiche und ältere Fassung enden mit einem Satz --
  if (mode === "apply" && kind !== "update") {
    say(verdictSentence(kind, installed.version, target));
    return 0;
  }
  if (mode === "apply" && (state.einspielenMoeglich === false || state.laeuft)) {
    say(plan.join("\n"));
    return stop(
      state.laeuft
        ? t("\nNothing was started: a run is under way on the device.", "\nEs wurde nichts gestartet: am Gerät läuft schon ein Lauf.")
        : t(`\nNothing was started: ${state.einspielenGrund || "the device says an update cannot run now"}.`, `\nEs wurde nichts gestartet: ${state.einspielenGrund || "das Gerät sagt, dass jetzt kein Update laufen kann"}.`)
    );
  }
  say(plan.join("\n"));
  if (mode === "plan") {
    say("\n" + t(`Nothing was changed. To deploy: ${call_} --apply --yes`, `Es wurde nichts geändert. Zum Einspielen: ${call_} --apply --yes`));
    return 0;
  }

  // --- Der Lauf ------------------------------------------------------------------
  const timeline = [];
  const mark = (what, ok, detail = "") => {
    timeline.push({ at: now(), what, ok, detail });
    say(`${ok ? "ok" : "FEHLER"}  ${what}${detail ? `: ${detail}` : ""}`);
  };
  let outcome = "done";
  let comparison = null;
  let afterState = null;
  let runMs = null;
  let minted = null;
  let before = null;

  try {
    step(t("State before", "Stand vorher"));
    before = await snapshot();
    if (before) {
      mark(t("State noted", "Stand festgehalten"), true, TOPICS.map((topic) => `${topic.label()} ${before[topic.key].state === "gelesen" ? before[topic.key].entries.length : t("unmeasured", "ungemessen")}`).join(", "));
    } else {
      mark(t("State noted", "Stand festgehalten"), true, t(`not measured: no administrator session (${session().reason}). The run goes on without the comparison.`, `nicht gemessen: keine Sitzung als Administrator (${session().reason}). Der Lauf geht ohne den Vergleich weiter.`));
    }

    step(t("Key", "Schlüssel"));
    if (!updateKey) {
      const s = session();
      if (!s.ok) {
        outcome = "stopped";
        mark(t("Key", "Schlüssel"), false, t(`no key with the scope system:update and no administrator session (${s.reason}). Nothing on the device was changed.`, `kein Schlüssel mit dem Bereich system:update und keine Sitzung als Administrator (${s.reason}). Am Gerät wurde nichts geändert.`));
        throw new Error("stop");
      }
      const made = await asAdmin("POST", "/api/v1/external/api-keys", {
        json: {
          name: `Update ${target ?? ""} (Ara-Kit, ${today()})`.replace("  ", " "),
          description: t("Created for this one update run, revoked afterwards.", "Für diesen einen Update-Lauf angelegt, wird danach widerrufen."),
          allowed_endpoints: ["system:update"],
          expires_at: new Date(Date.now() + 3 * 3600_000).toISOString(),
        },
      });
      const plain = made.body?.api_key;
      if (!made.ok || !plain) {
        outcome = "stopped";
        mark(t("Key", "Schlüssel"), false, t(`the device did not create a key for this occasion: ${reason(made)}. Nothing was changed.`, `das Gerät hat keinen Schlüssel für diesen Anlass angelegt: ${reason(made)}. Es wurde nichts geändert.`));
        throw new Error("stop");
      }
      minted = { id: made.body.key_id, prefix: made.body.key_prefix };
      updateKey = { ask: withKey(plain), minted, source: "occasion" };
      mark(t("Key created for this occasion", "Schlüssel für diesen Anlass angelegt"), true, t(`scope system:update only, runs out after three hours, revoked at the end (${minted.prefix})`, `nur der Bereich system:update, läuft nach drei Stunden ab, wird am Ende widerrufen (${minted.prefix})`));
    } else {
      mark(t("Kit key carries the scope", "Kit-Schlüssel trägt den Bereich"), true);
    }

    contract = (await readContract(updateKey.ask)) ?? contract;
    const way = mode === "back" ? WAYS.back : WAYS.start;
    if (!contract || !findEndpoint(contract, ...way)) {
      outcome = "stopped";
      mark(t("Contract", "Kontrakt"), false, t(`the device does not name ${way[0]} ${way[1]} in its contract. The kit calls nothing the device does not promise. ${sshHint}`, `das Gerät nennt ${way[0]} ${way[1]} nicht in seinem Kontrakt. Das Kit ruft nichts, was das Gerät nicht verspricht. ${sshHint}`));
      throw new Error("stop");
    }

    step(mode === "back" ? t("Going back", "Zurück") : t("Update", "Einspielen"));
    const began = Date.now();
    const started = await updateKey.ask(...way, mode === "back" ? {} : { json: { fassung: target } });
    if (started.status !== 202) {
      outcome = "stopped";
      mark(t("Start", "Start"), false, t(`the device refused (status ${started.status}): ${reason(started)}. Nothing was changed.`, `das Gerät hat abgelehnt (Status ${started.status}): ${reason(started)}. Es wurde nichts geändert.`));
      throw new Error("stop");
    }
    const goal = started.data?.nach ?? target;
    mark(t("Device accepted", "Gerät hat angenommen"), true, `${started.data?.von ?? installed.version ?? "?"} -> ${goal ?? "?"}`);

    // Zusehen. Das Gerät ist beim Umschalten nicht erreichbar: das ist kein Fehler.
    let lastStep = null;
    let printed = [];
    let silent = 0;
    let verdictNow = { state: "waiting" };
    while (Date.now() - began < limitMs) {
      await sleep(pollMs);
      const answer = await updateKey.ask(...WAYS.stand);
      if (!answer.ok) {
        if (silent++ === 0) say(t("  . the device does not answer right now (it switches); asking again", "  . das Gerät antwortet gerade nicht (es schaltet um); das Kit fragt wieder"));
        continue;
      }
      silent = 0;
      const lauf = answer.data?.lauf ?? null;
      if (lauf?.schritt && lauf.schritt !== lastStep && (!lauf.nach || !goal || lauf.nach === goal)) {
        lastStep = lauf.schritt;
        say(`  > ${t("step", "Schritt")}: ${lastStep}${lauf.meldung ? `, ${lauf.meldung}` : ""}`);
      }
      const lines = Array.isArray(lauf?.protokoll) ? lauf.protokoll.map(String) : [];
      if (!lauf?.nach || !goal || lauf.nach === goal) {
        for (const line of newLines(printed, lines)) say(`    ${line}`);
        printed = lines;
      }
      verdictNow = judgeRun(lauf, goal);
      if (verdictNow.state === "done" || verdictNow.state === "failed") {
        afterState = answer.data;
        break;
      }
    }
    runMs = Date.now() - began;
    if (verdictNow.state === "done") {
      mark(t("The device reports the run as done", "Das Gerät meldet den Lauf als fertig"), true, minutes(runMs));
    } else if (verdictNow.state === "failed") {
      outcome = "failed";
      mark(t("The run did not end clean", "Der Lauf ist nicht sauber zu Ende gegangen"), false, `${verdictNow.status}, ${verdictNow.text}`);
    } else {
      outcome = "failed";
      mark(t("The run did not end in time", "Der Lauf ist nicht rechtzeitig zu Ende gegangen"), false, t(`no end reported after ${minutes(runMs)}. The device may still be working; look at ${call_} later.`, `nach ${minutes(runMs)} kein Ende gemeldet. Das Gerät arbeitet vielleicht noch; später nachsehen mit ${call_}.`));
    }

    step(t("State after", "Stand nachher"));
    const nowStand = afterState ?? (await updateKey.ask(...WAYS.stand)).data ?? {};
    afterState = nowStand;
    const afterVersion = installedVersion({ installation: nowStand.fassung?.nummer ?? null, status: nowStand.fassung?.version ?? null });
    const reached = afterVersion.version === goal;
    mark(t("Version after", "Fassung danach"), reached, `${afterVersion.version ?? t("unknown", "unbekannt")} (${t("wanted", "gewollt")} ${goal ?? "?"})`);
    if (!reached) outcome = "failed";
    mark(t("Way back known to the device", "Rückweg dem Gerät bekannt"), true, nowStand.zurueckMoeglich ? t(`yes, ${nowStand.vorige?.fassung ?? "?"}`, `ja, ${nowStand.vorige?.fassung ?? "?"}`) : t("no previous version named", "keine vorige Fassung genannt"));

    // Die Sitzung kann in der Zwischenzeit abgelaufen sein: neu anmelden.
    sessionMemo = null;
    const after = before ? await snapshot() : null;
    if (before && after) {
      comparison = compareSnapshots(before, after);
      for (const row of comparison) {
        const text = { same: t("unchanged", "unverändert"), changed: t("changed, see the report", "geändert, siehe Bericht"), lost: t("SOMETHING IS MISSING", "ETWAS FEHLT"), unmeasured: t("not measured", "nicht gemessen") }[row.verdict];
        mark(row.label, row.verdict === "same" || row.verdict === "changed", text);
      }
      if (lostAnything(comparison)) outcome = "failed";
    } else if (before) {
      mark(t("Comparison", "Vergleich"), false, t("no administrator session after the run; the state afterwards was not measured", "keine Sitzung als Administrator nach dem Lauf; der Stand nachher wurde nicht gemessen"));
      outcome = outcome === "done" ? "failed" : outcome;
    }
  } catch (error) {
    if (error.message !== "stop") {
      outcome = "failed";
      mark(t("Run", "Lauf"), false, error.message);
    }
  } finally {
    if (minted) {
      sessionMemo = null;
      // Nach dem Umschalten ist das Gerät oft noch einen Moment nicht erreichbar ("No connection",
      // Status 0): dann wieder fragen, bevor der Schlüssel als nicht widerrufen gilt.
      let gone = await asAdmin("DELETE", `/api/v1/external/api-keys/${minted.id}`);
      for (let tries = 0; !gone.ok && gone.status === 0 && tries < REVOKE_TRIES; tries++) {
        await sleep(revokeWaitMs);
        sessionMemo = null;
        gone = await asAdmin("DELETE", `/api/v1/external/api-keys/${minted.id}`);
      }
      if (gone.ok) {
        mark(t("Key for this occasion revoked", "Schlüssel für diesen Anlass widerrufen"), true, minted.prefix);
      } else {
        mark(t("Key for this occasion revoked", "Schlüssel für diesen Anlass widerrufen"), false, t(`${reason(gone)}. It runs out by itself within three hours. Revoke it by hand under Settings, API keys on the device: ${minted.prefix}`, `${reason(gone)}. Er läuft innerhalb von drei Stunden von selbst ab. Von Hand widerrufen in den Einstellungen, API-Schlüssel am Gerät: ${minted.prefix}`));
        if (outcome === "done") outcome = "failed";
      }
    }
  }

  // --- Bericht und Verlauf -------------------------------------------------------
  const out = [...plan, ""];
  out.push(t("## Run", "## Lauf"), "", t(`Recorded: ${now()}, mode: ${mode}`, `Aufgenommen: ${now()}, Art: ${mode}`), "");
  for (const row of timeline) out.push(`- ${row.ok ? "ok" : "**" + t("failed", "fehlgeschlagen") + "**"}: ${row.what}${row.detail ? `, ${row.detail}` : ""}`);
  const log = Array.isArray(afterState?.lauf?.protokoll) ? afterState.lauf.protokoll : [];
  if (log.length) {
    out.push("", t("## Log of the device (last lines)", "## Protokoll des Geräts (letzte Zeilen)"), "");
    for (const line of log) out.push(`    ${line}`);
  }
  if (comparison) {
    out.push("", t("## Before and after", "## Vorher und nachher"), "");
    for (const row of comparison) {
      const head = { same: t("unchanged", "unverändert"), changed: t("changed", "geändert"), lost: t("**missing**", "**fehlt**"), unmeasured: t("not measured", "nicht gemessen") }[row.verdict];
      out.push(`### ${row.label}: ${head}`);
      if (row.verdict === "unmeasured") {
        out.push("", `- ${row.before?.text || row.after?.text || row.before?.state || ""}`);
      } else {
        out.push("", t(`- Before: ${row.before.entries.length} entries, after: ${row.after.entries.length}`, `- Vorher: ${row.before.entries.length} Einträge, nachher: ${row.after.entries.length}`));
        for (const e of row.diff.missing) out.push(t(`- Missing afterwards: ${e.key} (${e.before})`, `- Nachher nicht mehr da: ${e.key} (${e.before})`));
        for (const e of row.diff.changed) out.push(`- ${t("Changed", "Geändert")}: ${e.key}: ${e.before} -> ${e.after}`);
        for (const e of row.diff.added) out.push(`- ${t("New", "Neu")}: ${e.key} (${e.after})`);
      }
      out.push("");
    }
  }
  out.push(t("## Result", "## Ergebnis"), "");
  out.push(
    {
      done: mode === "back" ? t("Gone back and checked.", "Zurückgegangen und geprüft.") : t("Deployed and checked.", "Eingespielt und geprüft."),
      stopped: t("Stopped before the device was changed.", "Angehalten, bevor das Gerät geändert wurde."),
      failed: t("Not clean. See the lines marked as failed above.", "Nicht sauber. Siehe die als fehlgeschlagen markierten Zeilen oben."),
    }[outcome]
  );
  if (outcome === "done" && mode === "apply") {
    out.push(
      t(
        `The device fetched and checked the package itself and backed up first; this computer sent no file. The run took ${minutes(runMs)}. The mirror of the kit (.ara/mirror/) still holds the earlier artifact: node .ara/tools/mirror.mjs --refresh brings it up to date.`,
        `Das Gerät hat das Paket selbst geholt und geprüft und vorher gesichert; von diesem Computer ging keine Datei. Der Lauf dauerte ${minutes(runMs)}. Der Spiegel des Kits (.ara/mirror/) hält noch das frühere Artefakt: node .ara/tools/mirror.mjs --refresh bringt ihn auf den Stand.`
      )
    );
  }
  out.push("");

  const kindWord = mode === "back" ? "rueckweg" : mode === "apply" ? "aktualisierung" : "vorpruefung";
  const dir = ensureDir(join(device.path, "reports"));
  let file = join(dir, `${today()}-${kindWord}.md`);
  let n = 2;
  while (existsSync(file)) file = join(dir, `${today()}-${kindWord}-${n++}.md`);
  writeFileSync(file, out.join("\n"));
  say("\n" + t(`Report filed: ${relative(ROOT, file)}`, `Bericht abgelegt: ${relative(ROOT, file)}`));

  const summary = t(
    `${mode === "back" ? "Way back" : "Update"} through the interface: ${installed.version ?? "?"} to ${target ?? "?"}, result ${outcome}. Report ${relative(ROOT, file)}.`,
    `${mode === "back" ? "Rückweg" : "Update"} über die Schnittstelle: ${installed.version ?? "?"} auf ${target ?? "?"}, Ergebnis ${outcome}. Bericht ${relative(ROOT, file)}.`
  );
  const sheet = spawnSync(
    "node",
    [join(ROOT, ".ara", "tools", "runsheet.mjs"), ...(device.customer ? ["--customer", device.customer] : []), "--device", device.device, "--entry", summary],
    { encoding: "utf8" }
  );
  if (sheet.status !== 0) {
    say(t(`Note: the entry in the runsheet did not work (${(sheet.stderr || "").trim() || "no runsheet present"}).`, `Hinweis: Der Eintrag im Laufzettel hat nicht geklappt (${(sheet.stderr || "").trim() || "kein Laufzettel vorhanden"}).`));
  }
  if (device.customer) {
    const history = ensureDir(join(customerPath(device.customer), "history"));
    let entry = join(history, `${today()}-aktualisierung.md`);
    let m = 2;
    while (existsSync(entry)) entry = join(history, `${today()}-aktualisierung-${m++}.md`);
    writeFileSync(
      entry,
      [
        "---",
        `date: ${today()}`,
        "type: update",
        `device: ${device.device}`,
        "---",
        "",
        `# ${t("Update", "Update")} ${device.device}`,
        "",
        `## ${t("Occasion", "Anlass")}`,
        "",
        t(`New version ${target ?? "?"} for ${installed.version ?? "?"}.`, `Neue Fassung ${target ?? "?"} zu ${installed.version ?? "?"}.`),
        "",
        `## ${t("Done", "Getan")}`,
        "",
        summary,
        "",
        `## ${t("Evidence", "Nachweis")}`,
        "",
        t(`The report lies at ${relative(ROOT, file)}: the device's own log, state compared before and after.`, `Der Bericht liegt unter ${relative(ROOT, file)}: das Protokoll des Geräts selbst, Stand vorher und nachher verglichen.`),
        "",
      ].join("\n")
    );
    say(t(`History entry: ${relative(ROOT, entry)}`, `Verlaufseintrag: ${relative(ROOT, entry)}`));
  }
  return outcome === "done" ? 0 : 1;
}
