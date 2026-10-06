/**
 * Die Listen, aus denen ein Feld einer Freigabe seine Werte nimmt.
 *
 * Ein Feld, das die KI vorschlägt und ein Mensch in der Freigabe ändern darf,
 * ist im Baustein der Bibliothek ein Textfeld. Kennt die App für dieses Feld
 * eine Liste, das Konto aus einem Kontenrahmen etwa, steht sie hier, und die
 * Seite „Freigaben" tut zweierlei damit: sie nennt zu jedem Vorschlag den
 * Namen („4910 Porto"), und eine Änderung auf einen Wert, der nicht in der
 * Liste steht, gibt sie nicht frei; eine Änderung auf einen anderen Wert der
 * Liste fragt sie einmal nach („4930 Bürobedarf statt 4910 Porto?").
 *
 * Handtest 06.10.2026: das Konto war ein freies Textfeld ohne Namen. Wer 4910
 * auf 4930 änderte, sah erst nach der Buchung „Bürobedarf", und ein Tippfehler
 * wie 49300 wäre gebucht worden.
 *
 * **Die Vorlage kennt keine Liste.** Ein Muster bringt seine mit: das Muster
 * Buchungsstapel legt eine eigene Fassung dieser Datei an, mit den Konten aus
 * `kern/skr03.mjs`. Eine App mit eigenen Listen schreibt sie hier hinein, je
 * Feld (der Name, den der Flow unter `felder` führt) eine Liste aus `wert` und
 * `name`. Die Seite holt sie über `GET /feldlisten`.
 */

export const FELDLISTEN = {};
