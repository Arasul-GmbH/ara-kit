# Vorlagen: das Papier

Hier liegen die Dokumente, die ein **Partner seinem Kunden gibt**. Sie sind der einzige
Ort dafür. Wer eine zweite Kopie anlegt, hat beim nächsten Stand zwei verschiedene
Wahrheiten.

Das Verfahren, in welcher Reihenfolge welches Papier entsteht, steht in
`.ara/knowledge/paperwork.md`. Diese Datei sagt nur, was es gibt.

| Datei | Wer unterschreibt | Wofür |
| --- | --- | --- |
| `angebot.md` | der Kunde nimmt an | Angebot des Partners, mit seinen fünf Anlagen. Absender ist der Partner |
| `leistungsbeschreibung.md` | niemand, sie ist Anlage 1 | legt fest, was geschuldet ist. Entsteht am Gerät und gegen den Spiegel, nicht am Schreibtisch: `node .ara/tools/service-description.mjs --device <gerät>` füllt, was gemessen wurde |
| `rechnung.md` | niemand, sie wird bezahlt | Rechnung des Partners. Wird nicht von Hand gefüllt: `node .ara/tools/invoice.mjs --customer <kunde> --new` macht daraus einen Beleg mit Nummer, Positionen und Summen |
| `endkundenbedingungen.md` | der Endkunde, Anlage 2 | er hat mit Arasul keinen Vertrag, also braucht es diese Bedingungen |
| `drittlizenzen.md` | niemand, sie ist Anlage 3 | trägt Block W5 in den Endkundenbedingungen und in den Verträgen von Arasul |
| `uebergabeprotokoll.md` | Kunde und Partner bei der Abnahme | **das rechtliche Papier.** Jede Zeile braucht einen Nachweis |
| `bausteine/W1` bis `W5` | nichts davon allein | Textblöcke, die in mehreren Verträgen **wortgleich** stehen müssen |

Die Anlagen 4 und 5 liegen nicht hier, sondern in `.ara/nachweise/`: der Nachweis zur
KI-Einstufung und der Nachweis zur Datenverarbeitung. Sie gehören in jedes Angebot.

## Was hier nicht liegt, und warum

Vier Papiere sind Arasuls eigene und werden von Arasul verschickt. Sie tragen Arasuls
Absender, seine USt-IdNr. und seine Unterschrift, und ein Partner füllt sie nicht aus:

| Papier | Wer schließt es |
| --- | --- |
| Partnervertrag | Arasul und der Partner. Der Partner **bekommt** ihn |
| Kaufvertrag | Arasul und ein Direktkunde |
| Vereinbarung zur Auftragsverarbeitung | Arasul ist dort der Auftragsverarbeiter, nicht der Partner |
| Arasuls eigenes Angebot | Arasul an seinen Kunden |

Wer eines davon braucht, fragt bei Arasul. **Den Kaufvertrag zwischen dem Partner und
seinem Kunden liefert das Kit nicht**, weil es nicht weiß, unter welchen Bedingungen der
Partner verkauft. Was aus dem Angebot zwingend darin auftauchen muss, steht in
`.ara/knowledge/paperwork.md` unter "Vorbehalte, die weiterwandern".

## Was hier nicht bearbeitet wird

`bausteine/`, `uebergabeprotokoll.md` und der Ordner `.ara/nachweise/` werden aus Arasuls
Steuerungsordner gespiegelt. Jede Änderung daran wird beim nächsten Spiegeln
überschrieben. Wer darin einen Fehler findet, sagt es Arasul, statt ihn hier zu beheben.

`uebergabeprotokoll.md` und die Dateien in `.ara/nachweise/` tragen dazu einen Vermerk im Kopf.
Die Bausteine tragen keinen, **weil ihr Text wortgleich in die Verträge wandert** und ein
Vermerk dort mitwandern würde.

## Zwei Papiere heißen fast gleich, sind aber verschieden

`.ara/vorlagen/uebergabeprotokoll.md` ist das **rechtliche** Papier: was übergeben
wurde, welche Funktion nachgewiesen wurde, mit Unterschrift. Es zählt ein Jahr
später vor Gericht.

`.ara/templates/handover.md` ist die **technische** Abnahme aus dem Laufzettel:
wie man herankommt, was geprüft wurde, wer hilft. Sie zählt am Montag danach,
wenn beim Kunden etwas nicht geht.

Beide entstehen bei derselben Übergabe. Keines ersetzt das andere.
