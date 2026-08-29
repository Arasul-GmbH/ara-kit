'use client';

import * as React from 'react';
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui';
import { type VariantProps } from 'class-variance-authority';

import { cn } from '../cn';
import { toggleVariants } from './toggle';

/**
 * Mehrere `Toggle` als eine Leiste -- entweder genau einer an (`type="single"`)
 * oder beliebig viele (`type="multiple"`).
 *
 * Art und Groesse stehen an der GRUPPE und nicht am einzelnen Knopf: eine
 * Leiste, in der ein Knopf groesser ist als sein Nachbar, ist keine Leiste.
 * Der Kontext reicht sie nach unten durch; ein Knopf darf sie ueberschreiben,
 * und dann ist genau das die Aussage.
 */
const ToggleGruppenKontext = React.createContext<VariantProps<typeof toggleVariants>>({
  size: 'default',
  variant: 'default',
});

function ToggleGroup({
  className,
  variant,
  size,
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      className={cn(
        'group/toggle-group flex w-fit items-center rounded-md data-[variant=outline]:shadow-xs',
        className
      )}
      {...props}
    >
      <ToggleGruppenKontext.Provider value={{ variant, size }}>
        {children}
      </ToggleGruppenKontext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> & VariantProps<typeof toggleVariants>) {
  const kontext = React.useContext(ToggleGruppenKontext);

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={kontext.variant || variant}
      data-size={kontext.size || size}
      className={cn(
        toggleVariants({ variant: kontext.variant || variant, size: kontext.size || size }),
        'min-w-0 shrink-0 rounded-none shadow-none first:rounded-l-md last:rounded-r-md focus:z-10 focus-visible:z-10',
        'data-[variant=outline]:border-l-0 data-[variant=outline]:first:border-l data-[variant=outline]:border-input',
        className
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
}

export { ToggleGroup, ToggleGroupItem };
