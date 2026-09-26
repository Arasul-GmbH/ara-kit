/**
 * `@marken/diagramm` -- das Diagramm und die Sparkline, mit eigenem Einstieg
 * (Auftrag marken-liste-auswahl-und-kontrast, 26.09.2026, Fassung 5.0.0).
 *
 * WARUM SIE NICHT IM SAMMELEXPORT STEHEN. `Chart` und `Sparkline` stehen auf
 * `recharts`, und `recharts` hat Seiteneffekte beim Laden: ein Bau haelt es,
 * sobald es ueber das Barrel `@marken` erreichbar ist -- egal, ob die App
 * ein Diagramm zeigt. Die Shell hat das seit H5 mit
 * `treeshake.moduleSideEffects` in ihrer `vite.config.ts` abgefangen; eine App
 * aus dem Geruest des Kits hat diese Zeile nicht, und die Bibliothek hat mit
 * Absicht keine `package.json`, die `sideEffects: false` sagen koennte (Regel
 * 7). Gemessen an einer App aus dem Geruest ohne ein einziges Diagramm:
 * 690 kB roh im Einstieg mit dem Diagramm im Barrel, 409 kB ohne.
 *
 * Wer ein Diagramm zeigt, schreibt deshalb
 *
 *     import { Chart, Sparkline } from '@marken/diagramm';
 *
 * und bekommt `recharts` genau dann, und am besten in einem nachgeladenen
 * Teil seiner Oberflaeche.
 */
export { Chart, Sparkline, SERIENFARBEN } from './primitive/chart';
