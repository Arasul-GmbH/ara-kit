/**
 * Muster Mandanten: die Ablage der Mandanten, der Konten und der Zuordnungen,
 * und die Filterhilfe für jede andere Ablage.
 *
 * Liegt in einer App aus der Vorlage unter `backend/ablage/mandanten.mjs`. Die
 * Migration dazu ist `004-mandanten.sql`. Das SQL ist das von PostgreSQL, mit
 * `$1` als Platzhalter; ohne Gerät übersetzt `db.mjs` für SQLite.
 *
 * **Die Trennung steht im WHERE, nicht in einer Prüfung danach.** Eine Liste,
 * die erst alles holt und dann aussortiert, ist die erste, die jemand ohne das
 * Aussortieren wiederverwendet. `nurZugeordnete` gibt die Bedingung als SQL,
 * und jede Ablage einer Entität mit Mandant setzt sie in jede ihrer Abfragen:
 * die Liste, das eine Ding, seine Datei, den Export, das Fortschreiben.
 *
 * **Wer keinen Namen hat, sieht nichts.** Ohne Anmeldung ist der Name `null`,
 * und `benutzer = NULL` trifft in SQL keine Zeile. Die Bedingung schließt dann
 * von selbst alles aus, ohne einen Sonderfall.
 */

/**
 * Die Filterhilfe: die Bedingung "gehört zu einem Mandanten, den dieser Name
 * sieht", als SQL für ein WHERE.
 *
 * `spalte` ist die Spalte mit der Nummer des Mandanten, `platzhalter` der
 * Platzhalter, unter dem der Name gebunden wird, etwa `$3`. Die Bedingung
 * spricht PostgreSQL und SQLite gleich: eine Unterabfrage mit `IN`, kein
 * `ANY` und kein Feld.
 *
 *   `SELECT ... FROM dokumente WHERE id = $1 AND ${nurZugeordnete("mandant", "$2")}`
 */
export function nurZugeordnete(spalte, platzhalter) {
  return `${spalte} IN (SELECT mandant FROM zuordnungen WHERE benutzer = ${platzhalter})`;
}

function alsMandant(zeile) {
  return zeile ? { ...zeile, id: Number(zeile.id) } : null;
}

function alsZuordnung(zeile) {
  return zeile ? { ...zeile, mandant: Number(zeile.mandant) } : null;
}

export function mandantAblage(db) {
  return {
    /** Alle Mandanten, für die Verwaltung. Kein Weg für die Arbeit an Vorgängen. */
    async alle() {
      return (await db.abfrage("SELECT id, name, angelegt_von, angelegt FROM mandanten ORDER BY name")).map(alsMandant);
    },

    /** Die Mandanten, die dieser Name sieht. */
    async sichtbare(benutzer) {
      return (
        await db.abfrage(
          `SELECT id, name, angelegt_von, angelegt FROM mandanten WHERE ${nurZugeordnete("id", "$1")} ORDER BY name`,
          [benutzer]
        )
      ).map(alsMandant);
    },

    /** Einen Mandanten, oder `null`, wenn es den Namen schon gibt. */
    async anlegen({ name, von }) {
      const da = await db.eine("SELECT id FROM mandanten WHERE name = $1", [name]);
      if (da) return null;
      return alsMandant(
        await db.eine(
          "INSERT INTO mandanten (name, angelegt_von, angelegt) VALUES ($1, $2, $3) RETURNING id, name, angelegt_von, angelegt",
          [name, von, new Date().toISOString()]
        )
      );
    },

    async mandant(id) {
      return alsMandant(await db.eine("SELECT id, name, angelegt_von, angelegt FROM mandanten WHERE id = $1", [id]));
    },

    /** Einen Namen als gesehen vermerken: beim ersten Mal neu, danach nur die letzte Zeit. */
    async gesehen(benutzer, zeit) {
      await db.ausfuehren(
        `INSERT INTO konten (benutzer, zuerst, zuletzt) VALUES ($1, $2, $2)
         ON CONFLICT (benutzer) DO UPDATE SET zuletzt = excluded.zuletzt`,
        [benutzer, zeit]
      );
    },

    async konten() {
      return await db.abfrage("SELECT benutzer, zuerst, zuletzt FROM konten ORDER BY benutzer");
    },

    async konto(benutzer) {
      return await db.eine("SELECT benutzer, zuerst, zuletzt FROM konten WHERE benutzer = $1", [benutzer]);
    },

    async zuordnungen() {
      return (
        await db.abfrage("SELECT benutzer, mandant, zugeordnet_von, seit FROM zuordnungen ORDER BY benutzer, mandant")
      ).map(alsZuordnung);
    },

    /** Zuordnen. Zurück kommt, ob die Zuordnung neu ist. */
    async zuordnen({ benutzer, mandant, von }) {
      return (
        (await db.ausfuehren(
          `INSERT INTO zuordnungen (benutzer, mandant, zugeordnet_von, seit) VALUES ($1, $2, $3, $4)
           ON CONFLICT (benutzer, mandant) DO NOTHING`,
          [benutzer, mandant, von, new Date().toISOString()]
        )) > 0
      );
    },

    /** Eine Zuordnung lösen. Zurück kommt, ob es sie gab. */
    async loesen({ benutzer, mandant }) {
      return (await db.ausfuehren("DELETE FROM zuordnungen WHERE benutzer = $1 AND mandant = $2", [benutzer, mandant])) > 0;
    },

    /** Wer diesem Mandanten zugeordnet ist, in fester Reihenfolge. */
    async zustaendige(mandant) {
      return (await db.abfrage("SELECT benutzer FROM zuordnungen WHERE mandant = $1 ORDER BY benutzer", [mandant])).map(
        (zeile) => zeile.benutzer
      );
    },
  };
}
