import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { XIcon } from 'lucide-react';
import { Dialog as BlattPrimitive } from 'radix-ui';

import { cn } from '../cn';
import { TREFFER } from '../primitive/treffer';
import { useSchmalesFenster } from '../useSchmalesFenster';

/**
 * Das Blatt: Einzelheiten und Formulare, ohne die Seite zu verlassen.
 *
 * Am Rechner steht es als Flaeche daneben, rechts, mit 8 px Abstand zu den
 * Raendern und grossem Radius; links bleibt die Liste sichtbar, aus der es
 * kam. In einer App im Rahmen nennt der Rahmen den Platz seiner Kapsel oben
 * rechts (`--ara-kapsel-platz`); dann beginnt das Blatt unter ihr. Unter
 * 900 px (`useSchmalesFenster`) kommt es von unten, mit einem Griff oben, und
 * laesst sich nach unten wegwischen. Geschlossen wird es ausserdem
 * mit Escape, mit einem Tipp daneben und mit dem Kreuz.
 *
 * Mechanik ist Radix' Dialog, wie bei `Sheet` und `Dialogform`: Fokusfalle,
 * Escape, Klick daneben, der Fokus kehrt zum Ausloeser zurueck. Das Blatt
 * erfindet davon nichts neu, es legt nur die Form fest: Kopf mit Titel und
 * einem Satz, ein Rumpf, der in sich rollt, und unten die Aktionen in
 * Daumenreichweite.
 *
 * Die Flaeche ist deckend (`--card`): darin stehen Felder und Tabellen, und
 * die bleiben deckend. Der Schleier dahinter ist leicht, damit man sieht, wo
 * man herkam. Das Blatt geht mit Schwung auf (240 ms) und schneller zu
 * (180 ms); wer „weniger Bewegung" eingestellt hat, sieht sofort den
 * Endzustand.
 *
 * Wer etwas oeffnet, das ein Blatt zeigt, setzt an den Ausloeser
 * `data-blatt-oeffnen`. Das Blatt selbst traegt `data-blatt` mit `seite` oder
 * `unten`, der Titel `data-blatt-titel`, der Griff `data-blatt-griff`: daran
 * messen die Abnahmen, ohne die Klassen zu kennen.
 */
export interface BlattProps {
  offen: boolean;
  beiSchliessen: () => void;
  /** Der Titel im Kopf. Pflicht: ein Blatt ohne Titel liest kein Vorlesewerkzeug vor. */
  titel: ReactNode;
  /** Ein Satz unter dem Titel. */
  beschreibung?: ReactNode;
  /** Was ueber dem Titel steht, klein: eine Nummer, ein Stand. */
  oben?: ReactNode;
  children: ReactNode;
  /** Die Aktionen unten. Am Handy liegen sie damit in Daumenreichweite. */
  fuss?: ReactNode;
  /** `breit` fuer Einzelansichten mit Tabelle oder Dokument (640 statt 480 px). */
  breite?: 'normal' | 'breit';
  /** Ein Klick daneben schliesst. Aus, wo etwas verloren ginge. */
  schliesstBeiKlickDaneben?: boolean;
  /** Escape und Wischen schliessen. Aus, wo etwas verloren ginge. */
  schliesstBeiEscape?: boolean;
  /** `data-testid` der Flaeche. */
  kennzeichen?: string;
  className?: string;
}

/** Wie weit man am Handy nach unten wischen muss, damit es zugeht. */
const WISCH_SCHWELLE_PX = 80;

export function Blatt({
  offen,
  beiSchliessen,
  titel,
  beschreibung,
  oben,
  children,
  fuss,
  breite = 'normal',
  schliesstBeiKlickDaneben = true,
  schliesstBeiEscape = true,
  kennzeichen,
  className,
}: BlattProps) {
  const schmal = useSchmalesFenster();
  const flaeche = useRef<HTMLDivElement>(null);
  const wisch = useRef<{ start: number; zeit: number; weg: number } | null>(null);

  // Wischen nach unten, nur am Handy und nur am Kopf: im Rumpf rollt der Inhalt.
  const wischBeginn = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!schmal || !schliesstBeiEscape || e.pointerType === 'mouse') return;
    if ((e.target as HTMLElement).closest('button,a,input,select,textarea')) return;
    wisch.current = { start: e.clientY, zeit: performance.now(), weg: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const wischZug = (e: ReactPointerEvent<HTMLDivElement>) => {
    const w = wisch.current;
    const f = flaeche.current;
    if (!w || !f) return;
    w.weg = Math.max(0, e.clientY - w.start);
    f.style.transition = 'none';
    f.style.transform = `translateY(${w.weg}px)`;
  };
  const wischEnde = () => {
    const w = wisch.current;
    const f = flaeche.current;
    wisch.current = null;
    if (!w || !f) return;
    const tempo = w.weg / Math.max(1, performance.now() - w.zeit);
    f.style.transition = '';
    f.style.transform = '';
    if (w.weg > WISCH_SCHWELLE_PX || tempo > 0.6) beiSchliessen();
  };

  return (
    <BlattPrimitive.Root
      open={offen}
      onOpenChange={geoeffnet => {
        if (!geoeffnet) beiSchliessen();
      }}
    >
      <BlattPrimitive.Portal>
        <BlattPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-backdrop-leicht',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
            'motion-reduce:animate-none'
          )}
        />
        <BlattPrimitive.Content
          ref={flaeche}
          data-blatt={schmal ? 'unten' : 'seite'}
          data-testid={kennzeichen}
          onInteractOutside={schliesstBeiKlickDaneben ? undefined : e => e.preventDefault()}
          onEscapeKeyDown={schliesstBeiEscape ? undefined : e => e.preventDefault()}
          className={cn(
            'fixed z-50 flex flex-col overflow-hidden border border-border bg-card text-card-foreground shadow-[var(--schatten-blatt)] outline-none',
            'transition-transform duration-200 ease-out',
            'data-[state=open]:animate-in data-[state=open]:duration-[240ms] data-[state=open]:ease-[cubic-bezier(0.32,0.72,0,1)]',
            'data-[state=closed]:animate-out data-[state=closed]:duration-[180ms] data-[state=closed]:ease-in',
            'motion-reduce:animate-none motion-reduce:transition-none',
            schmal
              ? 'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[var(--radius-blatt)] border-b-0 pb-[env(safe-area-inset-bottom)] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom'
              : cn(
                  'top-[calc(8px_+_min(var(--ara-kapsel-platz,0px),_40px))] right-[8px] bottom-[8px] w-[calc(100vw-16px)] rounded-[var(--radius-blatt)] data-[state=closed]:slide-out-to-right-[40%] data-[state=closed]:fade-out-0 data-[state=open]:slide-in-from-right-[40%] data-[state=open]:fade-in-0',
                  breite === 'breit' ? 'max-w-[640px]' : 'max-w-[480px]'
                ),
            className
          )}
        >
          <div
            className={cn('shrink-0 touch-none select-none', schmal ? 'pt-[6px]' : 'pt-[16px]')}
            onPointerDown={wischBeginn}
            onPointerMove={wischZug}
            onPointerUp={wischEnde}
            onPointerCancel={wischEnde}
          >
            {schmal && (
              <span
                data-blatt-griff=""
                aria-hidden="true"
                className="mx-auto mb-[6px] block h-[5px] w-[40px] rounded-full bg-muted-foreground/40"
              />
            )}
            <div className="flex items-start gap-[12px] px-[20px] pb-[12px]">
              <div className="min-w-0 flex-1">
                {oben && <div className="mb-[4px] text-xs text-muted-foreground">{oben}</div>}
                <BlattPrimitive.Title
                  data-blatt-titel=""
                  className="text-[20px] leading-[26px] font-semibold text-foreground"
                >
                  {titel}
                </BlattPrimitive.Title>
                {beschreibung ? (
                  <BlattPrimitive.Description className="mt-[4px] text-sm text-muted-foreground">
                    {beschreibung}
                  </BlattPrimitive.Description>
                ) : (
                  <BlattPrimitive.Description className="sr-only">
                    {titel}
                  </BlattPrimitive.Description>
                )}
              </div>
              <BlattPrimitive.Close
                aria-label="Schließen"
                className={cn(
                  'relative -mt-[2px] -mr-[6px] flex size-[28px] shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  TREFFER
                )}
              >
                <XIcon className="size-4" strokeWidth={1.75} />
              </BlattPrimitive.Close>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-border px-[20px] py-[16px]">
            {children}
          </div>
          {fuss && (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-[8px] border-t border-border px-[20px] py-[12px] max-[899px]:[&>*]:flex-1">
              {fuss}
            </div>
          )}
        </BlattPrimitive.Content>
      </BlattPrimitive.Portal>
    </BlattPrimitive.Root>
  );
}
