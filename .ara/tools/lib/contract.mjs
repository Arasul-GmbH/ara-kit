/**
 * Der Kontrakt: was ein Gerät dem Kit verspricht, und ob eine App dazu passt.
 *
 * Das Gerät liefert unter `GET /api/v1/external/contract` das Schema für
 * `app.json`, die Regeln, die kein Schema trägt, die Kopfzeilennamen, die
 * Paketgrenzen und die Liste seiner Endpunkte. **Das ist die einzige Quelle.**
 * Hier steht deshalb kein einziger Produktwert, sondern nur die Mechanik, mit
 * der das Kit prüft, was von dort kommt.
 *
 * Reine Funktionen, ohne Netz und ohne Dateien, damit der Selbsttest sie mit
 * einem erfundenen Kontrakt prüfen kann.
 */

/**
 * Die Fassungen des Kontrakts, die dieses Kit versteht.
 *
 * Kein Produktwert, sondern die Aussage des Kits über sich selbst: „so weit
 * kenne ich den Vertrag, und das kann ich in jeder Fassung". Je Eintrag steht,
 * was das Kit ab dieser Zahl tut, nicht, was das Produkt darin geändert hat.
 * Das ist der Unterschied, der die Liste ehrlich hält: über das Gerät behauptet
 * sie nichts.
 *
 * Sie ist eine Liste und keine einzelne Zahl, weil ein Kit auf zwei Geräte
 * trifft, die nicht gleich alt sind. Ein Gerät mit einer kleineren Zahl wird
 * bedient; nur bei einer größeren fehlt dem Kit etwas, und dann soll es sagen,
 * was.
 */
import { t } from "./i18n.mjs";

export const KIT_CONTRACT_VERSIONS = Object.freeze([
  {
    version: 1,
    kann: "app.json gegen das Schema des Geräts prüfen, den Inhalt eines Ordners packen, einspielen, live schalten, zurückschalten, entfernen.",
  },
  {
    version: 2,
    kann: "Ein Paket bringt Flows mit: das Kit packt jeden Ordner mit ein, den das Manifest verspricht, und prüft vorher, dass es ihn wirklich gibt.",
  },
  {
    version: 3,
    kann: "Ein Flow darf anhalten, bis ein Mensch entscheidet: die Vorlage einer App bringt einen Flow mit Freigabe-Schritt mit, und /app fragt im Interview, an welcher Stelle das gebraucht wird.",
  },
]);

/** Die höchste Fassung, die dieses Kit versteht. */
export const KIT_CONTRACT_VERSION = Math.max(...KIT_CONTRACT_VERSIONS.map((entry) => entry.version));

/**
 * Die Felder des Kontrakts, die dieses Kit liest.
 *
 * Nennt ein Gerät ein Feld, das hier fehlt, ist das keine Vermutung über einen
 * Fehler, sondern eine Lücke im Kit: es bekommt etwas gesagt, mit dem es nichts
 * anfängt. Bei einem neueren Gerät ist das genau die Antwort auf „was fehlt".
 */
const READ_FIELDS = new Set([
  "kontrakt",
  "arasul",
  "app_json",
  "flow_frontmatter",
  "koepfe",
  "umgebung",
  "paket",
  "apps",
  "schluessel",
  "endpunkte",
]);

/** Was dieses Gerät im Kontrakt nennt und dieses Kit nicht liest. */
export function unreadFields(contract) {
  return Object.keys(contract || {}).filter((key) => !READ_FIELDS.has(key));
}

/** Der eine Pfad, den das Kit auswendig kennt. Alles andere steht im Kontrakt. */
export const CONTRACT_PATH = "/api/v1/external/contract";

// --- Ein Ausschnitt von JSON-Schema ------------------------------------------

/**
 * Geprüft wird der Ausschnitt, den das Gerät heute benutzt. Ein Schlüsselwort,
 * das hier fehlt, wird nicht stillschweigend übergangen, sondern gesammelt und
 * hinterher genannt: „das konnte ich nicht prüfen" ist eine Aussage, „gültig"
 * wäre eine Behauptung.
 */
const IGNORED = new Set([
  "$schema",
  "$id",
  "$comment",
  "title",
  "description",
  "default",
  "examples",
  "deprecated",
  "readOnly",
  "writeOnly",
  "format", // in JSON-Schema eine Anmerkung, keine Prüfung
  "$defs",
  "definitions",
]);

const HANDLED = new Set([
  "type",
  "const",
  "enum",
  "minLength",
  "maxLength",
  "pattern",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "properties",
  "required",
  "additionalProperties",
  "propertyNames",
  "items",
  "minItems",
  "maxItems",
  "uniqueItems",
  "anyOf",
  "oneOf",
  "allOf",
  "$ref",
]);

function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
  return typeof value;
}

function matchesType(value, type) {
  const actual = typeOf(value);
  if (type === "number") return actual === "number" || actual === "integer";
  return actual === type;
}

/** Ein Verweis der Form #/$defs/name auflösen. Fremde Verweise kann das Kit nicht holen. */
function resolveRef(ref, root, context) {
  if (typeof ref !== "string" || !ref.startsWith("#/")) {
    context.unchecked.add(`Verweis ${ref}`);
    return null;
  }
  let node = root;
  for (const step of ref.slice(2).split("/")) {
    const key = step.replace(/~1/g, "/").replace(/~0/g, "~");
    node = node?.[key];
    if (node === undefined) {
      context.unchecked.add(`Verweis ${ref}`);
      return null;
    }
  }
  return node;
}

const at = (path) => (path ? `\`${path}\`` : "app.json");

/**
 * Prüft einen Wert gegen ein Schema und sammelt jede Abweichung als Satz.
 * Ergebnis ist eine Liste von Meldungen, keine Ausnahme: der Mensch soll alle
 * Probleme auf einmal sehen und nicht eines nach dem anderen.
 */
function walk(schema, value, path, context) {
  const problems = [];
  if (schema === true || schema === undefined) return problems;
  if (schema === false) return [t(`${at(path)} is not allowed here.`, `${at(path)} ist hier nicht erlaubt.`)];
  if (typeof schema !== "object") return problems;

  for (const key of Object.keys(schema)) {
    if (!HANDLED.has(key) && !IGNORED.has(key)) context.unchecked.add(key);
  }

  if (schema.$ref) {
    const target = resolveRef(schema.$ref, context.root, context);
    if (target) problems.push(...walk(target, value, path, context));
  }

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => matchesType(value, t))) {
      return [
        t(
          `${at(path)} is ${typeOf(value)}, expected is ${types.join(" or ")}.`,
          `${at(path)} ist ${typeOf(value)}, erwartet wird ${types.join(" oder ")}.`
        ),
      ];
    }
  }

  if (schema.const !== undefined && JSON.stringify(value) !== JSON.stringify(schema.const)) {
    problems.push(
      t(`${at(path)} has to be ${JSON.stringify(schema.const)}.`, `${at(path)} muss ${JSON.stringify(schema.const)} sein.`)
    );
  }

  if (Array.isArray(schema.enum) && !schema.enum.some((o) => JSON.stringify(o) === JSON.stringify(value))) {
    problems.push(
      t(
        `${at(path)} has to be one of these values: ${schema.enum.map((o) => JSON.stringify(o)).join(", ")}.`,
        `${at(path)} muss einer von diesen Werten sein: ${schema.enum.map((o) => JSON.stringify(o)).join(", ")}.`
      )
    );
  }

  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      problems.push(
        t(
          `${at(path)} is too short, at least ${schema.minLength} characters.`,
          `${at(path)} ist zu kurz, mindestens ${schema.minLength} Zeichen.`
        )
      );
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      problems.push(
        t(
          `${at(path)} is too long, at most ${schema.maxLength} characters.`,
          `${at(path)} ist zu lang, höchstens ${schema.maxLength} Zeichen.`
        )
      );
    }
    if (schema.pattern !== undefined) {
      let expression = null;
      try {
        expression = new RegExp(schema.pattern, "u");
      } catch {
        context.unchecked.add(t(`pattern ${schema.pattern}`, `Muster ${schema.pattern}`));
      }
      if (expression && !expression.test(value)) {
        problems.push(
          t(
            `${at(path)} does not match the pattern ${schema.pattern}.`,
            `${at(path)} passt nicht zum Muster ${schema.pattern}.`
          )
        );
      }
    }
  }

  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      problems.push(t(`${at(path)} is smaller than ${schema.minimum}.`, `${at(path)} ist kleiner als ${schema.minimum}.`));
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      problems.push(t(`${at(path)} is larger than ${schema.maximum}.`, `${at(path)} ist größer als ${schema.maximum}.`));
    }
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) {
      problems.push(
        t(
          `${at(path)} has to be larger than ${schema.exclusiveMinimum}.`,
          `${at(path)} muss größer als ${schema.exclusiveMinimum} sein.`
        )
      );
    }
    if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) {
      problems.push(
        t(
          `${at(path)} has to be smaller than ${schema.exclusiveMaximum}.`,
          `${at(path)} muss kleiner als ${schema.exclusiveMaximum} sein.`
        )
      );
    }
    if (schema.multipleOf !== undefined && Math.abs(value % schema.multipleOf) > 1e-9) {
      problems.push(
        t(
          `${at(path)} has to be a multiple of ${schema.multipleOf}.`,
          `${at(path)} muss ein Vielfaches von ${schema.multipleOf} sein.`
        )
      );
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      problems.push(
        t(`${at(path)} needs at least ${schema.minItems} entries.`, `${at(path)} braucht mindestens ${schema.minItems} Einträge.`)
      );
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      problems.push(
        t(`${at(path)} has more than ${schema.maxItems} entries.`, `${at(path)} hat mehr als ${schema.maxItems} Einträge.`)
      );
    }
    if (schema.uniqueItems === true) {
      const seen = new Set(value.map((entry) => JSON.stringify(entry)));
      if (seen.size !== value.length) {
        problems.push(
          t(`${at(path)} contains the same entry more than once.`, `${at(path)} enthält denselben Eintrag mehrfach.`)
        );
      }
    }
    if (schema.items !== undefined) {
      value.forEach((entry, index) => {
        problems.push(...walk(schema.items, entry, `${path}[${index}]`, context));
      });
    }
  }

  if (typeOf(value) === "object") {
    for (const key of schema.required || []) {
      if (!(key in value)) {
        problems.push(
          t(`${at(path ? `${path}.${key}` : key)} is missing.`, `${at(path ? `${path}.${key}` : key)} fehlt.`)
        );
      }
    }
    const declared = schema.properties || {};
    for (const [key, entry] of Object.entries(value)) {
      const next = path ? `${path}.${key}` : key;
      if (schema.propertyNames !== undefined) {
        const wrong = walk(schema.propertyNames, key, next, context);
        if (wrong.length) problems.push(t(`The name ${at(next)} is not allowed.`, `Der Name ${at(next)} ist nicht erlaubt.`));
      }
      if (key in declared) {
        problems.push(...walk(declared[key], entry, next, context));
        continue;
      }
      if (schema.additionalProperties === false) {
        problems.push(
          t(
            `${at(next)} is unknown to the device. Unknown fields are refused, not passed over.`,
            `${at(next)} kennt das Gerät nicht. Unbekannte Felder werden abgewiesen, nicht übergangen.`
          )
        );
      } else if (typeof schema.additionalProperties === "object") {
        problems.push(...walk(schema.additionalProperties, entry, next, context));
      }
    }
  }

  if (Array.isArray(schema.allOf)) {
    for (const branch of schema.allOf) problems.push(...walk(branch, value, path, context));
  }
  for (const key of ["anyOf", "oneOf"]) {
    const branches = schema[key];
    if (!Array.isArray(branches)) continue;
    const fits = branches.some((branch) => walk(branch, value, path, context).length === 0);
    if (!fits) {
      problems.push(
        t(
          `${at(path)} matches none of the shapes the device allows under ${key}.`,
          `${at(path)} passt zu keiner der Formen, die das Gerät unter ${key} erlaubt.`
        )
      );
    }
  }

  return problems;
}

// --- Was das Kit damit macht -------------------------------------------------

/**
 * Prüft ein `app.json` gegen das Schema, das dieses eine Gerät ausgibt.
 *
 * `regeln` werden **nicht** nachgebaut. Sie stehen im Kontrakt als Sätze, weil
 * kein Schema sie trägt („mindestens eines von Frontend und Backend"), und ein
 * Kit, das sie als Programm nachbaut, hat sie ein zweites Mal, an einer Stelle,
 * die nicht mitwandert. Das Werkzeug gibt sie aus, geprüft werden sie von dem,
 * der das Manifest schreibt.
 */
export function checkManifest(contract, manifest) {
  const schema = contract?.app_json?.schema;
  if (!schema) {
    return {
      ok: false,
      problems: ["Der Kontrakt dieses Geräts enthält kein Schema für app.json."],
      rules: [],
      unchecked: [],
    };
  }
  const context = { root: schema, unchecked: new Set() };
  const problems = walk(schema, manifest, "", context);
  return {
    ok: problems.length === 0,
    problems,
    rules: contract.app_json.regeln || [],
    unchecked: [...context.unchecked],
  };
}

/**
 * Kennt dieses Gerät den Endpunkt, den das Kit gleich rufen will?
 *
 * Der Kontrakt zählt seine Endpunkte mit Verb, Pfad und dem Bereich, den ein
 * Schlüssel dafür tragen muss. Das Kit fragt hier nach, bevor es ruft: eine
 * Absage mit dem Satz „dieses Gerät kennt den Weg nicht" ist verständlicher als
 * eine 404 aus dem Nichts. Der Pfad wird ohne seine Parameter verglichen, weil
 * der Kontrakt `/apps/:id` schreibt und das Kit `/apps/beispielapp` ruft.
 */
export function findEndpoint(contract, verb, path) {
  const wanted = path.split("?")[0].split("/").filter(Boolean);
  for (const entry of contract?.endpunkte || []) {
    if (String(entry.verb).toUpperCase() !== verb.toUpperCase()) continue;
    const parts = String(entry.pfad).split("?")[0].split("/").filter(Boolean);
    if (parts.length !== wanted.length) continue;
    const fits = parts.every((part, index) => part.startsWith(":") || part === wanted[index]);
    if (fits) return entry;
  }
  return null;
}

/**
 * Passt dieses Kit zu diesem Gerät?
 *
 * Das Kit kennt die höchste Fassung, die es versteht, und nicht die eine, für
 * die es gebaut wurde. Daraus folgen drei Antworten:
 *
 * - **Gleich oder kleiner:** es arbeitet weiter. Ein älteres Gerät ist kein
 *   Fehlerfall, sondern der Normalfall in einem Bestand, den niemand an einem
 *   Tag aktualisiert. Geprüft wird ohnehin gegen das Schema dieses Geräts, und
 *   gerufen wird nur, was es in seinem Kontrakt nennt.
 * - **Größer:** es hört auf und sagt, was ihm fehlt: welche Fassungen es nicht
 *   kennt und welche Felder das Gerät nennt, die es nicht liest. Was in diesen
 *   Fassungen steht, weiß es nicht, und es tut auch nicht so.
 * - **Gar keine Zahl:** älter als der Kontrakt selbst.
 */
export function checkVersion(contract) {
  const device = contract?.kontrakt;
  const kit = KIT_CONTRACT_VERSION;
  if (typeof device !== "number") {
    return {
      ok: false,
      state: "unknown",
      text: t(
        "This device names no contract version. It is older than the contract itself.",
        "Dieses Gerät nennt keine Kontraktversion. Es ist älter als der Kontrakt selbst."
      ),
    };
  }
  if (device === kit) {
    return {
      ok: true,
      state: "same",
      text: t(
        `Contract version ${device}, this kit understands it.`,
        `Kontraktversion ${device}, dieses Kit versteht sie.`
      ),
    };
  }
  if (device < kit) {
    const ungenutzt = KIT_CONTRACT_VERSIONS.filter((entry) => entry.version > device);
    return {
      ok: true,
      state: "device-older",
      text:
        t(
          `The device carries contract version ${device}, this kit understands up to ${kit}. It works with ` +
            "what this device promises: checking happens against its schema, and only what stands in its contract gets called.",
          `Das Gerät führt Kontraktversion ${device}, dieses Kit versteht bis ${kit}. Es arbeitet mit dem, ` +
            "was dieses Gerät verspricht: geprüft wird gegen dessen Schema, gerufen wird nur, was in dessen Kontrakt steht."
        ) +
        (ungenutzt.length
          ? t(
              ` Unused here is what the kit only does from version ${ungenutzt[0].version} on: ${ungenutzt.map((e) => e.kann).join(" ")}`,
              ` Ungenutzt bleibt hier, was das Kit erst ab Fassung ${ungenutzt[0].version} tut: ${ungenutzt.map((e) => e.kann).join(" ")}`
            )
          : ""),
    };
  }
  const fremd = unreadFields(contract);
  return {
    ok: false,
    state: "device-newer",
    text:
      t(
        `The device carries contract version ${device}, this kit understands up to ${kit}. ` +
          `What stands in ${device - kit === 1 ? `version ${device}` : `versions ${kit + 1} to ${device}`} it does not know: ` +
          "it can neither pack nor check what is demanded there.",
        `Das Gerät führt Kontraktversion ${device}, dieses Kit versteht bis ${kit}. ` +
          `Was in ${device - kit === 1 ? `Fassung ${device}` : `den Fassungen ${kit + 1} bis ${device}`} steht, kennt es nicht: ` +
          "es kann weder packen noch prüfen, was dort gefordert wird."
      ) +
      (fremd.length
        ? t(
            ` The device also names ${fremd.join(", ")}, and this kit makes nothing of that.`,
            ` Das Gerät nennt außerdem ${fremd.join(", ")}, damit fängt dieses Kit nichts an.`
          )
        : "") +
      t(
        " Fetch the current version of the kit with /init before you deploy anything.",
        " Hol den aktuellen Stand des Kits mit /init, bevor du etwas einspielst."
      ),
  };
}

/**
 * Welche Ordner das Manifest verspricht, und wie sie im Manifest heißen.
 *
 * Der Kontrakt zählt die Wurzel des Pakets auf und schreibt die Ordner darin
 * als Platzhalter: ein Feld des Manifests in spitzen Klammern. Das Kit liest
 * die Platzhalter und schlägt sie im Manifest nach, statt die Feldnamen zu
 * kennen. Kommt im Kontrakt ein Ordner dazu, wie die Flows in Fassung 2, muss
 * hier nichts nachgezogen werden.
 */
export function promisedFolders(contract, manifest) {
  const found = [];
  for (const entry of contract?.paket?.wurzel || []) {
    const placeholder = String(entry).match(/^<([A-Za-z0-9_.]+)>\/?$/);
    if (!placeholder) continue;
    let node = manifest;
    for (const step of placeholder[1].split(".")) node = node?.[step];
    if (typeof node === "string" && node.trim()) found.push({ field: placeholder[1], folder: node.trim() });
  }
  return found;
}

/** Der Kontrakt in wenigen Zeilen, alles davon aus der Antwort des Geräts. */
export function summarize(contract) {
  const version = checkVersion(contract);
  const lines = [
    `- ${version.text}`,
    t(
      `- System version of the device: ${contract?.arasul ?? "not named"}`,
      `- Systemversion des Geräts: ${contract?.arasul ?? "nicht genannt"}`
    ),
    t(`- Endpoints: ${(contract?.endpunkte || []).length}`, `- Endpunkte: ${(contract?.endpunkte || []).length}`),
    t(
      `- Headers: ${contract?.koepfe?.benutzer ?? "?"}, ${contract?.koepfe?.rolle ?? "?"}`,
      `- Kopfzeilen: ${contract?.koepfe?.benutzer ?? "?"}, ${contract?.koepfe?.rolle ?? "?"}`
    ) +
      (contract?.koepfe?.rollen
        ? t(` (roles: ${contract.koepfe.rollen.join(", ")})`, ` (Rollen: ${contract.koepfe.rollen.join(", ")})`)
        : ""),
    t(
      `- Key header: ${contract?.schluessel?.kopf ?? "?"}, scopes: ${(contract?.schluessel?.bereiche || []).join(", ") || "none named"}`,
      `- Schlüsselkopf: ${contract?.schluessel?.kopf ?? "?"}, Bereiche: ${(contract?.schluessel?.bereiche || []).join(", ") || "keine genannt"}`
    ),
  ];
  const flow = contract?.flow_frontmatter;
  if (flow) {
    lines.push(
      t(
        `- Flow header: ${flow.schema ? "schema present" : "no schema"}` +
          `, ${(flow.regeln || []).length} rules for a flow out of a package`,
        `- Flow-Kopf: ${flow.schema ? "Schema vorhanden" : "kein Schema"}` +
          `, ${(flow.regeln || []).length} Regeln für einen Flow aus einem Paket`
      )
    );
  }
  const paket = contract?.paket;
  if (paket) {
    lines.push(
      t(
        `- Package: ${paket.format ?? "?"}, packed with \`${paket.packen ?? "?"}\``,
        `- Paket: ${paket.format ?? "?"}, gepackt mit \`${paket.packen ?? "?"}\``
      ) +
        (paket.max_archiv_bytes
          ? t(
              `, at most ${Math.round(paket.max_archiv_bytes / 1024 / 1024)} MB`,
              `, höchstens ${Math.round(paket.max_archiv_bytes / 1024 / 1024)} MB`
            )
          : "")
    );
  }
  return lines;
}
