# Ara-Kit

*[English version](../README.md) · [Impressum](#impressum)*

Das Ara-Kit ist ein Werkzeugkasten für Claude Code, mit dem du selbst betriebene Geräte einrichtest, abnimmst und betreust, bei deinen Kunden oder im eigenen Haus. Ein Gerät ist hier alles, was du über `ssh` erreichst: ein Server im Rack, ein Mini-PC unter dem Schreibtisch, ein Board im Regal, eine virtuelle Maschine beim Hoster. Du klonst es, öffnest den Ordner im Terminal und startest `claude`: `git clone https://github.com/Arasul-GmbH/ara-kit.git`, `cd ara-kit`, `claude`. Du brauchst dafür Claude Code, Node.js ab Version 20 und `ssh`. Ob dein Rechner das hat, prüft das Kit selbst. Beim ersten Start fragt Claude Code einmal, ob du diesem Ordner vertraust, und diese Antwort ist die einzige Freigabe, die das Kit braucht: nimm an, und von da an laufen seine Werkzeuge ohne eine einzige Rückfrage, der mitgebrachte Browser eingeschlossen. Die Einstellungen, die das Kit mitbringt, schalten die Fragen ab, und ein Riegel (`.ara/tools/guard.mjs`) blockiert weiterhin die wenigen Befehle ohne Rückweg, vor jedem einzelnen Aufruf.

Der erste Befehl ist `/init`. Ara fragt dich, in welcher Sprache du arbeiten willst (Englisch oder Deutsch, beide vollständig), ob du Partner bist (du richtest Geräte für Kunden ein) oder Unternehmen (du betreibst ein eigenes Gerät), wer du bist und wie du arbeitest. Danach liegen deine Befehle bereit und dein Profil steht in `business/`. Wer nicht klicken will, füllt eine Antwortdatei nach `.ara/templates/init-answers-partner.json` oder `init-answers-company.json` und übergibt sie: `/init <datei>`. Jedes weitere `/init` sagt dir zuerst, auf welchem Stand du sitzt, was daran neu ist und bis zu welcher Kontraktfassung dieses Kit mit einem Gerät zusammenarbeitet, dann holt es den aktuellen Stand, zeigt, was sich ändert, und bietet dir neue Befehle an. Deine Ordner `business/`, `customers/`, `devices/` und `apps/` gehören dir, sind von der Versionskontrolle ausgenommen und werden von keinem Update berührt.

## Was es auf einem blanken Gerät kann

Du führst mit dem Kit deine Kunden und deren Akten, hältst Wiedervorlagen und Wartungsenden nach, legst mit `/device` eine Geräteakte an und erfährst, was die Hardware ist und was sie trägt, erreichst Geräte über SSH mit den Zugangsdaten aus der Akte, schreibst Angebote mit allen Anlagen als PDF in deinem Namen und protokollierst jede Einrichtung in einem Laufzettel. `/maintain` beginnt mit einer Statuszeile, die es am Gerät misst und nicht aus der Akte abschreibt: Laufzeit, Platte, Arbeitsspeicher, Container, ausgefallene Dienste, Fehler im Protokoll des letzten Tages, und auf Wunsch legt es den Wartungsbericht in die Akte. Geht dabei ein Weg nicht, weil zum Beispiel SSH gerade nicht steht, entsteht der Bericht aus dem anderen und sagt dir, was fehlt. Danach kommt Diagnose, Update oder Erweiterung. Alles, was ein Kundengerät verändert, bestätigst du vorher.

Mit `/app` baust du eine eigene App und bringst sie auf ein Gerät. Ara fragt dich zuerst, worum es geht, wer sie benutzt, welche Daten hineingehen, wo ein Sprachmodell arbeitet und an welcher Stelle ein Mensch entscheiden soll; daraus wird ein Plan, den du liest, bevor gebaut wird. Die Vorlage bringt Oberfläche, Backend und einen ersten Flow mit, und sie läuft von der ersten Minute an: ein Vorgang wird eingereicht, der Flow hält an einer Freigabe an, ein Mensch entscheidet in Arasul, danach steht der Vorgang auf genehmigt oder abgelehnt, mit dem Namen dessen, der entschieden hat. Gebaut wird bei dir, eingespielt wird in den Teststand des Geräts, live schaltest du selbst. Wer ihn dort sehen darf, entscheidet ein Administrator am Gerät: der Schlüssel des Kits darf einspielen und sonst nichts, und deshalb sagt Ara nach jedem Einspielen, dass die Freigabe noch fehlt, und nennt die zwei Wege dorthin, über das Startpasswort oder in der Oberfläche des Geräts. Auf einem blanken Gerät geht dieselbe App über Compose, und das Kit sagt dir dabei, was dort fehlt: Anmeldung, Flows, Freigaben.

Rechnungen schreibt das Kit nur, wenn du es willst: `/init` fragt danach, und erst dann gibt es `/invoice`. Der Befehl nimmt die Positionen aus dem Angebot in der Kundenakte, vergibt die nächste Nummer aus deinem Nummernkreis in `business/`, prüft die Pflichtangaben nach § 14 UStG einzeln und druckt erst, wenn keine fehlt. Das PDF trägt die Rechnungsdaten als `factur-x.xml` in sich, das ist ZUGFeRD nach EN 16931: der Mensch sieht das Blatt, die Buchhaltung des Kunden liest die Datei, niemand tippt ab. Was dabei ungeprüft bleibt, sagt das Werkzeug selbst, statt Vollständigkeit zu behaupten. Eine Buchhaltung wird das Kit damit nicht: Zahlungseingänge, Mahnwesen und Voranmeldung laufen weiter dort, wo sie heute laufen.

Das Kit ist offen unter Apache 2.0 und läuft auch in einem eigenen Fork: `/init` holt den Stand als Archiv, es braucht kein Upstream-Remote.

## Wo Arasul dazukommt

Arasul ist eine Selfhosting-Plattform für KI im Unternehmen, und es ist das eine Produkt, das dieses Kit im Einzelnen kennt. Brauchen musst du es nicht. Wo es etwas besser könnte als ein blankes Gerät, sagt das Kit es einmal und macht dann ohne weiter.

Mit Arasul kommt das Gerät selbst als Quelle dazu. `/device` installiert die Plattform: es holt den Installer mit deinem Token aus dem Portal, schiebt ihn auf das Gerät, lässt ihn dort mit Startpasswort und Netzname laufen und legt dir den Schlüssel an, mit dem das Kit später Apps darauf rollt. Wie der Installer heißt, sagt das Artefakt selbst, das Kit rät es nicht; das Startpasswort landet in deiner Geheimnis-Ablage und nirgends sonst. Diesen Schlüssel kannst du auch wieder zurücknehmen: `--keys` listet, was am Gerät liegt, und markiert deinen, `--revoke-key` widerruft genau den und vergisst ihn. Was die Plattform darüber hinaus kann, etwa den ersten Mitarbeiter anlegen und ihm etwas freigeben, steht in den Anleitungen, die mit dem Artefakt kommen: `node .ara/tools/mirror.mjs --docs` sagt dir, welche das sind. Danach fragt Ara das Gerät, was es verspricht, statt etwas zu behaupten: Manifest, Grenzen und Endpunkte kommen aus seinem Kontrakt, und passt das Kit nicht dazu, sagt sie es, bevor etwas eingespielt wird. Ein Token brauchst du nur dafür: jeder Partner bekommt im Portal fünf davon kostenlos, sie öffnen den Download und sonst nichts.

## Das Papier entsteht am Gerät

Für das Papier gilt dasselbe wie für alles andere: es entsteht am Gerät. `node .ara/tools/service-description.mjs --device <gerät>` legt die Leistungsbeschreibung an und trägt ein, was das Gerät beantwortet, Softwarestand, Kontraktfassung, Modelle und Apps, jeden Wert mit seiner Quelle im Dokument. Was es nicht messen konnte, bleibt Platzhalter und wird genannt, und der Reifegrad je Funktionsbereich bleibt deine Entscheidung.

Das Vertragspapier unter `.ara/vorlagen/` und die Nachweise unter `.ara/nachweise/` sind deutsch und bleiben deutsch: es ist rechtlich gebundener Text für den DACH-Raum, gespiegelt aus Arasuls eigenem Steuerungsordner. Die Verfahren dazu gibt es in beiden Sprachen.

## Wenn etwas merkwürdig ist

`node .ara/tools/selftest.mjs` prüft in einer halben Minute ohne Netz und ohne Gerät, ob das Kit auf deinem Rechner funktioniert. Jedes Werkzeug beantwortet `--help` mit seiner Kopfhilfe und tut dabei nichts weiter. Die Dokumente prüft `npx --yes markdownlint-cli2@0.18.1 --config .ara/.markdownlint-cli2.jsonc "**/*.md"`; das Kit hat keine CI, beide Läufe sind der Nachweis vor einem Merge. `node .ara/tools/check-docs.mjs --device <gerät>` prüft die andere Richtung: es nimmt jede Route, die im Wissen des Kits steht, hält sie gegen den Kontrakt deines Geräts und fragt dort nach. Was es dort nicht mehr gibt, fällt auf, bevor du danach arbeitest.

Geheimnisse liegen in einer `.env` im Kit oder im Schlüsselbund deines Betriebssystems, SSH-Schlüssel bleiben in `~/.ssh`. Zwei Dinge bleiben deine Verantwortung: Festplattenverschlüsselung einschalten und eine Sicherung einrichten, `/init` bietet dir dafür ein privates Repository an.

## Sprache

Englisch ist die Hauptsprache des Kits, Deutsch ist gleichwertig und vollständig. `/init` fragt in der ersten Runde, die Antwort steht als `language: de|en` in `business/profile.md`, und von da an spricht Ara diese Sprache und die Werkzeuge geben darin aus. Dokumente kommen paarweise: `README.md` und `.ara/README.de.md`, `.ara/knowledge/device.md` und `.ara/knowledge/device.de.md`, ebenso die Befehle und die Gerüste. Die deutsche README ist das eine Paar, das nicht neben seiner englischen Hälfte liegt: in der Wurzel des Repositories steht eine README, die, die GitHub zeigt. Der Selbsttest zählt die Paare, damit keine Sprache still zurückfällt.

Der DACH-Raum bleibt die primäre Zielgruppe. Darum ist das Vertragspapier deutsch, und darum kennt die Rechnung § 14 UStG.

## Impressum

Angaben nach § 5 DDG:

Kolja Schöpe, Dresden, Deutschland.

Die vollständigen Angaben stehen unter <https://arasul.de/impressum>.

Dieser Abschnitt ist das Impressum dieses Repositorys. Auf ihn zeigt das GitHub-Profil.

## Lizenz

Apache License 2.0, siehe [LICENSE](LICENSE).
