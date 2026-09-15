import * as React from 'react';
import type { PDFDocumentProxy, PDFDocumentLoadingTask, RenderTask } from 'pdfjs-dist';

import { Knopf } from '../Formular';

/**
 * Die Dokumentanzeige: PDF und Bilder, im Kasten der Anwendung.
 *
 * WARUM ES SIE GIBT. Die Dateiablage nimmt PDFs an und zeigte sie nicht --
 * ohne einen Anzeige-Baustein baut jeder Partner seinen eigenen Betrachter,
 * oder gar keinen, und Dokumente bleiben Downloads. Ein Dokument, das ein
 * Mensch hochgeladen hat, soll er ansehen koennen, ohne das Geraet zu
 * verlassen.
 *
 * SIE IST EIN MUSTER, LAEUFT ABER OHNE BAU. Die anderen Muster stehen auf
 * Tailwind; dieses hier ist auf reinem CSS geschrieben (`marken.css`,
 * Klassen `ara-dokumentanzeige*`), weil eine App ohne Bau Dokumente genauso
 * zeigt wie eine mit. `browser.ts` gibt es deshalb als einziges Muster mit
 * aus.
 *
 * PDF.JS KOMMT ERST, WENN EIN PDF DA IST. Die Bibliothek (`pdfjs-dist`,
 * ~160 kB gzip) liegt in einem eigenen Brocken (`marken-pdf.js` im Buendel,
 * ein eigener Chunk im Vite-Bau) und wird per `import()` geholt, sobald die
 * erste PDF-Quelle gesetzt ist. Ein Bild kostet nichts davon.
 *
 * CSP-KONFORM OHNE EVAL. pdf.js ab Fassung 6 enthaelt kein `eval` und kein
 * `new Function` mehr; der Worker ist eine Datei GLEICHER HERKUNFT
 * (`pdf-dateien/pdf.worker.min.js`), kein blob: und kein data: -- die Policy
 * dieses Geraets laesst beides fuer Skripte nicht zu. Schlaegt der echte
 * Worker fehl, faellt pdf.js selbst auf den Hauptfaden zurueck
 * (`import(workerSrc)`), und auch das ist eine Adresse gleicher Herkunft.
 *
 * WOHER DIE STUETZDATEIEN KOMMEN. Worker, WASM (JPEG-2000 und JBIG2 --
 * gescannte PDFs), Standardschriften, CMaps und ICC-Profile liegen als
 * Ordner `pdf-dateien/` NEBEN dem uebersetzten JavaScript: neben
 * `browser/marken.js` (der Bau der Bibliothek legt sie hin, eingecheckt)
 * und neben den Chunks der Shell (`pdf-dateien.mjs` in ihrer
 * `vite.config.ts`). Aufgeloest wird zur Laufzeit relativ zu
 * `import.meta.url` -- absichtlich OHNE Vite-Asset-Import: im
 * Bibliotheks-Bau bettet Vite jedes Asset als data:-URI ein, und einen
 * data:-Worker laesst die CSP nicht zu.
 */

export type DokumentArt = 'pdf' | 'bild';

export interface DokumentanzeigeProps {
  /** Die Datei oder eine Adresse gleicher Herkunft. Ohne Quelle: Leerzustand. */
  quelle?: Blob | string | null;
  /** `pdf` oder `bild`. Ohne Angabe entscheidet der MIME-Typ bzw. die Endung. */
  art?: DokumentArt;
  /** Der Name in der Kopfzeile; bei einer `File` sonst ihr Dateiname. */
  name?: string;
  /** Der Satz im Leerzustand. */
  leerHinweis?: string;
  /** Die Hoehe des Kastens als CSS-Wert (Vorgabe 24rem). */
  hoehe?: string;
  kennzeichen?: string;
  className?: string;
}

const ZOOM_KLEINSTE = 0.25;
const ZOOM_GROESSTE = 4;
/** Innenabstand der Flaeche, der beim Einpassen der Breite abgezogen wird. */
const POLSTER_PX = 24;

function begrenzt(wert: number): number {
  return Math.min(ZOOM_GROESSTE, Math.max(ZOOM_KLEINSTE, wert));
}

const BILD_ENDUNGEN = /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/;

function artVon(quelle: Blob | string, art?: DokumentArt): DokumentArt | null {
  if (art) return art;
  if (typeof quelle !== 'string') {
    if (quelle.type === 'application/pdf') return 'pdf';
    if (quelle.type.startsWith('image/')) return 'bild';
    return null;
  }
  if (quelle.startsWith('data:image/')) return 'bild';
  if (quelle.startsWith('data:application/pdf')) return 'pdf';
  const pfad = (quelle.split('?')[0] ?? '').toLowerCase();
  if (pfad.endsWith('.pdf')) return 'pdf';
  if (BILD_ENDUNGEN.test(pfad)) return 'bild';
  return null;
}

/**
 * Eine Stuetzdatei von pdf.js, aufgeloest neben dem eigenen JavaScript.
 *
 * KEIN STRING-LITERAL IM `new URL`: Vite schreibt ein statisches
 * `new URL('...', import.meta.url)` beim Uebersetzen um und bettet es im
 * Bibliotheks-Bau als data:-URI ein -- genau das, was die CSP verbietet.
 * Der zusammengesetzte erste Parameter laesst die Zeile in Ruhe; die Datei
 * legt jeder Bau daneben (siehe Kopf dieser Datei).
 */
function stuetzUrl(datei: string): string {
  const ordner = 'pdf-dateien/';
  return new URL(ordner + datei, import.meta.url).toString();
}

type PdfBibliothek = typeof import('pdfjs-dist');

let pdfjsLadung: Promise<PdfBibliothek> | null = null;

function pdfBibliothek(): Promise<PdfBibliothek> {
  pdfjsLadung ??= import('pdfjs-dist').then(pdfjs => {
    // Nur setzen, wenn die Anwendung nicht schon selbst einen Worker
    // eingerichtet hat -- die Einstellung ist global fuer das Dokument.
    if (!pdfjs.GlobalWorkerOptions.workerSrc && !pdfjs.GlobalWorkerOptions.workerPort) {
      pdfjs.GlobalWorkerOptions.workerSrc = stuetzUrl('pdf.worker.min.js');
    }
    return pdfjs;
  });
  return pdfjsLadung;
}

type Stand =
  | { stufe: 'leer' }
  | { stufe: 'laden' }
  | { stufe: 'pdf'; dokument: PDFDocumentProxy }
  | { stufe: 'bild'; url: string }
  | { stufe: 'fehler'; meldung: string };

const FEHLER_OEFFNEN = 'Das Dokument ließ sich nicht öffnen.';
const FEHLER_FORMAT = 'Dieses Format kann hier nicht angezeigt werden.';

function istAbbruch(fehler: unknown): boolean {
  return fehler instanceof Error && fehler.name === 'RenderingCancelledException';
}

export function Dokumentanzeige({
  quelle,
  art,
  name,
  leerHinweis = 'Kein Dokument ausgewählt.',
  hoehe,
  kennzeichen,
  className,
}: DokumentanzeigeProps) {
  const [stand, setStand] = React.useState<Stand>({ stufe: 'leer' });
  const [seite, setSeite] = React.useState(1);
  const [seiten, setSeiten] = React.useState(0);
  /** `null` heisst „passend zur Breite" -- die erste Seite setzt den Wert. */
  const [zoom, setZoom] = React.useState<number | null>(null);
  const [vollbild, setVollbild] = React.useState(false);
  const [bildBreite, setBildBreite] = React.useState<number | null>(null);

  const rahmen = React.useRef<HTMLDivElement>(null);
  const flaeche = React.useRef<HTMLDivElement>(null);
  const leinwand = React.useRef<HTMLCanvasElement>(null);
  const bild = React.useRef<HTMLImageElement>(null);

  const titel = name ?? (quelle instanceof File ? quelle.name : undefined);

  // Die Quelle laden. Ein Wechsel raeumt den vorigen Stand vollstaendig ab.
  React.useEffect(() => {
    setSeite(1);
    setSeiten(0);
    setZoom(null);
    setBildBreite(null);

    if (quelle === undefined || quelle === null || quelle === '') {
      setStand({ stufe: 'leer' });
      return;
    }
    const erkannt = artVon(quelle, art);
    if (!erkannt) {
      setStand({ stufe: 'fehler', meldung: FEHLER_FORMAT });
      return;
    }

    if (erkannt === 'bild') {
      if (typeof quelle === 'string') {
        setStand({ stufe: 'bild', url: quelle });
        return;
      }
      const url = URL.createObjectURL(quelle);
      setStand({ stufe: 'bild', url });
      return () => URL.revokeObjectURL(url);
    }

    let weg = false;
    let ladung: PDFDocumentLoadingTask | undefined;
    setStand({ stufe: 'laden' });
    void (async () => {
      try {
        const pdfjs = await pdfBibliothek();
        const daten =
          typeof quelle === 'string'
            ? { url: quelle }
            : { data: new Uint8Array(await quelle.arrayBuffer()) };
        if (weg) return;
        ladung = pdfjs.getDocument({
          ...daten,
          cMapUrl: stuetzUrl('cmaps/'),
          cMapPacked: true,
          standardFontDataUrl: stuetzUrl('standard_fonts/'),
          wasmUrl: stuetzUrl('wasm/'),
          iccUrl: stuetzUrl('iccs/'),
        });
        const dokument = await ladung.promise;
        if (weg) return;
        setSeiten(dokument.numPages);
        setStand({ stufe: 'pdf', dokument });
      } catch {
        if (!weg) setStand({ stufe: 'fehler', meldung: FEHLER_OEFFNEN });
      }
    })();
    return () => {
      weg = true;
      // Raeumt Ladevorgang UND Dokument ab; ein Abbruch ist hier kein Fehler.
      void ladung?.destroy().catch(() => undefined);
    };
  }, [quelle, art]);

  // Die aktuelle Seite zeichnen. Laeuft bei Seiten- und Zoomwechsel neu;
  // ein noch laufendes Zeichnen wird abgebrochen, nie ueberlappt.
  React.useEffect(() => {
    if (stand.stufe !== 'pdf') return;
    let weg = false;
    let aufgabe: RenderTask | undefined;
    void (async () => {
      try {
        const seiteObj = await stand.dokument.getPage(seite);
        if (weg) return;
        if (zoom === null) {
          // Erste Anzeige: passend zur Breite der Flaeche. Das setzt `zoom`
          // und laesst diesen Lauf enden -- der naechste zeichnet.
          const breite = flaeche.current?.clientWidth ?? 640;
          const roh = seiteObj.getViewport({ scale: 1 });
          setZoom(begrenzt((breite - POLSTER_PX) / roh.width));
          return;
        }
        const kasten = leinwand.current;
        if (!kasten) return;
        const ansicht = seiteObj.getViewport({ scale: zoom });
        const dichte = window.devicePixelRatio || 1;
        kasten.width = Math.floor(ansicht.width * dichte);
        kasten.height = Math.floor(ansicht.height * dichte);
        kasten.style.width = `${Math.floor(ansicht.width)}px`;
        kasten.style.height = `${Math.floor(ansicht.height)}px`;
        aufgabe = seiteObj.render({
          canvas: kasten,
          viewport: ansicht,
          transform: dichte !== 1 ? [dichte, 0, 0, dichte, 0, 0] : undefined,
        });
        await aufgabe.promise;
      } catch (fehler) {
        if (!weg && !istAbbruch(fehler)) {
          setStand({ stufe: 'fehler', meldung: FEHLER_OEFFNEN });
        }
      }
    })();
    return () => {
      weg = true;
      aufgabe?.cancel();
    };
  }, [stand, seite, zoom]);

  // Vollbild verlassen: Escape (fester Kasten) oder der Browser selbst
  // (echtes Vollbild endet, `fullscreenchange` meldet es).
  React.useEffect(() => {
    if (!vollbild) return;
    const beiTaste = (ereignis: KeyboardEvent) => {
      if (ereignis.key === 'Escape') setVollbild(false);
    };
    const beiWechsel = () => {
      if (!document.fullscreenElement) setVollbild(false);
    };
    document.addEventListener('keydown', beiTaste);
    document.addEventListener('fullscreenchange', beiWechsel);
    return () => {
      document.removeEventListener('keydown', beiTaste);
      document.removeEventListener('fullscreenchange', beiWechsel);
    };
  }, [vollbild]);

  const vollbildSchalten = () => {
    if (vollbild) {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
      setVollbild(false);
      return;
    }
    setVollbild(true);
    // Echtes Vollbild, wo der Rahmen es erlaubt; sonst bleibt der feste
    // Kasten ueber der Seite (in einem iframe ohne `allowfullscreen` wird
    // der Aufruf abgelehnt, und das ist hier kein Fehler).
    try {
      void rahmen.current?.requestFullscreen?.().catch(() => undefined);
    } catch {
      // aelterer Browser ohne Promise -- der feste Kasten steht schon
    }
  };

  const effektiverZoom = (): number => {
    if (zoom !== null) return zoom;
    const element = bild.current;
    if (element && element.naturalWidth > 0) {
      return element.clientWidth / element.naturalWidth;
    }
    return 1;
  };

  const zoomAendern = (faktor: number) => {
    setZoom(begrenzt(effektiverZoom() * faktor));
  };

  const zeigtInhalt = stand.stufe === 'pdf' || stand.stufe === 'bild';

  return (
    <div
      ref={rahmen}
      className={className ? `ara-dokumentanzeige ${className}` : 'ara-dokumentanzeige'}
      data-vollbild={vollbild || undefined}
      data-testid={kennzeichen}
      style={hoehe ? ({ '--ara-dokument-hoehe': hoehe } as React.CSSProperties) : undefined}
      role="group"
      aria-label={titel ? `Dokument ${titel}` : 'Dokumentanzeige'}
    >
      {zeigtInhalt && (
        <div className="ara-dokumentanzeige__leiste">
          <span className="ara-dokumentanzeige__name" title={titel}>
            {titel}
          </span>
          {stand.stufe === 'pdf' && seiten > 1 && (
            <div className="ara-dokumentanzeige__gruppe">
              <Knopf
                beschriftung="Vorige Seite"
                gesperrt={seite <= 1}
                onKlick={() => setSeite(s => Math.max(1, s - 1))}
              >
                ‹
              </Knopf>
              <span className="ara-dokumentanzeige__stand" aria-live="polite">
                Seite {seite} von {seiten}
              </span>
              <Knopf
                beschriftung="Nächste Seite"
                gesperrt={seite >= seiten}
                onKlick={() => setSeite(s => Math.min(seiten, s + 1))}
              >
                ›
              </Knopf>
            </div>
          )}
          <div className="ara-dokumentanzeige__gruppe">
            <Knopf beschriftung="Verkleinern" onKlick={() => zoomAendern(0.8)}>
              −
            </Knopf>
            <span className="ara-dokumentanzeige__stand">
              {zoom === null ? 'passend' : `${Math.round(zoom * 100)} %`}
            </span>
            <Knopf beschriftung="Vergrößern" onKlick={() => zoomAendern(1.25)}>
              +
            </Knopf>
            <Knopf
              beschriftung={vollbild ? 'Vollbild verlassen' : 'Vollbild'}
              onKlick={vollbildSchalten}
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            </Knopf>
          </div>
        </div>
      )}

      <div ref={flaeche} className="ara-dokumentanzeige__flaeche">
        {stand.stufe === 'leer' && <p className="ara-dokumentanzeige__meldung">{leerHinweis}</p>}
        {stand.stufe === 'laden' && (
          <p className="ara-dokumentanzeige__meldung" role="status" aria-live="polite">
            <span className="ara-dokumentanzeige__kreisel" aria-hidden="true" />
            Wird geladen …
          </p>
        )}
        {stand.stufe === 'fehler' && (
          <p className="ara-dokumentanzeige__meldung" role="alert">
            {stand.meldung}
          </p>
        )}
        {stand.stufe === 'pdf' && (
          <canvas
            ref={leinwand}
            className="ara-dokumentanzeige__seite"
            role="img"
            aria-label={
              titel ? `Seite ${seite} von ${seiten} aus ${titel}` : `Seite ${seite} von ${seiten}`
            }
          />
        )}
        {stand.stufe === 'bild' && (
          <img
            ref={bild}
            src={stand.url}
            alt={titel ?? 'Bild'}
            className="ara-dokumentanzeige__bild"
            onLoad={ereignis => setBildBreite(ereignis.currentTarget.naturalWidth)}
            onError={() => setStand({ stufe: 'fehler', meldung: FEHLER_OEFFNEN })}
            style={
              zoom !== null && bildBreite
                ? {
                    width: `${Math.round(bildBreite * zoom)}px`,
                    maxWidth: 'none',
                    maxHeight: 'none',
                  }
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
}
