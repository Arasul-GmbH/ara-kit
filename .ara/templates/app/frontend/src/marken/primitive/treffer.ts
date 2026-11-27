/**
 * Die Trefferflaeche bei grobem Zeiger: mindestens 44 px, auch wenn das
 * sichtbare Teil kleiner bleibt. So will es der Entwurf: am Handy und bei
 * grobem Zeiger ist jede Trefferflaeche mindestens 44 px.
 *
 * Ein leeres `::before` legt sich mittig ueber das Element und faengt den
 * Finger. Das geht nur bei Elementen, die Kinder haben duerfen (`button`,
 * die Radix-Wurzeln von Checkbox, Radio, Schalter, Select); ein `<input>`
 * hat kein `::before` und waechst deshalb selbst (`FELD_GROB`).
 *
 * Seit 5.0 am Knopf, seit 5.11.0 auch an den Feldern, die bis dahin am Handy
 * 32 px hoch blieben.
 */
export const TREFFER =
  "relative pointer-coarse:before:absolute pointer-coarse:before:top-1/2 pointer-coarse:before:left-1/2 pointer-coarse:before:size-full pointer-coarse:before:min-h-11 pointer-coarse:before:min-w-11 pointer-coarse:before:-translate-x-1/2 pointer-coarse:before:-translate-y-1/2 pointer-coarse:before:content-['']";

/** Ein Eingabefeld bei grobem Zeiger: 44 px hoch statt 32 px. */
export const FELD_GROB = 'pointer-coarse:h-[44px]';
