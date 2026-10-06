/**
 * Muster Verlauf: der Kern. Liegt unter `backend/kern/verlauf.mjs`.
 *
 * `melden` ist der Mitschreiber, den `server.mjs` in `mitschreiber` einträgt: Kern und Abschluss
 * der Vorlage melden jedes Ereignis eines Vorgangs dorthin (`kern/vorgaenge.mjs`, „Wer
 * mitschreibt, erfährt es"). Eine Fach-App meldet ihre eigenen Ereignisse an dieselbe Stelle,
 * etwa „Beleg angehängt", mit dem Namen aus der Anmeldung.
 */

/** Wie lang ein Wort für „was" höchstens ist. Ein Satz gehört in `angaben`. */
const WAS_GRENZE = 60;

export function verlauf({ ablage, jetzt = () => new Date().toISOString() }) {
  return {
    async melden({ vorgang, was, wer = null, angaben = null }) {
      const id = Number(vorgang?.id ?? vorgang);
      if (!Number.isInteger(id) || id <= 0 || !was) return null;
      return await ablage.anhaengen({ vorgang: id, was: String(was).slice(0, WAS_GRENZE), wer, angaben, zeit: jetzt() });
    },

    async amVorgang(vorgang) {
      return await ablage.amVorgang(vorgang);
    },
  };
}
