'use client';

import * as React from 'react';
import { HoverCard as HoverCardPrimitive } from 'radix-ui';

import { cn } from '../cn';

/**
 * Eine Vorschau, die beim Verweilen aufgeht -- und nur dann.
 *
 * Der Unterschied zu `Tooltip`: dort steht EIN Satz, hier steht Inhalt
 * (ein Bild, ein Steckbrief, drei Zeilen zu einem Verweis). Und der
 * Unterschied zu `Popover`: der geht auf Klick auf und nimmt den Fokus,
 * diese hier nicht.
 *
 * WAS DARIN STEHT, MUSS ES AUCH WOANDERS GEBEN. Ein Zeigegeraet hat nicht
 * jeder: auf einem Telefon gibt es kein Verweilen, und mit der Tastatur
 * kommt man nur hinein, wenn der Ausloeser selbst fokussierbar ist. Eine
 * Angabe, die es NUR hier gibt, gibt es fuer diese Menschen gar nicht.
 */
function HoverCard({ ...props }: React.ComponentProps<typeof HoverCardPrimitive.Root>) {
  return <HoverCardPrimitive.Root data-slot="hover-card" {...props} />;
}

function HoverCardTrigger({ ...props }: React.ComponentProps<typeof HoverCardPrimitive.Trigger>) {
  return <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />;
}

function HoverCardContent({
  className,
  align = 'center',
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Content>) {
  return (
    <HoverCardPrimitive.Portal>
      <HoverCardPrimitive.Content
        data-slot="hover-card-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 w-64 origin-[var(--radix-hover-card-content-transform-origin)] rounded-md border border-border bg-popover p-4 text-ui-sm text-popover-foreground shadow-md outline-none data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          className
        )}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  );
}

export { HoverCard, HoverCardTrigger, HoverCardContent };
