#!/usr/bin/env node
/**
 * Windows proof: the CLI of the root, run once for real on Windows (K26).
 *
 *   node .github/scripts/windows-proof.mjs
 *
 * The self-test lets a Mac or Linux act as Windows with stand-ins for icacls and schtasks. This
 * proves that what the stand-ins assume holds on a real Windows: the real schtasks takes the task
 * file, the real icacls leaves a list with only the one user, paths and line endings work. Only
 * the device is a stand-in, a small server in this file. It is started by the workflow
 * `.github/workflows/windows-proof.yml`, by hand only. It writes nothing outside a temporary
 * folder, except the one scheduled task, which it takes back.
 *
 * Without Windows it ends with a message and exit code 0, unless --force is given.
 *
 * === deutsch ===
 *
 * Windows-Beleg: das CLI der Wurzel, einmal echt unter Windows (K26).
 *
 * Der Selbsttest lässt einen Mac oder Linux mit Attrappen für icacls und schtasks als Windows
 * auftreten. Dieses Skript belegt, dass hält, was die Attrappen annehmen: das echte schtasks nimmt
 * die Aufgabendatei, das echte icacls lässt eine Liste mit nur dem einen Benutzer, Pfade und
 * Zeilenenden gehen. Nur das Gerät ist nachgestellt, ein kleiner Server in dieser Datei.
 */

import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const KIT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PASSWORT = "geheim-passwort-42";
const AUSWEIS = "ausweis_0123456789abcdef0123456789abcdef";
const APP_TOKEN = "apptoken_probe_0123456789";
const b64 = (wert) => Buffer.from(JSON.stringify(wert)).toString("base64url");
const SITZUNG = `${b64({ alg: "none" })}.${b64({ sub: "anna", exp: Math.floor(Date.now() / 1000) + 3600 })}.unterschrift`;

if (process.platform !== "win32" && !process.argv.includes("--force")) {
  console.log("Kein Windows: nichts zu belegen. Mit --force läuft es trotzdem, aber ohne schtasks und icacls ist es sinnlos.");
  process.exit(0);
}

let schritte = 0;
const schritt = (text) => console.log(`[${++schritte}] ${text}`);
function fehler(text) {
  console.error(`ROT: ${text}`);
  process.exitCode = 1;
  throw new Error(text);
}
const pruefe = (bedingung, text) => bedingung || fehler(text);

// Das nachgestellte Gerät: Anmeldung, Ausweis, Firmenordner und gerade so viel Dateidienst, wie sync --install prüft.
let widerrufen = false;
const server = createServer((anfrage, antwort) => {
  const teile = [];
  anfrage.on("data", (stueck) => teile.push(stueck));
  anfrage.on("end", () => {
    const rumpf = Buffer.concat(teile).toString("utf8");
    const pfad = anfrage.url.split("?")[0];
    const auth = anfrage.headers.authorization || "";
    const senden = (status, inhalt) => {
      antwort.writeHead(status, { "Content-Type": "application/json" });
      antwort.end(JSON.stringify(inhalt));
    };
    const basic = (token) => auth === `Basic ${Buffer.from(`anna:${token}`).toString("base64")}`;
    if (pfad === "/api/auth/login") {
      const eingabe = JSON.parse(rumpf || "{}");
      return eingabe.username === "anna" && eingabe.password === PASSWORT
        ? senden(200, { token: SITZUNG, user: { id: 7, username: "anna", role: "mitarbeiter" } })
        : senden(401, { error: { message: "Anmeldung abgewiesen" } });
    }
    if (pfad.startsWith("/graph/") || pfad.startsWith("/auth-app/")) {
      if (!basic(PASSWORT) && !basic(APP_TOKEN)) {
        antwort.writeHead(401);
        return antwort.end();
      }
      if (pfad === "/auth-app/tokens" && anfrage.method === "POST") return senden(200, { token: APP_TOKEN, expiration_date: "2027-09-27T08:47:05Z", created_date: "2026-09-27T08:47:05Z", label: "" });
      if (pfad === "/auth-app/tokens") {
        antwort.writeHead(200);
        return antwort.end();
      }
      if (pfad === "/graph/v1.0/me/drives") {
        const raum = (id, name, driveType) => ({ id: `sp$${id}`, name, driveType, root: { webDavUrl: `${adresse}/dav/spaces/sp%24${id}` } });
        return senden(200, { value: [raum("persoenlich-anna", "anna", "personal"), raum("buchhaltung", "buchhaltung", "project")] });
      }
    }
    const sitzung = auth === `Bearer ${SITZUNG}`;
    const gueltig = sitzung || (!widerrufen && auth === `Bearer ${AUSWEIS}`);
    if (pfad === "/api/auth/session") return senden(200, gueltig ? { authenticated: true, user: { username: "anna" } } : { authenticated: false, user: null });
    if (!gueltig) return senden(401, { error: { message: "Kein gültiger Ausweis" } });
    if (pfad === "/api/ausweise" && anfrage.method === "POST") return senden(201, { data: { id: 1, name: JSON.parse(rumpf || "{}").name, praefix: AUSWEIS.slice(0, 14), ausweis: AUSWEIS } });
    if (pfad === "/api/ausweise/1" && anfrage.method === "DELETE") {
      widerrufen = true;
      antwort.writeHead(204);
      return antwort.end();
    }
    if (pfad === "/api/auth/logout") return senden(200, { success: true });
    if (pfad === "/api/auth/me") return senden(200, { user: { id: 7, username: "anna", role: "mitarbeiter" } });
    if (pfad === "/api/firmenordner") {
      return senden(200, { data: { benutzer: "anna", erreichbar: true, adresse, ordner: [{ kennung: "buchhaltung", name: "Buchhaltung", ebene: 1, eltern: null, pfad: "buchhaltung", recht: "lesen" }] } });
    }
    if (pfad === "/api/apps/meine") return senden(200, { data: [] });
    return senden(404, { error: { message: "Weg nicht bekannt" } });
  });
});
await new Promise((bereit) => server.listen(0, "127.0.0.1", bereit));
const adresse = `http://127.0.0.1:${server.address().port}`;

const dir = mkdtempSync(join(tmpdir(), "ara-win-"));
const wurzel = join(dir, "haus");
const ausweise = join(dir, "ausweis");
const env = { ...process.env, ARASUL_CONFIG_DIR: ausweise, CLAUDE_CONFIG_DIR: join(dir, "claude") };
delete env.ARASUL_PLATFORM;
delete env.ARASUL_ICACLS;
delete env.ARASUL_SCHTASKS;
let aufgabenName = null;

const bruecke = (args, input = "") =>
  new Promise((fertig) => {
    const kind = spawn(process.execPath, [join(wurzel, "arasul.mjs"), ...args], { cwd: wurzel, env });
    let stdout = "";
    let stderr = "";
    kind.stdout.on("data", (stueck) => (stdout += stueck));
    kind.stderr.on("data", (stueck) => (stderr += stueck));
    kind.stdin.end(input);
    kind.on("close", (status) => fertig({ status, stdout, stderr }));
  });
const zeigen = (lauf) => `${lauf.stdout}${lauf.stderr}`.trim();

/** Wer in der Rechteliste einer Datei oder eines Ordners steht, aus der Ausgabe des echten icacls. */
function wer(pfad) {
  const lauf = spawnSync("icacls", [pfad], { encoding: "utf8" });
  pruefe(lauf.status === 0, `icacls ${pfad} endet mit ${lauf.status}: ${lauf.stdout}${lauf.stderr}`);
  console.log(lauf.stdout.trim().split(/\r?\n/).map((zeile) => `      ${zeile}`).join("\n"));
  const zeilen = lauf.stdout.split(/\r?\n/).filter((zeile) => /:\(/.test(zeile));
  return zeilen.map((zeile) => zeile.replace(pfad, "").trim().replace(/:\(.*$/, ""));
}

try {
  schritt("Wurzel anlegen (root.mjs)");
  const anlegen = spawnSync(process.execPath, [join(KIT, ".ara", "tools", "root.mjs"), "--path", wurzel, "--name", "Probehaus", "--language", "de", "--folders", "sales,product", "--no-git"], { encoding: "utf8" });
  pruefe(anlegen.status === 0, `root.mjs endet mit ${anlegen.status}: ${anlegen.stdout}${anlegen.stderr}`);
  pruefe(existsSync(join(wurzel, "arasul.mjs")), "arasul.mjs liegt nicht in der Wurzel");

  schritt("arasul.mjs login gegen das nachgestellte Gerät");
  const falsch = await bruecke(["login", adresse, "--user", "anna", "--password-stdin"], "falsch-und-geheim\n");
  pruefe(falsch.status !== 0 && !existsSync(join(ausweise, "credentials.json")), `ein falsches Passwort legt einen Ausweis ab: ${zeigen(falsch)}`);
  pruefe(!zeigen(falsch).includes("falsch-und-geheim"), "das eingegebene Passwort steht in der Ausgabe");
  const login = await bruecke(["login", adresse, "--user", "anna", "--password-stdin"], `${PASSWORT}\n`);
  pruefe(login.status === 0, `login endet mit ${login.status}: ${zeigen(login)}`);
  pruefe(/Windows-Benutzer/.test(login.stdout), `login nennt den Windows-Benutzer nicht: ${login.stdout}`);
  pruefe(!zeigen(login).includes(PASSWORT), "das Passwort steht in der Ausgabe");
  const eintrag = JSON.parse(readFileSync(join(ausweise, "credentials.json"), "utf8")).devices?.["127.0.0.1"];
  pruefe(eintrag?.token === AUSWEIS, "abgelegt wurde nicht der ausgestellte Ausweis");

  schritt("icacls: Ausweis und Ordner nur für den Benutzer");
  const ich = `${process.env.USERDOMAIN}\\${process.env.USERNAME}`.toLowerCase();
  for (const pfad of [ausweise, join(ausweise, "credentials.json")]) {
    const namen = wer(pfad).map((name) => name.toLowerCase());
    pruefe(namen.length > 0 && namen.every((name) => name === ich), `${pfad}: Rechte nicht nur für ${ich}: ${namen.join(", ")}`);
  }

  schritt("status liest den Ausweis");
  const status = await bruecke(["status"]);
  pruefe(status.status === 0 && /noch nie abgeglichen|Abgleich/.test(status.stdout), `status: ${zeigen(status)}`);

  schritt("sync --install legt eine geplante Aufgabe an");
  const install = await bruecke(["sync", "--install", "--every", "7", "--client", process.execPath, "--password-stdin"], `${PASSWORT}\n`);
  pruefe(install.status === 0, `sync --install endet mit ${install.status}: ${zeigen(install)}`);
  pruefe(/Aufgabenplanung/.test(install.stdout) && /alle 7 Minuten/.test(install.stdout), `sync --install sagt nicht, was es eingerichtet hat: ${install.stdout}`);
  const meta = readdirSync(join(ausweise, "abgleich")).find((name) => name.endsWith(".task.json"));
  pruefe(meta, `keine Aufgabe in ${join(ausweise, "abgleich")}: ${readdirSync(join(ausweise, "abgleich")).join(", ")}`);
  const aufgabe = JSON.parse(readFileSync(join(ausweise, "abgleich", meta), "utf8"));
  aufgabenName = `Arasul\\${aufgabe.label}`;
  const abfrage = spawnSync("schtasks", ["/Query", "/TN", aufgabenName, "/XML"], { encoding: "utf8" });
  pruefe(abfrage.status === 0, `schtasks kennt die Aufgabe ${aufgabenName} nicht: ${abfrage.stdout}${abfrage.stderr}`);
  pruefe(/PT7M/.test(abfrage.stdout) && /wscript\.exe/.test(abfrage.stdout), `die Aufgabe in der Aufgabenplanung stimmt nicht:\n${abfrage.stdout}`);
  console.log(`      Aufgabe ${aufgabenName} liegt in der Aufgabenplanung, alle 7 Minuten, mit wscript.exe`);
  pruefe(!abfrage.stdout.includes(PASSWORT) && !abfrage.stdout.includes(APP_TOKEN), "ein Geheimnis steht in der Aufgabe");
  const starter = readFileSync(aufgabe.launcher);
  pruefe(starter[0] === 0xff && starter[1] === 0xfe, "der Starter ist nicht UTF-16 mit Kennung");
  const zugang = readdirSync(join(ausweise, "abgleich")).find((name) => name.endsWith(".zugang"));
  pruefe(zugang, "die Zugangsdatei fehlt");
  const dort = wer(join(ausweise, "abgleich", zugang)).map((name) => name.toLowerCase());
  pruefe(dort.length > 0 && dort.every((name) => name === ich), `die Zugangsdatei ist nicht nur für ${ich}: ${dort.join(", ")}`);
  pruefe(/im Hintergrund alle 7 Minuten/.test((await bruecke(["status"])).stdout.split("\n")[0]), "status kennt die Aufgabe nicht");

  schritt("sync --uninstall nimmt sie zurück");
  const weg = await bruecke(["sync", "--uninstall"]);
  pruefe(weg.status === 0 && /Aufgabenplanung genommen/.test(weg.stdout), `sync --uninstall: ${zeigen(weg)}`);
  const danach = spawnSync("schtasks", ["/Query", "/TN", aufgabenName], { encoding: "utf8" });
  pruefe(danach.status !== 0, `die Aufgabe ${aufgabenName} ist nach --uninstall noch da`);
  pruefe(!readdirSync(join(ausweise, "abgleich")).some((name) => /\.(task\.json|task\.xml|vbs|zugang)$/.test(name)), "nach --uninstall liegt noch etwas da");
  pruefe(widerrufen, "der Ausweis wurde am Gerät nicht widerrufen");
  aufgabenName = null;

  console.log(`\nGRÜN: ${schritte} Schritte, echtes Windows (${process.env.OS || process.platform}, node ${process.version})`);
} catch (e) {
  if (!process.exitCode) {
    process.exitCode = 1;
    console.error(`ROT: ${e.stack || e}`);
  }
} finally {
  if (aufgabenName) spawnSync("schtasks", ["/Delete", "/TN", aufgabenName, "/F"]);
  server.close();
  server.closeAllConnections?.();
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {}
}
