/**
 * Die Oberflaeche von {{name}}: der Rahmen und die Wege.
 *
 * Hier steht, was um jede Seite herum gilt, und sonst nichts:
 *
 *   `Fehlerwand`            was der Mensch sieht, wenn das Zeichnen stolpert
 *   `QueryClientProvider`   ein Zwischenspeicher fuer alle Abfragen
 *   `useThema`              das Thema des Geraets, gelesen und mitgefuehrt
 *   `BrowserRouter`         die Wege, unter dem Pfad, an dem die App haengt
 *   `Seitenleiste`          die Bereiche, als Spalte oder als Menue
 *   `AnmeldungRahmen`       wer da ist, aus `api/me`, bevor etwas gezeichnet wird
 *
 * Die Reihenfolge ist eine Entscheidung: die Anmeldung steht INNEN, weil sie
 * eine Abfrage ist und dafuer den Zwischenspeicher braucht; die Fehlerwand
 * steht AUSSEN, weil sie sonst genau die Fehler nicht faengt, die in den
 * Rahmen darunter entstehen.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { basisPfad } from "./rahmen/basis";
import { useThema } from "./rahmen/thema";
import { AnmeldungRahmen } from "./rahmen/anmeldung";
import { Fehlerwand } from "./rahmen/async-boundary";
import { Meldung } from "@marken";
import { Seitenleiste } from "./rahmen/seitenleiste";
import { Vorgaenge } from "./seiten/liste";
import { Neu } from "./seiten/neu";

/**
 * Ein Zwischenspeicher fuer die ganze App.
 *
 * `retry` haelt an, wo ein zweiter Versuch nichts bringt: 401 heisst, die
 * Sitzung ist weg, 403 heisst, die App ist nicht freigegeben. Beides
 * dreimal zu fragen macht es nicht wahrer, es macht die Seite nur langsam.
 */
const speicher = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (versuche, fehler: unknown) => {
        const status = (fehler as { status?: number } | null)?.status;
        if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) return false;
        return versuche < 2;
      },
    },
    mutations: { retry: false },
  },
});

function Wege() {
  return (
    <Routes>
      <Route path="/" element={<Vorgaenge />} />
      <Route path="/neu" element={<Neu />} />
      <Route
        path="*"
        element={<Meldung art="fehler" titel="Diesen Weg gibt es nicht">Zurück geht es über die Vorgänge.</Meldung>}
      />
    </Routes>
  );
}

export function App() {
  useThema();
  return (
    <Fehlerwand>
      <QueryClientProvider client={speicher}>
        <BrowserRouter basename={basisPfad()}>
          {/* Die Seitenleiste steht INNERHALB des Routers und ausserhalb der
              Anmeldung: sie liest die Adresse, und sie soll auch dastehen,
              solange das Geraet noch nicht gesagt hat, wer da ist. */}
          <div className="rahmen">
            <Seitenleiste />
            <main className="ara-strom">
              <AnmeldungRahmen>
                <Wege />
              </AnmeldungRahmen>
            </main>
          </div>
        </BrowserRouter>
      </QueryClientProvider>
    </Fehlerwand>
  );
}
