# Verfahren: Kundenakte

> **Wann brauchst du das?** Bei `/customer` — anlegen, öffnen und pflegen einer Kundenakte.

## Aufbau

```
customers/mueller-metallbau/
├── customer.md                    Wer das ist, was er vorhat, wo es steht
├── devices/
│   └── zentrale/
│       ├── device.md              Ein Gerät: Typ, Netz, Zugang, Wartung
│       ├── runsheet.md            Ablaufzustand der Einrichtung (bei /setup)
│       └── handover.md            Abnahmedokument (am Ende von /setup)
└── history/
    └── JJJJ-MM-TT-thema.md        Gespräche, Angebote, Störungen, Wartungen
```

**Ordnername:** sprechend, klein, mit Bindestrichen, ohne Rechtsform.
`mueller-metallbau`, nicht `Müller Metallbau GmbH` und nicht `kunde-01`.
Die vollständige Firmierung steht im Frontmatter unter `legal_name`.

**Gerätename:** nach Standort oder Rolle, nicht nach Modell. `zentrale`, `werk2`,
`praxis-eg` — nicht `spark` oder `thor`. Das Modell steht in der Akte und kann sich ändern,
der Standort bleibt.

## Anlegen

Prüf zuerst, ob es die Akte schon gibt — auch unter ähnlichem Namen. Wenn ja: öffnen.

**Vor dem Fragen: nachsehen.** Wenn eine Website genannt wird oder du sie findest, lies
sie. Branche, Größe, Standorte, Ansprechpartner — das steht meist öffentlich da. Frag
nicht nach, was du lesen kannst.

Dann **eine** Interview-Runde mit gebündelten Fragen:

1. **Ansprechpartner.** Name, Rolle, wie erreichbar.
2. **Wer entscheidet.** Wer unterschreibt, wer nutzt es, wer kann es verhindern. Bei
   kleinen Firmen oft dieselbe Person — dann steht genau das da.
3. **Was sie vorhaben.** In ihren Worten, ein bis zwei Sätze. Das ist später die Grundlage
   für Abnahme und Schulung.
4. **Stand.** Erstgespräch, Angebot draußen, beauftragt, Gerät schon da?
5. **Gerät.** Schon klar, welches? Bestellt, geliefert, aufgebaut?
6. **Ort und Netz.** Wo soll es stehen, wer betreut dort das Netzwerk?
7. **Besonderheiten.** Branche mit besonderen Anforderungen (Kanzlei, Praxis, Behörde)?
   Bestehende IT-Betreuung, mit der man sich abstimmen muss?

Frag nur, was du brauchst. Bei einem frühen Interessenten reichen die ersten vier Punkte.
Ein leeres Feld ist besser als eine erfundene Antwort.

**Am Ende der Runde immer:** Wann willst du dich wieder melden, und worum geht es dann?
→ `follow_up` und `follow_up_note`. Ein Gespräch ohne nächsten Termin ist ein Kunde, den
man in drei Monaten vergessen hat (`.ara/knowledge/crm.md`).

## Anlegen: was du schreibst

- `customer.md` aus `.ara/templates/customer.md`. Frontmatter vollständig, Freitext in
  eigenen Worten und lesbar — nicht als Stichpunktliste der Interviewantworten.
- `history/JJJJ-MM-TT-erstgespraech.md` mit dem, was besprochen wurde. Auch wenn es kurz
  ist: der erste Eintrag setzt den Rahmen.
- `devices/<name>/device.md` **nur wenn schon klar ist, welches Gerät es wird.** Sonst
  nicht — ein leerer Geräteordner suggeriert einen Stand, den es nicht gibt.

Danach in drei Zeilen: was angelegt wurde, was noch fehlt, was der nächste Schritt ist.

## Öffnen

Nicht alles vorlesen. Gib ein Lagebild:

- wer das ist, in einer Zeile
- wo es steht (Status, letzter Kontakt, wie lange her)
- welche Geräte es gibt und in welchem Zustand (Laufzettel lesen, nicht raten)
- was ansteht (Wiedervorlage, Wartungsende)

Dann fragen, was zu tun ist. Kein Vorschlagskatalog.

## Pflegen

Nach **jedem** Kontakt drei Dinge — das ist die Minute, die den Unterschied macht:

1. Eintrag unter `history/` (Vorlage: `.ara/templates/history-entry.md`)
2. `last_contact` aktualisieren
3. `follow_up` setzen oder `status` ändern

Ändert sich etwas Grundlegendes (Ansprechpartner, Firmierung), pflege es im Frontmatter —
nicht nur im Verlaufseintrag.

**Wenn ein Ordner umbenannt wird**, zieh die Verweise nach. Die `id` bleibt unverändert,
damit ältere Dokumente ihren Bezug behalten.

## Was nicht in die Akte gehört

- **Passwörter und Token.** Die gehören in die Geheimnis-Ablage
  (`node .ara/tools/secrets.mjs`). In der Geräteakte steht unter `secret_ref` nur, unter
  welchem Namen das Geheimnis abgelegt ist.
- **Ungeprüfte Produktwerte.** Modellnamen, Ports und Versionen erst eintragen, wenn sie
  vom Gerät bestätigt sind (`.ara/knowledge/live-knowledge.md`).
- **Kundendaten vom Gerät.** Dokumente, Chatverläufe und Datenbankinhalte bleiben beim
  Kunden.
