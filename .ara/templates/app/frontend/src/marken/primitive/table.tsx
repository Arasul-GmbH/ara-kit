'use client';

import * as React from 'react';

import { cn } from '../cn';

/**
 * Die Tabelle -- und der Rollkasten, in dem sie steht.
 *
 * DER ROLLKASTEN TRAEGT `relative`, UND DAS IST KEINE KOSMETIK. `overflow`
 * klammert nur ab, was auch IN dem Kasten liegt: ein absolut gesetztes Kind
 * (ein `.sr-only` in einem Knopf der Zeile) liegt in seinem naechsten
 * POSITIONIERTEN Vorfahren, und ist der Rollkasten `static`, ist das
 * irgendein Kasten weiter oben. Das Kind entkommt, rollt nicht mit, wird
 * nicht abgeklammert -- und seine Breite zaehlt zur Rollbreite des DOKUMENTS.
 * Genau so schoben sieben je einen Pixel breite `.sr-only` die
 * Mitarbeiter-Tabelle bei 1024 px auf 1042 px (Fund der G1-Abnahme, behoben
 * in G2). Hier steht es von vornherein.
 *
 * UND SIE ROLLT UEBERHAUPT. Eine Tabelle mit sechs Spalten passt bei 390 px
 * nicht, und die Alternative zum eigenen Rollkasten waere, dass sie die
 * ganze Seite schiebt. Wer eine Form braucht, die auf einem Telefon
 * WIRKLICH funktioniert, nimmt `Datenliste` -- die schaltet unter 900 px
 * auf Karten um.
 */
function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn('w-full caption-bottom text-ui-sm', className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-header"
      className={cn('[&_tr]:border-b [&_tr]:border-border', className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        'border-t border-border bg-muted/50 font-medium [&>tr]:last:border-b-0',
        className
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'border-b border-border transition-colors hover:bg-accent data-[state=selected]:bg-muted',
        className
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'h-9 px-ui-2 text-left align-middle font-medium whitespace-nowrap text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'p-ui-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className
      )}
      {...props}
    />
  );
}

/**
 * Die Bildunterschrift der Tabelle -- und zugleich das, was ein
 * Screenreader als Erstes hoert. Sie ist kein Zusatz: „Vier Mitarbeiter,
 * nach Name sortiert" ist die Auskunft, die ein Bild von selbst gibt.
 */
function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('mt-ui-2 text-ui-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
