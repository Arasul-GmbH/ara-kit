/**
 * Muster Belege: die Ablage der Auslesungen, mit Mandant. Sie ersetzt
 * `backend/ablage/auslesungen.mjs` aus dem Muster Dokument auslesen.
 *
 * Wie dort kann sie anlegen und lesen, sonst nichts: ein Protokoll, das sich
 * ändern lässt, ist keines. Dazu **gilt sie für einen Namen**, wie die Ablage
 * der Dokumente daneben. Der Mandant einer Auslesung ist der ihres Dokuments,
 * und der Kern gibt ihn mit; das Dokument kam aus einer Ablage, die nur
 * zeigt, was dieser Name sieht.
 *
 * Gelesen wird am Mandanten der Auslesung und nicht über das Dokument: das
 * Protokoll bleibt, wenn das Dokument geht, und muss dann trotzdem getrennt
 * bleiben.
 */

import { nurZugeordnete } from "./mandanten.mjs";

const FELDER =
  "id, dokument_id, von, zeit, modell, dauer_ms, texterkennung, zeichen, auftrag, felder, maengel, fehler, roh, mandant";

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
    mandant: zeile.mandant === null ? null : Number(zeile.mandant),
  };
}

export function auslesungsAblage(db, benutzer = null) {
  const wer = benutzer || null;

  return {
    /** Eine neue Auslesung ins Protokoll, unter dem Mandanten ihres Dokuments. */
    async anlegen(a) {
      const mandant = Number(a.mandant);
      if (!Number.isInteger(mandant)) return null;
      return alsAuslesung(
        await db.eine(
          `INSERT INTO auslesungen (dokument_id, von, zeit, modell, dauer_ms, texterkennung, zeichen, auftrag, felder, maengel, fehler, roh, mandant)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING ${FELDER}`,
          [
            a.dokument_id,
            a.von,
            a.zeit,
            a.modell ?? null,
            a.dauer_ms ?? null,
            a.texterkennung === null || a.texterkennung === undefined ? null : a.texterkennung ? 1 : 0,
            a.zeichen ?? null,
            a.auftrag ?? null,
            a.felder ? JSON.stringify(a.felder) : null,
            JSON.stringify(a.maengel ?? []),
            a.fehler ?? null,
            a.roh ?? null,
            mandant,
          ]
        )
      );
    },

    /** Alle Auslesungen eines Dokuments, die dieser Name sieht, die neueste oben. */
    async zumDokument(dokumentId) {
      return (
        await db.abfrage(
          `SELECT ${FELDER} FROM auslesungen WHERE dokument_id = $1 AND ${nurZugeordnete("mandant", "$2")} ORDER BY id DESC`,
          [dokumentId, wer]
        )
      ).map(alsAuslesung);
    },
  };
}
