import { useLoaderData } from "react-router";
import { useState } from "react";
import { authenticate } from "../shopify.server.js";
import { getStorePlan } from "../models/fit-finder.server.js";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const plan = await getStorePlan(shop);

  return {
    shop,
    plan,
  };
};

export default function AboutPage() {
  const { shop, plan } = useLoaderData();
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText("support@pinakkaa.com");
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenEmail = (e) => {
    e.preventDefault();
    window.open(
      "mailto:support@pinakkaa.com?subject=Support%20Request%20-%20Product%20Fit%20Finder&body=Store%20Domain%3A%20" +
        encodeURIComponent(shop),
      "_blank",
    );
  };

  return (
    <div className="pff-container">
      {/* Page Header */}
      <div className="pff-page-header">
        <div className="pff-page-title-wrap">
          <h2>🛡️ About Product Fit Finder by Pinakkaa</h2>
          <p>Enterprise vehicle fitment search and product compatibility management platform.</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "22px" }}>
        {/* Card 1: About App */}
        <div className="pff-card">
          <div className="pff-card-header">
            <h3 className="pff-card-title">
              <span>⚡</span> App Overview
            </h3>
          </div>
          <div className="pff-card-body">
            <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.6, color: "#334155" }}>
              <strong>Product Fit Finder by Pinakkaa</strong> empowers automotive and catalog merchants to deliver seamless Year, Make, and Model product lookups. Boost conversion rates, reduce returns, and give buyers instant confidence that the product fits their specific vehicle.
            </p>
          </div>
        </div>

        {/* Card 2: Version */}
        <div className="pff-card">
          <div className="pff-card-header">
            <h3 className="pff-card-title">
              <span>🚀</span> System Architecture
            </h3>
          </div>
          <div className="pff-card-body">
            <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600, marginBottom: "6px" }}>
              Active Engine Version:
            </div>
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: 800,
                color: "#0f172a",
                display: "inline-block",
                letterSpacing: "-0.02em",
              }}
            >
              v2.5.0 Pro (Remix & SQLite)
            </div>
            <div style={{ fontSize: "0.85rem", color: "#16a34a", fontWeight: 700, marginTop: "6px" }}>
              ✓ Sub-50ms Cascading Lookups & Zero-Flicker Caching
            </div>
          </div>
        </div>

        {/* Card 3: Contact Us */}
        <div className="pff-card" style={{ gridColumn: "1 / -1" }}>
          <div className="pff-card-header">
            <h3 className="pff-card-title">
              <span>✉️</span> Dedicated Merchant Support
            </h3>
            <span className="pff-badge pff-badge-indigo">
              Official Support
            </span>
          </div>
          <div className="pff-card-body">
            <p style={{ margin: "0 0 16px 0", fontSize: "0.95rem", color: "#334155" }}>
              Have questions about CSV bulk uploads, custom theme CSS styling, or custom fitment workflows? Reach out to our technical engineering team anytime:
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                padding: "16px 20px",
                borderRadius: "12px",
              }}
            >
              <div style={{ fontSize: "1.4rem" }}>📬</div>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Official Email Address
                </div>
                <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
                  support@pinakkaa.com
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="pff-btn pff-btn-secondary pff-btn-sm"
                  onClick={handleCopyEmail}
                >
                  {copied ? "✓ Copied!" : "📋 Copy Email"}
                </button>
                <a
                  href="mailto:support@pinakkaa.com"
                  onClick={handleOpenEmail}
                  className="pff-btn pff-btn-primary pff-btn-sm"
                >
                  ✉️ Compose Email
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
