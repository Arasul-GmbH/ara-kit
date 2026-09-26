/**
 * Muster Belege: wann ein Vorgang vollständig ist. Liegt in einer App aus der
 * Vorlage unter `backend/kern/belege.mjs`, neben `vorgaenge.mjs`.
 *
 * `mitBeleg` gibt die Prüfung für `bereit` aus `kern/vorgaenge.mjs`: ein
 * Vorgang ohne Beleg wird nicht eingereicht und bleibt in Arbeit, mit dem Satz,
 * was fehlt. Eine Fach-App ersetzt sie durch ihre, eine Kanzlei etwa durch die
 * Liste der Unterlagen, die zu einem Abschluss gehören, und nennt jede, die
 * noch fehlt.
 */

export function mitBeleg(dokumente) {
  return async (vorgang) =>
    (await dokumente.amVorgang(vorgang.id)).length > 0 || "Ohne Beleg wird nicht eingereicht: erst einen Beleg anhängen.";
}
