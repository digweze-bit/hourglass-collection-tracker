import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useCreateArtwork, useListArtworks, useListLocations, useCreateLocation } from "@/hooks/use-db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus } from "lucide-react";
import { Link } from "wouter";
import { ImageUpload } from "@/components/image-upload";
import { KeywordInput } from "@/components/keyword-input";
import type { Location } from "@/hooks/use-db";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  artist: z.string(), year: z.string(), medium: z.string(),
  width: z.string(), height: z.string(), depth: z.string(),
  dimensionUnit: z.string(), imageUrl: z.string(), notes: z.string(),
  locationId: z.string(), keywords: z.string(),
  editionNumber: z.string(), editionTotal: z.string(),
});
type FormValues = z.infer<typeof schema>;

function flattenLocations(locs: Location[], depth = 0): { id: string; name: string; indent: string }[] {
  if (!Array.isArray(locs)) return [];
  return locs.flatMap(loc => [{ id: loc.id, name: loc.name, indent: depth > 0 ? "\u00a0".repeat(depth*3)+"↳ " : "" }, ...flattenLocations(loc.children||[], depth+1)]);
}

function AutocompleteInput({ id, suggestions, placeholder, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { id: string; suggestions: string[]; placeholder?: string }) {
  return (<><Input list={`${id}-suggestions`} placeholder={placeholder} {...props}/><datalist id={`${id}-suggestions`}>{suggestions.map(s=><option key={s} value={s}/>)}</datalist></>);
}

export default function AddArtwork() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createArtwork = useCreateArtwork();
  const createLocation = useCreateLocation();
  const { data: locations } = useListLocations();
  const { data: allArtworks } = useListArtworks();
  const [showNewLocation, setShowNewLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationParentId, setNewLocationParentId] = useState("root");
  const [newLocationDesc, setNewLocationDesc] = useState("");
  const [creatingLocation, setCreatingLocation] = useState(false);

  const artistSuggestions = useMemo(() => [...new Set((allArtworks||[]).map(a=>a.artist).filter((a):a is string=>!!a))].sort(), [allArtworks]);
  const mediumSuggestions = useMemo(() => [...new Set((allArtworks||[]).map(a=>a.medium).filter((m):m is string=>!!m))].sort(), [allArtworks]);
  const flatLocations = flattenLocations(Array.isArray(locations) ? locations : []);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title:"", artist:"", year:"", medium:"", width:"", height:"", depth:"", dimensionUnit:"cm", imageUrl:"", notes:"", locationId:"", keywords:"", editionNumber:"", editionTotal:"" },
  });

  const onSubmit = (values: FormValues) => {
    createArtwork.mutate({
      title: values.title, artist: values.artist||undefined, year: values.year?Number(values.year):undefined,
      medium: values.medium||undefined, keywords: values.keywords||undefined,
      width: values.width?Number(values.width):undefined, height: values.height?Number(values.height):undefined,
      depth: values.depth?Number(values.depth):undefined, dimension_unit: values.dimensionUnit||"cm",
      image_url: values.imageUrl||undefined, notes: values.notes||undefined,
      location_id: values.locationId && values.locationId !== "none" ? values.locationId : undefined,
      edition_number: values.editionNumber ? Number(values.editionNumber) : undefined,
      edition_total: values.editionTotal ? Number(values.editionTotal) : undefined,
    } as any, {
      onSuccess: (artwork) => { toast({ title: "Artwork added to catalogue" }); setLocation(`/artworks/${artwork.id}`); },
      onError: () => toast({ title: "Failed to add artwork", variant: "destructive" }),
    });
  };

  const handleCreateLocation = () => {
    if (!newLocationName.trim()) return;
    setCreatingLocation(true);
    createLocation.mutate({ name: newLocationName.trim(), parent_id: newLocationParentId && newLocationParentId !== "root" ? newLocationParentId : undefined, description: newLocationDesc||undefined }, {
      onSuccess: (loc) => {
        form.setValue("locationId", loc.id);
        setShowNewLocation(false); setNewLocationName(""); setNewLocationParentId(""); setNewLocationDesc(""); setCreatingLocation(false);
        toast({ title: `Location "${loc.name}" created` });
      },
      onError: () => { setCreatingLocation(false); toast({ title: "Failed to create location", variant: "destructive" }); },
    });
  };

  return (
    <div className="max-w-2xl space-y-10">
      <header>
        <Link href="/artworks" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"><ArrowLeft className="h-4 w-4"/>Back to catalogue</Link>
        <h1 className="text-[26px] font-serif tracking-tight">New Artwork</h1>
        <p className="text-muted-foreground mt-1 font-light">Add a work to the permanent registry.</p>
      </header>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
          <section className="space-y-6">
            <h2 className="text-xs tracking-widest uppercase text-muted-foreground border-b border-border pb-2">Identity</h2>
            <FormField control={form.control} name="title" render={({field})=>(<FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Artwork title" {...field}/></FormControl><FormMessage/></FormItem>)}/>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="artist" render={({field})=>(<FormItem><FormLabel>Artist</FormLabel><FormControl><AutocompleteInput id="artist" suggestions={artistSuggestions} placeholder="Artist name" {...field}/></FormControl></FormItem>)}/>
              <FormField control={form.control} name="year" render={({field})=>(<FormItem><FormLabel>Year</FormLabel><FormControl><Input type="number" placeholder="Year" {...field}/></FormControl></FormItem>)}/>
            </div>
            <FormField control={form.control} name="medium" render={({field})=>(<FormItem><FormLabel>Medium</FormLabel><FormControl><AutocompleteInput id="medium" suggestions={mediumSuggestions} placeholder="e.g. Oil on canvas" {...field}/></FormControl></FormItem>)}/>
          </section>
          <section className="space-y-6">
            <h2 className="text-xs tracking-widest uppercase text-muted-foreground border-b border-border pb-2">Dimensions</h2>
            <div className="grid grid-cols-4 gap-4">
              {(["height","width","depth"] as const).map(dim=>(<FormField key={dim} control={form.control} name={dim} render={({field})=>(<FormItem><FormLabel>{dim.charAt(0).toUpperCase()}</FormLabel><FormControl><Input type="number" step="0.1" placeholder={dim.charAt(0).toUpperCase()} {...field}/></FormControl></FormItem>)}/>))}
              <FormField control={form.control} name="dimensionUnit" render={({field})=>(<FormItem><FormLabel>Unit</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="cm">cm</SelectItem><SelectItem value="in">in</SelectItem><SelectItem value="mm">mm</SelectItem></SelectContent></Select></FormItem>)}/>
            </div>
          </section>
          <section className="space-y-6">
            <h2 className="text-xs tracking-widest uppercase text-muted-foreground border-b border-border pb-2">Edition</h2>
            <p className="text-xs text-muted-foreground">For prints, photographs, or any work produced in a limited edition.</p>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="editionNumber" render={({field})=>(<FormItem><FormLabel>Edition Number</FormLabel><FormControl><Input type="number" placeholder="e.g. 3" {...field}/></FormControl></FormItem>)}/>
              <FormField control={form.control} name="editionTotal" render={({field})=>(<FormItem><FormLabel>Edition Total</FormLabel><FormControl><Input type="number" placeholder="e.g. 10" {...field}/></FormControl></FormItem>)}/>
            </div>
          </section>
            <FormField control={form.control} name="imageUrl" render={({field})=>(<FormItem><FormControl><ImageUpload value={field.value??""} onChange={field.onChange}/></FormControl></FormItem>)}/>
          </section>
          <section className="space-y-6">
            <h2 className="text-xs tracking-widest uppercase text-muted-foreground border-b border-border pb-2">Location</h2>
            <FormField control={form.control} name="locationId" render={({field})=>(<FormItem><FormLabel>Location</FormLabel>
              <div className="flex gap-2">
                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="flex-1"><SelectValue placeholder="Select a location"/></SelectTrigger></FormControl><SelectContent><SelectItem value="none">No location</SelectItem>{flatLocations.map(loc=><SelectItem key={loc.id} value={loc.id}>{loc.indent}{loc.name}</SelectItem>)}</SelectContent></Select>
                <Button type="button" variant="outline" size="icon" onClick={()=>setShowNewLocation(true)} title="Add new location"><Plus className="h-4 w-4"/></Button>
              </div>
            </FormItem>)}/>
          </section>
          <section className="space-y-6">
            <h2 className="text-xs tracking-widest uppercase text-muted-foreground border-b border-border pb-2">Keywords</h2>
            <FormField control={form.control} name="keywords" render={({field})=>(<FormItem><FormLabel>Keywords</FormLabel><FormControl><KeywordInput value={field.value??""} onChange={field.onChange}/></FormControl></FormItem>)}/>
          </section>
          <section className="space-y-6">
            <h2 className="text-xs tracking-widest uppercase text-muted-foreground border-b border-border pb-2">Notes</h2>
            <FormField control={form.control} name="notes" render={({field})=>(<FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Any additional notes..." rows={4} {...field}/></FormControl></FormItem>)}/>
          </section>
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button type="submit" disabled={createArtwork.isPending}>{createArtwork.isPending ? "Adding..." : "Add to Catalogue"}</Button>
            <Link href="/artworks"><Button type="button" variant="ghost">Cancel</Button></Link>
          </div>
        </form>
      </Form>
      <Dialog open={showNewLocation} onOpenChange={setShowNewLocation}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Location</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><label className="text-sm font-medium">Name</label><Input placeholder="e.g. Main Gallery" value={newLocationName} onChange={e=>setNewLocationName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleCreateLocation()} autoFocus/></div>
            <div className="space-y-2"><label className="text-sm font-medium">Parent location <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Select value={newLocationParentId} onValueChange={setNewLocationParentId}><SelectTrigger><SelectValue placeholder="Top-level location"/></SelectTrigger><SelectContent><SelectItem value="root">Top-level location</SelectItem>{flatLocations.map(loc=><SelectItem key={loc.id} value={loc.id}>{loc.indent}{loc.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><label className="text-sm font-medium">Description <span className="text-muted-foreground font-normal">(optional)</span></label><Input placeholder="Brief description" value={newLocationDesc} onChange={e=>setNewLocationDesc(e.target.value)}/></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={()=>setShowNewLocation(false)} disabled={creatingLocation}>Cancel</Button>
            <Button onClick={handleCreateLocation} disabled={!newLocationName.trim()||creatingLocation}>{creatingLocation ? "Creating..." : "Create Location"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
