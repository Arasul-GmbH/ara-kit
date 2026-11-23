/**
 * Die Suche dieser App: was die Kopfleiste des Geräts findet, wenn jemand dort tippt.
 *
 * Das Gerät fragt jede App, die die Route `suche` in ihrem Feld `agent` nennt, mit
 * `GET suche?q=<text>&limit=<n>`, im Namen dessen, der sucht. Die Antwort ist immer dieselbe Form:
 *
 *   { "data": [ { "titel": "…", "unterzeile": "…", "art": "Vorgang", "pfad": "/?nr=17" } ] }
 *
 *   `titel`       was in der Leiste fett dasteht
 *   `unterzeile`  ein Satz darunter: Stand, wer, wann
 *   `art`         was für ein Datensatz es ist, in Worten der App ("Vorgang", "Dokument")
 *   `pfad`        wo er sich öffnet, unter der Adresse der App: beginnt mit `/`, und das Gerät
 *                 setzt `/apps/<id>/` davor, im Teststand `/apps/<id>/test/`
 *
 * **Höchstens zehn Treffer**, auch wenn `limit` mehr verlangt; ohne `limit` zehn. **Unter zwei
 * Zeichen gibt es nichts**: ein leeres oder einbuchstabiges `q` ist keine Frage, und die Antwort
 * ist eine leere Liste, kein Fehler.
 *
 * **Niemand findet, was er nicht sehen darf.** Jede Quelle sucht in derselben Sicht wie die Liste,
 * aus der der Datensatz stammt. Eine Quelle bekommt dafür den, der sucht (`wer`, aus den
 * Kopfzeilen des Geräts), und baut ihre Ablage mit ihm, so wie der Weg der Liste es tut. Ein
 * Muster, das die Liste enger zieht (Mandanten), zieht hier dieselbe Ablage enger, an einer Zeile
 * in `server.mjs`.
 *
 * Eine Quelle ist eine Funktion `(wer, begriff, grenze) => Promise<Treffer[]>`. Die Vorlage hat
 * eine, die Vorgänge; ein Muster mit eigener Liste hängt seine an (`suchquellen.push`). Der Kern
 * hier kennt weder HTTP noch SQL.
 */

/** Mehr gibt keine App zurück, egal was `limit` sagt. */
export const HOECHSTENS = 10;

/** Kürzer ist keine Frage. */
export const MINDESTENS = 2;

/** Der Suchtext, bereinigt, oder `null`, wenn er zu kurz ist. */
export function suchbegriff(q) {
  const text = String(q ?? "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
  return [...text].length >= MINDESTENS ? text : null;
}

/** Wie viele Treffer: eine ganze Zahl von 1 bis zehn, ohne Angabe zehn. */
export function grenze(limit) {
  const zahl = Number.parseInt(String(limit ?? ""), 10);
  if (!Number.isFinite(zahl) || zahl < 1) return HOECHSTENS;
  return Math.min(zahl, HOECHSTENS);
}

/** Ein Datum als Tag, wie ein Mensch es liest. */
function tag(zeitpunkt) {
  const datum = new Date(zeitpunkt);
  return Number.isNaN(datum.getTime()) ? "" : datum.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" });
}

/** Ein Vorgang als Treffer: geöffnet wird er in der Liste, mit seiner Nummer in der Adresse. */
export function vorgangAlsTreffer(vorgang) {
  const teile = [`Vorgang ${vorgang.id}`, vorgang.status, vorgang.von ? `von ${vorgang.von}` : "", tag(vorgang.gestellt)];
  return {
    titel: String(vorgang.titel ?? ""),
    unterzeile: teile.filter(Boolean).join(" · "),
    art: "Vorgang",
    pfad: `/?nr=${vorgang.id}`,
  };
}

/** Eine Quelle über eine Ablage mit `suchen`: die Ablage kommt je Anfrage, in der Sicht dessen, der sucht. */
export function vorgangsQuelle(ablageFuer) {
  return async (wer, begriff, anzahl) => (await ablageFuer(wer).suchen(begriff, anzahl)).map(vorgangAlsTreffer);
}

/**
 * Die Suche: alle Quellen, in ihrer Reihenfolge, bis die Grenze voll ist. Zurück kommt die Antwort,
 * wie die Route sie gibt.
 */
export async function suchen({ quellen, wer, q, limit }) {
  const begriff = suchbegriff(q);
  const anzahl = grenze(limit);
  if (!begriff) return { data: [] };
  const treffer = [];
  for (const quelle of quellen) {
    if (treffer.length >= anzahl) break;
    for (const eintrag of await quelle(wer, begriff, anzahl - treffer.length)) {
      if (treffer.length >= anzahl) break;
      treffer.push({
        titel: String(eintrag.titel ?? "").slice(0, 200),
        unterzeile: String(eintrag.unterzeile ?? "").slice(0, 200),
        art: String(eintrag.art ?? ""),
        pfad: String(eintrag.pfad ?? "/"),
      });
    }
  }
  return { data: treffer };
}
