/**
 * Was mit einem Vorgang passiert. Der Kern der App.
 *
 * Er kennt **zwei Anschluesse** und sonst nichts von der Welt: eine Ablage, in
 * der Vorgaenge liegen, und ein Geraet, an dem ein Mensch entscheidet. Beide
 * kommen als Argument herein. Deshalb steht hier kein `fetch`, kein SQL und
 * kein `process.env`, und deshalb laesst sich jeder Fall dieser App pruefen,
 * ohne eine Datenbank oder ein Geraet zu haben.
 *
 * Was ein Anschluss koennen muss:
 *
 *   `ablage`  anlegen, alle, wartende, fortschreiben  (`ablage/vorgaenge.mjs`)
 *   `geraet`  warumKeinRahmen, flowStarten, freigaben, lauf  (`arasul.mjs`)
 *
 * **Kein stilles null.** Jeder Vorgang, der ohne Lauf bleibt, traegt den Satz,
 * warum. "Ohne Arasul" steht nur dann da, wenn das Geraet der App wirklich
 * nichts gegeben hat; alles andere wird benannt, mit Status und Antwort.
 */

/** Wie die Freigabe steht, so steht der Vorgang. Die Namen links kommen vom Geraet. */
const STATUS = {
  offen: "wartet",
  wartet: "wartet",
  bestaetigt: "genehmigt",
  genehmigt: "genehmigt",
  abgelehnt: "abgelehnt",
  abgelaufen: "abgelaufen",
  verfallen: "abgelaufen",
};

export function vorgaenge({ ablage, geraet, name }) {
  /**
   * Den Stand eines Vorgangs nachziehen.
   *
   * Gesucht wird die Freigabe zu genau diesem Lauf. Ist keine dabei, bleibt der
   * Vorgang, wie er ist: eine Freigabe, die noch nicht in der Liste steht, ist
   * keine Aussage darueber, dass niemand entschieden hat.
   */
  async function nachziehen(vorgang, freigaben) {
    if (freigaben.fehler) {
      return ablage.fortschreiben(vorgang.id, { ...vorgang, hinweis: freigaben.fehler });
    }
    const freigabe = freigaben.eintraege.find((eintrag) => String(eintrag.lauf) === String(vorgang.lauf));
    if (!freigabe) return vorgang;

    const stand = STATUS[freigabe.status];
    if (!stand) {
      return ablage.fortschreiben(vorgang.id, {
        ...vorgang,
        hinweis: `Das Geraet nennt die Freigabe "${freigabe.status}", und diesen Stand kennt ${name} nicht.`,
      });
    }

    // Nach der Bestaetigung laeuft der Flow ab dem angehaltenen Schritt weiter
    // und schreibt einen Satz. Der gehoert an den Vorgang, sobald er da ist.
    let bemerkung = vorgang.bemerkung;
    if (stand === "genehmigt" && !bemerkung) {
      const lauf = await geraet.lauf(vorgang.lauf);
      if (lauf?.status === "fertig") bemerkung = lauf.result || lauf.ergebnis || null;
    }

    return ablage.fortschreiben(vorgang.id, {
      status: stand,
      entschieden_von: freigabe.entschieden_von || null,
      begruendung: freigabe.begruendung || null,
      bemerkung,
      hinweis: null,
    });
  }

  return {
    /**
     * Alle Vorgaenge, vorher am Geraet nachgezogen.
     *
     * Vor jeder Auskunft der Stand vom Geraet: ein Vorgang, der hier auf
     * "wartet" steht, waehrend der Mensch laengst entschieden hat, waere eine
     * Auskunft, die nicht stimmt. Gefragt wird einmal und nicht je Vorgang.
     */
    async auflisten() {
      const wartende = ablage.wartende();
      if (wartende.length) {
        const freigaben = await geraet.freigaben();
        for (const vorgang of wartende) await nachziehen(vorgang, freigaben);
      }
      return ablage.alle();
    },

    /**
     * Einen Vorgang einreichen und den Lauf anfordern.
     *
     * Wer einreicht, steht in `von` und kommt aus der Anmeldung: staende es im
     * Rumpf, koennte jeder fuer jeden einreichen.
     */
    async einreichen({ titel, text, von }) {
      const vorgang = {
        titel,
        text: text || "ohne Angabe",
        von: von || "unbekannt",
        gestellt: new Date().toISOString(),
        status: "wartet",
        lauf: null,
        hinweis: null,
      };

      const fehlt = geraet.warumKeinRahmen();
      if (fehlt) {
        // Ohne Rahmen gibt es keinen Lauf und damit keine Freigabe. Der Vorgang
        // bleibt liegen, und es steht dran, warum: erfinden waere schlimmer.
        return ablage.anlegen({ ...vorgang, status: "ohne entscheidung", hinweis: fehlt });
      }

      const { lauf, fehler } = await geraet.flowStarten({ sache: vorgang.titel, von: vorgang.von, text: vorgang.text });
      if (lauf !== null) return ablage.anlegen({ ...vorgang, lauf });

      // Der Rahmen steht, der Lauf kam trotzdem nicht zustande. Das ist etwas
      // anderes als "ohne Arasul", und es wird auch anders benannt: sonst sucht
      // der Naechste den Fehler dort, wo keiner ist.
      return ablage.anlegen({ ...vorgang, status: "ohne lauf", hinweis: fehler });
    },
  };
}
