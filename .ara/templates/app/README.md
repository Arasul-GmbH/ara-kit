# {{name}}

{{beschreibung}}

> Diese Datei ist der Ist-Stand in den Worten dessen, der die App benutzt, nicht in denen
> dessen, der sie gebaut hat. Nach jedem erledigten Plan wird sie fortgeschrieben: was kann
> die App heute, was noch nicht, und was muss man wissen, um sie zu bedienen. Angelegt am
> {{datum}} aus der Vorlage des Kits.

## Was sie kann

Noch nichts. Der erste Plan steht unter `plans/offen/`.

## Was sie nicht kann

Ein Satz an dieser Stelle erspart später eine Enttäuschung. Trag hier ein, was ausdrücklich
nicht dazugehört.

## Wie sie aufgebaut ist

| Ordner | Was darin liegt |
| --- | --- |
| `app.json` | Das Manifest: Kennung, Version, welche Ordner das Paket mitbringt, welcher Port, welche Grenzen |
| `frontend/` | Die Oberfläche als React-Quelltext. `npm run build` legt sie nach `dist/`, und von dort geht sie ins Paket |
| `backend/` | Node und ein Dockerfile. Gebaut wird am Gerät, nicht hier |
| `flows/` | Eine Datei je Flow. Der Dateiname ist der Name des Flows |
| `plans/` | `offen/`, `aktiv/` und `erledigt/`. Aktiv ist höchstens einer |
| `build/` | Das fertige Paket. Es entsteht beim Bauen und wird nicht von Hand bearbeitet |

## Womit man arbeitet

```
node .ara/tools/app.mjs --app {{id}}                        Lage und nächster Schritt
node .ara/tools/app.mjs --app {{id}} --build                Paket bauen
node .ara/tools/app.mjs --device <gerät> --app {{id}} --check
node .ara/tools/app.mjs --device <gerät> --app {{id}} --deploy
node .ara/tools/app.mjs --device <gerät> --app {{id}} --live
```

Das Aussehen steht in `frontend/src/design.css`. Die Werte darin kommen aus dem Spiegel des
Produkts, die Regeln daneben in `stil.css` benutzen nur ihre Namen. Wer eine Farbe in eine
Regel schreibt, hat sie beim nächsten Stand doppelt.
