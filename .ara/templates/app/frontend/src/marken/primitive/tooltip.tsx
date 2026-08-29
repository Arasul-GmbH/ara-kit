import * as React from 'react';
import { Tooltip as TooltipPrimitive } from 'radix-ui';

import { cn } from '../cn';

/**
 * Ein Satz, der erscheint, wenn die Maus stehen bleibt.
 *
 * WAS EIN TOOLTIP NICHT IST: die einzige Stelle, an der etwas steht. Er
 * erscheint nicht auf einem Telefon, nicht bei Tastaturbedienung ohne Fokus
 * und nicht im Ausdruck. Der Name eines Knopfes gehoert deshalb in ein
 * `aria-label` und die Erklaerung daneben -- hier steht das, was das Bild
 * ergaenzt, nicht das, was es ersetzt.
 *
 * `TooltipProvider` steht mit im Baustein: Radix verlangt ihn, und ein
 * Tooltip, der ohne ihn wortlos nichts tut, ist die Sorte Falle, gegen die
 * eine Bibliothek gebaut ist.
 */
function TooltipProvider({
  delayDuration = 300,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

function TooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 4,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          'z-50 w-fit origin-[var(--radix-tooltip-content-transform-origin)] rounded-md bg-popover px-2 py-1 text-ui-xs text-popover-foreground shadow-md data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95',
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%_-_1px)] rotate-45 rounded-[2px] fill-popover" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
