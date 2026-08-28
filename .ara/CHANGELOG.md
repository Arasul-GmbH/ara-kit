# Was sich am Ara-Kit geändert hat

Der Stand dieses Kits steht in `.ara/VERSION`. Diese Datei sagt, was zwischen
zwei Ständen dazugekommen ist und bis zu welcher Kontraktfassung ein Stand mit
einem Gerät zusammenarbeitet. `/init` liest beides vor, bevor es einspielt, und
`node .ara/tools/update.mjs --check` sagt, von welchem Stand auf welchen es
ginge.

**Die Zeile `Kontrakt: bis <zahl>` ist keine Aussage über ein Gerät.** Sie sagt,
welche Fassungen dieses Kit versteht. Welche Fassung ein Gerät führt, sagt sein
Kontrakt, und nur der: `node .ara/tools/app.mjs --device <gerät> --contract`.

Aufbau eines Eintrags: `## <nummer> (<datum>)`, darunter die Kontraktzeile und
die Punkte als Aufzählung. Das Werkzeug liest genau diese Form, siehe
`.ara/tools/lib/version.mjs`.

## 0.9.1 (2026-08-28)

Kontrakt: bis 3

- Das Startpasswort des Administrators kommt aus dem Kit wieder heraus, ohne sichtbar zu werden. `node .ara/tools/device.mjs --name <geraet> --admin-login` meldet sich am Geraet an und gibt die Sitzung aus, `--token` gibt nur den Ausweis. Weg und Benutzername kommen aus `arasul-release.json`, wenn das Artefakt sie nennt, sonst aus `--login-path` und `--login-user`, und das Werkzeug sagt jedes Mal, woher es sie hat. Der Weg geht an der Schnittstelle entlang und nicht ueber SSH, er kommt darum ohne Anmeldenamen und Schluessel aus und nimmt die Adresse aus `address` oder `api_base`.
- `secrets.mjs --show` zaehlt jeden Namen auf, den das Kit vergibt, nicht nur die Kit-Schluessel. Das Startpasswort lag vorher unter `ARASUL_START_<geraet>` da, und dieses Blatt nannte den Namen nicht.
- Die Ausgabe des Installers wird mitgelesen statt durchgereicht, und dabei maskiert: Kit-Schluessel und Startpasswort gehen nicht mehr im Klartext ueber den Bildschirm. Der Satz "Klartext wird nicht angezeigt" stimmt jetzt wieder.
- Neu am Ende von `/device`: **Was der Installer nicht konnte.** Seine Absagen, etwa eine fehlgeschlagene SSH-Haertung oder ein Firewall-Setup ohne Root-Rechte, stehen danach beisammen und in der Akte, statt in mehreren hundert Zeilen unterzugehen.
- Nach einer eigenen Installation traegt die Akte `tls: selfsigned`. Das Geraet stellt sein Zertifikat aus einer eigenen Geraete-CA aus, und der erste Aufruf gegen die Schnittstelle scheiterte sonst an `SELF_SIGNED_CERT_IN_CHAIN`.
- Die Fassung des Artefakts liest das Kit aus `arasul-release.json`, wenn keine Datei `VERSION` dabei ist. Spiegel, Geraeteakte und der Ordnername am Geraet sagten sonst "unbekannt", obwohl die Zahl danebenlag.
- `/app` weiss ohne `--device`, was es selbst an ein Geraet geschickt hat: welche Fassung im Teststand steht und welche live ist, je App und Geraet. Ist die gebaute Fassung live, wird nicht wieder `--check` und `--deploy` vorgeschlagen, sondern der Plan und die README.
- Der Plan der Referenz-App laesst sich nicht mehr verschieben: `--plan-aktiv` und `--plan-erledigt` verweigern jeden Plan, der in der Versionsverwaltung liegt. Der Spiegel behaelt beim Auspacken seinen `.gitkeep`. Beides machte den frischen Klon schmutzig.

## 0.9.0 (2026-08-28)

Kontrakt: bis 3

- Der Installer wird so gerufen, wie das Artefakt es sagt: der Einstiegspunkt kommt aus `arasul-release.json`, nicht aus dem Gedaechtnis des Kits, und er bekommt Startpasswort und Netzname mit. Nur dabei entstehen am Geraet Netzname, Fassung, Startpasswort und die Erstausgabe. Nennt das Artefakt keinen Einstiegspunkt, haelt das Kit an, statt zu raten.
- Das Startpasswort wuerfelt das Kit und legt es in die Geheimnis-Ablage. Die Geraeteakte traegt nur den Namen des Eintrags, in `start_password_ref`, und den Netznamen in `net_name`.
- Das Artefakt wird nach `$HOME/arasul-<fassung>` geschoben und nicht mehr nach `$HOME/arasul`. Das Kit fand sonst beim naechsten Lauf sein eigenes Paket und hielt es fuer eine Installation.
- Die Spurensuche unterscheidet drei Lagen statt zwei: die Plattform laeuft, es liegen nur Reste da, oder da ist nichts. Ueber Reste hinweg wird nur mit `--despite-traces` installiert, und das gehoert vorher bestaetigt.
- Ueberall, wo das Kit packt oder auspackt, bleiben die `._`-Beiwerkdateien von macOS draussen. 1124 davon gingen mit einem Artefakt an ein Geraet, und Traefik stieg an einer davon aus.
- `secrets.mjs --set` nimmt den Wert von der Standardeingabe, wenn kein Terminal dranhaengt. Ohne das blieb ein Token in einer nicht-interaktiven Sitzung auf "fehlt".
- Jedes Werkzeug beantwortet `--help` mit seiner Kopfhilfe und tut sonst nichts. Vorher fuehrte `device.mjs --help` eine Geraetepruefung aus und `mirror.mjs --help` lud den Spiegel.
- Neu: `node .ara/tools/mirror.mjs --docs` zeigt, welche Anleitungen mit dem Artefakt kamen. Das Wissen zu `/device` und `/maintain` nennt darueber den Weg zum ersten Mitarbeiter und zur ersten Freigabe, auch ohne Browser.
- `.env.example` schickt niemanden mehr zu `/start`. Den Befehl gibt es seit E1 nicht mehr.

## 0.8.0 (2026-08-27)

Kontrakt: bis 3

- Neuer Befehl `/invoice`, nur im Partnerzweig und nur mit `invoice: yes` im Profil: die Rechnung entsteht aus dem Angebot der Kundenakte, bekommt ihre Nummer aus dem Nummernkreis und wird als ZUGFeRD-PDF gedruckt. Im PDF steckt die Rechnung noch einmal als `factur-x.xml` nach EN 16931, damit die Buchhaltung des Kunden sie einliest, statt sie abzutippen.
- Die Pflichtangaben nach § 14 Abs. 4 UStG sind eine Pruefliste, die vor dem Druck rot wird. Fehlt eine, wird nicht gedruckt: eine unvollstaendige Rechnung berechtigt den Kunden nicht zum Vorsteuerabzug, und das faellt bei ihm auf.
- Der Nummernkreis liegt in `business/invoices.md` und gehoert dem Partner. Fortlaufend je Jahr, ohne Luecke, ohne Zurueckdrehen. Eine verworfene Rechnung wird storniert, nicht geloescht, und ihre Nummer bleibt vergeben.
- Ein Beleg, eine Wahrheit: die Zahlen im XML kommen aus derselben Tabelle, die gedruckt wird. Geprueft wird das Ergebnis gegen die Geschaeftsregeln der EN 16931, und der Selbsttest sagt dazu, was ungeprueft bleibt.
- Die Kundenakte fuehrt jetzt die Anschrift in `street`, `postcode` und `city`, dazu `country` und `vat_id`. Eine Rechnung braucht sie einzeln, ein Angebot ohnehin.
- `pdf.mjs` druckt kein Frontmatter mehr. Ein Beleg traegt seine maschinenlesbaren Felder im Kopf, und die sind keine Zeile fuer den Kunden.

## 0.7.0 (2026-08-27)

Kontrakt: bis 3

- Das Wissen ist auf die Plattformdienste geschnitten: `.ara/knowledge/platform-services.md` beschreibt Anmeldung, Freigaben, Flows, die KI-Schnittstelle mit Schlüssel und den Weg für fremde Werkzeuge, dazu die Sicherung und was ohne Arasul fehlt. Als Verfahren, ohne einen einzigen abgeschriebenen Produktwert.
- Neues Werkzeug `check-docs.mjs`: es liest jede Route, die im Wissen des Kits steht, und prüft sie mit `--device` live am Gerät, mit dessen eigener Endpunktliste als Maßstab. Was dort nicht mehr existiert, fällt auf, bevor ein Partner danach arbeitet.
- Neues Werkzeug `service-description.mjs`: die Leistungsbeschreibung entsteht mit Werten vom Gerät, Softwarestand, Kontraktfassung, Modelle und Apps, jeder Wert mit seiner Quelle im Dokument. Was ungemessen blieb, bleibt Platzhalter und wird genannt.
- `/maintain` liest mit, welche Modelle am Gerät liegen, gefunden über den Kontrakt und nicht über einen geratenen Pfad.
- Der Stand des Kits hat eine Nummer. `/init` nennt Stand, Neues und die Verträglichkeit zum Gerät, statt nur eine Liste geänderter Dateien zu zeigen.

## Vor 0.7.0

Frühere Stände trugen keine Nummer. Was vor 0.7.0 geschah, steht in der
Git-Geschichte des Kits, hier die Reihe der abgeschlossenen Phasen:

| Datum | Phase |
|---|---|
| 2026-08-27 | E6: der Kunde hat Geräte, das Angebot rechnet aus dem Blatt, die Wartung misst am Gerät |
| 2026-08-27 | E5: `/app` baut eine App aus der Vorlage und hält sie an, bis ein Mensch entscheidet |
| 2026-08-27 | E4: das Kit versteht Kontraktfassungen, packt Flows mit, findet die Schnittstelle hinter einem Tunnel |
| 2026-08-26 | E3: `/device` legt die Akte an, prüft SSH, erkennt Hardware und urteilt |
| 2026-08-26 | E2: `/init` mit der Weiche Partner oder Unternehmen |
| 2026-08-26 | E1: Grundriss, `/init` statt `/start` und `/update`, das Papier unter `.ara/` |
