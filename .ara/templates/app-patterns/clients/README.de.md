# Muster 7: Mandanten, wer was sieht und wer entscheidet

Warum Mandanten und Freigaben so aussehen, steht in `.ara/knowledge/app-professional.de.md`; hier
stehen, was das Muster entscheidet, Code, Einhängen und was geprüft ist. Der Überblick über alle
Muster: `.ara/knowledge/app-patterns.de.md`.

**Was es entscheidet**: eine Zuordnung je Name aus der Kopfzeile der Anmeldung, keine zweite
Anmeldung; zuordnen lässt sich nur ein Name, den die App gesehen hat, also öffnet ein neuer
Mitarbeiter die App einmal. Die Ablage wird je Anfrage für einen Namen gebaut, der Filter steht im
WHERE, ein fremder Vorgang existiert nicht, ohne Namen keiner. Fremd heißt 404, 403 nur für die
Verwaltung, und die nur für eine Rolle in `freigaben.rollen` und `koepfe.rollen`; die Verwaltung
sieht Vorgänge nur ihrer eigenen Mandanten. **Sehen heißt nicht entscheiden**: eine Zuordnung mit
`entscheidet` entscheidet, die anderen sehen nur. Ein Vorgang entsteht in Arbeit und wird über
einen eigenen Weg eingereicht; danach bekommen Ändern und Einreichen 409.

**Die Dateien**: die Migrationen `004` (Mandanten, gesehene Konten, Zuordnungen, `mandant` an den
Vorgängen) und `006` (`entscheidet` an der Zuordnung); `backend/ablage/mandanten.mjs` mit
`nurZugeordnete`, dem Filter als SQL für jede Ablage; `backend/ablage/vorgaenge.mjs`, das die der
Vorlage ersetzt; der Kern mit `verwaltungsRolle`, `regel` und `zustaendig`; die Wege; die
Verwaltungsseite mit `MandantWahl` und `VorgangEinreichen`.

**Einhängen**: die Ordner kopieren, die Zeilen aus dem Kopf von `backend/wege/mandanten.mjs` in
`server.mjs`, **vor** die Wege der Vorgänge, eine `Route`, ein Eintrag in der Seitenleiste, den nur
die Verwaltung sieht, `MandantWahl` in `seiten/neu.tsx`, `VorgangEinreichen` in die Einzelheiten,
wie der Kopf von `frontend/src/seiten/mandanten.tsx` zeigt. `bereit` in diesen Zeilen sagt, wann
ein Vorgang vollständig ist. Dann `--build`.

**Geprüft vom Selbsttest** gegen ein gespieltes Gerät mit anderen Rollennamen: fremde Vorgänge
404, die Verwaltung 403 ohne die Rolle, nur Entscheider in der Regel, 409 nach dem Einreichen, der
Filter in jeder Abfrage. **Am Orin am 26.09.2026** mit zwei Konten im Teststand: in Arbeit ohne
Lauf, ohne Beleg 409, nur der Entscheider in der Regel, der Einreicher 403 am Gerät, danach 409, der
Satz des Flows 22 Sekunden nach der Freigabe nachgezogen.
