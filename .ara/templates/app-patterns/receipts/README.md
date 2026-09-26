# Pattern 8: receipts per client at an item

Patterns 2, 6 and 7 together: a receipt hangs at an item, belongs to its client, the device reads
it, and nobody of another client sees it. Index: `.ara/knowledge/app-patterns.md`.

**The files**: the fifth migration, a column `mandant` at documents and readings, `vorgang` at
documents; the stores of patterns 2 and 6 replaced by ones built per request for one name, with
`nurZugeordnete` in every query; the routes in `backend/wege/belege.mjs`; `BelegeAmVorgang` for the
details of an item. **The client comes from the item**, never from the request. A reading carries
its own: its log stays when the document goes.

**Wiring**: patterns 2, 6 and 7 first, then this folder over them. The head of
`backend/wege/belege.mjs` replaces the lines of patterns 2 and 6 in `server.mjs`, the head of
`frontend/src/seiten/belege.tsx` shows the line in `seiten/liste.tsx`. Then `--build`.

**Checked by the self-test** against a played device: a foreign document, its bytes and its reading
404, its log empty; a receipt without an item 400; the reading reaches the device with its human.
