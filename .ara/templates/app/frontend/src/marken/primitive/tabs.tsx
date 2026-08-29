import * as React from 'react';
import { Tabs as TabsPrimitive } from 'radix-ui';

import { cn } from '../cn';

/**
 * Eine Leiste, die zwischen Ansichten umschaltet.
 *
 * Die Form ist die der Shell: eine Unterstreichung am aktiven Reiter, kein
 * gefuellter Kasten. `border-b-2` steht deshalb HIER und nirgends sonst --
 * `scripts/test/bausteine.py` meldet die Klasse ueberall in `src/` als
 * handgebaute Tab-Leiste.
 *
 * DER AKTIVE REITER HEBT SICH UEBER DIE SCHRIFTSTAERKE AB, nicht ueber die
 * Farbe (H5; die Regel steht seit langem in `docs/development/DESIGN.md`,
 * Punkt 2, und wurde hier nicht eingehalten). Bis dahin trug die
 * Unterstreichung `border-primary`: der Akzent ist die Farbe der
 * PRIMAERAKTION, und wenn er zugleich „hier bist du" bedeutet, bedeutet er
 * beides nicht mehr. Jetzt traegt sie `border-foreground`, und der Wechsel
 * von `font-medium` auf `font-semibold` macht den Unterschied lesbar -- auch
 * fuer jemanden, der die zwei Farben nicht unterscheiden kann.
 *
 * SEIT H5 IST SIE DIE EINZIGE TAB-LEISTE DES PRODUKTS. `FilterBar` in der
 * Shell war eine zweite, mit derselben Form und eigener Tastaturmechanik --
 * und dabei tut Radix genau das schon: umlaufende Pfeile, Pos1 und Ende, und
 * nur der aktive Reiter im Tabulator-Lauf.
 *
 * Der Rollkasten traegt `relative`: `overflow` klammert nur ab, was auch IN
 * dem Kasten liegt, und ein absolut gesetztes Kind (ein `.sr-only` in einem
 * Reiter) entkaeme sonst und schoebe die ganze Seite breiter. Das ist der Fund
 * der G1-Abnahme, hier von vornherein eingebaut.
 */
function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex flex-col gap-ui-3', className)}
      {...props}
    />
  );
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'relative flex items-center gap-ui-3 overflow-x-auto border-b border-border',
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'inline-flex shrink-0 items-center gap-2 border-b-2 border-transparent px-1 pb-2 text-ui-sm font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none',
        'hover:text-foreground',
        'data-[state=active]:border-foreground data-[state=active]:font-semibold data-[state=active]:text-foreground',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:pointer-events-none disabled:opacity-50',
        "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 outline-none', className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
