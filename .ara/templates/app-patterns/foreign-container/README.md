# Pattern 5: a foreign container as an app behind the login

A customer wants a tool that exists already, a small web application from a registry, and they
want it behind the device's login instead of open in the network. That is an app with a backend and
without an interface of its own: the tool is the backend. The example here is a manifest and a
build plan of one line. The index of all patterns: `.ara/knowledge/app-patterns.md`.

**The device builds, it takes no finished image.** That stands in the rules of its contract, and
`--check` prints them; the kit refuses a manifest with `backend` and without `bauen`. An image built
elsewhere would be built for one architecture, and nobody would notice until it does not start on
the device. So the build plan for a foreign image is one line, `FROM` and the image, and the device
pulls it itself, for its own architecture. For that the device has to reach the registry, and that
you check there.

**In front of the container hangs the device's login.** Everything under the app's `api` path goes
through it: whoever has not been released for the app does not get through, and whoever has
arrives with their name and role in the two login headers. That is the whole point of the pattern:
the tool gets a login it never had, and the customer gets one login for everything.

Three things you read in the tool's documentation and write into the manifest:

- **The port** the tool listens on, `ports.backend`.
- **A path that answers with 200 when it runs**, `backend.gesundheit`. The device's health check
  asks it.
- **Its settings**, `backend.umgebung`. Two matter here. The container sees its paths without the
  device's prefix: a request to `/apps/<id>/api/hallo` arrives as `hallo` at the root. A tool that
  has to know its public path gets it through its own setting. And a tool with a login of its own:
  pick one that trusts a header or needs none, otherwise the human logs in twice.

Add the memory under `ressourcen`: the example gets by with little, a tool with a database of its
own does not.

**Without an interface of its own the app has no page under `/apps/<id>/`.** Its address is the
`api` path. What the device's overview shows for such an app, and how the human gets there, you
check on the device. The design standard does not apply to it: it brings no interface that could
stand beside the device's. And to the licence it is an app like any other: it takes a slot, the
rules of the contract say so.

**What was checked and what was not.** The manifest went through the kit's manifest check against a
contract-shaped schema, and the build plan is a build plan. No foreign container was deployed to a
device for this sheet: the first one is a proof to write down in the device's runsheet, with the
tool, the version and what the overview showed.
