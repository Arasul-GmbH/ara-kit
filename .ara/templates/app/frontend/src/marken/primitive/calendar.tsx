'use client';

import * as React from 'react';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { DayButton, DayPicker, getDefaultClassNames } from 'react-day-picker';
import { de } from 'react-day-picker/locale';

import { cn } from '../cn';
import { Button, buttonVariants } from './button';

/**
 * Der Kalender: ein Datum aus einem Monat waehlen, statt es zu tippen.
 *
 * ER IST AUF DEUTSCH EINGESTELLT, UND ZWAR HIER. Das Geraet steht in einem
 * deutschen Unternehmen; die Woche faengt am Montag an, die Monate heissen
 * Januar bis Dezember, und das Datum wird als Tag.Monat.Jahr gelesen. Wer
 * das in jeder App neu einstellt, hat irgendwann eine App, in der die Woche
 * am Sonntag anfaengt -- und der Mensch davor waehlt den falschen Tag, ohne
 * es zu merken. `locale` bleibt ueberschreibbar, die Vorgabe ist Deutsch.
 *
 * KEIN EIGENES STYLESHEET. `react-day-picker` bringt eines mit; hier wird
 * stattdessen jede seiner Klassen ersetzt, damit der Kalender aus denselben
 * Tokens lebt wie alles andere -- sonst haette das Geraet eine Flaeche, die
 * dem Theme nicht folgt, und genau die faellt in einer App auf, die gerade
 * niemand ansieht.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  buttonVariant = 'ghost',
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>['variant'];
}) {
  const vorgabe = getDefaultClassNames();

  return (
    <DayPicker
      locale={de}
      showOutsideDays={showOutsideDays}
      className={cn(
        'group/calendar bg-background p-3 [--cell-size:2rem] [[data-slot=popover-content]_&]:bg-transparent',
        className
      )}
      captionLayout={captionLayout}
      formatters={formatters}
      classNames={{
        root: cn('w-fit', vorgabe.root),
        months: cn('relative flex flex-col gap-4 md:flex-row', vorgabe.months),
        month: cn('flex w-full flex-col gap-4', vorgabe.month),
        nav: cn(
          'absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1',
          vorgabe.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          'size-[--cell-size] p-0 aria-disabled:opacity-50',
          vorgabe.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          'size-[--cell-size] p-0 aria-disabled:opacity-50',
          vorgabe.button_next
        ),
        month_caption: cn(
          'flex h-[--cell-size] w-full items-center justify-center px-[--cell-size]',
          vorgabe.month_caption
        ),
        dropdowns: cn(
          'flex h-[--cell-size] w-full items-center justify-center gap-1.5 text-ui font-medium',
          vorgabe.dropdowns
        ),
        dropdown_root: cn(
          'relative rounded-md border border-input shadow-xs has-focus:border-ring has-focus:ring-[3px] has-focus:ring-ring/50',
          vorgabe.dropdown_root
        ),
        dropdown: cn('absolute inset-0 opacity-0', vorgabe.dropdown),
        caption_label: cn(
          'font-medium select-none',
          captionLayout !== 'label' &&
            'flex h-8 items-center gap-1 rounded-md pl-2 text-ui-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground',
          vorgabe.caption_label
        ),
        month_grid: cn('w-full border-collapse', vorgabe.month_grid),
        weekdays: cn('flex', vorgabe.weekdays),
        weekday: cn(
          'flex-1 rounded-md text-ui-xs font-normal text-muted-foreground select-none',
          vorgabe.weekday
        ),
        week: cn('mt-2 flex w-full', vorgabe.week),
        week_number_header: cn('w-[--cell-size] select-none', vorgabe.week_number_header),
        week_number: cn('text-ui-xs text-muted-foreground select-none', vorgabe.week_number),
        day: cn(
          'group/day relative aspect-square h-full w-full p-0 text-center select-none [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md',
          vorgabe.day
        ),
        range_start: cn('rounded-l-md bg-accent', vorgabe.range_start),
        range_middle: cn('rounded-none', vorgabe.range_middle),
        range_end: cn('rounded-r-md bg-accent', vorgabe.range_end),
        today: cn(
          'rounded-md bg-accent text-accent-foreground data-[selected=true]:rounded-none',
          vorgabe.today
        ),
        outside: cn('text-muted-foreground aria-selected:text-muted-foreground', vorgabe.outside),
        disabled: cn('text-muted-foreground opacity-50', vorgabe.disabled),
        hidden: cn('invisible', vorgabe.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className: k, rootRef, ...rest }) => (
          <div data-slot="calendar" ref={rootRef} className={cn(k)} {...rest} />
        ),
        Chevron: ({ className: k, orientation, ...rest }) => {
          if (orientation === 'left')
            return <ChevronLeftIcon className={cn('size-4', k)} {...rest} />;
          if (orientation === 'right')
            return <ChevronRightIcon className={cn('size-4', k)} {...rest} />;
          return <ChevronDownIcon className={cn('size-4', k)} {...rest} />;
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...rest }) => (
          <td {...rest}>
            <div className="flex size-[--cell-size] items-center justify-center text-center">
              {children}
            </div>
          </td>
        ),
        ...components,
      }}
      {...props}
    />
  );
}

/**
 * Ein Tag als Knopf.
 *
 * Der Fokus wandert beim Blaettern mit den Pfeiltasten auf einen anderen
 * Tag; ohne das `focus()` hier bliebe er am Monat stehen, und die Tastatur
 * waere im Kalender eine Sackgasse.
 */
function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const vorgabe = getDefaultClassNames();
  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        'flex aspect-square size-auto w-full min-w-[--cell-size] flex-col gap-1 leading-none font-normal',
        'data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground',
        'data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground',
        'data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-start=true]:rounded-l-md',
        'data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-end=true]:rounded-r-md',
        'group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50',
        vorgabe.day,
        className
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
