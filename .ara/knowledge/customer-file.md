# Verfahren: Kundenakte

> **Wann brauchst du das?** Bei `/customer`: anlegen, öffnen und pflegen einer Kundenakte.

## Aufbau

```
customers/mueller-metallbau/
├── customer.md                    Wer das ist, was er vorhat, wo es steht
├── devices/
│   └── zentrale/
│       ├── device.md              Ein Gerät: Typ, Netz, Zugang, Schnittstelle, Wartung
│       ├── runsheet.md            Ablaufzustand der Einrichtung (bei /device)
│       ├── handover.md            Abnahmedokument (am Ende von /device)
│       └── reports/
│           └── JJJJ-MM-TT-wartung.md   Wartungsberichte (bei /maintain)
├── documents/
│   └── JJJJ-MM-TT-angebot.md      Das Papier: Angebot, Anlagen, Protokolle
└── history/
    └── JJJJ-MM-TT-thema.md        Gespräche, Störungen, Wartungen
```

**Nachsehen, statt die Akte zu lesen.** Was hier verteilt liegt, sammelt ein Werkzeug an
einer Stelle:

```
node .ara/tools/customer.mjs                          welche Kunden es gibt
node .ara/tools/customer.mjs --customer mueller       Lagebild eines Kunden
node .ara/tools/customer.mjs --customer mueller --json
```

Es liest nur, außer mit `--new`. Es urteilt nicht über den Kunden und schreibt nichts in
seine Akte: was besprochen wurde, gehört in den Verlauf, und der Stand wandert von Hand
ins Frontmatter.

**`documents/` gegen `history/`:** In `documents/` liegt das Papier, das der Kunde
bekommt, Markdown und PDF nebeneinander. In `history/` steht, was passiert ist, auch dass
ein Angebot rausgegangen ist. Das eine wird unterschrieben, das andere gelesen.
Verfahren: `.ara/knowledge/paperwork.md`.

**Ordnername:** sprechend, klein, mit Bindestrichen, ohne Rechtsform.
`mueller-metallbau`, nicht `Müller Metallbau GmbH` und nicht `kunde-01`.
Die vollständige Firmierung steht im Frontmatter unter `legal_name`.

**Die eigenen Geräte des Partners** (Vorführung, Übung, eigener Betrieb) gehören keinem
Kunden und liegen darum nicht hier, sondern unter `devices/<gerät>/`, wie beim
Unternehmen. Kein Scheinkunde dafür: ein erfundener Kunde verfälscht jede Auswertung,
jede Agenda und jede Antwort auf „wie steht mein Geschäft". Angelegt werden sie mit
`/device <gerät>`, angesprochen ohne `--customer`:

```
node .ara/tools/device.mjs --name orin
node .ara/tools/remote.mjs --device orin --check
```

Verfahren: `.ara/knowledge/device.md`.

## Anlegen

Prüf zuerst, ob es die Akte schon gibt, auch unter ähnlichem Namen. Wenn ja: öffnen.

**Vor dem Fragen: nachsehen.** Wenn eine Website genannt wird oder du sie findest, lies
sie. Branche, Größe, Standorte, Ansprechpartner, das steht meist öffentlich da. Frag
nicht nach, was du lesen kannst.

Dann **eine** Interview-Runde mit gebündelten Fragen:

1. **Ansprechpartner.** Name, Rolle, wie erreichbar.
2. **Wer entscheidet.** Wer unterschreibt, wer nutzt es, wer kann es verhindern. Bei
   kleinen Firmen oft dieselbe Person, dann steht genau das da.
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

```
node .ara/tools/customer.mjs --customer <ordnername> --new --legal-name "<Firmierung>"
```

Das legt `customer.md` aus der Vorlage an, dazu `history/` und `documents/`, und setzt
`id`, `status`, `created` und `last_contact`. Gibt es schon eine Akte mit ähnlichem
Namen, hört es auf und nennt sie: derselbe Kunde ein zweites Mal ist der häufigste Weg zu
zwei halben Akten. Ist es wirklich ein anderer, geht es mit `--force`.

Danach von Hand, aus dem Gespräch:

- **Das Frontmatter füllen** und den Freitext in eigenen Worten schreiben, lesbar, nicht
  als Stichpunktliste der Interviewantworten.
- `history/JJJJ-MM-TT-erstgespraech.md` mit dem, was besprochen wurde. Auch wenn es kurz
  ist: der erste Eintrag setzt den Rahmen.
- `devices/<name>/device.md` **nur wenn schon klar ist, welches Gerät es wird**, und
  angelegt wird es mit `/device <kunde>/<gerät>`, nicht von Hand. Sonst gar nicht: ein
  leerer Geräteordner suggeriert einen Stand, den es nicht gibt.

Danach in drei Zeilen: was angelegt wurde, was noch fehlt, was der nächste Schritt ist.

## Öffnen

```
node .ara/tools/customer.mjs --customer <name>
```

Das ist deine Grundlage, nicht dein Text. **Nicht vorlesen.** Gib ein Lagebild:

- wer das ist, in einer Zeile
- wo es steht (Status, letzter Kontakt, wie lange her)
- welche Geräte es gibt und in welchem Zustand
- was ansteht (Wiedervorlage, Wartungsende, unterbrochene Einrichtung, fehlendes Papier)

Dann fragen, was zu tun ist. Kein Vorschlagskatalog.

## Der Kunde und seine Geräte

Ein Kundengerät liegt unter `customers/<kunde>/devices/<gerät>/`. Was in seiner Akte
steht, entscheidet, ob das Kit es überhaupt ansprechen kann:

| Feld | Wofür |
|---|---|
| `address` | die Adresse im Kundennetz, darüber läuft SSH |
| `api_base` | die Schnittstelle, wenn sie woanders liegt als der SSH-Zugang, etwa hinter einem Tunnel |
| `tls` | `selfsigned`, wenn das Gerät ein selbst ausgestelltes Zertifikat trägt |
| `api_key_ref` | der Name des Kit-Schlüssels in der Geheimnis-Ablage, nie sein Wert |
| `maintenance_until` | Ende des Wartungsvertrags, daraus wird die Wiedervorlage |

**Was das Werkzeug dazu ausgibt, ist eine Aussage über die Akte und keine über das
Gerät.** Ob es antwortet, wie es ihm geht und welche Apps darauf stehen, sagt das Gerät
selbst: `/maintain <kunde>/<gerät>`.

Ein Gerät ohne `api_key_ref` kann keine App bekommen, und eines mit einem Namen, hinter
dem kein Eintrag in der Ablage steht, auch nicht. Beides fällt im Lagebild auf, bevor der
erste Deploy daran scheitert.

## Pflegen

Nach **jedem** Kontakt drei Dinge, das ist die Minute, die den Unterschied macht:

1. Eintrag unter `history/` (Vorlage: `.ara/templates/history-entry.md`)
2. `last_contact` aktualisieren
3. `follow_up` setzen oder `status` ändern

Ändert sich etwas Grundlegendes (Ansprechpartner, Firmierung), pflege es im Frontmatter,
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
