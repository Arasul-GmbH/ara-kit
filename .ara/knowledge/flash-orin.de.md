# Verfahren: der Orin, bevor er ein Linux hat

> **Wann brauchst du das?** In Phase 1 einer Einrichtung auf einem Jetson AGX Orin, der noch
> kein brauchbares System hat oder ein frisches bekommen soll. Fall C aus
> `.ara/knowledge/boot-and-flash.de.md`.

Stand: 2026-08-28

Quelle: NVIDIA Jetson Linux Developer Guide zur Fassung 36.4.4, Seiten „Quick Start" und
„Flashing Support" (docs.nvidia.com/jetson/archives/r36.4.4), gelesen am 2026-08-28, und die
Konfiguration des USB-Gerätemodus, am selben Tag über ssh auf einem laufenden Jetson AGX Orin
Developer Kit ausgelesen. Jeder Schritt nennt, aus welcher der beiden Quellen er kommt.

## Was diese Anleitung ist und was nicht

**Sie ist eine Anleitung mit Prüfschritt je Abschnitt, keine Automatik.** Alles bis zum
laufenden Linux passiert an einem Tisch mit einem Kabel in der Hand, an einem zweiten Rechner,
und das Kit kommt an nichts davon heran. Darum führt sie, ein Abschnitt nach dem anderen, und
nach jedem Abschnitt sagt sie, woran du prüfst, dass du weitergehen darfst. Erst ab Abschnitt
7 arbeitet das Kit selbst.

**Nichts darin ist vom Kit verifiziert.** Die Schritte sind aus NVIDIAs Dokumentation gebaut
und aus dem, was ein laufender Orin über sich sagt. Das Testgerät des Kits wurde für diese
Anleitung nicht geflasht, und einen Flash-Vorgang, dem das Kit zugesehen hat, gibt es nicht.
Wo ein Prüfschritt vom laufenden Gerät kommt und nicht aus der Dokumentation, sagt der Schritt
das. Passt ein Schritt nicht zu dem, was du siehst, gilt die Dokumentation, und diese Anleitung
bekommt eine Korrektur.

**Die Nummer der Fassung ist keine Konstante.** 36.4.4 ist die Fassung, gegen die diese
Anleitung gelesen wurde; NVIDIAs Downloadseite nennt für die Orin-Familie inzwischen eine
neuere Linie, mit einem anderen Ubuntu am Host. Lies vor dem Herunterladen die aktuelle Seite
und nimm die Fassung, die dein Modul nennt. Was sich damit ändert, sind die Zahlen, nicht die
Reihenfolge der Schritte.

Alles, was du unterwegs entscheidest (Benutzername, Rechnername, Adresse), gehört in den
Laufzettel, Phase 1: `node .ara/tools/runsheet.mjs --device <gerät> --phase 1 --entry "..."`.

## 1. Der Host-Rechner

Der Orin wird nicht von einem Stick installiert. Er wird in einen Recovery-Modus versetzt und
von einem zweiten Rechner über ein USB-C-Kabel beschrieben, und dieser Rechner muss passen.

- **x86-64 mit Ubuntu 22.04 oder 20.04.** NVIDIAs Quick Start nennt „a separate Linux
  (Ubuntu 22.04 or Ubuntu 20.04) host system" und keine Architektur. Die Architektur ist die
  Regel des Kits aus `.ara/knowledge/boot-and-flash.de.md`: ein Mac, ein ARM-Rechner oder eine
  virtuelle Maschine ist von dieser Seite nicht gedeckt, und das Kit hat keinen davon laufen
  sehen.
- **Freier Platz.** NVIDIAs Anforderungsseite zum SDK Manager nennt 27 GB am Host und 16 GB
  für das Ziel. Nimm das als Maß, das Release-Paket und das ausgepackte Wurzeldateisystem
  liegen in dieser Größenordnung.
- **Ein USB-C-Kabel**, das Daten trägt und nicht nur Strom, und das Netzteil des Orin.

Ob es so einen Rechner gibt, steht seit dem Onboarding in `business/profile.md`. Gibt es
keinen: sag es jetzt, vor einem Termin, nach `.ara/knowledge/boot-and-flash.de.md`.

**Prüfschritt:** am Host gibt `uname -m` `x86_64` aus, `lsb_release -rs` gibt `22.04` oder
`20.04` aus, und `df -h ~` zeigt genug freien Platz für die Zahlen oben. Erst dann weiter.

## 2. Das Release-Paket

Von `https://developer.nvidia.com/linux-tegra`, der Quick Start nennt diese Adresse: das
Jetson-Linux-Release-Paket und das Beispiel-Wurzeldateisystem für die Fassung, die dein Modul
nennt. Dann, im Ordner, in dem beide liegen, in dieser Reihenfolge (Quick Start, wörtlich, mit
den zwei Dateinamen in den Variablen):

```
tar xf ${L4T_RELEASE_PACKAGE}
sudo tar xpf ${SAMPLE_FS_PACKAGE} -C Linux_for_Tegra/rootfs/
cd Linux_for_Tegra/
sudo ./tools/l4t_flash_prerequisites.sh
sudo ./apply_binaries.sh
```

`apply_binaries.sh` kopiert NVIDIAs Treiber in das Wurzeldateisystem. Ohne diesen Schritt
bootet das Gerät in ein System, das seine eigene Hardware nicht kennt.

**Prüfschritt:** `apply_binaries.sh` endet mit Rückgabecode 0 (`echo $?` direkt danach gibt
`0` aus), und `sudo head -1 rootfs/etc/nv_tegra_release` gibt eine Zeile aus, die mit `# R36`
beginnt, oder mit der Nummer der Fassung, die du genommen hast. Diese Datei trägt ein
geflashter Orin unter `/etc/nv_tegra_release`; der Prüfschritt kommt vom laufenden Gerät,
nicht aus der Dokumentation.

## 3. Der erste Benutzer, vor dem Flash

Ein frisch geflashter Orin startet sonst in einen Einrichtungsassistenten auf einem
Bildschirm, und dort müsste jemand mit Tastatur sitzen. Stattdessen wird der Benutzer vorher
angelegt, am Host, in das Wurzeldateisystem hinein, mit NVIDIAs Skript (Flashing Support,
Abschnitt „Skipping oem-config"):

```
sudo ./tools/l4t_create_default_user.sh -u <name> -p <passwort> -n <rechnername> --accept-license
```

- `-u <name>`: der Anmeldename. Er wird `ssh_user` in der Geräteakte, halt ihn einheitlich.
  Ohne Angabe nimmt das Skript `nvidia`.
- `-p <passwort>`: ohne Angabe würfelt das Skript eines, und du siehst es nie. Das Passwort
  wird genau einmal gebraucht, zum Ausrollen des SSH-Schlüssels in Abschnitt 7. Es ist kein
  Fall für die Geheimnis-Ablage des Kits, das Kit meldet sich danach mit dem Schlüssel an.
- `-n <rechnername>`: der Name der Geräteakte (`orin`, oder der Name des Kundengeräts). Ohne
  Angabe heißt das Gerät `tegra-ubuntu`.
- `--accept-license`: nimmt NVIDIAs Lizenz für die Software am Gerät an, damit der erste Boot
  auch darauf nicht wartet.
- **Nicht `-a`.** Das schaltet die automatische Anmeldung ein, und ein Gerät, das beim Kunden
  steht, meldet niemanden von selbst an.

**Prüfschritt:** `sudo grep "^<name>:" rootfs/etc/passwd` gibt eine Zeile aus, und `sudo cat
rootfs/etc/hostname` gibt den Rechnernamen aus. Beides sind die Dateien, in die das Skript
schreibt; dieser Prüfschritt ist aus dem Zweck des Skripts abgeleitet, nicht aus der
Dokumentation zitiert.

## 4. Der Recovery-Handgriff

Der Orin muss im Force-Recovery-Modus sein, bevor der Host ihn beschreiben kann. Am Developer
Kit sind das drei Tasten und ein Kabel (Quick Start, „Jetson AGX Orin Developer Kit"):

1. Steck das USB-C-Kabel in **den USB-C-Anschluss neben der 40-poligen Stiftleiste** am Orin
   und in den Host. Schließ das Netzteil an.
2. Stell sicher, dass das Developer Kit ausgeschaltet ist.
3. Halt die Taste **Force Recovery** gedrückt.
4. Drück die Taste **Power** und lass sie los.
5. Lass die Taste Force Recovery los.

In diesem Modus erscheint nichts auf einem Bildschirm, das ist normal. Der Orin wartet auf den
Host.

**Prüfschritt:** am Host gibt `lsusb` eine Zeile mit `ID 0955:7023 NVIDIA Corp.` aus. Der Quick
Start nennt `7023` für den AGX Orin, und `7223` oder `7323` für andere Varianten der Familie.
Erscheint keine Zeile mit `0955`: Kabel, Anschluss, oder die Reihenfolge der Tasten, dann noch
einmal ab Schritt 2. Ohne diese Zeile wird kein Flash gestartet.

## 5. Der Flash

Das ist der eine unumkehrbare Schritt. Alles auf dem Orin ist danach weg, das System und was
jemand darauf aufbewahrt hat. **Frag über das Interview-Werkzeug, bevor du den Befehl
nennst**, mit der Folge in klaren Worten, und nimm nur ein ausdrückliches Ja
(`.ara/knowledge/security.de.md`, Stufe 3).

Für den internen Speicher (Quick Start):

```
sudo ./flash.sh jetson-agx-orin-devkit internal
```

Für ein NVMe-Laufwerk nennt der Quick Start ein anderes Werkzeug, `tools/kernel_flash/
l4t_initrd_flash.sh`, mit einer Konfiguration für genau diesen Fall. Nimm dessen Zeile von der
aktuellen Seite, sie trägt Optionen, die zur Fassung gehören.

Der Lauf dauert Minuten und schreibt viel. Lies mit. Bricht er ab, steht die Ursache in den
letzten Zeilen; behebe sie, versetz den Orin wieder in den Recovery-Modus (Abschnitt 4, mit dem
Prüfschritt `lsusb`) und ruf denselben Befehl noch einmal auf. Nach zwei gescheiterten
Versuchen: aufhören, den Stand in den Laufzettel schreiben, gemeinsam entscheiden, ob es einen
zweiten Termin braucht.

**Prüfschritt:** `flash.sh` endet mit Rückgabecode 0, und der Orin startet von selbst neu. Der
eigentliche Prüfschritt dieses Abschnitts ist der nächste: ein Gerät, das im USB-C-Netz
antwortet, wurde erfolgreich geflasht.

## 6. Das Netz über das USB-C-Kabel

Nach dem ersten Boot öffnet der Orin über dasselbe USB-C-Kabel ein kleines Netz. Der Orin ist
darin `192.168.55.1`, und dem Host gibt er `192.168.55.100`. Das steht in der eigenen
Konfiguration des Geräts, `/opt/nvidia/l4t-usb-device-mode/nv-l4t-usb-device-mode-config.sh`,
Zeilen `net_ip` und `net_dhcp_start`, am 2026-08-28 auf dem laufenden Orin gelesen, wo der
Dienst `nv-l4t-usb-device-mode.service` aktiv war. NVIDIAs Seite zum USB-Gerätemodus war an
dem Tag nicht erreichbar, dieser Abschnitt stützt sich darum allein auf das Gerät.

Lass das Kabel, wo es ist. Der Orin braucht nach dem Flash eine Minute; der erste Boot
vergrößert das Dateisystem und startet die Dienste.

**Prüfschritt:** am Host zeigt `ip -4 addr` eine Schnittstelle mit `192.168.55.100`, und
`ping -c 3 192.168.55.1` antwortet. Dann die Anmeldung mit dem Benutzer aus Abschnitt 3:
`ssh <name>@192.168.55.1 'cat /etc/nv_tegra_release'` gibt die Zeile der Fassung aus. Damit
hat der Orin ein Linux, einen Benutzer und eine Adresse, und der Handteil ist vorbei.

## 7. Ab hier arbeitet das Kit selbst

Alles Folgende läuft über die Verbindung aus Abschnitt 6 und ist der normale Weg aus
`.ara/knowledge/device.de.md`. Die Befehle stehen hier, damit sie am Tisch niemand suchen
muss:

1. **Die Akte und das Urteil.**
   `node .ara/tools/device.mjs --host 192.168.55.1 --user <name> --name <gerät>`
   legt die Akte an, liest, was das Gerät über sich sagt, und liefert das Urteil, mit dem
   Verifikationsstand des Profils vor allem anderen. `--customer <kunde>` für ein Kundengerät.
   Die Adresse ändert sich später, siehe 3.
2. **Der Schlüssel.** SSH-Schlüssel ausrollen nach `.ara/knowledge/remote-access.de.md`. Das
   Passwort aus Abschnitt 3 wird genau hier gebraucht und danach nicht mehr.
3. **Die echte Adresse.** Das USB-C-Netz gibt es nur am Tisch. Gib dem Orin seine Adresse im
   Kundennetz, trag sie als `address` in die Geräteakte ein und prüf die Verbindung noch
   einmal: `node .ara/tools/remote.mjs --device <gerät> --check`.
4. **Docker, dann Arasul.** `node .ara/tools/device.mjs --name <gerät> --install docker`,
   wenn es fehlt, dann `--install arasul` mit dem Token aus dem Portal. Beides sind Eingriffe
   der Stufe 2 und werden einmal bestätigt, mit Absicht, Ziel und Weg zurück.
5. **Die Selbstheilung** ist, was sich danach um das laufende Gerät kümmert:
   `node .ara/tools/heal.mjs --device <gerät>`, Verfahren `.ara/knowledge/self-healing.de.md`.
   Sie handelt nur im Verzeichnisbaum von Arasul. Nichts aus dieser Anleitung, nicht der
   Bootloader, nicht der Flash, nicht der Benutzer, wird von ihr je angefasst.

**Prüfschritt:** `node .ara/tools/device.mjs --name <gerät>` meldet die Verbindung über SSH,
das Profil mit seinem Verifikationsstand, und `arasul: running`, sobald Schritt 4 durch ist.
Ab hier sagen `/device` und `/maintain`, was als Nächstes kommt.

## Wenn es hakt

- **`lsusb` zeigt keine Zeile mit `0955`:** das Kabel steckt im falschen Anschluss, trägt
  keine Daten, oder die Tasten kamen in der falschen Reihenfolge. Abschnitt 4 von vorn.
- **`flash.sh` bricht ab:** die letzten Zeilen sagen, warum. Eine volle Platte am Host und ein
  ausgelassenes `apply_binaries.sh` sind die zwei häufigen Gründe. Beheben, wieder in den
  Recovery-Modus, noch einmal.
- **Kein `192.168.55.1` nach dem Boot:** eine Minute warten, dann `ip -4 addr` am Host.
  Erscheint kein `192.168.55.100`, Kabel abziehen und in denselben Anschluss wieder
  einstecken. Antwortet der Orin danach nicht, einen Bildschirm anschließen: was er dort
  zeigt, gehört in den Laufzettel, bevor jemand ein zweites Mal flasht.
- **Die Anmeldung wird abgelehnt:** der Benutzer aus Abschnitt 3 existiert am Gerät nicht,
  dann lief das Skript, bevor das Wurzeldateisystem ausgepackt war, oder nach dem Flash.
  Abschnitt 3 noch einmal, dann Abschnitt 4 und 5.
