# Verfahren: die Rechnung

> **Wann brauchst du das?** Bei `/invoice`: eine Rechnung schreiben, prüfen und als
> ZUGFeRD-PDF drucken. Und immer dann, wenn jemand nach Rechnungsnummern, Pflichtangaben
> oder der E-Rechnung fragt.

## Der Grundsatz

Eine Rechnung ist das einzige Papier im Kit, dem ein Gesetz vorschreibt, was drinstehen
muss. § 14 Abs. 4 UStG zählt neun Angaben auf. Fehlt eine, ist die Rechnung nicht falsch
im Sinne von unhöflich, sondern der Kunde darf die Vorsteuer nicht ziehen. Er merkt es,
wenn sein Steuerberater sie prüft, und dann kommt sie zurück, mit einer Frage, die der
Partner nicht beantworten will.

Deshalb gilt hier dieselbe Regel wie beim Angebot, nur schärfer: **es wird nicht
gedruckt, solange eine Pflichtangabe fehlt.** Das Werkzeug hält an, und es sagt, welche.

Und eine zweite Regel: **das Kit ist keine Buchhaltung.** Es schreibt die Rechnung und
führt ihren Nummernkreis. Zahlungseingänge, Mahnwesen, Voranmeldung und Steuerberater
laufen weiter dort, wo sie heute laufen. Wer mehr erwartet, wird enttäuscht, und das
sagst du lieber vorher.

## Nur im Partnerzweig, und nur wenn es gewollt ist

Im Unternehmenszweig gibt es keine Kunden, also auch keine Ausgangsrechnungen. Und auch
ein Partner bekommt den Befehl nicht von allein: `/init` fragt, ob das Kit Rechnungen
erzeugen soll, und erst `invoice: yes` in `business/profile.md` legt `/invoice` an. Wer
seine Rechnungen weiter in der Buchhaltung schreibt, soll das tun. Zwei Werkzeuge, die
beide Nummern vergeben, sind schlimmer als eines.

Nachziehen, wenn die Entscheidung später fällt:

```
node .ara/tools/commands.mjs --apply
```

## Der Nummernkreis

Er liegt in `business/invoices.md` und gehört dem Partner. Aufbau: `JJJJ-NNNN`, jedes
Jahr beginnt bei `0001`, dazwischen liegt keine Lücke.

Drei Regeln, und sie stehen nicht zur Disposition:

1. **Vergeben wird beim Anlegen des Belegs**, nicht beim Drucken. Ein Entwurf, den es nie
   zum Kunden geschafft hat, hat seine Nummer trotzdem verbraucht.
2. **Eine vergebene Nummer verschwindet nie.** Wer einen Beleg verwirft, storniert die
   Nummer: `node .ara/tools/invoice.mjs --void JJJJ-NNNN --reason "…"`. Die Zeile bleibt
   stehen und trägt den Grund.
3. **Zurückgedreht wird nicht.** Steht im Kopf eine kleinere Zahl als in der Liste, oder
   fehlt eine Zahl in der Reihe, vergibt das Werkzeug gar keine Nummer mehr, bis es von
   Hand geklärt ist. Eine Lücke im Nummernkreis ist das Erste, wonach eine Betriebsprüfung
   sucht.

Ein Beleg mit einem Datum aus einem Jahr, für das schon abgeschlossen wurde, bekommt
keine Nummer: sie stünde sonst hinter einer älteren.

## Die neun Pflichtangaben

Das ist die Liste aus § 14 Abs. 4 UStG, und das ist genau die Liste, die
`node .ara/tools/invoice.mjs --check` abarbeitet.

| Nr | Was | Woher es kommt |
|---|---|---|
| 1 | Name und vollständige Anschrift des leistenden Unternehmers | `business/company.md` |
| 1 | Name und vollständige Anschrift des Leistungsempfängers | `customers/<kunde>/customer.md` |
| 2 | Steuernummer oder USt-IdNr. des Leistenden | `business/company.md` |
| 3 | Ausstellungsdatum | der Beleg |
| 4 | fortlaufende, einmalig vergebene Nummer | `business/invoices.md` |
| 5 | Menge und Art der Lieferung, Umfang und Art der Leistung | die Positionstabelle |
| 6 | Zeitpunkt der Lieferung oder Leistung | wird gefragt, siehe unten |
| 7 | Entgelt, aufgeschlüsselt nach Steuersätzen | gerechnet aus der Tabelle |
| 8 | Steuersatz und Steuerbetrag, oder Hinweis auf die Steuerbefreiung | `tax_mode` im Beleg |
| 9 | im Voraus vereinbarte Minderungen des Entgelts | nur wenn es welche gibt |

Dazu, nicht aus § 14, aber ohne sie wird nicht bezahlt: **das Zahlungsziel**.

### Die zwei, die am häufigsten fehlen

**Der Leistungszeitpunkt, Nr. 6.** Er ist nicht das Rechnungsdatum. Dass beides oft auf
denselben Tag fällt, macht es nicht zu einer Angabe. Frag danach, und schreib entweder
einen Tag (`--service-date`) oder einen Zeitraum (`--service-from`, `--service-to`).

**Die Art der Leistung, Nr. 5.** "Beratung", "Dienstleistung", "wie besprochen" genügen
nicht. Aus der Zeile muss hervorgehen, was geleistet wurde: welches Gerät eingerichtet,
welche Wartung für welchen Zeitraum, welche Schulung für wie viele Leute.

### Steuerbefreiung statt Steuerausweis

Drei Fälle kennt das Werkzeug, über `tax_mode` im Kopf des Belegs:

| `tax_mode` | Wann | Was auf dem Beleg steht |
|---|---|---|
| `standard` | der Normalfall | Steuersatz und Steuerbetrag je Satz |
| `kleinunternehmer` | Partner nach § 19 UStG | kein Steuerausweis, Hinweis auf § 19 UStG |
| `reverse_charge` | Kunde im EU-Ausland mit USt-IdNr. | Hinweis auf die Steuerschuldnerschaft des Leistungsempfängers |

Bei den beiden letzten darf **kein** Steuerbetrag ausgewiesen werden. Ein
Kleinunternehmer, der Umsatzsteuer ausweist, schuldet sie nach § 14c UStG, auch wenn er
sie nie einnehmen wollte.

## Was ZUGFeRD ist und warum

Seit dem 1. Januar 2025 muss jedes Unternehmen in Deutschland eine elektronische Rechnung
**empfangen** können. Die Pflicht, sie auszustellen, kommt stufenweise ab 2027, abhängig
vom Umsatz. Ein PDF allein ist keine elektronische Rechnung: es ist ein Bild von einer.

ZUGFeRD löst das, ohne dass jemand etwas umstellen muss. Die Rechnung ist ein ganz
normales PDF, und **im PDF steckt eine Datei** mit denselben Zahlen in maschinenlesbarer
Form, nach der Norm EN 16931. Der Mensch sieht das Blatt, die Buchhaltung liest die
Datei, niemand tippt ab.

**Ein Beleg, eine Wahrheit.** Das Werkzeug liest die Zahlen für die Datei aus derselben
Tabelle, die gedruckt wird. Es gibt keinen zweiten Datensatz daneben, der auseinanderlaufen
könnte. Rechnet man die Summe von Hand um und vergisst die Tabelle, fällt das auf, bevor
gedruckt wird.

## Der Weg durch das Werkzeug

```
node .ara/tools/invoice.mjs                              Nummernkreis, offene Belege
node .ara/tools/invoice.mjs --customer <kunde> --new     Beleg anlegen, Nummer vergeben
node .ara/tools/invoice.mjs --check <beleg.md>           Pflichtangaben nach § 14 UStG
node .ara/tools/invoice.mjs --xml <beleg.md>             nur die Rechnungsdaten schreiben
node .ara/tools/invoice.mjs --pdf <beleg.md>             drucken, XML anhängen, eintragen
node .ara/tools/invoice.mjs --validate <datei.pdf>       eine fertige Rechnung prüfen
node .ara/tools/invoice.mjs --void <nummer> --reason "…" eine Nummer stornieren
```

`--new` nimmt die Positionen aus dem jüngsten Angebot der Kundenakte, aus einem
bestimmten (`--from-offer`), aus der Zeile (`--position "Text|Menge|Einheit|Preis"`,
mehrfach) oder gar keine (`--empty`). Es rechnet Zeilensummen, Steuer je Satz und den
Rechnungsbetrag, und es füllt den Briefkopf aus `business/company.md` und die Anschrift
aus der Kundenakte.

**Was es nicht füllt, bleibt als Platzhalter stehen.** Dann hält `pdf.mjs` den Druck an,
wie bei jedem anderen Papier auch.

Abgelegt wird nach `customers/<kunde>/documents/JJJJ-MM-TT-rechnung-JJJJ-NNNN.md`,
Markdown und PDF nebeneinander. Das Markdown bleibt liegen: es ist die Quelle, das PDF
ist der Ausdruck.

## Was ungeprüft bleibt

Der Selbsttest prüft die erzeugte Rechnung, und er sagt dabei, was er **nicht** prüft.
Das ist kein Kleingedrucktes, sondern der Teil, auf den sich niemand berufen darf:

| Geprüft | Nicht geprüft |
|---|---|
| Das XML ist lesbar | gegen das amtliche XSD der UN/CEFACT. Es liegt dem Kit nicht bei, und zur Laufzeit wird nichts geholt |
| Die Ordnung der Elemente stimmt gegen ein Modell im Kit | die Schematron-Regeln der KoSIT und die deutschen Zusatzregeln BR-DE-* |
| Die Geschäftsregeln der EN 16931, soweit am Dokument prüfbar: Summen, Steuer je Gruppe, Pflichtfelder, Codeformen | die Codelisten in voller Länge |
| Der Anhang lässt sich aus dem fertigen PDF zurücklesen und ist derselbe | die Konformität des PDF zu PDF/A-3. Dafür braucht es einen Prüfer wie veraPDF |

**Warum nicht mehr:** ein vollständiger Prüfer für EN 16931 gibt es frei nur als
Java-Programm (Mustang, KoSIT), und Java liegt nicht auf jedem Rechner, auf dem dieses
Kit läuft. Etwas nachzuinstallieren, damit ein Selbsttest grün wird, wäre der falsche
Handel. Also prüft das Kit selbst, was es prüfen kann, und benennt den Rest.

**Wenn es darauf ankommt**, also bevor der erste echte Kunde eine Rechnung bekommt: lass
eine erzeugte Rechnung einmal durch einen fremden Prüfer laufen. Der ZUGFeRD-Prüfdienst
des FeRD und veraPDF sind die üblichen. Das ist eine Sache von einmal, nicht von jedem
Beleg, und es ist eine Entscheidung des Partners, weil dabei eine Rechnung das Haus
verlässt.

## Was nicht ins Kit gehört

- **Eingangsrechnungen.** Das Kit schreibt Ausgangsrechnungen. Was hereinkommt, gehört in
  die Buchhaltung.
- **Zahlungseingänge und Mahnungen.** Der Nummernkreis führt `entwurf`, `gestellt` und
  `storniert`, mehr nicht. Ob bezahlt wurde, weiß das Bankkonto.
- **Die Einkaufspreise des Partners.** Wie im Angebot: sie tauchen in keinem
  Kundendokument auf, auch nicht in einer Zwischensumme.

## Verwandtes

- Angebot und seine Anlagen: `.ara/knowledge/paperwork.de.md`
- Kundenakte, wo Anschrift und Ansprechpartner stehen: `.ara/knowledge/customer-file.de.md`
- Verlauf und Wiedervorlage nach dem Versand: `.ara/knowledge/crm.de.md`
- Preise und was sie hergeben: `.ara/knowledge/pricing.de.md`
