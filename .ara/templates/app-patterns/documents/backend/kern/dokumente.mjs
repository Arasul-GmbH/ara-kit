/**
 * Muster Dokumente: was mit einem Dokument passiert. Der Kern.
 *
 * Liegt in einer App aus der Vorlage unter `backend/kern/dokumente.mjs`, neben
 * `vorgaenge.mjs`, nach derselben Regel: der Kern kennt seine Ablage und sonst
 * nichts von der Welt. Kein HTTP, kein SQL, kein `process.env`. Deshalb lässt
 * sich jeder Fall hier prüfen, ohne einen Server zu starten. Die Ablage
 * antwortet asynchron, denn am Gerät liegt sie in einer Datenbank hinter dem
 * Netz.
 *
 * **Angenommen wird, was die Dokumentanzeige zeigen kann**: PDF und Bilder.
 * Eine Datei, die niemand ansehen kann, wäre ein Download und kein Dokument,
 * und der Mensch sähe erst nach dem Hochladen, dass sie nur als Name dasteht.
 * Wer andere Arten braucht, erweitert `ARTEN` und weiß dann, dass die Anzeige
 * für sie den Fehlerzustand zeigt.
 *
 * **Die Grenze steht hier und wird der Oberfläche gesagt.** Sie hängt am
 * Arbeitsspeicher des Containers (`ressourcen.speicher` im Manifest): die
 * Bytes gehen einmal durch den Prozess. Wer die Grenze hebt, hebt beides.
 */

/** Welche Arten die App annimmt, und als was die Dokumentanzeige sie zeigt. */
export const ARTEN = Object.freeze({
  "application/pdf": "pdf",
  "image/png": "bild",
  "image/jpeg": "bild",
  "image/gif": "bild",
  "image/webp": "bild",
});

export const GRENZE_BYTES = 10 * 1024 * 1024;

export function dokumente({ ablage, grenzeBytes = GRENZE_BYTES }) {
  return {
    grenzeBytes,

    /** Alle Dokumente, ohne ihre Bytes, das Neueste oben. */
    async auflisten() {
      return await ablage.alle();
    },

    /**
     * Ein Dokument ablegen.
     *
     * Zurück kommt entweder das Dokument oder der Satz, warum nicht. Kein
     * stilles null: wer hochlädt, soll lesen können, woran es lag.
     */
    async ablegen({ name, art, inhalt, von }) {
      const sauber = String(name || "").trim().slice(0, 200);
      if (!sauber) return { dokument: null, fehler: "Ohne Dateinamen gibt es kein Dokument." };
      if (!ARTEN[art]) {
        return {
          dokument: null,
          fehler: `${sauber} ist ${art || "ohne Typ"}. Angenommen werden PDF und Bilder, denn nur die kann die Anzeige zeigen.`,
        };
      }
      if (!inhalt || !inhalt.length) return { dokument: null, fehler: `${sauber} ist leer.` };
      if (inhalt.length > grenzeBytes) {
        return {
          dokument: null,
          fehler: `${sauber} ist ${inhalt.length} Bytes groß, die Grenze liegt bei ${grenzeBytes}.`,
        };
      }
      const dokument = await ablage.anlegen({
        name: sauber,
        art,
        groesse: inhalt.length,
        von: von || "unbekannt",
        abgelegt: new Date().toISOString(),
        inhalt,
      });
      return { dokument, fehler: null };
    },

    /** Genau eines, mit Bytes, oder null. */
    async holen(id) {
      return await ablage.eines(id);
    },

    /** Weg damit. */
    async entfernen(id) {
      return await ablage.loeschen(id);
    },
  };
}
