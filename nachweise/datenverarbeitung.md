<!-- gespiegelt-aus-arasul -->
> **Gespiegelt aus dem Steuerungsordner von Arasul. Hier nicht
> bearbeiten**, jede Aenderung wird beim naechsten Spiegeln
> ueberschrieben. Wer etwas geaendert haben will, sagt es Arasul.
>
> Quelle: `templates/legal/nachweise/datenverarbeitung.md` · Stand: 2026-08-25

# Nachweis: was das Gerät verarbeitet und was es nach außen gibt

> **Was das ist.** Das Blatt, das ein Partner vorlegt, wenn der Datenschutz des
> Kunden fragt, wohin die Daten gehen. Es behauptet nicht, es **misst**. Die
> Zahlen und Zeilen in Abschnitt 3 entstehen am konkreten Gerät, mit den unten
> genannten Befehlen, und tragen Datum und Uhrzeit.
>
> Angefordert von **5 von 6 Befragten** in der Partnerumfrage vom 24.08.2026 als
> Teil von "fertige Verträge und Datenschutzunterlagen".
> Quelle: Partnerumfrage 003, Frage 9.
>
> **Dieses Blatt ist ein Gerüst.** Ein ausgefülltes Blatt ohne Messung ist
> schlimmer als keines, weil ihm geglaubt wird.
>
> Stand des Gerüsts: 2026-08-25

## 1 Was auf dem Gerät verarbeitet wird

| Datenart | Wo verarbeitet | Wo gespeichert |
| --- | --- | --- |
| Hochgeladene Dokumente und ihre Inhalte | ausschließlich auf dem Gerät | auf dem Gerät, in den Datenordnern der Anlage |
| Fragen, Antworten, Gesprächsverläufe | ausschließlich auf dem Gerät | auf dem Gerät |
| Benutzerkonten und Anmeldedaten | ausschließlich auf dem Gerät | auf dem Gerät |
| Protokolle des Betriebs | ausschließlich auf dem Gerät | auf dem Gerät |

Das Sprachmodell läuft auf der Hardware des Betreibers. Für eine Antwort verlässt
kein Inhalt das Gerät.

## 2 Was ausdrücklich nicht eingerichtet ist

| Funktion | Zustand bei Auslieferung |
| --- | --- |
| Anbindung externer Modelle oder Dienste | **nicht eingerichtet.** Optional, und wer sie einrichtet, ist dafür allein verantwortlich, siehe Ziffer 5 des Vertrages |
| Übermittlung von Nutzungsdaten an Arasul | findet nicht statt |
| Fernwartungszugang | nur wenn im Übergabeprotokoll ausdrücklich vereinbart |

## 3 Die Messung, am konkreten Gerät

> Diese Tabelle wird **je Auslieferung neu erhoben**. Eine abgeschriebene
> Messung ist beim nächsten Stand falsch.

| Feld | Wert |
| --- | --- |
| Gerät | `{Kennung, Seriennummer}` |
| Softwarestand | `{aus dem Gerät}` |
| Gemessen am | `{JJJJ-MM-TT hh:mm}` |
| Verbindungen nach außen während des Betriebs | `{Anzahl und Ziel, oder "keine"}` |
| Fernwartungszugang | `{direkt | Vermittlungsnetz | nicht eingerichtet}` |

**Wie gemessen wird.** Auf dem Gerät, während es arbeitet:

```bash
./scripts/test/souveraenitaet-abnahme.sh
./scripts/test/ausgang-lauscher.sh stand
```

Gemessen wird **im Betrieb, nicht im Leerlauf**: parallel läuft die Kernkette
(Dokument hochladen, Frage stellen, Antwort mit Quelle), und währenddessen wird
alle zwei Sekunden nachgesehen, wohin die Dienste verbunden sind.

Als **innen** gelten die privaten Netzbereiche 10/8, 172.16/12, 192.168/16,
127/8, 169.254/16 sowie der Bereich 100.64/10 des Vermittlungsnetzes. Alles
andere ist außen und wird einzeln aufgeführt. Der Bereich des Vermittlungsnetzes
zählt als innen, **weil** der Fernzugriff eine bewusst eingeschaltete Funktion
ist; wer das Gerät ohne Fernzugriff betreibt, darf dort nichts sehen.

**Was diese Messung nicht kann, und das gehört dazu:** sie sieht alle zwei
Sekunden nach, welche Verbindungen offen sind. Eine Verbindung, die zwischen zwei
Blicken aufgeht und wieder zugeht, entgeht ihr. Für ein Gutachten bräuchte es
eine Mitschrift auf Paketebene. Für die Frage, ob das Gerät im Betrieb nach Hause
telefoniert, ist die Stichprobe belastbar, weil eine Anbindung, die etwas täte,
nicht nur Millisekunden offen wäre.

## 4 Wer datenschutzrechtlich was ist

| Rolle nach DSGVO | Wer |
| --- | --- |
| **Verantwortlicher**, Art. 4 Nr. 7 | der Betreiber des Geräts, also der Kunde |
| **Auftragsverarbeiter**, Art. 4 Nr. 8 | Arasul, und nur insoweit, als im Rahmen der Wartung ein Zugriff erfolgt |

Ohne Fernwartungszugang findet **keine Auftragsverarbeitung** statt: es gibt
keinen Zugriff, den Arasul ausüben könnte. Mit Fernwartungszugang gilt die
Vereinbarung nach Art. 28 DSGVO, die Arasul stellt.

## 5 Unterauftragsverarbeiter

Genau einer, und nur bei einer bestimmten Wahl:

| Name | Wofür | Wann | Grundlage |
| --- | --- | --- | --- |
| Tailscale Inc. | Vermittlungsnetz für den Fernwartungszugang. Verarbeitet Verbindungs- und Metadaten (Gerätekennungen, Adressen, Zeitpunkte), **nicht die Inhalte der Anlage** | nur wenn der Fernzugriff über das Vermittlungsnetz eingerichtet wird | Standardvertragsklauseln nach Art. 46 Abs. 2 lit. c DSGVO, Teil des Data Processing Addendum des Anbieters |

**Wird der Fernzugriff direkt und schlüsselbasiert im Netz des Kunden
eingerichtet, entfällt diese Zeile ersatzlos** und es gibt keinen
Unterauftragsverarbeiter. Welcher Weg gewählt wurde, steht im Übergabeprotokoll.

## 6 Löschen und Herausgeben

Die Daten liegen auf dem Gerät des Kunden. Er kann sie jederzeit herausgeben und
löschen, ohne Arasul zu beteiligen. Ein Werksreset setzt das Gerät zurück; das
Verfahren und seine Abnahme sind Teil der technischen Dokumentation.

## Quellen

| Angabe | Quelle | Abgerufen |
| --- | --- | --- |
| Netzbereiche, Messverfahren, Grenzen der Messung | Abnahme der Souveraenitaet im Produkt, Kopfkommentar des Pruefskripts | 2026-08-25 |
| Unterauftragsverarbeiter und Rechtsgrundlage | Vereinbarung zur Auftragsverarbeitung, Ziffer 7 | fortlaufend |
| Externe Modelle nicht eingerichtet | Kaufvertrag, Ziffer 10 Absatz 5 | fortlaufend |
| Angaben zu Tailscale Inc. | `tailscale.com/legal/dpa` | 2026-08-24 |

**Vor dem Vorzeigen:** Abschnitt 3 muss gemessen sein, und das Abrufdatum der
Angaben zu Tailscale ist zu prüfen.
