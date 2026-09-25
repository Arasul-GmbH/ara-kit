#!/usr/bin/env node
/**
 * Mirror: fetches the installation artifact and keeps it as a local version.
 *
 * The kit deliberately ships no product values (see .ara/knowledge/live-knowledge.md).
 * Instead, what the portal delivered lies here: the installer with which /device sets
 * up a device, and the version from which device profiles and procedures get read.
 * Normally this is called by device.mjs, at --install arasul.
 *
 *   node .ara/tools/mirror.mjs             fetch it if it is missing or too old
 *   node .ara/tools/mirror.mjs --show      only look, fetch nothing
 *   node .ara/tools/mirror.mjs --docs      which manuals lie in the artifact
 *   node .ara/tools/mirror.mjs --docs --device orin                  the manuals on the device
 *   node .ara/tools/mirror.mjs --docs --device orin --read api/API_REFERENCE.md
 *   node .ara/tools/mirror.mjs --refresh   fetch again in any case
 *
 * `--docs` is the way to everything the kit does not know itself: admin handbook,
 * API reference, delivery. The kit copies nothing out of them, it says where they
 * stand. With `--device` it reads them where Arasul runs, over SSH, from the folder
 * the running platform was started from: that works without a token and without a
 * mirror, also on a device somebody else installed, and it is the version that runs.
 *
 * The token comes from the chosen secret store and is never printed or passed as an
 * argument to another process.
 *
 * === deutsch ===
 *
 * Spiegel: holt das Installationsartefakt und hält es als lokalen Stand.
 *
 * Das Kit liefert bewusst keine Produktwerte mit (siehe .ara/knowledge/live-knowledge.md).
 * Stattdessen liegt hier, was das Portal ausgeliefert hat: der Installer, mit dem
 * /device ein Gerät aufsetzt, und der Stand, aus dem Geräteprofile und Abläufe gelesen
 * werden. Gerufen wird das im Regelfall von device.mjs, beim --install arasul.
 *
 *   node .ara/tools/mirror.mjs             holen, wenn er fehlt oder zu alt ist
 *   node .ara/tools/mirror.mjs --show      nur nachsehen, nichts holen
 *   node .ara/tools/mirror.mjs --docs      welche Anleitungen liegen im Artefakt
 *   node .ara/tools/mirror.mjs --docs --device orin                  die Anleitungen am Gerät
 *   node .ara/tools/mirror.mjs --docs --device orin --read api/API_REFERENCE.md
 *   node .ara/tools/mirror.mjs --refresh   in jedem Fall neu holen
 *
 * `--docs` ist der Weg zu allem, was das Kit selbst nicht weiß: Admin-Handbuch,
 * API-Referenz, Auslieferung. Das Kit schreibt daraus nichts ab, es sagt, wo es
 * steht. Mit `--device` liest es sie dort, wo Arasul läuft, über SSH, aus dem
 * Ordner, aus dem die laufende Plattform gestartet wurde: das geht ohne Token und
 * ohne Spiegel, auch an einem Gerät, das jemand anders installiert hat, und es ist
 * die Fassung, die dort läuft.
 *
 * Das Token kommt aus der gewählten Geheimnis-Ablage und wird niemals ausgegeben
 * oder als Argument an einen anderen Prozess übergeben.
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { Readable } from "node:stream";
import { t } from "./lib/i18n.mjs";
import { ROOT, fail, helpOnly, parseArgs, readDevice, sshArgs } from "./lib/kit.mjs";
import { APPLEDOUBLE, packEnv, releaseVersion } from "./lib/install.mjs";
import { getSecret } from "./lib/secrets.mjs";
import { STORE_CALL, buyLines, portalBase } from "./lib/licence.mjs";

// ARA_MIRROR weicht vom Standardort ab. Wird vom Selbsttest genutzt, damit er
// einen echten Spiegel nicht überschreibt.
const MIRROR = process.env.ARA_MIRROR || join(ROOT, ".ara", "mirror");
const STATE_FILE = join(MIRROR, "STATE.json");
const MAX_AGE_HOURS = 24;

function readState() {
  if (!existsSync(STATE_FILE)) return null;
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return null;
  }
}

function ageHours(state) {
  if (!state?.fetched) return Infinity;
  return (Date.now() - new Date(state.fetched).getTime()) / 3_600_000;
}

async function fetchMirror(base, token) {
  const url = new URL("/api/download", base);
  url.searchParams.set("token", token);

  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    // Das Portal begründet Ablehnungen im Klartext, etwa ein beendetes
    // Wartungs-Abo. Diese Begründung ist wertvoller als eine Statusnummer.
    let reason = "";
    try {
      reason = (await response.text()).trim();
    } catch {
      /* ohne Text bleibt die Statusnummer */
    }
    if (reason) throw new Error(reason);
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        t(
          "The portal refused the token. Under devices at https://www.arasul.de/kaufen stands which tokens hold.",
          "Das Portal hat den Token abgelehnt. Unter Geräte auf https://www.arasul.de/kaufen steht, welche Token gelten."
        )
      );
    }
    throw new Error(
      t(`The portal answers with status ${response.status}.`, `Das Portal antwortet mit Status ${response.status}.`)
    );
  }
  if (!response.body) throw new Error(t("The portal's answer was empty.", "Die Antwort des Portals war leer."));

  // Frisch auspacken, damit gelöschte Dateien nicht als Leichen zurückbleiben.
  rmSync(MIRROR, { recursive: true, force: true });
  mkdirSync(MIRROR, { recursive: true });

  await new Promise((done, failed) => {
    // --exclude hält die ._-Beiwerkdateien von macOS aus dem Spiegel heraus.
    // Was hier nicht ankommt, kann später auch nicht an ein Gerät weitergehen,
    // und genau das ist am 28.08.2026 passiert: 1124 solcher Dateien gingen mit
    // dem Artefakt an den Orin, und Traefik stieg an einer davon aus.
    const tar = spawn("tar", ["-xzf", "-", "--exclude", APPLEDOUBLE, "-C", MIRROR, "--strip-components=1"], {
      stdio: ["pipe", "ignore", "pipe"],
      env: packEnv(),
    });
    let message = "";
    tar.stderr.on("data", (chunk) => (message += chunk.toString()));
    tar.on("error", failed);
    tar.on("close", (code) =>
      code === 0
        ? done()
        : failed(
            new Error(
              t(
                `Unpacking failed: ${message.trim() || `code ${code}`}`,
                `Das Auspacken ist fehlgeschlagen: ${message.trim() || `Code ${code}`}`
              )
            )
          )
    );
    Readable.fromWeb(response.body).pipe(tar.stdin);
  });

  // .gitkeep hält den Ordner im Repository. Das Auspacken räumt ihn mit weg, und
  // danach meldet `git status` im Klon eine gelöschte Datei, die niemand
  // angefasst hat: am 28.08.2026 war der Klon nach der ersten Installation
  // schmutzig. Er wird darum wieder gelegt.
  writeFileSync(join(MIRROR, ".gitkeep"), "");

  // Die Fassung sagt das Artefakt selbst. Eine Datei VERSION bringt es nicht
  // mit, seine Angabe steht in arasul-release.json, und ohne diesen zweiten Weg
  // stand überall „unbekannt": im Spiegel, in der Geräteakte und im Ordnernamen
  // am Gerät.
  let version = null;
  const versionFile = join(MIRROR, "VERSION");
  if (existsSync(versionFile)) version = readFileSync(versionFile, "utf8").trim();
  if (!version) version = releaseVersion(MIRROR);

  const state = { fetched: new Date().toISOString(), source: String(base), version };
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + "\n");
  return state;
}

helpOnly(import.meta.url);
const arg = parseArgs();
const token = getSecret("ARASUL_TOKEN");
const base = portalBase();
const state = readState();

/**
 * Die Fassung des Spiegels, und woher sie kommt.
 *
 * Ein Spiegel, der vor dieser Fassung des Kits geholt wurde, trägt in seinem
 * STATE.json keine Zahl. Sie steht deshalb nicht weniger im Artefakt: das Kit
 * liest sie dann direkt aus `arasul-release.json`, statt „unbekannt" zu sagen,
 * obwohl die Datei danebenliegt.
 */
function versionOf(entry) {
  if (entry?.version) return { version: entry.version, source: "STATE.json" };
  const named = releaseVersion(MIRROR);
  return named ? { version: named, source: "arasul-release.json" } : { version: null, source: null };
}

if (arg.show) {
  const lines = [t("# Mirror", "# Spiegel")];
  if (!state) {
    lines.push(t("- Version: not present", "- Stand: nicht vorhanden"));
  } else {
    const age = ageHours(state);
    const fassung = versionOf(state);
    lines.push(
      t(
        `- Fetched: ${state.fetched} (${age < 1 ? "less than an hour ago" : `${Math.round(age)} hours ago`})`,
        `- Geholt: ${state.fetched} (vor ${age < 1 ? "weniger als einer Stunde" : `${Math.round(age)} Stunden`})`
      ),
      t(
        `- Product version: ${fassung.version ?? "unknown"}${fassung.source ? `, according to ${fassung.source}` : ""}`,
        `- Produktversion: ${fassung.version ?? "unbekannt"}${fassung.source ? `, laut ${fassung.source}` : ""}`
      ),
      t(
        `- Fresh enough: ${age <= MAX_AGE_HOURS ? "yes" : "no, fetch again"}`,
        `- Frisch genug: ${age <= MAX_AGE_HOURS ? "ja" : "nein, neu holen"}`
      )
    );
  }
  lines.push(
    t(`- Download token stored: ${token ? "yes" : "no"}`, `- Download-Token hinterlegt: ${token ? "ja" : "nein"}`)
  );
  if (state) {
    lines.push(
      "",
      t(
        "Which manuals came along: node .ara/tools/mirror.mjs --docs",
        "Welche Anleitungen mitkamen: node .ara/tools/mirror.mjs --docs"
      )
    );
  }
  console.log(lines.join("\n"));
  process.exit(0);
}

/**
 * Die Anleitungen im Artefakt.
 *
 * Das Kit kennt weder ihre Namen noch ihren Inhalt, und es soll sie auch nicht
 * kennen: was in ihnen steht, ändert sich mit dem Produkt. Es sagt nur, welche
 * es gibt und wo sie liegen. Alles, wofür das Kit keinen Weg hat (den ersten
 * Mitarbeiter anlegen, eine App freigeben), steht dort und nicht hier.
 */
function docs(dir, depth = 0) {
  if (depth > 4 || !existsSync(dir)) return [];
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...docs(path, depth + 1));
    else if (/\.(md|pdf|html?|txt|adoc|rst)$/i.test(entry.name)) found.push(path);
  }
  return found;
}

/**
 * Die Anleitungen am Gerät, gelesen über SSH.
 *
 * Gesucht wird der Ordner, aus dem die laufende Plattform gestartet wurde: die
 * Container eines Compose-Projekts tragen ihn als Etikett, und der Ordner, den
 * die meisten laufenden Container nennen und der `docs/` trägt, ist er. Liegt
 * kein laufender Container vor, der höchste Fassungsordner unter den Orten, an
 * denen das Kit auch sonst sucht. Am 25.09.2026 lagen am Orin 0.3.0, 0.4.0 und
 * 0.8.0 nebeneinander, und nur einer davon lief.
 *
 * Ein Fremdtest am 25.09.2026 kam ohne Token an ein Gerät, das jemand anders
 * installiert hatte, und `--docs` sagte „Es gibt keinen Spiegel". Die Doku lag
 * die ganze Zeit am Gerät; er fand sie auf eigene Faust.
 */
const FIND_DOCS =
  `best=$(docker ps --format '{{.Label "com.docker.compose.project.working_dir"}}' 2>/dev/null | ` +
  `grep -v '^$' | sort | uniq -c | sort -rn | while read n d; do [ -d "$d/docs" ] && echo "$d" && break; done); ` +
  `if [ -z "$best" ]; then for d in "$HOME/arasul" "$HOME"/arasul-* /opt/arasul /arasul; do ` +
  `[ -d "$d/docs" ] && best="$d"; done; fi; echo "@dir=$best"`;

function deviceDocs() {
  let device;
  try {
    device = readDevice(typeof arg.customer === "string" ? arg.customer : null, arg.device);
  } catch (error) {
    fail(error.message);
  }
  // Ist das Gerät dieser Rechner selbst, geht es ohne SSH, wie bei device.mjs.
  const local = ["localhost", "127.0.0.1", "::1"].includes(String(device.fields.address || device.fields.hostname || ""));
  let ssh = [];
  if (!local) {
    try {
      ssh = sshArgs(device.fields, { batch: true }).args;
    } catch (error) {
      fail(error.message);
    }
  }
  const remote = (command, options = {}) =>
    local
      ? spawnSync("sh", ["-c", command], { encoding: "utf8", ...options })
      : spawnSync("ssh", [...ssh, command], { encoding: "utf8", ...options });
  const place = device.customer ? `${device.customer}/${device.device}` : device.device;
  const found = remote(FIND_DOCS);
  const dir = ((found.stdout || "").match(/^@dir=(.*)$/m) || [])[1]?.trim();
  if (found.status !== 0 && !dir) {
    fail(
      t(
        `No connection to ${place}: ${(found.stderr || "").trim().split("\n")[0]}\nnode .ara/tools/remote.mjs --device ${device.device} --check says more.`,
        `Keine Verbindung zu ${place}: ${(found.stderr || "").trim().split("\n")[0]}\nnode .ara/tools/remote.mjs --device ${device.device} --check sagt mehr.`
      )
    );
  }
  if (!dir) {
    fail(
      t(
        `On ${place} there is no folder of Arasul with manuals: neither a running platform names one, nor does one lie ` +
          "where the kit looks. Either no Arasul runs there, or it was installed from somewhere else.",
        `Auf ${place} gibt es keinen Ordner von Arasul mit Anleitungen: weder nennt eine laufende Plattform einen, noch liegt ` +
          "einer dort, wo das Kit sucht. Entweder läuft dort kein Arasul, oder es wurde von anderswo installiert."
      )
    );
  }
  const call = `node .ara/tools/mirror.mjs --docs${device.customer ? ` --customer ${device.customer}` : ""} --device ${device.device}`;

  if (typeof arg.read === "string") {
    const rel = arg.read.replace(/^\/+/, "");
    if (!rel || rel.split("/").some((part) => part === ".." || part === "") || /['"\\$`]/.test(rel)) {
      fail(t(`${arg.read} is not a path below docs/.`, `${arg.read} ist kein Pfad unter docs/.`));
    }
    const read = remote(`cat '${dir}/docs/${rel}'`, { maxBuffer: 32 * 1024 * 1024 });
    if (read.status !== 0) {
      fail(
        t(
          `${rel} does not lie under ${dir}/docs on ${place}. Which ones do: ${call}`,
          `${rel} liegt auf ${place} nicht unter ${dir}/docs. Welche dort liegen: ${call}`
        )
      );
    }
    // Erst beenden, wenn alles draußen ist: in eine Pipe schreibt Node
    // asynchron, und ein `exit` gleich danach schnitt die API-Referenz am Orin
    // nach 64 KB ab.
    process.stdout.write(read.stdout, () => process.exit(0));
    return;
  }

  const list = remote(
    `cd '${dir}/docs' && find . -maxdepth 4 -type f \\( -name '*.md' -o -name '*.pdf' -o -name '*.txt' -o -name '*.html' \\) | sed 's|^\\./||' | sort`
  );
  const files = (list.stdout || "").split("\n").filter(Boolean);
  console.log(
    [
      t(`# Manuals on ${place}, from ${dir}/docs`, `# Anleitungen auf ${place}, aus ${dir}/docs`),
      "",
      t(
        "This is the version that runs there: the folder the running platform was started from.",
        "Das ist die Fassung, die dort läuft: der Ordner, aus dem die laufende Plattform gestartet wurde."
      ),
      "",
      ...(files.length ? files.map((file) => `- ${file}`) : [t("None found.", "Keine gefunden.")]),
      "",
      t("Read one:", "Eine lesen:"),
      `  ${call} --read <${t("path", "pfad")}>`,
      "",
      t(
        "The kit copies nothing out of them. What stands there holds for this device and this version.",
        "Das Kit schreibt daraus nichts ab. Was dort steht, gilt für dieses Gerät und diese Fassung."
      ),
    ].join("\n")
  );
  process.exit(0);
}

if (arg.docs && typeof arg.device === "string") {
  deviceDocs();
  // Beim Lesen endet der Prozess, sobald die Ausgabe draußen ist.
  await new Promise(() => {});
}

if (arg.docs) {
  if (!state) {
    console.log(
      t(
        "There is no mirror here. The manuals lie on every device with Arasul as well, in the version that runs\n" +
          "there, and the kit reads them over SSH, without a token:\n" +
          "  node .ara/tools/mirror.mjs --docs --device <device>\n" +
          "The mirror itself comes into being at the installation (device.mjs --install arasul) or with a token:\n" +
          "  node .ara/tools/mirror.mjs --refresh",
        "Hier gibt es keinen Spiegel. Die Anleitungen liegen auch an jedem Gerät mit Arasul, in der Fassung, die\n" +
          "dort läuft, und das Kit liest sie über SSH, ohne Token:\n" +
          "  node .ara/tools/mirror.mjs --docs --device <gerät>\n" +
          "Der Spiegel selbst entsteht bei der Installation (device.mjs --install arasul) oder mit einem Token:\n" +
          "  node .ara/tools/mirror.mjs --refresh"
      )
    );
    process.exit(1);
  }
  const found = docs(MIRROR).sort();
  console.log(
    [
      t(
        `# Manuals in the artifact (version ${versionOf(state).version ?? "unknown"}, fetched ${state.fetched})`,
        `# Anleitungen im Artefakt (Fassung ${versionOf(state).version ?? "unbekannt"}, geholt ${state.fetched})`
      ),
      "",
      ...(found.length
        ? found.map((path) => `- ${join(relative(ROOT, MIRROR), relative(MIRROR, path))}`)
        : [
            t(
              "None found. The artifact brings no manual along in this version.",
              "Keine gefunden. Das Artefakt bringt auf diesem Stand keine Anleitung mit."
            ),
          ]),
      "",
      t(
        "The kit copies nothing out of them. What a partner looks up there holds for this version.",
        "Das Kit schreibt daraus nichts ab. Was ein Partner dort nachschlägt, gilt für diese Fassung."
      ),
    ].join("\n")
  );
  process.exit(0);
}

if (!token) {
  console.log(
    t(
      "No token stored. Without one the portal does not deliver the installer.\n" +
        buyLines().join("\n") +
        "\n" +
        `Hand it in with: ${STORE_CALL}\n` +
        "Without the artifact everything works except the installation and statements about the product.",
      "Kein Token hinterlegt. Ohne einen liefert das Portal den Installer nicht aus.\n" +
        buyLines().join("\n") +
        "\n" +
        `Hineingeben mit: ${STORE_CALL}\n` +
        "Ohne Artefakt funktioniert alles außer der Installation und Aussagen über das Produkt."
    )
  );
  process.exit(1);
}

const needsFetch = arg.refresh || !state || ageHours(state) > MAX_AGE_HOURS;

if (!needsFetch) {
  console.log(
    t(
      `Mirror is current (fetched ${state.fetched}, product version ${versionOf(state).version ?? "unknown"}).`,
      `Spiegel ist aktuell (geholt ${state.fetched}, Produktversion ${versionOf(state).version ?? "unbekannt"}).`
    )
  );
  process.exit(0);
}

try {
  const fresh = await fetchMirror(base, token);
  console.log(
    t(
      `Mirror fetched. Product version ${fresh.version ?? "unknown"}, as of ${fresh.fetched}, ` +
        `source ${fresh.source}.\n` +
        "What came along lies under .ara/mirror/, its state in .ara/mirror/STATE.json.",
      `Spiegel geholt. Produktversion ${fresh.version ?? "unbekannt"}, Stand ${fresh.fetched}, ` +
        `Quelle ${fresh.source}.\n` +
        "Was mitgeliefert wurde, liegt unter .ara/mirror/, der Stand dazu in .ara/mirror/STATE.json."
    )
  );
} catch (error) {
  console.log(t(`The mirror could not be fetched.\n${error.message}`, `Spiegel konnte nicht geholt werden.\n${error.message}`));
  process.exit(1);
}
