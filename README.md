# Bilder zum Nachweis von K19: das Gerüst sieht gut aus

Dieser Zweig gehört nicht zum Kit. Er trägt die Bilder, die im Pull Request zu
`auftrag/kit-geruest-sieht-gut-aus` verlinkt sind, weil ein privates Repository
keine Bilder in einen PR-Text hochladen lässt.

Aufgenommen am 26.09.2026 auf dem Mac, nicht am Gerät: das gebaute Gerüst aus
`.ara/templates/app/frontend` (`npm run build`), ausgeliefert von einem
Probeserver, der `api/me`, `api/lage` und `api/vorgaenge` spielt. 200 Vorgänge,
jeder dritte mit einem Titel von 120 Zeichen, alle Stände gemischt. Chromium
über Playwright, Fenster 1280 × 800 und 390 × 800, Thema über
`prefers-color-scheme`.

Dateinamen: `<breite>-<thema>-<was>.png`.

| Was | Zeigt |
| --- | --- |
| `liste-gewaehlt` | Vorgang 200 (120 Zeichen) gewählt: ab 900 px daneben, bei 390 px als Blatt |
| `tastatur` | Titel der dritten Zeile per Tab, zweimal Pfeil ab, Eingabe gewählt; bei 390 px Tab und Eingabe öffnen das Blatt |
| `formular-leer-abgeschickt` | Einreichen mit leerem Titel: Knopf aktiv, Meldung am Feld, Pflichtfeld markiert |
| `zustand-laedt`, `-fehler`, `-leer` | Platzhalter in der Form der Liste, Fehler mit „Erneut versuchen“, Leerzustand mit Handlung |
| `900-light-liste`, `1000-light-liste` | Die schmalste Teilung, nichts rollt |
| `vorher-*` | Derselbe Probeserver mit dem Gerüst von `main` (0.37.0) |

Nach dem Merge kann dieser Zweig weg.
