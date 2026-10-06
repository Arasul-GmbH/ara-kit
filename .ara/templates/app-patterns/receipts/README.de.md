# Muster 8: Belege je Mandant am Vorgang

Ein Beleg hängt an einem Vorgang, gehört dessen Mandanten, das Gerät liest ihn, und niemand eines
anderen Mandanten sieht ihn. Braucht die Muster 2 und 7; Muster 6 nur für den zweiten Weg unten.
Überblick: `.ara/knowledge/app-patterns.de.md`.

**Einhängen**: `node .ara/tools/app.mjs --app <app> --add-pattern documents,clients,receipts`, dann
`--build`. Das Werkzeug kopiert die Dateien, legt die Migration `040` dazu (mit Muster 6 auch die
`041`), setzt die Wege vor die der Mandanten, `bereit` und `argumente` in deren Zeilen, die Belege in
die Einzelheiten eines Vorgangs und eine Seite „Alle Belege“, und lässt das Original des Flows auf den
Beleg zeigen.

**Zwei Wege, einen Beleg zu lesen.**

- **Im Flow** (Kontrakt 14, ohne Muster 6): das Gerät liest den Beleg als `original` des Schritts
  `lesen`, und die Freigabe zeigt ihn neben den Feldern. Der Weg `vorgaenge/<nr>/beleg.<endung>`
  liefert den ersten Beleg, und das Flow-Argument `endung` (pdf, png oder jpg) setzt die Endung, so
  zeigt die Freigabe ein PDF und ein Handyfoto richtig. Dieser Weg, wenn ohnehin ein Mensch jeden
  Beleg prüft.
- **In der App** (Muster 6, `--add-pattern extract`): die App liest vor dem Einreichen, zeigt
  Mängel und hält jedes Auslesen im Protokoll. Dieser Weg, wenn die Felder vor der Freigabe gebraucht
  werden, oder an einem Gerät vor Kontrakt 14.

**Was gilt**: der Mandant kommt vom Vorgang, nie aus der Anfrage. Ein Vorgang ohne Beleg ist nicht
vollständig (`mitBeleg`, ersetze es durch deine Liste der erwarteten Unterlagen). Nach dem Einreichen
sind die Belege eingefroren: Anhängen, Entfernen und neues Auslesen bekommen 409. Ein Beleg ist PDF,
PNG oder JPEG, ein anderes Format bekommt 415 mit einem Satz. Fehlt die Datei, ist sie zu groß oder
nicht lesbar, ruft das Gerät kein Modell, und der Lauf hält mit einer Freigabe an, die den Grund
nennt; die Grenzen stehen im Kontrakt. Schreib keine Beträge oder Daten des Vorgangs in den
`auftrag`: das Papier ist die Quelle.

**Die Belegliste** (die Seite „Alle Belege“) zeigt Mandant und Betrag; der Mandant bricht um, statt mit „…“ zu
enden. Der Betrag kommt aus dem Ergebnis, das das Gerät nach der Prüfung übergibt (`betragFeld` in
`server.mjs`, vorgegeben das Feld `betrag`), vorher steht ein Strich. **Mit Muster 9** kommt das Konto
in der Freigabe aus dessen Liste, mit Namen, und ein geändertes Konto wird einmal nachgefragt.

**Vom Selbsttest geprüft** gegen ein gespieltes Gerät: ein fremder Beleg, seine Bytes, sein Original
und sein Verlauf 404; ein Beleg ohne Vorgang 400; ein anderes Format 415; PDF und Foto gehen mit ihrer
Endung an den Flow; kein Einreichen ohne Beleg; nach dem Einreichen 409.
