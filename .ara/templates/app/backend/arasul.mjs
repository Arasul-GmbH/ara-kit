/**
 * Die Naht zum Geraet: alles, was diese App ueber Arasul weiss, steht hier.
 *
 * **Diese Datei kennt keinen einzigen Wert, den das Geraet vergibt.** Nicht die
 * Namen der Umgebungswerte, in denen Adresse und Schluessel ankommen, nicht die
 * Kopfzeile des Schluessels, nicht die Wege der Schnittstelle. Alles das ist
 * zwischen Kit und Produkt vereinbart, steht im Kontrakt des Geraets, und das
 * Kit legt es beim Einspielen als `arasul.json` daneben. Eine Vorlage, die
 * diese Werte errät, findet auf einem Geraet, das sie anders nennt, nichts,
 * haelt das fuer "hier laeuft kein Arasul" und legt jeden Vorgang ohne Lauf ab.
 * Der Freigabe-Schritt wird dann nicht abgelehnt, er wird uebersprungen.
 *
 * **Der Schluessel verlaesst diesen Prozess nicht.** Er geht in eine Kopfzeile
 * und in keine Antwort, in kein Protokoll und in keine Datei.
 *
 * **Die App entscheidet nichts.** Sie startet einen Lauf und liest, wie er
 * steht. Entschieden wird in der Oberflaeche von Arasul, von einem Menschen,
 * dem die App freigegeben ist. Den Kreis dieser Menschen darf sie beim Start
 * enger ziehen, nie weiter: vier Augen, oder benannte Konten.
 *
 * **Wer angemeldet ist, steht in einer Kopfzeile**, deren Namen ebenfalls die
 * Vereinbarung nennt (`koepfe`). Die Plattform setzt sie vor dem Container und
 * loescht, was von aussen kam; faelschen kann sie niemand.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Die Vereinbarung mit dem Geraet, so wie das Kit sie beim Einspielen aus dem
 * Kontrakt geschrieben hat. Fehlt die Datei oder steht darin nichts, gibt es
 * keinen Rahmen, und das ist kein Fehler, sondern der Weg ohne Arasul.
 */
export function vereinbarungLesen(datei = join(dirname(fileURLToPath(import.meta.url)), "arasul.json")) {
  try {
    const gelesen = JSON.parse(readFileSync(datei, "utf8"));
    return gelesen && typeof gelesen === "object" ? gelesen : {};
  } catch {
    return {};
  }
}

/**
 * Der Inhalt einer Antwort, egal ob sie einen Umschlag traegt.
 *
 * Das Produkt antwortet an manchen Wegen mit `data` darum herum und an anderen
 * ohne. Wer sich auf eine der beiden Formen festlegt, wirft die andere weg, und
 * das sieht danach aus wie eine leere Antwort.
 */
export function inhalt(daten) {
  if (!daten || typeof daten !== "object") return {};
  for (const umschlag of ["data", "body", "ergebnis"]) {
    const innen = daten[umschlag];
    if (innen && typeof innen === "object") return innen;
  }
  return daten;
}

/**
 * Hat das Geraet zugestimmt?
 *
 * Gefragt wird nach der Klasse der Antwort und nicht nach einer Zahl. Welche
 * genau ein Weg zurueckgibt, ist ein Wert des Produkts: die Vorlage hat sich
 * darauf festgelegt, und beim ersten Weg, der eine andere antwortete, fiel die
 * Nummer des Laufs still unter den Tisch.
 */
export function gelungen(code) {
  return typeof code === "number" && code >= 200 && code < 300;
}

/** Ein Satz des Geraets ohne seinen Schlusspunkt: der Satz der App setzt ihn. */
function satz(text) {
  return String(text).trim().replace(/\.+$/, "");
}

/** Die Nummer eines Laufs aus einer Antwort, unter welchem der ueblichen Namen sie auch steht. */
export function laufnummer(daten) {
  const feld = inhalt(daten);
  for (const name of ["run_id", "lauf", "lauf_id", "id"]) {
    const wert = feld[name];
    if (typeof wert === "number" || (typeof wert === "string" && wert.trim())) return wert;
  }
  return null;
}

/** Eine Liste aus einer Antwort, unter ihrem Namen oder als Antwort selbst. */
export function liste(daten, name) {
  const feld = inhalt(daten);
  if (Array.isArray(feld[name])) return feld[name];
  if (Array.isArray(feld)) return feld;
  if (Array.isArray(daten)) return daten;
  return [];
}

/**
 * Das Geraet, so weit diese App es erreicht.
 *
 * `umgebung` ist `process.env` und wird uebergeben statt gelesen: damit laesst
 * sich der Fall "das Geraet hat den Wert nicht gesetzt" pruefen, ohne einen
 * Prozess zu starten.
 */
export function geraet(vereinbarung, umgebung, { name, flow }) {
  const kopf = vereinbarung.kopf || null;
  const wege = vereinbarung.wege || {};
  const basisName = vereinbarung.umgebung?.basis || null;
  const schluesselName = vereinbarung.umgebung?.schluessel || null;
  const basis = basisName ? String(umgebung[basisName] || "").replace(/\/+$/, "") : "";
  const schluessel = schluesselName ? String(umgebung[schluesselName] || "") : "";

  /**
   * Warum diese App keinen Flow starten kann, in einem Satz, oder `null`, wenn
   * sie es kann. Der Satz nennt die Stelle und nicht das Ergebnis: "ohne
   * Arasul" ist eine Aussage ueber das Geraet, "der Wert ist leer" eine ueber
   * den Container, und die beiden zu verwechseln hat den Freigabe-Schritt Tage
   * gekostet.
   */
  function warumKeinRahmen() {
    if (!basisName || !schluesselName || !kopf) {
      return (
        "Dieses Geraet hat der App keine Schnittstelle gegeben: neben dem Backend liegt keine " +
        "ausgefuellte arasul.json. Ohne Arasul haelt kein Flow an und niemand entscheidet."
      );
    }
    if (!basis) return `Das Geraet hat ${basisName} nicht in den Container gelegt, die App kennt ihre Schnittstelle nicht.`;
    if (!schluessel) return `Das Geraet hat ${schluesselName} nicht in den Container gelegt, die App hat keinen Schluessel.`;
    if (!wege.flow_starten) {
      return `Dieses Geraet nennt in seinem Kontrakt keinen Weg, einen Flow zu starten. ${name} kann ${flow} dort nicht anfordern.`;
    }
    return null;
  }

  /**
   * Ein Weg aus der Vereinbarung, mit Werten statt Platzhaltern.
   *
   * Genommen wird `relativ`, wenn er dasteht, und sonst `pfad`. Der
   * Unterschied ist der Vorsatz der aeusseren Schnittstelle: die Adresse in
   * `basis` endet darauf, und `pfad` faengt damit an. Wer beides
   * aneinanderhaengt, ruft ihn zweimal und bekommt einen 404 -- der Fund vom
   * Orin. Welcher der beiden gilt, entscheidet nicht diese Datei, sondern das
   * Geraet: das Kit hat es aus dem Kontrakt hierher geschrieben.
   */
  function weg(schalter, werte = {}) {
    const eintrag = wege[schalter];
    const roh = typeof eintrag?.relativ === "string" ? eintrag.relativ : eintrag?.pfad;
    if (!roh) return null;
    return {
      verb: eintrag.verb || "GET",
      pfad: roh.replace(/\{([a-z_]+)\}/g, (ganz, schluesselName) =>
        schluesselName in werte ? encodeURIComponent(String(werte[schluesselName])) : ganz
      ),
    };
  }

  /**
   * Ein Aufruf an die Schnittstelle des Geraets.
   *
   * Zurueck geht, was sie antwortet, und im Fehlerfall ein Satz darueber, was
   * schiefging. Ein Aufruf, der still nichts zurueckgibt, waere hier der
   * teuerste Fehler: die App saehe aus wie eine, auf der niemand entscheidet.
   */
  async function rufen(schalter, werte, rumpf) {
    const ziel = weg(schalter, werte);
    if (!ziel) return { code: null, daten: null, fehler: `Der Kontrakt dieses Geraets nennt den Weg ${schalter} nicht.` };
    try {
      const antwort = await fetch(`${basis}${ziel.pfad}`, {
        method: ziel.verb,
        headers: {
          [kopf]: schluessel,
          ...(rumpf ? { "content-type": "application/json" } : {}),
        },
        body: rumpf ? JSON.stringify(rumpf) : undefined,
        signal: AbortSignal.timeout(30_000),
      });
      const text = await antwort.text();
      let daten = null;
      try {
        daten = text ? JSON.parse(text) : null;
      } catch {
        daten = null;
      }
      return {
        code: antwort.status,
        daten,
        fehler: antwort.ok
          ? null
          : `${ziel.verb} ${ziel.pfad} wurde mit Status ${antwort.status} beantwortet${
              daten?.error?.message ? `: ${satz(daten.error.message)}` : ""
            }.`,
      };
    } catch (fehler) {
      return { code: 0, daten: null, fehler: `${ziel.verb} ${ziel.pfad} war nicht erreichbar: ${fehler.message}` };
    }
  }

  /**
   * Ein Dokument an das Geraet, als Formular mit der Datei und den Feldern.
   *
   * Der eine Aufruf dieser App, der kein JSON schickt: das Geraet nimmt die
   * Datei als `multipart/form-data`, und `fetch` baut das aus einem
   * `FormData` selbst. Er wartet, bis das Modell geantwortet hat, deshalb ist
   * die Frist hier laenger als bei den anderen.
   */
  async function senden(schalter, felder, { datei, name, art }, frist) {
    const ziel = weg(schalter);
    if (!ziel) return { code: null, daten: null, fehler: `Der Kontrakt dieses Geraets nennt den Weg ${schalter} nicht.` };
    const formular = new FormData();
    formular.append("file", new Blob([datei], { type: art || "application/octet-stream" }), name);
    for (const [feld, wert] of Object.entries(felder)) {
      if (wert !== undefined && wert !== null) formular.append(feld, typeof wert === "string" ? wert : JSON.stringify(wert));
    }
    try {
      const antwort = await fetch(`${basis}${ziel.pfad}`, {
        method: ziel.verb,
        headers: { [kopf]: schluessel },
        body: formular,
        signal: AbortSignal.timeout(frist),
      });
      const text = await antwort.text();
      let daten = null;
      try {
        daten = text ? JSON.parse(text) : null;
      } catch {
        daten = null;
      }
      return {
        code: antwort.status,
        daten,
        fehler: antwort.ok
          ? null
          : `${ziel.verb} ${ziel.pfad} wurde mit Status ${antwort.status} beantwortet${
              daten?.error?.message ? `: ${satz(daten.error.message)}` : typeof daten?.error === "string" ? `: ${satz(daten.error)}` : ""
            }.`,
      };
    } catch (fehler) {
      return { code: 0, daten: null, fehler: `${ziel.verb} ${ziel.pfad} war nicht erreichbar: ${fehler.message}` };
    }
  }

  return {
    warumKeinRahmen,

    /** Ein Satz fuer das Protokoll beim Start. Der Schluessel steht nicht darin, nur sein Name. */
    herkunft() {
      return `${name} spricht mit ${vereinbarung.geraet || "dem Geraet"} ueber ${basisName}, Schluessel aus ${schluesselName}.`;
    },

    geraetename() {
      return vereinbarung.geraet || null;
    },

    /**
     * Wer angemeldet ist, aus den Kopfzeilen der Anfrage: `{ benutzer, rolle }`.
     *
     * Die Namen der Kopfzeilen kommen aus der Vereinbarung. Node liest
     * Kopfzeilen als Latin-1, die Plattform legt Namen als UTF-8 ab; ohne den
     * Umweg stuende "JÃ¼rgen" auf dem Bildschirm. Ohne Vereinbarung ist
     * niemand angemeldet, und das ist ehrlicher als ein geratener Name.
     */
    angemeldet(kopfzeilen) {
      const lesen = (kopfname) => {
        const wert = kopfname ? kopfzeilen[String(kopfname).toLowerCase()] : null;
        return wert ? Buffer.from(String(wert), "latin1").toString("utf8") : null;
      };
      return { benutzer: lesen(vereinbarung.koepfe?.benutzer), rolle: lesen(vereinbarung.koepfe?.rolle) };
    },

    /** Kann dieses Geraet Dokumente auslesen? Dann nennt die Vereinbarung den Weg. */
    kannAuslesen() {
      return !warumKeinRahmen() && Boolean(wege.dokument_auslesen);
    },

    /**
     * Ein Dokument vom Geraet in Felder auslesen lassen.
     *
     * `schema` beschreibt die Felder als JSON-Schema, `anweisung` sagt dem
     * Modell, worauf es achten soll. Das Geraet holt den Text selbst aus der
     * Datei, auch aus einem Foto oder einem gescannten PDF, und laesst ein
     * Sprachmodell die Felder fuellen. Zurueck kommen die Felder, oder `null`
     * mit dem Satz, warum nicht, und immer das, was fuers Protokoll zaehlt:
     * welches Modell, wie lange, ob Texterkennung lief.
     *
     * Kein Modellname aus dieser App: das Geraet nimmt seine Vorgabe, und die
     * Antwort sagt, welches es war.
     */
    async auslesen({ datei, name: dateiname, art, schema, anweisung }) {
      const fehlt = warumKeinRahmen();
      if (fehlt) return { felder: null, fehler: fehlt };
      if (!wege.dokument_auslesen) {
        return { felder: null, fehler: "Dieses Geraet nennt in seinem Kontrakt keinen Weg, ein Dokument auszulesen." };
      }
      const beginn = Date.now();
      const { code, daten, fehler } = await senden(
        "dokument_auslesen",
        { schema, instructions: anweisung },
        { datei, name: dateiname, art },
        11 * 60_000
      );
      const antwort = daten && typeof daten === "object" ? daten : {};
      const protokoll = {
        modell: antwort.model ?? null,
        dauer_ms: typeof antwort.processing_time_ms === "number" ? antwort.processing_time_ms : Date.now() - beginn,
        texterkennung: antwort.metadata?.ocr_used ?? null,
        zeichen: antwort.char_count ?? null,
      };
      if (!gelungen(code)) return { felder: null, fehler, ...protokoll };
      // Das Modell hat geantwortet, aber kein JSON. Das Geraet gibt dann die
      // rohe Antwort mit; sie gehoert ins Protokoll und nicht in die Felder.
      if (!antwort.data || typeof antwort.data !== "object") {
        return {
          felder: null,
          fehler: "Das Modell hat geantwortet, aber keine Felder in der verlangten Form.",
          roh: typeof antwort.raw_response === "string" ? antwort.raw_response.slice(0, 2000) : null,
          ...protokoll,
        };
      }
      return { felder: antwort.data, fehler: null, ...protokoll };
    },

    /**
     * Einen Lauf anfordern. Zurueck kommt seine Nummer, oder der Grund, warum keine kam.
     *
     * `einreicher` und `freigabe` gehen nur mit, wenn das Geraet sie annimmt:
     * ein Geraet vor dem 25.09.2026 weist einen Start mit einem Feld, das es
     * nicht kennt, ab. Ob es sie kennt, sagt die Vereinbarung unter
     * `freigaben`, und die kommt aus dem Kontrakt.
     */
    async flowStarten(argumente, { einreicher = null, freigabe = null } = {}) {
      const kann = vereinbarung.freigaben || {};
      const rumpf = { args: argumente, wait_for_result: false };
      if (einreicher && kann.einreicher) rumpf.einreicher = einreicher;
      if (freigabe && kann.regel) rumpf.freigabe = freigabe;
      if (freigabe && !kann.regel) {
        return {
          lauf: null,
          fehler:
            "Dieser Vorgang verlangt eine Regel fuer die Freigabe, und dieses Geraet nimmt keine an. " +
            "Ohne sie entschiede jeder, dem die App freigegeben ist; darum startet kein Lauf.",
        };
      }
      const { code, daten, fehler } = await rufen("flow_starten", { flow }, rumpf);
      const nummer = gelungen(code) ? laufnummer(daten) : null;
      if (nummer !== null) return { lauf: nummer, fehler: null };
      return {
        lauf: null,
        fehler:
          fehler ||
          `Der Flow ${flow} wurde mit Status ${code} angenommen, in der Antwort stand aber keine Nummer des Laufs.`,
      };
    },

    /**
     * Die Freigaben, die dieser App gehoeren.
     *
     * Die App fragt nicht nach fremden und koennte es nicht: der Namensraum
     * steckt im Schluessel, nicht in der Anfrage.
     */
    async freigaben() {
      const { code, daten, fehler } = await rufen("freigaben_lesen");
      if (!gelungen(code)) return { eintraege: [], fehler };
      // Auf eine Form gebracht, bevor sie den Kern erreichen: unter welchem
      // Namen die Nummer des Laufs im Eintrag steht, ist ein Wert des Geraets
      // und geht den Kern nichts an.
      const eintraege = liste(daten, "freigaben").map((eintrag) => ({
        lauf: laufnummer(eintrag),
        status: eintrag.status ?? null,
        entschieden_von: eintrag.entschieden_von ?? null,
        begruendung: eintrag.begruendung ?? null,
      }));
      return { eintraege, fehler: null };
    },

    /** Wie ein Lauf steht, und was er geschrieben hat. */
    async lauf(nummer) {
      const { code, daten } = await rufen("lauf_lesen", { lauf: nummer });
      return gelungen(code) ? inhalt(daten) : null;
    },
  };
}
