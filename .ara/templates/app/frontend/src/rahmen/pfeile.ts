/**
 * Mit den Pfeilen von Zeile zu Zeile einer `Datenliste`.
 *
 * Seit Marken 5.0.0 steht jede Zeile, die `aufZeile` hat, in der
 * Tab-Reihenfolge, und Eingabe oder Leertaste wählen sie. Die Pfeile kennt die
 * Bibliothek nicht, und bei 200 Zeilen ist Tab allein ein weiter Weg. Die
 * Bibliothek nimmt an der Zeile keinen eigenen Tastengriff an, also fängt ein
 * Kasten um die Liste das Ereignis: `<div onKeyDown={zeilenPfeile}>`.
 */

import type { KeyboardEvent } from "react";

export function zeilenPfeile(ereignis: KeyboardEvent<HTMLElement>) {
  if (ereignis.key !== "ArrowDown" && ereignis.key !== "ArrowUp") return;
  const zeile = ereignis.target;
  if (!(zeile instanceof HTMLTableRowElement)) return;
  const nachbar = ereignis.key === "ArrowDown" ? zeile.nextElementSibling : zeile.previousElementSibling;
  if (!(nachbar instanceof HTMLTableRowElement) || nachbar.tabIndex < 0) return;
  ereignis.preventDefault();
  nachbar.focus();
}
