/**
 * Muster Belege: die Ablage der Dokumente, mit Mandant und Vorgang. Sie
 * ersetzt `backend/ablage/dokumente.mjs` aus dem Muster Dokumente.
 *
 * Dieselben Aufrufe, und wie die Ablage der Vorgänge aus dem Muster Mandanten
 * **gilt sie für einen Namen**: `dokumentAblage(db, benutzer)` setzt die
 * Bedingung aus `nurZugeordnete` in jede Abfrage. Die Liste, das eine
 * Dokument, seine Bytes, das Entfernen: ein Dokument eines fremden Mandanten
 * gibt es in ihr nicht, und die Wege antworten 404.
 *
 * **Ein Beleg hängt an einem Vorgang.** `anlegen` nimmt die Nummer eines
 * Vorgangs, den dieser Name sieht, und schreibt dessen Mandanten an das
 * Dokument. Ohne sichtbaren Vorgang kommt `null` zurück, und es liegt nichts
 * da.
 */

import { nurZugeordnete } from "./mandanten.mjs";

const OHNE_INHALT = "id, name, art, groesse, von, abgelegt, mandant, vorgang";

function alsDokument(zeile) {
  if (!zeile) return null;
  return {
    ...zeile,
    id: Number(zeile.id),
    groesse: Number(zeile.groesse),
    mandant: zeile.mandant === null ? null : Number(zeile.mandant),
    vorgang: zeile.vorgang === null ? null : Number(zeile.vorgang),
  };
}

export function dokumentAblage(db, benutzer = null) {
  const wer = benutzer || null;

  return {
    /** Ein neuer Beleg an einem Vorgang, den dieser Name sieht. Sonst `null`. */
    async anlegen(dokument) {
      const vorgang = Number(dokument.vorgang);
      if (!Number.isInteger(vorgang)) return null;
      const zu = await db.eine(`SELECT mandant FROM vorgaenge WHERE id = $1 AND ${nurZugeordnete("mandant", "$2")}`, [
        vorgang,
        wer,
      ]);
      if (!zu) return null;
      return alsDokument(
        await db.eine(
          `INSERT INTO dokumente (name, art, groesse, von, abgelegt, inhalt, mandant, vorgang)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING ${OHNE_INHALT}`,
          [dokument.name, dokument.art, dokument.groesse, dokument.von, dokument.abgelegt, dokument.inhalt, zu.mandant, vorgang]
        )
      );
    },

    /** Alle, die dieser Name sieht, das Neueste oben, ohne Bytes. */
    async alle() {
      return (
        await db.abfrage(`SELECT ${OHNE_INHALT} FROM dokumente WHERE ${nurZugeordnete("mandant", "$1")} ORDER BY id DESC`, [wer])
      ).map(alsDokument);
    },

    /** Die Belege eines Vorgangs, so weit dieser Name sie sieht. */
    async amVorgang(vorgang) {
      return (
        await db.abfrage(
          `SELECT ${OHNE_INHALT} FROM dokumente WHERE vorgang = $1 AND ${nurZugeordnete("mandant", "$2")} ORDER BY id DESC`,
          [vorgang, wer]
        )
      ).map(alsDokument);
    },

    /** Genau eines, mit Bytes, oder `null`, auch wenn es das für einen anderen Mandanten gibt. */
    async eines(id) {
      const zeile = await db.eine(
        `SELECT ${OHNE_INHALT}, inhalt FROM dokumente WHERE id = $1 AND ${nurZugeordnete("mandant", "$2")}`,
        [id, wer]
      );
      return zeile ? { ...alsDokument(zeile), inhalt: Buffer.from(zeile.inhalt) } : null;
    },

    /** Weg damit, wenn dieser Name es sieht. Zurück kommt, ob es etwas zu löschen gab. */
    async loeschen(id) {
      return (await db.ausfuehren(`DELETE FROM dokumente WHERE id = $1 AND ${nurZugeordnete("mandant", "$2")}`, [id, wer])) > 0;
    },
  };
}
