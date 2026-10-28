-- CreateTable
CREATE TABLE IF NOT EXISTS "StoreFitmentData" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "collection" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PricingPlan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "maxLimit" INTEGER NOT NULL,
    "planDetails" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "StoreAccess" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "plan" INTEGER NOT NULL DEFAULT 1,
    "planId" TEXT,
    "test" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ImportHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "successRows" INTEGER NOT NULL DEFAULT 0,
    "duplicateRows" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WidgetConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "bgType" TEXT NOT NULL DEFAULT 'color',
    "bgColor" TEXT NOT NULL DEFAULT '#4338ca',
    "bgImage" TEXT NOT NULL DEFAULT '',
    "textColor" TEXT NOT NULL DEFAULT '#ffffff',
    "title" TEXT NOT NULL DEFAULT 'PRODUCT FIT FINDER',
    "subtitle" TEXT NOT NULL DEFAULT 'Explore the Perfect Fit for Your Products',
    "alignment" TEXT NOT NULL DEFAULT 'center',
    "boxPadding" INTEGER NOT NULL DEFAULT 45,
    "yearPlaceholder" TEXT NOT NULL DEFAULT 'SELECT YEAR',
    "makePlaceholder" TEXT NOT NULL DEFAULT 'SELECT MAKE',
    "modelPlaceholder" TEXT NOT NULL DEFAULT 'SELECT MODEL',
    "btnColor" TEXT NOT NULL DEFAULT '#ffffff',
    "btnTextColor" TEXT NOT NULL DEFAULT '#4338ca',
    "submitText" TEXT NOT NULL DEFAULT 'FIND PARTS',
    "borderRadius" INTEGER NOT NULL DEFAULT 12,
    "showResetBtn" BOOLEAN NOT NULL DEFAULT false,
    "resetBtnText" TEXT NOT NULL DEFAULT 'RESET',
    "badgeText" TEXT NOT NULL DEFAULT '',
    "borderStyle" TEXT NOT NULL DEFAULT 'none',
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "FitmentSearchLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StoreFitmentData_shop_year_idx" ON "StoreFitmentData"("shop", "year");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StoreFitmentData_shop_year_make_idx" ON "StoreFitmentData"("shop", "year", "make");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StoreFitmentData_shop_year_make_model_idx" ON "StoreFitmentData"("shop", "year", "make", "model");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "StoreFitmentData_shop_year_make_model_collection_key" ON "StoreFitmentData"("shop", "year", "make", "model", "collection");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "StoreAccess_shop_key" ON "StoreAccess"("shop");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ImportHistory_shop_createdAt_idx" ON "ImportHistory"("shop", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WidgetConfig_shop_key" ON "WidgetConfig"("shop");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FitmentSearchLog_shop_createdAt_idx" ON "FitmentSearchLog"("shop", "createdAt");
