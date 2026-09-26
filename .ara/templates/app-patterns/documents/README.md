# Pattern 2: upload a document and show it in the viewer

A document somebody uploaded is looked at on the device instead of downloaded: PDF with pages, zoom
and full screen, an image the same way, in the library's `Dokumentanzeige` (since 4.1.0, which the
scaffold carries). Index: `.ara/knowledge/app-patterns.md`.

**The files**: the table as second migration, the store (its list carries no bytes), a core taking
PDF and images up to a limit, the routes (the file raw as the body, its name in a header), and the
page: `Dateiablage` takes the file, `Datenliste` lists, `Dokumentanzeige` shows the chosen one. **Wiring**: copy `backend/`
and `frontend/` over the app's folders; the heads of `backend/wege/dokumente.mjs` and
`frontend/src/seiten/dokumente.tsx` show the lines for `server.mjs`, the `Route` and the sidebar.
Then `--build`.

The viewer, read in the library on 15.09.2026:

- Its `quelle` is a `File`, a `Blob` or an address of the same origin; without one it shows its
  empty state. **Give it the `art`**, `pdf` or `bild`, for an address: the app's byte address has
  no extension to read the kind off, so the page takes it from the stored type. `name` stands in its
  head, `hoehe` is the box's height as CSS, `kennzeichen` the mark for a test.
- **The PDF library needs support files next to the built JavaScript**, the folder `pdf-dateien/`,
  laid there by the scaffold's `vite.config.ts` at every build. Without it an image shows and a PDF
  ends in the error state.
- `Dateiablage` has a preview (`vorschau`); this page switches it off, two viewers would be one too
  many.

**The bytes lie in the app's database** as `BYTEA`, why: `.ara/knowledge/app.md`, "Data that stays".
The limit is ten megabytes per file, set in the core and told to the page; it hangs on the
container's memory in the manifest, raise both together. Reading a document into fields is pattern
6, next door under `extract/`.
