/**
 * Die eine Stelle, an der diese App etwas holt.
 *
 * Jeder Aufruf geht über `hole`. Das ist kein Selbstzweck: hier stehen die
 * drei Dinge, die sonst an zwanzig Stellen stünden und an neunzehn davon
 * falsch wären.
 *
 *   1. **Der Pfad** kommt aus `basis.ts` und nicht aus dem Aufrufer.
 *   2. **Die Anmeldung** fährt von allein mit: das Sitzungscookie des Geräts
 *      ist `httpOnly` und gehört zur Herkunft, aus der auch diese Seite kam.
 *      Die App trägt keinen Schlüssel und darf keinen tragen.
 *   3. **Der Umschlag** wird abgenommen. Die Plattform antwortet an manchen
 *      Wegen mit `data` darum herum und an anderen ohne. Wer sich auf eine der
 *      beiden Formen festlegt, wirft die andere weg, und das sieht danach aus
 *      wie eine leere Antwort.
 */

import { weg } from "./basis";

/** Ein Fehler mit dem Status, den die Gegenseite genannt hat. */
export class SchnittstellenFehler extends Error {
  readonly status: number;

  constructor(nachricht: string, status: number) {
    super(nachricht);
    this.name = "SchnittstellenFehler";
    this.status = status;
  }
}

/** Der Inhalt einer Antwort, egal ob sie einen Umschlag trägt. */
function inhalt(daten: unknown): unknown {
  if (!daten || typeof daten !== "object" || Array.isArray(daten)) return daten;
  const innen = (daten as Record<string, unknown>).data;
  return innen && typeof innen === "object" ? innen : daten;
}

/** Der Satz, den die Gegenseite zu einem Fehler geschrieben hat, wenn sie einen schrieb. */
function grund(daten: unknown): string | null {
  if (!daten || typeof daten !== "object") return null;
  const feld = daten as Record<string, unknown>;
  const fehler = feld.error;
  if (typeof fehler === "string") return fehler;
  if (fehler && typeof fehler === "object") {
    const nachricht = (fehler as Record<string, unknown>).message;
    if (typeof nachricht === "string") return nachricht;
  }
  for (const name of ["fehler", "message"]) {
    const wert = feld[name];
    if (typeof wert === "string") return wert;
  }
  return null;
}

/**
 * Der Satz zu einem Status, wenn die Gegenseite keinen schrieb, je Klasse und
 * nie als HTTP-Zeile: wer „wurde mit Status 404 beantwortet" liest, hält die
 * App für kaputt. Die Zeile mit Pfad und Status geht ins Protokoll des Browsers.
 */
export function satzZumStatus(status: number): string {
  if (status === 0) return "Die App hat keine Verbindung zum Gerät. Bitte erneut versuchen.";
  if (status === 401) return "Die Anmeldung ist abgelaufen. Bitte neu anmelden.";
  if (status === 403) return "Das ist für Sie nicht freigegeben.";
  if (status === 404) return "Das gibt es nicht, oder es ist nicht für Sie freigegeben.";
  if (status === 408 || status === 429 || status === 504) return "Das Gerät war ausgelastet. Bitte erneut versuchen.";
  if (status >= 500) return "Das Gerät hat einen Fehler gemeldet. Bitte erneut versuchen.";
  return "Das hat das Gerät nicht angenommen.";
}

export async function hole<T>(pfad: string, optionen?: RequestInit): Promise<T> {
  let antwort: Response;
  try {
    antwort = await fetch(weg(pfad), {
      headers: { "content-type": "application/json" },
      ...optionen,
    });
  } catch (fehler) {
    console.error(`${pfad} war nicht erreichbar`, fehler);
    throw new SchnittstellenFehler(satzZumStatus(0), 0);
  }
  const text = await antwort.text();
  let daten: unknown = null;
  try {
    daten = text ? JSON.parse(text) : null;
  } catch {
    daten = null;
  }
  if (!antwort.ok) {
    const satz = grund(daten);
    if (!satz) console.error(`${pfad} wurde mit Status ${antwort.status} beantwortet.`);
    throw new SchnittstellenFehler(satz ?? satzZumStatus(antwort.status), antwort.status);
  }
  return inhalt(daten) as T;
}
