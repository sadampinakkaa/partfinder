import prisma from "../db.server.js";

export const BASIC_PLAN_LIMIT = 100;
export const PREMIUM_PLAN_LIMIT = 999999;

/**
 * Get or initialize store plan info
 */
export async function getStorePlan(shop) {
  let access = await prisma.storeAccess.findUnique({
    where: { shop },
  });

  if (!access) {
    access = await prisma.storeAccess.create({
      data: {
        shop,
        plan: 1, // 1 = Basic Plan (Free)
        test: false,
      },
    });
  }

  const isPaid = access.plan === 2;

  return {
    planNumber: access.plan,
    planId: access.planId || "",
    title: isPaid ? "BASIC PLAN" : "FREE PLAN",
    maxLimit: isPaid ? PREMIUM_PLAN_LIMIT : BASIC_PLAN_LIMIT,
    test: access.test,
  };
}

/**
 * Update store plan after checkout or change
 */
export async function updateStorePlan(shop, planNumber, planId = null, test = false) {
  return prisma.storeAccess.upsert({
    where: { shop },
    update: {
      plan: planNumber,
      planId,
      test,
    },
    create: {
      shop,
      plan: planNumber,
      planId,
      test,
    },
  });
}

/**
 * Get Paginated Fitment Data
 */
export async function getStoreFitmentData(
  shop,
  {
    page = 1,
    limit = 25,
    search = "",
    year = "",
    make = "",
    model = "",
  } = {},
) {
  const where = { shop };

  if (year && year.trim()) {
    where.year = year.trim();
  }

  if (make && make.trim()) {
    where.make = { contains: make.trim() };
  }

  if (model && model.trim()) {
    where.model = { contains: model.trim() };
  }

  if (search && search.trim()) {
    const s = search.trim();
    where.OR = [
      { year: { contains: s } },
      { make: { contains: s } },
      { model: { contains: s } },
      { collection: { contains: s } },
    ];
  }

  const offset = (Math.max(1, page) - 1) * limit;

  const [total, records] = await Promise.all([
    prisma.storeFitmentData.count({ where }),
    prisma.storeFitmentData.findMany({
      where,
      orderBy: { id: "desc" },
      skip: offset,
      take: limit,
    }),
  ]);

  return {
    records,
    total,
    page: Math.max(1, page),
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

// Alias for seamless backward compatibility
export const getStoreYmmData = getStoreFitmentData;

/**
 * Add New Fitment Entry
 */
export async function createFitmentEntry(shop, data) {
  const plan = await getStorePlan(shop);
  const currentCount = await prisma.storeFitmentData.count({ where: { shop } });

  // Plan limit enforcement
  if (plan.planNumber !== 2 && currentCount >= plan.maxLimit) {
    throw new Error(
      `Please select a pricing plan to add more data. Free Plan limit of ${plan.maxLimit} records reached.`,
    );
  }

  const year = String(data.year || "").trim();
  const make = String(data.make || "").trim();
  const model = String(data.model || "").trim();
  const collection = String(data.collection || "").trim();

  if (!year || !make || !model || !collection) {
    throw new Error("All fields (Year, Make, Model, Collection) are required.");
  }

  return prisma.storeFitmentData.upsert({
    where: {
      shop_fitment_record_unique: {
        shop,
        year,
        make,
        model,
        collection,
      },
    },
    update: {},
    create: {
      shop,
      year,
      make,
      model,
      collection,
    },
  });
}
export const createYmmEntry = createFitmentEntry;

/**
 * Edit Existing Fitment Entry
 */
export async function updateFitmentEntry(shop, id, data) {
  const numId = parseInt(id, 10);
  const existing = await prisma.storeFitmentData.findFirst({
    where: { id: numId, shop },
  });

  if (!existing) {
    throw new Error("Record not found.");
  }

  return prisma.storeFitmentData.update({
    where: { id: numId },
    data: {
      year: String(data.year || existing.year).trim(),
      make: String(data.make || existing.make).trim(),
      model: String(data.model || existing.model).trim(),
      collection: String(data.collection || existing.collection).trim(),
    },
  });
}
export const updateYmmEntry = updateFitmentEntry;

/**
 * Delete Single Fitment Entry
 */
export async function deleteFitmentEntry(shop, id) {
  const numId = parseInt(id, 10);
  const existing = await prisma.storeFitmentData.findFirst({
    where: { id: numId, shop },
  });

  if (!existing) {
    throw new Error("Record not found.");
  }

  return prisma.storeFitmentData.delete({
    where: { id: numId },
  });
}
export const deleteYmmEntry = deleteFitmentEntry;

/**
 * Delete Multiple Selected Entries (Bulk Delete)
 * Available for Premium Plan (planNumber == 2)
 */
export async function bulkDeleteFitmentEntries(shop, ids) {
  const plan = await getStorePlan(shop);
  if (plan.planNumber !== 2) {
    throw new Error("Bulk delete is a BASIC PLAN feature. Please upgrade to use Delete Selected Rows.");
  }

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return { count: 0 };
  }

  const numericIds = ids.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));

  return prisma.storeFitmentData.deleteMany({
    where: {
      shop,
      id: { in: numericIds },
    },
  });
}
export const bulkDeleteYmmEntries = bulkDeleteFitmentEntries;

/**
 * Import CSV (Columns: year, make, model, collection)
 */
export async function importCsvData(shop, rows, fileName = "upload.csv") {
  const plan = await getStorePlan(shop);
  const currentCount = await prisma.storeFitmentData.count({ where: { shop } });

  // Check plan limit
  if (plan.planNumber !== 2 && currentCount + rows.length > plan.maxLimit) {
    throw new Error(
      `Error: The number of data (${currentCount + rows.length}) exceeds your Free Plan limit of ${plan.maxLimit} rows. Please select BASIC PLAN to upload unlimited records.`,
    );
  }

  const validRecords = [];
  let invalidCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const year = String(row.year || row.Year || "").trim();
    const make = String(row.make || row.Make || "").trim();
    const model = String(row.model || row.Model || "").trim();
    const collection = String(row.collection || row.Collection || row["collection-url"] || "").trim();

    if (!year || !make || !model || !collection) {
      invalidCount++;
      continue;
    }

    validRecords.push({
      shop,
      year,
      make,
      model,
      collection,
    });
  }

  if (validRecords.length === 0) {
    throw new Error("No valid data rows found in the CSV file.");
  }

  // Batch insert in chunks of 500 for scalability
  const CHUNK_SIZE = 500;
  let successRows = 0;
  let duplicateRows = 0;

  for (let i = 0; i < validRecords.length; i += CHUNK_SIZE) {
    const chunk = validRecords.slice(i, i + CHUNK_SIZE);
    try {
      const result = await prisma.storeFitmentData.createMany({
        data: chunk,
      });
      successRows += result.count;
      duplicateRows += chunk.length - result.count;
    } catch (e) {
      // Row by row fallback
      for (const rec of chunk) {
        try {
          await prisma.storeFitmentData.create({ data: rec });
          successRows++;
        } catch (err) {
          duplicateRows++;
        }
      }
    }
  }

  await prisma.importHistory.create({
    data: {
      shop,
      fileName,
      totalRows: rows.length,
      successRows,
      duplicateRows,
      status: "COMPLETED",
    },
  });

  return {
    total: rows.length,
    successRows,
    duplicateRows,
    invalidCount,
  };
}

/**
 * Export CSV
 */
export async function exportCsvData(shop) {
  return prisma.storeFitmentData.findMany({
    where: { shop },
    orderBy: [{ year: "desc" }, { make: "asc" }, { model: "asc" }],
  });
}

/**
 * Storefront Dropdown Lookups
 */
export async function getDistinctYears(shop) {
  const years = await prisma.storeFitmentData.findMany({
    where: { shop },
    select: { year: true },
    distinct: ["year"],
    orderBy: { year: "desc" },
  });
  return years.map((y) => y.year);
}

export async function getDistinctMakes(shop, year) {
  const where = { shop };
  if (year) where.year = String(year).trim();

  const makes = await prisma.storeFitmentData.findMany({
    where,
    select: { make: true },
    distinct: ["make"],
    orderBy: { make: "asc" },
  });
  return makes.map((m) => m.make);
}

export async function getDistinctModels(shop, year, make) {
  const where = { shop };
  if (year) where.year = String(year).trim();
  if (make) where.make = String(make).trim();

  const models = await prisma.storeFitmentData.findMany({
    where,
    select: { model: true },
    distinct: ["model"],
    orderBy: { model: "asc" },
  });
  return models.map((m) => m.model);
}

export async function getMatchingCollection(shop, { year, make, model }) {
  if (!year || !make || !model) return null;

  const match = await prisma.storeFitmentData.findFirst({
    where: {
      shop,
      year: String(year).trim(),
      make: String(make).trim(),
      model: String(model).trim(),
    },
    select: { collection: true },
  });

  return match ? match.collection : null;
}

/**
 * Get or initialize Widget Customization Config
 */
export async function getWidgetConfig(shop) {
  let config = await prisma.widgetConfig.findUnique({
    where: { shop },
  });

  if (!config) {
    config = await prisma.widgetConfig.create({
      data: {
        shop,
        bgType: "color",
        bgColor: "#4338ca",
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
      },
    });
  }

  return config;
}

/**
 * Track Fitment Search (Storefront Analytics)
 */
export async function trackFitmentSearch(shop, { year, make, model }) {
  if (!shop || !year || !make || !model) return null;
  try {
    return await prisma.fitmentSearchLog.create({
      data: {
        shop,
        year: String(year).trim(),
        make: String(make).trim(),
        model: String(model).trim(),
      },
    });
  } catch (err) {
    console.warn("Could not log fitment search:", err.message);
    return null;
  }
}

/**
 * Get SaaS Fitment Analytics & KPIs
 */
export async function getFitmentAnalytics(shop) {
  try {
    const [totalSearches, recentSearches, totalRecords, uniqueMakes] = await Promise.all([
      prisma.fitmentSearchLog.count({ where: { shop } }),
      prisma.fitmentSearchLog.findMany({
        where: { shop },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.storeFitmentData.count({ where: { shop } }),
      prisma.storeFitmentData.findMany({
        where: { shop },
        select: { make: true },
        distinct: ["make"],
      }),
    ]);

    return {
      totalSearches,
      recentSearches,
      totalRecords,
      makesCount: uniqueMakes.length,
    };
  } catch (e) {
    return {
      totalSearches: 0,
      recentSearches: [],
      totalRecords: 0,
      makesCount: 0,
    };
  }
}

/**
 * Save Widget Customization Config
 */
export async function saveWidgetConfig(shop, data) {
  const showResetBtn =
    data.showResetBtn === true ||
    data.showResetBtn === "true" ||
    data.showResetBtn === "on" ||
    data.showResetBtn === 1;

  const payload = {
    bgType: data.bgType || "color",
    bgColor: data.bgColor || "#4338ca",
    bgImage: data.bgImage || "",
    textColor: data.textColor || "#ffffff",
    title: data.title || "PRODUCT FIT FINDER",
    subtitle: data.subtitle || "",
    alignment: data.alignment || "center",
    boxPadding: parseInt(data.boxPadding, 10) || 45,
    yearPlaceholder: data.yearPlaceholder || "SELECT YEAR",
    makePlaceholder: data.makePlaceholder || "SELECT MAKE",
    modelPlaceholder: data.modelPlaceholder || "SELECT MODEL",
    btnColor: data.btnColor || "#ffffff",
    btnTextColor: data.btnTextColor || "#4338ca",
    submitText: data.submitText || "FIND PRODUCTS",
    borderRadius: parseInt(data.borderRadius, 10) || 12,
    showResetBtn,
    resetBtnText: data.resetBtnText || "RESET",
    badgeText: data.badgeText || "",
    borderStyle: data.borderStyle || "none",
  };

  return prisma.widgetConfig.upsert({
    where: { shop },
    update: payload,
    create: {
      shop,
      ...payload,
    },
  });
}

/**
 * Synchronize store subscription with Shopify App Pricing (Managed Pricing)
 */
export async function syncStoreSubscription(admin, shop) {
  try {
    const response = await admin.graphql(`
      query getAppSubscriptions {
        currentAppInstallation {
          activeSubscriptions {
            id
            name
            status
            test
          }
        }
      }
    `);
    const resData = await response.json();
    const subs = resData?.data?.currentAppInstallation?.activeSubscriptions || [];
    const activeSub = subs.find(
      (s) => s.status === "ACTIVE" || s.status === "ACCEPTED",
    );

    if (
      activeSub &&
      (activeSub.name === "basic-plan" ||
        activeSub.name?.toLowerCase().includes("basic"))
    ) {
      await updateStorePlan(shop, 2, activeSub.id, Boolean(activeSub.test));
      return { planNumber: 2, sub: activeSub };
    } else if (
      activeSub &&
      (activeSub.name === "free" ||
        activeSub.name?.toLowerCase().includes("free"))
    ) {
      await updateStorePlan(shop, 1, activeSub.id, Boolean(activeSub.test));
      return { planNumber: 1, sub: activeSub };
    } else if (!activeSub) {
      const current = await getStorePlan(shop);
      if (current.planNumber === 2 && !current.test) {
        await updateStorePlan(shop, 1, null, false);
      }
    }
  } catch (err) {
    console.log("[syncStoreSubscription] note:", err?.message || err);
  }
  return null;
}
