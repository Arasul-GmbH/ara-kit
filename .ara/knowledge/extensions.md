# Procedure: building extensions

> **When do you need this?** When a customer wants something the product cannot do out of the
> box.

## Where things are built, and where not

**Written at the partner, built on the device, and both have a reason.**

The source code of an app lies with the partner, not with the customer: the same app may run
at three customers, and the same code three times under three device files is the same thing
three times, drifting apart. The package goes to the device as an archive, and **the device
builds the container itself** from the build file inside. A finished image would be built for
one architecture, and nobody notices until it does not start there.

What follows from that still holds:

1. **The data stays at the customer.** Do not develop against customer data on your laptop.
   What you need for trying things out is invented data; the real thing the app only sees on
   the device. That is exactly what the product is meant to prevent.
2. **The same environment.** Built where it runs. No "it worked on my machine".
3. **It stays at the customer.** The device carries the app, even if the partner changes.

How a package gets onto a device, into staging and from there live, stands in
`.ara/knowledge/deploy.md`, and there too what belongs into it: `app.json` at the root and the
folders the manifest names. **Flows belong to it, as a delivery**: the package brings one file
with a header per flow, instead of demanding a name that somebody must have created on the
device. Which fields belong in the header, the device's contract says, not this sheet.

## How to go about it

### 1. Understand what is needed

Not the wished-for solution, but the work step behind it. "We want a bot for invoices" usually
means: somebody retypes invoice data out of PDFs. That is the task.

Ask: how does it run today? How often? What happens to the result afterwards? Who does it?
What happens when it is wrong once?

The last point decides the construction. Something that may be wrong and gets checked is an
afternoon. Something that may never be wrong is a project.

### 2. Look at what the product can already do

Before anything gets built: what is there already? The description of the interface the device
delivers itself, in one call: `node .ara/tools/app.mjs --device <device> --contract`. It says
what an app has to bring along and which endpoints there are. What the individual services are
for, login, permissions, flows, language model and documents, stands in
`.ara/knowledge/platform-services.md`. How an app then gets onto the device stands in
`.ara/knowledge/deploy.md`.

Most customer wishes need no new development but a setup.

### 3. Start small

The first step is always: **one example that runs through.** One document, one result, looked
at by the customer. Only once that stands does it get broader.

Not: build for three weeks and then demonstrate.

### 4. Hand over

An extension only the partner can start is not a solution. Part of the handover is: how to use
it, how to see that it runs, what to do when it does not run.

That belongs into the customer's history, what was built, why, and where it lies. In a year
somebody will ask about it.

## Who licenses the extension

**Extensions are not part of the delivery.** Not even when the platform provides for or eases
their installation. That is what the contracts say, and it has a consequence you have to know:

**Whoever installs an extension licenses it themselves.** That holds for your own extensions
just as much as for third-party software the customer wants alongside. Many widespread
automation tools are under licences that exclude paid redistribution by third parties. If you
install such a thing for a customer, **they** conclude the licence with the vendor, not you and
not Arasul.

Check two things before the installation and write the result into the history:

1. **Under which licence it stands**, and whether the licence permits the use the customer
   intends. Commercial use in their own operation is usually permitted, passing it on to third
   parties often is not.
2. **Who the licensee is under the licence.** Enter that in the service description, section 6,
   so that it is clear later what was on it at handover and who stands behind it.

For the operation of an extension neither function nor availability nor compatibility with
future versions is owed. Say that to the customer before you install something, not afterwards.

Procedure for the paperwork: `.ara/knowledge/paperwork.md`

## Billing

Extensions are a service, not a licence. They are offered and billed separately. The customer
should know beforehand what to expect, including that an extension needs care as the product
develops.
