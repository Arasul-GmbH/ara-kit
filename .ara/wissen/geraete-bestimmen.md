# Verfahren: Gerät bestimmen

> **Wann brauchst du das?** Am Anfang jeder Einrichtung, und immer wenn du wissen musst,
> was auf diesem Gerät gilt — Modell, Engine, Speicherbudget, Besonderheiten.

## Der Grundsatz

Es gibt **keine Geräteliste im Kit**. Welche Geräte das Produkt kennt und was auf ihnen
gilt, steht im Produkt selbst, im Plattformkatalog. Der ändert sich — das Kit liest ihn,
statt ihn nachzubauen.

## Schritt 1: Katalog öffnen

Hol den Spiegel (`node .ara/werkzeuge/spiegel.mjs`) und sieh unter
`.ara/spiegel/config/platforms/` nach. Dort liegt ein Profil je Gerätetyp, dazu eine
Beschreibung der Felder.

Lies die Beschreibungsdatei im selben Ordner zuerst — sie erklärt, was die Felder bedeuten.
Erfinde die Bedeutung nicht.

## Schritt 2: Reifegrad prüfen — das ist der wichtige Teil

Ein Profil im Katalog heißt **nicht**, dass das Gerät erprobt ist. Die Profile tragen
Angaben dazu, wie gut sie belegt sind: ob die Rechenfähigkeit der Grafikeinheit bestätigt
wurde, und auf welcher Stufe die Prüfung steht (an echter Hardware, nur emuliert, oder als
Nachtrag geplant).

**Lies diese Felder und sag dem Menschen ehrlich, was du siehst.** Ein Profil, dessen Werte
als unbestätigt gekennzeichnet sind, ist eine Absichtserklärung, keine Zusage. Wenn ein
Partner ein solches Gerät beim Kunden aufstellen will, gehört dieser Satz vor die
Installation, nicht danach:

> Das Profil für dieses Gerät ist im Produkt hinterlegt, aber laut Katalog noch nicht an
> echter Hardware bestätigt. Wir sind hier die Ersten. Rechne mit Nacharbeit und plan einen
> zweiten Termin ein.

Wenn Katalogangaben und Verkaufsversprechen auseinandergehen, ist das eine Frage ans
Produktteam — und der Partner sollte sie stellen, bevor er einen Termin zusagt.

## Schritt 3: Am Gerät bestätigen

Sobald das Gerät läuft und erreichbar ist, **frag es selbst**. Das Produkt erkennt seine
Plattform und kann das erkannte Profil ausgeben; die passenden Befehle stehen in der Hilfe
des Kommandozeilenwerkzeugs im Wurzelverzeichnis des Spiegels.

Erst dieser Wert kommt in `geraet.md` und in den Laufzettel. Vorher steht dort nichts oder
ein ausdrücklich als vorläufig gekennzeichneter Eintrag.

**Warum so streng:** Ein Gerät kann anders erkannt werden, als der Lieferschein vermuten
lässt — andere Speicherbestückung, anderer Aufbau, ein Vorgängermodell im gleichen Gehäuse.
Die Einrichtung richtet sich nach dem, was das Gerät von sich sagt.

## Schritt 4: Was du daraus ableitest

Aus dem bestätigten Profil ergeben sich Speicherbudget, Standardmodell, Engine und
Besonderheiten. **Nimm diese Werte aus dem Profil, nicht aus dem Gedächtnis**, und schreib
sie in den Laufzettel, wenn sie für die Einrichtung wichtig sind.

Fällt dir dabei etwas auf, das nicht zusammenpasst — ein Modell, das die Engine nicht laden
kann, ein Speicherbudget über der verbauten Ausstattung —, halt an und sag es. Solche
Widersprüche sind der häufigste Grund, warum eine Installation am Ende nicht antwortet.

## Wenn kein Gerät bekannt ist

Beim Anlegen einer Kundenakte ist oft noch offen, welches Gerät es wird. Das ist in
Ordnung. Trag nichts ein, was du nicht weißt, und plan das Gerät erst dann, wenn es
feststeht. Ein Angebot kann mit einer Gerätekategorie arbeiten, eine Einrichtung nicht.
