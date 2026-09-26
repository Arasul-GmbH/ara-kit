# Pattern 7: clients, who sees what and who decides

Why clients and approvals look like this stands in `.ara/knowledge/app-professional.md`; here stand
what the pattern decides, code, wiring and what was checked. Index: `.ara/knowledge/app-patterns.md`.

**What it decides**: a mapping per name from the login header, no second login; only a name the app
has seen can be mapped, so a new employee opens the app once. The store is built per request for one
name, the filter stands in the WHERE, a foreign item does not exist, without a name nothing does.
Foreign is 404, 403 only for the management, and that only for a role in `freigaben.rollen` and
`koepfe.rollen`; the management sees items only of its own clients. **Seeing is not deciding**: a
mapping marked `entscheidet` decides, the others only see. An item is created in work and submitted
by its own route; afterwards changing and submitting get 409.

**The files**: the migrations `004` (clients, seen accounts, mappings, `mandant` at the items) and
`006` (`entscheidet` at the mapping); `backend/ablage/mandanten.mjs` with `nurZugeordnete`, the
filter as SQL for every store; `backend/ablage/vorgaenge.mjs`, replacing the scaffold's; the core
with `verwaltungsRolle`, `regel` and `zustaendig`; the routes; the management page with
`MandantWahl` and `VorgangEinreichen`.

**Wiring**: copy the folders, the lines from the head of `backend/wege/mandanten.mjs` into
`server.mjs` **before** the routes of the items, a `Route`, a sidebar entry only the management sees,
`MandantWahl` into `seiten/neu.tsx`, `VorgangEinreichen` into the details, as the head of
`frontend/src/seiten/mandanten.tsx` shows. `bereit` in those lines says when an item is complete.
Then `--build`.

**Checked by the self-test** against a played device with other role names: foreign items 404, the
management 403 without the role, only deciders in the rule, 409 after submitting, the filter in
every query. **On the Orin on 26.09.2026** with two accounts in staging: in work without a run, no
receipt 409, only the decider in the rule, the submitter 403 at the device, afterwards 409, the
flow's sentence caught up 22 seconds after the approval.
