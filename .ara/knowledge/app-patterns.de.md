# Verfahren: fünf Muster einer App jenseits des Formulars

> **Wann brauchst du das?** Im Interview, solange die Idee noch entsteht, und immer dann,
> wenn jemand Arasul für ein Formularwerkzeug hält. Wer nur den Vorgang der Vorlage mit
> seinem Freigabe-Schritt kennt, baut Formulare. Eine App kann alles, was ein Programm kann:
> das Gerät bringt Anmeldung, Freigaben, Flows und Modelle mit, den Rest bringt die App. Hier
> stehen fünf Muster, die bei fast jedem Kunden vorkommen, jedes mit Code, der läuft.

## Die Regel zuerst

**Arasul ist die Infrastruktur darunter, nicht die App.** Ein PDF zeigen, eine Mail
schicken, einen fremden Dienst rufen, ein fremdes Werkzeug hinter die Anmeldung stellen:
das ist Sache der App, gebaut vom Partner. Das Produkt stellt dafür keinen Dienst, und das
ist eine Entscheidung und keine Lücke. Was eine App auf lange Sicht abdecken soll, deckt sie
selbst ab.

Jedes Muster auf diesem Blatt verweist auf Code im Kit unter `.ara/templates/app-patterns/`.
Die Dateien werden in eine App gelegt, die aus `--new` kam, und jede sagt in ihrem Kopf, wo
sie hingehört und wie sie eingehängt wird. Geprüft wurden sie am 15.09.2026 gegen die
Vorlage, und der Selbsttest lässt sie laufen: die Mail geht durch ein lokales Relais, der
fremde Dienst ist ein lokaler Stellvertreter, die Dokumente gehen in das Backend der Vorlage,
das Manifest des fremden Containers durch die Manifestprüfung. Was sie von draußen brauchen,
ein Relais, eine fremde Adresse, eine Registry, muss das **Gerät** erreichen, und das wird
dort geprüft und nicht angenommen.

**Produktwerte bleiben, wo sie sind.** Keine dieser Dateien trägt eine Route, einen
Kopfzeilennamen oder einen Umgebungsnamen des Geräts. Was sie davon brauchen, bekommen sie
wie die Vorlage, aus der Vereinbarung, die das Kit beim Einspielen schreibt. Was ein Muster
von einem fremden Werkzeug braucht, sagt dessen Dokumentation, nicht dieses Blatt.

| Muster | Was es zeigt | Wo der Code liegt |
| --- | --- | --- |
| 1. Mehrere Routen mit Seitenleiste | Eine Seite je Bereich, die Bereiche in der Seitenleiste | Die Vorlage selbst, `.ara/templates/app/frontend/src/app.tsx` und `rahmen/seitenleiste.tsx` |
| 2. Dokument hochladen und zeigen | Datei hinein, Bytes abgelegt, PDF oder Bild in der Dokumentanzeige der Bibliothek | `.ara/templates/app-patterns/documents/` |
| 3. E-Mail aus dem Backend | Eine Mail an das Relais des Kunden, die Werte aus dem Manifest | `.ara/templates/app-patterns/mail/backend/post.mjs` |
| 4. Fremde API aus dem Backend | Eine Adresse außerhalb des Geräts, mit Zeitlimit und Sätzen für das, was schiefging | `.ara/templates/app-patterns/foreign-api/backend/fremd.mjs` |
| 5. Fremder Container als App | Ein fertiges Image hinter der Anmeldung des Geräts, ohne eigenen Code | `.ara/templates/app-patterns/foreign-container/` |

## 1. Mehrere Routen mit Seitenleiste

**Das ist die Vorlage schon.** Eine App aus `--new` hat zwei Seiten, die Liste und das
Formular, und die Seitenleiste links nennt sie. Die Teile:

| Wo | Was |
| --- | --- |
| `frontend/src/app.tsx`, `Wege()` | Eine `Route` je Seite. Der Router hängt unter dem Pfad, den das Gerät vergibt, gelesen in `rahmen/basis.ts` |
| `frontend/src/rahmen/seitenleiste.tsx` | Das Muster `Seitenleiste` der Bibliothek: Gruppen von Einträgen, welcher aktiv ist, sagt die App, denn sie kennt ihren Router |
| `frontend/src/seiten/` | Eine Datei je Seite. Eine Seite zeichnet, die Daten kommen aus einer Datei daneben (`vorgaenge.ts`) |

**Ein neuer Bereich sind drei Schritte**: eine Datei unter `seiten/`, eine `Route` in
`Wege()`, ein Eintrag in den Gruppen der Seitenleiste. Die Dokumentenseite aus Muster 2 ist
genau diese drei Schritte, ausgeführt.

Zwei Regeln gelten dabei, und beide kommen aus der Vorlage:

- **Die Wege bleiben eine Ebene tief.** `/apps/<id>/dokumente`, nicht `/apps/<id>/dokumente/17`.
  Die Seite verweist relativ auf ihre Bündel, und eine zweite Ebene schickte den Browser
  einen Ordner zu tief. Was auf ein einzelnes Ding zeigt, gehört in die Suchanfrage:
  `dokumente?nr=17`.
  Deshalb steht auch die gewählte Zeile einer Liste in der Adresse und nicht im Zustand der
  Seite: ein Verweis darauf bleibt einer.
- **Unter 900 Pixeln wird die Seitenleiste ein Blatt über der Seite**, und ein Eintrag
  schließt es nach dem Klick. Das tut das Muster; die App nennt nur die Einträge.

## 2. Dokument hochladen und in der Dokumentanzeige zeigen

Seit Fassung 4.1.0 der Bibliothek gibt es das Muster `Dokumentanzeige`: ein PDF mit Seiten,
Zoom und Vollbild, ein Bild ebenso. Damit wird ein Dokument, das jemand hochgeladen hat, am
Gerät angesehen statt heruntergeladen. Die Vorlage des Kits trägt diese Fassung, und `--new`
legt sie hin.

Der Code liegt unter `.ara/templates/app-patterns/documents/`, geteilt wie die Vorlage:

| Datei | Was sie ist |
| --- | --- |
| `backend/ablage/migrationen/002-dokumente.sql` | Die Tabelle. Zweite Migration, läuft beim nächsten Start von selbst |
| `backend/ablage/dokumente.mjs` | Die Ablage: das einzige SQL für Dokumente. Die Liste trägt keine Bytes |
| `backend/kern/dokumente.mjs` | Was angenommen wird: PDF und Bilder, bis zu einer Grenze. Sätze für das, was nicht |
| `backend/wege/dokumente.mjs` | Die Wege. Eine Datei geht roh als Rumpf hinein, der Name in einer Kopfzeile, die Bytes kommen mit ihrem Typ zurück |
| `frontend/src/dokumente.ts` | Typen und Abfragen: Liste, Hochladen, Entfernen, die Adresse der Bytes |
| `frontend/src/seiten/dokumente.tsx` | Die Seite: `Dateiablage` nimmt die Datei, `Datenliste` zeigt, was da ist, `Dokumentanzeige` zeigt das gewählte |

**Einhängen**: `backend/` und `frontend/` über die Ordner der App kopieren, drei Zeilen in
`server.mjs` (der Kopf von `wege/dokumente.mjs` zeigt sie), eine `Route` und ein Eintrag in
der Seitenleiste (der Kopf von `seiten/dokumente.tsx` zeigt sie), dann `--build`.

Was du über die Anzeige wissen musst, in der Bibliothek gelesen am 15.09.2026:

- `Dokumentanzeige` kommt aus `@marken` wie alles andere. Ihre `quelle` ist eine `File`, ein
  `Blob` oder eine Adresse gleicher Herkunft. Ohne Quelle zeigt sie ihren Leerzustand.
- **Gib ihr die `art`**, `pdf` oder `bild`, wenn die Quelle eine Adresse ist: die Anzeige
  liest die Art am Typ einer Datei oder an der Endung einer Adresse ab, und die Adresse der
  eigenen Bytes der App hat keine. Die Seite nimmt die Art aus dem Typ, den das Backend
  gespeichert hat.
- `name` steht im Kopf der Anzeige, `hoehe` ist die Höhe des Kastens als CSS-Wert, und
  `kennzeichen` ist die Marke für einen Test.
- **Die PDF-Bibliothek braucht Stützdateien neben dem übersetzten JavaScript**, einen Ordner
  `pdf-dateien/` mit Worker, Schriften und mehr. Die `vite.config.ts` der Vorlage legt ihn
  bei jedem Bau dorthin. Ohne ihn zeigt ein Bild weiterhin, und ein PDF endet im
  Fehlerzustand. Eine App, die vor dieser Fassung entstand, bekommt die Bibliothek mit
  `marken.mjs --sync` und braucht dazu die Abhängigkeit und dieses Plugin aus der Vorlage;
  beide stehen in deren `frontend/package.json` und `frontend/vite.config.ts`.
- `Dateiablage` zeigt seit 4.1.0 eine Vorschau der gewählten Datei (`vorschau`). Die
  Dokumentenseite schaltet sie ab, weil sie zeigt, was abgelegt ist, und zwei Anzeigen auf
  einer Seite eine zu viel wären.

**Die Bytes liegen in der SQLite der App**, neben den Vorgängen. Das ist der eine Ort, den
die App hat: ein Gerät gibt einer App keinen eigenen Datenordner. Sie überleben einen
Neustart des Containers und **nicht das nächste Einspielen**, und das gehört in die README
der App und ins Gespräch, bevor der Kunde es merkt. Die Grenze liegt bei zehn Megabyte je
Datei, gesetzt im Kern und der Seite gesagt; sie hängt am Arbeitsspeicher des Containers im
Manifest, und wer das eine hebt, hebt das andere.

**Was das Gerät mit einem Dokument tut, ist eine andere Sache.** Text daraus holen, ein
Modell danach fragen: das bietet die Plattform, über den Schlüssel der App, siehe
`.ara/knowledge/platform-services.de.md`. Das Muster hier ist der Weg zum Menschen und
zurück.

Wenn du es prüfst, prüf es in beiden Themen und beiden Breiten, wie jede Oberfläche.

## 3. E-Mail aus dem Backend senden

**Es gibt keinen Postdienst am Gerät.** Eine App, die jemandem schreiben will, spricht
selbst mit dem Postausgang des Kunden, wie jedes andere Programm in seinem Netz. Der Code
liegt unter `.ara/templates/app-patterns/mail/backend/post.mjs`: SMTP in seiner einfachsten
Form, ohne Paket, genug für eine Textnachricht an ein Relais. Sein Kopf zeigt, wie der Kern
ihn als dritten Anschluss neben Ablage und Gerät bekommt und wie aus einem entschiedenen
Vorgang eine Mail wird.

**Die Werte stehen im Manifest**, unter `backend.umgebung`, und das Gerät legt sie in den
Container: der Host, der Port, ob und wie TLS gesprochen wird, die Absenderadresse. Der Kopf
der Datei nennt sie.

**Das Passwort nicht.** Das Manifest liegt im Paket und im Repository des Partners, und ein
Passwort darin läge an zwei Orten, an die es nicht gehört. Der Weg, der heute geht, ist ein
Relais im Netz des Kunden, das das Gerät ohne Anmeldung annimmt, an seiner Adresse erkannt;
das ist der übliche Fall mit einem Mailserver im Haus. Verlangt der Postausgang eine
Anmeldung, hält die App sie in ihrer eigenen Ablage, eingetragen über eine eigene
Einstellungsseite, und reicht sie dem Modul; das Gerät gibt einer App heute keinen Ort für
ein Geheimnis. Eine Anmeldung ohne TLS weist das Modul ab, weil sie das Passwort im Klartext
schickte.

Drei Dinge klärst du im Interview und schreibst sie in den Plan:

- **Wer die Mail bekommt.** Die Anmeldung gibt der App einen Namen und keine Adresse.
  Entweder hält die App eine Liste aus Namen und Adressen, oder das Formular fragt nach der
  Adresse, oder die Mail geht an eine feste Adresse. Das entscheidet der Kunde.
- **Wann sie geht.** Nach einer Entscheidung, nach einer Frist, am Ende eines Laufs. Der Kern
  kennt den Moment; das Modul sendet nur.
- **Was passiert, wenn sie nicht geht.** Das Modul wirft nie: eine Mail, die nicht rausging,
  ist ein Satz am Vorgang und kein Absturz der App. Die Seite zeigt den Satz.

**Was geprüft ist und was nicht.** Der Selbsttest sendet durch ein lokales Relais und liest
die Mail zurück. TLS und eine Anmeldung liefen hier gegen niemanden: die erste Mail beim
Kunden geht an dich selbst, bevor ein Ablauf daran hängt. Ob das Gerät das Relais erreicht,
prüfst du am Gerät, über `remote.mjs`, nicht von deinem eigenen Rechner.

Für Anhänge, HTML oder andere Anmeldeverfahren nimm ein Paket wie `nodemailer`, leg dafür
ein `npm ci` in das Dockerfile und behalte die Schnittstelle des Moduls bei: `senden` mit
Empfängern, Betreff und Text, zurück kommt, ob es ging, und sonst der Satz.

## 4. Fremde API aus dem Backend rufen

Eine App schlägt etwas außerhalb des Geräts nach: eine Postleitzahl, einen Wechselkurs,
einen Auftrag in einem fremden System. Der Code liegt unter
`.ara/templates/app-patterns/foreign-api/backend/fremd.mjs`, gebaut wie der Anschluss der
Vorlage an das Gerät: der Kern bekommt ihn hereingereicht, ruft `rufen` mit Verb, Pfad und
Rumpf und bekommt den Status, den Inhalt als JSON oder einen Satz darüber, was schiefging.
Er wirft nie, und er wartet höchstens zehn Sekunden.

**Aus dem Backend, nicht aus dem Browser.** Die Oberfläche einer App läuft im Rahmen des
Geräts, und dessen Sicherheitsrichtlinie lässt keinen Aufruf nach draußen zu. Dazu ist ein
Schlüssel im Browser ein Schlüssel für jeden, der die Entwicklerwerkzeuge öffnet. Das
Backend ruft, der Browser fragt das Backend.

**Die Adresse steht im Manifest**, unter `backend.umgebung`; der Kopf der Datei nennt die
Variable. **Der Schlüssel nicht**, aus demselben Grund wie das Passwort in Muster 3: die App
hält ihn in ihrer eigenen Ablage, oder der Dienst kommt ohne aus. Was der fremde Dienst in
welcher Kopfzeile will, sagt seine Dokumentation, und die App baut diese Kopfzeile; das
Modul trägt sie nur.

Zwei Dinge prüfst du, bevor du es versprichst:

- **Erreicht das Gerät die Adresse.** Ein Gerät im Netz eines Kunden kommt nicht immer ins
  Internet, und ein Dienst antwortet nicht immer. Beides ist ein Satz am Vorgang. Prüf es am
  Gerät, über `remote.mjs`.
- **Was das Gerät verlässt.** Eine Postleitzahl ist nichts, ein Name mit einem Auftrag ist
  personenbezogen. Das ist die Zeile „Welche Daten" der Prüfliste des Interviews, und es
  steht im Plan und in der Akte des Kunden.

## 5. Fremder Container als App hinter der Anmeldung

Ein Kunde will ein Werkzeug, das es schon gibt, eine kleine Webanwendung aus einer Registry,
und er will sie hinter der Anmeldung des Geräts statt offen im Netz. Das ist eine App mit
Backend und ohne eigene Oberfläche: das Werkzeug ist das Backend. Das Beispiel liegt unter
`.ara/templates/app-patterns/foreign-container/`, ein Manifest und ein Bauplan aus einer
Zeile.

**Das Gerät baut, es nimmt kein fertiges Image.** Das steht in den Regeln seines Kontrakts,
und `--check` druckt sie; das Kit weist ein Manifest mit `backend` und ohne `bauen` ab. Ein
anderswo gebautes Image wäre für eine Architektur gebaut, und niemand merkte es, bis es am
Gerät nicht startet. Der Bauplan für ein fremdes Image ist deshalb eine Zeile, `FROM` und das
Image, und das Gerät zieht es selbst, für seine eigene Architektur. Dafür muss es die
Registry erreichen, und das prüfst du dort.

**Vor dem Container hängt die Anmeldung des Geräts.** Alles unter dem `api`-Pfad der App
geht durch sie: wer die App nicht freigegeben hat, kommt nicht durch, und wer sie hat, kommt
mit Namen und Rolle in zwei Kopfzeilen an, deren Namen im Kontrakt unter `koepfe` stehen.
Das ist der ganze Sinn des Musters: das Werkzeug bekommt eine Anmeldung, die es nie hatte,
und der Kunde bekommt eine Anmeldung für alles.

Drei Dinge liest du in der Dokumentation des Werkzeugs und schreibst sie ins Manifest, und
dieses Blatt kennt sie nicht:

- **Den Port**, auf dem das Werkzeug hört, `ports.backend`.
- **Einen Weg, der mit 200 antwortet, wenn es läuft**, `backend.gesundheit`. Der
  Gesundheitscheck des Geräts fragt ihn.
- **Seine Einstellungen**, `backend.umgebung`. Zwei zählen hier. Der Container sieht seine
  Pfade ohne den Vorsatz des Geräts: eine Anfrage an `/apps/<id>/api/hallo` kommt als
  `hallo` an der Wurzel an. Ein Werkzeug, das seinen öffentlichen Pfad kennen muss, bekommt
  ihn über seine eigene Einstellung. Und ein Werkzeug mit eigener Anmeldung: nimm eines,
  das einer Kopfzeile vertraut oder keine braucht, sonst meldet sich der Mensch zweimal an.

Dazu der Speicher unter `ressourcen`: das Beispiel kommt mit wenig aus, ein Werkzeug mit
eigener Datenbank nicht.

**Ohne eigene Oberfläche hat die App keine Seite unter `/apps/<id>/`.** Ihre Adresse ist
der `api`-Pfad. Was die Übersicht des Geräts für so eine App zeigt und wie der Mensch
dorthin kommt, prüfst du am Gerät. Der Standard der Bibliothek gilt für sie nicht: sie
bringt keine Oberfläche mit, die neben der des Geräts stehen könnte. Und für die Lizenz ist
sie eine App wie jede andere: sie belegt einen Platz, die Regeln des Kontrakts sagen es.

**Was geprüft ist und was nicht.** Das Manifest ging durch die Manifestprüfung des Kits
gegen ein Schema in der Form des Kontrakts, und der Bauplan ist ein Bauplan. Kein fremder
Container wurde für dieses Blatt auf ein Gerät gespielt: der erste ist ein Nachweis, der in
den Laufzettel des Geräts gehört, mit Werkzeug, Fassung und dem, was die Übersicht zeigte.

## Was `/app` damit tut

Im Interview ist der Wunsch oft klein: „ein Formular für den Urlaubsantrag". Dann nenn,
was daneben liegt, einmal und kurz: der Antrag als Dokument, eine Mail, wenn er entschieden
ist, ein Nachschlagen in der Zeiterfassung, das Werkzeug, das das Büro ohnehin benutzt. Der
Mensch sagt, was er will, und der Plan nennt das Muster, das er benutzt, damit der Nächste,
der ihn öffnet, weiß, wonach er sucht. Nach `--new` nennt das Werkzeug dieses Blatt aus
demselben Grund.
