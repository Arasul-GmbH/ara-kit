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
 * **Was eingereicht ist, bleibt, wie es war.** Hängt ein Dokument an einem
 * Vorgang (Muster Belege), fragt der Kern vor dem Anhängen und vor dem
 * Entfernen `darfAendern` aus `vorgaenge.mjs` der Vorlage, und der Weg
 * antwortet 409, sobald der Vorgang eingereicht ist. Dafür bekommt er die
 * Ablage der Vorgänge als `vorgaenge`; ohne sie hängt kein Dokument an einem
 * Vorgang, und es gibt nichts zu prüfen.
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

import { darfAendern } from "./vorgaenge.mjs";

export const GRENZE_BYTES = 10 * 1024 * 1024;

export function dokumente({ ablage, vorgaenge = null, grenzeBytes = GRENZE_BYTES }) {
  /** Warum an diesem Vorgang nichts mehr dazukommt oder geht, oder `null`, wenn es darf. */
  async function gesperrt(nummer) {
    if (!vorgaenge || !nummer) return null;
    const vorgang = await vorgaenge.eines(nummer);
    if (!vorgang) return { status: 404, fehler: `Vorgang ${nummer} gibt es nicht.` };
    if (darfAendern(vorgang)) return null;
    return { status: 409, fehler: `Vorgang ${nummer} ist eingereicht und steht auf "${vorgang.status}". Daran kommt nichts mehr dazu, und nichts geht.` };
  }

  return {
    grenzeBytes,

    /** Alle Dokumente, ohne ihre Bytes, das Neueste oben. */
    async auflisten() {
      return await ablage.alle();
    },

    /**
     * Ein Dokument ablegen.
     *
     * Zurück kommt entweder das Dokument oder der Satz, warum nicht, und dann
     * `status` für den Weg, wenn es nicht 400 ist. Kein stilles null: wer
     * hochlädt, soll lesen können, woran es lag.
     */
    async ablegen({ name, art, inhalt, von, vorgang = null }) {
      const sperre = await gesperrt(vorgang);
      if (sperre) return { dokument: null, ...sperre };
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
        // Nur mit dem Muster Belege: dort hängt ein Dokument an einem Vorgang
        // und erbt dessen Mandanten. Die Ablage dieses Musters kennt das Feld nicht.
        vorgang,
      });
      if (!dokument) return { dokument: null, fehler: `${sauber} wurde nicht abgelegt.` };
      return { dokument, fehler: null };
    },

    /** Genau eines, mit Bytes, oder null. */
    async holen(id) {
      return await ablage.eines(id);
    },

    /** Weg damit. Zurück kommt `{ status, fehler }`: 200, 404, oder 409 an einem eingereichten Vorgang. */
    async entfernen(id) {
      if (vorgaenge) {
        const dokument = await ablage.eines(id);
        if (!dokument) return { status: 404, fehler: `Dokument ${id} gibt es nicht.` };
        const sperre = await gesperrt(dokument.vorgang);
        if (sperre) return { status: 409, fehler: sperre.fehler };
      }
      return (await ablage.loeschen(id)) ? { status: 200, fehler: null } : { status: 404, fehler: `Dokument ${id} gibt es nicht.` };
    },
  };
}
