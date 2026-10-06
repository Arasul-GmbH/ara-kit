# Pattern 7: clients, who sees what and who decides

Why clients and approvals look like this stands in `.ara/knowledge/app-professional.md`; here stand
what the pattern decides, code, wiring and what was checked. Index: `.ara/knowledge/app-patterns.md`.

**What it decides, in plain words**: the administrator hands each employee the files they work on
(a "client" here is any file: a client, a project, a case). An employee sees only those files and
nothing of the others. Somebody else's file does not exist for them: they get "not found", never
"not allowed", because "not allowed" would tell them the file is there. Only the administrator may
hand files out. **Whether the administrator sees every file is a decision of the app**, a switch in
one line (`alleSehen`): in a tax office the partners see every file, in a business with separate
departments the administrator too sees only what is handed to them (the default). The interview
asks for it. **Handing out works before the first visit too**: a new employee is noted in advance
under the name of their account, sees their files when they first open the app, and until then
stands in the list as "never opened". **Seeing is not approving**: for each employee and file the administrator also says whether they may approve it or
only look. A new item is first "in work", is sent in by its own button, and after that nobody can
change it any more.

How it works underneath: the name comes from the device's login header, so there is no second
login; the app cannot list the device's accounts, so the management chooses from the names it has
seen or notes a new one in advance. The store is built per request for a view (a name, or
`{ benutzer, alle }` for the management with `alleSehen`), and the filter stands in the WHERE, so a
foreign item does not exist, and without a name nothing does. Foreign is 404; 403 only for the management, and that
only for a role in `freigaben.rollen` and `koepfe.rollen`. A mapping marked `entscheidet` decides,
the others only see. Changing and submitting a sent item get 409.

**The files**: the migrations `030` (clients, seen accounts, mappings, `mandant` at the items) and
`031` (`entscheidet` at the mapping); `backend/ablage/mandanten.mjs` with `nurZugeordnete`, the
filter as SQL for every store; `backend/ablage/vorgaenge.mjs`, replacing the scaffold's; the core
with `verwaltungsRolle`, `sicht`, `regel` and `zustaendig`; the routes; the management page with
`MandantWahl` (with exactly one client it is chosen) and `VorgangEinreichen`. **The migrations do
not collide** with the scaffold (001 to 009) and the other patterns (a ten each); the app's own
begin at 100.

**Wiring**: copy the folders, the lines from the head of `backend/wege/mandanten.mjs` into
`server.mjs` **before** the routes of the items, a `Route`, a sidebar entry only the management sees,
`MandantWahl` into `seiten/neu.tsx`, `VorgangEinreichen` into the details, as the head of
`frontend/src/seiten/mandanten.tsx` shows. `bereit` in those lines says when an item is complete.
The folder `backend/probe/` comes along with the copy. Then `--build`.

**The test that ships with it**: `backend/probe/fremde-akte.mjs` creates two sample files, hands one
to each of two employees, and tries from one side everything that could reach the other's file:
view, change, send in, create inside it, find it in the list. Every answer must be 404. **It needs
three sessions, not two**: a management account (the role that keeps the clients, on the device
mostly admin, the app shared with it in staging) that creates the sample files, and two employees
without that role. The three sessions stand in a file (`--sitzungen <file>`), not in the call, and
the file goes afterwards; its shape stands in the head of the test. Run it in staging before the app
goes live; it removes the assignments again afterwards. A device with a self-signed certificate needs `--unsicher` ("unsafe"),
which accepts that certificate for the test's own requests and nowhere else.

**Checked by the self-test** against a played device with other role names: foreign items 404, the
management 403 without the role, only deciders in the rule, 409 after submitting, the filter in
every query. **On the Orin on 26.09.2026** with two accounts in staging: in work without a run, no
receipt 409, only the decider in the rule, the submitter 403 at the device, afterwards 409, the
flow's sentence caught up 22 seconds after the approval.
