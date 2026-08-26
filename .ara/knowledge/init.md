# Verfahren: /init

> **Wann brauchst du das?** Bei `/init`. Fehlt `business/profile.md`, ist es das erste
> Mal, und es gilt der lange Teil unten: das Onboarding. Existiert die Datei, gilt der
> kurze Teil am Ende: Kit nachziehen, Befehle anbieten.

## Das erste Mal

### Ziel

Nach `/init` gilt: Das Kit weiß, wer damit arbeitet, wie er arbeitet und was er vorhat.
Der Rechner kann, was er können muss. Zugänge sind hinterlegt. Es gibt einen konkreten
nächsten Schritt.

Rechne mit einer knappen halben Stunde. Das ist gut investiert, alles, was hier hinterlegt wird,
muss später nie wieder gefragt werden.

### Zwei Regeln, die dieses Verfahren tragen

**1. Schreib die Dateien in `business/` an den Menschen, nicht über ihn.**
Sie gehören ihm. Also „Du willst kurz gehalten werden", nicht „Kolja will kurz gehalten
werden" oder „er kann im Laufzettel nachlesen". Notizen über den Menschen in der dritten
Person sind ein Fehler, auch wenn sie stimmen.

**2. Lass nichts stillschweigend durchrutschen.**
Wenn jemand eine Runde überspringt, ist das in Ordnung, aber es wird am Ende benannt,
mit der Folge: „Ohne Stundensatz kann ich nichts kalkulieren." Ein Kit, das halb
eingerichtet ist und so tut, als wäre alles fertig, fällt beim ersten Kundengespräch auf.

### Vorher

Existiert `business/profile.md` schon, ist das Onboarding gelaufen. Sag in drei Zeilen, was
hinterlegt ist und was fehlt, und frag, was geändert werden soll, statt alles neu zu
erfragen.

### Runde 1: Technikcheck, ohne zu fragen

```
node .ara/tools/check-environment.mjs
```

Meldet Betriebssystem, Node, git, ssh, vorhandene SSH-Schlüssel, freien Speicher und ob
der Rechner zum Flashen eingebetteter Geräte taugt (z. B. Jetson Thor; DGX Spark,
RTX-Workstation und x86-Server brauchen keinen Flash-Rechner).

Sag in zwei bis drei Zeilen, was das bedeutet. Behebe still, was du beheben darfst. Fehlt
etwas Grundlegendes, nenne den Installationsweg für das erkannte System und mach weiter.

Merk dir das Ergebnis, es kommt in Runde 10 in `business/profile.md`.

### Runde 2: Wer bist du

Eine Interview-Runde, Fragen gebündelt:

1. **Name** und wie du ihn ansprechen sollst (Vorname? Nachname? Etwas anderes?).
2. **Rolle:** Partner (richtet Geräte für Kunden ein) oder Unternehmen (betreibt ein
   eigenes Gerät)? Das entscheidet, wie das Kit aussieht.
3. **Firma und Region.**

Ab jetzt sprichst du ihn so an, wie er es gesagt hat.

Die Weiche ist beantwortet, also legst du jetzt die Befehle an, damit alles Weitere
in dieser Sitzung schon funktioniert:

```
node .ara/tools/commands.mjs --apply --role <partner|company>
```

Partner bekommen `alle/` und `partner/` aus `.ara/commands/`, Unternehmen nur `alle/`.
Erkennt Claude Code einen Befehl noch nicht, hilft ein Neustart der Sitzung.

### Runde 3: Wie du arbeitest

1. **Erfahrung:** Linux-Server aufgesetzt, mit SSH gearbeitet, Hardware beim Kunden
   installiert? Ehrliche Antwort hilft, es geht nicht um Bewertung.
2. **Erklärtiefe:** wenig, mittel oder viel. Steuert deinen Ton ab jetzt.
3. **Sicherheitsstufe:** Erklär die drei Stufen in vier Zeilen
   (`.ara/knowledge/security.md`) und lass den Standard bestätigen. Wer lockern will, kann
   das, dann hältst du fest, **was genau** gelockert wurde und seit wann.

### Runde 4: Was du vorhast

Diese Runde ist der Grund, warum das Kit später brauchbare Vorschläge macht:

1. **Haupt- oder Nebengeschäft?** Jemand mit zwei Kunden nebenher braucht etwas anderes
   als jemand, der davon lebt.
2. **Wie viele Kunden schweben dir vor**, in welchem Zeitraum?
3. **Welche Branchen** hast du im Blick oder betreust du schon? Kanzleien und Praxen haben
   besondere Anforderungen, Handwerk und Fertigung andere.
4. **Was ist dein Engpass**: Kunden finden, Technik, Zeit?

Antworten in Prosa nach `business/profile.md`, Abschnitt „Was ich vorhabe". Nicht als
Stichpunktliste der Fragen, sondern als zusammenhängender Absatz in Du-Form.

### Runde 5: Geschäftliches

Nur in der Partner-Rolle. Im Unternehmens-Modus überspringen.

Stundensatz, Aufschlag auf Hardware, Zahlungsziel, Firmierung, Anschrift, Steuernummer,
Bankverbindung, Logo-Pfad. Nach `business/company.md`.

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

Was fehlt, kommt in die Abschlussliste in Runde 11.

### Runde 6: Zugänge

1. **Wo sollen Geheimnisse liegen?** Zwei Möglichkeiten, kurz erklärt:
   - **`.env`-Datei im Kit**: sichtbar, einfach zu sichern, liegt im Kit-Ordner.
   - **Schlüsselbund des Betriebssystems**: verschlüsselt abgelegt, kann nicht
     versehentlich mitkopiert werden, dafür weniger greifbar.

   Prüf vorher mit `node .ara/tools/secrets.mjs --show`, ob der Schlüsselbund hier
   überhaupt nutzbar ist, und biete nur an, was geht. Ohne klare Präferenz: `.env`.
   Einstellen mit `node .ara/tools/secrets.mjs --store <env|keychain>`.

2. **Lizenztoken hinterlegen.**
   `node .ara/tools/secrets.mjs --set ARASUL_TOKEN` fragt den Wert ab, ohne ihn
   anzuzeigen. **Lass ihn den Wert selbst eingeben**: diktiert er ihn dir, steht er im
   Gesprächsprotokoll.
   Danach `node .ara/tools/mirror.mjs`: das ist zugleich die Probe, ob der Token gilt.
   Kein Token zur Hand? In Ordnung, vermerken und weiter.

3. **SSH-Schlüssel.** Aus Runde 1 weißt du, welche existieren.
   - Keiner da: einen anlegen anbieten (Ed25519, mit Passphrase, bleibt in `~/.ssh`).
   - Mehrere da: **frag, welcher für Kundengeräte gedacht ist**: such ihn nicht selbst
     aus. Ein Schlüssel, der schon woanders benutzt wird, ist eine bewusste Entscheidung.
   - Ins Profil kommt nur der **Name**, nie der Schlüssel selbst.

### Runde 7: Werkzeuge

Zwei Dinge, die deine Arbeit deutlich einfacher machen, wenn sie da sind.

1. **Browser.** Das Kit bringt einen mit, damit ich Weboberflächen selbst bedienen kann:
   das Dashboard eines Kundengeräts prüfen, den Chat mit einer echten Frage testen,
   Bildschirmfotos für die Abnahme machen, Kundenwebsites lesen. Er startet beim ersten
   Zugriff von selbst, du musst nichts einrichten.

   Erklär das in zwei Sätzen und frag, ob es so recht ist. Wer es nicht will, sagt das
   einmal, du hältst es in `business/profile.md` fest und fragst nicht wieder.

2. **GitHub.** Prüf mit `gh auth status`, ob die Kommandozeile angemeldet ist. Damit kann
   ich später die Sicherung deiner Arbeit anlegen, Erweiterungen versionieren und
   Rückmeldungen ans Kit schicken.

   Ist sie nicht angemeldet, nenn den Anmeldebefehl und lass ihn ihn selbst ausführen.
   Ohne GitHub geht alles andere trotzdem, nur die Sicherung in Runde 8 fällt dann weg
   oder läuft über einen anderen Ort.

Verfahren dazu: `.ara/knowledge/browser.md`

### Runde 8: Sicherung

`customers/` und `business/` liegen bewusst außerhalb des Kit-Repos, ein Update kann sie
so nicht anfassen. Damit haben sie aber auch keine Historie.

Frag, ob das Kit gesichert werden soll, und biete an, ein eigenes privates Repository
dafür einzurichten. **Ein Repository, nicht mehrere**: deine Kundenakten und deine
Geschäftsdaten liegen zusammen.

Wenn ja: Wo soll es liegen. GitHub oder woanders (eigener Server, GitLab, Festplatte)?
Richte es ein und erklär in zwei Zeilen, wie gesichert wird.

### Runde 9: Dein eigenes Gerät

Fünf von sechs Partnern wollen ein Gerät zum Vorführen. Frag einmal, ob eins ansteht:

1. **Richtest du dir ein eigenes Gerät ein** (zum Vorführen, zum Üben, für den eigenen
   Betrieb), oder fängst du direkt mit Kundengeräten an?
2. Wenn ja: **welches Modell**, und steht es schon da oder ist es bestellt?

Sagt er ja, bekommt das Gerät seinen Ort unter `business/<modellname>/`, also
`business/jetson-thor/` oder `business/dgx-spark/`. Nicht unter `customers/`: ein eigenes
Gerät gehört keinem Kunden, und ein Scheinkunde dafür verfälscht jede Auswertung und jede
Agenda.

**Der Name ist hier das Modell, und das ist eine benannte Ausnahme.** Kundengeräte heißen
nach Standort oder Rolle (`.ara/knowledge/customer-file.md`), weil das Modell sich ändert
und der Standort bleibt. Bei den eigenen Geräten ist es umgekehrt: sie stehen alle am
selben Ort, unterscheiden tut sie das Modell.

Angesprochen wird es überall dort, wo sonst ein Kundenname steht, mit `business`:

```
node .ara/tools/runsheet.mjs --create --customer business --device jetson-thor
node .ara/tools/remote.mjs --customer business --check
```

Einrichten läuft danach wie bei jedem anderen Gerät, mit `/setup business/<modellname>`.
Steht das Gerät noch nicht da, leg jetzt nichts an, sondern halt im Profil fest, dass eins
kommt.

`business/` ist von der Versionskontrolle ausgenommen, das eigene Gerät also auch.

Sagt er nein, ist das eine Zeile im Profil und keine weitere Frage.

### Runde 10: Profil schreiben

Jetzt `business/profile.md` aus `.ara/templates/profile.md` anlegen und füllen:
Frontmatter vollständig, Prosa-Abschnitte in **Du-Form an ihn gerichtet**, Technikstand
aus Runde 1 mit Datum.

Lies ihm die zwei bis drei wichtigsten Punkte vor („So arbeite ich ab jetzt mit dir") und
lass sie bestätigen. Was nicht stimmt, wird gleich korrigiert.

### Runde 11: Erster Schritt und ehrlicher Abschluss

Frag, ob gerade ein konkreter Kunde oder ein konkretes Gerät ansteht.

- **Ja, ein Kunde:** direkt weiter mit `/customer <name>`. Der beste Abschluss, er sieht
  sofort, wie sich das Kit anfühlt.
- **Ja, das eigene Gerät aus Runde 9:** weiter mit `/setup business/<modellname>`.
- **Unternehmens-Rolle:** hier ist das eigene Gerät der Normalfall, nicht die Ausnahme. Es
  liegt unter `business/<modellname>/`, eine Akte für die eigene Firma braucht es dafür
  nicht.
- **Nein:** sagen, was als Nächstes sinnvoll wäre.

Zum Schluss, kurz und ohne Beschönigung:

- was eingerichtet ist (zwei Zeilen)
- **was fehlt und was deshalb nicht geht**: konkret, nicht „einiges fehlt noch"
- der nächste sinnvolle Schritt

Beispiel:

> Eingerichtet: Profil, Sicherheitsstufe, SSH-Schlüssel, Sicherung auf GitHub.
> Es fehlen: Lizenztoken (ohne ihn keine Installation und keine Produktaussagen) und
> Stundensatz (ohne ihn keine Kalkulation).
> Nächster Schritt: Token aus dem Portal holen, dann legen wir deinen ersten Kunden an.

Was am Kalkulationsblatt fehlt, liest du dafür ab, statt es aus dem Kopf aufzuzählen:
`node .ara/tools/calculation.mjs`.

Keine Zusammenfassung des ganzen Gesprächs. Keine Begeisterung.

## Jedes weitere Mal

`business/profile.md` existiert. Dann geht es nicht um den Menschen, sondern um den
Stand des Kits. Fünf Schritte, in dieser Reihenfolge:

1. **Nachsehen.** `node .ara/tools/update.mjs --check` holt den Stand aus dem Arasul-Repo
   und zeigt je Datei, was neu, geändert oder entfernt wäre. Nichts Neues: eine Zeile,
   fertig. Das läuft auch in einem Fork ohne Upstream-Remote, die Quelle ist ein Archiv.
2. **Einspielen**, mit Bestätigung. `node .ara/tools/update.mjs` ersetzt `.ara/` und das
   Minimum von `.claude/` (`CLAUDE.md`, `settings.json`, `skills/`, `commands/init.md`).
   `business/`, `customers/`, `devices/`, `apps/`, der Spiegel, der Merker
   `.ara/state.json` und die erzeugten Befehle bleiben, wie sie sind. Wer das Kit mit git
   führt, sieht die Änderung danach in `git status` und committet sie.
3. **Befehle nachziehen.** `node .ara/tools/commands.mjs` zeigt für den Zweig aus dem
   Profil, welche Befehle fehlen und welche abweichen. Fehlende legst du an. Abweichende
   zeigst du erst im Unterschied und ersetzt sie nur mit Zustimmung: entweder ist der
   Befehl im Kit neuer oder der Mensch hat ihn selbst angepasst, und das zweite darf
   nicht verloren gehen. Anlegen und ersetzen: `node .ara/tools/commands.mjs --apply`.
   Was im Ziel liegt und nicht aus dem Kit stammt, bleibt liegen.
4. **Profil ergänzen**, nur wo es Lücken hat. Braucht ein neuer Befehl eine Angabe, die
   im Profil fehlt, frag genau diese, gebündelt. Nicht das ganze Onboarding wiederholen.
5. **Nachweisen.** `node .ara/tools/selftest.mjs`. Erst wenn er durchläuft, ist der neue
   Stand auf diesem Rechner belegt.
