<!-- gespiegelt-aus-arasul -->
> **Gespiegelt aus dem Steuerungsordner von Arasul. Hier nicht
> bearbeiten**, jede Änderung wird beim nächsten Spiegeln
> überschrieben. Wer etwas geändert haben will, sagt es Arasul.
>
> Quelle: `templates/uebergabeprotokoll.md` · Stand: 2026-08-25

# Übergabeprotokoll

> Vorlage für die Abnahme nach einer Geräteauslieferung.
> **Jede Zeile braucht einen Nachweis, nicht eine Behauptung. Ein Eintrag ohne
> Nachweis ist wertlos.**
>
> **Fassung 3 vom 24.08.2026.** Neu: die übergebenen Anlagen stehen als eigene
> Positionen, der Entwicklungsstand wird bestätigt, und die Schutzmaßnahmen nach
> Abschnitt 8 der Leistungsbeschreibung bekommen eine eigene Tabelle. Ohne diese
> Bestätigung ist Ziffer 10 Absatz 3 der Verträge nicht erfüllt.
>
> **Fassung 2 vom 22.08.2026.** Vorher sagte der Abnahmeabschnitt "zur Kenntnis
> genommen". Das ist keine Abnahmeerklärung nach § 640 BGB, und daran hängen
> vier Folgen: die zweite Rate wird nach § 641 BGB nicht fällig, die Gefahr geht
> nach § 644 BGB nicht über, die Beweislast für Mangelfreiheit bleibt bei
> Arasul, und die Verjährung nach § 634a BGB beginnt nicht zu laufen.
> Außerdem verlangte die Zeile zur Testfrage eine gemessene Antwortzeit ins
> Protokoll. Ein unterschriebenes Protokoll mit einer Zahl darin ist eine
> Beschaffenheitsvereinbarung nach § 434 Abs. 2 BGB. Beides behoben.
> Quelle für die Inhalte ist der Laufzettel aus `ara-kit`, erzeugt von `/device`.

---

**Übergabeprotokoll**

Kunde: {Firma} · Ort: {Adresse} · Datum: {JJJJ-MM-TT}
Anwesend: {Namen} · Gerät: {Modell, Seriennummer}
Vertrag: {Angebotsnummer oder Vertragsdatum}

## Was übergeben wurde

| Pos | Gegenstand | Nachweis |
| --- | --- | --- |
| 1 | {Gerät, Modell, Seriennummer} | Sichtprüfung, Foto |
| 2 | {Zubehör} | Sichtprüfung |
| 3 | Zugangsdaten für den Administrator | {getrennt übergeben, nicht in diesem Protokoll} |
| 4 | Administrationshandbuch | {Datei oder Link} |
| 5 | Anlage "Leistungsbeschreibung", Stand {JJJJ-MM-TT} | {übergeben am} |
| 6 | Anlage "Drittlizenzen" | {übergeben am} |

## Funktionsnachweise

Jede Zeile wird vor Ort gezeigt und abgezeichnet. Nicht gezeigt heißt nicht erfüllt.

| Prüfpunkt | Erfüllt | Nachweis |
| --- | --- | --- |
| Gerät erreichbar im Kundennetz | { } | {IP, Screenshot} |
| Anmeldung mit Administratorkonto | { } | {vorgeführt} |
| Sprachmodell antwortet auf eine Testfrage | { } | {vorgeführt} |
| Dokumentensuche findet ein Testdokument | { } | {vorgeführt} |
| {Angebundenes System} liefert Daten | { } | {vorgeführt} |
| {Erster Ablauf} läuft durch | { } | {vorgeführt} |
| Datensicherung läuft und wurde einmal zurückgespielt | { } | {vorgeführt, Datum} |
| Updateweg erklärt | { } | {erklärt an} |
| Verhalten bei Stromausfall erklärt | { } | {erklärt} |
| Not-Aus für die Fernwartung gezeigt | { } | {vorgeführt} |
| Werksreset erklärt | { } | {erklärt} |

**Jede Zeile, die hier abgezeichnet wird, muss in der Anlage
"Leistungsbeschreibung" Abschnitt 3 auf "abgenommen" stehen, und umgekehrt.** Ein
Funktionsbereich, der dort "abgenommen" trägt und hier nicht vorgeführt wurde, ist
ein Widerspruch zu Lasten von Arasul.

## Entwicklungsstand

Der Kunde bestätigt, die Anlage "Leistungsbeschreibung" vor Vertragsschluss
erhalten zu haben und zu wissen, dass die Software sich im Vorserienstand
befindet, laufend weiterentwickelt wird und Arbeitsvorgänge mit menschlicher
Letztentscheidung unterstützt, aber keinen Arbeitsvorgang ohne Rückfallebene
trägt.

Funktionen, die in der Anlage als "Vorschau" ausgewiesen sind, sind nicht
Vertragsgegenstand.

## Schutzmaßnahmen

Der Betreiber bestätigt, die Schutzmaßnahmen nach Abschnitt 8 der Anlage
"Leistungsbeschreibung" eingerichtet zu haben:

| Maßnahme | Eingerichtet | Nachweis |
| --- | --- | --- |
| Vier-Augen-Prinzip für wirkungsvolle Ausgaben | { } | {benanntes Verfahren} |
| Sachkundige Person je Vorgang benannt | { } | {Name, Rolle} |
| Unterweisung durchgeführt | { } | {Datum, Teilnehmer} |
| Rückfallebene je unterstütztem Vorgang | { } | {benannt} |
| Eigene Anmeldung je Person, kein geteiltes Passwort | { } | {vorgeführt} |
| Ausgeschlossene Verwendungen im Haus bekannt gemacht | { } | {Datum} |

Ohne diese Bestätigung ist Ziffer 10 Absatz 3 des Vertrages nicht erfüllt, und
der Hinweis auf die Fehlbarkeit von Ausgaben steht allein. Nach OLG Hamm,
Urteil vom 12.05.2026, 4 UKl 3/25, trägt ein solcher Hinweis allein nicht.

## Offene Punkte

| Punkt | Wer | Bis wann |
| --- | --- | --- |
| {konkret} | {Name} | {JJJJ-MM-TT} |

Jeder offene Punkt bekommt eine Wiedervorlage mit demselben Datum, beim
Ausliefernden im eigenen Terminregister. Ein offener Punkt ohne Datum ist keiner.

## Einweisung

Eingewiesen wurden: {Namen und Rollen}
Inhalte: {Stichpunkte}
Dauer: {Stunden}

## Abnahme

Der Kunde erklärt mit seiner Unterschrift die **Abnahme** der Leistung als im
Wesentlichen vertragsgemäß im Sinne von § 640 BGB. Die oben unter "Offene Punkte"
aufgeführten Restarbeiten sind unwesentliche Mängel und hindern die Abnahme nicht;
der Kunde behält sich die Rechte daraus vor.

Verweigert der Kunde die Abnahme, benennt er die Mängel innerhalb von zehn
Werktagen in Textform. Nimmt der Kunde die Leistung in Gebrauch, ohne innerhalb
dieser Frist wesentliche Mängel zu rügen, gilt die Abnahme als erfolgt.

Die oben protokollierten Messwerte dokumentieren den Vorgang. Sie sind keine
zugesicherte Eigenschaft. Antwortzeiten hängen von Modell, Anfragelänge, Vorlauf
und Auslastung ab.

Ort, Datum: {offen}

Für den Kunden: ________________

Für Arasul: ________________

<!--
REGELN:
- Keine Zeile abzeichnen, die nicht vorgeführt wurde
- Die Funktionsnachweise und Abschnitt 3 der Leistungsbeschreibung müssen
  zueinander passen. Das ist keine Formsache: die Anlage ist die vereinbarte
  Beschaffenheit, dieses Protokoll ist der Beweis
- Zugangsdaten nie in dieses Protokoll schreiben, getrennt übergeben
- Nach der Übergabe: offene Punkte nach company/follow-ups.md, Status des Kunden
  auf ausgeliefert setzen
-->
