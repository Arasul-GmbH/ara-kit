# Pattern 9: booking batch for the tax adviser (DATEV)

For an office that keeps books or prepares them: the app turns approved bookings into the file the tax
adviser reads into DATEV, and checks that file before anybody downloads it. Index:
`.ara/knowledge/app-patterns.md`. What the standards of a foreign format mean for an app:
`.ara/knowledge/app-professional.md`, "Professional standards".

## In plain words

DATEV is the program most tax advisers in Germany keep their books in. It reads bookings from a text
file with a fixed layout. If one comma or one date is wrong, DATEV refuses the whole file, or worse,
takes it in with a wrong booking. This pattern brings three things:

1. **A writer** that makes the file from the bookings your app holds.
2. **A list of accounts** (SKR03, the chart of accounts most small businesses use) that the app may
   suggest, and a check that holds a suggestion against the list. A booking that does not fit is
   shown to the person who approves, not hidden.
3. **A check script** that reads the finished file and says: this is in order, or this field in this
   line is wrong. The app runs it before every download. A file that fails it is not handed out.

**What it does not do.** It does not say which account belongs to which receipt, that is the tax
adviser's call. It does not know the books of your customer, so it cannot say whether an account
exists there. It is not "certified by DATEV". **Before the app goes live, send a sample file to the tax
adviser who reads it in. Their answer is the proof**, not this script.

## The format and where it comes from

Written to the **DATEV format, booking batch, header version 700, format version 13**: Windows-1252,
semicolon, decimal comma, CR LF, 31 fields in the first line, 125 columns in the second.

Primary source: DATEV Developer Portal, "DATEV-Format", **retrieved on 02.10.2026**:

- `https://developer.datev.de/de/file-format/details/datev-format/format-description/header`
- `https://developer.datev.de/de/file-format/details/datev-format/format-description/booking-batch`
- `https://developer.datev.de/de/file-format/details/datev-format/format-description/sample-data`
- `https://developer.datev.de/de/file-format/details/datev-format/character-set`

These pages load in a browser only (`.ara/knowledge/browser.md`). The same facts stand in the head of
`backend/kern/extf-format.mjs`, with the expression of the source for every field. **If DATEV
publishes a newer format version, this pattern is out of date**: look at the four addresses, change
`extf-format.mjs` in one place, and write the new date into its head. Writer and check script both
read that file.

**Open on purpose.** The expression of the source for the tax key (field "BU-Schlüssel") asks for four
digits in quotes, its own sample file leaves the field empty, and this pattern writes the key as the
chart of accounts knows it (`9`, `8`) in quotes. The check script lists that as a note, not an error.
The tax adviser's import test settles it. Also open: that the keys 8 and 9 are right for every account
of the list.

## The files

| File | What it does |
| --- | --- |
| `backend/kern/extf-format.mjs` | The format as the source says it: header fields, 125 column names, an expression per field |
| `backend/kern/datev.mjs` | `buchungsstapel({ mandant, buchungen })`: file name, bytes, the ids that went in, and the bookings it refused, each with a reason |
| `backend/kern/skr03.mjs` | `KONTEN`, `GEGENKONTEN`, `KATEGORIEN` and `pruefen`: a suggestion held against the lists, every correction with its reason |
| `backend/pruefen/stapel.mjs` | The check script, also callable as `node backend/pruefen/stapel.mjs <file>` |
| `backend/wege/datev.mjs` | Two routes: `GET /datev/vorschau?mandant=` and `GET /datev/stapel?mandant=` |

**Wiring**: `node .ara/tools/app.mjs --app <app> --add-pattern datev` copies the folder and the
list of accounts. The route needs the app's bookings: put the lines from the head of
`backend/wege/datev.mjs` into `server.mjs`, and add a button "Download for the tax adviser" to the page
of the client, which opens `datev/stapel?mandant=<number>`. Show the preview first: it lists the
bookings that would stay out and why. Then `--build`.

**Who may download.** The route asks your function `stapel`, and that function says whether this
person sees this client. For a client that is not theirs it answers `null`, and the route answers 404
(pattern 7, `.ara/knowledge/app-patterns.md`). The route writes nothing: whether a booking counts as
"handed over" after the download is your app's decision, and belongs behind an approval.

**Replace the lists.** `KONTEN`, `GEGENKONTEN` and `KATEGORIEN` in `skr03.mjs` are a sample selection.
Put in the accounts of the house and let the tax adviser read them through. **The approval takes
the same list**: the folder brings `backend/kern/feldlisten.mjs`, which replaces the scaffold's, and
the field `konto` of an approval then shows the name of the suggested account, refuses one that is
not in the list and asks back once when somebody changes it to another. If the field is called
differently in the flow, its name goes there.

## What the writer does on purpose

- **No booking slips silently in or out.** A booking without an amount, with a date that does not
  exist, or outside the financial year of the client stays out and is reported. The year of a date
  is not in the line but in the head of the file, so a receipt from last year would otherwise get a
  wrong date.
- **No fixing in DATEV.** The file says "not fixed" (0), the tax adviser fixes in DATEV.
- **Texts are cleaned**: control characters out, quotes doubled, a text that starts with `=`, `+`, `-`
  or `@` gets a space in front so a spreadsheet does not read it as a formula.
- **Time in UTC.** The container knows no local time.

## What the check script finds

Wrong character set (UTF-8 mark, UTF-8 without mark, UTF-16), a line end without CR, a header that
differs from the source in any of its 31 fields or has another format version, a column line that
differs by one word, a line with another number of fields, a field that does not fit the expression of
the source, an amount of zero, an account that does not fit the account length, a date that does not
exist or lies outside the period of the header, "fixed" instead of "not fixed". **Checked by the
self-test**: a good file passes, and each of these faults, made by hand in a good file, fails with the
right line and field.

**Checked on the Orin**: a probe app out of the scaffold with this pattern wrote a file on the device,
and the check script passed it. A real customer's chart of accounts and their import you check with
them.
