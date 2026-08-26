# Verfahren: Kundenpflege

> **Wann brauchst du das?** Wenn jemand fragt „was steht an", wenn ein Kontakt oder ein
> Vertrag nachgehalten werden soll, und nach jedem Gespräch mit einem Kunden.

## Warum das hier steht

Ein Solo-Selbstständiger verliert Geschäft nicht durch schlechte Arbeit, sondern durch
Vergessen. Der Interessent, bei dem man im März nachfassen wollte. Die Wartung, die
ausgelaufen ist, bevor jemand sie verlängert hat. Beides sind Termine, die zwischen zwei
Kundenterminen untergehen.

Das Kit überwacht nichts von selbst (dazu müsste dauernd etwas laufen). Es antwortet aber
jederzeit auf die Frage, was ansteht:

```
node .ara/tools/agenda.mjs
node .ara/tools/agenda.mjs --days 30
```

**Stell diese Frage von dir aus**, wenn eine Sitzung ohne konkretes Anliegen beginnt oder
wenn jemand nach dem Stand seines Geschäfts fragt. Nicht bei jeder Gelegenheit, einmal
am Anfang genügt.

## Die vier Termine, die zählen

### 1. Wiedervorlage (`follow_up` in `customer.md`)

Immer wenn ein Gespräch ohne Abschluss endet, gehört ein Datum in die Akte. „Meldet sich
wieder" ist kein Zustand, sondern ein verlorener Kunde.

```
follow_up: 2026-09-15
follow_up_note: nach der Messe nachfassen, wollte intern klären
```

Der Halbsatz ist wichtiger als das Datum. In sechs Wochen weiß niemand mehr, worum es ging.

### 2. Wartungsvertrag (`maintenance_until` in `device.md`)

Die Verlängerung ist wiederkehrender Umsatz und der Grund, warum sich das Geschäft trägt.
Sie wird **vor** dem Ablauf besprochen, nicht danach, die Agenda meldet sie zwei Monate
vorher.

Ein Gerät im Betrieb ohne hinterlegte Laufzeit ist eine Lücke. Die Agenda weist darauf hin.

### 3. Eingeschlafener Kontakt (`last_contact`)

Bei laufenden Verkaufsvorgängen: Wer seit über drei Monaten nichts gehört hat, ist kein
Interessent mehr. Entweder nachfassen oder auf `inactive` setzen. Beides ist besser, als
eine Akte im Ungewissen zu lassen.

Pfleg `last_contact` nach jedem Gespräch mit. Das ist eine Zeile und macht die Agenda
brauchbar.

### 4. Unterbrochene Einrichtung

Ein Laufzettel im Zustand „unterbrochen" heißt: Bei einem Kunden steht ein halb
eingerichtetes Gerät. Das ist der dringendste Eintrag von allen.

## Der Lebenslauf eines Kunden

Der Status in `customer.md` bildet ab, wo jemand steht:

| Status | Bedeutung | Was als Nächstes zählt |
|---|---|---|
| `lead` | Interesse, nichts Konkretes | Wiedervorlage setzen |
| `quoted` | Angebot ist draußen | Nachfassdatum, Gültigkeit im Blick |
| `won` | Beauftragt | Termin planen, Gerät bestellen |
| `installed` | Läuft, Abnahme erfolgt | Wartungslaufzeit hinterlegen |
| `maintenance` | In Betreuung | Verlängerung, regelmäßiger Blick |
| `inactive` | Vorbei oder verloren | nichts, aber die Akte bleibt |

**Verlorene Kunden werden nicht gelöscht.** In zwei Jahren fragt jemand wieder an, und
dann ist die Historie mehr wert als jedes Angebot.

## Nach jedem Kundenkontakt

Drei Dinge, jedes Mal:

1. Eintrag unter `customers/<kunde>/history/JJJJ-MM-TT-thema.md`
2. `last_contact` aktualisieren
3. `follow_up` setzen oder den Status ändern

Das dauert eine Minute und ist der Unterschied zwischen einer Kundenakte und einem Ordner
voller Dateien.

## Gelerntes: `business/notes/`

Hierhin gehört, was **über einen Kunden hinaus** gilt und beim nächsten Angebot oder der
nächsten Einrichtung Zeit spart: welcher Einwand womit entkräftet wurde, wie lange ein
Gerätetyp beim ersten Mal wirklich gebraucht hat, welcher Lieferant liefert, welche
Pauschale zu knapp war. Eine Datei je Thema, `business/notes/<thema>.md`, ein Satz und ein
Datum genügen.

Nicht hierhin gehört, was zu **einem** Kunden gehört, denn das steht in seiner Akte, und
nichts, was aus dem Produkt kommt. Ein Modellname oder eine Fassungsnummer ist hier morgen
falsch und wird von hier aus abgeschrieben. Produktwerte kommen aus dem Spiegel oder vom
Gerät, siehe `.ara/knowledge/live-knowledge.md`.

Der Ordner gehört dem Partner und ist von der Versionskontrolle ausgenommen, wie alles
unter `business/`.

## Was das Kit nicht ist

Keine Buchhaltung, keine Rechnungsstellung, keine Zeiterfassung. Dafür haben die meisten
längst ein Werkzeug, und der Steuerberater will es ohnehin anders. Das Kit hält fest, was
mit Kunden und ihren Geräten passiert. Zahlen laufen woanders.
