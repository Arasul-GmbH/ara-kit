'use client';

import * as React from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { SearchIcon } from 'lucide-react';

import { cn } from '../cn';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog';

/**
 * Die Suchliste: tippen, und was uebrig bleibt, steht da.
 *
 * SIE IST DIE FORM FUER „ICH WEISS, WIE ES HEISST". Ein `Select` zeigt alles
 * und laesst waehlen; das ist bis etwa zehn Eintraegen die schnellere Form.
 * Darueber sucht ein Mensch, statt zu lesen, und dann ist eine Liste, die
 * beim Tippen enger wird, kein Zusatz, sondern der ganze Weg.
 *
 * DIE TASTATUR IST HIER DER HAUPTWEG UND NICHT DER ZWEITE. Pfeile bewegen
 * die Auswahl, Enter nimmt sie, und die Liste bleibt dabei gescrollt.
 * `cmdk` bringt das mit, samt der Suche selbst; eine handgebaute Version
 * davon ist die Wette gegen eine geprueste Bibliothek, gegen die dieses
 * Repo antritt.
 *
 * ZWEI FORMEN. `Command` allein steht IN einer Seite (in einem `Popover`
 * ist es die `Suchauswahl`); `CommandDialog` legt dieselbe Liste als
 * Fenster ueber die Seite: die Schnellwahl, die man mit einem
 * Tastenkuerzel oeffnet.
 */
function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        'flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground',
        className
      )}
      {...props}
    />
  );
}

/** Kleinbuchstaben ohne Akzente: „Ü“ und „u“ finden einander. */
function grundform(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Die scharfe Suche der Befehlspalette (5.11.0).
 *
 * `cmdk` sucht von sich aus unscharf: jeder Buchstabe der Eingabe irgendwo
 * im Eintrag, in der richtigen Reihenfolge. Fuer eine Liste aus Namen ist
 * das zu weit, „Ab“ fand auch Eintraege ohne ein Wort, das mit „Ab“
 * beginnt. Hier gilt:
 *
 * - Jedes Wort der Eingabe muss der ANFANG eines Wortes im Eintrag sein
 *   (Wert und `keywords`). „Ab“ findet „Abschluss“, nicht „Belege“.
 * - Ab drei Zeichen genuegt auch ein Stueck mitten im Wort („kosten“ findet
 *   „Reisekosten“), mit niedrigerem Rang.
 * - Beginnt der Eintrag mit der ganzen Eingabe, steht er oben.
 *
 * Gross- und Kleinschreibung und Akzente zaehlen nicht.
 */
function wortanfangFilter(value: string, search: string, keywords?: string[]): number {
  const suche = grundform(search).trim();
  if (!suche) return 1;
  const text = grundform([value, ...(keywords ?? [])].join(' '));
  const woerter = text.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const teile = suche.split(/\s+/);
  let rang = text.startsWith(suche) ? 1 : 0.8;
  for (const teil of teile) {
    if (woerter.some(w => w.startsWith(teil))) continue;
    if (teil.length >= 3 && woerter.some(w => w.includes(teil))) {
      rang = Math.min(rang, 0.3);
      continue;
    }
    return 0;
  }
  return rang;
}

/**
 * Die Befehlspalette (5.10.0, `gestaltung.md`: „Eine Tastenkombination oeffnet
 * ein Feld, das zu jeder App ... springt"). Sie schwebt, also ist sie Glas wie
 * ein Menue: Fuellung, heller Rand und Schatten aus `--glas-*`, im oberen
 * Drittel statt in der Mitte, damit die Liste nach unten Platz hat. Der
 * Schleier darunter ist schlicht, ohne Unschaerfe: die Palette ist die eine
 * Glasflaeche, die dazukommt. Die Liste selbst ist durchsichtig und liegt auf
 * dem Glas; die Zeilen tragen die Auswahl als getoente Flaeche.
 */
function CommandDialog({
  titel = 'Suchen',
  beschreibung = 'Tippen, um zu suchen. Pfeile wählen, Enter nimmt.',
  children,
  inhaltKennzeichen,
  filter = wortanfangFilter,
  ...props
}: React.ComponentProps<typeof Dialog> & {
  titel?: string;
  beschreibung?: string;
  /** `data-testid` der schwebenden Flaeche. */
  inhaltKennzeichen?: string;
  /** Die Suche; Vorgabe ist die scharfe `wortanfangFilter` (5.11.0). */
  filter?: React.ComponentProps<typeof CommandPrimitive>['filter'];
}) {
  return (
    <Dialog {...props}>
      <DialogContent
        schleier="schlicht"
        data-testid={inhaltKennzeichen}
        className="glas top-[max(12px,14dvh)] max-w-[min(560px,calc(100%-16px))] translate-y-0 gap-0 overflow-hidden rounded-[12px] border-glas-kante bg-glas p-0 shadow-[var(--glas-schatten)] sm:max-w-[560px]"
        showCloseButton={false}
      >
        {/* Titel und Beschreibung stehen nur fuer den Screenreader da, und
            INNERHALB des Inhalts, nicht daneben: Radix sucht den Titel im
            Dialog und warnt in der Konsole, wenn er ihn dort nicht findet.
            Die Schauseite fragt jede Zelle, ob die Konsole schweigt. */}
        <DialogHeader className="sr-only">
          <DialogTitle>{titel}</DialogTitle>
          <DialogDescription>{beschreibung}</DialogDescription>
        </DialogHeader>
        <Command
          filter={filter}
          className="bg-transparent [&_[data-slot=command-group]]:px-1.5 [&_[data-slot=command-input-wrapper]]:h-11 [&_[data-slot=command-item]]:min-h-9 [&_[data-slot=command-item]]:rounded-md [&_[data-slot=command-item]]:px-2 [&_[data-slot=command-item][data-selected=true]]:bg-primary/14 [&_[data-slot=command-item][data-selected=true]]:text-foreground [&_[data-slot=command-list]]:max-h-[min(360px,60dvh)]"
        >
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div
      data-slot="command-input-wrapper"
      className="flex h-9 items-center gap-2 border-b border-border px-3"
    >
      <SearchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          // Kein eigener Fokusrahmen (5.10.0): das Feld IST die Zeile, und
          // der Rahmen samt Schatten der Shell (`input:focus`) zeichnete am
          // Orin einen zweiten Kasten in die Palette.
          'flex h-10 w-full rounded-md border-0 bg-transparent py-3 text-ui shadow-none outline-none placeholder:text-muted-foreground focus:shadow-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    </div>
  );
}

function CommandList({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      // `relative` gehoert zu `overflow-y-auto`: ein absolut gesetztes Kind
      // entkaeme dem Rollkasten sonst und zaehlte zur Rollbreite des
      // Dokuments (Regel in check-design-system.js).
      className={cn(
        'relative max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto',
        className
      )}
      {...props}
    />
  );
}

/** Was dasteht, wenn nichts passt. Ein leerer Kasten waere hier eine Panne. */
function CommandEmpty({ ...props }: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className="py-6 text-center text-ui-sm text-muted-foreground"
      {...props}
    />
  );
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        'overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-ui-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground',
        className
      )}
      {...props}
    />
  );
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn('-mx-1 h-px bg-border', className)}
      {...props}
    />
  );
}

function CommandItem({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-ui-sm outline-none select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

function CommandShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn('ml-auto text-ui-xs tracking-widest text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
  wortanfangFilter,
};
