'use client';

import * as React from 'react';
import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { PanelLeftIcon } from 'lucide-react';

import { cn } from '../cn';
import { useSchmalesFenster } from '../useSchmalesFenster';
import { Button } from './button';
import { Separator } from './separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './sheet';
import { Skeleton } from './skeleton';

/**
 * Die Seitenleiste einer Anwendung -- die Mechanik, nicht die Navigation.
 *
 * WAS SIE IST UND WAS NICHT. Hier liegt das Gerüst: auf und zu, breit oder
 * nur Symbole, unter 900 px ein Blatt statt einer Spalte, ein Griff am Rand,
 * das Tastenkuerzel. Was DARIN steht -- Eintraege, Ziele, welcher gerade
 * aktiv ist -- ist die Sache dessen, der sie benutzt; wer eine Navigation
 * aus einer Liste will, nimmt `Seitenleiste` aus den Mustern.
 *
 * UNTER 900 PX GIBT ES KEINE SEITENLEISTE, SONDERN EIN BLATT. Das ist
 * dieselbe Schwelle wie in der Shell (`useSchmalesFenster`) und dieselbe
 * Entscheidung wie in D7: ein geschrumpfter Desktop ist kein Telefon-Aufbau.
 * 160 px Leiste neben 230 px Inhalt sind zwei zu schmale Spalten statt einer
 * brauchbaren.
 *
 * KEINE EIGENEN FARBTOKENS. shadcn gibt der Seitenleiste acht eigene
 * (`--sidebar`, `--sidebar-accent`, …). Auf diesem Geraet gilt die Regel
 * „eine Flaechenfarbe" (DESIGN.md): alle Grundflaechen teilen `--background`,
 * getrennt wird ueber Raender. Acht Tokens, die in beiden Themes dasselbe
 * sagen wie vier vorhandene, sind acht Stellen, an denen es auseinanderlaufen
 * kann.
 */
const SEITENLEISTE_BREIT = '16rem';
const SEITENLEISTE_BLATT = '18rem';
const SEITENLEISTE_SYMBOLE = '3rem';
const SEITENLEISTE_TASTE = 'b';

type SidebarKontext = {
  zustand: 'offen' | 'zu';
  offen: boolean;
  setzeOffen: (offen: boolean) => void;
  blattOffen: boolean;
  setzeBlattOffen: (offen: boolean) => void;
  schmal: boolean;
  umschalten: () => void;
};

const SidebarContext = React.createContext<SidebarKontext | null>(null);

function useSidebar() {
  const kontext = React.useContext(SidebarContext);
  if (!kontext) {
    throw new Error('useSidebar muss innerhalb von <SidebarProvider> stehen');
  }
  return kontext;
}

/**
 * Der Rahmen um Leiste und Inhalt.
 *
 * Er ist gesteuert ODER ungesteuert: wer `offen` und `aufOffen` uebergibt,
 * behaelt den Zustand bei sich (etwa im Store der Anwendung), wer nichts
 * uebergibt, bekommt ihn hier. KEIN Cookie und kein `localStorage` -- was
 * ein Mensch einstellt, gehoert seit H1 zu ihm und nicht zu dem Rechner, vor
 * dem er zufaellig sitzt. Wer die Einstellung ueberleben lassen will,
 * speichert sie dort, wo er auch sein Theme speichert.
 */
function SidebarProvider({
  offen: offenVorgabe,
  aufOffen,
  standardOffen = true,
  eingebettet = false,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  offen?: boolean;
  aufOffen?: (offen: boolean) => void;
  standardOffen?: boolean;
  /**
   * Die Leiste steht IN einer Flaeche und nicht am Rand des Fensters.
   *
   * Vorgabe ist das Fenster: die Leiste ist `fixed` und so hoch wie der
   * Bildschirm -- die Form, in der eine Anwendung ihre eigene Seite baut.
   * Steht sie dagegen in einem Panel (die Shell dieses Geraets ist selbst
   * dreispaltig, und eine Schauseite zeigt sie in einem Kasten), muss sie
   * `absolute` in DIESEM Kasten liegen. Ohne den Unterschied legt sie sich
   * ueber alles, was links von ihr steht.
   */
  eingebettet?: boolean;
}) {
  const schmal = useSchmalesFenster();
  const [blattOffen, setzeBlattOffen] = React.useState(false);
  const [eigen, setzeEigen] = React.useState(standardOffen);
  const offen = offenVorgabe ?? eigen;

  const setzeOffen = React.useCallback(
    (wert: boolean) => {
      if (aufOffen) aufOffen(wert);
      else setzeEigen(wert);
    },
    [aufOffen]
  );

  const umschalten = React.useCallback(() => {
    if (schmal) setzeBlattOffen(zuvor => !zuvor);
    else setzeOffen(!offen);
  }, [schmal, offen, setzeOffen]);

  React.useEffect(() => {
    const taste = (ereignis: KeyboardEvent) => {
      if (ereignis.key === SEITENLEISTE_TASTE && (ereignis.metaKey || ereignis.ctrlKey)) {
        ereignis.preventDefault();
        umschalten();
      }
    };
    window.addEventListener('keydown', taste);
    return () => window.removeEventListener('keydown', taste);
  }, [umschalten]);

  const wert = React.useMemo<SidebarKontext>(
    () => ({
      zustand: offen ? 'offen' : 'zu',
      offen,
      setzeOffen,
      blattOffen,
      setzeBlattOffen,
      schmal,
      umschalten,
    }),
    [offen, setzeOffen, blattOffen, schmal, umschalten]
  );

  return (
    <SidebarContext.Provider value={wert}>
      <div
        data-slot="sidebar-wrapper"
        data-eingebettet={eingebettet || undefined}
        style={
          {
            '--sidebar-breite': SEITENLEISTE_BREIT,
            '--sidebar-breite-symbole': SEITENLEISTE_SYMBOLE,
            ...style,
          } as React.CSSProperties
        }
        className={cn(
          'group/sidebar-wrapper flex w-full',
          eingebettet ? 'relative h-full min-h-0 overflow-hidden' : 'min-h-svh',
          className
        )}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

function Sidebar({
  seite = 'links',
  form = 'spalte',
  einklappen = 'symbole',
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  seite?: 'links' | 'rechts';
  form?: 'spalte' | 'schwebend';
  /** Was beim Zuklappen bleibt: nur die Symbole, oder gar nichts. */
  einklappen?: 'symbole' | 'nichts';
}) {
  const { schmal, zustand, blattOffen, setzeBlattOffen } = useSidebar();

  if (schmal) {
    return (
      <Sheet open={blattOffen} onOpenChange={setzeBlattOffen} {...props}>
        <SheetContent
          data-sidebar="sidebar"
          data-slot="sidebar"
          data-schmal="true"
          side={seite === 'links' ? 'left' : 'right'}
          className="w-(--sidebar-breite-blatt) p-0"
          style={{ '--sidebar-breite-blatt': SEITENLEISTE_BLATT } as React.CSSProperties}
        >
          {/* Ein Blatt ohne zugaenglichen Namen ist fuer einen Screenreader
              ein Kasten ohne Auskunft -- und Radix sagt es in der Konsole,
              die die Schauseite je Zelle mitliest. */}
          <SheetHeader className="sr-only">
            <SheetTitle>Seitenleiste</SheetTitle>
            <SheetDescription>Die Navigation dieser Anwendung.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      className="group peer block"
      data-slot="sidebar"
      data-state={zustand}
      data-einklappen={zustand === 'zu' ? einklappen : ''}
      data-form={form}
      data-seite={seite}
    >
      {/* Der Platzhalter haelt die Spalte im Fluss frei; die Leiste selbst
          steht fest. Ohne ihn spraenge der Inhalt beim Auf- und Zuklappen,
          statt zu gleiten. */}
      <div
        data-slot="sidebar-gap"
        className={cn(
          'relative w-(--sidebar-breite) bg-transparent transition-[width] duration-200 ease-linear',
          'group-data-[einklappen=nichts]:w-0',
          'group-data-[einklappen=symbole]:w-(--sidebar-breite-symbole)'
        )}
      />
      <div
        data-slot="sidebar-container"
        className={cn(
          'fixed inset-y-0 z-10 flex h-svh w-(--sidebar-breite) transition-[left,right,width] duration-200 ease-linear',
          'group-data-[eingebettet]/sidebar-wrapper:absolute group-data-[eingebettet]/sidebar-wrapper:h-full',
          seite === 'links'
            ? 'left-0 group-data-[einklappen=nichts]:left-[calc(var(--sidebar-breite)*-1)]'
            : 'right-0 group-data-[einklappen=nichts]:right-[calc(var(--sidebar-breite)*-1)]',
          'group-data-[einklappen=symbole]:w-(--sidebar-breite-symbole)',
          seite === 'links' ? 'border-r border-border' : 'border-l border-border',
          className
        )}
        {...props}
      >
        <div
          data-sidebar="sidebar"
          className="flex h-full w-full flex-col bg-background group-data-[form=schwebend]:rounded-lg group-data-[form=schwebend]:border group-data-[form=schwebend]:border-border"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<typeof Button>) {
  const { umschalten } = useSidebar();

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon-sm"
      className={cn(className)}
      onClick={ereignis => {
        onClick?.(ereignis);
        umschalten();
      }}
      {...props}
    >
      <PanelLeftIcon />
      <span className="sr-only">Seitenleiste umschalten</span>
    </Button>
  );
}

/**
 * Der Griff an der Kante: ein Klick auf den Rand klappt die Leiste um.
 *
 * Er ist `aria-hidden` und `tabIndex={-1}`: dasselbe tut `SidebarTrigger`,
 * und zwei Wege zu einer Sache in der Tabulatorreihenfolge sind ein Halt,
 * an dem niemand versteht, wo er ist.
 */
function SidebarRail({ className, ...props }: React.ComponentProps<'button'>) {
  const { umschalten } = useSidebar();

  return (
    <button
      type="button"
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-hidden="true"
      tabIndex={-1}
      onClick={umschalten}
      title="Seitenleiste umschalten"
      className={cn(
        'absolute inset-y-0 z-20 flex w-4 -translate-x-1/2 transition-all ease-linear group-data-[seite=links]:-right-4 group-data-[seite=rechts]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-border',
        className
      )}
      {...props}
    />
  );
}

/** Die Flaeche neben der Leiste. */
function SidebarInset({ className, ...props }: React.ComponentProps<'main'>) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn('relative flex w-full flex-1 flex-col bg-background', className)}
      {...props}
    />
  );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn('flex flex-col gap-2 p-ui-2', className)}
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn('mt-auto flex flex-col gap-2 p-ui-2', className)}
      {...props}
    />
  );
}

function SidebarSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="sidebar-separator"
      data-sidebar="separator"
      className={cn('mx-2 w-auto', className)}
      {...props}
    />
  );
}

function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      // `relative` gehoert zu `overflow-auto` (Fund der G1-Abnahme): ein
      // absolut gesetztes Kind entkaeme dem Rollkasten sonst und zaehlte zur
      // Rollbreite des Dokuments.
      className={cn(
        'relative flex min-h-0 flex-1 flex-col gap-0 overflow-auto group-data-[einklappen=symbole]:overflow-hidden',
        className
      )}
      {...props}
    />
  );
}

function SidebarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      className={cn('relative flex w-full min-w-0 flex-col p-ui-2', className)}
      {...props}
    />
  );
}

function SidebarGroupLabel({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<'div'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'div';

  return (
    <Comp
      data-slot="sidebar-group-label"
      data-sidebar="group-label"
      className={cn(
        'flex h-8 shrink-0 items-center rounded-md px-2 text-ui-xs font-medium text-muted-foreground outline-none transition-[margin,opacity] duration-200 ease-linear [&>svg]:size-4 [&>svg]:shrink-0',
        'group-data-[einklappen=symbole]:-mt-8 group-data-[einklappen=symbole]:opacity-0',
        className
      )}
      {...props}
    />
  );
}

function SidebarGroupContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={cn('w-full text-ui-sm', className)}
      {...props}
    />
  );
}

function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn('flex w-full min-w-0 flex-col gap-1', className)}
      {...props}
    />
  );
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn('group/menu-item relative', className)}
      {...props}
    />
  );
}

const sidebarMenuButtonVariants = cva(
  'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-ui-sm outline-none transition-[width,height,padding] hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-accent data-[active=true]:font-medium data-[active=true]:text-foreground group-data-[einklappen=symbole]:size-8! group-data-[einklappen=symbole]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
  {
    variants: {
      variant: {
        default: '',
        outline: 'border border-border bg-background hover:bg-accent',
      },
      size: {
        default: 'h-8 text-ui-sm',
        sm: 'h-7 text-ui-xs',
        lg: 'h-12 text-ui-sm group-data-[einklappen=symbole]:p-0!',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

function SidebarMenuButton({
  asChild = false,
  aktiv = false,
  variant,
  size,
  className,
  ...props
}: React.ComponentProps<'button'> & {
  asChild?: boolean;
  /** Steht der Mensch schon da? Traegt `data-active` und `aria-current`. */
  aktiv?: boolean;
} & VariantProps<typeof sidebarMenuButtonVariants>) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-size={size}
      data-active={aktiv}
      aria-current={aktiv ? 'page' : undefined}
      className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

/** Eine Zahl am Eintrag (offene Freigaben, ungelesene Zeilen). */
function SidebarMenuBadge({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      className={cn(
        'pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-ui-xs font-medium tabular-nums text-muted-foreground select-none',
        'peer-data-[size=sm]/menu-button:top-1 peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5',
        'group-data-[einklappen=symbole]:hidden',
        className
      )}
      {...props}
    />
  );
}

/** Der Platzhalter, solange die Eintraege unterwegs sind. */
function SidebarMenuSkeleton({
  className,
  mitSymbol = true,
  ...props
}: React.ComponentProps<'div'> & { mitSymbol?: boolean }) {
  return (
    <div
      data-slot="sidebar-menu-skeleton"
      data-sidebar="menu-skeleton"
      className={cn('flex h-8 items-center gap-2 rounded-md px-2', className)}
      {...props}
    >
      {mitSymbol && <Skeleton width="1rem" height="1rem" borderRadius="var(--radius-sm)" />}
      <Skeleton height="1rem" width="70%" />
    </div>
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
};
