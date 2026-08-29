import * as React from 'react';
import { Progress as ProgressPrimitive } from 'radix-ui';

import { cn } from '../cn';

/**
 * Ein Balken, der sagt, wie weit etwas ist.
 *
 * `value={null}` (die Vorgabe von Radix) heisst „unbestimmt": der Balken
 * steht dann leer da, statt 0 % zu behaupten. Wer nicht weiss, wie lange es
 * dauert, sagt das besser, als eine Zahl zu erfinden.
 */
function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-secondary', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="size-full flex-1 bg-primary transition-transform"
        style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
