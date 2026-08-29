import type { ReactNode } from 'react';

/**
 * Eine Reihe von Eintraegen -- die Apps im Menue, die Staende einer App, was
 * eine App aufzaehlt.
 *
 * Ein Eintrag ist ein KNOPF, sobald er etwas tut, und sonst eine Zeile. Ein
 * `div` mit `onClick` sieht gleich aus und nimmt weder Tastatur noch
 * Screenreader mit; die Reihe der Oberflaechen-Abnahme laeuft mit Tab durch
 * die Shell und faende ihn nicht.
 */
export interface ListeProps {
  /** Ueberschrift der Reihe. Sie steht auch fuer Screenreader da. */
  beschriftung?: string;
  children: ReactNode;
}

export function Liste({ beschriftung, children }: ListeProps) {
  return (
    <div>
      {beschriftung && <div className="ara-liste__beschriftung">{beschriftung}</div>}
      <ul className="ara-liste" aria-label={beschriftung}>
        {children}
      </ul>
    </div>
  );
}

export interface ListenEintragProps {
  /** Das Wort, das die Zeile traegt. */
  titel: string;
  /** Symbol davor. */
  symbol?: ReactNode;
  /** Kurzes rechts: eine Fassung, ein Stand, eine Zahl. */
  hinweis?: ReactNode;
  /** Was der Klick tut. Ohne ihn ist die Zeile keine Schaltflaeche. */
  onKlick?: () => void;
  /** Die Zeile, auf der man gerade steht. */
  aktiv?: boolean;
  /** Fuer die Abnahme und fuer Tests. */
  kennzeichen?: string;
}

export function ListenEintrag({
  titel,
  symbol,
  hinweis,
  onKlick,
  aktiv = false,
  kennzeichen,
}: ListenEintragProps) {
  const inhalt = (
    <>
      {symbol && (
        <span className="ara-liste__symbol" aria-hidden="true">
          {symbol}
        </span>
      )}
      <span className="ara-liste__wort">{titel}</span>
      {hinweis && <span className="ara-liste__hinweis">{hinweis}</span>}
    </>
  );

  return (
    <li>
      {onKlick ? (
        <button
          type="button"
          className="ara-liste__eintrag"
          data-aktiv={aktiv ? 'true' : 'false'}
          aria-current={aktiv ? 'true' : undefined}
          data-testid={kennzeichen}
          onClick={onKlick}
        >
          {inhalt}
        </button>
      ) : (
        <div
          className="ara-liste__eintrag"
          data-aktiv={aktiv ? 'true' : 'false'}
          data-testid={kennzeichen}
        >
          {inhalt}
        </div>
      )}
    </li>
  );
}
