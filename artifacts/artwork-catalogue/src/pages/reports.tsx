import { useState, useMemo } from "react";
import { useListArtworks, useListLoans, useListLocations, useGetSummary } from "@/hooks/use-db";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Printer, FileText, Search } from "lucide-react";

type Artwork = {
  id: string; title: string; artist: string | null; year: number | null;
  medium: string | null; width: number | null; height: number | null;
  depth: number | null; dimension_unit: string | null; image_url: string | null;
  location_name?: string | null; on_loan: boolean; created_at: string;
  keywords: string | null; notes: string | null;
};

const REPORT_TYPES = [
  { value: "", label: "— Select a report —" },
  { value: "all", label: "All Artworks" },
  { value: "by_artist", label: "By Artist" },
  { value: "by_location", label: "By Location" },
  { value: "by_medium", label: "By Medium" },
  { value: "by_keyword", label: "By Keyword" },
  { value: "date_range", label: "Acquired in Date Range" },
  { value: "on_loan", label: "Works on Loan" },
  { value: "most_valuable", label: "Most Valuable Artworks" },
  { value: "insurance", label: "Insurance Summary" },
  { value: "condition", label: "Condition Summary" },
  { value: "unlocated", label: "Unlocated Works" },
  { value: "no_image", label: "Works Without Images" },
  { value: "loan_history", label: "Loan History" },
  { value: "by_year", label: "By Creation Year" },
  { value: "provenance", label: "Works with Provenance" },
];

function fmt(val: number | null, currency = "USD") {
  if (!val) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(val);
}

function formatDim(a: Artwork) {
  const parts = [a.height, a.width, a.depth].filter(Boolean).map(n => Number(n).toFixed(1));
  return parts.length ? parts.join(" × ") + ` ${a.dimension_unit || "cm"}` : null;
}

function ArtworkRow({ artwork, index, showValue }: { artwork: any; index: number; showValue?: boolean }) {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-border last:border-0 print:py-3 print:break-inside-avoid">
      <div className="h-16 w-16 flex-shrink-0 bg-muted/30 overflow-hidden print:h-14 print:w-14">
        {artwork.image_url
          ? <img src={artwork.image_url} alt={artwork.title} className="object-cover w-full h-full" />
          : <div className="w-full h-full flex items-center justify-center text-[8px] text-muted-foreground/40 uppercase">No image</div>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-serif text-sm">{artwork.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {artwork.artist || "Unknown Artist"}{artwork.year ? `, ${artwork.year}` : ""}
              {artwork.medium ? ` · ${artwork.medium}` : ""}
            </p>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">{String(index + 1).padStart(3, "0")}</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5">
          {formatDim(artwork) && <span className="text-xs text-muted-foreground">{formatDim(artwork)}</span>}
          {artwork.location_name && <span className="text-xs text-muted-foreground">{artwork.location_name}</span>}
          {artwork.on_loan && <span className="text-xs text-amber-600 font-medium">On loan</span>}
          {showValue && artwork.current_value_usd && <span className="text-xs font-medium text-foreground">{fmt(artwork.current_value_usd)}</span>}
          <span className="text-xs text-muted-foreground">
            Added {new Date(artwork.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
        {artwork.keywords && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {artwork.keywords.split(",").map((k: string) => k.trim()).filter(Boolean).map((kw: string) => (
              <span key={kw} className="text-[9px] border border-border px-1.5 py-0.5 text-muted-foreground">{kw}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Reports() {
  const [reportType, setReportType] = useState("");
  const [filterArtist, setFilterArtist] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterMedium, setFilterMedium] = useState("all");
  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterYear, setFilterYear] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: artworks = [], isLoading } = useListArtworks({ enabled: !!reportType } as any);
  const { data: allLoans = [] } = useListLoans();
  const { data: summary } = useGetSummary();

  // Derived filter options
  const allArtists = useMemo(() => [...new Set(artworks.map(a => a.artist).filter(Boolean) as string[])].sort(), [artworks]);
  const allMediums = useMemo(() => [...new Set(artworks.map(a => a.medium).filter(Boolean) as string[])].sort(), [artworks]);
  const allLocationNames = useMemo(() => [...new Set(artworks.map(a => a.location_name).filter(Boolean) as string[])].sort(), [artworks]);
  const allKeywords = useMemo(() => {
    const kws = new Set<string>();
    artworks.forEach(a => { if (a.keywords) a.keywords.split(",").forEach(k => { const t = k.trim(); if (t) kws.add(t); }); });
    return [...kws].sort();
  }, [artworks]);
  const allYears = useMemo(() => [...new Set(artworks.map(a => a.year).filter(Boolean) as number[])].sort((a, b) => b - a).map(String), [artworks]);

  // Filter artworks based on report type
  const filteredArtworks = useMemo((): Artwork[] => {
    let result = artworks as Artwork[];
    const now = Date.now();

    switch (reportType) {
      case "on_loan":
        result = result.filter(a => a.on_loan);
        break;
      case "by_artist":
        if (filterArtist !== "all") result = result.filter(a => a.artist === filterArtist);
        break;
      case "by_location":
        if (filterLocation !== "all") result = result.filter(a => a.location_name === filterLocation);
        else result = result.filter(a => a.location_name);
        break;
      case "by_medium":
        if (filterMedium !== "all") result = result.filter(a => a.medium === filterMedium);
        break;
      case "by_keyword":
        if (filterKeyword) result = result.filter(a => a.keywords && a.keywords.toLowerCase().includes(filterKeyword.toLowerCase()));
        break;
      case "by_year":
        if (filterYear !== "all") result = result.filter(a => String(a.year) === filterYear);
        break;
      case "date_range": {
        const from = dateFrom ? new Date(dateFrom).getTime() : null;
        const to = dateTo ? new Date(dateTo).getTime() + 86400000 : null;
        result = result.filter(a => {
          const t = new Date(a.created_at).getTime();
          if (from && t < from) return false;
          if (to && t > to) return false;
          return true;
        });
        break;
      }
      case "most_valuable":
        result = result.filter(a => (a as any).current_value_usd).sort((a, b) => ((b as any).current_value_usd || 0) - ((a as any).current_value_usd || 0));
        break;
      case "insurance":
        result = result.filter(a => (a as any).current_value_usd);
        break;
      case "unlocated":
        result = result.filter(a => !a.location_name);
        break;
      case "no_image":
        result = result.filter(a => !a.image_url);
        break;
      case "provenance":
        // Filter handled separately
        break;
      default:
        break;
    }

    // Global search within results
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.title.toLowerCase().includes(q) ||
        (a.artist && a.artist.toLowerCase().includes(q)) ||
        (a.medium && a.medium.toLowerCase().includes(q)) ||
        (a.keywords && a.keywords.toLowerCase().includes(q))
      );
    }

    return result;
  }, [artworks, reportType, filterArtist, filterLocation, filterMedium, filterKeyword, filterYear, dateFrom, dateTo, searchQuery]);

  const getReportTitle = () => {
    switch (reportType) {
      case "all": return "Complete Collection";
      case "by_artist": return filterArtist !== "all" ? `Works by ${filterArtist}` : "Collection by Artist";
      case "by_location": return filterLocation !== "all" ? `Works at ${filterLocation}` : "Collection by Location";
      case "by_medium": return filterMedium !== "all" ? `Works in ${filterMedium}` : "Collection by Medium";
      case "by_keyword": return filterKeyword ? `Works tagged: ${filterKeyword}` : "Collection by Keyword";
      case "by_year": return filterYear !== "all" ? `Works from ${filterYear}` : "Collection by Year";
      case "date_range": {
        const parts = [];
        if (dateFrom) parts.push(`from ${new Date(dateFrom).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`);
        if (dateTo) parts.push(`to ${new Date(dateTo).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`);
        return `Acquired ${parts.join(" ") || "— All Dates"}`;
      }
      case "on_loan": return "Works Currently On Loan";
      case "most_valuable": return "Most Valuable Works";
      case "insurance": return "Insurance Summary";
      case "condition": return "Condition Summary";
      case "unlocated": return "Unlocated Works";
      case "no_image": return "Works Without Images";
      case "loan_history": return "Loan History";
      case "provenance": return "Works with Provenance Records";
      default: return "Collection Report";
    }
  };

  const totalValue = useMemo(() =>
    filteredArtworks.reduce((s, a) => s + ((a as any).current_value_usd || 0), 0),
    [filteredArtworks]
  );

  const showFilters = {
    artist: ["by_artist"].includes(reportType),
    location: ["by_location"].includes(reportType),
    medium: ["by_medium"].includes(reportType),
    keyword: ["by_keyword"].includes(reportType),
    year: ["by_year"].includes(reportType),
    dateRange: ["date_range"].includes(reportType),
  };

  const isLoanReport = reportType === "loan_history";
  const isConditionReport = reportType === "condition";

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="print:hidden space-y-6">
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-serif tracking-tight">Reports</h1>
            <p className="text-muted-foreground mt-1 font-light">Generate, view and export collection reports.</p>
          </div>
          <Button onClick={() => window.print()} className="gap-2" disabled={isLoading}>
            <Printer className="h-4 w-4" />Print / Export PDF
          </Button>
        </header>

        <div className="border border-border p-6 space-y-5">
          <h2 className="text-xs tracking-widest uppercase text-muted-foreground">Configure Report</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-widest">Report Type</label>
              <Select value={reportType} onValueChange={v => { setReportType(v); setFilterArtist("all"); setFilterLocation("all"); setFilterMedium("all"); setFilterKeyword(""); setFilterYear("all"); setDateFrom(""); setDateTo(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REPORT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {showFilters.artist && (
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-widest">Artist</label>
                <Select value={filterArtist} onValueChange={setFilterArtist}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All artists</SelectItem>{allArtists.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            {showFilters.location && (
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-widest">Location</label>
                <Select value={filterLocation} onValueChange={setFilterLocation}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All locations</SelectItem>{allLocationNames.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            {showFilters.medium && (
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-widest">Medium</label>
                <Select value={filterMedium} onValueChange={setFilterMedium}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All mediums</SelectItem>{allMediums.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            {showFilters.keyword && (
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-widest">Keyword</label>
                <Select value={filterKeyword || "all"} onValueChange={v => setFilterKeyword(v === "all" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select keyword" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All keywords</SelectItem>{allKeywords.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            {showFilters.year && (
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-widest">Year</label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All years</SelectItem>{allYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>

          {showFilters.dateRange && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-widest">From</label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-widest">To</label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            </div>
          )}

          {/* Search within results */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search within results…" className="pl-9" />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex gap-6 text-sm">
              <span className="text-muted-foreground">{isLoading ? "Loading..." : `${isLoanReport ? allLoans.length : filteredArtworks.length} record${(isLoanReport ? allLoans.length : filteredArtworks.length) !== 1 ? "s" : ""}`}</span>
              {totalValue > 0 && <span className="text-muted-foreground">Total value: <span className="text-foreground font-medium">{fmt(totalValue)}</span></span>}
            </div>
            <Button onClick={() => window.print()} variant="outline" size="sm" className="gap-2">
              <Printer className="h-4 w-4" />Print / PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Empty state — no report selected */}
      {!reportType && (
        <div className="text-center py-24 space-y-3 print:hidden">
          <FileText className="h-10 w-10 mx-auto opacity-15" />
          <p className="text-muted-foreground text-sm">Select a report type above to get started.</p>
        </div>
      )}

      {/* ── Report output ── */}
      {!!reportType && <div className="print-report">
        {/* Report header — shown in print */}
        <div className="mb-8 print:mb-6">
          <div className="border-b-2 border-foreground pb-4 mb-2">
            <p className="text-[10px] tracking-widest uppercase text-muted-foreground print:text-black/50 mb-1">Hourglass · Private Registry</p>
            <h2 className="text-2xl font-serif">{getReportTitle()}</h2>
          </div>
          <p className="text-xs text-muted-foreground print:text-black/50">
            Generated {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · {isLoanReport ? allLoans.length : filteredArtworks.length} record{(isLoanReport ? allLoans.length : filteredArtworks.length) !== 1 ? "s" : ""}
            {totalValue > 0 ? ` · Total value ${fmt(totalValue)}` : ""}
          </p>
        </div>

        {isLoading && <div className="text-center py-16 text-muted-foreground text-sm print:hidden">Loading...</div>}

        {/* Loan history report */}
        {!isLoading && isLoanReport && (
          <div className="space-y-0">
            {(allLoans as any[]).length === 0 && <p className="text-sm text-muted-foreground italic py-8 text-center">No loan records found.</p>}
            {(allLoans as any[]).map((loan: any, i: number) => (
              <div key={loan.id} className="py-4 border-b border-border last:border-0 print:break-inside-avoid">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4 items-start">
                    <span className="text-xs text-muted-foreground tabular-nums mt-0.5">{String(i + 1).padStart(3, "0")}</span>
                    <div>
                      <p className="font-serif text-sm">{loan.artwork_title || "Unknown artwork"}</p>
                      <p className="text-xs text-muted-foreground">{loan.artwork_artist || "Unknown artist"}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                        {loan.loanee && <span className="text-xs text-muted-foreground">To: {loan.loanee}</span>}
                        {loan.institution && <span className="text-xs text-muted-foreground">{loan.institution}</span>}
                        {loan.start_date && <span className="text-xs text-muted-foreground">From: {loan.start_date}</span>}
                        {loan.end_date && <span className="text-xs text-muted-foreground">Until: {loan.end_date}</span>}
                      </div>
                    </div>
                  </div>
                  <Badge variant={loan.status === "active" ? "outline" : "secondary"} className="text-[10px] uppercase tracking-widest flex-shrink-0">
                    {loan.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Insurance summary */}
        {!isLoading && reportType === "insurance" && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div className="border-t border-border pt-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Total works</p>
                <p className="text-3xl font-serif">{filteredArtworks.length}</p>
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Insurable value</p>
                <p className="text-3xl font-serif text-primary">{fmt(totalValue)}</p>
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">On loan</p>
                <p className="text-3xl font-serif">{filteredArtworks.filter(a => a.on_loan).length}</p>
              </div>
            </div>
            {filteredArtworks.map((a, i) => <ArtworkRow key={a.id} artwork={a} index={i} showValue />)}
          </div>
        )}

        {/* Standard artwork list for all other reports */}
        {!isLoading && !isLoanReport && reportType !== "insurance" && (
          <div>
            {filteredArtworks.length === 0 && (
              <div className="text-center py-16 print:hidden">
                <FileText className="h-8 w-8 mx-auto mb-3 opacity-20" />
                <p className="text-muted-foreground text-sm">No artworks match the selected criteria.</p>
              </div>
            )}
            {filteredArtworks.map((artwork, i) => (
              <ArtworkRow key={artwork.id} artwork={artwork} index={i} showValue={["most_valuable"].includes(reportType)} />
            ))}
          </div>
        )}
      </div>}
    </div>
  );
}
