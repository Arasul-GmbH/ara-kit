import * as React from 'react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import { Check } from 'lucide-react';

import { cn } from '../cn';

/**
 * Ein Haekchen.
 *
 * Bis H3 stand hier eine eigene Bauart: ein `appearance-none`-Input mit einem
 * gezeichneten Kasten darueber. Der Grund war richtig (ein natives
 * `<input type="checkbox">` malt je nach Browser einen grossen weissen Kasten,
 * der im dunklen Thema fremd wirkt), die Loesung aber eine handgebaute Wette
 * gegen eine gepruefte Bibliothek -- dieselbe Wette, gegen die
 * `scripts/test/bausteine.py` seit Plan 023 beim Dialog antritt. Radix loest
 * dasselbe Problem und bringt Tastatur, `aria-checked` und den
 * unbestimmten Zustand mit.
 *
 * Die Props sind dieselben geblieben (`checked`, `onCheckedChange`,
 * `disabled`, `aria-label`), damit kein Aufrufer sich aendern muss.
 */
function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer size-4 shrink-0 rounded-[5px] border border-border bg-background outline-none transition-colors',
        'data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
        'data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current"
      >
        <Check className="size-3" strokeWidth={3} aria-hidden="true" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
