#!/usr/bin/env node
/**
 * Datenträger: Boot-Medien sicher erkennen und beschreiben.
 *
 * Das Beschreiben eines Datenträgers ist der einzige Schritt der Einrichtung, der sich
 * nicht rückgängig machen lässt: der falsche Anschluss löscht eine fremde Festplatte.
 * Deshalb prüft dieses Werkzeug vorher, ob das Ziel überhaupt ein Wechseldatenträger
 * ist, und zeigt in jedem Fall erst an, was passieren würde.
 *
 *   node .ara/tools/disk.mjs --list
 *   node .ara/tools/disk.mjs --checksum abbild.iso
 *   node .ara/tools/disk.mjs --write abbild.iso --to disk4
 *   node .ara/tools/disk.mjs --write abbild.iso --to disk4 --yes --execute
 */

import { createReadStream, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { platform } from "node:os";
import { fail, parseArgs } from "./lib/kit.mjs";

const arg = parseArgs();
const SYSTEM = platform();

function lauf(befehl, args) {
  const ergebnis = spawnSync(befehl, args, { encoding: "utf8" });
  if (ergebnis.error) return null;
  return `${ergebnis.stdout || ""}`;
}

function gb(bytes) {
  return `${(bytes / 1000 ** 3).toFixed(1)} GB`;
}

/** Wechseldatenträger auf macOS. */
function listeMac() {
  const uebersicht = lauf("diskutil", ["list", "external", "physical"]);
  if (!uebersicht) return [];
  const kennungen = [...uebersicht.matchAll(/^\/dev\/(disk\d+)\s/gm)].map((t) => t[1]);

  return kennungen.map((kennung) => {
    const info = lauf("diskutil", ["info", kennung]) || "";
    const feld = (name) => {
      const treffer = info.match(new RegExp(`^\\s*${name}:\\s*(.+)$`, "m"));
      return treffer ? treffer[1].trim() : "";
    };
    const groesse = feld("Disk Size").match(/\((\d+) Bytes\)/);
    return {
      kennung,
      knoten: `/dev/${kennung}`,
      rohknoten: `/dev/r${kennung}`,
      bezeichnung: feld("Media Name") || feld("Device / Media Name") || "unbekannt",
      bytes: groesse ? Number(groesse[1]) : 0,
      intern: /^Yes/i.test(feld("Internal")),
      entfernbar: /Removable|Yes/i.test(feld("Removable Media") || feld("Ejectable")),
      eingehaengt: [...info.matchAll(/^\s*Mount Point:\s*(.+)$/gm)].map((t) => t[1].trim()),
    };
  });
}

/** Wechseldatenträger auf Linux. */
function listeLinux() {
  const roh = lauf("lsblk", ["-J", "-b", "-o", "NAME,SIZE,TYPE,RM,MODEL,MOUNTPOINT,TRAN"]);
  if (!roh) return [];
  let daten;
  try {
    daten = JSON.parse(roh);
  } catch {
    return [];
  }
  return (daten.blockdevices || [])
    .filter((g) => g.type === "disk")
    .map((g) => ({
      kennung: g.name,
      knoten: `/dev/${g.name}`,
      rohknoten: `/dev/${g.name}`,
      bezeichnung: (g.model || "unbekannt").trim(),
      bytes: Number(g.size) || 0,
      intern: !(g.rm === true || g.rm === "1" || g.tran === "usb"),
      entfernbar: g.rm === true || g.rm === "1" || g.tran === "usb",
      eingehaengt: [g.mountpoint, ...(g.children || []).map((k) => k.mountpoint)].filter(Boolean),
    }));
}

function liste() {
  if (SYSTEM === "darwin") return listeMac();
  if (SYSTEM === "linux") return listeLinux();
  return [];
}

function zeigeListe() {
  const alle = liste();
  const wechsel = alle.filter((d) => d.entfernbar && !d.intern);

  if (SYSTEM === "win32") {
    console.log(
      "Unter Windows kann dieses Werkzeug keine Datenträger prüfen.\n" +
        "Nutz Rufus oder den Raspberry Pi Imager und komm danach zurück."
    );
    process.exit(0);
  }

  if (!alle.length) {
    console.log("Keine externen Datenträger gefunden. Steckt der Stick?");
    process.exit(0);
  }

  console.log("# Angeschlossene externe Datenträger\n");
  for (const d of alle) {
    const marker = d.entfernbar && !d.intern ? "" : "  ← NICHT entfernbar, kommt nicht in Frage";
    console.log(
      `- ${d.kennung} · ${d.bezeichnung} · ${gb(d.bytes)}${marker}` +
        (d.eingehaengt.length ? `\n  eingehängt: ${d.eingehaengt.join(", ")}` : "")
    );
  }
  console.log(
    `\n${wechsel.length} beschreibbare${wechsel.length === 1 ? "r" : ""} Wechseldatenträger.` +
      "\nPrüf die Größe und die Bezeichnung gegen den Stick in deiner Hand, bevor du weitermachst."
  );
}

async function pruefsumme(datei) {
  if (!existsSync(datei)) fail(`Die Datei ${datei} gibt es nicht.`);
  const hash = createHash("sha256");
  await new Promise((fertig, fehler) => {
    createReadStream(datei).on("data", (d) => hash.update(d)).on("end", fertig).on("error", fehler);
  });
  console.log(`sha256  ${hash.digest("hex")}  ${datei}`);
}

function schreiben(abbild, zielKennung) {
  if (SYSTEM === "win32") {
    fail("Unter Windows schreibt dieses Werkzeug keine Datenträger. Nutz Rufus.");
  }
  if (!existsSync(abbild)) fail(`Das Abbild ${abbild} gibt es nicht.`);

  const kennung = String(zielKennung).replace(/^\/dev\//, "").replace(/^r/, "");
  const ziel = liste().find((d) => d.kennung === kennung);

  if (!ziel) {
    fail(
      `${kennung} ist kein erkannter externer Datenträger.\n` +
        "Lass dir mit --list zeigen, was angeschlossen ist. Interne Datenträger werden hier nicht angeboten."
    );
  }
  if (ziel.intern || !ziel.entfernbar) {
    fail(`${kennung} ist kein Wechseldatenträger. Das Werkzeug schreibt dort nicht.`);
  }
  if (ziel.eingehaengt.some((p) => p === "/" || p.startsWith("/System") || p.startsWith("/boot"))) {
    fail(`${kennung} trägt Systemverzeichnisse. Abbruch.`);
  }

  const abbildBytes = statSync(abbild).size;
  if (abbildBytes > ziel.bytes) {
    fail(
      `Das Abbild ist größer als der Datenträger (${gb(abbildBytes)} auf ${gb(ziel.bytes)}). Das kann nicht passen.`
    );
  }

  const aushaengen =
    SYSTEM === "darwin"
      ? ["diskutil", ["unmountDisk", ziel.knoten]]
      : ["sh", ["-c", `for p in ${ziel.knoten}*; do umount "$p" 2>/dev/null || true; done`]];

  const ddZiel = SYSTEM === "darwin" ? ziel.rohknoten : ziel.knoten;
  const ddArgs =
    SYSTEM === "darwin"
      ? [`if=${abbild}`, `of=${ddZiel}`, "bs=4m"]
      : [`if=${abbild}`, `of=${ddZiel}`, "bs=4M", "status=progress", "conv=fsync"];

  console.log(
    [
      "# Das würde passieren",
      "",
      `- Abbild:       ${abbild} (${gb(abbildBytes)})`,
      `- Ziel:         ${ziel.kennung} · ${ziel.bezeichnung} · ${gb(ziel.bytes)}`,
      ziel.eingehaengt.length ? `- Eingehängt:   ${ziel.eingehaengt.join(", ")}` : "- Eingehängt:   nichts",
      "",
      "Der gesamte Inhalt dieses Datenträgers geht verloren und lässt sich nicht wiederherstellen.",
      "",
      "Befehle:",
      `  ${aushaengen[0]} ${aushaengen[1].join(" ")}`,
      `  sudo dd ${ddArgs.join(" ")}`,
      "",
    ].join("\n")
  );

  if (!arg.yes) {
    console.log("Zum Ausführen: dieselbe Zeile noch einmal mit --yes --execute.");
    return;
  }
  if (!arg.execute) {
    console.log(
      "Geprüft und freigegeben, aber nicht ausgeführt.\n" +
        "Führ die beiden Befehle oben in deinem Terminal aus, dd braucht dein Passwort.\n" +
        "Sag mir danach Bescheid, dann prüfe ich den Stick."
    );
    return;
  }

  console.log("Hänge den Datenträger aus ...");
  const aus = spawnSync(aushaengen[0], aushaengen[1], { stdio: "inherit" });
  if (aus.status !== 0) fail("Das Aushängen ist fehlgeschlagen. Ist der Datenträger in Benutzung?");

  console.log("Schreibe. Das dauert je nach Stick einige Minuten ...");
  const schreib = spawnSync("sudo", ["dd", ...ddArgs], { stdio: "inherit" });
  if (schreib.status !== 0) {
    fail(
      "Das Schreiben ist fehlgeschlagen.\n" +
        "Häufigster Grund: sudo hat kein Passwort bekommen. Führ die Befehle oben direkt im Terminal aus."
    );
  }
  console.log(`Fertig. ${abbild} liegt auf ${ziel.kennung}.`);
}

if (arg.list) {
  zeigeListe();
} else if (typeof arg.checksum === "string") {
  await pruefsumme(arg.checksum);
} else if (typeof arg.write === "string") {
  if (typeof arg.to !== "string") fail("Es fehlt --to mit der Kennung des Ziels, etwa --to disk4.");
  schreiben(arg.write, arg.to);
} else {
  console.log(
    [
      "Datenträger-Werkzeug",
      "",
      "  --list                          zeigt angeschlossene externe Datenträger",
      "  --checksum <datei>             sha256 einer Abbilddatei",
      "  --write <abbild> --to disk4 prüft und zeigt, was passieren würde",
      "  ... --yes --execute            führt es tatsächlich aus",
    ].join("\n")
  );
}
