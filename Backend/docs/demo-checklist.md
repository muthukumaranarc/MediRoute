# Manual demo checklist

1. `docker compose up -d`; run backend and frontend as in README.
2. Check `GET /api/health` reports database UP and verify hospital list has six demo records.
3. Create TRAUMA case at Central Coimbatore requiring TRAUMA and DEFIBRILLATOR.
4. Confirm Nearby Demo Clinic is excluded for missing equipment; stale, closed, and zero-bed hospitals are also excluded.
5. Request acceptance from Central Demo Hospital.
6. Switch to Hospital Staff, select Central Demo Hospital, accept request.
7. Switch back; case becomes HOSPITAL_ACCEPTED and capacity decrements. A second decision returns conflict.
8. Update hospital availability and refresh case recommendations.
9. Use Admin > Reset demo data and confirm fixture and default capacity are restored.

Automated endpoint/manual checks require a running MongoDB and application. See execution report for which were actually run.
