'use client';

import * as React from 'react';
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from 'lucide-react';

import { cn } from '../cn';
import { buttonVariants } from './button';

/**
 * Das Blaettern durch eine lange Liste.
 *
 * ES IST EINE NAVIGATION UND KEINE LEISTE VON KNOEPFEN. Jede Seite hat eine
 * eigene Adresse, also sind die Eintraege `<a>`: sie lassen sich in einem
 * neuen Tab oeffnen, sie stehen im Verlauf, und wer zurueckgeht, landet auf
 * der Seite, auf der er war. Ein Knopf, der `setSeite(3)` ruft, kann das
 * alles nicht, und der Unterschied faellt erst dem auf, der die dritte Seite
 * jemandem schicken will.
 *
 * Die aktuelle Seite traegt `aria-current="page"` -- daran und nicht an der
 * Farbe erkennt ein Screenreader, wo er ist.
 */
function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav
      role="navigation"
      aria-label="Seiten"
      data-slot="pagination"
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  );
}

function PaginationContent({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn('flex flex-row items-center gap-1', className)}
      {...props}
    />
  );
}

function PaginationItem({ ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
  aktiv?: boolean;
  size?: 'default' | 'sm' | 'lg' | 'icon';
} & React.ComponentProps<'a'>;

function PaginationLink({ className, aktiv, size = 'icon', ...props }: PaginationLinkProps) {
  return (
    <a
      aria-current={aktiv ? 'page' : undefined}
      data-slot="pagination-link"
      data-active={aktiv}
      className={cn(buttonVariants({ variant: aktiv ? 'outline' : 'ghost', size }), className)}
      {...props}
    />
  );
}

function PaginationPrevious({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Vorige Seite"
      size="default"
      className={cn('gap-1 px-2.5 sm:pl-2.5', className)}
      {...props}
    >
      <ChevronLeftIcon />
      <span className="hidden sm:block">Zurück</span>
    </PaginationLink>
  );
}

function PaginationNext({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Nächste Seite"
      size="default"
      className={cn('gap-1 px-2.5 sm:pr-2.5', className)}
      {...props}
    >
      <span className="hidden sm:block">Weiter</span>
      <ChevronRightIcon />
    </PaginationLink>
  );
}

/** Die Auslassung zwischen zwei Seitenzahlen. Sie ist kein Ziel, also kein Verweis. */
function PaginationEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      aria-hidden="true"
      data-slot="pagination-ellipsis"
      className={cn('flex size-9 items-center justify-center', className)}
      {...props}
    >
      <MoreHorizontalIcon className="size-4" />
      <span className="sr-only">Weitere Seiten</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
};
