---
name: freigabe
beschreibung: Holt zu einem Vorgang von {{name}} die Entscheidung eines Menschen ein und schreibt sie in einem Satz auf.
argumente:
  - name: vorgang
    typ: freitext
    pflicht: true
    beschreibung: Die Nummer des Vorgangs in {{name}}
  - name: von
    typ: freitext
    pflicht: true
    beschreibung: Das Konto, das den Vorgang eingereicht hat
werkzeuge: [freigabe_anfordern]
schritte:
  - name: entscheiden
    typ: werkzeug
    werkzeug: freigabe_anfordern
    parameter:
      titel: "{{name}}: Vorgang {{vorgang}} von {{von}}"
      zusammenhang: >-
        {{von}} hat in {{name}} den Vorgang {{vorgang}} eingereicht. Was darin
        steht, liest du in {{name}} unter dieser Nummer, bevor du entscheidest.
        Bitte bestätigen oder mit einer Begründung ablehnen.
      frist_minuten: 1440
grenzen:
  zeitlimit_s: 300
---

Über den Vorgang {{vorgang}} von {{von}} ist entschieden worden. Schreibe genau
einen Satz darüber, wer entschieden hat und wie; der Schritt „entscheiden" nennt
beides. Keine Anrede, keine Erfindungen, keine Empfehlung.
