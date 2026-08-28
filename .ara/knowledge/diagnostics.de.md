# Verfahren: Diagnose

> **Wann brauchst du das?** Wenn etwas nicht funktioniert, bei `/maintain` oder wenn
> jemand „bei Müller geht der Chat nicht" sagt.

## Der Grundsatz

**Erst feststellen, dann ändern.** Keine Reparatur ohne Befund. Kein „probier mal einen
Neustart" als erste Handlung.

Der Grund ist nicht Ordnungsliebe: Ein Neustart löscht die Spur. Wenn du vorher nicht weißt,
was los war, weißt du es danach nie, und in drei Wochen steht dasselbe Problem wieder da,
und du fängst von vorn an.

## Die Kette

Arbeite von außen nach innen. Jede Stufe beantwortet eine Frage, bevor du zur nächsten
gehst.

1. **Was genau passiert?** Nicht „geht nicht". Was hat wer gemacht, was hätte passieren
   sollen, was ist stattdessen passiert, wann zuletzt gut? Wenn der Kunde das nicht weiß,
   lass es dir zeigen.
2. **Ist das Gerät erreichbar?** `node .ara/tools/find-device.mjs --host <adresse>`,
   dann `node .ara/tools/remote.mjs --customer <k> --check`. Wenn nicht: Verfahren in
   `.ara/knowledge/remote-access.de.md`, Abschnitt „Wenn ein Gerät nicht mehr erreichbar ist".
3. **Lebt das Gerät selbst?** Läuft es seit dem letzten Start durch? Ist Speicherplatz da?
   Ist die Systemzeit richtig? Ein volles Dateisystem und eine falsche Uhr sind die zwei
   Ursachen, die sich als alles Mögliche tarnen.
4. **Laufen die Dienste?** Welche laufen, welche nicht, welche starten immer wieder neu.
   Ein Dienst, der in Schleife neu startet, ist die häufigste Ursache für „antwortet
   manchmal, manchmal nicht".
5. **Was sagen die Protokolle?** Vom Zeitpunkt des Fehlers, nicht die letzten tausend
   Zeilen. Wenn der Kunde sagt „seit gestern Nachmittag", dann schau dort.
6. **Was hat sich geändert?** Update, Stromausfall, neuer Router, neue Firewall, jemand hat
   etwas eingerichtet. Ein System, das monatelang lief und plötzlich nicht mehr, hat fast
   immer eine Ursache außerhalb seiner selbst.

Wie man das jeweils abfragt, steht im Produkt. Lies es im Spiegel nach, statt Befehle aus
dem Gedächtnis zu verwenden.

## Häufige Muster

| Symptom | Wo du zuerst schaust |
|---|---|
| Antwortet gar nicht | Läuft die Sprachverarbeitung? Ist ein Modell geladen? |
| Antwortet leer oder unsinnig | Meist kein Modell geladen, sieht aus wie ein Denkfehler, ist ein fehlendes Modell |
| Antwortet sehr langsam | Läuft die Berechnung auf der Grafikeinheit oder auf dem Hauptprozessor? |
| Findet Dokumente nicht | Wurde das Dokument aufgenommen? Ist das Format überhaupt lesbar? |
| Weboberfläche nicht erreichbar | Netzweg, Zertifikat, oder Dienst dahinter |
| Ging gestern noch | Update, Neustart, Änderung im Kundennetz |

Die Tabelle ersetzt die Kette nicht. Sie sagt nur, wo man zuerst hinschaut.

## Bevor du etwas änderst

Sag den Befund in zwei Sätzen: was du festgestellt hast und was du daraus schließt. Dann
den Vorschlag, mit Rückweg. Erst dann handeln.

> Der Dienst für die Sprachverarbeitung startet seit gestern 14 Uhr alle zwei Minuten neu,
> im Protokoll steht ein Speicherfehler. Das passt dazu, dass gestern ein größeres Modell
> geladen wurde. Vorschlag: zurück auf das Modell aus dem Geräteprofil. Rückweg: das
> größere lässt sich jederzeit wieder laden. Soll ich?

## Was du nicht tust

- **Nicht mehrere Dinge gleichzeitig ändern.** Dann weißt du nicht, was geholfen hat.
- **Nicht in Kundendaten stöbern.** Protokolle ja, Dokumente und Gesprächsverläufe nein.
- **Nicht raten und dann prüfen, ob es geholfen hat.** Das ist keine Diagnose, das ist
  Würfeln mit fremder Infrastruktur.

## Danach

Was war, was du getan hast, was es gebracht hat, in `customers/<k>/history/`. Beim nächsten
Mal ist das der erste Ort, an dem du nachsiehst. Wenn dieselbe Ursache zum zweiten Mal
auftritt, ist das keine Störung mehr, sondern ein Konstruktionsfehler, und der gehört
gemeldet.
