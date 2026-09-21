---
name: where-things-go
description: Entscheiden, wohin etwas Neues in dieser Wurzel gehört. Nutze es, wenn eine Datei, eine Notiz, ein Ordner oder ein Ort angelegt werden soll und unklar ist, wohin.
---

# Wohin etwas Neues gehört

1. Lies die Tabelle "Wohin Neues gehört" in `.claude/CLAUDE.md`. Sie ist die einzige
   Antwort. Verlass dich nicht darauf, was andere Wurzeln tun.
2. Eine Zeile passt: leg es dort ab, eine Datei je Thema.
3. Keine Zeile passt: leg nicht von dir aus einen Ordner oben an. Sag, was fehlt, und schlag
   eine Zeile für die Tabelle und einen Namen für den Ordner vor. Der Mensch entscheidet,
   und dann entstehen Ordner und Zeile zusammen. Ohne die Zeile meldet die Prüfung den
   Ordner.
4. Es ist Code: er gehört überhaupt nicht in diese Wurzel. Er gehört in einen Ort. Nenne den
   Ort, oder frag, ob einer in `.claude/places.json` eingetragen werden muss.
5. Es ist ein Geheimnis: nicht in diese Wurzel, nicht in einen Ordner direkt darunter.
   Schlüsselbund oder Passwortmanager, und eine Zeile, die sagt, wo es liegt.
6. Eine Tatsache, die in einem Ort lebt, bleibt dort. Verweise darauf, statt sie zu kopieren,
   und verweise auf den Ordner, nicht auf das, was darin liegt.

Nach der Änderung läuft `node .claude/scripts/check.mjs`.
