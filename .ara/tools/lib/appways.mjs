/**
 * Was eine App vom Gerät bekommt, und wie sie es erfährt.
 *
 * Eine App im Container weiß von sich aus nichts über das Gerät, auf dem sie
 * läuft. Was sie braucht, ist zwischen Kit und Produkt vereinbart, steht also
 * im Kontrakt und nirgends sonst:
 *
 *   1. Unter welchem Namen das Gerät ihr die **Adresse** der Schnittstelle in
 *      den Container legt.
 *   2. Unter welchem Namen es ihr den **Schlüssel** hineinlegt.
 *   3. Unter welchem Namen die Adresse ihrer **Datenbank** ankommt, der einzige
 *      Ort, den sie über das nächste Einspielen hinaus behält.
 *   4. Wie die **Kopfzeile** heißt, in der dieser Schlüssel mitgeht, und wie die
 *      beiden **Kopfzeilen der Anmeldung** heißen, Benutzer und Rolle.
 *   5. Welche **Wege** es dafür gibt: einen Flow starten, einen Lauf lesen,
 *      Freigaben lesen, und wo das Gerät es anbietet, ein Dokument auslesen.
 *   6. Was von diesen Wegen an die Adresse **angehängt** wird. Die Adresse
 *      endet auf dem Vorsatz der äußeren Schnittstelle, und die Pfade der
 *      Endpunkte fangen damit an: wer beides aneinanderhängt, ruft den Vorsatz
 *      zweimal und bekommt einen 404. Seit Kontrakt 5 sagt das Gerät den
 *      relativen Weg je Endpunkt selbst (`endpunkte[].relativ`), und das Kit
 *      schreibt ihn der App daneben, statt ihn auszurechnen.
 *   7. Ob der Start eines Laufs den **Einreicher** und eine **Regel für die
 *      Freigabe** annimmt (`freigaben` im Kontrakt, seit dem 25.09.2026). Ein
 *      Gerät davor weist einen Start mit diesen Feldern ab, denn sein Schema
 *      nimmt kein unbekanntes Feld an. Die App schickt sie deshalb nur, wenn
 *      hier `true` steht.
 *   8. Welche Wege das Gerät als **Modellaufruf protokolliert** und wie die App
 *      den Menschen nennt, für den sie fragt (`protokoll` im Kontrakt, seit dem
 *      26.09.2026): eine Kopfzeile, ein Feld, und an `/v1` ein anderes Feld.
 *      Ohne sie steht der Aufruf ohne Menschen im Protokoll.
 *
 * Bis zum 29.08.2026 stand nichts davon im Kontrakt, sondern in der Vorlage:
 * `ARASUL_API_URL`, `ARASUL_API_SCHLUESSEL`, `x-api-key` und drei Pfade ohne
 * den Vorsatz der äußeren Schnittstelle, alle aus dem Kopf. Trifft eine solche
 * Vorlage auf ein Gerät, das seine Werte anders nennt, findet sie nichts, hält
 * das für „kein Arasul da" und legt den Vorgang ohne Lauf ab. Genau das war der
 * übersprungene Freigabe-Schritt. Am 25.09.2026 fand ein Fremdtest dasselbe an
 * zwei Stellen, die bis dahin fehlten: der Name der Benutzerkopfzeile stand
 * fest im Quelltext der Vorlage, und der Weg zum Auslesen eines Dokuments als
 * Zeichenkette im Quelltext der App.
 *
 * Deshalb steht hier die Mechanik und in der Vorlage kein einziger dieser
 * Werte. Das Kit liest sie beim Einspielen aus dem Kontrakt des Geräts und legt
 * sie der App als `arasul.json` ins Paket. Was es dort nicht findet, **sagt es**
 * und schreibt es nicht hin: eine App, die eine Vereinbarung errät, hält an
 * einer Stelle an, an der niemand nachsieht.
 *
 * Die Wege nennt das Kit selbst, so wie es die Wege für Pakete und Stände
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
 *
 * `pflicht` sagt, ob der Weg fehlt, wenn das Gerät ihn nicht nennt. Die drei
 * Wege der Freigabe braucht jede App aus der Vorlage; ohne sie hält kein Lauf
 * an. Die beiden Wege zu einem Dokument braucht nur eine App, die Dokumente
 * auslesen lässt, und ein Gerät ohne sie ist kein Mangel, sondern eines, das
 * das nicht anbietet. Beides steht in der Datei als `null`, gesagt wird es
 * verschieden.
 */
export const APP_WAYS = Object.freeze([
  {
    key: "flow_starten",
    verb: "POST",
    pfad: `${EXTERNAL_PREFIX}/flows/{flow}/run`,
    pflicht: true,
    was: t("start a flow", "einen Flow starten"),
  },
  {
    key: "lauf_lesen",
    verb: "GET",
    pfad: `${EXTERNAL_PREFIX}/flows/runs/{lauf}`,
    pflicht: true,
    was: t("read a run", "einen Lauf lesen"),
  },
  {
    key: "freigaben_lesen",
    verb: "GET",
    pfad: `${EXTERNAL_PREFIX}/freigaben`,
    pflicht: true,
    was: t("read the approvals of this app", "die Freigaben dieser App lesen"),
  },
  {
    key: "dokument_auslesen",
    verb: "POST",
    pfad: `${EXTERNAL_PREFIX}/document/extract-structured`,
    pflicht: false,
    was: t("read a document into fields", "ein Dokument in Felder auslesen"),
  },
  {
    key: "dokument_text",
    verb: "POST",
    pfad: `${EXTERNAL_PREFIX}/document/extract`,
    pflicht: false,
    was: t("take the text out of a document", "den Text aus einem Dokument holen"),
  },
  {
    key: "modell_fragen",
    verb: "POST",
    pfad: `${EXTERNAL_PREFIX}/llm/chat`,
    pflicht: false,
    was: t("ask a model, with an image too", "ein Modell fragen, auch mit einem Bild"),
  },
]);

/**
 * Wie die App den Menschen nennt, für den sie ein Modell fragt, aus `protokoll`.
 *
 * Nur was der Kontrakt nennt, und nur als Name: `wege` sind die Wege, die das
 * Gerät als Modellaufruf protokolliert, relativ zum Vorsatz, so wie er sie
 * schreibt. Ein Gerät vor dem 26.09.2026 nennt nichts, dann steht hier `null`,
 * und die App schickt keine Kopfzeile, die das Gerät nicht erwartet.
 */
function logArrangement(contract) {
  const protokoll = contract?.protokoll;
  const wer = protokoll?.einreicher;
  if (!wer || typeof wer.kopf !== "string") return null;
  return {
    wege: Array.isArray(protokoll.wege) ? protokoll.wege.filter((w) => typeof w === "string") : [],
    kopf: wer.kopf,
    feld: typeof wer.feld === "string" ? wer.feld : null,
    feld_openai: typeof wer.feld_openai === "string" ? wer.feld_openai : null,
  };
}

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
  // Die Datenbank kommt mit Kontrakt 5 und nur für eine App mit Backend. Fehlt
  // sie im Kontrakt, steht hier `null`: dann hat dieses Gerät keinen Ort, den
  // die App über das nächste Einspielen hinaus behält, und die Vorlage legt
  // ihre Daten in eine Datei im Container, die das nächste Einspielen nicht
  // überlebt. Das ist kein Widerspruch zum Wissen, es sind zwei Orte: was
  // dauerhaft ist, sagt der Kontrakt unter `daten`.
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

  // Wer angemeldet ist, sagt die Plattform der App in zwei Kopfzeilen. Ihre
  // Namen gehören zum Vertrag wie die übrigen: bis zum 25.09.2026 stand der
  // eine fest im Quelltext der Vorlage.
  // Dazu die Werte, die in der Rollenkopfzeile stehen können: eine App, die
  // etwa nur Administratoren Zuordnungen pflegen lässt, vergleicht mit einem
  // Wert von hier und tippt keinen ein.
  const koepfe = {
    benutzer: typeof contract?.koepfe?.benutzer === "string" ? contract.koepfe.benutzer : null,
    rolle: typeof contract?.koepfe?.rolle === "string" ? contract.koepfe.rolle : null,
    rollen: Array.isArray(contract?.koepfe?.rollen) ? contract.koepfe.rollen.filter((r) => typeof r === "string") : [],
  };
  if (!koepfe.benutzer) {
    missing.push(
      t(
        "`koepfe.benutzer` is missing in the contract. Without it an app does not know who is logged in.",
        "`koepfe.benutzer` fehlt im Kontrakt. Ohne ihn weiß eine App nicht, wer angemeldet ist."
      )
    );
  }

  const wege = {};
  const unangeboten = [];
  for (const way of APP_WAYS) {
    const entry = findEndpoint(contract, way.verb, probed(way.pfad));
    if (!entry) {
      wege[way.key] = null;
      if (!way.pflicht) {
        unangeboten.push(way.key);
        continue;
      }
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

  // Ob ein Lauf seinen Einreicher und eine Regel für die Freigabe mitbringen
  // darf. Gelesen am Schema, das der Kontrakt für den Start eines Laufs
  // ausgibt: steht das Feld dort, nimmt das Gerät es an.
  const start = contract?.freigaben?.start?.properties || {};
  const freigaben = {
    einreicher: Boolean(start.einreicher),
    regel: Boolean(start.freigabe),
    // Welche Rolle eine Regel als Entscheider nennen darf, wie der Kontrakt sie nennt.
    rollen: Array.isArray(contract?.freigaben?.rollen) ? contract.freigaben.rollen.filter((r) => typeof r === "string") : [],
  };

  // Was dauerhaft ist. Der Kontrakt sagt es seit dem 25.09.2026 unter `daten`;
  // ein Gerät davor sagt es nicht, und dann steht hier `null`.
  const daten =
    contract?.daten && typeof contract.daten === "object"
      ? { ort: contract.daten.ort ?? null, je_stand: contract.daten.je_stand === true }
      : null;

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
    koepfe,
    wege,
    freigaben,
    daten,
    protokoll: logArrangement(contract),
    missing,
    unangeboten,
  };
}

/**
 * Die Vereinbarung, wie sie in die Datei geht: ohne die Mängelliste.
 *
 * Die Liste gehört dem Menschen vor dem Einspielen, nicht der App im Container.
 * Was fehlt, steht dort ohnehin als `null`, und die App sagt es dann selbst.
 * Dasselbe gilt für die Wege, die dieses Gerät nicht anbietet.
 */
export function arrangementFile(arrangement) {
  const { missing, unangeboten, ...rest } = arrangement;
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
  if (arrangement.koepfe?.benutzer) {
    lines.push(
      t(
        `- Who is logged in arrives in \`${arrangement.koepfe.benutzer}\`, the role in \`${arrangement.koepfe.rolle ?? "?"}\`.`,
        `- Wer angemeldet ist, kommt in \`${arrangement.koepfe.benutzer}\` an, die Rolle in \`${arrangement.koepfe.rolle ?? "?"}\`.`
      )
    );
  }
  if (arrangement.umgebung.datenbank) {
    lines.push(
      t(
        `- A database of its own comes along, its address as \`${arrangement.umgebung.datenbank}\`. It is the one place the app keeps ` +
          "beyond the next deploy" +
          (arrangement.daten?.je_stand ? ", one for staging and one for live." : "."),
        `- Eine eigene Datenbank kommt mit, ihre Adresse als \`${arrangement.umgebung.datenbank}\`. Sie ist der eine Ort, den die App ` +
          "über das nächste Einspielen hinaus behält" +
          (arrangement.daten?.je_stand ? ", eine für den Teststand und eine für live." : ".")
      )
    );
  } else {
    lines.push(
      t(
        "- No database comes along. What the app writes lies in the container and is gone after the next deploy.",
        "- Keine Datenbank kommt mit. Was die App schreibt, liegt im Container und ist nach dem nächsten Einspielen weg."
      )
    );
  }
  if (arrangement.freigaben?.einreicher) {
    lines.push(
      t(
        "- A run takes its submitter and a rule for its approval: four eyes, or named deciders.",
        "- Ein Lauf nimmt seinen Einreicher und eine Regel für seine Freigabe an: vier Augen, oder benannte Entscheider."
      )
    );
  }
  lines.push(
    arrangement.protokoll
      ? t(
          `- A call to ${arrangement.protokoll.wege.join(", ") || "a model"} carries the human it is made for in \`${arrangement.protokoll.kopf}\`, and the device's AI log keeps it with them. The model step of a flow is not in that log: it stands at the run, with its submitter.`,
          `- Ein Aufruf an ${arrangement.protokoll.wege.join(", ") || "ein Modell"} trägt den Menschen, für den er geschieht, in \`${arrangement.protokoll.kopf}\`, und das KI-Protokoll des Geräts führt ihn mit ihm. Der Modellschritt eines Flows steht nicht darin: er steht am Lauf, mit dessen Einreicher.`
        )
      : t(
          "- This device does not say how a model call names its human. Its log shows the app, not the person.",
          "- Dieses Gerät sagt nicht, wie ein Modellaufruf seinen Menschen nennt. Sein Protokoll zeigt die App, nicht die Person."
        )
  );
  for (const way of APP_WAYS) {
    const found = arrangement.wege[way.key];
    lines.push(
      found
        ? `- ${found.verb} ${found.relativ ?? found.pfad}: ${way.was}` +
            (found.relativ
              ? t(" (relative to the address)", " (relativ zur Adresse)")
              : t(" (the whole path, this device names no relative one)", " (der ganze Pfad, dieses Gerät nennt keinen relativen)"))
        : way.pflicht
          ? t(`- missing: the way to ${way.was}`, `- fehlt: der Weg, um ${way.was}`)
          : t(`- not offered by this device: the way to ${way.was}`, `- bietet dieses Gerät nicht an: der Weg, um ${way.was}`)
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
 * die liegen im Spiegel und am Geraet selbst. Ein Pfad aus dem Gedaechtnis
 * waere genau die Sorte Zusage, die dieses Kit nicht macht. Liegt kein Spiegel
 * da, zeigt der Text auf die Anleitungen am Geraet (`mirror.mjs --docs
 * --device`): der Fremdtest am 29.08.2026 lief von der Ausgabe ueber
 * `mirror.mjs --docs` bis zu `--refresh` und stand dann vor der Tokenfrage,
 * und am 25.09.2026 las ein Fremder die Doku am Geraet, weil das Kit diesen
 * Weg nicht nannte.
 *
 * **Eine Freigabe gilt einem Stand.** Das Geraet fuehrt je App zwei, und ein
 * frisch eingespieltes Paket liegt nur im Teststand. Wer allein fuer den
 * Livestand freigegeben ist, sieht davon nichts: die Freigabe steht, die
 * Uebersicht bleibt leer, und das ist der verwirrendste aller Zustaende. Der
 * Fremdtest ist genau dort haengen geblieben. Welchen Stand eine Freigabe
 * meint, entscheidet der Administrator, und wie das im Produkt heisst, steht
 * wieder im Handbuch.
 */
export function releaseLines({
  place,
  base,
  testUrl = null,
  deviceCall,
  startRef,
  startPassword = false,
  docs = false,
  docsCall = null,
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
            `      ${docs ? "node .ara/tools/mirror.mjs --docs" : docsCall || "node .ara/tools/mirror.mjs --docs --device <device>"}`,
          ],
          [
            `- Das Startpasswort liegt unter ${startRef}. Daraus wird eine Sitzung, und das Passwort`,
            "  bleibt dabei ungesehen:",
            `      ${deviceCall} --admin-login`,
            "  Welchen Weg die Freigabe geht, steht in der API-Referenz des Artefakts, nicht im Kit:",
            `      ${docs ? "node .ara/tools/mirror.mjs --docs" : docsCall || "node .ara/tools/mirror.mjs --docs --device <gerät>"}`,
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
        `- Or a human does it in the interface: ${base}, logged in as administrator. For that the kit`,
        "  is not needed. Which page carries the release stands in the admin handbook of the",
        `  artifact:\n      ${docs ? "node .ara/tools/mirror.mjs --docs" : docsCall || "node .ara/tools/mirror.mjs --docs --device <device>"}`,
      ],
      [
        `- Oder ein Mensch tut es in der Oberfläche: ${base}, angemeldet als Administrator. Dafür`,
        "  braucht es das Kit nicht. Welche Seite die Freigabe trägt, steht im Admin-Handbuch des",
        `  Artefakts:\n      ${docs ? "node .ara/tools/mirror.mjs --docs" : docsCall || "node .ara/tools/mirror.mjs --docs --device <gerät>"}`,
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
    ),
    "",
    t(
      "**And a release means a slot.** What was deployed just now lies in staging, and whoever is " +
        "released for the live version only does not see it: the release stands, the overview stays " +
        "empty. So the release has to mean staging. What that is called there stands in the handbook.",
      "**Und eine Freigabe gilt einem Stand.** Was gerade eingespielt wurde, liegt im Teststand, und wer " +
        "nur für den Livestand freigegeben ist, sieht ihn nicht: die Freigabe steht, die Übersicht bleibt " +
        "leer. Die Freigabe muss also den Teststand meinen. Wie das dort heißt, steht im Handbuch."
    )
  );
  return lines;
}

/**
 * Was nach dem zweiten Einspielen derselben App zu sagen ist.
 *
 * Eine Freigabe gilt der App und ihrem Stand, nicht einer Fassung: wer den
 * Teststand schon sah, sieht die neue Fassung jetzt. Ob jemand freigegeben
 * ist, sieht das Kit mit seinem Schlüssel nicht, also sagt es das nicht als
 * Tatsache. Die Daten des Teststands bleiben, wenn das Gerät eine Datenbank
 * gibt: die neue Fassung findet sie vor.
 */
export function redeployLines({ place, previous, database = false }) {
  return [
    t(
      `Before this, version ${previous} lay here. Releases stay: they belong to the app and its slot, not to a version, ` +
        "so whoever saw staging sees the new version now. Whether anybody is released, the kit's key cannot see.",
      `Davor lag hier Fassung ${previous}. Freigaben bleiben stehen: sie gelten der App und ihrem Stand, nicht einer Fassung, ` +
        "wer den Teststand schon sah, sieht also jetzt die neue. Ob jemand freigegeben ist, sieht der Schlüssel des Kits nicht."
    ),
    ...(database
      ? [
          "",
          t(
            `The data of staging stays: the new version finds the database of the old one on ${place}.`,
            `Die Daten des Teststands bleiben: die neue Fassung findet die Datenbank der alten auf ${place} vor.`
          ),
        ]
      : []),
  ];
}
