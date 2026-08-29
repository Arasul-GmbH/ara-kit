import * as React from 'react';
import { Avatar as AvatarPrimitive } from 'radix-ui';

import { cn } from '../cn';

/**
 * Das Bild eines Menschen -- und das, was dasteht, wenn es keines gibt.
 *
 * `AvatarFallback` ist kein Beiwerk: auf diesem Geraet hat fast niemand ein
 * Bild hinterlegt, also ist der Rueckfall der Normalfall. Radix zeigt ihn
 * erst, wenn das Laden wirklich fehlgeschlagen ist, und nicht schon waehrend
 * es laeuft -- sonst blitzten die Initialen bei jedem Aufbau kurz auf.
 */
function Avatar({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        'relative flex size-8 shrink-0 overflow-hidden rounded-full select-none',
        className
      )}
      {...props}
    />
  );
}

function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn('aspect-square size-full object-cover', className)}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        'flex size-full items-center justify-center rounded-full bg-secondary text-ui-xs font-medium text-muted-foreground',
        className
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };
