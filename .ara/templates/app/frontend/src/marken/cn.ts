/**
 * Klassen zusammensetzen -- der Helfer, den jedes Primitiv braucht.
 *
 * Er stand bis H3 in `apps/dashboard-frontend/src/lib/utils.ts`. Mit den
 * Primitiven ist er hierher gezogen, und zwar notgedrungen: ein Baustein
 * dieser Bibliothek darf nicht aus der Shell importieren (`marken.py`,
 * Punkt 4), und `cn` steht in jedem einzelnen von ihnen.
 *
 * Zwei Dinge tut er. `clsx` macht aus Bedingungen eine Zeichenkette
 * (`cn('a', b && 'c')`), `tailwind-merge` wirft weg, was von derselben Sorte
 * doppelt darin steht -- so gewinnt ein `className` von aussen gegen die
 * Vorgabe des Primitivs, statt sich mit ihr zu streiten.
 */
import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge kennt unsere EIGENEN `text-ui*`-Schriftgroessen nicht
 * (`text-ui-xs`/`-sm`/`text-ui`/`-lg`, definiert im `@theme`-Block von
 * `theme.css`). Ohne Kenntnis stuft es sie als Text-FARBE ein -- und wirft die
 * Groesse weg, sobald in einem `cn()` zusaetzlich eine echte Textfarbe steht,
 * z. B. `cn('text-ui-sm', 'text-foreground')` -> nur `text-foreground` bleibt.
 * Betroffene Elemente fielen dann still auf die Default-Groesse (1rem/17px)
 * zurueck -- sichtbar u. a. an zu grossen Terminal-Sitzungs-Tabs.
 *
 * Wir registrieren die Token explizit in der `font-size`-Gruppe, damit Groesse
 * UND Farbe nebeneinander bestehen bleiben. (`text-2xs`/`-md` brauchen das
 * NICHT -- deren Namen matcht tailwind-merge bereits als Groesse.)
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['ui-xs', 'ui-sm', 'ui', 'ui-lg'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
