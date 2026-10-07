'use client';

import * as React from 'react';

import { cn } from '../cn';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarRail,
  useSidebar,
} from '../primitive/sidebar';

/**
 * Die Navigation einer Fachanwendung: eine Liste hinein, eine Seitenleiste
 * heraus.
 *
 * WARUM SIE NEBEN `Sidebar` STEHT. `Sidebar` ist die Mechanik: auf und zu,
 * schmal oder breit, unter 900 px ein Blatt. Wer sie direkt benutzt,
 * schreibt fuer jeden Eintrag vier verschachtelte Bausteine hin, und beim
 * dritten Eintrag ist einer davon vergessen. Hier geht eine Liste hinein.
 * Genau die Grenze, an der eine Bibliothek aufhoert, Teile zu liefern, und
 * anfaengt, eine Form zu liefern.
 *
 * EINE LEISTE FUER ALLES (seit 5.5.0, 07.10.2026). Die Verwaltung des
 * Geraets, seine Einstellungen und jede App zeichnen ihre Navigation mit
 * diesem Muster, und deshalb sieht sie ueberall gleich aus: oben der Titel
 * (`titel`: „Verwaltung", „Einstellungen", der Name der App), darunter Zeilen
 * von 32 px mit Symbol 16 px und 2 px Abstand, die Auswahl als getoente
 * Flaeche, Gruppen mit kleiner Ueberschrift. Wer eine eigene Leiste baut,
 * sieht beim naechsten Stand des Geraets anders aus als alles um ihn herum.
 *
 * Unter 900 px ist die Leiste ein Blatt (`Sidebar`); ein Klick auf einen
 * Eintrag schliesst es, sonst laege es nach der Wahl noch ueber der Seite.
 *
 * WELCHER EINTRAG AKTIV IST, SAGT DIE ANWENDUNG. Sie kennt ihren Router;
 * dieser Baustein kennt keinen. `aktiv` traegt am Knopf `aria-current="page"`;
 * daran und nicht an der Farbe erkennt ein Screenreader, wo er steht.
 */
export interface SeitenleistenEintrag {
  kennung: string;
  name: string;
  symbol?: React.ReactNode;
  aktiv?: boolean;
  /** Eine Zahl rechts: offene Freigaben, ungelesene Zeilen. */
  zahl?: number | string;
  disabled?: boolean;
  /** Ein Ziel. Ohne `href` ist der Eintrag ein Knopf. */
  href?: string;
  aufKlick?: () => void;
  /** Fuer Tests und Abnahmen: steht als `data-testid` am Knopf. */
  kennzeichen?: string;
}

export interface SeitenleistenGruppe {
  /** Ueberschrift der Gruppe. Ohne sie steht die Liste ohne Titel da. */
  titel?: string;
  eintraege: readonly SeitenleistenEintrag[];
}

export interface SeitenleisteProps {
  /**
   * Der Titel oben: „Verwaltung", „Einstellungen", der Name der App. Er ist
   * die Form, die jede Leiste auf dem Geraet traegt; `marke` ist fuer ein
   * Zeichen daneben oder statt seiner.
   */
  titel?: string;
  /** Was ganz oben steht: Name der Anwendung, Zeichen, was auch immer. */
  marke?: React.ReactNode;
  /** Der Name der Navigation fuer Screenreader. Vorgabe ist der Titel. */
  beschriftung?: string;
  /** Fuer Tests und Abnahmen: steht als `data-testid` an der Navigation. */
  kennzeichen?: string;
  gruppen: readonly SeitenleistenGruppe[];
  /** Was ganz unten steht: der angemeldete Mensch, eine Fassung. */
  fuss?: React.ReactNode;
  /** Solange die Eintraege unterwegs sind: Platzhalter statt einer leeren Leiste. */
  laedt?: boolean;
  seite?: 'links' | 'rechts';
  className?: string;
}

export function Seitenleiste({
  titel,
  marke,
  beschriftung,
  kennzeichen,
  gruppen,
  fuss,
  laedt = false,
  seite = 'links',
  className,
}: SeitenleisteProps) {
  const { schmal, setzeBlattOffen } = useSidebar();
  const gewaehlt = (eintrag: SeitenleistenEintrag) => () => {
    eintrag.aufKlick?.();
    if (schmal) setzeBlattOffen(false);
  };
  return (
    <Sidebar seite={seite} className={cn(className)}>
      {/* Zugeklappt bleiben nur die Symbole: Marke und Fuss sind Text und
          haetten in der schmalen Leiste keinen Platz. */}
      {(titel || marke) && (
        <SidebarHeader className="group-data-[einklappen=symbole]:hidden">
          {marke}
          {titel && (
            <span
              className="flex h-8 items-center truncate px-2 text-ui-lg font-medium text-foreground"
              data-slot="sidebar-titel"
            >
              {titel}
            </span>
          )}
        </SidebarHeader>
      )}
      <SidebarContent
        role="navigation"
        aria-label={beschriftung ?? titel}
        data-testid={kennzeichen}
      >
        {laedt ? (
          <SidebarGroup>
            <SidebarGroupContent>
              {[0, 1, 2, 3].map(i => (
                <SidebarMenuSkeleton key={i} />
              ))}
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          gruppen.map((gruppe, i) => (
            <SidebarGroup key={gruppe.titel ?? i}>
              {gruppe.titel && <SidebarGroupLabel>{gruppe.titel}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {gruppe.eintraege.map(eintrag => (
                    <SidebarMenuItem key={eintrag.kennung}>
                      <SidebarMenuButton
                        asChild={Boolean(eintrag.href)}
                        aktiv={eintrag.aktiv}
                        disabled={eintrag.disabled}
                        onClick={eintrag.href ? undefined : gewaehlt(eintrag)}
                        data-testid={eintrag.kennzeichen}
                        // Der Name steht als `title` auch dann noch da, wenn
                        // die Leiste auf Symbolbreite zugeklappt ist, sonst
                        // ist sie eine Reihe unbeschrifteter Bildchen.
                        title={eintrag.name}
                      >
                        {eintrag.href ? (
                          <a href={eintrag.href} onClick={gewaehlt(eintrag)}>
                            {eintrag.symbol}
                            <span>{eintrag.name}</span>
                          </a>
                        ) : (
                          <>
                            {eintrag.symbol}
                            <span>{eintrag.name}</span>
                          </>
                        )}
                      </SidebarMenuButton>
                      {eintrag.zahl !== undefined && (
                        <SidebarMenuBadge>{eintrag.zahl}</SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))
        )}
      </SidebarContent>
      {fuss && (
        <SidebarFooter className="group-data-[einklappen=symbole]:hidden">{fuss}</SidebarFooter>
      )}
      <SidebarRail />
    </Sidebar>
  );
}
