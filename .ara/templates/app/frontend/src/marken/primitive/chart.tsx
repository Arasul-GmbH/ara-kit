/**
 * Chart: Linien-Diagramm, und Sparkline, die kleine Form davon.
 *
 * Es liegt in der Bibliothek und nicht mehr in der Shell. Ein
 * Diagramm weiß nichts von Arasul: es bekommt Zahlen, Reihen und zwei
 * Formatierer. Eine Fachanwendung, die einen Verlauf zeigt, hätte sich sonst
 * ihr eigenes recharts zusammengesetzt, und dann gäbe es auf einem Bildschirm
 * zwei Diagramme mit zwei Farbreihen und zwei Achsenformen.
 *
 * MIT DEM UMZUG SIND DIE TOKENS GEWECHSELT, UND ZWAR NOTGEDRUNGEN. Es stand
 * auf `--text-muted`, `--bg-card`, `--text-primary` und `--shadow-md`. Das
 * sind Aliasse der Shell aus `index.css`, und die gibt es in einer App nicht.
 * Jetzt stehen dort die Tokens aus `theme.css`, auf die diese Aliasse ohnehin
 * zeigen (`--muted-foreground`, `--card`, `--foreground`). Der Schatten am
 * Tooltip ist ersatzlos gefallen: `--shadow-md` gehört der Shell, und ein
 * fester Wert an seiner Stelle wäre eine Farbe ohne Token. Der Rahmen und die
 * Kartenfläche trennen ihn auch so vom Diagramm darunter.
 *
 * Ersetzt zwei getrennte recharts-Aufbauten in `SystemStatus`: das Auslastungs-
 * Diagramm und den Temperaturverlauf in der Kachel. Beide setzten Achsen,
 * Gitter und Farben von Hand, mit unterschiedlichem Ergebnis.
 *
 * Zwei Festlegungen, die der Aufrufer nicht mehr treffen kann:
 *
 * 1. Nur Grau und Blau (Befund F-25). Vorher liefen drei Linien in Violett
 *    (`--color-chart-2`), Blau und Orange (`--color-chart-3`). Drei Farben für
 *    drei Werte derselben Einheit behaupten eine Bedeutung, die es nicht gibt.
 *    SERIENFARBEN hat drei Einträge, von Blau über Schwarz nach Grau. Wer mehr
 *    Reihen übergibt, bekommt Wiederholungen; drei ist bewusst die Grenze,
 *    innerhalb derer sich Linien noch unterscheiden lassen. Es gibt
 *    auch keine Diagrammpalette (`--color-chart-*`) mehr:
 *    die Linien nehmen dieselben Tokens wie alles andere.
 * 2. Keine Karte drumherum. Die Fläche stellt der Aufrufer, das Diagramm
 *    bringt nur die Linien mit.
 */

import { memo, useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '../cn';

/**
 * Drei Werte von Blau ueber Schwarz nach Grau.
 *
 * Alle drei stehen in `theme.css` und folgen damit dem Thema. recharts
 * nimmt die rohe CSS-Variable und keine Tailwind-Klasse, also muss der Name
 * hier der des Tokens sein und nicht der der Utility. Drei ist bewusst die
 * Grenze: darueber lassen sich Linien derselben Einheit nicht mehr
 * auseinanderhalten, und wer mehr Reihen uebergibt, bekommt Wiederholungen.
 */
export const SERIENFARBEN = [
  'var(--primary)',
  'var(--foreground)',
  'var(--muted-foreground)',
] as const;

interface ChartSeries {
  /** Feldname im Datensatz. */
  key: string;
  /** Beschriftung in Legende und Tooltip. */
  name: string;
  /** Einheit hinter dem Wert im Tooltip, etwa "%" oder "°C". */
  unit?: string;
  /**
   * Welche Achse die Reihe bemisst. Ohne Angabe die linke.
   *
   * Es gibt sie, weil eine Reihe mit anderer Einheit auf einer fremden Achse
   * eine falsche Aussage zeichnet, nicht nur eine unschoene. Im Systemstatus
   * lief die Temperatur frueher auf der Prozentachse: 52 Grad
   * landeten auf der Linie, an der „50%" steht, und ein Leser sah eine
   * halbvolle Maschine, wo eine kuehle stand.
   */
  achse?: 'links' | 'rechts';
}

/**
 * Über die Datensatzform gebunden statt auf Record festgelegt: eine mit
 * `interface` erklärte Form wie `ChartDataPoint` hat keine Index-Signatur und
 * passt deshalb auf kein Record. `object` nimmt beides.
 */
interface ChartProps<Datum extends object> {
  data: readonly Datum[];
  series: readonly ChartSeries[];
  /** Feldname der X-Achse. */
  xKey: string;
  /** Feste Achsenmarken, sonst wählt recharts selbst. */
  xTicks?: number[];
  formatX: (value: number) => string;
  formatY?: (value: number) => string;
  yDomain?: [number, number];
  /** Nur noetig, wenn eine Reihe `achse: 'rechts'` traegt. */
  formatYRechts?: (value: number) => string;
  /**
   * Die obere Grenze darf eine Funktion des groessten Messwerts sein. Damit
   * bleibt eine Achse im Normalfall fest, waechst aber mit, statt einen
   * Ausreisser abzuschneiden. Eine feste Decke verbirgt genau den Wert, wegen
   * dem man hinsieht.
   */
  yDomainRechts?: [number, number | ((datenMax: number) => number)];
  height?: number;
  /** Beschreibung des Diagramms für Vorlesewerkzeuge. */
  label: string;
  /**
   * Linien (Vorgabe) oder Balken (seit 5.9.0). Beide im selben Stil: nur
   * waagrechte Hilfslinien, Achsen ohne Strich, Beschriftung 12 px in
   * Grau, die Reihen in Blau, Schwarz, Grau; Balken oben mit 4 px Radius.
   */
  art?: 'linie' | 'balken';
  className?: string;
}

const ACHSE = {
  stroke: 'var(--muted-foreground)',
  tick: { fill: 'var(--muted-foreground)', fontSize: 12 },
  // Seit 5.9.0 ohne Achsenstrich und ohne Marken: die waagrechten
  // Hilfslinien tragen die Ordnung, ein Rahmen um das Diagramm wiederholt sie.
  axisLine: false,
  tickLine: false,
} as const;

export function Chart<Datum extends object>({
  data,
  series,
  xKey,
  xTicks,
  formatX,
  formatY,
  yDomain,
  formatYRechts,
  yDomainRechts,
  height = 280,
  label,
  art = 'linie',
  className,
}: ChartProps<Datum>) {
  const einheiten = new Map(series.map(reihe => [reihe.name, reihe.unit ?? '']));
  const zweiteAchse = series.some(reihe => reihe.achse === 'rechts');
  const Flaeche = art === 'balken' ? BarChart : LineChart;

  return (
    <div className={cn('min-w-0', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <Flaeche
          data={data as Datum[]}
          role="img"
          aria-label={label}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          {...(art === 'balken' ? { barCategoryGap: '24%' } : {})}
        >
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey={xKey}
            {...(art === 'balken'
              ? {}
              : { type: 'number' as const, domain: ['dataMin', 'dataMax'] })}
            {...(xTicks ? { ticks: xTicks } : {})}
            tickFormatter={formatX}
            {...ACHSE}
          />
          <YAxis
            yAxisId="links"
            {...(yDomain ? { domain: yDomain } : {})}
            {...(formatY ? { tickFormatter: formatY } : {})}
            {...ACHSE}
          />
          {zweiteAchse && (
            <YAxis
              yAxisId="rechts"
              orientation="right"
              {...(yDomainRechts ? { domain: yDomainRechts } : {})}
              {...(formatYRechts ? { tickFormatter: formatYRechts } : {})}
              {...ACHSE}
            />
          )}
          <Tooltip
            cursor={art === 'balken' ? { fill: 'var(--accent)' } : { stroke: 'var(--border)' }}
            contentStyle={{
              background: 'var(--popover)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--glas-schatten-klein, none)',
              fontSize: 12,
            }}
            labelStyle={{ color: 'var(--foreground)', fontWeight: 500 }}
            labelFormatter={wert => formatX(Number(wert))}
            formatter={(wert, name) => {
              const zahl = typeof wert === 'number' ? wert : Number(wert);
              // de-DE: Komma statt Punkt.
              return [
                `${zahl.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${einheiten.get(String(name)) ?? ''}`,
                String(name),
              ];
            }}
          />
          {series.length > 1 && (
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, color: 'var(--muted-foreground)' }}
            />
          )}
          {series.map((reihe, index) =>
            art === 'balken' ? (
              <Bar
                key={reihe.key}
                dataKey={reihe.key}
                name={reihe.name}
                yAxisId={reihe.achse === 'rechts' ? 'rechts' : 'links'}
                fill={SERIENFARBEN[index % SERIENFARBEN.length]}
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
                isAnimationActive={false}
              />
            ) : (
              <Line
                key={reihe.key}
                type="monotone"
                dataKey={reihe.key}
                name={reihe.name}
                yAxisId={reihe.achse === 'rechts' ? 'rechts' : 'links'}
                stroke={SERIENFARBEN[index % SERIENFARBEN.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            )
          )}
        </Flaeche>
      </ResponsiveContainer>
    </div>
  );
}

interface SparklineProps {
  /** Werte in zeitlicher Reihenfolge. Lücken als null. */
  values: ReadonlyArray<number | null>;
  /** Wie viele Werte vom Ende her gezeigt werden. */
  fenster?: number;
  height?: number;
  className?: string;
}

/**
 * Verlauf ohne Achsen, für die Kennzahlkachel. Trägt keine eigene Aussage,
 * die nicht schon in der Zahl daneben steht, deshalb `aria-hidden`.
 *
 * `memo` und `useMemo`, weil `SystemStatus` bei jedem Messwert neu zeichnet.
 * Der Vorläufer `TempSparkline` hatte beides, und dreissig Werte sind zwar
 * wenig, aber es gibt keinen Grund, sie viermal je Minute neu zu falten.
 *
 * Lücken kommen als null herein. Wer eine Ausfallkennung hat, die wie ein
 * gültiger Wert aussieht, wandelt sie vorher um: die Temperatur macht das in
 * `geraetezustand.ohneAusfallwerte`, weil null Grad dort kein Messwert ist,
 * sondern ein stummer Sensor.
 */
export const Sparkline = memo(function Sparkline({
  values,
  fenster = 30,
  height = 18,
  className,
}: SparklineProps) {
  const punkte = useMemo(
    () =>
      values
        .slice(-fenster)
        .map((wert, index) => ({ index, wert }))
        .filter(
          (punkt): punkt is { index: number; wert: number } => typeof punkt.wert === 'number'
        ),
    [values, fenster]
  );

  // Eine einzelne Zahl ergibt keine Linie, gar nichts ist ehrlicher als ein Punkt.
  if (punkte.length < 2) return null;

  return (
    <div
      className={cn('pointer-events-none mt-ui-1 w-full max-w-32 opacity-60', className)}
      aria-hidden="true"
    >
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={punkte} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <Line
            type="monotone"
            dataKey="wert"
            stroke={SERIENFARBEN[0]}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});
