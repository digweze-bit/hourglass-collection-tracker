import { Router } from "express";
import { eq, and, lte, gte, sql, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { loansTable, artworksTable } from "@workspace/db";

const router = Router();

function formatLoanWithArtwork(
  loan: typeof loansTable.$inferSelect,
  artwork: { title: string; artist: string | null; imageUrl: string | null } | null,
) {
  const now = new Date();
  let status = loan.status;
  if (loan.status === "active" && loan.endDate && new Date(loan.endDate) < now) {
    status = "overdue";
  }
  return {
    id: loan.id,
    artworkId: loan.artworkId,
    artworkTitle: artwork?.title || "Unknown",
    artworkArtist: artwork?.artist || null,
    artworkImageUrl: artwork?.imageUrl || null,
    loanee: loan.loanee,
    institution: loan.institution,
    purpose: loan.purpose,
    startDate: loan.startDate,
    endDate: loan.endDate,
    status,
    notes: loan.notes,
    daysUntilReturn: loan.endDate ? Math.ceil((new Date(loan.endDate).getTime() - now.getTime()) / 86400000) : null,
    createdAt: loan.createdAt.toISOString(),
    updatedAt: loan.updatedAt.toISOString(),
  };
}

// GET /loans
router.get("/loans", async (req, res) => {
  const { status } = req.query;

  const rows = await db
    .select({
      loan: loansTable,
      artworkTitle: artworksTable.title,
      artworkArtist: artworksTable.artist,
      artworkImageUrl: artworksTable.imageUrl,
    })
    .from(loansTable)
    .leftJoin(artworksTable, eq(loansTable.artworkId, artworksTable.id))
    .orderBy(desc(loansTable.createdAt));

  let results = rows.map(r => formatLoanWithArtwork(r.loan, {
    title: r.artworkTitle || "Unknown",
    artist: r.artworkArtist,
    imageUrl: r.artworkImageUrl,
  }));

  if (status === "active") results = results.filter(l => l.status === "active");
  else if (status === "returned") results = results.filter(l => l.status === "returned");
  else if (status === "overdue") results = results.filter(l => l.status === "overdue");

  res.json(results);
});

// GET /loans/upcoming-returns
router.get("/loans/upcoming-returns", async (req, res) => {
  const daysAhead = Number(req.query.daysAhead) || 30;
  const now = new Date();
  const future = new Date(now.getTime() + daysAhead * 86400000);

  const rows = await db
    .select({
      loan: loansTable,
      artworkTitle: artworksTable.title,
      artworkArtist: artworksTable.artist,
      artworkImageUrl: artworksTable.imageUrl,
    })
    .from(loansTable)
    .leftJoin(artworksTable, eq(loansTable.artworkId, artworksTable.id))
    .where(
      and(
        eq(loansTable.status, "active"),
        sql`${loansTable.endDate} IS NOT NULL`,
        sql`${loansTable.endDate}::date <= ${future.toISOString().slice(0, 10)}`,
      )
    )
    .orderBy(loansTable.endDate);

  res.json(rows.map(r => formatLoanWithArtwork(r.loan, {
    title: r.artworkTitle || "Unknown",
    artist: r.artworkArtist,
    imageUrl: r.artworkImageUrl,
  })));
});

export default router;
