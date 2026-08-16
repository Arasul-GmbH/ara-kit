---
name: diagnose
description: Störungen an einem Kundengerät feststellen und beheben. Nutzen, wenn ein Gerät nicht erreichbar ist, der Chat nicht oder unsinnig antwortet, Dokumente nicht gefunden werden, die Weboberfläche nicht lädt, etwas langsam geworden ist, oder wenn ein Kunde meldet, dass etwas nicht funktioniert.
---

Verfahren: `.ara/knowledge/diagnostics.md`

Kurz:

- **Erst feststellen, dann ändern.** Ein Neustart als erste Handlung löscht die Spur.
- Kette von außen nach innen: Was genau passiert? · Erreichbar? · Lebt das Gerät (Platz,
  Uhrzeit, Laufzeit)? · Laufen die Dienste? · Was sagen die Protokolle zum Zeitpunkt des
  Fehlers? · Was hat sich geändert?
- Leere oder unsinnige Antworten heißen fast immer: kein Modell geladen.
- Befund nennen, Vorschlag mit Rückweg, dann erst handeln.
- Nie zwei Dinge gleichzeitig ändern. Nie in Kundendaten stöbern.
- Ergebnis in `customers/<kunde>/history/`.
