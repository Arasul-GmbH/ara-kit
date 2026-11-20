#!/usr/bin/env node
/**
 * The feedback on an app: fetch it, order it, set its state on the device.
 *
 * Staff report through the icon above every app what is missing or wrong. The device keeps the
 * reports; this tool fetches the open ones of one app into the session, orders them and sets
 * their state after the human decided. It never switches anything live. The procedure around it
 * is `/feedback`, `.ara/knowledge/feedback.md`.
 *
 *   node .ara/tools/feedback.mjs --device orin --key                     create the feedback key (SSH)
 *   node .ara/tools/feedback.mjs --device orin --key --via https --password-ref ADMIN_PW --login-user anna
 *   node .ara/tools/feedback.mjs --device orin --revoke-key              revoke it and forget it
 *   node .ara/tools/feedback.mjs --device orin --app belege              the open feedback, ordered
 *   node .ara/tools/feedback.mjs --device orin --app belege --all        every state, also done and rejected
 *   node .ara/tools/feedback.mjs --device orin --app belege --reported-in test   only what came from staging
 *   node .ara/tools/feedback.mjs --device orin --app belege --image 7    one screenshot, only if allowed
 *   node .ara/tools/feedback.mjs --device orin --app belege --set 7,9 --to angenommen
 *   node .ara/tools/feedback.mjs --device orin --app belege --set 8 --to abgelehnt --reason "…"
 *   node .ara/tools/feedback.mjs --device orin --app belege --set 7 --to umgesetzt
 *   --json gives the overview as JSON, --customer <c> names a customer's device, --insecure and
 *   --base as with app.mjs.
 *
 * The key is its own: scope from the device's contract (section `rueckmeldungen`), stored in the
 * secret store, named in the device file as `feedback_key_ref`. The deploy key does not read
 * feedback, and this key does not deploy. Reading the scope needs the contract, so the deploy key
 * comes first (`device.mjs --deploy-key`).
 *
 * `umgesetzt` (implemented) is set only after this kit rolled the app into staging on this device
 * later than the feedback was accepted. `abgelehnt` (rejected) needs a reason. Screenshots come
 * only when the administrator allowed them for this app; they are saved under
 * `apps/<app>/.rueckmeldungen/`, which goes into no package.
 *
 * === deutsch ===
 *
 * Die Rückmeldungen einer App: holen, ordnen, ihren Stand am Gerät setzen.
 *
 * Mitarbeiter melden über das Icon über jeder App, was fehlt oder nicht stimmt. Das Gerät hält die
 * Meldungen; dieses Werkzeug holt die offenen einer App in die Sitzung, ordnet sie und setzt ihren
 * Stand, nachdem der Mensch entschieden hat. Es schaltet nie etwas live. Der Ablauf drumherum ist
 * `/feedback`, `.ara/knowledge/feedback.de.md`.
 *
 *   node .ara/tools/feedback.mjs --device orin --key                     den Schlüssel für Rückmeldungen anlegen (SSH)
 *   node .ara/tools/feedback.mjs --device orin --key --via https --password-ref ADMIN_PW --login-user anna
 *   node .ara/tools/feedback.mjs --device orin --revoke-key              ihn widerrufen und vergessen
 *   node .ara/tools/feedback.mjs --device orin --app belege              die offenen Meldungen, geordnet
 *   node .ara/tools/feedback.mjs --device orin --app belege --all        jeder Stand, auch umgesetzt und abgelehnt
 *   node .ara/tools/feedback.mjs --device orin --app belege --reported-in test   nur, was aus dem Teststand kam
 *   node .ara/tools/feedback.mjs --device orin --app belege --image 7    ein Bildschirmfoto, nur mit Erlaubnis
 *   node .ara/tools/feedback.mjs --device orin --app belege --set 7,9 --to angenommen
 *   node .ara/tools/feedback.mjs --device orin --app belege --set 8 --to abgelehnt --reason "…"
 *   node .ara/tools/feedback.mjs --device orin --app belege --set 7 --to umgesetzt
 *   --json gibt die Übersicht als JSON, --customer <k> nennt ein Gerät eines Kunden, --insecure und
 *   --base wie bei app.mjs.
 *
 * Der Schlüssel ist ein eigener: Bereich aus dem Kontrakt des Geräts (Abschnitt `rueckmeldungen`),
 * abgelegt in der Geheimnis-Ablage, in der Geräteakte als `feedback_key_ref` genannt. Der
 * Deploy-Schlüssel liest keine Meldungen, und dieser rollt nichts aus. Den Bereich liest das Kit
 * aus dem Kontrakt, also kommt der Deploy-Schlüssel zuerst (`device.mjs --deploy-key`).
 *
 * `umgesetzt` setzt das Werkzeug nur, wenn dieses Kit die App an diesem Gerät später in den
 * Teststand gerollt hat, als die Meldung angenommen wurde. `abgelehnt` braucht einen Grund.
 * Bildschirmfotos kommen nur, wenn der Admin sie für diese App erlaubt hat; sie liegen unter
 * `apps/<app>/.rueckmeldungen/` und gehen in kein Paket.
 */

import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { call, reason } from "./lib/arasul.mjs";
import { secretSlug } from "./lib/device.mjs";
import {
  FEEDBACK_KEY_FIELD,
  FEEDBACK_KEY_NAME,
  checkStateChange,
  feedbackSection,
  fillWay,
  lastTestDeploy,
  orderFeedback,
  readQuery,
  renderOverview,
} from "./lib/feedback.mjs";
import { t } from "./lib/i18n.mjs";
import { createKey, listKeys, revokeKey, scrub } from "./lib/install.mjs";
import { createKeyApi, listKeysApi, revokeKeyApi } from "./lib/kitkey-api.mjs";
import { ROOT, adminSession, fail, helpOnly, now, parseArgs, readDevice, readState, sshArgs, writeFrontmatter } from "./lib/kit.mjs";
import { connect, withContract } from "./lib/link.mjs";
import { forgetSecret, getSecret, setSecret } from "./lib/secrets.mjs";
import { validName } from "./lib/appfile.mjs";

helpOnly(import.meta.url);
const arg = parseArgs();
const str = (v) => (typeof v === "string" && v ? v : null);

let device;
try {
  device = readDevice(str(arg.customer), str(arg.device));
} catch (error) {
  fail(error.message);
}
const place = device.customer ? `${device.customer}/${device.device}` : device.device;
const deviceFlags = `${device.customer ? ` --customer ${device.customer}` : ""} --device ${device.device}`;
const keyHint = `node .ara/tools/feedback.mjs${deviceFlags} --key`;
const insecure = Boolean(arg.insecure);

/** Ein Absatz in der Geräteakte: was das Kit hier getan hat. Nie ein Schlüssel, nie ein Text einer Meldung. */
function note(text) {
  appendFileSync(device.file, `\n### ${now()} · ${t("Feedback", "Rückmeldungen")}\n${text}\n`);
}

/** Der Kontrakt, gelesen mit dem Schlüssel, der in der Akte unter `field` steht. */
async function contractWith(field) {
  return withContract(
    connect(device, { base: str(arg.base), insecure, keyField: field, ...(field === FEEDBACK_KEY_FIELD ? { keyHint } : {}) }),
    device
  );
}

// --- Der Schlüssel ---------------------------------------------------------------

async function makeKey() {
  // Den Bereich nennt der Kontrakt, und den liest das Kit mit dem Schlüssel, den es schon hat.
  let link;
  try {
    link = await contractWith("api_key_ref");
  } catch (error) {
    fail(
      t(
        `To learn which scope the feedback key needs, the kit reads the device's contract with its deploy key first.\n${error.message}`,
        `Welchen Bereich der Schlüssel für Rückmeldungen braucht, liest das Kit zuerst mit seinem Deploy-Schlüssel aus dem Kontrakt.\n${error.message}`
      )
    );
  }
  const section = feedbackSection(link.contract);
  if (!section.ok) fail(section.message);
  const scope = section.scope;
  if (!scope) fail(t("The contract names no scope for feedback.", "Der Kontrakt nennt keinen Bereich für Rückmeldungen."));

  // Ein hinterlegter Schlüssel, der noch gilt, bleibt.
  const existingRef = device.fields[FEEDBACK_KEY_FIELD];
  if (existingRef && getSecret(existingRef)) {
    const still = await tryRead(existingRef);
    if (still.ok) {
      console.log(
        t(
          `The feedback key under ${existingRef} still works (the device answered). No second one was created.`,
          `Der Schlüssel für Rückmeldungen unter ${existingRef} gilt noch (das Gerät hat geantwortet). Ein zweiter wurde nicht angelegt.`
        )
      );
      return;
    }
  }

  const ref = `ARASUL_FEEDBACK_${secretSlug(device.customer, device.device)}`;
  const via = str(arg.via) || (str(arg["password-ref"]) ? "https" : "ssh");
  let made;
  let revokeAgain;
  if (via === "https") {
    const session = adminSession(device, arg);
    if (!session.ok) fail(session.reason);
    const ask = (method, path, options = {}) =>
      call({ base: link.base, insecure: link.insecure, key: `Bearer ${session.bearer}`, keyHeader: "Authorization", method, path, ...options });
    made = await createKeyApi(ask, {
      name: FEEDBACK_KEY_NAME,
      description: t(`Feedback for the agent, ${scope} only. Created by the Ara-Kit.`, `Rückmeldungen für den Agenten, nur ${scope}. Vom Ara-Kit angelegt.`),
      scope,
    });
    revokeAgain = async () => (made.id !== null ? (await revokeKeyApi(ask, made.id)).ok : false);
  } else {
    let ssh;
    try {
      ssh = sshArgs(device.fields, { batch: true }).args;
    } catch (error) {
      fail(error.message);
    }
    made = createKey(ssh, "ssh", FEEDBACK_KEY_NAME, scope);
    if (made.ok && !made.prefix) made.prefix = (listKeys(ssh, "ssh", made.key).mine || {}).prefix || "?";
    revokeAgain = async () => (made.prefix && made.prefix !== "?" ? revokeKey(ssh, "ssh", made.prefix).ok : false);
  }
  if (!made.ok) fail(t(`No feedback key: ${scrub(made.message)}`, `Kein Schlüssel für Rückmeldungen: ${scrub(made.message)}`));

  try {
    setSecret(ref, made.key);
  } catch (error) {
    // Ein gültiger Schlüssel, den niemand kennt, bleibt nicht liegen.
    const back = await revokeAgain();
    fail(
      t(
        `The key could not be stored (${error.message}). ${back ? "It was revoked again at once." : `Revoke it on the device: ${made.prefix}`}`,
        `Der Schlüssel ließ sich nicht ablegen (${error.message}). ${back ? "Er wurde sofort wieder widerrufen." : `Am Gerät widerrufen: ${made.prefix}`}`
      )
    );
  }
  made.key = null;
  writeFrontmatter(device.file, { [FEEDBACK_KEY_FIELD]: ref });
  device.fields[FEEDBACK_KEY_FIELD] = ref;

  const proof = await tryRead(ref);
  note(
    `Schlüssel für Rückmeldungen angelegt über ${via.toUpperCase()} („${FEEDBACK_KEY_NAME}“, ${made.prefix}), Bereich ${scope}, hinterlegt unter ${ref}. Klartext nur in der Ablage.` +
      (proof.ok ? " Kontrakt damit gelesen." : ` Kontrakt damit nicht lesbar: ${scrub(proof.message)}.`)
  );
  console.log(
    [
      t(`# Feedback key for ${place}`, `# Schlüssel für Rückmeldungen für ${place}`),
      "",
      t(`- Created as "${FEEDBACK_KEY_NAME}" (${made.prefix}) over ${via.toUpperCase()}, scope ${scope} only.`, `- Angelegt als „${FEEDBACK_KEY_NAME}“ (${made.prefix}) über ${via.toUpperCase()}, nur Bereich ${scope}.`),
      t(`- Stored under ${ref}. Its plain text is not displayed and stands in no file of the kit.`, `- Hinterlegt unter ${ref}. Sein Klartext wird nicht angezeigt und steht in keiner Datei des Kits.`),
      proof.ok
        ? t("- Checked: the device answers this key.", "- Geprüft: das Gerät beantwortet diesen Schlüssel.")
        : t(`- Not yet checked: ${scrub(proof.message)}`, `- Noch nicht geprüft: ${scrub(proof.message)}`),
      t(
        "- It reads the names of staff in the feedback. It does not deploy, and the deploy key does not read feedback.",
        "- Er liest die Namen von Mitarbeitern in den Meldungen. Ausrollen kann er nicht, und der Deploy-Schlüssel liest keine Meldungen."
      ),
      "",
      t(`Revoke: node .ara/tools/feedback.mjs${deviceFlags} --revoke-key`, `Widerrufen: node .ara/tools/feedback.mjs${deviceFlags} --revoke-key`),
    ].join("\n")
  );
  if (!proof.ok) process.exit(1);
}

/** Antwortet das Gerät dem Schlüssel unter `ref`? Gelesen wird nur der Kontrakt. */
async function tryRead(ref) {
  try {
    const fields = { ...device.fields, [FEEDBACK_KEY_FIELD]: ref };
    await withContract(connect({ ...device, fields }, { base: str(arg.base), insecure, keyField: FEEDBACK_KEY_FIELD, keyHint }), device);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error.message };
  }
}

async function dropKey() {
  const ref = device.fields[FEEDBACK_KEY_FIELD];
  const stored = ref ? getSecret(ref) : null;
  if (!ref || !stored) {
    fail(
      t(
        `No feedback key is stored for ${place}; nothing to revoke. What lies on the device: node .ara/tools/device.mjs${device.customer ? ` --customer ${device.customer}` : ""} --name ${device.device} --keys`,
        `Für ${place} ist kein Schlüssel für Rückmeldungen hinterlegt, es gibt nichts zu widerrufen. Was am Gerät liegt: node .ara/tools/device.mjs${device.customer ? ` --customer ${device.customer}` : ""} --name ${device.device} --keys`
      )
    );
  }
  const via = str(arg.via) || (str(arg["password-ref"]) ? "https" : "ssh");
  let done;
  let prefix = "?";
  if (via === "https") {
    const link = await contractWith(FEEDBACK_KEY_FIELD).catch((error) => fail(error.message));
    const session = adminSession(device, arg);
    if (!session.ok) fail(session.reason);
    const ask = (method, path, options = {}) =>
      call({ base: link.base, insecure: link.insecure, key: `Bearer ${session.bearer}`, keyHeader: "Authorization", method, path, ...options });
    const list = await listKeysApi(ask, stored);
    if (!list.ok || !list.mine) fail(list.message || t("The device does not list this key for this account.", "Das Gerät führt diesen Schlüssel für dieses Konto nicht."));
    prefix = list.mine.prefix;
    done = await revokeKeyApi(ask, list.mine.id);
  } else {
    const ssh = sshArgs(device.fields, { batch: true }).args;
    const list = listKeys(ssh, "ssh", stored);
    if (!list.ok) fail(scrub(list.message));
    if (!list.mine) {
      // Am 20.11.2026 (Plattform 0.8.17) führte das Skript des Geräts Schlüssel mit dem Bereich der
      // Rückmeldungen weder in seiner Liste noch beim Widerrufen. Dann bleibt der Weg über die
      // Verwaltung, und das Kit sagt ihn, statt einen fremden Schlüssel zu treffen.
      fail(
        t(
          `The device's key script does not list this key, so it cannot revoke it over SSH. Revoke it in the administration of ${place} under API keys (its prefix stands in the device file), or over HTTPS with the account that owns it: --revoke-key --via https --password-ref <NAME> --login-user <account>.`,
          `Das Schlüsselskript des Geräts führt diesen Schlüssel nicht, also kann es ihn über SSH nicht widerrufen. Widerrufen in der Verwaltung von ${place} unter API-Schlüssel (sein Präfix steht in der Geräteakte), oder über HTTPS mit dem Konto, dem er gehört: --revoke-key --via https --password-ref <NAME> --login-user <konto>.`
        )
      );
    }
    prefix = list.mine.prefix;
    done = revokeKey(ssh, "ssh", prefix);
  }
  if (!done.ok) fail(scrub(done.message));
  forgetSecret(ref);
  writeFrontmatter(device.file, { [FEEDBACK_KEY_FIELD]: "" });
  note(`Schlüssel für Rückmeldungen ${prefix} widerrufen, Eintrag ${ref} aus der Ablage genommen.`);
  console.log(
    t(
      `The feedback key ${prefix} is revoked on ${place}, ${ref} is out of the store and out of the file.`,
      `Der Schlüssel für Rückmeldungen ${prefix} ist an ${place} widerrufen, ${ref} ist aus der Ablage und aus der Akte.`
    )
  );
}

if (arg.key) {
  await makeKey();
  process.exit(0);
}
if (arg["revoke-key"]) {
  await dropKey();
  process.exit(0);
}

// --- Die Meldungen -----------------------------------------------------------------

const app = str(arg.app);
if (!app || !validName(app)) {
  fail(
    t(
      "Say which app: --app <id>, the id as it stands in app.json (lower case, digits, hyphens).",
      "Sag, welche App: --app <kennung>, die Kennung wie in app.json (Kleinbuchstaben, Ziffern, Bindestriche)."
    )
  );
}

let link;
try {
  link = await contractWith(FEEDBACK_KEY_FIELD);
} catch (error) {
  fail(error.message);
}
const section = feedbackSection(link.contract);
if (!section.ok) fail(section.message);

/** Ein Aufruf über den Kontrakt, mit Absagen in Sätzen. */
async function ask(verb, path, options = {}) {
  let answer;
  try {
    answer = await link.endpoint(verb, path, options);
  } catch (error) {
    fail(error.message);
  }
  if (answer.ok) return answer;
  if (answer.status === 403) {
    fail(
      t(
        `${place} refuses (403): ${reason(answer)}\nEither the key under ${link.keyRef} lacks the scope ${section.scope}, or the app does not allow screenshots. A new key: ${keyHint}`,
        `${place} lehnt ab (403): ${reason(answer)}\nEntweder fehlt dem Schlüssel unter ${link.keyRef} der Bereich ${section.scope}, oder die App erlaubt keine Bildschirmfotos. Ein neuer Schlüssel: ${keyHint}`
      )
    );
  }
  if (answer.status === 404) {
    fail(t(`${place} does not know this (404): ${reason(answer)}`, `${place} kennt das nicht (404): ${reason(answer)}`));
  }
  if (answer.status === 429) {
    const wait = answer.error?.details?.retryAfter;
    fail(
      t(
        `${place} wants a break: too many calls per minute.${wait ? ` Again in ${wait} seconds.` : ""}`,
        `${place} will eine Pause: zu viele Aufrufe je Minute.${wait ? ` Wieder in ${wait} Sekunden.` : ""}`
      )
    );
  }
  fail(reason(answer));
}

/** Die Meldungen der App, wie das Gerät sie liefert. */
async function readFeedback({ all }) {
  const reportedIn = str(arg["reported-in"]);
  if (reportedIn && !["test", "live"].includes(reportedIn)) {
    fail(t("--reported-in is test or live.", "--reported-in ist test oder live."));
  }
  const path = fillWay(section.ways.read, { app }) + readQuery({ all, reportedIn, limit: section.limit?.hoechstens || null });
  return (await ask("GET", path)).data;
}

// --image <nr>: ein Bildschirmfoto, nur mit Erlaubnis.
if (arg.image !== undefined) {
  const nr = Number(arg.image);
  if (!Number.isInteger(nr) || nr < 1) fail(t("--image takes the number of a feedback item.", "--image nimmt die Nummer einer Meldung."));
  const data = await readFeedback({ all: true });
  if (!data.bilder_an_agenten) {
    console.log(
      t(
        `Screenshots of ${data.app_name || app} do not go to the agent: the administrator has not allowed it for this app. The kit works with text, page and app. The image stays on the device, and the kit does not ask for it.`,
        `Bildschirmfotos von ${data.app_name || app} gehen nicht an den Agenten: der Admin hat es für diese App nicht erlaubt. Das Kit arbeitet mit Text, Seite und App. Das Bild bleibt am Gerät, und das Kit fragt nicht danach.`
      )
    );
    process.exit(0);
  }
  const meldung = (data.meldungen || []).find((entry) => entry.id === nr);
  if (!meldung) fail(t(`There is no feedback ${nr} for ${app}.`, `Zu ${app} gibt es keine Meldung ${nr}.`));
  if (!meldung.bild) {
    console.log(t(`Feedback ${nr} was sent without a screenshot.`, `Meldung ${nr} wurde ohne Bildschirmfoto abgeschickt.`));
    process.exit(0);
  }
  const way = section.ways.image ? fillWay(section.ways.image, { app, nr }) : null;
  if (!way) fail(t("The contract names no way to a screenshot.", "Der Kontrakt nennt keinen Weg zu einem Bildschirmfoto."));
  const answer = await ask("GET", way, { binary: true, timeout: 30_000 });
  const folder = join(ROOT, "apps", app, ".rueckmeldungen");
  mkdirSync(folder, { recursive: true });
  const file = join(folder, `${nr}.${meldung.bild.format || "png"}`);
  writeFileSync(file, answer.bytes);
  const mark = meldung.bild.markierung;
  console.log(
    [
      t(`Screenshot of feedback ${nr}: ${relative(ROOT, file)}`, `Bildschirmfoto der Meldung ${nr}: ${relative(ROOT, file)}`),
      mark
        ? t(
            `Marked spot (shares of width and height): x ${mark.x}, y ${mark.y}, width ${mark.breite}, height ${mark.hoehe}. It is also drawn into the image.`,
            `Markierte Stelle (Anteile von Breite und Höhe): x ${mark.x}, y ${mark.y}, Breite ${mark.breite}, Höhe ${mark.hoehe}. Sie ist auch ins Bild gezeichnet.`
          )
        : t("No spot marked.", "Keine Stelle markiert."),
      t(
        "It may show names and figures from the app. It stays in this folder, goes into no package, and is deleted when the feedback is done.",
        "Es kann Namen und Zahlen aus der App zeigen. Es bleibt in diesem Ordner, geht in kein Paket und wird gelöscht, wenn die Meldung erledigt ist."
      ),
    ].join("\n")
  );
  process.exit(0);
}

// --set <nr,...> --to <stand>: den Stand setzen.
if (arg.set !== undefined) {
  const numbers = String(arg.set)
    .split(",")
    .map((part) => Number(part.trim()));
  if (!numbers.length || numbers.some((nr) => !Number.isInteger(nr) || nr < 1)) {
    fail(t("--set takes numbers of feedback items, separated by commas: --set 7,9", "--set nimmt Nummern von Meldungen, mit Komma getrennt: --set 7,9"));
  }
  const to = str(arg.to);
  if (!to) fail(t(`--to names the state: ${section.states.join(", ")}.`, `--to nennt den Stand: ${section.states.join(", ")}.`));
  const why = str(arg.reason) || "";
  if (!section.ways.state) fail(t("The contract names no way to set a state.", "Der Kontrakt nennt keinen Weg, einen Stand zu setzen."));

  const data = await readFeedback({ all: true });
  const byNr = new Map((data.meldungen || []).map((entry) => [entry.id, entry]));
  const testDeploy = lastTestDeploy(readState(), app, place);
  // Erst alle prüfen, dann setzen: eine halb gesetzte Liste wäre schwerer zu erklären als eine Absage.
  for (const nr of numbers) {
    const verdict = checkStateChange({ meldung: byNr.get(nr), to, reason: why, testDeploy, states: section.states });
    if (!verdict.ok) fail(`${t("Nothing set.", "Nichts gesetzt.")} ${verdict.message}`);
  }
  const lines = [];
  for (const nr of numbers) {
    const answer = await ask("PATCH", fillWay(section.ways.state, { app, nr }), {
      json: { stand_meldung: to, ...(why ? { grund: why } : {}) },
    });
    lines.push(`${nr}: ${answer.data?.vorher ?? byNr.get(nr).stand_meldung} → ${answer.data?.stand_meldung ?? to}`);
  }
  note(`${app}: ${lines.join("; ")}${why ? ` (Grund: ${why.replace(/\s+/g, " ").slice(0, 200)})` : ""}. Gesetzt mit ${link.keyRef}.`);
  console.log(
    [
      t(`State set on ${place}, app ${app}:`, `Stand gesetzt an ${place}, App ${app}:`),
      ...lines.map((entry) => `- ${entry}`),
      t(
        "The staff member who reported learns nothing of it. The developer sees it in the device's list.",
        "Der Mitarbeiter, der gemeldet hat, erfährt davon nichts. Der Entwickler sieht es in der Liste am Gerät."
      ),
    ].join("\n")
  );
  process.exit(0);
}

// Ohne Weiteres: die Übersicht.
const all = Boolean(arg.all);
const data = await readFeedback({ all });
const ordered = orderFeedback(data.meldungen || []);
if (arg.json) {
  console.log(
    JSON.stringify(
      {
        device: place,
        app: data.app_id,
        app_name: data.app_name,
        bilder_an_agenten: Boolean(data.bilder_an_agenten),
        anzahl: data.anzahl,
        test_deploy: lastTestDeploy(readState(), app, place),
        order: ordered.map(({ group, ...entry }) => entry),
        meldungen: data.meldungen,
      },
      null,
      2
    )
  );
} else {
  console.log(renderOverview({ place, data, ordered, all }));
}
