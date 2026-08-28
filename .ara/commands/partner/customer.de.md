---
description: Kunde anlegen oder öffnen
argument-hint: <kundenname>
---

Kunde: **$1**

Lies `.ara/knowledge/customer-file.md` und arbeite danach. Wissen, das dieser Befehl
lädt: `.ara/knowledge/customer-file.md`, `.ara/knowledge/crm.md` für Verlauf und
Wiedervorlage, `.ara/knowledge/sales.md` beim Erstkontakt. Das Profil in
`business/profile.md` liest du vorher, es sagt dir, wie viel du erklärst.

**Zuerst nachsehen, dann reden.** Das Werkzeug liest die Akte, die Geräte des Kunden,
sein Papier und seinen Verlauf an einer Stelle:

```
node .ara/tools/customer.mjs                       welche Kunden es gibt
node .ara/tools/customer.mjs --customer $1         Lagebild
```

- **Kein Argument angegeben:** die Übersicht zeigen, je eine Zeile mit Stand, Geräten und
  letztem Kontakt, und fragen, um welchen es geht.
- **Akte existiert (auch unter ähnlichem Namen):** öffnen. Was das Werkzeug ausgibt, ist
  deine Grundlage, nicht dein Text. Sag in eigenen Worten, wo der Kunde steht, welche
  Geräte er hat und in welchem Zustand, und was ansteht. **Nicht vorlesen.**
- **Akte existiert nicht:** anlegen. Vorher nachsehen, was du selbst herausfinden kannst
  (Website), dann eine gebündelte Interview-Runde, dann schreiben:

  ```
  node .ara/tools/customer.mjs --customer $1 --new --legal-name "<Firmierung>"
  ```

  Das legt Ordner und Frontmatter an, den Rest füllst du aus dem Gespräch. Warnt es vor
  einem ähnlichen Namen, ist das meist derselbe Kunde ein zweites Mal: nachsehen, statt
  `--force` anzuhängen.

## Die Geräte hängen am Kunden

Ein Kundengerät liegt unter `customers/$1/devices/<gerät>/`, angelegt wird es mit
`/device $1/<gerät>`. Seine Akte sagt, ob das Kit es überhaupt ansprechen kann: `address`
für SSH, `api_base` für die Schnittstelle, wenn sie woanders liegt, `tls` bei einem selbst
ausgestellten Zertifikat, `api_key_ref` für den Kit-Schlüssel. Was das Werkzeug dazu
ausgibt, ist eine Aussage über die **Akte**. Ob das Gerät antwortet und wie es ihm geht,
sagt `/maintain $1/<gerät>`.

Die eigenen Geräte des Partners gehören keinem Kunden und liegen unter `devices/`. Leg
dafür keinen Scheinkunden an.

## Nach dem Gespräch

Eintrag unter `customers/$1/history/`, `last_contact` auf heute, `follow_up` mit einem
Halbsatz, worum es dann geht. Das sind drei Zeilen und der Unterschied zwischen einer
Akte und einem Ordner voller Dateien.

Ab jetzt arbeitest du ausschließlich in `customers/$1/`. Kein Blick in andere Kundenordner.
