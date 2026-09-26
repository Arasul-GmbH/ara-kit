# Muster 7: Mandanten, wer was sieht und wer entscheidet

Was das Muster entscheidet und warum, steht in `.ara/knowledge/app-professional.de.md`,
„Mandanten: wer was sieht"; hier stehen Code, Einhängen und was geprüft ist. Der Überblick über
alle Muster: `.ara/knowledge/app-patterns.de.md`.

**Die Dateien**: die vierte Migration, Mandanten, gesehene Konten, Zuordnungen, eine Spalte
`mandant` an den Vorgängen; `backend/ablage/mandanten.mjs` mit `nurZugeordnete`, dem Filter als SQL
für jede Ablage; `backend/ablage/vorgaenge.mjs`, das die Ablage der Vorgänge der Vorlage ersetzt;
der Kern mit `verwaltungsRolle` (die Rolle aus dem Kontrakt, eine andere muss ebenso in
`koepfe.rollen` stehen), `regel` und `zustaendig`; die Wege; die Verwaltungsseite mit
`MandantWahl`.

**Einhängen**: die Ordner kopieren, die Zeilen aus dem Kopf von `backend/wege/mandanten.mjs` in
`server.mjs`, **vor** die Wege der Vorgänge, eine `Route`, ein Eintrag in der Seitenleiste, den
nur die Verwaltung sieht, `MandantWahl` in `seiten/neu.tsx`, wie der Kopf von
`frontend/src/seiten/mandanten.tsx` zeigt. Dann `--build`.

**Geprüft vom Selbsttest** gegen ein gespieltes Gerät, dessen Rollen anders heißen als die des
Orin: zwei Konten, zwei Mandanten, fremde Vorgänge 404, die Verwaltung 403 ohne die Rolle, die
Entscheider aus der Zuordnung, eine Entscheidung von jemandem, der nicht mehr zuständig ist, zählt
nicht, der Filter in jeder Abfrage.

**Geprüft am Orin am 26.09.2026** im Teststand, zwei echte Kontonamen in den Kopfzeilen der
Plattform: Trennung, 404 und die Verwaltungsrolle aus dem Kontrakt hielten; ein zugeordneter
Entscheider ohne Freigabe der App ließ das Gerät mit 400 ablehnen. **Ein Lauf, den ein zugeordneter
Entscheider genehmigt, wurde nicht gesehen**: er braucht eine Freigabe für zwei Konten, also eine
Sitzung als Administrator. Das ist der erste Nachweis am Gerät des Kunden.
