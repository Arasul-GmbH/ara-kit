# Muster 7: Mandanten, wer was sieht und wer entscheidet

Warum Mandanten und Freigaben so aussehen, steht in `.ara/knowledge/app-professional.de.md`; hier
stehen, was das Muster entscheidet, Code, Einhängen und was geprüft ist. Der Überblick über alle
Muster: `.ara/knowledge/app-patterns.de.md`.

**Was es entscheidet, in einfachen Worten**: der Admin weist jedem Mitarbeiter die Akten zu, an
denen er arbeitet (ein „Mandant" ist hier jede Akte: ein Mandant, ein Projekt, ein Fall). Ein
Mitarbeiter sieht nur diese Akten und nichts von den anderen. Eine fremde Akte gibt es für ihn
nicht: er bekommt „nicht gefunden", nie „nicht erlaubt", denn „nicht erlaubt" verriete, dass die
Akte da ist. Nur der Admin darf Akten zuweisen. **Ob der Admin alle Akten sieht, ist eine
Entscheidung der App**, ein Schalter in einer Zeile (`alleSehen`): in einer Kanzlei sehen die
Partner jede Akte, in einem Betrieb mit getrennten Abteilungen sieht auch der Admin nur, was ihm
zugewiesen ist (die Vorgabe). Das Interview fragt danach. **Zuweisen geht auch vor dem ersten
Öffnen**: eine neue Mitarbeiterin wird mit dem Namen ihres Kontos vorgemerkt, sieht ihre Akten beim
ersten Öffnen, und bis dahin steht sie in der Liste als „noch nie geöffnet". **Sehen heißt nicht
freigeben**: zu jedem Mitarbeiter und jeder Akte sagt der Admin
auch, ob er sie freigeben darf oder nur ansehen. Ein neuer Vorgang ist zuerst „in Arbeit", wird mit
einem eigenen Knopf eingereicht, und danach kann ihn niemand mehr ändern.

Wie es darunter arbeitet: der Name kommt aus der Kopfzeile der Anmeldung am Gerät, es gibt also
keine zweite Anmeldung; die App kann die Konten des Geräts nicht auflisten, darum wählt die
Verwaltung aus den Namen, die sie gesehen hat, oder merkt einen neuen vor. Die Ablage wird je Anfrage
für eine Sicht gebaut (ein Name, oder `{ benutzer, alle }` für die Verwaltung mit `alleSehen`), und
der Filter steht im WHERE, ein fremder Vorgang existiert also nicht, ohne Namen keiner. Fremd heißt 404, 403 nur
für die Verwaltung, und die nur für eine Rolle in `freigaben.rollen` und `koepfe.rollen`. Eine
Zuordnung mit `entscheidet` entscheidet, die anderen sehen nur. Ändern und Einreichen eines
eingereichten Vorgangs bekommen 409.

**Die Dateien**: die Migrationen `030` (Mandanten, gesehene Konten, Zuordnungen, `mandant` an den
Vorgängen) und `031` (`entscheidet` an der Zuordnung); `backend/ablage/mandanten.mjs` mit
`nurZugeordnete`, dem Filter als SQL für jede Ablage; `backend/ablage/vorgaenge.mjs`, das die der
Vorlage ersetzt; der Kern mit `verwaltungsRolle`, `sicht`, `regel` und `zustaendig`; die Wege; die
Verwaltungsseite mit `MandantWahl` (gibt es genau einen Mandanten, ist er gewählt) und
`VorgangEinreichen`. **Die Migrationen kollidieren nicht** mit der Vorlage (001 bis 009) und den
anderen Mustern (je ein Zehner); eigene der App beginnen bei 100.

**Einhängen**: die Ordner kopieren, die Zeilen aus dem Kopf von `backend/wege/mandanten.mjs` in
`server.mjs`, **vor** die Wege der Vorgänge, eine `Route`, ein Eintrag in der Seitenleiste, den nur
die Verwaltung sieht, `MandantWahl` in `seiten/neu.tsx`, `VorgangEinreichen` in die Einzelheiten,
wie der Kopf von `frontend/src/seiten/mandanten.tsx` zeigt. `bereit` in diesen Zeilen sagt, wann
ein Vorgang vollständig ist. Der Ordner `backend/probe/` kommt mit der Kopie mit. Dann `--build`.

**Der Test, der mitkommt**: `backend/probe/fremde-akte.mjs` legt zwei Probe-Akten an, weist je eine
zwei Mitarbeitern zu und versucht von der einen Seite aus alles, was die Akte der anderen erreichen
könnte: ansehen, ändern, einreichen, darin anlegen, sie in der Liste finden. Jede Antwort muss 404
sein. **Er braucht drei Sitzungen, nicht zwei**: eine Verwaltung (die Rolle, die Mandanten pflegt,
am Gerät meist admin, der App im Teststand freigegeben), die die Probe-Akten anlegt, und zwei
Mitarbeiter ohne diese Rolle. **Der Weg ohne Browser kommt zuerst**: das Kit holt die Ausweise, mit
`node .ara/tools/device.mjs --name <gerät> --admin-login --login-user <konto> --password-ref <name> --token`
(oder `adminSession` in einem Kit-Skript) und den Passwörtern aus der Ablage des Kits, und schreibt jeden als
`"authorization": "Bearer <ausweis>"` in die Datei, nur für sich lesbar. Cookies aus dem Browser sind der
Rückfall. Die drei Sitzungen stehen in einer Datei (`--sitzungen <datei>`),
nicht im Aufruf, und die Datei geht danach weg; wie sie aussieht, steht im Kopf des Tests. Lauf
ihn im Teststand, bevor die App live geht; die Zuordnungen löst er danach wieder. Ein Gerät mit selbst ausgestelltem Zertifikat braucht `--unsicher`,
das dieses Zertifikat für die eigenen Anfragen des Tests annimmt und sonst nirgends.

**Geprüft vom Selbsttest** gegen ein gespieltes Gerät mit anderen Rollennamen: fremde Vorgänge
404, die Verwaltung 403 ohne die Rolle, nur Entscheider in der Regel, 409 nach dem Einreichen, der
Filter in jeder Abfrage. **Am Orin am 26.09.2026** mit zwei Konten im Teststand: in Arbeit ohne
Lauf, ohne Beleg 409, nur der Entscheider in der Regel, der Einreicher 403 am Gerät, danach 409, der
Satz des Flows 22 Sekunden nach der Freigabe nachgezogen.
