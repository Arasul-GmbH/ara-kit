-- Die erste Migration: die Tabelle, in der die Vorgaenge liegen.
--
-- Eine Datei je Schritt, die Nummer vorn gibt die Reihenfolge. Eine Migration,
-- die einmal gelaufen ist, wird nie wieder angefasst: wer sie aendert, aendert
-- die Vergangenheit von Datenbanken, die es schon gibt. Was danach anders sein
-- soll, steht in 002.

CREATE TABLE vorgaenge (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  titel         TEXT    NOT NULL,
  text          TEXT    NOT NULL,
  -- Wer eingereicht hat. Kommt aus der Anmeldung des Geraets, nie aus einem
  -- Formularfeld.
  von           TEXT    NOT NULL,
  gestellt      TEXT    NOT NULL,
  status        TEXT    NOT NULL,
  -- Die Nummer des Laufs am Geraet. NULL heisst: es kam keiner zustande, und
  -- warum, steht in `hinweis`.
  lauf          TEXT,
  entschieden_von TEXT,
  begruendung   TEXT,
  bemerkung     TEXT,
  hinweis       TEXT
);

-- Die Liste zeigt das Neueste oben, und die Seite fragt nach, solange etwas
-- wartet. Beides liest ueber diesen Index.
CREATE INDEX vorgaenge_nach_stand ON vorgaenge (status, id DESC);
