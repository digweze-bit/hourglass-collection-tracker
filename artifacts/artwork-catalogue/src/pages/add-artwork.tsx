import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import {
  useCreateArtwork,
  useListLocations,
  useListArtworks,
  useCreateLocation,
  getListArtworksQueryKey,
  getListLocationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus } from "lucide-react";
import { Link } from "wouter";
import { ImageUpload } from "@/components/image-upload";
import { KeywordInput } from "@/components/keyword-input";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  artist: z.string(),
  year: z.string(),
  medium: z.string(),
  keywords: z.string(),
  width: z.string(),
  height: z.string(),
  depth: z.string(),
  dimensionUnit: z.string(),
  imageUrl: z.string(),
  notes: z.string(),
  locationId: z.string(),
});

type FormValues = z.infer<typeof schema>;

type LocationItem = { id: number; name: string; children?: LocationItem[] };
function flattenLocations(
  locs: LocationItem[],
  depth = 0
): { id: number; name: string; indent: string }[] {
  if (!Array.isArray(locs)) return [];
  return locs.flatMap((loc) => [
    {
      id: loc.id,
      name: loc.name,
      indent: depth > 0 ? "\u00a0".repeat(depth * 3) + "↳ " : "",
    },
    ...flattenLocations(loc.children || [], depth + 1),
  ]);
}

// Combobox-style input with datalist suggestions
function AutocompleteInput({
  id,
  suggestions,
  placeholder,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  suggestions: string[];
  placeholder?: string;
}) {
  const listId = `${id}-suggestions`;
  return (
    <>
      <Input list={listId} placeholder={placeholder} {...props} />
      <datalist id={listId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </>
  );
}

export default function AddArtwork() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createArtwork = useCreateArtwork();
  const createLocation = useCreateLocation();
  const { data: locations } = useListLocations();
  const { data: allArtworks } = useListArtworks({});

  // New location dialog state
  const [showNewLocation, setShowNewLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationParentId, setNewLocationParentId] = useState<string>("");
  const [newLocationDesc, setNewLocationDesc] = useState("");
  const [creatingLocation, setCreatingLocation] = useState(false);

  // Derive unique artist and medium suggestions from existing artworks
  const artistSuggestions = useMemo(() => {
    if (!Array.isArray(allArtworks)) return [];
    const names = allArtworks
      .map((a) => a.artist)
      .filter((a): a is string => !!a);
    return [...new Set(names)].sort();
  }, [allArtworks]);

  const mediumSuggestions = useMemo(() => {
    if (!Array.isArray(allArtworks)) return [];
    const mediums = allArtworks
      .map((a) => a.medium)
      .filter((m): m is string => !!m);
    return [...new Set(mediums)].sort();
  }, [allArtworks]);

  const flatLocations = flattenLocations(
    Array.isArray(locations) ? locations : []
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      artist: "",
      year: "",
      medium: "",
      keywords: "",
      width: "",
      height: "",
      depth: "",
      dimensionUnit: "cm",
      imageUrl: "",
      notes: "",
      locationId: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    createArtwork.mutate(
      {
        data: {
          title: values.title,
          artist: values.artist || undefined,
          year: values.year ? Number(values.year) : undefined,
          medium: values.medium || undefined,
          keywords: values.keywords || undefined,
          width: values.width ? Number(values.width) : undefined,
          height: values.height ? Number(values.height) : undefined,
          depth: values.depth ? Number(values.depth) : undefined,
          dimensionUnit: values.dimensionUnit || "cm",
          imageUrl: values.imageUrl || undefined,
          notes: values.notes || undefined,
          locationId:
            values.locationId && values.locationId !== "none"
              ? Number(values.locationId)
              : undefined,
        },
      },
      {
        onSuccess: (artwork) => {
          queryClient.invalidateQueries({
            queryKey: getListArtworksQueryKey(),
          });
          toast({ title: "Artwork added to catalogue" });
          setLocation(`/artworks/${artwork.id}`);
        },
        onError: () => {
          toast({ title: "Failed to add artwork", variant: "destructive" });
        },
      }
    );
  };

  const handleCreateLocation = () => {
    if (!newLocationName.trim()) return;
    setCreatingLocation(true);
    createLocation.mutate(
      {
        data: {
          name: newLocationName.trim(),
          parentId: newLocationParentId
            ? Number(newLocationParentId)
            : undefined,
          description: newLocationDesc || undefined,
        },
      },
      {
        onSuccess: (loc) => {
          queryClient.invalidateQueries({
            queryKey: getListLocationsQueryKey(),
          });
          form.setValue("locationId", String(loc.id));
          setShowNewLocation(false);
          setNewLocationName("");
          setNewLocationParentId("");
          setNewLocationDesc("");
          setCreatingLocation(false);
          toast({ title: `Location "${loc.name}" created` });
        },
        onError: () => {
          setCreatingLocation(false);
          toast({ title: "Failed to create location", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="max-w-2xl space-y-10">
      <header>
        <Link
          href="/artworks"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to catalogue
        </Link>
        <h1 className="text-[26px] font-serif tracking-tight">New Artwork</h1>
        <p className="text-muted-foreground mt-1 font-light">
          Add a work to the permanent registry.
        </p>
      </header>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-10"
        >
          {/* Identity */}
          <section className="space-y-6">
            <h2 className="text-xs tracking-widest uppercase text-muted-foreground border-b border-border pb-2">
              Identity
            </h2>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Artwork title"
                      {...field}
                      data-testid="input-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="artist"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Artist</FormLabel>
                    <FormControl>
                      <AutocompleteInput
                        id="artist"
                        suggestions={artistSuggestions}
                        placeholder="Artist name"
                        data-testid="input-artist"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Year"
                        {...field}
                        data-testid="input-year"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="medium"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medium</FormLabel>
                  <FormControl>
                    <AutocompleteInput
                      id="medium"
                      suggestions={mediumSuggestions}
                      placeholder="e.g. Oil on canvas, Bronze, Photography"
                      data-testid="input-medium"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

          </section>

          {/* Dimensions */}
          <section className="space-y-6">
            <h2 className="text-xs tracking-widest uppercase text-muted-foreground border-b border-border pb-2">
              Dimensions
            </h2>
            <div className="grid grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="H"
                        {...field}
                        data-testid="input-height"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="width"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Width</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="W"
                        {...field}
                        data-testid="input-width"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="depth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Depth</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="D"
                        {...field}
                        data-testid="input-depth"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dimensionUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-dimension-unit">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cm">cm</SelectItem>
                        <SelectItem value="in">in</SelectItem>
                        <SelectItem value="mm">mm</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
          </section>

          {/* Image */}
          <section className="space-y-6">
            <h2 className="text-xs tracking-widest uppercase text-muted-foreground border-b border-border pb-2">
              Image
            </h2>
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ImageUpload
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </section>

          {/* Location */}
          <section className="space-y-6">
            <h2 className="text-xs tracking-widest uppercase text-muted-foreground border-b border-border pb-2">
              Location
            </h2>
            <FormField
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <div className="flex gap-2">
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger
                          data-testid="select-location"
                          className="flex-1"
                        >
                          <SelectValue placeholder="Select a location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No location</SelectItem>
                        {flatLocations.map((loc) => (
                          <SelectItem key={loc.id} value={String(loc.id)}>
                            {loc.indent}
                            {loc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowNewLocation(true)}
                      title="Add new location"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </FormItem>
              )}
            />
          </section>

          {/* Notes */}
          <section className="space-y-6">
            <h2 className="text-xs tracking-widest uppercase text-muted-foreground border-b border-border pb-2">
              Keywords
            </h2>
            <FormField
              control={form.control}
              name="keywords"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Keywords</FormLabel>
                  <FormControl>
                    <KeywordInput
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </section>

          <section className="space-y-6">
            <h2 className="text-xs tracking-widest uppercase text-muted-foreground border-b border-border pb-2">
              Notes
            </h2>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional notes about this work..."
                      rows={4}
                      {...field}
                      data-testid="textarea-notes"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </section>

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              type="submit"
              disabled={createArtwork.isPending}
              data-testid="button-submit"
            >
              {createArtwork.isPending ? "Adding..." : "Add to Catalogue"}
            </Button>
            <Link href="/artworks">
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </Form>

      {/* New Location Dialog */}
      <Dialog open={showNewLocation} onOpenChange={setShowNewLocation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="e.g. Main Gallery, Storage Room A"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateLocation()}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Parent location{" "}
                <span className="text-muted-foreground font-normal">
                  (optional — makes this a sub-location)
                </span>
              </label>
              <Select
                value={newLocationParentId}
                onValueChange={setNewLocationParentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Top-level location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Top-level location</SelectItem>
                  {flatLocations.map((loc) => (
                    <SelectItem key={loc.id} value={String(loc.id)}>
                      {loc.indent}
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Description{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </label>
              <Input
                placeholder="Brief description"
                value={newLocationDesc}
                onChange={(e) => setNewLocationDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowNewLocation(false)}
              disabled={creatingLocation}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateLocation}
              disabled={!newLocationName.trim() || creatingLocation}
            >
              {creatingLocation ? "Creating..." : "Create Location"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
