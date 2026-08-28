/**
 * Selbstheilung: was das Kit an einem laufenden Gerät selbst wieder in Ordnung
 * bringt, und wie jeder dieser Handgriffe einzeln zurückgenommen wird.
 *
 * Drei Grenzen, und alle drei stehen hier im Code und nicht nur in einem Blatt:
 *
 * 1. **Nur im Verzeichnisbaum von Arasul.** Ein Container gehört dazu, wenn sein
 *    Compose-Projekt aus einem Arasul-Ordner kommt (`working_dir` im Baum) oder
 *    wenn er nach der Regel des Kits ein Container der Plattform ist, siehe
 *    `PLATFORM_CONTAINERS` in `lib/device.mjs`. Alles andere wird nicht angefasst,
 *    auch wenn es nicht läuft: es steht als „außerhalb, bleibt liegen" im Bericht.
 * 2. **Nie am Bootloader, nie am System.** Es gibt hier keinen Befehl, der etwas
 *    anderes tut als einen Container anhalten, starten oder ansehen. Was das
 *    Gerät bootet, was `systemd` führt und was in `/etc` steht, kennt dieses
 *    Modul nicht, und so bleibt es.
 * 3. **Nur, was sich zurücknehmen lässt.** Ein Eingriff, dessen Zustand davor
 *    sich nicht wiederherstellen lässt, ist kein Fall für die Selbstheilung,
 *    sondern eine Frage an den Menschen. Ein Neustart ist so ein Fall: nach
 *    `docker restart` gibt es den Zustand davor nicht mehr.
 *
 * Jeder Eingriff steht mit Zustand davor, Zustand danach und dem Weg zurück im
 * Protokoll der Geräteakte und in `interventions.json` neben ihr. Die Rücknahme
 * liest genau diesen Eintrag und stellt den Stand davor her, mit Nachweis.
 *
 * Reine Funktionen, ohne Netz und ohne Dateien: der Selbsttest führt sie mit
 * einer Attrappe von Docker und einem erfundenen Baum.
 */

import { PLATFORM_CONTAINERS } from "./device.mjs";
import { t } from "./i18n.mjs";

/**
 * Das Prüfskript. Läuft als POSIX-Shell am Gerät und liest nur: welche Ordner
 * wie Arasul aussehen, und je Container Name, Zustand, Status und die Herkunft
 * aus Compose. Eine Zeile je Befund, `@schlüssel=wert`.
 */
export const HEAL_PROBE = `
PATH="$PATH:/usr/local/bin:/opt/homebrew/bin:/usr/sbin:/sbin:/snap/bin:/usr/local/sbin"
p() { printf '@%s=%s\\n' "$1" "$2"; }
for d in /opt/arasul "$HOME/arasul" "$HOME"/arasul-*; do [ -d "$d" ] && p tree "$d"; done
if command -v docker >/dev/null 2>&1; then
  d=docker
  docker ps >/dev/null 2>&1 || { sudo -n true >/dev/null 2>&1 && d="sudo -n docker"; }
  p docker "$d"
  $d ps -a --format '{{.Names}}|{{.State}}|{{.Status}}|{{.Label "com.docker.compose.project"}}|{{.Label "com.docker.compose.service"}}|{{.Label "com.docker.compose.project.working_dir"}}' 2>/dev/null |
    while IFS= read -r zeile; do [ -n "$zeile" ] && printf '@container=%s\\n' "$zeile"; done
fi
p done ja
`;

/** Zerlegt die Ausgabe des Prüfskripts. `tree` und `container` kommen als Listen. */
export function parseHealProbe(output) {
  const facts = { tree: [], container: [] };
  for (const line of String(output || "").split(/\r?\n/)) {
    const m = line.match(/^@([a-z_]+)=(.*)$/);
    if (!m) continue;
    const [, key, raw] = m;
    const value = raw.trim();
    if (!value) continue;
    if (key === "tree" || key === "container") facts[key].push(value);
    else facts[key] = value;
  }
  return facts;
}

/** Liegt `path` im Baum, also in einem der Wurzelordner oder darunter? */
export function insideTree(path, roots) {
  const clean = String(path || "").replace(/\/+$/, "");
  if (!clean) return false;
  return (roots || []).some((root) => {
    const r = String(root || "").replace(/\/+$/, "");
    return r && (clean === r || clean.startsWith(`${r}/`));
  });
}

/**
 * Die Gesundheit aus dem Statustext von `docker ps`: dort steht sie in Klammern,
 * `(healthy)`, `(unhealthy)`, `(health: starting)`. Ohne Klammer gibt es keinen
 * Healthcheck, und dann zählt allein der Zustand.
 */
export function healthOf(status) {
  const m = String(status || "").match(/\((healthy|unhealthy|health: starting)\)/);
  if (!m) return "";
  return m[1] === "health: starting" ? "starting" : m[1];
}

/** Die Container aus den Befunden, jeder mit der Antwort, ob er zum Baum gehört. */
export function containersOf(facts) {
  return (facts.container || []).map((line) => {
    const [name = "", state = "", status = "", project = "", service = "", workingDir = ""] = String(line).split("|");
    const inTree = insideTree(workingDir, facts.tree) || PLATFORM_CONTAINERS.some((p) => p.test(name));
    return { name, state, status, health: healthOf(status), project, service, workingDir, inTree };
  });
}

/**
 * Was nicht in Ordnung ist. Ein Befund je Container, mit der Sorte, aus der
 * unten der Plan wird. Was außerhalb des Baums liegt, wird gemeldet und nicht
 * geplant: das ist die erste Grenze.
 */
export function findFaults(facts) {
  const faults = [];
  const outside = [];
  for (const c of containersOf(facts)) {
    let kind = null;
    if (c.state !== "running") kind = "container-stopped";
    else if (c.health === "unhealthy") kind = "container-unhealthy";
    if (!kind) continue;
    if (c.inTree) faults.push({ kind, ...c });
    else outside.push({ kind, ...c });
  }
  return { faults, outside };
}

/**
 * Der Plan zu einem Befund: der Handgriff, der Weg zurück und der Nachweis.
 *
 * Gibt es keinen Weg zurück, gibt es keinen Plan, und `reason` sagt, warum das
 * eine Frage an den Menschen ist. Das ist die dritte Grenze.
 */
export function planFor(fault, docker = "docker") {
  const q = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;
  const name = q(fault.name);
  if (fault.kind === "container-stopped") {
    return {
      ok: true,
      label: t(`start the container ${fault.name}`, `Container ${fault.name} starten`),
      fix: `${docker} start ${name}`,
      undo: `${docker} stop ${name}`,
      verify: `${docker} inspect --format '{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{end}}' ${name}`,
      logs: `${docker} logs --tail 20 ${name} 2>&1`,
      before: fault.state,
      wanted: "running",
    };
  }
  if (fault.kind === "container-unhealthy") {
    return {
      ok: false,
      reason: t(
        `${fault.name} runs but reports unhealthy. The fix would be a restart, and a restart has no way back: ` +
          "the state before it does not exist afterwards. That is a question, not a self-healing step.",
        `${fault.name} läuft, meldet aber unhealthy. Die Abhilfe wäre ein Neustart, und der hat keinen Weg zurück: ` +
          "den Zustand davor gibt es danach nicht mehr. Das ist eine Frage, kein Schritt der Selbstheilung."
      ),
      logs: `${docker} logs --tail 20 ${name} 2>&1`,
    };
  }
  return { ok: false, reason: t(`unknown fault ${fault.kind}`, `unbekannter Befund ${fault.kind}`) };
}

/**
 * Liest die Antwort des Nachweises: `running|healthy`, `exited|`, `running|starting`.
 * `settled` heißt: der Healthcheck ist noch nicht fertig, es lohnt sich zu warten.
 */
export function readVerify(output) {
  const [status = "", health = ""] = String(output || "").trim().split("\n").pop().split("|");
  return { status: status.trim(), health: health.trim(), settled: health.trim() !== "starting" };
}

/** Ist der gewollte Zustand erreicht? Ohne Healthcheck reicht `running`. */
export function reached(check, wanted) {
  if (check.status !== wanted) return false;
  return check.health === "" || check.health === "healthy";
}

// --- Das Protokoll -----------------------------------------------------------

/** Die nächste Nummer im Protokoll: H-0001, H-0002, ... fortlaufend, nie doppelt. */
export function nextId(ledger) {
  const max = (ledger || []).reduce((m, e) => {
    const n = Number(String(e.id || "").replace(/^H-/, ""));
    return Number.isInteger(n) && n > m ? n : m;
  }, 0);
  return `H-${String(max + 1).padStart(4, "0")}`;
}

/** Der Eintrag im Protokoll, wie er nach `interventions.json` geht. */
export function ledgerEntry({ id, time, fault, plan, result, after }) {
  return {
    id,
    time,
    kind: fault.kind,
    target: fault.name,
    label: plan.label,
    fix: plan.fix,
    undo: plan.undo,
    verify: plan.verify,
    before: { status: plan.before, health: fault.health || "" },
    after: after || null,
    result,
    undone: null,
  };
}

/**
 * Der Text für die Geräteakte, unter Prüfungen. Er nennt alles, was man in
 * einem halben Jahr wissen will: was, woran, Zustand davor, Zustand danach, der
 * Weg zurück als Befehl.
 */
export function recordLines(entry, place) {
  const where = place ? ` --device ${place.device}${place.customer ? ` --customer ${place.customer}` : ""}` : "";
  const after = entry.after ? `${entry.after.status}${entry.after.health ? ` (${entry.after.health})` : ""}` : "";
  const before = `${entry.before.status}${entry.before.health ? ` (${entry.before.health})` : ""}`;
  return t(
    [
      `Intervention ${entry.id}: ${entry.label}. Result: ${entry.result}.`,
      `Target: ${entry.target}. Before: ${before}. After: ${after || "not reached"}.`,
      `Command on the device: ${entry.fix}`,
      `Way back: node .ara/tools/heal.mjs${where} --undo ${entry.id} (runs: ${entry.undo})`,
    ],
    [
      `Eingriff ${entry.id}: ${entry.label}. Ergebnis: ${entry.result}.`,
      `Ziel: ${entry.target}. Vorher: ${before}. Nachher: ${after || "nicht erreicht"}.`,
      `Befehl am Gerät: ${entry.fix}`,
      `Weg zurück: node .ara/tools/heal.mjs${where} --undo ${entry.id} (führt aus: ${entry.undo})`,
    ]
  );
}
