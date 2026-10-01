---
app: {{id}}
titel: {{titel}}
stand: offen
angelegt: {{datum}}
erledigt:
---

# {{titel}}

> A plan is the agreement on what gets built, and the list of what was assumed while doing
> so. It gets filled in during the conversation, not written in one go. What stays open
> becomes an assumption and stands at the bottom, not in a header.

## What for

The work step it is about. Not the wished-for solution, but what somebody does by hand
today: how often, how long, what happens to the result afterwards.

## Who uses it

Who opens the app, and in which role. Who gets in the customer decides on the device, not
this file. What somebody sees inside the app decides: does everybody see everything, or only
their clients, departments, files, and who maintains the mapping?

## What has to stay

What has to survive a new version, the switch to live and a year. It lies in the device's
database; staging and live each have their own. What may be deleted and what has to be kept.

## Which data

What goes in, what stays, what goes out. Name personal data explicitly: it stays on the
device, and that is the point.

## The steps

What happens in order, from the point of view of the human in front of it. One step per
line.

## Screens

One row per page. Nothing here is guessed: what was not answered stands under Assumptions.

| Page | Route (one level deep) | What stands on it | List or single item | What you see first |
| --- | --- | --- | --- | --- |

## Fields per form

One row per field.

| Form | Field | Type | Required | Example value | Check rule |
| --- | --- | --- | --- | --- | --- |

## Buttons per role

One row per button and role.

| Role | Page | Button | What happens afterwards | Who is told |
| --- | --- | --- | --- | --- |

## Automation

One block per automation, all six lines.

- **Trigger:**
- **Context to the model:** which fields and documents, personal data named
- **Result:** what it produces and where it lands
- **Checker:** which human looks, and what they see
- **On failure:**
- **Notification:** who, by which way

## Roles and assignment

Always filled. Default: an administrator and employees. Who the administrators are, what a "file"
is called in the house (client, project, case), who hands files to whom, and that an employee sees
only the files handed to them and the approvals that concern them. A further role only with its
reason in the human's words. The page where files are handed out, and the test "somebody else's
file answers 404" with its result in staging.

## Connections

Always filled. What leaves the device, one line per outside service or research on the internet:
what for, from the start or only on request, whether personal data goes with it. "Nothing leaves
the device" is an answer. The entries for `verbindungen` in app.json follow once the device's
contract names the field.

## Models per flow

One row per place where a language model works: the flow, the task, the kind of model suggested,
why, and that the administrator may switch it on the device. No model name from memory.

| Flow | Task | Suggestion (kind) | Why | Who may switch |
| --- | --- | --- | --- | --- |

## Where a flow is needed

Where a language model works and where it does not. A flow that only shifts data back and
forth is a program and not a flow.

## Where a human decides

Where a run should stop and wait for an approval, and what the human sees while doing it in
order to be able to decide. Who may decide beyond that: everybody the app is released for, or
narrower, for instance not the submitter and only those responsible. References go onto the
card, no content.

## Which professional standards apply

Formats, charts of accounts, retention rules, each with primary source and date of retrieval.
What could not be checked stands under assumptions.

## What expressly does not belong to it

The paragraph that saves the disappointment later.

## How you recognise that it is finished

One sentence you can check: not "runs smoothly", but "a request goes through, the flow
stops, somebody approves, the request stands as approved".

## Assumptions

What was asked and stayed open, with the assumption that applies instead. Every line is a
place where somebody may later object.
