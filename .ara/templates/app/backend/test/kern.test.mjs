/**
 * Die Tests der Vorlage: der Kern der App, ohne Datenbank und ohne Gerät.
 *
 * Gestartet werden sie mit `npm test` in diesem Ordner, und das Kit lässt sie bei jedem Bau
 * laufen (`node .ara/tools/app.mjs --app <name> --build`): ohne grüne Tests geht kein Paket ans
 * Gerät. Der Kern kennt keine Welt außer seinen Argumenten, deshalb braucht jeder Fall hier nur
 * ein paar Zeilen. Neue Regeln der App bekommen ihren Fall neben diesen.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { BOM, csv, zahl, zelle } from "../kern/csv.mjs";
import { blatt, umbrechen } from "../kern/blatt.mjs";
import { IN_ARBEIT, darfAendern } from "../kern/vorgaenge.mjs";

test("eine Zahl steht mit Komma und ohne Tausenderpunkt", () => {
  assert.equal(zahl(1234.5, 2), "1234,50");
  assert.equal(zahl(Number.NaN), "");
});

test("eine Zelle, die mit einer Formel beginnt, bleibt Text", () => {
  assert.equal(zelle("=SUMME(A1)"), "'=SUMME(A1)");
  assert.equal(zelle('sagt "ja"; dann'), '"sagt ""ja""; dann"');
});

test("die CSV beginnt mit der Kopfzeile und trennt mit Semikolon", () => {
  const text = csv([{ id: 7, titel: "Antrag" }], [
    { titel: "Nummer", wert: (v) => v.id },
    { titel: "Titel", wert: (v) => v.titel },
  ]);
  assert.equal(text, `${BOM}Nummer;Titel\r\n7;Antrag\r\n`);
});

test("ein Text bricht an Wortgrenzen um und ein zu langes Wort wird zerteilt", () => {
  assert.deepEqual(umbrechen("ein kurzer Satz", 8), ["ein", "kurzer", "Satz"]);
  assert.deepEqual(umbrechen("abcdefghij", 4), ["abcd", "efgh", "ij"]);
});

test("das Blatt eines Vorgangs ist ein Bild", () => {
  const bild = blatt({ id: 1, titel: "Urlaub", text: "Zwei Tage im Mai" });
  assert.ok(bild && (bild.length ?? bild.byteLength ?? 0) > 0);
});

test("ändern darf nur, wer noch in Arbeit ist", () => {
  assert.equal(darfAendern({ status: IN_ARBEIT }), true);
  assert.equal(darfAendern({ status: "genehmigt" }), false);
  assert.equal(darfAendern(null), false);
});
