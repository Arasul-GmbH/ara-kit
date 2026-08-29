import type { ReactNode } from 'react';

import { cn } from '../cn';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../primitive/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../primitive/alert-dialog';
import { XIcon } from 'lucide-react';

/**
 * Die Form eines Dialogs: ein Titelbalken, ein rollender Rumpf, ein Fuss.
 *
 * SEIT H5 IN DER BIBLIOTHEK. Sie stand als `components/ui/Modal.tsx` in der
 * Shell und wusste dort nichts von Arasul -- ein Titel, ein Inhalt, ein Fuss
 * und vier Breiten. `muster/index.ts` fuehrte sie bis H4 ausdruecklich als
 * etwas, das „ueber DIESES Geraet Bescheid weiss"; das war beim Nachlesen
 * schlicht falsch, und die Folge waere gewesen, dass die erste Fachanwendung
 * mit einem Dialog sich diese vierzig Zeilen noch einmal schreibt.
 *
 * WARUM SIE NEBEN `Dialog` STEHT UND KEIN ZWEITER DIALOG IST. `Dialog` ist
 * das Primitiv: Radix' Mechanik plus die Teile (`DialogHeader`,
 * `DialogFooter`, `DialogTitle`). Wer sie einzeln zusammensetzt, schreibt in
 * jedem Aufrufer dieselbe Klassenkette fuer Polsterung, Trennlinie und
 * Rollbereich -- das ist die Doppelung, gegen die die Bibliothek gebaut ist.
 * `Dialogform` ist diese Zusammensetzung, einmal. Sie erfindet keine zweite
 * Mechanik: geoeffnet, geschlossen, Fokus und Escape macht weiterhin Radix.
 *
 * DER RUMPF ROLLT, DER KOPF UND DER FUSS BLEIBEN STEHEN. Ein Dialog, dessen
 * Knoepfe unter dem Bildschirmrand liegen, ist auf einem Telefon eine
 * Sackgasse.
 */
export interface DialogformProps {
  offen: boolean;
  beiSchliessen: () => void;
  /** Der Titel im Kopf. Ohne ihn gibt es keinen Kopf und kein Kreuz. */
  titel?: ReactNode;
  children: ReactNode;
  groesse?: 'klein' | 'mittel' | 'gross' | 'ganz';
  /** Ein Klick daneben schliesst. Aus, wo etwas verloren ginge. */
  schliesstBeiKlickDaneben?: boolean;
  /** Escape schliesst. Aus, wo etwas verloren ginge. */
  schliesstBeiEscape?: boolean;
  /** Die Knoepfe unten, hinter einer Trennlinie. */
  fuss?: ReactNode;
  className?: string;
}

const BREITEN: Record<NonNullable<DialogformProps['groesse']>, string> = {
  klein: 'sm:max-w-100',
  mittel: 'sm:max-w-140',
  gross: 'sm:max-w-200',
  ganz: 'sm:max-w-[calc(100vw-2rem)] h-[calc(100vh-2rem)]',
};

export function Dialogform({
  offen,
  beiSchliessen,
  titel,
  children,
  groesse = 'mittel',
  schliesstBeiKlickDaneben = true,
  schliesstBeiEscape = true,
  fuss,
  className,
}: DialogformProps) {
  return (
    <Dialog
      open={offen}
      onOpenChange={geoeffnet => {
        if (!geoeffnet) beiSchliessen();
      }}
    >
      <DialogContent
        className={cn(
          'flex max-h-[calc(100vh-2rem)] flex-col gap-0 p-0',
          BREITEN[groesse],
          className
        )}
        // Ohne `DialogDescription` warnt Radix in der Konsole. Die Warnung
        // ausdruecklich abschalten ist ehrlicher, als sie in jeder Konsole
        // dieses Geraets stehen zu lassen.
        aria-describedby={undefined}
        showCloseButton={false}
        onInteractOutside={schliesstBeiKlickDaneben ? undefined : e => e.preventDefault()}
        onEscapeKeyDown={schliesstBeiEscape ? undefined : e => e.preventDefault()}
      >
        {titel && (
          <DialogHeader className="flex shrink-0 flex-row items-center justify-between gap-2 border-b border-border px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              {titel}
            </DialogTitle>
            <DialogClose
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Dialog schließen"
            >
              <XIcon className="size-4" />
            </DialogClose>
          </DialogHeader>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4 text-foreground">{children}</div>
        {fuss && (
          <DialogFooter className="shrink-0 border-t border-border px-5 py-4">{fuss}</DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Die Frage, die eine Antwort verlangt: Titel, ein Satz, zwei Knoepfe.
 *
 * SIE STEHT AUF `AlertDialog` UND NICHT AUF `Dialogform`, und das ist der
 * ganze Punkt. Bis H5 war sie ein `Modal` mit zwei Knoepfen darin: sie liess
 * sich mit Escape, mit einem Klick daneben und ueber ein Kreuz schliessen,
 * und alle drei Wege bedeuteten stillschweigend „Abbrechen". Radix'
 * `AlertDialog` laesst nur die zwei Knoepfe zu und legt den Fokus auf den
 * harmlosen -- „Geraet zuruecksetzen" ist damit nicht mehr dieselbe
 * Handbewegung wie „Fenster zu".
 */
export interface BestaetigungProps {
  offen: boolean;
  beiSchliessen: () => void;
  beiBestaetigen?: () => void | Promise<void>;
  titel?: string;
  frage?: ReactNode;
  jaText?: string;
  neinText?: string;
  /** `gefahr` faerbt den Ja-Knopf rot. Alles andere bleibt neutral. */
  art?: 'normal' | 'gefahr';
  laeuft?: boolean;
}

export function Bestaetigung({
  offen,
  beiSchliessen,
  beiBestaetigen,
  titel = 'Bestätigung',
  frage,
  jaText = 'Bestätigen',
  neinText = 'Abbrechen',
  art = 'normal',
  laeuft = false,
}: BestaetigungProps) {
  return (
    <AlertDialog
      open={offen}
      onOpenChange={geoeffnet => {
        if (!geoeffnet) beiSchliessen();
      }}
    >
      <AlertDialogContent className="sm:max-w-100">
        <AlertDialogHeader>
          <AlertDialogTitle>{titel}</AlertDialogTitle>
          {frage && <AlertDialogDescription>{frage}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={laeuft}>{neinText}</AlertDialogCancel>
          <AlertDialogAction
            disabled={laeuft}
            // Der Klick darf den Dialog nicht sofort schliessen: `laeuft`
            // haelt ihn offen, solange die Antwort unterwegs ist.
            onClick={ereignis => {
              ereignis.preventDefault();
              void beiBestaetigen?.();
            }}
            className={
              art === 'gefahr'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : undefined
            }
          >
            {laeuft ? 'Lädt …' : jaText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
