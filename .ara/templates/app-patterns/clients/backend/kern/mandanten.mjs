/**
 * Muster Mandanten: was mit Mandanten und Zuordnungen passiert, und wer über
 * einen Vorgang entscheidet. Der Kern.
 *
 * Liegt in einer App aus der Vorlage unter `backend/kern/mandanten.mjs`, neben
 * `vorgaenge.mjs`, nach derselben Regel: er kennt seine Ablage und sonst nichts
 * von der Welt. Kein HTTP, kein SQL, kein `process.env`.
 *
 * **Wer hineinkommt, entscheidet das Gerät. Was jemand drinnen sieht, diese
 * App.** Die Zuordnung ist keine zweite Anmeldung: niemand meldet sich an der
 * App an, es gibt kein Passwort und kein Konto, das sie anlegt. Sie merkt sich
 * zu einem Namen aus der Kopfzeile, welche Mandanten er sieht.
 *
 * **Verwaltet wird von einer Rolle, die der Kontrakt nennt.** `verwaltungsRolle`
 * nimmt sie aus der Vereinbarung und tippt keine ein: die Rolle, die eine Regel
 * als Entscheider nennen darf (`freigaben.rollen`), sofern sie auch in der
 * Kopfzeile stehen kann (`koepfe.rollen`). Wer eine andere will, nennt sie beim
 * Aufruf, und auch die muss in `koepfe.rollen` stehen. Steht keine da,
 * verwaltet niemand, und die App sagt das, statt jedem die Verwaltung zu
 * öffnen.
 *
 * **Die Entscheider kommen aus der Zuordnung.** `regel` gibt für einen Vorgang
 * vier Augen und die Konten, die seinem Mandanten zugeordnet sind, ohne den,
 * der eingereicht hat. Bleibt niemand, gibt sie den Satz, warum kein Lauf
 * startet. Das Gerät würde den Start dann mit 400 abweisen; die App sagt es
 * vorher und in ihren Worten.
 */

/** Wie lange ein gesehener Name nicht noch einmal geschrieben wird. */
const GESEHEN_ALLE_MS = 10 * 60_000;

/**
 * Die Rolle, die Mandanten und Zuordnungen pflegt, aus der Vereinbarung mit dem
 * Gerät. `null`, wenn der Kontrakt keine nennt, die passt.
 */
export function verwaltungsRolle(vereinbarung, gewaehlt = null) {
  const rollen = Array.isArray(vereinbarung?.koepfe?.rollen) ? vereinbarung.koepfe.rollen : [];
  const entscheider = Array.isArray(vereinbarung?.freigaben?.rollen) ? vereinbarung.freigaben.rollen : [];
  const kandidat = gewaehlt ?? entscheider.find((rolle) => rollen.includes(rolle)) ?? null;
  return kandidat && rollen.includes(kandidat) ? kandidat : null;
}

export function mandanten({ ablage, verwaltung }) {
  const zuletztGeschrieben = new Map();

  const darfVerwalten = (wer) => Boolean(verwaltung && wer?.benutzer && wer.rolle === verwaltung);

  /** Der Satz, warum jemand nicht verwaltet. Er nennt die Rolle, nicht die Person. */
  const nichtVerwaltung = () =>
    verwaltung
      ? { status: 403, fehler: `Mandanten und Zuordnungen pflegt nur, wer die Rolle ${verwaltung} hat.` }
      : {
          status: 403,
          fehler: "Der Kontrakt dieses Geräts nennt keine Rolle, die verwalten darf. Deshalb pflegt hier niemand Mandanten.",
        };

  return {
    verwaltung,
    darfVerwalten,

    /**
     * Einen Namen aus der Anmeldung vermerken. Höchstens alle zehn Minuten
     * einmal je Name geschrieben: sonst wäre jede Anfrage ein Schreibvorgang.
     */
    async gesehen(wer) {
      if (!wer?.benutzer) return;
      const jetzt = Date.now();
      if (jetzt - (zuletztGeschrieben.get(wer.benutzer) ?? 0) < GESEHEN_ALLE_MS) return;
      zuletztGeschrieben.set(wer.benutzer, jetzt);
      await ablage.gesehen(wer.benutzer, new Date(jetzt).toISOString());
    },

    /** Was ein Mensch an Mandanten sieht, und ob er verwaltet. */
    async uebersicht(wer) {
      return { mandanten: await ablage.sichtbare(wer?.benutzer ?? null), verwaltung: darfVerwalten(wer) };
    },

    /** Alles für die Verwaltungsseite: Mandanten, gesehene Konten, Zuordnungen. */
    async verwalten(wer) {
      if (!darfVerwalten(wer)) return nichtVerwaltung();
      return {
        status: 200,
        mandanten: await ablage.alle(),
        konten: await ablage.konten(),
        zuordnungen: await ablage.zuordnungen(),
      };
    },

    async anlegen(wer, { name }) {
      if (!darfVerwalten(wer)) return nichtVerwaltung();
      const sauber = String(name || "").trim().slice(0, 120);
      if (!sauber) return { status: 400, fehler: "Ohne Namen gibt es keinen Mandanten." };
      const mandant = await ablage.anlegen({ name: sauber, von: wer.benutzer });
      if (!mandant) return { status: 409, fehler: `Einen Mandanten ${sauber} gibt es schon.` };
      return { status: 201, mandant };
    },

    /**
     * Ein Konto einem Mandanten zuordnen. Nur ein Name, den die App schon
     * gesehen hat: einen Tippfehler hier sähe sonst niemand, und der Mensch
     * dahinter fände seine Mandanten nicht.
     */
    async zuordnen(wer, { benutzer, mandant }) {
      if (!darfVerwalten(wer)) return nichtVerwaltung();
      const name = String(benutzer || "").trim();
      const nummer = Number(mandant);
      if (!name || !Number.isInteger(nummer)) return { status: 400, fehler: "Zum Zuordnen gehören ein Konto und ein Mandant." };
      if (!(await ablage.konto(name))) {
        return {
          status: 400,
          fehler: `${name} hat diese App noch nie geöffnet. Zugeordnet wird, wer einmal da war: erst öffnen lassen, dann zuordnen.`,
        };
      }
      if (!(await ablage.mandant(nummer))) return { status: 404, fehler: "Diesen Mandanten gibt es nicht." };
      const neu = await ablage.zuordnen({ benutzer: name, mandant: nummer, von: wer.benutzer });
      return { status: neu ? 201 : 200, zuordnung: { benutzer: name, mandant: nummer } };
    },

    async loesen(wer, { benutzer, mandant }) {
      if (!darfVerwalten(wer)) return nichtVerwaltung();
      const geloest = await ablage.loesen({ benutzer: String(benutzer || ""), mandant: Number(mandant) });
      return geloest ? { status: 200, geloest: true } : { status: 404, fehler: "Diese Zuordnung gibt es nicht." };
    },

    /**
     * Die Regel für die Freigabe eines Vorgangs: vier Augen, und entscheiden
     * dürfen die Konten seines Mandanten ohne den Einreicher.
     *
     * Ob ein Konto die App freigegeben hat, weiß die App nicht; das Gerät
     * prüft es beim Start und weist ab, wenn nicht. Der Satz steht dann am
     * Vorgang.
     */
    async regel(vorgang) {
      const konten = (await ablage.zustaendige(vorgang.mandant)).filter((name) => name !== vorgang.von);
      if (!konten.length) {
        return (
          `Für diesen Mandanten ist außer ${vorgang.von} niemand zugeordnet, und wer einreicht, entscheidet nicht. ` +
          "Ein zweites Konto zuordnen, dann neu einreichen."
        );
      }
      return { ohne_einreicher: true, entscheider: { konten } };
    },

    /** Ist dieser Name für den Mandanten des Vorgangs zuständig, und ist er nicht der Einreicher? */
    async zustaendig(vorgang, name) {
      if (!name || name === vorgang.von) return false;
      return (await ablage.zustaendige(vorgang.mandant)).includes(name);
    },
  };
}
