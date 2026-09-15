import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import { Loader2 } from 'lucide-react';

import { cn } from '../cn';

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'bg-secondary text-primary border border-border hover:bg-secondary/80 active:bg-secondary/70',
        solid: 'bg-primary text-primary-foreground hover:bg-primary/85 active:bg-primary/75',
        // Plan 016: entschärft — statt flächigem Rot (weiß auf Vollrot) ein
        // ruhiger roter Ton mit rotem Text und dezentem Rahmen. Klar destruktiv,
        // aber nicht mehr aggressiv; deckt sich mit dem weichen Löschen-Muster
        // aus dem Flow-Editor und der „eine Flächenfarbe"-Regel.
        destructive:
          'bg-destructive/10 text-destructive border border-destructive/25 hover:bg-destructive/15 active:bg-destructive/20 focus-visible:ring-destructive/20',
        outline:
          'border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
        // Erfolg ist Blau, eine Warnung ist Grau (30.08.2026): die Palette
        // kennt kein Gruen und kein Orange mehr, und ein Knopf, der warnt,
        // sagt das in seiner Beschriftung.
        success:
          'bg-secondary text-primary border border-primary/30 hover:bg-secondary/80 active:bg-secondary/70 focus-visible:ring-primary/20',
        warning:
          'bg-secondary text-muted-foreground border border-muted-foreground/30 hover:bg-secondary/80 active:bg-secondary/70 focus-visible:ring-muted-foreground/20',
        'outline-danger':
          'border border-foreground/20 bg-foreground/5 text-foreground hover:bg-foreground/10 hover:border-foreground/30',
        'outline-success':
          'border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/50',
        'outline-warning':
          'border border-muted-foreground/30 bg-muted-foreground/10 text-muted-foreground hover:bg-muted-foreground/20 hover:border-muted-foreground/50',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-xs': "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
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
  // When asChild, `content` MUST stay exactly `children` (one element) — otherwise
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
