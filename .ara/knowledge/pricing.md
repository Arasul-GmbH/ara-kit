# Verfahren: Kalkulation

> **Wann brauchst du das?** Wenn jemand wissen will, was etwas kostet, für den Kunden oder
> für den Partner selbst.

## Woher die Zahlen kommen

**Nicht aus dem Kit.** Preise ändern sich, und ein falscher Preis in einem Angebot ist
teurer als eine Rückfrage.

| Was | Wo es steht |
|---|---|
| Einkaufspreise (Lizenz, Wartung, Hardware) | Partnerportal, der Partner sieht seine eigenen |
| Die eigenen Sätze des Partners | `business/company.md`, Kalkulationsblatt |
| Was dieser Kunde braucht | `customers/<k>/customer.md` |

Fehlt eine Zahl im Kalkulationsblatt, wird sie **einmal** nachgetragen und nicht bei
jeder Kalkulation neu erfragt. Dafür gibt es `/kalkulation`.

Kennst du einen Einkaufspreis nicht, sag das und lass ihn dir nennen. Rate nicht, und
übernimm keine Zahl aus einem alten Angebot als aktuellen Preis.

## Das Kalkulationsblatt

Ein vollständiges Angebot braucht zehn Zahlen. Sie stehen in `business/company.md`, die
eigenen Sätze im Frontmatter, die Einkaufspreise in der Tabelle unter „Einkaufspreise".

| Zahl | Woher | Fehlt sie, geht nicht |
|---|---|---|
| Stundensatz | der Partner | die Kalkulation, weder Einrichtung noch Betreuung |
| Stunden für eine Ersteinrichtung | der Partner | eine gleichbleibende Einrichtungsposition |
| Aufschlag auf Hardware | der Partner | der Hardwarepreis |
| Eigene Betreuung, jährlich | der Partner | der laufende Posten, der das Geschäft trägt |
| Zahlungsziel | der Partner | das Angebot, es steht im Briefkopf |
| Anfahrt | der Partner | sie fällt beim Rechnen unter den Tisch |
| Mindestpauschale | der Partner | kleine Aufträge gehen unter Wert raus |
| Einkauf Lizenz, einmalig | Partnerportal | die Lizenzposition |
| Einkauf Wartung, jährlich | Partnerportal | Wartung Jahr 1 und ab Jahr 2 |
| Einkauf Hardware, je Typ | Partnerportal | Hardwarepreis und Marge |

Was liegt vor und was fehlt:

```
node .ara/tools/calculation.mjs
node .ara/tools/calculation.mjs --json
```

Das Werkzeug liest nur, es trägt nichts ein. Es meldet jede fehlende Zahl **einzeln mit
ihrer Folge**, und es meldet, welcher Stand alt geworden ist. Ruf es auf, bevor du
rechnest, statt dich zu erinnern, was hinterlegt war.

**Jede Zahl trägt ein Stand-Datum.** Die eigenen Sätze zusammen unter `rates_asof`, jeder
Einkaufspreis in seiner Zeile. Ohne Datum lässt sich später nicht sagen, ob eine Zahl noch
gilt, und genau das ist bei Preisen die einzige Frage, die zählt. Zwei Fristen, danach
meldet das Werkzeug „nachsehen":

- **Einkaufspreise nach sechs Monaten.** Es sind Arasuls Zahlen, sie ändern sich, und der
  Partner erfährt es nicht von allein.
- **Eigene Sätze nach einem Jahr.** Wer seinen Stundensatz drei Jahre nicht angefasst hat,
  arbeitet mit dem Satz von vorgestern.

## Das Verfahren `/kalkulation`

Das Blatt pflegen, getrennt vom Onboarding. Zwei Runden, jede gebündelt im
Interview-Werkzeug, jede mit einer offenen Möglichkeit.

1. **Erst nachsehen, dann fragen.** `node .ara/tools/calculation.mjs`. Was schon
   dasteht, wird nicht erfragt, sondern zur Bestätigung vorgelesen. Frag nur nach dem,
   was fehlt oder alt ist.

2. **Die eigenen Sätze**, in einer Runde. Sie kennt der Partner auswendig, dafür muss er
   nirgends nachsehen. Sag dazu, wozu jede dient, sonst wirkt es wie ein Formular.
   Danach `rates_asof` auf heute.

3. **Die Einkaufspreise**, in einer zweiten Runde. Sie stehen im Partnerportal, dafür
   muss er nachsehen. Hat er das Portal gerade nicht zur Hand, ist das in Ordnung: die
   eigenen Sätze bleiben trotzdem eingetragen, und du sagst am Ende, was deshalb noch
   nicht geht. Eine Zeile je Hardwaretyp, den er anbietet. **Rate keinen Einkaufspreis
   und übernimm keinen aus einem alten Angebot.**

4. **Eintragen, mit Datum.** Jede Zahl in `business/company.md`, jeder Einkaufspreis mit
   dem Datum, an dem er im Portal stand, nicht mit dem heutigen, wenn er von gestern ist.

5. **Noch einmal melden.** `node .ara/tools/calculation.mjs`, und dann in zwei bis drei
   Zeilen: was jetzt liegt, was noch fehlt und was deshalb nicht geht. Konkret, nicht
   „einiges fehlt noch".

**Die Einkaufspreise bleiben in `business/company.md`.** Sie gehen in keine Kundendatei,
in kein Angebot und in keinen Verlaufseintrag, auch nicht als Zwischensumme, aus der sich
die Marge zurückrechnen lässt. Die Marge des Partners ist seine Sache.

## Die Posten

Ein vollständiges Angebot besteht aus vier Teilen. Fehlt einer, wird nachverhandelt, und
das immer zu Lasten des Partners.

1. **Hardware.** Einkauf plus Aufschlag. Lieferzeit nennen, sie ist bei dieser Art Gerät
   oft der bestimmende Faktor.
2. **Lizenz.** Einmalig, Einkauf plus Marge.
3. **Einrichtung.** Stunden mal Satz, und die Stundenzahl kommt aus `setup_hours` im
   Kalkulationsblatt, nicht aus einer frischen Schätzung. Sonst kommen zwei Angebote für
   denselben Gerätetyp auf verschiedene Zahlen, und keine davon lässt sich begründen.
   Sei ehrlich: eine Ersteinrichtung an einem Gerätetyp, den man zum ersten Mal aufsetzt,
   dauert länger als die zweite. Wer das nicht einpreist, arbeitet den ersten Kunden
   umsonst. Hat der Partner für diesen Fall eine eigene Regel, steht sie unter „Notizen
   zur Kalkulation".
4. **Laufendes.** Wartung des Produkts plus die eigene Betreuung (`care_yearly`). Das ist
   der Teil, der das Geschäft trägt, er gehört ins erste Angebot, nicht in ein späteres
   Gespräch.

Dazu, wenn zutreffend: Anfahrt (`travel`), Schulung, Erweiterungen, Datenübernahme. Und
was am Ende unter der Mindestpauschale (`minimum_fee`) landet, wird zur Pauschale, nicht
zum Freundschaftspreis.

## Wie du rechnest

- **Netto rechnen**, Umsatzsteuer am Ende ausweisen.
- **Aufwand ehrlich schätzen**, nicht optimistisch. Ein zweiter Termin, den niemand bezahlt,
  kostet mehr als eine offene Position.
- **Bandbreite statt Scheingenauigkeit**, solange etwas unklar ist. „Zwischen X und Y, je
  nachdem ob das Netz vorbereitet ist" ist ehrlicher als eine exakte Zahl, die nicht hält.
- **Wiederkehrendes getrennt ausweisen** von einmaligem. Der Kunde muss beides sehen.

## Was du dazusagst

Bei der Zahl bleibt es nicht. Zwei Dinge gehören dazu:

- **Was nicht enthalten ist.** Erweiterungen, Datenübernahme, Schulung über das
  Vereinbarte hinaus.
- **Woran der Preis hängt.** Wenn das Kundennetz nicht vorbereitet ist oder das Gerät ein
  Typ ist, mit dem noch niemand gearbeitet hat, wird es aufwendiger. Das gehört vorher
  gesagt.

## Für den Partner selbst

Manchmal ist die Frage nicht „was kostet das den Kunden", sondern „was bleibt bei mir
hängen". Dann rechne die Marge und den Stundenertrag aus. Einkauf gegen Verkauf, Aufwand
gegen Satz. Wenn dabei etwas herauskommt, das sich nicht lohnt, sag es. Ein Auftrag, der
sich nicht rechnet, ist kein Erfolg.

Die Einkaufspreise sind vertraulich. Sie gehören in eine interne Rechnung, nie in ein
Kundenangebot.
