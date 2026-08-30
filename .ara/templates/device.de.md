---
name:                     # Standort oder Rolle, z.B. zentrale, werk2, praxis-eg
customer:                 # id aus customer.md, leer bei einem Gerät ohne Kunden
model:                    # wie das Gerät heißt, laut Lieferschein
hardware:                 # was das Gerät von sich sagt, von device.mjs eingetragen
os:                       # Betriebssystem, von device.mjs eingetragen
arch:                     # Architektur, von device.mjs eingetragen
profile:                  # Plattformprofil aus dem Katalog. Von device.mjs eingetragen, nur wenn der Spiegel es wirklich führt
serial:
status: planned           # planned | delivered | installing | live | retired
verdict:                  # supported | soon | unsupported, von device.mjs eingetragen
noted_on:                 # JJJJ-MM-TT. Wann ein nicht unterstütztes Gerät vorgemerkt wurde
location:                 # Raum, Gebäude
hostname:
address:                  # IP oder Name im Kundennetz, darüber läuft SSH
api_base:                 # Schnittstelle, wenn sie nicht unter address liegt, z.B. hinter einem Tunnel
ssh_user:                 # Anmeldename auf dem Gerät
ssh_port:                 # nach der Härtung der neue Port
ssh_key:                  # Name des Schlüssels in ~/.ssh, ohne Pfad
ssh:                      # ok | refused | local, Ergebnis der letzten Prüfung
tls:                      # selfsigned, wenn das Gerät ein selbst ausgestelltes Zertifikat trägt
docker:                   # running | present | missing
ollama:                   # present | container | missing, Programm oder Container
arasul:                   # running | traces | none, was am Gerät gefunden wurde, kein Produktstand
contract:                 # Kontraktfassung, die dieses Gerät führt, von device.mjs am Gerät gelesen. Keine Aussage über das Kit
net_name:                 # Name, unter dem das Gerät im Kundennetz auftritt, vom Installer gesetzt
api_key_ref:              # Kit-Schlüssel (app:deploy) für den Deploy: Name des Eintrags, kein Wert
start_password_ref:       # Startpasswort aus der Installation: Name des Eintrags, kein Wert
checked:                  # Zeitpunkt der letzten Prüfung durch device.mjs
remote_access:            # none | direct | vpn
secret_ref:               # Name des Eintrags in der Geheimnis-Ablage, kein Wert
license:                  # Kennzeichnung der Lizenz, kein Token
maintenance_until:        # JJJJ-MM-TT. Ende des Wartungsvertrags
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

## Prüfungen

<!-- Von device.mjs fortgeschrieben: je Lauf ein Eintrag mit Befund und Urteil. -->
