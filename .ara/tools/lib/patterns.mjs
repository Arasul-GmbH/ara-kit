/**
 * Muster fuer eine App erkennen: aus der Beschreibung des Hauses das Muster nennen, dessen Code im
 * Kit schon liegt.
 *
 * **Erkannt wird heute nur ein Muster, das Buchungsstapel-Muster (9).** Die uebrigen Muster unter
 * `.ara/templates/app-patterns/` erkennt dieses Modul nicht an Woertern; sie kommen ueber das
 * Interview und die Liste in `.ara/knowledge/app-patterns.md` ins Gespraech.
 *
 * Ein Mensch sagt "wir sind eine Kanzlei" oder "die Belege fuer den Steuerberater", nicht "ein
 * Buchungsstapel im DATEV-Format". Dieses Modul liest die Beschreibung und nennt das Muster, das
 * dazu passt, mit dem Blatt, das der Plan dann liest. Es entscheidet nichts: der Vorschlag wird im
 * Interview als Frage gestellt, und was der Mensch dazu schreibt, gilt.
 * Reine Funktionen.
 */

import { t } from "./i18n.mjs";

/** Woran man in einer Beschreibung ein Muster erkennt. Jedes Blatt liegt neben seinem Code. */
const KNOWN = [
  {
    id: "datev",
    number: 9,
    words:
      /\b(\w*kanzlei\w*|steuerberat\w*|buchhalt\w*|buchf(?:ü|ue)hrung|finanzbuchhaltung|vorkontier\w*|kontierung|datev|skr ?0?[34]|kontenrahmen|belegerfassung|accounting|bookkeep\w*|tax (?:adviser|advisor|firm|office)|booking batch)\b/i,
    sheet: ".ara/templates/app-patterns/datev/README",
    en: {
      name: "Booking batch for the tax adviser (pattern 9)",
      says: "an office that keeps books or prepares them hands its tax adviser a file DATEV can read in; the pattern writes that file, holds accounts against the SKR03 list and checks the file before anybody downloads it",
      limit: "SKR03 only, and the accounts are a sample list the tax adviser has to read through; nothing leaves the device, a person hands the file over",
    },
    de: {
      name: "Buchungsstapel für den Steuerberater (Muster 9)",
      says: "ein Büro, das Bücher führt oder vorbereitet, gibt seinem Steuerberater eine Datei, die DATEV einlesen kann; das Muster schreibt diese Datei, hält Konten gegen die Liste des SKR03 und prüft die Datei, bevor jemand sie herunterlädt",
      limit: "nur SKR03, und die Konten sind eine Beispielliste, die der Steuerberater durchsehen muss; nichts verlässt das Gerät, ein Mensch übergibt die Datei",
    },
  },
];

/** Die Muster, auf die eine Beschreibung hindeutet. */
export function detectPatterns(description) {
  const text = String(description ?? "");
  return KNOWN.filter((entry) => entry.words.test(text)).map((entry) => ({
    id: entry.id,
    number: entry.number,
    sheet: `${entry.sheet}${t(".md", ".de.md")}`,
    ...t(entry.en, entry.de),
  }));
}

/** Der Text fuer das Interview: was das Muster ist, was es nicht ist, welches Blatt zu lesen ist. */
export function describePatterns(description) {
  const found = detectPatterns(description);
  if (!found.length) {
    return t(
      "No ready-made pattern with a standard of its own matches this description. The overview of the shapes an app can take is `.ara/knowledge/app-patterns.md`.",
      "Zu dieser Beschreibung passt kein fertiges Muster mit einem eigenen Standard. Den Überblick über die Formen einer App gibt `.ara/knowledge/app-patterns.de.md`."
    );
  }
  return [
    t(
      "The description matches a pattern whose code is already in the kit. Offer it as a question, with its limit in one sentence; what the human answers holds:",
      "Die Beschreibung passt zu einem Muster, dessen Code schon im Kit liegt. Biete es als Frage an, mit seiner Grenze in einem Satz; was der Mensch antwortet, gilt:"
    ),
    ...found.map((p) => `- ${p.name}: ${p.says}. ${t("Limit", "Grenze")}: ${p.limit}. ${t("Sheet", "Blatt")}: ${p.sheet}`),
    "",
    t(
      "Read only that sheet, name the pattern in the plan, and say that before going live a sample file goes to the person who reads it in.",
      "Lies nur dieses Blatt, nenne das Muster im Plan und sag, dass vor dem Livegehen eine Probedatei an den geht, der sie einliest."
    ),
  ].join("\n");
}
