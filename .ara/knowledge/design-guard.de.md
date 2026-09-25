# Der Wächter über das Designsystem

> **Wann brauchst du das?** Wenn `node .ara/tools/marken.mjs` einen Befund meldet, wenn `/init`
> das Kit aktualisiert, oder wenn die Kopie der Bibliothek in einer App nachgezogen werden soll.
> Was die Bibliothek ist und wie eine App sie einsetzt: `.ara/knowledge/design-system.de.md`.

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

**Das Paket ist, was `marken.json` nennt**, und alles davon geht in den Spiegel bis auf eine
Datei. `browser/marken.js` bleibt draußen: es ist das Bündel für eine App **ohne**
Bau, es bringt React-DOM mit und hängt eine App an einen Knoten. Eine App aus der Vorlage
hat einen Bau und einen eigenen Einstieg. Der Stempel des Spiegels sagt das unter
`nicht_gespiegelt`, samt Grund, denn "vollständig" heißt nicht "alles", sondern "alles,
wovon gesagt ist, warum es fehlt".

Neben jedem Spiegel liegt `mirror.json`: Fassung, Quelle, Datum, die Abhängigkeiten und je
Datei ein Hash. Sie ist die Antwort auf die Frage, die sonst niemand beantworten kann,
nämlich ob eine Datei nachgezogen oder von Hand geändert wurde.

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
und trägt die `package.json` der App jede Abhängigkeit, die die Bibliothek
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
