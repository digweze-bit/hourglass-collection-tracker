import { useState, useEffect } from "react";
import { Link, useSearch, useLocation } from "wouter";
import { useListArtworks, useDeleteArtwork, useListLocations } from "@/hooks/use-db";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Search, LayoutGrid, List, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PRESET_MEDIUMS = ["Acrylic on canvas","Acrylic on linen","Acrylic on paper","Acrylic on wood panel","Aquatint","Bronze","Ceramic","Charcoal on paper","Collage","Coloured pencil on paper","Digital print","Drypoint","Egg tempera on panel","Encaustic","Engraving","Etching","Fresco","Gouache on paper","Graphite on paper","Ink on paper","Installation","Linocut","Lithograph","Mixed media","Monotype","Mosaic","Neon","Oil on canvas","Oil on linen","Oil on panel","Oil on paper","Oil on wood","Pastel on paper","Pen and ink","Photography","Plaster","Porcelain","Resin","Screen print","Sculpture","Silver gelatin print","Steel","Stone","Tapestry","Tempera on panel","Textile","Video","Watercolour on paper","Woodcut"];

const PAGE_SIZE_OPTIONS = [
  { value: "20", label: "20" },
  { value: "60", label: "60" },
  { value: "120", label: "120" },
  { value: "all", label: "All" },
];

export default function Catalogue() {
  const searchStr = useSearch();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(searchStr);
  const [search, setSearch] = useState(params.get("search") || params.get("artist") || "");
  const [filterMedium, setFilterMedium] = useState("all");
  const [filterOnLoan, setFilterOnLoan] = useState("all");
  const [filterLocationId, setFilterLocationId] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [pageSize, setPageSize] = useState("20");
  const { toast } = useToast();

  const currentPageFromUrl = Math.max(1, Number(params.get("page") || "1"));

  function goToPage(p: number) {
    const next = new URLSearchParams(searchStr);
    next.set("page", String(p));
    navigate(`/artworks?${next.toString()}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Reset to page 1 whenever filters or page size change
  useEffect(() => { goToPage(1); }, [search, filterMedium, filterOnLoan, filterLocationId, pageSize]);

  const { data: artworks, isLoading } = useListArtworks({
    search: search || undefined,
    medium: filterMedium !== "all" ? filterMedium : undefined,
    onLoan: filterOnLoan === "true" ? true : filterOnLoan === "false" ? false : undefined,
    locationId: filterLocationId !== "all" ? filterLocationId : undefined,
  });
  const { data: locationTree } = useListLocations();
  const deleteArtwork = useDeleteArtwork();

  const flatLocations = (locationTree || []).flatMap(l => [l, ...(l.children || [])]);
  const collectionMediums = [...new Set((artworks || []).map(a => a.medium).filter(Boolean))] as string[];
  const allMediums = [...new Set([...PRESET_MEDIUMS, ...collectionMediums])].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  const totalCount = artworks?.length ?? 0;
  const size = pageSize === "all" ? totalCount || 1 : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(totalCount / size));
  const currentPage = Math.min(currentPageFromUrl, totalPages);
  const pagedArtworks = (artworks || []).slice((currentPage - 1) * size, currentPage * size);

  const handleDelete = (id: string) => {
    deleteArtwork.mutate(id, { onSuccess: () => toast({ title: "Artwork removed from catalogue" }) });
  };

  function PaginationBar() {
    if (pageSize === "all" || totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between border-t border-border pt-6">
        <p className="text-xs text-muted-foreground">
          Showing {(currentPage - 1) * size + 1}–{Math.min(currentPage * size, totalCount)} of {totalCount}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={currentPage <= 1} onClick={() => goToPage(currentPage - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums px-2">Page {currentPage} of {totalPages}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages} onClick={() => goToPage(currentPage + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-serif tracking-tight">Catalogue</h1>
          <p className="text-muted-foreground mt-1 font-light">
            {artworks ? `${totalCount} work${totalCount !== 1 ? "s" : ""}` : "Loading..."}
          </p>
        </div>
        <Link href="/artworks/new">
          <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Add Artwork</Button>
        </Link>
      </header>

      <div className="flex flex-wrap gap-3 items-center border-b border-border pb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search title or artist..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterMedium} onValueChange={setFilterMedium}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All mediums" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All mediums</SelectItem>
            {allMediums.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterLocationId} onValueChange={setFilterLocationId}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All locations" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {flatLocations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterOnLoan} onValueChange={setFilterOnLoan}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="false">In collection</SelectItem>
            <SelectItem value="true">On loan</SelectItem>
          </SelectContent>
        </Select>
        <Select value={pageSize} onValueChange={setPageSize}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label} / page</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-1 ml-auto">
          <Button variant={view === "grid" ? "secondary" : "ghost"} size="icon" onClick={() => setView("grid")}><LayoutGrid className="h-4 w-4" /></Button>
          <Button variant={view === "list" ? "secondary" : "ghost"} size="icon" onClick={() => setView("list")}><List className="h-4 w-4" /></Button>
        </div>
      </div>

      {isLoading && (
        <div className={view === "grid" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6" : "space-y-4"}>
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className={view === "grid" ? "aspect-square" : "h-20 w-full"} />)}
        </div>
      )}

      {!isLoading && totalCount === 0 && (
        <div className="text-center py-24 space-y-4">
          <p className="text-xl font-serif text-muted-foreground">No artworks found</p>
          {!search && filterMedium === "all" && filterOnLoan === "all" && (
            <Link href="/artworks/new"><Button variant="outline" size="sm" className="mt-4">Add first artwork</Button></Link>
          )}
        </div>
      )}

      {!isLoading && totalCount > 0 && view === "grid" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
            {pagedArtworks.map(artwork => (
              <div key={artwork.id} className="group relative">
                <Link href={`/artworks/${artwork.id}`} className="block">
                  <div className="aspect-square bg-muted/30 mb-4 overflow-hidden">
                    {artwork.image_url ? (
                      <img src={artwork.image_url} alt={artwork.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700 ease-out" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground uppercase tracking-widest">No Image</div>
                    )}
                  </div>
                  <div className="space-y-1">
                    {artwork.on_loan && <Badge variant="outline" className="text-[10px] tracking-widest uppercase mb-1">On Loan</Badge>}
                    <p className="font-serif text-sm leading-tight group-hover:text-primary/80 transition-colors line-clamp-2">{artwork.title}</p>
                    <p className="text-xs text-muted-foreground">{artwork.artist || "Unknown Artist"}{artwork.year ? `, ${artwork.year}` : ""}</p>
                    {artwork.location_name && <p className="text-xs text-muted-foreground/70">{artwork.location_name}</p>}
                  </div>
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove artwork</AlertDialogTitle>
                      <AlertDialogDescription>Remove "{artwork.title}" from the catalogue? This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(artwork.id)}>Remove</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
          <PaginationBar />
        </>
      )}

      {!isLoading && totalCount > 0 && view === "list" && (
        <>
          <div className="divide-y divide-border">
            {pagedArtworks.map(artwork => (
              <div key={artwork.id} className="group flex items-center gap-6 py-4">
                <div className="h-14 w-14 bg-muted/30 flex-shrink-0 overflow-hidden">
                  {artwork.image_url ? <img src={artwork.image_url} alt={artwork.title} className="object-cover w-full h-full" loading="lazy" /> : <div className="w-full h-full" />}
                </div>
                <Link href={`/artworks/${artwork.id}`} className="flex-1 min-w-0 hover:text-primary transition-colors">
                  <p className="font-serif text-sm truncate">{artwork.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{artwork.artist || "Unknown Artist"}{artwork.year ? `, ${artwork.year}` : ""}{artwork.medium ? ` · ${artwork.medium}` : ""}</p>
                </Link>
                {artwork.location_name && <p className="text-xs text-muted-foreground hidden sm:block">{artwork.location_name}</p>}
                {artwork.on_loan && <Badge variant="outline" className="text-[10px] tracking-widest uppercase hidden sm:block">On Loan</Badge>}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove artwork</AlertDialogTitle>
                      <AlertDialogDescription>Remove "{artwork.title}"?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(artwork.id)}>Remove</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
          <PaginationBar />
        </>
      )}
    </div>
  );
}
