# Das Kit unter Codex

Das Kit läuft in Codex und in Claude Code aus denselben Dateien. Dieses Blatt ist für die Momente,
in denen unter Codex etwas nicht so geht, wie die anderen Blätter es schreiben. **Stand
2026-10-01, gemessen mit Codex 0.159.3** in einem frischen Klon, interaktiv, im normalen Modus.
Die Stufe eines Codex-Merkmals kann sich ändern; der Selbsttest prüft das wichtigste
(`codex features list`).

## Wie das Kit verdrahtet ist

| Was | Wo | Warum es dort liegt |
|---|---|---|
| Die Regeln | `AGENTS.md` | Codex liest sie von selbst. `.claude/CLAUDE.md` enthält nur `@../AGENTS.md`. |
| Die Befehle | `.agents/skills/<name>/SKILL.md`, gerufen als `$name` | Codex kennt keine eigenen Befehle, nur Skills. `init` ist getrackt, die anderen schreibt `commands.mjs` aus `.ara/commands/`. |
| Die übrigen Skills | `.agents/skills/`, von `.claude/skills/` aus verlinkt | Eine Kopie für beide Agenten. |
| Der Riegel | `.codex/hooks.json` | Startet `guard.mjs` vor jedem Shell-Aufruf, wie der Hook in `.claude/settings.json`. |
| Netz, Rückfragewerkzeug, Browser | `.codex/config.toml` | Sandbox mit Netz, `request_user_input` im normalen Modus, der Browser aus `.mcp.json`. |
| Eine Ausnahme von der Sandbox | `.codex/rules/ara.rules` | `commands.mjs` darf `.agents/skills` außerhalb von ihr schreiben. |

## Der erste Start

Codex fragt zweimal, einmal je Sache, und das Kit braucht beide Male ein Ja:

1. **Diesem Ordner vertrauen.** Davor lädt Codex die Skills und sonst nichts: keine
   `config.toml`, keinen Hook, keine Regel. Die Warnung sagt das.
2. **Hooks müssen geprüft werden.** Der Riegel ist für Codex neu. Wähl „Trust all and continue“
   oder öffne die Prüfung und drück `t`. Ohne das läuft der Riegel nicht, und zwischen einem
   Agenten und `cat .env` steht nur seine eigene Sorgfalt. Codex fragt erneut, wenn sich
   `.codex/hooks.json` ändert.

Ein Git-Worktree des Kits ist dafür kein Klon: im Test hat Codex die Hooks eines Worktrees nicht
ausgeführt, dessen Hauptordner keine hatte. Nimm einen einfachen Klon.

## Das Rückfragewerkzeug

`request_user_input`, höchstens drei Fragen mit je zwei oder drei Optionen, keine Mehrfachauswahl.
Codex hängt „None of the above“ mit einem Notizfeld selbst an, das ist der Freitext, und was dort
steht, gilt. Wie eine Runde aufgeteilt wird und wie Mehrfachauswahl gefragt wird, sagt die Persona.

Im normalen Modus braucht das Werkzeug `features.default_mode_request_user_input = true`, das
setzt `.codex/config.toml`. Stufe „under development“. Scheitert ein Aufruf oder wird das
Werkzeug nicht angeboten:

1. Sag das in einem Satz und bitte den Menschen, diese Phase im Plan-Modus von Codex zu fahren.
   Dort ist das Werkzeug stabil.
2. Geht auch das nicht: nummerierte Optionen im Text, ein Block, und der Mensch antwortet mit
   einer Nummer oder in eigenen Worten.

Ein Unteragent kann unter Codex nicht fragen, nur der Hauptfaden. In `codex exec` gibt es das
Werkzeug gar nicht, ein Aufruf wird abgelehnt: `/init` geht dort über
`node .ara/tools/init.mjs --answers <Datei>`, alles andere hält an und sagt, was fehlt.

## Was die Sandbox ändert

Codex führt die Shell in einer Sandbox aus, die nur in den Kit-Ordner schreibt.

- **Das Netz** ist aus, solange nichts anderes dasteht. `.codex/config.toml` schaltet es ein,
  damit `ssh`, `gh`, der Download des Installers und der Browser gehen. Gemessen: `remote.mjs`
  erreichte ein Gerät per SSH, und ohne den Schalter hielt `ssh` mit „Operation not permitted“ an.
- **`.agents/`, `.codex/` und `.git/` sind in der Sandbox schreibgeschützt**, was die Schalter
  auch sagen. `commands.mjs` schreibt die Befehle als Skills nach `.agents/skills`, und
  `.codex/rules/ara.rules` lässt genau diesen Aufruf außerhalb der Sandbox laufen. `update.mjs`
  ersetzt Dateien in allen drei Ordnern: es prüft vorher, hält mit „Nichts eingespielt“ an und
  lässt das Kit, wie es war, und Codex kann dann den Menschen fragen, ob es außerhalb der Sandbox
  laufen darf. Die Antwort ist ein Ja zu diesem einen Aufruf.
- **`~/.ssh/known_hosts` lässt sich nicht schreiben.** Ein Gerät, das diesem Rechner neu ist,
  verbindet, aber SSH meldet jedes Mal „Failed to add the host to the list of known hosts“ und
  merkt sich nichts. Ein `ssh <Gerät>` im eigenen Terminal des Menschen behebt das. Den privaten
  Schlüssel liest es nur.
- **Der Browser** ist derselbe Playwright-Server wie unter Claude Code, gesetzt in
  `.codex/config.toml` mit `default_tools_approval_mode = "approve"`. Ohne diese Zeile fragt jeder
  Browseraufruf nach.

## Was unter Codex schmaler ist als unter Claude Code

Sag es, wie es ist, wenn jemand fragt.

- Die Rückfragen: drei je Runde statt vier, zwei oder drei Optionen statt vier, keine
  Mehrfachauswahl, keine Vorschau als Skizze.
- Die Berechtigungen: Claude Code hat eine Erlaubnis- und eine Sperrliste in
  `.claude/settings.json`, Codex nichts davon. Der Riegel ist der eine Zaun gegen das Lesen von
  `.env` und privaten Schlüsseln, und er ist eine Textsuche auf Shell-Aufrufe. Er hält auch
  `remote.mjs --command "rm -rf /"` an, aber ein Aufruf, der um ihn herum gebaut ist, kommt durch.
- Der erste Start fragt zwei Dinge mehr, und `update.mjs` braucht eine Freigabe mehr.
- `/root` und seine Einschreibung nach `~/.claude` gibt es vorerst nur für Claude Code.
- Das Rückfragewerkzeug im normalen Modus und der Riegel ruhen auf einer Stufe und auf einer
  Prüfung, die Codex ändern kann.
