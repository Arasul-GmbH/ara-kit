/**
 * Die Oberfläche des Urlaubsantrags.
 *
 * Sie ruft ihre Schnittstelle **relativ** auf (`api/...`, ohne führenden
 * Schrägstrich). Ein absoluter Pfad zeigte im Teststand auf den Livestand, und
 * das sähe man der Seite nicht an.
 *
 * Sie fragt nicht, wer den Antrag stellt: das sagt die Plattform, und das
 * Backend liest es aus den Kopfzeilen vor dem Container. Ein Feld dafür wäre
 * ein Feld, in das jemand einen anderen Namen schreiben kann.
 *
 * Solange ein Antrag auf eine Entscheidung wartet, fragt die Seite alle paar
 * Sekunden nach. Entschieden wird nicht hier, sondern in Arasul, von einem
 * Menschen, dem die App freigegeben ist.
 */

import { useCallback, useEffect, useRef, useState } from "react";

const MARKE = {
  wartet: { klasse: "wartet", text: "wartet auf Entscheidung" },
  genehmigt: { klasse: "ja", text: "genehmigt" },
  abgelehnt: { klasse: "nein", text: "abgelehnt" },
  abgelaufen: { klasse: "nein", text: "ohne Entscheidung abgelaufen" },
};

async function hole(pfad, optionen) {
  const antwort = await fetch(pfad, {
    headers: { "content-type": "application/json" },
    ...optionen,
  });
  const daten = await antwort.json().catch(() => null);
  if (!antwort.ok) throw new Error(daten?.fehler || `Die Schnittstelle antwortet mit ${antwort.status}.`);
  return daten;
}

function datum(text) {
  if (!text) return "";
  const [jahr, monat, tag] = text.split("-");
  return tag ? `${tag}.${monat}.${jahr}` : text;
}

export function App() {
  const [lage, setLage] = useState(null);
  const [antraege, setAntraege] = useState([]);
  const [von, setVon] = useState("");
  const [bis, setBis] = useState("");
  const [grund, setGrund] = useState("");
  const [fehler, setFehler] = useState(null);
  const [laeuft, setLaeuft] = useState(false);
  const wartet = useRef(false);

  const laden = useCallback(async () => {
    try {
      const [zustand, liste] = await Promise.all([hole("api/lage"), hole("api/antraege")]);
      setLage(zustand);
      setAntraege(liste.antraege || []);
      wartet.current = (liste.antraege || []).some((antrag) => antrag.status === "wartet");
      setFehler(null);
    } catch (error) {
      setFehler(error.message);
    }
  }, []);

  useEffect(() => {
    laden();
    // Nachfragen nur, solange wirklich etwas offen ist. Eine Seite, die im
    // Leerlauf im Sekundentakt fragt, hält das Gerät ohne Grund wach.
    const takt = setInterval(() => {
      if (wartet.current) laden();
    }, 5000);
    return () => clearInterval(takt);
  }, [laden]);

  async function stellen(ereignis) {
    ereignis.preventDefault();
    setLaeuft(true);
    try {
      await hole("api/antraege", { method: "POST", body: JSON.stringify({ von, bis, grund }) });
      setVon("");
      setBis("");
      setGrund("");
      await laden();
    } catch (error) {
      setFehler(error.message);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div className="seite">
      <header className="kopf">
        <h1>{lage?.app || "Urlaubsantrag"}</h1>
        <span className="leise">
          {lage?.nutzer ? `${lage.nutzer} (${lage.rolle})` : "niemand angemeldet"}
        </span>
      </header>

      {lage && !lage.arasul && (
        <p className="hinweis">
          Diese App läuft auf einem Gerät ohne Arasul. Es gibt keine Anmeldung, keinen Flow und
          keine Freigabe: ein Antrag wird angenommen, aber niemand entscheidet darüber.
        </p>
      )}

      {fehler && <p className="hinweis">{fehler}</p>}

      <form className="karte" onSubmit={stellen}>
        <h2>Urlaub beantragen</h2>
        <label className="feld">
          <span>Erster Tag</span>
          <input type="date" value={von} onChange={(e) => setVon(e.target.value)} required />
        </label>
        <label className="feld">
          <span>Letzter Tag</span>
          <input type="date" value={bis} onChange={(e) => setBis(e.target.value)} required />
        </label>
        <label className="feld">
          <span>Grund, wenn du magst</span>
          <input value={grund} onChange={(e) => setGrund(e.target.value)} placeholder="ohne Angabe" />
        </label>
        <button type="submit" disabled={laeuft}>
          {laeuft ? "Wird gestellt ..." : "Antrag stellen"}
        </button>
      </form>

      <section className="karte">
        <h2>Anträge</h2>
        {antraege.length === 0 ? (
          <p className="leer">Noch kein Antrag gestellt.</p>
        ) : (
          <ul className="liste">
            {antraege.map((antrag) => {
              const marke = MARKE[antrag.status] || { klasse: "", text: antrag.status };
              return (
                <li key={antrag.id}>
                  <div>
                    <div>
                      {datum(antrag.von)} bis {datum(antrag.bis)}, {antrag.tage}{" "}
                      {antrag.tage === 1 ? "Arbeitstag" : "Arbeitstage"}
                    </div>
                    <div className="leise">
                      {antrag.antragsteller}
                      {antrag.grund && antrag.grund !== "ohne Angabe" ? `, ${antrag.grund}` : ""}
                    </div>
                    {antrag.entschieden_von && (
                      <div className="leise">
                        entschieden von {antrag.entschieden_von}
                        {antrag.begruendung ? `: ${antrag.begruendung}` : ""}
                      </div>
                    )}
                    {antrag.bemerkung && <div className="leise">{antrag.bemerkung}</div>}
                    {antrag.hinweis && <div className="leise">{antrag.hinweis}</div>}
                  </div>
                  <span className={`marke ${marke.klasse}`}>{marke.text}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="leise">
        Entschieden wird in Arasul, unter den offenen Freigaben. Jeder, dem diese App
        freigegeben ist, darf das, und eine Ablehnung braucht eine Begründung.
      </p>
    </div>
  );
}
