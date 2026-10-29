import { useLoaderData, useSearchParams, Form, useActionData, useNavigation, Link } from "react-router";
import { useState, useEffect } from "react";
import { authenticate, PLAN_BASIC } from "../shopify.server.js";
import { getStorePlan, updateStorePlan } from "../models/fit-finder.server.js";
import { SkeletonPlanCards } from "../components/Skeleton.jsx";

export const loader = async ({ request }) => {
  const { session, billing } = await authenticate.admin(request);
  const shop = session.shop;

  const url = new URL(request.url);
  const isPaymentSuccess = url.searchParams.get("subscribed") === "true";
  const planParam = url.searchParams.get("plan");

  if (isPaymentSuccess && planParam) {
    const pNum = planParam === "BASIC" || planParam === "basic-plan" ? 2 : 1;
    await updateStorePlan(shop, pNum, url.searchParams.get("charge_id") || "sub_active", true);
  }

  // Check Shopify active billing ONLY to sync if real active payment exists
  try {
    const billingCheck = await billing.check({
      plans: [PLAN_BASIC, "basic-plan", "BASIC PLAN", "Basic Plan"],
      isTest: true,
    });

    const hasActiveSubscription = Boolean(
      typeof billingCheck === "boolean"
        ? billingCheck
        : billingCheck?.hasActivePayment && billingCheck?.appSubscriptions?.length > 0,
    );

    if (hasActiveSubscription) {
      // Confirmed active payment on Shopify
      const activeSub = billingCheck?.appSubscriptions?.[0];
      await updateStorePlan(shop, 2, activeSub?.id || "sub_active", true);
    } else if (!isPaymentSuccess) {
      // No active payment on Shopify and didn't just return from checkout:
      const current = await getStorePlan(shop);
      if (current.planNumber === 2 && !current.test) {
        await updateStorePlan(shop, 1, null, false);
      }
    }
  } catch (e) {
    console.log("[Pricing loader] billing.check info:", e?.message || e);
  }

  const plan = await getStorePlan(shop);

  return {
    shop,
    plan,
  };
};

export const action = async ({ request }) => {
  const { session, billing } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const planNumber = parseInt(formData.get("planNumber"), 10);

  if (planNumber === 1) {
    // Attempt to cancel any active Shopify app subscription
    try {
      const billingCheck = await billing.check({
        plans: [PLAN_BASIC, "basic-plan", "BASIC PLAN", "Basic Plan"],
        isTest: true,
      });
      if (billingCheck?.appSubscriptions?.length > 0) {
        for (const sub of billingCheck.appSubscriptions) {
          if (sub?.id) {
            await billing.cancel({
              subscriptionId: sub.id,
              isTest: true,
              prorate: true,
            });
          }
        }
      }
    } catch (cancelErr) {
      console.log("[Pricing action] Cancel error:", cancelErr?.message || cancelErr);
    }

    // Downgrade / switch to Free Plan
    await updateStorePlan(shop, 1, null, false);
    return { success: true, planNumber: 1, message: "Switched to Free Plan." };
  }

  if (planNumber === 2) {
    // BASIC PLAN ($10 / month) with Shopify Billing
    const appUrl = process.env.SHOPIFY_APP_URL || `https://${shop}`;
    const returnUrl = `${appUrl}/app/pricing?subscribed=true&plan=basic-plan`;

    console.log(`[Pricing action] Initiating Shopify billing request for ${shop}, returnUrl: ${returnUrl}`);

    try {
      await billing.request({
        session,
        plan: PLAN_BASIC,
        isTest: true,
        returnUrl,
      });
    } catch (err) {
      // Re-throw redirect Responses so Shopify / App Bridge / React Router navigates top window to Shopify Billing
      if (
        err instanceof Response ||
        (err && typeof err === "object" && ("status" in err || "headers" in err))
      ) {
        throw err;
      }
      console.error("[Pricing action] Billing request error:", err);
      return {
        error:
          err?.message ||
          "Failed to initiate Shopify billing. Please verify your Shopify Partner app configuration.",
      };
    }

    return null;
  }

  return { error: "Invalid plan selection" };
};

export default function PricingPage() {
  const { shop, plan } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();

  const [showCelebration, setShowCelebration] = useState(
    searchParams.get("subscribed") === "true",
  );
  const [toast, setToast] = useState(null);

  const isSubmitting = navigation.state !== "idle";

  useEffect(() => {
    if (actionData?.message) {
      setToast({ type: "success", text: actionData.message });
      if (actionData.planNumber === 2) {
        setShowCelebration(true);
      }
    } else if (actionData?.error) {
      setToast({ type: "danger", text: actionData.error });
    }
  }, [actionData]);

  const pricingPlans = [
    {
      id: 1,
      name: "Free Plan",
      displayPrice: "$0",
      period: "forever",
      maxLimit: 100,
      description: "Convenient for small product catalogs & starter vehicle inventories",
      features: [
        "Up to 100 vehicle fitment entries",
        "Year, Make, Model cascading dropdowns",
        "Collection auto-redirect matching",
        "Basic widget customization",
        "Shopify OS 2.0 theme support",
      ],
      isPopular: false,
    },
    {
      id: 2,
      name: "Basic Plan",
      displayPrice: "$10",
      period: "/ month",
      maxLimit: "Unlimited",
      description: "Designed for high-scale auto parts stores with expanding catalogs",
      features: [
        "Unlimited vehicle fitment rows (no caps)",
        "Bulk Delete (Delete selected rows with 1 click)",
        "Fast CSV batch import & instant export",
        "Luxury Golden border glow & reset button widget",
        "Real-time storefront search query analytics",
        "Priority VIP Merchant Support",
      ],
      isPopular: true,
    },
  ];

  return (
    <div className="pff-container">
      {/* Toast Alert */}
      {toast && (
        <div className={`pff-alert pff-alert-${toast.type}`}>
          <span>{toast.type === "success" ? "✓" : "⚠️"}</span>
          <div style={{ flex: 1, fontWeight: 700, color: toast.type === "success" ? "#14532d" : "#991b1b" }}>{toast.text}</div>
          <button
            onClick={() => setToast(null)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", fontWeight: "bold" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Celebration Modal */}
      {showCelebration && (
        <div className="pff-modal-overlay" onClick={() => setShowCelebration(false)}>
          <div className="pff-modal-card" style={{ textAlign: "center", padding: "40px 28px" }}>
            <div style={{ fontSize: "3.8rem", marginBottom: "8px" }}>🎉</div>
            <h2 style={{ margin: "0 0 10px 0", color: "#000000", fontSize: "1.6rem", fontWeight: 900 }}>
              Plan Upgraded Successfully!
            </h2>
            <p style={{ margin: "0 0 24px 0", color: "#334155", fontSize: "0.95rem", fontWeight: 600 }}>
              Your store is now equipped with <strong>Basic Plan</strong> features and unlimited fitment capacity.
            </p>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button
                type="button"
                className="pff-btn pff-btn-primary"
                onClick={() => setShowCelebration(false)}
                style={{ padding: "12px 32px" }}
              >
                Continue to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div style={{ textAlign: "center", marginBottom: "36px" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 900, margin: "0 0 8px 0", color: "#000000" }}>
          Subscription & Capacity Plans
        </h1>
        <p style={{ margin: 0, fontSize: "1rem", color: "#334155", fontWeight: 600 }}>
          Current Active Tier:{" "}
          <span
            className={`pff-badge ${
              plan.planNumber === 2 ? "pff-badge-premium" : "pff-badge-basic"
            }`}
            style={{ fontSize: "0.85rem", padding: "4px 14px", verticalAlign: "middle" }}
          >
            {plan.planNumber === 2 ? "BASIC PLAN" : "FREE PLAN"}
          </span>
        </p>
      </div>

      {isSubmitting ? (
        <SkeletonPlanCards />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "28px",
            maxWidth: "880px",
            margin: "0 auto",
          }}
        >
          {pricingPlans.map((p) => {
            const isSelected = plan.planNumber === p.id;
            return (
              <div
                key={p.id}
                className={`pff-plan-card ${p.isPopular ? "premium-featured" : ""}`}
                style={{
                  borderColor: isSelected ? "var(--primary-color)" : "#e2e8f0",
                }}
              >
                {p.isPopular && (
                  <div className="pff-plan-badge-top">Most Popular</div>
                )}

                {/* Plan Label */}
                <div
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    color: p.id === 2 ? "#4f46e5" : "#64748b",
                    marginBottom: "4px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {p.name}
                </div>

                {/* Price Heading with Clean Modern Text */}
                <div className="pff-plan-price">
                  <span>{p.displayPrice}</span>
                  {p.period && (
                    <span style={{ fontSize: "1.05rem", color: "#64748b", fontWeight: 500 }}>
                      {" "}{p.period}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: "0.875rem", color: "#64748b", fontWeight: 500, marginBottom: "18px", minHeight: "38px" }}>
                  {p.description}
                </div>

                <div
                  style={{
                    fontSize: "0.8125rem",
                    fontWeight: 700,
                    color: p.id === 2 ? "#6d28d9" : "#475569",
                    background: p.id === 2 ? "#ede9fe" : "#f1f5f9",
                    border: p.id === 2 ? "1px solid #ddd6fe" : "1px solid #e2e8f0",
                    padding: "5px 12px",
                    borderRadius: "6px",
                    display: "inline-block",
                    alignSelf: "flex-start",
                    marginBottom: "20px",
                  }}
                >
                  Limit: <strong>{p.maxLimit} {typeof p.maxLimit === "number" ? "rows" : "entries"}</strong>
                </div>

                <ul className="pff-plan-features">
                  {p.features.map((f, idx) => (
                    <li key={idx}>
                      <span style={{ color: "#10b981", fontWeight: 800, fontSize: "1rem" }}>✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Form method="POST" style={{ marginTop: "auto" }}>
                  <input type="hidden" name="planNumber" value={p.id} />
                  <button
                    type="submit"
                    className={`pff-btn ${
                      isSelected
                        ? "pff-btn-secondary"
                        : p.isPopular
                        ? "pff-btn-primary"
                        : "pff-btn-secondary"
                    }`}
                    style={{
                      width: "100%",
                      padding: "12px",
                      fontSize: "0.95rem",
                      cursor: isSelected ? "default" : "pointer",
                      opacity: isSelected ? 0.75 : 1,
                    }}
                    disabled={isSelected || isSubmitting}
                  >
                    {isSelected
                      ? "✓ Current Plan"
                      : isSubmitting
                      ? p.id === 2
                        ? "Redirecting to Shopify Billing..."
                        : "Switching..."
                      : p.id === 2
                      ? "Upgrade to Basic Plan ($10/mo)"
                      : "Select Free Plan"}
                  </button>
                </Form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
