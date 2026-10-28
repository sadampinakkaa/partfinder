import { useLoaderData, useFetcher } from "react-router";
import { useState, useEffect } from "react";
import { authenticate } from "../shopify.server.js";
import { getWidgetConfig, saveWidgetConfig, getStorePlan } from "../models/fit-finder.server.js";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const [config, plan] = await Promise.all([
    getWidgetConfig(shop),
    getStorePlan(shop),
  ]);

  return {
    shop,
    config,
    plan,
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "reset") {
    const defaultConfig = {
      bgType: "color",
      bgColor: "#196c0e",
      bgImage: "",
      textColor: "#ffffff",
      title: "PRODUCT FIT FINDER",
      subtitle: "Explore the Perfect Fit for Your Products",
      alignment: "center",
      boxPadding: 45,
      yearPlaceholder: "SELECT YEAR",
      makePlaceholder: "SELECT MAKE",
      modelPlaceholder: "SELECT MODEL",
      btnColor: "#ffffff",
      btnTextColor: "#4338ca",
      submitText: "FIND PRODUCTS",
      borderRadius: 12,
      showResetBtn: false,
      resetBtnText: "RESET",
      badgeText: "",
      borderStyle: "none",
    };
    await saveWidgetConfig(shop, defaultConfig);
    return { success: true, message: "Widget settings reset to defaults.", config: defaultConfig };
  }

  const showResetBtn = formData.get("showResetBtn") === "on" || formData.get("showResetBtn") === "true";

  const updatedConfig = {
    bgType: formData.get("bgType") || "color",
    bgColor: formData.get("bgColor") || "#196c0e",
    bgImage: formData.get("bgImage") || "",
    textColor: formData.get("textColor") || "#ffffff",
    title: formData.get("title") || "PRODUCT FIT FINDER",
    subtitle: formData.get("subtitle") || "",
    alignment: formData.get("alignment") || "center",
    boxPadding: parseInt(formData.get("boxPadding"), 10) || 45,
    yearPlaceholder: formData.get("yearPlaceholder") || "SELECT YEAR",
    makePlaceholder: formData.get("makePlaceholder") || "SELECT MAKE",
    modelPlaceholder: formData.get("modelPlaceholder") || "SELECT MODEL",
    btnColor: formData.get("btnColor") || "#ffffff",
    btnTextColor: formData.get("btnTextColor") || "#4338ca",
    submitText: formData.get("submitText") || "FIND PRODUCTS",
    borderRadius: parseInt(formData.get("borderRadius"), 10) || 12,
    showResetBtn,
    resetBtnText: formData.get("resetBtnText") || "RESET",
    badgeText: formData.get("badgeText") || "",
    borderStyle: formData.get("borderStyle") || "none",
  };

  await saveWidgetConfig(shop, updatedConfig);
  return { success: true, message: "Widget settings saved successfully!", config: updatedConfig };
};

export default function CustomizeWidgetPage() {
  const { shop, config: initialConfig, plan } = useLoaderData();
  const fetcher = useFetcher();

  // Local state for live real-time preview
  const [formValues, setFormValues] = useState({
    title: initialConfig.title,
    subtitle: initialConfig.subtitle,
    bgType: initialConfig.bgType,
    bgColor: initialConfig.bgColor,
    bgImage: initialConfig.bgImage,
    textColor: initialConfig.textColor,
    alignment: initialConfig.alignment,
    boxPadding: initialConfig.boxPadding,
    borderRadius: initialConfig.borderRadius,
    yearPlaceholder: initialConfig.yearPlaceholder,
    makePlaceholder: initialConfig.makePlaceholder,
    modelPlaceholder: initialConfig.modelPlaceholder,
    btnColor: initialConfig.btnColor,
    btnTextColor: initialConfig.btnTextColor,
    submitText: initialConfig.submitText,
    showResetBtn: Boolean(initialConfig.showResetBtn),
    resetBtnText: initialConfig.resetBtnText || "RESET",
    badgeText: initialConfig.badgeText || "",
    borderStyle: initialConfig.borderStyle || "none",
  });

  const [toast, setToast] = useState(null);
  const isSaving = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.message) {
      setToast({ type: "success", text: fetcher.data.message });
      if (fetcher.data.config) {
        setFormValues((prev) => ({ ...prev, ...fetcher.data.config }));
      }
    }
  }, [fetcher.data]);

  const handleChange = (field, val) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: val,
    }));
  };

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

      {/* Header */}
      <div className="pff-page-header">
        <div className="pff-page-title-wrap">
          <h2>🎨 Storefront Widget Customizer</h2>
          <p>Design your fitment search bar with live real-time preview. All changes sync directly to your storefront.</p>
        </div>
      </div>

      {/* LIVE PREVIEW CONTAINER */}
      <div className="pff-card" style={{ marginBottom: "28px" }}>
        <div className="pff-card-header">
          <h3 className="pff-card-title">
            <span>👁️</span> Live Storefront Preview (What Customers See)
          </h3>
          <span className="pff-badge pff-badge-indigo">
            ⚡ Real-time Sync
          </span>
        </div>

        <div className="pff-card-body" style={{ background: "#f8fafc", padding: "36px 20px" }}>
          {/* Simulated Storefront Widget */}
          <div
            style={{
              maxWidth: "1000px",
              margin: "0 auto",
              padding: `${formValues.boxPadding}px 24px`,
              borderRadius: `${formValues.borderRadius}px`,
              backgroundColor: formValues.bgType === "color" ? formValues.bgColor : "transparent",
              backgroundImage:
                formValues.bgType === "image" && formValues.bgImage
                  ? `url('${formValues.bgImage}')`
                  : formValues.bgType === "image"
                  ? "linear-gradient(135deg, #1e293b, #0f172a)"
                  : "none",
              backgroundRepeat: "no-repeat",
              backgroundSize: "cover",
              backgroundPosition: "center",
              border:
                formValues.borderStyle === "glow" || formValues.borderStyle === "gold"
                  ? "2px solid #6366f1"
                  : formValues.borderStyle === "subtle"
                  ? "1px solid rgba(255, 255, 255, 0.4)"
                  : "none",
              boxShadow:
                formValues.borderStyle === "glow" || formValues.borderStyle === "gold"
                  ? "0 0 25px rgba(99, 102, 241, 0.3), 0 8px 30px rgba(0,0,0,0.15)"
                  : "0 8px 24px -4px rgba(0, 0, 0, 0.1)",
              transition: "all 0.2s ease",
              textAlign: "center",
            }}
          >
            {/* Optional Trust Badge */}
            {formValues.badgeText && formValues.badgeText.trim() !== "" && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "6px 18px",
                  borderRadius: "9999px",
                  fontSize: "13px",
                  fontWeight: 800,
                  letterSpacing: "0.03em",
                  margin: "0 auto 16px auto",
                  background: "rgba(255, 255, 255, 0.2)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255, 255, 255, 0.35)",
                  color: "#ffffff",
                }}
              >
                {formValues.badgeText}
              </div>
            )}

            {/* Header Text */}
            <div style={{ textAlign: formValues.alignment, marginBottom: "24px" }}>
              <h2
                style={{
                  color: formValues.textColor,
                  fontSize: "1.75rem",
                  fontWeight: 900,
                  margin: "0 0 8px 0",
                  letterSpacing: "-0.01em",
                }}
              >
                {formValues.title || "PRODUCT FIT FINDER"}
              </h2>
              {formValues.subtitle && (
                <p
                  style={{
                    color: formValues.textColor,
                    opacity: 0.92,
                    margin: 0,
                    fontSize: "0.95rem",
                  }}
                >
                  {formValues.subtitle}
                </p>
              )}
            </div>

            {/* Simulated Selectors Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "14px",
                maxWidth: "850px",
                margin: "0 auto",
              }}
            >
              <div>
                <select
                  disabled
                  className="pff-select"
                  style={{
                    width: "100%",
                    height: "46px",
                    borderRadius: "8px",
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    color: "#000000",
                    fontWeight: 700,
                    cursor: "not-allowed",
                  }}
                >
                  <option>{formValues.yearPlaceholder}</option>
                </select>
              </div>

              <div>
                <select
                  disabled
                  className="pff-select"
                  style={{
                    width: "100%",
                    height: "46px",
                    borderRadius: "8px",
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    color: "#64748b",
                    fontWeight: 700,
                    cursor: "not-allowed",
                  }}
                >
                  <option>{formValues.makePlaceholder}</option>
                </select>
              </div>

              <div>
                <select
                  disabled
                  className="pff-select"
                  style={{
                    width: "100%",
                    height: "46px",
                    borderRadius: "8px",
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    color: "#64748b",
                    fontWeight: 700,
                    cursor: "not-allowed",
                  }}
                >
                  <option>{formValues.modelPlaceholder}</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ marginTop: "24px", display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                style={{
                  background: formValues.btnColor,
                  color: formValues.btnTextColor,
                  borderRadius: "8px",
                  padding: "12px 34px",
                  fontSize: "0.95rem",
                  fontWeight: 800,
                  border: "none",
                  boxShadow: "0 4px 14px rgba(0, 0, 0, 0.2)",
                  cursor: "pointer",
                  letterSpacing: "0.02em",
                }}
              >
                {formValues.submitText}
              </button>

              {formValues.showResetBtn && (
                <button
                  type="button"
                  style={{
                    background: "rgba(255, 255, 255, 0.15)",
                    border: "1px solid rgba(255, 255, 255, 0.6)",
                    color: "#ffffff",
                    borderRadius: "8px",
                    padding: "12px 24px",
                    fontSize: "0.95rem",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {formValues.resetBtnText || "RESET"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FORM CONTROLS */}
      <fetcher.Form method="POST">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px" }}>
          {/* Card 1: Text & Trust Badge */}
          <div className="pff-card">
            <div className="pff-card-header">
              <h3 className="pff-card-title">
                <span>✍️</span> Header & Trust Badge Settings
              </h3>
            </div>
            <div className="pff-card-body">
              <div className="pff-form-group">
                <label className="pff-label">Widget Title</label>
                <input
                  type="text"
                  name="title"
                  className="pff-input"
                  value={formValues.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="e.g. PRODUCT FIT FINDER"
                />
              </div>

              <div className="pff-form-group">
                <label className="pff-label">Widget Subtitle</label>
                <input
                  type="text"
                  name="subtitle"
                  className="pff-input"
                  value={formValues.subtitle}
                  onChange={(e) => handleChange("subtitle", e.target.value)}
                  placeholder="e.g. Explore the Perfect Fit for Your Products"
                />
              </div>

              <div className="pff-form-group">
                <label className="pff-label">Fitment Trust Badge (Optional)</label>
                <input
                  type="text"
                  name="badgeText"
                  className="pff-input"
                  value={formValues.badgeText}
                  onChange={(e) => handleChange("badgeText", e.target.value)}
                  placeholder="e.g. ⚡ 100% Exact Vehicle Fit Guaranteed"
                />
                <span style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px", display: "block" }}>
                  Displays an eye-catching pill badge above the widget title.
                </span>
              </div>

              <div className="pff-form-group">
                <label className="pff-label">Text Alignment</label>
                <div style={{ display: "flex", gap: "16px", marginTop: "6px" }}>
                  {["left", "center", "right"].map((align) => (
                    <label key={align} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", textTransform: "capitalize", fontSize: "0.9rem", fontWeight: 700, color: "#000000" }}>
                      <input
                        type="radio"
                        name="alignment"
                        value={align}
                        checked={formValues.alignment === align}
                        onChange={() => handleChange("alignment", align)}
                      />
                      <span>{align}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pff-form-group" style={{ marginBottom: 0 }}>
                <label className="pff-label">Text Font Color</label>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input
                    type="color"
                    name="textColor"
                    value={formValues.textColor}
                    onChange={(e) => handleChange("textColor", e.target.value)}
                    style={{ width: "42px", height: "42px", padding: "2px", borderRadius: "8px", border: "1px solid #cbd5e1", cursor: "pointer" }}
                  />
                  <input
                    type="text"
                    className="pff-input"
                    value={formValues.textColor}
                    onChange={(e) => handleChange("textColor", e.target.value)}
                    style={{ width: "120px" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Background & Border Accent */}
          <div className="pff-card">
            <div className="pff-card-header">
              <h3 className="pff-card-title">
                <span>🎨</span> Background & Border Styling
              </h3>
            </div>
            <div className="pff-card-body">
              <div className="pff-form-group">
                <label className="pff-label">Background Type</label>
                <div style={{ display: "flex", gap: "16px", marginTop: "6px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.9rem", fontWeight: 700, color: "#000000" }}>
                    <input
                      type="radio"
                      name="bgType"
                      value="color"
                      checked={formValues.bgType === "color"}
                      onChange={() => handleChange("bgType", "color")}
                    />
                    <span>Solid Color</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.9rem", fontWeight: 700, color: "#000000" }}>
                    <input
                      type="radio"
                      name="bgType"
                      value="image"
                      checked={formValues.bgType === "image"}
                      onChange={() => handleChange("bgType", "image")}
                    />
                    <span>Image URL</span>
                  </label>
                </div>
              </div>

              {formValues.bgType === "color" ? (
                <div className="pff-form-group">
                  <label className="pff-label">Background Color</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <input
                      type="color"
                      name="bgColor"
                      value={formValues.bgColor}
                      onChange={(e) => handleChange("bgColor", e.target.value)}
                      style={{ width: "42px", height: "42px", padding: "2px", borderRadius: "8px", border: "1px solid #cbd5e1", cursor: "pointer" }}
                    />
                    <input
                      type="text"
                      className="pff-input"
                      value={formValues.bgColor}
                      onChange={(e) => handleChange("bgColor", e.target.value)}
                      style={{ width: "120px" }}
                    />
                  </div>
                </div>
              ) : (
                <div className="pff-form-group">
                  <label className="pff-label">Background Image URL</label>
                  <input
                    type="url"
                    name="bgImage"
                    className="pff-input"
                    value={formValues.bgImage}
                    onChange={(e) => handleChange("bgImage", e.target.value)}
                    placeholder="https://example.com/banner-background.jpg"
                  />
                  <span style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px", display: "block" }}>
                    Tip: Upload your image in Shopify Settings → Files and paste the CDN URL here.
                  </span>
                </div>
              )}

              <div className="pff-form-group">
                <label className="pff-label">Card Border Accent</label>
                <select
                  name="borderStyle"
                  className="pff-select"
                  value={formValues.borderStyle}
                  onChange={(e) => handleChange("borderStyle", e.target.value)}
                >
                  <option value="none">Standard (Clean Flat)</option>
                  <option value="glow">Modern Accent Glow</option>
                  <option value="subtle">Subtle Modern Border</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: 0 }}>
                <div className="pff-form-group" style={{ marginBottom: 0 }}>
                  <label className="pff-label">Padding: {formValues.boxPadding}px</label>
                  <input
                    type="range"
                    name="boxPadding"
                    min="15"
                    max="80"
                    value={formValues.boxPadding}
                    onChange={(e) => handleChange("boxPadding", e.target.value)}
                    className="pff-range-slider"
                  />
                </div>

                <div className="pff-form-group" style={{ marginBottom: 0 }}>
                  <label className="pff-label">Radius: {formValues.borderRadius}px</label>
                  <input
                    type="range"
                    name="borderRadius"
                    min="0"
                    max="30"
                    value={formValues.borderRadius}
                    onChange={(e) => handleChange("borderRadius", e.target.value)}
                    className="pff-range-slider"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Dropdown Labels */}
          <div className="pff-card">
            <div className="pff-card-header">
              <h3 className="pff-card-title">
                <span>🏷️</span> Dropdown Selectors Labels
              </h3>
            </div>
            <div className="pff-card-body">
              <div className="pff-form-group">
                <label className="pff-label">Year Dropdown Label</label>
                <input
                  type="text"
                  name="yearPlaceholder"
                  className="pff-input"
                  value={formValues.yearPlaceholder}
                  onChange={(e) => handleChange("yearPlaceholder", e.target.value)}
                  placeholder="e.g. SELECT YEAR"
                />
              </div>

              <div className="pff-form-group">
                <label className="pff-label">Make Dropdown Label</label>
                <input
                  type="text"
                  name="makePlaceholder"
                  className="pff-input"
                  value={formValues.makePlaceholder}
                  onChange={(e) => handleChange("makePlaceholder", e.target.value)}
                  placeholder="e.g. SELECT MAKE"
                />
              </div>

              <div className="pff-form-group" style={{ marginBottom: 0 }}>
                <label className="pff-label">Model Dropdown Label</label>
                <input
                  type="text"
                  name="modelPlaceholder"
                  className="pff-input"
                  value={formValues.modelPlaceholder}
                  onChange={(e) => handleChange("modelPlaceholder", e.target.value)}
                  placeholder="e.g. SELECT MODEL"
                />
              </div>
            </div>
          </div>

          {/* Card 4: Action & Reset Buttons */}
          <div className="pff-card">
            <div className="pff-card-header">
              <h3 className="pff-card-title">
                <span>🔘</span> Action & Reset Buttons
              </h3>
            </div>
            <div className="pff-card-body">
              <div className="pff-form-group">
                <label className="pff-label">Search Button Text</label>
                <input
                  type="text"
                  name="submitText"
                  className="pff-input"
                  value={formValues.submitText}
                  onChange={(e) => handleChange("submitText", e.target.value)}
                  placeholder="e.g. FIND PRODUCTS or SEARCH"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="pff-form-group">
                  <label className="pff-label">Button BG Color</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="color"
                      name="btnColor"
                      value={formValues.btnColor}
                      onChange={(e) => handleChange("btnColor", e.target.value)}
                      style={{ width: "38px", height: "38px", padding: "2px", borderRadius: "8px", border: "1px solid #cbd5e1", cursor: "pointer" }}
                    />
                    <input
                      type="text"
                      className="pff-input"
                      value={formValues.btnColor}
                      onChange={(e) => handleChange("btnColor", e.target.value)}
                    />
                  </div>
                </div>

                <div className="pff-form-group">
                  <label className="pff-label">Button Text Color</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="color"
                      name="btnTextColor"
                      value={formValues.btnTextColor}
                      onChange={(e) => handleChange("btnTextColor", e.target.value)}
                      style={{ width: "38px", height: "38px", padding: "2px", borderRadius: "8px", border: "1px solid #cbd5e1", cursor: "pointer" }}
                    />
                    <input
                      type="text"
                      className="pff-input"
                      value={formValues.btnTextColor}
                      onChange={(e) => handleChange("btnTextColor", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* NEW: Reset Button Controls */}
              <div style={{ marginTop: "12px", padding: "14px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: 800, color: "#000000" }}>
                  <input
                    type="checkbox"
                    name="showResetBtn"
                    checked={formValues.showResetBtn}
                    onChange={(e) => handleChange("showResetBtn", e.target.checked)}
                  />
                  <span>Show "Reset Filter" Button on Storefront</span>
                </label>

                {formValues.showResetBtn && (
                  <div style={{ marginTop: "10px" }}>
                    <label className="pff-label" style={{ fontSize: "0.75rem" }}>Reset Button Label</label>
                    <input
                      type="text"
                      name="resetBtnText"
                      className="pff-input"
                      value={formValues.resetBtnText}
                      onChange={(e) => handleChange("resetBtnText", e.target.value)}
                      placeholder="e.g. RESET or CLEAR"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div
          style={{
            marginTop: "24px",
            padding: "16px 24px",
            background: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}
        >
          <button
            type="submit"
            name="intent"
            value="reset"
            className="pff-btn pff-btn-secondary"
            disabled={isSaving}
          >
            Reset Defaults
          </button>

          <button
            type="submit"
            name="intent"
            value="save"
            className="pff-btn pff-btn-primary"
            disabled={isSaving}
            style={{ padding: "10px 28px", fontSize: "0.95rem" }}
          >
            {isSaving ? "Saving Settings..." : "💾 Save Widget Settings"}
          </button>
        </div>
      </fetcher.Form>
    </div>
  );
}
