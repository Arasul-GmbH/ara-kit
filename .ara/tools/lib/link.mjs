/**
 * Die Verbindung zu einem Gerät mit Arasul: Adresse, Schlüssel, Kontrakt.
 *
 * Zwei Werkzeuge sprechen die Schnittstelle an, `app.mjs` rollt Apps und
 * `maintain.mjs` fragt nach dem Zustand. Beide brauchen dieselben vier Schritte
 * davor: die Adresse aus der Akte, den Schlüssel aus der Ablage, den Kontrakt
 * vom Gerät, und danach die Regel, dass nur gerufen wird, was dort steht.
 * Zweimal gebaut liefen sie auseinander, und die Regel ist zu wichtig dafür.
 *
 * **Hier steht kein Produktwert.** Der einzige Pfad, den das Kit auswendig
 * kennt, ist der Kontrakt selbst (`lib/contract.mjs`). Alles andere schlägt es
 * dort nach.
 *
 * Die Fehler kommen als Ausnahme mit einem fertigen Satz für den Menschen,
 * nicht als Nummer: das Werkzeug reicht ihn an `fail()` weiter.
 */

import { relative } from "node:path";
import { baseUrl, call, reason } from "./arasul.mjs";
import { CONTRACT_PATH, checkVersion, findEndpoint } from "./contract.mjs";
import { ROOT } from "./kit.mjs";
import { getSecret } from "./secrets.mjs";
import { t } from "./i18n.mjs";

/** Der Aufruf, mit dem ein Kit-Schlüssel für dieses Gerät entsteht. */
function keyCommand(device) {
  return (
    `node .ara/tools/device.mjs${device.customer ? ` --customer ${device.customer}` : ""} ` +
    `--name ${device.device} --deploy-key`
  );
}

/**
 * Adresse und Schlüssel, aus der Akte und aus der Ablage.
 *
 * Die Schnittstelle liegt nicht immer unter der Adresse, über die SSH läuft: ein
 * Gerät kann hinter einem Tunnel hängen oder sein Zertifikat nur unter einem
 * Namen führen. Dann trägt die Akte `api_base`, und die bleibt dort stehen,
 * statt bei jedem Aufruf mitgetippt zu werden. `base` sticht beides, für den
 * einen Versuch, der nicht in die Akte gehört.
 */
export function connect(device, { base: override = null, insecure: force = false } = {}) {
  const fields = device.fields || {};
  const place = device.customer ? `${device.customer}/${device.device}` : device.device;

  let base;
  try {
    base = baseUrl(override || fields.api_base || fields.address || fields.hostname);
  } catch (error) {
    throw new Error(
      `${error.message}\n` +
        t(
          `Enter address in ${relative(ROOT, device.file)}, ` +
            "or api_base if the interface sits elsewhere than the SSH access.",
          `Trag address in ${relative(ROOT, device.file)} ein, ` +
            "oder api_base, wenn die Schnittstelle woanders liegt als der SSH-Zugang."
        )
    );
  }

  const insecure = Boolean(force) || (fields.tls || "").toLowerCase() === "selfsigned";

  const keyRef = fields.api_key_ref;
  if (!keyRef) {
    throw new Error(
      t(
        `No kit key is stored for ${place}.\nCreate one on the device and put it into the store:\n  `,
        `Für ${place} ist kein Kit-Schlüssel hinterlegt.\nAm Gerät anlegen und in die Ablage legen:\n  `
      ) + keyCommand(device)
    );
  }
  const key = getSecret(keyRef);
  if (!key) {
    throw new Error(
      t(
        `The file names the entry ${keyRef}, it does not stand in the secret store.\n` +
          "Either it was never set or the store was changed. Create a new one:\n  ",
        `Die Akte nennt den Eintrag ${keyRef}, in der Geheimnis-Ablage steht er nicht.\n` +
          "Entweder wurde er nie gesetzt oder die Ablage wurde gewechselt. Neu anlegen:\n  "
      ) + keyCommand(device)
    );
  }

  return {
    place,
    base,
    insecure,
    keyRef,
    /** Ein Aufruf an dieses Gerät. Der Schlüssel steht nur in der Kopfzeile. */
    ask: (options) => call({ base, key, insecure, ...options }),
  };
}

/**
 * Der Kontrakt, immer zuerst.
 *
 * Was danach gilt, sagt er: das Schema für `app.json`, die Kopfzeilennamen, die
 * Grenzen des Pakets und die Liste der Endpunkte. Ein Gerät, das ihn nicht
 * kennt, ist älter als der Kontrakt selbst, und dann hört das Kit auf, statt zu
 * raten, was es dort geben könnte.
 */
export async function withContract(link, device) {
  const answer = await link.ask({ method: "GET", path: CONTRACT_PATH });
  if (!answer.ok) {
    if (answer.status === 401) {
      throw new Error(
        t(
          `${link.place} refuses the kit key (401). Was it revoked on the device?\n` +
            "Look on the device with kit-schluessel.sh liste, otherwise create a new one:\n  ",
          `${link.place} weist den Kit-Schlüssel ab (401). Wurde er am Gerät widerrufen?\n` +
            "Am Gerät nachsehen mit kit-schluessel.sh liste, sonst einen neuen anlegen:\n  "
        ) + keyCommand(device)
      );
    }
    if (answer.status === 404) {
      throw new Error(
        t(
          `${link.place} does not know ${CONTRACT_PATH}. The platform on this device is older than the contract.\n` +
            "Update the device first, then try again.",
          `${link.place} kennt ${CONTRACT_PATH} nicht. Die Plattform auf diesem Gerät ist älter als der Kontrakt.\n` +
            "Erst das Gerät aktualisieren, dann noch einmal."
        )
      );
    }
    throw new Error(
      t(
        `The contract of ${link.place} could not be read.\n${reason(answer)}`,
        `Der Kontrakt von ${link.place} ließ sich nicht lesen.\n${reason(answer)}`
      )
    );
  }

  const contract = answer.data;
  const version = checkVersion(contract);
  const keyHeader = contract?.schluessel?.kopf || undefined;

  return {
    ...link,
    contract,
    version,
    keyHeader,
    /** Nennt dieses Gerät den Weg? */
    has: (verb, path) => Boolean(findEndpoint(contract, verb, path)),
    /**
     * Ruft einen Endpunkt, aber nur, wenn der Kontrakt ihn nennt. Eine Absage
     * mit dem Satz „dieses Gerät kennt den Weg nicht" ist verständlicher als
     * eine 404 aus dem Nichts.
     */
    endpoint: (verb, path, options = {}) => {
      if (!findEndpoint(contract, verb, path)) {
        throw new Error(
          t(
            `${link.place} does not name ${verb} ${path} in its contract. ${version.text}\n` +
              "The kit calls nothing the device does not promise.",
            `${link.place} nennt ${verb} ${path} nicht in seinem Kontrakt. ${version.text}\n` +
              "Das Kit ruft nichts auf, was das Gerät nicht verspricht."
          )
        );
      }
      return link.ask({ method: verb, path, keyHeader, ...options });
    },
  };
}
