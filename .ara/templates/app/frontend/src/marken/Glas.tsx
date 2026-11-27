import type { ElementType, ReactNode } from 'react';
import { Linie } from './Linien';
import type { LinienGroesse, LinienName } from './Linien';

/**
 * Glas: die Flaeche, die schwebt.
 *
 * Echtes Glas gibt es nur fuer Kopfleiste, Dock, Popups und die Kreise der
 * Icon-Knoepfe. Wo der Browser keine Unschaerfe kann, der Mensch
 * „Transparenz reduzieren“ gewaehlt hat oder das System weniger Transparenz
 * wuenscht, ist die Flaeche deckend: derselbe Ton, nur ohne Durchblick
 * (Rueckfall in `theme.css`, Abschnitt GLAS).
 */
export interface GlasProps {
  /** Das Element dahinter. Vorgabe `div`. */
  als?: ElementType;
  /** `kapsel` rundet voll, `karte` mit 20 px. Vorgabe `karte`. */
  form?: 'kapsel' | 'karte' | 'kreis';
  kennzeichen?: string;
  children?: ReactNode;
  className?: string;
}

export function Glas({
  als: Element = 'div',
  form = 'karte',
  kennzeichen,
  className,
  children,
}: GlasProps) {
  return (
    <Element
      className={className ? `ara-glas ${className}` : 'ara-glas'}
      data-form={form}
      data-testid={kennzeichen}
    >
      {children}
    </Element>
  );
}

/**
 * Der Icon-Knopf: ein Linien-Icon und ein Hinweis, der beim Ueberfahren und
 * bei Tastaturfokus erscheint. Der Hinweis ist Pflicht, denn ein Knopf ohne
 * Wort muss anderswo sagen, was er tut (Name fuer Vorlesewerkzeuge und
 * Sprechblase in einem).
 *
 * `glas` ist der Kreis auf Glas, wo der Knopf allein auf dem Inhalt steht;
 * `flach` steht in Leiste und Popup ohne zweiten Kreis. Beide sind 44 Pixel
 * gross, die Flaeche, die ein Finger braucht.
 */
export interface IconKnopfProps {
  symbol: LinienName;
  hinweis: string;
  art?: 'glas' | 'flach';
  groesse?: LinienGroesse;
  /** Gedrueckt oder gewaehlt (Live/Test, Umschalter). */
  aktiv?: boolean;
  gesperrt?: boolean;
  onKlick?: () => void;
  kennzeichen?: string;
}

export function IconKnopf({
  symbol,
  hinweis,
  art = 'glas',
  groesse = 20,
  aktiv,
  gesperrt,
  onKlick,
  kennzeichen,
}: IconKnopfProps) {
  return (
    <button
      type="button"
      className="ara-iknopf"
      data-art={art}
      data-hinweis={hinweis}
      aria-label={hinweis}
      aria-pressed={aktiv}
      disabled={gesperrt}
      onClick={onKlick}
      data-testid={kennzeichen}
    >
      <Linie name={symbol} groesse={groesse} />
    </button>
  );
}

/**
 * Die Hauptkapsel: die EINE Aktion einer Ansicht, mit einem Wort, blau.
 * Alles andere in der Ansicht ist ein Icon-Knopf oder ein Textknopf.
 */
export interface HauptkapselProps {
  children: ReactNode;
  symbol?: LinienName;
  typ?: 'knopf' | 'absenden';
  gesperrt?: boolean;
  onKlick?: () => void;
  kennzeichen?: string;
}

export function Hauptkapsel({
  children,
  symbol,
  typ = 'knopf',
  gesperrt,
  onKlick,
  kennzeichen,
}: HauptkapselProps) {
  return (
    <button
      type={typ === 'absenden' ? 'submit' : 'button'}
      className="ara-kapsel"
      disabled={gesperrt}
      onClick={onKlick}
      data-testid={kennzeichen}
    >
      {symbol && <Linie name={symbol} groesse={16} />}
      {children}
    </button>
  );
}

/**
 * Der Textknopf: leise, ohne Flaeche, mit einem Hinweis darunter, was er
 * tut. Fuer die zweite und dritte Handlung neben der Hauptkapsel („Abbrechen“,
 * „Rueckgaengig“).
 */
export interface TextKnopfProps {
  children: ReactNode;
  hinweis?: string;
  gesperrt?: boolean;
  onKlick?: () => void;
  kennzeichen?: string;
}

export function TextKnopf({ children, hinweis, gesperrt, onKlick, kennzeichen }: TextKnopfProps) {
  return (
    <button
      type="button"
      className="ara-textknopf"
      data-hinweis={hinweis}
      disabled={gesperrt}
      onClick={onKlick}
      data-testid={kennzeichen}
    >
      {children}
    </button>
  );
}
