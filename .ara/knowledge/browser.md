# Procedure: browser and further tools

> **When do you need this?** Whenever something only works through a web interface, and for
> the question which tool is the right one for a task.

## The browser

The kit brings a browser you can operate yourself: open pages, read, click, fill in forms,
take screenshots. It starts on first access and needs no setup.

**You may use it on your own.** No asking before opening a page, no asking before a click.
What you do in the browser belongs to the work, not to the decision.

The limits nevertheless stay the same as everywhere else (`.ara/knowledge/security.md`):
whatever **changes** something on a customer device is a change, no matter whether you
trigger it from the command line or from a button. A restart through the dashboard stays a
restart. Ask first, click second.

**A device with `tls: selfsigned` needs no detour.** The certificate comes out of the
device's own CA, so the browser does not know its issuer and would refuse the first call with
`ERR_CERT_AUTHORITY_INVALID`, before a page is even there. There is nothing to click through
then: `browser_navigate` breaks off, and no warning page appears in which you could choose
"Advanced". The kit therefore starts its browser with `--ignore-https-errors`, the entry stands
in `.mcp.json`, and the interface of such a device is there at the first call. The kit's own
calls take the same route deliberately, over `tls: selfsigned` in the file.

**If a call breaks off with `ERR_CERT_AUTHORITY_INVALID` nevertheless, that switch is missing.**
Look into `.mcp.json`, put `--ignore-https-errors` into the browser's arguments and start the
session anew, the entry only takes effect at the start. Do not build a context of your own over
`browser_run_code_unsafe` for it: that carries you one page far and leaves the next call standing
in the same place. The other way round proves nothing: a device that opens without the switch may
owe that to a decision the browser has kept in its profile, and that profile lies on this computer
only.

**The switch holds for every address, not only for the device.** So open only addresses you are
sure of. On a foreign address a certificate that does not check out stays a warning, and the
browser no longer shows it to you.

## What you use it for

**Check and operate the interface of a customer device.** After the installation, look
whether everything really runs. Test the chat with a real question instead of only querying
the services. Make settings that exist only there.

**Collect evidence for the handover.** A screenshot of the running system says more at a
later query than a log entry. Put them next to the handover document.

**Read customer websites.** When creating a file, look for yourself instead of asking what
stands there publicly.

**Operate the partner portal.** Look up orders and purchase prices. Real business data lives
there, so only when it belongs to the task. **Not the device token:** account and token the
human fetches themselves at `https://www.arasul.de/kaufen` and pastes the token here, the way
stands in `.ara/knowledge/device.md`, "The token".

## Which tool for what

The browser is powerful, but not always the right means. The order:

1. **A tool of the kit itself**, if there is one. `remote.mjs` for commands on the device,
   `find-device.mjs` for reachability, `agenda.mjs` for dates. They know the connection
   details, log along and cannot hit the wrong device.
2. **The command line on the device** through `remote.mjs`, if there is a command there.
   Traceable, fast, loggable.
3. **The browser**, when it only works through the interface or when you have to see what a
   human sees.

If one way does not work, take the next one instead of giving up. Say which way you took.

## GitHub

For everything to do with repositories the `gh` command line is there. It is already logged
in on most computers and needs no token in the kit.

What you use it for:

- **Back up the partner's work.** Create and keep the private repository for `customers` and
  `business`, without them having to learn git commands.
- **Version extensions.** What was built for one customer gets a history and can be reused at
  the next.
- **Give feedback to the kit.** If the partner is missing something or something is wrong,
  you can turn that into an issue in the kit repository. Ask beforehand what exactly should
  be reported, and show them the text.

If `gh` is not logged in, say so and name the login command. Do not set up access secretly.
