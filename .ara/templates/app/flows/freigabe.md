---
name: freigabe
beschreibung: Holt zu einem Vorgang von {{name}} die Entscheidung eines Menschen ein und schreibt sie in einem Satz auf.
argumente:
  - name: sache
    typ: freitext
    pflicht: true
    beschreibung: Worum es geht, der Titel des Vorgangs
  - name: von
    typ: freitext
    pflicht: true
    beschreibung: Wer den Vorgang eingereicht hat
  - name: text
    typ: freitext
    beschreibung: Was dazu geschrieben wurde
    standard: ohne Angabe
werkzeuge: [freigabe_anfordern]
schritte:
  - name: entscheiden
    typ: werkzeug
    werkzeug: freigabe_anfordern
    parameter:
      titel: "{{name}}: {{sache}} von {{von}}"
      zusammenhang: >-
        {{von}} hat in {{name}} den Vorgang "{{sache}}" eingereicht. Dazu steht:
        {{text}}. Bitte bestätigen oder mit einer Begründung ablehnen. Wer
        entscheiden darf, steht am Gerät und nicht in dieser Datei.
      frist_minuten: 1440
grenzen:
  zeitlimit_s: 300
---

Über den Vorgang "{{sache}}" von {{von}} ist entschieden worden. Schreibe genau
einen Satz darüber, wer entschieden hat und wie; der Schritt „entscheiden" nennt
beides. Keine Anrede, keine Erfindungen, keine Empfehlung.
