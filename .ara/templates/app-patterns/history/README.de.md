# Muster 10: der Verlauf eines Vorgangs, wer was wann

„Nachvollziehbar, wer was wann“ wünscht sich fast jede Büro-App. Dieses Muster führt je Vorgang einen
Verlauf, an den nur angehängt wird: angelegt, eingereicht, genehmigt oder abgelehnt (von wem, mit
Begründung), nicht gezählt, abgeschlossen (mit dem, was ein Mensch am Vorschlag geändert hat).
Überblick: `.ara/knowledge/app-patterns.de.md`.

**Einhängen**: `node .ara/tools/app.mjs --app <app> --add-pattern history`, dann `--build`. Es braucht
kein anderes Muster; mit Muster 7 folgt der Verlauf der Sicht des Mandanten.

**Wie es geht**: der Kern der Vorlage meldet jedes Ereignis eines Vorgangs an `melden` in
`server.mjs`, auch den Abschluss eines Laufs. Ohne dieses Muster hört niemand zu; mit ihm hört der
Verlauf zu (`mitschreiber.push`) und schreibt eine Zeile in die Tabelle `verlauf` (Migration `050`).
Die Ablage kennt nur `anhaengen` und `amVorgang`: kein Weg ändert oder löscht eine Zeile. Eigene
Ereignisse (Beleg angehängt, Feld geändert) gehen an dieselbe Stelle:
`await melden({ vorgang, was, wer, angaben })`.

**Wer ihn sieht**: `GET /vorgaenge/<nr>/verlauf`, wer den Vorgang sieht; ein fremder ist 404, auch im
Test „fremde Akte“ des Musters 7. Die Einzelheiten eines Vorgangs zeigen ihn als letzte Angabe.

**Wann**: die Zeit ist die, zu der die App es erfuhr. Eine Entscheidung erfährt sie beim nächsten
Nachziehen, Sekunden später; nennt das Gerät den Zeitpunkt der Entscheidung (`entschieden_am`), steht
er im Eintrag.

**Vom Selbsttest geprüft**: angelegt, eingereicht, vom Entscheider genehmigt, abgeschlossen mit der
Änderung des Betrags, in dieser Reihenfolge; ein fremder Vorgang 404; Löschen 405.
