'use client';

import * as React from 'react';
import { AspectRatio as AspectRatioPrimitive } from 'radix-ui';

/**
 * Ein Kasten, der sein Seitenverhaeltnis haelt, egal wie breit er wird.
 *
 * Wofuer: ein Bild oder eine Vorschau, deren Groesse erst beim Laden
 * feststeht. Ohne festes Verhaeltnis springt die ganze Seite in dem Moment,
 * in dem die Datei da ist -- und wer bis dahin auf einen Knopf darunter
 * gezielt hat, trifft einen anderen.
 */
function AspectRatio({ ...props }: React.ComponentProps<typeof AspectRatioPrimitive.Root>) {
  return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />;
}

export { AspectRatio };
