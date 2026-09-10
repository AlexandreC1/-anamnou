# Astra Engineering Contract

This document supplements PROJECT_BIBLE.md.
PROJECT_BIBLE.md controls product requirements.
This document controls engineering execution.

## 1. Priority Order

When making decisions, use this priority:

1. Security
2. Data integrity
3. Product requirements in PROJECT_BIBLE.md
4. Correctness
5. Maintainability
6. Testability
7. Accessibility
8. Performance
9. Developer convenience

Do not sacrifice a higher priority for a lower one.

## 2. Architecture Philosophy

Prefer a modular monolith.
Prefer boring technology.
Prefer fewer dependencies.
Prefer explicit code over clever abstractions.
Prefer database constraints over application assumptions.
Prefer server-side authorization over frontend restrictions.
Prefer reversible changes.

## 3. Database Rules

Every important business invariant must be enforceable at the database level where practical.

Examples:

- unique email
- unique membership
- unique vote per voter/category
- unique class slug where appropriate
- valid foreign-key relationships

Never depend solely on frontend checks.

## 4. Authorization Rules

Every protected request must establish:

- who is calling
- what resource is being accessed
- which tenant owns it
- what role the caller has
- whether that role permits the operation

Never implement authorization using only `if (user != null)`.
Authentication is not authorization.

## 5. API Rules

Controllers should:

- receive requests
- validate input
- authenticate/authorize
- delegate business logic
- return responses

Controllers should not contain large business algorithms.
Business rules belong in services/use cases.

## 6. Frontend Rules

Frontend code should not know database implementation details.

Do not:

- import Prisma into frontend
- query PostgreSQL directly
- duplicate backend business rules unnecessarily
- trust frontend permission checks

The frontend consumes the API.

## 7. Error Rules

Errors must be intentional.
Never: `catch(error) {}`
Never silently ignore failed API calls.
Never expose internal errors to users.
Every important UI operation needs a visible failure state.

## 8. Security Rules

Never commit:

- passwords
- tokens
- private keys
- cloud credentials
- database credentials

Never log:

- passwords
- authentication tokens
- reset tokens
- secrets

Treat all user input as untrusted.
Treat all uploaded files as hostile until validated.

## 9. Testing Rules

Tests should verify behavior, not implementation trivia.
Prioritize tests around:

- authorization
- tenant isolation
- business rules
- data integrity
- publication immutability
- voting
- invitations
- uploads

## 10. Change Size

Make the smallest coherent change.
Do not refactor unrelated code while implementing a feature.
Do not rename half the project merely because a different naming convention is aesthetically pleasing.
Every unrelated refactor increases risk.

## 11. Dependencies

Before adding a dependency, answer:

- What problem does it solve?
- Can the problem be solved cleanly without it?
- Is it actively maintained?
- Does it increase security or operational risk?
- Does it duplicate existing functionality?

If the answer is weak, do not add it.

## 12. AI Safety

Never infer that an incomplete implementation is complete.
Never replace missing requirements with arbitrary product behavior.
Never invent credentials.
Never fabricate test results.
Never claim to have executed a command that was not executed.
Never claim a feature is production-ready when known critical risks remain.

## 13. Documentation

Architecture decisions must be documented when they materially affect:

- security
- persistence
- authorization
- deployment
- public API
- historical data
- future extensibility

Use ADRs.

## 14. Completion

A task is complete only when:

- implementation exists
- tests exist where appropriate
- tests pass
- lint passes
- typecheck passes
- build passes
- documentation is updated
- security implications were considered

The phrase "implemented" must mean all of the above unless explicitly stated otherwise.
