import { useLoaderData, useFetcher, useSearchParams, Link } from "react-router";
import { useState, useEffect } from "react";
import { authenticate } from "../shopify.server.js";
import {
  getStorePlan,
  getStoreFitmentData,
  createFitmentEntry,
  updateFitmentEntry,
  deleteFitmentEntry,
  bulkDeleteFitmentEntries,
  getFitmentAnalytics,
} from "../models/fit-finder.server.js";
import { SkeletonTable } from "../components/Skeleton.jsx";

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const search = url.searchParams.get("search") || "";

  // 1. Fetch store plan & analytics in parallel
  const [plan, analytics, data] = await Promise.all([
    getStorePlan(shop),
    getFitmentAnalytics(shop),
    getStoreFitmentData(shop, { page, limit: 25, search }),
  ]);

  // 3. Fetch Shopify store collections dynamically for dropdown selector
  let collections = [];
  try {
    const response = await admin.graphql(
      `#graphql
      query getCollections {
        collections(first: 250) {
          edges {
            node {
              id
              title
              handle
            }
          }
        }
      }`,
    );
    const json = await response.json();
    collections = json.data?.collections?.edges?.map((e) => ({
      title: e.node.title,
      handle: e.node.handle,
      url: `/collections/${e.node.handle}`,
    })) || [];
  } catch (err) {
    console.error("Failed to fetch Shopify collections:", err);
  }

  const currentYear = new Date().getFullYear();

  return {
    shop,
    plan,
    analytics,
    data,
    collections,
    currentYear,
    search,
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const intent = formData.get("intent");

  try {
    switch (intent) {
      case "create": {
        const year = formData.get("year");
        const make = formData.get("make");
        const model = formData.get("model");
        const collection = formData.get("collection");

        await createFitmentEntry(shop, { year, make, model, collection });
        return { success: true, message: "Data added Successfully" };
      }

      case "update": {
        const id = formData.get("id");
        const year = formData.get("year");
        const make = formData.get("make");
        const model = formData.get("model");
        const collection = formData.get("collection");

        await updateFitmentEntry(shop, id, { year, make, model, collection });
        return { success: true, message: "Data Edited Successfully" };
      }

      case "delete": {
        const id = formData.get("id");
        await deleteFitmentEntry(shop, id);
        return { success: true, message: "Data Deleted Successfully" };
      }

      case "bulk_delete": {
        const ids = JSON.parse(formData.get("ids") || "[]");
        await bulkDeleteFitmentEntries(shop, ids);
        return { success: true, message: `Successfully deleted ${ids.length} selected record(s).` };
      }

      default:
        return { error: "Invalid intent" };
    }
  } catch (err) {
    return { error: err.message || "Failed to process request" };
  }
};

export default function ManageDataPage() {
  const { shop, plan, analytics, data, collections, currentYear, search } = useLoaderData();
  const fetcher = useFetcher();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search state
  const [searchInput, setSearchInput] = useState(search);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  // Bulk selection state (Enabled for Premium Plan - planNumber == 2)
  const [selectedIds, setSelectedIds] = useState([]);

  // Toast message
  const [toast, setToast] = useState(null);

  const isSubmitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.message) {
      setToast({ type: "success", text: fetcher.data.message });
      setShowAddModal(false);
      setEditRecord(null);
      setDeleteId(null);
      setSelectedIds([]);
    } else if (fetcher.data?.error) {
      setToast({ type: "danger", text: fetcher.data.error });
    }
  }, [fetcher.data]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      params.set("search", searchInput.trim());
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    setSearchParams(params);
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(newPage));
    setSearchParams(params);
  };

  const handleToggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(data.records.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleExecuteBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.length} selected rows?`)) {
      fetcher.submit(
        { intent: "bulk_delete", ids: JSON.stringify(selectedIds) },
        { method: "POST" },
      );
    }
  };

  // Generate years list from currentYear down to 1900
  const yearOptions = [];
  for (let y = currentYear; y >= 1900; y--) {
    yearOptions.push(y);
  }

  const isAtLimit = plan.planNumber !== 2 && data.total >= plan.maxLimit;

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

      {/* Soft Modern SaaS KPI Stats Grid */}
      <div className="pff-stats-grid">
        <div className="pff-stat-card">
          <div className="pff-stat-header">
            <span className="pff-stat-label">Fitment Records</span>
            <div className="pff-stat-icon pff-stat-icon-indigo">🚗</div>
          </div>
          <div className="pff-stat-value">{data.total.toLocaleString()}</div>
          <div className="pff-stat-footer">
            <span>Capacity:</span>
            <strong style={{ color: "#0f172a" }}>
              {plan.planNumber === 2 ? "Unlimited (PRO Plan)" : `${data.total} / ${plan.maxLimit} rows`}
            </strong>
          </div>
        </div>

        <div className="pff-stat-card">
          <div className="pff-stat-header">
            <span className="pff-stat-label">Customer Lookups</span>
            <div className="pff-stat-icon pff-stat-icon-emerald">⚡</div>
          </div>
          <div className="pff-stat-value">{(analytics?.totalSearches || 0).toLocaleString()}</div>
          <div className="pff-stat-footer">
            <span style={{ color: "#16a34a", fontWeight: 800 }}>● Live</span>
            <span style={{ color: "#334155" }}>Storefront Lookups</span>
          </div>
        </div>

        <div className="pff-stat-card">
          <div className="pff-stat-header">
            <span className="pff-stat-label">Active Makes</span>
            <div className="pff-stat-icon pff-stat-icon-violet">🏷️</div>
          </div>
          <div className="pff-stat-value">{(analytics?.makesCount || 0).toLocaleString()}</div>
          <div className="pff-stat-footer">
            <span style={{ color: "#334155" }}>Manufacturers Indexed</span>
          </div>
        </div>

        <div className="pff-stat-card">
          <div className="pff-stat-header">
            <span className="pff-stat-label">Current Plan</span>
            <div className="pff-stat-icon pff-stat-icon-sky">💎</div>
          </div>
          <div className="pff-stat-value" style={{ fontSize: "1.5rem", paddingTop: "4px" }}>
            {plan.title}
          </div>
          <div className="pff-stat-footer">
            <Link to="/app/pricing" style={{ color: "#4f46e5", fontWeight: 700, textDecoration: "none" }}>
              {plan.planNumber === 2 ? "Manage Tier →" : "Upgrade to Pro →"}
            </Link>
          </div>
        </div>
      </div>

      {/* Main Fitment Data Card */}
      <div className="pff-card">
        <div className="pff-card-header" style={{ flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h2 className="pff-card-title">
              <span>📋</span> Vehicle Fitment Database
            </h2>
            <div className="pff-card-subtitle">
              Total Active: <strong style={{ color: "#0f172a" }}>{data.total.toLocaleString()}</strong> mapping entries
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            {/* Delete Selected Rows Button */}
            {plan.planNumber === 2 && selectedIds.length > 0 && (
              <button
                type="button"
                className="pff-btn pff-btn-danger"
                onClick={handleExecuteBulkDelete}
                disabled={isSubmitting}
              >
                🗑️ Delete Selected ({selectedIds.length})
              </button>
            )}

            {/* Instant Export CSV */}
            <a
              href="/api/fitment.export"
              download
              className="pff-btn pff-btn-secondary"
              title="Download all fitment data as CSV"
            >
              💾 Export CSV
            </a>

            {/* Bulk CSV Upload */}
            <Link to="/app/csv-upload" className="pff-btn pff-btn-secondary">
              📥 Bulk CSV
            </Link>

            {/* Add Fitment Button */}
            {plan.planNumber === 2 || !isAtLimit ? (
              <button
                type="button"
                className="pff-btn pff-btn-primary"
                onClick={() => setShowAddModal(true)}
              >
                ➕ Add Fitment
              </button>
            ) : (
              <Link to="/app/pricing" className="pff-btn pff-btn-primary pff-btn-sm">
                Upgrade to Add More
              </Link>
            )}
          </div>
        </div>

        {/* Search Toolbar */}
        <div style={{ padding: "14px 22px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
          <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "10px", maxWidth: "480px" }}>
            <input
              type="text"
              className="pff-input"
              placeholder="Filter by Year, Make, Model, or Collection URL..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button type="submit" className="pff-btn pff-btn-secondary">
              Search
            </button>
            {searchInput && (
              <button
                type="button"
                className="pff-btn pff-btn-secondary"
                onClick={() => {
                  setSearchInput("");
                  setSearchParams(new URLSearchParams());
                }}
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {/* Data Table */}
        <div className="pff-table-container">
          {isSubmitting ? (
            <SkeletonTable rows={8} columns={plan.planNumber === 2 ? 6 : 5} />
          ) : data.records.length === 0 ? (
            <div style={{ padding: "50px 24px", textAlign: "center" }}>
              <div style={{ fontSize: "2.8rem", marginBottom: "8px" }}>📦</div>
              <h3 style={{ margin: "0 0 6px 0", color: "#0f172a", fontWeight: 700 }}>No fitments found</h3>
              <p style={{ margin: "0 0 16px 0", fontSize: "0.875rem", color: "#64748b" }}>
                {search ? "No records matched your search query." : "Add your first vehicle fitment entry or upload a CSV."}
              </p>
              {!isAtLimit && (
                <button
                  type="button"
                  className="pff-btn pff-btn-primary"
                  onClick={() => setShowAddModal(true)}
                >
                  ➕ Add First Entry
                </button>
              )}
            </div>
          ) : (
            <table className="pff-table">
              <thead>
                <tr>
                  {plan.planNumber === 2 && (
                    <th style={{ width: "40px" }}>
                      <input
                        type="checkbox"
                        checked={
                          data.records.length > 0 &&
                          selectedIds.length === data.records.length
                        }
                        onChange={handleToggleSelectAll}
                      />
                    </th>
                  )}
                  <th>YEAR</th>
                  <th>MAKE</th>
                  <th>MODEL</th>
                  <th>COLLECTION URL</th>
                  <th style={{ textAlign: "right" }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {data.records.map((row) => (
                  <tr key={row.id}>
                    {plan.planNumber === 2 && (
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row.id)}
                          onChange={() => handleToggleRow(row.id)}
                        />
                      </td>
                    )}
                    <td>
                      <strong style={{ color: "#4f46e5", fontWeight: 800 }}>{row.year}</strong>
                    </td>
                    <td style={{ fontWeight: 650, color: "#0f172a" }}>{row.make}</td>
                    <td style={{ color: "#334155" }}>{row.model}</td>
                    <td>
                      <a
                        href={row.collection.startsWith("http") ? row.collection : `https://${shop}${row.collection}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#4f46e5", textDecoration: "none", fontWeight: 600, background: "#f5f3ff", padding: "4px 10px", borderRadius: "6px", border: "1px solid #ede9fe", fontSize: "0.8125rem" }}
                      >
                        {row.collection} ↗
                      </a>
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button
                        type="button"
                        className="pff-btn pff-btn-secondary pff-btn-sm"
                        style={{ marginRight: "6px" }}
                        onClick={() => setEditRecord(row)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="pff-btn pff-btn-danger pff-btn-sm"
                        onClick={() => setDeleteId(row.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {data.total > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 22px",
              background: "#ffffff",
              borderTop: "1px solid #e2e8f0",
              fontSize: "0.875rem",
              color: "#64748b",
            }}
          >
            <div>
              Showing <strong style={{ color: "#0f172a" }}>{((data.page - 1) * data.limit) + 1}</strong> to{" "}
              <strong style={{ color: "#0f172a" }}>{Math.min(data.page * data.limit, data.total)}</strong> of{" "}
              <strong style={{ color: "#0f172a" }}>{data.total.toLocaleString()}</strong> entries
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                type="button"
                className="pff-btn pff-btn-secondary pff-btn-sm"
                disabled={data.page <= 1}
                onClick={() => handlePageChange(data.page - 1)}
              >
                Previous
              </button>
              <span style={{ fontWeight: 600, color: "#0f172a" }}>
                Page {data.page} of {data.totalPages}
              </span>
              <button
                type="button"
                className="pff-btn pff-btn-secondary pff-btn-sm"
                disabled={data.page >= data.totalPages}
                onClick={() => handlePageChange(data.page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add New Entry Modal (Matches #NewDataEntry in legacy PHP) */}
      {showAddModal && (
        <div className="pff-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="pff-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="pff-modal-header">
              <h3 className="pff-modal-title">Add New Fitment Data</h3>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.25rem" }}
              >
                ✕
              </button>
            </div>

            <fetcher.Form method="POST">
              <div className="pff-modal-body">
                <input type="hidden" name="intent" value="create" />

                <div className="pff-form-group">
                  <label className="pff-label">Select Year *</label>
                  <select name="year" className="pff-select" required defaultValue={currentYear}>
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <div className="pff-form-group">
                  <label className="pff-label">Enter Make *</label>
                  <input
                    type="text"
                    name="make"
                    className="pff-input"
                    placeholder="e.g. Toyota, Ford, Honda"
                    required
                  />
                </div>

                <div className="pff-form-group">
                  <label className="pff-label">Enter Model *</label>
                  <input
                    type="text"
                    name="model"
                    className="pff-input"
                    placeholder="e.g. Camry, F-150, Civic"
                    required
                  />
                </div>

                <div className="pff-form-group">
                  <label className="pff-label">Select Collection *</label>
                  <select name="collection" className="pff-select" required>
                    <option value="">-- Choose Store Collection --</option>
                    {collections.map((c) => (
                      <option key={c.handle} value={c.url}>
                        {c.title} ({c.url})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pff-modal-footer">
                <button
                  type="button"
                  className="pff-btn pff-btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pff-btn pff-btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </fetcher.Form>
          </div>
        </div>
      )}

      {/* Edit Entry Modal (Matches #EditOldEntry in legacy PHP) */}
      {editRecord && (
        <div className="pff-modal-overlay" onClick={() => setEditRecord(null)}>
          <div className="pff-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="pff-modal-header">
              <h3 className="pff-modal-title">Edit Fitment Data</h3>
              <button
                onClick={() => setEditRecord(null)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.25rem" }}
              >
                ✕
              </button>
            </div>

            <fetcher.Form method="POST">
              <div className="pff-modal-body">
                <input type="hidden" name="intent" value="update" />
                <input type="hidden" name="id" value={editRecord.id} />

                <div className="pff-form-group">
                  <label className="pff-label">Select Year *</label>
                  <select
                    name="year"
                    className="pff-select"
                    required
                    defaultValue={editRecord.year}
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={String(y)}>{y}</option>
                    ))}
                  </select>
                </div>

                <div className="pff-form-group">
                  <label className="pff-label">Enter Make *</label>
                  <input
                    type="text"
                    name="make"
                    className="pff-input"
                    defaultValue={editRecord.make}
                    required
                  />
                </div>

                <div className="pff-form-group">
                  <label className="pff-label">Enter Model *</label>
                  <input
                    type="text"
                    name="model"
                    className="pff-input"
                    defaultValue={editRecord.model}
                    required
                  />
                </div>

                <div className="pff-form-group">
                  <label className="pff-label">Select Collection *</label>
                  <select
                    name="collection"
                    className="pff-select"
                    required
                    defaultValue={editRecord.collection}
                  >
                    <option value={editRecord.collection}>Current: {editRecord.collection}</option>
                    {collections.map((c) => (
                      <option key={c.handle} value={c.url}>
                        {c.title} ({c.url})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pff-modal-footer">
                <button
                  type="button"
                  className="pff-btn pff-btn-secondary"
                  onClick={() => setEditRecord(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pff-btn pff-btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </fetcher.Form>
          </div>
        </div>
      )}

      {/* Delete Entry Modal (Matches #DeleteEntry in legacy PHP) */}
      {deleteId && (
        <div className="pff-modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="pff-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="pff-modal-header" style={{ background: "#fef2f2" }}>
              <h3 className="pff-modal-title" style={{ color: "#991b1b" }}>
                Confirm Deletion
              </h3>
              <button
                onClick={() => setDeleteId(null)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.25rem" }}
              >
                ✕
              </button>
            </div>

            <div className="pff-modal-body">
              <p style={{ margin: 0, fontSize: "1rem", color: "#334155" }}>
                Are you sure you want to delete this entry?
              </p>
            </div>

            <div className="pff-modal-footer">
              <button
                type="button"
                className="pff-btn pff-btn-secondary"
                onClick={() => setDeleteId(null)}
              >
                No
              </button>
              <button
                type="button"
                className="pff-btn pff-btn-danger"
                onClick={() => fetcher.submit({ intent: "delete", id: String(deleteId) }, { method: "POST" })}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
