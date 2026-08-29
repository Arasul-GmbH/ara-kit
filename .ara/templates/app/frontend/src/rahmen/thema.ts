/**
 * Welches Thema gilt, und woher die App das weiss.
 *
 * Die App laeuft in einem Rahmen mitten in der Oberflaeche des Geraets. Sie
 * hat kein eigenes Thema und soll auch keines haben: zwei Erscheinungsbilder
 * uebereinander auf einem Bildschirm sieht der Mensch als eines, und dann ist
 * eines davon kaputt.
 *
 * **ZWEI THEMEN, UND HELL SETZT NICHTS.** Das ist der Vertrag des Geraets und
 * nicht die Erfindung dieser Datei: `:root` IST hell, und `dunkel` steht als
 * Klasse `dark` und als `data-theme="dark"` am `<html>`. Ein Attribut fuer
 * Hell waere ein zweiter Name fuer den Normalfall.
 *
 * **IM RAHMEN SCHREIBT DAS GERAET, NICHT DIE APP.** Die Shell greift in das
 * Dokument dieser App hinein und setzt beides dort, bei jedem Wechsel und bei
 * jedem Laden. Sie schickt denselben Wert zusaetzlich als Nachricht
 * (`{typ: "arasul:theme", theme}`), und das ist der einzige Weg, der Hell
 * AUSDRUECKLICH nennt. Diese Datei liest deshalb, statt zu setzen: sie hoert
 * auf die Nachricht und sieht am eigenen `<html>` nach.
 *
 * Bis zum 29.08.2026 stand hier das Gegenteil. Die App las `data-theme` am
 * Elternfenster, kannte drei Werte und schrieb ihren Rueckfall `black` an ihr
 * eigenes `<html>`. Auf einem Geraet, das seit H1 zwei Themen fuehrt, hiess
 * das: die Shell nahm das Attribut fuer Hell weg, die App setzte `black`
 * hinein, und in einer hellen Oberflaeche stand ein schwarzer Rahmen.
 *
 * **OHNE RAHMEN** (die App direkt in einem Tab) sagt niemand etwas. Dann gilt
 * die Einstellung des Betriebssystems, es wird auf sie gehoert, und dann
 * schreibt die App selbst, weil es sonst niemand tut.
 */

import { useEffect, useState } from "react";

/** Die zwei Themen des Geraets. Hell ist die Vorgabe und braucht keinen Selektor. */
export const THEMEN = ["light", "dark"] as const;

export type Thema = (typeof THEMEN)[number];

/** Die Nachricht, mit der die Shell ihr Thema ausdruecklich nennt. */
const NACHRICHT = "arasul:theme";

function istThema(wert: unknown): wert is Thema {
  return wert === "light" || wert === "dark";
}

/** Laeuft diese App in einem Rahmen? Dann gehoert ihr Dokument dem Geraet. */
function imRahmen(): boolean {
  return typeof window !== "undefined" && window.parent !== window;
}

function systemIstDunkel(): boolean {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

/**
 * Was an einem Dokument steht, in ein Thema uebersetzt.
 *
 * Rein, damit der Fall „im Rahmen, kein Attribut" pruefbar ist, ohne einen
 * Browser zu starten. Genau dieser Fall ist der interessante: er heisst im
 * Rahmen „hell" und ohne Rahmen „niemand hat etwas gesagt".
 */
export function themaAusWert(wert: string | null | undefined, imRahmen: boolean, systemDunkel: boolean): Thema {
  if (wert === "dark") return "dark";
  if (imRahmen) return "light";
  return systemDunkel ? "dark" : "light";
}

/** Was gerade gilt, in diesem Augenblick am eigenen Dokument gelesen. */
export function themaLesen(): Thema {
  return themaAusWert(document.documentElement.getAttribute("data-theme"), imRahmen(), systemIstDunkel());
}

/**
 * Das Thema als Zustand.
 *
 * Einmal im Rahmen der App aufgerufen und sonst nirgends: zwei Beobachter auf
 * demselben Dokument kosten zweimal, und der zweite sagt dasselbe.
 */
export function useThema(): Thema {
  const [thema, setThema] = useState<Thema>(themaLesen);

  useEffect(() => {
    const nachziehen = () => setThema(themaLesen());

    // Der ausdrueckliche Weg. Er nennt auch Hell, und er kommt bei jedem
    // Laden, also auch dann, wenn zwischen dem ersten Lesen und dem
    // Beobachten ein Wechsel durchgefallen waere.
    const hoeren = (ereignis: MessageEvent) => {
      const daten = ereignis.data as { typ?: string; theme?: unknown } | null;
      if (daten?.typ === NACHRICHT && istThema(daten.theme)) setThema(daten.theme);
    };
    window.addEventListener("message", hoeren);

    // Der stille Weg: die Shell schreibt in dieses Dokument.
    const beobachter = new MutationObserver(nachziehen);
    beobachter.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    nachziehen();

    if (imRahmen()) {
      return () => {
        window.removeEventListener("message", hoeren);
        beobachter.disconnect();
      };
    }

    const abfrage = window.matchMedia("(prefers-color-scheme: dark)");
    abfrage.addEventListener("change", nachziehen);
    return () => {
      window.removeEventListener("message", hoeren);
      beobachter.disconnect();
      abfrage.removeEventListener("change", nachziehen);
    };
  }, []);

  // Ohne Rahmen schreibt es niemand sonst. Im Rahmen schreibt die Shell
  // dasselbe, und dann ist das hier folgenlos: derselbe Wert, dieselben zwei
  // Stellen, kein Hin und Her zwischen zwei Schreibern.
  useEffect(() => {
    const wurzel = document.documentElement;
    wurzel.classList.toggle("dark", thema === "dark");
    if (thema === "dark") wurzel.setAttribute("data-theme", "dark");
    else wurzel.removeAttribute("data-theme");
  }, [thema]);

  return thema;
}
