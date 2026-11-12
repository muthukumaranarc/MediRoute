# MediRoute

MediRoute is an ambulance-to-hospital coordination prototype with two explicit data modes: a browser-local synthetic demo and an API-backed MongoDB mode. It does **not** currently connect to Tamil Nadu 108 dispatch or hospital information systems. The demo records are fictional and cannot support real emergency decisions.

## Requirements

- Java 17+ and Maven 3.8+
- Node.js 20+ and npm
- MongoDB 7 (Docker Desktop is optional)

## Run the local demo

The workspace `Frontend/.env` is configured with `VITE_DEMO_MODE=true`. Start the frontend from `Frontend` with `npm run dev` and open the printed local URL. This mode works without MongoDB or the backend. It includes fictional facilities and training cases; changes are stored in this browser's local storage and can be restored with **Reset demo data** in Operations.

The shared header labels this mode **Synthetic demo data · saved on this device**. No real dispatch, patient, or hospital capacity data is read or written.

## Start in database mode (MongoDB Atlas)

1. Ensure `MONGODB_URL` is set in your environment (or configured in `Backend/.env`).
2. Start the backend from `Backend`: `mvn spring-boot:run`. It connects to MongoDB Atlas using `MONGODB_URL`.
3. Set `VITE_DEMO_MODE=false` in `Frontend/.env`, then start Vite from `Frontend` with `npm run dev`.
4. Open `http://localhost:5173`. Check `http://localhost:8080/api/health`; `status` and `database` must both be `UP`.

An empty database is expected until authorized hospital and dispatch data is loaded. The API currently supports hospital availability updates, emergency case creation, matching, and admission requests for records already in MongoDB. It does not yet include a hospital onboarding/import screen or connectors to external hospital/dispatch systems.

## Optional backend-seeded demo

To run the API-backed demo instead of the browser-local demo, use a separate MongoDB database and set `MEDIROUTE_DEMO_MODE=true` for the backend and `VITE_DEMO_MODE=false` for the frontend. The backend seeds six fictional facilities only if there are no hospitals in that database. Its demo reset endpoint deletes and restores demo collections; never enable it against a database containing operational data.

## Current data and update behavior

- In browser-local demo mode, cases, hospitals, requests, and reports use synthetic data in local storage. In database mode, records come only from the API; if API/database access fails, the UI shows a connection error and offers a retry instead of silently falling back to samples.
- Screens refresh every 5–7 seconds. This is polling, not a push stream or a connection to external systems.
- Hospital Desk edits write availability into MongoDB. In this build, the role selector is a demo convenience, not authentication; writes are not protected by hospital identity or permissions.
- New cases use device GPS when the dispatcher grants location access, or explicit user-entered coordinates. Preset landmarks are approximate.
- Match distance is straight-line Haversine distance. It is not driving distance, route guidance, or ETA.

## Real deployment requirements still open

Before this can handle real incidents, the operator must provide and approve the source systems and credentials for hospital directory/capability data, current bed/intake data, and ambulance dispatch/case updates. The project also needs hospital/dispatcher authentication and role authorization, audit controls, secure hosting, privacy and regulatory review, integration failure handling, retention rules, availability SLAs, and clinical/operational validation. ABDM provides interoperable, consent-based exchange between participating systems; it is not a public live emergency-bed API. A facility directory by itself cannot verify current capacity.

### Public integration research

- The [TNHSP 108 data page](https://tnhsp.org/pages/view/108_Application) says operational 108 data is not intended for direct public access and describes only an anonymized dataset for research and analysis.
- The [EMRI Green Health Services 2026 GPS tender](https://www.emri.in/wp-content/uploads/2026/03/EMRIGHSTN2026GPS.pdf) describes real-time vehicle telemetry and requires vendor API support, but routes device data to EMRI's server and refers to an EMRI-provided data schema. It does not publish a general endpoint or authentication contract. Obtain the approved interface documentation from EMRI and the contracted GPS vendor.
- Hospital capacity and admission acceptance need a separate, authorized feed from each participating hospital's HIS operator. No shared Coimbatore bed-capacity API is configured in this application.

The codebase currently has no EMRI or hospital HIS adapter. Implement those adapters only after the provider supplies its sandbox, message/schema definitions, authentication method, event delivery/polling rules, and data-sharing approval. Do not use the public analytical 108 datasets as operational input.

Do not put production credentials in `VITE_*` variables; those values are bundled into browser code. Backend secrets belong in a managed secret store or server environment.

## Checks

- Frontend production build: `cd Frontend; npm run build`
- Backend tests: `cd Backend; mvn test`
- Backend package: `cd Backend; mvn package`
- API/database health: `GET http://localhost:8080/api/health`
