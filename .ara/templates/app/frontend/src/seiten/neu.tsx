/**
 * Die Formularseite: einen Vorgang einreichen.
 *
 * Sie ist aus `Formularseite` und `Feldgruppe` gebaut, den Mustern der
 * Bibliothek. Die Gruppe traegt Ueberschrift, Beschreibung und die Trennlinie
 * dazwischen; `Formularseite` nimmt der letzten Gruppe ihre Linie wieder ab.
 * Das ist die Stelle, an der eine Anwendung sonst ihre fuenfte Art erfindet,
 * zwei Abschnitte zu trennen.
 *
 * Ein `form` bleibt es trotzdem, und das ist mehr als eine Ansammlung von
 * Eingaben: die Eingabetaste im letzten Feld sendet ab, und der Browser bietet
 * seine Hilfen an. `Label` und `id` gehoeren zusammen; ohne sie laese ein
 * Screenreader ein Feld ohne Namen vor.
 *
 * **Wer ihn einreicht, steht in keinem Feld.** Das sagt die Plattform, und die
 * App liest es aus `api/me`. Ein Namensfeld waere eines, in das jeder einen
 * anderen Namen schreiben kann.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Feldgruppe, Formularseite, Input, Kopf, Label, Meldung, Textarea } from "@marken";
import { useAnmeldung } from "../rahmen/anmeldung";
import { useEinreichen } from "../vorgaenge";

export function Neu() {
  const anmeldung = useAnmeldung();
  const [titel, setTitel] = useState("");
  const [text, setText] = useState("");
  const einreichen = useEinreichen();
  const weiter = useNavigate();

  const absenden = (ereignis: React.FormEvent) => {
    ereignis.preventDefault();
    if (!titel.trim() || einreichen.isPending) return;
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
          {einreichen.error instanceof Error ? einreichen.error.message : "Die Schnittstelle hat nicht geantwortet."}
        </Meldung>
      )}

      <form onSubmit={absenden}>
        <Formularseite>
          <Feldgruppe titel="Worum es geht" beschreibung="Ein Satz, an dem man den Vorgang wiedererkennt.">
            <div className="flex flex-col gap-2">
              <Label htmlFor="titel">Titel</Label>
              <Input
                id="titel"
                value={titel}
                onChange={(e) => setTitel(e.target.value)}
                maxLength={200}
                required
              />
            </div>
          </Feldgruppe>

          <Feldgruppe titel="Was dazu zu sagen ist" beschreibung="Darf leer bleiben.">
            <Textarea id="text" value={text} onChange={(e) => setText(e.target.value)} rows={4} />
          </Feldgruppe>

          <div className="flex justify-end">
            <Button type="submit" variant="solid" data-kennzeichen="einreichen" disabled={!titel.trim() || einreichen.isPending}>
              {einreichen.isPending ? "Wird eingereicht …" : "Einreichen"}
            </Button>
          </div>
        </Formularseite>
      </form>
    </>
  );
}
