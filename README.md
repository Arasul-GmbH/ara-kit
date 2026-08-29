# Bilder zum Nachweis von K19, Freigabe und Schluessel

Dieser Zweig gehoert nicht zum Kit. Er traegt nur die Bilder, die im Pull
Request zu `auftrag/kit-freigabe-und-schluessel` verlinkt sind, weil ein
privates Repository keine Bilder in einen PR-Text hochladen laesst.

Aufgenommen am 29.08.2026 am Orin (Kontrakt 5), Konto `pruefer`, aus einem
frischen Klon des Zweigs. Der Fremdtest lief als Subagent, ohne Vorwissen ueber
die Arbeit: 2 Minuten vom leeren Klon bis in den Teststand, 6 Minuten 41 bis zum
Bild im Rahmen.

| Bild | Was darauf ist |
| --- | --- |
| `bilder/403-ohne-freigabe.png` | Der Teststand vor der Freigabe, angemeldet als `pruefer`: "Die App fremdprobe ist Ihnen nicht freigegeben. Ein Administrator gibt sie frei, auch fuer sich selbst." Genau diese Lage kuendigt `--deploy` jetzt an |
| `bilder/freigabe-auf-teststand.png` | Die Freigabetabelle in der Oberflaeche, die Freigabe auf `Test` gestellt. Das Haekchen allein gibt den Livestand frei, und den hat eine frisch eingespielte App nicht |
| `bilder/app-im-rahmen.png` | Die eigene App im Rahmen von Arasul: Seitenleiste mit "Fremdprobe / Test", die Seite "Vorgaenge" darin, Fussleiste mit Fassung und Modell |

Nach dem Merge kann dieser Zweig weg.
