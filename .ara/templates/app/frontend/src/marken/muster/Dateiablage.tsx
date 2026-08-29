'use client';

import * as React from 'react';
import { FileIcon, UploadIcon, XIcon } from 'lucide-react';

import { cn } from '../cn';
import { Button } from '../primitive/button';

/** Eine Groesse in Bytes, so wie ein Mensch sie liest. */
function groesseInWorten(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const einheiten = ['kB', 'MB', 'GB'];
  let wert = bytes / 1024;
  let i = 0;
  while (wert >= 1024 && i < einheiten.length - 1) {
    wert /= 1024;
    i += 1;
  }
  return `${wert.toFixed(wert < 10 ? 1 : 0)} ${einheiten[i]}`;
}

/**
 * Die Dateiablage: Dateien hineinziehen oder auswaehlen.
 *
 * ZIEHEN IST DER ZWEITE WEG UND NIE DER EINZIGE. Eine Flaeche, auf die man
 * nur etwas fallen lassen kann, ist mit der Tastatur nicht zu bedienen und
 * auf einem Telefon gar nicht -- dort gibt es kein Ziehen. Deshalb ist der
 * Kasten hier ein KNOPF: Enter oder Leertaste oeffnen die Dateiauswahl,
 * Ziehen tut dasselbe, und beides fuehrt an dieselbe Stelle.
 *
 * SIE LAEDT NICHTS HOCH. Was mit den Dateien geschieht, weiss die Anwendung
 * -- sie kennt den Weg, den Schluessel und die Fehler. Dieser Baustein sagt
 * nur, WELCHE Dateien gewaehlt sind, und zeigt sie an. Ein Baustein, der
 * selbst hochlaedt, muesste eine Adresse kennen, und dann wuesste er etwas
 * ueber die Anwendung.
 *
 * SIE IST GESTEUERT: die Liste kommt von aussen, jede Aenderung geht nach
 * aussen. Zwei Wahrheiten darueber, was gerade ausgewaehlt ist, sind eine
 * zu viel.
 */
export interface DateiablageProps {
  /** Die gewaehlten Dateien. */
  dateien: readonly File[];
  aufDateien: (dateien: File[]) => void;
  /** Mehrere auf einmal? Ohne das ersetzt die naechste die vorige. */
  mehrere?: boolean;
  /** Was der Dateidialog vorschlaegt, etwa `.pdf,image/*`. */
  akzeptiert?: string;
  /** Groesse in Bytes, ueber der eine Datei abgewiesen wird. */
  maxGroesse?: number;
  /** Was ueber dem Kasten steht. */
  hinweis?: string;
  disabled?: boolean;
  className?: string;
}

export function Dateiablage({
  dateien,
  aufDateien,
  mehrere = true,
  akzeptiert,
  maxGroesse,
  hinweis = 'Datei hierher ziehen oder auswählen',
  disabled,
  className,
}: DateiablageProps) {
  const eingabe = React.useRef<HTMLInputElement>(null);
  const [ueber, setUeber] = React.useState(false);
  const [abgewiesen, setAbgewiesen] = React.useState<string[]>([]);

  const uebernehmen = React.useCallback(
    (liste: FileList | null) => {
      if (!liste) return;
      const neu: File[] = [];
      const zuGross: string[] = [];
      for (const datei of Array.from(liste)) {
        if (maxGroesse !== undefined && datei.size > maxGroesse) zuGross.push(datei.name);
        else neu.push(datei);
      }
      setAbgewiesen(zuGross);
      if (neu.length) aufDateien(mehrere ? [...dateien, ...neu] : neu.slice(0, 1));
    },
    [aufDateien, dateien, maxGroesse, mehrere]
  );

  return (
    <div className={cn('flex flex-col gap-ui-2', className)} data-slot="dateiablage">
      <button
        type="button"
        disabled={disabled}
        onClick={() => eingabe.current?.click()}
        onDragOver={ereignis => {
          ereignis.preventDefault();
          if (!disabled) setUeber(true);
        }}
        onDragLeave={() => setUeber(false)}
        onDrop={ereignis => {
          ereignis.preventDefault();
          setUeber(false);
          if (!disabled) uebernehmen(ereignis.dataTransfer.files);
        }}
        data-ueber={ueber || undefined}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-input p-ui-4 text-ui-sm text-muted-foreground transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
          'data-[ueber=true]:border-primary data-[ueber=true]:bg-accent',
          'disabled:pointer-events-none disabled:opacity-50'
        )}
      >
        <UploadIcon className="size-5" aria-hidden="true" />
        <span>{hinweis}</span>
        {maxGroesse !== undefined && (
          <span className="text-ui-xs">höchstens {groesseInWorten(maxGroesse)} je Datei</span>
        )}
      </button>

      {/* Das eigentliche Feld bleibt im Dokument und ist nur unsichtbar:
          ein `display: none` nimmt ihm in manchen Browsern das `click()`. */}
      <input
        ref={eingabe}
        type="file"
        className="sr-only"
        tabIndex={-1}
        multiple={mehrere}
        accept={akzeptiert}
        disabled={disabled}
        onChange={ereignis => {
          uebernehmen(ereignis.target.files);
          // Zuruecksetzen, sonst loest dieselbe Datei ein zweites Mal
          // kein `change` aus -- der haeufigste stille Fehler an dieser Stelle.
          ereignis.target.value = '';
        }}
      />

      {abgewiesen.length > 0 && (
        <p role="alert" className="text-ui-sm text-destructive">
          Zu groß und deshalb nicht übernommen: {abgewiesen.join(', ')}
        </p>
      )}

      {dateien.length > 0 && (
        <ul className="flex flex-col gap-1">
          {dateien.map((datei, i) => (
            <li
              key={`${datei.name}-${i}`}
              className="flex items-center gap-2 rounded-md border border-border px-ui-2 py-ui-1 text-ui-sm"
            >
              <FileIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{datei.name}</span>
              <span className="shrink-0 text-ui-xs text-muted-foreground">
                {groesseInWorten(datei.size)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={disabled}
                aria-label={`${datei.name} entfernen`}
                onClick={() => aufDateien(dateien.filter((_, j) => j !== i))}
              >
                <XIcon />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
