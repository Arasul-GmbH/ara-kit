---
name: freigabe
beschreibung: Der erste Flow von {{name}}. Er holt eine Freigabe ein und schreibt dann einen Satz.
argumente:
  - name: sache
    typ: freitext
    pflicht: true
    beschreibung: Worum es geht
werkzeuge: [freigabe_anfordern]
schritte:
  - name: freigeben
    typ: werkzeug
    werkzeug: freigabe_anfordern
    parameter:
      titel: "{{name}}: {{sache}} freigeben"
      zusammenhang: >-
        Bitte bestätigen oder mit einem Grund ablehnen. Wer entscheiden darf,
        steht am Gerät und nicht in dieser Datei.
      frist_minuten: 1440
grenzen:
  zeitlimit_s: 300
---

Die Sache {{sache}} ist entschieden worden. Schreibe genau einen Satz darüber,
wer entschieden hat; der Schritt „freigeben" nennt den Namen. Keine Anrede,
keine Erfindungen.
