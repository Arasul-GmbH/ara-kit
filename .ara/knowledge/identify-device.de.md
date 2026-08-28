# Verfahren: Gerät bestimmen

> **Wann brauchst du das?** Am Anfang jeder Einrichtung, und immer wenn du wissen musst,
> was auf diesem Gerät gilt. Modell, Engine, Speicherbudget, Besonderheiten.

## Der Grundsatz: zwei Listen, und sie sagen Verschiedenes

**Das Kit kennt Hardware, das Produkt kennt, was darauf läuft.** Das sind zwei Listen, sie
liegen an zwei Stellen, und sie zu verwechseln ist der Weg, auf dem eine falsche Zahl in ein
Angebot kommt.

| Liste | Wo | Was dort steht |
| --- | --- | --- |
| Geräteprofile des Kits | `.ara/knowledge/devices/`, ein Blatt je Gerät, in beiden Sprachen | Hersteller, Familie, Architektur und die Signatur, an der `/device` die Hardware erkennt. Jedes Blatt trägt seinen Stand und seine Quelle |
| Plattformkatalog des Produkts | der Spiegel, `config/platforms/*.json` | Modell, Engine, Speicherbudget, Präzision, und die Stufe, auf der das Profil belegt ist |

Die Blätter des Kits ändern sich selten, sie stehen geschrieben, und zur Laufzeit wird nichts
recherchiert. Der Katalog ändert sich mit dem Produkt, das Kit liest ihn, statt ihn
nachzubauen. **Keine der beiden Listen füllt je die andere auf:** ein Blatt des Kits sagt
nichts über das Modell, und der Katalog sagt nichts darüber, woran ein Gerät erkannt wird.

## Schritt 0: Was das Kit erkannt hat

`/device` macht das von selbst und sagt es im Abschnitt "Geräteprofil": welches Blatt passt,
von wann es ist, woher seine Kenntnis stammt und welches Katalogprofil daraus folgt. Passt
kein Blatt, sagt es auch das, und dann wird auch kein Katalogprofil genannt.

**Ein Blatt ist eine Erkennung, keine Zusage.** Was daraus für die Einrichtung folgt, kommt
aus dem nächsten Schritt.

## Schritt 1: Katalog öffnen

Hol den Spiegel (`node .ara/tools/mirror.mjs`) und sieh unter
`.ara/mirror/config/platforms/` nach. Dort liegt ein Profil je Gerätetyp, dazu eine
Beschreibung der Felder.

Lies die Beschreibungsdatei im selben Ordner zuerst, sie erklärt, was die Felder bedeuten.
Erfinde die Bedeutung nicht.

## Schritt 2: Reifegrad prüfen, das ist der wichtige Teil

Ein Profil im Katalog heißt **nicht**, dass das Gerät erprobt ist. Die Profile tragen
Angaben dazu, wie gut sie belegt sind: ob die Rechenfähigkeit der Grafikeinheit bestätigt
wurde, und auf welcher Stufe die Prüfung steht (an echter Hardware, nur emuliert, oder als
Nachtrag geplant).

**`/device` liest dieses Feld und gibt es vor jedem Lauf aus**, und vor jedem Eingriff ein
zweites Mal. Drei Stufen kommen heute aus dem Katalog:

| Stufe | Was sie heißt |
| --- | --- |
| `live` | an echter Hardware verifiziert |
| `emulation` | nicht am Gerät, nur unter Emulation geprüft |
| `follow-up` | nach Herstellerdoku gebaut, an keinem Gerät erprobt |

**Ohne Spiegel gibt es keine Stufe.** Dann sagt der Lauf, dass er sie nicht lesen kann, und
das ist die ehrliche Auskunft: eine ausgelassene Zeile läse sich wie eine Bestätigung, und
eine Bestätigung ist sie nicht.

**Lies diese Felder und sag dem Menschen ehrlich, was du siehst.** Ein Profil, dessen Werte
als unbestätigt gekennzeichnet sind, ist eine Absichtserklärung, keine Zusage. Wenn ein
Partner ein solches Gerät beim Kunden aufstellen will, gehört dieser Satz vor die
Installation, nicht danach:

> Das Profil für dieses Gerät ist im Produkt hinterlegt, aber laut Katalog noch nicht an
> echter Hardware bestätigt. Wir sind hier die Ersten. Rechne mit Nacharbeit und plan einen
> zweiten Termin ein.

Wenn Katalogangaben und Verkaufsversprechen auseinandergehen, ist das eine Frage ans
Produktteam, und der Partner sollte sie stellen, bevor er einen Termin zusagt.

## Schritt 3: Am Gerät bestätigen

Sobald das Gerät läuft und erreichbar ist, **frag es selbst**. Das Produkt erkennt seine
Plattform und kann das erkannte Profil ausgeben; die passenden Befehle stehen in der Hilfe
des Kommandozeilenwerkzeugs im Wurzelverzeichnis des Spiegels.

Erst dieser Wert kommt in `device.md` und in den Laufzettel. Vorher steht dort nichts oder
ein ausdrücklich als vorläufig gekennzeichneter Eintrag.

**Warum so streng:** Ein Gerät kann anders erkannt werden, als der Lieferschein vermuten
lässt, andere Speicherbestückung, anderer Aufbau, ein Vorgängermodell im gleichen Gehäuse.
Die Einrichtung richtet sich nach dem, was das Gerät von sich sagt.

## Schritt 4: Was du daraus ableitest

Aus dem bestätigten Profil ergeben sich Speicherbudget, Standardmodell, Engine und
Besonderheiten. **Nimm diese Werte aus dem Profil, nicht aus dem Gedächtnis**, und schreib
sie in den Laufzettel, wenn sie für die Einrichtung wichtig sind.

Fällt dir dabei etwas auf, das nicht zusammenpasst, ein Modell, das die Engine nicht laden
kann, ein Speicherbudget über der verbauten Ausstattung, halt an und sag es. Solche
Widersprüche sind der häufigste Grund, warum eine Installation am Ende nicht antwortet.

## Wenn kein Gerät bekannt ist

Beim Anlegen einer Kundenakte ist oft noch offen, welches Gerät es wird. Das ist in
Ordnung. Trag nichts ein, was du nicht weißt, und plan das Gerät erst dann, wenn es
feststeht. Ein Angebot kann mit einer Gerätekategorie arbeiten, eine Einrichtung nicht.
