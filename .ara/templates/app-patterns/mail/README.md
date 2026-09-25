# Pattern 3: send a mail from the backend

**There is no mail service on the device.** An app that wants to write to somebody speaks to the
customer's outgoing mail server itself, like every other program in their network. The code is
`backend/post.mjs`: SMTP in its plainest form, without a package, enough for a text message to a
relay. Its head shows how the core gets it as a third connection next to the store and the device,
and how a decided item becomes a mail. The index of all patterns: `.ara/knowledge/app-patterns.md`.

**The values stand in the manifest**, under `backend.umgebung`, and the device puts them into the
container: the host, the port, whether TLS is used and how, the sender address. The file's head
names them.

**The password does not.** The manifest lies in the package and in the partner's repository, and a
password there would lie in two places it does not belong. The way that works today is a relay in
the customer's network that accepts the device without a login, recognised by its address; that is
the usual case with a mail server in the house. If the outgoing server demands a login, the app
keeps the login in its own store, entered over a settings page of its own, and hands it to the
module; the device gives an app no place for a secret today. A login without TLS the module
refuses, because it would send the password in plain text.

Three things you settle in the interview and write into the plan:

- **Who gets the mail.** The login gives the app a name and no address. Either the app keeps a list
  of names and addresses, or the form asks for the address, or the mail goes to one fixed address.
  That is a decision of the customer.
- **When it goes.** After a decision, after a deadline, at the end of a run. The core knows the
  moment; the module only sends.
- **What happens when it does not go.** The module never throws: a mail that did not go out is a
  sentence at the item and not a crash of the app. The page shows the sentence.

**What was checked and what was not.** The self-test sends through a local relay and reads the mail
back. TLS and a login ran against nobody here: the first mail at the customer goes to yourself,
before a process hangs on it. Whether the device reaches the relay you check on the device, over
`remote.mjs`, not from your own computer.

For attachments, HTML or other login methods take a package such as `nodemailer`, put an `npm ci`
into the Dockerfile for it, and keep the module's interface: `senden` with recipients, subject and
text, back comes whether it went and otherwise the sentence.
