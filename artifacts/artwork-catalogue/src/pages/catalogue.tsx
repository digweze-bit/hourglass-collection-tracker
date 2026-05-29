import { useState } from "react";
import { Link } from "wouter";
import {
  useListArtworks,
  useListLocations,
  useDeleteArtwork,
  getListArtworksQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Search, LayoutGrid, List, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Catalogue() {
  const [search, setSearch] = useState("");
  const [filterMedium, setFilterMedium] = useState("all");
  const [filterOnLoan, setFilterOnLoan] = useState("all");
  const [filterLocationId, setFilterLocationId] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const params: Record<string, string | boolean | number> = {};
  if (search) params.search = search;
  if (filterMedium !== "all") params.medium = filterMedium;
  if (filterOnLoan === "true") params.onLoan = true;
  if (filterOnLoan === "false") params.onLoan = false;
  if (filterLocationId !== "all") params.locationId = Number(filterLocationId);

  const { data: artworks, isLoading } = useListArtworks(params as any);
  const { data: locations } = useListLocations();
  const deleteArtwork = useDeleteArtwork();

  const handleDelete = (id: number) => {
    deleteArtwork.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListArtworksQueryKey() });
        toast({ title: "Artwork removed from catalogue" });
      },
    });
  };

  const PRESET_MEDIUMS = [
    "Acrylic on canvas",
    "Acrylic on linen",
    "Acrylic on paper",
    "Acrylic on wood panel",
    "Aquatint",
    "Bronze",
    "Ceramic",
    "Charcoal on paper",
    "Collage",
    "Coloured pencil on paper",
    "Digital print",
    "Drypoint",
    "Egg tempera on panel",
    "Encaustic",
    "Engraving",
    "Etching",
    "Fresco",
    "Gouache on paper",
    "Graphite on paper",
    "Ink on paper",
    "Installation",
    "Linocut",
    "Lithograph",
    "Mixed media",
    "Monotype",
    "Mosaic",
    "Neon",
    "Oil on canvas",
    "Oil on linen",
    "Oil on panel",
    "Oil on paper",
    "Oil on wood",
    "Pastel on paper",
    "Pen and ink",
    "Photography",
    "Plaster",
    "Porcelain",
    "Resin",
    "Screen print",
    "Sculpture",
    "Silver gelatin print",
    "Steel",
    "Stone",
    "Tapestry",
    "Tempera on panel",
    "Textile",
    "Video",
    "Watercolour on paper",
    "Woodcut",
  ];

  const collectionMediums = [...new Set((artworks || []).map(a => a.medium).filter(Boolean))] as string[];
  const allMediums = [...new Set([...PRESET_MEDIUMS, ...collectionMediums])].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );

  return (
    <div className="space-y-10">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-serif tracking-tight">Catalogue</h1>
          <p className="text-muted-foreground mt-1 font-light">
            {artworks ? `${artworks.length} work${artworks.length !== 1 ? "s" : ""}` : "Loading..."}
          </p>
        </div>
        <Link href="/artworks/new">
          <Button size="sm" className="gap-2" data-testid="button-add-artwork">
            <Plus className="h-4 w-4" />
            Add Artwork
          </Button>
        </Link>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center border-b border-border pb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search title or artist..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>

        <Select value={filterMedium} onValueChange={setFilterMedium}>
          <SelectTrigger className="w-40" data-testid="select-medium">
            <SelectValue placeholder="All mediums" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All mediums</SelectItem>
            {allMediums.map(m => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterLocationId} onValueChange={setFilterLocationId}>
          <SelectTrigger className="w-44" data-testid="select-location">
            <SelectValue placeholder="All locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {(locations || []).map(loc => (
              <SelectItem key={loc.id} value={String(loc.id)}>{loc.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterOnLoan} onValueChange={setFilterOnLoan}>
          <SelectTrigger className="w-36" data-testid="select-loan-status">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="false">In collection</SelectItem>
            <SelectItem value="true">On loan</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-1 ml-auto">
          <Button
            variant={view === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setView("grid")}
            data-testid="button-grid-view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setView("list")}
            data-testid="button-list-view"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className={view === "grid" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6" : "space-y-4"}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className={view === "grid" ? "aspect-square" : "h-20 w-full"} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && artworks?.length === 0 && (
        <div className="text-center py-24 space-y-4">
          <p className="text-xl font-serif text-muted-foreground">No artworks found</p>
          <p className="text-sm text-muted-foreground">
            {search || filterMedium !== "all" || filterOnLoan !== "all" ? "Try adjusting your filters." : "Begin by adding your first artwork."}
          </p>
          {!search && filterMedium === "all" && filterOnLoan === "all" && (
            <Link href="/artworks/new">
              <Button variant="outline" size="sm" className="mt-4">Add first artwork</Button>
            </Link>
          )}
        </div>
      )}

      {/* Grid view */}
      {!isLoading && artworks && artworks.length > 0 && view === "grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
          {artworks.map(artwork => (
            <div key={artwork.id} className="group relative" data-testid={`card-artwork-${artwork.id}`}>
              <Link href={`/artworks/${artwork.id}`} className="block">
                <div className="aspect-square bg-muted/30 mb-4 overflow-hidden">
                  {artwork.imageUrl ? (
                    <img
                      src={artwork.imageUrl}
                      alt={artwork.title}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground uppercase tracking-widest">
                      No Image
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  {artwork.onLoan && (
                    <Badge variant="outline" className="text-[10px] tracking-widest uppercase mb-1">On Loan</Badge>
                  )}
                  <p className="font-serif text-sm leading-tight group-hover:text-primary/80 transition-colors line-clamp-2">{artwork.title}</p>
                  <p className="text-xs text-muted-foreground">{artwork.artist || "Unknown Artist"}{artwork.year ? `, ${artwork.year}` : ""}</p>
                  {artwork.locationName && (
                    <p className="text-xs text-muted-foreground/70">{artwork.locationName}</p>
                  )}
                </div>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-destructive/10 hover:text-destructive"
                    data-testid={`button-delete-artwork-${artwork.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove artwork</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to remove "{artwork.title}" from the catalogue? This cannot be undone.
                    </AlertDialogDescription>
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
      )}

      {/* List view */}
      {!isLoading && artworks && artworks.length > 0 && view === "list" && (
        <div className="divide-y divide-border">
          {artworks.map(artwork => (
            <div key={artwork.id} className="group flex items-center gap-6 py-4" data-testid={`row-artwork-${artwork.id}`}>
              <div className="h-14 w-14 bg-muted/30 flex-shrink-0 overflow-hidden">
                {artwork.imageUrl ? (
                  <img src={artwork.imageUrl} alt={artwork.title} className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full" />
                )}
              </div>
              <Link href={`/artworks/${artwork.id}`} className="flex-1 min-w-0 hover:text-primary transition-colors">
                <p className="font-serif text-sm truncate">{artwork.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {artwork.artist || "Unknown Artist"}{artwork.year ? `, ${artwork.year}` : ""}{artwork.medium ? ` · ${artwork.medium}` : ""}
                </p>
              </Link>
              {artwork.locationName && (
                <p className="text-xs text-muted-foreground hidden sm:block">{artwork.locationName}</p>
              )}
              {artwork.onLoan && (
                <Badge variant="outline" className="text-[10px] tracking-widest uppercase hidden sm:block">On Loan</Badge>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                    data-testid={`button-delete-artwork-list-${artwork.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove artwork</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to remove "{artwork.title}"?
                    </AlertDialogDescription>
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
      )}
    </div>
  );
}
