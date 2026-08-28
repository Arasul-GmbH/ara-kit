# Procedure: evidence and handover

> **When do you need this?** In phase 5 and 6 of a setup, and whenever somebody wants to know
> whether a device is really ready for operation.

## The principle

**An action is not a result.** "Model installed" is an action. "A test question is answered in
four seconds with a sensible paragraph" is a result.

For the handover only results count. Every point is checked, and what came out of it stands in
the runsheet, even when it is uncomfortable.

## The checklist

Every point gets one of three results: **met**, **not met**, **not checked**. There is no
"should be".

### 1. The device stands on its own feet

- All services report themselves healthy.
- **After a restart of the device, again.** A system that only runs because it was just set up
  fails at the first power cut.
- The restart test is mandatory. It takes minutes and saves return trips.

### 2. The core function answers in substance

- A real question from the customer's working day, not a test phrase.
- The answer has to be usable in content. A system that reacts with an empty or obviously
  nonsensical answer usually has no model loaded at all.
- Note the response time. The customer will compare it with what they know from the cloud;
  better they hear the number from the partner than discover it themselves.

### 3. Documents are found

- Ingest a test document that matches what the customer really has.
- Then ask a question whose answer stands only in that document.
- Remove the test document afterwards if it does not belong to the customer.

### 4. Remote access works from outside

- **Checked from outside the customer network.** A mobile connection is enough.
- Inside the customer network almost everything works. This point is the most frequent reason
  why maintenance is impossible weeks later.
- Also check: can you still get in after a restart of the device?

### 5. Access is secured

- Login with a password is refused, with a key accepted, both checked, not assumed.
- Only the services that should be reachable are reachable.
- Credentials lie where they belong, and not in a customer file.

### 6. The customer can act themselves

- They know how to switch remote maintenance off, **demonstrated, not mentioned**.
- They know whom to call and what happens then.
- They have a short guide their staff understand.

### 7 The paperwork is complete

- The **Leistungsbeschreibung** is there, with a date, taken against this device.
- **Every line you sign off in the record stands there as "abgenommen", and the other way
  round.** An area promised there and not demonstrated here is a contradiction in your own
  papers.
- The **Endkundenbedingungen** are agreed, and **before** the contract is concluded.
  Afterwards it does not carry.
- The **Drittlizenzen** are attached.
- The customer has set up the **protective measures** under section 8 of the service
  description and confirms that in the record. Without that confirmation the notice about the
  fallibility of outputs stands alone, and alone it does not carry.

Procedure: `.ara/knowledge/paperwork.md`

## When a point is not met

Then the device is **not handed over**. That is no drama, it is a statement:

> Four of six points are met. Remote access from outside does not work, the customer network
> does not permit the connection. Until that is settled I cannot maintain the device remotely.
> Suggestion: I note it as an open point, you talk to whoever looks after the network, and we
> catch up on it.

Enter open points in the runsheet and in `handover.md`. A customer who knows about an open
point is a satisfied customer. One who discovers it half a year later is not.

## The handover file

`handover.md` comes into being **out of the runsheet**, not out of memory. It records what was
installed, how to get in, what was checked and with what result, and what is open.

Because it comes out of the record, it describes the actual state. That is exactly why it is
not freely worded and not prettified.
