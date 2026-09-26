/**
 * Die Formularseite: einen Vorgang einreichen.
 *
 * Sie ist aus `Formularseite` und `Feldgruppe` gebaut, den Mustern der
 * Bibliothek. Die Gruppe trägt Überschrift, Beschreibung und die Trennlinie
 * dazwischen; `Formularseite` nimmt der letzten Gruppe ihre Linie wieder ab.
 * Das ist die Stelle, an der eine Anwendung sonst ihre fünfte Art erfindet,
 * zwei Abschnitte zu trennen.
 *
 * Ein `form` bleibt es trotzdem, und das ist mehr als eine Ansammlung von
 * Eingaben: die Eingabetaste im letzten Feld sendet ab, und der Browser bietet
 * seine Hilfen an. `Label` und `id` gehören zusammen, an jedem Feld; ohne
 * sie läse ein Screenreader ein Feld ohne Namen vor. Neben dem Namen steht,
 * ob das Feld sein muss, und nicht erst, wenn es fehlt.
 *
 * **Wer ihn einreicht, steht in keinem Feld.** Das sagt die Plattform, und die
 * App liest es aus `api/me`. Ein Namensfeld wäre eines, in das jeder einen
 * anderen Namen schreiben kann.
 */

import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircleAlertIcon } from "lucide-react";
import { Button, Feldgruppe, Formularseite, Input, Kopf, Label, Meldung, Textarea } from "@marken";
import { useAnmeldung } from "../rahmen/anmeldung";
import { useEinreichen } from "../vorgaenge";

/** Das Wort neben einem Feldnamen: ob es sein muss oder sein darf. */
function Pflicht({ muss }: { muss: boolean }) {
  return <span className="text-ui-xs font-normal text-muted-foreground">{muss ? "Pflichtfeld" : "freiwillig"}</span>;
}

export function Neu() {
  const anmeldung = useAnmeldung();
  const [titel, setTitel] = useState("");
  const [text, setText] = useState("");
  const [versucht, setVersucht] = useState(false);
  const titelFeld = useRef<HTMLInputElement>(null);
  const einreichen = useEinreichen();
  const weiter = useNavigate();
  const titelFehlt = versucht && !titel.trim();

  // Der Knopf ist nie grau, solange nichts läuft. Ein grauer Knopf sagt
  // nicht, warum; ein Klick darauf sagt es am Feld und setzt den Fokus hin.
  const absenden = (ereignis: React.FormEvent) => {
    ereignis.preventDefault();
    if (einreichen.isPending) return;
    if (!titel.trim()) {
      setVersucht(true);
      titelFeld.current?.focus();
      return;
    }
    einreichen.mutate({ titel, text }, { onSuccess: () => weiter("/") });
  };

  return (
    <>
      <Kopf
        titel="Neuer Vorgang"
        beschreibung={
          anmeldung.nutzer
            ? `Eingereicht als ${anmeldung.nutzer}.`
            : "Das Gerät nennt keinen Namen für diese Sitzung."
        }
        aktionen={
          <Button variant="ghost" onClick={() => weiter("/")} data-kennzeichen="zurueck">
            Zurück
          </Button>
        }
      />

      {einreichen.isError && (
        <Meldung art="fehler" titel="Der Vorgang ist nicht angekommen">
          {einreichen.error instanceof Error ? einreichen.error.message : "Die App hat keine Verbindung zum Gerät."}{" "}
          Was eingetragen ist, steht noch da; Einreichen versucht es noch einmal.
        </Meldung>
      )}

      {/* `noValidate`: die Meldung steht am Feld in den Worten der App und
          nicht als Blase des Browsers, die bei jedem anders aussieht. */}
      <form onSubmit={absenden} noValidate>
        <Formularseite>
          <Feldgruppe titel="Worum es geht" beschreibung="Ein Satz, an dem man den Vorgang wiedererkennt.">
            <div className="flex flex-col gap-2">
              <Label htmlFor="titel">
                Titel <Pflicht muss />
              </Label>
              <Input
                id="titel"
                ref={titelFeld}
                value={titel}
                onChange={(e) => setTitel(e.target.value)}
                maxLength={200}
                aria-required="true"
                aria-invalid={titelFehlt || undefined}
                aria-describedby={titelFehlt ? "titel-fehlt" : undefined}
              />
              {titelFehlt && (
                // Der Satz in Textfarbe, das Zeichen in Rot: Rot als Text
                // hielte im hellen Thema keine 4,5:1.
                <p id="titel-fehlt" className="flex items-center gap-1.5 text-ui-sm text-foreground">
                  <CircleAlertIcon className="size-4 shrink-0 text-destructive" aria-hidden="true" />
                  Ohne Titel findet den Vorgang niemand wieder. Ein Satz genügt.
                </p>
              )}
            </div>
          </Feldgruppe>

          <Feldgruppe titel="Was dazu zu sagen ist" beschreibung="Was der braucht, der entscheidet.">
            <div className="flex flex-col gap-2">
              <Label htmlFor="text">
                Beschreibung <Pflicht muss={false} />
              </Label>
              <Textarea id="text" value={text} onChange={(e) => setText(e.target.value)} rows={4} />
            </div>
          </Feldgruppe>

          <div className="flex justify-end">
            <Button type="submit" variant="solid" data-kennzeichen="einreichen" disabled={einreichen.isPending}>
              {einreichen.isPending ? "Wird eingereicht …" : "Einreichen"}
            </Button>
          </div>
        </Formularseite>
      </form>
    </>
  );
}
