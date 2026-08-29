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
} from '../primitive/sidebar';

/**
 * Die Navigation einer Fachanwendung: eine Liste hinein, eine Seitenleiste
 * heraus.
 *
 * WARUM SIE NEBEN `Sidebar` STEHT. `Sidebar` ist die Mechanik -- auf und zu,
 * schmal oder breit, unter 900 px ein Blatt. Wer sie direkt benutzt,
 * schreibt fuer jeden Eintrag vier verschachtelte Bausteine hin, und beim
 * dritten Eintrag ist einer davon vergessen. Hier geht eine Liste hinein.
 * Genau die Grenze, an der eine Bibliothek aufhoert, Teile zu liefern, und
 * anfaengt, eine Form zu liefern.
 *
 * WELCHER EINTRAG AKTIV IST, SAGT DIE ANWENDUNG. Sie kennt ihren Router;
 * dieser Baustein kennt keinen. `aktiv` traegt am Knopf `aria-current="page"`
 * -- daran und nicht an der Farbe erkennt ein Screenreader, wo er steht.
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
}

export interface SeitenleistenGruppe {
  /** Ueberschrift der Gruppe. Ohne sie steht die Liste ohne Titel da. */
  titel?: string;
  eintraege: readonly SeitenleistenEintrag[];
}

export interface SeitenleisteProps {
  /** Was ganz oben steht: Name der Anwendung, Zeichen, was auch immer. */
  marke?: React.ReactNode;
  gruppen: readonly SeitenleistenGruppe[];
  /** Was ganz unten steht: der angemeldete Mensch, eine Fassung. */
  fuss?: React.ReactNode;
  /** Solange die Eintraege unterwegs sind: Platzhalter statt einer leeren Leiste. */
  laedt?: boolean;
  seite?: 'links' | 'rechts';
  className?: string;
}

export function Seitenleiste({
  marke,
  gruppen,
  fuss,
  laedt = false,
  seite = 'links',
  className,
}: SeitenleisteProps) {
  return (
    <Sidebar seite={seite} className={cn(className)}>
      {marke && <SidebarHeader>{marke}</SidebarHeader>}
      <SidebarContent>
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
                        onClick={eintrag.href ? undefined : eintrag.aufKlick}
                        // Der Name steht als `title` auch dann noch da, wenn
                        // die Leiste auf Symbolbreite zugeklappt ist -- sonst
                        // ist sie eine Reihe unbeschrifteter Bildchen.
                        title={eintrag.name}
                      >
                        {eintrag.href ? (
                          <a href={eintrag.href} onClick={eintrag.aufKlick}>
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
      {fuss && <SidebarFooter>{fuss}</SidebarFooter>}
      <SidebarRail />
    </Sidebar>
  );
}
