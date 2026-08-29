'use client';

import * as React from 'react';
import { Collapsible as CollapsiblePrimitive } from 'radix-ui';

import { cn } from '../cn';

/**
 * Ein einzelnes Stueck, das auf- und zugeht -- das Akkordeon ohne die Liste.
 *
 * Es bringt bewusst KEIN Aussehen mit: kein Rahmen, kein Pfeil, kein
 * Abstand. Wer eines braucht, nimmt `Accordion`; dieses hier ist die
 * Mechanik fuer einen Fall, der keiner Liste angehoert (die Rohdaten unter
 * einer Antwort, die zweite Haelfte eines Formulars).
 */
function Collapsible({ ...props }: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return <CollapsiblePrimitive.CollapsibleTrigger data-slot="collapsible-trigger" {...props} />;
}

function CollapsibleContent({
  className,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      className={cn(
        'overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down',
        className
      )}
      {...props}
    />
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
