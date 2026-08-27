---
description: Angebot mit allen fünf Anlagen, als Markdown und als PDF
argument-hint: <kunde>
---

Angebot für: **$1**

Lies `.ara/knowledge/paperwork.md` und arbeite danach. Was hier steht, ist der Weg
durch dieses Verfahren, nicht ein zweites daneben. Wissen, das dieser Befehl lädt:
`.ara/knowledge/paperwork.md`, `.ara/knowledge/leistungsbeschreibung.md`,
`.ara/knowledge/pricing.md`, `.ara/knowledge/sales.md`, `.ara/knowledge/crm.md`,
`.ara/knowledge/live-knowledge.md` für jeden Produktwert. Dazu `business/profile.md`
und `business/company.md` für Absender und Sätze.

Ab jetzt arbeitest du ausschließlich in `customers/$1/`. Kein Blick in andere
Kundenordner, auch nicht, um ein altes Angebot als Muster zu nehmen.

**Kein Argument angegeben:** Kunden auflisten, je eine Zeile mit Status und letztem
Kontakt (`node .ara/tools/customer.mjs`), und fragen, für wen das Angebot ist. Keine
Akte vorhanden: zuerst `/customer`.

## Der Grundsatz, bevor die erste Zahl fällt

Was hier entsteht, wird unterschrieben. Kein Produktwert aus dem Gedächtnis und keiner,
weil er in einer Vorlage steht. Modellnamen, Plattformen, Fassungen und Erprobungsstände
kommen aus dem Spiegel oder vom Gerät.

**Die Einkaufspreise des Partners tauchen in keinem Kundendokument auf**, auch nicht in
einer Zwischensumme, aus der sich die Marge zurückrechnen lässt.

## Die neun Schritte

1. **Kalkulationsblatt lesen, bevor du fragst.**

   ```
   node .ara/tools/calculation.mjs
   ```

   Es sagt, welche der zehn Zahlen vorliegen, welche fehlen und was ohne sie nicht geht.
   Liegen alle vor, wird nach keiner einzigen gefragt, und zwei Angebote desselben
   Partners für denselben Gerätetyp kommen auf dieselben Zahlen. Fehlt eine blockierende
   Zahl, hört das Werkzeug mit Rückgabecode 1 auf: dann gehört sie **in dieselbe
   Interview-Runde wie Schritt 2** und danach über `/kalkulation` ins Blatt, mit dem
   Datum, an dem sie bestätigt wurde. Eine Zahl, die nur in diesem einen Angebot steht,
   ist beim nächsten wieder weg.

   Meldet das Werkzeug eine Zahl als veraltet, ist das ein Hinweis und kein Halt. Frag
   einmal nach, ob sie noch gilt, und schreib die Antwort ins Blatt.

2. **Akte lesen.** `node .ara/tools/customer.mjs --customer $1` gibt das Lagebild:
   Stand, Geräte mit ihrem Zustand, vorhandenes Papier, letzter Verlaufseintrag. Was der
   Kunde erreichen will, steht in `customers/$1/customer.md` und in den letzten Einträgen
   aus `customers/$1/history/` in seinen Worten, und genau die gehören später in den
   Abschnitt "Worum es geht". Fehlt dir etwas, das nur der Mensch weiß, frag es gebündelt
   in einer Runde, nicht Schritt für Schritt.

   **Wofür das Angebot ist, sagt die Akte mit.** Einrichtung eines Geräts, eine App,
   mehrere Apps, Wartung, oder mehreres zusammen. Steht in der Akte schon ein Gerät, ist
   die Einrichtung dafür der Normalfall und du fragst nicht, ob es eines geben soll.

3. **Spiegel holen.** `node .ara/tools/mirror.mjs --refresh`. Ohne frischen Spiegel
   entsteht kein Angebot, weil Plattform und Erprobungsstand sonst geraten wären. Ist
   der Spiegel nicht erreichbar, sag das und schreib nichts hin.

4. **Leistungsbeschreibung füllen.** Sie kommt **vor** dem Angebot, nicht danach. Sie
   legt fest, was geschuldet ist, und das Angebot verweist nur noch auf sie. Ohne sie
   kein Angebot. Sie entsteht am Gerät und gegen den Spiegel, nicht am Schreibtisch,
   und nie aus einem alten Angebot kopiert: ein alter Reifegrad ist beim nächsten
   Produktstand eine falsche Zusage. Die sechs Schritte stehen in
   `.ara/knowledge/paperwork.md` unter "Die Leistungsbeschreibung füllen". Gerüst:
   `.ara/vorlagen/leistungsbeschreibung.md`.

5. **Rechnen.** Nach `.ara/knowledge/pricing.md`, mit den Zahlen aus Schritt 1 und im Ton
   aus `.ara/knowledge/sales.md`. **Es wird mit dem gerechnet, was im Blatt steht, und
   nichts geschätzt.** Die verbindliche Quelle für einen Einkaufspreis ist das
   Partnerportal. Wartung Jahr 1 und ab Jahr 2 sind zwei verschiedene Zahlen, rechne
   beide.

6. **Angebot schreiben.** Gerüst `.ara/vorlagen/angebot.md`. Briefkopf, USt-IdNr., IBAN und
   Zahlungsziel kommen aus `business/company.md`, der Name unter der Unterschrift aus
   `business/profile.md`. **Der Absender ist der Partner, nicht Arasul.** Fehlt ein
   Feld, wird es in `business/company.md` nachgetragen und nicht im Angebot erfunden.

7. **Fünf Anlagen zusammenstellen**, nicht drei. Sie werden Vertragsbestandteil und
   werden im Abschnitt "Anlagen" des Angebots einzeln benannt:

   | Nr | Anlage | Woher |
   |---|---|---|
   | 1 | Leistungsbeschreibung | `.ara/vorlagen/leistungsbeschreibung.md`, je Kunde neu |
   | 2 | Endkundenbedingungen | `.ara/vorlagen/endkundenbedingungen.md`, unverändert |
   | 3 | Drittlizenzen | `.ara/vorlagen/drittlizenzen.md`, unverändert |
   | 4 | Nachweis KI-Einstufung | `.ara/nachweise/ki-einstufung.md`, Abrufdatum prüfen |
   | 5 | Nachweis Datenverarbeitung | `.ara/nachweise/datenverarbeitung.md`, Abschnitt 3 |

   `.ara/nachweise/` und `.ara/vorlagen/bausteine/` werden aus Arasuls Steuerungsordner
   gespiegelt. **Hier nicht bearbeiten.** Wer darin einen Fehler findet, sagt es Arasul.

   Der Nachweis Datenverarbeitung ist ein **Gerüst**, kein ausgefülltes Blatt.
   Abschnitt 3 wird je Auslieferung am Gerät gemessen. Steht noch kein Gerät, bleibt er
   leer und bekommt eine Zeile, dass bei der Übergabe gemessen und das Ergebnis
   nachgereicht wird. Ohne diese Zeile liest der Kunde einen Platzhalter als Aussage.

8. **PDF erzeugen**, für das Angebot und für **jede Anlage einzeln**. Sie sind einzeln
   Vertragsbestandteil und werden einzeln abgelegt.

   ```
   node .ara/tools/pdf.mjs customers/$1/documents/JJJJ-MM-TT-angebot.md
   node .ara/tools/pdf.mjs <datei> --check      nur prüfen, nichts drucken
   ```

   Das Werkzeug bricht ab, solange noch ein Platzhalter in geschweiften Klammern im
   Text steht. Das ist sein Zweck: `{Betrag} Euro` beim Kunden ist der Fehler, den es
   verhindert.

9. **Prüfliste vorlegen, ablegen, nachhalten.** Die Prüfliste steht unten, und erst
   danach ist etwas versandfähig. Markdown und PDF liegen nebeneinander in
   `customers/$1/documents/`, mit Datum im Dateinamen. Das Markdown bleibt liegen: in
   einem halben Jahr fragt jemand, was zugesagt wurde, und dann ist die Quelle mehr
   wert als das PDF. Dann nach `.ara/knowledge/crm.md`: Eintrag in
   `customers/$1/history/`, `last_contact` auf heute, `status` auf `quoted`,
   `follow_up` auf das Gültigkeitsdatum mit einem Halbsatz, worum es geht.

## Verschickt wird nichts

Erzeugen ist frei. **Versenden entscheidet der Partner.** Du legst das fertige Papier
vor und sagst, was noch offen ist. Du verschickst keine Mail und lädst nichts hoch.

## Die Prüfliste

Leg sie dem Menschen vor, bevor etwas rausgeht. Jede Zeile, die du nicht selbst geprüft
hast, sagst du als ungeprüft an.

- [ ] `node .ara/tools/calculation.mjs` lief, und jede Zahl im Angebot stammt aus dem
      Blatt. Keine geschätzt, keine nur für dieses eine Angebot erfunden
- [ ] Briefkopf, USt-IdNr., IBAN und Unterschrift aus `business/company.md` gelesen,
      nicht aus der Vorlage und nicht aus dem Gedächtnis
- [ ] Kein Einkaufspreis und keine Marge im Dokument, auch nicht in einer Zwischensumme
- [ ] Plattform und Erprobungsstand frisch aus dem Spiegel dieser Sitzung
- [ ] Anlage 1 Leistungsbeschreibung erzeugt, mit Datum, gegen Spiegel oder Gerät. Ohne
      sie ist die Beschaffenheit nicht vereinbart, § 434 Abs. 2 Nr. 2 BGB
- [ ] Anlage 2 Endkundenbedingungen beigefügt **und** der Kunde vor Vertragsschluss
      darauf hingewiesen. Nachreichen hilft nicht, § 305 Abs. 2 BGB
- [ ] Anlage 3 Drittlizenzen beigefügt und ihre Sperre beachtet
- [ ] Anlage 4 Nachweis KI-Einstufung beigefügt und das Abrufdatum der Rechtsquellen am
      Ende des Blattes geprüft. Recht ändert sich, das Blatt nicht von allein
- [ ] Anlage 5 Nachweis Datenverarbeitung beigefügt und Abschnitt 3 entweder am Gerät
      gemessen oder ausdrücklich als noch zu messen gekennzeichnet
- [ ] Steht eine Plattform drin, die in der Leistungsbeschreibung nicht als erprobt
      geführt wird? Dann ist der Vorbehaltsabsatz zwingend, im Angebot **und** im
      Kaufvertrag, § 444 BGB
- [ ] Wartung Jahr 1 und ab Jahr 2 einzeln gerechnet
- [ ] Gültigkeitsdatum gesetzt und als `follow_up` in `customer.md` eingetragen
- [ ] **`node .ara/tools/pdf.mjs` lief ohne `--force` durch.** Ein Angebot, das nur mit
      `--force` druckt, enthält noch einen Platzhalter und wird nicht verschickt
- [ ] Keine Gedankenstriche als Trenner, keine Emojis
