---
name: customers
description: Customer care and an overview of your own business. Use when somebody asks what is due, what to do today, how the customers are doing, when a maintenance contract runs out, who they wanted to get back to, or when the file should be brought up to date after a conversation.
---

Procedure: `.ara/knowledge/crm.md`

Short:

- **What is due:** `node .ara/tools/agenda.mjs`: follow-ups, expiring maintenance,
  interrupted setups, contacts gone quiet. Ask the question yourself when a session starts
  without a concrete request.
- **Three things after every customer contact:** an entry under `history/`, update
  `last_contact`, set `follow_up` or change `status`.
- A conversation without a next date is a customer forgotten in three months.
- Maintenance extensions are discussed **before** the expiry, they are the recurring
  revenue that carries the business.
- Do not delete lost customers, set them to `inactive`. The history is later worth more
  than any offer.
