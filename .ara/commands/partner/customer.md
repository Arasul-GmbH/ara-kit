---
description: Kunde anlegen oder öffnen
argument-hint: <kundenname>
---

Kunde: **$1**

Lies `.ara/knowledge/customer-file.md` und arbeite danach. Wissen, das dieser Befehl
lädt: `.ara/knowledge/customer-file.md`, `.ara/knowledge/crm.md` für Verlauf und
Wiedervorlage, `.ara/knowledge/sales.md` beim Erstkontakt. Das Profil in
`business/profile.md` liest du vorher, es sagt dir, wie viel du erklärst.

- **Kein Argument angegeben:** Gib einen Überblick über die vorhandenen Kunden, je eine
  Zeile mit Stand und letztem Kontakt, und frag, um welchen es geht.
- **Akte existiert (auch unter ähnlichem Namen):** öffnen. Lagebild geben, nicht vorlesen.
- **Akte existiert nicht:** anlegen. Vorher nachsehen, was du selbst herausfinden kannst
  (Website), dann eine gebündelte Interview-Runde, dann Akte schreiben.

Ab jetzt arbeitest du ausschließlich in `customers/$1/`. Kein Blick in andere Kundenordner.
