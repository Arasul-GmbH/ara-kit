/**
 * Muster Belege: wann ein Vorgang vollständig ist, und welche Endung sein Beleg trägt. Liegt in
 * einer App aus der Vorlage unter `backend/kern/belege.mjs`, neben `vorgaenge.mjs`.
 *
 * `mitBeleg` gibt die Prüfung für `bereit` aus `kern/vorgaenge.mjs`: ein
 * Vorgang ohne Beleg wird nicht eingereicht und bleibt in Arbeit, mit dem Satz,
 * was fehlt. Eine Fach-App ersetzt sie durch ihre, eine Kanzlei etwa durch die
 * Liste der Unterlagen, die zu einem Abschluss gehören, und nennt jede, die
 * noch fehlt.
 *
 * `belegArgumente` gibt die Argumente für `argumente` aus `kern/vorgaenge.mjs`: die Endung des
 * Belegs, den das Gerät liest (`endung`: pdf, png oder jpg). Der Flow setzt sie in den Pfad
 * seines Originals, `api/vorgaenge/{{vorgang}}/beleg.{{endung}}`, denn die Freigabe erkennt
 * Bild und PDF am Ende des Pfades. So zeigt dieselbe App ein PDF und ein Handyfoto richtig,
 * ohne dass im Flow eine Endung fest steht.
 */

/** Die Arten, die das Gerät als Original liest (Kontrakt 14), mit der Endung, an der die Freigabe sie erkennt. */
export const LESBAR = { "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg" };

/** Welcher Beleg eines Vorgangs ans Gerät geht: der zuerst angehängte. `amVorgang` gibt das Neueste oben. */
export function ersterBeleg(belege) {
  return belege.length ? belege[belege.length - 1] : null;
}

/** Die Endung eines Belegs aus seiner Art, oder `null`, wenn das Gerät sie nicht liest. */
export function endungVon(beleg) {
  return LESBAR[String(beleg?.art || "").split(";")[0].trim().toLowerCase()] ?? null;
}

export function mitBeleg(dokumente) {
  return async (vorgang) =>
    (await dokumente.amVorgang(vorgang.id)).length > 0 || "Ohne Beleg wird nicht eingereicht: erst einen Beleg anhängen.";
}

export function belegArgumente(dokumente) {
  return async (vorgang) => {
    const beleg = ersterBeleg(await dokumente.amVorgang(vorgang.id));
    const endung = endungVon(beleg);
    return endung ? { endung } : {};
  };
}
