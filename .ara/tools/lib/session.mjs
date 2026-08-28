/**
 * Die Sitzung eines Menschen am Gerät.
 *
 * Das Kit hat einen Schlüssel und keine Sitzung: der Kit-Schlüssel trägt
 * `app:deploy` und sonst nichts, und für alles, was ein Administrator tut, weist
 * das Gerät ihn ab. Das ist die Trennung, für die es ihn gibt.
 *
 * Trotzdem braucht es einen Weg vom Kit zu einer Sitzung. Am 28.08.2026 stand
 * der Fremdtest genau hier still: das Startpasswort lag in der Geheimnis-Ablage,
 * es kam von dort aber nicht heraus, und ohne Browser gab es keinen Weg an die
 * Plattform. Dieses Modul macht daraus einen Handgriff: das Passwort geht aus
 * der Ablage in die Anmeldung, und zurück kommt ein Ausweis. Angezeigt wird das
 * Passwort dabei nie.
 *
 * **Was hier über das Produkt steht, ist der Rückfall und nicht die Quelle.**
 * Nennt das Artefakt den Weg selbst, in `arasul-release.json`, gilt der. Nennt
 * ihn der Mensch im Aufruf, gilt seiner. Erst danach kommt, was unten steht, und
 * das Werkzeug sagt jedes Mal dazu, woher der Wert stammt.
 *
 * Reine Funktionen, ohne Netz und ohne Dateien, damit der Selbsttest sie mit
 * einem erfundenen Artefakt prüfen kann.
 */

/**
 * Der Rückfall, wenn weder Artefakt noch Mensch etwas sagen.
 *
 * Er stammt vom Produktteam und ist damit genau das, was jede andere
 * Produktangabe im Kit auch ist: eine Behauptung, die an einem Gerät geprüft
 * gehört. `check-docs.mjs` tut das, denn der Weg steht im Wissen des Kits.
 */
export const LOGIN_FALLBACK = Object.freeze({
  path: "/api/auth/login",
  user: "admin",
  userField: "benutzer",
  passwordField: "passwort",
});

/** Wo im Artefakt die Anmeldung beschrieben sein kann. */
const LOGIN_NODES = ["anmeldung", "login", "auth", "authentifizierung", "sitzung"];

/** Und unter welchen Namen die vier Angaben dort stehen können. */
const SPEC_FIELDS = {
  path: ["pfad", "path", "weg", "route", "url"],
  user: ["benutzer", "benutzername", "user", "username", "konto"],
  userField: ["benutzerfeld", "benutzer_feld", "user_field", "userfield"],
  passwordField: ["passwortfeld", "passwort_feld", "password_field", "passwordfield"],
};

/** Unter welchen Namen ein Ausweis in einer Antwort steht. */
export const TOKEN_FIELDS = Object.freeze([
  "token",
  "access_token",
  "accesstoken",
  "zugang",
  "sitzung",
  "jwt",
  "bearer",
  "id_token",
]);

/** Der Knoten im Artefakt, der von der Anmeldung handelt, oder das Artefakt selbst. */
function loginNode(release) {
  if (!release || typeof release !== "object") return null;
  for (const name of LOGIN_NODES) {
    const node = release[name];
    if (node && typeof node === "object") return node;
  }
  return null;
}

function fromNode(node, names) {
  if (!node) return null;
  for (const name of names) {
    const value = node[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

/**
 * Weg, Benutzername und Feldnamen für die Anmeldung, in dieser Reihenfolge:
 * was im Aufruf steht, dann was das Artefakt sagt, dann der Rückfall.
 *
 * Zurück kommt zu jedem Wert auch, woher er stammt. Das Werkzeug schreibt es
 * hin, denn der Unterschied zwischen „das Gerät hat es gesagt" und „das Kit
 * nimmt es an" ist der ganze Punkt.
 */
export function loginSpec(release, overrides = {}) {
  const node = loginNode(release);
  const spec = { sources: {} };
  for (const [key, names] of Object.entries(SPEC_FIELDS)) {
    const wanted = typeof overrides[key] === "string" && overrides[key].trim() ? overrides[key].trim() : null;
    const named = fromNode(node, names);
    if (wanted) {
      spec[key] = wanted;
      spec.sources[key] = "aufruf";
    } else if (named) {
      spec[key] = named;
      spec.sources[key] = "artefakt";
    } else {
      spec[key] = LOGIN_FALLBACK[key];
      spec.sources[key] = "kit";
    }
  }
  return spec;
}

/** Der Rumpf der Anmeldung. Das Passwort steht nur hier und in keiner Ausgabe. */
export function loginBody(spec, password) {
  return { [spec.userField]: spec.user, [spec.passwordField]: password };
}

/**
 * Der Ausweis aus der Antwort des Geräts.
 *
 * Gesucht wird unter den Namen, die eine Sitzung tragen kann, und auch eine
 * Ebene tiefer: manche Antworten legen ihn in einen Umschlag. Findet das Kit
 * keinen, behauptet es keinen.
 */
export function pickToken(node, depth = 0) {
  if (typeof node === "string") {
    const value = node.trim();
    return value || null;
  }
  if (!node || typeof node !== "object" || depth > 3) return null;
  for (const field of TOKEN_FIELDS) {
    if (!(field in node)) continue;
    const found = pickToken(node[field], depth + 1);
    if (found) return found;
  }
  for (const value of Object.values(node)) {
    if (!value || typeof value !== "object") continue;
    const found = pickToken(value, depth + 1);
    if (found) return found;
  }
  return null;
}
