/**
 * Die Ablage der Vorgänge: die eine Naht zwischen dieser App und ihrer
 * Datenbank.
 *
 * **Eine Ablage je Entität, und in ihr steht das einzige SQL der App.** Der
 * Kern darüber kennt die Tabelle nicht, kennt die Datenbank nicht und würde
 * es nicht merken, wenn hier morgen etwas anderes stünde. Das ist der Zweck
 * der Naht: wer die Ablage austauscht, tauscht sie an einer Stelle aus.
 *
 * Kommt eine zweite Entität dazu, bekommt sie eine zweite Datei wie diese und
 * nicht eine zweite Art, die Datenbank zu rufen. Eine Abfrage, die im Kern
 * steht, ist die erste von zehn.
 *
 * Das SQL ist das von PostgreSQL, mit `$1` als Platzhalter: am Gerät ist es
 * dessen Datenbank, ohne Gerät übersetzt `db.mjs` für SQLite. Jeder Aufruf
 * ist asynchron, denn am Gerät geht er übers Netz.
 *
 * Die Aussenwelt sieht einen Vorgang immer gleich, egal was in der Tabelle
 * steht: `lauf` ist eine Zeichenkette oder `null`, und die Spalte ist TEXT,
 * weil die Nummer eines Laufs ein Wert des Geräts ist. Wer hier INTEGER
 * schriebe, legte sich auf eine Form fest, die ihm niemand versprochen hat.
 */

const FELDER = "id, titel, text, von, gestellt, status, lauf, entschieden_von, begruendung, bemerkung, hinweis";

/** Was die Zeile ist, wenn niemand mehr auf die Tabelle sieht. */
function alsVorgang(zeile) {
  return zeile ? { ...zeile, id: Number(zeile.id), lauf: zeile.lauf ?? null } : null;
}

/** Die Nummer eines Laufs, wie sie in der Spalte steht. */
function alsLauf(lauf) {
  return lauf === null || lauf === undefined ? null : String(lauf);
}

export function vorgangsAblage(db) {
  const ablage = {
    /** Ein neuer Vorgang. Zurück kommt er so, wie er jetzt in der Ablage steht. */
    async anlegen(vorgang) {
      return alsVorgang(
        await db.eine(
          `INSERT INTO vorgaenge (titel, text, von, gestellt, status, lauf, hinweis)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${FELDER}`,
          [vorgang.titel, vorgang.text, vorgang.von, vorgang.gestellt, vorgang.status, alsLauf(vorgang.lauf), vorgang.hinweis ?? null]
        )
      );
    },

    /** Alle, das Neueste oben. */
    async alle() {
      return (await db.abfrage(`SELECT ${FELDER} FROM vorgaenge ORDER BY id DESC`)).map(alsVorgang);
    },

    /** Die, bei denen am Gerät noch etwas offen ist. */
    async wartende() {
      return (
        await db.abfrage(`SELECT ${FELDER} FROM vorgaenge WHERE status = 'wartet' AND lauf IS NOT NULL ORDER BY id DESC`)
      ).map(alsVorgang);
    },

    async eines(id) {
      return alsVorgang(await db.eine(`SELECT ${FELDER} FROM vorgaenge WHERE id = $1`, [id]));
    },

    /**
     * Den Stand eines Vorgangs fortschreiben. Titel, Text und Einreicher
     * ändert niemand mehr; die Nummer des Laufs kommt einmal dazu, sobald es
     * ihn gibt, und bleibt dann.
     */
    async fortschreiben(id, felder) {
      await db.ausfuehren(
        `UPDATE vorgaenge
            SET status = $1, lauf = COALESCE(lauf, $2), entschieden_von = $3, begruendung = $4, bemerkung = $5, hinweis = $6
          WHERE id = $7`,
        [
          felder.status,
          alsLauf(felder.lauf),
          felder.entschieden_von ?? null,
          felder.begruendung ?? null,
          felder.bemerkung ?? null,
          felder.hinweis ?? null,
          id,
        ]
      );
      return ablage.eines(id);
    },
  };
  return ablage;
}
