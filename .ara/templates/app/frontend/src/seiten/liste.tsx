/**
 * Die Vorgaenge, die es gibt.
 *
 * Was hier steht, ist der Ablauf und keine Gestaltung: die Bausteine machen
 * das Aussehen, `AsyncBoundary` macht die drei Ausgaenge einer Abfrage. Die
 * Ansicht steht in der Adresse und nicht im Zustand der Seite, damit ein Link
 * auf "die offenen" ein Link auf die offenen bleibt.
 */

import { Link, useSearchParams } from "react-router-dom";
import { AsyncBoundary } from "../rahmen/async-boundary";
import { Karte, Knopf, Kopf, Meldung } from "../bausteine";
import { STAND, useLage, useVorgaenge, zeitpunkt, type Vorgang } from "../vorgaenge";

const ANSICHTEN = [
  { id: "alle", wort: "Alle" },
  { id: "offen", wort: "Offen" },
  { id: "entschieden", wort: "Entschieden" },
] as const;

function passt(vorgang: Vorgang, ansicht: string): boolean {
  if (ansicht === "offen") return vorgang.status === "wartet";
  if (ansicht === "entschieden") return vorgang.status !== "wartet";
  return true;
}

function Zeile({ vorgang }: { vorgang: Vorgang }) {
  const stand = STAND[vorgang.status] ?? { wort: vorgang.status, art: "hinweis" as const };
  return (
    <li>
      {/* Die Farbe steht NEBEN dem Wort und nicht anstelle davon: ein Stand,
          der nur an seiner Farbe zu erkennen ist, ist fuer manche keiner. */}
      <Karte titel={vorgang.titel} hinweis={<span className="stand" data-art={stand.art}>{stand.wort}</span>}>
        <p>
          {vorgang.von}, {zeitpunkt(vorgang.gestellt)}
          {vorgang.text && vorgang.text !== "ohne Angabe" ? `, ${vorgang.text}` : ""}
        </p>
        {vorgang.entschieden_von && (
          <p>
            entschieden von {vorgang.entschieden_von}
            {vorgang.begruendung ? `: ${vorgang.begruendung}` : ""}
          </p>
        )}
        {vorgang.bemerkung && <p>{vorgang.bemerkung}</p>}
        {vorgang.hinweis && <p>{vorgang.hinweis}</p>}
      </Karte>
    </li>
  );
}

export function Liste() {
  const [suche, setSuche] = useSearchParams();
  const ansicht = suche.get("ansicht") ?? "alle";
  const lage = useLage();
  const vorgaenge = useVorgaenge();

  return (
    <>
      <Kopf
        titel="Vorgänge"
        beschreibung="Eingereicht hier, entschieden in Arasul."
        aktionen={
          <Link to="/neu" className="ara-knopf" data-art="haupt">
            Neuer Vorgang
          </Link>
        }
      />

      {/* Warum kein Flow anhaelt, sagt die App selbst: "ohne Arasul" und "das
          Geraet hat den Wert nicht gesetzt" sehen gleich aus und sind es nicht. */}
      <AsyncBoundary abfrage={lage} laedt="Rahmen wird gelesen">
        {(stand) =>
          stand.arasul ? null : (
            <Meldung art="warnung" titel="Über diese Vorgänge entscheidet niemand">
              {stand.hinweis ?? "Diese App erreicht kein Arasul."} Ein Vorgang wird angenommen und
              bleibt liegen.
            </Meldung>
          )
        }
      </AsyncBoundary>

      <nav className="ara-formular__aktionen" aria-label="Ansicht">
        {ANSICHTEN.map((eintrag) => (
          <Knopf
            key={eintrag.id}
            art={eintrag.id === ansicht ? "haupt" : "still"}
            onKlick={() => setSuche(eintrag.id === "alle" ? {} : { ansicht: eintrag.id })}
          >
            {eintrag.wort}
          </Knopf>
        ))}
      </nav>

      <AsyncBoundary abfrage={vorgaenge} laedt="Vorgänge werden geholt">
        {(alle) => {
          const sichtbar = alle.filter((vorgang) => passt(vorgang, ansicht));
          if (!sichtbar.length) {
            return <Meldung>{alle.length ? "In dieser Ansicht liegt nichts." : "Noch kein Vorgang eingereicht."}</Meldung>;
          }
          return (
            <ul className="vorgaenge">
              {sichtbar.map((vorgang) => (
                <Zeile key={vorgang.id} vorgang={vorgang} />
              ))}
            </ul>
          );
        }}
      </AsyncBoundary>
    </>
  );
}
