# Moving an app to a new major version


A new major number of the library (6 on 27.11.2026) changes the address the device serves it from
(`/marken/6/`), and the device serves **only the current one**: an app on 5 is refused when it is
rolled out. The kit says so before that, in `--check`, `--build` and the proof (`bibliothek-alt`).
**Nothing is rewritten silently**: what the app built itself stays as it is, and the steps are yours:

1. `node .ara/tools/marken.mjs --sync` lays the new copy under `frontend/src/marken/` and writes the
   new major number into `marken` of `app.json` (the form the app has, one number or three).
2. Build anew (`npm run build`) and run `node .ara/tools/app.mjs --app <app> --check`. Types that
   no longer fit name the page to fix. Nothing of the 5.x was removed, only the look and the
   addresses changed.
3. Look at every page once, light and dark, at 390 and 1440 pixels. Own rules in `stil.css` that
   imitate a block (a status mark, a card of your own) are the first to replace by the library's:
   `Karte`, `Liste`/`ListenEintrag`, `IconKnopf` and `Werkzeug` for icon buttons, `Hauptkapsel` for the
   one main action of a page.
4. `--build` again (new proof), then roll out to test as usual.
