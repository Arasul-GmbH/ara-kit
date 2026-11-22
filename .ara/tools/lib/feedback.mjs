/**
 * Die Rückmeldungen einer App, für `/feedback`.
 *
 * Mitarbeiter melden über das Icon im Rahmen von Arasul, was in einer App fehlt oder nicht stimmt.
 * Das Gerät hält die Meldungen, und ein Kit holt sie mit einem eigenen Schlüssel in die Sitzung.
 * Dieses Modul ordnet sie und prüft, ob ein neuer Stand erlaubt ist. **Kein Produktwert steht
 * hier:** Wege, Stände und Bereich stehen im Kontrakt des Geräts, Abschnitt `rueckmeldungen`.
 *
 * Was das Kit hier selbst festlegt, ist seine eigene Arbeitsweise, keine Aussage über das Gerät:
 *
 * - **Offen** heißt: noch nicht umgesetzt und nicht abgelehnt.
 * - **Umgesetzt** setzt das Kit nur nach einem Ausrollen in den Teststand, das jünger ist als die
 *   Annahme der Meldung. Live schaltet der Mensch, nie dieser Befehl.
 * - **Abgelehnt** braucht einen Grund, auch wenn das Gerät ihn anmahnen würde: ein Satz vorher ist
 *   besser als eine Absage hinterher.
 * - Ob eine Meldung ein Fehler oder ein Wunsch ist und welche doppelt sind, schätzt dieses Modul
 *   nur vor. Der Agent liest jede Meldung selbst und der Mensch entscheidet.
 *
 * Reine Funktionen, ohne Netz und ohne Dateien, damit der Selbsttest sie prüfen kann.
 */

import { t } from "./i18n.mjs";

/** Der Name des Schlüsselfelds in der Geräteakte. Der Eintrag dahinter liegt in der Ablage. */
export const FEEDBACK_KEY_FIELD = "feedback_key_ref";

/** Wie der Schlüssel am Gerät heißt, damit der Admin ihn in seiner Liste wiedererkennt. */
export const FEEDBACK_KEY_NAME = "Rückmeldungen (Ara-Kit)";

/** Die Stände, mit denen dieses Kit arbeitet. Sie müssen im Kontrakt stehen, sonst hält es an. */
const KIT_STATES = Object.freeze({ new: "neu", accepted: "angenommen", done: "umgesetzt", rejected: "abgelehnt" });

/** Was als offen gilt: neu oder angenommen. */
export const OPEN_STATES = Object.freeze([KIT_STATES.new, KIT_STATES.accepted]);

/**
 * Der Abschnitt `rueckmeldungen` aus dem Kontrakt, geprüft.
 *
 * Fehlt er, kennt das Gerät die Schnittstelle nicht, und das Kit ruft nichts auf, was das Gerät
 * nicht verspricht. Fehlt ein Stand, mit dem das Kit arbeitet, sagt es das, statt zu raten.
 */
export function feedbackSection(contract) {
  const section = contract?.rueckmeldungen;
  if (!section || typeof section !== "object" || !section.wege?.lesen) {
    return {
      ok: false,
      message: t(
        "This device names no feedback in its contract (section `rueckmeldungen`). Its platform is older than the feedback interface; it needs an update first.",
        "Dieses Gerät nennt in seinem Kontrakt keine Rückmeldungen (Abschnitt `rueckmeldungen`). Seine Plattform ist älter als die Schnittstelle dafür; zuerst braucht es ein Update."
      ),
    };
  }
  const states = Array.isArray(section.staende) ? section.staende.map(String) : [];
  const missing = Object.values(KIT_STATES).filter((state) => !states.includes(state));
  if (missing.length) {
    return {
      ok: false,
      message: t(
        `The device names the states ${states.join(", ") || "(none)"}; this kit works with ${Object.values(KIT_STATES).join(", ")} and misses ${missing.join(", ")}. Nothing is set.`,
        `Das Gerät nennt die Stände ${states.join(", ") || "(keine)"}; dieses Kit arbeitet mit ${Object.values(KIT_STATES).join(", ")} und vermisst ${missing.join(", ")}. Gesetzt wird nichts.`
      ),
    };
  }
  return {
    ok: true,
    scope: section.bereich || null,
    ways: { read: section.wege.lesen, image: section.wege.bild || null, state: section.wege.stand || null },
    states,
    limit: section.grenze || null,
    rules: Array.isArray(section.regeln) ? section.regeln : [],
  };
}

/** Ein Weg aus dem Kontrakt mit eingesetzter App und Nummer. Die Abfrage hinter `?` fällt weg. */
export function fillWay(way, { app, nr = null }) {
  return String(way)
    .split("?")[0]
    .replace(":id", encodeURIComponent(app))
    .replace(":nr", nr === null ? ":nr" : encodeURIComponent(String(nr)));
}

/** Die Abfrage für das Lesen. Ohne Angabe die offenen, `all` alle. */
export function readQuery({ all = false, reportedIn = null, limit = null } = {}) {
  const parts = [];
  if (!all) parts.push(`stand_meldung=${OPEN_STATES.join(",")}`);
  if (reportedIn) parts.push(`stand=${encodeURIComponent(reportedIn)}`);
  if (limit) parts.push(`grenze=${encodeURIComponent(String(limit))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

// --- Vorsortieren --------------------------------------------------------------

/**
 * Wörter, an denen eine Meldung als Fehler erkennbar ist. Nur eine Vorsortierung: „fehlt“ ist fast
 * immer ein Wunsch, „geht nicht“ fast immer ein Fehler, und der Agent liest den Text ohnehin.
 */
const BUG_WORDS = [
  /geht nicht/, /funktioniert nicht/, /reagiert nicht/, /l[äa]dt nicht/, /kaputt/, /fehler/, /falsch/, /abst[üu]rz/,
  /h[äa]ngt/, /verschwind/, /stimmt nicht/, /leer\b/, /\bweg\b/, /nicht mehr/, /bricht ab/, /dauert ewig/,
  /error/, /broken/, /doesn'?t work/, /does not work/, /crash/, /wrong/, /not working/, /\bbug\b/,
];
const WISH_WORDS = [
  /\bfehlt\b/, /h[äa]tte gern/, /w[äa]re (sch[öo]n|gut|praktisch|toll)/, /\bbitte\b/, /\bw[üu]nsch/, /k[öo]nnte man/,
  /sollte/, /\bneu(e|er|es)?\b/, /zus[äa]tzlich/, /\bfilter/, /\bsortier/, /\bexport/, /\boption/,
  /would like/, /please/, /\bmissing\b/, /could you/, /\bwish/, /\badd\b/,
];

/** Fehler, Wunsch oder unklar. */
export function guessKind(text) {
  const lower = String(text || "").toLowerCase();
  const bug = BUG_WORDS.some((pattern) => pattern.test(lower));
  const wish = WISH_WORDS.some((pattern) => pattern.test(lower));
  if (bug && !wish) return "fehler";
  if (wish && !bug) return "wunsch";
  // Beides: „Der Filter fehlt, die Liste ist leer“. Ein Fehler wiegt schwerer.
  if (bug && wish) return "fehler";
  return "unklar";
}

const STOP = new Set(
  "der die das den dem des ein eine einen einem einer und oder aber ich wir sie er es ist sind war bei mit von zu im in am an auf für fur nicht noch auch nur hier da dann wenn man mal so wie was wo the a an and or is are to of in on for it this that".split(
    " "
  )
);

/** Die Wörter einer Meldung, kleingeschrieben und auf ihren Stamm gekürzt (die ersten fünf Zeichen). */
function words(text) {
  return new Set(
    String(text || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .split(/[^a-z0-9ß]+/)
      .filter((word) => word.length > 2 && !STOP.has(word))
      .map((word) => word.slice(0, 5))
  );
}

/** Wie ähnlich zwei Texte sind, 0 bis 1 (Anteil gemeinsamer Wortstämme). */
export function similarity(a, b) {
  const left = words(a);
  const right = words(b);
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const word of left) if (right.has(word)) shared += 1;
  return shared / (left.size + right.size - shared);
}

/** Die Seite ohne Abfrage und ohne den Unterschied zwischen Test und Live. */
function pageOf(meldung) {
  return String(meldung.seite || "")
    .split("?")[0]
    .replace(/\/test(\/|$)/, "/")
    .replace(/\/+$/, "");
}

/**
 * Welche Meldungen vermutlich dasselbe meinen. Zurück kommen Gruppen von Nummern, älteste zuerst;
 * jede Meldung steht in genau einer Gruppe. Gleiche Seite senkt die Schwelle.
 */
export function duplicateGroups(meldungen) {
  const list = [...meldungen];
  const parent = list.map((_, index) => index);
  const root = (index) => (parent[index] === index ? index : (parent[index] = root(parent[index])));
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const score = similarity(list[i].text, list[j].text);
      const samePage = pageOf(list[i]) && pageOf(list[i]) === pageOf(list[j]);
      if (score >= 0.5 || (samePage && score >= 0.3)) parent[root(j)] = root(i);
    }
  }
  const groups = new Map();
  list.forEach((meldung, index) => {
    const key = root(index);
    groups.set(key, [...(groups.get(key) || []), meldung]);
  });
  return [...groups.values()].map((group) =>
    group.sort((a, b) => String(a.erstellt_am).localeCompare(String(b.erstellt_am)) || a.id - b.id)
  );
}

const KIND_RANK = { fehler: 0, unklar: 1, wunsch: 2 };

/**
 * Die Meldungen geordnet, als Vorschlag für eine Reihenfolge.
 *
 * Erst Fehler, dann Unklares, dann Wünsche; innerhalb davon zuerst, was mehrere gemeldet haben,
 * dann was aus der Live-Fassung kommt (dort arbeiten Menschen damit), dann die ältere. Jeder
 * Eintrag ist eine Gruppe: die älteste Meldung vorn, die übrigen als vermutlich doppelt.
 */
export function orderFeedback(meldungen) {
  const entries = duplicateGroups(meldungen).map((group) => {
    const kinds = group.map((meldung) => guessKind(meldung.text));
    const kind = kinds.includes("fehler") ? "fehler" : kinds.includes("unklar") ? "unklar" : "wunsch";
    const first = group[0];
    return {
      nr: first.id,
      duplicates: group.slice(1).map((meldung) => meldung.id),
      kind,
      count: group.length,
      live: group.some((meldung) => meldung.stand === "live"),
      text: first.text,
      seite: first.seite,
      stand_meldung: first.stand_meldung,
      first: first.erstellt_am,
      group,
    };
  });
  entries.sort(
    (a, b) =>
      KIND_RANK[a.kind] - KIND_RANK[b.kind] ||
      b.count - a.count ||
      Number(b.live) - Number(a.live) ||
      String(a.first).localeCompare(String(b.first))
  );
  return entries.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

// --- Den Stand setzen ----------------------------------------------------------

/**
 * Darf dieser Stand gesetzt werden? Geprüft vor jedem Aufruf, damit die Absage ein Satz ist.
 *
 * `testDeploy` ist die Zeit des letzten Ausrollens dieser App in den Teststand dieses Geräts, aus
 * dem Merker des Kits (`.ara/state.json`), oder `null`.
 */
export function checkStateChange({ meldung, to, reason = "", testDeploy = null, states = Object.values(KIT_STATES) }) {
  const fail = (message) => ({ ok: false, message });
  if (!states.includes(to)) {
    return fail(
      t(
        `"${to}" is not a state the device knows. Possible: ${states.join(", ")}.`,
        `„${to}“ ist kein Stand, den das Gerät kennt. Möglich: ${states.join(", ")}.`
      )
    );
  }
  if (!meldung) return fail(t("This feedback does not exist for this app.", "Diese Rückmeldung gibt es zu dieser App nicht."));
  const nr = meldung.id;
  if (to === KIT_STATES.rejected && !String(reason || "").trim()) {
    return fail(
      t(
        `Feedback ${nr} gets rejected only with a reason, in one sentence the developer can read later: --reason "…".`,
        `Meldung ${nr} wird nur mit einem Grund abgelehnt, in einem Satz, den der Entwickler später versteht: --reason "…".`
      )
    );
  }
  if (to === KIT_STATES.done) {
    if (meldung.stand_meldung !== KIT_STATES.accepted) {
      return fail(
        t(
          `Feedback ${nr} stands at "${meldung.stand_meldung}". Implemented follows accepted: first accept it, change the test version, roll it out, then set it.`,
          `Meldung ${nr} steht auf „${meldung.stand_meldung}“. Umgesetzt folgt auf angenommen: erst annehmen, die Testfassung ändern, ausrollen, dann setzen.`
        )
      );
    }
    const accepted = meldung.stand_geaendert_am ? Date.parse(meldung.stand_geaendert_am) : NaN;
    const deployed = testDeploy ? Date.parse(testDeploy) : NaN;
    if (Number.isNaN(deployed)) {
      return fail(
        t(
          `Feedback ${nr} is implemented only after the change went into the test version. This kit has not rolled the app into staging on this device yet: app.mjs --deploy.`,
          `Meldung ${nr} ist erst umgesetzt, wenn die Änderung in der Testfassung steht. Dieses Kit hat die App an diesem Gerät noch nicht in den Teststand gerollt: app.mjs --deploy.`
        )
      );
    }
    if (!Number.isNaN(accepted) && deployed <= accepted) {
      return fail(
        t(
          `Feedback ${nr} was accepted at ${meldung.stand_geaendert_am}, the last rollout into staging is older (${testDeploy}). First change and roll out, then set it.`,
          `Meldung ${nr} wurde am ${meldung.stand_geaendert_am} angenommen, das letzte Ausrollen in den Teststand ist älter (${testDeploy}). Erst ändern und ausrollen, dann setzen.`
        )
      );
    }
  }
  return { ok: true };
}

/** Die Zeit des letzten Ausrollens in den Teststand aus dem Merker, für eine App an einem Gerät. */
export function lastTestDeploy(state, app, place) {
  const deployed = state?.apps?.[app]?.[place]?.deployed;
  if (!deployed || (deployed.stand && deployed.stand !== "test")) return null;
  return deployed.at || localToIso(deployed.time) || null;
}

/**
 * Die Zeit im Merker ist lokale Zeit ohne Zone (`now()` des Kits: `JJJJ-MM-TT HH:MM`). Für den
 * Vergleich mit der Zeit des Geräts (ISO, UTC) wird sie in ein ISO-Datum gewandelt.
 */
export function localToIso(text) {
  const match = String(text || "").match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return text || null;
  const [, y, mo, d, h, mi, s] = match.map(Number);
  // Die Minute des Merkers ist abgeschnitten. Für „nach der Annahme ausgerollt“ zählt die volle
  // Minute: ein Ausrollen in derselben Minute wie die Annahme ist das Ende dieser Minute.
  return new Date(y, mo - 1, d, h, mi, s || 59, 999).toISOString();
}

// --- Für den Menschen ----------------------------------------------------------

/**
 * Die Zeit einer Meldung, wie das Gerät sie liefert (ISO, UTC), lesbar: `JJJJ-MM-TT HH:MM (GMT+1)`
 * in der Zeitzone dieses Rechners, mit der Zone dabei. Ohne Zone im Text (kein `Z`, kein Versatz)
 * bleibt der Text, wie er ist. `zone` nur für den Selbsttest.
 */
export function readableTime(iso, zone) {
  const text = String(iso || "");
  if (!/(Z|[+-]\d{2}:?\d{2})$/.test(text)) return text.slice(0, 16).replace("T", " ");
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text.slice(0, 16).replace("T", " ");
  const options = { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZoneName: "shortOffset", ...(zone ? { timeZone: zone } : {}) };
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", options).formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute} (${parts.timeZoneName})`;
}

/** Ein Anteil von Breite oder Höhe (0 bis 1) als ganze Prozent. */
export function wholePercent(share) {
  const number = Number(share);
  return Number.isFinite(number) ? `${Math.round(number * 100)} %` : "?";
}

const KIND_LABEL = () => ({ fehler: t("bug", "Fehler"), wunsch: t("wish", "Wunsch"), unklar: t("unclear", "unklar") });

/** Eine Zeile Text, gekürzt, ohne Zeilenumbrüche. */
function line(text, length = 160) {
  const flat = String(text || "").replace(/\s+/g, " ").trim();
  return flat.length > length ? `${flat.slice(0, length - 1)}…` : flat;
}

/** Die Übersicht als Text, so wie ein Mensch sie im Terminal liest. */
export function renderOverview({ place, data, ordered, all = false }) {
  const label = KIND_LABEL();
  const name = data.app_name || data.app_id;
  const lines = [
    t(`# Feedback on ${name} (${data.app_id}) from ${place}`, `# Rückmeldungen zu ${name} (${data.app_id}) von ${place}`),
    "",
    data.bilder_an_agenten
      ? t(
          "Screenshots: allowed for this app. Fetch one with --image <nr>; it stays on this computer in the app's folder.",
          "Bildschirmfotos: für diese App erlaubt. Eines holen mit --image <nr>; es bleibt auf diesem Rechner im Ordner der App."
        )
      : t(
          "Screenshots: not allowed for this app, so the kit works without images. Text, page and app arrive; the image stays on the device. The administrator switches it per app (Settings, Apps, Feedback).",
          "Bildschirmfotos: für diese App nicht erlaubt, also arbeitet das Kit ohne Bild. Text, Seite und App kommen an, das Bild bleibt am Gerät. Der Admin schaltet es je App (Verwaltung, Apps, Rückmeldungen)."
        ),
    "",
  ];
  if (!ordered.length) {
    lines.push(
      all
        ? t("There is no feedback for this app.", "Zu dieser App gibt es keine Rückmeldung.")
        : t("Nothing open: no feedback stands at new or accepted.", "Nichts offen: keine Meldung steht auf neu oder angenommen.")
    );
    return lines.join("\n");
  }
  lines.push(
    t(
      `${data.anzahl} ${all ? "" : "open "}feedback item${data.anzahl === 1 ? "" : "s"}, in ${ordered.length} topic${ordered.length === 1 ? "" : "s"}. Proposed order:`,
      `${data.anzahl} ${all ? "" : "offene "}Meldung${data.anzahl === 1 ? "" : "en"}, in ${ordered.length} Anliegen. Vorgeschlagene Reihenfolge:`
    ),
    ""
  );
  for (const entry of ordered) {
    const same = entry.duplicates.length
      ? t(` · probably the same as ${entry.duplicates.join(", ")}`, ` · vermutlich dasselbe wie ${entry.duplicates.join(", ")}`)
      : "";
    lines.push(
      `${entry.rank}. [${label[entry.kind]}] ${t("No.", "Nr.")} ${entry.nr}${same} · ${entry.stand_meldung}${entry.live ? " · live" : " · test"}`
    );
    for (const meldung of entry.group) {
      const who = meldung.person?.anzeigeName || t("(person deleted)", "(Person gelöscht)");
      const image =
        "bild" in meldung
          ? meldung.bild
            ? t(" · with screenshot", " · mit Bildschirmfoto")
            : t(" · without screenshot", " · ohne Bildschirmfoto")
          : "";
      lines.push(`   - ${meldung.id}: „${line(meldung.text)}“`);
      lines.push(`     ${meldung.seite || "?"} · ${who} · ${readableTime(meldung.erstellt_am)}${image}`);
      if (meldung.grund) lines.push(`     ${t("Reason", "Grund")}: ${line(meldung.grund)}`);
    }
  }
  lines.push(
    "",
    t(
      "Bug, wish and duplicates are a first sorting by words, nothing more. Read every text yourself before you propose.",
      "Fehler, Wunsch und Doppelte sind eine erste Sortierung nach Wörtern, mehr nicht. Lies jeden Text selbst, bevor du vorschlägst."
    )
  );
  return lines.join("\n");
}
