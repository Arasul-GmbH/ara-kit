import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { IconKnopf } from './Glas';
import { Linie } from './Linien';

/** Was fuer eine Meldung es ist. Die Farbe folgt daraus, nicht umgekehrt. */
export type MeldungsArt = 'hinweis' | 'erfolg' | 'warnung' | 'fehler';

/**
 * Eine Meldung des Geraets an den Menschen.
 *
 * `role` haengt an der Art: ein Fehler ist eine `alert` (der Screenreader
 * unterbricht), alles andere ein `status` (er liest es, wenn er dran ist).
 * Und die Art steht immer auch im TEXT: eine Meldung, die nur an ihrer
 * Farbe zu erkennen ist, ist fuer manche Menschen keine.
 *
 * Mit `beiRueckgaengig` traegt die Meldung einen Textknopf „Rückgängig“ und
 * einen Streifen, der die Frist (Vorgabe 5 Sekunden) abzaehlt; danach ruft
 * sie `beiAblauf`, und die App nimmt die Meldung weg. Die Handlung ist da
 * schon getan, die Meldung bietet nur den Weg zurueck.
 */
export interface MeldungProps {
  art?: MeldungsArt;
  titel?: string;
  kennzeichen?: string;
  /** Gibt es das, steht „Rückgängig“ in der Meldung. */
  beiRueckgaengig?: () => void;
  /** Die Frist in Millisekunden. Vorgabe 5000. */
  frist?: number;
  /** Nach Ablauf der Frist. */
  beiAblauf?: () => void;
  children?: ReactNode;
}

export const RUECKGAENGIG_FRIST_MS = 5000;

export function Meldung({
  art = 'hinweis',
  titel,
  kennzeichen,
  beiRueckgaengig,
  frist = RUECKGAENGIG_FRIST_MS,
  beiAblauf,
  children,
}: MeldungProps) {
  const ablauf = useRef(beiAblauf);
  ablauf.current = beiAblauf;
  const mitFrist = Boolean(beiRueckgaengig);
  useEffect(() => {
    if (!mitFrist) return undefined;
    const uhr = setTimeout(() => ablauf.current?.(), frist);
    return () => clearTimeout(uhr);
  }, [mitFrist, frist]);

  return (
    <div
      className={mitFrist ? 'ara-glas ara-meldung' : 'ara-meldung'}
      data-form={mitFrist ? 'kapsel' : undefined}
      data-art={art}
      data-rueckgaengig={mitFrist ? 'true' : undefined}
      data-testid={kennzeichen}
      role={art === 'fehler' ? 'alert' : 'status'}
    >
      {mitFrist && <Linie name="haken" groesse={20} />}
      <div className="ara-meldung__text">
        {titel && <p className="ara-meldung__titel">{titel}</p>}
        {children}
      </div>
      {beiRueckgaengig && (
        <IconKnopf
          symbol="rueckgaengig"
          hinweis="Rückgängig"
          art="flach"
          onKlick={beiRueckgaengig}
        />
      )}
      {mitFrist && (
        <span
          className="ara-meldung__frist"
          style={{ animationDuration: `${frist}ms` }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
