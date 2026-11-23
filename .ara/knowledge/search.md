# The search of an app: what the device's search bar finds

> **When do you need this?** When an app has lists (`/app`), when `--check` shows a hint
> "Search:", and when an existing app catches up with the search.

## What it is, in plain words

At the top of the device sits a search field, the search bar. Whoever types "Podest" or a
customer's name there should find not only the app but the entry in it: the offer, the case, the
receipt. For that the device asks every app that can do it, on behalf of the person typing, and
shows their hits. A click opens the entry in the app.

An app can do it when it has a **search route**: an address of its backend that answers a search
text with a short list of hits. An app without a search route stays valid; the device then shows it
only as an app.

## The contract

| What | How |
|---|---|
| Question | `GET suche?q=<text>&limit=<n>` at the app's interface: `/apps/<id>/api/suche`, in staging `/apps/<id>/test/api/suche` |
| Answer | `{ "data": [ { "titel", "unterzeile", "art", "pfad" } ] }`, all four as text |
| Number | at most ten, even if `limit` asks for more; ten without `limit` |
| Too short | an empty `q` or one under two characters gives an empty list, not an error |
| `pfad` | where the entry opens, below the app's address, starts with `/`: `/?nr=17` |
| Who finds what | the same entries as in this person's list, from the user and role headers the device sets. Nobody finds what they may not see |
| Announced | an entry in the field `agent` of `app.json`, reading, with `q` (string, required) and `limit` (integer, optional). No new manifest field, no new contract version |

The entry in the field `agent` is the same one through which agents call an app. So
`node arasul.mjs call <app> suche q=Podest` works from the root of a house too.

## A new app

It already has the search: `node .ara/tools/app.mjs --app <name> --new` lays it out. What lies
where:

- `backend/kern/suche.mjs`: the rules above, without database and without HTTP, with tests in
  `backend/test/`.
- `backend/ablage/vorgaenge.mjs`, `suchen(begriff, grenze)`: the same query as the list, only with
  the search text in title and text.
- `backend/server.mjs`: the route `GET /suche` and the list `suchquellen`, one source per list.
- `app.json`: the entry in `agent`.

The patterns follow when wired in with `--add-pattern`. **Clients** replaces the source of the
cases with one in the view of the person asking. **Documents** and **receipts** add the documents,
receipts also in the view of the clients. The search looks in the title and text of a case and in
the file name of a document. If a specialised app has lists of its own, each gets its source, after
the same model.

## Bringing an existing app up to date

An app built before the search gets the hint "Search: the app has lists but no search for the
device's search bar" at `--check`. This is how it catches up, in this order:

1. **Copy the core.** `.ara/templates/app/backend/kern/suche.mjs` into the app's `backend/kern/`. If
   its `backend/ablage/db.mjs` has no `likeMuster` yet, take the function from the template.
2. **One query per list.** In the store of every list that should be found, a function
   `suchen(begriff, grenze)`: **the same condition as the list**, plus
   `LOWER(column) LIKE $n ESCAPE '\'` with `likeMuster(begriff)` and `LIMIT`. Model: `suchen` in
   `.ara/templates/app/backend/ablage/vorgaenge.mjs`, with clients in
   `.ara/templates/app-patterns/clients/backend/ablage/vorgaenge.mjs`. The query never takes fewer
   conditions than the list.
3. **The route.** In `backend/server.mjs`: `import { suchen, vorgangsQuelle } from
   "./kern/suche.mjs";`, after the database is opened the line
   `const suchquellen = [vorgangsQuelle(() => vorgangsAblage(db))];`, and before the other routes
   the block `if (pfad === "/suche" …)`, all as in the template. With clients the line reads
   `const suchquellen = [vorgangsQuelle((wer) => vorgangsAblage(db, mandantenFall.sicht(wer)))];`,
   with documents `suchquellen.push(dokumentQuelle(…))` comes along, the way `--add-pattern` puts
   it in (`.ara/templates/app-patterns/*/wiring.json`).
4. **Announce it.** The entry in the field `agent` of `app.json`, as in
   `.ara/templates/app/app.json`. Fit the sentence in `purpose` to what the app finds.
5. **Check.** Locally `curl "http://127.0.0.1:<port>/suche?q=<word>"`; with clients the probe
   `node backend/probe/fremde-suche.mjs` (its head says how, in staging, never live). Then
   `--build`, `--check` (the hint is gone) and `--deploy` into staging, there
   `node arasul.mjs call <app> suche q=<word>`.

An app that does not come from the template builds the route in its own stack after the contract
above. For the kit what counts is the entry in `agent` with `q`, and that the route stands in the
backend.

## What nobody may find

The search is a second way to the same entries, and it may not reach further than the first.
That is why every source builds its store exactly like the route of the list, with the person from
the headers. Without a login nobody finds anything. In an app with clients the probe
`backend/probe/fremde-suche.mjs` proves it: staff member A creates a case in their file, A finds
it, B with another file finds it under no word. The search hands out only a title, one line and
the path, never the whole entry.
