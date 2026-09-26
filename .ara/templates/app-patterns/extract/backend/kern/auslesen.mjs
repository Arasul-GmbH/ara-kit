/**
 * Muster Dokument auslesen: der Kern. Ein Dokument geht an das Gerät, Felder
 * kommen zurück, die App prüft sie und legt alles ins Protokoll.
 *
 * Liegt in einer App aus der Vorlage unter `backend/kern/auslesen.mjs`. Er
 * kennt drei Anschlüsse und sonst nichts von der Welt: die Ablage der
 * Dokumente (Muster Dokumente), die Ablage der Auslesungen und das Gerät
 * (`arasul.mjs` der Vorlage, `geraet.auslesen`). Kein HTTP, kein SQL, kein
 * `process.env`, kein Weg des Geräts: den kennt die Vereinbarung.
 *
 * **Was das Gerät tut.** Es holt den Text aus der Datei, bei einem PDF mit
 * Textschicht direkt, bei einem Foto oder einem gescannten PDF über seine
 * Texterkennung, und lässt ein Sprachmodell daraus die Felder füllen, die
 * `SCHEMA` beschreibt. Das Modell sieht den Text und nicht das Bild. Welches
 * Modell es war und ob die Texterkennung lief, sagt die Antwort, und beides
 * steht im Protokoll.
 *
 * **Prüfen statt glauben.** Was das Modell liefert, ist ein Vorschlag. `pruefen`
 * hält ihn gegen das Schema: fehlt ein Pflichtfeld, hat ein Feld den falschen
 * Typ, steht es als Mangel an der Auslesung, und die Seite zeigt es. Fachliche
 * Regeln gehören dazu, in der App und nicht im Modell: ein Konto, das es im
 * Kontenrahmen nicht gibt, ein Steuersatz, der nicht zum Schlüssel passt. Das
 * Modell darf sich irren; die App darf es nicht übersehen.
 *
 * **`SCHEMA` und `ANWEISUNG` durch die eigenen Felder ersetzen.** Das Beispiel
 * liest einen Beleg: Datum, Betrag, Aussteller, Steuersatz. Das Gerät verlangt
 * ein JSON-Schema; flach und mit `required` ist es am verlässlichsten.
 *
 * **Jedes Feld trägt ein `title`**, die Beschriftung für den Menschen. Die
 * Seite zeigt sie statt des Schlüssels, und die Mängelsätze nennen sie. Ein
 * Feld ohne `title` erscheint als sein Schlüssel, und `betrag_brutto` auf dem
 * Bildschirm hält eine Steuerfachangestellte für einen Fehler der App.
 * **`ARTEN` sagt, wie ein Wert gelesen wird**: `datum` als 14.01.2025,
 * `betrag` mit zwei Nachkommastellen und der Währung aus dem Feld der Art
 * `waehrung`, `prozent` mit %. Ohne Eintrag gilt der Typ: eine Zahl in de-DE,
 * ein Text, wie er kam. `ARTEN` bleibt bei der App und geht nicht ans Gerät:
 * ins Schema gehört nur, was ein JSON-Schema kennt.
 */

export const SCHEMA = Object.freeze({
  type: "object",
  properties: {
    belegdatum: { type: "string", title: "Belegdatum", description: "Datum des Belegs als JJJJ-MM-TT" },
    betrag_brutto: {
      type: "number",
      title: "Betrag brutto",
      description: "Gesamtbetrag inklusive Steuer, Punkt als Dezimaltrenner",
    },
    waehrung: { type: "string", title: "Währung", description: "Währung als ISO-Code, etwa EUR" },
    aussteller: { type: "string", title: "Aussteller", description: "Wer den Beleg ausgestellt hat" },
    belegnummer: { type: "string", title: "Belegnummer", description: "Rechnungs- oder Belegnummer, wenn eine dasteht" },
    steuersatz: { type: "number", title: "Steuersatz", description: "Umsatzsteuersatz in Prozent, etwa 19 oder 7" },
  },
  required: ["belegdatum", "betrag_brutto", "aussteller"],
});

export const ARTEN = Object.freeze({
  belegdatum: "datum",
  betrag_brutto: "betrag",
  waehrung: "waehrung",
  steuersatz: "prozent",
});

/** Die Beschriftung eines Feldes: sein `title`, sonst der Schlüssel. */
export function titel(schema, name) {
  const wert = schema.properties?.[name]?.title;
  return typeof wert === "string" && wert.trim() ? wert.trim() : name;
}

/**
 * Die Felder für die Seite, in der Reihenfolge des Schemas: Schlüssel,
 * Beschriftung und Art. Die Seite holt sie mit der Lage und liest danach
 * jeden Wert so, wie ein Mensch ihn liest.
 */
export function beschriftungen(schema = SCHEMA, arten = ARTEN) {
  return Object.entries(schema.properties ?? {}).map(([name, regel]) => ({
    name,
    titel: titel(schema, name),
    art: arten[name] ?? (regel.type === "number" ? "zahl" : "text"),
  }));
}

export const ANWEISUNG =
  "Lies nur, was auf dem Beleg steht. Rate kein Feld: fehlt eine Angabe, lass das Feld weg. " +
  "Beträge als Zahl ohne Währungszeichen.";

/**
 * Die Felder gegen das Schema halten. Zurück kommt eine Liste von Sätzen,
 * leer, wenn nichts auszusetzen ist. Nur das, was ein flaches Schema sagt:
 * Pflicht und Typ. Alles Fachliche kommt dazu, in `fachlich` unten.
 */
export function pruefen(schema, felder) {
  const maengel = [];
  if (!felder || typeof felder !== "object" || Array.isArray(felder)) return ["Das Modell hat keine Felder geliefert."];
  for (const name of schema.required ?? []) {
    if (felder[name] === undefined || felder[name] === null || felder[name] === "") maengel.push(`${titel(schema, name)} fehlt.`);
  }
  for (const [name, regel] of Object.entries(schema.properties ?? {})) {
    const wert = felder[name];
    if (wert === undefined || wert === null) continue;
    if (regel.type === "number" && typeof wert !== "number") maengel.push(`${titel(schema, name)} ist keine Zahl: ${JSON.stringify(wert)}.`);
    if (regel.type === "string" && typeof wert !== "string") maengel.push(`${titel(schema, name)} ist kein Text: ${JSON.stringify(wert)}.`);
  }
  return maengel;
}

/**
 * Fachliche Prüfung des Beispiels, durch die eigene zu ersetzen: hier steht,
 * was ein Beleg sein muss, damit ein Mensch ihn guten Gewissens freigibt. Die
 * Sätze nennen die Beschriftung, nie den Schlüssel.
 */
export function fachlich(felder, schema = SCHEMA) {
  const maengel = [];
  if (!felder) return maengel;
  if (typeof felder.belegdatum === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(felder.belegdatum)) {
    maengel.push(`${titel(schema, "belegdatum")} lässt sich nicht als Datum lesen: ${felder.belegdatum}.`);
  }
  if (typeof felder.betrag_brutto === "number" && felder.betrag_brutto <= 0) {
    maengel.push(`${titel(schema, "betrag_brutto")} ist nicht größer als null.`);
  }
  if (typeof felder.steuersatz === "number" && ![0, 7, 19].includes(felder.steuersatz)) {
    maengel.push(`${titel(schema, "steuersatz")} ${String(felder.steuersatz).replace(".", ",")} % ist keiner der Sätze 0, 7 oder 19 %.`);
  }
  return maengel;
}

export function auslesen({ dokumente, auslesungen, geraet, schema = SCHEMA, anweisung = ANWEISUNG, arten = ARTEN }) {
  const felder = beschriftungen(schema, arten);
  return {
    /** Kann das Gerät hier auslesen? Wenn nicht, der Satz dazu. Dazu die Felder mit Beschriftung und Art. */
    lage() {
      const grund = geraet.warumKeinRahmen();
      if (grund) return { kann: false, grund, felder };
      if (!geraet.kannAuslesen()) return { kann: false, grund: "Dieses Gerät bietet das Auslesen von Dokumenten nicht an.", felder };
      return { kann: true, grund: null, felder };
    },

    /**
     * Das Protokoll eines Dokuments, die neueste Auslesung oben, oder `null`,
     * wenn es für diesen Menschen kein solches Dokument gibt. Das Protokoll
     * bleibt, wenn das Dokument geht; ein Dokument, das es nicht gibt und von
     * dem nichts im Protokoll steht, ist ein 404 und keine leere Liste. Bis
     * 0.41.0 antwortete der Weg für das Dokument eines fremden Mandanten 200.
     */
    async protokoll(dokumentId) {
      const eintraege = await auslesungen.zumDokument(dokumentId);
      if (eintraege.length) return eintraege;
      return (await dokumente.eines(dokumentId)) ? [] : null;
    },

    /**
     * Ein Dokument auslesen lassen. Zurück kommt die Auslesung, wie sie im
     * Protokoll steht, auch wenn keine Felder kamen: dann steht dort, warum.
     * `null` heißt nur: das Dokument gibt es nicht.
     */
    async anstossen(dokumentId, von) {
      const dokument = await dokumente.eines(dokumentId);
      if (!dokument) return null;
      const ergebnis = await geraet.auslesen({
        datei: dokument.inhalt,
        name: dokument.name,
        art: dokument.art,
        schema,
        anweisung,
        // Für wen gelesen wird: das Gerät schreibt den Namen zum Aufruf in
        // sein Protokoll. Ohne ihn stünde dort nur die App.
        nutzer: von || null,
      });
      const maengel = ergebnis.felder ? [...pruefen(schema, ergebnis.felder), ...fachlich(ergebnis.felder, schema)] : [];
      return await auslesungen.anlegen({
        dokument_id: dokument.id,
        // Nur mit dem Muster Belege: dessen Ablage legt die Auslesung unter den
        // Mandanten des Dokuments. Die Ablage dieses Musters kennt das Feld nicht.
        mandant: dokument.mandant ?? null,
        von: von || "unbekannt",
        zeit: new Date().toISOString(),
        modell: ergebnis.modell ?? null,
        dauer_ms: ergebnis.dauer_ms ?? null,
        texterkennung: ergebnis.texterkennung ?? null,
        zeichen: ergebnis.zeichen ?? null,
        auftrag: ergebnis.auftrag ?? null,
        felder: ergebnis.felder,
        maengel,
        fehler: ergebnis.fehler,
        roh: ergebnis.roh ?? null,
      });
    },
  };
}
