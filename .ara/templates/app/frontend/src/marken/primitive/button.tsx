import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import { Loader2 } from 'lucide-react';

import { cn } from '../cn';
import { TREFFER } from './treffer';

// Kompakt am Rechner: 32 px mit Text, 28 px als Icon-Knopf, Radius 8 px,
// Schrift 14 px. Bei grobem Zeiger waechst die TREFFERFLAECHE auf 44 px, nicht
// der sichtbare Knopf: ein leeres `::before` legt sich mittig darueber
// (`TREFFER`). Die Hoehen stehen in Pixeln, nicht in rem: die Shell rechnet
// mit 17 px Wurzelschrift (Komfort-Dichte), und 2rem waeren dort 34 px.

const buttonVariants = cva(
  `${TREFFER} inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,opacity] duration-[120ms] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4`,
  {
    variants: {
      variant: {
        // Der Nebenknopf: feiner Rand auf heller Flaeche.
        default:
          'bg-card text-foreground border border-border shadow-xs hover:bg-[color-mix(in_srgb,var(--foreground)_5%,var(--card))] active:bg-[color-mix(in_srgb,var(--foreground)_8%,var(--card))]',
        // Der Hauptknopf: blau gefuellt, ohne Verlauf. Ueberfahren nimmt die
        // hellere Stufe der Marke, Druecken die tiefere.
        solid:
          'bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover active:bg-primary-active',
        // Rot nur fuer Loeschen: ein ruhiger roter Ton mit rotem Text und
        // dezentem Rahmen, kein weisser Text auf Vollrot.
        destructive:
          'bg-destructive/10 text-destructive border border-destructive/25 hover:bg-destructive/15 active:bg-destructive/20 focus-visible:ring-destructive/20',
        outline:
          'border border-border bg-card shadow-xs hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        // Erfolg ist Blau, eine Warnung ist Grau: die Palette
        // kennt kein Gruen und kein Orange, und ein Knopf, der warnt,
        // sagt das in seiner Beschriftung.
        success:
          'bg-card text-primary border border-primary/30 hover:bg-primary/10 active:bg-primary/15 focus-visible:ring-primary/20',
        warning:
          'bg-card text-muted-foreground border border-muted-foreground/30 hover:bg-accent active:bg-accent focus-visible:ring-muted-foreground/20',
        'outline-danger':
          'border border-foreground/20 bg-foreground/5 text-foreground hover:bg-foreground/10 hover:border-foreground/30',
        'outline-success':
          'border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/50',
        'outline-warning':
          'border border-muted-foreground/30 bg-muted-foreground/10 text-muted-foreground hover:bg-muted-foreground/20 hover:border-muted-foreground/50',
      },
      size: {
        default: 'h-[32px] px-3 has-[>svg]:px-2.5',
        xs: "h-[24px] gap-1 px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        sm: 'h-[28px] gap-1 px-2.5 has-[>svg]:px-2',
        lg: 'h-[36px] px-4 has-[>svg]:px-3',
        icon: 'size-[28px]',
        'icon-xs': "size-[24px] [&_svg:not([class*='size-'])]:size-3.5",
        'icon-sm': 'size-[24px]',
        'icon-lg': "size-[32px] [&_svg:not([class*='size-'])]:size-5",
      },
    },
    // Ein Icon-Knopf im Grundton hat keinen Rahmen und keine Flaeche: er ist
    // getoent beim Ueberfahren, sonst nur sein Symbol.
    compoundVariants: [
      {
        variant: 'default',
        size: ['icon', 'icon-xs', 'icon-sm', 'icon-lg'],
        class:
          'border-transparent bg-transparent shadow-none text-muted-foreground hover:bg-accent hover:text-foreground active:bg-accent',
      },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** Shows a spinner, disables the button and sets aria-busy.
     *  Ignored when asChild is set (Slot requires a single child). */
    loading?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';
  // Slot forwards to a single child element, so we can't prepend a spinner there.
  // When asChild, `content` MUST stay exactly `children` (one element); otherwise
  // Slot receives an array and throws React.Children.only.
  const showSpinner = loading && !asChild;
  const content = showSpinner ? (
    <>
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {children}
    </>
  ) : (
    children
  );

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      // Only native <button> accepts `disabled`; for asChild leave it to the child.
      disabled={asChild ? disabled : disabled || loading}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {content}
    </Comp>
  );
}

export { Button, buttonVariants };
