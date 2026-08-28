/**
 * Wartung: den Zustand eines Geräts lesen und beurteilen.
 *
 * Die Zustandswerte ("ungemessen", "gelesen") sind Kennungen im Code und keine
 * Ausgabe. Uebersetzt wird der Text daneben.
 *
 * Reine Funktionen, ohne Netz und ohne Dateien, damit der Selbsttest sie mit
 * erfundenen Befunden prüfen kann. Was hier steht, sind die Schwellen des Kits
 * und keine Produktwerte: „ab 85 Prozent voll wird die Platte genannt" ist eine
 * Regel des Kits über sich selbst. Was auf dem Gerät läuft, welche Version es
 * trägt und welche Wege es kennt, sagt das Gerät.
 */

/**
 * Das Prüfskript für den Zustand. Läuft als POSIX-Shell auf dem Gerät und liest
 * nur: kein Neustart, kein Aufräumen, keine Datei angefasst. Je Befund eine
 * Zeile `@schlüssel=wert`, mehrfach für Listen. Was ein Gerät nicht hat, fehlt
 * einfach.
 */
import { t } from "./i18n.mjs";

export const HEALTH_PROBE = `
PATH="$PATH:/usr/local/bin:/opt/homebrew/bin:/usr/sbin:/sbin:/snap/bin:/usr/local/sbin"
p() { printf '@%s=%s\\n' "$1" "$2"; }
p uptime "$(uptime 2>/dev/null | sed 's/^ *//')"
p hostname "$(hostname 2>/dev/null)"
df -Pk / 2>/dev/null | tail -1 | awk '{printf "@disk_total_kb=%s\\n@disk_free_kb=%s\\n@disk_used_pct=%s\\n", $2, $4, $5}'
[ -r /proc/meminfo ] && awk '/MemTotal/ {t=$2} /MemAvailable/ {a=$2} END {if (t) printf "@mem_total_kb=%s\\n@mem_available_kb=%s\\n", t, a}' /proc/meminfo
if command -v docker >/dev/null 2>&1; then
  p docker_server "$(docker version --format '{{.Server.Version}}' 2>/dev/null)"
  # Ohne Rechte auf den Docker-Socket sagt docker ps nichts. Einmal mit sudo,
  # aber nur ohne Passwort: eine Passwortabfrage mitten in einer Pruefung, die
  # nur liest, waere eine Falle.
  d=docker
  docker ps >/dev/null 2>&1 || { sudo -n true >/dev/null 2>&1 && d="sudo -n docker"; }
  $d ps -a --format '{{.Names}}|{{.State}}|{{.Status}}' 2>/dev/null |
    while IFS= read -r zeile; do [ -n "$zeile" ] && printf '@container=%s\\n' "$zeile"; done
fi
if command -v systemctl >/dev/null 2>&1; then
  p unit_source systemd
  systemctl list-units --type=service --state=failed --no-pager --plain --no-legend 2>/dev/null |
    awk '{print $1}' | while IFS= read -r u; do [ -n "$u" ] && printf '@failed_unit=%s\\n' "$u"; done
fi
if command -v journalctl >/dev/null 2>&1; then
  p log_source journalctl
  zeilen="$(journalctl --since '-24 hours' -p err --no-pager -q 2>/dev/null)"
  if [ $? -eq 0 ]; then
    p log_read ja
    printf '%s\\n' "$zeilen" | tail -20 |
      while IFS= read -r l; do [ -n "$l" ] && printf '@log=%s\\n' "$l"; done
  else
    p log_read nein
  fi
fi
p done ja
`;

/** Schlüssel, die mehrfach vorkommen dürfen und darum als Liste ankommen. */
const LIST_KEYS = new Set(["container", "failed_unit", "log"]);

/** Zerlegt die Ausgabe des Prüfskripts. Mehrfache Schlüssel werden Listen. */
export function parseHealth(output) {
  const facts = {};
  for (const line of String(output || "").split(/\r?\n/)) {
    const m = line.match(/^@([a-z_]+)=(.*)$/);
    if (!m) continue;
    const [, key, raw] = m;
    const value = raw.trim();
    if (LIST_KEYS.has(key)) {
      if (value) facts[key] = [...(facts[key] || []), value];
    } else if (value) {
      facts[key] = value;
    }
  }
  return facts;
}

/** Ab hier wird die Platte genannt. Sie ist der Wert, der still wächst. */
const DISK_WARN_PCT = 85;
const DISK_ALARM_PCT = 95;

/** Ein Container gilt als in Ordnung, wenn Docker ihn als laufend führt. */
const CONTAINER_OK = new Set(["running"]);

const gb = (kb) => (kb ? Math.round((Number(kb) / 1024 / 1024) * 10) / 10 : null);

/**
 * Aus den Befunden wird ein Zustand, dazu die Sätze, die auffallen sollen.
 *
 * `findings` sind Beobachtungen mit einer Stufe, keine Diagnosen: „vier
 * Container laufen nicht" ist ein Befund, „das Gerät ist kaputt" wäre eine
 * Deutung. Die Diagnose steht in `.ara/knowledge/diagnostics.md` und macht ein
 * Mensch mit Ara zusammen.
 */
export function readHealth(facts) {
  const containers = (facts.container || []).map((line) => {
    const [name, state, status] = String(line).split("|");
    return { name: name || "", state: state || "", status: status || "" };
  });
  const stopped = containers.filter((c) => !CONTAINER_OK.has(c.state));
  const failedUnits = facts.failed_unit || [];
  const logs = facts.log || [];

  const usedPct = facts.disk_used_pct ? Number(String(facts.disk_used_pct).replace("%", "")) : null;
  const disk = {
    usedPct: Number.isFinite(usedPct) ? usedPct : null,
    freeGb: gb(facts.disk_free_kb),
    totalGb: gb(facts.disk_total_kb),
  };
  const memory = {
    totalGb: gb(facts.mem_total_kb),
    availableGb: gb(facts.mem_available_kb),
  };

  const findings = [];
  if (disk.usedPct !== null && disk.usedPct >= DISK_ALARM_PCT) {
    findings.push({
      level: "achtung",
      text: t(
        `The disk is ${disk.usedPct} percent full, ${disk.freeGb ?? "?"} GB free. From here on services fail.`,
        `Die Platte ist zu ${disk.usedPct} Prozent voll, ${disk.freeGb ?? "?"} GB frei. Ab hier fallen Dienste aus.`
      ),
    });
  } else if (disk.usedPct !== null && disk.usedPct >= DISK_WARN_PCT) {
    findings.push({
      level: "hinweis",
      text: t(
        `The disk is ${disk.usedPct} percent full, ${disk.freeGb ?? "?"} GB free.`,
        `Die Platte ist zu ${disk.usedPct} Prozent voll, ${disk.freeGb ?? "?"} GB frei.`
      ),
    });
  }
  if (stopped.length) {
    findings.push({
      level: "achtung",
      text:
        t(
          `${stopped.length} of ${containers.length} containers ${stopped.length === 1 ? "is" : "are"} not running: `,
          `${stopped.length} von ${containers.length} Containern ${stopped.length === 1 ? "läuft" : "laufen"} nicht: `
        ) + stopped.map((c) => `${c.name} (${c.state || t("without a state", "ohne Zustand")})`).join(", "),
    });
  }
  if (failedUnits.length) {
    findings.push({
      level: "achtung",
      text: t(`Failed services: ${failedUnits.join(", ")}`, `Fehlgeschlagene Dienste: ${failedUnits.join(", ")}`),
    });
  }
  if (logs.length) {
    findings.push({
      level: "hinweis",
      text: t(
        `${logs.length} error line${logs.length === 1 ? "" : "s"} in the logs of the last 24 hours.`,
        `${logs.length} Fehlerzeile${logs.length === 1 ? "" : "n"} in den Protokollen der letzten 24 Stunden.`
      ),
    });
  }
  if (facts.log_read === "nein") {
    findings.push({
      level: "hinweis",
      text: t(
        "The logs were not readable, the login name lacks the rights for it.",
        "Die Protokolle waren nicht lesbar, dem Anmeldenamen fehlen dafür die Rechte."
      ),
    });
  }

  return {
    uptime: facts.uptime || "",
    hostname: facts.hostname || "",
    dockerServer: facts.docker_server || "",
    disk,
    memory,
    containers,
    stopped,
    failedUnits,
    logs,
    logSource: facts.log_source || "",
    logRead: facts.log_read || "",
    // Ohne diese Zeile ist das Skript nicht durchgelaufen, und dann ist alles
    // darueber ein Ausschnitt und kein Befund.
    complete: facts.done === "ja",
    findings,
  };
}

/**
 * Endpunkte des Geräts zu einem Thema, gefunden in seiner eigenen Liste.
 *
 * Für die Sicherung kennt das Kit keinen Pfad, und es soll auch keinen erfinden:
 * Wenn das Gerät einen Weg dafür hat, steht er mit Verb, Pfad und einem Satz in
 * seinem Kontrakt, und dort wird nachgesehen. Findet sich keiner, ist die Antwort
 * „dieses Gerät bietet das nicht an" und nicht eine geratene Adresse.
 *
 * Gesucht wird nach Wortstämmen in Pfad und Beschreibung, beides in der Sprache,
 * in der das Gerät seinen Kontrakt schreibt.
 */
export function topicEndpoints(contract, stems, verb = "GET") {
  const words = stems.map((s) => String(s).toLowerCase());
  return (contract?.endpunkte || []).filter((entry) => {
    if (verb && String(entry.verb).toUpperCase() !== verb.toUpperCase()) return false;
    const haystack = `${entry.pfad || ""} ${entry.was || ""}`.toLowerCase();
    return words.some((word) => haystack.includes(word));
  });
}

/**
 * Die Kennungen aus der Antwort auf die Modellfrage.
 *
 * Wie ein Gerät seine Modelle nennt, weiß das Kit nicht: eine Liste von Namen,
 * eine Liste von Objekten, ein Umschlag mit einem Feld darin. Gelesen wird
 * darum, was aussieht wie eine Kennung, und umbenannt wird nichts. Findet sich
 * nichts, bleibt die Liste leer, und die Zeile daneben sagt, was ankam: eine
 * geratene Kennung in einer Leistungsbeschreibung wäre eine Zusage, die niemand
 * geprüft hat.
 */
export function modelNames(data) {
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.models)
      ? data.models
      : Array.isArray(data?.modelle)
        ? data.modelle
        : [];
  return list
    .map((entry) =>
      typeof entry === "string" ? entry : entry?.name || entry?.id || entry?.model || entry?.modell || ""
    )
    .map((name) => String(name).trim())
    .filter(Boolean);
}

/** Ein Pfad ohne seine Parameter ist nicht aufrufbar. `:id` heißt: da fehlt etwas. */
export function needsParameter(path) {
  return /(^|\/):[A-Za-z]/.test(String(path || "")) || /<[^>]+>/.test(String(path || ""));
}

/**
 * Die Statuszeile: das Erste, was ein Mensch bei `/maintain` sieht.
 *
 * Vier Angaben, in dieser Reihenfolge, weil sie in dieser Reihenfolge
 * entscheiden, ob überhaupt etwas zu tun ist: Version, Apps mit Stand, letzte
 * Sicherung, Auffälliges. Was nicht gemessen werden konnte, steht als
 * „ungemessen" darin und wird nicht weggelassen: eine Zeile ohne Sicherung
 * liest sich sonst wie eine Zeile mit einer heilen Sicherung.
 */
export function statusLine({ place, platform, apps, backup, health, unmeasured = [] }) {
  const parts = [];
  const unmessbar = t("unmeasured", "ungemessen");

  parts.push(platform?.text || t("platform unmeasured", "Plattform ungemessen"));

  if (!apps || apps.state === "ungemessen") parts.push(t("apps unmeasured", "Apps ungemessen"));
  else if (!apps.found?.length) parts.push(t("no app found", "keine App gefunden"));
  else {
    parts.push(
      `Apps: ${apps.found
        .map(
          (a) =>
            `${a.id} ${
              [a.live && `live ${a.live}`, a.test && t(`test ${a.test}`, `Test ${a.test}`)]
                .filter(Boolean)
                .join(", ") || t("without a version", "ohne Stand")
            }`
        )
        .join("; ")}`
    );
  }

  parts.push(t(`Backup: ${backup?.text || unmessbar}`, `Sicherung: ${backup?.text || unmessbar}`));

  if (!health) parts.push(t("state unmeasured", "Zustand ungemessen"));
  else {
    const achtung = health.findings.filter((f) => f.level === "achtung").length;
    const hinweise = health.findings.filter((f) => f.level === "hinweis").length;
    parts.push(
      achtung
        ? t(
            `${achtung} times attention, ${hinweise} note${hinweise === 1 ? "" : "s"}`,
            `${achtung} mal Achtung, ${hinweise} Hinweis${hinweise === 1 ? "" : "e"}`
          )
        : hinweise
          ? t(
              `nothing urgent, ${hinweise} note${hinweise === 1 ? "" : "s"}`,
              `nichts Dringendes, ${hinweise} Hinweis${hinweise === 1 ? "" : "e"}`
            )
          : t("nothing conspicuous", "nichts auffällig")
    );
  }

  const line = `${place}: ${parts.join(" · ")}`;
  return unmeasured.length ? `${line} · ${unmessbar}: ${unmeasured.join(", ")}` : line;
}
