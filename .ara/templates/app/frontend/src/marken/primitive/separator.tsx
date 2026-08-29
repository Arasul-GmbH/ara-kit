import * as React from 'react';
import { Separator as SeparatorPrimitive } from 'radix-ui';

import { cn } from '../cn';

/**
 * Ein Strich zwischen zwei Dingen.
 *
 * `decorative` ist die Vorgabe und heisst: der Strich ist Optik, kein Inhalt.
 * Radix nimmt ihn dann aus dem Baum, den ein Screenreader liest. Wer ihn
 * ausdruecklich als Trennung MEINT (zwischen zwei Gruppen eines Menues),
 * setzt `decorative={false}`.
 */
function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px',
        className
      )}
      {...props}
    />
  );
}

export { Separator };
