# Vorlagen: das Papier

Hier liegen die Dokumente, die ein **Partner seinem Kunden gibt**. Sie sind der einzige
Ort dafuer. Wer eine zweite Kopie anlegt, hat beim naechsten Stand zwei verschiedene
Wahrheiten.

Das Verfahren, in welcher Reihenfolge welches Papier entsteht, steht in
`.ara/knowledge/paperwork.md`. Diese Datei sagt nur, was es gibt.

| Datei | Wer unterschreibt | Wofuer |
| --- | --- | --- |
| `angebot.md` | der Kunde nimmt an | Angebot des Partners, mit seinen fuenf Anlagen. Absender ist der Partner |
| `leistungsbeschreibung.md` | niemand, sie ist Anlage 1 | legt fest, was geschuldet ist. Entsteht am Gerät und gegen den Spiegel, nicht am Schreibtisch: `node .ara/tools/service-description.mjs --device <gerät>` füllt, was gemessen wurde |
| `endkundenbedingungen.md` | der Endkunde, Anlage 2 | er hat mit Arasul keinen Vertrag, also braucht es diese Bedingungen |
| `drittlizenzen.md` | niemand, sie ist Anlage 3 | traegt Block W5 in den Endkundenbedingungen und in den Vertraegen von Arasul |
| `uebergabeprotokoll.md` | Kunde und Partner bei der Abnahme | **das rechtliche Papier.** Jede Zeile braucht einen Nachweis |
| `bausteine/W1` bis `W5` | nichts davon allein | Textbloecke, die in mehreren Vertraegen **wortgleich** stehen muessen |

Die Anlagen 4 und 5 liegen nicht hier, sondern in `.ara/nachweise/`: der Nachweis zur
KI-Einstufung und der Nachweis zur Datenverarbeitung. Sie gehoeren in jedes Angebot.

## Was hier nicht liegt, und warum

Vier Papiere sind Arasuls eigene und werden von Arasul verschickt. Sie tragen Arasuls
Absender, seine USt-IdNr. und seine Unterschrift, und ein Partner fuellt sie nicht aus:

| Papier | Wer schliesst es |
| --- | --- |
| Partnervertrag | Arasul und der Partner. Der Partner **bekommt** ihn |
| Kaufvertrag | Arasul und ein Direktkunde |
| Vereinbarung zur Auftragsverarbeitung | Arasul ist dort der Auftragsverarbeiter, nicht der Partner |
| Arasuls eigenes Angebot | Arasul an seinen Kunden |

Wer eines davon braucht, fragt bei Arasul. **Den Kaufvertrag zwischen dem Partner und
seinem Kunden liefert das Kit nicht**, weil es nicht weiss, unter welchen Bedingungen der
Partner verkauft. Was aus dem Angebot zwingend darin auftauchen muss, steht in
`.ara/knowledge/paperwork.md` unter "Vorbehalte, die weiterwandern".

## Was hier nicht bearbeitet wird

`bausteine/`, `uebergabeprotokoll.md` und der Ordner `.ara/nachweise/` werden aus Arasuls
Steuerungsordner gespiegelt. Jede Aenderung daran wird beim naechsten Spiegeln
ueberschrieben. Wer darin einen Fehler findet, sagt es Arasul, statt ihn hier zu beheben.

`uebergabeprotokoll.md` und die Dateien in `.ara/nachweise/` tragen dazu einen Vermerk im Kopf.
Die Bausteine tragen keinen, **weil ihr Text wortgleich in die Vertraege wandert** und ein
Vermerk dort mitwandern wuerde.

## Zwei Papiere heissen fast gleich, sind aber verschieden

`.ara/vorlagen/uebergabeprotokoll.md` ist das **rechtliche** Papier: was uebergeben
wurde, welche Funktion nachgewiesen wurde, mit Unterschrift. Es zaehlt ein Jahr
spaeter vor Gericht.

`.ara/templates/handover.md` ist die **technische** Abnahme aus dem Laufzettel:
wie man herankommt, was geprueft wurde, wer hilft. Sie zaehlt am Montag danach,
wenn beim Kunden etwas nicht geht.

Beide entstehen bei derselben Uebergabe. Keines ersetzt das andere.
