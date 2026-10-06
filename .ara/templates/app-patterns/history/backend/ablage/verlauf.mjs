/**
 * Muster Verlauf: die Ablage. Liegt in einer App aus der Vorlage unter
 * `backend/ablage/verlauf.mjs`, die Migration dazu ist `050-verlauf.sql`.
 *
 * **Nur anhängen.** Es gibt `anhaengen` und `amVorgang`, kein Ändern und kein
 * Löschen. Ein Verlauf, den jemand nachträglich glätten kann, beweist nichts.
 */

function alsEintrag(zeile) {
  if (!zeile) return null;
  return {
    ...zeile,
    id: Number(zeile.id),
    vorgang: Number(zeile.vorgang),
    angaben: zeile.angaben === null || zeile.angaben === undefined ? null : JSON.parse(zeile.angaben),
  };
}

const SPALTEN = "id, vorgang, was, wer, angaben, zeit";

export function verlaufAblage(db) {
  return {
    /** Einen Eintrag ans Ende. Zurück kommt er, wie er liegt. */
    async anhaengen({ vorgang, was, wer, angaben, zeit }) {
      return alsEintrag(
        await db.eine(`INSERT INTO verlauf (vorgang, was, wer, angaben, zeit) VALUES ($1, $2, $3, $4, $5) RETURNING ${SPALTEN}`, [
          vorgang,
          was,
          wer ?? null,
          angaben === null || angaben === undefined ? null : JSON.stringify(angaben),
          zeit,
        ])
      );
    },

    /** Der Verlauf eines Vorgangs, das Älteste zuerst. Ob jemand den Vorgang sehen darf, fragt der Weg vorher. */
    async amVorgang(vorgang) {
      return (await db.abfrage(`SELECT ${SPALTEN} FROM verlauf WHERE vorgang = $1 ORDER BY id`, [vorgang])).map(alsEintrag);
    },
  };
}
