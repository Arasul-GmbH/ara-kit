# Procedure: remote access

> **When do you need this?** In phase 4 of a setup, and whenever a device is no longer
> reachable later.

## The order

**The direct way first, the relay network second.** Not the other way round.

A direct, secured access is simpler, faster, has fewer moving parts and depends on no outside
service. A relay network solves exactly one problem: that the device is not reachable from
outside. If that problem does not exist, it only creates additional dependency.

### Step 1: check whether the direct way works

From outside the customer network: is the device reachable?
`node .ara/tools/find-device.mjs --host <address>`

That assumes the connection has a reachable address and the forwarding is set up. Both are
settled with whoever looks after the customer network, not on your own. A port forwarding is
an intervention in somebody else's infrastructure.

### Step 2: secure it

Whichever way: login with a key only, no password, only the users who need it. The concrete
settings and tools for that come with the product. Read up in the mirror what it does instead
of inventing your own configuration.

**Mind the order:** prove key login, *then* switch off the password, and keep the running
session open until the new one has been checked.

### Step 3: relay network, if there is no other way

If the connection has no reachable address, a relay network helps, the device builds the
connection from the inside. The product brings such a link with it; the details are in the
mirror.

Three things that regularly get overlooked:

1. **Expiring registrations.** Such networks work with registrations that lapse after a while.
   A device that is meant to stay reachable has to be entered in a way that prevents that.
   Otherwise it silently vanishes from the network months later, usually exactly when it is
   needed.
2. **An outside service in the chain.** With customers under professional secrecy (law firm,
   practice, tax adviser) that needs explaining. Say it yourself before the customer asks.
3. **It stays an agreement.** No permanent access without the customer's knowledge.

### Step 4: emergency off

The customer has to be able to switch remote maintenance off **themselves at any time**. That
is not politeness, it is the precondition for them keeping control.

At the handover the switch is **shown**, not mentioned, and described in `handover.md`. That
includes what no longer works afterwards, otherwise somebody switches it off and wonders why
nobody helps.

## Documenting

In `device.md`:

- under which address and which port,
- with which login name and which key (the name, not the key),
- which way (direct or relay network),
- how the emergency off works.

None of that is secret. The secrets lie in the `.env`.

## When a device is no longer reachable

One after the other, not all at once:

1. Does the address answer at all? (`find-device.mjs`)
2. Has it changed? Automatically assigned addresses wander after a power cut.
3. Is the service there but the port a different one? After a hardening that is to be
   expected.
4. Is the key still the right one? Is it loaded in the agent?
5. Was something changed on the network at the customer? New router, new firewall, new
   provider, the most frequent reason when it ran for months and suddenly does not.
6. Has the emergency off been pressed? Then that was a decision, not a fault, call them.

Only when all of that is ruled out is it a problem on the device itself. Then it needs
somebody on site.
