-- Muster Belege mit Muster 6 (Dokument auslesen): auch eine Auslesung trägt den Mandanten.
--
-- Sie setzt die 020 (Auslesen) und die 040 (Belege) voraus und kommt nur mit, wenn das Muster 6
-- in der App ist (`app.mjs --add-pattern` legt sie dann dazu). Eine Auslesung bleibt im
-- Protokoll, auch wenn ihr Dokument geht: dann gibt es keinen Umweg mehr, über den sie ihren
-- Mandanten fände. Bis Kit 0.77.0 stand diese Zeile in der 040; eine App, die sie dort trägt,
-- behält ihre 040 und bekommt diese Datei nicht.

ALTER TABLE auslesungen ADD COLUMN mandant INTEGER REFERENCES mandanten (id);

CREATE INDEX auslesungen_nach_mandant ON auslesungen (mandant, dokument_id);
