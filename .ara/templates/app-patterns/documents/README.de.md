# Muster 2: Dokument hochladen und in der Dokumentanzeige zeigen

Ein hochgeladenes Dokument wird am Gerät angesehen statt heruntergeladen: PDF mit Seiten, Zoom und
Vollbild, ein Bild ebenso, in der `Dokumentanzeige` der Bibliothek (seit 4.1.0, die trägt die
Vorlage). Der Überblick über alle Muster: `.ara/knowledge/app-patterns.de.md`.

**Die Dateien**: die Tabelle als zweite Migration, die Ablage (ihre Liste trägt keine Bytes), ein
Kern, der PDF und Bilder bis zu einer Grenze annimmt, die Wege (die Datei roh als Rumpf, ihr Name
in einer Kopfzeile), und die Seite: `Dateiablage` nimmt die Datei, `Datenliste` listet,
`Dokumentanzeige` zeigt die gewählte. **Einhängen**: `backend/` und `frontend/` über die Ordner der
App kopieren; die Köpfe von `backend/wege/dokumente.mjs` und `frontend/src/seiten/dokumente.tsx`
zeigen die Zeilen für `server.mjs`, die `Route` und die Seitenleiste. Dann `--build`.

Die Anzeige, gelesen in der Bibliothek am 15.09.2026:

- Ihre `quelle` ist eine `File`, ein `Blob` oder eine Adresse desselben Ursprungs. **Gib ihr die
  `art`**, `pdf` oder `bild`, bei einer Adresse: die Adresse der eigenen Bytes hat keine Endung,
  darum nimmt die Seite sie aus dem abgelegten Typ. `hoehe` setzt die Höhe.
- **Die PDF-Bibliothek braucht Hilfsdateien neben dem gebauten JavaScript**, den Ordner
  `pdf-dateien/`, den die `vite.config.ts` der Vorlage bei jedem Bau dorthin legt. Ohne ihn zeigt
  ein Bild sich, und ein PDF endet im Fehlerzustand.
- `Dateiablage` hat eine Vorschau (`vorschau`); diese Seite schaltet sie ab, zwei Anzeigen wären
  eine zu viel.

**Die Bytes liegen in der Datenbank der App** als `BYTEA`, warum: `.ara/knowledge/app.de.md`,
„Daten, die bleiben". Die Grenze ist zehn Megabyte je Datei, gesetzt im Kern;
sie hängt am Speicher des Containers im Manifest, heb beides zusammen. **An einem Vorgang** (Muster
8) bekommt der Kern die Ablage der Vorgänge und antwortet auf Anhängen und Entfernen mit 409, sobald
der Vorgang eingereicht ist. Ein Dokument in Felder
auslesen ist Muster 6, nebenan unter `extract/`.
