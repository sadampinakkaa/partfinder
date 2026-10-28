import {
  getDistinctYears,
  getDistinctMakes,
  getDistinctModels,
  getMatchingCollection,
  getStoreFitmentData,
  getWidgetConfig,
  trackFitmentSearch,
} from "../models/fit-finder.server.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, ngrok-skip-browser-warning",
};

export const loader = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(request.url);
  const shopParam = url.searchParams.get("shop");
  const action = url.searchParams.get("action") || "";

  if (!shopParam) {
    return Response.json(
      { error: "Store not found" },
      { status: 400, headers: corsHeaders },
    );
  }

  const shop = shopParam.includes(".") ? shopParam : `${shopParam}.myshopify.com`;
  const format = url.searchParams.get("format") || "json";

  try {
    switch (action) {
      case "init": {
        const [years, widgetConfig] = await Promise.all([
          getDistinctYears(shop),
          getWidgetConfig(shop),
        ]);
        return Response.json(
          {
            success: true,
            config: widgetConfig,
            widgetConfig,
            years,
          },
          {
            headers: {
              ...corsHeaders,
              "Cache-Control": "no-cache, no-store, must-revalidate",
            },
          },
        );
      }

      case "get_config":
      case "config": {
        const widgetConfig = await getWidgetConfig(shop);
        return Response.json(
          {
            success: true,
            config: widgetConfig,
            widgetConfig,
          },
          {
            headers: {
              ...corsHeaders,
              "Cache-Control": "no-cache, no-store, must-revalidate",
            },
          },
        );
      }

      case "get_year":
      case "years": {
        const years = await getDistinctYears(shop);
        if (format === "html") {
          const html = years.map((y) => `<option value="${y}">${y}</option>`).join("");
          return new Response(html, {
            headers: {
              ...corsHeaders,
              "Content-Type": "text/html",
              "Cache-Control": "public, max-age=120, s-maxage=300",
            },
          });
        }
        return Response.json(
          { success: true, years },
          { headers: { ...corsHeaders, "Cache-Control": "public, max-age=120, s-maxage=300" } },
        );
      }

      case "get_make":
      case "makes": {
        const year = url.searchParams.get("year");
        const makes = await getDistinctMakes(shop, year);
        if (format === "html") {
          const html = makes.map((m) => `<option value="${m}">${m}</option>`).join("");
          return new Response(html, {
            headers: {
              ...corsHeaders,
              "Content-Type": "text/html",
              "Cache-Control": "public, max-age=120, s-maxage=300",
            },
          });
        }
        return Response.json(
          { success: true, makes },
          { headers: { ...corsHeaders, "Cache-Control": "public, max-age=120, s-maxage=300" } },
        );
      }

      case "get_model":
      case "models": {
        const year = url.searchParams.get("year");
        const make = url.searchParams.get("make");
        const models = await getDistinctModels(shop, year, make);
        if (format === "html") {
          const html = models.map((m) => `<option value="${m}">${m}</option>`).join("");
          return new Response(html, {
            headers: {
              ...corsHeaders,
              "Content-Type": "text/html",
              "Cache-Control": "public, max-age=120, s-maxage=300",
            },
          });
        }
        return Response.json(
          { success: true, models },
          { headers: { ...corsHeaders, "Cache-Control": "public, max-age=120, s-maxage=300" } },
        );
      }

      case "get_coll":
      case "collection": {
        const year = url.searchParams.get("year");
        const make = url.searchParams.get("make");
        const model = url.searchParams.get("model");
        const collection = await getMatchingCollection(shop, { year, make, model });

        // Auto-log search query for merchant analytics
        if (year && make && model) {
          trackFitmentSearch(shop, { year, make, model }).catch(() => {});
        }

        if (format === "html" || format === "text") {
          return new Response(collection || "", {
            headers: { ...corsHeaders, "Content-Type": "text/plain" },
          });
        }
        return Response.json(
          { success: true, collection: collection || null },
          { headers: corsHeaders },
        );
      }

      case "track_search": {
        const year = url.searchParams.get("year");
        const make = url.searchParams.get("make");
        const model = url.searchParams.get("model");
        if (year && make && model) {
          await trackFitmentSearch(shop, { year, make, model }).catch(() => {});
        }
        return Response.json({ success: true }, { headers: corsHeaders });
      }

      default: {
        const [years, widgetConfig, { records }] = await Promise.all([
          getDistinctYears(shop),
          getWidgetConfig(shop),
          getStoreFitmentData(shop, { page: 1, limit: 1000 }),
        ]);

        return Response.json(
          {
            success: true,
            config: widgetConfig,
            widgetConfig,
            years,
            records,
            data: records,
          },
          {
            headers: {
              ...corsHeaders,
              "Cache-Control": "public, max-age=60, s-maxage=120",
            },
          },
        );
      }
    }
  } catch (err) {
    console.error("Storefront fit-finder API Error:", err);
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    );
  }
};
