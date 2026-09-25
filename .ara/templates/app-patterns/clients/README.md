# Pattern 7: clients, who sees what and who decides

What the pattern decides and why stands in `.ara/knowledge/app-professional.md`, "Clients: who sees
what"; here stand code, wiring and what was checked. Index: `.ara/knowledge/app-patterns.md`.

**The files**: the fourth migration, clients, seen accounts, mappings, a column `mandant` at the
items; `backend/ablage/mandanten.mjs` with `nurZugeordnete`, the filter as SQL for every store;
`backend/ablage/vorgaenge.mjs`, replacing the scaffold's store of items; the core with
`verwaltungsRolle` (the role out of the contract, another one has to stand in `koepfe.rollen`),
`regel` and `zustaendig`; the routes; the management page with `MandantWahl`.

**Wiring**: copy the folders, the lines from the head of `backend/wege/mandanten.mjs` into
`server.mjs` **before** the routes of the items, a `Route`, a sidebar entry only the management sees,
`MandantWahl` into `seiten/neu.tsx`, as the head of `frontend/src/seiten/mandanten.tsx` shows. Then
`--build`.

**Checked by the self-test** against a played device with role names unlike the Orin's: two
accounts, two clients, foreign items 404, the management 403 without the role, the deciders from the
mapping, a decision from somebody no longer responsible not counting, the filter in every query.

**Checked on the Orin on 26.09.2026**, a probe in staging with two real account names in the
platform's headers, asked at the container because nobody was released: each saw only their client,
foreign items and submissions 404, the management 403 for `mitarbeiter` and open for `admin`, out of
the contract. Only the submitter mapped: no run, with the reason. A mapped decider: the device
refused with 400, the submitter had no release. **A run a mapped decider approves was not seen**: it
needs a release for two accounts, so an administrator's session. That is the first proof on the
customer's device, written into its runsheet.
