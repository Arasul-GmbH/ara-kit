# Eine App auf eine neue Hauptfassung heben


Eine neue Hauptzahl der Bibliothek (die 6 am 27.11.2026) ändert die Adresse, von der das Gerät sie
ausliefert (`/marken/6/`), und das Gerät liefert **nur die aktuelle** aus: eine App auf 5 wird beim
Ausrollen abgewiesen. Das Kit sagt es vorher, in `--check`, `--build` und im Nachweis
(`bibliothek-alt`). **Nichts wird still umgeschrieben**: was die App selbst gebaut hat, bleibt stehen,
und die Schritte sind Ihre:

1. `node .ara/tools/marken.mjs --sync` legt die neue Kopie unter `frontend/src/marken/` hin und schreibt
   die neue Hauptzahl in `marken` der `app.json` (in der Form, die die App hat, eine Zahl oder drei).
2. Neu bauen (`npm run build`) und `node .ara/tools/app.mjs --app <App> --check` laufen lassen. Typen,
   die nicht mehr passen, nennen die Seite, die zu ändern ist. Aus der 5.x ist kein Name
   weggefallen, es änderten sich Aussehen und Adressen.
3. Jede Seite einmal ansehen, hell und dunkel, bei 390 und 1440 Pixeln. Eigene Regeln in `stil.css`, die
   einen Baustein nachbilden (eine Standmarke, eine eigene Karte), sind die ersten, die durch die der
   Bibliothek ersetzt werden: `Karte`, `Liste`/`ListenEintrag`, `IconKnopf` und `Werkzeug` für
   Icon-Knöpfe, `Hauptkapsel` für die eine Hauptaktion einer Seite.
4. Noch einmal `--build` (neuer Nachweis), dann wie gewohnt in Test ausrollen.
