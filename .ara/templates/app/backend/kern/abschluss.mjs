/**
 * Was passiert, wenn das Gerät das Ergebnis eines Flows übergibt. Der Kern der Abschluss-Route.
 *
 * Nach der letzten Stufe ruft das Gerät eine Route dieser App (`abschluss: { route }` im Kopf des
 * Flows) und macht den Lauf erst fertig, wenn sie mit 2xx antwortet. Drei Dinge hängen daran, und alle
 * drei stehen hier und nicht im Weg:
 *
 *   **Das Geheimnis.** Der Aufruf trägt `Authorization: Bearer <Geheimnis>`; unter welchem Namen das
 *   Gerät es in den Container legt, steht in `arasul.json` (`umgebung.abschluss_token`). Nur das
 *   Gerät kennt es; wer die Route aus dem Netz ruft, ohne es, bekommt 401 und legt nichts an. Kennt die
 *   App selbst keines (das Gerät hat es nicht in den Container gelegt, etwa vor dem nächsten
 *   Einspielen), antwortet sie 503 und nimmt gar nichts an: ohne Geheimnis kann sie niemanden
 *   erkennen, und „jeder darf" wäre die falsche Antwort darauf.
 *
 *   **Die Kennung.** `Idempotency-Key` trägt die Nummer des Laufs in der Form, die `arasul.json` unter
 *   `abschluss.kennung` nennt, mit `<nummer>` als Platzhalter. Fehlt sie, antwortet die App 503 wie
 *   ohne Geheimnis: eine geratene Form wiese jeden echten Aufruf ab. Zu einer Nummer legt die App ein Ergebnis
 *   genau einmal an; derselbe Aufruf kommt bei „erneut" noch einmal und bekommt wieder 2xx, ohne dass
 *   etwas doppelt entsteht. Die Nummer im Kopf und die im Rumpf müssen dieselbe sein.
 *
 *   **Erst gespeichert, dann 2xx.** Scheitert die Ablage, kommt 500: das Gerät lässt den Lauf auf
 *   „nicht übergeben" stehen, und der Administrator löst „erneut" aus. Ein 2xx vor dem Speichern wäre
 *   ein Ergebnis, das verloren geht, während der Lauf als fertig gilt.
 *
 * Kein `process.env`, kein SQL, kein HTTP hier: die Ablage, das Geheimnis und die Kennung kommen als Argument herein,
 * der Weg in `server.mjs` übersetzt die Antwort `{ status, antwort }`.
 */

import { createHash, timingSafeEqual } from "node:crypto";

/** Zwei Zeichenketten gleich lang vergleichen und ohne Zeitunterschied: erst Hash, dann Vergleich. */
function gleich(a, b) {
  const hash = (text) => createHash("sha256").update(String(text)).digest();
  return timingSafeEqual(hash(a), hash(b));
}

export function abschluss({ ablage, geheimnis, kennung, melden = () => {} }) {
  const erwartet = (lauf) => String(kennung).replace("<nummer>", lauf);
  return {
    /**
     * Einen Aufruf des Geräts annehmen. `kopf` sind die Kopfzeilen in Kleinbuchstaben, `rumpf` das
     * gelesene JSON oder `null`, wenn es keines war. Zurück kommt `{ status, antwort }`.
     */
    async annehmen({ kopf = {}, rumpf }) {
      if (!geheimnis || !kennung?.includes("<nummer>")) {
        return { status: 503, antwort: { fehler: "Diese App kennt das Geheimnis des Geräts oder die Form seiner Kennung nicht und nimmt deshalb nichts an. Beides kommt mit dem nächsten Einspielen." } };
      }
      const bearer = /^Bearer (.+)$/.exec(String(kopf.authorization || ""));
      if (!bearer || !gleich(bearer[1], geheimnis)) {
        return { status: 401, antwort: { fehler: "Der Aufruf trägt nicht das Geheimnis des Geräts." } };
      }
      if (!rumpf || typeof rumpf !== "object" || Array.isArray(rumpf)) {
        return { status: 400, antwort: { fehler: "Der Aufruf war nicht lesbar." } };
      }
      const lauf = rumpf.lauf === undefined || rumpf.lauf === null ? "" : String(rumpf.lauf).trim();
      if (!lauf || typeof rumpf.flow !== "string" || !rumpf.flow) {
        return { status: 400, antwort: { fehler: "Es fehlt die Nummer des Laufs oder der Name des Flows." } };
      }
      if (kopf["idempotency-key"] !== erwartet(lauf)) {
        return { status: 400, antwort: { fehler: `Der Kopf Idempotency-Key muss ${erwartet(lauf)} lauten, mit der Nummer des Laufs.` } };
      }

      let gespeichert;
      try {
        gespeichert = await ablage.speichern({
          lauf,
          flow: rumpf.flow,
          vorgang: rumpf.argumente?.vorgang ?? null,
          ergebnis: typeof rumpf.ergebnis === "string" ? rumpf.ergebnis : "",
          felder: rumpf.felder ?? null,
          korrekturen: rumpf.korrekturen ?? null,
        });
      } catch {
        return { status: 500, antwort: { fehler: "Das Ergebnis konnte nicht gespeichert werden. Das Gerät kann es mit „erneut“ noch einmal schicken." } };
      }
      // Wer mitschreibt (Muster Verlauf), erfährt es einmal, beim ersten Mal, mit dem, was ein Mensch
      // am Vorschlag geändert hat. Ein Fehler dabei nimmt die Annahme nicht zurück.
      if (gespeichert.neu && rumpf.argumente?.vorgang != null) {
        try {
          await melden({ vorgang: { id: Number(rumpf.argumente.vorgang) }, was: "abgeschlossen", wer: null, angaben: { korrekturen: rumpf.korrekturen ?? null } });
        } catch (fehler) {
          process.stderr.write(`Verlauf: Abschluss von Lauf ${lauf} nicht mitgeschrieben: ${fehler.message}\n`);
        }
      }
      // 201 beim ersten Mal, 200 beim zweiten: beides sagt dem Gerät „angekommen".
      return { status: gespeichert.neu ? 201 : 200, antwort: { lauf, gespeichert: true, neu: gespeichert.neu } };
    },
  };
}
