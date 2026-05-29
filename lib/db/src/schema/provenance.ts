import {
  pgTable,
  text,
  serial,
  integer,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { artworksTable } from "./artworks";

export const provenanceTable = pgTable("provenance", {
  id: serial("id").primaryKey(),
  artworkId: integer("artwork_id")
    .notNull()
    .references(() => artworksTable.id, { onDelete: "cascade" }),
  date: text("date"),
  description: text("description"),
  source: text("source"),
  price: numeric("price", { precision: 12, scale: 2 }),
  currency: text("currency"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertProvenanceSchema = createInsertSchema(provenanceTable).omit({
  id: true,
  createdAt: true,
});
export type InsertProvenance = z.infer<typeof insertProvenanceSchema>;
export type Provenance = typeof provenanceTable.$inferSelect;
