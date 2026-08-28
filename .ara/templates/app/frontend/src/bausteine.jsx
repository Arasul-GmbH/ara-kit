/**
 * Die sechs Bausteine, aus denen die Oberfläche einer App besteht.
 *
 * Kopf, Liste, Karte, Formular, Meldung, Menü: das sind die Namen des
 * Arasul-Designsystems, und eine App setzt sich aus genau diesen zusammen.
 * Wer etwas dazubaut, nimmt einen Baustein von hier und schreibt keine zweite
 * Karte neben die erste. Die Regeln dazu stehen in `stil.css`, die Werte in
 * `design.css`; hier steht nur Struktur.
 *
 * Diese Datei ist der Anschluss für die Bausteine aus dem Produkt: sobald sie
 * aus dem Spiegel beiliegen, ersetzen sie diese Fassung, und die App darüber
 * bleibt, wie sie ist, weil sie nur die Namen benutzt.
 */

/** Der Kopf: Titel links, wer angemeldet ist rechts. */
export function Kopf({ titel, nebenzeile, children }) {
  return (
    <header className="kopf">
      <div>
        <h1>{titel}</h1>
        {nebenzeile && <span className="leise">{nebenzeile}</span>}
      </div>
      {children}
    </header>
  );
}

/** Das Menü: eine Zeile mit Wahlmöglichkeiten, eine davon ist gewählt. */
export function Menue({ punkte, gewaehlt, onWahl }) {
  return (
    <nav className="menue" aria-label="Ansicht">
      {punkte.map((punkt) => (
        <button
          key={punkt.id}
          type="button"
          className={punkt.id === gewaehlt ? "gewaehlt" : ""}
          aria-current={punkt.id === gewaehlt ? "page" : undefined}
          onClick={() => onWahl(punkt.id)}
        >
          {punkt.text}
          {punkt.zahl != null && <span className="zahl">{punkt.zahl}</span>}
        </button>
      ))}
    </nav>
  );
}

/** Die Karte: eine Fläche mit Rand und einer Überschrift. */
export function Karte({ titel, children }) {
  return (
    <section className="karte">
      {titel && <h2>{titel}</h2>}
      {children}
    </section>
  );
}

/** Ein Feld im Formular: Beschriftung oben, Eingabe darunter. */
export function Feld({ beschriftung, children }) {
  return (
    <label className="feld">
      <span>{beschriftung}</span>
      {children}
    </label>
  );
}

/** Das Formular: Felder, eine Hauptaktion, und die Karte drumherum. */
export function Formular({ titel, aktion, laeuft, onAbschicken, children }) {
  return (
    <form className="karte" onSubmit={onAbschicken}>
      {titel && <h2>{titel}</h2>}
      {children}
      <button type="submit" disabled={laeuft}>
        {laeuft ? "Einen Moment ..." : aktion}
      </button>
    </form>
  );
}

/** Die Meldung: ein Satz, der auffällt. `art` ist hinweis, fehler oder erfolg. */
export function Meldung({ art = "hinweis", children }) {
  return (
    <p className={`meldung ${art}`} role={art === "fehler" ? "alert" : "status"}>
      {children}
    </p>
  );
}

/** Die Marke am Ende einer Zeile: ein Zustand in einem Wort. */
export function Marke({ ton = "", children }) {
  return <span className={`marke ${ton}`}>{children}</span>;
}

/** Die Liste: Zeilen, getrennt durch Linien. `leer` steht da, wenn nichts drin ist. */
export function Liste({ eintraege, leer, zeile }) {
  if (!eintraege.length) return <p className="leer">{leer}</p>;
  return <ul className="liste">{eintraege.map((eintrag) => zeile(eintrag))}</ul>;
}

/** Eine Zeile der Liste: Inhalt links, Marke rechts. */
export function Zeile({ id, marke, children }) {
  return (
    <li key={id}>
      <div>{children}</div>
      {marke}
    </li>
  );
}
