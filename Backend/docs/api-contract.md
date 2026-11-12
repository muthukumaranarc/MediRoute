# MediRoute API contract

JSON REST API under `/api`; timestamps are ISO-8601 UTC. Errors are `{timestamp,status,code,message,path}`. Required fields are validated; unknown records return 404, invalid inputs 400, and invalid/stale state transitions 409. Base URL is `VITE_API_BASE_URL`.

| Method | Endpoint | Behavior |
|---|---|---|
| GET | `/health` | API/database health |
| GET | `/hospitals` / `/hospitals/{id}` | Hospitals visible in MongoDB; fictional fixtures are returned only in demo mode |
| PATCH | `/hospitals/{id}/availability` | Update status, intake, nonnegative beds, services, equipment |
| GET | `/hospitals/{id}/requests` / `/events` | Incoming requests / availability history |
| POST | `/emergency-cases` | Create validated case; returns 201 and generated case number |
| GET | `/emergency-cases` / `/{id}` | Case listing/detail |
| GET | `/emergency-cases/{id}/recommendations` | Backend eligibility, reasons, score, straight-line distance and freshness |
| POST | `/coordination-requests` | Create request only to currently eligible hospital; returns 201 |
| GET | `/coordination-requests` / `/{id}` | Request status |
| PATCH | `/coordination-requests/{id}/decision` | `{ "action":"ACCEPT" }` or `{ "action":"REJECT", "reason":"optional" }` |
| GET | `/admin/overview` | Counts, events and recent requests |
| POST | `/admin/demo-data/reset` | Restore fictional seed fixture; demo mode only (403 otherwise) |

Create case example: `{"conditionCategory":"TRAUMA","pickupLatitude":11.0168,"pickupLongitude":76.9558,"displayAddress":"Central demo pickup","requiredServices":["TRAUMA"],"requiredEquipment":["DEFIBRILLATOR"],"notes":"Demo only"}`. Request example: `{"caseId":"<case id>","hospitalId":"demo-central"}`. Matching requires OPEN, intake enabled, positive beds, all requested services/equipment, and availability updated in the configurable last five minutes. Rank among eligible candidates is 60% distance score, 25% capacity score, 15% freshness score; it is decision support only.

This is MediRoute's internal API contract. It does not define an EMRI/108 or hospital HIS integration. The role selector is not authentication, and these routes do not enforce user or hospital permissions. Do not expose this API to operational users or real patient data until authentication, authorization, audit, and provider integrations are implemented and validated.
