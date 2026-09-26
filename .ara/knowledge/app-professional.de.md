# Verfahren: eine Fach-App, Mandanten, vier Augen, Belege, Standards

> **Wann brauchst du das?** Neben `.ara/knowledge/app.de.md`, sobald eine App Mandanten oder
> Akten hat, Belege liest, eine Freigabe braucht, die der Einreicher nicht gibt, oder ein
> Exportformat eines anderen Herstellers schreibt. Jeder Abschnitt gehört als Antwort oder als
> Annahme in den Plan.

## Mandanten: wer was sieht

**Wer hineinkommt**, entscheidet das Gerät, **was jemand darin sieht**, die App: das Gerät kennt
keine Mandanten. **Mandanten sind Muster 7**, unter `.ara/templates/app-patterns/clients/`. **Nimm
das Muster, entwirf es nicht neu**: aus einer Beschreibung gebaut, kommt die Trennung jedes Mal
anders heraus. **Jede Tabelle mit Daten eines Mandanten trägt den Filter**, das Protokoll einer
Auslesung eingeschlossen: für die Muster 2 und 6 tut es Muster 8. Geprüft mit zwei Konten und zwei
Mandanten: jeder Weg einmal als der, der nichts sehen darf.

## Freigaben in einer Fach-App

**Zwei Fragen gehören in den Plan: wann ein Vorgang vollständig ist, und wer freigibt.** Eine
Kanzlei gibt einen Abschluss erst frei, wenn alle Unterlagen da sind, und nur ein Partner gibt frei,
nicht jeder Kollege, der den Mandanten sieht. Ein Vorgang entsteht **in Arbeit**, und
`einreichen(id)` im Kern der Vorlage fragt vorher `bereit`: ein Vorgang, der nicht vollständig ist,
bleibt in Arbeit ohne Lauf, mit dem Satz, was fehlt. **Nach dem Einreichen ändert sich nichts
mehr**: `darfAendern` gilt nur in Arbeit, die Muster 2, 7 und 8 antworten auf Anhängen, Ändern,
Löschen und neues Auslesen mit 409.

**Sehen heißt nicht entscheiden.** Muster 7 markiert an jeder Zuordnung, ob das Konto entscheidet,
`regel` gibt vier Augen und nur die Entscheider des Mandanten. Bleibt niemand, startet kein Lauf,
und der Vorgang sagt warum. Der Kreis steht in `.ara/knowledge/platform-services.de.md`, „Freigaben:
ein Lauf hält an, ein Mensch entscheidet". Ein dort genanntes Konto ohne Freigabe der App lässt das
Gerät den Start mit 400 ablehnen, dieser Satz steht am Vorgang. **Eine Entscheidung zählt nur von
jemandem, der noch entscheidet**: das Gerät behält den Kreis vom Start, darum prüft die App den
Entscheider beim Nachziehen gegen die Zuordnung.

**Wie die Vorlage es trägt.** Einreicher und Regel gehen nur mit, wenn `arasul.json` unter
`freigaben` sagt, dass das Gerät sie annimmt. `regel` gibt die Regel, ein Satz startet keinen Lauf;
`zustaendig` prüft eine Entscheidung; `VIER_AUGEN` in `server.mjs` schließt den Einreicher aus. Der
Flow bekommt die Nummer des Vorgangs und den Einreicher, sonst nichts. Nach der Freigabe fragt die
App nach dem Satz des Flows, bis der Lauf fertig ist.

## Dokumente und Bilder auslesen

Die App schickt die Datei und ein JSON-Schema, das Gerät lässt ein Sprachmodell die Felder füllen:
Muster 6 unter `.ara/templates/app-patterns/extract/`. **Das Modell sieht Text, nicht das Bild**:
ein Foto oder ein Scan geht durch die Texterkennung des Geräts, und ein unscharfes Foto,
Handschrift, ein Stempel über der Zahl kosten Felder.

**Die Form der Antwort steht im Kontrakt**: `--contract` nennt unter „Was
`document/extract-structured` antwortet" jedes Feld mit Typ; `data` ist ein Objekt oder null, nicht
gegen dein Schema geprüft. Ein Foto kann die App auch selbst einem Bildmodell geben („Ein Bild an
ein Modell" im Kontrakt); Bildmodelle unterscheiden sich stark, darum miss beide Wege. **Versprich
kein Bildverständnis**, keine Handschrift, kein Warenfoto, bevor du es am Gerät des Kunden gesehen
hast.

**Welches Modell liest, sagt die Antwort** (`model`). **Das Feld `modelle` in `app.json` ist eine
Forderung, keine Lieferung**: das Gerät installiert kein Modell, beim Einspielen sagt es, welches
fehlt. Leer, wie in der Vorlage, heißt keines mit Namen.

**Das Modell schlägt vor, die App prüft, ein Mensch entscheidet.** Die App hält die Felder gegen
das Schema und ihre fachlichen Regeln, ein Steuersatz, der nicht passt, schreibt jeden Befund an
die Auslesung und startet einen Flow mit Freigabe darüber. Jede Auslesung ist eine neue Zeile im
Protokoll, nie geändert. **Das Gerät protokolliert diese Aufrufe, mit dem Menschen nur, wenn die App
ihn nennt**: `nutzer`, der Name aus `angemeldet`; `auftrag` ordnet eine Auslesung dieser Zeile zu.
Eine halbe Minute ist normal, Minuten, wenn das Modell erst geladen wird.

## Fachstandards

Der DATEV-Buchungsstapel (EXTF), ein Kontenrahmen wie SKR03, die GoBD, XRechnung: **keine
Produktwerte**, darum gilt „nicht das Internet" (`.ara/knowledge/live-knowledge.de.md`) für sie
nicht, und weder Kontrakt noch Gerät noch Kit tragen sie. Sie kommen aus ihrer **Primärquelle**,
der Entwicklerdokumentation des Herausgebers, dem Schreiben des Bundesministeriums der Finanzen, der
Norm, **mit Adresse und Abrufdatum**, im Plan und im Kopf der Datei, die das Format schreibt. Ein
Repository oder ein Blog dient zum Gegenlesen. Eine Quelle, die nur im Browser lädt:
`.ara/knowledge/browser.de.md`.

**Eine CSV für Excel oder den Steuerberater** geht durch `backend/kern/csv.mjs` der Vorlage: BOM,
Semikolon, Dezimalkomma, und eine Zelle, die mit `=`, `+`, `-`, `@`, Tab oder CR beginnt, bekommt ein
Hochkomma davor. **Aufbewahrungspflichten**: ein Beleg, der Jahre bleiben muss, bekommt kein Löschen
(Muster 2 bringt eines mit, nimm es heraus). Wie lange das Gerät seine Sicherungen hält, steht im
Admin-Handbuch.

Was sich nicht prüfen ließ, steht als Annahme im Plan. **Vor dem Live-Schalten** geht eine
Beispieldatei an den, der sie verarbeitet, den Steuerberater mit seinem Import, und seine Antwort ist
der Nachweis. Ein Prüfskript für das Format gehört in die App und läuft bei jedem Export im
Teststand. Versprochen wird nicht „GoBD-konform" oder „DATEV-zertifiziert", sondern was die App tut:
welches Format, welche Fassung, nachvollziehbar woran.
