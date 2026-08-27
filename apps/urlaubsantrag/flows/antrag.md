---
name: antrag
beschreibung: Holt die Entscheidung zu einem Urlaubsantrag ein und schreibt sie in einem Satz auf.
argumente:
  - name: antragsteller
    typ: freitext
    pflicht: true
    beschreibung: Wer den Urlaub beantragt
  - name: von
    typ: freitext
    pflicht: true
    beschreibung: Erster Tag, als Datum
  - name: bis
    typ: freitext
    pflicht: true
    beschreibung: Letzter Tag, als Datum
  - name: tage
    typ: freitext
    pflicht: true
    beschreibung: Wie viele Arbeitstage das sind
  - name: grund
    typ: freitext
    beschreibung: Was der Antragsteller dazugeschrieben hat
    standard: ohne Angabe
werkzeuge: [freigabe_anfordern]
schritte:
  - name: entscheiden
    typ: werkzeug
    werkzeug: freigabe_anfordern
    parameter:
      titel: Urlaub {{von}} bis {{bis}} von {{antragsteller}}
      zusammenhang: >-
        {{antragsteller}} beantragt Urlaub vom {{von}} bis zum {{bis}}, das sind
        {{tage}} Arbeitstage. Angegebener Grund: {{grund}}. Bitte bestätigen
        oder mit einer Begründung ablehnen.
      frist_minuten: 1440
grenzen:
  zeitlimit_s: 300
---

Über den Urlaubsantrag von {{antragsteller}} für {{von}} bis {{bis}} ist
entschieden worden. Schreibe genau einen Satz darüber, wer entschieden hat und
wie; der Schritt „entscheiden" nennt beides. Keine Anrede, keine Erfindungen,
keine Empfehlung.
