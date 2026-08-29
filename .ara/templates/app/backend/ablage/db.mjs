/**
 * Die Datenbank und ihre Migrationen.
 *
 * SQLite aus Node selbst (`node:sqlite`), ohne ein einziges Paket daneben. Das
 * ist dieselbe Entscheidung wie im Rest dieser Vorlage: eine App, die zum Start
 * einen zweiten Paketbaum mitbringt, ist eine, die in einem Jahr niemand mehr
 * bauen kann. Node meldet dazu eine Warnung auf der Fehlerausgabe; die Sache
 * ist noch als experimentell gekennzeichnet.
 *
 * **Der Stand der Datenbank steht in ihr selbst**, in `pragma user_version`.
 * Eine Migration, die gelaufen ist, laeuft nicht noch einmal, und eine, die
 * fehlt, laeuft nach. Eine Liste im Quelltext daneben liefe irgendwann
 * auseinander, und dann sagte sie etwas anderes als die Datei auf der Platte.
 *
 * **Wo die Datei liegt, sagt die Umgebung.** Ohne Angabe liegt sie neben dem
 * Quelltext, und das ist im Container die schreibbare Schicht: sie ueberlebt
 * einen Neustart des Containers und **nicht** das naechste Einspielen. Ein
 * Geraet gibt einer App heute keinen eigenen Datenordner. Das gehoert in die
 * README der App und ins Gespraech mit dem Kunden, bevor er es merkt.
 */

import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HIER = dirname(fileURLToPath(import.meta.url));
const MIGRATIONEN = join(HIER, "migrationen");

/** Die Migrationen in ihrer Reihenfolge. Die Nummer vorn im Dateinamen ist sie. */
export function migrationen(ordner = MIGRATIONEN) {
  return readdirSync(ordner)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => ({ name, sql: readFileSync(join(ordner, name), "utf8") }));
}

/**
 * Die Datenbank oeffnen und auf den neuesten Stand bringen.
 *
 * Zurueck kommt sie offen. Was fehlt, wird angewandt, jede Migration in ihrer
 * eigenen Transaktion: bricht die dritte ab, sind die ersten beiden trotzdem
 * drin, und der naechste Start setzt genau dort wieder an.
 */
export function oeffnen(datei) {
  mkdirSync(dirname(datei), { recursive: true });
  const db = new DatabaseSync(datei);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

  const stand = db.prepare("PRAGMA user_version").get().user_version;
  const offen = migrationen().slice(stand);
  for (const [nummer, migration] of offen.entries()) {
    db.exec("BEGIN");
    try {
      db.exec(migration.sql);
      // Der Zaehler gehoert in dieselbe Transaktion wie die Aenderung. Sonst
      // gibt es einen Augenblick, in dem die Tabelle da ist und die Datenbank
      // sich fuer aelter haelt, und beim naechsten Start laeuft sie noch einmal.
      db.exec(`PRAGMA user_version = ${stand + nummer + 1}`);
      db.exec("COMMIT");
    } catch (fehler) {
      db.exec("ROLLBACK");
      throw new Error(`Die Migration ${migration.name} ist nicht durchgelaufen: ${fehler.message}`);
    }
  }
  return { db, angewandt: offen.map((m) => m.name), stand: stand + offen.length };
}
