# Muster 6: Dokument auslesen

Ein Beleg kommt als PDF oder Foto, und die App macht Felder daraus: Datum, Betrag, Aussteller. Was
das Gerät liest, was ein Modell sieht und was du versprechen darfst, steht in
`.ara/knowledge/app-professional.de.md`, „Dokumente und Bilder auslesen"; hier stehen Code und
Einhängen. Es legt sich auf Muster 2 nebenan unter `documents/`. Der Überblick über alle Muster:
`.ara/knowledge/app-patterns.de.md`.

**Die Dateien**: das Protokoll als dritte Migration, eine Zeile je Auslesung, seine Ablage kann
anlegen und lesen, nie ändern oder löschen; der Kern `backend/kern/auslesen.mjs` mit `SCHEMA` und
`ANWEISUNG`, `pruefen` gegen das Schema, `fachlich` für deine eigenen Regeln; die Wege; die Seite
mit dem Dokument in der Anzeige, den Feldern daneben, den Mängeln darüber, dem Protokoll darunter.

**Einhängen** wie bei Muster 2: die Ordner kopieren, die Zeilen aus dem Kopf von
`backend/wege/auslesen.mjs` in `server.mjs`, **vor** die Wege der Dokumente, eine `Route` und ein
Eintrag in der Seitenleiste, dann `--build`. Der Ruf an das Gerät steht schon in der Vorlage,
`geraet.auslesen` in `backend/arasul.mjs`: der Weg aus `arasul.json`, die Datei als Formular mit dem
Schema, zurück kommen Felder, Modell, Dauer und ob die Texterkennung lief, und der Mensch geht für
das Protokoll des Geräts mit. **Kein Weg und kein Modellname steht im Muster**, der Selbsttest hält
es daran. Ein Foto kann auch selbst an ein Bildmodell gehen: `geraet.fragen` mit `bilder`, wie,
steht in `--contract` unter `bilder`.

**Ersetze `SCHEMA`, `ANWEISUNG` und `fachlich`** durch das, was dein Kunde liest. Ein flaches Schema
mit `required` ist am verlässlichsten; ein Feld, das das Modell raten müsste, lässt du besser weg,
und die Anweisung sagt es. Die Seite sagt, dass das Modell liest, und ein zweiter Klick startet
keine zweite Auslesung. Wer eine Auslesung verwirft, löst eine neue aus: das Protokoll behält jede.

**Geprüft**: der Selbsttest gegen ein gespieltes Gerät, Felder, ein Mangel am Steuersatz, keine
Felder, ein Fehler des Geräts, das Protokoll, nachdem das Dokument ging; der Orin am 25.09.2026 mit
einer Probe aus Vorlage, Muster 2 und diesem. Das Modell des Kunden und seine echten Belege prüfst
du an seinem Gerät.
