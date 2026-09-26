# Verfahren: eine Fach-App, Mandanten, vier Augen, Belege, Standards

> **Wann brauchst du das?** Neben `.ara/knowledge/app.de.md`, sobald eine App Mandanten oder
> Akten hat, Belege liest, eine Freigabe braucht, die der Einreicher nicht gibt, oder ein
> Exportformat eines anderen Herstellers schreibt. Jeder Abschnitt gehört als Antwort oder als
> Annahme in den Plan.

## Mandanten: wer was sieht

**Wer hineinkommt**, entscheidet das Gerät, **was jemand darin sieht**, die App: das Gerät kennt
keine Mandanten. **Mandanten sind Muster 7**, unter `.ara/templates/app-patterns/clients/`. **Nimm
das Muster, entwirf es nicht neu**: aus einer Beschreibung gebaut, kommt die Trennung jedes Mal
anders heraus. Was es entscheidet:

- **Eine Zuordnung, keine zweite Anmeldung**: je Name aus der Kopfzeile der Anmeldung, welche
  Mandanten er sieht.
- **Zuordnen lässt sich nur ein Name, den die App gesehen hat**, der Schlüssel einer App kann die
  Konten des Geräts nicht auflisten: ein neuer Mitarbeiter öffnet die App einmal, dann kann die
  Verwaltung ihn zuordnen.
- **Der Filter steht im WHERE, nicht in einer Prüfung danach.** Die Ablage wird je Anfrage für einen
  Namen gebaut, der Vorgang eines fremden Mandanten existiert in ihr nicht, und ohne Namen sieht sie
  nichts.
- **Fremd heißt 404, nicht 403**, das sagte, dass es ihn gibt. 403 nur für die Verwaltung.
- **Verwaltung nur für eine Rolle, die der Kontrakt nennt**, eine, die eine Regel als Entscheider
  nennen darf (`freigaben.rollen`) und die Kopfzeile der Rolle tragen kann (`koepfe.rollen`). Passt
  keine, verwaltet niemand, und die App sagt es.
- **Die Verwaltung sieht Vorgänge nur der Mandanten, denen sie zugeordnet ist**, außer der Plan sagt
  anderes.
- **Jede Tabelle mit Daten eines Mandanten trägt den Filter**, das Protokoll einer Auslesung
  eingeschlossen: für die Muster 2 und 6 tut es Muster 8.

Geprüft mit zwei Konten und zwei Mandanten: jeder Weg einmal als der, der nichts sehen darf.

## Freigaben in einer Fach-App

Der Kreis der Entscheider steht in `.ara/knowledge/platform-services.de.md`, „Freigaben: ein Lauf
hält an, ein Mensch entscheidet". **Für eine Fach-App gibt Muster 7 die Regel zurück**: vier
Augen, Entscheider sind die Konten, die dem Mandanten des Vorgangs zugeordnet sind, ohne den
Einreicher. Bleibt niemand, startet kein Lauf, und der Vorgang sagt warum. Ein dort genanntes Konto
ohne Freigabe der App lässt das Gerät den Start mit 400 ablehnen, und dieser Satz steht am
Vorgang. **Eine Entscheidung zählt nur von jemandem, der noch zuständig ist**: das Gerät behält den
Kreis vom Start, darum prüft die App den Entscheider beim Nachziehen gegen die Zuordnung. Wer
entscheidet, wenn einem Mandanten nur einer zugeordnet ist, ist ein Fall für den Plan.

**Wie die Vorlage es trägt.** Einreicher und Regel schickt sie nur, wenn `arasul.json` unter
`freigaben` sagt, dass das Gerät sie annimmt: ein älteres Gerät lehnt unbekannte Felder ab. `regel`
im Kern gibt die Regel zurück, ein Satz statt einer Regel startet keinen Lauf; `zustaendig` prüft
eine Entscheidung beim Nachziehen; `VIER_AUGEN` in `server.mjs` schließt den Einreicher aus. Ein
Vorgang, der eine Regel verlangt, die das Gerät nicht annimmt, startet keinen Lauf und sagt warum:
eine Freigabe, die jeder sehen könnte, ist schlimmer als keine. Der Flow bekommt die Nummer des
Vorgangs und den Einreicher, sonst nichts.

## Dokumente und Bilder auslesen

Die App schickt die Datei und ein JSON-Schema, das Gerät holt den Text heraus und lässt ein
Sprachmodell die Felder füllen. Der Weg steht in `arasul.json` unter `wege.dokument_auslesen`, der
Code ist Muster 6 unter `.ara/templates/app-patterns/extract/`.

**Das Modell sieht Text, nicht das Bild.** Ein PDF mit Textschicht liest das Gerät direkt, ein Foto
oder ein gescanntes PDF geht durch seine Texterkennung, und die Antwort sagt, ob sie lief. Ein
schiefes, unscharfes Foto, Handschrift, ein Stempel über der Zahl kosten Felder. Gemessen am
25.09.2026 am Orin, erfundene Belege als PDF mit Textschicht und als Foto: je sechs von sechs
Feldern.

**Form der Antwort und Weg für ein Bild stehen im Kontrakt.** `--contract` nennt unter „Was
`document/extract-structured` antwortet" jedes Feld mit Typ; `data` ist ein Objekt oder null, nicht
gegen dein Schema geprüft. „Ein Bild an ein Modell" sagt, wie die App ein Foto selbst einem
Bildmodell gibt, in der Vorlage `geraet.fragen` mit `bilder`. Am 26.09.2026 am Orin, ein
Tankbeleg als Foto: ein Bildmodell sechs von sechs Feldern, die Texterkennung fünf, ein anderes
zwei. Für Fotos nennt die App das Modell und misst beide Wege. **Versprich kein Bildverständnis**, keine Handschrift, kein Warenfoto, bevor
du es am Gerät des Kunden gesehen hast.

**Welches Modell liest, sagt die Antwort** (`model`), und beim Auslesen nennt die App keines. **Das Feld
`modelle` in `app.json` ist eine Forderung, keine Lieferung**: das Gerät installiert kein Modell,
beim Einspielen sagt es, welches fehlt. Leer, wie in der Vorlage, heißt keines mit Namen.

**Das Modell schlägt vor, die App prüft, ein Mensch entscheidet.** Die App hält die Felder gegen
das Schema und ihre fachlichen Regeln, ein Konto, das im Kontenrahmen fehlt, ein Steuersatz, der
nicht passt, schreibt jeden Befund an die Auslesung und startet einen Flow mit Freigabe darüber.
Jede Auslesung ist eine neue Zeile im Protokoll, mit Modell, Dauer, Texterkennung und wer sie
ausgelöst hat, nie geändert, auch wenn das Dokument geht. **Auch das Gerät protokolliert jeden
Modellaufruf, mit dem Menschen nur, wenn die App ihn nennt**: `geraet.auslesen` und
`geraet.fragen` nehmen `nutzer`, den Namen aus `angemeldet`, und reichen ihn weiter, wie
`--contract` unter „Wer einen Modellaufruf ausgelöst hat" sagt; `auftrag` ordnet eine Auslesung
dieser Zeile zu. Eine halbe Minute ist normal, Minuten, wenn das Modell erst geladen wird. Ohne den Bereich, den der Kontrakt nennt, bekommt der Schlüssel
eine 403, eine Entscheidung des Administrators.

## Fachstandards

Der DATEV-Buchungsstapel (EXTF), ein Kontenrahmen wie SKR03, die GoBD, XRechnung: **keine
Produktwerte**, darum gilt „nicht das Internet" (`.ara/knowledge/live-knowledge.de.md`) für sie
nicht, und weder Kontrakt noch Gerät noch Kit tragen sie. Sie kommen aus ihrer **Primärquelle**,
der Entwicklerdokumentation oder dem Hilfe-Center des Herausgebers, dem Schreiben des
Bundesministeriums der Finanzen, der Norm, **mit Adresse und Abrufdatum**, im Plan und im Kopf der
Datei, die das Format schreibt. Ein Repository oder ein Blog dient zum Gegenlesen und wird als
solche Quelle genannt. Eine Quelle, die nur im Browser lädt: `.ara/knowledge/browser.de.md`.

**Aufbewahrungspflichten**: ein Beleg, der Jahre bleiben muss, bekommt kein Löschen (Muster 2
bringt eines mit, nimm es heraus). Wie lange das Gerät seine Sicherungen hält, steht im
Admin-Handbuch am Gerät.

Was sich nicht prüfen ließ, ein Prüfprogramm, das nicht zur Hand war, eine Spalte, die zwei Quellen
verschieden schreiben, steht als Annahme im Plan. **Vor dem Live-Schalten** geht eine Beispieldatei
an den, der sie verarbeitet, den Steuerberater mit seinem Import, und seine Antwort ist der
Nachweis. Ein Prüfskript für das Format gehört in die App und läuft bei jedem Export im Teststand.
Versprochen wird nicht „GoBD-konform" oder „DATEV-zertifiziert", sondern was die App tut: welches
Format, welche Fassung, nachvollziehbar woran.
