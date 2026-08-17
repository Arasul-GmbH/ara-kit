---
name: customers
description: Kundenpflege und Überblick über das eigene Geschäft. Nutzen, wenn jemand fragt was ansteht, was heute zu tun ist, wie es um die Kunden steht, wann eine Wartung ausläuft, bei wem man sich wieder melden wollte, oder wenn nach einem Gespräch die Akte nachgezogen werden soll.
---

Verfahren: `.ara/knowledge/crm.md`

Kurz:

- **Was ansteht:** `node .ara/tools/agenda.mjs`: Wiedervorlagen, auslaufende Wartungen,
  unterbrochene Einrichtungen, eingeschlafene Kontakte. Stell die Frage von dir aus, wenn
  eine Sitzung ohne konkretes Anliegen beginnt.
- **Nach jedem Kundenkontakt drei Dinge:** Eintrag unter `history/`, `last_contact`
  aktualisieren, `follow_up` setzen oder `status` ändern.
- Ein Gespräch ohne nächsten Termin ist ein Kunde, den man in drei Monaten vergessen hat.
- Wartungsverlängerungen werden **vor** dem Ablauf besprochen, sie sind der
  wiederkehrende Umsatz, der das Geschäft trägt.
- Verlorene Kunden nicht löschen, auf `inactive` setzen. Die Historie ist später mehr wert
  als jedes Angebot.
