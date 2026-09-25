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
 * Beide antworten asynchron: die Ablage liegt am Geraet in einer Datenbank
 * hinter dem Netz.
 *
 * **In die Freigabeanfrage gehen Verweise, keine Inhalte.** Der Lauf bekommt
 * die Nummer des Vorgangs und den Namen dessen, der ihn eingereicht hat, nicht
 * seinen Titel und nicht seinen Text. Was im Lauf steht, liegt am Geraet bei
 * jedem Lauf und auf jeder Karte, die ein Entscheider sieht; was im Vorgang
 * steht, liegt in dieser App und folgt ihren Regeln, wer was sieht. Der
 * Entscheider liest den Vorgang hier, unter seiner Nummer.
 *
 * **Wer entscheiden darf, zieht die App enger, nie weiter.** Sie nennt dem
 * Geraet den Einreicher, sobald es ihn annimmt, und auf Wunsch eine Regel:
 * `regel` bekommt den Vorgang und gibt `{ ohne_einreicher, entscheider }`
 * zurueck oder `null`, auch asynchron. Die Vorlage gibt `null`, dann entscheidet
 * jeder, dem die App freigegeben ist. Eine Fach-App gibt hier die vier Augen und
 * die Konten, die fuer diesen Vorgang zustaendig sind. Gibt sie einen Satz
 * zurueck, startet kein Lauf, und der Satz steht am Vorgang: so sagt die App
 * selbst, dass niemand entscheiden koennte, statt das Geraet fragen zu lassen.
 *
 * **Wer entschieden hat, muss es beim Nachziehen noch duerfen.** `zustaendig`
 * bekommt den Vorgang und den Namen aus der Freigabe. Endet eine Zuordnung,
 * waehrend ein Lauf wartet, entscheidet das Geraet weiter nach dem Kreis vom
 * Start; die App zaehlt eine solche Entscheidung nicht. Die Vorlage laesst
 * jeden gelten. Das Muster Mandanten setzt beides.
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

export function vorgaenge({ ablage, geraet, name, regel = () => null, zustaendig = () => true }) {
  /**
   * Den Stand eines Vorgangs nachziehen.
   *
   * Gesucht wird die Freigabe zu genau diesem Lauf. Ist keine dabei, bleibt der
   * Vorgang, wie er ist: eine Freigabe, die noch nicht in der Liste steht, ist
   * keine Aussage darueber, dass niemand entschieden hat.
   */
  async function nachziehen(vorgang, freigaben) {
    if (freigaben.fehler) {
      return await ablage.fortschreiben(vorgang.id, { ...vorgang, hinweis: freigaben.fehler });
    }
    const freigabe = freigaben.eintraege.find((eintrag) => String(eintrag.lauf) === String(vorgang.lauf));
    if (!freigabe) return vorgang;

    const stand = STATUS[freigabe.status];
    if (!stand) {
      return await ablage.fortschreiben(vorgang.id, {
        ...vorgang,
        hinweis: `Das Geraet nennt die Freigabe "${freigabe.status}", und diesen Stand kennt ${name} nicht.`,
      });
    }

    // Entschieden hat jemand, der fuer diesen Vorgang nicht mehr zustaendig
    // ist. Das Geraet hat es angenommen, die App zaehlt es nicht.
    if (freigabe.entschieden_von && (stand === "genehmigt" || stand === "abgelehnt")) {
      if (!(await zustaendig(vorgang, freigabe.entschieden_von))) {
        return await ablage.fortschreiben(vorgang.id, {
          ...vorgang,
          status: "ohne entscheidung",
          entschieden_von: freigabe.entschieden_von,
          hinweis: `${freigabe.entschieden_von} hat entschieden und ist für diesen Vorgang nicht mehr zuständig. Die Entscheidung zählt nicht; der Vorgang muss neu eingereicht werden.`,
        });
      }
    }

    // Nach der Bestaetigung laeuft der Flow ab dem angehaltenen Schritt weiter
    // und schreibt einen Satz. Der gehoert an den Vorgang, sobald er da ist.
    let bemerkung = vorgang.bemerkung;
    if (stand === "genehmigt" && !bemerkung) {
      const lauf = await geraet.lauf(vorgang.lauf);
      if (lauf?.status === "fertig") bemerkung = lauf.result || lauf.ergebnis || null;
    }

    return await ablage.fortschreiben(vorgang.id, {
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
      const wartende = await ablage.wartende();
      if (wartende.length) {
        const freigaben = await geraet.freigaben();
        for (const vorgang of wartende) await nachziehen(vorgang, freigaben);
      }
      return await ablage.alle();
    },

    /** Genau einer, wie die Ablage ihn gibt, oder `null`. */
    async holen(id) {
      return await ablage.eines(id);
    },

    /**
     * Einen Vorgang einreichen und den Lauf anfordern.
     *
     * Wer einreicht, steht in `von` und kommt aus der Anmeldung: staende es im
     * Rumpf, koennte jeder fuer jeden einreichen.
     *
     * Erst liegt der Vorgang, dann startet der Lauf: die Anfrage verweist auf
     * seine Nummer, und die gibt es erst, wenn er liegt.
     *
     * Was eine Fach-App dazu mitgibt, der Mandant etwa, geht als `zusatz`
     * unveraendert an die Ablage.
     */
    async einreichen({ titel, text, von, ...zusatz }) {
      const fehlt = geraet.warumKeinRahmen();
      const vorgang = await ablage.anlegen({
        ...zusatz,
        titel,
        text: text || "ohne Angabe",
        von: von || "unbekannt",
        gestellt: new Date().toISOString(),
        // Ohne Rahmen gibt es keinen Lauf und damit keine Freigabe. Der Vorgang
        // bleibt liegen, und es steht dran, warum: erfinden waere schlimmer.
        status: fehlt ? "ohne entscheidung" : "wartet",
        lauf: null,
        hinweis: fehlt,
      });
      if (fehlt || !vorgang) return vorgang;

      const freigabe = await regel(vorgang);
      if (typeof freigabe === "string") {
        return await ablage.fortschreiben(vorgang.id, { ...vorgang, status: "ohne lauf", hinweis: freigabe });
      }
      const { lauf, fehler } = await geraet.flowStarten(
        { vorgang: String(vorgang.id), von: vorgang.von },
        { einreicher: von || null, freigabe }
      );
      if (lauf !== null) return await ablage.fortschreiben(vorgang.id, { ...vorgang, lauf });

      // Der Rahmen steht, der Lauf kam trotzdem nicht zustande. Das ist etwas
      // anderes als "ohne Arasul", und es wird auch anders benannt: sonst sucht
      // der Naechste den Fehler dort, wo keiner ist.
      return await ablage.fortschreiben(vorgang.id, { ...vorgang, status: "ohne lauf", hinweis: fehler });
    },
  };
}
