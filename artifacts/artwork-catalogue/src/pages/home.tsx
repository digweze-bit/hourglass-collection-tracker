import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useListArtworks } from "@/hooks/use-db";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const [, navigate] = useLocation();
  const [searchInput, setSearchInput] = useState("");
  const { data: artworks = [], isLoading } = useListArtworks();

  // Pick a random featured artwork, stable per session
  const featuredArtwork = useMemo(() => {
    if (!artworks.length) return null;
    return artworks[Math.floor(Math.random() * artworks.length)];
  }, [artworks.length > 0]);

  // Recent 4 artworks (excluding featured)
  const recentArtworks = useMemo(() => {
    if (!artworks.length) return [];
    const sorted = [...artworks].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return sorted.filter(a => a.id !== featuredArtwork?.id).slice(0, 4);
  }, [artworks, featuredArtwork]);

  // Most recently added artists (by most recent artwork created_at)
  const recentArtists = useMemo(() => {
    if (!artworks.length) return [];
    // For each artist, find their most recent artwork date
    const artistLatest = new Map<string, number>();
    for (const a of artworks) {
      if (!a.artist) continue;
      const t = new Date(a.created_at).getTime();
      if (!artistLatest.has(a.artist) || t > artistLatest.get(a.artist)!) {
        artistLatest.set(a.artist, t);
      }
    }
    return Array.from(artistLatest.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([artist]) => artist);
  }, [artworks]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchInput.trim()) navigate(`/artworks?search=${encodeURIComponent(searchInput.trim())}`);
    else navigate("/artworks");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-0">

      {/* Hero image — full width, fades into white */}
      {featuredArtwork?.image_url ? (
        <Link href={`/artworks/${featuredArtwork.id}`} className="block relative -mx-6 md:-mx-12">
          <div className="relative overflow-hidden" style={{ height: "55vw", maxHeight: "420px", minHeight: "240px" }}>
            <img
              src={featuredArtwork.image_url}
              alt={featuredArtwork.title}
              className="w-full h-full object-cover object-center"
            />
            {/* Fade to page background at bottom */}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, hsl(var(--background)) 0%, transparent 40%)" }} />
          </div>
        </Link>
      ) : !isLoading && (
        <div className="relative -mx-6 md:-mx-12 bg-muted/20" style={{ height: "300px" }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-xs text-muted-foreground/40 uppercase tracking-widest">No artworks yet</p>
          </div>
        </div>
      )}

      {/* Title block — sits just below the fade */}
      {featuredArtwork && (
        <Link href={`/artworks/${featuredArtwork.id}`} className="block pt-3 pb-6 space-y-1">
          <h2 className="font-serif text-xl leading-tight text-foreground hover:text-primary transition-colors">
            {featuredArtwork.title}
          </h2>
          <p className="text-sm text-muted-foreground">
            {featuredArtwork.artist || "Unknown Artist"}
            {featuredArtwork.year ? `, ${featuredArtwork.year}` : ""}
            {featuredArtwork.medium ? ` · ${featuredArtwork.medium}` : ""}
          </p>
        </Link>
      )}

      {/* Prominent search */}
      <form onSubmit={handleSearch} className="relative pb-10">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Search by title or artist…"
          className="pl-11 h-12 text-sm bg-background border-border/70 focus-visible:ring-1 shadow-sm"
        />
      </form>

      {/* Recent acquisitions */}
      {recentArtworks.length > 0 && (
        <section className="pb-10">
          <div className="flex items-baseline justify-between mb-5 border-b border-border pb-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Recent acquisitions</p>
            <Link href="/artworks" className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">View all</Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {recentArtworks.map(artwork => (
              <Link key={artwork.id} href={`/artworks/${artwork.id}`} className="group block">
                <div className="aspect-square bg-muted/30 overflow-hidden mb-2">
                  {artwork.image_url
                    ? <img src={artwork.image_url} alt={artwork.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700 ease-out" />
                    : <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground/40 uppercase tracking-widest">No image</div>
                  }
                </div>
                <p className="font-serif text-sm leading-tight group-hover:text-primary transition-colors line-clamp-1">{artwork.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{artwork.artist || "Unknown"}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recently added artists */}
      {recentArtists.length > 0 && (
        <section className="pb-8">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-4 border-b border-border pb-2">Recently added artists</p>
          <div className="space-y-0">
            {recentArtists.map(artist => (
              <Link
                key={artist}
                href={`/artworks?artist=${encodeURIComponent(artist)}`}
                className="flex items-center justify-between py-2.5 border-b border-border/30 hover:border-border/70 group transition-colors"
              >
                <span className="font-serif text-sm group-hover:text-primary transition-colors">{artist}</span>
                <span className="text-xs text-muted-foreground">→</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!isLoading && artworks.length === 0 && (
        <div className="text-center py-20 space-y-4">
          <p className="text-muted-foreground text-sm">Your collection is empty.</p>
          <Link href="/artworks/new" className="text-xs text-primary hover:underline">Add the first artwork</Link>
        </div>
      )}

    </div>
  );
}
