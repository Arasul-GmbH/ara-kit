/**
 * Muster Mandanten: die Ablage der Vorgänge, mit Mandant. Sie ersetzt
 * `backend/ablage/vorgaenge.mjs` der Vorlage.
 *
 * Dieselben Felder, dieselben Aufrufe wie in der Vorlage, und eine Sache mehr:
 * **die Ablage gilt für einen Namen.** `vorgangsAblage(db, benutzer)` gibt eine
 * Ablage, in der jede Abfrage die Bedingung aus `nurZugeordnete` trägt. Die
 * Liste, der eine Vorgang, die wartenden, das Fortschreiben: was zu einem
 * Mandanten gehört, den dieser Name nicht sieht, gibt es in ihr nicht. Der
 * Kern darüber merkt davon nichts und muss es auch nicht.
 *
 * Gebaut wird sie je Anfrage, mit dem Namen aus der Anmeldung. Eine Ablage
 * ohne Namen sieht nichts und legt nichts an: wer sie aus Versehen ohne Namen
 * baut, bekommt eine leere Liste und keinen fremden Vorgang.
 *
 * **Ein fremder Vorgang ist einer, den es nicht gibt.** `eines` gibt `null`,
 * und der Weg antwortet 404, nicht 403: ein 403 sagte, dass es ihn gibt.
 */

import { nurZugeordnete } from "./mandanten.mjs";

const FELDER = "id, titel, text, von, gestellt, status, lauf, entschieden_von, begruendung, bemerkung, hinweis, mandant";

function alsVorgang(zeile) {
  return zeile
    ? { ...zeile, id: Number(zeile.id), lauf: zeile.lauf ?? null, mandant: zeile.mandant === null ? null : Number(zeile.mandant) }
    : null;
}

function alsLauf(lauf) {
  return lauf === null || lauf === undefined ? null : String(lauf);
}

export function vorgangsAblage(db, benutzer = null) {
  const wer = benutzer || null;

  const ablage = {
    /**
     * Ein neuer Vorgang für einen Mandanten, den dieser Name sieht. Sieht er
     * ihn nicht, oder fehlt der Mandant, kommt `null` zurück und es liegt
     * nichts da.
     */
    async anlegen(vorgang) {
      const mandant = Number(vorgang.mandant);
      if (!Number.isInteger(mandant)) return null;
      const darf = await db.eine(`SELECT id FROM mandanten WHERE id = $1 AND ${nurZugeordnete("id", "$2")}`, [mandant, wer]);
      if (!darf) return null;
      return alsVorgang(
        await db.eine(
          `INSERT INTO vorgaenge (titel, text, von, gestellt, status, lauf, hinweis, mandant)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING ${FELDER}`,
          [vorgang.titel, vorgang.text, vorgang.von, vorgang.gestellt, vorgang.status, alsLauf(vorgang.lauf), vorgang.hinweis ?? null, mandant]
        )
      );
    },

    /** Alle, die dieser Name sieht, das Neueste oben. */
    async alle() {
      return (
        await db.abfrage(`SELECT ${FELDER} FROM vorgaenge WHERE ${nurZugeordnete("mandant", "$1")} ORDER BY id DESC`, [wer])
      ).map(alsVorgang);
    },

    /**
     * Die, bei denen am Gerät noch etwas offen ist, so weit dieser Name sie
     * sieht: wie in der Vorlage auch die genehmigten ohne den Satz danach.
     */
    async wartende() {
      return (
        await db.abfrage(
          `SELECT ${FELDER} FROM vorgaenge
            WHERE lauf IS NOT NULL AND (status = 'wartet' OR (status = 'genehmigt' AND bemerkung IS NULL))
              AND ${nurZugeordnete("mandant", "$1")}
            ORDER BY id DESC`,
          [wer]
        )
      ).map(alsVorgang);
    },

    /** Genau einer, oder `null`, auch wenn es ihn für einen anderen Mandanten gibt. */
    async eines(id) {
      return alsVorgang(
        await db.eine(`SELECT ${FELDER} FROM vorgaenge WHERE id = $1 AND ${nurZugeordnete("mandant", "$2")}`, [id, wer])
      );
    },

    /** Titel und Text eines Vorgangs in Arbeit, wie in der Vorlage, und nur, wenn dieser Name ihn sieht. */
    async aendern(id, { titel, text }) {
      const geaendert = await db.ausfuehren(
        `UPDATE vorgaenge SET titel = $1, text = $2
          WHERE id = $3 AND status = 'in arbeit' AND ${nurZugeordnete("mandant", "$4")}`,
        [titel, text, id, wer]
      );
      return geaendert > 0 ? ablage.eines(id) : null;
    },

    /**
     * Den Stand fortschreiben, wie in der Vorlage. Auch hier mit der
     * Bedingung: wer einen Vorgang nicht sieht, schreibt ihn nicht fort.
     */
    async fortschreiben(id, felder) {
      await db.ausfuehren(
        `UPDATE vorgaenge
            SET status = $1, lauf = COALESCE(lauf, $2), entschieden_von = $3, begruendung = $4, bemerkung = $5, hinweis = $6
          WHERE id = $7 AND ${nurZugeordnete("mandant", "$8")}`,
        [
          felder.status,
          alsLauf(felder.lauf),
          felder.entschieden_von ?? null,
          felder.begruendung ?? null,
          felder.bemerkung ?? null,
          felder.hinweis ?? null,
          id,
          wer,
        ]
      );
      return ablage.eines(id);
    },
  };
  return ablage;
}
