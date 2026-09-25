# Muster 3: E-Mail aus dem Backend senden

**Es gibt keinen Postdienst am Gerät.** Eine App, die jemandem schreiben will, spricht
selbst mit dem Postausgang des Kunden, wie jedes andere Programm in seinem Netz. Der Code
ist `backend/post.mjs`: SMTP in seiner einfachsten
Form, ohne Paket, genug für eine Textnachricht an ein Relais. Sein Kopf zeigt, wie der Kern
ihn als dritten Anschluss neben Ablage und Gerät bekommt und wie aus einem entschiedenen
Vorgang eine Mail wird. Der Überblick über alle Muster: `.ara/knowledge/app-patterns.de.md`.

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
