# Das Designsystem: die Bausteine, aus denen eine App gebaut wird

Eine App läuft in einem Rahmen mitten in der Oberfläche von Arasul. Der Mensch davor sieht
nicht zwei Programme, er sieht einen Bildschirm. Zwei Erscheinungsbilder darauf sind kein
Geschmack, sondern ein Fehler.

Darum gibt es genau eine Bibliothek für beide Seiten. Sie heißt im Produkt
`packages/marken`, und das Kit spiegelt sie in die App-Vorlage. Wer eine App baut, baut aus
ihren Bausteinen, und dann sieht die App aus wie das Gerät, ohne dass jemand eine Farbe
abgeschrieben hat.

## Die Kette: eine Quelle, zwei Spiegel

| Wo | Was | Wem gehört es |
| --- | --- | --- |
| `packages/marken` im Produkt | die Quelle | dem Produkt |
| `.ara/mirror/packages/marken/src/` | das geholte Artefakt | dem Produkt, hier abgelegt |
| `.ara/templates/app/frontend/src/marken/` | der Spiegel der Vorlage | dem Kit |
| `apps/<app>/frontend/src/marken/` | die Kopie einer App | dem Nutzer |

Der Spiegel der Vorlage steht da, damit ein frischer Klon eine App bauen kann, die aussieht
wie das Gerät, auch auf einem Rechner, der noch kein Arasul gesehen hat. Liegt beim Anlegen
einer App ein Spiegel des Produkts vor, nimmt `--new` die Bibliothek von dort statt aus der
Vorlage: die des Geräts ist die richtige.

Neben jedem Spiegel liegt `mirror.json`: Fassung, Quelle, Datum und je Datei ein Hash. Sie
ist die Antwort auf die Frage, die sonst niemand beantworten kann, nämlich ob eine Datei
nachgezogen oder von Hand geändert wurde.

## Die sechs Bausteine

Sie tragen deutsche Namen, weil sie im Produkt so heißen. Alles, was sie zeichnen, trägt
Klassen mit dem Vorsatz `ara-`, und die Regeln dazu stehen in `marken.css` daneben.

| Baustein | Wofür | Was du wissen musst |
| --- | --- | --- |
| `Kopf` | Der Kopf einer Seite: Titel, ein Satz darunter, Aktionen rechts | Der Titel ist das einzige `h1` der Seite. Unter 900 Pixeln rutschen die Aktionen unter den Titel |
| `Liste` mit `ListenEintrag` | Eine Reihe von Einträgen: eine Datenliste, die Bereiche einer App, was sie aufzählt | Ein Eintrag mit `onKlick` ist ein Knopf und nimmt damit Tastatur und Screenreader mit. `aktiv` markiert die Zeile, auf der man steht |
| `Karte` | Die erhabene Fläche für ein Ding, das für sich steht | Mit `onKlick` wird sie ein Knopf, ohne ihn ein Kasten. Eine Karte, die anklickbar aussieht und keine ist, ist eine Falle |
| `Formular` mit `Feld` und `Knopf` | Eine Eingabe | Es ist ein `form`: die Eingabetaste im letzten Feld sendet ab. `Feld` verlangt eine Kennung, sonst finden Beschriftung und Eingabe nicht zusammen. `Knopf` kennt `still`, `haupt` und `gefahr` |
| `Meldung` | Was das Gerät dem Menschen sagt | Die Art (`hinweis`, `erfolg`, `warnung`, `fehler`) bestimmt die Farbe **und** die Rolle für den Screenreader. Die Art steht immer auch im Text: eine Meldung, die nur an ihrer Farbe zu erkennen ist, ist für manche keine |
| `Menue` | Die Fläche über der Seite, unter 900 Pixeln | Escape schließt, ein Klick auf den Schleier schließt, der Fokus springt hinein und danach zurück, und mit Tab kommt niemand dahinter. Jede Ansicht, die kommt, macht es zu |

Was es heute **nicht** gibt: eine Tabelle, ein Dialog, eine Reiterleiste, eine Fußzeile,
ein Anzeiger für einen Fortschritt. Wer so etwas braucht, baut es in seiner App aus dem,
was da ist, hält sich an die Marken und sagt im Plan, dass es eine eigene Sache ist. Das
Produkt zieht mit weiteren Bausteinen nach; wenn einer davon kommt, wird die eigene Sache
gegen ihn getauscht.

## Wie eine App sie einsetzt

Der Import geht über `@marken`, denselben Alias, unter dem die Oberfläche des Geräts die
Bibliothek kennt. Derselbe Quelltext läuft dort und hier:

```tsx
import { Karte, Kopf, Liste, ListenEintrag, Meldung } from "@marken";
```

Eine Seite ist ein `Kopf` und darunter Bausteine. Was der Ablauf ist, steht in der Seite;
was das Aussehen ist, steht im Baustein. Die Vorlage zeigt drei Fälle, und an ihnen kannst
du dich entlanghangeln:

- **Datenliste** (`seiten/liste.tsx`): `Liste` mit `ListenEintrag` je Zeile, darunter der
  eine ausgewählte als `Karte`. Welcher ausgewählt ist, steht in der Suchanfrage
  (`?nr=17`) und nicht im Zustand der Seite: ein Verweis auf einen Vorgang bleibt damit
  einer, und die Wege der App bleiben eine Ebene tief.
- **Formularseite** (`seiten/neu.tsx`): `Formular` mit `Feld` je Eingabe und `Knopf` in den
  Aktionen. Der eine Hauptknopf trägt `art="haupt"`.
- **Seitenleiste** (`rahmen/seitenleiste.tsx`): `Liste` mit den Bereichen, über 900 Pixeln
  als Spalte, darunter derselbe Inhalt im `Menue`. Die Schwelle steht in
  `rahmen/fenster.ts` und ist dieselbe wie in `marken.css`.

Die Anordnung der Seite gehört der App und nicht der Bibliothek: ein Raster, eine Spalte,
ein Abstand stehen als eigene Regel am Ende von `stil.css`. Farben, Schriften und Rundungen
stehen dort nicht, dafür gibt es die Marken.

## Was verboten ist

Vier Dinge, und jedes hat denselben Grund: sie laufen beim nächsten Stand des Geräts von
der Oberfläche weg, in der die App hängt.

1. **Keine eigene Farbe.** Kein `#1a1a1a`, kein `rgba(...)` in einer Regel dieser App.
   Was eine Farbe braucht, nimmt eine Marke: `var(--ara-kante)`, `var(--ara-akzent)`,
   `var(--ara-text-leise)`. Eine Farbe, die du hinschreibst, ist eine, die beim nächsten
   Thema falsch ist.
2. **Kein eigener Baustein neben einem vorhandenen.** Kein `<div className="karte">`, das
   aussieht wie eine `Karte`. Der Unterschied zwischen den beiden ist in vier Wochen keine
   Entscheidung mehr, sondern ein Zufall.
3. **Nichts im Spiegel ändern.** Der Ordner `frontend/src/marken/` wird **ersetzt**, nicht
   fortgeschrieben. Wer dort eine Zeile ändert, verliert sie beim nächsten Nachziehen, und
   bis dahin meldet sie der Wächter. Was dir an einem Baustein fehlt, gehört ins Produkt
   und nicht in die Kopie.
4. **Keine zweite Schwelle.** Unter 900 Pixeln eine Spalte, darüber die Aufteilung. Wer
   eine zweite Zahl einführt, hat einen Zustand mehr, in dem die App neben der Oberfläche
   steht.

## Der Wächter

Eine Kopie veraltet lautlos. Wer einen Baustein ändert und nicht nachzieht, sieht in der
Oberfläche des Geräts das Neue und in jeder App das Alte, und nichts an einer laufenden App
würde davon rot.

```
node .ara/tools/marken.mjs                 die Lage, und 1 bei einem Befund
node .ara/tools/marken.mjs --sync          die Apps an die Quelle nachziehen
node .ara/tools/marken.mjs --source <ordner>   eine Quelle von Hand nennen
```

Er stellt drei Fragen: passt jede Datei zu ihrem Hash, steht der Spiegel auf der Fassung
der Quelle, und ist er vollständig (keine Klasse ohne Regel, kein Baustein ohne Ausgabe).
Ohne Spiegel des Produkts gibt es keine Quelle, und dann stellt er nur die Fragen, die er
hier beantworten kann, und sagt das auch.

`--sync` schreibt nur nach `apps/`. Die Vorlage gehört dem Kit und liegt in der
Versionsverwaltung; sie nachzuziehen ist eine Sache des Kits und kein Handgriff im Klon
eines Partners.

**`/init` fragt ihn.** Wer das Kit auf den neuesten Stand bringt, sieht dabei, ob seine
Apps noch an der Bibliothek stehen, und zieht sie in einem Schritt nach. Danach wird die
App neu gebaut: die Kopie ist Quelltext und kein Bündel.

## Wenn ein Befund kommt

| Was dasteht | Was es heißt | Was du tust |
| --- | --- | --- |
| `... wurde von Hand verstellt` | Jemand hat im Spiegel geändert | Den Grund erfragen. Was gebraucht wird, gehört ins Produkt. Dann `--sync` |
| `... fehlt im Spiegel` | Eine Datei ist weg | `--sync` |
| `die Quelle steht auf X, dieser Spiegel auf Y` | Die Bibliothek ist weitergegangen | `--sync`, danach die App neu bauen und einspielen |
| `... weicht bei gleicher Fassung ab` | Die Quelle hat sich bewegt, ohne die Fassung zu heben | Das ist ein Fehler im Produkt. Sag es, und zieh trotzdem nach |
| `... hat keine Regel in marken.css` | Ein Baustein ohne Aussehen | Der Spiegel ist unvollständig. Neu holen |
| `es gibt keine mirror.json` | Der Spiegel sagt nicht, woher er kommt | `--sync` legt sie an |
