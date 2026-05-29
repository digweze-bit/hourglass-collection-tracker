import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { artworksTable } from "./artworks";

export const conditionReportsTable = pgTable("condition_reports", {
  id: serial("id").primaryKey(),
  artworkId: integer("artwork_id")
    .notNull()
    .references(() => artworksTable.id, { onDelete: "cascade" }),
  date: text("date"),
  condition: text("condition"),
  notes: text("notes"),
  inspector: text("inspector"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertConditionReportSchema = createInsertSchema(
  conditionReportsTable
).omit({ id: true, createdAt: true });
export type InsertConditionReport = z.infer<typeof insertConditionReportSchema>;
export type ConditionReport = typeof conditionReportsTable.$inferSelect;
