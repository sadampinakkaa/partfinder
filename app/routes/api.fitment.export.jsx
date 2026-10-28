import { authenticate } from "../shopify.server.js";
import { exportCsvData } from "../models/fit-finder.server.js";

function escapeCsv(str) {
  if (str === null || str === undefined) return "";
  const s = String(str);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const records = await exportCsvData(shop);

  const headers = "year,make,model,collection";
  const rows = records.map((r) =>
    [escapeCsv(r.year), escapeCsv(r.make), escapeCsv(r.model), escapeCsv(r.collection)].join(","),
  );

  const csvContent = [headers, ...rows].join("\r\n");
  const fileName = `fitment-data-${shop.split(".")[0]}.csv`;

  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
};
