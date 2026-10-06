# Muster 9: Buchungsstapel für den Steuerberater (DATEV)

Für ein Büro, das Bücher führt oder vorbereitet: Die App macht aus freigegebenen Buchungen die Datei,
die der Steuerberater in DATEV einliest, und prüft diese Datei, bevor jemand sie herunterlädt. Der
Überblick über alle Muster: `.ara/knowledge/app-patterns.de.md`. Was die Vorschriften eines fremden
Formats für eine App bedeuten: `.ara/knowledge/app-professional.de.md`, „Fachstandards".

## In einfachen Worten

DATEV ist das Programm, in dem die meisten Steuerberater in Deutschland die Bücher führen. Es liest
Buchungen aus einer Textdatei mit festem Aufbau. Stimmt ein Komma oder ein Datum nicht, lehnt DATEV die
ganze Datei ab, oder schlimmer, nimmt sie mit einer falschen Buchung auf. Dieses Muster bringt drei
Dinge mit:

1. **Einen Schreiber**, der aus den Buchungen deiner App die Datei macht.
2. **Eine Liste von Konten** (SKR03, der Kontenrahmen, den viele kleine Betriebe nutzen), die die App
   vorschlagen darf, und eine Prüfung, die einen Vorschlag gegen die Liste hält. Eine Buchung, die
   nicht passt, sieht der Mensch, der freigibt. Sie wird nicht versteckt.
3. **Ein Prüfskript**, das die fertige Datei liest und sagt: das ist in Ordnung, oder dieses Feld in
   dieser Zeile ist falsch. Die App lässt es vor jedem Herunterladen laufen. Eine Datei, die es nicht
   besteht, wird nicht herausgegeben.

**Was es nicht tut.** Es sagt nicht, welches Konto zu welchem Beleg gehört, das ist Sache des
Steuerberaters. Es kennt die Bücher deines Kunden nicht und weiß deshalb nicht, ob ein Konto dort
angelegt ist. Es ist nicht „von DATEV zertifiziert". **Bevor die App live geht, schickst du dem
Steuerberater, der die Datei einliest, eine Probedatei. Seine Antwort ist der Beweis**, nicht dieses
Skript.

## Das Format und woher es kommt

Geschrieben nach dem **DATEV-Format, Buchungsstapel, Versionsnummer 700, Formatversion 13**:
Windows-1252, Semikolon, Dezimalkomma, CR LF, 31 Felder in der ersten Zeile, 125 Spalten in der zweiten.

Primärquelle: DATEV Developer Portal, „DATEV-Format", **abgerufen am 02.10.2026**:

- `https://developer.datev.de/de/file-format/details/datev-format/format-description/header`
- `https://developer.datev.de/de/file-format/details/datev-format/format-description/booking-batch`
- `https://developer.datev.de/de/file-format/details/datev-format/format-description/sample-data`
- `https://developer.datev.de/de/file-format/details/datev-format/character-set`

Diese Seiten laden nur im Browser (`.ara/knowledge/browser.de.md`). Dieselben Angaben stehen im Kopf von
`backend/kern/extf-format.mjs`, mit dem Ausdruck der Quelle für jedes Feld. **Veröffentlicht DATEV eine
neuere Formatversion, ist dieses Muster veraltet**: die vier Adressen ansehen, `extf-format.mjs` an
einer Stelle ändern und das neue Datum in den Kopf schreiben. Schreiber und Prüfskript lesen beide diese
Datei.

**Mit Absicht offen.** Der Ausdruck der Quelle für den Steuerschlüssel (Feld „BU-Schlüssel") verlangt
vier Ziffern in Anführungszeichen, ihre eigene Musterdatei lässt das Feld leer, und dieses Muster
schreibt den Schlüssel so, wie ihn der Kontenrahmen kennt (`9`, `8`), in Anführungszeichen. Das
Prüfskript führt das als Hinweis auf, nicht als Fehler. Der Einlesetest beim Steuerberater entscheidet
es. Offen ist auch, dass die Schlüssel 8 und 9 auf jedem Konto der Liste stimmen.

## Die Dateien

| Datei | Was sie tut |
| --- | --- |
| `backend/kern/extf-format.mjs` | Das Format, wie die Quelle es sagt: Kopffelder, 125 Spaltennamen, ein Ausdruck je Feld |
| `backend/kern/datev.mjs` | `buchungsstapel({ mandant, buchungen })`: Dateiname, Bytes, die Nummern, die hineinkamen, und die Buchungen, die es abgelehnt hat, jede mit Grund |
| `backend/kern/skr03.mjs` | `KONTEN`, `GEGENKONTEN`, `KATEGORIEN` und `pruefen`: ein Vorschlag gegen die Listen, jede Korrektur mit Grund |
| `backend/pruefen/stapel.mjs` | Das Prüfskript, auch aufrufbar als `node backend/pruefen/stapel.mjs <Datei>` |
| `backend/wege/datev.mjs` | Zwei Wege: `GET /datev/vorschau?mandant=` und `GET /datev/stapel?mandant=` |

**Einhängen**: den Ordner `backend` in die App kopieren, die Zeilen aus dem Kopf von
`backend/wege/datev.mjs` in `server.mjs` setzen und auf der Seite des Mandanten einen Knopf „Für den
Steuerberater herunterladen" anlegen, der `datev/stapel?mandant=<Nummer>` öffnet. Zeig vorher die
Vorschau: sie nennt die Buchungen, die draußen bleiben, und warum. Dann `--build`.

**Wer herunterladen darf.** Der Weg fragt deine Funktion `stapel`, und die sagt, ob dieser Mensch
diesen Mandanten sieht. Bei einem fremden Mandanten antwortet sie `null`, und der Weg antwortet 404
(Muster 7, `.ara/knowledge/app-patterns.de.md`). Der Weg schreibt nichts: ob eine Buchung nach dem
Herunterladen als „übergeben" gilt, entscheidet deine App, und dafür gehört eine Freigabe davor.

**Die Listen ersetzen.** `KONTEN`, `GEGENKONTEN` und `KATEGORIEN` in `skr03.mjs` sind eine
Beispielauswahl. Setz die Konten des Hauses ein und lass sie vom Steuerberater durchsehen. **Die
Freigabe nimmt dieselbe Liste**: der Ordner bringt `backend/kern/feldlisten.mjs` mit, das die der
Vorlage ersetzt, und das Feld `konto` einer Freigabe zeigt dann den Namen des vorgeschlagenen
Kontos, nimmt keines, das nicht in der Liste steht, und fragt einmal nach, wenn jemand es auf ein
anderes ändert. Heißt das Feld im Flow anders, steht dort dessen Name.

## Was der Schreiber mit Absicht tut

- **Keine Buchung rutscht still hinein oder heraus.** Eine Buchung ohne Betrag, mit einem Datum, das es
  nicht gibt, oder außerhalb des Wirtschaftsjahres des Mandanten bleibt draußen und wird gemeldet. Das
  Jahr eines Datums steht nicht in der Zeile, sondern im Kopf der Datei, ein Beleg vom Vorjahr bekäme
  sonst ein falsches Datum.
- **Nicht in DATEV festschreiben.** Die Datei sagt „nicht festgeschrieben" (0), der Steuerberater
  schreibt in DATEV fest.
- **Texte werden gereinigt**: Steuerzeichen raus, Anführungszeichen verdoppelt, ein Text, der mit `=`,
  `+`, `-` oder `@` beginnt, bekommt ein Leerzeichen davor, damit eine Tabellenkalkulation ihn nicht als
  Formel liest.
- **Zeit in UTC.** Der Container kennt keine Ortszeit.

## Was das Prüfskript findet

Falscher Zeichensatz (UTF-8-Marke, UTF-8 ohne Marke, UTF-16), ein Zeilenende ohne CR, eine Kopfzeile,
die in einem ihrer 31 Felder von der Quelle abweicht oder eine andere Formatversion trägt, eine
Spaltenzeile, die um ein Wort abweicht, eine Zeile mit anderer Zahl von Feldern, ein Feld, das nicht zum
Ausdruck der Quelle passt, ein Betrag von null, ein Konto, das nicht zur Kontenlänge passt, ein Datum,
das es nicht gibt oder das außerhalb des Zeitraums im Kopf liegt, „festgeschrieben" statt „nicht
festgeschrieben". **Vom Selbsttest geprüft**: eine gute Datei besteht, und jeder dieser Fehler, von Hand
in eine gute Datei gemacht, fällt mit der richtigen Zeile und dem richtigen Feld durch.

**Am Orin geprüft**: eine Probe-App aus der Vorlage mit diesem Muster hat am Gerät eine Datei
geschrieben, und das Prüfskript hat sie bestanden. Den Kontenplan und den Einlesetest eines echten
Kunden prüfst du mit ihm.
