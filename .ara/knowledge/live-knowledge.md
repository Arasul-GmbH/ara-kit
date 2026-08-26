# Live-Wissen: woher Werte kommen

> **Wann brauchst du das?** Immer wenn du etwas Konkretes über das Produkt sagen, prüfen oder
> ausführen willst. Modelle, Ports, Befehle, Pfade, Geräteprofile, Versionen.

## Warum es diese Regel gibt

Das Produkt `arasul-jet` entwickelt sich schnell. Modelle, Engines, Geräteprofile und
Befehle haben sich in wenigen Wochen mehrfach geändert. Ein Kit, das solche Werte als Text
mitliefert, ist am Tag seiner Auslieferung falsch, und dann liest jemand sie vor einem
Kunden vor.

Deshalb: **Das Kit weiß, wie man vorgeht. Das Produkt weiß, was gilt.**

## Quelle 1: Der Spiegel

Ein lokaler Zwischenspeicher des aktuellen Produktstands unter `.ara/mirror/`.

```
node .ara/tools/mirror.mjs          # holen, wenn nötig
node .ara/tools/mirror.mjs --show # nur nachsehen, wie alt er ist
node .ara/tools/mirror.mjs --refresh    # erzwingen
```

Er wird mit dem Lizenztoken aus der `.env` geholt. Ohne Token kein Spiegel, dann sagst du
das und arbeitest ohne Produktaussagen weiter.

Was du dort nachschlägst:

| Frage | Wo im Spiegel |
|---|---|
| Welche Geräte kennt das Produkt, mit welchen Eckdaten? | `config/platforms/*.json` |
| Wie läuft die Einrichtung ab, welche Schritte gibt es? | `scripts/` und die Kommandozeilenwerkzeuge im Wurzelverzeichnis |
| Was sagt die Produktdokumentation? | `docs/` |
| Welcher Stand ist das? | `.ara/mirror/STATE.json` |

**Vorsicht bei `docs/`:** Die Produktdokumentation ist an manchen Stellen älter als der
Code. Wenn Dokumentation und Skript sich widersprechen, gilt das Skript. Sag dem Menschen,
wenn dir so ein Widerspruch auffällt, das ist eine nützliche Rückmeldung ans Produktteam.

## Quelle 2: Das Gerät

Sobald ein Gerät per SSH erreichbar ist, ist es die genauere Quelle, es sagt dir, was
dort **tatsächlich** läuft, nicht was vorgesehen war.

Frag das Gerät, statt aus dem Spiegel abzuleiten, wenn es um dieses eine Gerät geht:
welche Plattform erkannt wurde, welches Profil gilt, welche Dienste laufen, welches Modell
geladen ist, welche Version installiert ist. Die passenden Befehle stehen im Spiegel
(Kommandozeilenwerkzeug im Wurzelverzeichnis, Abschnitt Hilfe). Lies sie dort nach, statt
sie auswendig zu verwenden.

## Quelle 3: Gibt es nicht

Es gibt keine dritte Quelle. Insbesondere:

- **Nicht dein Gedächtnis.** Auch wenn du sicher bist.
- **Nicht eine ältere Notiz im Kit** oder in einem Kundenordner. Notizen halten fest, was
  damals war.
- **Nicht das Internet.** Öffentliche Anleitungen beschreiben andere Systeme.

## Wenn keine Quelle verfügbar ist

Sag es klar und biete an, was ohne geht:

> „Für den Modellnamen brauche ich den Spiegel oder Zugriff auf das Gerät. Ich habe
> gerade beides nicht. Wir können die Akte fertig machen und das nachziehen, sobald du
> deinen Token eingetragen hast."

Schreib niemals einen ungeprüften Wert in eine Kundendatei. Eine Lücke mit Vermerk ist
besser als eine Zahl, der jemand glaubt.

## Was das Kit stattdessen weiß

Verfahren. Reihenfolgen. Was vor was kommt und warum. Woran man erkennt, dass ein Schritt
wirklich funktioniert hat. Welche Fehler häufig passieren und wie man sie feststellt. Was
in einer Abnahme nachgewiesen sein muss. Das ändert sich langsam. Werte ändern sich
schnell.
