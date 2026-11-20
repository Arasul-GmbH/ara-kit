# Der Nachweis des Ablaufs: was ein Paket über seinen eigenen Bau sagt

> **Wann brauchst du das?** Wenn eine App gebaut oder geändert wird (`/app`), wenn ein Paket wegen
> seines Nachweises nicht hinausgeht, und wenn du die Prüfung im Gerät (Karte J45) gegen dieses
> Blatt baust. Wer nur baut, braucht die ersten beiden Abschnitte.

Seit 20.11.2026 ist der App-Standard Pflicht: ein Gerät nimmt nur eine App an, die auf den
Bausteinen der Bibliothek steht, Tests mitbringt und über den festen Ablauf des Kits gebaut ist.
Das Kit hält sich schon jetzt daran, das Gerät prüft es künftig beim Ausrollen. Dafür trägt jedes
Paket eine Datei, `nachweis.json`, in seiner Wurzel neben `app.json`.

## Was ein Mensch tut

Nichts zusätzlich. Der Ablauf schreibt den Nachweis unterwegs:

| Schritt | Was geschieht | Der Nachweis bekommt |
|---|---|---|
| `interview` | Der Plan wird aktiv gesetzt: `--plan-aktiv <datei>` | Den Schritt, mit Name und Prüfsumme des Plans. Ein neuer Plan beginnt einen neuen Durchlauf und verwirft die früheren Schritte |
| `bau` | `--build` | Den Schritt, die Fassung der Bibliothek, die Prüfsummen von Quelle und Paket |
| `test` | `--build` lässt die Tests der App laufen, `--test` allein | Den Schritt und die Zahlen: Dateien, Fälle, grün oder nicht |
| `ausrollen-test` | `--deploy` in den Teststand | Den Schritt, nur in der Akte der App am Rechner. Ein Paket kann sein eigenes Ausrollen nicht enthalten |

**Jede spätere Änderung läuft noch einmal hindurch.** Eine Datei von Hand ändern und einspielen
geht nicht: die Prüfsumme des Quelltexts stimmt nicht mehr, das Kit sagt „Noch einmal bauen“, und
`--build` lässt die Tests laufen und schreibt den Nachweis neu. Auch bei roten Tests baut
`--build`: es schreibt den Nachweis mit dem roten Ergebnis, und das Paket geht erst hinaus, wenn
die Tests grün sind.

Wo eine App steht, fragst du so: `node .ara/tools/app.mjs --app <name> --nachweis`. Ein Ordner statt
einer App (`--nachweis <ordner>`) wird beurteilt, wie das Gerät das entpackte Paket beurteilte.

## Wo er liegt

- **Im Paket:** `nachweis.json` in der Wurzel, die Datei, die `--build` zuletzt schreibt.
- **Am Rechner:** dieselbe Datei in `apps/<name>/`, zu der jeder Schritt etwas fügt. Sie ist kein
  Quelltext: sie zählt weder in die Prüfsumme der Quelle noch in die des Pakets, und eine Änderung
  an ihr macht keinen Bau „älter als den Quelltext“.
- **Fremde Container** (kein `frontend` im Manifest, ein fertiges `image` statt eines eigenen Baus)
  bringen weder Quelltext noch Tests mit. Das Kit verlangt von ihnen keinen Nachweis. Ob das Gerät
  es tut, ist seine eigene Regel.

## Das Format, Schema 1

```json
{
  "schema": 1,
  "app": "urlaub",
  "version": "0.1.0",
  "kit": { "version": "0.85.0" },
  "bibliothek": { "marken": "5", "kopie": "5.6.1" },
  "schritte": [
    { "name": "interview", "zeit": "2026-11-20T10:50:31.683Z", "quelle": "sha256:<hex>", "plan": "2026-11-20-erster-plan.md", "plan_pruefsumme": "sha256:<hex>" },
    { "name": "bau", "zeit": "2026-11-20T10:51:19.008Z", "quelle": "sha256:<hex>" },
    { "name": "test", "zeit": "2026-11-20T10:51:19.274Z", "quelle": "sha256:<hex>", "vorhanden": true, "dateien": 1, "faelle": 6, "gruen": true }
  ],
  "inhalt": { "quelle": "sha256:<hex>", "dateien": 121, "paket": "sha256:<hex>" },
  "tests": { "vorhanden": true, "dateien": 1, "faelle": 6, "lauf": { "zeit": "2026-11-20T10:51:19.274Z", "gruen": true, "quelle": "sha256:<hex>" } },
  "siegel": "sha256:<hex>"
}
```

| Feld | Bedeutung |
|---|---|
| `schema` | Nummer des Formats. Dieses Blatt beschreibt 1. Eine andere Nummer: nicht raten, abweisen und es sagen |
| `app`, `version` | `id` und `version` der `app.json` beim Bau. Beide müssen zum Manifest im Paket passen |
| `kit.version` | Fassung des Kits, das gebaut hat (`.ara/VERSION`). Zur Auskunft; ein Gerät darf warnen, wenn sie älter ist als die, die es kennt |
| `bibliothek.marken` | Die Hauptzahl der Bibliothek, wie `app.json` sie in `marken` nennt. Muss dieselbe sein wie im Manifest |
| `bibliothek.kopie` | Ganze Fassung der Kopie unter `frontend/src/marken`, oder `null` ohne Kopie. Zur Auskunft |
| `schritte` | Die Schritte in der Reihenfolge `interview`, `bau`, `test`, je mit `zeit` (ISO 8601, UTC) und `quelle`. Die Zeiten fallen von Schritt zu Schritt nicht |
| `inhalt.quelle` | Prüfsumme des Quelltexts der App, siehe unten |
| `inhalt.paket` | Prüfsumme des Pakets, siehe unten. Nur in der Datei des Pakets selbst |
| `tests` | `vorhanden` mindestens eine Testdatei, `faelle` die gezählten Fälle, `lauf.gruen` der letzte Lauf, `lauf.quelle` der Stand, gegen den er lief |
| `siegel` | Prüfsumme über die Datei ohne dieses Feld, siehe unten |

### Wie die Prüfsummen entstehen

Jede Prüfsumme hat die Form `sha256:` und 64 Hexziffern.

- **Über eine Dateiliste:** für jede reguläre Datei ihr Pfad relativ zur Wurzel mit `/`, ein
  NUL-Byte, das SHA-256 ihrer Bytes als Hex und ein Zeilenvorschub. Die Liste nach Pfad als
  Zeichenketten sortiert (Code-Einheiten), die Zeilen aneinandergehängt, noch einmal mit SHA-256
  gehasht. Namen, die mit `._` beginnen, und `.DS_Store` zählen nirgends.
- **`inhalt.paket`:** jede Datei des Pakets, außer `nachweis.json` in der Wurzel und jedem Ordner
  namens `node_modules`. **Das Gerät bildet sie aus dem entpackten Paket** und vergleicht.
- **`inhalt.quelle`:** jede Datei des App-Ordners unter `apps/<name>/`, außer auf der obersten Ebene
  jedem Eintrag, der mit einem Punkt beginnt, und `plans`, `build`, `README.md`, `node_modules` und
  `nachweis.json`, und in jeder Tiefe `node_modules` und `dist`. Nur das Kit kann sie bilden, das
  Gerät sieht einen Bau und keinen Quelltext: darum trägt der Nachweis beide.
- **`siegel`:** das Dokument ohne `siegel` als kanonisches JSON (Schlüssel sortiert, keine Leerzeichen,
  Listen in ihrer Reihenfolge, einfache Werte so, wie `JSON.stringify` sie schreibt), SHA-256 über
  seine UTF-8-Bytes.
- **Tests:** `node --test` im Ordner, der Testdateien enthält (`*.test.mjs`, `.js`, `.cjs`), gelesen
  aus den TAP-Zeilen `# tests <n>` und `# fail <n>`. Ein Lauf, der keinen Fall zählt, ist nicht grün.

## Was die Prüfung im Gerät ansieht

In dieser Reihenfolge; die Codes sind die, die `--nachweis --json` in `funde[].code` zurückgibt.

| Code | Der Nachweis wird abgewiesen, wenn |
|---|---|
| `fehlt` | Es gibt keine `nachweis.json`: die App ist nicht über den Ablauf gebaut |
| `unlesbar` | Die Datei ist kein JSON-Objekt |
| `schema` | `schema` ist keine Nummer, die diese Prüfung kennt |
| `siegel` | `siegel` passt nicht zur Datei: jemand hat sie von Hand geändert |
| `kennung`, `version` | `app` oder `version` ist nicht die des Manifests: der Nachweis stammt von einer anderen App oder einem früheren Bau, eine kopierte Datei landet hier |
| `paket-fehlt` | `inhalt.paket` fehlt |
| `paket-geaendert` | `inhalt.paket` ist nicht die Prüfsumme des Pakets, wie es ankam: nach dem Bau wurde etwas geändert |
| `schritt-fehlt` | Einer von `interview`, `bau`, `test` fehlt |
| `reihenfolge` | Die Zeiten der drei Schritte fallen |
| `tests-fehlen` | `tests.vorhanden` ist falsch oder kein Fall gezählt |
| `tests-rot` | `tests.lauf.gruen` ist falsch |
| `tests-veraltet` | `tests.lauf.quelle` ist nicht `inhalt.quelle`: die Tests liefen gegen einen anderen Stand |
| `bau-veraltet` | Der Schritt `bau` steht auf einem anderen Quelltext als der Nachweis |
| `bibliothek` | `bibliothek.marken` ist nicht das `marken` des Manifests |

Am Rechner (`--nachweis` ohne Ordner und vor jedem `--deploy` aus `apps/`) kommen zwei Fälle aus
dem Quelltext dazu: `quelle-geaendert` (`inhalt.quelle` ist nicht die Prüfsumme des Ordners von
heute) und `tests-veraltet` gegen die Prüfsumme des Ordners.

## Die Fälle in einer Tabelle

| Lage | Was der Nachweis sagt | Was der Mensch tut |
|---|---|---|
| Von Hand gemachte App, Ordner kopiert, nie hier gebaut | `fehlt` | Plan, `--plan-aktiv`, `--build` |
| Eine Datei nach dem Bau geändert | `quelle-geaendert` | Noch einmal `--build` |
| Das Paket nach dem Bau geändert | `paket-geaendert` | Noch einmal `--build`; nie unter `build/` ändern |
| Nachweis aus einer anderen App kopiert | `kennung`, `siegel` oder `paket-geaendert` | `--build` |
| Keine Tests in der App | `tests-fehlen` | Einen Test neben `backend/test/kern.test.mjs` schreiben |
| Tests rot | `tests-rot`, das Paket ist gebaut und geht nicht hinaus | Beheben, `--build` |
| Eine Vorführung ohne Plan (`--no-plan`) | `schritt-fehlt` (`interview`) | Einen Plan aktiv setzen, noch einmal bauen |
| Nach einer Änderung nur `--test` gelaufen | `bau-veraltet` | `--build`, erst dann trägt das Paket das Ergebnis |
| Ein fremder Container | Wird nicht verlangt | Keine |

## Was der Nachweis nicht ist

**Er ist kein Schutz gegen Fälschung.** Es steckt kein Geheimnis darin: wer dieses Blatt kennt,
kann die Prüfsummen bilden und eine Datei schreiben, die besteht. Er belegt, dass der Ablauf lief,
und fängt Versehen ab: eine nachträglich geänderte Datei, eine kopierte App, vergessene Tests. Wem
das Gerät vertraut, ist die benannte Person der Firma, die für das einsteht, was live geht. Eine
Fassung der Prüfung, die mehr will, muss mehr mitbringen, etwa eine Signatur des Geräts. Das ist
eine eigene Entscheidung und die einer späteren Kontraktfassung.

## Was das Kit hier nicht tut

Das Kit spricht das Gerät nur über seine Schnittstelle an, nie über MCP. Der Nachweis braucht keinen
Lauf gegen ein Gerät: der Teststand trägt den vierten Schritt in die Akte der App ein, das Paket
trägt ihn nicht. Wer die Prüfung an einem Gerät erprobt, nimmt den Teststand einer Probe-App.
