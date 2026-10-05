/**
 * Die Bibliothek des Designsystems zur Laufzeit: was das Kit dazu prüft und sagt.
 *
 * Seit Kontrakt 9 kann ein Gerät die Bibliothek selbst ausliefern. Eine App, die
 * im Manifest nur die Hauptzahl nennt (`"marken": "<haupt>"`), lädt Bausteine und
 * Stylesheet von der festen Adresse des Geräts und bringt keine Kopie mit; die
 * ganze Fassung (`"marken": "<fassung>"`) heißt weiter: die Kopie steckt im Bündel.
 *
 * **Hier steht kein Produktwert.** Die Adresse, die Datei mit der ausgelieferten
 * Fassung und die Regeln stehen im Abschnitt `marken` des Kontrakts, und was das
 * Gerät gerade ausliefert, sagt seine Antwort auf `verzeichnis`. Die Funktionen
 * sind rein, nur `readServed` ruft das Gerät.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { call } from "./arasul.mjs";
import { walkFiles } from "./files.mjs";
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
 * Hauptzahl trägt, zählt wie keine: ein Kit, das aus „keine Antwort“ ein
 * „anderes Gerät“ macht, hielte eine gute App an.
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

/** Die Adresse, unter der das Gerät die Bibliothek mit dieser Hauptzahl ausliefert, wie sein Kontrakt sie schreibt. */
export function libraryAddress(contract, haupt) {
  return String(contract.marken.adresse).replace("<haupt>", haupt);
}

/** Zeigt der gebaute Ordner auf die Adresse des Geräts (`libraryAddress`), statt die Bibliothek mitzubringen? */
export function frontendLoadsLibrary(frontendDir, adresse) {
  return walkFiles(frontendDir, { match: /\.m?js$/, skip: ["node_modules"], maxBytes: 8_000_000 }).some((path) =>
    readFileSync(path, "utf8").includes(adresse)
  );
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
        `app.json says marken "${haupt}", this device serves the library under ${served.haupt}${served.fassung ? ` (version ${served.fassung})` : ""}. At ${libraryAddress(contract, haupt)} there is nothing, and the page would stay empty. Build against ${served.haupt}: marken.mjs --sync pulls the copy up and writes the number.`,
        `app.json nennt marken "${haupt}", dieses Gerät liefert die Hauptzahl ${served.haupt}${served.fassung ? ` (Fassung ${served.fassung})` : ""} aus. Unter ${libraryAddress(contract, haupt)} liegt nichts, und die Seite bliebe leer. Gegen ${served.haupt} bauen: marken.mjs --sync zieht die Kopie nach und schreibt die Zahl.`
      )
    );
  }
  // Wohin die gebaute Oberfläche zeigen muss, sagt nur der Kontrakt. Nennt er keinen Abschnitt, steht der
  // Halt dazu schon oben, und am Bau ist nichts zu vergleichen.
  const adresse = contractServesLibrary(contract) ? libraryAddress(contract, haupt) : null;
  if (adresse && frontendDir && existsSync(join(frontendDir, "index.html")) && !frontendLoadsLibrary(frontendDir, adresse)) {
    out.push(
      t(
        `app.json says marken "${haupt}", but the built interface does not load the library from ${adresse}: it carries it itself, or nothing of it. The package is to carry no file of the library. Build with \`npm run build\`, not \`build:kopie\`.`,
        `app.json nennt marken "${haupt}", aber die gebaute Oberfläche lädt die Bibliothek nicht von ${adresse}: sie trägt sie selbst, oder nichts davon. Das Paket soll keine Datei der Bibliothek tragen. Mit \`npm run build\` bauen, nicht mit \`build:kopie\`.`
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
          `The library comes from the device: ${libraryAddress(contract, haupt)}, version ${served.fassung ?? "unknown"} today. The package carries no copy, and a device update brings the new version without a rebuild.`,
          `Die Bibliothek kommt vom Gerät: ${libraryAddress(contract, haupt)}, heute in Fassung ${served.fassung ?? "unbekannt"}. Das Paket trägt keine Kopie, und ein Update des Geräts bringt die neue Fassung ohne Neubau.`
        )
      );
    }
    return out;
  }
  if (typeof manifest?.marken === "string" && manifest.marken && contractServesLibrary(contract)) {
    const nun = served ? ` (${t("now", "heute")} ${served.fassung ?? served.haupt})` : "";
    // Die Hauptzahl als Beispiel nur, wenn das Gerät sie nennt oder die Kopie sie trägt; geraten wird keine.
    const zahl = served?.haupt ?? majorOf(manifest.marken);
    const beispiel = zahl ? ` (${t("for example", "etwa")} "${zahl}")` : "";
    out.push(
      t(
        `Hint: this app carries a copy of the library (${manifest.marken}), and the device serves its own${nun}. The copy stays valid and ages with every device update. To load it from the device, write the major number into \`marken\`${beispiel} and build again with \`npm run build\`. Set up for it is an app whose frontend builds both ways, \`build\` from the device and \`build:kopie\` with the copy, as the scaffold does.`,
        `Hinweis: diese App trägt eine Kopie der Bibliothek (${manifest.marken}), und das Gerät liefert seine eigene aus${nun}. Die Kopie bleibt gültig und veraltet mit jedem Update des Geräts. Um sie vom Gerät zu laden, die Hauptzahl in \`marken\` schreiben${beispiel} und mit \`npm run build\` neu bauen. Eingerichtet dafür ist eine App, deren Oberfläche auf beide Arten baut, \`build\` vom Gerät und \`build:kopie\` mit der Kopie, wie die Vorlage.`
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
