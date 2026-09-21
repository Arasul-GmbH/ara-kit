---
name: card-stack
description: Mit dem Kartenstapel dieser Wurzel arbeiten. Nutze es, wenn eine Idee oder ein Vorhaben aufgeschrieben, gereiht, begonnen oder geschlossen werden soll, oder wenn jemand fragt, was als Nächstes kommt.
---

# Der Kartenstapel

Eine Datei je Karte in `roadmap/backlog/`, der Ordner ist der Status: `new/`, `ready/`,
`running/`, `done/`. `roadmap/backlog/README.md` sagt, was jede Spalte verlangt.

1. **Was als Nächstes kommt:** `node .claude/scripts/cards.mjs list`. Die vorderste Karte in
   `ready/` ist dran, je Ort. Was nicht in `ready/` liegt, ist nicht begonnen.
2. **Eine neue Idee:** `node .claude/scripts/cards.mjs new --title "..." --place <ort>`. Sie
   landet in `new/`. Reihe sie nicht ein und fülle die Felder noch nicht.
3. **Einreihen:** die Felder `ref`, `rank`, `assumption` und `done` müssen gefüllt sein,
   bevor sie nach `ready/` geht. In `assumption` kommt die riskanteste Annahme, in `done`,
   was beobachtbar ist, wenn sie fertig ist. Frag den Menschen nach beiden, erfinde sie
   nicht.
4. **Beginnen:** `cards.mjs move <slug> running`. Eine laufende Karte je Ort, das Skript
   verweigert eine zweite.
5. **Abschließen:** `cards.mjs move <slug> done --result green|red|dropped`. Auch eine rote
   oder verworfene Karte ist ein Ergebnis, und sie bleibt.

Verschiebe nie eine Datei von Hand: das Skript prüft, was die Spalte verlangt, und macht die
Bewegung zu einem eigenen Commit.
