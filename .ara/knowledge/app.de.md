# Verfahren: eine App bauen, von der ersten Frage bis live

> **Wann brauchst du das?** Wenn aus einem Wunsch eine App auf einem Gerät werden soll. Das hier
> ist der Kern. Eine Fach-App, mit Mandanten, Belegen, die das Gerät ausliest, oder einem
> Exportformat eines anderen Herstellers, liest dazu `.ara/knowledge/app-professional.de.md`.

## Der Lebenslauf

Eine App läuft im Kreis, und `/app` steht an jeder Station:

1. **Planen.** Es gibt keine Akte. Interview nach der Prüfliste unten, dann die Akte aus der
   Vorlage und ein Plan unter `plans/offen/`.
2. **Bauen.** Ein Plan ist aktiv. Erst seine Annahmen durchgehen, dann bauen, dann packen.
3. **Test.** Das Paket landet im Teststand eines Geräts. Der Fachmensch probiert es mit echter
   Anmeldung.
4. **Live.** Ein Mensch schaltet um. Der Plan wandert nach `erledigt/`, die README der App wird
   fortgeschrieben: was sie heute kann, was nicht, was man wissen muss, in den Worten dessen, der
   sie benutzt.
5. **Weiter.** Kein Plan offen: Lage zeigen, Interview zur Erweiterung, neuer Plan.

**Wo im Kreis ihr steht, sagt das Werkzeug, nicht du:** `node .ara/tools/app.mjs --app <name>`
nennt die nächsten Schritte mit ihren Aufrufen, nicht alles, was ginge. Was es an ein Gerät
geschickt hat, weiß es aus dem Merker `.ara/state.json`, der Notiz des Kits über sein eigenes Tun:
für eine Fassung, die schon live ist, schlägt es Plan und README vor statt `--check` und
`--deploy`. Was am Gerät steht, fragt `--status` dort.

## Die Prüfliste des Interviews

Frag gebündelt, bis jeder Punkt beantwortet ist oder als **Annahme** offen im Plan steht. Womit das
Haus arbeitet (`business/profile.md`), gehört in den ersten Entwurf.

| Was | Warum es entscheidet |
| --- | --- |
| **Der Arbeitsschritt dahinter** | Nicht die gewünschte Lösung. „Ein Bot für Urlaub" heißt: jemand liest Mails und trägt sie in eine Tabelle |
| **Wer es benutzt** | Wer sie sieht, entscheidet der Kunde am Gerät. Ob einer, zehn oder hundert, entscheidet den Bau |
| **Welche Daten** | Was hinein geht, liegen bleibt, hinaus geht. Personenbezogenes ausdrücklich benennen |
| **Die Schritte** | Aus Sicht des Menschen davor, ein Schritt je Zeile |
| **Wo ein Flow gebraucht wird** | Wo wirklich ein Sprachmodell arbeitet. Daten schieben ist ein Programm, kein Flow |
| **Wo ein Mensch entscheidet** | Jede Freigabe, wann ein Vorgang vollständig genug dafür ist, wer entscheidet und wer ausdrücklich nicht |
| **Wer was sehen darf** | Jeder darin alles, oder nur seine Mandanten, Abteilungen, Akten. Das entscheidet die App |
| **Was bleiben muss** | Was eine neue Fassung, ein Schalten und ein Jahr überlebt, und was davon nachgewiesen wird. Siehe „Daten, die bleiben" |
| **Welche Fachstandards gelten** | Exportformat, Kontenrahmen, Aufbewahrung, aus ihrer Primärquelle: `.ara/knowledge/app-professional.de.md` |
| **Welche Gestalt sie annimmt** | Ein Formular ist selten alles: die acht Muster in `.ara/knowledge/app-patterns.de.md`, und der Plan nennt das, das er benutzt |
| **Was nicht dazugehört** | Der Absatz, der später die Enttäuschung erspart |
| **Woran man sieht, dass es fertig ist** | Ein Satz, den man prüfen kann |
| **Was passiert, wenn es einmal falsch ist** | Etwas, das geprüft wird, ist ein Nachmittag. Etwas, das nie falsch sein darf, ist ein Projekt |

```
node .ara/tools/app.mjs --app <name> --new --titel "<Anzeigename>"
node .ara/tools/app.mjs --app <name> --plan "<titel>"
node .ara/tools/app.mjs --app <name> --plan-aktiv <datei>     offen wird aktiv
node .ara/tools/app.mjs --app <name> --plan-erledigt <datei>  aktiv wird erledigt
```

`--new` legt die Akte aus der Vorlage an, `--plan` den Plan, den du im Gespräch ausfüllst. Pläne
liegen unter `apps/<name>/plans/`, und der Ordner ist der Stand. **Aktiv ist höchstens einer**, das
Werkzeug lässt keinen zweiten zu. Erledigt ist ein Plan, wenn seine Fassung **live** steht, nicht
wenn der Code fertig ist.

## Bauen

```
node .ara/tools/app.mjs --app <name> --build
```

Das Paket entsteht unter `build/`, ohne Pläne, README und Bau; ein Ordner mit eigenem Bau wird
gebaut, der Rest wandert, wie er ist.

- **Lokal läuft der Bau, nicht die App.** Was sie tut, sieht man am Gerät, mit echter Anmeldung und
  echtem Modell.
- **Ein Bau, der älter ist als der Quelltext, wird nicht eingespielt**, das Werkzeug hört auf: sonst
  ginge der Stand von vorgestern an das Gerät.
- **Der Typprüfer läuft vor dem Bündler**, `tsc --noEmit && vite build`: ein Typfehler hält den Bau
  an, statt als leere Seite anzukommen.
- **Ins Paket geht der Bau, nicht der Quelltext.** Jeder Kontrakt sagt es, und `--check` hält an
  bei `package.json`, `src/` oder `tsconfig.json` im Ordner der Oberfläche: der Browser bekäme eine
  `index.html`, die auf `/src/main.tsx` zeigt, eine leere Seite ohne Hinweis, woran es liegt.

## Auf ein Gerät

```
node .ara/tools/app.mjs --device <gerät> --app <name> --check
node .ara/tools/app.mjs --device <gerät> --app <name> --deploy
node .ara/tools/app.mjs --device <gerät> --app <name> --live
```

Ohne Akte unter `devices/` kein Kontrakt und kein `--check`: dann kommt `/device` zuerst. Der Weg
eines Pakets steht in `.ara/knowledge/deploy.de.md`, was das Gerät mitbringt in
`.ara/knowledge/platform-services.de.md`, das Aussehen in `.ara/knowledge/design-system.de.md`.

## Daten, die bleiben

**Genau ein Ort hält: die Datenbank, die das Gerät der App gibt**, ihr eigenes PostgreSQL je Stand,
wie der Kontrakt unter `daten` sagt. Ihre Adresse kommt in dem Umgebungswert, den er unter
`umgebung.datenbank` nennt und den das Kit in `arasul.json` schreibt. Sie überlebt jedes
Einspielen, Schalten und Neustarten und wird jede Nacht gesichert; die Daten einer App holt ein
Administrator zurück, wie `daten.wiederherstellen` sagt. Test und live haben je eine eigene, siehe
`.ara/knowledge/deploy.de.md`.

**Was nicht bleibt**, weil jedes Einspielen den Container ersetzt: sein Dateisystem, ein `VOLUME`
eingeschlossen, eine SQLite-Datei, ein Ordner für Hochgeladenes. Eine hochgeladene Datei gehört in
eine Spalte (`BYTEA`).
Entfernen wirft die Datenbanken der App weg, ihre Sicherungen bleiben.

**Die Vorlage tut das schon** in `backend/ablage/db.mjs`: ein leerer Wert hält den Start an,
statt in eine Datei zu schreiben, ohne Gerät nimmt sie SQLite, und der Weg `lage` sagt
`dauerhaft: false`.

**Die Datenbank beginnt leer**, und die App legt das Schema mit ihren Migrationen an, eine Datei je
Schritt unter `backend/ablage/migrationen/`, vermerkt in der Tabelle `migrationen`. **Was einmal
gelaufen ist, wird nie mehr angefasst**: das änderte die Vergangenheit von Datenbanken, die es
schon gibt.

## Was die Vorlage schon ist

Der Klon bringt keine App mit; die Vorlage liegt unter `.ara/templates/app/`, und was `--new` daraus
macht, läuft ab der ersten Minute: ein Vorgang liegt in der Datenbank des Geräts, der Flow
`freigabe` startet mit seiner Nummer und seinem Einreicher, ein Mensch entscheidet in Arasul, und der
Vorgang steht als genehmigt oder abgelehnt da, mit Entscheider und dem Satz des Flows. Fragt jemand,
wie eine App aussieht, leg eine an und zeig sie.

Der Stapel ist der der Oberfläche des Geräts: **Vite, React, TypeScript, Tailwind,
`react-router`, TanStack Query.** Fünf Stellen, jede gibt es einmal:

| Stelle | Was dort steht |
| --- | --- |
| `rahmen/basis.ts` | Der Pfad, unter dem die App hängt, aus der Adresse gelesen: `/apps/<id>/`, im Teststand `/apps/<id>/test/`. Darum **bleiben die Routen eine Ebene tief**, der Rest geht in die Abfrage |
| `rahmen/thema.ts` | Das Thema, am eigenen Dokument der App gelesen |
| `rahmen/schnittstelle.ts` | Das einzige `fetch`: Pfad, Anmeldung, Hülle der Antwort |
| `rahmen/anmeldung.tsx` | Wer da ist, aus `api/me`, mit Rolle |
| `rahmen/async-boundary.tsx` | Lädt, ging schief, ist da. Jede Abfrage geht hindurch |

Das Backend: `server.mjs` macht HTTP, `kern/vorgaenge.mjs` die Fälle mit **zwei Anschlüssen**, einer
Ablage und einem Gerät, darum wird jeder Fall ohne beides geprüft. Eine Ablage je Entität mit dem
einzigen SQL dafür, im Dialekt von PostgreSQL; `ablage/db.mjs` übersetzt es für SQLite.
`kern/csv.mjs` schreibt einen Export.

**Sie beschreibt sich selbst für Agenten**: das Feld `agent` in `app.json` nennt die Routen, die ein
Agent rufen darf, und das Backend beantwortet die Route `agent` aus einer Kopie der `app.json`, die
der Bau danebenlegt, eine zweite Liste gibt es nicht. `--check` und `--deploy` halten das Feld gegen
die App. Seine Form, und was das CLI einer Wurzel damit tut: `.ara/knowledge/root.de.md`, „Die
Brücke zum Gerät".

## Was du dabei nicht tust

Kein Produktwert aus dem Kopf oder im Quelltext der App, er kommt in `backend/arasul.json`. Keine
zweite Ablage. Keine eigene Anmeldung, kein Inhalt in einer Freigabeanfrage, keine Freigabe, die
sich die App selbst erteilt: `.ara/knowledge/platform-services.de.md` sagt, warum. Nichts
eingespielt ohne `--check`.
