/**
 * Muster Buchungsstapel: die Konten als Liste für die Freigabe. Ersetzt
 * `backend/kern/feldlisten.mjs` der Vorlage.
 *
 * Das Feld `konto` einer Freigabe nimmt seine Werte aus `KONTEN` in
 * `kern/skr03.mjs`: die Seite „Freigaben" nennt zu jedem Vorschlag den Namen
 * des Kontos, gibt kein Konto frei, das nicht in der Liste steht, und fragt
 * einmal nach, wenn jemand den Vorschlag auf ein anderes Konto ändert. Heißt
 * das Feld im Flow anders, steht hier dieser Name.
 *
 * Die Liste ist die Beispielauswahl aus `kern/skr03.mjs`, keine Steuerberatung:
 * vor live die Konten der Kanzlei dort eintragen, nicht hier.
 */

import { KONTEN } from "./skr03.mjs";

export const FELDLISTEN = {
  konto: Object.entries(KONTEN).map(([wert, name]) => ({ wert, name })),
};
