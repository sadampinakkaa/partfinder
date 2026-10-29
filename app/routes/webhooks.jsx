import { handleComplianceWebhook } from "../helpers/compliance.server";

/**
 * Fallback root webhooks endpoint: /webhooks
 * Handles any webhook routed directly to /webhooks
 */
export const action = async ({ request }) => {
  return handleComplianceWebhook(request);
};
