'use client';

import * as React from 'react';
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, SearchIcon } from 'lucide-react';

import { cn } from '../cn';
import { useSchmalesFenster } from '../useSchmalesFenster';
import { Input } from '../primitive/input';
import { Skeleton } from '../primitive/skeleton';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../primitive/table';
import { Leerzustand } from './Leerzustand';

/**
 * Die Datenliste: die Form, in der eine Fachanwendung ihre Daten zeigt.
 *
 * SIE IST EIN BAUSTEIN UND KEINE TABELLE. Eine Tabelle ist eine
 * Darstellung; hier ist die Frage die: „ich habe Zeilen und will sie
 * zeigen, sortieren, durchsuchen -- und auf einem Telefon soll es auch
 * gehen". Das sind vier Dinge, und jede Seite, die sie einzeln loest, loest
 * sie anders.
 *
 * UNTER 900 PX WIRD AUS DER TABELLE EINE KARTENLISTE, und das ist die
 * eigentliche Arbeit dieses Bausteins. Eine Tabelle mit sechs Spalten passt
 * auf keinem Telefon; sie waagerecht rollen zu lassen heisst, dass niemand
 * die Spalte findet, die ihn interessiert. Dieselbe Entscheidung wie in der
 * Verwaltung des Geraets seit D5 (`useSchmalesFenster`), und dieselbe
 * Schwelle -- es gibt keinen zweiten Schwellenwert im Produkt.
 *
 * IMMER NUR EINE FORM IM DOKUMENT. Nicht beide mit `hidden` nebeneinander:
 * jede Kennung staende dann doppelt da, und ein Screenreader liest die
 * Liste zweimal. Dieselbe Falle wie bei den Verwaltungstabellen aus D5.
 *
 * DIE SPALTEN SIND DATEN UND KEIN MARKUP. Eine `Spalte` sagt, wie sie
 * heisst, was in der Zelle steht (`zelle`) und -- wenn sie sortierbar oder
 * durchsuchbar sein soll -- welchen VERGLEICHBAREN Wert sie hat (`wert`).
 * Beides getrennt, weil das, was man sieht, selten das ist, wonach man
 * sortiert: „vor 3 Tagen" sortiert nach einem Zeitstempel, „2,1 GB" nach
 * einer Zahl. Wer beides in einen Topf wirft, sortiert Zeichenketten und
 * bekommt 10 vor 9.
 */
export interface Spalte<Zeile> {
  /** Stabile Kennung der Spalte -- sie steht im Sortierzustand. */
  schluessel: string;
  titel: string;
  /** Was in der Zelle steht. */
  zelle: (zeile: Zeile) => React.ReactNode;
  /**
   * Der vergleichbare Wert dieser Spalte: wonach sortiert und worin gesucht
   * wird. Ohne ihn ist die Spalte weder sortierbar noch durchsuchbar -- eine
   * Spalte mit einem Knopf darin hat keinen Wert, und das ist richtig so.
   */
  wert?: (zeile: Zeile) => string | number | null | undefined;
  ausrichtung?: 'links' | 'rechts';
  /** Unter 900 px: steht die Spalte in der Karte? Vorgabe ja. */
  inKarte?: boolean;
}

export interface DatenlisteProps<Zeile> {
  daten: readonly Zeile[];
  spalten: ReadonlyArray<Spalte<Zeile>>;
  /** Die Kennung einer Zeile. Sie ist der `key` und muss eindeutig sein. */
  kennung: (zeile: Zeile) => string;
  /**
   * Wozu diese Liste da ist -- als Bildunterschrift und als erste Auskunft
   * fuer ein Vorlesewerkzeug. Pflicht: „Tabelle" ist keine.
   */
  beschriftung: string;
  /** Solange die Daten unterwegs sind: Platzhalter in der Form der Liste. */
  laedt?: boolean;
  /** Das Suchfeld ueber der Liste. */
  filter?: boolean;
  filterPlatzhalter?: string;
  /** Was dasteht, wenn nichts da ist. Ohne Angabe ein knapper Satz. */
  leer?: { titel: string; beschreibung?: React.ReactNode; aktion?: React.ReactNode };
  /** Was dasteht, wenn der Filter alles wegnimmt. */
  leerGefiltert?: string;
  /** Ein Klick auf die Zeile. Ohne ihn ist die Zeile nichts zum Anklicken. */
  aufZeile?: (zeile: Zeile) => void;
  className?: string;
}

type Richtung = 'auf' | 'ab';

function vergleiche(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  // `localeCompare` mit deutschem Gebietsschema: sonst steht „Ärger" hinter
  // „Zeit", und die Liste ist fuer den, der sie liest, nicht sortiert.
  return String(a).localeCompare(String(b), 'de', { numeric: true, sensitivity: 'base' });
}

export function Datenliste<Zeile>({
  daten,
  spalten,
  kennung,
  beschriftung,
  laedt = false,
  filter = false,
  filterPlatzhalter = 'In der Liste suchen …',
  leer,
  leerGefiltert = 'Nichts passt zu dieser Suche.',
  aufZeile,
  className,
}: DatenlisteProps<Zeile>) {
  const schmal = useSchmalesFenster();
  const [suche, setSuche] = React.useState('');
  const [sortierung, setSortierung] = React.useState<{
    schluessel: string;
    richtung: Richtung;
  } | null>(null);

  const gefiltert = React.useMemo(() => {
    const begriff = suche.trim().toLowerCase();
    if (!begriff) return daten;
    return daten.filter(zeile =>
      spalten.some(spalte => {
        const wert = spalte.wert?.(zeile);
        return wert != null && String(wert).toLowerCase().includes(begriff);
      })
    );
  }, [daten, spalten, suche]);

  const sortiert = React.useMemo(() => {
    if (!sortierung) return gefiltert;
    const spalte = spalten.find(s => s.schluessel === sortierung.schluessel);
    if (!spalte?.wert) return gefiltert;
    const lesen = spalte.wert;
    // Eine Kopie: `sort` sortiert an Ort und Stelle, und die Daten gehoeren
    // dem Aufrufer.
    return [...gefiltert].sort((a, b) => {
      const ergebnis = vergleiche(lesen(a), lesen(b));
      return sortierung.richtung === 'auf' ? ergebnis : -ergebnis;
    });
  }, [gefiltert, sortierung, spalten]);

  const umschalten = (schluessel: string) =>
    setSortierung(zuvor =>
      zuvor?.schluessel === schluessel
        ? { schluessel, richtung: zuvor.richtung === 'auf' ? 'ab' : 'auf' }
        : { schluessel, richtung: 'auf' }
    );

  const suchfeld = filter ? (
    <div className="relative w-full max-w-72">
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={suche}
        onChange={ereignis => setSuche(ereignis.target.value)}
        placeholder={filterPlatzhalter}
        aria-label={`${beschriftung} durchsuchen`}
        className="pl-8"
      />
    </div>
  ) : null;

  if (laedt) {
    return (
      <div className={cn('flex flex-col gap-ui-2', className)} data-slot="datenliste">
        {suchfeld}
        <div
          className="flex flex-col gap-2"
          role="status"
          aria-label={`${beschriftung} wird geladen`}
        >
          {[0, 1, 2, 3, 4].map(i => (
            <Skeleton key={i} height="2.25rem" />
          ))}
        </div>
      </div>
    );
  }

  if (sortiert.length === 0) {
    return (
      <div className={cn('flex flex-col gap-ui-2', className)} data-slot="datenliste">
        {suchfeld}
        {suche.trim() ? (
          <Leerzustand titel={leerGefiltert} symbol={<SearchIcon />} />
        ) : (
          <Leerzustand
            titel={leer?.titel ?? 'Noch nichts da.'}
            beschreibung={leer?.beschreibung}
            aktion={leer?.aktion}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn('flex flex-col gap-ui-2', className)}
      data-slot="datenliste"
      data-form={schmal ? 'karten' : 'tabelle'}
    >
      {suchfeld}
      {schmal ? (
        <ul className="flex flex-col gap-ui-2" aria-label={beschriftung}>
          {sortiert.map(zeile => {
            const inhalt = (
              <>
                {spalten
                  .filter(spalte => spalte.inKarte !== false)
                  .map((spalte, i) => (
                    <div
                      key={spalte.schluessel}
                      className={cn(
                        'flex items-baseline justify-between gap-3',
                        i === 0 && 'text-ui font-medium text-foreground'
                      )}
                    >
                      {i > 0 && (
                        <span className="shrink-0 text-ui-xs text-muted-foreground">
                          {spalte.titel}
                        </span>
                      )}
                      <span className={cn('min-w-0', i > 0 && 'text-right text-ui-sm')}>
                        {spalte.zelle(zeile)}
                      </span>
                    </div>
                  ))}
              </>
            );
            return (
              <li key={kennung(zeile)}>
                {aufZeile ? (
                  <button
                    type="button"
                    onClick={() => aufZeile(zeile)}
                    className="flex w-full flex-col gap-1 rounded-md border border-border p-ui-2 text-left transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    {inhalt}
                  </button>
                ) : (
                  <div className="flex flex-col gap-1 rounded-md border border-border p-ui-2">
                    {inhalt}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <Table>
          <TableCaption>{beschriftung}</TableCaption>
          <TableHeader>
            <TableRow>
              {spalten.map(spalte => {
                const sortierbar = Boolean(spalte.wert);
                const aktiv = sortierung?.schluessel === spalte.schluessel;
                return (
                  <TableHead
                    key={spalte.schluessel}
                    className={spalte.ausrichtung === 'rechts' ? 'text-right' : undefined}
                    // `aria-sort` ist die Auskunft, die ein Screenreader
                    // liest; der Pfeil daneben ist dieselbe fuer die Augen.
                    aria-sort={
                      sortierbar
                        ? aktiv
                          ? sortierung?.richtung === 'auf'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                        : undefined
                    }
                  >
                    {sortierbar ? (
                      <button
                        type="button"
                        onClick={() => umschalten(spalte.schluessel)}
                        className="inline-flex items-center gap-1 rounded-sm hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        {spalte.titel}
                        {!aktiv && <ArrowUpDownIcon className="size-3 opacity-50" />}
                        {aktiv && sortierung?.richtung === 'auf' && (
                          <ArrowUpIcon className="size-3" />
                        )}
                        {aktiv && sortierung?.richtung === 'ab' && (
                          <ArrowDownIcon className="size-3" />
                        )}
                      </button>
                    ) : (
                      spalte.titel
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortiert.map(zeile => (
              <TableRow
                key={kennung(zeile)}
                onClick={aufZeile ? () => aufZeile(zeile) : undefined}
                className={aufZeile ? 'cursor-pointer' : undefined}
              >
                {spalten.map(spalte => (
                  <TableCell
                    key={spalte.schluessel}
                    className={spalte.ausrichtung === 'rechts' ? 'text-right' : undefined}
                  >
                    {spalte.zelle(zeile)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
