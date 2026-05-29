import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useListArtworks } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { Link } from "wouter";

export default function Home() {
  const [, navigate] = useLocation();
  const [searchInput, setSearchInput] = useState("");
  const { settings } = useSettings();

  const { data: artworks = [], isLoading } = useListArtworks();

  const featuredArtwork = useMemo(() => {
    if (!artworks.length) return null;
    if (settings.openingMode === "fixed" && settings.pinnedArtworkId) {
      return artworks.find((a) => a.id === settings.pinnedArtworkId) ?? artworks[0];
    }
    const idx = Math.floor(Math.random() * artworks.length);
    return artworks[idx];
  }, [artworks, settings.openingMode, settings.pinnedArtworkId]);

  const artists = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const a of artworks) {
      if (a.artist && !seen.has(a.artist)) {
        seen.add(a.artist);
        list.push(a.artist);
      }
    }
    return list.slice(0, 12);
  }, [artworks]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/artworks?search=${encodeURIComponent(searchInput.trim())}`);
    } else {
      navigate("/artworks");
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 md:py-16 space-y-16">

      {/* Featured artwork */}
      <section>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="w-full aspect-[4/3]" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ) : featuredArtwork ? (
          <Link href={`/artworks/${featuredArtwork.id}`} className="group block">
            <div className="aspect-[4/3] bg-muted/30 overflow-hidden mb-5 w-1/2 mx-auto">
              {featuredArtwork.imageUrl ? (
                <img
                  src={featuredArtwork.imageUrl}
                  alt={featuredArtwork.title}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700 ease-out"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground/50">No Image</span>
                </div>
              )}
            </div>
   <div className="text-center space-y-0.5 mt-3">
  <p className="text-[9pt] text-muted-foreground">
    {featuredArtwork.title}
  </p>
  <p className="text-[9pt] text-muted-foreground">
    {featuredArtwork.artist || "Unknown Artist"}
    {featuredArtwork.year ? `, ${featuredArtwork.year}` : ""}
  </p>
  {featuredArtwork.locationName && (
    <p className="text-[9pt] text-muted-foreground">{featuredArtwork.locationName}</p>
  )}
</div>
</Link>
        ) : (
          <div className="aspect-[4/3] bg-muted/20 flex items-center justify-center">
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">No artworks yet</p>
              <Link href="/artworks/new" className="text-xs text-primary hover:underline">
                Add the first artwork
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Search */}
      <section>
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by title or artist…"
            className="pl-10 h-11 text-sm bg-background border-border/70 focus-visible:ring-1"
          />
        </form>
      </section>

      {/* Artist list */}
      {artists.length > 0 && (
        <section>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-5">Artists</p>
          <div className="flex flex-wrap gap-x-0 gap-y-0 -mx-1">
            {artists.map((artist) => (
              <Link
                key={artist}
                href={`/artworks?artist=${encodeURIComponent(artist)}`}
                className="px-1 py-1 text-sm text-foreground/80 hover:text-foreground border-b border-transparent hover:border-foreground/30 transition-colors"
              >
                {artist}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
