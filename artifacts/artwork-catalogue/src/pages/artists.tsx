import { useMemo } from "react";
import { Link } from "wouter";
import { useListArtworks } from "@/hooks/use-db";
import { Skeleton } from "@/components/ui/skeleton";

export default function Artists() {
  const { data: artworks = [], isLoading } = useListArtworks();

  const grouped = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of artworks) { if (!a.artist) continue; map.set(a.artist, (map.get(a.artist) ?? 0) + 1); }
    const entries = Array.from(map.entries()).map(([fullName, count]) => {
      const parts = fullName.trim().split(/\s+/);
      return { fullName, surname: parts[parts.length - 1], count };
    });
    entries.sort((a, b) => a.surname.localeCompare(b.surname, undefined, { sensitivity: "base" }));
    const groups = new Map<string, typeof entries>();
    for (const entry of entries) {
      const letter = entry.surname[0]?.toUpperCase() ?? "#";
      if (!groups.has(letter)) groups.set(letter, []);
      groups.get(letter)!.push(entry);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [artworks]);

  const totalArtists = grouped.reduce((n, [, e]) => n + e.length, 0);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-serif tracking-tight">Artists</h1>
        <p className="text-muted-foreground mt-1 font-light">{isLoading ? "Loading…" : `${totalArtists} artist${totalArtists !== 1 ? "s" : ""} represented`}</p>
      </header>
      {isLoading && <div className="space-y-8">{Array.from({length:4}).map((_,i)=><div key={i} className="space-y-3"><Skeleton className="h-4 w-6"/><Skeleton className="h-5 w-48"/></div>)}</div>}
      {!isLoading && grouped.length === 0 && <div className="py-24 text-center"><p className="text-muted-foreground text-sm">No artists in the collection yet.</p></div>}
      {!isLoading && grouped.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2 border-b border-border pb-6">
            {grouped.map(([letter]) => <a key={letter} href={`#letter-${letter}`} className="text-xs font-mono text-muted-foreground hover:text-foreground w-6 h-6 flex items-center justify-center border border-border/50 hover:border-foreground/30 transition-colors">{letter}</a>)}
          </div>
          <div className="space-y-12">
            {grouped.map(([letter, entries]) => (
              <section key={letter} id={`letter-${letter}`}>
                <p className="text-xs font-mono text-muted-foreground/50 uppercase tracking-widest mb-4 border-b border-border/40 pb-2">{letter}</p>
                <div className="space-y-0">
                  {entries.map(entry => (
                    <Link key={entry.fullName} href={`/artworks?artist=${encodeURIComponent(entry.fullName)}`} className="group flex items-baseline justify-between py-2.5 border-b border-border/20 hover:border-border/60 transition-colors">
                      <span className="font-serif text-base group-hover:text-primary transition-colors">
                        {entry.surname}{entry.fullName !== entry.surname && <span className="text-muted-foreground font-sans text-sm font-normal">{", "}{entry.fullName.slice(0, entry.fullName.lastIndexOf(entry.surname)).trim()}</span>}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">{entry.count} {entry.count === 1 ? "work" : "works"}</span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
