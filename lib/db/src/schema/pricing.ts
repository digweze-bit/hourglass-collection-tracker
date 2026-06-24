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

export const pricingTable = pgTable("pricing", {
  id: serial("id").primaryKey(),
  artworkId: integer("artwork_id")
    .notNull()
    .unique()
    .references(() => artworksTable.id, { onDelete: "cascade" }),
  purchasePrice: numeric("purchase_price", { precision: 14, scale: 2 }),
  purchaseCurrency: text("purchase_currency"),
  usdConversionRate: numeric("usd_conversion_rate", { precision: 12, scale: 6 }),
  purchasePriceUsd: numeric("purchase_price_usd", { precision: 14, scale: 2 }),
  acquisitionDate: text("acquisition_date"),
  framingCost: numeric("framing_cost", { precision: 12, scale: 2 }),
  framingCurrency: text("framing_currency"),
  framingUsdRate: numeric("framing_usd_rate", { precision: 12, scale: 6 }),
  shippingCost: numeric("shipping_cost", { precision: 12, scale: 2 }),
  shippingCurrency: text("shipping_currency"),
  shippingUsdRate: numeric("shipping_usd_rate", { precision: 12, scale: 6 }),
  taxesCost: numeric("taxes_cost", { precision: 12, scale: 2 }),
  taxesCurrency: text("taxes_currency"),
  taxesUsdRate: numeric("taxes_usd_rate", { precision: 12, scale: 6 }),
  otherCosts: numeric("other_costs", { precision: 12, scale: 2 }),
  otherCostsDescription: text("other_costs_description"),
  otherCurrency: text("other_currency"),
  otherUsdRate: numeric("other_usd_rate", { precision: 12, scale: 6 }),
  displayCurrency: text("display_currency"),
  displayCurrencyRate: numeric("display_currency_rate", { precision: 12, scale: 6 }),
  totalPurchaseValueUsd: numeric("total_purchase_value_usd", { precision: 14, scale: 2 }),
  totalCostInCurrency: numeric("total_cost_in_currency", { precision: 14, scale: 2 }),
  currentValueUsd: numeric("current_value_usd", { precision: 14, scale: 2 }),
  valuationDate: text("valuation_date"),
  valuationNotes: text("valuation_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertPricingSchema = createInsertSchema(pricingTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPricing = z.infer<typeof insertPricingSchema>;
export type Pricing = typeof pricingTable.$inferSelect;
