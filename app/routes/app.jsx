import { Outlet, useLoaderData, useRouteError, NavLink, useNavigation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server.js";
import { getStorePlan, syncStoreSubscription } from "../models/fit-finder.server.js";
import { SkeletonTable } from "../components/Skeleton.jsx";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  await syncStoreSubscription(admin, shop);
  const plan = await getStorePlan(shop);
  const shopPrefix = shop.split(".")[0];

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    shop,
    shopPrefix,
    plan,
  };
};

export default function App() {
  const { apiKey, shop, shopPrefix, plan } = useLoaderData();
  const navigation = useNavigation();
  const isNavigating = Boolean(navigation.location);

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Manage data</s-link>
        <s-link href="/app/csv-upload">CSV upload</s-link>
        <s-link href="/app/customize">Customize Widget</s-link>
        <s-link href="/app/how-to-install">How to install</s-link>
        <s-link href="/app/pricing">Pricing Plans</s-link>
        <s-link href="/app/about">About us</s-link>
      </s-app-nav>

      {/* Clean Modern Soft SaaS Header */}
      <div className="pff-header-banner">
        <div className="pff-brand">
          <div className="pff-brand-logo">⚡</div>
          <div className="pff-brand-info">
            <h1 className="pff-brand-name">
              Product Fit Finder <span className="pff-pro-tag">PRO</span>
            </h1>
            <span className="pff-brand-sub">by Pinakkaa</span>
          </div>
        </div>

        <div className="pff-user-badge">
          <div className="pff-avatar-circle">
            {shopPrefix.charAt(0).toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span className="pff-shop-title">{shop}</span>
            <span
              className={`pff-badge ${
                plan.planNumber === 2 ? "pff-badge-premium" : "pff-badge-basic"
              }`}
              style={{ fontSize: "10px", padding: "1px 8px", alignSelf: "flex-start", marginTop: "2px" }}
            >
              {plan.title}
            </span>
          </div>
        </div>
      </div>

      {/* Clean Modern Navigation Bar */}
      <nav className="pff-nav-bar">
        <NavLink
          to="/app"
          end
          className={({ isActive }) => `pff-nav-link ${isActive ? "active" : ""}`}
        >
          <span>📋</span> Manage Data
        </NavLink>

        <NavLink
          to="/app/csv-upload"
          className={({ isActive }) => `pff-nav-link ${isActive ? "active" : ""}`}
        >
          <span>📥</span> CSV Upload
        </NavLink>

        <NavLink
          to="/app/customize"
          className={({ isActive }) => `pff-nav-link ${isActive ? "active" : ""}`}
        >
          <span>🎨</span> Customize Widget
        </NavLink>

        <NavLink
          to="/app/how-to-install"
          className={({ isActive }) => `pff-nav-link ${isActive ? "active" : ""}`}
        >
          <span>🔌</span> How to Install
        </NavLink>

        <NavLink
          to="/app/pricing"
          className={({ isActive }) => `pff-nav-link ${isActive ? "active" : ""}`}
        >
          <span>💎</span> Pricing Plans
        </NavLink>

        <NavLink
          to="/app/about"
          className={({ isActive }) => `pff-nav-link ${isActive ? "active" : ""}`}
        >
          <span>ℹ️</span> About
        </NavLink>
      </nav>

      {/* Main Content with Skeleton Loading State during Route Transitions */}
      {isNavigating ? (
        <div className="pff-container">
          <div className="pff-card">
            <div className="pff-card-body">
              <SkeletonTable rows={7} columns={5} />
            </div>
          </div>
        </div>
      ) : (
        <Outlet />
      )}
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
