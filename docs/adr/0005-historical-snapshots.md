# ADR 0005: preserve the historical publication boundary

Status: Accepted invariant; representation deferred to Phases 3 and 5

The Bible requires a published yearbook to remain independent of live profiles.
A published flag on editable records is insufficient.

A later publication must capture immutable content and durable media references
as an explicitly versioned artifact. Corrections must create a new publication,
not silently mutate an existing one. Media deletion/retention must account for
historical references. The detailed schema and transaction design are deferred;
Phase 0 does not claim to implement publication or snapshot immutability.
