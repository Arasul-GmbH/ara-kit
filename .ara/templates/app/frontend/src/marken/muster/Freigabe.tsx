import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clock,
  ClipboardCheck,
  XCircle,
} from 'lucide-react';

import { cn } from '../cn';
import { Badge } from '../primitive/badge';
import { Button } from '../primitive/button';
import { Input } from '../primitive/input';
import { Textarea } from '../primitive/textarea';
import { useSchmalerBehaelter } from '../useSchmalerBehaelter';
import { Dokumentanzeige } from './Dokumentanzeige';
import { Leerzustand } from './Leerzustand';
import { istKnapp, restzeit, wartetSeit } from './freigabeFrist';

/**
 * Eine Freigabe: jemand soll etwas bestätigen oder ablehnen, bevor es weitergeht.
 *
 * WARUM ES DAS ALS MUSTER GIBT. Ein Flow kann anhalten und eine Freigabe
 * verlangen. Früher stand die Entscheidung in der Übersicht des Geräts,
 * für jeden, der angemeldet war, mit der Folge, dass ein Mitarbeiter eine
 * Liste sah, in der er den Zusammenhang nicht kannte. Eine Freigabe gehört in
 * die App, in der sie entsteht, und diese Form ist die, die jede App dafür
 * benutzt. Dass die Shell dasselbe Muster für den Administrator benutzt, ist
 * kein Zufall, sondern der Beweis: zwei Aussehen derselben Entscheidung wären
 * der Anfang von zwei Wahrheiten darüber, was „bestätigen" heißt.
 *
 * DREI DINGE, DIE JEDE FREIGABE ZEIGT: worum es geht (Titel, Zusammenhang), wie
 * lange noch Zeit bleibt (Frist als Dauer), und (nach der Entscheidung) WER
 * sie getroffen hat und mit welcher Begründung. Wer eine Ablehnung liest,
 * will den Grund wissen und den Namen.
 *
 * DIE ABLEHNUNG VERLANGT EINEN GRUND. Eine Ablehnung beendet die Arbeit eines
 * anderen Menschen; wer sie schreibt, sieht dabei den Titel und den
 * Zusammenhang, über den er urteilt. Deshalb klappt ein Feld AUF, statt dass
 * sich ein Dialog darüberlegt, und der Knopf bleibt gesperrt, solange es
 * leer ist.
 *
 * SIE WISSEN NICHTS VON ARASUL. Kein Endpunkt, keine Rolle: das Muster
 * bekommt Einträge und zwei Funktionen. Was entscheiden darf, entscheidet die
 * App (oder das Backend) und gibt nur Einträge herein, bei denen es der
 * Betrachter darf. Wirft eine der Funktionen, bleibt das Feld offen und der
 * Text steht; die Fehlermeldung zeigt der Aufrufer.
 *
 * ZWEI ANSICHTEN, EINE KOMPONENTE: die Liste (jede Freigabe als Karte mit
 * ihren Knöpfen) und die Einzelansicht (eine Freigabe ganz, mit Zurück). Wer
 * `gewaehlt` setzt, steuert sie von außen, etwa aus einer Adresse; ohne die
 * Eigenschaft führt die Komponente es selbst. Nach einer Entscheidung in der
 * Einzelansicht steht wieder die Liste da.
 *
 * ERKANNTE FELDER (5.4.0). Kommt eine Freigabe aus einer Erkennung, trägt sie
 * `felder`: je Feld, was die KI vorschlug, und ob es zu prüfen ist (unsicher
 * oder nicht erkannt). Die Einzelansicht zeigt das Original links, zoombar,
 * und die Felder rechts; was zu prüfen ist, steht oben und trägt „prüfen",
 * NIE eine Prozentzahl: eine Zahl wie 83 % sagt niemandem, ob er nachsehen
 * soll, „prüfen" sagt es. Ändern lässt sich nur, was die App als `aenderbar`
 * erklärt; `beiBestaetigen` bekommt dann die geänderten Werte als zweites
 * Argument. In der Liste hat eine solche Freigabe statt „Bestätigen" den
 * Knopf „Prüfen": wer bestätigt, soll die Felder gesehen haben.
 *
 * WAS BISHER GESCHAH. Oben steht ein Satz dazu, und die früheren Stufen
 * desselben Vorgangs lassen sich aufklappen (`bisher`), mit wer, wann und was
 * dort geändert wurde.
 */
export interface FreigabeFeld {
  /** Der Name, wie die App ihn führt (`datum`). */
  name: string;
  /** Was der Mensch liest; ohne Angabe der Name. */
  bezeichnung?: string | null;
  /** Was die KI vorschlug. Leer heißt: nicht erkannt. */
  vorschlag: string;
  /** Die KI war unsicher. */
  unsicher?: boolean;
  /** Die KI hat nichts erkannt. */
  fehlend?: boolean;
  /** Ein Mensch darf es in der Freigabe ändern (erklärt die App). */
  aenderbar?: boolean;
}

/** Eine Änderung an einem Feld: was vorgeschlagen war, was jetzt gilt, wer, wann. */
export interface FreigabeKorrektur {
  feld: string;
  vorschlag: string;
  wert: string;
  von?: string | null;
  am?: string | null;
}

/** Eine frühere Stufe desselben Vorgangs. */
export interface FreigabeStation {
  titel: string;
  /** Die Stufe in Worten („Prüfung"), sonst nichts. */
  stufe?: string | null;
  status: 'offen' | 'bestaetigt' | 'abgelehnt' | 'abgelaufen' | 'verfallen';
  entschiedenVon?: string | null;
  entschiedenAm?: string | null;
  begruendung?: string | null;
  korrekturen?: FreigabeKorrektur[] | null;
}

export interface FreigabeEintrag {
  id: string | number;
  titel: string;
  /** Worum es geht, in ganzen Sätzen. */
  zusammenhang?: string | null;
  /** Woher die Anfrage kommt, in einer Zeile (etwa der Name der App). */
  herkunft?: ReactNode;
  /** Wer sie gestellt hat. */
  einreicher?: string | null;
  /** ISO-Zeitpunkt, bis zu dem entschieden sein muss. */
  frist?: string | null;
  /** ISO-Zeitpunkt der Anfrage. */
  angefragtAm?: string | null;
  /** Die Regel dieser Anfrage als Satz („Vier-Augen-Prinzip: …"). */
  regel?: string | null;
  /** Ohne Angabe `offen`. Nur eine offene Freigabe trägt Knöpfe. */
  status?: 'offen' | 'bestaetigt' | 'abgelehnt';
  /** Wer entschieden hat. */
  entschiedenVon?: string | null;
  /** ISO-Zeitpunkt der Entscheidung. */
  entschiedenAm?: string | null;
  /** Der Grund einer Ablehnung. */
  begruendung?: string | null;
  /** Die erkannten Felder (5.4.0). Ohne sie ist es eine Freigabe ohne Felder. */
  felder?: FreigabeFeld[] | null;
  /** Das Original als Adresse gleicher Herkunft (Bild oder PDF), links neben den Feldern. */
  original?: string | null;
  /** Was beim Bestätigen geändert wurde (nach der Entscheidung). */
  korrekturen?: FreigabeKorrektur[] | null;
  /** Die früheren Stufen desselben Vorgangs, älteste zuerst. */
  bisher?: FreigabeStation[] | null;
  /** Was unter der Karte steht, etwa bei wem sie liegt. */
  fuss?: ReactNode;
}

export interface FreigabeProps {
  eintraege: FreigabeEintrag[];
  /**
   * Bestätigen. Darf ein Versprechen geben; solange es läuft, sind die Knöpfe
   * gesperrt. Trägt die Freigabe Felder und hat jemand eines geändert, kommen
   * die geänderten Werte als zweites Argument (Name → neuer Wert).
   */
  beiBestaetigen: (
    eintrag: FreigabeEintrag,
    geaendert?: Record<string, string>
  ) => void | Promise<unknown>;
  /** Ablehnen, mit dem Grund (nie leer). */
  beiAblehnen: (eintrag: FreigabeEintrag, grund: string) => void | Promise<unknown>;
  /** Die Einzelansicht von außen steuern; `null` ist die Liste. */
  gewaehlt?: FreigabeEintrag['id'] | null;
  beiWahl?: (id: FreigabeEintrag['id'] | null) => void;
  /** Was steht, wenn nichts da ist. Ohne Angabe ein Leerzustand. */
  leer?: ReactNode;
  /** Das Gerät kennt die Zeit besser als der Test: hier lässt sie sich setzen. */
  jetzt?: number;
  className?: string;
}

const DATUM = (iso: string) => new Date(iso).toLocaleString('de-DE');

function istZahl(iso?: string | null): iso is string {
  return !!iso && Number.isFinite(new Date(iso).getTime());
}

/** Die Zeile unter dem Titel: Herkunft, Einreicher, wie lange schon. */
function Herkunft({ e, jetzt }: { e: FreigabeEintrag; jetzt?: number }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-ui-xs text-muted-foreground">
      {e.herkunft && <span className="font-medium text-foreground/80">{e.herkunft}</span>}
      {e.einreicher && (
        <>
          {e.herkunft && <span aria-hidden="true">·</span>}
          <span>eingereicht von {e.einreicher}</span>
        </>
      )}
      {istZahl(e.angefragtAm) && (
        <>
          {(e.herkunft || e.einreicher) && <span aria-hidden="true">·</span>}
          <span data-testid={`freigabe-${e.id}-seit`} title={`Angefragt: ${DATUM(e.angefragtAm)}`}>
            {wartetSeit(e.angefragtAm, jetzt)}
          </span>
        </>
      )}
    </span>
  );
}

/** Wer wann entschieden hat, und warum nicht. */
function Entscheidung({ e }: { e: FreigabeEintrag }) {
  const bestaetigt = e.status === 'bestaetigt';
  return (
    <div className="mt-3 text-ui-sm" data-testid={`freigabe-${e.id}-entscheidung`}>
      <p className="flex items-center gap-1.5 font-medium text-foreground">
        {bestaetigt ? (
          <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden="true" />
        ) : (
          <XCircle className="size-4 shrink-0 text-destructive" aria-hidden="true" />
        )}
        {bestaetigt ? 'Freigegeben' : 'Abgelehnt'}
        {e.entschiedenVon ? ` von ${e.entschiedenVon}` : ''}
        {istZahl(e.entschiedenAm) ? `, ${DATUM(e.entschiedenAm)}` : ''}
      </p>
      {!bestaetigt && e.begruendung && (
        <p className="mt-1 whitespace-pre-wrap text-muted-foreground">Grund: {e.begruendung}</p>
      )}
    </div>
  );
}

const zuPruefen = (f: FreigabeFeld) => Boolean(f.unsicher || f.fehlend);

/** Was zu prüfen ist zuerst, sonst in der Reihenfolge der App. */
function geordnet(felder: FreigabeFeld[]): FreigabeFeld[] {
  return felder
    .map((f, i) => ({ f, i }))
    .sort((a, b) => Number(zuPruefen(b.f)) - Number(zuPruefen(a.f)) || a.i - b.i)
    .map(({ f }) => f);
}

const STATUS_WORT: Record<FreigabeStation['status'], string> = {
  offen: 'offen',
  bestaetigt: 'bestätigt',
  abgelehnt: 'abgelehnt',
  abgelaufen: 'Frist abgelaufen',
  verfallen: 'verfallen',
};

/** Eine Station in einem Halbsatz: „Prüfung bestätigt von bernd, 1 Feld geändert". */
function stationSatz(s: FreigabeStation): string {
  const geaendert = s.korrekturen?.length ?? 0;
  return (
    `${s.stufe || s.titel} ${STATUS_WORT[s.status]}` +
    (s.entschiedenVon ? ` von ${s.entschiedenVon}` : '') +
    (geaendert === 1 ? ', 1 Feld geändert' : geaendert > 1 ? `, ${geaendert} Felder geändert` : '')
  );
}

/**
 * Der Satz oben: was bisher geschah. Aus den früheren Stufen und der Erkennung,
 * nicht vom Aufrufer formuliert, damit jede App denselben Satz zeigt.
 */
function geschichte(e: FreigabeEintrag): string | null {
  const teile: string[] = [];
  const bisher = e.bisher ?? [];
  if (bisher.length > 0) {
    teile.push(`Bisher: ${bisher.map(stationSatz).join('; ')}.`);
  }
  const felder = e.felder ?? [];
  if (felder.length > 0) {
    const pruefen = felder.filter(zuPruefen).length;
    teile.push(
      `Die KI hat ${felder.length === 1 ? '1 Feld' : `${felder.length} Felder`} erkannt` +
        (pruefen === 0
          ? '.'
          : `, ${pruefen === 1 ? '1 davon ist' : `${pruefen} davon sind`} zu prüfen.`)
    );
  }
  return teile.length > 0 ? teile.join(' ') : null;
}

/** Die früheren Stufen, zugeklappt. */
function Bisher({ e }: { e: FreigabeEintrag }) {
  const [offen, setOffen] = useState(false);
  const bisher = e.bisher ?? [];
  if (bisher.length === 0) return null;
  return (
    <div className="mt-1" data-testid={`freigabe-${e.id}-bisher`}>
      <button
        type="button"
        onClick={() => setOffen(o => !o)}
        aria-expanded={offen}
        className="flex items-center gap-1 text-ui-xs text-muted-foreground hover:text-foreground"
        data-testid={`freigabe-${e.id}-bisher-schalter`}
      >
        {offen ? (
          <ChevronDown className="size-3.5" aria-hidden="true" />
        ) : (
          <ChevronRight className="size-3.5" aria-hidden="true" />
        )}
        {bisher.length === 1 ? 'Frühere Stufe' : `${bisher.length} frühere Stufen`}
      </button>
      {offen && (
        <ol className="mt-1 flex flex-col gap-2 border-l border-border pl-3">
          {bisher.map((s, i) => (
            <li key={i} className="text-ui-xs">
              <p className="font-medium text-foreground">{stationSatz(s)}</p>
              {istZahl(s.entschiedenAm) && (
                <p className="text-muted-foreground">{DATUM(s.entschiedenAm)}</p>
              )}
              {s.begruendung && (
                <p className="whitespace-pre-wrap text-muted-foreground">Grund: {s.begruendung}</p>
              )}
              {s.korrekturen && s.korrekturen.length > 0 && <Korrekturen liste={s.korrekturen} />}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Vorschlag und Änderung je Feld, nach der Entscheidung. */
function Korrekturen({ liste }: { liste: FreigabeKorrektur[] }) {
  return (
    <ul className="mt-1 flex flex-col gap-0.5 text-ui-xs" data-testid="freigabe-korrekturen">
      {liste.map(k => (
        <li key={k.feld}>
          <span className="font-medium text-foreground">{k.feld}</span>:{' '}
          <span className="text-muted-foreground line-through">{k.vorschlag || 'leer'}</span> →{' '}
          <span className="text-foreground">{k.wert || 'leer'}</span>
          {k.von ? <span className="text-muted-foreground"> ({k.von})</span> : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * Die erkannten Felder. Offen und aenderbar: ein Eingabefeld mit dem Vorschlag
 * darin; sonst der Wert als Text. Was zu prüfen ist, steht oben mit „prüfen".
 */
function Felder({
  e,
  werte,
  setzeWert,
  bearbeitbar,
  gesperrt = false,
}: {
  e: FreigabeEintrag;
  werte: Record<string, string>;
  setzeWert: (name: string, wert: string) => void;
  bearbeitbar: boolean;
  /** Während die Entscheidung läuft: Eingaben bleiben stehen, nur gesperrt. */
  gesperrt?: boolean;
}) {
  const felder = geordnet(e.felder ?? []);
  return (
    <dl className="flex flex-col gap-ui-2" data-testid={`freigabe-${e.id}-felder`}>
      {felder.map(f => {
        const name = f.bezeichnung || f.name;
        const wert = werte[f.name] ?? f.vorschlag;
        const geaendert = wert !== f.vorschlag;
        const kennung = `freigabe-${e.id}-feld-${f.name}`;
        return (
          <div key={f.name} data-testid={kennung} data-pruefen={zuPruefen(f) ? 'ja' : 'nein'}>
            <dt className="flex items-center gap-2 text-ui-xs text-muted-foreground">
              <label htmlFor={bearbeitbar && f.aenderbar ? `${kennung}-eingabe` : undefined}>
                {name}
              </label>
              {zuPruefen(f) && (
                <Badge variant="warning" data-testid={`${kennung}-pruefen`}>
                  <CircleAlert aria-hidden="true" />
                  prüfen
                </Badge>
              )}
            </dt>
            <dd className="mt-0.5">
              {bearbeitbar && f.aenderbar ? (
                <Input
                  id={`${kennung}-eingabe`}
                  value={wert}
                  disabled={gesperrt}
                  maxLength={2000}
                  onChange={ev => setzeWert(f.name, ev.target.value)}
                  placeholder={f.fehlend ? 'nicht erkannt' : undefined}
                  data-testid={`${kennung}-eingabe`}
                />
              ) : (
                <p className="text-ui-sm text-foreground" data-testid={`${kennung}-wert`}>
                  {f.vorschlag || <span className="text-muted-foreground">nicht erkannt</span>}
                </p>
              )}
              {bearbeitbar && geaendert && (
                <p className="mt-0.5 text-ui-xs text-muted-foreground">
                  Vorschlag der KI: {f.vorschlag || 'leer'}
                </p>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/**
 * Original links, Felder rechts; im schmalen Behälter untereinander, das
 * Original zuerst. Ohne Original stehen die Felder allein.
 */
function OriginalUndFelder({ e, children }: { e: FreigabeEintrag; children: ReactNode }) {
  const [ref, schmal] = useSchmalerBehaelter<HTMLDivElement>(640);
  if (!e.original) {
    return <div className="mt-3">{children}</div>;
  }
  return (
    <div
      ref={ref}
      className={cn('mt-3 grid gap-ui-3', schmal ? 'grid-cols-1' : 'grid-cols-[3fr_2fr]')}
      data-testid={`freigabe-${e.id}-original-und-felder`}
    >
      <div data-testid={`freigabe-${e.id}-original`}>
        <Dokumentanzeige quelle={e.original} name="Original" hoehe="28rem" />
      </div>
      <div>{children}</div>
    </div>
  );
}

interface KarteProps {
  e: FreigabeEintrag;
  einzeln: boolean;
  beiBestaetigen: FreigabeProps['beiBestaetigen'];
  beiAblehnen: FreigabeProps['beiAblehnen'];
  beiOeffnen?: () => void;
  beiZurueck?: () => void;
  /** Nach einer erfolgreichen Entscheidung (Einzelansicht: zurück zur Liste). */
  beiEntschieden?: () => void;
  jetzt?: number;
}

/** Eine Freigabe: in der Liste als Karte, einzeln ganz. */
function FreigabeKarte({
  e,
  einzeln,
  beiBestaetigen,
  beiAblehnen,
  beiOeffnen,
  beiZurueck,
  beiEntschieden,
  jetzt,
}: KarteProps) {
  const [ablehnenOffen, setAblehnenOffen] = useState(false);
  const [grund, setGrund] = useState('');
  const [laeuft, setLaeuft] = useState(false);
  // Was der Mensch an den Feldern geändert hat, Name → Wert. Nur die
  // geänderten gehen beim Bestätigen mit.
  const [werte, setWerte] = useState<Record<string, string>>({});
  const hatFelder = (e.felder?.length ?? 0) > 0;
  const geaendert = (): Record<string, string> | undefined => {
    const liste = Object.entries(werte).filter(([name, wert]) => {
      const f = e.felder?.find(x => x.name === name);
      return f && f.aenderbar && wert !== f.vorschlag;
    });
    return liste.length > 0 ? Object.fromEntries(liste) : undefined;
  };
  const feld = useRef<HTMLTextAreaElement>(null);
  // Der Zeiger springt in das Feld, sobald es aufklappt: wer „Ablehnen"
  // drückt, will schreiben. Als Effekt und nicht als `autoFocus`: das
  // griffe auch beim ersten Rendern der Seite und zöge einen Bildschirmleser
  // ungefragt an eine Textbox.
  useEffect(() => {
    if (ablehnenOffen) feld.current?.focus();
  }, [ablehnenOffen]);

  const offen = (e.status ?? 'offen') === 'offen';
  const knapp = istZahl(e.frist) && istKnapp(e.frist, jetzt);

  // Jede Karte sperrt nur sich selbst: wer drei Freigaben hat, soll bei der
  // ersten nicht drei Ladezustände sehen.
  const ausfuehren = async (was: () => void | Promise<unknown>, danach?: () => void) => {
    setLaeuft(true);
    try {
      await was();
      danach?.();
    } catch {
      // Die Meldung zeigt, wer die Funktion gab. Hier bleibt das Feld offen
      // und der Text stehen.
    } finally {
      setLaeuft(false);
    }
  };

  const zuruecksetzen = () => {
    setAblehnenOffen(false);
    setGrund('');
  };

  const titel = einzeln ? (
    <h3 className="text-ui font-semibold text-foreground">{e.titel}</h3>
  ) : beiOeffnen ? (
    <h3 className="text-ui font-semibold text-foreground">
      <button
        type="button"
        onClick={beiOeffnen}
        className="text-left underline-offset-4 hover:underline focus-visible:underline"
        data-testid={`freigabe-${e.id}-oeffnen`}
      >
        {e.titel}
      </button>
    </h3>
  ) : (
    <h3 className="text-ui font-semibold text-foreground">{e.titel}</h3>
  );

  return (
    <article
      className="rounded-lg border border-border bg-card p-ui-3 text-card-foreground"
      data-testid={`freigabe-${e.id}`}
      aria-label={e.titel}
    >
      {einzeln && beiZurueck && (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 mb-2"
          onClick={beiZurueck}
          data-testid="freigabe-zurueck"
        >
          <ArrowLeft aria-hidden="true" />
          Zur Liste
        </Button>
      )}

      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        {titel}
        {offen && istZahl(e.frist) ? (
          <span
            className={cn(
              'flex items-center gap-1 text-ui-xs',
              knapp ? 'font-medium text-foreground' : 'text-muted-foreground'
            )}
            data-testid={`freigabe-${e.id}-frist`}
            title={`Frist: ${DATUM(e.frist)}`}
          >
            <Clock className="size-3 shrink-0" aria-hidden="true" />
            {restzeit(e.frist, jetzt)}
          </span>
        ) : (
          !offen && (
            <Badge variant={e.status === 'bestaetigt' ? 'success' : 'destructive'}>
              {e.status === 'bestaetigt' ? 'Freigegeben' : 'Abgelehnt'}
            </Badge>
          )
        )}
      </div>

      <Herkunft e={e} jetzt={jetzt} />

      {einzeln && geschichte(e) && (
        <p className="mt-2 text-ui-sm text-foreground" data-testid={`freigabe-${e.id}-geschichte`}>
          {geschichte(e)}
        </p>
      )}
      {einzeln && <Bisher e={e} />}
      {!einzeln && hatFelder && offen && (
        <p
          className="mt-1 text-ui-xs text-muted-foreground"
          data-testid={`freigabe-${e.id}-hinweis`}
        >
          {geschichte(e)}
        </p>
      )}

      {e.regel && (
        <p className="mt-1 text-ui-xs text-muted-foreground" data-testid={`freigabe-${e.id}-regel`}>
          {e.regel}
        </p>
      )}

      {/* Mit erkannten Feldern sagen die Felder, worum es geht; der Zusammenhang
          ist dann die Rohform derselben Auskunft und bleibt der App. */}
      {e.zusammenhang && !hatFelder && (
        <p
          className={cn(
            'mt-2 text-ui-sm whitespace-pre-wrap',
            einzeln ? '' : 'max-h-40 overflow-auto'
          )}
        >
          {e.zusammenhang}
        </p>
      )}

      {einzeln && hatFelder && (
        <OriginalUndFelder e={e}>
          <Felder
            e={e}
            werte={werte}
            setzeWert={(name, wert) => setWerte(w => ({ ...w, [name]: wert }))}
            bearbeitbar={offen}
            gesperrt={laeuft}
          />
        </OriginalUndFelder>
      )}

      {offen && istZahl(e.frist) && einzeln && (
        <p className="mt-2 text-ui-xs text-muted-foreground">Frist: {DATUM(e.frist)}</p>
      )}

      {!offen && <Entscheidung e={e} />}
      {!offen && e.korrekturen && e.korrekturen.length > 0 && <Korrekturen liste={e.korrekturen} />}

      {offen && !einzeln && hatFelder && beiOeffnen && (
        <div className="mt-3">
          <Button variant="solid" onClick={beiOeffnen} data-testid={`freigabe-${e.id}-pruefen`}>
            Prüfen
          </Button>
        </div>
      )}

      {offen && (einzeln || !hatFelder || !beiOeffnen) && (
        <div className="mt-3">
          {ablehnenOffen ? (
            <form
              className="flex flex-col gap-2"
              onSubmit={ev => {
                ev.preventDefault();
                const text = grund.trim();
                if (!text) return;
                void ausfuehren(
                  () => beiAblehnen(e, text),
                  () => {
                    zuruecksetzen();
                    beiEntschieden?.();
                  }
                );
              }}
            >
              {/* Pflichtfeld, und das ist eine Entscheidung über Umgangsformen:
                  eine Ablehnung beendet die Arbeit eines anderen Menschen. */}
              <Textarea
                ref={feld}
                rows={2}
                maxLength={2000}
                value={grund}
                onChange={ev => setGrund(ev.target.value)}
                placeholder="Warum nicht? Der Grund steht danach dabei."
                aria-label={`Begründung für die Ablehnung von ${e.titel}`}
                aria-required="true"
                data-testid={`freigabe-${e.id}-begruendung`}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={laeuft || grund.trim().length === 0}
                  data-testid={`freigabe-${e.id}-ablehnen-absenden`}
                >
                  Ablehnen
                </Button>
                <Button type="button" disabled={laeuft} onClick={zuruecksetzen}>
                  Zurück
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="solid"
                disabled={laeuft}
                onClick={() => {
                  const neu = geaendert();
                  void ausfuehren(
                    () => (neu ? beiBestaetigen(e, neu) : beiBestaetigen(e)),
                    beiEntschieden
                  );
                }}
                data-testid={`freigabe-${e.id}-bestaetigen`}
              >
                {laeuft ? 'Einen Moment …' : 'Bestätigen'}
              </Button>
              <Button
                variant="destructive"
                disabled={laeuft}
                onClick={() => setAblehnenOffen(true)}
                data-testid={`freigabe-${e.id}-ablehnen`}
              >
                Ablehnen
              </Button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export function Freigabe({
  eintraege,
  beiBestaetigen,
  beiAblehnen,
  gewaehlt,
  beiWahl,
  leer,
  jetzt,
  className,
}: FreigabeProps) {
  const [eigene, setEigene] = useState<FreigabeEintrag['id'] | null>(null);
  const gesteuert = gewaehlt !== undefined;
  const aktuell = gesteuert ? gewaehlt : eigene;
  const waehlen = (id: FreigabeEintrag['id'] | null) => {
    if (!gesteuert) setEigene(id);
    beiWahl?.(id);
  };

  const eins = aktuell === null ? undefined : eintraege.find(x => x.id === aktuell);

  // Eine Einzelansicht, deren Eintrag verschwunden ist (entschieden, von einem
  // anderen), fällt auf die Liste zurück statt eine leere Seite zu zeigen.
  if (eins) {
    return (
      <div className={className} data-testid="freigabe-einzeln">
        <FreigabeKarte
          key={eins.id}
          e={eins}
          einzeln
          jetzt={jetzt}
          beiBestaetigen={beiBestaetigen}
          beiAblehnen={beiAblehnen}
          beiZurueck={() => waehlen(null)}
          beiEntschieden={() => waehlen(null)}
        />
        {eins.fuss}
      </div>
    );
  }

  if (eintraege.length === 0) {
    return (
      <div className={className} data-testid="freigabe-liste" data-leer="true">
        {leer ?? (
          <Leerzustand
            symbol={<ClipboardCheck />}
            titel="Nichts wartet auf eine Freigabe"
            beschreibung="Sobald etwas auf Ihre Entscheidung wartet, steht es hier."
          />
        )}
      </div>
    );
  }

  return (
    <ul className={cn('flex flex-col gap-ui-2', className)} data-testid="freigabe-liste">
      {eintraege.map(e => (
        <li key={e.id}>
          <FreigabeKarte
            e={e}
            einzeln={false}
            jetzt={jetzt}
            beiBestaetigen={beiBestaetigen}
            beiAblehnen={beiAblehnen}
            beiOeffnen={() => waehlen(e.id)}
          />
          {e.fuss}
        </li>
      ))}
    </ul>
  );
}
