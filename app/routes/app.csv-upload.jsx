import { useLoaderData, useFetcher, Link } from "react-router";
import { useState, useEffect, useRef } from "react";
import { authenticate } from "../shopify.server.js";
import { getStorePlan, importCsvData } from "../models/fit-finder.server.js";
import prisma from "../db.server.js";
import { Skeleton } from "../components/Skeleton.jsx";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const plan = await getStorePlan(shop);
  const existingRows = await prisma.storeFitmentData.count({ where: { shop } });

  return {
    shop,
    plan,
    existingRows,
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const rawRows = formData.get("rows");
  const fileName = formData.get("fileName") || "upload.csv";

  try {
    const rows = JSON.parse(rawRows || "[]");
    if (!rows || rows.length === 0) {
      return { error: "Please Select a CSV file first." };
    }

    const result = await importCsvData(shop, rows, fileName);
    return {
      success: true,
      message: `CSV imported Successfully. (${result.successRows} rows imported, ${result.duplicateRows} duplicates skipped)`,
    };
  } catch (err) {
    return { error: err.message || "Error occurred while importing the CSV" };
  }
};

// Robust CSV parser for year, make, model, collection
function parseCsv(text) {
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    if (values.length < 4) continue;
    rows.push({
      year: values[0] || "",
      make: values[1] || "",
      model: values[2] || "",
      collection: values[3] || "",
    });
  }

  return rows;
}

export default function CsvUploadPage() {
  const { shop, plan, existingRows } = useLoaderData();
  const fetcher = useFetcher();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [parseError, setParseError] = useState(null);
  const [alert, setAlert] = useState(null);
  const [isParsing, setIsParsing] = useState(false);

  const isSubmitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.message) {
      setAlert({ type: "success", text: fetcher.data.message });
      setSelectedFile(null);
      setParsedRows([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else if (fetcher.data?.error) {
      setAlert({ type: "danger", text: fetcher.data.error });
    }
  }, [fetcher.data]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      setParseError("Please select a valid CSV file (.csv).");
      return;
    }

    setParseError(null);
    setSelectedFile(file);
    setIsParsing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        const rows = parseCsv(text);

        if (rows.length === 0) {
          setParseError("The file is empty, broken, or not in the correct format (year,make,model,collection).");
          setParsedRows([]);
          setIsParsing(false);
          return;
        }

        // Plan limit check
        if (plan.planNumber !== 2 && existingRows + rows.length > plan.maxLimit) {
          setParseError(
            `Error: The number of data (${existingRows + rows.length}) exceeds your Basic Plan limit of ${plan.maxLimit} rows. Please upgrade to Pro (Unlimited) Plan.`,
          );
          setParsedRows([]);
          setIsParsing(false);
          return;
        }

        setParsedRows(rows);
      } catch (err) {
        setParseError(`Error parsing CSV: ${err.message}`);
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsText(file);
  };

  const handleStartImport = () => {
    if (parsedRows.length === 0) {
      setAlert({ type: "danger", text: "Please Select a CSV file first." });
      return;
    }

    fetcher.submit(
      {
        rows: JSON.stringify(parsedRows),
        fileName: selectedFile?.name || "upload.csv",
      },
      { method: "POST" },
    );
  };

  const handleDownloadSampleCsv = () => {
    const content = "year,make,model,collection\r\n2002,Hind Motor,Ambassador,https://yourshopifyshop.com/collections/collection-handle\r\n1996,Tata Motors,Sumo,https://yourshopifyshop.com/collections/collection-handle\r\n1992,Mahindra,Bolero,https://yourshopifyshop.com/collections/collection-handle";
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "sample_fitment_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="pff-container">
      {/* Alert Notification */}
      {alert && (
        <div className={`pff-alert pff-alert-${alert.type}`}>
          <span>{alert.type === "success" ? "✓" : "⚠️"}</span>
          <div style={{ flex: 1, fontWeight: 700, color: alert.type === "success" ? "#14532d" : "#991b1b" }}>{alert.text}</div>
          <button
            onClick={() => setAlert(null)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", fontWeight: "bold" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="pff-page-header">
        <div className="pff-page-title-wrap">
          <h2>📥 Bulk Fitment CSV Importer</h2>
          <p>Import thousands of vehicle-to-collection mapping records in seconds with auto-duplicate detection.</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            className="pff-btn pff-btn-secondary"
            onClick={handleDownloadSampleCsv}
          >
            📄 Sample CSV
          </button>
          <a
            href="/api/fitment.export"
            download
            className="pff-btn pff-btn-secondary"
          >
            💾 Export Current CSV
          </a>
        </div>
      </div>

      {/* Main CSV Card */}
      <div className="pff-card">
        <div className="pff-card-header">
          <div>
            <h3 className="pff-card-title">
              <span>⚡</span> Upload CSV Spreadsheet
            </h3>
            <div className="pff-card-subtitle">
              Columns required: <strong>year, make, model, collection</strong>
            </div>
          </div>
          <span className="pff-badge pff-badge-indigo">
            Format: UTF-8 CSV
          </span>
        </div>

        <div className="pff-card-body">
          {/* Plan Allowance Warning if Basic Plan */}
          {plan.planNumber !== 2 && (
            <div
              style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "10px",
                padding: "14px 18px",
                marginBottom: "20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <strong style={{ color: "#1e40af", fontSize: "0.9rem" }}>Free Plan Limit:</strong>{" "}
                <span style={{ color: "#1d4ed8", fontWeight: 600 }}>
                  {existingRows} of {plan.maxLimit} rows used ({Math.max(0, plan.maxLimit - existingRows)} rows remaining).
                </span>
              </div>
              <Link to="/app/pricing" className="pff-btn pff-btn-primary pff-btn-sm">
                Get Unlimited with Pro →
              </Link>
            </div>
          )}

          {/* Upload Drop Zone */}
          <div
            style={{
              border: "2px dashed #c7d2fe",
              borderRadius: "14px",
              padding: "44px 20px",
              textAlign: "center",
              background: "#f8fafc",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={{ fontSize: "3rem", marginBottom: "10px" }}>📁</div>
            <div style={{ fontWeight: 750, fontSize: "1.1rem", color: "#0f172a" }}>
              {selectedFile ? selectedFile.name : "Select or Drop your CSV file here"}
            </div>
            <div style={{ fontSize: "0.875rem", color: "#4f46e5", fontWeight: 600, marginTop: "6px" }}>
              Click anywhere in this box to choose a <strong>.csv</strong> file from your computer
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </div>

          {/* Parsing skeleton indicator */}
          {isParsing && (
            <div style={{ marginTop: "20px" }}>
              <Skeleton width="100%" height="40px" borderRadius="8px" />
            </div>
          )}

          {parseError && (
            <div className="pff-alert pff-alert-danger" style={{ marginTop: "18px" }}>
              <span>⚠️</span>
              <div style={{ flex: 1, fontWeight: 700 }}>{parseError}</div>
            </div>
          )}

          {/* Ready to Import Actions */}
          {parsedRows.length > 0 && !isParsing && (
            <div style={{ marginTop: "28px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <strong style={{ color: "#14532d", fontSize: "1.05rem", fontWeight: 900 }}>
                    ✓ Ready to import {parsedRows.length.toLocaleString()} valid fitment row(s)
                  </strong>
                  <div style={{ fontSize: "0.85rem", color: "#334155", fontWeight: 600 }}>
                    Previewing top 5 rows:
                  </div>
                </div>

                <button
                  type="button"
                  className="pff-btn pff-btn-primary"
                  onClick={handleStartImport}
                  disabled={isSubmitting}
                  style={{ padding: "12px 28px", fontSize: "0.95rem" }}
                >
                  {isSubmitting ? "Importing Records..." : `⚡ Confirm & Upload (${parsedRows.length} rows)`}
                </button>
              </div>

              {/* Preview Table */}
              <div className="pff-table-container" style={{ border: "1px solid #e2e8f0", borderRadius: "10px" }}>
                <table className="pff-table">
                  <thead>
                    <tr>
                      <th>YEAR</th>
                      <th>MAKE</th>
                      <th>MODEL</th>
                      <th>COLLECTION URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700, color: "#4f46e5" }}>{row.year}</td>
                        <td style={{ fontWeight: 650, color: "#0f172a" }}>{row.make}</td>
                        <td style={{ color: "#334155" }}>{row.model}</td>
                        <td style={{ color: "#4f46e5", fontWeight: 550 }}>{row.collection}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
