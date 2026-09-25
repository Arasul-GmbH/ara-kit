/**
 * Muster Dokumente: die Ablage. Die eine Naht zwischen dieser Entität und der
 * Datenbank.
 *
 * Liegt in einer App aus der Vorlage unter `backend/ablage/dokumente.mjs`,
 * neben `vorgaenge.mjs`, nach derselben Regel: eine Ablage je Entität, und in
 * ihr das einzige SQL dafür. Die Migration dazu ist `002-dokumente.sql`. Das
 * SQL ist das von PostgreSQL, mit `$1` als Platzhalter; ohne Gerät übersetzt
 * `db.mjs` für SQLite.
 *
 * **Die Liste trägt keine Bytes.** `alle()` liest alles außer `inhalt`: eine
 * Liste von zwanzig PDFs wäre sonst bei jedem Aufruf zwanzig PDFs auf der
 * Leitung. Die Bytes holt `eines()`, und zwar für genau ein Dokument.
 */

const OHNE_INHALT = "id, name, art, groesse, von, abgelegt";

/** Eine Zeile, wie der Rest der App sie sieht: die Nummer als Zahl. */
function alsDokument(zeile) {
  return zeile ? { ...zeile, id: Number(zeile.id), groesse: Number(zeile.groesse) } : null;
}

export function dokumentAblage(db) {
  return {
    /** Ein neues Dokument. Zurück kommt der Eintrag ohne seine Bytes. */
    async anlegen(dokument) {
      return alsDokument(
        await db.eine(
          `INSERT INTO dokumente (name, art, groesse, von, abgelegt, inhalt)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${OHNE_INHALT}`,
          [dokument.name, dokument.art, dokument.groesse, dokument.von, dokument.abgelegt, dokument.inhalt]
        )
      );
    },

    /** Alle, das Neueste oben, ohne Bytes. */
    async alle() {
      return (await db.abfrage(`SELECT ${OHNE_INHALT} FROM dokumente ORDER BY id DESC`)).map(alsDokument);
    },

    /** Genau eines, mit seinen Bytes als Buffer, oder null. */
    async eines(id) {
      const zeile = await db.eine(`SELECT ${OHNE_INHALT}, inhalt FROM dokumente WHERE id = $1`, [id]);
      return zeile ? { ...alsDokument(zeile), inhalt: Buffer.from(zeile.inhalt) } : null;
    },

    /** Weg damit. Zurück kommt, ob es etwas zu löschen gab. */
    async loeschen(id) {
      return (await db.ausfuehren("DELETE FROM dokumente WHERE id = $1", [id])) > 0;
    },
  };
}
