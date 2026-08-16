# Verfahren: Onboarding

> **Wann brauchst du das?** Bei `/start` — dem einmaligen Einrichten des Kits für einen
> neuen Menschen.

## Ziel

Nach `/start` gilt: Das Kit weiß, wer damit arbeitet und wie. Der Rechner kann, was er
können muss. Zugänge sind hinterlegt. Der Mensch hat einen konkreten nächsten Schritt.

Das dauert etwa zehn Minuten. Mach so viel wie möglich selbst und stell die Fragen
gebündelt — nicht eine nach der anderen.

## Vorher

Prüf, ob `mein/profil.md` schon existiert. Wenn ja, ist das Onboarding gelaufen: sag, was
darin steht, und frag, ob etwas geändert werden soll, statt alles neu zu erfragen.

## Runde 1 — Technikcheck, ohne zu fragen

```
node .ara/werkzeuge/pruefe-umgebung.mjs
```

Das Skript meldet Betriebssystem, Architektur, Node, git, ssh, vorhandene SSH-Schlüssel,
freien Speicher und ob ein Rechner für das Flashen von Jetson-Geräten in Frage kommt.

Lies das Ergebnis, sag in zwei bis drei Zeilen, was es bedeutet, und behebe stillschweigend,
was du beheben darfst. Fehlt etwas Grundlegendes (Node, git), nenne den Installationsweg für
das erkannte Betriebssystem und mach danach weiter.

**Merk dir das Ergebnis für später:** Ob ein x86-Linux-Rechner verfügbar ist, entscheidet
darüber, ob Jetson-Thor-Geräte selbst geflasht werden können. Das kommt in `mein/profil.md`.

## Runde 2 — Wer bist du, wie arbeiten wir

Eine Interview-Runde mit diesen Fragen auf einmal:

1. **Rolle.** Partner (richtet Geräte für mehrere Kunden ein) oder Unternehmen (betreibt ein
   eigenes Gerät)? Das entscheidet, wie das Kit aussieht.
2. **Name und Firma.**
3. **Erfahrung.** Schon mal Linux-Server aufgesetzt, mit SSH gearbeitet, Hardware beim
   Kunden installiert? Ehrliche Antwort hilft — es geht nicht um Bewertung.
4. **Erklärtiefe.** Wie viel soll erklärt werden, wie viel einfach getan? Drei Stufen:
   wenig, mittel, viel. Das steuert deinen Ton ab jetzt.

Schreib das Ergebnis nach `mein/profil.md` (Vorlage: `.ara/vorlagen/profil.md`).

## Runde 3 — Zugänge

1. **Lizenztoken.** Aus dem Partnerportal, Bereich Lizenzen. Damit lädt das Kit den
   aktuellen Produktstand und installiert später auf Geräten.

   Leg `.env` aus `.env.beispiel` an, aber **lass den Token vom Menschen selbst
   eintragen** — diktiert er ihn dir, steht er im Gesprächsprotokoll. Sag ihm, er soll
   die Zeile `ARASUL_TOKEN=` in der `.env` ergänzen, und dass er das direkt hier tun
   kann, indem er `! open -e .env` (macOS) beziehungsweise seinen Editor benutzt.

   Prüf danach mit `node .ara/werkzeuge/spiegel.mjs --status`, ob er angekommen ist,
   und hol den Spiegel einmal mit `node .ara/werkzeuge/spiegel.mjs`. Das ist zugleich
   die Probe, ob der Token gültig ist.
   Hat der Mensch gerade keinen Token, ist das in Ordnung: alles außer Produktaussagen
   und Installation funktioniert auch ohne. Vermerk es und mach weiter.
2. **SSH-Schlüssel.** Aus Runde 1 weißt du, ob einer existiert. Wenn nicht, biete an, einen
   anzulegen (Ed25519, mit Passphrase, bleibt in `~/.ssh`). Erklär in einem Satz, wozu er
   dient: damit später Kundengeräte ohne Passwort und trotzdem sicher erreichbar sind.

## Runde 4 — Geschäftliches (nur Partner-Rolle)

Im Unternehmens-Modus überspringen.

Stundensatz, Aufschlag auf Hardware, Zahlungsziel, Firmendaten für Angebote (Anschrift,
Steuernummer, Bank), Logo-Datei falls vorhanden. Alles freiwillig — was fehlt, kann später
nachgetragen werden. Ergebnis nach `mein/firma.md` (Vorlage: `.ara/vorlagen/firma.md`).

## Runde 5 — Wie du arbeiten sollst

Erklär die drei Sicherheitsstufen in vier Zeilen (`.ara/wissen/sicherheit.md`) und lass die
Standardstufe bestätigen: Lesen ohne Rückfrage, Ändern mit Bestätigung, Unumkehrbares mit
ausdrücklichem Ja. Wer es lockerer will, kann das sagen — halte es dann in `mein/profil.md`
fest, inklusive was genau gelockert wurde.

Frag außerdem, ob die Arbeit des Partners gesichert werden soll: `kunden/` und `mein/`
liegen bewusst außerhalb des Kit-Repos und haben damit keine Historie. Ein eigenes privates
Git dafür ist empfehlenswert, aber optional. Wenn ja, richte es ein und erklär in zwei
Zeilen, wie er sichert.

## Runde 6 — Der erste echte Schritt

Frag, ob gerade ein konkreter Kunde oder ein konkretes Gerät ansteht.

- **Ja:** direkt weiter mit `/customer <name>`. Das ist der beste Abschluss — der Mensch
  sieht sofort, wie sich das Kit anfühlt.
- **Unternehmens-Rolle:** Leg die eigene Firma als Akte an, damit das Gerät einen Ort hat.
- **Nein:** sag, was als Nächstes sinnvoll wäre, und lass es dabei.

## Abschluss

Fünf Zeilen, nicht mehr:

- wer du für ihn bist und wie du arbeitest
- was eingerichtet ist
- was noch fehlt (Token, Schlüssel, Firmendaten)
- der nächste sinnvolle Schritt

Keine Zusammenfassung des gesamten Gesprächs. Keine Begeisterung.
