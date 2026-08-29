/**
 * Die Fassung der Bibliothek.
 *
 * Sie steht in einer eigenen Datei, weil zwei Dinge sie lesen: das Buendel
 * unter `browser/` traegt sie (dort ist sie der einzige Beleg dafuer, aus
 * welchem Stand der Quelle es gebaut wurde), und `scripts/test/marken.py`
 * vergleicht beide. Wer die Bausteine aendert, hebt sie und baut neu --
 * sonst faellt der Waechter.
 */
export const FASSUNG = '1.1.0';
