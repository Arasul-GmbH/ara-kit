import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';

/**
 * Der Kopf einer Seite: links Titel und ein Satz, rechts eine Werkzeugleiste
 * aus kleinen Icon-Buttons.
 *
 * Er ist der Nachfolger von `components/ui/PageHeader.tsx` und hat ihn
 * ersetzt, statt neben ihm zu stehen. Zwei Seitenkoepfe (einer fuer die
 * Shell, einer fuer die Apps) waeren genau die Doppelung, die
 * dieses Designsystem abschaffen soll; und der Unterschied zwischen ihnen
 * waere in vier Wochen keine Entscheidung mehr, sondern ein Zufall.
 *
 * SEIT 5.9.0 BEGINNT JEDE SEITE GLEICH (Karte bausteine-seitenkopf-und-
 * kompakt, Entwurf „Neue Bausteine der Bibliothek"): eine
 * Zeile, links Titel und Satz, rechts `werkzeuge`, davor der Knopf der
 * Seitenleiste. Die eigene Zeile mit dem einen Icon darueber und die
 * Trennlinie darunter gibt es nicht mehr; der Titel steht in der
 * groessten der drei Schriftgroessen und ohne Symbol davor (die Leiste
 * links nennt den Ort schon mit Symbol). `symbol` bleibt als Name, damit eine
 * App auf 5.8 nicht bricht, und zeichnet nichts mehr.
 *
 * DER PLATZ DER KAPSEL. Ueber einer App schwebt oben rechts die Kapsel des
 * Rahmens (Live und Test, Rueckmeldung). Der Rahmen nennt ihre Breite als
 * `--ara-kapsel-platz` am `<html>` der App, und der Kopf haelt sie rechts
 * frei: Kapsel und Werkzeugleiste ueberdecken sich nie. In der Shell und
 * ausserhalb des Rahmens ist sie null.
 *
 * Der Titel ist das einzige `h1` einer Seite. Das ist keine Formsache: ein
 * Screenreader liest die Ueberschriften als Inhaltsverzeichnis, und zwei
 * gleichrangige Titel auf einer Seite sind zwei Antworten auf die Frage
 * „wo bin ich".
 */
export interface KopfProps {
  /** Der Seitentitel. Erscheint als einziges `h1` der Seite. */
  titel: string;
  /**
   * Bis 5.8 ein Symbol links neben dem Titel. Seit 5.9.0 ohne Wirkung: der
   * Ort steht mit Symbol in der Leiste, ein zweites daneben war die Zeile
   * mit einem einzelnen Icon, die der Entwurf abschafft.
   */
  symbol?: ReactNode;
  /** Ein Satz darunter: was diese Seite tut. */
  beschreibung?: ReactNode;
  /**
   * Die Werkzeugleiste: kleine Icon-Buttons (`Werkzeug`) fuer die Aktionen
   * der Seite, rechts in einer Gruppe.
   */
  werkzeuge?: ReactNode;
  /** Knoepfe mit Text rechts neben den Werkzeugen, etwa „Person anlegen". */
  aktionen?: ReactNode;
  /**
   * Was links vor dem Titel steht, in der Regel der Knopf der Seitenleiste.
   * Ohne Angabe nimmt der Kopf, was `KopfVorne` darum gelegt hat.
   */
  vorne?: ReactNode;
  /**
   * Mittig: die Form einer Seite, die aus nichts als sich selbst besteht:
   * die Anmeldung, das erste Konto, ein Absturz. Der Titel steht dann in
   * der Groesse eines Titels, ohne Werkzeuge.
   */
  mittig?: boolean;
  /**
   * `2` zeichnet den Titel als `h2`, sonst gleich: fuer ein Beispiel auf der
   * Schauseite, die ihr eigenes `h1` schon hat. Eine Seite nimmt die Vorgabe.
   */
  ebene?: 1 | 2;
}

interface Vorne {
  knopf: ReactNode;
  /** Der Kopf, der den Knopf zeigt: der zuerst angemeldete. */
  erster: number | null;
  /** Ein Kopf meldet sich an und gibt beim Gehen eine Abmeldung zurueck. */
  anmelden: (kennung: number) => () => void;
}

let naechsteKennung = 1;

const VorneKontext = createContext<Vorne | null>(null);

/**
 * Legt fest, was jeder `Kopf` darin links vor dem Titel zeigt: der Rahmen
 * eines Bereichs (`SidebarProvider` mit `Seitenleiste`) legt hier seinen
 * `SidebarTrigger` hinein, und jede Seite darin bekommt den Knopf an
 * derselben Stelle, ohne ihn selbst zu kennen.
 *
 * Steht darin gerade kein Kopf (eine Seite, die noch laedt, eine, die keinen
 * hat), zeigt `KopfVorne` den Knopf selbst oben links. Ohne ihn liesse sich
 * die Seitenleiste am Handy nicht mehr oeffnen.
 */
export function KopfVorne({ knopf, children }: { knopf: ReactNode; children: ReactNode }) {
  const [koepfe, setKoepfe] = useState<number[]>([]);
  // Stabil, damit ein neues `knopf`-Element beim naechsten Rendern des
  // Rahmens keinen Kopf ab- und wieder anmeldet.
  const anmelden = useCallback((kennung: number) => {
    setKoepfe(liste => [...liste, kennung]);
    return () => setKoepfe(liste => liste.filter(k => k !== kennung));
  }, []);
  // Nur EIN Kopf zeigt den Knopf: der oberste der Seite, nicht ein
  // zweiter in einem aufgeklappten Abschnitt darunter.
  const erster = koepfe.length > 0 ? Math.min(...koepfe) : null;
  const wert = useMemo<Vorne>(() => ({ knopf, erster, anmelden }), [knopf, erster, anmelden]);
  return (
    <VorneKontext.Provider value={wert}>
      {erster === null && <div className="ara-kopf__vorne ara-kopf__vorne--allein">{knopf}</div>}
      {children}
    </VorneKontext.Provider>
  );
}

export function Kopf({
  titel,
  beschreibung,
  werkzeuge,
  aktionen,
  vorne,
  mittig = false,
  ebene = 1,
}: KopfProps) {
  const Titel = ebene === 2 ? 'h2' : 'h1';
  const kasten = useRef<HTMLElement>(null);
  const frei = useKapselFrei(kasten, mittig);
  const kontext = useContext(VorneKontext);
  const [kennung] = useState(() => naechsteKennung++);
  const anmelden = kontext?.anmelden;
  const nimmtKnopf = !mittig && vorne === undefined && Boolean(anmelden);
  useLayoutEffect(
    () => (nimmtKnopf && anmelden ? anmelden(kennung) : undefined),
    [nimmtKnopf, anmelden, kennung]
  );
  const links = mittig
    ? null
    : vorne !== undefined
      ? vorne
      : kontext?.erster === kennung
        ? kontext.knopf
        : null;
  // Der Knopf der Seitenleiste steht in der Werkzeugleiste, als letzter
  // (5.9.1): stand er links vor dem Titel, hatten Titel und Inhalt darunter
  // zwei linke Kanten, und am Handy rueckte der Satz um seine Breite ein.
  const leiste = !mittig && (werkzeuge || links);
  return (
    <header
      ref={kasten}
      className="ara-kopf"
      data-mittig={mittig ? 'true' : undefined}
      style={frei === null ? undefined : { paddingRight: frei }}
    >
      <div className="ara-kopf__text">
        <Titel className="ara-kopf__titel">{titel}</Titel>
        {beschreibung && <p className="ara-kopf__satz">{beschreibung}</p>}
      </div>
      {leiste && (
        <div className="ara-kopf__werkzeuge" role="toolbar" aria-label={`Aktionen: ${titel}`}>
          {werkzeuge}
          {werkzeuge && links && <span className="ara-kopf__trenner" aria-hidden="true" />}
          {links && <span className="ara-kopf__vorne">{links}</span>}
        </div>
      )}
      {aktionen && <div className="ara-kopf__aktionen">{aktionen}</div>}
    </header>
  );
}

/**
 * Wie viel der Kopf rechts fuer die Kapsel frei haelt (5.9.2): nur so viel,
 * wie er in sie hineinreicht. `--ara-kapsel-platz` ist vom rechten Rand der
 * App gemessen; steht der Kopf mit dem Rand der Seite und ihrer Hoechstbreite
 * ohnehin weiter links, braucht er nichts, und seine Werkzeuge enden buendig
 * mit Tabelle und Kacheln darunter. Ohne Messung (erstes Bild) gilt die
 * Regel aus `marken.css`, der ganze Platz.
 */
function useKapselFrei(kasten: { current: HTMLElement | null }, aus: boolean): number | null {
  const [frei, setFrei] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (aus || typeof window === 'undefined') return;
    const messen = () => {
      const el = kasten.current;
      if (!el) return;
      const platz = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--ara-kapsel-platz')
      );
      if (!Number.isFinite(platz) || platz <= 0) {
        setFrei(0);
        return;
      }
      const abstand = document.documentElement.clientWidth - el.getBoundingClientRect().right;
      setFrei(Math.max(0, Math.ceil(platz - abstand)));
    };
    messen();
    const beobachter = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(messen);
    beobachter?.observe(document.documentElement);
    window.addEventListener('resize', messen);
    return () => {
      beobachter?.disconnect();
      window.removeEventListener('resize', messen);
    };
  }, [kasten, aus]);
  return frei;
}

/**
 * Ein Werkzeug der Werkzeugleiste: ein Icon-Button von 28 px, ohne Rahmen,
 * getoent beim Ueberfahren; bei grobem Zeiger und am Handy 44 px
 * Trefferflaeche. Die Beschriftung ist Pflicht, sie steht als `aria-label`
 * und als `title` am Knopf: ein Symbol allein ist fuer einen Screenreader
 * nichts und fuer einen Menschen ein Raetsel.
 *
 * Reines CSS (`.ara-werkzeug`), laeuft also auch in einer App ohne Bau.
 */
export interface WerkzeugProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Das Symbol, 16 px. */
  symbol: ReactNode;
  /** Was das Werkzeug tut, als kurzer Befehl: „Person anlegen". */
  beschriftung: string;
  /** Ein Schalter, der gerade an ist (`aria-pressed`). */
  aktiv?: boolean;
}

export function Werkzeug({
  symbol,
  beschriftung,
  aktiv,
  type = 'button',
  className,
  ...rest
}: WerkzeugProps) {
  return (
    <button
      type={type}
      className={className ? `ara-werkzeug ${className}` : 'ara-werkzeug'}
      aria-label={beschriftung}
      title={beschriftung}
      aria-pressed={aktiv === undefined ? undefined : aktiv}
      {...rest}
    >
      <span className="ara-werkzeug__symbol" aria-hidden="true">
        {symbol}
      </span>
    </button>
  );
}
