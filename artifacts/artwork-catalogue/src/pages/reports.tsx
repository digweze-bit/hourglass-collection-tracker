import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Printer } from "lucide-react";

type Artwork = {
  id: number; title: string; artist: string | null; year: number | null; medium: string | null;
  width: number | null; height: number | null; depth: number | null; dimensionUnit: string | null;
  imageUrl: string | null; locationName: string | null; onLoan: boolean; createdAt: string;
};

const REPORT_TYPES = [
  { value: "all", label: "All Artworks" },
  { value: "by_artist", label: "By Artist" },
  { value: "by_location", label: "By Location" },
  { value: "by_medium", label: "By Medium" },
  { value: "on_loan", label: "On Loan" },
  { value: "acquired_custom", label: "Acquired — Custom Date Range" },
  { value: "acquired_last_30", label: "Acquired in Last 30 Days" },
  { value: "acquired_last_60", label: "Acquired in Last 60 Days" },
  { value: "acquired_last_90", label: "Acquired in Last 90 Days" },
  { value: "acquired_artist_date", label: "Artist × Date Range" },
];

function formatDimensions(a: Artwork) {
  const parts = [a.height, a.width, a.depth].filter(Boolean).map(n => Number(n).toFixed(1));
  if (!parts.length) return null;
  return parts.join(" × ") + ` ${a.dimension_unit || "cm"}`;
}

function toDate(str: string): Date | null {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export default function Reports() {
  const [reportType, setReportType] = useState("all");
  const [filterValue, setFilterValue] = useState("");
  const [artistFilter, setArtistFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { data: artworks, isLoading } = useListArtworks();

  const allArtists = useMemo(() => [...new Set((artworks || []).map(a => a.artist).filter(Boolean))] as string[], [artworks]);
  const allMediums = useMemo(() => [...new Set((artworks || []).map(a => a.medium).filter(Boolean))] as string[], [artworks]);
  const allLocationNames = useMemo(() => [...new Set((artworks || []).map(a => a.location_name).filter(Boolean))] as string[], [artworks]);

  const filteredArtworks = useMemo((): Artwork[] => {
    if (!artworks) return [];
    const now = new Date();
    const daysAgo = (d: number) => now.getTime() - d * 86400000;
    switch (reportType) {
      case "on_loan": return artworks.filter(a => a.on_loan) as Artwork[];
      case "by_artist": return (filterValue ? artworks.filter(a => a.artist === filterValue) : artworks) as Artwork[];
      case "by_location": return (filterValue ? artworks.filter(a => a.location_name === filterValue) : artworks) as Artwork[];
      case "by_medium": return (filterValue ? artworks.filter(a => a.medium === filterValue) : artworks) as Artwork[];
      case "acquired_last_30": return artworks.filter(a => new Date(a.created_at).getTime() > daysAgo(30)) as Artwork[];
      case "acquired_last_60": return artworks.filter(a => new Date(a.created_at).getTime() > daysAgo(60)) as Artwork[];
      case "acquired_last_90": return artworks.filter(a => new Date(a.created_at).getTime() > daysAgo(90)) as Artwork[];
      case "acquired_custom": {
        const from = toDate(dateFrom); const to = toDate(dateTo);
        return artworks.filter(a => {
          const t = new Date(a.created_at).getTime();
          if (from && t < from.getTime()) return false;
          if (to) { const toEnd = new Date(to); toEnd.setHours(23,59,59,999); if (t > toEnd.getTime()) return false; }
          return true;
        }) as Artwork[];
      }
      case "acquired_artist_date": {
        const from = toDate(dateFrom); const to = toDate(dateTo);
        return artworks.filter(a => {
          if (artistFilter && a.artist !== artistFilter) return false;
          const t = new Date(a.created_at).getTime();
          if (from && t < from.getTime()) return false;
          if (to) { const toEnd = new Date(to); toEnd.setHours(23,59,59,999); if (t > toEnd.getTime()) return false; }
          return true;
        }) as Artwork[];
      }
      default: return artworks as Artwork[];
    }
  }, [artworks, reportType, filterValue, artistFilter, dateFrom, dateTo]);

  const showDropdownFilter = ["by_artist", "by_location", "by_medium"].includes(reportType);
  const showDateRange = ["acquired_custom", "acquired_artist_date"].includes(reportType);
  const showArtistFilter = reportType === "acquired_artist_date";

  const getReportTitle = () => {
    switch (reportType) {
      case "by_artist": return filterValue ? `Works by ${filterValue}` : "All Artworks — By Artist";
      case "by_location": return filterValue ? `Works at ${filterValue}` : "All Artworks — By Location";
      case "by_medium": return filterValue ? `Works in ${filterValue}` : "All Artworks — By Medium";
      case "on_loan": return "Works Currently On Loan";
      case "acquired_last_30": return "Acquired in the Last 30 Days";
      case "acquired_last_60": return "Acquired in the Last 60 Days";
      case "acquired_last_90": return "Acquired in the Last 90 Days";
      case "acquired_custom": {
        const parts = [];
        if (dateFrom) parts.push(`from ${new Date(dateFrom).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`);
        if (dateTo) parts.push(`to ${new Date(dateTo).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`);
        return `Acquired ${parts.join(" ") || "— All Dates"}`;
      }
      case "acquired_artist_date": {
        const parts = [];
        if (artistFilter) parts.push(artistFilter);
        if (dateFrom) parts.push(`from ${new Date(dateFrom).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`);
        if (dateTo) parts.push(`to ${new Date(dateTo).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`);
        return parts.length ? parts.join(" · ") : "Artist × Date Range";
      }
      default: return "Complete Collection";
    }
  };

  return (
    <div className="space-y-10">
      <div className="print:hidden space-y-8">
        <header>
          <h1 className="text-3xl font-serif tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1 font-light">Generate and print collection reports.</p>
        </header>
        <div className="border border-border p-6 space-y-6">
          <h2 className="text-sm font-medium">Configure Report</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-widest">Report Type</label>
              <Select value={reportType} onValueChange={(v) => { setReportType(v); setFilterValue(""); setArtistFilter(""); setDateFrom(""); setDateTo(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REPORT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {showDropdownFilter && (
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-widest">
                  {reportType === "by_artist" ? "Artist" : reportType === "by_location" ? "Location" : "Medium"}
                </label>
                <Select value={filterValue || "_all"} onValueChange={(v) => setFilterValue(v === "_all" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All</SelectItem>
                    {(reportType === "by_artist" ? allArtists : reportType === "by_location" ? allLocationNames : allMediums).map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {showArtistFilter && (
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-widest">Artist</label>
                <Select value={artistFilter || "_all"} onValueChange={(v) => setArtistFilter(v === "_all" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="All artists" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All artists</SelectItem>
                    {allArtists.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {showDateRange && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-widest">Acquired From</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-widest">Acquired To</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <p className="text-sm text-muted-foreground">{isLoading ? "Loading..." : `${filteredArtworks.length} artwork${filteredArtworks.length !== 1 ? "s" : ""} in report`}</p>
            <Button onClick={() => window.print()} className="gap-2" disabled={isLoading}><Printer className="h-4 w-4" />Print / Export PDF</Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4 print:hidden">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : (
        <div className="print-report">
          <div className="mb-10 print:mb-8">
            <div className="border-b-2 border-foreground pb-4 mb-6">
              <p className="text-[10px] tracking-widest uppercase text-muted-foreground print:text-black/50 mb-2">Hourglass · Private Registry</p>
              <h2 className="text-2xl font-serif">{getReportTitle()}</h2>
              <p className="text-sm text-muted-foreground print:text-black/50 mt-1">
                Generated {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · {filteredArtworks.length} work{filteredArtworks.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          {filteredArtworks.length === 0 ? (
            <div className="text-center py-12 print:hidden"><FileText className="h-8 w-8 mx-auto mb-3 opacity-20" /><p className="text-muted-foreground text-sm">No artworks match the selected criteria</p></div>
          ) : (
            <div className="space-y-6 print:space-y-4">
              {filteredArtworks.map((artwork, i) => (
                <div key={artwork.id} className="flex gap-6 py-5 border-b border-border last:border-0 print:py-4 print:break-inside-avoid">
                  <div className="h-20 w-20 flex-shrink-0 bg-muted/30 print:bg-gray-100 overflow-hidden">
                    {artwork.image_url ? <img src={artwork.image_url} alt={artwork.title} className="object-cover w-full h-full" /> : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-serif text-base">{artwork.title}</p>
                        <p className="text-sm text-muted-foreground print:text-black/60 mt-0.5">{artwork.artist || "Unknown Artist"}{artwork.year ? `, ${artwork.year}` : ""}</p>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">{String(i + 1).padStart(3, "0")}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-6 gap-y-0.5">
                      {artwork.medium && <span className="text-xs text-muted-foreground print:text-black/60">{artwork.medium}</span>}
                      {formatDimensions(artwork) && <span className="text-xs text-muted-foreground print:text-black/60">{formatDimensions(artwork)}</span>}
                      {artwork.location_name && <span className="text-xs text-muted-foreground print:text-black/60">{artwork.location_name}</span>}
                      {artwork.on_loan && <span className="text-xs text-muted-foreground print:text-black/60 italic">On loan</span>}
                      <span className="text-xs text-muted-foreground print:text-black/60">Acquired {new Date(artwork.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
