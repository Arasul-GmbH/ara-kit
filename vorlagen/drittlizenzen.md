> **Anlage "Drittlizenzen".** Fassung 3 vom 24.08.2026.
>
> Sie traegt Block W5: Ziffer 8 in `endkundenbedingungen.md`, Ziffer 12 im
> Kaufvertrag von Arasul, Ziffer 13 im Partnervertrag mit Arasul. **Ohne diese
> Anlage sind alle drei Klauseln wertlos.**
>
> **Warum sie existiert.** Ausgeliefert wird fremder Code, darunter mehrere
> Komponenten unter Copyleft, waehrend das `LICENSE` des Produktrepos das
> Gesamtpaket als "proprietary and confidential, all rights reserved" bezeichnet.
> Wird das Gesamtsystem an einen Kunden ausgeliefert, liegt ein "conveying" im
> Sinne der GPL und AGPL vor, das die Pflicht zur Quellcodeueberlassung und zur
> Weitergabe der Lizenztexte ausloest. Ein Unterlassungsanspruch trifft dann
> nicht ein Feature, sondern die Auslieferung des Produkts, und nach dem ersten
> Verkauf zusaetzlich die Haftung wegen Rechtsmangels nach § 435 BGB.

---

# SPERRE: diese Anlage ist noch nicht versandfaehig

**Stand 24.08.2026.** Abschnitt "Nicht Bestandteil der Lieferung" beschreibt den
**Zielzustand**. Er ist heute noch nicht der Auslieferungsstand:

| Bedingung | Stand am 24.08.2026 | Wo sie erfuellt wird |
| --- | --- | --- |
| n8n startet nicht mehr ohne ausdrueckliches Profil | **offen** | Produktrepo, Issue 599 |
| `searxng` traegt eine feste Fassung statt `latest` | **offen** | Produktrepo |
| SBOM gegen den gebauten Stand liegt vor | **offen** | `syft` oder `trivy`, Arbeitsrechner |
| `LICENSE` des Produktrepos berichtigt | **offen** | Produktrepo |

**Solange die erste Zeile offen ist, waere die Aussage "n8n ist nicht Bestandteil
der Lieferung" unwahr.** Eine unwahre Angabe in einer Vertragsanlage ist schlimmer
als das Lizenzproblem, das sie loesen soll: sie eroeffnet § 444 BGB und nimmt
jeder Haftungsklausel die Wirkung. Diese Anlage wird deshalb nicht versendet,
bevor die erste Zeile erledigt ist.

---

# Anlage: Komponenten Dritter

Stand: 2026-08-24 · Erzeugt gegen: `main` des Produktrepos, Compose-Dateien und
Dockerfiles gelesen am 24.08.2026 · Lizenzen abgerufen am 23.08.2026

## Wie diese Liste entstanden ist

Drei Ebenen, alle aus der Live-Quelle gelesen, keine aus dem Gedaechtnis:

1. **`image:`-Zeilen** in den sechs Compose-Dateien des Produktrepos.
2. **`FROM`-Zeilen** der zwoelf Dockerfiles der selbst gebauten Dienste.
3. **Die Bibliotheken innerhalb der Abbilder.** Diese Ebene fehlt weiterhin. Sie
   entsteht nur mit einem SBOM-Werkzeug gegen den ausgelieferten Stand. Am
   23.08.2026 waren weder `syft` noch `trivy` auf dem Arbeitsrechner installiert.
   Solange sie fehlt, tragen die Zeilen `alpine`, `ubuntu`, `node` und `python`
   unten "offen".

## Was im Auslieferungsstand laeuft und was nicht

Am 24.08.2026 aus `compose/*.yaml` gelesen. Ein Dienst mit `profiles:` startet nur,
wenn das Profil ausdruecklich aktiviert wird; `scripts/deploy/deploy-local.sh` und
`deploy.yml` aktivieren keines.

| Profil | Dienste | Im Auslieferungsstand aktiv |
| --- | --- | --- |
| kein Profil | minio, searxng, postgres, traefik, socket-proxy, llm-service, document-indexer, dashboard-backend, dashboard-frontend, metrics-collector, self-healing-agent, backup-service | **ja** |
| `monitoring` | loki, promtail | nein |
| `tunnel` | cloudflared | nein |
| `classic-rag` | qdrant, embedding-service | nein |
| `automation` (Zielzustand, Issue 599) | n8n, n8n-runners | nein |

**Das aendert die Bewertung, nicht die Liste.** Ob ein Abbild, das auf dem Geraet
liegt aber nicht startet, bereits weitergegeben ist, ist eine offene Rechtsfrage.
Aufgefuehrt bleiben deshalb alle Komponenten, die auf dem Geraet liegen.

## Ebene 1: gezogene Container-Abbilder

| Komponente | Fassung | Lizenz | Copyleft | Quelle |
| --- | --- | --- | --- | --- |
| `minio/minio` | RELEASE.2025-09-07T16-13-09Z | **AGPL-3.0** | **ja** | github.com/minio/minio, `LICENSE`, belegt |
| `searxng/searxng` | **latest, siehe Sperre** | **AGPL-3.0** | **ja** | github.com/searxng/searxng, `LICENSE`, belegt |
| `grafana/loki` | 2.9.3 | **AGPL-3.0** | **ja** | github.com/grafana/loki, `LICENSE`, belegt |
| `grafana/promtail` | 2.9.3 | **AGPL-3.0** | **ja** | im selben Repo wie Loki, abgeleitet |
| `qdrant/qdrant` | v1.16.1 | Apache-2.0 | nein | github.com/qdrant/qdrant, belegt |
| `cloudflare/cloudflared` | 2025.2.1 | Apache-2.0 | nein | github.com/cloudflare/cloudflared, belegt |
| `tecnativa/docker-socket-proxy` | 0.3.0 | Apache-2.0 | nein | github.com/Tecnativa/docker-socket-proxy, belegt |
| `traefik` | v2.11 | MIT | nein | github.com/traefik/traefik, `LICENSE.md`, belegt |
| `postgres` | 16-alpine | PostgreSQL License, Abbild-Dateien MIT | nein | postgresql.org/about/licence und docker-library/postgres, belegt |

## Ebene 2: Basis-Abbilder der selbst gebauten Dienste

Aus den `FROM`-Zeilen der Dockerfiles, Fassungen aus den `ARG`-Vorgaben.

| Komponente | Fassung | Verwendet in | Lizenz | Quelle |
| --- | --- | --- | --- | --- |
| `ollama/ollama` | 0.32.12 | `services/llm-service` | MIT | github.com/ollama/ollama, belegt |
| `dustynv/l4t-pytorch` | r36.4.0 | `services/embedding-service` | **offen**, siehe unten | github.com/dusty-nv/jetson-containers, `LICENSE.md` ist MIT, betrifft aber nur die Bauskripte |
| `node` | 22-alpine, 20-alpine, 22-slim | fuenf Dienste | Node.js selbst MIT, Abbild **offen** | github.com/nodejs/node, `LICENSE`, belegt |
| `python` | 3.11.12-slim | fuenf Dienste | CPython PSF License v2, Abbild **offen** | docs.python.org/3/license.html, belegt |
| `nginx` | 1.27-alpine | `apps/dashboard-frontend` | BSD-2-Clause | github.com/nginx/nginx, belegt |
| `alpine` | 3.19 | `services/backup-service` | **offen**, Distribution mit gemischten Lizenzen | ohne SBOM nicht feststellbar |
| `ubuntu` | 22.04 | `services/llm-service` | **offen**, Distribution mit gemischten Lizenzen, GPL-Anteile zu erwarten | ohne SBOM nicht feststellbar |

## Nicht Bestandteil der Lieferung: Erweiterungen

Die Plattform sieht nach Block W4 der Vertraege vor, dass Erweiterungen und
Software Dritter installiert und angebunden werden. **Solche Erweiterungen sind
nicht Bestandteil der Lieferung**, auch dann nicht, wenn die Plattform ihre
Installation vorsieht oder erleichtert. Wer sie installiert, lizenziert und
betreibt sie selbst.

| Erweiterung | Lizenzgeber | Bedingungen | Wer lizenziert |
| --- | --- | --- | --- |
| n8n (`n8nio/n8n`, `n8nio/runners`) | n8n GmbH | Sustainable Use License | der Betreiber, unmittelbar beim Lizenzgeber |
| {weitere} | {Lizenzgeber} | {Bedingungen} | der Betreiber |

**Warum n8n hier steht und nicht oben.** Die Sustainable Use License sagt
woertlich, abgerufen am 23.08.2026:

> "You may use or modify the software only for your own internal business
> purposes or for non-commercial or personal use."
>
> "You may distribute the software or provide it to others only if you do so free
> of charge for non-commercial purposes."

Das Geschaeftsmodell ist entgeltliche Weitergabe an Partner, die weiterverkaufen.
Beide Saetze stehen dem dem Wortlaut nach entgegen. **Am 24.08.2026 entschieden:
n8n wird aus dem Auslieferungsumfang genommen.** Die Plattform bleibt in der Lage,
n8n als Erweiterung aufzunehmen; der Betreiber installiert und lizenziert es
selbst. Ab diesem Punkt gibt Arasul n8n nicht weiter, und die Lizenz des
Lizenzgebers gilt unmittelbar zwischen ihm und dem Betreiber.

**Bedingung, siehe Sperre oben:** die Aussage gilt erst, wenn n8n im Produkt nicht
mehr ohne ausdrueckliches Profil startet. Bis dahin liegt es im Standardstack.

## Was daraus folgt, in der Reihenfolge des Risikos

### 1. Copyleft: zwei im Auslieferungsstand, zwei hinter einem Profil

AGPL-3.0 tragen MinIO, SearXNG, Loki und Promtail. **Im Auslieferungsstand laufen
davon zwei**, MinIO und SearXNG; Loki und Promtail haengen am Profil `monitoring`,
das der Deploy nicht aktiviert.

Fuer die beiden aktiven gilt: Lizenztext beilegen, Quellcode zugaenglich machen,
und die AGPL erfasst nach ihrem Abschnitt 13 zusaetzlich den Netzzugriff. Fuer die
beiden inaktiven ist zu klaeren, ob ihr Abbild trotzdem auf dem Geraet liegt; dann
gilt dasselbe.

**Der Widerspruch zum eigenen `LICENSE` besteht in jedem Fall.** "All rights
reserved" fuer ein Paket mit AGPL-Bestandteilen ist unzutreffend. Zu berichtigen
im Produktrepo, nicht von hier aus.

### 2. `searxng/searxng` traegt weiterhin `latest`

Ein Auslieferungsstand ohne feste Fassung laesst sich weder dokumentieren noch
reproduzieren, und die Lizenzangabe oben gilt dann fuer einen Stand, den niemand
benennen kann. Am 24.08.2026 unveraendert. Vor der ersten Auslieferung
festnageln.

### 3. Das L4T-Abbild ist ungeklaert

`dustynv/l4t-pytorch` ist ein Gemeinschaftsabbild. Die Bauskripte in
`jetson-containers` stehen unter MIT, belegt. Der **Inhalt** des Abbilds ist
NVIDIA-Software auf L4T-Basis mit eigenen Bedingungen, und die stehen nicht in
dieser Lizenzdatei. Ohne diese Klaerung ist unbekannt, ob das Abbild als Teil
eines verkauften Geraets weitergegeben werden darf.

## Sprachmodelle

| Modell | Fassung | Lizenz | Weitergabe erlaubt | Quelle |
| --- | --- | --- | --- | --- |
| {Kennung} | {Fassung} | offen | offen | {URL} |

Nicht erhoben. Der Katalog steht laut `roadmap/arasul-jet.md` selbst zur
Entscheidung, und eine Lizenzliste gegen einen Katalog, der sich noch aendert,
waere beim naechsten Bauen falsch. Faellig, sobald der Katalog steht.

**Offene Frage:** Wenn Modelle nur gebuendelt und unveraendert weitergegeben
werden, ohne eigenes Training oder Finetuning, entsteht daraus voraussichtlich
keine Anbieterrolle fuer ein GPAI-Modell nach Art. 53 der Verordnung
(EU) 2024/1689. Belegt ist das nicht; eine Kommissionsleitlinie zur Abgrenzung
wurde nicht gefunden. Unabhaengig davon gelten die Lizenzbedingungen des
jeweiligen Modells, und manche schliessen kommerzielle Weitergabe aus.

## Bibliotheken

| Paket | Fassung | Lizenz | Quelle |
| --- | --- | --- | --- |
| {aus SBOM} | | | |

Ebene 3, siehe oben. Braucht `syft` oder `trivy` und den gebauten
Auslieferungsstand.

---

## Was daraus folgt, bevor verkauft wird

- [ ] **n8n hinter ein Profil legen.** Produktrepo, Issue 599. **Blockiert das
      Versenden dieser Anlage**, siehe Sperre
- [ ] SBOM gegen den ausgelieferten Stand erzeugen. `syft` oder `trivy`
      installieren, gegen den gebauten Stand laufen lassen, nicht gegen den
      Entwicklungsstand. Erst danach sind die "offen"-Zeilen in Ebene 2 belegbar
- [ ] Fuer MinIO und SearXNG: Lizenztext beilegen, Weg zur Quellcodeueberlassung
      beschreiben. Fuer Loki und Promtail zuerst klaeren, ob ihr Abbild trotz
      inaktivem Profil mit ausgeliefert wird
- [ ] `dustynv/l4t-pytorch` klaeren: welche NVIDIA-Bedingungen fuer den Inhalt
      gelten und ob Weitergabe im Geraet zulaessig ist
- [ ] `searxng/searxng` auf eine feste Fassung nageln
- [ ] `LICENSE` des Produktrepos berichtigen
- [ ] Modellliste nachziehen, sobald der Katalog entschieden ist
