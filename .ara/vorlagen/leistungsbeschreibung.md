> **Vorlage: Anlage "Leistungsbeschreibung".**
>
> Sie legt fest, was geschuldet ist. Was hier nicht steht, ist nicht zugesagt. Deshalb
> ist sie das Papier, das dich am meisten schuetzt, und deshalb wird sie nie aus einem
> alten Angebot kopiert.
>
>
> **Warum es diese Anlage gibt, rechtlich.** Vier Klauseln verwiesen bis zum
> 24.08.2026 auf ein Dokument, das nicht existierte: Ziffer 6 und Ziffer 10 im
> Kaufvertrag von Arasul, Ziffer 9a und Ziffer 10 im Partnervertrag mit Arasul,
> Ziffer 4 in `endkundenbedingungen.md`. Ein Verweis ins Leere vereinbart keine
> Beschaffenheit. Ohne diese Anlage gilt, was der Kunde nach § 434 Abs. 2 Nr. 2
> BGB erwarten durfte, im Zweifel also das, was er in einer Vorfuehrung gesehen
> hat. Sie wirkt damit anders als ein Haftungsausschluss: der nimmt etwas weg und
> wird nach §§ 305 ff. BGB geprueft, ob er das darf. Diese Anlage legt fest, was
> geschuldet ist.
> **So füllst du sie:** `.ara/knowledge/paperwork.md`, Abschnitt "Die
> Leistungsbeschreibung fuellen". Kurzfassung: Spiegel
> holen, Gerät befragen, Reifegrad je Bereich setzen, Abschnitt 4 und 6 aus dem
> konkreten Fall füllen, Abschnitt 8 mit dem Kunden durchgehen.
>
> **Was das Gerät sagen kann, fuellt ein Werkzeug:**
> `node .ara/tools/service-description.mjs --device <geraet>` traegt
> Softwarestand, Kontraktfassung, Modelle und installierte Apps ein und schreibt
> zu jedem Wert dazu, woher er kommt. Was es nicht messen konnte, bleibt als
> Platzhalter stehen und wird genannt.
>
> **Werte kommen vom Gerät oder aus dem Spiegel, nie aus dieser Vorlage.** Die Tabelle
> in Abschnitt 2 ist ein Beispiel und traegt ein Datum; hol sie frisch.

---

# Anlage: Leistungsbeschreibung

Zu Vertrag: {Angebotsnummer oder Vertragsdatum} · Kunde: {Firma}\
Gerät: {Modell, Seriennummer} · Softwarestand: {Fassung, vom Gerät gelesen}\
Kontraktfassung des Geräts: {Zahl, vom Gerät gelesen}\
Erhoben am: {JJJJ-MM-TT} · Erhoben gegen: {den Spiegelstand oder das gelieferte Gerät}

## 1 Gegenstand und Entwicklungsstand

Gegenstand ist die Software Arasul in dem oben genannten Stand, auf dem oben
genannten Gerät.

**Die Software befindet sich im Vorserienstand.** Sie wird laufend
weiterentwickelt. Der Vertragspartner erwirbt sie in Kenntnis dieses Umstands.
Was sie zum Zeitpunkt der Übergabe kann, ist abschließend in Abschnitt 3
beschrieben und wird bei der Übergabe vorgeführt.

Die Software ist dafür bestimmt, Arbeitsvorgaenge mit menschlicher
Letztentscheidung zu unterstuetzen. **Sie ist nicht dafür bestimmt, einen
Arbeitsvorgang ohne Rueckfallebene zu tragen.** Der Betreiber hält für jeden
Vorgang, den er mit der Software unterstuetzt, ein Verfahren vor, das auch ohne
sie durchfuehrbar ist.

## 2 Zielplattform und Stand der Erprobung

Quelle: der Spiegel, `node .ara/tools/mirror.mjs --refresh`. Die Tabelle unten ist
der Stand vom 24.08.2026 und dient nur als Muster. **Vor jedem Angebot neu holen.**

| Plattform | Stand der Erprobung | Bedeutung |
| --- | --- | --- |
| NVIDIA Jetson AGX Orin 64GB | **live** | auf echter Hardware betrieben und abgenommen |
| NVIDIA Jetson Thor 128GB | emulation | nur nachgebildet geprüft, kein Gerät vorhanden |
| Workstation mit NVIDIA RTX PRO 6000 | emulation | nur nachgebildet geprüft, kein Gerät vorhanden |
| NVIDIA DGX Spark | follow-up | nicht geprüft |
| NVIDIA DGX Station | follow-up | nicht geprüft |
| Generischer x86-Server mit NVIDIA-GPU | follow-up | nicht geprüft |

**Für jede Plattform, die hier nicht als `live` ausgewiesen ist, wird keine
Leistungsfaehigkeit, Kompatibilitaet oder Funktionsfaehigkeit zugesichert.**
Wird eine solche Plattform geliefert, ist der Vorbehalt zwingend aufzunehmen:
im Angebot unter "Vorbehalte" und im Kaufvertrag, den der Anbieter mit dem
Kunden schliesst.

Gelieferte Plattform in diesem Fall: **{Plattform}**, Stand der Erprobung
**{live | emulation | follow-up}**.

## 3 Funktionsbereiche und Reifegrad

**Die Spalte "Reifegrad" wird je Lieferung aus der Geräteabnahme gefüllt, nicht
abgeschrieben.** Drei Stufen, und sie bedeuten Verschiedenes:

| Stufe | Bedeutung | Rechtsfolge |
| --- | --- | --- |
| **abgenommen** | bei der Übergabe vorgeführt und im Übergabeprotokoll abgezeichnet | geschuldete Beschaffenheit |
| **in Erprobung** | vorhanden, aber nicht Gegenstand der Abnahme | keine zugesicherte Eigenschaft, Nutzung auf eigenes Risiko |
| **Vorschau** | sichtbar, noch nicht fertiggestellt | nicht Vertragsgegenstand, kann sich ändern oder entfallen |

| Funktionsbereich | Reifegrad | Anmerkung |
| --- | --- | --- |
| Anmeldung, Nutzer und Rollen | {Stufe} | ein Administratorzugang je Gerät, siehe Abschnitt 4 |
| Chat mit lokalen Sprachmodellen | {Stufe} | Modell, Antwortzeit und Ausgabequalitaet siehe Abschnitt 5 |
| Modellkatalog, Modelle laden und entfernen | {Stufe} | Bezug über huggingface.co, siehe Abschnitt 7 |
| Dokumentenablage und Dokumentensuche | {Stufe} | |
| Dokumentenanalyse | {Stufe} | |
| Wissensgraph und Verknuepfungen | {Stufe} | |
| Arbeitsumgebung mit Terminal auf dem Gerät | {Stufe} | |
| Ablaeufe und Automatisierung | {Stufe} | |
| Erweiterungen bauen, ausspielen, einspielen | {Stufe} | siehe Abschnitt 6 |
| Externe Schnittstelle mit Schluesselauthentifizierung | {Stufe} | Umfang siehe Abschnitt 5 |
| Datensicherung und Wiederherstellung | {Stufe} | Pflichten des Betreibers siehe Abschnitt 8 |
| Überwachung und Selbstheilung | {Stufe} | keine Verfuegbarkeitszusage |
| Fernwartungszugang | {Stufe} | siehe Abschnitt 7 und die Vereinbarung zur Auftragsverarbeitung nach Ziffer 9 der Endkundenbedingungen |
| Werksreset | {Stufe} | |

## 4 Was ausdruecklich nicht Vertragsgegenstand ist

Diese Liste ist Teil der Beschaffenheitsvereinbarung. Was hier steht, ist nicht
geschuldet, auch wenn es technisch vorhanden erscheint.

- **Mandantentrennung innerhalb eines Gerätes.** Das Gerät wird mit einem
  Administratorzugang betrieben. Wer mehrere Mandanten getrennt halten muss,
  benötigt mehrere Geräte
- **Eine bestimmte Verfuegbarkeit**, Reaktionszeit, Wiederherstellungszeit oder
  Antwortzeit
- **Eine bestimmte Ausgabequalitaet** oder die inhaltliche Richtigkeit einer
  Ausgabe
- **Hochverfuegbarkeit, Ausfallsicherheit, Lastverteilung, Clusterbetrieb**
- **Der Betrieb von Erweiterungen Dritter**, siehe Abschnitt 6
- **Die Anbindung externer Modelle oder Dienste.** Sie ist möglich und im
  Auslieferungszustand nicht eingerichtet
- **Migration von Daten aus Altsystemen**, soweit nicht gesondert beauftragt
- **Schulung**, soweit nicht gesondert beauftragt
- **Funktionen, die in Abschnitt 3 als "Vorschau" ausgewiesen sind**

## 5 Messwerte und ihre Bedeutung

Bei der Übergabe werden Messwerte protokolliert, etwa die Antwortzeit auf eine
Testfrage. **Diese Werte dokumentieren den Vorgang und sind keine zugesicherte
Eigenschaft.** Antwortzeit, Durchsatz und Ausgabequalitaet hängen von Modell,
Anfragelaenge, Vorlauf, Auslastung und Umgebungstemperatur ab.

Eingesetztes Sprachmodell bei der Übergabe: **{Kennung und Fassung}**. Modelle
können vom Betreiber gewechselt werden; damit aendert sich das Verhalten, und
die Messwerte der Übergabe gelten dann nicht mehr.

## 6 Erweiterungen

Die Plattform sieht vor, dass eigene Erweiterungen und Software Dritter gebaut,
installiert und angebunden werden. **Erweiterungen sind nicht Bestandteil der
Lieferung**, auch dann nicht, wenn die Plattform ihre Installation vorsieht oder
erleichtert.

Wer eine Erweiterung installiert, betreibt oder anbindet, ist für sie allein
verantwortlich, einschliesslich Auswahl, Lizenzierung, Konfiguration, Betrieb,
Aktualisierung, Datenschutz und Rechtsgrundlage.

Bei Übergabe installierte Erweiterungen: **{keine | Liste mit Fassung und
Lizenzgeber}**.

## 7 Verbindungen nach aussen

Die Verarbeitung findet auf dem Gerät statt. Verbindungen nach aussen bestehen
nur in den folgenden Faellen, und jede lässt sich abschalten:

| Anlass | Ziel | Abschaltbar |
| --- | --- | --- |
| Modelle nachladen | huggingface.co | ja, dann können keine Modelle nachgeladen werden |
| Fernwartung, wenn eingerichtet | {Vermittlungsnetz, aus der Geraetepruefung} | ja, Not-Aus beim Betreiber |
| {weitere, aus der Geräteprüfung} | {Ziel} | {ja/nein} |

**Diese Tabelle wird je Lieferung gegen das Gerät gemessen, nicht abgeschrieben.**
Eine absolute Aussage ("keine Verbindung nach aussen") ist mit einem einzigen
Gegenbeispiel widerlegt, und danach hat der Kunde einen Anknuepfungspunkt für
§ 444 BGB. Das Messverfahren liegt im Produktrepo.

## 8 Schutzmaßnahmen, die der Betreiber vor der Inbetriebnahme einrichtet

Diese Liste traegt Absatz 3 des Blocks W3, in den Endkundenbedingungen Ziffer 5,
in den Vertraegen von Arasul jeweils Ziffer 10. Ein blosser Hinweis auf die
Fehlbarkeit von Ausgaben genuegt nach OLG Hamm, Urteil vom 12.05.2026,
4 UKl 3/25, nicht; es müssen Schutzmaßnahmen daneben stehen. Das Urteil ist
nicht rechtskraeftig, Revision zum BGH zugelassen.

- [ ] **Vier-Augen-Prinzip** für jede Ausgabe, die rechtliche oder
      wirtschaftliche Wirkung entfaltet. Wer unterschreibt, prüft
- [ ] **Benannte sachkundige Person** je Vorgang, die Ausgaben freigibt
- [ ] **Nachweisliche Unterweisung** der Personen, die mit dem System arbeiten,
      darüber, dass Ausgaben unrichtig sein können, auch wenn sie plausibel
      wirken. Datum und Teilnehmer festhalten
- [ ] **Rueckfallebene** je unterstuetztem Vorgang, siehe Abschnitt 1
- [ ] **Zugaenge**: eigene Anmeldung je Person, kein geteiltes Passwort,
      Administratorzugang nur bei denen, die ihn brauchen
- [ ] **Datensicherung**: Sicherungsprotokoll woechentlich prüfen, Fehlschlaege
      unverzueglich melden, mindestens einmal eine Wiederherstellung erproben
- [ ] **Ausgeschlossene Verwendungen** nach Absatz 4 des Blocks W3, in den
      Endkundenbedingungen Ziffer 5, im Haus bekannt gemacht

Der Betreiber bestaetigt die Einrichtung dieser Maßnahmen im
Übergabeprotokoll.

## 9 Betriebsvoraussetzungen beim Betreiber

- Stellplatz, Stromversorgung, Netzanbindung, Kuehlung
- Ein Ansprechpartner mit Entscheidungsbefugnis
- Zugaenge zu den anzubindenden Systemen
- {Weiteres aus dem konkreten Fall}

---

<!--
VOR DEM VERSENDEN ABARBEITEN:
- [ ] Abschnitt 2: Plattform eingetragen und ihr verification-Feld frisch aus
      config/platforms/<id>.json gelesen. Nicht aus dieser Vorlage uebernehmen
- [ ] Abschnitt 3: jede Zeile auf eine der drei Stufen gesetzt. Keine Zeile
      leer. "abgenommen" nur, wenn es im Uebergabeprotokoll auch abgezeichnet
      wird. Eine Zeile, die hier "abgenommen" traegt und dort nicht vorgefuehrt
      wird, ist ein Widerspruch zu Lasten von Arasul
- [ ] Abschnitt 5: Modellkennung und Fassung vom Geraet gelesen
- [ ] Abschnitt 6: installierte Erweiterungen aufgefuehrt, oder ausdruecklich
      "keine"
- [ ] Abschnitt 7: gegen das Geraet gemessen, nicht abgeschrieben
- [ ] Softwarestand und Kontraktfassung vom Geraet gelesen, nicht aus einem
      aelteren Angebot uebernommen
- [ ] Kein {Platzhalter} mehr im Text

WARUM DIE STUFE "in Erprobung" EXISTIERT. Ohne sie muesste jede vorhandene
Funktion entweder zugesagt oder verschwiegen werden. Verschweigen einer
vorhandenen, aber unfertigen Funktion ist der gefaehrlichere Weg: der Kunde
findet sie, benutzt sie und haelt sie fuer geschuldet. Die Stufe macht sie
sichtbar und nimmt sie zugleich aus der Beschaffenheit.
-->
