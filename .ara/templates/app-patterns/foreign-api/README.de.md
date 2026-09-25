# Muster 4: fremde API aus dem Backend rufen

Eine App schlägt etwas außerhalb des Geräts nach: eine Postleitzahl, einen Wechselkurs,
einen Auftrag in einem fremden System. Der Code ist
`backend/fremd.mjs`, gebaut wie der Anschluss der
Vorlage an das Gerät: der Kern bekommt ihn hereingereicht, ruft `rufen` mit Verb, Pfad und
Rumpf und bekommt den Status, den Inhalt als JSON oder einen Satz darüber, was schiefging.
Er wirft nie, und er wartet höchstens zehn Sekunden. Der Überblick über alle Muster: `.ara/knowledge/app-patterns.de.md`.

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
