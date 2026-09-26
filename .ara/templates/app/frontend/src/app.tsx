/**
 * Die Oberfläche von {{name}}: der Rahmen und die Wege.
 *
 * Hier steht, was um jede Seite herum gilt, und sonst nichts:
 *
 *   `Fehlerwand`            was der Mensch sieht, wenn das Zeichnen stolpert
 *   `QueryClientProvider`   ein Zwischenspeicher für alle Abfragen
 *   `useThema`              das Thema des Geräts, gelesen und mitgeführt
 *   `BrowserRouter`         die Wege, unter dem Pfad, an dem die App hängt
 *   `SidebarProvider`       auf und zu, und unter 900 px ein Blatt
 *   `AppSeitenleiste`       die Bereiche, aus dem Muster der Bibliothek
 *   `AnmeldungRahmen`       wer da ist, aus `api/me`, bevor etwas gezeichnet wird
 *
 * Die Reihenfolge ist eine Entscheidung: die Anmeldung steht INNEN, weil sie
 * eine Abfrage ist und dafür den Zwischenspeicher braucht; die Fehlerwand
 * steht **außen**, weil sie sonst genau die Fehler nicht fängt, die in den
 * Rahmen darunter entstehen. Die Seitenleiste steht innerhalb des Routers,
 * weil sie die Adresse liest, und außerhalb der Anmeldung, weil sie auch
 * dastehen soll, solange das Gerät noch nicht gesagt hat, wer da ist.
 *
 * **Die Anordnung kommt aus der Bibliothek und nicht aus einem eigenen
 * Raster.** `SidebarProvider` hält die Spalte frei, `SidebarInset` trägt
 * den Inhalt, `SidebarTrigger` klappt auf und zu. Was hier ein `grid` wäre,
 * liefe beim nächsten Stand des Geräts von der Oberfläche weg, in der es
 * hängt.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import { Button, Meldung, SidebarInset, SidebarProvider, SidebarTrigger } from "@marken";
import { basisPfad } from "./rahmen/basis";
import { useThema } from "./rahmen/thema";
import { AnmeldungRahmen } from "./rahmen/anmeldung";
import { Fehlerwand } from "./rahmen/async-boundary";
import { AppSeitenleiste } from "./rahmen/seitenleiste";
import { Vorgaenge } from "./seiten/liste";
import { Neu } from "./seiten/neu";

/** Wie diese App heißt. Das Gerät setzt den Namen im Backend, hier steht er für die Leiste. */
const NAME = "{{name}}";

/**
 * Ein Zwischenspeicher für die ganze App.
 *
 * `retry` hält an, wo ein zweiter Versuch nichts bringt: 401 heißt, die
 * Sitzung ist weg, 403 heißt, die App ist nicht freigegeben. Beides
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

/** Eine Adresse, die es nicht gibt: ein Hinweis und der Weg zurück, kein Rot. */
function Unbekannt() {
  const gehe = useNavigate();
  return (
    <Meldung art="hinweis" titel="Diese Seite gibt es nicht" kennzeichen="nicht-da">
      <p>Die Vorgänge stehen in der Übersicht.</p>
      <Button variant="outline" size="sm" className="mt-2 self-start" onClick={() => gehe("/")} data-kennzeichen="zur-uebersicht">
        Zur Übersicht
      </Button>
    </Meldung>
  );
}

function Wege() {
  return (
    <Routes>
      <Route path="/" element={<Vorgaenge />} />
      <Route path="/neu" element={<Neu />} />
      <Route path="*" element={<Unbekannt />} />
    </Routes>
  );
}

export function App() {
  useThema();
  return (
    <Fehlerwand>
      <QueryClientProvider client={speicher}>
        <BrowserRouter basename={basisPfad()}>
          <SidebarProvider>
            <AppSeitenleiste name={NAME} />
            <SidebarInset>
              <header className="flex h-ui-header items-center gap-2 border-b border-border px-3">
                <SidebarTrigger />
              </header>
              <div className="ara-strom">
                <AnmeldungRahmen>
                  <Wege />
                </AnmeldungRahmen>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </Fehlerwand>
  );
}
