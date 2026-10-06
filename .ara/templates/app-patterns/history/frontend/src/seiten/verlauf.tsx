/**
 * Muster Verlauf: der Verlauf eines Vorgangs, in seinen Einzelheiten. Kein eigener Weg, sondern
 * die letzte Angabe in `Angaben` von `seiten/liste.tsx`; `--add-pattern history` setzt sie dort ein:
 *
 *   <Angabe name="Verlauf">
 *     <VerlaufAmVorgang vorgang={vorgang.id} />
 *   </Angabe>
 *
 * Wer den Vorgang sieht, sieht seinen Verlauf; wer nicht, bekommt vom Backend 404.
 */

import { AsyncBoundary } from "../rahmen/async-boundary";
import { angabenSatz, useVerlauf } from "../verlauf";
import { zeitpunkt } from "../vorgaenge";

export function VerlaufAmVorgang({ vorgang }: { vorgang: number }) {
  const verlauf = useVerlauf(vorgang);
  return (
    <AsyncBoundary abfrage={verlauf} laedt="Der Verlauf wird geholt" fehlerTitel="Der Verlauf ließ sich nicht holen">
      {({ verlauf: eintraege }) =>
        eintraege.length ? (
          <ol className="flex flex-col gap-1.5" data-kennzeichen="verlauf">
            {eintraege.map((eintrag) => {
              const satz = angabenSatz(eintrag);
              return (
                <li key={eintrag.id} className="flex flex-col">
                  <span>
                    <span className="font-medium text-foreground">{eintrag.was}</span>
                    {eintrag.wer ? `, ${eintrag.wer}` : ", das Gerät"}
                  </span>
                  <span className="text-ui-xs text-muted-foreground">
                    {zeitpunkt(eintrag.zeit)}
                    {satz ? ` · ${satz}` : ""}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <span className="text-muted-foreground">Noch nichts geschehen.</span>
        )
      }
    </AsyncBoundary>
  );
}
