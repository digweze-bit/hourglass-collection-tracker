import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Download, Trash2, Wifi, CloudOff, RefreshCw } from "lucide-react";
import { syncForOffline, getLastSyncedAt, getCacheSize, clearOfflineData, isOnline, type SyncProgress } from "@/lib/offline-sync";

export function OfflineSettingsSection() {
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [cacheSize, setCacheSize] = useState<{ usageMB: string; quotaMB: string } | null>(null);
  const [wifiOnly, setWifiOnly] = useState(true);
  const [online, setOnline] = useState(isOnline());

  async function refreshStatus() {
    setLastSynced(await getLastSyncedAt());
    setCacheSize(await getCacheSize());
  }

  useEffect(() => {
    refreshStatus();
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  async function handleSync() {
    if (!online) {
      toast({ title: "You're offline", description: "Connect to the internet to sync.", variant: "destructive" });
      return;
    }
    setSyncing(true);
    setProgress({ stage: "Starting...", current: 0, total: 1 });
    const result = await syncForOffline({
      includeImages: true,
      onProgress: setProgress,
    });
    setSyncing(false);
    setProgress(null);
    if (result.success) {
      const total = Object.values(result.tablesCount).reduce((s, n) => s + n, 0);
      toast({ title: "Offline sync complete", description: `${total} records cached for offline use.` });
      refreshStatus();
    } else {
      toast({ title: "Sync failed", description: result.error, variant: "destructive" });
    }
  }

  async function handleClear() {
    await clearOfflineData();
    toast({ title: "Offline data cleared" });
    refreshStatus();
  }

  return (
    <section className="space-y-5 border-t border-border pt-6">
      <div>
        <h2 className="text-base font-medium mb-1 flex items-center gap-2">
          {online ? <Wifi className="h-4 w-4 text-muted-foreground" /> : <CloudOff className="h-4 w-4 text-amber-500" />}
          Offline Access
        </h2>
        <p className="text-sm text-muted-foreground">
          Download your collection so you can browse it without an internet connection. Editing requires being online.
        </p>
      </div>

      {!online && (
        <div className="border border-amber-200 bg-amber-50/50 px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
          <CloudOff className="h-4 w-4 flex-shrink-0" />
          You're currently offline. Showing last-synced data.
        </div>
      )}

      <div className="border border-border p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Last synced</span>
          <span>{lastSynced ? new Date(lastSynced).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never"}</span>
        </div>
        {cacheSize && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Storage used</span>
            <span>{cacheSize.usageMB} MB {cacheSize.quotaMB !== "0" ? `of ~${cacheSize.quotaMB} MB available` : ""}</span>
          </div>
        )}
      </div>

      {syncing && progress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><RefreshCw className="h-3 w-3 animate-spin" />{progress.stage}</span>
            <span>{progress.current} / {progress.total}</span>
          </div>
          <Progress value={(progress.current / progress.total) * 100} className="h-1.5" />
        </div>
      )}

      <div className="flex items-start gap-3">
        <Checkbox id="wifi-only" checked={wifiOnly} onCheckedChange={c => setWifiOnly(c === true)} />
        <div>
          <Label htmlFor="wifi-only" className="text-sm font-medium cursor-pointer">Only sync images on Wi-Fi</Label>
          <p className="text-xs text-muted-foreground mt-0.5">Recommended if your collection has many high-resolution images, to avoid using mobile data.</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={handleSync} disabled={syncing || !online} size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          {syncing ? "Syncing..." : "Sync for offline"}
        </Button>
        {lastSynced && (
          <Button onClick={handleClear} disabled={syncing} variant="outline" size="sm" className="gap-2 text-muted-foreground">
            <Trash2 className="h-4 w-4" />Clear offline data
          </Button>
        )}
      </div>
    </section>
  );
}
