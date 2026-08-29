/**
 * Die Ablage der Vorgaenge: die eine Naht zwischen dieser App und SQLite.
 *
 * **Eine Ablage je Entitaet, und in ihr steht das einzige SQL der App.** Der
 * Kern darueber kennt die Tabelle nicht, kennt SQLite nicht und wuerde es nicht
 * merken, wenn hier morgen etwas anderes stuende. Das ist der Zweck der Naht:
 * wer die Ablage austauscht, taeuscht sie an einer Stelle aus.
 *
 * Kommt eine zweite Entitaet dazu, bekommt sie eine zweite Datei wie diese und
 * nicht eine zweite Art, `db.prepare` zu rufen. Eine Abfrage, die im Kern
 * steht, ist die erste von zehn.
 *
 * Die Aussenwelt sieht einen Vorgang immer gleich, egal was in der Tabelle
 * steht: `lauf` ist eine Nummer oder eine Zeichenkette oder `null`, und die
 * Spalte ist TEXT, weil die Nummer eines Laufs ein Wert des Geraets ist. Wer
 * hier INTEGER schriebe, legte sich auf eine Form fest, die ihm niemand
 * versprochen hat.
 */

const FELDER = "id, titel, text, von, gestellt, status, lauf, entschieden_von, begruendung, bemerkung, hinweis";

/** Was die Zeile ist, wenn niemand mehr auf die Tabelle sieht. */
function alsVorgang(zeile) {
  return zeile ? { ...zeile, lauf: zeile.lauf ?? null } : null;
}

export function vorgangsAblage(db) {
  const anlegen = db.prepare(
    `INSERT INTO vorgaenge (titel, text, von, gestellt, status, lauf, hinweis)
     VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING ${FELDER}`
  );
  const alle = db.prepare(`SELECT ${FELDER} FROM vorgaenge ORDER BY id DESC`);
  const wartende = db.prepare(
    `SELECT ${FELDER} FROM vorgaenge WHERE status = 'wartet' AND lauf IS NOT NULL ORDER BY id DESC`
  );
  const eines = db.prepare(`SELECT ${FELDER} FROM vorgaenge WHERE id = ?`);
  const fortschreiben = db.prepare(
    `UPDATE vorgaenge
        SET status = ?, entschieden_von = ?, begruendung = ?, bemerkung = ?, hinweis = ?
      WHERE id = ?`
  );

  return {
    /** Ein neuer Vorgang. Zurueck kommt er so, wie er jetzt in der Ablage steht. */
    anlegen(vorgang) {
      return alsVorgang(
        anlegen.get(
          vorgang.titel,
          vorgang.text,
          vorgang.von,
          vorgang.gestellt,
          vorgang.status,
          vorgang.lauf === null || vorgang.lauf === undefined ? null : String(vorgang.lauf),
          vorgang.hinweis ?? null
        )
      );
    },

    /** Alle, das Neueste oben. */
    alle() {
      return alle.all().map(alsVorgang);
    },

    /** Die, bei denen am Geraet noch etwas offen ist. */
    wartende() {
      return wartende.all().map(alsVorgang);
    },

    eines(id) {
      return alsVorgang(eines.get(id));
    },

    /** Den Stand eines Vorgangs fortschreiben. Titel, Text und Einreicher aendert niemand mehr. */
    fortschreiben(id, felder) {
      fortschreiben.run(
        felder.status,
        felder.entschieden_von ?? null,
        felder.begruendung ?? null,
        felder.bemerkung ?? null,
        felder.hinweis ?? null,
        id
      );
      return alsVorgang(eines.get(id));
    },
  };
}
