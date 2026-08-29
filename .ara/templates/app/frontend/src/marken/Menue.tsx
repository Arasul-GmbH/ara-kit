import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

/**
 * Das Menue hinter dem Hamburger-Knopf (Phase D7).
 *
 * Unter 900 px gibt es keine drei Spalten und keine Aktivitaetsleiste; was
 * dort links stand, steht hier. Es ist eine Flaeche UEBER der Seite, mit
 * einem Schleier davor -- und es ist das einzige Ding der Bibliothek, das
 * etwas verdeckt. Deshalb gilt fuer es dieselbe Regel wie fuer alles, was
 * verdeckt: es faengt zu an, und jede Ansicht, die kommt, macht es zu.
 *
 * Escape schliesst, ein Klick auf den Schleier schliesst, und der Fokus
 * springt beim Oeffnen hinein. Das letzte ist kein Feinschliff: wer mit der
 * Tastatur arbeitet, staende sonst mit einem offenen Menue vor einer Seite,
 * durch die er weitertabbt, als waere nichts.
 */
export interface MenueProps {
  offen: boolean;
  onSchliessen: () => void;
  titel?: string;
  kennzeichen?: string;
  children: ReactNode;
}

/** Alles, was in dieser Flaeche den Fokus annehmen kann, in Dokumentreihenfolge. */
function haltestellen(flaeche: HTMLElement | null): HTMLElement[] {
  if (!flaeche) return [];
  return [
    ...flaeche.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
    ),
  ];
}

export function Menue({ offen, onSchliessen, titel = 'Menü', kennzeichen, children }: MenueProps) {
  const flaeche = useRef<HTMLDivElement>(null);
  /** Wo der Fokus herkam. Er geht dorthin zurueck, wenn das Menue zugeht. */
  const vorher = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!offen) return undefined;
    vorher.current = document.activeElement as HTMLElement | null;

    /**
     * ESCAPE SCHLIESST, UND TAB BLEIBT DRIN.
     *
     * Die Tabulatorfalle ist von Hand und nicht von Radix, und das ist eine
     * Ausnahme mit Grund: diese Bibliothek laeuft auch in einer App OHNE
     * Buendler, die nichts installieren kann -- eine Abhaengigkeit hier waere
     * eine, die jede App mittraegt. Ohne die Falle liefe der Fokus hinter das
     * offene Menue weiter, in eine Seite, die der Mensch gar nicht sieht;
     * genau diesen Fehler haelt `scripts/test/bausteine.py` sonst auf.
     */
    const aufTaste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSchliessen();
        return;
      }
      if (e.key !== 'Tab') return;
      const halte = haltestellen(flaeche.current);
      if (halte.length === 0) return;
      const erster = halte[0] as HTMLElement;
      const letzter = halte[halte.length - 1] as HTMLElement;
      const jetzt = document.activeElement;
      if (e.shiftKey && (jetzt === erster || !flaeche.current?.contains(jetzt))) {
        e.preventDefault();
        letzter.focus();
      } else if (!e.shiftKey && jetzt === letzter) {
        e.preventDefault();
        erster.focus();
      }
    };
    document.addEventListener('keydown', aufTaste);
    haltestellen(flaeche.current)[0]?.focus();
    return () => {
      document.removeEventListener('keydown', aufTaste);
      // Zurueck, wo er herkam -- sonst faengt die Tastatur nach dem Schliessen
      // wieder ganz oben an, und wer mit ihr arbeitet, sucht seine Stelle.
      vorher.current?.focus?.();
    };
  }, [offen, onSchliessen]);

  if (!offen) return null;

  return (
    <>
      {/* Ein Knopf und kein `div`: der Schleier schliesst, und was schliesst,
          gehoert der Tastatur genauso wie dem Zeiger. */}
      <button
        type="button"
        className="ara-menue__schleier"
        aria-label={`${titel} schließen`}
        onClick={onSchliessen}
      />
      <div
        className="ara-menue"
        role="dialog"
        aria-modal="true"
        aria-label={titel}
        data-testid={kennzeichen}
        ref={flaeche}
      >
        <div className="ara-menue__kopf">
          <span>{titel}</span>
          <button
            type="button"
            className="ara-menue__zu"
            aria-label={`${titel} schließen`}
            onClick={onSchliessen}
          >
            ×
          </button>
        </div>
        <div className="ara-menue__inhalt">{children}</div>
      </div>
    </>
  );
}
