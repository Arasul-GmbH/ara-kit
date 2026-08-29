'use client';

import * as React from 'react';
import { Slot } from 'radix-ui';
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';

import { cn } from '../cn';
import { Label } from './label';

/**
 * Das Formular als Bausatz -- der Teil, den sonst jede Seite neu erfindet.
 *
 * WAS ES WIRKLICH LOEST, IST NICHT DAS AUSSEHEN, SONDERN DIE VERDRAHTUNG.
 * Ein Feld mit einer Fehlermeldung braucht vier zusammenhaengende Dinge:
 * eine Kennung, ein `htmlFor` daran, ein `aria-describedby` auf Hinweis UND
 * Meldung, und ein `aria-invalid`. Wer das von Hand schreibt, schreibt es
 * beim dritten Feld anders, und bei einem lässt er es weg -- dann sagt der
 * Screenreader „Textfeld" und nicht, was daran falsch ist.
 * `FormItem` vergibt die Kennung, `useFormField` gibt sie allen darin
 * weiter, und keiner der drei Bausteine muss sie kennen.
 *
 * Es steht auf `react-hook-form`, das die Shell fuer Anmeldung und
 * Administrator-Anlage ohnehin benutzt -- keine neue Abhaengigkeit, und
 * kein zweiter Formular-Zustand neben dem, den es schon gibt.
 */
const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = { name: TName };

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);

function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ ...props }: ControllerProps<TFieldValues, TName>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

type FormItemContextValue = { id: string };

const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue);

function useFormField() {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState } = useFormContext();
  const formState = useFormState({ name: fieldContext.name });
  const fieldState = getFieldState(fieldContext.name, formState);

  if (!fieldContext) {
    throw new Error('useFormField muss innerhalb von <FormField> stehen');
  }

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
}

function FormItem({ className, ...props }: React.ComponentProps<'div'>) {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div data-slot="form-item" className={cn('grid gap-2', className)} {...props} />
    </FormItemContext.Provider>
  );
}

function FormLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  const { error, formItemId } = useFormField();

  return (
    <Label
      data-slot="form-label"
      data-error={!!error}
      className={cn('data-[error=true]:text-destructive', className)}
      htmlFor={formItemId}
      {...props}
    />
  );
}

function FormControl({ ...props }: React.ComponentProps<typeof Slot.Root>) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();

  return (
    <Slot.Root
      data-slot="form-control"
      id={formItemId}
      aria-describedby={!error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`}
      aria-invalid={!!error}
      {...props}
    />
  );
}

function FormDescription({ className, ...props }: React.ComponentProps<'p'>) {
  const { formDescriptionId } = useFormField();

  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn('text-ui-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

/**
 * Die Fehlermeldung eines Feldes. Steht keine an, steht hier nichts --
 * ein leerer Kasten, der Platz reserviert, sagt „hier war mal ein Fehler".
 */
function FormMessage({ className, ...props }: React.ComponentProps<'p'>) {
  const { error, formMessageId } = useFormField();
  const inhalt = error ? String(error?.message ?? '') : props.children;

  if (!inhalt) return null;

  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      className={cn('text-ui-sm text-destructive', className)}
      {...props}
    >
      {inhalt}
    </p>
  );
}

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
};
