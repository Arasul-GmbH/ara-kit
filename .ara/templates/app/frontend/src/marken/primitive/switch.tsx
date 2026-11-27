import * as React from 'react';
import { Switch as SwitchPrimitive } from 'radix-ui';

import { cn } from '../cn';
import { TREFFER } from './treffer';

/**
 * Ein Schalter: an oder aus, und die Wirkung tritt sofort ein.
 *
 * Der Unterschied zur Checkbox ist keine Geschmacksfrage. Eine Checkbox waehlt
 * etwas AUS, das erst mit dem Absenden gilt; ein Schalter STELLT etwas um, hier
 * und jetzt. Wer einen Schalter in ein Formular mit Speichern-Knopf setzt,
 * verspricht etwas, das er nicht haelt.
 *
 * AUS IST SICHTBAR (5.10.0): die Spur stand auf `--input`, kaum dunkler als
 * die Flaeche darunter. Jetzt Grau mit mindestens 3:1 zur Flaeche, wie WCAG
 * es fuer Bedienelemente verlangt; an ist Blau.
 */
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        TREFFER,
        'peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent outline-none transition-colors',
        'bg-muted-foreground/75 data-[state=checked]:bg-primary',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block size-4 rounded-full bg-background shadow-sm ring-0 transition-transform',
          'data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5'
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
