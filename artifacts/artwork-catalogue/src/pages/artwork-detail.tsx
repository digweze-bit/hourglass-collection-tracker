import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "wouter";
import {
  useGetArtwork, useUpdateArtwork, useListLocations,
  useListProvenance, useAddProvenance, useDeleteProvenance,
  useListConditionReports, useAddConditionReport,
  useListDocuments, useAddDocument, useDeleteDocument,
  useGetPricing, useUpsertPricing,
  useListArtworkLoans, useCreateLoan, useUpdateLoan,
  QK,
} from "@/hooks/use-db";
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
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Edit2, Plus, Trash2, CalendarClock, FileText, RefreshCw } from "lucide-react";
import { KeywordInput } from "@/components/keyword-input";
import { useSettings } from "@/hooks/use-settings";
import type { Location } from "@/hooks/use-db";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function flattenLocations(locs: Location[], depth = 0): { id: string; name: string; indent: string }[] {
  return locs.flatMap(l => [
    { id: l.id, name: l.name, indent: depth > 0 ? "\u00a0".repeat(depth * 3) + "↳ " : "" },
    ...flattenLocations(l.children || [], depth + 1),
  ]);
}

function formatDimensions(w: number | null, h: number | null, d: number | null, u: string | null) {
  const parts = [h, w, d].filter(v => v != null).map(n => Number(n).toFixed(1));
  return parts.length ? parts.join(" × ") + ` ${u || "cm"}` : null;
}

const fmt = (val: number | null, currency = "USD") => {
  if (val == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(val);
};

const DEFAULT_CURRENCIES = ["USD", "EUR", "GBP", "CHF", "JPY", "CNY", "AUD", "CAD", "HKD", "NGN"];

// ─── Edit Artwork Dialog ──────────────────────────────────────────────────────

const editSchema = z.object({
  title: z.string().min(1),
  artist: z.string(),
  year: z.string(),
  medium: z.string(),
  keywords: z.string(),
  width: z.string(),
  height: z.string(),
  depth: z.string(),
  dimension_unit: z.string(),
  image_url: z.string(),
  notes: z.string(),
  location_id: z.string(),
  edition_number: z.string(),
  edition_total: z.string(),
});

function EditDialog({ artwork, open, onClose, locations }: { artwork: any; open: boolean; onClose: () => void; locations: Location[] }) {
  const { toast } = useToast();
  const update = useUpdateArtwork();
  const flat = flattenLocations(locations);
  const form = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: "", artist: "", year: "", medium: "", keywords: "",
      width: "", height: "", depth: "", dimension_unit: "cm",
      image_url: "", notes: "", location_id: "none",
      edition_number: "", edition_total: "",
    },
  });

  // Reset form with artwork data whenever dialog opens
  useEffect(() => {
    if (open && artwork) {
      form.reset({
        title: artwork.title || "",
        artist: artwork.artist || "",
        year: artwork.year ? String(artwork.year) : "",
        medium: artwork.medium || "",
        keywords: artwork.keywords || "",
        width: artwork.width ? String(artwork.width) : "",
        height: artwork.height ? String(artwork.height) : "",
        depth: artwork.depth ? String(artwork.depth) : "",
        dimension_unit: artwork.dimension_unit || "cm",
        image_url: artwork.image_url || "",
        notes: artwork.notes || "",
        location_id: artwork.location_id || "none",
        edition_number: artwork.edition_number ? String(artwork.edition_number) : "",
        edition_total: artwork.edition_total ? String(artwork.edition_total) : "",
      });
    }
  }, [open, artwork]);

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
        dimension_unit: values.dimension_unit,
        image_url: values.image_url || undefined,
        notes: values.notes || undefined,
        location_id: values.location_id && values.location_id !== "none" ? values.location_id : null,
        edition_number: values.edition_number ? Number(values.edition_number) : null,
        edition_total: values.edition_total ? Number(values.edition_total) : null,
      } as any,
    }, {
      onSuccess: () => { toast({ title: "Artwork updated" }); onClose(); },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-serif">Edit Artwork</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="artist" render={({ field }) => (<FormItem><FormLabel>Artist</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="year" render={({ field }) => (<FormItem><FormLabel>Year</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
            </div>
            <FormField control={form.control} name="medium" render={({ field }) => (<FormItem><FormLabel>Medium</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="edition_number" render={({ field }) => (<FormItem><FormLabel>Edition No.</FormLabel><FormControl><Input type="number" placeholder="e.g. 3" {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="edition_total" render={({ field }) => (<FormItem><FormLabel>Edition Total</FormLabel><FormControl><Input type="number" placeholder="e.g. 10" {...field} /></FormControl></FormItem>)} />
            </div>
            <FormField control={form.control} name="keywords" render={({ field }) => (<FormItem><FormLabel>Keywords</FormLabel><FormControl><KeywordInput value={field.value ?? ""} onChange={field.onChange} /></FormControl></FormItem>)} />
            <div className="grid grid-cols-4 gap-2">
              {(["height", "width", "depth"] as const).map(d => (
                <FormField key={d} control={form.control} name={d} render={({ field }) => (<FormItem><FormLabel>{d.charAt(0).toUpperCase()}</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
              ))}
              <FormField control={form.control} name="dimension_unit" render={({ field }) => (
                <FormItem><FormLabel>Unit</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="cm">cm</SelectItem><SelectItem value="in">in</SelectItem><SelectItem value="mm">mm</SelectItem></SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="location_id" render={({ field }) => (
              <FormItem><FormLabel>Location</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="No location" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">No location</SelectItem>
                    {flat.map(l => <SelectItem key={l.id} value={l.id}>{l.indent}{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
            <FormField control={form.control} name="image_url" render={({ field }) => (<FormItem><FormLabel>Image URL</FormLabel><FormControl><Input {...field} placeholder="https://..." /></FormControl></FormItem>)} />
            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl></FormItem>)} />
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

// ─── Pricing Tab ──────────────────────────────────────────────────────────────

const pricingSchema = z.object({
  acquisition_date: z.string(),
  acquisition_source: z.string(),
  purchase_price: z.string(),
  purchase_currency: z.string(),
  usd_conversion_rate: z.string(),
  framing_cost: z.string(),
  framing_currency: z.string(),
  framing_usd_rate: z.string(),
  shipping_cost: z.string(),
  shipping_currency: z.string(),
  shipping_usd_rate: z.string(),
  taxes_cost: z.string(),
  taxes_currency: z.string(),
  taxes_usd_rate: z.string(),
  other_costs: z.string(),
  other_costs_description: z.string(),
  other_currency: z.string(),
  other_usd_rate: z.string(),
  display_currency: z.string(),
  display_currency_rate: z.string(),
  current_value_usd: z.string(),
  valuation_date: z.string(),
  valuation_notes: z.string(),
});
type PricingFormValues = z.infer<typeof pricingSchema>;

function toUsd(amount: string, rate: string, currency: string): number | null {
  const amt = Number(amount);
  if (!amount || !amt) return null;
  if (currency === "USD") return amt;
  const r = Number(rate);
  return r ? amt * r : null;
}

function PricingTab({ artworkId }: { artworkId: string }) {
  const [editing, setEditing] = useState(false);
  const [fetchingRates, setFetchingRates] = useState(false);
  const [fetchingHistorical, setFetchingHistorical] = useState(false);
  const [ratesTimestamp, setRatesTimestamp] = useState<string | null>(null);
  const [rateSources, setRateSources] = useState<Record<string, "historical" | "live" | "manual">>({
    usd_conversion_rate: "historical",
    framing_usd_rate: "historical",
    shipping_usd_rate: "historical",
    taxes_usd_rate: "historical",
    other_usd_rate: "historical",
  });
  const { toast } = useToast();
  const { settings } = useSettings();
  const allCurrencies = [...DEFAULT_CURRENCIES, ...settings.customCurrencies.filter(c => !DEFAULT_CURRENCIES.includes(c))];
  const { data: pricing, isLoading } = useGetPricing(artworkId);
  const upsert = useUpsertPricing();
  const qc = useQueryClient();

  const p = pricing;
  const form = useForm<PricingFormValues>({
    resolver: zodResolver(pricingSchema),
    values: {
      acquisition_date: p?.acquisition_date || "",
      acquisition_source: (p as any)?.acquisition_source || "",
      purchase_price: p?.purchase_price ? String(p.purchase_price) : "",
      purchase_currency: p?.purchase_currency || "USD",
      usd_conversion_rate: p?.usd_conversion_rate ? String(p.usd_conversion_rate) : "",
      framing_cost: p?.framing_cost ? String(p.framing_cost) : "",
      framing_currency: p?.framing_currency || "USD",
      framing_usd_rate: p?.framing_usd_rate ? String(p.framing_usd_rate) : "",
      shipping_cost: p?.shipping_cost ? String(p.shipping_cost) : "",
      shipping_currency: p?.shipping_currency || "USD",
      shipping_usd_rate: p?.shipping_usd_rate ? String(p.shipping_usd_rate) : "",
      taxes_cost: p?.taxes_cost ? String(p.taxes_cost) : "",
      taxes_currency: p?.taxes_currency || "USD",
      taxes_usd_rate: p?.taxes_usd_rate ? String(p.taxes_usd_rate) : "",
      other_costs: p?.other_costs ? String(p.other_costs) : "",
      other_costs_description: p?.other_costs_description || "",
      other_currency: p?.other_currency || "USD",
      other_usd_rate: p?.other_usd_rate ? String(p.other_usd_rate) : "",
      display_currency: p?.display_currency || "USD",
      display_currency_rate: p?.display_currency_rate ? String(p.display_currency_rate) : "",
      current_value_usd: p?.current_value_usd ? String(p.current_value_usd) : "",
      valuation_date: p?.valuation_date || "",
      valuation_notes: p?.valuation_notes || "",
    },
  });

  const v = form.watch();
  const purchaseUsd = toUsd(v.purchase_price, v.usd_conversion_rate, v.purchase_currency);
  const framingUsd = toUsd(v.framing_cost, v.framing_usd_rate, v.framing_currency);
  const shippingUsd = toUsd(v.shipping_cost, v.shipping_usd_rate, v.shipping_currency);
  const taxesUsd = toUsd(v.taxes_cost, v.taxes_usd_rate, v.taxes_currency);
  const otherUsd = toUsd(v.other_costs, v.other_usd_rate, v.other_currency);
  const totalUsd = (purchaseUsd ?? 0) + (framingUsd ?? 0) + (shippingUsd ?? 0) + (taxesUsd ?? 0) + (otherUsd ?? 0);
  const displayRate = Number(v.display_currency_rate) || 0;
  const totalInDisplay = v.display_currency === "USD" ? totalUsd : (displayRate ? totalUsd * displayRate : null);

  const fieldCurrencyMap = (cur: PricingFormValues): Record<string, string> => ({
    usd_conversion_rate: cur.purchase_currency,
    framing_usd_rate: cur.framing_currency,
    shipping_usd_rate: cur.shipping_currency,
    taxes_usd_rate: cur.taxes_currency,
    other_usd_rate: cur.other_currency,
  });

  async function fetchRatesForDate(date: string) {
    try {
      const res = await fetch(`https://open.er-api.com/v6/historical/${date}`);
      const data = await res.json() as { result: string; rates: Record<string, number> };
      if (data.result !== "success") throw new Error();
      return data.rates;
    } catch { return null; }
  }

  async function applyRates(rates: Record<string, number>, fromUsd = false) {
    const cur = form.getValues();
    const map = fieldCurrencyMap(cur);
    Object.entries(map).forEach(([field, currency]) => {
      if (rateSources[field] !== "manual") {
        const rate = currency === "USD" ? "1" : (rates[currency] ? String((1 / rates[currency]).toFixed(8)) : "");
        form.setValue(field as keyof PricingFormValues, rate);
      }
    });
    if (fromUsd) {
      const dr = cur.display_currency === "USD" ? "1" : (rates[cur.display_currency] ? String(rates[cur.display_currency].toFixed(6)) : "");
      form.setValue("display_currency_rate", dr);
    }
  }

  async function fetchLiveRates() {
    setFetchingRates(true);
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD");
      const data = await res.json() as { result: string; rates: Record<string, number> };
      if (data.result !== "success") throw new Error();
      await applyRates(data.rates, true);
      setRatesTimestamp(`Live rates at ${new Date().toLocaleTimeString()}`);
      toast({ title: "Live rates loaded" });
    } catch { toast({ title: "Could not fetch rates", variant: "destructive" }); }
    finally { setFetchingRates(false); }
  }

  async function fetchHistoricalRates() {
    const date = form.getValues("acquisition_date");
    if (!date) { toast({ title: "Please enter an acquisition date first", variant: "destructive" }); return; }
    setFetchingHistorical(true);
    try {
      const rates = await fetchRatesForDate(date);
      if (!rates) throw new Error();
      await applyRates(rates, true);
      setRatesTimestamp(`Historical rates for ${date}`);
      toast({ title: `Rates loaded for ${date}` });
    } catch { toast({ title: "Could not fetch historical rates", variant: "destructive" }); }
    finally { setFetchingHistorical(false); }
  }

  function handleRateSourceChange(field: string, src: "historical" | "live" | "manual") {
    setRateSources(prev => ({ ...prev, [field]: src }));
    if (src === "manual") return;
    if (src === "historical") {
      const date = form.getValues("acquisition_date");
      if (date) fetchRatesForDate(date).then(rates => { if (rates) { const cur = form.getValues(); const map = fieldCurrencyMap(cur); const currency = map[field]; if (currency) form.setValue(field as keyof PricingFormValues, currency === "USD" ? "1" : (rates[currency] ? String((1/rates[currency]).toFixed(8)) : "")); } });
    } else {
      fetch("https://open.er-api.com/v6/latest/USD").then(r => r.json()).then((data: any) => { if (data.result === "success") { const cur = form.getValues(); const map = fieldCurrencyMap(cur); const currency = map[field]; if (currency) form.setValue(field as keyof PricingFormValues, currency === "USD" ? "1" : (data.rates[currency] ? String((1/data.rates[currency]).toFixed(8)) : "")); } });
    }
  }

  const onSubmit = (values: PricingFormValues) => {
    upsert.mutate({
      artworkId,
      data: {
        acquisition_date: values.acquisition_date || undefined,
        acquisition_source: values.acquisition_source || undefined,
        purchase_price: values.purchase_price ? Number(values.purchase_price) : undefined,
        purchase_currency: values.purchase_currency || undefined,
        usd_conversion_rate: values.usd_conversion_rate ? Number(values.usd_conversion_rate) : undefined,
        framing_cost: values.framing_cost ? Number(values.framing_cost) : undefined,
        framing_currency: values.framing_currency || undefined,
        framing_usd_rate: values.framing_usd_rate ? Number(values.framing_usd_rate) : undefined,
        shipping_cost: values.shipping_cost ? Number(values.shipping_cost) : undefined,
        shipping_currency: values.shipping_currency || undefined,
        shipping_usd_rate: values.shipping_usd_rate ? Number(values.shipping_usd_rate) : undefined,
        taxes_cost: values.taxes_cost ? Number(values.taxes_cost) : undefined,
        taxes_currency: values.taxes_currency || undefined,
        taxes_usd_rate: values.taxes_usd_rate ? Number(values.taxes_usd_rate) : undefined,
        other_costs: values.other_costs ? Number(values.other_costs) : undefined,
        other_costs_description: values.other_costs_description || undefined,
        other_currency: values.other_currency || undefined,
        other_usd_rate: values.other_usd_rate ? Number(values.other_usd_rate) : undefined,
        display_currency: values.display_currency || undefined,
        display_currency_rate: values.display_currency_rate ? Number(values.display_currency_rate) : undefined,
        current_value_usd: values.current_value_usd ? Number(values.current_value_usd) : undefined,
        valuation_date: values.valuation_date || undefined,
        valuation_notes: values.valuation_notes || undefined,
      } as any,
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: QK.pricing(artworkId) });
        toast({ title: "Pricing updated" });
        setEditing(false);
      },
    });
  };

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  // Read-only view
  if (!editing) {
    return (
      <div className="space-y-8">
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => setEditing(true)}>
            <Edit2 className="h-3 w-3" />Edit
          </Button>
        </div>
        {pricing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="space-y-4">
              <h3 className="text-xs tracking-widest uppercase text-muted-foreground border-b border-border pb-2">Acquisition</h3>
              {pricing.acquisition_date && (
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Acquisition date</span><span>{pricing.acquisition_date}</span></div>
              )}
              {(pricing as any).acquisition_source && (
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Acquisition source</span><span>{(pricing as any).acquisition_source}</span></div>
              )}
              {pricing.purchase_price ? (
                <div className="rounded border border-border px-4 py-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Purchase price</p>
                  {(pricing.purchase_currency || "USD") === "USD" ? (
                    <p className="text-xl font-serif">{fmt(Number(pricing.purchase_price), "USD")}</p>
                  ) : (
                    <p className="text-xl font-serif">
                      {fmt(Number(pricing.purchase_price), pricing.purchase_currency || "USD")}
                      {pricing.usd_conversion_rate ? (
                        <span className="text-sm font-sans text-muted-foreground ml-2">
                          ({fmt(Number(pricing.purchase_price) * Number(pricing.usd_conversion_rate), "USD")})
                        </span>
                      ) : null}
                    </p>
                  )}
                </div>
              ) : <p className="text-sm text-muted-foreground italic">No pricing recorded.</p>}
            </section>
            <section className="space-y-4">
              <h3 className="text-xs tracking-widest uppercase text-muted-foreground border-b border-border pb-2">Current Valuation</h3>
              {pricing.current_value_usd ? (
                <div className="text-sm space-y-2">
                  <div className="flex justify-between"><span className="text-muted-foreground">Current value</span><span className="text-xl font-serif">{fmt(Number(pricing.current_value_usd))}</span></div>
                  {pricing.valuation_date && <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{pricing.valuation_date}</span></div>}
                </div>
              ) : <p className="text-sm text-muted-foreground italic">No valuation recorded.</p>}
            </section>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No pricing recorded. Click Edit to add.</p>
        )}
      </div>
    );
  }

  // Cost row helper
  const costRow = (
    label: string,
    amtField: keyof PricingFormValues,
    curField: keyof PricingFormValues,
    rateField: keyof PricingFormValues,
    usdEquiv: number | null,
  ) => {
    const selectedCurrency = v[curField] as string;
    const isUSD = selectedCurrency === "USD";
    const rateSource = rateSources[rateField as string] ?? "historical";
    const isManual = rateSource === "manual";
    return (
      <div className="space-y-1">
        <span className="text-xs font-medium text-foreground/80">{label}</span>
        <div className="grid grid-cols-[1fr_80px_1fr_68px] gap-2 items-start">
          <FormField control={form.control} name={amtField} render={({ field }) => (
            <Input type="number" step="0.01" placeholder="0.00" className="h-8 text-sm" {...field} value={field.value as string} onChange={field.onChange} />
          )} />
          <FormField control={form.control} name={curField} render={({ field }) => (
            <Select onValueChange={(val) => {
              field.onChange(val);
              if (val === "USD") { form.setValue(rateField, "1"); return; }
              handleRateSourceChange(rateField as string, rateSources[rateField as string] ?? "historical");
            }} value={field.value as string}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{allCurrencies.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
            </Select>
          )} />
          <div className="space-y-1">
            {!isUSD && (
              <div className="flex rounded-sm overflow-hidden border border-border h-5">
                {(["historical", "live", "manual"] as const).map(src => (
                  <button key={src} type="button" onClick={() => handleRateSourceChange(rateField as string, src)}
                    className={`flex-1 text-[9px] transition-colors ${rateSource === src ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent"}`}
                    title={src === "historical" ? "Rate on acquisition date" : src === "live" ? "Current live rate" : "Enter your own rate"}>
                    {src === "historical" ? "Hist" : src === "live" ? "Live" : "Own"}
                  </button>
                ))}
              </div>
            )}
            <FormField control={form.control} name={rateField} render={({ field }) => (
              <Input type="number" step="0.000001"
                placeholder={isUSD ? "1" : isManual ? "Enter rate → USD" : "rate → USD"}
                disabled={isUSD || !isManual}
                className={`h-8 text-xs ${!isUSD && !isManual ? "bg-muted/30 text-muted-foreground" : ""}`}
                {...field} value={isUSD ? "1" : field.value as string} onChange={field.onChange} />
            )} />
          </div>
          <span className="text-xs text-right text-muted-foreground tabular-nums pt-1">{usdEquiv !== null ? fmt(usdEquiv) : "—"}</span>
        </div>
      </div>
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h3 className="text-xs tracking-widest uppercase text-muted-foreground">Acquisition Cost</h3>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" disabled={fetchingHistorical} onClick={fetchHistoricalRates} className="gap-1.5 h-7 text-xs">
                <RefreshCw className={`h-3 w-3 ${fetchingHistorical ? "animate-spin" : ""}`} />{fetchingHistorical ? "Fetching…" : "Rates on acquisition date"}
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={fetchingRates} onClick={fetchLiveRates} className="gap-1.5 h-7 text-xs">
                <RefreshCw className={`h-3 w-3 ${fetchingRates ? "animate-spin" : ""}`} />{fetchingRates ? "Fetching…" : "Live rates"}
              </Button>
            </div>
          </div>
          {ratesTimestamp && <p className="text-xs text-muted-foreground">{ratesTimestamp}</p>}

          <FormField control={form.control} name="acquisition_date" render={({ field }) => (
            <FormItem>
              <FormLabel>Acquisition Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} onChange={e => {
                  field.onChange(e);
                  const date = e.target.value;
                  if (date) {
                    fetchRatesForDate(date).then(rates => {
                      if (rates) { applyRates(rates, true); setRatesTimestamp(`Historical rates for ${date}`); }
                    });
                  }
                }} className="max-w-[200px]" />
              </FormControl>
            </FormItem>
          )} />

          <FormField control={form.control} name="acquisition_source" render={({ field }) => (
            <FormItem>
              <FormLabel>Acquisition Source</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Auction, Gallery, Private sale, Gift" {...field} className="max-w-sm" />
              </FormControl>
            </FormItem>
          )} />

          <div className="grid grid-cols-[1fr_80px_1fr_68px] gap-2 items-center mb-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Amount</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Currency</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Rate → USD</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide text-right">≈ USD</span>
          </div>
          <div className="space-y-3">
            {costRow("Purchase price", "purchase_price", "purchase_currency", "usd_conversion_rate", purchaseUsd)}
            {costRow("Framing", "framing_cost", "framing_currency", "framing_usd_rate", framingUsd)}
            {costRow("Shipping", "shipping_cost", "shipping_currency", "shipping_usd_rate", shippingUsd)}
            {costRow("Taxes", "taxes_cost", "taxes_currency", "taxes_usd_rate", taxesUsd)}
            {costRow("Other", "other_costs", "other_currency", "other_usd_rate", otherUsd)}
          </div>
          <FormField control={form.control} name="other_costs_description" render={({ field }) => (
            <Input placeholder="Other costs description" className="h-8 text-xs" {...field} />
          )} />
          {totalUsd > 0 && (
            <div className="bg-muted/50 rounded-md px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-medium">Total acquisition cost</span>
              <div className="text-right">
                {v.display_currency && v.display_currency !== "USD" && totalInDisplay !== null && <div className="text-base font-semibold">{fmt(totalInDisplay, v.display_currency)}</div>}
                <div className={v.display_currency !== "USD" ? "text-xs text-muted-foreground" : "text-base font-semibold"}>{fmt(totalUsd)}</div>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h3 className="text-xs tracking-widest uppercase text-muted-foreground border-b border-border pb-2">Current Valuation</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="current_value_usd" render={({ field }) => (<FormItem><FormLabel>Current Value (USD)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="valuation_date" render={({ field }) => (<FormItem><FormLabel>Valuation Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>)} />
          </div>
          <FormField control={form.control} name="valuation_notes" render={({ field }) => (<FormItem><FormLabel>Valuation Notes</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl></FormItem>)} />
        </section>

        <div className="flex gap-2 border-t border-border pt-4">
          <Button type="submit" disabled={upsert.isPending}>{upsert.isPending ? "Saving…" : "Save Pricing"}</Button>
          <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </form>
    </Form>
  );
}

// ─── Loans Tab ────────────────────────────────────────────────────────────────

const loanSchema = z.object({
  loanee: z.string().optional(),
  institution: z.string().optional(),
  purpose: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  notes: z.string().optional(),
});

function LoansTab({ artworkId }: { artworkId: string }) {
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const { data: loans, isLoading } = useListArtworkLoans(artworkId);
  const createLoan = useCreateLoan();
  const updateLoan = useUpdateLoan();
  const form = useForm<z.infer<typeof loanSchema>>({
    resolver: zodResolver(loanSchema),
    defaultValues: { loanee: "", institution: "", purpose: "", start_date: "", end_date: "", notes: "" },
  });

  const onSubmit = (values: z.infer<typeof loanSchema>) => {
    createLoan.mutate({
      artwork_id: artworkId,
      loanee: values.loanee || undefined,
      institution: values.institution || undefined,
      purpose: values.purpose || undefined,
      start_date: values.start_date || undefined,
      end_date: values.end_date || undefined,
      notes: values.notes || undefined,
    } as any, {
      onSuccess: () => { toast({ title: "Loan recorded" }); setShowForm(false); form.reset(); },
    });
  };

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{loans?.length || 0} loan record{loans?.length !== 1 ? "s" : ""}</p>
        <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowForm(!showForm)}><Plus className="h-3 w-3" />Record Loan</Button>
      </div>
      {showForm && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="border border-border p-4 space-y-4">
            <h3 className="text-xs tracking-widest uppercase text-muted-foreground">New Loan</h3>
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="loanee" render={({ field }) => (<FormItem><FormLabel>Loanee</FormLabel><FormControl><Input placeholder="Name or organisation" {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="institution" render={({ field }) => (<FormItem><FormLabel>Institution</FormLabel><FormControl><Input placeholder="Museum, gallery..." {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="start_date" render={({ field }) => (<FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="end_date" render={({ field }) => (<FormItem><FormLabel>Return Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>)} />
            </div>
            <FormField control={form.control} name="purpose" render={({ field }) => (<FormItem><FormLabel>Purpose</FormLabel><FormControl><Input placeholder="Exhibition, study..." {...field} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl></FormItem>)} />
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={createLoan.isPending}>Save</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Form>
      )}
      {!loans?.length && !showForm && <div className="text-center py-10"><CalendarClock className="h-6 w-6 mx-auto mb-2 opacity-20" /><p className="text-sm text-muted-foreground">No loans recorded</p></div>}
      <div className="divide-y divide-border">
        {loans?.map((loan: any) => {
          const days = loan.days_until_return;
          const isOverdue = days !== null && days !== undefined && days < 0 && loan.status === "active";
          return (
            <div key={loan.id} className="py-4 group">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{loan.loanee || loan.institution || "Unknown loanee"}</span>
                    {loan.status === "returned" && <Badge variant="outline" className="text-[10px] uppercase tracking-widest text-muted-foreground">Returned</Badge>}
                    {isOverdue && <Badge variant="destructive" className="text-[10px] uppercase tracking-widest">Overdue</Badge>}
                    {loan.status === "active" && !isOverdue && <Badge variant="outline" className="text-[10px] uppercase tracking-widest text-emerald-600 border-emerald-600/30">Active</Badge>}
                  </div>
                  <div className="flex gap-4 mt-1">
                    {loan.start_date && <span className="text-xs text-muted-foreground">From {loan.start_date}</span>}
                    {loan.end_date && <span className="text-xs text-muted-foreground">Until {loan.end_date}</span>}
                    {loan.status === "active" && days !== null && days !== undefined && (
                      <span className={`text-xs font-medium ${isOverdue ? "text-red-500" : days <= 7 ? "text-amber-600" : "text-emerald-600/80"}`}>
                        {isOverdue ? `${Math.abs(days)} days overdue` : `${days} days remaining`}
                      </span>
                    )}
                  </div>
                </div>
                {loan.status === "active" && (
                  <Button variant="ghost" size="sm" className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => updateLoan.mutate({ id: loan.id, artworkId, data: { status: "returned" } as any }, { onSuccess: () => toast({ title: "Loan marked as returned" }) })}>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ArtworkDetail() {
  const { id } = useParams<{ id: string }>();
  const artworkId = id as string;
  const [editOpen, setEditOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: artwork, isLoading } = useGetArtwork(artworkId);
  const { data: locations } = useListLocations();
  const { data: provenance } = useListProvenance(artworkId);
  const { data: conditionReports } = useListConditionReports(artworkId);
  const { data: documents } = useListDocuments(artworkId);
  const addProvenance = useAddProvenance();
  const deleteProvenance = useDeleteProvenance();
  const addConditionReport = useAddConditionReport();
  const addDocument = useAddDocument();
  const deleteDocument = useDeleteDocument();

  const [provForm, setProvForm] = useState({ date: "", description: "", source: "", price: "", currency: "USD" });
  const [showProvForm, setShowProvForm] = useState(false);
  const [condForm, setCondForm] = useState({ date: "", condition: "", notes: "", inspector: "" });
  const [showCondForm, setShowCondForm] = useState(false);
  const [docForm, setDocForm] = useState({ name: "", type: "", url: "" });
  const [docUploading, setDocUploading] = useState(false);
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const [showDocForm, setShowDocForm] = useState(false);

  if (isLoading) return (
    <div className="space-y-8">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12"><Skeleton className="aspect-square" /><div className="space-y-4"><Skeleton className="h-10 w-3/4" /><Skeleton className="h-4 w-1/2" /></div></div>
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
      <Link href="/artworks" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="h-4 w-4" />Collection</Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-20">
        <div className="aspect-square bg-muted/20 overflow-hidden">
          {artwork.image_url
            ? <img src={artwork.image_url} alt={artwork.title} className="object-contain w-full h-full" />
            : <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground/40 uppercase tracking-widest">No image</div>}
        </div>

        <div className="space-y-8 flex flex-col justify-center">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                {artwork.on_loan && <Badge variant="outline" className="text-[10px] uppercase tracking-widest mb-3">On Loan</Badge>}
                <h1 className="text-[20px] font-serif tracking-tight leading-tight">{artwork.title}</h1>
                {artwork.artist && <p className="text-lg text-muted-foreground mt-2">{artwork.artist}</p>}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setEditOpen(true)}><Edit2 className="h-4 w-4" /></Button>
            </div>
          </div>
          <dl className="space-y-3">
            {artwork.year && <div className="flex justify-between text-sm border-b border-border/50 pb-3"><dt className="text-muted-foreground">Year</dt><dd>{artwork.year}</dd></div>}
            {artwork.medium && <div className="flex justify-between text-sm border-b border-border/50 pb-3"><dt className="text-muted-foreground">Medium</dt><dd>{artwork.medium}</dd></div>}
            {(artwork.edition_number != null || artwork.edition_total != null) && (
              <div className="flex justify-between text-sm border-b border-border/50 pb-3">
                <dt className="text-muted-foreground">Edition</dt>
                <dd>
                  {artwork.edition_number != null && artwork.edition_total != null
                    ? `${artwork.edition_number} / ${artwork.edition_total}`
                    : artwork.edition_number != null
                    ? `No. ${artwork.edition_number}`
                    : `of ${artwork.edition_total}`}
                </dd>
              </div>
            )}
            {(artwork.width || artwork.height) && <div className="flex justify-between text-sm border-b border-border/50 pb-3"><dt className="text-muted-foreground">Dimensions</dt><dd>{formatDimensions(artwork.width ?? null, artwork.height ?? null, artwork.depth ?? null, artwork.dimension_unit ?? null)}</dd></div>}
            {artwork.location_name && <div className="flex justify-between text-sm border-b border-border/50 pb-3"><dt className="text-muted-foreground">Location</dt><dd>{artwork.location_name}</dd></div>}
            {artwork.keywords && (
              <div className="text-sm border-b border-border/50 pb-3">
                <dt className="text-muted-foreground mb-2">Keywords</dt>
                <dd className="flex flex-wrap gap-1.5">{artwork.keywords.split(",").map(k => k.trim()).filter(Boolean).map(kw => <span key={kw} className="inline-block text-xs border border-border bg-muted/30 px-2 py-0.5">{kw}</span>)}</dd>
              </div>
            )}
            {artwork.notes && <div className="text-sm pt-1"><dt className="text-muted-foreground mb-1.5">Notes</dt><dd className="text-foreground/80 leading-relaxed">{artwork.notes}</dd></div>}
          </dl>
        </div>
      </div>

      <Tabs defaultValue="provenance" className="space-y-8">
        <TabsList className="border-b border-border bg-transparent p-0 h-auto gap-8 rounded-none justify-start">
          {[{ value: "provenance", label: "Provenance" }, { value: "condition", label: "Condition" }, { value: "documents", label: "Documents" }, { value: "pricing", label: "Pricing" }, { value: "loans", label: "Loans" }].map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="pb-4 px-0 rounded-none text-sm data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:text-foreground text-muted-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none">{tab.label}</TabsTrigger>
          ))}
        </TabsList>

        {/* Provenance */}
        <TabsContent value="provenance" className="mt-0 space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{provenance?.length || 0} record{provenance?.length !== 1 ? "s" : ""}</p>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowProvForm(!showProvForm)}><Plus className="h-3 w-3" />Add Record</Button>
          </div>
          {showProvForm && (
            <div className="border border-border p-4 space-y-3">
              <h3 className="text-xs tracking-widest uppercase text-muted-foreground">New Provenance Record</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground mb-1 block">Date</label><Input type="date" value={provForm.date} onChange={e => setProvForm(f => ({ ...f, date: e.target.value }))} /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Source</label><Input placeholder="Seller, auction, gallery" value={provForm.source} onChange={e => setProvForm(f => ({ ...f, source: e.target.value }))} /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Price</label><Input type="number" placeholder="0.00" value={provForm.price} onChange={e => setProvForm(f => ({ ...f, price: e.target.value }))} /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Currency</label><Select value={provForm.currency} onValueChange={v => setProvForm(f => ({ ...f, currency: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["USD","EUR","GBP","NGN","CHF","JPY"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Description</label><Textarea rows={2} placeholder="Acquisition details..." value={provForm.description} onChange={e => setProvForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => {
                  addProvenance.mutate({ artwork_id: artworkId, date: provForm.date || undefined, description: provForm.description || undefined, source: provForm.source || undefined, price: provForm.price ? Number(provForm.price) : undefined, currency: provForm.currency || undefined } as any, {
                    onSuccess: () => { toast({ title: "Record added" }); setShowProvForm(false); setProvForm({ date: "", description: "", source: "", price: "", currency: "USD" }); qc.invalidateQueries({ queryKey: QK.provenance(artworkId) }); },
                  });
                }}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowProvForm(false)}>Cancel</Button>
              </div>
            </div>
          )}
          {(!provenance || provenance.length === 0) && !showProvForm && <div className="text-center py-10 text-muted-foreground text-sm">No provenance records</div>}
          <div className="divide-y divide-border">
            {provenance?.map(p => (
              <div key={p.id} className="py-4 group flex justify-between items-start">
                <div>
                  {p.date && <p className="text-xs text-muted-foreground mb-1">{p.date}</p>}
                  {p.description && <p className="text-sm leading-relaxed">{p.description}</p>}
                  <div className="flex gap-4 mt-1">
                    {p.source && <span className="text-xs text-muted-foreground">Source: {p.source}</span>}
                    {p.price && <span className="text-xs text-muted-foreground">{fmt(p.price, p.currency || "USD")}</span>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive" onClick={() => deleteProvenance.mutate({ id: p.id, artworkId }, { onSuccess: () => qc.invalidateQueries({ queryKey: QK.provenance(artworkId) }) })}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Condition */}
        <TabsContent value="condition" className="mt-0 space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{conditionReports?.length || 0} report{conditionReports?.length !== 1 ? "s" : ""}</p>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowCondForm(!showCondForm)}><Plus className="h-3 w-3" />Add Report</Button>
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
                  addConditionReport.mutate({ artwork_id: artworkId, date: condForm.date || undefined, condition: condForm.condition || undefined, notes: condForm.notes || undefined, inspector: condForm.inspector || undefined } as any, {
                    onSuccess: () => { toast({ title: "Report added" }); setShowCondForm(false); setCondForm({ date: "", condition: "", notes: "", inspector: "" }); qc.invalidateQueries({ queryKey: QK.conditionReports(artworkId) }); },
                  });
                }}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowCondForm(false)}>Cancel</Button>
              </div>
            </div>
          )}
          {(!conditionReports || conditionReports.length === 0) && !showCondForm && <div className="text-center py-10 text-muted-foreground text-sm">No condition reports</div>}
          <div className="divide-y divide-border">
            {conditionReports?.map(c => (
              <div key={c.id} className="py-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">{c.condition && <Badge variant="outline" className="text-xs">{c.condition}</Badge>}{c.date && <span className="text-xs text-muted-foreground">{c.date}</span>}</div>
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
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowDocForm(!showDocForm)}><Plus className="h-3 w-3" />Add Document</Button>
          </div>
          {showDocForm && (
            <div className="border border-border p-4 space-y-3">
              <h3 className="text-xs tracking-widest uppercase text-muted-foreground">Add Document</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground mb-1 block">Name</label><Input placeholder="Certificate, Invoice..." value={docForm.name} onChange={e => setDocForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Type</label><Input placeholder="PDF, Image, Invoice..." value={docForm.type} onChange={e => setDocForm(f => ({ ...f, type: e.target.value }))} /></div>
              </div>
              {/* File upload */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Upload file (image or PDF)</label>
                <div
                  className="border border-dashed border-border p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => docFileInputRef.current?.click()}
                >
                  {docForm.url ? (
                    <div className="space-y-2">
                      {docForm.url.startsWith("data:image") ? (
                        <img src={docForm.url} alt="Preview" className="max-h-24 mx-auto object-contain" />
                      ) : (
                        <p className="text-xs text-muted-foreground">File attached</p>
                      )}
                      <p className="text-xs text-primary hover:underline">Click to replace</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-muted-foreground">Click to upload image or PDF</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">Or paste a URL below</p>
                    </div>
                  )}
                  <input
                    ref={docFileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={async e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setDocUploading(true);
                      if (!docForm.name) setDocForm(f => ({ ...f, name: file.name.replace(/\.[^.]+$/, ""), type: file.type.includes("pdf") ? "PDF" : "Image" }));
                      const reader = new FileReader();
                      reader.onload = ev => { setDocForm(f => ({ ...f, url: ev.target?.result as string })); setDocUploading(false); };
                      reader.readAsDataURL(file);
                    }}
                  />
                </div>
              </div>
              {/* Or paste URL */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Or paste a URL</label>
                <Input placeholder="https://..." value={docForm.url.startsWith("data:") ? "" : docForm.url} onChange={e => setDocForm(f => ({ ...f, url: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" disabled={!docForm.name || docUploading} onClick={() => {
                  addDocument.mutate({ artwork_id: artworkId, name: docForm.name, type: docForm.type || undefined, url: docForm.url || undefined } as any, {
                    onSuccess: () => { toast({ title: "Document added" }); setShowDocForm(false); setDocForm({ name: "", type: "", url: "" }); qc.invalidateQueries({ queryKey: QK.documents(artworkId) }); },
                  });
                }}>{docUploading ? "Uploading..." : "Save"}</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowDocForm(false)}>Cancel</Button>
              </div>
            </div>
          )}
          {(!documents || documents.length === 0) && !showDocForm && <div className="text-center py-10 text-muted-foreground text-sm">No documents</div>}
          <div className="divide-y divide-border">
            {documents?.map(doc => (
              <div key={doc.id} className="py-4 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  {doc.url && doc.url.startsWith("data:image") ? (
                    <img src={doc.url} alt={doc.name} className="h-10 w-10 object-cover flex-shrink-0 border border-border" />
                  ) : (
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <div>
                    <p className="text-sm">{doc.name}</p>
                    {doc.type && <p className="text-xs text-muted-foreground">{doc.type}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {doc.url && (
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                      {doc.url.startsWith("data:") ? "View" : "Open"}
                    </a>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive" onClick={() => deleteDocument.mutate({ id: doc.id, artworkId }, { onSuccess: () => qc.invalidateQueries({ queryKey: QK.documents(artworkId) }) })}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pricing" className="mt-0"><PricingTab artworkId={artworkId} /></TabsContent>
        <TabsContent value="loans" className="mt-0"><LoansTab artworkId={artworkId} /></TabsContent>
      </Tabs>

      <EditDialog artwork={artwork} open={editOpen} onClose={() => setEditOpen(false)} locations={locations || []} />
    </div>
  );
}
