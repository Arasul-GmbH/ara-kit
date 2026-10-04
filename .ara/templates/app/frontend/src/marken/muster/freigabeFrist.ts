/**
 * Die Zeitangaben einer Freigabe, als Worte.
 *
 * Eine Frist ist das einzige Feld einer Freigabe, das sich von selbst ändert,
 * und deshalb steht sie als DAUER da und nicht als Zeitpunkt: „noch 47
 * Minuten" beantwortet die Frage, die jemand vor dem Knopf hat. Die Grenze
 * liegt bei einer Stunde: darunter zählen Minuten, darüber Stunden und Tage.
 *
 * Reine Funktionen und nur für `Freigabe` gedacht; sie stehen nicht im
 * Sammelexport. Die Shell liest sie über `@marken/muster/freigabeFrist`.
 */

/** Ist die Frist so knapp, dass die Zeile Aufmerksamkeit verdient? */
const KNAPP_MS = 60 * 60 * 1000;

/** Die Restzeit bis `frist`, in Worten. `jetzt` setzt der Test. */
export function restzeit(frist: string, jetzt: number = Date.now()): string {
  const ziel = new Date(frist).getTime();
  if (!Number.isFinite(ziel)) return 'ohne Frist';

  const rest = ziel - jetzt;
  // Abgelaufen, aber noch in der Liste: der Zeitgeber im Backend schreibt den
  // Status erst, wenn der Lauf ihn braucht. Zu schweigen wäre die schlechtere
  // Form: wer hier drückt, bekommt eine Absage.
  if (rest <= 0) return 'Frist abgelaufen';

  const minuten = Math.floor(rest / 60_000);
  if (minuten < 1) return 'noch unter einer Minute';
  if (minuten < 60) return `noch ${minuten} ${minuten === 1 ? 'Minute' : 'Minuten'}`;

  const stunden = Math.floor(minuten / 60);
  if (stunden < 24) return `noch ${stunden} ${stunden === 1 ? 'Stunde' : 'Stunden'}`;

  const tage = Math.floor(stunden / 24);
  return `noch ${tage} ${tage === 1 ? 'Tag' : 'Tage'}`;
}

/** Läuft diese Frist innerhalb der nächsten Stunde ab? */
export function istKnapp(frist: string, jetzt: number = Date.now()): boolean {
  const ziel = new Date(frist).getTime();
  if (!Number.isFinite(ziel)) return false;
  return ziel - jetzt < KNAPP_MS;
}

/** Wie lange wartet eine Anfrage schon? Die Gegenrichtung zur Restzeit. */
export function wartetSeit(angefragt: string, jetzt: number = Date.now()): string {
  const beginn = new Date(angefragt).getTime();
  if (!Number.isFinite(beginn)) return 'wartet';

  const minuten = Math.floor(Math.max(0, jetzt - beginn) / 60_000);
  if (minuten < 1) return 'wartet seit eben';
  if (minuten < 60) return `wartet seit ${minuten === 1 ? 'einer Minute' : `${minuten} Minuten`}`;

  const stunden = Math.floor(minuten / 60);
  if (stunden < 24) return `wartet seit ${stunden === 1 ? 'einer Stunde' : `${stunden} Stunden`}`;

  const tage = Math.floor(stunden / 24);
  return `wartet seit ${tage === 1 ? 'einem Tag' : `${tage} Tagen`}`;
}

/** Namen in einem Satz: „a", „a oder b", „a, b oder c". */
export function oderListe(namen: string[]): string {
  if (namen.length <= 1) return namen.join('');
  return `${namen.slice(0, -1).join(', ')} oder ${namen[namen.length - 1]}`;
}
