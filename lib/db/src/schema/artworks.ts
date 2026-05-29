import {
  pgTable,
  text,
  serial,
  integer,
  numeric,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { locationsTable } from "./locations";

export const artworksTable = pgTable("artworks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  artist: text("artist"),
  year: integer("year"),
  medium: text("medium"),
  width: numeric("width", { precision: 10, scale: 2 }),
  height: numeric("height", { precision: 10, scale: 2 }),
  depth: numeric("depth", { precision: 10, scale: 2 }),
  dimensionUnit: text("dimension_unit").default("cm"),
  imageUrl: text("image_url"),
  keywords: text("keywords"),
  notes: text("notes"),
  locationId: integer("location_id").references(() => locationsTable.id, {
    onDelete: "set null",
  }),
  onLoan: boolean("on_loan").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertArtworkSchema = createInsertSchema(artworksTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertArtwork = z.infer<typeof insertArtworkSchema>;
export type Artwork = typeof artworksTable.$inferSelect;
