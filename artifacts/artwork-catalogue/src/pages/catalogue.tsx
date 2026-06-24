import { useState } from "react";
import { Link, useSearch } from "wouter";
import { useListArtworks, useDeleteArtwork, useListLocations } from "@/hooks/use-db";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Search, LayoutGrid, List, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PRESET_MEDIUMS = ["Acrylic on canvas","Acrylic on linen","Acrylic on paper","Bronze","Ceramic","Charcoal on paper","Collage","Digital print","Etching","Gouache on paper","Graphite on paper","Ink on paper","Linocut","Lithograph","Mixed media","Oil on canvas","Oil on linen","Oil on panel","Oil on paper","Pastel on paper","Photography","Screen print","Sculpture","Watercolour on paper","Woodcut"];

function flattenTree(locs: any[], depth = 0): { id: string; name: string; indent: string }[] {
  return locs.flatMap((l) => [{ id: l.id, name: l.name, indent: depth > 0 ? "\u00a0".repeat(depth*3)+"↳ " : "" }, ...flattenTree(l.children||[], depth+1)]);
}

export default function Catalogue() {
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const [search, setSearch] = useState(params.get("search") || params.get("artist") || "");
  const [filterMedium, setFilterMedium] = useState("all");
  const [filterOnLoan, setFilterOnLoan] = useState("all");
  const [filterLocationId, setFilterLocationId] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const { toast } = useToast();

  const { data: artworks, isLoading } = useListArtworks({
    search: search || undefined,
    medium: filterMedium !== "all" ? filterMedium : undefined,
    onLoan: filterOnLoan === "true" ? true : filterOnLoan === "false" ? false : undefined,
    locationId: filterLocationId !== "all" ? filterLocationId : undefined,
  });
  const { data: locationTree } = useListLocations();
  const deleteArtwork = useDeleteArtwork();
  const flatLocations = flattenTree(locationTree || []);
  const collectionMediums = [...new Set((artworks || []).map(a => a.medium).filter(Boolean))] as string[];
  const allMediums = [...new Set([...PRESET_MEDIUMS, ...collectionMediums])].sort();

  const handleDelete = (id: string) => {
    deleteArtwork.mutate(id, { onSuccess: () => toast({ title: "Artwork removed from catalogue" }) });
  };

  return (
    <div className="space-y-10">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-serif tracking-tight">Collection</h1>
          <p className="text-muted-foreground mt-1 font-light">{artworks ? `${artworks.length} work${artworks.length !== 1 ? "s" : ""}` : "Loading..."}</p>
        </div>
        <Link href="/artworks/new"><Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Add Artwork</Button></Link>
      </header>

      <div className="flex flex-wrap gap-3 items-center border-b border-border pb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search title or artist..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterMedium} onValueChange={setFilterMedium}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All mediums" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All mediums</SelectItem>{allMediums.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterLocationId} onValueChange={setFilterLocationId}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All locations" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All locations</SelectItem>{flatLocations.map(l => <SelectItem key={l.id} value={l.id}>{l.indent}{l.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterOnLoan} onValueChange={setFilterOnLoan}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="false">In collection</SelectItem><SelectItem value="true">On loan</SelectItem></SelectContent>
        </Select>
        <div className="flex gap-1 ml-auto">
          <Button variant={view === "grid" ? "secondary" : "ghost"} size="icon" onClick={() => setView("grid")}><LayoutGrid className="h-4 w-4" /></Button>
          <Button variant={view === "list" ? "secondary" : "ghost"} size="icon" onClick={() => setView("list")}><List className="h-4 w-4" /></Button>
        </div>
      </div>

      {isLoading && <div className={view === "grid" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6" : "space-y-4"}>{Array.from({length:8}).map((_,i)=><Skeleton key={i} className={view==="grid"?"aspect-square":"h-20 w-full"}/>)}</div>}
      {!isLoading && artworks?.length === 0 && <div className="text-center py-24"><p className="text-xl font-serif text-muted-foreground">No artworks found</p></div>}

      {!isLoading && artworks && artworks.length > 0 && view === "grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
          {artworks.map(artwork => (
            <div key={artwork.id} className="group relative">
              <Link href={`/artworks/${artwork.id}`} className="block">
                <div className="aspect-square bg-muted/30 mb-4 overflow-hidden">
                  {artwork.image_url ? <img src={artwork.image_url} alt={artwork.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700 ease-out" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground uppercase tracking-widest">No Image</div>}
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
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Remove artwork</AlertDialogTitle><AlertDialogDescription>Remove "{artwork.title}" from the catalogue?</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(artwork.id)}>Remove</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}

      {!isLoading && artworks && artworks.length > 0 && view === "list" && (
        <div className="divide-y divide-border">
          {artworks.map(artwork => (
            <div key={artwork.id} className="group flex items-center gap-6 py-4">
              <div className="h-14 w-14 bg-muted/30 flex-shrink-0 overflow-hidden">{artwork.image_url ? <img src={artwork.image_url} alt={artwork.title} className="object-cover w-full h-full" /> : <div className="w-full h-full" />}</div>
              <Link href={`/artworks/${artwork.id}`} className="flex-1 min-w-0 hover:text-primary transition-colors">
                <p className="font-serif text-sm truncate">{artwork.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{artwork.artist || "Unknown Artist"}{artwork.year ? `, ${artwork.year}` : ""}{artwork.medium ? ` · ${artwork.medium}` : ""}</p>
              </Link>
              {artwork.location_name && <p className="text-xs text-muted-foreground hidden sm:block">{artwork.location_name}</p>}
              {artwork.on_loan && <Badge variant="outline" className="text-[10px] tracking-widest uppercase hidden sm:block">On Loan</Badge>}
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:text-destructive"><Trash2 className="h-3 w-3" /></Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Remove artwork</AlertDialogTitle><AlertDialogDescription>Remove "{artwork.title}"?</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(artwork.id)}>Remove</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
