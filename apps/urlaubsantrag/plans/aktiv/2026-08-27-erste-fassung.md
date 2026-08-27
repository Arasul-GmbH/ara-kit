---
app: urlaubsantrag
titel: Erste Fassung
stand: aktiv
angelegt: 2026-08-27
erledigt:
---

# Erste Fassung

> Der Plan, aus dem die Referenz-App entstanden ist. Er steht hier ausgefüllt, damit man
> sieht, wie einer aussieht, der wirklich gebaut wurde. Er wird erledigt, sobald die App
> auf einem Gerät live steht.

## Wozu

Ein Urlaubsantrag geht heute als Mail an die Leitung, wird dort gelesen, beantwortet und
dann in eine Tabelle übertragen. Dreimal dieselbe Angabe, und wer wissen will, wie es um
seinen Antrag steht, fragt nach. Die App macht daraus einen Weg mit einer Stelle, an der
ein Mensch entscheidet.

## Wer es benutzt

Jeder Mitarbeiter, dem die App freigegeben ist, stellt Anträge. Dieselbe Freigabe erlaubt
es auch, über einen Antrag zu entscheiden. Wer das ist, entscheidet der Kunde am Gerät,
nicht diese App und nicht der Flow.

## Welche Daten

Hinein: Name des Antragstellers aus der Anmeldung, erster und letzter Tag, auf Wunsch ein
Grund. Das ist personenbezogen, es bleibt am Gerät des Kunden und geht nirgendwo hin.

Liegen bleibt: die Anträge im Speicher des Containers, bis er neu startet. Ein eigener
Datenordner je App ist am Gerät noch nicht vorgesehen.

Hinaus: nichts. Keine Mail, keine Schnittstelle nach außen.

## Die Schritte

1. Mitarbeiter öffnet die App und sieht seine bisherigen Anträge.
2. Er trägt ersten und letzten Tag ein, dazu auf Wunsch einen Grund.
3. Die App rechnet die Arbeitstage aus und stellt den Antrag.
4. Der Flow startet und hält sofort an: er fordert eine Freigabe an.
5. Ein Mitarbeiter, dem die App freigegeben ist, sieht die offene Freigabe in Arasul und
   entscheidet. Eine Ablehnung braucht eine Begründung.
6. Der Antrag steht auf genehmigt oder abgelehnt, mit dem Namen dessen, der entschieden
   hat, und der Lauf schreibt einen Satz dazu.

## Wo ein Flow gebraucht wird

Genau an einer Stelle, und zwar für den Halt: `freigabe_anfordern` ist ein Werkzeug des
Flows, und ohne Flow gibt es kein Anhalten. Der Satz, den der Lauf danach schreibt, ist die
einzige Stelle, an der ein Modell arbeitet, und er ist Beiwerk. Das Rechnen der Arbeitstage
ist ein Programm und kein Flow.

## Wo ein Mensch entscheidet

Bei jedem Antrag, vor jeder Genehmigung. Er sieht dabei: wer beantragt, welcher Zeitraum,
wie viele Arbeitstage, welcher Grund. Das steht im Zusammenhang der Freigabe, damit
niemand nachschlagen muss, um zu entscheiden.

Die Frist steht am Schritt: ein Tag. Danach endet der Lauf ohne Entscheidung, und der
Antrag steht auf abgelaufen. Das ist kein Fehler, sondern die dritte mögliche Antwort.

## Was ausdrücklich nicht dazugehört

Urlaubskonto und Resttage, Vertretungsregeln, eine Übersicht für die Leitung, eine
Anbindung an die Lohnbuchhaltung, Erinnerungen per Mail. Nichts davon ist in dieser
Fassung drin, und nichts davon ist versprochen.

## Woran man erkennt, dass es fertig ist

Ein Mitarbeiter stellt auf dem Gerät einen Antrag. Der Lauf steht auf wartend. Ein anderer
Mitarbeiter, dem die App freigegeben ist, bestätigt in Arasul. Danach steht der Antrag in
der App auf genehmigt, mit dem Namen des Bestätigers.

## Annahmen

- Samstag und Sonntag sind keine Arbeitstage, Feiertage kennt die App nicht. Gefragt und
  offen geblieben: welche Feiertage im Betrieb gelten.
- Ein Antrag darf gestellt werden, auch wenn er sich mit einem anderen überschneidet. Eine
  Prüfung darauf war nicht verlangt.
- Zurückziehen kann ein Mitarbeiter seinen Antrag nicht. Kam im Gespräch nicht vor, gehört
  in eine zweite Fassung.
