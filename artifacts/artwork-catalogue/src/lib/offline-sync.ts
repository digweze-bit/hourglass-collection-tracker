import { supabase } from "@/lib/supabase";
import { putAll, setMeta, getMeta, clearAll, getStorageEstimate } from "@/lib/offline-db";

export type SyncProgress = {
  stage: string;
  current: number;
  total: number;
};

export type SyncOptions = {
  includeImages?: boolean;
  onProgress?: (p: SyncProgress) => void;
};

const IMAGE_CACHE_NAME = "hourglass-images-v1";

async function cacheImage(url: string): Promise<void> {
  if (!url || url.startsWith("data:")) return; // skip legacy base64, nothing to fetch
  try {
    const cache = await caches.open(IMAGE_CACHE_NAME);
    const existing = await cache.match(url);
    if (existing) return; // already cached
    await cache.add(url);
  } catch {
    // ignore individual image failures, don't block sync
  }
}

export async function syncForOffline(options: SyncOptions = {}): Promise<{ success: boolean; error?: string; tablesCount: Record<string, number> }> {
  const { includeImages = true, onProgress } = options;
  const tablesCount: Record<string, number> = {};

  try {
    const tables = ["artworks", "locations", "loans", "provenance", "condition_reports", "documents", "pricing", "goals"] as const;

    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      onProgress?.({ stage: `Syncing ${table.replace("_", " ")}`, current: i, total: tables.length + (includeImages ? 1 : 0) });
      const { data, error } = await supabase.from(table).select("*");
      if (error) throw error;
      await putAll(table as any, data || []);
      tablesCount[table] = (data || []).length;
    }

    if (includeImages) {
      const artworks = await getAllArtworksFromCache();
      const imageUrls = artworks.map((a: any) => a.image_url).filter(Boolean);
      onProgress?.({ stage: "Caching images", current: tables.length, total: tables.length + 1 });
      // Cache in small batches to avoid overwhelming the network
      const batchSize = 6;
      for (let i = 0; i < imageUrls.length; i += batchSize) {
        await Promise.all(imageUrls.slice(i, i + batchSize).map(cacheImage));
      }
    }

    await setMeta("lastSyncedAt", new Date().toISOString());
    onProgress?.({ stage: "Complete", current: tables.length + (includeImages ? 1 : 0), total: tables.length + (includeImages ? 1 : 0) });

    return { success: true, tablesCount };
  } catch (err: any) {
    return { success: false, error: err.message || "Sync failed", tablesCount };
  }
}

async function getAllArtworksFromCache() {
  const { getAll } = await import("@/lib/offline-db");
  return getAll("artworks" as any);
}

export async function getLastSyncedAt(): Promise<string | null> {
  return getMeta("lastSyncedAt");
}

export async function getCacheSize(): Promise<{ usage: number; quota: number; usageMB: string; quotaMB: string } | null> {
  const est = await getStorageEstimate();
  if (!est) return null;
  return {
    ...est,
    usageMB: (est.usage / 1024 / 1024).toFixed(1),
    quotaMB: (est.quota / 1024 / 1024).toFixed(0),
  };
}

export async function clearOfflineData(): Promise<void> {
  await clearAll();
  await setMeta("lastSyncedAt", null);
  if ("caches" in window) {
    await caches.delete(IMAGE_CACHE_NAME);
  }
}

export function isOnline(): boolean {
  return navigator.onLine;
}

export function isWifi(): boolean {
  const conn = (navigator as any).connection;
  if (!conn) return true; // assume WiFi if API unavailable
  return conn.type === "wifi" || conn.effectiveType === "4g";
}
