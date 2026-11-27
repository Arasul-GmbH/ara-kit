import { useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import { IconKnopf } from './Glas';
import { AppIcon } from './Linien';
import type { LinienName } from './Linien';

/**
 * Die Wischzeile: eine Zeile, die man wegwischt. Nach rechts gibt sie frei,
 * nach links lehnt sie ab. Ab 40 Prozent der Breite gilt es (`schwelle`),
 * davor federt die Zeile zurueck. Fuer Maus und Finger gleich, ueber
 * Zeiger-Ereignisse.
 *
 * Wer nicht wischen kann oder will, hat den Knopf in der Zeile: er bleibt
 * immer da und gibt frei. Das Rueckgaengig (5 Sekunden) gehoert der App und
 * steht in der `Meldung`.
 */
export interface WischzeileProps {
  /** Das App-Icon links. */
  symbol?: LinienName;
  titel: ReactNode;
  unterzeile?: ReactNode;
  beiFreigeben: () => void;
  beiAblehnen: () => void;
  /** Anteil der Breite, ab dem ein Wisch gilt. Vorgabe 0,4. */
  schwelle?: number;
  /** Texte hinter der Zeile. */
  freigebenText?: string;
  ablehnenText?: string;
  kennzeichen?: string;
}

export function Wischzeile({
  symbol,
  titel,
  unterzeile,
  beiFreigeben,
  beiAblehnen,
  schwelle = 0.4,
  freigebenText = 'Freigeben',
  ablehnenText = 'Ablehnen',
  kennzeichen,
}: WischzeileProps) {
  const wurzel = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const [dx, setDx] = useState(0);
  const [raus, setRaus] = useState<'frei' | 'ab' | null>(null);

  const runter = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button > 0 || (e.target as HTMLElement).closest('button')) return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const bewegt = (e: PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const x = e.clientX - s.x;
    // Erst wenn es mehr seitlich als senkrecht geht, ist es ein Wisch.
    if (Math.abs(x) < 6 && Math.abs(e.clientY - s.y) > 6) {
      start.current = null;
      return;
    }
    if (Math.abs(x) > 6) e.currentTarget.setPointerCapture?.(e.pointerId);
    setDx(x);
  };
  const hoch = (e: PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    start.current = null;
    const breite = wurzel.current?.offsetWidth ?? 1;
    if (Math.abs(dx) >= breite * schwelle) {
      const frei = dx > 0;
      setRaus(frei ? 'frei' : 'ab');
      setDx(frei ? breite : -breite);
      setTimeout(() => (frei ? beiFreigeben() : beiAblehnen()), 160);
    } else {
      setDx(0);
    }
  };

  const richtung = dx > 0 ? 'frei' : dx < 0 ? 'ab' : null;
  const breite = wurzel.current?.offsetWidth ?? 1;
  const erreicht = Math.abs(dx) >= breite * schwelle;

  return (
    <div
      className="ara-wisch"
      ref={wurzel}
      data-richtung={richtung ?? undefined}
      data-erreicht={erreicht ? 'true' : undefined}
      data-raus={raus ?? undefined}
      data-testid={kennzeichen}
    >
      <div className="ara-wisch__hinten" aria-hidden="true">
        <span>{freigebenText}</span>
        <span>{ablehnenText}</span>
      </div>
      <div
        className="ara-wisch__zeile"
        style={{ transform: `translateX(${dx}px)`, transition: start.current ? 'none' : undefined }}
        onPointerDown={runter}
        onPointerMove={bewegt}
        onPointerUp={hoch}
        onPointerCancel={hoch}
      >
        {symbol && <AppIcon symbol={symbol} groesse={32} />}
        <div className="ara-wisch__text">
          <span className="ara-wisch__titel">{titel}</span>
          {unterzeile && <span className="ara-wisch__unterzeile">{unterzeile}</span>}
        </div>
        <IconKnopf symbol="haken" hinweis={freigebenText} art="flach" onKlick={beiFreigeben} />
      </div>
    </div>
  );
}
