/**
 * Muster fremde Schnittstelle: eine API außerhalb des Geräts, aus dem Backend
 * der App gerufen.
 *
 * Liegt in einer App aus der Vorlage unter `backend/fremd.mjs`, als Anschluss
 * neben Ablage und Gerät. Der Kern bekommt ihn hereingereicht und weiß nicht,
 * wohin er zeigt:
 *
 *   import { fremdAusUmgebung, fremd as fremdAnschluss } from "./fremd.mjs";
 *   const auskunft = fremdAusUmgebung(process.env);
 *   const fremd = fremdAnschluss({
 *     name: "die Adressauskunft",
 *     basis: auskunft.basis,
 *     // Welche Kopfzeile der Dienst für seinen Schlüssel will, sagt seine
 *     // Dokumentation. Das hier ist die häufigste Form.
 *     kopfzeilen: auskunft.schluessel ? { authorization: `Bearer ${auskunft.schluessel}` } : {},
 *   });
 *   const vorgangsKern = kern({ ablage, geraet, fremd, name: NAME });
 *
 *   // im Kern:
 *   const { code, daten, fehler } = await fremd.rufen("GET", `/orte?plz=${encodeURIComponent(plz)}`);
 *   if (fehler) hinweis = fehler;                // an den Vorgang, nicht ins Nichts
 *   else vorgang.ort = daten.ort ?? null;
 *
 * **Aus dem Backend, nicht aus dem Browser.** Die Oberfläche einer App läuft
 * im Rahmen des Geräts, und dessen Richtlinie lässt einen Aufruf nach draußen
 * nicht zu. Dazu läge ein Schlüssel im Browser für jeden lesbar. Das Backend
 * ruft, der Browser fragt das Backend.
 *
 * **Adresse und Schlüssel stehen nicht im Quelltext.** Die Adresse steht im
 * Manifest unter `backend.umgebung` (`FREMD_BASIS`), der Schlüssel nicht:
 * das Manifest liegt im Paket und im Repository des Partners. Bis das Gerät
 * einer App einen Ort für ein Geheimnis gibt, hält die App ihn in ihrer
 * eigenen Ablage, eingetragen über eine Einstellungsseite, oder der Dienst
 * kommt ohne aus. `FREMD_SCHLUESSEL` in der Umgebung ist für den Teststand
 * über Compose gedacht, wo die Umgebung von Hand gesetzt wird.
 *
 * **Das Gerät muss den Dienst erreichen.** Ein Gerät im Netz eines Kunden
 * kommt nicht immer ins Internet, und ein Dienst antwortet nicht immer. Beides
 * ist ein Satz am Vorgang und kein Absturz: `rufen` wirft nicht, es gibt
 * `fehler` zurück. Ob die Adresse vom Gerät aus erreichbar ist, prüft man
 * dort, über `remote.mjs`, bevor man dem Kunden etwas verspricht.
 *
 * **Der Schlüssel verlässt diesen Prozess nur zum Dienst.** Er steht in keinem
 * Fehlersatz, in keinem Protokoll und in keiner Antwort.
 */

/** Adresse und Schlüssel aus der Umgebung des Containers, wie das Manifest sie nennt. */
export function fremdAusUmgebung(umgebung, { basis = "FREMD_BASIS", schluessel = "FREMD_SCHLUESSEL" } = {}) {
  return {
    basis: String(umgebung[basis] || "").replace(/\/+$/, "") || null,
    schluessel: umgebung[schluessel] || null,
  };
}

/** Der Inhalt einer Antwort, ob mit oder ohne Umschlag `data`. */
function inhalt(daten) {
  if (!daten || typeof daten !== "object") return daten;
  const innen = daten.data;
  return innen && typeof innen === "object" ? innen : daten;
}

/**
 * Der Anschluss, den der Kern bekommt. `name` ist, wie der Dienst in einem
 * Satz heißt: "die Adressauskunft ist nicht erreichbar" sagt mehr als eine
 * Adresse.
 */
export function fremd({ name = "die fremde Schnittstelle", basis, kopfzeilen = {}, zeitlimit = 10_000 }) {
  const warumNicht = () => {
    if (!basis) return `FREMD_BASIS steht nicht in der Umgebung, die App weiß nicht, wo ${name} liegt.`;
    if (!/^https?:\/\//.test(basis)) return `FREMD_BASIS ist keine http- oder https-Adresse: ${basis}.`;
    return null;
  };

  return {
    warumNicht,

    /**
     * Ein Aufruf. Zurück kommt `{ code, daten, fehler }`: `daten` ist der
     * Inhalt der Antwort als JSON, wenn es welches war, `fehler` ein Satz,
     * wenn etwas nicht stimmte. Beides zugleich gibt es nicht.
     */
    async rufen(verb, pfad, rumpf) {
      const fehlt = warumNicht();
      if (fehlt) return { code: null, daten: null, fehler: fehlt };
      const ziel = `${basis}${pfad.startsWith("/") ? pfad : `/${pfad}`}`;
      try {
        const antwort = await fetch(ziel, {
          method: verb,
          headers: {
            accept: "application/json",
            ...kopfzeilen,
            ...(rumpf !== undefined ? { "content-type": "application/json" } : {}),
          },
          body: rumpf !== undefined ? JSON.stringify(rumpf) : undefined,
          signal: AbortSignal.timeout(zeitlimit),
        });
        const text = await antwort.text();
        let daten = null;
        try {
          daten = text ? JSON.parse(text) : null;
        } catch {
          daten = null;
        }
        if (!antwort.ok) {
          return {
            code: antwort.status,
            daten: null,
            fehler: `${name} antwortete auf ${verb} ${pfad} mit ${antwort.status}${
              daten?.error?.message || daten?.message ? `: ${daten.error?.message || daten.message}` : ""
            }.`,
          };
        }
        if (text && daten === null) {
          return { code: antwort.status, daten: null, fehler: `${name} antwortete auf ${verb} ${pfad} nicht mit JSON.` };
        }
        return { code: antwort.status, daten: inhalt(daten), fehler: null };
      } catch (fehler) {
        const grund = fehler.name === "TimeoutError" ? `hat ${zeitlimit / 1000} Sekunden lang nicht geantwortet` : `war nicht erreichbar: ${fehler.message}`;
        return { code: 0, daten: null, fehler: `${name} ${grund}.` };
      }
    },
  };
}
