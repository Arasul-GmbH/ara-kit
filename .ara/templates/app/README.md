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
- Links zeichnet die App ihre eigene Seitenleiste: die Ansichten der Liste (alle, offene,
  entschiedene) und der Weg zum Formular. Ein Knopf oben klappt sie auf Symbolbreite zu und
  wieder auf. Unter 900 Pixeln steht sie als Blatt über der Seite. Sie folgt dem hellen
  und dem dunklen Erscheinungsbild des Geräts.
- Nach der Entscheidung steht am Vorgang, wer entschieden hat, bei einer Ablehnung die
  Begründung, und der Satz, den der Flow danach geschrieben hat.
- Unter „Freigaben" steht, was auf die Entscheidung der angemeldeten Person wartet, gezeichnet
  mit dem Baustein `Freigabe` der Bibliothek und nicht nachgebaut. Wer einen Vorgang
  eingereicht hat, sieht ihn dort nicht: das Gerät liefert nur, was die Person entscheiden
  darf. Bestätigt und abgelehnt wird über dieselben Wege wie in der Verwaltung des Geräts.

## Eine Freigabe, die ein Dokument zeigt

Wurde die App mit `--felder` angelegt (`--aenderbar`, `--original`), liest der Flow
`freigabe` zuerst ein Dokument (Schritt `lesen`, Rolle `leser`). Die Freigabe zeigt dann
**links das Original, zoombar, rechts die erkannten Felder**: was das Gerät nicht sicher
erkannt hat, steht oben mit „prüfen", ohne Prozentzahl. Ändern darf ein Mensch genau die
Felder, die die Rolle unter `ergebnis.aenderbar` nennt, ein anderes weist das Gerät ab.
Gespeichert wird, was die KI vorschlug und was der Mensch geändert hat; der weitere Lauf
arbeitet mit dem neuen Wert. Oben steht ein Satz, was bisher geschah, frühere Stufen
klappen auf, und nach der Entscheidung steht wieder die Liste da.

Das Original kommt aus dem Pfad `original` am Schritt `lesen`, relativ zur App. Die Vorlage
zeichnet unter `backend/kern/blatt.mjs` ein Blatt aus dem Text des Vorgangs; eine App mit
echten Dokumenten liefert stattdessen deren Bytes aus dem Weg in `server.mjs` und lässt den
Pfad auf ihn zeigen. **Der Pfad muss auf `.png`, `.jpg`, `.svg` oder `.pdf` enden**: die
Anzeige erkennt Bild und PDF am Ende des Pfades. Bei mehreren Stufen gehört die erste der
Erkennung: ist sie unsicher, legt das Gerät dort selbst eine Freigabe an, und die übrigen
Stufen folgen als Schritte des Flows.

Der erste Plan steht unter `plans/offen/`. Was die App danach kann, gehört hierher.

## Woher die Bausteine kommen

**Vom Gerät, zur Laufzeit.** Seitenleiste, Liste, Formular und der Rest kommen aus der
Bibliothek des Designsystems, und die liefert das Gerät selbst aus, unter einer festen
Adresse (`/marken/<Hauptzahl>/`). Die App trägt davon nichts in ihrem Paket. In der
`app.json` steht dafür nur die Hauptzahl (`"marken": "5"`), und wenn das Gerät sich
aktualisiert, steht in der App die neue Fassung, ohne dass jemand neu baut.

Unter `frontend/src/marken/` liegt trotzdem eine **Kopie**. Sie ist nur Quelltext: die
Typen für den Editor, und das, was `npm run dev` und eine lokale Vorschau zeigen, wo es
kein Gerät gibt. Ausgerollt wird sie nie, denn ins Paket geht nur das Ergebnis von
`npm run build`. Wer die Bibliothek ausdrücklich mitbringen will, etwa für ein Gerät, das
sie noch nicht ausliefert, schreibt die ganze Fassung der Kopie (drei Zahlen) in `marken` und baut mit
`npm run build:kopie`. `node .ara/tools/marken.mjs --sync` zieht die Kopie nach.

## Wer da ist

**Nicht aus einem Formularfeld.** Angemeldet wird an Arasul, und das Sitzungscookie fährt
bei jedem Aufruf dieser Seite mit. Wer es ist, sagt `api/me`: dieser eine Weg liegt unter
`api/` und gehört trotzdem der Plattform, damit auch eine App ohne eigenes Backend ihren
Benutzer anzeigen kann. Die Oberfläche liest ihn einmal und hält ihn als Kontext, das
Backend liest denselben Menschen aus den Kopfzeilen vor dem Container.

**Wer hineinkommt, entscheidet das Gerät**: es liefert die App nur dem aus, dem sie
freigegeben ist. **Was jemand darin sieht, entscheidet die App.** Sie darf dafür den Namen
und die Rolle aus den Kopfzeilen auswerten, denn die setzt die Plattform und fälschen kann
sie niemand: eine Zuordnung von Konten zu Mandanten, Abteilungen oder Akten ist Sache der
App und keine zweite Anmeldung. Diese Vorlage zeigt jedem, der hineinkommt, alle Vorgänge.
Wie eine App nach Mandanten trennt, steht in `.ara/knowledge/app-professional.de.md` unter
„Mandanten: wer was sieht“.

## Woher sie weiß, wie sie das Gerät erreicht

**Nicht aus ihrem eigenen Quelltext.** Unter welchem Namen das Gerät ihr die Adresse der
Schnittstelle und den Schlüssel in den Container legt, wie die Kopfzeile für den Schlüssel
heißt und welche Wege es dafür gibt, ist zwischen Kit und Produkt vereinbart und steht im
Kontrakt des einen Geräts. Dasselbe gilt für die Namen der beiden Kopfzeilen, in denen
Benutzer und Rolle ankommen, und für den Umgebungswert mit der Adresse der Datenbank. Das
Kit liest das beim Einspielen dort aus und legt es als `backend/arasul.json` ins Paket.

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
freigegeben ist. Der Flow nennt dafür keine Person und keine Rolle. Den Kreis enger ziehen
kann die App beim Start des Laufs: `VIER_AUGEN` in `backend/server.mjs` schließt den
Einreicher aus, und eine Regel im Kern kann die Konten nennen, die für einen Vorgang
zuständig sind. Das Gerät setzt beides durch, sobald sein Kontrakt `freigaben` führt.

**Auf der Karte der Freigabe steht die Nummer des Vorgangs, nicht sein Inhalt.** Was ein
Lauf bekommt, liegt am Gerät bei jedem Lauf und auf der Karte; was im Vorgang steht, liegt
in dieser App. Wer entscheidet, liest den Vorgang hier unter seiner Nummer.

Eine Ablehnung braucht eine Begründung. Entscheidet niemand innerhalb der Frist, endet der
Lauf ohne Entscheidung, und der Vorgang steht auf abgelaufen. Das ist kein Fehler.

## Was sie nicht kann

- **Test und live haben getrennte Daten.** Am Gerät liegen die Vorgänge in der Datenbank,
  die das Gerät der App je Stand gibt, und die überlebt jedes Einspielen und jedes Schalten.
  Wer live schaltet, nimmt die Vorgänge des Teststands nicht mit: der Livestand beginnt mit
  seinen eigenen, beim ersten Mal also leer.
- **Ohne Gerät bleibt nichts.** Über `--compose` oder auf dem eigenen Rechner liegen die
  Vorgänge in einer SQLite-Datei unter `daten/` im Container, und die überlebt das nächste
  Einspielen nicht. `GET /lage` sagt, welcher der beiden Fälle gilt.
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
| `src/rahmen/thema.ts` | Das Thema des Geräts, am eigenen Dokument gelesen und mitgeführt |
| `src/rahmen/anmeldung.tsx` | Wer da ist, aus `api/me`, als Kontext |
| `src/rahmen/schnittstelle.ts` | Die eine Stelle, an der etwas geholt wird |
| `src/rahmen/async-boundary.tsx` | Die drei Ausgänge einer Abfrage, an einer Stelle |
| `src/rahmen/seitenleiste.tsx` | Die Bereiche, im Muster `Seitenleiste`: als Spalte, unter 900 px als Blatt über der Seite |
| `src/marken/` | Die Bibliothek des Geräts, gespiegelt: 46 Primitive, 10 Muster, 6 Bausteine, beide Stylesheets. Import über `@marken`. Wird ersetzt, nicht bearbeitet |
| `src/vorgaenge.ts` | Typen und Abfragen der einen Entität dieser App |
| `src/seiten/liste.tsx` | Die Datenliste, mit dem einen ausgewählten Vorgang darunter |
| `src/seiten/neu.tsx` | Die Formularseite: einen Vorgang einreichen |

Das Backend, von außen nach innen:

| Datei | Was sie tut |
| --- | --- |
| `server.mjs` | Wege, Kopfzeilen, Statuscodes. Sonst nichts |
| `kern/vorgaenge.mjs` | Was mit einem Vorgang passiert. Kennt zwei Anschlüsse und die Welt sonst nicht |
| `ablage/vorgaenge.mjs` | Die eine Naht zur Datenbank. Hier steht das SQL der Vorgänge |
| `ablage/db.mjs` | Die Datenbank und ihre Migrationen: am Gerät PostgreSQL, ohne Gerät SQLite, dasselbe SQL. Der Stand steht in der Datenbank selbst |
| `ablage/migrationen/` | Eine Datei je Schritt. Was gelaufen ist, wird nie wieder angefasst |
| `package.json` | Die eine Abhängigkeit, `pg`. Das Gerät holt sie beim Bau |
| `arasul.mjs` | Die Naht zum Gerät. Kein Wert darin, den das Gerät vergibt |
| `arasul.json` | Die Vereinbarung mit dem Gerät. Im Quelltext leer, gefüllt wird sie beim Einspielen |

Die Schnittstelle des Backends, hinter `/apps/{{id}}/api/`:

| Weg | Was er tut |
| --- | --- |
| `GET /lage` | Name der App, ob das Gerät ihr eine Schnittstelle gegeben hat, und ob bleibt, was sie ablegt |
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

Ein Stück, und es gehört dem Gerät: die Bibliothek unter `frontend/src/marken/`. Sie ist
ein **Spiegel** des Pakets `packages/marken` aus dem Produkt, Datei für Datei, und
`frontend/src/marken/mirror.json` sagt, aus welcher Fassung sie kommt, welche
Abhängigkeiten sie braucht und mit welchen Hashes. Drei Sätze liegen darin:

| Satz | Wo | Wie viele |
| --- | --- | --- |
| Primitive | `marken/primitive/` | 46 |
| Muster | `marken/muster/` | 10 |
| Bausteine (laufen auch ohne Bau) | `marken/*.tsx` | 6 |

Dazu die beiden Stylesheets: `marken/theme.css` trägt die Werte beider Themen,
`marken/marken.css` die Regeln der sechs Bausteine. Die `stil.css` dieser App lädt sie in
der Reihenfolge, die das Paket nennt, und mit den zwei Schichtangaben, die dort stehen.

**Das Thema kommt vom Gerät und nicht aus dieser App.** Es gibt zwei, Hell und Dunkel, und
Hell setzt gar nichts: `:root` ist hell. Die Shell schreibt Klasse und `data-theme` in das
Dokument dieser App, bei jedem Wechsel und bei jedem Laden, und schickt denselben Wert als
Nachricht. `rahmen/thema.ts` liest das und rät nicht. Ohne Rahmen gilt die Einstellung des
Betriebssystems, und erst dann schreibt die App selbst.

**Der ganze Ordner wird ersetzt, nicht fortgeschrieben.** Wer darin eine Zeile ändert,
verliert sie beim nächsten Stand, und bis dahin meldet der Wächter des Kits sie:

```
node .ara/tools/marken.mjs          steht der Spiegel an seiner Quelle
node .ara/tools/marken.mjs --sync   ihn nachziehen
```

**Neue Oberfläche entsteht aus diesen Teilen**, importiert über `@marken`, denselben
Namen, unter dem die Oberfläche von Arasul sie kennt. Kein eigenes `<div>` daneben, das
aussieht wie eine Karte, und keine eigene Farbe: eigene Regeln gehören ans Ende von
`stil.css` und benutzen nur die Namen der Marken (`var(--ara-kante)`, `bg-card`), keinen
einzigen Farbwert.

Die Abhängigkeiten der Bibliothek stehen in `frontend/package.json`. Sie wird **mit** dieser
App übersetzt, ist also kein npm-Paket: was sie braucht, muss die App holen. Der Wächter
fragt danach.

**Die Wege der Oberfläche bleiben eine Ebene tief**, also `/vorgaenge` und nicht `/vorgaenge/17`;
die Wege des Backends unter `api/` dürfen tiefer gehen.
Warum, steht im Kopf von `src/rahmen/basis.ts`: die Seite verweist relativ auf ihre Bündel,
weil sie beim Bauen nicht weiß, ob sie im Teststand oder live hängt. Was ein Verweis auf ein
einzelnes Ding braucht, gehört in die Suchanfrage.

## Das Ergebnis eines Flows geht an die App zurück

Liefert der Flow ein Ergebnis (`--felder`, oder ein Mensch bestätigt es), steht im Kopf von
`flows/freigabe.md` `abschluss: { route: "/abschluss/freigabe" }`. Nach der letzten Stufe ruft das Gerät
diese Route des Backends mit dem Ergebnis, den Feldern samt den Korrekturen eines Menschen und der Nummer
des Laufs. **Erst wenn die App mit 2xx antwortet, ist der Lauf fertig**; sonst steht er auf „nicht
übergeben", und ein Administrator löst in der Läufe-Ansicht „erneut" aus.

Die Route steht in `backend/server.mjs`, was sie prüft in `backend/kern/abschluss.mjs`:

- **Das Geheimnis.** Der Aufruf trägt `Authorization: Bearer <ARASUL_ABSCHLUSS_TOKEN>`. Ohne oder mit einem
  falschen antwortet die App 401 und legt nichts an. Kennt sie selbst keines (eine laufende App bekommt es
  erst mit dem nächsten Einspielen), antwortet sie 503.
- **Die Kennung.** `Idempotency-Key: arasul-lauf-<nummer>`. Zu einer Nummer liegt ein Ergebnis genau einmal
  in `abschluesse`; derselbe Aufruf bei „erneut" bekommt wieder 2xx und legt nichts doppelt an.
- **Erst speichern, dann 2xx.** Scheitert die Ablage, antwortet die App 500, und der Lauf bleibt „nicht
  übergeben".

Die Tabelle `abschluesse` hält das Ergebnis, die Felder und die Korrekturen als Text; was die App damit
tut, steht dort noch nicht: das Gerüst legt es nur sicher ab. Eine Fach-App liest von hier und führt ihre
Vorgänge nach.

## Die App zeigt ihre Freigaben selbst

In `app.json` steht `"zeigt_freigaben": true`, weil diese App eine Seite für Freigaben hat. Damit öffnet
ein Klick in „Für Sie" die App mit `?freigabe=<nummer>` in der Adresse (ohne das Feld öffnet das Gerät die
Freigabe in Arasul). `src/app.tsx` führt vom Anfang der App zur Seite `src/seiten/freigaben.tsx`, die genau
diese Freigabe zeigt, auch nach dem Neuladen. Eine Nummer, die es nicht (mehr) gibt, zeigt die Liste mit einem
kurzen Hinweis. Wer die Seite entfernt, nimmt das Feld mit heraus.

## Ein Ereignis melden, eine Route rufen (Kontrakt 13)

Eine App kann dem Gerät sagen, dass etwas geschehen ist: `POST /api/v1/external/ereignisse/<name>` mit dem
Schlüssel der App, Körper `{"daten": {…}, "einreicher": "<Konto>"}`, beides freiwillig. Das Gerät startet jeden
Flow dieser App, der im Kopf unter `ausloeser` `{typ: ereignis, ereignis: <name>}` nennt, und antwortet sofort
mit `laeufe` und `nicht_gestartet`, ohne auf die Läufe zu warten. `daten` werden die Argumente des Flows mit
demselben Namen. Den Weg schreibt das Kit beim Einspielen aus dem Kontrakt in `backend/arasul.json` unter
`wege.ereignis_melden`, steht dort `null`, kennt das Gerät ihn nicht. Den Auslöser schreibt `--ausloeser "ereignis:<name>"` bei `--new`.

Ein Flow kann umgekehrt Routen einer App rufen: im Kopf `routen` (je Eintrag `methode`, `pfad`, freiwillig `app`
und `zweck`, höchstens 20), im Ablauf das Werkzeug `route_aufrufen`. Das eine gilt nur mit dem anderen.
`--check` hält beides zusammen. Wer das Ereignis melden darf, wen das Gerät als Rufenden einsetzt und was es
vor dem Aufruf prüft, sagt `app.mjs --device <gerät> --contract`, nicht diese Seite.
