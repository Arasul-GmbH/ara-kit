/**
 * Der Kit-Schlüssel über die Schnittstelle des Geräts, mit der Sitzung eines Administrators.
 *
 * Bis 0.74.0 entstand der Kit-Schlüssel nur über SSH: ein Skript am Gerät legte ihn an. Der
 * Fremdtest vom 06.10.2026 stand vor einem Gerät, das SSH nur über einen Tunnel und nicht für sein
 * Konto erlaubte. `--deploy-key` ging nicht, und den Weg über die Schnittstelle fand er erst in der
 * API-Referenz des Geräts, nach zwei Fehlversuchen, die zwei Schlüssel liegen ließen. Ein Mensch,
 * der Apps baut, hat ein Konto als Administrator, aber selten SSH.
 *
 * **Der Klartext geht nur in die Ablage.** Das Gerät zeigt einen neuen Schlüssel genau einmal, in
 * der Antwort auf das Anlegen. Diese Antwort wird hier gelesen und sonst nirgends hingegeben: keine
 * Ausgabe, kein Protokoll, kein Rückgabewert außer an den, der ihn ablegt. Lässt er sich nicht
 * ablegen, widerruft das Kit ihn sofort, statt einen gültigen Schlüssel liegen zu lassen, den
 * niemand kennt.
 *
 * Die Wege sind dieselben, die `lib/upgrade-api.mjs` für den Schlüssel eines Anlasses nimmt. Am
 * 06.10.2026 am Orin vom Fremdtest benutzt (Schlüssel 667 bis 669) und in der Quelle der Plattform
 * nachgelesen: das Gerät listet und widerruft nur Schlüssel, die dasselbe Konto angelegt hat.
 *
 * Reine Funktionen über einem Aufruf `ask(method, path, options)`, damit der Selbsttest sie gegen
 * ein gespieltes Gerät prüft.
 */

import { t } from "./i18n.mjs";
import { reason } from "./arasul.mjs";

export const KEY_WAYS = Object.freeze({
  create: ["POST", "/api/v1/external/api-keys"],
  list: ["GET", "/api/v1/external/api-keys"],
  revoke: (id) => ["DELETE", `/api/v1/external/api-keys/${encodeURIComponent(String(id))}`],
});

/** Der Bereich des Kit-Schlüssels. Wer Apps einspielen darf, darf damit nichts anderes. */
export const KIT_SCOPE = "app:deploy";

function asList(answer) {
  const list = answer?.body?.api_keys ?? answer?.data?.api_keys ?? answer?.data ?? [];
  return Array.isArray(list) ? list : [];
}

/**
 * Eine Zeile der Liste, wie das Gerät sie liefert, für einen Menschen. Nur Präfix, Name, Stand,
 * Bereiche und Zeiten: einen Klartext führt die Liste nicht, und das Kit setzt keinen dazu.
 */
function keyLine(entry) {
  const active = entry.is_active !== false && !(entry.expires_at && Date.parse(entry.expires_at) < Date.now());
  const scopes = Array.isArray(entry.allowed_endpoints) ? entry.allowed_endpoints.join(",") : "";
  return [
    active ? t("valid", "gültig") : t("revoked", "widerrufen"),
    entry.key_prefix || "?",
    `"${entry.name || ""}"`,
    scopes ? `[${scopes}]` : "",
    entry.last_used_at ? t(`used ${String(entry.last_used_at).slice(0, 10)}`, `benutzt ${String(entry.last_used_at).slice(0, 10)}`) : t("never used", "nie benutzt"),
  ]
    .filter(Boolean)
    .join("  ");
}

/**
 * Die Schlüssel, die dieses Konto am Gerät angelegt hat, und welcher davon der hinterlegte ist.
 * Erkannt am Präfix: er ist der Anfang des Schlüssels in der Ablage. Namen wiederholen sich,
 * Präfixe nicht.
 */
export async function listKeysApi(ask, stored = null) {
  const answer = await ask(...KEY_WAYS.list);
  if (!answer.ok) {
    return { ok: false, message: t(`The device gave no list of keys: ${reason(answer)}`, `Das Gerät hat keine Liste der Schlüssel geliefert: ${reason(answer)}`) };
  }
  const keys = asList(answer).map((entry) => {
    const mine = Boolean(stored && entry.key_prefix && stored.startsWith(entry.key_prefix));
    const valid = entry.is_active !== false && !(entry.expires_at && Date.parse(entry.expires_at) < Date.now());
    return {
      id: entry.id,
      prefix: entry.key_prefix || "",
      name: entry.name || "",
      scopes: Array.isArray(entry.allowed_endpoints) ? entry.allowed_endpoints : [],
      valid,
      mine,
      line: keyLine(entry),
    };
  });
  return { ok: true, keys, mine: keys.find((entry) => entry.mine && entry.valid) || keys.find((entry) => entry.mine) || null };
}

/**
 * Einen Kit-Schlüssel anlegen. Zurück kommt der Klartext genau einmal, für die Ablage, und
 * Präfix und Nummer für alles andere.
 */
export async function createKeyApi(ask, { name, description }) {
  const answer = await ask(...KEY_WAYS.create, { json: { name, description, allowed_endpoints: [KIT_SCOPE] } });
  const key = answer?.body?.api_key ?? answer?.data?.api_key ?? null;
  if (!answer.ok || typeof key !== "string" || !key) {
    return {
      ok: false,
      status: answer.status,
      message: answer.ok
        ? t("The device answered, but its answer holds no key.", "Das Gerät hat geantwortet, in der Antwort steht aber kein Schlüssel.")
        : t(`The device created no key: ${reason(answer)}`, `Das Gerät hat keinen Schlüssel angelegt: ${reason(answer)}`),
    };
  }
  return {
    ok: true,
    key,
    id: answer.body?.key_id ?? answer.data?.key_id ?? null,
    prefix: answer.body?.key_prefix ?? answer.data?.key_prefix ?? "?",
  };
}

export async function revokeKeyApi(ask, id) {
  const answer = await ask(...KEY_WAYS.revoke(id));
  return answer.ok
    ? { ok: true }
    : { ok: false, message: t(`The device did not revoke the key: ${reason(answer)}`, `Das Gerät hat den Schlüssel nicht widerrufen: ${reason(answer)}`) };
}

/** Feldnamen, unter denen ein Geheimnis stehen kann. Der Wert dahinter wird nie gezeigt. */
const SECRET_FIELD = /(^|_|-)(api_?key|key|token|access_token|refresh_token|jwt|bearer|secret|geheimnis|passwor[dt]|password|cookie|session|sitzung|ausweis|schluessel|schlüssel)$/i;

/**
 * Eine Antwort des Geräts, wie ein Mensch sie sehen darf: jeder Wert unter einem Namen, der ein
 * Geheimnis tragen kann, wird zu "…", in jeder Tiefe. Präfixe und Nummern bleiben, sie sind kein
 * Zugang. Gebraucht von `device.mjs --admin-call`, damit ein Aufruf mit der Sitzung nie die
 * Sitzung selbst oder einen neuen Schlüssel auf den Bildschirm bringt.
 */
export function maskSecrets(value, depth = 0) {
  if (depth > 12) return "…";
  if (Array.isArray(value)) return value.map((entry) => maskSecrets(entry, depth + 1));
  if (!value || typeof value !== "object") {
    // Ein Kit-Schlüssel oder ein Ausweis kann auch in einem Text stehen.
    return typeof value === "string" ? value.replace(/\baras_[A-Za-z0-9_-]{4,}/g, "aras_…").replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "…") : value;
  }
  const out = {};
  for (const [name, entry] of Object.entries(value)) {
    const prefixOrId = /prefix|präfix|_id$|^id$/i.test(name);
    if (prefixOrId && typeof entry !== "object") out[name] = entry;
    else out[name] = SECRET_FIELD.test(name) && ["string", "number"].includes(typeof entry) ? "…" : maskSecrets(entry, depth + 1);
  }
  return out;
}
