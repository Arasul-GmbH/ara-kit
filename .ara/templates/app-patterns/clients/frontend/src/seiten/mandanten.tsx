/**
 * Muster Mandanten: die Verwaltungsseite, und die Auswahl des Mandanten beim
 * Einreichen.
 *
 * Liegt in einer App aus der Vorlage unter `frontend/src/seiten/mandanten.tsx`.
 * Eingehängt wird sie mit einem Weg in `app.tsx` und einem Eintrag in
 * `rahmen/seitenleiste.tsx`, der nur für die Verwaltung dasteht:
 *
 *   <Route path="/mandanten" element={<Mandanten />} />
 *
 *   const { data } = useMandanten();
 *   ...(data?.verwaltung
 *     ? [{ titel: "Verwaltung", eintraege: [{ kennung: "weg-mandanten", name: "Mandanten", symbol: <UsersIcon />,
 *           aktiv: ort.pathname === "/mandanten", aufKlick: () => gehe("/mandanten") }] }]
 *     : [])
 *
 * In `seiten/neu.tsx` kommt `MandantWahl` als erste Feldgruppe dazu, und
 * `useAnlegenBeiMandant` aus `../mandanten` ersetzt `useEinreichen`. Der
 * Knopf heißt dann „Anlegen": der Vorgang entsteht in Arbeit.
 *
 *   const [mandant, setMandant] = useState("");
 *   const einreichen = useAnlegenBeiMandant();
 *   ...
 *   einreichen.mutate({ titel, text, mandant: Number(mandant) }, { onSuccess: () => weiter("/") });
 *   ...
 *   <MandantWahl wert={mandant} aufWert={setMandant} />
 *
 * Eingereicht wird in den Einzelheiten, in `Angaben` von `seiten/liste.tsx`:
 *
 *   import { VorgangEinreichen } from "./mandanten";
 *   ...
 *   <VorgangEinreichen vorgang={vorgang} />
 *
 * **Wer die Seite sieht, sagt das Backend.** Sie fragt `api/zuordnungen` nur,
 * wenn `api/mandanten` die Verwaltung bestätigt. Ruft jemand sie über die
 * Adresse auf, steht ein Satz da und keine Liste: das Backend hätte ohnehin
 * mit 403 geantwortet.
 *
 * **Zugeordnet wird aus den gesehenen Konten.** Die App kann die Konten des
 * Geräts nicht auflisten. Wer neu ist, öffnet sie einmal, danach steht er hier.
 */

import { useState } from "react";
import {
  Button,
  Checkbox,
  Datenliste,
  Feldgruppe,
  Input,
  Karte,
  Kopf,
  Label,
  Meldung,
  Suchauswahl,
  type Spalte,
} from "@marken";
import { AsyncBoundary } from "../rahmen/async-boundary";
import {
  useLoesen,
  useMandantAnlegen,
  useMandanten,
  useVerwaltung,
  useVorgangEinreichen,
  useZuordnen,
  type Konto,
  type Mandant,
  type Zuordnung,
} from "../mandanten";
import { zeitpunkt, type Vorgang } from "../vorgaenge";

/** Der Satz zu einem Fehler der Schnittstelle, oder ein allgemeiner. */
function satz(fehler: unknown): string {
  return fehler instanceof Error ? fehler.message : "Die Schnittstelle hat nicht geantwortet.";
}

/**
 * Die Auswahl des Mandanten für ein Formular. Sie zeigt nur, was dieser Mensch
 * sieht; ein fremder Mandant steht nicht zur Wahl, und schickte ihn jemand von
 * Hand, antwortete das Backend mit 404.
 */
export function MandantWahl({ wert, aufWert }: { wert: string; aufWert: (wert: string) => void }) {
  const abfrage = useMandanten();
  return (
    <Feldgruppe titel="Mandant" beschreibung="Zu wem der Vorgang gehört. Sehen und entscheiden können ihn nur die Zugeordneten.">
      <AsyncBoundary abfrage={abfrage} laedt="Mandanten werden geholt">
        {({ mandanten }) =>
          mandanten.length ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="mandant">Mandant</Label>
              <Suchauswahl
                id="mandant"
                moeglichkeiten={mandanten.map((m) => ({ wert: String(m.id), name: m.name }))}
                wert={wert}
                aufWert={aufWert}
                platzhalter="Mandant wählen"
              />
            </div>
          ) : (
            <Meldung art="hinweis" titel="Dir ist noch kein Mandant zugeordnet">
              Das macht die Verwaltung dieser App. Danach steht er hier.
            </Meldung>
          )
        }
      </AsyncBoundary>
    </Feldgruppe>
  );
}

/**
 * Einreichen, solange der Vorgang in Arbeit ist. Fehlt noch etwas, steht der
 * Satz des Backends da, und der Vorgang bleibt in Arbeit. Danach verschwindet
 * der Knopf: was eingereicht ist, ändert sich nicht mehr.
 */
export function VorgangEinreichen({ vorgang }: { vorgang: Vorgang }) {
  const einreichen = useVorgangEinreichen(vorgang.id);
  if (vorgang.status !== "in arbeit") return null;
  return (
    <div className="flex flex-col gap-2" data-kennzeichen="einreichen">
      {einreichen.isError && (
        <Meldung art="hinweis" titel="Noch nicht eingereicht">
          {satz(einreichen.error)}
        </Meldung>
      )}
      <Button variant="solid" className="self-end" disabled={einreichen.isPending} onClick={() => einreichen.mutate()}>
        {einreichen.isPending ? "Wird eingereicht …" : "Einreichen"}
      </Button>
    </div>
  );
}

function Verwalten({ mandanten, konten, zuordnungen }: { mandanten: Mandant[]; konten: Konto[]; zuordnungen: Zuordnung[] }) {
  const [name, setName] = useState("");
  const [konto, setKonto] = useState("");
  const [mandant, setMandant] = useState("");
  const [entscheidet, setEntscheidet] = useState(false);
  const anlegen = useMandantAnlegen();
  const zuordnen = useZuordnen();
  const loesen = useLoesen();
  const nameVon = new Map(mandanten.map((m) => [m.id, m.name]));

  const spaltenZuordnung: ReadonlyArray<Spalte<Zuordnung>> = [
    { schluessel: "benutzer", titel: "Konto", zelle: (z) => z.benutzer, wert: (z) => z.benutzer },
    { schluessel: "mandant", titel: "Mandant", zelle: (z) => nameVon.get(z.mandant) ?? z.mandant, wert: (z) => nameVon.get(z.mandant) ?? "" },
    {
      schluessel: "entscheidet",
      titel: "Darf",
      zelle: (z) => (
        // Umschalten ist dieselbe Zuordnung noch einmal, mit der anderen Angabe.
        <Button
          variant="ghost"
          disabled={zuordnen.isPending}
          onClick={() => zuordnen.mutate({ benutzer: z.benutzer, mandant: z.mandant, entscheidet: !z.entscheidet })}
          title={z.entscheidet ? "Nur noch sehen lassen" : "Entscheiden lassen"}
          data-kennzeichen="entscheidet"
        >
          {z.entscheidet ? "sieht und entscheidet" : "sieht"}
        </Button>
      ),
      wert: (z) => (z.entscheidet ? "entscheidet" : "sieht"),
    },
    { schluessel: "seit", titel: "Seit", zelle: (z) => `${zeitpunkt(z.seit)}, von ${z.zugeordnet_von}`, wert: (z) => z.seit },
    {
      schluessel: "loesen",
      titel: "",
      ausrichtung: "rechts",
      zelle: (z) => (
        <Button
          variant="ghost"
          disabled={loesen.isPending}
          onClick={() => loesen.mutate({ benutzer: z.benutzer, mandant: z.mandant })}
          data-kennzeichen="loesen"
        >
          Lösen
        </Button>
      ),
    },
  ];

  const spaltenKonto: ReadonlyArray<Spalte<Konto>> = [
    { schluessel: "benutzer", titel: "Konto", zelle: (k) => k.benutzer, wert: (k) => k.benutzer },
    { schluessel: "zuerst", titel: "Zuerst gesehen", zelle: (k) => zeitpunkt(k.zuerst), wert: (k) => k.zuerst },
    { schluessel: "zuletzt", titel: "Zuletzt gesehen", zelle: (k) => zeitpunkt(k.zuletzt), wert: (k) => k.zuletzt },
  ];

  const fehler = anlegen.error ?? zuordnen.error ?? loesen.error;

  return (
    <>
      {fehler && (
        <Meldung art="fehler" titel="Das ging nicht">
          {satz(fehler)}
        </Meldung>
      )}

      <Karte titel="Neuer Mandant" kennzeichen="mandant-neu">
        <form
          className="flex flex-col gap-2"
          onSubmit={(ereignis) => {
            ereignis.preventDefault();
            if (name.trim()) anlegen.mutate(name, { onSuccess: () => setName("") });
          }}
        >
          <Label htmlFor="mandant-name">Name</Label>
          <Input id="mandant-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          <div className="flex justify-end">
            <Button type="submit" variant="solid" disabled={!name.trim() || anlegen.isPending} data-kennzeichen="mandant-anlegen">
              Anlegen
            </Button>
          </div>
        </form>
      </Karte>

      <Karte
        titel="Zuordnen"
        hinweis="Zur Wahl steht, wer die App schon einmal geöffnet hat. Sehen heißt nicht entscheiden: freigeben darf nur, wer als Entscheider markiert ist."
        kennzeichen="zuordnen"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="zuordnen-konto">Konto</Label>
          <Suchauswahl
            id="zuordnen-konto"
            moeglichkeiten={konten.map((k) => ({ wert: k.benutzer, name: k.benutzer, hinweis: `zuletzt ${zeitpunkt(k.zuletzt)}` }))}
            wert={konto}
            aufWert={setKonto}
            platzhalter="Konto wählen"
          />
          <Label htmlFor="zuordnen-mandant">Mandant</Label>
          <Suchauswahl
            id="zuordnen-mandant"
            moeglichkeiten={mandanten.map((m) => ({ wert: String(m.id), name: m.name }))}
            wert={mandant}
            aufWert={setMandant}
            platzhalter="Mandant wählen"
          />
          <div className="flex items-center gap-2">
            <Checkbox id="zuordnen-entscheidet" checked={entscheidet} onCheckedChange={(wert) => setEntscheidet(wert === true)} />
            <Label htmlFor="zuordnen-entscheidet">Entscheidet über die Vorgänge dieses Mandanten</Label>
          </div>
          <div className="flex justify-end">
            <Button
              variant="solid"
              disabled={!konto || !mandant || zuordnen.isPending}
              onClick={() => zuordnen.mutate({ benutzer: konto, mandant: Number(mandant), entscheidet })}
              data-kennzeichen="zuordnen"
            >
              Zuordnen
            </Button>
          </div>
        </div>
      </Karte>

      <Datenliste
        daten={zuordnungen}
        spalten={spaltenZuordnung}
        kennung={(z) => `${z.benutzer}-${z.mandant}`}
        beschriftung={`Zuordnungen: ${zuordnungen.length}`}
        filter
        filterPlatzhalter="In den Zuordnungen suchen …"
        leer={{ titel: "Noch niemand ist zugeordnet." }}
      />

      <Datenliste
        daten={konten}
        spalten={spaltenKonto}
        kennung={(k) => k.benutzer}
        beschriftung={`Gesehene Konten: ${konten.length}`}
        leer={{ titel: "Noch hat niemand die App geöffnet." }}
      />
    </>
  );
}

export function Mandanten() {
  const uebersicht = useMandanten();
  const verwaltung = useVerwaltung(uebersicht.data?.verwaltung === true);

  return (
    <>
      <Kopf titel="Mandanten" beschreibung="Wer welchen Mandanten sieht und über seine Vorgänge entscheidet." />
      <AsyncBoundary abfrage={uebersicht} laedt="Mandanten werden geholt">
        {({ verwaltung: darf }) =>
          darf ? (
            <AsyncBoundary abfrage={verwaltung} laedt="Zuordnungen werden geholt">
              {(daten) => <Verwalten {...daten} />}
            </AsyncBoundary>
          ) : (
            <Meldung art="hinweis" titel="Mandanten pflegt die Verwaltung">
              Welche Mandanten du siehst, legt die Verwaltung dieser App fest.
            </Meldung>
          )
        }
      </AsyncBoundary>
    </>
  );
}
