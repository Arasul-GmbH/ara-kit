/**
 * Gerät erkennen und beurteilen. Reine Funktionen, ohne Netz und ohne Dateien,
 * damit der Selbsttest sie mit erfundenen Befunden prüfen kann.
 *
 * **Welche Hardware das Kit kennt, steht nicht mehr hier.** Es steht als Profil
 * je Gerät unter `.ara/knowledge/devices/`, mit Stand und Quelle, und `judge()`
 * bekommt diese Profile hereingereicht. Das Urteil ist damit geräteunabhängig:
 * ein neues Gerät ist ein neues Blatt und keine neue Zeile in diesem Modul.
 *
 * Was hier bleibt, ist die Regel für alles, wozu es kein Blatt gibt: ein Rechner
 * mit NVIDIA-Grafik ist angekündigt, alles andere wird vorgemerkt. Werte für ein
 * Gerät (Modell, Engine, Speicherbudget) stehen weiter nur im Spiegel.
 */

/**
 * Das Prüfskript. Läuft als POSIX-Shell auf dem Gerät, liest nur, und gibt je
 * Befund eine Zeile `@schlüssel=wert` aus. Was ein Gerät nicht hat, fehlt einfach.
 */
import { t } from "./i18n.mjs";
import { matchProfile, vendorOf } from "./platform.mjs";

export const PROBE = `
# Eine SSH-Sitzung ohne Login-Shell kennt die Pfade von Homebrew, Docker Desktop
# und snap nicht. Ohne diese Zeile fehlt Docker auf jedem Mac.
PATH="$PATH:/usr/local/bin:/opt/homebrew/bin:/usr/sbin:/sbin:/snap/bin:/usr/local/sbin"
p() { printf '@%s=%s\\n' "$1" "$2"; }
p uname "$(uname -srm 2>/dev/null)"
p hostname "$(hostname 2>/dev/null)"
[ -r /etc/os-release ] && p os_release "$(. /etc/os-release 2>/dev/null; printf '%s' "$PRETTY_NAME")"
command -v sw_vers >/dev/null 2>&1 && p macos "$(sw_vers -productVersion 2>/dev/null)"
[ -r /proc/device-tree/model ] && p dt_model "$(tr -d '\\0' < /proc/device-tree/model 2>/dev/null)"
[ -r /sys/class/dmi/id/product_name ] && p dmi_model "$(cat /sys/class/dmi/id/product_name 2>/dev/null)"
[ -r /sys/class/dmi/id/sys_vendor ] && p dmi_vendor "$(cat /sys/class/dmi/id/sys_vendor 2>/dev/null)"
command -v sysctl >/dev/null 2>&1 && p hw_model "$(sysctl -n hw.model 2>/dev/null)"
[ -r /etc/nv_tegra_release ] && p tegra "$(head -1 /etc/nv_tegra_release 2>/dev/null)"
command -v nvidia-smi >/dev/null 2>&1 && p gpu "$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1)"
command -v lspci >/dev/null 2>&1 && p pci_nvidia "$(lspci 2>/dev/null | grep -i nvidia | head -1)"
[ -r /proc/meminfo ] && p mem_kb "$(awk '/MemTotal/ {print $2}' /proc/meminfo 2>/dev/null)"
command -v sysctl >/dev/null 2>&1 && p mem_bytes "$(sysctl -n hw.memsize 2>/dev/null)"
p disk_free_kb "$(df -k / 2>/dev/null | tail -1 | awk '{print $4}')"
if command -v docker >/dev/null 2>&1; then
  p docker_bin "$(command -v docker)"
  p docker_server "$(docker version --format '{{.Server.Version}}' 2>/dev/null)"
  names="$(docker ps --format '{{.Names}}' 2>/dev/null | tr '\\n' ' ')"
  # Ohne Rechte auf den Docker-Socket sagt docker ps nichts, und dann sieht das
  # Kit weder Arasul noch das Sprachmodell im Container. Einmal mit sudo, aber
  # nur ohne Passwort: eine Passwortabfrage mitten in einer Pruefung, die nur
  # liest, waere eine Falle.
  [ -z "$names" ] && sudo -n true >/dev/null 2>&1 && names="$(sudo -n docker ps --format '{{.Names}}' 2>/dev/null | tr '\\n' ' ')"
  p docker_names "$names"
fi
if command -v ollama >/dev/null 2>&1; then
  p ollama_bin "$(command -v ollama)"
  p ollama_version "$(ollama --version 2>/dev/null | head -1)"
fi
command -v systemctl >/dev/null 2>&1 && p arasul_units "$(systemctl list-units --type=service --no-pager --plain 2>/dev/null | awk '{print $1}' | grep -i arasul | tr '\\n' ' ')"
for d in /opt/arasul "$HOME/arasul" "$HOME"/arasul-*; do [ -d "$d" ] && p arasul_dir "$d"; done
command -v sudo >/dev/null 2>&1 && sudo -n true >/dev/null 2>&1 && p sudo "ohne Passwort"
p user "$(id -un 2>/dev/null)"
p done ja
`;

/** Zerlegt die Ausgabe des Prüfskripts in ein Objekt. Mehrfache Schlüssel werden Listen. */
export function parseProbe(output) {
  const facts = {};
  for (const line of String(output || "").split(/\r?\n/)) {
    const m = line.match(/^@([a-z_]+)=(.*)$/);
    if (!m) continue;
    const [, key, raw] = m;
    const value = raw.trim();
    if (!value) continue;
    if (key === "arasul_dir") {
      facts[key] = [...(facts[key] || []), value];
    } else {
      facts[key] = value;
    }
  }
  return facts;
}

/** Die drei Urteile, mit dem Satz, der dem Menschen gesagt wird. */
export const VERDICTS = t(
  { supported: "supported", soon: "soon", unsupported: "not supported, we note it down" },
  { supported: "unterstützt", soon: "bald", unsupported: "nicht unterstützt, wir merken es vor" }
);

/**
 * Hardware und Betriebssystem aus den Befunden, dazu das Urteil.
 *
 * Die Erkennung läuft ohne Vorwissen: sie liest, was das Gerät über sich sagt,
 * und hält es gegen die Profile, die hereingereicht werden. Greift eines, gilt
 * dessen Feld `support`, und das Blatt steht als Begründung dabei. Greift keines,
 * bleibt die Regel für den Rest: NVIDIA-Grafik ist angekündigt, alles andere wird
 * vorgemerkt, damit die Nachfrage in der Akte sichtbar bleibt.
 */
export function judge(facts, profiles = []) {
  const model = facts.dt_model || facts.dmi_model || facts.hw_model || "";
  const gpu = facts.gpu || facts.pci_nvidia || "";
  const nvidia = Boolean(facts.tegra || gpu || /nvidia/i.test(model));
  const arch = (facts.uname || "").split(/\s+/).pop() || "";
  const kernel = (facts.uname || "").split(/\s+/).slice(0, 2).join(" ");

  let os = facts.os_release || "";
  if (facts.macos) os = `macOS ${facts.macos}`;
  if (!os && facts.uname) os = facts.uname;

  const memoryGb = facts.mem_kb
    ? Math.round(Number(facts.mem_kb) / 1024 / 1024)
    : facts.mem_bytes
      ? Math.round(Number(facts.mem_bytes) / 1024 ** 3)
      : null;
  const diskFreeGb = facts.disk_free_kb ? Math.round(Number(facts.disk_free_kb) / 1024 / 1024) : null;

  const profile = matchProfile(facts, profiles);
  const vendor = vendorOf(facts, profile);

  let verdict = "unsupported";
  let reason = t("no NVIDIA hardware recognised", "keine NVIDIA-Hardware erkannt");
  if (profile) {
    verdict = profile.support;
    reason = t(
      `${profile.vendor} ${profile.family} recognised, according to ${profile.sheet}`,
      `${profile.vendor} ${profile.family} erkannt, nach ${profile.sheet}`
    );
  } else if (nvidia) {
    // Kein Blatt, aber NVIDIA-Grafik. Angekündigt heißt hier: das Kit hat für
    // genau dieses Gerät nichts aufgeschrieben, und das ist eine Nachfrage wert.
    verdict = "soon";
    reason = t(
      `NVIDIA hardware recognised (${gpu || facts.tegra || model}), no profile in the kit for it, announced`,
      `NVIDIA-Hardware erkannt (${gpu || facts.tegra || model}), kein Profil im Kit dafür, angekündigt`
    );
  }

  return {
    hardware: model || (nvidia ? gpu : "") || t("unknown", "unbekannt"),
    vendor: vendor.name,
    vendorSource: vendor.source,
    os: os || t("unknown", "unbekannt"),
    kernel,
    arch,
    gpu: gpu || (facts.tegra ? "Tegra" : ""),
    memoryGb,
    diskFreeGb,
    profile,
    verdict,
    verdictText: VERDICTS[verdict],
    reason,
  };
}

/**
 * Woran das Kit einen Container der Plattform erkennt.
 *
 * Eine Erkennungsregel des Kits, kein Produktwert: sie sagt nicht, welche
 * Container es gibt, sondern nur, was das Kit als "da läuft die Plattform"
 * durchgehen lässt. Die belastbare Auskunft ist und bleibt der Kontrakt des
 * Geräts. Zwei Muster, weil ein Container der Plattform entweder ihren Namen
 * trägt oder die Oberfläche ist, an der man sie erkennt.
 */
export const PLATFORM_CONTAINERS = [/arasul/i, /^dashboard-backend$/i];

/**
 * Docker, das Sprachmodell und Hinweise auf Arasul aus den Befunden.
 * Erkannt heißt nicht eingerichtet.
 */
export function services(facts) {
  const docker = facts.docker_bin
    ? facts.docker_server
      ? { state: "running", text: t(`runs, server ${facts.docker_server}`, `läuft, Server ${facts.docker_server}`) }
      : {
          state: "present",
          text: t(
            "installed, the service does not answer or there are no rights",
            "installiert, Dienst antwortet nicht oder keine Rechte"
          ),
        }
    : { state: "missing", text: t("missing", "fehlt") };

  // Ein Sprachmodell läuft nicht überall als Programm auf dem Gerät. Auf einem
  // Gerät mit Arasul fährt es in einem Container, und dort gibt es kein Binary
  // im Pfad: „fehlt" wäre dann schlicht falsch, und der nächste Schritt hieße,
  // etwas aufzusetzen, das längst läuft. Erkannt wird deshalb beides, und der
  // Satz nennt, was gefunden wurde, statt es zu deuten.
  const llmContainers = (facts.docker_names || "").split(/\s+/).filter((n) => /ollama|llm/i.test(n));
  const ollama = facts.ollama_bin
    ? {
        state: "present",
        text: t("installed", "installiert") + (facts.ollama_version ? `, ${facts.ollama_version}` : ""),
      }
    : llmContainers.length
      ? {
          state: "container",
          text: t(
            `runs in the container ${llmContainers.join(", ")}, not as a program on the device`,
            `läuft im Container ${llmContainers.join(", ")}, nicht als Programm auf dem Gerät`
          ),
        }
      : { state: "missing", text: t("missing", "fehlt") };

  // Hinweise auf Arasul: Container, Dienste oder Ordner mit dem Namen. Das ist
  // ein Anhaltspunkt, keine Aussage über den Produktstand. Der steht im Spiegel.
  // Ein Befehl namens arasul im Pfad zählt nicht: auf einem Entwicklungsrechner
  // liegt er auch dort, wo das Produkt nie lief.
  //
  // **Ein laufender Container und ein liegengebliebener Ordner sind nicht
  // dasselbe**, und bis zum 28.08.2026 waren sie es für das Kit. Auf einem
  // zurückgesetzten Gerät lag nach dem ersten Versuch ein Ordner, nichts lief,
  // und das Kit verweigerte jede weitere Installation: es hielt seine eigenen
  // Reste für eine Plattform. Seitdem gibt es drei Antworten, und "Reste da,
  // nichts läuft" ist eine davon.
  const containers = (facts.docker_names || "").split(/\s+/).filter((n) => PLATFORM_CONTAINERS.some((p) => p.test(n)));
  const units = (facts.arasul_units || "").split(/\s+/).filter(Boolean);
  const dirs = facts.arasul_dir || [];
  const traces = [
    ...(units.length ? [`Dienst ${units.join(", ")}`] : []),
    ...dirs.map((dir) => t(`folder ${dir}`, `Ordner ${dir}`)),
  ];
  const arasul = containers.length
    ? {
        state: "running",
        text:
          t(`runs, containers ${containers.join(", ")}`, `läuft, Container ${containers.join(", ")}`) +
          (traces.length ? `; ${traces.join("; ")}` : ""),
      }
    : traces.length
      ? {
          state: "traces",
          text: t(`traces there, nothing runs: ${traces.join("; ")}`, `Reste da, nichts läuft: ${traces.join("; ")}`),
        }
      : { state: "none", text: t("no traces", "keine Hinweise") };

  return { docker, ollama, arasul, sudo: facts.sudo === "ohne Passwort" };
}

/**
 * Läuft die Plattform auf diesem Gerät?
 *
 * Beantwortet auch Akten, die noch `found` tragen: das war bis zum 28.08.2026
 * der eine Zustand für alles, was nach Arasul aussah. Eine alte Akte umzudeuten
 * wäre falsch, sie stehenzulassen und zu ignorieren auch.
 */
export function arasulRunning(state) {
  return state === "running" || state === "found";
}

/**
 * Wie der Kit-Schluessel am Geraet heisst.
 *
 * Der Name steht in der Schluesselliste des Geraets, und dort liest ihn spaeter
 * ein Mensch. `business/company.md` legt `/init` nur im Partner-Zweig an; im
 * Unternehmens-Zweig blieb der Ausdruck darum auf seinem letzten Zweig stehen,
 * und der Schluessel hiess "Ara-Kit Partner" (Fund 3 der Werkstatt am
 * 29.08.2026). Das Profil gibt es in beiden Zweigen und traegt `company`.
 *
 * Kein Rueckfall auf ein Wort, das nach einem Namen aussieht: steht nirgends
 * einer, heisst der Schluessel "Ara-Kit" und behauptet nichts.
 */
export function deployKeyName(company = {}, profile = {}) {
  const owner = company.name || company.company || profile.company || profile.name;
  return owner ? `Ara-Kit ${owner}` : "Ara-Kit";
}

/**
 * Welchen Namen die Akte fuer das Startpasswort bekommt.
 *
 * `installed` ist der Name aus einer Installation, die dieser Lauf gemacht hat.
 * Gab es keine, zaehlt trotzdem, ob in der Ablage ein Eintrag unter dem
 * erwarteten Namen liegt: ein Geraet, auf dem Arasul schon lief, bekam das Feld
 * sonst nie, obwohl `--admin-login` sich damit anmeldete (Fund 4 der Werkstatt
 * am 29.08.2026). Was schon in der Akte steht, bleibt stehen.
 *
 * `null` heisst: nichts zu schreiben.
 */
export function startPasswordRef({ noted = "", installed = null, ref = "", stored = false }) {
  if (installed) return installed;
  if (noted) return null;
  return stored && ref ? ref : null;
}
