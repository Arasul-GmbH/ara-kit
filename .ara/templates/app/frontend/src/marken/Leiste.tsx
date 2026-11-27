import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Linie } from './Linien';
import type { LinienName } from './Linien';

/**
 * Die Glasleiste: durchgehend, oben. Links der Vogel oder, ab der zweiten
 * Ebene, „vorige Ebene“; in der Mitte, wenn es etwas zu sagen gibt, der
 * Titel; rechts flache Icons. Im Test traegt sie einen 2 Pixel breiten
 * blauen Streifen am unteren Rand, damit niemand vergisst, wo er ist.
 */
export interface GlasleisteProps {
  links?: ReactNode;
  mitte?: ReactNode;
  rechts?: ReactNode;
  /** Der Teststand: ein blauer Streifen unten. */
  test?: boolean;
  /** Vorlesename der Leiste. */
  beschriftung?: string;
  kennzeichen?: string;
}

export function Glasleiste({
  links,
  mitte,
  rechts,
  test,
  beschriftung = 'Kopfleiste',
  kennzeichen,
}: GlasleisteProps) {
  return (
    <header
      className="ara-glas ara-leiste"
      data-test={test ? 'true' : undefined}
      data-testid={kennzeichen}
      aria-label={beschriftung}
    >
      <div className="ara-leiste__links">{links}</div>
      {mitte && <div className="ara-leiste__mitte">{mitte}</div>}
      <div className="ara-leiste__rechts">{rechts}</div>
    </header>
  );
}

/**
 * Das Dock: eine Glaspille mittig unten mit gleitender Markierung unter dem
 * aktiven Eintrag. Das Plus steht mittig und ist die einzige blaue Flaeche;
 * eine Zahl (offene Freigaben) steht als blaue Marke am Eintrag, ohne Zahl
 * keine Markierung.
 */
export interface DockProps {
  beschriftung?: string;
  kennzeichen?: string;
  children: ReactNode;
}

export function Dock({ beschriftung = 'Hauptnavigation', kennzeichen, children }: DockProps) {
  const wurzel = useRef<HTMLElement>(null);
  const [marke, setMarke] = useState<{ x: number; b: number } | null>(null);

  useLayoutEffect(() => {
    const messen = () => {
      const aktiv = wurzel.current?.querySelector<HTMLElement>('[aria-current="page"]');
      const neu = aktiv ? { x: aktiv.offsetLeft, b: aktiv.offsetWidth } : null;
      // Nur setzen, was sich geaendert hat: ohne den Vergleich loest jede
      // Messung die naechste aus.
      setMarke(alt => (alt?.x === neu?.x && alt?.b === neu?.b ? alt : neu));
    };
    messen();
    void document.fonts?.ready.then(messen);
    if (typeof ResizeObserver === 'undefined' || !wurzel.current) return undefined;
    const beobachter = new ResizeObserver(messen);
    beobachter.observe(wurzel.current);
    return () => beobachter.disconnect();
  });

  const stil = marke
    ? ({ '--ara-dock-x': `${marke.x}px`, '--ara-dock-b': `${marke.b}px` } as CSSProperties)
    : undefined;

  return (
    <nav
      className="ara-glas ara-dock"
      aria-label={beschriftung}
      data-testid={kennzeichen}
      ref={wurzel}
      style={stil}
    >
      {marke && <span className="ara-dock__marke" aria-hidden="true" />}
      {children}
    </nav>
  );
}

export interface DockEintragProps {
  symbol: LinienName;
  beschriftung: string;
  aktiv?: boolean;
  /** Offene Dinge, als blaue Zahl. Null oder fehlend: keine Marke. */
  zahl?: number;
  /** Das Plus in der Mitte: blau und rund. */
  plus?: boolean;
  onKlick?: () => void;
  kennzeichen?: string;
}

export function DockEintrag({
  symbol,
  beschriftung,
  aktiv,
  zahl,
  plus,
  onKlick,
  kennzeichen,
}: DockEintragProps) {
  return (
    <button
      type="button"
      className="ara-dock__eintrag"
      data-plus={plus ? 'true' : undefined}
      aria-label={zahl ? `${beschriftung}, ${zahl} offen` : beschriftung}
      aria-current={aktiv ? 'page' : undefined}
      onClick={onKlick}
      data-testid={kennzeichen}
    >
      <Linie name={symbol} groesse={plus ? 24 : 20} />
      {!plus && <span className="ara-dock__wort">{beschriftung}</span>}
      {zahl ? <span className="ara-dock__zahl">{zahl > 99 ? '99+' : zahl}</span> : null}
    </button>
  );
}
