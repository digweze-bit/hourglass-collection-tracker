import { useState, useRef } from "react";
import { resizeAndUpload } from "@/lib/image-upload";
import { Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const url = await resizeAndUpload(file, 1200, 0.82);
      onChange(url);
    } catch (err: any) {
      setError(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function handleUrlSubmit() {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setUrlInput("");
    }
  }

  return (
    <div className="space-y-3">
      {/* Preview */}
      {value && (
        <div className="relative w-full max-w-xs">
          <img
            src={value}
            alt="Artwork preview"
            className="w-full aspect-square object-cover border border-border"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7 bg-background/80 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onChange("")}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Upload area */}
      <div
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onDragOver={e => e.preventDefault()}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed border-border hover:border-primary/50 transition-colors p-8 text-center cursor-pointer ${uploading ? "pointer-events-none opacity-60" : ""}`}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Resizing and uploading…
          </div>
        ) : (
          <div className="space-y-1">
            <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{value ? "Click to replace image" : "Drop image here or click to browse"}</p>
            <p className="text-[10px] text-muted-foreground/60">JPEG, PNG, WebP · Auto-resized to max 1200px</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
        />
      </div>

      {/* URL paste fallback */}
      <div className="flex gap-2">
        <Input
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          placeholder="Or paste an image URL…"
          className="text-sm"
          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleUrlSubmit())}
        />
        {urlInput && (
          <Button type="button" variant="outline" size="sm" onClick={handleUrlSubmit}>Use URL</Button>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
