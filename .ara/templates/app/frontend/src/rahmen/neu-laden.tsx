/**
 * Das Werkzeug „Neu laden“ für die Werkzeugleiste im Seitenkopf.
 *
 * Jede Seite der App beginnt mit dem `Kopf` der Bibliothek, rechts die
 * Werkzeugleiste (seit Marken 5.9.0). Was eine Seite zeigt, holt sie über
 * eine Abfrage; dieses Werkzeug holt sie noch einmal, ohne die Seite neu zu
 * laden und ohne dass Eingaben verloren gehen. `schluessel` ist der Anfang
 * des Schlüssels der Abfrage: `["vorgaenge"]` holt jede Abfrage neu, deren
 * Schlüssel damit beginnt. Ohne `schluessel` holt es alles neu, was die App
 * gerade zeigt, für eine Seite, die aus mehreren Abfragen besteht.
 *
 * Das Symbol kommt aus `@marken/symbole` und wird mit `Icon` gezeichnet,
 * wie jedes Symbol dieser App.
 */

import { useQueryClient } from "@tanstack/react-query";
import { Icon, Werkzeug } from "@marken";
import { RefreshCw } from "@marken/symbole";

export function NeuLaden({ schluessel }: { schluessel?: readonly string[] }) {
  const speicher = useQueryClient();
  return (
    <Werkzeug
      symbol={<Icon symbol={RefreshCw} />}
      beschriftung="Neu laden"
      onClick={() => void speicher.invalidateQueries(schluessel ? { queryKey: [...schluessel] } : undefined)}
      data-kennzeichen="neu-laden"
    />
  );
}
