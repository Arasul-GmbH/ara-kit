import type { CSSProperties } from 'react';

/**
 * Der Linien-Satz: ein Umrisssatz in einem Zug gezeichnet.
 *
 * Strich 1,5, runde Enden und Ecken, hoechstens drei Striche je Symbol,
 * `currentColor`, nie gefuellt und umrissen gemischt. Die Groessen sind drei
 * feste: 16 (Zeile, Knopf), 20 (Leiste, Dock), 24 (Kachel, App-Icon).
 *
 * Der Satz steht hier und nicht in Lucide, weil er in einer App ohne Bau
 * laufen muss: `browser/marken.js` traegt keine tausend Symbole mit. Wer ein
 * Symbol braucht, das hier fehlt, nimmt in einer App mit Bau `Icon` und
 * `@marken/symbole`; in einer App ohne Bau fragt er nach einem neuen Namen
 * in diesem Satz, statt sich ein eigenes zu zeichnen.
 */
const STRICHE = {
  start: ['M4 11l8-7 8 7', 'M6 10v9h12v-9'],
  fuerSie: ['M4 13l2-7h12l2 7v5H4z', 'M4 13h5l1 2h4l1-2h5'],
  plus: ['M12 5v14', 'M5 12h14'],
  store: ['M5 8h14l-1 12H6z', 'M9 8V7a3 3 0 0 1 6 0v1'],
  zuletzt: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3 2'],
  suche: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M20 20l-4-4'],
  idee: [
    'M9 18h6',
    'M10 21h4',
    'M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z',
  ],
  live: [
    'M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    'M7.8 7.8a6 6 0 0 0 0 8.4',
    'M16.2 7.8a6 6 0 0 1 0 8.4',
  ],
  test: ['M9 3h6', 'M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3'],
  rueckmeldung: ['M4 5h16v11H9l-5 4z', 'M8 10h8'],
  zurueck: ['M15 5l-7 7 7 7'],
  weiter: ['M9 5l7 7-7 7'],
  unten: ['M5 9l7 7 7-7'],
  schliessen: ['M6 6l12 12', 'M18 6L6 18'],
  haken: ['M5 12.5l4.5 4.5L19 7.5'],
  rueckgaengig: ['M9 14L4 9l5-5', 'M4 9h10a6 6 0 0 1 0 12h-3'],
  angebote: ['M7 3h7l4 4v14H7z', 'M14 3v4h4', 'M10 13h5'],
  kalender: ['M4 6h16v14H4z', 'M4 10h16', 'M8 3v4M16 3v4'],
  personen: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4 20a8 8 0 0 1 16 0'],
  einstellungen: ['M4 8h9M17 8h3', 'M4 16h3M11 16h9', 'M15 6v4M9 14v4'],
  lager: ['M4 8l8-4 8 4v8l-8 4-8-4z', 'M4 8l8 4 8-4', 'M12 12v8'],
  bauen: ['M12 4v4M12 16v4M4 12h4M16 12h4', 'M12 10l1 1-1 1-1-1z'],
  freigabe: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M8.5 12.5l2.5 2.5 4.5-5'],
  ziehen: ['M9 6h.01M15 6h.01', 'M9 12h.01M15 12h.01', 'M9 18h.01M15 18h.01'],
} as const;

export type LinienName = keyof typeof STRICHE;

/** Die Namen des Satzes, fuer Schaustuecke und Pruefungen. */
export const LINIEN_NAMEN = Object.keys(STRICHE) as LinienName[];

export type LinienGroesse = 16 | 20 | 24;

export interface LinieProps {
  name: LinienName;
  /** 16, 20 oder 24 Pixel. Vorgabe 20. */
  groesse?: LinienGroesse;
  /** Ein Wort fuer Vorlesewerkzeuge. Ohne Angabe ist das Symbol Schmuck. */
  titel?: string;
}

export function Linie({ name, groesse = 20, titel }: LinieProps) {
  return (
    <svg
      className="ara-linie"
      width={groesse}
      height={groesse}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={titel ? 'img' : undefined}
      aria-label={titel}
      aria-hidden={titel ? undefined : true}
      focusable="false"
    >
      {STRICHE[name].map(d => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

export interface AppIconProps {
  /** Das Linien-Icon der App. */
  symbol: LinienName;
  /** 32, 44 oder 64 Pixel Kantenlaenge des Squircles. Vorgabe 44. */
  groesse?: 32 | 44 | 64;
  titel?: string;
}

/**
 * Ein App-Icon: dasselbe Linien-Icon in Blau auf einem zart blauen Squircle.
 * Es gibt keine Pixel-Icons und keine zweite Form.
 */
export function AppIcon({ symbol, groesse = 44, titel }: AppIconProps) {
  const stil = { '--ara-appicon': `${groesse}px` } as CSSProperties;
  return (
    <span className="ara-appicon" style={stil} data-groesse={groesse}>
      <Linie name={symbol} groesse={groesse >= 64 ? 24 : groesse >= 44 ? 24 : 16} titel={titel} />
    </span>
  );
}
