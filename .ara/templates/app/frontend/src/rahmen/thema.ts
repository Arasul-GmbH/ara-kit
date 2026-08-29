/**
 * Welches Thema gilt, und woher die App das weiss.
 *
 * Die App laeuft in einem Rahmen mitten in der Oberflaeche des Geraets. Sie
 * hat kein eigenes Thema und soll auch keines haben: zwei Erscheinungsbilder
 * uebereinander auf einem Bildschirm sieht der Mensch als eines, und dann ist
 * eines davon kaputt.
 *
 * **Das Geraet schreibt sein Thema als `data-theme` an das `<html>` des
 * Elternfensters.** Dort wird es gelesen, und auf eine Aenderung wird gehoert:
 * wer in Arasul umschaltet, waehrend die App offen ist, sieht sie mitgehen.
 * Rahmen und App kommen vom selben Geraet, also darf die App in das
 * Elternfenster sehen; wenn nicht, faellt sie zurueck, statt zu scheitern.
 *
 * **Ohne Rahmen** (die App direkt in einem Tab) sagt niemand etwas. Dann gilt
 * die Einstellung des Betriebssystems, und auch auf die wird gehoert.
 *
 * Die Werte kommen vom Geraet und nicht von hier: heute sind es drei, und ab
 * dem Umbau der Themen sollen es zwei sein. Darum wird nicht aufgezaehlt,
 * sondern gepruefft, ob `design.css` den Wert kennt; was sie nicht kennt, ist
 * eine Aenderung am Geraet und kein Fehler der App. Deshalb steht dann der
 * Rueckfall da und nicht ein leerer Bildschirm.
 */

import { useEffect, useState } from "react";

/** Die Themen, fuer die `design.css` einen Block traegt. */
export const THEMEN = ["black", "dark", "light"] as const;

export type Thema = (typeof THEMEN)[number];

function istThema(wert: string | null | undefined): wert is Thema {
  return THEMEN.includes(wert as Thema);
}

/**
 * Aus dem, was das Elternfenster sagt, und dem, was das System sagt, wird
 * eines. Rein, damit der Fall "das Geraet nennt ein Thema, das diese App noch
 * nicht kennt" pruefbar ist, ohne einen Browser zu starten.
 */
export function themaAusWert(wert: string | null | undefined, systemHell: boolean): Thema {
  return istThema(wert) ? wert : systemHell ? "light" : "black";
}

/**
 * Das `<html>` des Elternfensters, oder `null`.
 *
 * `null` heisst: es gibt keinen Rahmen, oder er gehoert einer anderen Herkunft.
 * Der Zugriff wirft dann, und das ist kein Fehler, sondern die Antwort.
 */
function elternWurzel(): HTMLElement | null {
  try {
    if (window.parent === window) return null;
    return window.parent.document.documentElement;
  } catch {
    return null;
  }
}

function systemIstHell(): boolean {
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ?? false;
}

/** Was gerade gilt, in diesem Augenblick gelesen. */
export function themaLesen(): Thema {
  return themaAusWert(elternWurzel()?.getAttribute("data-theme"), systemIstHell());
}

/**
 * Das Thema als Zustand, gesetzt am eigenen `<html>`.
 *
 * Einmal im Rahmen der App aufgerufen und sonst nirgends: zwei Beobachter auf
 * demselben Elternfenster kosten zweimal, und der zweite sagt dasselbe.
 */
export function useThema(): Thema {
  const [thema, setThema] = useState<Thema>(themaLesen);

  useEffect(() => {
    const nachziehen = () => setThema(themaLesen());
    const wurzel = elternWurzel();

    if (wurzel) {
      const beobachter = new MutationObserver(nachziehen);
      beobachter.observe(wurzel, { attributes: true, attributeFilter: ["data-theme"] });
      // Zwischen dem ersten Lesen und dem Beobachten liegt ein Augenblick, in
      // dem eine Aenderung durchfaellt. Einmal nachziehen kostet nichts.
      nachziehen();
      return () => beobachter.disconnect();
    }

    const abfrage = window.matchMedia("(prefers-color-scheme: light)");
    abfrage.addEventListener("change", nachziehen);
    return () => abfrage.removeEventListener("change", nachziehen);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", thema);
  }, [thema]);

  return thema;
}
