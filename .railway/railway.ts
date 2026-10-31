// Railway IaC migration candidate for MOLTBEER, 2026-10-30.
// DO NOT APPLY before running `railway config pull` and `railway config plan`
// against the *existing* project/environment; verify no new paid resources,
// changed replicas, domains, auto-sleep settings, or replaced service IDs.
// This file alone does NOT activate IaC or remove existing railway.json.
import { defineRailway, project, service } from "railway/iac";

// Official per-repository migration recommends a named partial for a single service.
// This is still a candidate only; validate ownership with railway config migrate/plan.
export const partial = "moltbeer-free-bar-api";

export default defineRailway(() => {
  const bar = service("moltbeer-free-bar-api", {
    // The source GitHub repo and existing single-region/sleep policy
    // remain managed by the existing Railway service during migration.
    // Match railway.json: build-time tests must never inherit live durable mode.\n    build: "MOLTBEER_STORAGE_MODE=ephemeral npm test",
    start: "npm start",
    healthcheck: "/health",
    healthcheckTimeout: 60,
  });

  return project("Moltbeer", {
    resources: [bar],
  });
});
