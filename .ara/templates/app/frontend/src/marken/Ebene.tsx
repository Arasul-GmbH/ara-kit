import { useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import { useFokusfalle } from './fokusfalle';
import { IconKnopf } from './Glas';

/**
 * Eine Ebene ueber der Ansicht, in zwei Arten.
 *
 *   blatt      Einzelheiten und Formulare. Am Rechner schwebt es rechts mit
 *              8 Pixel Abstand, unter 900 Pixeln steigt es von unten auf, mit
 *              einem Griff, an dem man es wegwischt.
 *   vollbild   eine ganze Ansicht ueber allem, zurueck ueber ein schwebendes
 *              Glas-X oder Escape (die Demo, ein Dokument).
 *
 * Das Blatt der Muster (`Blatt`) ist die Form mit Tailwind fuer eine App mit
 * Bau; diese hier laeuft auch ohne.
 */
export interface EbeneProps {
  offen: boolean;
  onSchliessen: () => void;
  art?: 'blatt' | 'vollbild';
  titel: string;
  /** Die Aktionen unten im Blatt, in der Regel die Hauptkapsel. */
  aktionen?: ReactNode;
  kennzeichen?: string;
  children?: ReactNode;
}

/** Wie weit man nach unten wischen muss, damit das Blatt zugeht. */
const WEGWISCHEN_PX = 80;

export function Ebene({
  offen,
  onSchliessen,
  art = 'blatt',
  titel,
  aktionen,
  kennzeichen,
  children,
}: EbeneProps) {
  const flaeche = useRef<HTMLDivElement>(null);
  const start = useRef<number | null>(null);
  const [versatz, setVersatz] = useState(0);
  useFokusfalle(offen, flaeche, onSchliessen);

  if (!offen) return null;

  const runter = (e: PointerEvent<HTMLElement>) => {
    start.current = e.clientY;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const bewegt = (e: PointerEvent<HTMLElement>) => {
    if (start.current === null) return;
    setVersatz(Math.max(0, e.clientY - start.current));
  };
  const hoch = () => {
    if (start.current === null) return;
    const weit = versatz > WEGWISCHEN_PX;
    start.current = null;
    setVersatz(0);
    if (weit) onSchliessen();
  };

  return (
    <>
      {art === 'blatt' && (
        <button
          type="button"
          tabIndex={-1}
          className="ara-ebene__schleier"
          aria-label={`${titel} schließen`}
          onClick={onSchliessen}
        />
      )}
      <div
        className="ara-ebene"
        data-art={art}
        role="dialog"
        aria-modal="true"
        aria-label={titel}
        data-testid={kennzeichen}
        ref={flaeche}
        style={versatz ? { transform: `translateY(${versatz}px)`, transition: 'none' } : undefined}
      >
        {art === 'blatt' ? (
          <>
            <div
              className="ara-ebene__griff"
              onPointerDown={runter}
              onPointerMove={bewegt}
              onPointerUp={hoch}
              onPointerCancel={hoch}
            >
              <span />
            </div>
            <div className="ara-ebene__kopf">
              <h2 className="ara-ebene__titel">{titel}</h2>
              <IconKnopf
                symbol="schliessen"
                hinweis="Schließen"
                art="flach"
                onKlick={onSchliessen}
              />
            </div>
            <div className="ara-ebene__rumpf">{children}</div>
            {aktionen && <div className="ara-ebene__aktionen">{aktionen}</div>}
          </>
        ) : (
          <>
            <div className="ara-ebene__x">
              <IconKnopf symbol="schliessen" hinweis="Schließen" onKlick={onSchliessen} />
            </div>
            <div className="ara-ebene__rumpf" data-vollbild="true">
              {children}
            </div>
          </>
        )}
      </div>
    </>
  );
}
