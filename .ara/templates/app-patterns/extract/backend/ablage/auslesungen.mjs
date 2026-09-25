/**
 * Muster Dokument auslesen: die Ablage der Auslesungen. Das einzige SQL dazu.
 *
 * Liegt in einer App aus der Vorlage unter `backend/ablage/auslesungen.mjs`,
 * neben `dokumente.mjs` aus dem Muster Dokumente. Die Migration dazu ist
 * `003-auslesungen.sql`.
 *
 * **Diese Ablage kann anlegen und lesen, sonst nichts.** Es gibt kein
 * `fortschreiben` und kein `loeschen`: eine Auslesung ist ein Eintrag im
 * Protokoll, und ein Protokoll, das sich ändern lässt, ist keines. Wer eine
 * Auslesung verwirft, legt eine neue an.
 *
 * JSON steht in der Tabelle als Text, und hier wird es gewandelt, in beide
 * Richtungen: der Kern sieht Felder als Objekt und Mängel als Liste.
 */

const FELDER = "id, dokument_id, von, zeit, modell, dauer_ms, texterkennung, zeichen, felder, maengel, fehler, roh";

function json(text) {
  if (text === null || text === undefined) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function alsAuslesung(zeile) {
  if (!zeile) return null;
  return {
    ...zeile,
    id: Number(zeile.id),
    dokument_id: Number(zeile.dokument_id),
    dauer_ms: zeile.dauer_ms === null ? null : Number(zeile.dauer_ms),
    zeichen: zeile.zeichen === null ? null : Number(zeile.zeichen),
    texterkennung: zeile.texterkennung === null ? null : Number(zeile.texterkennung) === 1,
    felder: json(zeile.felder),
    maengel: json(zeile.maengel) ?? [],
  };
}

export function auslesungsAblage(db) {
  return {
    /** Eine neue Auslesung ins Protokoll. Zurück kommt sie, wie sie jetzt dort steht. */
    async anlegen(a) {
      return alsAuslesung(
        await db.eine(
          `INSERT INTO auslesungen (dokument_id, von, zeit, modell, dauer_ms, texterkennung, zeichen, felder, maengel, fehler, roh)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING ${FELDER}`,
          [
            a.dokument_id,
            a.von,
            a.zeit,
            a.modell ?? null,
            a.dauer_ms ?? null,
            a.texterkennung === null || a.texterkennung === undefined ? null : a.texterkennung ? 1 : 0,
            a.zeichen ?? null,
            a.felder ? JSON.stringify(a.felder) : null,
            JSON.stringify(a.maengel ?? []),
            a.fehler ?? null,
            a.roh ?? null,
          ]
        )
      );
    },

    /** Alle Auslesungen eines Dokuments, die neueste oben. */
    async zumDokument(dokumentId) {
      return (
        await db.abfrage(`SELECT ${FELDER} FROM auslesungen WHERE dokument_id = $1 ORDER BY id DESC`, [dokumentId])
      ).map(alsAuslesung);
    },
  };
}
