/**
 * Muster Post: eine E-Mail aus dem Backend der App, über SMTP.
 *
 * Liegt in einer App aus der Vorlage unter `backend/post.mjs`, als dritter
 * Anschluss neben der Ablage und dem Gerät. Der Kern bekommt ihn hereingereicht
 * und ruft `senden`, und im Kern steht deshalb weder ein Host noch ein Port:
 *
 *   import { postAusUmgebung, post as postAnschluss } from "./post.mjs";
 *   const post = postAnschluss(postAusUmgebung(process.env));
 *   const vorgangsKern = kern({ ablage, geraet, post, name: NAME });
 *
 *   // im Kern, wenn ein Vorgang entschieden ist:
 *   const { gesendet, fehler } = await post.senden({
 *     an: [vorgang.von_adresse],
 *     betreff: `${name}: ${vorgang.titel} ist ${stand}`,
 *     text: `${freigabe.entschieden_von} hat entschieden: ${stand}.`,
 *   });
 *   if (!gesendet) hinweis = fehler;   // an den Vorgang, nicht ins Nichts
 *
 * **Kein Plattformdienst.** Arasul verschickt keine Post für eine App. Die App
 * spricht selbst mit dem Postausgang des Kunden, so wie jedes andere Programm
 * in seinem Netz. Das ist eine Entscheidung des Produkts, keine Lücke: Post
 * gehört zum Fach der App, nicht zur Infrastruktur darunter.
 *
 * **Die Werte stehen im Manifest**, unter `backend.umgebung`, und das Gerät
 * legt sie in den Container:
 *
 *   SMTP_HOST      der Postausgang, meist ein Relais im Netz des Kunden
 *   SMTP_PORT      25, 587 oder 465. Ohne Angabe folgt er aus SMTP_TLS
 *   SMTP_TLS       `keine` (25), `starttls` (587) oder `tls` (465)
 *   SMTP_VON       die Absenderadresse
 *   SMTP_BENUTZER  nur, wenn das Relais eine Anmeldung verlangt
 *   SMTP_PASSWORT  dito. Das steht NICHT im Manifest, siehe unten
 *
 * **Kein Passwort im Manifest.** Das Manifest liegt im Paket und im
 * Repository des Partners; ein Passwort darin läge an zwei Orten, an die es
 * nicht gehört. Der gangbare Weg ist ein Relais im Netz des Kunden, das das
 * Gerät ohne Anmeldung annimmt, an seiner Adresse erkannt. Verlangt der
 * Postausgang eine Anmeldung, hält die App das Passwort in ihrer eigenen
 * Ablage, eingetragen über eine Einstellungsseite, und reicht es hier als
 * `passwort` herein. Das Gerät gibt einer App heute keinen Ort für ein
 * Geheimnis; sobald es einen gibt, wandert der Wert dorthin.
 *
 * **Ohne Paket.** Das hier ist SMTP in seiner einfachsten Form auf `node:net`
 * und `node:tls`: EHLO, STARTTLS, AUTH PLAIN, MAIL FROM, RCPT TO, DATA, QUIT.
 * Es reicht für eine Nachricht in Klartext an ein Relais. Wer Anhänge, HTML
 * oder mehr Anmeldeverfahren braucht, nimmt ein Paket wie `nodemailer`, legt
 * dafür ein `npm ci` in das Dockerfile und behält die Schnittstelle dieser
 * Datei bei: `senden({ an, betreff, text })`, zurück `{ gesendet, fehler }`.
 *
 * **Das Passwort verlässt diesen Prozess nur zum Server.** Es steht in keinem
 * Fehlersatz, in keinem Protokoll und in keiner Antwort.
 */

import { connect as netVerbinden } from "node:net";
import { connect as tlsVerbinden } from "node:tls";
import { hostname } from "node:os";
import { randomBytes } from "node:crypto";

const PORTS = { keine: 25, starttls: 587, tls: 465 };

/** Die Einstellungen aus der Umgebung des Containers, wie das Manifest sie nennt. */
export function postAusUmgebung(umgebung) {
  const tls = String(umgebung.SMTP_TLS || "keine").toLowerCase();
  return {
    host: umgebung.SMTP_HOST || null,
    port: Number(umgebung.SMTP_PORT) || PORTS[tls] || 25,
    tls: PORTS[tls] ? tls : "keine",
    von: umgebung.SMTP_VON || null,
    benutzer: umgebung.SMTP_BENUTZER || null,
    passwort: umgebung.SMTP_PASSWORT || null,
  };
}

/** Warum diese App keine Post senden kann, in einem Satz, oder null. */
export function warumKeinePost(einstellungen) {
  if (!einstellungen.host) return "SMTP_HOST steht nicht in der Umgebung, die App kennt keinen Postausgang.";
  if (!einstellungen.von) return "SMTP_VON steht nicht in der Umgebung, die App hat keine Absenderadresse.";
  if (einstellungen.passwort && !einstellungen.benutzer) return "SMTP_PASSWORT ohne SMTP_BENUTZER: die Anmeldung ist halb.";
  return null;
}

/** Ein Betreff mit Umlauten, so kodiert, dass er in einer Kopfzeile ankommt. */
function kopfWort(text) {
  return /^[\x20-\x7e]*$/.test(text) ? text : `=?UTF-8?B?${Buffer.from(text, "utf8").toString("base64")}?=`;
}

/** Der Rumpf als Base64 in Zeilen zu 76 Zeichen: so übersteht er jedes Relais. */
function rumpf(text) {
  return Buffer.from(text, "utf8").toString("base64").replace(/.{1,76}/g, "$&\r\n");
}

/** Die Nachricht, so wie sie auf die Leitung geht. */
export function nachricht({ von, an, betreff, text }) {
  return [
    `From: <${von}>`,
    `To: ${an.map((adresse) => `<${adresse}>`).join(", ")}`,
    `Subject: ${kopfWort(betreff)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${randomBytes(12).toString("hex")}@${hostname()}>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    rumpf(text),
  ].join("\r\n");
}

/**
 * Eine Verbindung, die in Antworten spricht: jede Antwort des Servers ist ein
 * dreistelliger Code und Zeilen dazu, und eine Antwort ist erst vollständig,
 * wenn nach dem Code ein Leerzeichen steht statt eines Bindestrichs.
 */
function gespraech(socket, zeitlimit) {
  let rest = "";
  let warten = null;
  let ende = null;

  const abgebrochen = (grund) => {
    ende = ende || grund;
    if (warten) {
      warten.gescheitert(new Error(grund));
      warten = null;
    }
  };
  socket.setEncoding("utf8");
  socket.setTimeout(zeitlimit, () => {
    abgebrochen(`Der Postausgang hat ${zeitlimit / 1000} Sekunden lang nicht geantwortet.`);
    socket.destroy();
  });
  socket.on("error", (fehler) => abgebrochen(`Die Verbindung zum Postausgang ist gescheitert: ${fehler.message}`));
  socket.on("close", () => abgebrochen("Der Postausgang hat die Verbindung beendet."));

  const antworten = () => {
    const zeilen = rest.split("\r\n");
    rest = zeilen.pop();
    const fertig = zeilen.length && /^\d{3} /.test(zeilen[zeilen.length - 1]);
    if (!fertig) {
      rest = [...zeilen, rest].join("\r\n");
      return;
    }
    const code = Number(zeilen[zeilen.length - 1].slice(0, 3));
    const text = zeilen.map((zeile) => zeile.slice(4)).join("\n");
    if (warten) {
      const { fertigMit } = warten;
      warten = null;
      fertigMit({ code, text });
    }
  };
  socket.on("data", (stueck) => {
    rest += stueck;
    antworten();
  });

  const lesen = () =>
    new Promise((fertigMit, gescheitert) => {
      if (ende) return gescheitert(new Error(ende));
      warten = { fertigMit, gescheitert };
      antworten();
    });

  return {
    lesen,
    /** Einen Befehl schicken und die Antwort lesen. `erwartet` ist der Code, der gut ist. */
    async sagen(befehl, erwartet, was) {
      socket.write(`${befehl}\r\n`);
      const antwort = await lesen();
      if (antwort.code !== erwartet) {
        throw new Error(`${was}: der Postausgang antwortete ${antwort.code} ${antwort.text.split("\n")[0]}.`);
      }
      return antwort;
    },
    socket,
  };
}

/**
 * Der Anschluss, den der Kern bekommt. Er kennt die Einstellungen; der Kern
 * kennt nur `senden` und `warumNicht`.
 */
export function post(einstellungen, { zeitlimit = 30_000 } = {}) {
  return {
    warumNicht: () => warumKeinePost(einstellungen),

    /**
     * Eine Nachricht senden. Zurück kommt `{ gesendet: true }` oder
     * `{ gesendet: false, fehler }` mit einem Satz, der die Stelle nennt.
     * Werfen tut sie nicht: eine Post, die nicht rausging, ist ein Stand des
     * Vorgangs und kein Absturz der App.
     */
    async senden({ an, betreff, text }) {
      const fehlt = warumKeinePost(einstellungen);
      if (fehlt) return { gesendet: false, fehler: fehlt };
      const empfaenger = (Array.isArray(an) ? an : [an]).map((adresse) => String(adresse || "").trim()).filter(Boolean);
      if (!empfaenger.length) return { gesendet: false, fehler: "Ohne Empfänger geht keine Post raus." };
      if (!String(betreff || "").trim()) return { gesendet: false, fehler: "Ohne Betreff geht keine Post raus." };

      const { host, port, tls, von, benutzer, passwort } = einstellungen;
      let verbindung = null;
      try {
        const socket = await new Promise((fertigMit, gescheitert) => {
          const s =
            tls === "tls"
              ? tlsVerbinden({ host, port, servername: host }, () => fertigMit(s))
              : netVerbinden({ host, port }, () => fertigMit(s));
          s.once("error", (fehler) => gescheitert(new Error(`${host}:${port} ist nicht erreichbar: ${fehler.message}`)));
        });
        verbindung = gespraech(socket, zeitlimit);
        const gruss = await verbindung.lesen();
        if (gruss.code !== 220) throw new Error(`Der Postausgang begrüßt mit ${gruss.code} statt 220.`);

        let ehlo = await verbindung.sagen(`EHLO ${hostname()}`, 250, "EHLO");
        if (tls === "starttls") {
          if (!/STARTTLS/i.test(ehlo.text)) throw new Error("Der Postausgang bietet kein STARTTLS an, SMTP_TLS sagt starttls.");
          await verbindung.sagen("STARTTLS", 220, "STARTTLS");
          const sicher = await new Promise((fertigMit, gescheitert) => {
            const s = tlsVerbinden({ socket: verbindung.socket, servername: host }, () => fertigMit(s));
            s.once("error", (fehler) => gescheitert(new Error(`TLS mit ${host} ist gescheitert: ${fehler.message}`)));
          });
          verbindung = gespraech(sicher, zeitlimit);
          ehlo = await verbindung.sagen(`EHLO ${hostname()}`, 250, "EHLO nach STARTTLS");
        }
        if (benutzer) {
          if (tls === "keine") throw new Error("Eine Anmeldung ohne TLS schickte das Passwort im Klartext. SMTP_TLS auf starttls oder tls setzen.");
          const ausweis = Buffer.from(`\0${benutzer}\0${passwort || ""}`, "utf8").toString("base64");
          await verbindung.sagen(`AUTH PLAIN ${ausweis}`, 235, "Anmeldung");
        }
        await verbindung.sagen(`MAIL FROM:<${von}>`, 250, "MAIL FROM");
        for (const adresse of empfaenger) await verbindung.sagen(`RCPT TO:<${adresse}>`, 250, `RCPT TO ${adresse}`);
        await verbindung.sagen("DATA", 354, "DATA");
        const angenommen = await verbindung.sagen(
          `${nachricht({ von, an: empfaenger, betreff, text: String(text || "") })}\r\n.`,
          250,
          "Die Nachricht"
        );
        await verbindung.sagen("QUIT", 221, "QUIT").catch(() => null);
        return { gesendet: true, fehler: null, antwort: angenommen.text };
      } catch (fehler) {
        return { gesendet: false, fehler: fehler.message };
      } finally {
        verbindung?.socket.destroy();
      }
    },
  };
}
