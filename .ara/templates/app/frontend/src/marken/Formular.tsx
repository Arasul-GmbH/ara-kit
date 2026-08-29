import type { FormEvent, ReactNode } from 'react';

/**
 * Ein Formular: Felder untereinander, Knoepfe darunter.
 *
 * ES IST EIN `form` UND KEINE ANSAMMLUNG VON FELDERN. Daran haengt mehr, als
 * es aussieht: die Eingabetaste im letzten Feld sendet ab (implizites
 * Absenden), der Browser bietet seine Hilfen an, und die
 * Oberflaechen-Abnahme misst genau das an der Anmeldung und am
 * Startpasswort-Wechsel.
 */
export interface FormularProps {
  /** Was beim Absenden passiert. `preventDefault` ist schon getan. */
  onAbsenden?: () => void;
  /** Die Knopfreihe unten. */
  aktionen?: ReactNode;
  kennzeichen?: string;
  children?: ReactNode;
}

export function Formular({ onAbsenden, aktionen, kennzeichen, children }: FormularProps) {
  const absenden = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onAbsenden?.();
  };

  return (
    <form className="ara-formular" data-testid={kennzeichen} onSubmit={absenden} noValidate>
      {children}
      {aktionen && <div className="ara-formular__aktionen">{aktionen}</div>}
    </form>
  );
}

/**
 * Ein Feld mit seiner Beschriftung.
 *
 * Die Kennung ist Pflicht, weil `label` und Eingabe ohne sie nicht
 * zusammenfinden: ein Klick auf die Beschriftung setzt dann keinen Fokus, und
 * der Screenreader liest ein Feld ohne Namen vor.
 */
export interface FeldProps {
  /** Die `id` der Eingabe darin. */
  kennung: string;
  beschriftung: string;
  hinweis?: ReactNode;
  children: ReactNode;
}

export function Feld({ kennung, beschriftung, hinweis, children }: FeldProps) {
  return (
    <div className="ara-feld">
      <label className="ara-feld__beschriftung" htmlFor={kennung}>
        {beschriftung}
      </label>
      {children}
      {hinweis && <p className="ara-feld__hinweis">{hinweis}</p>}
    </div>
  );
}

/** Haupt = die eine Handlung der Flaeche, Gefahr = die, die etwas wegnimmt. */
export type KnopfArt = 'still' | 'haupt' | 'gefahr';

export interface KnopfProps {
  art?: KnopfArt;
  /** `absenden` gehoert in ein `Formular`, sonst `knopf`. */
  typ?: 'knopf' | 'absenden';
  onKlick?: () => void;
  gesperrt?: boolean;
  kennzeichen?: string;
  beschriftung?: string;
  children: ReactNode;
}

export function Knopf({
  art = 'still',
  typ = 'knopf',
  onKlick,
  gesperrt = false,
  kennzeichen,
  beschriftung,
  children,
}: KnopfProps) {
  return (
    <button
      type={typ === 'absenden' ? 'submit' : 'button'}
      className="ara-knopf"
      data-art={art}
      data-testid={kennzeichen}
      aria-label={beschriftung}
      disabled={gesperrt}
      onClick={onKlick}
    >
      {children}
    </button>
  );
}
