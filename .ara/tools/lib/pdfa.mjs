/**
 * Aus einem gedruckten PDF wird ein PDF/A-3 mit angehaengter Rechnungsdatei.
 *
 * Das ist die zweite Haelfte von ZUGFeRD: das XML aus `lib/zugferd.mjs` muss im
 * PDF stecken, sonst ist es nur eine Datei daneben, die auf dem Weg zum Kunden
 * verlorengeht. Angehaengt wird nach der Art, die Factur-X vorschreibt: eine
 * eingebettete Datei mit dem Namen `factur-x.xml`, ein Verweis darauf im
 * Katalog (`/AF`), ein Ausgabeprofil und XMP-Metadaten, die sagen, was drin ist.
 *
 * **Fortgeschrieben, nicht neu geschrieben.** Das PDF, das Chromium gedruckt
 * hat, bleibt Byte fuer Byte stehen. Angehaengt wird ein Nachtrag mit den neuen
 * Objekten und einer neuen Querverweistabelle, so wie es der PDF-Standard fuer
 * Aenderungen an einer bestehenden Datei vorsieht. Damit kann dieses Werkzeug
 * am gedruckten Blatt nichts kaputtmachen.
 *
 * Was es **nicht** tut: die Konformitaet zu PDF/A-3 pruefen. Es setzt die
 * Kennzeichnung und alles, was dafuer noetig ist, aber ob ein Pruefer wie
 * veraPDF zufrieden waere, sagt nur ein Pruefer. Siehe
 * `.ara/knowledge/invoicing.md`, Abschnitt "Was ungeprueft bleibt".
 */

import { createHash } from "node:crypto";
import { t } from "./i18n.mjs";

// --- Ein sehr kleines Stueck PDF-Syntax --------------------------------------

/** Liest einen Wert ab Position i und gibt sein Ende zurueck. */
function endOfValue(text, start) {
  let i = start;
  const skipSpace = () => {
    while (i < text.length && /[\s\0]/.test(text[i])) i++;
  };
  skipSpace();
  if (text.startsWith("<<", i)) {
    let depth = 0;
    while (i < text.length) {
      if (text.startsWith("<<", i)) {
        depth++;
        i += 2;
      } else if (text.startsWith(">>", i)) {
        depth--;
        i += 2;
        if (depth === 0) return i;
      } else if (text[i] === "(") {
        i = endOfLiteral(text, i);
      } else i++;
    }
    throw new Error(t("A dictionary in the PDF is not closed.", "Ein Verzeichnis im PDF wird nicht geschlossen."));
  }
  if (text[i] === "[") {
    let depth = 0;
    while (i < text.length) {
      if (text[i] === "[") depth++;
      else if (text[i] === "]") {
        depth--;
        i++;
        if (depth === 0) return i;
        continue;
      } else if (text[i] === "(") {
        i = endOfLiteral(text, i);
        continue;
      }
      i++;
    }
    throw new Error(t("A field in the PDF is not closed.", "Ein Feld im PDF wird nicht geschlossen."));
  }
  if (text[i] === "(") return endOfLiteral(text, i);
  if (text[i] === "<") return text.indexOf(">", i) + 1;
  // Name, Zahl, Verweis (1 0 R) oder Schluesselwort.
  const rest = text.slice(i);
  const reference = rest.match(/^\d+\s+\d+\s+R\b/);
  if (reference) return i + reference[0].length;
  const token = rest.match(/^\/?[^\s\/<>\[\]()]*/);
  return i + Math.max(1, token ? token[0].length : 1);
}

/** Ende einer Zeichenkette in runden Klammern, mit Maskierung. */
function endOfLiteral(text, start) {
  let i = start + 1;
  let depth = 1;
  while (i < text.length) {
    if (text[i] === "\\") {
      i += 2;
      continue;
    }
    if (text[i] === "(") depth++;
    if (text[i] === ")") {
      depth--;
      if (depth === 0) return i + 1;
    }
    i++;
  }
  throw new Error(t("A string in the PDF is not closed.", "Eine Zeichenkette im PDF wird nicht geschlossen."));
}

/** Die Eintraege eines Verzeichnisses, oberste Ebene, in ihrer Reihenfolge. */
export function dictEntries(inner) {
  const entries = [];
  let i = 0;
  while (i < inner.length) {
    if (inner[i] !== "/") {
      i++;
      continue;
    }
    const name = inner.slice(i).match(/^\/([^\s\/<>\[\]()]*)/);
    if (!name) break;
    const valueStart = i + name[0].length;
    const valueEnd = endOfValue(inner, valueStart);
    entries.push({ key: name[1], value: inner.slice(valueStart, valueEnd).trim() });
    i = valueEnd;
  }
  return entries;
}

/** Der Rumpf eines Objekts: alles zwischen << und >>. */
function objectDict(text, number) {
  const start = text.search(new RegExp(`(^|[^0-9])${number}\\s+0\\s+obj\\b`));
  if (start < 0) throw new Error(t(`Object ${number} does not stand in the file.`, `Objekt ${number} steht nicht in der Datei.`));
  const open = text.indexOf("<<", start);
  if (open < 0) throw new Error(t(`Object ${number} is not a dictionary.`, `Objekt ${number} ist kein Verzeichnis.`));
  const end = endOfValue(text, open);
  return { start, open, end, inner: text.slice(open + 2, end - 2) };
}

/** Eine PDF-Zeichenkette zu lesbarem Text. */
function pdfString(raw) {
  if (!raw) return "";
  if (raw.startsWith("<")) {
    const hex = raw.slice(1, -1).replace(/\s/g, "");
    const bytes = Buffer.from(hex.length % 2 ? `${hex}0` : hex, "hex");
    return decodeText(bytes);
  }
  if (!raw.startsWith("(")) return raw;
  const body = raw.slice(1, -1).replace(/\\([nrtbf()\\])/g, (_, c) => ({ n: "\n", r: "\r", t: "\t", b: "\b", f: "\f" }[c] || c));
  return decodeText(Buffer.from(body, "latin1"));
}

function decodeText(bytes) {
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    let out = "";
    for (let i = 2; i + 1 < bytes.length; i += 2) out += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
    return out;
  }
  return bytes.toString("latin1");
}

/** Eine PDF-Zeichenkette schreiben. Alles ausserhalb ASCII geht als UTF-16BE. */
function pdfLiteral(text) {
  const clean = String(text ?? "");
  if (/^[\x20-\x7e]*$/.test(clean)) {
    return `(${clean.replace(/([\\()])/g, "\\$1")})`;
  }
  const bytes = [0xfe, 0xff];
  for (const char of clean) {
    const code = char.codePointAt(0);
    bytes.push((code >> 8) & 0xff, code & 0xff);
  }
  return `<${Buffer.from(bytes).toString("hex")}>`;
}

/** D:20260827202852+00'00' zu 2026-08-27T20:28:52+00:00. */
function xmpDate(pdfDate) {
  const match = String(pdfDate || "").match(
    /D:(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?(?:([+-Z])(\d{2})'?(\d{2})'?)?/
  );
  if (!match) return "";
  const [, year, month = "01", dayPart = "01", hour = "00", minute = "00", second = "00", sign, tzHour, tzMinute] = match;
  const zone = !sign || sign === "Z" ? "Z" : `${sign}${tzHour}:${tzMinute}`;
  return `${year}-${month}-${dayPart}T${hour}:${minute}:${second}${zone}`;
}

// --- Das Ausgabeprofil -------------------------------------------------------

/**
 * Ein minimales sRGB-Profil, im Kit gerechnet statt als Binaerdatei abgelegt.
 *
 * PDF/A verlangt ein Ausgabeprofil, sonst ist nicht festgelegt, welche Farbe
 * ein Wert bedeutet. Ein fertiges Profil waere eine fremde Binaerdatei im
 * Repository, deren Herkunft niemand mehr nachvollzieht. Also wird es gebaut:
 * die Primaerfarben von sRGB, auf den Weisspunkt D50 gerechnet, und Gamma 2,2.
 */
export function sRgbProfile() {
  const fixed = (value) => {
    const buffer = Buffer.alloc(4);
    buffer.writeInt32BE(Math.round(value * 65536));
    return buffer;
  };
  const xyz = (x, y, z) => Buffer.concat([Buffer.from("XYZ "), Buffer.alloc(4), fixed(x), fixed(y), fixed(z)]);
  const description = (text) => {
    const ascii = Buffer.from(`${text}\0`, "latin1");
    const buffer = Buffer.alloc(12 + ascii.length + 78);
    buffer.write("desc", 0, "latin1");
    buffer.writeUInt32BE(ascii.length, 8);
    ascii.copy(buffer, 12);
    return buffer;
  };
  const copyright = (text) =>
    Buffer.concat([Buffer.from("text"), Buffer.alloc(4), Buffer.from(`${text}\0`, "latin1")]);
  const curve = (gamma) => {
    const buffer = Buffer.alloc(14);
    buffer.write("curv", 0, "latin1");
    buffer.writeUInt32BE(1, 8);
    buffer.writeUInt16BE(Math.round(gamma * 256), 12);
    return buffer;
  };

  // Die Primaerfarben von sRGB, mit Bradford auf D50 angepasst. Diese Werte
  // stehen so in der Empfehlung IEC 61966-2.1.
  const tags = [
    ["desc", description("Ara sRGB")],
    ["cprt", copyright("Kein Urheberrechtsschutz beansprucht.")],
    ["wtpt", xyz(0.9642, 1.0, 0.8249)],
    ["rXYZ", xyz(0.4360, 0.2225, 0.0139)],
    ["gXYZ", xyz(0.3851, 0.7169, 0.0971)],
    ["bXYZ", xyz(0.1431, 0.0606, 0.7141)],
    ["rTRC", curve(2.2)],
    ["gTRC", curve(2.2)],
    ["bTRC", curve(2.2)],
  ];

  const header = Buffer.alloc(128);
  header.write("ADBE", 4, "latin1");
  header.writeUInt32BE(0x02100000, 8); // Fassung 2.1
  header.write("mntr", 12, "latin1");
  header.write("RGB ", 16, "latin1");
  header.write("XYZ ", 20, "latin1");
  header.writeUInt16BE(2026, 24); // Datum, fest: gleiche Eingabe, gleiche Datei
  header.writeUInt16BE(1, 26);
  header.writeUInt16BE(1, 28);
  header.write("acsp", 36, "latin1");
  fixed(0.9642).copy(header, 68);
  fixed(1.0).copy(header, 72);
  fixed(0.8249).copy(header, 76);

  const table = Buffer.alloc(4 + tags.length * 12);
  table.writeUInt32BE(tags.length, 0);
  const body = [];
  let offset = header.length + table.length;
  const placed = new Map();
  tags.forEach(([name, data], index) => {
    const key = data.toString("latin1");
    let where = placed.get(key);
    if (!where) {
      const padding = (4 - (data.length % 4)) % 4;
      where = { offset, size: data.length };
      placed.set(key, where);
      body.push(data, Buffer.alloc(padding));
      offset += data.length + padding;
    }
    table.write(name, 4 + index * 12, "latin1");
    table.writeUInt32BE(where.offset, 4 + index * 12 + 4);
    table.writeUInt32BE(where.size, 4 + index * 12 + 8);
  });

  const profile = Buffer.concat([header, table, ...body]);
  profile.writeUInt32BE(profile.length, 0);
  return profile;
}

// --- XMP ---------------------------------------------------------------------

const FX_NAMESPACE = "urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#";

/** Die Metadaten des Dokuments, wie PDF/A und Factur-X sie verlangen. */
export function xmpPacket({ title, author, description, producer, creatorTool, created, modified, attachment, profile }) {
  const escape = (text) =>
    String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const property = (name, text) =>
    `      <rdf:li rdf:parseType="Resource">\n` +
    `       <pdfaProperty:name>${name}</pdfaProperty:name>\n` +
    `       <pdfaProperty:valueType>Text</pdfaProperty:valueType>\n` +
    `       <pdfaProperty:category>external</pdfaProperty:category>\n` +
    `       <pdfaProperty:description>${escape(text)}</pdfaProperty:description>\n` +
    `      </rdf:li>`;

  return (
    `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>\n` +
    `<x:xmpmeta xmlns:x="adobe:ns:meta/">\n` +
    ` <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n` +
    `  <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">\n` +
    `   <pdfaid:part>3</pdfaid:part>\n` +
    `   <pdfaid:conformance>B</pdfaid:conformance>\n` +
    `  </rdf:Description>\n` +
    `  <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">\n` +
    `   <dc:title><rdf:Alt><rdf:li xml:lang="x-default">${escape(title)}</rdf:li></rdf:Alt></dc:title>\n` +
    `   <dc:creator><rdf:Seq><rdf:li>${escape(author)}</rdf:li></rdf:Seq></dc:creator>\n` +
    `   <dc:description><rdf:Alt><rdf:li xml:lang="x-default">${escape(description)}</rdf:li></rdf:Alt></dc:description>\n` +
    `  </rdf:Description>\n` +
    `  <rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">\n` +
    `   <pdf:Producer>${escape(producer)}</pdf:Producer>\n` +
    `  </rdf:Description>\n` +
    `  <rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/">\n` +
    `   <xmp:CreatorTool>${escape(creatorTool)}</xmp:CreatorTool>\n` +
    (created ? `   <xmp:CreateDate>${created}</xmp:CreateDate>\n` : "") +
    (modified ? `   <xmp:ModifyDate>${modified}</xmp:ModifyDate>\n` : "") +
    `  </rdf:Description>\n` +
    `  <rdf:Description rdf:about=""\n` +
    `    xmlns:pdfaExtension="http://www.aiim.org/pdfa/ns/extension/"\n` +
    `    xmlns:pdfaSchema="http://www.aiim.org/pdfa/ns/schema#"\n` +
    `    xmlns:pdfaProperty="http://www.aiim.org/pdfa/ns/property#">\n` +
    `   <pdfaExtension:schemas>\n` +
    `    <rdf:Bag>\n` +
    `     <rdf:li rdf:parseType="Resource">\n` +
    `      <pdfaSchema:schema>Factur-X PDFA Extension Schema</pdfaSchema:schema>\n` +
    `      <pdfaSchema:namespaceURI>${FX_NAMESPACE}</pdfaSchema:namespaceURI>\n` +
    `      <pdfaSchema:prefix>fx</pdfaSchema:prefix>\n` +
    `      <pdfaSchema:property>\n` +
    `       <rdf:Seq>\n` +
    `${property("DocumentFileName", "Name der eingebetteten Rechnungsdatei")}\n` +
    `${property("DocumentType", "Art des Dokuments")}\n` +
    `${property("Version", "Fassung des Formats")}\n` +
    `${property("ConformanceLevel", "Profil der Rechnungsdaten")}\n` +
    `       </rdf:Seq>\n` +
    `      </pdfaSchema:property>\n` +
    `     </rdf:li>\n` +
    `    </rdf:Bag>\n` +
    `   </pdfaExtension:schemas>\n` +
    `  </rdf:Description>\n` +
    `  <rdf:Description rdf:about="" xmlns:fx="${FX_NAMESPACE}">\n` +
    `   <fx:DocumentType>INVOICE</fx:DocumentType>\n` +
    `   <fx:DocumentFileName>${escape(attachment)}</fx:DocumentFileName>\n` +
    `   <fx:Version>1.0</fx:Version>\n` +
    `   <fx:ConformanceLevel>${escape(profile)}</fx:ConformanceLevel>\n` +
    `  </rdf:Description>\n` +
    ` </rdf:RDF>\n` +
    `</x:xmpmeta>\n` +
    `<?xpacket end="w"?>\n`
  );
}

// --- Der Nachtrag ------------------------------------------------------------

/**
 * Haengt das XML an ein gedrucktes PDF und kennzeichnet es als PDF/A-3.
 *
 * `pdf` ist der Inhalt der gedruckten Datei, `xml` der Text der Rechnungsdaten.
 * Zurueck kommt der neue Inhalt. Die Eingabe bleibt unveraendert.
 */
export function embed(pdf, { xml, attachment, profile, description, author, modified }) {
  const text = pdf.toString("latin1");

  const startxref = [...text.matchAll(/startxref\s+(\d+)/g)].pop();
  if (!startxref) {
    throw new Error(
      t(
        "There is no startxref in the file, this is not a complete PDF.",
        "In der Datei steht kein startxref, das ist kein vollständiges PDF."
      )
    );
  }
  const previous = Number(startxref[1]);

  const trailerAt = text.lastIndexOf("trailer");
  if (trailerAt < 0) {
    throw new Error(
      t(
        "This file keeps its cross-references as a stream. The tool only writes on classic " +
          "tables, the way Chromium prints them.",
        "Diese Datei führt ihre Querverweise als Strom. Das Werkzeug schreibt nur klassische " +
          "Tabellen fort, wie Chromium sie druckt."
      )
    );
  }
  const trailerOpen = text.indexOf("<<", trailerAt);
  const trailer = Object.fromEntries(
    dictEntries(text.slice(trailerOpen + 2, endOfValue(text, trailerOpen) - 2)).map((e) => [e.key, e.value])
  );
  const rootNumber = Number((trailer.Root || "").match(/^(\d+)/)?.[1]);
  if (!rootNumber) throw new Error(t("There is no catalogue (/Root) in the trailer.", "Im Trailer steht kein Katalog (/Root)."));
  const size = Number(trailer.Size);
  if (!size) throw new Error(t("There is no size (/Size) in the trailer.", "Im Trailer steht keine Größe (/Size)."));

  const info = Number((trailer.Info || "").match(/^(\d+)/)?.[1]) || null;
  const infoFields = info
    ? Object.fromEntries(dictEntries(objectDict(text, info).inner).map((e) => [e.key, e.value]))
    : {};

  const catalog = objectDict(text, rootNumber);
  const keep = dictEntries(catalog.inner).filter(
    (entry) => !["Metadata", "OutputIntents", "AF", "Names"].includes(entry.key)
  );
  const names = dictEntries(catalog.inner).find((entry) => entry.key === "Names");
  if (names) {
    throw new Error(
      t(
        "The catalogue of this PDF already carries a name tree. The tool would overwrite it " +
          "and therefore does not.",
        "Der Katalog dieses PDF führt schon einen Namensbaum. Das Werkzeug würde ihn überschreiben " +
          "und tut es darum nicht."
      )
    );
  }

  const xmlBytes = Buffer.from(xml, "utf8");
  const metadata = Buffer.from(
    xmpPacket({
      title: pdfString(infoFields.Title) || description,
      author,
      description,
      producer: pdfString(infoFields.Producer),
      creatorTool: pdfString(infoFields.Creator),
      created: xmpDate(pdfString(infoFields.CreationDate)),
      modified: xmpDate(pdfString(infoFields.ModDate)),
      attachment,
      profile,
    }),
    "utf8"
  );
  const icc = sRgbProfile();

  const fileNumber = size;
  const specNumber = size + 1;
  const metaNumber = size + 2;
  const iccNumber = size + 3;
  const intentNumber = size + 4;
  const namesNumber = size + 5;
  const nextSize = size + 6;

  const stamp = modified || pdfString(infoFields.ModDate) || "";
  const objects = [
    {
      number: fileNumber,
      head:
        `<</Type /EmbeddedFile /Subtype /text#2Fxml /Length ${xmlBytes.length}` +
        ` /Params <</Size ${xmlBytes.length}${stamp ? ` /ModDate ${pdfLiteral(stamp)}` : ""}` +
        ` /CheckSum <${createHash("md5").update(xmlBytes).digest("hex")}>>>>>`,
      stream: xmlBytes,
    },
    {
      number: specNumber,
      head:
        `<</Type /Filespec /F ${pdfLiteral(attachment)} /UF ${pdfLiteral(attachment)}` +
        ` /AFRelationship /Alternative /Desc ${pdfLiteral(description)}` +
        ` /EF <</F ${fileNumber} 0 R /UF ${fileNumber} 0 R>>>>`,
    },
    {
      number: metaNumber,
      head: `<</Type /Metadata /Subtype /XML /Length ${metadata.length}>>`,
      stream: metadata,
    },
    { number: iccNumber, head: `<</N 3 /Length ${icc.length}>>`, stream: icc },
    {
      number: intentNumber,
      head:
        `<</Type /OutputIntent /S /GTS_PDFA1 /OutputConditionIdentifier (sRGB)` +
        ` /Info (sRGB IEC61966-2.1) /DestOutputProfile ${iccNumber} 0 R>>`,
    },
    {
      number: namesNumber,
      head: `<</Names [${pdfLiteral(attachment)} ${specNumber} 0 R]>>`,
    },
    {
      number: rootNumber,
      head:
        `<<${keep.map((entry) => `/${entry.key} ${entry.value}`).join("\n")}\n` +
        `/Metadata ${metaNumber} 0 R\n` +
        `/OutputIntents [${intentNumber} 0 R]\n` +
        `/AF [${specNumber} 0 R]\n` +
        `/Names <</EmbeddedFiles ${namesNumber} 0 R>>>>`,
    },
  ];

  // PDF/A-3 setzt auf PDF 1.7 auf. Die Kopfzeile ist gleich lang, damit
  // verschiebt sich kein einziger Verweis in der bestehenden Tabelle.
  const head = Buffer.from(pdf);
  if (text.startsWith("%PDF-1.") && text[7] < "7") head.write("%PDF-1.7", 0, "latin1");

  const parts = [head];
  if (!text.endsWith("\n")) parts.push(Buffer.from("\n", "latin1"));
  let position = parts.reduce((sum, part) => sum + part.length, 0);
  const offsets = new Map();

  for (const object of objects) {
    offsets.set(object.number, position);
    const piece = [Buffer.from(`${object.number} 0 obj\n${object.head}\n`, "latin1")];
    if (object.stream) {
      piece.push(Buffer.from("stream\n", "latin1"), object.stream, Buffer.from("\nendstream\n", "latin1"));
    }
    piece.push(Buffer.from("endobj\n", "latin1"));
    for (const part of piece) {
      parts.push(part);
      position += part.length;
    }
  }

  // Die Querverweistabelle des Nachtrags: nur die geaenderten Objekte, in
  // zusammenhaengenden Abschnitten.
  const numbers = [...offsets.keys()].sort((a, b) => a - b);
  const sections = [];
  for (const number of numbers) {
    const last = sections[sections.length - 1];
    if (last && last.start + last.entries.length === number) last.entries.push(number);
    else sections.push({ start: number, entries: [number] });
  }
  const xrefAt = position;
  let table = "xref\n";
  for (const section of sections) {
    table += `${section.start} ${section.entries.length}\n`;
    for (const number of section.entries) {
      table += `${String(offsets.get(number)).padStart(10, "0")} 00000 n \n`;
    }
  }

  const identity =
    trailer.ID && /^\[/.test(trailer.ID)
      ? trailer.ID
      : `[<${createHash("md5").update(head).digest("hex")}> <${createHash("md5")
          .update(xmlBytes)
          .digest("hex")}>]`;
  table +=
    `trailer\n<</Size ${nextSize} /Root ${rootNumber} 0 R` +
    `${info ? ` /Info ${info} 0 R` : ""} /ID ${identity} /Prev ${previous}>>\n` +
    `startxref\n${xrefAt}\n%%EOF\n`;

  parts.push(Buffer.from(table, "latin1"));
  return Buffer.concat(parts);
}

// --- Wieder herausholen ------------------------------------------------------

/**
 * Holt die angehaengte Rechnungsdatei aus einem PDF zurueck.
 *
 * Damit laesst sich pruefen, ob wirklich drinsteckt, was drinstecken soll.
 * Genau das macht der Selbsttest: er liest das XML aus dem fertigen PDF und
 * prueft es noch einmal, statt der Erzeugung zu glauben.
 */
export function extract(pdf) {
  const text = pdf.toString("latin1");
  const spec = [...text.matchAll(/\/Type\s*\/Filespec/g)]
    .map((match) => {
      const open = text.lastIndexOf("<<", match.index);
      const entries = Object.fromEntries(
        dictEntries(text.slice(open + 2, endOfValue(text, open) - 2)).map((e) => [e.key, e.value])
      );
      return entries;
    })
    .find((entries) => entries.EF);
  if (!spec) return null;

  const name = pdfString(spec.UF || spec.F);
  const target = Number((spec.EF.match(/\/F\s+(\d+)\s+0\s+R/) || [])[1]);
  if (!target) return null;

  const object = objectDict(text, target);
  const fields = Object.fromEntries(dictEntries(object.inner).map((e) => [e.key, e.value]));
  const streamAt = text.indexOf("stream", object.end);
  if (streamAt < 0) return null;
  let start = streamAt + "stream".length;
  if (text[start] === "\r") start++;
  if (text[start] === "\n") start++;
  const length = Number(fields.Length);
  const end = Number.isFinite(length) && length > 0 ? start + length : text.indexOf("endstream", start);
  return {
    name,
    relationship: (spec.AFRelationship || "").replace("/", ""),
    xml: pdf.subarray(start, end).toString("utf8"),
  };
}

/** Was im PDF steht, ohne es zu oeffnen: Kennzeichnung und Anhang. */
export function inspect(pdf) {
  const text = pdf.toString("latin1");
  const attachment = extract(pdf);
  return {
    header: text.slice(0, 8),
    pdfa: /<pdfaid:part>3<\/pdfaid:part>/.test(text) && /<pdfaid:conformance>B</.test(text),
    outputIntent: /\/OutputIntent\b/.test(text) && /\/DestOutputProfile/.test(text),
    associated: /\/AF\s*\[/.test(text),
    embeddedFiles: /\/EmbeddedFiles/.test(text),
    facturx: new RegExp(FX_NAMESPACE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(text),
    attachment,
  };
}
