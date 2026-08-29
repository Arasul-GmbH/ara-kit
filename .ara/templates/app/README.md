# {{name}}

{{beschreibung}}

> Diese Datei ist der Ist-Stand in den Worten dessen, der die App benutzt, nicht in denen
> dessen, der sie gebaut hat. Nach jedem erledigten Plan wird sie fortgeschrieben: was kann
> die App heute, was noch nicht, und was muss man wissen, um sie zu bedienen. Angelegt am
> {{datum}} aus der Vorlage des Kits.

## Was sie kann

Die Vorlage läuft von der ersten Minute an, und das hier ist ihr Stand, bevor der erste
Plan erledigt ist:

- Einen Vorgang einreichen: worum es geht, auf Wunsch ein Text dazu. Wer ihn einreicht,
  kommt von der Anmeldung des Geräts und nicht aus dem Formular.
- Jeder Vorgang startet den Flow `freigabe`. Dessen erster Schritt fordert eine Freigabe
  an, und damit hält der Lauf an.
- Die Liste zeigt, woran ein Vorgang hängt, lässt sich auf offene und entschiedene
  einschränken und zieht den Stand alle paar Sekunden nach, solange etwas offen ist.
- Nach der Entscheidung steht am Vorgang, wer entschieden hat, bei einer Ablehnung die
  Begründung, und der Satz, den der Flow danach geschrieben hat.

Der erste Plan steht unter `plans/offen/`. Was die App danach kann, gehört hierher.

## Woher sie weiß, wie sie das Gerät erreicht

**Nicht aus ihrem eigenen Quelltext.** Unter welchem Namen das Gerät ihr die Adresse der
Schnittstelle und den Schlüssel in den Container legt, wie die Kopfzeile für den Schlüssel
heißt und welche Wege es dafür gibt, ist zwischen Kit und Produkt vereinbart und steht im
Kontrakt des einen Geräts. Das Kit liest das beim Einspielen dort aus und legt es als
`backend/arasul.json` ins Paket.

Steht in dieser Datei nichts, hat die App keinen Rahmen. Dann nimmt sie den Vorgang an, legt
ihn ohne Lauf ab und schreibt an ihn, woran es liegt. `GET /lage` sagt dasselbe, und beim
Start steht es einmal im Protokoll des Containers.

Was daraus folgt, wenn du das Backend weiterbaust: **schreib keinen dieser Werte hinein.**
Eine App, die den Namen eines Umgebungswerts errät, findet auf einem Gerät, das ihn anders
nennt, nichts, hält das für „hier läuft kein Arasul" und sammelt Vorgänge, über die niemand
entscheidet. Genau das ist der Vorlage bis zum 29.08.2026 passiert.

## Wo entschieden wird

**Nicht in dieser App.** Sie liest ihre Freigaben und erteilt keine. Entschieden wird in
der Oberfläche von Arasul, unter den offenen Freigaben, und zwar von jedem, dem diese App
freigegeben ist. Der Flow nennt dafür keine Person und keine Rolle: wer entscheiden darf,
ist eine Sache des Kunden.

Eine Ablehnung braucht eine Begründung. Entscheidet niemand innerhalb der Frist, endet der
Lauf ohne Entscheidung, und der Vorgang steht auf abgelaufen. Das ist kein Fehler.

## Was sie nicht kann

- **Sie merkt sich nichts über einen Neustart hinweg.** Die Vorgänge liegen im Speicher des
  Containers. Ein Gerät gibt einer App heute keinen eigenen Datenordner; eine App, die
  sich dafür eine eigene Datenbank mitbringt, hätte eine zweite Ablage neben der, die das
  Produkt später vorsieht. Sag das dem Kunden, bevor er es merkt.
- Ohne Arasul entscheidet niemand: der Vorgang wird angenommen und bleibt liegen. Die Seite
  sagt das dann selbst.
- Ein Satz an dieser Stelle erspart später eine Enttäuschung. Trag hier ein, was
  ausdrücklich nicht dazugehört.

## Wie sie aufgebaut ist

| Ordner | Was darin liegt |
| --- | --- |
| `app.json` | Das Manifest: Kennung, Version, welche Ordner das Paket mitbringt, welcher Port, welche Grenzen |
| `frontend/` | Die Oberfläche als React-Quelltext. `npm run build` legt sie nach `dist/`, und von dort geht sie ins Paket |
| `frontend/src/bausteine.jsx` | Die sechs Bausteine der Oberfläche: Kopf, Liste, Karte, Formular, Meldung, Menü. Die Seite in `app.jsx` ist nur aus ihnen gebaut |
| `backend/` | Node und ein Dockerfile. Gebaut wird am Gerät, nicht hier |
| `backend/arasul.json` | Die Vereinbarung mit dem Gerät. Im Quelltext leer, gefüllt wird sie beim Einspielen aus dem Kontrakt |
| `flows/freigabe.md` | Der Flow mit dem Freigabe-Schritt. Der Dateiname ist der Name des Flows |
| `plans/` | `offen/`, `aktiv/` und `erledigt/`. Aktiv ist höchstens einer |
| `build/` | Das fertige Paket. Es entsteht beim Bauen und wird nicht von Hand bearbeitet |

Die Schnittstelle des Backends, hinter `/apps/{{id}}/api/`:

| Weg | Was er tut |
| --- | --- |
| `GET /lage` | Name der App, wer angemeldet ist, ob das Gerät Arasul mitgegeben hat |
| `GET /vorgaenge` | Alle Vorgänge, vorher am Gerät nachgezogen |
| `POST /vorgaenge` | Vorgang einreichen und den Flow starten |
| `GET /gesund` | Für den Gesundheitscheck des Containers |

## Womit man arbeitet

```
node .ara/tools/app.mjs --app {{id}}                        Lage und nächster Schritt
node .ara/tools/app.mjs --app {{id}} --build                Paket bauen
node .ara/tools/app.mjs --device <gerät> --app {{id}} --check
node .ara/tools/app.mjs --device <gerät> --app {{id}} --deploy
node .ara/tools/app.mjs --device <gerät> --app {{id}} --live
```

Auf einem Gerät ohne Arasul geht dieselbe App über Compose:
`node .ara/tools/app.mjs --device <gerät> --app {{id}} --compose`. Was dann fehlt, sagt das
Werkzeug in dem Moment, in dem es aufsetzt.

## Wie sie aussieht

Die Werte des Aussehens stehen in `frontend/src/design.css` und kommen aus dem Spiegel des
Produkts; liegt keiner vor, steht die Vorgabe des Kits darin, und die Datei sagt das in
ihrem Kopf. Die Regeln daneben in `stil.css` benutzen nur die Namen der Marken, keinen
einzigen Farbwert: beim nächsten Stand wird `design.css` ersetzt, und der Rest bleibt.

Neue Oberfläche entsteht aus den Bausteinen in `bausteine.jsx`, nicht aus neuem HTML
daneben. Wer eine Farbe in eine Regel schreibt, hat sie beim nächsten Stand doppelt.
