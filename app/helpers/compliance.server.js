import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * Handles Shopify Mandatory Compliance (GDPR/Privacy) Webhooks:
 * 1. customers/data_request
 * 2. customers/redact
 * 3. shop/redact
 *
 * Validates HMAC signature via authenticate.webhook(request).
 * On invalid HMAC, authenticate.webhook throws Response(status: 401),
 * which is caught and returned as HTTP 401 to satisfy Shopify automated checks.
 */
export async function handleComplianceWebhook(request, fallbackTopic = "") {
  try {
    const { topic, shop, payload } = await authenticate.webhook(request);

    const currentTopic = (topic || fallbackTopic || "").toLowerCase().replace(/_/g, "/");
    console.log(`[COMPLIANCE WEBHOOK] Received topic: "${currentTopic}" for shop: "${shop}"`);

    // 1. Customer Data Request (customers/data_request)
    if (currentTopic.includes("data_request") || currentTopic.includes("data/request")) {
      // PartFinder does not store personal customer data (PII).
      // All fitment records are catalog-level (year, make, model, collection).
      return new Response(
        JSON.stringify({
          success: true,
          message: "PartFinder does not store any customer personal data. All fitment data is store/catalog level.",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 2. Customer Redact (customers/redact)
    if (currentTopic.includes("customers/redact") || currentTopic.includes("customer/redact")) {
      // PartFinder does not store individual customer records.
      return new Response(
        JSON.stringify({
          success: true,
          message: "PartFinder does not store customer personal data to redact.",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 3. Shop Redact (shop/redact)
    // 48 hours after app uninstall, wipe all data associated with this shop
    if (currentTopic.includes("shop/redact")) {
      try {
        await Promise.allSettled([
          db.session.deleteMany({ where: { shop } }),
          db.widgetConfig.deleteMany({ where: { shop } }),
          db.storeAccess.deleteMany({ where: { shop } }),
          db.importHistory.deleteMany({ where: { shop } }),
          db.fitmentSearchLog.deleteMany({ where: { shop } }),
          db.storeFitmentData.deleteMany({ where: { shop } }),
        ]);
        console.log(`[SHOP_REDACT] Successfully wiped database records for shop: ${shop}`);
      } catch (err) {
        console.error(`[SHOP_REDACT] Error wiping data for shop: ${shop}`, err);
      }
      return new Response(null, { status: 200 });
    }

    return new Response(null, { status: 200 });
  } catch (error) {
    // If HMAC validation failed, authenticate.webhook throws a Response with status 401
    if (error instanceof Response) {
      return error;
    }
    console.error("Compliance webhook validation error:", error);
    return new Response("Unauthorized", { status: 401 });
  }
}
