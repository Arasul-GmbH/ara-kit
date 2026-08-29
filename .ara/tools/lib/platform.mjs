/**
 * Device profiles of the kit, and the verification level from the mirror.
 *
 * The kit recognises hardware without prior knowledge: it reads what the device says
 * about itself and holds that against the profiles under `.ara/knowledge/devices/`.
 * Every profile is a sheet with a date and a source, so a recognition can be traced
 * back to where its knowledge came from and how old it is. **Nothing is researched at
 * runtime.**
 *
 * The split matters and it is the one from CLAUDE.md:
 *
 * - **The kit profile** describes hardware: vendor, family, architecture, and the
 *   signature the recognition runs on. That belongs to the kit, it changes rarely, and
 *   it is written down with `as_of` and `source`.
 * - **The platform catalogue of the product** describes what runs on that hardware:
 *   model, engine, memory budget, and the level at which the profile is backed. That
 *   stands in the mirror, `config/platforms/<id>.json`, and nowhere else.
 *
 * The field `verification` from the catalogue is the answer to the one question a
 * partner has to ask before they put a device up at a customer: was this profile
 * verified on the device, or only built from the manufacturer's documentation. Without
 * a mirror the kit does not know it, and then it says so instead of guessing a level.
 *
 * === deutsch ===
 *
 * Geräteprofile des Kits, und der Verifikationsstand aus dem Spiegel.
 *
 * Das Kit erkennt Hardware ohne Vorwissen: es liest, was das Gerät über sich sagt, und
 * hält das gegen die Profile unter `.ara/knowledge/devices/`. Jedes Profil ist ein Blatt
 * mit Stand und Quelle, damit eine Erkennung darauf zurückgeht, woher ihre Kenntnis kam
 * und wie alt sie ist. **Zur Laufzeit wird nichts recherchiert.**
 *
 * Die Trennung ist wichtig, und es ist die aus CLAUDE.md:
 *
 * - **Das Kit-Profil** beschreibt Hardware: Hersteller, Familie, Architektur und die
 *   Signatur, auf der die Erkennung greift. Das gehört dem Kit, ändert sich selten und
 *   steht mit `as_of` und `source` geschrieben.
 * - **Der Plattformkatalog des Produkts** beschreibt, was auf dieser Hardware läuft:
 *   Modell, Engine, Speicherbudget, und die Stufe, auf der das Profil belegt ist. Das
 *   steht im Spiegel, `config/platforms/<id>.json`, und sonst nirgends.
 *
 * Das Feld `verification` aus dem Katalog ist die Antwort auf die eine Frage, die ein
 * Partner stellen muss, bevor er ein Gerät beim Kunden aufstellt: wurde dieses Profil am
 * Gerät verifiziert, oder nur nach Herstellerdoku gebaut. Ohne Spiegel weiß das Kit das
 * nicht, und dann sagt es das, statt eine Stufe zu raten.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT, readFrontmatter } from "./kit.mjs";
import { isVariant, localized, t } from "./i18n.mjs";

/** Wo die Profile liegen. */
export function profileDir() {
  return join(ROOT, ".ara", "knowledge", "devices");
}

/** Wo der Spiegel liegt. Dieselbe Umlenkung wie in lib/install.mjs. */
function mirrorDir() {
  return process.env.ARA_MIRROR || join(ROOT, ".ara", "mirror");
}

/** Was ein Profil tragen muss, um überhaupt erkennen zu können. */
const REQUIRED = ["id", "vendor", "family", "arch", "support", "match", "as_of", "source"];

/**
 * Die Profile aus dem Wissen, in der Sprache des Profils.
 *
 * Gelesen wird die englische Grundfassung als Liste und die geltende Sprache als Datei:
 * die Felder sind in beiden dieselben, nur `source` steht in der Sprache des Blattes.
 * Ein Blatt ohne Pflichtfeld wird übergangen, statt halb erkannt zu werden; dass es
 * keines gibt, prüft der Selbsttest.
 */
export function readProfiles(dir = profileDir()) {
  if (!existsSync(dir)) return [];
  const profiles = [];
  for (const name of readdirSync(dir).sort()) {
    if (!name.endsWith(".md") || isVariant(name)) continue;
    const { fields } = readFrontmatter(localized(join(dir, name)));
    if (REQUIRED.some((key) => !fields[key])) continue;
    profiles.push({
      ...fields,
      sheet: `.ara/knowledge/devices/${name}`,
      platform_min_memory_gb: fields.platform_min_memory_gb ? Number(fields.platform_min_memory_gb) : null,
    });
  }
  return profiles;
}

/**
 * Was das Gerät über sich sagt, zusammengefasst zu einer Zeichenkette.
 *
 * Modell und Grafikzeile, sonst nichts. Der Rechnername gehört ausdrücklich nicht dazu:
 * ein Gerät, das jemand `spark` genannt hat, ist kein DGX Spark.
 */
function signature(facts) {
  return [facts.dt_model, facts.dmi_model, facts.hw_model, facts.gpu, facts.pci_nvidia, facts.tegra]
    .filter(Boolean)
    .join(" ");
}

/**
 * Der Hersteller, und woher die Angabe kommt.
 *
 * Zuerst das Gerät selbst: DMI trägt den Hersteller im Klartext. Danach macOS, das kein
 * DMI hat. Erst dann das Profil, und ganz zuletzt die NVIDIA-Zeichen im Befund. Geraten
 * wird nichts: ohne Anhaltspunkt bleibt es unbekannt.
 */
export function vendorOf(facts, profile = null) {
  if (facts.dmi_vendor) return { name: facts.dmi_vendor, source: "/sys/class/dmi/id/sys_vendor" };
  if (facts.macos) return { name: "Apple", source: "sw_vers" };
  if (profile) return { name: profile.vendor, source: profile.sheet };
  if (facts.tegra || facts.gpu || facts.pci_nvidia) {
    return { name: "NVIDIA", source: facts.tegra ? "/etc/nv_tegra_release" : "nvidia-smi, lspci" };
  }
  return { name: null, source: null };
}

/**
 * Welches Profil zum Befund passt. Rein, damit der Selbsttest Attrappen einsetzen kann.
 *
 * Das erste Profil, dessen Muster greift, gewinnt. Mehr als eines darf nicht greifen,
 * und dass keines das tut, prüft der Selbsttest gegen die echten Blätter.
 */
export function matchProfile(facts, profiles) {
  const text = signature(facts);
  if (!text) return null;
  for (const profile of profiles) {
    let pattern;
    try {
      pattern = new RegExp(profile.match, "i");
    } catch {
      continue;
    }
    if (pattern.test(text)) return profile;
  }
  return null;
}

/**
 * Welches Katalogprofil zu dieser Hardware gehört, wenn das Kit es sagen kann.
 *
 * Eine Gerätefamilie gibt es in mehreren Speichergrößen, und der Katalog führt je Größe
 * ein eigenes Profil. Der Gerätebaum sagt die Größe nicht, der Speicher sagt sie. Reicht
 * er nicht, nennt das Kit kein Katalogprofil: `orin-64` auf einem Orin mit 32 GB wäre
 * eine Zusage über Speicher, die dieses Gerät nicht hält.
 */
export function platformOf(profile, memoryGb) {
  if (!profile) return { id: null, reason: null };
  if (!profile.platform) {
    return {
      id: null,
      reason: t(
        `${profile.sheet} names no catalogue profile`,
        `${profile.sheet} nennt kein Katalogprofil`
      ),
    };
  }
  const min = profile.platform_min_memory_gb;
  if (!min) return { id: profile.platform, reason: null };
  if (memoryGb === null || memoryGb === undefined) {
    return {
      id: null,
      reason: t(
        `memory not readable, and the catalogue profile ${profile.platform} applies from ${min} GB upwards`,
        `Speicher nicht lesbar, und das Katalogprofil ${profile.platform} gilt erst ab ${min} GB`
      ),
    };
  }
  if (memoryGb < min) {
    return {
      id: null,
      reason: t(
        `${memoryGb} GB recognised, the catalogue profile ${profile.platform} applies from ${min} GB upwards. ` +
          "The catalogue has no profile for this variant.",
        `${memoryGb} GB erkannt, das Katalogprofil ${profile.platform} gilt erst ab ${min} GB. ` +
          "Für diese Fassung führt der Katalog kein Profil."
      ),
    };
  }
  return { id: profile.platform, reason: null };
}

/**
 * Die Stufen, auf denen ein Katalogprofil belegt sein kann, im Klartext.
 *
 * Die Kennungen kommen aus dem Katalog des Produkts. Eine unbekannte Kennung wird
 * weitergereicht und nicht gedeutet: eine neue Stufe zu übersetzen, die das Kit nicht
 * kennt, hieße sie zu erfinden.
 */
export const VERIFICATION = {
  live: t("verified on real hardware", "an echter Hardware verifiziert"),
  emulation: t(
    "not on the device, only checked under emulation",
    "nicht am Gerät, nur unter Emulation geprüft"
  ),
  "follow-up": t(
    "built from manufacturer documentation, not tried on a device",
    "nach Herstellerdoku gebaut, an keinem Gerät erprobt"
  ),
};

/**
 * Der Verifikationsstand eines Katalogprofils, aus dem Spiegel.
 *
 * Gelesen wird `config/platforms/<id>.json`, das Feld `verification`. Fehlt der Spiegel,
 * das Profil oder das Feld, kommt keine Stufe zurück, sondern der Grund dafür.
 */
export function verificationOf(platformId, dir = mirrorDir()) {
  const where = `${platformId}.json`;
  if (!platformId) return { level: null, reason: t("no catalogue profile", "kein Katalogprofil") };
  if (!existsSync(join(dir, "config", "platforms"))) {
    // `missing` steht neben dem Grund, damit der Satz darueber nicht im Text
    // nachsehen muss, was fehlt. Ein Grund ist fuer Menschen geschrieben und
    // aendert sich; hieran haengt eine Entscheidung.
    return {
      level: null,
      missing: "mirror",
      reason: t(
        "there is no mirror, so the catalogue cannot be read",
        "es gibt keinen Spiegel, also ist der Katalog nicht lesbar"
      ),
    };
  }
  const file = join(dir, "config", "platforms", where);
  if (!existsSync(file)) {
    return { level: null, reason: t(`the mirror has no ${where}`, `der Spiegel hat kein ${where}`) };
  }
  let data;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return { level: null, reason: t(`${where} in the mirror is unreadable`, `${where} im Spiegel ist unlesbar`) };
  }
  if (!data.verification) {
    return {
      level: null,
      reason: t(`${where} carries no field verification`, `${where} trägt kein Feld verification`),
    };
  }
  return {
    level: String(data.verification),
    text: VERIFICATION[data.verification] || null,
    source: `config/platforms/${where}`,
    reason: null,
  };
}

/**
 * Der Satz über den Verifikationsstand, wie er vor jedem Lauf ausgegeben wird.
 *
 * Er steht auch dann da, wenn nichts zu sagen ist. Eine fehlende Zeile läse sich wie
 * eine Bestätigung, und genau das ist sie nicht.
 */
export function verificationLine(check) {
  if (!check?.level) {
    // Fund 2 der Werkstatt am 29.08.2026: der Satz sagte, es gebe keinen
    // Spiegel, und nicht, wie man an einen kommt. Das Kit weiss hier genau,
    // was fehlt, und sagte es nur halb.
    const weg = check?.missing === "mirror"
      ? t(
          " node .ara/tools/mirror.mjs --refresh fetches the artifact, also without an installation.",
          " node .ara/tools/mirror.mjs --refresh holt das Artefakt, auch ohne Installation."
        )
      : "";
    return (
      t(
        `Verification level: unknown, ${check?.reason || "no reason given"}. ` +
          "Whether this profile was verified on the device or only built from manufacturer " +
          "documentation, the kit cannot say here.",
        `Verifikationsstand: unbekannt, ${check?.reason || "kein Grund genannt"}. ` +
          "Ob dieses Profil am Gerät verifiziert oder nur nach Herstellerdoku gebaut wurde, " +
          "kann das Kit hier nicht sagen."
      ) + weg
    );
  }
  const meaning = check.text
    ? ` (${check.text})`
    : t(
        " (the kit does not know this level, take it as it stands)",
        " (diese Stufe kennt das Kit nicht, nimm sie, wie sie dasteht)"
      );
  return t(
    `Verification level: ${check.level}${meaning}, according to the mirror, ${check.source}.`,
    `Verifikationsstand: ${check.level}${meaning}, laut Spiegel, ${check.source}.`
  );
}

/**
 * Welche Geräte das Kit heute trägt, für den Fall, dass keines davon dasteht.
 *
 * Genannt wird, was in den Profilen steht, nicht was jemand in Erinnerung hat.
 */
export function supportedDevices(profiles) {
  const order = { supported: 0, soon: 1 };
  return profiles
    .filter((profile) => profile.support in order)
    .map((profile) => ({
      family: `${profile.vendor} ${profile.family}`,
      support: profile.support,
      sheet: profile.sheet,
    }))
    .sort((a, b) => order[a.support] - order[b.support] || a.family.localeCompare(b.family));
}
