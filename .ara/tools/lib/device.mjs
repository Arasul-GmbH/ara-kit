/**
 * Gerät erkennen und beurteilen. Reine Funktionen, ohne Netz und ohne Dateien,
 * damit der Selbsttest sie mit erfundenen Befunden prüfen kann.
 *
 * Was hier steht, ist die Unterstützungsregel des Kits, kein Produktwert: welche
 * Hardware Arasul heute trägt, welche angekündigt ist und was nicht. Werte für
 * ein Gerät (Modell, Engine, Speicherbudget) stehen weiter nur im Spiegel.
 */

/**
 * Das Prüfskript. Läuft als POSIX-Shell auf dem Gerät, liest nur, und gibt je
 * Befund eine Zeile `@schlüssel=wert` aus. Was ein Gerät nicht hat, fehlt einfach.
 */
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
for d in /opt/arasul "$HOME/arasul"; do [ -d "$d" ] && p arasul_dir "$d"; done
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
export const VERDICTS = {
  supported: "unterstützt",
  soon: "bald",
  unsupported: "nicht unterstützt, wir merken es vor",
};

/**
 * Hardware und Betriebssystem aus den Befunden, dazu das Urteil.
 *
 * Die Regel: Jetson Orin und Jetson Thor tragen Arasul heute. DGX Spark und
 * andere Rechner mit NVIDIA-Grafik sind angekündigt. Alles andere trägt es nicht,
 * und das Gerät wird in der Akte vorgemerkt, damit die Nachfrage sichtbar bleibt.
 */
export function judge(facts) {
  const model = facts.dt_model || facts.dmi_model || facts.hw_model || "";
  const gpu = facts.gpu || facts.pci_nvidia || "";
  const nvidia = Boolean(facts.tegra || gpu || /nvidia/i.test(model));
  const arch = (facts.uname || "").split(/\s+/).pop() || "";

  let os = facts.os_release || "";
  if (facts.macos) os = `macOS ${facts.macos}`;
  if (!os && facts.uname) os = facts.uname;

  let verdict = "unsupported";
  let reason = "keine NVIDIA-Hardware erkannt";
  if (/\b(orin|thor)\b/i.test(model)) {
    verdict = "supported";
    reason = `Jetson ${/thor/i.test(model) ? "Thor" : "Orin"} erkannt`;
  } else if (/dgx\s*spark|\bspark\b/i.test(`${model} ${gpu}`)) {
    verdict = "soon";
    reason = "DGX Spark erkannt, angekündigt";
  } else if (nvidia) {
    verdict = "soon";
    reason = `NVIDIA-Hardware erkannt (${gpu || facts.tegra || model}), angekündigt`;
  }

  const memoryGb = facts.mem_kb
    ? Math.round(Number(facts.mem_kb) / 1024 / 1024)
    : facts.mem_bytes
      ? Math.round(Number(facts.mem_bytes) / 1024 ** 3)
      : null;
  const diskFreeGb = facts.disk_free_kb ? Math.round(Number(facts.disk_free_kb) / 1024 / 1024) : null;

  return {
    hardware: model || (nvidia ? gpu : "") || "unbekannt",
    os: os || "unbekannt",
    arch,
    gpu: gpu || (facts.tegra ? "Tegra" : ""),
    memoryGb,
    diskFreeGb,
    verdict,
    verdictText: VERDICTS[verdict],
    reason,
  };
}

/**
 * Docker, das Sprachmodell und Hinweise auf Arasul aus den Befunden.
 * Erkannt heißt nicht eingerichtet.
 */
export function services(facts) {
  const docker = facts.docker_bin
    ? facts.docker_server
      ? { state: "running", text: `läuft, Server ${facts.docker_server}` }
      : { state: "present", text: "installiert, Dienst antwortet nicht oder keine Rechte" }
    : { state: "missing", text: "fehlt" };

  // Ein Sprachmodell läuft nicht überall als Programm auf dem Gerät. Auf einem
  // Gerät mit Arasul fährt es in einem Container, und dort gibt es kein Binary
  // im Pfad: „fehlt" wäre dann schlicht falsch, und der nächste Schritt hieße,
  // etwas aufzusetzen, das längst läuft. Erkannt wird deshalb beides, und der
  // Satz nennt, was gefunden wurde, statt es zu deuten.
  const llmContainers = (facts.docker_names || "").split(/\s+/).filter((n) => /ollama|llm/i.test(n));
  const ollama = facts.ollama_bin
    ? { state: "present", text: `installiert${facts.ollama_version ? `, ${facts.ollama_version}` : ""}` }
    : llmContainers.length
      ? { state: "container", text: `läuft im Container ${llmContainers.join(", ")}, nicht als Programm auf dem Gerät` }
      : { state: "missing", text: "fehlt" };

  // Hinweise auf Arasul: Container, Dienste oder Ordner mit dem Namen. Das ist
  // ein Anhaltspunkt, keine Aussage über den Produktstand. Der steht im Spiegel.
  // Ein Befehl namens arasul im Pfad zählt nicht: auf einem Entwicklungsrechner
  // liegt er auch dort, wo das Produkt nie lief.
  const hints = [];
  const containers = (facts.docker_names || "").split(/\s+/).filter((n) => /arasul/i.test(n));
  if (containers.length) hints.push(`Container ${containers.join(", ")}`);
  const units = (facts.arasul_units || "").split(/\s+/).filter(Boolean);
  if (units.length) hints.push(`Dienst ${units.join(", ")}`);
  for (const dir of facts.arasul_dir || []) hints.push(`Ordner ${dir}`);
  const arasul = hints.length
    ? { state: "found", text: `Hinweise gefunden: ${hints.join("; ")}` }
    : { state: "none", text: "keine Hinweise" };

  return { docker, ollama, arasul, sudo: facts.sudo === "ohne Passwort" };
}
