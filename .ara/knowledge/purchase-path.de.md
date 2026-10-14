# Nachweis: der Kaufweg, Schritt für Schritt

> **Wann brauchst du das?** Wenn jemand wissen will, wie ein Verkauf durch das Kit läuft, von der
> ersten Anfrage bis zum Geld, oder wenn ein Schritt davon geändert wurde und neu belegt werden muss.

Es ist der Weg eines Partners, der einem Kunden ein Arasul-Gerät verkauft. Jeder Schritt nennt den
Befehl, was er hinterlässt und was der Probelauf gezeigt hat. **Der Probekunde war PROBE-KW14**, am
14.10.2026, in einem Wegwerf-Haus mit erfundenen Zahlen und einer Testkontonummer. Es ging keine Mail
raus, nirgends wurde ein Konto angelegt, das Gerät blieb unberührt. Der Selbsttest spielt denselben
Weg ohne Netz nach: `node .ara/tools/selftest.mjs`, die Prüfung "Der Kaufweg ohne Netz".

## Die Schritte

| Nr | Schritt | Befehl | Was liegt danach da |
|---|---|---|---|
| 1 | Die Anfrage kommt | von Hand, in deinen Worten | noch nichts: das Kontaktformular der Website ist Sache der Website, nicht des Kits |
| 2 | Kundenakte | `node .ara/tools/customer.mjs --customer probe-kw14 --new --legal-name "PROBE-KW14 GmbH"` | `customers/probe-kw14/customer.md`. Straße, PLZ und Ort trägst du von Hand ein, die Rechnung braucht sie |
| 3 | Liegt jeder Preis vor | `node .ara/tools/calculation.mjs` | zehn Zahlen oder die Liste der fehlenden |
| 4 | Angebot als PDF | `.ara/vorlagen/angebot.md` ausfüllen, dann `node .ara/tools/pdf.mjs <angebot>.md` | das Angebot als PDF. Es weigert sich, solange ein Platzhalter drinsteht |
| 5 | Lizenzcode | siehe "Der Lizenzcode" unten | die Stufe, die das Gerät meldet |
| 6 | Rechnung als PDF | `node .ara/tools/invoice.mjs --customer probe-kw14 --new --from-offer <angebot>.md`, `--check`, `--pdf` | Rechnung 2026-0001 mit der Datendatei darin, Stand `gestellt` |
| 7 | Zahlung eingegangen | `node .ara/tools/invoice.mjs --paid 2026-0001 --on <datum>` | Stand `bezahlt` in `business/invoices.md`, mit dem Tag |
| 8 | Mitschreiben | eine Zeile in `customers/<kunde>/history/`, Status in der Akte | der Verlauf |

## Was der Probelauf gezeigt hat

- **Schritt 2.** Der Ordnername muss klein sein: `PROBE-KW14` wird abgelehnt, `probe-kw14` geht, und
  `PROBE-KW14 GmbH` bleibt der Rechtsname.
- **Schritt 4.** Das Angebot füllt Ara aus der Vorlage, es gibt keinen Befehl, der es aus dem
  Kalkulationsblatt schreibt. Das ist Absicht, ein Mensch liest es, bevor es rausgeht. Die Anlagen 1
  und 5 brauchen den Spiegel und das Gerät (`.ara/knowledge/paperwork.de.md`), die ein Wegwerf-Haus
  nicht hat: sie blieben offen, und das Probeangebot sagt es in seinem eigenen Text.
- **Schritt 6.** Eine Rechnung aus dem Angebot war vollständig, sobald die Anschrift des Kunden
  eingetragen war. `--check` und `--validate` waren grün, das PDF trägt die Datendatei.
- **Schritt 7.** **Dieser Schritt fehlte.** Der Nummernkreis kannte `entwurf`, `gestellt` und
  `storniert`, und nichts für Geld. `--paid` ist neu: es geht nur an einer Nummer, die als `gestellt`
  steht, nimmt den Tag des Eingangs und setzt den Stand `bezahlt`. **Das Kit sieht in kein
  Bankkonto.** Du vermerkst, was du auf deinem Kontoauszug gesehen hast.

## Der Lizenzcode

Ein gekaufter Code ist der Token aus dem Portal (`ara_` und 32 Zeichen). Das Kit tauscht ihn gegen
eine Lizenz, die an ein Gerät gebunden ist, und spielt sie ein: `node .ara/tools/device.mjs --name
<gerät> --license`, siehe `.ara/knowledge/device.de.md`, "Die Lizenz". Das ist ein Eingriff der
Stufe 2 an einem echten Gerät und wurde im Probelauf **nicht** gemacht.

Was der Probelauf offline belegt hat, im Selbsttest: Portal und Gerät sind Attrappen, die Schlüssel
entstehen für den Lauf. Das Portal gibt für einen Fingerabdruck eine Lizenz heraus, das Attrappen-Gerät
prüft ihre Signatur selbst und meldet daraus die Stufe, und `unlock` des Kits sagt "professional",
ohne Code oder Lizenz zu zeigen. Eine nachträglich geänderte Lizenz (Stufe `enterprise` statt
`professional`) besteht die Prüfung nicht.

**Was das Kit nicht kann:** eine echte Lizenz machen. Den privaten Schlüssel hat nur der Hersteller,
er liegt in dessen Schlüsselbund. Ein Partner bekommt den Code nach dem Kauf aus dem Portal.

## Offen

- **Eine Zeile im Verlauf nach einer Zahlung.** `--paid` erinnert daran, schreibt aber nichts nach
  `customers/<kunde>/history/`. Vorerst von Hand.
- **Das Angebot hat kein Werkzeug.** Ausfüllen, prüfen, drucken sind drei getrennte Handgriffe.
- **Die Einheit in der Rechnung steht als `Stueck`** in ASCII-Schreibweise in der gedruckten Tabelle.
  Nicht Teil dieses Auftrags, vermerkt.
