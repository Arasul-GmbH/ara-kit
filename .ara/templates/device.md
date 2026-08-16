---
name:                     # Standort oder Rolle, z.B. zentrale, werk2, praxis-eg
customer:                 # id aus customer.md
model:                    # wie das Gerät heißt, laut Lieferschein
profile:                  # Plattformprofil — NUR wenn vom Gerät bestätigt
serial:
status: planned           # planned | delivered | installing | live | retired
location:                 # Raum, Gebäude
hostname:
address:                  # IP oder Name im Kundennetz
ssh_user:                 # Anmeldename auf dem Gerät
ssh_port:                 # nach der Härtung der neue Port
ssh_key:                  # Name des Schlüssels in ~/.ssh, ohne Pfad
remote_access:            # none | direct | vpn
secret_ref:               # Name des Eintrags in der Geheimnis-Ablage, kein Wert
license:                  # Kennzeichnung der Lizenz, kein Token
maintenance_until:        # JJJJ-MM-TT — Ende des Wartungsvertrags
delivered_on:
accepted_on:
---

## Umgebung

<!-- Netz, Adressvergabe, Firewall, wer dort zuständig ist, Besonderheiten
     (kein Internet, Gastnetz, DS-Lite, feste Adresse). -->

## Besonderheiten

<!-- Alles, was beim nächsten Mal wichtig ist: enger Schrank, Strom nur über eine
     Leiste, Schlüssel beim Hausmeister, Ansprechpartner nur dienstags. -->

## Entscheidungen

<!-- Warum etwas so gemacht wurde. Überlebt bis zur Verlängerung. -->
