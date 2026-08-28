/**
 * Der Kaufweg: Konto, Token, Gerät. Kein eigener Befehl.
 *
 * Kolja am 28.08.2026: „ich will keinen Command haben, der slash kaufen heißt.
 * Das soll direkt angezeigt werden, wenn ich das Gerät einrichte und das dafür
 * kompatibel ist." Der Weg hängt darum an /device, genau dort, wo das Urteil
 * „unterstützt" fällt: liegt kein Token vor, zeigt das Werkzeug den Link, unter
 * dem es ein Konto und einen Token gibt, und nimmt den eingefügten Token danach
 * über die Standardeingabe entgegen. Wer von sich aus nach dem Kauf fragt, geht
 * denselben Weg, ohne einen Befehl kennen zu müssen.
 *
 * Was hier steht, ist am 28.08.2026 belegt und keine Vermutung:
 *
 *   - Konto und Token gibt es unter https://www.arasul.de/kaufen.
 *   - Ein Konto ist kostenlos und bringt genau einen kostenlosen Geräte-Token
 *     für den persönlichen Gebrauch. Jede weitere Installation wird gekauft,
 *     kommerzieller Einsatz braucht die Lizenz zu 3.000 Euro netto.
 *   - Der Token hat die Form ara_ und 32 Hexzeichen.
 *   - Geprüft wird er mit GET /api/download?token=<token>&pruefen=1. Die Antwort
 *     ist {ok:true,typ:"device",artefakt:"bereit"}; ein falscher Token gibt
 *     ok:false mit fehler token_ungueltig und einer Meldung, die auf den Kaufweg
 *     zeigt. Ohne pruefen=1 kommt das tar.gz, und das holt mirror.mjs.
 *
 * Der Token geht nie auf eine Befehlszeile. Er kommt über die Standardeingabe
 * und liegt danach in der Geheimnis-Ablage, unter ARASUL_TOKEN. Ausgegeben wird
 * er nirgends.
 */

import { join } from "node:path";
import { listCustomers, listDevices, readFrontmatter, devicePath } from "./kit.mjs";
import { t } from "./i18n.mjs";
import { getSecret } from "./secrets.mjs";

/** Wo Konto und Token entstehen. Die eine Adresse, die das Kit dafür nennt. */
export const BUY_URL = "https://www.arasul.de/kaufen";

/** Wo das Portal antwortet. ARASUL_BASIS lenkt es um, für Tests und abweichende Installationen. */
export const PORTAL_DEFAULT = "https://www.arasul.de";

export function portalBase() {
  return getSecret("ARASUL_BASIS") || PORTAL_DEFAULT;
}

/** Die Form des Tokens: ara_ und 32 Hexzeichen, nichts davor, nichts dahinter. */
export const TOKEN_SHAPE = /^ara_[0-9a-f]{32}$/;

/**
 * Was jemand eingefügt hat, bereinigt: Zeilenumbrüche, Anführungszeichen und
 * ein vorangestelltes „token=" fallen weg. Groß geschriebene Hexzeichen werden
 * klein, das Portal kennt sie so.
 */
export function cleanToken(raw) {
  if (typeof raw !== "string") return "";
  let token = raw.trim().replace(/^["'`]+|["'`]+$/g, "").trim();
  token = token.replace(/^token=/i, "");
  return token.replace(/^ARA_/, "ara_").replace(/^(ara_)(.*)$/, (_, head, rest) => head + rest.toLowerCase());
}

/** Stimmt die Form? Sagt bei nein, was nicht stimmt, ohne den Wert zu wiederholen. */
export function tokenShape(token) {
  if (!token) return { ok: false, reason: t("nothing was handed in", "es wurde nichts übergeben") };
  if (!token.startsWith("ara_")) {
    return { ok: false, reason: t("a token starts with ara_", "ein Token beginnt mit ara_") };
  }
  const rest = token.slice(4);
  if (rest.length !== 32) {
    return {
      ok: false,
      reason: t(
        `after ara_ come 32 characters, here there are ${rest.length}`,
        `nach ara_ kommen 32 Zeichen, hier sind es ${rest.length}`
      ),
    };
  }
  if (!TOKEN_SHAPE.test(token)) {
    return {
      ok: false,
      reason: t(
        "after ara_ only the digits 0 to 9 and the letters a to f are allowed",
        "nach ara_ sind nur die Ziffern 0 bis 9 und die Buchstaben a bis f erlaubt"
      ),
    };
  }
  return { ok: true, reason: "" };
}

/**
 * Fragt das Portal, ob der Token gilt, ohne das Artefakt zu holen.
 *
 * Zurück kommt, was das Portal sagt, und nie der Token. Ein Portal, das nicht
 * antwortet, ist kein ungültiger Token: das steht dann als `reachable: false`
 * da, und die Entscheidung bleibt beim Menschen.
 */
export async function checkToken(token, base = portalBase()) {
  const url = new URL("/api/download", base);
  url.searchParams.set("token", token);
  url.searchParams.set("pruefen", "1");
  let response;
  try {
    response = await fetch(url, { headers: { Accept: "application/json" } });
  } catch (error) {
    return {
      ok: false,
      reachable: false,
      status: null,
      message: t(
        `The portal at ${base} does not answer: ${error.message}`,
        `Das Portal unter ${base} antwortet nicht: ${error.message}`
      ),
    };
  }
  const text = await response.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }
  if (!data || typeof data !== "object") {
    return {
      ok: false,
      reachable: true,
      status: response.status,
      message: t(
        `The portal answers with status ${response.status}, but not with the expected answer.`,
        `Das Portal antwortet mit Status ${response.status}, aber nicht mit der erwarteten Antwort.`
      ),
    };
  }
  if (data.ok === true) {
    return {
      ok: true,
      reachable: true,
      status: response.status,
      type: data.typ || null,
      artifact: data.artefakt || null,
      message: t(
        `The portal confirms the token${data.typ ? ` (type ${data.typ})` : ""}${data.artefakt ? `, artifact ${data.artefakt}` : ""}.`,
        `Das Portal bestätigt den Token${data.typ ? ` (Typ ${data.typ})` : ""}${data.artefakt ? `, Artefakt ${data.artefakt}` : ""}.`
      ),
    };
  }
  return {
    ok: false,
    reachable: true,
    status: response.status,
    error: data.fehler || null,
    message:
      t("The portal refuses the token", "Das Portal lehnt den Token ab") +
      `${data.fehler ? ` (${data.fehler})` : ""}${data.meldung ? `: ${data.meldung}` : "."}`,
  };
}

/**
 * Die Sätze zum Kaufweg, in der Sprache des Profils. Keine Werbung: was ein
 * Konto bringt, was weitere Geräte kosten, wo es das gibt.
 */
export function buyLines() {
  return t(
    [
      `Account and token: ${BUY_URL}`,
      "An account is free of charge and brings exactly one free device token for personal use.",
      "Every further installation is bought. Commercial use needs the licence, 3,000 euros net.",
      "The token looks like ara_ followed by 32 characters. Paste it here as it is, the kit checks",
      "it with the portal and stores it. It never appears on a command line and is never displayed.",
    ],
    [
      `Konto und Token: ${BUY_URL}`,
      "Ein Konto ist kostenlos und bringt genau einen kostenlosen Geräte-Token für den persönlichen Gebrauch.",
      "Jede weitere Installation wird gekauft. Kommerzieller Einsatz braucht die Lizenz, 3.000 Euro netto.",
      "Der Token sieht aus wie ara_ und 32 Zeichen dahinter. Füg ihn hier so ein, wie er ist, das Kit prüft",
      "ihn beim Portal und hinterlegt ihn. Er steht nie auf einer Befehlszeile und wird nie angezeigt.",
    ]
  );
}

/** Der Aufruf, mit dem der eingefügte Token hineinkommt. Über die Leitung, nicht als Argument. */
export const STORE_CALL = "printf '%s' \"$TOKEN\" | node .ara/tools/device.mjs --licence --store";

/**
 * Welche Akten es gibt, mit Urteil und Stand von Arasul, damit die Frage „auf
 * welches Gerät?" aus den Akten kommt und nicht aus dem Kopf.
 */
export function knownDevices() {
  const out = [];
  const add = (customer, name) => {
    const { fields } = readFrontmatter(join(devicePath(customer, name), "device.md"));
    out.push({
      customer,
      name,
      place: customer ? `${customer}/${name}` : name,
      verdict: fields.verdict || "",
      arasul: fields.arasul || "",
      call: `node .ara/tools/device.mjs --name ${name}${customer ? ` --customer ${customer}` : ""} --install arasul`,
    });
  };
  for (const name of listDevices(null)) add(null, name);
  for (const customer of listCustomers()) for (const name of listDevices(customer)) add(customer, name);
  return out;
}

/** Die Akten, auf die eine Installation passt: unterstützt, und Arasul läuft dort nicht. */
export function installTargets(devices = knownDevices()) {
  return devices.filter((d) => d.verdict === "supported" && d.arasul !== "running");
}
