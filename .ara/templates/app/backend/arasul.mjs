/**
 * Die Naht zum Gerät: alles, was diese App über Arasul weiß, steht hier.
 *
 * **Diese Datei kennt keinen einzigen Wert, den das Gerät vergibt.** Nicht die
 * Namen der Umgebungswerte, in denen Adresse und Schlüssel ankommen, nicht die
 * Kopfzeile des Schlüssels, nicht die Wege der Schnittstelle. Alles das ist
 * zwischen Kit und Produkt vereinbart, steht im Kontrakt des Geräts, und das
 * Kit legt es beim Einspielen als `arasul.json` daneben. Eine Vorlage, die
 * diese Werte errät, findet auf einem Gerät, das sie anders nennt, nichts,
 * hält das für "hier läuft kein Arasul" und legt jeden Vorgang ohne Lauf ab.
 * Der Freigabe-Schritt wird dann nicht abgelehnt, er wird übersprungen.
 *
 * **Der Schlüssel verlässt diesen Prozess nicht.** Er geht in eine Kopfzeile
 * und in keine Antwort, in kein Protokoll und in keine Datei.
 *
 * **Die App entscheidet nichts.** Sie startet einen Lauf und liest, wie er
 * steht. Entschieden wird in der Oberfläche von Arasul, von einem Menschen,
 * dem die App freigegeben ist. Den Kreis dieser Menschen darf sie beim Start
 * enger ziehen, nie weiter: vier Augen, oder benannte Konten.
 *
 * **Wer angemeldet ist, steht in einer Kopfzeile**, deren Namen ebenfalls die
 * Vereinbarung nennt (`koepfe`). Die Plattform setzt sie vor dem Container und
 * löscht, was von außen kam; fälschen kann sie niemand.
 *
 * **Jeder Modellaufruf nennt den Menschen, für den er geschieht.** Das
 * KI-Protokoll des Geräts erfasst genau die Wege, die die Vereinbarung unter
 * `protokoll.wege` nennt: die äußere Schnittstelle, also `auslesen`, `fragen`
 * und ein eigener Aufruf über `fuer`. Dort steht jeder Aufruf mit App, Weg,
 * Modell und Dauer, den Menschen aber nur, wenn die App ihn nennt: wer
 * `auslesen` oder `fragen` ruft, gibt `nutzer` mit, den Namen aus
 * `angemeldet`. **Der Modellschritt eines Flows steht nicht darin.** Er
 * gehört zum Lauf, und der Mensch eines Laufs ist sein Einreicher, den
 * `flowStarten` mitgibt; nachlesen lässt er sich am Lauf in der Oberfläche
 * von Arasul, nicht im KI-Protokoll. Wer einer Kanzlei eine
 * Verfahrensdokumentation schreibt, schreibt beides so hin.
 *
 * **Ein Auslesen geht nicht verloren, weil es lange rechnet.** Wartet das
 * Gerät nicht mehr, antwortet es mit dem Auftrag und rechnet weiter; die App
 * holt das Ergebnis auf dem Weg ab, den die Vereinbarung unter
 * `wege.dokument_abholen` nennt, und schickt die Datei kein zweites Mal. Zum
 * Gerät gehen höchstens so viele Auslesungen zugleich, wie die Vereinbarung
 * unter `warten.gleichzeitig` erlaubt, ohne Angabe eine; die übrigen warten
 * hier in der Reihe und nicht in der Warteschlange des Geräts, die alle Apps
 * teilen.
 *
 * **Ein Fehler des Geräts erreicht den Menschen als Satz, nie als HTTP-Zeile.**
 * `fehler` sagt je Klasse, was los ist und was jetzt hilft: ausgelastet, bitte
 * erneut; nicht freigegeben; das Modell ist gescheitert. Verb, Weg, Status und
 * die Nachricht des Geräts stehen in `technisch` und gehen ins Protokoll des
 * Containers, für den, der die App betreut. Eine Steuerfachangestellte, die
 * „wurde mit Status 408 beantwortet" liest, hält die App für kaputt, auch wenn
 * sie richtig rechnet.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Die Vereinbarung mit dem Gerät, so wie das Kit sie beim Einspielen aus dem
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
 * Der Inhalt einer Antwort, egal ob sie einen Umschlag trägt.
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
 * Hat das Gerät zugestimmt?
 *
 * Gefragt wird nach der Klasse der Antwort und nicht nach einer Zahl. Welche
 * genau ein Weg zurückgibt, ist ein Wert des Produkts: die Vorlage hat sich
 * darauf festgelegt, und beim ersten Weg, der eine andere antwortete, fiel die
 * Nummer des Laufs still unter den Tisch.
 */
export function gelungen(code) {
  return typeof code === "number" && code >= 200 && code < 300;
}

/** Ein Satz des Geräts ohne seinen Schlusspunkt: der Satz der App setzt ihn. */
function satz(text) {
  return String(text).trim().replace(/\.+$/, "");
}

/** Was das Gerät zu einem Fehler geschrieben hat, in welcher der üblichen Formen auch. */
function nachricht(daten) {
  if (typeof daten?.error?.message === "string") return satz(daten.error.message);
  if (typeof daten?.error === "string") return satz(daten.error);
  if (typeof daten?.message === "string") return satz(daten.message);
  return null;
}

/**
 * Der Satz für den Menschen zu einer Antwort, die nicht gelang, je Klasse.
 *
 * `tun` ist das, was der Mensch wiederholen würde, als Verb: „auslesen",
 * „fragen", „einreichen". `modell` sagt, ob hinter dem Weg ein Modell
 * arbeitet: nur dann heißt ein 5xx, dass das Modell gescheitert ist. `0`
 * heißt, es kam keine Antwort, `abgelaufen`, dass die Frist dieser App
 * vorbei war. Kein Status, keine Nachricht des Geräts: die stehen in
 * `technisch`.
 */
export function menschensatz(code, { tun = "es", modell = false, abgelaufen = false } = {}) {
  const erneut = tun === "es" ? "Bitte erneut versuchen." : `Bitte erneut ${tun}.`;
  if (code === 408 || code === 504 || code === 429 || (code === 0 && abgelaufen)) {
    return `Das Gerät war ausgelastet und hat nicht rechtzeitig geantwortet. ${erneut}`;
  }
  if (code === 0) return `Das Gerät war nicht erreichbar. ${erneut}`;
  if (code === 401) return "Das Gerät hat den Schlüssel dieser App nicht angenommen. Das richtet der Administrator.";
  if (code === 403) {
    return tun === "es"
      ? "Der Administrator hat das für diese App nicht freigegeben."
      : `Der Administrator hat das ${tun[0].toUpperCase()}${tun.slice(1)} für diese App nicht freigegeben.`;
  }
  if (code === 413) return "Die Datei ist dem Gerät zu groß.";
  if (typeof code === "number" && code >= 500) {
    return modell
      ? `Das Modell ist am Gerät gescheitert. ${erneut} Bleibt es dabei, gehört das zum Administrator.`
      : `Das Gerät hat einen Fehler gemeldet. ${erneut} Bleibt es dabei, gehört das zum Administrator.`;
  }
  return "Das Gerät hat die Anfrage abgelehnt. Das richtet, wer die App betreut.";
}

/**
 * Die technische Zeile zu einem Fehler: ins Protokoll des Containers, nie in
 * eine Antwort an die Oberfläche. Der Schlüssel steht nicht darin.
 */
function protokollieren(technisch) {
  process.stderr.write(`arasul: ${technisch}\n`);
}

/** Die Nummer eines Laufs aus einer Antwort, unter welchem der üblichen Namen sie auch steht. */
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

/** Wie oft die App ein Auslesen abholt, das noch rechnet. */
export const ABHOLEN_ALLE_MS = 5_000;

/**
 * Eine Reihe, die höchstens `grenze` Aufgaben zugleich laufen lässt. Die
 * übrigen warten, in der Reihenfolge, in der sie kamen.
 */
export function zugleich(grenze) {
  let laufend = 0;
  const wartend = [];
  return async function inDerReihe(aufgabe) {
    if (laufend >= grenze) await new Promise((dran) => wartend.push(dran));
    else laufend += 1;
    try {
      return await aufgabe();
    } finally {
      const naechste = wartend.shift();
      if (naechste) naechste();
      else laufend -= 1;
    }
  };
}

/**
 * Das Gerät, so weit diese App es erreicht.
 *
 * `umgebung` ist `process.env` und wird übergeben statt gelesen: damit lässt
 * sich der Fall "das Gerät hat den Wert nicht gesetzt" prüfen, ohne einen
 * Prozess zu starten.
 */
export function geraet(vereinbarung, umgebung, { name, flow, abholenAlleMs = ABHOLEN_ALLE_MS }) {
  const kopf = vereinbarung.kopf || null;
  const wege = vereinbarung.wege || {};
  const basisName = vereinbarung.umgebung?.basis || null;
  const schluesselName = vereinbarung.umgebung?.schluessel || null;
  const basis = basisName ? String(umgebung[basisName] || "").replace(/\/+$/, "") : "";
  const schluessel = schluesselName ? String(umgebung[schluesselName] || "") : "";
  const protokoll = vereinbarung.protokoll?.kopf ? vereinbarung.protokoll : null;
  const warten = vereinbarung.warten || {};
  const reihe = zugleich(Number.isInteger(warten.gleichzeitig) && warten.gleichzeitig > 0 ? warten.gleichzeitig : 1);

  /**
   * Die Kopfzeile mit dem Menschen, für den die App ein Modell fragt, oder
   * nichts.
   *
   * Nur an einen Weg, den das Gerät als Modellaufruf protokolliert: ein Weg,
   * der nichts protokolliert, braucht den Namen nicht. Der Name geht so, wie
   * die Plattform ihn der App gegeben hat: `angemeldet` hat die Bytes als
   * UTF-8 gelesen, hier werden sie wieder zu denselben Bytes. Ohne den
   * Rückweg käme „Jürgen" als ein anderer Name an, und das Gerät wiese ihn
   * mit 400 ab.
   */
  function fuerWen(pfad, nutzer) {
    if (!protokoll || !nutzer) return {};
    const ohneAnfrage = pfad.split("?")[0];
    if (!(protokoll.wege || []).some((w) => ohneAnfrage.endsWith(`/${w}`))) return {};
    return namensKopf(nutzer);
  }

  function namensKopf(nutzer) {
    return { [protokoll.kopf]: Buffer.from(String(nutzer), "utf8").toString("latin1") };
  }

  /**
   * Warum diese App keinen Flow starten kann, in einem Satz, oder `null`, wenn
   * sie es kann. Der Satz nennt die Stelle und nicht das Ergebnis: "ohne
   * Arasul" ist eine Aussage über das Gerät, "der Wert ist leer" eine über
   * den Container, und die beiden zu verwechseln hat den Freigabe-Schritt Tage
   * gekostet.
   */
  function warumKeinRahmen() {
    if (!basisName || !schluesselName || !kopf) {
      return (
        "Dieses Gerät hat der App keine Schnittstelle gegeben: neben dem Backend liegt keine " +
        "ausgefüllte arasul.json. Ohne Arasul hält kein Flow an und niemand entscheidet."
      );
    }
    if (!basis) return `Das Gerät hat ${basisName} nicht in den Container gelegt, die App kennt ihre Schnittstelle nicht.`;
    if (!schluessel) return `Das Gerät hat ${schluesselName} nicht in den Container gelegt, die App hat keinen Schlüssel.`;
    if (!wege.flow_starten) {
      return `Dieses Gerät nennt in seinem Kontrakt keinen Weg, einen Flow zu starten. ${name} kann ${flow} dort nicht anfordern.`;
    }
    return null;
  }

  /**
   * Ein Weg aus der Vereinbarung, mit Werten statt Platzhaltern.
   *
   * Genommen wird `relativ`, wenn er dasteht, und sonst `pfad`. Der
   * Unterschied ist der Vorsatz der äußeren Schnittstelle: die Adresse in
   * `basis` endet darauf, und `pfad` fängt damit an. Wer beides
   * aneinanderhängt, ruft ihn zweimal und bekommt einen 404 -- der Fund vom
   * Orin. Welcher der beiden gilt, entscheidet nicht diese Datei, sondern das
   * Gerät: das Kit hat es aus dem Kontrakt hierher geschrieben.
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
   * Ein Aufruf an die Schnittstelle des Geräts.
   *
   * Zurück geht, was sie antwortet, und im Fehlerfall ein Satz darüber, was
   * schiefging. Ein Aufruf, der still nichts zurückgibt, wäre hier der
   * teuerste Fehler: die App sähe aus wie eine, auf der niemand entscheidet.
   */
  async function rufen(schalter, werte, rumpf, { nutzer = null, frist = 30_000, tun = "es", modell = false } = {}) {
    const ziel = weg(schalter, werte);
    if (!ziel) return { code: null, daten: null, fehler: `Der Kontrakt dieses Geräts nennt den Weg ${schalter} nicht.` };
    try {
      const antwort = await fetch(`${basis}${ziel.pfad}`, {
        method: ziel.verb,
        headers: {
          [kopf]: schluessel,
          ...fuerWen(ziel.pfad, nutzer),
          ...(rumpf ? { "content-type": "application/json" } : {}),
        },
        body: rumpf ? JSON.stringify(rumpf) : undefined,
        signal: AbortSignal.timeout(frist),
      });
      const text = await antwort.text();
      let daten = null;
      try {
        daten = text ? JSON.parse(text) : null;
      } catch {
        daten = null;
      }
      return beantwortet(ziel, antwort.status, daten, { tun, modell });
    } catch (fehler) {
      return unbeantwortet(ziel, fehler, { tun, modell });
    }
  }

  /**
   * Eine Antwort in der Form, die jeder Aufruf zurückgibt: `fehler` für den
   * Menschen, `technisch` für das Protokoll. Beide `null`, wenn es gelang.
   */
  function beantwortet(ziel, code, daten, { tun, modell }) {
    if (gelungen(code)) return { code, daten, fehler: null, technisch: null };
    const grund = nachricht(daten);
    const technisch = `${ziel.verb} ${ziel.pfad} wurde mit Status ${code} beantwortet${grund ? `: ${grund}` : ""}.`;
    protokollieren(technisch);
    return { code, daten, fehler: menschensatz(code, { tun, modell }), technisch };
  }

  /** Keine Antwort: das Netz, oder die Frist dieser App war vorbei. */
  function unbeantwortet(ziel, fehler, { tun, modell }) {
    const abgelaufen = fehler?.name === "TimeoutError";
    const technisch = `${ziel.verb} ${ziel.pfad} ${abgelaufen ? "hat die Frist überschritten" : `war nicht erreichbar: ${fehler?.message}`}`;
    protokollieren(technisch);
    return { code: 0, daten: null, fehler: menschensatz(0, { tun, modell, abgelaufen }), technisch };
  }

  /**
   * Ein Dokument an das Gerät, als Formular mit der Datei und den Feldern.
   *
   * Der eine Aufruf dieser App, der kein JSON schickt: das Gerät nimmt die
   * Datei als `multipart/form-data`, und `fetch` baut das aus einem
   * `FormData` selbst. Er wartet, bis das Modell geantwortet hat, deshalb ist
   * die Frist hier länger als bei den anderen.
   */
  async function senden(schalter, felder, { datei, name, art }, frist, nutzer = null, { tun = "es", modell = false } = {}) {
    const ziel = weg(schalter);
    if (!ziel) return { code: null, daten: null, fehler: `Der Kontrakt dieses Geräts nennt den Weg ${schalter} nicht.` };
    const formular = new FormData();
    formular.append("file", new Blob([datei], { type: art || "application/octet-stream" }), name);
    for (const [feld, wert] of Object.entries(felder)) {
      if (wert !== undefined && wert !== null) formular.append(feld, typeof wert === "string" ? wert : JSON.stringify(wert));
    }
    try {
      const antwort = await fetch(`${basis}${ziel.pfad}`, {
        method: ziel.verb,
        headers: { [kopf]: schluessel, ...fuerWen(ziel.pfad, nutzer) },
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
      return beantwortet(ziel, antwort.status, daten, { tun, modell });
    } catch (fehler) {
      return unbeantwortet(ziel, fehler, { tun, modell });
    }
  }

  /**
   * Eine Auslesung am Gerät, von der Datei bis zum Ergebnis.
   *
   * `wartezeit` sind die Sekunden, die das Gerät auf das Modell wartet, bevor
   * es mit dem Auftrag antwortet; ohne Angabe gilt seine Vorgabe. Antwortet
   * es so, holt die App ab, bis das Ergebnis da ist, höchstens so lange, wie
   * das Gerät es aufbewahrt.
   */
  async function auslesenJetzt({ datei, dateiname, art, schema, anweisung, nutzer, wartezeit }) {
    const beginn = Date.now();
    const felder = { schema, instructions: anweisung };
    if (wartezeit) felder.timeout_seconds = String(wartezeit);
    // Eine Minute länger, als das Gerät höchstens wartet: sonst bricht die App
    // ab, und mit ihr das Gerät den Auftrag.
    const frist = warten.hoechstens_sekunden ? (warten.hoechstens_sekunden + 60) * 1000 : 11 * 60_000;
    let { code, daten, fehler, technisch } = await senden(
      "dokument_auslesen",
      felder,
      { datei, name: dateiname, art },
      frist,
      nutzer,
      { tun: "auslesen", modell: true }
    );
    if (laeuftNoch(code, daten)) ({ code, daten, fehler, technisch } = await abholen(daten.job_id));
    const antwort = daten && typeof daten === "object" ? daten : {};
    const protokoll = {
      modell: antwort.model ?? null,
      dauer_ms: typeof antwort.processing_time_ms === "number" ? antwort.processing_time_ms : Date.now() - beginn,
      texterkennung: antwort.metadata?.ocr_used ?? null,
      zeichen: antwort.char_count ?? null,
      // Derselbe Wert steht im Protokoll des Geräts: damit findet sich zu
      // einem Vorschlag der Aufruf, der ihn gemacht hat.
      auftrag: antwort.job_id ?? null,
    };
    if (!gelungen(code)) return { felder: null, fehler, technisch, ...protokoll };
    // Das Modell hat geantwortet, aber kein JSON. Das Gerät gibt dann die
    // rohe Antwort mit; sie gehört ins Protokoll und nicht in die Felder.
    if (!antwort.data || typeof antwort.data !== "object") {
      return {
        felder: null,
        fehler: "Das Modell hat geantwortet, aber keine Felder in der verlangten Form.",
        roh: typeof antwort.raw_response === "string" ? antwort.raw_response.slice(0, 2000) : null,
        ...protokoll,
      };
    }
    return { felder: antwort.data, fehler: null, ...protokoll };
  }

  /** Das Gerät rechnet noch: 202 mit dem Stand `laeuft` und einem Auftrag. */
  function laeuftNoch(code, daten) {
    return code === (warten.status || 202) && daten?.status === "laeuft" && typeof daten.job_id === "string";
  }

  /**
   * Ein Auslesen abholen, das nach der Wartezeit des Geräts noch rechnete.
   *
   * Gefragt wird alle fünf Sekunden, so lange, wie das Gerät das Ergebnis
   * aufbewahrt. Die Antwort hat danach dieselbe Form wie eine, auf die die
   * App gewartet hätte. Ohne Weg zum Abholen sagt sie, dass das Ergebnis am
   * Gerät liegt und hier nicht ankommt.
   */
  async function abholen(auftrag) {
    if (!wege.dokument_abholen) {
      protokollieren(`Auftrag ${auftrag} rechnet noch, und der Kontrakt nennt keinen Weg, ihn abzuholen.`);
      return {
        code: 0,
        daten: { job_id: auftrag },
        fehler: "Das Gerät rechnet noch und kann das Ergebnis dieser App nicht nachreichen. Bitte später erneut auslesen.",
        technisch: null,
      };
    }
    const ende = Date.now() + (warten.aufbewahrt_sekunden || 3600) * 1000;
    for (;;) {
      await new Promise((weiter) => setTimeout(weiter, abholenAlleMs));
      const antwort = await rufen("dokument_abholen", { auftrag }, null, { frist: 60_000, tun: "auslesen", modell: true });
      if (!laeuftNoch(antwort.code, antwort.daten) && antwort.code !== 0) return antwort;
      if (Date.now() > ende) {
        protokollieren(`Auftrag ${auftrag} war nach der Aufbewahrungszeit des Geräts nicht fertig.`);
        return { ...antwort, code: 0, fehler: menschensatz(0, { tun: "auslesen", modell: true, abgelaufen: true }) };
      }
    }
  }

  return {
    warumKeinRahmen,

    /** Ein Satz für das Protokoll beim Start. Der Schlüssel steht nicht darin, nur sein Name. */
    herkunft() {
      return `${name} spricht mit ${vereinbarung.geraet || "dem Geraet"} über ${basisName}, Schlüssel aus ${schluesselName}.`;
    },

    geraetename() {
      return vereinbarung.geraet || null;
    },

    /**
     * Wer angemeldet ist, aus den Kopfzeilen der Anfrage: `{ benutzer, rolle }`.
     *
     * Die Namen der Kopfzeilen kommen aus der Vereinbarung. Node liest
     * Kopfzeilen als Latin-1, die Plattform legt Namen als UTF-8 ab; ohne den
     * Umweg stünde "JÃ¼rgen" auf dem Bildschirm. Ohne Vereinbarung ist
     * niemand angemeldet, und das ist ehrlicher als ein geratener Name.
     */
    angemeldet(kopfzeilen) {
      const lesen = (kopfname) => {
        const wert = kopfname ? kopfzeilen[String(kopfname).toLowerCase()] : null;
        return wert ? Buffer.from(String(wert), "latin1").toString("utf8") : null;
      };
      return { benutzer: lesen(vereinbarung.koepfe?.benutzer), rolle: lesen(vereinbarung.koepfe?.rolle) };
    },

    /** Kann dieses Gerät Dokumente auslesen? Dann nennt die Vereinbarung den Weg. */
    kannAuslesen() {
      return !warumKeinRahmen() && Boolean(wege.dokument_auslesen);
    },

    /**
     * Ein Dokument vom Gerät in Felder auslesen lassen.
     *
     * `schema` beschreibt die Felder als JSON-Schema, `anweisung` sagt dem
     * Modell, worauf es achten soll. Das Gerät holt den Text selbst aus der
     * Datei, auch aus einem Foto oder einem gescannten PDF, und lässt ein
     * Sprachmodell die Felder füllen. Zurück kommen die Felder, oder `null`
     * mit dem Satz, warum nicht, und immer das, was fürs Protokoll zählt:
     * welches Modell, wie lange, ob Texterkennung lief.
     *
     * Kein Modellname aus dieser App: das Gerät nimmt seine Vorgabe, und die
     * Antwort sagt, welches es war.
     */
    async auslesen({ datei, name: dateiname, art, schema, anweisung, nutzer = null, wartezeit = null }) {
      const fehlt = warumKeinRahmen();
      if (fehlt) return { felder: null, fehler: fehlt };
      if (!wege.dokument_auslesen) {
        return { felder: null, fehler: "Dieses Gerät nennt in seinem Kontrakt keinen Weg, ein Dokument auszulesen." };
      }
      return reihe(() => auslesenJetzt({ datei, dateiname, art, schema, anweisung, nutzer, wartezeit }));
    },

    /** Kann dieses Gerät ein Modell direkt fragen? Dann nennt die Vereinbarung den Weg. */
    kannFragen() {
      return !warumKeinRahmen() && Boolean(wege.modell_fragen);
    },

    /**
     * Ein Modell fragen, auf Wunsch mit Bildern, und auf die Antwort warten.
     *
     * `bilder` sind Base64-Zeichenketten, PNG oder JPEG; dann nimmt das Gerät
     * ein Modell, das Bilder liest. Wie viele und wie groß, und was ohne
     * `modell` geschieht, sagt der Kontrakt unter `bilder`
     * (`app.mjs --contract`). `modell` bleibt leer, solange kein Mensch am
     * Gerät des Kunden gemessen hat, welches Modell besser liest.
     */
    async fragen({ prompt, bilder = null, modell = null, nutzer = null }) {
      const fehlt = warumKeinRahmen();
      if (fehlt) return { antwort: null, fehler: fehlt };
      if (!wege.modell_fragen) {
        return { antwort: null, fehler: "Dieses Gerät nennt in seinem Kontrakt keinen Weg, ein Modell zu fragen." };
      }
      const beginn = Date.now();
      const rumpf = { prompt, wait_for_result: true };
      if (modell) rumpf.model = modell;
      if (bilder?.length) rumpf.images = bilder;
      const { code, daten, fehler, technisch } = await rufen("modell_fragen", {}, rumpf, {
        nutzer,
        frist: 11 * 60_000,
        tun: "fragen",
        modell: true,
      });
      const feld = inhalt(daten);
      return {
        antwort: gelungen(code) && typeof feld.response === "string" ? feld.response : null,
        fehler: gelungen(code) ? (typeof feld.response === "string" ? null : "Das Modell hat keine Antwort gegeben.") : fehler,
        technisch,
        modell: feld.model ?? null,
        dauer_ms: typeof feld.processing_time_ms === "number" ? feld.processing_time_ms : Date.now() - beginn,
        auftrag: feld.job_id ?? null,
      };
    },

    /**
     * Für einen eigenen Modellaufruf, etwa über `/v1` mit einem OpenAI-Client:
     * die Kopfzeile und das Feld, die den Menschen nennen, so wie die
     * Vereinbarung sie nennt. Leer, wenn das Gerät keines nennt.
     */
    fuer(nutzer) {
      if (!protokoll || !nutzer) return { kopfzeilen: {}, openai: {} };
      return {
        kopfzeilen: namensKopf(nutzer),
        openai: protokoll.feld_openai ? { [protokoll.feld_openai]: String(nutzer) } : {},
      };
    },

    /**
     * Einen Lauf anfordern. Zurück kommt seine Nummer, oder der Grund, warum keine kam.
     *
     * `einreicher` und `freigabe` gehen nur mit, wenn das Gerät sie annimmt:
     * ein Gerät vor dem 25.09.2026 weist einen Start mit einem Feld, das es
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
            "Dieser Vorgang verlangt eine Regel für die Freigabe, und dieses Gerät nimmt keine an. " +
            "Ohne sie entschiede jeder, dem die App freigegeben ist; darum startet kein Lauf.",
        };
      }
      const { code, daten, fehler, technisch } = await rufen("flow_starten", { flow }, rumpf, { tun: "einreichen" });
      const nummer = gelungen(code) ? laufnummer(daten) : null;
      if (nummer !== null) return { lauf: nummer, fehler: null, technisch: null };
      if (fehler) return { lauf: null, fehler, technisch };
      const zeile = `Der Flow ${flow} wurde mit Status ${code} angenommen, in der Antwort stand aber keine Nummer des Laufs.`;
      protokollieren(zeile);
      return {
        lauf: null,
        fehler: "Das Gerät hat den Vorgang angenommen, aber nicht gesagt, unter welcher Nummer er läuft. Das richtet, wer die App betreut.",
        technisch: zeile,
      };
    },

    /**
     * Die Freigaben, die dieser App gehören.
     *
     * Die App fragt nicht nach fremden und könnte es nicht: der Namensraum
     * steckt im Schlüssel, nicht in der Anfrage.
     */
    async freigaben() {
      const { code, daten, fehler } = await rufen("freigaben_lesen");
      if (!gelungen(code)) return { eintraege: [], fehler };
      // Auf eine Form gebracht, bevor sie den Kern erreichen: unter welchem
      // Namen die Nummer des Laufs im Eintrag steht, ist ein Wert des Geräts
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
