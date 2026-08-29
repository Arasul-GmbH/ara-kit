'use client';

import * as React from 'react';
import { GripVerticalIcon } from 'lucide-react';
import { Group, Panel, Separator } from 'react-resizable-panels';

import { cn } from '../cn';

/**
 * Spalten (oder Zeilen), deren Breite der Mensch selbst zieht.
 *
 * Die Shell des Geraets steht seit D1 darauf: Sidebar, Mitte, Notizen. Was
 * hier liegt, ist dasselbe Werkzeug ohne die Shell darum -- eine
 * Fachanwendung, die eine Liste neben einem Detail zeigt, soll dieselbe
 * Bedienung haben und nicht ihre eigene erfinden.
 *
 * DER GRIFF IST BEDIENBAR UND NICHT NUR SICHTBAR. Ein Strich von einem
 * Pixel trifft niemand mit der Maus und schon gar nicht mit dem Finger;
 * `Separator` legt deshalb eine unsichtbare Trefferflaeche darum und nimmt
 * die Pfeiltasten entgegen. Ein selbstgebauter `<div onMouseDown>` kann das
 * nicht, und das merkt man erst auf einem Tablet.
 */
function ResizablePanelGroup({ className, ...props }: React.ComponentProps<typeof Group>) {
  return (
    <Group
      data-slot="resizable-panel-group"
      className={cn('flex h-full w-full data-[orientation=vertical]:flex-col', className)}
      {...props}
    />
  );
}

function ResizablePanel({ ...props }: React.ComponentProps<typeof Panel>) {
  return <Panel data-slot="resizable-panel" {...props} />;
}

function ResizableHandle({
  mitGriff,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & {
  /** Zeigt den Griff als Punkte. Ohne ihn bleibt der Strich, der Griff wirkt trotzdem. */
  mitGriff?: boolean;
}) {
  return (
    <Separator
      data-slot="resizable-handle"
      className={cn(
        'relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-hidden',
        'data-[orientation=vertical]:h-px data-[orientation=vertical]:w-full data-[orientation=vertical]:after:left-0 data-[orientation=vertical]:after:h-1 data-[orientation=vertical]:after:w-full data-[orientation=vertical]:after:translate-x-0 data-[orientation=vertical]:after:-translate-y-1/2',
        className
      )}
      {...props}
    >
      {mitGriff && (
        <div className="z-10 flex h-4 w-3 items-center justify-center rounded-xs border border-border bg-border">
          <GripVerticalIcon className="size-2.5" />
        </div>
      )}
    </Separator>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
