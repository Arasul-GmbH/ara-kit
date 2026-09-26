/**
 * Die Wege eines Administrators, eine App einem Konto freizugeben.
 *
 * Bis 0.43.0 hatte das Kit dafür keinen Befehl. Die App-Bau-Probe am
 * 26.09.2026 stand genau hier: ein Fremder sollte eine App für die Abnahme
 * einem Kollegen freigeben, fand die Wege in der API-Referenz des Geräts, 3.443
 * Zeilen, und ließ den Stand weg. Ohne Stand fällt die Freigabe auf live, und
 * der Kollege sah vom Teststand nichts.
 *
 * **Hier steht kein Weg des Produkts.** Die Freigabe ist ein Weg der
 * Verwaltung, nicht der äußeren Schnittstelle, und der Kontrakt nennt sie
 * heute nicht. Also liest das Kit sie dort, wo das Produkt sie beschreibt: in
 * den Endpunkten des Kontrakts, wenn er sie einmal nennt, sonst in der
 * API-Referenz, die am Gerät und im Spiegel liegt. Eine Zeile dort sieht so aus:
 *
 *   | POST | `/weg` | Was er tut: `{ feld_a, feld_b, feld_c? }`; ... |
 *
 * Gesucht wird nach dem, was ein Weg tut, nicht nach seinem Namen: freigeben
 * ist der POST, dessen Rumpf eine App und ein Konto nennt; die Konten liest der
 * GET, dessen Name zu diesem Konto-Feld gehört; zurückgenommen wird mit dem
 * DELETE unter dem Weg des Freigebens. Findet sich einer davon nicht, sagt das
 * Werkzeug das, statt einen zu raten.
 *
 * Reine Funktionen, ohne Netz und ohne Dateien, damit der Selbsttest sie mit
 * erfundenem Text prüfen kann.
 */

import { t } from "./i18n.mjs";

const VERBS = "GET|POST|PUT|PATCH|DELETE";

/** Eine Zeile einer Markdown-Tabelle, die einen Weg beschreibt. */
const ROW = new RegExp(`^\\|\\s*(${VERBS})\\s*\\|\\s*\`([^\`]+)\`\\s*\\|(.*)$`);

/** Ein Name, wie er in einem Rumpf oder einer Liste steht. */
const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Die Felder, die eine Beschreibung nennt.
 *
 * `rumpf` sind die aus dem ersten `{ ... }`, mit `?` für die freiwilligen;
 * `liste` alle Namen aus Anführungen, die wie eine Aufzählung aussehen, etwa
 * `id, username, email`. Typangaben hinter einem Doppelpunkt fallen weg.
 */
export function fieldsOf(text) {
  const rumpf = [];
  const freiwillig = [];
  const klammer = String(text).match(/`\{([^}`]*)\}`/);
  if (klammer) {
    for (const teil of klammer[1].split(",")) {
      const name = teil.split(":")[0].trim();
      const frei = name.endsWith("?");
      const rein = name.replace(/\?$/, "").trim();
      if (!IDENT.test(rein)) continue;
      rumpf.push(rein);
      if (frei) freiwillig.push(rein);
    }
  }
  const liste = [];
  for (const [, inhalt] of String(text).matchAll(/`([^`{}]+)`/g)) {
    for (const teil of inhalt.split(",")) {
      const name = teil.trim();
      if (IDENT.test(name)) liste.push(name);
    }
  }
  return { rumpf, freiwillig, liste };
}

/** Die Wege aus einer API-Referenz in Markdown, je Tabellenzeile einer. */
export function routeRows(markdown) {
  const rows = [];
  for (const zeile of String(markdown).split(/\r?\n/)) {
    const treffer = zeile.match(ROW);
    if (!treffer) continue;
    const text = treffer[3].replace(/\|\s*$/, "").trim();
    rows.push({ verb: treffer[1], path: treffer[2].trim(), text, ...fieldsOf(text) });
  }
  return rows;
}

/** Die Wege aus den Endpunkten des Kontrakts, in derselben Form. */
export function contractRows(contract) {
  return (Array.isArray(contract?.endpunkte) ? contract.endpunkte : [])
    .filter((e) => typeof e?.verb === "string" && typeof e?.pfad === "string")
    .map((e) => ({ verb: e.verb.toUpperCase(), path: e.pfad, text: String(e.was ?? ""), ...fieldsOf(e.was ?? "") }));
}

/** Die Platzhalter eines Weges, `:name` oder `<name>`, in ihrer Reihenfolge. */
export function placeholders(path) {
  return [...String(path).matchAll(/[:<]([A-Za-z_][A-Za-z0-9_]*)>?/g)].map((m) => m[1]);
}

const isApp = (name) => /^app(_?id)?$/i.test(name);
const isAccountRef = (name) => /_id$/i.test(name) && !isApp(name);
const isSlot = (name) => /^(stand|slot|stage)$/i.test(name);
const isUserName = (name) => /^(username|benutzername|login|name)$/i.test(name);
const lastPart = (path) => String(path).split("?")[0].replace(/\/+$/, "").split("/").pop();

/**
 * Die drei Wege zum Freigeben, oder was fehlt.
 *
 * Zurück kommt `{ ways, missing }`: `ways.share` mit den Feldnamen für App,
 * Konto und Stand, `ways.accounts` mit dem Feld, das den Namen eines Kontos
 * trägt, `ways.revoke` mit seinen Platzhaltern. `missing` sind Sätze für den
 * Menschen, einer je Weg, der sich nicht fand.
 */
export function shareWays(rows) {
  const missing = [];
  const kandidaten = rows
    .filter((r) => r.verb === "POST" && placeholders(r.path).length === 0)
    .filter((r) => r.rumpf.some(isApp) && r.rumpf.some(isAccountRef))
    .sort((a, b) => Number(b.rumpf.some(isSlot)) - Number(a.rumpf.some(isSlot)) || a.rumpf.length - b.rumpf.length);
  const teilen = kandidaten[0] || null;
  if (!teilen) {
    missing.push(t("a POST whose body names an app and an account (share)", "einen POST, dessen Rumpf eine App und ein Konto nennt (freigeben)"));
    return { ways: null, missing };
  }
  const kontoFeld = teilen.rumpf.find(isAccountRef);
  const share = {
    verb: "POST",
    path: teilen.path,
    app: teilen.rumpf.find(isApp),
    account: kontoFeld,
    slot: teilen.rumpf.find(isSlot) || null,
    text: teilen.text,
  };

  // Die Konten: der GET, dessen letztes Stück zum Konto-Feld gehört
  // (`konto` zu `konto_id`), sonst einer, der eine Kennung und einen Namen listet.
  const stamm = kontoFeld.replace(/_id$/i, "");
  const gets = rows.filter((r) => r.verb === "GET" && placeholders(r.path).length === 0 && !r.path.includes("?"));
  const konten =
    gets.find((r) => lastPart(r.path).toLowerCase() === stamm.toLowerCase() && r.liste.includes("id")) ||
    gets.find((r) => r.liste.includes("id") && r.liste.some(isUserName) && !r.liste.some(isApp));
  let accounts = null;
  if (!konten) {
    missing.push(
      t(
        `a GET that lists the accounts with id and name (for \`${kontoFeld}\`)`,
        `einen GET, der die Konten mit Kennung und Namen listet (zu \`${kontoFeld}\`)`
      )
    );
  }
  else accounts = { verb: "GET", path: konten.path, id: "id", name: konten.liste.find(isUserName) || null };
  if (accounts && !accounts.name) missing.push(t(`the name of an account in the list of ${konten.path}`, `den Namen eines Kontos in der Liste von ${konten.path}`));

  // Zurücknehmen: der DELETE unter dem Weg des Freigebens, mit App und Konto im Weg.
  const loeschen = rows.find(
    (r) => r.verb === "DELETE" && r.path.startsWith(`${teilen.path.replace(/\/+$/, "")}/`) && placeholders(r.path).length === 2
  );
  let revoke = null;
  if (loeschen) {
    const namen = placeholders(loeschen.path);
    const appAn = namen.findIndex((n) => /app/i.test(n));
    revoke = appAn < 0 ? null : { verb: "DELETE", path: loeschen.path, app: namen[appAn], account: namen[1 - appAn] };
  }
  if (!revoke) {
    missing.push(
      t(
        "a DELETE below the way of sharing, with app and account in the way (revoke)",
        "einen DELETE unter dem Weg des Freigebens, mit App und Konto im Weg (zurücknehmen)"
      )
    );
  }

  return { ways: { share, accounts, revoke }, missing };
}

/** Ein Weg mit Werten statt Platzhaltern. */
export function fillPath(path, values) {
  return String(path).replace(/[:<]([A-Za-z_][A-Za-z0-9_]*)>?/g, (ganz, name) =>
    name in values ? encodeURIComponent(String(values[name])) : ganz
  );
}

/** Eine Liste aus einer Antwort, unter `data` oder als Antwort selbst. */
export function listOf(answer) {
  if (Array.isArray(answer)) return answer;
  for (const key of ["data", "benutzer", "users", "konten", "items"]) {
    if (Array.isArray(answer?.[key])) return answer[key];
    if (answer?.[key] && typeof answer[key] === "object") {
      const inner = listOf(answer[key]);
      if (inner.length) return inner;
    }
  }
  return [];
}
