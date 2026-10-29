import { useLoaderData, useSearchParams, Link } from "react-router";
import { useState } from "react";
import { authenticate } from "../shopify.server.js";
import { getStorePlan, syncStoreSubscription } from "../models/fit-finder.server.js";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const storeHandle = shop.replace(".myshopify.com", "");
  const appHandle = process.env.SHOPIFY_APP_HANDLE || "product-fit-finder-by-pinakkaa";
  const pricingUrl = `https://admin.shopify.com/store/${storeHandle}/charges/${appHandle}/pricing_plans`;

  const url = new URL(request.url);
  const isPaymentSuccess = url.searchParams.get("subscribed") === "true";

  // Sync real-time active subscription from Shopify App Pricing (Managed Pricing)
  await syncStoreSubscription(admin, shop);

  const plan = await getStorePlan(shop);

  return {
    shop,
    storeHandle,
    appHandle,
    pricingUrl,
    plan,
    isPaymentSuccess,
  };
};

export const action = async ({ request }) => {
  const { session, redirect } = await authenticate.admin(request);
  const storeHandle = session.shop.replace(".myshopify.com", "");
  const appHandle = process.env.SHOPIFY_APP_HANDLE || "product-fit-finder-by-pinakkaa";
  const pricingUrl = `https://admin.shopify.com/store/${storeHandle}/charges/${appHandle}/pricing_plans`;

  return redirect(pricingUrl, { target: "_top" });
};

export default function PricingPage() {
  const { storeHandle, pricingUrl, plan, isPaymentSuccess } = useLoaderData();
  const [showCelebration, setShowCelebration] = useState(isPaymentSuccess);

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
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
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

      {/* Shopify App Pricing Information Banner */}
      <div
        style={{
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "10px",
          padding: "16px 20px",
          maxWidth: "880px",
          margin: "0 auto 32px auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "1.5rem" }}>🛡️</span>
          <div>
            <div style={{ fontWeight: 800, color: "#166534", fontSize: "0.95rem" }}>
              Shopify App Pricing Enabled
            </div>
            <div style={{ color: "#15803d", fontSize: "0.85rem", marginTop: "2px" }}>
              Plan selections, test charges, and recurring invoices are managed natively on Shopify.
            </div>
          </div>
        </div>
        <a
          href={pricingUrl}
          target="_top"
          className="pff-btn pff-btn-primary"
          style={{
            padding: "8px 16px",
            fontSize: "0.85rem",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "none",
          }}
        >
          <span>Manage in Shopify Admin</span>
          <span>↗</span>
        </a>
      </div>

      {/* Plan Cards Grid */}
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

              <div style={{ marginTop: "auto" }}>
                {isSelected ? (
                  <button
                    type="button"
                    className="pff-btn pff-btn-secondary"
                    style={{
                      width: "100%",
                      padding: "12px",
                      fontSize: "0.95rem",
                      cursor: "default",
                      opacity: 0.75,
                    }}
                    disabled
                  >
                    ✓ Current Plan
                  </button>
                ) : (
                  <a
                    href={pricingUrl}
                    target="_top"
                    className={`pff-btn ${p.isPopular ? "pff-btn-primary" : "pff-btn-secondary"}`}
                    style={{
                      width: "100%",
                      padding: "12px",
                      fontSize: "0.95rem",
                      textAlign: "center",
                      display: "block",
                      textDecoration: "none",
                      boxSizing: "border-box",
                    }}
                  >
                    {p.id === 2
                      ? "Upgrade on Shopify Billing ($10/mo) ↗"
                      : "Select Free Plan on Shopify ↗"}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
