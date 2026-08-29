'use client';

import * as React from 'react';
import { CalendarIcon } from 'lucide-react';

import { cn } from '../cn';
import { Button } from './button';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

/** Ein Datum auf Deutsch: 4. September 2026. */
const LANG = new Intl.DateTimeFormat('de-DE', { dateStyle: 'long' });

/**
 * Ein Datum waehlen: der Knopf, der den Kalender aufmacht.
 *
 * SHADCN GIBT DAFUER EIN REZEPT UND KEINEN BAUSTEIN -- `Popover` plus
 * `Calendar` plus `Button`, in jeder Anwendung neu zusammengesetzt. Genau
 * so entstehen zwanzig Kopfstellen mit derselben Klassenkette (Plan 023).
 * Hier ist es EIN Baustein, und das Datumsformat steht darin: `de-DE`,
 * lang geschrieben. „04.09.2026" und „09/04/2026" sind dieselben Zeichen in
 * anderer Reihenfolge, und wer sich einmal vertut, merkt es nie.
 *
 * Er ist gesteuert (`wert`/`aufWert`) und bringt keinen eigenen Zustand
 * mit: ein Formular, das nicht weiss, was in seinem Feld steht, ist keins.
 */
export interface DatePickerProps {
  /** Das gewaehlte Datum. `undefined` heisst: noch keins. */
  wert?: Date;
  aufWert?: (datum: Date | undefined) => void;
  /** Was im Knopf steht, solange nichts gewaehlt ist. */
  platzhalter?: string;
  disabled?: boolean;
  /** Fuer das Formular: der Knopf traegt ihn als `id`. */
  id?: string;
  className?: string;
}

function DatePicker({
  wert,
  aufWert,
  platzhalter = 'Datum wählen',
  disabled,
  id,
  className,
}: DatePickerProps) {
  const [offen, setOffen] = React.useState(false);

  return (
    <Popover open={offen} onOpenChange={setOffen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          data-slot="date-picker"
          data-leer={wert ? undefined : true}
          className={cn(
            'w-56 justify-start font-normal data-[leer=true]:text-muted-foreground',
            className
          )}
        >
          <CalendarIcon />
          {wert ? LANG.format(wert) : platzhalter}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={wert}
          onSelect={datum => {
            aufWert?.(datum);
            setOffen(false);
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker };
