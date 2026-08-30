'use client';

import * as React from 'react';
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react';

import { cn } from '../cn';
import { Button } from '../primitive/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../primitive/command';
import { Popover, PopoverContent, PopoverTrigger } from '../primitive/popover';

/**
 * Die Suchauswahl -- anderswo »Combobox«.
 *
 * EIN DING, EIN NAME. shadcn fuehrt »Combobox« nicht als Baustein, sondern
 * als Rezept: `Popover` plus `Command` plus `Button`, in jeder Anwendung neu
 * zusammengesetzt. Genau daraus entstehen zwanzig Kopfstellen mit derselben
 * Klassenkette (Plan 023). Hier ist es ein Baustein, und er heisst wie das,
 * was er tut.
 *
 * WANN STATT `Select`. Ein `Select` zeigt alles und laesst waehlen; bis etwa
 * zehn Eintraegen ist das der schnellere Weg, weil Lesen schneller ist als
 * Tippen. Darueber kippt es: wer weiss, wie sein Eintrag heisst, tippt drei
 * Buchstaben, und wer es nicht weiss, scrollt sowieso. Ab dreissig Eintraegen
 * ist ein `Select` keine Auswahl mehr, sondern eine Liste mit einem Deckel.
 *
 * SIE IST GESTEUERT. Kein eigener Zustand fuer den Wert: ein Formular, das
 * nicht weiss, was in seinem Feld steht, ist keins. Was hier innen liegt,
 * ist nur, ob die Liste offen ist.
 */
export interface SuchauswahlMoeglichkeit {
  /** Der Wert, der nach aussen geht. */
  wert: string;
  /** Was der Mensch liest -- und wonach gesucht wird. */
  name: string;
  /** Eine zweite Zeile darunter, etwa eine Kennung. Wird mitgesucht. */
  hinweis?: string;
  disabled?: boolean;
}

export interface SuchauswahlProps {
  moeglichkeiten: readonly SuchauswahlMoeglichkeit[];
  /** Der gewaehlte Wert. Leer heisst: noch keiner. */
  wert?: string;
  aufWert: (wert: string) => void;
  /** Was im Knopf steht, solange nichts gewaehlt ist. */
  platzhalter?: string;
  /** Was im Suchfeld steht. */
  suchPlatzhalter?: string;
  /** Was dasteht, wenn nichts passt. */
  leerText?: string;
  disabled?: boolean;
  /** Fuer ein Formular: der Knopf traegt sie als `id`. */
  id?: string;
  className?: string;
}

export function Suchauswahl({
  moeglichkeiten,
  wert,
  aufWert,
  platzhalter = 'Auswählen',
  suchPlatzhalter = 'Suchen …',
  leerText = 'Nichts gefunden.',
  disabled,
  id,
  className,
}: SuchauswahlProps) {
  const [offen, setOffen] = React.useState(false);
  const gewaehlt = moeglichkeiten.find(m => m.wert === wert);

  return (
    <Popover open={offen} onOpenChange={setOffen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={offen}
          disabled={disabled}
          data-slot="suchauswahl"
          data-leer={gewaehlt ? undefined : true}
          className={cn(
            'w-56 justify-between font-normal data-[leer=true]:text-muted-foreground',
            className
          )}
        >
          <span className="truncate">{gewaehlt ? gewaehlt.name : platzhalter}</span>
          <ChevronsUpDownIcon className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder={suchPlatzhalter} />
          <CommandList>
            <CommandEmpty>{leerText}</CommandEmpty>
            <CommandGroup>
              {moeglichkeiten.map(moeglichkeit => (
                <CommandItem
                  key={moeglichkeit.wert}
                  // `value` ist das, wonach `cmdk` sucht. Der Hinweis geht
                  // mit hinein: wer die Kennung einer App im Kopf hat und
                  // nicht ihren Namen, findet sie sonst nicht.
                  value={`${moeglichkeit.name} ${moeglichkeit.hinweis ?? ''}`}
                  disabled={moeglichkeit.disabled}
                  onSelect={() => {
                    aufWert(moeglichkeit.wert);
                    setOffen(false);
                  }}
                >
                  <CheckIcon
                    className={cn('mr-1', moeglichkeit.wert === wert ? 'opacity-100' : 'opacity-0')}
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{moeglichkeit.name}</span>
                    {moeglichkeit.hinweis && (
                      <span className="truncate text-ui-xs text-muted-foreground">
                        {moeglichkeit.hinweis}
                      </span>
                    )}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
