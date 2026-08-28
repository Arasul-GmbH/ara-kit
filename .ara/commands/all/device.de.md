---
description: Gerät anlegen und prüfen. Akte, SSH, Hardware, Urteil, Zustand und nächste Schritte
argument-hint: [<gerät> oder <kunde>/<gerät>]
---

Gerät: **$1**

Lies `.ara/knowledge/device.de.md` und arbeite danach. Wissen, das dieser Befehl lädt:
`.ara/knowledge/device.de.md`, `.ara/knowledge/security.de.md`, dazu erst nach dem Urteil
und nur bei Bedarf `.ara/knowledge/remote-access.de.md`, `.ara/knowledge/boot-and-flash.de.md`,
`.ara/knowledge/identify-device.de.md`, das passende Blatt unter
`.ara/knowledge/devices/`, `.ara/knowledge/flash-orin.de.md` bei einem Jetson AGX Orin
ohne Linux, `.ara/knowledge/handover.de.md`, `.ara/knowledge/self-healing.de.md`, sobald
Arasul läuft,
`.ara/knowledge/deploy.de.md`, sobald Arasul auf dem Gerät läuft, und
`.ara/knowledge/live-knowledge.de.md` für jeden Produktwert. Das Profil in
`business/profile.md` liest du vorher: Zweig, Erklärtiefe, Sicherheitsstufe, SSH-Schlüssel.

**Das Argument.** `zentrale` ist ein Gerät ohne Kunden, es liegt unter `devices/zentrale/`.
Das gilt in beiden Zweigen: beim Unternehmen ist es der Normalfall, beim Partner sind es
die eigenen Geräte. `mueller/zentrale` ist ein Kundengerät, es liegt unter
`customers/mueller/devices/zentrale/`, und den Kunden gibt es dann schon (sonst zuerst
`/customer`). Fehlt das Argument: erst der Merker `.ara/state.json`, dann die vorhandenen
Akten. Gibt es genau eine, nimm sie. Sonst frag über das Interview-Werkzeug.

**Zuerst, immer:**

```
node .ara/tools/device.mjs --name <gerät>
```

Mit `--customer <kunde>` bei einem Kundengerät. Gibt es die Akte schon, prüft das
Werkzeug erneut und sagt, wo es steht. Gibt es sie noch nicht, braucht es die Adresse
und den Anmeldenamen: `--host <adresse> --user <name>`, dazu `--port` und `--key`, wenn
sie vom Üblichen abweichen. Was du davon nicht weißt, fragst du gebündelt, bevor du
das Werkzeug aufrufst, nicht danach.

Das Werkzeug legt die Akte an, prüft SSH, erkennt Hardware und System, findet Docker,
Ollama und Hinweise auf Arasul und fällt das Urteil: **unterstützt**, **bald** oder
**nicht unterstützt, wir merken es vor**. Es liest nur. Sag das Ergebnis in drei Zeilen
und den nächsten Schritt, den es nennt.

**Die Erkennung braucht kein Vorwissen, und du steuerst keines bei.** Das Werkzeug liest,
was das Gerät über sich sagt, und hält es gegen die Blätter unter
`.ara/knowledge/devices/`. Was es unter „Geräteprofil" ausgibt, gibst du unverändert
weiter, besonders den Verifikationsstand: `live` heißt an echter Hardware verifiziert,
`emulation` heißt nur unter Emulation geprüft, `follow-up` heißt nach Herstellerdoku
gebaut. Ohne Spiegel gibt es keine Stufe, und dann sagst du das statt einer Stufe.
**Nenne nie ein Gerät, eine Speichergröße oder eine Stufe aus dem Gedächtnis.**

**Vor einem Eingriff steht diese Zeile zuerst.** `--install` und `--deploy-key` geben den
Profilblock selbst aus, bevor sie anfangen. Lies ihn vor, bevor du den Eingriff bestätigen
lässt: bei einem Gerät, dessen Profil nicht `live` ist, gehört das in die Bestätigung.

**Ein Gerät, das nicht dasteht**, lässt sich trocken fahren: `--probe <datei mit
befunden>` nimmt die Befunde aus einer Datei, erkennt genauso und schreibt nichts. Nimm
das, wenn jemand fragt, was das Kit über ein Gerät sagen würde, das er noch nicht hat.

**Docker und Ollama** setzt es nur auf Wunsch auf, mit `--install docker,ollama`. Das
ist ein Eingriff der Stufe 2: Absicht, Ziel und Rückweg nennen, bestätigen lassen, dann
aufrufen. Nur auf Linux.

**Arasul installieren** geht mit `--install arasul`, auf einem unterstützten Gerät, das
noch keins hat. Dafür braucht es zum ersten Mal einen Geräte-Token, und **einen Befehl
zum Kaufen gibt es nicht**: der Weg hängt hier. Ist das Urteil unterstützt, läuft nichts
von Arasul und ist kein Token hinterlegt, sagt das Werkzeug das unter „Nächste Schritte",
mit dem Link `https://www.arasul.de/kaufen`. Du fragst über das Interview-Werkzeug, ob
Arasul installiert werden soll, mit dem Link in der Frage: ein Konto ist kostenlos und
bringt einen kostenlosen Geräte-Token für den persönlichen Gebrauch, jede weitere
Installation wird gekauft, kommerzieller Einsatz braucht die Lizenz zu 3.000 Euro netto.
Ja heißt: der Mensch fügt den Token hier ein, du gibst ihn über die Leitung hinein,
`printf '%s' "$TOKEN" | node .ara/tools/device.mjs --licence --store`, nie als Argument
und nie im Text wiederholt. Das Werkzeug prüft ihn beim Portal, hinterlegt ihn und sagt,
auf welche Akte installiert wird; passen mehrere, fragst du, welches Gerät. Wer ohne Gerät
nach dem Kauf fragt, bekommt denselben Weg, `node .ara/tools/device.mjs --licence`.
Verfahren in `.ara/knowledge/device.de.md`, „Das Token". Die Installation selbst ist auch
Stufe 2, es dauert, und die Ausgabe des
Installers wird mitgelesen. Der Installer bekommt Startpasswort und Netzname mit, denn
nur dabei entstehen sie am Gerät; das Passwort würfelt das Kit und legt es in die
Geheimnis-Ablage, den Netznamen setzt `--net-name <name>`, sonst gilt der Name der Akte.

**Danach liest du zwei Dinge vor**, und beide stehen am Ende der Ausgabe: was der
Installer nicht konnte, und dass die Akte jetzt `tls: selfsigned` trägt. Die Absagen des
Installers sind kein Beiwerk: eine fehlgeschlagene Härtung ist für ihn eine Randnotiz und
für ein Gerät im Kundennetz eine offene Tür.

**Liegen Reste da, läuft aber nichts** (`arasul: traces`), sieh erst nach, was dort liegt,
sag es dem Menschen und lass dir das Darüberhinweg bestätigen. Dann
`--install arasul --despite-traces`. Läuft die Plattform dagegen wirklich, ist das kein
Aufsetzen mehr, sondern ein Update, und das ist ein anderer Weg.

**Läuft Arasul schon**, fehlt nur der Kit-Schlüssel für den Deploy: `--deploy-key` legt
ihn am Gerät an und hinterlegt ihn. In der Akte steht nur sein Name, nie sein Wert.
Danach ist der erste Nachweis der Kontrakt:
`node .ara/tools/app.mjs --device <gerät> --contract`.

**Der erste Mitarbeiter und die erste Freigabe** gehören noch zur Abnahme. Ohne Browser
geht das über die Verwaltungsschnittstelle der Plattform. Die Sitzung dafür holt
`--admin-login`: das Startpasswort aus der Installation geht aus der Geheimnis-Ablage
direkt in die Anmeldung, zurück kommt ein Ausweis, und angezeigt wird das Passwort nie.
Was du damit aufrufst, sagt `node .ara/tools/mirror.mjs --docs`. Das Gerät zählt die
Anmeldungen: ein 429 ist keine Fehlbedienung, sondern die Grenze, und dann wird gewartet.
Verfahren in `.ara/knowledge/device.de.md`.

**Ohne Arasul endet es hier, und zwar hilfreich.** Das Werkzeug schließt von selbst mit
dem, was Arasul brächte, mit den Geräten, die es tragen, und mit einem ruhigen Satz zur
Lizenz. Gib das weiter und leg nichts drauf. Fragt der Mensch danach nach Arasul, antworte
ihm: das braucht kein Gerät, und `.ara/knowledge/sales.de.md` ist dafür da. Wo die Antwort
ein Produktwert wäre, an den du nicht herankommst, sag, dass du ihn nicht weißt. Mit Arasul
auf einem unterstützten Gerät geht es nach dem Verfahren weiter.
