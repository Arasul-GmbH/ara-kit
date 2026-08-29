/**
 * Die Oberfläche von {{name}}.
 *
 * Sie ruft ihre eigene Schnittstelle **relativ** auf (`api/...`, ohne
 * führenden Schrägstrich). Ein absoluter Pfad zeigte im Teststand auf den
 * Livestand, und das sähe man der Seite nicht an.
 *
 * Wer angemeldet ist, sagt die Plattform, nicht diese Datei: das Backend liest
 * es aus den Kopfzeilen, die vor dem Container gesetzt werden, und gibt es
 * unter `api/lage` zurück. Ein Feld dafür wäre ein Feld, in das jemand einen
 * anderen Namen schreiben kann.
 *
 * Solange ein Vorgang auf eine Entscheidung wartet, fragt die Seite alle paar
 * Sekunden nach. Entschieden wird nicht hier, sondern in Arasul, von einem
 * Menschen, dem die App freigegeben ist. Läuft die App auf einem Gerät ohne
 * Arasul, entscheidet niemand, und die Seite sagt das, statt etwas zu erfinden.
 *
 * Gebaut ist die Seite aus den sechs Bausteinen in `bausteine.jsx`. Sie
 * enthält keine eigene Gestaltung: was hier steht, ist der Ablauf.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Feld, Formular, Karte, Kopf, Liste, Marke, Meldung, Menue, Zeile } from "./bausteine.jsx";

const MARKE = {
  wartet: { ton: "wartet", text: "wartet auf Entscheidung" },
  genehmigt: { ton: "ja", text: "genehmigt" },
  abgelehnt: { ton: "nein", text: "abgelehnt" },
  abgelaufen: { ton: "nein", text: "ohne Entscheidung abgelaufen" },
  "ohne entscheidung": { ton: "", text: "niemand entscheidet" },
  // Der Rahmen steht, der Lauf kam trotzdem nicht zustande. Das ist etwas
  // anderes als „kein Arasul da", und der Vorgang sagt daneben, was passiert ist.
  "ohne lauf": { ton: "nein", text: "kein Lauf gestartet" },
};

const ANSICHTEN = [
  { id: "alle", text: "Alle" },
  { id: "offen", text: "Offen" },
  { id: "entschieden", text: "Entschieden" },
];

async function hole(pfad, optionen) {
  const antwort = await fetch(pfad, {
    headers: { "content-type": "application/json" },
    ...optionen,
  });
  const daten = await antwort.json().catch(() => null);
  if (!antwort.ok) throw new Error(daten?.fehler || `Die Schnittstelle antwortet mit ${antwort.status}.`);
  return daten;
}

function zeitpunkt(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

export function App() {
  const [lage, setLage] = useState(null);
  const [vorgaenge, setVorgaenge] = useState([]);
  const [ansicht, setAnsicht] = useState("alle");
  const [titel, setTitel] = useState("");
  const [text, setText] = useState("");
  const [fehler, setFehler] = useState(null);
  const [laeuft, setLaeuft] = useState(false);
  const wartet = useRef(false);

  const laden = useCallback(async () => {
    try {
      const [zustand, liste] = await Promise.all([hole("api/lage"), hole("api/vorgaenge")]);
      setLage(zustand);
      setVorgaenge(liste.vorgaenge || []);
      wartet.current = (liste.vorgaenge || []).some((v) => v.status === "wartet");
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

  async function einreichen(ereignis) {
    ereignis.preventDefault();
    if (!titel.trim()) return;
    setLaeuft(true);
    try {
      await hole("api/vorgaenge", { method: "POST", body: JSON.stringify({ titel, text }) });
      setTitel("");
      setText("");
      await laden();
    } catch (error) {
      setFehler(error.message);
    } finally {
      setLaeuft(false);
    }
  }

  const offen = vorgaenge.filter((v) => v.status === "wartet");
  const sichtbar =
    ansicht === "offen" ? offen : ansicht === "entschieden" ? vorgaenge.filter((v) => v.status !== "wartet") : vorgaenge;

  return (
    <div className="seite">
      <Kopf
        titel={lage?.app || "{{name}}"}
        nebenzeile={lage?.nutzer ? `${lage.nutzer} (${lage.rolle})` : "niemand angemeldet"}
      />

      {lage && !lage.arasul && (
        <Meldung>
          {/* Warum kein Flow anhält, sagt die App selbst und nicht diese Seite:
              „ohne Arasul" und „das Gerät hat den Wert nicht gesetzt" sehen
              gleich aus und sind es nicht. */}
          {lage.hinweis || "Diese App erreicht kein Arasul."} Ein Vorgang wird angenommen, aber
          niemand entscheidet darüber.
        </Meldung>
      )}

      {fehler && <Meldung art="fehler">{fehler}</Meldung>}

      <Formular titel="Neuer Vorgang" aktion="Einreichen" laeuft={laeuft} onAbschicken={einreichen}>
        <Feld beschriftung="Worum es geht">
          <input value={titel} onChange={(e) => setTitel(e.target.value)} required maxLength={200} />
        </Feld>
        <Feld beschriftung="Was dazu zu sagen ist, wenn du magst">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="ohne Angabe" />
        </Feld>
      </Formular>

      <Karte titel="Vorgänge">
        <Menue
          punkte={ANSICHTEN.map((p) => ({ ...p, zahl: p.id === "offen" ? offen.length : undefined }))}
          gewaehlt={ansicht}
          onWahl={setAnsicht}
        />
        <Liste
          eintraege={sichtbar}
          leer={vorgaenge.length ? "In dieser Ansicht liegt nichts." : "Noch kein Vorgang eingereicht."}
          zeile={(v) => {
            const marke = MARKE[v.status] || { ton: "", text: v.status };
            return (
              <Zeile key={v.id} id={v.id} marke={<Marke ton={marke.ton}>{marke.text}</Marke>}>
                <div>{v.titel}</div>
                <div className="leise">
                  {v.von}, {zeitpunkt(v.gestellt)}
                  {v.text && v.text !== "ohne Angabe" ? `, ${v.text}` : ""}
                </div>
                {v.entschieden_von && (
                  <div className="leise">
                    entschieden von {v.entschieden_von}
                    {v.begruendung ? `: ${v.begruendung}` : ""}
                  </div>
                )}
                {v.bemerkung && <div className="leise">{v.bemerkung}</div>}
                {v.hinweis && <div className="leise">{v.hinweis}</div>}
              </Zeile>
            );
          }}
        />
      </Karte>

      <p className="leise">
        Entschieden wird in Arasul, unter den offenen Freigaben. Jeder, dem diese App
        freigegeben ist, darf das, und eine Ablehnung braucht eine Begründung.
      </p>
    </div>
  );
}
