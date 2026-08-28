# Was sich am Ara-Kit geändert hat

Der Stand dieses Kits steht in `.ara/VERSION`. Diese Datei sagt, was zwischen
zwei Ständen dazugekommen ist und bis zu welcher Kontraktfassung ein Stand mit
einem Gerät zusammenarbeitet. `/init` liest beides vor, bevor es einspielt, und
`node .ara/tools/update.mjs --check` sagt, von welchem Stand auf welchen es
ginge.

**Die Zeile `Kontrakt: bis <zahl>` ist keine Aussage über ein Gerät.** Sie sagt,
welche Fassungen dieses Kit versteht. Welche Fassung ein Gerät führt, sagt sein
Kontrakt, und nur der: `node .ara/tools/app.mjs --device <gerät> --contract`.

Aufbau eines Eintrags: `## <nummer> (<datum>)`, darunter die Kontraktzeile und
die Punkte als Aufzählung. Das Werkzeug liest genau diese Form, siehe
`.ara/tools/lib/version.mjs`. Die englische Fassung dieser Datei ist
`.ara/CHANGELOG.md` und trägt dieselben Nummern und dieselben Punkte.

## 0.14.4 (2026-08-28)

Kontrakt: bis 3

- Der Selbsttest löschte Akten, die ihm nicht gehörten. Nach Trockenläufen, die nichts anlegen, räumte er `devices/orin`, `devices/mac`, `devices/thor` und `devices/dgx-spark` weg, und genau so heißt ein Gerät ohne Kunden nach dem eigenen Wissen des Kits. Am 28.08.2026 löschte jeder Selbsttestlauf die Akte und den Laufzettel eines frisch installierten Jetson AGX Orin. Er vergleicht jetzt den Stand vorher gegen den Stand danach, statt aufzuräumen, und eine eigene Prüfung verbietet, unter `devices/`, `customers/` oder `apps/` etwas zu löschen, das der Selbsttest nicht selbst angelegt hat.
- `--admin-login` konnte an einem echten Gerät nicht funktionieren. Jede Antwort ohne `data`-Umschlag fiel in `call()` weg, und die Anmeldung von Produkt 0.3.0 antwortet ohne einen: das Kit sagte "kein Ausweis in der Antwort", während er dort stand. Die Antwort trägt jetzt `body` neben `data`.
- Die Felder der Anmeldung hießen im Rückfall des Kits `benutzer` und `passwort`. An einem Jetson AGX Orin mit 0.3.0 gemessen: das Gerät weist die beiden mit einem Validierungsfehler ab und nimmt `username` und `password`. Der Rückfall sagt jetzt, was gemessen wurde. Was das Artefakt sagt, sticht ihn weiter, und was im Aufruf steht, sticht beides.
- `--login-user-field` und `--login-password-field` geben die beiden Feldnamen im Aufruf mit, und die Absage nennt sie. Vorher sagte der Fehler, mit welchen Feldern gerufen wurde, und bot keinen Weg, andere mitzugeben.
- Die Attrappe im Selbsttest antwortete, wie das Kit es sich wünschte, mit dem Ausweis in einem `data`-Umschlag. Sie antwortet jetzt wie das echte Gerät, und der Fall mit Umschlag wird daneben geprüft.

## 0.14.3 (2026-08-28)

Kontrakt: bis 3

- "Was der Installer nicht konnte" ließ genau das weg, wofür es da ist. Gemessen an einem Jetson AGX Orin, erste echte Installation: die Liste hörte bei zwölf Zeilen auf, und die zwölf waren das Rauschen. `SSH-Hardening fehlgeschlagen`, `Firewall-Setup fehlgeschlagen` und `must be run as root` kamen später in der Ausgabe und fielen hinten heraus, und das Gerät ging als fertig durch, ohne Härtung und ohne Firewall. Dieselbe Warnung mit wechselndem Zeitstempel zählt jetzt als eine Zeile, Absagen kommen vor Warnungen, wenn die Liste abschneiden muss, Farbcodes fallen weg, und was abgeschnitten wurde, wird mit seiner Zahl gesagt.
- Der Selbsttest maß das an sechs erfundenen Zeilen, wo nichts etwas verdrängen kann. Er misst es jetzt ein zweites Mal in der Menge, in der es wirklich vorkommt.
- Drei Prüfungen maßen den Arbeitsordner statt das Kit und wurden auf jedem Rechner rot, der einmal installiert hat: der Spiegel ist das Artefakt des Produkts, geholt und nie vom Kit geschrieben, und er trägt Gedankenstriche, Verweise auf eigene Dateien und eigene Befehle. Gedankenstriche, Verweise und Befehle halten jetzt vor `.ara/mirror/` an.
- `Spiegel holt und packt aus` reichte sein Token über die Prozessumgebung, und die kommt in `getSecret` zuletzt. Mit einem echten Token im Schlüsselbund trat der abgelehnte Fall nie ein. Die Prüfung läuft jetzt gegen eine umgelenkte `.env`, und dann zählt nur sie.

## 0.14.2 (2026-08-28)

Kontrakt: bis 3

- Ein Geheimnis ging in den macOS-Schlüsselbund und war danach nicht da. `security add-generic-password -w` fragt den Wert zweimal ab, zur Bestätigung, und wer ihn einmal über die Leitung schickt, bekommt "passwords don't match", einen leeren Eintrag und trotzdem Status 0: das Kit meldete Erfolg und hatte nichts abgelegt. Gefunden beim Messen der Abnahme A2 an einem Jetson AGX Orin, wo das Download-Token der leere Eintrag war und die Installation daran nicht erreichbar war. Der Wert geht jetzt zweimal hinein und wird danach zurückgelesen, und ein Wert, der sich anders zurückliest, ist ein Fehler und kein abgelegtes Geheimnis. Getroffen hätte es auch das Startpasswort und den Kit-Schlüssel, und beide werden genau einmal genannt.
- Der Selbsttest schreibt einmal wirklich in den Schlüsselbund und liest zurück, unter einem eigenen Namen, den er wieder wegräumt, denn ein Eintrag, der existiert, ist kein Eintrag, der stimmt.
- `Ein frischer Klon spricht Englisch` maß den Arbeitsordner statt das Kit: der englische Fall lief im echten Kit, und das hat ein Profil, sobald jemand einmal `/init` gerufen hat. Beide Fälle laufen jetzt in einem Wegwerf-Klon.

## 0.14.1 (2026-08-28)

Kontrakt: bis 3

- `--compose`, der Weg auf ein Gerät ohne Arasul, schreibt in den Merker wie jeder andere Weg an ein Gerät, als `compose` und nicht als Teststand oder live. Gefunden bei der Messung der Abnahme A3 an einem Jetson AGX Orin: die App antwortete unter `http://<gerät>:8080/`, und `node .ara/tools/app.mjs --app <name>` sagte, vom Kit sei noch nichts eingespielt worden. `lastStand` zählt einen Compose-Stand mit, die Lagezeile nennt ihn mit Fassung, Zeit, Adresse und dem Satz, dass Arasul dort nicht ist. Die Schritte bleiben, wie sie waren: `--check` und `--deploy` sind weiter das, was kommt, wenn das Gerät Arasul bekommt.

## 0.14.0 (2026-08-28)

Kontrakt: bis 3

- Der Weg, Arasul zu kaufen, hängt an `/device`, und einen Befehl dafür gibt es nicht: keinen Befehl namens kaufen oder lizenz. Ist das Urteil unterstützt, läuft nichts von Arasul und ist kein Token hinterlegt, sagt das Werkzeug das unter „Nächste Schritte", mit dem Link `https://www.arasul.de/kaufen`, und die Frage, ob installiert wird, läuft über das Interview-Werkzeug. Konto und Token holt der Mensch dort selbst: ein Konto ist kostenlos und bringt genau einen kostenlosen Geräte-Token für den persönlichen Gebrauch, jede weitere Installation wird gekauft, kommerzieller Einsatz braucht die Lizenz zu 3.000 Euro netto. Die Fakten stehen an einer Stelle, `.ara/tools/lib/licence.mjs`, und in `.ara/knowledge/device.de.md` unter „Das Token"; die Geschichte von fünf Token je Partner aus dem Portal ist aus jedem Blatt und jedem Werkzeug verschwunden.
- Der eingefügte Token geht über die Leitung hinein, nie als Argument: `printf '%s' "$TOKEN" | node .ara/tools/device.mjs --licence --store`. Das Werkzeug prüft die Form, `ara_` und 32 Hexzeichen, fragt das Portal mit `pruefen=1`, ohne das Artefakt zu holen, legt ihn unter `ARASUL_TOKEN` ab und sagt, auf welche Akte installiert wird: eine passende Akte wird mit ihrem Aufruf genannt, bei mehreren verlangt das Werkzeug die Frage im Interview, bei keiner zeigt es auf `/device`. Ein abgelehnter Token kommt mit der Begründung des Portals zurück, und hinterlegt wird nichts. Wer ohne Gerät nach dem Kauf fragt, bekommt denselben Weg, `node .ara/tools/device.mjs --licence`, und `sales.de.md` sagt das auch.
- Der Selbsttest spielt das Portal und hält all das fest: die Form, den abgelehnten Token, den hinterlegten, eine Akte, zwei Akten, ein laufendes Gerät, das kein Ziel ist, den Kaufblock an einem unterstützten Gerät ohne Token und den schlichten Aufruf mit einem. `ARA_ENV_FILE` lenkt die `.env` genau dafür um, dann zählt nur sie.

## 0.13.0 (2026-08-28)

Kontrakt: bis 3

- Die Wurzel des Repositories trägt eine README, die, die GitHub zeigt. Ihre deutsche Hälfte liegt unter `.ara/README.de.md`, in der ersten Zeile verlinkt, und der Selbsttest kennt den Ort: das Paar wird weiter gezählt, nur der Ort der zweiten Hälfte steht ausdrücklich in der Liste. Die Regeln für die Dokumentprüfung sind nach `.ara/.markdownlint-cli2.jsonc` gewandert, der Aufruf bekommt den Pfad mit: `npx --yes markdownlint-cli2@0.18.1 --config .ara/.markdownlint-cli2.jsonc "**/*.md"`.
- Der Klon bringt keine App mehr mit. Die Referenz-App unter `apps/urlaubsantrag/` ist weg, samt ihrer Ausnahme in der `.gitignore` und ihrem Plan; `apps/` gehört ganz dem Nutzer. Was sie zeigte, steht jetzt in der Vorlage unter `.ara/templates/app/`: eine mit `--new` angelegte App reicht einen Vorgang ein, startet den Flow `freigabe`, hält an der Freigabe an, ein Mensch entscheidet in Arasul, und danach steht der Vorgang auf genehmigt oder abgelehnt, mit dem Namen dessen, der entschieden hat, und dem Satz, den der Flow geschrieben hat. Ohne Arasul bleibt der Vorgang ohne Entscheidung, und die Seite sagt das. Der Selbsttest fährt genau das gegen das Backend der Vorlage, mit einem gespielten Gerät.
- Die Oberfläche der Vorlage ist aus sechs Bausteinen gebaut, die die Namen des Arasul-Designsystems tragen, Kopf, Liste, Karte, Formular, Meldung, Menü, in `frontend/src/bausteine.jsx`, mit den Regeln in `stil.css` und den Werten in `design.css` aus dem Spiegel. Die Seite in `app.jsx` ist nur daraus zusammengesetzt, damit, wer dazubaut, einen Baustein nimmt und keine zweite Karte neben die erste schreibt. Die Bausteine aus dem Produkt selbst, `packages/marken` aus Phase D7, liegen noch nicht bei: dafür braucht es den Spiegel, und das ist der offene Punkt nach diesem Stand.

## 0.12.0 (2026-08-28)

Kontrakt: bis 3

- Der Orin, bevor er ein Linux hat, ist eine Anleitung mit Prüfschritt je Abschnitt, `.ara/knowledge/flash-orin.de.md`: der x86-64-Host, das Release-Paket, der erste Benutzer vor dem Flash mit `l4t_create_default_user.sh`, der Recovery-Handgriff, der Flash, das Netz über das USB-C-Kabel unter `192.168.55.1`, und ab dort das Kit von selbst. Dokumentiert, nicht automatisiert. Jeder Schritt nennt, ob er aus NVIDIAs Dokumentation zur Fassung 36.4.4 kommt oder von einem laufenden Orin, und nichts darin gilt als verifiziert: das Testgerät wurde dafür nicht geflasht. Der Selbsttest hält fest, dass jeder Abschnitt einen Prüfschritt trägt.
- Ab dem laufenden Linux arbeitet das Kit selbst, und das Stück nach der Installation ist die Selbstheilung: `node .ara/tools/heal.mjs --device <gerät>` startet, was von Arasul nicht läuft, ein Container nach dem anderen, prüft, dass es gewirkt hat, und protokolliert jeden Schritt in der Geräteakte unter Prüfungen und in `interventions.json` daneben, mit Zustand davor, Zustand danach und dem Weg zurück als Befehl. `--undo <id>` führt genau diesen Weg zurück aus und weist nach, dass der Stand davor wieder da ist. `--plan` sagt, was es täte, und ändert nichts.
- Drei Grenzen, im Code und im Selbsttest: nur Container des Arasul-Verzeichnisbaums, nie der Bootloader oder das System, und nur, was einen Weg zurück hat. Ein Container außerhalb des Baums bleibt liegen und steht so im Bericht. Ein Container, der läuft und unhealthy meldet, bräuchte einen Neustart, und der hat keinen Weg zurück: das Kit fragt stattdessen, mit den letzten Protokollzeilen des Containers. Es fragt erst, wenn es aufgibt.

## 0.11.0 (2026-08-28)

Kontrakt: bis 3

- `/device` erkennt ein Gerät, ohne dass ihm etwas darüber gesagt wird. Es liest, was das Gerät über sich sagt, Hersteller aus `/sys/class/dmi/id/sys_vendor`, Modell, Architektur, laufendes System, Erreichbarkeit, und gibt jede Angabe mit der Stelle aus, die sie hergibt.
- Welche Hardware das Kit kennt, steht jetzt unter `.ara/knowledge/devices/`, ein Blatt je Gerät, in beiden Sprachen, für Orin, Thor und DGX Spark. Jedes Blatt trägt seinen Stand und seine Quelle, und zur Laufzeit wird nichts recherchiert. Ein neues Gerät ist ein neues Blatt und keine neue Zeile mehr in `lib/device.mjs`.
- Vor jedem Lauf, und vor jedem Eingriff ein zweites Mal, sagt `/device`, wie gut das Profil belegt ist: das Feld `verification` aus dem Plattformkatalog des Produkts, aus dem Spiegel gelesen. `live` heißt an echter Hardware verifiziert, `emulation` heißt nur unter Emulation geprüft, `follow-up` heißt nach Herstellerdoku gebaut. Ohne Spiegel sagt das Kit, dass es die Stufe nicht lesen kann, und rät keine.
- Das Katalogprofil landet nur dann in `device.md`, wenn der Spiegel es wirklich führt und der Speicher zur Fassung passt. `orin-64` auf einem Orin mit 32 GB wäre eine Zusage über Speicher, die dieses Gerät nicht hält.
- `--probe <datei>` ist der Trockenlauf: Befunde aus einer Datei statt von einem Gerät, dieselbe Erkennung, dasselbe Profil, derselbe Verifikationsstand, aber geschrieben wird nichts und verändert auch nichts. Er verweigert `--install`, `--deploy-key` und `--admin-login`. So führt der Selbsttest Thor und DGX Spark, und verifiziert ist damit keines von beiden.
- Auf einem Rechner, der Arasul nicht trägt, endet der Lauf hilfreich: welche Geräte es heute tragen, nach den Blättern, dass Fragen zu Arasul kein Gerät brauchen, und ein ruhiger Satz zur Lizenz. Das Kit steht unter der Apache-Lizenz 2.0 und bleibt ohne Arasul brauchbar.
- `.gitignore` verankert die Nutzerordner am Wurzelverzeichnis. Ohne den führenden Schrägstrich schloss `devices/` auch `.ara/knowledge/devices/` aus, und dann wären die Geräteprofile in einem Klon nicht angekommen.

## 0.10.0 (2026-08-28)

Kontrakt: bis 3

- Englisch ist die Hauptsprache des Kits, Deutsch ist gleichwertig und vollständig. Jedes Dokument gibt es als Paar: `x.md` ist englisch, `x.de.md` deutsch, für das README, die Persona, das Wissen, die Befehle und die Gerüste unter `.ara/templates/`. Der Selbsttest zählt die Paare, damit keine Sprache still zurückfällt.
- `/init` fragt die Sprache in der ersten Runde mit Fragen, zusammen mit der Weiche Partner oder Unternehmen. Die Antwort steht als `language: de|en` in `business/profile.md`, und aus dem Feld liest jedes Werkzeug, in welcher Sprache es ausgibt. Im frischen Klon, bevor es ein Profil gibt, gilt Englisch.
- `commands.mjs` kopiert den Befehl in der Sprache des Profils, `--language` überstimmt das für `/init`, das die Befehle anlegt, bevor die Antwort im Profil steht. Was in `.claude/commands/` landet, behält immer den blanken Namen.
- Werkzeugausgaben stehen als Paar `t(en, de)` an der Stelle, an der sie entstehen. Der deutsche Zweig trägt wörtlich den Wortlaut, den das Kit vorher hatte.
- `--help` trägt beide Sprachen in einem Kopfblock, getrennt durch `=== deutsch ===`. Damit bleibt die Eigenschaft erhalten, wegen der es die Kopfhilfe gibt: sie kann nicht von der Erklärung wegdriften.
- Das Kit stellt sich als Selfhosting-Werkzeug für jedes Gerät auf, das per SSH erreichbar ist. Arasul ist im README ein eigener Abschnitt statt einer Voraussetzung.
- Impressum nach § 5 DDG im README, verlinkt aus der ersten Zeile. Das Vertragspapier unter `.ara/vorlagen/` und die Nachweise unter `.ara/nachweise/` bleiben deutsch: es ist rechtlich gebundener Text für den DACH-Raum.
- `.ara/commands/alle/` heißt jetzt `all/`, und `/kalkulation` heißt `/calculation`. Der abgelöste Befehl steht in `RETIRED` und wird beim nächsten `--apply` weggeräumt.
- Der Nummernkreis in `business/invoices.md` trägt sein Schema englisch (`## Assigned numbers`, Spalten `Number | Date | ...`). Ein früher angelegter Nummernkreis behält seine deutschen Namen, gelesen werden beide, und geschrieben wird in die Überschrift, die in der Datei steht.
- Die Skills unter `.claude/skills/` und `.env.example` sind englisch. Beides sind Anweisungen an Ara oder an den, der den Klon aufmacht, beides wird unter genau einem Namen geladen, und beides bleibt einsprachig wie `CLAUDE.md`. Die Skills hießen außerdem noch `kalkulation`, `diagnose`, `erweiterungen` und `verkauf`; jetzt heißt jeder wie sein Ordner.

## 0.9.1 (2026-08-28)

Kontrakt: bis 3

- Das Startpasswort des Administrators kommt aus dem Kit wieder heraus, ohne sichtbar zu werden. `node .ara/tools/device.mjs --name <geraet> --admin-login` meldet sich am Geraet an und gibt die Sitzung aus, `--token` gibt nur den Ausweis. Weg und Benutzername kommen aus `arasul-release.json`, wenn das Artefakt sie nennt, sonst aus `--login-path` und `--login-user`, und das Werkzeug sagt jedes Mal, woher es sie hat. Der Weg geht an der Schnittstelle entlang und nicht ueber SSH, er kommt darum ohne Anmeldenamen und Schluessel aus und nimmt die Adresse aus `address` oder `api_base`.
- `secrets.mjs --show` zaehlt jeden Namen auf, den das Kit vergibt, nicht nur die Kit-Schluessel. Das Startpasswort lag vorher unter `ARASUL_START_<geraet>` da, und dieses Blatt nannte den Namen nicht.
- Die Ausgabe des Installers wird mitgelesen statt durchgereicht, und dabei maskiert: Kit-Schluessel und Startpasswort gehen nicht mehr im Klartext ueber den Bildschirm. Der Satz "Klartext wird nicht angezeigt" stimmt jetzt wieder.
- Neu am Ende von `/device`: **Was der Installer nicht konnte.** Seine Absagen, etwa eine fehlgeschlagene SSH-Haertung oder ein Firewall-Setup ohne Root-Rechte, stehen danach beisammen und in der Akte, statt in mehreren hundert Zeilen unterzugehen.
- Nach einer eigenen Installation traegt die Akte `tls: selfsigned`. Das Geraet stellt sein Zertifikat aus einer eigenen Geraete-CA aus, und der erste Aufruf gegen die Schnittstelle scheiterte sonst an `SELF_SIGNED_CERT_IN_CHAIN`.
- Die Fassung des Artefakts liest das Kit aus `arasul-release.json`, wenn keine Datei `VERSION` dabei ist. Spiegel, Geraeteakte und der Ordnername am Geraet sagten sonst "unbekannt", obwohl die Zahl danebenlag.
- `/app` weiss ohne `--device`, was es selbst an ein Geraet geschickt hat: welche Fassung im Teststand steht und welche live ist, je App und Geraet. Ist die gebaute Fassung live, wird nicht wieder `--check` und `--deploy` vorgeschlagen, sondern der Plan und die README.
- Der Plan der Referenz-App laesst sich nicht mehr verschieben: `--plan-aktiv` und `--plan-erledigt` verweigern jeden Plan, der in der Versionsverwaltung liegt. Der Spiegel behaelt beim Auspacken seinen `.gitkeep`. Beides machte den frischen Klon schmutzig.

## 0.9.0 (2026-08-28)

Kontrakt: bis 3

- Der Installer wird so gerufen, wie das Artefakt es sagt: der Einstiegspunkt kommt aus `arasul-release.json`, nicht aus dem Gedaechtnis des Kits, und er bekommt Startpasswort und Netzname mit. Nur dabei entstehen am Geraet Netzname, Fassung, Startpasswort und die Erstausgabe. Nennt das Artefakt keinen Einstiegspunkt, haelt das Kit an, statt zu raten.
- Das Startpasswort wuerfelt das Kit und legt es in die Geheimnis-Ablage. Die Geraeteakte traegt nur den Namen des Eintrags, in `start_password_ref`, und den Netznamen in `net_name`.
- Das Artefakt wird nach `$HOME/arasul-<fassung>` geschoben und nicht mehr nach `$HOME/arasul`. Das Kit fand sonst beim naechsten Lauf sein eigenes Paket und hielt es fuer eine Installation.
- Die Spurensuche unterscheidet drei Lagen statt zwei: die Plattform laeuft, es liegen nur Reste da, oder da ist nichts. Ueber Reste hinweg wird nur mit `--despite-traces` installiert, und das gehoert vorher bestaetigt.
- Ueberall, wo das Kit packt oder auspackt, bleiben die `._`-Beiwerkdateien von macOS draussen. 1124 davon gingen mit einem Artefakt an ein Geraet, und Traefik stieg an einer davon aus.
- `secrets.mjs --set` nimmt den Wert von der Standardeingabe, wenn kein Terminal dranhaengt. Ohne das blieb ein Token in einer nicht-interaktiven Sitzung auf "fehlt".
- Jedes Werkzeug beantwortet `--help` mit seiner Kopfhilfe und tut sonst nichts. Vorher fuehrte `device.mjs --help` eine Geraetepruefung aus und `mirror.mjs --help` lud den Spiegel.
- Neu: `node .ara/tools/mirror.mjs --docs` zeigt, welche Anleitungen mit dem Artefakt kamen. Das Wissen zu `/device` und `/maintain` nennt darueber den Weg zum ersten Mitarbeiter und zur ersten Freigabe, auch ohne Browser.
- `.env.example` schickt niemanden mehr zu `/start`. Den Befehl gibt es seit E1 nicht mehr.

## 0.8.0 (2026-08-27)

Kontrakt: bis 3

- Neuer Befehl `/invoice`, nur im Partnerzweig und nur mit `invoice: yes` im Profil: die Rechnung entsteht aus dem Angebot der Kundenakte, bekommt ihre Nummer aus dem Nummernkreis und wird als ZUGFeRD-PDF gedruckt. Im PDF steckt die Rechnung noch einmal als `factur-x.xml` nach EN 16931, damit die Buchhaltung des Kunden sie einliest, statt sie abzutippen.
- Die Pflichtangaben nach § 14 Abs. 4 UStG sind eine Pruefliste, die vor dem Druck rot wird. Fehlt eine, wird nicht gedruckt: eine unvollstaendige Rechnung berechtigt den Kunden nicht zum Vorsteuerabzug, und das faellt bei ihm auf.
- Der Nummernkreis liegt in `business/invoices.md` und gehoert dem Partner. Fortlaufend je Jahr, ohne Luecke, ohne Zurueckdrehen. Eine verworfene Rechnung wird storniert, nicht geloescht, und ihre Nummer bleibt vergeben.
- Ein Beleg, eine Wahrheit: die Zahlen im XML kommen aus derselben Tabelle, die gedruckt wird. Geprueft wird das Ergebnis gegen die Geschaeftsregeln der EN 16931, und der Selbsttest sagt dazu, was ungeprueft bleibt.
- Die Kundenakte fuehrt jetzt die Anschrift in `street`, `postcode` und `city`, dazu `country` und `vat_id`. Eine Rechnung braucht sie einzeln, ein Angebot ohnehin.
- `pdf.mjs` druckt kein Frontmatter mehr. Ein Beleg traegt seine maschinenlesbaren Felder im Kopf, und die sind keine Zeile fuer den Kunden.

## 0.7.0 (2026-08-27)

Kontrakt: bis 3

- Das Wissen ist auf die Plattformdienste geschnitten: `.ara/knowledge/platform-services.md` beschreibt Anmeldung, Freigaben, Flows, die KI-Schnittstelle mit Schlüssel und den Weg für fremde Werkzeuge, dazu die Sicherung und was ohne Arasul fehlt. Als Verfahren, ohne einen einzigen abgeschriebenen Produktwert.
- Neues Werkzeug `check-docs.mjs`: es liest jede Route, die im Wissen des Kits steht, und prüft sie mit `--device` live am Gerät, mit dessen eigener Endpunktliste als Maßstab. Was dort nicht mehr existiert, fällt auf, bevor ein Partner danach arbeitet.
- Neues Werkzeug `service-description.mjs`: die Leistungsbeschreibung entsteht mit Werten vom Gerät, Softwarestand, Kontraktfassung, Modelle und Apps, jeder Wert mit seiner Quelle im Dokument. Was ungemessen blieb, bleibt Platzhalter und wird genannt.
- `/maintain` liest mit, welche Modelle am Gerät liegen, gefunden über den Kontrakt und nicht über einen geratenen Pfad.
- Der Stand des Kits hat eine Nummer. `/init` nennt Stand, Neues und die Verträglichkeit zum Gerät, statt nur eine Liste geänderter Dateien zu zeigen.

## Vor 0.7.0

Frühere Stände trugen keine Nummer. Was vor 0.7.0 geschah, steht in der
Git-Geschichte des Kits, hier die Reihe der abgeschlossenen Phasen:

| Datum | Phase |
|---|---|
| 2026-08-27 | E6: der Kunde hat Geräte, das Angebot rechnet aus dem Blatt, die Wartung misst am Gerät |
| 2026-08-27 | E5: `/app` baut eine App aus der Vorlage und hält sie an, bis ein Mensch entscheidet |
| 2026-08-27 | E4: das Kit versteht Kontraktfassungen, packt Flows mit, findet die Schnittstelle hinter einem Tunnel |
| 2026-08-26 | E3: `/device` legt die Akte an, prüft SSH, erkennt Hardware und urteilt |
| 2026-08-26 | E2: `/init` mit der Weiche Partner oder Unternehmen |
| 2026-08-26 | E1: Grundriss, `/init` statt `/start` und `/update`, das Papier unter `.ara/` |
