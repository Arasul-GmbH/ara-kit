import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '../cn';

/**
 * Ein Abzeichen: der Zustand einer Zeile in zwei Woertern.
 *
 * Die Varianten sind die des Geraets und nicht die von shadcn: `default` ist
 * ruhig (die Flaeche der Karte), `success`, `warning` und `destructive` tragen
 * ihre Farbe als 12-%-Wisch mit farbigem Text und farbigem Rand -- dieselbe
 * Entschaerfung wie beim destruktiven Knopf (Plan 016). Ein flaechig roter
 * Punkt neben einem Namen liest sich als Alarm, und das ist er meistens nicht.
 *
 * Die Namen sind die Bedeutung, die Farbe folgt daraus (30.08.2026): `success`
 * ist Blau, `warning` ist Grau, `destructive` ist Rot. Gruen und Orange gibt
 * es in der Palette nicht mehr -- ein Abzeichen sagt im Wort, was es ist, und
 * eine App, die `warning` schreibt, bekommt dieselbe graue Marke wie das
 * Geraet.
 */
const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border px-2 py-0.5 text-ui-xs font-medium whitespace-nowrap transition-colors [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      variant: {
        default: 'border-border bg-secondary text-foreground',
        primary: 'border-primary/25 bg-primary/10 text-primary',
        success: 'border-primary/25 bg-primary/10 text-primary',
        warning: 'border-muted-foreground/30 bg-muted-foreground/10 text-muted-foreground',
        destructive: 'border-destructive/25 bg-destructive/10 text-destructive',
        outline: 'border-border bg-transparent text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span';
  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
