/**
 * Zwei Dinge, die mehrere Werkzeuge über Ordner einer App wissen müssen, an einer Stelle.
 *
 * `safeFolder` nimmt einen Ordner aus dem Manifest nur, wenn er im Paket bleibt: nicht absolut und
 * ohne `..`. `walkFiles` geht einen Ordner rekursiv durch, in fester Reihenfolge, und lässt aus, was
 * der Aufrufer nicht lesen will: versteckte Einträge, Ordner wie `node_modules`, zu große Dateien.
 *
 * Reine Funktionen über das Dateisystem, ohne Netz.
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** Führt ein Ordner aus dem Manifest aus dem Paket hinaus, absolut oder über `..`? */
export function leavesPackage(folder) {
  const value = String(folder);
  return value.startsWith("/") || value.split("/").includes("..");
}

/**
 * Der Ordner, den das Manifest unter `key` nennt (`"frontend.verzeichnis"`, `"backend.bauen.verzeichnis"`),
 * als Pfad unter `dir`. `null`, wenn das Manifest keinen nennt oder er aus dem Paket hinausführt.
 */
export function safeFolder(dir, manifest, key) {
  const folder = key.split(".").reduce((value, part) => value?.[part], manifest);
  if (typeof folder !== "string" || !folder || leavesPackage(folder)) return null;
  return join(dir, folder);
}

/**
 * Jede Datei unter `dir`, rekursiv und nach Namen sortiert, als ganzer Pfad.
 *
 * - `match`: ein Muster oder eine Funktion auf den Dateinamen; ohne gilt jede Datei.
 * - `skip`: Namen von Ordnern, die nicht betreten werden (`node_modules`, `marken`).
 * - `skipDir`: eine Funktion auf den ganzen Pfad eines Ordners, für mehr als einen Namen.
 * - `dots`: auch versteckte Einträge (`.git`, `.env`); ohne bleiben sie draußen.
 * - `maxBytes`: größere Dateien bleiben draußen, gebauter Inhalt oder Daten.
 * - `limit`: höchstens so viele Dateien.
 *
 * Fehlt `dir` oder ist es kein Ordner, kommt eine leere Liste.
 */
export function walkFiles(dir, { match = null, skip = [], skipDir = null, dots = false, maxBytes = Infinity, limit = Infinity } = {}) {
  const out = [];
  const passt = typeof match === "function" ? match : match ? (name) => match.test(name) : () => true;
  const skipped = new Set(skip);
  const walk = (path) => {
    for (const entry of readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (out.length >= limit) return;
      if (!dots && entry.name.startsWith(".")) continue;
      const full = join(path, entry.name);
      if (entry.isDirectory()) {
        if (!skipped.has(entry.name) && !(skipDir && skipDir(full))) walk(full);
        continue;
      }
      if (!entry.isFile() || !passt(entry.name)) continue;
      if (Number.isFinite(maxBytes) && statSync(full).size > maxBytes) continue;
      out.push(full);
    }
  };
  if (dir && existsSync(dir) && statSync(dir).isDirectory()) walk(dir);
  return out;
}
