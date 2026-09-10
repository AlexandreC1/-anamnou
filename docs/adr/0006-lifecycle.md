# ADR 0006: lifecycle implementation follows authorized phases

Status: Accepted scope boundary

Preserve the Bible's Draft → Collecting → Review → Published → Graduation Mode →
Archived Snapshot + Living Alumni Space lifecycle. Do not implement state flags,
transition APIs or business tables in Phase 0.

Later transition use cases must define allowed roles, preconditions, transaction
boundaries, idempotency, audit events and tests. Publication must follow ADR 0005.
Historical content and living alumni content remain distinct.
