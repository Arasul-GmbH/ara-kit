# Verfahren: Onboarding

> **Wann brauchst du das?** Bei `/start` — dem einmaligen Einrichten des Kits für einen
> neuen Menschen.

## Ziel

Nach `/start` gilt: Das Kit weiß, wer damit arbeitet, wie er arbeitet und was er vorhat.
Der Rechner kann, was er können muss. Zugänge sind hinterlegt. Es gibt einen konkreten
nächsten Schritt.

Rechne mit fünfzehn Minuten. Das ist gut investiert — alles, was hier hinterlegt wird,
muss später nie wieder gefragt werden.

## Zwei Regeln, die dieses Verfahren tragen

**1. Schreib die Dateien in `business/` an den Menschen, nicht über ihn.**
Sie gehören ihm. Also „Du willst kurz gehalten werden" — nicht „Kolja will kurz gehalten
werden" oder „er kann im Laufzettel nachlesen". Notizen über den Menschen in der dritten
Person sind ein Fehler, auch wenn sie stimmen.

**2. Lass nichts stillschweigend durchrutschen.**
Wenn jemand eine Runde überspringt, ist das in Ordnung — aber es wird am Ende benannt,
mit der Folge: „Ohne Stundensatz kann ich nichts kalkulieren." Ein Kit, das halb
eingerichtet ist und so tut, als wäre alles fertig, fällt beim ersten Kundengespräch auf.

## Vorher

Existiert `business/profile.md` schon, ist das Onboarding gelaufen. Sag in drei Zeilen, was
hinterlegt ist und was fehlt, und frag, was geändert werden soll — statt alles neu zu
erfragen.

## Runde 1 — Technikcheck, ohne zu fragen

```
node .ara/tools/check-environment.mjs
```

Meldet Betriebssystem, Node, git, ssh, vorhandene SSH-Schlüssel, freien Speicher und ob
der Rechner zum Flashen eingebetteter Geräte taugt (z. B. Jetson Thor; DGX Spark,
RTX-Workstation und x86-Server brauchen keinen Flash-Rechner).

Sag in zwei bis drei Zeilen, was das bedeutet. Behebe still, was du beheben darfst. Fehlt
etwas Grundlegendes, nenne den Installationsweg für das erkannte System und mach weiter.

Merk dir das Ergebnis — es kommt in Runde 8 in `business/profile.md`.

## Runde 2 — Wer bist du

Eine Interview-Runde, Fragen gebündelt:

1. **Name** und wie du ihn ansprechen sollst (Vorname? Nachname? Etwas anderes?).
2. **Rolle:** Partner (richtet Geräte für Kunden ein) oder Unternehmen (betreibt ein
   eigenes Gerät)? Das entscheidet, wie das Kit aussieht.
3. **Firma und Region.**

Ab jetzt sprichst du ihn so an, wie er es gesagt hat.

## Runde 3 — Wie du arbeitest

1. **Erfahrung:** Linux-Server aufgesetzt, mit SSH gearbeitet, Hardware beim Kunden
   installiert? Ehrliche Antwort hilft — es geht nicht um Bewertung.
2. **Erklärtiefe:** wenig, mittel oder viel. Steuert deinen Ton ab jetzt.
3. **Sicherheitsstufe:** Erklär die drei Stufen in vier Zeilen
   (`.ara/knowledge/security.md`) und lass den Standard bestätigen. Wer lockern will, kann
   das — dann hältst du fest, **was genau** gelockert wurde und seit wann.

## Runde 4 — Was du vorhast

Diese Runde ist der Grund, warum das Kit später brauchbare Vorschläge macht:

1. **Haupt- oder Nebengeschäft?** Jemand mit zwei Kunden nebenher braucht etwas anderes
   als jemand, der davon lebt.
2. **Wie viele Kunden schweben dir vor**, in welchem Zeitraum?
3. **Welche Branchen** hast du im Blick oder betreust du schon? Kanzleien und Praxen haben
   besondere Anforderungen, Handwerk und Fertigung andere.
4. **Was ist dein Engpass** — Kunden finden, Technik, Zeit?

Antworten in Prosa nach `business/profile.md`, Abschnitt „Was ich vorhabe". Nicht als
Stichpunktliste der Fragen, sondern als zusammenhängender Absatz in Du-Form.

## Runde 5 — Geschäftliches

Nur in der Partner-Rolle. Im Unternehmens-Modus überspringen.

Stundensatz, Aufschlag auf Hardware, Zahlungsziel, Firmierung, Anschrift, Steuernummer,
Bankverbindung, Logo-Pfad. Nach `business/company.md`.

**Sag vorher, wozu das dient**, sonst wirkt es wie ein Formular:

> Das brauche ich, um dir Angebote zu rechnen und zu schreiben. Ohne Stundensatz kann ich
> nichts kalkulieren, ohne Anschrift kein Angebot erzeugen. Was du jetzt nicht zur Hand
> hast, holen wir später nach.

Was fehlt, kommt in die Abschlussliste in Runde 9.

## Runde 6 — Zugänge

1. **Wo sollen Geheimnisse liegen?** Zwei Möglichkeiten, kurz erklärt:
   - **`.env`-Datei im Kit** — sichtbar, einfach zu sichern, liegt im Kit-Ordner.
   - **Schlüsselbund des Betriebssystems** — verschlüsselt abgelegt, kann nicht
     versehentlich mitkopiert werden, dafür weniger greifbar.

   Prüf vorher mit `node .ara/tools/secrets.mjs --show`, ob der Schlüsselbund hier
   überhaupt nutzbar ist, und biete nur an, was geht. Ohne klare Präferenz: `.env`.
   Einstellen mit `node .ara/tools/secrets.mjs --store <env|keychain>`.

2. **Lizenztoken hinterlegen.**
   `node .ara/tools/secrets.mjs --set ARASUL_TOKEN` fragt den Wert ab, ohne ihn
   anzuzeigen. **Lass ihn den Wert selbst eingeben** — diktiert er ihn dir, steht er im
   Gesprächsprotokoll.
   Danach `node .ara/tools/mirror.mjs` — das ist zugleich die Probe, ob der Token gilt.
   Kein Token zur Hand? In Ordnung, vermerken und weiter.

3. **SSH-Schlüssel.** Aus Runde 1 weißt du, welche existieren.
   - Keiner da: einen anlegen anbieten (Ed25519, mit Passphrase, bleibt in `~/.ssh`).
   - Mehrere da: **frag, welcher für Kundengeräte gedacht ist** — such ihn nicht selbst
     aus. Ein Schlüssel, der schon woanders benutzt wird, ist eine bewusste Entscheidung.
   - Ins Profil kommt nur der **Name**, nie der Schlüssel selbst.

## Runde 7 — Sicherung

`customers/` und `business/` liegen bewusst außerhalb des Kit-Repos — ein Update kann sie
so nicht anfassen. Damit haben sie aber auch keine Historie.

Frag, ob das Kit gesichert werden soll, und biete an, ein eigenes privates Repository
dafür einzurichten. **Ein Repository, nicht mehrere** — deine Kundenakten und deine
Geschäftsdaten liegen zusammen.

Wenn ja: Wo soll es liegen — GitHub oder woanders (eigener Server, GitLab, Festplatte)?
Richte es ein und erklär in zwei Zeilen, wie gesichert wird.

## Runde 8 — Profil schreiben

Jetzt `business/profile.md` aus `.ara/templates/profile.md` anlegen und füllen:
Frontmatter vollständig, Prosa-Abschnitte in **Du-Form an ihn gerichtet**, Technikstand
aus Runde 1 mit Datum.

Lies ihm die zwei bis drei wichtigsten Punkte vor („So arbeite ich ab jetzt mit dir") und
lass sie bestätigen. Was nicht stimmt, wird gleich korrigiert.

## Runde 9 — Erster Schritt und ehrlicher Abschluss

Frag, ob gerade ein konkreter Kunde oder ein konkretes Gerät ansteht.

- **Ja:** direkt weiter mit `/customer <name>`. Der beste Abschluss — er sieht sofort, wie
  sich das Kit anfühlt.
- **Unternehmens-Rolle:** die eigene Firma als Akte anlegen, damit das Gerät einen Ort hat.
- **Nein:** sagen, was als Nächstes sinnvoll wäre.

Zum Schluss, kurz und ohne Beschönigung:

- was eingerichtet ist (zwei Zeilen)
- **was fehlt und was deshalb nicht geht** — konkret, nicht „einiges fehlt noch"
- der nächste sinnvolle Schritt

Beispiel:

> Eingerichtet: Profil, Sicherheitsstufe, SSH-Schlüssel, Sicherung auf GitHub.
> Es fehlen: Lizenztoken (ohne ihn keine Installation und keine Produktaussagen) und
> Stundensatz (ohne ihn keine Kalkulation).
> Nächster Schritt: Token aus dem Portal holen, dann legen wir deinen ersten Kunden an.

Keine Zusammenfassung des ganzen Gesprächs. Keine Begeisterung.
