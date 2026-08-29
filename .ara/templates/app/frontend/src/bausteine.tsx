/**
 * Die Bausteine der Oberflaeche: Kopf, Karte, Formular, Meldung.
 *
 * Sie tragen die Namen und die Klassen des Designsystems von Arasul, und ihre
 * Regeln stehen in `marken.css`. **Hier steht kein Farbwert und kein Abstand**,
 * hier steht das Geruest: welches Element es ist, welche Klasse es traegt, was
 * ein Screenreader davon hat.
 *
 * Sie sind eine Zwischenloesung mit Ablaufdatum. Die Bibliothek des Produkts
 * bringt dieselben Bausteine mit, und zwei weitere dazu: Liste und Menue.
 * Sobald sie im Kit ankommt, wird diese Datei durch einen Import ersetzt, und
 * die Oberflaechen, die aus ihr gebaut sind, bleiben, wie sie sind. Genau
 * darum heissen die Eigenschaften hier wie dort. Was diese Vorlage nicht
 * benutzt, steht auch nicht hier: eine Bibliothek auf Vorrat waere Quelltext,
 * den niemand je gegen die echte gehalten hat.
 *
 * **Neue Oberflaeche entsteht aus diesen Bausteinen**, nicht aus neuem HTML
 * daneben. Wer eine zweite Karte neben die erste schreibt, hat beim naechsten
 * Stand zwei.
 */

import type { FormEvent, ReactNode } from "react";

/* --- Kopf ------------------------------------------------------------------ */

export interface KopfProps {
  /** Der Seitentitel. Erscheint als einziges `h1` der Seite. */
  titel: string;
  /** Ein Satz darunter: was diese Seite tut. */
  beschreibung?: ReactNode;
  /** Aktionen rechts. Unter 900 px rutschen sie unter den Titel. */
  aktionen?: ReactNode;
}

export function Kopf({ titel, beschreibung, aktionen }: KopfProps) {
  return (
    <div className="ara-kopf">
      <div className="ara-kopf__text">
        <h1 className="ara-kopf__titel">{titel}</h1>
        {beschreibung && <p className="ara-kopf__satz">{beschreibung}</p>}
      </div>
      {aktionen && <div className="ara-kopf__aktionen">{aktionen}</div>}
    </div>
  );
}

/* --- Karte ----------------------------------------------------------------- */

export interface KarteProps {
  titel?: string;
  /** Kurzes rechts oben: ein Stand, eine Fassung, eine Frist. */
  hinweis?: ReactNode;
  children?: ReactNode;
}

export function Karte({ titel, hinweis, children }: KarteProps) {
  return (
    <div className="ara-karte">
      {(titel || hinweis) && (
        <div className="ara-karte__kopf">
          {titel && <h2 className="ara-karte__titel">{titel}</h2>}
          {hinweis && <span className="ara-karte__hinweis">{hinweis}</span>}
        </div>
      )}
      {children && <div className="ara-karte__inhalt">{children}</div>}
    </div>
  );
}

/* --- Formular -------------------------------------------------------------- */

export interface FormularProps {
  /** Was beim Absenden passiert. `preventDefault` ist schon getan. */
  onAbsenden?: () => void;
  /** Die Knopfreihe unten. */
  aktionen?: ReactNode;
  children?: ReactNode;
}

/**
 * Ein `form` und keine Ansammlung von Feldern. Daran haengt mehr, als es
 * aussieht: die Eingabetaste im letzten Feld sendet ab, und der Browser bietet
 * seine Hilfen an.
 */
export function Formular({ onAbsenden, aktionen, children }: FormularProps) {
  const absenden = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onAbsenden?.();
  };
  return (
    <form className="ara-formular" onSubmit={absenden} noValidate>
      {children}
      {aktionen && <div className="ara-formular__aktionen">{aktionen}</div>}
    </form>
  );
}

export interface FeldProps {
  /** Die `id` der Eingabe darin. Pflicht: ohne sie finden Beschriftung und Feld nicht zusammen. */
  kennung: string;
  beschriftung: string;
  hinweis?: ReactNode;
  children: ReactNode;
}

export function Feld({ kennung, beschriftung, hinweis, children }: FeldProps) {
  return (
    <div className="ara-feld">
      <label className="ara-feld__beschriftung" htmlFor={kennung}>
        {beschriftung}
      </label>
      {children}
      {hinweis && <p className="ara-feld__hinweis">{hinweis}</p>}
    </div>
  );
}

/** Haupt = die eine Handlung der Flaeche, Gefahr = die, die etwas wegnimmt. */
export type KnopfArt = "still" | "haupt" | "gefahr";

export interface KnopfProps {
  art?: KnopfArt;
  /** `absenden` gehoert in ein `Formular`, sonst `knopf`. */
  typ?: "knopf" | "absenden";
  onKlick?: () => void;
  gesperrt?: boolean;
  children: ReactNode;
}

export function Knopf({ art = "still", typ = "knopf", onKlick, gesperrt = false, children }: KnopfProps) {
  return (
    <button
      type={typ === "absenden" ? "submit" : "button"}
      className="ara-knopf"
      data-art={art}
      disabled={gesperrt}
      onClick={onKlick}
    >
      {children}
    </button>
  );
}

/* --- Meldung --------------------------------------------------------------- */

/** Was fuer eine Meldung es ist. Die Farbe folgt daraus, nicht umgekehrt. */
export type MeldungsArt = "hinweis" | "erfolg" | "warnung" | "fehler";

export interface MeldungProps {
  art?: MeldungsArt;
  titel?: string;
  children?: ReactNode;
}

/**
 * `role` haengt an der Art: ein Fehler ist eine `alert`, alles andere ein
 * `status`. Und die Art steht immer auch im Text -- eine Meldung, die nur an
 * ihrer Farbe zu erkennen ist, ist fuer manche Menschen keine.
 */
export function Meldung({ art = "hinweis", titel, children }: MeldungProps) {
  return (
    <div className="ara-meldung" data-art={art} role={art === "fehler" ? "alert" : "status"}>
      {titel && <p className="ara-meldung__titel">{titel}</p>}
      {children}
    </div>
  );
}
