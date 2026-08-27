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
`.ara/tools/lib/version.mjs`.

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
