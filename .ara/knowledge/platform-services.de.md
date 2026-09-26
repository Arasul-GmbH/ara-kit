# Verfahren: die Dienste der Plattform, und wie eine App sie benutzt

> **Wann brauchst du das?** Wenn eine App etwas von Arasul will: eine Anmeldung, eine
> Entscheidung durch einen Menschen, ein Sprachmodell, ein Dokument, einen Flow. Was ohne Arasul
> bleibt: `.ara/knowledge/deploy.de.md`, „Auf ein Gerät ohne Arasul".

## Die Regel zuerst

Dieses Blatt sagt, **wofür** ein Dienst da ist; Namen, Wege und Grenzen stehen im Kontrakt des
Geräts (`--contract`). Die Wege hier sind Zeiger, `node .ara/tools/check-docs.mjs --device <gerät>`
hält sie gegen das Gerät. Einen Weg, den der Kontrakt nicht nennt, ruft das Kit nicht.

| Art des Weges | Wer sich ausweist | Im Kontrakt |
|---|---|---|
| Die äußere Schnittstelle | ein Schlüssel in der Kopfzeile, keine Sitzung | ja, mit dem Bereich, den jeder verlangt |
| Ein Weg der Oberfläche | die Sitzung eines angemeldeten Menschen | nein |

Das Kit hat einen Schlüssel und keine Sitzung: was eine braucht, macht ein Mensch im Browser, oder
das Kit über die Sitzung eines Administrators (`--admin-login`, `app.mjs --share`). Die Verwaltung
steht in den Anleitungen am Gerät, `node .ara/tools/mirror.mjs --docs --device <gerät>`. Der erste
Mitarbeiter: `.ara/knowledge/device.de.md`, „Der erste Mitarbeiter und die erste Freigabe".

## Was eine App bekommt: `backend/arasul.json`

Namen im Container, Kopfzeilen, die Wege für Flows, Auslesen und Fragen an ein Modell, die Regeln
der Freigabe, wie ein Modellaufruf seinen Menschen nennt: das sagt der Kontrakt dieses Geräts, und
beim Einspielen schreibt `app.mjs` es als `backend/arasul.json` ins Paket; `--check` gibt es aus.
**Eine App schreibt diese Werte nie in ihren Quelltext.** **Modellarbeit
einer App läuft über einen Flow, das Auslesen eines Dokuments oder `geraet.fragen`.** Das
KI-Protokoll erfasst die Wege, die `protokoll.wege` nennt, mit dem Menschen, den die App mitgibt;
der Modellschritt eines Flows steht am Lauf, mit seinem Einreicher.

## Anmeldung: eine App bekommt keine eigene

Wer bei Arasul angemeldet ist und die App freigegeben hat, ist in der App angemeldet, sonst
niemand. Die Plattform setzt das **vor** dem Container durch und setzt zwei Kopfzeilen, Benutzername
und Rolle, die sich nicht fälschen lassen; ihre Namen stehen im Kontrakt unter `koepfe`, die Vorlage
liest sie mit `geraet.angemeldet(anfrage.headers)`. Die Oberfläche fragt `GET /apps/<id>/api/me`;
welche Namen unter `/apps/<id>/` der Plattform gehören, sagt der Kontrakt unter `apps.vergeben`.

**Nicht daraus gebaut:** ein Anmeldeformular, ein Namensfeld, Konten mit Passwort, eine zweite
Anmeldung, die niemanden aufhält. **Daraus gebaut:** eine Zuordnung von Konten zu Mandanten,
Abteilungen, Akten nach dem Benutzernamen, die entscheidet, was jemand **innerhalb** sieht:
`.ara/knowledge/app-professional.de.md`, „Mandanten: wer was sieht".

## Freigaben: ein Lauf hält an, ein Mensch entscheidet

Ein Flow hält mit dem Werkzeug `freigabe_anfordern` an, mit Titel, Kontext und Frist, und der Lauf
wartet: **ohne Entscheidung geht nichts weiter**. Genehmigt, läuft der Lauf ab dem Schritt weiter;
abgelehnt, endet er mit dem Grund; keine Entscheidung bis zur Frist, endet er ebenso.

**Entschieden wird über die Sitzung eines Menschen**, in der Oberfläche des Geräts: kein Kontrakt
nennt diese Wege, und das Kit ruft sie nicht. **Die App liest den Stand mit ihrem eigenen Schlüssel
und entscheidet nie**: `GET /api/v1/external/freigaben`, mit der Laufnummer.

**Der Kreis.** Ein Flow nennt keine Person und keine Rolle. Ohne Regel entscheidet **jeder, für den
die App freigegeben ist**, und sieht die Karte mit ihrem Text, auch für einen Mandanten, der nicht
seiner ist. Der Kontrakt nennt unter `freigaben`, wie eine App den Kreis beim Start enger zieht, nie
weiter: **`einreicher`**, der Benutzername dessen, der den Lauf auslöst;
**`freigabe.ohne_einreicher: true`**, vier Augen; **`freigabe.entscheider`**, `{"rolle": "admin"}`
oder `{"konten": [...]}`. Außerhalb des Kreises sieht niemand die Anfrage, und Entscheiden bekommt
eine 403; bleibt niemand, lehnt das Gerät den Start ab. `--contract` gibt die Regeln aus,
`arasul.json` sagt unter `freigaben`, ob ein Gerät sie kennt. Für Mandanten:
`.ara/knowledge/app-professional.de.md`, „Freigaben in einer Fach-App".

**Verweise in die Anfrage, keine Inhalte.** Titel und Kontext stehen auf der Karte jedes
Entscheiders: „Beleg 17, eingereicht von anna", der Entscheider öffnet ihn in der App. Beträge,
Namen von Mandanten, Texte bleiben in der App und folgen ihrer Sichtbarkeit. **Versprich nicht
ungeprüft**, dass ein Lauf tagelang warten kann; frag das Gerät.

## Flows: eine Datei je Flow, das Modell steht im Kopf

Ein Flow ist Markdown: der Kopf sagt, was er braucht und darf, der Rumpf ist die Anweisung. **Im
Paket ist er eine Lieferung**, je App und Stand angemeldet. Schema des Kopfes und Regeln: der
Kontrakt unter `flow_frontmatter`. **Das Modell im Kopf ist ein Vorschlag**, den der Administrator
am Gerät überschreiben darf: darum kein Modellname in der README.

```
GET  /api/v1/external/flows
POST /api/v1/external/flows/<name>/run
GET  /api/v1/external/flows/runs/<id>
```

Der Schlüssel einer App sieht nur ihre eigenen Flows in ihrem Stand. Wiederkehrende Starts kommen
über denselben Weg aus einem Zeitplan auf einem Rechner, der ohnehin läuft. **Ein Flow mit
Freigabe-Schritt wird gestartet, ohne zu warten**: die Laufnummer kommt sofort zurück, den Rest
fragst du nach.

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
Bereich wird abgewiesen. Ein Dokument auslesen: `.ara/knowledge/app-professional.de.md`, „Dokumente
und Bilder auslesen". Der Rest ist für das Kit und für Werkzeuge außerhalb einer App:
`.ara/knowledge/extensions.de.md`, „Der Weg für fremde Werkzeuge". Der Schlüssel des Kits kommt aus
`--deploy-key`, den einer App legt das Gerät in den Container.

**Der Chat ist zustandslos**: jeder Aufruf ist ein Auftrag mit genau dem Verlauf, der mitgeschickt
wird. Eine App, die auf ein Gedächtnis am Gerät baut, baut auf nichts.
