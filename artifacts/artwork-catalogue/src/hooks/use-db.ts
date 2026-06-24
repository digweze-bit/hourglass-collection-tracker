import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

export type Artwork = {
  id: string;
  title: string;
  artist: string | null;
  year: number | null;
  medium: string | null;
  keywords: string | null;
  width: number | null;
  height: number | null;
  depth: number | null;
  dimension_unit: string | null;
  image_url: string | null;
  notes: string | null;
  location_id: string | null;
  on_loan: boolean;
  created_at: string;
  location_name?: string | null;
};

export type Location = {
  id: string;
  name: string;
  parent_id: string | null;
  description: string | null;
  artwork_count?: number;
  children?: Location[];
};

export type Loan = {
  id: string;
  artwork_id: string;
  loanee: string | null;
  institution: string | null;
  purpose: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  notes: string | null;
  days_until_return?: number | null;
  artwork_title?: string;
  artwork_artist?: string | null;
  artwork_image_url?: string | null;
};

export type Provenance = {
  id: string;
  artwork_id: string;
  date: string | null;
  description: string | null;
  source: string | null;
  price: number | null;
  currency: string | null;
};

export type ConditionReport = {
  id: string;
  artwork_id: string;
  date: string | null;
  condition: string | null;
  notes: string | null;
  inspector: string | null;
};

export type Document = {
  id: string;
  artwork_id: string;
  name: string;
  type: string | null;
  url: string | null;
};

export type Pricing = {
  id: string;
  artwork_id: string;
  acquisition_date: string | null;
  purchase_price: number | null;
  purchase_currency: string | null;
  usd_conversion_rate: number | null;
  purchase_price_usd: number | null;
  framing_cost: number | null;
  framing_currency: string | null;
  framing_usd_rate: number | null;
  shipping_cost: number | null;
  shipping_currency: string | null;
  shipping_usd_rate: number | null;
  taxes_cost: number | null;
  taxes_currency: string | null;
  taxes_usd_rate: number | null;
  other_costs: number | null;
  other_costs_description: string | null;
  other_currency: string | null;
  other_usd_rate: number | null;
  display_currency: string | null;
  display_currency_rate: number | null;
  total_purchase_value_usd: number | null;
  total_cost_in_currency: number | null;
  current_value_usd: number | null;
  valuation_date: string | null;
  valuation_notes: string | null;
};

export type Goal = {
  id: string;
  title: string;
  description: string | null;
  last_analysis: string | null;
  last_analysis_at: string | null;
  created_at: string;
};

// ─── Query keys ──────────────────────────────────────────────────────────────

export const QK = {
  artworks: (params?: object) => ["artworks", params ?? {}],
  artwork: (id: string) => ["artwork", id],
  locations: () => ["locations"],
  locationArtworks: (id: string) => ["location-artworks", id],
  loans: () => ["loans"],
  artworkLoans: (id: string) => ["artwork-loans", id],
  provenance: (id: string) => ["provenance", id],
  conditionReports: (id: string) => ["condition-reports", id],
  documents: (id: string) => ["documents", id],
  pricing: (id: string) => ["pricing", id],
  goals: () => ["goals"],
  summary: () => ["summary"],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildLocationTree(flat: Location[]): Location[] {
  const map = new Map<string, Location>();
  flat.forEach((l) => map.set(l.id, { ...l, children: [] }));
  const roots: Location[] = [];
  flat.forEach((l) => {
    const node = map.get(l.id)!;
    if (l.parent_id && map.has(l.parent_id)) {
      map.get(l.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

async function getLocationNameMap(): Promise<Map<string, string>> {
  const { data } = await supabase.from("locations").select("id, name");
  const map = new Map<string, string>();
  (data || []).forEach((l: { id: string; name: string }) => map.set(l.id, l.name));
  return map;
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

// ─── Artworks ────────────────────────────────────────────────────────────────

export function useListArtworks(params?: {
  search?: string;
  medium?: string;
  onLoan?: boolean;
  locationId?: string;
  artist?: string;
}) {
  return useQuery({
    queryKey: QK.artworks(params),
    queryFn: async () => {
      let q = supabase.from("artworks").select("*").order("created_at", { ascending: false });
      if (params?.search) q = q.or(`title.ilike.%${params.search}%,artist.ilike.%${params.search}%`);
      if (params?.medium) q = q.eq("medium", params.medium);
      if (params?.onLoan !== undefined) q = q.eq("on_loan", params.onLoan);
      if (params?.locationId) q = q.eq("location_id", params.locationId);
      if (params?.artist) q = q.eq("artist", params.artist);
      const { data, error } = await q;
      if (error) throw error;
      const locMap = await getLocationNameMap();
      return (data || []).map((a) => ({
        ...a,
        location_name: a.location_id ? locMap.get(a.location_id) ?? null : null,
      })) as Artwork[];
    },
  });
}

export function useGetArtwork(id: string) {
  return useQuery({
    queryKey: QK.artwork(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("artworks").select("*").eq("id", id).single();
      if (error) throw error;
      const locMap = await getLocationNameMap();
      return {
        ...data,
        location_name: data.location_id ? locMap.get(data.location_id) ?? null : null,
      } as Artwork;
    },
    enabled: !!id,
  });
}

export function useCreateArtwork() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Artwork>) => {
      const { data, error } = await supabase.from("artworks").insert([input]).select().single();
      if (error) throw error;
      return data as Artwork;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["artworks"] }),
  });
}

export function useUpdateArtwork() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Artwork> }) => {
      const { error } = await supabase.from("artworks").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ["artworks"] });
      qc.invalidateQueries({ queryKey: QK.artwork(id) });
    },
  });
}

export function useDeleteArtwork() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("artworks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["artworks"] }),
  });
}

// ─── Summary ─────────────────────────────────────────────────────────────────

export function useGetSummary() {
  return useQuery({
    queryKey: QK.summary(),
    queryFn: async () => {
      const { data: artworks } = await supabase.from("artworks").select("*");
      const { data: pricing } = await supabase.from("pricing").select("artwork_id, current_value_usd");
      const locMap = await getLocationNameMap();
      const all = artworks || [];
      const priceMap = new Map<string, number>();
      (pricing || []).forEach((p: { artwork_id: string; current_value_usd: number | null }) => {
        if (p.current_value_usd) priceMap.set(p.artwork_id, p.current_value_usd);
      });
      const totalCurrentValueUsd = Array.from(priceMap.values()).reduce((s, v) => s + v, 0);
      const onLoanCount = all.filter((a) => a.on_loan).length;
      const mediumMap = new Map<string, number>();
      all.forEach((a) => { const m = a.medium || "Unspecified"; mediumMap.set(m, (mediumMap.get(m) ?? 0) + 1); });
      const byMedium = Array.from(mediumMap.entries()).map(([medium, count]) => ({ medium, count })).sort((a, b) => b.count - a.count);
      const locationCountMap = new Map<string, number>();
      all.forEach((a) => { if (a.location_id) locationCountMap.set(a.location_id, (locationCountMap.get(a.location_id) ?? 0) + 1); });
      const byLocation = Array.from(locationCountMap.entries()).map(([id, count]) => ({ locationId: id, locationName: locMap.get(id) ?? "Unknown", count }));
      const recentlyAdded = [...all].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8).map((a) => ({ ...a, location_name: a.location_id ? locMap.get(a.location_id) ?? null : null }));
      return { totalArtworks: all.length, totalCurrentValueUsd, onLoanCount, byMedium, byLocation, recentlyAdded };
    },
  });
}

// ─── Locations ───────────────────────────────────────────────────────────────

export function useListLocations() {
  return useQuery({
    queryKey: QK.locations(),
    queryFn: async () => {
      const { data: locs, error } = await supabase.from("locations").select("*").order("name");
      if (error) throw error;
      const { data: artworks } = await supabase.from("artworks").select("location_id");
      const countMap = new Map<string, number>();
      (artworks || []).forEach((a: { location_id: string | null }) => { if (a.location_id) countMap.set(a.location_id, (countMap.get(a.location_id) ?? 0) + 1); });
      const flat = (locs || []).map((l) => ({ ...l, artwork_count: countMap.get(l.id) ?? 0 }));
      return buildLocationTree(flat);
    },
  });
}

export function useGetLocationArtworks(locationId: string) {
  return useQuery({
    queryKey: QK.locationArtworks(locationId),
    queryFn: async () => {
      const { data, error } = await supabase.from("artworks").select("*").eq("location_id", locationId);
      if (error) throw error;
      return data as Artwork[];
    },
    enabled: !!locationId,
  });
}

export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; parent_id?: string; description?: string }) => {
      const { data, error } = await supabase.from("locations").insert([input]).select().single();
      if (error) throw error;
      return data as Location;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.locations() }),
  });
}

export function useUpdateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Location> }) => {
      const { error } = await supabase.from("locations").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.locations() }),
  });
}

export function useDeleteLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("locations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.locations() }),
  });
}

// ─── Loans ───────────────────────────────────────────────────────────────────

export function useListLoans() {
  return useQuery({
    queryKey: QK.loans(),
    queryFn: async () => {
      const { data, error } = await supabase.from("loans").select("*, artworks(title, artist, image_url)").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((l: any) => ({
        ...l,
        artwork_title: l.artworks?.title,
        artwork_artist: l.artworks?.artist,
        artwork_image_url: l.artworks?.image_url,
        days_until_return: daysUntil(l.end_date),
      }));
    },
  });
}

export function useListArtworkLoans(artworkId: string) {
  return useQuery({
    queryKey: QK.artworkLoans(artworkId),
    queryFn: async () => {
      const { data, error } = await supabase.from("loans").select("*").eq("artwork_id", artworkId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((l) => ({ ...l, days_until_return: daysUntil(l.end_date) }));
    },
    enabled: !!artworkId,
  });
}

export function useCreateLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Loan>) => {
      const { data, error } = await supabase.from("loans").insert([input]).select().single();
      if (error) throw error;
      await supabase.from("artworks").update({ on_loan: true }).eq("id", input.artwork_id!);
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: QK.loans() });
      if (vars.artwork_id) {
        qc.invalidateQueries({ queryKey: QK.artworkLoans(vars.artwork_id) });
        qc.invalidateQueries({ queryKey: QK.artwork(vars.artwork_id) });
      }
    },
  });
}

export function useUpdateLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, artworkId, data }: { id: string; artworkId: string; data: Partial<Loan> }) => {
      const { error } = await supabase.from("loans").update(data).eq("id", id);
      if (error) throw error;
      if (data.status === "returned") {
        await supabase.from("artworks").update({ on_loan: false }).eq("id", artworkId);
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: QK.loans() });
      qc.invalidateQueries({ queryKey: QK.artworkLoans(vars.artworkId) });
      qc.invalidateQueries({ queryKey: QK.artwork(vars.artworkId) });
    },
  });
}

// ─── Provenance ──────────────────────────────────────────────────────────────

export function useListProvenance(artworkId: string) {
  return useQuery({
    queryKey: QK.provenance(artworkId),
    queryFn: async () => {
      const { data, error } = await supabase.from("provenance").select("*").eq("artwork_id", artworkId).order("date", { ascending: false });
      if (error) throw error;
      return data as Provenance[];
    },
    enabled: !!artworkId,
  });
}

export function useAddProvenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Provenance>) => {
      const { data, error } = await supabase.from("provenance").insert([input]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: QK.provenance(vars.artwork_id!) }),
  });
}

export function useDeleteProvenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, artworkId }: { id: string; artworkId: string }) => {
      const { error } = await supabase.from("provenance").delete().eq("id", id);
      if (error) throw error;
      return artworkId;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: QK.provenance(vars.artworkId) }),
  });
}

// ─── Condition reports ────────────────────────────────────────────────────────

export function useListConditionReports(artworkId: string) {
  return useQuery({
    queryKey: QK.conditionReports(artworkId),
    queryFn: async () => {
      const { data, error } = await supabase.from("condition_reports").select("*").eq("artwork_id", artworkId).order("date", { ascending: false });
      if (error) throw error;
      return data as ConditionReport[];
    },
    enabled: !!artworkId,
  });
}

export function useAddConditionReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ConditionReport>) => {
      const { data, error } = await supabase.from("condition_reports").insert([input]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: QK.conditionReports(vars.artwork_id!) }),
  });
}

// ─── Documents ───────────────────────────────────────────────────────────────

export function useListDocuments(artworkId: string) {
  return useQuery({
    queryKey: QK.documents(artworkId),
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*").eq("artwork_id", artworkId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Document[];
    },
    enabled: !!artworkId,
  });
}

export function useAddDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Document>) => {
      const { data, error } = await supabase.from("documents").insert([input]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: QK.documents(vars.artwork_id!) }),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, artworkId }: { id: string; artworkId: string }) => {
      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) throw error;
      return artworkId;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: QK.documents(vars.artworkId) }),
  });
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

export function useGetPricing(artworkId: string) {
  return useQuery({
    queryKey: QK.pricing(artworkId),
    queryFn: async () => {
      const { data, error } = await supabase.from("pricing").select("*").eq("artwork_id", artworkId).maybeSingle();
      if (error) throw error;
      return data as Pricing | null;
    },
    enabled: !!artworkId,
  });
}

export function useUpsertPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ artworkId, data }: { artworkId: string; data: Partial<Pricing> }) => {
      const { error } = await supabase.from("pricing").upsert({ ...data, artwork_id: artworkId }, { onConflict: "artwork_id" });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: QK.pricing(vars.artworkId) }),
  });
}

// ─── Goals ───────────────────────────────────────────────────────────────────

export function useListGoals() {
  return useQuery({
    queryKey: QK.goals(),
    queryFn: async () => {
      const { data, error } = await supabase.from("goals").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Goal[];
    },
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; description?: string }) => {
      const { data, error } = await supabase.from("goals").insert([input]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.goals() }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.goals() }),
  });
}
