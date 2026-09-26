-- Muster Belege: Dokumente und Auslesungen tragen den Mandanten, ein Dokument
-- hängt an einem Vorgang.
--
-- Fünfte Migration einer App aus der Vorlage. Sie setzt die 002 (Dokumente),
-- die 003 (Auslesen) und die 004 (Mandanten) voraus. Eine Migration, die
-- einmal gelaufen ist, wird nie wieder angefasst.
--
-- **Der Mandant steht an jeder Zeile, nicht nur am Vorgang.** Ein Filter über
-- einen Umweg ist einer, den die nächste Abfrage vergisst. Und eine Auslesung
-- bleibt im Protokoll, auch wenn ihr Dokument geht: dann gibt es keinen
-- Umweg mehr, über den sie ihren Mandanten fände.
--
-- **Der Mandant kommt vom Vorgang**, nie aus der Anfrage: die Ablage liest
-- ihn beim Ablegen am Vorgang ab. Ein Dokument aus der Zeit vor dieser
-- Migration hat keinen Mandanten, und ohne Mandant sieht es niemand. Welchem
-- es gehört, entscheidet die App in einer eigenen Migration, nicht diese.

ALTER TABLE dokumente ADD COLUMN mandant INTEGER REFERENCES mandanten (id);
ALTER TABLE dokumente ADD COLUMN vorgang INTEGER REFERENCES vorgaenge (id);
ALTER TABLE auslesungen ADD COLUMN mandant INTEGER REFERENCES mandanten (id);

CREATE INDEX dokumente_nach_mandant ON dokumente (mandant, id DESC);
CREATE INDEX dokumente_nach_vorgang ON dokumente (vorgang);
CREATE INDEX auslesungen_nach_mandant ON auslesungen (mandant, dokument_id);
