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
 * Die Kontraktversion, gegen die dieses Kit gebaut ist.
 *
 * Sie ist kein Produktwert, sondern die Aussage des Kits über sich selbst:
 * „so weit kenne ich den Vertrag". Meldet ein Gerät eine andere Zahl, sagt das
 * Kit das und behauptet nichts über die Unterschiede.
 */
export const KIT_CONTRACT_VERSION = 1;

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
  if (schema === false) return [`${at(path)} ist hier nicht erlaubt.`];
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
      return [`${at(path)} ist ${typeOf(value)}, erwartet wird ${types.join(" oder ")}.`];
    }
  }

  if (schema.const !== undefined && JSON.stringify(value) !== JSON.stringify(schema.const)) {
    problems.push(`${at(path)} muss ${JSON.stringify(schema.const)} sein.`);
  }

  if (Array.isArray(schema.enum) && !schema.enum.some((o) => JSON.stringify(o) === JSON.stringify(value))) {
    problems.push(`${at(path)} muss einer von diesen Werten sein: ${schema.enum.map((o) => JSON.stringify(o)).join(", ")}.`);
  }

  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      problems.push(`${at(path)} ist zu kurz, mindestens ${schema.minLength} Zeichen.`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      problems.push(`${at(path)} ist zu lang, höchstens ${schema.maxLength} Zeichen.`);
    }
    if (schema.pattern !== undefined) {
      let expression = null;
      try {
        expression = new RegExp(schema.pattern, "u");
      } catch {
        context.unchecked.add(`Muster ${schema.pattern}`);
      }
      if (expression && !expression.test(value)) {
        problems.push(`${at(path)} passt nicht zum Muster ${schema.pattern}.`);
      }
    }
  }

  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      problems.push(`${at(path)} ist kleiner als ${schema.minimum}.`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      problems.push(`${at(path)} ist größer als ${schema.maximum}.`);
    }
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) {
      problems.push(`${at(path)} muss größer als ${schema.exclusiveMinimum} sein.`);
    }
    if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) {
      problems.push(`${at(path)} muss kleiner als ${schema.exclusiveMaximum} sein.`);
    }
    if (schema.multipleOf !== undefined && Math.abs(value % schema.multipleOf) > 1e-9) {
      problems.push(`${at(path)} muss ein Vielfaches von ${schema.multipleOf} sein.`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      problems.push(`${at(path)} braucht mindestens ${schema.minItems} Einträge.`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      problems.push(`${at(path)} hat mehr als ${schema.maxItems} Einträge.`);
    }
    if (schema.uniqueItems === true) {
      const seen = new Set(value.map((entry) => JSON.stringify(entry)));
      if (seen.size !== value.length) problems.push(`${at(path)} enthält denselben Eintrag mehrfach.`);
    }
    if (schema.items !== undefined) {
      value.forEach((entry, index) => {
        problems.push(...walk(schema.items, entry, `${path}[${index}]`, context));
      });
    }
  }

  if (typeOf(value) === "object") {
    for (const key of schema.required || []) {
      if (!(key in value)) problems.push(`${at(path ? `${path}.${key}` : key)} fehlt.`);
    }
    const declared = schema.properties || {};
    for (const [key, entry] of Object.entries(value)) {
      const next = path ? `${path}.${key}` : key;
      if (schema.propertyNames !== undefined) {
        const wrong = walk(schema.propertyNames, key, next, context);
        if (wrong.length) problems.push(`Der Name ${at(next)} ist nicht erlaubt.`);
      }
      if (key in declared) {
        problems.push(...walk(declared[key], entry, next, context));
        continue;
      }
      if (schema.additionalProperties === false) {
        problems.push(`${at(next)} kennt das Gerät nicht. Unbekannte Felder werden abgewiesen, nicht übergangen.`);
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
    if (!fits) problems.push(`${at(path)} passt zu keiner der Formen, die das Gerät unter ${key} erlaubt.`);
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
 * Drei Antworten und keine Zwischentöne: gleich, das Gerät ist neuer, das Kit
 * ist neuer. Was sich zwischen zwei Zahlen geändert hat, weiß das Kit nicht,
 * und es soll auch nicht so tun.
 */
export function checkVersion(contract) {
  const device = contract?.kontrakt;
  if (typeof device !== "number") {
    return { ok: false, state: "unknown", text: "Dieses Gerät nennt keine Kontraktversion. Es ist älter als der Kontrakt selbst." };
  }
  if (device === KIT_CONTRACT_VERSION) {
    return { ok: true, state: "same", text: `Kontraktversion ${device}, das Kit ist dafür gebaut.` };
  }
  if (device > KIT_CONTRACT_VERSION) {
    return {
      ok: false,
      state: "device-newer",
      text:
        `Das Gerät führt Kontraktversion ${device}, dieses Kit kennt ${KIT_CONTRACT_VERSION}. ` +
        "Hol den aktuellen Stand des Kits mit /init, bevor du etwas einspielst.",
    };
  }
  return {
    ok: false,
    state: "kit-newer",
    text:
      `Das Gerät führt Kontraktversion ${device}, dieses Kit ist für ${KIT_CONTRACT_VERSION} gebaut. ` +
      "Das Gerät braucht ein Update, bevor sich das Kit darauf verlassen kann.",
  };
}

/** Der Kontrakt in wenigen Zeilen, alles davon aus der Antwort des Geräts. */
export function summarize(contract) {
  const version = checkVersion(contract);
  const lines = [
    `- ${version.text}`,
    `- Systemversion des Geräts: ${contract?.arasul ?? "nicht genannt"}`,
    `- Endpunkte: ${(contract?.endpunkte || []).length}`,
    `- Kopfzeilen: ${contract?.koepfe?.benutzer ?? "?"}, ${contract?.koepfe?.rolle ?? "?"}` +
      (contract?.koepfe?.rollen ? ` (Rollen: ${contract.koepfe.rollen.join(", ")})` : ""),
    `- Schlüsselkopf: ${contract?.schluessel?.kopf ?? "?"}, Bereiche: ${(contract?.schluessel?.bereiche || []).join(", ") || "keine genannt"}`,
  ];
  const paket = contract?.paket;
  if (paket) {
    lines.push(
      `- Paket: ${paket.format ?? "?"}, gepackt mit \`${paket.packen ?? "?"}\`` +
        (paket.max_archiv_bytes ? `, höchstens ${Math.round(paket.max_archiv_bytes / 1024 / 1024)} MB` : "")
    );
  }
  return lines;
}
