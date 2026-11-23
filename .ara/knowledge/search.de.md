# Die Suche einer App: was die Kopfleiste des Geräts findet

> **Wann brauchst du das?** Wenn eine App Listen hat (`/app`), wenn `--check` einen Hinweis
> „Suche:“ zeigt, und wenn eine bestehende App die Suche nachzieht.

## Was es ist, in einfachen Worten

Oben im Gerät steht eine Suchleiste, die Kopfleiste. Wer dort „Podest“ oder einen Kundennamen
tippt, soll nicht nur die App finden, sondern den Eintrag darin: das Angebot, den Vorgang, den
Beleg. Dafür fragt das Gerät jede App, die es kann, im Namen dessen, der tippt, und zeigt ihre
Treffer. Ein Klick öffnet den Eintrag in der App.

Eine App kann es, wenn sie eine **Suchroute** hat: eine Adresse ihres Backends, die auf einen
Suchtext mit einer kurzen Trefferliste antwortet. Eine App ohne Suchroute bleibt gültig, das Gerät
zeigt sie dann nur als App.

## Der Vertrag

| Was | Wie |
|---|---|
| Frage | `GET suche?q=<text>&limit=<n>` an der Schnittstelle der App: `/apps/<id>/api/suche`, im Teststand `/apps/<id>/test/api/suche` |
| Antwort | `{ "data": [ { "titel", "unterzeile", "art", "pfad" } ] }`, alle vier Texte |
| Anzahl | höchstens zehn, auch wenn `limit` mehr verlangt; ohne `limit` zehn |
| Zu kurz | ein leeres `q` oder eines unter zwei Zeichen gibt eine leere Liste, keinen Fehler |
| `pfad` | wo sich der Eintrag öffnet, unter der Adresse der App, beginnt mit `/`: `/?nr=17` |
| Wer was findet | dieselben Einträge wie in der Liste dieses Menschen, aus den Kopfzeilen von Benutzer und Rolle, die das Gerät setzt. Niemand findet, was er nicht sehen darf |
| Angemeldet | ein Eintrag im Feld `agent` der `app.json`, lesend, mit `q` (string, Pflicht) und `limit` (integer, frei). Kein neues Feld im Manifest, keine neue Kontraktfassung |

Der Eintrag im Feld `agent` ist derselbe, über den Agenten eine App aufrufen. So geht auch
`node arasul.mjs call <app> suche q=Podest` aus der Wurzel eines Hauses.

## Eine neue App

Sie hat die Suche schon: `node .ara/tools/app.mjs --app <name> --new` legt sie an. Was wo steht:

- `backend/kern/suche.mjs`: die Regeln oben, ohne Datenbank und ohne HTTP, mit Tests in
  `backend/test/`.
- `backend/ablage/vorgaenge.mjs`, `suchen(begriff, grenze)`: dieselbe Abfrage wie die Liste, nur mit
  dem Suchtext in Titel und Text.
- `backend/server.mjs`: die Route `GET /suche` und die Liste `suchquellen`, eine Quelle je Liste.
- `app.json`: der Eintrag in `agent`.

Die Muster ziehen mit, wenn sie mit `--add-pattern` eingehängt werden. **Mandanten** (`clients`)
ersetzt die Quelle der Vorgänge durch eine in der Sicht dessen, der fragt. **Dokumente** und
**Belege** hängen die Dokumente an, Belege ebenfalls in der Sicht der Mandanten. Gesucht wird im
Titel und Text eines Vorgangs und im Dateinamen eines Dokuments. Hat eine Fach-App eigene Listen,
bekommt jede ihre Quelle, nach demselben Vorbild.

## Eine bestehende App nachziehen

Eine App, die vor der Suche gebaut wurde, bekommt bei `--check` den Hinweis „Suche: die App hat
Listen, aber keine Suche für die Kopfleiste des Geräts“. So zieht sie nach, in dieser Reihenfolge:

1. **Den Kern kopieren.** `.ara/templates/app/backend/kern/suche.mjs` nach `backend/kern/` der App.
   Steht in ihrer `backend/ablage/db.mjs` noch kein `likeMuster`, die Funktion aus der Vorlage
   dazunehmen.
2. **Je Liste eine Abfrage.** In der Ablage jeder Liste, die gefunden werden soll, eine Funktion
   `suchen(begriff, grenze)`: **dieselbe Bedingung wie die Liste**, dazu
   `LOWER(spalte) LIKE $n ESCAPE '\'` mit `likeMuster(begriff)` und `LIMIT`. Vorbild:
   `suchen` in `.ara/templates/app/backend/ablage/vorgaenge.mjs`, mit Mandanten in
   `.ara/templates/app-patterns/clients/backend/ablage/vorgaenge.mjs`. Die Abfrage nimmt nie
   weniger Bedingungen als die Liste.
3. **Die Route.** In `backend/server.mjs`: `import { suchen, vorgangsQuelle } from
   "./kern/suche.mjs";`, nach dem Öffnen der Datenbank die Zeile
   `const suchquellen = [vorgangsQuelle(() => vorgangsAblage(db))];` und vor den anderen Wegen der
   Block `if (pfad === "/suche" …)`, alles wie in der Vorlage. Mit Mandanten heißt die Zeile
   `const suchquellen = [vorgangsQuelle((wer) => vorgangsAblage(db, mandantenFall.sicht(wer)))];`,
   mit Dokumenten kommt `suchquellen.push(dokumentQuelle(…))` dazu, so wie `--add-pattern` es
   einsetzt (`.ara/templates/app-patterns/*/wiring.json`).
4. **Anmelden.** Den Eintrag in das Feld `agent` der `app.json`, wie in
   `.ara/templates/app/app.json`. Den Satz in `purpose` auf das anpassen, was die App findet.
5. **Prüfen.** Lokal `curl "http://127.0.0.1:<port>/suche?q=<wort>"`; mit Mandanten die Probe
   `node backend/probe/fremde-suche.mjs` (ihr Kopf sagt, wie, im Teststand nie live). Dann
   `--build`, `--check` (der Hinweis ist weg) und `--deploy` in den Teststand, dort
   `node arasul.mjs call <app> suche q=<wort>`.

Eine App, die nicht aus der Vorlage kommt, baut die Route in ihrem eigenen Stack nach dem Vertrag
oben. Für das Kit zählt der Eintrag in `agent` mit `q`, und dass die Route im Backend steht.

## Was niemand finden darf

Die Suche ist ein zweiter Weg zu denselben Einträgen, und er darf nicht weiter reichen als der erste.
Deshalb baut jede Quelle ihre Ablage genau so wie der Weg der Liste, mit dem Menschen aus den
Kopfzeilen. Ohne Anmeldung findet niemand etwas. In einer App mit Mandanten belegt das die Probe
`backend/probe/fremde-suche.mjs`: Mitarbeiter A legt einen Vorgang in seiner Akte an, A findet ihn,
B mit einer anderen Akte findet ihn unter keinem Wort. Die Suche gibt nur Titel, eine Zeile und den
Pfad heraus, nie den ganzen Eintrag.
