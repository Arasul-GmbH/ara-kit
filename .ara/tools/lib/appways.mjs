/**
 * Was eine App vom Gerät bekommt, und wie sie es erfährt.
 *
 * Eine App im Container weiß von sich aus nichts über das Gerät, auf dem sie
 * läuft. Sie braucht fünf Dinge, und alle fünf sind zwischen Kit und Produkt
 * vereinbart, stehen also im Kontrakt und nirgends sonst:
 *
 *   1. Unter welchem Namen das Gerät ihr die **Adresse** der Schnittstelle in
 *      den Container legt.
 *   2. Unter welchem Namen es ihr den **Schlüssel** hineinlegt.
 *   3. Wie die **Kopfzeile** heißt, in der dieser Schlüssel mitgeht.
 *   4. Welche **Wege** es dafür gibt: einen Flow starten, einen Lauf lesen,
 *      Freigaben lesen.
 *   5. Was von diesen Wegen an die Adresse **angehängt** wird. Die Adresse
 *      endet auf dem Vorsatz der äußeren Schnittstelle, und die Pfade der
 *      Endpunkte fangen damit an: wer beides aneinanderhängt, ruft den Vorsatz
 *      zweimal und bekommt einen 404. Seit Kontrakt 5 sagt das Gerät den
 *      relativen Weg je Endpunkt selbst (`endpunkte[].relativ`), und das Kit
 *      schreibt ihn der App daneben, statt ihn auszurechnen.
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
 * Was von einem Weg an die Adresse gehängt wird, die die App bekommen hat.
 *
 * Drei Quellen, in dieser Reihenfolge, und keine davon ist geraten:
 *
 *   1. Der Endpunkt trägt seinen Weg **auch relativ** (`relativ`, ab Kontrakt
 *      5). Abgeschrieben wird er nicht: der Kontrakt schreibt dort seinen
 *      eigenen Platzhalter (`:name`), das Kit seinen (`{flow}`). Genommen wird
 *      nur das Stück, das der Endpunkt weglässt, und das wird von diesem Weg
 *      abgeschnitten.
 *   2. `umgebung.praefix` samt `basis_enthaelt_praefix`: dann sagt das Gerät
 *      zwar nichts über den einzelnen Weg, aber welches Stück doppelt wäre.
 *   3. Gar nichts. Ein Gerät vor Kontrakt 5 sagt dazu nichts, und dann steht
 *      hier auch nichts. Die App hängt dann den ganzen Pfad an die Adresse, so
 *      wie das Kit es bis zum 29.08.2026 überall getan hat.
 */
function relativeWay(contract, entry, pfad) {
  const praefixe = [];
  if (typeof entry?.relativ === "string" && String(entry.pfad).endsWith(entry.relativ)) {
    praefixe.push(String(entry.pfad).slice(0, -entry.relativ.length));
  }
  const umgebung = contract?.umgebung;
  if (typeof umgebung?.praefix === "string" && umgebung.basis_enthaelt_praefix === true) {
    praefixe.push(umgebung.praefix);
  }
  for (const praefix of praefixe) {
    if (praefix && pfad.startsWith(`${praefix}/`)) return pfad.slice(praefix.length);
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
  // Die Datenbank kommt erst mit Kontrakt 5 und nur für eine App mit Backend.
  // Sie fehlt deshalb nicht, wenn sie fehlt: hier steht dann `null`, und die
  // App hat ihren Speicher bei sich.
  const datenbank = envName(umgebung?.datenbank);

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
    wege[way.key] = { verb: way.verb, pfad: way.pfad, relativ: relativeWay(contract, entry, way.pfad) };
  }

  return {
    hinweis:
      "Vom Ara-Kit beim Einspielen aus dem Kontrakt des Geraets geschrieben, nicht von Hand. " +
      "Was hier steht, ist zwischen App und Geraet vereinbart; die App raet keinen dieser Werte.",
    geraet: device,
    erzeugt: date,
    kontrakt: typeof contract?.kontrakt === "number" ? contract.kontrakt : null,
    umgebung: {
      basis,
      schluessel,
      datenbank,
      praefix: typeof umgebung?.praefix === "string" ? umgebung.praefix : null,
      basis_enthaelt_praefix: umgebung?.basis_enthaelt_praefix === true,
      laut_kontrakt: umgebung ?? null,
    },
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
  if (arrangement.umgebung.datenbank) {
    lines.push(
      t(
        `- A database of its own comes along, its address as \`${arrangement.umgebung.datenbank}\`.`,
        `- Eine eigene Datenbank kommt mit, ihre Adresse als \`${arrangement.umgebung.datenbank}\`.`
      )
    );
  }
  for (const way of APP_WAYS) {
    const found = arrangement.wege[way.key];
    lines.push(
      found
        ? `- ${found.verb} ${found.relativ ?? found.pfad}: ${way.was}` +
            (found.relativ
              ? t(" (relative to the address)", " (relativ zur Adresse)")
              : t(" (the whole path, this device names no relative one)", " (der ganze Pfad, dieses Gerät nennt keinen relativen)"))
        : t(`- missing: the way to ${way.was}`, `- fehlt: der Weg, um ${way.was}`)
    );
  }
  return lines;
}

/**
 * Wer den frisch eingespielten Stand sehen darf, und wie er freigegeben wird.
 *
 * Der zweite Fremdtest am 29.08.2026 kam bis hierher: Klon, Bau und Deploy in
 * dreieinhalb Minuten, und dann eine 403 an der Adresse des Teststands. Die App
 * lag am Geraet, sie war nur fuer niemanden freigegeben. Das Kit sagte dazu
 * nichts, und ein Werkzeug, das nach dem letzten Schritt schweigt, sieht in
 * diesem Moment kaputt aus.
 *
 * **Das Kit kann die Freigabe nicht erteilen, und es soll das sagen.** Sein
 * Schluessel traegt `app:deploy`, das ist der Bereich fuer Pakete und Staende.
 * Wer sie erteilt, ist ein Administrator, und dafuer gibt es zwei Wege: eine
 * Sitzung aus dem Startpasswort, wenn eines in der Ablage liegt, sonst ein
 * Mensch in der Oberflaeche des Geraets.
 *
 * **Kein Weg und keine Seite wird hier benannt.** Wie die Freigabe im Produkt
 * heisst, steht im Admin-Handbuch und in der API-Referenz des Artefakts, und
 * die liegen im Spiegel. Ein Pfad aus dem Gedaechtnis waere genau die Sorte
 * Zusage, die dieses Kit nicht macht.
 */
export function releaseLines({
  place,
  base,
  testUrl = null,
  deviceCall,
  startRef,
  startPassword = false,
} = {}) {
  const lines = [
    t(
      "Nobody sees it yet. An app on this device is visible to a person only once it has been " +
        "released for them, and the kit cannot release it: its key carries app:deploy and nothing " +
        "else. An administrator does that.",
      "Gesehen hat es noch niemand. Eine App an diesem Gerät sieht ein Mensch erst, wenn sie für " +
        "ihn freigegeben ist, und freigeben kann das Kit sie nicht: sein Schlüssel trägt app:deploy " +
        "und sonst nichts. Das tut ein Administrator."
    ),
    "",
  ];
  if (testUrl) {
    lines.push(
      t(
        `Until then ${testUrl} answers with a 403, and that is the permission missing, not the app.`,
        `Bis dahin antwortet ${testUrl} mit einer 403, und das ist die fehlende Freigabe und nicht die App.`
      ),
      ""
    );
  }
  lines.push(t("Two ways to an administrator:", "Zwei Wege zu einem Administrator:"), "");
  lines.push(
    ...(startPassword
      ? t(
          [
            `- The start password lies under ${startRef}. A session comes out of it, and the password`,
            "  stays unseen while it does:",
            `      ${deviceCall} --admin-login`,
            "  Which route the release goes stands in the API reference of the artifact, not in the kit:",
            "      node .ara/tools/mirror.mjs --docs",
          ],
          [
            `- Das Startpasswort liegt unter ${startRef}. Daraus wird eine Sitzung, und das Passwort`,
            "  bleibt dabei ungesehen:",
            `      ${deviceCall} --admin-login`,
            "  Welchen Weg die Freigabe geht, steht in der API-Referenz des Artefakts, nicht im Kit:",
            "      node .ara/tools/mirror.mjs --docs",
          ]
        )
      : t(
          [
            `- No start password lies under ${startRef}, so the kit gets no session. Whoever knows it,`,
            "  the administrator of this device, hands it over once:",
            `      printf '%s' "<password>" | node .ara/tools/secrets.mjs --set ${startRef}`,
          ],
          [
            `- Unter ${startRef} liegt kein Startpasswort, also bekommt das Kit keine Sitzung. Wer es`,
            "  kennt, der Administrator dieses Geräts, gibt es einmal herein:",
            `      printf '%s' "<passwort>" | node .ara/tools/secrets.mjs --set ${startRef}`,
          ]
        ))
  );
  lines.push(
    ...t(
      [
        `- Or a human does it in the interface: ${base}, logged in as administrator. Which page carries`,
        "  the release stands in the admin handbook of the artifact. For that the kit is not needed.",
      ],
      [
        `- Oder ein Mensch tut es in der Oberfläche: ${base}, angemeldet als Administrator. Welche Seite`,
        "  die Freigabe trägt, steht im Admin-Handbuch des Artefakts. Dafür braucht es das Kit nicht.",
      ]
    )
  );
  lines.push(
    "",
    t(
      `Until somebody is released, ${place} shows the app to nobody, not even to the administrator: ` +
        "the role says who manages, not who works with it.",
      `Solange niemand freigegeben ist, zeigt ${place} die App niemandem, auch dem Administrator nicht: ` +
        "die Rolle sagt, wer verwaltet, nicht wer damit arbeitet."
    )
  );
  return lines;
}
