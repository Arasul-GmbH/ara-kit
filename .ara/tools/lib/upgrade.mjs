/**
 * Eine neue Fassung auf ein Gerät spielen: was das Kit dazu entscheidet und vergleicht.
 *
 * Bis 0.58.0 stand für das Update im Wissen des Kits ein Satz: „dem Weg des Produkts
 * folgend (im Spiegel nachlesen)". Ein Kunde ohne Fernzugriff von Arasul gab dann die
 * Zeilen aus dem Handbuch von Hand an `remote.mjs`, ohne Dauer und ohne Rückweg, und
 * schob das Update auf. Dieses Modul ist der Teil davon, der ohne Netz auskommt:
 * welche Fassung auf dem Gerät gilt, ob die neue neuer ist, welche Zeile einer
 * Prüfsumme gilt, und was vor und nach dem Einspielen verglichen wird.
 *
 * **Die Zahlen für die Dauer sind Messungen und keine Produktwerte.** Sie tragen ihr
 * Datum und ihr Gerät. Nennt das Produkt künftig eine eigene, gilt die.
 *
 * Reine Funktionen, ohne Netz und ohne Dateien (bis auf `sha256File`), damit der
 * Selbsttest sie mit erfundenen Antworten prüfen kann.
 */

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { compareVersions } from "./version.mjs";
import { routeRows } from "./adminways.mjs";
import { normalize } from "./docroutes.mjs";
import { t } from "./i18n.mjs";
import { reason } from "./arasul.mjs";

/** Gemessen am 01.10.2026 am Jetson AGX Orin, Aktualisierung von 0.8.12 auf 0.8.14. */
export const MEASURED = Object.freeze({
  date: "01.10.2026",
  device: "Jetson AGX Orin",
  from: "0.8.12",
  to: "0.8.14",
  installMinutes: 2.5,
  restartMinutes: 3,
});

/**
 * Wie das Kit am Gerät den Ordner findet, aus dem die laufende Plattform gestartet
 * wurde. Dort liegen die Anleitungen der Fassung, die läuft. Eine Zeile `@dir=`.
 */
export const FIND_DOCS =
  `best=$(docker ps --format '{{.Label "com.docker.compose.project.working_dir"}}' 2>/dev/null | ` +
  `grep -v '^$' | sort | uniq -c | sort -rn | while read n d; do [ -d "$d/docs" ] && echo "$d" && break; done); ` +
  `if [ -z "$best" ]; then for d in "$HOME/arasul" "$HOME"/arasul-* /opt/arasul /arasul; do ` +
  `[ -d "$d/docs" ] && best="$d"; done; fi; echo "@dir=$best"`;

/** Was `install.sh` zuletzt eingerichtet hat, und die Boot-Kennung. Liest nur. */
export const INSTALLATION_PROBE =
  `p() { printf '@%s=%s\\n' "$1" "$2"; }; ` +
  `p installation "$(cat "$HOME/.arasul/installation" 2>/dev/null)"; ` +
  `p boot "$(cat /proc/sys/kernel/random/boot_id 2>/dev/null)"; ` +
  FIND_DOCS;

/** Die Nummer x.y.z aus einem Text, etwa dem Namen eines Installationsordners. */
export function versionIn(text) {
  const match = String(text || "").match(/(\d+\.\d+\.\d+)(?!\.\d)/);
  return match ? match[1] : null;
}

/** Aus `@schlüssel=wert`-Zeilen ein Objekt. */
export function parseFacts(output) {
  const facts = {};
  for (const line of String(output || "").split(/\r?\n/)) {
    const m = line.match(/^@([a-z_]+)=(.*)$/);
    if (m && m[2].trim()) facts[m[1]] = m[2].trim();
  }
  return facts;
}

/**
 * Welche Fassung auf dem Gerät gilt.
 *
 * Drei Quellen, und jede sagt etwas anderes: der Kontrakt nennt die Fassung der
 * Plattform, der Installationsordner nennt, was zuletzt eingespielt wurde, und die
 * Statusroute des Geräts nennt, was gerade läuft. Am Orin am 01.10.2026 waren das
 * `0.8.14` und `20261001-759a2b8`, denn nach dem Artefakt lief ein Deploy darüber. Das
 * eine ist eine Veröffentlichung, das andere ein Stand. Verglichen wird nur mit der
 * Nummer; der Stand wird daneben genannt und nicht verschwiegen.
 */
export function installedVersion({ contract = null, installation = null, status = null } = {}) {
  const sources = [];
  if (contract) sources.push({ from: "contract", value: String(contract) });
  if (installation) sources.push({ from: "folder", value: String(installation) });
  if (status) sources.push({ from: "status", value: String(status) });
  const numbered = sources.map((source) => ({ ...source, number: versionIn(source.value) }));
  const picked = numbered.find((source) => source.number);
  return {
    version: picked ? picked.number : null,
    from: picked ? picked.from : null,
    // Was die Statusroute nennt und nicht die Nummer ist: ein Stand aus einem Deploy.
    stamp: status && String(status) !== picked?.number ? String(status) : null,
    sources: numbered,
  };
}

/** `update`, `same`, `older` oder `unknown`. Die Entscheidung, ob eingespielt wird. */
export function verdict(installed, latest) {
  if (!versionIn(installed) || !versionIn(latest)) return "unknown";
  const order = compareVersions(latest, installed);
  return order > 0 ? "update" : order === 0 ? "same" : "older";
}

/** Der Satz zur Entscheidung. Bei `same` und `older` ist es der, mit dem der Befehl endet. */
export function verdictSentence(kind, installed, latest) {
  if (kind === "update") {
    return t(`${installed} is deployed, ${latest} is newer.`, `${installed} ist eingespielt, ${latest} ist neuer.`);
  }
  if (kind === "same") {
    return t(
      `Nothing to deploy: the device already carries ${installed}, and ${latest} is not newer.`,
      `Nichts einzuspielen: das Gerät trägt schon ${installed}, und ${latest} ist nicht neuer.`
    );
  }
  if (kind === "older") {
    return t(
      `Nothing deployed: ${latest} is older than ${installed} on the device, and the kit does not step a device down.`,
      `Nichts eingespielt: ${latest} ist älter als ${installed} am Gerät, und das Kit stuft ein Gerät nicht herunter.`
    );
  }
  const what = !installed && !latest ? "both" : !installed ? "device" : "newest";
  return t(
    {
      both: "Nothing deployed: neither the version on the device nor the newest one could be established, and without both the kit does not compare.",
      device: "Nothing deployed: the version on the device could not be established, and without it the kit does not compare.",
      newest: "Nothing deployed: the newest version could not be established, and without it the kit does not compare.",
    }[what],
    {
      both: "Nichts eingespielt: weder die Fassung am Gerät noch die neueste ließ sich feststellen, und ohne beide vergleicht das Kit nicht.",
      device: "Nichts eingespielt: die Fassung am Gerät ließ sich nicht feststellen, und ohne sie vergleicht das Kit nicht.",
      newest: "Nichts eingespielt: die neueste Fassung ließ sich nicht feststellen, und ohne sie vergleicht das Kit nicht.",
    }[what]
  );
}

/**
 * Das Release aus der Antwort der GitHub-Schnittstelle.
 *
 * Das Artefakt ist die erste Datei auf `.tar.gz`, die Prüfsumme die daneben auf
 * `.sha256`. Genau so beschreibt das Produkt es in seiner Auslieferung.
 */
export function githubRelease(json) {
  if (!json || typeof json !== "object") return null;
  const version = versionIn(json.tag_name);
  const assets = Array.isArray(json.assets) ? json.assets : [];
  const tarball = assets.find((a) => /\.tar\.gz$/i.test(a?.name || ""));
  const sum = assets.find((a) => /\.tar\.gz\.sha256$/i.test(a?.name || ""));
  if (!version || !tarball) return null;
  return {
    version,
    tag: json.tag_name,
    tarball: { name: tarball.name, url: tarball.browser_download_url },
    sum: sum ? { name: sum.name, url: sum.browser_download_url } : null,
  };
}

/**
 * Wo das Release liegt, wenn die Auslieferung am Gerät eine Adresse davon nennt:
 * `github.com/<inhaber>/<name>/releases/download/…`. Ein Platzhalter (`…`) zählt nicht.
 */
export function repoFrom(text) {
  const match = String(text || "").match(/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\/releases\/download/);
  return match ? match[1] : null;
}

/** Die Prüfsumme aus einer `.sha256`-Datei: 64 Hexzeichen, mit oder ohne Dateinamen. */
export function parseSha256(text) {
  const match = String(text || "").match(/\b([0-9a-f]{64})\b/i);
  return match ? match[1].toLowerCase() : null;
}

/** Die Prüfsumme einer Datei, gelesen als Strom. */
export function sha256File(path) {
  return new Promise((done, failed) => {
    const hash = createHash("sha256");
    createReadStream(path)
      .on("data", (chunk) => hash.update(chunk))
      .on("error", failed)
      .on("end", () => done(hash.digest("hex")));
  });
}

/** Steht der Weg in der API-Referenz des Geräts? Die Tabellenzeilen werden gelesen. */
export function routeListed(rows, verb, path) {
  const wanted = normalize(path);
  return rows.some((row) => row.verb === verb && normalize(row.path) === wanted);
}

export { routeRows };

/**
 * Was ein Gerät sagt, wenn es einen Weg zurück auf die vorige Fassung nennt.
 *
 * Gesucht wird in den Anleitungen, die auf dem Gerät liegen, nach Zeilen, die davon
 * handeln. Findet das Kit keine, sagt es genau das: das Produkt nennt keinen. Es
 * erfindet keinen, und es zählt eine Wiederherstellung der Daten nicht als einen.
 */
const WAY_BACK = /(zurück auf (die |den )?(vorige|vorherige|alte|frühere)|herunterstuf|downgrade|auf die vorige fassung|rückweg|rollback)/i;

export function wayBackLines(files) {
  const found = [];
  for (const { file, text } of files) {
    String(text || "")
      .split(/\r?\n/)
      .forEach((line, index) => {
        if (WAY_BACK.test(line)) found.push({ file, line: index + 1, text: line.trim().slice(0, 220) });
      });
  }
  return found;
}

// --- Vorher und nachher ------------------------------------------------------

/** Ein Wert in einer Zeile, ohne Umbruch. */
const flat = (value) => (value === null || value === undefined || value === "" ? "-" : String(value));

const rowsOf = (answer) => (Array.isArray(answer?.data) ? answer.data : Array.isArray(answer) ? answer : []);

/**
 * Die Themen, die vor und nach dem Einspielen verglichen werden.
 *
 * Jedes Thema nennt den Weg, mit dem das Gerät es herausgibt, und eine Funktion, die
 * aus der Antwort Einträge `{ key, value }` macht. Ein Weg steht nur hier, wenn die
 * API-Referenz am Gerät ihn nennt: `routeListed` prüft das vor jedem Aufruf, und der
 * Selbsttest hält die Wege gegen das Wissen des Kits (`check-docs.mjs`).
 *
 * Was sich im Betrieb von selbst ändert (Zeitstempel, Restlaufzeit, die Belegung des
 * Firmenordners) bleibt aus dem Wert heraus oder wird als Hinweis geführt.
 */
export const TOPICS = Object.freeze([
  {
    key: "accounts",
    label: () => t("Accounts", "Konten"),
    verb: "GET",
    path: "/api/benutzer",
    entries: (a) =>
      rowsOf(a).map((u) => ({
        key: flat(u.username),
        value: `${flat(u.role)}, ${u.is_active === false ? t("blocked", "gesperrt") : t("active", "aktiv")}`,
      })),
  },
  {
    key: "licence",
    label: () => t("Licence", "Lizenz"),
    verb: "GET",
    path: "/api/license/info",
    entries: (a) => {
      if (!a || typeof a !== "object") return [];
      const use = a.nutzung || {};
      return [
        { key: "tier", value: flat(a.tier ?? use.stufe) },
        { key: "valid", value: flat(a.valid) },
        { key: "customer", value: flat(a.customer) },
        { key: "expiresAt", value: flat(a.expiresAt) },
        { key: "hardwareFingerprint", value: flat(a.hardwareFingerprint) },
        { key: "accounts", value: `${flat(use.konten?.belegt)} / ${flat(use.konten?.grenze)}` },
        { key: "apps", value: `${flat(use.apps?.belegt)} / ${flat(use.apps?.grenze)}` },
      ];
    },
  },
  {
    key: "apps",
    label: () => t("Apps", "Apps"),
    verb: "GET",
    path: "/api/apps",
    ids: (a) => rowsOf(a).map((app) => flat(app.id)).filter((id) => id !== "-"),
    entries: (a) =>
      rowsOf(a).flatMap((app) => {
        const stands = Object.entries(app.staende || {}).filter(([, s]) => s);
        if (!stands.length) return [{ key: flat(app.id), value: t("no stand", "kein Stand") }];
        return stands.map(([stand, s]) => ({
          key: `${flat(app.id)} ${stand}`,
          value: `${flat(s.version)}, ${s.lieferbar === false ? t("not deliverable", "nicht lieferbar") : t("deliverable", "lieferbar")}`,
        }));
      }),
  },
  {
    key: "appdata",
    label: () => t("Apps with data", "Apps mit Daten"),
    verb: "GET",
    path: "/api/backup/sicherungen",
    // Die Datenbanken der Apps, so wie die Sicherung sie führt. Wie viele Zeilen darin
    // stehen, sagt der Weg nicht, und das Kit liest die Datenbank nicht selbst.
    entries: (a) => {
      const names = new Set(
        rowsOf(a)
          .filter((row) => row.art === "app-datenbanken")
          .map((row) => row.datenbank || String(row.name || "").replace(/_\d{8}_\d{6}.*$/, ""))
      );
      return [...names].map((name) => ({ key: name, value: t("kept in the backup", "in der Sicherung geführt") }));
    },
  },
  {
    key: "flows",
    label: () => t("Platform flows", "Plattform-Flows"),
    verb: "GET",
    path: "/api/flows",
    entries: (a) => [
      ...rowsOf(a).map((flow) => ({ key: flat(flow.name ?? flow.id), value: flat(flow.version ?? "-") })),
      ...(Array.isArray(a?.fehlerhaft) && a.fehlerhaft.length
        ? [{ key: t("broken files", "fehlerhafte Dateien"), value: String(a.fehlerhaft.length) }]
        : []),
    ],
  },
  {
    // Die Flows der Apps stehen nicht in `/api/flows` (das sind die der Plattform), sondern je App
    // und Stand an `/api/apps/:id/flows`. Ein Update, das sie verliert, fiele sonst nicht auf.
    key: "app-flows",
    label: () => t("App flows", "App-Flows"),
    verb: "GET",
    path: "/api/apps/:id/flows",
    perApp: true,
    entries: (a, appId) =>
      ["test", "live"].flatMap((stand) =>
        (Array.isArray(a?.data?.[stand]) ? a.data[stand] : []).map((flow) => ({
          key: `${appId} ${stand} ${flat(flow.name)}`,
          value: flat(flow.version),
        }))
      ),
  },
  {
    key: "models",
    label: () => t("Models", "Modelle"),
    verb: "GET",
    path: "/api/models/installed",
    entries: (a) =>
      (Array.isArray(a?.models) ? a.models : rowsOf(a)).map((m) => ({
        key: flat(m.id ?? m.name),
        value: `${flat(m.status)}${m.is_default ? t(", default", ", Standard") : ""}`,
      })),
  },
  {
    key: "company-folder",
    label: () => t("Company folders", "Firmenordner"),
    verb: "GET",
    path: "/api/firmenordner/ordner",
    // Die Ordner, nicht ihr Inhalt: wie viel darin liegt, ändert sich mit jeder Datei,
    // die jemand ablegt, und wäre als Abweichung eine Falschmeldung.
    entries: (a) =>
      rowsOf(a).map((o) => ({
        key: flat(o.kennung ?? o.id),
        value: `${flat(o.art)}, ${t("rights", "Rechte")} ${flat(o.rechte_anzahl)}`,
      })),
  },
  {
    key: "company-folder-size",
    label: () => t("Company folder, occupied", "Firmenordner, belegt"),
    verb: "GET",
    path: "/api/firmenordner/platz",
    volatile: true,
    entries: (a) =>
      (Array.isArray(a?.data?.ordner) ? a.data.ordner : []).map((o) => ({
        key: flat(o.kennung ?? o.ordner_id),
        value: `${flat(o.belegt)} Byte`,
      })),
  },
]);

/**
 * Ein Thema lesen. `ask(verb, path)` gibt `{ ok, status, body }`; `read` hält die schon gelesenen
 * Themen. Ein Thema je App (`perApp`) fragt jede App, die `apps` nennt, und führt die Antworten
 * zusammen: gezählt wird, was das Gerät je App nennt, nicht was eine Sammelliste zufällig enthält.
 */
export async function readTopic(topic, ask, read = {}) {
  const failed = (answer, path) =>
    answer.status === 404 || answer.status === 405
      ? { state: "kein-endpunkt", entries: [], text: t("the device does not know the route", "das Gerät kennt den Weg nicht") }
      : { state: "fehler", entries: [], text: `${topic.verb} ${path}: ${reason(answer)}` };
  if (!topic.perApp) {
    const answer = await ask(topic.verb, topic.path);
    if (!answer.ok) return failed(answer, topic.path);
    return { state: "gelesen", entries: topic.entries(answer.body), path: topic.path, ...(topic.ids ? { ids: topic.ids(answer.body) } : {}) };
  }
  const apps = read.apps;
  if (!apps || apps.state !== "gelesen") {
    return { state: "fehler", entries: [], text: t("the apps could not be read, so their flows cannot be asked for", "die Apps ließen sich nicht lesen, also auch ihre Flows nicht") };
  }
  const entries = [];
  for (const appId of apps.ids) {
    const path = topic.path.replace(":id", encodeURIComponent(appId));
    const answer = await ask(topic.verb, path);
    if (!answer.ok) return failed(answer, path);
    entries.push(...topic.entries(answer.body, appId));
  }
  return { state: "gelesen", entries, path: topic.path };
}

/** Vergleich eines Themas: was fehlt nachher, was ist neu, was hat sich geändert. */
export function diffEntries(before, after) {
  const was = new Map((before || []).map((e) => [e.key, e.value]));
  const now = new Map((after || []).map((e) => [e.key, e.value]));
  return {
    missing: [...was.keys()].filter((k) => !now.has(k)).map((k) => ({ key: k, before: was.get(k) })),
    added: [...now.keys()].filter((k) => !was.has(k)).map((k) => ({ key: k, after: now.get(k) })),
    changed: [...was.keys()]
      .filter((k) => now.has(k) && now.get(k) !== was.get(k))
      .map((k) => ({ key: k, before: was.get(k), after: now.get(k) })),
  };
}

/**
 * Das Urteil über ein Thema.
 *
 * `same` heißt: nichts fehlt und nichts hat sich geändert. `lost` heißt: etwas, das
 * vorher da war, ist nachher nicht mehr da, und das ist die Abweichung, derentwegen
 * verglichen wird. `changed` und `added` sind Hinweise, bei einem flüchtigen Thema
 * (Belegung) bleibt die Änderung ein Hinweis auch dann, wenn etwas fehlt.
 */
export function topicVerdict(diff, { volatile = false } = {}) {
  if (diff.missing.length && !volatile) return "lost";
  if (diff.missing.length || diff.changed.length || diff.added.length) return "changed";
  return "same";
}

/** Die ganze Gegenüberstellung: je Thema vorher, nachher und Urteil. */
export function compareSnapshots(before, after) {
  return TOPICS.map((topic) => {
    const b = before?.[topic.key];
    const a = after?.[topic.key];
    if (!b || !a || b.state !== "gelesen" || a.state !== "gelesen") {
      return { key: topic.key, label: topic.label(), verdict: "unmeasured", before: b, after: a, diff: null };
    }
    const diff = diffEntries(b.entries, a.entries);
    return {
      key: topic.key,
      label: topic.label(),
      verdict: topicVerdict(diff, topic),
      before: b,
      after: a,
      diff,
    };
  });
}

/** Zusammengefasst: ist etwas verloren gegangen? */
export function lostAnything(comparison) {
  return comparison.some((row) => row.verdict === "lost");
}

/** Wie lange etwas gedauert hat, in Worten. */
export function minutes(ms) {
  const seconds = Math.round(ms / 1000);
  if (seconds < 90) return t(`${seconds} seconds`, `${seconds} Sekunden`);
  const m = Math.round((seconds / 60) * 10) / 10;
  return t(`${m} minutes`, `${m} Minuten`);
}

/** Die gemessenen Zahlen als Satz, mit Datum und Gerät. */
export function durationSentence(measured = MEASURED) {
  const total = measured.installMinutes + measured.restartMinutes;
  return t(
    `About ${total} minutes of work at the device, plus the backup: measured on ${measured.date} at a ${measured.device} ` +
      `going from ${measured.from} to ${measured.to}, ${measured.installMinutes} minutes to deploy and ${measured.restartMinutes} ` +
      "minutes after a restart until all containers are healthy. Another device or a bigger update can differ; " +
      "the platform is not reachable while it restarts.",
    `Rund ${String(total).replace(".", ",")} Minuten Arbeit am Gerät, dazu die Sicherung: gemessen am ${measured.date} an einem ${measured.device} ` +
      `von ${measured.from} auf ${measured.to}, ${String(measured.installMinutes).replace(".", ",")} Minuten Einspielen und ${measured.restartMinutes} ` +
      "Minuten nach einem Neustart, bis alle Container gesund sind. Ein anderes Gerät oder ein größeres Update kann abweichen; " +
      "solange die Plattform neu startet, ist sie nicht erreichbar."
  );
}
