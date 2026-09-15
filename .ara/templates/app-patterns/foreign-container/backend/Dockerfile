# Muster fremder Container: ein fertiges Image als App, ohne eigenen Quelltext.
#
# Das Gerät nimmt beim Einspielen kein fertiges Image entgegen, es baut aus
# einem Bauplan im Paket. Das steht in den Regeln seines Kontrakts, und
# `app.mjs --check` druckt sie. Der Bauplan für ein fremdes Image ist deshalb
# eine Zeile: das Gerät zieht das Image selbst, für seine eigene Architektur,
# und dafür muss es die Registry erreichen.
#
# Hier steht der Webserver nginx, weil er klein ist, eine Seite zeigt und
# nichts einzustellen braucht. An seine Stelle tritt das Werkzeug, das der
# Kunde will. Drei Dinge liest man dann in dessen Dokumentation und trägt sie
# in die app.json daneben: der Port im Container (`ports.backend`), der Weg,
# der mit 200 antwortet, wenn es läuft (`backend.gesundheit`), und die
# Einstellungen, die es braucht (`backend.umgebung`). Dazu der Speicher unter
# `ressourcen`: nginx kommt mit 64m aus, ein Werkzeug mit eigener Datenbank
# nicht.
#
# Vor dem Container hängt die Anmeldung des Geräts. Wer die App nicht
# freigegeben hat, kommt nicht bis hierher; wer sie hat, kommt mit seinem Namen
# in der Kopfzeile an, deren Name im Kontrakt unter `koepfe` steht. Der
# Container sieht seine Pfade ohne den Vorsatz des Geräts: die Anfrage an
# `/apps/fremder-dienst/api/hallo` kommt hier als `/hallo` an. Ein Werkzeug,
# das seinen öffentlichen Pfad kennen muss, bekommt ihn über seine eigene
# Einstellung in `backend.umgebung`.
FROM nginx:alpine
