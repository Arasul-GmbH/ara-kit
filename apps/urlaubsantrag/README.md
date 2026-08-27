# Urlaubsantrag

Ein Mitarbeiter beantragt Urlaub. Der Antrag hält an, bis ein Mensch entscheidet. Danach
steht er auf genehmigt oder abgelehnt, mit dem Namen dessen, der entschieden hat.

> Diese App liegt als **Referenz** im Kit. Sie ist keine Vorlage, aus der `/app` etwas
> erzeugt (das ist `.ara/templates/app/`), sondern eine fertige App zum Ansehen: so sieht
> aus, was hier gebaut wird. Wer sie für einen Kunden benutzen will, kopiert sie, ändert
> die Kennung in `app.json` und den Ordnernamen, und baut von dort weiter.

## Was sie kann

- Urlaub beantragen: erster Tag, letzter Tag, auf Wunsch ein Grund. Die Arbeitstage
  rechnet sie selbst aus, Samstag und Sonntag zählen nicht mit.
- Wer den Antrag stellt, kommt von der Anmeldung des Geräts und nicht aus dem Formular.
- Jeder Antrag startet den Flow `antrag`. Dessen erster Schritt fordert eine Freigabe an,
  und damit hält der Lauf an.
- Die Liste zeigt, woran ein Antrag hängt, und zieht den Stand alle paar Sekunden nach,
  solange etwas offen ist.
- Nach der Entscheidung steht am Antrag, wer entschieden hat, bei einer Ablehnung die
  Begründung, und der Satz, den der Flow danach geschrieben hat.

## Wo entschieden wird

**Nicht in dieser App.** Sie liest ihre Freigaben und erteilt keine. Entschieden wird in
der Oberfläche von Arasul, unter den offenen Freigaben, und zwar von jedem, dem diese App
freigegeben ist. Der Flow nennt dafür keine Person und keine Rolle: wer entscheiden darf,
ist eine Sache des Kunden.

Eine Ablehnung braucht eine Begründung. Entscheidet niemand innerhalb der Frist, endet der
Lauf ohne Entscheidung, und der Antrag steht auf abgelaufen. Das ist kein Fehler.

## Was sie nicht kann

- **Sie merkt sich nichts über einen Neustart hinweg.** Die Anträge liegen im Speicher des
  Containers. Ein Gerät gibt einer App heute keinen eigenen Datenordner; eine App, die
  sich dafür eine eigene Datenbank mitbringt, hätte eine zweite Ablage neben der, die das
  Produkt später vorsieht. Sag das dem Kunden, bevor er es merkt.
- Kein Urlaubskonto, keine Resttage, keine Vertretungsregel, keine Übersicht für die
  Leitung, keine Anbindung an eine Lohnbuchhaltung. Nichts davon ist eingebaut, und nichts
  davon ist versprochen.
- Ohne Arasul entscheidet niemand: der Antrag wird angenommen und bleibt liegen. Die Seite
  sagt das dann selbst.

## Wie sie aufgebaut ist

| Ordner | Was darin liegt |
| --- | --- |
| `app.json` | Das Manifest: Kennung, Version, welche Ordner das Paket mitbringt, Port, Grenzen |
| `frontend/` | Die Oberfläche in React. `npm run build` legt sie nach `dist/`, von dort geht sie ins Paket |
| `backend/` | Node und ein Dockerfile. Gebaut wird am Gerät |
| `flows/antrag.md` | Der Flow mit dem Freigabe-Schritt. Der Dateiname ist der Name des Flows |
| `plans/` | `offen/`, `aktiv/`, `erledigt/`. Aktiv ist höchstens einer |
| `build/` | Das fertige Paket. Es entsteht beim Bauen und gehört niemandem sonst |

Die Schnittstelle des Backends, hinter `/apps/urlaubsantrag/api/`:

| Weg | Was er tut |
| --- | --- |
| `GET /lage` | Name der App, wer angemeldet ist, ob das Gerät Arasul mitgegeben hat |
| `GET /antraege` | Alle Anträge, vorher am Gerät nachgezogen |
| `POST /antraege` | Antrag stellen und den Flow starten |
| `GET /gesund` | Für den Gesundheitscheck des Containers |

## Womit man arbeitet

```
node .ara/tools/app.mjs --app urlaubsantrag                          Lage und nächster Schritt
node .ara/tools/app.mjs --app urlaubsantrag --build                  Paket bauen
node .ara/tools/app.mjs --device <gerät> --app urlaubsantrag --check
node .ara/tools/app.mjs --device <gerät> --app urlaubsantrag --deploy
node .ara/tools/app.mjs --device <gerät> --app urlaubsantrag --live
```

Auf einem Gerät ohne Arasul geht dieselbe App über Compose:
`node .ara/tools/app.mjs --device <gerät> --app urlaubsantrag --compose`. Was dann fehlt,
sagt das Werkzeug in dem Moment, in dem es aufsetzt.

Das Aussehen steht in `frontend/src/design.css` und kommt aus dem Spiegel des Produkts.
Die Regeln daneben in `stil.css` benutzen nur die Namen der Marken, keinen einzigen
Farbwert: beim nächsten Stand wird `design.css` ersetzt, und der Rest bleibt.
