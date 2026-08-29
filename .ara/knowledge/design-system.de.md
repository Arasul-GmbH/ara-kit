# Das Designsystem: die Bausteine, aus denen eine App gebaut wird

Eine App läuft in einem Rahmen mitten in der Oberfläche von Arasul. Der Mensch davor sieht
nicht zwei Programme, er sieht einen Bildschirm. Zwei Erscheinungsbilder darauf sind kein
Geschmack, sondern ein Fehler.

Darum gibt es genau eine Bibliothek für beide Seiten. Sie heißt im Produkt
`packages/marken`, und sie geht von dort als **Paket** hinaus: `marken.json` nennt die
Fassung, die Abhängigkeiten und jede Datei mit ihrem sha256. Das Kit spiegelt dieses Paket
in die App-Vorlage. Wer eine App baut, baut aus ihren Teilen, und dann sieht die App aus wie
das Gerät, ohne dass jemand eine Farbe abgeschrieben hat.

## Die Kette: eine Quelle, zwei Spiegel

| Wo | Was | Wem gehört es |
| --- | --- | --- |
| `packages/marken` im Produkt | die Quelle | dem Produkt |
| `.ara/mirror/packages/marken/` | das geholte Paket, mit seinem Stempel | dem Produkt, hier abgelegt |
| `.ara/templates/app/frontend/src/marken/` | der Spiegel der Vorlage | dem Kit |
| `apps/<app>/frontend/src/marken/` | die Kopie einer App | dem Nutzer |

Der Spiegel der Vorlage steht da, damit ein frischer Klon eine App bauen kann, die aussieht
wie das Gerät, auch auf einem Rechner, der noch kein Arasul gesehen hat. Liegt beim Anlegen
einer App ein Spiegel des Produkts vor, nimmt `--new` die Bibliothek von dort statt aus der
Vorlage: die des Geräts ist die richtige.

**Das Paket ist, was `marken.json` nennt.** Einundsiebzig Dateien, und siebzig davon gehen
in den Spiegel. `browser/marken.js` bleibt draußen: es ist das Bündel für eine App **ohne**
Bau, es bringt React-DOM mit und hängt eine App an einen Knoten. Eine App aus der Vorlage
hat einen Bau und einen eigenen Einstieg. Der Stempel des Spiegels sagt das unter
`nicht_gespiegelt`, samt Grund, denn "vollständig" heißt nicht "alles", sondern "alles,
wovon gesagt ist, warum es fehlt".

Neben jedem Spiegel liegt `mirror.json`: Fassung, Quelle, Datum, die Abhängigkeiten und je
Datei ein Hash. Sie ist die Antwort auf die Frage, die sonst niemand beantworten kann,
nämlich ob eine Datei nachgezogen oder von Hand geändert wurde.

## Drei Sätze, und jeder hat seine Höhe

| Satz | Wo | Wie viele | Was sie sind |
| --- | --- | --- | --- |
| Primitive | `marken/primitive/` | 46 | Button, Input, Dialog, Tabelle, Kalender, Reiter, Abzeichen. Sie wissen nichts außer sich selbst, und man setzt sie zusammen |
| Muster | `marken/muster/` | 9 | Datenliste, Suchauswahl, Seitenleiste, Formularseite, Dateiablage, Kennzahl, Leerzustand, Ladezustand, Dialogform. Sie sind **aus** Primitiven gemacht und lösen eine Aufgabe, die in jeder Anwendung wiederkommt |
| Bausteine | `marken/*.tsx` | 6 | Kopf, Liste, Karte, Formular, Meldung, Menue. Reines CSS (Klassen `ara-*`), sie laufen in einer App **ohne** Bau |

Wer einen Bau hat, nimmt die Primitive und die Muster. Die sechs Bausteine bleiben für den
Kopf einer Seite und für eine Meldung nützlich; was aber ein ganzes Formular ist, ist ein
Muster, und es nachzubauen sind zweihundert Zeilen, die die nächste Anwendung anders
schreibt.

**Zwei Stylesheets gehören dazu**, und sie werden getrennt geladen:

- `marken/theme.css` trägt die Werte, beide Themen, und den `@theme`-Block, aus dem Tailwind
  `bg-primary`, `text-muted-foreground` und `rounded-md` baut. Es wird **ohne Schicht**
  geladen: ein `@theme` in einem `layer(...)`-Import ist keins mehr.
- `marken/marken.css` trägt die Regeln der sechs Bausteine. Es wird **mit**
  `layer(components)` geladen: ungeschichtetes CSS gewinnt gegen jede Schicht, auch gegen
  die Werkzeugklassen, und eine Tailwind-Klasse an einem Baustein wäre sonst wirkungslos.

Beide stehen in dieser Reihenfolge in der `stil.css` der Vorlage, und daneben steht keine
zweite Datei mit Werten. Bis 0.17.0 schrieb das Kit eine (`design.css`, aus der `index.css`
der Shell abgelesen); seit die Bibliothek ihre Marken selbst trägt, wäre das die zweite
Wahrheit, und die beiden waren sich nicht einig, welches Thema die Vorgabe ist.

## Zwei Themen, und Hell setzt nichts

Das Gerät kennt Hell und Dunkel. Hell ist `:root` und braucht keinen Selektor; Dunkel steht
als Klasse `dark` und als `data-theme="dark"` am `<html>`. Die Shell schreibt beides **in
das Dokument der App selbst**, bei jedem Wechsel und bei jedem Laden, und schickt denselben
Wert zusätzlich als Nachricht (`{typ: "arasul:theme", theme}`), und das ist der einzige Weg,
der Hell ausdrücklich nennt.

Eine App muss dafür also nichts tun. `rahmen/thema.ts` in der Vorlage liest und rät nicht:
es hört auf die Nachricht, beobachtet sein eigenes `<html>` und schreibt nur dann selbst,
wenn es gar keinen Rahmen gibt, denn dann tut es sonst niemand.

## Wie eine App sie einsetzt

Der Import geht über `@marken`, denselben Alias, unter dem die Oberfläche des Geräts die
Bibliothek kennt. Derselbe Quelltext läuft dort und hier:

```tsx
import { Button, Datenliste, Kopf, Meldung, Seitenleiste } from "@marken";
```

Die Vorlage zeigt drei Fälle, und an ihnen kann man sich entlanghangeln:

- **Datenliste** (`seiten/liste.tsx`): das Muster `Datenliste`. Sortieren, Suchen, ein
  Leerzustand, und unter 900 Pixeln eine Kartenliste statt einer Tabelle. Die Spalten sind
  Daten und kein Markup: `zelle` sagt, was dasteht, `wert` sagt, wonach sortiert und worin
  gesucht wird, und beides ist getrennt, weil "vor 3 Tagen" nach einem Zeitstempel sortiert.
- **Formularseite** (`seiten/neu.tsx`): `Formularseite` mit einer `Feldgruppe` je Abschnitt.
  Die Gruppe trägt Überschrift, Beschreibung und die Trennlinie; `Formularseite` nimmt sie
  der letzten wieder ab. Die Eingaben sind die Primitive `Label`, `Input`, `Textarea`,
  `Button`.
- **Seitenleiste** (`rahmen/seitenleiste.tsx`): das Muster `Seitenleiste`, darum herum ein
  `SidebarProvider` mit `SidebarInset` und `SidebarTrigger`. Die Einträge gehen als Liste
  hinein; welcher aktiv ist, sagt die App, denn sie kennt ihren Router und das Muster
  keinen.

Die Anordnung der Seite gehört der Bibliothek und nicht der App: `SidebarProvider` hält die
Spalte, `SidebarInset` trägt den Inhalt. Was als eigene Regel übrig bleibt, steht am Ende
von `stil.css`, und keine Farbe, keine Schrift und kein Radius steht darin.

## Was verboten ist

Vier Dinge, und jedes hat denselben Grund: sie laufen beim nächsten Stand des Geräts von der
Oberfläche weg, in der die App hängt.

1. **Keine eigene Farbe.** Kein `#1a1a1a`, kein `rgba(...)` in einer Regel dieser App. Was
   eine Farbe braucht, nimmt eine Marke: `var(--ara-kante)`, `bg-card`,
   `text-muted-foreground`. Eine Farbe, die man hinschreibt, ist eine, die beim nächsten
   Thema falsch ist.
2. **Kein eigenes Teil neben einem vorhandenen.** Kein `<div className="karte">`, das
   aussieht wie eine `Karte`, und keine Liste mit Suchfeld neben `Datenliste`. In vier Wochen
   ist der Unterschied zwischen beiden keine Entscheidung mehr, sondern ein Zufall.
3. **Nichts im Spiegel ändern.** Der Ordner `frontend/src/marken/` wird **ersetzt**, nicht
   fortgeschrieben. Wer eine Zeile darin ändert, verliert sie beim nächsten Nachziehen, und
   bis dahin meldet der Wächter sie. Was an einem Teil fehlt, gehört ins Produkt und nicht
   in die Kopie.
4. **Keine zweite Schwelle.** Unter 900 Pixeln eine Spalte, darüber die Anordnung. Die
   Bibliothek trägt die eine Schwelle (`useSchmalesFenster`); wer eine zweite Zahl einführt,
   hat einen Zustand mehr, in dem die App neben der Oberfläche steht.

## Der Wächter

Eine Kopie veraltet lautlos. Wer ein Teil ändert und nicht nachzieht, sieht in der
Oberfläche des Geräts das Neue und in jeder App das Alte, und nichts an einer laufenden App
würde davon rot.

```
node .ara/tools/marken.mjs                 die Lage, und 1 bei einem Befund
node .ara/tools/marken.mjs --sync          die Apps an die Quelle nachziehen
node .ara/tools/marken.mjs --source <ordner>   eine Quelle von Hand nennen
```

Er stellt vier Fragen: passt jede Datei zu ihrem Hash, steht der Spiegel auf der Fassung der
Quelle, ist er vollständig (keine Klasse ohne Regel, keine Datei, zu der kein Weg führt),
und trägt die `package.json` der App die vierzehn Abhängigkeiten, die die Bibliothek
braucht. Die letzte gibt es, weil die Bibliothek **mit** der App übersetzt wird: ohne diese
Frage fällt der Bau erst an dem Import, der ins Leere zeigt, und die Meldung nennt dann ein
Primitiv statt des fehlenden Pakets.

**Welche Quelle gilt**, in dieser Reihenfolge: der Ordner hinter `--source`, sonst das Paket
im Spiegel des Produkts, sonst die Vorlage des Kits. `--source` nennt das, was im Produkt
`scripts/deploy/marken-paket.py --ausgabe <ordner>` hinlegt: ein Ordner mit `marken.json`
und `src/` darin. Die dritte ist die schwächste, und sie steht trotzdem da: für eine App ist
die Vorlage genau die richtige Auskunft, denn sie ist das, was `--new` hingelegt hätte. Ihre
eigene Quelle ist die Vorlage nie, ein Spiegel, der sich an sich selbst misst, sagt immer
ja.

`--sync` schreibt nur nach `apps/`. Die Vorlage gehört dem Kit und liegt in der
Versionsverwaltung; sie nachzuziehen ist Sache des Kits und kein Handgriff im Klon eines
Partners. Es schreibt außerdem `marken` in die `app.json` der App: seit Kontrakt 4 sagt eine
App in ihrem Manifest, auf welcher Fassung sie steht, und eine Zahl, die nach dem Nachziehen
stehen bleibt, ist genau die Auskunft, an der das Gerät eine veraltete Kopie erkennen soll.

**`/init` fragt ihn.** Wer das Kit aktualisiert, sieht dabei, ob seine Apps noch an der
Bibliothek stehen, und zieht sie in einem Schritt nach. Danach wird die App neu gebaut: die
Kopie ist Quelltext und kein Bündel.

## Wenn ein Befund kommt

| Was dasteht | Was es heißt | Was du tust |
| --- | --- | --- |
| `... wurde von Hand verstellt` | Jemand hat im Spiegel etwas geändert | Frag nach, warum. Was gebraucht wird, gehört ins Produkt. Danach `--sync` |
| `... fehlt im Spiegel` | Eine Datei fehlt | `--sync` |
| `die Quelle steht auf X, dieser Spiegel auf Y` | Die Bibliothek ist weitergegangen | `--sync`, danach die App neu bauen und einspielen |
| `... weicht bei gleicher Fassung von der Quelle ab` | Die Quelle hat sich bewegt, ohne die Fassung zu heben | Das ist ein Fehler im Produkt. Sag es, und zieh trotzdem nach |
| `... hat keine Regel in marken.css` | Ein Baustein ohne Aussehen | Der Spiegel ist unvollständig. Hol ihn neu |
| `von der index.ts führt kein Weg zu ...` | Eine Datei, die keine App findet, und der Bau übersetzt sie trotzdem mit | Der Spiegel ist unvollständig. Hol ihn neu |
| `die Bibliothek braucht X, die package.json kennt es nicht` | Die App lässt sich nicht bauen | Die Fassung aus `mirror.json` in die `frontend/package.json` eintragen, dann `npm install` |
| `es gibt keine mirror.json` | Der Spiegel sagt nicht, woher er kommt | `--sync` legt sie an |
