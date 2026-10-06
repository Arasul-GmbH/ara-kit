# Procedure: ten shapes of an app beyond the form

> **When do you need this?** In the interview, while the idea is still forming, and whenever
> somebody takes Arasul for a form tool. The device brings login, permissions, flows and models, the
> app brings the rest, and it can do everything a program can do.

**Arasul is the infrastructure underneath, not the app.** Showing a PDF, sending a mail, calling a
foreign service, a foreign tool behind the login: that is the app's own doing, and the product
provides no service for it, by decision and not by gap.

Every pattern is code under `.ara/templates/app-patterns/`, and **next to the code lies its sheet**,
`README.md`. Read only the sheet of the pattern the plan takes. **Wire it in with the tool, not by
hand**: `node .ara/tools/app.mjs --app <app> --add-pattern <name>` copies files and migrations and
sets the lines in `server.mjs` and the pages; a missing prerequisite it names. The self-test runs
them, and **none carries a route, header or environment name of the device**: they read
`arasul.json`, like the scaffold.

| Pattern | What it shows | Sheet |
| --- | --- | --- |
| 1. Routes with a sidebar | A page per area, the areas in the sidebar | The scaffold itself, below |
| 2. Upload a document and show it | File in, bytes stored, PDF or image in the library's viewer | `.ara/templates/app-patterns/documents/README.md` |
| 3. Send a mail | A mail to the customer's relay | `.ara/templates/app-patterns/mail/README.md` |
| 4. Call a foreign API | An address outside the device, with timeout | `.ara/templates/app-patterns/foreign-api/README.md` |
| 5. A foreign container | A finished image behind the device's login | `.ara/templates/app-patterns/foreign-container/README.md` |
| 6. Read a document | Fields out of a receipt, checked, every reading logged | `.ara/templates/app-patterns/extract/README.md` |
| 7. Clients | Who sees which client, who decides | `.ara/templates/app-patterns/clients/README.md` |
| 8. Receipts per client | 2, 6 and 7 together: receipt at an item, read, separated per client | `.ara/templates/app-patterns/receipts/README.md` |
| 9. Booking batch for the tax adviser | A DATEV file out of approved bookings, SKR03 accounts, a check script that runs before every download | `.ara/templates/app-patterns/datev/README.md` |
| 10. Log of an item | Who did what when, only appended | `.ara/templates/app-patterns/history/README.md` |

**Pattern 1 is the scaffold**: one `Route` per page in `Wege()` of
`.ara/templates/app/frontend/src/app.tsx`, the library's `Seitenleiste` in `rahmen/seitenleiste.tsx`,
one file per page under `seiten/`. **A new area is three steps**: a page, a `Route`, a sidebar
entry. Routes stay one level deep (`dokumente?nr=17`, not `dokumente/17`).

**What `/app` does with this.** The wish is often small, "a form for the holiday request". Name
once what lies next to it: a document, a mail, a lookup, a tool the office uses anyway, a receipt
the device reads, clients. The plan names the pattern it uses; after `--new` the tool names this
sheet. **A description of an office, tax adviser or bookkeeping**: run
`node .ara/tools/app.mjs --patterns "<the description so far>"`, it names pattern 9 and its limit, and
you offer it as a question.

**Drafts for the follow-up question.** A vague answer in the interview ("with approvals") is
answered with options that are finished drafts, not with a blank question. Take them from the
pattern the idea is nearest to and from what the house works with, for instance for a leave
request on pattern 1: "Request with four fields: from, to, kind of leave, substitute", "Two
steps: team lead, then personnel", "List of my requests first, form behind a button". Each
option says in one sentence what it costs. The human picks one, changes it in free text or
writes their own, and what they write holds.
