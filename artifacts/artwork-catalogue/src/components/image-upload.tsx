import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Camera, X, ImageIcon, Loader2 } from "lucide-react";
import { ImageCropDialog } from "@/components/image-crop-dialog";

interface ImageUploadProps {
  value: string;
  onChange: (dataUrl: string) => void;
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    });
  }

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("Image must be under 20 MB.");
      return;
    }
    setError(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setCropSrc(dataUrl);
    } catch {
      setError("Could not read the image. Please try another file.");
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleFile(e.target.files?.[0]);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0]);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleCropConfirm(dataUrl: string) {
    setCropSrc(null);
    onChange(dataUrl);
  }

  function handleCropCancel() {
    setCropSrc(null);
  }

  return (
    <>
      <ImageCropDialog
        src={cropSrc}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
      />

      {value ? (
        <div className="relative group">
          <div className="aspect-[4/3] bg-muted/20 overflow-hidden">
            <img
              src={value}
              alt="Artwork preview"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-7 w-7 rounded-full bg-background/80 border border-border flex items-center justify-center hover:bg-muted transition-colors"
              aria-label="Replace image"
              title="Replace image"
            >
              <Upload className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="h-7 w-7 rounded-full bg-background/80 border border-border flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors"
              aria-label="Remove image"
              title="Remove image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Hover over image to replace or remove.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="border border-dashed border-border/60 hover:border-border hover:bg-muted/10 transition-colors cursor-pointer aspect-[4/3] flex flex-col items-center justify-center gap-3 text-muted-foreground"
          >
            <ImageIcon className="h-8 w-8 opacity-30" />
            <p className="text-xs tracking-wide">Drag an image here or click to browse</p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Upload from device
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="h-4 w-4" />
              Take photo
            </Button>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleInputChange}
        aria-label="Upload image from device"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleInputChange}
        aria-label="Take photo with camera"
      />
    </>
  );
}
