/**
 * Die Ablage der Abschlüsse: was das Gerät nach der letzten Stufe eines Flows an diese App übergibt.
 *
 * Wie `vorgaenge.mjs`: das einzige SQL für diese Tabelle steht hier, der Kern darüber kennt sie nicht.
 *
 * **Die Nummer des Laufs ist der Schlüssel.** `speichern` legt eine Zeile zu einer Nummer genau einmal
 * an; ein zweiter Aufruf mit derselben Nummer ändert nichts und sagt das (`neu: false`). Das Gerät ruft
 * dieselbe Route bei „erneut" noch einmal, und ein Ergebnis, das doppelt entstünde, wäre der Fehler,
 * den dieser Schlüssel verhindert. Die Prüfung steht in der Datenbank (`ON CONFLICT DO NOTHING`) und
 * nicht davor: zwei Aufrufe, die sich kreuzen, legen trotzdem eine Zeile an.
 */

/** Was die Zeile ist, wenn niemand mehr auf die Tabelle sieht: JSON wieder als Wert. */
function alsAbschluss(zeile) {
  if (!zeile) return null;
  const lesen = (text) => (text === null || text === undefined ? null : JSON.parse(text));
  return { ...zeile, felder: lesen(zeile.felder), korrekturen: lesen(zeile.korrekturen) };
}

export function abschlussAblage(db) {
  return {
    /** Das Ergebnis eines Laufs ablegen. `neu` ist `false`, wenn zu dieser Nummer schon eines lag. */
    async speichern({ lauf, flow, vorgang, ergebnis, felder, korrekturen, angenommen }) {
      const angelegt = await db.ausfuehren(
        `INSERT INTO abschluesse (lauf, flow, vorgang, ergebnis, felder, korrekturen, angenommen)
         VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (lauf) DO NOTHING`,
        [
          String(lauf),
          flow,
          vorgang === null || vorgang === undefined ? null : String(vorgang),
          ergebnis,
          felder === null || felder === undefined ? null : JSON.stringify(felder),
          korrekturen === null || korrekturen === undefined ? null : JSON.stringify(korrekturen),
          new Date().toISOString(),
        ]
      );
      return { neu: angelegt > 0 };
    },

    /** Das Ergebnis zu einer Nummer, oder `null`. */
    async eines(lauf) {
      return alsAbschluss(await db.eine("SELECT lauf, flow, vorgang, ergebnis, felder, korrekturen, angenommen FROM abschluesse WHERE lauf = $1", [String(lauf)]));
    },

    async anzahl() {
      return Number((await db.eine("SELECT COUNT(*) AS n FROM abschluesse"))?.n ?? 0);
    },
  };
}
