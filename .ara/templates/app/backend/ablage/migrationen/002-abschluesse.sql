-- Die zweite Migration: die Tabelle, in der die Ergebnisse der Läufe liegen.
--
-- Nach der letzten Stufe übergibt das Gerät das Ergebnis eines Flows an die Route `/abschluss/freigabe`
-- dieser App. Die Nummer des Laufs ist die Kennung und zugleich der Schlüssel der Tabelle: ruft das
-- Gerät dieselbe Route mit derselben Nummer noch einmal (bei „erneut"), liegt dort schon eine Zeile,
-- und es entsteht keine zweite.
--
-- JSON steht als Text, wie überall in dieser App, siehe `ablage/db.mjs`.

CREATE TABLE abschluesse (
  lauf        TEXT PRIMARY KEY,
  flow        TEXT NOT NULL,
  -- Die Nummer des Vorgangs, aus den Argumenten des Laufs. NULL, wenn der Flow keine nennt.
  vorgang     TEXT,
  ergebnis    TEXT NOT NULL,
  -- Je Feld der geltende Wert, mit der Korrektur eines Menschen. NULL ohne Erkennung.
  felder      TEXT,
  korrekturen TEXT,
  angenommen  TEXT NOT NULL
);
