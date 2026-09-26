# Verfahren: acht Muster einer App jenseits des Formulars

> **Wann brauchst du das?** Im Interview, solange die Idee noch entsteht, und immer dann, wenn
> jemand Arasul für ein Formularwerkzeug hält. Das Gerät bringt Anmeldung, Freigaben, Flows und
> Modelle mit, die App bringt den Rest, und sie kann alles, was ein Programm kann.

**Arasul ist die Infrastruktur darunter, nicht die App.** Ein PDF zeigen, eine Mail senden, einen
fremden Dienst rufen, ein fremdes Werkzeug hinter der Anmeldung: das ist das eigene Tun der App,
und das Produkt stellt dafür keinen Dienst bereit, aus Entscheidung und nicht aus Lücke.

Jedes Muster ist Code unter `.ara/templates/app-patterns/`, und **neben dem Code liegt sein Blatt**,
`README.de.md`: was du klärst, was das Gerät erreichen muss, was geprüft ist. Lies nur das Blatt des
Musters, das der Plan nimmt. Jede Datei sagt in ihrem Kopf, wohin sie in einer App aus `--new`
gehört, der Selbsttest lässt sie laufen, und **keine trägt einen Weg, eine Kopfzeile oder einen
Umgebungsnamen des Geräts**: sie lesen `arasul.json`, wie die Vorlage. Was ein fremdes Werkzeug
braucht, sagt dessen Dokumentation.

| Muster | Was es zeigt | Blatt |
| --- | --- | --- |
| 1. Routen mit Seitenleiste | Eine Seite je Bereich, die Bereiche in der Seitenleiste | Die Vorlage selbst, unten |
| 2. Dokument hochladen und zeigen | Datei hinein, Bytes abgelegt, PDF oder Bild in der Anzeige der Bibliothek | `.ara/templates/app-patterns/documents/README.de.md` |
| 3. E-Mail senden | Eine Mail an das Relay des Kunden | `.ara/templates/app-patterns/mail/README.de.md` |
| 4. Fremde API rufen | Eine Adresse außerhalb des Geräts, mit Zeitgrenze | `.ara/templates/app-patterns/foreign-api/README.de.md` |
| 5. Fremder Container | Ein fertiges Abbild hinter der Anmeldung des Geräts | `.ara/templates/app-patterns/foreign-container/README.de.md` |
| 6. Dokument auslesen | Felder aus einem Beleg, geprüft, jede Auslesung protokolliert | `.ara/templates/app-patterns/extract/README.de.md` |
| 7. Mandanten | Wer welchen Mandanten sieht, wer entscheidet | `.ara/templates/app-patterns/clients/README.de.md` |
| 8. Belege je Mandant | 2, 6 und 7 zusammen: Beleg am Vorgang, ausgelesen, je Mandant getrennt | `.ara/templates/app-patterns/receipts/README.de.md` |

**Muster 1 ist die Vorlage**: eine `Route` je Seite in `Wege()` von
`.ara/templates/app/frontend/src/app.tsx`, die `Seitenleiste` der Bibliothek in
`rahmen/seitenleiste.tsx`, eine Datei je Seite unter `seiten/`. **Ein neuer Bereich sind drei
Schritte**: eine Seite, eine `Route`, ein Eintrag in der Seitenleiste. Die Routen bleiben eine Ebene
tief (`dokumente?nr=17`, nicht `dokumente/17`): die Seite lädt ihre Bündel relativ, und ein Verweis
auf eine gewählte Zeile bleibt ein Verweis. Unter 900 Pixeln wird die Seitenleiste ein Blatt, das
sich nach dem Klick schließt.

**Was `/app` damit tut.** Der Wunsch ist oft klein, „ein Formular für den Urlaubsantrag". Nenne
einmal, was daneben liegt: ein Dokument, eine Mail, ein Nachschlagen, ein Werkzeug, das das Büro
ohnehin nutzt, ein Beleg, den das Gerät ausliest, Mandanten. Der Plan nennt das Muster, das er
benutzt; nach `--new` nennt das Werkzeug dieses Blatt.
