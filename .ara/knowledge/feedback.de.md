# Verfahren: die Rückmeldungen einer App umsetzen

> **Wann brauchst du das?** Bei `/feedback`, und immer dann, wenn jemand sagt „was haben die Leute
> gemeldet?“, „schau mal, was zur Belege-App reingekommen ist“ oder „arbeite die Meldungen ab“.

## Was es ist, in einfachen Worten

Über jeder App auf einem Gerät mit Arasul sitzt oben rechts ein kleines Icon. Damit sagt ein
Mitarbeiter in freien Worten, was fehlt oder nicht stimmt, und markiert auf einem Bildschirmfoto die
Stelle. Das ist eine **Rückmeldung** (kurz: Meldung). App, Seite, Person und Zeit hängt das Gerät
selbst an. Lesen darf die Meldungen nur der Entwickler, also die Person, die in der Firma die Apps
baut. Der Mitarbeiter sieht seine Meldung danach nicht wieder und bekommt keine Antwort.

`/feedback` holt die offenen Meldungen einer App in diese Sitzung, ordnet sie, erkennt Doppelte und
schlägt eine Reihenfolge vor. **Der Mensch entscheidet**, was umgesetzt wird. Umgesetzt wird nur in
der **Testfassung**: das ist die zweite Fassung jeder App am Gerät, die nur ausgewählte Personen
sehen, bevor sie für alle gilt. **Live schaltet dieser Befehl nie**, das tut der Mensch selbst,
wenn er die Testfassung angesehen hat.

Jede Meldung hat am Gerät einen Stand: `neu`, `angenommen`, `umgesetzt` oder `abgelehnt`. Der
Befehl setzt ihn mit, damit der Entwickler am Gerät sieht, was aus jeder Meldung wurde.

## Die Regeln, die nie fallen

1. **Nichts ändert sich ohne den Menschen.** Du schlägst vor, er gibt frei. Eine Meldung, zu der er
   nichts gesagt hat, bleibt `neu`.
2. **Nur die Testfassung, nur über den festen Ablauf.** Jede Änderung geht durch Plan, Bau mit
   Tests und Ausrollen in den Teststand, so wie bei `/app` (`.ara/knowledge/nachweis.de.md`). Keine
   Datei von Hand ins Gerät, kein `--live`, kein `--back` aus diesem Befehl.
3. **Bilder nur mit Erlaubnis.** Ob Bildschirmfotos an den Agenten gehen, legt der Admin am Gerät je
   App fest, Vorgabe aus. Ist es aus, arbeitest du ohne Bild und sagst das einmal zu Beginn. Du
   fragst nicht nach dem Bild und rätst nicht, was darauf ist.
4. **Abgelehnt nur mit Grund.** Ein Satz, den der Entwickler in einem halben Jahr noch versteht.
5. **Umgesetzt erst nach dem Ausrollen.** Das Werkzeug setzt `umgesetzt` nur, wenn dieses Kit die
   App an diesem Gerät nach der Annahme in den Teststand gerollt hat.
6. **Namen bleiben im Gespräch.** In den Meldungen stehen Namen von Mitarbeitern. Du schreibst sie
   in keinen Plan, keinen Commit und keine Datei der App; im Plan steht die Nummer der Meldung.

## Bevor du anfängst: sieh nach

- **Welches Gerät:** `node .ara/tools/device.mjs` listet die Akten. Bei einem einzigen Gerät nimmst
  du das.
- **Welche App:** das Argument, sonst `ls apps/` und der Merker in `.ara/state.json` (welche App
  zuletzt wohin ging). Gibt es mehrere, fragst du einmal mit den Apps als Auswahl.
- **Der Schlüssel:** die Meldungen liest das Kit mit einem eigenen Schlüssel, nicht mit dem zum
  Ausrollen; in den Meldungen stehen Namen, und wer ausrollen darf, soll sie nicht lesen. Steht in
  der Geräteakte kein `feedback_key_ref`, legst du ihn nach einer Bestätigung an (Eingriff am Gerät,
  Weg zurück: `--revoke-key`):

  ```
  node .ara/tools/feedback.mjs --device <gerät> --key
  node .ara/tools/feedback.mjs --device <gerät> --key --via https --password-ref <NAME> --login-user <konto>
  ```

  Der erste Weg geht über SSH und das Skript des Geräts, der zweite über ein Konto mit der Rolle
  Admin, ohne SSH. Den Bereich des Schlüssels liest das Kit aus dem Kontrakt des Geräts, dafür
  braucht es den Deploy-Schlüssel schon (`device.mjs --deploy-key`).
- **Die App am Rechner:** umsetzen kannst du nur, was als `apps/<app>/` auf diesem Rechner liegt und
  mit dem Kit gebaut ist. Fehlt der Ordner, sagst du das vor der ersten Frage: lesen, ordnen und
  ablehnen gehen, umsetzen nicht. Dann nimmst du keine Meldung an, die niemand umsetzen kann.

## Die Meldungen holen

```
node .ara/tools/feedback.mjs --device <gerät> --app <app>
node .ara/tools/feedback.mjs --device <gerät> --app <app> --json
```

Ohne Schalter kommen die offenen (`neu` und `angenommen`), älteste zuerst, schon in eine Reihenfolge
gebracht: erst Fehler, dann Unklares, dann Wünsche; darin zuerst, was mehrere gemeldet haben, dann
was aus der Live-Fassung kam, dann das Ältere. Gleich klingende Meldungen stehen als „vermutlich
dasselbe wie“ zusammen. **Das ist eine Sortierung nach Wörtern, mehr nicht.** Du liest jeden Text
selbst und ordnest neu, wo sie danebenliegt. `--all` zeigt auch Erledigtes, `--reported-in test`
nur, was aus dem Teststand kam.

Die erste Zeile sagt, ob Bildschirmfotos für diese App an den Agenten gehen. **Ist es aus**, sagst
du dem Menschen in einem Satz: „Bilder hat der Admin für diese App nicht freigegeben, ich arbeite mit
Text, Seite und App.“ **Ist es an** und ein Text allein reicht nicht, holst du das Bild:

```
node .ara/tools/feedback.mjs --device <gerät> --app <app> --image <nr>
```

Es liegt dann unter `apps/<app>/.rueckmeldungen/<nr>.png`, geht in kein Paket, und du löschst es,
wenn die Meldung erledigt ist. Es kann Namen und Beträge aus der App zeigen.

## Ordnen und vorschlagen

Lies jede Meldung und mach daraus **Anliegen**: eines je Sache, die zu tun ist, mit allen Nummern,
die dasselbe meinen. Je Anliegen hältst du fest:

- **Art:** Fehler (etwas geht nicht, wie es soll), Wunsch (etwas fehlt) oder unklar (du verstehst
  nicht, was gemeint ist).
- **Was du ändern würdest**, in einem Satz für jemanden, der nie Software gebaut hat: „Auf der
  Übersicht ein Auswahlfeld Monat über der Liste, Vorgabe der laufende Monat.“ Bei einem Fehler
  zuerst, ob du ihn im Quelltext findest (lies `apps/<app>/`, starte die Tests).
- **Ob es schon geht:** gibt es das Gesuchte schon, ist das ein Ablehnungsgrund mit dem Weg dorthin
  („Gibt es schon: Filter oben rechts“).
- **Wie groß:** klein (eine Stelle), mittel (ein Bildschirm), groß (ein neuer Ablauf, dann ist es
  ein eigener Plan mit `/app`, kein Anliegen dieser Runde).

Die Reihenfolge schlägst du vor: Fehler vor Wünschen, was viele trifft vor Einzelnem, Kleines, das
viel bringt, früh. Was gegen eine Regel des Hauses oder der Plattform verstößt (etwa eine App, die
eine fremde Datenbank lesen soll), schlägst du nicht zum Umsetzen vor, sondern mit Grund zum
Ablehnen.

## Was geklärt sein muss

Die Regel steht in `AGENTS.md`, „Every command asks to full depth“. Jeder Punkt ist beantwortet, aus
einer Datei oder vom Gerät lesbar, oder offen. Die Liste beendet die Fragen, nicht eine Runde.

- **Welches Gerät und welche App**, und ob die App als `apps/<app>/` hier liegt.
- **Ob ein Schlüssel für Rückmeldungen da ist**, oder die Bestätigung, ihn anzulegen.
- **Ob Bilder für diese App erlaubt sind**: vom Gerät gelesen und einmal gesagt, nie gefragt.
- **Je Anliegen die Entscheidung:** umsetzen, ablehnen oder später (bleibt `neu`).
- **Je Anliegen zum Umsetzen, was genau sich ändert**, als Entwurf vorgeschlagen und bestätigt:
  Bildschirm, Feld, Knopf, Text. Bei einem unklaren Anliegen ein Entwurf, was gemeint sein könnte,
  oder „später, nachfragen beim Mitarbeiter“, wenn keiner trägt.
- **Je Anliegen zum Ablehnen der Grund**, als Satz vorgeschlagen und bestätigt.
- **Die Reihenfolge** der Anliegen, die umgesetzt werden.
- **Dass live der Mensch schaltet**: gesagt, nicht gefragt.

## Wie du fragst

Über das Interview-Werkzeug, gebündelt, mit der freien Antwort immer offen (Persona, „How you
ask“). **Eine Frage je Anliegen**, unter Claude Code bis zu vier auf einmal, unter Codex bis zu
drei; mehr Anliegen gehen in die nächste Runde. Die Optionen sind fertige Entwürfe:

- „Umsetzen: Auswahlfeld Monat über der Liste, Vorgabe laufender Monat (Meldungen 1 bis 4)“
- „Ablehnen: Gibt es schon, Filter oben rechts“
- „Später, bleibt offen“

Bei einem Fehler, dessen Ursache du gefunden hast, steht sie in einem Halbsatz dabei. Eine Runde
danach liest die Entscheidungen zurück („Ich nehme 1 bis 4 an und setze sie in der Testfassung um,
5 lehne ich mit diesem Grund ab, 6 bleibt offen. Passt das?“). **Diese Bestätigung ist die Freigabe
für die Änderung am Gerät:** sie nennt, was sich ändert (Stand der Meldungen, Testfassung der App),
wo (dieses Gerät, diese App) und den Weg zurück (Stand wieder `neu`, die vorige Fassung bleibt live).

**„genug“** im Freitext beendet die Fragen: was nicht entschieden ist, bleibt `neu`, und du sagst,
welche Nummern das sind. **Keine Fragen gewünscht:** du setzt nichts um und nimmst nichts an, du
zeigst die geordnete Übersicht mit deinen Vorschlägen und hörst dort auf. Ohne Freigabe ändert dieser
Befehl nichts.

## Umsetzen

1. **Annehmen**, sobald freigegeben:

   ```
   node .ara/tools/feedback.mjs --device <gerät> --app <app> --set 1,2,3,4 --to angenommen
   ```

2. **Ablehnen**, mit dem bestätigten Grund:

   ```
   node .ara/tools/feedback.mjs --device <gerät> --app <app> --set 5 --to abgelehnt --reason "Gibt es schon: Filter oben rechts."
   ```

3. **Ändern im festen Ablauf**, wie bei `/app`: ein Plan, der die angenommenen Nummern und je
   Anliegen den bestätigten Satz nennt (keine Namen), dann aktiv setzen, ändern, bauen, ausrollen.

   ```
   node .ara/tools/app.mjs --app <app> --plan "Rückmeldungen 1 bis 4"
   node .ara/tools/app.mjs --app <app> --plan-aktiv <datei>
   node .ara/tools/app.mjs --app <app> --build
   node .ara/tools/app.mjs --app <app> --device <gerät> --check
   node .ara/tools/app.mjs --app <app> --device <gerät> --deploy --aenderungstext "<was neu ist>"
   ```

   Ein Fehler bekommt einen Test, der ihn vorher zeigt und danach nicht mehr. Die Bausteine der
   Bibliothek bleiben, wie `/app` sie verlangt. Ist ein Test rot, geht nichts hinaus, und die
   Meldung bleibt `angenommen`.

4. **Umgesetzt setzen**, nachdem das Ausrollen in den Teststand gelungen ist:

   ```
   node .ara/tools/feedback.mjs --device <gerät> --app <app> --set 1,2,3,4 --to umgesetzt
   ```

   Das Werkzeug weist ab, wenn das Ausrollen älter ist als die Annahme.

5. **Abschluss:** du sagst, was jetzt in der Testfassung steht und wo man es ansieht, welche Nummern
   umgesetzt, abgelehnt und offen sind, und **dass live der Mensch selbst schaltet**, wenn er die
   Testfassung angesehen hat. Geholte Bilder unter `apps/<app>/.rueckmeldungen/` löschst du.

Das Werkzeug schreibt jeden gesetzten Stand mit Zeit in die Geräteakte. Der Plan der App sagt, was
geändert wurde; der Nachweis im Paket sagt, dass es über den Ablauf ging.

## Wenn etwas nicht geht

| Was das Werkzeug sagt | Was es heißt | Was du tust |
|---|---|---|
| Kein Schlüssel für Rückmeldungen hinterlegt | Für dieses Gerät gibt es noch keinen | Bestätigen lassen, dann `--key` |
| Weist den Schlüssel ab (401) | Er wurde am Gerät widerrufen oder ist abgelaufen | Neu anlegen mit `--key` |
| Lehnt ab (403) | Dem Schlüssel fehlt der Bereich, oder der Schlüssel gehört zu einer anderen App | Neuen mit `--key` anlegen, nicht den Deploy-Schlüssel nehmen |
| Kennt das nicht (404) | Die App gibt es an diesem Gerät nicht, oder die Nummer nicht | Kennung aus `app.json` prüfen, `--all` zeigt alle Nummern |
| Will eine Pause (429) | Zu viele Aufrufe in einer Minute | Die genannte Zeit warten, nicht im Takt fragen |
| Nennt keine Rückmeldungen im Kontrakt | Die Plattform ist älter als die Schnittstelle | Erst `/maintain` und ein Update des Geräts |
| Bilder nicht erlaubt | Der Admin hat es für diese App nicht freigegeben | Ohne Bild arbeiten; freigeben kann nur der Admin am Gerät |

## Was du nicht tust

- Keine App live schalten und keine zurückschalten, auch nicht „nur kurz“.
- Keine Meldung annehmen, die niemand umsetzen kann, und keine ohne Freigabe ablehnen.
- Keinen Stand setzen, um eine Liste leer zu bekommen.
- Keine Namen aus Meldungen in Plan, Code, Commit oder Datei.
- Den Schalter für Bilder nicht umlegen und nicht darum bitten, ihn umzulegen. Das ist die
  Entscheidung des Admins, und sie hat einen Grund (Personendaten auf dem Bild).

## Claude Code und Codex

Derselbe Ablauf, dieselben Werkzeuge. Unter Codex heißt der Befehl `$feedback`, und das
Interview-Werkzeug nimmt höchstens drei Fragen mit je drei Optionen; dieselben Anliegen gehen dann
über mehr Runden. Die Bilder liest Claude Code mit seinem Werkzeug zum Lesen von Dateien, Codex mit
seinem Bildbetrachter; beide nur aus `apps/<app>/.rueckmeldungen/`.
