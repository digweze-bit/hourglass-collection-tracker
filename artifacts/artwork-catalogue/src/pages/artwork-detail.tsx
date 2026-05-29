import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import {
  useGetArtwork,
  useUpdateArtwork,
  useListProvenance,
  useAddProvenance,
  useDeleteProvenance,
  useListConditionReports,
  useAddConditionReport,
  useListDocuments,
  useAddDocument,
  useDeleteDocument,
  useGetArtworkPricing,
  useUpsertArtworkPricing,
  useListArtworkLoans,
  useCreateArtworkLoan,
  useUpdateArtworkLoan,
  useListLocations,
  getGetArtworkQueryKey,
  getListProvenanceQueryKey,
  getListConditionReportsQueryKey,
  getListDocumentsQueryKey,
  getGetArtworkPricingQueryKey,
  getListArtworkLoansQueryKey,
  getListArtworksQueryKey,
} from "@workspace/api-client-react";
import type { ArtworkDetail } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Edit2, Plus, Trash2, CalendarClock, FileText, RefreshCw } from "lucide-react";
import { KeywordInput } from "@/components/keyword-input";
import { useSettings } from "@/hooks/use-settings";

type Loc = { id: number; name: string; children?: Loc[] };
function flattenLocations(locs: Loc[], depth = 0): { id: number; name: string; indent: string }[] {
  return locs.flatMap(loc => [
    { id: loc.id, name: loc.name, indent: depth > 0 ? "\u00a0".repeat(depth * 3) + "↳ " : "" },
    ...flattenLocations(loc.children || [], depth + 1),
  ]);
}

function formatDimensions(width: number | null, height: number | null, depth: number | null, unit: string | null) {
  const parts = [height, width, depth].filter(v => v !== null && v !== undefined).map(n => Number(n).toFixed(1));
  if (!parts.length) return null;
  return parts.join(" × ") + ` ${unit || "cm"}`;
}

const formatCurrency = (val: number | null, currency = "USD") => {
  if (val === null || val === undefined) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(val);
};

// ---- Edit artwork dialog ----
const editSchema = z.object({
  title: z.string().min(1),
  artist: z.string(),
  year: z.string(),
  medium: z.string(),
  keywords: z.string(),
  width: z.string(),
  height: z.string(),
  depth: z.string(),
  dimensionUnit: z.string(),
  imageUrl: z.string(),
  notes: z.string(),
  locationId: z.string(),
});

function EditArtworkDialog({ artwork, open, onClose, locations }: {
  artwork: ArtworkDetail | undefined;
  open: boolean;
  onClose: () => void;
  locations: Loc[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const update = useUpdateArtwork();

  const form = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    values: {
      title: artwork?.title || "",
      artist: artwork?.artist || "",
      year: artwork?.year ? String(artwork.year) : "",
      medium: artwork?.medium || "",
      keywords: artwork?.keywords || "",
      width: artwork?.width ? String(artwork.width) : "",
      height: artwork?.height ? String(artwork.height) : "",
      depth: artwork?.depth ? String(artwork.depth) : "",
      dimensionUnit: artwork?.dimensionUnit || "cm",
      imageUrl: artwork?.imageUrl || "",
      notes: artwork?.notes || "",
      locationId: artwork?.locationId ? String(artwork.locationId) : "none",
    },
  });

  const onSubmit = (values: z.infer<typeof editSchema>) => {
    if (!artwork) return;
    update.mutate({
      id: artwork.id,
      data: {
        title: values.title,
        artist: values.artist || undefined,
        year: values.year ? Number(values.year) : undefined,
        medium: values.medium || undefined,
        keywords: values.keywords || undefined,
        width: values.width ? Number(values.width) : undefined,
        height: values.height ? Number(values.height) : undefined,
        depth: values.depth ? Number(values.depth) : undefined,
        dimensionUnit: values.dimensionUnit,
        imageUrl: values.imageUrl || undefined,
        notes: values.notes || undefined,
        locationId: values.locationId && values.locationId !== "none" ? Number(values.locationId) : null,
      },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetArtworkQueryKey(artwork.id) });
        queryClient.invalidateQueries({ queryKey: getListArtworksQueryKey() });
        toast({ title: "Artwork updated" });
        onClose();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">Edit Artwork</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} data-testid="input-edit-title" /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="artist" render={({ field }) => (
                <FormItem><FormLabel>Artist</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="year" render={({ field }) => (
                <FormItem><FormLabel>Year</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="medium" render={({ field }) => (
              <FormItem><FormLabel>Medium</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="keywords" render={({ field }) => (
              <FormItem>
                <FormLabel>Keywords</FormLabel>
                <FormControl>
                  <KeywordInput value={field.value ?? ""} onChange={field.onChange} />
                </FormControl>
              </FormItem>
            )} />
            <div className="grid grid-cols-4 gap-2">
              <FormField control={form.control} name="height" render={({ field }) => (
                <FormItem><FormLabel>H</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="width" render={({ field }) => (
                <FormItem><FormLabel>W</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="depth" render={({ field }) => (
                <FormItem><FormLabel>D</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="dimensionUnit" render={({ field }) => (
                <FormItem><FormLabel>Unit</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="cm">cm</SelectItem>
                      <SelectItem value="in">in</SelectItem>
                      <SelectItem value="mm">mm</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="locationId" render={({ field }) => (
              <FormItem><FormLabel>Location</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="No location" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">No location</SelectItem>
                    {flattenLocations(locations).map(l => (
                      <SelectItem key={l.id} value={String(l.id)}>{l.indent}{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
            <FormField control={form.control} name="imageUrl" render={({ field }) => (
              <FormItem><FormLabel>Image URL</FormLabel><FormControl><Input {...field} placeholder="https://..." /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl></FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={update.isPending}>{update.isPending ? "Saving..." : "Save"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ---- Pricing tab ----
const DEFAULT_CURRENCIES = ["USD", "EUR", "GBP", "CHF", "JPY", "CNY", "AUD", "CAD", "HKD", "NGN"];

const pricingSchema = z.object({
  purchasePrice: z.string(),
  purchaseCurrency: z.string(),
  usdConversionRate: z.string(),
  framingCost: z.string(),
  framingCurrency: z.string(),
  framingUsdRate: z.string(),
  shippingCost: z.string(),
  shippingCurrency: z.string(),
  shippingUsdRate: z.string(),
  taxesCost: z.string(),
  taxesCurrency: z.string(),
  taxesUsdRate: z.string(),
  otherCosts: z.string(),
  otherCostsDescription: z.string(),
  otherCurrency: z.string(),
  otherUsdRate: z.string(),
  displayCurrency: z.string(),
  displayCurrencyRate: z.string(),
  currentValueUsd: z.string(),
  valuationDate: z.string(),
  valuationNotes: z.string(),
});

type PricingFormValues = z.infer<typeof pricingSchema>;

function toUsdAmount(amount: string, rate: string, currency: string): number | null {
  const amt = Number(amount);
  if (!amount || !amt) return null;
  if (currency === "USD") return amt;
  const r = Number(rate);
  if (!r) return null;
  return amt * r;
}

function PricingTab({ artworkId }: { artworkId: number }) {
  const [editing, setEditing] = useState(false);
  const [fetchingRates, setFetchingRates] = useState(false);
  const [ratesTimestamp, setRatesTimestamp] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { settings } = useSettings();
  const allCurrencies = [
    ...DEFAULT_CURRENCIES,
    ...settings.customCurrencies.filter(c => !DEFAULT_CURRENCIES.includes(c)),
  ];

  const { data: pricing, isLoading } = useGetArtworkPricing(artworkId, {
    query: { queryKey: getGetArtworkPricingQueryKey(artworkId) },
  });
  const upsert = useUpsertArtworkPricing();

  const form = useForm<PricingFormValues>({
    resolver: zodResolver(pricingSchema),
    values: {
      purchasePrice: pricing?.purchasePrice ? String(pricing.purchasePrice) : "",
      purchaseCurrency: pricing?.purchaseCurrency || "USD",
      usdConversionRate: pricing?.usdConversionRate ? String(pricing.usdConversionRate) : "",
      framingCost: pricing?.framingCost ? String(pricing.framingCost) : "",
      framingCurrency: pricing?.framingCurrency || "USD",
      framingUsdRate: pricing?.framingUsdRate ? String(pricing.framingUsdRate) : "",
      shippingCost: pricing?.shippingCost ? String(pricing.shippingCost) : "",
      shippingCurrency: pricing?.shippingCurrency || "USD",
      shippingUsdRate: pricing?.shippingUsdRate ? String(pricing.shippingUsdRate) : "",
      taxesCost: pricing?.taxesCost ? String(pricing.taxesCost) : "",
      taxesCurrency: pricing?.taxesCurrency || "USD",
      taxesUsdRate: pricing?.taxesUsdRate ? String(pricing.taxesUsdRate) : "",
      otherCosts: pricing?.otherCosts ? String(pricing.otherCosts) : "",
      otherCostsDescription: pricing?.otherCostsDescription || "",
      otherCurrency: pricing?.otherCurrency || "USD",
      otherUsdRate: pricing?.otherUsdRate ? String(pricing.otherUsdRate) : "",
      displayCurrency: pricing?.displayCurrency || "USD",
      displayCurrencyRate: pricing?.displayCurrencyRate ? String(pricing.displayCurrencyRate) : "",
      currentValueUsd: pricing?.currentValueUsd ? String(pricing.currentValueUsd) : "",
      valuationDate: pricing?.valuationDate || "",
      valuationNotes: pricing?.valuationNotes || "",
    },
  });

  const v = form.watch();

  const purchaseUsd = toUsdAmount(v.purchasePrice, v.usdConversionRate, v.purchaseCurrency);
  const framingUsd = toUsdAmount(v.framingCost, v.framingUsdRate, v.framingCurrency);
  const shippingUsd = toUsdAmount(v.shippingCost, v.shippingUsdRate, v.shippingCurrency);
  const taxesUsd = toUsdAmount(v.taxesCost, v.taxesUsdRate, v.taxesCurrency);
  const otherUsd = toUsdAmount(v.otherCosts, v.otherUsdRate, v.otherCurrency);
  const totalUsd = (purchaseUsd ?? 0) + (framingUsd ?? 0) + (shippingUsd ?? 0) + (taxesUsd ?? 0) + (otherUsd ?? 0);
  const displayRate = Number(v.displayCurrencyRate) || 0;
  const totalInDisplay = v.displayCurrency === "USD"
    ? totalUsd
    : (displayRate ? totalUsd * displayRate : null);

  async function fetchLiveRates() {
    setFetchingRates(true);
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD");
      const data = await res.json() as { result: string; rates: Record<string, number> };
      if (data.result !== "success") throw new Error("API error");
      const rates = data.rates;
      const toUsdRate = (cur: string) => cur === "USD" ? "1" : (rates[cur] ? String((1 / rates[cur]).toFixed(8)) : "");
      const fromUsdRate = (cur: string) => cur === "USD" ? "1" : (rates[cur] ? String(rates[cur].toFixed(6)) : "");
      const cur = form.getValues();
      form.setValue("usdConversionRate", toUsdRate(cur.purchaseCurrency));
      form.setValue("framingUsdRate", toUsdRate(cur.framingCurrency));
      form.setValue("shippingUsdRate", toUsdRate(cur.shippingCurrency));
      form.setValue("taxesUsdRate", toUsdRate(cur.taxesCurrency));
      form.setValue("otherUsdRate", toUsdRate(cur.otherCurrency));
      form.setValue("displayCurrencyRate", fromUsdRate(cur.displayCurrency));
      setRatesTimestamp(new Date().toLocaleTimeString());
      toast({ title: "Live rates loaded" });
    } catch {
      toast({ title: "Could not fetch rates — check your connection", variant: "destructive" });
    } finally {
      setFetchingRates(false);
    }
  }

  const onSubmit = (values: PricingFormValues) => {
    upsert.mutate({
      id: artworkId,
      data: {
        purchasePrice: values.purchasePrice ? Number(values.purchasePrice) : undefined,
        purchaseCurrency: values.purchaseCurrency || undefined,
        usdConversionRate: values.usdConversionRate ? Number(values.usdConversionRate) : undefined,
        framingCost: values.framingCost ? Number(values.framingCost) : undefined,
        framingCurrency: values.framingCurrency || undefined,
        framingUsdRate: values.framingUsdRate ? Number(values.framingUsdRate) : undefined,
        shippingCost: values.shippingCost ? Number(values.shippingCost) : undefined,
        shippingCurrency: values.shippingCurrency || undefined,
        shippingUsdRate: values.shippingUsdRate ? Number(values.shippingUsdRate) : undefined,
        taxesCost: values.taxesCost ? Number(values.taxesCost) : undefined,
        taxesCurrency: values.taxesCurrency || undefined,
        taxesUsdRate: values.taxesUsdRate ? Number(values.taxesUsdRate) : undefined,
        otherCosts: values.otherCosts ? Number(values.otherCosts) : undefined,
        otherCostsDescription: values.otherCostsDescription || undefined,
        otherCurrency: values.otherCurrency || undefined,
        otherUsdRate: values.otherUsdRate ? Number(values.otherUsdRate) : undefined,
        displayCurrency: values.displayCurrency || undefined,
        displayCurrencyRate: values.displayCurrencyRate ? Number(values.displayCurrencyRate) : undefined,
        currentValueUsd: values.currentValueUsd ? Number(values.currentValueUsd) : undefined,
        valuationDate: values.valuationDate || undefined,
        valuationNotes: values.valuationNotes || undefined,
      },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetArtworkPricingQueryKey(artworkId) });
        toast({ title: "Pricing updated" });
        setEditing(false);
      },
    });
  };

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  // READ-ONLY VIEW
  if (!editing && pricing) {
    const nativeCur = pricing.purchaseCurrency || "USD";
    const displayCur = pricing.displayCurrency || "USD";
    const hasAcqCosts = !!(pricing.framingCost || pricing.shippingCost || pricing.taxesCost || pricing.otherCosts);

    // A single pricing card: primary amount (large), optional secondary in USD (smaller)
    const PriceCard = ({
      label,
      primary,
      primaryCurrency,
      secondary,
    }: {
      label: string;
      primary: number;
      primaryCurrency: string;
      secondary?: number | null;
    }) => (
      <div className="rounded border border-border px-4 py-3 space-y-0.5">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-xl font-serif">{formatCurrency(primary, primaryCurrency)}</p>
        {secondary != null && primaryCurrency !== "USD" && (
          <p className="text-sm text-muted-foreground">{formatCurrency(secondary)}</p>
        )}
      </div>
    );

    return (
      <div className="space-y-8">
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => setEditing(true)}>
            <Edit2 className="h-3 w-3" />Edit
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <section className="space-y-4">
            <h3 className="text-xs tracking-widest uppercase text-muted-foreground border-b border-border pb-2">Acquisition</h3>

            {pricing.purchasePrice ? (
              <div className="space-y-2">
                {/* Layer 1 — artwork price alone */}
                <PriceCard
                  label="Artwork price"
                  primary={pricing.purchasePrice}
                  primaryCurrency={nativeCur}
                  secondary={pricing.purchasePriceUsd}
                />

                {/* Layer 2 — artwork + all acquisition costs (only when costs exist) */}
                {hasAcqCosts && pricing.totalPurchaseValueUsd && (
                  <PriceCard
                    label="Artwork + acquisition"
                    primary={displayCur !== "USD" && pricing.totalCostInCurrency
                      ? pricing.totalCostInCurrency
                      : pricing.totalPurchaseValueUsd}
                    primaryCurrency={displayCur !== "USD" && pricing.totalCostInCurrency ? displayCur : "USD"}
                    secondary={displayCur !== "USD" ? pricing.totalPurchaseValueUsd : undefined}
                  />
                )}

                {/* Acquisition cost breakdown */}
                {hasAcqCosts && (
                  <div className="space-y-1.5 pt-1 pl-1 border-l-2 border-border ml-1">
                    {pricing.framingCost && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">+ Framing</span>
                        <span>{formatCurrency(pricing.framingCost, pricing.framingCurrency || "USD")}</span>
                      </div>
                    )}
                    {pricing.shippingCost && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">+ Shipping</span>
                        <span>{formatCurrency(pricing.shippingCost, pricing.shippingCurrency || "USD")}</span>
                      </div>
                    )}
                    {pricing.taxesCost && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">+ Taxes</span>
                        <span>{formatCurrency(pricing.taxesCost, pricing.taxesCurrency || "USD")}</span>
                      </div>
                    )}
                    {pricing.otherCosts && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">+ {pricing.otherCostsDescription || "Other"}</span>
                        <span>{formatCurrency(pricing.otherCosts, pricing.otherCurrency || "USD")}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No pricing recorded — click Edit to add.</p>
            )}
          </section>

          <section className="space-y-4">
            <h3 className="text-xs tracking-widest uppercase text-muted-foreground border-b border-border pb-2">Current Valuation</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Current value</span><span className="text-xl font-serif">{formatCurrency(pricing.currentValueUsd ?? null)}</span></div>
              {pricing.valuationDate && <div className="flex justify-between"><span className="text-muted-foreground">Valuation date</span><span>{pricing.valuationDate}</span></div>}
              {pricing.valuationNotes && <div className="flex justify-between gap-4"><span className="text-muted-foreground">Notes</span><span className="text-right">{pricing.valuationNotes}</span></div>}
              {pricing.totalPurchaseValueUsd && pricing.currentValueUsd && (
                <div className="flex justify-between border-t border-border pt-3">
                  <span className="text-muted-foreground">Return</span>
                  <span className={pricing.currentValueUsd > pricing.totalPurchaseValueUsd ? "text-emerald-600" : "text-red-500"}>
                    {pricing.currentValueUsd > pricing.totalPurchaseValueUsd ? "+" : ""}
                    {((pricing.currentValueUsd / pricing.totalPurchaseValueUsd - 1) * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }

  // COST ROW helper (renders amount + currency + rate columns)
  const costRow = (
    label: string,
    amtField: keyof PricingFormValues,
    curField: keyof PricingFormValues,
    rateField: keyof PricingFormValues,
    usdEquiv: number | null,
  ) => {
    const selectedCurrency = v[curField] as string;
    const isUSD = selectedCurrency === "USD";
    return (
      <div className="space-y-1">
        <span className="text-xs font-medium text-foreground/80">{label}</span>
        <div className="grid grid-cols-[1fr_88px_104px_72px] gap-2 items-center">
          <FormField control={form.control} name={amtField} render={({ field }) => (
            <Input type="number" step="0.01" placeholder="0.00" className="h-8 text-sm" {...field} />
          )} />
          <FormField control={form.control} name={curField} render={({ field }) => (
            <Select onValueChange={(val) => { field.onChange(val); if (val === "USD") form.setValue(rateField, "1"); }} value={field.value as string}>
              <SelectTrigger className="h-8 text-xs w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {allCurrencies.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
          <FormField control={form.control} name={rateField} render={({ field }) => (
            <Input
              type="number"
              step="0.000001"
              placeholder={isUSD ? "1" : "rate → USD"}
              disabled={isUSD}
              className="h-8 text-xs"
              {...field}
              value={isUSD ? "1" : (field.value as string)}
            />
          )} />
          <span className="text-xs text-right text-muted-foreground tabular-nums">
            {usdEquiv !== null ? formatCurrency(usdEquiv) : "—"}
          </span>
        </div>
      </div>
    );
  };

  // EDIT FORM
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h3 className="text-xs tracking-widest uppercase text-muted-foreground">Acquisition Cost</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={fetchingRates}
              onClick={fetchLiveRates}
              className="gap-1.5 h-7 text-xs"
            >
              <RefreshCw className={`h-3 w-3 ${fetchingRates ? "animate-spin" : ""}`} />
              {fetchingRates ? "Fetching…" : "Fetch live rates"}
            </Button>
          </div>
          {ratesTimestamp && (
            <p className="text-xs text-muted-foreground">Rates loaded at {ratesTimestamp} — override any field manually.</p>
          )}

          <div className="grid grid-cols-[1fr_88px_104px_72px] gap-2 items-center mb-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Amount</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Currency</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Rate → USD</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide text-right">≈ USD</span>
          </div>

          <div className="space-y-3">
            {costRow("Purchase price", "purchasePrice", "purchaseCurrency", "usdConversionRate", purchaseUsd)}
            {costRow("Framing", "framingCost", "framingCurrency", "framingUsdRate", framingUsd)}
            {costRow("Shipping", "shippingCost", "shippingCurrency", "shippingUsdRate", shippingUsd)}
            {costRow("Taxes", "taxesCost", "taxesCurrency", "taxesUsdRate", taxesUsd)}
            {costRow("Other", "otherCosts", "otherCurrency", "otherUsdRate", otherUsd)}
          </div>

          <FormField control={form.control} name="otherCostsDescription" render={({ field }) => (
            <Input placeholder="Other costs description (insurance, restoration…)" className="h-8 text-xs" {...field} />
          )} />

          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium w-24 shrink-0">Display total in</span>
              <FormField control={form.control} name="displayCurrency" render={({ field }) => (
                <Select onValueChange={(val) => { field.onChange(val); if (val === "USD") form.setValue("displayCurrencyRate", "1"); }} value={field.value}>
                  <SelectTrigger className="w-[88px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allCurrencies.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
              {v.displayCurrency !== "USD" && (
                <>
                  <span className="text-xs text-muted-foreground">1 USD =</span>
                  <FormField control={form.control} name="displayCurrencyRate" render={({ field }) => (
                    <Input type="number" step="0.000001" placeholder="rate" className="w-[100px] h-8 text-xs" {...field} />
                  )} />
                  <span className="text-xs text-muted-foreground">{v.displayCurrency}</span>
                </>
              )}
            </div>

            {totalUsd > 0 && (
              <div className="bg-muted/50 rounded-md px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium">Total acquisition cost</span>
                <div className="text-right">
                  {v.displayCurrency && v.displayCurrency !== "USD" && totalInDisplay !== null && (
                    <div className="text-base font-semibold">{formatCurrency(totalInDisplay, v.displayCurrency)}</div>
                  )}
                  <div className={v.displayCurrency !== "USD" ? "text-xs text-muted-foreground" : "text-base font-semibold"}>
                    {formatCurrency(totalUsd)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs tracking-widest uppercase text-muted-foreground border-b border-border pb-2">Current Valuation</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="currentValueUsd" render={({ field }) => (
              <FormItem><FormLabel>Current Value (USD)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="valuationDate" render={({ field }) => (
              <FormItem><FormLabel>Valuation Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
            )} />
          </div>
          <FormField control={form.control} name="valuationNotes" render={({ field }) => (
            <FormItem><FormLabel>Valuation Notes</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl></FormItem>
          )} />
        </section>

        <div className="flex gap-2 border-t border-border pt-4">
          <Button type="submit" disabled={upsert.isPending}>{upsert.isPending ? "Saving…" : "Save Pricing"}</Button>
          {pricing && <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>}
        </div>
      </form>
    </Form>
  );
}

// ---- Loans tab ----
const loanSchema = z.object({
  loanee: z.string().optional(),
  institution: z.string().optional(),
  purpose: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  notes: z.string().optional(),
});

function LoansTab({ artworkId }: { artworkId: number }) {
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: loans, isLoading } = useListArtworkLoans(artworkId, {
    query: { queryKey: getListArtworkLoansQueryKey(artworkId) },
  });
  const createLoan = useCreateArtworkLoan();
  const updateLoan = useUpdateArtworkLoan();

  const form = useForm<z.infer<typeof loanSchema>>({
    resolver: zodResolver(loanSchema),
    defaultValues: { loanee: "", institution: "", purpose: "", startDate: "", endDate: "", notes: "" },
  });

  const onSubmit = (values: z.infer<typeof loanSchema>) => {
    createLoan.mutate({
      id: artworkId,
      data: {
        loanee: values.loanee || undefined,
        institution: values.institution || undefined,
        purpose: values.purpose || undefined,
        startDate: values.startDate || undefined,
        endDate: values.endDate || undefined,
        notes: values.notes || undefined,
      },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListArtworkLoansQueryKey(artworkId) });
        queryClient.invalidateQueries({ queryKey: getGetArtworkQueryKey(artworkId) });
        toast({ title: "Loan recorded" });
        setShowForm(false);
        form.reset();
      },
    });
  };

  const handleReturn = (loanId: number) => {
    updateLoan.mutate({ id: artworkId, loanId, data: { status: "returned" } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListArtworkLoansQueryKey(artworkId) });
        queryClient.invalidateQueries({ queryKey: getGetArtworkQueryKey(artworkId) });
        toast({ title: "Loan marked as returned" });
      },
    });
  };

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{loans?.length || 0} loan record{loans?.length !== 1 ? "s" : ""}</p>
        <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3 w-3" />
          Record Loan
        </Button>
      </div>

      {showForm && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="border border-border p-4 space-y-4">
            <h3 className="text-xs tracking-widest uppercase text-muted-foreground">New Loan</h3>
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="loanee" render={({ field }) => (
                <FormItem><FormLabel>Loanee</FormLabel><FormControl><Input placeholder="Name or organisation" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="institution" render={({ field }) => (
                <FormItem><FormLabel>Institution</FormLabel><FormControl><Input placeholder="Museum, gallery..." {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="endDate" render={({ field }) => (
                <FormItem><FormLabel>Return Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="purpose" render={({ field }) => (
              <FormItem><FormLabel>Purpose</FormLabel><FormControl><Input placeholder="Exhibition, study..." {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl></FormItem>
            )} />
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={createLoan.isPending}>Save</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Form>
      )}

      {!loans?.length && !showForm && (
        <div className="text-center py-10">
          <CalendarClock className="h-6 w-6 mx-auto mb-2 opacity-20" />
          <p className="text-sm text-muted-foreground">No loans recorded</p>
        </div>
      )}

      <div className="divide-y divide-border">
        {loans?.map(loan => {
          const days = loan.daysUntilReturn ?? null;
          const isOverdue = days !== null && days < 0 && loan.status === "active";
          return (
            <div key={loan.id} className="py-4 group" data-testid={`loan-item-${loan.id}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{loan.loanee || loan.institution || "Unknown loanee"}</span>
                    {loan.status === "returned" && <Badge variant="outline" className="text-[10px] uppercase tracking-widest text-muted-foreground">Returned</Badge>}
                    {isOverdue && <Badge variant="destructive" className="text-[10px] uppercase tracking-widest">Overdue</Badge>}
                    {loan.status === "active" && !isOverdue && <Badge variant="outline" className="text-[10px] uppercase tracking-widest text-emerald-600 border-emerald-600/30">Active</Badge>}
                  </div>
                  {loan.institution && loan.loanee && <p className="text-xs text-muted-foreground">{loan.institution}</p>}
                  {loan.purpose && <p className="text-xs text-muted-foreground mt-0.5">{loan.purpose}</p>}
                  <div className="flex gap-4 mt-1">
                    {loan.startDate && <span className="text-xs text-muted-foreground">From {loan.startDate}</span>}
                    {loan.endDate && <span className="text-xs text-muted-foreground">Until {loan.endDate}</span>}
                    {loan.status === "active" && days !== null && days !== undefined && (
                      <span className={`text-xs font-medium ${isOverdue ? "text-red-500" : days <= 7 ? "text-amber-600" : "text-emerald-600/80"}`}>
                        {isOverdue ? `${Math.abs(days)} days overdue` : `${days} days remaining`}
                      </span>
                    )}
                  </div>
                </div>
                {loan.status === "active" && (
                  <Button variant="ghost" size="sm" className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleReturn(loan.id)}>
                    Mark returned
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Main component ----
export default function ArtworkDetail() {
  const { id } = useParams<{ id: string }>();
  const artworkId = Number(id);
  const [, setLocation] = useLocation();
  const [editOpen, setEditOpen] = useState(false);

  const { data: artwork, isLoading } = useGetArtwork(artworkId, {
    query: { queryKey: getGetArtworkQueryKey(artworkId) },
  });
  const { data: locations } = useListLocations();
  const { data: provenance } = useListProvenance(artworkId, {
    query: { queryKey: getListProvenanceQueryKey(artworkId) },
  });
  const { data: conditionReports } = useListConditionReports(artworkId, {
    query: { queryKey: getListConditionReportsQueryKey(artworkId) },
  });
  const { data: documents } = useListDocuments(artworkId, {
    query: { queryKey: getListDocumentsQueryKey(artworkId) },
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const addProvenance = useAddProvenance();
  const deleteProvenance = useDeleteProvenance();
  const addConditionReport = useAddConditionReport();
  const addDocument = useAddDocument();
  const deleteDocument = useDeleteDocument();

  // Provenance form state
  const [provForm, setProvForm] = useState({ date: "", description: "", source: "", price: "", currency: "USD" });
  const [showProvForm, setShowProvForm] = useState(false);

  // Condition form state
  const [condForm, setCondForm] = useState({ date: "", condition: "", notes: "", inspector: "" });
  const [showCondForm, setShowCondForm] = useState(false);

  // Document form state
  const [docForm, setDocForm] = useState({ name: "", type: "", url: "" });
  const [showDocForm, setShowDocForm] = useState(false);

  if (isLoading) return (
    <div className="space-y-8">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <Skeleton className="aspect-square" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
    </div>
  );

  if (!artwork) return (
    <div className="text-center py-20">
      <p className="text-muted-foreground">Artwork not found.</p>
      <Link href="/artworks"><Button variant="ghost" className="mt-4">Back to catalogue</Button></Link>
    </div>
  );

  return (
    <div className="space-y-12">
      <Link href="/artworks" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Catalogue
      </Link>

      {/* Header */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-20">
        {/* Image */}
        <div className="aspect-square bg-muted/20 overflow-hidden">
          {artwork.imageUrl ? (
            <img src={artwork.imageUrl} alt={artwork.title} className="object-contain w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground/40 uppercase tracking-widest">No image</div>
          )}
        </div>

        {/* Metadata */}
        <div className="space-y-8 flex flex-col justify-center">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                {artwork.onLoan && <Badge variant="outline" className="text-[10px] uppercase tracking-widest mb-3">On Loan</Badge>}
                <h1 className="text-[20px] font-serif tracking-tight leading-tight">{artwork.title}</h1>
                {artwork.artist && <p className="text-lg text-muted-foreground mt-2">{artwork.artist}</p>}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setEditOpen(true)} data-testid="button-edit-artwork">
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <dl className="space-y-3">
            {artwork.year && (
              <div className="flex justify-between text-sm border-b border-border/50 pb-3">
                <dt className="text-muted-foreground">Year</dt>
                <dd>{artwork.year}</dd>
              </div>
            )}
            {artwork.medium && (
              <div className="flex justify-between text-sm border-b border-border/50 pb-3">
                <dt className="text-muted-foreground">Medium</dt>
                <dd>{artwork.medium}</dd>
              </div>
            )}
            {(artwork.width || artwork.height) && (
              <div className="flex justify-between text-sm border-b border-border/50 pb-3">
                <dt className="text-muted-foreground">Dimensions</dt>
                <dd>{formatDimensions(artwork.width ?? null, artwork.height ?? null, artwork.depth ?? null, artwork.dimensionUnit ?? null)}</dd>
              </div>
            )}
            {artwork.locationName && (
              <div className="flex justify-between text-sm border-b border-border/50 pb-3">
                <dt className="text-muted-foreground">Location</dt>
                <dd>{artwork.locationName}</dd>
              </div>
            )}
            {artwork.keywords && (
              <div className="text-sm border-b border-border/50 pb-3">
                <dt className="text-muted-foreground mb-2">Keywords</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {artwork.keywords.split(",").map(k => k.trim()).filter(Boolean).map(kw => (
                    <span key={kw} className="inline-block text-xs border border-border bg-muted/30 px-2 py-0.5">
                      {kw}
                    </span>
                  ))}
                </dd>
              </div>
            )}
            {artwork.notes && (
              <div className="text-sm pt-1">
                <dt className="text-muted-foreground mb-1.5">Notes</dt>
                <dd className="text-foreground/80 leading-relaxed">{artwork.notes}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="provenance" className="space-y-8">
        <TabsList className="border-b border-border bg-transparent p-0 h-auto gap-8 rounded-none justify-start">
          {[
            { value: "provenance", label: "Provenance" },
            { value: "condition", label: "Condition" },
            { value: "documents", label: "Documents" },
            { value: "pricing", label: "Pricing" },
            { value: "loans", label: "Loans" },
          ].map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="pb-4 px-0 rounded-none text-sm data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:text-foreground text-muted-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Provenance */}
        <TabsContent value="provenance" className="mt-0 space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{provenance?.length || 0} record{provenance?.length !== 1 ? "s" : ""}</p>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowProvForm(!showProvForm)}>
              <Plus className="h-3 w-3" />Add Record
            </Button>
          </div>
          {showProvForm && (
            <div className="border border-border p-4 space-y-3">
              <h3 className="text-xs tracking-widest uppercase text-muted-foreground">New Provenance Record</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground mb-1 block">Date</label><Input type="date" value={provForm.date} onChange={e => setProvForm(f => ({ ...f, date: e.target.value }))} /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Source</label><Input placeholder="Seller, auction, gallery" value={provForm.source} onChange={e => setProvForm(f => ({ ...f, source: e.target.value }))} /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Price</label><Input type="number" placeholder="0.00" value={provForm.price} onChange={e => setProvForm(f => ({ ...f, price: e.target.value }))} /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Currency</label>
                  <Select value={provForm.currency} onValueChange={v => setProvForm(f => ({ ...f, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["USD","EUR","GBP","CHF","JPY"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Description</label><Textarea rows={2} placeholder="Acquisition details..." value={provForm.description} onChange={e => setProvForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => {
                  addProvenance.mutate({ id: artworkId, data: { date: provForm.date || undefined, description: provForm.description || undefined, source: provForm.source || undefined, price: provForm.price ? Number(provForm.price) : undefined, currency: provForm.currency || undefined } }, {
                    onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListProvenanceQueryKey(artworkId) }); toast({ title: "Record added" }); setShowProvForm(false); setProvForm({ date: "", description: "", source: "", price: "", currency: "USD" }); }
                  });
                }}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowProvForm(false)}>Cancel</Button>
              </div>
            </div>
          )}
          {(!provenance || provenance.length === 0) && !showProvForm && (
            <div className="text-center py-10 text-muted-foreground text-sm">No provenance records</div>
          )}
          <div className="divide-y divide-border">
            {provenance?.map(p => (
              <div key={p.id} className="py-4 group flex justify-between items-start" data-testid={`provenance-item-${p.id}`}>
                <div>
                  {p.date && <p className="text-xs text-muted-foreground mb-1">{p.date}</p>}
                  {p.description && <p className="text-sm leading-relaxed">{p.description}</p>}
                  <div className="flex gap-4 mt-1">
                    {p.source && <span className="text-xs text-muted-foreground">Source: {p.source}</span>}
                    {p.price && <span className="text-xs text-muted-foreground">{formatCurrency(p.price, p.currency || "USD")} {p.currency}</span>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" onClick={() => { deleteProvenance.mutate({ id: artworkId, provenanceId: p.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListProvenanceQueryKey(artworkId) }) }); }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Condition */}
        <TabsContent value="condition" className="mt-0 space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{conditionReports?.length || 0} report{conditionReports?.length !== 1 ? "s" : ""}</p>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowCondForm(!showCondForm)}>
              <Plus className="h-3 w-3" />Add Report
            </Button>
          </div>
          {showCondForm && (
            <div className="border border-border p-4 space-y-3">
              <h3 className="text-xs tracking-widest uppercase text-muted-foreground">New Condition Report</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground mb-1 block">Date</label><Input type="date" value={condForm.date} onChange={e => setCondForm(f => ({ ...f, date: e.target.value }))} /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Inspector</label><Input placeholder="Name" value={condForm.inspector} onChange={e => setCondForm(f => ({ ...f, inspector: e.target.value }))} /></div>
                <div className="col-span-2"><label className="text-xs text-muted-foreground mb-1 block">Condition</label><Input placeholder="Good, Fair, Poor..." value={condForm.condition} onChange={e => setCondForm(f => ({ ...f, condition: e.target.value }))} /></div>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Notes</label><Textarea rows={3} placeholder="Detailed condition notes..." value={condForm.notes} onChange={e => setCondForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => {
                  addConditionReport.mutate({ id: artworkId, data: { date: condForm.date || undefined, condition: condForm.condition || undefined, notes: condForm.notes || undefined, inspector: condForm.inspector || undefined } }, {
                    onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListConditionReportsQueryKey(artworkId) }); toast({ title: "Report added" }); setShowCondForm(false); setCondForm({ date: "", condition: "", notes: "", inspector: "" }); }
                  });
                }}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowCondForm(false)}>Cancel</Button>
              </div>
            </div>
          )}
          {(!conditionReports || conditionReports.length === 0) && !showCondForm && (
            <div className="text-center py-10 text-muted-foreground text-sm">No condition reports</div>
          )}
          <div className="divide-y divide-border">
            {conditionReports?.map(c => (
              <div key={c.id} className="py-4" data-testid={`condition-item-${c.id}`}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    {c.condition && <Badge variant="outline" className="text-xs">{c.condition}</Badge>}
                    {c.date && <span className="text-xs text-muted-foreground">{c.date}</span>}
                  </div>
                  {c.inspector && <span className="text-xs text-muted-foreground">{c.inspector}</span>}
                </div>
                {c.notes && <p className="text-sm text-foreground/80 leading-relaxed">{c.notes}</p>}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents" className="mt-0 space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{documents?.length || 0} document{documents?.length !== 1 ? "s" : ""}</p>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowDocForm(!showDocForm)}>
              <Plus className="h-3 w-3" />Add Document
            </Button>
          </div>
          {showDocForm && (
            <div className="border border-border p-4 space-y-3">
              <h3 className="text-xs tracking-widest uppercase text-muted-foreground">Add Document</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground mb-1 block">Name</label><Input placeholder="Certificate, Report..." value={docForm.name} onChange={e => setDocForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Type</label><Input placeholder="PDF, Certificate..." value={docForm.type} onChange={e => setDocForm(f => ({ ...f, type: e.target.value }))} /></div>
                <div className="col-span-2"><label className="text-xs text-muted-foreground mb-1 block">URL</label><Input placeholder="https://..." value={docForm.url} onChange={e => setDocForm(f => ({ ...f, url: e.target.value }))} /></div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => {
                  addDocument.mutate({ id: artworkId, data: { name: docForm.name, type: docForm.type || undefined, url: docForm.url || undefined } }, {
                    onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey(artworkId) }); toast({ title: "Document added" }); setShowDocForm(false); setDocForm({ name: "", type: "", url: "" }); }
                  });
                }}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowDocForm(false)}>Cancel</Button>
              </div>
            </div>
          )}
          {(!documents || documents.length === 0) && !showDocForm && (
            <div className="text-center py-10 text-muted-foreground text-sm">No documents</div>
          )}
          <div className="divide-y divide-border">
            {documents?.map(doc => (
              <div key={doc.id} className="py-4 flex items-center justify-between group" data-testid={`document-item-${doc.id}`}>
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-sm">{doc.name}</p>
                    {doc.type && <p className="text-xs text-muted-foreground">{doc.type}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {doc.url && <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Open</a>}
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" onClick={() => { deleteDocument.mutate({ id: artworkId, documentId: doc.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey(artworkId) }) }); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Pricing */}
        <TabsContent value="pricing" className="mt-0">
          <PricingTab artworkId={artworkId} />
        </TabsContent>

        {/* Loans */}
        <TabsContent value="loans" className="mt-0">
          <LoansTab artworkId={artworkId} />
        </TabsContent>
      </Tabs>

      <EditArtworkDialog artwork={artwork} open={editOpen} onClose={() => setEditOpen(false)} locations={locations as Loc[] || []} />
    </div>
  );
}
