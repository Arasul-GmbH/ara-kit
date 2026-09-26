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
 *   `ablage`  anlegen, alle, wartende, eines, fortschreiben, aendern  (`ablage/vorgaenge.mjs`)
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
 * **Erst in Arbeit, dann eingereicht.** `anlegen` legt einen Vorgang als
 * "in arbeit" ab, ohne Lauf: Unterlagen kommen dazu, Belege gehen wieder.
 * `einreichen(id)` fragt `bereit` und startet erst dann den Lauf. `bereit`
 * bekommt den Vorgang und gibt `true` oder den Satz, was noch fehlt, auch
 * asynchron; ein Vorgang, der nicht bereit ist, bleibt in Arbeit ohne Lauf,
 * und der Satz steht an ihm. Die Vorlage gibt immer `true` und reicht gleich
 * nach dem Anlegen ein, weil ihr Formular mit dem Titel vollständig ist.
 *
 * **Was eingereicht ist, ändert niemand mehr.** `darfAendern(vorgang)` sagt, ob
 * noch etwas dazukommen oder gehen darf: nur in Arbeit. Jede Ablage, die etwas
 * an einen Vorgang hängt oder von ihm löst, fragt das vorher, und der Weg
 * antwortet 409. Der Entscheider gibt frei, was er gesehen hat, und nicht, was
 * danach noch nachgeschoben wurde.
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

/** Der Stand, in dem ein Vorgang entsteht und in dem er sich noch ändern darf. */
export const IN_ARBEIT = "in arbeit";

/** Darf an diesem Vorgang noch etwas dazukommen oder gehen? Nur, solange er in Arbeit ist. */
export function darfAendern(vorgang) {
  return Boolean(vorgang) && vorgang.status === IN_ARBEIT;
}

export function vorgaenge({ ablage, geraet, name, regel = () => null, zustaendig = () => true, bereit = () => true }) {
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

    return await ablage.fortschreiben(vorgang.id, {
      status: stand,
      entschieden_von: freigabe.entschieden_von || null,
      begruendung: freigabe.begruendung || null,
      bemerkung: stand === "genehmigt" ? await satzDanach(vorgang) : null,
      hinweis: null,
    });
  }

  /**
   * Der Satz, den der Flow nach der Bestätigung schreibt, oder `null`, solange
   * der Lauf nicht fertig ist. Ein fertiger Lauf ohne Satz gibt einen leeren:
   * dann fragt niemand mehr.
   */
  async function satzDanach(vorgang) {
    const lauf = await geraet.lauf(vorgang.lauf);
    return lauf?.status === "fertig" ? lauf.result || lauf.ergebnis || "" : null;
  }

  /**
   * Ein genehmigter Vorgang, dem der Satz noch fehlt. Die Ablage gibt ihn unter
   * den wartenden, bis der Lauf fertig ist; die Freigabe ist gezählt und wird
   * nicht noch einmal geprüft, eine später gelöste Zuordnung nimmt sie nicht
   * zurück. Bis 0.41.0 wurde nur beim ersten Nachziehen gefragt, und war der
   * Lauf da noch nicht fertig, fehlte der Satz für immer.
   */
  async function satzNachziehen(vorgang) {
    const bemerkung = await satzDanach(vorgang);
    return bemerkung === null ? vorgang : await ablage.fortschreiben(vorgang.id, { ...vorgang, bemerkung });
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
        const freigaben = wartende.some((vorgang) => vorgang.status === "wartet") ? await geraet.freigaben() : null;
        for (const vorgang of wartende) {
          if (vorgang.status === "genehmigt") await satzNachziehen(vorgang);
          else await nachziehen(vorgang, freigaben);
        }
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
     * Einen Vorgang anlegen, in Arbeit und ohne Lauf.
     *
     * Wer ihn anlegt, steht in `von` und kommt aus der Anmeldung: stände es im
     * Rumpf, könnte jeder für jeden einreichen.
     *
     * Was eine Fach-App dazu mitgibt, der Mandant etwa, geht als `zusatz`
     * unverändert an die Ablage. `null` heißt: die Ablage hat ihn nicht
     * angenommen, im Muster Mandanten etwa für einen fremden Mandanten.
     */
    async anlegen({ titel, text, von, ...zusatz }) {
      return await ablage.anlegen({
        ...zusatz,
        titel,
        text: text || "ohne Angabe",
        von: von || "unbekannt",
        gestellt: new Date().toISOString(),
        status: IN_ARBEIT,
        lauf: null,
        hinweis: null,
      });
    },

    /**
     * Titel und Text eines Vorgangs in Arbeit ändern. Zurück kommt
     * `{ status, vorgang, fehler }` wie beim Einreichen: 404, 409 nach dem
     * Einreichen, sonst 200.
     */
    async aendern(id, { titel, text }) {
      const vorgang = await ablage.eines(id);
      if (!vorgang) return { status: 404, vorgang: null, fehler: `Vorgang ${id} gibt es nicht.` };
      if (!darfAendern(vorgang)) {
        return { status: 409, vorgang, fehler: `Vorgang ${id} ist eingereicht und ändert sich nicht mehr.` };
      }
      const neu = await ablage.aendern(id, { titel: titel || vorgang.titel, text: text || vorgang.text });
      return neu ? { status: 200, vorgang: neu, fehler: null } : { status: 409, vorgang, fehler: `Vorgang ${id} wurde gerade eingereicht.` };
    },

    /**
     * Einen Vorgang in Arbeit einreichen und den Lauf anfordern.
     *
     * Zurück kommt `{ status, vorgang, fehler }` mit dem Statuscode für den Weg:
     * 404, wenn es ihn nicht gibt, 409, wenn er schon eingereicht ist oder noch
     * nicht bereit, sonst 200 mit dem Stand danach. Ein Vorgang, der nicht
     * bereit ist oder den nach der Regel niemand entscheiden könnte, bleibt in
     * Arbeit, und der Satz steht als `hinweis` an ihm: es ging nichts ans Gerät,
     * also kann er nach der Nachbesserung noch einmal eingereicht werden.
     *
     * Die Anfrage verweist auf die Nummer des Vorgangs, und die gibt es, weil
     * er schon liegt.
     */
    async einreichen(id) {
      const vorgang = await ablage.eines(id);
      if (!vorgang) return { status: 404, vorgang: null, fehler: `Vorgang ${id} gibt es nicht.` };
      if (!darfAendern(vorgang)) {
        return { status: 409, vorgang, fehler: `Vorgang ${id} ist schon eingereicht und steht auf "${vorgang.status}".` };
      }

      const fertig = await bereit(vorgang);
      if (fertig !== true) {
        const satz = typeof fertig === "string" && fertig ? fertig : `Vorgang ${id} ist noch nicht vollständig.`;
        return { status: 409, vorgang: await ablage.fortschreiben(id, { ...vorgang, hinweis: satz }), fehler: satz };
      }

      // Ohne Rahmen gibt es keinen Lauf und damit keine Freigabe. Der Vorgang
      // bleibt liegen, und es steht dran, warum: erfinden wäre schlimmer.
      const fehlt = geraet.warumKeinRahmen();
      if (fehlt) {
        return { status: 200, vorgang: await ablage.fortschreiben(id, { ...vorgang, status: "ohne entscheidung", hinweis: fehlt }), fehler: null };
      }

      const freigabe = await regel(vorgang);
      if (typeof freigabe === "string") {
        return { status: 409, vorgang: await ablage.fortschreiben(id, { ...vorgang, hinweis: freigabe }), fehler: freigabe };
      }
      const { lauf, fehler } = await geraet.flowStarten(
        { vorgang: String(vorgang.id), von: vorgang.von },
        { einreicher: vorgang.von === "unbekannt" ? null : vorgang.von, freigabe }
      );
      if (lauf !== null) {
        return { status: 200, vorgang: await ablage.fortschreiben(id, { ...vorgang, status: "wartet", lauf, hinweis: null }), fehler: null };
      }

      // Der Rahmen steht, der Lauf kam trotzdem nicht zustande. Das ist etwas
      // anderes als "ohne Arasul", und es wird auch anders benannt: sonst sucht
      // der Nächste den Fehler dort, wo keiner ist.
      return { status: 200, vorgang: await ablage.fortschreiben(id, { ...vorgang, status: "ohne lauf", hinweis: fehler }), fehler: null };
    },
  };
}
