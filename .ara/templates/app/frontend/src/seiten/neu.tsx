/**
 * Einen Vorgang einreichen.
 *
 * **Wer ihn einreicht, steht in keinem Feld.** Das sagt die Plattform, und die
 * App liest es aus `api/me`. Ein Namensfeld waere eines, in das jeder einen
 * anderen Namen schreiben kann.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Feld, Formular, Karte, Knopf, Kopf, Meldung } from "../bausteine";
import { useAnmeldung } from "../rahmen/anmeldung";
import { useEinreichen } from "../vorgaenge";

export function Neu() {
  const anmeldung = useAnmeldung();
  const [titel, setTitel] = useState("");
  const [text, setText] = useState("");
  const einreichen = useEinreichen();
  const weiter = useNavigate();

  const absenden = () => {
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
        aktionen={<Knopf onKlick={() => weiter("/")}>Zurück</Knopf>}
      />

      {einreichen.isError && (
        <Meldung art="fehler" titel="Der Vorgang ist nicht angekommen">
          {einreichen.error instanceof Error ? einreichen.error.message : "Die Schnittstelle hat nicht geantwortet."}
        </Meldung>
      )}

      <Karte>
        <Formular
          onAbsenden={absenden}
          aktionen={
            <Knopf typ="absenden" art="haupt" gesperrt={!titel.trim() || einreichen.isPending}>
              {einreichen.isPending ? "Wird eingereicht …" : "Einreichen"}
            </Knopf>
          }
        >
          <Feld kennung="titel" beschriftung="Worum es geht">
            <input
              id="titel"
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              maxLength={200}
              required
            />
          </Feld>
          <Feld kennung="text" beschriftung="Was dazu zu sagen ist" hinweis="Darf leer bleiben.">
            <textarea id="text" value={text} onChange={(e) => setText(e.target.value)} rows={3} />
          </Feld>
        </Formular>
      </Karte>
    </>
  );
}
