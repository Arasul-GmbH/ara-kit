# Verfahren: /init

> **Wann brauchst du das?** Bei `/init`. Fehlt `business/profile.md`, ist es das erste
> Mal, und es gilt der lange Teil: das Onboarding in zehn Runden. Existiert die Datei,
> gilt der kurze Teil am Ende: Kit nachziehen, Befehle anbieten, Profil ergänzen.
>
> **Wissen dazu:** `.ara/knowledge/security.md` für die drei Stufen in Runde 5,
> `.ara/knowledge/browser.md` für Runde 8. Sonst nichts, der Rest steht hier.

## Das erste Mal

### Ziel

Nach `/init` gilt: Das Kit weiß, wer damit arbeitet, was er kann, womit sein Haus
arbeitet und was er vorhat. Der Rechner kann, was er können muss. Die Befehle für seinen
Zweig liegen bereit. Es gibt einen konkreten nächsten Schritt.

Das Profil ist der Kontext, den jeder andere Befehl liest. Was hier steht, muss später nie
wieder gefragt werden. Rechne mit einer knappen halben Stunde.

**Kein Token, kein Konto.** Das Onboarding braucht kein Token und kein Portal. Danach
gefragt wird erst, wenn auf einem Gerät Arasul installiert wird, siehe
`.ara/knowledge/device.md`. Wer schon eines hat, kann es mit
`node .ara/tools/secrets.mjs --set ARASUL_TOKEN` hinterlegen, das ist keine Runde hier.

### Drei Regeln, die dieses Verfahren tragen

**1. Schreib die Dateien in `business/` an den Menschen, nicht über ihn.**
Sie gehören ihm. Also „Du willst kurz gehalten werden", nicht „Kolja will kurz gehalten
werden" oder „er kann im Laufzettel nachlesen". Notizen über den Menschen in der dritten
Person sind ein Fehler, auch wenn sie stimmen.

**2. Lass nichts stillschweigend durchrutschen.**
Wenn jemand eine Runde überspringt, ist das in Ordnung, aber es wird am Ende benannt,
mit der Folge: „Ohne Stundensatz kann ich nichts kalkulieren." Ein Kit, das halb
eingerichtet ist und so tut, als wäre alles fertig, fällt beim ersten Kundengespräch auf.

**3. Jede Runde ist eine gebündelte Frage im Interview-Werkzeug.** Mit einer offenen
Möglichkeit je Frage. Was der Mensch dort frei schreibt, gilt.

### Der zweite Weg: die Antwortdatei

Wer nicht klicken will, füllt eine Antwortdatei und übergibt sie: `/init <datei>`. Dann
gibt es kein Interview, und du rufst auf:

```
node .ara/tools/init.mjs --answers <datei>
```

Das Werkzeug schreibt `business/profile.md`, für Partner `business/company.md`, trägt den
Technikstand ein und legt die Befehle an. Beispiele mit allen Feldern, in beiden Zweigen:
`.ara/templates/init-answers-partner.json` und `.ara/templates/init-answers-company.json`.
Was das Werkzeug nicht kann, sagt es am Ende: Geheimnisablage, SSH-Schlüssel, Sicherung
bleiben Handarbeit. Danach weiter bei Runde 10, der Abschluss gilt auch hier.

### Vorher

Existiert `business/profile.md` schon, ist das Onboarding gelaufen. Dann gilt der Teil
„Jedes weitere Mal" unten. `node .ara/tools/init.mjs --show` sagt in drei Zeilen, was
hinterlegt ist und was fehlt.

### Runde 1: Technikcheck, ohne zu fragen

```
node .ara/tools/check-environment.mjs
```

Meldet Betriebssystem, Node, git, ssh, vorhandene SSH-Schlüssel, freien Speicher und ob
der Rechner zum Flashen eingebetteter Geräte taugt.

Sag in zwei bis drei Zeilen, was das bedeutet. Behebe still, was du beheben darfst. Fehlt
etwas Grundlegendes, nenne den Installationsweg für das erkannte System und mach weiter.

Merk dir das Ergebnis, es kommt in Runde 10 in `business/profile.md`.

### Runde 2: Die Weiche

Eine Frage, und sie entscheidet, wie das Kit aussieht:

**Partner oder Unternehmen?** Ein Partner richtet Geräte für fremde Kunden ein, mehrere.
Ein Unternehmen betreibt ein eigenes Gerät für die eigene Firma. Sag zu jeder Option in
einem Satz, was sie bedeutet: Partner bekommen Kundenakten, Angebote und Kalkulation dazu.
Unternehmen bekommen nur, was ein eigenes Gerät braucht, und werden nie nach Kunden
gefragt.

Sobald die Weiche beantwortet ist, legst du die Befehle an, damit alles Weitere in dieser
Sitzung schon funktioniert:

```
node .ara/tools/commands.mjs --apply --role <partner|company>
```

Partner bekommen `alle/` und `partner/` aus `.ara/commands/`, Unternehmen nur `alle/`.
Erkennt Claude Code einen Befehl noch nicht, hilft ein Neustart der Sitzung.

### Runde 3: Wer du bist und was du kannst

Gebündelt:

1. **Name** und wie du ihn ansprechen sollst (Vorname? Nachname? Etwas anderes?).
2. **Firma und Region.**
3. **Stärken**, Mehrfachauswahl: Softwareentwicklung, Administration, Fachseite (du kennst
   die Abläufe im Haus), Vertrieb. Danach richtet sich, wie viel jeder Befehl erklärt: wer
   Container baut, braucht keine Erklärung, was ein Container ist. Wer die Fachseite
   kennt, bekommt bei einer App die Fachfragen zuerst.

Ab jetzt sprichst du ihn so an, wie er es gesagt hat. Ins Frontmatter kommen `skills` als
Liste (`development, administration, domain, sales`), die Prosa in den Abschnitt „Wer ich
bin und was ich kann".

### Runde 4: Womit dein Haus arbeitet

Für ein Unternehmen ist das die Liste dessen, woran Apps später andocken. Für einen
Partner ist es der Stack, den er bei Kunden kennt. Frag je Bereich, was heute im Einsatz
ist, und lass Freitext zu:

- Buchhaltung und Rechnung
- CRM oder Kundenliste
- Ticket oder Aufgaben
- Dateiablage
- Kommunikation (Mail, Chat)
- ERP oder Branchensoftware

**Nur Partner, in derselben Runde:** Mit welchem Werkzeug schreibst du Rechnungen, und
soll das Kit Rechnungen erzeugen können? Drei Antworten: ja, nein, später. Bei nein und
später bleibt der Rechnungsbefehl weg, bei später fragt das nächste `/init` noch einmal.
Dazu ein Satz zur E-Rechnungspflicht: Empfang beim Kunden ist seit 2025 Pflicht, die
Ausgabe kommt stufenweise ab 2027. Ins Frontmatter: `invoice` und `invoice_tool`.

Antworten nach `tools` im Frontmatter (kommagetrennt) und in Prosa nach „Womit mein
Haus arbeitet".

### Runde 5: Wie du arbeitest

1. **Erfahrung:** Linux-Server aufgesetzt, mit SSH gearbeitet, Hardware beim Kunden
   installiert? Ehrliche Antwort hilft, es geht nicht um Bewertung.
2. **Erklärtiefe:** wenig, mittel oder viel. Steuert deinen Ton ab jetzt.
3. **Sicherheitsstufe:** Erklär die drei Stufen in vier Zeilen
   (`.ara/knowledge/security.md`) und lass den Standard bestätigen. Wer lockern will, kann
   das, dann hältst du fest, **was genau** gelockert wurde und seit wann.

### Runde 6: Was du vorhast

Diese Runde ist der Grund, warum das Kit später brauchbare Vorschläge macht. Die Fragen
hängen an der Weiche:

**Partner:**

1. Haupt- oder Nebengeschäft? Jemand mit zwei Kunden nebenher braucht etwas anderes als
   jemand, der davon lebt.
2. Wie viele Kunden schweben dir vor, in welchem Zeitraum?
3. Welche Branchen hast du im Blick oder betreust du schon?
4. Was ist dein Engpass: Kunden finden, Technik, Zeit?

**Unternehmen:**

1. Wofür soll das Gerät da sein: Suche in den eigenen Unterlagen, Abläufe im Haus,
   Assistenz für einzelne Abteilungen?
2. Wer soll es nutzen, welche Abteilungen zuerst?
3. Was ist dein Engpass: Zeit, Wissen über Linux, Rückhalt im Haus?

Antworten in Prosa nach „Was ich vorhabe". Nicht als Stichpunktliste der Fragen, sondern
als zusammenhängender Absatz in Du-Form.

### Runde 7: Geschäftliches

Nur in der Partner-Rolle. Im Unternehmens-Modus überspringen, ohne es zu erwähnen.

Firmierung, Anschrift, Telefon, Mail, Website, Steuernummer, USt-IdNr., Bankverbindung,
Logo-Pfad, Stundensatz, Aufschlag auf Hardware, Zahlungsziel. Nach `business/company.md`.

**Sag vorher, wozu das dient**, sonst wirkt es wie ein Formular:

> Das brauche ich, um dir Angebote zu rechnen und zu schreiben. Ohne Stundensatz kann ich
> nichts kalkulieren, ohne Anschrift kein Angebot erzeugen. Was du jetzt nicht zur Hand
> hast, holen wir später nach.

**Die restlichen Preise werden hier nicht abgefragt.** Ein vollständiges Angebot braucht
zehn Zahlen, drei davon stehen jetzt da. Die anderen sieben, darunter die drei
Einkaufspreise, holt `/kalkulation`, und das aus einem Grund: die Einkaufspreise sind
Arasuls Zahlen, sie ändern sich, und in einem Onboarding, das genau einmal stattfindet,
würden sie still veralten. Sag das in einem Satz und nenne `/kalkulation` als nächsten
Schritt, wenn Angebote anstehen.

### Runde 8: Zugänge und Werkzeuge

1. **Wo sollen Geheimnisse liegen?** Zwei Möglichkeiten, kurz erklärt:
   - **`.env`-Datei im Kit**: sichtbar, einfach zu sichern, liegt im Kit-Ordner.
   - **Schlüsselbund des Betriebssystems**: verschlüsselt abgelegt, kann nicht
     versehentlich mitkopiert werden, dafür weniger greifbar.

   Prüf vorher mit `node .ara/tools/secrets.mjs --show`, ob der Schlüsselbund hier
   überhaupt nutzbar ist, und biete nur an, was geht. Ohne klare Präferenz: `.env`.
   Einstellen mit `node .ara/tools/secrets.mjs --store <env|keychain>`.

2. **SSH-Schlüssel.** Aus Runde 1 weißt du, welche existieren.
   - Keiner da: einen anlegen anbieten (Ed25519, mit Passphrase, bleibt in `~/.ssh`).
   - Mehrere da: **frag, welcher für Geräte gedacht ist**: such ihn nicht selbst aus.
     Ein Schlüssel, der schon woanders benutzt wird, ist eine bewusste Entscheidung.
   - Ins Profil kommt nur der **Name**, nie der Schlüssel selbst.

3. **Browser.** Das Kit bringt einen mit, damit du Weboberflächen selbst bedienen kannst:
   das Dashboard eines Geräts prüfen, den Chat mit einer echten Frage testen,
   Bildschirmfotos für die Abnahme machen. Er startet beim ersten Zugriff von selbst.
   Erklär das in zwei Sätzen und frag, ob es so recht ist. Wer es nicht will, sagt das
   einmal, `browser: no` im Profil, und du fragst nicht wieder.
   Verfahren: `.ara/knowledge/browser.md`

4. **GitHub.** Prüf mit `gh auth status`, ob die Kommandozeile angemeldet ist. Damit
   kannst du später die Sicherung anlegen, Erweiterungen versionieren und Rückmeldungen
   ans Kit schicken. Ist sie nicht angemeldet, nenn den Anmeldebefehl und lass ihn ihn
   selbst ausführen. Ohne GitHub geht alles andere trotzdem.

### Runde 9: Sicherung und erstes Gerät

1. **Sicherung.** `business/`, `customers/`, `devices/` und `apps/` liegen bewusst
   außerhalb des Kit-Repos, ein Update kann sie so nicht anfassen. Damit haben sie aber
   auch keine Historie. Frag, ob das Kit gesichert werden soll, und biete an, ein eigenes
   privates Repository dafür einzurichten. **Ein Repository, nicht mehrere.** Wenn ja: wo,
   GitHub oder woanders. Richte es ein und erklär in zwei Zeilen, wie gesichert wird.
   Ins Profil: `backup_repo`.

2. **Erstes Gerät.**
   - **Partner:** Richtest du dir ein eigenes Gerät ein, zum Vorführen oder Üben, oder
     fängst du direkt mit Kundengeräten an? Wenn ja: welches Modell, steht es schon da
     oder ist es bestellt? Ein eigenes Gerät bekommt seinen Ort unter `devices/<gerät>/`,
     nicht unter `customers/`: ein Scheinkunde dafür verfälscht jede Auswertung. Der
     Name ist hier meist das Modell, Kundengeräte heißen nach Standort
     (`.ara/knowledge/device.md`).
   - **Unternehmen:** Hier ist das eigene Gerät der Normalfall. Welches Modell, steht es
     schon da oder ist es bestellt?

   Steht das Gerät noch nicht da, leg jetzt nichts an. Ins Profil: `first_device` und
   `first_device_state` (`present`, `ordered`, `none`).

3. **Erste App**, ein Satz: was soll sie tun, für wen? Es muss nichts Fertiges sein,
   „Urlaubsantrag mit Freigabe durch den Meister" reicht. Damit hat der App-Befehl später
   einen Anfang. Wer noch keine Idee hat, sagt das, und es bleibt leer. Ins Profil:
   `first_app`.

### Runde 10: Profil schreiben, bestätigen, ehrlich abschließen

Jetzt `business/profile.md` aus `.ara/templates/profile.md` anlegen und füllen:
Frontmatter vollständig, Prosa-Abschnitte in **Du-Form an ihn gerichtet**, Technikstand
aus Runde 1 mit Datum. Partner dazu `business/company.md` aus `.ara/templates/company.md`.

Lies ihm die zwei bis drei wichtigsten Punkte vor („So arbeite ich ab jetzt mit dir") und
lass sie bestätigen. Was nicht stimmt, wird gleich korrigiert.

Dann `node .ara/tools/init.mjs --show`: das Werkzeug nennt, was fehlt und was deshalb
nicht geht. Was am Kalkulationsblatt fehlt, liest du mit `node .ara/tools/calculation.mjs`
ab, statt es aus dem Kopf aufzuzählen.

Zum Schluss, kurz und ohne Beschönigung:

- was eingerichtet ist (zwei Zeilen)
- **was fehlt und was deshalb nicht geht**: konkret, nicht „einiges fehlt noch"
- der nächste sinnvolle Schritt:
  - **Partner mit konkretem Kunden:** `/customer <name>`. Der beste Abschluss, er sieht
    sofort, wie sich das Kit anfühlt.
  - **Eigenes Gerät steht da:** `/device <gerät>`.
  - **Gerät bestellt:** sagen, was bis dahin vorbereitet werden kann.
  - **Nichts davon:** sagen, was als Nächstes sinnvoll wäre.

Beispiel:

> Eingerichtet: Profil, Sicherheitsstufe, SSH-Schlüssel, Befehle für den Partnerzweig.
> Es fehlen: Stundensatz (ohne ihn keine Kalkulation) und die Entscheidung zur Rechnung
> (solange offen, kein Rechnungsbefehl).
> Nächster Schritt: deinen ersten Kunden anlegen mit /customer.

Keine Zusammenfassung des ganzen Gesprächs. Keine Begeisterung.

## Jedes weitere Mal

`business/profile.md` existiert. Dann geht es nicht um den Menschen, sondern um den
Stand des Kits. Sechs Schritte, in dieser Reihenfolge:

1. **Sagen, worauf er sitzt.** `node .ara/tools/init.mjs --show` beginnt mit drei
   Angaben: der Stand aus `.ara/VERSION`, was in diesem Stand neu ist, und bis zu welcher
   Kontraktfassung dieses Kit mit einem Gerät zusammenarbeitet. Gib sie in zwei Sätzen
   weiter, bevor irgendetwas geholt wird. Die Verträglichkeit ist eine Aussage über das
   Kit, nicht über ein Gerät: welche Fassung ein Gerät führt, sagt sein Kontrakt.
2. **Nachsehen.** `node .ara/tools/update.mjs --check` holt den Stand aus dem Arasul-Repo
   und zeigt je Datei, was neu, geändert oder entfernt wäre. Es nennt dazu den Stand, auf
   den es ginge, und aus der Änderungsliste `.ara/CHANGELOG.md` jeden Punkt, der seit dem
   eigenen dazugekommen ist. Nichts Neues: eine Zeile, fertig. Das läuft auch in einem
   Fork ohne Upstream-Remote, die Quelle ist ein Archiv.
3. **Einspielen**, mit Bestätigung. `node .ara/tools/update.mjs` ersetzt `.ara/` und das
   Minimum von `.claude/` (`CLAUDE.md`, `settings.json`, `skills/`, `commands/init.md`).
   `business/`, `customers/`, `devices/`, `apps/`, der Spiegel, der Merker
   `.ara/state.json` und die erzeugten Befehle bleiben, wie sie sind. Wer das Kit mit git
   führt, sieht die Änderung danach in `git status` und committet sie.
4. **Befehle nachziehen.** `node .ara/tools/commands.mjs` zeigt für den Zweig aus dem
   Profil je Befehl einen von fünf Zuständen. Das Werkzeug merkt sich beim Anlegen den
   Hash der Quelle und weiß darum, wer geändert hat:

   | Zustand | Was es heißt | Was du tust |
   |---|---|---|
   | fehlt | neu im Kit oder nie angelegt | anbieten, mit `--apply` anlegen |
   | neu im Kit | Quelle geändert, Kopie unberührt | Unterschied zeigen, mit `--apply` ersetzen |
   | angepasst | der Mensch hat die Kopie selbst geändert | bleibt liegen, nur auf Wunsch `--replace <name>` |
   | beides | Kit neuer **und** selbst geändert | Unterschied zeigen, er entscheidet, `--replace <name>` |
   | unklar | Kopie aus der Zeit vor dem Merker | wie „neu im Kit", vorher vergleichen |
   | abgelöst | im Kit umbenannt, die alte Kopie liegt noch da | `--apply` räumt die unveränderte weg, eine angepasste bleibt |

   Vor jedem Ersetzen den Unterschied zeigen (`diff`). Was im Ziel liegt und nicht aus
   dem Kit stammt, bleibt liegen.

   **Ein abgelöster Befehl ist der einzige Fall, in dem das Werkzeug etwas löscht.**
   `/angebot` heißt seit Phase E6 `/offer`. Blieben beide liegen, führte der alte weiter
   durch ein Verfahren, das es nicht mehr gibt. Gelöscht wird nur die unveränderte Kopie,
   erkennbar am gemerkten Hash; eine, die der Mensch angefasst hat, wird genannt und bleibt.
   Sag ihm in dem Fall, wie der Befehl heute heißt, und dass er die alte selbst löschen darf.
5. **Profil ergänzen**, nur wo es Lücken hat. `node .ara/tools/init.mjs --show` nennt die
   leeren Felder. Braucht ein neuer Befehl eine Angabe, die im Profil fehlt, frag genau
   diese, gebündelt. Steht bei einem Partner `invoice: later`, frag noch einmal. Nicht das
   ganze Onboarding wiederholen.
6. **Nachweisen.** `node .ara/tools/selftest.mjs`. Erst wenn er durchläuft, ist der neue
   Stand auf diesem Rechner belegt. Ist ein Gerät mit Arasul erreichbar, gehört
   `node .ara/tools/check-docs.mjs --device <gerät>` dazu: es hält jede Route, die im
   Wissen steht, gegen den Kontrakt dieses Geräts. Ein neuer Stand des Kits an einem
   alten Gerät ist genau der Fall, in dem das auffallen soll.
