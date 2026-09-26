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

## 0.44.0 (2026-09-26)

Kontrakt: bis 6

- **Ein langes Auslesen wird abgeholt, nicht verloren.** Rechnet das Modell nach der Wartezeit des Geräts noch, antwortet das Gerät mit 202 und dem Auftrag, und `arasul.mjs` der Vorlage holt das Ergebnis alle fünf Sekunden auf dem Weg ab, den der Kontrakt unter `warten.wege` zum Weg unter `auslesen.weg` nennt, ohne die Datei ein zweites Mal zu schicken. Das Kit schreibt diesen Weg als `wege.dokument_abholen` in die `arasul.json`, dazu die Wartezeiten. Ein Gerät ohne `warten` nennt keinen Weg; dann endet das Auslesen mit einem Satz statt einer leeren Antwort.
- **Höchstens so viele Auslesungen zugleich, wie der Kontrakt erlaubt.** Die Vorlage reiht ihre Auslesungen ein und gibt sie weiter, wie der Kontrakt es unter `warten.gleichzeitig` oder `auslesen.gleichzeitig` sagt. Kontrakt 6 nennt keine Zahl, also geht eine nach der anderen: die Warteschlange des Geräts teilen alle Apps, und über ihre Größe hinaus weist sie ab.
- **`app.mjs --share <konto>` gibt eine App einem Konto frei, Vorgabe Teststand**, `--stand live` mit Absicht, `--unshare <konto>` nimmt sie zurück. Die Sitzung kommt aus `device.mjs --admin-login`. Weg und Felder liest das Kit aus dem Kontrakt, dem Spiegel oder der API-Referenz am Gerät, nach dem, was ein Weg tut: der POST, dessen Rumpf eine App und ein Konto nennt, der GET der Konten, der DELETE darunter. Nimmt der Weg keinen Stand, gibt das Kit nicht frei, denn die Freigabe fiele auf live. Nach `--deploy` nennt das Kit diesen Befehl statt der API-Referenz.
- **`--admin-login --password-ref <NAME>`** meldet sich mit einem Eintrag an, der schon liegt, zusammen mit `--login-user`. Bis 0.43.0 las die Anmeldung nur `ARASUL_START_<GERÄT>`, und wer das Passwort eines Administrators unter eigenem Namen hielt, legte eine zweite Kopie ab.
- **Der Ladesatz von `/app` ist höchstens 14.000 Tokens groß**, vorher 15.000, und der Selbsttest hält ihn dort.

## 0.43.0 (2026-09-26)

Kontrakt: bis 6

- **Ein Fehler des Geräts erreicht den Menschen als Satz, nie als HTTP-Zeile.** `arasul.mjs` der Vorlage sagt je Klasse, was los ist und was jetzt hilft: 408, 504 und 429 ausgelastet, bitte erneut; 403 vom Administrator nicht freigegeben; 5xx das Modell ist gescheitert, an einem Weg ohne Modell hat das Gerät einen Fehler gemeldet. Verb, Weg, Status und die Nachricht des Geräts stehen in `technisch` und gehen ins Protokoll des Containers, der Schlüssel nie. `hole` in der Oberfläche sagt ebenfalls einen Satz je Status, die Zeile geht ins Protokoll des Browsers.
- **`AsyncBoundary` unterscheidet Nichtgefunden von Gescheitert.** 404 und 403 sind ein Hinweis mit „Zur Übersicht", Netz und 5xx rot mit „Erneut versuchen". Eine unbekannte Adresse der App ist ein Hinweis mit dem Weg zurück, nicht mehr rot.
- **Muster 6 zeigt Beschriftungen und deutsche Werte.** Jedes Feld des Schemas trägt ein `title`, `ARTEN` sagt Datum, Betrag, Währung oder Prozent, die Mängelsätze nennen die Felder mit ihrer Beschriftung: „Belegdatum 14.01.2025", „Betrag brutto 3.550,00 €", „Steuersatz 16 % ist keiner der Sätze 0, 7 oder 19 %". Eine gescheiterte Auslesung steht als Meldung da, mit „Erneut auslesen" darin, und darüber steht nicht „gelesen".
- **Muster 7 stellt den langen Satz in die Karte**, `design-system.de.md` sagt, der `hinweis` einer Karte trägt ein paar Wörter. Muster 2 und 7 halten die Knopfregel: aktiv, ein Klick sagt am Feld, was fehlt.
- **Vorlage und Muster reden wie das Gerät**, mit Sie oder ohne Anrede; die Flow-Vorlage duzt nicht mehr. `--check` und `--build` melden du und dir in Texten der Oberfläche, des Backends und der Flows, mit Datei und Zeile, und halten nichts an.
- **Was das KI-Protokoll erfasst, genau.** `platform-services.de.md`, der Kopf von `arasul.mjs` und `--contract` sagen: die Wege unter `protokoll.wege`, mit dem Menschen, den die App mitgibt; der Modellschritt eines Flows steht am Lauf, mit seinem Einreicher.
- **Kein Wissenspfad geht nach `/init` ins Leere.** Geteilte Blätter nennen Partnerware über Befehl oder Skill, `device.mjs`, `init.mjs` und `service-description.mjs` nennen bei language de die deutschen Blätter. Der Selbsttest legt beide Zweige in beiden Sprachen an und folgt jedem Wissenspfad aus Befehlen, Persona und Skills und jedem, den die Werkzeuge ausgeben.
- **Gemessen am 26.09.2026** mit einer Probe aus Vorlage und Mustern 2, 6 und 7, gebaut aus 0.42.0 und aus diesem Stand, bei 390 Pixeln: die Seite Mandanten war 834 Pixel breit und der Titel „Zuordnen" 0 Pixel, jetzt 390 und 332; die Auslesung zeigte die HTTP-Zeile und `betrag_brutto 3.550`, jetzt den Satz und „Betrag brutto 3.550,00 €"; ein fremder Vorgang bot in Rot „Erneut versuchen" an, jetzt als Hinweis „Zur Übersicht".

## 0.42.0 (2026-09-26)

Kontrakt: bis 6

- **Ein Vorgang entsteht in Arbeit und wird eingereicht, wenn er vollständig ist.** Der Kern der Vorlage trennt `anlegen` von `einreichen(id)`, und `bereit(vorgang)` sagt `true` oder den Satz, was fehlt: ein Vorgang, der nicht bereit ist, bleibt in Arbeit ohne Lauf, der Satz steht an ihm. Das Formular der Vorlage reicht weiter gleich nach dem Anlegen ein, mit dem Titel ist es vollständig.
- **Was eingereicht ist, ändert sich nicht mehr.** `darfAendern(vorgang)` gilt nur in Arbeit. Muster 7 hat `PUT vorgaenge/<id>` und `POST vorgaenge/<id>/einreichen`, Muster 2 prüft beim Anhängen und Entfernen, sobald es die Vorgänge kennt, Muster 8 beim Anhängen und neuen Auslesen: nach dem Einreichen 409. `mitBeleg` in Muster 8 ist das `bereit` für „kein Einreichen ohne Beleg".
- **Sehen heißt nicht entscheiden.** Muster 7 markiert an jeder Zuordnung, ob das Konto entscheidet (`006-entscheider.sql`, Vorgabe nein), `regel` und `zustaendig` nehmen nur Entscheider. Eine App, die die Migration nachträglich bekommt, hat keinen Entscheider, bis die Verwaltung einen markiert, und ihre Vorgänge bleiben mit dem Satz in Arbeit. `app-professional.de.md` stellt die Planfragen „wann ist ein Vorgang vollständig" und „wer gibt frei" mit dem Beispiel einer Kanzlei.
- **Der Satz des Flows nach der Freigabe wird nachgezogen**, bis der Lauf fertig ist. Bis 0.41.0 fragte die App einmal, und war der Lauf in dem Moment nicht fertig, kam der Satz nie.
- **Das Protokoll eines fremden Dokuments ist 404**, nicht mehr 200 mit leerer Liste; das Protokoll eines eigenen Dokuments, das ging, bleibt.
- **`backend/kern/csv.mjs`** schreibt eine CSV für Excel und den Steuerberater: BOM, Semikolon, Dezimalkomma, CRLF, und eine Zelle, die mit `=`, `+`, `-`, `@`, Tab oder CR beginnt, bekommt ein Hochkomma davor.
- **Der Ladesatz von `/app` bleibt unter 15.000 Tokens**: was Muster 7 entscheidet, steht in seinem Blatt und nicht mehr zusätzlich im Wissen, Messgeschichte ging aus dem Wissen.
- **Gemessen am Orin am 26.09.2026** mit zwei Konten, eine Probe mit den Mustern 2, 6, 7 und 8 im Teststand: angelegt in Arbeit ohne Lauf, Einreichen ohne Beleg 409, die Regel nannte nur die Entscheiderin, der Einreicher bekam am Gerät 403 und sah die Anfrage nicht, die Entscheiderin gab frei, Anhängen, Entfernen, neues Auslesen, Ändern und erneutes Einreichen bekamen 409, das Protokoll eines fremden Dokuments 404, der Satz des Flows kam 22 Sekunden nach der Freigabe und wurde nachgezogen.

## 0.41.0 (2026-09-26)

Kontrakt: bis 6

- **Das Gerüst trägt die Designbibliothek 5.0.0**, aus dem Paket des Produkts (`marken-paket.py --ausgabe`, Stand des Produkts vom 26.09.2026). Blau `--primary` ist jetzt `#1e6aa4`, Rot im Hellen `#c42020`, Grau `#666666`: farbiger Text hält 4,5:1 auf hellem Grund. Eine App aus dem Kit sieht erst dann aus wie das Gerät, wenn ihr Spiegel auf derselben Fassung steht; `marken.mjs --sync` zieht bestehende Apps nach.
- **Die Liste nutzt Auswahl und Kürzung der Bibliothek.** `gewaehlt` der `Datenliste` markiert die gewählte Zeile mit `aria-selected` und einer Linie, `kuerzen` an der Spalte hält einen langen Titel auf einer Zeile mit „…" und legt ihn ganz in den `title`. Der Knopf in der Titelzelle und die eigenen Regeln in `stil.css` sind weg, im Gerüst und in den Mustern 2 und 6. Tab erreicht jede Zeile, Eingabe und Leertaste wählen, die Pfeile gehen über `rahmen/pfeile.ts` weiter.
- **Ein Diagramm kommt nur über `@marken/diagramm`.** `Chart`, `Sparkline` und `SERIENFARBEN` stehen nicht mehr im Sammelexport; die `tsconfig.json` des Gerüsts kennt `@marken/*`. `design-system.de.md` sagt es in einer Zeile, der Selbsttest wird rot bei einem Diagramm aus `@marken`.
- **Der Wächter kennt den zweiten Einstieg.** `marken.mjs` zählt `diagramm.ts` als eigenen Einstieg und meldet es nicht mehr als Datei, zu der kein Weg führt.
- **Gemessen am 26.09.2026**, das Gerüst mit den Mustern 2 und 6 gebaut: Einstieg 414,7 KB roh, 130,2 KB gzip, kein Recharts, wie mit 4.1.0. Eine Seite mit nachgeladenem Diagramm bekommt Recharts in einem eigenen Teil von 367 KB, der Einstieg bleibt bei 415 KB. Ohne die Zeile zu `memo` in `vite.config.ts` bleibt das JavaScript gleich und das CSS wächst von 95 auf 106 KB, also bleibt die Zeile. Der Selbsttest misst bei 1280 Pixeln: keine Spalte draußen, eine Zeile mit `aria-selected`, 200 Zeilen in der Tab-Reihenfolge, der Titel ganz im `title`, Pfeil nach unten zur nächsten Zeile, Bündel unter 500 KB.

## 0.40.0 (2026-09-26)

Kontrakt: bis 6

- **Jeder Modellaufruf der Vorlage nennt seinen Menschen.** Ein Gerät vom 26.09.2026 protokolliert jeden Modellaufruf einer App und nennt den Menschen nur, wenn die App ihn nennt; wie, sagt es unter `protokoll`. Das Kit schreibt das in `arasul.json`, und `backend/arasul.mjs` reicht den angemeldeten Namen in denselben Bytes an `document/extract-structured` und `llm/chat` weiter, nie an einen anderen Weg. `geraet.fragen` fragt ein Modell, auch mit Bildern, `geraet.fuer` gibt Kopfzeile und Feld für einen eigenen Aufruf an `/v1`. Ein Gerät ohne den Abschnitt bekommt keine Kopfzeile. `--contract` gibt den Abschnitt aus.
- **Muster 8, Belege je Mandant am Vorgang**, zeigt die Muster 2, 6 und 7 zusammen: eine Spalte `mandant` an Dokumenten und Auslesungen, ein Beleg hängt an einem Vorgang und nimmt dessen Mandanten, jede lesende Abfrage trägt den Filter, das Protokoll bleibt getrennt, wenn das Dokument geht. `BelegeAmVorgang` legt die Belege in die Einzelheiten eines Vorgangs.
- **Muster 6 behält den Auftrag des Geräts** (`auftrag`) an jeder Auslesung, dieselbe Nummer steht im Protokoll des Geräts, und verweist für ein Foto auf `bilder`.
- **Die Seiten der Muster 2 und 6 teilen wie die Liste**: ab 900 Pixeln nebeneinander, darunter als Blatt, jede Zeile per Tastatur wählbar.
- **Deutsche Inhalte der Vorlage tragen echte Umlaute**, in Kommentaren, Sätzen und JSX-Text; Namen im Code bleiben ASCII. Der Selbsttest prüft auch Vorlage und Muster.
- **`--build` sagt, dass die Designprüfung lief**, über wie viele Dateien, auch ohne Befund. Die englische Ausgabe zeigt `<device>` statt `<gerät>`.
- Am Orin am 26.09.2026 eine Probe aus der Vorlage mit den Mustern 2 und 6, im Teststand: für ein Konto freigegeben, stand eine Auslesung als dieser Mensch mit seinem Namen und demselben Auftrag wie an der Auslesung im Protokoll des Geräts, sechs von sechs Feldern in 11 Sekunden. Ohne Namen stand der Aufruf ohne Menschen da; ein Name, dem die App nicht freigegeben ist, wurde mit 400 abgewiesen und hinterließ keine Zeile.

## 0.39.0 (2026-09-26)

Kontrakt: bis 6

- **`--contract` sagt, was das Auslesen antwortet.** Ein Gerät ab dem 26.09.2026 nennt im Kontrakt unter `auslesen` die Antwort von `document/extract-structured` als Schema; `--contract` gibt jedes Feld mit Typ und Beschreibung aus und die Sätze daneben, `--json` das ganze Schema mit Anfrage und Fehlschlag. `data` ist ein Objekt oder null und nicht gegen das Schema der App geprüft. Ein Gerät ohne den Abschnitt bekommt hier keinen.
- **`--contract` sagt, wie ein Bild an ein Modell geht.** Unter `bilder` steht, wie eine App ein Foto über `llm/chat` selbst einem Bildmodell gibt; `--contract` gibt die Sätze wörtlich aus.
- **`app-professional.md` verweist auf beide Abschnitte** statt zu sagen, kein Weg gebe einem Modell ein Bild. Dazu die Messung vom 26.09.2026 am Orin an einem Tankbeleg als Foto: ein Bildmodell sechs von sechs Feldern, die Texterkennung fünf, ein anderes Bildmodell zwei. Für Fotos nennt die App das Modell selbst und misst beide Wege.

## 0.38.0 (2026-09-26)

Kontrakt: bis 6

- **Das Gerüst einer App hält seine Spalten.** Ein Titel mit 120 Zeichen schob die Tabelle der Liste bei 1280 Pixeln auf 1309 Pixel in einem Kasten von 860, und die Spalte Stand lag draußen. Jetzt bekommt der Titel zwei Zeilen, Name und Datum brechen um, und die Seite mit Liste und Einzelheiten bekommt mehr als die Lesebreite. Gemessen von 900 bis 1920 Pixeln: keine Tabelle rollt seitwärts.
- **Liste und Einzelheiten stehen ab 900 Pixeln nebeneinander**, die Einzelheiten laufen mit; darunter öffnen sie sich als Blatt von unten. Vorher standen sie unter der Liste, und bei 200 Zeilen sah niemand, dass ein Klick etwas getan hatte.
- **Jede Zeile ist per Tastatur wählbar**: der Titel ist ein Knopf, Tab führt hin, Eingabe wählt, die Pfeile gehen eine Zeile weiter. Die gewählte Zeile trägt `aria-current` und einen Balken in der Textfarbe.
- **Ein wartender Vorgang sagt, wer entscheidet und seit wann.** Das Backend gibt jedem wartenden Vorgang `entscheidet` mit, aus derselben `regel`, mit der der Lauf startete: alle mit Zugang, alle außer dem Einreicher, oder die Konten des Musters Mandanten. `wartet` ist nicht mehr der blasseste Stand.
- **Das Formular hat an jedem Feld ein Label** und sagt daneben, ob das Feld sein muss. Der Knopf ist nicht mehr grau ohne Grund: ein Klick mit leerem Titel sagt am Feld, was fehlt, und setzt den Fokus dorthin.
- **Laden, Fehler und leer sind Zustände mit Handlung.** Die Liste lädt in ihrer eigenen Form, ein Fehler trägt „Erneut versuchen“, eine leere Liste bietet den ersten Vorgang oder den Weg zurück zu allen an.
- **Der Stand hält 4,5:1 in beiden Themen.** Das Wort steht in der Textfarbe, Blau und Rot sitzen an einem Zeichen daneben. Als Text kam das Blau der Bibliothek im hellen Thema auf 3,22:1, das Rot auf 3,48:1.
- **Recharts kommt nicht mehr in jede App.** `memo` gilt dem Bau als rein, so fallen die Diagramme aus dem Bündel, solange keine Seite eines zeigt: 408 statt 690 KB.
- **Der Selbsttest baut das Gerüst und misst es in Chromium bei 1280 Pixeln**, mit 200 Zeilen und einem Titel von 125 Zeichen: keine Spalte draußen, Einzelheiten im Fenster, jede Zeile ein Knopf, der Stand mindestens 4,5:1, kein Recharts im Bündel. `design-system.de.md` nennt die Regeln in sieben Zeilen.

## 0.37.0 (2026-09-26)

Kontrakt: bis 6

- **`/app` lädt für eine Fach-App halb so viel.** Befehl, `CLAUDE.md`, Persona und das Wissen, das eine Fach-App mit Belegen und Mandanten liest, kamen auf rund 31.000 Tokens, ein Zehntel davon doppelt. Jetzt sind es unter 15.000 in beiden Sprachen, gemessen wie `wc -w` mal 1,4, und der Selbsttest hält diese Linie. Der Befehl sagt für jede Datei, wann ihr Moment kommt; `extensions.md`, `security.md` und `live-knowledge.md` gehören nicht mehr dazu, `CLAUDE.md` trägt die Regeln, die sie beigetragen hätten.
- **`app.md` ist geteilt in Kern und Fachteil.** `app-professional.md` hält Mandanten, Freigaben mit vier Augen, das Auslesen von Dokumenten und Fachstandards und wird nur bei Mandanten, Belegen oder einem Exportformat gelesen.
- **Jedes Thema hat eine Heimat.** Eingespielt ist nicht sichtbar, die Freigabe je Stand, die getrennten Datenbanken von Test und live und Compose ohne Arasul stehen in `deploy.md`; die Anmeldung mit ihren Kopfzeilen, der Kreis der Entscheider und `arasul.json` in `platform-services.md`; dauerhafte Daten und der Lebenslauf in `app.md`; das Auslesen mit den Messwerten vom 25.09.2026 und die Entscheidungen des Mandantenmusters in `app-professional.md`; das Aussehen in `design-system.md`, die Geschichte der `design.css` einmal. Die Sicherung ist nach `maintenance-flow.md` gezogen, der Weg für fremde Werkzeuge nach `extensions.md`, die Fehler der Schnittstelle nach `diagnostics.md`.
- **Die Muster tragen ihr Blatt neben ihrem Code.** `.ara/templates/app-patterns/<muster>/README.de.md` sagt, was du klärst, was das Gerät erreichen muss und was geprüft ist; `app-patterns.md` ist der Überblick, und gelesen wird nur das Blatt des Musters, das der Plan nimmt.
- **`design-system.md` nennt keine Zahlen mehr.** Seine Zahlen zu Dateien, Primitiven, Mustern und Abhängigkeiten waren veraltet, der Spiegel von 0.36.0 trägt 71 Dateien und 15 Abhängigkeiten; was die aktuelle Fassung trägt, sagt `marken.json`. Der Wächter und seine Befunde stehen in `design-guard.md`.
- **Die Werkzeugtabelle in `CLAUDE.md` hat eine Zeile je Werkzeug**, die Schalter stehen in den Verfahren.
- **Englische Verweise zeigen auf englische Abschnittstitel**, und der Selbsttest prüft jeden Verweis der Form `datei.md`, „Titel" gegen die Überschriften in der Sprache des Blattes, das verweist.

## 0.36.0 (2026-09-26)

Kontrakt: bis 6

- **Mandanten sind ein Muster mit Code, keine Prosa.** Muster 7 unter `.ara/templates/app-patterns/clients/` ordnet Konten Mandanten zu, am Namen aus der Kopfzeile der Anmeldung, setzt den Filter `nurZugeordnete` in jede Abfrage der Ablage, beantwortet einen fremden Vorgang mit 404, öffnet die Verwaltungsseite nur der Rolle, die der Kontrakt unter `freigaben.rollen` und `koepfe.rollen` nennt, und gibt dem Gerät die Regel für eine Freigabe: vier Augen, die Entscheider aus der Zuordnung. Eine Entscheidung von jemandem, der nicht mehr zuständig ist, zählt beim Nachziehen nicht. Der Selbsttest lässt es mit zwei Konten und zwei Mandanten gegen ein Gerät laufen, dessen Rollen anders heißen. `app.md` verweist darauf, statt es auf rund 600 Wörtern zu beschreiben; ein Agent, der es aus der Beschreibung entwarf, baute es jedes Mal anders.
- **Der Kern der Vorlage trägt es**: `regel` darf asynchron antworten und mit einem Satz statt einer Regel, dann startet kein Lauf; `zustaendig` prüft eine Entscheidung beim Nachziehen; `einreichen` gibt weitere Felder an die Ablage weiter; `holen` liest einen Vorgang.
- **Modellarbeit einer App läuft über einen Flow oder über das Auslesen eines Dokuments.** `app.md` sagt das in einem Satz, `platform-services.md` nennt den Chat nicht mehr als Weg für das Backend einer App.

## 0.35.0 (2026-09-26)

Kontrakt: bis 6

- **Das Kit sagt die Härtung an und lässt sie abwählen.** Bevor der Installer läuft, sagt `device.mjs --install arasul` in einem Satz, was die Härtung tut: SSH wandert auf den Port, den das geholte Artefakt in `scripts/security/haerten.sh` nennt, danach kommt nur noch ein Schlüssel herein, eine Firewall geht hoch. Die nächsten Schritte sagen dasselbe, bevor jemand installiert. Mit `--keep-ssh` bekommt der Installer `ENABLE_SSH_HARDENING=false` und `ENABLE_FIREWALL=false`, SSH bleibt auf seinem Port mit seiner Anmeldung, die Schlüsselprobe entfällt, und die ausgelassene Härtung steht als Entscheidung im Verlauf, nicht unter „Was der Installer nicht konnte". Am Orin lag SSH nach einem Durchlauf sieben Minuten auf dem neuen Port, ohne Vorwarnung; ein Kunde, dessen andere Dienste Port 22, die Anmeldung mit Passwort oder offene Ports brauchen, verlor so den Zugang.
- **Das Standardmodell kommt im Hintergrund, und das Kit sagt es.** Der Installer holt es seit dem 25.09.2026 selbst und sagt es in einer Zeile. Bis 0.34.0 sagte das Kit zwölf Zeilen darunter, auf einem frischen Gerät liege kein Modell, und schickte den Menschen für einen zweiten Download in die Oberfläche. Jetzt liest es die Zeile und nennt Modell und Fortschritt, oder sagt, dass der Installer keines geholt oder nichts gesagt hat.
- **`mirror.mjs --read` nimmt Pfade mit `docs/` davor**, so wie das Gerät seine Anleitungen nennt, etwa `docs/features/FIRMENORDNER.md`.

## 0.34.0 (2026-09-25)

Kontrakt: bis 6

- **Vor der Härtung prüft das Kit, dass ein Schlüssel hereinkommt.** Der Installer härtet SSH so, dass danach nur noch ein Schlüssel hereinkommt. Wer bisher mit Passwort aufs Gerät kam, sperrte sich mit der Installation aus. Jetzt versucht `device.mjs --install arasul` zuerst eine eigene Verbindung, die nichts als den Schlüssel zulässt und nicht auf einer offenen Sitzung mitfährt, und hält mit einem Satz an, wenn das nicht geht, bevor irgendetwas aufs Gerät geht. Läuft das Kit am Gerät selbst, entfällt die Prüfung. Der Selbsttest spielt das an einem Gerät durch, das nur ein Passwort annimmt.
- **Das README nennt einen kostenlosen Token je Konto**, nicht mehr fünf je Partner, wie am 28.08.2026 beschlossen.

## 0.33.0 (2026-09-25)

Kontrakt: bis 6

- **Das Kit folgt einem geänderten SSH-Port.** Seit dem 25.09.2026 härtet der Installer SSH mit `sudo -n`, und gelingt das, liegt SSH danach auf einem anderen Port. Der Installer sagt es in der Zeile `ARASUL_SSH_PORT=<port>`. Bis 0.32.0 legte das Kit nur seine Warnung unter „Was der Installer nicht konnte" ab, klopfte für die zweite Prüfung, den Kit-Schlüssel und die Freischaltung auf den alten Port und schrieb den alten Port in die Akte: der nächste Befehl stand vor einer Wand. Jetzt liest `device.mjs --install arasul` die Zeile, verbindet sich ab da über den neuen Port, schreibt ihn als `ssh_port` in die Akte und nennt alten und neuen Port im Verlauf. Der Selbsttest schickt genau diese Zeile durch die Ausgabe des Installers und eine Geräteakte.

## 0.32.0 (2026-09-25)

Kontrakt: bis 6

- **Die Vorlage legt ihre Daten in die Datenbank des Geräts.** Seit Kontrakt 5 gibt das Gerät jeder App mit Backend je Stand eine eigene PostgreSQL, und seit dem 25.09.2026 sagt der Kontrakt unter `daten`, dass sie der einzige Ort ist, der ein Einspielen überlebt. Die Vorlage schrieb bis 0.31.0 in eine SQLite-Datei im Container, die das nächste Einspielen löschte, und das Wissen riet, keine andere Ablage zu erfinden. Jetzt liest `backend/ablage/db.mjs` den Namen aus `arasul.json` und öffnet die Datenbank des Geräts über `pg`; ohne Gerät nimmt sie SQLite, mit demselben SQL, und die Route `lage` des Backends sagt, ob bleibt, was sie ablegt. Das Muster Dokumente legt die Bytes in dieselbe Datenbank. Gemessen am 25.09.2026 am Orin: nach dem Einspielen der nächsten Fassung lagen Belege und Protokoll noch da, eine Datei im Container war weg, der Livestand begann mit einer eigenen, leeren Datenbank.
- **`arasul.json` trägt, was einer Fach-App fehlte**: die Namen der Kopfzeilen für Benutzer und Rolle, den Weg zum Auslesen eines Dokuments, ob ein Lauf Einreicher und Regel annimmt, und was der Kontrakt unter `daten` sagt. Kein Kopfzeilenname und kein Dokumentweg steht mehr im Quelltext der Vorlage oder eines Musters; der Selbsttest hält beide daran.
- **Freigaben mit vier Augen und benannten Entscheidern.** Die Vorlage schickt den Einreicher mit, sobald das Gerät ihn annimmt, und ihr Kern kann eine Regel setzen (`ohne_einreicher`, `entscheider`), aber nur an einem Gerät, dessen Kontrakt `freigaben` nennt; ein älteres Gerät bekommt die Felder nicht. In die Freigabeanfrage gehen nur noch Verweise, die Nummer des Vorgangs und der Einreicher, kein Titel und kein Text.
- **Neues Muster 6, Dokument auslesen**, unter `.ara/templates/app-patterns/extract/`: ein Beleg geht an das Gerät, Felder kommen zurück, die App prüft sie gegen das Schema und eigene Regeln, jede Auslesung ist eine Zeile in einem Protokoll, das nur anwächst. Gemessen am 25.09.2026 am Orin: ein erfundener Beleg als PDF sechs von sechs Feldern in 35 Sekunden, eine erfundene Tankquittung als Foto über die Texterkennung des Geräts sechs von sechs Feldern in 13 Sekunden.
- **Das Wissen führt durch eine Fach-App.** `app.md` hat einen Abschnitt zu dauerhaften Daten, zur Sichtbarkeit innerhalb einer App (eine Zuordnung von Konten zu Mandanten am Kopfzeilennamen ist erlaubt und keine zweite Anmeldung), zu Freigaben in einer Fach-App, zu Fotos, gescannten PDFs, Bildmodellen und dem Feld `modelle`, und zu Fachstandards wie DATEV-EXTF, SKR03 und GoBD, die aus ihrer Primärquelle mit Abrufdatum kommen. Leistungsbeschreibung und Endkundenbedingungen sagen jetzt: ein Konto je Person, Freigabe je App, eine Trennung nach Mandanten nur, wenn die Beschreibung der App sie nennt.
- **Die Anleitungen am Gerät, ohne Token.** `node .ara/tools/mirror.mjs --docs --device <gerät>` listet sie aus dem Ordner, aus dem die laufende Plattform gestartet wurde, `--read <pfad>` gibt eine davon aus. Der Hinweis nach `--deploy` und das Wissen zeigen dorthin statt auf einen Spiegel, den es nicht gibt.
- **Kleinere Funde aus dem Fremdtest vom 25.09.2026:** `--status` gibt die Stände lesbar aus statt rohes JSON; nach dem zweiten Einspielen sagt `--deploy`, dass Freigaben bleiben, statt wieder „Gesehen hat es noch niemand“; `--build` verlangt einen aktiven Plan (`--no-plan` für den bewussten Bau ohne); der Zweig Unternehmen markiert die weggeräumten Dateien mit `skip-worktree`, und der Klon bleibt sauber; der Selbsttest lässt sich mit `ARA_SELFTEST_ONLY` auf einzelne Prüfungen einschränken, und das README nennt, wie lange der ganze Lauf dauert.
- `drittlizenzen.md` führt die Fassung von ollama mit Stand und Quelle.

## 0.31.0 (2026-09-25)

Kontrakt: bis 6

- **Kein Schlüssel auf dem Bildschirm während einer Installation, auch kein fetter.** Der Installer druckt den Kit-Schlüssel mit einem Steuerzeichen für Fettdruck direkt davor, und die Maske griff nicht: der Schlüssel stand im Klartext zwei Zeilen unter dem Satz, dass sein Klartext nicht angezeigt wird. Farb- und Cursorzeichen kommen jetzt vor dem Maskieren heraus, auch wenn ein Zeichen in zwei Stücken des Stroms ankommt. Gemessen am 25.09.2026 am Orin mit dem Erstausgabe-Skript des Produkts und einem gestempelten Scheinschlüssel: 0.30.0 zeigte ihn, 0.31.0 zeigt `aras_…`.
- **Nach einer Installation gilt genau ein Kit-Schlüssel.** Der Installer legt einen eigenen an, und das Kit legte bisher einen zweiten daneben und ließ den ersten gültig und ungenutzt liegen. Jetzt merkt sich das Kit den des Installers, ohne ihn zu zeigen, legt seinen eigenen auf den Namen des Partners an, widerruft den des Installers über dessen Präfix und zählt danach am Gerät nach. Kann es keinen eigenen anlegen, übernimmt es den des Installers. Gemessen am 25.09.2026 am Orin mit zwei gestempelten Schlüsseln: der des Installers widerrufen, der des Kits gültig, danach beide wieder widerrufen.
- **Der Actions-Runner von GitHub gilt nicht mehr als Rest von Arasul.** Sein Dienst trägt den Namen des Repos, und eine Installation brauchte seinetwegen `--despite-traces`.
- **Der Bericht nennt den Spiegel, der im selben Lauf geholt wurde**, und liest den Verifikationsstand daraus, statt zu sagen, es gebe keinen Spiegel.
- **Das Wissen sagt, wie das Standardmodell aufs Gerät kommt und wie lange das dauert**: in der Oberfläche, auf der Seite der Modelle, den Standard der Kurzliste; nicht mit einem Pull auf der Befehlszeile des Containers. Gemessen am Orin am 25.09.2026: rund 40 Minuten für 14,25 GB bei rund 6 MB/s, die erste Antwort nach 12 Sekunden. `/device` nennt den Schritt nach einer Installation.

## 0.30.0 (2026-09-25)

Kontrakt: bis 6

- **Das Kit schaltet das Gerät frei.** Ein gekaufter Token ist zugleich der Lizenzcode. Nach `--install arasul` holt das Werkzeug den Fingerabdruck vom Gerät mit `lizenz-geraet.sh fingerabdruck`, tauscht Token und Fingerabdruck bei `POST https://www.arasul.de/api/license/issue` gegen eine an dieses Gerät gebundene Lizenz, spielt sie mit `lizenz-geraet.sh einspielen` über die Standardeingabe ein und liest Stufe und Grenzen mit `status` zurück. Die Stufe landet in der Akte unter `license`, der Vorgang in ihrem Protokoll. Weder Token noch Lizenz stehen auf dem Bildschirm, in der Akte, im JSON oder als Argument am Gerät.
- **Ein kostenloser Token endet ohne Fehler auf community**, mit einem Satz dazu, was community heißt, den Grenzen, die das Gerät meldet, und dem Weg zu einem gekauften Code. Was das Portal ablehnt (`token_unbekannt`, `anderes_geraet`, `zu_viele_anfragen`, `dienst_aus`), kommt mit dem Weg heraus zurück, den der Kontrakt der Website nennt.
- **`--license --name <gerät>` schaltet ein Gerät frei, das schon läuft**, mit dem hinterlegten Token oder mit einem Code über die Leitung (`--pipe`), der nicht abgelegt wird. Ohne `--name` bleibt `--licence` der Kaufweg. `/device` nennt den Schritt, wenn Arasul läuft und die Akte keine Stufe oder community trägt.
- **Kein Preis mehr im Kit.** Was weitere Geräte und der kommerzielle Einsatz kosten, steht auf der Seite unter arasul.de, nicht im Werkzeug, im Wissen oder in den Befehlen. Das Wissen sagt, was community darf (3 Konten, 3 Apps) und dass die gekaufte Lizenz ohne Grenzen ist.

## 0.29.0 (2026-09-22)

Kontrakt: bis 6

- **Die Brücke kennt die Wurzel des Geräts.** Seit dem 22.09.2026 führt ein Gerät eine eigene Wurzel, Ebene 0 mit der Art `wurzel`, und nennt sie jedem aktiven Menschen zuerst in seiner Ordnerliste, mit leerem Pfad und dem Recht, das aus der Rolle folgt: jeder liest, Administratoren schreiben, kein Recht je Person. `sync` und `status` erkennen sie an Ebene und Art und an nichts anderem, nehmen ihre Kennung aus der Antwort, `firma` am gemessenen Gerät, und legen diesen Raum oben in den Baum, die Räume der Ebene 1 und 2 darunter an ihre echte Stelle. Die Brücke von 0.28.0 nannte diese Wurzel eine Form, die sie nicht kennt, und glich nichts ab. Ein Ordner der Ebene 1 mit der Kennung `wurzel`, wie ihn 0.28.0 als Wurzel anlegte, ist heute ein Ordner der Ebene 1 und landet unter seinem Namen. Ebene 0 mit einer anderen Art wird benannt und nicht angelegt.
- **`deploy` nimmt die Wurzel, die das Gerät nennt, und legt nur dann eine an, wenn das Gerät keine führt**: Kennung `firma`, der Name des Hauses, Art `wurzel`, Ebene 0, die Form, die auch die Oberfläche des Geräts vorschlägt, mit einer Sitzung, die genau für diese Anfragen geliehen ist. Ein Recht je Person wird darauf nicht vergeben. Führt das Gerät eine Wurzel und nennt sie diesem Menschen nicht, wird das gesagt und nichts angelegt: 0.28.0 legte einen zweiten Raum `wurzel` neben die Wurzel des Geräts, diese Fassung nie. Ein Gerät, das die Art `wurzel` nicht annimmt, wird als eines von vor dem 22.09.2026 benannt, und an ihrer Stelle wird nichts ausgerollt.
- **`Fatal: Authentication` vom Klienten bekommt einen Satz mehr**, in `deploy` und in `sync`: der Dateidienst hat für diesen Menschen kein Passwort, weil das Gerät ein Passwort beim Setzen in den Dienst spiegelt, ein Konto, dessen Passwort vor dem Einschalten des Firmenordners gesetzt wurde, kommt also erst nach einem Passwortwechsel hinein. Gemessen am 22.09.2026 mit einem Passwort, das der Dienst nicht kannte.
- Gemessen am 22.09.2026 an einem Gerät, das seine Wurzel `firma` führt, aus einer Testwurzel mit zwei Wegwerf-Konten: `--deploy` als Administrator nahm diese Wurzel, legte nichts an, danach lagen alle 16 Dateien im Raum und das Gerät führte weiter genau eine Wurzel; ein Mitarbeiter mit `lesen` auf der Wurzel nach Rolle und `schreiben` auf einem Ordner der Ebene 2 bekam aus einem leeren Ordner die Wurzel oben, den Ordner an seiner Stelle, die Kette darüber lokal angelegt und `sicht.md` vom Gerät; Claude Code, zwei Ebenen tiefer gestartet, lud die `.claude/CLAUDE.md` der Wurzel und ihre Skills, und der Skill `arasul` ließ `arasul.mjs apps` gegen das Gerät laufen.

## 0.28.0 (2026-09-22)

Kontrakt: bis 6

- **Die Wurzel geht aufs Gerät und lebt dort.** `node .ara/tools/root.mjs --path <wurzel> --deploy` übergibt an die Brücke der Wurzel, `arasul.mjs deploy`: zuerst läuft das Prüfskript der Wurzel, und ein Befund hält alles an, der Raum der Wurzel wird in dem gesucht, was das Gerät diesem Menschen freigibt, und fehlt er, wird er als Administrator angelegt, als geteilter Ordner der Ebene 1 mit der Kennung `wurzel`, bis das Gerät die Art kennt, mit einer Sitzung, die genau für diese Anfragen geliehen und danach beendet wird, und das Recht `schreiben` darauf bekommt, wer ihn angelegt hat. Dann geht der Baum über den Kommandozeilen-Klienten des Dateidienstes in den Raum, und der Raum kommt in einen Wegwerfordner wieder herunter, als Beweis: `deploy` sagt, wie viele Dateien gingen, wie viele im Raum liegen und welche nicht ankamen. `settings.json`, Hooks, `.git`, `node_modules`, `.DS_Store`, die Journaldatei des Klienten, `apps/`, `sicht.md` und die Räume, die das Gerät einzeln freigibt, gehen nie mit. Eine Wurzel aus einem älteren Kit bekommt zuerst die Brücke des Kits, weil die alte kein `deploy` kennt.
- **`sync` legt den Raum der Wurzel oben in den Baum**, nicht in einen Ordner darunter, und die Räume der Ebene 1 und 2 darunter an ihre echte Stelle, wie bisher. Ein Raum der Ebene 1 gilt als die Wurzel an der Art `wurzel`, wo das Gerät eine nennt, sonst an der Kennung `wurzel`. Der Abgleich der Wurzel selbst lässt die Namen der anderen Räume, `apps` und `sicht.md` in jeder Tiefe draußen, weil der Klient kein Muster oben im Baum verankert: gemessen, ein Name mit führendem Schrägstrich in der Liste hielt nichts draußen, und im Quelltext des Klienten nachgelesen. Ein leerer Ordner mit `arasul.mjs` allein wird mit `login` und `sync` die Wurzel: die Datei, die den Anfang macht, tritt beiseite, bevor der Klient läuft, weil der Raum die des Hauses trägt und der Klient zwei Fassungen nicht zusammenführen kann, er behielt beide und nannte die zweite eine Konfliktkopie. `sync` und `status` zählen jetzt auch diese Schreibweise eines Konflikts.
- **`sync` schreibt `sicht.md`**, die Sicht dieses Menschen, oben in die Wurzel: den Dateidienst, jeden Ordner mit Ebene, Recht und letztem Abgleich, was am Abgleich vorbeigeht, wie das Gerät es sagt, und die zugewiesenen Apps mit ihren Routen. Das Gerät liefert sie selbst, sobald es auf der Route `sicht` unter der Route des Firmenordners antwortet; bis dahin schreibt das Werkzeug das Blatt aus dem, was das Gerät über Ordner und Apps sagt, und sagt es. Je Mensch, nie abgeglichen, von der `.gitignore` der Wurzel ausgelassen.
- Gemessen am 22.09.2026 an einem Gerät, aus einer Testwurzel mit zwei Wegwerf-Konten: nach `--deploy` lag das Gerüst im Raum `wurzel`, alle 16 Dateien und nichts von diesem Rechner, geprüft mit einem Herunterladen ohne jede Liste; ein zweites Konto mit `lesen` auf dem Raum und `schreiben` auf einem Ordner der Ebene 2 bekam aus einem leeren Ordner die Wurzel oben, den Ordner an seiner Stelle und die Kette darüber lokal angelegt; Claude Code, zwei Ebenen tiefer gestartet, lud die `.claude/CLAUDE.md` der Wurzel und ihre Skills, und ein Aufruf des Skills `arasul` ließ `arasul.mjs apps` gegen das Gerät laufen.

## 0.27.0 (2026-09-22)

Kontrakt: bis 6

- Das CLI der Wurzel gleicht den Firmenordner ab. `node arasul.mjs sync` fragt mit dem Ausweis `GET /api/firmenordner`, bekommt die Adresse des Dateidienstes, den Namen des Menschen dort und je Ordner Kennung, Ebene, Eltern, Pfad und Recht, und legt jeden freigegebenen Ordner an seine echte Stelle im Baum: einen Ordner der Ebene 1 als Raum, der nach seiner Kennung heißt, einen der Ebene 2 über den Raum `Shares` mit `--remote-folder`, und die Kette darüber lokal, auch wo der Mensch auf dem Elternordner kein Recht hat. Das Abgleichen tut der Kommandozeilen-Klient des Dateidienstes aus dem Desktop-Paket des Herstellers, der entpackt läuft; `--client` nennt, wo er liegt. Was eine Maschine macht, was zu diesem Rechner gehört (`.claude/hooks/`, `settings.json`) und was der Klient selbst schreibt, bleibt draußen, seine eigene Journaldatei eingeschlossen, ohne die er Konflikte an sich selbst meldet. `503` vom Gerät heißt, dass dort kein Dateidienst läuft, und wird nie für eine leere Ordnerliste genommen. Konflikte und Symlinks werden aus dem Baum gezählt und benannt, und beide machen `sync` und `status` rot.
- `node arasul.mjs status` sagt je Ordner, wann zuletzt abgeglichen wurde, ob es durchging und wie viele Konflikte und nicht abgeglichene Symlinks darin liegen, dazu wie bisher Gerät, Ausweis und Vorschläge. Der Stand liegt neben dem Ausweis in `firmenordner.json`, nach Wurzel geschlüsselt, und trägt kein Geheimnis.
- Die Anmeldung mit Passwort behält keine Sitzung mehr. Sie benutzt die Sitzung für genau eine Anfrage, `POST /api/ausweise`, und legt nur den Ausweis ab, den das Gerät dort ausstellt: eine Sitzung hat ein Ende und trägt alles, was der Mensch darf, ein Ausweis sagt, wer jemand ist, und öffnet keine Verwaltung. `--credential-name` sagt, unter welchem Namen das Gerät ihn führt, sonst der Name dieses Rechners; ein Name, den es schon gibt, wird gesagt, und nichts wird abgelegt. Das Passwort geht dem Klienten des Dateidienstes in dessen Umgebungsvariablen mit und nie als Argument, und abgelegt wird es nirgends.

## 0.26.0 (2026-09-22)

Kontrakt: bis 6

- Das Kit versteht Kontraktfassung 6. Eine App nennt im Manifest die Routen, die sie einem Agenten anbietet (`agent`): das Kit liest das Feld, reicht es unverändert an das Gerät weiter und hält jede Route, die es nennt, gegen den Quelltext des Backends. Bisher bekam ein Gerät mit Fassung 6 den Satz, was dem Kit fehlt, und es ließ sich nichts darauf einspielen, ganz gleich, wie die App aussah.
- **Die Quelle der Form ist das Schema des Geräts.** Was das Gerät mit seinen Worten bereits abgewiesen hat, sagt `--check` nicht ein zweites Mal in den Worten des Kits. Übrig bleibt, was kein Schema trägt und was über den Aufruf entscheidet: `writes` bei einer Methode, die etwas ändert, dieselbe Route zweimal. Diese Lesung ist die des CLI in der Wurzel, und eine Route, die sie nicht annimmt, ruft das CLI nicht auf.
- Die Suche nach einer Route im Backend findet einen Pfad auch, wenn er in einem regulären Ausdruck steht (`/^\/journal$/`), nicht nur in Anführungszeichen. Ein Backend mit einer Tabelle von Mustern bekam bisher den Befund, seine Route gebe es nicht.
- Gemessen gegen ein Gerät mit Kontraktfassung 6: der Kontrakt liest sich mit Rückgabe 0, die Prüfung einer App mit dem Feld endet ohne Befund, und eine ohne das Feld endet wie zuvor.

## 0.25.0 (2026-09-21)

Kontrakt: bis 5

- Die Wurzel trägt eine Brücke zu den Apps eines Geräts: `arasul.mjs` neben `.claude/`, eine Datei, die mit Node allein läuft. `login` hält einen Ausweis in `~/.config/arasul/credentials.json` (0600, je Gerät ein Eintrag mit Adresse und Token; solange das Gerät keine Token ausstellt, mit Name und Passwort, die Sitzung wird gehalten und weder das Passwort noch etwas davon abgelegt oder je gezeigt), zeigt die Vorschläge für Hooks und Regeln der Wurzel und jedes Ordners der Ebene 2, gibt sie einzeln mit ihrer Prüfsumme frei und sagt, wo jeder Ort auf diesem Rechner liegt. `apps` listet die zugewiesenen Apps mit ihren Routen und schreibt `apps/<id>/APP.md`, `call <app> <route>` ruft nur Routen auf, die die App in ihrem Feld `agent` nennt, und eine, die etwas ändert, braucht `--write`. `sync` und `status` sagen, dass der Dienst für Firmenwissen noch nicht feststeht. Ein Gerät mit eigenem Zertifikat wird einmal mit `--insecure` festgehalten, die Prüfung wird nie abgeschaltet. Der Skill `arasul` in der Wurzel sagt dem Agenten, wie er es nutzt. Kein MCP-Server, kein Dateizugriff für Apps: der Rückweg geht über den Agenten.
- Der Vorschlag der Wurzel erlaubt `apps` und die lesende Form von `call` ohne Rückfrage und hält `call ... --write` unter der neuen Seite `ask` zurück. Gemessen mit `claude -p` 2.1.278: die lesenden Aufrufe liefen, der schreibende wurde zurückgehalten.
- **Behoben:** eine Regel für einen Shell-Befehl im Vorschlag trug `//` vor dem Pfad, die Schreibweise der Leseregeln, und passte nie auf einen Befehl. Die Regel für das Prüfskript der Wurzel wirkte in 0.24.0 nicht. Sie steht jetzt mit dem Pfad, wie er getippt wird. Eine mit 0.24.0 angemeldete Wurzel zeigt den Vorschlag als geändert und will die Freigabe neu.
- Das App-Gerüst trägt das Feld `agent` in `app.json` und beantwortet die Route `agent` damit, samt Kennung, Name und Version. Der Bau legt eine Kopie der `app.json` neben das Backend. `app.mjs --check` und `--deploy` halten das Feld gegen die App: seine Form, und dass jede Route, die es nennt, im Backend steht. **Ein Gerät, dessen Schema für `app.json` das Feld nicht kennt, weist das Paket ab**, und `--check` sagt es.
- Das Prüfskript der Wurzel kennt den Ordner `apps/` und liest `arasul.mjs` nicht auf Felder mit Werten. Ein Haus kann keinen Ordner der Ebene 1 `apps` nennen.
- `root.mjs --enroll` und `arasul.mjs login` legen dieselben Dateien an und nehmen die Freigabe des anderen zurück, der Selbsttest hält sie zusammen.

## 0.24.0 (2026-09-21)

Kontrakt: bis 5

- `/root` legt ein Gerüst an, keine Arbeitsweise. Ohne Schalter trägt die Wurzel `.claude/CLAUDE.md` mit den Regeln, `.claude/skills/` (place, where-things-go) und `.claude/agents/` (place-reader, root-checker), die Liste der Orte, das Prüfskript und die Ordner der Ebene 1, die das Haus mit `--folders` oder im Interview nennt. Das Kit bringt keine eigenen mit. Alles aus 0.23.0, was Arbeit steuert, `company/`, `roadmap/` mit dem Kartenstapel, `experiments/`, `customers/`, `templates/`, `archive/`, das Kartenwerkzeug und sein Skill, ist jetzt ein Zusatz: `--method` legt ihn mit dem Gerüst aus oder in eine bestehende Wurzel, hängt seine Regeln an und überschreibt nichts. Seine Prüfungen laufen unverändert weiter. Das Gerüst liegt unter `.ara/templates/root/`, der Zusatz unter `.ara/templates/root-method/`.
- Nichts im angelegten Baum läuft von selbst. Es liegt keine `settings.json` darin und kein scharfer Hook. Der Grenz-Hook und die Erlaubnisregeln liegen in `.claude/proposal/` als Vorschlag. `--enroll` zeigt, was in die eigenen Einstellungen des Nutzers käme, dazu eine Prüfsumme über Vorschlag und Hook, `--enroll --consent <prüfsumme>` schreibt es, `--unenroll` nimmt genau das zurück. Der Hook, der läuft, ist eine Kopie neben den Einstellungen, eine Änderung im Baum wirkt also erst nach neuer Zustimmung, und `--show` sagt, dass der Vorschlag sich geändert hat. Der Hook wirkt nur in einer Sitzung, die in der Wurzel oder darunter gestartet ist, nicht in einem Ort und nicht anderswo, denn angemeldet hängt er vor jeder Sitzung auf dem Rechner. Das Einloggen an einem Gerät, der Abgleich und das Abfragen von Apps gehören nicht dazu, das bleibt beim CLI der Wurzel.
- Das Prüfskript hat 17 Prüfungen. Neu: keine `settings.json` im Baum (14), Vertrauliches nach Muster in der Wurzel und in Ebene 1 (15), Verweise nur nach oben, kein Nachbar und kein Inhalt eines Ordners in einer Regel der Wurzel (16), kein `.git`, das die Liste nicht nennt, und kein Quelltextbaum im Baum (17). Einzelne Skripte sind überall erlaubt und kein Befund. Ein Ordner, der den Namen eines Ortes ohne lokalen Pfad trägt, gilt als seine Kopie (11).
- Ein unbekannter Schalter von `root.mjs` wird gemeldet und hält das Werkzeug an, ebenso ein loses Argument und eine unbekannte `--language`. `--lang` wurde früher überlesen, und die Wurzel kam in der Sprache des Profils heraus.
- Die Vorzeigefassung folgt dem Gerüst: zwei Ordner der Ebene 1 und nichts, das von selbst läuft, und sie kommt mit der Methode.
- Gemessen in einer echten Sitzung, `claude -p` 2.1.278 mit einer Einstellungsdatei über `--settings`: eine Sitzung eine Ebene unter der Wurzel lädt Regeln, Skills und Agents der Wurzel, mit und ohne `.git`. Die Tilde in `additionalDirectories` wird aufgelöst. Mit Zustimmung hält der Hook ein Schreiben in einen geschlossenen Ort über Werkzeug und Shell an, von der Ebene darunter und aus der Wurzel, und lässt eine Sitzung im Ort in Ruhe. Ohne Zustimmung wirkt er nicht. Nicht gemessen: dasselbe über `~/.claude/settings.json` selbst und in einer interaktiven Sitzung.

## 0.23.0 (2026-09-21)

Kontrakt: bis 5

- Das Kit legt den Wurzelordner eines ganzen Hauses an. `/root` und `node .ara/tools/root.mjs --path <ordner> --name "<haus>"` erzeugen außerhalb des Kits einen Baum mit Regeln und Wahrheitstabelle, `company/`, einer Roadmap mit einem Blatt je Ort und einem Kartenstapel, `experiments/`, `customers/`, `templates/`, `archive/`, einem Prüfskript mit 13 Prüfungen, einem Grenz-Hook mit seinen Fällen, einem Kartenwerkzeug und Rechten je Ordner in `settings.json` nach dem Vorbild des Kits. Das Gerüst liegt unter `.ara/templates/root/` in beiden Sprachen. Nach dem Anlegen braucht die Wurzel das Kit nicht mehr, ihre Skripte laufen mit Node allein.
- Eingebettete Orte sind ein Verweis, nie eine Kopie. Ein Ort ist ein GitHub-Repository oder ein fremder Ordner wie SharePoint, er steht in einer Liste mit dem, wo er lebt, und höchstens mit dem, wo er auf diesem Rechner liegt. Der Hook hält eine Sitzung in der Wurzel davon ab, in einen Ort zu schreiben, über die Werkzeuge und über die Shell, auch über einen Link, denn eine solche Sitzung lädt die Regeln des Ortes nicht. `write: yes` öffnet einen Ort per Beschluss des Hauses. `--place` trägt einen in eine bestehende Wurzel nach und lässt von Hand eingetragene Rechte in Ruhe.
- Eine erfundene Firma liegt als Vorzeigefassung bei: `--example` legt sie aus, mit gefüllten Blättern, Karten in jeder Spalte, einem Experiment, einem Kunden und vier Orten. Ihre Daten zählen vom Tag des Anlegens an, ihr eigenes Prüfskript findet darin also nichts, heute und in einem Jahr.
- Das Gerüst trägt seine Regeln als `rules.md` und nicht unter dem Namen, den der Agent lädt: eine Regeldatei in einem Unterordner wird mitgelesen, sobald eine Datei daneben gelesen wird, und wer am Gerüst arbeitete, arbeitete nach den Regeln einer fremden Wurzel.
- Der Selbsttest legt eine Wurzel in beiden Sprachen an und lässt ihr Prüfskript laufen, baut zwölf Fehler in die Vorzeigefassung und erwartet jeden von seiner eigenen Prüfung, lässt die Fälle der Grenze laufen, bewegt Karten nach ihren Regeln und sucht im Ausgelegten nach Arasul-Eigenem.

## 0.22.0 (2026-09-15)

Kontrakt: bis 5

- Das Wissen zeigt, was eine App jenseits des Formulars ist. `.ara/knowledge/app-patterns.de.md` trägt fünf Muster mit Code, der läuft: mehrere Routen mit Seitenleiste (die Vorlage selbst), ein Dokument hochgeladen und in der Dokumentanzeige der Bibliothek gezeigt, eine Mail aus dem Backend der App über SMTP mit den Werten aus dem Manifest, eine fremde API aus dem Backend gerufen, und ein fremder Container als App hinter der Anmeldung des Geräts. Ein Partner, der nur den Vorgang mit seinem Freigabe-Schritt fand, hielt Arasul für ein Formularwerkzeug. Der Code liegt unter `.ara/templates/app-patterns/`, geteilt wie die Vorlage, und jede Datei sagt in ihrem Kopf, wo sie hingehört.
- `/app` kennt die Muster in der Ideenphase: der Befehl lädt das Blatt, sobald eine Idee entsteht, die Prüfliste des Interviews fragt, welche Gestalt die App annimmt, und `--new` nennt das Blatt.
- Der Spiegel des Designsystems in der Vorlage steht auf 4.1.0: das Muster `Dokumentanzeige` für PDF und Bilder, und `Dateiablage` mit Vorschau. Der Bau der Vorlage legt die Stützdateien der PDF-Bibliothek neben ihre Chunks (`pdf-dateien/`), und `pdfjs-dist` steht in ihrer `package.json`. Seit 4.0.0 kennt die Bibliothek nur Blau, Grau und Rot, deshalb färbt die `stil.css` der Vorlage einen Stand mit dem Akzent und dem leisen Text statt mit den Marken, die weggefallen sind.
- Mail und eine fremde API sind Sache der App und kein Dienst der Plattform; das Blatt sagt das und sagt, wohin ein Passwort und ein Schlüssel nicht gehören: nicht ins Manifest. Ein fremder Container geht mit einem Bauplan aus einer Zeile hinein, weil das Gerät baut und kein fertiges Image nimmt, wie die Regeln seines Kontrakts sagen.
- Der Selbsttest lässt die Muster laufen: die Dokumente im Backend der Vorlage, die Mail durch ein lokales Relais, die fremde API gegen einen lokalen Stellvertreter, das Manifest des fremden Containers durch die Manifestprüfung, und jeden Pfad, den das Blatt nennt, gegen die Dateien.

## 0.21.0 (2026-08-30)

Kontrakt: bis 5

- Ein Unternehmen bekommt bei `/init` keine Partnerware. `BRANCHES` in `commands.mjs` schnitt nur die Befehle nach Zweig; die Skills `customers`, `sales` und `pricing`, die Vorlagen für Angebot, Rechnung und Endkundenbedingungen und das Wissen zu crm, sales, pricing und invoicing kamen zweigblind mit dem Klon, und `update.mjs` spielte sie jedem wieder ein. Ein Unternehmen, das das nach `/init` sah, hielt das Kit für ein Händlerwerkzeug. Jetzt räumt `commands.mjs --apply --role company` sie weg, mit einem leeren Ordner `customers/` dazu, und sagt, was ging und wie es zurückkommt: `role` im Profil, dann `update.mjs`.
- Die Liste ist eine, `PARTNER_ONLY` in `lib/commands.mjs`. `update.mjs` liest sie und lässt die Partnerware für ein Unternehmen aus, auf beiden Seiten des Vergleichs: weder „neu" noch eingespielt. Der Zweig Partner ist unverändert.
- Der Selbsttest führt seine Kunden in einem Wegwerfordner unter `os.tmpdir()`, nicht unter `customers/` im Kit. Bisher legte er `customers/_selftest` unter der Wurzel an und räumte nur den Unterordner, und jeder Lauf hinterließ ein leeres `customers/`, auch im Klon eines Unternehmens. Jedes Werkzeug liest dafür `ARA_CUSTOMERS`, siehe `lib/kit.mjs`. Ohne die Variable gilt `customers/` im Kit, wie bisher.
- Der Selbsttest prüft den Schnitt in einer Wegwerfkopie für beide Zweige, hält das Update gegen ein Unternehmen, das `/init` durchlaufen hat, und überspringt in einem Klon ohne Partnerware die Prüfungen, die sie brauchen, benannt statt rot.

## 0.20.2 (2026-08-30)

Kontrakt: bis 5

- `node .ara/tools/update.mjs --check` nennt die Verträglichkeit des geholten Standes, nicht die des laufenden. Die Zahl kommt aus der Kontraktzeile der geholten Änderungsliste, aus dem Eintrag zu ihrer Nummer. Bisher fragte `standBlock()` den Code des Prozesses, der gerade läuft, und das ist das alte Kit: am 30.08.2026 las ein Klon auf 0.15.0 unter „Neu seit 0.15.0" die Zahl bis 3, während der Stand, den er bekommen hätte, bis 5 verstand. Das ist genau verkehrt herum für die eine Entscheidung, für die die Zeile da ist. Wer liest, dass sich die Zahl nicht bewegt, zieht nicht nach, weil er glaubt, es bringe nichts.
- Nennt ein geholter Stand keine Kontraktzeile, sagt das Werkzeug das, statt die Lücke mit der eigenen Zahl zu füllen. Eine Lücke ist zu nennen und nicht zu raten.
- `--json` trägt dieselbe Aussage maschinenlesbar: `contract.hier` aus dem Code dieses Laufs, `contract.dort` aus der Änderungsliste des geholten Ordners.
- Die Verträglichkeit eines fremden Standes kommt aus seiner Änderungsliste und nicht aus seinem Code. Der Code liegt in einem Ordner, der nicht eingespielt ist, und ihn ausgerechnet beim Nachsehen laufen zu lassen wäre das Gegenteil von nachsehen. Sein eigener Selbsttest hat die Zeile gegen seinen Code gehalten, bevor er ausgeliefert wurde.
- Der Selbsttest hält die beiden auseinander. Der Stand im Testarchiv trägt eine Kontraktzeile über der Grenze des laufenden Kits, und `--check` muss diese vorlesen; bisher waren beide Zahlen im Test gleich, und die Verwechslung war daran nicht zu sehen.

## 0.20.1 (2026-08-30)

Kontrakt: bis 5

- Der Browser des Kits kommt am selbst ausgestellten Zertifikat eines Geräts vorbei. `.mcp.json` startet ihn mit `--ignore-https-errors`, damit erreicht `browser_navigate` die Oberfläche eines Geräts mit `tls: selfsigned` beim ersten Aufruf. Bisher brach er mit `ERR_CERT_AUTHORITY_INVALID` ab, bevor überhaupt eine Seite da war, und ein Partner sah seine App nie im Rahmen.
- Das Blatt zum Browser schickt niemanden mehr auf eine Warnseite, die nicht kommt. Seit 0.19.0 stand dort, man solle sich hindurchklicken, in Chromium "Erweitert" und dann der Link darunter; über den Browser des Kits gibt es nichts zu klicken, der Aufruf bricht vor der Seite ab. An seiner Stelle steht der Schalter, wo er eingetragen ist, und der Satz, dass ein eigener Kontext über `browser_run_code_unsafe` eine Seite weit trägt und nicht weiter.
- Beide Blätter sagen, warum ein Gerät, das ohne den Schalter aufgeht, nichts beweist: der Browser behält eine Entscheidung je Profil, und das Profil liegt auf einem Rechner. Gemessen am 30.08.2026 gegen den Orin, zweimal mit demselben Server und denselben Argumenten, jeweils mit einem eigenen Profil: ohne den Schalter `ERR_CERT_AUTHORITY_INVALID`, mit ihm die Anmeldeseite.
- Der Selbsttest hält beides zusammen. `.mcp.json` muss den Schalter tragen, und beide Blätter müssen ihn zusammen mit der Datei nennen, in der er steht.

## 0.20.0 (2026-08-30)

Kontrakt: bis 5

- Ein Klon, der hinter seinem Gerät liegt, erfährt es beim ersten Kontakt und nicht erst beim Einspielen. `/device` liest nach der Prüfung den Kontrakt des Geräts, sagt, ob dieses Kit die Fassung versteht, die es führt, und nennt den einen Weg heraus: `node .ara/tools/update.mjs`. Am 30.08.2026 stand die Werkstatt auf Kontraktfassung 3 und der Orin führte 5; `--check` nahm das Manifest an und gab trotzdem 1 zurück, `--deploy` brach mit „Nichts eingespielt" ab, und gesucht wurde in der App. Das war schon der Grund, an dem ein Fremder am 29.08. scheiterte.
- Die Zahl, die das Gerät führt, geht als `contract` in seine Akte, am Gerät gelesen und nicht behauptet. `/init` findet sie dort ohne Gerät wieder: `node .ara/tools/init.mjs --show` nennt jedes Gerät, das weiter ist als dieses Kit, mit dem Gerät und mit dem Weg, bevor irgendetwas anderes angefangen wird. Was nicht zu lesen war, bleibt ungemessen und wird als solches genannt, denn eine Plattform, die gerade hochkommt, sagt nichts über ihre Fassung.
- `--check` endet nicht mehr mit Rückgabecode 1 ohne Satz. Der Grund steht am Schluss des Berichts, dort, wo jemand aufhört zu lesen, mit beiden Zahlen und mit dem Weg. Seine erste Zeile sagt, dass das Manifest damit nichts zu tun hat: der Bericht darüber kann im selben Atemzug sagen, dass das Schema des Geräts das Manifest annimmt, und aus diesen beiden sieht eine App wie die Schuldige aus.
- `--deploy` sagt zuerst „Nichts eingespielt" und den Grund gleich dahinter, in einer Zeile. Bis 0.19.1 stand der Grund vor der Absage, und die letzte Zeile, die ein Mensch liest, ist die, nach der er handelt.
- Der Weg ist ein Aufruf und nicht mehr nur ein Befehl im Gespräch. Jede Stelle nennt `node .ara/tools/update.mjs` und sagt, dass `/init` denselben Weg geht: `/init` führt daran vorbei, aber wer gerade abgebrochen ist, liest eine Zeile und kein Verfahren.

## 0.19.1 (2026-08-30)

Kontrakt: bis 5

- Der Spiegel des Designsystems steht auf Fassung 3.1.1. Die Bibliothek schrieb in drei Dateien eine Breite aus einer Variablen in der Kurzform von Tailwind 3 (`sidebar`, `calendar`, `Suchauswahl`); Tailwind 4 packt die nicht mehr in ein `var()`, sondern schreibt `width: --name`, und der Browser lässt die Regel fallen. Im Rahmen des Orin sah man es als Seitenleiste über dem Inhalt, weil der Platzhalter, der ihre Spalte freihält, null breit war. Die Bibliothek hat es in 3.1.1 umgestellt, das Kit zieht nach.
- Die Notzeilen in der `stil.css` der Vorlage sind gestrichen. Sie standen dort seit dem 29.08.2026 mit Datum und dem Satz, dass sie wieder verschwinden, sobald die Bibliothek die Schreibweise umstellt, und setzten die vier Breiten der Seitenleiste noch einmal von Hand. Genau dieser Fall ist eingetreten. Eine App aus der Vorlage trägt damit keine Regel mehr, die eine Ursache abfängt, die es nicht mehr gibt.
- Gemessen am Orin, im Rahmen bei 1440 Pixeln, in Hell und in Dunkel: der Rahmen der App 1042 Pixel breit, der Platzhalter der Seitenleiste 256 Pixel, der Inhalt beginnt bei 256. Ohne die Notzeilen.

## 0.19.0 (2026-08-29)

Kontrakt: bis 5

- Nach einem Deploy sagt das Kit, wer den Teststand sehen darf. Ein Fremder war am 29.08.2026 in dreieinhalb Minuten im Teststand und bekam dort eine 403, weil die App für niemanden freigegeben war, und das Kit sagte nichts dazu. Es nennt die Freigabe jetzt am Ende des Einspielens, dazu die zwei Wege zu einem Administrator: eine Sitzung aus dem Startpasswort, wenn eines in der Ablage liegt, sonst ein Mensch in der Oberfläche des Geräts. Welcher Weg oder welche Seite das ist, steht im Artefakt und nicht im Kit: sein Schlüssel trägt `app:deploy`, und der Kontrakt des Geräts nennt für eine Freigabe keinen Weg.
- `--admin-login` führt zu einem Weg statt zu einem Ende. Auf einem Gerät, das jemand anders installiert hat, gibt es kein Startpasswort, und das Kit kann keines herbeiholen. Bis 0.18.0 sagte das Werkzeug das und hörte auf, mit einem Satz, der nur für seine eigenen Installationen stimmte („steht in der Erstausgabe am Gerät"). Es nennt jetzt drei Wege, und keiner davon braucht das Kit: jemand gibt das Passwort einmal herein, oder es wurde geändert und das heute gültige geht hinein, oder der Administrator tut in der Oberfläche, was die Sitzung getan hätte. Mitarbeiter, Freigaben und sein eigenes Passwort liegen ohnehin dort.
- Das Kit kann seinen eigenen Schlüssel widerrufen. `--keys` listet, was am Gerät liegt, Zeile für Zeile so, wie das Gerät sie schreibt, und markiert den, mit dem dieses Kit arbeitet; erkannt wird er an seinem Präfix, denn Namen wiederholen sich und Präfixe nicht. `--revoke-key` widerruft genau diesen, nimmt den Eintrag aus der Geheimnis-Ablage und leert `api_key_ref` in der Akte: ein Wert, der am Gerät nicht mehr gilt, ist kein Geheimnis, sondern ein toter Zugang. Einen fremden Schlüssel fasst das Kit nie an. Am 29.08.2026 lagen acht Kit-Schlüssel auf einem Orin, drei davon mit demselben Namen, und im Kit gab es keinen Weg, einen zurückzunehmen.
- `forgetSecret` in der Geheimnis-Ablage: es nimmt einen Eintrag aus der **gewählten** Ablage heraus. Bisher konnte das Kit nur schreiben, und ein widerrufener Schlüssel wäre als gültig aussehender Zugang liegen geblieben. Aus der anderen Ablage nimmt es nichts: derselbe Name liegt dort, weil ein anderer Klon auf diesem Rechner ihn abgelegt hat, und die Regel, die seit 0.18.0 fürs Lesen gilt, wiegt beim Löschen schwerer. Was wo liegt, wird genannt und nicht entfernt. Der erste Entwurf von `--revoke-key` leerte beide, und ein Fremdtest hat noch am selben Abend gezeigt, was das kostet.
- Die Antwortdateien für `/init` erklären `ssh_key`. Es ist der Name des privaten Schlüssels in `~/.ssh` auf diesem Rechner, ohne Pfad; das Kit hält den Namen, der Schlüssel bleibt liegen, wo er liegt, und das Gerät muss den passenden öffentlichen kennen.
- Eine Freigabe gilt einem Stand, und `--deploy` sagt das. Ein gerade eingespieltes Paket liegt nur im Teststand; wer allein für den Livestand freigegeben ist, sieht ihn nicht, und dann steht die Freigabe und die Übersicht bleibt leer. Der Fremdtest am 29.08.2026 ist genau daran hängen geblieben, mit gesetztem Häkchen.
- Ohne Spiegel zeigt das Kit nicht mehr auf Anleitungen, die es hier nicht gibt. Bisher schickten `--deploy` und `--admin-login` jeden zu `mirror.mjs --docs`, das antwortete „es gibt keinen Spiegel", `--refresh` antwortete „kein Token hinterlegt", und wer ein bestehendes Gerät übernimmt, stand nach drei Sprüngen vor einer Kauffrage. Wo kein Spiegel liegt, steht das jetzt im selben Satz.
- `/device` nennt `--keys` unter den nächsten Schritten. Dass ein Gerät Kit-Schlüssel sammelt und man seinen eigenen wiederfinden können muss, stand nur im Blatt.
- Das Blatt zum Browser nennt die Warnseite eines Geräts mit `tls: selfsigned` und dass das Hindurchklicken auf einem Gerät, bei dem man sicher ist, erwartet ist. Der Browser lehnte mit `ERR_CERT_AUTHORITY_INVALID` ab, und kein Verfahren sagte ein Wort dazu.
- Die Laufzeit des Geräts redet nicht mehr in den Beleg eines Widerrufs: eine `DeprecationWarning` aus dem Container stand mitten darin. Herausgenommen wird nur, was erkennbar von der Laufzeit stammt; jede andere Zeile bleibt stehen, auch eine unerwartete.

## 0.18.0 (2026-08-29)

Kontrakt: bis 5

- Das Kit versteht die Kontraktfassungen 4 und 5. Bis 0.17.0 verstand es bis 3, und der Orin führt seit dem 29.08.2026 die 5: `--check` nahm ein Manifest noch an, `--deploy` verweigerte, und ein Fremder kam nicht weiter. Fassung 4 bringt `marken` im Manifest, Fassung 5 die drei Umgebungswerte in ihrer Rolle (`umgebung.basis`, `umgebung.schluessel`, `umgebung.datenbank`) und je Endpunkt seinen Weg relativ zur Adresse.
- Eine App aus der Vorlage ruft ihre Wege jetzt relativ zu der Adresse auf, die das Gerät ihr in den Container legt. `ARASUL_API_URL` endet auf dem Vorsatz der äußeren Schnittstelle, und die Pfade der Endpunkte fangen damit an: wer beides aneinanderhängt, ruft ihn zweimal und bekommt einen 404. Welcher der beiden Wege gilt, entscheidet nicht die Vorlage, sondern der Kontrakt: das Kit schreibt beides in die `arasul.json` neben dem Backend.
- Der Spiegel des Designsystems entsteht aus dem Paket des Produkts. `marken.json` nennt Fassung, vierzehn Abhängigkeiten und einundsiebzig Dateien mit ihrem sha256; in die Vorlage gehen davon siebzig, alle drei Sätze samt `primitive/` und `muster/`. Bis 0.17.0 las das Kit einen flachen Ordner und nahm mit, was oben lag: sechs Bausteine, und die `index.ts` darin zeigte auf zwei Ordner, die es im Spiegel nicht gab.
- Der Wächter stellt eine vierte Frage: hat die App, was die Bibliothek braucht. Die Bibliothek wird mit der App übersetzt, also muss deren `package.json` die vierzehn Pakete führen; ohne diese Frage fällt der Bau erst an dem Import, der ins Leere zeigt, und die Meldung nennt dann ein Primitiv und nicht das fehlende Paket. Die Frage nach der Vollständigkeit ist mitgewandert: statt „gibt `index.ts` jeden Baustein aus" heißt sie jetzt „führt von `index.ts` ein Weg zu jeder Datei", denn die Bibliothek hat drei Ebenen.
- Die Vorlage baut aus dem vollen Satz. Die Vorgangsliste ist das Muster `Datenliste` (sortieren, suchen, Leerzustand, und unter 900 Pixeln eine Kartenliste statt einer Tabelle), das Formular ist `Formularseite` mit `Feldgruppe`, und die Navigation ist das Muster `Seitenleiste`. Rund zweihundert Zeilen eigener Nachbau sind dafür weggefallen, dazu `rahmen/fenster.ts`: die eine Schwelle des Produkts steht in der Bibliothek.
- `design.css` gibt es nicht mehr. Die Werte des Geräts stehen seit H3 in der Bibliothek selbst (`theme.css`), und zwei Dateien, die dieselben Marken setzen, sind die zweite Wahrheit: die eine sagte, Hell sei die Vorgabe, die andere Schwarz. Die `stil.css` einer App lädt jetzt die vier Teile in der Reihenfolge, die das Paket nennt, mit den zwei Schichtangaben, die Bedingungen sind.
- Die Vorlage kennt zwei Themen statt drei, und Hell setzt nichts. Das ist der Vertrag des Geräts seit H1; die Vorlage hielt einen anderen und schrieb ihren Rückfall `black` an ihr eigenes `<html>`: in einer hellen Oberfläche stand damit ein schwarzer Rahmen. Gelesen wird jetzt am eigenen Dokument, in das die Shell hineinschreibt, dazu die Nachricht `arasul:theme`, die den Wert ausdrücklich nennt.
- Eine App sagt im Manifest, auf welcher Fassung des Designsystems sie steht (`marken`, Kontrakt 4). Geschrieben wird sie beim Anlegen und beim Nachziehen des Spiegels, also genau dann, wenn sie sich ändert.
- `secrets.mjs` sah bei `secrets_store: env` trotzdem im Schlüsselbund nach, wenn die `.env` den Namen nicht kannte. Auf einem Rechner, auf dem schon einmal ein anderer Klon gearbeitet hat, zeigte `--list` damit fremde Werte als hinterlegt an. Jetzt gilt der Speicher, der im Profil steht.
- Ein Gerät, auf dem Arasul schon lief, brauchte `tls: selfsigned` von Hand in der Akte, sonst brach jeder Aufruf über die Oberfläche am selbst ausgestellten Zertifikat ab. `/device` trägt es jetzt selbst ein, wenn es genau daran scheitert.
- Die Antwortdateien für `/init` nennen den Wertevorrat der Felder, die nur bestimmte Werte kennen. `first_device_state` war der Fund; genannt werden alle sieben.

## 0.17.0 (2026-08-29)

Kontrakt: bis 3

- Die Bibliothek des Geräts liegt jetzt in der App-Vorlage. Bis 0.16.0 brachte sie eine eigene `bausteine.tsx` mit: vier Bausteine, nachgebaut nach den Namen des Designsystems, mit einem Ablaufdatum im Kopf. Jetzt liegt der Spiegel von `packages/marken` darin, Datei für Datei: Kopf, Liste, Karte, Formular, Meldung und Menü, dazu `index.ts`, `fassung.ts` und `marken.css`. Wortgleich, denn ein Spiegel, an dem jemand den Kopf umschreibt, lässt sich nicht mehr gegen seine Quelle halten. Importiert wird über `@marken`, denselben Alias, unter dem die Oberfläche des Geräts die Bibliothek kennt: derselbe Quelltext läuft hier und dort.
- Neben dem Spiegel liegt `mirror.json` mit Fassung, Quelle, Datum und je Datei einem Hash, und darüber wacht `node .ara/tools/marken.mjs`. Er stellt drei Fragen: passt jede Datei zu ihrem Hash, steht der Spiegel auf der Fassung der Quelle, und ist er vollständig. `--sync` zieht die Apps nach, und zwar nur die: die Vorlage liegt in der Versionsverwaltung, und ein Werkzeug, das sie im Klon eines Partners änderte, hinterließe einen schmutzigen Arbeitsordner. `/init` fragt den Wächter, seit diesem Stand als eigener Schritt. Die Quelle ist der Spiegel des Produkts; solange der `packages/marken` nicht mitbringt, tritt die Vorlage des Kits an seine Stelle, denn sie ist das, was `--new` hingelegt hätte. Ihre eigene Quelle ist die Vorlage nie.
- Die Vorlage benutzt alle sechs Bausteine. Die Vorgangsliste ist eine Datenliste aus `Liste` und `ListenEintrag`, der ausgewählte Vorgang steht als `Karte` darunter, und welcher das ist, steht in der Suchanfrage statt im Zustand der Seite. Dazu eine Seitenleiste mit den Ansichten und Wegen: über 900 Pixeln eine Spalte, darunter derselbe Inhalt im `Menue` über der Seite.
- Neu im Wissen: `.ara/knowledge/design-system.md`. Welche sechs Bausteine es gibt und was an jedem wichtig ist, wie eine Seite aus ihnen entsteht, und was verboten ist: keine eigene Farbe, kein eigener Baustein neben einem vorhandenen, nichts im Spiegel ändern, keine zweite Schwelle. Dazu eine Tabelle, was jeder Befund des Wächters heißt.
- Ein Klon, der seine eigene Arbeit versioniert, war nicht vorgesehen. Das Kit fragte an vier Stellen "verfolgt git diese Datei" und meinte "kam sie mit dem Kit". Für einen Partnerklon ist das dasselbe, für einen Betrieb, der seine eigenen Geräte und Apps führt, nicht: drei Prüfungen des Selbsttests fielen, und `--plan-aktiv` verweigerte mitten in der Arbeit. Das neue Feld `versioned:` im Profil nennt die Ordner, die diesem Klon gehören, und trennt die beiden Fragen. Leer heißt weiter: keiner, und dann ist alles wie vorher.
- Ohne Spiegel sagte niemand, wie man an einen kommt. Der Satz zum Verifikationsstand und der Kopf der erzeugten `design.css` nennen jetzt `node .ara/tools/mirror.mjs --refresh`.
- Der Kit-Schlüssel hieß im Unternehmens-Zweig am Gerät "Ara-Kit Partner": `business/company.md` gibt es dort nicht, und der Ausdruck fiel auf seinen letzten Zweig zurück. Der Name kommt jetzt aus dem Profil, wenn es keinen Firmenkopf gibt, und ohne jede Angabe heißt der Schlüssel "Ara-Kit" statt etwas Erfundenes.
- `start_password_ref` stand nur nach einer Installation in der Akte. Ein Gerät, auf dem Arasul schon lief, bekam es nie, obwohl `--admin-login` sich mit genau diesem Eintrag anmeldete. Liegt der Eintrag in der Ablage, steht der Name jetzt in der Akte.
- `/init` zählte im Unternehmens-Zweig `invoice` und `invoice_tool` als Lücke, obwohl es sie selbst leert, und der Weg über die Antwortdatei sagte "Es fehlt nichts", obwohl Felder leer blieben. Beides steht jetzt richtig da: die Felder des anderen Zweigs zählen nicht mit, und der Lauf mit `--answers` endet mit derselben Zeile wie `--show`.

## 0.16.0 (2026-08-29)

Kontrakt: bis 3

- Die Vorlage einer App steht jetzt auf demselben Stapel wie die Oberfläche des Geräts: Vite, React 19, TypeScript, Tailwind 4, `react-router`, TanStack Query. Bisher war es React aus einem Skript-Tag mit handgeschriebenem CSS, und ein Partner, der die Oberfläche von Arasul gesehen hatte, fand darin nichts wieder. `npm run build` lässt `tsc --noEmit` vor dem Bündler laufen, ein Typfehler hält also den Bau an, statt am Gerät als leere Seite anzukommen.
- Die Vorlage kennt ihren eigenen Pfad nicht und darf ihn nicht kennen. Ein Gerät liefert eine App live unter `/apps/<kennung>/` aus und im Teststand unter `/apps/<kennung>/test/`, also bekommt `react-router` seine Basis zur Laufzeit aus der Adresse des Dokuments, und die Bündel bleiben relativ verwiesen. Ein absoluter Bau zeigte aus dem Teststand auf den Livestand, und niemand sähe es der Seite an. Daraus folgt, dass die Wege eine Ebene tief bleiben; das steht im Kopf von `rahmen/basis.ts` und in der README der App.
- Wer angemeldet ist, liest die App jetzt aus `api/me` und hält es als Kontext mit der Rolle. Dieser Weg gehört der Plattform und steht in ihrem Kontrakt, damit auch eine App ohne Backend ihren Benutzer anzeigen kann. Das Backend der Vorlage gibt den Angemeldeten in seiner eigenen Lage-Auskunft nicht mehr zurück: zwei Quellen für dieselbe Sache waren eine zu viel.
- Das Thema kommt vom Gerät. Die App liest `data-theme` am Elternfenster und hört auf Änderungen, wer in Arasul umschaltet, sieht die App also mitgehen; ohne Rahmen gilt die Einstellung des Betriebssystems. `design.css` trägt darum jetzt einen Block je Thema statt nur einer Medienabfrage, und die Werte aller drei kommen aus dem Spiegel. Daneben liegt `marken.css`, gespiegelt aus dem Designsystem des Produkts: sie wird ersetzt und nicht fortgeschrieben, eigene Regeln gehören ans Ende von `stil.css`.
- Das Backend der Vorlage folgt dem Port-Muster. `server.mjs` macht HTTP, `kern/vorgaenge.mjs` macht die Fälle und kennt zwei Anschlüsse und die Welt sonst nicht, eine Ablage und ein Gerät. Je Entität eine Ablage, und in ihr das einzige SQL dazu. Die Ablage ist SQLite aus Node selbst, ohne ein Paket daneben, ihr Stand steht in `pragma user_version` und je Migration eine Datei; eine, die gelaufen ist, läuft nicht noch einmal. Was darin liegt, überlebt einen Neustart des Containers und nicht das nächste Einspielen, weil ein Gerät einer App keinen eigenen Datenordner gibt, und das steht in der README der App.
- `--check` prüft jetzt auch den Bau. Ins Paket geht das Ergebnis von `npm run build` und nicht der Ordner davor; das steht als Regel im Kontrakt jedes Geräts und wurde von niemandem geprüft. Liegen im Frontend des Pakets noch `package.json`, `src/` oder eine `tsconfig.json`, hält das Werkzeug vor dem Gerät an: eingespielt bekäme der Browser eine `index.html`, die auf `/src/main.tsx` zeigt, und der Mensch im Rahmen sähe eine leere Seite ohne einen Hinweis darauf, woran es liegt.
- Platzhalter wurden in neun Dateiarten ersetzt und in `.ts` und `.tsx` nicht. Jede App aus der Vorlage hätte `{{name}}` in ihrer Oberfläche getragen. Jetzt stehen sie mit in der Liste.
- Was der Browser hinterlässt, `.playwright-mcp/`, ist aus der Versionsverwaltung heraus. Der Ordner entsteht, sobald Ara den Browser benutzt, und ohne diese Zeile war der Arbeitsordner jedes Kit-Repositories danach schmutzig.

## 0.15.0 (2026-08-29)

Kontrakt: bis 3

- Eine App aus der Vorlage startete keinen Lauf. Gemessen am 29.08.2026 gegen ein gespieltes Gerät, das seine Werte in seinem Kontrakt nennt: der POST auf die Vorgangsroute der App antwortete 201, `vorgang.lauf` stand auf `null`, der Vorgang auf "ohne entscheidung" mit dem Satz "Dieses Gerät hat der App keine Schnittstelle gegeben", und das Gerät hatte in der ganzen Zeit keinen einzigen Aufruf gehört. Der Freigabe-Schritt wurde nicht abgelehnt, er wurde übersprungen, und weil der Vorgang dabei aussah wie einer ohne Arasul, hat drei Erklärungen lang niemand an der richtigen Stelle gesucht.
- Die Ursache stand im Backend der Vorlage: sechs Werte, die zwischen Kit und Produkt vereinbart sind, standen dort aus dem Kopf. `ARASUL_API_URL` und `ARASUL_API_SCHLUESSEL` als Namen der beiden Werte, die das Gerät in den Container legt, `x-api-key` als Kopfzeile des Schlüssels, drei Pfade ohne den Vorsatz der äußeren Schnittstelle. Keiner davon steht im Kontrakt, keiner im Spiegel. Findet die App die beiden Namen nicht, bleiben Adresse und Schlüssel leer, sie ruft gar nicht erst an und hält das Ergebnis für ein Gerät ohne Arasul.
- Die Vorlage kennt jetzt keinen dieser Werte mehr. Das Kit liest sie beim Einspielen aus dem Kontrakt des einen Geräts und legt sie als `backend/arasul.json` ins Paket: die Namen der beiden Umgebungswerte, die Kopfzeile des Schlüssels und die drei Wege, jeder erst, nachdem das Gerät ihn in seinen Endpunkten selbst nennt. `--check` gibt das vorher aus und zählt auf, was dieses Gerät nicht verspricht. Im Klon liegt die Datei leer, und sie geht mit ins Image, sonst sähe der Container sie nicht.
- Kein stilles `null` mehr. Bleibt ein Vorgang ohne Lauf, steht der Grund an ihm, und "ohne Arasul" steht nur da, wenn das Gerät der App wirklich nichts gegeben hat. Ein leerer Umgebungswert, ein Weg, den der Kontrakt nicht führt, ein Status, den das Gerät zurückgibt, eine Antwort ohne Nummer: jeder Fall bekommt seinen eigenen Satz, am Vorgang, in der Lage-Auskunft der App und einmal im Protokoll des Containers beim Start.
- Die Vorlage legt sich auch nicht mehr auf eine Antwortform fest. Angenommen wird jede Antwort der 2xx-Klasse statt genau 202, die Nummer des Laufs wird gelesen, ob sie nackt oder in einem Umschlag steht, und die Freigabe zu einem Lauf sucht die App in der Liste ihrer eigenen Freigaben statt über einen Frageparameter, den kein Kontrakt nennt.
- Der Selbsttest hat den Fehler mitgetragen. Das gespielte Gerät antwortete genau das, was die Vorlage riet: dieselben Namen, dieselbe Kopfzeile, dieselben Pfade, 202 und die Nummer ohne Umschlag. Bewiesen war damit, dass die Vorlage mit sich selbst einig ist. Es vergibt jetzt eigene Namen, eine eigene Kopfzeile, legt seine Wege unter den Vorsatz der äußeren Schnittstelle und antwortet 200 mit Umschlag; dazu kommen drei Prüfungen: dass im Quelltext der Vorlage keiner dieser Werte mehr steht, dass die Vereinbarung im Paket ankommt, und dass ein stehender Rahmen ohne Lauf nicht als "ohne Arasul" durchgeht.

## 0.14.6 (2026-08-29)

Kontrakt: bis 3

- Ein frischer Klon von GitHub fiel im eigenen Selbsttest durch. Gemessen am 29.08.2026 um 01:05: `git clone`, dann `node .ara/tools/selftest.mjs`, und der erste Befehl, den ein Fremder ausführt, sagte "Das Kit ist in diesem Zustand nicht verlässlich". Zwei Prüfungen waren rot, beide, weil der Selbsttest sich ein Kalenderdatum aus `toISOString()` schnitt, und das rechnet in UTC. In Mitteleuropa ist es zwischen 22 Uhr und Mitternacht dort noch der Vortag: eine Wartung, die "in zehn Tagen" angelegt wurde, kam als neun zurück, und die Leistungsbeschreibung suchte ihr Papier unter dem Datum von gestern. Im Worktree lief derselbe Stand grün, weil dort niemand nachts gemessen hat.
- Ein Datum im Kit ist jetzt der Tag, den der Mensch vor dem Rechner sieht. `day(offset)` in `.ara/tools/lib/kit.mjs` ist die eine Stelle, an der ein Datum entsteht, `today()` ist `day(0)`, und beide rechnen vor Ort. Der Schritt über die Bestandteile statt über Millisekunden hält auch an den Tagen der Zeitumstellung, an denen ein Tag keine 24 Stunden hat.
- `addDays` in der Rechnung und die Bauzeit einer App gingen denselben Weg über UTC. Beide rechnen jetzt vor Ort, wie jedes andere Datum im Kit.
- Zwei Prüfungen dagegen, dass es wiederkommt. Die eine nagelt die Daten an festen Zeitpunkten fest, darunter der gemessene Fehlschlag selbst, damit sie nicht davon abhängt, wann der Selbsttest läuft. Die andere baut in einem Wegwerfordner einen blanken Klon nach, nur was in der Versionsverwaltung liegt, ohne Profil, Spiegel und Geräteakte, und lässt dort den ganzen Selbsttest laufen.

## 0.14.5 (2026-08-28)

Kontrakt: bis 3

- Eine wegen zu vieler Versuche abgewiesene Anmeldung (429) las sich, als stimmten die Feldnamen nicht. Das Gerät zählt die Anmeldungen, zehn je fünfzehn Minuten, und jeder Lauf von `check-docs.mjs` klopft dort ebenfalls einmal an. Sie bekommt jetzt eine eigene Antwort: warten, dann derselbe Aufruf noch einmal.
- Die Route des Portals stand in `device.md` ohne ihren Rechnernamen da, als `GET /api/download`. Der Dokumentations-Selbsttest hielt sie deshalb gegen das Gerät, wo es sie nicht gibt, und meldete das Wissen des Kits als falsch. Sie nennt jetzt ihren Rechnernamen, und alle 20 Routen des Wissens gibt es an einem Gerät mit 0.3.0.

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

- Das Startpasswort des Administrators kommt aus dem Kit wieder heraus, ohne sichtbar zu werden. `node .ara/tools/device.mjs --name <geraet> --admin-login` meldet sich am Gerät an und gibt die Sitzung aus, `--token` gibt nur den Ausweis. Weg und Benutzername kommen aus `arasul-release.json`, wenn das Artefakt sie nennt, sonst aus `--login-path` und `--login-user`, und das Werkzeug sagt jedes Mal, woher es sie hat. Der Weg geht an der Schnittstelle entlang und nicht über SSH, er kommt darum ohne Anmeldenamen und Schlüssel aus und nimmt die Adresse aus `address` oder `api_base`.
- `secrets.mjs --show` zählt jeden Namen auf, den das Kit vergibt, nicht nur die Kit-Schlüssel. Das Startpasswort lag vorher unter `ARASUL_START_<geraet>` da, und dieses Blatt nannte den Namen nicht.
- Die Ausgabe des Installers wird mitgelesen statt durchgereicht, und dabei maskiert: Kit-Schlüssel und Startpasswort gehen nicht mehr im Klartext über den Bildschirm. Der Satz "Klartext wird nicht angezeigt" stimmt jetzt wieder.
- Neu am Ende von `/device`: **Was der Installer nicht konnte.** Seine Absagen, etwa eine fehlgeschlagene SSH-Härtung oder ein Firewall-Setup ohne Root-Rechte, stehen danach beisammen und in der Akte, statt in mehreren hundert Zeilen unterzugehen.
- Nach einer eigenen Installation trägt die Akte `tls: selfsigned`. Das Gerät stellt sein Zertifikat aus einer eigenen Geräte-CA aus, und der erste Aufruf gegen die Schnittstelle scheiterte sonst an `SELF_SIGNED_CERT_IN_CHAIN`.
- Die Fassung des Artefakts liest das Kit aus `arasul-release.json`, wenn keine Datei `VERSION` dabei ist. Spiegel, Geräteakte und der Ordnername am Gerät sagten sonst "unbekannt", obwohl die Zahl danebenlag.
- `/app` weiß ohne `--device`, was es selbst an ein Gerät geschickt hat: welche Fassung im Teststand steht und welche live ist, je App und Gerät. Ist die gebaute Fassung live, wird nicht wieder `--check` und `--deploy` vorgeschlagen, sondern der Plan und die README.
- Der Plan der Referenz-App lässt sich nicht mehr verschieben: `--plan-aktiv` und `--plan-erledigt` verweigern jeden Plan, der in der Versionsverwaltung liegt. Der Spiegel behält beim Auspacken seinen `.gitkeep`. Beides machte den frischen Klon schmutzig.

## 0.9.0 (2026-08-28)

Kontrakt: bis 3

- Der Installer wird so gerufen, wie das Artefakt es sagt: der Einstiegspunkt kommt aus `arasul-release.json`, nicht aus dem Gedächtnis des Kits, und er bekommt Startpasswort und Netzname mit. Nur dabei entstehen am Gerät Netzname, Fassung, Startpasswort und die Erstausgabe. Nennt das Artefakt keinen Einstiegspunkt, hält das Kit an, statt zu raten.
- Das Startpasswort würfelt das Kit und legt es in die Geheimnis-Ablage. Die Geräteakte trägt nur den Namen des Eintrags, in `start_password_ref`, und den Netznamen in `net_name`.
- Das Artefakt wird nach `$HOME/arasul-<fassung>` geschoben und nicht mehr nach `$HOME/arasul`. Das Kit fand sonst beim nächsten Lauf sein eigenes Paket und hielt es für eine Installation.
- Die Spurensuche unterscheidet drei Lagen statt zwei: die Plattform läuft, es liegen nur Reste da, oder da ist nichts. Über Reste hinweg wird nur mit `--despite-traces` installiert, und das gehört vorher bestätigt.
- Überall, wo das Kit packt oder auspackt, bleiben die `._`-Beiwerkdateien von macOS draußen. 1124 davon gingen mit einem Artefakt an ein Gerät, und Traefik stieg an einer davon aus.
- `secrets.mjs --set` nimmt den Wert von der Standardeingabe, wenn kein Terminal dranhängt. Ohne das blieb ein Token in einer nicht-interaktiven Sitzung auf "fehlt".
- Jedes Werkzeug beantwortet `--help` mit seiner Kopfhilfe und tut sonst nichts. Vorher führte `device.mjs --help` eine Geräteprüfung aus und `mirror.mjs --help` lud den Spiegel.
- Neu: `node .ara/tools/mirror.mjs --docs` zeigt, welche Anleitungen mit dem Artefakt kamen. Das Wissen zu `/device` und `/maintain` nennt darüber den Weg zum ersten Mitarbeiter und zur ersten Freigabe, auch ohne Browser.
- `.env.example` schickt niemanden mehr zu `/start`. Den Befehl gibt es seit E1 nicht mehr.

## 0.8.0 (2026-08-27)

Kontrakt: bis 3

- Neuer Befehl `/invoice`, nur im Partnerzweig und nur mit `invoice: yes` im Profil: die Rechnung entsteht aus dem Angebot der Kundenakte, bekommt ihre Nummer aus dem Nummernkreis und wird als ZUGFeRD-PDF gedruckt. Im PDF steckt die Rechnung noch einmal als `factur-x.xml` nach EN 16931, damit die Buchhaltung des Kunden sie einliest, statt sie abzutippen.
- Die Pflichtangaben nach § 14 Abs. 4 UStG sind eine Prüfliste, die vor dem Druck rot wird. Fehlt eine, wird nicht gedruckt: eine unvollständige Rechnung berechtigt den Kunden nicht zum Vorsteuerabzug, und das fällt bei ihm auf.
- Der Nummernkreis liegt in `business/invoices.md` und gehört dem Partner. Fortlaufend je Jahr, ohne Lücke, ohne Zurückdrehen. Eine verworfene Rechnung wird storniert, nicht gelöscht, und ihre Nummer bleibt vergeben.
- Ein Beleg, eine Wahrheit: die Zahlen im XML kommen aus derselben Tabelle, die gedruckt wird. Geprüft wird das Ergebnis gegen die Geschäftsregeln der EN 16931, und der Selbsttest sagt dazu, was ungeprüft bleibt.
- Die Kundenakte führt jetzt die Anschrift in `street`, `postcode` und `city`, dazu `country` und `vat_id`. Eine Rechnung braucht sie einzeln, ein Angebot ohnehin.
- `pdf.mjs` druckt kein Frontmatter mehr. Ein Beleg trägt seine maschinenlesbaren Felder im Kopf, und die sind keine Zeile für den Kunden.

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
