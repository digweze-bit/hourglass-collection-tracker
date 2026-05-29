import { Router } from "express";
import { eq, ilike, and, gte, lte, sql, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  artworksTable,
  locationsTable,
  provenanceTable,
  conditionReportsTable,
  documentsTable,
  pricingTable,
  loansTable,
} from "@workspace/db";

const router = Router();

// GET /artworks
router.get("/artworks", async (req, res) => {
  const { locationId, artist, medium, onLoan, search, yearFrom, yearTo } = req.query;

  const conditions: ReturnType<typeof eq>[] = [];

  if (locationId) conditions.push(eq(artworksTable.locationId, Number(locationId)));
  if (artist) conditions.push(ilike(artworksTable.artist, `%${artist}%`));
  if (medium) conditions.push(ilike(artworksTable.medium, `%${medium}%`));
  if (onLoan !== undefined) conditions.push(eq(artworksTable.onLoan, onLoan === "true"));
  if (yearFrom) conditions.push(gte(artworksTable.year, Number(yearFrom)));
  if (yearTo) conditions.push(lte(artworksTable.year, Number(yearTo)));

  let query = db
    .select({
      id: artworksTable.id,
      title: artworksTable.title,
      artist: artworksTable.artist,
      year: artworksTable.year,
      medium: artworksTable.medium,
      keywords: artworksTable.keywords,
      width: artworksTable.width,
      height: artworksTable.height,
      depth: artworksTable.depth,
      dimensionUnit: artworksTable.dimensionUnit,
      imageUrl: artworksTable.imageUrl,
      notes: artworksTable.notes,
      locationId: artworksTable.locationId,
      locationName: locationsTable.name,
      onLoan: artworksTable.onLoan,
      createdAt: artworksTable.createdAt,
      updatedAt: artworksTable.updatedAt,
    })
    .from(artworksTable)
    .leftJoin(locationsTable, eq(artworksTable.locationId, locationsTable.id));

  if (search) {
    const s = `%${search}%`;
    conditions.push(sql`(${artworksTable.title} ILIKE ${s} OR ${artworksTable.artist} ILIKE ${s})` as any);
  }

  const rows = conditions.length > 0
    ? await query.where(and(...conditions)).orderBy(desc(artworksTable.createdAt))
    : await query.orderBy(desc(artworksTable.createdAt));

  res.json(rows.map(r => ({
    ...r,
    width: r.width ? Number(r.width) : null,
    height: r.height ? Number(r.height) : null,
    depth: r.depth ? Number(r.depth) : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  })));
});

// GET /artworks/keywords
router.get("/artworks/keywords", async (req, res) => {
  const rows = await db
    .select({ keywords: artworksTable.keywords })
    .from(artworksTable)
    .where(sql`${artworksTable.keywords} is not null and ${artworksTable.keywords} <> ''`);

  const counts: Record<string, number> = {};
  for (const row of rows) {
    if (!row.keywords) continue;
    for (const kw of row.keywords.split(",").map(k => k.trim().toLowerCase()).filter(Boolean)) {
      counts[kw] = (counts[kw] ?? 0) + 1;
    }
  }

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([kw]) => kw);

  res.json(sorted);
});

// GET /artworks/summary
router.get("/artworks/summary", async (req, res) => {
  const [totalRow] = await db.select({ count: sql<number>`count(*)` }).from(artworksTable);
  const [loanRow] = await db.select({ count: sql<number>`count(*)` }).from(artworksTable).where(eq(artworksTable.onLoan, true));
  const [valueRow] = await db.select({ total: sql<number>`sum(current_value_usd)` }).from(pricingTable);

  const byMediumRows = await db
    .select({ medium: artworksTable.medium, count: sql<number>`count(*)` })
    .from(artworksTable)
    .groupBy(artworksTable.medium)
    .orderBy(desc(sql`count(*)`));

  const byLocationRows = await db
    .select({
      locationId: locationsTable.id,
      locationName: locationsTable.name,
      count: sql<number>`count(*)`,
    })
    .from(artworksTable)
    .innerJoin(locationsTable, eq(artworksTable.locationId, locationsTable.id))
    .groupBy(locationsTable.id, locationsTable.name)
    .orderBy(desc(sql`count(*)`));

  const recentRows = await db
    .select({
      id: artworksTable.id,
      title: artworksTable.title,
      artist: artworksTable.artist,
      year: artworksTable.year,
      medium: artworksTable.medium,
      keywords: artworksTable.keywords,
      width: artworksTable.width,
      height: artworksTable.height,
      depth: artworksTable.depth,
      dimensionUnit: artworksTable.dimensionUnit,
      imageUrl: artworksTable.imageUrl,
      notes: artworksTable.notes,
      locationId: artworksTable.locationId,
      locationName: locationsTable.name,
      onLoan: artworksTable.onLoan,
      createdAt: artworksTable.createdAt,
      updatedAt: artworksTable.updatedAt,
    })
    .from(artworksTable)
    .leftJoin(locationsTable, eq(artworksTable.locationId, locationsTable.id))
    .orderBy(desc(artworksTable.createdAt))
    .limit(8);

  res.json({
    totalArtworks: Number(totalRow.count),
    onLoanCount: Number(loanRow.count),
    totalCurrentValueUsd: valueRow.total ? Number(valueRow.total) : null,
    byMedium: byMediumRows.map(r => ({ medium: r.medium || "Unspecified", count: Number(r.count) })),
    byLocation: byLocationRows.map(r => ({ locationId: r.locationId, locationName: r.locationName, count: Number(r.count) })),
    recentlyAdded: recentRows.map(r => ({
      ...r,
      width: r.width ? Number(r.width) : null,
      height: r.height ? Number(r.height) : null,
      depth: r.depth ? Number(r.depth) : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
  });
});

// POST /artworks
router.post("/artworks", async (req, res) => {
  const { title, artist, year, medium, keywords, width, height, depth, dimensionUnit, imageUrl, notes, locationId } = req.body;
  if (!title) { res.status(400).json({ error: "title is required" }); return; }

  const [row] = await db.insert(artworksTable).values({
    title,
    artist: artist || null,
    year: year ? Number(year) : null,
    medium: medium || null,
    keywords: keywords || null,
    width: width ? String(width) : null,
    height: height ? String(height) : null,
    depth: depth ? String(depth) : null,
    dimensionUnit: dimensionUnit || "cm",
    imageUrl: imageUrl || null,
    notes: notes || null,
    locationId: locationId ? Number(locationId) : null,
  }).returning();

  const [loc] = locationId ? await db.select().from(locationsTable).where(eq(locationsTable.id, Number(locationId))) : [null];

  res.status(201).json({
    ...row,
    width: row.width ? Number(row.width) : null,
    height: row.height ? Number(row.height) : null,
    depth: row.depth ? Number(row.depth) : null,
    locationName: loc?.name || null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
});

// GET /artworks/:id
router.get("/artworks/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [artwork] = await db
    .select({
      id: artworksTable.id,
      title: artworksTable.title,
      artist: artworksTable.artist,
      year: artworksTable.year,
      medium: artworksTable.medium,
      keywords: artworksTable.keywords,
      width: artworksTable.width,
      height: artworksTable.height,
      depth: artworksTable.depth,
      dimensionUnit: artworksTable.dimensionUnit,
      imageUrl: artworksTable.imageUrl,
      notes: artworksTable.notes,
      locationId: artworksTable.locationId,
      locationName: locationsTable.name,
      onLoan: artworksTable.onLoan,
      createdAt: artworksTable.createdAt,
      updatedAt: artworksTable.updatedAt,
    })
    .from(artworksTable)
    .leftJoin(locationsTable, eq(artworksTable.locationId, locationsTable.id))
    .where(eq(artworksTable.id, id));

  if (!artwork) { res.status(404).json({ error: "Artwork not found" }); return; }

  const [provenance, conditionReports, documents, pricingRows, loans] = await Promise.all([
    db.select().from(provenanceTable).where(eq(provenanceTable.artworkId, id)).orderBy(desc(provenanceTable.createdAt)),
    db.select().from(conditionReportsTable).where(eq(conditionReportsTable.artworkId, id)).orderBy(desc(conditionReportsTable.createdAt)),
    db.select().from(documentsTable).where(eq(documentsTable.artworkId, id)).orderBy(desc(documentsTable.createdAt)),
    db.select().from(pricingTable).where(eq(pricingTable.artworkId, id)),
    db.select().from(loansTable).where(and(eq(loansTable.artworkId, id), eq(loansTable.status, "active"))),
  ]);

  const pricing = pricingRows[0] || null;
  const now = new Date();

  res.json({
    ...artwork,
    width: artwork.width ? Number(artwork.width) : null,
    height: artwork.height ? Number(artwork.height) : null,
    depth: artwork.depth ? Number(artwork.depth) : null,
    createdAt: artwork.createdAt.toISOString(),
    updatedAt: artwork.updatedAt.toISOString(),
    provenance: provenance.map(p => ({
      ...p,
      price: p.price ? Number(p.price) : null,
      createdAt: p.createdAt.toISOString(),
    })),
    conditionReports: conditionReports.map(c => ({ ...c, createdAt: c.createdAt.toISOString() })),
    documents: documents.map(d => ({ ...d, createdAt: d.createdAt.toISOString() })),
    pricing: pricing ? {
      ...pricing,
      purchasePrice: pricing.purchasePrice ? Number(pricing.purchasePrice) : null,
      usdConversionRate: pricing.usdConversionRate ? Number(pricing.usdConversionRate) : null,
      purchasePriceUsd: pricing.purchasePriceUsd ? Number(pricing.purchasePriceUsd) : null,
      shippingCost: pricing.shippingCost ? Number(pricing.shippingCost) : null,
      taxesCost: pricing.taxesCost ? Number(pricing.taxesCost) : null,
      otherCosts: pricing.otherCosts ? Number(pricing.otherCosts) : null,
      totalPurchaseValueUsd: pricing.totalPurchaseValueUsd ? Number(pricing.totalPurchaseValueUsd) : null,
      currentValueUsd: pricing.currentValueUsd ? Number(pricing.currentValueUsd) : null,
      createdAt: pricing.createdAt.toISOString(),
      updatedAt: pricing.updatedAt.toISOString(),
    } : null,
    activeLoans: loans.map(l => ({
      ...l,
      daysUntilReturn: l.endDate ? Math.ceil((new Date(l.endDate).getTime() - now.getTime()) / 86400000) : null,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    })),
  });
});

// PATCH /artworks/:id
router.patch("/artworks/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { title, artist, year, medium, keywords, width, height, depth, dimensionUnit, imageUrl, notes, locationId } = req.body;

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (artist !== undefined) updates.artist = artist;
  if (year !== undefined) updates.year = year ? Number(year) : null;
  if (medium !== undefined) updates.medium = medium;
  if (keywords !== undefined) updates.keywords = keywords || null;
  if (width !== undefined) updates.width = width ? String(width) : null;
  if (height !== undefined) updates.height = height ? String(height) : null;
  if (depth !== undefined) updates.depth = depth ? String(depth) : null;
  if (dimensionUnit !== undefined) updates.dimensionUnit = dimensionUnit;
  if (imageUrl !== undefined) updates.imageUrl = imageUrl;
  if (notes !== undefined) updates.notes = notes;
  if (locationId !== undefined) updates.locationId = locationId ? Number(locationId) : null;

  const [updated] = await db.update(artworksTable).set(updates).where(eq(artworksTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Artwork not found" }); return; }

  const locId = updated.locationId;
  const [loc] = locId ? await db.select().from(locationsTable).where(eq(locationsTable.id, locId)) : [null];

  res.json({
    ...updated,
    width: updated.width ? Number(updated.width) : null,
    height: updated.height ? Number(updated.height) : null,
    depth: updated.depth ? Number(updated.depth) : null,
    locationName: loc?.name || null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

// DELETE /artworks/:id
router.delete("/artworks/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [deleted] = await db.delete(artworksTable).where(eq(artworksTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Artwork not found" }); return; }
  res.status(204).send();
});

// ---- PROVENANCE ----

router.get("/artworks/:id/provenance", async (req, res) => {
  const id = Number(req.params.id);
  const rows = await db.select().from(provenanceTable).where(eq(provenanceTable.artworkId, id)).orderBy(desc(provenanceTable.createdAt));
  res.json(rows.map(r => ({ ...r, price: r.price ? Number(r.price) : null, createdAt: r.createdAt.toISOString() })));
});

router.post("/artworks/:id/provenance", async (req, res) => {
  const artworkId = Number(req.params.id);
  const { date, description, source, price, currency } = req.body;
  const [row] = await db.insert(provenanceTable).values({
    artworkId,
    date: date || null,
    description: description || null,
    source: source || null,
    price: price ? String(price) : null,
    currency: currency || null,
  }).returning();
  res.status(201).json({ ...row, price: row.price ? Number(row.price) : null, createdAt: row.createdAt.toISOString() });
});

router.patch("/artworks/:id/provenance/:provenanceId", async (req, res) => {
  const provenanceId = Number(req.params.provenanceId);
  const { date, description, source, price, currency } = req.body;
  const updates: Record<string, unknown> = {};
  if (date !== undefined) updates.date = date;
  if (description !== undefined) updates.description = description;
  if (source !== undefined) updates.source = source;
  if (price !== undefined) updates.price = price ? String(price) : null;
  if (currency !== undefined) updates.currency = currency;
  const [row] = await db.update(provenanceTable).set(updates).where(eq(provenanceTable.id, provenanceId)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, price: row.price ? Number(row.price) : null, createdAt: row.createdAt.toISOString() });
});

router.delete("/artworks/:id/provenance/:provenanceId", async (req, res) => {
  const provenanceId = Number(req.params.provenanceId);
  await db.delete(provenanceTable).where(eq(provenanceTable.id, provenanceId));
  res.status(204).send();
});

// ---- CONDITION REPORTS ----

router.get("/artworks/:id/condition-reports", async (req, res) => {
  const id = Number(req.params.id);
  const rows = await db.select().from(conditionReportsTable).where(eq(conditionReportsTable.artworkId, id)).orderBy(desc(conditionReportsTable.createdAt));
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/artworks/:id/condition-reports", async (req, res) => {
  const artworkId = Number(req.params.id);
  const { date, condition, notes, inspector } = req.body;
  const [row] = await db.insert(conditionReportsTable).values({
    artworkId,
    date: date || null,
    condition: condition || null,
    notes: notes || null,
    inspector: inspector || null,
  }).returning();
  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
});

// ---- DOCUMENTS ----

router.get("/artworks/:id/documents", async (req, res) => {
  const id = Number(req.params.id);
  const rows = await db.select().from(documentsTable).where(eq(documentsTable.artworkId, id)).orderBy(desc(documentsTable.createdAt));
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/artworks/:id/documents", async (req, res) => {
  const artworkId = Number(req.params.id);
  const { name, type, url, fileSize } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const [row] = await db.insert(documentsTable).values({
    artworkId,
    name,
    type: type || null,
    url: url || null,
    fileSize: fileSize ? Number(fileSize) : null,
  }).returning();
  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.delete("/artworks/:id/documents/:documentId", async (req, res) => {
  const documentId = Number(req.params.documentId);
  await db.delete(documentsTable).where(eq(documentsTable.id, documentId));
  res.status(204).send();
});

// ---- PRICING ----

router.get("/artworks/:id/pricing", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.select().from(pricingTable).where(eq(pricingTable.artworkId, id));
  if (!row) { res.status(404).json({ error: "No pricing data" }); return; }
  res.json(formatPricing(row));
});

router.put("/artworks/:id/pricing", async (req, res) => {
  const artworkId = Number(req.params.id);
  const {
    purchasePrice, purchaseCurrency, usdConversionRate,
    framingCost, framingCurrency, framingUsdRate,
    shippingCost, shippingCurrency, shippingUsdRate,
    taxesCost, taxesCurrency, taxesUsdRate,
    otherCosts, otherCostsDescription, otherCurrency, otherUsdRate,
    displayCurrency, displayCurrencyRate,
    currentValueUsd, valuationDate, valuationNotes,
  } = req.body;

  const toUsd = (amount: unknown, rate: unknown, currency: unknown): number => {
    if (!amount) return 0;
    if (currency === "USD") return Number(amount);
    if (rate) return Number(amount) * Number(rate);
    return 0;
  };

  const purchasePriceUsd = toUsd(purchasePrice, usdConversionRate, purchaseCurrency) || null;
  const framingUsd = toUsd(framingCost, framingUsdRate, framingCurrency);
  const shippingUsd = toUsd(shippingCost, shippingUsdRate, shippingCurrency);
  const taxesUsd = toUsd(taxesCost, taxesUsdRate, taxesCurrency);
  const otherUsd = toUsd(otherCosts, otherUsdRate, otherCurrency);

  const totalPurchaseValueUsd = (purchasePriceUsd !== null || framingUsd || shippingUsd || taxesUsd || otherUsd)
    ? (purchasePriceUsd ?? 0) + framingUsd + shippingUsd + taxesUsd + otherUsd
    : null;

  const totalCostInCurrency = totalPurchaseValueUsd !== null && displayCurrencyRate
    ? totalPurchaseValueUsd * Number(displayCurrencyRate)
    : (totalPurchaseValueUsd !== null && displayCurrency === "USD" ? totalPurchaseValueUsd : null);

  const n = (v: unknown) => (v ? String(v) : null);

  const values = {
    artworkId,
    purchasePrice: n(purchasePrice),
    purchaseCurrency: purchaseCurrency || null,
    usdConversionRate: n(usdConversionRate),
    purchasePriceUsd: purchasePriceUsd !== null ? String(purchasePriceUsd) : null,
    framingCost: n(framingCost),
    framingCurrency: framingCurrency || null,
    framingUsdRate: n(framingUsdRate),
    shippingCost: n(shippingCost),
    shippingCurrency: shippingCurrency || null,
    shippingUsdRate: n(shippingUsdRate),
    taxesCost: n(taxesCost),
    taxesCurrency: taxesCurrency || null,
    taxesUsdRate: n(taxesUsdRate),
    otherCosts: n(otherCosts),
    otherCostsDescription: otherCostsDescription || null,
    otherCurrency: otherCurrency || null,
    otherUsdRate: n(otherUsdRate),
    displayCurrency: displayCurrency || null,
    displayCurrencyRate: n(displayCurrencyRate),
    totalPurchaseValueUsd: totalPurchaseValueUsd !== null ? String(totalPurchaseValueUsd) : null,
    totalCostInCurrency: totalCostInCurrency !== null ? String(totalCostInCurrency) : null,
    currentValueUsd: n(currentValueUsd),
    valuationDate: valuationDate || null,
    valuationNotes: valuationNotes || null,
  };

  const existing = await db.select().from(pricingTable).where(eq(pricingTable.artworkId, artworkId));
  let row;
  if (existing.length > 0) {
    [row] = await db.update(pricingTable).set(values).where(eq(pricingTable.artworkId, artworkId)).returning();
  } else {
    [row] = await db.insert(pricingTable).values(values).returning();
  }

  res.json(formatPricing(row));
});

function formatPricing(row: typeof pricingTable.$inferSelect) {
  const num = (v: string | null) => (v ? Number(v) : null);
  return {
    ...row,
    purchasePrice: num(row.purchasePrice),
    usdConversionRate: num(row.usdConversionRate),
    purchasePriceUsd: num(row.purchasePriceUsd),
    framingCost: num(row.framingCost),
    framingUsdRate: num(row.framingUsdRate),
    shippingCost: num(row.shippingCost),
    shippingUsdRate: num(row.shippingUsdRate),
    taxesCost: num(row.taxesCost),
    taxesUsdRate: num(row.taxesUsdRate),
    otherCosts: num(row.otherCosts),
    otherUsdRate: num(row.otherUsdRate),
    displayCurrencyRate: num(row.displayCurrencyRate),
    totalPurchaseValueUsd: num(row.totalPurchaseValueUsd),
    totalCostInCurrency: num(row.totalCostInCurrency),
    currentValueUsd: num(row.currentValueUsd),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ---- LOANS (per artwork) ----

const now = () => new Date();

router.get("/artworks/:id/loans", async (req, res) => {
  const id = Number(req.params.id);
  const rows = await db.select().from(loansTable).where(eq(loansTable.artworkId, id)).orderBy(desc(loansTable.createdAt));
  res.json(rows.map(l => formatLoan(l)));
});

router.post("/artworks/:id/loans", async (req, res) => {
  const artworkId = Number(req.params.id);
  const { loanee, institution, purpose, startDate, endDate, notes } = req.body;
  const [row] = await db.insert(loansTable).values({
    artworkId,
    loanee: loanee || null,
    institution: institution || null,
    purpose: purpose || null,
    startDate: startDate || null,
    endDate: endDate || null,
    status: "active",
    notes: notes || null,
  }).returning();

  // Mark artwork as on loan
  await db.update(artworksTable).set({ onLoan: true }).where(eq(artworksTable.id, artworkId));

  res.status(201).json(formatLoan(row));
});

router.patch("/artworks/:id/loans/:loanId", async (req, res) => {
  const loanId = Number(req.params.loanId);
  const artworkId = Number(req.params.id);
  const { loanee, institution, purpose, startDate, endDate, status, notes } = req.body;

  const updates: Record<string, unknown> = {};
  if (loanee !== undefined) updates.loanee = loanee;
  if (institution !== undefined) updates.institution = institution;
  if (purpose !== undefined) updates.purpose = purpose;
  if (startDate !== undefined) updates.startDate = startDate;
  if (endDate !== undefined) updates.endDate = endDate;
  if (status !== undefined) updates.status = status;
  if (notes !== undefined) updates.notes = notes;

  const [row] = await db.update(loansTable).set(updates).where(eq(loansTable.id, loanId)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  // Update artwork onLoan flag
  if (status === "returned") {
    const activeLoans = await db.select().from(loansTable).where(and(eq(loansTable.artworkId, artworkId), eq(loansTable.status, "active")));
    if (activeLoans.length === 0) {
      await db.update(artworksTable).set({ onLoan: false }).where(eq(artworksTable.id, artworkId));
    }
  }

  res.json(formatLoan(row));
});

router.delete("/artworks/:id/loans/:loanId", async (req, res) => {
  const loanId = Number(req.params.loanId);
  await db.delete(loansTable).where(eq(loansTable.id, loanId));
  res.status(204).send();
});

function formatLoan(loan: typeof loansTable.$inferSelect) {
  const n = now();
  return {
    ...loan,
    daysUntilReturn: loan.endDate ? Math.ceil((new Date(loan.endDate).getTime() - n.getTime()) / 86400000) : null,
    createdAt: loan.createdAt.toISOString(),
    updatedAt: loan.updatedAt.toISOString(),
  };
}

export default router;
