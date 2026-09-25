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
 *     für den persönlichen Gebrauch. Jede weitere Installation und der
 *     kommerzielle Einsatz werden dort gekauft. Was das kostet, steht auf der
 *     Seite und nicht im Kit: ein Preis hier wäre der erste, der veraltet.
 *   - Der Token hat die Form ara_ und 32 Hexzeichen.
 *   - Geprüft wird er mit GET /api/download?token=<token>&pruefen=1. Die Antwort
 *     ist {ok:true,typ:"device",artefakt:"bereit"}; ein falscher Token gibt
 *     ok:false mit fehler token_ungueltig und einer Meldung, die auf den Kaufweg
 *     zeigt. Ohne pruefen=1 kommt das tar.gz, und das holt mirror.mjs.
 *
 * Der Token geht nie auf eine Befehlszeile. Er kommt über die Standardeingabe
 * und liegt danach in der Geheimnis-Ablage, unter ARASUL_TOKEN. Ausgegeben wird
 * er nirgends.
 *
 * Seit dem 25.09.2026 (K21) ist ein bezahlter Token zugleich der Lizenzcode.
 * Das Kit tauscht ihn beim Portal gegen eine Lizenz, die an den Fingerabdruck
 * des Geräts gebunden ist, und spielt sie dort ein. Die Verträge dazu stehen
 * nicht hier, sondern in den beiden Repos, die sie liefern:
 *
 *   - arasul-website, apps/web/docs/api-license.md: POST /api/license/issue mit
 *     {token, fingerprint}, 200 {license, tier, customer}, sonst JSON mit
 *     `fehler`: anfrage_ungueltig 400, token_unbekannt 401, nicht_bezahlt 403,
 *     anderes_geraet 409, zu_viele_anfragen 429, dienst_aus 503.
 *   - arasul-jet, scripts/util/lizenz-geraet.sh: fingerabdruck, status,
 *     einspielen (Lizenz auf STDIN), je genau eine Zeile JSON.
 *
 * Ein kostenloser Token ist dabei kein Fehler. Das Portal sagt nicht_bezahlt,
 * und das Gerät bleibt auf community, mit den Grenzen, die es selbst meldet.
 * Weder Token noch Lizenz stehen je in einer Ausgabe, einer Akte oder einem
 * Argument.
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
      "Every further installation and commercial use are bought there. What that costs stands on the page.",
      "A bought token is at the same time the licence code: after the installation the kit unlocks the device with it.",
      "The token looks like ara_ followed by 32 characters. Paste it here as it is, the kit checks",
      "it with the portal and stores it. It never appears on a command line and is never displayed.",
    ],
    [
      `Konto und Token: ${BUY_URL}`,
      "Ein Konto ist kostenlos und bringt genau einen kostenlosen Geräte-Token für den persönlichen Gebrauch.",
      "Jede weitere Installation und der kommerzielle Einsatz werden dort gekauft. Was das kostet, steht auf der Seite.",
      "Ein gekaufter Token ist zugleich der Lizenzcode: nach der Installation schaltet das Kit das Gerät damit frei.",
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

// --- Die Freischaltung --------------------------------------------------------

/** Die Route, an der das Portal einen Lizenzcode gegen eine Lizenz tauscht. */
export const ISSUE_PATH = "/api/license/issue";

/**
 * Was das Kit auf jeden `fehler` des Portals tut, nach der Tabelle im Kontrakt.
 * `again` ist der Aufruf, mit dem es noch einmal geht.
 */
function portalAdvice(error, again) {
  switch (error) {
    case "anfrage_ungueltig":
      return t(
        "Check the code: ara_ followed by 32 characters, as the portal shows it.",
        "Prüf den Code: ara_ und 32 Zeichen, so wie das Portal ihn zeigt."
      );
    case "token_unbekannt":
      return t(
        `The portal knows no such code. It stands in the portal under licences, or at ${BUY_URL}.`,
        `Das Portal kennt diesen Code nicht. Er steht im Portal unter Lizenzen, oder unter ${BUY_URL}.`
      );
    case "anderes_geraet":
      return t(
        "This code is bound to another device. Whoever owns it releases it in the portal under licences, " +
          `"Gerätewechsel freigeben". Then again: ${again}. If this device has a code of its own, that one: ` +
          `printf '%s' "$CODE" | ${again} --pipe`,
        "Dieser Code ist an ein anderes Gerät gebunden. Wer ihn besitzt, gibt ihn im Portal frei, unter Lizenzen, " +
          `„Gerätewechsel freigeben". Danach noch einmal: ${again}. Gehört zu diesem Gerät ein eigener Code, dann der: ` +
          `printf '%s' "$CODE" | ${again} --pipe`
      );
    case "zu_viele_anfragen":
      return t(`Too many requests. Wait a minute, then again: ${again}`, `Zu viele Anfragen. Eine Minute warten, dann noch einmal: ${again}`);
    case "dienst_aus":
      return t(
        `The portal cannot issue a licence right now. Later again: ${again}`,
        `Das Portal kann gerade keine Lizenz ausstellen. Später noch einmal: ${again}`
      );
    default:
      return t(`Again, once the cause is clear: ${again}`, `Noch einmal, wenn der Grund klar ist: ${again}`);
  }
}

/**
 * Tauscht den Lizenzcode beim Portal gegen eine Lizenz.
 *
 * Zurück kommt die Lizenz nur im Feld `licence`, und das verlässt dieses Modul
 * nur Richtung Gerät. Ein Portal, das nicht antwortet, ist kein abgelehnter Code.
 */
export async function issueLicence(token, fingerprint, base = portalBase()) {
  const url = new URL(ISSUE_PATH, base);
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ token, fingerprint }),
    });
  } catch (error) {
    return {
      ok: false,
      reachable: false,
      status: null,
      error: null,
      message: t(`The portal at ${base} does not answer: ${error.message}`, `Das Portal unter ${base} antwortet nicht: ${error.message}`),
    };
  }
  let data = null;
  try {
    data = JSON.parse(await response.text());
  } catch {
    data = null;
  }
  if (response.ok && data && typeof data.license === "string" && data.license) {
    return { ok: true, reachable: true, status: response.status, licence: data.license, tier: data.tier || null, customer: data.customer || null };
  }
  const error = data && typeof data.fehler === "string" ? data.fehler : null;
  return {
    ok: false,
    reachable: true,
    status: response.status,
    error,
    meldung: data?.meldung || "",
    message: error
      ? t(`The portal refuses (${error}, status ${response.status})`, `Das Portal lehnt ab (${error}, Status ${response.status})`) +
        (data?.meldung ? `: ${data.meldung}` : ".")
      : t(
          `The portal answers with status ${response.status}, but not with a licence.`,
          `Das Portal antwortet mit Status ${response.status}, aber nicht mit einer Lizenz.`
        ),
  };
}

/** Die eine Zeile JSON, die lizenz-geraet.sh ausgibt: die letzte, wie der Vertrag sagt. */
export function deviceAnswer(run) {
  const last = String(run?.stdout || "").trim().split("\n").pop() || "";
  try {
    const data = JSON.parse(last);
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

/**
 * Ein Gerät freischalten: Fingerabdruck, Portal, einspielen, Stand.
 *
 * `run(befehl, eingabe)` führt lizenz-geraet.sh am Gerät aus, siehe
 * lib/install.mjs. `token` ist der Lizenzcode oder null. `again` ist der Aufruf
 * für einen zweiten Versuch, er steht in den Ratschlägen.
 *
 * Das Ergebnis trägt weder Token noch Lizenz. `outcome` ist die Stufe, die das
 * Gerät danach meldet, oder `failed`; `reason` sagt, warum es community blieb:
 * `no_code` (kein Code da) oder `not_paid` (das Portal sagt nicht_bezahlt).
 */
export async function unlock({ run, token, again, base = portalBase() }) {
  const secrets = [token].filter(Boolean);
  const hide = (text) => {
    let out = String(text || "");
    for (const s of secrets) out = out.split(s).join("…");
    return out;
  };
  const result = { ok: false, outcome: "failed", reason: null, step: null, tier: null, customer: null, usage: null, portal: null, message: "" };
  const readUsage = () => {
    const status = deviceAnswer(run("status"));
    if (status && status.stufe) {
      result.tier = status.stufe;
      result.usage = { accounts: status.konten || null, apps: status.apps || null };
    }
    return status;
  };

  const print = deviceAnswer(run("fingerabdruck"));
  if (!print || typeof print.fingerabdruck !== "string" || !print.fingerabdruck) {
    result.step = "fingerprint";
    result.message = t(
      `The device gave no fingerprint: ${hide(print?.fehler) || "no answer"}.`,
      `Das Gerät hat keinen Fingerabdruck gegeben: ${hide(print?.fehler) || "keine Antwort"}.`
    );
    return result;
  }

  if (!token) {
    readUsage();
    return { ...result, ok: true, outcome: result.tier || "community", reason: "no_code" };
  }

  const issued = await issueLicence(token, print.fingerabdruck, base);
  result.portal = { status: issued.status, error: issued.error || null, reachable: issued.reachable };
  if (!issued.ok) {
    if (issued.error === "nicht_bezahlt") {
      readUsage();
      return { ...result, ok: true, outcome: result.tier || "community", reason: "not_paid", message: hide(issued.meldung) };
    }
    result.step = "portal";
    result.message = `${hide(issued.message)} ${portalAdvice(issued.error, again)}`;
    return result;
  }
  secrets.push(issued.licence);
  result.customer = issued.customer;

  const installed = deviceAnswer(run("einspielen", issued.licence));
  if (!installed || installed.ok !== true) {
    result.step = "install";
    result.message = t(
      `The device refused the licence: ${hide(installed?.fehler) || "no answer"}. Nothing changed on it. Again: ${again}`,
      `Das Gerät hat die Lizenz abgelehnt: ${hide(installed?.fehler) || "keine Antwort"}. Geändert hat sich dort nichts. Noch einmal: ${again}`
    );
    return result;
  }
  readUsage();
  result.tier = result.tier || installed.stufe || null;
  return { ...result, ok: true, outcome: result.tier || installed.stufe || "failed" };
}

/** Eine Grenze, wie das Gerät sie meldet. -1 heißt unbegrenzt. */
function limitText(pair) {
  if (!pair || typeof pair !== "object") return t("not read", "nicht gelesen");
  const used = pair.belegt ?? "?";
  if (pair.grenze === -1) return t(`${used} in use, no limit`, `${used} belegt, ohne Grenze`);
  return t(`${used} of ${pair.grenze}`, `${used} von ${pair.grenze}`);
}

/**
 * Die Zeilen zum Stand der Lizenz, aus dem, was das Gerät meldet. Die Grenzen
 * kommen vom Gerät und nicht aus dem Kit: das Kit kennt die Stufen, der Wert
 * gehört dem Produkt.
 */
export function unlockLines(result, { place, again }) {
  if (!result.ok) {
    return [t(`- Licence: not unlocked. ${result.message}`, `- Lizenz: nicht freigeschaltet. ${result.message}`)];
  }
  const usage = result.usage
    ? t(
        `Accounts ${limitText(result.usage.accounts)}, apps ${limitText(result.usage.apps)}.`,
        `Konten ${limitText(result.usage.accounts)}, Apps ${limitText(result.usage.apps)}.`
      )
    : t("The limits stayed unread.", "Die Grenzen blieben ungelesen.");
  if (result.outcome !== "community") {
    return [
      t(
        `- Licence: ${place} is unlocked, level ${result.outcome}${result.customer ? `, for ${result.customer}` : ""}. ${usage}`,
        `- Lizenz: ${place} ist freigeschaltet, Stufe ${result.outcome}${result.customer ? `, für ${result.customer}` : ""}. ${usage}`
      ),
    ];
  }
  const accounts = result.usage?.accounts?.grenze;
  const apps = result.usage?.apps?.grenze;
  const what =
    accounts !== undefined && apps !== undefined
      ? t(
          `Community means: this device carries up to ${accounts} accounts and ${apps} apps, without a licence and without an end date.`,
          `Community heißt: dieses Gerät trägt bis zu ${accounts} Konten und ${apps} Apps, ohne Lizenz und ohne Ablauf.`
        )
      : t(
          "Community means: this device runs without a licence, with a limit on accounts and apps that it did not report this time.",
          "Community heißt: dieses Gerät läuft ohne Lizenz, mit einer Grenze bei Konten und Apps, die es diesmal nicht gemeldet hat."
        );
  const why =
    result.reason === "not_paid"
      ? t("The code is a free one, so the device stays on community.", "Der Code ist ein kostenloser, also bleibt das Gerät auf community.")
      : t("No licence code was handed in, so the device stays on community.", "Es wurde kein Lizenzcode übergeben, also bleibt das Gerät auf community.");
  return [
    t(`- Licence: ${place} runs on community. ${why} ${usage}`, `- Lizenz: ${place} läuft auf community. ${why} ${usage}`),
    `  ${what}`,
    t(
      `  A bought code lifts both limits. It comes from ${BUY_URL}; ask through the interview tool whether there is one, ` +
        `and hand it in over the pipe: printf '%s' "$CODE" | ${again} --pipe`,
      `  Ein gekaufter Code hebt beide Grenzen auf. Es gibt ihn unter ${BUY_URL}; frag über das Interview-Werkzeug, ob es einen gibt, ` +
        `und gib ihn über die Leitung hinein: printf '%s' "$CODE" | ${again} --pipe`
    ),
  ];
}
