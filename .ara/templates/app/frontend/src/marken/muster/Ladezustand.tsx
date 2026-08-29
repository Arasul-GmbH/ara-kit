import { memo } from 'react';

import { cn } from '../cn';

/**
 * Was dasteht, solange die Antwort unterwegs ist.
 *
 * ER IST NICHT DIE EINZIGE ANTWORT AUF „ES LAEDT". Wo die FORM des
 * Ergebnisses schon feststeht -- eine Liste, eine Karte, eine Tabelle --,
 * ist ein Platzhalter in dieser Form (`Skeleton`) die bessere: die Seite
 * springt beim Eintreffen nicht. Der Kreisel hier ist fuer den anderen Fall,
 * in dem noch gar nichts ueber das Ergebnis bekannt ist: der erste Aufbau
 * einer Ansicht, ein Vorgang, der laeuft.
 *
 * SEIT H4 IN DER BIBLIOTHEK. Er stand als `components/ui/LoadingSpinner.tsx`
 * in der Shell. Die zwei Bewegungen dahinter (`spinner-rotate`,
 * `message-pulse`) sind mit ihm nach `theme.css` gezogen -- eine App mit Bau
 * laedt die Tokens, und ohne die Bilder waere der Kreisel dort ein
 * stillstehender Ring.
 *
 * `role="status"` mit `aria-live="polite"`: die Auskunft „es laeuft noch"
 * gehoert vorgelesen, aber sie unterbricht nichts.
 */
export interface LadezustandProps {
  /** Der Satz darunter. `null` laesst ihn weg (der Screenreader hoert ihn trotzdem). */
  meldung?: string | null;
  /** Fuellt den Bildschirm statt nur seinen Platz. */
  ganzeSeite?: boolean;
  groesse?: 'klein' | 'mittel' | 'gross';
  className?: string;
}

const MASSE = {
  klein: { kasten: 'size-8', rand: 'border-2' },
  mittel: { kasten: 'size-16', rand: 'border-3' },
  gross: { kasten: 'size-20', rand: 'border-4' },
} as const;

/**
 * Vier Ringe, versetzt gestartet. Die Farbe wird nach hinten schwaecher --
 * das ist derselbe Verlauf wie in `SERIENFARBEN` und aus demselben Grund:
 * eine zweite Farbe wuerde eine zweite Bedeutung behaupten.
 */
const RINGE = [
  'border-t-primary',
  'border-t-primary/80',
  'border-t-primary/60',
  'border-t-primary/50',
];

const VERZUG = ['0ms', '-150ms', '-300ms', '-450ms'];

export const Ladezustand = memo(function Ladezustand({
  meldung = 'Laden...',
  ganzeSeite = false,
  groesse = 'gross',
  className,
}: LadezustandProps) {
  const mass = MASSE[groesse];

  return (
    <div
      // Die `loading-spinner*`-Klassen sind keine Zierde und kein Ueberrest:
      // an ihnen haengt die Regel fuer `prefers-reduced-motion` (der Kreisel
      // wird langsamer, statt zu verschwinden). Sie steht seit H4 neben den
      // Bildern in `theme.css`, damit sie auch in einer App gilt.
      className={cn(
        'loading-spinner flex flex-col items-center justify-center',
        ganzeSeite
          ? 'loading-spinner-fullscreen min-h-screen bg-background'
          : 'loading-spinner-inline p-12',
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className={cn('spinner-animation relative', mass.kasten)} aria-hidden="true">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={cn(
              'spinner-ring absolute inset-0 rounded-full border-transparent animate-[spinner-rotate_1.2s_cubic-bezier(0.4,0,0.2,1)_infinite]',
              mass.rand,
              RINGE[i]
            )}
            style={{ animationDelay: VERZUG[i] }}
          />
        ))}
      </div>
      {meldung ? (
        <p className="spinner-message mt-6 animate-[message-pulse_2s_ease-in-out_infinite] text-ui-lg font-medium text-muted-foreground">
          {meldung}
        </p>
      ) : (
        <span className="sr-only">Wird geladen...</span>
      )}
    </div>
  );
});
