/**
 * Was mit einem Vorgang passiert. Der Kern der App.
 *
 * Er kennt **zwei Anschlüsse** und sonst nichts von der Welt: eine Ablage, in
 * der Vorgänge liegen, und ein Gerät, an dem ein Mensch entscheidet. Beide
 * kommen als Argument herein. Deshalb steht hier kein `fetch`, kein SQL und
 * kein `process.env`, und deshalb lässt sich jeder Fall dieser App prüfen,
 * ohne eine Datenbank oder ein Gerät zu haben.
 *
 * Was ein Anschluss können muss:
 *
 *   `ablage`  anlegen, alle, wartende, fortschreiben  (`ablage/vorgaenge.mjs`)
 *   `geraet`  warumKeinRahmen, flowStarten, freigaben, lauf  (`arasul.mjs`)
 *
 * Beide antworten asynchron: die Ablage liegt am Gerät in einer Datenbank
 * hinter dem Netz.
 *
 * **In die Freigabeanfrage gehen Verweise, keine Inhalte.** Der Lauf bekommt
 * die Nummer des Vorgangs und den Namen dessen, der ihn eingereicht hat, nicht
 * seinen Titel und nicht seinen Text. Was im Lauf steht, liegt am Gerät bei
 * jedem Lauf und auf jeder Karte, die ein Entscheider sieht; was im Vorgang
 * steht, liegt in dieser App und folgt ihren Regeln, wer was sieht. Der
 * Entscheider liest den Vorgang hier, unter seiner Nummer.
 *
 * **Wer entscheiden darf, zieht die App enger, nie weiter.** Sie nennt dem
 * Gerät den Einreicher, sobald es ihn annimmt, und auf Wunsch eine Regel:
 * `regel` bekommt den Vorgang und gibt `{ ohne_einreicher, entscheider }`
 * zurück oder `null`, auch asynchron. Die Vorlage gibt `null`, dann entscheidet
 * jeder, dem die App freigegeben ist. Eine Fach-App gibt hier die vier Augen und
 * die Konten, die für diesen Vorgang zuständig sind. Gibt sie einen Satz
 * zurück, startet kein Lauf, und der Satz steht am Vorgang: so sagt die App
 * selbst, dass niemand entscheiden könnte, statt das Gerät fragen zu lassen.
 *
 * **Wer entschieden hat, muss es beim Nachziehen noch dürfen.** `zustaendig`
 * bekommt den Vorgang und den Namen aus der Freigabe. Endet eine Zuordnung,
 * während ein Lauf wartet, entscheidet das Gerät weiter nach dem Kreis vom
 * Start; die App zählt eine solche Entscheidung nicht. Die Vorlage lässt
 * jeden gelten. Das Muster Mandanten setzt beides.
 *
 * **Wer wartet, erfährt, auf wen.** Jeder wartende Vorgang in der Liste
 * trägt `entscheidet`: `{ konten, ohne }` aus derselben `regel`, mit der der
 * Lauf startete. `konten` ist `null`, wenn jeder entscheidet, dem die App
 * freigegeben ist, und leer, wenn nach der Regel niemand bleibt; `ohne` nennt
 * den Einreicher, wenn vier Augen gelten. Die Regel gilt heute und nicht beim
 * Start: eine Entscheidung aus dem alten Kreis zählt die App ohnehin nicht,
 * siehe `zustaendig`.
 *
 * **Kein stilles null.** Jeder Vorgang, der ohne Lauf bleibt, trägt den Satz,
 * warum. "Ohne Arasul" steht nur dann da, wenn das Gerät der App wirklich
 * nichts gegeben hat; alles andere wird benannt, mit Status und Antwort.
 */

/** Wie die Freigabe steht, so steht der Vorgang. Die Namen links kommen vom Gerät. */
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
   * keine Aussage darüber, dass niemand entschieden hat.
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
        hinweis: `Das Gerät nennt die Freigabe "${freigabe.status}", und diesen Stand kennt ${name} nicht.`,
      });
    }

    // Entschieden hat jemand, der für diesen Vorgang nicht mehr zuständig
    // ist. Das Gerät hat es angenommen, die App zählt es nicht.
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

    // Nach der Bestätigung läuft der Flow ab dem angehaltenen Schritt weiter
    // und schreibt einen Satz. Der gehört an den Vorgang, sobald er da ist.
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

  /** Wer einen wartenden Vorgang entscheidet, aus der Regel der App. */
  async function wer(vorgang) {
    const freigabe = await regel(vorgang);
    // Ein Satz heißt: nach heutiger Regel könnte niemand entscheiden.
    if (typeof freigabe === "string") return { konten: [], ohne: null };
    if (!freigabe || typeof freigabe !== "object") return { konten: null, ohne: null };
    const konten = Array.isArray(freigabe.entscheider?.konten) ? freigabe.entscheider.konten : null;
    return { konten, ohne: freigabe.ohne_einreicher ? vorgang.von : null };
  }

  return {
    /**
     * Alle Vorgänge, vorher am Gerät nachgezogen.
     *
     * Vor jeder Auskunft der Stand vom Gerät: ein Vorgang, der hier auf
     * "wartet" steht, während der Mensch längst entschieden hat, wäre eine
     * Auskunft, die nicht stimmt. Gefragt wird einmal und nicht je Vorgang.
     */
    async auflisten() {
      const wartende = await ablage.wartende();
      if (wartende.length) {
        const freigaben = await geraet.freigaben();
        for (const vorgang of wartende) await nachziehen(vorgang, freigaben);
      }
      const alle = await ablage.alle();
      for (const vorgang of alle) {
        if (vorgang.status === "wartet") vorgang.entscheidet = await wer(vorgang);
      }
      return alle;
    },

    /** Genau einer, wie die Ablage ihn gibt, oder `null`. */
    async holen(id) {
      return await ablage.eines(id);
    },

    /**
     * Einen Vorgang einreichen und den Lauf anfordern.
     *
     * Wer einreicht, steht in `von` und kommt aus der Anmeldung: stände es im
     * Rumpf, könnte jeder für jeden einreichen.
     *
     * Erst liegt der Vorgang, dann startet der Lauf: die Anfrage verweist auf
     * seine Nummer, und die gibt es erst, wenn er liegt.
     *
     * Was eine Fach-App dazu mitgibt, der Mandant etwa, geht als `zusatz`
     * unverändert an die Ablage.
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
        // bleibt liegen, und es steht dran, warum: erfinden wäre schlimmer.
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
      // der Nächste den Fehler dort, wo keiner ist.
      return await ablage.fortschreiben(vorgang.id, { ...vorgang, status: "ohne lauf", hinweis: fehler });
    },
  };
}
