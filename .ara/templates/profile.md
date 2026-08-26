---
role: partner             # partner | company
name:
salutation:               # wie du angesprochen werden willst
company:
region:
skills:                   # was du kannst, kommagetrennt: development, administration, domain, sales
tools:                    # womit dein Haus arbeitet, kommagetrennt, z. B. DATEV, HubSpot, Nextcloud
invoice:                  # nur Partner: yes | no | later, soll das Kit Rechnungen erzeugen
invoice_tool:             # nur Partner: womit heute Rechnungen geschrieben werden
detail_level: medium      # low | medium | high, wie viel Ara erklärt
security_level: standard  # standard | relaxed
experience:               # kurz: linux, ssh, hardware vor ort
flash_host: unknown       # no | yes | unknown, x86-Linux zum Flashen verfügbar
ssh_key:                  # Name des Schlüssels in ~/.ssh
secrets_store: env        # env | keychain
browser: yes              # yes | no, darf Ara den Browser selbst bedienen
backup_repo:              # wo dieses Kit gesichert wird, falls eingerichtet
first_device:             # Modell des ersten Geräts, leer wenn keins ansteht
first_device_state:       # present | ordered | none
first_app:                # ein Satz: was die erste App tun soll
created:
---

<!-- Diese Datei gehört dir. Ara schreibt sie in deiner Sprache und spricht dich
     darin an, nicht über dich. -->

## Wer ich bin und was ich kann

<!-- Rolle, Stärken, was du selbst machst und was nicht. Danach richtet sich,
     wie viel jeder Befehl erklärt. In Du-Form an dich gerichtet. -->

## Wie ich arbeiten möchte

<!-- Wie viel soll erklärt werden, was kannst du selbst, worauf legst du Wert.
     In Du-Form an dich gerichtet. -->

## Womit mein Haus arbeitet

<!-- Buchhaltung, CRM, Ticket, Dateiablage, Kommunikation, ERP oder Branchensoftware.
     Für ein Unternehmen: woran Apps später andocken. Für einen Partner: der Stack,
     den du bei Kunden kennst. -->

## Was ich vorhabe

<!-- Wo du hin willst: wie viele Kunden, welche Branchen, ob das nebenher läuft
     oder dein Hauptgeschäft ist. Als Unternehmen: wofür das Gerät da ist, welche
     Abteilungen es nutzen, was die erste App tun soll. -->

## Abweichungen von den Standardregeln

<!-- Nur wenn Regeln gelockert wurden: was genau, seit wann, warum. -->

## Technikstand dieses Rechners

<!-- Ergebnis von check-environment.mjs, mit Datum. Was fehlt, steht hier als
     offener Punkt. -->
