/**
 * Die Bibliothek des Designsystems zur Laufzeit: was das Kit dazu prüft und sagt.
 *
 * Seit Kontrakt 9 kann ein Gerät die Bibliothek selbst ausliefern. Eine App, die
 * im Manifest nur die Hauptzahl nennt (`"marken": "5"`), lädt Bausteine und
 * Stylesheet von der festen Adresse des Geräts und bringt keine Kopie mit; drei
 * Zahlen (`"marken": "5.2.1"`) heißen weiter: die Kopie steckt im Bündel.
 *
 * **Hier steht kein Produktwert.** Die Adresse, die Datei mit der ausgelieferten
 * Fassung und die Regeln stehen im Abschnitt `marken` des Kontrakts, und was das
 * Gerät gerade ausliefert, sagt seine Antwort auf `verzeichnis`. Die Funktionen
 * sind rein, nur `readServed` ruft das Gerät.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { call } from "./arasul.mjs";
import { t } from "./i18n.mjs";

/** Die Hauptzahl, wenn das Manifest die Bibliothek zur Laufzeit meint, sonst `null`. */
export function runtimeMajor(manifest) {
  const feld = manifest?.marken;
  return typeof feld === "string" && /^\d+$/.test(feld) ? feld : null;
}

/** Die Hauptzahl einer Fassung wie `5.3.1`. */
export function majorOf(fassung) {
  const treffer = String(fassung ?? "").match(/^(\d+)\./);
  return treffer ? treffer[1] : null;
}

/** Nennt der Kontrakt diesen Weg, die Bibliothek auszuliefern? */
export function contractServesLibrary(contract) {
  return Boolean(contract?.marken?.adresse && contract?.marken?.verzeichnis);
}

/**
 * Was das Gerät ausliefert: `{ haupt, fassung }` oder `null`.
 *
 * Die Datei liegt ohne Anmeldung offen, und ihren Pfad nennt der Kontrakt. Ein
 * Gerät ohne den Abschnitt wird nicht gefragt, und eine Antwort, die keine
 * Hauptzahl trägt, zählt wie keine: ein Kit, das aus „keine Antwort" ein
 * „anderes Gerät" macht, hielte eine gute App an.
 */
export async function readServed(contract, { base, insecure = false }) {
  if (!contractServesLibrary(contract)) return null;
  try {
    const answer = await call({ base, path: contract.marken.verzeichnis, insecure, timeout: 15_000 });
    const haupt = answer.body?.haupt;
    if (!answer.ok || (typeof haupt !== "number" && typeof haupt !== "string")) return null;
    return { haupt: String(haupt), fassung: typeof answer.body.fassung === "string" ? answer.body.fassung : null };
  } catch {
    return null;
  }
}

/** Alle JavaScript-Dateien unter einem Ordner. */
function scripts(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...scripts(path));
    else if (/\.m?js$/.test(entry.name) && statSync(path).size < 8_000_000) out.push(path);
  }
  return out;
}

/** Zeigt der gebaute Ordner auf die Adresse des Geräts, statt die Bibliothek mitzubringen? */
export function frontendLoadsLibrary(frontendDir, haupt) {
  const adresse = `/marken/${haupt}/marken.js`;
  return scripts(frontendDir).some((path) => readFileSync(path, "utf8").includes(adresse));
}

/**
 * Was eine App mit nur der Hauptzahl nicht darf und das Gerät nicht kann.
 *
 * Das sind Halte, keine Hinweise: die Seite bliebe leer, und niemand sähe es
 * dem Paket an. Jeder Satz sagt, was dem Menschen am Gerät passiert und was er
 * tun kann.
 *
 * `served` ist die Antwort von `readServed`. `null` heißt, sie war nicht zu
 * lesen, und dann wird die Hauptzahl nicht gehalten, sondern gesagt, dass es
 * nicht zu prüfen war.
 */
export function libraryFindings(contract, manifest, { frontendDir = null, served = null } = {}) {
  const haupt = runtimeMajor(manifest);
  if (!haupt) return [];
  const out = [];
  const weg = t(
    'Either update the device, or write the whole version of the copy into `marken` ("marken.mjs --sync" does that) and build with `npm run build:kopie`.',
    'Entweder das Gerät aktualisieren, oder die ganze Fassung der Kopie in `marken` schreiben ("marken.mjs --sync" tut das) und mit `npm run build:kopie` bauen.'
  );
  if (!contractServesLibrary(contract)) {
    out.push(
      t(
        `app.json says marken "${haupt}": the app loads the design library from the device. This device's contract names no section marken, so it does not serve one, and the page would stay empty. ${weg}`,
        `app.json nennt marken "${haupt}": die App lädt die Bibliothek des Designsystems vom Gerät. Der Kontrakt dieses Geräts nennt keinen Abschnitt marken, es liefert also keine aus, und die Seite bliebe leer. ${weg}`
      )
    );
  } else if (served && served.haupt !== haupt) {
    out.push(
      t(
        `app.json says marken "${haupt}", this device serves the library under ${served.haupt}${served.fassung ? ` (version ${served.fassung})` : ""}. At ${contract.marken.adresse.replace("<haupt>", haupt)} there is nothing, and the page would stay empty. Build against ${served.haupt}: marken.mjs --sync pulls the copy up and writes the number.`,
        `app.json nennt marken "${haupt}", dieses Gerät liefert die Hauptzahl ${served.haupt}${served.fassung ? ` (Fassung ${served.fassung})` : ""} aus. Unter ${contract.marken.adresse.replace("<haupt>", haupt)} liegt nichts, und die Seite bliebe leer. Gegen ${served.haupt} bauen: marken.mjs --sync zieht die Kopie nach und schreibt die Zahl.`
      )
    );
  }
  if (frontendDir && existsSync(join(frontendDir, "index.html")) && !frontendLoadsLibrary(frontendDir, haupt)) {
    out.push(
      t(
        `app.json says marken "${haupt}", but the built interface does not load the library from /marken/${haupt}/marken.js: it carries it itself, or nothing of it. The package is to carry no file of the library. Build with \`npm run build\`, not \`build:kopie\`.`,
        `app.json nennt marken "${haupt}", aber die gebaute Oberfläche lädt die Bibliothek nicht von /marken/${haupt}/marken.js: sie trägt sie selbst, oder nichts davon. Das Paket soll keine Datei der Bibliothek tragen. Mit \`npm run build\` bauen, nicht mit \`build:kopie\`.`
      )
    );
  }
  return out;
}

/**
 * Was auffällt und nichts anhält: eine Kopie, die das Gerät nicht mehr braucht
 * oder die älter ist als seine Bibliothek, und eine Hauptzahl, die sich nicht
 * prüfen ließ.
 */
export function libraryHints(contract, manifest, { served = null } = {}) {
  const out = [];
  const haupt = runtimeMajor(manifest);
  if (haupt) {
    if (contractServesLibrary(contract) && !served) {
      out.push(
        t(
          `Not checked: which major number of the library this device serves (${contract.marken.verzeichnis} did not answer). The app stands on ${haupt}.`,
          `Nicht geprüft: welche Hauptzahl der Bibliothek dieses Gerät ausliefert (${contract.marken.verzeichnis} hat nicht geantwortet). Die App steht auf ${haupt}.`
        )
      );
    } else if (served) {
      out.push(
        t(
          `The library comes from the device: ${contract.marken.adresse.replace("<haupt>", haupt)}, version ${served.fassung ?? "unknown"} today. The package carries no copy, and a device update brings the new version without a rebuild.`,
          `Die Bibliothek kommt vom Gerät: ${contract.marken.adresse.replace("<haupt>", haupt)}, heute in Fassung ${served.fassung ?? "unbekannt"}. Das Paket trägt keine Kopie, und ein Update des Geräts bringt die neue Fassung ohne Neubau.`
        )
      );
    }
    return out;
  }
  if (typeof manifest?.marken === "string" && manifest.marken && contractServesLibrary(contract)) {
    const nun = served ? ` (${t("now", "heute")} ${served.fassung ?? served.haupt})` : "";
    out.push(
      t(
        `Hint: this app carries a copy of the library (${manifest.marken}), and the device serves its own${nun}. The copy stays valid and ages with every device update. To load it from the device, write the major number into \`marken\` (for example "${served?.haupt ?? majorOf(manifest.marken) ?? "5"}") and build again with \`npm run build\`. Only apps made from the scaffold since 0.68.0 are set up for it.`,
        `Hinweis: diese App trägt eine Kopie der Bibliothek (${manifest.marken}), und das Gerät liefert seine eigene aus${nun}. Die Kopie bleibt gültig und veraltet mit jedem Update des Geräts. Um sie vom Gerät zu laden, die Hauptzahl in \`marken\` schreiben (etwa "${served?.haupt ?? majorOf(manifest.marken) ?? "5"}") und mit \`npm run build\` neu bauen. Eingerichtet dafür sind nur Apps aus der Vorlage ab 0.68.0.`
      )
    );
  }
  return out;
}

/** Der Abschnitt `marken` des Kontrakts, wörtlich, für `--contract` und `--check`. */
export function librarySection(contract) {
  const marken = contract?.marken;
  if (!marken?.regeln?.length) return [];
  return [
    "",
    t("## The design library at runtime", "## Die Bibliothek des Designsystems zur Laufzeit"),
    "",
    t(
      `They stand word for word in the contract, under \`marken\`. Address \`${marken.adresse}\`, directory \`${marken.verzeichnis}\`:`,
      `Sie stehen wörtlich im Kontrakt, unter \`marken\`. Adresse \`${marken.adresse}\`, Verzeichnis \`${marken.verzeichnis}\`:`
    ),
    "",
    ...marken.regeln.map((r) => `- ${r}`),
  ];
}
