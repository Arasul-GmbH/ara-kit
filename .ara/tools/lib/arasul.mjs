/**
 * Die Schnittstelle eines Arasul-Geräts, von außen.
 *
 * Ein Gerät nimmt Apps über `/api/v1/external/` entgegen, mit einem
 * Schlüssel in der Kopfzeile statt einer Sitzung. Dieses Modul spricht sie an
 * und tut sonst nichts: **kein Pfad und kein Wert des Produkts steht hier**,
 * beides kommt aus dem Kontrakt (`lib/contract.mjs`) oder aus der Geräteakte.
 *
 * Der Schlüssel steht nur in der Kopfzeile. Er geht nie als Argument an einen
 * anderen Prozess, er wird nie ausgegeben und er landet nie in einem Protokoll.
 */

import { createReadStream, statSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

/** Kopfzeile für den Schlüssel, solange der Kontrakt noch nicht gelesen ist. */
const DEFAULT_KEY_HEADER = "X-API-Key";

const TLS_HINTS = new Set([
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "ERR_TLS_CERT_ALTNAME_INVALID",
  "CERT_HAS_EXPIRED",
]);

/** Die Adresse aus der Geräteakte wird eine Basis-URL. Ohne Vorsatz gilt https. */
export function baseUrl(address) {
  const text = String(address || "").trim();
  if (!text) throw new Error("Ohne Adresse in der Geräteakte gibt es keine Schnittstelle.");
  if (/^https?:\/\//i.test(text)) return text.replace(/\/+$/, "");
  return `https://${text.replace(/\/+$/, "")}`;
}

function fehler(error, url) {
  if (TLS_HINTS.has(error.code)) {
    return new Error(
      `Das Zertifikat von ${url} ist nicht überprüfbar (${error.code}).\n` +
        "Ein Gerät im Kundennetz hat meist ein selbst ausgestelltes. Wenn du weißt, dass es\n" +
        "dieses Gerät ist, trag `tls: selfsigned` in seine Akte ein oder gib einmalig --insecure an."
    );
  }
  if (error.code === "ECONNREFUSED" || error.code === "EHOSTUNREACH" || error.code === "ENOTFOUND") {
    return new Error(
      `${url} antwortet nicht (${error.code}). Läuft die Plattform, stimmt die Adresse in der Akte?`
    );
  }
  if (error.code === "ETIMEDOUT" || error.message === "zeit") {
    return new Error(`${url} hat nicht in der vorgesehenen Zeit geantwortet.`);
  }
  return new Error(`${url}: ${error.message}`);
}

/**
 * Ein Aufruf an das Gerät.
 *
 * `json` schickt einen Rumpf, `file` schickt ein Archiv als Multipart. Beides
 * zusammen gibt es nicht. Zurück kommt immer die Statusnummer, dazu `data` aus
 * dem Umschlag des Geräts oder `error` mit dessen Begründung im Klartext.
 */
export async function call({
  base,
  key,
  method = "GET",
  path,
  json = null,
  file = null,
  fileField = "paket",
  fileName = "paket.tgz",
  keyHeader = DEFAULT_KEY_HEADER,
  insecure = false,
  timeout = 600_000,
}) {
  const url = new URL(path, base.endsWith("/") ? base : `${base}/`);
  const secure = url.protocol === "https:";
  const send = secure ? httpsRequest : httpRequest;

  const headers = { Accept: "application/json" };
  if (key) headers[keyHeader] = key;

  let body = null;
  let boundary = null;
  if (json) {
    body = Buffer.from(JSON.stringify(json));
    headers["Content-Type"] = "application/json";
    headers["Content-Length"] = body.length;
  } else if (file) {
    boundary = `----ara${randomBytes(12).toString("hex")}`;
    const head = Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${fileField}"; filename="${fileName}"\r\n` +
        "Content-Type: application/gzip\r\n\r\n"
    );
    const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
    headers["Content-Type"] = `multipart/form-data; boundary=${boundary}`;
    headers["Content-Length"] = head.length + statSync(file).size + tail.length;
    boundary = { head, tail };
  }

  const options = {
    method,
    headers,
    // Nur, wenn der Mensch es für dieses Gerät entschieden hat. Der Aufruf
    // gilt genau für diese Anfrage und nicht für den ganzen Prozess.
    ...(secure && insecure ? { rejectUnauthorized: false } : {}),
  };

  return new Promise((done, failed) => {
    const req = send(url, options, (res) => {
      const parts = [];
      res.on("data", (chunk) => parts.push(chunk));
      res.on("end", () => {
        const raw = Buffer.concat(parts).toString("utf8");
        let parsed = null;
        try {
          parsed = raw ? JSON.parse(raw) : null;
        } catch {
          /* manche Fehler antworten als Text, das ist in Ordnung */
        }
        done({
          status: res.statusCode,
          ok: res.statusCode >= 200 && res.statusCode < 300,
          data: parsed?.data ?? null,
          error: parsed?.error ?? (parsed ? null : raw.trim() ? { message: raw.trim().slice(0, 400) } : null),
          raw,
        });
      });
    });

    req.setTimeout(timeout, () => req.destroy(new Error("zeit")));
    req.on("error", (error) => failed(fehler(error, url.origin)));

    if (body) {
      req.end(body);
    } else if (file) {
      req.write(boundary.head);
      const stream = createReadStream(file);
      stream.on("error", (error) => req.destroy(error));
      stream.on("end", () => req.end(boundary.tail));
      stream.pipe(req, { end: false });
    } else {
      req.end();
    }
  });
}

/** Die Begründung des Geräts in einem Satz. Es begründet im Klartext, das ist wertvoller als eine Nummer. */
export function reason(answer) {
  const message = answer?.error?.message || `Das Gerät antwortet mit Status ${answer?.status}.`;
  const details = answer?.error?.details;
  if (!details) return message;
  const text = typeof details === "string" ? details : JSON.stringify(details);
  return `${message}\n${text.slice(0, 1200)}`;
}
