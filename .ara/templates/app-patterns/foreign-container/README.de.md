# Muster 5: fremder Container als App hinter der Anmeldung

Ein Kunde will ein Werkzeug, das es schon gibt, eine kleine Webanwendung aus einer Registry,
und er will sie hinter der Anmeldung des Geräts statt offen im Netz. Das ist eine App mit
Backend und ohne eigene Oberfläche: das Werkzeug ist das Backend. Das Beispiel hier ist ein
Manifest und ein Bauplan aus einer Zeile. Der Überblick über alle Muster: `.ara/knowledge/app-patterns.de.md`.

**Das Gerät baut, es nimmt kein fertiges Image.** Das steht in den Regeln seines Kontrakts,
und `--check` druckt sie; das Kit weist ein Manifest mit `backend` und ohne `bauen` ab. Ein
anderswo gebautes Image wäre für eine Architektur gebaut, und niemand merkte es, bis es am
Gerät nicht startet. Der Bauplan für ein fremdes Image ist deshalb eine Zeile, `FROM` und das
Image, und das Gerät zieht es selbst, für seine eigene Architektur. Dafür muss es die
Registry erreichen, und das prüfst du dort.

**Vor dem Container hängt die Anmeldung des Geräts.** Alles unter dem `api`-Pfad der App
geht durch sie: wer die App nicht freigegeben hat, kommt nicht durch, und wer sie hat, kommt
mit Namen und Rolle in den zwei Kopfzeilen der Anmeldung an.
Das ist der ganze Sinn des Musters: das Werkzeug bekommt eine Anmeldung, die es nie hatte,
und der Kunde bekommt eine Anmeldung für alles.

Drei Dinge liest du in der Dokumentation des Werkzeugs und schreibst sie ins Manifest:

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
Container wurde dafür auf ein Gerät gespielt: der erste ist ein Nachweis, der in
den Laufzettel des Geräts gehört, mit Werkzeug, Fassung und dem, was die Übersicht zeigte.
