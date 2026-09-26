# Muster 8: Belege je Mandant am Vorgang

Die Muster 2, 6 und 7 zusammen: ein Beleg hängt an einem Vorgang, gehört dessen Mandanten, das
Gerät liest ihn aus, und niemand eines anderen Mandanten sieht ihn. Überblick:
`.ara/knowledge/app-patterns.de.md`.

**Die Dateien**: die fünfte Migration, eine Spalte `mandant` an Dokumenten und Auslesungen,
`vorgang` an Dokumenten; die Ablagen der Muster 2 und 6 ersetzt durch solche, die je Anfrage für
einen Namen gebaut werden, mit `nurZugeordnete` in jeder Abfrage; die Wege in
`backend/wege/belege.mjs`; `mitBeleg` in `backend/kern/belege.mjs`; `BelegeAmVorgang` für die
Einzelheiten eines Vorgangs. **Der Mandant kommt vom Vorgang**, nie aus der Anfrage. Eine Auslesung
trägt ihren eigenen: ihr Protokoll bleibt, wenn das Dokument geht.

**Ein Vorgang ohne Beleg ist nicht vollständig**: `mitBeleg` ist das `bereit` von Muster 7, ersetze
es durch deine Liste der erwarteten Unterlagen. **Nach dem Einreichen sind die Belege eingefroren**:
Anhängen, Entfernen und neues Auslesen bekommen 409, der Entscheider gibt frei, was er gesehen hat.

**Einhängen**: zuerst die Muster 2, 6 und 7, dann dieser Ordner darüber. Der Kopf von
`backend/wege/belege.mjs` ersetzt die Zeilen der Muster 2 und 6 in `server.mjs` und nennt die Zeile
für `bereit`, der Kopf von `frontend/src/seiten/belege.tsx` zeigt die Zeile in `seiten/liste.tsx`.
Dann `--build`.

**Geprüft vom Selbsttest** gegen ein gespieltes Gerät: ein fremdes Dokument, seine Bytes, seine
Auslesung und sein Protokoll 404; ein Beleg ohne Vorgang 400; kein Einreichen ohne Beleg; nach dem
Einreichen 409; die Auslesung kommt am Gerät mit ihrem Menschen an.
