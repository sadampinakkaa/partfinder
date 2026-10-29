import { handleComplianceWebhook } from "../helpers/compliance.server";

export const action = async ({ request }) => {
  return handleComplianceWebhook(request);
};
