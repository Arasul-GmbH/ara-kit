# Verfahren: Kundenakte

> **Wann brauchst du das?** Bei `/customer` — anlegen, öffnen und pflegen einer Kundenakte.

## Aufbau

```
kunden/mueller-metallbau/
├── kunde.md                       Wer das ist, was er vorhat, wo es steht
├── geraete/
│   └── zentrale/
│       ├── geraet.md              Ein Gerät: Typ, Netz, Zugang, Lizenz
│       ├── laufzettel.md          Ablaufzustand der Einrichtung (entsteht bei /setup)
│       └── abnahme.md             Übergabedokument (entsteht am Ende von /setup)
└── verlauf/
    └── JJJJ-MM-TT-thema.md        Gespräche, Angebote, Störungen, Wartungen
```

**Ordnername:** sprechend, klein, mit Bindestrichen, ohne Rechtsform.
`mueller-metallbau`, nicht `Müller Metallbau GmbH` und nicht `kunde-01`.
Die vollständige Firmierung steht im Frontmatter.

**Gerätename:** nach Standort oder Rolle, nicht nach Modell. `zentrale`, `werk2`,
`praxis-eg` — nicht `spark` oder `thor`. Das Modell steht in der Akte und kann sich ändern,
der Standort bleibt.

## Anlegen

Prüf zuerst, ob es die Akte schon gibt — auch unter ähnlichem Namen. Wenn ja: öffnen statt
anlegen.

**Vor dem Fragen: nachsehen.** Wenn eine Website genannt wird oder du sie findest, lies sie.
Branche, Größe, Standorte, Ansprechpartner, worum es der Firma geht — das steht meist
öffentlich da. Frag nicht nach, was du lesen kannst.

Dann **eine** Interview-Runde mit gebündelten Fragen:

1. **Ansprechpartner.** Name, Rolle, wie erreichbar. Wer entscheidet, wer macht auf.
2. **Was sie vorhaben.** Wofür wollen sie das Gerät? In eigenen Worten, ein bis zwei Sätze.
   Das ist später die Grundlage für Abnahme und Schulung.
3. **Stand.** Erstgespräch, Angebot draußen, beauftragt, Gerät schon da?
4. **Gerät.** Ist schon klar, welches Gerät es wird? Ist es bestellt, geliefert, aufgebaut?
5. **Ort und Netz.** Wo soll es stehen? Wer betreut dort das Netzwerk? Gibt es dort jemanden
   für technische Rückfragen?
6. **Besonderheiten.** Branche mit besonderen Anforderungen (Kanzlei, Praxis, Behörde)?
   Bestehende IT-Betreuung, mit der man sich abstimmen muss?

Frag nur, was du brauchst. Bei einem frühen Interessenten reichen die ersten drei Punkte —
den Rest holst du, wenn es konkret wird. Ein leeres Feld ist besser als eine erfundene
Antwort.

## Anlegen: was du schreibst

- `kunde.md` aus `.ara/vorlagen/kunde.md`, Frontmatter vollständig ausgefüllt, Freitext in
  eigenen Worten und lesbar — nicht als Stichpunktliste der Interviewantworten.
- `verlauf/JJJJ-MM-TT-erstgespraech.md` mit dem, was besprochen wurde. Auch wenn es kurz
  ist: der erste Eintrag setzt den Rahmen.
- `geraete/<name>/geraet.md` **nur wenn schon klar ist, welches Gerät es wird.** Sonst
  nicht — ein leerer Geräteordner suggeriert einen Stand, den es nicht gibt.

Danach in drei Zeilen: was angelegt wurde, was noch fehlt, was der nächste Schritt ist.

## Öffnen

Bei `/customer <name>` mit bestehender Akte: nicht alles vorlesen. Gib ein Lagebild.

- wer das ist, in einer Zeile
- wo es steht (Status, letzter Kontakt, wie lange her)
- welche Geräte es gibt und in welchem Zustand (Laufzettel lesen, nicht raten)
- was offen ist oder ansteht

Dann frag, was ansteht. Kein Vorschlagskatalog.

## Pflegen

Alles, was passiert, kommt in den Verlauf: `verlauf/JJJJ-MM-TT-thema.md`. Ein Thema pro
Datei, sprechender Dateiname. Datum immer als `JJJJ-MM-TT`, damit die Sortierung stimmt.

Ändert sich etwas Grundlegendes (Status, Ansprechpartner, Firmierung), pflege es im
Frontmatter von `kunde.md` — nicht nur im Verlaufseintrag.

**Wenn ein Ordner umbenannt wird**, zieh die Verweise nach. Die `id` im Frontmatter bleibt
unverändert, damit ältere Dokumente ihren Bezug behalten.

## Was nicht in die Akte gehört

- **Passwörter und Token.** Die gehören in die `.env`. In der Geräteakte steht nur, unter
  welchem Namen das Geheimnis abgelegt ist.
- **Ungeprüfte Produktwerte.** Modellnamen, Ports und Versionen erst eintragen, wenn sie
  vom Gerät bestätigt sind (`.ara/wissen/live-wissen.md`).
- **Kundendaten vom Gerät.** Dokumente, Chatverläufe und Datenbankinhalte des Kunden bleiben
  beim Kunden.
