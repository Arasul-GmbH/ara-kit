# Live-Wissen: woher Werte kommen

> **Wann brauchst du das?** Immer wenn du etwas Konkretes über das Produkt sagen, prüfen oder
> ausführen willst. Modelle, Ports, Befehle, Pfade, Geräteprofile, Versionen.

## Warum es diese Regel gibt

Das Produkt `arasul-jet` entwickelt sich schnell. Modelle, Engines, Geräteprofile und
Befehle haben sich in wenigen Wochen mehrfach geändert. Ein Kit, das solche Werte als Text
mitliefert, ist am Tag seiner Auslieferung falsch, und dann liest jemand sie vor einem
Kunden vor.

Deshalb: **Das Kit weiß, wie man vorgeht. Das Produkt weiß, was gilt.**

## Quelle 1: Der Kontrakt des Geräts

Alles, was zwischen Kit und Produkt **vereinbart** ist, sagt das Gerät selbst:

```
node .ara/tools/app.mjs --device <gerät> --contract
```

Von dort kommen das Schema für `app.json`, die Regeln, die kein Schema trägt, der Kopf
einer Flow-Datei, die Namen der Kopfzeilen, die Grenzen eines Pakets, die Pfade unter
`/apps/` und die Liste der Endpunkte mit dem Bereich, den jeder verlangt. Dazu die
**Kontraktversion**: die Zahl, an der das Kit merkt, dass es zu diesem Gerät nicht passt.

**Das Kit schreibt keinen dieser Werte mit.** Es liest sie je Gerät. Zwei Nachbauten
desselben Vertrags laufen auseinander, und die Frage ist nur, wann es jemand merkt.
Verfahren: `.ara/knowledge/deploy.md` für den Weg eines Pakets,
`.ara/knowledge/platform-services.md` für die Dienste, die eine App dort vorfindet.

**Die Verfahren nennen Routen, und das ist Absicht.** Ein Blatt, das keine nennt, kann
niemand gegen ein Gerät halten. Geprüft werden sie mit
`node .ara/tools/check-docs.mjs --device <gerät>`: es liest jede Route aus dem Wissen,
hält sie gegen die Endpunktliste des Kontrakts und fragt am Gerät nach. Was dort fehlt,
sagt es mit einem Satz je Route.

## Quelle 2: Das Gerät

Sobald ein Gerät per SSH erreichbar ist, ist es die genauere Quelle, es sagt dir, was
dort **tatsächlich** läuft, nicht was vorgesehen war.

Frag das Gerät, statt aus dem Spiegel abzuleiten, wenn es um dieses eine Gerät geht:
welche Plattform erkannt wurde, welches Profil gilt, welche Dienste laufen, welches Modell
geladen ist, welche Version installiert ist. Die passenden Befehle stehen im Artefakt
(Kommandozeilenwerkzeug im Wurzelverzeichnis, Abschnitt Hilfe). Lies sie dort nach, statt
sie auswendig zu verwenden.

## Quelle 3: Der Spiegel, also das Artefakt

Unter `.ara/mirror/` liegt das Installationsartefakt: das, was `arasul.de/api/download`
mit dem Token ausgeliefert hat, samt Stand und Quelle in `STATE.json`.

```
node .ara/tools/mirror.mjs --show      # was liegt da, von wann, aus welcher Quelle
node .ara/tools/mirror.mjs --docs      # welche Anleitungen kamen mit
node .ara/tools/mirror.mjs --refresh   # neu holen
```

**Er entsteht bei der Installation** (`/device` mit `--install arasul`) und sonst nicht.
Ohne Token kein Artefakt, dann sagst du das und arbeitest ohne Produktaussagen weiter.

Was du dort nachschlägst:

| Frage | Wo im Artefakt |
|---|---|
| Welche Geräte kennt das Produkt, mit welchen Eckdaten? | `config/platforms/*.json` |
| Womit wird installiert, und wie heißt der Einstiegspunkt? | `arasul-release.json` |
| Wie läuft die Einrichtung ab, welche Schritte gibt es? | `scripts/` und die Kommandozeilenwerkzeuge im Wurzelverzeichnis |
| Was sagt die Produktdokumentation? | `docs/`, aufgelistet von `mirror.mjs --docs` |
| Wie legt man einen Mitarbeiter an, wie gibt man eine App frei? | Admin-Handbuch und API-Referenz, beide unter `docs/` |
| Welcher Stand ist das, woher kommt er? | `.ara/mirror/STATE.json` |

**Vorsicht bei `docs/`:** Die Produktdokumentation ist an manchen Stellen älter als der
Code. Wenn Dokumentation und Skript sich widersprechen, gilt das Skript. Sag dem Menschen,
wenn dir so ein Widerspruch auffällt, das ist eine nützliche Rückmeldung ans Produktteam.

Steht ein Gerät zur Verfügung, ist es die genauere Quelle. Das Artefakt sagt, was
ausgeliefert wurde, das Gerät sagt, was dort läuft.

## Quelle 4: Gibt es nicht

Es gibt keine vierte Quelle. Insbesondere:

- **Nicht dein Gedächtnis.** Auch wenn du sicher bist.
- **Nicht eine ältere Notiz im Kit** oder in einem Kundenordner. Notizen halten fest, was
  damals war.
- **Nicht das Internet.** Öffentliche Anleitungen beschreiben andere Systeme.

## Wenn keine Quelle verfügbar ist

Sag es klar und biete an, was ohne geht:

> „Für den Modellnamen brauche ich Zugriff auf das Gerät oder das Artefakt. Ich habe
> gerade beides nicht. Wir können die Akte fertig machen und das nachziehen, sobald das
> Gerät erreichbar ist."

Schreib niemals einen ungeprüften Wert in eine Kundendatei. Eine Lücke mit Vermerk ist
besser als eine Zahl, der jemand glaubt.

## Was das Kit stattdessen weiß

Verfahren. Reihenfolgen. Was vor was kommt und warum. Woran man erkennt, dass ein Schritt
wirklich funktioniert hat. Welche Fehler häufig passieren und wie man sie feststellt. Was
in einer Abnahme nachgewiesen sein muss. Das ändert sich langsam. Werte ändern sich
schnell.
