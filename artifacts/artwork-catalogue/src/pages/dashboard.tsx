import { useGetSummary } from "@/hooks/use-db";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: summary, isLoading, error } = useGetSummary();
  const fmt = (val: number | null) => val ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val) : "—";

  if (isLoading) return <div className="space-y-12"><h1 className="text-3xl font-serif">Overview</h1><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><Skeleton className="h-32"/><Skeleton className="h-32"/><Skeleton className="h-32"/></div></div>;
  if (error || !summary) return <div className="text-center py-20 text-muted-foreground">Failed to load collection summary.</div>;

  return (
    <div className="space-y-16">
      <header><h1 className="text-3xl font-serif tracking-tight">Collection Overview</h1><p className="text-muted-foreground mt-2 font-light">A summary of your permanent registry.</p></header>
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="border-t border-border pt-6"><p className="text-xs tracking-widest text-muted-foreground uppercase mb-2">Total Artworks</p><p className="text-4xl font-serif">{summary.totalArtworks}</p></div>
        <div className="border-t border-border pt-6"><p className="text-xs tracking-widest text-muted-foreground uppercase mb-2">Estimated Value (USD)</p><p className="text-4xl font-serif text-primary">{fmt(summary.totalCurrentValueUsd)}</p></div>
        <div className="border-t border-border pt-6"><p className="text-xs tracking-widest text-muted-foreground uppercase mb-2">Currently on Loan</p><p className="text-4xl font-serif">{summary.onLoanCount}</p></div>
      </section>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
        <section><h2 className="text-xl font-serif mb-6 border-b border-border pb-2">By Medium</h2><div className="space-y-4">{summary.byMedium.map(m=><div key={m.medium} className="flex justify-between text-sm"><span>{m.medium||"Unspecified"}</span><span className="text-muted-foreground tabular-nums">{m.count}</span></div>)}</div></section>
        <section><h2 className="text-xl font-serif mb-6 border-b border-border pb-2">By Location</h2><div className="space-y-4">{summary.byLocation.map(l=><div key={l.locationId} className="flex justify-between text-sm"><span>{l.locationName||"Unspecified"}</span><span className="text-muted-foreground tabular-nums">{l.count}</span></div>)}</div></section>
      </div>
      <section>
        <div className="flex justify-between items-end mb-6 border-b border-border pb-2"><h2 className="text-xl font-serif">Recently Acquired</h2><Link href="/artworks" className="text-sm text-primary hover:underline">View all</Link></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {summary.recentlyAdded.map(artwork=>(
            <Link key={artwork.id} href={`/artworks/${artwork.id}`} className="group cursor-pointer">
              <div className="aspect-square bg-muted/30 mb-4 overflow-hidden">{artwork.image_url?<img src={artwork.image_url} alt={artwork.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700"/>:<div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs uppercase tracking-widest">No Image</div>}</div>
              <p className="font-serif text-lg leading-tight group-hover:text-primary transition-colors">{artwork.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{artwork.artist||"Unknown Artist"}{artwork.year?`, ${artwork.year}`:""}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
