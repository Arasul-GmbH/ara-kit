---
name:                     # Standort oder Rolle, z.B. zentrale, werk2, praxis-eg
kunde:                    # id aus kunde.md
modell:                   # wie das Gerät heißt, laut Lieferschein
profil:                   # Plattformprofil — NUR eintragen, wenn vom Gerät bestätigt
seriennummer:
status: geplant           # geplant | geliefert | in-einrichtung | im-betrieb | ausser-betrieb
standort:                 # Raum, Gebäude
hostname:
adresse:                  # IP oder Name im Kundennetz
ssh_benutzer:             # Anmeldename auf dem Gerät
ssh_port:                 # Port des SSH-Dienstes — nach der Härtung der neue
ssh_schluessel:           # Name des Schlüssels in ~/.ssh, ohne Pfad
fernzugriff:              # keiner | direkt | vpn — wie im Betrieb erreichbar
geheimnis_ablage:         # Name des Eintrags in der .env, kein Wert
lizenz:                   # Kennzeichnung der Lizenz, kein Token
geliefert_am:
abgenommen_am:
---

## Umgebung

<!-- Netz, Adressvergabe, Firewall, wer dort zuständig ist, Besonderheiten
     (kein Internet, Gastnetz, DS-Lite, feste Adresse). -->

## Besonderheiten

<!-- Alles, was beim nächsten Mal wichtig ist: enger Schrank, Strom nur über eine
     Leiste, Schlüssel beim Hausmeister, Ansprechpartner nur dienstags. -->

## Entscheidungen

<!-- Warum etwas so gemacht wurde. Überlebt bis zur Verlängerung. -->
