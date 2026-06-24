import { useState } from "react";
import { useListLocations, useCreateLocation, useUpdateLocation, useDeleteLocation, useGetLocationArtworks } from "@/hooks/use-db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Plus, ChevronRight, ChevronDown, MapPin, Edit2, Trash2, FolderOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Location } from "@/hooks/use-db";

function flattenTree(locs: Location[], depth = 0): { id: string; name: string; indent: string }[] {
  return locs.flatMap(l => [{ id: l.id, name: l.name, indent: depth > 0 ? "\u00a0".repeat(depth*3)+"↳ " : "" }, ...flattenTree(l.children||[], depth+1)]);
}

function findLocation(locs: Location[], id: string | null): Location | null {
  if (!id) return null;
  for (const l of locs) { if (l.id === id) return l; const f = findLocation(l.children||[], id); if (f) return f; }
  return null;
}

function LocationNode({ loc, depth=0, onSelect, selectedId }: { loc: Location; depth?: number; onSelect: (id: string) => void; selectedId: string | null }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = (loc.children||[]).length > 0;
  return (
    <div>
      <div className={`flex items-center gap-2 py-2 px-3 cursor-pointer group transition-colors ${selectedId === loc.id ? "bg-accent text-foreground" : "hover:bg-accent/50"}`} style={{ paddingLeft: `${12 + depth * 20}px` }} onClick={() => onSelect(loc.id)}>
        <button className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-muted-foreground" onClick={e => { e.stopPropagation(); setExpanded(!expanded); }}>
          {hasChildren ? (expanded ? <ChevronDown className="h-3 w-3"/> : <ChevronRight className="h-3 w-3"/>) : <span className="w-3"/>}
        </button>
        <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0"/>
        <span className="text-sm flex-1 truncate">{loc.name}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{loc.artwork_count ?? 0}</span>
      </div>
      {expanded && hasChildren && loc.children!.map(child => <LocationNode key={child.id} loc={child} depth={depth+1} onSelect={onSelect} selectedId={selectedId}/>)}
    </div>
  );
}

function LocationArtworks({ locationId }: { locationId: string }) {
  const { data: artworks, isLoading } = useGetLocationArtworks(locationId);
  if (isLoading) return <div className="grid grid-cols-3 gap-4">{Array.from({length:6}).map((_,i)=><Skeleton key={i} className="aspect-square"/>)}</div>;
  if (!artworks?.length) return <div className="text-center py-12 text-muted-foreground"><FolderOpen className="h-8 w-8 mx-auto mb-3 opacity-30"/><p className="text-sm">No artworks at this location</p></div>;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {artworks.map(a => (
        <Link key={a.id} href={`/artworks/${a.id}`} className="group">
          <div className="aspect-square bg-muted/30 overflow-hidden mb-2">{a.image_url?<img src={a.image_url} alt={a.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"/>:<div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground/50 uppercase tracking-widest">No Image</div>}</div>
          <p className="text-xs font-serif leading-tight group-hover:text-primary transition-colors line-clamp-2">{a.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{a.artist||"Unknown Artist"}</p>
        </Link>
      ))}
    </div>
  );
}

export default function Locations() {
  const { toast } = useToast();
  const { data: locations, isLoading } = useListLocations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newParentId, setNewParentId] = useState("root");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const deleteLocation = useDeleteLocation();

  const flat = flattenTree(locations || []);
  const selected = findLocation(locations || [], selectedId);

  const handleAdd = () => {
    if (!newName.trim()) return;
    createLocation.mutate({ name: newName, parent_id: newParentId !== "root" ? newParentId : undefined, description: newDescription || undefined }, {
      onSuccess: () => { toast({ title: "Location added" }); setShowAddDialog(false); setNewName(""); setNewDescription(""); setNewParentId("root"); },
    });
  };

  const handleDelete = (id: string) => {
    deleteLocation.mutate(id, { onSuccess: () => { if (selectedId === id) setSelectedId(null); toast({ title: "Location removed" }); } });
  };

  const handleEditSave = () => {
    if (!editingId || !editName.trim()) return;
    updateLocation.mutate({ id: editingId, data: { name: editName } }, { onSuccess: () => { setEditingId(null); toast({ title: "Location updated" }); } });
  };

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div><h1 className="text-3xl font-serif tracking-tight">Locations</h1><p className="text-muted-foreground mt-1 font-light">Storage locations and their contents.</p></div>
        <Button size="sm" className="gap-2" onClick={() => setShowAddDialog(true)}><Plus className="h-4 w-4"/>Add Location</Button>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[400px]">
        <div className="border border-border">
          <div className="px-4 py-3 border-b border-border"><p className="text-xs tracking-widest uppercase text-muted-foreground">All Locations</p></div>
          {isLoading && <div className="p-4 space-y-2">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-8 w-full"/>)}</div>}
          {!isLoading && (!locations||locations.length===0) && <div className="p-6 text-center text-sm text-muted-foreground">No locations yet.</div>}
          {!isLoading && locations?.map(loc=><LocationNode key={loc.id} loc={loc} onSelect={setSelectedId} selectedId={selectedId}/>)}
        </div>
        <div className="lg:col-span-2">
          {selected ? (
            <div className="space-y-6">
              <div className="flex items-start justify-between border-b border-border pb-4">
                <div>
                  {editingId === selected.id ? (
                    <div className="flex items-center gap-2">
                      <Input value={editName} onChange={e=>setEditName(e.target.value)} className="text-xl font-serif h-auto py-1" onKeyDown={e=>e.key==="Enter"&&handleEditSave()}/>
                      <Button size="sm" onClick={handleEditSave}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={()=>setEditingId(null)}>Cancel</Button>
                    </div>
                  ) : <h2 className="text-2xl font-serif">{selected.name}</h2>}
                  {selected.description && <p className="text-sm text-muted-foreground mt-1">{selected.description}</p>}
                  <Badge variant="outline" className="mt-2 text-[10px] uppercase tracking-widest">{selected.artwork_count ?? 0} work{(selected.artwork_count ?? 0) !== 1 ? "s" : ""}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={()=>{setEditingId(selected.id);setEditName(selected.name);}}><Edit2 className="h-4 w-4"/></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={()=>handleDelete(selected.id)}><Trash2 className="h-4 w-4"/></Button>
                </div>
              </div>
              <LocationArtworks locationId={selected.id}/>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2"><MapPin className="h-8 w-8 mx-auto opacity-20"/><p className="text-sm">Select a location to view its artworks</p></div>
            </div>
          )}
        </div>
      </div>
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-serif">Add Location</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><label className="text-sm text-muted-foreground mb-1.5 block">Name</label><Input placeholder="e.g. London, Ground Floor" value={newName} onChange={e=>setNewName(e.target.value)}/></div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Parent Location (optional)</label>
              <Select value={newParentId} onValueChange={setNewParentId}>
                <SelectTrigger><SelectValue placeholder="Top-level location"/></SelectTrigger>
                <SelectContent><SelectItem value="root">Top-level location</SelectItem>{flat.map(l=><SelectItem key={l.id} value={l.id}>{l.indent}{l.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-sm text-muted-foreground mb-1.5 block">Description (optional)</label><Textarea placeholder="Notes about this location..." value={newDescription} onChange={e=>setNewDescription(e.target.value)} rows={2}/></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={()=>setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createLocation.isPending}>{createLocation.isPending ? "Adding..." : "Add Location"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
