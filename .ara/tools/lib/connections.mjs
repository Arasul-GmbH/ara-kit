/**
 * Externe Dienste und Recherche einer App: erkennen, vorschlagen, das Feld `verbindungen` pruefen.
 *
 * Ein Mensch, der eine App beschreibt, sagt "die Mails vom Steuerberater" oder "der Kurs von
 * heute", nicht "ein ausgehender Aufruf". Dieses Modul liest die Beschreibung und nennt, wo die
 * App sehr wahrscheinlich das Geraet verlaesst. Daraus wird im Interview eine Frage in einfacher
 * Sprache und im Plan ein Eintrag, der sagt, was hinausgeht.
 *
 * **Die Form eines Eintrags in `verbindungen` steht nicht hier.** Sie steht im Schema des
 * Kontrakts, und das Geraet kennt das Feld erst, wenn sein Kontrakt es nennt. Die Vorschlaege
 * hier sind darum Saetze und Stichworte fuer den Plan, kein fertiges JSON fuer `app.json`.
 * `connectionFindings` haelt das Feld nur gegen den Kontrakt, solange der es kennt, und sagt
 * sonst in einem Satz, dass es nicht geprueft wurde.
 * Reine Funktionen.
 */

import { t } from "./i18n.mjs";

/** Woran man in einer Beschreibung einen Dienst oder eine Recherche erkennt. */
const KNOWN = [
  {
    id: "mail",
    kind: "service",
    words: /\b(e-?mails?|mails?|postfach|imap|smtp|outlook|gmail)\b/i,
    en: { name: "Mail provider", leaves: "the text and the address of the mails the app reads or sends" },
    de: { name: "Mail-Anbieter", leaves: "Text und Adresse der Mails, die die App liest oder schickt" },
  },
  {
    id: "calendar",
    kind: "service",
    words: /\b(kalender|termine?|calendar|google calendar|caldav)\b/i,
    en: { name: "Calendar service", leaves: "dates, titles and the names of the people invited" },
    de: { name: "Kalender-Dienst", leaves: "Termine, Titel und Namen der Eingeladenen" },
  },
  {
    id: "tax",
    kind: "service",
    words: /\b(datev|elster|finanzamt|steuerportal|lexware|sevdesk)\b/i,
    en: { name: "Accounting or tax service", leaves: "figures and receipts of a client, the most sensitive thing a firm holds" },
    de: { name: "Buchhaltungs- oder Steuerdienst", leaves: "Zahlen und Belege eines Mandanten, das Empfindlichste, was eine Kanzlei hat" },
  },
  {
    id: "payment",
    kind: "service",
    words: /\b(zahlung|bezahl|stripe|paypal|payment|bank|konto abruf|fints)\b/i,
    en: { name: "Payment or bank service", leaves: "amounts, names and account details" },
    de: { name: "Zahlungs- oder Bankdienst", leaves: "Beträge, Namen und Kontodaten" },
  },
  {
    id: "message",
    kind: "service",
    words: /\b(sms|whatsapp|slack|teams|telegram|push-?nachricht|benachrichtig\w* per)\b/i,
    en: { name: "Messaging service", leaves: "the text of every message and the number or name of the recipient" },
    de: { name: "Nachrichten-Dienst", leaves: "der Text jeder Nachricht und Nummer oder Name des Empfängers" },
  },
  {
    id: "register",
    kind: "service",
    words: /\b(handelsregister|northdata|schufa|creditreform|bonität|bonitaet|vies|ust-?id)\b/i,
    en: { name: "Register or credit check", leaves: "the name or number of the company or person looked up" },
    de: { name: "Register oder Auskunft", leaves: "Name oder Nummer der nachgeschlagenen Firma oder Person" },
  },
  {
    id: "api",
    kind: "service",
    words: /\b(schnittstelle|api|webhook|anbindung|anbinden|import aus|export (an|nach|zu))\b/i,
    en: { name: "Another system by its interface", leaves: "whatever the app hands to that system" },
    de: { name: "Ein anderes System über seine Schnittstelle", leaves: "alles, was die App diesem System übergibt" },
  },
  {
    id: "research",
    kind: "research",
    words: /\b(recherch\w*|im (internet|netz|web) (such|nachschau|nachles)\w*|google|suchmaschine|websuche|aktuelle[nrs]? (kurs|preis|gesetz|urteil|rechtslage|nachricht)\w*|nachschlagen|web ?scrap\w*|von (einer|der) (webseite|website|homepage))\b/i,
    en: { name: "Research on the internet", leaves: "the search words, and with them whatever the app puts into the question" },
    de: { name: "Recherche im Internet", leaves: "die Suchbegriffe, und mit ihnen alles, was die App in die Frage schreibt" },
  },
];

/**
 * Was die Beschreibung an Diensten und Recherche nennt.
 * Zurueck kommt eine Liste ohne Doppelte, leer heisst: nichts erkannt, und das ist kein Beleg,
 * dass nichts hinausgeht. Der Mensch wird trotzdem gefragt.
 */
export function detectConnections(description) {
  const text = String(description || "");
  return KNOWN.filter((entry) => entry.words.test(text)).map((entry) => ({
    id: entry.id,
    kind: entry.kind,
    name: t(entry.en.name, entry.de.name),
    leaves: t(entry.en.leaves, entry.de.leaves),
  }));
}

/** Die erkannten Dienste als Text fuer Mensch und Plan, in einfacher Sprache. */
export function describeConnections(description) {
  const found = detectConnections(description);
  if (!found.length) {
    return t(
      "Nothing in the description reaches outside the device. Still ask once: does the app ever look something up on the internet or hand data to another program?",
      "In der Beschreibung greift nichts aus dem Gerät hinaus. Frag trotzdem einmal: Schaut die App je etwas im Internet nach oder gibt sie Daten an ein anderes Programm?"
    );
  }
  return [
    t(
      "The description suggests the app leaves the device here. Nothing goes out unless somebody agrees to it, and every entry says what goes out:",
      "Die Beschreibung legt nahe, dass die App hier das Gerät verlässt. Nichts geht hinaus, solange niemand zugestimmt hat, und jeder Eintrag sagt, was hinausgeht:"
    ),
    ...found.map((entry) => `- ${entry.name}: ${t("leaves the device", "verlässt das Gerät")}: ${entry.leaves}`),
    "",
    t(
      "Ask per entry: is it needed, may it be on from the start or only on request, and may personal data go with it. Write the answer into the plan under `Connections`; the shape of an entry in app.json is the device's contract's to say.",
      "Frag je Eintrag: Braucht es das, darf es von Anfang an an sein oder nur auf Wunsch, und dürfen personenbezogene Daten mit. Schreib die Antwort in den Plan unter `Verbindungen`; die Form eines Eintrags in app.json bestimmt der Kontrakt des Geräts."
    ),
  ].join("\n");
}

/**
 * Das Feld `verbindungen` einer App, gegen den Kontrakt gehalten, soweit der es kennt.
 *
 * Kennt der Kontrakt das Feld, prueft `checkManifest` es mit; hier kommt nichts dazu, sonst
 * stuende jeder Fehler zweimal. Kennt er es nicht und `additionalProperties` ist `false`, weist
 * `checkManifest` es ab. Bleibt der Fall, dass das Schema offen ist und das Feld nicht nennt:
 * dann ist es ungeprueft, und das sagt dieser Satz.
 */
export function connectionFindings(contract, manifest) {
  if (!manifest || manifest.verbindungen === undefined) return [];
  const schema = contract?.app_json?.schema;
  if (!schema) return [];
  if (schema.properties && "verbindungen" in schema.properties) return plainHostFindings(manifest.verbindungen);
  if (schema.additionalProperties === false) return [];
  return [
    t(
      "verbindungen is in app.json, and this device's contract does not name the field yet. It is not checked, and the device will not hold the app to it.",
      "verbindungen steht in app.json, und der Kontrakt dieses Geräts nennt das Feld noch nicht. Es ist ungeprüft, und das Gerät hält die App nicht daran."
    ),
  ];
}

/**
 * Ein Satz fuer den Menschen: wohin diese App von sich aus kommt.
 *
 * Nur wenn der Kontrakt des Geraets ein Netz ohne Internet nennt (`netz.internet` ist `false`),
 * sonst weiss das Kit nichts ueber den Ausgang und sagt nichts. Die Hostnamen sind die der App,
 * das Kit setzt keinen eigenen dazu.
 */
export function reachLine(contract, manifest) {
  const netz = contract?.netz;
  if (!netz || netz.internet !== false || !manifest) return null;
  const hosts = Array.isArray(manifest.verbindungen) ? manifest.verbindungen : [];
  if (!hosts.length) {
    return t(
      "- This app does not reach the internet: it has no entry in verbindungen. A call to the outside fails. Models and documents it gets through the device.",
      "- Diese App kommt nicht ins Internet: sie hat keinen Eintrag in verbindungen. Ein Aufruf nach draußen scheitert. Modelle und Dokumente bekommt sie über das Gerät."
    );
  }
  return t(
    `- This app reaches exactly these addresses on the internet and nothing else: ${hosts.join(", ")}.`,
    `- Diese App erreicht im Internet genau diese Adressen und sonst nichts: ${hosts.join(", ")}.`
  );
}

/**
 * Was an einem Eintrag nicht stimmt, in den Worten eines Menschen.
 *
 * Das Schema des Geraets urteilt ueber die Form und nennt ein Muster, das niemand liest. Hier
 * steht, was ein Mensch daran aendern kann: nur der Name der Seite, klein, ohne `https://`, ohne
 * Port, ohne Pfad, ohne Stern, keine Zahlenadresse. Das ist die Lesung des Kits, keine Aussage
 * ueber das Geraet; ob der Eintrag gilt, entscheidet dessen Schema.
 */
function plainHostFindings(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const entry of list) {
    if (typeof entry !== "string") continue;
    let why = null;
    if (/^[a-z]+:\/\//i.test(entry)) why = t("it starts with https:// or similar", "es beginnt mit https:// oder Ähnlichem");
    else if (/[\/?#]/.test(entry)) why = t("it has a path after the name", "hinter dem Namen steht ein Pfad");
    else if (/:\d*$/.test(entry)) why = t("it has a port", "es hat einen Port");
    else if (/\*/.test(entry)) why = t("it has a star, and the device takes whole names only", "es hat einen Stern, und das Gerät nimmt nur ganze Namen");
    else if (/^[\d.]+$/.test(entry) || entry.includes("[")) why = t("it is a number address, not a name", "es ist eine Zahlenadresse, kein Name");
    else if (entry !== entry.toLowerCase()) why = t("it has capital letters", "es hat Großbuchstaben");
    if (why) {
      out.push(
        t(
          `verbindungen: "${entry}" does not fit, ${why}. Write only the name of the site, in small letters, for example api.example.org.`,
          `verbindungen: "${entry}" passt nicht, ${why}. Schreib nur den Namen der Seite, klein, zum Beispiel api.example.org.`
        )
      );
    }
  }
  return out;
}
