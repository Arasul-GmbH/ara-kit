# Verfahren: das Prozessinterview und das Prozessblatt

> **Wann brauchst du das?** Bei `/process`, und immer dann, wenn jemand eine App will, aber noch
> nicht gesagt hat, wie die Arbeit heute läuft. Das Interview kommt vor `/app`: erst **wie die
> Arbeit läuft**, **welche Bildschirme** erst danach.

## Was es ist, in einfachen Worten

Ein **Prozessblatt** ist eine Seite, auf der das Haus sagt, wie ein Stück Arbeit heute läuft: wer
tut was, wann, mit welchem Papier, und wo jemand Ja oder Nein sagt. Es ist nicht der Wunsch nach
einer App. Bauen ist billig geworden, das Haus zu verstehen nicht, und diese Seite ist das
Verstehen. `/app` liest sie und fragt nicht noch einmal, was dort steht.

Es ist eine Markdown-Datei mit festen Abschnitten und liegt:

- **Partner:** `customers/<kunde>/processes/<kennung>.md`, ein Kunde nach dem anderen (`AGENTS.md`).
- **Unternehmen, oder das eigene Haus des Partners:** `business/processes/<kennung>.md`.

Die Kennung ist klein mit Bindestrichen (`urlaubsantrag`). Das Werkzeug, das Blätter anlegt,
prüft und liest, ist `node .ara/tools/process.mjs`, unten aufgeführt.

## Für wen das ist

Wer mit diesem Kit baut, ist meist Steuerfachangestellte oder Büroleiter, keine Beraterin.
Niemand wird nach „Anforderungen“ gefragt. Gefragt wird nach **dem letzten Mal**: daran erinnert
sich jeder, und ein wirklicher Fall trägt Schritte, die niemand in eine Liste schreiben würde.
Einfache Sprache (`AGENTS.md`): ein Fachwort bekommt beim ersten Mal einen Satz.

## Bevor du fragst: sieh nach

Lies, was da ist, statt es zu fragen: `business/profile.md` (Branche, Werkzeuge des Hauses), die
Kundenakte, eine Website, Unterlagen, die der Mensch dir gibt, `process.mjs --list` für Blätter,
die es schon gibt. Ein vorhandenes Blatt öffnest du, statt ein zweites für dieselbe Arbeit
anzulegen. **Ein Blatt ist ein Ablauf**: nennt der Mensch drei, schreibst du zuerst den, der am
meisten wehtut, und setzt die anderen unter „Offen“ als die nächsten.

## Was klar sein muss

Die Regel steht in `AGENTS.md`, „Every command asks to full depth“. Jeder Punkt unten ist beantwortet,
aus einer Datei lesbar oder offen, und **die Liste beendet das Interview, nicht eine Runde**.
Mindestens drei Runden mit Fragen, außer der Mensch will keine (siehe unten). Jeder Punkt landet in
seinem Abschnitt des Blattes.

| Punkt | Abschnitt | Was du fragst, als Entwurf und nicht als leere Frage |
| --- | --- | --- |
| **Welcher Ablauf, und was dabei herauskommt** | Ziel | „Das letzte Mal, als ein Urlaubsantrag kam: was lag am Ende da, und wer brauchte es?“ Entwürfe aus der Branche |
| **Was es anstößt, wie oft, wer es anstößt** | Auslöser | „Ein Papier kommt an, ein Datum rückt heran, jemand fragt?“ und „ungefähr wie viele pro Woche?“ |
| **Die Schritte, der Reihe nach, an einem wirklichen Fall** | Schritte | „Nimm den letzten Fall. Was war das Allererste, das geschah? Wer fasste es als Nächstes an?“ Ein Schritt ist eine Person, die eine Sache tut |
| **Wer jeden Schritt tut und wie schnell** | Schritte | Eine Rolle, kein Name. „Noch am selben Tag, oder wenn jemand dazu kommt?“ |
| **Welches Papier oder welche Datei jeder Schritt nutzt** | Schritte, Papiere | „Was lag auf dem Tisch, oder war am Bildschirm offen?“ Jedes genannte Papier bekommt eine Zeile bei den Papieren |
| **Was auf dem Papier steht, ob personenbezogene Daten darauf stehen, wo es heute liegt** | Papiere | Personenbezogenes ausdrücklich nennen. „Ordner im Büro, Postfach, Excel-Datei?“ |
| **Was das Gerät selbst vom Papier lesen soll, und was ein Mensch noch ändern darf** | Papiere | Nur bei einem Papier, das heute abgetippt oder von Hand abgelegt wird. Die oft falsch gelesenen Angaben als änderbar vorschlagen, **nie alle aus Gewohnheit** |
| **Wo jemand Ja oder Nein sagt, wer, worauf gestützt, und was bei Nein geschieht** | Entscheidungen | „Wer sieht es an, bevor es weitergeht? Was sieht er an? Und wenn die Antwort Nein ist?“ Ein Kurzname je Stufe, höchstens fünf. Niemand entscheidet ist eine Antwort |
| **Was schiefgeht oder abweicht** | Ausnahmen | „Das letzte Mal, als etwas nicht in den üblichen Weg passte: was geschah?“ „Keine bekannt“ ist eine Antwort |
| **Wer was sehen darf** | Wer sieht was | Alle alles, oder nur die eigenen Fälle, Mandanten, Abteilungen, und wer sie zuteilt |
| **Was es ausdrücklich nicht abdeckt** | Gehört nicht dazu | Der Absatz, der später die Enttäuschung erspart |
| **Was noch niemand sagen konnte** | Offen | Eine Zeile je Punkt, eine Stelle, an der jemand widersprechen darf |

Zwei Punkte fragst du nicht in „Anforderungs“-Worten, du liest sie aus den Schritten: **wie der
Start fürs Kit aussieht**, eines von `hand`, `zeitplan:<fünf Felder>`, `ereignis:<name>` (Zeile
„Startet durch“ im Blatt, vorgegeben `hand`), und **ob ein Mensch oder ein Programm einen Schritt
tut** (ein Schritt, der nur Daten verschiebt, ist ein Programm und kein Flow: das entscheidet
`/app`, du hältst nur fest, wer heute was tut).

## Wie du fragst

Über das Interview-Werkzeug, gebündelt, die freie Antwort immer offen (Persona, „How you ask“):

1. **Runde 1, der Fall und das Ziel:** welcher Ablauf, der letzte wirkliche Fall in zwei Sätzen,
   was herauskam, wie oft, was ihn anstößt.
2. **Runde 2, die Schritte:** den Fall Schritt für Schritt durchgehen. **Schlag die Schritte, die
   du gehört hast, als fertige Zeilen vor** („1 Sachbearbeiterin: tippt die Rechnung ab, mit der
   Rechnung, am selben Tag; 2 Teamleitung: ...“) und lass den Menschen verbessern, statt zu
   fragen „was sind die Schritte?“.
3. **Runde 3, Papiere und Entscheidungen:** je Papier, was darauf steht und wo es liegt, je
   Entscheidung wer und worauf gestützt, und was das Gerät lesen könnte.
4. **Runde 4, drumherum:** Ausnahmen, wer was sieht, was nicht dazugehört, was offen ist.

Eine vage Antwort fragst du mit einem Entwurf nach („jemand prüft es“ -> „Die Teamleitung, im
Vergleich mit dem Dienstplan, innerhalb von drei Tagen?“). **Rate nie** einen Schritt, eine Rolle
oder eine Zahl, um die Liste zu schließen.

**„genug“** im Freitext beendet das Interview sofort. Was offen ist, kommt als Zeile unter „Offen“,
und in den Abschnitt, in den es gehört, schreibst du „nicht gesagt, siehe Offen“, damit die
Prüfung kein Loch findet. Ein Preis, ein Produktwert oder eine Rechtstatsache wird nicht
angenommen.

**Keine Fragen gewünscht.** Gibt der Mensch Material (eine Beschreibung, Unterlagen, eine alte
Ablaufliste) und sagt, er will keine Fragen: schreib das Blatt daraus, kennzeichne jeden
erschlossenen Punkt unter „Offen“ mit „angenommen aus <Material>“, und sag es in einem Satz zu
Beginn.

## Das Blatt schreiben

```
node .ara/tools/process.mjs --new <kennung> [--customer <kunde>] [--title "<titel>"]
```

legt das Gerüst an. Ersetze jedes `<...>` durch das, was der Mensch gesagt hat, in seinen Worten
und in der Sprache des Hauses, mit echten Umlauten. Dann:

```
node .ara/tools/process.mjs --check <kennung> [--customer <kunde>]
node .ara/tools/process.mjs --derive <kennung> [--customer <kunde>]
```

`--check` sagt, was fehlt und wo, und hält an, solange sich keine App ableiten lässt: ein Schritt
ohne Person, ein Papier, das ein Schritt nennt und das bei den Papieren fehlt, eine Entscheidung
nach einem Schritt, den es nicht gibt, ein übrig gebliebener Platzhalter, eine Feldliste, die das
Gerät nicht nehmen kann. Schließ die Lücken, im Gespräch, wenn sie eine Antwort brauchen. `--derive`
zeigt, was das Blatt einer App gibt: Titel, Beschreibung in einer Zeile, Freigabestufen, zu lesende
Felder, welche änderbar sind, die Art des Flows, den Auslöser.

**Lies es in einfachen Worten zurück**, bevor du es für fertig erklärst, über das
Interview-Werkzeug: „So läuft es: ... Stimmt das? Was fehlt?“ Ein Blatt, das niemand bestätigt hat,
ist eine Vermutung. Beim Partner schreibst du auf, was du getan hast, in den Verlauf des Kunden;
beim Unternehmen ist das Blatt der Nachweis.

## Dann /app

Nenne den nächsten Schritt: `/app <app>`. `/app` ruft

```
node .ara/tools/app.mjs --app <app> --new --prozess <kennung> [--customer <kunde>]
```

auf, das Titel, Beschreibung, Freigabestufen, Felder, Auslöser und die Art des Flows aus dem Blatt
nimmt und den Plan vorbefüllt schreibt: wozu, wer es benutzt, welche Daten, die Schritte, den
Flow-Entwurf, wo ein Mensch entscheidet, was nicht dazugehört, die Annahmen (jede Zeile unter
„Offen“ und jede Ausnahme). Was das Blatt nicht sagt, fragt `/app`: Bildschirme, Formulare, Buttons,
die drei Fragen zu Rollen, Verbindungen nach außen und Modellen. Siehe `.ara/knowledge/app.de.md`,
„Zuerst kommt ein Prozessblatt“.

## Was du nicht tust

Keine App, kein Bildschirm und kein Feld eines Formulars im Interview: das ist `/app`. Kein Wunsch
im Ablauf: „eine App für Urlaub“ ist ein Wunsch, „eine Sachbearbeiterin tippt den Zettel in eine
Liste“ ist der Ablauf. Kein Produktwert (ein Port, ein Modellname) in einem Blatt: es geht um das
Haus, nicht um das Gerät.

## Das Werkzeug

```
node .ara/tools/process.mjs --new <kennung> [--customer <k>] [--title "<t>"]   Gerüst
node .ara/tools/process.mjs --list [--customer <k>]                           Blätter, und ob /app daraus bauen kann
node .ara/tools/process.mjs --check <kennung> [--customer <k>] [--json]       was fehlt, wo
node .ara/tools/process.mjs --derive <kennung> [--customer <k>] [--json]      was eine App daraus nimmt
```

Eine `<kennung>` kann auch ein Pfad zu einer Datei sein. Das Blatt wird in beiden Sprachen
gelesen: seine Abschnittsüberschriften gibt es englisch und deutsch, die Datei behält die Sprache,
in der sie geschrieben wurde.
