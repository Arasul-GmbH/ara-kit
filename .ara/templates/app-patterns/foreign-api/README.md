# Pattern 4: call a foreign API from the backend

An app looks something up outside the device: a postcode, an exchange rate, an order in a foreign
system. The code is `backend/fremd.mjs`, built like the scaffold's connection to the device: the
core gets it handed in, calls `rufen` with verb, path and body, and gets back the status, the
content as JSON, or a sentence about what went wrong. It never throws, and it waits ten seconds at
most. The index of all patterns: `.ara/knowledge/app-patterns.md`.

**From the backend, not from the browser.** The interface of an app runs in the device's frame, and
the device's security policy lets no call out of it. Besides, a key in the browser is a key for
everybody who opens the developer tools. The backend calls, the browser asks the backend.

**The address stands in the manifest**, under `backend.umgebung`; the file's head names the
variable. **The key does not**, for the same reason as the password of pattern 3: the app keeps it
in its own store, or the service does without one. What the foreign service wants in which header
its documentation says, and the app builds that header; the module only carries it.

Two things you check before you promise it:

- **Does the device reach the address.** A device in a customer's network does not always reach the
  internet, and a service does not always answer. Both are a sentence at the item. Check it on the
  device, over `remote.mjs`.
- **What leaves the device.** A postcode is nothing, a name with an order is personal data. That is
  the row "which data" in the interview checklist, and it stands in the plan and in the customer's
  file.
