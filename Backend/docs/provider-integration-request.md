# Provider integration information request

Use this checklist with EMRI/TNHSP and each participating hospital's HIS operator. Ask for a sandbox or synthetic examples. Do not send credentials, tokens, or patient data by email.

## Tamil Nadu 108 / EMRI

Request the approved interfaces and owners for:

- Incident/case creation or read access, assignment state changes, destination hospital, and closure events.
- Ambulance identity mapping and AVL position updates, including timestamp, coordinate reference system, cadence, and location accuracy.
- Whether MediRoute is allowed to receive events, whether updates use webhooks, polling, a message queue, or a vendor-managed SQL feed, and the expected delivery latency.
- Authentication, network allowlists/VPN, sandbox endpoints and credentials, event IDs, retry/replay behavior, rate limits, and support escalation.
- Data-sharing approval, permitted fields, retention requirements, and whether any patient identifiers are prohibited.

The published EMRI 2026 GPS tender describes GPS data flowing to EMRI's server and requires API support from the contracted vendor, but it does not publish the integration endpoint or schema. The tender is a procurement specification, not API documentation.

## Hospital systems (request separately for every facility)

Request the hospital's HIS vendor and technical owner, then obtain:

- A stable facility identifier and mapping to the MediRoute hospital record.
- Current emergency department bed capacity and intake status, with update timestamps and the capacity definitions used by the hospital.
- Service/equipment capability fields and how their availability is reported.
- Whether the hospital can receive a destination request and return an acceptance/rejection plus a reservation identifier. If not, confirm the manual confirmation workflow.
- API or message documentation, delivery method/cadence, authentication, sandbox access, retry/idempotency rules, rate limits, and support contact.
- Data-sharing approval, permitted fields, retention, and operational confirmation requirements.

## Safe test package

Ask each provider for synthetic payloads that cover a normal update, duplicate delivery, out-of-order update, stale update, cancellation, and unavailable-system recovery. Do not test against production patient or dispatch records.

MediRoute currently has no provider adapters or user authentication. Provider credentials must be stored server-side; the production work also needs role and facility authorization, audit logging, secure deployment, and an agreed fallback procedure before any real dispatch workflow is enabled.
