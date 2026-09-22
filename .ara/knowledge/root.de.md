# Verfahren: die Wurzel eines ganzen Hauses

> **Wann brauchst du das?** Bei `/root`: einen Wurzelordner für eine ganze Organisation
> anlegen, einen Ort oder die Methode nachtragen, ihren Vorschlag anmelden, sie prüfen, die
> Vorzeigefassung zeigen.

## Was eine Wurzel ist, und was nicht

Ein Haus, das mit Agenten über mehrere Projekte arbeitet, hat sein Wissen in Inseln: ein
Repository mit Regeln und Skills, ein geteilter Ordner ohne, ein zweites Repository mit
eigenen. Keine Insel kennt die übrigen, und ein Agent, der in einer startet, weiß von den
anderen nichts. Eine Wurzel ist der eine Ordner darüber. Sie sagt, **was stimmt und wo etwas
liegt**, und sie nennt die Orte, an denen gearbeitet wird.

**Eine Wurzel ist ein Gerüst und keine Arbeitsweise.** Ohne Schalter angelegt trägt sie
Regeln, Skills, Agents, die Liste der Orte, ein Prüfskript und die Ordner der Ebene 1, die
das Haus nennt. Wie das Haus seine Arbeit steuert, mit Karten, Experimenten oder anders, ist
seine Sache. Das Kit bietet eine Weise als Zusatz an, die Methode, und die Wurzel läuft ohne
sie.

**Nichts im Baum läuft von selbst.** Es liegt keine `settings.json` darin und kein scharfer
Hook. Eine solche Datei in einem Ordner, der geklont oder geteilt wird, ist eine
Entscheidung für jeden, der den Ordner öffnet, und ein Hook darin läuft, ohne dass je jemand
zugestimmt hat. Was das Haus an Grenze und Rechten will, liegt in `.claude/proposal/` als
Vorschlag und wird erst durch den Anmeldeschritt wirksam, nach Zustimmung, in den eigenen
Einstellungen des Nutzers.

**Eine Wurzel liegt außerhalb des Kits.** Das Kit ist ein Werkzeug und höchstens einer ihrer
Orte, nicht ihr Zuhause. Das Werkzeug weist einen Pfad im Kit ab. Nach dem Anlegen braucht
die Wurzel das Kit nicht mehr: ihr Prüfskript liegt in ihr und läuft mit Node allein.

**Eine Wurzel kopiert nichts.** Ein Ort ist ein GitHub-Repository oder ein fremder Ordner wie
SharePoint oder OneDrive. Er steht in der Liste mit dem, wo er lebt, und höchstens mit dem,
wo er auf diesem Rechner liegt: ein Klon, ein abgeglichener Ordner. Dieselbe Datei an zwei
Orten ist ein Fehler, keine Sicherung, und das Prüfskript der Wurzel meldet eine Kopie als
Befund.

## Was entsteht

```
<wurzel>/
├── README.md
├── .gitignore
├── .claude/
│   ├── CLAUDE.md              Die Regeln: Wahrheitstabelle, harte Regeln, wohin Neues gehört
│   ├── skills/                place, where-things-go
│   ├── agents/                place-reader (liest nur), root-checker
│   ├── places.json            Die Liste der eingebetteten Orte
│   ├── root.json              Name, Sprache, Tag des Anlegens, Version des Kits, Methode ja oder nein
│   ├── proposal/
│   │   ├── proposal.json      Erlaubnisregeln und der Hook, als Vorschlag
│   │   ├── boundary.mjs       Der Hook: aus der Wurzel wird in keinen Ort geschrieben
│   │   └── boundary-test.mjs  Die Fälle der Grenze
│   └── scripts/
│       └── check.mjs          17 Prüfungen, Rückgabe 0 heißt kein Befund
└── <die Ordner der Ebene 1, wie das Haus sie nennt>/
```

**Mit der Methode** kommt mehr dazu: `company/` (core, goal, decisions, follow-ups,
assumptions, risks), `roadmap/` mit einem Blatt je Ort und `backlog/` (new, ready, running,
done, der Ordner ist der Status), `experiments/`, `customers/`, `templates/`, `archive/`, das
Kartenwerkzeug `.claude/scripts/cards.mjs`, der Skill `card-stack` und ein Abschnitt "Die
Methode" am Ende der Regeln.

Ordner, Felder und Spalten heißen in beiden Sprachen englisch, wie überall im Kit. Der
Inhalt der Blätter folgt `--language`, sonst dem Profil. Ein unbekannter Schalter wird
gemeldet und hält das Werkzeug an: `--lang` wurde früher überlesen, und die Wurzel kam in der
Sprache des Profils heraus, ohne dass jemand sie gewählt hatte.

## Das Interview, in einem Bündel

Frag über das Interview-Werkzeug, alles auf einmal, und arbeite dann durch:

1. **Wo** die Wurzel liegen soll. Ein Pfad neben den Projekten, nicht in einem abgeglichenen
   Ordner, wenn sie eine Versionsverwaltung tragen soll: Dateiabgleich und ein aktives `.git`
   vertragen sich nicht.
2. **Wie das Haus heißt.** Das geht in die Überschrift der Regeln und der README.
3. **Welche Sprache.** Vorgabe ist das Profil.
4. **Die Ordner der Ebene 1.** Wie das Haus die oberste Ebene seiner Arbeit nennt: `sales`,
   `product`, `finance`. Namen in Kleinbuchstaben und je Ordner höchstens eine Wendung dazu,
   was dorthin gehört. Das Kit bringt keine eigenen mit und schlägt keine vor. Ein Haus, das
   es noch nicht weiß, nennt keinen, ein Ordner ist später leicht von Hand dazugelegt.
5. **Welche Orte**, und je Ort: ein kurzer Name in Kleinbuchstaben, `github` oder `folder`,
   wo er lebt (Adresse oder Pfad), wo er auf diesem Rechner liegt, falls er das tut, wofür er
   da ist, und ob die Wurzel in ihn schreiben darf. **Vorgabe ist nein.**
6. **Die Methode oder nicht.** Biete sie als Zusatz an, in einem Satz: Blätter zum Haus, ein
   Blatt je Ort mit Zielen und Fristen, ein Kartenstapel als die eine Arbeitsliste,
   Experimente. Vorgabe ist nein. Wer nein sagt, kann sie später noch dazulegen.

**Du siehst nach, bevor du fragst.** Ob ein Pfad existiert, ob er ein Repository ist, wie
sein Remote heißt: das sagen `ls` und `git remote -v`, nicht der Mensch. Du liest nur. **In
den Orten änderst du nichts**, nicht beim Anlegen und nicht danach: keine Datei, keinen
Link, keine Konfiguration. Das gilt besonders für ein Haus, das nicht das eigene ist.

**Warum das Schreiben zunächst zu ist.** Eine Sitzung in der Wurzel lädt die Regeln des
Ortes nicht. Ein Repository hat seine eigene `CLAUDE.md`, seine Skills und seine Hooks, in
einem geteilten Ordner arbeiten Menschen. Wer dort etwas ändern will, startet dort eine
Sitzung. Die Wurzel sagt, *was* der Ort bis wann können muss, der Ort entscheidet, *wie*.
Will das Haus es für einen Ort anders, steht `write: yes` für alle lesbar in der Liste, und
eine Zeile in den Regeln oder, mit der Methode, in `company/decisions.md` sagt, warum.

## Anlegen

```
node .ara/tools/root.mjs --path <ordner> --name "<haus>" --folders "sales,product=was wir bauen" --places <datei.json>
```

Für den Zusatz kommt `--method` dazu. `--folders` nimmt `name` oder `name=wofür`, durch
Kommas getrennt. Ein Wert mit Leerzeichen gehört in Anführungszeichen. Bei einem Ort reicht
`--place <name> --kind github|folder --where <adresse> [--local <pfad>] [--write yes]
--purpose "<wofür>"`. Für mehrere schreibst du die Liste in eine Datei außerhalb des Kits, in
den temporären Ordner des Systems, und übergibst sie mit `--places`:

```
[
  { "name": "api", "kind": "github", "where": "https://github.com/acme/api",
    "local": "~/Code/acme/api", "purpose": "das Produkt" },
  { "name": "projects", "kind": "folder", "where": "https://acme.sharepoint.com/sites/projects",
    "local": "~/Library/CloudStorage/OneDrive-Acme/Projects", "purpose": "ein Ordner je Projekt" }
]
```

Das Ziel muss leer sein oder fehlen, das Werkzeug überschreibt nichts. Es legt den Baum aus,
schreibt die Liste und den Vorschlag, lässt das Prüfskript der frischen Wurzel laufen, legt
ein Repository mit einem ersten Commit an (`--no-git` lässt das weg) und sagt, wie lange es
gedauert hat. **Die Prüfung endet ohne Befund, oder du sagst, was sie gefunden hat.** Ein
Befund in einer frischen Wurzel ist ein Fehler des Gerüsts, nicht des Menschen: melde ihn mit
`gh issue create` an das Kit, wenn der Mensch einverstanden ist.

## Nach dem Anlegen

Sag in drei Zeilen, was wo liegt, und dann die nächsten Schritte, die das Werkzeug nennt.
Biete an, die drei Sätze oben in `.claude/CLAUDE.md` gemeinsam zu schreiben: was das Haus
tut, für wen, wer entscheidet. Mit der Methode biete die beiden Blätter `company/core.md`
und `company/goal.md` an: wo das Haus steht, der Engpass, was ausdrücklich nicht getan wird,
das Nordziel als ein prüfbarer Satz, die Meilensteine mit Fristen. Du schreibst in die
Wurzel nur, was der Mensch gesagt hat. **Keine Zahl aus dem Gedächtnis, kein erfundenes
Ziel.**

Von da an **startet der Agent in der Wurzel oder in einem Ordner der Ebene 1**, nicht im Kit
und nicht in einem Ort. Eine Sitzung eine Ebene tiefer lädt die Regeln, Skills und Agents der
Wurzel ebenfalls.

```
node .ara/tools/root.mjs --path <wurzel> --place <name> --kind ... --where ... --purpose ...
node .ara/tools/root.mjs --path <wurzel> --method
node .ara/tools/root.mjs --path <wurzel> --show
node .ara/tools/root.mjs --path <wurzel> --check
```

`--place` mit einer bestehenden Wurzel trägt einen Ort nach: eine Zeile in der Liste, die
Regeln des Vorschlags und, mit der Methode, sein Blatt. Regeln, die das Haus von Hand
eingetragen hat, bleiben. `--method` legt den Zusatz in eine Wurzel, die keinen hat: Dateien
und Ordner, die noch nicht da sind, die Regeln an `.claude/CLAUDE.md` angehängt, ein Blatt je
Ort. Überschrieben wird nichts, und ein Ordner des Hauses, der so heißt wie einer der
Methode, hält sie an, bis das Haus ihn umbenannt hat. Ein neuer Ordner der Ebene 1 entsteht
später von Hand, mit einer Zeile in der Tabelle "Wohin Neues gehört" der `.claude/CLAUDE.md`,
und die Prüfung sagt, wenn die Zeile fehlt. `--show` nennt die Wurzel, ihre Orte, ob die
Methode darin liegt und wie es um die Anmeldung steht. `--check` lässt das Prüfskript der
Wurzel laufen.

## Der Vorschlag und die Anmeldung

`.claude/proposal/proposal.json` trägt die Erlaubnisregeln (`allow`, `deny`,
`additionalDirectories`) und den Hook, `boundary.mjs` liegt daneben. **Er ist ein Vorschlag.**
Jede Regel trägt einen Pfad, `{root}` steht für den Ordner der Wurzel, denn eine Regel in den
eigenen Einstellungen des Nutzers gilt für jede Sitzung auf dem Rechner, und ein relatives
`./` meinte den Ordner der jeweiligen Sitzung.

Der Anmeldeschritt ist die eine Stelle, an der ein Vorschlag zu einer Einstellung wird:

```
node .ara/tools/root.mjs --path <wurzel> --enroll
node .ara/tools/root.mjs --path <wurzel> --enroll --consent <prüfsumme>
node .ara/tools/root.mjs --path <wurzel> --unenroll
```

1. `--enroll` allein zeigt und schreibt nichts: die Einstellungsdatei, in die es käme, den
   Hook mit seinem vollen Befehl, jede Regel und die **Prüfsumme** über `proposal.json` und
   `boundary.mjs`.
2. Frag den Menschen über das Interview-Werkzeug, mit diesem Text. Die Frage nennt die
   Absicht (die Grenze und die Regeln in die eigenen Einstellungen hängen), das Ziel (diese
   Einstellungsdatei und eine Kopie des Hooks daneben) und den Rückweg (`--unenroll`). Die
   Antwort ist die Zustimmung.
3. Erst dann `--enroll --consent <die ersten 16 Zeichen der Prüfsumme>`. Eine Prüfsumme, die
   nicht zum Vorschlag passt, wie er jetzt ist, schreibt nichts. Der Stand der Einstellungen
   davor liegt daneben als `.ara-backup`.
4. **Der Hook, der läuft, ist eine Kopie** neben den Einstellungen, nicht die Datei im Baum.
   Eine Änderung im Baum, etwa durch einen Pull, wirkt erst nach neuer Zustimmung: `--show`
   sagt, dass der Vorschlag sich geändert hat, was zugestimmt war, läuft weiter, und
   `--enroll` zeigt die neue Prüfsumme. Was die Wurzel in die Einstellungen des Nutzers
   einträgt, wird festgehalten, und `--unenroll` nimmt genau das zurück und sonst nichts.

`--settings <datei>` nennt eine andere Einstellungsdatei als die des Agenten selbst. Das
Einloggen an einem Gerät gehört nicht hierher: das ist das CLI der Wurzel, `arasul.mjs`, siehe
„Die Brücke zum Gerät“ unten. Es führt denselben Freigabeschritt in einer eigenen Fassung,
weil es mit Node allein läuft, und legt dieselben Dateien an: was das eine einträgt, nimmt
das andere zurück.

## Die Brücke zum Gerät

`arasul.mjs` liegt in jeder Wurzel, neben `.claude/`. Es läuft mit Node allein und kommt wie
das Prüfskript aus dem Kit. Ein Agent in der Wurzel kann keinen Ausweis für ein Gerät halten,
nicht fragen, welche Apps einem Menschen zugewiesen sind, nicht die Ordner abgleichen, die ein
Gerät ihm freigibt, und nicht aufrufen, was eine App anbietet. Diese Datei tut das, und sonst
nichts.

| Befehl | Was er tut |
| --- | --- |
| `login <adresse> --user <name>` | Meldet an, lässt einen Ausweis ausstellen, zeigt danach die Vorschläge und die Orte. Das Passwort wird am Terminal gefragt und nie gezeigt, `--password-stdin` nimmt es aus der ersten Zeile der Eingabe, ein Argument nie. `--credential-name` sagt, unter welchem Namen das Gerät den Ausweis führt, sonst der Name dieses Rechners |
| `login <adresse> --token-stdin` | Dasselbe mit einem Ausweis statt Name und Passwort. Ausgestellt wird er in der Oberfläche des Geräts |
| `login`, `login --approve <prüfsumme>`, `login --withdraw` | Die Vorschläge zeigen, einen mit seiner Prüfsumme freigeben, alles zurücknehmen, was das Freigeben eintrug |
| `apps` | Die dem Menschen zugewiesenen Apps mit ihren Routen. Schreibt `apps/<id>/APP.md` für jede |
| `sync` | Gleicht den Firmenordner ab, die Wurzel des Geräts oben in diesem Ordner eingeschlossen, schreibt dieselben Dateien und `sicht.md`, die Sicht dieses Menschen. `--client` nennt den Kommandozeilen-Klienten des Dateidienstes |
| `status` | Das Gerät, der Ausweis, ob das Gerät ihn annimmt, der Firmenordner je Ordner mit der Wurzel zuerst, `sicht.md`, die Vorschläge |
| `deploy` | Legt diese Wurzel in die Wurzel des Geräts: zuerst das Prüfskript, die Wurzel als Administrator angelegt, nur wenn das Gerät keine führt, danach ein Herunterladen als Beweis. `root.mjs --deploy` ruft es |
| `call <app> <route> [name=wert ...]` | Ruft eine Route einer App auf und schreibt die Antwort auf die Standardausgabe. `--write` für eine Route, die etwas ändert, `--method`, wo es einen Pfad für zwei Methoden gibt |

**Der Ausweis** liegt in `~/.config/arasul/credentials.json`, Rechte 0600, je Gerät ein Eintrag
mit Adresse und Ausweis. Nie in der Wurzel, nie im Schlüsselbund. Die Anmeldung schickt Name und
Passwort an den Anmeldeweg, und was zurückkommt, ist eine Sitzung: sie hat ein Ende und trägt
alles, was der Mensch darf, die Sitzung eines Administrators eingeschlossen. Sie wird deshalb für
genau eine Anfrage benutzt, `POST /api/ausweise`, und danach fallen gelassen. Abgelegt wird der
Ausweis, den das Gerät dort ausstellt: er läuft nicht ab, er sagt, wer jemand ist, und er öffnet
die drei Wege, die diese Datei geht, und keine Verwaltung. Seinen Wert zeigt das Gerät einmal, in
der Antwort auf diese Anfrage; wer ihn verliert, stellt einen neuen aus. Weder das Passwort noch
etwas davon wird abgelegt. Ein Gerät mit eigenem Zertifikat wird einmal mit `--insecure`
festgehalten: das Zertifikat wird der Anker des Vertrauens für dieses eine Gerät, die Prüfung
wird nicht abgeschaltet.

**Was das Werkzeug über das Gerät annimmt**, steht in einem Block an seinem Kopf, mit dem
Datum, von dem es ist: `POST /api/auth/login`, `POST /api/ausweise`, `GET /api/auth/session`,
`GET /api/apps/meine` und `GET /api/firmenordner`, aus der API-Referenz des Produkts, und fürs
Ausrollen, mit einer Sitzung und nie mit dem Ausweis, `GET /api/auth/me`,
`POST /api/auth/logout`, `GET /api/firmenordner/ordner`, `POST /api/firmenordner/ordner` und
`POST /api/firmenordner/rechte`. Eine weitere fragt das Werkzeug, und kein Gerät kennt sie am
22.09.2026: die Route `sicht` unter der Route des Firmenordners, die Sicht eines Menschen. Ein
404 dort heißt: noch nicht. Das sind
Aussagen über das Produkt wie jede andere, und `check-docs.mjs` klopft an ihnen an. Die Route,
mit der jede App ihre Beschreibung liefert, heißt `agent` und liegt in der eigenen Schnittstelle
der App.

## Der Firmenordner

`sync` fragt mit dem Ausweis `GET /api/firmenordner`. Das Gerät antwortet mit der Adresse seines
Dateidienstes, dem Namen des Menschen dort und je Ordner mit Kennung, Ebene, Eltern, Pfad und
Recht. **`503` ist keine leere Liste**: das erste heißt, auf diesem Gerät läuft kein Dateidienst,
das zweite heißt, dieser Mensch hat keinen Ordner. Ein Werkzeug, das beides verwechselt, räumt
jemandem den Baum leer.

**Jeder Ordner landet an seiner echten Stelle in diesem Baum.** Ein Ordner der Ebene 1 wird ein
Ordner oben in der Wurzel, einer der Ebene 2 wird `<eltern>/<kennung>`, und die Kette darüber
wird lokal angelegt, auch wenn der Mensch auf dem Elternordner kein Recht hat und ihn im Dienst
gar nicht sieht. Ein Ordner der Ebene 1, der heißt wie ein Ordner, den die Wurzel selbst trägt,
wird nicht angelegt, und einer, dessen Kennung keine ist, auch nicht; beide werden benannt.

**Der Raum der Wurzel ist die Wurzel selbst.** Das Gerät führt eine eigene Wurzel, Ebene 0 mit
der Art `wurzel`, genau eine je Gerät, und nennt sie jedem aktiven Menschen zuerst in seiner
Ordnerliste, mit leerem Pfad und dem Recht, das aus der Rolle folgt: jeder liest, Administratoren
schreiben, kein Recht je Person (Stand 22.09.2026, gemessen an einem Gerät, dessen Wurzel die
Kennung `firma` trägt). Das Werkzeug erkennt sie an Ebene und Art und an nichts anderem und nimmt
die Kennung aus der Antwort: der Raum im Dateidienst heißt nach dieser Kennung. Dieser Raum wird
nicht in einen Ordner unter der Wurzel gelegt, er wird auf den Ordner der Wurzel selbst
abgeglichen: `.claude/`, `arasul.mjs`, die README und alles andere des Gerüsts kommen oben an,
und wer `lesen` auf der Wurzel hat, bekommt sie nur lesbar. Der Baum eines Mitarbeiters hat also
die Wurzel oben und seine Ordner darunter, an ihrer echten Stelle, und Claude Code, in einem
dieser Ordner gestartet, lädt die Regeln, Skills und Agents der Wurzel. Gemessen am 22.09.2026 an
einem Gerät: eine Sitzung zwei Ebenen unter der Wurzel, in einem Ordner der Ebene 2, den der
Mensch schreiben darf, nannte die `.claude/CLAUDE.md` der Wurzel und ihre Skills, und ein Aufruf
des Skills `arasul` ließ `arasul.mjs apps` gegen das Gerät laufen. Ein Ordner der Ebene 1 mit der
Kennung `wurzel`, wie ihn ein Kit vor 0.29.0 als Wurzel anlegte, ist heute ein Ordner der Ebene 1
und landet unter seinem Namen. Ebene 0 mit einer anderen Art ist eine Form, die das Werkzeug
nicht kennt: es benennt den Ordner und legt nichts an.

**Eine Wurzel kommt in einen leeren Ordner herunter.** Wem der Raum der Wurzel freigegeben ist,
legt `arasul.mjs` allein in einen leeren Ordner, meldet an und gleicht ab: `login`, `status` und
`sync` laufen in einem Ordner, in dem nichts liegt als diese Datei und was die Datei macht, und
danach liegt die Wurzel darin. Die Datei, die den Anfang macht, tritt beiseite, bevor der Klient
läuft, weil der Raum die Datei auch trägt, die das Haus ausgerollt hat, und der Klient zwei
Fassungen davon nicht zusammenführen kann: gemessen am 22.09.2026, er behielt beide und nannte
die zweite eine Konfliktkopie. Die des Hauses gewinnt, und trüge der Raum keine, wird die Datei
zurückgelegt. Ein Ordner, in dem anderes liegt, ist keine Wurzel und wird auch keine.

**Das Abgleichen selbst tut der Kommandozeilen-Klient des Dateidienstes**, `opencloudcmd`, aus
dem Desktop-Paket des Herstellers für macOS. Er läuft entpackt, ohne Installation. `sync` sucht
ihn in `/Applications/OpenCloud.app/Contents/MacOS/`, unter dem Heimatordner und auf dem Pfad;
`--client` nennt eine andere Stelle. Gemessen, Stand 22.09.2026: ein Ordner der Ebene 1 ist ein
Raum, der nach der **Kennung** des Ordners heißt und nicht nach seinem Anzeigenamen, und ein
Ordner der Ebene 2 hängt im Raum `Shares` und wird mit `--remote-folder <kennung>` erreicht. Die
Schalter sind `--trust`, `--non-interactive`, `--sync-hidden-files` und `--exclude`.

**Der Klient meldet sich mit demselben Passwort an wie das Gerät**, weil das Gerät es in den
Dienst spiegelt. `sync` fragt es deshalb bei jedem Lauf, am Terminal oder mit
`--password-stdin`, reicht es dem Klienten in der Umgebungsvariablen `OPENCLOUD_TOKEN` und legt
es nirgends ab. Nie als Argument: ein Argument steht in der Prozessliste jedes Menschen an diesem
Rechner.

**Nicht festgehalten.** Der Klient kennt einen Schalter für ein Zertifikat, `--trust`, und
keinen, der eines benennt. Die Verbindung zum Dateidienst ist deshalb nicht auf ein Zertifikat
festgelegt wie die Verbindung zur Oberfläche des Geräts. Das ist Sache des Klienten und nicht des
Kits, und es steht hier, damit es niemand für eine Entscheidung hält.

**Was nie in den Firmenordner geht**, steht in einer Liste und geht dem Klienten als Datei mit:
was eine Maschine macht (`.git`, `node_modules`, `dist`, `build`, `.next`), was zu diesem Rechner
gehört (`.claude/hooks/`, `settings.json`, `.DS_Store`) und was der Klient selbst schreibt. Das
Letzte ist keine Feinheit: ohne seine Journaldatei in der Liste meldet der Klient Konflikte an
sich selbst. Gemessen, Stand 22.09.2026, gegen den Klienten, mit einem Ordner, der jedes davon
trug: alles auf der Liste blieb draußen, oben im Ordner und drei Ebenen tiefer, und
`.claude/skills/` ging durch. Die Journaldatei hieß `.sync_journal.db`.

**Der Abgleich der Wurzel selbst lässt mehr draußen**: die Ordner, die das Gerät einzeln
freigibt, die in der Wurzel an ihrer Stelle liegen und für sich abgeglichen werden, `apps/`, wo
das Werkzeug schreibt, was die Apps sagen, und `sicht.md`. Sie stehen als bloße Namen in der
Liste und nicht als Pfade, weil der Klient kein Muster oben im Baum verankert: ein Muster mit
Schrägstrich wird vom Anfang des relativen Pfads an verglichen, und ein bloßer Name oben hat
keinen Schrägstrich, der passen könnte. Gemessen am 22.09.2026, ein Name mit führendem Schrägstrich in der
Liste hielt nichts draußen, und im Quelltext des Klienten nachgelesen. Der Name eines Raums bleibt also in jeder
Tiefe aus dem Abgleich der Wurzel draußen: ein Ordner tief in der Wurzel, der wie ein Raum heißt,
bleibt zu Hause, und `sync` nennt, was zu Hause blieb.

**Konflikte und Symlinks** werden aus dem Baum gezählt und nicht aus dem Bericht des Klienten,
weil beide auch zwischen zwei Abgleichen entstehen. Eine Datei, die der Klient nicht
zusammenführen konnte, trägt `_conflict-` im Namen oder, wie dieser Klient es am 22.09.2026 an
einem Gerät schrieb, `(conflicted copy <datum> <uhrzeit>)` vor der Endung; einem Symlink folgt
der Klient nicht. `sync` und `status` benennen beides, und beide werden davon rot. Für die
Wurzel wird nicht doppelt gezählt, was in einem Raum oben in ihr liegt.

**Die Sicht, `sicht.md`,** liegt oben in der Wurzel und sagt, was dieser Mensch am Gerät hat: den
Dateidienst, jeden Ordner mit Ebene, Recht und letztem Abgleich, was am Abgleich vorbeigeht, wie
das Gerät es nennt, und die zugewiesenen Apps mit ihren Routen. `sync` schreibt sie bei jedem
Lauf. Das Gerät soll sie eines Tages selbst liefern, auf der Route `sicht` unter der Route des
Firmenordners; solange es dort nicht antwortet, schreibt das Werkzeug das Blatt aus
`GET /api/firmenordner` und den Apps und sagt es. Liefert das Gerät eine, wird sein Text
genommen, wie er kommt. Das Blatt ist je Mensch: es wird nie abgeglichen, und die `.gitignore`
der Wurzel lässt es aus.

**Der Stand des letzten Abgleichs** liegt neben dem Ausweis, in `firmenordner.json`, nach Wurzel
geschlüsselt: je Ordner, wann zuletzt abgeglichen wurde, ob es durchging und wie viele Konflikte
und Symlinks dalagen. Kein Geheimnis steht darin. `status` liest ihn und zählt die Konflikte neu.

**Ein Ordner, der neu oben in der Wurzel ankommt, will eine Zeile** in der Tabelle „Wohin Neues
gehört" seiner `.claude/CLAUDE.md`, sonst meldet das eigene Prüfskript der Wurzel ihn bei jedem
Lauf. `sync` sagt, welche, und schreibt die Zeile nicht selbst: die Spalte neben dem Namen sagt,
was in den Ordner gehört, und das ist ein Satz des Hauses und nicht eines Dateidienstes.

**Eine App beschreibt sich** im Feld `agent` ihrer `app.json`: eine Liste von Routen, je mit
`method`, `path` relativ zur Schnittstelle der App, `purpose` als ein Satz, `params` (je mit
`name`, `type` aus `string`, `number`, `integer` oder `boolean`, und `required`) und `writes`.
Die App liefert das Feld selbst auf der Route `agent`, und `call` holt es bei jedem Aufruf
frisch. **Was darin nicht steht, ruft das Werkzeug nicht auf**, und eine Route mit `..` oder
einer Anfrage ist keine. `app.mjs --check` hält das Feld gegen die App: seine Form, und dass
jede Route, die es nennt, im Backend steht. Was das Schema eines Geräts für `app.json` zu dem
Feld sagt, ist Sache des Geräts: eines, das es nicht kennt, weist das Paket ab, und `--check`
sagt es.

**Was der Vorschlag erlaubt.** `apps` und die lesende Form von `call` laufen ohne Rückfrage.
Was etwas ändert, braucht `--write`, und der Vorschlag hält genau diese Form unter `ask`
zurück, Claude Code fragt den Menschen also bei jeder Änderung. `login`, `sync` und `status`
sind nicht ohne Rückfrage erlaubt. Gemessen, Stand 21.09.2026, mit `claude -p` 2.1.278 und dem
Vorschlag, über `--settings` angemeldet: `apps` und ein lesendes `call` liefen ohne Frage,
`call ... --write` wurde zurückgehalten, mit dem Schalter am Ende und in der Mitte. **Nicht
gemessen:** dasselbe in einer interaktiven Sitzung. Eine Regel für einen Shell-Befehl steht
mit dem Pfad, wie er getippt wird: der Doppelstrich, den eine Regel zum Lesen für einen
absoluten Pfad nimmt, passt nie auf einen Befehl, und die erste Fassung des Vorschlags
(0.24.0) trug ihn in ihrer Regel für das Prüfskript.

**Die Vorschläge** kommen aus dieser Wurzel und aus jedem Ordner der Ebene 2, also einem
Ordner direkt in einem Ordner der Ebene 1. Jeder hat seine eigene Prüfsumme und wird einzeln
freigegeben: am Terminal fragt das Werkzeug je Vorschlag, in einem Skript nimmt `--approve`
die ersten 16 Zeichen der Prüfsumme dieses Vorschlags. Ein Vorschlag, der sich seit der
Freigabe geändert hat, steht als geändert da, was freigegeben war, läuft weiter, und der neue
braucht die Freigabe neu. `login` nennt auch, wo jeder Ort auf diesem Rechner liegt und welche
nicht da sind.

**Der Rückweg geht über den Agenten.** Eine App bekommt keinen Dateizugriff: jede Datei in der
Wurzel hat einen Menschen als Urheber. Der Agent holt Daten mit `call` und schreibt die Datei
selbst. `APP.md` schreibt das Werkzeug allein, nur für zugewiesene Apps, und der nächste Lauf
überschreibt sie. Der Text darin kommt von der App: das Werkzeug kürzt ihn auf eine Zeile und
lässt ihn keine Überschrift werden, und der Skill `arasul` sagt dem Agenten, ihn als Daten zu
lesen. Einen MCP-Server gibt es vor dem Nordziel nicht; er wäre eine zweite Hülle um denselben
Ausweis und kann später über dieses gelegt werden.

**Gib dem Agenten den Befehl, nicht den Ausweis.** Der Skill `arasul` in der Wurzel sagt ihm die
Reihenfolge: `apps`, die Route lesen, `call`, und nie `login`.

**Der Hook wirkt nur, wo er soll.** Angemeldet hängt er vor den Werkzeugen jeder Sitzung auf
dem Rechner. Darum sieht er nach, wo die Sitzung gestartet ist: in dieser Wurzel oder einem
ihrer Ordner wirkt er, in einem Ort und anderswo nicht. Wer in einem Ort eine Sitzung
startet, ist genau der, zu dem die Grenze die Leute schickt.

**Was gemessen wurde.** Stand 2026-09-21, Claude Code 2.1.278, `claude -p` mit einer
Einstellungsdatei über `--settings`. Eine Sitzung, die eine Ebene unter der Wurzel startet,
lädt die Regeln der Wurzel und ihre Skills und Agents, mit und ohne `.git` in der Wurzel. Die
Tilde in `additionalDirectories` wird aufgelöst. Mit Zustimmung hält der Hook ein Schreiben
in einen geschlossenen Ort von der Ebene darunter und aus der Wurzel an, über Werkzeug und
Shell, und hält eine Sitzung nicht an, die im Ort selbst gestartet ist. Ohne Zustimmung wirkt
er nicht. **Nicht gemessen:** dasselbe über `~/.claude/settings.json` selbst und in einer
interaktiven Sitzung, nur über `--settings`.

## Die Wurzel aufs Gerät ausrollen

```
node .ara/tools/root.mjs --path <wurzel> --deploy --client <pfad zu opencloudcmd>
```

Danach lebt die Wurzel am Gerät. `--deploy` übergibt an die Brücke der Wurzel, `arasul.mjs
deploy`, und ersetzt die Brücke vorher, wenn sie die eines älteren Kits ist und kein `deploy`
kennt: sie ist eine Datei des Kits, nichts vom Haus steht darin. Dann, in dieser Reihenfolge:

1. **Das Prüfskript läuft, und ein Befund hält alles an.** Was aufs Gerät geht, geht an jeden,
   der den Raum hat, also geht eine Wurzel mit Befund nicht.
2. **Die Wurzel des Geräts muss eine sein, die dieser Mensch schreibt.** Das Gerät nennt sie in
   seiner Ordnerliste, Ebene 0 mit der Art `wurzel`, und das Werkzeug nimmt genau die, unter der
   Kennung, die das Gerät nennt. Nennt das Gerät keine, meldet sich das Werkzeug mit dem Passwort
   an, weil der Ausweis keine Verwaltung öffnet, sieht die Liste aller Ordner des Geräts an und
   legt die Wurzel nur an, wenn das Gerät keine führt: Kennung `firma`, der Name des Hauses, Art
   `wurzel`, Ebene 0, die Form, die auch die Oberfläche des Geräts vorschlägt. Dann beendet es
   diese Sitzung. Führt das Gerät eine Wurzel und nennt sie diesem Menschen nicht, wird das gesagt
   und nichts angelegt: eine zweite Wurzel wird nie angelegt. Die Wurzel legt nur ein
   Administrator an: einem Mitarbeiter ohne Wurzel wird gesagt, dass er einen bitten soll. Mit
   `lesen` allein wird nichts ausgerollt: auf der Wurzel ist Schreiben das Recht der
   Administratoren, nach Rolle, und ein Recht je Person gibt es darauf nicht.
3. **Der Baum geht über den Klienten hinauf**, mit der allgemeinen Liste und der eigenen Liste
   der Wurzel, was zu Hause bleibt: `.git`, `node_modules`, `.claude/hooks/`, `settings.json`,
   `.DS_Store`, die Journaldatei des Klienten, `apps/`, `sicht.md` und die Räume, die das Gerät
   einzeln freigibt.
4. **Der Raum kommt in einen Wegwerfordner wieder herunter**, und was dort liegt, wird mit dem
   verglichen, was gehen sollte: `deploy` sagt, wie viele Dateien gingen, wie viele im Raum
   liegen und welche nicht ankamen. Der Ordner wird danach entfernt.

Das Passwort wird am Terminal gefragt oder kommt mit `--password-stdin`; den Befehl führt der
Mensch also selbst aus, wie `sync`. `deploy` steht nicht in der Erlaubnisliste des Vorschlags.

**Sagt der Klient `Fatal: Authentication`**, hat der Dateidienst für diesen Menschen kein
Passwort, und `deploy` sagt das in einem Satz, `sync` ebenso: das Gerät spiegelt ein Passwort
beim Setzen in den Dienst, ein Konto, dessen Passwort vor dem Einschalten des Firmenordners
gesetzt wurde, kommt also erst nach einem Passwortwechsel hinein. Gemessen am 22.09.2026 mit
einem Passwort, das der Dienst nicht kannte.

**Wer die Wurzel bekommt:** jeder Aktive am Gerät, mit `lesen`, ohne dass jemand etwas freigibt.
Sein nächster `sync` legt die Wurzel oben in seinen Baum. Administratoren haben `schreiben` nach
Rolle, und ihr `sync` trägt ihre Änderungen hinauf.

**Gemessen am 22.09.2026 an einem Gerät, das seine Wurzel `firma` führt**, aus einer Testwurzel
mit zwei Wegwerf-Konten: `--deploy` als Administrator nahm die Wurzel, die das Gerät nannte,
legte nichts an, und das Gerüst lag im Raum `firma`, alle 16 Dateien, mit dem Herunterladen
geprüft; danach führte das Gerät weiter genau eine Wurzel. Das zweite Konto, ein Mitarbeiter mit
`lesen` auf der Wurzel nach Rolle und `schreiben` auf nur einem Ordner der Ebene 2, legte
`arasul.mjs` in einen leeren Ordner, meldete an und glich ab: die Wurzel lag oben, der Ordner der
Ebene 2 an seiner Stelle, die Kette darüber lokal angelegt, und `sicht.md` kam vom Gerät. Claude
Code, zwei Ebenen tiefer gestartet, lud die `.claude/CLAUDE.md` der Wurzel und ihre Skills, und
der Skill `arasul` ließ `arasul.mjs apps` gegen das Gerät laufen. Das Anlegen einer Wurzel wurde
nur an der Attrappe des Kits gemessen: die Wurzel des Geräts wurde für die Messung nicht
weggeworfen.

## Die Vorzeigefassung

```
node .ara/tools/root.mjs --path <ordner> --example
```

legt die Wurzel einer erfundenen Firma aus: das Gerüst mit zwei Ordnern der Ebene 1, und die
Methode mit gefüllten Blättern. Ein Nordziel mit drei Meilensteinen, Ziele je Ort, Karten in
jeder Spalte, ein Experiment mit Kriterium, ein Kunde, eine Vorlage, vier Orte, von denen
einer beschrieben werden darf. Die Firma gibt es nicht und ihre Orte auch nicht. Ihre Daten
zählen vom Tag des Anlegens an, ihr eigenes Prüfskript findet darin also nichts, heute und
in einem Jahr. Nimm sie, wenn jemand wissen will, wie eine solche Wurzel aussieht, bevor er
die eigene anlegt.

## Was das Prüfskript einer Wurzel prüft

Jede Prüfung steht für etwas, das in einer solchen Wurzel schiefging. Die Regel über allem:
keine Prüfung, die auf einem gepflegten Stand einen Fehlalarm liefert, ein Alarm, der
regelmäßig falsch liegt, hört auf zu wirken. Die Prüfungen 2 bis 4 und 6 bis 9 finden nichts,
wo die Methode nicht angelegt ist.

| Nr | Was |
| --- | --- |
| 1 | Pfade in Backticks existieren |
| 2 | kein Blatt unter `company/` über 300 Zeilen |
| 3 | jedes Blatt unter `company/` trägt `Stand:`, nicht älter als 60 Tage |
| 4 | die Register halten ihre Form: Wiedervorlagen Zeile für Zeile, höchstens 50 offen, höchstens 100 Entscheidungen |
| 5 | keine Geheimnisse im Klartext, nur über benannte Felder |
| 6 | jedes Ziel hat einen Meilenstein, den `company/goal.md` kennt, und eine Frist |
| 7 | eine Frist innerhalb von 14 Tagen steht in den Wiedervorlagen |
| 8 | der Kartenstapel: Pflichtfelder ab ready, Rang eindeutig je Ort, eine laufende Karte je Ort, ein Ergebnis in done, ein bekannter Ort |
| 9 | Experimente tragen eine `experiment.md`, keine dritte Unterebene |
| 10 | kein Ordner oben ohne Zeile in der Tabelle "Wohin Neues gehört" |
| 11 | Orte: vollständig, keine Kopie in der Wurzel (auch ein Ordner mit dem Namen eines Ortes ohne lokalen Pfad), die Regeln des Vorschlags im Gleichschritt mit der Liste |
| 12 | kein leeres Blatt, kein toter Link |
| 13 | die Fälle der Grenze halten |
| 14 | keine `settings.json` und keine `settings.local.json` im Baum |
| 15 | Vertrauliches nach Muster in der Wurzel oder in Ebene 1: Dateien der Art `.env`, Schlüssel und Zugangsdaten nach Namen, private Schlüssel und Token nach ihrer Kennung. Eine `.env.example` ist keins |
| 16 | Verweise gehen nach oben: ein Ordner der Ebene 1 verweist nicht auf einen Nachbarn, eine Regel der Wurzel nennt nichts in einem Ordner des Hauses. Die Ordner der Methode verweisen absichtlich aufeinander |
| 17 | kein `.git`, das `places.json` nicht nennt, und kein Quelltextbaum (eine Projektdatei wie `package.json`, oder `src/` mit Code, oder `node_modules/`) im Baum |

**Skripte sind überall erlaubt und kein Befund.** Ein einzelnes Skript in jedem Ordner, in
jeder Tiefe, in jeder Sprache: Prüfung 17 will ein Projekt, kein Skript.

**Was die Grenze nicht kann**, sagt ihr Kopf selbst: ein Hook sieht nicht in einen Prozess.
Sie wirkt gegen Schreibzugriffe von Werkzeug und Shell, nicht gegen ein Skript, das
schreibt. Verkauf sie nicht als dichter, als sie ist.
