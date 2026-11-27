import { useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { useFokusfalle } from './fokusfalle';
import { AppIcon, Linie } from './Linien';
import type { LinienName } from './Linien';

/**
 * Die Popup-Kapsel: Glas im oberen Drittel mit einem Suchfeld und Gruppen
 * darunter. Sie ist die Suche, der Kontakt und die Neu-Auswahl in einem.
 * Escape schliesst, ein Tipp auf den Schleier schliesst, der Fokus springt
 * ins Suchfeld und kehrt zurueck. Mit den Pfeiltasten wandert man durch die
 * Eintraege, Enter waehlt.
 */
export interface PopupProps {
  offen: boolean;
  onSchliessen: () => void;
  /** Vorlesename des Dialogs. */
  titel: string;
  /** Ohne `suche` gibt es kein Suchfeld (etwa im Kontakt). */
  suche?: {
    wert: string;
    onAendern: (wert: string) => void;
    platzhalter?: string;
  };
  /** Was steht, wenn keine Gruppe etwas zeigt. */
  leerText?: string;
  /** Ob nichts zu zeigen ist; die Gruppen filtert die App. */
  leer?: boolean;
  kennzeichen?: string;
  children?: ReactNode;
}

export function Popup({
  offen,
  onSchliessen,
  titel,
  suche,
  leerText = 'Nichts gefunden.',
  leer,
  kennzeichen,
  children,
}: PopupProps) {
  const flaeche = useRef<HTMLDivElement>(null);
  const feld = useRef<HTMLInputElement>(null);
  useFokusfalle(offen, flaeche, onSchliessen, suche ? feld : undefined);

  if (!offen) return null;

  /** Pfeil hoch und runter springen von Eintrag zu Eintrag, das Feld inklusive. */
  const aufTaste = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const liste = [
      ...(flaeche.current?.querySelectorAll<HTMLElement>('input, .ara-popup__eintrag') ?? []),
    ];
    const jetzt = liste.indexOf(document.activeElement as HTMLElement);
    const ziel = liste[(jetzt + (e.key === 'ArrowDown' ? 1 : -1) + liste.length) % liste.length];
    if (ziel) {
      e.preventDefault();
      ziel.focus();
    }
  };

  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        className="ara-schleier"
        aria-label={`${titel} schließen`}
        onClick={onSchliessen}
      />
      <div
        className="ara-glas ara-popup"
        data-form="karte"
        role="dialog"
        aria-modal="true"
        aria-label={titel}
        data-testid={kennzeichen}
        ref={flaeche}
        onKeyDown={aufTaste}
      >
        {suche && (
          <label className="ara-popup__suche">
            <Linie name="suche" groesse={20} />
            <input
              ref={feld}
              type="search"
              value={suche.wert}
              placeholder={suche.platzhalter ?? 'Suchen'}
              aria-label={suche.platzhalter ?? 'Suchen'}
              onChange={e => suche.onAendern(e.target.value)}
            />
            <kbd className="ara-popup__kuerzel">esc</kbd>
          </label>
        )}
        <div className="ara-popup__inhalt">
          {leer ? <p className="ara-popup__leer">{leerText}</p> : children}
        </div>
      </div>
    </>
  );
}

export interface PopupGruppeProps {
  titel: string;
  children: ReactNode;
}

export function PopupGruppe({ titel, children }: PopupGruppeProps) {
  return (
    <section className="ara-popup__gruppe" aria-label={titel}>
      <h2 className="ara-popup__gruppentitel">{titel}</h2>
      {children}
    </section>
  );
}

export interface PopupEintragProps {
  symbol?: LinienName;
  /** Eine App: das Symbol steht auf dem Squircle des App-Icons. */
  app?: boolean;
  titel: string;
  unterzeile?: string;
  /** Das Tastenkuerzel rechts, etwa „⌘N“. */
  kuerzel?: string;
  onWaehlen: () => void;
}

export function PopupEintrag({
  symbol,
  app,
  titel,
  unterzeile,
  kuerzel,
  onWaehlen,
}: PopupEintragProps) {
  return (
    <button type="button" className="ara-popup__eintrag" onClick={onWaehlen}>
      {symbol &&
        (app ? <AppIcon symbol={symbol} groesse={32} /> : <Linie name={symbol} groesse={20} />)}
      <span className="ara-popup__text">
        <span className="ara-popup__titel">{titel}</span>
        {unterzeile && <span className="ara-popup__unterzeile">{unterzeile}</span>}
      </span>
      {kuerzel && <kbd className="ara-popup__kuerzel">{kuerzel}</kbd>}
    </button>
  );
}
