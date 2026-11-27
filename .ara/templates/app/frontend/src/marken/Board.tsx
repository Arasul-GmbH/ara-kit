import { useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';

/**
 * Das Board: Stufen nebeneinander, Karten darin, frei ziehbar.
 *
 * Gezogen wird ueber Zeiger-Ereignisse und nie ueber HTML5-Ziehen, denn das
 * kennt kein Touch. Die Maus zieht nach 4 Pixeln Bewegung, ein Finger nach
 * 400 Millisekunden Halten (vorher rollt die Seite). Eine Karte laesst sich
 * auf jede Stufe ziehen; ob das erlaubt ist oder nach einem Grund fragt, sagt
 * die App in `beiVerschieben`. Mit der Tastatur: Pfeil links und rechts bei
 * gehaltener Alt-Taste verschiebt auf die Nachbarstufe, Enter oeffnet.
 *
 * Am Rechner stehen die Stufen als Spalten (280 Pixel), unter 900 Pixeln als
 * Liste mit den Stufen als Zwischenueberschrift.
 */
export interface BoardStufe {
  id: string;
  titel: string;
  /** Blass: die Stufe ist fuer diesen Menschen nicht zu bedienen. */
  blass?: boolean;
}

export interface BoardKarte {
  id: string;
  stufe: string;
  titel: string;
  /** Die Nummer, klein und grau oben. */
  nummer: string;
  /** Hoechstens ein Etikett. */
  etikett?: string;
}

export interface BoardProps {
  stufen: BoardStufe[];
  karten: BoardKarte[];
  beiVerschieben: (karte: BoardKarte, nachStufe: BoardStufe) => void;
  beiOeffnen?: (karte: BoardKarte) => void;
  beschriftung?: string;
  kennzeichen?: string;
  /** Was in einer leeren Stufe steht. */
  leerText?: ReactNode;
}

/** Wie lange ein Finger halten muss, bevor die Karte sich ziehen laesst. */
export const ZIEHEN_NACH_MS = 400;
const ZIEHEN_AB_PX = 4;

interface Zug {
  id: string;
  pointerId: number;
  art: string;
  x0: number;
  y0: number;
  aktiv: boolean;
  timer?: ReturnType<typeof setTimeout>;
}

export function Board({
  stufen,
  karten,
  beiVerschieben,
  beiOeffnen,
  beschriftung = 'Board',
  kennzeichen,
  leerText = 'Leer',
}: BoardProps) {
  const zug = useRef<Zug | null>(null);
  const [zieht, setZieht] = useState<string | null>(null);
  const [ziel, setZiel] = useState<string | null>(null);
  const [versatz, setVersatz] = useState({ x: 0, y: 0 });
  /** Nach einem Zug folgt ein Klick; der oeffnet nichts. */
  const jungerZug = useRef(false);

  const stufeUnter = (x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-stufe]');
    return el?.dataset.stufe ?? null;
  };

  const beginnen = (z: Zug, e: PointerEvent<HTMLElement>) => {
    z.aktiv = true;
    setZieht(z.id);
    e.currentTarget.setPointerCapture?.(z.pointerId);
  };

  const runter = (karte: BoardKarte, e: PointerEvent<HTMLElement>) => {
    if (e.button > 0) return;
    const z: Zug = {
      id: karte.id,
      pointerId: e.pointerId,
      art: e.pointerType,
      x0: e.clientX,
      y0: e.clientY,
      aktiv: false,
    };
    zug.current = z;
    if (e.pointerType !== 'mouse') {
      const knoten = e.currentTarget;
      z.timer = setTimeout(() => {
        if (zug.current === z) {
          z.aktiv = true;
          setZieht(z.id);
          knoten.setPointerCapture?.(z.pointerId);
        }
      }, ZIEHEN_NACH_MS);
    }
  };

  const bewegt = (e: PointerEvent<HTMLElement>) => {
    const z = zug.current;
    if (!z || z.pointerId !== e.pointerId) return;
    const dx = e.clientX - z.x0;
    const dy = e.clientY - z.y0;
    if (!z.aktiv) {
      if (z.art === 'mouse' && Math.hypot(dx, dy) > ZIEHEN_AB_PX) beginnen(z, e);
      else if (z.art !== 'mouse' && Math.hypot(dx, dy) > 10) {
        // Ein Finger, der vor der Haltezeit wandert, will rollen, nicht ziehen.
        clearTimeout(z.timer);
        zug.current = null;
      }
      return;
    }
    setVersatz({ x: dx, y: dy });
    setZiel(stufeUnter(e.clientX, e.clientY));
  };

  const hoch = (karte: BoardKarte, e: PointerEvent<HTMLElement>) => {
    const z = zug.current;
    if (!z || z.pointerId !== e.pointerId) return;
    clearTimeout(z.timer);
    zug.current = null;
    if (z.aktiv) {
      jungerZug.current = true;
      setTimeout(() => (jungerZug.current = false), 0);
      const nach = stufeUnter(e.clientX, e.clientY);
      const stufe = stufen.find(s => s.id === nach);
      if (stufe && stufe.id !== karte.stufe) beiVerschieben(karte, stufe);
    }
    setZieht(null);
    setZiel(null);
    setVersatz({ x: 0, y: 0 });
  };

  const aufTaste = (karte: BoardKarte, e: KeyboardEvent<HTMLElement>) => {
    if (!e.altKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    const i = stufen.findIndex(s => s.id === karte.stufe);
    const nach = stufen[i + (e.key === 'ArrowRight' ? 1 : -1)];
    if (nach) {
      e.preventDefault();
      beiVerschieben(karte, nach);
    }
  };

  return (
    <div className="ara-board" role="group" aria-label={beschriftung} data-testid={kennzeichen}>
      {stufen.map(stufe => {
        const inStufe = karten.filter(k => k.stufe === stufe.id);
        return (
          <section
            key={stufe.id}
            className="ara-board__stufe"
            data-stufe={stufe.id}
            data-blass={stufe.blass ? 'true' : undefined}
            data-ziel={ziel === stufe.id && zieht ? 'true' : undefined}
            aria-label={stufe.titel}
          >
            <h3 className="ara-board__kopf">
              <span>{stufe.titel}</span>
              <span className="ara-board__zaehler">{inStufe.length}</span>
            </h3>
            <div className="ara-board__karten">
              {inStufe.length === 0 && <p className="ara-board__leer">{leerText}</p>}
              {inStufe.map(karte => (
                <button
                  key={karte.id}
                  type="button"
                  className="ara-board__karte"
                  data-zieht={zieht === karte.id ? 'true' : undefined}
                  style={
                    zieht === karte.id
                      ? { transform: `translate(${versatz.x}px, ${versatz.y}px)` }
                      : undefined
                  }
                  onPointerDown={e => runter(karte, e)}
                  onPointerMove={bewegt}
                  onPointerUp={e => hoch(karte, e)}
                  onPointerCancel={e => hoch(karte, e)}
                  onKeyDown={e => aufTaste(karte, e)}
                  onClick={() => {
                    if (!jungerZug.current) beiOeffnen?.(karte);
                  }}
                >
                  <span className="ara-board__titel">{karte.titel}</span>
                  <span className="ara-board__nummer">{karte.nummer}</span>
                  {karte.etikett && <span className="ara-board__etikett">{karte.etikett}</span>}
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
