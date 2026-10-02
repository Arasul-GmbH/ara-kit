/**
 * Muster Buchungsstapel: der Kontenrahmen SKR03, soweit diese App ihn
 * vorschlagen darf, und die Regel, die einen Vorschlag prüft. Das Modell oder
 * ein Mensch schlägt vor, diese Datei prüft, ein Mensch gibt frei.
 *
 * **Das ist eine Beispielauswahl und keine Steuerberatung.** Die Kontonummern
 * der Aufwandskonten stehen im Kontenrahmen SKR 03 der DATEV (Branchenpaket
 * Bau und Handwerk, gültig für 2026, Datei 19606_HGB_SKR_03_Bau_und_Handwerk_2026.pdf auf datev.de,
 * abgerufen am 02.10.2026),
 * die Bezeichnungen sind hier gekürzt. Die Konten 1000, 1200 und 1600 standen in
 * diesem Auszug nicht als einzelne Nummern: die Kanzlei bestätigt sie. **Ersetze
 * die Listen durch die Konten der Kanzlei**, und lass sie von deren
 * Steuerberater durchsehen, bevor die App live geht. Welches Konto zu welchem
 * Beleg gehört, ist eine Fachfrage, die das Muster nicht beantwortet.
 *
 * Der Schlüssel zur Umsatzsteuer (BU-Schlüssel) ist es genauso: 9 für 19 %
 * Vorsteuer und 8 für 7 % Vorsteuer sind die Schlüssel, die das Muster setzt.
 * Dass sie auf jedem Konto der Liste gelten, sagt erst der Steuerberater.
 */

export const KONTEN = {
  "4530": "Laufende Kfz-Betriebskosten",
  "4540": "Kfz-Reparaturen",
  "4650": "Bewirtungskosten",
  "4654": "Nicht abzugsfähige Bewirtungskosten",
  "4660": "Reisekosten Arbeitnehmer",
  "4670": "Reisekosten Unternehmer",
  "4900": "Sonstige betriebliche Aufwendungen",
  "4910": "Porto",
  "4920": "Telefon",
  "4930": "Bürobedarf",
  "4940": "Zeitschriften, Bücher",
  "4980": "Betriebsbedarf",
  "0420": "Technische Anlagen und Maschinen",
  "0490": "Sonstige Betriebs- und Geschäftsausstattung",
};

export const GEGENKONTEN = {
  "1000": "Kasse",
  "1200": "Bank",
  "1600": "Verbindlichkeiten aus Lieferungen und Leistungen",
};

/** Das Stichwort eines Belegs und das Konto, das das Muster dafür vorschlägt. */
export const KATEGORIEN = {
  tanken: "4530",
  kfz: "4530",
  buero: "4930",
  bewirtung: "4650",
  porto: "4910",
  telefon: "4920",
  reise: "4670",
  literatur: "4940",
  sonstiges: "4900",
};

export function buSchluessel(steuersatz) {
  const satz = Math.round(Number(steuersatz));
  if (satz === 19) return "9";
  if (satz === 7) return "8";
  return "";
}

function gegenkontoAus(zahlungsart) {
  const art = String(zahlungsart || "").toLowerCase();
  if (/bar|kasse|cash/.test(art)) return "1000";
  if (/karte|ec|giro|debit|kredit|ueberweis|überweis|bank|lastschrift/.test(art)) return "1200";
  return "1600";
}

/**
 * Prüft den Vorschlag gegen die Listen. Zurück kommt der geprüfte Vorschlag in
 * der Form, die `buchungsstapel` nimmt, und die Liste der Korrekturen, jede
 * mit Grund. Eine Korrektur ist ein Befund für den Menschen, der freigibt, und
 * kein stilles Zurechtbiegen: die Seite zeigt sie neben dem Vorschlag.
 */
export function pruefen(felder) {
  const korrekturen = [];
  const f = felder || {};
  const kategorie = String(f.kategorie || "").toLowerCase().trim();

  let konto = String(f.konto ?? "").replace(/\D/g, "").padStart(4, "0").slice(-4);
  if (!KONTEN[konto]) {
    const neu = KATEGORIEN[kategorie] || "4900";
    korrekturen.push(`Konto ${f.konto ?? "leer"} steht nicht in der Liste der Konten, gesetzt ${neu} aus Kategorie "${kategorie || "unbekannt"}".`);
    konto = neu;
  }

  let gegenkonto = String(f.gegenkonto ?? "").replace(/\D/g, "").padStart(4, "0").slice(-4);
  if (!GEGENKONTEN[gegenkonto]) {
    const neu = gegenkontoAus(f.zahlungsart);
    korrekturen.push(`Gegenkonto ${f.gegenkonto ?? "leer"} steht nicht in der Liste, gesetzt ${neu} aus Zahlungsart "${f.zahlungsart || "unbekannt"}".`);
    gegenkonto = neu;
  }

  const erwartet = buSchluessel(f.steuersatz);
  const bu = String(f.bu_schluessel ?? "").replace(/\D/g, "");
  if (bu !== erwartet) {
    korrekturen.push(`BU-Schlüssel ${f.bu_schluessel ?? "leer"} passt nicht zum Steuersatz ${f.steuersatz ?? "?"} %, gesetzt "${erwartet}".`);
  }

  const brutto = Number(String(f.brutto ?? "").replace(",", "."));
  if (!Number.isFinite(brutto) || brutto <= 0) korrekturen.push("Kein Bruttobetrag erkannt, Beleg muss von Hand ergänzt werden.");

  return {
    vorschlag: {
      konto,
      konto_name: KONTEN[konto],
      gegenkonto,
      gegenkonto_name: GEGENKONTEN[gegenkonto],
      bu_schluessel: erwartet,
      steuersatz: Number(f.steuersatz) || 0,
      betrag: Number.isFinite(brutto) && brutto > 0 ? Math.round(brutto * 100) / 100 : null,
      belegdatum: f.belegdatum || null,
      belegnummer: String(f.belegnummer || "").slice(0, 36),
      buchungstext: String(f.buchungstext || f.aussteller || "").slice(0, 60),
      soll_haben: "S",
    },
    korrekturen,
  };
}
