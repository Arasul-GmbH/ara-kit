# Verfahren: das Kit an einen Kunden übergeben

> **Wann brauchst du das?** Wenn das Kit für einen Kunden eingerichtet wurde, der die Maschinen
> selbst betreibt, und das Repository jetzt an ihn geht (`/maintain`, Schritt "übergeben"). Und auf
> der anderen Seite: wenn `/init` merkt, dass dir dieses Kit übergeben wurde.

## Der Grundsatz

Das Repository gehört danach dem Kunden, und jeder Schlüssel auch. Niemand behält einen Schlüssel
"für den Notfall": ein Schlüssel, der nach der Übergabe am Gerät noch gilt, ist ein Zugang, den der
Kunde nicht gewählt hat. Die Übergabe endet darum mit zwei Dingen, die sich zeigen lassen: die
Schlüssel des Neuen gehen, die alten nicht.

## Übergeben (Zweig Unternehmen)

Zuerst `business/profile.md` lesen. Ein Partnerprofil kennt keine Übergabe: Kundenakten gehen nie in
einem Repository weiter. Steht `partner` im Profil und soll der Kunde sein eigenes Kit führen,
braucht er einen eigenen Klon mit eigenem Profil (Zweig Unternehmen), nicht diesen.

```
node .ara/tools/transfer.mjs --prepare --to "<Name>"          der Plan, nichts wird geschrieben
node .ara/tools/transfer.mjs --prepare --to "<Name>" --yes    schreiben
```

Was es tut, im Klon und nichts am Gerät:

- `versioned: business, devices, apps` ins Profil und die passenden Ausnahmen in die `.gitignore`,
  damit diese drei Ordner mit dem Repository gehen.
- Eine Suche in den drei Ordnern. Eine Datei, die nach einem Geheimnis aussieht (Kit-Schlüssel,
  privater Schlüssel, Zugangstoken, Passwort, eine `.env`), hält die ganze Vorbereitung an, mit Ort
  und Art, nie mit dem Wert. Das Geheimnis in die Ablage legen, in der Datei bleibt sein Name.
- `business/handover.md`: das Blatt für den, der übernimmt, in einfachen Worten, und die drei Dinge,
  die das Kit später braucht: je Gerät der Fingerabdruck des alten Anmeldeschlüssels, der Anfang des
  alten Kit-Schlüssels und ein leeres Feld `done_`. Keines davon ist ein Geheimnis, das Gerät druckt
  sie in seinen eigenen Listen.

Danach von Hand, weil es nach außen wirkt: die drei Ordner festschreiben, in ein **privates**
Repository schieben, mit dem Neuen teilen. Vorher fragen, ob das gewollt ist, und das Repository
nennen.

## Was klar sein muss (vor dem Vorbereiten)

- Wer übernimmt, mit Namen, und ob er mit Claude Code oder Codex arbeitet (das Blatt ist dasselbe).
- Welche Geräte mitgehen. Voreinstellung: alle unter `devices/`.
- Wo das Repository liegt und wer es lesen darf. Privat, nur benannte Konten.
- Wie der Neue seinen ersten Weg aufs Gerät bekommt: das Passwort der Anmeldung am Gerät, **außerhalb**
  des Repositorys weitergegeben. Kennt es keiner und nimmt das Gerät nur Schlüssel, braucht die
  Übergabe den Übergebenden noch einmal, siehe `--authorize` unten.
- Ob andere Personen oder Arasul selbst Schlüssel halten, die auch gehen sollen (die Liste am Ende
  der Übernahme zeigt sie).

"genug" beendet die Fragen: was offen bleibt, wird eine Zeile im Blatt.

## Übernehmen (der Neue)

`/init` ruft zuerst `node .ara/tools/init.mjs --show` auf. Sagt die erste Zeile, dass das Kit
übergeben wurde, kommt das vor allem anderen: in zwei Sätzen sagen, was passiert ist (die Dateien
gehören ihm, die Schlüssel noch nicht), dann weiter.

```
node .ara/tools/transfer.mjs --accept                     der Plan je Gerät
node .ara/tools/transfer.mjs --accept --yes               ausführen
node .ara/tools/transfer.mjs --accept --yes --revoke-others   auch andere gültige Kit-Schlüssel widerrufen
```

Je Gerät in dieser Reihenfolge, und die Reihenfolge ist der Punkt:

1. Ein eigener Anmeldeschlüssel (Ed25519, mit Passphrase, in `~/.ssh`, Name `ara-<Gerät>`).
2. Dessen öffentliche Hälfte aufs Gerät, über den Weg hinein, der heute noch geht.
3. Beweis: eine Anmeldung allein mit dem neuen Schlüssel.
4. Ein eigener Kit-Schlüssel, vom Gerät ausgestellt und in der Geheimnis-Ablage abgelegt. Sein Text
   wird nirgends gezeigt.
5. Erst jetzt: der alte Kit-Schlüssel wird widerrufen, der alte Anmeldeschlüssel aus dem Gerät
   genommen.
6. Am Gerät nachgezählt: welche Kit-Schlüssel und welche Anmeldeschlüssel noch gelten. Andere werden
   aufgelistet und bleiben, außer mit `--revoke-others`. Die zu widerrufen ist unumkehrbar und ein
   eigenes Ja.

Hat Schritt 2 keinen Weg hinein (das Gerät nimmt nur Schlüssel und der Neue hat noch keinen), hört
das Werkzeug auf, gibt die **öffentliche** Hälfte aus und sagt, was zu tun ist: der Übergebende
führt

```
node .ara/tools/transfer.mjs --authorize <Datei mit dem öffentlichen Schlüssel> --device <Gerät> --yes
```

aus, und der Neue führt `--accept` noch einmal aus. Das ist der einzige Fall, in dem der Neue den
Alten braucht.

**Das Produkt veröffentlicht keine Schnittstelle für Anmeldeschlüssel.** Das Kit erfindet keine:
der Anmeldeschlüssel geht über den Weg aufs Gerät, der besteht, der Kit-Schlüssel über das
Schlüsselskript der Plattform am Gerät, dasselbe, das `device.mjs --keys` und `--revoke-key`
benutzen. Bietet das Gerät später eine Route an, gehört sie in den Kontrakt und dann hierher.

## Beweisen, dass die alten Schlüssel tot sind

Der Übergebende führt in seinem eigenen Klon aus:

```
node .ara/tools/transfer.mjs --prove
```

Es probiert seinen Anmeldeschlüssel (nur Schlüssel, kein Passwort) und seinen Kit-Schlüssel am
Gerät. Ausgang 0 heißt: beide werden abgewiesen. Ausgang 1: einer geht noch, die Übergabe ist nicht
fertig. Ausgang 2: eine Prüfung ließ sich nicht machen (kein Netz, keine Adresse): das ist kein
Beweis, und das wird so gesagt. Danach darf er die toten Einträge aus seiner Ablage vergessen.

## Was du aufschreibst

Für den Übernehmenden: die Geräteakte bekommt den Eintrag (das Werkzeug schreibt ihn), und
`business/handover.md` bekommt `status: accepted`. Für den Übergebenden: eine Zeile in `customers/`
oder im Verlauf, dass die Übergabe stattfand und wann `--prove` geschlossen ergab.
