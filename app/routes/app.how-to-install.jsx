import { useLoaderData } from "react-router";
import { useState } from "react";
import { authenticate } from "../shopify.server.js";
import { getStorePlan } from "../models/fit-finder.server.js";

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  const plan = await getStorePlan(shop);

  let themes = [];

  // Try REST API first
  if (session.accessToken) {
    try {
      const restResponse = await fetch(`https://${shop}/admin/api/2024-07/themes.json`, {
        headers: {
          "X-Shopify-Access-Token": session.accessToken,
          "Content-Type": "application/json",
        },
      });
      if (restResponse.ok) {
        const restJson = await restResponse.json();
        if (Array.isArray(restJson.themes)) {
          themes = restJson.themes.map((t) => ({
            id: String(t.id),
            name: t.name,
            role: t.role || "unpublished",
          }));
        }
      }
    } catch (restErr) {
      console.warn("REST themes fetch failed:", restErr?.message || restErr);
    }
  }

  // Fallback to GraphQL
  if (themes.length === 0) {
    try {
      const response = await admin.graphql(
        `#graphql
        query getThemes {
          themes(first: 50) {
            edges {
              node {
                id
                name
                role
              }
            }
          }
        }`,
      );
      const json = await response.json();
      if (json.data?.themes?.edges && Array.isArray(json.data.themes.edges)) {
        themes = json.data.themes.edges.map((e) => {
          const gid = e.node.id;
          const numericId = gid.split("/").pop();
          return {
            id: numericId,
            name: e.node.name,
            role: e.node.role?.toLowerCase() || "unpublished",
          };
        });
      }
    } catch (err) {
      console.warn("GraphQL themes fetch failed:", err?.message || err);
    }
  }

  if (themes.length > 0) {
    themes.sort((a, b) => {
      const isAMain = a.role?.toLowerCase() === "main";
      const isBMain = b.role?.toLowerCase() === "main";
      return (isBMain ? 1 : 0) - (isAMain ? 1 : 0);
    });
  } else {
    themes = [
      {
        id: "current",
        name: "Current Published Theme (Live)",
        role: "main",
      },
    ];
  }

  return {
    shop,
    plan,
    themes,
    apiKey: process.env.SHOPIFY_API_KEY || "5ec5b77b080f4bb0370b32a2630f9ec3",
  };
};

export default function HowToInstallPage() {
  const { shop, themes, apiKey } = useLoaderData();
  const [selectedThemeId, setSelectedThemeId] = useState(
    themes.find((t) => t.role?.toLowerCase() === "main")?.id || themes[0]?.id || "current",
  );

  const storeHandle = shop.replace(".myshopify.com", "");
  const clientId = apiKey || "5ec5b77b080f4bb0370b32a2630f9ec3";
  const themeEditorUrl = `https://admin.shopify.com/store/${storeHandle}/themes/${selectedThemeId}/editor?context=apps&appEmbed=${clientId}%2Fpff_app_embed`;

  return (
    <div className="pff-container">
      {/* Header */}
      <div className="pff-page-header">
        <div className="pff-page-title-wrap">
          <h2>🔌 Theme Integration & Setup</h2>
          <p>Easily activate the Product Fit Finder widget on any Shopify OS 2.0 theme (Dawn, Horizon, Impulse, etc.).</p>
        </div>
      </div>

      {/* Main Installation Card */}
      <div className="pff-card">
        <div className="pff-card-header">
          <h3 className="pff-card-title">
            <span>⚡</span> One-Click Theme Editor Launcher
          </h3>
          <span className="pff-badge pff-badge-indigo">
            Shopify OS 2.0 Ready
          </span>
        </div>

        <div className="pff-card-body">
          <p style={{ margin: "0 0 14px 0", fontSize: "0.95rem", color: "#0f172a", fontWeight: 650 }}>
            Select your active store theme below:
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "14px",
              alignItems: "center",
              background: "#f8fafc",
              padding: "16px 20px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              marginBottom: "24px",
            }}
          >
            <div style={{ flex: 1, minWidth: "260px", maxWidth: "440px" }}>
              <label
                htmlFor="theme-selector"
                className="pff-label"
              >
                Choose Theme:
              </label>
              <select
                id="theme-selector"
                className="pff-select"
                value={selectedThemeId}
                onChange={(e) => setSelectedThemeId(e.target.value)}
              >
                {themes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.role?.toLowerCase() === "main" ? "★ (Live Storefront Theme)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ alignSelf: "flex-end" }}>
              <a
                href={themeEditorUrl}
                target="_blank"
                rel="noreferrer"
                className="pff-btn pff-btn-primary"
                style={{ padding: "10px 22px" }}
              >
                <span>⚡</span> Open Theme Customizer ↗
              </a>
            </div>
          </div>

          {/* Quick Notice */}
          <div className="pff-alert pff-alert-info">
            <span style={{ fontSize: "1.2rem" }}>💡</span>
            <div>
              <strong>Pro Tip:</strong> In your Shopify Theme Editor, you can add <strong>Product Fit Finder</strong> either as a <strong>Section Block</strong> (placed anywhere on your Homepage or Header) or as an <strong>App Embed</strong> under the left sidebar menu.
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: "24px 0 16px 0", color: "#0f172a" }}>
            Step-by-Step Activation Guide:
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div
              style={{
                display: "flex",
                gap: "16px",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "18px",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "var(--primary-gradient)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "14px",
                  flexShrink: 0,
                  boxShadow: "0 2px 6px rgba(79, 70, 229, 0.3)",
                }}
              >
                1
              </div>
              <div>
                <strong style={{ fontSize: "0.95rem", color: "#0f172a", fontWeight: 750 }}>
                  Step 1: Select Theme & Open Theme Customizer
                </strong>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.875rem", color: "#475569" }}>
                  Choose your active theme from the dropdown and click <strong>"Open Theme Customizer"</strong>. Your Shopify Theme Editor opens instantly in a new tab.
                </p>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "16px",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "18px",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "var(--primary-gradient)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "14px",
                  flexShrink: 0,
                  boxShadow: "0 2px 6px rgba(79, 70, 229, 0.3)",
                }}
              >
                2
              </div>
              <div>
                <strong style={{ fontSize: "0.95rem", color: "#0f172a", fontWeight: 750 }}>
                  Step 2: Add Section → Apps → Product Fit Finder
                </strong>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.875rem", color: "#475569" }}>
                  In Theme Editor: Click <strong>"Add section"</strong> → Select <strong>"Apps"</strong> tab → Click <strong>"Product Fit Finder"</strong>. Drag and drop it anywhere you want it to appear on your store!
                </p>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "16px",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "18px",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "var(--primary-gradient)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "14px",
                  flexShrink: 0,
                  boxShadow: "0 2px 6px rgba(79, 70, 229, 0.3)",
                }}
              >
                3
              </div>
              <div>
                <strong style={{ fontSize: "0.95rem", color: "#0f172a", fontWeight: 750 }}>
                  Step 3: Save & Preview
                </strong>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.875rem", color: "#475569" }}>
                  Click <strong>Save</strong> in the top-right corner of your Shopify Theme Editor. Your customers can now search fitments instantly!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
