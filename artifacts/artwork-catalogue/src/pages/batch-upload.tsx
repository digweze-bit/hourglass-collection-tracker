import { useState, useCallback, useMemo, useRef } from "react";
import { useCreateArtwork, useListArtworks, useListLocations } from "@/hooks/use-db";
import { useQueryClient } from "@tanstack/react-query";
import { resizeAndUpload } from "@/lib/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import type { Location } from "@/hooks/use-db";

function flattenLocations(locs: Location[], depth = 0): { id: string; name: string; indent: string }[] {
  if (!Array.isArray(locs)) return [];
  return locs.flatMap(loc => [
    { id: loc.id, name: loc.name, indent: depth > 0 ? "\u00a0".repeat(depth * 3) + "↳ " : "" },
    ...flattenLocations(loc.children || [], depth + 1),
  ]);
}

async function readImageMeta(file: File): Promise<{ title?: string; artist?: string; year?: string }> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const result: Record<string, string> = {};
      try {
        const buf = e.target?.result as ArrayBuffer;
        const bytes = new Uint8Array(buf);
        if (bytes[0] === 0xff && bytes[1] === 0xd8) {
          let offset = 2;
          while (offset < bytes.length - 2) {
            if (bytes[offset] !== 0xff) break;
            const marker = bytes[offset + 1];
            const segLen = (bytes[offset + 2] << 8) | bytes[offset + 3];
            const segData = bytes.slice(offset + 4, offset + 2 + segLen);
            if (marker === 0xed) {
              let i = 0;
              while (i < segData.length - 4) {
                if (segData[i] === 0x1c && segData[i + 1] === 0x02) {
                  const dsNum = segData[i + 2];
                  const dsLen = (segData[i + 3] << 8) | segData[i + 4];
                  const val = new TextDecoder("utf-8", { fatal: false }).decode(segData.slice(i + 5, i + 5 + dsLen)).replace(/\0/g, "").trim();
                  if (dsNum === 5 && val) result.title = val;
                  if (dsNum === 80 && val) result.artist = val;
                  if (dsNum === 55 && val) result.year = val.slice(0, 4);
                  i += 5 + dsLen;
                } else { i++; }
              }
            }
            offset += 2 + segLen;
          }
        }
        if (!result.title) {
          const base = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
          result.title = base.charAt(0).toUpperCase() + base.slice(1);
        }
      } catch {}
      resolve(result);
    };
    reader.onerror = () => resolve({});
    reader.readAsArrayBuffer(file);
  });
}

type FocalPosition = "top" | "center" | "bottom";
type UploadItem = {
  id: string; file: File; previewUrl: string;
  title: string; artist: string; year: string; medium: string;
  width: string; height: string; depth: string; dimensionUnit: string;
  locationId: string; focalPosition: FocalPosition;
  status: "pending" | "uploading" | "done" | "error";
  error?: string; expanded: boolean;
};

function AutocompleteInput({ id, suggestions, value, onChange, placeholder }: {
  id: string; suggestions: string[]; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <>
      <Input list={`${id}-list`} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="h-8 text-sm" />
      <datalist id={`${id}-list`}>{suggestions.map(s => <option key={s} value={s} />)}</datalist>
    </>
  );
}

function FocalThumbnail({ src, focal, onChange }: { src: string; focal: FocalPosition; onChange: (f: FocalPosition) => void }) {
  const posMap: Record<FocalPosition, string> = { top: "object-top", center: "object-center", bottom: "object-bottom" };
  return (
    <div className="flex flex-col gap-1">
      <div className="h-14 w-14 overflow-hidden bg-muted flex-shrink-0">
        <img src={src} alt="" className={`object-cover w-full h-full ${posMap[focal]}`} />
      </div>
      <div className="flex gap-0.5">
        {(["top", "center", "bottom"] as FocalPosition[]).map(pos => (
          <button key={pos} type="button" onClick={() => onChange(pos)}
            className={`flex-1 h-1.5 rounded-sm transition-colors ${focal === pos ? "bg-primary" : "bg-muted-foreground/30 hover:bg-muted-foreground/60"}`} />
        ))}
      </div>
      <p className="text-[9px] text-muted-foreground text-center">{focal}</p>
    </div>
  );
}

export default function BatchUpload() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const createArtwork = useCreateArtwork();
  const { data: allArtworks } = useListArtworks();
  const { data: locations } = useListLocations();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const artistSuggestions = useMemo(() => [...new Set((allArtworks || []).map(a => a.artist).filter((a): a is string => !!a))].sort(), [allArtworks]);
  const mediumSuggestions = useMemo(() => [...new Set((allArtworks || []).map(a => a.medium).filter((m): m is string => !!m))].sort(), [allArtworks]);
  const flatLocations = flattenLocations(Array.isArray(locations) ? locations : []);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (!imageFiles.length) return;
    const newItems: UploadItem[] = await Promise.all(imageFiles.map(async file => {
      const meta = await readImageMeta(file);
      return {
        id: `${Date.now()}-${Math.random()}`, file,
        previewUrl: URL.createObjectURL(file),
        title: meta.title || "", artist: meta.artist || "", year: meta.year || "",
        medium: "", width: "", height: "", depth: "", dimensionUnit: "cm",
        locationId: "", focalPosition: "center" as FocalPosition,
        status: "pending" as const, expanded: true,
      };
    }));
    setItems(prev => [...prev, ...newItems]);
  }, []);

  const updateItem = (id: string, patch: Partial<UploadItem>) =>
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  const removeItem = (id: string) => setItems(prev => prev.filter(it => it.id !== id));

  const handleSubmitAll = async () => {
    const pending = items.filter(it => it.status === "pending");
    if (!pending.length) return;
    setSubmitting(true);
    for (const item of pending) {
      updateItem(item.id, { status: "uploading" });
      try {
        // Resize and upload to Supabase Storage
        const image_url = await resizeAndUpload(item.file, 1200, 0.82);
        await new Promise<void>((resolve, reject) => {
          createArtwork.mutate({
            title: item.title || item.file.name,
            artist: item.artist || undefined,
            year: item.year ? Number(item.year) : undefined,
            medium: item.medium || undefined,
            width: item.width ? Number(item.width) : undefined,
            height: item.height ? Number(item.height) : undefined,
            depth: item.depth ? Number(item.depth) : undefined,
            dimension_unit: item.dimensionUnit || "cm",
            image_url,
            location_id: item.locationId && item.locationId !== "none" ? item.locationId : undefined,
          } as any, {
            onSuccess: () => resolve(),
            onError: (err: unknown) => reject(err),
          });
        });
        updateItem(item.id, { status: "done" });
      } catch (err: any) {
        updateItem(item.id, { status: "error", error: err?.message || "Upload failed" });
      }
    }
    qc.invalidateQueries({ queryKey: ["artworks"] });
    setSubmitting(false);
    toast({ title: "Batch upload complete" });
  };

  const pendingCount = items.filter(it => it.status === "pending").length;
  const doneCount = items.filter(it => it.status === "done").length;

  return (
    <div className="space-y-10 max-w-3xl">
      <header>
        <h1 className="text-3xl font-serif tracking-tight">Batch Upload</h1>
        <p className="text-muted-foreground mt-1 font-light">Upload multiple artworks at once. Images are auto-resized to max 1200px before upload.</p>
      </header>

      <div
        onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-border hover:border-primary/50 transition-colors p-12 text-center cursor-pointer"
      >
        <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm font-medium">Drop images here or click to browse</p>
        <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WebP · Auto-resized · IPTC tags auto-read</p>
        <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={e => e.target.files && handleFiles(e.target.files)} />
      </div>

      {items.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{items.length} image{items.length !== 1 ? "s" : ""} · {doneCount} saved</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setItems([])} disabled={submitting}>Clear all</Button>
              <Button size="sm" onClick={handleSubmitAll} disabled={submitting || pendingCount === 0}>
                {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</> : `Save ${pendingCount} artwork${pendingCount !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </div>

          {items.map(item => (
            <div key={item.id} className="border border-border">
              <div className="flex items-center gap-4 p-3">
                <FocalThumbnail src={item.previewUrl} focal={item.focalPosition} onChange={f => updateItem(item.id, { focalPosition: f })} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title || item.file.name}</p>
                  <p className="text-xs text-muted-foreground">{item.artist || "No artist"}{item.year ? ` · ${item.year}` : ""}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.status === "done" && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {item.status === "error" && <AlertCircle className="h-4 w-4 text-destructive" title={item.error} />}
                  {item.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {item.status === "pending" && (
                    <button onClick={() => updateItem(item.id, { expanded: !item.expanded })} className="p-1 text-muted-foreground hover:text-foreground">
                      {item.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  )}
                  <button onClick={() => removeItem(item.id)} className="p-1 text-muted-foreground hover:text-destructive" disabled={item.status === "uploading"}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {item.expanded && item.status === "pending" && (
                <div className="border-t border-border px-3 pb-3 pt-3 grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">Title</label>
                    <Input value={item.title} onChange={e => updateItem(item.id, { title: e.target.value })} placeholder="Artwork title" className="h-8 text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">Artist</label>
                    <AutocompleteInput id={`artist-${item.id}`} suggestions={artistSuggestions} value={item.artist} onChange={v => updateItem(item.id, { artist: v })} placeholder="Artist name" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">Year</label>
                    <Input type="number" value={item.year} onChange={e => updateItem(item.id, { year: e.target.value })} placeholder="Year" className="h-8 text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">Medium</label>
                    <AutocompleteInput id={`medium-${item.id}`} suggestions={mediumSuggestions} value={item.medium} onChange={v => updateItem(item.id, { medium: v })} placeholder="e.g. Oil on canvas" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">Dimensions (H × W × D)</label>
                    <div className="grid grid-cols-4 gap-2">
                      <Input type="number" step="0.1" value={item.height} onChange={e => updateItem(item.id, { height: e.target.value })} placeholder="H" className="h-8 text-sm" />
                      <Input type="number" step="0.1" value={item.width} onChange={e => updateItem(item.id, { width: e.target.value })} placeholder="W" className="h-8 text-sm" />
                      <Input type="number" step="0.1" value={item.depth} onChange={e => updateItem(item.id, { depth: e.target.value })} placeholder="D" className="h-8 text-sm" />
                      <Select value={item.dimensionUnit} onValueChange={v => updateItem(item.id, { dimensionUnit: v })}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cm">cm</SelectItem>
                          <SelectItem value="in">in</SelectItem>
                          <SelectItem value="mm">mm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">Location</label>
                    <Select value={item.locationId || "none"} onValueChange={v => updateItem(item.id, { locationId: v === "none" ? "" : v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="No location" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No location</SelectItem>
                        {flatLocations.map(loc => <SelectItem key={loc.id} value={loc.id}>{loc.indent}{loc.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">Thumbnail crop</label>
                    <div className="flex gap-2">
                      {(["top", "center", "bottom"] as FocalPosition[]).map(pos => (
                        <button key={pos} type="button" onClick={() => updateItem(item.id, { focalPosition: pos })}
                          className={`flex-1 py-1.5 text-xs border transition-colors ${item.focalPosition === pos ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:border-foreground/50"}`}>
                          {pos.charAt(0).toUpperCase() + pos.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
