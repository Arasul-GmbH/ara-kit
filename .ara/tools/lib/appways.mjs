/**
 * Was eine App vom Gerät bekommt, und wie sie es erfährt.
 *
 * Eine App im Container weiß von sich aus nichts über das Gerät, auf dem sie
 * läuft. Sie braucht vier Dinge, und alle vier sind zwischen Kit und Produkt
 * vereinbart, stehen also im Kontrakt und nirgends sonst:
 *
 *   1. Unter welchem Namen das Gerät ihr die **Adresse** der Schnittstelle in
 *      den Container legt.
 *   2. Unter welchem Namen es ihr den **Schlüssel** hineinlegt.
 *   3. Wie die **Kopfzeile** heißt, in der dieser Schlüssel mitgeht.
 *   4. Welche **Wege** es dafür gibt: einen Flow starten, einen Lauf lesen,
 *      Freigaben lesen.
 *
 * Bis zum 29.08.2026 stand nichts davon im Kontrakt, sondern in der Vorlage:
 * `ARASUL_API_URL`, `ARASUL_API_SCHLUESSEL`, `x-api-key` und drei Pfade ohne
 * den Vorsatz der äußeren Schnittstelle, alle aus dem Kopf. Trifft eine solche
 * Vorlage auf ein Gerät, das seine Werte anders nennt, findet sie nichts, hält
 * das für „kein Arasul da" und legt den Vorgang ohne Lauf ab. Genau das war der
 * übersprungene Freigabe-Schritt.
 *
 * Deshalb steht hier die Mechanik und in der Vorlage kein einziger dieser
 * Werte. Das Kit liest sie beim Einspielen aus dem Kontrakt des Geräts und legt
 * sie der App als `arasul.json` ins Paket. Was es dort nicht findet, **sagt es**
 * und schreibt es nicht hin: eine App, die eine Vereinbarung errät, hält an
 * einer Stelle an, an der niemand nachsieht.
 *
 * Die drei Wege nennt das Kit selbst, so wie es die Wege für Pakete und Stände
 * selbst nennt, und ruft sie nur, wenn das Gerät sie in seinem Kontrakt führt.
 * `findEndpoint` entscheidet das, nicht diese Datei.
 *
 * Reine Funktionen, ohne Netz und ohne Dateien, damit der Selbsttest sie mit
 * einem erfundenen Kontrakt prüfen kann.
 */

import { findEndpoint } from "./contract.mjs";
import { EXTERNAL_PREFIX } from "./docroutes.mjs";
import { t } from "./i18n.mjs";

/** Der Name der Datei, in der die Vereinbarung im Paket liegt. */
export const ARRANGEMENT_FILE = "arasul.json";

/**
 * Die Wege, die eine App aus der Vorlage geht.
 *
 * Der Vorsatz kommt aus dem einen Pfad, den das Kit auswendig kennt, und
 * wandert mit ihm. In geschweiften Klammern steht, was die App zur Laufzeit
 * einsetzt; für den Abgleich mit dem Kontrakt tritt eine Probe an ihre Stelle,
 * denn der Kontrakt schreibt dort seinen eigenen Platzhalter.
 */
export const APP_WAYS = Object.freeze([
  {
    key: "flow_starten",
    verb: "POST",
    pfad: `${EXTERNAL_PREFIX}/flows/{flow}/run`,
    was: t("start a flow", "einen Flow starten"),
  },
  {
    key: "lauf_lesen",
    verb: "GET",
    pfad: `${EXTERNAL_PREFIX}/flows/runs/{lauf}`,
    was: t("read a run", "einen Lauf lesen"),
  },
  {
    key: "freigaben_lesen",
    verb: "GET",
    pfad: `${EXTERNAL_PREFIX}/freigaben`,
    was: t("read the approvals of this app", "die Freigaben dieser App lesen"),
  },
]);

/** Ein Weg mit Werten statt Platzhaltern, für den Abgleich mit dem Kontrakt. */
function probed(pfad) {
  return pfad.replace(/\{[a-z_]+\}/g, "probe");
}

/**
 * Ein Name aus `umgebung`, wie der Kontrakt ihn schreibt.
 *
 * Erlaubt ist der Name selbst oder ein Eintrag, der ihn unter `name` führt.
 * Alles andere liest das Kit nicht, und dann sagt es das, statt sich etwas
 * zurechtzulegen.
 */
function envName(entry) {
  if (typeof entry === "string" && entry.trim()) return entry.trim();
  if (entry && typeof entry === "object" && typeof entry.name === "string" && entry.name.trim()) {
    return entry.name.trim();
  }
  return null;
}

/**
 * Die Vereinbarung zwischen diesem Gerät und einer App darauf.
 *
 * Zurück kommt beides: was gilt, und was das Gerät nicht verspricht. Der zweite
 * Teil ist der wichtigere. Er geht als Klartext an den Menschen, bevor
 * eingespielt wird, denn eine App, der ein Weg fehlt, sammelt danach Vorgänge,
 * die niemand sieht.
 */
export function appArrangement(contract, { device = null, date = null } = {}) {
  const missing = [];
  const umgebung = contract?.umgebung ?? null;
  const basis = envName(umgebung?.basis);
  const schluessel = envName(umgebung?.schluessel);

  if (!umgebung || typeof umgebung !== "object") {
    missing.push(
      t(
        "The contract of this device says nothing under `umgebung`. Then it is unknown under which names the device " +
          "puts the address of the interface and the key into the container, and an app finds neither.",
        "Der Kontrakt dieses Geräts sagt unter `umgebung` nichts. Dann ist unbekannt, unter welchen Namen das Gerät " +
          "der App die Adresse der Schnittstelle und den Schlüssel in den Container legt, und die App findet beides nicht."
      )
    );
  } else {
    if (!basis) {
      missing.push(
        t(
          "`umgebung.basis` is missing in the contract or is not a name. Without it an app does not know where its interface is.",
          "`umgebung.basis` fehlt im Kontrakt oder ist kein Name. Ohne ihn weiß eine App nicht, wo ihre Schnittstelle liegt."
        )
      );
    }
    if (!schluessel) {
      missing.push(
        t(
          "`umgebung.schluessel` is missing in the contract or is not a name. Without it an app does not find its key.",
          "`umgebung.schluessel` fehlt im Kontrakt oder ist kein Name. Ohne ihn findet eine App ihren Schlüssel nicht."
        )
      );
    }
  }

  const kopf = contract?.schluessel?.kopf || null;
  if (!kopf) {
    missing.push(
      t(
        "`schluessel.kopf` is missing in the contract. Without it an app does not know in which header its key travels.",
        "`schluessel.kopf` fehlt im Kontrakt. Ohne ihn weiß eine App nicht, in welcher Kopfzeile ihr Schlüssel mitgeht."
      )
    );
  }

  const wege = {};
  for (const way of APP_WAYS) {
    const entry = findEndpoint(contract, way.verb, probed(way.pfad));
    if (!entry) {
      wege[way.key] = null;
      missing.push(
        t(
          `This device does not name ${way.verb} ${way.pfad} in its contract, the way to ${way.was}.`,
          `Dieses Gerät nennt ${way.verb} ${way.pfad} nicht in seinem Kontrakt, den Weg, um ${way.was}.`
        )
      );
      continue;
    }
    wege[way.key] = { verb: way.verb, pfad: way.pfad };
  }

  return {
    hinweis:
      "Vom Ara-Kit beim Einspielen aus dem Kontrakt des Geraets geschrieben, nicht von Hand. " +
      "Was hier steht, ist zwischen App und Geraet vereinbart; die App raet keinen dieser Werte.",
    geraet: device,
    erzeugt: date,
    kontrakt: typeof contract?.kontrakt === "number" ? contract.kontrakt : null,
    umgebung: { basis, schluessel, laut_kontrakt: umgebung ?? null },
    kopf,
    wege,
    missing,
  };
}

/**
 * Die Vereinbarung, wie sie in die Datei geht: ohne die Mängelliste.
 *
 * Die Liste gehört dem Menschen vor dem Einspielen, nicht der App im Container.
 * Was fehlt, steht dort ohnehin als `null`, und die App sagt es dann selbst.
 */
export function arrangementFile(arrangement) {
  const { missing, ...rest } = arrangement;
  return JSON.stringify(rest, null, 2) + "\n";
}

/** Was die Vereinbarung diesem Gerät gegenüber ergibt, in Sätzen für den Bildschirm. */
export function arrangementLines(arrangement) {
  const lines = [
    t(
      `- The device puts the address of the interface into the container as \`${arrangement.umgebung.basis ?? "?"}\`, ` +
        `the key as \`${arrangement.umgebung.schluessel ?? "?"}\`, and the key travels in \`${arrangement.kopf ?? "?"}\`.`,
      `- Das Gerät legt der App die Adresse der Schnittstelle als \`${arrangement.umgebung.basis ?? "?"}\` in den Container, ` +
        `den Schlüssel als \`${arrangement.umgebung.schluessel ?? "?"}\`, und der Schlüssel geht in \`${arrangement.kopf ?? "?"}\` mit.`
    ),
  ];
  for (const way of APP_WAYS) {
    const found = arrangement.wege[way.key];
    lines.push(
      found
        ? `- ${found.verb} ${found.pfad}: ${way.was}`
        : t(`- missing: the way to ${way.was}`, `- fehlt: der Weg, um ${way.was}`)
    );
  }
  return lines;
}
