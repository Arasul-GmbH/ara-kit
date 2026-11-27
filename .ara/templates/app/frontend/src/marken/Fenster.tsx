import type { ReactNode } from 'react';
import { AppIcon } from './Linien';
import type { LinienName } from './Linien';

/**
 * Das schlanke Fenster: weiss, rund, mit einer duennen Glasleiste oben, in
 * der das App-Icon, der Titel und die noetigen Icons stehen. Es hat eine
 * feste Hoehe und scrollt nicht; was nicht hineinpasst, gehoert in eine
 * andere Anordnung, nicht in einen Rollkasten. Es zeigt eine bedienbare App
 * in klein, etwa auf einer Website.
 */
export interface FensterProps {
  titel: string;
  symbol: LinienName;
  /** Die Icon-Knoepfe rechts in der Leiste (Plus, Zuruecksetzen). */
  werkzeuge?: ReactNode;
  /** Ein Knopf links vor dem Titel, etwa „vorige Ebene“. */
  zurueck?: ReactNode;
  /** Feste Hoehe in Pixeln. Vorgabe 420. */
  hoehe?: number;
  kennzeichen?: string;
  children?: ReactNode;
}

export function Fenster({
  titel,
  symbol,
  werkzeuge,
  zurueck,
  hoehe = 420,
  kennzeichen,
  children,
}: FensterProps) {
  return (
    <section
      className="ara-fenster"
      style={{ height: hoehe }}
      aria-label={titel}
      data-testid={kennzeichen}
    >
      <div className="ara-glas ara-fenster__leiste" data-form="leiste">
        {zurueck}
        <AppIcon symbol={symbol} groesse={32} />
        <span className="ara-fenster__titel">{titel}</span>
        <div className="ara-fenster__werkzeuge">{werkzeuge}</div>
      </div>
      <div className="ara-fenster__inhalt">{children}</div>
    </section>
  );
}
