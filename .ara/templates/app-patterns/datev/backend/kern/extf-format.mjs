/**
 * Das Format des DATEV-Buchungsstapels, genau so, wie die Quelle es sagt.
 * Eine Datei, aus der Schreiber (`datev.mjs`) und Prüfskript
 * (`../pruefen/stapel.mjs`) lesen: ändert DATEV das Format, ändert sich
 * hier eine Stelle und beide folgen.
 *
 * Primärquelle: DATEV Developer Portal, DATEV-Format, abgerufen am 02.10.2026.
 *   Header                https://developer.datev.de/de/file-format/details/datev-format/format-description/header
 *   Buchungsstapel        https://developer.datev.de/de/file-format/details/datev-format/format-description/booking-batch
 *   Musterdatei           https://developer.datev.de/de/file-format/details/datev-format/format-description/sample-data
 *   Zeichensatz           https://developer.datev.de/de/file-format/details/datev-format/character-set
 *
 * Was die Quelle am 02.10.2026 sagt: Versionsnummer 700, Formatkategorie 21
 * (Buchungsstapel), **Formatversion 13**, Kopfzeile mit 31 Feldern, Spaltenzeile
 * mit 125 Spalten, Zeichensatz Windows-1252 (ISO-8859-1) als Vorgabe, Semikolon,
 * Text in Anführungszeichen, Dezimalkomma, Zeilenende CR LF. Die Spaltenzeile
 * unten ist die der Musterdatei der Quelle. Die Überschriften in der
 * Feldtabelle der Quelle weichen davon in der Schreibweise ab, die Reihenfolge
 * und Anzahl sind gleich.
 *
 * Die Ausdrücke sind die der Quelle, Zeichen für Zeichen. Sie gelten für das
 * Feld, wie es in der Datei steht, mit den Anführungszeichen. Ein Feld darf
 * leer sein, auch bei Text als zwei Anführungszeichen: so macht es die
 * Musterdatei der Quelle. Wo die Quelle keinen Ausdruck nennt, steht `null`.
 *
 * Ob eine neuere Formatversion gilt, steht nicht hier: nachsehen auf den
 * Adressen oben, und das Datum der Prüfung dann hier nachtragen.
 */

export const QUELLE = {
  abgerufen: "2026-10-02",
  adresse: "https://developer.datev.de/de/file-format/details/datev-format/format-description/booking-batch",
  versionsnummer: 700,
  formatkategorie: 21,
  formatversion: 13,
};

/** Die 31 Felder der Kopfzeile: Überschrift und Ausdruck. */
export const KOPF = [
  ["Kennzeichen", String.raw`^["](EXTF|DTVF)["]$`],
  ["Versionsnummer", String.raw`^(700)$`],
  ["Formatkategorie", String.raw`^(16|20|21|46|48|65)$`],
  ["Formatname", String.raw`^["](Buchungsstapel|Wiederkehrende Buchungen|Debitoren/Kreditoren|Kontenbeschriftungen|Zahlungsbedingungen|Diverse Adressen)["]$`],
  ["Formatversion", String.raw`^(2|4|5|13)$`],
  ["Erzeugt am", String.raw`^([2])([0])([0-9]{2})(0[1-9]|1[0-2])(0[1-9]|[1-2][0-9]|3[0-1])(2[0-3]|[01][0-9])([0-5][0-9])([0-5][0-9][0-9][0-9][0-9])$`],
  ["Importiert", String.raw`^[]$`],
  ["Herkunft", String.raw`^["]\w{0,2}["]$`],
  ["Exportiert von", String.raw`^["]\w{0,25}["]$`],
  ["Importiert von", String.raw`^["]\w{0,25}["]$`],
  ["Beraternummer", String.raw`^(\d{4,6}|\d{7})$`],
  ["Mandantennummer", String.raw`^\d{1,5}$`],
  ["WJ-Beginn", String.raw`^([2])([0])([0-9]{2})(0[1-9]|1[0-2])(0[1-9]|[1-2][0-9]|3[0-1])$`],
  ["Sachkontenlänge", String.raw`^[4-8]$`],
  ["Datum von", String.raw`^([2])([0])([0-9]{2})(0[1-9]|1[0-2])(0[1-9]|[1-2][0-9]|3[0-1])$`],
  ["Datum bis", String.raw`^([2])([0])([0-9]{2})(0[1-9]|1[0-2])(0[1-9]|[1-2][0-9]|3[0-1])$`],
  ["Bezeichnung", String.raw`^["][\w.-/ ]{0,30}["]$`],
  ["Diktatkürzel", String.raw`^["]([A-Z]{2}){0,2}["]$`],
  ["Buchungstyp", String.raw`^[1-2]$`],
  ["Rechnungslegungszweck", String.raw`^(0|30|40|50|64)$`],
  ["Festschreibung", String.raw`^(0|1)$`],
  ["WKZ", String.raw`^["]([A-Z]{3})["]$`],
  ["Reserviert", String.raw`^[]$`],
  ["Derivatskennzeichen", String.raw`^["]["]$`],
  ["Reserviert", String.raw`^[]$`],
  ["Reserviert", String.raw`^[]$`],
  ["Sachkontenrahmen", String.raw`^["](\d{2}){0,2}["]$`],
  ["ID der Branchenlösung", String.raw`^\d{0,4}$`],
  ["Reserviert", String.raw`^[]$`],
  ["Reserviert", String.raw`^["]["]$`],
  ["Anwendungsinformation", String.raw`^["].{0,16}["]$`],
];

/** Die Spaltenzeile der Musterdatei, 125 Spalten. */
export const SPALTEN = [
  "Umsatz (ohne Soll/Haben-Kz)",
  "Soll/Haben-Kennzeichen",
  "WKZ Umsatz",
  "Kurs",
  "Basis-Umsatz",
  "WKZ Basis-Umsatz",
  "Konto",
  "Gegenkonto (ohne BU-Schlüssel)",
  "BU-Schlüssel",
  "Belegdatum",
  "Belegfeld 1",
  "Belegfeld 2",
  "Skonto",
  "Buchungstext",
  "Postensperre",
  "Diverse Adressnummer",
  "Geschäftspartnerbank",
  "Sachverhalt",
  "Zinssperre",
  "Beleglink",
  "Beleginfo - Art 1",
  "Beleginfo - Inhalt 1",
  "Beleginfo - Art 2",
  "Beleginfo - Inhalt 2",
  "Beleginfo - Art 3",
  "Beleginfo - Inhalt 3",
  "Beleginfo - Art 4",
  "Beleginfo - Inhalt 4",
  "Beleginfo - Art 5",
  "Beleginfo - Inhalt 5",
  "Beleginfo - Art 6",
  "Beleginfo - Inhalt 6",
  "Beleginfo - Art 7",
  "Beleginfo - Inhalt 7",
  "Beleginfo - Art 8",
  "Beleginfo - Inhalt 8",
  "KOST1 - Kostenstelle",
  "KOST2 - Kostenstelle",
  "Kost-Menge",
  "EU-Land u. UStID (Bestimmung)",
  "EU-Steuersatz (Bestimmung)",
  "Abw. Versteuerungsart",
  "Sachverhalt L+L",
  "Funktionsergänzung L+L",
  "BU 49 Hauptfunktionstyp",
  "BU 49 Hauptfunktionsnummer",
  "BU 49 Funktionsergänzung",
  "Zusatzinformation - Art 1",
  "Zusatzinformation- Inhalt 1",
  "Zusatzinformation - Art 2",
  "Zusatzinformation- Inhalt 2",
  "Zusatzinformation - Art 3",
  "Zusatzinformation- Inhalt 3",
  "Zusatzinformation - Art 4",
  "Zusatzinformation- Inhalt 4",
  "Zusatzinformation - Art 5",
  "Zusatzinformation- Inhalt 5",
  "Zusatzinformation - Art 6",
  "Zusatzinformation- Inhalt 6",
  "Zusatzinformation - Art 7",
  "Zusatzinformation- Inhalt 7",
  "Zusatzinformation - Art 8",
  "Zusatzinformation- Inhalt 8",
  "Zusatzinformation - Art 9",
  "Zusatzinformation- Inhalt 9",
  "Zusatzinformation - Art 10",
  "Zusatzinformation- Inhalt 10",
  "Zusatzinformation - Art 11",
  "Zusatzinformation- Inhalt 11",
  "Zusatzinformation - Art 12",
  "Zusatzinformation- Inhalt 12",
  "Zusatzinformation - Art 13",
  "Zusatzinformation- Inhalt 13",
  "Zusatzinformation - Art 14",
  "Zusatzinformation- Inhalt 14",
  "Zusatzinformation - Art 15",
  "Zusatzinformation- Inhalt 15",
  "Zusatzinformation - Art 16",
  "Zusatzinformation- Inhalt 16",
  "Zusatzinformation - Art 17",
  "Zusatzinformation- Inhalt 17",
  "Zusatzinformation - Art 18",
  "Zusatzinformation- Inhalt 18",
  "Zusatzinformation - Art 19",
  "Zusatzinformation- Inhalt 19",
  "Zusatzinformation - Art 20",
  "Zusatzinformation- Inhalt 20",
  "Stück",
  "Gewicht",
  "Zahlweise",
  "Forderungsart",
  "Veranlagungsjahr",
  "Zugeordnete Fälligkeit",
  "Skontotyp",
  "Auftragsnummer",
  "Buchungstyp",
  "USt-Schlüssel (Anzahlungen)",
  "EU-Land (Anzahlungen)",
  "Sachverhalt L+L (Anzahlungen)",
  "EU-Steuersatz (Anzahlungen)",
  "Erlöskonto (Anzahlungen)",
  "Herkunft-Kz",
  "Buchungs GUID",
  "KOST-Datum",
  "SEPA-Mandatsreferenz",
  "Skontosperre",
  "Gesellschaftername",
  "Beteiligtennummer",
  "Identifikationsnummer",
  "Zeichnernummer",
  "Postensperre bis",
  "Bezeichnung SoBil-Sachverhalt",
  "Kennzeichen SoBil-Buchung",
  "Festschreibung",
  "Leistungsdatum",
  "Datum Zuord. Steuerperiode",
  "Fälligkeit",
  "Generalumkehr (GU)",
  "Steuersatz",
  "Land",
  "Abrechnungsreferenz",
  "BVV-Position",
  "EU-Land u. UStID (Ursprung)",
  "EU-Steuersatz (Ursprung)",
  "Abw. Skontokonto",
];

/** Der Ausdruck der Quelle je Spalte, in derselben Reihenfolge wie SPALTEN. */
export const AUSDRUECKE = [
  String.raw`^(?!0{1,10}\,00)\d{1,10}\,\d{2}$`, // 1 Umsatz (ohne Soll/Haben-Kz)
  String.raw`^["](S|H)["]$`, // 2 Soll/Haben-Kennzeichen
  String.raw`^["]([A-Z]{3})["]$`, // 3 WKZ Umsatz
  String.raw`^([1-9]\d{0,3}[,]\d{2,6})$`, // 4 Kurs
  String.raw`^(?!0{1,10}\,00)\d{1,10}\,\d{2}$`, // 5 Basis-Umsatz
  null, // 6 WKZ Basis-Umsatz
  String.raw`^(?!0{1,9}$)(\d{1,9})$`, // 7 Konto
  String.raw`^(?!0{1,9}$)(\d{1,9})$`, // 8 Gegenkonto (ohne BU-Schlüssel)
  String.raw`^(["]\d{4}["])$`, // 9 BU-Schlüssel
  String.raw`^(\d{4})$`, // 10 Belegdatum
  String.raw`^(["][\w$&%*+\-\/]{0,36}["])$`, // 11 Belegfeld 1
  String.raw`^(["][\w$&%*+\-\/]{0,36}["])$`, // 12 Belegfeld 2
  String.raw`^([1-9]\d{0,7}[,]\d{2})$`, // 13 Skonto
  String.raw`^(["].{0,60}["])$`, // 14 Buchungstext
  String.raw`^(0|1)$`, // 15 Postensperre
  String.raw`^(["]\w{0,9}["])$`, // 16 Diverse Adressnummer
  String.raw`^(\d{3})$`, // 17 Geschäftspartnerbank
  String.raw`^(\d{2})$`, // 18 Sachverhalt
  String.raw`^(0|1)$`, // 19 Zinssperre
  String.raw`^["].{0,210}["]$`, // 20 Beleglink
  String.raw`^(["].{0,20}["])$`, // 21 Beleginfo - Art 1
  String.raw`^(["].{0,210}["])$`, // 22 Beleginfo - Inhalt 1
  String.raw`^(["].{0,20}["])$`, // 23 Beleginfo - Art 2
  String.raw`^(["].{0,210}["])$`, // 24 Beleginfo - Inhalt 2
  String.raw`^(["].{0,20}["])$`, // 25 Beleginfo - Art 3
  String.raw`^(["].{0,210}["])$`, // 26 Beleginfo - Inhalt 3
  String.raw`^(["].{0,20}["])$`, // 27 Beleginfo - Art 4
  String.raw`^(["].{0,210}["])$`, // 28 Beleginfo - Inhalt 4
  String.raw`^(["].{0,20}["])$`, // 29 Beleginfo - Art 5
  String.raw`^(["].{0,210}["])$`, // 30 Beleginfo - Inhalt 5
  String.raw`^(["].{0,20}["])$`, // 31 Beleginfo - Art 6
  String.raw`^(["].{0,210}["])$`, // 32 Beleginfo - Inhalt 6
  String.raw`^(["].{0,20}["])$`, // 33 Beleginfo - Art 7
  String.raw`^(["].{0,210}["])$`, // 34 Beleginfo - Inhalt 7
  String.raw`^(["].{0,20}["])$`, // 35 Beleginfo - Art 8
  String.raw`^(["].{0,210}["])$`, // 36 Beleginfo - Inhalt 8
  String.raw`^(["][\w ]{0,36}["])$`, // 37 KOST1 - Kostenstelle
  String.raw`^(["][\w ]{0,36}["])$`, // 38 KOST2 - Kostenstelle
  String.raw`^\d{12}[,]\d{4}$`, // 39 Kost-Menge
  String.raw`^(["].{0,15}["])$`, // 40 EU-Land u. UStID (Bestimmung)
  String.raw`^\d{2}[,]\d{2}$`, // 41 EU-Steuersatz (Bestimmung)
  String.raw`^(["](I|K|P|S)["])$`, // 42 Abw. Versteuerungsart
  String.raw`^(\d{1,3})$`, // 43 Sachverhalt L+L
  String.raw`^\d{0,3}$`, // 44 Funktionsergänzung L+L
  String.raw`^\d$`, // 45 BU 49 Hauptfunktionstyp
  String.raw`^\d{0,2}$`, // 46 BU 49 Hauptfunktionsnummer
  String.raw`^\d{0,3}$`, // 47 BU 49 Funktionsergänzung
  String.raw`^(["].{0,20}["])$`, // 48 Zusatzinformation - Art 1
  String.raw`^(["].{0,210}["])$`, // 49 Zusatzinformation- Inhalt 1
  String.raw`^(["].{0,20}["])$`, // 50 Zusatzinformation - Art 2
  String.raw`^(["].{0,210}["])$`, // 51 Zusatzinformation- Inhalt 2
  String.raw`^(["].{0,20}["])$`, // 52 Zusatzinformation - Art 3
  String.raw`^(["].{0,210}["])$`, // 53 Zusatzinformation- Inhalt 3
  String.raw`^(["].{0,20}["])$`, // 54 Zusatzinformation - Art 4
  String.raw`^(["].{0,210}["])$`, // 55 Zusatzinformation- Inhalt 4
  String.raw`^(["].{0,20}["])$`, // 56 Zusatzinformation - Art 5
  String.raw`^(["].{0,210}["])$`, // 57 Zusatzinformation- Inhalt 5
  String.raw`^(["].{0,20}["])$`, // 58 Zusatzinformation - Art 6
  String.raw`^(["].{0,210}["])$`, // 59 Zusatzinformation- Inhalt 6
  String.raw`^(["].{0,20}["])$`, // 60 Zusatzinformation - Art 7
  String.raw`^(["].{0,210}["])$`, // 61 Zusatzinformation- Inhalt 7
  String.raw`^(["].{0,20}["])$`, // 62 Zusatzinformation - Art 8
  String.raw`^(["].{0,210}["])$`, // 63 Zusatzinformation- Inhalt 8
  String.raw`^(["].{0,20}["])$`, // 64 Zusatzinformation - Art 9
  String.raw`^(["].{0,210}["])$`, // 65 Zusatzinformation- Inhalt 9
  String.raw`^(["].{0,20}["])$`, // 66 Zusatzinformation - Art 10
  String.raw`^(["].{0,210}["])$`, // 67 Zusatzinformation- Inhalt 10
  String.raw`^(["].{0,20}["])$`, // 68 Zusatzinformation - Art 11
  String.raw`^(["].{0,210}["])$`, // 69 Zusatzinformation- Inhalt 11
  String.raw`^(["].{0,20}["])$`, // 70 Zusatzinformation - Art 12
  String.raw`^(["].{0,210}["])$`, // 71 Zusatzinformation- Inhalt 12
  String.raw`^(["].{0,20}["])$`, // 72 Zusatzinformation - Art 13
  String.raw`^(["].{0,210}["])$`, // 73 Zusatzinformation- Inhalt 13
  String.raw`^(["].{0,20}["])$`, // 74 Zusatzinformation - Art 14
  String.raw`^(["].{0,210}["])$`, // 75 Zusatzinformation- Inhalt 14
  String.raw`^(["].{0,20}["])$`, // 76 Zusatzinformation - Art 15
  String.raw`^(["].{0,210}["])$`, // 77 Zusatzinformation- Inhalt 15
  String.raw`^(["].{0,20}["])$`, // 78 Zusatzinformation - Art 16
  String.raw`^(["].{0,210}["])$`, // 79 Zusatzinformation- Inhalt 16
  String.raw`^(["].{0,20}["])$`, // 80 Zusatzinformation - Art 17
  String.raw`^(["].{0,210}["])$`, // 81 Zusatzinformation- Inhalt 17
  String.raw`^(["].{0,20}["])$`, // 82 Zusatzinformation - Art 18
  String.raw`^(["].{0,210}["])$`, // 83 Zusatzinformation- Inhalt 18
  String.raw`^(["].{0,20}["])$`, // 84 Zusatzinformation - Art 19
  String.raw`^(["].{0,210}["])$`, // 85 Zusatzinformation- Inhalt 19
  String.raw`^(["].{0,20}["])$`, // 86 Zusatzinformation - Art 20
  String.raw`^(["].{0,210}["])$`, // 87 Zusatzinformation- Inhalt 20
  String.raw`^\d{0,8}$`, // 88 Stück
  String.raw`^(\d{1,8}[,]\d{2})$`, // 89 Gewicht
  String.raw`^\d{0,2}$`, // 90 Zahlweise
  String.raw`^(["]\w{0,10}["])$`, // 91 Forderungsart
  String.raw`^(([2])([0])([0-9]{2}))$`, // 92 Veranlagungsjahr
  String.raw`^((0[1-9]|[1-2][0-9]|3[0-1])(0[1-9]|1[0-2])([2])([0])([0-9]{2}))$`, // 93 Zugeordnete Fälligkeit
  String.raw`^\d$`, // 94 Skontotyp
  String.raw`^(["].{0,30}["])$`, // 95 Auftragsnummer
  String.raw`^(["][A-Z]{2}["])$`, // 96 Buchungstyp
  String.raw`^\d{0,4}$`, // 97 USt-Schlüssel (Anzahlungen)
  String.raw`^(["][A-Z]{2}["])$`, // 98 EU-Land (Anzahlungen)
  String.raw`^\d{0,3}$`, // 99 Sachverhalt L+L (Anzahlungen)
  String.raw`^(\d{1,2}[,]\d{2})$`, // 100 EU-Steuersatz (Anzahlungen)
  String.raw`^(\d{4,8})$`, // 101 Erlöskonto (Anzahlungen)
  String.raw`^(["][A-Z]{2}["])$`, // 102 Herkunft-Kz
  String.raw`^(["].{0,36}["])$`, // 103 Buchungs GUID
  String.raw`^((0[1-9]|[1-2]\d|3[0-1])(0[1-9]|1[0-2])([2])([0])(\d{2}))$`, // 104 KOST-Datum
  String.raw`^(["].{0,35}["])$`, // 105 SEPA-Mandatsreferenz
  String.raw`^[0|1]$`, // 106 Skontosperre
  String.raw`^(["].{0,76}["])$`, // 107 Gesellschaftername
  String.raw`^(\d{4})$`, // 108 Beteiligtennummer
  String.raw`^(["].{0,11}["])$`, // 109 Identifikationsnummer
  String.raw`^(["].{0,20}["])$`, // 110 Zeichnernummer
  String.raw`^((0[1-9]|[1-2]\d|3[0-1])(0[1-9]|1[0-2])([2])([0])(\d{2}))$`, // 111 Postensperre bis
  String.raw`^(["].{0,30}["])$`, // 112 Bezeichnung SoBil-Sachverhalt
  String.raw`^(\d{1,2})$`, // 113 Kennzeichen SoBil-Buchung
  String.raw`^(0|1)$`, // 114 Festschreibung
  String.raw`^((0[1-9]|[1-2]\d|3[0-1])(0[1-9]|1[0-2])([2])([0])(\d{2}))$`, // 115 Leistungsdatum
  String.raw`^((0[1-9]|[1-2]\d|3[0-1])(0[1-9]|1[0-2])([2])([0])(\d{2}))$`, // 116 Datum Zuord. Steuerperiode
  String.raw`^((0[1-9]|[1-2]\d|3[0-1])(0[1-9]|1[0-2])([2])([0])(\d{2}))$`, // 117 Fälligkeit
  String.raw`^(["](0|1)["])$`, // 118 Generalumkehr (GU)
  String.raw`^(\d{1,2}[,]\d{2})$`, // 119 Steuersatz
  String.raw`^(["][A-Z]{2}["])$`, // 120 Land
  String.raw`^(["].{0,50}["])$`, // 121 Abrechnungsreferenz
  String.raw`^([1|2|3|4|5])$`, // 122 BVV-Position
  String.raw`^(["].{0,15}["])$`, // 123 EU-Land u. UStID (Ursprung)
  String.raw`^\d{2}[,]\d{2}$`, // 124 EU-Steuersatz (Ursprung)
  String.raw`^(\d{1,9})$`, // 125 Abw. Skontokonto
];
