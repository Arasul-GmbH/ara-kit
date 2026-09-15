-- Muster Dokumente: die Tabelle, in der hochgeladene Dateien liegen.
--
-- Zweite Migration einer App aus der Vorlage. Die Nummer vorn gibt die
-- Reihenfolge, und wer die 001 schon hat, bekommt beim nächsten Start genau
-- diese hier dazu. Eine Migration, die einmal gelaufen ist, wird nie wieder
-- angefasst.
--
-- Die Bytes liegen IN der Datenbank und nicht daneben in einem Ordner: ein
-- Gerät gibt einer App heute keinen eigenen Datenordner, und die Datenbank ist
-- der eine Ort, den diese App schon hat. Sie überlebt einen Neustart des
-- Containers und nicht das nächste Einspielen. Das gehört in die README der
-- App, bevor der Kunde es merkt.

CREATE TABLE dokumente (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  -- Der Dateiname, wie der Mensch ihn kennt. Er steht in der Liste und in der
  -- Kopfzeile der Dokumentanzeige.
  name      TEXT    NOT NULL,
  -- Der MIME-Typ, wie der Browser ihn beim Hochladen genannt hat. Daran
  -- entscheidet die Oberfläche, ob die Dokumentanzeige ein PDF oder ein Bild
  -- vor sich hat.
  art       TEXT    NOT NULL,
  groesse   INTEGER NOT NULL,
  -- Wer hochgeladen hat. Kommt aus der Anmeldung des Geräts, nie aus dem
  -- Formular.
  von       TEXT    NOT NULL,
  abgelegt  TEXT    NOT NULL,
  inhalt    BLOB    NOT NULL
);

-- Die Liste zeigt das Neueste oben und ohne die Bytes.
CREATE INDEX dokumente_nach_zeit ON dokumente (id DESC);
