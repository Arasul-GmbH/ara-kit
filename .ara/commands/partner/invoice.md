---
description: Rechnung als ZUGFeRD-PDF, mit Nummer aus dem Nummernkreis
argument-hint: <kunde>
---

Rechnung für: **$1**

Lies `.ara/knowledge/invoicing.md` und arbeite danach. Was hier steht, ist der Weg durch
dieses Verfahren, nicht ein zweites daneben. Wissen, das dieser Befehl lädt:
`.ara/knowledge/invoicing.md`, `.ara/knowledge/crm.md`, `.ara/knowledge/customer-file.md`.
Dazu `business/profile.md` und `business/company.md` für den Absender.

Ab jetzt arbeitest du ausschließlich in `customers/$1/`. Kein Blick in andere
Kundenordner, auch nicht, um eine alte Rechnung als Muster zu nehmen.

**Kein Argument angegeben:** erst den Nummernkreis zeigen
(`node .ara/tools/invoice.mjs`), dann die Kunden (`node .ara/tools/customer.mjs`), dann
fragen, für wen die Rechnung ist.

## Der Grundsatz

Eine Rechnung ist kein Anschreiben. Fehlt eine der Pflichtangaben nach § 14 Abs. 4 UStG,
berechtigt sie den Kunden nicht zum Vorsteuerabzug. Das fällt bei ihm auf, nicht bei dir,
und dann kommt sie zurück. Darum wird die Prüfliste **vor** dem Druck rot, nicht danach.

Die Nummer wird beim Anlegen vergeben und nie zurückgedreht. Ein verworfener Entwurf wird
storniert, nicht gelöscht: sonst hat der Nummernkreis eine Lücke, und die sucht ein
Betriebsprüfer als Erstes.

## Die sechs Schritte

1. **Nachsehen, was es schon gibt.**

   ```
   node .ara/tools/invoice.mjs --customer $1
   node .ara/tools/customer.mjs --customer $1
   ```

   Das erste sagt, welche Nummern für diesen Kunden vergeben sind und welcher Beleg noch
   nicht gedruckt ist. Das zweite gibt das Lagebild: Stand, Geräte, Papier, Verlauf.
   Liegt ein Angebot in `customers/$1/documents/`, ist das die Quelle der Positionen.

2. **Klären, worüber abgerechnet wird**, in **einer** Interview-Runde. Was du aus der
   Akte lesen kannst, fragst du nicht. Was nur der Mensch weiß:

   - Wofür die Rechnung ist: das Angebot ganz, ein Teil davon, eine Wartung, Stunden.
   - **Der Leistungszeitpunkt.** Der Tag, an dem geliefert oder die Leistung erbracht
     wurde, oder der Zeitraum. Das ist nicht das Rechnungsdatum, auch wenn beides oft
     auf denselben Tag fällt. § 14 Abs. 4 Nr. 6 UStG verlangt ihn eigens.
   - Ob eine Anzahlung schon geflossen ist.

3. **Beleg anlegen.** Die Nummer kommt aus dem Nummernkreis, die Positionen aus dem
   Angebot oder aus der Zeile:

   ```
   node .ara/tools/invoice.mjs --customer $1 --new --service-date JJJJ-MM-TT
   node .ara/tools/invoice.mjs --customer $1 --new --from-offer customers/$1/documents/<datei>.md
   node .ara/tools/invoice.mjs --customer $1 --new --position "Wartung 2026|1|Jahr|960,00"
   ```

   Ohne `--from-offer` nimmt das Werkzeug das jüngste Angebot in der Akte. Mit `--empty`
   nimmt es keines und legt eine Zeile zum Ausfüllen an. Kleinunternehmer und Reverse
   Charge über `--tax-mode`, Zahlungsziel über `--due` oder `--terms`.

   **Danach liest du den Beleg und füllst, was nur du weißt.** Das Werkzeug rechnet und
   trägt ein, was in den Akten steht. Es erfindet keine Leistungsbeschreibung: "Beratung"
   allein genügt dem Finanzamt nicht, aus der Zeile muss hervorgehen, was geleistet
   wurde.

4. **Prüfliste abarbeiten.**

   ```
   node .ara/tools/invoice.mjs --check customers/$1/documents/<beleg>.md
   ```

   Jede Zeile nennt ihren Absatz aus § 14 UStG und, wenn sie rot ist, was genau fehlt und
   wo es hingehört. Fehlt die Anschrift des Kunden, gehört sie in `customers/$1/customer.md`
   und nicht in den Beleg: dort steht sie beim nächsten Mal wieder.

5. **Drucken.** Erst wenn die Prüfliste grün ist:

   ```
   node .ara/tools/invoice.mjs --pdf customers/$1/documents/<beleg>.md
   ```

   Das erzeugt das PDF und hängt die Rechnungsdaten als `factur-x.xml` hinein, das ist
   ZUGFeRD. Danach liest das Werkzeug den Anhang aus dem fertigen PDF zurück und prüft
   ihn noch einmal. Was dabei ungeprüft bleibt, sagt es selbst, und das sagst du weiter,
   statt es zu verschweigen.

6. **Nachhalten.** Nach `.ara/knowledge/crm.md`: Eintrag in `customers/$1/history/` mit
   `type: invoice`, `last_contact` auf heute, `follow_up` auf das Fälligkeitsdatum mit
   einem Halbsatz, worum es geht. Der Nummernkreis führt den Beleg danach als `gestellt`.

## Verschickt wird nichts

Erzeugen ist frei. **Versenden entscheidet der Partner.** Du legst das fertige PDF vor
und sagst, was noch offen ist. Du verschickst keine Mail und lädst nichts hoch.

## Was dieses Kit nicht ist

Keine Buchhaltung. Es schreibt die Rechnung und führt ihren Nummernkreis, mehr nicht.
Zahlungseingänge, Mahnwesen, Umsatzsteuervoranmeldung und der Steuerberater laufen
weiterhin dort, wo sie heute laufen. Wenn jemand danach fragt, sag genau das.

## Die Prüfliste

Leg sie dem Menschen vor, bevor etwas rausgeht. Jede Zeile, die du nicht selbst geprüft
hast, sagst du als ungeprüft an.

- [ ] `node .ara/tools/invoice.mjs --check <beleg>` lief grün, ohne `--force`
- [ ] Der Leistungszeitpunkt ist der Tag der Leistung, nicht das Rechnungsdatum
- [ ] Jede Position sagt, was geleistet wurde, nicht nur, aus welchem Topf es kommt
- [ ] Die Beträge stammen aus dem Angebot oder aus einer erfassten Leistung, keiner ist
      geschätzt
- [ ] Anschrift des Kunden aus `customers/$1/customer.md`, nicht aus dem Gedächtnis
- [ ] Absender, Steuernummer oder USt-IdNr. und IBAN aus `business/company.md`
- [ ] Die Nummer steht im Nummernkreis, und der hat keine Lücke
- [ ] Das PDF trägt den Anhang, und er ließ sich zurücklesen
- [ ] Verlaufseintrag geschrieben, `follow_up` auf die Fälligkeit gesetzt
- [ ] Keine Gedankenstriche als Trenner, keine Emojis
