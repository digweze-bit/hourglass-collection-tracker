import { Router } from "express";
import { eq, sql, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { locationsTable, artworksTable } from "@workspace/db";

const router = Router();

// GET /locations
router.get("/locations", async (req, res) => {
  const allLocations = await db
    .select({
      id: locationsTable.id,
      name: locationsTable.name,
      parentId: locationsTable.parentId,
      description: locationsTable.description,
      createdAt: locationsTable.createdAt,
      artworkCount: sql<number>`count(${artworksTable.id})`,
    })
    .from(locationsTable)
    .leftJoin(artworksTable, eq(artworksTable.locationId, locationsTable.id))
    .groupBy(locationsTable.id)
    .orderBy(locationsTable.name);

  // Build tree
  const map = new Map<number, typeof allLocations[0] & { children: typeof allLocations }>();
  allLocations.forEach(loc => map.set(loc.id, { ...loc, children: [] }));

  const roots: typeof allLocations & { children?: typeof allLocations }[] = [];
  allLocations.forEach(loc => {
    const node = map.get(loc.id)!;
    if (loc.parentId && map.has(loc.parentId)) {
      map.get(loc.parentId)!.children.push(node as any);
    } else {
      roots.push(node as any);
    }
  });

  res.json(roots.map(r => formatLocation(r as any)));
});

// POST /locations
router.post("/locations", async (req, res) => {
  const { name, parentId, description } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const [row] = await db.insert(locationsTable).values({
    name,
    parentId: parentId ? Number(parentId) : null,
    description: description || null,
  }).returning();
  res.status(201).json({ ...row, artworkCount: 0, children: [], createdAt: row.createdAt.toISOString() });
});

// GET /locations/:id
router.get("/locations/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.select().from(locationsTable).where(eq(locationsTable.id, id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(artworksTable).where(eq(artworksTable.locationId, id));
  res.json({ ...row, artworkCount: Number(countRow.count), children: [], createdAt: row.createdAt.toISOString() });
});

// PATCH /locations/:id
router.patch("/locations/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, parentId, description } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (parentId !== undefined) updates.parentId = parentId ? Number(parentId) : null;
  if (description !== undefined) updates.description = description;
  const [row] = await db.update(locationsTable).set(updates).where(eq(locationsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(artworksTable).where(eq(artworksTable.locationId, id));
  res.json({ ...row, artworkCount: Number(countRow.count), children: [], createdAt: row.createdAt.toISOString() });
});

// DELETE /locations/:id
router.delete("/locations/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(locationsTable).where(eq(locationsTable.id, id));
  res.status(204).send();
});

// GET /locations/:id/artworks
router.get("/locations/:id/artworks", async (req, res) => {
  const id = Number(req.params.id);

  // Get all location IDs in this tree (id + all descendants)
  const allLocations = await db.select().from(locationsTable);
  const locationIds = getDescendantIds(allLocations, id);
  locationIds.push(id);

  const rows = await db
    .select({
      id: artworksTable.id,
      title: artworksTable.title,
      artist: artworksTable.artist,
      year: artworksTable.year,
      medium: artworksTable.medium,
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
    .where(sql`${artworksTable.locationId} = ANY(${locationIds})`);

  res.json(rows.map(r => ({
    ...r,
    width: r.width ? Number(r.width) : null,
    height: r.height ? Number(r.height) : null,
    depth: r.depth ? Number(r.depth) : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  })));
});

function getDescendantIds(locations: { id: number; parentId: number | null }[], parentId: number): number[] {
  const children = locations.filter(l => l.parentId === parentId).map(l => l.id);
  const descendants = children.flatMap(id => getDescendantIds(locations, id));
  return [...children, ...descendants];
}

function formatLocation(loc: { id: number; name: string; parentId: number | null; description: string | null; artworkCount: number; children: typeof loc[]; createdAt: Date | string }): unknown {
  return {
    id: loc.id,
    name: loc.name,
    parentId: loc.parentId,
    description: loc.description,
    artworkCount: Number(loc.artworkCount),
    children: loc.children.map(c => formatLocation(c)),
    createdAt: loc.createdAt instanceof Date ? loc.createdAt.toISOString() : loc.createdAt,
  };
}

export default router;
