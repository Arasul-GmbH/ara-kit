/**
 * Die Oberfläche von {{name}}.
 *
 * Sie ruft ihre eigene Schnittstelle **relativ** auf (`api/...`, ohne
 * führenden Schrägstrich). Ein absoluter Pfad zeigte im Teststand auf den
 * Livestand, und das sähe man der Seite nicht an.
 *
 * Wer angemeldet ist, sagt die Plattform, nicht diese Datei: das Backend liest
 * es aus den Kopfzeilen, die vor dem Container gesetzt werden, und gibt es
 * unter `api/lage` zurück. Läuft die App auf einem Gerät ohne Arasul, steht
 * dort niemand, und die Seite sagt das, statt einen Namen zu erfinden.
 */

import { useEffect, useState } from "react";

async function hole(pfad, optionen) {
  const antwort = await fetch(pfad, {
    headers: { "content-type": "application/json" },
    ...optionen,
  });
  if (!antwort.ok) throw new Error(`Die Schnittstelle antwortet mit ${antwort.status}.`);
  return antwort.json();
}

export function App() {
  const [lage, setLage] = useState(null);
  const [eintraege, setEintraege] = useState([]);
  const [text, setText] = useState("");
  const [fehler, setFehler] = useState(null);
  const [laeuft, setLaeuft] = useState(false);

  async function laden() {
    try {
      const [zustand, liste] = await Promise.all([hole("api/lage"), hole("api/eintraege")]);
      setLage(zustand);
      setEintraege(liste.eintraege || []);
      setFehler(null);
    } catch (error) {
      setFehler(error.message);
    }
  }

  useEffect(() => {
    laden();
  }, []);

  async function senden(ereignis) {
    ereignis.preventDefault();
    if (!text.trim()) return;
    setLaeuft(true);
    try {
      await hole("api/eintraege", { method: "POST", body: JSON.stringify({ text }) });
      setText("");
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
        <h1>{lage?.app || "{{name}}"}</h1>
        <span className="leise">
          {lage?.nutzer ? `${lage.nutzer} (${lage.rolle})` : "niemand angemeldet"}
        </span>
      </header>

      {lage && !lage.arasul && (
        <p className="hinweis">
          Diese App läuft auf einem Gerät ohne Arasul. Es gibt keine Anmeldung, keine Flows und
          keine Freigaben. Was hier zu sehen ist, sieht jeder, der die Adresse kennt.
        </p>
      )}

      {fehler && <p className="hinweis">{fehler}</p>}

      <form className="karte" onSubmit={senden}>
        <h2>Neuer Eintrag</h2>
        <label className="feld">
          <span>Text</span>
          <input value={text} onChange={(e) => setText(e.target.value)} required />
        </label>
        <button type="submit" disabled={laeuft}>
          {laeuft ? "Wird gespeichert ..." : "Speichern"}
        </button>
      </form>

      <section className="karte">
        <h2>Einträge</h2>
        {eintraege.length === 0 ? (
          <p className="leer">Noch nichts da.</p>
        ) : (
          <ul className="liste">
            {eintraege.map((eintrag) => (
              <li key={eintrag.id}>
                <span>{eintrag.text}</span>
                <span className="marke">{eintrag.von || "unbekannt"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
