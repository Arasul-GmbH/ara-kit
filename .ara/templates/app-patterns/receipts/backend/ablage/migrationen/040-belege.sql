-- Muster Belege: ein Dokument trägt den Mandanten und hängt an einem Vorgang.
--
-- Sie setzt die 010 (Dokumente) und die 030 (Mandanten) voraus, nicht das Auslesen:
-- liest das Gerät den Beleg im Flow (Kontrakt 14), braucht es kein Muster 6. Mit Muster 6
-- trägt auch die Auslesung den Mandanten, in der 041 (`with-extract/`). Eine Migration, die einmal gelaufen ist, wird nie wieder angefasst.
-- Eine App, die sie schon als 005-belege.sql trägt, behält die alte Datei.
--
-- **Die Nummern der Muster kollidieren nicht.** Die Vorlage hält 001 bis 009, jedes Muster
-- einen eigenen Zehner: Dokumente 010, Auslesen 020, Mandanten 030 und 031, Belege 040.
-- Eigene Migrationen der App beginnen bei 100. Bis Kit 0.74.0 trugen Vorlage und Muster
-- Dokumente beide eine 002, und wer drei Muster zusammensetzte, sortierte von Hand.
--
-- **Der Mandant steht an jeder Zeile, nicht nur am Vorgang.** Ein Filter über
-- einen Umweg ist einer, den die nächste Abfrage vergisst.
--
-- **Der Mandant kommt vom Vorgang**, nie aus der Anfrage: die Ablage liest
-- ihn beim Ablegen am Vorgang ab. Ein Dokument aus der Zeit vor dieser
-- Migration hat keinen Mandanten, und ohne Mandant sieht es niemand. Welchem
-- es gehört, entscheidet die App in einer eigenen Migration, nicht diese.

ALTER TABLE dokumente ADD COLUMN mandant INTEGER REFERENCES mandanten (id);
ALTER TABLE dokumente ADD COLUMN vorgang INTEGER REFERENCES vorgaenge (id);

CREATE INDEX dokumente_nach_mandant ON dokumente (mandant, id DESC);
CREATE INDEX dokumente_nach_vorgang ON dokumente (vorgang);
