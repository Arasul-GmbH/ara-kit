/**
 * Muster Dokumente: die Ablage. Die eine Naht zwischen dieser Entität und
 * SQLite.
 *
 * Liegt in einer App aus der Vorlage unter `backend/ablage/dokumente.mjs`,
 * neben `vorgaenge.mjs`, nach derselben Regel: eine Ablage je Entität, und in
 * ihr das einzige SQL dafür. Die Migration dazu ist `002-dokumente.sql`.
 *
 * **Die Liste trägt keine Bytes.** `alle()` liest alles außer `inhalt`: eine
 * Liste von zwanzig PDFs wäre sonst bei jedem Aufruf zwanzig PDFs auf der
 * Leitung. Die Bytes holt `eines()`, und zwar für genau ein Dokument.
 */

const OHNE_INHALT = "id, name, art, groesse, von, abgelegt";

export function dokumentAblage(db) {
  const anlegen = db.prepare(
    `INSERT INTO dokumente (name, art, groesse, von, abgelegt, inhalt)
     VALUES (?, ?, ?, ?, ?, ?) RETURNING ${OHNE_INHALT}`
  );
  const alle = db.prepare(`SELECT ${OHNE_INHALT} FROM dokumente ORDER BY id DESC`);
  const eines = db.prepare(`SELECT ${OHNE_INHALT}, inhalt FROM dokumente WHERE id = ?`);
  const loeschen = db.prepare("DELETE FROM dokumente WHERE id = ?");

  return {
    /** Ein neues Dokument. Zurück kommt der Eintrag ohne seine Bytes. */
    anlegen(dokument) {
      return anlegen.get(
        dokument.name,
        dokument.art,
        dokument.groesse,
        dokument.von,
        dokument.abgelegt,
        dokument.inhalt
      );
    },

    /** Alle, das Neueste oben, ohne Bytes. */
    alle() {
      return alle.all();
    },

    /** Genau eines, mit seinen Bytes als Buffer, oder null. */
    eines(id) {
      const zeile = eines.get(id);
      return zeile ? { ...zeile, inhalt: Buffer.from(zeile.inhalt) } : null;
    },

    /** Weg damit. Zurück kommt, ob es etwas zu löschen gab. */
    loeschen(id) {
      return loeschen.run(id).changes > 0;
    },
  };
}
