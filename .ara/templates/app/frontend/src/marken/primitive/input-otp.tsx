'use client';

import * as React from 'react';
import { OTPInput, OTPInputContext } from 'input-otp';
import { MinusIcon } from 'lucide-react';

import { cn } from '../cn';

/**
 * Das Feld fuer einen Einmalcode: sechs Kaesten, ein Wert.
 *
 * ES SIEHT AUS WIE SECHS FELDER UND IST EINES. Das ist der ganze Punkt.
 * Wer sechs `<input maxlength="1">` nebeneinanderstellt, baut sich die
 * Sonderfaelle selbst: Einfuegen aus der Zwischenablage verteilt nichts,
 * die Ruecktaste kommt nicht ins vorige Feld zurueck, der Passwortmanager
 * fuellt nur den ersten, und ein Screenreader liest sechs namenlose
 * Textfelder vor. Hier steht EIN Feld dahinter, das den Code als Ganzes
 * haelt; die Kaesten sind nur das Bild davon.
 *
 * WANN. Bestaetigungscodes -- aus einer App, aus einer Nachricht. Nicht
 * fuer eine PIN, die man sich merkt, und nicht fuer ein Passwort.
 */
function InputOTP({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput> & { containerClassName?: string }) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn('flex items-center gap-2 has-disabled:opacity-50', containerClassName)}
      className={cn('disabled:cursor-not-allowed', className)}
      {...props}
    />
  );
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="input-otp-group" className={cn('flex items-center', className)} {...props} />
  );
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<'div'> & { index: number }) {
  const kontext = React.useContext(OTPInputContext);
  const kasten = kontext?.slots[index];

  return (
    <div
      data-slot="input-otp-slot"
      data-active={kasten?.isActive}
      className={cn(
        'relative flex h-9 w-9 items-center justify-center border-y border-r border-input text-ui shadow-xs transition-all outline-none first:rounded-l-md first:border-l last:rounded-r-md',
        'data-[active=true]:z-10 data-[active=true]:border-ring data-[active=true]:ring-[3px] data-[active=true]:ring-ring/50',
        className
      )}
      {...props}
    >
      {kasten?.char}
      {kasten?.hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
    </div>
  );
}

/** Der Trenner zwischen zwei Gruppen. Er ist Zierrat, also `aria-hidden`. */
function InputOTPSeparator({ ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="input-otp-separator" role="presentation" aria-hidden="true" {...props}>
      <MinusIcon className="size-4 text-muted-foreground" />
    </div>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
