import { type ReactNode } from 'react';
import { Inbox } from 'lucide-react';

import { cn } from '../cn';

/**
 * Was an der Stelle einer leeren Liste steht.
 *
 * ER SAGT, WIE SIE SICH FUELLT -- das ist sein Zweck und nicht ein Zusatz.
 * Eine leere Flaeche mit „Keine Einträge" ist eine Sackgasse: sie erklaert
 * den Zustand und laesst den Menschen damit stehen. Deshalb ist `aktion` der
 * wichtigste Teil, und deshalb ist `titel` Pflicht.
 *
 * SEIT H4 IN DER BIBLIOTHEK. Er stand als `components/ui/EmptyState.tsx` in
 * der Shell; eine Fachanwendung mit einer Liste braucht ihn genauso und
 * haette sich einen zweiten gebaut. Was beim Umzug blieb, sind die drei
 * Schaerfungen aus Plan 023 C1, alle an dem gemessen, was die Aufrufer
 * wirklich uebergeben: der Titel ist Pflicht; die Groesse des Symbols setzt
 * der Baustein und nicht der Aufrufer (`text-5xl` an einer Umhuellung wirkt
 * auf ein SVG mit eigener Groessenklasse nicht, und das voreingestellte
 * `size-12` fiel dadurch doppelt so gross aus wie die `size-6` daneben);
 * und das `opacity-50` auf ohnehin gedaempftem Grau ist weg, es ergab knapp
 * lesbaren Kontrast.
 *
 * `role="status"`: das Ausbleiben von Ergebnissen ist eine Auskunft, und ein
 * Screenreader soll sie bekommen, ohne dass ihn etwas unterbricht.
 */
export interface LeerzustandProps {
  /** Symbol, in `size-6` gesetzt. Ohne Angabe ein Posteingang. */
  symbol?: ReactNode;
  titel: string;
  beschreibung?: ReactNode;
  /** Der Einstieg: ein Knopf oder Verweis, der die Liste fuellt. */
  aktion?: ReactNode;
  className?: string;
}

export function Leerzustand({ symbol, titel, beschreibung, aktion, className }: LeerzustandProps) {
  return (
    <div
      className={cn(
        'mx-auto flex max-w-96 flex-col items-center justify-center p-8 text-center',
        className
      )}
      role="status"
    >
      <div className="mb-3 text-muted-foreground [&>svg]:size-6" aria-hidden="true">
        {symbol || <Inbox />}
      </div>
      <div className="text-ui-lg font-semibold text-foreground">{titel}</div>
      {beschreibung && <div className="mt-1 text-ui-sm text-muted-foreground">{beschreibung}</div>}
      {aktion && <div className="mt-4">{aktion}</div>}
    </div>
  );
}
