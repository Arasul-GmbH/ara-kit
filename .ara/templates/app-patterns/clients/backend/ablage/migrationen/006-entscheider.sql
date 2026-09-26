-- Muster Mandanten: wer einen Mandanten sieht, und wer über seine Vorgänge
-- entscheidet, sind zwei Dinge.
--
-- Setzt die 004 voraus. Die Nummer 006, weil die 005 dem Muster Belege gehört;
-- eine App ohne Belege hat dann eben keine 005, gezählt wird nach Namen. Trägt
-- die App schon eine eigene 006, bekommt diese Datei die nächste freie Nummer,
-- bevor sie an einem Gerät gelaufen ist.
--
-- **Sehen heißt nicht entscheiden.** In einer Kanzlei sehen zehn Kollegen einen
-- Mandanten, und freigeben darf nur der Partner, der ihn betreut. Bis Kit 0.41.0
-- war jeder Zugeordnete Entscheider, und zwei Sachbearbeiter gaben sich
-- gegenseitig frei: vier Augen, die keine waren.
--
-- Die Spalte steht an der Zuordnung, nicht am Konto: wer bei Müller entscheidet,
-- entscheidet nicht deshalb bei Schmidt. Vorgabe ist 0. Eine App, die diese
-- Migration nachträglich bekommt, hat danach keinen Entscheider, bis die
-- Verwaltung einen markiert, und jeder Vorgang bleibt mit dem Satz dazu in
-- Arbeit: lieber keine Freigabe als eine vom Falschen.

ALTER TABLE zuordnungen ADD COLUMN entscheidet INTEGER NOT NULL DEFAULT 0;
