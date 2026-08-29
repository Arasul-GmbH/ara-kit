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
- Die Liste zeigt, woran ein Vorgang hängt, und zieht den Stand alle paar Sekunden nach,
  solange etwas offen ist. Ein Klick auf eine Zeile klappt den Vorgang darunter auf, mit
  allem, was an ihm hängt.
- Links stehen die Bereiche: die Ansichten der Liste (alle, offene, entschiedene) und der
  Weg zum Formular. Unter 900 Pixeln stehen dieselben Einträge im Menü über der Seite.
- Nach der Entscheidung steht am Vorgang, wer entschieden hat, bei einer Ablehnung die
  Begründung, und der Satz, den der Flow danach geschrieben hat.

Der erste Plan steht unter `plans/offen/`. Was die App danach kann, gehört hierher.

## Wer da ist

**Nicht aus einem Formularfeld.** Angemeldet wird an Arasul, und das Sitzungscookie fährt
bei jedem Aufruf dieser Seite mit. Wer es ist, sagt `api/me`: dieser eine Weg liegt unter
`api/` und gehört trotzdem der Plattform, damit auch eine App ohne eigenes Backend ihren
Benutzer anzeigen kann. Die Oberfläche liest ihn einmal und hält ihn als Kontext, das
Backend liest denselben Menschen aus den Kopfzeilen vor dem Container.

Die Rolle steht dabei und wird nicht ausgewertet: **was ein Mensch darf, entscheidet das
Gerät.** Es liefert eine App nur dem aus, dem sie freigegeben ist. Eine Prüfung in der App
wäre keine zweite Sicherung, sondern nur eine bessere Meldung.

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

- **Die Vorgänge überleben das nächste Einspielen nicht.** Sie liegen in einer
  SQLite-Datei unter `daten/` im Container. Die überlebt einen Neustart des Containers und
  nicht die nächste Fassung: ein Gerät gibt einer App heute keinen eigenen Datenordner.
  Sag das dem Kunden, bevor er es merkt.
- Ohne Arasul entscheidet niemand: der Vorgang wird angenommen und bleibt liegen. Die Seite
  sagt das dann selbst.
- Ein Satz an dieser Stelle erspart später eine Enttäuschung. Trag hier ein, was
  ausdrücklich nicht dazugehört.

## Wie sie aufgebaut ist

| Ordner | Was darin liegt |
| --- | --- |
| `app.json` | Das Manifest: Kennung, Version, welche Ordner das Paket mitbringt, welcher Port, welche Grenzen |
| `frontend/` | Die Oberfläche: Vite, React, TypeScript, Tailwind. `npm run build` legt sie nach `dist/`, und von dort geht sie ins Paket |
| `backend/` | Node und ein Dockerfile. Gebaut wird am Gerät, nicht hier |
| `flows/freigabe.md` | Der Flow mit dem Freigabe-Schritt. Der Dateiname ist der Name des Flows |
| `plans/` | `offen/`, `aktiv/` und `erledigt/`. Aktiv ist höchstens einer |
| `build/` | Das fertige Paket. Es entsteht beim Bauen und wird nicht von Hand bearbeitet |

Die Oberfläche, von außen nach innen:

| Datei | Was sie tut |
| --- | --- |
| `src/app.tsx` | Der Rahmen: Fehlerwand, Zwischenspeicher, Thema, Seitenleiste, Wege, Anmeldung |
| `src/rahmen/basis.ts` | Unter welchem Pfad die App hängt. Sie rät ihn nicht, sie liest ihn |
| `src/rahmen/thema.ts` | Das Thema des Geräts, gelesen am Elternfenster und mitgeführt |
| `src/rahmen/anmeldung.tsx` | Wer da ist, aus `api/me`, als Kontext |
| `src/rahmen/schnittstelle.ts` | Die eine Stelle, an der etwas geholt wird |
| `src/rahmen/async-boundary.tsx` | Die drei Ausgänge einer Abfrage, an einer Stelle |
| `src/rahmen/seitenleiste.tsx` | Die Bereiche: als Spalte, unter 900 px als Menü über der Seite |
| `src/rahmen/fenster.ts` | Die eine Schwelle, unter der eine Spalte gilt |
| `src/marken/` | Die Bausteine des Geräts, gespiegelt. Import über `@marken`. Wird ersetzt, nicht bearbeitet |
| `src/vorgaenge.ts` | Typen und Abfragen der einen Entität dieser App |
| `src/seiten/liste.tsx` | Die Datenliste, mit dem einen ausgewählten Vorgang darunter |
| `src/seiten/neu.tsx` | Die Formularseite: einen Vorgang einreichen |

Das Backend, von außen nach innen:

| Datei | Was sie tut |
| --- | --- |
| `server.mjs` | Wege, Kopfzeilen, Statuscodes. Sonst nichts |
| `kern/vorgaenge.mjs` | Was mit einem Vorgang passiert. Kennt zwei Anschlüsse und die Welt sonst nicht |
| `ablage/vorgaenge.mjs` | Die eine Naht zu SQLite. Hier steht das einzige SQL der App |
| `ablage/db.mjs` | Die Datei und ihre Migrationen. Der Stand steht in der Datenbank selbst |
| `ablage/migrationen/` | Eine Datei je Schritt. Was gelaufen ist, wird nie wieder angefasst |
| `arasul.mjs` | Die Naht zum Gerät. Kein Wert darin, den das Gerät vergibt |
| `arasul.json` | Die Vereinbarung mit dem Gerät. Im Quelltext leer, gefüllt wird sie beim Einspielen |

Die Schnittstelle des Backends, hinter `/apps/{{id}}/api/`:

| Weg | Was er tut |
| --- | --- |
| `GET /lage` | Name der App und ob das Gerät ihr eine Schnittstelle gegeben hat |
| `GET /vorgaenge` | Alle Vorgänge, vorher am Gerät nachgezogen |
| `POST /vorgaenge` | Vorgang einreichen und den Flow starten |
| `GET /gesund` | Für den Gesundheitscheck des Containers |

`GET /api/me` steht nicht in dieser Liste: den beantwortet die Plattform.

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

Beim Bauen läuft `tsc --noEmit` vor `vite build`: ein Typfehler hält den Bau an, statt am
Gerät als leere Seite anzukommen.

## Wie sie aussieht

Zwei Stücke, und beide gehören dem Gerät. Die Werte stehen in
`frontend/src/design.css` und kommen aus dem Spiegel des Produkts; liegt keiner vor, steht
die Vorgabe des Kits darin, und die Datei sagt das in ihrem Kopf. Ein Block je Thema,
gewählt über `data-theme` am `<html>`.

**Das Thema kommt vom Gerät und nicht aus dieser App.** Sie läuft in einem Rahmen mitten in
der Oberfläche von Arasul, liest dessen `data-theme` am Elternfenster und hört auf
Änderungen: wer in Arasul umschaltet, sieht die App mitgehen. Ohne Rahmen gilt die
Einstellung des Betriebssystems.

Das zweite Stück ist die Bibliothek unter `frontend/src/marken/`: die sechs Bausteine des
Geräts, Kopf, Liste, Karte, Formular, Meldung und Menü, mit dem Stylesheet, das ihre
Regeln trägt. Sie ist ein **Spiegel** von `packages/marken` im Produkt, Datei für Datei,
und `frontend/src/marken/mirror.json` sagt, aus welcher Fassung sie kommt und mit welchen
Hashes.

**Der ganze Ordner wird ersetzt, nicht fortgeschrieben.** Wer darin eine Zeile ändert,
verliert sie beim nächsten Stand, und bis dahin meldet der Wächter des Kits sie:

```
node .ara/tools/marken.mjs          steht der Spiegel an seiner Quelle
node .ara/tools/marken.mjs --sync   ihn nachziehen
```

**Neue Oberfläche entsteht aus diesen Bausteinen**, importiert über `@marken`, denselben
Namen, unter dem die Oberfläche von Arasul sie kennt. Kein eigenes `<div>` daneben, das
aussieht wie eine Karte, und keine eigene Farbe: eigene Regeln gehören ans Ende von
`stil.css` und benutzen nur die Namen der Marken (`var(--ara-kante)`), keinen einzigen
Farbwert.

**Die Wege der App bleiben eine Ebene tief**, also `/vorgaenge` und nicht `/vorgaenge/17`.
Warum, steht im Kopf von `src/rahmen/basis.ts`: die Seite verweist relativ auf ihre Bündel,
weil sie beim Bauen nicht weiß, ob sie im Teststand oder live hängt. Was ein Verweis auf ein
einzelnes Ding braucht, gehört in die Suchanfrage.
