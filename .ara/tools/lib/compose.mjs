/**
 * Eine App auf einem Gerät **ohne** Arasul: zwei Container, von Hand gestellt.
 *
 * Das ist der zweite Weg der Phase E5 und ausdrücklich der kleinere. Auf einem
 * Gerät mit Arasul geht ein Paket über die Schnittstelle, das Gerät baut, prüft,
 * hält einen Teststand und einen Livestand. Ohne Arasul gibt es nichts davon:
 * ein Webserver liefert die Oberfläche aus, ein Container trägt das Backend, und
 * alles, was die Plattform sonst dazutut, fehlt.
 *
 * **Was fehlt, wird gesagt und nicht nachgebaut.** Eine Anmeldung, die das Kit
 * hier selbst bastelte, wäre eine, die niemand geprüft hat, und sie stünde
 * neben der echten, sobald das Gerät Arasul bekommt. Deshalb erzeugt dieses
 * Modul zwei Dateien und einen Absatz Klartext, und sonst nichts.
 *
 * Reine Funktionen: kein Netz, keine Dateien.
 */

/** Der Webserver, der die fertige Oberfläche ausliefert und das Backend davorhängt. */
const WEB_IMAGE = "nginx:alpine";

/** Wo die Dateien am Gerät landen. Unter dem Anmeldenamen, nicht im System. */
export const REMOTE_BASE = '"$HOME/apps"';

/**
 * Was auf diesem Weg fehlt, in Sätzen.
 *
 * Sie gehen an den Menschen, der die App gleich benutzt, und sie stehen auch im
 * Kopf der erzeugten Compose-Datei: wer sie in einem halben Jahr am Gerät
 * findet, soll ohne Rückfrage wissen, was er da vor sich hat.
 */
export const WAS_FEHLT = Object.freeze([
  "Anmeldung: es gibt keine. Wer die Adresse und den Port erreicht, sieht die App. Die Kopfzeilen mit Benutzer und Rolle setzt sonst die Plattform, hier setzt sie niemand.",
  "Flows: es läuft kein Sprachmodell und keine Flow-Maschine. Was die App an Flows mitbringt, liegt im Paket und tut nichts.",
  "Freigaben: ohne Flow hält kein Lauf an, und es gibt keine Stelle, an der ein Mensch entscheidet.",
  "Teststand und Livestand: es gibt einen Stand. Ein Rückweg auf die vorige Fassung ist das erneute Aufsetzen der vorigen Fassung.",
  "Schlüssel und Schnittstelle: das Gerät gibt der App keinen Schlüssel, also erreicht sie auch keine Schnittstelle von Arasul.",
]);

/** Ein Wert für die Compose-Datei, immer in Anführungszeichen. */
function quote(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Die Compose-Datei zu einem Manifest.
 *
 * Gelesen werden nur Felder, die das Manifest selbst führt. Fehlt eines, fällt
 * der Teil weg, der davon abhängt: eine App ohne Backend bekommt keinen zweiten
 * Container, eine ohne Frontend keinen Webserver.
 */
export function composeFile(manifest, { port = 8080 } = {}) {
  const id = manifest.id;
  const backend = manifest.backend;
  const frontend = manifest.frontend;
  const backendPort = manifest.ports?.backend;
  const lines = [
    `# ${manifest.name ?? id} auf einem Gerät ohne Arasul.`,
    "# Erzeugt vom Ara-Kit, nicht von Hand geschrieben. Beim nächsten Aufsetzen",
    "# wird die Datei ersetzt.",
    "#",
    "# Was auf diesem Weg fehlt:",
    ...WAS_FEHLT.map((satz) => `#   ${satz}`),
    "",
    "services:",
  ];

  if (backend) {
    const context = backend.bauen?.verzeichnis;
    lines.push(
      "  backend:",
      ...(context
        ? [
            "    build:",
            `      context: ./${context}`,
            `      dockerfile: ${backend.bauen?.dockerfile || "Dockerfile"}`,
          ]
        : []),
      `    image: ${quote(backend.image)}`,
      "    restart: unless-stopped",
      "    environment:",
      // Der Port steht im Manifest und muss auch im Container gelten, sonst
      // hört das Backend woanders, als der Webserver anklopft.
      ...(backendPort ? [`      PORT: ${quote(backendPort)}`] : []),
      ...Object.entries(backend.umgebung || {}).map(([key, value]) => `      ${key}: ${quote(value)}`),
      // Ohne Oberfläche gibt es nichts auszuliefern: dann hängt das Backend
      // selbst am Port des Geräts, sonst hört es nur im Netz der Container.
      ...(backendPort
        ? frontend
          ? ["    expose:", `      - ${quote(backendPort)}`]
          : ["    ports:", `      - ${quote(`${port}:${backendPort}`)}`]
        : [])
    );
  }

  if (frontend) {
    lines.push(
      "  web:",
      `    image: ${WEB_IMAGE}`,
      "    restart: unless-stopped",
      "    ports:",
      `      - ${quote(`${port}:80`)}`,
      "    volumes:",
      `      - ./${frontend.verzeichnis || "frontend"}:/usr/share/nginx/html:ro`,
      "      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro",
      ...(backend ? ["    depends_on:", "      - backend"] : [])
    );
  }

  return lines.join("\n") + "\n";
}

/**
 * Die Konfiguration des Webservers.
 *
 * Sie bildet das nach, was auf einem Gerät mit Arasul der Router tut: die
 * Oberfläche unter `/`, die Schnittstelle der App unter `/api/`, und das
 * Präfix wird abgeschnitten, bevor das Backend die Anfrage sieht. Deshalb kann
 * dieselbe App hier und dort laufen, ohne zu wissen, wo sie hängt.
 */
export function nginxConf(manifest) {
  const backendPort = manifest.ports?.backend;
  const proxy = manifest.backend && backendPort;
  return [
    "# Erzeugt vom Ara-Kit. Auf einem Gerät ohne Arasul übernimmt dieser",
    "# Webserver, was sonst der Router der Plattform tut: Oberfläche unter /,",
    "# Schnittstelle unter /api/, das Präfix abgeschnitten. Eine Anmeldung",
    "# davor gibt es nicht, das ist der Unterschied.",
    "server {",
    "  listen 80;",
    "  server_name _;",
    "  root /usr/share/nginx/html;",
    "  index index.html;",
    "",
    "  location / {",
    "    try_files $uri $uri/ /index.html;",
    "  }",
    ...(proxy
      ? [
          "",
          "  location /api/ {",
          `    proxy_pass http://backend:${backendPort}/;`,
          "    proxy_set_header Host $host;",
          "    proxy_http_version 1.1;",
          "  }",
        ]
      : []),
    "}",
    "",
  ].join("\n");
}
