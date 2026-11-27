import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';

/**
 * Die Stufenleiste: wo ein Datensatz steht, als Reihe von Stufen. Die
 * erreichten sind blau gefuellt, die aktuelle traegt den Namen. Sie ist
 * Anzeige; wer sie bedienbar will, gibt `onWaehlen` mit.
 */
export interface StufenleisteProps {
  stufen: string[];
  /** Index der aktuellen Stufe, ab 0. */
  aktuell: number;
  onWaehlen?: (index: number) => void;
  beschriftung?: string;
}

export function Stufenleiste({
  stufen,
  aktuell,
  onWaehlen,
  beschriftung = 'Stufe',
}: StufenleisteProps) {
  return (
    <div className="ara-stufen">
      <ol className="ara-stufen__reihe" aria-label={beschriftung}>
        {stufen.map((name, i) => {
          const zustand = i < aktuell ? 'erreicht' : i === aktuell ? 'jetzt' : 'offen';
          const inhalt = (
            <>
              <span className="ara-stufen__balken" aria-hidden="true" />
              <span className="ara-stufen__name">{name}</span>
            </>
          );
          return (
            <li key={name} className="ara-stufen__stufe" data-zustand={zustand}>
              {onWaehlen ? (
                <button
                  type="button"
                  className="ara-stufen__knopf"
                  aria-current={i === aktuell ? 'step' : undefined}
                  onClick={() => onWaehlen(i)}
                >
                  {inhalt}
                </button>
              ) : (
                <span
                  className="ara-stufen__knopf"
                  aria-current={i === aktuell ? 'step' : undefined}
                >
                  {inhalt}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <span className="ara-stufen__jetzt" aria-hidden="true">
        {stufen[aktuell]}
      </span>
    </div>
  );
}

export interface ReiterEintrag {
  id: string;
  titel: string;
  /** Eine Zahl hinter dem Titel, etwa die Zahl der Anhaenge. */
  zahl?: number;
}

/** Zwei Geschwister, ein Verhalten: waehlen aus einer Reihe mit Pfeiltasten. */
function pfeile(
  e: KeyboardEvent<HTMLElement>,
  ids: string[],
  aktiv: string,
  waehlen: (id: string) => void
) {
  const schritt = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
  if (e.key === 'Home' || e.key === 'End' || schritt) {
    e.preventDefault();
    const i = ids.indexOf(aktiv);
    const nach =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? ids.length - 1
          : (i + schritt + ids.length) % ids.length;
    waehlen(ids[nach] as string);
    const knoepfe = e.currentTarget.querySelectorAll<HTMLElement>('[role]');
    knoepfe[nach]?.focus();
  }
}

/** Die Gleitmarke unter dem aktiven Knopf einer Reihe. */
function useMarke(aktiv: string) {
  const wurzel = useRef<HTMLDivElement>(null);
  const [marke, setMarke] = useState<CSSProperties | undefined>();
  useLayoutEffect(() => {
    const messen = () => {
      const knopf = wurzel.current?.querySelector<HTMLElement>(
        '[aria-selected="true"],[aria-checked="true"]'
      );
      if (!knopf) return;
      const x = `${knopf.offsetLeft}px`;
      const b = `${knopf.offsetWidth}px`;
      setMarke(alt =>
        alt &&
        alt['--ara-marke-x' as keyof CSSProperties] === x &&
        alt['--ara-marke-b' as keyof CSSProperties] === b
          ? alt
          : ({ '--ara-marke-x': x, '--ara-marke-b': b } as CSSProperties)
      );
    };
    messen();
    // Nach dem Laden der Schrift sind die Knoepfe breiter als zuvor.
    void document.fonts?.ready.then(messen);
    if (typeof ResizeObserver === 'undefined' || !wurzel.current) return undefined;
    const beobachter = new ResizeObserver(messen);
    beobachter.observe(wurzel.current);
    return () => beobachter.disconnect();
  }, [aktiv]);
  return { wurzel, marke };
}

/**
 * Reiter: „Daten | Anhaenge | Notizen“. Eine Linie unter dem aktiven gleitet
 * zum naechsten. Der Inhalt gehoert der App; `kennzeichenFuer` gibt ihr die
 * Kennung des Reiters, damit sie `aria-labelledby` setzen kann.
 */
export interface ReiterProps {
  eintraege: ReiterEintrag[];
  aktiv: string;
  onWaehlen: (id: string) => void;
  beschriftung?: string;
}

export function Reiter({ eintraege, aktiv, onWaehlen, beschriftung = 'Reiter' }: ReiterProps) {
  const { wurzel, marke } = useMarke(aktiv);
  const ids = eintraege.map(e => e.id);
  return (
    <div
      className="ara-reiter"
      role="tablist"
      aria-label={beschriftung}
      ref={wurzel}
      style={marke}
      onKeyDown={e => pfeile(e, ids, aktiv, onWaehlen)}
    >
      {eintraege.map(e => (
        <button
          key={e.id}
          type="button"
          role="tab"
          id={`ara-reiter-${e.id}`}
          className="ara-reiter__knopf"
          aria-selected={e.id === aktiv}
          tabIndex={e.id === aktiv ? 0 : -1}
          onClick={() => onWaehlen(e.id)}
        >
          {e.titel}
          {e.zahl ? <span className="ara-reiter__zahl">{e.zahl}</span> : null}
        </button>
      ))}
      <span className="ara-reiter__marke" aria-hidden="true" />
    </div>
  );
}

export interface SegmentEintrag {
  id: string;
  titel: ReactNode;
  /** Vorlesename, wenn der Titel nur ein Symbol ist. */
  beschriftung?: string;
}

/**
 * Der Segmentschalter: eine Wahl aus zwei bis vier, als Pille mit gleitender
 * Flaeche (Hell | Dunkel, Anfrage | Idee | Feedback).
 */
export interface SegmenteProps {
  eintraege: SegmentEintrag[];
  wert: string;
  onWaehlen: (id: string) => void;
  beschriftung: string;
}

export function Segmente({ eintraege, wert, onWaehlen, beschriftung }: SegmenteProps) {
  const { wurzel, marke } = useMarke(wert);
  const ids = eintraege.map(e => e.id);
  return (
    <div
      className="ara-segmente"
      role="radiogroup"
      aria-label={beschriftung}
      ref={wurzel}
      style={marke}
      onKeyDown={e => pfeile(e, ids, wert, onWaehlen)}
    >
      <span className="ara-segmente__marke" aria-hidden="true" />
      {eintraege.map(e => (
        <button
          key={e.id}
          type="button"
          role="radio"
          className="ara-segmente__knopf"
          aria-checked={e.id === wert}
          aria-label={e.beschriftung}
          tabIndex={e.id === wert ? 0 : -1}
          onClick={() => onWaehlen(e.id)}
        >
          {e.titel}
        </button>
      ))}
    </div>
  );
}
