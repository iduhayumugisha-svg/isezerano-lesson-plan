/**
 * Application feature flags and environment controls.
 *
 * BETA TESTING PHASE:
 * - ENABLE_ADMIN_UI is set to false:
 *   Completely hides the Admin Login option, Admin Dashboard link,
 *   administrator buttons, and administrative navigation items across the UI.
 *
 * RESTORING ADMIN ACCESS AFTER BETA TESTING:
 * - Simply set ENABLE_ADMIN_UI to true!
 *   All administrative components, dashboard views, and management
 *   controls will immediately be restored for verified Admin accounts.
 */
export const FEATURE_FLAGS = {
  // Activated: Admin Portal and administrative management controls are restored
  ENABLE_ADMIN_UI: true,
} as const;

