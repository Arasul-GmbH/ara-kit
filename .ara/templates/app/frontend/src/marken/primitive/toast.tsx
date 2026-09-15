import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';

import { cn } from '../cn';

/**
 * Die kurze Meldung, die von selbst wieder geht.
 *
 * PRAESENTATION, KEINE MECHANIK. Wann eine Meldung erscheint, wie lange sie
 * steht und wer sie wegnimmt, weiss die Anwendung -- in der Shell ist das
 * `contexts/ToastContext.tsx`. Hier steht nur, wie sie aussieht. So kann eine
 * App ihre eigene Warteschlange fuehren und trotzdem dieselbe Meldung zeigen.
 *
 * Die Farbe sitzt am linken Rand und nicht auf der Flaeche: eine flaechig rote
 * Meldung liest sich als Alarm, und die meisten sind keiner. Dieselbe
 * Entschaerfung wie beim destruktiven Knopf (Plan 016) und beim Abzeichen.
 * Und es sind drei Farben fuer vier Arten: `success` ist Blau wie `info`,
 * `warning` ist Grau, `error` ist Rot -- Gruen und Orange sind seit dem
 * 30.08.2026 nicht mehr in der Palette; was fuer eine Meldung es ist, sagt
 * das Symbol und der Text.
 *
 * `pointer-events-none` am Behaelter und `-auto` an der Meldung: der Streifen
 * oben rechts ist sonst eine unsichtbare Wand vor der Oberflaeche darunter.
 */
const toastVariants = cva(
  'pointer-events-auto flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3.5 shadow-lg motion-safe:animate-in motion-safe:slide-in-from-right',
  {
    variants: {
      art: {
        info: 'border-l-[3px] border-l-primary [&_[data-slot=toast-icon]]:text-primary',
        success: 'border-l-[3px] border-l-primary [&_[data-slot=toast-icon]]:text-primary',
        warning:
          'border-l-[3px] border-l-muted-foreground [&_[data-slot=toast-icon]]:text-muted-foreground',
        error: 'border-l-[3px] border-l-destructive [&_[data-slot=toast-icon]]:text-destructive',
      },
    },
    defaultVariants: {
      art: 'info',
    },
  }
);

/**
 * Der Platz, an dem die Meldungen stehen: oben rechts, und unter 480 px unten
 * ueber die volle Breite -- dort ist rechts oben die Hand des Menschen.
 */
function ToastViewport({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="toast-viewport"
      className={cn(
        'pointer-events-none fixed top-4 right-4 z-[60] flex max-w-[400px] flex-col gap-3',
        'max-[480px]:top-auto max-[480px]:right-4 max-[480px]:bottom-4 max-[480px]:left-4 max-[480px]:max-w-none',
        className
      )}
      {...props}
    />
  );
}

function Toast({
  className,
  art,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof toastVariants>) {
  return (
    <div
      data-slot="toast"
      data-art={art}
      className={cn(toastVariants({ art }), className)}
      {...props}
    />
  );
}

function ToastIcon({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="toast-icon"
      aria-hidden="true"
      className={cn('flex size-5 shrink-0 items-center justify-center [&>svg]:size-5', className)}
      {...props}
    />
  );
}

function ToastMessage({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="toast-message"
      className={cn('flex-1 text-ui leading-snug text-foreground', className)}
      {...props}
    />
  );
}

function ToastClose({ className, ...props }: React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      data-slot="toast-close"
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors',
        'hover:bg-accent hover:text-foreground',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        className
      )}
      {...props}
    >
      <X className="size-4" aria-hidden="true" />
    </button>
  );
}

export { Toast, ToastViewport, ToastIcon, ToastMessage, ToastClose, toastVariants };
