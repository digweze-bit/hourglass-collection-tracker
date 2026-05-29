import { Router } from "express";
import { eq, sql, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { goalsTable, artworksTable, pricingTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

// GET /goals
router.get("/goals", async (req, res) => {
  const rows = await db.select().from(goalsTable).orderBy(desc(goalsTable.createdAt));
  res.json(rows.map(r => ({
    ...r,
    lastAnalysisAt: r.lastAnalysisAt ? r.lastAnalysisAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  })));
});

// POST /goals
router.post("/goals", async (req, res) => {
  const { title, description } = req.body;
  if (!title) { res.status(400).json({ error: "title is required" }); return; }

  const [row] = await db.insert(goalsTable).values({ title, description: description || null }).returning();
  res.status(201).json({
    ...row,
    lastAnalysisAt: null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
});

// DELETE /goals/:id
router.delete("/goals/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(goalsTable).where(eq(goalsTable.id, id));
  res.status(204).end();
});

// POST /goals/:id/analyze
router.post("/goals/:id/analyze", async (req, res) => {
  const id = Number(req.params.id);
  const [goal] = await db.select().from(goalsTable).where(eq(goalsTable.id, id));
  if (!goal) { res.status(404).json({ error: "Goal not found" }); return; }

  // Gather collection stats for AI context
  const [totalRow] = await db.select({ count: sql<number>`count(*)` }).from(artworksTable);
  const [valueRow] = await db.select({ total: sql<number>`sum(current_value_usd)` }).from(pricingTable);

  const byMedium = await db
    .select({ medium: artworksTable.medium, count: sql<number>`count(*)` })
    .from(artworksTable)
    .groupBy(artworksTable.medium)
    .orderBy(desc(sql`count(*)`));

  // Fetch all artworks with keywords to build frequency table
  const allArtworks = await db
    .select({ keywords: artworksTable.keywords })
    .from(artworksTable);

  const totalArtworks = Number(totalRow.count);
  const totalValueUsd = valueRow.total ? Number(valueRow.total) : null;

  // Build keyword frequency map
  const keywordCounts: Record<string, number> = {};
  for (const row of allArtworks) {
    if (!row.keywords) continue;
    const kws = row.keywords.split(",").map(k => k.trim().toLowerCase()).filter(Boolean);
    for (const kw of kws) {
      keywordCounts[kw] = (keywordCounts[kw] ?? 0) + 1;
    }
  }

  const sortedKeywords = Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  const keywordBreakdown = sortedKeywords.length > 0
    ? sortedKeywords
        .map(([kw, count]) => `"${kw}": ${count} artwork${count !== 1 ? "s" : ""} (${totalArtworks ? Math.round((count / totalArtworks) * 100) : 0}%)`)
        .join(", ")
    : "no keywords recorded yet";

  const mediumBreakdown = byMedium
    .map(r => `${r.medium || "Unspecified"}: ${r.count}`)
    .join(", ");

  const collectionContext = [
    `Total artworks: ${totalArtworks}`,
    `Estimated total value: ${totalValueUsd !== null ? `$${totalValueUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "not recorded"}`,
    `Keyword frequency (top 20): ${keywordBreakdown}`,
    `Medium breakdown: ${mediumBreakdown || "none recorded"}`,
  ].join("\n");

  const prompt = `You are an art collection advisor. Analyse the following collection goal against the current collection state, then write a concise status update (3–5 sentences). Be specific: reference actual numbers and keyword frequencies. Identify progress made, gaps remaining, and one actionable next step. Keep the tone elegant and professional.

GOAL:
Title: ${goal.title}
${goal.description ? `Description: ${goal.description}` : ""}

CURRENT COLLECTION STATE:
${collectionContext}

Note: Keywords are free-form tags added by the collector to each artwork — they may represent style, geography, movement, material, period, or cultural context. Use them to reason about the collection's character and alignment with the goal.

Write only the status update text — no headers, no bullet points, no preamble.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-5.1",
    max_completion_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  });

  const analysis = completion.choices[0]?.message?.content ?? "Unable to generate analysis.";

  const [updated] = await db
    .update(goalsTable)
    .set({ lastAnalysis: analysis, lastAnalysisAt: new Date() })
    .where(eq(goalsTable.id, id))
    .returning();

  res.json({
    ...updated,
    lastAnalysisAt: updated.lastAnalysisAt ? updated.lastAnalysisAt.toISOString() : null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

export default router;
