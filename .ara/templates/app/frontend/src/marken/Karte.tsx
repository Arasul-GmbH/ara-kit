import type { ReactNode } from 'react';

/**
 * Eine Karte: die erhabene Flaeche fuer ein Ding, das fuer sich steht (eine
 * App, eine offene Freigabe, ein Antrag).
 *
 * Mit `onKlick` wird sie ein Knopf und ohne ihn ein Kasten. Das ist der
 * einzige Unterschied; eine Karte, die anklickbar AUSSIEHT und keine ist, ist
 * eine Falle.
 */
export interface KarteProps {
  titel?: string;
  /** Kurzes rechts oben: ein Stand, eine Fassung, eine Frist. */
  hinweis?: ReactNode;
  /** Steht links auf einem blau getoenten Quadrat, Titel und Inhalt daneben. */
  symbol?: ReactNode;
  onKlick?: () => void;
  kennzeichen?: string;
  children?: ReactNode;
}

export function Karte({ titel, hinweis, symbol, onKlick, kennzeichen, children }: KarteProps) {
  const kopf = (titel || hinweis) && (
    <div className="ara-karte__kopf">
      {titel && <h2 className="ara-karte__titel">{titel}</h2>}
      {hinweis && <span className="ara-karte__hinweis">{hinweis}</span>}
    </div>
  );
  const rumpf = children && <div className="ara-karte__inhalt">{children}</div>;

  // Mit Symbol eine Zeile: das Symbol auf seinem Quadrat links, Titel und
  // Inhalt rechts daneben untereinander.
  const inhalt = symbol ? (
    <>
      <span className="ara-karte__symbol" aria-hidden="true">
        {symbol}
      </span>
      <div className="ara-karte__rumpf">
        {kopf}
        {rumpf}
      </div>
    </>
  ) : (
    <>
      {kopf}
      {rumpf}
    </>
  );

  if (onKlick) {
    return (
      <button
        type="button"
        className="ara-karte"
        data-symbol={symbol ? '' : undefined}
        data-testid={kennzeichen}
        onClick={onKlick}
      >
        {inhalt}
      </button>
    );
  }

  return (
    <div className="ara-karte" data-symbol={symbol ? '' : undefined} data-testid={kennzeichen}>
      {inhalt}
    </div>
  );
}
