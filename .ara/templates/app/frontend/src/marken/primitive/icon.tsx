import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '../cn';

/**
 * Die drei Groessen eines Symbols, in Pixeln: klein (14) neben kleiner
 * Schrift und in dichten Zeilen, mittel (16) in Knoepfen, Listen und
 * Leisten, gross (20) in Koepfen und leeren Zustaenden.
 */
const ICON_GROESSEN = { klein: 14, mittel: 16, gross: 20 } as const;
type IconGroesse = keyof typeof ICON_GROESSEN;

/** Die eine Strichstaerke, in Pixeln, unabhaengig von der Groesse. */
const ICON_STRICH = 1.75;

/**
 * Ein Symbol aus Lucide, in einer der drei Groessen und mit der einen
 * Strichstaerke. `symbol` ist das Symbol selbst (aus `@marken/symbole`),
 * nicht sein Name: so landet im Bau nur, was benutzt wird.
 *
 * Ohne `aria-label` ist das Symbol Schmuck und fuer Vorleseprogramme
 * unsichtbar; mit `aria-label` steht es fuer sich (`role="img"`).
 */
function Icon({
  symbol: Symbol,
  groesse = 'mittel',
  className,
  'aria-label': beschriftung,
  ...props
}: Omit<React.ComponentProps<'svg'>, 'ref'> & {
  symbol: LucideIcon;
  groesse?: IconGroesse;
}) {
  const px = ICON_GROESSEN[groesse];
  return (
    <Symbol
      data-slot="icon"
      data-groesse={groesse}
      width={px}
      height={px}
      strokeWidth={ICON_STRICH}
      absoluteStrokeWidth
      aria-hidden={beschriftung ? undefined : true}
      aria-label={beschriftung}
      role={beschriftung ? 'img' : undefined}
      className={cn('shrink-0', className)}
      {...props}
    />
  );
}

export { Icon, ICON_GROESSEN, ICON_STRICH, type IconGroesse };
