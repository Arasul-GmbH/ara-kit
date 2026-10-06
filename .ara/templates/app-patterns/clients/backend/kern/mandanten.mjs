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
 * **Ob die Verwaltung alle Mandanten sieht, sagt die App** (`alleSehen`). In
 * einer Kanzlei sehen die Partner jede Akte, ohne sich jeder einzeln
 * zuzuordnen; in einem Betrieb mit getrennten Abteilungen sieht auch die
 * Verwaltung nur, was ihr zugeordnet ist. Vorgabe ist `false`, und das
 * Interview fragt danach. Sehen heißt auch hier nicht entscheiden: wer
 * entscheidet, sagt weiter die Zuordnung.
 *
 * **Zugeordnet werden kann, wer die App noch nie geöffnet hat.** Die App kann
 * die Konten des Geräts nicht auflisten; bis 0.74.0 nahm sie darum nur Namen,
 * die sie schon gesehen hatte, und eine neue Mitarbeiterin musste die App
 * erst einmal leer öffnen. Jetzt wird ein unbekannter Name vorgemerkt: die
 * Zuordnung gilt, sobald jemand mit genau diesem Namen kommt, und die
 * Verwaltung sieht, dass er noch nie da war. Ein Tippfehler fällt so dort auf,
 * nicht erst beim Einreichen.
 *
 * **Sehen und entscheiden sind zwei Dinge.** Jede Zuordnung sagt, ob das Konto
 * den Mandanten nur sieht oder auch über seine Vorgänge entscheidet, der
 * Partner einer Kanzlei etwa, nicht jeder Sachbearbeiter. `regel` gibt für
 * einen Vorgang vier Augen und nur die Entscheider seines Mandanten, ohne den,
 * der eingereicht hat. Bleibt niemand, gibt sie den Satz, warum kein Lauf
 * startet, und der Vorgang bleibt in Arbeit. Das Gerät würde den Start sonst
 * mit 400 abweisen; die App sagt es vorher und in ihren Worten.
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

export function mandanten({ ablage, verwaltung, alleSehen = false }) {
  const zuletztGeschrieben = new Map();

  const darfVerwalten = (wer) => Boolean(verwaltung && wer?.benutzer && wer.rolle === verwaltung);

  /**
   * Die Sicht eines Menschen für jede Ablage mit Mandant: sein Name, und ob er
   * alle Mandanten sieht. Das gilt nur für die Verwaltung und nur mit
   * `alleSehen`; jeder andere sieht, was ihm zugeordnet ist.
   */
  const sicht = (wer) => ({ benutzer: wer?.benutzer ?? null, alle: Boolean(alleSehen) && darfVerwalten(wer) });

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
    alleSehen: Boolean(alleSehen),
    darfVerwalten,
    sicht,

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

    /** Was ein Mensch an Mandanten sieht, ob er verwaltet, und ob er alle sieht. */
    async uebersicht(wer) {
      const seine = sicht(wer);
      return { mandanten: await ablage.sichtbare(seine), verwaltung: darfVerwalten(wer), alle: seine.alle };
    },

    /** Alles für die Verwaltungsseite: Mandanten, gesehene Konten, Zuordnungen. */
    async verwalten(wer) {
      if (!darfVerwalten(wer)) return nichtVerwaltung();
      const konten = await ablage.konten();
      const gesehen = new Set(konten.map((k) => k.benutzer));
      return {
        status: 200,
        alleSehen: Boolean(alleSehen),
        mandanten: await ablage.alle(),
        konten,
        // Vorgemerkt heißt: zugeordnet, aber noch nie da. Ein Tippfehler steht hier.
        zuordnungen: (await ablage.zuordnungen()).map((z) => ({ ...z, vorgemerkt: !gesehen.has(z.benutzer) })),
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
     * Ein Konto einem Mandanten zuordnen, auch eines, das die App noch nie
     * geöffnet hat: dann ist es vorgemerkt, und die Antwort sagt es. Der Name
     * muss genau so lauten wie das Konto am Gerät, Groß und klein inbegriffen;
     * die Verwaltungsseite zeigt einen vorgemerkten Namen, bis er einmal da war.
     */
    async zuordnen(wer, { benutzer, mandant, entscheidet = false }) {
      if (!darfVerwalten(wer)) return nichtVerwaltung();
      const name = String(benutzer || "").trim();
      const nummer = Number(mandant);
      if (!name || !Number.isInteger(nummer)) return { status: 400, fehler: "Zum Zuordnen gehören ein Konto und ein Mandant." };
      // So lang, wie das Gerät einen Namen nimmt, und ohne Steuerzeichen und Leerraum: so heißt kein Konto.
      if (name.length > 100 || /[\s\u0000-\u001f\u007f]/.test(name)) {
        return { status: 400, fehler: `„${name.slice(0, 40)}" ist kein Name eines Kontos: ohne Leerzeichen, höchstens 100 Zeichen.` };
      }
      if (!(await ablage.mandant(nummer))) return { status: 404, fehler: "Diesen Mandanten gibt es nicht." };
      const vorgemerkt = !(await ablage.konto(name));
      const neu = await ablage.zuordnen({ benutzer: name, mandant: nummer, von: wer.benutzer, entscheidet: entscheidet === true });
      return {
        status: neu ? 201 : 200,
        zuordnung: { benutzer: name, mandant: nummer, entscheidet: entscheidet === true, vorgemerkt },
        ...(vorgemerkt
          ? { hinweis: `${name} hat diese App noch nie geöffnet. Die Zuordnung gilt, sobald jemand mit genau diesem Namen kommt; bis dahin steht sie als vorgemerkt da.` }
          : {}),
      };
    },

    async loesen(wer, { benutzer, mandant }) {
      if (!darfVerwalten(wer)) return nichtVerwaltung();
      const geloest = await ablage.loesen({ benutzer: String(benutzer || ""), mandant: Number(mandant) });
      return geloest ? { status: 200, geloest: true } : { status: 404, fehler: "Diese Zuordnung gibt es nicht." };
    },

    /**
     * Die Regel für die Freigabe eines Vorgangs: vier Augen, und entscheiden
     * dürfen die Entscheider seines Mandanten ohne den Einreicher. Wer den
     * Mandanten nur sieht, entscheidet nicht.
     *
     * Ob ein Konto die App freigegeben hat, weiß die App nicht; das Gerät
     * prüft es beim Start und weist ab, wenn nicht. Der Satz steht dann am
     * Vorgang.
     */
    async regel(vorgang) {
      const konten = (await ablage.entscheider(vorgang.mandant)).filter((name) => name !== vorgang.von);
      if (!konten.length) {
        return (
          `Für diesen Mandanten entscheidet außer ${vorgang.von} niemand, und wer einreicht, entscheidet nicht. ` +
          "Die Verwaltung markiert bei der Zuordnung, wer entscheidet; dann noch einmal einreichen."
        );
      }
      return { ohne_einreicher: true, entscheider: { konten } };
    },

    /** Entscheidet dieser Name für den Mandanten des Vorgangs, und ist er nicht der Einreicher? */
    async zustaendig(vorgang, name) {
      if (!name || name === vorgang.von) return false;
      return (await ablage.entscheider(vorgang.mandant)).includes(name);
    },
  };
}
