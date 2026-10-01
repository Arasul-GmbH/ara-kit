---
name: diagnostics
description: Establish and fix faults on a customer device. Use when a device is not reachable, the chat does not answer or answers nonsense, documents are not found, the web interface does not load, something has become slow, or when a customer reports that something does not work.
---

Procedure: `.ara/knowledge/diagnostics.md`

Short:

- **Establish first, change second.** A restart as the first action wipes the trail.
- A chain from the outside in: what exactly happens? · reachable? · is the device alive
  (space, clock, uptime)? · are the services running? · what do the logs say at the time of
  the fault? · what has changed?
- Empty or nonsensical answers almost always mean: no model loaded.
- Name the finding, suggest with a way back, only then act.
- Never change two things at once. Never rummage in customer data.
- Result into `customers/<customer>/history/`.
