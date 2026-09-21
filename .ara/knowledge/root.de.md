# Verfahren: die Wurzel eines ganzen Hauses

> **Wann brauchst du das?** Bei `/root`: einen Wurzelordner für eine ganze Organisation
> anlegen, einen Ort nachtragen, sie prüfen, die Vorzeigefassung zeigen.

## Was eine Wurzel ist, und was nicht

Ein Haus, das mit Agenten über mehrere Projekte arbeitet, hat sein Wissen in Inseln: ein
Repository mit Regeln und Skills, ein geteilter Ordner ohne, ein zweites Repository mit
eigenen. Keine Insel kennt das Ziel des Hauses, und ein Agent, der in einer startet, weiß
von den anderen nichts. Eine Wurzel ist der eine Ordner darüber. Sie sagt, **was stimmt, was
ansteht und wo etwas liegt**, und sie nennt die Orte, an denen gearbeitet wird.

**Eine Wurzel liegt außerhalb des Kits.** Das Kit ist ein Werkzeug und höchstens einer ihrer
Orte, nicht ihr Zuhause. Das Werkzeug weist einen Pfad im Kit ab. Nach dem Anlegen braucht
die Wurzel das Kit nicht mehr: ihr Prüfskript, ihre Grenze und ihr Kartenwerkzeug liegen in
ihr und laufen mit Node allein.

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
│   ├── settings.json          Rechte je Ordner, die Orte, die Grenze als Hook
│   ├── places.json            Die Liste der eingebetteten Orte
│   ├── root.json              Name, Sprache, Tag des Anlegens, Version des Kits
│   ├── hooks/boundary.mjs     Aus der Wurzel wird in keinen Ort geschrieben
│   └── scripts/
│       ├── check.mjs          13 Prüfungen, Rückgabe 0 heißt kein Befund
│       ├── boundary-test.mjs  Die Fälle der Grenze
│       └── cards.mjs          Der Kartenstapel: list, new, move
├── company/                   core, goal, decisions, follow-ups, assumptions, risks
├── roadmap/                   Ein Blatt je Ort, dazu root.md für die Wurzel selbst
│   └── backlog/               new/ ready/ running/ done/, der Ordner ist der Status
├── experiments/
├── customers/
├── templates/
└── archive/
```

Ordner, Felder und Spalten heißen in beiden Sprachen englisch, wie überall im Kit. Der
Inhalt der Blätter folgt `--language`, sonst dem Profil.

## Das Interview, in einem Bündel

Frag über das Interview-Werkzeug, alles auf einmal, und arbeite dann durch:

1. **Wo** die Wurzel liegen soll. Ein Pfad neben den Projekten, nicht in einem abgeglichenen
   Ordner, wenn sie eine Versionsverwaltung tragen soll: Dateiabgleich und ein aktives `.git`
   vertragen sich nicht.
2. **Wie das Haus heißt.** Das geht in die Überschrift der Regeln und der README.
3. **Welche Sprache.** Vorgabe ist das Profil.
4. **Welche Orte**, und je Ort: ein kurzer Name in Kleinbuchstaben, `github` oder `folder`,
   wo er lebt (Adresse oder Pfad), wo er auf diesem Rechner liegt, falls er das tut, wofür er
   da ist, und ob die Wurzel in ihn schreiben darf. **Vorgabe ist nein.**

**Du siehst nach, bevor du fragst.** Ob ein Pfad existiert, ob er ein Repository ist, wie
sein Remote heißt: das sagen `ls` und `git remote -v`, nicht der Mensch. Du liest nur. **In
den Orten änderst du nichts**, nicht beim Anlegen und nicht danach: keine Datei, keinen
Link, keine Konfiguration. Das gilt besonders für ein Haus, das nicht das eigene ist.

**Warum das Schreiben zunächst zu ist.** Eine Sitzung in der Wurzel lädt die Regeln des
Ortes nicht. Ein Repository hat seine eigene `CLAUDE.md`, seine Skills und seine Hooks, in
einem geteilten Ordner arbeiten Menschen. Wer dort etwas ändern will, startet dort eine
Sitzung. Die Wurzel sagt, *was* der Ort bis wann können muss, der Ort entscheidet, *wie*.
Will das Haus es für einen Ort anders, steht `write: yes` für alle lesbar in der Liste, und
eine Zeile in `company/decisions.md` sagt, warum.

## Anlegen

```
node .ara/tools/root.mjs --path <ordner> --name "<haus>" --places <datei.json>
```

Bei einem Ort reicht `--place <name> --kind github|folder --where <adresse> [--local <pfad>]
[--write yes] --purpose "<wofür>"`. Für mehrere schreibst du die Liste in eine Datei
außerhalb des Kits, in den temporären Ordner des Systems, und übergibst sie mit `--places`:

```
[
  { "name": "api", "kind": "github", "where": "https://github.com/acme/api",
    "local": "~/Code/acme/api", "purpose": "das Produkt" },
  { "name": "projects", "kind": "folder", "where": "https://acme.sharepoint.com/sites/projects",
    "local": "~/Library/CloudStorage/OneDrive-Acme/Projects", "purpose": "ein Ordner je Projekt" }
]
```

Das Ziel muss leer sein oder fehlen, das Werkzeug überschreibt nichts. Es legt den Baum aus,
schreibt die Rechte und die Liste, legt je Ort ein Blatt unter `roadmap/` an, lässt das
Prüfskript der frischen Wurzel laufen, legt ein Repository mit einem ersten Commit an
(`--no-git` lässt das weg) und sagt, wie lange es gedauert hat. **Die Prüfung endet ohne
Befund, oder du sagst, was sie gefunden hat.** Ein Befund in einer frischen Wurzel ist ein
Fehler des Gerüsts, nicht des Menschen: melde ihn mit `gh issue create` an das Kit, wenn der
Mensch einverstanden ist.

## Nach dem Anlegen

Sag in drei Zeilen, was wo liegt, und dann die nächsten Schritte, die das Werkzeug nennt:
`company/core.md` und `company/goal.md` füllen, je Ort ein Ziel, die ersten Vorhaben auf
Karten, und von da an **den Agenten in der Wurzel starten**, nicht im Kit und nicht in einem
Ort. Biete an, die beiden Blätter gleich gemeinsam zu füllen, in einem zweiten Bündel von
Fragen: was das Haus tut, wo es steht, der Engpass, was ausdrücklich nicht getan wird, das
Nordziel als ein prüfbarer Satz, die Meilensteine mit Fristen. Du schreibst in die Wurzel
nur, was der Mensch gesagt hat. **Keine Zahl aus dem Gedächtnis, kein erfundenes Ziel.**

**Der erste Start in der Wurzel ist interaktiv.** Der Agent fragt einmal, ob er dem Ordner
vertraut, und bis zu diesem Ja lässt er die Rechte außer Acht, die die Wurzel erlaubt. Was
die Wurzel verbietet, gilt von der ersten Sekunde an, und die Grenze auch.

```
node .ara/tools/root.mjs --path <wurzel> --place <name> --kind ... --where ... --purpose ...
node .ara/tools/root.mjs --path <wurzel> --show
node .ara/tools/root.mjs --path <wurzel> --check
```

`--place` mit einer bestehenden Wurzel trägt einen Ort nach: eine Zeile in der Liste, die
Rechte, sein Blatt. Rechte, die das Haus von Hand eingetragen hat, bleiben. `--show` nennt
die Wurzel und ihre Orte und sagt, welche davon auf diesem Rechner liegen. `--check` lässt
das Prüfskript der Wurzel laufen.

## Die Vorzeigefassung

```
node .ara/tools/root.mjs --path <ordner> --example
```

legt die Wurzel einer erfundenen Firma mit gefüllten Blättern aus: ein Nordziel mit drei
Meilensteinen, Ziele je Ort, Karten in jeder Spalte, ein Experiment mit Kriterium, ein Kunde,
eine Vorlage, vier Orte, von denen einer beschrieben werden darf. Die Firma gibt es nicht und
ihre Orte auch nicht. Ihre Daten zählen vom Tag des Anlegens an, ihr eigenes Prüfskript
findet darin also nichts, heute und in einem Jahr. Nimm sie, wenn jemand wissen will, wie
eine solche Wurzel aussieht, bevor er die eigene anlegt.

## Was das Prüfskript einer Wurzel prüft

Jede Prüfung steht für etwas, das in einer solchen Wurzel schiefging. Die Regel über allem:
keine Prüfung, die auf einem gepflegten Stand einen Fehlalarm liefert, ein Alarm, der
regelmäßig falsch liegt, hört auf zu wirken.

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
| 10 | kein Ordner oben ohne Zeile in den Regeln und ohne Rechte |
| 11 | Orte: vollständig, keine Kopie in der Wurzel, Rechte im Gleichschritt mit der Liste, die Grenze hängt vor den Werkzeugen |
| 12 | kein leeres Blatt, kein toter Link |
| 13 | die Fälle der Grenze halten |

**Was die Grenze nicht kann**, sagt ihr Kopf selbst: ein Hook sieht nicht in einen Prozess.
Sie wirkt gegen Schreibzugriffe von Werkzeug und Shell, nicht gegen ein Skript, das
schreibt. Verkauf sie nicht als dichter, als sie ist.
