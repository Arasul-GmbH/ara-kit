# Das Designsystem: die Bausteine, aus denen eine App gebaut wird

Eine App läuft in einem Rahmen in der Oberfläche von Arasul, und zwei Erscheinungsbilder auf einem
Bildschirm sind ein Fehler. Darum gibt es eine Bibliothek für beide Seiten, ausgeliefert als
**Paket**: `marken.json` nennt die Fassung, die Abhängigkeiten und jede Datei mit ihrem sha256. Jede
App hat eine Kopie unter `frontend/src/marken/`, nur als Quelltext: Typen, `npm run dev`, eine
Vorschau ohne Gerät. **Am Gerät kommt die Bibliothek vom Gerät.** In `app.json` steht
`"marken": "<Hauptzahl>"` (`--new` schreibt es), die Seite lädt Bausteine und Stylesheet von der
festen Adresse, die der Abschnitt `marken` des Kontrakts nennt, das Paket trägt keine Kopie, und ein
Update des Geräts bringt die neue Fassung ohne Neubau. Drei Zahlen in `marken` oder
`npm run build:kopie` bündeln stattdessen die Kopie. Kopien: `.ara/knowledge/design-guard.de.md`.

## Drei Sätze, zwei Stilblätter, eine Quelle für das Thema

| Satz | Wo | Was sie sind |
| --- | --- | --- |
| Primitive | `marken/primitive/` | Button, Input, Dialog, Tabelle, Reiter, Abzeichen und dergleichen. Man setzt sie zusammen |
| Muster | `marken/muster/` | Datenliste, Formularseite, Seitenleiste, Dateiablage, Dokumentanzeige und mehr, **aus** Primitiven gemacht für eine Aufgabe, die jede Anwendung hat |
| Bausteine | `marken/*.tsx` | Kopf, Meldung, Karte und dergleichen. Reines CSS (`ara-*`), sie laufen **ohne** Bau |

Ein ganzes Formular ist ein Muster: nachgebaut sind es zweihundert Zeilen, die die nächste App
anders schreibt. `marken/theme.css` (beide Themen, der `@theme`-Block) wird **ohne Schicht** geladen,
`marken/marken.css` **mit** `layer(components)`; die `kopie.css` der Vorlage tut beides, lass es so. Die `geraet.css` überlässt die Bibliothek dem
Gerät und liest nur deine eigenen Klassen.

**Das Thema kommt vom Gerät**: `rahmen/thema.ts` liest, was die Shell setzt, und rät nicht, siehe die
README der Vorlage.

## Wie eine App sie einsetzt

```tsx
import { Button, Datenliste, Kopf, Meldung, Seitenleiste } from "@marken";
```

`@marken` ist auch der Alias der Oberfläche des Geräts; wo die Vorlage welches Muster einsetzt, sagt
ihre README. Eine `Datenliste` nimmt ihre Spalten als Daten (`zelle` zeigt, `wert` sortiert und sucht:
„vor 3 Tagen" sortiert nach einem Zeitstempel), eine `Seitenleiste` steht in `SidebarProvider` und
`SidebarInset`, und die App nennt den aktiven Eintrag. Die Anordnung der Seite gehört der
Bibliothek. Eigene Regeln stehen am Ende von `stil.css`, nur mit Namen von Marken, ohne Farbe,
Schrift oder Radius. Am Gerät kommen die Klassen der Bibliothek nur aus deren `marken.css`: was du
selbst gestaltest, schreib dort mit Marken.

**Eine Freigabe ist das Muster `Freigabe`, nie eine Nachbildung**: `seiten/freigaben.tsx`
zeigt es, `freigaben.ts` holt die Einträge vom Gerät. Welche Felder ein Mensch ändern darf, erklärt der
Flow (`ergebnis.aenderbar`). Das Original zeigt die Anzeige als Bild oder PDF **am Ende seines Pfades**.

## Was jede Seite hält

- **Nichts fällt heraus.** Ein langer Titel endet mit „…" (`kuerzen`) und steht daneben ganz; in
  Schreibtischbreite verlässt keine Spalte die Tabelle. Die `Datenliste` misst ihren eigenen Kasten,
  nicht das Fenster: wird er schmal, oder passt ihre Tabelle nicht hinein, zeigt sie Karten. Der
  Selbsttest baut die Vorlage und misst sie.
- **Liste und Einzelheiten nebeneinander** ab 900 Pixeln, die Einzelheiten mitlaufend, darunter als
  Blatt von unten. Nie unter der Liste.
- **Die Auswahl ist die der Bibliothek**: `gewaehlt` markiert die Zeile, Tab und Eingabe erreichen
  sie, die Pfeile über `rahmen/pfeile.ts`.
- **Jedes Feld hat ein Label** und daneben, ob es sein muss. Der Knopf bleibt aktiv, ein Klick sagt
  am Feld, was fehlt.
- **Wer wartet, nennt, wer entscheidet und seit wann**, aus `entscheidet` des Backends.
- **Laden hat die Form des Ergebnisses, eine leere Liste eine Handlung.** Ein Fehler ist ein Satz, nie
  eine HTTP-Zeile: 404 und 403 ein Hinweis mit „Zur Übersicht", Netz und 5xx rot mit „Erneut versuchen".
- **Der `hinweis` einer Karte trägt ein paar Wörter**: Stand, Fassung, Frist. Ein Satz steht im Inhalt.
- **Die App redet wie das Gerät**: mit Sie oder ohne Anrede. `--check` meldet du und dir.
- **Der Stand in der Textfarbe**, 4,5:1 in beiden Themen, die Farbe an einem Zeichen daneben.
- **Ein Diagramm nur aus `@marken/diagramm`**, am besten mit `lazy`: der Sammelexport trägt keines.

## Was das Kit anhält, und was sonst verboten ist

Sonst sehen die Apps eines Partners nach drei Monaten alle anders aus. Das Gerät vergleicht nicht,
und der Wächter des Produkts prüft nur die Shell, darum hält das Kit `--build`, `--check`,
`--deploy` und `--compose` bei vier Befunden an:

- **Ein eigener Farbwert.** Falsch: `color: #e11d48;`, `rgb(225 29 72)`. Richtig:
  `color: var(--ara-fehler);`, `bg-card`.
- **Eine Tailwind-Palettenfarbe.** Falsch: `bg-red-500`, `text-white`. Richtig: `bg-primary`,
  `text-muted-foreground`, `border-border`.
- **Ein eigenes Primitiv**: ein eigenes `<h1>` statt des Bausteins `Kopf`, `<table>` statt `Table`
  oder `Datenliste`, `<dialog>` statt `Dialog`, `<fieldset>` statt `Feldgruppe`, eine Reiterleiste
  mit `role="tablist"` statt `Tabs`. Ebenso verboten: ein `<div className="karte">` neben `Karte`,
  eine Liste mit Suchfeld neben `Datenliste`.
- **Das Feld `marken` in `app.json` fehlt oder ist veraltet.** Die Hauptzahl allein braucht keine
  passende Kopie, drei Zahlen müssen zur Kopie passen. `--new` schreibt es, `marken.mjs --sync`
  hält es. Gegen ein Gerät hält `--check` auch eine Hauptzahl an, die das Gerät nicht ausliefert,
  und weist bei einer gealterten Kopie nur hin.

Gemessen wird der eigene Quelltext der App, nicht der Spiegel. **Ein fremder Container ist
ausgenommen**: ohne `frontend`, mit fertigem `image`, bringt er keine Oberfläche mit. Der Selbsttest
hält die Vorlage an dieselbe Regel. Dazu: **nichts im Spiegel ändern**, er wird ersetzt, und was
einem Teil fehlt, gehört ins Produkt; und **keine eigene Schwelle**: 900 Pixel des Fensters gelten
für die Seite (`useSchmalesFenster`), den Kasten einer Datenliste misst die Bibliothek selbst.

**Prüf eine Oberfläche in beiden Themen und drei Breiten**, 390 für das Telefon, 1280 und 1440 für
den Schreibtisch. Unter 900 ist die Seitenleiste ein Blatt und eine Datenliste eine Kartenliste, und eine
Seite, die seitwärts rollt, ist kaputt.
