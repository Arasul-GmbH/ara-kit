# Pattern 10: the log of an item, who did what when

"Traceable, who did what when" is a wish of nearly every office app. This pattern keeps a log per
item that is only ever appended to: created, submitted, approved or refused (by whom, with the
reason), not counted, completed (with what a person changed in the suggestion). Index:
`.ara/knowledge/app-patterns.md`.

**Wiring**: `node .ara/tools/app.mjs --app <app> --add-pattern history`, then `--build`. It needs no
other pattern; with pattern 7 the log follows the client's view.

**How it works**: the core of the scaffold reports every event of an item to `melden` in
`server.mjs`, the completion of a run too. Without this pattern nobody listens; with it the log
listens (`mitschreiber.push`) and writes a line into the table `verlauf` (migration `050`). The store
only knows `anhaengen` and `amVorgang`: no way changes or removes a line. Your own events (a receipt
attached, a field changed) go to the same place: `await melden({ vorgang, was, wer, angaben })`.

**Who sees it**: `GET /vorgaenge/<id>/verlauf`, for whoever sees the item; a foreign one is 404,
also in the test "foreign file" of pattern 7. The details of an item show it as the last entry.

**When**: the time is when the app learned it. An approval it learns at the next update, seconds
later; if the device names the moment of the decision (`entschieden_am`), it stands in the entry.

**Checked by the self-test**: created, submitted, approved by the decider, completed with the change
of the amount, in this order; a foreign item 404; deleting 405.
