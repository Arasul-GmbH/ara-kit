/**
 * Die eine Stelle, an der diese App etwas holt.
 *
 * Jeder Aufruf geht ueber `hole`. Das ist kein Selbstzweck: hier stehen die
 * drei Dinge, die sonst an zwanzig Stellen stuenden und an neunzehn davon
 * falsch waeren.
 *
 *   1. **Der Pfad** kommt aus `basis.ts` und nicht aus dem Aufrufer.
 *   2. **Die Anmeldung** faehrt von allein mit: das Sitzungscookie des Geraets
 *      ist `httpOnly` und gehoert zur Herkunft, aus der auch diese Seite kam.
 *      Die App traegt keinen Schluessel und darf keinen tragen.
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

/** Der Inhalt einer Antwort, egal ob sie einen Umschlag traegt. */
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

export async function hole<T>(pfad: string, optionen?: RequestInit): Promise<T> {
  const antwort = await fetch(weg(pfad), {
    headers: { "content-type": "application/json" },
    ...optionen,
  });
  const text = await antwort.text();
  let daten: unknown = null;
  try {
    daten = text ? JSON.parse(text) : null;
  } catch {
    daten = null;
  }
  if (!antwort.ok) {
    throw new SchnittstellenFehler(
      grund(daten) ?? `${pfad} wurde mit Status ${antwort.status} beantwortet.`,
      antwort.status
    );
  }
  return inhalt(daten) as T;
}
