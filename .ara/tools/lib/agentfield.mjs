/**
 * Das Feld `agent` einer App, geprueft: Form, und dass jede genannte Route im Backend steht.
 *
 * Eine App beschreibt sich fuer Agenten in `app.json`, Feld `agent`, und liefert es selbst unter
 * der lesenden Route `agent` ihrer Schnittstelle aus. Das CLI in der Wurzel, `arasul.mjs`, ruft
 * nur auf, was dort steht. Diese Pruefung haelt die App gegen beides, bevor sie an ein Geraet
 * geht: eine Route im Feld, die es im Backend nicht gibt, waere ein Versprechen, das der Agent
 * beim ersten Aufruf bricht.
 *
 * **Die Form liest dieselbe Funktion wie das CLI.** Sie liegt in der Vorlage der Wurzel, und
 * dieses Modul importiert sie von dort: was die Pruefung wohlgeformt nennt, nimmt das CLI an.
 * Zwei Fassungen liefen auseinander.
 *
 * Dass eine Route im Backend steht, ist eine Suche im Quelltext und kein Aufruf: der Pfad muss
 * als Zeichenkette vorkommen, bei einer aendernden Methode auch deren Name in derselben Datei.
 * Ein Backend, das seine Wege anders zusammensetzt, besteht diese Suche nicht und sagt es dann.
 * Reine Funktionen bis auf das Lesen des Backend-Ordners.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { language, t } from "./i18n.mjs";
import { readAgent, relativePath, speak } from "../../templates/root/arasul.mjs";

const SOURCE = /\.(mjs|cjs|js|ts|py|go|rb|php)$/;
const MAX_FILES = 400;

/** Der Quelltext des Backends: Dateien mit Endung, ohne Abhaengigkeiten, mit einer Grenze. */
function backendSources(folder) {
  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (found.length >= MAX_FILES || entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (SOURCE.test(entry.name) && statSync(path).size < 1_000_000) found.push({ path, text: readFileSync(path, "utf8") });
    }
  };
  walk(folder);
  return found;
}

const escaped = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Kommt der Pfad als Zeichenkette vor, mit oder ohne fuehrenden Schraegstrich? */
function hasPath(sources, path, method) {
  const literal = new RegExp(`["'\`]/?${escaped(path)}["'\`]`);
  return sources.some(({ text }) => literal.test(text) && (method === "GET" || new RegExp(`["'\`]${method}["'\`]`).test(text)));
}

/**
 * Alles, was am Feld `agent` dieses Pakets oder dieser App nicht stimmt.
 *
 * Fehlt das Feld, gibt es nichts zu pruefen: die App beschreibt sich dann nicht, und das CLI
 * ruft auf ihr nichts auf. Zurueck kommt eine Liste von Saetzen, leer heisst in Ordnung.
 */
export function agentFindings(dir, manifest) {
  if (!manifest || manifest.agent === undefined) return [];
  speak(language());
  const { routes, problems } = readAgent(manifest.agent);
  const findings = problems.map((problem) => `agent: ${problem}`);

  const folder = manifest.backend?.bauen?.verzeichnis;
  if (!folder || folder.startsWith("/") || folder.split("/").includes("..") || !existsSync(join(dir, folder))) {
    findings.push(t(
      "agent names routes, but the manifest has no backend folder to build (backend.bauen.verzeichnis) that could answer them.",
      "agent nennt Routen, aber das Manifest hat keinen Backend-Ordner zum Bauen (backend.bauen.verzeichnis), der sie beantworten könnte."
    ));
    return findings;
  }
  const sources = backendSources(join(dir, folder));
  if (!hasPath(sources, "agent", "GET")) {
    findings.push(t(
      "The backend has no route agent. The app answers GET agent with this field, id, name and version, so that agents find out what it can do.",
      "Das Backend hat keine Route agent. Die App beantwortet GET agent mit diesem Feld samt Kennung, Name und Version, damit Agenten erfahren, was sie kann."
    ));
  }
  for (const route of routes) {
    if (relativePath(route.path) === "agent" && route.method === "GET") continue;
    if (!hasPath(sources, route.path, route.method)) {
      findings.push(t(
        `agent names ${route.method} ${route.path}, and the backend does not have it: the path does not occur as a string${route.method === "GET" ? "" : `, or ${route.method} is not named next to it`} in the source of ${folder}/.`,
        `agent nennt ${route.method} ${route.path}, und das Backend hat sie nicht: der Pfad kommt nicht als Zeichenkette vor${route.method === "GET" ? "" : `, oder ${route.method} steht nicht daneben`} im Quelltext von ${folder}/.`
      ));
    }
  }

  // Eine App, die aus dem Bau kommt, traegt ihr Manifest neben dem Backend. Der Ordner einer App
  // (mit `plans/`) ist noch kein Paket und braucht es nicht.
  const dockerfile = join(dir, folder, "Dockerfile");
  if (existsSync(dockerfile) && /app\.json/.test(readFileSync(dockerfile, "utf8")) && !existsSync(join(dir, "plans")) && !existsSync(join(dir, folder, "app.json"))) {
    findings.push(t(
      `The Dockerfile of ${folder}/ copies app.json, and it does not lie there. The build puts it next to the backend: node .ara/tools/app.mjs --app <name> --build`,
      `Das Dockerfile von ${folder}/ kopiert app.json, und sie liegt dort nicht. Der Bau legt sie neben das Backend: node .ara/tools/app.mjs --app <name> --build`
    ));
  }
  return findings;
}
