# Verfahren: die Dienste der Plattform, und wie eine App sie benutzt

> **Wann brauchst du das?** Wenn eine App etwas von Arasul will: eine Anmeldung, eine
> Entscheidung durch einen Menschen, ein Sprachmodell, ein Dokument, einen Flow. Was ohne Arasul
> bleibt: `.ara/knowledge/deploy.de.md`, „Auf ein Gerät ohne Arasul".

## Die Regel zuerst

Dieses Blatt sagt, **wofür** ein Dienst da ist; Namen, Wege und Grenzen an einem Gerät sagt sein
Kontrakt (`--contract`). Die Wege hier sind Zeiger, genannt, damit
`node .ara/tools/check-docs.mjs --device <gerät>` sie gegen Kontrakt und Gerät halten kann, bevor
ein Partner einen verspricht. Einen Weg, den der Kontrakt nicht nennt, ruft das Kit nicht, meist ist
das Gerät älter als das Kit (`.ara/knowledge/deploy.de.md`, Kontraktfassung). Ein Weg dieses
Blattes, der an einem aktuellen Gerät fehlt, ist eine Rückmeldung an das Kit.

| Art des Weges | Wer sich ausweist | Im Kontrakt |
|---|---|---|
| Die äußere Schnittstelle | ein Schlüssel in der Kopfzeile, keine Sitzung | ja, mit dem Bereich, den jeder verlangt |
| Ein Weg der Oberfläche | die Sitzung eines angemeldeten Menschen | nein |

Das Kit hat einen Schlüssel und keine Sitzung: was eine braucht, macht ein Mensch im Browser, oder
das Kit über eine Sitzung aus dem Startpasswort. Die Verwaltung steht in Admin-Handbuch und
API-Referenz am Gerät, `node .ara/tools/mirror.mjs --docs --device <gerät>`, eines davon mit
`--read <pfad>`. Der erste Mitarbeiter und die erste Freigabe: `.ara/knowledge/device.de.md`, „Der
erste Mitarbeiter und die erste Freigabe".

## Was eine App bekommt: `backend/arasul.json`

Die Namen der Adresse der Schnittstelle, des Schlüssels und der Adresse der Datenbank im Container,
die Kopfzeile des Schlüssels, die zwei Kopfzeilen der Anmeldung, die Wege für einen Flow und für das
Auslesen eines Dokuments, ob ein Lauf Einreicher und Freigaberegel annimmt: das sagt der Kontrakt
dieses Geräts, und beim Einspielen schreibt `app.mjs` es als `backend/arasul.json` ins Paket.
`--check` gibt es aus und nennt, was dieses Gerät nicht verspricht.

**Eine App schreibt diese Werte nie in ihren Quelltext.** Eine, die es tut, findet auf einem Gerät,
das sie anders nennt, nichts, hält das für „hier läuft kein Arasul" und sammelt Vorgänge, über die
niemand entscheidet: der Vorlage ist das bis zum 29.08.2026 passiert, ihr Freigabe-Schritt wurde
übersprungen, nicht abgelehnt. Der Selbsttest hält Vorlage und Muster daran. **Modellarbeit einer
App läuft über einen Flow oder über das Auslesen eines Dokuments**: `arasul.json` trägt keinen
anderen Weg zu einem Modell.

## Anmeldung: eine App bekommt keine eigene

Wer bei Arasul angemeldet ist und die App freigegeben hat, ist in der App angemeldet, sonst
niemand, Administratoren eingeschlossen. Die Plattform setzt das **vor** dem Container durch und
setzt zwei Kopfzeilen, Benutzername und Rolle, nachdem sie gelöscht hat, was von außen unter diesen
Namen kam: fälschen lassen sie sich nicht. **Ihre Namen und die Rollen stehen im Kontrakt** unter
`koepfe`, das Kit legt sie in `arasul.json`, die Vorlage liest sie mit
`geraet.angemeldet(anfrage.headers)`. Für die Oberfläche hält die Plattform `GET /apps/<id>/api/me`
frei: Kennung, Stand, Benutzer, Rolle, und der Teststand hat seinen eigenen darunter. Welche Namen
unter `/apps/<id>/` der Plattform gehören, sagt der Kontrakt unter `apps.vergeben`.

**Nicht daraus gebaut:** ein Anmeldeformular, ein Namensfeld, Konten mit Passwort. Das wäre eine
zweite Anmeldung, die niemanden aufhält. **Daraus gebaut:** eine Zuordnung von Konten zu Mandanten,
Abteilungen, Akten nach dem Benutzernamen, die entscheidet, was jemand **innerhalb** sieht:
`.ara/knowledge/app-professional.de.md`, „Mandanten: wer was sieht".

## Freigaben: ein Lauf hält an, ein Mensch entscheidet

Ein Flow hält mit dem Werkzeug `freigabe_anfordern` an, mit Titel, Kontext und Frist, und der Lauf
wartet: **ohne Entscheidung geht nichts weiter**. Eine Rückfrage im Gespräch dagegen geht an den,
der gerade zusieht, und läuft mit einer Annahme weiter. Genehmigt, läuft der Lauf ab dem Schritt
weiter; abgelehnt, endet er mit dem Grund; keine Entscheidung bis zur Frist, endet er ebenso.

**Entschieden wird über die Sitzung eines Menschen**, darum stehen diese Wege in keinem Kontrakt,
und das Kit ruft sie nicht:

```
GET  /api/freigabe-anfragen
POST /api/freigabe-anfragen/<id>/bestaetigen
POST /api/freigabe-anfragen/<id>/ablehnen
```

**Die App liest den Stand mit ihrem eigenen Schlüssel und entscheidet nie**:
`GET /api/v1/external/freigaben`, mit der Laufnummer.

**Der Kreis.** Ein Flow nennt keine Person und keine Rolle. Ohne Regel entscheidet **jeder, für den
die App freigegeben ist**, und sieht die Karte mit ihrem Text, auch für einen Mandanten, der nicht
seiner ist. Seit dem 25.09.2026 nennt der Kontrakt unter `freigaben`, wie eine App den Kreis beim
Start enger zieht, nie weiter: **`einreicher`**, der Benutzername dessen, der den Lauf auslöst;
**`freigabe.ohne_einreicher: true`**, vier Augen; **`freigabe.entscheider`**, `{"rolle": "admin"}`
oder `{"konten": [...]}`. Außerhalb des Kreises sieht niemand die Anfrage, und Entscheiden bekommt
eine 403; bleibt niemand, lehnt das Gerät den Start ab. `--contract` gibt die Regeln aus,
`arasul.json` sagt unter `freigaben`, ob ein Gerät sie kennt. Für Mandanten:
`.ara/knowledge/app-professional.de.md`, „Freigaben in einer Fach-App".

**Verweise in die Anfrage, keine Inhalte.** Titel und Kontext stehen auf der Karte jedes
Entscheiders und am Lauf: „Beleg 17, eingereicht von anna", der Entscheider öffnet ihn in der App.
Beträge, Namen von Mandanten, Texte bleiben in der App und folgen ihrer Sichtbarkeit. **Versprich
nicht ungeprüft**, dass ein Lauf tagelang warten kann; frag vorher das Gerät.

## Flows: eine Datei je Flow, das Modell steht im Kopf

Ein Flow ist eine Aufgabe, die ein Sprachmodell mit Werkzeugen ausführt: Markdown, der Kopf sagt,
was er braucht und darf, der Rumpf ist die Anweisung. **Im Paket ist er eine Lieferung**, je App und
Stand angemeldet, darum dürfen zwei Apps denselben Namen tragen. Schema des Kopfes und Regeln: der
Kontrakt unter `flow_frontmatter`. **Das Modell im Kopf ist ein Vorschlag**, den der Administrator
am Gerät je Flow überschreiben darf, über jedes Update hinweg: darum kein Modellname in der README,
und einen Unterschied im Verhalten sucht man nicht zuerst im Paket.

```
GET  /api/v1/external/flows
POST /api/v1/external/flows/<name>/run
GET  /api/v1/external/flows/runs/<id>
```

Der Schlüssel einer App sieht nur ihre eigenen Flows in ihrem Stand. Wiederkehrende Starts kommen
über denselben Weg aus einem Zeitplan auf einem Rechner, der ohnehin läuft. **Ein Flow mit
Freigabe-Schritt wird gestartet, ohne zu warten**: ein wartender Aufruf läuft in seine Zeitgrenze;
die Laufnummer kommt sofort zurück, den Rest fragst du nach.

## Die KI-Schnittstelle: mit Schlüssel, ohne Sitzung

```
POST /api/v1/external/llm/chat
GET  /api/v1/external/llm/job/<id>
GET  /api/v1/external/llm/queue
GET  /api/v1/external/models
POST /api/v1/external/document/extract
POST /api/v1/external/document/extract-structured
POST /api/v1/external/document/analyze
```

**Welche davon ein Gerät trägt, mit welchem Bereich, sagt sein Kontrakt**; ein Schlüssel ohne den
Bereich wird abgewiesen, eine Entscheidung des Administrators. Die beiden Wege zum Auslesen eines
Dokuments kommen in `arasul.json` unter `wege`, was sie tun: `.ara/knowledge/app-professional.de.md`,
„Dokumente und Bilder auslesen". Der Rest ist für das Kit und für Werkzeuge außerhalb einer App, die
auch die eigenen Aufrufe der Bibliotheken sprechen dürfen: `.ara/knowledge/extensions.de.md`, „Der
Weg für fremde Werkzeuge". Kopfzeile und Vorsatz des Schlüssels stehen unter `schluessel`, die Namen
im Container unter `umgebung`. Der Schlüssel des Kits kommt aus `--deploy-key`, den einer App legt
das Gerät in den Container.

**Der Chat ist zustandslos**: jeder Aufruf ist ein Auftrag mit genau dem Verlauf, der mitgeschickt
wird. Eine App, die auf ein Gedächtnis am Gerät baut, baut auf nichts.
